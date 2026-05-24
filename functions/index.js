const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Inicialización limpia y nativa (usa los permisos automáticos del servidor)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * CONEXIÓN DE PRECISIÓN:
 * Forzamos a la Cloud Function a conectarse exactamente a la base de datos de IA
 * que está vinculada a tu consola y a tu frontend, rompiendo el comportamiento por defecto.
 */
const db = getFirestore("ai-studio-4d598d16-d332-49e9-9157-502087392356");

exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    // Permitir llamadas CORS
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // Leemos directamente la colección 'users' del contenedor mapeado
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conexión lograda con éxito. La base de datos está enlazada, pero la colección 'users' está vacía."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Inicializa los campos de SmartMoney AI únicamente si no existen
        if (userData.isTrialActive === undefined) {
          const userRef = usersRef.doc(doc.id);
          
          batch.update(userRef, {
            isTrialActive: true,
            trialEndDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 días trial
            isActive: true,
            monthlyRecordCount: 0,
            monthlyVoiceCount: 0,
            lastResetDate: admin.firestore.Timestamp.now()
          });

          count++;
          totalUpdated++;

          // Límite de procesamiento por lotes en Firestore (Máx 500)
          if (count === 500) {
            batch.commit();
            batch = db.batch();
            count = 0;
          }
        }
      });

      if (count > 0) {
        await batch.commit();
      }

      return res.status(200).send({
        status: "success",
        message: `¡Éxito absoluto! Sincronización realizada. Se actualizaron con éxito los campos para ${totalUpdated} usuarios.`
      });

    } catch (error) {
      console.error("Error detectado en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
