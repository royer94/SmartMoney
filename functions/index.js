const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// ============================================================
// Función programada (diaria) - NO LA MODIFIQUES
// ============================================================
exports.dailySubscriptionTasks = functions.pubsub.schedule('0 0 * * *').timeZone('UTC').onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const nowDate = now.toDate();
    console.log('Iniciando tareas diarias de suscripción...');

    const trialUsersSnapshot = await db.collection('users')
        .where('isTrialActive', '==', true)
        .where('trialEndDate', '<', now)
        .get();

    const batch = db.batch();
    trialUsersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (!userData.isActive) {
            batch.update(doc.ref, { isTrialActive: false });
        }
    });
    await batch.commit();

    const firstDayOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    const resetBatch = db.batch();
    const allUsersSnapshot = await db.collection('users').get();
    allUsersSnapshot.forEach(doc => {
        const data = doc.data();
        const lastReset = data.lastResetDate?.toDate();
        if (!lastReset || lastReset < firstDayOfMonth) {
            resetBatch.update(doc.ref, {
                monthlyRecordCount: 0,
                monthlyVoiceCount: 0,
                lastResetDate: now,
            });
        }
    });
    await resetBatch.commit();
    console.log('Tareas diarias completadas.');
    return null;
});

// ============================================================
// Función HTTP de inicialización (SIMPLE Y ROBUSTA)
// ============================================================
exports.initializeUserFields = functions.https.onRequest({ allowUnauthenticated: true }, async (req, res) => {
    // Configurar timeout más largo (opcional, pero ayuda)
    // No es necesario, la función por defecto tiene 60 segundos.
    try {
        console.log('Iniciando inicialización de campos...');
        const usersRef = db.collection('users');
        const snapshot = await usersRef.get();
        
        if (snapshot.empty) {
            res.status(200).send('No hay usuarios en la colección.');
            return;
        }

        let updatedCount = 0;
        let errorCount = 0;
        const errors = [];

        // Procesar uno por uno (más lento pero seguro)
        for (const doc of snapshot.docs) {
            try {
                const data = doc.data();
                const updates = {};

                if (data.isTrialActive === undefined) updates.isTrialActive = true;
                if (!data.trialEndDate) {
                    const futureDate = new Date();
                    futureDate.setDate(futureDate.getDate() + 30);
                    updates.trialEndDate = admin.firestore.Timestamp.fromDate(futureDate);
                }
                if (data.isActive === undefined) updates.isActive = false;
                if (data.monthlyRecordCount === undefined) updates.monthlyRecordCount = 0;
                if (data.monthlyVoiceCount === undefined) updates.monthlyVoiceCount = 0;
                if (!data.lastResetDate) updates.lastResetDate = admin.firestore.Timestamp.now();

                if (Object.keys(updates).length > 0) {
                    await doc.ref.update(updates);
                    updatedCount++;
                    console.log(`Usuario ${doc.id} actualizado.`);
                }
            } catch (err) {
                errorCount++;
                errors.push(`Error en usuario ${doc.id}: ${err.message}`);
                console.error(`Error en usuario ${doc.id}:`, err);
            }
        }

        const message = `✅ Inicialización completada. Usuarios actualizados: ${updatedCount}. Errores: ${errorCount}. ${errors.join('; ')}`;
        res.status(200).send(message);
    } catch (err) {
        console.error('Error general:', err);
        res.status(500).send(`❌ Error general: ${err.message}`);
    }
});
