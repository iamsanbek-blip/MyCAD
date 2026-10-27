# AI va sinxronlash — 2026-10-27, 1.1.1-preview.4

- `npm run check`: 65 JavaScript fayli, 0 syntax/asset xato.
- `npm test`: 18 eski regression fayli va barcha behavior suite o‘tdi.
- `npm run test:assistant`: 15 test o‘tdi: aniq korpus/polka, AABB oraliq, hisob,
  deklarativ reja validatsiyasi, stale reja, bir undo, makros qayta yuklash,
  uch mustaqil profil orqali Drive-papka almashuvi, offline qayta ulanish,
  konflikt/tombstone, private GitHub SHA update va mock OpenAI web/vision so‘rovlari.
- `npm run test:3d`: barcha geometriya, anchoring va stretch testlari o‘tdi.
- Windows Server 2022: source GUI, packaged GUI va portable launcher sinovlari o‘tdi.
  `tests/assistant-gui.cjs` haqiqiy Electron IPC/disk bilan 8 panel ko‘rigi, bitta
  Undo, makrosni reload qilish va profil papkasiga yozishni tekshirdi.
  Dalil: https://github.com/iamsanbek-blip/MyCAD/actions/runs/40520150329
  EXE relizi: https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.1-preview.4
  Build commit: 80ac43563455ad265c891665a37d9433c69ed845.
  EXE SHA256: 2d1f6ea474bb0d710f60a9370ba9a918388cc9ae2221dd22bf3ceec312b2ecb0.
- Real OpenAI API chaqiruvi, real private GitHub tokeni va ikki fizik kompyuterning
  Google Drive klienti bilan end-to-end sinov bajarilmadi; mos foydalanuvchi ulanishlari kerak.
- Windows 10/11 qo‘lda qabul sinovi va code signing bajarilmadi.

Quyidagi natijalar oldingi versiyalar tarixidir.

---

# 1.1.1-preview.2 verification (2026-10-20)

- PASS: syntax/assets, 58 renderer JavaScript files.
- PASS: 18 legacy regression files; 55 workspace/workshop/command/model/migration/export cases.
- PASS: 17 Three.js math/pointer-double cases: exact endpoint/midpoint snapping, occlusion, fractional target locking, box selection, extrusion, view cameras and stretch.
- Registry audit dispatches every registered command once in the intended scope and validates default shortcuts/button targets. This is not proof of every interactive path.
- New migration tests cover 12 legacy orientation/quarter-turn combinations, custom matrix/contour, hidden/quantity/reference lines, v3 roundtrip and transactional rejection.
- Native export unit test writes real text/binary bytes, replaces a prior file atomically, and rejects unsupported data.
- Windows source/packaged/portable GUI evidence is generated in the release workflow. Consult BUILD-REPORT.json for the exact tested commit, platform, artifact hash and results. At this source checkpoint that CI run is pending.
- This host has no approved Sites browser-control capability: direct browser visual QA was not performed here. DOM doubles are not a browser screenshot or Windows test.
- Windows 10/11 user acceptance, actual chooser interactions, SmartScreen/SAC, accessibility and performance on large production drawings remain manual acceptance items.

Previous verification notes below are historical and do not prove this new build.

---

# 1.1.1-preview.1 — tekshirildi (2026-10-15)

GitHub Actions run **38726650306**, commit `527ec43375a2720c18736a2c19327514d3af52c9`.
Windows Server 2022 x64, Electron 31.7.7.

- Syntax/assets: 51 JS, 0 xato; 18 legacy fayl + 24 workspace + 4 panel-model test.
- Source va packaged GUI: WebGL, 48px shablonlar, 16mm panel, aniq o‘lcham va
  rotation, alohida qalinlik, undo/redo, nusxa, orbit, v3 roundtrip, sahifalar,
  XY Ortho chiziq — o‘tdi. Geometriyaning Z qalinligi ham tekshirildi.
- 8 raqamli katak × 3 yozish: eng sekin ketma-ketlik source 68ms, packaged 65ms.
- PNG hudud va butun chizma eksporti haqiqiy yuklangan faylda tekshirildi.
- Portable launcher standart GPU flaglarida ochildi va oyna tirik qoldi.
- EXE: 65,738,586 bytes; SHA256:
  `5af10ef08d3f0a42febd2e2617a2f745a0082a480e68e1d50d95a19527cf6f92`.

Dalillar: relizdagi BUILD-REPORT.json va Actions windows-verification artefakti.
GUI fayl-dialog tanlovlari mock qilingan. Windows 10/11 qo‘lda, SmartScreen/SAC
va foydalanuvchi grafik kartasida sinov bajarilmagan. EXE imzosiz preview.

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

## Browser workshop update — 2026-10-16

