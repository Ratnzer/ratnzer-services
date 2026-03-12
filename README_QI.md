# دليل تكامل بوابة Qi (Qi Card Integration Guide)

تم استبدال نظام PayTabs ببوابة دفع **Qi Card** العراقية. يوضح هذا الدليل المتغيرات والمسارات الجديدة.

## 1. المتغيرات البيئية المطلوبة (Environment Variables)

يجب إضافة المتغيرات التالية في ملف `.env` الخاص بالسيرفر:

```env
# Qi Gateway Configuration
QI_BASE_URL=https://uat-sandbox-3ds-api.qi.iq  # استخدم رابط الإنتاج عند الإطلاق
QI_TERMINAL_ID=your_terminal_id
QI_USERNAME=your_username
QI_PASSWORD=your_password
QI_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# App URLs
APP_BASE_URL=https://your-api-domain.com
APP_CALLBACK_URL=https://your-api-domain.com/api/payments/qi/callback
```

## 2. المسارات الجديدة (New Routes)

| الوظيفة | المسار (Route) | الطريقة (Method) |
| --- | --- | --- |
| إنشاء دفع جديد | `/api/payments/qi/create` | `POST` |
| استقبال التنبيهات (Webhook) | `/api/payments/qi/callback` | `POST` |
| العودة بعد الدفع | `/api/payments/qi/return` | `GET/POST` |
| فحص حالة الدفع | `/api/payments/qi/status/:paymentId` | `GET` |

## 3. ملاحظات تقنية

- **التحقق من الأمان:** يستخدم النظام خوارزمية **RSA-SHA256** للتحقق من صحة التنبيهات القادمة من Qi عبر الـ Webhook.
- **التوافقية:** تم الإبقاء على مسارات `paytabs` القديمة وتوجيهها داخلياً إلى نظام Qi لضمان عدم تعطل أي إصدارات قديمة من التطبيق.
- **تطبيقات الموبايل:** تم تحديث `capacitor.config.ts` للسماح بالنطاق `*.qi.iq`.

## 4. كيفية الاختبار

1. تأكد من ضبط `QI_BASE_URL` على رابط الـ Sandbox.
2. استخدم بيانات Terminal الاختبارية المزودة من قبل Qi.
3. عند العودة من بوابة الدفع، سيقوم النظام تلقائياً بتحديث حالة الطلب أو شحن المحفظة.
