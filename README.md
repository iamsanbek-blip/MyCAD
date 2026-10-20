# Rugby 1.1.1-preview.2

Ixcham CNC / Drawing / Modeling ishchi oynasi, universal panel, aniq magnit, ko‘p panelni tanlash/o‘chirish va CSV/TXT/XLSX raskroy eksporti.

- [Qisqa qo‘llanma](docs/QUICKSTART-1.1.1.md)
- [1.1.2 manbalaridan olingan o‘zgarishlar](docs/REVIEW-1.1.2.md)
- [Sinovlar va cheklovlar](docs/TESTING.md)

Windows portable: **Releases → v1.1.1-preview.2 → Rugby-Portable.exe** (faqat Windows tekshiruvlari o‘tgach chiqariladi). Imzosiz preview; Smart App Control bloklashi mumkin. Sozlamalar foydalanuvchi profilida saqlanadi.

Manbadan ishga tushirish: `npm ci`, `npm run build:3d`, `npm start`. Tekshiruv: `npm run check`, `npm test`, `npm run test:3d`. Windows paketlash: `node scripts/build-preview.cjs`; rasmiy imzolangan chiqarish uchun alohida signing gate saqlangan.

Quyida oldingi hujjatlar va loyiha tarixi keltirilgan.

---

# Rugby Web — brauzerda sinash

2D CAD va 3D panellar asl desktop app/ kodidan ishlaydi. O‘rnatish talab qilinmaydi.
Loyihani .dbe faylga saqlang; brauzer yopilishidan oldin saqlash kerak.
Saytdagi tugma korpus namunasini yuklab olmasdan ochadi.

Brauzer build: `node scripts/build-browser.cjs`.
Tekshiruv: `node scripts/check.cjs`, `node scripts/test.cjs`.
3D bundleni qayta yig‘ish: `npm ci` va `npm run build:3d`.
Desktop yig‘ish uchun shu app/ manbasi saqlangan; browser-mode.js Electron’da ishlamaydi.
Hosting shaxsiy: faqat egasi uchun. 3D WebGL2 talab qiladi.

Yangi browser hosting uchun interaktiv GUI QA bajarilmagan; Node testlari
va oldingi Windows GUI dalillari alohida. Windows test natijalari docs/TESTING.md da.

---

# Rugby Desktop — 1.1.1-preview.1

Windows uchun 2D chizma va CNC burchak tahrirlash dasturi. Bir faylda bir nechta
sahifa, almashtiriladigan hotkeylar, DXF, dogbone, T-bone, fillet va chamfer.

## Yuklab olish

**[Rugby-Portable.exe — Windows x64](https://github.com/iamsanbek-blip/MyCAD/releases/download/v1.1.1-preview.1/Rugby-Portable.exe)**

Faylni yuklab oling va ikki marta bosing. O‘rnatish, ZIP ajratish yoki CMD
ishlatish kerak emas. Sozlamalar Windows foydalanuvchi profilida saqlanadi.

Bu **imzosiz sinov versiyasi**. SmartScreen ogohlantirsa va tugma mavjud bo‘lsa:
**More info → Run anyway**. Smart App Control esa uni bloklashi mumkin;
kod imzolash sertifikati hali yo‘q.

[Reliz va SHA256](https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.1-preview.1)
· [Xato haqida yozish](https://github.com/iamsanbek-blip/MyCAD/issues)

## Dastur ko‘rinishi

![Rugby Desktop — mebel chizmasi va o‘lchamlar](docs/images/rugby-preview.png)

**Yangi: 3D modellash** — 48×48 panel shablonlari, 16 mm standart qalinlik,
aniq o‘lchamlar, Ortho/Free va qalinlikni saqlaydigan transformatsiyalar.
[3D qo‘llanma](docs/MODEL3D.md) · [Korpus namunasi](namunalar/korpus-3d.dbe).
Oldingi 1.1.0 versiyalar alohida branch va relizlarda saqlanadi.

## Tez boshlash

- Pastdagi **+** — yangi sahifa; **Ctrl+PageUp / PageDown** — sahifalar orasida o‘tish.
- **Ctrl+S** — barcha sahifalarni bitta `.dbe` fayliga saqlash; **Ctrl+O** — ochish.
- **PNG — hududni belgilash** — chizma ustida to‘rtburchak torting; faqat shu hudud saqlanadi. **Esc** — bekor. Oddiy **PNG** butun chizmani chiqaradi.
- **F10** — hotkeylarni o‘zgartirish; **Ctrl+Z / Ctrl+Y** — bekor qilish/qaytarish.
- [Ikki sahifali namuna](namunalar/ikki-sahifa.dbe) bilan sinab ko‘ring.

Eski loyihalarni avval boshqa nom bilan saqlang. DXF/PNG eksport aktiv sahifaga
tegishli; G-code uchun DXFni CAM dasturiga o‘tkazing.

## Dasturchilar uchun

Node.js 24 bilan: `npm ci`, `npm start`. Tekshirish: `npm run check`, `npm test`.

[Kod tuzilishi](docs/ARCHITECTURE.md) · [Tekshiruvlar](docs/TESTING.md) ·
[Build va reliz](docs/GITHUB-RELEASE.md) · [Batafsil qo‘llanma](docs/DEVELOPMENT.md)

Hozircha ochiq kod litsenziyasi belgilanmagan (`UNLICENSED`).
