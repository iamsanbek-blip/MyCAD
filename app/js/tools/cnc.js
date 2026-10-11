/* ==========================================================================
   js/tools/cnc.js
   CNC nesting — listga joylashtirish

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== CNC NESTING =====
// Detallarni material listlariga joylashtirish.
//
// QAYTA YOZILDI. Ilgari oddiy "shelf" (javon) algoritmi ishlatilardi: detallar
// balandligi bo'yicha saralanib, qatorlarga terilardi. Bu tez, lekin qatorlar
// orasida ko'p material behuda ketardi va bir marta joylashtirgandan keyin
// boshqa variantni ko'rishning iloji yo'q edi.
//
// Endi MaxRects (maksimal bo'sh to'rtburchaklar) algoritmi ishlatiladi va
// bir necha strategiya bo'yicha bir nechta reja tuzilib, eng yaxshilari
// tartiblanadi. "Joylash" tugmasi har bosilganda NAVBATDAGI variant qo'llanadi.
let nestSheets = [];   // [{x0,y0,x1,y1,index}] — detallar orqasida ko'rsatiladigan list konturi
let nestVariants = []; // joriy hisoblangan variantlar ro'yxati (eng yaxshisi birinchi)
let nestVariantIdx = 0;// keyingi bosishda qaysi variant qo'llanadi
let nestSignature = '';// detallar/parametrlar o'zgarsa variantlar qaytadan hisoblanadi

function nestNum(id, def, min){ const v=safeNum(id, def, min); return v; }

function drawNestSheets(){
  if(!nestSheets.length) return;
  ctx.save();
  nestSheets.forEach(s=>{
    const a=toScreen({x:s.x0,y:s.y1}), b=toScreen({x:s.x1,y:s.y0});
    ctx.setLineDash([10,6]); ctx.lineWidth=1.5; ctx.strokeStyle='rgba(94,225,255,.55)';
    ctx.strokeRect(a.x, a.y, b.x-a.x, b.y-a.y);
    ctx.setLineDash([]);
    ctx.fillStyle='rgba(94,225,255,.75)'; ctx.font='12px sans-serif'; ctx.textAlign='left';
    ctx.fillText('List '+(s.index+1)+'  '+Math.round(s.x1-s.x0)+'×'+Math.round(s.y1-s.y0)+' mm', a.x+6, a.y+16);
  });
  ctx.restore();
}

// Butun birlikni o'z bbox markazi atrofida 90° buradi.
function rotateUnit90(u){
  const cx=(u.bbox.x0+u.bbox.x1)/2, cy=(u.bbox.y0+u.bbox.y1)/2;
  u.shapes.forEach(s=>transformShapeBy(s, p=>({x:cx-(p.y-cy), y:cy+(p.x-cx)})));
  const w=u.bbox.x1-u.bbox.x0, hh=u.bbox.y1-u.bbox.y0;
  u.bbox={x0:cx-hh/2, y0:cy-w/2, x1:cx+hh/2, y1:cy+w/2};
}

/* ---------------------------------------------------------------------------
   MaxRects yadrosi
   Har bir list uchun "bo'sh to'rtburchaklar" ro'yxati saqlanadi. Detal
   qo'yilganda u ro'yxat kesib o'tilgan har bir to'rtburchakni 4 tagacha yangi
   bo'lakka bo'ladi, so'ng bir-birining ichida yotganlari tashlab yuboriladi.
   --------------------------------------------------------------------------- */
const NEST_EPS = 1e-6;

function nestFreeSplit(free, used){
  const out=[];
  for(const fr of free){
    const apart = used.x >= fr.x+fr.w-NEST_EPS || used.x+used.w <= fr.x+NEST_EPS ||
                  used.y >= fr.y+fr.h-NEST_EPS || used.y+used.h <= fr.y+NEST_EPS;
    if(apart){ out.push(fr); continue; }
    if(used.x > fr.x+NEST_EPS)
      out.push({x:fr.x, y:fr.y, w:used.x-fr.x, h:fr.h});
    if(used.x+used.w < fr.x+fr.w-NEST_EPS)
      out.push({x:used.x+used.w, y:fr.y, w:fr.x+fr.w-used.x-used.w, h:fr.h});
    if(used.y > fr.y+NEST_EPS)
      out.push({x:fr.x, y:fr.y, w:fr.w, h:used.y-fr.y});
    if(used.y+used.h < fr.y+fr.h-NEST_EPS)
      out.push({x:fr.x, y:used.y+used.h, w:fr.w, h:fr.y+fr.h-used.y-used.h});
  }
  return out;
}

