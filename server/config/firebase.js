const admin = require('firebase-admin');

const normalizeServiceAccount = (rawAccount) => {
  if (!rawAccount) return null;

  const account = typeof rawAccount === 'string' ? JSON.parse(rawAccount) : rawAccount;

  if (account.private_key) {
    account.private_key = account.private_key.replace(/\\n/g, '\n');
  }

  return account;
};

const initializeFirebase = () => {
  if (admin.apps.length) return admin.app();

  const fromEnv =
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (fromEnv) {
    const serviceAccount = normalizeServiceAccount(fromEnv);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const serviceAccount = normalizeServiceAccount({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY,
    });

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  // Fallback for local development
  const serviceAccount = require('./firebase-service-account.json');
  return admin.initializeApp({
    credential: admin.credential.cert(normalizeServiceAccount(serviceAccount)),
  });
};

try {
  initializeFirebase();
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('⚠️ Firebase Admin failed to initialize:', error.message);
}

module.exports = admin;
