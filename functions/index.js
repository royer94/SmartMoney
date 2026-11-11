const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { defineString, defineSecret } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'ai-studio-4d598d16-d332-49e9-9157-502087392356' });

// =========***=========== PARÁMETROS DE CONFIGURACIÓN =========**===========
const epaycoCustomerId = defineString('EPAYCO_CUSTOMER_ID');
const epaycoPKey = defineSecret('EPAYCO_P_KEY');

// ==================== WEBHOOK DE EPayco ====================
exports.epaycoWebhook = functions.runWith({ secrets: [epaycoPKey] }).https.onRequest(
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
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Hotmart-Hottok');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('[Hotmart Webhook] Recibida notificación');

    // Validar token de seguridad de Hotmart si está definido en variables de entorno
    const expectedHottok = process.env.HOTMART_HOTTOK;
    const receivedHottok = req.headers['x-hotmart-hottok'] || req.body?.hottok;
    if (expectedHottok && receivedHottok !== expectedHottok) {
      console.error('[Hotmart] Hottok inválido');
      return res.status(401).send('Invalid Hottok');
    }

    const data = req.body;
    const event = data.event || data.type || 'unknown';
    const eventData = data.data || data;

    console.log(`[Hotmart] Evento recibido: ${event}`);

    if (event !== 'PURCHASE_COMPLETED' && event !== 'PURCHASE_APPROVED' && event !== 'PURCHASE_COMPLETE') {
      console.log(`[Hotmart] Evento ignorado: ${event}`);
      return res.status(200).send('OK');
    }

    const purchase = eventData.purchase || eventData.data?.purchase || {};
    const buyer = eventData.buyer || eventData.data?.buyer || {};

    const transactionId = purchase.transaction || purchase.transaction_id || purchase.id || 'unknown';
    const amount = purchase.price?.value || purchase.payment?.value || purchase.amount || 0;
    const status = purchase.status || purchase.payment?.status || '';

    // Parámetro de rastreo enviado en createHotmartSession (xcod / sck / src / ref)
    const originSessionId =
      purchase.origin?.xcod ||
      purchase.origin?.sck ||
      purchase.origin?.src ||
      data.xcod ||
      data.sck ||
      data.ref ||
      null;

    console.log(`[Hotmart] Compra: ${transactionId} - $${amount} - ${status} - sessionId: ${originSessionId}`);

    let userId = null;
    let months = 1;

    // 1. Buscar sesión directamente por ID (xcod / sck / ref)
    if (originSessionId) {
      const sessionDoc = await db.collection('hotmart_sessions').doc(String(originSessionId)).get();
      if (sessionDoc.exists && !sessionDoc.data().expired) {
        const sessionData = sessionDoc.data();
        userId = sessionData.userId;
        months = parseInt(sessionData.months) || 1;
        await sessionDoc.ref.update({ expired: true, transactionId });
      }
    }

    // 2. Fallback: buscar por transactionId en hotmart_sessions
    if (!userId && transactionId !== 'unknown') {
      const sessionsSnapshot = await db.collection('hotmart_sessions')
        .where('transactionId', '==', transactionId)
        .where('expired', '==', false)
        .limit(1)
        .get();

      if (!sessionsSnapshot.empty) {
        const sessionData = sessionsSnapshot.docs[0].data();
        userId = sessionData.userId;
        months = parseInt(sessionData.months) || 1;
        await sessionsSnapshot.docs[0].ref.update({ expired: true });
      }
    }

    // 3. Fallback: buscar sesión reciente o usuario por email del comprador
    if (!userId && buyer.email) {
      const buyerEmail = String(buyer.email).toLowerCase().trim();
      const emailSessionSnap = await db.collection('hotmart_sessions')
        .where('email', '==', buyerEmail)
        .where('expired', '==', false)
        .limit(1)
        .get();

      if (!emailSessionSnap.empty) {
        const sessionData = emailSessionSnap.docs[0].data();
        userId = sessionData.userId;
        months = parseInt(sessionData.months) || 1;
        await emailSessionSnap.docs[0].ref.update({ expired: true, transactionId });
      } else {
        const userByEmailSnap = await db.collection('users')
          .where('email', '==', buyerEmail)
          .limit(1)
          .get();
        if (!userByEmailSnap.empty) {
          userId = userByEmailSnap.docs[0].id;
        }
      }
    }

    if (userId) {
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

      console.log(`[Hotmart] ✅ Usuario ${userId} activado como Pro por ${months} meses`);
    } else {
      console.warn('[Hotmart] ⚠️ No se encontró userId para la transacción:', transactionId);
    }

    const transactionRef = db.collection('hotmart_transactions').doc(String(transactionId));
    await transactionRef.set({
      userId: userId || 'unknown',
      months,
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

    const userDoc = await db.collection('users').doc(String(userId)).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userEmail = (userDoc.data()?.email || '').toLowerCase().trim();
    const sessionRef = db.collection('hotmart_sessions').doc();
    const sessionId = sessionRef.id;

    await sessionRef.set({
      userId: String(userId),
      email: userEmail,
      months: parseInt(months) || 1,
      productId: productId || 'O105879229W',
      createdAt: new Date().toISOString(),
      expired: false
    });

    // Hotmart devuelve xcod y sck en purchase.origin dentro del webhook
    const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
    const hotmartUrl = `https://pay.hotmart.com/O105879229W?xcod=${sessionId}&sck=${sessionId}&ref=${sessionId}${emailParam}`;

    if (req.method === 'GET') {
      return res.redirect(hotmartUrl);
    }

    return res.json({ url: hotmartUrl, sessionId });

  } catch (error) {
    console.error('[createHotmartSession] Error:', error);
    res.status(500).json({ error: 'Error al crear sesión' });
  }
});