- Node regression suites and syntax/assets check passed. Added six adapter/export tests covering contour apply/cancel, isolated original drawings, save/page-switch safety, single undo/redo, three orientations, thickness, input-safe Space shortcut and column persistence.
- Two Three.js math tests passed: both skin surfaces remain 16 mm apart under arbitrary rotation and XY scaling; point-to-point translation lands the chosen source exactly on the target. Run `node --test tests/panel-anchors.test.cjs` after dependency installation.
- Browser/WebGL interaction QA was not run: supported control-browser tooling is unavailable in this managed environment. DOM doubles and math tests do not verify visual output or physical mouse interactions.
- Manual acceptance remaining: create each orientation; hover anchors; choose source and target, toggle Space, cancel with Escape; double-click and apply L/U contours; export and reorder cut-list columns. No Windows build was made for this browser iteration.

## Selective 1.1.2 merge into browser 1.1.1 — 2026-10-16
- Existing regressions and syntax/assets checks passed; 11 focused tests passed (workshop + anchors suites).
- Added quantity roundtrip/undo/counting and validation, property-order persistence, export filtering/decimal/delimiter options, and orthographic projection invariance tests.
- HTML nesting and unique IDs passed. Browser graphics/manual interaction checks remain unperformed because supported browser tooling is unavailable.
- Scope and differences documented in MERGE-1.1.2-INTO-1.1.1.md.

## Fixed application menu — 2026-10-16
- Stable global Rugby / File / Edit / Cnc / Drawing / Modeling row, separate from contextual toolbar.
- File actions forward to existing file handlers; drawing import/export switches from Modeling to Drawing. Edit uses shared undo/redo, shortcut settings and language functions.
- Syntax/assets and existing regressions passed. DOM-double check passed for mutually exclusive dropdowns, closing, and language action. Global CAD keyboard listeners ignore an open menu.
- Graphical browser testing unavailable; fixed positioning and visual appearance have not been manually verified.

## Compact header and View controls — 2026-10-17 (Tashkent)
- First row reduced to 36px. Second row is Iso, Top, Front, Left, Right, Back, View; only the active preset has the brand fill, orbit rotation clears the preset to Custom. Zoom/pan retain the matching orientation.
- View: edge-only Wireframe, Solid, Hide selection, Isolate selection, Unhide all. Visibility is temporary, page-scoped, excluded from raycasting/anchors, and does not delete or alter cut-list data.
- Existing Node regressions and syntax/assets passed. Camera/anchor/visibility tests passed, including opposite directions, orthographic projection, same-page visibility rebuild and page reset. DOM-double check confirms exclusive active highlight and Custom status.
- Graphical browser QA unavailable; manual appearance and mouse interaction remain unverified.

## Panel / Make / Object menus — 2026-10-17
- Added sections immediately after View. Actual inspector inputs moved into Panel (single DOM instance); type is optional persisted text. Existing saved property order gains the new field without resetting user order.
- Make groups magnet, snap types, Ortho/Free, step, two-point 3D ruler and XY helper line. Object groups select/move/copy/rotate, local contour mirror X/Y, thickness-preserving XY scale (labelled Stretch), exact point placement and delete.
- Mirror is a local contour reflection, not a world-plane mirror of an assembly. Stretch changes full panel width/height, not a partial vertex selection. Ruler is temporary and creates no saved geometry; helper lines use the existing XY drawing storage.
- Node regressions, syntax/assets, HTML nesting/unique IDs passed. Added mirror undo/dimension/thickness/type roundtrip and menu exclusivity tests. Supported graphical browser QA unavailable; mouse and visual checks not performed.

## Modeling interaction update — 2026-10-18
- Build and syntax/assets checks passed (55 JavaScript files). Main Node regression run passed: 18 legacy files plus workspace/workshop suites.
- Nine additional anchor/camera/stretch tests passed using real Three.js math and DOM doubles. Covers fixed opposite corners, arbitrary rotation, preserved thickness, invalid contour rejection, numeric preview cancel/apply. Workshop tests cover one-time rectangle conversion and save/reload, scoped hotkeys, and atomic multi-panel batches.
- Graphical WebGL and physical mouse interaction QA was not performed: supported browser tooling is unavailable. These results do not certify browser gesture behavior. No Windows package was built.
- True corner Stretch now supersedes the full-dimension Stretch description in the previous entry. Scale remains separate.

## Modeling magnet and neutral controls — 2026-10-18
- Removed viewport magnet button; Make menu and Space retain control. Active tool/view text uses brand color on neutral backgrounds; inactive commands are white. Panel previews are 28px.
- Placement target picking now permits occluded anchors on visible panels, excludes hidden panels and the moving source, and uses nearer depth for overlapping projected anchors. Moving source is translucent until commit/cancel.
- Build, syntax/assets and main regressions passed. Ten Three.js anchor/camera/stretch tests passed, including a blocked B corner, exact A-to-B translation, and hidden-target exclusion.
- Browser/WebGL appearance and physical mouse interaction remain unverified because supported browser tooling is unavailable.

