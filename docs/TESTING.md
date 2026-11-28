# Reliz 1.1.2-preview.5 — 2026-11-28

- EXE: GitHub Actions «Windows portable preview» run 46130508310 (Windows Server 2022, commit 03865a1) — **muvaffaqiyatli**: `npm run check`,
  `npm test`, manba va paketlangan dastur GUI sinovi (pageErrors bo'sh), portable launcher ochilishi. Reliz `v1.1.2-preview.5`:
  `Rugby-Portable.exe` 65 845 717 bayt, SHA256 `89e800478770673377eadbea1e7b74636ee1462656ae1182958f4bfe0fecd7f6` (yuklab olingan fayl
  bilan `sha256sum` mos). Windows 10/11 da qo'lda sinov (ayniqsa dialogdan keyin maydon fokusi), SmartScreen/SAC hali tekshirilmagan.
- Umumiy hujjat: `docs/OZGARISHLAR-1.1.2-preview.5.md`.

---

# Drawing: assotsiativ o'lchov; Stretch rect asbobi bilan; Modeling pick barqarorligi — 2026-11-28 (Linux)

- `node --test tests/workspace.test.cjs` (DOM dubllari): 28 test o'tdi, 4 tasi yangi — Stretch 300 → 400 (jonli, Esc, undo/redo,
  chap tomon), butun shaklni ko'chirish (o'lchov chizig'i birga), qirra o'rtasi ergashadi, magnitsiz nuqta joyida, yonma-yon ikki
  shkafning umumiy burchagi (faqat o'lchangan shkaf), saqlash/ochishdan keyin bog'lanish ishlaydi, grip sudrash jonli.
- `node tests/dim-assoc-ui.cjs` (haqiqiy Chromium, web build, sichqoncha/klaviatura): o'tdi — burchak yonidan bosilgan o'lchov magnit
  bilan aynan uchga, Stretch ramka + «100» Enter → o'lchov 400 (sudrash paytida jonli), Esc bekor, Ctrl+Z/Ctrl+Y.
- Topilgan haqiqiy xato: Drawing'da chizish asbobi (rect) faol qolsa W (Stretch) ramkasi o'rniga yangi to'rtburchak chizilardi —
  Stretch bosish tarmog'i chizishdan oldinga ko'chirildi.
- Oldingi commit (ee8566e) dagi regressiya: Ctrl+Z dan keyin panel matritsasi kadr chizilguncha eski bo'lib, `pick()` ba'zan panelni
  topmasdi (`modeling-cnc-price` da ikki marta bosish goh ishlamasdi). Tuzatildi: `ndc()` da `P.updateMatrixWorld()` + kontur ichi
  zaxirasi. `modeling-cnc-price` ketma-ket 3 marta o'tdi.
- `npm run check` (59 fayl), `npm test`, `modeling-precision`, `modeling-cnc-price` (31), `modeling-xlap` (8), `panel3d-hw-ui` (8),
  `smart-autoname`, `xvfb-run`: `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select` — o'tdi. EXE qayta yig'ilmadi.

---

# Video bo'yicha: zoomda surilmaslik, yoy ichini tanlash, maydon qotishi — 2026-11-28 (Linux)

- Foydalanuvchi videosi (Top ko'rinish, stul, «ΔX 0 ΔZ 0»): sabab — Ortho nuri kamera tekisligidan boshlanardi; bo'sh joyda zoom
  qilinganda baland panel ustki uchi kamera «orqasida» qolardi. `modeling-precision.cjs` yangi tekshiruvi (987 mm panel, 4 xil zoom)
  eski kodda R=141 mm da **yiqildi**, yangi kodda o'tdi.
- Yoysimon panel bo'sh ichini bosish: eski kodda tanlanardi (test yiqildi), yangi kodda tanlanmaydi; yoy tasmasi — tanlanadi.
- C nusxa rejimida «Eni» maydoniga bosib 450 yozish — yoziladi va qo'llanadi (avval raqamlar ko'chirishga yutilardi, panel qayta qurilib fokus tushmasdi).
- Electron: native dialog va alert/confirm/prompt'dan keyin fokus qaytarish (`refocusMain`, `desktop.refocus`) — Linux'da `electron-smoke`
  o'tdi; **Windows'da maydon qotishi tuzalgani tekshirilmagan** (xato Windows'ga xos).
- `npm run check`, `npm test`, `modeling-cnc-price` (31), `modeling-xlap` (8), `panel3d-hw-ui` (8), `smart-autoname`, `modeling-smoke`,
  `electron-smoke`, `panel-types-smoke`, `stretch-select` — o'tdi.

---

# Move barqarorligi: magnit, qulflangan yo'nalish, osilib qolgan sudrash — 2026-11-28 (Linux)

- `node tests/modeling-precision.cjs` (Playwright Chromium, SwiftShader WebGL, haqiqiy sichqoncha): o'tdi — yangi tekshiruvlar:
  shkaf krishasi o'z burchagidan (boka burchagi bilan ustma-ust, Front ko'rinish) ushlanib 10 px da ergashadi (oldin joyida qotib qolardi);
  tanlangan polka cheti yonida ingichka boka bo'lsa ham tanlov o'zgarmaydi; Move strelka uchlari Top va Iso da yonadi; X strelkasini bir
  marta bosish — qulf, panel uchidan qiyshiq sudralsa faqat X, sudrash paytida g'ildirak (zoom) siljishni saqlaydi, oq markaz — qulf olinadi;
  magnit turlari (uch, o'rta, markaz) Free rejimda aynan nishonga; oyna fokusni yo'qotsa (blur) sudrash bekor, tugmasiz pointermove — ramka
  yakunlanadi, keyingi sudrash darhol ishlaydi.
- `npm run check` (58 fayl), `npm test`, `modeling-cnc-price` (31), `modeling-xlap` (8), `panel3d-hw-ui` (8), `smart-autoname`,
  `xvfb-run`: `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select` — o'tdi.
- Tezlik (sahna JS vaqti, sudrashdagi har harakat): 100 panel 4.0 → 0.68 ms, 400 panel 14.0 → 1.84 ms (magnit nishonlari keshi).
  SwiftShader kadr vaqti test muhitiga xos; haqiqiy Windows GPU'da sinalmagan. EXE qayta yig'ilmadi.

---

# Reliz 1.1.2-preview.4 — 2026-11-27

- EXE: GitHub Actions «Windows portable preview» run 45957358660 (Windows Server 2022, commit 8822d5e) — **muvaffaqiyatli**: `npm run check`,
  `npm test`, manba va paketlangan dastur GUI sinovi (pageErrors bo'sh), portable launcher ochilishi. Reliz `v1.1.2-preview.4`:
  `Rugby-Portable.exe` 65 842 090 bayt, SHA256 `5cccaa6330d69ed09152f3c885431e48f93d8cd59d4ce9b93a721595b5608266` (yuklab olingan fayl
  bilan `sha256sum` mos). Windows 10/11 da qo'lda sinov, SmartScreen/SAC va haqiqiy fayl dialoglari hali tekshirilmagan.
- Umumiy hujjat: `docs/OZGARISHLAR-1.1.2-preview.4.md`.

---

# Stretch (W): tanlovsiz ramka, ustma-ust nuqtalar, strelka nuqtani to'smaydi — 2026-11-27 (Linux)

- Topilgan sabablar: (1) tanlovsiz W da sichqoncha panel ustida bosilsa o'sha panel darhol tanlanib, ramka faqat uning nuqtalarini olardi;
  (2) Front/Top da oldi va orqa nuqtalar ekranda bir joyda — bosganda bittasi belgilanib panel qiyshayardi; (3) belgilangan nuqta yonida
  belgilanmagan nuqta bo'lsa, sudrash tanlovni o'sha bitta nuqtaga almashtirardi; (4) Stretch strelkasi belgilangan nuqtalar ustidan
  o'tib, nuqtani ushlashga xalaqit qilardi (noto'g'ri o'q bo'ylab surardi).
- Tuzatildi: bosish va sudrash ajratildi (sudrash — ramka, tanlovsiz bo'lsa hamma panellar; sudramasdan bosish — panel tanlash); ekranda
  bir joydagi nuqtalar birga belgilanadi; belgilangan nuqta 12 px ichida bo'lsa butun tanlov suriladi; nuqtaga ≤7 px — nuqta strelkadan ustun.
- `modeling-cnc-price` 31: tanlovsiz ramka A ustidan boshlanib A va B nuqtalarini oldi, ikkalasi +20 mm; Front'da yon panel burchagi —
  2 nuqta, sudrash 600 → 620+ (to'rtburchak qoldi); A o'ng chekkasi belgilangan, B nuqtasi 4 mm yonida — A cho'zildi, B joyida.
  Foydalanuvchi stuli: tanlovsiz W, Front, ramka — 2 ustun uchidagi 4 nuqta, sudrash — ikkala ustun 869 → 943 mm.
- O'tdi: `npm run check`, `npm test`, `modeling-xlap`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`.

---

# Object ▾ menyusi: «Kesishma» tepada, menyu ekranga sig'adi — 2026-11-27 (Linux)

- `modeling-xlap` 8: 1280×640 da Object ▾ ochilganda birinchi bo'lim «Kesishma — bir-biriga kiygizish» (1. tekshirish, 2. O'zaro o'yiq,
  teshik bilan), menyu pastki chegarasi oynadan chiqmaydi, ortig'i menyu ichida g'ildirak bilan aylanadi. Qolgan to'plamlar bu
  o'zgarishdan keyin qayta ishga tushirilmagan (foydalanuvchi to'xtatdi).

---

# Chap panel ixcham, Furnitura oynasi akkordeon — 2026-11-27 (Linux)

- `modeling-xlap` 7: Shablonlar yo'riqnomasi yashirin, Panel ustiga olib borilganda suzuvchi oynada chiqadi va kursor ketgach yo'qoladi;
  «2D chizma / DXF» bo'limi Shablonlardan keyin (Butun korpusdan yuqorida). Furnitura oynasi — akkordeon: bir bo'lim ochilsa qolganlari
  yopiladi (Ulanish ham), «Ship-paz va O'zaro o'yiq (zazor, freza Ø)» ochilganda zazor maydoni ko'rinadi. 1366×768 skrinshotda oyna
  ekranga sig'adi. `npm test`, `panel3d-hw-ui`, `modeling-cnc-price`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select` o'tdi.

---

# Yuqori Object menyusida Modeling bo'limi (Furnitura, O'zaro o'yiq) — 2026-11-27 (Linux)

- `modeling-xlap` 6: Modeling ochiq — yuqori Object menyusida «Furnitura va teshiklar (sozlamalar)… Alt+F» ko'rinadi, bosilsa oyna
  ochiladi (Ship-paz: zazor, freza Ø maydonlari bor); Drawing'da bu bo'lim yashirin. `npm test`, `modeling-cnc-price`, `panel3d-hw-ui`,
  Electron `modeling-smoke`, `electron-smoke` o'tdi. Brauzerda Alt+F ni brauzerning o'zi ushlab qolishi mumkin — tekshirilmagan.

---

# O'zaro o'yiq (kiygizish) va kesishmalarni tekshirish — 2026-11-27 (Linux)

- Yangi `app/js/tools/panel3d-xlap.js` + `tests/panel3d-xlap.cjs` (6, `npm test` ichida): to'g'ri burchakli X — har biriga 16.4×25
  (zazor 0.2), ustun qovurg'adan to'liq o'tadi — ochiq o'yiq yoki «teshik» rejimida yopiq kesik, 15° qiya qovurg'a × ustun — o'yiq
  qiyalik hisobida kattaroq (1781 mm²), 20° qiya X — yarim-yarim + dogbone, parallel/uzoq — hech narsa, ikkiga bo'luvchi o'yiq rad.
- `tests/modeling-xlap.cjs` (5, haqiqiy Chromium, menyular orqali): File ▸ Import ▸ OBJ (yarim halqa qovurg'a + 3 ustun, ikkitasi 45°
  qiya) → Object ▸ Kesishmalarni tekshirish (3 juft) → A (hammasi) → Object ▸ O'zaro o'yiq → kesishma yo'q; qovurg'a nusxasi C, Y, −80,
  Enter (aniq −80), erkin burish 10°; tekshirish → O'zaro o'yiq → kesishma yo'q; Ctrl+Z / Ctrl+Y; CNC — 5 detal o'yiqli kontur bilan.
- Foydalanuvchi OBJ stuli (14 panel): asl modelda 35 juft kesishma (ustunlar qovurg'alarga 22–50 mm kirgan) topildi; butun stulga
  O'zaro o'yiq — 7 yarim-yarim (o'rta ustun), 28 to'liq o'tish, xatosiz, kesishma qolmadi (oddiy va «teshik bilan» rejimi, ~0.1 s).
  Suyanchiq tepasidagi qovurg'a nusxasi Y −28, 10° qiya → 3 ustun bilan kesishdi → O'zaro o'yiq → kesishma yo'q; detallar rasmga
  chiqarib ko'rildi (o'rta ustunda 7 yarim o'yiq, qovurg'alarda mos o'yiqlar, dogbone).
- Jarayonda topilib tuzatilgan: kesim burchagida sherik panel tugasa (ustun uchi qovurg'a yuzasida) o'yiq kesilmay qolardi; ustun
  halqani deyarli to'liq egallasa ochiq o'yiq qovurg'ani bo'lib yuborardi; o'yilgan qovurg'a nusxasida yarim-yarim o'yiq panelni bo'lardi —
  endi variantlar navbat bilan (yaqin/uzoq chekka, aniq kesim; yarim-yarim → biriga to'liq kesim) sinaladi; to'qnashuv tekshiruvi
  ichki kesiklarni hisobga oladi.
- O'tdi: `npm run check` (58), `npm test`, `modeling-cnc-price` (29), `panel3d-hw` (18), `panel3d-hw-ui`, `modeling-precision`,
  `smart-autoname`, `panel3d`, `panel3d-export`, Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`.
  EXE qayta yig'ilmagan. Haqiqiy CNC'da kesib, yig'ib ko'rilmagan.

---

# preview.3 dan keyingi o'zgarishlar ko'rib chiqildi — 2026-11-27 (Linux)

- Kod ko'rib chiqildi (3ca154e..HEAD: erkin burchak, kesik/o'yiq, Stretch, yordamchi chiziq, lineyka, OBJ import, Duplicate, zoom).
  Topilgan va tuzatilgan:
  - Stretch kesik nuqtasi kaliti `ops` dagi tartib raqami edi — avtomatik furnitura qayta qo'yilsa siljib, boshqa amalni ko'rsatardi; endi
    kesiklar tartibi (`c0`, `c1` …) — `modeling-cnc-price`da avtomatik teshik oldida turgan holat bilan tekshirildi.
  - Scale qiya panelda asosiy (burilmagan) o'qlar bo'yicha o'lchamni tanlardi — endi haqiqiy yo'nalish (`KEYW`): Y atrofida 60° polkada
    dunyo X → panel bo'yi.
  - Narx: ichki kesik maydoni material maydonidan ayriladi, kesik perimetri raspil/CNC metriga qo'shiladi (`panel3d-hw` — 200×200 kesik:
    −0.04 m², +0.8 m; detal yig'indisi jamiga teng).
  - Tekshiruv (`check`) panel chegarasida turgan kesik nuqtasini «chetdan chiqib ketgan» deb noto'g'ri ko'rsatardi — 0.05 mm chegara.
  - Yordamchi chiziqlar loyiha ochilganda tekshiriladi (buzuq yozuv o'tkaziladi) va panel qo'shilganda uzunligi sahnaga moslanadi.
- Brauzerda bir ketma-ketlikda (OBJ stul import → 22.5° burish → Drawing tahriri → Nusxa → yordamchi chiziq → lineyka → zoom → narx →
  DXF → snapshot/load → CNC → Modeling'ga qaytish): sahifa va konsol xatolari yo'q.
- `modeling-cnc-price` bir marta massiv qismida yiqildi (polka nusxalari paydo bo'lmadi), keyin 3/3 o'tdi — vaqtga bog'liq beqarorlik
  sifatida qayd etildi. Qolganlari o'tdi: `npm run check`, `npm test`, `panel3d-hw` (18), `panel3d-hw-ui`, `modeling-precision`,
  `smart-autoname`, `panel3d`, `panel3d-export`, Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`.

---

# Move strelkalari (Top) tekshirildi; nusxadan keyin Move asbobi — 2026-11-27 (Linux)

- Shikoyat: «o'q/tekislik bo'yicha ko'chirish ishlamay qoldi, ayniqsa Top». Qayta hosil qilinmadi: Top va Iso da X/Z strelka va XZ
  tekisligi, sudrash paytida X / Shift+Y / raqam — sintetik panellarda ham, foydalanuvchining OBJ stulida ham to'g'ri ishladi.
  Ehtimoliy sabab: yangi Nusxa (C) endi Move asbobiga o'tmasdi — nusxadan keyin Select asbobida strelkalar yo'q. Endi nusxa qo'yilgach
  Move yoqiladi; Select yordamida «strelkalar — Move (M)» deb yoziladi.
- `modeling-cnc-price` 28: Top — X strelka faqat X, Z — faqat Z, XZ — ikkalasi (Y o'zgarmaydi); nusxadan keyin Move faol.
  `npm test`, `modeling-precision`, `panel3d-export`, Electron `modeling-smoke` o'tdi. Windows'da qo'lda tekshirilmagan.

---

# Yordamchi chiziq (SketchUp kabi A→B), tanlash/Delete; lineyka magnit belgilari — 2026-11-27 (Linux)

- `modeling-cnc-price` 27 (haqiqiy sichqoncha, Front): yordamchi chiziq A(400;0)→B(400;600) — tik, A(0;0)→B(400;600) — qiya
  (d ≈ 0.555; 0.832), magnit uchlarga yopishdi; Select'da chiziqni bosish uni tanladi, Delete o'chirdi (panel qoldi); lineyka
  A — uch, B — o'rta: «200.0 mm … A: Uch → B: O'rta», nuqtalarda «A · Uch», «B · O'rta» belgilari qoldi.
- Topilgan xato: yordamchi chiziq ±20 m chizilardi — Chromium/SwiftShader skrinshotida (Iso) umuman ko'rinmadi; endi uzunligi sahnaga mos
  (gabarit diagonali ×2, kamida 2 m) — skrinshotda tik va qiya chiziqlar ko'rindi. Haqiqiy Windows videokartasida tekshirilmagan.
- O'tdi: `npm run check`, `npm test`, `panel3d-hw`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`. EXE qayta yig'ilmagan.

---

# Stretch (W) tanlangan panelga qulflanadi, nuqta aniq belgilanadi — 2026-11-27 (Linux)

- `modeling-cnc-price` 26: A tanlangan, W — B panel ustiga haqiqiy sichqoncha bilan bosish tanlovni o'zgartirmadi; A va B ni qamragan
  ramka faqat A ning 4 nuqtasini belgiladi; bo'sh joy — nuqtalar tozalandi, panel tanlovi qoldi; burchakdan 3–2 px narida bosish
  aynan `1:0` nuqtasini belgiladi. Kursor ostidagi nuqta oq katta nuqta bilan ko'rsatiladi (bosilsa aynan u belgilanadi).
- O'tdi: `npm run check`, `npm test`, `panel3d-hw`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`. EXE qayta yig'ilmagan.

---

# Drawing tahriri: qo'shni panel izlari yozuvsiz — 2026-11-27 (Linux)

- `modeling-cnc-price` 25: fasadni 2 marta bosganda va qiya polka holatida `YORDAMCHI` qatlamida matn yo'q, izlar va yordamchi
  chiziqlar avvalgidek. `npm test`, `panel3d-hw`, `panel3d-hw-ui`, `panel3d-export`, `modeling-precision`, Electron `modeling-smoke` o'tdi.

---

# OBJ import — har qanday bir xil qalinlikdagi shakl; Nusxa (C) Blender Duplicate kabi — 2026-11-27 (Linux)

- Foydalanuvchi fayli (Blender 4.2, 14 ob'ekt: 7 yoysimon «Section» qovurg'a, 7 «Cube» ustun) — avval faqat 8 uchli qutilar (7 ta)
  kirardi. Endi brauzerda (fayl tanlash orqali) 14 ta panel, hammasi 16 mm, qovurg'alar 52–247 nuqtali kontur bilan; skrinshotda
  stul Blender'dagidek; CNC'ga yuborilganda 14 detal 1 listga joylandi (material 52%). Fayl repoga qo'shilmadi (shaxsiy).
- `panel3d-export`: sintetik OBJ — yoysimon qovurg'a (o'rtasida o'yiq), Y atrofida 30° qiya plita (18 mm, `rt`), teshikli plita
  (ichki kvadrat → `k:'c'` kesik), uchburchak prizma (endi panel), qalinligi o'zgaruvchan «Pona» o'tkazib yuborildi (nomi bilan).
- `modeling-cnc-price` 25: File ▸ Import ▸ OBJ (haqiqiy `filechooser`) — yoy 800×400×16 (62 nuqta) va ustun 50×700×16, xabar
  «2 ta panel (qalinlik: 16 mm ×2)», CNC sahifasida yoy konturi. Nusxa: C — nusxa kursorga ergashdi, bosilgan joyda qotdi, keyin
  sichqoncha harakati uni siljitmadi; C + Esc — nusxa o'chdi; Ctrl+Z birinchi nusxani qaytardi. `modeling-smoke` (Electron) — C,
  sichqoncha bilan bosib qo'yish.
- O'tdi: `npm run check`, `npm test`, `panel3d-hw`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`. EXE qayta yig'ilmagan.

---

# Stretch kesik nuqtalariga, teshik joyida qoladi, teshik chetida ortiqcha chiziq yo'q — 2026-11-27 (Linux)

- `modeling-cnc-price` 23: Stretch (W) — kesikning o'ng ikki nuqtasi raqamli Δx=40 bilan surildi; kontur chap qirrasi −30 surilganda
  (profil boshi siljiydi) kesik va Ø5 teshik dunyoda joyida qoldi (u 100→130, 50→80; panel x 250→235, eni 530). Avval kontur surilganda
  teshiklar panel bilan birga siljib ketardi.
- Teshik chetidagi ortiqcha chiziq: kesik/o'yiq konturi jism qirrasi ustidan yana to'q sariq chiziq bilan chizilardi — olib tashlandi;
  skrinshotda teshik va o'yiq faqat jism qirralari bilan ko'rinadi.
- O'tdi: `npm run check`, `npm test`, `panel3d-hw`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`. EXE qayta yig'ilmagan.

---

# O'yiq haqiqiy chuqurcha, tekstura kesikda uziladi, qiya qo'shni panel izi — 2026-11-26 (Linux)

- `modeling-cnc-price` 22: o'yiq geometriyasida tubi (z = 8−6) bor, panel chetida o'yiq chuqurligida qirra chizig'i yo'q; teksturali
  panelda tekstura chizig'i kesik ustidan o'tmaydi; 10° (X o'qi atrofida) qiya polka — bokani Drawing'da tahrirlaganda izi qiya
  ko'pburchak (balandligi 16 mm dan katta, nomi bilan) va qiya qirra davom chizig'i. Skrinshotda ko'rildi (Chromium, SwiftShader):
  o'yiq chuqurcha bo'lib ko'rinadi, kesik — teshik, qiya iz — parallelogramm.
- Sabab topildi: tekstura chiziqlari faqat tashqi kontur bilan kesilardi — kesik/o'yiq ustidan o'tib «ortiqcha chiziq» bo'lib
  ko'rinardi; o'yiq faqat yuzadagi chiziq edi. OBJ eksportida ham endi kesik va o'yiq bor.
- O'tdi: `npm run check`, `npm test`, `panel3d-hw`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`,
  Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`. EXE qayta yig'ilmagan.

---

# Magnit ichki shakllarga, g'ildirak kursorga qarab yaqinlashadi — 2026-11-26 (Linux)

- `modeling-cnc-price` 21: kesik burchagi (u=100, v=200) ikkala yuzada, o'yiq yuzasi va 6 mm tubi magnit nuqtalarida; Right ko'rinishda
  haqiqiy `mouse.wheel` ×12 kursor ostidagi panel nuqtasida — masofa 1315 → 13 mm (avval eng kami 100 mm edi), nuqta kursor ostida qoldi
  (piksel yaxlitlash farqi hisobga olingan). Topilgan xato: birinchi variantda nishon nuqtasi noto'g'ri tartibda hisoblanib kamera
  sakrardi — tuzatildi. `npm run check`, `npm test`, `panel3d-hw` (18), `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`,
  `panel3d-export`, Electron `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select` o'tdi. EXE qayta yig'ilmagan.

---

# Erkin aylantirish, Drawing tahririda kesik/o'yiq, yordamchi chiziqlar qulfi — 2026-11-26 (Linux)

- `modeling-cnc-price` 20: Rotate halqasini sudrash (haqiqiy `startRotG`/`rotgMove` yo'li) — Free: 37.4°, Ctrl bilan −13° (butun gradus),
  qiya krisha gabariti cos/sin bo'yicha, qiya panelga ulanish chizig'i yo'q, snapshot/load saqlaydi, «To'g'rilash»; 90° — butun yo'nalish
  (`rt` o'chadi); Ortho: 30° — burilmaydi, 80° — 90° qadam. Drawing tahriri: `YORDAMCHI` qatlami qulflangan — Ctrl+A tanlamaydi,
  `snapSkipShape` yordamchi chiziqni o'tkazib yubormaydi (magnit ishlaydi); ichki to'rtburchak (kontur qatlami) → kesik, 3D geometriyada
  1 ta teshik; «O'yiq 6 mm» → `POCKET_Z6` (DXF'da); qayta ochilganda o'z qatlamida; CNC sahifasida detal guruhida.
- `panel3d-hw` 18: `k:'c'` — flat (cuts/polys), DXF qatlamlari, CSV, ko'zgu A→B, 90° burish, tekshiruv, sanitize; qiya panelga avtomatik teshik yo'q.
- O'tdi: `npm run check` (57), `npm test`, `panel3d-hw-ui`, `modeling-precision`, `smart-autoname`, `panel3d`, `panel3d-export`; Electron (xvfb)
  `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`. EXE qayta yig'ilmagan (oxirgi — 1.1.2-preview.3).
- Qo'lda (sichqoncha bilan halqani sudrash, ekranda ko'rish) Windows'da tekshirilmagan.

---

# Butun korpus ▸ Ko'chirish / burish tanlovga ishlaydi — 2026-11-26 (Linux)

- `modeling-cnc-price` 18: polka tanlanganda «Ko'chirish» Y+100 faqat polkani ko'chirdi, ↻ 90° faqat polkani burdi (boka joyida);
  tanlov olib tashlanganda sarlavha «butun korpus», ko'chirish ikkala panelga. `npm run check` (57), `npm test`, `panel3d-hw-ui` (8),
  `modeling-precision`, `smart-autoname`, Electron `modeling-smoke` o'tdi. EXE qayta yig'ilmagan (oxirgi — 1.1.2-preview.3).

---

# Reliz 1.1.2-preview.3 — 2026-11-24

- EXE: GitHub Actions «Windows portable preview» run 45344797133 (Windows Server 2022, commit 056eaa3) — **muvaffaqiyatli**: `npm run check`,
  `npm test`, manba va paketlangan dastur GUI sinovi (`test:electron`, pageErrors bo'sh), portable launcher ochilishi («Nomsiz loyiha — Rugby»).
  Reliz `v1.1.2-preview.3`: `Rugby-Portable.exe` 65 824 280 bayt, SHA256
  `99c57b737277cb17a6e0a63e212790a16cee6dd5db1ee01d5ba2d65ea035b2f0` (yuklab olingan fayl bilan Linux'da `sha256sum` mos keldi).
  Windows 10/11 da qo'lda sinov, SmartScreen/SAC va haqiqiy fayl dialoglari hali tekshirilmagan.

---

# Material bo'yicha list o'lchami — 2026-11-24 (Linux)

- `modeling-cnc-price` 17: xossalarda LMDF uchun 2750×1830 kiritildi → narx guruhida 2750×1830, LDSP oq — umumiy 2800×2070; snapshot `ms` va
  qayta ochish. `panel3d-hw` 17: narx hisobi material o'z list o'lchami bilan (XDF 1220×610 — 1 list). `npm test`, `panel3d-hw-ui`,
  `smart-autoname`, `modeling-precision`, Electron `modeling-smoke`, `electron-smoke` o'tdi.

---

# Panel materiali/o'lchami va smart ro'yxat barqarorligi — 2026-11-24 (Linux)

- `modeling-cnc-price` 17: tanlangan panelda «(materialsiz) · 568 × 500 × 16 mm (L×W×T)», «LDSP oq · 720 × 500 × 16», Material maydoni
  orqali MDF — «Material bo'yicha» ro'yxati MDF| ni ko'rsatadi.
- Topilgan va tuzatilgan: `smart-autoname` 4 martadan 3 tasida yiqilayotgan edi (1.1.2-preview.2 kodida ham) — maydon bosilganda o'ng panel
  siljiydi, `scroll` hodisasi smart ro'yxatni yopardi. Endi maydonning o'zi yoki uni o'z ichiga olgan panel siljisa ro'yxat qayta
  joylashadi; tuzatishdan keyin 3/3 o'tdi. Qolgan suite va Electron sinovlari o'tdi.

---

# J asbobi: ramka bilan ulanishlarni tanlash — 2026-11-24 (Linux)

- `modeling-cnc-price` (16): haqiqiy sichqoncha bilan o'ngdan chapga ramka — hamma ulagichli ulanish tanlandi, «Yo'q» → yevrovint/ekssentrik/
  shkant/polkaderjatel teshiklari olib tashlandi, Ctrl+Z qaytardi. `npm test`, `panel3d-hw` (17), `panel3d-hw-ui` (8), `modeling-precision`,
  Electron `modeling-smoke` o'tdi. EXE qayta yig'ilmagan (oxirgi — 1.1.2-preview.2).

---

# Reliz oldi tekshiruvi 1.1.2-preview.2 — 2026-11-23 (Linux)

- Ko'rib chiqishda topilgan va tuzatilgan: nusxa (C), Mirror va massivda ulanish tanlovi (`jc`, `jf`) asl sheriklarga bog'liq qolardi —
  endi nusxa sheriklariga o'tadi; nusxalar asl guruhga qo'shilib qolardi — endi yangi guruh; yakka «Nusxa» guruhsiz; loyiha ochilganda
  Stretch nuqta tanlovi tozalanadi; raqamli Stretch ham tanlovni saqlaydi (gizmo bilan bir xil).
- O'tdi: `npm run check` (57), `npm test` (18 + 24 + panel3d-hw 17), `panel3d`, `panel3d-export`, `panel3d-hw-ui` (8),
  `modeling-cnc-price` (16), `modeling-precision` (13), `smart-autoname` (14); Electron 31.7.7 (xvfb): `modeling-smoke`, `electron-smoke`,
  `panel-types-smoke`, `stretch-select`.
- EXE: GitHub Actions «Windows portable preview» run 45251499111 (Windows Server 2022, commit 3f2595a) — **muvaffaqiyatli**: `npm run check`,
  `npm test`, manba va paketlangan dastur GUI sinovi (`test:electron`), portable launcher ochilishi. Reliz `v1.1.2-preview.2`:
  `Rugby-Portable.exe` 65 823 708 bayt, SHA256 `f59ff22c120ffc4bba9ef030b23f9265c1a8b2e4ffabb2e79fc451826c5250e1`.
  Windows 10/11 da qo'lda sinov, SmartScreen va haqiqiy fayl dialoglari hali tekshirilmagan.

---

# CNC nesting, Drawing'da tahrirlash, aralash ulagich, narx — 2026-11-23 (Linux)

**Windows'da va haqiqiy CNC dastgohda sinalmagan. EXE yig'ilmagan.**

- `npm run check` (56 JS fayli, 0 xato); `npm test` (18 + 24 + `panel3d-hw`) — 0 yiqilgan.
- `tests/panel3d-hw.cjs` 14 ga kengaydi: aralash ulagich (krisha ekssentrik + shkant, dno yevrovint, «yo'q»); CNC detali (B tomondan
  ko'zgu, teksturali 720×500 burilgan, chet teshigi sanaladi, paz B da); narx (list soni, m² + chiqit, kromka, furnitura soni, detallar
  yig'indisi = jami, ustama, kiritilmagan narxlar, noto'g'ri narx tozalanadi).
- Qo'shimcha (o'sha kun): `modeling-cnc-price` 9 ga kengaydi — xossalarda o'ng boka 100 mm suriladi (ulanish teshiklari yo'qoladi),
  krisha 668 ga kengaytiriladi (chet teshigi u = 668, bokada qaytadi), Ctrl+Z / Ctrl+Y bitta qadam; CNC sahifasida Modeling va Cutlist
  bosilganda «Sahifa 1» ochiladi (7 panel); CNC sahifasining Drawing DXF'ida DRILL_D5_Z10 / DRILL_D7_THRU / DRILL_D15_Z13 qatlamlari.
  Barcha suite va Electron sinovlari qayta o'tdi.
- Qo'shimcha: Furnitura asbobi (J) — `panel3d-hw` 15 (ulanishga tur: dno chap — ekssentrik, o'ng — yevrovint; polkaning bir tomoni
  qotirilgan, ikkinchisi polkaderjatel; panel tanlovidan ustun; o'chirish), `modeling-cnc-price` 10 (haqiqiy sichqoncha: J, «Shkant»,
  chiziqni bosish, yana bosish — umumiy, Shift bilan 2 polka ulanishi → «Yevrovint», Ctrl+Z, V — asbob paneli yopiladi). Barcha suite va
  Electron sinovlari qayta o'tdi.
- Qo'shimcha: detal birkalari — `modeling-cnc-price` 11 (xaritada raqam/nom, DXF LABEL qatlamida 10 TEXT, birka oynasi 5 ta 70×37,
  40 talik varaq + 3 bo'sh katak, chop etish xostida 5 birka, HTML fayl). Birka HTML'i Chromium'da PDF qilindi: 1 sahifa, A4 (594.96×841.92 pt),
  kataklar 70×37 mm. Haqiqiy printerda va stiker varaqda o'lcham moslashi tekshirilmagan. `npm test` dagi `t24_guard` va workspace testlari
  DOM o'rinbosarida `document.head` yo'qligi sababli yiqildi — uslub qo'shish shunga himoyalandi, qayta o'tdi.
- Qo'shimcha (izoh bo'yicha): Furnitura oynasi ixcham — ulanish bo'limida faqat tanlangan turning maydonlari, qolgan bo'limlar yig'ilgan;
  J asbobi tugmalari bitta qatorda (qisqa nomlar, chap yuqorida). `panel3d-hw-ui` (8), `modeling-cnc-price` (11), `npm test` qayta o'tdi;
  1366×768 skrinshotda tekshirildi.
- Qo'shimcha (izoh bo'yicha): Furnitura oynasi o'ng chetda tor ustun (330 px): tugmalar tepada, sozlamalar ostida, natija faqat
  bo'lsa ko'rinadi, izoh «?» da. `panel3d-hw-ui` (8), `modeling-cnc-price` (11), `npm test` o'tdi; 1366×768 skrinshotda tekshirildi.
- Qo'shimcha (izoh bo'yicha): Modeling guruh/massiv/teng taqsimlash — `modeling-cnc-price` 12 (Ctrl+G, guruh a'zosini bosish — ikkalasi,
  Ctrl+Shift+G; yuqori Object ▸ Array → polka 2 nusxa −150 mm, polkaderjatel 6; Teng taqsimlash Y → 184/360/536; Ctrl+Z). Modeling'da
  Ctrl bilan bog'langan o'z buyruqlari endi ishlaydi (avval faqat Alt/F). Barcha suite va Electron sinovlari qayta o'tdi.
- Qo'shimcha (izoh bo'yicha): ekssentrik o'yig'ini ikkinchi yuzaga — `panel3d-hw` 16 (krisha–chap boka: Ø15 y=704 → 720, o'ng tomoni
  joyida, qaytarish), `modeling-cnc-price` 12 (J ▸ ⇅, haqiqiy bosish: B → A yuza, yana bosish — B).
- Qo'shimcha: Ship-paz (metallsiz) — `panel3d-hw` 17 (tortma qutisi: 4 tish + kesiklar, zazor 0.2, 8+4+4 dogbone yoyi DXF'da; o'rta polka:
  4 ichki teshik × 4 dogbone; CNC detali 400 mm; dogbone o'chiq — to'g'ri burchak), `modeling-cnc-price` 12 (J ▸ Ship-paz haqiqiy bosish,
  qaytarish). DXF ezdxf bilan ochildi (0 xato), rasmga chizilib ko'rildi: burchakda tish/kesik, o'rtada teshik — dogbone bilan.
- Qo'shimcha: Stretch strelkalari — `modeling-cnc-price` 13 (krisha o'ng nuqtalari tanlanib X strelkasi haqiqiy sichqoncha bilan sudraldi:
  +55 mm, faqat X, chap tomon joyida, ΔY = ΔZ = 0, tanlov qoladi). Ingichka gizmo bilan `modeling-precision` (13), Electron `modeling-smoke`,
  `stretch-select` va qolgan suite'lar qayta o'tdi; skrinshotda faol X sariq, qolganlari xira.
- Qo'shimcha (izoh bo'yicha): Drawing'da tahrirlash yordamchi chiziqlari — `modeling-cnc-price` 13 (fasad: 4 qo'shni iz — 2 boka, dno,
  krisha; chap boka izi u −2..14; nomlar YORDAMCHI qatlamida; «Modeling'ga qaytarish» natijasi o'zgarmadi). Topilgan: vaqtinchalik sahifa
  ochilganda model panellari yuklab tashlanardi — izlar endi sahifa almashishidan oldin hisoblanadi; chiziqlar kontur ostida chiziladi.
- Qo'shimcha (izoh bo'yicha): panel rangi — `modeling-cnc-price` 14 (avto neytral, qo'lda #336699, Avto, Materialga #aa7744, snapshot/load),
  `panel3d-hw` 17 (document-codec orqali `mc` saqlanadi). Barcha suite va Electron sinovlari o'tdi; skrinshotda to'q fonda aniq ko'rinadi.
- Qo'shimcha (izoh bo'yicha): kromka tasmasi yarim shaffof (0.3), chiziq qirra o'rtasida — Front va Iso skrinshotda panel chegarasi ko'rinadi;
  barcha suite o'tdi.
- Qo'shimcha: kromka qalinliksiz — `modeling-cnc-price` 15 (2 mm kromkali boka ko'rinishda 720.5×500.5, Cutlist'da 2 mm, 2.44 m);
  Electron `modeling-smoke` (kromka bosqichi bilan) va qolgan suite'lar o'tdi.
- `tests/modeling-cnc-price.cjs` (yangi, web build, Chromium 1243, haqiqiy sichqoncha, 8): xossalarda ulagich tanlash → korpus qayta
  teshiladi; Narx paneli (jami = hisob, narx o'zgarganda yangilanadi, localStorage, detal narxi, smeta CSV); CNC'ga yuborish — 3 sahifa,
  detallar list ichida, teshiklar detal ichida, teksturali burilmagan; detal konturini bosish butun guruhni tanlaydi, Move bilan boshqa
  joyga — 13 teshik nisbatan aynan joyida; Cnc ▸ Joylash qayta; model sahifasi saqlangan; fasadni haqiqiy 2 marta bosish → Drawing
  sahifasi, kontur + Ø8×12 → «Modeling'ga qaytarish» (joy o'zgarmadi, vaqtinchalik sahifa o'chdi), Ctrl+Z, Bekor.
- Qayta o'tdi: `panel3d-hw-ui` (8), `panel3d`, `panel3d-export`, `modeling-precision` (13), `smart-autoname` (14); Electron 31.7.7 (xvfb):
  `modeling-smoke`, `electron-smoke`, `panel-types-smoke`, `stretch-select`.
- Topilgan va tuzatilgan: xossalardagi ulagich qatori `.p3r` sinfi bilan qatorlarni tartiblash tugmalarini kutib `props()` ni buzardi;
  even-odd rasterda teshik aylanalari detal ichidagi «bo'sh joy» bo'lib qolardi (endi hisobga olinmaydi).

Tekshirilmagan: Electron'da smeta/DXF saqlash oynasi, katta loyihada (yuzlab detal) narx hisobi tezligi, haqiqiy dastgoh, Windows.

---

# Furnitura, teshik va CNC DXF — 2026-11-23 (Linux)

**Windows'da va haqiqiy CNC dastgohda sinalmagan. EXE yig'ilmagan.**

- `npm run check` (55 JS fayli, 0 xato); `npm test` (18 regressiya + 24 workspace + yangi `tests/panel3d-hw.cjs`) — 0 yiqilgan.
- `tests/panel3d-hw.cjs` (Node, 11): 7 detalli korpusda tur bo'yicha sonlar; yevrovint yuza va chet teshigi bir dunyo nuqtasida, chet teshigi
  panel ichiga; polkaderjatel, paz (4.5×8), petlya (21.5, 102/618) va planka (37, ±16), ruchka; ekssentrik; qayta joylash; 90° burish (4 marta —
  aynan) va Mirror; DXF R12 (qatlam jadvali, B tomoni ko'zgu koordinatasi, Ø5.2→Ø5, Ø12 sverlosiz, shablon); CSV; tekshiruv xabarlari;
  `document-codec` encode/decode orqali teshiklar saqlanishi.
- `tests/panel3d-hw-ui.cjs` (web build, Chromium 1243, 8): Alt+F va menyu; «Furnituralash» hisoboti va 3D halqalar; View ▸ yashirish;
  xossalarda qo'lda Ø5.2 teshik va o'chirish; Ctrl+Z; DXF va CSV fayl (web'da claude.ai downloads o'rnini bosuvchi bilan ushlandi —
  nom `rugby-cnc.dxf.txt`); sozlama eslab qolinishi va tanlov bo'yicha; snapshot/load.
- Brauzerda yaratilgan DXF **ezdxf 1.4.5** bilan ochildi: AC1009, 0 xato; CIRCLE 29, POLYLINE 14, TEXT 10, LINE 8; rasmga chizib ko'rildi.
- Qayta o'tdi: `panel3d`, `panel3d-export`, `modeling-precision` (13), `smart-autoname` (14); Electron 31.7.7 (xvfb): `modeling-smoke`,
  `electron-smoke`, `panel-types-smoke`, `stretch-select`.
- Topilgan va tuzatilgan: fasad bokani to'liq yopmasa (2 mm zazor) petlya ulanishi topilmasdi; uzun nomli DXF yozuvlari qo'shni chizmaga
  chiqardi (endi ikki qator); `t27_dxf` `tests/fixtures` dagi hamma DXF'ni o'qiydi — test u yerga fayl yozmaydi.

Tekshirilmagan: Electron'da DXF saqlash oynasi (CSV/OBJ eksporti bilan bir xil yo'l), CAM dasturida qatlamlarni sverloga bog'lash, haqiqiy
dastgohda teshik joyi, Windows.

---

# Portable EXE — 2026-11-04 (Linux'da yig'ildi, imzosiz)

**Windows'da ishga tushirib sinalmagan.** `Rugby-1.1.2-20261104-Portable-Unsigned.exe`, 65 700 255 bayt,
SHA256 `3bd2ffd9b1961a684e14243d317fb2f800f8be4e087acee4323ad606f8b0c053`; app.asar SHA256 `db2afe68…a431ce3` (EXE 7z bilan ochildi — bir xil).

- Yig'ish: `electron-builder --win --dir` → `patch-exe.js` (ikona, versiya) → `--win portable --prepackaged` (imzolash o'chiq).
- EXE ichidan olingan app.asar ustida Electron 31.7.7 (xvfb): `modeling-smoke`, `electron-smoke` (input-region bilan), `panel-types-smoke`,
  `stretch-select` — hammasi o'tdi. Asardagi `panel3d.js` manba bilan baytma-bayt bir xil.
- Build oldidan: `check` (54 fayl), `npm test` (18 + 24), `panel3d`, `panel3d-export`, `modeling-precision` (13), `smart-autoname` (14) o'tdi.
- Topilgan va tuzatilgan: ko'rinish almashganda Modeling kamerasining dunyo matritsasi keyingi render kadrigacha eski qolardi — shu orada
  hisoblangan proyeksiya (kromka qirrasi, magnit) eski kameradan olinardi. `modeling-smoke` kromka bosqichi shu sababli 5 marta ketma-ket
  yiqildi (y = −849, 300 ms dan keyin 738). `upd()` endi `cam.updateMatrixWorld()` qiladi; tuzatishdan keyin manba va EXE asar ustida o'tdi.

---

# Smart kiritish va Avto-nom tekshiruvlari — 2026-11-03 (Linux)

**Windows'da sinov o'tkazilmagan, EXE yig'ilmagan.**

- `npm run check` (54 JS fayli, 0 xato), `npm test` (18 regressiya fayli + 24 workspace testi), `panel3d`, `panel3d-export` o'tdi.
- Qo'shimcha (o'sha kun): `tests/smart-autoname.cjs` 14 tekshiruvga kengaydi — matnlar standart 70 va 55 saqlanishi; Drawing chiziq «3» →
  xira «040» → 3040 mm aynan, 1250 tarixga; Drawing Move + Ortho + setka: Δy = 0 (eski build'da shu harakat Δ = (−270, −70) berdi — xato
  1.1.2 da ham bor edi). Qolgan barcha testlar va Electron GUI testlari qayta o'tdi.
- `tests/smart-autoname.cjs` (web build, Chromium 1243, haqiqiy klaviatura) — dastlab 12 tekshiruv o'tdi: o'lcham yozuvi 3040 / 0.01 / 12.5 va
  standart 0.00; qayta ochilganda o'lcham matni va matn balandligi 70; nom «yon d» → kulrang davom, Tab, Enter; lug'at «ch» → «chap boka»;
  raqam «3» → ↓ Enter → eni 3040; Esc faqat ro'yxatni yopadi, bo'sh maydonda ↓; tarix 15 ta va qayta ochilganda saqlanadi; Avto-nom Front'da
  ikki yonma-yon korpus «A. …», «B. …» (polka 1/2 pastdan); CSV — «A. chap boka» bitta katakda, A… keyin B…; Back ko'rinishda chap/o'ng almashadi,
  harf saqlanadi; yopuvchi krishali yonma-yon korpuslar ham ajraladi, tanlab nomlash A, B; Alt+N; Edit ▸ Smart kiritish (20).
- `tests/modeling-precision.cjs` (13) qayta o'tdi. Electron 31.7.7 (xvfb): `modeling-smoke`, `electron-smoke`, `panel-types-smoke`,
  `stretch-select` o'tdi.
- Skrinshot: «o» yozilganda kulrang «o'ng boka» va ro'yxat (lug'at belgisi bilan).

Tekshirilmagan: Electron ichida localStorage saqlanishi (mavzu shu yo'l bilan saqlanadi), Drawing'dagi kanvasga yoziladigan masofa (input emas —
smart kiritish unga ulanmagan), Windows.

---

# Rugby 1.1.2 — Modeling aniqligi tekshiruvlari — 2026-11-03 (Linux)

**Windows'da sinov o'tkazilmagan, EXE yig'ilmagan** (so'rov bo'yicha: avval web versiya). Quyidagilar Linux konteynerida bajarildi.

- Manba Drive'dagi `Rugby 1.1.2` to'plamidan tiklandi: `rugby-1.1.2.patch` SHA256 `20f5799e…` (SHA256SUMS bilan bir xil),
  `three.min.js` SHA256 `9274bbce…`. Tiklangan holatda ham `check`, `npm test`, `panel3d`, `panel3d-export` o'tdi.
- `npm run check`: 53 JavaScript fayli, 0 xato. `npm test`: 18 regressiya fayli + 24 workspace testi, 0 xato.
- `tests/panel3d.cjs`, `tests/panel3d-export.cjs` o'tdi.
- Yangi `tests/modeling-precision.cjs` — web build (`scripts/build-web.py`) Chromium 1243 headless'da (WebGL: SwiftShader),
  haqiqiy sichqoncha/klaviatura hodisalari bilan, 13 tekshiruv o'tdi: uchdan ushlab uchga (350, 200, 0) aynan; Iso X strelkasi + magnit —
  Y/Z o'zgarmaydi, qirra x = 200; «125 Enter» — +125 aynan va bitta Ctrl+Z; Esc va o'ng tugma bekor qiladi; sudrash davomida X va Shift+Y;
  XZ tekislik dastasi Y ni saqlaydi; qadam 10 nisbiy; qirra magniti y = 300 aynan; hover belgisi; 3D kursor (Shift+o'ng tugma uchga aynan,
  Alt+S, Pivot = kursor bilan 90° → (200, 300, −92)); yangi panel burchagi uchga aynan; Front'da Z strelkasi yashirin, chuqurlik o'zgarmaydi.
  Repo ichidagi Playwright 1.62.1 o'z brauzerini topmasa: `RUGBY_CHROMIUM=/opt/pw-browsers/chromium node tests/modeling-precision.cjs`.
- Oldin/keyin solishtiruvi (eski 1.1.2 kodiga faqat test yordamchilari qo'shilgan nusxa, aynan shu sichqoncha harakatlari):
  Iso X strelkasi bilan A uchiga — eski: B.x = −100 (qirralar −250/−100/50, magnit ishlamadi), yangi: B.x = 50 (qirra 200 aynan);
  qadam 10, magnit o'chiq, B.x = 608 dan — eski: 910 (markaz yaxlitlandi, chet 2 mm siljidi), yangi: 908 (Δ = 300).
  Front'da uchni uchga sudrash va L-shakl ichki burchagi ikkalasida ham aynan chiqdi.
- Haqiqiy Electron 31.7.7 oynasida (xvfb, Playwright `_electron`): `modeling-smoke` (shu jumladan «Top + magnit: X/Z yopishdi, Y daraja saqlandi»),
  `electron-smoke` (ichida `input-region-checks`), `panel-types-smoke`, `stretch-select` — hammasi o'tdi.
- Skrinshot bilan ko'zdan kechirildi: gizmo (3 strelka, 3 tekislik kvadrati, oq markaz), o'q bo'ylab sudrashda faqat faol o'q va chiziq,
  magnit belgisi «Uch», pastki qatorda ΔX/ΔY/ΔZ, 3D kursor.

Tekshirilmagan: Windows 10/11 da qo'lda sinov, sensorli ekran/qalam, juda katta sahnada (yuzlab panel) magnit tezligi, Electron ichida
`modeling-precision` (u web build'da bajarildi; kod bir xil `panel3d.js`).

---

# Rugby 1.1.2 tekshiruvlari — 2026-10-30 (Linux, Electron 31.7.7)

**Windows'da haqiqiy GUI sinovi o'tkazilmagan.** Quyidagilar Linux'da (xvfb) bajarildi.

- `npm run check`: 53 JavaScript fayli, 0 xato. `npm test`: 18 regressiya fayli + 24 workspace testi o'tdi.
- `tests/panel3d.cjs`, `tests/panel3d-export.cjs` (OBJ, list hisobi, Cutlist eksport ustunlari, kromka L/W, tekstura, Stretch ko'chirish) o'tdi.
- Haqiqiy Electron oynasida (Playwright `_electron`): `electron-smoke`, `input-region-checks`, `modeling-smoke` (menyu, WebGL, Cutlist, kromka, hotkeylar va ularni almashtirish, Top + magnit daraja, umumiy o'lcham, tekstura, mavzu foni), `panel-types-smoke` (13 tur, polka g'ildirak/raqam/V, blok bo'laklari, shkaf blok 100 mm, Depth 100/0 → 100 mm farq), `stretch-select` (Drawing Stretch tanlov) — hammasi o'tdi.
- `modeling-smoke` va `electron-smoke` portable EXE dan olingan `app.asar` (EXE ichidagi bilan baytma-bayt bir xil) ustida ham o'tdi.
- Web versiya (bitta HTML) Chromium'da: sahifa xatolarisiz ochildi, Panel Types va Cutlist ishladi.

EXE: `Rugby-1.1.2-Portable-Unsigned.exe`, 65683487 bayt, imzosiz. SHA256: `705bb9ac446b19383807e414b78b99caf52838cb0b7782a5d42810c5bbc32e55`. app.asar SHA256: `03488f58b6d472cf98697bf7e94093f5f4a6e1cf54bc197eb9056851d1f51dba`.

---

# Preview.3 tekshiruvlari — 2026-10-15

**Mahalliy va Windows sinovlari o‘tdi.**
[Windows CI](https://github.com/iamsanbek-blip/MyCAD/actions/runs/38691041063).
Windows Server 2022, Electron 31.7.7, x64.

- 49 JavaScript fayli/asset tekshiruvi, 18 regressiya fayli, 24 workspace testi.
- Haqiqiy keyboard event bilan 8 katakda 3 davra son/decimal/manfiy qiymat
  kiritish: manba va paketlangan Rugby.exe da o‘tdi; fokus joyida qoldi.
- Katak ustida sichqoncha harakatida geometriya redraw chaqirilmasligi o‘tdi.
- Fokusni boshqa katakka o‘tkazgandan keyin eski katak uni qaytarib olmasligi o‘tdi.
- PNG hududini bekor qilish tarix/geometriyani o‘zgartirmadi.
- Teskari yo‘nalishda to‘rtburchak bilan belgilangan hududdan haqiqiy PNG yuklandi:
  1600×1600, ichkaridagi qizil shakl bor, tashqaridagi ko‘k shakl yo‘q.
- Oddiy PNG eksportda ikkala shakl ham borligi piksel bilan tekshirildi.
- Tayyor portable launcherning o‘zi ham Windowsda ochildi.

Reliz: [v1.1.0-preview.3](https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.0-preview.3).
EXE: 65 617 203 bayt. SHA256:

```text
16588ce8f85d975107500aaba07e9a1c0538aaa7561fa5781e55d1374f04ab85
```

Reliz kodi: `6fe451831295644c5d3e610108a2d59c0bbdf42c`.
BUILD-REPORT.json manba/paket/launcher natijalarini saqlaydi. CI artefaktida
input-region.json o‘lchangan vaqtlarni va piksel sonlarini, region-export.png
haqiqiy eksport natijasini saqlaydi.

Foydalanuvchining kompyuteridagi barcha 10–30 soniyali vaziyatlar takrorlanmagan.
Koddagi fokus o‘g‘irlash yo‘li alohida takrorlanib tuzatildi. Windows 10/11 da
qo‘lda qabul sinovi, haqiqiy Save/Open tanlovlari, SmartScreen/SAC va imzolash
hali tekshirilmagan. Native file-dialog tanlovlari GUI testda mock qilingan.

Quyidagi yozuv oldingi preview.2 ga tegishli.

---

# GitHub relizi uchun tekshiruv — 2026-10-11

**Windows tekshiruvlari o‘tdi.**
[GitHub Actions natijasi](https://github.com/iamsanbek-blip/MyCAD/actions/runs/38148716414).
Windows Server 2022, x64, Electron 31.7.7; versiya 1.1.0-preview.2.

- 49 JavaScript fayli sintaksisi va asset yo‘llari; 18 regressiya fayli va
  21 workspace testi — mahalliy va Windows muhitida o‘tdi.
- Haqiqiy Electron oynasida manba hamda paketlangan `Rugby.exe`: chizish,
  ikki sahifa, hotkey remap, IPC/disk orqali saqlash va qayta ochish o‘tdi.
- Toolbar 1600×950 va 1100×700 kontent o‘lchamida tekshirildi.
- Aynan tarqatilgan `Rugby-Portable.exe` odatiy flaglar bilan ishga tushirildi;
  `Nomsiz loyiha — Rugby` asosiy oynasi ochilib, ishlashda davom etdi.

Reliz: [v1.1.0-preview.2](https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.0-preview.2).
EXE hajmi: **65 612 574 bayt**. SHA256:

```text
8af408c37ba7afc9d30453a39fd175ed315866b804b57720f55525ad85898784
```

Relizdagi `BUILD-REPORT.json` aniq commit, paket hashi va test dalillarini,
`SHA256.txt` yuklangan EXE hashini saqlaydi. GitHub’dagi asset digest ham ushbu
hash bilan teng. Kod commit: `28f5460efee25c02183ecc9a4cae80cc7d90261d`.

**Chegaralar:** GUI avtomatlashtirishda fayl dialogining tanlovi mock qilingan;
GPU grafik testda o‘chirilgan, portable launcher esa odatiy flaglar bilan ochilgan.
Windows 10/11 foydalanuvchi muhiti, haqiqiy fayl tanlash dialoglari,
SmartScreen/SAC va imzolangan build hali tekshirilmagan. EXE imzosiz.

Dastlabki CI urinishida serverning kichik boshlang‘ich oynasi test nuqtasini
panel ostida qoldirdi; test kontent o‘lchami aniq belgilandi. Keyingi buildda
PowerShell dotted CLI parametrini noto‘g‘ri ajratdi; `scripts/build-preview.cjs`
strukturali builder API chaqiruviga o‘tkazildi. Yakuniy CI to‘liq o‘tdi.

Quyidagi tekshiruvlar 2026-10-03 nusxasiga tegishli. Ularning EXE hashlari
GitHub’da qayta qurilgan faylga tatbiq etilmaydi.

---

# Tekshiruv holati

Sana: 2026-10-03. Versiya: 1.1.0-preview.2.

## Avtomatik kod sinovlari

`npm run check`: 49 renderer/main/preload/desktop JavaScript fayli sintaksisi
va HTML asset yo'llari. `npm test`: 18 eski regressiya fayli va 21 workspace
xulq-atvor testi. Yakuniy chiqish: `verification/node-tests.txt`.

Workspace testlari renderer fayllarini index.html tartibida Node VM ichida
yuklaydi; DOM/canvas test dubllari va mock dialoglar ishlatiladi. Qamrov:
sahifa izolyatsiyasi, alohida undo/redo, ko'p sahifali round-trip, v1 migratsiya,
xato open/cancel, saqlash va tahrir poygasi, native ko'prik, qatlam dirty holati,
input hotkeylari, konflikt/remap, kirill klaviaturasi va atomik disk yozuvi.

Tashqi DXF fixturelari asl manbada yo'q; t27/t29 sintetik geometriya bilan
ishlaydi. Katta haqiqiy foydalanuvchi chizmalari hali tekshirilmagan.

## Preview.2 tayyor EXE tekshiruvi — o'tdi

Yangi imzosiz EXE payload CRC tekshiruvidan o'tdi (20 fayl). To'liq Rugby.exe
arxiv a'zosi oqim orqali dekodlanib, hash'i qurilgan runtime bilan tengligi
tekshirildi; qolgan 19 fayl chiqarilgan nusxalar bilan solishtirildi.
ASAR ichidagi 60 ilova fayli manba bilan baytma-bayt mos. Dalil:
`verification/portable-integrity.json`, `verification/portable-payload-test.txt`.

Grafik sinov aynan tayyor EXE'dan chiqarilgan app.asar bilan bajarildi:
`RUGBY_TEST_APP_PATH=/.../resources/app.asar` orqali. Natija, versiya va ASAR
SHA256: `verification/preview2-gui/electron-smoke.json`; screenshot shu papkada.
Bu NSIS launcher yoki Windows runtime'ini ishga tushirish testi emas.

## Haqiqiy Electron grafik sinovi — o'tdi

Linux, Electron 31.7.7, Playwright 1.62.1, Xvfb. Buyruq:

```bash
xvfb-run -a -s '-screen 0 1920x1080x24' npm run test:electron
```

`tests/electron-smoke.cjs` haqiqiy renderer, preload va main jarayonlarini
alohida vaqtinchalik profil bilan ishga tushiradi. Quyidagilar tekshirildi:

- `app://local/` oyna va desktop API ishga tushishi; JavaScript page error yo'q.
- Sichqoncha bilan birinchi sahifada to'rtburchak, ikkinchisida aylana chizish.
- Ctrl+PageUp bilan o'tishda har sahifaning chizmasi alohida qolishi.
- F10 oynasida Chiziq hotkey'ini Q ga almashtirish va haqiqiy klaviatura
  hodisasi bilan shu buyruqni bajarish.
- Ctrl+S, Yangi, Ctrl+O orqali ikkala sahifani haqiqiy IPC/disk bilan
  saqlash va qayta ochish. Fayl tanlash dialogining javobi mock qilingan.
- 1600×950 va 1100×700 kontent o'lchamida toolbar tugma/input/select'lari
  yon panelga chiqmasligi. `app/css/workspace.css` shu kuzatilgan xatoni tuzatdi.

Oldingi manba sinovi: `verification/electron-smoke.json` va `.png`.
Yangi paket sinovi: `verification/preview2-gui/electron-smoke.json` va `.png`.
Testda GPU o'chirilgan; root Linux konteynerida Chromium sandbox flagi faqat
test uchun beriladi. Oddiy dastur ishga tushishi bu flaglarni olmaydi.

## Hali bajarilmagan

Native Windows GUI, Windows fayl dialoglari, ishlab chiqarishdagi GPU yo'li,
imzolangan EXE build, Windows Authenticode PowerShell tekshiruvi va Smart App
Control enforcement sinovi bajarilmagan. Imzolash sertifikati/xizmati yo'q.
Linux testi Windows qabul sinoviga teng emas.

Avval tarqatilgan EXE arxiv/payload butunligi va embedded app.asar mosligi oldin
tekshirilgan. Ammo launcher va ichki EXE imzosiz. Rasmda ko'rsatilgan Smart App
Control bloki sababli u ishlaydigan yakuniy tarqatma deb hisoblanmaydi.
`verification/unsigned-pe.json` va `verification/preview1-build.json` eski
faylga tegishli. `PORTABLE-BUILD.json` va `verification/preview2-pe.json` esa
yangi imzosiz preview.2 faylini qayd etadi.

## Windows qabul sinovi — kutilmoqda

1. `docs/PORTABLE.md` bo'yicha ishonchli sertifikat bilan qurish. EXE va
   barcha ichki EXE/DLL uchun imzo tekshiruvi o'tsin.
2. Tayyor EXE'ni Smart App Control yoqilgan Windows 11 da ikki marta bosib
   ishga tushirish. Oddiy foydalanuvchi huquqi bilan o'rnatishsiz oyna ochilsin.
   Shuningdek, qo'llab-quvvatlanadigan Windows 10 x64 muhitida tekshirish.
3. 1100×700 va 1600×950 da oynani ko'rish; ishlab chiqarishdagi odatiy GPU
   yo'lida chizish, pan/zoom va barcha asboblarni sinash.
4. Har sahifada boshqa shakl; Undo/Redo o'sha sahifaga ta'sir qilsin.
   Sahifa nomlash, nusxa, tartib va o'chirishni sinash.
5. Haqiqiy Save As/Open dialoglari; saqlab yopish/qayta ochishda ikkala
   sahifa, qatlam, o'lchov va relief saqlansin.
6. Saqlanmagan ish bilan New/Open/Close: Bekor, Saqlash, Saqlamay chiqish;
   Save As bekor qilinsa loyiha qolishi kerak.
7. F10 orqali L ni Q ga almashtirish; keyingi ishga tushirishda saqlansin.
   Reset, konflikt va matn maydonidagi Ctrl+A/C/V/Z ni tekshirish.
8. Haqiqiy v1 .dbe va DXF nusxalarini ochish; DXF eksportini CAM dasturida
   birlik/yoy/qatlam bo'yicha solishtirish. Portable fayl assotsiatsiyasini
   avtomatik almashtirmasligini hisobga olish.

Natijaga Windows versiyasi, EXE SHA256'i, test sanasi va muvaffaqiyatsiz
qadamlarni yozing. Himoya sozlamalarini o'zgartirish qabul mezoni emas.


## 1.1.2 — Panel 3D (2026-10-15)
- `npm run check`: 0 xato. `npm test`: 24 o'tdi. `node tests/panel3d.cjs`: DXF parser va hujjat round-trip o'tdi.
- BAJARILMAGAN: haqiqiy Electron/WebGL oynasida 3D ko'rinish, sudrash, chizish, Windows build. Ular qo'lda sinalishi kerak.

## 2026-10-31 — List hisobi va material bo'yicha tanlash
- `xvfb-run -a node tests/modeling-smoke.cjs`: o'tdi (List hisobi: m², kromka, to'liq eni; Material filtri eksport va hisobga; Select by material — ro'yxat va Shift+M).
- `npm run check`, `npm test`, `panel-types-smoke`, `stretch-select`, `electron-smoke`: o'tdi. Web build Chromium'da skrinshot bilan tekshirildi. EXE qayta yig'ilmadi.
