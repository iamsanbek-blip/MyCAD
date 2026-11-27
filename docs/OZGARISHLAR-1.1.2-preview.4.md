# Rugby 1.1.2-preview.4 — umumiy hujjat (o'zgarishlar, foydalanish, yuklab olish)

Sana: 2026-11-27. Oldingi EXE: 1.1.2-preview.3 (2026-11-24). Bu hujjat preview.3 dan keyin qo'shilgan va tuzatilgan hamma narsani,
qayerda joylashganini, qanday ishlatilishini, qanday tekshirilganini va davom ettirish uchun kerakli ma'lumotlarni bir joyga to'playdi.

---

## 1. Yuklab olish

| Nima | Havola / joy |
|---|---|
| **Windows dasturi (EXE, portable)** | https://github.com/iamsanbek-blip/MyCAD/releases/download/v1.1.2-preview.4/Rugby-Portable.exe |
| Reliz sahifasi (EXE, SHA256.txt, BUILD-REPORT.json) | https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.2-preview.4 |
| EXE nazorat summasi (SHA256) | `__SHA__` |
| EXE hajmi | __SIZE__ bayt |
| Web versiya (brauzerda, shaxsiy) | https://claude.ai/artifact/8dtatEhvPjbViEre1NRLka |
| Manba kod | GitHub `iamsanbek-blip/MyCAD`, branch `claude/vigilant-goodall-nvrvty` |

