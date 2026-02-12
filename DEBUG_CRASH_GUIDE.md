# Debug APK Crash Guide (Early Startup + File Logging)

بعد التعديل الأخير، إذا حدث كراش مبكر جدًا قبل ظهور أي واجهة، سيتم تسجيل التفاصيل في:

1. **Logcat** بعلامات:
   - `EarlyStartupProvider`
   - `RatnzerApplication`
   - `StartupDiagnostics`
   - `MainActivity`
2. **ملف سجل داخلي** داخل التطبيق: `startup-debug.log`
   - المسار يظهر تلقائيًا في رسالة الخطأ (عند الفتح التالي) أو في Logcat.

## طبقات التشخيص المضافة

1. `EarlyStartupProvider` يعمل قبل `Application` و`MainActivity` ويضع Startup Markers مبكرًا جدًا.
2. `RatnzerApplication` يثبت `UncaughtExceptionHandler` في `attachBaseContext` و`onCreate`.
3. `RatnzerApplication` يفحص تحميل Classes حرجة في الإقلاع مثل Capacitor/Firebase Plugin ويسجل النتيجة.
4. `MainActivity` يكمل التسجيل ويعرض آخر Crash مخزن مع Startup Trace.

> ملاحظة مهمة: إذا كان الكراش Native قاتل جدًا (مثل SIGSEGV قبل Java bootstrap)، قد لا يتم اعتراضه في Java Handler، لكن Startup Markers + AndroidRuntime logs غالبًا تحدد آخر نقطة وصل لها الإقلاع.

## بناء نسخة Debug

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

ملف APK:

`android/app/build/outputs/apk/debug/app-debug.apk`

## قراءة السجلات من الهاتف (Logcat)

```bash
adb logcat -v time -s EarlyStartupProvider RatnzerApplication StartupDiagnostics MainActivity AndroidRuntime Capacitor
```

## سحب ملف السجل الداخلي من الهاتف

بعد تثبيت نسخة Debug وتشغيل التطبيق:

```bash
adb shell run-as com.ratnzer.app cat files/startup-debug.log
```

(إذا كان `run-as` مدعومًا على الجهاز، سيعرض لك محتوى السجل الكامل.)

## طريقة التشخيص السريعة

1. ثبّت `app-debug.apk`.
2. شغل Logcat بالأمر أعلاه.
3. افتح التطبيق؛ إذا انهار فورًا، افتحه مرة ثانية.
4. خذ:
   - Stack trace من Logcat
   - محتوى `startup-debug.log`
   - Startup Trace الظاهر في النافذة (إن ظهرت)
