/* ==========================================================================
   js/geometry/segments.js
   SEGMENT-NATIVE yadro: segment zanjiri, arc, trim parametrlari

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= SEGMENT-NATIVE CORE =================
// A shape's true geometry is a chain of segments:
//   {t:'L', a, b}        straight
//   {t:'A', a, m, b}     arc through 3 points (start, middle, end)
// `points[]` is only a RENDER CACHE derived from these segments. Every editing
// operation (join / explode / trim / import / export / dogbone) works on
// segments, so curves are never turned into faceted straight runs.
function segArcInfo(s){
  const c = circleFrom3Pts(s.a, s.m, s.b);
  if(!c) return null;
  const a0=Math.atan2(s.a.y-c.y, s.a.x-c.x);
  const am=Math.atan2(s.m.y-c.y, s.m.x-c.x);
  const a1=Math.atan2(s.b.y-c.y, s.b.x-c.x);
  const nz=x=>{ while(x<0)x+=TWO_PI(); while(x>=TWO_PI())x-=TWO_PI(); return x; };
  const ccwEnd=nz(a1-a0), ccwMid=nz(am-a0);
  const ccw = ccwMid <= ccwEnd;
  const sweep = ccw ? ccwEnd : -(TWO_PI()-ccwEnd);
  return {cx:c.x, cy:c.y, r:c.r, a0, sweep, ccw};
}
// Sample an arc segment finely enough that the chord error stays under `tol` mm.
function sampleArcSeg(s, tol){
  tol = tol || 0.02;
  const ai=segArcInfo(s);
  if(!ai) return [{x:s.b.x,y:s.b.y}];
  const cosv=Math.max(-1, Math.min(1, 1 - tol/Math.max(ai.r,1e-9)));
  const dAng=2*Math.acos(cosv);
  const n=Math.max(6, Math.min(128, Math.ceil(Math.abs(ai.sweep)/(dAng||0.1))));
  const out=[];
  for(let k=1;k<=n;k++){
    const ang=ai.a0 + ai.sweep*(k/n);
    out.push({x:ai.cx+ai.r*Math.cos(ang), y:ai.cy+ai.r*Math.sin(ang)});
  }
  return out;
}
function segsToPoints(segs, tol){
  if(!segs || !segs.length) return [];
  const pts=[{x:segs[0].a.x, y:segs[0].a.y}];
  segs.forEach(s=>{
    if(s.t==='A') sampleArcSeg(s,tol).forEach(p=>pts.push(p));
    else pts.push({x:s.b.x, y:s.b.y});
  });
  return pts;
}
// Grips: arc contributes its middle + end (so an arc always shows exactly
// 2 endpoints + 1 midpoint); a line contributes only its end.
function segsToGripsMeta(segs){
  if(!segs || !segs.length) return {grips:[], segMeta:[]};
  const grips=[{x:segs[0].a.x,y:segs[0].a.y}], segMeta=['start'];
  segs.forEach(s=>{
    if(s.t==='A'){
      grips.push({x:s.m.x,y:s.m.y}); segMeta.push('arcMid');
      grips.push({x:s.b.x,y:s.b.y}); segMeta.push('arcEnd');
    } else { grips.push({x:s.b.x,y:s.b.y}); segMeta.push('straight'); }
  });
  return {grips, segMeta};
}
function gripsMetaToSegs(grips, segMeta, closed){
  if(!grips || grips.length<2) return [];
  const segs=[]; let prev=grips[0];
  const meta = segMeta || grips.map((_,i)=>i===0?'start':'straight');
  for(let g=1; g<grips.length; g++){
    const m=meta[g];
    if(m==='arcMid') continue;
    if(m==='arcEnd'){ segs.push({t:'A', a:prev, m:grips[g-1], b:grips[g]}); prev=grips[g]; }
    else { segs.push({t:'L', a:prev, b:grips[g]}); prev=grips[g]; }
  }
  if(closed){
    const first=grips[0];
    const last=grips.length-1;
    // TUZATILDI (join bug): yopiq zanjirda oxirgi grip 'arcMid' bo'lsa, seam
    // ARC bilan yopilishi kerak. Ilgari bu yerda doim TO'G'RI CHIZIQ qo'yilar
    // edi — shuning uchun Join bosilganda oxirgi arc tekis chiziqqa aylanardi.
    if(meta[last]==='arcMid'){
      segs.push({t:'A', a:prev, m:grips[last], b:{x:first.x, y:first.y}});
    } else if(len(sub(prev,first)) > 1e-9){
      segs.push({t:'L', a:prev, b:first});
    }
  }
  return segs;
}
function circleToSegs(c, r){
  const segs=[];
  for(let q=0;q<4;q++){
    const a0=q*Math.PI/2, a1=(q+1)*Math.PI/2, am=(a0+a1)/2;
    segs.push({t:'A',
      a:{x:c.x+r*Math.cos(a0), y:c.y+r*Math.sin(a0)},
      m:{x:c.x+r*Math.cos(am), y:c.y+r*Math.sin(am)},
      b:{x:c.x+r*Math.cos(a1), y:c.y+r*Math.sin(a1)}});
  }
  return segs;
}
// Split an arc segment at parameter t (0..1) into two exact 3-point arcs.
function splitArcSeg(s, t){
  const ai=segArcInfo(s); if(!ai) return null;
  const P={x:ai.cx+ai.r*Math.cos(ai.a0+ai.sweep*t), y:ai.cy+ai.r*Math.sin(ai.a0+ai.sweep*t)};
  const m1=ai.a0+ai.sweep*(t/2), m2=ai.a0+ai.sweep*((1+t)/2);
  return [
    {t:'A', a:{x:s.a.x,y:s.a.y}, m:{x:ai.cx+ai.r*Math.cos(m1), y:ai.cy+ai.r*Math.sin(m1)}, b:P},
    {t:'A', a:{x:P.x,y:P.y},     m:{x:ai.cx+ai.r*Math.cos(m2), y:ai.cy+ai.r*Math.sin(m2)}, b:{x:s.b.x,y:s.b.y}}
  ];
}
// Canonical segment list for ANY shape kind.
function shapeToSegs(l){
  if(!l) return [];
  if(l.kind==='circle' && l.center && l.radius!=null) return circleToSegs(l.center, l.radius);
  if(l.kind==='arc' && l.arcA && l.arcMid && l.arcB)
    return [{t:'A', a:{x:l.arcA.x,y:l.arcA.y}, m:{x:l.arcMid.x,y:l.arcMid.y}, b:{x:l.arcB.x,y:l.arcB.y}}];
  if(l.grips && l.grips.length>=2) return gripsMetaToSegs(l.grips, l.segMeta, !!l.closed);
  // legacy fallback: plain point list
  const segs=[]; const p=l.points||[];
  for(let i=0;i<p.length-1;i++) segs.push({t:'L', a:{x:p[i].x,y:p[i].y}, b:{x:p[i+1].x,y:p[i+1].y}});
  if(l.closed && p.length>2) segs.push({t:'L', a:{x:p[p.length-1].x,y:p[p.length-1].y}, b:{x:p[0].x,y:p[0].y}});
  return segs;
}
// Build a shape from a segment chain. A single arc segment becomes a native
// arc entity (3 grips); 4 arc segments forming a full circle stay a circle.
function shapeFromSegs(segs, closed, proto){
  proto = proto || {};
  const base = {selected:false, layer:proto.layer, color:proto.color};
  segs = coalesceSegs(segs);
  // if the chain closes the loop, also try to merge the seam (last into first)
  if(closed && segs.length>1){
    const merged = coalesceSegs(segs.concat([segs[0]]));
    if(merged.length === segs.length){ segs = merged.slice(0, segs.length); }
  }
  // a closed chain of arcs on one circle is a real circle (4 cardinal grips)
  const circ = segsFormCircle(segs, closed);
  if(circ){
    const c=circ.center, r=circ.radius;
    return Object.assign(base, {kind:'circle', center:{x:c.x,y:c.y}, radius:r, closed:true,
      points:genCirclePts(c,r),
      grips:[{x:c.x+r,y:c.y},{x:c.x-r,y:c.y},{x:c.x,y:c.y+r},{x:c.x,y:c.y-r}]});
  }
  if(segs.length===1 && segs[0].t==='A'){
    const s=segs[0];
    return Object.assign(base, {kind:'arc', closed:false,
      arcA:{x:s.a.x,y:s.a.y}, arcMid:{x:s.m.x,y:s.m.y}, arcB:{x:s.b.x,y:s.b.y},
      points:segsToPoints(segs), grips:[{x:s.a.x,y:s.a.y},{x:s.m.x,y:s.m.y},{x:s.b.x,y:s.b.y}]});
  }
  if(segs.length===1 && segs[0].t==='L'){
    const s=segs[0];
    return Object.assign(base, {kind:'line', closed:false,
      points:[{x:s.a.x,y:s.a.y},{x:s.b.x,y:s.b.y}], grips:[{x:s.a.x,y:s.a.y},{x:s.b.x,y:s.b.y}]});
  }
  const gm=segsToGripsMeta(segs);
  let grips=gm.grips, segMeta=gm.segMeta;
  if(closed && grips.length>2){ grips=grips.slice(0,-1); segMeta=segMeta.slice(0,-1); }
  const hasArc=segMeta.some(m=>m==='arcMid'||m==='arcEnd');
  const shape=Object.assign(base, {kind:'line', closed:!!closed,
    points:segsToPoints(segs), grips});
  if(hasArc) shape.segMeta=segMeta;
  return shape;
}
// ---- chain parameterisation helpers (used by segment-native trim) ----
function segPointAt(s, t){
  if(s.t!=='A') return {x:s.a.x+(s.b.x-s.a.x)*t, y:s.a.y+(s.b.y-s.a.y)*t};
  const ai=segArcInfo(s); if(!ai) return {x:s.a.x, y:s.a.y};
  const ang=ai.a0+ai.sweep*t;
  return {x:ai.cx+ai.r*Math.cos(ang), y:ai.cy+ai.r*Math.sin(ang)};
}
// Exact sub-piece of a segment between parameters t0<t1. Arc pieces stay arcs.
function subSegment(s, t0, t1){
  if(t1-t0 < 1e-9) return null;
  if(s.t!=='A') return {t:'L', a:segPointAt(s,t0), b:segPointAt(s,t1)};
  return {t:'A', a:segPointAt(s,t0), m:segPointAt(s,(t0+t1)/2), b:segPointAt(s,t1)};
}
// EXACT parameter of a point along one segment (no sampling), plus the exact
// distance from the point to that segment. Sampling used to leave the trim cut
// visibly short of / past the true boundary, especially on arcs.
function segParamOf(s, p){
  if(s.t!=='A'){
    const ab=sub(s.b,s.a); const L2=dot(ab,ab)||1;
    const t=Math.max(0, Math.min(1, dot(sub(p,s.a),ab)/L2));
    const q={x:s.a.x+ab.x*t, y:s.a.y+ab.y*t};
    return {t, pt:q, d:len(sub(q,p))};
  }
  const ai=segArcInfo(s);
  if(!ai){ const q={x:s.a.x,y:s.a.y}; return {t:0, pt:q, d:len(sub(q,p))}; }
  const ang=Math.atan2(p.y-ai.cy, p.x-ai.cx);
  // angular offset from the arc start, measured in the sweep direction
  let rel=(ang-ai.a0);
  const dir=ai.sweep>=0?1:-1;
  rel*=dir;
  while(rel<0) rel+=TWO_PI();
  while(rel>=TWO_PI()) rel-=TWO_PI();
  const span=Math.abs(ai.sweep);
  let t;
  if(rel<=span) t=rel/span;                                   // on the arc
  else t = (rel-span) < (TWO_PI()-rel) ? 1 : 0;               // past an end → clamp
  const q=segPointAt(s,t);
  return {t, pt:q, d:len(sub(q,p))};
}
// Nearest position on a segment chain: {i, t, d, pt} — exact for lines and arcs
function chainNearest(segs, p){
  let best=null;
  segs.forEach((s,i)=>{
    const r=segParamOf(s,p);
    if(!best || r.d<best.d) best={i, t:r.t, d:r.d, pt:r.pt};
  });
  return best;
}
// Circle vs segment intersections (used to extend an arc along its own circle)
function circleSegIntersections(cx, cy, r, a, b){
  const dx=b.x-a.x, dy=b.y-a.y;
  const fx=a.x-cx, fy=a.y-cy;
  const A=dx*dx+dy*dy;
  if(A<1e-12) return [];
  const B=2*(fx*dx+fy*dy);
  const C=fx*fx+fy*fy-r*r;
  let disc=B*B-4*A*C;
  if(disc<0) return [];
  disc=Math.sqrt(disc);
  const out=[];
  [(-B-disc)/(2*A), (-B+disc)/(2*A)].forEach(t=>{
    if(t>=-1e-9 && t<=1+1e-9) out.push({x:a.x+dx*t, y:a.y+dy*t});
  });
  return out;
}
// Build a 3-point arc segment from centre/radius/start-angle/sweep
function arcSegFromSweep(cx, cy, r, a0, sweep){
  const P=ang=>({x:cx+r*Math.cos(ang), y:cy+r*Math.sin(ang)});
  return {t:'A', a:P(a0), m:P(a0+sweep/2), b:P(a0+sweep)};
}
// Slice a chain between scalar parameters u0<u1 (u = segIndex + t).
function sliceChain(segs, u0, u1){
  const out=[];
  const i0=Math.max(0, Math.min(segs.length-1, Math.floor(u0)));
  const i1=Math.max(0, Math.min(segs.length-1, Math.floor(u1 - 1e-9)));
  for(let i=i0;i<=i1;i++){
    const t0 = (i===i0) ? (u0-i0) : 0;
    const t1 = (i===i1) ? Math.min(1, u1-i1) : 1;
    const piece=subSegment(segs[i], Math.max(0,t0), Math.min(1,t1));
    if(piece) out.push(piece);
  }
  return out;
}
function chainLengthOf(segs){
  let L=0;
  segs.forEach(s=>{
    if(s.t!=='A') L+=len(sub(s.b,s.a));
    else { const ai=segArcInfo(s); L += ai? Math.abs(ai.sweep)*ai.r : len(sub(s.b,s.a)); }
  });
  return L;
}
// Merge consecutive segments that are geometrically continuous: arcs on the
// same circle become ONE arc (so a trimmed circle yields a single arc with
// exactly 2 endpoints + 1 midpoint), and collinear lines become one line.
function coalesceSegs(segs){
  if(!segs || segs.length<2) return segs||[];
  const out=[segs[0]];
  for(let i=1;i<segs.length;i++){
    const prev=out[out.length-1], cur=segs[i];
    if(len(sub(prev.b, cur.a)) > 1e-6){ out.push(cur); continue; } // not continuous
    if(prev.t==='A' && cur.t==='A'){
      const p=segArcInfo(prev), c=segArcInfo(cur);
      if(p && c){
        const sameC = Math.hypot(p.cx-c.cx, p.cy-c.cy) <= Math.max(1e-4, p.r*1e-3);
        const sameR = Math.abs(p.r-c.r) <= Math.max(1e-4, p.r*1e-3);
        const sameDir = (p.sweep>=0) === (c.sweep>=0);
        const total = p.sweep + c.sweep;
        if(sameC && sameR && sameDir && Math.abs(total) < TWO_PI()*0.97){
          const midAng = p.a0 + total/2;
          out[out.length-1] = {t:'A',
            a:{x:prev.a.x, y:prev.a.y},
            m:{x:p.cx+p.r*Math.cos(midAng), y:p.cy+p.r*Math.sin(midAng)},
            b:{x:cur.b.x, y:cur.b.y}};
          continue;
        }
      }
    } else if(prev.t!=='A' && cur.t!=='A'){
      const d1=sub(prev.b,prev.a), d2=sub(cur.b,cur.a);
      const l1=len(d1), l2=len(d2);
      if(l1>1e-9 && l2>1e-9){
        const cross=Math.abs(d1.x*d2.y - d1.y*d2.x)/(l1*l2);
        const along=dot(d1,d2)>0;
        if(cross<1e-6 && along){ out[out.length-1]={t:'L', a:{x:prev.a.x,y:prev.a.y}, b:{x:cur.b.x,y:cur.b.y}}; continue; }
      }
    }
    out.push(cur);
  }
  return out;
}
// Does a closed arc chain form a full circle?
function segsFormCircle(segs, closed){
  if(!closed || !segs.length || !segs.every(s=>s.t==='A')) return null;
  const infos=segs.map(segArcInfo);
  if(infos.some(x=>!x)) return null;
  const c0=infos[0];
  const same=infos.every(x=> Math.hypot(x.cx-c0.cx, x.cy-c0.cy)<=Math.max(1e-4,c0.r*1e-3) && Math.abs(x.r-c0.r)<=Math.max(1e-4,c0.r*1e-3));
  if(!same) return null;
  const total=infos.reduce((s,x)=>s+x.sweep,0);
  if(Math.abs(Math.abs(total)-TWO_PI()) > 1e-3) return null;
  return {center:{x:c0.cx,y:c0.cy}, radius:c0.r};
}
// Yoyni nuqtalarga aylantirish.
//
// TUZATILDI: ilgari segment soni SOBIT edi (odatda 16). Katta yoyda bu
// juda qo'pol chiqardi: r=92 mm li yarim aylana 16 bo'lakka bo'linsa,
// vatar og'ishi 0.45 mm bo'ladi va shakl "singan" ko'rinadi. Aynan shu
// naqsh chizmalaridagi burchakli ko'rinishning sababi edi.
//
// Endi `segments` — eng KAM son, haqiqiy son esa radius va yoy uzunligiga
// qarab hisoblanadi: og'ish ARC_SAG_TOL dan oshmaydi.
const ARC_SAG_TOL = 0.02;   // yoydan og'ish, mm
function genArcThrough(p1, p2, p3, segments){
  segments = segments||8;
  // circumcenter of the triangle p1p2p3
  const ax=p1.x, ay=p1.y, bx=p2.x, by=p2.y, cx=p3.x, cy=p3.y;
  const d = 2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));
  if(Math.abs(d)<1e-9){ return [p1,p3]; } // collinear → straight
  const ux = ((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d;
  const uy = ((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d;
  const O={x:ux,y:uy};
  const r=len(sub(p1,O));
  let a0=Math.atan2(p1.y-O.y,p1.x-O.x);
  let am=Math.atan2(p2.y-O.y,p2.x-O.x);
  let a1=Math.atan2(p3.y-O.y,p3.x-O.x);
  // choose sweep direction so the arc actually passes through p2
  const norm2=(x)=>{while(x<0)x+=Math.PI*2;while(x>=Math.PI*2)x-=Math.PI*2;return x;};
  let ccwEnd=norm2(a1-a0), ccwMid=norm2(am-a0);
  const goCCW = ccwMid<=ccwEnd;
  {
    // og'ish ARC_SAG_TOL dan oshmasligi uchun kerakli segment soni
    const sweepAbs = goCCW ? ccwEnd : (Math.PI*2 - ccwEnd);
    const cosv = Math.max(-1, Math.min(1, 1 - ARC_SAG_TOL/Math.max(r,1e-9)));
    const dAng = 2*Math.acos(cosv);
    if(isFinite(dAng) && dAng > 1e-9){
      const need = Math.ceil(sweepAbs/dAng);
      segments = Math.max(segments, Math.min(512, need));
    }
  }
  const total = goCCW? ccwEnd : -(Math.PI*2-ccwEnd);
  const out=[];
  for(let k=0;k<=segments;k++){ const a=a0+total*(k/segments); out.push({x:O.x+r*Math.cos(a), y:O.y+r*Math.sin(a)}); }
  return out;
}
function genArcPts(center, startPt, endPt, segments){
  segments = segments||32;
  const r = len(sub(startPt,center));
  let a0 = Math.atan2(startPt.y-center.y, startPt.x-center.x);
  let a1 = Math.atan2(endPt.y-center.y, endPt.x-center.x);
  if(a1<a0) a1+=Math.PI*2; // always sweep CCW from start to end, matching DXF ARC convention
  const pts=[];
  for(let k=0;k<=segments;k++){ const a=a0+(a1-a0)*(k/segments); pts.push({x:center.x+r*Math.cos(a), y:center.y+r*Math.sin(a)}); }
  return pts;
}
function genPolygonPts(center, vertexPt, sides){
  const r = len(sub(vertexPt,center));
  const a0 = Math.atan2(vertexPt.y-center.y, vertexPt.x-center.x);
  const pts=[];
  for(let k=0;k<sides;k++){ const a=a0+(k/sides)*Math.PI*2; pts.push({x:center.x+r*Math.cos(a), y:center.y+r*Math.sin(a)}); }
  return pts;
}
