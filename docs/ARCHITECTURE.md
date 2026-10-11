# Rugby 1.1 arxitekturasi

Bu versiya mavjud geometriya dvigateli ustiga sahifa, buyruq va fayl boshqaruvini
ajratadi. Eski renderer hali global o'zgaruvchilarga asoslangan; to'liq ES module
refaktori bu yangilanishga kirmaydi.

| Qism | Fayl | Mas'uliyat |
|---|---|---|
| Hujjat formati | `app/js/core/document-codec.js` | v1 migratsiya, v2 tekshirish, kodlash; DOM ishlatmaydi |
| Sahifalar | `app/js/model/pages.js` | Aktiv sahifani global CAD holatiga yuklash, sahifalar almashuvi |
| Chizma tarixi | `app/js/model/state.js` | Ixcham snapshot, undo/redo; har sahifada alohida |
| Loyiha yuklash | `app/js/io/project.js` | Tekshirilgan hujjatni almashtirish va xatoda qaytarish |
| Fayl holati | `app/js/io/filemanager.js` | Fayl yo'li, dirty/revision, Save/Open/New, bekor qilish |
| Tugma qoidalari | `app/js/core/shortcut-map.js` | Fizik klavish nomi, konflikt va rezerv kombinatsiyalar |
| Buyruqlar | `app/js/ui/shortcuts.js` | Yagona registry, dispatch, sozlash oynasi va localStorage |
| Desktop chegarasi | `main.js`, `preload.js` | Native dialog, IPC, ochilish signali, chiqish |
| Diskka yozish | `desktop/project-files.js` | Avval tekshirish, vaqtinchalik fayl, fsync, rename |
| UI | `app/index.html`, `app/css/workspace.css` | Sahifa paneli va hotkey dialogi |

## Sahifa modeli

`.dbe` v2: `{format, version:2, units:'mm', pages, activePageId, saved}`.
Har sahifada `id`, `name`, `shapes`, `layers`, `dimensions`, `texts`, `corners`,
`refImages`, `nestSheets`, `view`, `settings`, `activeLayer`, `activeColor` bor.
History faqat seans xotirasida saqlanadi; qayta ochilganda undo tarixi yangilanadi.

Sahifa almashtirilganda yarim qolgan transform bekor qilinadi, kamida ikki nuqtali
polyline yakunlanadi, eski sahifa holati eslab qolinadi, yangi sahifa yuklanadi.
Shakllar va qatlamlar sahifalar orasida obyekt havolalarini baham ko'rmaydi.
Sahifa o'chirish tasdiqlanadi, lekin uning o'zi undo tarixiga kirmaydi.

Yangi saqlanadigan xususiyat uchun codec, capturePageData/applyPageData va
kerak bo'lsa snapshot/restore ni birga yangilang. Formatni o'zgartirganda v1/v2
o'qish mosligini tekshiring. Hozirgi cheklov: 1–500 sahifa; bu tezlik kafolati emas.

## Buyruq qo'shish

`RUGBY_COMMANDS` qatori: `[id, label, defaultKey, run, buttonId, inField]`.
Sozlash oynasi, dispatch va tooltip shu ro'yxatdan olinadi. `inField` faqat fayl
buyruqlari kabi kiritish maydonida ham zarur harakatlarga beriladi. Matn maydonida
Ctrl+A/C/V/Z operatsiyalarini CAD tanlash/undo bilan almashtirmang.

Hotkeylar `rugby.shortcuts.v1` localStorage kalitida foydalanuvchi profiliga
saqlanadi, loyiha fayliga yozilmaydi. KeyboardEvent.code fizik joylashuvni
ishlatadi: lotin/kirill tilini almashtirish chizma asboblari tugmasini buzmaydi.
Escape, Enter, Tab va raqamlar chizish/kiritish kontekstiga ajratilgan.

## Saqlash invariantlari

Har hujjat o'zgarishi revision ni oshiradi. Diskka ketgan snapshotdan keyin yangi
tahrir bo'lsa, saqlash tugagach dirty belgisi qoladi. Yangi loyiha pending save
tugashini kutadi. Bekor qilingan/xato open fayl yo'lini o'zgartirmaydi.

Diskka yozish faqat main processda. Renderer native dialog yoki fayl ochish bilan
tanlangan yo'ldagina qayta saqlashi mumkin. Yangi ma'lumot avval tekshiriladi,
o'sha papkada alohida faylga yoziladi, so'ng rename qilinadi. Bu elektr uzilishi
yoki buzilgan diskdan to'liq himoya va avtomatik loyiha backup tizimi emas.

## Qurish

`package.json` build.files ichida `desktop/**/*` majburiy: u tushib qolsa
paket main processni yuklay olmaydi. `scripts/pack-asar.cjs` internet talab
qilmaydi va kod yangilanishini yaratadi. Setup.exe uchun electron-builder va
Electron yuklab olingan bo'lishi kerak. `docs/TESTING.md` dagi Windows sinovi
release chiqarishdan oldin bajariladi.