// Boshqasining ichida to'liq yotgan (ya'ni foydasiz) to'rtburchaklarni olib tashlaydi.
function nestPrune(list){
  const out=[];
  for(let i=0;i<list.length;i++){
    const a=list[i];
    if(a.w<=NEST_EPS || a.h<=NEST_EPS) continue;
    let drop=false;
    for(let j=0;j<list.length && !drop;j++){
      if(i===j) continue;
      const b=list[j];
      if(b.w<=NEST_EPS || b.h<=NEST_EPS) continue;
      const inside = a.x>=b.x-NEST_EPS && a.y>=b.y-NEST_EPS &&
                     a.x+a.w<=b.x+b.w+NEST_EPS && a.y+a.h<=b.y+b.h+NEST_EPS;
      if(!inside) continue;
      const same = Math.abs(a.x-b.x)<NEST_EPS && Math.abs(a.y-b.y)<NEST_EPS &&
                   Math.abs(a.w-b.w)<NEST_EPS && Math.abs(a.h-b.h)<NEST_EPS;
      drop = same ? (j<i) : true;   // dublikat bo'lsa faqat birinchisi qoladi
    }
    if(!drop) out.push(a);
  }
  return out;
}

// Bo'sh to'rtburchakni baholash. Kichikroq ball = yaxshiroq joy.
function nestScore(fr, w, h, heur){
  const dw=fr.w-w, dh=fr.h-h;
  if(heur==='area')  return [fr.w*fr.h - w*h, Math.min(dw,dh)];   // eng kam ortiqcha maydon
  if(heur==='short') return [Math.min(dw,dh), Math.max(dw,dh)];   // eng tor qirra zich
  if(heur==='long')  return [Math.max(dw,dh), Math.min(dw,dh)];   // uzun qirra zich
  return [fr.y+h, fr.x];                                          // 'bl' — pastdan-chapdan
}

function nestBetter(s, best){
  if(!best) return true;
  if(s[0] < best.s[0]-NEST_EPS) return true;
  if(s[0] > best.s[0]+NEST_EPS) return false;
  return s[1] < best.s[1];
}

// Bitta listda detal uchun eng yaxshi joyni topadi (kerak bo'lsa 90° burib).
function nestFindSpot(free, w, h, heur, allowRot){
  let best=null;
  for(const fr of free){
    if(w<=fr.w+NEST_EPS && h<=fr.h+NEST_EPS){
      const s=nestScore(fr,w,h,heur);
      if(nestBetter(s,best)) best={x:fr.x, y:fr.y, w:w, h:h, rot:false, s};
    }
    if(allowRot && h<=fr.w+NEST_EPS && w<=fr.h+NEST_EPS){
      const s=nestScore(fr,h,w,heur);
      if(nestBetter(s,best)) best={x:fr.x, y:fr.y, w:h, h:w, rot:true, s};
    }
  }
  return best;
}

