# 🌍 دليل إعدادات البيئة (Sandbox / Mainnet)

هذا الدليل يشرح كيفية تكوين تطبيق Ratnzer Services للعمل على بيئة الاختبار (Sandbox) والشبكة الحقيقية (Mainnet) بنفس الكود.

## 📋 المحتويات

1. [نظرة عامة](#نظرة-عامة)
2. [الملفات الجديدة](#الملفات-الجديدة)
3. [كيفية التبديل بين البيئات](#كيفية-التبديل-بين-البيئات)
4. [متغيرات البيئة](#متغيرات-البيئة)
5. [اختبار التطبيق](#اختبار-التطبيق)
6. [النشر على الإنتاج](#النشر-على-الإنتاج)

---

## 🎯 نظرة عامة

تم تحديث التطبيق ليدعم بيئتين:

| الميزة | Sandbox (الاختبار) | Mainnet (الإنتاج) |
|--------|------------------|------------------|
| **Pi SDK URL** | `https://sandbox.minepi.com/pi-sdk.js` | `https://sdk.minepi.com/pi-sdk.js` |
| **Pi API URL** | `https://sandbox.minepi.com/api` | `https://api.minepi.com` |
| **App URL** | `https://sandbox.minepi.com/app/ratnzer-services` | `https://www.ratnzer.com` |
| **الغرض** | اختبار الميزات | الاستخدام الحقيقي |

---

## 📁 الملفات الجديدة

### Frontend

#### `src/config/environment.ts`
ملف الإعدادات المركزي للـ Frontend يحتوي على:
- إعدادات Pi Network SDK
- روابط التطبيق
- روابط API
- إعدادات الدفع
- إعدادات اللغة والعملات

**الاستخدام:**
```typescript
import { isSandbox, PI_CONFIG, API_URLS, APP_URLS } from './config/environment';

// التحقق من البيئة
if (isSandbox) {
  console.log('🧪 نحن في بيئة الاختبار');
} else {
  console.log('🚀 نحن في بيئة الإنتاج');
}

// استخدام الروابط الديناميكية
const apiUrl = API_URLS.base;
const appUrl = APP_URLS.main;
```

### Backend

#### `server/config/environment.js`
ملف الإعدادات المركزي للـ Backend يحتوي على:
- إعدادات Pi Network
- روابط التطبيق
- إعدادات الدفع
- إعدادات قاعدة البيانات
- إعدادات الأمان

**الاستخدام:**
```javascript
const { isSandbox, PI_CONFIG, APP_URLS, PAYMENT_CONFIG } = require('./config/environment');

// التحقق من البيئة
if (isSandbox) {
  console.log('🧪 Backend في بيئة الاختبار');
}

// استخدام Pi API الديناميكي
const piUrl = PI_CONFIG.apiUrl;
```

---

## 🔄 كيفية التبديل بين البيئات

### الطريقة 1: متغيرات البيئة (الموصى بها)

#### للـ Frontend:
```bash
# لتشغيل Sandbox
export REACT_APP_SANDBOX=true
npm run dev

# لتشغيل Mainnet
export REACT_APP_SANDBOX=false
npm run dev
```

#### للـ Backend:
```bash
# لتشغيل Sandbox
export SANDBOX_MODE=true
npm start

# لتشغيل Mainnet
export SANDBOX_MODE=false
npm start
```

### الطريقة 2: ملف .env

أضف إلى ملف `.env`:

```env
# Frontend
REACT_APP_SANDBOX=true

# Backend
SANDBOX_MODE=true
```

### الطريقة 3: Query Parameter (للـ Frontend فقط)

```
https://localhost:5173/?sandbox=true
```

### الطريقة 4: localStorage (للـ Frontend فقط)

في Console:
```javascript
localStorage.setItem('RATNZER_SANDBOX', 'true');
location.reload();
```

---

## 🔐 متغيرات البيئة

### متغيرات Pi Network

```env
# مفتاح API (من Pi Developer Portal)
PI_API_KEY=your_pi_api_key_here

# معرّف التطبيق
PI_APP_ID=-b33d8f279a2d5d02

# روابط API (يتم اختيارها تلقائياً حسب البيئة)
PI_SANDBOX_API_URL=https://sandbox.minepi.com/api
PI_API_URL=https://api.minepi.com
```

### متغيرات التطبيق

```env
# البيئة
NODE_ENV=development
SANDBOX_MODE=true

# روابط التطبيق
SANDBOX_APP_URL=https://sandbox.minepi.com/app/ratnzer-services
PRODUCTION_APP_URL=https://www.ratnzer.com
```

### متغيرات الدفع

```env
# PayTabs
PAYTABS_SANDBOX_KEY=your_sandbox_key
PAYTABS_PRODUCTION_KEY=your_production_key

# KD1S
KD1S_API_URL=https://kd1s.com/api/v2
KD1S_API_KEY=your_kd1s_api_key
```

---

## 🧪 اختبار التطبيق

### اختبار على Sandbox

#### 1. تشغيل Frontend
```bash
cd ratnzer-services
export REACT_APP_SANDBOX=true
npm run dev
```

#### 2. تشغيل Backend
```bash
cd server
export SANDBOX_MODE=true
npm start
```

#### 3. فتح التطبيق
```
http://localhost:5173/?sandbox=true
```

#### 4. التحقق من Console
يجب أن تشاهد:
```
🌍 تطبيق Ratnzer يعمل على بيئة: 🧪 Sandbox (الاختبار)
🔌 الاتصال بـ API: https://sandbox-api.minepi.com/api
📱 تحميل Pi SDK من: https://sandbox.minepi.com/pi-sdk.js
✅ تم تهيئة Pi SDK بنجاح على بيئة 🧪 Sandbox
```

### اختبار على Mainnet

#### 1. تشغيل Frontend
```bash
cd ratnzer-services
export REACT_APP_SANDBOX=false
npm run dev
```

#### 2. تشغيل Backend
```bash
cd server
export SANDBOX_MODE=false
npm start
```

#### 3. فتح التطبيق
```
http://localhost:5173
```

#### 4. التحقق من Console
يجب أن تشاهد:
```
🌍 تطبيق Ratnzer يعمل على بيئة: 🚀 Mainnet (الإنتاج)
🔌 الاتصال بـ API: https://ratnzer-services-bb0a0cce4837.herokuapp.com/api
📱 تحميل Pi SDK من: https://sdk.minepi.com/pi-sdk.js
✅ تم تهيئة Pi SDK بنجاح على بيئة 🚀 Mainnet
```

---

## 🚀 النشر على الإنتاج

### قبل النشر

1. **تأكد من الإعدادات:**
   ```bash
   # تحقق من أن SANDBOX_MODE=false
   echo $SANDBOX_MODE
   
   # تحقق من أن REACT_APP_SANDBOX=false
   echo $REACT_APP_SANDBOX
   ```

2. **اختبر جميع الميزات:**
   - تسجيل الدخول عبر Pi Network
   - إرسال واستقبال Pi
   - الدفع عبر PayTabs
   - المحفظة والحركات المالية

3. **تحقق من الروابط:**
   - تأكد من أن جميع الروابط تشير إلى Mainnet
   - تحقق من شهادات SSL

### خطوات النشر

#### 1. بناء Frontend
```bash
cd ratnzer-services
export REACT_APP_SANDBOX=false
npm run build
```

#### 2. بناء Backend
```bash
cd server
export SANDBOX_MODE=false
npm run build
```

#### 3. نشر على Heroku (مثال)
```bash
# تعيين متغيرات البيئة
heroku config:set SANDBOX_MODE=false
heroku config:set REACT_APP_SANDBOX=false

# نشر
git push heroku main
```

#### 4. التحقق من النشر
```bash
# تحقق من السجلات
heroku logs --tail

# اختبر الرابط
curl https://www.ratnzer.com/api/health
```

---

## 📊 مثال على الاستخدام

### في Frontend Component

```typescript
import { isSandbox, API_URLS, APP_URLS } from '../config/environment';

export const PaymentComponent = () => {
  const handlePayment = async () => {
    const apiUrl = API_URLS.base;
    const callbackUrl = APP_URLS.paymentCallback;
    
    console.log(`💳 معالجة الدفع على ${isSandbox ? 'Sandbox' : 'Mainnet'}`);
    
    try {
      const response = await fetch(`${apiUrl}/payments/create`, {
        method: 'POST',
        body: JSON.stringify({
          amount: 100,
          currency: 'USD',
          callbackUrl,
        }),
      });
      
      const data = await response.json();
      console.log('✅ تم إنشاء الدفعة:', data);
    } catch (error) {
      console.error('❌ خطأ في الدفع:', error);
    }
  };
  
  return (
    <button onClick={handlePayment}>
      {isSandbox ? '🧪 دفع على Sandbox' : '🚀 دفع على Mainnet'}
    </button>
  );
};
```

### في Backend Route

```javascript
const { isSandbox, PI_CONFIG, APP_URLS } = require('../config/environment');

router.post('/payments/create', async (req, res) => {
  const { amount, currency } = req.body;
  
  console.log(`💳 إنشاء دفعة على ${isSandbox ? 'Sandbox' : 'Mainnet'}`);
  
  try {
    // استخدام Pi API الديناميكي
    const response = await axios.post(
      `${PI_CONFIG.apiUrl}/v2/payments`,
      {
        amount,
        currency,
        callbackUrl: APP_URLS.paymentCallback,
      },
      {
        headers: {
          'Authorization': `Key ${PI_CONFIG.apiKey}`,
        },
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔧 استكشاف الأخطاء

### المشكلة: التطبيق يتصل بـ Mainnet بدلاً من Sandbox

**الحل:**
```bash
# تحقق من متغيرات البيئة
echo $REACT_APP_SANDBOX
echo $SANDBOX_MODE

# امسح الـ localStorage
localStorage.clear();

# أعد تحميل الصفحة
location.reload();
```

### المشكلة: Pi SDK لم يتم تحميله

**الحل:**
```javascript
// في Console
console.log(window.Pi); // يجب أن يكون موجوداً

// تحقق من رابط SDK
console.log(document.querySelector('#pi-sdk-script').src);
```

### المشكلة: خطأ في الاتصال بـ API

**الحل:**
```bash
# تحقق من أن الخادم يعمل
curl http://localhost:5000/api/health

# تحقق من متغيرات البيئة
env | grep -i sandbox
```

---

## 📚 المراجع

- [توثيق Pi Network SDK](https://pi-apps.github.io/pi-sdk-docs/)
- [Pi Developer Portal](https://developers.minepi.com/)
- [Sandbox Documentation](https://sandbox.minepi.com/)

---

## ✅ قائمة التحقق قبل النشر

- [ ] تم اختبار جميع الميزات على Sandbox
- [ ] تم تغيير `SANDBOX_MODE` إلى `false`
- [ ] تم تغيير `REACT_APP_SANDBOX` إلى `false`
- [ ] تم التحقق من روابط API
- [ ] تم التحقق من شهادات SSL
- [ ] تم اختبار الدفع
- [ ] تم اختبار المصادقة عبر Pi
- [ ] تم مراجعة السجلات (Logs)

---

**آخر تحديث:** مارس 2026

**الإصدار:** 1.0.0
