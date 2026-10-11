/* ==========================================================================
   js/tools/edit-grips.js
   Trim bajarilishi + grip orqali shaklni tahrirlash

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

function doTrimAt(worldPt, extend){
  // ---- SEGMENT-NATIVE TRIM ----
  // Work on the shape's canonical segment chain, so a trimmed circle becomes a
  // real arc (2 endpoints + 1 midpoint) and no curve is ever faceted.
  const tolPick = 10/view.scale;
  let target=null;
  drawnLines.forEach((l,li)=>{
    if(!isTrimmable(l)) return;
    const ly=layerOf(l); if(!ly.visible || ly.locked) return;
    const segs=shapeToSegs(l);
    if(!segs.length) return;
    const near=chainNearest(segs, worldPt);
    if(near && near.d<tolPick && (!target || near.d<target.near.d)) target={l,li,segs,near};
  });
  if(!target) return false;
  const segs=target.segs, l=target.l;
  const N=segs.length;
  const uClick = target.near.i + target.near.t;

  // ---- EXTEND: grow the nearest free end to the first crossing ----
  // A straight end grows along its own direction; an ARC end grows along its
  // OWN CIRCLE (this is what used to be missing — arcs simply refused to grow).
  if(extend){
    if(l.closed) return false;                 // a closed loop has no free end
    const atStart = uClick < N/2;
    const endIdx = atStart ? 0 : N-1;
    const seg = segs[endIdx];
    const others=[];
    drawnLines.forEach((o,oi)=>{
      if(oi===target.li || !o.points || o.points.length<2) return;
      const oly=layerOf(o); if(!oly.visible || oly.locked) return;
      shapeSegments(o).forEach(os=>others.push(os));
    });
    if(!others.length) return false;
    const ns=segs.slice();

    if(seg.t!=='A'){
      const A = atStart ? seg.b : seg.a;       // fixed point
      const B = atStart ? seg.a : seg.b;       // moving end
      const dir = norm(sub(B,A));
      let bestT=Infinity, bestPt=null;
      others.forEach(os=>{
        const ip=lineLineIntersectionInfinite(A,B,os.a,os.b);
        if(!ip) return;
        // must lie ON the other segment, and beyond the current free end
        const oab=sub(os.b,os.a); const oL2=dot(oab,oab)||1;
        const ot=dot(sub(ip,os.a),oab)/oL2;
        if(ot<-1e-6 || ot>1+1e-6) return;
        const tt=dot(sub(ip,A),dir);
        if(tt>len(sub(B,A))+1e-9 && tt<bestT){ bestT=tt; bestPt=ip; }
      });
      if(!bestPt) return false;
      ns[endIdx] = atStart ? {t:'L', a:{x:bestPt.x,y:bestPt.y}, b:{x:seg.b.x,y:seg.b.y}}
                           : {t:'L', a:{x:seg.a.x,y:seg.a.y}, b:{x:bestPt.x,y:bestPt.y}};
    } else {
      const ai=segArcInfo(seg);
      if(!ai) return false;
      const dir = ai.sweep>=0 ? 1 : -1;
      const baseAng = atStart ? ai.a0 : (ai.a0+ai.sweep);
      const growDir = atStart ? -dir : dir;    // angular direction to grow in
      let bestD=Infinity;
      others.forEach(os=>{
        circleSegIntersections(ai.cx, ai.cy, ai.r, os.a, os.b).forEach(ip=>{
          const ang=Math.atan2(ip.y-ai.cy, ip.x-ai.cx);
          let d=(ang-baseAng)*growDir;
          while(d<0) d+=TWO_PI();
          while(d>=TWO_PI()) d-=TWO_PI();
          if(d>1e-6 && d<bestD) bestD=d;
        });
      });
      if(!isFinite(bestD)) return false;
      let newA0=ai.a0, newSweep=ai.sweep + dir*bestD;
      if(atStart){ newA0 = ai.a0 - dir*bestD; }
      if(Math.abs(newSweep) >= TWO_PI()*0.999) return false; // would close the circle
      ns[endIdx] = arcSegFromSweep(ai.cx, ai.cy, ai.r, newA0, newSweep);
    }
    const rebuilt=shapeFromSegs(ns, false, l);
    rebuilt.selected=l.selected;
    drawnLines.splice(target.li,1,rebuilt);
    detectCorners(); pushHistory(); renderList(); renderDrawnList();
    return true;
  }

  // ---- TRIM: find every crossing with other geometry, as chain parameters ----
  // EXACT crossings: a line segment uses line/line intersection, an arc segment
  // uses true circle/segment intersection. No sampling, so the cut lands exactly
  // on the boundary instead of slightly short of it or past it.
  const cuts=[];
  const others=[];
  drawnLines.forEach((o,oi)=>{
    if(oi===target.li) return;
    if(!o.points || o.points.length<2) return;
    const oly=layerOf(o); if(!oly.visible || oly.locked) return;
    shapeSegments(o).forEach(os=>others.push(os));
  });
  segs.forEach((s,i)=>{
    others.forEach(os=>{
      if(s.t!=='A'){
        const ip=segmentIntersection(s.a, s.b, os.a, os.b);
        if(ip){ const r=segParamOf(s, ip); cuts.push({u:i+r.t, pt:{x:ip.x,y:ip.y}}); }
      } else {
        const ai=segArcInfo(s); if(!ai) return;
        circleSegIntersections(ai.cx, ai.cy, ai.r, os.a, os.b).forEach(ip=>{
          const r=segParamOf(s, ip);
          // segParamOf clamps to the arc span; if it moved, the crossing is
          // on the circle but OUTSIDE this arc → ignore it
          if(len(sub(r.pt, ip)) > 1e-6) return;
          cuts.push({u:i+r.t, pt:{x:ip.x,y:ip.y}});
        });
      }
    });
  });
  if(!cuts.length) return false;
  cuts.sort((p,q)=>p.u-q.u);
  // drop duplicates that sit on top of each other
  const uniq=[];
  cuts.forEach(c=>{ if(!uniq.length || Math.abs(c.u-uniq[uniq.length-1].u)>1e-6) uniq.push(c); });

  let lower=null, upper=null;
  uniq.forEach(c=>{
    if(c.u<=uClick){ if(!lower||c.u>lower.u) lower=c; }
    else { if(!upper||c.u<upper.u) upper=c; }
  });

  const pieces=[];
  const minLen=1e-4;
  const push=(chain, isClosed)=>{
    if(!chain || !chain.length) return;
    if(chainLengthOf(chain)<minLen) return;
    const sh=shapeFromSegs(chain, !!isClosed, l);
    sh.selected=false;
    pieces.push(sh);
  };

  if(l.closed){
    // A closed loop has no start or end, so the two crossings that bracket the
    // click must be found CYCLICALLY — otherwise clicking on the span that
    // wraps past the chain's seam removed nothing at all.
    if(uniq.length>=2){
      let iUp = uniq.findIndex(c=>c.u > uClick);
      if(iUp === -1) iUp = 0;                        // wrap to the first cut
      const iLo = (iUp - 1 + uniq.length) % uniq.length;
      const up = uniq[iUp], lo = uniq[iLo];
      // keep the complement: from `up` forward around the loop to `lo`
      const keep = (up.u <= lo.u)
        ? sliceChain(segs, up.u, lo.u)
        : sliceChain(segs, up.u, N).concat(sliceChain(segs, 0, lo.u));
      push(keep, false);
    } else {
      // a single crossing just opens the loop at that point
      const c = uniq[0];
      push(sliceChain(segs, c.u, N).concat(sliceChain(segs, 0, c.u)), false);
    }
  } else {
    if(lower) push(sliceChain(segs, 0, lower.u), false);
    if(upper) push(sliceChain(segs, upper.u, N), false);
    if(!lower && !upper) return false;
  }
  drawnLines.splice(target.li, 1, ...pieces);
  detectCorners(); pushHistory(); renderList(); renderDrawnList();
  return true;
}
// unbounded line/line intersection (for extend), or null if parallel
function lineLineIntersectionInfinite(a1,a2,b1,b2){
  const r=sub(a2,a1), s=sub(b2,b1);
  const denom=r.x*s.y-r.y*s.x;
  if(Math.abs(denom)<1e-9) return null;
  const qp=sub(b1,a1);
  const t=(qp.x*s.y-qp.y*s.x)/denom;
  const u=(qp.x*r.y-qp.y*r.x)/denom;
  if(u<-1e-6 || u>1+1e-6) return null; // must actually hit the OTHER segment's extent
  return add(a1, scl(r,t));
}

// rebuild a drawn shape after one of its grips (or its center) is dragged to `pt`
function updateShapeFromGrip(line, gi, pt){
  const kind = line.kind || (line.center ? 'circleish' : 'poly');
  if(gi==='center' && line.center){
    const delta = sub(pt, line.center);
    line.center = pt;
    line.points = line.points.map(p=>add(p, delta));
    if(line.grips) line.grips = line.grips.map(p=>add(p, delta));
    if(line.arcStart) line.arcStart = add(line.arcStart, delta);
    if(line.arcEnd) line.arcEnd = add(line.arcEnd, delta);
    if(line.polyVertex) line.polyVertex = add(line.polyVertex, delta);
    return;
  }
  if(kind==='circle'){
    line.radius = len(sub(pt, line.center));
    line.points = genCirclePts(line.center, line.radius);
    const r=line.radius, c=line.center;
    line.grips=[{x:c.x+r,y:c.y},{x:c.x-r,y:c.y},{x:c.x,y:c.y+r},{x:c.x,y:c.y-r}];
  } else if(kind==='polygon'){
    line.polyVertex = pt;
    line.points = genPolygonPts(line.center, pt, line.sides||6);
    line.grips = line.points.map(p=>({x:p.x,y:p.y}));
  } else if(kind==='arc'){
    // grips: 0=start(left), 1=through(middle), 2=end(right)
    if(gi===0){ line.arcA = pt; }
    else if(gi===1){ line.arcMid = pt; }
    else if(gi===2){ line.arcB = pt; }
    line.points = genArcThrough(line.arcA, line.arcMid, line.arcB, 24);
    line.grips = [{x:line.arcA.x,y:line.arcA.y}, {x:line.arcMid.x,y:line.arcMid.y}, {x:line.arcB.x,y:line.arcB.y}];
  } else if(line.segMeta){
    // mixed line+arc polyline: move the dragged grip, then rebuild the render
    // points honoring each segment's type (arc segments stay curved)
    line.grips[gi] = {x:pt.x, y:pt.y};
    line.points = rebuildMixedPoints(line.grips, line.segMeta, line.closed);
  } else {
    if(line.grips){ line.grips[gi] = pt; line.points = line.grips.map(p=>({x:p.x,y:p.y})); }
    else { line.points[gi] = pt; }
  }
}
// Rebuild the dense render points of a mixed line/arc polyline from its grips
// and the per-grip segMeta produced at draw time.
function rebuildMixedPoints(grips, segMeta, closed){
  // Rebuild through the canonical segment chain: arcs stay exact arcs and are
  // sampled adaptively, identical to how they render everywhere else.
  const segs = gripsMetaToSegs(grips, segMeta, !!closed);
  if(!segs.length) return grips.map(p=>({x:p.x,y:p.y}));
  return segsToPoints(segs);
}
