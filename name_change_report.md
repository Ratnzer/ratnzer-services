# تقرير تغيير اسم الخدمات

**الهدف:** تغيير اسم الخدمات داخل المشروع من "راتلوزن" (Ratluzen) إلى "راتنزر" (Ratnzer).

**تاريخ التقرير:** 25 يناير 2026

**المقدمة:**

تمت مراجعة شاملة لبنية المشروع والملفات المصدرية لتحديد جميع المواضع التي يظهر فيها الاسم القديم "راتلوزن" أو مشتقاته الإنجليزية (Ratluzen, ratelozn). التغيير المطلوب يشمل تحديث النصوص الظاهرة للمستخدم، أسماء الحزم (Package Names)، معرفات التطبيق (App IDs)، وأسماء المتغيرات الداخلية.

**ملخص التغييرات المطلوبة:**

| النوع | الاسم القديم | الاسم الجديد | ملاحظات |
| :--- | :--- | :--- | :--- |
| **العربية** | `راتلوزن` | `راتنزر` | النصوص الظاهرة للمستخدم في الواجهة والوثائق. |
| **الإنجليزية (Proper)** | `Ratluzen` | `Ratnzer` | أسماء الأنظمة والمستخدمين في الواجهة. |
| **الإنجليزية (ID/Package)** | `ratelozn` | `ratnzer` | أسماء الحزم، معرفات التطبيق، ومفاتيح التخزين المحلية. |

---

## الخطوات التفصيلية لتغيير الاسم

يجب تطبيق التغييرات التالية بالترتيب لضمان تحديث جميع مكونات المشروع بشكل صحيح.

### 1. تحديث النصوص الظاهرة للمستخدم والوثائق

يجب تغيير جميع النصوص العربية والإنجليزية الظاهرة للمستخدم في ملفات الواجهة الأمامية (Frontend) وملفات الوثائق.

| الملف | السطر | التغيير المطلوب |
| :--- | :--- | :--- |
| `VERSIONING.md` | 3 | تغيير `تطبيق راتلوزن` إلى `تطبيق راتنزر` |
| `capacitor.config.ts` | 6 | تغيير `appName: 'خدمات راتلوزن'` إلى `appName: 'خدمات راتنزر'` |
| `src/components/InvoiceModal.tsx` | 350 | تغيير `خدمات راتلوزن` إلى `خدمات راتنزر` |
| `src/components/TopHeader.tsx` | 58 | تغيير `خدمات راتلوزن` إلى `خدمات راتنزر` |
| `src/App.tsx` | 2391 | تغيير `Ratluzen Security System` إلى `Ratnzer Security System` |
| `src/components/SupportModal.tsx` | 15 | تغيير `telegramUsername = 'Ratluzen'` إلى `telegramUsername = 'Ratnzer'` |
| `src/pages/Wallet.tsx` | 98 | تغيير `https://t.me/Ratluzen` إلى `https://t.me/Ratnzer` |
| `index.html` | 8 | تغيير `Ratelozn Services App` إلى `Ratnzer Services App` |
| `index.html` | 9 | تغيير `Ratelozn Services` إلى `Ratnzer Services` |

### 2. تحديث أسماء الحزم والمعرفات الداخلية

هذه التغييرات حاسمة لعملية البناء (Build Process) وتحديد التطبيق على المتاجر (App Stores).

| الملف | السطر | التغيير المطلوب |
| :--- | :--- | :--- |
| `package.json` | 2 | تغيير `"name": "ratelozn-services"` إلى `"name": "ratnzer-services"` |
| `package-lock.json` | 2, 8 | تغيير `"name": "ratelozn-services"` إلى `"name": "ratnzer-services"` |
| `server/package.json` | 2 | تغيير `"name": "ratelozn-backend"` إلى `"name": "ratnzer-backend"` |
| `server/package.json` | 4 | تغيير `Ratelozn Services App` إلى `Ratnzer Services App` |
| `metadata.json` | 2 | تغيير `"name": "RateloznServices36"` إلى `"name": "RatnzerServices36"` |
| `server/index.js` | 67, 92 | تغيير `Ratelozn Backend` إلى `Ratnzer Backend` |
| `src/services/localCache.ts` | 12 | تغيير `ratelozn_cache_v1:` إلى `ratnzer_cache_v1:` |
| `src/App.tsx` | 248, 1294, 1314, 1327 | تغيير مفتاح التخزين المحلي `ratelozn_admin_auth` إلى `ratnzer_admin_auth` |

### 3. تحديث معرف التطبيق (App ID)

هذه هي أهم خطوة، حيث أن معرف التطبيق (App ID) فريد ولا يمكن تغييره بسهولة بعد نشر التطبيق.

| الملف | السطر | التغيير المطلوب |
| :--- | :--- | :--- |
| `capacitor.config.ts` | 5 | تغيير `appId: 'com.ratelozn.services'` إلى `appId: 'com.ratnzer.services'` |
| `src/App.tsx` | 1144, 1162 | تغيير مسار الملفات `com.ratelozn.services` إلى `com.ratnzer.services` |

**ملاحظة هامة حول معرف التطبيق (App ID):**
إذا كان التطبيق منشورًا بالفعل على متاجر التطبيقات (Google Play/App Store)، فإن تغيير `appId` يتسبب في اعتبار التطبيق الجديد تطبيقًا مختلفًا تمامًا. لن يتمكن المستخدمون الحاليون من التحديث، وسيتعين عليهم تنزيل التطبيق الجديد. **يجب التفكير مليًا في هذا التغيير.**

### 4. إعادة بناء المشروع (Rebuild)

بعد تطبيق جميع التغييرات في الملفات، يجب حذف مجلدات البناء القديمة وإعادة بناء المشروع بالكامل:

1.  **حذف مجلدات البناء:**
    ```bash
    # حذف مجلدات البناء الخاصة بـ Capacitor
    rm -rf android ios
    # حذف مجلدات node_modules وإعادة تثبيت التبعيات
    rm -rf node_modules
    rm -rf server/node_modules
    ```
2.  **إعادة تثبيت التبعيات:**
    ```bash
    # في المجلد الرئيسي
    pnpm install
    # في مجلد الخادم
    cd server
    pnpm install
    cd ..
    ```
3.  **إعادة إضافة منصات Capacitor:**
    ```bash
    npx cap add android
    npx cap add ios
    ```
4.  **إعادة بناء التطبيق:**
    ```bash
    npm run build
    npx cap sync
    ```

**الخلاصة:**

تغيير اسم الخدمات يتطلب تعديلات في حوالي 8 ملفات رئيسية، مع الأخذ في الاعتبار أن تغيير `appId` هو قرار استراتيجي يؤثر على تحديثات المستخدمين الحاليين. يجب استخدام أدوات البحث والاستبدال الشاملة (مثل VS Code's global search and replace) لتطبيق هذه التغييرات بدقة.
