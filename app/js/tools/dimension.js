/* ==========================================================================
   js/tools/dimension.js
   O'lcham qo'yish (horizontal, vertical, aligned, angular)

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= Dimension tool =================
function dimTextSize(){ const v=parseNum((document.getElementById('dimTextSize')||{}).value, NaN); return (isFinite(v)&&v>0)?v:10; } // millimetres
function dimPrecision(){ const v=parseInt((document.getElementById('dimPrecision')||{}).value,10); return isFinite(v)?v:1; }
function dimUnit(){ const el=document.getElementById('dimUnit'); return el?el.value:'mm'; }
function startDim(kind){
  finishTransform(); if(trimMode) finishTrim();
  dimTool=kind; dimStep=1; dimPts=[];
  ['dimHorizBtn','dimVertBtn','dimAlignBtn','dimAngBtn','dimArcBtn'].forEach(id=>{
    const b=document.getElementById(id); if(b) b.classList.remove('active'); });
  const map={h:'dimHorizBtn',v:'dimVertBtn',aligned:'dimAlignBtn',angular:'dimAngBtn',arclen:'dimArcBtn'};
  const btn=document.getElementById(map[kind]); if(btn) btn.classList.add('active');
  const hint=document.getElementById('hint');
  if(kind==='angular') hint.innerHTML='Burchak o\'lchovi: 1) markaz (burchak uchi), 2) birinchi nur, 3) ikkinchi nur, 4) yoy joyini bosing &middot; Esc: bekor';
  else if(kind==='arclen') hint.innerHTML='Yoy uzunligi: 1) <b>yoy yoki aylanani bosing</b>, 2) yozuv joyini bosing &middot; Esc: bekor';
  else hint.innerHTML='O\'lchov: birinchi nuqtani bosing (snap ishlaydi) &middot; Esc: bekor';
}
function finishDim(){
  dimTool=null; dimStep=0; dimPts=[];
  ['dimHorizBtn','dimVertBtn','dimAlignBtn','dimAngBtn','dimArcBtn'].forEach(id=>{const b=document.getElementById(id); if(b)b.classList.remove('active');});
  dimArcPick=null;
}
document.getElementById('dimHorizBtn').addEventListener('click', ()=>startDim('h'));
document.getElementById('dimVertBtn').addEventListener('click', ()=>startDim('v'));
document.getElementById('dimAlignBtn').addEventListener('click', ()=>startDim('aligned'));
document.getElementById('dimAngBtn').addEventListener('click', ()=>startDim('angular'));
{ const b=document.getElementById('dimArcBtn'); if(b) b.addEventListener('click', ()=>startDim('arclen')); }

// ---------------------------------------------------------------------------
//  YOY / AYLANA UZUNLIGI o'lchovi
//  1-klik yoy yoki aylana ustiga → uzunlik hisoblanadi
//  2-klik yozuv joyiga
// ---------------------------------------------------------------------------
let dimArcPick=null;      // {cx,cy,r,a0,sweep,len,full}

// Kursor ostidagi yoy/aylanani topadi (dunyo koordinatalarida)
function findArcNear(worldPt, tolWorld){
  const tol = tolWorld || (12/view.scale);
  let best=null, bestD=tol;
  drawnLines.forEach(l=>{
    if(l.hidden) return;
    if(typeof layerOf==='function'){ const ly=layerOf(l); if(!ly.visible || ly.locked) return; }
    if(l.kind==='circle' && l.center && l.radius>0){
      const d=Math.abs(Math.hypot(worldPt.x-l.center.x, worldPt.y-l.center.y) - l.radius);
      if(d<bestD){ bestD=d; best={cx:l.center.x, cy:l.center.y, r:l.radius,
                                  a0:0, sweep:Math.PI*2, full:true,
                                  len:2*Math.PI*l.radius}; }
      return;
    }
    const segs = coalesceSegs(shapeToSegs(l));
    segs.forEach(sg=>{
      if(sg.t!=='A') return;
      const ai=segArcInfo(sg); if(!ai) return;
      const d=Math.abs(Math.hypot(worldPt.x-ai.cx, worldPt.y-ai.cy) - ai.r);
      if(d>=bestD) return;
      // burchak yoy ichida bo'lsinmi
      const nz=x=>{ while(x<0)x+=Math.PI*2; while(x>=Math.PI*2)x-=Math.PI*2; return x; };
      const ap=Math.atan2(worldPt.y-ai.cy, worldPt.x-ai.cx);
      const rel = ai.ccw ? nz(ap-ai.a0) : nz(ai.a0-ap);
      if(rel > Math.abs(ai.sweep)+0.02) return;
      bestD=d;
      best={cx:ai.cx, cy:ai.cy, r:ai.r, a0:ai.a0, sweep:ai.sweep, full:false,
            len:Math.abs(ai.sweep)*ai.r};
    });
  });
  return best;
}

// place a click while the dimension tool is active; returns true if handled
function dimClickAt(p){
  if(!dimTool) return false;

  if(dimTool==='arclen'){
    if(!dimArcPick){
      const a=findArcNear(p);
      if(!a){ document.getElementById('hint').innerHTML='Shu yerda yoy yoki aylana yo\'q — ustiga bosing.'; return true; }
      dimArcPick=a; dimStep=2;
      document.getElementById('hint').innerHTML =
        'Uzunlik: <b>'+a.len.toFixed(dimPrecision())+' '+dimUnit()+'</b> &middot; endi yozuv joyini bosing';
      draw(); return true;
    }
    dimensions.push({kind:'arclen', cx:dimArcPick.cx, cy:dimArcPick.cy, r:dimArcPick.r,
                     a0:dimArcPick.a0, sweep:dimArcPick.sweep, full:dimArcPick.full,
                     arcLen:dimArcPick.len, place:{x:p.x,y:p.y},
                     textSize:dimTextSize(), prec:dimPrecision(), unit:dimUnit()});
    dimArcPick=null; dimStep=1;
    pushHistory();
    document.getElementById('hint').innerHTML='Yoy uzunligi qo\'shildi. Yana bosing yoki Esc.';
    renderDrawnList(); draw();
    return true;
  }
  if(dimTool==='angular'){
    // 4 clicks: center, ray-a end, ray-b end, arc placement radius
    dimPts.push({x:p.x,y:p.y});
    if(dimPts.length<4){
      const hint=document.getElementById('hint');
      const msgs=['','birinchi nurni bosing','ikkinchi nurni bosing','yoy joyini bosing'];
      hint.innerHTML='Burchak o\'lchovi: '+msgs[dimPts.length];
      dimStep=dimPts.length+0; return true;
    }
    // complete
    dimensions.push({kind:'angular', center:dimPts[0], a:dimPts[1], b:dimPts[2], place:dimPts[3], textSize:dimTextSize(), prec:dimPrecision()});
    pushHistory(); dimPts=[]; dimStep=1;
    document.getElementById('hint').innerHTML='Burchak o\'lchovi qo\'shildi. Yana bosing yoki Esc.';
    renderDrawnList(); draw();
    return true;
  }
  // linear kinds (h/v/aligned): 3 clicks — p1, p2, then offset (placement)
  dimPts.push({x:p.x,y:p.y});
  if(dimPts.length===1){ dimStep=2; document.getElementById('hint').innerHTML='O\'lchov: ikkinchi nuqtani bosing'; return true; }
  if(dimPts.length===2){ dimStep=3; document.getElementById('hint').innerHTML='O\'lchov: chiziq joyini (masofa/balandlik) bosing'; return true; }
  // 3rd click sets the offset/placement
  dimensions.push({kind:dimTool, p1:dimPts[0], p2:dimPts[1], place:dimPts[2], textSize:dimTextSize(), prec:dimPrecision(), unit:dimUnit()});
  pushHistory(); dimPts=[]; dimStep=1;
  document.getElementById('hint').innerHTML='O\'lchov qo\'shildi. Yana ikki nuqta bosing yoki Esc.';
  renderDrawnList(); draw();
  return true;
}

// build the list of [a,b] segments of a shape, with each segment's start index
function shapeSegments(l){
  const pts=l.points, n=pts.length, out=[];
  const lim = l.closed ? n : n-1;
  for(let i=0;i<lim;i++){ out.push({a:pts[i], b:pts[(i+1)%n], i}); }
  return out;
}
// Trim/Extend works on any shape with a point list: lines, polylines, rects,
// polygons, AND circles/arcs (whose dense segment approximation means a cut
// naturally yields an open polyline arc-piece). Extend is meaningful mainly for
// straight open ends, but trimming works for everything.
function isTrimmable(l){ return l.points && l.points.length>=2; }
function isCurve(l){ return l.kind==='circle' || l.kind==='arc'; }

// Given a run of points that lie on a circular arc, produce a clean 3-point arc
// shape {kind:'arc', arcA, arcMid, arcB, points, grips}. Falls back to a plain
// polyline if the points aren't actually curved (nearly collinear). This is what
// keeps trimmed/exploded circle & arc pieces as true arcs (AutoCAD behavior),
// instead of dozens of tiny straight segments.
// Turn angle (degrees) at vertex k: 0 = straight, large = sharp corner.
function vertexTurnAngle(verts,k){
  const a=sub(verts[k],verts[k-1]), b=sub(verts[k+1],verts[k]);
  const la=len(a),lb=len(b); if(la<1e-9||lb<1e-9) return 0;
  let c=(a.x*b.x+a.y*b.y)/(la*lb); c=Math.max(-1,Math.min(1,c));
  return Math.acos(c)*180/Math.PI;
}
function dist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
// Fit arcs to a polyline's VERTICES (not a dense cloud). Turns a faceted curve —
// an arc a CAD program exported as many short straight chords (e.g. 17mm facets) —
// back into a smooth arc, WITHOUT deforming sharp corners.
function fitVerticesToArcs(verts, closed, tol, maxTurn){
  tol = tol || 0.5; maxTurn = maxTurn || 40;
  const n = verts.length;
  if(n < 4) return null;
  const segs=[]; let i=0;
  while(i < n-1){
    let bestJ=i+1, bestType='line', bestMid=null;
    for(let j=i+2; j<n; j++){
      let sharp=false;
      for(let k=i+1;k<j;k++){ if(vertexTurnAngle(verts,k) > maxTurn){ sharp=true; break; } }
      if(sharp) break;
      const midIdx=Math.floor((i+j)/2);
      const circ=circleFrom3Pts(verts[i], verts[midIdx], verts[j]);
      if(!circ) break;
      if(circ.r > dist(verts[i],verts[j])*50) break;
      let maxDev=0;
      for(let k=i;k<=j;k++) maxDev=Math.max(maxDev,Math.abs(dist(verts[k],circ)-circ.r));
      let monotone=true, sign0=0;
      for(let k=i+1;k<j;k++){
        const a=sub(verts[k],verts[k-1]), b=sub(verts[k+1],verts[k]);
        const cross=a.x*b.y-a.y*b.x;
        if(Math.abs(cross)<1e-9) continue;
        if(sign0===0) sign0=Math.sign(cross);
        else if(Math.sign(cross)!==sign0){ monotone=false; break; }
      }
      if(maxDev<=tol && monotone){ bestJ=j; bestType='arc'; bestMid={x:verts[midIdx].x,y:verts[midIdx].y}; }
      else if(!monotone) break;
    }
    if(bestType==='arc' && bestJ-i < 2){ bestType='line'; bestMid=null; }
    segs.push({from:i,to:bestJ,type:bestType,mid:bestMid});
    i=bestJ;
  }
  if(!segs.some(s=>s.type==='arc')) return null;
  const grips=[{x:verts[0].x,y:verts[0].y}];
  const segMeta=['start'];
  const renderPts=[{x:verts[0].x,y:verts[0].y}];
  segs.forEach(s=>{
    if(s.type==='arc'){
      grips.push({x:s.mid.x,y:s.mid.y}); segMeta.push('arcMid');
      grips.push({x:verts[s.to].x,y:verts[s.to].y}); segMeta.push('arcEnd');
      const arcSeg=genArcThrough(verts[s.from], s.mid, verts[s.to], 20);
      for(let k=1;k<arcSeg.length;k++) renderPts.push(arcSeg[k]);
    } else {
      grips.push({x:verts[s.to].x,y:verts[s.to].y}); segMeta.push('straight');
      renderPts.push({x:verts[s.to].x,y:verts[s.to].y});
    }
  });
  return {grips, segMeta, points:renderPts};
}