**Ishga tushirish:** `Rugby-Portable.exe` ni yuklab oling va 2 marta bosing (o'rnatish shart emas). Imzosiz sinov versiyasi: Windows
SmartScreen «Windows protected your PC» desa — **More info (Подробнее) → Run anyway (Выполнить в любом случае)**. Smart App Control
yoqilgan kompyuterda bloklashi mumkin (kod imzolash hali yo'q).

---

## 2. Yangi imkoniyatlar (preview.3 → preview.4)

### 2.1 Kesishgan panellarni bir-biriga kiygizish (O'zaro o'yiq)

- **Qayerda:** Modeling ▸ **Object ▾** menyusining eng tepasidagi «Kesishma — bir-biriga kiygizish» bo'limi; yoki yuqoridagi asosiy
  **Object** menyusi ▸ «Modeling» bo'limi.
  1. **Kesishmalarni tekshirish** — bir-biriga kirib qolgan panellarni topadi, juftlar va kirish uzunligini (mm) yozadi va ularni tanlaydi.
  2. **O'zaro o'yiq (kiygizish)** — tanlangan panellarning har bir kesishmasiga o'yiq ochadi.
  3. **O'zaro o'yiq — teshik bilan** — bir panel ikkinchisidan to'liq o'tsa, ochiq o'yiq o'rniga yopiq teshik.
- **Qanday ishlaydi:**
  - Ikki panel X ko'rinishida kesishsa — **yarim-yarim**: har biriga o'z chekkasidan o'rtagacha o'yiq.
  - Biri ikkinchisidan to'liq o'tsa (masalan ustun qovurg'adan) — kattasiga yaqin chekkasidan ochiq o'yiq; panelni ikkiga bo'lib
    yubormaydigan variant o'zi tanlanadi (yaqin chekka → uzoq chekka → aniq kesim).
  - Qiya (erkin burchakli) panellarda ham ishlaydi: o'yiq kengligi qalinlik, burchak va zazordan aniq hisoblanadi, o'yiq qiya bo'ladi.
  - Ichki burchaklarga **dogbone** (freza aylanasi) qo'yiladi — CNC to'g'ri burchak qoldirmaydi, detal o'tiradi.
  - Natija yordam satrida: «N ta kesishma — … · kesishma qolmadi». Ctrl+Z — qaytarish.
- **Sozlamalar:** Furnitura oynasi (Alt+F) ▸ «Ship-paz va O'zaro o'yiq (zazor, freza Ø)»: Zazor (standart 0.2 mm), Dogbone, Freza Ø (6 mm).
- **Misol (stul suyanchig'i):** qovurg'ani tanlang → C (nusxa) → Y → −28 → Enter → R (Rotate) → 10° qiyalating → Object ▸ Kesishmalarni
  tekshirish → O'zaro o'yiq. Yuborilgan stulda 35 ta asl kesishma ham shu bilan hal bo'ldi (7 yarim-yarim, 28 to'liq o'tish).

### 2.2 OBJ import — yoysimon va har qanday shakl

- **Qayerda:** File ▸ Import ▸ «OBJ — 3D panellar (Modeling)…».
- Bir xil qalinlikdagi har qanday ob'ekt panelga aylanadi: yoysimon qovurg'a, o'yiqli, burchakli, qiya plita; ichidagi teshik — kesik.
- Metrdagi fayl avtomatik mm ga o'tadi, Y — yuqoriga (Blender eksporti standarti). Qalinligi bir xil bo'lmagan ob'ektlar nomi bilan yoziladi.
- Import qilingan panelni Stretch, Drawing'da tahrirlash, O'zaro o'yiq, CNC (kontur yoy bo'yicha) bilan ishlash mumkin.

### 2.3 Aylantirish, ko'chirish, nusxa

- **Erkin burchak (R):** Free rejimda halqani sudrab istalgan burchak (0.1°), **Ctrl** — butun gradus, raqam yozib **Enter** — aniq burchak,
  Esc — bekor; Ortho (O) — 90° qadam. Qiya panel xossalarida «Qiya: 10°» va **To'g'rilash**. Qiya panelga furnitura avtomatik qo'yilmaydi.
- **Nusxa (C) — Blender Duplicate kabi:** nusxa kursorga ergashadi (magnit, X/Y/Z, raqam bilan masofa), bosilgan joyda qotadi, keyin Move
  asbobi yoqiladi; Esc yoki o'ng tugma — bekor.
- **Butun korpus ▸ Ko'chirish / ↺↻ 90°** — tanlov bo'lsa faqat tanlangan panellar, bo'lmasa butun korpus.
- **Move (M) strelkalari** — o'q va tekislik bo'yicha (Top ko'rinishda ham tekshirildi). Select (V) da strelka yo'q — Move'ga o'ting.

### 2.4 Stretch (W) — nuqtalarni cho'zish

- Hech narsa tanlanmagan bo'lsa ramka (panel ustidan boshlansa ham) **hamma panellarning** nuqtalarini belgilaydi; oddiy bosish — panelni tanlaydi.
- Panel tanlangan bo'lsa — faqat shu panel (boshqa panelga adashib o'tib ketmaydi); Shift — panel qo'shish, Esc — tozalash.
- Front/Top ko'rinishda bir joyda turgan nuqtalar (oldi-orqa) birga belgilanadi — panel qiyshaymaydi.
- Belgilangan nuqtani ushlab sudrash — butun tanlov suriladi; nuqta ustida strelka bo'lsa ham nuqta ushlanadi; kursor ostidagi nuqta oq bo'lib yonadi.
- Kesik va o'yiq burchaklari ham nuqta; kontur surilsa teshiklar joyida qoladi.

### 2.5 Panel ichida teshik va o'yiq (2 marta bosib Drawing'da)

- Pastki satr: **◻ Teshik (kesib o'tadi)** va **▣ O'yiq [chuqurlik] mm** (+ B yuza). Ichiga chizilgan yopiq shakl — kesik yoki o'yiq,
  aylana — sverlo teshigi.
- Modeling'da kesik — haqiqiy teshik, o'yiq — haqiqiy chuqurcha; tekstura chiziqlari ularning ustidan o'tmaydi.
- DXF/CNC: kesik — kontur qatlamida (`CUT_Z16`), o'yiq — `POCKET_Z{chuqurlik}`; CSV va «Teshiklar» ro'yxatida ham.
- Kulrang qo'shni panel izlari va yordamchi chiziqlar tanlanmaydi/o'zgarmaydi, faqat magnit uchun; nomlar yozilmaydi; qiya qo'shni panel
  izi haqiqiy qiya shaklda, qiya qirralari davom ettiriladi (andoza olish).

### 2.6 Aniqlik: magnit, yordamchi chiziq, lineyka, zoom

- **Magnit** kesik/o'yiq burchaklari va qirralari, o'yiq tubi, teshik markazlari, yordamchi chiziqlar kesishishiga ham yopishadi;
  ushlangan qirra yonadi.
- **Yordamchi chiziq (SketchUp kabi):** A, keyin B nuqtani bosing — A va B dan o'tuvchi cheksiz chiziq (tik, gorizontal, qiya; Ortho —
  o'qqa to'g'rilanadi). Select (V) da bosib tanlash, Delete — o'chirish.
- **Lineyka:** A va B nuqtada nima ushlangani belgisi qoladi («A · Uch», «B · O'rta»), magnitsiz bo'lsa qizil uzuk; yozuvda masofa va Δx/Δy/Δz.
- **Zoom:** g'ildirak kursor ostidagi nuqtaga qarab yaqinlashadi (nuqta joyida qoladi), eng yaqin 2 mm.

### 2.7 Interfeys

- Modeling chap paneli ixcham: yo'riqnoma faqat Panel/Magnit ustiga olib borilganda chiqadi; «2D chizma / DXF» bo'limi tepada.
- Furnitura oynasi — akkordeon: bir bo'lim ochilsa qolganlari yopiladi.
- Uzun menyular ekranga sig'adi (ichida g'ildirak bilan aylanadi); asosiy Object menyusida Modeling bo'limi (Furnitura, Kesishma).

---

## 3. Tugmalar (Modeling)

| Tugma | Vazifa |
|---|---|
| V / M / R / S / W | Select / Move / Rotate / Scale / Stretch |
| K / J | Kromka / Furnitura (ulanish) asbobi |
| C | Nusxa (kursorga ergashadi, bosib qo'yiladi) |
| Shift+X/Y/Z | Mirror (nusxa) |
| A / Alt+A | Hammasini tanlash / tanlovni bekor qilish |
| Ctrl+G / Ctrl+Shift+G | Guruh / guruhni ajratish |
| O | Ortho ↔ Free |
| Probel (Space) | Magnit yoqish/o'chirish |
| Alt+F | Furnitura va teshiklar oynasi |
| Sudrash paytida X/Y/Z, Shift+X/Y/Z, raqam, Enter, Esc | o'q / tekislik / aniq masofa / tasdiq / bekor |
| Aylantirish paytida Ctrl, raqam + Enter | butun gradus / aniq burchak |
| 2 marta bosish (panel) | Drawing'da shaklini tahrirlash |
| Ctrl+Z / Ctrl+Y | Qaytarish / qayta bajarish |

Hotkeylar View ▸ Hotkeylar… da almashtiriladi. Web versiyada Alt+F ni brauzer ushlab qolishi mumkin — Object menyusidan oching.

---

## 4. Tuzatilgan xatolar (preview.3 dan keyin)

- Stretch: tanlovsiz ramka panel ustidan boshlansa panel tanlanib qolardi; ustma-ust nuqtalardan bittasi belgilanib panel qiyshayardi;
  yonidagi belgilanmagan nuqta tanlovni buzardi; strelka nuqtani ushlashga xalaqit qilardi.
- Stretch: kesik nuqtasining kaliti avtomatik furnitura qayta qo'yilganda boshqa amalga o'tib ketishi mumkin edi.
- Scale qiya panelda noto'g'ri o'lchamni o'zgartirardi.
- Narx: ichki kesik maydoni ayrilmasdi, kesik uzunligi raspilga qo'shilmasdi.
- Tekshiruv chegaradagi kesikni xato deb ko'rsatardi; yordamchi chiziqlar ba'zan umuman ko'rinmasdi (juda uzun chizilardi).
- O'yiq joyida «noma'lum chiziq» (tekstura), teshik chetida ikki qavat chiziq; o'yiq faqat yuzada kontur edi.
- Nusxa (C) dan keyin Move asbobi yoqilmasdi (strelkalar yo'q — «ko'chirish ishlamayapti» ko'rinardi).
- O'zaro o'yiqni ishlab chiqishda: sherik panel kesim burchagida tugasa o'yiq kesilmay qolardi; ba'zi o'yiqlar panelni bo'lib yuborardi —
  muqobil variantlar bilan hal qilindi.

---

## 5. Tekshiruv

- Avtomatik (Linux, hammasi o'tdi): `npm run check` (58 JS), `npm test` (18 regressiya + workspace + `panel3d-hw` 18 + `panel3d-xlap` 6),
  `modeling-cnc-price` (31), `modeling-xlap` (8 — OBJ → tekshirish → O'zaro o'yiq → nusxa + 10° → o'yiq → Ctrl+Z/Y → CNC → menyular),
  `panel3d-hw-ui` (8), `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`; Electron (xvfb): `modeling-smoke`,
  `electron-smoke`, `panel-types-smoke`, `stretch-select`.
- Foydalanuvchi stuli (`test.obj`, 14 panel): import, 35 kesishma — O'zaro o'yiq (ikkala rejim), qiya suyanchiq qovurg'asi, Stretch (2 ustun
  869 → 943 mm), CNC — skrinshot va detal konturlari ko'rildi.
- EXE: GitHub Actions «Windows portable preview» (Windows Server 2022) — run __RUN__: kod testlari, manba va paketlangan dastur GUI sinovi,
  portable launcher ochilishi: __RESULT__.
- **Hali tekshirilmagan:** Windows 10/11 da qo'lda qabul sinovi, SmartScreen/Smart App Control, haqiqiy CNC dastgohda kesib-yig'ish,
  birkalarni haqiqiy printerda chop etish, web versiyada Alt+F.

---

## 6. Ma'lum cheklovlar

1. O'zaro o'yiq: ustun halqani deyarli to'liq egallasa ochiq o'yiqdan keyin ingichka ko'prik qoladi — «teshik bilan» rejimi yoki kengroq qovurg'a.
   Yopiq teshik burchaklariga dogbone qo'yilmaydi.
2. Qiya qo'shni panel izi qavariq qobiq bo'yicha (L-shakl kabi botiq qiya panelda ortiqcha qamraydi).
3. Qiya panelga avtomatik furnitura qo'yilmaydi; Scale qiya panelda eng yaqin o'q bo'yicha.
4. G-code / postprotsessor yo'q (DXF qatlamlari bilan); ikkinchi tomondagi ko'r teshiklar CNC sahifasiga chiqmaydi.
5. Narx «list» rejimida to'rtburchak gabarit bo'yicha (yoysimon detallarda CNC nesting kamroq list ko'rsatishi mumkin).
6. Web versiyada `.dxf` → `.dxf.txt` saqlanadi.

---

## 7. Davom ettirish uchun

- Kod: `app/js/tools/panel3d.js` (Modeling), `panel3d-xlap.js` (O'zaro o'yiq: `crossings`, `plan`, `cut`, `interference`, Greiner–Hormann
  `diff`), `panel3d-hw.js` (furnitura, DXF, CSV, `k:'c'` kesik/o'yiq), `panel3d-price.js` (narx), `part-labels.js` (birka).
- Ma'lumot modeli (loyihada `page.panel3d`): panel `rt` — erkin burchak (kvaternion), `ops[]` ichida `{k:'c', pts, th:1}` kesik va
  `{k:'c', f, pts, z}` o'yiq; yordamchi chiziq `{p, d}`; model `mc` (material rangi), `ms` (material list o'lchami).
- Batafsil: `docs/DAVOM-ETTIRISH.md` (kod xaritasi, testlar), `docs/TESTING.md` (har tekshiruv), `HUJJAT.md` (foydalanuvchi uchun), `AGENTS.md` (qoidalar).
- Yangi chatda: «docs/DAVOM-ETTIRISH.md, docs/OZGARISHLAR-1.1.2-preview.4.md, HUJJAT.md va AGENTS.md ni o'qib, Rugby ustida ishni davom ettir».
- Yangi EXE: `package.json` va `package-lock.json` versiyasini oshiring → push → GitHub Actions ▸ «Windows portable preview» ▸ Run workflow.
