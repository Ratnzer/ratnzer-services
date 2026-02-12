# Debug APK Crash Guide (Early Startup + Auto Export to Downloads)

الآن السجل يتم حفظه تلقائيًا بطريقتين مع كل Marker/Crash:

1. **Internal log** داخل التطبيق: `startup-debug.log`
2. **Public export** في مسار عام مباشر على الذاكرة المشتركة (SD Card shared storage):
   - `/sdcard/RatnzerDebug/startup-debug.log`

   مع fallback إضافي إلى: `Downloads/RatnzerDebug/startup-debug.log` إذا منع الجهاز الكتابة على `/sdcard`.

بهذا يمكنك قراءة Stack Trace + Startup Markers مباشرة من مدير الملفات في الهاتف.

## طبقات التشخيص المضافة

1. `EarlyStartupProvider` يعمل قبل `Application` و`MainActivity` ويضع Startup Markers مبكرًا جدًا.
2. `RatnzerApplication` يثبت `UncaughtExceptionHandler` في `attachBaseContext` و`onCreate`.
3. `RatnzerApplication` يفحص تحميل Classes حرجة في الإقلاع مثل Capacitor/Firebase Plugin ويسجل النتيجة.
4. `MainActivity` يكمل التسجيل ويعرض آخر Crash مخزن مع Startup Trace.
5. كل سجل يتم **تصديره تلقائيًا** إلى ملف عام في Download.

> ملاحظة مهمة: إذا كان الكراش Native قاتل جدًا (مثل SIGSEGV قبل Java bootstrap)، قد لا يتم اعتراضه في Java Handler، لكن AndroidRuntime + Startup Markers داخل ملف Downloads غالبًا يحدد آخر نقطة وصل لها التطبيق.

## بناء نسخة Debug

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

ملف APK:

`android/app/build/outputs/apk/debug/app-debug.apk`

## أين أجد ملف السجل على الهاتف؟

- افتح تطبيق الملفات (File Manager)
- اذهب إلى:

`Downloads/RatnzerDebug/startup-debug.log`

## قراءة Logcat (اختياري عند توفر ADB)

```bash
adb logcat -v time -s EarlyStartupProvider RatnzerApplication StartupDiagnostics MainActivity AndroidRuntime Capacitor
```

## طريقة التشخيص السريعة بدون كمبيوتر

1. ثبّت `app-debug.apk`.
2. افتح التطبيق (إذا انهار فورًا، افتحه مرة ثانية).
3. افتح ملف:
   - `/sdcard/RatnzerDebug/startup-debug.log`
   - أو fallback: `Downloads/RatnzerDebug/startup-debug.log`
4. أرسل محتوى الملف (أو آخر 100 سطر) لتحليل السبب الحقيقي للكراش.
