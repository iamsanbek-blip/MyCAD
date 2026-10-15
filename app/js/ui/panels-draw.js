/* ==========================================================================
   js/ui/panels-draw.js
   Chizish rejimi paneli: mode/tool tugmalari, shakllar ro'yxati

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ---- draw-mode UI wiring ----
function updateTypedBadge(){
  const badge = document.getElementById('typedLenBadge');
  if(appMode==='draw' && drawTool==='rect' && currentDraw && currentDraw.points.length===1 && (typedLen!=='' || typedLen2!=='')){
    badge.style.display='inline-block';
    const wTxt = typedLen==='' ? '?' : typedLen;
    const hTxt = typedLen2==='' ? (typingSecond ? '?' : (typedLen===''?'?':typedLen)) : typedLen2;
    badge.textContent = 'En '+wTxt+' × Bo\'y '+hTxt+' mm  ('+(typingSecond?'bo\'y':'en')+' — "," bilan almashtirish, Enter)';
    return;
  }
  if(appMode==='draw' && currentDraw && typedLen!==''){
    badge.style.display='inline-block';
    badge.textContent = typedLen+' mm (Enter)';
  } else {
    badge.style.display='none';
  }
}
function updateLineModeBadge(){
  const lbl = document.getElementById('currentToolLabel');
  if(lbl && drawTool==='line'){
    const modeTxt = lineSubmode==='arc' ? 'ARC (3 nuqta: o\'rta, tugash)' : 'to\'g\'ri';
    lbl.textContent = 'Line/Polyline — '+modeTxt+' (A: arc, L: to\'g\'ri)';
  }
  draw();
}
function updateDrawActionButtons(){
  const has = !!(currentDraw && currentDraw.points.length>0);
  document.getElementById('drawActionsGroup').style.display = has ? 'flex' : 'none';
}
function setAppMode(mode){
  if(typeof panelLeave==='function'&&appMode==='model3d')panelLeave();
  if(mode==='model3d')settlePageInteraction();
  appMode = mode;
  document.body.classList.toggle('model3d',mode==='model3d');
  document.getElementById('mode3dBtn').classList.toggle('active',mode==='model3d');
  if(transformTool){ finishTransform(); } // switching modes cancels an in-progress transform
  if(trimMode){ finishTrim(); }
  if(dimTool){ finishDim(); }
  if(offsetMode){ finishOffset(); }
  if(typeof arrayMode!=='undefined' && arrayMode){ finishArray(); }
  if(typeof stretchMode!=='undefined' && stretchMode){ finishStretch(); }
  document.getElementById('modeSelectBtn').classList.toggle('active', mode==='edit');
  document.getElementById('modeDrawBtn').classList.toggle('active', mode==='draw');
  document.getElementById('orthoGroup').style.display = mode==='draw' ? 'flex' : 'none';
  document.getElementById('snapGroup').style.display = mode==='draw' ? 'flex' : 'none';
  document.getElementById('toolGroup').style.display = mode==='draw' ? 'flex' : 'none';
  // O'ZGARTIRILDI: ilgari transform/o'lcham paneli faqat "Chizish" rejimida
  // ko'rinardi, shuning uchun Bone edit + Nesting'da 2-panel yo'qolib qolardi.
  // Bu asboblar bosishlarni rejimdan qat'i nazar ushlaydi (input-mouse.js ularni
  // rejim shoxobchasidan OLDIN tekshiradi), shuning uchun ikkala rejimda ham
  // ko'rsatiladi — nesting'dan keyin detalni ko'chirish/burish shu yerda kerak.
  const tg=document.getElementById('transformGroup');
  if(tg) tg.style.display = 'flex';
  const dg=document.getElementById('dimensionGroup');
  if(dg) dg.style.display = 'flex';
  const ng=document.getElementById('nestGroup');
  if(ng) ng.style.display = mode==='edit' ? 'flex' : 'none';
  // The sheet outline belongs to nesting only — drop it when leaving Bone edit
  // so it never gets in the way while drawing.
  if(mode==='draw' && typeof nestSheets!=='undefined' && nestSheets.length){
    nestSheets=[];
    const nr=document.getElementById('nestReport'); if(nr) nr.textContent='';
  }
  document.getElementById('editPanel').style.display = mode==='edit' ? 'block' : 'none';
  document.getElementById('drawPanel').style.display = mode==='draw' ? 'block' : 'none';
  if(mode!=='draw'){ currentDraw=null; typedLen=''; typedLen2=''; typingSecond=false; hoverSnap=null; }
  if(mode==='draw'){ setDrawTool('none'); renderDrawnList(); }
  updateTypedBadge(); updateDrawActionButtons();
  const hint = document.getElementById('hint');
  hint.innerHTML = (mode==='draw')
    ? 'Chap klik: nuqta qo\'yish &middot; Raqam yozib Enter: aniq uzunlik/radius &middot; Enter (bo\'sh)/qo\'sh klik: tugatish &middot; Esc: bekor/asboblarsiz rejim<br>Ortho: gorizontal/vertikalga tortadi &middot; Snap turlarini yon panelda yoqib/o\'chiring'
    : 'Chap klik: burchak rejimini almashtirish &middot; Ctrl/Shift+klik: burchakni tanlovga qo\'shish/olib tashlash &middot; Chizilgan chiziqni klik: tanlab o\'chirish<br>Chapdan-o\'ngga sudrash: to\'liq ichidagilarni tanlaydi &middot; O\'ngdan-chapga sudrash: tegib turganlarni ham tanlaydi &middot; O\'ng/O\'rta sudrash: pan &middot; Ctrl+Z/Y: undo/redo';
  draw();
  if(mode==='model3d')panelEnter();
}
document.getElementById('modeSelectBtn').addEventListener('click', ()=>setAppMode('edit'));
document.getElementById('modeDrawBtn').addEventListener('click', ()=>setAppMode('draw'));
function setDrawTool(tool){
  drawTool = tool;
  currentDraw=null; typedLen=''; typedLen2=''; typingSecond=false; lineArcMode=false;
  ['toolLineBtn','toolCircleBtn','toolRectBtn','toolArcBtn','toolPolygonBtn','toolNoneBtn'].forEach(id=>document.getElementById(id).classList.remove('active'));
  const map = {line:'toolLineBtn', circle:'toolCircleBtn', rect:'toolRectBtn', arc:'toolArcBtn', polygon:'toolPolygonBtn', none:'toolNoneBtn'};
  if(map[tool]) document.getElementById(map[tool]).classList.add('active');
  const labels = {line:'Line/Polyline — to\'g\'ri (A: arc)', circle:'Circle', rect:'Rectangle — en,bo\'y (masalan: 100 , 50 Enter)', arc:'Arc (3 nuqta)', polygon:'Polygon ('+polygonSides+')', none:'Yo\'q (Esc)'};
  const lbl = document.getElementById('currentToolLabel');
  if(lbl) lbl.textContent = labels[tool] || tool;
  updateTypedBadge(); updateDrawActionButtons();
  draw();
}
document.getElementById('toolNoneBtn').addEventListener('click', ()=>setDrawTool('none'));
document.getElementById('toolLineBtn').addEventListener('click', ()=>setDrawTool('line'));
document.getElementById('toolCircleBtn').addEventListener('click', ()=>setDrawTool('circle'));
document.getElementById('toolRectBtn').addEventListener('click', ()=>setDrawTool('rect'));
document.getElementById('toolArcBtn').addEventListener('click', ()=>setDrawTool('arc'));
document.getElementById('toolPolygonBtn').addEventListener('click', ()=>setDrawTool('polygon'));
document.getElementById('polygonSides').addEventListener('change', (e)=>{
  polygonSides = parseInt(e.target.value,10)||6;
  if(drawTool==='polygon'){ const lbl=document.getElementById('currentToolLabel'); if(lbl) lbl.textContent='Polygon ('+polygonSides+')'; }
});
document.getElementById('orthoOnBtn').addEventListener('click', ()=>{
  orthoMode=true;
  document.getElementById('orthoOnBtn').classList.add('active');
  document.getElementById('orthoOffBtn').classList.remove('active');
  draw();
});
document.getElementById('orthoOffBtn').addEventListener('click', ()=>{
  orthoMode=false;
  document.getElementById('orthoOffBtn').classList.add('active');
  document.getElementById('orthoOnBtn').classList.remove('active');
  draw();
});
function renderDrawnList(){
  const list = document.getElementById('drawnList');
  const statsEl = document.getElementById('drawnStats');
  if(!list) return;
  statsEl.textContent = drawnLines.length+' ta chizma'+(dimensions.length? (' + '+dimensions.length+' ta o\'lchov'):'');
  list.innerHTML='';
  const TYPE_LABEL = l => l.kind==='circle' ? 'Circle' : l.kind==='polygon' ? 'Polygon' : l.kind==='arc' ? 'Arc' : l.closed ? 'Rectangle/Polyline' : 'Line/Polyline';
  drawnLines.forEach((l,idx)=>{
    const div=document.createElement('div');
    div.className='corner-item'+(l.selected?' sel':'');
    const col = shapeColor(l);
    const eye = l.hidden ? '🚫' : '👁';
    const curLayer = l.layer || 'default';
    const opts = layers.map(ly=>`<option value="${ly.id}" ${ly.id===curLayer?'selected':''}>${ly.name}</option>`).join('');
    div.innerHTML = `<div class="head" style="display:flex;align-items:center;gap:6px;">
      <span style="width:12px;height:12px;border-radius:3px;background:${col};box-shadow:0 0 0 1px #0b1220;flex:none;"></span>
      <span class="idx" style="flex:1;">#${idx+1} ${TYPE_LABEL(l)} &middot; ${l.points.length} nuqta</span>
      <button class="flipBtn" data-eye="${idx}" title="Ko'rinishni yoqish/o'chirish">${eye}</button>
      <button class="flipBtn" data-del="${idx}" title="O'chirish">✕</button>
    </div>
    <div style="margin-top:4px;"><select data-layer="${idx}" style="width:100%;font-size:11px;padding:2px;background:var(--panel-2);color:var(--text);border:1px solid var(--line);border-radius:4px;">${opts}</select></div>`;
    div.addEventListener('click', (ev)=>{
      if(ev.target.closest('button') || ev.target.closest('select')) return;
      drawnLines.forEach((ll,i)=>ll.selected = (i===idx) ? !ll.selected : ll.selected);
      draw(); renderDrawnList();
    });
    div.querySelector('[data-eye]').addEventListener('click',(ev)=>{
      ev.stopPropagation();
      l.hidden = !l.hidden; pushHistory(); draw(); renderDrawnList();
    });
    div.querySelector('[data-del]').addEventListener('click',(ev)=>{
      ev.stopPropagation();
      drawnLines.splice(idx,1); detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
    });
    div.querySelector('[data-layer]').addEventListener('change',(ev)=>{
      ev.stopPropagation();
      // move this shape (and any other selected shapes) to the chosen layer
      const newLayer = ev.target.value;
      const targets = l.selected ? drawnLines.filter(s=>s.selected) : [l];
      targets.forEach(s=>{ s.layer = newLayer; delete s.color; }); // adopt layer color
      pushHistory(); draw(); renderDrawnList();
    });
    div.querySelector('[data-layer]').addEventListener('click',(ev)=>ev.stopPropagation());
    list.appendChild(div);
  });
  const DIM_LABEL = d => d.kind==='h'?'Gorizontal':d.kind==='v'?'Vertikal':d.kind==='aligned'?'Parallel':'Burchak';
  dimensions.forEach((d,idx)=>{
    const div=document.createElement('div');
    div.className='corner-item';
    div.innerHTML = `<div class="head"><span class="idx">📐 O'lchov: ${DIM_LABEL(d)}</span><button class="flipBtn" data-dim="${idx}" title="O'chirish">✕</button></div>`;
    div.querySelector('button').addEventListener('click',(ev)=>{
      ev.stopPropagation();
      dimensions.splice(idx,1); pushHistory(); draw(); renderDrawnList();
    });
    list.appendChild(div);
  });
  if(typeof renderLayerPanel==='function') renderLayerPanel();
  if(typeof syncFillCheckbox==='function') syncFillCheckbox();
}
document.getElementById('clearAllDrawnBtn').addEventListener('click', ()=>{
  if(drawnLines.length===0 && dimensions.length===0 && polygons.length===0){
    document.getElementById('hint').innerHTML='O\'chiriladigan element yo\'q.';
    return;
  }
  drawnLines=[]; dimensions=[]; polygons=[]; corners=[];
  detectCorners(); pushHistory(); draw(); renderDrawnList(); renderList();
  document.getElementById('hint').innerHTML='Hammasi o\'chirildi.';
});
document.getElementById('hideSelBtn').addEventListener('click', ()=>{
  const sel = drawnLines.filter(l=>l.selected);
  if(!sel.length){ document.getElementById('hint').innerHTML='Avval yashiriladigan shakllarni tanlang.'; return; }
  sel.forEach(l=>{ l.hidden=true; l.selected=false; });
  pushHistory();
  draw(); renderDrawnList();
  document.getElementById('hint').innerHTML=sel.length+' ta shakl yashirildi. "Unhide all" bilan qaytaring.';
});
document.getElementById('unhideAllBtn').addEventListener('click', ()=>{
  let cnt=0;
  drawnLines.forEach(l=>{ if(l.hidden){ l.hidden=false; cnt++; } });
  if(cnt)pushHistory();
  draw(); renderDrawnList();
  document.getElementById('hint').innerHTML = cnt ? (cnt+' ta yashirilgan shakl qayta ko\'rsatildi.') : 'Yashirilgan shakl yo\'q edi.';
});

// AutoCAD kabi: chizish paytida Backspace OXIRGI nuqtani qaytaradi.
// Bitta xato uchun butun chiziqni qaytadan chizishga hojat qolmaydi.
function undoDrawPoint(){
  if(!currentDraw || !currentDraw.points || !currentDraw.points.length) return false;
  if(currentDraw.points.length<=1){ cancelDraw(); return true; }
  currentDraw.points.pop();
  if(currentDraw.segModes){
    currentDraw.segModes = currentDraw.segModes.slice(0, currentDraw.points.length);
  }
  currentDraw.pendingArcMid = null;
  typedLen=''; typedLen2=''; typingSecond=false;
  updateTypedBadge(); updateDrawActionButtons(); draw();
  return true;
}

function finishDraw(){
  // only the Line/Polyline tool uses the "accumulate then finish" flow;
  // the other primitives complete themselves as soon as enough points are clicked
  if(drawTool==='line' && currentDraw && currentDraw.points.length>=2){
    const clickPts = currentDraw.points;
    const segModes = currentDraw.segModes || clickPts.map(()=>'straight');
    const renderPts = [{x:clickPts[0].x, y:clickPts[0].y}];
    const gripPts = [{x:clickPts[0].x, y:clickPts[0].y}];
    // segMeta[g] describes how to get FROM grip g-1 (or g-2 for arcs) TO grip g.
    // 'straight' → line to this grip. 'arcEnd' → this grip is an arc end whose
    // middle is the immediately-preceding grip (an 'arcMid' entry).
    const segMeta = ['start'];
    for(let i=1;i<clickPts.length;i++){
      const a=clickPts[i-1], b=clickPts[i];
      const mode = segModes[i]||'straight';
      if(mode && typeof mode==='object' && mode.kind==='arc' && mode.mid){
        const arcSeg=genArcThrough(a, mode.mid, b, 16);
        for(let k=1;k<arcSeg.length;k++) renderPts.push(arcSeg[k]);
        gripPts.push({x:mode.mid.x,y:mode.mid.y}); segMeta.push('arcMid'); // the through point
        gripPts.push({x:b.x,y:b.y});               segMeta.push('arcEnd'); // arc end (mid = prev grip)
      } else if(mode==='arc' || mode==='midarc'){
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
        const dir=norm(sub(b,a)); const nrm={x:-dir.y,y:dir.x};
        const bulgeH=len(sub(b,a))/2;
        const apex={x:mid.x+nrm.x*bulgeH, y:mid.y+nrm.y*bulgeH};
        const arcSeg=genArcThrough(a,apex,b,16);
        for(let k=1;k<arcSeg.length;k++) renderPts.push(arcSeg[k]);
        gripPts.push({x:apex.x,y:apex.y}); segMeta.push('arcMid');
        gripPts.push({x:b.x,y:b.y});       segMeta.push('arcEnd');
      } else {
        renderPts.push({x:b.x, y:b.y});
        gripPts.push({x:b.x,y:b.y}); segMeta.push('straight');
      }
    }
    // if the shape has any arc segment, keep segMeta so grip edits rebuild the
    // curve; a purely-straight polyline doesn't need it
    const hasArc = segMeta.some(s=>s==='arcMid'||s==='arcEnd');
    const shape = {kind:'line', points:renderPts, closed:false, selected:false, grips: gripPts, layer:activeLayer};
    if(hasArc) shape.segMeta = segMeta;
    drawnLines.push(shape);
    detectCorners();
    pushHistory();
    renderList();
  }
  currentDraw=null; typedLen=''; typedLen2=''; typingSecond=false; lineArcMode=false; lineSubmode='straight';
  updateTypedBadge(); updateDrawActionButtons();
  renderDrawnList();
  draw();
}
function cancelDraw(){
  currentDraw=null; typedLen=''; typedLen2=''; typingSecond=false; lineSubmode='straight'; lineArcMode=false;
  updateTypedBadge(); updateDrawActionButtons();
  draw();
}
document.getElementById('finishDrawBtn').addEventListener('click', finishDraw);
document.getElementById('cancelDrawBtn').addEventListener('click', cancelDraw);
document.getElementById('deleteLineBtn').addEventListener('click', ()=>{
  if(!drawnLines.some(l=>l.selected) && !dimensions.some(d=>d.selected)){
    alert('Avval o\'chirmoqchi bo\'lgan chizma yoki o\'lchovni tanlang (uning ustiga bosing).');
    return;
  }
  deleteSelectedShapes();
});
canvas.addEventListener('dblclick', (e)=>{
  if(typeof textDblClick==='function'){
    const r=canvas.getBoundingClientRect();
    if(textDblClick(e.clientX-r.left, e.clientY-r.top)) return;
  }
  if(appMode==='draw' && currentDraw && currentDraw.points.length>=2){
    e.preventDefault();
    finishDraw();
  }
});

canvas.addEventListener('contextmenu', e=>e.preventDefault());

function toolPointsNeeded(tool){
  return {line:Infinity, circle:2, rect:2, arc:3, polygon:2, none:0}[tool] || Infinity;
}
function completePrimitiveIfReady(){
  if(!currentDraw) return;
  const need = toolPointsNeeded(drawTool);
  if(currentDraw.points.length < need) return;
  const pts = currentDraw.points;
  if(drawTool==='circle'){
    const center=pts[0], edge=pts[1];
    const radius = len(sub(edge,center));
    if(radius>1e-6){
      drawnLines.push({kind:'circle', center, radius, closed:true, selected:false, layer:activeLayer,
        points:genCirclePts(center,radius),
        // four cardinal grips: right(+x), left(-x), top(+y), bottom(-y)
        grips:[{x:center.x+radius,y:center.y},{x:center.x-radius,y:center.y},{x:center.x,y:center.y+radius},{x:center.x,y:center.y-radius}]});
    }
  } else if(drawTool==='rect'){
    const rp = genRectPts(pts[0],pts[1]);
    drawnLines.push({kind:'rect', closed:true, selected:false, layer:activeLayer, points:rp, grips:rp.map(p=>({x:p.x,y:p.y}))});
  } else if(drawTool==='arc'){
    // 3-point arc: click1 = start, click2 = a point ON the arc, click3 = end.
    // Then CONTINUE: the arc's end becomes the next arc's start, so you can
    // chain arcs indefinitely (Enter / Esc / double-click ends the chain).
    const a=pts[0], mid=pts[1], b=pts[2];
    drawnLines.push({kind:'arc', closed:false, selected:false, layer:activeLayer,
      points:genArcThrough(a, mid, b, 24),
      arcA:{x:a.x,y:a.y}, arcMid:{x:mid.x,y:mid.y}, arcB:{x:b.x,y:b.y},
      grips:[{x:a.x,y:a.y},{x:mid.x,y:mid.y},{x:b.x,y:b.y}]});
    pushHistory();
    renderDrawnList();
    // restart the draw buffer from the end point for a seamless next arc
    currentDraw = {points:[{x:b.x,y:b.y}], segModes:['straight']};
    updateTypedBadge(); updateDrawActionButtons();
    return;
  } else if(drawTool==='polygon'){
    const vertexPt = pts[1];
    drawnLines.push({kind:'polygon', center:pts[0], sides:polygonSides, closed:true, selected:false, layer:activeLayer,
      points:genPolygonPts(pts[0],vertexPt,polygonSides),
      polyVertex:{x:vertexPt.x,y:vertexPt.y},
      grips:genPolygonPts(pts[0],vertexPt,polygonSides).map(p=>({x:p.x,y:p.y}))});
  }
  currentDraw=null; typedLen=''; typedLen2=''; typingSecond=false;
  if(drawTool!=='circle' && drawTool!=='arc'){ detectCorners(); renderList(); }
  pushHistory();
  renderDrawnList();
}
