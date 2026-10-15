# 1.1.1-preview.1

Node syntax/assets, 18 legacy, 24 workspace va 4 panel-model test o‘tdi.
Windows source/packaged GUI va portable natijalari BUILD-REPORT.json da;
bu qayd yozilganida CI hali kutilmoqda. 3D testi WebGL, panel qalinligi,
o‘lchamlar, orbit, undo/redo, v3 roundtrip va XY Ortho chiziqni tekshiradi.
Windows 10/11 qo‘lda va SAC sinovi bajarilmadi.

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
