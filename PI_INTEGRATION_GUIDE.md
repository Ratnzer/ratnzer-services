# دليل تكامل Pi Network SDK

## نظرة عامة

تم تكامل تطبيق Ratnzer Services مع **Pi Network SDK** لتمكين تسجيل الدخول الآمن عبر حسابات Pi Network. يوفر هذا التكامل للمستخدمين خياراً إضافياً لتسجيل الدخول بجانب Google و Facebook.

---

## المميزات المضافة

### 1. **تسجيل الدخول عبر Pi Network**
- زر جديد في صفحة تسجيل الدخول بجانب Google و Facebook
- المصادقة الآمنة عبر Pi Browser
- إنشاء حساب تلقائي للمستخدمين الجدد

### 2. **الملفات المعدلة والمضافة**

#### الملفات الجديدة:
- `src/services/pi.ts` - خدمة Pi SDK للمصادقة والتهيئة
- `server/routes/piAuthRoutes.js` - مسار تسجيل دخول Pi في الخادم

#### الملفات المعدلة:
- `index.html` - إضافة سكريبت Pi SDK
- `src/services/api.ts` - إضافة دالة `piLogin`
- `src/components/LoginModal.tsx` - إضافة زر Pi وتعديل الشبكة
- `server/index.cjs` - تسجيل مسار Pi Auth

---

## خطوات التثبيت والتفعيل

### الخطوة 1: تسجيل التطبيق في Pi Developer Portal

1. اذهب إلى [Pi Developer Portal](https://developers.minepi.com/)
2. قم بتسجيل دخول أو إنشاء حساب جديد
3. انقر على "Create New App"
4. أدخل معلومات التطبيق:
   - **App Name**: Ratnzer Services
   - **App ID**: استخدم المعرف المعطى: `b33d8f279a2d5d02`
   - **Redirect URL**: `https://yourdomain.com/callback` (أو `http://localhost:3000` للاختبار)

### الخطوة 2: تكوين متغيرات البيئة (اختياري)

إذا كنت تريد استخدام وضع الإنتاج بدلاً من وضع الرمل (Sandbox)، قم بتعديل `src/services/pi.ts`:

```typescript
window.Pi.init({
  version: '2.0',
  sandbox: false, // تغيير من true إلى false
});
```

### الخطوة 3: اختبار التكامل

#### اختبار محلي:
```bash
# تثبيت المتطلبات
npm install
npm run dev

# الخادم
cd server
npm install
npm run dev
```

#### اختبار في Pi Browser:
1. افتح تطبيقك في Pi Browser
2. انقر على زر "باي" في صفحة تسجيل الدخول
3. سيتم إعادة توجيهك إلى Pi Network للمصادقة
4. بعد الموافقة، سيتم إنشاء حساب جديد أو تسجيل دخول تلقائي

---

## معلومات تقنية

### معرف التطبيق (App ID)
```
b33d8f279a2d5d02
```

### نقاط النهاية (API Endpoints)

#### تسجيل دخول Pi
```
POST /api/auth/pi
```

**متطلبات الجسم:**
```json
{
  "username": "string",
  "uid": "string",
  "accessToken": "string"
}
```

**الاستجابة الناجحة:**
```json
{
  "id": "user_id",
  "name": "username",
  "email": "uid@pi.network",
  "phone": null,
  "preferredCurrency": "USD",
  "balance": 0.0,
  "role": "user",
  "status": "active",
  "token": "jwt_token"
}
```

### آلية العمل

1. **المصادقة في الواجهة الأمامية:**
   - يقوم `authenticateWithPi()` بطلب المصادقة من Pi SDK
   - يتم الحصول على `username`, `uid`, و `accessToken`

2. **التحقق في الخادم:**
   - يتم إرسال البيانات إلى `/api/auth/pi`
   - يتم البحث عن المستخدم بناءً على `uid@pi.network`
   - إذا لم يكن موجوداً، يتم إنشاء حساب جديد تلقائياً
   - يتم إرجاع رمز JWT للمصادقة

3. **تخزين الرمز:**
   - يتم حفظ رمز JWT في `localStorage` تحت مفتاح `token`
   - يتم استخدام الرمز في جميع الطلبات اللاحقة

---

## معالجة الأخطاء

### الأخطاء الشائعة:

#### 1. "Pi SDK غير محمّل"
**السبب:** لم يتم تحميل سكريبت Pi SDK بعد
**الحل:** تأكد من وجود السطر التالي في `index.html`:
```html
<script src="https://sdk.minepi.com/pi-sdk.js"></script>
```

#### 2. "فشل تسجيل الدخول عبر Pi Network"
**السبب:** قد يكون هناك مشكلة في الاتصال بـ Pi Network
**الحل:** 
- تحقق من الاتصال بالإنترنت
- تأكد من أن التطبيق يعمل في Pi Browser أو في بيئة الرمل
- تحقق من معرف التطبيق (App ID)

#### 3. "خطأ 401 - رمز الدخول لا يطابق موفر"
**السبب:** قد يكون هناك مشكلة في التحقق من الرمز
**الحل:** تأكد من أن `accessToken` صحيح وسارٍ

---

## الميزات المستقبلية

يمكن توسيع التكامل ليشمل:

1. **الدفعات عبر Pi Network (U2A و A2U)**
   - السماح للمستخدمين بالدفع باستخدام Pi
   - إرسال مكافآت للمستخدمين بـ Pi

2. **ربط المحفظة**
   - عرض رصيد Pi للمستخدم
   - تحويل الأموال

3. **التحقق من الهوية المتقدم**
   - طلب صلاحيات إضافية من Pi Network
   - الوصول إلى بيانات المستخدم الإضافية

---

## الموارد الإضافية

- [توثيق Pi SDK الرسمية](https://pi-apps.github.io/pi-sdk-docs/)
- [Pi Developer Portal](https://developers.minepi.com/)
- [Pi Network Community](https://minepi.com/)
- [مثال تطبيق Pi Demo](https://github.com/pi-apps/pi-demo-app)

---

## الدعم والمساعدة

إذا واجهت أي مشاكل أو لديك أسئلة:

1. تحقق من [توثيق Pi SDK](https://pi-apps.github.io/pi-sdk-docs/)
2. اطلب المساعدة في [مجتمع Pi Network](https://minepi.com/)
3. راجع ملفات السجل (Console) في المتصفح للأخطاء التفصيلية

---

## ملاحظات مهمة

- ✅ تم تفعيل وضع الرمل (Sandbox) افتراضياً للاختبار
- ✅ يتم إنشاء حسابات جديدة تلقائياً عند أول تسجيل دخول
- ✅ البريد الإلكتروني الفريد: `{uid}@pi.network`
- ✅ جميع حسابات Pi تبدأ برصيد 0.0
- ✅ يمكن تغيير بيانات الملف الشخصي لاحقاً

---

**آخر تحديث:** مارس 2026
**الإصدار:** 1.0.0
