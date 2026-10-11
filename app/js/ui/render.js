/* ==========================================================================
   js/ui/render.js
   Canvas chizish: grid, o'lchamlar, gripslar, shakllar

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= canvas =================
const canvas = document.getElementById('cv');
const ctx = canvas.getContext('2d');
let view = {scale:1, ox:0, oy:0};

function resizeCanvas(){
  const wrap = document.getElementById('canvasWrap');
  canvas.width = wrap.clientWidth*devicePixelRatio;
  canvas.height = wrap.clientHeight*devicePixelRatio;
  canvas.style.width = wrap.clientWidth+'px';
  canvas.style.height = wrap.clientHeight+'px';
  if(polygons.length===0 && drawnLines.length===0){ centerViewAtOrigin(1000); }
  draw();
}
window.addEventListener('resize', resizeCanvas);

function fitView(){
  if(polygons.length===0) return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  polygons.forEach(p=>p.points.forEach(pt=>{
    minX=Math.min(minX,pt.x); minY=Math.min(minY,pt.y);
    maxX=Math.max(maxX,pt.x); maxY=Math.max(maxY,pt.y);
  }));
  const w=Math.max(1e-6, maxX-minX), h=Math.max(1e-6, maxY-minY);
  const cw=Math.max(200, canvas.width/devicePixelRatio), ch=Math.max(200, canvas.height/devicePixelRatio);
  const pad=40;
  let scale = Math.min((cw-2*pad)/w, (ch-2*pad)/h);
  if(!isFinite(scale) || scale<=0) scale = 1;
  view.scale=scale;
  view.ox = pad - minX*scale + (cw-2*pad-w*scale)/2;
  view.oy = ch-pad + minY*scale - (ch-2*pad-h*scale)/2;
  updateZoomBadge();
}
function toScreen(p){ return {x:p.x*view.scale+view.ox, y:view.oy - p.y*view.scale}; }
function toWorld(sx,sy){ return {x:(sx-view.ox)/view.scale, y:(view.oy-sy)/view.scale}; }
function updateZoomBadge(){ document.getElementById('zoomBadge').textContent = Math.round(view.scale*100)+'%'; }
document.getElementById('centerViewBtn').addEventListener('click', ()=>centerViewAtOrigin(1000));

function drawAxisArrows(){
  const o = toScreen({x:0,y:0});
  const L = 34; // fixed screen-space length, independent of zoom
  function arrow(dx,dy,color,label){
    const ex=o.x+dx*L, ey=o.y+dy*L;
    ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(ex,ey); ctx.stroke();
    const ang=Math.atan2(ey-o.y, ex-o.x);
    ctx.beginPath();
    ctx.moveTo(ex,ey);
    ctx.lineTo(ex-8*Math.cos(ang-0.4), ey-8*Math.sin(ang-0.4));
    ctx.lineTo(ex-8*Math.cos(ang+0.4), ey-8*Math.sin(ang+0.4));
    ctx.closePath(); ctx.fill();
    ctx.font='11px sans-serif';
    ctx.fillText(label, ex+dx*10, ey+dy*10+4);
  }
  arrow(1,0,'#ff6b6b','X');
  arrow(0,-1,'#6ee7a8','Y'); // screen y is flipped, so -1 points visually up (+Y in world)
  ctx.fillStyle='#dce6f5';
  ctx.beginPath(); ctx.arc(o.x,o.y,2.5,0,Math.PI*2); ctx.fill();
}

// Dimension styling is driven by ONE real-world number: the text height in mm.
// Everything else is a fixed proportion of it, so arrows, gaps and line weights
// always look right at any zoom (AutoCAD-style annotation scaling).
const DIM_RATIO = {
  arrow   : 0.30,  // arrowhead length      = 30% of text height
  arrowW  : 0.10,  // arrowhead half-width  = 10% of text height
  over    : 0.20,  // extension line overshoot past the dimension line
  gap     : 0.10,  // gap between the measured point and its extension line
  pad     : 0.15,  // padding around the label
  lw      : 0.05   // line weight
};
// Yorliq ortidagi "halo" — matn konturi bo'ylab yuguradigan kontrast chiziq.
// Ilgari yorliq ortiga to'la to'rtburchak to'ldirilardi va u chizmani bekitardi.
// Halo rangi — MAVZU foniga teng bo'lishi kerak, aks holda oq fonda
// to'q halo (yoki teskarisi) chirkin ko'rinadi.
function DIM_HALO_COLOR(){
  return (typeof themeDef==='function') ? themeDef().halo : '#0b1220';
}
const DIM_HALO = '#0b1220';    // zaxira (theme.js yuklanmagan bo'lsa)
const DIM_HALO_RATIO = 0.22;   // halo qalinligi = matn balandligining 22%
function haloText(text, x, y, ts, inkColor, halo){
  ctx.lineJoin='round'; ctx.lineCap='round';
  ctx.strokeStyle = halo || DIM_HALO_COLOR();
  ctx.lineWidth = Math.max(1.5, ts*DIM_HALO_RATIO);
  ctx.strokeText(text, x, y);
  ctx.strokeText(text, x, y);   // ikkinchi o'tish — halo zichroq
  ctx.fillStyle = inkColor;
  ctx.fillText(text, x, y);
}
// Convert a dimension's mm text height into screen-space metrics.
function dimMetrics(d){
  const Tmm = (d && d.textSize) || dimTextSize();     // real height in mm
  const px  = Tmm * view.scale;                        // → screen pixels
  return {
    Tmm, Tpx: px,
    arrow : px*DIM_RATIO.arrow,
    arrowW: px*DIM_RATIO.arrowW,
    over  : px*DIM_RATIO.over,
    gap   : px*DIM_RATIO.gap,
    pad   : px*DIM_RATIO.pad,
    lw    : Math.max(1, px*DIM_RATIO.lw)
  };
}
// filled arrowhead in SCREEN space at s, pointing along angle a
function dimArrowHead(s, a, L, W){
  L = L || 8; W = W || L*0.33;
  const nx=Math.cos(a), ny=Math.sin(a);
  const px=-ny, py=nx; // perpendicular
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(s.x-L*nx + W*px, s.y-L*ny + W*py);
  ctx.lineTo(s.x-L*nx - W*px, s.y-L*ny - W*py);
  ctx.closePath(); ctx.fill();
}
function fmtNum(v, prec){ return v.toFixed(prec==null?1:prec); }

function drawOneDimension(d, ghost){
  // ---- YOY / AYLANA UZUNLIGI ----
  if(d.kind==='arclen'){
    const col = d.selected ? '#ffe680' : '#ff8ad8';
    const ts  = Math.max(9, (d.textSize||10)*view.scale);
    const C=toScreen({x:d.cx, y:d.cy});
    const R=d.r*view.scale;
    ctx.save();
    ctx.strokeStyle=col; ctx.lineWidth=d.selected?2.2:1.4;
    ctx.beginPath();
    if(d.full) ctx.arc(C.x, C.y, R, 0, Math.PI*2);
    else ctx.arc(C.x, C.y, R, -d.a0, -(d.a0+d.sweep), d.sweep>0);
    ctx.stroke();
    const am = d.full ? Math.PI/2 : (d.a0 + d.sweep/2);
    const M = toScreen({x:d.cx+d.r*Math.cos(am), y:d.cy+d.r*Math.sin(am)});
    const P = toScreen(d.place || {x:d.cx, y:d.cy});
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(M.x,M.y); ctx.lineTo(P.x,P.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(M.x,M.y,3,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
    ctx.font=ts.toFixed(1)+'px sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='middle';
    const label=(d.full?'○ ':'⌒ ')+(d.arcLen).toFixed(d.prec!=null?d.prec:1)+' '+(d.unit||'mm');
    haloText(label, P.x+8, P.y, ts, col);
    ctx.restore();
    return;
  }

  const col = ghost ? 'rgba(94,225,255,.7)' : (d.selected ? '#ffe680' : '#8ab4f8');
  const M = dimMetrics(d);
  const ts = M.Tpx;
  if(ts < 1.5) return;                    // unreadable at this zoom
  ctx.strokeStyle=col; ctx.fillStyle=col;
  ctx.lineWidth = d.selected ? M.lw*1.8 : M.lw;
  ctx.font = ts.toFixed(2)+'px sans-serif';
  ctx.textBaseline='middle';

  if(d.kind==='angular'){
    const C=d.center, A=d.a, B=d.b, place=d.place||d.b;
    if(!C||!A||!B) return;
    const rScreen = Math.hypot(toScreen(place).x-toScreen(C).x, toScreen(place).y-toScreen(C).y);
    const cS=toScreen(C);
    let a0=Math.atan2(toScreen(A).y-cS.y, toScreen(A).x-cS.x);
    let a1=Math.atan2(toScreen(B).y-cS.y, toScreen(B).x-cS.x);
    // extension lines from center out along each ray
    ctx.beginPath(); ctx.moveTo(cS.x,cS.y); ctx.lineTo(cS.x+Math.cos(a0)*rScreen, cS.y+Math.sin(a0)*rScreen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cS.x,cS.y); ctx.lineTo(cS.x+Math.cos(a1)*rScreen, cS.y+Math.sin(a1)*rScreen); ctx.stroke();
    // sweep the short way
    let diff=a1-a0; while(diff<=-Math.PI)diff+=Math.PI*2; while(diff>Math.PI)diff-=Math.PI*2;
    ctx.beginPath(); ctx.arc(cS.x,cS.y,rScreen, a0, a0+diff, diff<0); ctx.stroke();
    // world-space angle (screen y is flipped but the magnitude is the same)
    let wa0=Math.atan2(A.y-C.y,A.x-C.x), wa1=Math.atan2(B.y-C.y,B.x-C.x);
    let wdiff=wa1-wa0; while(wdiff<=-Math.PI)wdiff+=Math.PI*2; while(wdiff>Math.PI)wdiff-=Math.PI*2;
    const deg=Math.abs(wdiff*180/Math.PI);
    const midA=a0+diff/2;
    const tp={x:cS.x+Math.cos(midA)*(rScreen+M.Tpx*0.9), y:cS.y+Math.sin(midA)*(rScreen+M.Tpx*0.9)};
    const label=fmtNum(deg, d.prec)+'°';
    ctx.textAlign='center';
    haloText(label, tp.x, tp.y, ts, col);
    return;
  }

  // linear: h / v / aligned
  let p1=d.p1, p2=d.p2, place=d.place;
  if(!p1||!p2||!place) return;
  // determine the dimension-line direction & the measured value
  let dirW; // unit direction of the dimension line in world space
  let value;
  if(d.kind==='h'){ dirW={x:1,y:0}; value=Math.abs(p2.x-p1.x); }
  else if(d.kind==='v'){ dirW={x:0,y:1}; value=Math.abs(p2.y-p1.y); }
  else { const dd=sub(p2,p1); const L=len(dd)||1; dirW={x:dd.x/L,y:dd.y/L}; value=len(dd); }

  // The dimension line passes through `place`, parallel to dirW. Project p1,p2
  // onto that line to get the two witness (extension) endpoints.
  function projectOntoDimLine(pt){
    if(d.kind==='h') return {x:pt.x, y:place.y};
    if(d.kind==='v') return {x:place.x, y:pt.y};
    // aligned: project pt onto the line through `place` with direction dirW
    const rel=sub(pt, place); const t=dot(rel, dirW);
    return {x:place.x+dirW.x*t, y:place.y+dirW.y*t};
  }
  const d1=projectOntoDimLine(p1), d2=projectOntoDimLine(p2);
  const s1=toScreen(p1), s2=toScreen(p2), sd1=toScreen(d1), sd2=toScreen(d2);
  ctx.setLineDash([]);
  // extension lines: small gap at the measured point, small overshoot past the
  // dimension line — both proportional to the text height
  function extLine(sp, sdp){
    const dx=sdp.x-sp.x, dy=sdp.y-sp.y, L=Math.hypot(dx,dy);
    if(L<1e-6) return;
    const ux=dx/L, uy=dy/L;
    ctx.beginPath();
    ctx.moveTo(sp.x+ux*Math.min(M.gap,L*0.4), sp.y+uy*Math.min(M.gap,L*0.4));
    ctx.lineTo(sdp.x+ux*M.over, sdp.y+uy*M.over);
    ctx.stroke();
  }
  extLine(s1, sd1); extLine(s2, sd2);
  ctx.beginPath(); ctx.moveTo(sd1.x,sd1.y); ctx.lineTo(sd2.x,sd2.y); ctx.stroke();
  const aAB=Math.atan2(sd2.y-sd1.y, sd2.x-sd1.x);
  dimArrowHead(sd1, aAB+Math.PI, M.arrow, M.arrowW);
  dimArrowHead(sd2, aAB,          M.arrow, M.arrowW);
  // text at midpoint
  const mid={x:(sd1.x+sd2.x)/2, y:(sd1.y+sd2.y)/2};
  const label=fmtNum(value, d.prec)+(d.unit? (' '+d.unit):'');
  ctx.save();
  ctx.translate(mid.x, mid.y);
  let ta=aAB; if(ta>Math.PI/2||ta<-Math.PI/2) ta+=Math.PI; // keep text upright
  ctx.rotate(ta);
  ctx.textAlign='center';
  haloText(label, 0, -ts*0.08, ts, col);
  ctx.restore();
}
function drawDimensions(){
  dimensions.forEach(d=>drawOneDimension(d, false));
  // in-progress ghost preview
  if(dimTool && dimPts.length>0){
    if(dimTool==='angular'){
      if(dimPts.length>=3){ drawOneDimension({kind:'angular', center:dimPts[0], a:dimPts[1], b:dimPts[2], place:(dimPts[3]||mouseWorld), textSize:dimTextSize(), prec:dimPrecision()}, true); }
    } else if(dimPts.length===2){
      drawOneDimension({kind:dimTool, p1:dimPts[0], p2:dimPts[1], place:mouseWorld, textSize:dimTextSize(), prec:dimPrecision(), unit:dimUnit()}, true);
    } else if(dimPts.length===1){
      // simple rubber band from first point to cursor
      const a=toScreen(dimPts[0]), b=toScreen(mouseWorld);
      ctx.strokeStyle='rgba(94,225,255,.5)'; ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}
// Live preview of the pending offset: a dashed copy of each selected shape at
// the distance implied by the cursor (or the typed value), plus a distance readout.
function drawStretchOverlay(){
  if(!stretchMode) return;
  if(stretchBoxing){
    const x=Math.min(stretchBox.x0,stretchBox.x1), y=Math.min(stretchBox.y0,stretchBox.y1);
    const w=Math.abs(stretchBox.x1-stretchBox.x0), hh=Math.abs(stretchBox.y1-stretchBox.y0);
    ctx.setLineDash([6,4]); ctx.lineWidth=1.5; ctx.strokeStyle='#ff8ad8';
    ctx.fillStyle='rgba(255,138,216,0.10)';
    ctx.fillRect(x,y,w,hh); ctx.strokeRect(x,y,w,hh);
    ctx.setLineDash([]);
  }
  // captured vertices
  stretchPicks.forEach(p=>{
    const l=drawnLines[p.li]; if(!l) return;
    const g = (p.gi==='center') ? l.center : (l.grips||l.points||[])[p.gi];
    if(!g) return;
    const s=toScreen(g);
    ctx.fillStyle='#ff8ad8'; ctx.strokeStyle='#0b1220'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.rect(s.x-5,s.y-5,10,10); ctx.fill(); ctx.stroke();
  });
  // base point + rubber line while moving
  if(stretchBase){
    const b=toScreen(stretchBase);
    ctx.fillStyle='#ff6b6b';
    ctx.beginPath(); ctx.arc(b.x,b.y,4,0,Math.PI*2); ctx.fill();
    if(stretchMode==='move' && mouseWorld){
      const m=toScreen(mouseWorld);
      ctx.strokeStyle='rgba(255,138,216,.8)'; ctx.setLineDash([5,4]); ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(m.x,m.y); ctx.stroke(); ctx.setLineDash([]);
      const d=len(sub(mouseWorld, stretchBase));
      const label=(stretchTyped!==''? stretchTyped : d.toFixed(1))+' mm';
      ctx.font='13px sans-serif'; const tw=ctx.measureText(label).width;
      ctx.fillStyle='#0b1220cc'; ctx.fillRect(m.x+12, m.y-20, tw+8, 18);
      ctx.fillStyle='#ff8ad8'; ctx.fillText(label, m.x+16, m.y-7);
    }
  }
}
function drawOffsetPreview(){
  if(!offsetMode || !mouseWorld) return;
  if(typeof offsetPick==='undefined' || offsetPick==null) return;
  const typed = offsetTyped!=='' ? Math.abs(parseFloat(offsetTyped)) : null;
  const res = offsetPreviewResult(mouseWorld, isFinite(typed)?typed:null);
  if(!res) return;
  const shownDist = res.dist;
  ctx.strokeStyle='rgba(94,225,255,.85)'; ctx.lineWidth=1.6; ctx.setLineDash([6,4]);
  if(res.circle){
    const c=toScreen(res.circle.center);
    ctx.beginPath(); ctx.arc(c.x, c.y, res.circle.radius*view.scale, 0, Math.PI*2); ctx.stroke();
  } else {
    // segmentlarni to'g'ridan-to'g'ri chizamiz — yoy yoy bo'lib ko'rinadi
    ctx.beginPath();
    res.segs.forEach((s,i)=>{
      const A=toScreen(s.a), B=toScreen(s.b);
      if(i===0) ctx.moveTo(A.x,A.y); else ctx.lineTo(A.x,A.y);
      if(s.t==='A'){
        const ai=segArcInfo(s);
        if(ai){ const C=toScreen({x:ai.cx,y:ai.cy});
                ctx.arc(C.x, C.y, ai.r*view.scale, -ai.a0, -(ai.a0+ai.sweep), ai.ccw); }
        else ctx.lineTo(B.x,B.y);
      } else ctx.lineTo(B.x,B.y);
    });
    if(res.closed) ctx.closePath();
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // distance readout near cursor
  const s=toScreen(mouseWorld);
  ctx.fillStyle='#0b1220cc'; const label=(typed!=null?typed:shownDist).toFixed(2)+' mm';
  ctx.font='13px sans-serif'; const tw=ctx.measureText(label).width;
  ctx.fillRect(s.x+12, s.y-20, tw+8, 18);
  ctx.fillStyle='#5ee1ff'; ctx.fillText(label, s.x+16, s.y-7);
}



// centers the view on world (0,0) so that roughly `spanMM` millimeters are
// visible across the shorter side of the canvas — used as the starting view
// on a blank canvas, and by the "⌖ Markazga" button to jump back to it
function centerViewAtOrigin(spanMM){
  spanMM = spanMM||1000;
  const cw=Math.max(200, canvas.width/devicePixelRatio), ch=Math.max(200, canvas.height/devicePixelRatio);
  const pad=40;
  let scale = Math.min((cw-2*pad)/spanMM, (ch-2*pad)/spanMM);
  if(!isFinite(scale) || scale<=0) scale=1;
  view.scale = scale;
  view.ox = cw/2;
  view.oy = ch/2;
  updateZoomBadge();
  draw();
}

const MODE_COLOR = {ignore:'#6b7a94', dogbone:'#ff6b6b', tbone:'#5ea1ff', fillet:'#6ee7a8', chamfer:'#ffb454'};

// TUZATILDI: burchak nuqtalari (bone marker) ilgari QAT'IY 6px edi — zoom
// darajasidan qat'i nazar. Uzoqdan (kichik view.scale) qaraganda bu nuqtalar
// shaklning o'ziga nisbatan nomutanosib katta bo'lib, chizmani bekitib
// qo'yardi. Endi radius view.scale bilan birga kichrayadi (uzoqdan — kichik,
// yaqindan — odatdagidek), lekin 2px dan pastga tushmaydi (bosish uchun
// hamon topiladigan bo'lib qoladi) va 6px dan oshmaydi (yaqinlashtirilganda
// haddan tashqari shishib ketmaydi).
// TUZATILDI: ilgari nuqta har doim kamida 2 px edi va zoom'dan deyarli
// mustaqil o'sardi. Ko'p detalli chizmada (46 detal × o'nlab burchak) uzoqdan
// qaraganda nuqtalar shaklni butunlay bekitib qo'yardi.
//
// Endi nuqta o'lchami HAQIQIY bone radiusiga bog'liq (mm) va zoom bilan
// birga kichrayadi. Juda kichrayib ketsa umuman chizilmaydi — o'sha
// masshtabda unga bosib ham bo'lmaydi, faqat ko'rinishni buzardi.
const CORNER_DOT_MIN_PX = 2.6;   // shundan kichigi — chizilmaydi
function cornerDotR(c){
  const mmR = (c && c.size > 0) ? c.size*0.42 : 1.2;   // dunyo o'lchamida
  return Math.min(6, mmR*view.scale);
}
function gripHalfR(){ return Math.max(1.5, Math.min(4, 0.9*view.scale)); }

function drawWorldGrid(cw, ch){
  // Grid o'chirilgan bo'lsa umuman chizmaymiz [G] yoki panel katakchasi
  if(typeof gridVisible!=='undefined' && !gridVisible) return;
  // grid step in world units: use the snap grid step so the visible grid and the
  // snap points coincide exactly.
  const stepInp=document.getElementById('gridStepInp');
  let step = stepInp ? parseNum(stepInp.value, 10) : 10;
  if(!isFinite(step) || step<=0) step = 10;
  // if the grid would be denser than ~6px on screen, multiply the step up so it
  // stays readable (but snap still uses the base step)
  let drawStep = step;
  while(drawStep*view.scale < 6) drawStep *= 5;
  const px = drawStep*view.scale;
  if(px < 4) return; // too dense to be useful
  // world bounds visible on screen
  const topLeft = toWorld(0,0), botRight = toWorld(cw,ch);
  const minX = Math.min(topLeft.x, botRight.x), maxX = Math.max(topLeft.x, botRight.x);
  const minY = Math.min(topLeft.y, botRight.y), maxY = Math.max(topLeft.y, botRight.y);
  const x0 = Math.floor(minX/drawStep)*drawStep;
  const y0 = Math.floor(minY/drawStep)*drawStep;
  ctx.lineWidth = 1;
  ctx.strokeStyle = (typeof themeDef==='function') ? themeDef().gridMinor : 'rgba(122,143,175,0.12)';
  ctx.beginPath();
  for(let x=x0; x<=maxX; x+=drawStep){
    const s=toScreen({x, y:minY}), e=toScreen({x, y:maxY});
    ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
  }
  for(let y=y0; y<=maxY; y+=drawStep){
    const s=toScreen({x:minX, y}), e=toScreen({x:maxX, y});
    ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
  }
  ctx.stroke();
  // every 5th line a bit brighter (major grid)
  const majStep = drawStep*5;
  const mx0 = Math.floor(minX/majStep)*majStep;
  const my0 = Math.floor(minY/majStep)*majStep;
  ctx.strokeStyle = (typeof themeDef==='function') ? themeDef().gridMajor : 'rgba(122,143,175,0.22)';
  ctx.beginPath();
  for(let x=mx0; x<=maxX; x+=majStep){
    const s=toScreen({x, y:minY}), e=toScreen({x, y:maxY});
    ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
  }
  for(let y=my0; y<=maxY; y+=majStep){
    const s=toScreen({x:minX, y}), e=toScreen({x:maxX, y});
    ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y);
  }
  ctx.stroke();
}
function draw(){
  try{ drawInner(); }
  catch(err){
    console.warn('draw failed, recovering:', err.message);
    try{ sanitizeDrawnLines(); drawInner(); }
    catch(err2){ console.error('draw still failing:', err2.message); }
  }
}
function drawInner(){
  const cw=canvas.width/devicePixelRatio, ch=canvas.height/devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  ctx.clearRect(0,0,cw,ch);
  // Mavzu foni — canvas'ning o'zi shaffof, shuning uchun to'ldiramiz
  if(typeof themeDef==='function'){
    ctx.fillStyle = themeDef().canvas;
    ctx.fillRect(0,0,cw,ch);
  }
  const hasAnything = polygons.length>0 || drawnLines.length>0 || currentDraw;
  if(!hasAnything){
    ctx.fillStyle=(typeof themeIsLight==='function' && themeIsLight())?'#5a6779':'#93a3bd';
    ctx.font='13px sans-serif';
    ctx.fillText('DXF fayl yuklang, yoki "Chizish" bilan chiza boshlang', 20, 30);
  }
  if(!isFinite(view.scale) || view.scale<=0){ view.scale = 1; }

  // ---- world-coordinate background grid (tracks zoom/pan; matches grid snap) ----
  drawWorldGrid(cw, ch);

  // ---- reference images sit behind the drawing ----
  drawReferenceImages();
  drawNestSheets();

  // ---- X/Y axis gizmo at world origin (0,0) ----
  drawAxisArrows();

  function strokeNodePaths(nodesList, strokeStyle, lineWidth, fillStyle){
    ctx.lineWidth=lineWidth; ctx.strokeStyle=strokeStyle; ctx.lineJoin='round';
    nodesList.forEach(nodes=>{
      if(!nodes) return;
      try{
        ctx.beginPath();
        const n = nodes.length;
        const p0 = toScreen(nodes[0]); ctx.moveTo(p0.x,p0.y);
        const lastI = nodes.closed ? n : n-1;
        for(let i=1;i<=lastI;i++){ drawTo(nodes[i%n]); }
        if(nodes.closed) ctx.closePath();
        if(fillStyle && nodes.closed){ ctx.fillStyle=fillStyle; ctx.fill(); }
        ctx.stroke();
      }catch(err){
        console.warn('shape skipped (invalid geometry, e.g. radius too small for this corner):', err.message);
      }
    });
  }

  if(polygons.length>0){
    strokeNodePaths(buildModifiedPaths(), '#dce6f5', 2);
  }

  // ---- user-drawn rect/polygon/line shapes: same dogbone/fillet/T-Bone pipeline ----
  const drawnModified = buildDrawnModifiedPaths();
  drawnLines.forEach((line,idx)=>{
    if(line.hidden || !layerOf(line).visible) return;
    const isSmooth = line.kind==='circle' || line.kind==='arc' || (!line.kind && line.center);
    if(isSmooth) return; // circles/arcs rendered separately below (no corners)
    const nodes = drawnModified[idx];
    const col = shapeColor(line);
    const fillS = (line.filled && line.closed) ? fillColorOf(col) : null;
    strokeNodePaths([nodes], line.selected?'#ffe680':col, line.selected?3.5:2, fillS);
  });

  // corner markers. In Bone-edit mode ALL corners are always visible (that's
  // the mode for setting dogbone/T-bone, so you need to see every corner). In
  // draw mode, a drawn shape's corners only appear once it's selected, to keep
  // the drawing canvas uncluttered.
  corners.forEach(c=>{
    if(appMode!=='edit' && c.source==='drawn'){
      const parent = drawnLines[c.pi];
      if(!parent || !parent.selected) return;
    }
  const R = cornerDotR(c);
  // uzoqdan qaralganda nuqtalar chizmani bekitmasin — tanlanganlar qoladi
  if(R < CORNER_DOT_MIN_PX && !c.selected) return;
  const p2 = toScreen({x:c.x,y:c.y});
  ctx.beginPath(); ctx.arc(p2.x, p2.y, Math.max(R, c.selected?2.2:0), 0, Math.PI*2);
  ctx.fillStyle = MODE_COLOR[c.mode]; ctx.fill();
  ctx.lineWidth = c.selected?2:1;
  ctx.strokeStyle = c.selected? '#ffffff' : '#0b1220';
  ctx.stroke();
  });

  // ---- user-drawn circles/arcs (no corners — plain smooth curves) ----
  drawnLines.forEach(line=>{
    if(line.hidden || !layerOf(line).visible) return;
    const isSmooth = line.kind==='circle' || line.kind==='arc' || (!line.kind && line.center);
    if(!isSmooth) return;
    const pts=line.points;
    if(pts.length<2) return;
    ctx.beginPath();
    ctx.lineWidth = line.selected? 3.5 : 2;
    ctx.strokeStyle = line.selected? '#ffe680' : shapeColor(line);
    const p0=toScreen(pts[0]); ctx.moveTo(p0.x,p0.y);
    for(let i=1;i<pts.length;i++){ const p=toScreen(pts[i]); ctx.lineTo(p.x,p.y); }
    if(line.closed && pts.length>2) ctx.closePath();
    if(line.filled && line.closed && pts.length>2){ ctx.fillStyle=fillColorOf(shapeColor(line)); ctx.fill(); }
    ctx.stroke();
    // no endpoint dots here — the shape's real points appear as grips only when selected
  });

  // ---- grip markers: shown only on SELECTED drawn shapes ----
  const inSelectionContext = appMode==='edit' || (appMode==='draw' && drawTool==='none');
  if(inSelectionContext){
    drawnLines.forEach((line,li)=>{
      if(!line.selected) return; // grips only appear once a shape is selected
      if(line.hidden || !layerOf(line).visible || layerOf(line).locked) return; // no grips on hidden/locked-layer shapes
      const isDragging = draggingGrip && draggingGrip.li===li;
      // center grip (circle/arc/polygon) — draw as a filled square
      if(line.center){
        const active = isDragging && draggingGrip.gi==='center';
        const s=toScreen(line.center);
        const gr=gripHalfR();
        ctx.fillStyle = active? '#ffe680' : '#5ee1ff';
        ctx.strokeStyle='#0b1220'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.rect(s.x-gr,s.y-gr,gr*2,gr*2); ctx.fill(); ctx.stroke();
      }
      const grips = line.grips || line.points;
      grips.forEach((p,gi)=>{
        const active = isDragging && draggingGrip.gi===gi;
        const s=toScreen(p);
        const gr=gripHalfR()*0.9;
        ctx.fillStyle = active? '#ffe680' : '#5ee1ff';
        ctx.strokeStyle='#0b1220'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.rect(s.x-gr,s.y-gr,gr*2,gr*2); ctx.fill(); ctx.stroke();
      });
    });
  }


  if(appMode==='draw' && currentDraw){
    const pts=currentDraw.points;
    const preview = getPreviewPoint();
    ctx.fillStyle='#5ee1ff';
    pts.forEach(p=>{ const s=toScreen(p); ctx.beginPath(); ctx.arc(s.x,s.y,3,0,Math.PI*2); ctx.fill(); });

    let previewPts = null; // world-space polyline to draw as the dashed preview shape
    if(drawTool==='line'){
      // draw the already-committed segments, honoring each one's arc/straight flag
      ctx.strokeStyle='#5ee1ff'; ctx.lineWidth=2; ctx.setLineDash([]);
      ctx.beginPath();
      const p0=toScreen(pts[0]); ctx.moveTo(p0.x,p0.y);
      const modes = currentDraw.segModes || pts.map(()=>'straight');
      for(let i=1;i<pts.length;i++){
        const m = modes[i];
        if(m && typeof m==='object' && m.kind==='arc' && m.mid){
          // committed 3-point arc segment: start → stored mid → end
          const seg=genArcThrough(pts[i-1], m.mid, pts[i], 16);
          for(let k=1;k<seg.length;k++){ const s=toScreen(seg[k]); ctx.lineTo(s.x,s.y); }
        } else if(m==='arc' || m==='midarc'){
          // legacy auto-bulge arc segment
          const a=pts[i-1], b=pts[i];
          const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
          const dir=norm(sub(b,a)); const nrm={x:-dir.y,y:dir.x};
          const apex={x:mid.x+nrm.x*len(sub(b,a))/2, y:mid.y+nrm.y*len(sub(b,a))/2};
          const seg=genArcThrough(a,apex,b,16);
          for(let k=1;k<seg.length;k++){ const s=toScreen(seg[k]); ctx.lineTo(s.x,s.y); }
        } else {
          const p=toScreen(pts[i]); ctx.lineTo(p.x,p.y);
        }
      }
      ctx.stroke();
      const last=pts[pts.length-1];
      if(lineSubmode==='arc'){
        if(!currentDraw.pendingArcMid){
          // first arc click will be the THROUGH (middle) point — rubber-band to it
          previewPts = [last, preview];
        } else {
          // through point is set; the arc runs start → through → cursor(end),
          // exactly like the standalone Arc tool
          previewPts = genArcThrough(last, currentDraw.pendingArcMid, preview, 24);
        }
      } else {
        previewPts = [last, preview];
      }
    } else if(drawTool==='circle'){
      previewPts = genCirclePts(pts[0], len(sub(preview,pts[0])), 48);
    } else if(drawTool==='rect'){
      const wh = pendingRectWH();
      previewPts = wh ? genRectPts(pts[0], rectCornerFromWH(pts[0], (mouseRawWorld||preview), wh.w, wh.h))
                      : genRectPts(pts[0], preview);
    } else if(drawTool==='arc'){
      if(pts.length===1){ previewPts=[pts[0], preview]; } // rubber-band to the through point
      else if(pts.length===2){ previewPts = genArcThrough(pts[0], pts[1], preview, 24); } // arc through the moving end
      else { previewPts=[pts[pts.length-1], preview]; }
    } else if(drawTool==='polygon'){
      previewPts = genPolygonPts(pts[0], preview, polygonSides);
    }
    if(previewPts && previewPts.length){
      ctx.strokeStyle='rgba(94,225,255,.7)'; ctx.lineWidth=2; ctx.setLineDash([6,4]);
      ctx.beginPath();
      const p0=toScreen(previewPts[0]); ctx.moveTo(p0.x,p0.y);
      for(let i=1;i<previewPts.length;i++){ const p=toScreen(previewPts[i]); ctx.lineTo(p.x,p.y); }
      if(drawTool==='rect' || drawTool==='polygon' || drawTool==='circle') ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // live length/angle (or radius) readout near the cursor
    const refPt = pts[pts.length-1];
    const distWorld = len(sub(preview,refPt));
    const ang = Math.round(normAngle(Math.atan2(preview.y-refPt.y, preview.x-refPt.x))*180/Math.PI);
    const b = toScreen(preview);
    ctx.fillStyle='#dce6f5'; ctx.font='12px sans-serif';
    const unitLabel = (drawTool==='circle'||drawTool==='polygon') ? ' mm (radius)' : ' mm @ '+ang+'\u00b0';
    const label = (typedLen!=='' ? typedLen : distWorld.toFixed(1)) + unitLabel;
    ctx.fillText(label, b.x+10, b.y-10);
  } else if(appMode==='draw'){
    // no start point yet: show a small crosshair snap preview even before the first click
    const preview = getPreviewPoint();
    const s = toScreen(preview);
    ctx.strokeStyle='rgba(94,225,255,.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(s.x-8,s.y); ctx.lineTo(s.x+8,s.y); ctx.moveTo(s.x,s.y-8); ctx.lineTo(s.x,s.y+8); ctx.stroke();
  }

  // ---- transform base point + reference line ----
  if(transformTool && transformBase){
    const b = toScreen(transformBase);
    ctx.fillStyle='#ff6b6b'; ctx.strokeStyle='#0b1220'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(b.x,b.y,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    const isRefTool = transformTool==='scale' || transformTool==='rotate';
    const showLine = (transformStep===2 && !isRefTool) || (isRefTool && (transformStep===2||transformStep===3));
    if(showLine && mouseWorld){
      const m = toScreen(mouseWorld);
      ctx.strokeStyle = transformTool==='mirror' ? '#c792ea' : '#ffe680';
      ctx.lineWidth=1.5; ctx.setLineDash([6,4]);
      ctx.beginPath();
      if(transformTool==='mirror'){
        const dir=norm(sub(mouseWorld, transformBase));
        const far1=add(transformBase, scl(dir, 100000));
        const far2=add(transformBase, scl(dir,-100000));
        const s1=toScreen(far1), s2=toScreen(far2);
        ctx.moveTo(s1.x,s1.y); ctx.lineTo(s2.x,s2.y);
      } else {
        ctx.moveTo(b.x,b.y); ctx.lineTo(m.x,m.y);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // for rotate step 3, also draw the fixed reference arm (base -> ref dir)
      if(transformTool==='rotate' && transformStep===3){
        const refEnd=add(transformBase, {x:Math.cos(transformRefAng)*len(sub(mouseWorld,transformBase)), y:Math.sin(transformRefAng)*len(sub(mouseWorld,transformBase))});
        const rs=toScreen(refEnd);
        ctx.strokeStyle='rgba(255,230,128,.35)'; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(b.x,b.y); ctx.lineTo(rs.x,rs.y); ctx.stroke(); ctx.setLineDash([]);
      }
      // readout
      ctx.fillStyle='#dce6f5'; ctx.font='12px sans-serif';
      let label='';
      if(transformTool==='move'){
        const d=sub(mouseWorld,transformBase);
        const dist=len(d);
        label='Δ '+d.x.toFixed(1)+', '+d.y.toFixed(1)+' | '+dist.toFixed(1)+' mm';
        if(transformTyped!==''){ label='➜ '+transformTyped+' mm (yo\'nalishni bosing/Enter)'; }
      }
      else if(transformTool==='scale'){
        if(transformStep===2){ label='referens: '+len(sub(mouseWorld,transformBase)).toFixed(1)+' mm'; }
        else { const f=(len(sub(mouseWorld,transformBase))/(transformRefLen||1)); label='× '+f.toFixed(3); }
      }
      else if(transformTool==='rotate'){
        if(transformStep===2){ label='boshlang\'ich yo\'nalish'; }
        else { const a=(Math.atan2(mouseWorld.y-transformBase.y,mouseWorld.x-transformBase.x)-(transformRefAng||0))*180/Math.PI; label=a.toFixed(1)+'°'; }
      }
      else if(transformTool==='mirror'){ label='Mirror o\'qi'; }
      ctx.fillText(label, m.x+10, m.y-10);
    }
  }

  // ---- snap indicator ----
  if(appMode==='draw' && hoverSnap){
    const s = toScreen(hoverSnap.point);
    ctx.strokeStyle='#ffe680'; ctx.lineWidth=2; ctx.fillStyle='rgba(255,230,128,.15)';
    if(hoverSnap.type==='endpoint'){ ctx.beginPath(); ctx.rect(s.x-6,s.y-6,12,12); ctx.fill(); ctx.stroke(); }
    else if(hoverSnap.type==='midpoint'){ ctx.beginPath(); ctx.moveTo(s.x,s.y-7); ctx.lineTo(s.x+7,s.y+6); ctx.lineTo(s.x-7,s.y+6); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if(hoverSnap.type==='center'){ ctx.beginPath(); ctx.arc(s.x,s.y,7,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(s.x,s.y,1.5,0,Math.PI*2); ctx.fill(); }
    else if(hoverSnap.type==='intersection'){ ctx.beginPath(); ctx.moveTo(s.x-6,s.y-6); ctx.lineTo(s.x+6,s.y+6); ctx.moveTo(s.x+6,s.y-6); ctx.lineTo(s.x-6,s.y+6); ctx.stroke(); }
    else if(hoverSnap.type==='perpendicular'){ ctx.beginPath(); ctx.moveTo(s.x-6,s.y+6); ctx.lineTo(s.x-6,s.y-6); ctx.lineTo(s.x+2,s.y-6); ctx.moveTo(s.x-6,s.y); ctx.lineTo(s.x,s.y); ctx.lineTo(s.x,s.y-6); ctx.stroke(); }
    else if(hoverSnap.type==='parallel'){ ctx.beginPath(); ctx.moveTo(s.x-7,s.y-4); ctx.lineTo(s.x+7,s.y-4); ctx.moveTo(s.x-7,s.y+4); ctx.lineTo(s.x+7,s.y+4); ctx.stroke(); }
    else if(hoverSnap.type==='grid'){ ctx.strokeStyle='#5ee1ff'; ctx.beginPath(); ctx.moveTo(s.x-6,s.y); ctx.lineTo(s.x+6,s.y); ctx.moveTo(s.x,s.y-6); ctx.lineTo(s.x,s.y+6); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(s.x,s.y,6,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    ctx.font='10px sans-serif'; ctx.fillStyle='#ffe680';
    ctx.fillText(hoverSnap.type, s.x+9, s.y+16);
  }

  // ---- dimensions (measurement annotations) ----
  drawDimensions();
  if(typeof drawTexts==='function') drawTexts();   // matn annotatsiyalari
  if(typeof drawPastePreview==='function') drawPastePreview();   // joylashtirish ko'rinishi
  drawOffsetPreview();
  drawStretchOverlay();

  if(selecting){
    const crossingNow = selCur.x < selStart.x;
    if(appMode==='draw'){
      ctx.strokeStyle = crossingNow ? 'rgba(110,231,168,.9)' : 'rgba(110,231,168,.9)';
      ctx.fillStyle = 'rgba(110,231,168,.18)';
      ctx.setLineDash(crossingNow ? [5,4] : []);
    } else {
      ctx.strokeStyle='rgba(94,225,255,.8)'; ctx.fillStyle='rgba(94,225,255,.12)';
      ctx.setLineDash(crossingNow ? [5,4] : []);
    }
    ctx.lineWidth=1.5;
    const x=Math.min(selStart.x,selCur.x), y=Math.min(selStart.y,selCur.y);
    const w=Math.abs(selCur.x-selStart.x), h=Math.abs(selCur.y-selStart.y);
    ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h);
    ctx.setLineDash([]);
  }
}

function drawTo(node){
  const target = toScreen(node);
  if(!node.arc){ ctx.lineTo(target.x,target.y); return; }
  const O = node.arc;
  const c = toScreen({x:O.cx,y:O.cy});
  const r = Math.max(0.01, Math.abs(O.r*view.scale));
  const fromWorld = node.from;
  const a1w = Math.atan2(fromWorld.y-O.cy, fromWorld.x-O.cx);
  const a2w = Math.atan2(node.y-O.cy, node.x-O.cx);
  const startAngle = -a1w, endAngle = -a2w;
  ctx.arc(c.x, c.y, r, startAngle, endAngle, O.ccw);
}
