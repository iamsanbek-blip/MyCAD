# Yangi versiya — 1.1.0-preview.3 (2026-10-15)

GitHub branch: `versions/1.1.0-preview.3`. Eski `main` va preview.2 relizi
alohida saqlanadi. Drive’da ham alohida yangi versiya papkasi yaratilgan.

Raqamli katakdagi takrorlangan fokus xatosi, panel ustidagi snap/geometry
hisoblari va klaviatura hodisalari tuzatildi. PNG hududini to‘rtburchak bilan
belgilash qo‘shildi. Batafsil: `docs/INPUT-PNG-PREVIEW3.md`.
Sinovning joriy natijasi `docs/TESTING.md` da.

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