// ==================== PROXY SEGURO DE IA (GROQ WHISPER + LLAMA 3.3) ====================
exports.groqProxy = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Verificar usuario autenticado mediante Firebase Auth ID Token
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const idToken = authHeader.slice(7);
    await admin.auth().verifyIdToken(idToken);

    // 2. Obtener API Key de Groq desde el entorno del servidor
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GROQ_API_KEY no configurada en el servidor' });
    }

    const { action, messages, mimeType, base64Data } = req.body || {};

    if (action === 'transcribe') {
      if (!base64Data) {
        return res.status(400).json({ error: 'Audio base64Data requerido' });
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const ext = (mimeType || '').includes('mp4') ? 'mp4' : (mimeType || '').includes('aac') ? 'aac' : 'webm';
      const audioBlob = new Blob([buffer], { type: mimeType || 'audio/webm' });

      const formData = new FormData();
      formData.append('file', audioBlob, `audio.${ext}`);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'es');
      formData.append('response_format', 'text');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.error?.message || 'Error en Whisper' });
      }

      const text = (await response.text()).trim();
      return res.json({ text });
    }

    if (action === 'chat') {
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages requerido' });
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ error: err.error?.message || 'Error en Groq Chat' });
      }

      const data = await response.json();
      return res.json({ content: data.choices?.[0]?.message?.content || '{}' });
    }

    return res.status(400).json({ error: 'Acción no válida' });
  } catch (error) {
    console.error('[groqProxy] Error:', error);
    return res.status(500).json({ error: 'Error procesando solicitud de IA' });
  }
});

// ==================== TAREAS DIARIAS ====================
exports.dailySubscriptionTasks = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/Bogota')
  .onRun(async (context) => {
    console.log('[DailyTasks] Verificando suscripciones y períodos de prueba expirados...');

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Suscripciones pagadas vencidas
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .where('proExpiresAt', '<=', nowIso)
      .get();

    let updatedCount = 0;
    for (const doc of usersSnapshot.docs) {
      await doc.ref.update({
        isActive: false,
        isPro: false
      });
      updatedCount++;
    }

    // 2. Períodos de prueba (30 días) vencidos
    const trialsSnapshot = await db.collection('users')
      .where('isTrialActive', '==', true)
      .where('trialEndDate', '<=', nowIso)
      .get();

    let expiredTrialsCount = 0;
    for (const doc of trialsSnapshot.docs) {
      await doc.ref.update({
        isTrialActive: false
      });
      expiredTrialsCount++;
    }

    console.log(`[DailyTasks] ✅ ${updatedCount} suscripciones y ${expiredTrialsCount} trials expirados desactivados`);
    return null;
  });
