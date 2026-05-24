const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa la app de administración de Firebase si no está inicializada
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function HTTP para inicializar campos de suscripción en masa.
 * Se le asigna más memoria y más tiempo de ejecución para evitar el Internal Server Error.
 */
exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, // Extiende el tiempo a 5 minutos (máximo permitido)
    memory: "512MB"      // Aumenta la memoria para procesar el volumen de datos
  })
  .https.onRequest(async (req, res) => {
    // Evita problemas de CORS si se llama desde la app
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // 1. Traer todos los usuarios de la colección 'users'
      const usersSnapshot = await db.collection("users").get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send("No se encontraron usuarios en la colección.");
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      // 2. Iterar sobre cada usuario para preparar la actualización
      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // OPCIONAL: Solo actualiza si el usuario NO tiene ya los campos para ahorrar operaciones
        if (userData.isTrialActive === undefined) {
          const userRef = db.collection("users").doc(doc.id);
          
          batch.update(userRef, {
            isTrialActive: true,
            trialEndDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 días desde hoy
            isActive: true,
            monthlyRecordCount: 0,
            monthlyVoiceCount: 0,
            lastResetDate: admin.firestore.Timestamp.now()
          });

          count++;
          totalUpdated++;

          // Firestore tiene un límite estricto de 500 operaciones por Batch
          if (count === 500) {
            batch.commit(); // Ejecuta este lote
            batch = db.batch(); // Inicializa uno nuevo
            count = 0;
          }
        }
      });

      // 3. Confirmar el último lote restante si tiene datos
      if (count > 0) {
        await batch.commit();
      }

      return res.status(200).send({
        status: "success",
        message: `Campos inicializados correctamente. Se actualizaron ${totalUpdated} usuarios.`
      });

    } catch (error) {
      console.error("Error global en initializeUserFields:", error);
      return res.status(500).send({
        status: "error",
        message: error.message
      });
    }
  });
