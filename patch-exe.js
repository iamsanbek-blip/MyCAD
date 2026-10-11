// Rugby.exe ga ikona va versiya ma'lumotlarini yozish.
// Odatda buni rcedit.exe qiladi, lekin u Windows binary — Linux'da Wine kerak.
// resedit sof JavaScript'da PE resurslarini tahrirlaydi, shuning uchun
// Wine'siz ham aynan shu natijani beradi.
const ResEdit = require('resedit');
const fs = require('fs');

const EXE = 'dist/win-unpacked/Rugby.exe';
const ICO = 'build/icon.ico';
const VER = require('./package.json').version;

const exe = ResEdit.NtExecutable.from(fs.readFileSync(EXE));
const res = ResEdit.NtExecutableResource.from(exe);

// --- ikona ---
const icon = ResEdit.Data.IconFile.from(fs.readFileSync(ICO));
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  res.entries, 1, 1033, icon.icons.map(i => i.data)
);

// --- versiya ma'lumotlari (Explorer'da "Свойства" da ko'rinadi) ---
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
const [a, b, c] = VER.split('-')[0].split('.').map(Number);
vi.setFileVersion(a, b, c, 0, 1033);
vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  ProductName:      'Rugby',
  FileDescription:  'Rugby — CNC Corner Editor',
  CompanyName:      'Rugby',
  LegalCopyright:   'Copyright \u00A9 2026 Rugby',
  OriginalFilename: 'Rugby.exe',
  InternalName:     'Rugby',
  ProductVersion:   VER,
  FileVersion:      VER,
});
vi.outputToResourceEntries(res.entries);

res.outputResource(exe);
fs.writeFileSync(EXE, Buffer.from(exe.generate()));
console.log('Rugby.exe: ikona (' + icon.icons.length + ' o\'lcham) va versiya ' + VER + ' yozildi');
