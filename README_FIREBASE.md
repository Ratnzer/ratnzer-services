# Firebase Auth (Google + Facebook) for Web & Mobile

هذا الدليل يوضح إعداد تسجيل الدخول عبر **Google** و **Facebook** على الويب وتطبيق الهاتف (Capacitor) مع نفس بنية المشروع.

## 1) متغيرات الواجهة الأمامية (Vite)

أنشئ ملف `.env` في جذر المشروع بناءً على `.env.example`:

```bash
cp .env.example .env
```

املأ المتغيرات التالية:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_URL`

> بدون هذه القيم، لن تتم تهيئة Firebase في الويب.

---

## 2) متغيرات الخادم (Firebase Admin)

في `server/.env` استخدم إحدى الطرق التالية:

### الطريقة A (مفضلة في CI)
ضع JSON كامل في `FIREBASE_SERVICE_ACCOUNT`.

### الطريقة B
استخدم:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (مع `\\n` بدل أسطر فعلية)

يمكنك الاعتماد على `server/.env.example` كقالب.

---

## 3) إعداد GitHub Secrets/Variables

### Secrets المطلوبة للبناء والنشر
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `GOOGLE_SERVICES_JSON_B64` (مشفّر Base64 لملف `google-services.json`)

### Variables المقترحة
- `VITE_API_URL` (مثال: `https://ratnzer-services-bb0a0cce4837.herokuapp.com/api`)

---

## 4) إعداد Firebase Console

1. من **Authentication > Sign-in method** فعّل:
   - Google
   - Facebook
2. في **Authentication > Settings > Authorized domains** أضف دومينات المشروع.
3. في إعداد Facebook Provider داخل Firebase:
   - App ID
   - App secret

---

## 5) إعداد Facebook Developer Console

أضف في **Valid OAuth Redirect URIs**:

- `https://<YOUR_FIREBASE_AUTH_DOMAIN>/__/auth/handler`

مثال شائع:

- `https://<project-id>.firebaseapp.com/__/auth/handler`

ولـ Android أضف:
- Package name: `com.ratnzer.app`
- Key hashes (Debug + Release)

---

## 6) إعداد الهاتف (Android / Capacitor)

- تأكد أن `android/app/google-services.json` صحيح لنفس مشروع Firebase.
- تأكد أن `android/app/src/main/res/values/strings.xml` يحتوي:
  - `facebook_app_id`
  - `facebook_client_token`
  - `fb_login_protocol_scheme`
- بعد أي تعديل:

```bash
npm run android:build
```

---

## 7) سلوك تسجيل الدخول المتوقع

- **Google Web**: Popup مع fallback إلى Redirect تلقائياً إذا تم حظر النافذة.
- **Facebook Web**: Redirect مباشرة (أكثر استقراراً مع المتصفحات).
- **Mobile**: Native sign-in عبر Capacitor Firebase Authentication plugin.
- بعد العودة من Redirect في الويب، التطبيق يحدد المزود (Google/Facebook) ويرسل التوكن للمسار المناسب في الخادم.

---

## 8) اختبار سريع

1. شغّل المشروع: `npm run dev`
2. افتح نافذة تسجيل الدخول وجرب Google ثم Facebook.
3. تحقق من توليد JWT في `localStorage` باسم `token`.
4. اختبر على Android بعد `npm run android:build`.
