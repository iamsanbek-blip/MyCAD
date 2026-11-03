# Rugby 1.1.2 — Smart kiritish va Avto-nom (2026-11-03)

- **Smart kiritish** (`app/js/ui/smart-input.js`, hamma maydonlarga o'zi ulanadi): oxirgi qiymatlar taklif qilinadi — «ch» → «chap boka», «3» → «3040».
  Tarix maydon turi bo'yicha (nom, raqam, material, izoh, matn), har biridan oxirgi 15 ta (Edit ▸ Smart kiritish… da 5–50, tozalash, o'chirish).
  Tab yoki → — kulrang davomni qabul qilish; ↓/↑ — ro'yxat (bo'sh maydonda ↓ — oxirgi qiymatlar); ro'yxatdan tanlab Enter — qabul + tasdiq; Esc — yopish.
  Oddiy Enter o'zgarmaydi. Nom maydonida lug'at: chap boka, o'ng boka, krisha, dno, polka, oraliq boka, orqa devor, fasad.
- **Avto-nom** (Modeling, Alt+N yoki Object ▸ Avto-nom): korpusni tanlab ro'para ko'rinishda bosing — chap/o'ng boka, oraliq boka 1.., krisha, dno,
  polka 1.. (pastdan), orqa devor, fasad. Bir nechta korpus bo'lsa «A. chap boka», «B. …» (CSV/Excel'da bitta katak, qatorlar korpus bo'yicha guruhlanadi).
  Tanlovsiz — butun sahna korpuslarga o'zi ajratiladi (perpendikulyar detallar yuza bilan tegsa — bitta korpus). Korpusning eski harfi saqlanadi.
- **Chizma sozlamalari eslab qolinadi**: o'lcham matni, aniqlik, birlik, matn balandligi (masalan 70 — har ochilganda qayta kiritilmaydi).
- **O'lcham yozuvi**: aniqlik — eng ko'p o'nlik xona, ortiqcha nollar ko'rsatilmaydi (3040.00 → 3040, 0.01 → 0.01, 12.50 → 12.5); standart 0.00.
  Chizmadagi jonli yozuvlar (masofa, Δ, burchak) ham shunday. Eski fayllardagi o'lchamlar ham nolsiz ko'rinadi.

---

# Rugby 1.1.2 — Modeling aniqligi (2026-11-03)

