#!/usr/bin/env node

/**
 * سكريبت لتحديث رقم الإصدار في ملف build.gradle للأندرويد
 * يجب تشغيله بعد إنشاء مجلد android
 */

const fs = require('fs');
const path = require('path');

// الحصول على رقم الإصدار من متغير البيئة أو من package.json
const version = process.env.APP_VERSION || require('./package.json').version;

// تحويل الإصدار إلى versionCode (مثال: 3.3.6 -> 30306)
function versionToCode(versionString) {
  const parts = versionString.split('.').map(Number);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;
  return major * 10000 + minor * 100 + patch;
}

const versionCode = versionToCode(version);
const versionName = version;

console.log(`📱 تحديث إصدار Android:`);
console.log(`   versionCode: ${versionCode}`);
console.log(`   versionName: ${versionName}`);

// مسار ملف build.gradle
const buildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');

// التحقق من وجود الملف
if (!fs.existsSync(buildGradlePath)) {
  console.log('⚠️  ملف build.gradle غير موجود بعد. سيتم تحديثه بعد تشغيل cap add android');
  process.exit(0);
}

// قراءة الملف
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

// تحديث versionCode
buildGradle = buildGradle.replace(
  /versionCode\s+\d+/,
  `versionCode ${versionCode}`
);

// تحديث versionName
buildGradle = buildGradle.replace(
  /versionName\s+["'][^"']*["']/,
  `versionName "${versionName}"`
);

// حفظ الملف
fs.writeFileSync(buildGradlePath, buildGradle);
console.log('✅ تم تحديث android/app/build.gradle');
