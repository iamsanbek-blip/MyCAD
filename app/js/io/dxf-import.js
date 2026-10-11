/* ==========================================================================
   js/io/dxf-import.js
   DXF O'QISH — barcha keng tarqalgan element turlari

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= DXF parsing =================
//
// QAYTA YOZILDI. Ilgari faqat 5 ta element o'qilardi:
//     LWPOLYLINE, POLYLINE, LINE, CIRCLE, ARC
//
// Internetdan olinadigan bezak/naqsh chizmalari esa deyarli har doim
// SPLINE (egri chiziq) dan iborat — ular Illustrator, CorelDRAW, Inkscape
// kabi dasturlardan chiqadi. Shuning uchun bunday fayllar
// "chizilgan element topilmadi" xatosini berardi.
//
// Endi qo'llab-quvvatlanadi:
//   LINE · LWPOLYLINE · POLYLINE (2D/3D, bulge bilan) · CIRCLE · ARC
//   ELLIPSE · SPLINE (NURBS, De Boor) · POINT · SOLID · TRACE · 3DFACE
//   INSERT — BLOCK ichidagi geometriya joylashuv / burilish / masshtab
//            bilan ochiladi. Ichma-ich bloklar va MINSERT massivi ham.

const DXF_ARC_SEG    = 48;   // to'liq aylana uchun segment soni
const DXF_SPLINE_SEG = 8;    // spline ning har bir oralig'i uchun bo'lak

// ---- (kod, qiymat) juftlariga ajratish -----------------------------------
function dxfPairs(text){
  const lines = text.split(/\r\n|\r|\n/);
  const pairs = [];
  for(let i=0; i+1<lines.length; i++){
    const codeStr = lines[i].trim();
    if(codeStr === '') continue;
    const code = parseInt(codeStr, 10);
    if(isNaN(code) || String(code) !== codeStr) continue;  // kod emas — o'tkazamiz
    pairs.push([code, lines[i+1]]);
    i++;                                                   // qiymat qatorini yutamiz
  }
  return pairs;
}

// ---- yordamchi geometriya ------------------------------------------------
function dxfCirclePts(cx, cy, r){
  const n = DXF_ARC_SEG, pts = [];
  for(let k=0;k<n;k++){
    const a=(k/n)*Math.PI*2;
    pts.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a), bulge:0});
  }
  return pts;
}
function dxfArcPts(cx, cy, r, a0deg, a1deg){
  let a0=a0deg*Math.PI/180, a1=a1deg*Math.PI/180;
  while(a1 < a0) a1 += Math.PI*2;
  const sweep=a1-a0;
  const n=Math.max(6, Math.ceil(Math.abs(sweep)/(Math.PI*2)*DXF_ARC_SEG));
  const pts=[];
  for(let k=0;k<=n;k++){
    const a=a0+sweep*(k/n);
    pts.push({x:cx+r*Math.cos(a), y:cy+r*Math.sin(a), bulge:0});
  }
  return pts;
}
// markaz + katta o'q VEKTORI + kichik/katta nisbati + parametr oralig'i
function dxfEllipsePts(cx, cy, mx, my, ratio, t0, t1){
  const a=Math.hypot(mx,my), b=a*ratio, rot=Math.atan2(my,mx);
  let s=isFinite(t0)?t0:0, e=isFinite(t1)?t1:Math.PI*2;
  while(e < s) e += Math.PI*2;
  const full = Math.abs((e-s)-Math.PI*2) < 1e-9;
  const n=Math.max(8, Math.ceil((e-s)/(Math.PI*2)*DXF_ARC_SEG));
  const cosR=Math.cos(rot), sinR=Math.sin(rot), pts=[];
  for(let k=0;k<=n;k++){
    if(full && k===n) break;
    const t=s+(e-s)*(k/n);
    const ex=a*Math.cos(t), ey=b*Math.sin(t);
    pts.push({x:cx+ex*cosR-ey*sinR, y:cy+ex*sinR+ey*cosR, bulge:0});
  }
  return {pts, closed:full};
}

// ---- SPLINE (NURBS) — De Boor algoritmi ----------------------------------
function dxfDeBoor(deg, ctrl, knots, weights, u){
  const n = ctrl.length - 1;
  let k = deg;
  while(k < n && knots[k+1] <= u) k++;
  const d=[];
  for(let j=0;j<=deg;j++){
    const idx=k-deg+j;
    const w = weights ? (weights[idx]||1) : 1;
    d.push({x:ctrl[idx].x*w, y:ctrl[idx].y*w, w:w});
  }
  for(let r=1;r<=deg;r++){
    for(let j=deg;j>=r;j--){
      const idx=k-deg+j;
      const den=knots[idx+deg-r+1]-knots[idx];
      const a = den>1e-12 ? (u-knots[idx])/den : 0;
      d[j]={x:(1-a)*d[j-1].x+a*d[j].x,
            y:(1-a)*d[j-1].y+a*d[j].y,
            w:(1-a)*d[j-1].w+a*d[j].w};
    }
  }
  const p=d[deg];
  const w = Math.abs(p.w)>1e-12 ? p.w : 1;
  return {x:p.x/w, y:p.y/w, bulge:0};
}
// Egri chiziqni MOSLASHUVCHAN tekislash: tekis joyda kam nuqta, keskin
// burilishda ko'p. Sobit qadam bilan bir spline 500 nuqta berardi va
// 74 ta spline 100 000 nuqtaga aylanib, dastur sekinlashardi.
// Mezon: vatar (chord) dan og'ish `tol` dan oshmasin.
function dxfAdaptive(f, u0, u1, tol, depth, out){
  const p0=f(u0), p1=f(u1), um=(u0+u1)/2, pm=f(um);
  const dx=p1.x-p0.x, dy=p1.y-p0.y, L2=dx*dx+dy*dy;
  let dev;
  if(L2<1e-18) dev=Math.hypot(pm.x-p0.x, pm.y-p0.y);
  else{
    const t=((pm.x-p0.x)*dx+(pm.y-p0.y)*dy)/L2;
    dev=Math.hypot(pm.x-(p0.x+dx*t), pm.y-(p0.y+dy*t));
  }
  if(depth>=14 || dev<=tol){ out.push(p1); return; }
  dxfAdaptive(f,u0,um,tol,depth+1,out);
  dxfAdaptive(f,um,u1,tol,depth+1,out);
}
// Tekislash aniqligi — MILLIMETRDA belgilanadi.
//
// TUZATILDI: ilgari bardosh shaklning o'z o'lchamiga nisbatan olinardi va
// FAYL BIRLIGIDA hisoblanardi. Natijada santimetrli faylda u 10 barobar,
// duymlida 25 barobar qo'polroq bo'lib qolardi — naqsh "singan" ko'rinardi.
// Endi qaysi birlikda bo'lishidan qat'i nazar natija bir xil aniqlikda.
const DXF_TESS_MM = 0.01;    // egri chiziqdan og'ish, mm
let dxfUnitScale = 1;        // fayl birligi → mm (parseDXF boshida o'rnatiladi)

function dxfTol(pts){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const p of pts){ x0=Math.min(x0,p.x); y0=Math.min(y0,p.y);
                       x1=Math.max(x1,p.x); y1=Math.max(y1,p.y); }
  const diag=Math.hypot(x1-x0, y1-y0);
  // asosiy mezon — mutlaq aniqlik (mm), lekin juda mayda shaklda cheksiz
  // bo'linib ketmasligi uchun pastki chegara qo'yamiz
  const abs = DXF_TESS_MM / (dxfUnitScale || 1);
  const rel = (isFinite(diag) && diag>0) ? diag*1e-5 : 0;
  return Math.max(Math.min(abs, diag>0 ? diag*0.02 : abs), rel, 1e-12);
}

function dxfSplinePts(ctrl, fit, knots, weights, degree, flags){
  const closed = (flags & 1) === 1;
  if(ctrl.length < 2){
    if(fit.length >= 2) return {pts: fit.map(p=>({x:p.x,y:p.y,bulge:0})), closed};
    return null;
  }
  let deg = degree || 3;
  if(deg < 1) deg = 1;
  if(deg > ctrl.length-1) deg = ctrl.length-1;

  const need = ctrl.length + deg + 1;
  let kn = (knots && knots.length===need) ? knots.slice() : null;
  if(!kn){
    // tugun vektori yo'q/nosoz — bir tekis (clamped) yasaymiz
    kn=[];
    for(let i=0;i<need;i++){
      if(i<=deg) kn.push(0);
      else if(i>=ctrl.length) kn.push(ctrl.length-deg);
      else kn.push(i-deg);
    }
  }
  const u0=kn[deg], u1=kn[ctrl.length];
  if(!(u1>u0)) return {pts: ctrl.map(p=>({x:p.x,y:p.y,bulge:0})), closed};

  const eps=(u1-u0)*1e-9;
  const f=(u)=>dxfDeBoor(deg, ctrl, kn, weights, Math.min(u, u1-eps));
  const tol=dxfTol(ctrl);
  const pts=[f(u0)];
  // har bir tugun oralig'ini alohida bo'lamiz — burchaklar yo'qolmasin
  const brk=[u0];
  for(let k=deg+1;k<ctrl.length;k++) if(kn[k]>brk[brk.length-1]+eps) brk.push(kn[k]);
  if(brk[brk.length-1] < u1-eps) brk.push(u1);
  for(let k=0;k+1<brk.length;k++) dxfAdaptive(f, brk[k], brk[k+1], tol, 0, pts);
  const out=pts.filter(p=>isFinite(p.x)&&isFinite(p.y));
  return out.length>=2 ? {pts:out, closed} : null;
}

// ---- bitta elementning barcha juftlarini o'qish --------------------------
function dxfReadEntity(pairs, i){
  const e = {type:(pairs[i][1]||'').trim(), layer:'0', name:null,
             p10:[], p11:[], p12:[], p13:[], k40:[], w41:[], vals:{},
             verts:[], flags:0};
  i++;
  let c10=null, c11=null, c12=null, c13=null;
  let seen41=false, seen42=false;
  while(i<pairs.length && pairs[i][0]!==0){
    const [c,raw]=pairs[i];
    const v=(raw||'').trim();
    const f=parseFloat(v);
    switch(c){
      case 2:  e.name=v; break;                    // INSERT → blok nomi
      case 8:  e.layer=v; break;
      case 10: c10={x:f,y:0,bulge:0}; e.p10.push(c10); break;
      case 20: if(c10) c10.y=f; break;
      case 11: c11={x:f,y:0}; e.p11.push(c11); break;
      case 21: if(c11) c11.y=f; break;
      case 12: c12={x:f,y:0}; e.p12.push(c12); break;
      case 22: if(c12) c12.y=f; break;
      case 13: c13={x:f,y:0}; e.p13.push(c13); break;
      case 23: if(c13) c13.y=f; break;
      case 40: e.k40.push(f); break;               // radius / knot / masshtab
      case 41: e.w41.push(f); if(!seen41){e.vals[41]=f; seen41=true;} break;
      case 42: if(c10) c10.bulge=f||0; if(!seen42){e.vals[42]=f; seen42=true;} break;
      case 43: e.vals[43]=f; break;
      case 44: e.colSp=f; break;                   // MINSERT ustun oralig'i
      case 45: e.rowSp=f; break;                   // MINSERT qator oralig'i
      case 50: e.a50=f; break;
      case 51: e.a51=f; break;
      case 70: e.flags=parseInt(v,10)||0; break;
      case 71: e.n71=parseInt(v,10)||0; break;
      case 72: e.n72=parseInt(v,10)||0; break;
      case 73: e.n73=parseInt(v,10)||0; break;
      default: if(!(c in e.vals)) e.vals[c]=f;
    }
    i++;
  }
  return [e, i];
}

// POLYLINE dan keyin keluvchi VERTEX larni yig'ib, SEQEND gacha o'qiydi
function dxfReadPolylineRun(pairs, i, head){
  while(i<pairs.length){
    const v=(pairs[i][1]||'').trim();
    if(pairs[i][0]!==0){ i++; continue; }
    if(v==='SEQEND'){ const [,ni]=dxfReadEntity(pairs,i); return ni; }
    if(v!=='VERTEX') return i;                    // kutilmagan — to'xtaymiz
    const [vt, ni]=dxfReadEntity(pairs,i); i=ni;
    const p=vt.p10[0];
    if(p) head.verts.push({x:p.x, y:p.y, bulge:p.bulge||0});
  }
  return i;
}

// ---- BIRLIK: $INSUNITS ni millimetrga o'girish ---------------------------
// Internetdan olingan chizmalar ko'pincha DUYM yoki SANTIMETRDA bo'ladi.
// Ilgari bu e'tiborga olinmasdi va 600 mm lik panel 23 mm bo'lib ochilardi.
const DXF_UNIT_MM = {
  0:1,          // birliksiz — mm deb qabul qilamiz
  1:25.4,       // duym
  2:304.8,      // fut
  4:1,          // millimetr
  5:10,         // santimetr
  6:1000,       // metr
  8:0.0000254,  // mikroduym
  9:0.0254,     // mil
  10:914.4,     // yard
  12:0.000001,  // nanometr
  13:0.001,     // mikron
  14:100,       // detsimetr
  15:10000,     // dekametr
  16:100000,    // gektometr
};
const DXF_UNIT_NAME = {0:'birliksiz',1:'duym',2:'fut',4:'mm',5:'sm',6:'m',
                       8:'mikroduym',9:'mil',10:'yard',12:'nm',13:'mikron',
                       14:'dm',15:'dam',16:'hm'};
function dxfUnits(pairs){
  for(let i=0;i+3<pairs.length;i++){
    if(pairs[i][0]===9 && (pairs[i][1]||'').trim()==='$INSUNITS'){
      const v=parseInt((pairs[i+1][1]||'').trim(),10);
      if(isFinite(v)) return v;
      const v2=parseInt((pairs[i+2][1]||'').trim(),10);
      if(isFinite(v2)) return v2;
    }
  }
  return 0;
}

// ---- asosiy o'qish -------------------------------------------------------
function parseDXF(text){
  if(text.slice(0,22).indexOf('AutoCAD Binary DXF') !== -1){
    throw new Error('Bu binary DXF fayl. Iltimos ASCII (matnli) DXF formatida saqlab qayta yuklang.');
  }
  const pairs = dxfPairs(text);
  // Birlikni ELEMENTLARDAN OLDIN aniqlaymiz — tekislash aniqligi shunga bog'liq
  const unitCode0 = dxfUnits(pairs);
  dxfUnitScale = DXF_UNIT_MM[unitCode0] > 0 ? DXF_UNIT_MM[unitCode0] : 1;

  const polygons = [];
  const blocks = {};
  const stats = {};
  const skipped = {};

  // --- 1-bosqich: BLOCKS va ENTITIES ni ajratamiz ---
  let section=null, i=0, topEnts=[];
  let bName=null, bEnts=null, bBase={x:0,y:0};

  while(i<pairs.length){
    const [c,raw]=pairs[i];
    const v=(raw||'').trim();

    if(c===0 && v==='SECTION'){
      section = (i+1<pairs.length && pairs[i+1][0]===2) ? (pairs[i+1][1]||'').trim() : null;
      i+=2; continue;
    }
    if(c===0 && v==='ENDSEC'){ section=null; i++; continue; }

    if(section==='BLOCKS'){
      if(c===0 && v==='BLOCK'){
        const [h,ni]=dxfReadEntity(pairs,i);
        bName=h.name; bEnts=[]; bBase=h.p10[0]?{x:h.p10[0].x,y:h.p10[0].y}:{x:0,y:0};
        i=ni; continue;
      }
      if(c===0 && v==='ENDBLK'){
        if(bName) blocks[bName]={ents:bEnts||[], base:bBase};
        bName=null; bEnts=null;
        const [,ni]=dxfReadEntity(pairs,i); i=ni; continue;
      }
      if(c===0 && bEnts){
        const [ent,ni]=dxfReadEntity(pairs,i); i=ni;
        if(ent.type==='POLYLINE') i=dxfReadPolylineRun(pairs,i,ent);
        bEnts.push(ent); continue;
      }
      i++; continue;
    }

    if(section==='ENTITIES' && c===0){
      const [ent,ni]=dxfReadEntity(pairs,i); i=ni;
      if(ent.type==='POLYLINE') i=dxfReadPolylineRun(pairs,i,ent);
      topEnts.push(ent); continue;
    }
    i++;
  }

  // --- 2-bosqich: geometriyaga aylantirish ---
  const ID={a:1,b:0,c:0,d:1,e:0,f:0};
  const tp=(T,p)=>({x:T.a*p.x+T.c*p.y+T.e, y:T.b*p.x+T.d*p.y+T.f, bulge:p.bulge||0});
  const mul=(A,B)=>({
    a:A.a*B.a+A.b*B.c, b:A.a*B.b+A.b*B.d,
    c:A.c*B.a+A.d*B.c, d:A.c*B.b+A.d*B.d,
    e:A.e*B.a+A.f*B.c+B.e, f:A.e*B.b+A.f*B.d+B.f,
  });
  const bump=t=>{ stats[t]=(stats[t]||0)+1; };
  // smooth=true → shakl aniq egri chiziqdan (SPLINE/ELLIPSE/ARC) kelgan,
  // demak uni qayta moslashda bardosh torroq bo'lishi kerak
  function push(pts, closed, T, smooth){
    if(!pts || pts.length<2) return;
    const out=pts.map(p=>tp(T,p)).filter(p=>isFinite(p.x)&&isFinite(p.y));
    if(out.length>=2) polygons.push({points:out, closed:!!closed, smooth:!!smooth});
  }

  function emit(ent, T, depth){
    const V=ent.vals;
    switch(ent.type){
      case 'LINE': {
        const a=ent.p10[0], b=ent.p11[0];
        if(!a||!b) return;
        push([{x:a.x,y:a.y,bulge:0},{x:b.x,y:b.y,bulge:0}], false, T); bump('LINE'); return;
      }
      case 'LWPOLYLINE': {
        const vs=ent.p10.map(p=>({x:p.x,y:p.y,bulge:p.bulge||0}));
        if(vs.length<2) return;
        push(vs, (ent.flags&1)===1 && vs.length>=3, T); bump('LWPOLYLINE'); return;
      }
      case 'POLYLINE': {
        const vs=ent.verts;
        if(vs.length<2) return;
        push(vs, (ent.flags&1)===1 && vs.length>=3, T); bump('POLYLINE'); return;
      }
      case 'CIRCLE': {
        const c0=ent.p10[0], r=ent.k40[0];
        if(!c0||!(r>0)) return;
        push(dxfCirclePts(c0.x,c0.y,r), true, T, true); bump('CIRCLE'); return;
      }
      case 'ARC': {
        const c0=ent.p10[0], r=ent.k40[0];
        if(!c0||!(r>0)) return;
        push(dxfArcPts(c0.x,c0.y,r,ent.a50||0,ent.a51||0), false, T, true); bump('ARC'); return;
      }
      case 'ELLIPSE': {
        const c0=ent.p10[0], mj=ent.p11[0], ratio=ent.k40[0];
        if(!c0||!mj||!(ratio>0)) return;
        const r=dxfEllipsePts(c0.x,c0.y,mj.x,mj.y,ratio,
                              V[41]!=null?V[41]:0, V[42]!=null?V[42]:Math.PI*2);
        push(r.pts, r.closed, T, true); bump('ELLIPSE'); return;
      }
      case 'SPLINE': {
        const ctrl=ent.p10.map(p=>({x:p.x,y:p.y}));
        const fit =ent.p11.map(p=>({x:p.x,y:p.y}));
        const w = ent.w41.length===ctrl.length ? ent.w41 : null;
        const s=dxfSplinePts(ctrl, fit, ent.k40, w, ent.n71||3, ent.flags||0);
        if(!s) return;
        push(s.pts, s.closed, T, true); bump('SPLINE'); return;
      }
      case 'SOLID': case 'TRACE': case '3DFACE': {
        const a=ent.p10[0], b=ent.p11[0], c=ent.p12[0], d=ent.p13[0];
        // SOLID/TRACE da 3-4 burchak tartibi almashgan
        const q=(ent.type==='3DFACE') ? [a,b,c,d] : [a,b,d||c,c];
        const pts=q.filter(Boolean).map(p=>({x:p.x,y:p.y,bulge:0}));
        if(pts.length<3) return;
        push(pts, true, T); bump(ent.type); return;
      }
      case 'POINT': {
        const p=ent.p10[0]; if(!p) return;
        const d=0.5;
        push([{x:p.x-d,y:p.y,bulge:0},{x:p.x+d,y:p.y,bulge:0}], false, T);
        push([{x:p.x,y:p.y-d,bulge:0},{x:p.x,y:p.y+d,bulge:0}], false, T);
        bump('POINT'); return;
      }
      case 'INSERT': {
        if(depth>12) return;
        const blk = ent.name ? blocks[ent.name] : null;
        if(!blk){ skipped['INSERT (blok topilmadi)']=(skipped['INSERT (blok topilmadi)']||0)+1; return; }
        const p=ent.p10[0]||{x:0,y:0};
        const sx=(V[41]!=null && V[41]!==0)?V[41]:1;
        const sy=(V[42]!=null && V[42]!==0)?V[42]:1;
        const rot=(ent.a50||0)*Math.PI/180;
        const cos=Math.cos(rot), sin=Math.sin(rot);
        const cols=Math.max(1, ent.n71||1), rows=Math.max(1, ent.n72||1);
        const cSp=ent.colSp||0, rSp=ent.rowSp||0;
        for(let r=0;r<rows;r++) for(let cc=0;cc<cols;cc++){
          const ox=p.x + cc*cSp*cos - r*rSp*sin;
          const oy=p.y + cc*cSp*sin + r*rSp*cos;
          const L={ a:sx*cos, b:sx*sin, c:-sy*sin, d:sy*cos,
                    e:ox-(blk.base.x*sx*cos - blk.base.y*sy*sin),
                    f:oy-(blk.base.x*sx*sin + blk.base.y*sy*cos) };
          const M=mul(L,T);
          blk.ents.forEach(be=>emit(be,M,depth+1));
        }
        bump('INSERT'); return;
      }
      default:
        if(ent.type && ent.type!=='SEQEND' && ent.type!=='ATTRIB' && ent.type!=='ATTDEF')
          skipped[ent.type]=(skipped[ent.type]||0)+1;
        return;
    }
  }

  topEnts.forEach(e=>emit(e, ID, 0));

  // --- 3-bosqich: birlikni millimetrga keltirish ---
  const unitCode = unitCode0;
  const scale = dxfUnitScale;
  if(Math.abs(scale-1) > 1e-12){
    for(const poly of polygons)
      for(const p of poly.points){ p.x*=scale; p.y*=scale; }
  }

  // --- yopiq konturlarni aniqlash ---
  // Ba'zi dasturlar spline ni "yopiq" deb belgilamaydi, lekin uning boshi va
  // oxiri ustma-ust tushadi. CNC uchun bu farq muhim, shuning uchun
  // o'zimiz tekshiramiz.
  for(const poly of polygons){
    if(poly.closed || poly.points.length<4) continue;
    const a=poly.points[0], b=poly.points[poly.points.length-1];
    const d=Math.hypot(b.x-a.x, b.y-a.y);
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const q of poly.points){ x0=Math.min(x0,q.x); y0=Math.min(y0,q.y);
                                 x1=Math.max(x1,q.x); y1=Math.max(y1,q.y); }
    const diag=Math.hypot(x1-x0,y1-y0);
    if(diag>0 && d < diag*1e-3){ poly.points.pop(); poly.closed=true; }
  }

  polygons._stats = stats;
  polygons._skipped = skipped;
  polygons._units = {code:unitCode, name:DXF_UNIT_NAME[unitCode]||('kod '+unitCode), scale};
  return polygons;
}
