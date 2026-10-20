# Modeling boshqaruvi

- Chap tugma: tanlash; Move rejimida panelni erkin surish. Shift+klik: bir nechta panel. O‘rta tugma: aylantirish, o‘ng tugma: kamerani surish, g‘ildirak: yaqinlashtirish.
- Move: panel ustidan sudrash kamera tekisligida erkin; X/Y/Z strelkasi faqat o‘sha o‘q bo‘ylab.
- O‘ng yuqoridagi XYZ belgisi tegishli tomondan ko‘rinishni ochadi.
- Drawing rectangle’lari Modeling’ga kirishda bir marta panel nusxasiga aylanadi. Drawing → panellar tugmasi tanlangan yopiq konturlarni ham o‘tkazadi. Nusxalar keyingi 2D o‘zgarishlar bilan avtomatik bog‘lanmagan.
- Edit → Hotkey: Modeling va Drawing/Cnc alohida. Modeling: V tanlash, M move, R rotate, S scale, W stretch, Ctrl+D nusxa, Space magnit.

## Stretch

1. Bir yoki bir nechta panelni Shift+klik bilan tanlang.
2. Object → Stretch yoki W. Burchaklarni klik yoki to‘rtburchak bilan tanlang; Shift hududli tanlovga qo‘shadi.
3. Ko‘chirish tugmasi orqali kursor yoki XYZ strelkalaridan foydalaning; yoxud ΔX/ΔY/ΔZ millimetr qiymatini kiriting.
4. Qo‘llash barcha o‘zgarishlarni bitta Undo sifatida saqlaydi. Bekor yoki Esc qaytaradi.

Har panelda siljish uning tekisligiga proyeksiya qilinadi: normal yo‘nalish qalinlikni o‘zgartirmaydi. Old va orqa yuzadagi burchak juft bo‘lib suriladi. Scale butun panel o‘lchamini, Stretch faqat tanlangan burchaklarni o‘zgartiradi. Nol maydonli yoki o‘zini kesuvchi kontur qabul qilinmaydi. Stretch jami 2000 tagacha kontur nuqtasi uchun mo‘ljallangan.

## Move magniti va rectangle tanlash

Move (M): A burchak yoki midpoint yonidan chap tugma bilan ushlang, B nuqtaga olib boring. Magnit ON bo‘lsa B belgisi chiqadi va tugmani qo‘yishda aynan shu nuqtaga tushadi. Probel magnitni yoqadi/o‘chiradi. XYZ strelkalari o‘q cheklovini saqlaydi; aniq A→B uchun panelning nuqtasidan ushlang yoki Nuqtadan joylash (G) dan foydalaning.

Bo‘sh joydan chap tugma bilan rectangle torting: to‘liq ramka ichidagi ko‘rinadigan panellar tanlanadi. Shift bilan oldingi tanlovga qo‘shiladi.

Panel → Raskroy — Excel / TXT: barcha sahifalar yoki faqat tanlangan panellarni, qalinlik filtrini va ustun tartibini tanlang. Excel (.xlsx) sonlarni raqam sifatida saqlaydi; TXT tab ajratgichli. Shaklli panel en/bo‘yi tashqi gabarit o‘lchami; CNC konturi emas.

## Chizma profilidan Extrude

Drawing’da yopiq rectangle’larni belgilang → Extrude → 3D… → 500 mm → 3D panel yaratish. Modeling yon panelida ham Chizma → Extrude… bor. Tanlov bo‘lmasa barcha yopiq konturlar ishlatiladi. Oldingi shu chizmadan yaratilgan panellar dastlabki XY joylashuvi bilan yangilanadi; Ctrl+Z qaytaradi.

16×500 profil 500×500×16 mm panelga; 450×16 profil 450×500×16 mm panelga aylanadi. Z=0 dan yuqoriga cho‘ziladi. Panel xossalaridagi Extrude maydoni uzunlikni, Qalinlik esa material qalinligini o‘zgartiradi. Murakkab yopiq konturlarda Extrude profil normaliga tegishli.

A→B uchun marker halqasiga qarang: yozuv halqaning yonida, koordinata halqaning markazida. Magnit ON bilan Nuqtadan joylash B ushlanmaguncha tasdiqlanmaydi. Probel — erkin qo‘yish.

## Ko‘p tanlov va fayl olish

Delete barcha tanlangan panellarni o‘chiradi. Ctrl+D barcha tanlangan panellardan nusxa yaratadi, ularning o‘zaro masofasi saqlanadi. Ctrl+Z bitta amalni qaytaradi. Ctrl+A ko‘rinadigan panellarni tanlaydi. Ctrl+Shift+E raskroy eksport oynasini ochadi.

Brauzerning oddiy yuklab olish usulida fayl nomli havolani bosing, fayl Yuklamalar papkasida paydo bo‘lgach “Fayl saqlandi”ni tanlang. Bekor qilinsa loyiha saqlanmagan holatda qoladi. Matn nusxasi DBE’ni qo‘lda saqlash yoki jadvalni Excel’ga ko‘chirish uchun mavjud.
