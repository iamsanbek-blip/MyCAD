# Rugby 1.1.2-preview.5 — umumiy hujjat (o'zgarishlar, foydalanish, yuklab olish)

Sana: 2026-11-28. Oldingi EXE: 1.1.2-preview.4 (2026-11-27). Bu hujjat preview.4 dan keyin qo'shilgan va tuzatilgan hamma narsani,
qayerda joylashganini, qanday ishlatilishini, qanday tekshirilganini va davom ettirish uchun kerakli ma'lumotlarni bir joyga to'playdi.
Asosiy mavzu — **boshqaruvning barqarorligi**: funksiya «ba'zan ishlab, ba'zan unutib qo'yishi» sabablari topilib tuzatildi.

---

## 1. Yuklab olish

| Nima | Havola / joy |
|---|---|
| **Windows dasturi (EXE, portable)** | https://github.com/iamsanbek-blip/MyCAD/releases/download/v1.1.2-preview.5/Rugby-Portable.exe |
| Reliz sahifasi (EXE, SHA256.txt, BUILD-REPORT.json) | https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.2-preview.5 |
| EXE nazorat summasi (SHA256) | `89e800478770673377eadbea1e7b74636ee1462656ae1182958f4bfe0fecd7f6` |
| EXE hajmi | 65 845 717 (≈ 62.8 MB) bayt |
| Web versiya (brauzerda, shaxsiy) | https://claude.ai/artifact/8dtatEhvPjbViEre1NRLka |
| Manba kod | GitHub `iamsanbek-blip/MyCAD`, branch `claude/vigilant-goodall-nvrvty` |
| Google Drive rezervi | «Rugby 1.1.2» papkasi (web, manba ZIP, hujjatlar; preview.4 — «eski 2026-11-27 (preview.4)» papkasida) |

