const admin = require('firebase-admin');

let app;

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
    app = admin.app();
    return app;
  }

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('Firebase Admin not initialized: Missing environment variables.');
    return null;
  }

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    return app;
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err.message);
    return null;
  }
}

function getDb() {
  if (!admin.apps.length && !initializeFirebaseAdmin()) return null;
  return admin.firestore();
}

module.exports = { initializeFirebaseAdmin, getDb };


