/* ==========================================================================
   js/tools/nest-raster.js
   HAQIQIY SHAKL bo'yicha joylashtirish (true-shape nesting)

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== TRUE-SHAPE NESTING =====
//
// MUAMMO:
//   MaxRects algoritmi detalni TO'RTBURCHAK CHEGARASI (bounding box) bilan
//   joylashtiradi. Yarim oysimon, C-simon yoki ichi o'yiq detallarda bu juda
//   isrofgarchilik: oyning ichidagi bo'sh joyga boshqa detal sig'sa ham,
//   algoritm buni ko'rmaydi.
//
// YECHIM:
//   Har bir detal HAQIQIY konturi bo'yicha piksel maskaga aylantiriladi.
//   Keyin "skyline" (ufq chizig'i) usuli bilan joylashtiriladi: har bir
//   detal pastga, mavjud detallar ustiga TEGIB turguncha tushiriladi.
//   Shu tariqa o'yiq joylarga keyingi detal kirib o'tiradi.
//
//   Bu to'liq NFP (no-fit polygon) emas, lekin amalda listning 10-25%
//   gacha tejalishini beradi va tez ishlaydi.

const RASTER_CELL_MM = 4;        // bitta katak = 4 mm (aniqlik / tezlik muvozanati)

// ---- detal konturlarini olish --------------------------------------------
function unitPolygons(u){
  const polys=[];
  u.shapes.forEach(s=>{
    const pts = s.points && s.points.length>2 ? s.points : null;
    if(pts) polys.push(pts);
  });
  return polys;
}

// ---- burish (0 / 90 / 180 / 270) ----------------------------------------
function rotPt(p, quarter, cx, cy){
  const dx=p.x-cx, dy=p.y-cy;
  if(quarter===0) return {x:cx+dx,  y:cy+dy};
  if(quarter===1) return {x:cx-dy,  y:cy+dx};
  if(quarter===2) return {x:cx-dx,  y:cy-dy};
  return              {x:cx+dy,  y:cy-dx};
}

// ---- detalni piksel maskaga aylantirish ----------------------------------
// Qaytadi: {w,h,mask,bottom,top,cells} — mask[y*w+x] = 1 (band)
function rasterizeUnit(u, quarter, cell, gapMM){
  const polys = unitPolygons(u);
  if(!polys.length) return null;
  const b=u.bbox, cx=(b.x0+b.x1)/2, cy=(b.y0+b.y1)/2;

  // burilgandan keyingi chegara
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  const rp = polys.map(pts=>pts.map(p=>{
    const q=rotPt(p,quarter,cx,cy);
    x0=Math.min(x0,q.x); y0=Math.min(y0,q.y);
    x1=Math.max(x1,q.x); y1=Math.max(y1,q.y);
    return q;
  }));
  if(!isFinite(x0)) return null;

  const pad = Math.ceil(gapMM/cell);                 // oraliq uchun kengaytma
  const w = Math.ceil((x1-x0)/cell) + 1 + pad*2;
  const h = Math.ceil((y1-y0)/cell) + 1 + pad*2;
  if(w<1 || h<1 || w*h > 4000000) return null;

  const raw = new Uint8Array(w*h);
  // skanlar bilan to'ldirish (even-odd)
  for(let gy=0; gy<h; gy++){
    const wy = y0 + (gy-pad+0.5)*cell;
    const xs=[];
    rp.forEach(pts=>{
      const n=pts.length;
      for(let i=0;i<n;i++){
        const a=pts[i], c=pts[(i+1)%n];
        if((a.y<=wy && c.y>wy) || (c.y<=wy && a.y>wy)){
          xs.push(a.x + (wy-a.y)/(c.y-a.y)*(c.x-a.x));
        }
      }
    });
    if(xs.length<2) continue;
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2){
      let gA=Math.floor((xs[k]-x0)/cell)+pad;
      let gB=Math.ceil((xs[k+1]-x0)/cell)+pad;
      gA=Math.max(0,gA); gB=Math.min(w-1,gB);
      for(let gx=gA; gx<=gB; gx++) raw[gy*w+gx]=1;
    }
  }

  // oraliqni ta'minlash uchun maskani `pad` katakka kengaytiramiz
  const mask = pad>0 ? new Uint8Array(w*h) : raw;
  if(pad>0){
    for(let gy=0; gy<h; gy++) for(let gx=0; gx<w; gx++){
      if(!raw[gy*w+gx]) continue;
      const yA=Math.max(0,gy-pad), yB=Math.min(h-1,gy+pad);
      const xA=Math.max(0,gx-pad), xB=Math.min(w-1,gx+pad);
      for(let y=yA;y<=yB;y++) for(let x=xA;x<=xB;x++) mask[y*w+x]=1;
    }
  }

  // ustun profillari: eng past va eng baland band katak
  const bottom=new Int32Array(w).fill(-1), top=new Int32Array(w).fill(-1);
  let cells=0;
  for(let gx=0; gx<w; gx++){
    for(let gy=0; gy<h; gy++){
      if(mask[gy*w+gx]){
        if(bottom[gx]<0) bottom[gx]=gy;
        top[gx]=gy; cells++;
      }
    }
  }
  return {w,h,mask,bottom,top,cells,
          offX:x0-pad*cell, offY:y0-pad*cell,   // maska (0,0) ning dunyo o'rni
          quarter};
}

// ---- DETAL ICHIDAGI BO'SH TO'RTBURCHAKLAR --------------------------------
//
// G'oya: MaxRects detalni to'rtburchak chegara bilan joylashtiradi va
// chegara ichidagi bo'sh joy YO'QOLADI. Yarim oysimon detalda bu chegara
// yuzasining yarmigacha bo'lishi mumkin.
//
// Shuning uchun detal qo'yilgandan keyin uning KONTURIDAN TASHQARIDAGI,
// lekin chegara ichidagi bo'sh to'rtburchaklarni qaytarib bo'sh joylar
// ro'yxatiga qo'shamiz. Endi mayda detallar oyning ichiga tushadi.
//
// "Gistogrammadagi eng katta to'rtburchak" usuli bilan eng yirik 3 tasini
// olamiz — mayda parchalar amalda foyda bermaydi, faqat sekinlashtiradi.

function largestEmptyRect(mask, w, h, used){
  const heights=new Int32Array(w);
  let best=null;
  for(let y=0; y<h; y++){
    for(let x=0; x<w; x++){
      const busy = mask[y*w+x] || used[y*w+x];
      heights[x] = busy ? 0 : heights[x]+1;
    }
    // gistogrammadagi eng katta to'rtburchak (stek usuli)
    const st=[];
    for(let x=0; x<=w; x++){
      const cur = x<w ? heights[x] : 0;
      while(st.length && heights[st[st.length-1]] >= cur){
        const hgt=heights[st.pop()];
        const left = st.length ? st[st.length-1]+1 : 0;
        const area = hgt*(x-left);
        if(hgt>0 && (!best || area>best.area)){
          best={x0:left, y0:y-hgt+1, w:x-left, h:hgt, area};
        }
      }
      st.push(x);
    }
  }
  return best;
}

// Qaytadi: [{x,y,w,h}] — detal chegarasiga NISBATAN, millimetrda
function partFreeRects(unit, cellMM, gapMM, maxCount){
  const R = rasterizeUnit(unit, 0, cellMM, gapMM/2);
  if(!R) return [];
  const used=new Uint8Array(R.w*R.h);
  const out=[];
  const minCells = Math.max(2, Math.ceil(40/cellMM));   // 40 mm dan kichigi kerak emas
  for(let k=0; k<(maxCount||3); k++){
    const r=largestEmptyRect(R.mask, R.w, R.h, used);
    if(!r || r.w<minCells || r.h<minCells) break;
    for(let y=r.y0; y<r.y0+r.h; y++)
      for(let x=r.x0; x<r.x0+r.w; x++) used[y*R.w+x]=1;
    // maska koordinatasidan detal chegarasiga
    const bx = R.offX + r.x0*cellMM - unit.bbox.x0;
    const by = R.offY + r.y0*cellMM - unit.bbox.y0;
    out.push({x:bx, y:by, w:r.w*cellMM, h:r.h*cellMM});
  }
  return out;
}