**Ishga tushirish:** `Rugby-Portable.exe` ni yuklab oling va 2 marta bosing (o'rnatish shart emas). Imzosiz sinov versiyasi: Windows
SmartScreen «Windows protected your PC» desa — **More info (Подробнее) → Run anyway (Выполнить в любом случае)**. Smart App Control
yoqilgan kompyuterda bloklashi mumkin (kod imzolash hali yo'q).

---

## 2. Yangi imkoniyatlar va tuzatishlar (preview.4 → preview.5)

### 2.1 Ko'chirish (Move) — panel uchidan ushlab surish barqaror

- **«Qotib qolish» yo'qoldi.** Tanlangan panelni o'z uchidan ushlab boshqa panel uchiga olib borganda (masalan, shkaf krishasini boka
  burchagidan) obyekt joyida «yopishib» qolardi: qo'shni panelning shu joydagi (Front/Top da esa uning orqasidagi) nuqtasi magnitga
  ilinib, siljish nolga tushardi. Endi boshlang'ich joy magnit nishoni emas — panel darhol ergashadi.
- **Zoomga bog'liq «surilmaslik» tuzatildi.** Top/Front ko'rinishda bo'sh joyda zoom qilib yaqinlashganda baland panelning (masalan, stul
  oyog'i 987 mm) ustki uchidan ushlab surish ishlamay qolardi — pastda «ΔX 0 ΔZ 0». Sabab: Ortho nuri kamera tekisligidan boshlanardi.
  Endi istalgan masshtabda ishlaydi.
- **Tanlov ustun.** Tanlangan panel chetini bosganda yonidagi ingichka panel tanlanib ketmaydi — aynan tanlangan obyekt suriladi.
- **Tezlik.** Magnit nishonlari keshlanadi va sudrash boshida bir marta yig'iladi: har harakat 100 panelda 4.0 → 0.7 ms, 400 panelda
  14 → 1.8 ms (test brauzerida o'lchangan).
- **Magnit turlari** (Uch, O'rta, Markaz, Qirra) Free rejimda aynan nishonga tushadi — har biri alohida tekshirildi.

### 2.2 Yo'nalish qulfi (3ds Max kabi)

- Strelka (X/Y/Z o'qi) yoki rangli kvadratni (tekislik) **bir marta bosing** — dasta sariq bo'lib qoladi, keyingi barcha sudrashlar (panelni
  uchidan ushlab ham) aynan shu yo'nalishda bo'ladi. Zoom yoki ko'rinish almashsa ham o'zgarmaydi.
- **Oq markazni** yoki o'sha dastani qayta bosish — qulf olinadi (erkin). Dastani sudrash — bir martalik, qulfni o'zgartirmaydi.
- Qulflangan o'q ko'rish yo'nalishiga parallel bo'lib qolsa (masalan, Top'da Z) — o'sha sudrash erkin bo'ladi.
- Sudrash paytida g'ildirak (zoom) obyektni sakratmaydi — siljish saqlanadi va yangi masshtabda davom etadi.
- Gizmo dastalari ustma-ust tushganda tartib barqaror: oq markaz → tekislik kvadrati → strelka (avval kamera burchagiga qarab goh
  strelka, goh markaz ushlanardi — «strelka uchi ba'zan yonadi, ba'zan yonmaydi»).

### 2.3 Tanlash: yoysimon shakllar

- Yoysimon/egri panelning **bo'sh ichki qismini** bosish uni tanlamaydi — panelning haqiqiy konturi olinadi (avval to'g'ri to'rtburchak
  chegarasi olinardi). Yoy tasmasining o'zini bosish — tanlaydi.
- Ctrl+Z yoki nusxadan keyin darhol bosilganda panel ba'zan tanlanmasdi (yangi qurilgan panel matritsasi keyingi kadrni kutardi) — tuzatildi.

### 2.4 Raqam maydonlari qotmaydi

- **Modeling:** ko'chirish yoki nusxa (C) faol turganda maydonga bosilsa — amal yakunlanadi va raqam maydonga yoziladi (avval raqamlar
  ko'chirishga «yutilardi», maydon bosilganda xossalar paneli qayta qurilib fokus tushmasdi).
- **Desktop (Windows, EXE):** fayl dialogi (ochish/saqlash) yoki ogohlantirish oynasidan keyin klaviatura fokusi oynaga qaytariladi —
  Electron'ning Windows'dagi «maydon bosiladi, lekin yozilmaydi» xatosiga qarshi. **Windows'da sinab ko'rish kerak** (bu xato faqat Windows'da).
- Sichqoncha tugmasi oyna tashqarisida qo'yilsa, Alt+Tab yoki dialog ochilsa — faol amal (sudrash, ramka, orbit) to'g'ri yakunlanadi;
  keyingi bosish «unutilmaydi», ko'rinish tugmasiz o'zi aylanmaydi.

### 2.5 Drawing — assotsiativ o'lcham (yangi)

- O'lchov nuqtalarini shakl **uchi** yoki **qirrasiga** (masalan, o'rtasiga) magnit bilan qo'ysangiz — o'lchov shu shaklga bog'lanadi.
- Shkaf **Stretch** bilan 300 → 400 mm cho'zilsa, o'lchov ham o'zi **400** bo'ladi — sudrash paytida jonli; Esc — hammasi joyiga.
- Grip bilan nuqtani sudrash, ko'chirish, burish ham ergashadi. Butun shakl ko'chsa — o'lchov chizig'i ham birga ko'chadi; faqat bir
  tomoni cho'zilsa — chiziq joyida, qiymat o'zgaradi.
- Yonma-yon ikki shkafning umumiy burchagida o'lchov aynan **o'lchangan** shkafga bog'lanadi (ikkala nuqtasi tegishli shakl).
- Ctrl+Z / Ctrl+Y; bog'lanish faylda saqlanadi va qayta ochilganda ishlaydi. Bo'sh joyga (magnitsiz) qo'yilgan nuqta bog'lanmaydi.

### 2.6 Drawing — Stretch (W) har doim ishlaydi

- Chizish asbobi (masalan, to'rtburchak) faol qolib W bosilsa, ramka o'rniga yangi to'rtburchak chizilib qolardi — tuzatildi.

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
| **Strelka / kvadratni bir marta bosish** | **Yo'nalish qulfi (sariq); oq markaz — erkin** |
| Sudrash paytida X/Y/Z, Shift+X/Y/Z, raqam, Enter, Esc / o'ng tugma | o'q / tekislik / aniq masofa / tasdiq / bekor |
| Sudrash paytida g'ildirak | zoom (obyekt sakramaydi) |
| Aylantirish paytida Ctrl, raqam + Enter | butun gradus / aniq burchak |
| 2 marta bosish (panel) | Drawing'da shaklini tahrirlash |
| Ctrl+Z / Ctrl+Y | Qaytarish / qayta bajarish |

Drawing: o'lchov asboblari — Horizontal / Vertical / Aligned / Angular / Yoy uzunligi; Stretch — W (ramka, bazaviy nuqta, masofa + Enter).
Hotkeylar View ▸ Hotkeylar… da almashtiriladi.

---

## 4. Tekshiruv

- Avtomatik (Linux, hammasi o'tdi): `npm run check` (59 JS), `npm test` (18 regressiya + workspace 28 test, shu jumladan 4 ta assotsiativ
  o'lcham testi + `panel3d-hw` + `panel3d-xlap`), `modeling-precision` (yangi: o'z burchagidan surish, tanlov ustunligi, strelka uchi
  Top/Iso, qulf + zoom, magnit turlari, Alt+Tab/tashqarida qo'yilgan tugma, 4 xil zoomda 987 mm panel, yoy ichi, C rejimida maydon),
  `dim-assoc-ui` (yangi, haqiqiy sichqoncha: magnitli o'lchov → Stretch «100» Enter → 400, jonli, Esc, Ctrl+Z/Y), `modeling-cnc-price` (31,
  ketma-ket 3 marta), `modeling-xlap` (8), `panel3d-hw-ui` (8), `smart-autoname`; Electron (xvfb): `modeling-smoke`, `electron-smoke`,
  `panel-types-smoke`, `stretch-select`.
- Foydalanuvchi videosi (Top, stul, «ΔX 0 ΔZ 0») kadrma-kadr ko'rib chiqildi; xato testda takrorlandi: eski kod R=141 mm zoomda yiqildi,
  yangi kod o'tdi. Yoy ichini tanlash testi ham eski kodda yiqilib, yangisida o'tdi.
- EXE: GitHub Actions «Windows portable preview» (Windows Server 2022) — run 46130508310 (commit 03865a1): kod testlari, manba va paketlangan dastur GUI sinovi, portable launcher ochilishi — **hammasi muvaffaqiyatli** (BUILD-REPORT.json: source / packaged / launcher — passed, sahifa xatolari yo'q). Yuklab olingan faylning SHA256 summasi relizdagi bilan mos keldi.
- **Hali tekshirilmagan:** Windows 10/11 da qo'lda qabul sinovi (ayniqsa dialogdan keyin maydon fokusi), SmartScreen/Smart App Control,
  haqiqiy CNC dastgohda kesib-yig'ish, birkalarni printerda chop etish.

---

## 5. Ma'lum cheklovlar

1. Assotsiativ o'lcham: yoy/aylana ustidagi ixtiyoriy nuqta (uchi yoki markazi emas) ergashmaydi; Trim/Offset kabi shakl sonini
   o'zgartiradigan amallardan keyin faqat bog'langan (uid li) shakllar bo'yicha ergashadi.
2. Yo'nalish qulfi faqat Move asbobida; Stretch strelkalari — avvalgidek bir martalik.
3. O'zaro o'yiq: ustun halqani deyarli to'liq egallasa ingichka ko'prik qoladi — «teshik bilan» rejimi. Yopiq teshik burchagida dogbone yo'q.
4. Qiya panelga avtomatik furnitura qo'yilmaydi; qiya qo'shni panel izi qavariq qobiq bo'yicha.
5. G-code / postprotsessor yo'q (DXF qatlamlari bilan); ikkinchi tomondagi ko'r teshiklar CNC sahifasiga chiqmaydi.
6. Web versiyada `.dxf` → `.dxf.txt` saqlanadi.

---

## 6. Davom ettirish uchun

- Kod: `app/js/tools/panel3d.js` (Modeling: `ndc`, `pick`, `snapPool`/`snapFind`, `mvLock`/`setLock`, `abortAct`, `softAbort`),
  `app/js/tools/dim-assoc.js` (assotsiativ o'lcham: `dimAssocFollow`, `dimAssocBind`, `dimAssocSync`, `dimAssocLive`),
  `panel3d-xlap.js`, `panel3d-hw.js`, `panel3d-price.js`; Electron: `main.js` `refocusMain`, `preload.js` `desktop.refocus`,
  `app/js/ui/input-guard.js` `wrapNativeDialogs`.
- Ma'lumot modeli: o'lchov `dimensions[i].b1/b2/b3` — bog'langan shakl `uid` si (shakl `uid` i `shapes` da saqlanadi).
- Batafsil: `docs/DAVOM-ETTIRISH.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `HUJJAT.md`, `AGENTS.md`.
- Yangi chatda: «docs/DAVOM-ETTIRISH.md, docs/OZGARISHLAR-1.1.2-preview.5.md, HUJJAT.md va AGENTS.md ni o'qib, Rugby ustida ishni davom ettir».
- Yangi EXE: `package.json` va `package-lock.json` versiyasini oshiring → push → GitHub Actions ▸ «Windows portable preview» ▸ Run workflow.
