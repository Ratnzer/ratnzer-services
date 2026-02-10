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

// ✅ تهيئة Firebase بشكل آمن (فقط إذا كانت الإعدادات موجودة)
let app;
let auth: any;

try {
  if (firebaseConfig.apiKey) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } else {
    console.warn("Firebase configuration is missing. Auth features might not work.");
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
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      const idToken = result.credential?.idToken;
      if (!idToken) throw new Error("Google idToken is missing from native provider");

      if (!auth) throw new Error("Firebase Auth is not initialized");

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      return { 
        user: userCredential.user, 
        idToken: await userCredential.user.getIdToken() 
      };
    } else {
      // ✅ للويب
      if (!auth) throw new Error("Firebase Auth is not initialized");
      
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
  } catch (error) {
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
      const result = await FirebaseAuthentication.signInWithFacebook();
      
      const accessToken = result.credential?.accessToken;
      if (!accessToken) throw new Error("Facebook accessToken is missing from native provider");

      if (!auth) throw new Error("Firebase Auth is not initialized");

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      return { 
        user: userCredential.user, 
        idToken: await userCredential.user.getIdToken() 
      };
    } else {
      // ✅ للويب
      if (!auth) throw new Error("Firebase Auth is not initialized");
      
      try {
        const result = await signInWithPopup(auth, facebookProvider, browserPopupRedirectResolver);
        const idToken = await result.user.getIdToken();
        return { user: result.user, idToken };
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, facebookProvider);
          return { user: null, idToken: null };
        }
        throw popupError;
      }
    }
  } catch (error) {
    console.error("Error signing in with Facebook:", error);
    throw error;
  }
};

/**
 * وظيفة للتحقق من نتائج إعادة التوجيه (للويب فقط)
 */
export const handleRedirectResult = async () => {
  // حماية: لا تنفذ على الهاتف إطلاقاً
  if (Capacitor.isNativePlatform()) return null;
  
  // التأكد من وجود auth
  if (!auth) return null;
  
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    return null; // لا ترفع خطأ لتجنب توقف التطبيق
  }
};

export { auth };
