'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const pkg = require('../package.json');

assert.equal(process.platform, 'win32', 'Release evidence must come from Windows.');
assert.match(pkg.version, /-preview\./, 'This workflow only publishes preview versions.');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const source = read('verification/source/electron-smoke.json');
const packaged = read('verification/packaged/electron-smoke.json');
const launcher = read('verification/portable-launcher.json');
for (const result of [source, packaged, launcher]) {
  assert.equal(result.status, 'passed');
  assert.equal(result.platform, 'win32');
}
assert.equal(source.appVersion, pkg.version);
assert.equal(packaged.appVersion, pkg.version);
assert.equal(packaged.testedApp, 'packaged Windows executable');
const exe = 'dist/Rugby-Portable.exe';
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(exe)).digest('hex');
assert.equal(launcher.executableSha256, sha256, 'Publish the exact portable launcher that was tested.');
fs.writeFileSync('dist/SHA256.txt', `${sha256}  Rugby-Portable.exe\n`);
fs.writeFileSync('dist/BUILD-REPORT.json', JSON.stringify({
  version: pkg.version, commit: process.env.GITHUB_SHA || null,
  builtAt: new Date().toISOString(), platform: process.platform,
  arch: process.arch, bytes: fs.statSync(exe).size, sha256,
  signature: 'unsigned preview', source, packaged, launcher,
  limitations: ['Native file-dialog selections are mocked in GUI automation.',
    'SmartScreen, Smart App Control and Windows 10/11 user acceptance have not been tested.']
}, null, 2) + '\n');
fs.writeFileSync('dist/RELEASE-NOTES.md', `Windows x64 uchun Rugby ${pkg.version}.\n\n` +
  '**Rugby-Portable.exe** faylini yuklab oling va ikki marta bosing. O‘rnatish, ZIP yoki CMD kerak emas.\n\n' +
  '- Bir .dbe faylida bir nechta sahifa; Ctrl+PageUp / Ctrl+PageDown.\n' +
  '- F10 orqali hotkeylarni almashtirish; Ctrl+S bilan barcha sahifalarni saqlash.\n' +
  '- 2D chizma, DXF va CNC burchak asboblari.\n\n' +
  '**Imzosiz sinov versiyasi:** SmartScreen tugma ko‘rsatsa, More info → Run anyway. ' +
  'Smart App Control uni bloklashi mumkin; kod imzolash hali hal qilinmagan.\n\n' +
  'Windows Server 2022 muhitida kod testlari, manba va paketlangan dastur GUI sinovi, ' +
  'portable launcherning ochilishi tekshirildi. Windows 10/11, SmartScreen/SAC va haqiqiy ' +
  'fayl tanlash dialoglari uchun qo‘lda qabul sinovi hali kerak. Dalillar: BUILD-REPORT.json; fayl hashi: SHA256.txt.\n\n' +
  'Dastur sozlamalarni foydalanuvchi profilida saqlaydi. Namunani sinash uchun ikki-sahifa.dbe ni yuklab oling.\n');
console.log(`Prepared ${pkg.version}: ${sha256}`);
