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
        isAdReady: (adType: "interstitial" | "rewarded") => Promise<{ ready: boolean }>;
        requestAd: (adType: "interstitial" | "rewarded") => Promise<{ result: "AD_LOADED" | "ADS_NOT_SUPPORTED" | "AD_LOAD_FAILED" }>;
        showAd: (adType: "interstitial" | "rewarded") => Promise<{ result: "AD_REWARDED" | "AD_CLOSED" | "AD_DISPLAY_FAILED" | "AD_DISMISSED", adId: string }>;
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
      sandbox: false,
    });
    // App ID: -b33d8f279a2d5d02
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
    const onIncompletePaymentFound = (payment: any) => {
      console.log('Incomplete payment found:', payment);
      // في بيئة حقيقية، يجب إرسال الـ payment.identifier للخلفية لإكمال أو إلغاء العملية
    };

    const result = await window.Pi.authenticate(
      ['payments', 'username', 'wallet_address'], // الصلاحيات المطلوبة
      onIncompletePaymentFound
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

import { userService } from './api';

/**
 * عرض إعلان مكافأة (Rewarded Ad)
 */
export const showRewardedAd = async (userId?: string): Promise<{ success: boolean; adId?: string; error?: string }> => {
  if (!window.Pi || !window.Pi.Ads) {
    return { success: false, error: 'Pi Ads SDK غير متاح' };
  }

  try {
    // 1. التحقق مما إذا كان الإعلان جاهزاً
    const isAdReadyResponse = await window.Pi.Ads.isAdReady("rewarded");

    if (!isAdReadyResponse.ready) {
      // 2. طلب تحميل الإعلان إذا لم يكن جاهزاً
      const requestAdResponse = await window.Pi.Ads.requestAd("rewarded");

      if (requestAdResponse.result === "ADS_NOT_SUPPORTED") {
        return { success: false, error: 'إعلانات Pi غير مدعومة في هذا الإصدار من المتصفح' };
      }

      if (requestAdResponse.result !== "AD_LOAD_FAILED") {
         // محاولة أخيرة للطلب إذا لم يفشل تماماً
      }
      
      if (requestAdResponse.result !== "AD_LOADED") {
        return { success: false, error: 'الإعلانات غير متوفرة حالياً، يرجى المحاولة لاحقاً' };
      }
    }

    // 3. عرض الإعلان
    const showAdResponse = await window.Pi.Ads.showAd("rewarded");

    if (showAdResponse.result === "AD_REWARDED") {
      // 4. إضافة الرصيد للمستخدم (1 دولار) بشكل فعلي
      if (userId) {
        try {
          await userService.updateBalance(userId, 1.0, "add");
          console.log("✅ تم إضافة 1 دولار لرصيد المستخدم بنجاح");
        } catch (apiError) {
          console.error("❌ فشل تحديث الرصيد عبر API:", apiError);
          // لا نوقف العملية لأن الإعلان تمت مشاهدته بنجاح
        }
      }
      return { success: true, adId: showAdResponse.adId };
    } else {
      return { success: false, error: 'لم يتم إكمال مشاهدة الإعلان للحصول على المكافأة' };
    }
  } catch (err: any) {
    console.error('❌ خطأ في عرض إعلان Pi:', err);
    return { success: false, error: err?.message || 'حدث خطأ غير متوقع أثناء عرض الإعلان' };
  }
};

export default {
  initPiSDK,
  authenticateWithPi,
  isPiAvailable,
  getPiUserInfo,
  showRewardedAd,
};
