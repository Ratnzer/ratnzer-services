/**
 * Pi Network SDK Service
 * يتعامل مع تهيئة SDK والمصادقة عبر Pi Network
 */

import api from './api';

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
        showAd: (adType: "interstitial" | "rewarded") => Promise<{ result: "AD_REWARDED" | "AD_CLOSED" | "AD_DISPLAY_FAILED" | "AD_DISMISSED" | "AD_NETWORK_ERROR" | "USER_UNAUTHENTICATED", adId?: string }>;
      };
    };
  }
}

// متغير لمنع استدعاء الإعلانات بشكل متكرر في نفس الوقت
let isAdShowing = false;

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
    // تهيئة SDK
    window.Pi.init({
      version: '2.0',
      sandbox: false,
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
    const onIncompletePaymentFound = (payment: any) => {
      console.log('Incomplete payment found:', payment);
    };

    const result = await window.Pi.authenticate(
      ['payments', 'username', 'wallet_address'], 
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

/**
 * عرض إعلان مكافأة (Rewarded Ad)
 * يقوم بالتحقق من جاهزية الإعلان، طلبه إذا لم يكن جاهزاً، ثم عرضه وإرسال adId للسيرفر.
 */
export const showRewardedAd = async (userId?: string): Promise<{ success: boolean; adId?: string; error?: string }> => {
  if (!window.Pi || !window.Pi.Ads) {
    return { success: false, error: 'إعلانات Pi غير متاحة حالياً. يرجى فتح التطبيق من داخل Pi Browser.' };
  }

  if (isAdShowing) {
    return { success: false, error: 'هناك إعلان قيد العرض بالفعل، يرجى الانتظار.' };
  }

  isAdShowing = true;

  try {
    console.log("Checking if Ad is ready...");
    // 1. التحقق مما إذا كان الإعلان جاهزاً
    const isAdReadyResponse = await window.Pi.Ads.isAdReady("rewarded");
    console.log("Ad ready response:", isAdReadyResponse);

    if (!isAdReadyResponse.ready) {
      console.log("Ad not ready, requesting ad...");
      // 2. طلب تحميل الإعلان إذا لم يكن جاهزاً
      const requestAdResponse = await window.Pi.Ads.requestAd("rewarded");
      console.log("Request ad response:", requestAdResponse);

      if (requestAdResponse.result === "ADS_NOT_SUPPORTED") {
        isAdShowing = false;
        return { success: false, error: 'إعلانات Pi غير مدعومة في هذا الإصدار من المتصفح. يرجى تحديث متصفح Pi.' };
      }

      if (requestAdResponse.result !== "AD_LOADED") {
        isAdShowing = false;
        return { success: false, error: 'عذراً، لا تتوفر إعلانات حالياً من Pi Ads. يرجى المحاولة مرة أخرى لاحقاً.' };
      }
      
      // ننتظر ثانية واحدة لضمان استقرار SDK بعد التحميل
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log("Showing Ad now...");
    // 3. عرض الإعلان
    const showAdResponse = await window.Pi.Ads.showAd("rewarded");
    console.log("Show ad response:", showAdResponse);

    // تحرير القفل فور الحصول على النتيجة
    isAdShowing = false;

    // معالجة حالات الاستجابة المختلفة بناءً على توثيق Pi SDK
    switch (showAdResponse.result) {
      case "AD_REWARDED":
        // 4. إضافة الرصيد للمستخدم (0.01 دولار) عبر السيرفر
        // نستخدم try-catch داخلي قوي جداً لمنع أي انهيار في التطبيق
        try {
          console.log("Processing reward for adId:", showAdResponse.adId);
          
          // نرسل الطلب للسيرفر، ولكن لا ننتظر استجابته لتعطيل الواجهة إذا تأخر
          // هذا يمنع الانهيار (Crash) في حال كان السيرفر بطيئاً أو حدث خطأ في الشبكة فور إغلاق الإعلان
          api.post('/wallet/deposit', {
            amount: 0.01,
            paymentMethod: 'pi_ads',
            paymentDetails: { adId: showAdResponse.adId },
            description: `مكافأة مشاهدة إعلان Pi Ads | adId: ${showAdResponse.adId || 'unknown'}`,
          }).catch(err => console.error("Background deposit error:", err));

          console.log("✅ Ad rewarded successfully, returning to UI");
          return { success: true, adId: showAdResponse.adId };
        } catch (innerError: any) {
          console.error("❌ Error in reward processing block:", innerError);
          // حتى لو فشل الكود الداخلي، نرجع نجاح للمستخدم لأن الإعلان اكتمل فعلياً
          return { success: true, adId: showAdResponse.adId, error: "اكتملت المشاهدة، سيتم تحديث الرصيد تلقائياً." };
        }

      case "AD_CLOSED":
      case "AD_DISMISSED":
        return { success: false, error: 'لقد قمت بإغلاق الإعلان قبل اكتماله، يرجى مشاهدة الإعلان كاملاً للحصول على المكافأة.' };

      case "AD_NETWORK_ERROR":
        return { success: false, error: 'حدث خطأ في الشبكة أثناء عرض الإعلان. يرجى التأكد من اتصالك بالإنترنت.' };

      case "USER_UNAUTHENTICATED":
        console.log("User unauthenticated for Ads, attempting to re-authenticate...");
        try {
          await window.Pi.authenticate(['username']);
          return { success: false, error: 'تم تحديث المصادقة، يرجى المحاولة مرة أخرى الآن.' };
        } catch (authErr) {
          return { success: false, error: 'يجب تسجيل الدخول أولاً لعرض الإعلانات والحصول على مكافآت.' };
        }

      case "AD_DISPLAY_FAILED":
        return { success: false, error: 'فشل عرض الإعلان لسبب تقني. يرجى المحاولة مرة أخرى.' };

      default:
        return { success: false, error: 'لم يتم إكمال مشاهدة الإعلان للحصول على المكافأة.' };
    }
  } catch (err: any) {
    isAdShowing = false;
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
