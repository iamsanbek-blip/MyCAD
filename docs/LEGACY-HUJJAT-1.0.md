# RUGBY — to'liq texnik hujjat

> Bu fayl loyihaning **butun xotirasi**. Chat yopilsa, buni yangi suhbatga
> tashlab, ishni to'xtagan joyidan davom ettirish mumkin.
>
> **Versiya:** 1.0.0 · **Sana:** 2026-08-08 · **Kod hajmi:** 9997 qator JS, 41 modul

---

## 1. BU NIMA

**Rugby — CNC Corner Editor.** Windows uchun desktop dastur (Electron).

Asosiy vazifasi: DXF chizmani ochib, burchaklarga **dogbone / T-bone / fillet /
chamfer** relieflarini qo'yish va listga joylashtirish (nesting), so'ng DXF
sifatida qaytarish.

**Nima YO'Q:** G-code chiqarish. Dastur DXF beradi, keyin CAM dasturi kerak.

### Fayllar

| Fayl | Nima |
|---|---|
| `Rugby-1.0.0-Portable.exe` | **tarqatish uchun** — 69 MB, o'rnatishsiz ishlaydi |
| `rugby-desktop/` | **manba kod — SIZDA DOIMIY TURSIN** |
| `rugby-desktop/INSTALLER-QURISH.bat` | Windows'da Setup.exe qurish (2 klik) |

---

## 2. PAPKA TUZILMASI

```
rugby-desktop/
├── main.js              Electron asosiy jarayoni (oynalar, protokol, dialoglar)
├── preload.js           asosiy oyna ↔ tizim ko'prigi
├── preload-splash.js    splash ↔ tizim ko'prigi
├── splash.html          to'liq ekran splash + WebGL atlas shaderi
├── patch-exe.js         .exe ga ikona yozish (Wine o'rniga, sof JS)
├── package.json         electron-builder sozlamalari
├── INSTALLER-QURISH.bat Windows'da bir klik bilan qurish
│
├── app/                 ILOVANING O'ZI
│   ├── index.html       barcha UI + skript teglari (TARTIB MUHIM)
│   ├── css/style.css
│   ├── assets/logo-mark.png
│   └── js/  ← 37 modul, quyida
│
├── assets/              splash uchun brend fayllari
├── build/               icon.ico, icon.png (o'rnatuvchi uchun)
├── brand-kit/           barcha ikona o'lchamlari + wordmark
└── test_*.js, t*.js     test to'plami (quyida)
```

---

## 3. MODULLAR (41 ta, 9997 qator)

### `geometry/` — sof matematika, DOM'ga tegmaydi

| Fayl | Qator | Nima |
|---|---|---|
| `core.js` | 45 | vektor, `parseNum` (vergul!), `safeSize`, `pickDirection` |
| `segments.js` | 342 | **segment zanjiri**: `shapeToSegs`, `shapeFromSegs`, `segArcInfo`, `coalesceSegs` |
| `offset.js` | 307 | **OFFSET dvigateli** — chiziq/yoy saqlanadi |
| `snap.js` | 381 | snap nuqtalari, `findDimensionNear`, `findDrawnLineNear` |
| `arcfit.js` | 107 | zich nuqtalarni yoyga siqish, `circleFrom3Pts` |

### `model/` — ma'lumot

| Fayl | Qator | Nima |
|---|---|---|
| `state.js` | 132 | global holat, undo/redo (`pushHistory`) |
| `layers.js` | 40 | qatlamlar, `drawnLines` shu yerda e'lon qilingan |
| `corners.js` | 374 | **relief geometriyasi** — dogbone/tbone/fillet/chamfer |
| `shapes.js` | 189 | `buildDrawnModifiedPaths` — reliefni shaklga qo'llash |

### `tools/` — asboblar

