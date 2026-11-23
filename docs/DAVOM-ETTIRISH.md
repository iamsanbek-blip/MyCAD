# Rugby — ishni davom ettirish uchun to'plam (2026-11-23)

Bu hujjat — rezerv va keyingi ish uchun yagona kirish nuqtasi. Foydalanuvchi uchun yangiliklar: `HUJJAT.md`;
haqiqatda o'tkazilgan sinovlar: `docs/TESTING.md`; umumiy arxitektura: `docs/ARCHITECTURE.md`; qoidalar: `AGENTS.md`.

## Holat

- Versiya: **1.1.2-preview.2** (branch `claude/vigilant-goodall-nvrvty`). EXE — GitHub Actions «Windows portable preview»
  (`.github/workflows/windows-portable.yml`, workflow_dispatch) Windows Server 2022 da yig'adi, testlaydi va
  `v<versiya>` prerelease sifatida chiqaradi (`Rugby-Portable.exe`, `SHA256.txt`, `BUILD-REPORT.json`).
  Bir versiya ikki marta chiqarilmaydi — har yangi EXE uchun `package.json` va `package-lock.json` versiyasini oshiring.
- Web versiya: `python3 scripts/build-web.py <chiqish.html>` (bitta HTML). Web'da fayl saqlash claude.ai «downloads»
  orqali, `.dxf` → `.dxf.txt` (shim `scripts/build-web.py`), desktop (EXE) da to'g'ridan-to'g'ri `.dxf`.
- Windows 10/11 da qo'lda qabul sinovi va haqiqiy CNC dastgohda sinov **hali o'tkazilmagan**.

## 2026-11-23 da qo'shilganlar (Modeling / CNC)

| Imkoniyat | Qayerda | Asosiy kod |
|---|---|---|
| Furnitura va teshiklar (yevrovint, ekssentrik, shkant, polkaderjatel, petlya + planka, ruchka, paz) | Object ▸ Furnitura (Alt+F) | `app/js/tools/panel3d-hw.js` `place()` |
| Ship-paz (metallsiz tishli birikma, dogbone) | Turi «Ship-paz», J ▸ Ship-paz | `panel3d-hw.js` `place()` (con==='tab'), `outline()`, `slotLoop()` |
| Panelga ulagich (aralash) | Panel xossalari ▸ Ulagich | `p.con`; `conSel/conWire` (panel3d.js) |
| Ulanish chizig'iga tur (Kromka kabi) | J asbobi | `jointLines`, `setJoint` (`p.jc`), `setFlip` (`p.jf`); UI `jointShow/jointClick` |
| Furnitura avtomatik moslashuvi | har `changed()` da | `hwAuto()`, `hwSig()` |
| Teshikli DXF (R12, qatlamlar Ø/chuqurlik), teshiklar CSV | Alt+F ▸ DXF / CSV | `dxf()`, `csv()`, `layerNames()`, `drillMap()` |
| CNC'ga yuborish (nesting sahifasi, guruh, tekstura) | Alt+F ▸ CNC'ga yuborish | `cncSend()`, `HW.flat()`; `cnc.js` (noRot), `nest-raster.js` (p3op) |
| Detal raqami, DXF LABEL, A4 birkalar | Cnc ▸ 🏷 Birkalar | `app/js/tools/part-labels.js` |
| Panelni Drawing'da tahrirlash + yordamchi chiziqlar | 2 marta bosish | `editInDrawing/editApply/editCancel`, `guideData/editGuides` |
| Narx (smeta) | 3D oyna o'ng cheti «Narx» | `app/js/tools/panel3d-price.js` `compute()`; UI `prRender` |
| Guruh, massiv, teng taqsimlash | Object (Ctrl+G …) | `groupSel/arraySel/distSel`, `remapCopies` |
| Stretch strelkalari, ingichka gizmo, faol o'q | W | `startStretchG`, `gzTint` |
| Panel rangi (avto neytral, qo'lda, materialga) | Panel xossalari ▸ Rang | `panelCol`, `colMat`, `matCol` (`mc`) |
| Kromka qalinliksiz ko'rinish | — | `ebGroup()` |
| CNC sahifasidan Modeling → model sahifasi | — | `modelHome()` |

## Ma'lumot modeli (loyiha faylida `page.panel3d`)

Panel (`panels[]`): `id, n, w, h, t, o, x, y, z, m?, ry?, shape?, pts?, bw?, bh?, c?, eb?, gr?, mat?, q?` va yangilari:

- `ops[]` — panel O'Z koordinatasida (u: 0..eni, v: 0..bo'yi, A yuza = +z): `{k:'d', f, u, v, d, z, th?}` yuza teshigi;
  `{k:'e', u, v, c, n:[nu,nv], d, z}` chet teshigi; `{k:'g', f, u0,v0,u1,v1, z}` paz; `{k:'s', f, u0..v1, th, r}` ship-paz teshigi/kesigi;
  `{k:'t', u0..v1, len, r}` ship-paz tishi (profildan tashqarida). `a:1` — avtomatik (qayta joylashda almashadi),
  `t` — tur (konf, ekss, shkant, polka, petlya, planka, ruchka, paz, tab, man), `m:1` — polkaderjatel turadigan teshik.
