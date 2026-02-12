# Debug APK Crash Guide (Early Startup)

تمت إضافة طبقة تشخيص أعمق في Native Layer لالتقاط كراشات الإقلاع المبكرة جدًا:

1. `EarlyStartupProvider` يعمل قبل `Application` و`MainActivity` ويضع Startup Markers مبكرًا.
2. `RatnzerApplication` يثبت `UncaughtExceptionHandler` في `attachBaseContext` و`onCreate`.
3. `MainActivity` يكمل التسجيل ويعرض آخر Crash مخزن (مع Startup Trace) عند الفتح التالي.
4. أي خطأ يتم تسجيله داخل `SharedPreferences` + `Logcat` بعلامات:
   - `EarlyStartupProvider`
   - `RatnzerApplication`
   - `StartupDiagnostics`
   - `MainActivity`

> ملاحظة: إذا كان الكراش من نوع Native قاتل جدًا (مثل SIGSEGV داخل مكتبة C/C++ قبل Java bootstrap)، قد لا يمر عبر UncaughtExceptionHandler. لكن Startup Markers تساعدنا نعرف آخر مرحلة وصل لها التطبيق.

## بناء نسخة Debug

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

ملف الـ APK الناتج:

`android/app/build/outputs/apk/debug/app-debug.apk`

## قراءة السجلات من الهاتف (Logcat)

```bash
adb logcat -v time -s EarlyStartupProvider RatnzerApplication StartupDiagnostics MainActivity AndroidRuntime Capacitor
```

## كيف تستخدم التشخيص سريعًا

1. ثبّت `app-debug.apk` على الهاتف.
2. شغّل `adb logcat` بالأمر أعلاه.
3. افتح التطبيق؛ إذا انهار فورًا، أعد فتحه مرة ثانية.
4. في الفتح الثاني، ستظهر نافذة تحتوي آخر Stack Trace + Startup Trace (إن أمكن التقاطهما).