| Fayl | Qator | Nima |
|---|---|---|
| `transform.js` | 221 | Move/Rotate/Scale/Mirror/Stretch |
| `edit.js` | 267 | Trim/Extend/Join/Explode + **OFFSET UI** |
| `edit-grips.js` | 231 | trim bajarilishi, grip tahriri |
| `fillet.js` | 281 | **Fillet/Chamfer asboblari** |
| `dimension.js` | 206 | o'lchovlar + **yoy uzunligi (`arclen`)** |
| `text.js` | 314 | matn annotatsiyasi + **`askText` oynasi** |
| `cnc.js` | 371 | **nesting** (MaxRects + variantlar) |
| `area.js` | 213 | **maydon va perimetr** — yoylar aniq formula bilan |
| `nest-raster.js` | 178 | detal ichidagi bo'sh joyni topish |
| `align.js` `array.js` `clipboard.js` `groups.js` | 362 | qolganlari |

### `ui/` — ekran va kiritish

| Fayl | Qator | Nima |
|---|---|---|
| `render.js` | 726 | **eng katta** — canvas chizish, `cornerDotR`, `haloText` |
| `input-mouse.js` | 316 | mousedown — barcha rejimlar |
| `input-drag.js` | 273 | mousemove/mouseup/wheel |
| `input-keys.js` | 362 | barcha hotkeylar |
| `panels-draw.js` | 335 | chizish paneli, `finishDraw`, `undoDrawPoint` |
| `panels-list.js` | 300 | burchaklar ro'yxati, bulk bar |
| `panels-layers.js` | 166 | qatlamlar paneli |
| `input-view.js` | 67 | pan/zoom + **ko'p global o'zgaruvchi e'loni** |
| `input-guard.js` | 168 | **maydon qotishini davolash**: izolyatsiya, fokus reset, debounce |
| `i18n.js` | 246 | **UZ/EN lokalizatsiya** — lug'at + `t()` + `applyI18n()` |
| `theme.js` | 152 | **5 ta mavzu + grid ko'rinishi** (`localStorage` da saqlanadi) |
| `reference.js` | 102 | fon rasm shabloni |

### `io/` — fayl kiritish/chiqarish

| Fayl | Qator | Nima |
|---|---|---|
| `dxf-import.js` | 445 | **DXF o'qish** — SPLINE/ELLIPSE/INSERT/BLOCK + birlik |
| `dxf-export.js` | 203 | DXF yozish + TEXT entity |
| `file-load.js` | 141 | fayl tanlash |
| `raster.js` | 287 | PNG eksport |
| `project.js` | 169 | `.dbe` loyiha fayli |
| `filemanager.js` | 269 | **New/Open/Save/Save As** + Electron native dialoglar |

---

## 4. ⚠️ ENG MUHIM QOIDA: YUKLASH TARTIBI

Modullar **ES modul emas** — oddiy `<script>` teglari, global scope'ni baham
ko'radi. `index.html` dagi tartib **qat'iy**:

```
 1. geometry/core.js        20. tools/edit.js
 2. io/dxf-import.js        21. tools/fillet.js
 3. model/state.js          22. tools/dimension.js
 4. model/layers.js         23. tools/text.js
 5. model/corners.js        24. geometry/arcfit.js
 6. model/shapes.js         25. tools/edit-grips.js
 7. ui/render.js            26. ui/input-drag.js
 8. ui/input-view.js        27. ui/input-keys.js
 9. geometry/segments.js    28. ui/panels-list.js
10. geometry/offset.js      29. io/file-load.js
11. geometry/snap.js        30. io/dxf-export.js
12. ui/panels-draw.js       31. ui/panels-layers.js
13. ui/input-mouse.js       32. io/raster.js
14. tools/transform.js      33. io/project.js
15. tools/align.js          34. io/filemanager.js
16. tools/array.js          35. tools/nest-raster.js
17. ui/reference.js         36. tools/cnc.js
18. tools/clipboard.js      37. app.js
19. tools/groups.js
```

**Nega tartib g'alati?** Bu asl bitta-faylli dasturdagi kod tartibi. O'zgartirsangiz
`let` o'zgaruvchilar TDZ xatosi beradi. Yangi modul qo'shsangiz — mantiqan bog'liq
fayldan **keyin** joylang.

---

## 5. ARXITEKTURA KELISHUVLARI (buzmang!)

### 5.1 Segment zanjiri — barcha geometriyaning asosi

