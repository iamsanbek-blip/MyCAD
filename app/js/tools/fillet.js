/* ==========================================================================
   js/tools/fillet.js
   FILLET va CHAMFER — chizmadagi burchakni yumaloqlash / qiyalash

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== FILLET / CHAMFER =====
//
// Oqim (AutoCAD kabi):
//   [F] fillet, [Shift+F] chamfer → rejim yonadi
//   1-klik  birinchi qirraga
//   2-klik  ikkinchi qirraga  → burchak yumaloqlanadi / qiyalanadi
//   → rejim OCHIQ qoladi, keyingi burchakka o'tish mumkin
//   Esc     chiqish
//
// NATIJA TOZA BO'LADI:
//   Fillet TO'LIQ BITTA YOY beradi — 2 ta uch nuqta + 1 ta o'rta nuqta.
//   Zich nuqtalar yo'q. Shuning uchun Explode / Join qilinganda ham yoy
//   yoyligicha qoladi (shapeFromSegs uni 'arcMid' + 'arcEnd' sifatida
//   saqlaydi).
//
// GEOMETRIYA USULI:
//   Fillet markazi — ikkala qirradan ham r masofada turgan nuqta. Ya'ni
//   ikkala qirrani r ga surib (offset), ularning kesishuvini topamiz.
//   Bu usul chiziq–chiziq, chiziq–yoy va yoy–yoy uchun BIR XIL ishlaydi.

let filletMode = null;      // null | 'fillet' | 'chamfer'
let filletPick = null;      // {shapeIdx, segIdx}

function filletRadius(){
  const v = parseNum((document.getElementById('filletR')||{}).value, NaN);
  return (isFinite(v) && v > 0) ? v : 5;
}

function startFillet(kind){
  finishTransform();
  if(typeof trimMode!=='undefined' && trimMode) finishTrim();
  if(typeof dimTool!=='undefined' && dimTool) finishDim();
  if(typeof offsetMode!=='undefined' && offsetMode) finishOffset();
  filletMode = (kind==='chamfer') ? 'chamfer' : 'fillet';
  filletPick = null;
  const b=document.getElementById(filletMode==='chamfer'?'chamferBtn':'filletBtn');
  if(b) b.classList.add('active');
  filletHint();
  draw();
}
function finishFillet(){
  filletMode=null; filletPick=null;
  ['filletBtn','chamferBtn'].forEach(id=>{
    const b=document.getElementById(id); if(b) b.classList.remove('active');
  });
  draw();
}
function filletHint(){
  const h=document.getElementById('hint'); if(!h) return;
  const nm = filletMode==='chamfer' ? 'Chamfer' : 'Fillet';
  const un = filletMode==='chamfer' ? 'masofa' : 'radius';
  h.innerHTML = (filletPick==null)
    ? (nm+' ('+un+' <b>'+filletRadius()+'</b> mm): <b>birinchi qirrani bosing</b> &middot; Esc: chiqish')
    : (nm+': <b>ikkinchi qirrani bosing</b> &middot; Esc: bekor');
}

// ---- qaysi shaklning qaysi segmenti bosildi? -----------------------------
function findSegmentNear(sx, sy, tolPx){
  tolPx = tolPx || 10;
  const tol = tolPx / view.scale;
  const w = toWorld(sx, sy);
  let best=null, bestD=tol;
  drawnLines.forEach((l, li)=>{
    if(l.hidden) return;
    if(typeof layerOf==='function'){ const ly=layerOf(l); if(!ly.visible || ly.locked) return; }
    if(l.kind==='circle') return;              // aylanada burchak yo'q
    const segs = coalesceSegs(shapeToSegs(l));
    segs.forEach((s, si)=>{
      let d;
      if(s.t==='A'){
        const ai=segArcInfo(s); if(!ai) return;
        d = Math.abs(Math.hypot(w.x-ai.cx, w.y-ai.cy) - ai.r);
      } else {
        d = len(sub(nearestPointOnSegment(w, s.a, s.b), w));
      }
      if(d < bestD){ bestD=d; best={shapeIdx:li, segIdx:si, segs:segs, shape:l}; }
    });
  });
  return best;
}

// ---- segmentda berilgan markazga eng yaqin (tegish) nuqta ----------------
function tangentPointOn(s, O){
  if(s.t!=='A'){
    const d={x:s.b.x-s.a.x, y:s.b.y-s.a.y};
    const L2=d.x*d.x+d.y*d.y;
    if(L2<1e-18) return null;
    const t=((O.x-s.a.x)*d.x + (O.y-s.a.y)*d.y)/L2;   // cheksiz chiziqda
    return {x:s.a.x+d.x*t, y:s.a.y+d.y*t};
  }
  const ai=segArcInfo(s); if(!ai) return null;
  const vx=O.x-ai.cx, vy=O.y-ai.cy, L=Math.hypot(vx,vy);
  if(L<1e-12) return null;
  return {x:ai.cx+vx/L*ai.r, y:ai.cy+vy/L*ai.r};
}

// Nuqtaning segment bo'ylab normallashgan o'rni: 0 = boshi, 1 = oxiri
function paramOnSeg(s, p){
  if(s.t!=='A'){
    const dx=s.b.x-s.a.x, dy=s.b.y-s.a.y, L2=dx*dx+dy*dy;
    if(L2<1e-18) return -1;
    return ((p.x-s.a.x)*dx + (p.y-s.a.y)*dy)/L2;
  }
  const ai=segArcInfo(s); if(!ai) return -1;
  const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
  const ap=Math.atan2(p.y-ai.cy, p.x-ai.cx);
  const rel = ai.ccw ? nz(ap-ai.a0) : nz(ai.a0-ap);
  const sw = Math.abs(ai.sweep);
  return sw>1e-12 ? rel/sw : -1;
}

// ---- FILLET markazi: ikkala qirradan r masofada -------------------------
// To'g'ri chiziqlarni ±r ga surganda TO'RTTA kesishuv chiqadi va ular
// burchak uchidan bir xil uzoqlikda bo'ladi. Shuning uchun "eng yaqini"
// mezoni yetarli emas — tegish nuqtalari QIRRA ICHIDA ekanini ham shu
// yerda tekshiramiz, aks holda fillet burchakning teskari tomoniga tushadi.
function filletCenter(s1, s2, r, vertex){
  let best=null, bestScore=Infinity;
  for(const g1 of [1,-1]) for(const g2 of [1,-1]){
    const o1=offOneSeg(s1, r*g1), o2=offOneSeg(s2, r*g2);
    if(!o1||!o2) continue;
    const cands=offSegCarrierInts(o1,o2);
    for(const O of cands){
      const T1=tangentPointOn(s1,O), T2=tangentPointOn(s2,O);
      if(!T1||!T2) continue;
      if(Math.abs(Math.hypot(T1.x-O.x,T1.y-O.y)-r) > 1e-6) continue;
      if(Math.abs(Math.hypot(T2.x-O.x,T2.y-O.y)-r) > 1e-6) continue;
      // s1 ning OXIRIDA, s2 ning BOSHIDA tegishi kerak
      const t1=paramOnSeg(s1,T1), t2=paramOnSeg(s2,T2);
      if(!(t1 >= -1e-6 && t1 <= 1+1e-6)) continue;
      if(!(t2 >= -1e-6 && t2 <= 1+1e-6)) continue;
      // uchga qanchalik yaqin tegsa — shuncha to'g'ri tanlov
      const score = (1-t1) + t2;
      if(score < bestScore){ bestScore=score; best={O, T1, T2}; }
    }
  }
  return best;
}

// Ikki nuqta orasidagi QISQA yoy (sweep < 180°) — fillet uchun aynan shu kerak
function shortArcThrough(O, T1, T2, r){
  const a0=Math.atan2(T1.y-O.y, T1.x-O.x);
  const a1=Math.atan2(T2.y-O.y, T2.x-O.x);
  const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
  let sweep=nz(a1-a0), ccw=true;
  if(sweep > Math.PI){ sweep=Math.PI*2-sweep; ccw=false; }
  if(sweep < 1e-7) return null;
  const am=a0+(ccw?1:-1)*sweep/2;
  return {t:'A', a:{x:T1.x,y:T1.y},
                 m:{x:O.x+r*Math.cos(am), y:O.y+r*Math.sin(am)},
                 b:{x:T2.x,y:T2.y}};
}

// Segment bo'ylab uchidan berilgan masofadagi nuqta (chamfer uchun)
function pointAlongFrom(s, fromStart, dist){
  if(s.t!=='A'){
    const dx=s.b.x-s.a.x, dy=s.b.y-s.a.y, L=Math.hypot(dx,dy);
    if(L<1e-12) return null;
    const t=Math.min(1, dist/L);
    return fromStart ? {x:s.a.x+dx*t, y:s.a.y+dy*t}
                     : {x:s.b.x-dx*t, y:s.b.y-dy*t};
  }
  const ai=segArcInfo(s); if(!ai) return null;
  const total=Math.abs(ai.sweep)*ai.r;
  if(total<1e-12) return null;
  const frac=Math.min(1, dist/total);
  const a = fromStart ? ai.a0 + ai.sweep*frac
                      : ai.a0 + ai.sweep*(1-frac);
  return {x:ai.cx+ai.r*Math.cos(a), y:ai.cy+ai.r*Math.sin(a)};
}

// ---- burchakni qayta qurish ---------------------------------------------
// i va j — qo'shni segment indekslari (j = i+1, yopiqda aylanma ham)
function applyFilletAt(shape, segs, i, j, kind, amount){
  const n=segs.length;
  const closed=!!shape.closed;
  // qo'shnilikni aniqlaymiz va tartibga solamiz
  let a=i, b=j;
  const adjacent = (x,y)=> (y===x+1) || (closed && x===n-1 && y===0);
  if(!adjacent(a,b)){
    if(adjacent(b,a)){ const t=a; a=b; b=t; }
    else return {err:'Faqat YONMA-YON ikki qirrani tanlang.'};
  }
  const s1=segs[a], s2=segs[b];
  const vertex={x:s1.b.x, y:s1.b.y};

  let mid=null, T1=null, T2=null;
  if(kind==='chamfer'){
    T1=pointAlongFrom(s1, false, amount);        // s1 ning oxiridan orqaga
    T2=pointAlongFrom(s2, true,  amount);        // s2 ning boshidan oldinga
    if(!T1||!T2) return {err:'Chamfer masofasi qirradan uzun.'};
    if(Math.hypot(T2.x-T1.x, T2.y-T1.y) < 1e-9) return {err:'Chamfer masofasi juda kichik.'};
    mid={t:'L', a:{x:T1.x,y:T1.y}, b:{x:T2.x,y:T2.y}};
  } else {
    const fc=filletCenter(s1, s2, amount, vertex);
    if(!fc) return {err:'Bu burchakka '+amount+' mm radius sig\'maydi.'};
    T1=fc.T1; T2=fc.T2;
    mid=shortArcThrough(fc.O, T1, T2, amount);
    if(!mid) return {err:'Fillet yoyi qurilmadi.'};
  }

  // Tegish nuqtalari qirralarning ICHIDA yotishi shart. Aks holda radius
  // qirradan uzun bo'lib, shakl buzilib ketadi.
  const t1=paramOnSeg(s1,T1), t2=paramOnSeg(s2,T2);
  const nm = kind==='chamfer' ? 'Chamfer masofasi' : 'Fillet radiusi';
  if(!(t1 >= -1e-6 && t1 <= 1+1e-6) || !(t2 >= -1e-6 && t2 <= 1+1e-6)){
    return {err: nm+' juda katta — qirraga sig\'maydi.'};
  }

  const A=offSegReEnd(s1, null, T1);
  const B=offSegReEnd(s2, T2, null);
  if(!A||!B) return {err: nm+' juda katta — qirra yetmayapti.'};

  const out=segs.slice();
  out[a]=A; out[b]=B;
  out.splice(b, 0, mid);                          // a va b orasiga qo'shamiz
  return {segs:out};
}

// ---- bosish oqimi --------------------------------------------------------
function filletClick(sx, sy){
  const hit=findSegmentNear(sx, sy);
  if(!hit){
    document.getElementById('hint').innerHTML='Shu yerda qirra yo\'q — chiziq ustiga bosing.';
    return true;
  }
  if(filletPick==null){
    filletPick={shapeIdx:hit.shapeIdx, segIdx:hit.segIdx};
    drawnLines.forEach((l,i)=>l.selected=(i===hit.shapeIdx));
    filletHint(); draw(); renderDrawnList();
    return true;
  }
  if(hit.shapeIdx !== filletPick.shapeIdx){
    document.getElementById('hint').innerHTML='Ikkala qirra BITTA shaklga tegishli bo\'lishi kerak.';
    return true;
  }
  if(hit.segIdx === filletPick.segIdx){
    document.getElementById('hint').innerHTML='Boshqa qirrani tanlang.';
    return true;
  }
  const l=drawnLines[filletPick.shapeIdx];
  const segs=coalesceSegs(shapeToSegs(l));
  const amount=filletRadius();
  const res=applyFilletAt(l, segs, filletPick.segIdx, hit.segIdx, filletMode, amount);
  if(res.err){
    document.getElementById('hint').innerHTML='<b>'+res.err+'</b>';
    filletPick=null; drawnLines.forEach(x=>x.selected=false); draw();
    return true;
  }
  const built=shapeFromSegs(res.segs, !!l.closed, l);
  if(!built){
    document.getElementById('hint').innerHTML='Shaklni qayta qurib bo\'lmadi.';
    filletPick=null; draw(); return true;
  }
  drawnLines[filletPick.shapeIdx]=built;
  built.selected=false;
  filletPick=null;
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML =
    (filletMode==='chamfer'?'Chamfer':'Fillet')+' qo\'llandi ('+amount+' mm). '+
    '<b>Keyingi burchakni tanlang</b> yoki Esc.';
  return true;
}

// ---- tugmalar ------------------------------------------------------------
(function wireFillet(){
  const f=document.getElementById('filletBtn');
  if(f) f.addEventListener('click', ()=>{ filletMode==='fillet' ? finishFillet() : startFillet('fillet'); });
  const c=document.getElementById('chamferBtn');
  if(c) c.addEventListener('click', ()=>{ filletMode==='chamfer' ? finishFillet() : startFillet('chamfer'); });
})();
