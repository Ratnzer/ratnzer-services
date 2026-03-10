/**
 * ملف الإعدادات المركزي للـ Backend (Sandbox / Mainnet)
 * 
 * يدير جميع متغيرات البيئة والإعدادات حسب بيئة التشغيل
 */

// ============================================================
// 🔧 تحديد البيئة الحالية
// ============================================================
const NODE_ENV = process.env.NODE_ENV || 'development';
const isSandbox = process.env.SANDBOX_MODE === 'true' || NODE_ENV === 'development';

console.log(`🌍 Backend يعمل على بيئة: ${isSandbox ? '🧪 Sandbox (الاختبار)' : '🚀 Mainnet (الإنتاج)'}`);

// ============================================================
// 📱 Pi Network Configuration
// ============================================================
const PI_CONFIG = {
  // مفتاح API
  apiKey: process.env.PI_API_KEY || '',
  
  // رابط API
  apiUrl: isSandbox
    ? (process.env.PI_SANDBOX_API_URL || 'https://sandbox.minepi.com/api')
    : (process.env.PI_API_URL || 'https://api.minepi.com'),
  
  // معرّف التطبيق
  appId: process.env.PI_APP_ID || '-b33d8f279a2d5d02',
  
  // وضع Sandbox
  sandbox: isSandbox,
};

// ============================================================
// 🔗 روابط التطبيق (Frontend URLs)
// ============================================================
const APP_URLS = {
  // الرابط الأساسي للتطبيق
  main: isSandbox
    ? (process.env.SANDBOX_APP_URL || 'https://sandbox.minepi.com/app/ratnzer-services')
    : (process.env.PRODUCTION_APP_URL || 'https://www.ratnzer.com'),
  
  // رابط الرجوع بعد الدفع
  paymentCallback: isSandbox
    ? (process.env.SANDBOX_PAYMENT_CALLBACK || 'https://sandbox.minepi.com/app/ratnzer-services/payment-callback')
    : (process.env.PRODUCTION_PAYMENT_CALLBACK || 'https://www.ratnzer.com/payment-callback'),
};

// ============================================================
// 💳 إعدادات الدفع
// ============================================================
const PAYMENT_CONFIG = {
  // PayTabs Configuration
  paytabs: {
    serverKey: isSandbox
      ? (process.env.PAYTABS_SANDBOX_KEY || '')
      : (process.env.PAYTABS_PRODUCTION_KEY || ''),
    
    merchantEmail: isSandbox
      ? (process.env.PAYTABS_SANDBOX_EMAIL || 'sandbox@ratnzer.com')
      : (process.env.PAYTABS_PRODUCTION_EMAIL || 'merchant@ratnzer.com'),
  },
  
  // KD1S Configuration
  kd1s: {
    apiUrl: process.env.KD1S_API_URL || 'https://kd1s.com/api/v2',
    apiKey: process.env.KD1S_API_KEY || '',
  },
};

// ============================================================
// 📊 إعدادات قاعدة البيانات
// ============================================================
const DATABASE_CONFIG = {
  // رابط قاعدة البيانات
  url: process.env.DATABASE_URL || 'mysql://localhost:3306/ratnzer',
  
  // إعدادات Prisma
  prisma: {
    // تفعيل وضع التطوير
    debug: isSandbox,
  },
};

// ============================================================
// 🔐 إعدادات الأمان
// ============================================================
const SECURITY_CONFIG = {
  // مفتاح JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  
  // مدة انتهاء الـ Token
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // مفتاح Firebase
  firebaseKey: process.env.FIREBASE_KEY || '',
};

// ============================================================
// 📧 إعدادات البريد الإلكتروني
// ============================================================
const EMAIL_CONFIG = {
  // خدمة البريد
  service: process.env.EMAIL_SERVICE || 'gmail',
  
  // بريد المرسل
  from: process.env.EMAIL_FROM || 'noreply@ratnzer.com',
  
  // كلمة المرور / API Key
  password: process.env.EMAIL_PASSWORD || '',
};

// ============================================================
// 🔔 إعدادات الإشعارات
// ============================================================
const NOTIFICATION_CONFIG = {
  // Firebase Cloud Messaging
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
  },
};

// ============================================================
// 📋 إعدادات التطبيق العامة
// ============================================================
const APP_CONFIG = {
  // اسم التطبيق
  name: 'خدمات راتنزر',
  
  // الإصدار
  version: '1.0.0',
  
  // البيئة الحالية
  environment: isSandbox ? 'sandbox' : 'production',
  
  // تفعيل وضع التطوير
  debug: isSandbox,
  
  // منفذ التطبيق
  port: process.env.PORT || 5000,
  
  // رابط الخادم
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
};

// ============================================================
// ✅ التحقق من المتغيرات المهمة
// ============================================================
const validateEnvironment = () => {
  const warnings = [];
  const errors = [];
  
  if (!PI_CONFIG.apiKey) {
    warnings.push('⚠️ PI_API_KEY غير محدد - عمليات Pi لن تعمل');
  }
  
  if (!SECURITY_CONFIG.jwtSecret || SECURITY_CONFIG.jwtSecret === 'your-secret-key-change-in-production') {
    errors.push('❌ JWT_SECRET يجب أن يكون محدد في الإنتاج');
  }
  
  if (!DATABASE_CONFIG.url) {
    errors.push('❌ DATABASE_URL غير محدد');
  }
  
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(w));
  }
  
  if (errors.length > 0) {
    errors.forEach(e => console.error(e));
    if (!isSandbox) {
      throw new Error('فشل التحقق من متغيرات البيئة');
    }
  }
};

// ============================================================
// 📝 طباعة معلومات البيئة
// ============================================================
const printEnvironmentInfo = () => {
  if (APP_CONFIG.debug) {
    console.group('🔧 Backend Environment Configuration');
    console.log('Environment:', APP_CONFIG.environment);
    console.log('Node Env:', NODE_ENV);
    console.log('Pi API URL:', PI_CONFIG.apiUrl);
    console.log('App URL:', APP_URLS.main);
    console.log('Server URL:', APP_CONFIG.serverUrl);
    console.log('Database:', DATABASE_CONFIG.url ? 'Configured' : 'Not configured');
    console.groupEnd();
  }
};

// ============================================================
// 🚀 تصدير الإعدادات
// ============================================================
module.exports = {
  // الحالة
  isSandbox,
  NODE_ENV,
  
  // الإعدادات
  PI_CONFIG,
  APP_URLS,
  PAYMENT_CONFIG,
  DATABASE_CONFIG,
  SECURITY_CONFIG,
  EMAIL_CONFIG,
  NOTIFICATION_CONFIG,
  APP_CONFIG,
  
  // الدوال
  validateEnvironment,
  printEnvironmentInfo,
  
  // دالة للحصول على الإعدادات الكاملة
  getEnvironmentConfig: () => ({
    isSandbox,
    NODE_ENV,
    PI_CONFIG,
    APP_URLS,
    PAYMENT_CONFIG,
    DATABASE_CONFIG,
    SECURITY_CONFIG,
    EMAIL_CONFIG,
    NOTIFICATION_CONFIG,
    APP_CONFIG,
  }),
};