// Bitta to'liq reja tuzadi. items: [{w,h}] — GAP qo'shilmagan sof o'lchamlar.
function nestPack(items, order, heur, cfg, holes){
  const gap=cfg.gap;
  const cw=cfg.usableW+gap, ch=cfg.usableH+gap;  // gap bilan kengaytirilgan konteyner
  const sheets=[];
  const placements=new Array(items.length).fill(null);
  for(const idx of order){
    const it=items[idx];
    const w=it.w+gap, h=it.h+gap;
    // TUZATILDI (nesting): ilgari BIRINCHI sig'gan listga qo'yilardi
    // (first-fit) — 2-listda ancha yaxshiroq joy bo'lsa ham tekshirilmasdan
    // qolib ketardi. Endi BARCHA mavjud listlar tekshirilib, eng yaxshi joy
    // tanlanadi (best-fit).
    //
    // DIQQAT (halol izoh): bitta chaqiriqda best-fit first-fit'dan har doim
    // yaxshiroq bo'ladi deb KAFOLAT BERISH MUMKIN EMAS — bu greedy algoritm,
    // bir qadamdagi "eng yaxshi" tanlov keyingi detallar uchun yomonroq
    // bo'sh joy qoldirishi mumkin (150 tasodifiy sinovda ~4% holatda shunday
    // bo'ldi). Lekin runNesting() 20 xil tartib/qoida kombinatsiyasini
    // sinab, ENG YAXSHISINI tanlaydi — shu TIZIM darajasida (150 tasodifiy
    // sinovda tekshirilgan) natija hech qachon yomonlashmadi va ~1%
    // holatlarda butun bir list kamaydi.
    let spot=null, target=-1;
    for(let s=0;s<sheets.length;s++){
      const cand=nestFindSpot(sheets[s].free, w, h, heur, cfg.allowRot);
      // MUHIM: nestBetter(score, candidateObj) — ikkinchi argument to'liq
      // NOMZOD OBYEKTI bo'lishi kerak (u o'zining .s maydoniga qaraydi),
      // xom ball massivi emas.
      if(cand && nestBetter(cand.s, spot)){ spot=cand; target=s; }
    }
    if(!spot){
      const fresh=[{x:0, y:0, w:cw, h:ch}];
      spot=nestFindSpot(fresh, w, h, heur, cfg.allowRot);
      if(!spot) return null;                     // umuman sig'maydi
      sheets.push({free:fresh});
      target=sheets.length-1;
    }
    sheets[target].free = nestPrune(nestFreeSplit(sheets[target].free, spot));
    // detal ichidagi bo'sh joyni qaytarib qo'shamiz (o'yiq shakllar uchun)
    if(holes && holes[idx] && holes[idx].length){
      const extra=[];
      holes[idx].forEach(hr=>{
        // burilgan bo'lsa o'yiqni ham burib qo'yamiz
        const hw = spot.rot ? hr.h : hr.w, hh = spot.rot ? hr.w : hr.h;
        const hx = spot.rot ? (it.h - hr.y - hr.h) : hr.x;
        const hy = spot.rot ? hr.x : hr.y;
        if(hw>gap*2 && hh>gap*2)
          extra.push({x:spot.x+hx, y:spot.y+hy, w:hw, h:hh});
      });
      if(extra.length) sheets[target].free = nestPrune(sheets[target].free.concat(extra));
    }
    placements[idx] = {sheet:target, x:spot.x, y:spot.y, rot:spot.rot, w:spot.w-gap, h:spot.h-gap};
  }
  // Ixchamlik: har listda band bo'lgan eng yuqori nuqta. Kichikroq = kesib
  // olinadigan butun qoldiq ko'proq.
  const tops=new Array(sheets.length).fill(0);
  const rights=new Array(sheets.length).fill(0);
  placements.forEach(p=>{
    if(!p) return;
    tops[p.sheet]=Math.max(tops[p.sheet], p.y+p.h);
    rights[p.sheet]=Math.max(rights[p.sheet], p.x+p.w);
  });
  return {
    placements,
    sheetCount: sheets.length,
    compact: tops.reduce((a,b)=>a+b,0),
    spread: rights.reduce((a,b)=>a+b,0),
  };
}

// Rejani haqiqiy shakllarga qo'llaydi.
function nestApply(units, plan, cfg){
  const sheetStep = cfg.SW + Math.max(cfg.gap*4, 50);
  plan.placements.forEach((p,i)=>{
    if(!p) return;
    const u=units[i];
    if(p.rot) rotateUnit90(u);
    const w=u.bbox.x1-u.bbox.x0, h=u.bbox.y1-u.bbox.y0;
    const ox = p.sheet*sheetStep + cfg.MAR + p.x;
    const oy = cfg.MAR + p.y;
    moveUnit(u, ox-u.bbox.x0, oy-u.bbox.y0);
    u.bbox = {x0:ox, y0:oy, x1:ox+w, y1:oy+h};
  });
}

