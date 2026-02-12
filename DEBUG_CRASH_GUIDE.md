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
