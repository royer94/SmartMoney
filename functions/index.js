const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// ==================== WEBHOOK DE EPayco ====================
exports.epaycoWebhook = functions.https.onRequest(async (req, res) => {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    console.log('[Webhook] Recibida notificación de ePayco');
    const data = req.body;
    
    // Datos que envía ePayco
    const {
      x_ref_payco,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_response,
      x_cod_response,
      x_signature,
      x_extra1,  // userId
      x_extra2   // months
    } = data;

    // 1. Obtener variables de entorno (configuradas en Firebase)
    const p_cust_id_cliente = functions.config().epayco.customer_id;
    const p_key = functions.config().epayco.p_key;
    
    if (!p_cust_id_cliente || !p_key) {
      console.error('[Webhook] Faltan configuraciones: epayco.customer_id o epayco.p_key');
      return res.status(200).send('Configuration error');
    }

    // 2. Validar firma de seguridad
    const signatureString = `${p_cust_id_cliente}^${p_key}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;
    const computedSignature = crypto
      .createHash('sha256')
      .update(signatureString)
      .digest('hex');

    if (computedSignature !== x_signature) {
      console.error('[Webhook] Firma inválida - posible intento de fraude');
      return res.status(200).send('Invalid signature');
    }

    console.log('[Webhook] Firma validada correctamente');

    // 3. Verificar que la transacción no haya sido procesada antes
    const transactionRef = db.collection('epayco_transactions').doc(x_ref_payco);
    const transactionSnap = await transactionRef.get();
    
    if (transactionSnap.exists) {
      console.log(`[Webhook] Transacción ${x_ref_payco} ya fue procesada`);
      return res.status(200).send('Already processed');
    }

    // 4. Procesar según estado del pago
    const isSuccessful = x_response === 'Aceptada' || x_cod_response === '1';
    
    if (isSuccessful) {
      const userId = x_extra1;
      const months = parseInt(x_extra2) || 1;
      
      if (!userId) {
        console.error('[Webhook] No se recibió userId en x_extra1');
        return res.status(200).send('Missing userId');
      }

      // Calcular fecha de expiración
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + months);

      // Activar plan Pro en Firestore
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
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

      // Guardar registro de la transacción procesada
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

    // 5. Responder con 200 OK
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(200).send('OK');
  }
});
