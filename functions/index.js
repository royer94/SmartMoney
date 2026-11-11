const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { defineString, defineSecret } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'ai-studio-4d598d16-d332-49e9-9157-502087392356' });

// ==================== PAGOS: ÓRDENES Y WEBHOOKS ====================
const { createPaymentHandlers } = require('./paymentHandlers');
const paymentHandlers = createPaymentHandlers({
  functions,
  admin,
  db,
  defineString,
  defineSecret,
});

exports.createEpaycoOrder = paymentHandlers.createEpaycoOrder;
exports.epaycoWebhook = paymentHandlers.epaycoWebhook;
exports.hotmartWebhook = paymentHandlers.hotmartWebhook;
exports.createHotmartSession = paymentHandlers.createHotmartSession;

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
