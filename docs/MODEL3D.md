# Rugby 1.1.1-preview.1 — 3D modellash

Bone edit → Chizish → **3D modellash**. Bu korpus mebel konstruktori uchun
birinchi bosqich: panel yig‘ish va ko‘rish; hali to‘liq CAM tizimi emas.

## Tez boshlash

1. Chizishda yopiq panel konturini mm o‘lchamida chizing yoki DXF oching.
   Alohida segmentlarni avval Join bilan yopiq konturga birlashtiring.
2. 3D modellashga o‘ting: barcha sahifalardagi yopiq konturlar 48×48 previewda
   ko‘rinadi. Shablonni bosing — sahnaga standart 16 mm panel qo‘shiladi.
3. En, Bo‘y, X/Y/Z va RX/RY/RZ ni kiriting, Qo‘llash yoki Enter bosing.
   Koordinatalar panel markaziga tegishli. En/bo‘y mahalliy XY o‘qlarida;
   qalinlik mustaqil Z o‘lchami va faqat Qalinlik katagidan o‘zgaradi.
4. Move, Rotate, En/bo‘y scale tutqichlari bilan ham o‘zgartirish mumkin.
   Ortho: ko‘chirish 1 mm, aylantirish 90°, masshtab 0.05 qadam.
   Free: uzluksiz. Scale qalinlikni o‘zgartirmaydi.
5. Chap tugmani bo‘sh joyda tortish — orbit; o‘ng — pan; g‘ildirak — zoom.
   Tepa/Old/Yon/Izometriya butun sahnani markazlaydi.
6. 2D chizma va chiziqlar XY (Z=0) da ko‘rinadi. XY chiziq ikki klik bilan
   haqiqiy umumiy 2D chiziq yaratadi. Ortho ishlaydi; Esc — bekor.
7. Ctrl+S barcha sahifalarni saqlaydi. Ctrl+Z/Y — undo/redo; M/R/S — 3D
   transform; F8 — Ortho/Free; F10 — hotkey sozlamalari.

Yangi panel — 600×400 mm to‘rtburchak. Yangi panel qalinligi faqat keyin
qo‘shiladigan panellarga tegishli. Tanlovni saqlash — Chizishda tanlangan yopiq
konturlarni joriy sahifaning mustaqil shablonlari sifatida saqlash.
3D nusxalar mustaqil: asl 2D chizma keyin o‘zgarsa, tayyor panel buzilmaydi.

**Namuna:** `namunalar/korpus-3d.dbe` — 600×400×720 mm korpus, 16 mm panellar.

## Moslik va chegaralar

- .dbe v3: eski v1/v2 fayllar ochiladi; v3 eski Rugby’da ochilmaydi.
  Yangi nom bilan saqlang. Har sahifa o‘z 3D sahnasiga ega.
- Screenshot yoki izometrik 2D korpus avtomatik 3D ga aylanmaydi: haqiqiy
  tekis panel konturlaridan foydalaning.
- Har yopiq kontur mustaqil panel. Ichki kontur avtomatik teshik emas.
- Biriktirgichlar, panel snap/collision, avtomatik raspil va G-code keyingi
  bosqichlar. Hozir o‘lchamlarni ishlab chiqarishdan oldin tekshirish kerak.
- DXF/PNG/SVG eksport 2D chizmaga tegishli. 3D STEP/STL eksport hali yo‘q.
- WebGL2 drayveri kerak. Barcha 3D kutubxonalar lokal; internet talab qilinmaydi.
- EXE imzosiz preview. Smart App Control muammosi hal qilinmagan.

## Kengaytirish

`app/js/core/panel-model.js` — sof mm model va qalinlik invariantlari.
`app/js/ui/model3d.js` — shablon, sahifa va UI adapteri.
`src/three/viewport.js` — geometriya, kamera, transform tutqichlari.
`npm run build:3d` lokal bundleni `app/vendor/three-viewport.js` ga yig‘adi.
`document-codec.js`, `pages.js`, `state.js` — v3, sahifalar va undo/redo.
Three.js MIT litsenziyasi `app/vendor/THREE-LICENSE.txt` da; Rugby UNLICENSED.
