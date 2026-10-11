/* ==========================================================================
   js/tools/area.js
   MAYDON va PERIMETR o'lchash

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== MAYDON (AREA) =====
//
// Nima uchun `signedArea(points)` yetarli emas?
//   `points[]` — bu yoylar mayda chiziqchalarga bo'lingan ZICH nuqtalar.
//   Ular bilan hisoblasak, yoy joyida ko'pburchak chiqadi va maydon
//   biroz XATO bo'ladi (yoy tashqariga qarasa — kam, ichkariga — ko'p).
//
// Shuning uchun SEGMENT zanjiri bilan ishlaymiz:
//   1. Har segmentning vatarini (chord) ko'pburchak sifatida olamiz
//   2. Har YOY uchun vatar bilan yoy orasidagi "segment maydoni"ni
//      matematik formula bilan qo'shamiz/ayiramiz:
//           A_seg = r²/2 · (θ − sin θ)
//      Yoy tashqariga qarasa qo'shiladi, ichkariga qarasa ayiriladi.
//
// Natija — AYNAN maydon, yaqinlashish emas.

// Bitta segment zanjirining aniq maydoni (belgili: CCW musbat)
function exactSignedArea(segs){
  if(!segs || !segs.length) return 0;
  // 1) vatarlar ko'pburchagi
  let a = 0;
  for(const s of segs){
    a += s.a.x*s.b.y - s.b.x*s.a.y;
  }
  a /= 2;
  // 2) yoy tuzatmalari
  for(const s of segs){
    if(s.t !== 'A') continue;
    const ai = segArcInfo(s);
    if(!ai) continue;
    const th = Math.abs(ai.sweep);
    if(th < 1e-12) continue;
    const segArea = (ai.r*ai.r/2) * (th - Math.sin(th));
    // ai.ccw — yoyning aylanish yo'nalishi. CCW yoy vatardan CHAPDA
    // (ya'ni ko'pburchakdan tashqarida) yotadi → maydon qo'shiladi.
    a += ai.ccw ? segArea : -segArea;
  }
  return a;
}

// Aylana yoki segment zanjiri — shakl darajasida
function shapeArea(l){
  if(!l) return 0;
  if(l.kind === 'circle') return Math.PI * l.radius * l.radius;
  if(!l.closed) return 0;                      // ochiq chiziqda maydon yo'q
  const segs = coalesceSegs(shapeToSegs(l));
  if(!segs || !segs.length) return 0;
  return Math.abs(exactSignedArea(segs));
}

// Perimetr (yoy uzunliklari bilan)
function shapePerimeter(l){
  if(!l) return 0;
  if(l.kind === 'circle') return 2*Math.PI*l.radius;
  const segs = coalesceSegs(shapeToSegs(l));
  if(!segs || !segs.length) return 0;
  let p = 0;
  for(const s of segs){
    if(s.t === 'A'){
      const ai = segArcInfo(s);
      if(ai) p += Math.abs(ai.sweep) * ai.r;
    } else {
      p += Math.hypot(s.b.x-s.a.x, s.b.y-s.a.y);
    }
  }
  return p;
}

// ---- teshiklarni hisobga olish -------------------------------------------
// Agar bir shakl butunlay boshqasining ichida yotsa, u TESHIK deb qaraladi
// va katta shaklning maydonidan ayiriladi. CNC uchun aynan shu kerak:
// "material qancha" degan savolga to'g'ri javob beradi.
function shapeBoundsOf(l){
  if(l.kind === 'circle')
    return {x0:l.center.x-l.radius, y0:l.center.y-l.radius,
            x1:l.center.x+l.radius, y1:l.center.y+l.radius};
  const pts = l.points || [];
  if(!pts.length) return null;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  pts.forEach(p=>{ x0=Math.min(x0,p.x); y0=Math.min(y0,p.y);
                   x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); });
  return isFinite(x0) ? {x0,y0,x1,y1} : null;
}

function pointInShape(pt, l){
  if(l.kind === 'circle')
    return Math.hypot(pt.x-l.center.x, pt.y-l.center.y) <= l.radius;
  const pts = l.points || [];
  if(pts.length < 3) return false;
  let inside = false;
  for(let i=0, j=pts.length-1; i<pts.length; j=i++){
    const a=pts[i], b=pts[j];
    if(((a.y>pt.y) !== (b.y>pt.y)) &&
       (pt.x < (b.x-a.x)*(pt.y-a.y)/((b.y-a.y)||1e-12) + a.x)) inside = !inside;
  }
  return inside;
}

// A butunlay B ning ichidami?
function shapeInsideShape(A, B){
  if(A === B) return false;
  const ba = shapeBoundsOf(A), bb = shapeBoundsOf(B);
  if(!ba || !bb) return false;
  if(ba.x0 < bb.x0-1e-6 || ba.y0 < bb.y0-1e-6 ||
     ba.x1 > bb.x1+1e-6 || ba.y1 > bb.y1+1e-6) return false;
  // bir nechta nuqtani sinaymiz (chekka holatlarga chidamli bo'lishi uchun)
  const pts = A.kind==='circle'
    ? [A.center, {x:A.center.x+A.radius*0.6, y:A.center.y},
                 {x:A.center.x, y:A.center.y+A.radius*0.6}]
    : (A.points||[]).filter((_,i,arr)=> i % Math.max(1, Math.floor(arr.length/7)) === 0);
  if(!pts.length) return false;
  let inCount = 0;
  pts.forEach(p=>{ if(pointInShape(p, B)) inCount++; });
  return inCount > pts.length*0.7;
}

// ---- tanlangan shakllarning umumiy hisoboti ------------------------------
// Qaytadi: {count, gross, holes, net, perimeter, items:[...]}
function measureSelection(list){
  const shapes = (list && list.length ? list : drawnLines.filter(l=>l.selected))
                 .filter(l=>{
                   if(l.hidden) return false;
                   if(typeof layerOf==='function' && !layerOf(l).visible) return false;
                   return l.closed || l.kind==='circle';
                 });
  const items = shapes.map(l=>({
    shape: l,
    area: shapeArea(l),
    perim: shapePerimeter(l),
    isHole: false,
  }));
  // teshiklarni belgilash
  items.forEach(it=>{
    for(const other of items){
      if(other === it) continue;
      if(other.area <= it.area) continue;          // faqat kattaroq ichida
      if(shapeInsideShape(it.shape, other.shape)){ it.isHole = true; break; }
    }
  });
  let gross=0, holes=0, perim=0;
  items.forEach(it=>{
    perim += it.perim;
    if(it.isHole) holes += it.area; else gross += it.area;
  });
  return {count:items.length, gross, holes, net:gross-holes, perimeter:perim, items};
}

// ---- son formatlash ------------------------------------------------------
// mm² katta bo'lsa m² ga o'tamiz — 2 440 000 mm² o'qib bo'lmaydi
function fmtArea(mm2, prec){
  const p = (prec==null) ? 2 : prec;
  if(Math.abs(mm2) >= 1e6) return (mm2/1e6).toFixed(p)+' m²';
  if(Math.abs(mm2) >= 1e4) return (mm2/100).toFixed(p)+' sm²';
  return mm2.toFixed(p)+' mm²';
}
function fmtLen(mm, prec){
  const p = (prec==null) ? 1 : prec;
  if(Math.abs(mm) >= 1000) return (mm/1000).toFixed(p+1)+' m';
  return mm.toFixed(p)+' mm';
}

// ---- panelga chiqarish ---------------------------------------------------
function reportArea(){
  const box = document.getElementById('areaReport');
  const sel = drawnLines.filter(l=>l.selected);
  const r = measureSelection(sel.length ? sel : null);

  if(!r.count){
    const msg = sel.length
      ? 'Tanlangan shakllar orasida <b>yopiq</b> kontur yo\'q.'
      : 'Maydon o\'lchash uchun yopiq shakl(lar)ni tanlang.';
    if(box) box.innerHTML = '<span style="color:var(--text-dim);">'+msg+'</span>';
    const h=document.getElementById('hint'); if(h) h.innerHTML=msg;
    return null;
  }

  const holeNote = r.holes > 0
    ? ('<div style="color:var(--text-dim);margin-top:3px;">teshiklar: −'+fmtArea(r.holes)+'</div>')
    : '';
  if(box){
    box.innerHTML =
      '<div><b style="color:var(--cyan);font-size:14px;">'+fmtArea(r.net)+'</b>'+
      '<span style="color:var(--text-dim);"> &nbsp;('+r.count+' ta kontur)</span></div>'+
      holeNote+
      '<div style="color:var(--text-dim);margin-top:3px;">perimetr: '+fmtLen(r.perimeter)+'</div>';
  }
  const h=document.getElementById('hint');
  if(h) h.innerHTML = 'Maydon: <b>'+fmtArea(r.net)+'</b> &middot; perimetr: '+
                      fmtLen(r.perimeter)+' &middot; '+r.count+' ta kontur'+
                      (r.holes>0 ? ' (teshiklar ayirilgan)' : '');
  return r;
}

// ---- tugmalarni ulash ----------------------------------------------------
function wireArea(){
  const b=document.getElementById('areaBtn');
  if(b) b.addEventListener('click', ()=>reportArea());
}
