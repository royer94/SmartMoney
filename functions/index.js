const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// FORZAMOS la inicialización pasándole explícitamente el ID del proyecto de la IA
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "ai-studio-4d598d16-d332-49e9-9157-502087392356"
  });
}

// Conectamos Firestore asegurando la ruta de la base de datos predeterminada de ese entorno
const db = getFirestore();

exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    // Habilitar CORS
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // Intentamos capturar la colección de usuarios
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conectado con éxito, pero la colección 'users' no tiene documentos en este momento."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Inicializa solo si el usuario no tiene los campos de suscripción
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

          // Firestore maneja lotes de máximo 500 escrituras
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
        message: `¡Éxito absoluto! Se actualizaron ${totalUpdated} usuarios existentes en SmartMoney AI.`
      });

    } catch (error) {
      console.error("Error capturado en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