## Move snapping, rectangle selection and XLSX — 2026-10-18
- Root cause: the free Move drag branch bypassed nearest-anchor lookup entirely. It now captures source A and resolves target B on every drag update, excluding all moving panels. Selected panels move by one common delta; cancel restores originals. Moving panels become translucent. Axis gizmos retain axis constraints.
- Blank-space left drag selects fully enclosed visible panels; Shift adds them. Selection changes create no geometry history.
- Panel menu now opens raskroy export; optional selected-panel scope, TXT/CSV and real typed XLSX follow column order and thickness filter. XLSX text cells are literal, not formulas.
- Syntax/assets and Node regressions passed. Four viewport pointer-event tests passed with mocked renderer/controls but real Three.js geometry: vertex snap, midpoint snap, cancel/magnet off, rectangle selection and hidden exclusion. Anchor/stretch suites also passed.
- XLSX independently read with Python openpyxl: typed numeric cells, Unicode/formula-like literal names and column order verified; ZIP CRC valid. No Excel desktop or real browser/WebGL gesture test performed (supported browser tooling unavailable).

## Browser Save/Open lifecycle — 2026-10-19
- Browser Open uses the standard file input, avoiding filesystem picker permission failures inside embedded sites. Reads are serialized, errors preserve the current document, and selecting the same file again is supported.
- Save falls back to a .dbe download on SecurityError/NotAllowedError/NotSupportedError. Cancellation stays cancelled; failed downloads do not mark the project saved. Native desktop I/O is unchanged.
- Optional workspace field restores Modeling/Drawing/Cnc on open; old 3D files select Modeling automatically. Rehydration skips automatic rectangle conversion. File identity is visible in the global header; Modeling receives file status messages. UTF-8 BOM accepted.
- Syntax/assets and regressions passed. Added browser integration coverage with mocked picker/download and fresh renderer context: two-page 2D/3D save-upload roundtrip, thickness, workspace, camera fit invocation, same-file reopen, BOM, invalid upload, failed download and cancelled picker. These are DOM doubles, not real browser file dialogs or WebGL.

## Drawing profile extrusion and snap precision — 2026-10-19
- Extrude dialog defaults to 500mm. Selected closed contours (or all closed contours when none selected) extend from Z=0, preserving XY footprint. Rectangles, including rotated ones, use the short side as material thickness and extrusion as panel height; other contours use independent extrusion thickness. Explicit repeat extrusion replaces panels from the same source drawing with one undo operation.
- A grab now uses the same visible anchor as hover instead of reselecting through the panel. B snaps hold within a 24px release radius; Move recalculates the final pointer-up location. Exact placement refuses an unsnapped B while magnet is enabled. The marker ring is centered at the coordinate and its label is offset.
- Syntax/assets, CSS parsing, all legacy/workspace tests passed. Seventeen Three.js/DOM-double tests passed including rotated extrusion footprint/Z extents, preserved 16mm thickness, final pointer-up snap, lock release, and Stretch regressions. Workshop test covers multiple profiles, replacement without duplication, undo, resize and save/reopen.
- No real browser/WebGL or visual gesture QA: supported browser tooling unavailable.

## Multi-selection, delivery and command audit — 2026-10-20 (Tashkent)
- Delete and Copy act on the full Modeling selection, with one undo step. Copies keep relative spacing and no longer inherit sourceDrawingId. Ctrl+A selects visible panels; Ctrl+Shift+E opens the cut list.
- Browser file fallback now shows a persistent download link inside a modal, plus text fallback for DBE/TXT/CSV and tabular fallback for XLSX. Save awaits explicit confirmation before clearing dirty state. Cancel preserves unsaved state. Native successful filesystem writes keep their existing behavior. This avoids treating an attempted hidden link click as proof of a disk write.
- Cut-list exports validate nonempty results and surface errors/status in the dialog.
- All 62 registered default hotkeys passed conflict, button-target and scoped-dispatch checks (command execution stubbed for the exhaustive dispatch audit). Real adapter tests cover multi-delete/copy/undo, settings controls, export button payloads, and save confirmation/cancellation. Existing remap persistence, focus protection, document roundtrip and drawing geometry regressions passed.
- npm run check and npm test passed; new command-audit suite is part of npm test. DOM/canvas doubles and mock browser APIs were used. No real browser download, native file dialog, WebGL or exhaustive manual settings verification was performed: supported browser-control tooling is unavailable. Browser sandbox download blocking remains possible; persistent user-clickable link, separate-window link and text fallback are supplied instead of claiming silent success.
