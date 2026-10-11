/* ==========================================================================
   js/tools/edit.js
   Trim / Extend / Explode / Join / Offset / Simplify

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ---- Trim / Extend (combined) ----
// Plain click on a straight drawn segment TRIMS it back to the nearest crossing
// with any other segment (the clicked-off portion is removed). Ctrl/Shift+click
// EXTENDS the segment's nearer end forward until it meets another segment.
function startTrim(){
  finishTransform();
  trimMode=true;
  document.getElementById('trimBtn').classList.add('active');
  const hint=document.getElementById('hint');
  hint.innerHTML = 'Trim/Extend — chiziqni bosing: kesish (trim) &middot; Ctrl/Shift+bosish: uzaytirish (extend) &middot; Esc: chiqish';
}
function finishTrim(){
  trimMode=false;
  document.getElementById('trimBtn').classList.remove('active');
}
document.getElementById('stretchBtn').addEventListener('click', ()=>{ if(stretchMode) finishStretch(); else startStretch(); });
document.getElementById('trimBtn').addEventListener('click', ()=>{ if(trimMode) finishTrim(); else startTrim(); });

// ---- Explode: break selected shapes into individual straight line segments ----
function explodeShape(l){
  // Explode the shape's canonical segment chain: every arc segment becomes a
  // real arc entity (2 endpoints + 1 midpoint) and every straight segment a
  // line. Curves are never broken into faceted chords.
  const segs = shapeToSegs(l);
  if(!segs.length) return [];
  const proto = {layer:l.layer, color:l.color};
  return segs.map(s=>{
    const sh = shapeFromSegs([s], false, proto);
    sh.selected = true;
    return sh;
  });
}
document.getElementById('simplifyBtn').addEventListener('click', ()=>{
  const sel = drawnLines.filter(l=>l.selected);
  if(!sel.length){ alert('Avval soddalashtiriladigan shakl(lar)ni tanlang.'); return; }
  let changed=0, skipped=0;
  sel.forEach(l=>{
    if(l.kind==='circle' || l.kind==='arc') return; // already exact curves
    if(!l.points || l.points.length<3) return;
    const segs = shapeToSegs(l);
    // NEVER re-fit a shape that already carries real arc segments — its curves
    // are exact, and running the fitter over arc grips used to flatten them.
    if(segs.some(s=>s.t==='A')){ skipped++; return; }
    // 1) DENSE point cloud → compress into line/arc segments
    if(l.points.length > 12){
      const fit = fitArcsToShape(l.points, !!l.closed, 0.25);
      if(fit && fit.grips.length < (l.grips?l.grips.length:l.points.length)){
        l.grips=fit.grips; l.segMeta=fit.segMeta; l.points=fit.points; changed++; return;
      }
    }
    // 2) FACETED curve (few vertices, straight chords) → smooth its vertices
    const verts = l.grips || l.points;
    if(verts.length >= 4){
      const vfit = fitVerticesToArcs(verts, !!l.closed, 0.8, 40);
      if(vfit){ l.grips=vfit.grips; l.segMeta=vfit.segMeta; l.points=vfit.points; changed++; }
    }
  });
  if(changed){
    detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
    document.getElementById('hint').innerHTML='Soddalashtirildi: '+changed+' ta shakl silliq egri segmentlarga aylantirildi (shakl saqlanadi).';
  } else {
    document.getElementById('hint').innerHTML = skipped
      ? ('Bu shakl(lar)da allaqachon haqiqiy arc bor — soddalashtirish kerak emas ('+skipped+' ta).')
      : 'Soddalashtirish uchun mos egri topilmadi (yoki shakl allaqachon sodda).';
  }
});

document.getElementById('explodeBtn').addEventListener('click', ()=>{
  const sel = drawnLines.filter(l=>l.selected);
  if(!sel.length){ alert('Avval ajratiladigan shakl(lar)ni tanlang.'); return; }
  const next=[];
  drawnLines.forEach(l=>{
    if(l.selected){ explodeShape(l).forEach(s=>next.push(s)); }
    else next.push(l);
  });
  drawnLines = next;
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML='Explode: shakllar segmentlarga ajratildi.';
});

// ---- Join: chain selected lines/polylines into a single polyline where
// endpoints touch (within tolerance). Circles/arcs are skipped. ----
// Perform the actual join with a given tolerance. Chains every selected shape
// (arcs + lines + polylines; a circle is excluded since it's already closed)
// end-to-end into a single polyline. Arc pieces keep their curved point runs,
// so an arc+line+arc chain stays curved where it should.
// Reverse a segment chain (swap direction); arcs keep their middle point.
function reverseSegs(segs){
  return segs.slice().reverse().map(s=> s.t==='A'
    ? {t:'A', a:{x:s.b.x,y:s.b.y}, m:{x:s.m.x,y:s.m.y}, b:{x:s.a.x,y:s.a.y}}
    : {t:'L', a:{x:s.b.x,y:s.b.y}, b:{x:s.a.x,y:s.a.y}});
}
function performJoin(tolerance){
  const sel = drawnLines.filter(l=>l.selected && l.kind!=='circle' && l.points && l.points.length>=2);
  if(sel.length<2){ alert('Kamida 2 ta chiziq/arc/polyline tanlang (uchlari bir-biriga yaqin bo\'lsin).'); return false; }
  const effTol = Math.max(1e-4, tolerance);
  // Work on SEGMENTS, never on dense points — this is what keeps curves smooth.
  const pool = sel.map(l=>({segs:shapeToSegs(l), shape:l, used:false})).filter(p=>p.segs.length);
  if(pool.length<2){ alert('Birlashtiriladigan geometriya topilmadi.'); return false; }
  // Build EVERY connected chain, not just one: a selection can contain several
  // separate loops/paths (e.g. an exploded circle plus another outline), and
  // each connected group must become its own joined shape.
  const results=[]; const consumedShapes=[];
  for(let seed=0; seed<pool.length; seed++){
    if(pool[seed].used) continue;
    let chain = pool[seed].segs.slice();
    pool[seed].used = true;
    const group = [pool[seed].shape];
    let progress=true;
    while(progress){
      progress=false;
      for(let k=0;k<pool.length;k++){
        if(pool[k].used) continue;
        const segs=pool[k].segs;
        const cs=chain[0].a, ce=chain[chain.length-1].b;
        const ss=segs[0].a, se=segs[segs.length-1].b;
        if(len(sub(ce,ss))<effTol){ chain=chain.concat(segs); }
        else if(len(sub(ce,se))<effTol){ chain=chain.concat(reverseSegs(segs)); }
        else if(len(sub(cs,se))<effTol){ chain=segs.concat(chain); }
        else if(len(sub(cs,ss))<effTol){ chain=reverseSegs(segs).concat(chain); }
        else continue;
        pool[k].used=true; group.push(pool[k].shape); progress=true;
      }
    }
    if(group.length<2) { pool[seed].used=false; continue; }   // nothing connected to it
    const closed = len(sub(chain[0].a, chain[chain.length-1].b)) < effTol;
    if(closed) chain[chain.length-1].b = {x:chain[0].a.x, y:chain[0].a.y};
    const joined = shapeFromSegs(chain, closed, group[0]);
    joined.selected = true;
    results.push({joined, chain, closed});
    group.forEach(s=>consumedShapes.push(s));
  }
  if(!results.length){
    alert('Tanlangan elementlarning uchlari '+effTol.toFixed(2)+' mm ichida tutashmadi. Join masofasini kattaroq qilib ko\'ring.');
    return false;
  }
  const notJoined = pool.filter(p=>!p.used).length;
  const consumedSet = new Set(consumedShapes);
  drawnLines = drawnLines.filter(l=>!consumedSet.has(l));
  results.forEach(r=>drawnLines.push(r.joined));
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  const arcCount = results.reduce((s,r)=>s+r.chain.filter(x=>x.t==='A').length,0);
  const closedCount = results.filter(r=>r.closed).length;
  document.getElementById('hint').innerHTML='Join: '+consumedShapes.length+' ta element → '+results.length+
    ' ta shakl ('+arcCount+' arc'+(closedCount?(', '+closedCount+' yopiq'):'')+')'+
    (notJoined? (' — '+notJoined+' ta uchi tutashmadi'):'')+'.';
  return true;
}
document.getElementById('joinBtn').addEventListener('click', ()=>{
  const inp = document.getElementById('joinDistInp');
  let dist = safeNum('joinDistInp', lastJoinDist, 0.001, 100000);
  if(!(dist>0)) dist = lastJoinDist;
  lastJoinDist = dist;
  if(inp) inp.value = String(+dist.toFixed(3)); // reflect the remembered value
  performJoin(dist);
});

// ---- OFFSET — AutoCAD uslubidagi 2 bosqichli, cheksiz takrorlanuvchi ----
//
// Oqim:
//   [O] bosiladi          → offset rejimi yonadi (shakl tanlash SHART EMAS)
//   1-klik chiziq ustiga  → shu shakl olinadi
//   masofa yoziladi       yoki kursor bilan interaktiv tanlanadi
//   2-klik kerakli tomonda → offset bajariladi
//   → rejim OCHIQ qoladi: yana 1-klik bilan boshqa chiziqni olish mumkin
//   Esc                   → avval tanlovni, keyin rejimni yopadi
//
// Geometriya js/geometry/offset.js da: chiziq chiziqligicha, yoy yoyligicha.
function startOffset(){
  finishTransform(); if(trimMode) finishTrim(); if(dimTool) finishDim();
  if(typeof filletMode!=='undefined' && filletMode) finishFillet();
  offsetMode=true; offsetPick=null;
  offsetTyped = lastOffsetDist>0 ? String(+lastOffsetDist.toFixed(3)) : '';
  document.getElementById('offsetBtn').classList.add('active');
  offsetHint();
}
function finishOffset(){
  offsetMode=false; offsetPick=null; offsetTyped='';
  document.getElementById('offsetBtn').classList.remove('active');
}
function offsetHint(){
  const h=document.getElementById('hint'); if(!h) return;
  const dh = offsetTyped!=='' ? (' — masofa: <b>'+offsetTyped+'</b> mm')
           : (lastOffsetDist>0 ? (' (oxirgi: '+(+lastOffsetDist.toFixed(2))+' mm)') : '');
  h.innerHTML = (offsetPick==null)
    ? ('Offset'+dh+': <b>chiziqni bosing</b> &middot; Esc: chiqish')
    : ('Offset'+dh+': raqam yozing yoki <b>kerakli tomonni bosing</b> &middot; Enter: tasdiq &middot; Esc: bekor');
}
document.getElementById('offsetBtn').addEventListener('click', ()=>{ if(offsetMode) finishOffset(); else startOffset(); });

// Tanlangan shakl (yoki null)
function offsetPickedShape(){
  if(offsetPick==null) return null;
  return drawnLines[offsetPick] || null;
}

// Ko'rish uchun natija — hech narsani o'zgartirmaydi
function offsetPreviewResult(worldPt, typedDist){
  const l = offsetPickedShape();
  if(!l || !worldPt) return null;
  const sign = offsetSideOf(l, worldPt);
  const dist = (typedDist!=null && isFinite(typedDist) && typedDist>0)
             ? typedDist : offsetCursorDist(l, worldPt);
  if(!(dist>1e-4)) return null;
  const r = offsetShapeSegs(l, dist, sign);
  if(!r) return null;
  r.dist = dist;
  return r;
}

// Natijani haqiqiy shaklga aylantirib qo'shadi
function applyOffset(worldPt, typedDist){
  const l = offsetPickedShape();
  if(!l) return false;
  const res = offsetPreviewResult(worldPt, typedDist);
  if(!res) return false;

  let made=null;
  if(res.circle){
    const c=res.circle.center, nr=res.circle.radius;
    made={kind:'circle', center:{x:c.x,y:c.y}, radius:nr, closed:true, selected:false,
          points:genCirclePts(c,nr),
          grips:[{x:c.x+nr,y:c.y},{x:c.x-nr,y:c.y},{x:c.x,y:c.y+nr},{x:c.x,y:c.y-nr}]};
    made.layer=l.layer; if(l.color) made.color=l.color;
  } else {
    made = shapeFromSegs(res.segs, res.closed, l);
    if(!made) return false;
    made.selected=false; made.group=null; delete made.uid;
  }
  drawnLines.push(made);
  lastOffsetDist = res.dist;
  offsetPick = null;                       // keyingi chiziqni tanlashga tayyor
  sanitizeDrawnLines();
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  return true;
}

// Offset rejimida bosish: 1-klik = tanlash, 2-klik = bajarish
function offsetClick(sx, sy, worldPt){
  if(offsetPick==null){
    const hit = findDrawnLineNear(sx, sy);
    if(hit==null){
      document.getElementById('hint').innerHTML='Offset: shu yerda chiziq yo\'q — chiziq ustiga bosing.';
      return true;
    }
    offsetPick = hit;
    drawnLines.forEach((l,i)=>l.selected = (i===hit));
    offsetHint(); draw(); renderDrawnList();
    return true;
  }
  const typed = offsetTyped!=='' ? Math.abs(parseFloat(offsetTyped)) : null;
  const ok = applyOffset(worldPt, isFinite(typed)?typed:null);
  document.getElementById('hint').innerHTML = ok
    ? ('Offset bajarildi ('+(+lastOffsetDist.toFixed(2))+' mm). <b>Keyingi chiziqni bosing</b> yoki Esc.')
    : 'Offset: masofa juda kichik yoki shakl yo\'q bo\'lib ketdi.';
  draw();
  return true;
}
