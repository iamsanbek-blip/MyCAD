/* ==========================================================================
   js/model/corners.js
   Burchak reliefi: dogbone / T-bone / fillet / chamfer geometriyasi

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== SEGMENT-NATIVE BONE EDIT =====
// Corners live at junctions between two STRAIGHT segments. A junction that
// touches an arc is tangential/curved, not a corner, so it is skipped. This is
// what lets Bone edit work on shapes that mix lines with arcs and circles.
function detectCornersForSegs(segs, closed, source, pi, oldByKey, uid){
  const n = segs.length;
  if(n < 2) return;
  const outline = segsToPoints(segs);
  const ccwPoly = closed ? (signedArea(outline) > 0) : false;
  const start = closed ? 0 : 1;
  for(let j=start; j<n; j++){
    const prev = segs[(j-1+n)%n], cur = segs[j];
    if(prev.t==='A' || cur.t==='A') continue;      // curved junction — no corner
    const C = cur.a;
    const v1 = sub(prev.a, C), v2 = sub(cur.b, C);
    const e1Len = len(v1), e2Len = len(v2);
    if(e1Len<1e-9 || e2Len<1e-9) continue;
    const e1 = {x:v1.x/e1Len, y:v1.y/e1Len}, e2 = {x:v2.x/e2Len, y:v2.y/e2Len};
    const dd = Math.max(-1, Math.min(1, dot(e1,e2)));
    const theta = Math.acos(dd);
    if(theta > Math.PI*0.94) continue;             // effectively straight
    if(len(add(e1,e2)) < 1e-6) continue;
    let bis = norm(add(e1,e2));
    let convex = true;
    if(closed){
      const cross = (C.x-prev.a.x)*(cur.b.y-C.y) - (C.y-prev.a.y)*(cur.b.x-C.x);
      convex = ccwPoly ? (cross>0) : (cross<0);
      if(!convex) bis = {x:-bis.x, y:-bis.y};
    }
    const key = source+':'+(uid||pi)+':'+j;
    const old = oldByKey ? oldByKey.get(key) : null;
    corners.push({
      source, pi, uid, vi:j, x:C.x, y:C.y,
      e1, e2, e1Len, e2Len, theta, bis, convex,
      mode: old? old.mode : 'ignore',
      size: old? old.size : 3,
      offset: old? (old.offset||0) : 0,
      tboneDir: old? (old.tboneDir||'auto') : 'auto',
      tboneMirror: old? !!old.tboneMirror : false,
      selected:false
    });
  }
}
// Geometry of one corner relief, expressed as segments.
// Returns {trim, relief} where `trim` is how far each wall is cut back and
// `relief` is the segment placed between the two trimmed wall ends (null = none)
// Extension (offset) ning HAQIQIY oralig'i — musbat va manfiy tomonlar
// BOSHQA-BOSHQA.
//
// Dogbone matematikasi:
//   O = C - bis*ext          (doira bissektrisa bo'ylab suriladi)
//   radius r O'ZGARMAYDI
//   t = -ext*cosH + sqrt(r² - ext²·sin²H)     ← devor kesimi
//
// Ikki shart bor:
//   1) ildiz ostidagi ifoda ≥ 0   →  |ext| ≤ r / sin(θ/2)
//   2) t > 0 (og'iz ochiq qolsin) →  ext < r        (faqat musbat tomonda)
//
// TUZATILDI: ilgari ikkala tomon ham ±0.95r bilan cheklangan edi. Bu manfiy
// tomonni NOHAQ qisqartirardi — masalan 90° burchakda haqiqiy chegara -4.24r
// bo'lsa ham, -2.85 da to'xtardi va foydalanuvchi "harakat qilmayapti" deb
// ko'rardi. Endi har tomon o'z haqiqiy chegarasiga ega.
function cornerOffsetRange(c){
  if(!c) return {min:0, max:0};
  const r = c.size||0;
  if(r<=0) return {min:0, max:0};
  const th = c.theta || Math.PI/2;
  const sinH = Math.sin(th/2);
  if(c.mode==='dogbone'){
    // O = C + bis*ext  (musbat → markaz burchak ICHIGA)
    //   t = ext·cosH + √(r² − ext²·sin²H)
    // Shartlar:
    //   ildiz haqiqiy  →  ext ≤ +r/sin(θ/2)
    //   t > 0 (og'iz)  →  ext > −r
    const pos = sinH>1e-9 ? r/sinH : r*4;
    return {min: -r*0.98, max: pos*0.98};
  }
  if(c.mode==='fillet'){
    const lim = sinH>1e-9 ? r/sinH : r;
    return {min:-lim*0.98, max: lim*0.98};
  }
  const big = Math.max(r*8, 1000);     // chamfer / tbone — amalda cheklovsiz
  return {min:-big, max:big};
}
// Eski nom — mos kelishi uchun (eng qattiq tomonni qaytaradi)
function cornerOffsetLimit(c){
  const rg = cornerOffsetRange(c);
  return Math.min(Math.abs(rg.min), Math.abs(rg.max));
}

function cornerReliefOf(c){
  if(!c || c.mode==='ignore') return null;
  const r = c.size;
  const cosH = Math.cos(c.theta/2), sinH = Math.sin(c.theta/2);
  if(sinH < 1e-9) return null;
  const Dbase = r/sinH;
  const C = {x:c.x, y:c.y};
  const mk3 = (O, P1, P2, ccw, sweep)=>{
    const a0 = Math.atan2(P1.y-O.y, P1.x-O.x);
    const mid = a0 + (ccw?1:-1)*sweep/2;
    return {t:'A', a:P1, m:{x:O.x+r*Math.cos(mid), y:O.y+r*Math.sin(mid)}, b:P2};
  };
  if(c.mode==='chamfer'){
    const t = r/Math.tan(c.theta/2) + (c.offset||0);
    if(!(t>0)) return null;
    const T1=add(C,scl(c.e1,t)), T2=add(C,scl(c.e2,t));
    return {type:'sym', trim:t, relief:{t:'L', a:T1, b:T2}};
  }
  if(c.mode==='fillet'){
    const ext = Math.max(-Dbase, Math.min(c.offset||0, Dbase));
    const O = add(C, scl(c.bis, ext));
    const disc = Math.max(0, r*r - ext*ext*sinH*sinH);
    const t = ext*cosH + Math.sqrt(disc);
    if(!(t>0)) return null;
    const T1=add(C,scl(c.e1,t)), T2=add(C,scl(c.e2,t));
    const dir = pickDirection(O,T1,T2, Math.PI - c.theta);
    return {type:'sym', trim:t, relief:mk3(O,T1,T2,dir.ccw,dir.sweep)};
  }
  if(c.mode==='dogbone'){
    // Extension moves the bone circle along the bisector. The circle RADIUS
    // never changes (it is the tool radius); only how deep the bone sits.
    // Valid range is (-r … +r): at -r the bone is a half circle, at +r the
    // mouth closes completely. Beyond that the relief would vanish, so clamp.
    // TUZATILDI (extension bug): ilgari qiymat JIMGINA r*0.95 gacha qirqilardi.
    // Foydalanuvchi 8 yozsa ham 5.7 ishlatilardi va hech qanday belgi yo'q edi.
    // Endi cheklov cornerOffsetLimit() orqali oshkora e'lon qilinadi va UI
    // kiritilgan qiymatni darhol shu chegaraga tushiradi — ya'ni maydonda
    // ko'rinayotgan raqam AYNAN ishlatiladigan raqam bo'ladi.
    const rg = cornerOffsetRange(c);
    const ext = Math.max(rg.min, Math.min(c.offset||0, rg.max));
    // TUZATILDI (belgi teskari edi). Kelishuv:
    //   MUSBAT son → doira markazi burchakning ICHKI tomoniga suriladi.
    //                Bone kamroq tishlaydi → MATERIAL KO'PROQ QOLADI.
    //   MANFIY son → markaz TASHQARIGA (materialga) suriladi.
    //                Bone chuqurroq kiradi → MATERIAL KAMROQ QOLADI.
    // Radius (asbob radiusi) hech qachon o'zgarmaydi — faqat markaz suriladi.
    const O = add(C, scl(c.bis, ext));
    const disc = Math.max(0, r*r - ext*ext*sinH*sinH);
    const t = ext*cosH + Math.sqrt(disc);
    if(!(t>0)) return null;
    const P1=add(C,scl(c.e1,t)), P2=add(C,scl(c.e2,t));
    const dir = pickDirection(O,P1,P2, Math.PI + c.theta);
    return {type:'sym', trim:t, relief:mk3(O,P1,P2,dir.ccw,dir.sweep)};
  }
  if(c.mode==='tbone'){
    // A T-bone is a semicircular NOTCH cut into ONE wall next to the corner.
    // The corner itself stays sharp — that is the whole point of a T-bone, and
    // it is why it must not trim both walls the way a dogbone does.
    const offs = c.offset||0;
    const edge = resolveTboneEdge(c);
    const d = Math.max(r*1.001, r + offs);      // keep the notch clear of the corner
    const near = d - r, far = d + r;            // distances from the corner
    const O = add(C, scl(edge, d));
    const Pnear = add(C, scl(edge, near)), Pfar = add(C, scl(edge, far));
    const aNear=Math.atan2(Pnear.y-O.y,Pnear.x-O.x);
    const aFar =Math.atan2(Pfar.y-O.y, Pfar.x-O.x);
    const ccwSweep=normAngle(aFar-aNear);
    const pMidCCW={x:O.x+r*Math.cos(aNear+ccwSweep/2), y:O.y+r*Math.sin(aNear+ccwSweep/2)};
    const pMidCW ={x:O.x+r*Math.cos(aNear-(TWO_PI()-ccwSweep)/2), y:O.y+r*Math.sin(aNear-(TWO_PI()-ccwSweep)/2)};
    // the notch must bulge AWAY from the pocket interior (into the material)
    let useCCW = dot(sub(pMidCCW,C), c.bis) <= dot(sub(pMidCW,C), c.bis);
    if(c.tboneMirror) useCCW=!useCCW;
    return {type:'notch', onNext:(edge===c.e2), near, far,
            relief: mk3(O, Pnear, Pfar, useCCW, Math.PI)};
  }
  return null;
}
// Apply every corner relief to a segment chain, returning a NEW chain.
// Walls are never torn: if two neighbouring reliefs would overlap on a shared
// wall, the larger one is dropped and that corner stays sharp.
function applyReliefsToSegs(segs, closed, source, pi){
  const n = segs.length;
  if(!n) return segs;
  const cornerAt = new Array(n).fill(null);
  corners.forEach(c=>{ if(c.source===source && c.pi===pi && c.vi<n) cornerAt[c.vi]=c; });
  const R = new Array(n).fill(null);
  for(let j=0;j<n;j++){
    const c=cornerAt[j];
    if(!c) continue;
    const rel=cornerReliefOf(c);
    if(rel) R[j]=rel;
  }
  const segLenOf = s => (s.t==='A' ? 0 : len(sub(s.b,s.a)));   // arcs are never cut

  // Per-segment edits are recomputed from scratch whenever a relief is dropped,
  // so a corner never leaves a half-applied trim behind (which used to make the
  // whole shape collapse when the radius was too big for the walls).
  const segLenArr = segs.map(segLenOf);
  let startTrim, endTrim, insertAt, notches;
  const rebuild = ()=>{
    startTrim=new Array(n).fill(0);
    endTrim  =new Array(n).fill(0);
    insertAt =new Array(n).fill(null);
    notches  =Array.from({length:n},()=>[]);
    for(let j=0;j<n;j++){
      const rel=R[j];
      if(!rel) continue;
      const prevI=(j-1+n)%n;
      if(!closed && j===0) continue;                       // open shape: free end
      if(segs[j].t==='A' || segs[prevI].t==='A') continue; // curved junction
      if(rel.type==='notch'){
        if(rel.onNext){
          notches[j].push({from:rel.near, to:rel.far, relief:rel.relief});
        }else{
          const L=segLenArr[prevI];
          notches[prevI].push({from:L-rel.far, to:L-rel.near,
                               relief:{t:'A', a:{x:rel.relief.b.x,y:rel.relief.b.y},
                                              m:{x:rel.relief.m.x,y:rel.relief.m.y},
                                              b:{x:rel.relief.a.x,y:rel.relief.a.y}}});
        }
      }else{
        endTrim[prevI] += rel.trim;
        startTrim[j]   += rel.trim;
        insertAt[j]     = rel.relief;
      }
    }
  };
  rebuild();

  // Drop reliefs until no wall is over-cut. Dropping a corner clears BOTH of
  // its walls at once, because rebuild() derives every trim from R[].
  for(let guard=0; guard<n*3; guard++){
    let worst=-1, worstOver=0;
    for(let i=0;i<n;i++){
      if(segs[i].t==='A') continue;
      const L=segLenArr[i];
      let used=startTrim[i]+endTrim[i];
      notches[i].forEach(nt=>{ used += Math.max(0, nt.to-nt.from); });
      const over = used - L*0.98;
      if(over > 1e-9 && over > worstOver){ worstOver=over; worst=i; }
    }
    if(worst<0) break;
    // prefer removing an optional notch first, then the larger corner relief
    if(notches[worst].length){
      for(let j=0;j<n;j++){
        const rel=R[j];
        if(rel && rel.type==='notch'){
          const target = rel.onNext ? j : (j-1+n)%n;
          if(target===worst){ R[j]=null; break; }
        }
      }
    }else{
      const jStart=worst, jEnd=(worst+1)%n;
      const tS=(R[jStart]&&R[jStart].type==='sym')?R[jStart].trim:0;
      const tE=(R[jEnd]  &&R[jEnd].type==='sym')  ?R[jEnd].trim  :0;
      if(tS===0 && tE===0) break;                 // nothing left to drop
      if(tS>=tE) R[jStart]=null; else R[jEnd]=null;
    }
    rebuild();
  }

  const out=[];
  for(let i=0;i<n;i++){
    const s=segs[i];
    if(s.t==='A'){ out.push(s); continue; }         // arcs pass through untouched
    const L=segLenOf(s)||1;
    const u={x:(s.b.x-s.a.x)/L, y:(s.b.y-s.a.y)/L};
    const at = d => ({x:s.a.x+u.x*d, y:s.a.y+u.y*d});
    const t0=startTrim[i], t1=L-endTrim[i];
    if(insertAt[i]) out.push(insertAt[i]);          // relief sits at this wall's start
    // walk the wall, jumping over each notch
    const list = notches[i].slice().sort((p,q)=>p.from-q.from);
    let cur=t0;
    list.forEach(nt=>{
      const f=Math.max(cur, nt.from), t=Math.min(t1, nt.to);
      if(t<=f) return;
      if(f-cur > 1e-9) out.push({t:'L', a:at(cur), b:at(f)});
      out.push(nt.relief);
      cur=t;
    });
    if(t1-cur > 1e-9) out.push({t:'L', a:at(cur), b:at(t1)});
  }
  return out;
}
// Convert a segment chain into the renderer/DXF node format.
function segsToNodes(segs, closed){
  if(!segs || !segs.length) return null;
  const nodes=[{x:segs[0].a.x, y:segs[0].a.y, arc:null}];
  segs.forEach(s=>{
    if(s.t==='A'){
      const ai=segArcInfo(s);
      if(ai) nodes.push({x:s.b.x, y:s.b.y, arc:{cx:ai.cx, cy:ai.cy, r:ai.r, ccw:ai.ccw, sweep:Math.abs(ai.sweep)}, from:{x:s.a.x, y:s.a.y}});
      else   nodes.push({x:s.b.x, y:s.b.y, arc:null});
    } else nodes.push({x:s.b.x, y:s.b.y, arc:null});
  });
  if(closed && nodes.length>1){
    const last=nodes[nodes.length-1];
    // the closing piece is drawn as the wrap segment, so move its arc onto node 0
    if(last.arc){ nodes[0].arc=last.arc; nodes[0].from=last.from; }
    nodes.pop();
  }
  nodes.closed=!!closed;
  return nodes;
}
function detectCornersForShape(pts, closed, source, pi, oldByKey){
  const n = pts.length;
  const area = closed ? signedArea(pts) : 0;
  const ccwPoly = area > 0; // overall winding direction (meaningful for closed shapes)
  const start = closed ? 0 : 1;
  const end = closed ? n : n-1; // open shapes: skip the two free endpoints (no prev/next)
  for(let vi=start; vi<end; vi++){
    const prev = pts[(vi-1+n)%n], cur = pts[vi], next = pts[(vi+1)%n];
    const incomingBulge = prev.bulge||0, outgoingBulge = cur.bulge||0;
    if(Math.abs(incomingBulge)>1e-6 || Math.abs(outgoingBulge)>1e-6) continue;
    const e1 = norm(sub(prev,cur)), e2 = norm(sub(next,cur));
    const d = Math.max(-1,Math.min(1,dot(e1,e2)));
    const theta = Math.acos(d);
    if(theta > Math.PI*0.94) continue;
    if(len(add(e1,e2)) < 1e-6) continue;
    let bis = norm(add(e1,e2));
    if(closed){
      // e1+e2 always bisects the ACUTE angle between the two walls, but for a
      // reflex/concave vertex (interior angle > 180deg) that acute-angle side
      // is actually the exterior, not the polygon's interior — flip it in
      // that case so "interior"/"exterior" stay consistent for every corner,
      // convex or concave, throughout the whole shape.
      const edgeIn = sub(cur, prev), edgeOut = sub(next, cur);
      const cross = edgeIn.x*edgeOut.y - edgeIn.y*edgeOut.x;
      const convex = ccwPoly ? (cross > 0) : (cross < 0);
      if(!convex){ bis = scl(bis, -1); }
    }
    // open shapes (freeform drawn polylines) have no well-defined "interior",
    // so bis direction is a best-effort default — if it bulges the wrong way,
    // negative Extension flips it to the other side (same control used
    // everywhere else in this tool for that purpose).
    const e1Len = len(sub(prev,cur)), e2Len = len(sub(next,cur));
    const key = source+':'+pi+':'+vi;
    const old = oldByKey.get(key);
    corners.push({pi, vi, source, x:cur.x, y:cur.y, e1,e2,e1Len,e2Len,theta,bis,
      mode: old ? old.mode : 'ignore',
      size: old ? old.size : safeSize(document.getElementById('defaultSize').value, 3),
      offset: old ? old.offset : safeOffset(document.getElementById('defaultOffset').value),
      tboneDir: old ? old.tboneDir : (document.getElementById('defaultTboneDir') ? document.getElementById('defaultTboneDir').value : 'auto'),
      tboneMirror: old ? old.tboneMirror : (document.getElementById('defaultTboneMirror') ? document.getElementById('defaultTboneMirror').checked : false),
      selected: old ? !!old.selected : false});
  }
}

function detectCorners(overrideSettingsMap){
  let oldByKey = overrideSettingsMap;
  if(!oldByKey){
    oldByKey = new Map();
    corners.forEach(c=>oldByKey.set(cornerKey(c), c));
  }
  corners = [];
  polygons.forEach((poly, pi)=>{
    if(!poly.closed) return;
    detectCornersForShape(poly.points, true, 'poly', pi, oldByKey);
  });
  drawnLines.forEach((line, pi)=>{
    if(line.kind==='circle' || line.kind==='arc') return; // smooth curves, no real corners
    if(!line.kind && line.center) return; // legacy shapes: center implies circle/arc
    // Corner detection runs on the SEGMENT chain, so shapes that mix straight
    // runs with arcs are handled correctly (arc junctions are skipped).
    const segs = shapeToSegs(line);
    if(segs.length>=2) detectCornersForSegs(segs, !!line.closed, 'drawn', pi, oldByKey, ensureUid(line));
  });
}

// resolves 'auto' to an actual e1/e2 vector, picking the longer adjacent wall
function resolveTboneEdge(c){
  if(c.tboneDir==='e2') return c.e2;
  if(c.tboneDir==='e1') return c.e1;
  return (c.e1Len >= c.e2Len) ? c.e1 : c.e2; // auto: longer wall
}
