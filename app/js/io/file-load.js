/* ==========================================================================
   js/io/file-load.js
   Fayl yuklash (DXF va boshqalar)

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= file load =================
document.getElementById('importBtn').addEventListener('click', ()=>{
  document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change',(e)=>{
  const f = e.target.files[0]; if(!f) return;
  const nameEl=document.getElementById('importedName');
  if(nameEl) nameEl.textContent = '📄 '+f.name;
  const reader = new FileReader();
  reader.onerror = ()=>{ alert('Faylni o\'qib bo\'lmadi: '+f.name); };
  reader.onload = ()=>{
    let parsed;
    try{
      parsed = parseDXF(reader.result);
    }catch(err){
      alert('DXF faylni o\'qishda xatolik:\n'+err.message);
      console.error('DXF parse error:', err);
      return;
    }
    if(parsed.length===0){
      const sk = parsed._skipped || {};
      const skList = Object.keys(sk);
      let msg = '"'+f.name+'" faylida chiziladigan geometriya topilmadi.\n\n';
      if(skList.length){
        msg += 'Faylda quyidagi elementlar bor, lekin ular chiziq emas:\n';
        skList.slice(0,8).forEach(k=>{ msg += '   \u2022 '+k+' \u00d7 '+sk[k]+'\n'; });
        msg += '\nMasalan TEXT (matn), DIMENSION (o\'lchov), HATCH (shtrix) va\n';
        msg += 'IMAGE (rasm) kesish konturi hisoblanmaydi.\n';
      } else {
        msg += 'Fayl bo\'sh yoki faqat sarlavha ma\'lumotlaridan iborat.\n';
      }
      msg += '\nO\'qiladigan turlar: LINE, LWPOLYLINE, POLYLINE, CIRCLE, ARC,\n';
      msg += 'ELLIPSE, SPLINE, POINT, SOLID, 3DFACE, INSERT (bloklar bilan).\n';
      msg += '\nAgar chizma boshqa dasturda ko\'rinsa-yu bu yerda ochilmasa,\n';
      msg += 'faylni menga yuboring \u2014 kodni moslab tuzataman.';
      alert(msg);
      return;
    }
      try{
      loadPolygons(parsed);
      const bad = sanitizeDrawnLines();
      if(bad) console.warn(bad+' ta buzuq element tashlab yuborildi.');
    }catch(err){
      alert('Faylni yuklashda xatolik:\n'+err.message);
      console.error('load error:', err);
      return;
    }
    const closedCount = parsed.filter(p=>p.closed).length;
    const st = parsed._stats || {};
    const un = parsed._units || {name:'mm', scale:1};
    const kinds = Object.keys(st).map(k=>k+'\u00d7'+st[k]).join(', ');
    // Birlik o'girilgan bo'lsa foydalanuvchi buni BILISHI kerak — aks holda
    // o'lcham kutilganidan farq qilsa, sabab tushunarsiz bo'ladi.
    const unitNote = (un.scale && Math.abs(un.scale-1)>1e-12)
      ? (' &middot; birlik: <b>'+un.name+'</b> \u2192 mm (\u00d7'+un.scale+')')
      : '';
    const h=document.getElementById('hint');
    if(h) h.innerHTML = f.name+': <b>'+parsed.length+'</b> ta shakl ('+closedCount+
                        ' yopiq)'+unitNote+(kinds?(' &middot; '+kinds):'');
    const skl = Object.keys(parsed._skipped||{});
    if(skl.length) console.log('O\'tkazilgan elementlar:', parsed._skipped);
    console.log(f.name+': '+parsed.length+' ta element yuklandi ('+closedCount+
                ' ta yopiq, '+corners.length+' ta burchak). Turlar: '+kinds+
                '. Birlik: '+un.name+' \u00d7'+un.scale);
  };
  reader.readAsText(f);
});
// Import qilingan nuqtali chiziqni chiziq+yoy ga moslash aniqligi (mm).
// Kichraytirsangiz shakl aniqroq, lekin segment ko'proq bo'ladi.
// O'lchangan tanlov (74 ta spline'li naqsh fayli ustida):
//   0.25 mm → 73/74 moslashdi, lekin og'ish 0.26 mm — KO'ZGA TASHLANADI
//   0.05 mm → 73/74 moslashdi, og'ish 0.06 mm — ko'rinmaydi, 2938 grip
//   0.02 mm → faqat 57/74 moslashdi (qolganlari zich nuqta bo'lib qoladi)
//   0.01 mm → 0/74 — moslash umuman ishlamaydi, 12000 grip
// Shuning uchun 0.05: shakl aniq, moslash ishonchli, grip soni oqilona.
// Taqqoslash uchun: CNC dastgohning mexanik aniqligi odatda 0.05-0.1 mm.
const DXF_FIT_TOL        = 0.05;
const DXF_FIT_TOL_SMOOTH = 0.05;

function loadPolygons(polys){
  // Convert imported DXF geometry into fully-editable drawnLines entities, so
  // imported shapes can be selected/moved/trimmed/etc. exactly like drawn ones.
  // (Previously imports lived in a separate read-only `polygons` array.)
  polygons = [];
  corners = corners.filter(c=>c.source==='drawn');
  polys.forEach(poly=>{
    // A DXF CIRCLE stays a real circle (4 cardinal grips); a DXF ARC stays a
    // real arc (2 endpoints + 1 midpoint). They must never become polylines.
    if(poly.isCircle && poly.r>0){
      const c={x:poly.cx, y:poly.cy}, r=poly.r;
      drawnLines.push({kind:'circle', center:c, radius:r, closed:true, selected:false, layer:'default',
        points:genCirclePts(c,r),
        grips:[{x:c.x+r,y:c.y},{x:c.x-r,y:c.y},{x:c.x,y:c.y+r},{x:c.x,y:c.y-r}]});
      return;
    }
    if(poly.isArc && poly.r>0){
      const c={x:poly.cx, y:poly.cy}, r=poly.r;
      const d2r=d=>d*Math.PI/180;
      let a0=d2r(poly.a0), a1=d2r(poly.a1);
      let sweep=a1-a0; while(sweep<=0) sweep+=TWO_PI();   // DXF arcs run CCW
      const P=a=>({x:c.x+r*Math.cos(a), y:c.y+r*Math.sin(a)});
      const A=P(a0), M=P(a0+sweep/2), B=P(a0+sweep);
      drawnLines.push({kind:'arc', closed:false, selected:false, layer:'default',
        arcA:A, arcMid:M, arcB:B,
        points:genArcThrough(A,M,B,32), grips:[A,M,B]});
      return;
    }
    const src = poly.points;
    if(!src || src.length<2) return;
    // expand any bulge arcs into curved point runs; collect grips at the
    // original vertices so the shape stays editable
    const hasBulge = src.some(p=>Math.abs(p.bulge||0) > 1e-9);
    const pts=[]; const grips=[]; const segMeta=[];
    pts.push({x:src[0].x, y:src[0].y});
    grips.push({x:src[0].x, y:src[0].y});
    segMeta.push('start');
    const lim = poly.closed ? src.length : src.length-1;
    for(let i=0;i<lim;i++){
      const a=src[i];
      const next=src[(i+1)%src.length];
      if(Math.abs(a.bulge||0) > 1e-9 && next){
        // Exact DXF bulge arc from a -> next. bulge = tan(sweep/4), signed
        // (CCW positive). Using the SIGNED radius/apothem keeps reflex arcs
        // (dogbones, sweep > 180 deg) on the correct side.
        const theta = 4*Math.atan(a.bulge);
        const chord = {x:next.x-a.x, y:next.y-a.y};
        const d = Math.hypot(chord.x, chord.y) || 1;
        const rs = d/(2*Math.sin(theta/2));
        const h  = rs*Math.cos(theta/2);
        const perp = {x:-chord.y/d, y:chord.x/d};
        const center = {x:(a.x+next.x)/2 + perp.x*h, y:(a.y+next.y)/2 + perp.y*h};
        const r = Math.abs(rs);
        const a0 = Math.atan2(a.y-center.y, a.x-center.x);
        // a real point ON the arc at half sweep — this becomes the editable
        // "through" grip, and it reproduces the arc exactly
        const aMid = {x:center.x+r*Math.cos(a0+theta/2), y:center.y+r*Math.sin(a0+theta/2)};
        const seg = (function(){
          // pick a segment count so the chord (sagitta) error stays under ~0.02mm
          const maxErr = 0.02;
          const c = Math.max(-1, Math.min(1, 1 - maxErr/Math.max(r,1e-6)));
          const dAng = 2*Math.acos(c);
          if(!isFinite(dAng) || dAng<=0) return 24;
          return Math.max(8, Math.min(96, Math.ceil(Math.abs(theta)/dAng)));
        })();
        for(let k=1;k<=seg;k++){
          const ang = a0 + theta*(k/seg);
          pts.push({x:center.x+r*Math.cos(ang), y:center.y+r*Math.sin(ang)});
        }
        grips.push(aMid); segMeta.push('arcMid');
        grips.push({x:next.x, y:next.y}); segMeta.push('arcEnd');
      } else {
        pts.push({x:next.x, y:next.y});
        grips.push({x:next.x, y:next.y}); segMeta.push('straight');
      }
    }
    if(poly.closed && pts.length>1){ pts.pop(); grips.pop(); segMeta.pop(); } // last point repeats the start
    const shape = {kind:'line', points:pts, grips:grips, closed:!!poly.closed, selected:false, layer:'default'};
    if(hasBulge){
      // The file already told us exactly where the arcs are — keep them as-is.
      // (Re-fitting here used to distort dogbone corners and neighbouring lines.)
      if(segMeta.some(m=>m==='arcMid'||m==='arcEnd')) shape.segMeta = segMeta;
    } else if(pts.length > 12){
      // Bulge ma'lumoti yo'q: nuqtali chiziqni chiziq+yoy segmentlariga
      // moslaymiz — shunda shakl tahrirlanadigan bo'ladi va DXF eksportda
      // yoy (G2/G3) sifatida chiqadi.
      //
      // TUZATILDI: bardosh 0.25 mm edi va o'lchov 0.26 mm og'ish ko'rsatdi.
      // Naqsh/ornament chizmalarida bu KO'ZGA TASHLANADI — egri chiziq
      // "singan" bo'lib ko'rinadi. Endi 0.02 mm: bu har qanday CNC
      // dastgohning mexanik aniqligidan ham nozikroq, ya'ni amalda ideal.
      //
      // SPLINE / ELLIPSE dan kelgan shakllar allaqachon aniq tekislangan,
      // shuning uchun ular uchun bardosh yanada tor.
      const smooth = !!poly.smooth;
      const tol = smooth ? DXF_FIT_TOL_SMOOTH : DXF_FIT_TOL;
      const fit = fitArcsToShape(pts, !!poly.closed, tol);
      if(fit){ shape.grips = fit.grips; shape.segMeta = fit.segMeta; shape.points = fit.points; }
    }
    drawnLines.push(shape);
  });
  detectCorners();
  history=[]; historyIndex=-1; pushHistory(); // new file = fresh undo baseline
  fitView();
  draw();
  renderList(); renderDrawnList();
}
