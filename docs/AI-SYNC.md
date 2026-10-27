# Rugby 1.1.1-preview.5 — AI va shaxsiy profil

Yuqoridagi **AI yordamchi** tugmasi yoki **Ctrl+Shift+A** oynani ochadi.
Topshiriq yozing, kerak bo‘lsa o‘lchamli JPG/PNG tanlang, **AI bilan reja tuzish**ni bosing.
Javobdagi o‘lchamlar, markaz koordinatalari va amallarni tekshirib **Qo‘llash**ni bosing.
Geometriya bir operatsiya sifatida qo‘llanadi; **Ctrl+Z** qaytaradi.
Reja tayyorlangandan keyin chizma yoki tanlov o‘zgarsa, qayta hisoblash kerak.

## AI ulash

**AI va sinxronlash sozlamalari** ichiga OpenAI API kalitini kiriting va
**Ulanishni saqlash**ni bosing. Model nomi almashtiriladi; boshlang‘ich model `gpt-4.1`.
Hisobingizda shu model va Responses API ishlashi kerak. ChatGPT ilovasidagi
ulanishlar yoki obuna EXE ichiga ko‘chmaydi; API ishlatish alohida hisoblanadi.
Kalitni chatga, makrosga yoki GitHub manbasiga yozmang — ilovadagi maxsus katakka kiriting.
Windows’da kalit Electron safeStorage orqali shifrlanadi. Tizim shifrlashi bo‘lmasa,
kalit faqat joriy seansda qoladi. API va GitHub kalitlari profilga kiritilmaydi.

AI’ga faqat yuborilgan topshiriq, tanlangan panel o‘lchamlari, buyruq/shablon nomlari
va biriktirilgan rasm uzatiladi. `store:false` ishlatiladi; bu provayderning barcha
log/retention qoidalarini bekor qilish degani emas. Chat tarixi profilga yozilmaydi.
**Internetdan ma’lumot izlash** yoqilsa, avval web research bajariladi va manba havolalari
ko‘rsatiladi, so‘ng alohida so‘rovda tekshiriladigan CAD rejasi olinadi.

## Nimalar bajariladi

- O‘lchamli rasm yoki tavsifdan to‘g‘ri to‘rtburchak panellar va korpuslar yaratish.
- Korpus ichidagi polkalarni qalinligini hisobga olib bir xil sof oraliqda joylashtirish.
- Tanlangan 3D panellarni ko‘chirish, qadamli nusxalash, X/Y/Z bo‘yicha teng sof oraliq.
- Arifmetik hisoblar; 2D to‘rtburchak; mavjud shablon blok kiritish.
- AI konsolini chap/o‘ng/pastga joylash va mavjud buyruq hotkeyini o‘zgartirish.
- Tekshirilgan rejani **Funksiya sifatida saqlash**, so‘ng F10 orqali hotkey berish.
- Tanlangan 3D panellarni profilga qayta ishlatiladigan blok qilib saqlash.

Makros hotkeyi avval rejani ochadi; **Qo‘llash**siz chizmani o‘zgartirmaydi.
Makros hamda bloklar kod bajarmaydigan parametrli ma’lumotlardir. Ixtiyoriy JavaScript,
DLL, EXE yoki internetdan kodni avtomatik ishga tushirish bu versiyada mavjud emas.
Asosiy dastur kodiga yangi turdagi amal qo‘shish alohida sinov va yangi EXE relizini talab qiladi.

Korpus generatori ikki yon, ichkariga o‘rnatilgan dno/krisha va polkalar yaratadi.
Fasad, orqa devor, furnitura, listni ulash va CNC toolpath avtomatik kiritilmaydi.
Bu ishlab chiqarishga tayyor to‘liq konstruktor emas. Rasmda yetishmagan chuqurlik va
noaniq o‘lchamlar AI savoli orqali aniqlashtiriladi; fotosurat pikselidan aniq o‘lcham kafolatlanmaydi.

## Google Drive bilan avtomatik sinxronlash

1. Har bir kompyuterda Google Drive for desktop’ga bir xil hisob bilan kiring.
2. Drive ichida shaxsiy **Rugby profil** papkasini yarating; oflayn mavjud qiling.
3. Rugby’da **Profil sinxronlash → Google Drive papkasi**ni tanlang.
4. **Drive papkasini tanlash va ulash** orqali shu papkani tanlang.
5. Ikkinchi kompyuterda ham o‘sha bulut papkasini tanlang; yo‘li boshqacha bo‘lishi mumkin.

