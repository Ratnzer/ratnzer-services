# تشخيص وحل مشكلة عدم إرسال الطلبات للمزود الخارجي

## ملخص المشكلة

عندما يقوم مستخدم بشراء منتج تم إعداده لـ "التنفيذ عبر API" من خلال "نوع تنفيذ" محدد، لا يتم إرسال الطلب إلى المزود الخارجي. بدلاً من ذلك، يتم التعامل مع الطلب كطلب "يدوي"، مما يتطلب تدخلاً من المسؤول لإكماله.

## تحليل السبب الجذري

بعد فحص الكود في الواجهة الأمامية (Frontend) والخلفية (Backend)، تم تحديد أن السبب الجذري للمشكلة يكمن في **منطق معالجة الطلبات في الخادم (`orderController.js`)**.

الخادم حاليًا يقرأ إعدادات الـ API (`apiConfig`) من **مستوى المنتج الرئيسي فقط**، ويتجاهل تمامًا الإعدادات المخصصة التي تم تعيينها لـ **"نوع التنفيذ" (Execution Method)** المحدد الذي اختاره المستخدم.

### تدفق البيانات الخاطئ

1.  **الواجهة الأمامية (`ProductDetailsModal.tsx` و `App.tsx`):** تقوم الواجهة الأمامية بجمع `executionMethodId` بشكل صحيح وإرساله ضمن بيانات الطلب (`payload`) إلى الخادم.
2.  **الواجهة الخلفية (`orderController.js`):**
    *   يستقبل المتحكم `executionMethodId` ولكنه **لا يستخدمه** لجلب إعدادات الـ API الصحيحة.
    *   بدلاً من ذلك، يقوم بقراءة `apiConfig` من كائن المنتج الرئيسي مباشرةً: `const apiConfig = parseApiConfig(product?.apiConfig);`.
    *   بما أن `apiConfig` على مستوى المنتج الرئيسي غالبًا ما يكون غير معرفًا أو معينًا على `manual`، فإن الشرط الذي يتحقق من ضرورة استدعاء المزود الخارجي (`shouldUseProvider`) لا يتحقق أبدًا.

## الدليل من الكود

| الملف | السطر الإشكالي | الشرح |
| :--- | :--- | :--- |
| `server/controllers/orderController.js` | `const apiConfig = parseApiConfig(product?.apiConfig);` | هنا يتم تحديد إعدادات الـ API بناءً على المنتج فقط، متجاهلاً نوع التنفيذ المختار. |
| `server/controllers/orderController.js` | `const effectiveServiceId = selectedRegion?.apiServiceId \|\| apiConfig?.serviceId;` | هنا يتم محاولة إيجاد `serviceId` من النوع (region) أو من `apiConfig` المنتج، ولكن ليس من نوع التنفيذ. |

## الحل المقترح

لحل هذه المشكلة، يجب تعديل `orderController.js` ليقرأ إعدادات الـ API بالأولوية الصحيحة: **نوع التنفيذ > النوع (المنطقة) > المنتج**.

### خطوات التعديل:

1.  **تحديد `apiConfig` الفعال:**
    يجب تعديل الكود في `orderController.js` لتحديد `apiConfig` الصحيح بناءً على `executionMethodId` المستلم.

2.  **تعديل منطق `shouldUseProvider`:**
    يجب استخدام `apiConfig` الفعال لتحديد ما إذا كان يجب استدعاء المزود الخارجي.

### الكود المقترح للتعديل في `orderController.js`

```javascript
// داخل دالة createOrder، بعد جلب المنتج من قاعدة البيانات

// ...الكود السابق...

const apiConfig = parseApiConfig(product?.apiConfig);
const regions = parseJsonField(product?.regions, []);
const selectedRegion = Array.isArray(regions)
  ? regions.find(r => String(r.id) === String(regionIdNorm))
  : null;

const executionMethods = selectedRegion?.executionMethods || [];
const selectedExecutionMethod = executionMethods.find(em => String(em.id) === String(executionMethodId));

// --- ✨ بداية التعديل المقترح ---

// تحديد إعدادات الـ API الفعالة بالأولوية الصحيحة
const effectiveApiConfig = selectedExecutionMethod?.apiConfig || selectedRegion?.apiConfig || apiConfig;

const effectiveServiceId = effectiveApiConfig?.serviceId;
const effectiveProviderName = effectiveApiConfig?.providerName || 'KD1S';

const shouldUseProvider =
  effectiveApiConfig?.type === 'api' && effectiveServiceId && result.status !== 'completed';

// --- نهاية التعديل المقترح ---

if (shouldUseProvider) {
  try {
    const provider = getProvider(effectiveProviderName);

    const providerOrder = await provider.placeOrder({
      serviceId: effectiveServiceId, // استخدام المعرف الفعال
      link: trimmedCustomInputValue || regionName || productName,
      quantity: normalizedQuantity,
    });

    // ... بقية الكود ...
```

## الخلاصة

المشكلة ناتجة عن عدم قيام الخادم بقراءة إعدادات الـ API من المستوى الصحيح (نوع التنفيذ). بتطبيق التعديل المقترح في `orderController.js`، سيتمكن النظام من تحديد `apiConfig` الصحيح لكل طلب وإرسال الطلبات إلى المزود الخارجي كما هو متوقع.
