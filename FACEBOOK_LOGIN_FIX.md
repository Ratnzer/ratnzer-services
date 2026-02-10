# حل تسجيل الدخول عبر فيسبوك بدون مشاكل النوافذ المنبثقة

## المشكلة الأصلية
الكود الحالي يحاول استخدام `signInWithPopup` أولاً، مما قد يؤدي إلى حظر النافذة المنبثقة من قبل المتصفح (خاصة Chrome)، مما يسبب خطأ `auth/popup-blocked` أو `auth/cancelled-popup-request`.

## الحل المقترح
استخدام **`signInWithRedirect` مباشرة** للويب بدلاً من محاولة `signInWithPopup` أولاً. هذا هو الأسلوب الذي تستخدمه التطبيقات الكبرى مثل Facebook و Google و LinkedIn.

### المميزات:
✅ لا توجد نوافذ منبثقة يمكن حظرها  
✅ تجربة مستخدم سلسة وموثوقة  
✅ يعمل على جميع المتصفحات بما فيها Chrome  
✅ يتعامل تلقائياً مع معالجة النتيجة عند العودة  

---

## التعديلات المطلوبة

### 1️⃣ تعديل `src/services/firebase.ts`

استبدل دالة `signInWithFacebook` بالكود التالي:

```typescript
/**
 * معالجة تسجيل الدخول عبر Facebook
 */
export const signInWithFacebook = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      // ✅ للهاتف: استخدام المصادقة الأصلية عبر Capacitor Plugin
      console.log("Starting Native Facebook Sign-In...");
      
      const result = await FirebaseAuthentication.signInWithFacebook().catch(err => {
        console.error("Native Facebook Plugin Error:", err);
        throw new Error(`خطأ في إضافة فيسبوك: ${err.message || 'تأكد من معرف التطبيق (App ID) في strings.xml'}`);
      });
      
      const accessToken = result.credential?.accessToken;
      if (!accessToken) throw new Error("لم يتم استلام رمز الوصول (accessToken) من فيسبوك.");

      if (!auth) throw new Error("Firebase Auth غير مهيأ");

      const credential = FacebookAuthProvider.credential(accessToken);
      const userCredential = await signInWithCredential(auth, credential);
      
      return { 
        user: userCredential.user, 
        idToken: await userCredential.user.getIdToken() 
      };
    } else {
      // ✅ للويب: استخدام signInWithRedirect مباشرة لتجنب حظر النوافذ المنبثقة
      // هذا هو الأسلوب الذي تستخدمه التطبيقات الكبرى
      if (!auth) throw new Error("Firebase Auth غير مهيأ");
      
      console.log("Starting Facebook Sign-In with Redirect...");
      await signInWithRedirect(auth, facebookProvider);
      
      // لن يتم الوصول إلى هنا بعد إعادة التوجيه
      // سيتم معالجة النتيجة في App.tsx عبر handleRedirectResult
      return { user: null, idToken: null };
    }
  } catch (error: any) {
    console.error("Error signing in with Facebook:", error);
    throw error;
  }
};
```

### 2️⃣ تعديل `src/components/LoginModal.tsx`

استبدل دالة `handleFacebookLogin` بالكود التالي:

```typescript
const handleFacebookLogin = async () => {
  try {
    // عرض مؤشر تحميل
    const button = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent?.includes('فيسبوك')
    );
    
    if (button) {
      button.disabled = true;
      const originalHTML = button.innerHTML;
      button.innerHTML = '<span className="inline-block animate-spin">⟳</span> جاري الاتصال...';
      
      try {
        const { idToken } = await signInWithFacebook();
        
        // إذا كانت النتيجة null، فهذا يعني أنه تم استخدام Redirect
        // وسيتم معالجة النتيجة في App.tsx
        if (!idToken) {
          console.log('تم بدء عملية تسجيل الدخول عبر Redirect من فيسبوك...');
          // لا تقم بأي شيء هنا - سيتم معالجة النتيجة تلقائياً عند العودة
          return;
        }
        
        // في حالة نادرة جداً حيث يتم الحصول على idToken مباشرة (للهاتف)
        const res = await authService.facebookLogin(idToken);
        const token = (res as any)?.data?.token;
        
        if (token) {
          localStorage.setItem('token', token);
          onLogin({ isRegister: false });
        } else {
          alert('فشل الحصول على رمز الدخول من السيرفر');
          button.disabled = false;
          button.innerHTML = originalHTML;
        }
      } catch (error: any) {
        console.error('Facebook Login Error:', error);
        const errorMsg = error.message || 'فشل تسجيل الدخول عبر فيسبوك';
        alert(error?.response?.data?.message || errorMsg);
        button.disabled = false;
        button.innerHTML = originalHTML;
      }
    }
  } catch (error: any) {
    console.error(error);
    alert('حدث خطأ غير متوقع');
  }
};
```

