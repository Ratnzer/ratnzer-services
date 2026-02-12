# Debug APK Crash Guide (Early Startup + Forced Snapshot Export)

تمت إضافة آلية أقوى للأجهزة التي قد لا تُظهر ملف السجل بسهولة (مثل بعض أجهزة MIUI):

## ماذا يحدث الآن تلقائيًا؟

1. عند بدء العملية (قبل أي Activity) عبر `EarlyStartupProvider`:
   - يتم تسجيل Startup Marker.
   - يتم تنفيذ **Forced Snapshot Export** فورًا.
2. يتم تصدير ملفين عامّين إلى الذاكرة المشتركة (مع fallback):
   - `/sdcard/RatnzerDebug/startup-debug.log`
   - `/sdcard/RatnzerDebug/startup-debug-snapshot.txt`
3. إذا فشل `/sdcard`، يتم fallback إلى:
   - `Downloads/RatnzerDebug/startup-debug.log`
   - `Downloads/RatnzerDebug/startup-debug-snapshot.txt`

بهذا حتى لو انهار التطبيق مبكرًا جدًا، غالبًا ستحصل على Snapshot للحالة قبل الكراش.

## محتوى الملفات

- `startup-debug.log`: سطور Marker/Crash ورسائل التشخيص.
- `startup-debug-snapshot.txt`: لقطة حالة كاملة تتضمن:
  - آخر Crash مخزن
  - Startup Trace
  - سبب إنشاء اللقطة (reason)

## بناء نسخة Debug

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## أين أجد الملفات على الهاتف؟

1. جرّب أولًا:
   - `/sdcard/RatnzerDebug/startup-debug.log`
   - `/sdcard/RatnzerDebug/startup-debug-snapshot.txt`
2. fallback:
   - `Downloads/RatnzerDebug/startup-debug.log`
   - `Downloads/RatnzerDebug/startup-debug-snapshot.txt`

## قراءة Logcat (اختياري عند توفر ADB)

```bash
adb logcat -v time -s EarlyStartupProvider RatnzerApplication StartupDiagnostics MainActivity AndroidRuntime Capacitor
```

## طريقة التشخيص السريعة بدون كمبيوتر

1. ثبّت `app-debug.apk`.
2. افتح التطبيق (إذا انهار فورًا، أعد فتحه مرة).
3. افتح الملفين أعلاه في مدير الملفات.
4. أرسل محتواهما (أو آخر 100 سطر من `startup-debug.log`) للتحليل.
