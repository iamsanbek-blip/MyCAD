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