- `con` — panel ulagichi (`konf|ekss|shkant|konf+shkant|ekss+shkant|tab|none`), `jc{sherikId:tur}` — ulanishga tur
  (chet panelida), `jf{sherikId:1}` — ekssentrik o'yig'i ikkinchi yuzada, `hs` — petlya tomoni (L/R), `grp` — guruh, `col` — rang.
- Model darajasida: `mc{material:'#rrggbb'}` — material rangi.
- Ustuvorlik: `jc` → B panel `con` → A panel `con` → Furnitura oynasidagi umumiy tur.
- Ulanish: B panel QIRRASI A panel YUZASIGA tegadi (oraliq ≤ 3 mm; penetratsiya A qalinligigacha) — `joint()`.

CNC sahifasidagi Drawing shakllari: kontur `p3:{no,n,id,side,w,h,L,W,t,mat,eb,ebs,holes,q}`, `group`, `nr:1` (tekstura —
burilmaydi); teshik/paz/ship-paz teshigi `p3op:1`; vaqtinchalik tahrir sahifasida yordamchi chiziqlar `p3g:1` (`YORDAMCHI` qatlami).

Brauzer sozlamalari (localStorage): `rugby.hw.v1` (furnitura), `rugby.price.v1` (narxlar), `rugby.labels.v1` (birka).

## Testlar (hammasi Node bilan; brauzer testlari Playwright Chromium)

| Buyruq | Nima |
|---|---|
| `npm run check` | sintaksis va asset (57 JS) |
| `npm test` | 18 eski regressiya + workspace (24) + `tests/panel3d-hw.cjs` (17) |
| `node tests/panel3d-hw-ui.cjs` | Furnitura oynasi, DXF/CSV (8) |
| `node tests/modeling-cnc-price.cjs` | ulagich, J asbobi, ship-paz, narx, CNC, birka, Drawing tahrir, guruh/massiv, Stretch, rang, kromka, nusxa (16) |
| `node tests/modeling-precision.cjs`, `node tests/smart-autoname.cjs` | magnit/gizmo, smart kiritish |
| `npm run test:electron`, `xvfb-run -a node tests/modeling-smoke.cjs` va h.k. | haqiqiy Electron GUI |

Brauzer testlari uchun: `RUGBY_CHROMIUM=/opt/pw-browsers/chromium` (bulutli muhitda). DXF tashqi tekshiruvi: ezdxf
(`RUGBY_HW_DXF=... node tests/panel3d-hw-ui.cjs` faylni yozadi).

## Ma'lum cheklovlar va keyingi qadamlar

1. **G-code / postprotsessor** (Nanxing: NcStudio/Syntec) — namunaviy `.nc` fayl, instrumentlar ro'yxati va Z nol kerak.
2. Tortma yo'naltiruvchisi teshiklari (shablon), zenkovka (Ø10) varianti, «HDRILL ni CNC DXF'dan chiqarmaslik» belgisi.
3. Drawing'dagi aylanalarni (Modeling'siz) teshikka aylantirish.
4. Ship-paz detali Cutlist/List hisobida tishsiz o'lchamda; nestingda tish bilan.
5. Ikkinchi tomondagi ko'r teshiklar CNC sahifasiga chiqmaydi (soni hisobotda, DXF/CSV'da bor).
6. Birka chop etish haqiqiy printer/stiker varag'ida tekshirilmagan; termoprinter formati (58×40) yo'q.
7. Narx: material «list» rejimida Cutlist MaxRects hisobidan; CNC nesting natijasi bilan farq qilishi mumkin.
8. Web versiyada `.dxf` → `.dxf.txt`.

## Rezerv

- Kod: GitHub `iamsanbek-blip/MyCAD`, branch `claude/vigilant-goodall-nvrvty` (har o'zgarish commit + push qilingan).
- EXE: GitHub Releases `v1.1.2-preview.2` — https://github.com/iamsanbek-blip/MyCAD/releases/tag/v1.1.2-preview.2
  (SHA256 `f59ff22c…5250e1`; oldingi `v1.1.2-preview.1`).
- Web: claude.ai artifact (shaxsiy) — `scripts/build-web.py` bilan istalgan payt qayta yig'iladi.
