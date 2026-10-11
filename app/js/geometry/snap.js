/* ==========================================================================
   js/geometry/snap.js
   Snap: endpoint, midpoint, center, intersection, ortho, grid

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// QO'SHILDI: chizilayotgan (hali tugatilmagan) shaklni HAQIQIY segment zanjiriga
// aylantiradi. Ilgari chizish paytida faqat bosilgan nuqtalar (endpoint) snap
// beruvchi edi — shuning uchun o'sha chiziqning MIDPOINT va CENTER'i topilmasdi.
// Mantiq finishDraw() bilan bir xil: segModes[i] i-1 → i segmentini tavsiflaydi.
function currentDrawSegs(){
  if(!currentDraw || !currentDraw.points || currentDraw.points.length<2) return [];
  const pts=currentDraw.points, modes=currentDraw.segModes||[];
  const out=[];
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1], b=pts[i], mode=modes[i];
    if(mode && typeof mode==='object' && mode.kind==='arc' && mode.mid){
      out.push({t:'A', a:{x:a.x,y:a.y}, m:{x:mode.mid.x,y:mode.mid.y}, b:{x:b.x,y:b.y}});
    } else if(mode==='arc' || mode==='midarc'){
      const mid={x:(a.x+b.x)/2, y:(a.y+b.y)/2};
      const dir=norm(sub(b,a)), nrm={x:-dir.y, y:dir.x};
      const h=len(sub(b,a))/2;
      out.push({t:'A', a:{x:a.x,y:a.y}, m:{x:mid.x+nrm.x*h, y:mid.y+nrm.y*h}, b:{x:b.x,y:b.y}});
    } else {
      out.push({t:'L', a:{x:a.x,y:a.y}, b:{x:b.x,y:b.y}});
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
//  Shakl snap MANBAI bo'la oladimi?
//
//  TUZATILDI: ilgari KO'CHIRILAYOTGAN shaklning o'zi ham snap manbai edi.
//  Move paytida shakl kursorga ergashadi, shuning uchun uning o'z midpoint /
//  endpoint / center nuqtalari DOIM kursor yonida bo'lardi — natijada
//  belgi doim "midpoint" deb turardi va foydalanuvchi MO'LJALDAGI chiziqning
//  o'rtasini topa olmasdi. Endi transform/stretch paytida tanlangan
//  shakllar snap manbaidan chiqariladi.
// ---------------------------------------------------------------------------
function snapExcludesSelected(){
  if(typeof transformTool!=='undefined' && transformTool &&
     typeof transformStep!=='undefined' && transformStep>=2) return true;
  if(typeof stretchMode!=='undefined' && stretchMode==='move') return true;
  return false;
}
function snapSkipShape(l){
  if(!l || l.hidden) return true;
  const ly = layerOf(l);
  if(!ly.visible || ly.locked) return true;
  if(l.selected && snapExcludesSelected()) return true;
  // grip sudralayotgan shakl ham o'ziga snap qilmasin
  if(typeof draggingGrip!=='undefined' && draggingGrip &&
     drawnLines[draggingGrip.li] === l) return true;
  return false;
}

function allSegments(){
  const segs=[];
  polygons.forEach(poly=>{
    const pts=poly.points, n=pts.length;
    for(let i=0;i<n;i++){ if(!poly.closed && i===n-1) continue; segs.push([pts[i], pts[(i+1)%n]]); }
  });
  drawnLines.forEach(line=>{
    if(snapSkipShape(line)) return;
    const pts=line.points, n=pts.length;
    for(let i=0;i<n-1;i++){ segs.push([pts[i], pts[i+1]]); }
    if(line.closed && n>2) segs.push([pts[n-1], pts[0]]);
  });
  // TUZATILDI: chizilayotgan arc endi VATAR (chord) emas, haqiqiy egri chiziq
  // bo'ylab yaqinlashadi — 'nearest' snap egri ustiga tushadi.
  const cd = currentDrawSegs();
  if(cd.length){
    const pts = segsToPoints(cd);
    for(let i=0;i<pts.length-1;i++){ segs.push([pts[i], pts[i+1]]); }
  }
  return segs;
}
// The real, snappable VERTEX points (for endpoint/midpoint snapping). Crucially,
// circles and arcs contribute only their handful of defining points (grips),
// NOT the dozens of curve-approximation points — those dense points were what
// made the cursor jitter and jump between meaningless "endpoints".
function snapVertexPoints(){
  const eps=[]; // endpoint-type points
  const mids=[]; // midpoint-type points
  polygons.forEach(poly=>{
    const pts=poly.points, n=pts.length;
    pts.forEach(p=>eps.push({x:p.x,y:p.y}));
    for(let i=0;i<n;i++){ if(!poly.closed && i===n-1) break; const a=pts[i],b=pts[(i+1)%n]; mids.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2}); }
  });
  drawnLines.forEach(line=>{
    if(snapSkipShape(line)) return; // hidden/locked geometry isn't snappable
    if(line.kind==='circle'){
      // 4 cardinal grips only (center handled by the Center snap separately)
      (line.grips||[]).forEach(p=>eps.push({x:p.x,y:p.y}));
    } else if(line.kind==='arc'){
      // An arc has exactly TWO endpoints; its through-point is a MIDPOINT,
      // so Endpoint and Midpoint snaps stay meaningful and distinct.
      if(line.arcA) eps.push({x:line.arcA.x,y:line.arcA.y});
      if(line.arcB) eps.push({x:line.arcB.x,y:line.arcB.y});
      if(line.arcMid) mids.push({x:line.arcMid.x,y:line.arcMid.y});
    } else {
      // polyline (may contain arc segments): snap points come from the SEGMENT
      // chain, so a line gives its two ends + true midpoint and an arc gives
      // its two ends + the point actually on the curve.
      // Merge collinear runs first: a visually straight line must offer ONE
      // midpoint and TWO endpoints, not one per internal vertex.
      const segs = coalesceSegs(shapeToSegs(line));
      if(segs.length){
        eps.push({x:segs[0].a.x, y:segs[0].a.y});
        segs.forEach(s=>{
          eps.push({x:s.b.x, y:s.b.y});
          if(s.t==='A'){ mids.push({x:s.m.x, y:s.m.y}); }
          else { mids.push({x:(s.a.x+s.b.x)/2, y:(s.a.y+s.b.y)/2}); }
        });
      } else {
        const gpts = line.grips || line.points;
        gpts.forEach(p=>eps.push({x:p.x,y:p.y}));
      }
    }
  });
  // TUZATILDI: chizilayotgan shakl ham to'liq snap beradi — har segmentning
  // ikki uchi (endpoint) VA o'rtasi (midpoint). Arc uchun o'rta nuqta egri
  // chiziq USTIDA yotadi, vatar o'rtasida emas.
  const cdSegs = currentDrawSegs();
  if(cdSegs.length){
    eps.push({x:cdSegs[0].a.x, y:cdSegs[0].a.y});
    cdSegs.forEach(s=>{
      eps.push({x:s.b.x, y:s.b.y});
      if(s.t==='A') mids.push({x:s.m.x, y:s.m.y});
      else          mids.push({x:(s.a.x+s.b.x)/2, y:(s.a.y+s.b.y)/2});
    });
  } else if(currentDraw){
    currentDraw.points.forEach(p=>eps.push({x:p.x,y:p.y}));
  }
  return {eps, mids};
}
function nearestPointOnSegment(p, a, b){
  const ab = sub(b,a); const len2 = dot(ab,ab);
  if(len2<1e-12) return {x:a.x,y:a.y};
  let t = dot(sub(p,a), ab)/len2;
  t = Math.max(0, Math.min(1,t));
  return add(a, scl(ab, t));
}
// intersection of two segments (bounded to both segments' actual extents), or null
function segmentIntersection(a1,a2,b1,b2){
  const r = sub(a2,a1), s = sub(b2,b1);
  const denom = r.x*s.y - r.y*s.x;
  if(Math.abs(denom) < 1e-9) return null; // parallel / coincident
  const qp = sub(b1,a1);
  const t = (qp.x*s.y - qp.y*s.x)/denom;
  const u = (qp.x*r.y - qp.y*r.x)/denom;
  if(t<-1e-6 || t>1+1e-6 || u<-1e-6 || u>1+1e-6) return null;
  return add(a1, scl(r, Math.max(0,Math.min(1,t))));
}
function allCenters(){
  // Circle centres AND the centre of every arc — native arcs and arc segments
  // inside a polyline both have a real centre worth snapping to.
  const out=[];
  drawnLines.forEach(l=>{
    if(snapSkipShape(l)) return;
    if(l.center) out.push({x:l.center.x, y:l.center.y});
    if(l.kind==='circle') return; // its centre is already added
    shapeToSegs(l).forEach(s=>{
      if(s.t!=='A') return;
      const ai=segArcInfo(s);
      if(ai && isFinite(ai.cx) && isFinite(ai.cy)) out.push({x:ai.cx, y:ai.cy});
    });
  });
  // TUZATILDI: chizilayotgan arc'ning markazi ham Center snap beradi.
  currentDrawSegs().forEach(s=>{
    if(s.t!=='A') return;
    const ai=segArcInfo(s);
    if(ai && isFinite(ai.cx) && isFinite(ai.cy)) out.push({x:ai.cx, y:ai.cy});
  });
  return out;
}
function findSnapCandidate(worldPt){
  const tolPx = 12;                  // chiziq bo'ylab (nearest/perp/parallel)
  const ptTolPx = 16;                // aniq nuqtalar uchun kengroq aperture
  const tolWorld = tolPx/view.scale;
  const ptTolWorld = ptTolPx/view.scale;
  let best=null, bestD=ptTolWorld;
  const g = id => document.getElementById(id);
  const want = {
    endpoint: g('snapEndpointChk')?g('snapEndpointChk').checked:true,
    midpoint: g('snapMidpointChk')?g('snapMidpointChk').checked:true,
    center: g('snapCenterChk')?g('snapCenterChk').checked:true,
    intersect: g('snapIntersectChk')?g('snapIntersectChk').checked:true,
    perp: g('snapPerpChk')?g('snapPerpChk').checked:false,
    parallel: g('snapParallelChk')?g('snapParallelChk').checked:false,
    near: g('snapNearChk')?g('snapNearChk').checked:true,
  };
  const {eps, mids} = snapVertexPoints();
  // endpoint (highest priority) — clean defining vertices only
  if(want.endpoint){
    eps.forEach(p=>{
      const d = len(sub(p,worldPt));
      if(d<bestD){ bestD=d; best={point:{x:p.x,y:p.y}, type:'endpoint'}; }
    });
    if(best) return best;
  }
  // TUZATILDI: AutoCAD tartibi — endpoint > MIDPOINT > center > intersection.
  // Ilgari center midpoint'dan oldin tekshirilardi, shuning uchun yaqin turgan
  // aylana markazi chiziqning o'rta nuqtasini "o'g'irlab" ketardi.
  if(want.midpoint){
    mids.forEach(m=>{
      const d = len(sub(m,worldPt));
      if(d<bestD){ bestD=d; best={point:{x:m.x,y:m.y}, type:'midpoint'}; }
    });
    if(best) return best;
  }
  if(want.center){
    allCenters().forEach(c=>{
      const d = len(sub(c,worldPt));
      if(d<bestD){ bestD=d; best={point:{x:c.x,y:c.y}, type:'center'}; }
    });
    if(best) return best;
  }
  // Aniq nuqtali snaplar (endpoint/midpoint/center) tugadi. Chiziq bo'ylab
  // ishlaydiganlari uchun tor aperture'ga qaytamiz.
  bestD = Math.min(bestD, tolWorld);
  const segs = allSegments(); // for intersection/perp/parallel/near (curve-aware)
  if(want.intersect){
    // cheap pre-filter: only segments actually near the cursor, so the
    // pairwise check stays fast even when the drawing has many segments
    const nearSegs = segs.filter(([a,b])=> len(sub(nearestPointOnSegment(worldPt,a,b), worldPt)) < tolWorld*6);
    for(let i=0;i<nearSegs.length;i++){
      for(let j=i+1;j<nearSegs.length;j++){
        const ip = segmentIntersection(nearSegs[i][0],nearSegs[i][1],nearSegs[j][0],nearSegs[j][1]);
        if(!ip) continue;
        const d = len(sub(ip,worldPt));
        if(d<bestD){ bestD=d; best={point:ip, type:'intersection'}; }
      }
    }
    if(best) return best;
  }
  const lastPt = (currentDraw && currentDraw.points.length) ? currentDraw.points[currentDraw.points.length-1] : null;
  if(want.perp && lastPt){
    segs.forEach(([a,b])=>{
      const foot = nearestPointOnSegment(lastPt, a, b);
      const d = len(sub(foot,worldPt));
      if(d<bestD){ bestD=d; best={point:foot, type:'perpendicular'}; }
    });
    if(best) return best;
  }
  if(want.parallel && lastPt){
    segs.forEach(([a,b])=>{
      const dir = norm(sub(b,a));
      if(len(dir)<1e-9) return;
      const t = dot(sub(worldPt,lastPt), dir);
      const onRay = add(lastPt, scl(dir, t));
      const d = len(sub(onRay,worldPt));
      if(d<bestD && Math.abs(t)>1e-6){ bestD=d; best={point:onRay, type:'parallel'}; }
    });
    if(best) return best;
  }
  if(want.near){
    segs.forEach(([a,b])=>{
      const np = nearestPointOnSegment(worldPt,a,b);
      const d = len(sub(np,worldPt));
      if(d<bestD){ bestD=d; best={point:np, type:'nearest'}; }
    });
    if(best) return best;
  }
  // Grid snap — lowest priority. Only when nothing geometric matched. Snaps the
  // raw cursor to the nearest grid intersection using the user's grid step.
  const gridChk = g('snapGridChk');
  if(gridChk && gridChk.checked){
    const step = safeNum('gridStepInp', 10, 0.001, 100000);
    if(step>0){
      const gx = Math.round(worldPt.x/step)*step;
      const gy = Math.round(worldPt.y/step)*step;
      return {point:{x:gx,y:gy}, type:'grid'};
    }
  }
  return best;
}
// applies Ortho constraint (snap direction to nearest 0/90/180/270) relative to the last drawn point
function applyOrtho(lastPt, targetPt){
  if(!orthoMode || !lastPt) return targetPt;
  const dx = targetPt.x-lastPt.x, dy = targetPt.y-lastPt.y;
  if(Math.abs(dx) >= Math.abs(dy)) return {x:targetPt.x, y:lastPt.y};
  return {x:lastPt.x, y:targetPt.y};
}
// Polar/angle snap: constrain the direction from lastPt to targetPt to the
// nearest multiple of the angle step (e.g. 15°), keeping the same distance.
function applyAngleSnap(lastPt, targetPt){
  const chk=document.getElementById('snapAngleChk');
  if(!chk || !chk.checked || !lastPt) return targetPt;
  const step = safeNum('angleStepInp', 15, 0.1, 180);
  const dx=targetPt.x-lastPt.x, dy=targetPt.y-lastPt.y;
  const dist=Math.hypot(dx,dy);
  if(dist<1e-9) return targetPt;
  const ang=Math.atan2(dy,dx);
  const stepRad=step*Math.PI/180;
  const snapped=Math.round(ang/stepRad)*stepRad;
  return {x:lastPt.x+Math.cos(snapped)*dist, y:lastPt.y+Math.sin(snapped)*dist};
}
// the point the rubber-band preview is currently aiming at: explicit snap
// wins, otherwise ortho-constrained mouse position, otherwise raw mouse.
// Used both for the visual preview line AND as the direction reference when
// the user types an exact length.
function getPreviewPoint(){
  const lastPt = currentDraw && currentDraw.points.length ? currentDraw.points[currentDraw.points.length-1] : null;
  if(hoverSnap) return hoverSnap.point;
  if(lastPt){ return applyAngleSnap(lastPt, applyOrtho(lastPt, mouseWorld)); }
  return mouseWorld;
}
// full pipeline: raw world point -> (snap OR ortho-constrained) final point used when clicking
// A "strong" object snap (endpoint/centre/midpoint/intersection/perp/parallel)
// pins an exact point and therefore overrides Ortho/Angle. The loose snaps
// ("nearest" and "grid") must NOT override them, otherwise Ortho and Angle
// appear dead whenever Near is enabled and geometry is nearby.
function snapIsStrong(s){ return !!s && s.type!=='nearest' && s.type!=='grid'; }
function constraintsActive(){
  const a=document.getElementById('snapAngleChk');
  return !!orthoMode || !!(a && a.checked);
}
// Single place that decides where a click/preview point really lands.
function resolveDrawPoint(rawWorldPt){
  const snap = findSnapCandidate(rawWorldPt);
  const lastPt = currentDraw && currentDraw.points.length ? currentDraw.points[currentDraw.points.length-1] : null;
  if(snapIsStrong(snap)) return {pt:{x:snap.point.x,y:snap.point.y}, snap};
  if(lastPt && constraintsActive()){
    return {pt: applyAngleSnap(lastPt, applyOrtho(lastPt, rawWorldPt)), snap:null};
  }
  if(snap) return {pt:{x:snap.point.x,y:snap.point.y}, snap};
  return {pt:rawWorldPt, snap:null};
}
function computeDrawPoint(rawWorldPt){ return resolveDrawPoint(rawWorldPt).pt; }
function findDrawnLineNear(sx,sy){
  const tol=9;
  let best=null, bestD=tol;
  // iterate topmost-first (last drawn is visually on top) so overlapping shapes
  // resolve to the one the user actually sees on top
  for(let i=drawnLines.length-1;i>=0;i--){
    const l=drawnLines[i];
    const ly=layerOf(l);
    if(!ly.visible || ly.locked) continue; // can't click hidden/locked-layer shapes
    const pts=l.points, n=pts.length;
    const lim = l.closed ? n : n-1; // closed shapes include the wrap-around segment
    for(let j=0;j<lim;j++){
      const a=toScreen(pts[j]), b=toScreen(pts[(j+1)%n]);
      const np = nearestPointOnSegment({x:sx,y:sy}, a, b);
      const d = Math.hypot(np.x-sx, np.y-sy);
      if(d < bestD){ bestD=d; best=i; }
    }
    // filled-looking closed shapes: also allow selecting by clicking inside,
    // near the centroid, so thin outlines aren't the only grabbable part
  }
  return best;
}
// hit-test a dimension by its text position / dimension line
function findDimensionNear(sx,sy){
  const tol=10;
  for(let i=dimensions.length-1;i>=0;i--){
    const d=dimensions[i];
    // TUZATILDI: 'arclen' (yoy/aylana uzunligi) uchun shoxobcha YO'Q edi.
    // U p1/p2/place ga ega emas, shuning uchun pastdagi `else` uni doim
    // o'tkazib yuborardi — natijada bunday o'lchovni tanlab ham, o'chirib
    // ham bo'lmasdi.
    if(d.kind==='arclen'){
      if(!isFinite(d.cx) || !isFinite(d.cy) || !(d.r>0)) continue;
      const C=toScreen({x:d.cx, y:d.cy});
      const R=d.r*view.scale;
      const dd=Math.hypot(sx-C.x, sy-C.y);
      // 1) o'lchanayotgan yoyning o'zi
      if(Math.abs(dd-R) < tol+4){
        if(d.full) return i;
        const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
        const ap=Math.atan2(-(sy-C.y), sx-C.x);      // ekranda Y teskari
        const rel = d.sweep>0 ? nz(ap-d.a0) : nz(d.a0-ap);
        if(rel <= Math.abs(d.sweep)+0.05) return i;
      }
      // 2) yozuv joyi va unga boradigan chiziqcha
      if(d.place){
        const P=toScreen(d.place);
        if(Math.hypot(sx-P.x, sy-P.y) < tol+14) return i;
        const am = d.full ? Math.PI/2 : (d.a0 + d.sweep/2);
        const M = toScreen({x:d.cx+d.r*Math.cos(am), y:d.cy+d.r*Math.sin(am)});
        const np = nearestPointOnSegment({x:sx,y:sy}, M, P);
        if(Math.hypot(np.x-sx, np.y-sy) < tol) return i;
      }
      continue;
    }
    if(d.kind==='angular'){
      if(!d.center||!d.place) continue;
      const c=toScreen(d.center), pl=toScreen(d.place);
      const r=Math.hypot(pl.x-c.x, pl.y-c.y);
      const dd=Math.hypot(sx-c.x, sy-c.y);
      if(Math.abs(dd-r)<tol+4) return i; // near the arc
    } else {
      if(!d.p1||!d.p2||!d.place) continue;
      // check near the dimension line (through place, projected span)
      let a,b;
      if(d.kind==='h'){ a={x:d.p1.x,y:d.place.y}; b={x:d.p2.x,y:d.place.y}; }
      else if(d.kind==='v'){ a={x:d.place.x,y:d.p1.y}; b={x:d.place.x,y:d.p2.y}; }
      else { const dir=norm(sub(d.p2,d.p1)); const t1=dot(sub(d.p1,d.place),dir), t2=dot(sub(d.p2,d.place),dir); a=add(d.place,scl(dir,t1)); b=add(d.place,scl(dir,t2)); }
      const np=nearestPointOnSegment({x:sx,y:sy}, toScreen(a), toScreen(b));
      if(Math.hypot(np.x-sx,np.y-sy)<tol) return i;
    }
  }
  return null;
}
