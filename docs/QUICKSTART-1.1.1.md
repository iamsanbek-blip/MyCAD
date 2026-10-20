# Rugby 1.1.1-preview.2 — qisqa qo‘llanma

Brauzer: https://rugby-cad-workshop.iam-sanbek.chatgpt.site/

Windows x64: Rugby-Portable.exe ni ikki marta bosing. O‘rnatish yoki CMD kerak emas. Dastlabki ochilishda paket vaqtinchalik papkaga ajratiladi, shu sabab qisqa kutish bo‘lishi mumkin. Sozlamalar Windows foydalanuvchi profilida saqlanadi.

## Saqlash va ochish

File → Saqlash (Ctrl+S) barcha sahifalar va 3D panellarni bitta .dbe faylga yozadi. File → Ochish (Ctrl+O) bilan o‘sha faylni oching. Boshqa nom bilan saqlash: Ctrl+Shift+S. Sahifalar pastdagi tablarda; Ctrl+PageUp/PageDown bilan almashadi.

Brauzer faylni to‘g‘ridan-to‘g‘ri saqlashga ruxsat bermasa, ko‘rinadigan yuklash oynasi chiqadi. Fayl tushganini tekshirgach «Fayl saqlandi» ni bosing. Bu tugma o‘zi faylni diskka yozmaydi. Brauzerda File menyusi klaviatura kombinatsiyalariga ishonchli muqobil.

1.1.2’dagi .dbe modellari ham ochiladi. Import qilingan faylni yangi nom bilan saqlang. Yangi v3 fayl eski Rugby versiyalarida ochilmasligi mumkin.

## Ishchi oyna

Logo → File → Edit → Cnc → Drawing → Modeling. Yuqoridagi «Ishchi maydon» yon panellarni yashiradi/qaytaradi. Cnc o‘chirish tugmasi ishchi oynaning past chapida.

Modeling: chapdagi bitta panel belgisi aktiv ko‘rinishga mos panel yaratadi. N → kursorni suring → klik. Esc bekor qiladi. Panel menyusida gorizontal, vertikal, frontal turlar ham bor. O‘ngda xossalar, sahna ro‘yxati va raskroy eksporti.

Drawing’dagi rectangle lar Modeling’ga bir marta o‘tadi. «Extrude → 3D» yopiq konturlarni kiritilgan chuqurlikda chiqaradi. 16×500 va 450×16 profillarga 500 mm extrude berilsa, qalinlik 16 mm qoladi; keyin Extrude o‘lchamini xossalarda o‘zgartiring.

## Tanlash, magnit, transform

- Chap tugma: tanlash/surish. Bo‘sh joydan rectangle tortish: ko‘p panel. Shift: tanlovga qo‘shish.
- O‘rta tugma: aylantirish. O‘ng tugma: kamera surish. G‘ildirak: zoom.
- M — Move; X/Y/Z tutqichlari faqat o‘q bo‘ylab. Free erkin, Ortho asosiy o‘q/qadam bo‘ylab.
- G — A nuqtani tanlang, keyin B nuqtaga olib boring va bosing. Magnit yoqilganida B belgisi paydo bo‘lishini kuting. Probel magnitni yoqadi/o‘chiradi; Make ichida Endpoint/Vertex, Midpoint, Center filtrlari.
- Ctrl+A / Delete — ko‘p panelni tanlash/o‘chirish. Ctrl+D — tanlov nusxasi. Ctrl+Z / Ctrl+Y — undo/redo.
- R — Rotate; S — Scale; W — Stretch. Stretch’da burchaklarni tanlang, ko‘chirishni boshlang, masofa kiriting yoki interaktiv suring, keyin qo‘llang.
- H — yashirish; Shift+H — hammasini qaytarish; Shift+I — tanlovni ajratish.
- Panelga ikki klik: vaqtincha Drawing’da kontur tahriri. «3D ga qo‘llash» yoki Bekor.

Qalinlikni faqat xossalardagi Qalinlik orqali o‘zgartiring. En/bo‘y masshtabi qalinlikka ta’sir qilmaydi. F10’da Drawing va Modeling tugmalari alohida sozlanadi. Raqamli katakda yozayotganda oddiy asbob hotkeylari ishga tushmaydi.

## Import va eksport

File → Import — DXF chizmani oladi. PNG/SVG/DXF — 2D chizma uchun. «PNG — hududni belgilash» faqat tortilgan to‘rtburchakni eksport qiladi.

Modeling o‘ngida CSV, TXT yoki Excel XLSX tanlab Eksport bosing. Windows’da Save dialogi orqali joyni tanlang. «Ro‘yxat va sozlamalar» ichida barcha sahifalar/tanlov, qalinlik, ajratgich, kasr belgisi, sarlavha va ustun tartibi bor. Xossalar qatorlarini surish ham eksport tartibini yangilaydi. Eksport panelning ishlab chiqarish o‘lchamlarini beradi; 3D ko‘rinishdagi proyeksiyasini emas.

## Windows ogohlantirishi

Bu imzosiz preview. Agar SmartScreen «More info → Run anyway» tugmasini ko‘rsatsa, undan foydalanish mumkin. Smart App Control bloklaganda bunday tugma chiqmasligi mumkin. Ushbu paket blokni chetlab o‘tmaydi; kod imzolash sertifikati hali yo‘q. Qurish/sinov dalillari BUILD-REPORT.json faylida. SmartScreen/SAC qabul sinovi bajarilgani da’vo qilinmaydi.
