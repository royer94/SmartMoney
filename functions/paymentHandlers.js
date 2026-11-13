const {
  EPAYCO_PLANS,
  amountsMatch,
  constantTimeEqual,
  exactAmountsMatch,
  epaycoValidationMatches,
  hashIdentifier,
  hotmartPurchaseMatches,
  isEpaycoTestTransaction,
  isEpaycoApproved,
  makeEpaycoSignature,
  normalizedCurrency,
  parseHotmartPlanConfig,
} = require('./paymentSecurity');
const { applyCors } = require('./cors');
const {
  getEpaycoTransactionDetail,
  isApprovedEpaycoDetail,
  normalizeEpaycoTransactionDetail,
} = require('./epaycoProvider');

function createPaymentHandlers({
  functions,
  admin,
  db,
  defineString,
  defineSecret,
  fetchImpl = (...args) => fetch(...args),
  epaycoTransactionDetailImpl = getEpaycoTransactionDetail,
}) {
  const epaycoCustomerId = defineString('EPAYCO_CUSTOMER_ID');
  const epaycoPKey = defineSecret('EPAYCO_P_KEY');
  const epaycoApiPublicKey = defineString('EPAYCO_API_PUBLIC_KEY');
  const epaycoApiPrivateKey = defineSecret('EPAYCO_API_PRIVATE_KEY');
  const epaycoConfirmationUrl = defineString('EPAYCO_CONFIRMATION_URL', { default: '' });
  const hotmartHottok = defineSecret('HOTMART_HOTTOK');
  const hotmartPlanConfig = defineString('HOTMART_PLAN_CONFIG', { default: '' });

  function setCors(req, res, methods, headers = 'Content-Type, Authorization') {
    applyCors(req, res, methods, headers);
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

  function getEpaycoResponseUrl(originHeader) {
    const value = String(originHeader || '').trim();
    if (!value) return undefined;
    try {
      const origin = new URL(value);
      const normalizedValue = value.replace(/\/+$/, '');
      const secureOrigin = origin.protocol === 'https:';
      const localOrigin = origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname);
      if (origin.username || origin.password || origin.origin !== normalizedValue || (!secureOrigin && !localOrigin)) {
        return undefined;
      }
      return new URL('/payment/response', origin.origin).toString();
    } catch {
      return undefined;
    }
  }

  async function authenticateEpaycoApi() {
    const publicKey = String(epaycoApiPublicKey.value() || '').trim();
    const privateKey = String(epaycoApiPrivateKey.value() || '');
    if (!publicKey || !privateKey) throw new Error('ePayco APIFY credentials are incomplete');

    const response = await fetchImpl('https://apify.epayco.co/login', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${publicKey}:${privateKey}`, 'utf8').toString('base64')}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    const accessToken = String(result?.token || '').trim();
    if (!response.ok || !accessToken) {
      throw new Error(`ePayco Smart Checkout authentication failed (${response.status})`);
    }
    return accessToken;
  }

  async function createEpaycoSmartCheckoutSession({ plan, orderId, email, originHeader }) {
    const confirmationUrl = String(epaycoConfirmationUrl.value() || '').trim();
    let parsedConfirmationUrl;
    try {
      parsedConfirmationUrl = new URL(confirmationUrl);
    } catch {
      throw new Error('ePayco confirmation URL is invalid');
    }
    if (
      parsedConfirmationUrl.protocol !== 'https:' || parsedConfirmationUrl.username || parsedConfirmationUrl.password ||
      parsedConfirmationUrl.pathname !== '/epaycoWebhook' || parsedConfirmationUrl.search || parsedConfirmationUrl.hash
    ) {
      throw new Error('ePayco confirmation URL is not a secure webhook URL');
    }

    const accessToken = await authenticateEpaycoApi();
    const sessionPayload = {
      checkout_version: '2',
      name: 'SmartMoney Pro',
      currency: plan.currency,
      amount: plan.amount,
      description: `Plan Pro SmartMoney por ${plan.label}`,
      lang: 'ES',
      country: 'CO',
      invoice: orderId,
      confirmation: confirmationUrl,
      method: 'POST',
      extras: { extra1: orderId },
    };
    const responseUrl = getEpaycoResponseUrl(originHeader);
    if (responseUrl) sessionPayload.response = responseUrl;
    if (email) sessionPayload.billing = { email: String(email).trim() };

    const response = await fetchImpl('https://apify.epayco.co/payment/session/create', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(sessionPayload),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json().catch(() => null);
    const sessionId = String(result?.data?.sessionId || '').trim();
    if (!response.ok || result?.success !== true || !/^[A-Za-z0-9]{20,64}$/.test(sessionId)) {
      throw new Error(`ePayco Smart Checkout session creation failed (${response.status})`);
    }
    return sessionId;
  }

  const createEpaycoOrder = functions.runWith({ secrets: [epaycoPKey, epaycoApiPrivateKey] }).https.onRequest(async (req, res) => {
    setCors(req, res, 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
      const decodedToken = await verifyFirebaseUser(req);
      if (!decodedToken) return res.status(401).json({ error: 'No autorizado' });
      if (
        !epaycoCustomerId.value() || !epaycoPKey.value() ||
        !epaycoApiPublicKey.value() || !epaycoApiPrivateKey.value() || !epaycoConfirmationUrl.value()
      ) {
        return res.status(503).json({ error: 'ePayco no está configurado para recibir pagos' });
      }

      const planId = String(req.body?.planId || '');
      const plan = EPAYCO_PLANS[planId];
      if (!plan) return res.status(400).json({ error: 'Plan no válido' });

      const userRef = db.collection('users').doc(decodedToken.uid);
      const userSnapshot = await userRef.get();
      if (!userSnapshot.exists) return res.status(404).json({ error: 'Usuario no encontrado' });

      const orderRef = db.collection('epayco_orders').doc();
      let sessionId;
      try {
        const userEmail = String(userSnapshot.data()?.email || decodedToken.email || '').trim();
        sessionId = await createEpaycoSmartCheckoutSession({
          plan,
          orderId: orderRef.id,
          email: userEmail,
          originHeader: req.headers.origin,
        });
      } catch (error) {
        console.error('[createEpaycoOrder] No se pudo crear la sesión Smart Checkout:', error.message);
        return res.status(502).json({ error: 'No se pudo crear la sesión de checkout ePayco' });
      }

      await orderRef.create({
        schemaVersion: 2,
        userId: decodedToken.uid,
        planId,
        months: plan.months,
        amount: plan.amount,
        currency: plan.currency,
        checkoutVersion: 2,
        checkoutSessionId: sessionId,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(201).json({
        orderId: orderRef.id,
        sessionId,
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

  const epaycoWebhook = functions.runWith({ secrets: [epaycoPKey, epaycoApiPrivateKey] }).https.onRequest(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    try {
      const customerId = epaycoCustomerId.value();
      const pKey = epaycoPKey.value();
      if (!customerId || !pKey || !epaycoApiPublicKey.value() || !epaycoApiPrivateKey.value()) {
        console.error('[ePayco] Configuración de firma o APIFY incompleta');
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

      let accessToken;
      let detailResponse;
      try {
        accessToken = await authenticateEpaycoApi();
        detailResponse = await epaycoTransactionDetailImpl({
          accessToken,
          referencePayco: String(data.x_ref_payco),
        });
      } catch (error) {
        console.error('[ePayco] No fue posible consultar el detalle autenticado:', error.message);
        return res.status(503).send('Provider verification unavailable');
      }
      if (!detailResponse?.ok) {
        console.error('[ePayco] No fue posible consultar el detalle de transacción');
        return res.status(503).send('Provider verification unavailable');
      }

      const providerData = normalizeEpaycoTransactionDetail(detailResponse);
      if (!providerData) {
        console.warn('[ePayco] El detalle autenticado no coincide con una transacción verificable');
        return res.status(400).send('Provider transaction not verified');
      }
      if (isEpaycoTestTransaction(providerData)) {
        console.warn('[ePayco] Se rechazó una transacción marcada como prueba en producción');
        return res.status(400).send('Test transactions are not accepted');
      }
      const orderId = String(providerData.x_extra1 ?? providerData.extra1 ?? '');
      if (!/^[A-Za-z0-9]{20}$/.test(orderId)) return res.status(400).send('Invalid order reference');

      const orderRef = db.collection('epayco_orders').doc(orderId);
      const orderSnapshot = await orderRef.get();
      if (!orderSnapshot.exists) return res.status(400).send('Unknown order');

      const order = { id: orderSnapshot.id, ...orderSnapshot.data() };
      const approvedPlan = EPAYCO_PLANS[order.planId];
      if (
        order.schemaVersion !== 2 ||
        !['pending', 'paid'].includes(order.status) ||
        order.checkoutVersion !== 2 ||
        !/^[A-Za-z0-9]{20,64}$/.test(String(order.checkoutSessionId || '')) ||
        !approvedPlan ||
        order.months !== approvedPlan.months ||
        !exactAmountsMatch(order.amount, approvedPlan.amount) ||
        normalizedCurrency(order.currency) !== approvedPlan.currency ||
        !epaycoValidationMatches(order, data, providerData)
      ) {
        console.warn('[ePayco] Orden no coincide con la transacción validada');
        return res.status(400).send('Order does not match provider transaction');
      }

      if (!isEpaycoApproved(providerData) || !isApprovedEpaycoDetail(providerData)) {
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
    setCors(req, res, 'POST, OPTIONS', 'Content-Type, X-HOTMART-HOTTOK');
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

      const transactionId = String(purchase.transaction || '').trim();
      const subscriberCode = String(eventData?.subscription?.subscriber?.code || '').trim();
      const sessionId = String(purchase.origin?.xcod || '');
      if (!transactionId || transactionId.length > 200 || !subscriberCode || subscriberCode.length > 200) {
        console.warn('[Hotmart] Evento aprobado sin referencia de transacción o suscriptor');
        return res.status(200).send('Transaction or subscriber reference missing');
      }
      const matchingPlans = Object.entries(plans).filter(([, plan]) => hotmartPurchaseMatches(plan, product, purchase));
      if (matchingPlans.length !== 1) {
        return res.status(200).send('Purchase does not match an authorized offer');
      }
      const [authorizedPlanId, authorizedPlan] = matchingPlans[0];
      const productId = authorizedPlan.productId;
      const bindingRef = db.collection('hotmart_subscriptions').doc(hashIdentifier(`${productId}:${subscriberCode}`));
      const transactionRef = db.collection('hotmart_transactions').doc(hashIdentifier(transactionId));
      const sessionRef = /^[A-Za-z0-9]{20}$/.test(sessionId)
        ? db.collection('hotmart_sessions').doc(sessionId)
        : null;
      const applied = await db.runTransaction(async (transaction) => {
        // Leer cada registro que pueda influir en la autorización antes de escribir.
        const [existingTransaction, bindingSnapshot, sessionSnapshot] = await Promise.all([
          transaction.get(transactionRef),
          transaction.get(bindingRef),
          sessionRef ? transaction.get(sessionRef) : Promise.resolve({ exists: false }),
        ]);
        if (existingTransaction.exists) return 'duplicate';

        let binding;
        let isFirstPurchase = false;
        if (bindingSnapshot.exists) {
          binding = bindingSnapshot.data();
          const plan = plans[binding.planId];
          if (
            !plan || binding.planId !== authorizedPlanId || binding.schemaVersion !== 1 || !binding.userId ||
            (sessionSnapshot.exists && sessionSnapshot.data().userId !== binding.userId) ||
            String(binding.productId) !== plan.productId ||
            String(binding.offerCode) !== plan.offerCode ||
            binding.months !== plan.months || !amountsMatch(binding.amount, plan.amount) ||
            normalizedCurrency(binding.currency) !== plan.currency ||
            plan.productId !== productId ||
            !hotmartPurchaseMatches(plan, product, purchase) ||
            String(purchase.offer?.code || '') !== binding.offerCode
          ) return 'invalid';
        } else {
          // Solo un checkout vigente y pendiente puede crear el vínculo inmutable inicial.
          if (!sessionRef || !sessionSnapshot.exists) return 'unknown-subscriber';
          const session = sessionSnapshot.data();
          const plan = plans[session.planId];
          const expiresAt = session.expiresAt?.toDate?.();
          if (
            session.schemaVersion !== 2 || session.status !== 'pending' || !plan || session.planId !== authorizedPlanId || !session.userId ||
            session.months !== plan.months || !amountsMatch(session.amount, plan.amount) ||
            normalizedCurrency(session.currency) !== plan.currency ||
            String(session.productId) !== plan.productId || String(session.offerCode) !== plan.offerCode ||
            !expiresAt || expiresAt.getTime() <= Date.now() ||
            plan.productId !== productId || !hotmartPurchaseMatches(plan, product, purchase)
          ) return 'invalid';
          binding = {
            schemaVersion: 1,
            userId: session.userId,
            planId: session.planId,
            months: plan.months,
            amount: plan.amount,
            currency: plan.currency,
            productId: plan.productId,
            offerCode: plan.offerCode,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          isFirstPurchase = true;
        }

        const plan = plans[binding.planId];
        const userRef = db.collection('users').doc(binding.userId);
        const userSnapshot = await transaction.get(userRef);
        if (!userSnapshot.exists) return 'invalid';
        if (isFirstPurchase && (!sessionSnapshot.exists || sessionSnapshot.data().status !== 'pending')) return 'order-used';

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
        if (isFirstPurchase) {
          transaction.create(bindingRef, binding);
          transaction.update(sessionRef, {
            status: 'paid',
            transactionId,
            eventId: String(payload.id || ''),
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        transaction.create(transactionRef, {
          userId: binding.userId,
          sessionId: isFirstPurchase ? sessionId : null,
          planId: binding.planId,
          months: plan.months,
          amount: plan.amount,
          currency: plan.currency,
          productId: plan.productId,
          offerCode: plan.offerCode,
          transactionId,
          subscriberCodeHash: bindingRef.id,
          eventId: String(payload.id || ''),
          status: 'approved',
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return 'applied';
      });
      if (applied === 'duplicate' || applied === 'order-used') {
        return res.status(200).send('Already processed');
      }
      if (applied !== 'applied') {
        console.warn('[Hotmart] Compra sin vínculo de suscripción autorizado:', applied);
        return res.status(200).send('Purchase does not match an authorized subscription');
      }
      return res.status(200).send('OK');
    } catch (error) {
      console.error('[Hotmart] Error procesando webhook:', error);
      return res.status(500).send('Unable to process Hotmart notification');
    }
  });

  const createHotmartSession = functions.runWith({ secrets: [hotmartHottok] }).https.onRequest(async (req, res) => {
    setCors(req, res, 'POST, OPTIONS');
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
