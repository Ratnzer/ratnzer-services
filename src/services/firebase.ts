import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signInWithCredential, Auth } from "firebase/auth";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';

// ✅ استخدام المتغيرات البيئية لضمان الأمان والمرونة
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// ============================================================
// ✅ FIX: تهيئة Firebase بشكل آمن تماماً
// لا نرمي throw أبداً على مستوى الـ module لأن ذلك يقتل التطبيق
// فوراً قبل أن يبدأ React أو ErrorBoundary
// ============================================================
let app: FirebaseApp | undefined;
let firebaseInitError: string | null = null;

try {
  if (!firebaseConfig.apiKey) {
    if (Capacitor.isNativePlatform()) {
      // على الهاتف: google-services.json يوفر المفاتيح للـ native SDK
      // الـ Web SDK يحتاج مفتاح ولو وهمي لمنع الكراش
      console.warn("Firebase: API Key missing in env vars, using native config fallback.");
      app = initializeApp({ ...firebaseConfig, apiKey: "native-platform-key" });
    } else {
      console.warn("Firebase: API Key missing. Firebase features will be disabled.");
      app = initializeApp({ ...firebaseConfig, apiKey: "dummy-key" });
    }
  } else {
    app = initializeApp(firebaseConfig);
  }
} catch (error: any) {
  // ✅ FIX: نسجل الخطأ فقط بدون throw
  firebaseInitError = error?.message || 'Unknown Firebase init error';
  console.error("Firebase initialization failed (non-fatal):", error);

  // حفظ الخطأ في localStorage ليظهر في سجل الأخطاء
  try {
    const crashData = {
      message: `Firebase Init Failed: ${firebaseInitError}`,
      stack: error?.stack || 'No stack trace',
      time: new Date().toISOString(),
      type: 'FirebaseInitError'
    };
    localStorage.setItem('last_app_crash', JSON.stringify(crashData));
  } catch (_e) {}

  // محاولة أخيرة بـ dummy config
  try {
    app = initializeApp({ ...firebaseConfig, apiKey: "fallback-key" });
  } catch (_e2) {
    console.error("Firebase fallback init also failed:", _e2);
  }
}

// ✅ تصدير آمن - لن يكرش حتى لو app = undefined
let auth: Auth;
try {
  auth = getAuth(app);
} catch (_e) {
  console.error("getAuth failed:", _e);
  auth = {} as Auth;
}

export { auth };
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// تصدير حالة التهيئة للاستخدام في أماكن أخرى
export const isFirebaseReady = () => !firebaseInitError && !!app;
export const getFirebaseError = () => firebaseInitError;

/**
 * تسجيل الدخول عبر جوجل
 * يدعم كلاً من الويب والتطبيق الأصلي (Android/iOS)
 */
export const signInWithGoogle = async () => {
  if (firebaseInitError && !Capacitor.isNativePlatform()) {
    throw new Error(`Firebase غير متاح: ${firebaseInitError}`);
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;

      if (!idToken) {
        throw new Error("لم يتم استلام idToken من جوجل");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const serverIdToken = await userCredential.user.getIdToken();
      return { user: userCredential.user, idToken: serverIdToken };
    } else {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

/**
 * تسجيل الدخول عبر فيسبوك
 * يدعم كلاً من الويب والتطبيق الأصلي (Android/iOS)
 */
export const signInWithFacebook = async () => {
  if (firebaseInitError && !Capacitor.isNativePlatform()) {
    throw new Error(`Firebase غير متاح: ${firebaseInitError}`);
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const result = await FirebaseAuthentication.signInWithFacebook();
      const accessToken = result.credential?.accessToken;

      if (!accessToken) {
        throw new Error("لم يتم استلام accessToken من فيسبوك");
      }

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      const idToken = await userCredential.user.getIdToken();
      return { user: userCredential.user, idToken };
    } else {
      const result = await signInWithPopup(auth, facebookProvider);
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
  } catch (error) {
    console.error("Error signing in with Facebook", error);
    throw error;
  }
};
