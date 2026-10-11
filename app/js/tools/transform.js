/* ==========================================================================
   js/tools/transform.js
   Move / Rotate / Scale / Mirror

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= transform tools (Move/Rotate/Scale/Mirror) =================
function transformPoint(p, kind, base, target){
  if(kind==='move'){
    const d=sub(target,base); return {x:p.x+d.x, y:p.y+d.y};
  }
  if(kind==='rotate'){
    const ang=Math.atan2(target.y-base.y, target.x-base.x) - (transformRefAng||0);
    const c=Math.cos(ang), s=Math.sin(ang);
    const dx=p.x-base.x, dy=p.y-base.y;
    return {x:base.x+dx*c-dy*s, y:base.y+dx*s+dy*c};
  }
  if(kind==='scale'){
    const refLen = transformRefLen || 1;
    const d1 = len(sub(target,base)) || refLen;
    const f = d1 / refLen;
    return {x:base.x+(p.x-base.x)*f, y:base.y+(p.y-base.y)*f};
  }
  if(kind==='mirror'){
    // reflect across the line through base -> target
    const dir=norm(sub(target,base));
    if(len(sub(target,base))<1e-9) return {x:p.x,y:p.y};
    const rel=sub(p,base);
    const proj=dot(rel,dir);
    const foot={x:base.x+dir.x*proj, y:base.y+dir.y*proj};
    return {x:2*foot.x-p.x, y:2*foot.y-p.y};
  }
  return {x:p.x,y:p.y};
}
let transformRefPt=null, transformRefLen=1, transformRefAng=0;
let transformTyped='';
function updateTransformTypedHint(){
  const hint=document.getElementById('hint');
  if(!transformTool) return;
  const unit = transformTool==='rotate' ? '°' : '×';
  hint.innerHTML = 'Transform: '+transformTool.toUpperCase()+' — '+(transformTyped||'0')+unit+' (Enter: qo\'llash, Esc: bekor)';
}
function updateMoveDistHint(){
  const hint=document.getElementById('hint');
  hint.innerHTML = 'Move: '+(transformTyped||'0')+' mm — sichqoncha bilan yo\'nalishni ko\'rsating, Enter (Ctrl/Shift: +Copy)';
}

function isShapeEditable(l){ const ly=layerOf(l); return !l.hidden && ly.visible && !ly.locked; }
function snapshotSelected(){
  return drawnLines.map(l=> (l.selected && isShapeEditable(l)) ? JSON.parse(JSON.stringify(l)) : null);
}
// build a transformed copy of a snapshot shape (used for +Copy)
function transformedCopyOf(snap, target){
  const c = JSON.parse(JSON.stringify(snap));
  const tx = pt => transformPoint(pt, transformTool, transformBase, target);
  c.points = snap.points.map(tx);
  if(snap.grips) c.grips = snap.grips.map(tx);
  if(snap.center) c.center = tx(snap.center);
  if(snap.arcA) c.arcA = tx(snap.arcA);
  if(snap.arcMid) c.arcMid = tx(snap.arcMid);
  if(snap.arcB) c.arcB = tx(snap.arcB);
  if(snap.polyVertex) c.polyVertex = tx(snap.polyVertex);
  if(snap.radius!=null && c.center) c.radius = len(sub(c.points[0]||c.center, c.center));
  return c;
}
function applyLiveTransform(target){
  if(!transformSnapshot) return;
  drawnLines.forEach((line,li)=>{
    const snap = transformSnapshot[li];
    if(!snap) return;
    const tx = pt => transformPoint(pt, transformTool, transformBase, target);
    line.points = snap.points.map(tx);
    if(snap.grips) line.grips = snap.grips.map(tx);
    if(snap.center) line.center = tx(snap.center);
    if(snap.arcA) line.arcA = tx(snap.arcA);
    if(snap.arcMid) line.arcMid = tx(snap.arcMid);
    if(snap.arcB) line.arcB = tx(snap.arcB);
    if(snap.polyVertex) line.polyVertex = tx(snap.polyVertex);
    // circle radius scales too
    if(snap.radius!=null && line.center) line.radius = len(sub(line.points[0]||line.center, line.center));
  });
  // TUZATILDI (Move bug): dogbone / T-bone / fillet / chamfer geometriyasi
  // `corners` massividagi KESHLANGAN koordinatalardan quriladi. Ilgari bu yerda
  // faqat points/grips ko'chirilardi, corners esa eski joyida qolardi — shuning
  // uchun relief berilgan shakl ko'chirish paytida joyida turib qolardi.
  // cornerKey() = source:uid:vi (joydan mustaqil), shuning uchun qayta aniqlash
  // foydalanuvchi sozlamalarini (rejim, o'lcham, yo'nalish) yo'qotmaydi.
  detectCorners();
}
// commit the transform. If copy=true, restore originals and add transformed
// copies instead of moving the originals (AutoCAD Ctrl+click copy behavior).
function commitTransform(target, copy){
  if(copy && transformSnapshot){
    // put originals back, then append transformed copies (deselect originals,
    // select the new copies so a following +Copy chains off them)
    const copies=[];
    drawnLines.forEach((line,li)=>{
      const snap=transformSnapshot[li];
      if(!snap) return;
      Object.assign(line, JSON.parse(JSON.stringify(snap))); // restore original
      line.selected=false;
      const cp=transformedCopyOf(snap, target); cp.selected=true;
      copies.push(cp);
    });
    copies.forEach(c=>drawnLines.push(c));
  } else {
    applyLiveTransform(target);
  }
  detectCorners();
  pushHistory();
  renderList(); renderDrawnList();
}
let stretchMode=null;        // null | 'window' | 'base' | 'move'
let stretchBoxing=false;     // dragging the selection window
let stretchBox={x0:0,y0:0,x1:0,y1:0};
let stretchPicks=[];         // [{li, gi}]  gi = grip index, or 'center' for circles
let stretchSnap=null;        // deep copy of the affected shapes before the move
let stretchBase=null;
let stretchTyped='';

function startStretch(){
  stretchMode='window'; stretchPicks=[]; stretchSnap=null; stretchBase=null; stretchTyped=''; stretchBoxing=false;
  const b=document.getElementById('stretchBtn'); if(b) b.classList.add('active');
  document.getElementById('hint').innerHTML='Stretch: ko\'chiriladigan NUQTALAR ustidan ramka torting (Esc: bekor)';
  draw();
}
function finishStretch(){
  stretchMode=null; stretchPicks=[]; stretchSnap=null; stretchBase=null; stretchTyped=''; stretchBoxing=false;
  const b=document.getElementById('stretchBtn'); if(b) b.classList.remove('active');
  draw();
}
// collect every editable vertex inside the screen-space box
function collectStretchVerts(x0,y0,x1,y1){
  const xa=Math.min(x0,x1), xb=Math.max(x0,x1), ya=Math.min(y0,y1), yb=Math.max(y0,y1);
  const picks=[];
  drawnLines.forEach((l,li)=>{
    if(!isShapeEditable(l)) return;
    if(l.kind==='circle' && l.center){
      const s=toScreen(l.center);
      if(s.x>=xa&&s.x<=xb&&s.y>=ya&&s.y<=yb) picks.push({li, gi:'center'});
      return;
    }
    const gr=l.grips||l.points||[];
    gr.forEach((g,gi)=>{
      const s=toScreen(g);
      if(s.x>=xa&&s.x<=xb&&s.y>=ya&&s.y<=yb) picks.push({li, gi});
    });
  });
  return picks;
}
// rebuild one shape after some of its grips moved
function rebuildStretched(shape, snapShape, delta, movedGrips){
  const dx=delta.x, dy=delta.y;
  if(shape.kind==='circle'){
    // whole circle translates when its centre was captured
    const c={x:snapShape.center.x+dx, y:snapShape.center.y+dy};
    shape.center=c;
    shape.points=genCirclePts(c, shape.radius);
    shape.grips=[{x:c.x+shape.radius,y:c.y},{x:c.x-shape.radius,y:c.y},{x:c.x,y:c.y+shape.radius},{x:c.x,y:c.y-shape.radius}];
    return;
  }
  const newGrips=(snapShape.grips||[]).map((g,i)=> movedGrips.has(i) ? {x:g.x+dx, y:g.y+dy} : {x:g.x, y:g.y});
  if(shape.kind==='arc' && newGrips.length>=3){
    shape.arcA=newGrips[0]; shape.arcMid=newGrips[1]; shape.arcB=newGrips[2];
    shape.grips=newGrips;
    shape.points=genArcThrough(shape.arcA, shape.arcMid, shape.arcB, 24);
    return;
  }
  shape.grips=newGrips;
  if(snapShape.segMeta){
    shape.segMeta=snapShape.segMeta;
    shape.points=rebuildMixedPoints(newGrips, snapShape.segMeta, !!shape.closed);
  } else {
    shape.points=newGrips.map(p=>({x:p.x,y:p.y}));
  }
  // a stretched rectangle/polygon is no longer regular — it becomes a polyline
  if(shape.kind==='rect' || shape.kind==='polygon'){
    shape.kind='line';
    delete shape.center; delete shape.polyVertex; delete shape.sides;
  }
}
// apply the stretch for a given world delta (live preview and final commit)
function applyStretch(delta){
  if(!stretchSnap) return;
  const byShape=new Map();
  stretchPicks.forEach(p=>{
    if(!byShape.has(p.li)) byShape.set(p.li, new Set());
    byShape.get(p.li).add(p.gi);
  });
  byShape.forEach((gset, li)=>{
    const shape=drawnLines[li], snapShape=stretchSnap[li];
    if(!shape || !snapShape) return;
    rebuildStretched(shape, snapShape, delta, gset);
  });
  detectCorners();   // Stretch'da ham relief yangi joyga ergashsin
}
function stretchDelta(worldPt){
  if(!stretchBase) return {x:0,y:0};

  // TUZATILDI (tartib xato edi). Ilgari:
  //     1) kursor yo'nalishi bo'yicha AYNAN `dist` masofa qo'yilardi
  //     2) keyin applyOrtho() uni o'qqa PROYEKSIYA qilardi
  //   Proyeksiya uzunlikni qisqartiradi: dist·cos(θ). Shuning uchun 200 mm
  //   yozilsa ham 191, 180, 130 ... chiqardi — kursor qanchalik og'ganiga
  //   qarab. Endi AVVAL yo'nalish cheklanadi, KEYIN masofa qo'yiladi:
  //   natija har doim aynan `dist`.
  let target = applyOrtho(stretchBase, worldPt);
  target = applyAngleSnap(stretchBase, target);

  if(stretchTyped!==''){
    const dist = parseNum(stretchTyped, NaN);
    if(isFinite(dist) && dist>0){
      let dir = sub(target, stretchBase);
      if(len(dir) < 1e-9) dir = {x:1, y:0};
      dir = norm(dir);
      target = {x:stretchBase.x + dir.x*dist, y:stretchBase.y + dir.y*dist};
    }
  }
  return sub(target, stretchBase);
}
function updateStretchHint(){
  const h=document.getElementById('hint');
  if(!h) return;
  if(stretchMode==='window') h.innerHTML='Stretch: ko\'chiriladigan NUQTALAR ustidan ramka torting (Esc: bekor)';
  else if(stretchMode==='base') h.innerHTML='Stretch: '+stretchPicks.length+' ta nuqta tanlandi — bazaviy nuqtani bosing (Esc: bekor)';
  else if(stretchMode==='move') h.innerHTML='Stretch: '+(stretchTyped||'0')+' mm — yo\'nalishni ko\'rsating, Enter yoki bosing (Esc: bekor)';
}
