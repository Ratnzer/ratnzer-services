import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCredential,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let app;
let auth: any;

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

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

const ensureAuth = () => {
  if (!auth) {
    throw new Error("Firebase Auth غير مهيأ");
  }
};

const formatNativePluginError = (providerName: "جوجل" | "فيسبوك", err: any) => {
  const code = err?.code || "plugin_error";
  const message = err?.message || "حدث خطأ غير متوقع في إضافة Firebase";

  if (code === "plugin_error") {
    return `خطأ في إضافة ${providerName}: إعدادات مزود تسجيل الدخول غير مكتملة في التطبيق (code: ${code}).`;
  }

  return `خطأ في إضافة ${providerName}: ${message} (code: ${code})`;
};

const isNative = () => Capacitor.isNativePlatform();

let firebaseAuthenticationPlugin: any = null;
let pluginLoadAttempted = false;

const getFirebaseAuthenticationPlugin = async () => {
  if (!isNative()) return null;

  if (firebaseAuthenticationPlugin) return firebaseAuthenticationPlugin;
  if (pluginLoadAttempted) return null;

  pluginLoadAttempted = true;

  try {
    const module = await import("@capacitor-firebase/authentication");
    firebaseAuthenticationPlugin = module?.FirebaseAuthentication ?? null;
  } catch (error) {
    console.error("Failed to load Firebase Authentication plugin:", error);
    firebaseAuthenticationPlugin = null;
  }

  return firebaseAuthenticationPlugin;
};

export const signInWithGoogle = async () => {
  try {
    ensureAuth();

    if (isNative()) {
      const plugin = await getFirebaseAuthenticationPlugin();
      if (!plugin) {
        throw new Error(
          "تعذر تهيئة مكتبة Firebase Authentication على هذا الجهاز. تحقق من إعدادات Capacitor وFirebase native."
        );
      }

      const result = await plugin.signInWithGoogle().catch((err: any) => {
        console.error("Native Google Plugin Error:", err);
        throw new Error(formatNativePluginError("جوجل", err));
      });

      const idToken = result?.credential?.idToken;
      if (!idToken) {
        throw new Error("لم يتم استلام رمز التحقق (idToken) من جوجل.");
      }

      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);

      return {
        user: userCredential.user,
        idToken: await userCredential.user.getIdToken(),
      };
    }

    try {
      const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      const idToken = await result.user.getIdToken();
      return { user: result.user, idToken };
    } catch (error) {
      const popupError = error as any;
      if (popupError?.code === "auth/popup-blocked" || popupError?.code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, googleProvider);
        return { user: null, idToken: null };
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

export const signInWithFacebook = async () => {
  try {
    ensureAuth();

    if (isNative()) {
      const plugin = await getFirebaseAuthenticationPlugin();
      if (!plugin) {
        throw new Error(
          "تعذر تهيئة مكتبة Firebase Authentication على هذا الجهاز. تحقق من إعدادات Capacitor وFirebase native."
        );
      }

      const result = await plugin.signInWithFacebook().catch((err: any) => {
        console.error("Native Facebook Plugin Error:", err);
        throw new Error(formatNativePluginError("فيسبوك", err));
      });

      const accessToken = result?.credential?.accessToken;
      if (!accessToken) {
        throw new Error("لم يتم استلام رمز الوصول (accessToken) من فيسبوك.");
      }

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCredential = await signInWithCredential(auth, credential);

      return {
        user: userCredential.user,
        idToken: await userCredential.user.getIdToken(),
      };
    }

    await signInWithRedirect(auth, facebookProvider);
    return { user: null, idToken: null };
  } catch (error: any) {
    console.error("Error signing in with Facebook:", error);
    throw error;
  }
};

export const handleRedirectResult = async () => {
  if (isNative()) return null;
  if (!auth) return null;

  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const idToken = await result.user.getIdToken();
      const providerId = result.user.providerData?.[0]?.providerId || null;
      return { user: result.user, idToken, providerId };
    }
    return null;
  } catch (error) {
    console.error("Error handling redirect result:", error);
    return null;
  }
};

export { auth };
