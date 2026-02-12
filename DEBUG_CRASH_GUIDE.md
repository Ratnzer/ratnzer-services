# Debug APK Crash Guide

تم إضافة آلية تشخيص للكراش في نسخة **Debug**:

1. في Android (`MainActivity`) يتم تركيب `UncaughtExceptionHandler` في وضع Debug.
2. أي خطأ غير ملتقط أثناء الإقلاع يتم حفظه تلقائيًا في `SharedPreferences`.
3. عند فتح التطبيق مرة أخرى، تظهر نافذة تحتوي آخر Stack Trace.
4. يتم أيضًا تسجيل التفاصيل في Logcat بعلامة `MainActivity`.

## بناء نسخة Debug

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

ملف الـ APK الناتج غالبًا يكون في:

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
