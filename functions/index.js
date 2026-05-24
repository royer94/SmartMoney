const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// 1. Inicializamos la app apuntando con precisión al proyecto de la IA
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "ai-studio-4d598d16-d332-49e9-9157-502087392356"
  });
}

/**
 * 2. EL AJUSTE MAESTRO:
 * Forzamos al SDK a buscar la base de datos usando el ID largo del proyecto
 * en lugar del nombre "(default)" que viene predeterminado.
 */
const db = getFirestore("ai-studio-4d598d16-d332-49e9-9157-502087392356");

exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // Accedemos a la colección 'users' dentro del contenedor correcto
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conexión lograda, pero la colección 'users' está vacía en este entorno."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Evitamos sobreescribir si ya tienen los campos de SmartMoney AI
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
        message: `¡Éxito total! Se inicializaron los campos para ${totalUpdated} usuarios existentes.`
      });

    } catch (error) {
      console.error("Error en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
