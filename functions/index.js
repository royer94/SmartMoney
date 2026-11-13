const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { defineString, defineSecret } = require('firebase-functions/params');

admin.initializeApp();
const db = admin.firestore();
db.settings({ databaseId: 'ai-studio-4d598d16-d332-49e9-9157-502087392356' });

// ==================== PAGOS: ÓRDENES Y WEBHOOKS ====================
const { applyCors } = require('./cors');
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

// ==================== NOTIFICACIONES PUSH (ONESIGNAL) ====================
const { createNotificationHandlers } = require('./notifications');
const notificationHandlers = createNotificationHandlers({
  functions,
  admin,
  db,
  defineSecret,
});

exports.dispatchScheduledNotifications = notificationHandlers.dispatchScheduledNotifications;
exports.sendTestPush = notificationHandlers.sendTestPush;

// ==================== PROXY SEGURO DE IA (GROQ WHISPER + LLAMA 3.3) ====================
const groqApiKey = defineSecret('GROQ_API_KEY');
const MAX_AUDIO_BASE64_LENGTH = 10 * 1024 * 1024; // ~7.5 MB de audio
const MAX_CHAT_MESSAGES = 10;
const MAX_MESSAGE_CONTENT_LENGTH = 8000;
const ALLOWED_CHAT_ROLES = new Set(['system', 'user', 'assistant']);

function hasActiveTrialServer(userData) {
  if (!userData) return false;
  if (userData.isPro === true || userData.isActive === true) return false;
  if (userData.trialEndDate) {
    const endDate = typeof userData.trialEndDate.toDate === 'function'
      ? userData.trialEndDate.toDate()
      : new Date(userData.trialEndDate);
    if (!Number.isNaN(endDate.getTime())) {
      return endDate > new Date();
    }
  }
  return userData.isTrialActive === true;
}

exports.groqProxy = functions.runWith({ secrets: [groqApiKey] }).https.onRequest(async (req, res) => {
  applyCors(req, res, 'POST, OPTIONS');

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

    const idToken = authHeader.slice(7).trim();
    if (!idToken) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // 2. Obtener API Key de Groq desde Secret Manager / entorno del servidor
    const apiKey = groqApiKey.value() || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GROQ_API_KEY no configurada en el servidor' });
    }

    // 3. Verificar existencia del usuario y cuotas del plan
    const userSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!userSnap.exists) {
      return res.status(403).json({ error: 'Perfil de usuario no encontrado' });
    }

    const userData = userSnap.data() || {};
    const isPaidPro = userData.isPro === true || userData.isActive === true;
    const isTrial = !isPaidPro && hasActiveTrialServer(userData);
    const { action, messages, mimeType, base64Data } = req.body || {};

    if (action === 'transcribe') {
      if (!isPaidPro) {
        const voiceLimit = isTrial ? 10 : 3;
        if ((userData.monthlyVoiceCount || 0) >= voiceLimit) {
          return res.status(403).json({ error: 'Has alcanzado tu límite mensual de registros por voz' });
        }
      }
      if (typeof base64Data !== 'string' || !base64Data) {
        return res.status(400).json({ error: 'Audio base64Data requerido' });
      }
      if (base64Data.length > MAX_AUDIO_BASE64_LENGTH) {
        return res.status(413).json({ error: 'El archivo de audio excede el tamaño máximo permitido' });
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
      if (!isPaidPro) {
        const textLimit = isTrial ? 30 : 15;
        if ((userData.monthlyRecordCount || 0) >= textLimit) {
          return res.status(403).json({ error: 'Has alcanzado tu límite mensual de registros de texto' });
        }
      }
      if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.length > MAX_CHAT_MESSAGES ||
        messages.some((m) =>
          !m ||
          !ALLOWED_CHAT_ROLES.has(m.role) ||
          typeof m.content !== 'string' ||
          m.content.length === 0 ||
          m.content.length > MAX_MESSAGE_CONTENT_LENGTH
        )
      ) {
        return res.status(400).json({ error: 'Formato o tamaño de messages inválido' });
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

async function commitUpdatesInBatches(items) {
  const BATCH_LIMIT = 450;
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    for (const { ref, data } of items.slice(i, i + BATCH_LIMIT)) {
      batch.update(ref, data);
    }
    await batch.commit();
  }
}

// ==================== TAREAS DIARIAS ====================
exports.dailySubscriptionTasks = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/Bogota')
  .onRun(async () => {
    console.log('[DailyTasks] Verificando suscripciones y períodos de prueba expirados...');

    const now = new Date();
    const nowIso = now.toISOString();

    // 1. Suscripciones pagadas vencidas
    const usersSnapshot = await db.collection('users')
      .where('isActive', '==', true)
      .where('proExpiresAt', '<=', nowIso)
      .get();

    const expiredSubUpdates = usersSnapshot.docs.map((doc) => ({
      ref: doc.ref,
      data: { isActive: false, isPro: false },
    }));
    await commitUpdatesInBatches(expiredSubUpdates);

    // 2. Períodos de prueba (30 días) vencidos
    const trialsSnapshot = await db.collection('users')
      .where('isTrialActive', '==', true)
      .where('trialEndDate', '<=', nowIso)
      .get();

    const expiredTrialUpdates = trialsSnapshot.docs.map((doc) => ({
      ref: doc.ref,
      data: { isTrialActive: false },
    }));
    await commitUpdatesInBatches(expiredTrialUpdates);

    console.log(`[DailyTasks] ✅ ${expiredSubUpdates.length} suscripciones y ${expiredTrialUpdates.length} trials expirados desactivados`);
    return null;
  });

// ==================== RESETEO MENSUAL DE CUOTAS ====================
exports.monthlyQuotaReset = functions.pubsub
  .schedule('5 0 1 * *')
  .timeZone('America/Bogota')
  .onRun(async () => {
    console.log('[MonthlyReset] Reiniciando contadores mensuales de texto y voz...');
    const nowIso = new Date().toISOString();

    const [textSnap, voiceSnap] = await Promise.all([
      db.collection('users').where('monthlyRecordCount', '>', 0).get(),
      db.collection('users').where('monthlyVoiceCount', '>', 0).get(),
    ]);

    const refsById = new Map();
    for (const doc of [...textSnap.docs, ...voiceSnap.docs]) {
      refsById.set(doc.id, doc.ref);
    }

    const resetUpdates = Array.from(refsById.values()).map((ref) => ({
      ref,
      data: {
        monthlyRecordCount: 0,
        monthlyVoiceCount: 0,
        lastResetDate: nowIso,
      },
    }));
    await commitUpdatesInBatches(resetUpdates);

    console.log(`[MonthlyReset] ✅ Contadores reiniciados para ${resetUpdates.length} usuarios`);
    return null;
  });
