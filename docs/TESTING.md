# GitHub relizi uchun tekshiruv — 2026-10-11

Mahalliy Node tekshiruvlari qayta bajarildi: 49 JavaScript fayli sintaksisi va
asset yo‘llari, 18 regressiya fayli va 21 workspace testi — barchasi o‘tdi.

Windows CI jarayoni tayyorlandi. U manba va ichki Rugby.exe GUI sini hamda
portable launcher ochilishini tekshiradi; faqat muvaffaqiyatdan so‘ng reliz
chiqaradi. Ishga tushirish natijasi GitHub Actions va relizdagi BUILD-REPORT.json
da qayd etiladi. Ushbu yozuv paytida Windows CI natijasi hali olinmagan.

Quyidagi eski tekshiruvlar 2026-10-03 nusxasiga tegishli. Ularning EXE hashlari
GitHub’da qayta quriladigan faylga tatbiq etilmaydi. Windows 10/11 qo‘lda qabul,
haqiqiy fayl tanlash dialoglari va SmartScreen/SAC sinovi hali bajarilmagan.

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
