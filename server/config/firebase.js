const admin = require('firebase-admin');

// ✅ دعم التهيئة عبر ملف أو عبر متغير بيئي (لـ Vercel)
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // إذا كان المتغير البيئي موجوداً (غالباً كـ JSON string)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized via Environment Variable');
  } else {
    // المحاولة عبر الملف المحلي (للتطوير المحلي)
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized via JSON file');
  }
} catch (error) {
  console.error('⚠️ Firebase Admin failed to initialize:', error.message);
}

module.exports = admin;
