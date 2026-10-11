/* ==========================================================================
   js/geometry/offset.js
   To'g'ri OFFSET geometriyasi — AutoCAD mantiqi

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== OFFSET GEOMETRIYASI =====
//
// ILGARI QANDAY EDI (va nima uchun noto'g'ri):
//   Eski kod shaklning ZICH NUQTALARINI (l.points) olib, har bir nuqtani
//   normal bo'ylab surardi. Natijada:
//     · yoy (arc) yo'qolib, o'nlab mayda to'g'ri chiziqqa aylanardi
//     · burchaklarda chiziqlar bir-birining ustidan kesib o'tardi
//     · hosil bo'lgan shaklni tahrirlab bo'lmasdi (yuzlab grip)
//
// ENDI QANDAY:
//   1. Shakl SEGMENT zanjiriga aylantiriladi (L = chiziq, A = yoy)
//   2. Har bir segment o'zicha suriladi:
//        chiziq → normal bo'ylab ko'chiriladi (chiziqligicha qoladi)
//        yoy    → radiusi ± d bo'ladi, markazi joyida (yoyligicha qoladi)
//   3. Qo'shni segmentlar KESISHUV nuqtasigacha kesiladi yoki cho'ziladi
//      (AutoCAD'ning OFFSETGAPTYPE=0 xatti-harakati)
//   4. O'z-o'zini kesib o'tgan "halqalar" olib tashlanadi
//
// Natija: chiziq chiziqligicha, yoy yoyligicha; grip'lar soni asl shakldagidek.

const OFF_EPS = 1e-7;

// ---- ko'makchi kesishuvlar ----------------------------------------------
function offLineCarrier(p1, p2, p3, p4){          // cheksiz ikki chiziq
  const d1={x:p2.x-p1.x, y:p2.y-p1.y}, d2={x:p4.x-p3.x, y:p4.y-p3.y};
  const den = d1.x*d2.y - d1.y*d2.x;
  if(Math.abs(den) < 1e-12) return [];
  const t = ((p3.x-p1.x)*d2.y - (p3.y-p1.y)*d2.x)/den;
  return [{x:p1.x+d1.x*t, y:p1.y+d1.y*t}];
}
function offLineCircle(p1, p2, O, r){             // cheksiz chiziq × aylana
  const d={x:p2.x-p1.x, y:p2.y-p1.y};
  const f={x:p1.x-O.x,  y:p1.y-O.y};
  const a=d.x*d.x+d.y*d.y;
  if(a < 1e-18) return [];
  const b=2*(f.x*d.x+f.y*d.y), c=f.x*f.x+f.y*f.y-r*r;
  const disc=b*b-4*a*c;
  if(disc < 0) return [];
  const sq=Math.sqrt(disc);
  return [(-b-sq)/(2*a), (-b+sq)/(2*a)].map(t=>({x:p1.x+d.x*t, y:p1.y+d.y*t}));
}
function offCircleCircle(O1, r1, O2, r2){
  const dx=O2.x-O1.x, dy=O2.y-O1.y, D=Math.hypot(dx,dy);
  if(D<1e-12 || D>r1+r2+1e-9 || D<Math.abs(r1-r2)-1e-9) return [];
  const a=(r1*r1-r2*r2+D*D)/(2*D);
  const h=Math.sqrt(Math.max(0, r1*r1-a*a));
  const xm=O1.x+a*dx/D, ym=O1.y+a*dy/D;
  return [{x:xm+h*dy/D, y:ym-h*dx/D}, {x:xm-h*dy/D, y:ym+h*dx/D}];
}

// Ikki segmentning "tashuvchi" (cheksiz) shakllari kesishuvi
function offSegCarrierInts(s1, s2){
  const a1 = s1.t==='A' ? segArcInfo(s1) : null;
  const a2 = s2.t==='A' ? segArcInfo(s2) : null;
  if(!a1 && !a2) return offLineCarrier(s1.a, s1.b, s2.a, s2.b);
  if(a1 && !a2)  return offLineCircle(s2.a, s2.b, {x:a1.cx,y:a1.cy}, a1.r);
  if(!a1 && a2)  return offLineCircle(s1.a, s1.b, {x:a2.cx,y:a2.cy}, a2.r);
  return offCircleCircle({x:a1.cx,y:a1.cy}, a1.r, {x:a2.cx,y:a2.cy}, a2.r);
}

// Nuqta segment ICHIDA yotadimi? (uchlari hisobga olinmaydi)
function offPointInSeg(s, p, tol){
  tol = tol==null ? 1e-6 : tol;
  if(s.t!=='A'){
    const d={x:s.b.x-s.a.x, y:s.b.y-s.a.y};
    const L2=d.x*d.x+d.y*d.y;
    if(L2<1e-18) return false;
    const t=((p.x-s.a.x)*d.x + (p.y-s.a.y)*d.y)/L2;
    if(t<=tol || t>=1-tol) return false;
    const q={x:s.a.x+d.x*t, y:s.a.y+d.y*t};
    return Math.hypot(q.x-p.x, q.y-p.y) < 1e-5;
  }
  const ai=segArcInfo(s); if(!ai) return false;
  if(Math.abs(Math.hypot(p.x-ai.cx, p.y-ai.cy) - ai.r) > 1e-5) return false;
  const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
  const ap=Math.atan2(p.y-ai.cy, p.x-ai.cx);
  const rel = ai.ccw ? nz(ap-ai.a0) : nz(ai.a0-ap);
  const sw  = Math.abs(ai.sweep);
  return rel > sw*tol && rel < sw*(1-tol);
}

// ---- segment uchlarini o'zgartirish (shaklini saqlagan holda) -------------
function offSegReEnd(s, newA, newB){
  if(s.t!=='A'){
    const A=newA||s.a, B=newB||s.b;
    if(Math.hypot(B.x-A.x, B.y-A.y) < 1e-9) return null;
    return {t:'L', a:{x:A.x,y:A.y}, b:{x:B.x,y:B.y}};
  }
  const ai=segArcInfo(s); if(!ai) return null;
  const O={x:ai.cx, y:ai.cy}, r=ai.r;
  const snap=p=>{ const vx=p.x-O.x, vy=p.y-O.y, L=Math.hypot(vx,vy)||1;
                  return {x:O.x+vx/L*r, y:O.y+vy/L*r}; };
  const A=snap(newA||s.a), B=snap(newB||s.b);
  const a0=Math.atan2(A.y-O.y, A.x-O.x), a1=Math.atan2(B.y-O.y, B.x-O.x);
  const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
  const sweep = ai.ccw ? nz(a1-a0) : nz(a0-a1);
  if(sweep < 1e-7 || sweep > Math.PI*2-1e-7) return null;
  const am = a0 + (ai.ccw?1:-1)*sweep/2;
  return {t:'A', a:A, m:{x:O.x+r*Math.cos(am), y:O.y+r*Math.sin(am)}, b:B};
}

// ---- bitta segmentni surish ----------------------------------------------
// d > 0  → harakat yo'nalishidan CHAPGA
function offOneSeg(s, d){
  if(s.t!=='A'){
    const dx=s.b.x-s.a.x, dy=s.b.y-s.a.y, L=Math.hypot(dx,dy);
    if(L<1e-12) return null;
    const nx=-dy/L*d, ny=dx/L*d;
    return {t:'L', a:{x:s.a.x+nx, y:s.a.y+ny}, b:{x:s.b.x+nx, y:s.b.y+ny}};
  }
  const ai=segArcInfo(s); if(!ai) return null;
  // CCW yoyda markaz harakat yo'nalishidan CHAPDA → chapga surish radiusni
  // KAMAYTIRADI. CW yoyda aksincha.
  const nr = ai.ccw ? ai.r - d : ai.r + d;
  if(nr < 1e-6) return null;                    // yoy yo'q bo'lib ketdi
  const O={x:ai.cx, y:ai.cy};
  const sc=p=>{ const vx=p.x-O.x, vy=p.y-O.y, L=Math.hypot(vx,vy)||1;
                return {x:O.x+vx/L*nr, y:O.y+vy/L*nr}; };
  return {t:'A', a:sc(s.a), m:sc(s.m), b:sc(s.b)};
}

// ---- burchakni yopish: kesish yoki cho'zish -------------------------------
// Qaytaradi: [yangiS1, (ixtiyoriy bog'lovchi yoy), yangiS2] yoki null
function offJoinPair(s1, s2, corner, d){
  const gap = Math.hypot(s2.a.x-s1.b.x, s2.a.y-s1.b.y);
  if(gap < 1e-9) return [s1, null, s2];         // allaqachon tutashgan

  const cands = offSegCarrierInts(s1, s2);
  if(cands.length){
    const ref = {x:(s1.b.x+s2.a.x)/2, y:(s1.b.y+s2.a.y)/2};
    let best=null, bd=Infinity;
    cands.forEach(p=>{
      const q=Math.hypot(p.x-ref.x, p.y-ref.y);
      if(q<bd){ bd=q; best=p; }
    });
    // O'ta o'tkir tashqi burchakda kesishuv juda uzoqqa ketadi va uzun
    // "nayza" hosil bo'ladi. Bunday holda burchakni YOY bilan aylantiramiz —
    // bu CNC uchun ham to'g'riroq.
    if(best && bd < Math.abs(d)*8 + 1e-6){
      const A=offSegReEnd(s1, null, best);
      const B=offSegReEnd(s2, best, null);
      if(A && B) return [A, null, B];
    }
  }
  // bog'lovchi yoy: asl burchak nuqtasi atrofida, radius = |d|
  if(corner){
    const r=Math.abs(d);
    const a0=Math.atan2(s1.b.y-corner.y, s1.b.x-corner.x);
    const a1=Math.atan2(s2.a.y-corner.y, s2.a.x-corner.x);
    const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
    let sweep=nz(a1-a0), ccw=true;
    if(sweep > Math.PI){ sweep = Math.PI*2 - sweep; ccw=false; }
    if(sweep > 1e-6){
      const am=a0+(ccw?1:-1)*sweep/2;
      return [s1, {t:'A', a:{x:s1.b.x,y:s1.b.y},
                   m:{x:corner.x+r*Math.cos(am), y:corner.y+r*Math.sin(am)},
                   b:{x:s2.a.x,y:s2.a.y}}, s2];
    }
  }
  // oxirgi chora — to'g'ri chiziq bilan ulash
  return [s1, {t:'L', a:{x:s1.b.x,y:s1.b.y}, b:{x:s2.a.x,y:s2.a.y}}, s2];
}

// ---- o'z-o'zini kesuvchi halqalarni olib tashlash -------------------------
function offRemoveLoops(segs, closed){
  for(let pass=0; pass<60; pass++){
    let cut=false;
    const n=segs.length;
    if(n<3) break;
    for(let i=0; i<n && !cut; i++){
      for(let j=i+2; j<n; j++){
        if(closed && i===0 && j===n-1) continue;   // yopiq shaklda tutashuv
        const cands=offSegCarrierInts(segs[i], segs[j]);
        let X=null;
        for(const p of cands){
          if(offPointInSeg(segs[i],p,1e-4) && offPointInSeg(segs[j],p,1e-4)){ X=p; break; }
        }
        if(!X) continue;
        const A=offSegReEnd(segs[i], null, X);
        const B=offSegReEnd(segs[j], X, null);
        if(!A || !B) continue;
        segs = segs.slice(0,i).concat([A,B], segs.slice(j+1));
        cut=true; break;
      }
    }
    if(!cut) break;
  }
  return segs;
}

// ---- asosiy: segment zanjirini surish ------------------------------------
function offsetSegChain(segs, closed, d){
  if(!segs || !segs.length || !isFinite(d) || Math.abs(d)<1e-9) return null;

  // 1) har bir segmentni alohida surish (yo'qolganlarini tashlab)
  const moved=[], corners=[];
  for(let i=0;i<segs.length;i++){
    const m=offOneSeg(segs[i], d);
    if(m){ moved.push(m); corners.push({x:segs[i].b.x, y:segs[i].b.y}); }
  }
  if(!moved.length) return null;
  if(moved.length===1 && !closed) return moved;

  // 2) qo'shni juftliklarni kesishuvda tutashtirish
  //    MUHIM: yopiq zanjirda oxirgi juftlik BIRINCHI segmentning allaqachon
  //    kesilgan nusxasi bilan ishlashi kerak. Aks holda birinchi segmentning
  //    oxiridagi kesim yo'qolib, zanjir uzilib qoladi.
  let out=[];
  if(moved.length < 2){
    out = moved.slice();
  } else {
    const lim = closed ? moved.length : moved.length-1;
    let cur = moved[0];
    for(let i=0;i<lim;i++){
      const isLast = closed && i===lim-1;
      const nxt = isLast ? out[0] : moved[(i+1)%moved.length];
      if(!nxt){ out.push(cur); break; }
      const res = offJoinPair(cur, nxt, corners[i], d);
      if(!res){ out.push(cur); cur=nxt; continue; }
      const [A, bridge, B] = res;
      out.push(A);
      if(bridge) out.push(bridge);
      if(isLast) out[0]=B; else cur=B;
    }
    if(!closed) out.push(cur);
  }

  // 3) halqalarni tozalash
  out = offRemoveLoops(out, closed);

  // 4) juda kalta segmentlarni tashlash
  out = out.filter(s=>{
    if(s.t!=='A') return Math.hypot(s.b.x-s.a.x, s.b.y-s.a.y) > 1e-7;
    const ai=segArcInfo(s);
    return ai && Math.abs(ai.sweep)*ai.r > 1e-7;
  });
  return out.length ? out : null;
}

// ---- shakl darajasidagi offset -------------------------------------------
// sign: +1 / -1 — qaysi tomonga. Qaytadi {segs, closed} yoki null.
function offsetShapeSegs(l, dist, sign){
  const d = dist*sign;
  if(l.kind==='circle'){
    const nr = l.radius + d;
    if(nr < 1e-4) return null;
    return {circle:{center:{x:l.center.x,y:l.center.y}, radius:nr}};
  }
  const segs = coalesceSegs(shapeToSegs(l));
  if(!segs || !segs.length) return null;
  const out = offsetSegChain(segs, !!l.closed, d);
  return out ? {segs:out, closed:!!l.closed} : null;
}

// Kursor shaklning qaysi tomonida? (+1 = chap, -1 = o'ng)
function offsetSideOf(l, worldPt){
  if(l.kind==='circle'){
    return len(sub(worldPt, l.center)) >= l.radius ? 1 : -1;
  }
  const segs = coalesceSegs(shapeToSegs(l));
  let best=1, bestD=Infinity;
  segs.forEach(s=>{
    if(s.t==='A'){
      const ai=segArcInfo(s); if(!ai) return;
      const dd=Math.abs(Math.hypot(worldPt.x-ai.cx, worldPt.y-ai.cy)-ai.r);
      if(dd<bestD){
        bestD=dd;
        const outward = Math.hypot(worldPt.x-ai.cx, worldPt.y-ai.cy) >= ai.r;
        best = ai.ccw ? (outward?-1:1) : (outward?1:-1);
      }
      return;
    }
    const np=nearestPointOnSegment(worldPt, s.a, s.b);
    const dd=len(sub(np, worldPt));
    if(dd<bestD){
      bestD=dd;
      const dir=norm(sub(s.b,s.a));
      best = dot(sub(worldPt,np), {x:-dir.y,y:dir.x}) >= 0 ? 1 : -1;
    }
  });
  return best;
}

// Kursordan shaklgacha bo'lgan eng qisqa masofa (interaktiv o'lcham uchun)
function offsetCursorDist(l, worldPt){
  if(l.kind==='circle') return Math.abs(len(sub(worldPt,l.center)) - l.radius);
  const segs = coalesceSegs(shapeToSegs(l));
  let best=Infinity;
  segs.forEach(s=>{
    if(s.t==='A'){
      const ai=segArcInfo(s); if(!ai) return;
      best=Math.min(best, Math.abs(Math.hypot(worldPt.x-ai.cx, worldPt.y-ai.cy)-ai.r));
      return;
    }
    best=Math.min(best, len(sub(nearestPointOnSegment(worldPt, s.a, s.b), worldPt)));
  });
  return isFinite(best) ? best : 0;
}
