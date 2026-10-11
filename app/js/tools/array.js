/* ==========================================================================
   js/tools/array.js
   Array — to'rtburchak va polyar takrorlash

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== ARRAY (rectangular / polar) =====
let arrayMode=false;          // panel open
let arrayCenter=null;         // polar centre picked on canvas
function rotatePtAround(p, c, ang){
  const s=Math.sin(ang), co=Math.cos(ang);
  const dx=p.x-c.x, dy=p.y-c.y;
  return {x:c.x+dx*co-dy*s, y:c.y+dx*s+dy*co};
}
function transformShapeBy(l, fn){
  if(l.points) l.points = l.points.map(fn);
  if(l.grips)  l.grips  = l.grips.map(fn);
  if(l.center) l.center = fn(l.center);
  if(l.arcA)   l.arcA   = fn(l.arcA);
  if(l.arcMid) l.arcMid = fn(l.arcMid);
  if(l.arcB)   l.arcB   = fn(l.arcB);
  if(l.polyVertex) l.polyVertex = fn(l.polyVertex);
  return l;
}
function startArray(){
  const sel = drawnLines.filter(l=>l.selected && isShapeEditable(l));
  if(!sel.length){ alert('Avval nusxalanadigan shakl(lar)ni tanlang.'); return; }
  arrayMode=true; arrayCenter=null;
  const g=document.getElementById('arrayGroup'); if(g) g.style.display='flex';
  document.getElementById('arrayBtn').classList.add('active');
  syncArrayPanel();
  document.getElementById('hint').innerHTML='Array: turini va qiymatlarni kiriting, keyin "Bajarish". Aylana turida markazni kanvasda bosing.';
  draw();
}
function finishArray(){
  arrayMode=false; arrayCenter=null;
  const g=document.getElementById('arrayGroup'); if(g) g.style.display='none';
  document.getElementById('arrayBtn').classList.remove('active');
  draw();
}
function syncArrayPanel(){
  const t=(document.getElementById('arrayType')||{}).value||'rect';
  const r=document.getElementById('arrayRectOpts'), p=document.getElementById('arrayPolarOpts');
  if(r) r.style.display = t==='rect' ? 'flex' : 'none';
  if(p) p.style.display = t==='polar' ? 'flex' : 'none';
  const ch=document.getElementById('arrayCenterHint');
  if(ch) ch.textContent = arrayCenter ? ('Markaz: '+arrayCenter.x.toFixed(1)+', '+arrayCenter.y.toFixed(1)) : 'Markazni bosing';
}
function applyArray(){
  const sel = drawnLines.filter(l=>l.selected && isShapeEditable(l));
  if(!sel.length){ alert('Shakl tanlanmagan.'); return false; }
  const type=(document.getElementById('arrayType')||{}).value||'rect';
  const srcs = sel.map(compactShape);
  const made=[];
  const remapFor = new Map();   // one fresh group id per copy index
  const cloneSet = (idx, fn)=>{
    srcs.forEach(src=>{
      const l = expandShape(JSON.parse(JSON.stringify(src)));
      if(l.group){
        const key = idx+'|'+l.group;
        if(!remapFor.has(key)) remapFor.set(key, newGroupId());
        l.group = remapFor.get(key);
      }
      l.selected=false;
      made.push(transformShapeBy(l, fn));
    });
  };
  if(type==='rect'){
    const cols = Math.max(1, Math.round(safeNum('arrayCols', 3, 1, 500)));
    const rows = Math.max(1, Math.round(safeNum('arrayRows', 1, 1, 500)));
    const dx = safeNum('arrayDX', 50, -100000, 100000);
    const dy = safeNum('arrayDY', 50, -100000, 100000);
    const total = cols*rows;
    if(total>2000){ alert('Juda ko\'p nusxa ('+total+'). 2000 tagacha ruxsat.'); return false; }
    let idx=0;
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        if(r===0 && c===0) continue;             // original stays
        idx++;
        const ox=dx*c, oy=dy*r;
        cloneSet(idx, p=>({x:p.x+ox, y:p.y+oy}));
      }
    }
  } else {
    if(!arrayCenter){ alert('Aylana massivi uchun avval markazni kanvasda bosing.'); return false; }
    const count = Math.max(2, Math.round(safeNum('arrayCount', 6, 2, 500)));
    const spanDeg = safeNum('arrayAngle', 360, 1, 360);
    const doRot = !!(document.getElementById('arrayRotate')||{}).checked;
    if(count>500){ alert('Juda ko\'p nusxa.'); return false; }
    const full = Math.abs(spanDeg-360) < 1e-6;
    const stepRad = (spanDeg*Math.PI/180) / (full ? count : (count-1));
    // reference point used when the copies must NOT be rotated: the shape is
    // translated so that its anchor lands on the rotated position
    const anchor0 = (function(){
      const s=sel[0];
      if(s.center) return {x:s.center.x, y:s.center.y};
      const p=s.points&&s.points[0];
      return p ? {x:p.x,y:p.y} : {x:arrayCenter.x, y:arrayCenter.y};
    })();
    for(let i=1;i<count;i++){
      const ang = stepRad*i;
      if(doRot){
        cloneSet(i, p=>rotatePtAround(p, arrayCenter, ang));
      } else {
        const a1 = rotatePtAround(anchor0, arrayCenter, ang);
        const ox = a1.x-anchor0.x, oy = a1.y-anchor0.y;
        cloneSet(i, p=>({x:p.x+ox, y:p.y+oy}));
      }
    }
  }
  if(!made.length){ document.getElementById('hint').innerHTML='Nusxa yaratilmadi (sonini tekshiring).'; return false; }
  made.forEach(l=>drawnLines.push(l));
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML='Array: '+made.length+' ta nusxa yaratildi.';
  finishArray();
  return true;
}
