import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  browserPopupRedirectResolver
} from "firebase/auth";
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

const isFirebaseWebReady = () => Boolean(auth);

const ensureToken = (value: unknown, fallbackMessage: string) => {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!token) throw new Error(fallbackMessage);
  return token;
};

const getFirebaseAuthPlugin = async () => {
  if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) {
    throw new Error('إضافة FirebaseAuthentication غير متاحة على هذا الجهاز.');
  }

  const module = await import('@capacitor-firebase/authentication');
  return module.FirebaseAuthentication;
};

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
      // ✅ للهاتف: استخدام المصادقة الأصلية عبر Capacitor Plugin
      console.log("Starting Native Google Sign-In...");
      const firebaseAuthPlugin = await getFirebaseAuthPlugin();
      
      const result = await firebaseAuthPlugin.signInWithGoogle().catch(err => {
        console.error("Native Google Plugin Error:", err);
        const error = new Error(`خطأ في إضافة جوجل: ${err.message || 'تأكد من إعدادات SHA-1 في Firebase'}`);
        (error as any).code = err.code || 'plugin_error';
        throw error;
      });
      
      const idToken = ensureToken(
        result?.credential?.idToken,
        "لم يتم استلام رمز التحقق (idToken) من جوجل. تأكد من ملف google-services.json"
      );

      // إذا كانت تهيئة Firebase Web متاحة، نوحّد الجلسة عبر signInWithCredential.
      // وإذا لم تكن متاحة، نُرجع idToken مباشرة لتفادي أي انهيار في التطبيق.
      if (isFirebaseWebReady()) {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return {
          user: userCredential.user,
          idToken: await userCredential.user.getIdToken()
        };
      }

      return { user: null, idToken };
    } else {
      // ✅ للويب
      if (!isFirebaseWebReady()) {
        throw new Error("Firebase Auth غير مهيأ. تأكد من متغيرات VITE_FIREBASE_*");
      }
      
      try {
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken };
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return { user: null, idToken: null };
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
      // ✅ للهاتف
      console.log("Starting Native Facebook Sign-In...");
      const firebaseAuthPlugin = await getFirebaseAuthPlugin();
      
      const result = await firebaseAuthPlugin.signInWithFacebook().catch(err => {
        console.error("Native Facebook Plugin Error:", err);
        const error = new Error(`خطأ في إضافة فيسبوك: ${err.message || 'تأكد من معرف التطبيق (App ID) في strings.xml'}`);
        (error as any).code = err.code || 'plugin_error';
        throw error;
      });
      
      const accessToken = ensureToken(
        result?.credential?.accessToken,
        "لم يتم استلام رمز الوصول (accessToken) من فيسبوك."
      );

      // Facebook native returns access token؛ نحوله إلى Firebase ID token إن كانت
      // تهيئة Firebase Web متاحة. في حال غيابها نعيد خطأ واضح بدل انهيار عشوائي.
      if (!isFirebaseWebReady()) {
        throw new Error("Firebase Auth غير مهيأ لفيسبوك. تأكد من متغيرات VITE_FIREBASE_*.");
      }

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCredential = await signInWithCredential(auth, credential);

      return {
        user: userCredential.user,
        idToken: await userCredential.user.getIdToken()
      };
    } else {
      // ✅ للويب
      if (!isFirebaseWebReady()) {
        throw new Error("Firebase Auth غير مهيأ. تأكد من متغيرات VITE_FIREBASE_*");
      }
      
      // ✅ للويب: استخدام signInWithRedirect مباشرة لتجنب حظر النوافذ المنبثقة
      await signInWithRedirect(auth, facebookProvider);
      // لن يتم الوصول إلى هنا بعد إعادة التوجيه، سيتم معالجة النتيجة في App.tsx عبر handleRedirectResult
      return { user: null, idToken: null };
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
  if (!isFirebaseWebReady()) return null;
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    return null;
  }
};

export { auth };