Rugby shu papkaning `RugbyProfile-v1` ichiga har qurilma uchun alohida JSON nusxa yozadi.
Bulutga yetkazishni Google Drive for desktop bajaradi. Drive mijozini o‘chirib qo‘ysangiz
internet sinxronlash to‘xtaydi. Ilovadagi “Sinxronlandi” — tanlangan lokal Drive papkasi
bilan almashuv yakunlangani; Drive klientining bulutga upload holatini Drive’ning o‘zida ko‘ring.

## GitHub bilan bevosita sinxronlash

Google Drive o‘rniga **GitHub private repository**ni tanlashingiz mumkin.
Oldindan yaratilgan, kamida bitta commit va branch mavjud PRIVATE repo kerak.
`owner/repository`, mavjud branch va shu repoga Contents read/write huquqli
fine-grained tokenni kiriting. Ochiq `MyCAD` reposi shaxsiy profil uchun qabul qilinmaydi.
Ulanish saqlanishidan oldin private repo va branch mavjudligi tekshiriladi.
Profil `rugby-profile/<device-id>.json` fayllarida versiyalar bilan saqlanadi.
Bir paytda bitta sinxronlash usuli tanlanadi; ikkalasini bir vaqtda ko‘prik qilish yo‘q.

## Qayta o‘rnatish va boshqa kompyuter

Bir Windows profilida sozlamalar `%APPDATA%/Rugby/assistant` (Electron userData)
ichida saqlanadi; aniq katalog nomini tizim belgilaydi. Portable EXE yoniga yozilmaydi.
Oddiy uninstall sozlamalarni o‘chirmaydi. Windows/profil o‘chirilsa, yangi kompyuterda
yuqoridagi sinxronlashni bir marta qayta ulang yoki **Profilni tiklash** orqali JSON nusxani oching.
AI/API kalitlarini yangi kompyuterda alohida kiritasiz.

Ilova ochiq paytda o‘zgarishdan taxminan 1,2 soniya keyin va har 30 soniyada
sinxronlash urinishi bo‘ladi. Internet qaytsa keyingi urinish o‘zgarishlarni uzatadi.
Hotkey, makros, blok, konsol joyi, tema/katak va ustunlar tartibi dastur ichida
qayta o‘rnatmasdan yangilanadi. Yangi makroslar F10 ro‘yxatiga avtomatik qo‘shiladi.
Ikki qurilma bir parametrni bir vaqtda o‘zgartirsa, variantlar saqlanadi;
sozlamalardagi nizoni ochib kerakli variantni tanlang. O‘chirishlar ham sinxronlanadi.

`.dbe` loyihalar alohida fayllar bo‘lib qoladi. Ularni Drive papkasida saqlashingiz mumkin;
bir chizmani ikki kompyuterda bir vaqtda tahrirlashni avtomatik birlashtirish yo‘q.
EXE o‘zini qayta yozmaydi; avtomatik profil yangilanishi asosiy EXE relizini almashtirmaydi.

## Texnik chegaralar va tekshiruv

Profil: 8 MB, 12 000 tarixiy yozuv, 200 qurilma nusxasi; limitda xato ochiq ko‘rsatiladi.
Avtomatik tarixni siqish yo‘q. Bir rejada 100 amal, 1000 yangi panel; bir blokda 200 panel.
Rasm: PNG/JPG, 8 MB. HTTP vaqt va javob hajmi cheklangan; maxfiy header redirectga uzatilmaydi.
Ilova yopiq paytda Rugby sinxronlash ishlamaydi. Drive mijozining o‘zi ishlashi mumkin.

Manba: OpenAI Responses, rasm kiritish va web search rasmiy interfeyslari:
https://developers.openai.com/api/docs/guides/images-vision
https://developers.openai.com/api/docs/guides/tools-web-search
GitHub Contents API: https://docs.github.com/en/rest/repos/contents

`npm run check`, `npm test`, `npm run test:3d`, `npm run test:assistant`.
`npm run test:electron` manba va paketda haqiqiy IPC/disk bilan GUI tekshiradi;
AI provayderi va GitHub HTTP testlari mock javoblardan foydalanadi. Haqiqiy OpenAI,
private repo tokeni va ikki fizik kompyuterdagi Drive sinxroni hali foydalanuvchi kalitlari bilan tekshirilmagan.
