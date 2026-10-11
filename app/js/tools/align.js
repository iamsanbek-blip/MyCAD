/* ==========================================================================
   js/tools/align.js
   Align & Distribute

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== ALIGN & DISTRIBUTE =====
// Bounding box of one shape, in world units.
function shapeBBox(l){
  if(l.kind==='circle' && l.center && l.radius>0){
    return {x0:l.center.x-l.radius, y0:l.center.y-l.radius, x1:l.center.x+l.radius, y1:l.center.y+l.radius};
  }
  const pts=l.points||[];
  if(!pts.length) return null;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  pts.forEach(p=>{ if(p.x<x0)x0=p.x; if(p.x>x1)x1=p.x; if(p.y<y0)y0=p.y; if(p.y>y1)y1=p.y; });
  return isFinite(x0) ? {x0,y0,x1,y1} : null;
}
// Shapes that align/distribute act on. Whole groups move as one unit.
function alignUnits(){
  const sel = drawnLines.filter(l=>l.selected && isShapeEditable(l));
  const byGroup = new Map();
  const units = [];
  sel.forEach(l=>{
    if(l.group){
      if(!byGroup.has(l.group)) { const u={shapes:[], group:l.group}; byGroup.set(l.group,u); units.push(u); }
      byGroup.get(l.group).shapes.push(l);
    } else units.push({shapes:[l]});
  });
  units.forEach(u=>{
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    u.shapes.forEach(s=>{ const b=shapeBBox(s); if(!b) return;
      x0=Math.min(x0,b.x0); y0=Math.min(y0,b.y0); x1=Math.max(x1,b.x1); y1=Math.max(y1,b.y1); });
    u.bbox = isFinite(x0) ? {x0,y0,x1,y1} : null;
  });
  return units.filter(u=>u.bbox);
}
function moveUnit(u, dx, dy){
  if(Math.abs(dx)<1e-12 && Math.abs(dy)<1e-12) return;
  u.shapes.forEach(s=>transformShapeBy(s, p=>({x:p.x+dx, y:p.y+dy})));
}
function alignSelected(mode){
  const units = alignUnits();
  if(units.length<2){ document.getElementById('hint').innerHTML='Tekislash uchun kamida 2 ta shakl tanlang.'; return false; }
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  units.forEach(u=>{ x0=Math.min(x0,u.bbox.x0); y0=Math.min(y0,u.bbox.y0); x1=Math.max(x1,u.bbox.x1); y1=Math.max(y1,u.bbox.y1); });
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  units.forEach(u=>{
    const b=u.bbox;
    if(mode==='left')    moveUnit(u, x0-b.x0, 0);
    else if(mode==='right')  moveUnit(u, x1-b.x1, 0);
    else if(mode==='centerX') moveUnit(u, cx-(b.x0+b.x1)/2, 0);
    else if(mode==='top')    moveUnit(u, 0, y1-b.y1);
    else if(mode==='bottom') moveUnit(u, 0, y0-b.y0);
    else if(mode==='centerY') moveUnit(u, 0, cy-(b.y0+b.y1)/2);
  });
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  const names={left:'chapga',right:'o\'ngga',centerX:'vertikal markazga',top:'yuqoriga',bottom:'pastga',centerY:'gorizontal markazga'};
  document.getElementById('hint').innerHTML='Tekislandi ('+(names[mode]||mode)+'): '+units.length+' ta element.';
  return true;
}
// Equal gaps between the outermost items (AutoCAD/Illustrator style).
function distributeSelected(axis){
  const units = alignUnits();
  if(units.length<3){ document.getElementById('hint').innerHTML='Teng taqsimlash uchun kamida 3 ta shakl tanlang.'; return false; }
  const horiz = axis==='h';
  units.sort((a,b)=> horiz ? (a.bbox.x0-b.bbox.x0) : (a.bbox.y0-b.bbox.y0));
  const first=units[0], last=units[units.length-1];
  const span = horiz ? (last.bbox.x1-first.bbox.x0) : (last.bbox.y1-first.bbox.y0);
  let sizes=0;
  units.forEach(u=>{ sizes += horiz ? (u.bbox.x1-u.bbox.x0) : (u.bbox.y1-u.bbox.y0); });
  const gap = (span - sizes) / (units.length-1);
  let cursor = horiz ? first.bbox.x1 : first.bbox.y1;
  for(let i=1;i<units.length-1;i++){
    const u=units[i];
    const target = cursor + gap;
    if(horiz) moveUnit(u, target-u.bbox.x0, 0);
    else      moveUnit(u, 0, target-u.bbox.y0);
    const size = horiz ? (u.bbox.x1-u.bbox.x0) : (u.bbox.y1-u.bbox.y0);
    cursor = target + size;
  }
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML='Teng taqsimlandi ('+(horiz?'gorizontal':'vertikal')+'): '+units.length+' ta element, oraliq '+gap.toFixed(2)+' mm.';
  return true;
}
