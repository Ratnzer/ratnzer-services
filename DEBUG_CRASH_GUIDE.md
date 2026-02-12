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
adb logcat -s MainActivity Capacitor AndroidRuntime
```

إذا حدث كراش لحظي عند الإقلاع، نفّذ الأمر أعلاه ثم افتح التطبيق مباشرة للحصول على السبب الحقيقي.
