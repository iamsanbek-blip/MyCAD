> Quyidagi batafsil qo‘llanma 2026-10-03 holatini saqlaydi. Joriy yuklab olish
> uchun [README](../README.md), GitHub relizi uchun [yo‘riqnoma](GITHUB-RELEASE.md).

# Rugby Desktop 1.1.0-preview.2

**2026-10-03 holati:** foydalanuvchi so'roviga binoan **imzosiz portable preview.2**
yig'ildi. Tayyor fayl `Rugby-Portable.exe`; ZIP/CMD yoki o'rnatish kerak emas.
SmartScreen ko'rsatsa, More info → Run anyway mavjud bo'lishi mumkin. Bu tugmani
EXE majburan ko'rsata olmaydi. Avvalgi rasmdagi Smart App Control esa yangi EXE'ni
ham bloklashi mumkin. Imzolash masalasi ochiq: `docs/PORTABLE.md`.

Ushbu manbada haqiqiy Electron grafik sinovi va portable chiqarish tekshiruvi
qo'shildi; kichik oynada asboblar panelining yon panelga chiqishi tuzatildi.
Yangi EXE ichidan chiqarilgan app.asar Linux Electron grafik sinovidan o'tdi.
Native Windows ishga tushishi va SmartScreen/SAC xulqi tekshirilmagan.

Windows uchun 2D chizma va CNC burchak tahrirlash dasturi. Bir `.dbe` ichida
bir nechta sahifa, oson almashtiriladigan hotkeylar va sahifaga alohida undo/redo.
Bu sinov relizi: haqiqiy Windows tekshiruvlari `docs/TESTING.md` da ajratilgan.

## Eski source+update paket (tarixiy)

To'liq tarqatish ZIPini oching va `SINOVNI-OCHISH.cmd` ni ikki marta bosing.
Mavjud `Rugby.exe` va `resources/app.asar` joylashgan papka yo'lini kiriting.
Skript mavjud dastur fayllaridan yangi nusxa yaratib, yangi kodni shu nusxaga
joylaydi. Yangi nusxa `%LOCALAPPDATA%/RugbyPreview/1.1.0-preview.1/` ichida bo'ladi.
Asl nusxa saqlanadi. Ikkita Rugby'ni bir vaqtda ishga tushirmang.

ZIP ichida yangi Setup.exe yoki Electron runtime yo'q. Manba koddan installer
qurish quyida. Yangi nusxada `namunalar/ikki-sahifa.dbe` ni ochib boshlash mumkin.
Preview `.dbe` fayllarining tizim assotsiatsiyasini almashtirmaydi.

## Ishlatish

- Pastki paneldagi **+** — yangi sahifa. Nomga ikki marta bosish — nomlash.
  Nusxa olish, chap/o'ng tartiblash va o'chirish tugmalari yonida.
- **Ctrl+PageDown / Ctrl+PageUp** — sahifalar orasida o'tish.
- **Ctrl+S** — barcha sahifalarni bitta `.dbe` ga saqlash; **Ctrl+Shift+S** — boshqa nom.
- **F10** yoki **Hotkey** — buyruqni qidirish, katakka bosib yangi kombinatsiyani
  kiritish, Saqlash. Band kombinatsiya haqida xabar ko'rsatiladi. Bo'shatish va
  Standartga qaytarish mavjud. Sozlama keyingi ishga tushirishda saqlanadi.
- **Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z** — aktiv sahifaning undo/redo tarixi.
- Mirror standart tugmasi **I**. Eski ketma-ket M,I o'rniga bitta kombinatsiya.
- Escape/Enter/Tab va raqamlar chizish hamda kiritish uchun ajratilgan.

Eski v1 `.dbe` bitta sahifa sifatida ochiladi. Saqlash v2 formatda: eski Rugby
v2 faylni to'g'ri ocholmaydi. Birinchi saqlashda **Boshqa nom bilan saqlash** dan
foydalanib, eski loyihangiz nusxasini saqlang. DXF/PNG eksport aktiv sahifaga
tegishli. G-code yaratilmaydi; DXFni keyin CAM dasturiga o'tkazing.

Sahifani o'chirish tasdiqlanadi va undo bilan qaytarilmaydi. Undo tarixi
loyiha fayliga yozilmaydi. Sahifa almashganda yarim transform bekor qilinadi,
kamida ikki nuqtali polyline tugallanadi. Clipboard sahifalar orasida ishlaydi.

## Manba koddan ishga tushirish

Bu fayl joylashgan `rugby-desktop` manba papkasida terminal oching.
Node.js/npm o'rnatilgan bo'lishi kerak. Tekshiruv ushbu ishda Node 24.19.0 da o'tdi.

```bash
npm run check
npm test
npm ci
npm start
```

Dastlabki ikki buyruq internet va node_modules talab qilmaydi. `npm ci`
Electron va builderni yuklaydi. Mavjud package.json dagi Electron 31.x build
bazasi saqlandi; frameworkni yangilash alohida Windows tekshiruvi bilan qilinadi.
`package-lock.json` mavjud. Haqiqiy Electron oynasini avtomatik sinash uchun
`npm run test:electron` ishlating; Linuxda grafik ekran yoki Xvfb kerak.
Bu sinov Windows imzosini yoki Smart App Control'ni tekshirmaydi.

```bash
npm run dist:portable
```

Portable reliz Windows host va ishonchli kod imzosini talab qiladi. Ushbu
shartlarsiz buyruq xato bilan to'xtaydi. Sertifikat sozlanganida natija:
`dist/Rugby-Portable.exe`; tarqatishdan oldin Windows qabul sinovi ham kerak.
Windows build yordamchisi: `INSTALLER-QURISH.bat` (oddiy foydalanuvchi uchun emas).
Faqat kod yangilanishi uchun `npm run pack:update` — `dist/app.asar` va SHA256.

## Kod bilan ishlash

| Kerakli o'zgarish | Boshlanadigan fayl |
|---|---|
| Sahifa maydoni/yangi saqlanadigan xususiyat | app/js/core/document-codec.js, app/js/model/pages.js |
| Buyruq yoki standart hotkey | app/js/ui/shortcuts.js |
| Tugma kombinatsiyasini tekshirish | app/js/core/shortcut-map.js |
| Save/Open/New xulqi | app/js/io/filemanager.js |
| Windows dialogi/disk yozuvi | main.js, desktop/project-files.js |
| Sahifa va hotkey oynasi dizayni | app/index.html, app/css/workspace.css |

Batafsil: `HUJJAT.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/NEXT-STEPS.md`.
Asl 1.0 texnik tavsif `docs/LEGACY-HUJJAT-1.0.md` da tarixiy ma'lumot sifatida qoldi.
