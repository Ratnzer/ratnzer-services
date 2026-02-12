import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  browserPopupRedirectResolver
} from "firebase/auth";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

// ✅ إعدادات Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// ✅ تهيئة Firebase بشكل آمن
let app;
let auth: any;

type SocialProvider = 'google.com' | 'facebook.com';

export interface SocialSignInResult {
  user: any;
  idToken: string | null;
  provider: SocialProvider;
}

try {
  if (firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } else {
    console.warn("Firebase configuration is missing.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// Providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

/**
 * معالجة تسجيل الدخول عبر Google
 */
export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // ✅ للهاتف: استخدام المصادقة الأصلية عبر Capacitor Plugin بدون الاعتماد على Firebase JS
      console.log("Starting Native Google Sign-In...");
      
      const result = await FirebaseAuthentication.signInWithGoogle().catch(err => {
        console.error("Native Google Plugin Error:", err);
        throw new Error(`خطأ في إضافة جوجل: ${err.message || 'تأكد من إعدادات SHA-1 في Firebase'}`);
      });
      if (!result?.user) throw new Error("فشل تسجيل الدخول عبر جوجل على النظام");

      const tokenResult = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
      const idToken = tokenResult?.token;
      if (!idToken) throw new Error("لم يتم استلام رمز التحقق (idToken) من جوجل");
      
      return { 
        user: result.user,
        idToken,
        provider: 'google.com'
      } satisfies SocialSignInResult;
    } else {
      // ✅ للويب
      if (!auth) throw new Error("Firebase Auth غير مهيأ");
      
      try {
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken, provider: 'google.com' } satisfies SocialSignInResult;
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return { user: null, idToken: null, provider: 'google.com' } satisfies SocialSignInResult;
        }
        throw popupError;
      }
    }
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

/**
 * معالجة تسجيل الدخول عبر Facebook
 */
export const signInWithFacebook = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // ✅ للهاتف: Native Facebook + Firebase token من الطبقة الأصلية
      console.log("Starting Native Facebook Sign-In...");
      
      const result = await FirebaseAuthentication.signInWithFacebook().catch(err => {
        console.error("Native Facebook Plugin Error:", err);
        throw new Error(`خطأ في إضافة فيسبوك: ${err.message || 'تأكد من معرف التطبيق (App ID) في strings.xml'}`);
      });
      if (!result?.user) throw new Error("فشل تسجيل الدخول عبر فيسبوك على النظام");

      const tokenResult = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
      const idToken = tokenResult?.token;
      if (!idToken) throw new Error("لم يتم استلام رمز التحقق (idToken) من فيسبوك");
      
      return { 
        user: result.user,
        idToken,
        provider: 'facebook.com'
      } satisfies SocialSignInResult;
    } else {
      // ✅ للويب
      if (!auth) throw new Error("Firebase Auth غير مهيأ");

      try {
        const result = await signInWithPopup(auth, facebookProvider, browserPopupRedirectResolver);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken, provider: 'facebook.com' } satisfies SocialSignInResult;
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, facebookProvider);
          return { user: null, idToken: null, provider: 'facebook.com' } satisfies SocialSignInResult;
        }
        throw popupError;
      }
    }
  } catch (error: any) {
    console.error("Error signing in with Facebook:", error);
    throw error;
  }
};

/**
 * وظيفة للتحقق من نتائج إعادة التوجيه (للويب فقط)
 */
export const handleRedirectResult = async () => {
  if (Capacitor.isNativePlatform()) return null;
  if (!auth) return null;
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const idToken = await result.user.getIdToken();
      const provider = (result.providerId === 'facebook.com' ? 'facebook.com' : 'google.com') as SocialProvider;
      return { user: result.user, idToken, provider } satisfies SocialSignInResult;
    }
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    return null;
  }
};

export { auth };
