const {
  EPAYCO_PLANS,
  amountsMatch,
  constantTimeEqual,
  epaycoValidationMatches,
  hashIdentifier,
  hotmartPurchaseMatches,
  isEpaycoApproved,
  makeEpaycoSignature,
  normalizedCurrency,
  parseHotmartPlanConfig,
} = require('./paymentSecurity');

function createPaymentHandlers({ functions, admin, db, defineString, defineSecret }) {
  const epaycoCustomerId = defineString('EPAYCO_CUSTOMER_ID');
  const epaycoPKey = defineSecret('EPAYCO_P_KEY');
  const hotmartHottok = defineSecret('HOTMART_HOTTOK');
  const hotmartPlanConfig = defineString('HOTMART_PLAN_CONFIG', { default: '' });

  function setCors(res, methods, headers = 'Content-Type, Authorization') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', methods);
    res.set('Access-Control-Allow-Headers', headers);
  }

  async function verifyFirebaseUser(req) {
    const authorization = String(req.headers.authorization || '');
    const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
    if (!match) return null;
    try {
      return await admin.auth().verifyIdToken(match[1]);
    } catch {
      return null;
    }
  }

  function getHotmartPlans() {
    return parseHotmartPlanConfig(hotmartPlanConfig.value());
  }

  const createEpaycoOrder = functions.runWith({ secrets: [epaycoPKey] }).https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
      const decodedToken = await verifyFirebaseUser(req);
      if (!decodedToken) return res.status(401).json({ error: 'No autorizado' });
      if (!epaycoCustomerId.value() || !epaycoPKey.value()) {
        return res.status(503).json({ error: 'ePayco no está configurado para recibir pagos' });
      }

      const planId = String(req.body?.planId || '');
      const plan = EPAYCO_PLANS[planId];
      if (!plan) return res.status(400).json({ error: 'Plan no válido' });

      const userRef = db.collection('users').doc(decodedToken.uid);
      const userSnapshot = await userRef.get();
      if (!userSnapshot.exists) return res.status(404).json({ error: 'Usuario no encontrado' });

      const orderRef = db.collection('epayco_orders').doc();
      await orderRef.create({
        schemaVersion: 1,
        userId: decodedToken.uid,
        planId,
        months: plan.months,
        amount: plan.amount,
        currency: plan.currency,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(201).json({
        orderId: orderRef.id,
        planId,
        amount: plan.amount,
        currency: plan.currency,
        label: plan.label,
      });
    } catch (error) {
      console.error('[createEpaycoOrder] Error:', error);
      return res.status(500).json({ error: 'No se pudo crear la orden de pago' });
    }
  });

  const epaycoWebhook = functions.runWith({ secrets: [epaycoPKey] }).https.onRequest(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
      const customerId = epaycoCustomerId.value();
      const pKey = epaycoPKey.value();
      if (!customerId || !pKey) {
        console.error('[ePayco] Configuración de firma incompleta');
        return res.status(503).send('Payment verification unavailable');
      }

      const data = req.body || {};
      const requiredFields = [
        'x_ref_payco', 'x_transaction_id', 'x_amount',
        'x_currency_code', 'x_signature', 'x_extra1',
      ];
      if (requiredFields.some((field) => data[field] === undefined || data[field] === null || String(data[field]).trim() === '')) {
        return res.status(400).send('Missing transaction fields');
      }

      const computedSignature = makeEpaycoSignature(customerId, pKey, data);
      if (!constantTimeEqual(computedSignature, String(data.x_signature).toLowerCase())) {
        console.warn('[ePayco] Firma inválida');
        return res.status(401).send('Invalid signature');
      }

      const reference = encodeURIComponent(String(data.x_ref_payco));
      const validationResponse = await fetch(`https://secure.epayco.co/validation/v1/reference/${reference}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!validationResponse.ok) {
        console.error('[ePayco] No se pudo consultar la transacción en el proveedor');
        return res.status(503).send('Provider verification unavailable');
      }

      const validationResult = await validationResponse.json().catch(() => null);
      if (!validationResult?.success || !validationResult?.data) {
        console.warn('[ePayco] Referencia no validada por el proveedor');
        return res.status(400).send('Provider transaction not found');
      }

      const providerData = validationResult.data;
      const orderId = String(providerData.x_extra1 ?? providerData.extra1 ?? '');
      if (!/^[A-Za-z0-9]{20}$/.test(orderId)) return res.status(400).send('Invalid order reference');

      const orderRef = db.collection('epayco_orders').doc(orderId);
      const orderSnapshot = await orderRef.get();
      if (!orderSnapshot.exists) return res.status(400).send('Unknown order');

      const order = { id: orderSnapshot.id, ...orderSnapshot.data() };
      const approvedPlan = EPAYCO_PLANS[order.planId];
      if (
        order.schemaVersion !== 1 ||
        order.status !== 'pending' ||
        !approvedPlan ||
        order.months !== approvedPlan.months ||
        !amountsMatch(order.amount, approvedPlan.amount) ||
        normalizedCurrency(order.currency) !== approvedPlan.currency ||
        !epaycoValidationMatches(order, data, providerData)
      ) {
        console.warn('[ePayco] Orden no coincide con la transacción validada');
        return res.status(400).send('Order does not match provider transaction');
      }

      if (!isEpaycoApproved(providerData)) {
        // Los estados rechazados o pendientes no activan Pro. Se confirma la recepción
        // para que el proveedor no reintente una notificación que no debe conceder acceso.
        return res.status(200).send('Transaction not approved');
      }

      const transactionId = String(data.x_transaction_id);
      const transactionRef = db.collection('epayco_transactions').doc(hashIdentifier(transactionId));
      const userRef = db.collection('users').doc(order.userId);
      const applied = await db.runTransaction(async (transaction) => {
        const [existingTransaction, currentOrder, userSnapshot] = await Promise.all([
          transaction.get(transactionRef),
          transaction.get(orderRef),
          transaction.get(userRef),
        ]);

        if (existingTransaction.exists) return 'duplicate';
        if (!currentOrder.exists || currentOrder.data().status !== 'pending') return 'order-used';
        if (!userSnapshot.exists) throw new Error('Payment order user no longer exists');

        const now = new Date();
        const currentExpiry = new Date(userSnapshot.data().proExpiresAt || 0);
        const expiry = Number.isFinite(currentExpiry.getTime()) && currentExpiry > now ? currentExpiry : now;
        expiry.setMonth(expiry.getMonth() + approvedPlan.months);

        transaction.update(userRef, {
          isPro: true,
          isActive: true,
          isTrialActive: false,
          trialEndDate: null,
          proExpiresAt: expiry.toISOString(),
          lastPaymentDate: now.toISOString(),
          lastPaymentAmount: approvedPlan.amount,
          lastPaymentMonths: approvedPlan.months,
          lastPaymentMethod: 'epayco',
        });
        transaction.update(orderRef, {
          status: 'paid',
          transactionId,
          refPayco: String(data.x_ref_payco),
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.create(transactionRef, {
          userId: order.userId,
          orderId,
          planId: order.planId,
          months: approvedPlan.months,
          amount: approvedPlan.amount,
          currency: approvedPlan.currency,
          transactionId,
          refPayco: String(data.x_ref_payco),
          status: 'success',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return 'applied';
      });

      if (applied === 'duplicate' || applied === 'order-used') {
        return res.status(200).send('Already processed');
      }
      return res.status(200).send('OK');
    } catch (error) {
      console.error('[ePayco] Error procesando confirmación:', error);
      return res.status(500).send('Unable to process payment confirmation');
    }
  });

  const hotmartWebhook = functions.runWith({ secrets: [hotmartHottok] }).https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS', 'Content-Type, X-HOTMART-HOTTOK');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
      const expectedHottok = hotmartHottok.value();
      if (!expectedHottok) {
        console.error('[Hotmart] HOTTOK no configurado; se rechaza el webhook');
        return res.status(503).send('Webhook authentication unavailable');
      }

      const receivedHottok = String(req.headers['x-hotmart-hottok'] || '');
      if (!constantTimeEqual(receivedHottok, expectedHottok)) {
        console.warn('[Hotmart] Hottok inválido');
        return res.status(401).send('Invalid Hottok');
      }

      const plans = getHotmartPlans();
      if (Object.keys(plans).length === 0) {
        console.error('[Hotmart] No hay planes de producto/oferta autorizados; se rechaza el webhook');
        return res.status(503).send('Hotmart plan configuration unavailable');
      }

      const payload = req.body || {};
      if (payload.event !== 'PURCHASE_APPROVED') {
        return res.status(200).send('Event ignored');
      }

      const eventData = payload.data;
      const purchase = eventData?.purchase;
      const product = eventData?.product;
      if (!purchase || !product || String(purchase.status || '').toUpperCase() !== 'APPROVED') {
        return res.status(200).send('Purchase not approved');
      }

      const transactionId = String(purchase.transaction || '');
      const sessionId = String(purchase.origin?.xcod || '');
      if (!transactionId || !/^[A-Za-z0-9]{20}$/.test(sessionId)) {
        console.warn('[Hotmart] Evento aprobado sin referencia de orden válida');
        return res.status(200).send('Order reference missing');
      }

      const sessionRef = db.collection('hotmart_sessions').doc(sessionId);
      const sessionSnapshot = await sessionRef.get();
      if (!sessionSnapshot.exists) {
        console.warn('[Hotmart] No existe una sesión autorizada para esta compra');
        return res.status(200).send('Unknown order');
      }

      const session = sessionSnapshot.data();
      const plan = plans[session.planId];
      const expiresAt = session.expiresAt?.toDate?.();
      if (
        session.schemaVersion !== 2 ||
        session.status !== 'pending' ||
        !plan ||
        !session.userId ||
        session.months !== plan.months ||
        !amountsMatch(session.amount, plan.amount) ||
        normalizedCurrency(session.currency) !== plan.currency ||
        String(session.productId) !== plan.productId ||
        String(session.offerCode) !== plan.offerCode ||
        !expiresAt || expiresAt.getTime() <= Date.now() ||
        !hotmartPurchaseMatches(plan, product, purchase)
      ) {
        console.warn('[Hotmart] Compra no coincide con una sesión y oferta autorizadas');
        return res.status(200).send('Purchase does not match an authorized order');
      }

      const transactionRef = db.collection('hotmart_transactions').doc(hashIdentifier(transactionId));
      const userRef = db.collection('users').doc(session.userId);
      const applied = await db.runTransaction(async (transaction) => {
        const [existingTransaction, currentSession, userSnapshot] = await Promise.all([
          transaction.get(transactionRef),
          transaction.get(sessionRef),
          transaction.get(userRef),
        ]);

        if (existingTransaction.exists) return 'duplicate';
        if (!currentSession.exists || currentSession.data().status !== 'pending') return 'order-used';
        if (!userSnapshot.exists) throw new Error('Payment order user no longer exists');

        const now = new Date();
        const currentExpiry = new Date(userSnapshot.data().proExpiresAt || 0);
        const expiry = Number.isFinite(currentExpiry.getTime()) && currentExpiry > now ? currentExpiry : now;
        expiry.setMonth(expiry.getMonth() + plan.months);

        transaction.update(userRef, {
          isPro: true,
          isActive: true,
          isTrialActive: false,
          trialEndDate: null,
          proExpiresAt: expiry.toISOString(),
          lastPaymentDate: now.toISOString(),
          lastPaymentAmount: plan.amount,
          lastPaymentMonths: plan.months,
          lastPaymentMethod: 'hotmart',
        });
        transaction.update(sessionRef, {
          status: 'paid',
          transactionId,
          eventId: String(payload.id || ''),
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.create(transactionRef, {
          userId: session.userId,
          sessionId,
          planId: session.planId,
          months: plan.months,
          amount: plan.amount,
          currency: plan.currency,
          productId: plan.productId,
          offerCode: plan.offerCode,
          transactionId,
          eventId: String(payload.id || ''),
          status: 'approved',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return 'applied';
      });

      if (applied === 'duplicate' || applied === 'order-used') {
        return res.status(200).send('Already processed');
      }
      return res.status(200).send('OK');
    } catch (error) {
      console.error('[Hotmart] Error procesando webhook:', error);
      return res.status(500).send('Unable to process Hotmart notification');
    }
  });

  const createHotmartSession = functions.runWith({ secrets: [hotmartHottok] }).https.onRequest(async (req, res) => {
    setCors(res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
      const decodedToken = await verifyFirebaseUser(req);
      if (!decodedToken) return res.status(401).json({ error: 'No autorizado' });
      if (!hotmartHottok.value()) {
        return res.status(503).json({ error: 'Hotmart no está configurado para recibir pagos' });
      }

      const plans = getHotmartPlans();
      if (Object.keys(plans).length === 0) {
        return res.status(503).json({ error: 'Los planes de Hotmart todavía no están configurados' });
      }

      const planId = String(req.body?.planId || '');
      const plan = plans[planId];
      if (!plan) return res.status(400).json({ error: 'Plan de Hotmart no válido' });

      const userRef = db.collection('users').doc(decodedToken.uid);
      const userSnapshot = await userRef.get();
      if (!userSnapshot.exists) return res.status(404).json({ error: 'Usuario no encontrado' });

      const sessionRef = db.collection('hotmart_sessions').doc();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await sessionRef.create({
        schemaVersion: 2,
        userId: decodedToken.uid,
        planId,
        months: plan.months,
        amount: plan.amount,
        currency: plan.currency,
        productId: plan.productId,
        offerCode: plan.offerCode,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      });

      const checkoutUrl = new URL(plan.checkoutUrl);
      checkoutUrl.searchParams.set('xcod', sessionRef.id);
      return res.status(201).json({
        url: checkoutUrl.toString(),
        sessionId: sessionRef.id,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('[createHotmartSession] Error:', error);
      return res.status(500).json({ error: 'No se pudo crear la sesión de pago' });
    }
  });

  return { createEpaycoOrder, epaycoWebhook, hotmartWebhook, createHotmartSession };
}

module.exports = { createPaymentHandlers };
