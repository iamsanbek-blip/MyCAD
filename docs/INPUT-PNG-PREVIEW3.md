# Preview.3: input va PNG hududi

## Takrorlangan muammo

`input-guard.js` katakka bosilganda `setTimeout` va `requestAnimationFrame`
orqali shu katakka yana fokus berardi. Sinovda boshqa katakka o‘tilgach ham
fokus avvalgi `filletR` ga qaytdi. Tuzatishdan so‘ng `textSize` da qoldi.
React ishlatilmaydi; shu sabab React key/remount haqidagi taxmin bu kodga tegishli emas.

`input-drag.js` window mousemove hodisasini kataklar/panellar ustida ham
ishlatardi. Draw/Offset/transform rejimida snap va draw takroran bajarilardi.
Endi oddiy hover faqat canvasda, fokus katakda bo‘lmaganda ishlaydi;
haqiqiy bosib sudrash va tashqarida mouseup ishlashda davom etadi.

## O‘zgartirilgan joylar

- `input-guard.js`: kechiktirilgan fokus qaytarish olib tashlandi; contentEditable
  ham kiruvchi maydon hisoblanadi; draggingRef qoldiq holati tozalanadi.
- `shortcuts.js`, `input-keys.js`: katak/textarea/select/contentEditable da CAD
  hotkeylari ishlamaydi; IME composition hodisalari tutilmaydi.
- `app.js`: grid qiymatini yozish og‘ir chizishni har klavishda chaqirmaydi.
- `raster.js`: mavjud eksport rendererida dunyo koordinatasidagi hudud bilan
  crop; tashqaridagi shakl, o‘lcham va matnlar canvas chegarasida kesiladi.
- `index.html`, `workspace.css`, `i18n.js`: PNG hudud tugmasi va belgilash ramkasi.
- `pages.js`: sahifa o‘zgarganda boshlangan crop bekor qilinadi.

## Ishlatish

Export bo‘limida **PNG — hududni belgilash** ni bosing. Kerakli joy ustida
sichqonchaning chap tugmasi bilan to‘rtburchak torting va qo‘yib yuboring.
`drawing-region.png` saqlanadi. Har ikkala yo‘nalishda tortish mumkin.
Esc yoki Bekor — chizmani o‘zgartirmay bekor qiladi. Oddiy PNG — butun chizma.

Oq fon, chizma ranglari, o‘lchamlar va matnlar saqlanadi; grid, kursor va
belgilash ramkasi PNGga tushmaydi. Eng uzun tomon 1600 px gacha, eski eksport
kabi ko‘pi bilan 8 px/mm. Bu hudud cropi; faqat to‘liq ichidagi obyektlarni
filtrlash emas — chegaradan o‘tgan chiziq ham hudud chetida kesiladi.

## Tekshirish

`npm run check`, `npm test`, Windowsda `npm run test:electron`.
`tests/input-region-checks.cjs` haqiqiy keyboard event va haqiqiy PNG downloadni
tekshiradi; tashqaridagi ko‘k shakl hududiy faylda bo‘lmasligi piksel bilan
tekshiriladi. Natijalar Windows CI artefakti va BUILD-REPORT.json da bo‘ladi.

Imzolash, SmartScreen va Smart App Control cheklovlari preview.2 dagidek ochiq.
