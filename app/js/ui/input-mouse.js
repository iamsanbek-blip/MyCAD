/* ==========================================================================
   js/ui/input-mouse.js
   Sichqoncha bosish mantiqi (mousedown) — barcha rejimlar uchun

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

function addDrawPoint(pt){
  if(drawTool==='none') return;
  if(!currentDraw){ currentDraw={points:[pt], segModes:['straight']}; }
  else {
    // In Line + arc submode we build a true 3-point arc segment: the FIRST
    // click after switching to arc mode is the arc's THROUGH (middle) point,
    // held in currentDraw.pendingArcMid; the NEXT click is the arc's END, at
    // which point the finished arc segment is committed and the pen continues.
    if(drawTool==='line' && lineSubmode==='arc'){
      if(!currentDraw.pendingArcMid){
        currentDraw.pendingArcMid = {x:pt.x,y:pt.y};
        // don't add a vertex yet — wait for the end click
        updateTypedBadge(); updateDrawActionButtons();
        draw();
        return;
      } else {
        // end click: commit the arc from last vertex → through → this point
        const start = currentDraw.points[currentDraw.points.length-1];
        currentDraw.points.push({x:pt.x,y:pt.y});
        if(!currentDraw.segModes) currentDraw.segModes=['straight'];
        // store the arc segment with its explicit middle point so finishDraw
        // can rebuild the exact 3-point arc
        currentDraw.segModes.push({kind:'arc', mid:currentDraw.pendingArcMid});
        currentDraw.pendingArcMid = null;
        completePrimitiveIfReady();
        updateTypedBadge(); updateDrawActionButtons();
        return;
      }
    }
    currentDraw.points.push(pt);
    // record how the segment leading INTO this new point should be drawn
    if(!currentDraw.segModes) currentDraw.segModes=['straight'];
    currentDraw.segModes.push(drawTool==='line' ? lineSubmode : 'straight');
  }
  completePrimitiveIfReady();
  updateTypedBadge(); updateDrawActionButtons();
}

canvas.addEventListener('mousedown', (e)=>{
  const rect = canvas.getBoundingClientRect();
  const sx=e.clientX-rect.left, sy=e.clientY-rect.top;
  if(e.button===1 || e.button===2){
    panning=true; panStart={x:sx,y:sy}; panOrigin={x:view.ox,y:view.oy};
    return;
  }
  if(e.button!==0) return;

  // Matn asbobi: yangi matn qo'yish yoki mavjudini tanlab sudrash.
  // Boshqa asboblardan OLDIN tekshiriladi, chunki matn rejimi yoqilganda
  // bosish faqat matnga tegishli bo'lishi kerak.
  if(typeof textMouseDown==='function' && textMouseDown(sx, sy, e)) return;

  // Offset tool: click chooses the side (distance = cursor→shape, or typed)
  // Joylashtirish rejimi — hamma narsadan OLDIN
  if(typeof pasteMode!=='undefined' && pasteMode){
    const w = toWorld(sx, sy);
    const snap = (typeof findSnapCandidate==='function') ? findSnapCandidate(w) : null;
    commitPastePlace(snap ? snap.point : w);
    return;
  }

  // Fillet / Chamfer rejimi
  if(typeof filletMode!=='undefined' && filletMode){
    filletClick(sx, sy);
    return;
  }

  if(offsetMode){
    // 1-klik = chiziqni tanlash, 2-klik = tomonni belgilab bajarish.
    // Rejim ochiq qoladi — cheksiz takrorlash mumkin.
    const w = toWorld(sx,sy);
    const snap = (typeof findSnapCandidate==='function') ? findSnapCandidate(w) : null;
    offsetClick(sx, sy, snap ? snap.point : w);
    return;
  }

  // Dimension tool intercepts clicks first (snap applies so measurements are exact)
  if(dimTool){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    const p = snap ? snap.point : w;
    dimClickAt(p);
    draw();
    return;
  }

  // Trim/Extend intercepts clicks: plain = trim, Ctrl/Shift = extend
  if(trimMode){
    const w = toWorld(sx,sy);
    const extend = e.ctrlKey || e.shiftKey || e.metaKey;
    const ok = doTrimAt(w, extend);
    const hint=document.getElementById('hint');
    if(!ok){ hint.innerHTML = (extend?'Extend':'Trim)')+': mos kesishish topilmadi. Boshqa chiziqni bosing yoki Esc.'; }
    else { hint.innerHTML = (extend?'Extend':'Trim')+' bajarildi. Davom eting yoki Esc.'; }
    draw();
    return;
  }

  // active transform tool intercepts clicks before any drawing/selection logic
  if(transformTool){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    // base point (step 1) is placed exactly; later points honor ortho when no snap
    let p;
    if(snap) p = snap.point;
    else if(transformStep===1) p = w;
    else p = applyOrtho(transformBase, w);
    if(transformStep===1){
      transformBase = p;
      transformSnapshot = snapshotSelected();
      transformRefPt = p;
      transformRefLen = 1;
      transformRefAng = 0;
      transformStep = 2;
      const hint=document.getElementById('hint');
      if(transformTool==='scale'){
        hint.innerHTML = 'Scale: A=markaz qo\'yildi — endi B (o\'lchov referens) nuqtasini bosing';
      } else if(transformTool==='rotate'){
        hint.innerHTML = 'Rotate: A=markaz qo\'yildi — endi B (boshlang\'ich yo\'nalish) nuqtasini bosing';
      } else {
        hint.innerHTML = 'Transform: '+transformTool.toUpperCase()+' — ikkinchi nuqtani bosing (Ctrl/Shift: +Copy)';
      }
      return;
    }
    // SCALE uses an extra reference step: A(base) -> B(reference dist) -> C(new dist).
    // The factor = dist(A->C) / dist(A->B) (AutoCAD "Reference" scaling).
    if(transformStep===2 && transformTool==='scale'){
      transformRefLen = Math.max(len(sub(p, transformBase)), 1e-6); // B fixes the reference length
      transformStep = 3;
      const hint=document.getElementById('hint');
      hint.innerHTML = 'Scale: B=referens qo\'yildi — C (yangi o\'lchov)ni bosing (Ctrl/Shift: +Copy, yoki raqam yozib Enter)';
      return;
    }
    // ROTATE also uses a reference step: A(pivot) -> B(reference direction) ->
    // C(new direction). The rotation = angle(A->C) - angle(A->B).
    if(transformStep===2 && transformTool==='rotate'){
      transformRefAng = Math.atan2(p.y-transformBase.y, p.x-transformBase.x); // B fixes reference angle
      transformStep = 3;
      const hint=document.getElementById('hint');
      hint.innerHTML = 'Rotate: B=boshlang\'ich yo\'nalish qo\'yildi — C (yangi yo\'nalish)ni bosing (Ctrl/Shift: +Copy, yoki daraja yozib Enter)';
      return;
    }
    if(transformStep===2){
      let commitTarget = p;
      // Move-by-distance: a typed distance overrides the raw click position
      if(transformTool==='move' && transformTyped!==''){
        const dist=parseFloat(transformTyped);
        if(isFinite(dist) && dist>0){
          let dir=sub(p, transformBase);
          if(len(dir)<1e-9) dir={x:1,y:0};
          dir=norm(dir);
          commitTarget={x:transformBase.x+dir.x*dist, y:transformBase.y+dir.y*dist};
        }
      }
      const copy = e.ctrlKey || e.shiftKey || e.metaKey;
      commitTransform(commitTarget, copy);
      const hint=document.getElementById('hint');
      if(copy){
        // stay in copy mode: re-snapshot the newly-created copies and keep
        // waiting for another target point (chained copies, like AutoCAD)
        transformSnapshot = snapshotSelected();
        transformBase = commitTarget;
        transformRefLen = 1; transformRefAng = 0;
        transformTyped='';
        hint.innerHTML = 'Transform (+Copy): keyingi nusxa uchun nuqta bosing &middot; Esc: tugatish';
        draw();
      } else {
        finishTransform();
        hint.innerHTML = 'Transform bajarildi.';
        draw();
      }
      return;
    }
    // SCALE/ROTATE step 3: C sets the new length/direction and commits
    if(transformStep===3 && (transformTool==='scale' || transformTool==='rotate')){
      const copy = e.ctrlKey || e.shiftKey || e.metaKey;
      commitTransform(p, copy);
      const hint=document.getElementById('hint');
      if(copy){
        transformSnapshot = snapshotSelected();
        // keep reference (length/angle) and base; allow chained copies
        hint.innerHTML = (transformTool==='scale'?'Scale':'Rotate')+' (+Copy): yana C nuqta bosing &middot; Esc: tugatish';
        draw();
      } else {
        finishTransform();
        hint.innerHTML = (transformTool==='scale'?'Scale':'Rotate')+' bajarildi.';
        draw();
      }
      return;
    }
  }

  if(appMode==='draw' && drawTool!=='none'){
    const raw = toWorld(sx,sy);
    const snapped = computeDrawPoint(raw);
    addDrawPoint(snapped);
    typedLen=''; typedLen2=''; typingSecond=false;
    updateTypedBadge();
    updateDrawActionButtons();
    draw();
    return;
  }

  // From here on: 'edit' mode, or 'draw' mode with no tool selected — both are
  // selection/grip contexts and share the same click / drag / box-select rules.
  mouseDownPos={x:sx,y:sy};
  mouseDownModKey = e.ctrlKey || e.shiftKey || e.metaKey;

  // ---- Stretch tool intercepts clicks in all of its stages ----
  if(stretchMode==='window'){
    stretchBoxing=true; stretchBox={x0:sx,y0:sy,x1:sx,y1:sy}; draw(); return;
  }
  if(stretchMode==='base'){
    const w=toWorld(sx,sy);
    const snap=findSnapCandidate(w);
    stretchBase = snap? snap.point : w;
    stretchSnap = drawnLines.map(l=>JSON.parse(JSON.stringify(l)));
    stretchMode='move'; stretchTyped='';
    updateStretchHint(); draw(); return;
  }
  if(stretchMode==='move'){
    const w=toWorld(sx,sy);
    const snap=findSnapCandidate(w);
    applyStretch(stretchDelta(snap? snap.point : w));
    detectCorners(); pushHistory(); renderList(); renderDrawnList();
    finishStretch();
    document.getElementById('hint').innerHTML='Stretch bajarildi.';
    return;
  }

  // Array: while the polar mode is open, a click sets the rotation centre
  if(arrayMode && (document.getElementById('arrayType')||{}).value==='polar'){
    const w = toWorld(sx,sy);
    const snap = findSnapCandidate(w);
    arrayCenter = snap ? {x:snap.point.x, y:snap.point.y} : w;
    syncArrayPanel(); draw();
    return;
  }

  // 0) reference image drag (only while reference editing is on)
  if(refEditMode){
    const w0 = toWorld(sx,sy);
    const hit = refHitTest(w0);
    if(hit){
      activeRefId = hit.id;
      draggingRef = {id:hit.id, dx:w0.x-hit.x, dy:w0.y-hit.y};
      renderRefPanel(); draw();
      return;
    }
  }

  // 1) grip hit-test: any vertex of a user-drawn shape can be grabbed and
  // dragged to a new position (imported DXF geometry stays fixed/uneditable
  // this way, to keep the original file's exact geometry intact elsewhere)
  let gripHit=null, gripD=12;
  drawnLines.forEach((line,li)=>{
    if(!line.selected) return; // grips are only shown (and grabbable) on selected shapes
    if(line.hidden || !layerOf(line).visible || layerOf(line).locked) return; // locked/hidden layers aren't editable
    // center grip (translate whole shape) for circle/arc/polygon
    if(line.center){
      const s=toScreen(line.center);
      const d=Math.hypot(s.x-sx,s.y-sy);
      if(d<gripD){ gripD=d; gripHit={li,gi:'center'}; }
    }
    // explicit editable grips
    const grips = line.grips || line.points;
    grips.forEach((p,gi)=>{
      const s=toScreen(p);
      const d=Math.hypot(s.x-sx,s.y-sy);
      if(d<gripD){ gripD=d; gripHit={li,gi}; }
    });
  });
  if(gripHit){ draggingGrip=gripHit; dragMoved=false; return; }

  // 2) corner hit-test (Bone Edit mode only — click cycles Ignore/Dogbone/etc).
  // All corners are visible and clickable in Bone-edit mode.
  if(appMode==='edit'){
    let best=null,bestD=14;
    corners.forEach(c=>{
      const p=toScreen({x:c.x,y:c.y});
      const d=Math.hypot(p.x-sx,p.y-sy);
      if(d<bestD){bestD=d;best=c;}
    });
    mouseDownCorner=best;
    if(best) return;
  }

  // 2.5) dimension hit-test — clicking a dimension selects it (for deletion)
  const dimHit = findDimensionNear(sx,sy);
  if(dimHit!=null){
    const additive = e.ctrlKey || e.shiftKey || e.metaKey;
    if(!additive) dimensions.forEach(d=>d.selected=false);
    dimensions[dimHit].selected = !dimensions[dimHit].selected;
    drawnLines.forEach(l=>l.selected=false);
    corners.forEach(c=>c.selected=false);
    draw(); renderDrawnList();
    return;
  }

  // 3) whole-shape hit-test: resolved on mouseup so a small drag from here
  // can still become a grip-style move rather than an accidental select
  const lineHit = findDrawnLineNear(sx,sy);
  if(lineHit!=null){ pendingLineClickIdx=lineHit; return; }

  // 4) empty space: AutoCAD-style — clear the current selection (unless Shift/Ctrl
  // is held, which means add/remove via the upcoming box), then start a box-select
  if(!(e.shiftKey || e.ctrlKey || e.metaKey)){
    corners.forEach(c=>c.selected=false);
    drawnLines.forEach(l=>l.selected=false);
    dimensions.forEach(d=>d.selected=false);
    updateBulkBar();
  }
  selecting=true; selStart={x:sx,y:sy}; selCur={x:sx,y:sy};
  draw();
});
