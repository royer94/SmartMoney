const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore("ai-studio-4d598d16-d332-49e9-9157-502087392356");

exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    try {
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conexión exitosa, pero la colección 'users' está vacía."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      // Calculamos 30 días en milisegundos hacia el futuro
      const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
      const trialEndDate = admin.firestore.Timestamp.fromDate(new Date(Date.now() + thirtyDaysInMs));

      usersSnapshot.docs.forEach((doc) => {
        const userRef = usersRef.doc(doc.id);
        
        /**
         * Forzamos la actualización de todos los usuarios para corregir los 7 días anteriores
         * y estructurar el nuevo modelo de límites.
         */
        batch.set(userRef, {
          plan: "trial",                // Indica que está en periodo de prueba premium
          isTrialActive: true,          // Flag de control premium
          trialEndDate: trialEndDate,   // ¡Vence en 30 días!
          isActive: true,               // Estado de la cuenta
          monthlyRecordCount: 0,        // Registros de texto usados este mes
          monthlyVoiceCount: 0,         // Registros de voz usados este mes
          maxFreeRecords: 40,           // Límite que aplicará al pasar a Free
          maxFreeVoice: 10,             // Límite de voz que aplicará al pasar a Free
          lastResetDate: admin.firestore.Timestamp.now()
        }, { merge: true });            // El merge evita borrar otros datos como el email o nombre

        count++;
        totalUpdated++;

        if (count === 500) {
          batch.commit();
          batch = db.batch();
          count = 0;
        }
      });

      if (count > 0) {
        await batch.commit();
      }

      return res.status(200).send({
        status: "success",
        message: `¡Éxito absoluto! Se configuraron los 30 días Pro y límites Free para ${totalUpdated} usuarios.`
      });

    } catch (error) {
      console.error("Error en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
