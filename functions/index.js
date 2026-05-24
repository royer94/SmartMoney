const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Configuración del plan gratuito (solo referencia, no se usa en la función)
const FREE_TIER = {
    MAX_TEXT_RECORDS: 40,
    MAX_VOICE_RECORDS: 10,
};

// ============================================================
// Función programada (diaria) para expirar trials y resetear contadores
// ============================================================
exports.dailySubscriptionTasks = functions.pubsub.schedule('0 0 * * *').timeZone('UTC').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();
    console.log('Iniciando tareas diarias de suscripción...');

    // 1. Expirar trials de usuarios sin suscripción activa
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

    // 2. Resetear contadores mensuales (primer día del mes)
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

// ============================================================
// Función HTTP única para inicializar campos de suscripción en usuarios existentes
// (Se debe ejecutar una sola vez, luego puede protegerse o eliminarse)
// ============================================================
exports.initializeUserFields = functions.https.onRequest({ allowUnauthenticated: true }, async (req, res) => {
    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();

        if (snapshot.empty) {
            res.status(200).send('No hay usuarios para actualizar.');
            return;
        }

        let updatedCount = 0;
        const BATCH_SIZE = 500;
        let currentBatch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const updates = {};
            let needsUpdate = false;

            if (data.isTrialActive === undefined) {
                updates.isTrialActive = true;
                needsUpdate = true;
            }
            if (!data.trialEndDate) {
                updates.trialEndDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
                needsUpdate = true;
            }
            if (data.isActive === undefined) {
                updates.isActive = false;
                needsUpdate = true;
            }
            if (data.monthlyRecordCount === undefined) {
                updates.monthlyRecordCount = 0;
                needsUpdate = true;
            }
            if (data.monthlyVoiceCount === undefined) {
                updates.monthlyVoiceCount = 0;
                needsUpdate = true;
            }
            if (!data.lastResetDate) {
                updates.lastResetDate = admin.firestore.Timestamp.now();
                needsUpdate = true;
            }

            if (needsUpdate) {
                currentBatch.update(doc.ref, updates);
                updatedCount++;
                batchCount++;
            }

            if (batchCount >= BATCH_SIZE) {
                await currentBatch.commit();
                currentBatch = db.batch();
                batchCount = 0;
            }
        }

        if (batchCount > 0) {
            await currentBatch.commit();
        }

        res.status(200).send(`✅ Inicialización completada. Usuarios actualizados: ${updatedCount}`);
    } catch (error) {
        console.error('Error en initializeUserFields:', error);
        res.status(500).send(`❌ Error: ${error.message}`);
    }
});