### 3️⃣ التأكد من `src/App.tsx`

تأكد من أن دالة `handleRedirectResult` يتم استدعاؤها عند بدء التطبيق (هذا موجود بالفعل في الكود):

```typescript
// Handle Firebase Auth Redirect Result (Web Only)
useEffect(() => {
  const isWeb = Capacitor.getPlatform() === 'web';
  
  if (isWeb) {
    const checkRedirect = async () => {
      try {
        if (typeof handleRedirectResult === 'function') {
          const result = await handleRedirectResult();
          if (result?.idToken) {
            // محاولة تسجيل الدخول عبر Google أولاً (الكود الحالي)
            const res = await authService.googleLogin(result.idToken);
            const token = (res as any)?.data?.token;
            if (token) {
              localStorage.setItem('token', token);
              window.location.replace(window.location.origin);
            }
          }
        }
      } catch (error) {
        console.warn("Non-critical redirect auth error:", error);
      }
    };
    void checkRedirect();
  }
}, []);
```

**تحسين مقترح:** عدّل هذا الجزء ليتعامل مع فيسبوك أيضاً:

```typescript
useEffect(() => {
  const isWeb = Capacitor.getPlatform() === 'web';
  
  if (isWeb) {
    const checkRedirect = async () => {
      try {
        if (typeof handleRedirectResult === 'function') {
          const result = await handleRedirectResult();
          if (result?.idToken) {
            // محاولة تسجيل الدخول - قد يكون من Google أو Facebook
            // الدالة ستحاول Google أولاً، وإذا فشلت ستحاول Facebook
            let res = await authService.googleLogin(result.idToken).catch(() => null);
            
            // إذا فشل Google، حاول Facebook
            if (!res) {
              res = await authService.facebookLogin(result.idToken).catch(() => null);
            }
            
            const token = (res as any)?.data?.token;
            if (token) {
              localStorage.setItem('token', token);
              window.location.replace(window.location.origin);
            }
          }
        }
      } catch (error) {
        console.warn("Non-critical redirect auth error:", error);
      }
    };
    void checkRedirect();
  }
}, []);
```

---

## إعدادات فيسبوك المطلوبة

تأكد من إضافة النطاقات التالية في لوحة تحكم فيسبوك:

### في قسم **App Domains**:
- `ratnzer.com`
- `www.ratnzer.com`
- `ratnzer-services.firebaseapp.com`

### في قسم **Valid OAuth Redirect URIs** (Facebook Login):
- `https://ratnzer-services.firebaseapp.com/__/auth/handler`

### في قسم **Facebook Login Settings**:
- تأكد من تفعيل **Embedded Browser OAuth Login** (إن لزم الأمر)
- تأكد من إضافة جميع النطاقات في **Valid OAuth Redirect URIs**

---

## الفوائد

| الميزة | التفاصيل |
|--------|---------|
| **عدم الحظر** | لا توجد نوافذ منبثقة يمكن حظرها من المتصفح |
| **التوافقية** | يعمل على جميع المتصفحات بما فيها Chrome و Safari و Firefox |
| **التجربة** | تجربة مستخدم احترافية وسلسة مثل التطبيقات الكبرى |
| **الموثوقية** | معالجة تلقائية للنتائج عند العودة من فيسبوك |
| **الأمان** | لا يتم تخزين بيانات حساسة في النوافذ المنبثقة |

---

## الاختبار

بعد تطبيق التعديلات:

1. افتح الموقع في متصفح Chrome
2. انقر على زر "فيسبوك" في نافذة تسجيل الدخول
3. ستظهر نافذة جديدة (أو تحويل في نفس الصفحة) لتسجيل الدخول عبر فيسبوك
4. بعد إدخال بيانات فيسبوك، سيتم إعادة توجيهك تلقائياً إلى الموقع
5. يجب أن تكون مسجل دخول بنجاح دون أي أخطاء

---

## ملاحظات إضافية

- هذا الحل يستخدم **Redirect بدلاً من Popup** وهو الأسلوب الموصى به من Firebase للويب
- الكود يحافظ على دعم **الهاتف (Native)** باستخدام Capacitor Plugin
- لا حاجة لتثبيت أي مكتبات إضافية - كل شيء موجود بالفعل
