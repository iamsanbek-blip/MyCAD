/* ==========================================================================
   js/ui/input-keys.js
   Klaviatura hotkey'lari va undo/redo tugmalari

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

function cycleMode(c){
  const idx = MODES.indexOf(c.mode);
  c.mode = MODES[(idx+1)%MODES.length];
}

document.addEventListener('keydown',(e)=>{
  if(e.isComposing)return;
  if(appMode==='model3d'){if(e.key==='Escape'){panelView?.cancel();panelLineMode=false;panelView?.setLine(false);}return;}
  if(typeof pngRegionSelection!=='undefined' && pngRegionSelection){
    if(e.key==='Escape'){e.preventDefault();cancelPNGRegionExport();}
    return;
  }
  const inField = (typeof inInputField==='function')
    ? (isTextInputTarget(e.target)||inInputField())
    : ['INPUT','SELECT','TEXTAREA'].includes(document.activeElement && document.activeElement.tagName);

  // ---- HIMOYA QATLAMI ----
  // Foydalanuvchi kiritish maydonida yozayotgan bo'lsa, MODIFIKATORSIZ
  // klavishlar global buyruqlarga umuman o'tmasin. Ctrl/Cmd buyruqlari
  // (saqlash, undo, nusxa) esa maydonda ham kerak — ular o'tadi.
  if(inField && !e.ctrlKey && !e.metaKey && !e.altKey){
    // Esc — maydondan chiqish uchun yo'l ochiq qoladi
    if(e.key === 'Escape'){
      try{ document.activeElement.blur(); }catch(err){}
      e.preventDefault();
    }
    return;
  }

  if(inField) return;
  if(document.querySelector('dialog[open]'))return;
  // Matn rejimi: Escape chiqadi, Delete tanlangan matnlarni o'chiradi
  if(typeof textTool!=='undefined' && textTool && e.key==='Escape'){
    e.preventDefault(); finishTextTool();
    document.getElementById('hint').innerHTML='Matn rejimi yopildi.'; return;
  }
  if(typeof texts!=='undefined' && texts.some(t=>t.selected) &&
     (e.key==='Delete' || e.key==='Backspace')){
    e.preventDefault();
    const n=deleteSelectedTexts();
    document.getElementById('hint').innerHTML=n+' ta matn o\'chirildi.'; return;
  }

  if(stretchMode){
    if(e.key==='Escape'){ e.preventDefault(); if(stretchSnap){ drawnLines=stretchSnap.map(l=>JSON.parse(JSON.stringify(l))); detectCorners(); } finishStretch(); document.getElementById('hint').innerHTML='Stretch bekor qilindi.'; draw(); return; }
    if(stretchMode==='move'){
      if(/^[0-9.]$/.test(e.key)){ e.preventDefault(); stretchTyped+=e.key; applyStretch(stretchDelta(mouseWorld)); updateStretchHint(); draw(); return; }
      if(e.key==='Backspace'){ e.preventDefault(); stretchTyped=stretchTyped.slice(0,-1); applyStretch(stretchDelta(mouseWorld)); updateStretchHint(); draw(); return; }
      if(e.key==='Enter'){
        e.preventDefault();
        applyStretch(stretchDelta(mouseWorld));
        detectCorners(); pushHistory(); renderList(); renderDrawnList();
        finishStretch();
        document.getElementById('hint').innerHTML='Stretch bajarildi.';
        return;
      }
    }
  }

  // Offset: type a distance, Enter confirms at cursor, Escape leaves the tool
  // Fillet / Chamfer
  if(typeof filletMode!=='undefined' && filletMode){
    if(e.key==='Escape'){
      e.preventDefault();
      if(filletPick!=null){ filletPick=null; drawnLines.forEach(l=>l.selected=false); filletHint(); }
      else { finishFillet(); document.getElementById('hint').innerHTML='Fillet/Chamfer yopildi.'; }
      draw(); return;
    }
  }

  if(offsetMode){
    if(e.key==='Escape'){
      e.preventDefault();
      // avval tanlovni bekor qilamiz, ikkinchi Esc rejimni yopadi
      if(offsetPick!=null){ offsetPick=null; drawnLines.forEach(l=>l.selected=false); offsetHint(); }
      else { finishOffset(); document.getElementById('hint').innerHTML='Offset yopildi.'; }
      draw(); return;
    }
    if(e.key==='Enter'){
      e.preventDefault();
      // confirm the offset at the current cursor position (side) with the typed
      // or remembered distance
      let dist = offsetTyped!=='' ? Math.abs(parseFloat(offsetTyped)) : (lastOffsetDist>0?lastOffsetDist:null);
      const ok = applyOffset(mouseWorld, isFinite(dist)?dist:null);
      document.getElementById('hint').innerHTML = ok ? ('Offset bajarildi ('+(+lastOffsetDist.toFixed(2))+' mm). Yana bosing yoki Esc.') : 'Offset: masofa yoki tomon aniqlanmadi.';
      draw(); return;
    }
    if(/^[0-9.]$/.test(e.key)){ e.preventDefault(); offsetTyped+=e.key; offsetHint(); draw(); return; }
    if(e.key==='Backspace'){ e.preventDefault(); offsetTyped=offsetTyped.slice(0,-1); offsetHint(); draw(); return; }
  }

  // Dimension: Escape cancels the in-progress dimension, or leaves the tool
  if(dimTool && e.key==='Escape'){
    e.preventDefault();
    if(dimPts.length>0){ dimPts=[]; dimStep=1; document.getElementById('hint').innerHTML='O\'lchov bekor qilindi. Yangi nuqta bosing yoki Esc.'; }
    else { finishDim(); document.getElementById('hint').innerHTML='O\'lchov asbobi yopildi.'; }
    draw();
    return;
  }

  // Trim/Extend: Escape leaves the tool
  if(trimMode && e.key==='Escape'){
    e.preventDefault(); finishTrim();
    document.getElementById('hint').innerHTML='Trim/Extend yopildi.';
    draw();
    return;
  }

  // active transform tool: Escape cancels and restores original geometry
  if(transformTool){
    if(e.key==='Escape'){
      e.preventDefault();
      if(transformSnapshot){
        drawnLines.forEach((line,li)=>{ if(transformSnapshot[li]) drawnLines[li]=transformSnapshot[li]; });
        detectCorners(); renderList(); renderDrawnList();
      }
      finishTransform();
      draw();
      return;
    }
    // MOVE accepts a typed distance: the shape moves that exact distance along
    // the current cursor direction from the base point (Move by distance).
    if(transformStep===2 && transformTool==='move'){
      if(/^[0-9.]$/.test(e.key)){ e.preventDefault(); transformTyped=(transformTyped||'')+e.key; updateMoveDistHint(); draw(); return; }
      if(e.key==='Backspace'){ e.preventDefault(); transformTyped=(transformTyped||'').slice(0,-1); updateMoveDistHint(); draw(); return; }
      if(e.key==='Enter' && transformTyped){
        e.preventDefault();
        const dist=parseFloat(transformTyped);
        if(isFinite(dist) && dist>0){
          // direction = from base toward the current cursor position
          let dir = sub(mouseWorld, transformBase);
          if(len(dir)<1e-9) dir={x:1,y:0};
          dir = norm(dir);
          const target = {x:transformBase.x+dir.x*dist, y:transformBase.y+dir.y*dist};
          const copy = e.ctrlKey || e.shiftKey || e.metaKey;
          commitTransform(target, copy);
          transformTyped='';
          if(!copy){ finishTransform(); }
          else { transformSnapshot = snapshotSelected(); transformBase = target; }
          draw();
        }
        return;
      }
    }
    // rotate/scale accept a typed exact value while placing the second point
    if(transformStep===3 && (transformTool==='rotate' || transformTool==='scale')){
      if(/^[0-9.\-]$/.test(e.key)){ e.preventDefault(); transformTyped=(transformTyped||'')+e.key; updateTransformTypedHint(); return; }
      if(e.key==='Backspace'){ e.preventDefault(); transformTyped=(transformTyped||'').slice(0,-1); updateTransformTypedHint(); return; }
      if(e.key==='Enter' && transformTyped){
        e.preventDefault();
        const val=parseFloat(transformTyped);
        if(isFinite(val)){
          // synthesize a target point that yields exactly this angle/factor
          let target;
          if(transformTool==='rotate'){
            const ang=transformRefAng + val*Math.PI/180;
            target={x:transformBase.x+Math.cos(ang)*100, y:transformBase.y+Math.sin(ang)*100};
          } else { // scale: factor = dist(A->C)/refLen, so put C at refLen*val
            transformRefLen = transformRefLen||1;
            target={x:transformBase.x+transformRefLen*val, y:transformBase.y};
          }
          commitTransform(target, false);
          transformTyped=''; finishTransform(); draw();
        }
        return;
      }
    }
  }

  // Joylashtirish rejimi: Esc bekor qiladi
  if(typeof pasteMode!=='undefined' && pasteMode && e.key==='Escape'){
    e.preventDefault(); cancelPastePlace(); return;
  }

  // ---- Global Escape: hech qanday asbob/rejim faol emas → TANLOVNI bekor ----
  // Ctrl+A dan keyin mantiqiy davomi. Chizish rejimidagi Escape pastda
  // alohida ishlanadi (u chiziqni tugatib saqlaydi).
  if(e.key==='Escape' && appMode!=='draw'){
    const any = drawnLines.some(l=>l.selected) || dimensions.some(d=>d.selected) ||
                (typeof texts!=='undefined' && texts.some(t=>t.selected));
    if(any){
      e.preventDefault();
      deselectAllObjects();
      const h=document.getElementById('hint');
      if(h) h.innerHTML='Tanlov bekor qilindi.';
      return;
    }
  }

  if(appMode==='draw'){
    const rectSizing = (drawTool==='rect' && currentDraw && currentDraw.points.length===1);
    // Rectangle: "," / Tab / x switches from WIDTH to HEIGHT (AutoCAD-style W x H)
    if(rectSizing && (e.key===',' || e.key==='Tab' || e.key==='x' || e.key==='X')){
      e.preventDefault();
      if(typedLen!==''){ typingSecond = true; }
      updateTypedBadge(); draw();
      return;
    }
    // digits / decimal point / minus: build up an exact value
    if(currentDraw && /^[0-9.\-]$/.test(e.key)){
      e.preventDefault();
      if(rectSizing && typingSecond) typedLen2 += e.key; else typedLen += e.key;
      updateTypedBadge();
      draw();
      return;
    }
    if(e.key==='Backspace' && currentDraw && (typedLen!=='' || typedLen2!=='')){
      e.preventDefault();
      if(rectSizing && typingSecond){
        if(typedLen2!=='') typedLen2 = typedLen2.slice(0,-1);
        else typingSecond = false;            // step back into the width field
      } else {
        typedLen = typedLen.slice(0,-1);
      }
      updateTypedBadge();
      draw();
      return;
    }
    // AutoCAD uslubi: raqam terilmayotgan bo'lsa Backspace OXIRGI NUQTANI qaytaradi
    if(e.key==='Backspace' && currentDraw && typedLen==='' && typedLen2===''){
      e.preventDefault();
      const n = currentDraw.points.length;
      undoDrawPoint();
      const h=document.getElementById('hint');
      if(h) h.innerHTML = (n<=1)
        ? 'Chizish bekor qilindi.'
        : 'Oxirgi nuqta qaytarildi ('+(n-1)+' nuqta qoldi) &middot; Backspace: yana orqaga &middot; Esc: tugatib saqlash';
      return;
    }
    if(e.key==='Enter'){
      e.preventDefault();
      // Rectangle sized by width x height
      const wh = pendingRectWH();
      if(wh){
        const base = currentDraw.points[0];
        const corner = rectCornerFromWH(base, (mouseRawWorld||getPreviewPoint()), wh.w, wh.h);
        typedLen=''; typedLen2=''; typingSecond=false;
        addDrawPoint(corner);
        updateTypedBadge(); updateDrawActionButtons();
        draw();
        return;
      }
      if(currentDraw && typedLen!==''){
        const lastPt = currentDraw.points[currentDraw.points.length-1];
        const previewPt = getPreviewPoint();
        const dir = norm(sub(previewPt, lastPt));
        const distance = parseFloat(typedLen);
        if(isFinite(distance) && distance>0){
          addDrawPoint(add(lastPt, scl(dir, distance)));
        }
        typedLen=''; typedLen2=''; typingSecond=false;
        updateTypedBadge(); updateDrawActionButtons();
        draw();
      } else {
        finishDraw();
      }
      return;
    }
    if(e.key==='Escape'){
      e.preventDefault();
      // O'ZGARTIRILDI: ilgari Esc chizilgan hamma narsani O'CHIRIB tashlardi.
      // Endi yetarli nuqta bo'lsa chiziq TUGATILIB SAQLANADI (AutoCAD kabi),
      // faqat bo'sh/yarim boshlangan chizish bekor qilinadi.
      const h=document.getElementById('hint');
      if(currentDraw && drawTool==='line' && currentDraw.points.length>=2){
        finishDraw();
        if(h) h.innerHTML='Chiziq tugatildi va saqlandi.';
      } else if(currentDraw){
        cancelDraw();
        if(h) h.innerHTML='Chizish bekor qilindi (saqlanadigan nuqta yetarli emas).';
      } else {
        setDrawTool('none');
      }
      return;
    }
  }

  if((e.key==='Delete' || e.key==='Backspace') && !(appMode==='draw' && currentDraw)){
    // works in BOTH Bone-edit and Chizish modes (but not while mid-drawing a
    // polyline, where Backspace instead edits the typed length)
    if(drawnLines.some(l=>l.selected) || dimensions.some(d=>d.selected)){
      e.preventDefault();
      deleteSelectedShapes();
    }
  }
});
// Chizmadagi HAMMA narsani tanlaydi: shakllar, o'lchovlar, matnlar.
// Yashirilgan yoki qulflangan qatlamdagilar tanlanmaydi — ular ustida
// baribir ish qilib bo'lmaydi.
function selectAllObjects(){
  let n = 0;
  drawnLines.forEach(l=>{
    const ok = !l.hidden && (typeof isShapeEditable!=='function' || isShapeEditable(l));
    l.selected = ok;
    if(ok) n++;
  });
  dimensions.forEach(d=>{ d.selected = true; n++; });
  if(typeof texts!=='undefined'){
    texts.forEach(t=>{
      const ok = (typeof layerOf!=='function') || (layerOf(t).visible && !layerOf(t).locked);
      t.selected = ok;
      if(ok) n++;
    });
  }
  detectCorners();
  renderDrawnList(); renderList();
  if(typeof updateBulkBar==='function') updateBulkBar();
  draw();
  const h=document.getElementById('hint');
  if(h) h.innerHTML = n
    ? ('Tanlandi: <b>'+n+'</b> ta obyekt &middot; Delete: o\'chirish &middot; '+
       'M: ko\'chirish &middot; Esc: bekor')
    : 'Tanlash uchun chizmada obyekt yo\'q.';
  return n;
}

function deselectAllObjects(){
  drawnLines.forEach(l=>l.selected=false);
  dimensions.forEach(d=>d.selected=false);
  if(typeof texts!=='undefined') texts.forEach(t=>t.selected=false);
  if(typeof corners!=='undefined') corners.forEach(c=>c.selected=false);
  renderDrawnList(); renderList();
  if(typeof updateBulkBar==='function') updateBulkBar();
  draw();
}

function deleteSelectedShapes(){
  drawnLines = drawnLines.filter(l=>!l.selected);
  dimensions = dimensions.filter(d=>!d.selected);
  if(typeof texts!=='undefined') texts = texts.filter(t=>!t.selected);
  detectCorners();
  pushHistory();
  renderDrawnList(); renderList();
  draw();
}
document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);
document.getElementById('historyLimitInp').addEventListener('change', (e)=>{
  const v = parseInt(e.target.value,10);
  historyLimit = (isFinite(v) && v>=1) ? v : 50;
  while(history.length > historyLimit){ history.shift(); historyIndex = Math.max(0,historyIndex-1); }
  updateHistoryStats();
});
