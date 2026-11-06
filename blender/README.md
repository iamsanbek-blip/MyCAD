# 3ds Max Section — Blender add-on

3ds Max **Section** shape'ining Blender uchun nusxasi (Blender 4.2 LTS va undan yangi).
Rugby Electron ilovasidan mustaqil; alohida o'rnatiladi.

## O'rnatish

**[max_section-1.0.0.zip — yuklab olish](https://github.com/iamsanbek-blip/MyCAD/releases/download/blender-max-section-v1.0.0/max_section-1.0.0.zip)**
(GitHub Actions testlardan keyin quradi: `.github/workflows/blender-addon.yml`).

Yoki o'zingiz yig'ing:

Blender 4.2+ da (extension formati):

```bash
cd blender/max_section && zip -r ../max_section-1.0.0.zip . -x "__pycache__/*"
```

Keyin Blender: **Edit > Preferences > Get Extensions > ⌄ > Install from Disk…** va
`max_section-1.0.0.zip` ni tanlang. (Yoki `blender --command extension build` shu papkada.)

## Ishlatish

- **Add > Curve > Section** yoki sidebar (**N**) > **Section** > *Section* tugmasi.
  Sarg'ish to'rtburchak (kesuvchi tekislik, lokal XY) paydo bo'ladi.
- Tekislik kesgan hamma ko'rinadigan obyekt (modifier'lardan keyingi mesh, instance'lar)
  atrofida **sariq kontur** chiziladi.
- **Create Shape** — konturdan nom so'rab, tahrirlanadigan *Poly spline* egri chiziq
  (dunyo koordinatalarida) yaratadi. Ochiq mesh'da ochiq, yopiq kesimda yopiq (cyclic).
- Panel: Object properties > *3ds Max Section* va sidebar > *Section*.

| 3ds Max | Add-on |
|---|---|
| Update: When Section Moves / When Selected / Manually + Update Section | bir xil |
| Section Extents: Infinite / Section Boundary / Off | bir xil (boshlang'ich: Section Boundary) |
| Section Size: Length (Y), Width (X) | bir xil |
| Create Shape (nom bilan) | bir xil |

## Farqlar (halol ro'yxat)

- 3ds Max'da section sichqoncha bilan sudrab chiziladi; bu yerda Add operatorining
  Length/Width maydonlari ishlatiladi (Redo panelida o'zgartiriladi).
- Kesim chiziqlari viewport'da overlay sifatida chiziladi (chuqurlik testisiz,
  orqadagi qismlari ham ko'rinadi) va fayl bilan saqlanmaydi: fayl ochilganda yoki
  Undo'dan keyin qayta hisoblanadi.
- Yuzasi yo'q mesh (faqat qirralar) kesilmaydi; tekislikka to'liq yotgan yog' kesim bermaydi.

Litsenziya: Blender add-on'lari GPL bo'lishi shart, shuning uchun manifestda
`GPL-3.0-or-later`; bu qism Rugby'ning `UNLICENSED` holatidan alohida.

## Testlar

```bash
python3 blender/tests/test_core.py          # faqat numpy
python3 blender/tests/test_blender.py       # pip install bpy (yoki: blender -b --python ...)
```
