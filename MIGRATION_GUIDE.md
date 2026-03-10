# دليل الترقية: Pi SDK من Sandbox إلى Production

## 📋 الملخص
تم تحويل Pi Network SDK من وضع **Sandbox (تجريبي)** إلى وضع **Production (حقيقي)** مع تأمين المفاتيح الحساسة.

---

## 🔄 التعديلات التي تمت

### 1. **Backend - piPaymentRoutes.js**
**التغيير**: نقل `PI_API_KEY` من الكود إلى متغيرات البيئة

**قبل (غير آمن)**:
```javascript
const PI_API_KEY = '38xubrn3ffjlva7azqmzg29q6s7xynoug8ix0rt2am2ewmnlgjfoqodrzm0kqzr5';
const PI_API_URL = 'https://api.minepi.com';
```

**بعد (آمن)**:
```javascript
const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_URL = process.env.PI_API_URL || 'https://api.minepi.com';

if (!PI_API_KEY) {
  console.warn('⚠️ تحذير: PI_API_KEY غير محدد في متغيرات البيئة. عمليات Pi لن تعمل.');
}
```

### 2. **.env.example**
**التغيير**: إضافة متغيرات Pi API

```env
# --- Pi Network Integration ---
PI_API_KEY=your_pi_api_key_here
PI_API_URL=https://api.minepi.com
```

### 3. **.env (محلي)**
**التغيير**: إضافة المفتاح الحقيقي (Production)

```env
# --- Pi Network Integration (PRODUCTION) ---
PI_API_KEY=jcbs7d1hrkrh7hswdqy4k8cac3hq4rkflhpksf89hkzvt6u2xvu0etgguvf2vqnw
PI_API_URL=https://api.minepi.com
```

---

## ✅ ما تم التحقق منه

| المكون | الحالة | الملاحظات |
|-------|--------|---------|
| Frontend SDK | ✅ Production | `https://sdk.minepi.com/pi-sdk.js` |
| Frontend Init | ✅ Production | `sandbox: false` في `App.tsx` |
| Backend API | ✅ Production | يستخدم `https://api.minepi.com` |
| API Key | ✅ آمن | محفوظ في متغيرات البيئة |
| Auth Routes | ✅ Production | تسجيل دخول صحيح |

---

## 🚀 خطوات النشر

### 1. **في البيئة المحلية (Development)**
```bash
# المفتاح موجود بالفعل في .env
npm install
npm run dev
```

### 2. **في Heroku (Production)**
```bash
# أضف متغير البيئة
heroku config:set PI_API_KEY=jcbs7d1hrkrh7hswdqy4k8cac3hq4rkflhpksf89hkzvt6u2xvu0etgguvf2vqnw

# أو عبر Heroku Dashboard
# Settings → Config Vars → PI_API_KEY
```

### 3. **في أي خادم آخر**
```bash
# أضف المتغيرات في ملف .env
export PI_API_KEY=jcbs7d1hrkrh7hswdqy4k8cac3hq4rkflhpksf89hkzvt6u2xvu0etgguvf2vqnw
export PI_API_URL=https://api.minepi.com
```

---

## ⚠️ ملاحظات أمنية مهمة

1. **لا تضع المفتاح في الكود أبداً** - استخدم متغيرات البيئة فقط
2. **لا تشارك ملف .env** - أضفه إلى `.gitignore` (موجود بالفعل)
3. **غيّر المفتاح إذا تم تسريبه** - من لوحة تحكم Pi Developer
4. **استخدم `.env.example`** - لتوثيق المتغيرات المطلوبة

---

## 🔍 اختبار التعديلات

### 1. تحقق من أن المفتاح يُقرأ بشكل صحيح
```bash
node -e "require('dotenv').config(); console.log('PI_API_KEY:', process.env.PI_API_KEY ? '✅ محدد' : '❌ غير محدد')"
```

### 2. اختبر عملية الدفع
```bash
# قم بعملية شراء تجريبية عبر Pi Network
# يجب أن تعمل بدون أخطاء 401 (Unauthorized)
```

### 3. تحقق من السجلات
```bash
# ابحث عن رسائل الخطأ المتعلقة بـ Pi
heroku logs --tail | grep -i pi
```

---

## 📝 الملفات المعدلة

- ✅ `server/routes/piPaymentRoutes.js` - نقل المفتاح إلى متغيرات البيئة
- ✅ `.env.example` - إضافة متغيرات Pi
- ✅ `.env` - المفتاح الحقيقي (محلي فقط)

---

## 🎯 الخطوة التالية

1. اختبر التطبيق محلياً
2. ادفع التعديلات إلى GitHub
3. نشّر على Heroku أو خادمك
4. تحقق من أن عمليات Pi تعمل بشكل صحيح

---

## 📞 الدعم

إذا واجهت مشاكل:
- تحقق من أن `PI_API_KEY` محدد في متغيرات البيئة
- تأكد من أن URL صحيح: `https://api.minepi.com`
- راجع سجلات الخادم للأخطاء التفصيلية