Shakl ikki ko'rinishda saqlanadi:
- `points[]` — **zich nuqtalar**, faqat chizish uchun
- `grips[]` + `segMeta[]` — **tahrirlanadigan tuzilma**

```js
segMeta: ['start', 'straight', 'arcMid', 'arcEnd', 'straight', ...]
```

`shapeToSegs(l)` → `[{t:'L',a,b}, {t:'A',a,m,b}, ...]`
`shapeFromSegs(segs, closed, template)` → yangi shakl

**Yoy = 3 nuqta**: `a` (boshi), `m` (o'rtasi), `b` (oxiri). Radius/markaz
`segArcInfo()` orqali hisoblanadi.

⚠️ **Yopiq zanjirda oxirgi segment yoy bo'lsa** `segMeta` `'arcMid'` bilan
tugaydi va `gripsMetaToSegs` uni ARC sifatida yopadi. Bu maxsus holat —
buzilsa Join yoyni chiziqqa aylantiradi.

### 5.2 Burchak relieflari

`corners[]` massivi. Har element:
```js
{pi, vi, x, y, e1, e2, theta, bis, mode, size, offset, uid, source}
```

- `cornerKey(c)` = `source:uid:vi` — **joydan mustaqil**, shuning uchun shakl
  ko'chganda sozlamalar saqlanadi
- `bis` — bissektrisa, **burchak ichiga** qaraydi
- `e1`, `e2` — qirralar bo'ylab, burchakdan tashqariga

**DOGBONE FORMULASI** (2026-07-29 da belgisi to'g'irlangan):
```
O = C + bis·ext                          ← markaz
t = ext·cos(θ/2) + √(r² − ext²·sin²(θ/2))  ← devor kesimi
oraliq:  −r  <  ext  <  +r/sin(θ/2)
```
- **MUSBAT ext** → markaz burchak **ichiga** → material **ko'proq** qoladi
- **MANFIY ext** → markaz **materialga** → material **kamroq** qoladi
- **Radius (`c.size`) hech qachon o'zgarmaydi**

### 5.3 Offset (`geometry/offset.js`)

1. Har segment alohida suriladi (chiziq→chiziq, yoy→yoy, radius ±d)
2. Qo'shnilar kesishuvgacha kesiladi/cho'ziladi (AutoCAD `OFFSETGAPTYPE=0`)
3. O'z-o'zini kesuvchi halqalar olib tashlanadi

⚠️ **Yopiq zanjirda oxirgi juftlik `out[0]` bilan ishlashi shart**, aks holda
birinchi segmentning kesimi yo'qoladi.

### 5.4 Fillet

Markaz = ikkala qirrani `r` ga surib, kesishuvini topish. Chiziq–chiziq,
chiziq–yoy, yoy–yoy uchun **bir xil** ishlaydi.

⚠️ To'g'ri chiziqlarda **4 ta nomzod** chiqadi va hammasi burchak uchidan bir
xil uzoqlikda. Shuning uchun tegish nuqtalari qirra **ichida** ekanini
tekshirish shart (`paramOnSeg`), aks holda fillet teskari tomonga tushadi.

### 5.5 Electron cheklovlari

| Ishlamaydi | O'rniga |
|---|---|
| `window.prompt()` | `askText()` — `index.html#askOverlay` |
| `showSaveFilePicker` (ishonchsiz) | `window.desktop.saveProjectAs()` → IPC → `dialog.showSaveDialog` |
| `file://` da secure context | `app://` protokoli (`main.js`, `registerSchemesAsPrivileged`) |

---

## 6. TUZATILGAN XATOLAR JURNALI

Har biri **o'lchov bilan** tasdiqlangan.

| # | Muammo | Sabab | Yechim |
|---|---|---|---|
| 1 | Move'da relief joyida qolardi | `corners` keshlangan koordinatalarda | `applyLiveTransform` oxirida `detectCorners()` |
| 2 | Join yoyni chiziqqa aylantirardi | yopiq zanjir doim LINE bilan yopilardi | `meta[last]==='arcMid'` → ARC bilan yopish |
| 3 | Snap midpoint topmasdi | chizilayotgan shakl faqat endpoint berardi | `currentDrawSegs()` + tartib `endpoint→midpoint→center` |
| 4 | PNG'da o'lcham boshqa joyda | aligned uchun proyeksiya **yo'q edi** | `projW()` — ekrandagi bilan bir xil |
| 5 | Yorliq ortida katta oq quti | `fillRect` | harf konturi bo'ylab `strokeText` halo |
| 6 | Splash'da uzilgan chiziq | kubik interpolatsiya, katak chegarasida egrilik **1924×** sakrardi | kvintik `f³(6f²−15f+10)` + sin'siz hash |
| 7 | Ctrl+S yangi fayl yaratardi | brauzer API ishlamay "yuklab olish"ga tushardi | Electron native dialog + yo'lni eslab qolish |
| 8 | Offset chalkash chiziq berardi | **zich nuqtalar** ustida ishlardi | segment asosidagi yangi dvigatel |
| 9 | Matn ishlamasdi | `prompt()` Electron'da yo'q | `askText()` oynasi |
| 10 | Matn **ba'zan** ishlamasdi | fokus chiqsa harflar hotkeyga tushardi | `document` + **capture** bosqichida ushlash |
| 11 | Extension yozib bo'lmasdi | vergul (`-1,8`) `type=number` da bo'sh qiymat | `parseNum` + `type=text inputmode=decimal` |
| 12 | Extension chegarada to'xtardi | `±0.95r` — manfiy tomon nohaq qisqargan | asimmetrik `cornerOffsetRange()` |
| 13 | **Extension belgisi teskari** | `O = C − bis·ext` | `O = C + bis·ext`, chegaralar almashdi |
| 14 | Burchak nuqtalari juda katta | zoom'dan mustaqil, min 2px | bone radiusiga bog'liq, kichkina bo'lsa chizilmaydi |
| 15 | Yoy o'lchovi tanlanmasdi | `findDimensionNear` da `arclen` shoxobchasi yo'q | shoxobcha qo'shildi |
| 16 | Maydonlar **ba'zan** raqamni qabul qilmasdi | `renderList()` `innerHTML=''` bilan qayta quradi → yozilayotgan maydon DOM'dan yo'qoladi, fokus ketadi | fokus + kursor o'rni + qiymat saqlanadi va qaytariladi |
| 17 | Ba'zi maydonlarda vergul ishlamasdi | 25 ta maydon hali `type=number` edi | hammasi `type=text inputmode=decimal`, 9 ta o'quvchi `parseNum` ga o'tdi |
| 18 | Grid o'chirib bo'lmasdi, rang tanlash yo'q | funksiya yo'q edi | `ui/theme.js` — 5 mavzu + grid toggle |
| 30 | Web (brauzer) versiyasi va ikki tillilik yo'q edi | — | `js/ui/i18n.js` — UZ/EN, 57 kalit, `localStorage` da saqlanadi. `rugby-web/` — Electron'siz statik bundle (40 modul, 0 Node bog'liqligi), joylashtirish uchun `JOYLASHTIRISH.md` (Netlify Drop) |
| 29 | **Import qilingan naqsh "singan" ko'rinardi** | uchta sabab: ① `genArcThrough()` yoyni SOBIT 16 segmentga bo'lardi — r=92 mm da og'ish 0.45 mm ② import moslash bardoshi 0.25 mm edi (o'lchov: 0.26 mm og'ish) ③ tekislash bardoshi FAYL BIRLIGIDA hisoblanardi, ya'ni duymli faylda 25 barobar qo'pol | `ARC_SAG_TOL=0.02` bilan moslashuvchan yoy (33→156 nuqta), moslash bardoshi 0.05 mm, tekislash mm da. **Og'ish 1.53 → 0.06 mm** |
| 28 | **Internetdan olingan DXF ochilmasdi** ("chizilgan element topilmadi") | parser faqat 5 turni bilardi: LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC. Bezak chizmalari esa deyarli har doim **SPLINE** dan iborat (Illustrator/CorelDRAW/Inkscape chiqishi) | `io/dxf-import.js` to'liq qayta yozildi (146 → 445 qator): SPLINE (NURBS, De Boor), ELLIPSE, INSERT/BLOCK (ichma-ich + MINSERT), POINT, SOLID, 3DFACE. Moslashuvchan tekislash: 100 634 → 13 952 nuqta. `$INSUNITS` → mm konversiyasi |
| 27 | **Stretch/Move: ortho da masofa noto'g'ri** (200 yozilsa 191, 180, 130 chiqardi) | tartib teskari edi: avval kursor yo'nalishida `dist` qo'yilib, keyin `applyOrtho()` uni o'qqa PROYEKSIYA qilardi → uzunlik `dist·cos(θ)` ga qisqarardi | AVVAL yo'nalish cheklanadi (ortho + burchak snap), KEYIN masofa qo'yiladi. Endi kursor qanchalik og'sa ham aynan `dist` |
| 26 | **Snap doim "midpoint" deb ko'rsatardi** — mo'ljalning o'rtasini topib bo'lmasdi | ko'chirilayotgan shaklning O'ZI ham snap manbai edi. U kursorga ergashgani uchun uning midpoint/endpoint/center nuqtalari doim kursor yonida bo'lardi | `snapSkipShape()` — transform/stretch paytida tanlangan shakllar va grip sudralayotgan shakl snap manbaidan chiqariladi |
| 25 | **Maydon fokus olmay qolardi** (halqa yo'q, kursor miltillamaydi, Backspace ishlamaydi) | `input-guard.js` sichqoncha hodisalarini ham to'xtatardi. `mouseup` **window** da, shuning uchun kanvasda sudrab, maydon ustida qo'yib yuborilsa `mouseup` yo'qolardi va `panning`/`selecting`/`draggingGrip` `true` bo'lib qolardi | sichqoncha izolyatsiyasi OLIB TASHLANDI (u keraksiz edi — `mousedown`/`dblclick` canvas'da). O'rniga `wireDragSafetyNet()`: `mouseup` dan keyin va tugmasiz harakatda qotgan holat tozalanadi. Fokus ikki bosqichda kafolatlanadi + ko'rinadigan `:focus` uslubi |
| 24 | **Maydonlar ba'zan qotib qolardi** (oynadan chiqib kirsa tuzalardi) | ① maydon hodisalari kanvasga o'tardi ② sudrash paytida Alt+Tab bosilsa `mouseup` kelmasdi va `panning`/`draggingGrip`/`selecting` `true` bo'lib qolardi ③ `bulkSize`/`bulkOffset` har harfda `renderList()` chaqirib, yozilayotgan maydonni DOM'dan yo'q qilardi | yangi `ui/input-guard.js`: capture bosqichida izolyatsiya + `blur`/`visibilitychange`/`mouseleave` da 11 ta bayroqni tozalash + `requestRedraw()` debounce. `input` ishlovchilaridan `renderList()` olib tashlandi |
| 23 | Ctrl+A brauzer matnini tanlardi (panel ko'karib ketardi) | Ctrl+A umuman ishlanmagan → brauzerning standart "select all" ishlardi. Sichqoncha bilan sudralganda ham shu | `selectAllObjects()` — chizmadagi shakl/o'lchov/matnni tanlaydi (yashirin va qulflanganlar himoyalangan). `body{user-select:none}`, kiritish maydonlarida tanlash qoldi. Escape — tanlovni bekor qiladi |
| 22 | **Grid [G] va Matn [T] hotkeylari ishlamasdi** | G polygon uchun, T trim uchun allaqachon band edi va **oldinroq** turardi — birinchisi `return` qilib, keyingisiga navbat kelmasdi | grid → **H**, matn → **B**. `t22_keys.js` endi barcha to'qnashuvlarni avtomatik tekshiradi |
| 21 | Ctrl+V nusxani kutilmagan joyga qo'yardi | doim 10 px o'ngga-pastga siljitardi, kursor hisobga olinmasdi | interaktiv joylashtirish: nusxa kursorga ergashadi, snap ishlaydi, bosilganda tushadi. Ctrl+Shift+V — eski tez usul |
| 20 | Shift+A o'rniga arc chiqardi | chizish bloki Shift'ni tekshirmasdi va maydon hotkeyidan **oldin** turardi | maydon hotkeyi barcha asbob hotkeylaridan oldinga ko'chirildi + chizish bloki `!e.shiftKey` tekshiradi |
| 19 | Maydon o'lchash yo'q edi | — | `tools/area.js`. `signedArea(points)` yoyda ~1.7 mm² xato beradi, shuning uchun segment + `r²/2·(θ−sinθ)` formulasi |

---

## 7. QURISH

### Portable (men Linux'da shunday qurdim)

```bash
npm install
npx electron-builder --win --dir --x64
node patch-exe.js                                    # ikona (Wine o'rniga)
npx electron-builder --win portable --x64 --prepackaged dist/win-unpacked
```

⚠️ `package.json` da `"win": {"signAndEditExecutable": false}` bo'lishi kerak,
aks holda Linux'da `rcedit` uchun Wine talab qilinadi.

### Setup.exe (faqat Windows'da)

`INSTALLER-QURISH.bat` ni ikki marta bosing. Yoki:
```
npm install
npm run dist        →  dist/Rugby-1.0.0-Setup.exe
```

**Nega faqat Windows'da?** NSIS o'chirgichni yaratish uchun installer'ni bir
marta **ishga tushirishi** kerak.

---

## 8. TESTLAR

```bash
node test_after.js       # geometry, snap, join, nesting   (28)
node test_dim_text.js    # o'lchov joylashuvi, matn, DXF   (37)
node test_move_file.js   # Move+relief, chizish, fayl      (44)
node t5_offset.js        # offset geometriyasi
node t7_fillet.js        # fillet/chamfer + explode/join
node t8_final.js         # extension chegaralari
node t13_all.js          # vergul, nuqta o'lchami, arclen
node t15.js              # asimmetrik oraliq, matn oynasi
node t17.js              # dogbone belgi spesifikatsiyasi
node t10_nest.js         # nesting benchmark
```

`harness.js` — modullarni brauzersiz yuklaydigan umumiy muhit.
`flat.js` — yoylarni tekislash va kesishish tekshiruvi.

**Testlar `ROOT` yo'liga bog'liq** — boshqa joyga ko'chirsangiz, fayl boshidagi
`ROOT` ni to'g'irlang.

---

## 9. BAJARILMAGAN / CHEKLOVLAR

| Narsa | Holat |
|---|---|
| **G-code** | yo'q — eng katta bo'shliq |
| **Nesting isrofi** | qisman. Detal ichidagi bo'sh joy qaytariladi (yarim oyda 23%), lekin list sonini kamaytirmaydi. To'liq true-shape (NFP) — alohida katta ish |
| Kod imzosi | yo'q → Windows "noma'lum nashriyot" deydi (~$200/yil) |
| Fillet | faqat **yonma-yon** qirralar orasida |
| Chamfer | faqat teng masofa (AutoCAD ikkitasini oladi) |
| Setup.exe | Linux'da qurilmaydi (Wine kerak) |
| Yoy o'lchovi | faqat bitta yoy; birlashtirilgan uzunlik yo'q |

---

## 10. YANGI SUHBATDA NIMA DEYISH

Chat yopilsa, yangi suhbatda **shu faylni va `rugby-desktop.zip` ni** tashlang,
so'ng shunday yozing:

> Bu mening CNC dasturim — Rugby. Zip ichida manba kod, hujjatda butun
> tarixi bor. Hujjatning 4-bo'limi (yuklash tartibi) va 5-bo'limi
> (arxitektura kelishuvlari) ni albatta o'qing — ular buzilsa dastur ishlamaydi.
> Testlar 8-bo'limda, o'zgartirishdan keyin yugurtiring.
>
> Menga kerak: [bu yerda nima kerakligini yozing]

Agar faqat bitta narsani tuzatish kerak bo'lsa, modul nomini ayting —
masalan «`tools/fillet.js` da radius juda katta bo'lsa xato bermayapti».
Shunda butun kodni emas, o'sha faylni ko'radi.

---

## 11. MAVZU VA GRID (`ui/theme.js`)

5 ta mavzu: **To'q ko'k** (asosiy), **Qora**, **Kulrang**, **Oq (bosma)**,
**Chizma (blueprint)**.

Har mavzu belgilaydi: kanvas foni, grid ranglari (mayda va yirik), o'q ranglari,
halo rangi, panel ranglari (`--bg`, `--panel`, `--line`, `--text` ...).

- `themeIsLight()` — yorug'lik darajasini hisoblaydi (>140 → yorug')
- `body.lightTheme` klassi qo'shiladi → CSS yorug' fon uchun tuzatishlarni qo'llaydi
- **Halo rangi mavzuga ergashadi** — aks holda oq fonda to'q halo chirkin ko'rinadi
- Tanlov `localStorage` da (`rugby.theme`, `rugby.grid`) — chizmaning bir qismi emas

**Grid:** panel katakchasi yoki **[G]** hotkey. `drawWorldGrid()` boshida
`gridVisible` tekshiriladi.

Yangi mavzu qo'shish: `THEMES` obyektiga bitta yozuv qo'shing, boshqa hech
narsa kerak emas — select avtomatik to'ldiriladi.

---

## 12. HOTKEYLAR

⚠️ **Bir harf ikki joyda bo'lsa, birinchisi `return` qiladi va ikkinchisi
HECH QACHON ishga tushmaydi.** Yangi hotkey qo'shishdan oldin `t22_keys.js`
ni yugurtiring — u barcha to'qnashuvlarni topadi.

**Chizish:** L=line · C=circle · K=rect · A=arc · **G=polygon** · N=none
**Tahrirlash:** M=move · R=rotate · S=scale · M+I=mirror · W=stretch ·
**T=trim** · O=offset · F=fillet · Shift+F=chamfer · J=join · E=explode · D=dimension
**Boshqa:** **B=matn** · **H=katak** · Shift+A=maydon
**Ctrl:** A=hammasini tanlash · N=yangi(Alt+N) · O=ochish · S=saqlash · Shift+S=saqlash… · I=import ·
C/X/V=nusxa/kesish/joylashtirish · Shift+V=tez qo'yish · D=duplicate · G=guruh ·
Shift+G=guruhdan chiqarish · Z/Y=undo/redo

Chizish paytida (Line asbobi faol): A=yoy segmenti, L=to'g'ri segment —
bular boshqa kontekst, shuning uchun to'qnashuv emas.

**Bo'sh qolgan harflar:** P, Q, U, V (yolg'iz V bo'sh — faqat Ctrl+V band)

**Escape** kontekstga qarab ishlaydi: chizish paytida chiziqni tugatib saqlaydi ·
asbob faol bo'lsa uni yopadi · aks holda tanlovni bekor qiladi.

---

## 13. MAYDON (`tools/area.js`)

**▦ Maydon** tugmasi yoki **Shift+A**. Yopiq shakllarni tanlab bosiladi.

Nima uchun `signedArea(l.points)` yetarli emas: `points[]` — yoylar mayda
chiziqchalarga bo'lingan zich nuqtalar, ular bilan maydon **taxminiy** chiqadi.
Sinovda yarim doirali shaklda xato **1.65 mm²** bo'ldi.

Aniq usul:
1. Segment vatarlaridan ko'pburchak maydoni (shoelace)
2. Har yoy uchun tuzatma: `A = r²/2 · (θ − sin θ)`
   CCW yoy qo'shiladi, CW ayiriladi

**Teshiklar**: bir kontur boshqasining ichida yotsa, avtomatik ayiriladi.
`shapeInsideShape()` bbox + nuqta-ko'pburchak testi bilan aniqlaydi.

Birlik avtomatik tanlanadi: `mm²` → `sm²` (>1e4) → `m²` (>1e6).

---

## 14. BREND

| | HEX |
|---|---|
| Cyan | `#5DE0FE` |
| Navy | `#17263D` |
| Fon | `#0B1220` |

Splash foni — **WebGL shader** (`splash.html` ichida `FS` o'zgaruvchisi),
video emas. Har ekran o'lchamiga moslashadi, loop chegarasi yo'q.
