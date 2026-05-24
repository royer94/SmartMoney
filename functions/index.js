const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Inicializa la app de administración de manera global
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Forzamos al SDK a apuntar al ID de base de datos específico 
 * que se muestra en tus capturas de pantalla para evitar el error NOT_FOUND.
 */
const db = getFirestore("(default)", "ai-studio-4d598d16-d332-49e9-9157-502087392356");

exports.initializeUserFields = functions
  .runWith({
    timeoutSeconds: 300, 
    memory: "512MB"      
  })
  .https.onRequest(async (req, res) => {
    // Habilitar CORS para evitar bloqueos
    res.set("Access-Control-Allow-Origin", "*");

    try {
      // Acceder a la colección 'users' dentro de la base de datos configurada
      const usersRef = db.collection("users");
      const usersSnapshot = await usersRef.get();
      
      if (usersSnapshot.empty) {
        return res.status(200).send({
          status: "success",
          message: "Conexión exitosa, pero la colección 'users' está vacía en esta base de datos."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

        // Inicializar solo si no tienen los campos asignados
        if (userData.isTrialActive === undefined) {
          const userRef = usersRef.doc(doc.id);
          
          batch.update(userRef, {
            isTrialActive: true,
            trialEndDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 días de prueba
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
        message: `¡Campos inicializados! Se actualizaron con éxito ${totalUpdated} usuarios existentes.`
      });

    } catch (error) {
      console.error("Error en la ejecución de initializeUserFields:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
