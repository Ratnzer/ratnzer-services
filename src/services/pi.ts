/**
 * Pi Network SDK Service
 * يتعامل مع تهيئة SDK والمصادقة عبر Pi Network
 */

import { PI_CONFIG } from '../config/environment';

// تعريف نوع Pi SDK
declare global {
  interface Window {
    Pi?: {
      init: (options: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: any) => void
      ) => Promise<{ user: { username: string; uid: string }; accessToken: string }>;
      createPayment: (paymentData: any, callbacks: any) => void;
      openShareDialog: () => void;
      openConversation: () => void;
      nativeFeaturesList: () => string[];
      requestPermission: (permission: string) => Promise<boolean>;
      copyText: (text: string) => void;
      openUrlInSystemBrowser: (url: string) => void;
      Ads?: {
        isAdReady: () => Promise<boolean>;
        requestAd: () => Promise<void>;
        showAd: () => Promise<void>;
      };
    };
  }
}

/**
 * تهيئة Pi SDK
 * يجب استدعاء هذه الدالة عند تحميل التطبيق
 */
export const initPiSDK = () => {
  if (!window.Pi) {
    console.warn('⚠️ Pi SDK غير محمّل بعد. تأكد من تضمين السكريبت في index.html');
    return;
  }

  try {
    // تهيئة SDK باستخدام الإعدادات المركزية
    window.Pi.init({
      version: PI_CONFIG.version,
      sandbox: PI_CONFIG.sandbox,
    });
    
    const environment = PI_CONFIG.sandbox ? '🧪 Sandbox' : '🚀 Mainnet';
    console.log(`✅ تم تهيئة Pi SDK بنجاح على بيئة ${environment}`);
    console.log(`📱 معرّف التطبيق: ${PI_CONFIG.appId}`);
  } catch (error) {
    console.error('❌ خطأ في تهيئة Pi SDK:', error);
  }
};

/**
 * المصادقة عبر Pi Network
 * يطلب من المستخدم تسجيل الدخول عبر حسابه في Pi Network
 */
export const authenticateWithPi = async (): Promise<{
  username: string;
  uid: string;
  accessToken: string;
} | null> => {
  if (!window.Pi) {
    throw new Error('Pi SDK غير متاح');
  }

  try {
    const environment = PI_CONFIG.sandbox ? 'Sandbox' : 'Mainnet';
    console.log(`🔐 محاولة المصادقة عبر Pi Network (${environment})...`);
    
    const onIncompletePaymentFound = (payment: any) => {
      console.log('⚠️ تم العثور على عملية دفع غير مكتملة:', payment);
      // في بيئة حقيقية، يجب إرسال الـ payment.identifier للخلفية لإكمال أو إلغاء العملية
    };

    const result = await window.Pi.authenticate(
      ['payments', 'username', 'wallet_address'], // الصلاحيات المطلوبة
      onIncompletePaymentFound
    );

    console.log(`✅ تم تسجيل الدخول بنجاح: ${result.user.username}`);
    
    return {
      username: result.user.username,
      uid: result.user.uid,
      accessToken: result.accessToken,
    };
  } catch (error: any) {
    console.error('❌ خطأ في المصادقة عبر Pi:', error);
    throw new Error(error?.message || 'فشل تسجيل الدخول عبر Pi Network');
  }
};

/**
 * التحقق من توفر Pi SDK
 */
export const isPiAvailable = (): boolean => {
  return !!window.Pi;
};

/**
 * الحصول على معلومات المستخدم من Pi
 */
export const getPiUserInfo = async (): Promise<{
  username: string;
  uid: string;
} | null> => {
  if (!window.Pi) {
    return null;
  }

  try {
    const result = await window.Pi.authenticate(['username']);
    return {
      username: result.user.username,
      uid: result.user.uid,
    };
  } catch (error) {
    console.error('خطأ في الحصول على معلومات المستخدم:', error);
    return null;
  }
};

/**
 * دالة للحصول على معلومات البيئة الحالية
 */
export const getPiEnvironment = () => ({
  isSandbox: PI_CONFIG.sandbox,
  environment: PI_CONFIG.sandbox ? 'Sandbox' : 'Mainnet',
  appId: PI_CONFIG.appId,
  sdkUrl: PI_CONFIG.sdkUrl,
});

export default {
  initPiSDK,
  authenticateWithPi,
  isPiAvailable,
  getPiUserInfo,
  getPiEnvironment,
};
