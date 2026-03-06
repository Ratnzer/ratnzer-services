/**
 * Pi Network SDK Service
 * يتعامل مع تهيئة SDK والمصادقة عبر Pi Network
 */

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
    // تهيئة SDK مع تفعيل وضع الرمل (Sandbox) للاختبار
    window.Pi.init({
      version: '2.0',
      sandbox: true, // تغيير إلى false عند النشر على الإنتاج
    });
    console.log('✅ تم تهيئة Pi SDK بنجاح');
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
    const result = await window.Pi.authenticate(
      ['payments', 'username'], // الصلاحيات المطلوبة
      (payment) => {
        // معالجة الدفعات غير المكتملة إن وجدت
        console.log('دفعة غير مكتملة:', payment);
      }
    );

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

export default {
  initPiSDK,
  authenticateWithPi,
  isPiAvailable,
  getPiUserInfo,
};
