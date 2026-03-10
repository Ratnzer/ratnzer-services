/**
 * ملف الإعدادات المركزي للبيئات (Sandbox / Mainnet)
 * 
 * هذا الملف يدير جميع الروابط والإعدادات حسب البيئة المختارة
 * يمكن التبديل بين Sandbox و Mainnet بسهولة عبر تغيير قيمة isSandbox
 */

// ============================================================
// 🔧 تبديل البيئة: غيّر هذه القيمة لتشغيل Sandbox أو Mainnet
// ============================================================
export const isSandbox = process.env.REACT_APP_SANDBOX === 'true' || false;

console.log(`🌍 تطبيق Ratnzer يعمل على بيئة: ${isSandbox ? '🧪 Sandbox (الاختبار)' : '🚀 Mainnet (الإنتاج)'}`);

// ============================================================
// 📱 Pi Network SDK Configuration
// ============================================================
export const PI_CONFIG = {
  // تهيئة Pi SDK
  sandbox: isSandbox,
  version: '2.0',
  
  // روابط SDK
  sdkUrl: isSandbox 
    ? 'https://sandbox.minepi.com/pi-sdk.js'
    : 'https://sdk.minepi.com/pi-sdk.js',
  
  // معرّف التطبيق
  appId: isSandbox
    ? '-b33d8f279a2d5d02' // Sandbox App ID
    : '-b33d8f279a2d5d02', // Mainnet App ID (استخدم معرّف الإنتاج الحقيقي)
};

// ============================================================
// 🔗 روابط التطبيق (Frontend URLs)
// ============================================================
export const APP_URLS = {
  // الرابط الأساسي للتطبيق
  main: isSandbox
    ? 'https://sandbox.minepi.com/app/ratnzer-services'
    : 'https://www.ratnzer.com',
  
  // رابط الرجوع بعد الدفع (Callback URL)
  paymentCallback: isSandbox
    ? 'https://sandbox.minepi.com/app/ratnzer-services/payment-callback'
    : 'https://www.ratnzer.com/payment-callback',
  
  // رابط الرجوع بعد المصادقة (Auth Callback)
  authCallback: isSandbox
    ? 'https://sandbox.minepi.com/app/ratnzer-services/auth-callback'
    : 'https://www.ratnzer.com/auth-callback',
};

// ============================================================
// 🔌 روابط API (Backend URLs)
// ============================================================
export const API_URLS = {
  // الـ Base URL للـ API
  base: isSandbox
    ? 'https://sandbox-api.minepi.com'
    : 'https://ratnzer-services-bb0a0cce4837.herokuapp.com',
  
  // Pi Network API
  piNetwork: isSandbox
    ? 'https://sandbox.minepi.com/api'
    : 'https://api.minepi.com',
  
  // KD1S API (خدمات الدفع)
  kd1s: process.env.REACT_APP_KD1S_API_URL || 'https://kd1s.com/api/v2',
};

// ============================================================
// 🔐 مفاتيح API (من متغيرات البيئة)
// ============================================================
export const API_KEYS = {
  // مفتاح Pi Network API
  piNetwork: process.env.REACT_APP_PI_API_KEY || '',
  
  // مفتاح KD1S API
  kd1s: process.env.REACT_APP_KD1S_API_KEY || '',
};

// ============================================================
// 💳 إعدادات الدفع
// ============================================================
export const PAYMENT_CONFIG = {
  // PayTabs Configuration
  paytabs: {
    merchantEmail: isSandbox
      ? 'sandbox@ratnzer.com'
      : 'merchant@ratnzer.com',
    
    serverKey: isSandbox
      ? process.env.REACT_APP_PAYTABS_SANDBOX_KEY || ''
      : process.env.REACT_APP_PAYTABS_PRODUCTION_KEY || '',
  },
  
  // Pi Network Payment
  pi: {
    // سيتم استخدام isSandbox من PI_CONFIG
    sandbox: isSandbox,
  },
};

// ============================================================
// 🌐 إعدادات اللغة والعملات
// ============================================================
export const LOCALIZATION = {
  // اللغة الافتراضية
  defaultLanguage: 'ar',
  
  // العملات المدعومة
  supportedCurrencies: ['USD', 'IQD', 'PI'],
  
  // العملة الافتراضية
  defaultCurrency: 'USD',
};

// ============================================================
// 📊 إعدادات التطبيق العامة
// ============================================================
export const APP_CONFIG = {
  // اسم التطبيق
  name: 'خدمات راتنزر',
  
  // إصدار التطبيق
  version: '1.0.0',
  
  // البيئة الحالية
  environment: isSandbox ? 'sandbox' : 'production',
  
  // تفعيل وضع التطوير (Debug Mode)
  debug: isSandbox,
  
  // مهلة انتظار الطلبات (بالميلي ثانية)
  requestTimeout: 20000,
  
  // عدد محاولات إعادة الطلب
  maxRetries: 3,
};

// ============================================================
// 🔄 دالة مساعدة للحصول على الـ URL الكامل
// ============================================================
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_URLS.base;
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}/api${cleanEndpoint}`;
};

// ============================================================
// 📋 دالة مساعدة للحصول على إعدادات البيئة الكاملة
// ============================================================
export const getEnvironmentConfig = () => ({
  isSandbox,
  piConfig: PI_CONFIG,
  appUrls: APP_URLS,
  apiUrls: API_URLS,
  apiKeys: API_KEYS,
  paymentConfig: PAYMENT_CONFIG,
  localization: LOCALIZATION,
  appConfig: APP_CONFIG,
});

// ============================================================
// 🧪 دالة للتحقق من البيئة
// ============================================================
export const isSandboxMode = (): boolean => isSandbox;
export const isProductionMode = (): boolean => !isSandbox;

// ============================================================
// 📝 طباعة معلومات البيئة في Console (للتطوير فقط)
// ============================================================
if (APP_CONFIG.debug) {
  console.group('🔧 Environment Configuration');
  console.log('Environment:', APP_CONFIG.environment);
  console.log('Pi SDK URL:', PI_CONFIG.sdkUrl);
  console.log('API Base URL:', API_URLS.base);
  console.log('Pi Network API:', API_URLS.piNetwork);
  console.log('App Main URL:', APP_URLS.main);
  console.groupEnd();
}

export default {
  isSandbox,
  PI_CONFIG,
  APP_URLS,
  API_URLS,
  API_KEYS,
  PAYMENT_CONFIG,
  LOCALIZATION,
  APP_CONFIG,
  getApiUrl,
  getEnvironmentConfig,
  isSandboxMode,
  isProductionMode,
};
