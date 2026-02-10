# تحسين معالجة نتائج إعادة التوجيه في App.tsx

## المشكلة الحالية
الكود الحالي يحاول فقط `authService.googleLogin` عند العودة من إعادة التوجيه، مما يعني أنه إذا كان المستخدم قادماً من فيسبوك، ستفشل العملية.

## الحل
تعديل الجزء الخاص بـ `handleRedirectResult` في `src/App.tsx` (حول السطر 363-388) ليحاول مع Google أولاً، وإذا فشل، يحاول مع Facebook.

## الكود المطلوب

استبدل الكود التالي (في `src/App.tsx` حول السطر 363-388):

```typescript
useEffect(() => {
  // ✅ Safe check for web platform only
  const isWeb = Capacitor.getPlatform() === 'web';
  
  if (isWeb) {
    const checkRedirect = async () => {
      try {
        // Double check if handleRedirectResult is available
        if (typeof handleRedirectResult === 'function') {
          const result = await handleRedirectResult();
          if (result?.idToken) {
            // محاولة مع Google أولاً
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

## الفرق الرئيسي

**قبل:**
```typescript
const res = await authService.googleLogin(result.idToken);
```

**بعد:**
```typescript
let res = await authService.googleLogin(result.idToken).catch(() => null);

if (!res) {
  res = await authService.facebookLogin(result.idToken).catch(() => null);
}
```

هذا يضمن أن النظام يحاول مع كلا الخدمتين (Google و Facebook) بنجاح.
