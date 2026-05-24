const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa la app conectándola explícitamente al ID de tu proyecto y base de datos activa
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "gen-lang-client-0987361888",
    databaseURL: "https://gen-lang-client-0987361888.firebaseio.com"
  });
}

// Apuntamos explícitamente a la base de datos que se ve en tu captura de Firebase
const db = admin.firestore();

/**
 * Cloud Function HTTP para inicializar campos de suscripción en masa.
 * Conectada explícitamente al entorno correcto.
 */
exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // Forzamos la consulta a la base de datos especificada
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "No se encontraron documentos en la colección 'users' para este ID de proyecto."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Solo actualiza si el campo no existe
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
        message: `Campos inicializados correctamente. Se actualizaron ${totalUpdated} usuarios existentes.`
      });

    } catch (error) {
      console.error("Error detectado en initializeUserFields:", error);
      return res.status(500).send({
        status: "error",
        message: `Error interno de conexión a Firestore: ${error.message}`
      });
    }
  });
