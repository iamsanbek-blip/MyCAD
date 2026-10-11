/* ==========================================================================
   js/ui/panels-layers.js
   Qatlamlar paneli, rang palitrasi, kiritish xavfsizligi

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= init =================
// ===== Layers panel =====
function renderLayerPanel(){
  const box=document.getElementById('layerList');
  if(!box) return;
  box.innerHTML='';
  layers.forEach(ly=>{
    const count = drawnLines.filter(s=>(s.layer||'default')===ly.id).length;
    const row=document.createElement('div');
    row.className='corner-item'+(activeLayer===ly.id?' sel':'');
    row.style.cssText='display:flex;align-items:center;gap:6px;padding:6px;';
    row.innerHTML = `
      <span style="width:12px;height:12px;border-radius:3px;background:${ly.color};box-shadow:0 0 0 1px #0b1220;flex:none;cursor:pointer;" data-col="${ly.id}" title="Rangni o'zgartirish"></span>
      <span style="flex:1;font-size:12px;${activeLayer===ly.id?'font-weight:600;color:var(--cyan);':''}" data-pick="${ly.id}">${ly.name} <span style="color:var(--text-dim);">(${count})</span></span>
      <button class="flipBtn" data-vis="${ly.id}" title="Ko'rinish">${ly.visible?'👁':'🚫'}</button>
      <button class="flipBtn" data-lock="${ly.id}" title="Qulf">${ly.locked?'🔒':'🔓'}</button>
      <button class="flipBtn" data-dellayer="${ly.id}" title="O'chirish">✕</button>`;
    row.querySelector('[data-pick]').addEventListener('click',()=>{ activeLayer=ly.id; renderLayerPanel(); });
    row.querySelector('[data-col]').addEventListener('click',(ev)=>{
      ev.stopPropagation();
      const idx=COLOR_PALETTE.findIndex(c=>c.hex.toLowerCase()===ly.color.toLowerCase());
      const next=COLOR_PALETTE[(idx+1)%COLOR_PALETTE.length];
      ly.color=next.hex; ly.aci=next.aci;
      pushHistory(); renderLayerPanel(); draw(); renderDrawnList();
    });
    row.querySelector('[data-vis]').addEventListener('click',(ev)=>{
      ev.stopPropagation(); ly.visible=!ly.visible;
      if(!ly.visible){ drawnLines.forEach(s=>{ if((s.layer||'default')===ly.id) s.selected=false; }); }
      pushHistory();
      draw(); renderLayerPanel(); renderDrawnList();
    });
    row.querySelector('[data-lock]').addEventListener('click',(ev)=>{
      ev.stopPropagation(); ly.locked=!ly.locked;
      if(ly.locked){ drawnLines.forEach(s=>{ if((s.layer||'default')===ly.id) s.selected=false; }); }
      pushHistory();
      draw(); renderLayerPanel(); renderDrawnList();
    });
    row.querySelector('[data-dellayer]').addEventListener('click',(ev)=>{
      ev.stopPropagation();
      if(layers.length<=1){ alert('Kamida bitta qatlam qolishi kerak.'); return; }
      const cnt = drawnLines.filter(s=>(s.layer||'default')===ly.id).length;
      if(cnt>0 && !confirm(ly.name+' qatlamida '+cnt+' ta shakl bor. Ular "General"ga o\'tkaziladi. Davom etilsinmi?')) return;
      drawnLines.forEach(s=>{ if((s.layer||'default')===ly.id) s.layer='default'; });
      layers=layers.filter(x=>x.id!==ly.id);
      if(!layers.find(x=>x.id==='default')) layers.push({id:'default',name:'General',color:'#ffb454',aci:40,visible:true,locked:false});
      if(activeLayer===ly.id) activeLayer=layers[0].id;
      pushHistory(); renderLayerPanel(); draw(); renderDrawnList();
    });
    box.appendChild(row);
  });
}
function addLayer(){
  const n=layers.length+1;
  const pal=COLOR_PALETTE[n%COLOR_PALETTE.length];
  const id='layer_'+Date.now().toString(36);
  layers.push({id, name:'Qatlam '+n, color:pal.hex, aci:pal.aci, visible:true, locked:false});
  activeLayer=id;
  pushHistory(); renderLayerPanel();
}

// ===== Color palette =====
function renderColorPalette(){
  const box=document.getElementById('colorPalette');
  if(!box) return;
  box.innerHTML='';
  COLOR_PALETTE.forEach(c=>{
    const sw=document.createElement('div');
    sw.title=c.name;
    sw.style.cssText='width:26px;height:26px;border-radius:6px;cursor:pointer;background:'+c.hex+
      ';border:2px solid '+(activeColor===c.hex?'#fff':'transparent')+';box-shadow:0 0 0 1px #0b1220;';
    sw.addEventListener('click',()=>{
      const selByColor = document.getElementById('selectByColorChk');
      if(selByColor && selByColor.checked){
        // select every visible/editable shape that has this color
        drawnLines.forEach(l=>{ l.selected = isShapeEditable(l) && (shapeColor(l).toLowerCase()===c.hex.toLowerCase()); });
        activeColor=c.hex;
        renderColorPalette();
        draw(); renderDrawnList();
        document.getElementById('hint').innerHTML='Shu rangdagi barcha shakllar tanlandi.';
        return;
      }
      activeColor=c.hex;
      // apply to any currently-selected shapes
      let changed=false;
      drawnLines.forEach(l=>{ if(l.selected){ l.color=c.hex; changed=true; } });
      if(changed) pushHistory();
      renderColorPalette();
      draw(); renderDrawnList();
    });
    box.appendChild(sw);
  });
}
// ---- input & geometry safety ----
// Read a numeric input defensively: empty, NaN, Infinity or out-of-range values
// fall back to a sane default instead of poisoning the geometry with NaN.
function safeNum(id, fallback, min, max){
  const el = document.getElementById(id);
  let v = el ? parseNum(el.value, NaN) : NaN;
  if(!isFinite(v)) v = fallback;
  if(min!=null && v<min) v = min;
  if(max!=null && v>max) v = max;
  return v;
}
function isFinitePt(p){ return !!p && isFinite(p.x) && isFinite(p.y); }
// Strip non-finite points; returns null if nothing usable is left.
function sanitizePoints(pts){
  if(!Array.isArray(pts)) return null;
  const out = pts.filter(isFinitePt).map(p=>({x:p.x, y:p.y}));
  return out.length ? out : null;
}
// Drop shapes whose geometry is broken so one bad entity can't break the app.
function sanitizeDrawnLines(){
  let dropped = 0;
  drawnLines = drawnLines.filter(l=>{
    if(!l) { dropped++; return false; }
    if(l.kind==='circle'){
      if(!isFinitePt(l.center) || !isFinite(l.radius) || l.radius<=0){ dropped++; return false; }
      return true;
    }
    const pts = sanitizePoints(l.points);
    if(!pts || pts.length<2){ dropped++; return false; }
    l.points = pts;
    if(l.grips){
      const g = sanitizePoints(l.grips);
      if(g) l.grips = g; else delete l.grips;
    }
    return true;
  });
  return dropped;
}
function shapeColor(l){ return l.color || layerOf(l).color || '#ffb454'; }
// Solid fill uses the shape's own colour, so a filled shape reads as one flat colour.
function fillColorOf(col){ return col; }
function isFillable(l){ return !!l.closed && l.points && l.points.length>2; }
function syncFillCheckbox(){
  const chk=document.getElementById('fillShapeChk');
  const hint=document.getElementById('fillHint');
  if(!chk) return;
  const sel=drawnLines.filter(l=>l.selected);
  if(!sel.length){ chk.checked=false; chk.indeterminate=false; if(hint) hint.textContent=''; return; }
  const fillable=sel.filter(isFillable);
  const on=fillable.filter(l=>l.filled).length;
  chk.indeterminate = on>0 && on<fillable.length;
  chk.checked = fillable.length>0 && on===fillable.length;
  if(hint) hint.textContent = fillable.length ? (fillable.length+' ta yopiq shakl tanlangan.') : 'Tanlangan shakl yopiq emas — avval Join bilan yoping.';
}
function applyFillToSelection(on){
  const sel=drawnLines.filter(l=>l.selected);
  const hint=document.getElementById('fillHint');
  if(!sel.length){ if(hint) hint.textContent='Avval shaklni tanlang.'; return; }
  const fillable=sel.filter(isFillable);
  if(!fillable.length){
    if(hint) hint.textContent='Bo\'yash uchun shakl YOPIQ bo\'lishi kerak. Chiziqlarni tanlab Join qiling.';
    syncFillCheckbox(); return;
  }
  fillable.forEach(l=>{ l.filled = !!on; });
  pushHistory(); draw(); renderDrawnList();
  if(hint) hint.textContent = (on? 'Bo\'yaldi: ' : 'Bo\'yash olindi: ')+fillable.length+' ta shakl.';
}
