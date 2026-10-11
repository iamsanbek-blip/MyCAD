# GitHub orqali tarqatish

`MyCAD` repozitoriysida Rugby Desktop manbasi saqlanadi. Foydalanuvchilar
Releases bo‘limidan `Rugby-Portable.exe` ni yuklab oladi; Node.js kerak emas.

`.github/workflows/windows-portable.yml` asosiy kod o‘zgarganda yoki Actions →
Windows portable preview → Run workflow orqali Windows Server 2022 da ishlaydi:

1. `npm ci`, sintaksis va regressiya tekshiruvlari.
2. Haqiqiy Electron oynasida manba sinovi.
3. Imzosiz Windows x64 portable qurish.
4. Ichki `Rugby.exe` da chizish, sahifalar, hotkey, saqlash/ochish sinovi.
5. Tayyor portable launcher bilan asosiy oyna ochilishini tekshirish.
6. Barcha tekshiruvlar o‘tsa SHA256, BUILD-REPORT va EXE bilan prerelease chiqarish.

Reliz avtomatik sinovlar o‘tmaguncha chiqarilmaydi. Oldingi reliz qayta
yozilmaydi: yangi reliz uchun package.json va package-lock.json versiyasini
birga oshiring. Hozir faqat `-preview.` versiyalar qabul qilinadi.

Workflow `contents: write` ruxsati bilan repozitoriyning standart GITHUB_TOKEN
qiymatidan foydalanadi. Sertifikat yoki boshqa token kiritish talab qilinmaydi.
GitHub ulanishi workflow fayllarini yozishga ruxsat bermasa, repozitoriy egasi
tayyor YAML faylini GitHub orqali qo‘shishi yoki ulanish ruxsatini yangilashi kerak.

Bu imzolangan ishlab chiqarish relizi emas. `npm run dist:portable` dagi
Windows va haqiqiy kod imzosi talablari saqlangan: [PORTABLE.md](PORTABLE.md).
SmartScreen/SAC xulqi CI muhitida tekshirilmaydi.

Windowsda imzosiz previewni qo‘lda qurish:

```powershell
npm ci
npm run check
npm test
npm run test:electron
node scripts/build-preview.cjs
```

Natija `dist/Rugby-Portable.exe`. Qurilgan faylni tarqatishdan oldin workflowdagi
paket GUI va launcher tekshiruvlarini ham bajaring.
