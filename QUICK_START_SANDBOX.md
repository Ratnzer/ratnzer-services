# 🚀 البدء السريع - Sandbox vs Mainnet

## ⚡ التبديل السريع بين البيئات

### الخيار 1: تشغيل Sandbox (الاختبار)

```bash
# 1. تشغيل Frontend
cd ratnzer-services
export REACT_APP_SANDBOX=true
npm run dev

# 2. في نافذة أخرى، تشغيل Backend
cd server
export SANDBOX_MODE=true
npm start

# 3. فتح المتصفح
# http://localhost:5173/?sandbox=true
```

**النتيجة المتوقعة:**
- ✅ Pi SDK يحمل من `https://sandbox.minepi.com/pi-sdk.js`
- ✅ API يتصل بـ `https://sandbox.minepi.com/api`
- ✅ الدفع يعمل على بيئة الاختبار

---

### الخيار 2: تشغيل Mainnet (الإنتاج)

```bash
# 1. تشغيل Frontend
cd ratnzer-services
export REACT_APP_SANDBOX=false
npm run dev

# 2. في نافذة أخرى، تشغيل Backend
cd server
export SANDBOX_MODE=false
npm start

# 3. فتح المتصفح
# http://localhost:5173
```

**النتيجة المتوقعة:**
- ✅ Pi SDK يحمل من `https://sdk.minepi.com/pi-sdk.js`
- ✅ API يتصل بـ `https://api.minepi.com`
- ✅ الدفع يعمل على الشبكة الحقيقية

---

## 📝 ملف .env (اختياري)

إذا أردت تجنب تعيين المتغيرات في كل مرة، أنشئ ملف `.env`:

```env
# Frontend
REACT_APP_SANDBOX=true

# Backend
SANDBOX_MODE=true
```

ثم شغّل مباشرة:
```bash
npm run dev
```

---

## 🔍 التحقق من البيئة الحالية

### في Console (Frontend)

```javascript
// تحقق من البيئة
console.log(window.location.search);

// أو استخدم الأداة المدمجة
import { isSandbox } from './config/environment';
console.log(isSandbox ? '🧪 Sandbox' : '🚀 Mainnet');
```

### في Server Logs (Backend)

ستشاهد رسالة عند بدء الخادم:
```
🌍 Backend يعمل على بيئة: 🧪 Sandbox (الاختبار)
```

---

## 🧪 اختبار سريع

### 1. تسجيل الدخول عبر Pi
- اضغط على "تسجيل الدخول"
- اختر "Pi Network"
- يجب أن يفتح نافذة Pi (Sandbox أو Mainnet حسب البيئة)

### 2. اختبار الدفع
- أضف منتج للسلة
- اضغط "دفع"
- يجب أن يتوجه إلى صفحة الدفع (Sandbox أو Mainnet)

### 3. التحقق من API
```bash
# للـ Sandbox
curl http://localhost:5000/api/health

# يجب أن تحصل على:
# {"status":"ok"}
```

---

## 📊 الفروقات الرئيسية

| الميزة | Sandbox | Mainnet |
|--------|---------|---------|
| **الهدف** | اختبار | إنتاج حقيقي |
| **Pi SDK** | sandbox.minepi.com | sdk.minepi.com |
| **API** | sandbox.minepi.com/api | api.minepi.com |
| **الأموال** | وهمية | حقيقية |
| **الخطر** | آمن | حقيقي |

---

## ⚠️ نصائح مهمة

1. **استخدم Sandbox للاختبار دائماً قبل الإنتاج**
2. **لا تشارك مفاتيح API الحقيقية في الكود**
3. **تأكد من تغيير البيئة قبل النشر**
4. **احفظ السجلات (Logs) للتحقق من الأخطاء**

---

## 🆘 استكشاف الأخطاء السريع

| المشكلة | الحل |
|--------|------|
| Pi SDK لم يحمل | تحقق من `console.log` في المتصفح |
| API غير متاح | تأكد من أن Backend يعمل (`npm start`) |
| الدفع لا يعمل | تحقق من متغيرات البيئة |
| خطأ في المصادقة | امسح localStorage وأعد المحاولة |

---

## 📞 الدعم

للمزيد من التفاصيل، اقرأ: [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)

---

**تم التحديث:** مارس 2026 ✅
