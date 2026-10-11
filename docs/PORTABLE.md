# Rugby Portable — chiqarish holati

Sana: 2026-10-03. Manba versiyasi: 1.1.0-preview.2.

## Joriy imzosiz preview.2

Foydalanuvchi sertifikatsiz variantni so'ragani uchun yangi portable qayta
yig'ildi. `Rugby-Portable.exe` ichida barcha zarur runtime fayllari bor.
Paket hajmi 65 529 675 bayt; SHA256 va tekshiruvlar `PORTABLE-BUILD.json` da.
Asboblar paneli tuzatishi shu EXE ichiga kiritildi.

Agar Windows **SmartScreen** oynasida **More info / Подробнее** va keyin
**Run anyway / Выполнить в любом случае** taklif qilsa, foydalanuvchi tanlashi
mumkin. Bu tanlov Windows siyosati tomonidan cheklanishi mumkin.
**Smart App Control** blokida bunday per-app ruxsat yo'q. Dasturni qayta
yig'ish bu himoyani SmartScreen oynasiga aylantirmaydi. Yangi EXE imzosiz;
Windowsda sinalmagan va SAC bilan mosligi kafolatlanmagan.

Imzosiz preview uchun foydalanuvchi aniq ruxsat berdi. Windows himoya
sozlamalari, registry yoki yuklab olingan fayl belgilarini o'zgartirish
qo'shilmadi. Imzolangan reliz talabi o'z alohida build yo'lida saqlanadi.

## Windowsda ochilmagan oldingi preview.1 nusxa

Foydalanuvchi yuborgan rasmda Windows Smart App Control nashriyotchini
tekshira olmagani uchun dasturni bloklagan. Avval berilgan portable launcher
va uning ichidagi Rugby.exe PE fayllarida Authenticode sertifikat jadvali yo'q
(security directory offset=0, size=0). Bu rasmda ko'rsatilgan muammo dastur
oynasi ochilishidan oldingi ishonch tekshiruvidir.

Avvalgi EXE: 83 918 236 bayt, SHA256:
`77a58e4820e8c830f6b33f41ec9943b932240cad7083f380bb4e25b5130b2ff6`.
Eski baytlar oldingi fayl versiyasida saqlanadi. Preview.2 yangi dastur kodi
bilan yig'ildi; raqamli imzo muammosi tuzatilgan deb taqdim etilmaydi.

Microsoft ko'rsatmasiga ko'ra, Smart App Control uchun ishonchli provayder
bergan haqiqiy kod imzosi kerak. Ilovani imzolagandan keyin ham yakuniy
launcher va barcha ichki bajariladigan qismlarni Windowsda sinash lozim.
Hozir sertifikat yoki imzolash xizmatiga kirish hamda native Windows sinov
muhiti mavjud emas. Linuxdagi muvaffaqiyatli test bu talablarni almashtirmaydi.

Manbalar (2026-10-03 tekshirildi):
- https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control
- https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/test-your-app-with-smart-app-control

## Tayyorlangan chiqarish yo'li

`package-lock.json`: Electron 31.7.7, electron-builder 24.13.3, Playwright 1.62.1.

Windowsdagi ishlab chiquvchi kompyuterida ishonchli kod imzolash sertifikati
yoki signing hook oldindan sozlanadi. Sertifikat, parol va tokenlarni manba
kodga yoki chatga joylamang. Builder qo'llaydigan `CSC_LINK`/`WIN_CSC_LINK`,
Windows sertifikat omboridagi tanlangan sertifikat yoki `build.win.sign`
hook orqali sozlash mumkin. Mahalliy o'z-o'zidan imzolangan sertifikat
Smart App Control uchun ishonchli nashriyotchini tasdiqlamaydi.

```bash
npm ci
npm run dist:portable
```

`scripts/release-portable.cjs` ketma-ket:

1. Windows host va imzolash sozlamasi mavjudligini tekshiradi.
2. Sintaksis, regressiya va haqiqiy Electron grafik testlarini bajaradi.
3. `forceCodeSigning=true`, `signAndEditExecutable=true`, `signDlls=true`
   bilan Windows x64 portable yig'adi.
4. `scripts/verify-windows-signatures.ps1` orqali tashqi EXE va
   `dist/win-unpacked` ichidagi har bir EXE/DLL imzosi va timestamp'ini tekshiradi.
   Yetishmagan yoki Windowsda yaroqsiz imzo relizni xato bilan to'xtatadi.

Qurish natijasi `dist/Rugby-Portable.exe`. Bu hali Smart App Control sinovi
o'tganini anglatmaydi. Keyingi qabul sinovi: tayyor EXE'ni Smart App Control
yoqilgan Windows 11 kompyuterga oddiy yuklab olish yo'li bilan olib o'tish,
ikki marta bosib ochish va `docs/TESTING.md` dagi funksiyalarni tekshirish.
Natijani EXE SHA256'i, Windows versiyasi va tekshiruv sanasi bilan yozib qo'yish
kerak. Blok bo'lsa, CodeIntegrity / Operational jurnalidagi 3077 hodisasi
qaysi ichki fayl tekshiruvdan o'tmaganini aniqlashga yordam beradi.

`INSTALLER-QURISH.bat` endi shu imzolangan portable yo'lini chaqiradi.
Bu ishlab chiquvchi yordamchisi; oddiy foydalanuvchiga yakuniy bitta EXE beriladi.
`dist`/`dist:both` eski installer build buyruqlaridir: ular ham standart
`forceCodeSigning` talabiga bo'ysunadi, ammo portable chiqarish tekshiruvining
o'rnini bosmaydi.

## Faqat development uchun imzosiz build

Linuxda imzosiz qadoqlash kerak bo'lsa:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:unsigned:linux
```

Natija `dist/Rugby-Unsigned-Dev.exe`; bu foydalanuvchidagi Windows blokining
yechimi emas. Joriy so'rovda shu yo'l bilan preview.2 qurildi va foydalanuvchi
uchun o'sha baytlar `Rugby-Portable.exe` nomi bilan taqdim etildi.
`patch-exe.js` faqat PE ikona/versiya resurslarini yozadi, raqamli imzo yaratmaydi.

## Portable xulqi

Paket ichida Electron Windows x64 runtime va ilova bor. NSIS portable
launcher qismlarni vaqtinchalik papkaga ochib ishga tushiradi. Alohida Node.js,
avvalgi Rugby yoki o'rnatish oynasi kerak emas. Ochilish tezligi disk va
antivirusga bog'liq; nol kutish kafolatlanmaydi. Splash minimumi 250 ms.
Launcher oddiy foydalanuvchi huquqida ishlaydi.

Sozlamalar va hotkeylar Rugby foydalanuvchi profilida saqlanadi, EXE yonida emas.
Ctrl+S dagi joy tanlash loyiha fayliga tegishli. v2 loyiha eski Rugby bilan mos
emas. Imzo blokini tuzatish bu format qoidasini o'zgartirmaydi.
