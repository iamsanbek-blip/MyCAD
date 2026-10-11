/* ==========================================================================
   js/io/raster.js
   PNG eksport

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== PNG export =====
function exportPNG(){
  const pad=40;
  // Build the same modified node paths used for on-screen rendering and DXF, so
  // dogbone / T-bone / fillet reliefs are included (not the raw click points).
  const drawnModified = buildDrawnModifiedPaths();
  // helper: turn a node list (which may carry .arc segments) into a flat point run
  function nodesToPoints(nodes){
    if(!nodes||!nodes.length) return [];
    const out=[{x:nodes[0].x,y:nodes[0].y}];
    const n=nodes.length; const lim = nodes.closed ? n : n-1;
    for(let i=1;i<=lim;i++){
      const cur=nodes[i%n];
      if(cur && cur.arc && cur.from){
        // sample the arc from previous point through to cur
        const a=cur.arc; const prev=out[out.length-1];
        const a0=Math.atan2(prev.y-a.cy, prev.x-a.cx);
        const a1=Math.atan2(cur.y-a.cy, cur.x-a.cx);
        let sweep=a.sweep; let dir=a.ccw?1:-1;
        const steps=Math.max(4, Math.ceil((a.sweep)/(Math.PI/16)));
        for(let k=1;k<=steps;k++){
          const ang=a0 + dir*sweep*(k/steps);
          out.push({x:a.cx+a.r*Math.cos(ang), y:a.cy+a.r*Math.sin(ang)});
        }
      } else {
        out.push({x:cur.x,y:cur.y});
      }
    }
    return out;
  }
  // gather each drawn shape's render points (modified where applicable)
  const shapesToDraw=[];
  drawnLines.forEach((l,idx)=>{
    if(l.hidden) return;
    const isSmooth = l.kind==='circle' || l.kind==='arc' || (!l.kind && l.center);
    let pts;
    if(isSmooth){ pts=l.points; }
    else { const nodes=drawnModified[idx]; pts = nodes ? nodesToPoints(nodes) : l.points; }
    if(pts && pts.length>=2) shapesToDraw.push({pts, closed:!!l.closed, color:shapeColor(l), filled:!!l.filled});
  });
  // also include imported polygons (modified)
  buildModifiedPaths().forEach(nodes=>{ const pts=nodesToPoints(nodes); if(pts.length>=2) shapesToDraw.push({pts, closed:!!nodes.closed, color:'#ffb454'}); });
  const textCount = (typeof texts!=='undefined') ? texts.length : 0;
  if(!shapesToDraw.length && dimensions.length===0 && textCount===0){ alert('Eksport qilinadigan chizma yo\'q.'); return; }
  // map a screen color to a print-friendly (dark, saturated) version so light
  // colors like yellow/cyan stay visible on white paper
  function printColor(hex){
    let h=hex.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
    let r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    // perceived luminance
    const lum=(0.299*r+0.587*g+0.114*b)/255;
    // if the color is light (would vanish on white), darken it strongly
    if(lum > 0.5){
      const f = 0.45; // darken factor
      r=Math.round(r*f); g=Math.round(g*f); b=Math.round(b*f);
    } else {
      // mildly darken mid colors too for crisp print
      const f=0.8; r=Math.round(r*f); g=Math.round(g*f); b=Math.round(b*f);
    }
    return 'rgb('+r+','+g+','+b+')';
  }
  // bounds (include dimensions' points too)
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  shapesToDraw.forEach(s=>s.pts.forEach(p=>{ minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y); }));
  dimensions.forEach(d=>{
    if(d.kind==='arclen'){
      [{x:d.cx-d.r,y:d.cy-d.r},{x:d.cx+d.r,y:d.cy+d.r},d.place].forEach(p=>{
        if(!p) return;
        minX=Math.min(minX,p.x); minY=Math.min(minY,p.y);
        maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y);
      });
      return;
    }
    [d.p1,d.p2,d.place,d.center,d.a,d.b].forEach(p=>{ if(p){ minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y); } });
  });
  // matn annotatsiyalari ham chegaraga kirsin, aks holda chetdagilari kesiladi
  if(typeof texts!=='undefined' && texts.length){
    texts.forEach(t=>{
      if(typeof layerOf==='function' && !layerOf(t).visible) return;
      const b=textWorldBounds(t);
      minX=Math.min(minX,b.x0); minY=Math.min(minY,b.y0);
      maxX=Math.max(maxX,b.x1); maxY=Math.max(maxY,b.y1);
    });
  }
  if(!isFinite(minX)){ alert('Eksport qilinadigan chizma yo\'q.'); return; }
  const w=maxX-minX||1, h=maxY-minY||1;
  const scale=Math.min(1600/w, 1600/h, 8);
  const cw=Math.ceil(w*scale)+pad*2, ch=Math.ceil(h*scale)+pad*2;
  const off=document.createElement('canvas'); off.width=cw; off.height=ch;
  const c=off.getContext('2d');
  c.fillStyle='#ffffff'; c.fillRect(0,0,cw,ch); // WHITE background for printing
  const tx=p=>({x:pad+(p.x-minX)*scale, y:ch-pad-(p.y-minY)*scale}); // flip Y
  shapesToDraw.forEach(s=>{
    const col=printColor(s.color);
    c.strokeStyle=col; c.lineWidth=2; c.lineJoin='round'; c.beginPath();
    const p0=tx(s.pts[0]); c.moveTo(p0.x,p0.y);
    for(let i=1;i<s.pts.length;i++){ const q=tx(s.pts[i]); c.lineTo(q.x,q.y); }
    if(s.closed) c.closePath();
    if(s.filled && s.closed){ c.fillStyle=col; c.fill(); }
    c.stroke();
  });
  // draw dimensions in dark grey so they print clearly
  if(dimensions.length){
    c.textAlign='center'; c.textBaseline='middle';
    const HALO = '#ffffff';                 // contrast halo drawn under everything
    const INK  = '#111111';                 // dimension ink
    dimensions.forEach(d=>{
      // same mm-based proportions as on screen, mapped to the export scale
      const Tpx=((d.textSize||dimTextSize())*scale);
      if(Tpx < 1) return;
      const AR=Tpx*DIM_RATIO.arrow, AW=Tpx*DIM_RATIO.arrowW;
      const OVER=Tpx*DIM_RATIO.over, GAP=Tpx*DIM_RATIO.gap, PAD=Tpx*DIM_RATIO.pad;
      const LW=Math.max(1, Tpx*DIM_RATIO.lw);
      c.font=Math.max(1,Tpx).toFixed(2)+'px sans-serif';
      // Every stroke is drawn twice: a thick light halo first, then the dark
      // ink on top, so dimensions stay readable over drawing lines.
      const stroke2=(fn)=>{
        c.lineCap='round'; c.lineJoin='round';
        c.strokeStyle=HALO; c.lineWidth=LW*3.2; fn();
        c.strokeStyle=INK;  c.lineWidth=LW;     fn();
      };
      const head=(s,ang)=>{
        const nx=Math.cos(ang),ny=Math.sin(ang),px=-ny,py=nx;
        const tri=()=>{ c.beginPath(); c.moveTo(s.x,s.y);
          c.lineTo(s.x-AR*nx+AW*px, s.y-AR*ny+AW*py);
          c.lineTo(s.x-AR*nx-AW*px, s.y-AR*ny-AW*py);
          c.closePath(); };
        tri(); c.strokeStyle=HALO; c.lineWidth=LW*3.2; c.stroke();
        tri(); c.fillStyle=INK; c.fill();
      };
      // Labels follow the dimension line and stay upright — identical to the
      // on-screen rendering, so the PNG matches what the user designed.
      const drawLabel=(text,mx,my,ang)=>{
        c.save();
        c.translate(mx,my);
        if(ang!=null){
          let ta=ang;
          if(ta>Math.PI/2 || ta<-Math.PI/2) ta+=Math.PI;   // keep text readable
          c.rotate(ta);
        }
        c.textAlign='center'; c.textBaseline='middle';
        // O'ZGARTIRILDI: ilgari matn ortiga KATTA OQ TO'RTBURCHAK to'ldirilardi
        // (c.fillRect) — u chizma chiziqlarini bekitib qo'yardi. Endi oq "halo"
        // faqat raqam/harf KONTURI bo'ylab yuguradi: avval qalin oq strokeText,
        // ustidan qora fillText. Chizma halo teshiklaridan ko'rinib turadi.
        c.lineJoin='round'; c.lineCap='round';
        c.strokeStyle=HALO; c.lineWidth=Math.max(1.5, Tpx*DIM_HALO_RATIO);
        c.strokeText(text, 0, -Tpx*0.08);
        c.strokeText(text, 0, -Tpx*0.08);   // ikkinchi o'tish — halo zichroq
        c.fillStyle=INK; c.fillText(text, 0, -Tpx*0.08);
        c.restore();
      };

      if(d.kind==='arclen'){
        const C=tx({x:d.cx,y:d.cy}), R=d.r*scale;
        stroke2(()=>{ c.beginPath();
          if(d.full) c.arc(C.x,C.y,R,0,Math.PI*2);
          else c.arc(C.x,C.y,R,-d.a0,-(d.a0+d.sweep), d.sweep>0);
          c.stroke(); });
        const am = d.full ? Math.PI/2 : (d.a0 + d.sweep/2);
        const M=tx({x:d.cx+d.r*Math.cos(am), y:d.cy+d.r*Math.sin(am)});
        const P=tx(d.place||{x:d.cx,y:d.cy});
        stroke2(()=>{ c.setLineDash([Tpx*0.3,Tpx*0.22]);
          c.beginPath(); c.moveTo(M.x,M.y); c.lineTo(P.x,P.y); c.stroke();
          c.setLineDash([]); });
        c.save();
        c.font=Tpx.toFixed(1)+'px sans-serif';
        c.textAlign='left'; c.textBaseline='middle';
        c.lineJoin='round'; c.lineCap='round';
        const label=(d.full?'O ':'~ ')+(d.arcLen).toFixed(d.prec!=null?d.prec:1)+' '+(d.unit||'mm');
        c.strokeStyle=HALO; c.lineWidth=Math.max(1.5, Tpx*DIM_HALO_RATIO);
        c.strokeText(label, P.x+Tpx*0.5, P.y); c.strokeText(label, P.x+Tpx*0.5, P.y);
        c.fillStyle=INK; c.fillText(label, P.x+Tpx*0.5, P.y);
        c.restore();
        return;
      }
      if(d.kind==='angular'){
        if(!d.center || !d.a || !d.b) return;
        // TUZATILDI: ilgari faqat A→C→B siniq chizig'i chizilardi, ekrandagi
        // NURLAR va YOY yo'q edi. Endi ekrandagi bilan bir xil.
        const C=tx(d.center), A=tx(d.a), B=tx(d.b), P=tx(d.place||d.b);
        const rS=Math.hypot(P.x-C.x, P.y-C.y) || Tpx*2;
        const a0=Math.atan2(A.y-C.y, A.x-C.x);
        const a1=Math.atan2(B.y-C.y, B.x-C.x);
        let diff=a1-a0;
        while(diff<=-Math.PI) diff+=Math.PI*2;
        while(diff>Math.PI)   diff-=Math.PI*2;
        stroke2(()=>{ c.beginPath();
          c.moveTo(C.x,C.y); c.lineTo(C.x+Math.cos(a0)*rS, C.y+Math.sin(a0)*rS); c.stroke(); });
        stroke2(()=>{ c.beginPath();
          c.moveTo(C.x,C.y); c.lineTo(C.x+Math.cos(a1)*rS, C.y+Math.sin(a1)*rS); c.stroke(); });
        stroke2(()=>{ c.beginPath(); c.arc(C.x,C.y,rS,a0,a0+diff,diff<0); c.stroke(); });
        // o'lchangan burchak DUNYO koordinatalarida (ekrandagidek)
        const w0=Math.atan2(d.a.y-d.center.y, d.a.x-d.center.x);
        const w1=Math.atan2(d.b.y-d.center.y, d.b.x-d.center.x);
        let wd=w1-w0;
        while(wd<=-Math.PI) wd+=Math.PI*2;
        while(wd>Math.PI)   wd-=Math.PI*2;
        const deg=Math.abs(wd*180/Math.PI);
        const midA=a0+diff/2;
        drawLabel(deg.toFixed(d.prec!=null?d.prec:1)+'°',
          C.x+Math.cos(midA)*(rS+Tpx*0.9), C.y+Math.sin(midA)*(rS+Tpx*0.9));
        return;
      }
      if(!d.p1||!d.p2) return;
      // TUZATILDI (joylashuv bug): ilgari bu yerda 'aligned' (hotkey D) o'lchov
      // uchun HECH QANDAY proyeksiya yo'q edi — chiziq to'g'ridan-to'g'ri p1→p2
      // orasiga chizilardi va `place` (foydalanuvchi bosgan uchinchi nuqta)
      // e'tiborsiz qolardi. Shuning uchun PNG'da o'lchov ekrandagidan boshqa
      // joyda chiqardi. Endi proyeksiya EKRANDAGI bilan aynan bir xil —
      // drawOneDimension() dagi projectOntoDimLine() mantiqi, DUNYO fazosida.
      const placeW = d.place || d.p2;
      let dirW;
      if(d.kind==='h')      dirW={x:1,y:0};
      else if(d.kind==='v') dirW={x:0,y:1};
      else { const dd=sub(d.p2,d.p1); const L=len(dd)||1; dirW={x:dd.x/L, y:dd.y/L}; }
      const projW=(pt)=>{
        if(d.kind==='h') return {x:pt.x, y:placeW.y};
        if(d.kind==='v') return {x:placeW.x, y:pt.y};
        const rel=sub(pt, placeW), tt=dot(rel, dirW);
        return {x:placeW.x+dirW.x*tt, y:placeW.y+dirW.y*tt};
      };
      const p1=tx(d.p1), p2=tx(d.p2);
      const a=tx(projW(d.p1)), b=tx(projW(d.p2));
      const ext=(sp,sdp)=>{ const dx=sdp.x-sp.x, dy=sdp.y-sp.y, L=Math.hypot(dx,dy);
        if(L<1e-6) return; const ux=dx/L, uy=dy/L;
        c.beginPath();
        c.moveTo(sp.x+ux*Math.min(GAP,L*0.4), sp.y+uy*Math.min(GAP,L*0.4));
        c.lineTo(sdp.x+ux*OVER, sdp.y+uy*OVER); };
      stroke2(()=>{ ext(p1,a); c.stroke(); });
      stroke2(()=>{ ext(p2,b); c.stroke(); });
      stroke2(()=>{ c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke(); });
      const ang=Math.atan2(b.y-a.y, b.x-a.x);
      head(a, ang+Math.PI); head(b, ang);
      // MEASURED VALUE — must match the on-screen rule exactly:
      // horizontal uses |dx|, vertical uses |dy|, aligned uses the true length.
      let value;
      if(d.kind==='h')      value = Math.abs(d.p2.x - d.p1.x);
      else if(d.kind==='v') value = Math.abs(d.p2.y - d.p1.y);
      else                  value = Math.hypot(d.p2.x-d.p1.x, d.p2.y-d.p1.y);
      const label = value.toFixed(d.prec!=null?d.prec:1) + (d.unit? (' '+d.unit) : '');
      drawLabel(label, (a.x+b.x)/2, (a.y+b.y)/2, ang);
    });
  }
  // ---- matn annotatsiyalari ----
  // Ekrandagi bilan bir xil qoida: balandlik REAL mm, halo harf konturi bo'ylab.
  if(typeof texts!=='undefined' && texts.length){
    texts.forEach(t=>{
      if(typeof layerOf==='function' && !layerOf(t).visible) return;
      const Tpx=(t.size||10)*scale;
      if(Tpx<1) return;
      const o=tx({x:t.x, y:t.y});
      const lines=String(t.text||'').split('\n');
      const ink=printColor(t.color || (typeof layerOf==='function' ? layerOf(t).color : '#111111') || '#111111');
      c.save();
      c.translate(o.x, o.y);
      c.rotate(-(t.rot||0)*Math.PI/180);   // eksportda ham Y teskari
      c.font=Tpx.toFixed(2)+'px sans-serif';
      c.textAlign='left'; c.textBaseline='top';
      c.lineJoin='round'; c.lineCap='round';
      lines.forEach((L,i)=>{
        const y=i*Tpx*(typeof TEXT_LINE_H!=='undefined'?TEXT_LINE_H:1.35);
        c.strokeStyle='#ffffff'; c.lineWidth=Math.max(1.5, Tpx*DIM_HALO_RATIO);
        c.strokeText(L,0,y); c.strokeText(L,0,y);
        c.fillStyle=ink; c.fillText(L,0,y);
      });
      c.restore();
    });
  }

  off.toBlob(blob=>{
    if(!blob){ alert('PNG yaratib bo\'lmadi.'); return; }
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='drawing.png';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{document.body.removeChild(a);}catch(e){} URL.revokeObjectURL(url); }, 1500);
  }, 'image/png');
}
