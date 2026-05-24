const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// REEMPLAZA ESTOS VALORES CON LOS DATOS DE TU JSON DESCARGADO
const serviceAccount = {
  type: "service_account",
  project_id: "gen-lang-client-0987361888", // Tu ID de proyecto nativo
  private_key_id: "359a26b1ae18f7e17c96be3f0b53b0fded58c2c4",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDlXlU3eDG2cwMd\nX7Jt8qDJxIfFFfxSW4yT/8uOVFcUPdUIgQ+a2bM7zcHbygAj2TmosAuCoD4dvtOs\ne1v3rTPDGDD/VIpf1+T88QeB7vb8qGD59wy/3CBhs2EkNbPyl7orfkMaQP/bCnne\n/Pn5BLxtEZiOw58gy/+nHTRIMRCGVY29ZawZfgMlTPTuCi1Zo+14Nun/vuSALDah\nLZ3zbdV+1FN/UQndNueTSm8JsF6ZgIZclj4NvK7VMJCSpruDslvGxk1PXINkEfy7\nTKn8JHdkxBBYMJbTb3VQG47/cpsMPfWhpmdWN6YIhRpmB6f3iR4XXbiesANjE5Wv\nWdEtk57pAgMBAAECgf8SNactYDHJaUfqmsIkQPQSmbemQb3k5OsvXlYHL2WlsvTp\n4xRfhU47caCkcdtbFJryHppv+v/KCJRDp8a4577rpR4qh994MIRAQ5AiKr9bi/u1\nUohKe1WDrPfOQ50Jhf0pMgW9qkVrW+H9ZMg1kKta16rHurdajQqKLQkaFXQCO2IX\nNLlejwCSWQxsLr4ioeEbzUJ84LEocWqCC2DHPi8EHfhM6KPjv9CynRIgsRshnQrv\nhkl4WJMN+6lLMYAwgMK/c6Aq6hIFyHzTeV5wEdSav51UVleY/Q1qEt2OlLLgJ3F0\nBKRZ/PIcOQfDto95vasYBksfGKGO72WdZeipmWECgYEA94yFGqzFmwMRQqpEsWwN\nmxy+mRBHXxTSve6RGsTUTDZOgQXFbTFhM0fXKAzhHMs3fSgc8DAowIEjZ1zl+Lo8\nOLsGP1famHXWMIvAEq1wlQazj2IcWL14AxW8uLVBt1mJdInGOxN9w8GfrLBu1bPj\nrKCBaNnkBbPd/PrDLgWtp2ECgYEA7TLsWS3+4GM7P0yI9phAPy+G4lw3p8c94knp\nr7d5Sosub2ThbXes0EcELVZqWyrfRkxkutVPlRwQUi57osSAd0KlCg2vzNl8lriw\n9ieUOTURQLuFlGeiNQ3aZrsoilMk1KV8Ggq4IDAJmH3amz5u0t7cjimiO1S6Th1Q\ny02cjIkCgYAMNzDySghOR+54HbLaFnztZJO7NeRvurVTjgw3B/N590wUbdZ6Nu+W\n+jqRzWDmbNjGIk6bQ6UfKsA2f40Row8JtaDvS0SMNXRmXN8TjN97WyNNNgg0ENV1\nQYNYkgk2JQL1bz8K90FDgbCBcwtlHEVl5V29cNMhvOh9bVpoUPtqwQKBgQCIqk6D\nE31Gy+XXEsHXUuGxhjCxO3DVunZtayi5lXzM9mRKylUYPVvUpRZDCQc+f/UlC979\nxumTgBfnQeD6Zz2deUieAkTIQocGUGOlcCh2zZyjL2hHmW5cIx8zEaLKEB2oZ7CZ\nUJPF9+ePdPP/fnlcBgwN3O8cQDUXzMxAVvdcAQKBgAZgY9B6pTG7bJmyk1j6qVzN\nee4kYc7TFP4nSZn4R0cQF67uIZ1abAHCROwZ2A14ocIQpvjVzgmXzosWMaaVC9U2\n/F7SD0lvh9W/2NnLTgQ8m2njVJLnD70J9mqjCbeQd8jm8RWBS0TKtypxrII4gGkV\nRlfLn4DmHJM9duYAFbb2\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@gen-lang-client-0987361888.iam.gserviceaccount.com",
  client_id: "112142316102720049577",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gen-lang-client-0987361888.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

// Inicializamos la app con la credencial explícita de administración
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: "ai-studio-4d598d16-d332-49e9-9157-502087392356" // Apunta al contenedor de datos
  });
}

// Forzamos la base de datos con el ID largo
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
          message: "Conexión lograda con la Llave Maestra, pero la colección 'users' está vacía."
        });
      }

      let totalUpdated = 0;
      let batch = db.batch();
      let count = 0;

      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();

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
        message: `¡Éxito absoluto! Autenticado con credenciales seguras. Se actualizaron ${totalUpdated} usuarios en SmartMoney AI.`
      });

    } catch (error) {
      console.error("Error en la ejecución:", error);
      return res.status(500).send({
        status: "error",
        message: `Error de Firestore: ${error.message}`
      });
    }
  });