Batafsil: `docs/PANEL3D-1.1.2.md` («2026-11-03» bo'limi). Tekshiruvlar: `docs/TESTING.md`, `tests/modeling-precision.cjs`.

- **Magnit (3ds Max / Blender kabi)**: nishon kursor ostida qidiriladi (14 px); panelning haqiqiy geometriyasi — profil uchlari, qirra o'rtalari (qalinlik qirralari ham), markazlar, yangi «Qirra» (qirradagi eng yaqin nuqta). Ustuvorlik: uch > o'rta > markaz > qirra. Belgi turi bo'yicha shakl va nomi bilan chiqadi.
- **Tayanch nuqta**: Move asbobida panelni uchidan ushlasangiz — shu uch nishonga aynan tushadi (ushlashdan oldin belgisi ko'rinadi); aks holda tanlovning nishonga eng yaqin nuqtasi.
- **Gizmo**: X/Y/Z strelkalari, XY/YZ/XZ tekislik kvadratlari, oq markaz (ekran tekisligi); hover sariq; ekranda doimiy o'lcham; ko'rish yo'nalishiga parallel o'q yashiriladi. O'q bo'ylab sudrashda magnit endi ishlaydi (oldin rad etilardi).
- **Sudrash davomida**: X/Y/Z — o'q, Shift+X/Y/Z — tekislik, raqam — aniq masofa (125 Enter), Esc yoki o'ng tugma — bekor. Qadam siljishga (nisbiy) qo'llanadi.
- **3D kursor**: Shift + o'ng tugma (magnit nuqtasiga aynan), Make menyusida X/Y/Z, Alt+C kursor → tanlangan, Alt+S tanlangan → kursor, Alt+O kursor → 0, P — Pivot (aylantirish va Mirror kursor atrofida).
- Yangi panel (N) kursorga chap-past burchagi bilan ilashadi — burchak nishonga aynan tushadi. Stretch: ushlangan uch nishonga aynan tushadi.

---

# Rugby 1.1.2 — yangilanish (2026-10-30)

Batafsil: `docs/PANEL3D-1.1.2.md` (oxirgi bo'lim). Tekshiruvlar: `docs/TESTING.md`.

- **Cutlist** bo'limi (Modeling'dan keyin): raskroy jadvali, kromka L1/L2(/L3/L4) va W1/W2(/W3/W4) alohida ustunlarda, CSV/TXT eksport, list hisobi. Modeling soddalashtirildi.
- **Panel Types** (Drawing): Bazis fragmentlarining 2D varianti — 13 tur (Asosiy: blok, I, L, —, ⊢; Ramka ×4; Shkaf ×4, pastki blok 100 mm), boshlash nuqtasi L1/L2/R1/R2, en Tab bo'y, Depth = chizma darajasi (Z), t × ko'paytiruvchi, blok/ramka/shkaf ichiga polka (g'ildirak yoki raqam, H/V).
- **Tekstura yo'nalishi**: panel xossasi (yo'q / bo'yi / eni), 3D da chiziqlar, eksportda L = tekstura bo'ylab, Aylantirish=0, «Tekstura» ustuni; list hisobi hisobga oladi.
- **Modeling**: barcha tugmalarga hotkey (44 buyruq, View → Hotkeylar… da almashtiriladi), keng clipping, Top/Bottom aniq 90°, 2D ko'rinishda magnit chuqurlik darajasini o'zgartirmaydi, Stretch — hamma nuqta belgilansa panel har qanday o'q bo'ylab ko'chadi, «Butun korpus» da umumiy o'lcham (gabarit), fon mavzuga ergashadi. Bir nechta panelni birdaniga tahrirlash (qalinlik, o'lcham, tekstura, material, kromka), material bo'yicha tanlash (Shift+M). Cutlist: Material/Qalinlik filtri eksport va List hisobiga; List hisobida m² va kromka uzunligi.
- **Drawing Stretch**: obyekt tanlangan bo'lsa faqat uning nuqtalari ushlanadi.

---

# Yangi versiya — 1.1.2 (2026-10-15)

«Panel 3D» rejimi qo'shildi (korpus mebel, CNC, raspil). Batafsil: `docs/PANEL3D-1.1.2.md`.
3D modeli `.dbe` ichida `page.panel3d` sifatida saqlanadi. Node tekshiruvlari (`npm run check`, `npm test`, `node tests/panel3d.cjs`) o'tdi;
haqiqiy Electron/Windows oynasida 3D ko'rinish hali sinalmagan.

- Yuqori menyu (o'zgarmas tartib, chapdan): Logo, File (Yangi, Ochish, Saqlash, Boshqacha saqlash, Import DXF/rasm, Export DXF/SVG/PNG), Edit (Undo, Redo, Hotkey, Til, ko'rinish, chizish maydoni rangi), Object (Explode, Join, Soddalash, Group/Ungroup, Array, Tekislash — asboblar panelidan ko'chirilgan), Cnc (eski Bone edit), Drawing (eski Chizish), Modeling (eski Panel 3D). Menyu mavjud tugmalarni bosadi — mantiq o'zgarmagan. Fayllar: `app/js/ui/menubar.js`, `app/css/menubar.css`.

---

# Yangi versiya — 1.1.0-preview.3 (2026-10-15)

GitHub branch: `versions/1.1.0-preview.3`. Eski `main` va preview.2 relizi
alohida saqlanadi. Drive’da ham alohida yangi versiya papkasi yaratilgan.

Raqamli katakdagi takrorlangan fokus xatosi, panel ustidagi snap/geometry
hisoblari va klaviatura hodisalari tuzatildi. PNG hududini to‘rtburchak bilan
belgilash qo‘shildi. Batafsil: `docs/INPUT-PNG-PREVIEW3.md`.
Windows CI o‘tdi va preview.3 relizi chiqarildi. Dalillar `docs/TESTING.md` da.

Quyidagi ma’lumotlar oldingi preview.2 tarixidir.

---

# Joriy tarqatish holati — 2026-10-11

GitHub manbasi: https://github.com/iamsanbek-blip/MyCAD . Qisqa foydalanuvchi
qo‘llanmasi README.md da; v1.1.0-preview.2 Releases’da chiqarildi; yangi Windows preview reliz jarayoni
`docs/GITHUB-RELEASE.md` da. Tekshiruv holati `docs/TESTING.md` da.

Quyidagi 2026-10-03 qaydlar tarixiy. Yangi EXE Windows CI orqali qayta qurilib, sinovlardan o‘tdi;
oldingi EXE o‘rniga yangi relizning SHA256.txt fayli ustuvor. Imzolash sertifikati
hali mavjud emas; preview relizi SAC muammosini hal qilmaydi.

---

# Rugby — davom ettirish uchun loyiha holati

Versiya: **1.1.0-preview.2**, sana: **2026-10-03**.

Avvalgi **Rugby-Portable.exe** Windows Smart App Control tomonidan bloklangan:
tashqi launcher va ichki Rugby.exe'da Authenticode imzo yo'q. Foydalanuvchi
so'roviga binoan yangi imzosiz preview.2 qayta yig'ildi. Unda oxirgi panel va
profil tuzatishlari bor. Smart App Control muammosi hal bo'lmadi; SmartScreen
Run anyway ko'rsatishi Windows siyosatiga bog'liq. Ishonchli sertifikat/xizmat
hamda native Windows sinov muhiti hali kerak.
`docs/PORTABLE.md` sabab va imzolangan chiqarish yo'lini tushuntiradi.

Maqsad: Windows 2D CAD/CNC dasturi; oson tuzatiladigan kod, remap qilinadigan
hotkeylar va CorelDRAW/Excel kabi bitta faylda ko'p sahifa.

## Bajarilgan

1. `.dbe` v2, v1 migratsiya, barcha sahifalarni saqlash/ochish.
2. Sahifa qo'shish, nusxalash, nomlash, tartiblash, tasdiq bilan o'chirish;
   sahifaga alohida chizmalar, qatlam, ko'rinish va undo/redo.
3. 45 buyruqli markaziy hotkey registry; qidirish, konflikt tekshirish,
   bo'shatish, reset, profilga saqlash, kirill/lotin fizik tugmalari.
4. Save/Open/New da bekor qilishni to'g'ri ishlash; revision orqali davom
   etayotgan saqlash bilan tahrir to'qnashuvini hisobga olish.
5. Diskka atomik yozish moduli va native dialogdan tanlangan yo'llarni cheklash.
6. Fayl assotsiatsiyasidan kelgan loyihani renderer tayyor bo'lgach yetkazish;
   ikkinchi jarayon uchun ortiqcha oyna ochilishini to'xtatish.
7. Portativ Node tekshiruvlari, arxiv yig'ish skripti va texnik yo'riqnomalar.
8. Haqiqiy Electron oynasida chizish, sahifalar, hotkey, diskka saqlash/ochish
   sinovi; Linuxda o'tdi. Asboblar paneli 1100 va 1600 px kenglikda yon panelga
   chiqmaydi. Grafik test alohida foydalanuvchi profilidan foydalanadi.
9. `dist:portable` uchun Windows, GUI test va haqiqiy imzo tekshiruvlari.
   Imzosiz development build nomi alohida; u Smart App Control yechimi emas.

## Kod xaritasi

Renderer 45 ta oddiy scriptdan iborat. `app/index.html` dagi tartib muhim;
ular umumiy global scope'da ishlaydi. Yangi `core/` modullarida sof format va
hotkey qoidalari, `model/pages.js` da eski state bilan adapter bor.
`docs/ARCHITECTURE.md` da har qism va kengaytirish tartibi tushuntirilgan.

## Ishga tushirish va tekshirish

`README.md` — foydalanish/build; `docs/TESTING.md` — tekshirilgan va hali
tekshirilmagan jihatlar. `npm run check` va `npm test` internet talab qilmaydi.
Paketdagi test logi avtomatik tekshiruvning dalili.

Windows GUI, native dialoglar va Smart App Control bu muhitda tekshirilmadi.
Linuxdagi haqiqiy Electron sinovi avtomatik o'tdi; dialog tanlovi mock qilingan.
Manba arxivi va yangi preview.2 EXE bir xil ilova kodini o'z ichiga oladi.
Paketdagi 20 fayl va manbadagi 60 fayl mosligi tekshirildi. `docs/verification/`
tekshiruv natijalarini saqlaydi.
`docs/NEXT-STEPS.md` keyingi P0/P1/P2 ishlarni fayllar bilan beradi.
GitHub'ga push qilinmagan, Drive'dagi asl manba/runtime fayllari almashtirilmagan.

## Moslik va chegaralar

- v2 loyiha eski v1 dasturga mos emas; muhim v1 loyihani boshqa nom bilan saqlang.
- DXF/PNG eksport faqat aktiv sahifa; G-code chiqarish mavjud emas.
- Undo/redo chizma uchun sahifaga alohida; sahifa o'chirish undo qilinmaydi.
- Undo tarixi faylda saqlanmaydi; hotkeylar esa foydalanuvchi profilida saqlanadi.
- Renderer hali global state ishlatadi. Framework yangilash va avtomatik
  tiklash alohida keyingi ishlar; bu reliz mukammallik kafolati emas.

Asl 1.0 hujjat: `docs/LEGACY-HUJJAT-1.0.md`. Undagi eski yo'llar/hotkeylar/
modul sonlari uchun ushbu hujjat va joriy kod ustuvor.
