/* ==========================================================================
   js/ui/input-drag.js
   mousemove / mouseup / wheel — sudrash va zoom

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

window.addEventListener('mousemove',(e)=>{
  if(typeof draggingText!=='undefined' && draggingText){
    const r=canvas.getBoundingClientRect();
    if(textMouseMove(e.clientX-r.left, e.clientY-r.top)) return;
  }
  const rect = canvas.getBoundingClientRect();
  const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  if(panning){
    view.ox = panOrigin.x + (sx-panStart.x);
    view.oy = panOrigin.y + (sy-panStart.y);
    draw();
    return;
  }
  if(draggingRef){
    const r=getRef(draggingRef.id);
    if(r && !r.locked){
      const w=toWorld(sx,sy);
      r.x = w.x - draggingRef.dx;
      r.y = w.y - draggingRef.dy;
      draw();
    }
    return;
  }

  // ---- Stretch: window drag ----
  if(stretchBoxing){ stretchBox.x1=sx; stretchBox.y1=sy; draw(); return; }
  if(stretchMode==='base'){
    const w=toWorld(sx,sy); const snap=findSnapCandidate(w);
    mouseWorld = snap? snap.point : w; hoverSnap=snap; draw(); return;
  }
  if(stretchMode==='move'){
    const w=toWorld(sx,sy); const snap=findSnapCandidate(w);
    const p = snap? snap.point : w;
    mouseWorld=p; hoverSnap=snap;
    applyStretch(stretchDelta(p));
    updateStretchHint();
    draw(); return;
  }
  // Dimension tool: track cursor (with snap) for the ghost preview
  // Dimension tool: track cursor (with snap) for the ghost preview
  if(offsetMode){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    mouseWorld = snap ? snap.point : w;
    hoverSnap = snap;
    draw();
    return;
  }
  if(dimTool){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    mouseWorld = snap ? snap.point : w;
    hoverSnap = snap;
    draw();
    return;
  }
  // SCALE step 2: just picking the reference point B — track cursor, no transform yet
  if(transformTool==='scale' && transformStep===2){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    mouseWorld = snap ? snap.point : applyOrtho(transformBase, w);
    hoverSnap = snap;
    draw();
    return;
  }
  // SCALE step 3: live preview using factor = dist(A->cursor)/refLen
  if(transformTool==='scale' && transformStep===3){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    const p = snap ? snap.point : applyOrtho(transformBase, w);
    mouseWorld = p; hoverSnap = snap;
    applyLiveTransform(p);
    draw();
    return;
  }
  // ROTATE step 2: picking reference direction B — track cursor, no rotation yet
  if(transformTool==='rotate' && transformStep===2){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    mouseWorld = snap ? snap.point : applyOrtho(transformBase, w);
    hoverSnap = snap;
    draw();
    return;
  }
  // ROTATE step 3: live rotation = angle(A->cursor) - refAng
  if(transformTool==='rotate' && transformStep===3){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    const p = snap ? snap.point : applyOrtho(transformBase, w);
    mouseWorld = p; hoverSnap = snap;
    applyLiveTransform(p);
    draw();
    return;
  }
  if(transformTool && transformStep===2){ // move / mirror
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    let p = snap ? snap.point : applyOrtho(transformBase, w);
    // Masofa yozilganda: AVVAL yo'nalish cheklanadi (ortho / burchak snap),
    // KEYIN aynan shu yo'nalishda `dist` masofa qo'yiladi.
    // TUZATILDI: ilgari yo'nalish XOM kursordan (w) olinardi va ortho
    // e'tiborsiz qolardi — natijada ortho rejimida ham qiya ko'chardi.
    if(transformTool==='move' && transformTyped!==''){
      const dist=parseNum(transformTyped, NaN);
      if(isFinite(dist) && dist>0){
        const ref = snap ? snap.point
                         : applyAngleSnap(transformBase, applyOrtho(transformBase, w));
        let dir=sub(ref, transformBase);
        if(len(dir)<1e-9) dir={x:1,y:0};
        dir=norm(dir);
        p={x:transformBase.x+dir.x*dist, y:transformBase.y+dir.y*dist};
      }
    }
    mouseWorld = p; hoverSnap = snap;
    applyLiveTransform(p);
    draw();
    return;
  }
  if(draggingGrip){
    const raw = toWorld(sx,sy);
    mouseWorld = raw;
    hoverSnap = findSnapCandidate(raw);
    const snapped = hoverSnap ? hoverSnap.point : raw;
    const line = drawnLines[draggingGrip.li];
    if(line) updateShapeFromGrip(line, draggingGrip.gi, snapped);
    dragMoved=true;
    draw();
    return;
  }
  if(appMode==='draw'){
    const rawW = toWorld(sx,sy);
    mouseRawWorld = rawW;                 // unconstrained cursor
    const res = resolveDrawPoint(rawW);
    mouseWorld = res.pt;      // already Ortho/Angle/Grid constrained
    hoverSnap = res.snap;     // marker only for the snap actually used
    if(selecting){ selCur={x:sx,y:sy}; }
    draw();
    return;
  }
  if(selecting){
    selCur={x:sx,y:sy};
    draw();
  }
});

window.addEventListener('mouseup',(e)=>{
  if(typeof textMouseUp==='function' && typeof draggingText!=='undefined' && draggingText){
    textMouseUp(); return;
  }
  if(panning){ panning=false; return; }
  if(draggingRef){ draggingRef=null; pushHistory(); renderRefPanel(); draw(); return; }

  if(stretchBoxing){
    stretchBoxing=false;
    stretchPicks = collectStretchVerts(stretchBox.x0, stretchBox.y0, stretchBox.x1, stretchBox.y1);
    if(!stretchPicks.length){
      document.getElementById('hint').innerHTML='Stretch: ramka ichida nuqta topilmadi — qaytadan torting (Esc: bekor)';
    } else {
      stretchMode='base';
      updateStretchHint();
    }
    draw();
    return;
  }

  if(draggingGrip){
    if(dragMoved){ detectCorners(); pushHistory(); renderList(); renderDrawnList(); }
    draggingGrip=null; dragMoved=false; hoverSnap=null;
    draw();
    return;
  }

  if(pendingLineClickIdx!=null){
    const rect = canvas.getBoundingClientRect();
    const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
    const moved = mouseDownPos ? Math.hypot(sx-mouseDownPos.x, sy-mouseDownPos.y) > 6 : false;
    if(!moved){
      const addSel = e.shiftKey;      // Shift = add to selection (+)
      const subSel = e.ctrlKey || e.metaKey; // Ctrl = remove from selection (−)
      const clicked = drawnLines[pendingLineClickIdx];
      const gid = clicked ? clicked.group : null;
      // clicking any member of a group acts on the whole group
      const inSame = l => gid ? (l.group===gid) : false;
      drawnLines.forEach((l,i)=>{
        const hit = (i===pendingLineClickIdx) || inSame(l);
        if(subSel){ if(hit) l.selected=false; }        // − remove clicked
        else if(addSel){ l.selected = l.selected || hit; } // + add clicked
        else { l.selected = hit; }                     // plain: replace
      });
      expandSelectionToGroups();
      draw(); renderDrawnList();
    }
    pendingLineClickIdx=null; mouseDownPos=null;
    return;
  }

  if(selecting){
    selecting=false;
    const x0=Math.min(selStart.x,selCur.x), x1=Math.max(selStart.x,selCur.x);
    const y0=Math.min(selStart.y,selCur.y), y1=Math.max(selStart.y,selCur.y);
    const moved = Math.hypot(selCur.x-selStart.x, selCur.y-selStart.y) > 6;
    const addSel = e.shiftKey;             // Shift = add (+)
    const subSel = e.ctrlKey || e.metaKey; // Ctrl = remove (−)
    // AutoCAD-style rule: dragging LEFT->RIGHT is a window select (only items
    // fully inside the box); dragging RIGHT->LEFT is a crossing select (any
    // item the box touches at all).
    const crossing = selCur.x < selStart.x;
    if(appMode==='edit'){
      corners.forEach(c=>{
        const p=toScreen({x:c.x,y:c.y});
        const inBox = moved && p.x>=x0 && p.x<=x1 && p.y>=y0 && p.y<=y1;
        if(subSel){ if(inBox) c.selected=false; }
        else if(addSel){ c.selected = c.selected || inBox; }
        else { c.selected = inBox; }
      });
    }
    if(moved){
      drawnLines.forEach(l=>{
        if(l.hidden || !layerOf(l).visible || layerOf(l).locked) return; // can't box-select hidden/locked
        const scr = l.points.map(toScreen);
        const allIn = scr.every(p=> p.x>=x0 && p.x<=x1 && p.y>=y0 && p.y<=y1);
        const anyIn = scr.some(p=> p.x>=x0 && p.x<=x1 && p.y>=y0 && p.y<=y1);
        const hit = crossing ? anyIn : allIn;
        if(subSel){ if(hit) l.selected=false; }
        else if(addSel){ l.selected = l.selected || hit; }
        else { l.selected = hit; }
      });
      if(!subSel) expandSelectionToGroups();
    }
    draw(); renderList(); renderDrawnList(); updateBulkBar();
    return;
  }
  if(mouseDownCorner && mouseDownPos){
    const rect = canvas.getBoundingClientRect();
    const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
    const moved = Math.hypot(sx-mouseDownPos.x, sy-mouseDownPos.y) > 6;
    if(!moved){
      if(mouseDownModKey){
        // ctrl/shift+click: toggle this corner in/out of the multi-selection
        // instead of cycling its mode, so several corners can be gathered
        // one at a time and then edited together via the bulk bar.
        mouseDownCorner.selected = !mouseDownCorner.selected;
        draw(); renderList(); updateBulkBar();
      } else {
        cycleMode(mouseDownCorner);
        pushHistory();
        draw(); renderList();
      }
    }
  }
  mouseDownCorner=null; mouseDownPos=null; mouseDownModKey=false;
});

canvas.addEventListener('wheel',(e)=>{
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  const before = toWorld(sx,sy);
  const factor = e.deltaY<0 ? 1.12 : 1/1.12;
  view.scale *= factor;
  const after = toWorld(sx,sy);
  view.ox += (after.x-before.x)*view.scale;
  view.oy -= (after.y-before.y)*view.scale;
  updateZoomBadge();
  draw();
},{passive:false});

const MODES = ['ignore','dogbone','tbone','fillet','chamfer'];
