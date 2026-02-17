#!/usr/bin/env node

/**
 * سكريبت لتحديث رقم الإصدار في جميع الملفات المطلوبة
 * يجلب الإصدار من متغير البيئة APP_VERSION أو من GitHub Releases أو من package.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getLatestReleaseVersion() {
  try {
    // محاولة جلب آخر إصدار من GitHub باستخدام gh CLI
    const latestRelease = execSync('gh release list --limit 1 --json tagName --jq ".[0].tagName"', { encoding: 'utf8' }).trim();
    if (latestRelease) {
      // إزالة حرف 'v' إذا وجد
      return latestRelease.startsWith('v') ? latestRelease.substring(1) : latestRelease;
    }
  } catch (error) {
    // في حال الفشل (مثلاً لا توجد صلاحيات أو لا يوجد Releases)
    return null;
  }
  return null;
}

// 1. الأولوية لمتغير البيئة APP_VERSION
// 2. ثم آخر Release من GitHub
// 3. ثم الإصدار الحالي في package.json
const githubVersion = getLatestReleaseVersion();
const version = process.env.APP_VERSION || githubVersion || require('./package.json').version;

console.log(`📦 تحديث رقم الإصدار إلى: ${version}`);

// 1. تحديث package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = version;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ تم تحديث package.json');

// 2. تحديث capacitor.config.ts
const capacitorConfigPath = path.join(__dirname, 'capacitor.config.ts');
if (fs.existsSync(capacitorConfigPath)) {
  let capacitorConfig = fs.readFileSync(capacitorConfigPath, 'utf8');
  if (!capacitorConfig.includes('version:')) {
    capacitorConfig = capacitorConfig.replace(
      /const config: CapacitorConfig = {/,
      `const config: CapacitorConfig = {\n  version: '${version}',`
    );
  } else {
    capacitorConfig = capacitorConfig.replace(
      /version:\s*['"][^'"]*['"]/,
      `version: '${version}'`
    );
  }
  fs.writeFileSync(capacitorConfigPath, capacitorConfig);
  console.log('✅ تم تحديث capacitor.config.ts');
}

// 3. إنشاء ملف version.json لاستخدامه في التطبيق
const versionJsonDir = path.join(__dirname, 'src');
if (!fs.existsSync(versionJsonDir)) fs.mkdirSync(versionJsonDir, { recursive: true });
const versionJsonPath = path.join(versionJsonDir, 'version.json');
const versionJson = {
  version: version,
  buildDate: new Date().toISOString()
};
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2) + '\n');
console.log('✅ تم إنشاء src/version.json');

console.log('🎉 تم تحديث جميع الملفات بنجاح!');
