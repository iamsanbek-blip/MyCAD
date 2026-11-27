# Rugby 1.1.2 — CNC nesting, panelni Drawing'da tahrirlash, aralash ulagich, narx (2026-11-23)

- **Yordamchi chiziq — SketchUp kabi.** Asbobda A nuqtani, keyin B nuqtani bosasiz — A va B dan o'tuvchi cheksiz chiziq qo'yiladi
  (tik, gorizontal, chuqurlik bo'ylab yoki qiya). Ortho yoqilsa yo'nalish eng yaqin X/Y/Z o'qiga to'g'rilanadi. Magnit ikkala nuqtada
  ishlaydi, ikki yordamchi chiziq kesishgan joy ham magnit nuqtasi. Select (V) da chiziqni bosib tanlaysiz (Shift — qo'shish),
  Delete — o'chirish, Esc — bekor. Avval chiziq faqat ekran o'qi bo'ylab qo'yilardi va ba'zan ko'rinmasdi.
- **Lineyka — nima o'lchanganini ko'rsatadi.** Nishon belgisi va nomi (Uch, O'rta, Markaz, Qirra, Kesishish; magnitsiz bo'lsa —
  «Panel yuzasi» / «Bo'sh joy», qizil uzuk) A va B nuqtada o'lchovdan keyin ham qoladi; yozuvda «A: Uch → B: O'rta». Qirraga
  yopishganda o'sha qirra yonadi.
- **Stretch (W) — faqat tanlangan panel.** Panel tanlab W bosilsa asbob shu panelga «qulflanadi»: boshqa panel ustiga adashib bosish
  tanlovni almashtirmaydi (ramka belgilash boshlanadi), ramka va bosish faqat tanlangan panel nuqtalarini oladi, faqat u cho'ziladi.
  Kursor ostidagi nuqta oq bo'lib yonadi — bosilsa aynan o'sha belgilanadi (ustma-ust bo'lsa kameraga yaqini). Boshqa panelga o'tish:
  Esc (tanlovni tozalash) yoki Panellar ro'yxati; Shift+bosish — panel qo'shish.
- **OBJ import — yoysimon va har qanday shakl.** File ▸ Import ▸ OBJ (Blender va b.) endi faqat to'g'ri qutilarni emas, bir xil
  qalinlikdagi har qanday ob'ektni panelga aylantiradi: yoysimon qovurg'a, o'yiqli, burchakli, qiya (erkin burchak) plita. Ichidagi
  teshik — kesik bo'ladi. Metrdagi fayl avtomatik mm ga o'tadi, Y — yuqoriga (Blender eksporti standarti). Qalinligi bir xil bo'lmagan
  ob'ektlar nomi bilan xabarda ko'rsatiladi. Import qilingan panelni Stretch, 2 marta bosib Drawing'da tahrirlash va CNC'ga yuborib
  listga joylash mumkin (kontur yoy bo'yicha).
- **Nusxa (C) — Blender Duplicate kabi.** Nusxa asl joyida paydo bo'lib darhol kursorga ergashadi (magnit, X/Y/Z, raqam bilan masofa
  ishlaydi); sichqoncha bosilgan joyda qotadi; Esc yoki o'ng tugma — nusxa bekor bo'ladi. Avval nusxa o'ng tomonga 50 mm surilib qolardi.
- **Stretch (W) kesik va o'yiq nuqtalarini ham tahrirlaydi.** Panel tanlanib W bosilsa kontur bilan birga kesik/o'yiq burchaklari ham
  nuqta bo'lib chiqadi (ramka bilan hammasi belgilanadi) — surib teshik joyini/o'lchamini o'zgartirasiz. Kontur qirrasi surilganda teshik,
  kesik va pazlar joyidan qo'zg'almaydi. Teshik chetida jism qirrasidan tashqari ortiqcha chiziq yo'q.
- **O'yiq — haqiqiy chuqurcha, qiya qo'shni panel izi.** Modeling'da o'yiq panelda chuqurligi bilan ko'rinadi (tubi va devorlari),
  tekstura chiziqlari kesik va o'yiq ustidan o'tmaydi (avval «noma'lum chiziq» bo'lib ko'rinardi), OBJ eksportida ham kesik/o'yiq bor.
  Panelni Drawing'da tahrirlaganda qiya (erkin burchakli) qo'shni panel izi haqiqiy qiya shaklda chiqadi (panel qalinligidagi kesimi),
  qiya qirralari butun panel bo'ylab davom etadi — andoza olish va magnit bilan aniq chizish mumkin.
- **Magnit ichki shakllarni ham topadi, zoom yaqinroq.** Modeling'da panel olib borilganda kesik burchaklari va qirralari (ikkala yuzada va
  devorida), o'yiq yuzasi va tubi, teshik markazlari magnit nuqtasi bo'ladi. Sichqoncha g'ildiragi kursor ostidagi nuqtaga qarab
  yaqinlashadi (o'sha nuqta ekranda joyida qoladi), eng yaqin masofa 100 mm emas, 2 mm; «Tanlanganga moslash» ham mayda detalga yaqinroq.
- **Erkin burchakda aylantirish (Rotate, R).** Ortho o'chiq (Free) bo'lsa halqani sudrab istalgan burchakka buriladi (0.1°), **Ctrl** bosib
  tursangiz — butun gradus (1°, 2° …); sudrash paytida raqam yozib Enter — aniq burchak, Esc — bekor. Ortho (O) yoqilgan bo'lsa — avvalgidek
  90° qadam. 90° karrali bo'lib qolsa panel oddiy yo'nalishga qaytadi. Qiya panel xossalarida «Qiya: 37.4°» va **To'g'rilash** tugmasi;
  qiya panelga furnitura avtomatik qo'yilmaydi (qo'lda teshiklar qoladi), Cutlist/CNC/DXF panelning o'z o'lchamida.
- **Panelni Drawing'da tahrirlashda teshik va o'yiq.** Pastki satrda **◻ Teshik (kesib o'tadi)** va **▣ O'yiq [chuqurlik] mm** (B yuza
  belgisi bilan): panel ichiga chizilgan yopiq shakl (to'rtburchak, polyline …) kesik yoki o'yiq bo'ladi, aylana — sverlo teshigi (kontur
  qatlamida — kesib o'tadi). Modeling'da kesik haqiqiy teshik bo'lib ko'rinadi, o'yiq — yuzada kontur; DXF/CNC'da kesik — kontur qatlamida,
  o'yiq — `POCKET_Z{chuqurlik}`; CSV va «Teshiklar» ro'yxatida ham bor. Qayta ochilganda o'z qatlamida chiqadi.
- **Yordamchi chiziqlar faqat magnit uchun.** Drawing tahriridagi kulrang qo'shni panel izlari (yozuvsiz — nomlar chizishga xalaqit bermaydi) va yordamchi chiziqlar endi tanlanmaydi,
  ko'chmaydi va o'chmaydi (Ctrl+A ham olmaydi) — magnit ularga avvalgidek yopishadi.
- **«Butun korpus ▸ Ko'chirish» va ↺/↻ 90° tanlovga ishlaydi.** Biror panel (yoki guruh) tanlangan bo'lsa, X/Y/Z masofaga faqat tanlangan
  panellar ko'chadi va buriladi; hech narsa tanlanmagan bo'lsa — butun korpus. Maydon ustidagi yozuv kim ko'chishini ko'rsatadi
  («tanlangan 2 ta panel» yoki «butun korpus»).
- **Panel tanlanganda material va uning list o'lchami.** Xossalar tepasida «LMDF · list [2750] × [1830] mm» — o'lcham shu yerda tahrirlanadi va
  materialga bog'lanadi (loyihada `ms`; oxirgi kiritilgani shu kompyuterda yangi loyihalar uchun eslab qolinadi; kiritilmagan materialga
  Cutlist «List hisobi» dagi umumiy o'lcham — «(umumiy)»). Narx, List hisobi va CNC'ga yuborish har material uchun o'z list o'lchamini
  ishlatadi (masalan LDSP 2800×2070, LMDF 2750×1830, akril 3050×2050). Detal o'lchami pastdagi Eni/Bo'yi maydonlarida; «Material bo'yicha» ro'yxatida tanlangan panel materiali avtomatik ko'rinadi; xossalarda **Material** maydoni
  (smart taklif bilan). Smart kiritish ro'yxati panel siljiganda yo'qolib qolmaydi (maydon ostiga qayta joylashadi).
- **Kromka viewportda qalinliksiz.** Kromkali qirra endi qirra yuzasida yarim shaffof rangli tasma va qirra o'rtasida bitta chiziq (panel chegara
  chiziqlari ochiq qoladi) — panel tashqarisiga
  chiqmaydi, magnit va o'lchamlarga xalaqit bermaydi. Qalinlik ma'lumoti saqlanadi: Cutlist (L1…/W1…), kromka metri, list hisobi, narx va
  birkada avvalgidek.
- **Panel rangi.** Panellar endi material bo'yicha avtomatik neytral tonda (bir materialdagi panellar bir xil; materialsiz — och
  kulrang-ko'k) — to'q va och fonda ko'rinadi. Panel xossalari ▸ **Rang**: o'zingiz tanlash (bir nechta panel tanlansa — hammasiga),
  **Avto** — qaytarish, **Materialga** — shu rang materialdagi hamma panelga (loyihada `mc` sifatida saqlanadi). Rang faqat ko'rinish uchun.
- **Drawing'da tahrirlashda yordamchi chiziqlar.** Panel 2 marta bosilganda vaqtinchalik sahifada `YORDAMCHI` qatlamida (kulrang):
  shu panelga tegib turgan yoki kesib o'tgan qo'shni panellarning izi (to'rtburchak + nomi — krisha, polka, orqa devor, fasad …), iz
  qirralaridan butun panel bo'ylab davom etuvchi chiziqlar va panel o'rta chiziqlari. Magnit (uch, kesishish) ularga yopishadi — o'yiq,
  kesik yoki shaklni qo'shni detalga aynan moslab chizasiz. «Modeling'ga qaytarish» ularni hisobga olmaydi; sahifa bilan o'chadi.
- **Stretch (W) strelkalari.** Nuqtalar tanlansa ularning markazida X/Y/Z strelkalari, tekislik kvadratlari va oq markaz chiqadi (Move kabi).
  Strelkani sudrash — faqat o'sha o'q bo'ylab cho'zish, kvadrat — tekislikda, markaz — ekran tekisligida; qadam (Make ▸ Qadam) va magnit
  ishlaydi, pastda ΔX/ΔY/ΔZ. Cho'zgandan keyin nuqtalar tanlovi qoladi — keyingi o'q bilan davom etish mumkin.
- **Gizmo ingichka va faol o'q aniq** (Move, Rotate, Scale, Stretch): strelka va halqalar ingichka (ushlash zonasi avvalgidek keng);
  sichqoncha ostidagi dasta sariq; sudrash paytida ushlangan o'q/tekislik sariq, qolganlari xiralashadi (3ds Max / Blender kabi).
- **Ship-paz — metallsiz tishli birikma** (furnitura turi: Alt+F ▸ Turi, panel Ulagich yoki J asbobi ▸ «Ship-paz»). Chet paneli (B)
  qirrasida tishlar ulanadigan panel (A) qalinligi bo'ylab chiqadi; A da ularga mos teshik (zazor bilan). Burchak birikmasida (tortma
  qutisi) teshik A chetiga chiqadi — kontur kesigi bo'ladi (box joint); o'rtada (oraliq polka) — A ichida teshib o'tadigan to'rtburchak.
  Ichki burchaklarda **dogbone** (freza Ø bo'yicha yarim aylana o'yiq) — CNC freza to'g'ri burchak qoldirmagani uchun detal o'tiradi.
  Sozlamalar (Furnitura ▸ Ship-paz): tish eni 40, ulanish chetidan 25, zazor 0.2, freza Ø 6, dogbone yoq/o'chiq; tishlar soni uzunlikka
  qarab. DXF'da kontur va teshiklar `CUT_Z…` qatlamida, yoylar haqiqiy (bulge); CNC sahifasida detal konturi tishlari bilan, teshiklar
  guruh ichida. Cutlist/List hisobi o'lchami tishsiz (bu birikma CNC uchun).
- **Ekssentrik o'yig'ini ikkinchi yuzaga o'tkazish.** Furnitura asbobi (J) ▸ **⇅ Ekss. tomoni** → ekssentrikli ulanish chizig'ini bosing:
  Ø15 o'yiq (va ishlov tomoni) panelning ikkinchi yuzasiga o'tadi, yana bosilsa qaytadi; Shift bilan bir nechtasi. Belgisi sariq.
  Standart — korpus ichiga qaragan yuza. Saqlanadi (`jf` — chet panelida, sherik id bo'yicha).
- **Modeling: guruh, massiv, teng taqsimlash** (Modeling ▸ Object va yuqori Object menyusi — Modeling ochiq bo'lsa panellarga ishlaydi).
  **Group** (Ctrl+G) — tanlangan panellar guruh: birini bosish (yoki ramka) butun guruhni tanlaydi; ro'yxatda ⛓. **Ungroup** (Ctrl+Shift+G).
  **Massiv…** — tanlangan panel(lar)ni N marta qadam X/Y/Z bilan nusxalash (standart qadam — tanlov eni bo'yicha, korpuslar qatori);
  «umumiy masofa» belgilansa qadam = masofa / N. Guruh nusxasi o'z guruhini oladi. **Teng taqsimlash Y / X / Z** — eng chetdagi ikki panel
  joyida, oradagilar teng oraliq bilan (masalan dno va krisha orasida polkalar). Furnituralangan korpusda yangi polkalarga teshik o'zi qo'yiladi.
- **Detal raqami va birka.** «CNC'ga yuborish» har detalga raqam beradi (sahifada nom tartibida, #1, #2 …). Nesting xaritasida har detal
  o'rtasida «#3 A. krisha / 568×500 · L1» (L — list raqami) — detal bilan birga ko'chadi; Drawing DXF eksportida `LABEL` qatlamida
  TEXT (kesilmaydi). Cnc ▸ **🏷 Birkalar** — A4 stiker varaq: 24 ta (70×37), 21 ta (70×42.3), 14 ta (105×42.3), 40 ta (52.5×29.7).
  Birkada: raqam, nom, L × W × qalinlik (Cutlist kabi: L — tekstura bo'ylab yoki uzun tomon), material, kromka sxemasi va «1 mm — 2 tomon»,
  teshiklar soni (B tomondan ishlansa — «B tomon tepada»), buyurtma nomi, «List 2/3». «O'tkazib yuborish» — avval ishlatilgan varaqning
  bo'sh kataklaridan boshlash; «Faqat tanlanganlar». **Chop etish** (printerda A4, masshtab 100%, chetlarsiz) yoki **HTML fayl**.
- **Furnitura asbobi (J yoki Object ▸ Furnitura (ulanish)) — Kromka kabi.** Ulanish chiziqlari va o'rtasidagi nuqta rangli ko'rinadi:
  to'q sariq — yevrovint, yashil — ekssentrik, moviy — shkant, binafsha — polkaderjatel, oq — umumiy, kulrang — fasad (petlya) / orqa devor
  (paz) / yupqa panel (o'zgarmaydi). Yuqoridagi paneldan turni tanlab chiziqni (yoki nuqtani) bosing — shu ulanishga beriladi va korpus
  o'zi teshiladi; yana bosilsa — umumiyga qaytadi. Shift + bosish yoki **ramka** (bo'sh joydan sudrash: chapdan o'ngga — to'liq ichida,
  o'ngdan chapga — tegib o'tgan) — bir nechta ulanishni tanlash, keyin tur tugmasi (masalan «Yo'q») — hammasiga; Esc — tozalash.
  Polka ulanishiga yevrovint berilsa — polka qotiriladi (polkaderjatel o'rniga), «Polkaderjatel» — qaytadi. Ulanish tanlovi panel
  ulagichidan va umumiydan ustun; loyihada saqlanadi (`jc` — chet paneli, sherik panel id bo'yicha). Ctrl+Z — qaytarish.
- **Furnitura modelga avtomatik moslashadi.** Furnituralangan korpusda panel cho'zilsa (Stretch), o'lchami o'zgarsa, ko'chsa, burilsa,
  Mirror qilinsa, nomi yoki ulagichi o'zgarsa yoki unga yangi panel tegsa — o'sha korpus o'zi qayta teshiladi (Ctrl+Z — bitta qadam).
  Qo'lda qo'yilgan teshiklar saqlanadi. Furnitura oynasida «Model o'zgarsa teshiklar avtomatik yangilansin» bilan o'chiriladi.
- **CNC sahifasida Modeling bosilsa** model saqlangan sahifa o'zi ochiladi (model CNC sahifasiga ko'chirilmaydi — bitta nusxa).
- **Bitta detalda turli ulagich.** Panel xossalari ▸ **Ulagich**: Umumiy / yevrovint / ekssentrik / shkant / yevrovint + shkant /
  ekssentrik + shkant / yo'q. Shu panel QIRRASI tegadigan ulanishlarda ishlaydi (masalan krisha → ikkala boka), bo'sh bo'lsa — yuzasi
  tegadigan panelniki, keyin Furnitura oynasidagi umumiy tur. Masalan krisha — ekssentrik + shkant, dno — yevrovint: bokada ikkala tur.
  Korpus allaqachon furnituralangan bo'lsa, tanlov bilan darhol qayta teshiladi. Bir nechta panel tanlab ham qo'yish mumkin.
- **CNC'ga yuborish — listga joylash** (Furnitura oynasi, Alt+F). Har material + qalinlik uchun yangi sahifa «CNC · LDSP oq 16 mm».
  Har detal — bitta **guruh**: kontur (`CUT_Z16`), teshiklar (`DRILL_D5_Z10`, `DRILL_D7_THRU` …), paz (`GROOVE_…`). Detal nestingda ham,
  qo'lda (bosib tanlash → Move) boshqa listga surilganda ham teshiklari bilan ko'chadi. List o'lchami va chekka — Cutlist «List hisobi»dan.
  Ishlov tomoni — ko'r teshik/pazi ko'p tomon (B bo'lsa ag'darib, ko'zgu). Teksturali detal tekstura list uzunligi (X) bo'ylab
  yotqiziladi va nestingda burilmaydi. Ikkinchi tomondagi ko'r teshik va chet teshiklari CNC sahifasiga chiqmaydi — hisobotda soni,
  DXF/CSV'da o'zi. Teshik aylanalari nestingda «bo'sh joy» hisoblanmaydi. Model o'z sahifasida qoladi (CNC sahifasida Modeling bo'sh).
- **Panelni 2 marta bosish → Drawing'da tahrirlash.** Vaqtinchalik sahifa «✎ nom»: kontur va teshiklar (A tomon va teshib o'tadigan —
  `DRILL_…`, B tomon — `B_…`). Drawing asboblari bilan istalgan shakl chiziladi; pastdagi **✓ Modeling'ga qaytarish** — eng katta yopiq
  shakl panel konturi bo'ladi, aylanalar — teshik (qatlam `DRILL_D8_Z12` bo'lsa Ø va chuqurlik shundan, aks holda 10 mm; `…THRU` — teshib
  o'tadi), surilgan/o'chirilgan teshiklar yangilanadi, kontur tashqarisidagisi tashlanadi. Panel joyi (profil burchagi) qimirlamaydi;
  qirralar soni o'zgarsa kromka belgisi olib tashlanadi. **✕ Bekor** — o'zgarishsiz. Ctrl+Z — qaytarish. Alt + 2 marta — eski 3D tez chizish.
- **Narx (smeta)** — 3D oynaning o'ng chetidagi «Narx» tugmasi (jami doim ko'rinadi). Bir marta kiritiladi va eslab qolinadi:
  1 list narxi (material + qalinlik), kromka 1 m (qalinlik bo'yicha), furnitura dona (yevrovint, ekssentrik, shkant, polkaderjatel,
  petlya, ruchka — teshiklardan sanaladi), ishlar (raspil m, kromka yopishtirish m, teshik dona, paz m, CNC list), qo'shimcha qatorlar,
  ustama %. Material: list soni (Cutlist list hisobi bilan bir xil) yoki m² + chiqit %. Har detal narxi (material ulushi, kromka, ishlar,
  furnitura) jadvalda va panel xossalarida; detallar yig'indisi = jami (qo'shimcha va ustamasiz). Kiritilmagan narx sariq. **CSV** — smeta.

---

# Rugby 1.1.2 — Furnitura, teshik va CNC DXF (2026-11-23)

- **Object ▸ Furnitura va teshiklar (CNC DXF)…** — Modeling, **Alt+F**. Tanlov bo'lsa tanlangan panellar, aks holda hamma ko'rinadigan panellar.
  «Furnituralash» korpus ulanishlarini (panel qirrasi boshqa panel yuzasiga tegadi, oraliq ≤ 3 mm) topib teshik qo'yadi:
  - **Yevrovint** (standart): yuzada Ø7 teshib o'tadi, qirrada Ø5×50; uchlaridan 50 mm, uzun ulanishda qadam ≤ 500. Yoki **ekssentrik**
    (Ø15×13 qirradan 34 mm, chetida Ø8×34, bokada shtok Ø5×11), **shkant** (Ø8: yuza 12, chet 25); «Yoniga shkant» — +32 mm.
  - **Polka** (nomi «polka…») — qotirilmaydi: bokada polkaderjatel Ø5×10, polka ostidan 8 mm, oldi/orqadan 37 mm (± qo'shimcha qator 32 mm).
  - **Fasad** (nomi «fasad…», bo'yi enidan katta — eshik): petlya chashkasi Ø35×13 ichki yuzada, chetdan K=4 (markaz 21.5), tepadan/pastdan 100,
    soni bo'yiga qarab 2–5; bokada planka teshiklari oldidan 37, ±16. Petlya fasad markaziga yaqin bokaga (teng bo'lsa — chap). Ruchka 128 mm,
    qarama-qarshi chetdan 40 (tortma fasadi — gorizontal, markazda); 0 — ruchkasiz.
  - **Orqa devor** (qalinligi ≤ 10): boka/krisha/dno'da paz — eni panel + 0.5, chuqurligi panel kirgan masofa (kirmasa 8 va ogohlantirish).
  - Fasad/polka/orqa devor nomdan aniqlanadi — avval **Avto-nom (Alt+N)**. Hamma o'lchamlar oynada o'zgartiriladi va eslab qolinadi.
  - Qayta bosilsa avtomatik teshiklar almashadi, qo'lda qo'yilganlar qoladi. Panel o'lchami/joyi o'zgarsa qayta bosing.
- **Tekshiruv**: panel tashqarisida, chetga juda yaqin, teshilib ketadi, ustma-ust, chet teshigi qalinlikka sig'maydi.
- **Panel xossalari ▸ Teshiklar**: ro'yxat (tur, yuza A/B/chet, U, V, Ø, chuqurlik), ✕ — o'chirish, qo'lda yuza teshigi qo'shish.
  U, V — panel burchagidan (profil koordinatasi). Teshiklar panel bilan ko'chadi, buriladi (90°, eni↔bo'yi) va Mirror'da aks etadi; loyihada saqlanadi.
- **View ▸ Teshik va pazlarni ko'rsatish**: yuza teshigi — to'q sariq halqa, chet teshigi — pushti halqa va chuqurlik chizig'i, paz — to'rtburchak.
- **DXF eksport (CNC)** — `rugby-cnc.dxf`, AutoCAD R12, mm. Har panel o'z koordinatasida (A tomoni); B tomonida ko'r teshik/paz bo'lsa —
  ag'darilgan B chizmasi ham. Qatlamlar (shablon sozlanadi): `CUT_Z16` kontur, `DRILL_D5_Z10` teshik, `DRILL_D7_THRU` teshib o'tadi,
  `GROOVE_W4_5_Z8` paz, `HDRILL_D5_Z50` chet teshigi (3 o'qli router teshiy olmaydi — присадка/qo'lda), `LABEL` yozuv.
  Kasr qatlam nomida `_` (R12 nomida nuqta bo'lmaydi). **Sverloga yaxlitlash**: ro'yxatdagi sverloga ± chegarada (standart 5,7,8,15,35; ±0.3) —
  Ø5.2 → Ø5; mos sverlo bo'lmasa «frezalash kerak» deb hisobotda. **Teshiklar CSV** — hamma teshik va paz ro'yxati.
- Hali yo'q: G-code, tortma yo'naltiruvchisi, Drawing'dagi aylanalarni teshikka aylantirish, Nanxing formati. Haqiqiy CNC'da sinalmagan.

---

# Rugby 1.1.2 — Smart kiritish va Avto-nom (2026-11-03)

- **Smart kiritish** (`app/js/ui/smart-input.js`, hamma maydonlarga o'zi ulanadi): oxirgi qiymatlar taklif qilinadi — «ch» → «chap boka», «3» → «3040».
  Tarix maydon turi bo'yicha (nom, raqam, material, izoh, matn), har biridan oxirgi 15 ta (Edit ▸ Smart kiritish… da 5–50, tozalash, o'chirish).
  Tab yoki → — kulrang davomni qabul qilish; ↓/↑ — ro'yxat (bo'sh maydonda ↓ — oxirgi qiymatlar); ro'yxatdan tanlab Enter — qabul + tasdiq; Esc — yopish.
  Oddiy Enter o'zgarmaydi. Nom maydonida lug'at: chap boka, o'ng boka, krisha, dno, polka, oraliq boka, orqa devor, fasad.
- **Avto-nom** (Modeling, Alt+N yoki Object ▸ Avto-nom): korpusni tanlab ro'para ko'rinishda bosing — chap/o'ng boka, oraliq boka 1.., krisha, dno,
  polka 1.. (pastdan), orqa devor, fasad. Bir nechta korpus bo'lsa «A. chap boka», «B. …» (CSV/Excel'da bitta katak, qatorlar korpus bo'yicha guruhlanadi).
  Tanlovsiz — butun sahna korpuslarga o'zi ajratiladi (perpendikulyar detallar yuza bilan tegsa — bitta korpus). Korpusning eski harfi saqlanadi.
- **Drawing'da kanvasga yoziladigan qiymatlar** (chiziq uzunligi, aylana radiusi, to'rtburchak eni × bo'yi, Move masofasi, Rotate/Scale, Stretch)
  ham smart: «3» → xira «040», → yoki Tab — qabul (to'rtburchakda Tab — qabul va bo'yga o'tish), Enter — tarixga yoziladi.
- **Tuzatildi — Drawing Move/Rotate/Scale/Mirror + Ortho**: setka yoki yaqin chiziq (Near) magniti Ortho'ni bosib ketardi va Move qiya ketardi
  (eski 1.1.2 da ham bor edi). Endi kuchsiz magnit Ortho o'qiga proyeksiyalanadi; uch/o'rta/markaz kabi aniq nuqtalar avvalgidek ustun.
- **Chizma matnlari standart 70 mm** (o'lcham matni va matn balandligi); o'zgartirilsa eslab qolinadi (aniqlik, birlik ham).
- **O'lcham yozuvi**: aniqlik — eng ko'p o'nlik xona, ortiqcha nollar ko'rsatilmaydi (3040.00 → 3040, 0.01 → 0.01, 12.50 → 12.5); standart 0.00.
  Chizmadagi jonli yozuvlar (masofa, Δ, burchak) ham shunday. Eski fayllardagi o'lchamlar ham nolsiz ko'rinadi.

---

# Rugby 1.1.2 — Modeling aniqligi (2026-11-03)

Batafsil: `docs/PANEL3D-1.1.2.md` («2026-11-03» bo'limi). Tekshiruvlar: `docs/TESTING.md`, `tests/modeling-precision.cjs`.

- **Magnit (3ds Max / Blender kabi)**: nishon kursor ostida qidiriladi (14 px); panelning haqiqiy geometriyasi — profil uchlari, qirra o'rtalari (qalinlik qirralari ham), markazlar, yangi «Qirra» (qirradagi eng yaqin nuqta). Ustuvorlik: uch > o'rta > markaz > qirra. Belgi turi bo'yicha shakl va nomi bilan chiqadi.
- **Tayanch nuqta**: Move asbobida panelni uchidan ushlasangiz — shu uch nishonga aynan tushadi (ushlashdan oldin belgisi ko'rinadi); aks holda tanlovning nishonga eng yaqin nuqtasi.
- **Gizmo**: X/Y/Z strelkalari, XY/YZ/XZ tekislik kvadratlari, oq markaz (ekran tekisligi); hover sariq; ekranda doimiy o'lcham; ko'rish yo'nalishiga parallel o'q yashiriladi. O'q bo'ylab sudrashda magnit endi ishlaydi (oldin rad etilardi).
- **Sudrash davomida**: X/Y/Z — o'q, Shift+X/Y/Z — tekislik, raqam — aniq masofa (125 Enter), Esc yoki o'ng tugma — bekor. Qadam siljishga (nisbiy) qo'llanadi.
- **3D kursor**: Shift + o'ng tugma (magnit nuqtasiga aynan), Make menyusida X/Y/Z, Alt+C kursor → tanlangan, Alt+S tanlangan → kursor, Alt+O kursor → 0, P — Pivot (aylantirish va Mirror kursor atrofida).
- Yangi panel (N) kursorga chap-past burchagi bilan ilashadi — burchak nishonga aynan tushadi. Stretch: ushlangan uch nishonga aynan tushadi.

---

# Rugby 1.1.2 — yangilanish (2026-10-30)

Batafsil: `docs/PANEL3D-1.1.2.md` (oxirgi bo'lim). Tekshiruvlar: `docs/TESTING.md`.

- **Cutlist** bo'limi (Modeling'dan keyin): raskroy jadvali, kromka L1/L2(/L3/L4) va W1/W2(/W3/W4) alohida ustunlarda, CSV/TXT eksport, list hisobi. Modeling soddalashtirildi.
- **Panel Types** (Drawing): Bazis fragmentlarining 2D varianti — 13 tur (Asosiy: blok, I, L, —, ⊢; Ramka ×4; Shkaf ×4, pastki blok 100 mm), boshlash nuqtasi L1/L2/R1/R2, en Tab bo'y, Depth = chizma darajasi (Z), t × ko'paytiruvchi, blok/ramka/shkaf ichiga polka (g'ildirak yoki raqam, H/V).
- **Tekstura yo'nalishi**: panel xossasi (yo'q / bo'yi / eni), 3D da chiziqlar, eksportda L = tekstura bo'ylab, Aylantirish=0, «Tekstura» ustuni; list hisobi hisobga oladi.
- **Modeling**: barcha tugmalarga hotkey (44 buyruq, View → Hotkeylar… da almashtiriladi), keng clipping, Top/Bottom aniq 90°, 2D ko'rinishda magnit chuqurlik darajasini o'zgartirmaydi, Stretch — hamma nuqta belgilansa panel har qanday o'q bo'ylab ko'chadi, «Butun korpus» da umumiy o'lcham (gabarit), fon mavzuga ergashadi. Bir nechta panelni birdaniga tahrirlash (qalinlik, o'lcham, tekstura, material, kromka), material bo'yicha tanlash (Shift+M). Cutlist: Material/Qalinlik filtri eksport va List hisobiga; List hisobida m² va kromka uzunligi.
- **Drawing Stretch**: obyekt tanlangan bo'lsa faqat uning nuqtalari ushlanadi.

---

# Yangi versiya — 1.1.2 (2026-10-15)

«Panel 3D» rejimi qo'shildi (korpus mebel, CNC, raspil). Batafsil: `docs/PANEL3D-1.1.2.md`.
3D modeli `.dbe` ichida `page.panel3d` sifatida saqlanadi. Node tekshiruvlari (`npm run check`, `npm test`, `node tests/panel3d.cjs`) o'tdi;
haqiqiy Electron/Windows oynasida 3D ko'rinish hali sinalmagan.

- Yuqori menyu (o'zgarmas tartib, chapdan): Logo, File (Yangi, Ochish, Saqlash, Boshqacha saqlash, Import DXF/rasm, Export DXF/SVG/PNG), Edit (Undo, Redo, Hotkey, Til, ko'rinish, chizish maydoni rangi), Object (Explode, Join, Soddalash, Group/Ungroup, Array, Tekislash — asboblar panelidan ko'chirilgan), Cnc (eski Bone edit), Drawing (eski Chizish), Modeling (eski Panel 3D). Menyu mavjud tugmalarni bosadi — mantiq o'zgarmagan. Fayllar: `app/js/ui/menubar.js`, `app/css/menubar.css`.

---

# Yangi versiya — 1.1.0-preview.3 (2026-10-15)

GitHub branch: `versions/1.1.0-preview.3`. Eski `main` va preview.2 relizi
alohida saqlanadi. Drive’da ham alohida yangi versiya papkasi yaratilgan.

Raqamli katakdagi takrorlangan fokus xatosi, panel ustidagi snap/geometry
hisoblari va klaviatura hodisalari tuzatildi. PNG hududini to‘rtburchak bilan
belgilash qo‘shildi. Batafsil: `docs/INPUT-PNG-PREVIEW3.md`.
Windows CI o‘tdi va preview.3 relizi chiqarildi. Dalillar `docs/TESTING.md` da.

Quyidagi ma’lumotlar oldingi preview.2 tarixidir.

---

# Joriy tarqatish holati — 2026-10-11

GitHub manbasi: https://github.com/iamsanbek-blip/MyCAD . Qisqa foydalanuvchi
qo‘llanmasi README.md da; v1.1.0-preview.2 Releases’da chiqarildi; yangi Windows preview reliz jarayoni
`docs/GITHUB-RELEASE.md` da. Tekshiruv holati `docs/TESTING.md` da.

Quyidagi 2026-10-03 qaydlar tarixiy. Yangi EXE Windows CI orqali qayta qurilib, sinovlardan o‘tdi;
oldingi EXE o‘rniga yangi relizning SHA256.txt fayli ustuvor. Imzolash sertifikati
hali mavjud emas; preview relizi SAC muammosini hal qilmaydi.

---

# Rugby — davom ettirish uchun loyiha holati

Versiya: **1.1.0-preview.2**, sana: **2026-10-03**.

Avvalgi **Rugby-Portable.exe** Windows Smart App Control tomonidan bloklangan:
tashqi launcher va ichki Rugby.exe'da Authenticode imzo yo'q. Foydalanuvchi
so'roviga binoan yangi imzosiz preview.2 qayta yig'ildi. Unda oxirgi panel va
profil tuzatishlari bor. Smart App Control muammosi hal bo'lmadi; SmartScreen
Run anyway ko'rsatishi Windows siyosatiga bog'liq. Ishonchli sertifikat/xizmat
hamda native Windows sinov muhiti hali kerak.
`docs/PORTABLE.md` sabab va imzolangan chiqarish yo'lini tushuntiradi.

Maqsad: Windows 2D CAD/CNC dasturi; oson tuzatiladigan kod, remap qilinadigan
hotkeylar va CorelDRAW/Excel kabi bitta faylda ko'p sahifa.

## Bajarilgan

1. `.dbe` v2, v1 migratsiya, barcha sahifalarni saqlash/ochish.
2. Sahifa qo'shish, nusxalash, nomlash, tartiblash, tasdiq bilan o'chirish;
   sahifaga alohida chizmalar, qatlam, ko'rinish va undo/redo.
3. 45 buyruqli markaziy hotkey registry; qidirish, konflikt tekshirish,
   bo'shatish, reset, profilga saqlash, kirill/lotin fizik tugmalari.
4. Save/Open/New da bekor qilishni to'g'ri ishlash; revision orqali davom
   etayotgan saqlash bilan tahrir to'qnashuvini hisobga olish.
5. Diskka atomik yozish moduli va native dialogdan tanlangan yo'llarni cheklash.
6. Fayl assotsiatsiyasidan kelgan loyihani renderer tayyor bo'lgach yetkazish;
   ikkinchi jarayon uchun ortiqcha oyna ochilishini to'xtatish.
7. Portativ Node tekshiruvlari, arxiv yig'ish skripti va texnik yo'riqnomalar.
8. Haqiqiy Electron oynasida chizish, sahifalar, hotkey, diskka saqlash/ochish
   sinovi; Linuxda o'tdi. Asboblar paneli 1100 va 1600 px kenglikda yon panelga
   chiqmaydi. Grafik test alohida foydalanuvchi profilidan foydalanadi.
9. `dist:portable` uchun Windows, GUI test va haqiqiy imzo tekshiruvlari.
   Imzosiz development build nomi alohida; u Smart App Control yechimi emas.

## Kod xaritasi

Renderer 45 ta oddiy scriptdan iborat. `app/index.html` dagi tartib muhim;
ular umumiy global scope'da ishlaydi. Yangi `core/` modullarida sof format va
hotkey qoidalari, `model/pages.js` da eski state bilan adapter bor.
`tools/panel3d-hw.js` — furnitura/teshik/DXF/CNC detali sof mantig'i, `tools/panel3d-price.js` — narx hisobi (ikkalasi DOM'siz,
Node'da test qilinadi), `panel3d.js` dan oldin yuklanadi.
`tools/part-labels.js` — CNC sahifasidagi detal raqami/nomi va A4 birkalar. Davom ettirish uchun to'plam: `docs/DAVOM-ETTIRISH.md`.
`docs/ARCHITECTURE.md` da har qism va kengaytirish tartibi tushuntirilgan.

## Ishga tushirish va tekshirish

`README.md` — foydalanish/build; `docs/TESTING.md` — tekshirilgan va hali
tekshirilmagan jihatlar. `npm run check` va `npm test` internet talab qilmaydi.
Paketdagi test logi avtomatik tekshiruvning dalili.

Windows GUI, native dialoglar va Smart App Control bu muhitda tekshirilmadi.
Linuxdagi haqiqiy Electron sinovi avtomatik o'tdi; dialog tanlovi mock qilingan.
Manba arxivi va yangi preview.2 EXE bir xil ilova kodini o'z ichiga oladi.
Paketdagi 20 fayl va manbadagi 60 fayl mosligi tekshirildi. `docs/verification/`
tekshiruv natijalarini saqlaydi.
`docs/NEXT-STEPS.md` keyingi P0/P1/P2 ishlarni fayllar bilan beradi.
GitHub'ga push qilinmagan, Drive'dagi asl manba/runtime fayllari almashtirilmagan.

## Moslik va chegaralar

- v2 loyiha eski v1 dasturga mos emas; muhim v1 loyihani boshqa nom bilan saqlang.
- DXF/PNG eksport faqat aktiv sahifa; G-code chiqarish mavjud emas.
- Undo/redo chizma uchun sahifaga alohida; sahifa o'chirish undo qilinmaydi.
- Undo tarixi faylda saqlanmaydi; hotkeylar esa foydalanuvchi profilida saqlanadi.
- Renderer hali global state ishlatadi. Framework yangilash va avtomatik
  tiklash alohida keyingi ishlar; bu reliz mukammallik kafolati emas.

Asl 1.0 hujjat: `docs/LEGACY-HUJJAT-1.0.md`. Undagi eski yo'llar/hotkeylar/
modul sonlari uchun ushbu hujjat va joriy kod ustuvor.
