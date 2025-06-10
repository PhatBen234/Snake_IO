// services/firebaseService.js
const admin = require("firebase-admin");

function init() {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  console.log("🔥 Firebase Initialized");
}

function getDB() {
  return admin.firestore();
}

function getBucket() {
  return admin.storage().bucket();
}

module.exports = {
  init,
  getDB,
  getBucket,
};
