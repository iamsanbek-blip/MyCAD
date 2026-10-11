/* ==========================================================================
   js/tools/text.js
   Matn annotatsiyasi — chizmaga texnik ko'rsatmalar yozish

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== MATN (TEXT) ANNOTATSIYASI =====
// Chizmaga erkin matn qo'yish: "Qalinlik 18 mm", "Kesish tezligi 3000",
// "Bu tomondan boshlansin" kabi texnik ko'rsatmalar uchun.
//
// Matn balandligi REAL o'lchamda (mm) saqlanadi — xuddi o'lchovlar kabi.
// Shuning uchun zoom qanday bo'lishidan qat'i nazar chizmaga nisbatan
// proporsiyasi buzilmaydi va PNG/DXF eksportda ham to'g'ri chiqadi.
//
// Ma'lumot: {id, x, y, text, size(mm), rot(°), color, layer, selected}
let texts = [];
let textTool = false;      // "Matn" rejimi yoqilganmi
let textSeq = 1;
let draggingText = null;   // {id, dx, dy} — sudrash paytida
let TEXT_LINE_H = 1.35;    // qator oralig'i = balandlikning 1.35 barobari

// ---------------------------------------------------------------------------
//  Matn kiritish oynasi
//
//  MUHIM: Electron window.prompt() ni QO'LLAB-QUVVATLAMAYDI — u hech narsa
//  qaytarmaydi. Shu sabab matn qo'yish desktop versiyada UMUMAN ishlamasdi.
//  Endi ilova ichidagi o'z oynamiz ishlatiladi (index.html: #askOverlay).
// ---------------------------------------------------------------------------
function askText(title, initial){
  return new Promise(resolve=>{
    const ov=document.getElementById('askOverlay');
    const ta=document.getElementById('askInput');
    const ttl=document.getElementById('askTitle');
    const ok=document.getElementById('askOk');
    const cancel=document.getElementById('askCancel');
    if(!ov || !ta){ resolve(null); return; }     // oyna yo'q — bekor

    let closed=false;
    ttl.textContent = title || 'Matn';
    ta.value = initial || '';
    ov.style.display='flex';
    // fokusni ishonchli berish — bir necha urinish (oyna endi ochilgan)
    const grab=()=>{ if(!closed){ ta.focus(); ta.select(); } };
    requestAnimationFrame(grab);
    setTimeout(grab, 30); setTimeout(grab, 90);

    const done=(val)=>{
      if(closed) return;                          // ikki marta yopilmasin
      closed=true;
      ov.style.display='none';
      document.removeEventListener('keydown', onKey, true);
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      ov.removeEventListener('mousedown', onBack);
      resolve(val);
    };
    const onOk=()=>done(ta.value);
    const onCancel=()=>done(null);
    const onBack=(e)=>{
      if(e.target===ov){ done(null); return; }
      // oyna ichiga bosilsa — fokusni matn maydoniga qaytaramiz
      if(e.target!==ta) setTimeout(grab, 0);
    };

    // TUZATILDI: ilgari tinglovchi FAQAT textarea da edi. Agar fokus undan
    // chiqib ketsa (masalan oynaning bo'sh joyiga bosilsa), yozilgan harflar
    // dastur hotkeylariga tushardi — "a" Array'ni, "l" Line'ni ochib yuborardi
    // va matn kiritish "ba'zan ishlamay" qolardi.
    //
    // Endi tinglovchi DOCUMENT da, CAPTURE bosqichida: oyna ochiq ekan
    // hech qanday klavish dasturgacha yetib bormaydi.
    const onKey=(e)=>{
      if(closed) return;
      e.stopPropagation();
      if(e.key==='Escape'){ e.preventDefault(); done(null); return; }
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); done(ta.value); return; }
      // qolgan hamma narsa matn maydoniga tushsin
      if(document.activeElement!==ta) ta.focus();
    };
    document.addEventListener('keydown', onKey, true);
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    ov.addEventListener('mousedown', onBack);
  });
}

function newTextId(){ return 'txt'+(textSeq++)+'_'+Date.now().toString(36); }
function textSizeInput(){
  const v=parseNum((document.getElementById('textSize')||{}).value, NaN);
  return (isFinite(v)&&v>0)?v:10;
}
function textRotInput(){
  const v=parseNum((document.getElementById('textRot')||{}).value, NaN);
  return isFinite(v)?v:0;
}
function getText(id){ return texts.find(t=>t.id===id) || null; }
function selectedTexts(){ return texts.filter(t=>t.selected); }

// ---- rejimni yoqish / o'chirish ----
function startTextTool(){
  if(typeof transformTool!=='undefined' && transformTool) finishTransform();
  if(typeof trimMode!=='undefined' && trimMode) finishTrim();
  if(typeof dimTool!=='undefined' && dimTool) finishDim();
  if(typeof offsetMode!=='undefined' && offsetMode) finishOffset();
  textTool = true;
  const b=document.getElementById('textAddBtn'); if(b) b.classList.add('active');
  const h=document.getElementById('hint');
  if(h) h.innerHTML='Matn: chizmada joyni bosing &middot; Yozuvni kiriting (Shift+Enter — yangi qator) &middot; '+
                    'Mavjud matnni <b>ikki marta bosing</b> — tahrirlash &middot; Esc: chiqish';
  draw();
}
function finishTextTool(){
  textTool = false;
  const b=document.getElementById('textAddBtn'); if(b) b.classList.remove('active');
  draw();
}
function toggleTextTool(){ textTool ? finishTextTool() : startTextTool(); }

// ---- yaratish / tahrirlash ----
async function placeTextAt(world){
  const raw = await askText('Chizmaga yoziladigan matn', '');
  if(raw===null) return false;
  const body = String(raw).trim();
  if(!body) return false;
  texts.push({
    id: newTextId(),
    x: world.x, y: world.y,
    text: body,
    size: textSizeInput(),
    rot: textRotInput(),
    color: (typeof activeColor!=='undefined' && activeColor) ? activeColor : null,
    layer: (typeof activeLayer!=='undefined') ? activeLayer : 'default',
    selected: false,
  });
  pushHistory(); draw();
  return true;
}
async function editTextEntry(t){
  if(!t) return false;
  const raw = await askText('Matnni tahrirlang (bo\'sh qoldirsangiz o\'chiriladi)', t.text);
  if(raw===null) return false;
  const body = String(raw).trim();
  if(!body){ texts = texts.filter(x=>x.id!==t.id); }
  else { t.text = body; }
  pushHistory(); draw();
  return true;
}
function deleteSelectedTexts(){
  const n = texts.filter(t=>t.selected).length;
  if(!n) return 0;
  texts = texts.filter(t=>!t.selected);
  pushHistory(); draw();
  return n;
}

// ---- geometriya / urish sinovi ----
// Matnning ekrandagi o'lchamini o'lchaydi (px). ctx shrifti vaqtincha o'zgaradi.
function textScreenBox(t){
  const px = (t.size||10) * view.scale;
  if(!isFinite(px) || px < 0.5) return null;
  ctx.save();
  ctx.font = px.toFixed(2)+'px sans-serif';
  const lines = String(t.text||'').split('\n');
  let w = 0;
  lines.forEach(L=>{ w = Math.max(w, ctx.measureText(L).width); });
  ctx.restore();
  return {px, w, h: lines.length*px*TEXT_LINE_H, lines};
}
// Ekran nuqtasi matn ichiga tushdimi? (burilishni hisobga oladi)
function textHitTest(t, sx, sy){
  const box = textScreenBox(t);
  if(!box) return false;
  const o = toScreen({x:t.x, y:t.y});
  // ekranda Y teskari, shuning uchun burchak ham teskari
  const ang = -(t.rot||0) * Math.PI/180;
  const dx = sx-o.x, dy = sy-o.y;
  const ca = Math.cos(-ang), sa = Math.sin(-ang);
  const lx = dx*ca - dy*sa;
  const ly = dx*sa + dy*ca;
  const pad = Math.max(3, box.px*0.2);
  return lx >= -pad && lx <= box.w+pad && ly >= -pad && ly <= box.h+pad;
}
function findTextNear(sx, sy){
  // ustidagisi birinchi tanlansin — teskari tartibda qidiramiz
  for(let i=texts.length-1; i>=0; i--){
    const t=texts[i];
    if(typeof layerOf==='function'){ const ly=layerOf(t); if(!ly.visible || ly.locked) continue; }
    if(textHitTest(t, sx, sy)) return t;
  }
  return null;
}
// Dunyo koordinatalaridagi taxminiy chegara (PNG eksport chegarasi uchun)
function textWorldBounds(t){
  const lines = String(t.text||'').split('\n');
  let maxLen = 0;
  lines.forEach(L=>{ maxLen = Math.max(maxLen, L.length); });
  const size = t.size||10;
  const w = maxLen * size * 0.6;              // taxminiy: harf eni ≈ 0.6×balandlik
  const h = lines.length * size * TEXT_LINE_H;
  const a = (t.rot||0)*Math.PI/180;
  const ca=Math.cos(a), sa=Math.sin(a);
  const pts = [[0,0],[w,0],[0,-h],[w,-h]].map(([px,py])=>({
    x: t.x + px*ca - py*sa,
    y: t.y + px*sa + py*ca,
  }));
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  pts.forEach(p=>{ x0=Math.min(x0,p.x); y0=Math.min(y0,p.y); x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); });
  return {x0,y0,x1,y1};
}

// ---- ekranga chizish ----
function textColorOf(t){
  if(t.color) return t.color;
  if(typeof layerOf==='function') return layerOf(t).color || '#dce6f5';
  return '#dce6f5';
}
function drawTexts(){
  if(!texts.length) return;
  texts.forEach(t=>{
    if(typeof layerOf==='function' && !layerOf(t).visible) return;
    const box = textScreenBox(t);
    if(!box) return;
    const o = toScreen({x:t.x, y:t.y});
    const col = t.selected ? '#ffe680' : textColorOf(t);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(-(t.rot||0)*Math.PI/180);   // ekranda Y teskari
    ctx.font = box.px.toFixed(2)+'px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // Halo o'lchovlardagi bilan bir xil uslubda — harf konturi bo'ylab
    ctx.lineJoin='round'; ctx.lineCap='round';
    box.lines.forEach((L,i)=>{
      const y = i*box.px*TEXT_LINE_H;
      ctx.strokeStyle = (typeof DIM_HALO!=='undefined') ? DIM_HALO : '#0b1220';
      ctx.lineWidth = Math.max(1.5, box.px*0.22);
      ctx.strokeText(L, 0, y);
      ctx.strokeText(L, 0, y);
      ctx.fillStyle = col;
      ctx.fillText(L, 0, y);
    });
    if(t.selected){
      ctx.strokeStyle='#ffe680'; ctx.lineWidth=1; ctx.setLineDash([4,3]);
      const pad=Math.max(3, box.px*0.2);
      ctx.strokeRect(-pad, -pad, box.w+pad*2, box.h+pad*2);
      ctx.setLineDash([]);
    }
    ctx.restore();
  });
}

// ---- sichqoncha ilgaklari (input-mouse.js / input-drag.js dan chaqiriladi) ----
// true qaytarsa, bosish shu yerda "yeb qo'yilgan" — boshqa asboblar ishlamaydi.
function textMouseDown(sx, sy, e){
  if(textTool){
    const w = toWorld(sx, sy);
    const snap = (typeof findSnapCandidate==='function') ? findSnapCandidate(w) : null;
    placeTextAt(snap ? snap.point : w);
    return true;
  }
  // MUHIM: boshqa asbob ishlayotgan bo'lsa, matn bosishni USHLAMAYDI — aks holda
  // Dim/Offset/Trim/Transform/chizish bosishlari matn ustida "yo'qolib" ketardi.
  const busy =
    (typeof dimTool!=='undefined'       && dimTool)       ||
    (typeof offsetMode!=='undefined'    && offsetMode)    ||
    (typeof trimMode!=='undefined'      && trimMode)      ||
    (typeof stretchMode!=='undefined'   && stretchMode)   ||
    (typeof arrayMode!=='undefined'     && arrayMode)     ||
    (typeof transformTool!=='undefined' && transformTool) ||
    (typeof refEditMode!=='undefined'   && refEditMode)   ||
    (typeof drawTool!=='undefined'      && drawTool && drawTool!=='none') ||
    (typeof currentDraw!=='undefined'   && currentDraw);
  if(busy) return false;

  const hit = findTextNear(sx, sy);
  if(!hit) {
    // matn bo'sh joyga bosilganda tanlov tozalansin
    if(texts.some(t=>t.selected) && !(e && (e.ctrlKey||e.shiftKey))){
      texts.forEach(t=>t.selected=false);
      draw();
    }
    return false;
  }
  if(e && (e.ctrlKey || e.shiftKey)) hit.selected = !hit.selected;
  else { texts.forEach(t=>t.selected=false); hit.selected = true; }
  const o = toScreen({x:hit.x, y:hit.y});
  draggingText = {id:hit.id, dx:sx-o.x, dy:sy-o.y};
  draw();
  return true;
}
function textMouseMove(sx, sy){
  if(!draggingText) return false;
  const t = getText(draggingText.id);
  if(!t){ draggingText=null; return false; }
  const w = toWorld(sx-draggingText.dx, sy-draggingText.dy);
  t.x = w.x; t.y = w.y;
  draw();
  return true;
}
function textMouseUp(){
  if(!draggingText) return false;
  draggingText = null;
  pushHistory();
  return true;
}
function textDblClick(sx, sy){
  const hit = findTextNear(sx, sy);
  if(!hit) return false;
  editTextEntry(hit);
  return true;
}
