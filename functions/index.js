const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { defineString, defineSecret } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();

// ==================== PARÁMETROS DE CONFIGURACIÓN ====================
const epaycoCustomerId = defineString('EPAYCO_CUSTOMER_ID');
const epaycoPKey = defineSecret('EPAYCO_P_KEY');

// ==================== WEBHOOK DE EPayco ====================
exports.epaycoWebhook = functions.https.onRequest(
  { secrets: [epaycoPKey] },
  async (req, res) => {
    // CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    try {
      console.log('[Webhook] Recibida notificación de ePayco');
      const data = req.body;

      const p_cust_id_cliente = epaycoCustomerId.value();
      const p_key = epaycoPKey.value();

      if (!p_cust_id_cliente || !p_key) {
        console.error('[Webhook] Faltan configuraciones');
        return res.status(200).send('Configuration error');
      }

      const {
        x_ref_payco, x_transaction_id, x_amount, x_currency_code,
        x_response, x_cod_response, x_signature, x_extra1, x_extra2
      } = data;

      // Validar firma
      const signatureString = `${p_cust_id_cliente}^${p_key}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;
      const computedSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

      if (computedSignature !== x_signature) {
        console.error('[Webhook] Firma inválida');
        return res.status(200).send('Invalid signature');
      }

      console.log('[Webhook] Firma validada correctamente');

      // Evitar duplicados
      const transactionRef = db.collection('epayco_transactions').doc(x_ref_payco);
      const transactionSnap = await transactionRef.get();

      if (transactionSnap.exists) {
        console.log(`[Webhook] Transacción ${x_ref_payco} ya procesada`);
        return res.status(200).send('Already processed');
      }

      const isSuccessful = x_response === 'Aceptada' || x_cod_response === '1';

      if (isSuccessful) {
        const userId = x_extra1;
        const months = parseInt(x_extra2) || 1;

        if (!userId) {
          console.error('[Webhook] No se recibió userId');
          return res.status(200).send('Missing userId');
        }

        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + months);

        await db.collection('users').doc(userId).update({
          isPro: true,
          isActive: true,
          isTrialActive: false,
          trialEndDate: null,
          proExpiresAt: expiry.toISOString(),
          lastPaymentDate: new Date().toISOString(),
          lastPaymentAmount: parseFloat(x_amount),
          lastPaymentMonths: months,
          lastPaymentMethod: 'epayco'
        });

        console.log(`[Webhook] ✅ Usuario ${userId} activado como Pro por ${months} meses`);

        await transactionRef.set({
          userId,
          months,
          amount: parseFloat(x_amount),
          transactionId: x_transaction_id,
          processedAt: new Date().toISOString(),
          status: 'success'
        });
      } else {
        console.log(`[Webhook] ❌ Pago rechazado: ${x_response}`);
        await transactionRef.set({
          status: 'failed',
          response: x_response,
          processedAt: new Date().toISOString()
        });
      }

      res.status(200).send('OK');

    } catch (error) {
      console.error('[Webhook] Error:', error);
      res.status(200).send('OK');
    }
  }
);

// ==================== WEBHOOK DE HOTMART ====================
exports.hotmartWebhook = functions.https.onRequest(async (req, res) => {
  // CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('[Hotmart Webhook] Recibida notificación');
    const data = req.body;
    const event = data.event || data.type || 'unknown';
    const eventData = data.data || data;

    console.log(`[Hotmart] Evento recibido: ${event}`);

    if (event !== 'PURCHASE_COMPLETED' && event !== 'PURCHASE_APPROVED') {
      console.log(`[Hotmart] Evento ignorado: ${event}`);
      return res.status(200).send('OK');
    }

    const purchase = eventData.purchase || eventData.data?.purchase || {};
    const buyer = eventData.buyer || eventData.data?.buyer || {};

    const transactionId = purchase.transaction_id || purchase.id || 'unknown';
    const amount = purchase.payment?.value || purchase.amount || 0;
    const status = purchase.payment?.status || purchase.status || '';

    console.log(`[Hotmart] Compra: ${transactionId} - $${amount} - ${status}`);

    // Buscar sesión temporal
    let userId = null;
    const sessionsSnapshot = await db.collection('hotmart_sessions')
      .where('transactionId', '==', transactionId)
      .where('expired', '==', false)
      .limit(1)
      .get();

    if (!sessionsSnapshot.empty) {
      const sessionData = sessionsSnapshot.docs[0].data();
      userId = sessionData.userId;
      await sessionsSnapshot.docs[0].ref.update({ expired: true });
    }

    if (userId) {
      const months = 1;
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);

      await db.collection('users').doc(userId).update({
        isPro: true,
        isActive: true,
        isTrialActive: false,
        trialEndDate: null,
        proExpiresAt: expiry.toISOString(),
        lastPaymentDate: new Date().toISOString(),
        lastPaymentAmount: parseFloat(amount),
        lastPaymentMonths: months,
        lastPaymentMethod: 'hotmart'
      });

      console.log(`[Hotmart] ✅ Usuario ${userId} activado como Pro`);
    } else {
      console.warn('[Hotmart] ⚠️ No se encontró userId para la transacción:', transactionId);
    }

    const transactionRef = db.collection('hotmart_transactions').doc(transactionId);
    await transactionRef.set({
      userId: userId || 'unknown',
      event,
      amount: parseFloat(amount),
      buyerEmail: buyer.email || '',
      buyerName: buyer.name || '',
      transactionId,
      status: status || 'pending',
      processedAt: new Date().toISOString(),
      webhookData: data
    });

    res.status(200).send('OK');

  } catch (error) {
    console.error('[Hotmart] Error:', error);
    res.status(200).send('OK');
  }
});

// ==================== CREAR SESIÓN PARA HOTMART ====================
exports.createHotmartSession = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    const { userId, months, productId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId es requerido' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const sessionRef = db.collection('hotmart_sessions').doc();
    const sessionId = sessionRef.id;

    await sessionRef.set({
      userId,
      months: parseInt(months) || 1,
      productId: productId || 'O105879229W',
      createdAt: new Date().toISOString(),
      expired: false
    });

    const hotmartUrl = `https://pay.hotmart.com/O105879229W?ref=${sessionId}`;

    if (req.method === 'GET') {
      return res.redirect(hotmartUrl);
    }

    return res.json({ url: hotmartUrl, sessionId });

  } catch (error) {
    console.error('[createHotmartSession] Error:', error);
    res.status(500).json({ error: 'Error al crear sesión' });
  }
});

// ==================== TAREAS DIARIAS ====================
exports.dailySubscriptionTasks = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/Bogota')
  .onRun(async (context) => {
    console.log('[DailyTasks] Verificando suscripciones expiradas...');

    const now = new Date();
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .where('proExpiresAt', '<=', now.toISOString())
      .get();

    let updatedCount = 0;
    for (const doc of usersSnapshot.docs) {
      await doc.ref.update({
        isActive: false,
        isPro: false
      });
      updatedCount++;
    }

    console.log(`[DailyTasks] ✅ ${updatedCount} suscripciones expiradas desactivadas`);
    return null;
  });
