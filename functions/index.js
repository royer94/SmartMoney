const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa la app de forma nativa en su propio proyecto (Fresc Nat Admin 2)
if (admin.apps.length === 0) {
  admin.initializeApp();
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
      // Lee la colección 'users' de este mismo proyecto
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conexión exitosa. La colección 'users' está vacía o aún no se han registrado usuarios en este entorno."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Inicializa los campos si no existen
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
        message: `¡Campos inicializados! Se actualizaron con éxito ${totalUpdated} usuarios.`
      });

    } catch (error) {
      console.error("Error en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
