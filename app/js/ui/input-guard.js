/* ==========================================================================
   js/ui/input-guard.js
   INTERFEYS QOTIB QOLISHINI DAVOLASH

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// Keep field editing native. Each global command handler checks this helper;
// do not intercept events during document capture, before the field sees them.
function isTextInputTarget(el){
  return !!(el && (['INPUT','SELECT','TEXTAREA'].includes(el.tagName) || el.isContentEditable));
}
function guardIsField(el){ return isTextInputTarget(el); }
function inInputField(){ return isTextInputTarget(document.activeElement); }

// ---------------------------------------------------------------------------
//  KAFOLAT: sichqoncha tugmasi QAYERDA qo'yib yuborilsa ham, sudrash holati
//  tozalanadi. window.mouseup ilova mantiqidan KEYIN ishlaydi (bubble bosqichi,
//  keyinroq ro'yxatdan o'tgani uchun), shuning uchun normal ish buzilmaydi —
//  faqat qoldiq holat tozalanadi.
// ---------------------------------------------------------------------------
function wireDragSafetyNet(){
  window.addEventListener('mouseup', ()=>{
    // Registered after the application mouseup handler; clean leftovers now,
    // not in a timer that could cancel a later drag.
    const stuck = panning || selecting || draggingGrip || stretchBoxing || draggingText || draggingRef;
    if(stuck) resetInteractionState('mouseup-safety');
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
  if(typeof draggingRef!=='undefined' && draggingRef){ draggingRef=null; cleared.push('draggingRef'); }

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
  window.addEventListener('focus', ()=>resetInteractionState('focus'));
  // Sichqoncha hujjatdan butunlay chiqib ketdi va tugma bosilmagan
  document.addEventListener('mouseleave', (e)=>{
    if(e.buttons === 0) resetInteractionState('mouseleave');
  });
}

// ---------------------------------------------------------------------------
//  3) MAYDONLARNI TIKLASH
//     Maydonga kirishda qolgan drag holati tozalanadi. Fokusni brauzer
//     boshqaradi; kechiktirilgan focus() chaqiruvlari ishlatilmaydi.
// ---------------------------------------------------------------------------
function wireFieldRecovery(){
  document.addEventListener('mousedown', (e)=>{
    if(!guardIsField(e.target)) return;
    const el = e.target;
    if(el.disabled || el.readOnly) return;

    // Maydonga bosildi — sudrash holati bo'lishi MUMKIN EMAS. Agar qolgan
    // bo'lsa, darhol tozalaymiz (aks holda keyingi harakatlar buziladi).
    resetInteractionState('field-mousedown');

    // Let the browser's pointer default action focus the clicked field.
    // A queued focus() can otherwise steal focus after Tab or a later click.

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
  wireDragSafetyNet();
  wireFocusReset();
  wireFieldRecovery();
}
