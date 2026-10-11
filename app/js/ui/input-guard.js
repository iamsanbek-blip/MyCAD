/* ==========================================================================
   js/ui/input-guard.js
   INTERFEYS QOTIB QOLISHINI DAVOLASH

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== NIMA UCHUN BU MODUL BOR =====
//
// Alomat: masofa / radius / oraliq maydonlariga ba'zan son yozib bo'lmaydi,
//         oynadan chiqib qayta kirilsa tuzaladi.
//
// Uchta sabab aniqlandi:
//
//   1. HODISA OQIMI. Maydon ichidagi bosish va klavish hodisalari kanvasga
//      ham yetib borardi. Kanvas ularni "chizish" deb tushunib, o'z rejimini
//      yoqib qo'yishi mumkin edi.
//
//   2. QOTIB QOLGAN HOLAT. Sudrash paytida Alt+Tab bosilsa yoki oyna fokusni
//      yo'qotsa, `mouseup` hech qachon kelmasdi. Natijada `panning`,
//      `draggingGrip`, `selecting`, `draggingText`, `stretchBoxing` kabi
//      bayroqlar `true` bo'lib QOLIB KETARDI. Keyingi bosishlar noto'g'ri
//      shoxobchaga tushardi. Oynaga qayta kirish ba'zan buni tozalardi —
//      "chiqib kirsam tuzaladi" alomatining sababi shu.
//
//   3. TAKROR ISHLOV. Ba'zi hotkeylar `inField` tekshiruvidan OLDIN turadi.
//      Ular Ctrl bilan ishlagani uchun zarar bermaydi, lekin himoya qatlami
//      baribir kerak.
//
// Bu modul FAQAT shu uchtasini davolaydi. Chizish, DXF/SVG eksport va
// boshqa mantiqqa umuman tegmaydi.

// ---------------------------------------------------------------------------
//  1) HODISA IZOLYATSIYASI
//     Maydon ichidagi hodisalar kanvasga o'tmasin.
// ---------------------------------------------------------------------------
const GUARD_FIELD_TAGS = ['INPUT', 'SELECT', 'TEXTAREA'];

function guardIsField(el){
  return !!(el && GUARD_FIELD_TAGS.includes(el.tagName));
}

// Hozir kiritish maydonida turibmizmi?
function inInputField(){
  return guardIsField(document.activeElement);
}

function wireFieldIsolation(){
  // ⚠️ FAQAT KLAVIATURA. Sichqoncha hodisalari ATAYLAB to'xtatilmaydi.
  //
  // Nima uchun? Ilova tinglovchilari quyidagicha joylashgan:
  //     mousedown, dblclick  → CANVAS da  (maydon bosilganda ular baribir
  //                                        ishga tushmaydi — izolyatsiya keraksiz)
  //     mousemove, mouseup   → WINDOW da  (bular HAMMA joydan hodisa oladi)
  //
  // Agar mouseup ni maydon ustida to'xtatsak, quyidagi holat yuzaga keladi:
  //   1. Foydalanuvchi kanvasda sudraydi (pan / ramka / grip)
  //   2. Sichqonchani panelga olib chiqib, MAYDON USTIDA qo'yib yuboradi
  //   3. window.mouseup HECH QACHON ishga tushmaydi
  //   4. `panning` / `selecting` / `draggingGrip` `true` bo'lib QOLIB KETADI
  //   5. Shundan keyin maydonlar javob bermay qoladi
  //
  // Aynan shu — "maydonga hech narsa yozib bo'lmayapti, dasturni qayta
  // ochsam tuzaladi" alomatining sababi. Shuning uchun sichqoncha hodisalari
  // erkin o'tadi, qotib qolgan holat esa pastdagi kafolat bilan tozalanadi.
  const KEY_EVENTS = ['keydown','keyup','keypress'];
  KEY_EVENTS.forEach(type=>{
    document.addEventListener(type, (e)=>{
      if(!guardIsField(e.target) || e.target.closest?.('#shortcutDialog')) return;
      if(e.key==='Escape' || e.key==='Enter') return;   // maydondan chiqish yo'li
      if(e.ctrlKey || e.metaKey) return;                // Ctrl buyruqlari o'tsin
      e.stopPropagation();
    }, true);
  });
}

// ---------------------------------------------------------------------------
//  KAFOLAT: sichqoncha tugmasi QAYERDA qo'yib yuborilsa ham, sudrash holati
//  tozalanadi. window.mouseup ilova mantiqidan KEYIN ishlaydi (bubble bosqichi,
//  keyinroq ro'yxatdan o'tgani uchun), shuning uchun normal ish buzilmaydi —
//  faqat qoldiq holat tozalanadi.
// ---------------------------------------------------------------------------
function wireDragSafetyNet(){
  window.addEventListener('mouseup', ()=>{
    // Ilova o'z mouseup ishlovini bajarib bo'lgach tekshiramiz
    setTimeout(()=>{
      const stuck = (typeof panning!=='undefined' && panning) ||
                    (typeof selecting!=='undefined' && selecting) ||
                    (typeof draggingGrip!=='undefined' && draggingGrip) ||
                    (typeof stretchBoxing!=='undefined' && stretchBoxing) ||
                    (typeof draggingText!=='undefined' && draggingText);
      if(stuck) resetInteractionState('mouseup-safety');
    }, 0);
  }, false);

  // Sichqoncha tugmasi bosilmagan holda harakat qilyaptimi, lekin sudrash
  // bayrog'i hali yoqiqmi? Demak `mouseup` yo'qolgan — tozalaymiz.
  let idle = 0;
  window.addEventListener('mousemove', (e)=>{
    if(e.buttons !== 0){ idle = 0; return; }
    const stuck = (typeof panning!=='undefined' && panning) ||
                  (typeof selecting!=='undefined' && selecting) ||
                  (typeof draggingGrip!=='undefined' && draggingGrip) ||
                  (typeof stretchBoxing!=='undefined' && stretchBoxing);
    if(!stuck){ idle = 0; return; }
    // bir necha kadr kutamiz — tasodifiy holatni tozalab yubormaslik uchun
    if(++idle >= 3){ idle = 0; resetInteractionState('mousemove-safety'); }
  }, false);
}

// ---------------------------------------------------------------------------
//  2) QOTIB QOLGAN HOLATNI TOZALASH
//     Oyna fokusni yo'qotganda yoki sichqoncha tugmasi tashqarida
//     qo'yib yuborilganda — barcha sudrash bayroqlarini nolga qaytaramiz.
// ---------------------------------------------------------------------------
function resetInteractionState(reason){
  const cleared = [];

  // Sudrash / pan / tanlash ramkasi
  if(typeof panning!=='undefined' && panning){ panning=false; cleared.push('panning'); }
  if(typeof selecting!=='undefined' && selecting){ selecting=false; cleared.push('selecting'); }
  if(typeof draggingGrip!=='undefined' && draggingGrip){ draggingGrip=null; cleared.push('draggingGrip'); }
  if(typeof dragMoved!=='undefined' && dragMoved){ dragMoved=false; cleared.push('dragMoved'); }
  if(typeof mouseDownPos!=='undefined' && mouseDownPos){ mouseDownPos=null; cleared.push('mouseDownPos'); }
  if(typeof mouseDownCorner!=='undefined' && mouseDownCorner){ mouseDownCorner=null; cleared.push('mouseDownCorner'); }
  if(typeof mouseDownModKey!=='undefined' && mouseDownModKey){ mouseDownModKey=false; cleared.push('mouseDownModKey'); }
  if(typeof pendingLineClickIdx!=='undefined' && pendingLineClickIdx!==null){
    pendingLineClickIdx=null; cleared.push('pendingLineClickIdx'); }
  if(typeof draggingText!=='undefined' && draggingText){ draggingText=null; cleared.push('draggingText'); }
  if(typeof stretchBoxing!=='undefined' && stretchBoxing){ stretchBoxing=false; cleared.push('stretchBoxing'); }
  if(typeof refDragging!=='undefined' && refDragging){ refDragging=null; cleared.push('refDragging'); }

  // "M bosildi, endi I kutilyapti" holati — 260 ms ichida hal bo'lishi kerak
  if(typeof pendingMirrorKey!=='undefined' && pendingMirrorKey){
    pendingMirrorKey=false; cleared.push('pendingMirrorKey'); }

  if(cleared.length && typeof draw==='function') draw();
  return cleared;
}

function wireFocusReset(){
  // Oyna fokusni yo'qotdi (Alt+Tab, boshqa dasturga o'tish)
  window.addEventListener('blur', ()=>resetInteractionState('blur'));
  // Sahifa ko'rinmay qoldi (minimallashtirish)
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) resetInteractionState('hidden');
  });
  // Sichqoncha oyna tashqarisida qo'yib yuborilgan bo'lsa — qaytganda tozalaymiz
  window.addEventListener('focus', ()=>{
    // e.buttons === 0 bo'lsa hech qanday tugma bosilmagan
    setTimeout(()=>{
      if(typeof panning!=='undefined' && (panning || (typeof selecting!=='undefined' && selecting))){
        resetInteractionState('focus');
      }
    }, 0);
  });
  // Sichqoncha hujjatdan butunlay chiqib ketdi va tugma bosilmagan
  document.addEventListener('mouseleave', (e)=>{
    if(e.buttons === 0) resetInteractionState('mouseleave');
  });
}

// ---------------------------------------------------------------------------
//  3) MAYDONLARNI TIKLASH
//     Maydon negadir javob bermay qolsa, unga bosilganda majburan
//     fokus beriladi va tanlanadi.
// ---------------------------------------------------------------------------
function wireFieldRecovery(){
  document.addEventListener('mousedown', (e)=>{
    if(!guardIsField(e.target)) return;
    const el = e.target;
    if(el.disabled || el.readOnly) return;

    // Maydonga bosildi — sudrash holati bo'lishi MUMKIN EMAS. Agar qolgan
    // bo'lsa, darhol tozalaymiz (aks holda keyingi harakatlar buziladi).
    resetInteractionState('field-mousedown');

    // Fokusni ikki bosqichda kafolatlaymiz: darhol va kadr oxirida.
    // Nima uchun ikki marta? Agar shu paytda biror kod qayta chizsa yoki
    // DOM ni yangilasa, fokus ketishi mumkin — ikkinchi urinish qaytaradi.
    const grab = ()=>{
      if(document.activeElement === el) return;
      try{ el.focus({preventScroll:true}); }catch(err){ try{ el.focus(); }catch(e2){} }
    };
    setTimeout(grab, 0);
    requestAnimationFrame(grab);
  }, true);

  // Maydondan chiqqanda qotib qolgan chizish holatlari bo'lsa tozalanadi
  document.addEventListener('focusin', (e)=>{
    if(!guardIsField(e.target)) return;
    // maydonga kirdik — sudrash holati bo'lishi mumkin emas
    resetInteractionState('focusin');
  });
}

// ---------------------------------------------------------------------------
//  4) QAYTA CHIZISHNI CHEKLASH (debounce)
//     Maydon qiymati o'zgarganda `draw()` har bosilgan harfda emas, kadr
//     boshiga BIR MARTA chaqiriladi. Bu cheksiz sikl xavfini yo'qotadi va
//     yozishni sezilarli darajada silliqlashtiradi.
// ---------------------------------------------------------------------------
let _redrawQueued = false;
function requestRedraw(){
  if(_redrawQueued) return;
  _redrawQueued = true;
  requestAnimationFrame(()=>{
    _redrawQueued = false;
    if(typeof draw==='function') draw();
  });
}

// ---------------------------------------------------------------------------
function wireInputGuard(){
  wireFieldIsolation();
  wireDragSafetyNet();
  wireFocusReset();
  wireFieldRecovery();
}
