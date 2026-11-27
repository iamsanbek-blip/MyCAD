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
  '- Modeling: furnitura va teshiklar (Alt+F) — yevrovint, ekssentrik, shkant, polkaderjatel, petlya, ruchka, orqa devor pazi; ship-paz (metallsiz, dogbone).\n' +
  '- Furnitura asbobi (J): ulanish chizig\'ini bosib tur berish; ekssentrik o\'yig\'ini ikkinchi yuzaga o\'tkazish; panel o\'zgarsa teshiklar avtomatik moslashadi.\n' +
  '- Teshikli DXF (R12, qatlam nomida Ø va chuqurlik), teshiklar CSV; CNC\'ga yuborish — nesting sahifasi, detal teshiklari bilan guruh.\n' +
  '- Detal raqami va A4 stiker birkalar (Cnc ▸ Birkalar); narx (smeta) paneli; guruh, massiv, teng taqsimlash.\n' +
  '- Panelni 2 marta bosib Drawing\'da tahrirlash (qo\'shni panellar izi bilan); Stretch strelkalari; panel ranglari; kromka qalinliksiz ko\'rinish.\n' +
  '- J asbobida ulanishlarni ramka bilan tanlash («Yo\'q» — hammasini olib tashlash); material bo\'yicha list o\'lchami (narx, list hisobi, CNC); panel tanlanganda materiali; smart takliflar ro\'yxati panel siljiganda yopilmaydi.\n\n' +
  '- Yangi (preview.4): O\'zaro o\'yiq — kesishgan panellarni (qiya ham) bir-biriga kiygizish: yarim-yarim yoki to\'liq o\'tish o\'yig\'i, dogbone; Kesishmalarni tekshirish.\n' +
  '- Erkin burchakda aylantirish (Ctrl — butun gradus), Drawing tahririda kesik va o\'yiq (3D da haqiqiy teshik/chuqurcha), OBJ import — yoysimon va har qanday bir xil qalinlikdagi shakl.\n' +
  '- Nusxa (C) Blender Duplicate kabi; yordamchi chiziq SketchUp kabi (A→B); lineyka magnit turini ko\'rsatadi; g\'ildirak kursorga qarab zoom (2 mm gacha).\n' +
  '- Stretch (W): tanlovsiz ramka hamma panellarga, kesik nuqtalari ham, aniq ushlash; qiya qo\'shni panel izi; furnitura oynasi akkordeon; menyular ekranga sig\'adi.\n\n' +
  '**Imzosiz sinov versiyasi:** SmartScreen tugma ko‘rsatsa, More info → Run anyway. ' +
  'Smart App Control uni bloklashi mumkin; kod imzolash hali hal qilinmagan.\n\n' +
  'Windows Server 2022 muhitida kod testlari, manba va paketlangan dastur GUI sinovi, ' +
  'portable launcherning ochilishi tekshirildi. Windows 10/11, SmartScreen/SAC va haqiqiy ' +
  'fayl tanlash dialoglari uchun qo‘lda qabul sinovi hali kerak. Dalillar: BUILD-REPORT.json; fayl hashi: SHA256.txt.\n\n' +
  'Dastur sozlamalarni foydalanuvchi profilida saqlaydi. Namunani sinash uchun ikki-sahifa.dbe ni yuklab oling.\n');
console.log(`Prepared ${pkg.version}: ${sha256}`);