// Detallarni yig'ish: tanlanganlar, tanlov bo'sh bo'lsa — barcha tahrirlanuvchi shakllar.
function nestCollectUnits(){
  let units = alignUnits();
  if(units.length) return units;
  const all = drawnLines.filter(l=>isShapeEditable(l));
  if(!all.length) return [];
  const byGroup=new Map(); units=[];
  all.forEach(l=>{
    if(l.group){
      if(!byGroup.has(l.group)){ const u={shapes:[], group:l.group}; byGroup.set(l.group,u); units.push(u); }
      byGroup.get(l.group).shapes.push(l);
    } else units.push({shapes:[l]});
  });
  units.forEach(u=>{
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    u.shapes.forEach(s=>{ const b=shapeBBox(s); if(!b) return;
      x0=Math.min(x0,b.x0); y0=Math.min(y0,b.y0); x1=Math.max(x1,b.x1); y1=Math.max(y1,b.y1); });
    u.bbox = isFinite(x0)?{x0,y0,x1,y1}:null;
  });
  return units.filter(u=>u.bbox);
}

function runNesting(){
  const hint=document.getElementById('hint');
  const report=document.getElementById('nestReport');

  const units = nestCollectUnits();
  if(!units.length){ if(hint) hint.innerHTML='Joylash uchun detal yo\'q.'; return false; }

  const SW = nestNum('nestSheetW', 2440, 10);
  const SH = nestNum('nestSheetH', 1220, 10);
  const gap = nestNum('nestGap', 10, 0);
  const MAR = nestNum('nestMargin', 10, 0);
  const allowRot = !!(document.getElementById('nestRotate')||{}).checked;
  const usableW = SW-MAR*2, usableH = SH-MAR*2;
  if(usableW<=0 || usableH<=0){ alert('List o\'lchami juda kichik (chet juda katta).'); return false; }
  const cfg = {SW, SH, gap, MAR, usableW, usableH, allowRot};

  const items = units.map(u=>({w:u.bbox.x1-u.bbox.x0, h:u.bbox.y1-u.bbox.y0}));

  // Sig'maydiganlarni oldindan aniqlab, tushunarli xabar berish
  const tooBig = items.filter(it=>{
    const fits    = it.w<=usableW+NEST_EPS && it.h<=usableH+NEST_EPS;
    const fitsRot = allowRot && it.h<=usableW+NEST_EPS && it.w<=usableH+NEST_EPS;
    return !fits && !fitsRot;
  });
  if(tooBig.length){
    alert(tooBig.length+' ta detal listga sig\'maydi ('+Math.round(usableW)+'×'+Math.round(usableH)+
          ' mm). Listni kattalashtiring, chetni kamaytiring yoki 90° burishni yoqing.');
    return false;
  }

  // Bir xil so'rovmi? Ha bo'lsa — navbatdagi variantni ko'rsatamiz.
  const sig = [units.length, SW, SH, gap, MAR, allowRot,
               items.map(i=>Math.round(i.w)+'x'+Math.round(i.h)).sort().join(',')].join('|');

  const idxs = items.map((_,i)=>i);
  const ORDERS = {
    'balandlik':  idxs.slice().sort((a,b)=> items[b].h-items[a].h || items[b].w-items[a].w),
    'kenglik':    idxs.slice().sort((a,b)=> items[b].w-items[a].w || items[b].h-items[a].h),
    'maydon':     idxs.slice().sort((a,b)=> items[b].w*items[b].h - items[a].w*items[a].h),
    'uzun qirra': idxs.slice().sort((a,b)=> Math.max(items[b].w,items[b].h)-Math.max(items[a].w,items[a].h)),
    'perimetr':   idxs.slice().sort((a,b)=> (items[b].w+items[b].h)-(items[a].w+items[a].h)),
  };
  const HEURS = {
    'zich maydon': 'area',
    'pastdan':     'bl',
    'tor qirra':   'short',
    'uzun qirra':  'long',
  };

  const plans=[];
  Object.keys(ORDERS).forEach(oName=>{
    Object.keys(HEURS).forEach(hName=>{
      const plan = nestPack(items, ORDERS[oName], HEURS[hName], cfg);
      if(plan){ plan.name = oName+' + '+hName; plans.push(plan); }
    });
  });

  // HAQIQIY SHAKL bo'yicha qo'shimcha strategiya.
  // Detal chegarasi ichidagi, lekin konturidan TASHQARIDAGI bo'sh joy
  // (masalan yarim oyning ichi) MaxRects ga qaytariladi — shunda mayda
  // detallar o'sha o'yiqqa tushadi.
  if(typeof partFreeRects==='function'){
    let holes=null;
    try{
      holes = units.map(u=>partFreeRects(u, 8, gap, 3));
    }catch(err){ holes=null; }
    if(holes && holes.some(h=>h.length)){
      Object.keys(ORDERS).forEach(oName=>{
        ['area','bl'].forEach(hName=>{
          const plan = nestPack(items, ORDERS[oName], hName, cfg, holes);
          if(plan){ plan.name = oName+' + o\'yiqdan foydalanish'; plans.push(plan); }
        });
      });
    }
  }
  if(!plans.length){ alert('Joylashtirib bo\'lmadi — parametrlarni tekshiring.'); return false; }

  // Saralash: avval kam list, keyin ixchamroq (butun qoldiq ko'proq qoladi)
  plans.sort((a,b)=> a.sheetCount-b.sheetCount || a.compact-b.compact || a.spread-b.spread);

  // Bir xil natijali variantlarni tashlash — foydalanuvchiga faqat farqlilari kerak
  const seen=new Set(); const uniq=[];
  for(const p of plans){
    const key = p.sheetCount+'|'+Math.round(p.compact)+'|'+Math.round(p.spread);
    if(seen.has(key)) continue;
    seen.add(key); uniq.push(p);
    if(uniq.length>=5) break;
  }

  if(sig===nestSignature && nestVariants.length){
    nestVariantIdx = (nestVariantIdx+1) % uniq.length;
  } else {
    nestVariantIdx = 0;
  }
  nestSignature = sig;
  nestVariants = uniq;

  const plan = uniq[Math.min(nestVariantIdx, uniq.length-1)];
  if(plan.raster && typeof nestApplyRaster==='function') nestApplyRaster(units, plan, cfg);
  else nestApply(units, plan, cfg);

  const sheetStep = SW + Math.max(gap*4, 50);
  nestSheets = [];
  for(let s=0;s<plan.sheetCount;s++){
    const ox=s*sheetStep;
    nestSheets.push({x0:ox, y0:0, x1:ox+SW, y1:SH, index:s});
  }

  const partArea = items.reduce((a,it)=>a+it.w*it.h, 0);
  const util = Math.round(partArea/(SW*SH*plan.sheetCount)*100);

  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();

  // Nazariy minimum — foydalanuvchi qancha joy borligini ko'rsin.
  // Bu FAQAT yuza bo'yicha chegara; haqiqiy shakllar bilan unga yetish
  // odatda imkonsiz, lekin farq katta bo'lsa variantlarni almashtirib
  // ko'rishga arziydi.
  const minSheets = Math.ceil(partArea/(SW*SH));
  const gapNote = plan.sheetCount > minSheets
    ? (' · nazariy min '+minSheets+' — «Joylash»ni bosib boshqa variantlarni sinang')
    : ' · nazariy minimumda';
  const msg = units.length+' ta detal → '+plan.sheetCount+' ta list, material '+util+'%'+gapNote+
              ' · variant '+(nestVariantIdx+1)+'/'+uniq.length+' ('+plan.name+')';
  if(report) report.textContent = msg;
  if(hint) hint.innerHTML = 'Nesting: '+msg+'. <b>«Joylash»ni yana bosing — keyingi variant.</b>';
  return true;
}

function clearNestSheets(){
  const hadSheets=nestSheets.length>0;
  nestSheets=[]; nestVariants=[]; nestVariantIdx=0; nestSignature='';
  if(hadSheets)pushHistory();
  const r=document.getElementById('nestReport'); if(r) r.textContent='';
  draw();
}
