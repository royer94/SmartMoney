const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Configuración del plan gratuito
const FREE_TIER = {
    MAX_TEXT_RECORDS: 40,
    MAX_VOICE_RECORDS: 10,
};

// Ejecutar todos los días a las 00:00 (UTC)
exports.dailySubscriptionTasks = functions.pubsub.schedule('0 0 * * *').timeZone('UTC').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();
    console.log('Iniciando tareas diarias de suscripción...');

    // 1. Expirar trials
    const trialUsersSnapshot = await db.collection('users')
        .where('isTrialActive', '==', true)
        .where('trialEndDate', '<', now)
        .get();

    const batch = db.batch();
    trialUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (!userData.isActive) {
            console.log(`Desactivando trial para usuario: ${doc.id}`);
            batch.update(doc.ref, { isTrialActive: false });
        }
    });
    await batch.commit();
    console.log(`Trials expirados para ${trialUsersSnapshot.size} usuarios.`);

    // 2. Resetear contadores mensuales
    const firstDayOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const resetBatch = db.batch();
    const allUsersSnapshot = await db.collection('users').get();

    allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        const lastReset = data.lastResetDate?.toDate();
        if (!lastReset || lastReset < firstDayOfMonth) {
            console.log(`Reseteando contadores para usuario: ${doc.id}`);
            resetBatch.update(doc.ref, {
                monthlyRecordCount: 0,
                monthlyVoiceCount: 0,
                lastResetDate: now,
            });
        }
    });

    await resetBatch.commit();
    console.log('Contadores reseteados para los usuarios elegibles.');
    return null;
});

// ✅ Función ÚNICA para inicializar campos de suscripción en usuarios existentes
exports.initializeUserFields = functions.https.onRequest(async (req, res) => {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        const batch = db.batch();
        let updatedCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const updates = {};

            // Definir valores por defecto si faltan
            if (data.isTrialActive === undefined) updates.isTrialActive = true;
            if (!data.trialEndDate) {
                updates.trialEndDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
            }
            if (data.isActive === undefined) updates.isActive = false;
            if (data.monthlyRecordCount === undefined) updates.monthlyRecordCount = 0;
            if (data.monthlyVoiceCount === undefined) updates.monthlyVoiceCount = 0;
            if (!data.lastResetDate) updates.lastResetDate = admin.firestore.Timestamp.now();

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                updatedCount++;
            }
        });

        await batch.commit();
        res.status(200).send(`✅ Inicialización completada. Usuarios actualizados: ${updatedCount}`);
    } catch (error) {
        console.error('Error en initializeUserFields:', error);
        res.status(500).send('❌ Error al inicializar campos de suscripción');
    }
});
