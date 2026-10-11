/* ==========================================================================
   js/tools/clipboard.js
   Copy / Cut / Paste / Duplicate

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== CLIPBOARD: Copy / Cut / Paste / Duplicate =====
// Copies keep the shapes' defining data only (points are rebuilt), and any
// group membership is remapped so a pasted copy forms its OWN group instead of
// silently joining the original one.

let clipboard = [];
function offsetShape(l, dx, dy){
  const mv = p => ({x:p.x+dx, y:p.y+dy});
  if(l.points) l.points = l.points.map(mv);
  if(l.grips)  l.grips  = l.grips.map(mv);
  if(l.center) l.center = mv(l.center);
  if(l.arcA)   l.arcA   = mv(l.arcA);
  if(l.arcMid) l.arcMid = mv(l.arcMid);
  if(l.arcB)   l.arcB   = mv(l.arcB);
  if(l.polyVertex) l.polyVertex = mv(l.polyVertex);
  return l;
}
function copySelected(cut){
  const sel = drawnLines.filter(l=>l.selected && isShapeEditable(l));
  if(!sel.length){ document.getElementById('hint').innerHTML='Nusxa olish uchun shakl tanlang.'; return false; }
  clipboard = sel.map(compactShape);
  if(cut){
    const rm = new Set(sel);
    drawnLines = drawnLines.filter(l=>!rm.has(l));
    detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  }
  document.getElementById('hint').innerHTML = (cut?'Kesildi: ':'Nusxa olindi: ')+sel.length+' ta shakl.';
  return true;
}
// Paste the clipboard, shifted by (dx,dy). Returns the new shapes.
function pasteClipboard(dx, dy){
  if(!clipboard.length){ document.getElementById('hint').innerHTML='Buferda hech narsa yoq.'; return []; }
  const remap = new Map();
  const made = clipboard.map(src=>{
    const l = expandShape(JSON.parse(JSON.stringify(src)));
    if(l.group){
      if(!remap.has(l.group)) remap.set(l.group, newGroupId());
      l.group = remap.get(l.group);
    }
    l.selected = true;
    return offsetShape(l, dx||0, dy||0);
  });
  drawnLines.forEach(l=>l.selected=false);
  made.forEach(l=>drawnLines.push(l));
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML='Qoyildi: '+made.length+' ta shakl.';
  return made;
}
// ===== INTERAKTIV JOYLASHTIRISH =====
//
// Ilgari Ctrl+V nusxani doim 10 px o'ngga-pastga qo'yardi — foydalanuvchi
// qayerga qo'yishni hal qila olmasdi va shakl kutilmagan joyga tushardi.
//
// Endi AutoCAD kabi: Ctrl+V dan keyin nusxa kursorga "yopishadi", snap
// ishlaydi, bosilganda o'sha joyga tushadi. Esc bekor qiladi.
//
// Bazaviy nuqta — nusxa olingan shakllarning chegarasi MARKAZI. Shuning
// uchun kursor nusxaning o'rtasida turadi.
let pasteMode = false;
let pastePreview = null;      // {shapes:[...], base:{x,y}}

function clipboardBBox(shapes){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  shapes.forEach(l=>{
    const b = (typeof shapeBBox==='function') ? shapeBBox(l) : null;
    if(!b) return;
    x0=Math.min(x0,b.x0); y0=Math.min(y0,b.y0);
    x1=Math.max(x1,b.x1); y1=Math.max(y1,b.y1);
  });
  return isFinite(x0) ? {x0,y0,x1,y1} : null;
}

function startPastePlace(){
  if(!clipboard.length){
    document.getElementById('hint').innerHTML='Buferda hech narsa yo\'q.';
    return false;
  }
  // boshqa asboblarni yopamiz
  if(typeof finishTransform==='function') finishTransform();
  if(typeof trimMode!=='undefined' && trimMode) finishTrim();
  if(typeof dimTool!=='undefined' && dimTool) finishDim();
  if(typeof offsetMode!=='undefined' && offsetMode) finishOffset();
  if(typeof filletMode!=='undefined' && filletMode) finishFillet();

  const remap = new Map();
  const shapes = clipboard.map(src=>{
    const l = expandShape(JSON.parse(JSON.stringify(src)));
    if(l.group){
      if(!remap.has(l.group)) remap.set(l.group, newGroupId());
      l.group = remap.get(l.group);
    }
    return l;
  });
  const bb = clipboardBBox(shapes);
  pastePreview = {
    shapes,
    base: bb ? {x:(bb.x0+bb.x1)/2, y:(bb.y0+bb.y1)/2} : {x:0, y:0},
  };
  pasteMode = true;
  document.getElementById('hint').innerHTML =
    'Joylashtirish: <b>kerakli joyni bosing</b> (snap ishlaydi) &middot; '+
    'Esc: bekor &middot; '+clipboard.length+' ta shakl';
  draw();
  return true;
}

function cancelPastePlace(){
  pasteMode = false; pastePreview = null;
  const h=document.getElementById('hint');
  if(h) h.innerHTML='Joylashtirish bekor qilindi.';
  draw();
}

// Kursor ostidagi joyga tushirish
function commitPastePlace(worldPt){
  if(!pasteMode || !pastePreview || !worldPt) return false;
  const dx = worldPt.x - pastePreview.base.x;
  const dy = worldPt.y - pastePreview.base.y;
  const made = pastePreview.shapes.map(l=>{
    l.selected = true;
    return offsetShape(l, dx, dy);
  });
  drawnLines.forEach(l=>l.selected=false);
  made.forEach(l=>drawnLines.push(l));
  pasteMode = false; pastePreview = null;
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML =
    'Qo\'yildi: '+made.length+' ta shakl. Yana Ctrl+V bilan takrorlash mumkin.';
  return true;
}

// Ko'rinish uchun: nusxa kursorga ergashadi
function drawPastePreview(){
  if(!pasteMode || !pastePreview || !mouseWorld) return;
  const dx = mouseWorld.x - pastePreview.base.x;
  const dy = mouseWorld.y - pastePreview.base.y;
  ctx.save();
  ctx.strokeStyle='rgba(94,225,255,.85)';
  ctx.lineWidth=1.6;
  ctx.setLineDash([6,4]);
  pastePreview.shapes.forEach(l=>{
    const pts = l.points;
    if(!pts || pts.length<2) return;
    ctx.beginPath();
    const s0=toScreen({x:pts[0].x+dx, y:pts[0].y+dy});
    ctx.moveTo(s0.x, s0.y);
    for(let i=1;i<pts.length;i++){
      const s=toScreen({x:pts[i].x+dx, y:pts[i].y+dy});
      ctx.lineTo(s.x, s.y);
    }
    if(l.closed) ctx.closePath();
    ctx.stroke();
  });
  ctx.setLineDash([]);
  // bazaviy nuqta belgisi
  const b=toScreen(mouseWorld);
  ctx.strokeStyle='#ffe680'; ctx.lineWidth=1.2;
  ctx.beginPath();
  ctx.moveTo(b.x-7,b.y); ctx.lineTo(b.x+7,b.y);
  ctx.moveTo(b.x,b.y-7); ctx.lineTo(b.x,b.y+7);
  ctx.stroke();
  ctx.restore();
}

// Duplicate = copy + paste with a small visible offset, without touching the
// clipboard the user may be holding.
function duplicateSelected(){
  const sel = drawnLines.filter(l=>l.selected && isShapeEditable(l));
  if(!sel.length){ document.getElementById('hint').innerHTML='Nusxalash uchun shakl tanlang.'; return false; }
  const step = 10/Math.max(view.scale, 0.001);   // ~10 px on screen, in mm
  const remap = new Map();
  const made = sel.map(s=>{
    const l = expandShape(compactShape(s));
    if(l.group){
      if(!remap.has(l.group)) remap.set(l.group, newGroupId());
      l.group = remap.get(l.group);
    }
    l.selected = true;
    return offsetShape(l, step, -step);
  });
  drawnLines.forEach(l=>l.selected=false);
  made.forEach(l=>drawnLines.push(l));
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML='Nusxalandi: '+made.length+' ta shakl.';
  return true;
}
