const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// ==================== WEBHOOK DE EPayco ====================
exports.epaycoWebhook = functions.https.onRequest(async (req, res) => {
  // Cabeceras CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Responder preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('[Webhook] Recibida notificación de ePayco');
    const data = req.body;
    
    const {
      x_ref_payco, x_transaction_id, x_amount, x_currency_code,
      x_response, x_cod_response, x_signature, x_extra1, x_extra2
    } = data;

    const p_cust_id_cliente = process.env.EPAYCO_CUSTOMER_ID;
    const p_key = process.env.EPAYCO_P_KEY;
    
    if (!p_cust_id_cliente || !p_key) {
      console.error('[Webhook] Faltan configuraciones: EPAYCO_CUSTOMER_ID o EPAYCO_P_KEY');
      return res.status(200).send('Configuration error');
    }

    const signatureString = `${p_cust_id_cliente}^${p_key}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;
    const computedSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

    if (computedSignature !== x_signature) {
      console.error('[Webhook] Firma inválida - posible intento de fraude');
      return res.status(200).send('Invalid signature');
    }

    console.log('[Webhook] Firma validada correctamente');

    const transactionRef = db.collection('epayco_transactions').doc(x_ref_payco);
    const transactionSnap = await transactionRef.get();
    
    if (transactionSnap.exists) {
      console.log(`[Webhook] Transacción ${x_ref_payco} ya fue procesada`);
      return res.status(200).send('Already processed');
    }

    const isSuccessful = x_response === 'Aceptada' || x_cod_response === '1';
    
    if (isSuccessful) {
      const userId = x_extra1;
      const months = parseInt(x_extra2) || 1;
      
      if (!userId) {
        console.error('[Webhook] No se recibió userId en x_extra1');
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
        lastPaymentMonths: months
      });

      console.log(`[Webhook] ✅ Usuario ${userId} activado como Pro por ${months} meses`);

      await transactionRef.set({
        userId, months,
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
});

// ==================== WEBHOOK DE HOTMART ====================
exports.hotmartWebhook = functions.https.onRequest(async (req, res) => {
  // Cabeceras CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Responder preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('[Hotmart Webhook] Recibida notificación');
    const data = req.body;
    
    // Hotmart puede enviar diferentes estructuras según la versión
    // Versión 2.0.0 usa: { event, data: { purchase, buyer } }
    const event = data.event || data.type || 'unknown';
    const eventData = data.data || data;
    
    console.log(`[Hotmart] Evento recibido: ${event}`);

    // Verificar que es un evento de compra exitosa
    if (event !== 'PURCHASE_COMPLETED' && event !== 'PURCHASE_APPROVED') {
      console.log(`[Hotmart] Evento ignorado: ${event}`);
      return res.status(200).send('OK');
    }

    // Extraer datos de la compra
    const purchase = eventData.purchase || eventData.data?.purchase || {};
    const buyer = eventData.buyer || eventData.data?.buyer || {};
    
    const transactionId = purchase.transaction_id || purchase.id || 'unknown';
    const amount = purchase.payment?.value || purchase.amount || 0;
    const status = purchase.payment?.status || purchase.status || '';
    
    console.log(`[Hotmart] Compra: ${transactionId} - $${amount} - ${status}`);

    // 🔥 IMPORTANTE: Hotmart NO envía userId en el webhook
    // Necesitamos obtenerlo de una sesión temporal.
    // Por ahora, registramos la transacción y enviamos un email al admin.
    
    // Buscar si existe una sesión temporal con este transactionId
    // (Implementar sistema de sesiones si es necesario)
    let userId = null;
    
    // Buscar en colección de sesiones temporales
    const sessionsSnapshot = await db.collection('hotmart_sessions')
      .where('transactionId', '==', transactionId)
      .where('expired', '==', false)
      .limit(1)
      .get();

    if (!sessionsSnapshot.empty) {
      const sessionData = sessionsSnapshot.docs[0].data();
      userId = sessionData.userId;
      
      // Marcar sesión como usada
      await sessionsSnapshot.docs[0].ref.update({ expired: true });
    }

    // Si encontramos userId, activar Pro
    if (userId) {
      const months = 1; // Por defecto 1 mes, o extraer del producto
      
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
      // La transacción queda pendiente para revisión manual
    }

    // Registrar la transacción
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
    // Siempre responder 200 para que Hotmart no reintente
    res.status(200).send('OK');
  }
});

// ==================== FUNCIÓN AUXILIAR: Crear sesión para Hotmart ====================
exports.createHotmartSession = functions.https.onRequest(async (req, res) => {
  // Cabeceras CORS
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

    // Crear sesión temporal
    const sessionRef = db.collection('hotmart_sessions').doc();
    const sessionId = sessionRef.id;
    
    await sessionRef.set({
      userId,
      months: parseInt(months) || 1,
      productId: productId || 'O105879229W',
      createdAt: new Date().toISOString(),
      expired: false
    });

    // Redirigir a Hotmart con el sessionId
    const hotmartUrl = `https://pay.hotmart.com/O105879229W?ref=${sessionId}`;
    
    // Si es una petición GET, redirigir
    if (req.method === 'GET') {
      return res.redirect(hotmartUrl);
    }
    
    // Si es POST, devolver la URL
    return res.json({ url: hotmartUrl, sessionId });

  } catch (error) {
    console.error('[createHotmartSession] Error:', error);
    res.status(500).json({ error: 'Error al crear sesión' });
  }
});
