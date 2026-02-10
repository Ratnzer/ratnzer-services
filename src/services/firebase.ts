import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
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

// منع الانهيار في حالة عدم وجود مفتاح API
let app;
try {
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing. Firebase features will be disabled.");
    app = initializeApp({ ...firebaseConfig, apiKey: "dummy-key" }); // تهيئة وهمية لمنع كسر التصدير
  } else {
    app = initializeApp(firebaseConfig);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export const signInWithGoogle = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // ✅ استخدام المصادقة الأصلية لتطبيقات الهاتف (Android/iOS)
      const result = await FirebaseAuthentication.signInWithGoogle();
      // في المكون @capacitor-firebase/authentication، الـ idToken موجود داخل credential
      const idToken = result.credential?.idToken;
      return { user: result.user, idToken };
    } else {
      // ✅ استخدام الويب للمتصفحات
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signInWithFacebook = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // ✅ استخدام المصادقة الأصلية لتطبيقات الهاتف (Android/iOS)
      const result = await FirebaseAuthentication.signInWithFacebook();
      // في المكون @capacitor-firebase/authentication، الـ idToken موجود داخل credential
      const idToken = result.credential?.idToken;
      return { user: result.user, idToken };
    } else {
      // ✅ استخدام الويب للمتصفحات
      const result = await signInWithPopup(auth, facebookProvider);
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    }
  } catch (error) {
    console.error("Error signing in with Facebook", error);
    throw error;
  }
};
