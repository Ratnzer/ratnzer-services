#!/usr/bin/env node

/**
 * سكريبت لتحديث رقم الإصدار في جميع الملفات المطلوبة
 * يستخدم متغير البيئة APP_VERSION أو يأخذ الإصدار من package.json
 */

const fs = require('fs');
const path = require('path');

// الحصول على رقم الإصدار من متغير البيئة أو من package.json
const version = process.env.APP_VERSION || require('./package.json').version;

console.log(`📦 تحديث رقم الإصدار إلى: ${version}`);

// 1. تحديث package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ تم تحديث package.json');

// 2. تحديث capacitor.config.ts
const capacitorConfigPath = path.join(__dirname, 'capacitor.config.ts');
let capacitorConfig = fs.readFileSync(capacitorConfigPath, 'utf8');

// إضافة version إلى التكوين إذا لم يكن موجوداً
if (!capacitorConfig.includes('version:')) {
  capacitorConfig = capacitorConfig.replace(
    /const config: CapacitorConfig = {/,
    `const config: CapacitorConfig = {\n  version: '${version}',`
  );
} else {
  // تحديث الإصدار الموجود
  capacitorConfig = capacitorConfig.replace(
    /version:\s*['"][^'"]*['"]/,
    `version: '${version}'`
  );
}

fs.writeFileSync(capacitorConfigPath, capacitorConfig);
console.log('✅ تم تحديث capacitor.config.ts');

// 3. إنشاء ملف version.json لاستخدامه في التطبيق
const versionJsonPath = path.join(__dirname, 'src', 'version.json');
const versionJson = {
  version: version,
  buildDate: new Date().toISOString()
};
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n');
console.log('✅ تم إنشاء src/version.json');

console.log('🎉 تم تحديث جميع الملفات بنجاح!');
