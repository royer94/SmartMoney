const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa la app apuntando con precisión quirúrgica al ID del proyecto donde están tus datos reales
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "ai-studio-4d598d16-d332-49e9-9157-502087392356" // El ID que se ve en tu captura de Firestore
  });
}

const db = admin.firestore();

exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // Accedemos a la colección 'users' del proyecto correcto
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conexión lograda, pero la colección 'users' está vacía en este proyecto."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Evitamos sobreescribir si ya tienen los campos
        if (userData.isTrialActive === undefined) {
          const userRef = usersRef.doc(doc.id);
          
          batch.update(userRef, {
            isTrialActive: true,
            trialEndDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
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
        message: `¡Campos inicializados! Se actualizaron con éxito ${totalUpdated} usuarios en el proyecto correcto.`
      });

    } catch (error) {
      console.error("Error en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
