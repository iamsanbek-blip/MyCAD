# Rugby 1.1.2 — Panel 3D

Yuqori asboblar panelida «🦴 Bone edit», «✏ Chizish» yonida yangi «Panel 3D» rejimi.
Bu rejim CNC va raspil korpus mebel uchun 3D model; 2D chizmaga tegmaydi.

Fayllar: `app/js/tools/panel3d.js`, `app/css/panel3d.css`, `app/js/vendor/three.min.js`
(three.js r128, MIT, `docs/THREE-LICENSE.txt`; offline ishlaydi). `index.html` da
three.min.js → panel3d.js `shortcuts.js` dan oldin yuklanadi; `app.js` `Panel3D.wire()` ni chaqiradi.

## Imkoniyatlar
- 1 universal panel (48×48 ikonka): bosilsa kursorga ilashadi, bosib qo'yiladi; yo'nalishi joriy ko'rinishga mos (Old — frontal, Yon — vertikal, Yuqori — gorizontal, izometrik — frontal). Standart qalinlik 16 mm (tepada o'zgaradi, har panelda alohida ham).
- Shakl: to'rtburchak, uchburchak, beshburchak, L, U; panelga 2 marta bosib o'zingiz chizish (kontur yangi shakl bo'ladi).
- Chizish bo'limidagi yopiq konturlar («2D chizmadan» → «Yopiq konturlarni extrude qilish»): Extrude (mm, odatda 500) bo'yicha 3D panel bo'ladi. Chizma tekisligi: Reja (yuqoridan, Y bo'ylab extrude) yoki Old (XY, Z bo'ylab). To'rtburchak konturda eng kichik o'lcham panel qalinligi bo'ladi (16×500 kontur + 500 extrude = 500×500×16 panel); boshqa shakllar kontur panel bo'ladi (qalinlik = extrude). Keyin hamma o'lcham o'ng paneldan o'zgartiriladi.
- Magnit (Probel): panel qo'yishda va sudrashda nuqtalari boshqa panellarning nuqtalariga yopishadi. «Magnit turi»: Uchlar (Endpoint/Vertex), O'rta nuqta (Midpoint), Markaz (Center). Yopishgan nuqtada belgi chiqadi.
- Asboblar (V/M/R/S): Tanlash (bosib yoki ramka: chapdan o'ngga — to'liq ichida, o'ngdan chapga — tegib o'tgan; Shift — qo'shish), Ko'chirish, Aylantirish (panelga bosing — ko'rinish o'qi atrofida 90°, Shift — teskari; hozircha faqat 90° qadam), Masshtab (sudrash; qalinlik o'zgarmaydi). Ko'rinishni aylantirish: Alt+chap yoki o'rta tugma; siljitish: o'ng tugma.
- Gizmo (3ds Max kabi) tanlangan asbobga moslashadi: Tanlash — gizmo yo'q; Ko'chirish — X/Y/Z strelkalari (qadam va magnit bilan); Aylantirish — uch halqa (sudrab 90° qadam bilan); Masshtab — o'qlar uchida kublar va markaziy kub (hamma yo'nalish).
- Undo/Redo: Ctrl+Z, Ctrl+Y (yoki Ctrl+Shift+Z) va ↶ ↷ tugmalari (100 qadam, panel o'zgarishlari uchun).
- Panel xossalari qatorlari (nomi, eni, bo'yi, qalinlik, soni, X/Y/Z, shakl, orientatsiya) ⠿ dan sudrab yoki ↑↓ bilan tartiblanadi; tartib brauzerda eslab qolinadi. «Soni» (qty) raspil ro'yxatida hisoblanadi; raspil ro'yxati va CSV ustunlari ham shu tartibda chiqadi.
- File → Import/Export OBJ: «OBJ — Blender (metr)» va «OBJ — millimetr» (har panel alohida ob'ekt `Nomi_id`, Y yuqoriga — Blender importida standart o'qlar), «OBJ — 3D panellar (Modeling)» import: faqat quti (8 uchli) ob'ektlar panelga aylanadi, eng kichik o'lcham qalinlik, metrdagi fayl avtomatik mm ga o'tkaziladi, boshqa shakllar o'tkazib yuboriladi.
- List hisobi (raskroy): o'ng paneldagi «List hisobi» — list o'lchami (standart 2800×2070), kesim (kerf 4 mm), chekka qirqim (10 mm); qalinlik bo'yicha guruhlab MaxRects usulida necha list ketishi va foydalanish % hisoblanadi (taxminiy: aylantirish mumkin, tola yo'nalishi hisobga olinmagan).
- Kromka (qirra lentasi): Object ▸ Kromka (K) — qirraga olib borib bosing (moviy chiziq ko'rsatadi), qirra bo'yaladi; qalinlik Panel ▸ Kromka (0.4 mm). Panel ▸ Kromka tugmalari: tanlanganga hamma/uzun/qisqa tomonlar, olib tashlash. Raspil ro'yxati va eksportda ustunlar: «Kromka Uz1/Uz2/En1/En2 (mm)» (uzunlik tomon = katta o'lcham; '-' = yo'q) va «Kromka (m)», pastda qalinlik bo'yicha jami metr. Kromka har xil panellar alohida qatorda chiqadi. Kromka `eb:[...]` maydonida (profil segmentlari bo'yicha) saqlanadi.
- Move: Ortho/Free, qadam bilan, raqamli X/Y/Z. Eni/bo'yi o'zgarsa qalinlik o'zgarmaydi.
- Butun korpus: ko'chirish, ±90° aylantirish, cho'zish (qalinlik saqlanadi), «Korpus rejimi».
- Ko'rinishlar (chapdan): Iso, Top, Front, Left, Right, Back — faqat faol ko'rinish ko'k (brend rang). «View» ro'yxati: Solid, Wireframe, qalinlikni ko'rsatish, Hide selection (H), Isolate selection (I), Unhide all (Shift+H).
- Yuqori qatorda View, Panel, Make, Object ro'yxatlari: Panel — yangi panel, tanlanganning nomi/eni/bo'yi/qalinligi/soni, shakl turi, standart qalinlik; Make — magnit (turlari), Ortho/Free, qadam, lineyka (o'lchash), yordamchi chiziqlar (magnit ularga yopishadi); Object — Select/Move/Rotate/Stretch, Copy (C), Mirror X/Y/Z (nusxa; tekislik — butun model markazi, hammasi tanlangan bo'lsa tashqi yuza), Delete, Korpus rejimi.
- O'ng yuqori burchakda navigatsiya gizmosi (X/Y/Z o'qlari, Blender kabi): o'qni bossangiz shu tomondan ko'rinish; faol ko'rinish oq halqa bilan.
- Ko'chirish: panelni sudrash kursor bo'ylab erkin (Ortho yoqilsa — bitta o'q); X/Y/Z strelkasini sudrash faqat o'q bo'ylab.
- Modeling hotkeylari Drawing/CNC hotkeylaridan alohida: Hotkey oynasidagi «Modeling (Panel 3D)» bo'limida o'zgartiriladi, alohida kalitda saqlanadi (`rugby.shortcuts.p3.v1`). Modeling ochiqligida Drawing hotkeylari ishlamaydi (faqat file/page/sozlamalar). Standart: V/M/R/S asboblar, L lineyka, G yordamchi chiziq, C copy, Shift+X/Y/Z mirror, Delete, H/I/Shift+H, Probel magnit, N yangi panel, 0/1/2/3/4/7 ko'rinishlar.
- Stretch (W) — Scale (S) dan alohida: panel(lar)ning burchak nuqtalarini ramka bilan yoki bosib belgilash (Shift — qo'shish), so'ng nuqtani sudrab (Ortho/qadam/magnit) yoki pastdagi X/Y/Z masofani yozib surish. Butun qirra surilsa panel o'lchami o'zgaradi; bitta burchak surilsa kontur shaklli panelga aylanadi (qalinlik o'zgarmaydi). Tanlangan panel bo'lmasa — hamma panellar nuqtalari.
- Old/Yon/Yuqori ko'rinishlarda panel qalinligi standart ko'rsatiladi; «2D da qalinlik» tugmasi uni yashiradi (2D reja kabi). Ingichka panellarni tanlash osonlashtirilgan (kursor atrofida 6 px).
- Old/Yon/Yuqori — ortografik; Izometrik — perspektiva; sichqoncha bilan aylantirish.
- 2D chizma (`buildDXF()` orqali) yoki DXF fayl 3D da chiziq bo'lib chiqadi; yopiq konturlar panelga aylanadi.
- Raspil ro'yxati va «Eksport ro'yxati»: oddiy matn (TXT, TAB) yoki CSV (;); ustunlar tartibi xossalar qatorlari tartibiga mos, bir xil panellar birlashtiriladi; qalinlik bo'yicha filtr, o'nlik ajratgich, sarlavha qatori; yuklash yoki nusxalash.

## Saqlash
Model `page.panel3d` maydoniga yoziladi (`.dbe` v2 ichida, har sahifada alohida):
`{v,T,uid,panels[],lines[]}`. Eski `.dbe` fayllar bu maydonsiz ham ochiladi.
Panel: `{id,n,w,h,t,q?,o:'front|side|flat',m?,x,y,z,ry,shape,c,pts,bw,bh}` (`m` — 90° ga karrali yo'nalish matritsasi, bo'lsa `o`/`ry` o'rniga ishlatiladi) (x,y,z — markaz, mm).

## Keyingi qadamlar
Teshik/freza, qirra lentasi, panel→2D (DXF) eksport (CNC), bog'lash/furnitura, undo/redo.


## 2026-10-30 yangilanish

### Cutlist
Modeling'dan keyingi alohida bo'lim. Jadval: №, Nomi, L, W, t, Soni, Tekstura, Aylantirish, Material, Izoh, L1..Ln, W1..Wn (kromka katakchasini bosib qo'yish/olish), Kromka (m). Tanlanganlarga (tanlanmasa hammasiga): Hamma qirra / Uzun / Qisqa / Kromkasiz; Tekstura ║ Bo'yi / ═ Eni / Yo'q. Qalinlik ___ Qo'llash — tanlanganlarga (yoki hammasiga) bir xil qalinlik.
Eksport (CSV `;`/`,` yoki TXT TAB): Uzunlik, Eni, Soni, Nomi, Qalinlik, [Material, Izoh, Aylantirish, Tekstura], L1.., W1.., [Kromka (m)]. To'rtburchakda L1,L2,W1,W2; to'rtburchak bo'lmasa L3,L4,W3,W4 gacha. Kromka qiymati: qalinlik (mm) yoki 1/0.
L — teksturali panelda tekstura bo'ylab o'lcham (hatto qisqa bo'lsa ham), teksturasizda uzun tomon. L-qirralar shu o'lchamga parallel.
List hisobi: material+qalinlik bo'yicha guruhlab MaxRects; teksturali va «Aylantirish» o'chirilgan panellar aylantirilmaydi (L list uzunligi bo'ylab).
Eksport filtri: Qalinlik va Material — tanlansa CSV/TXT ham, List hisobi ham faqat shu panellar bo'yicha.
List hisobi natijasi Cutlist pastida to'liq eni bo'ylab: Material, Qalinlik, Panel (dona), Panellar maydoni (m²), Kromka (m, kromka qalinligi bo'yicha), List (dona va m²), Foydalanish %, Sig'mas; bir nechta guruhda «Jami» qatori. Filtr o'zgarsa hisob qayta chiqadi.

### Bir nechta panelni birdaniga tahrirlash (Modeling)
Bir nechtasi tanlansa (ramka, Shift+bosish, A yoki Material bo'yicha) o'ng panelda «Tanlangan: N ta panel»: Qalinlik, Eni, Bo'yi, Soni, Tekstura, Material — o'zgartirilgan maydon hammasiga qo'llanadi, «turli» maydon tegilmaydi; Kromka qalinligi + Hamma qirra / Uzun / Qisqa / Tozalash; jami kromka; Nusxa / O'chirish.
Material bo'yicha tanlash: «Panellar» ro'yxati ustidagi ro'yxat (material yoki material · qalinlik); Shift+M — tanlangan panel bilan bir xil material va qalinlikdagilar (`sel.mat`).

### WebGL
`main.js`: `ignore-gpu-blocklist`, `enable-unsafe-swiftshader`. Modeling bir nechta renderer sozlamasi bilan urinib ko'radi; bo'lmasa sabab va «Qayta urinish» tugmasi chiqadi; webglcontextlost/restored kuzatiladi.

### Tekstura
Panel maydoni `gr`: `'h'` (bo'yi bo'ylab), `'w'` (eni bo'ylab) yoki yo'q. 3D: ikki yuzada ingichka chiziqlar (View → Tekstura yo'nalishi, Shift+T). Alt+T — tanlanganlarda almashtirish. ↻90° (eni↔bo'yi) teksturani jismoniy yo'nalishda saqlaydi.

### Panel Types (Drawing)
Fayllar: `app/js/tools/panel-types.js`, `app/css/panel-types.css`; dvigateldagi ulanishlar: `panels-draw.js` (ptype asbobi, kechiktirilgan polka bosqichi), `input-view.js` (en Tab bo'y), `input-keys.js`, `render.js` (oldindan ko'rish, polka bosqichi).
Qadamlar: 1) tur, 2) boshlash nuqtasi L1/L2/R1/R2, en Tab bo'y Enter (yoki sichqoncha), 3) blok/ramka/shkaf ichiga polka: g'ildirak yoki raqam — soni, H/V (Tab) — yo'nalish, ↑/↓, Enter/chap klik — tayyor, Esc/o'ng klik — polkasiz.
Shakl maydonlari: `ptype`, `ptz` (Depth = Z daraja). «Chizmadan panel yasash» `ptz` ni extrude asosiga qo'shadi (Reja tekisligida Y, Old tekisligida Z).
Shkaf turlari: pastki blok 100 mm (`PT_BLOCK_H`), ustida t qalinlikdagi o'rta panel.

### Modeling
- Hotkeylar: 44 buyruq (`P3CMD`), yolg'iz tugma / Shift+ / Alt+ / F1–F10 (F5 dan tashqari); menyudagi yorliqlar joriy sozlamadan (`p3KbSync`). Standartlar: A/Alt+A, B, D/Shift+D, F/Shift+F, O, T/Shift+T/Alt+T, Z/Shift+W/Shift+S, Shift+R, Shift+7, Shift+G va oldingilar.
- Clipping: perspektivada near = R/2000, far ≥ 80 m; orto ±far; `logarithmicDepthBuffer`.
- Top/Bottom kamera aniq ±90° (up vektori gorizontal), navigatsiya gizmosi joriy kamera matritsasidan.
- Magnit 2D (orto) ko'rinishda ko'rish o'qi bo'yicha koordinatani o'zgartirmaydi (`lockAx`) — qo'yish, Move, Stretch.
- Stretch: panelning hamma nuqtasi belgilansa — butun panel istalgan o'q bo'ylab (qalinlik o'qi ham) ko'chadi.
- «Butun korpus»: Cho'zish olib tashlandi; umumiy o'lcham (tanlanganlar yoki butun korpus gabariti).
- Ranglar umumiy mavzudan (`--canvas`, `--panel`, `--text`, `--ui-line`, `--p3fill`); `Panel3D.retheme()`.
