/* ==========================================================================
   js/tools/dim-assoc.js
   ASSOTSIATIV O'LCHOV (AutoCAD kabi): o'lchov nuqtasi shakl uchiga yoki
   qirrasiga (o'rtasi, istalgan nuqtasi) qo'yilgan bo'lsa — shakl Stretch,
   grip, ko'chirish, burish, masshtab bilan o'zgarganda o'lchov ham ergashadi
   va qiymati o'zi yangilanadi (masalan, shkaf 300 → 400 mm).

   Qanday ishlaydi:
   • Yaratishda o'lchov nuqtasi qaysi shaklga tegishli ekani eslab qolinadi
     (d.b1, d.b2 … — shakl uid). Bu bir joyda ikki shakl uchi ustma-ust
     bo'lsa ham to'g'ri shaklni tanlash uchun.
   • Har o'zgarishda (pushHistory) oldingi holat bilan solishtiriladi:
     nuqta eski uchga to'g'ri kelsa — uchning yangi joyiga; to'g'ri qirrada
     bo'lsa — qirradagi o'sha nisbatga (t) ko'chadi. O'lchov chizig'i joyi
     (place) faqat butun o'lchov bir xil siljiganda birga siljiydi.
   • Stretch paytida jonli: sudrayotganda o'lchov ham o'zgarib turadi,
     Esc — hammasi joyiga qaytadi.
   Magnitsiz (bo'sh joyga) qo'yilgan nuqta bog'lanmaydi — joyida qoladi.

   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi (dimension.js dan keyin).
   ========================================================================== */

const DIM_ASSOC_TOL = 1e-3;   // mm — magnit nuqtalari aniq tushadi

// Shaklning tayanch nuqtalari: grip (uch) lar; aylana — markaz + chorak nuqtalar; yoy — uch nuqta + markaz.
function dimDefPts(s){
  if(!s) return [];
  if(s.kind==='circle' && s.center) return [s.center].concat(s.grips||[]);
  if(s.kind==='arc' && s.arcA && s.arcMid && s.arcB){
    const out=[s.arcA, s.arcMid, s.arcB];
    const c=(typeof circleFrom3Pts==='function') ? circleFrom3Pts(s.arcA, s.arcMid, s.arcB) : null;
    if(c) out.push({x:c.x, y:c.y});
    return out;
  }
  return (s.grips && s.grips.length) ? s.grips : (s.points||[]);
}
// To'g'ri qirralar (indekslar juftligi) — yoy bo'lagi (segMeta) va aylana/yoy bundan mustasno.
function dimStraightSegs(s, n){
  if(!s || s.kind==='circle' || s.kind==='arc' || n<2) return [];
  const out=[], meta=s.grips && s.segMeta;
  for(let i=0;i<n-1;i++){ if(!meta || meta[i+1]==='straight') out.push([i,i+1]); }
  if(s.closed && n>2 && !meta) out.push([n-1,0]);
  return out;
}
const dimNear=(a,b)=>Math.abs(a.x-b.x)<=DIM_ASSOC_TOL && Math.abs(a.y-b.y)<=DIM_ASSOC_TOL;
function dimSegParam(P,A,B){   // P AB kesmada bo'lsa — t (0..1), aks holda null
  const ex=B.x-A.x, ey=B.y-A.y, L=ex*ex+ey*ey; if(L<1e-12) return null;
  const t=((P.x-A.x)*ex+(P.y-A.y)*ey)/L; if(t<-1e-9||t>1+1e-9) return null;
  const qx=A.x+ex*t, qy=A.y+ey*t; return Math.hypot(P.x-qx, P.y-qy)<=DIM_ASSOC_TOL ? t : null;
}
// P nuqtaga tegishli bog'lanish (shakl s ichida): {k:'v',i} — uch, {k:'e',i,j,t} — qirra
function dimAttachIn(P, s){
  const D=dimDefPts(s);
  for(let i=0;i<D.length;i++) if(dimNear(P,D[i])) return {k:'v', i};
  for(const [i,j] of dimStraightSegs(s, D.length)){ const t=dimSegParam(P, D[i], D[j]); if(t!==null) return {k:'e', i, j, t}; }
  return null;
}
function dimAttachPos(a, D){
  if(a.k==='v') return D[a.i] ? {x:D[a.i].x, y:D[a.i].y} : null;
  const A=D[a.i], B=D[a.j]; if(!A||!B) return null;
  return {x:A.x+(B.x-A.x)*a.t, y:A.y+(B.y-A.y)*a.t};
}

// Eski va yangi shakllarni juftlash: uid bo'yicha; uid yo'q bo'lsa — soni o'zgarmagan bo'lsa tartib bo'yicha.
function dimPairShapes(prev, cur){
  const byUid=new Map(); cur.forEach(s=>{ if(s && s.uid) byUid.set(s.uid, s); });
  const same=prev.length===cur.length;
  return prev.map((p,i)=>{
    if(p && p.uid) return byUid.get(p.uid) || null;
    return same ? cur[i] : null;
  });
}

// Bitta o'lchov nuqtasini yangilaydi; bind — yaratishda eslab qolingan shakl uid si.
function dimFollowPt(P, bind, prev, pairs){
  let vMoved=null, vStay=false, eMoved=null, eStay=false, bound=null;
  for(let i=0;i<prev.length;i++){
    const o=prev[i], c=pairs[i]; if(!o) continue;
    const a=dimAttachIn(P, o); if(!a) continue;
    let N=null;
    if(c){ const Do=dimDefPts(o), Dc=dimDefPts(c); if(Do.length===Dc.length) N=dimAttachPos(a, Dc); }
    if(!N) continue;   // shakl o'chirilgan yoki tuzilishi o'zgargan — bu shakl bo'yicha ergashilmaydi
    const moved=!dimNear(N,P);
    if(bind && o.uid===bind){ bound=moved?N:P; break; }
    if(a.k==='v'){ if(moved){ if(!vMoved) vMoved=N; } else vStay=true; }
    else { if(moved){ if(!eMoved) eMoved=N; } else eStay=true; }
  }
  if(bound) return bound;
  if(vMoved) return vMoved;      // uch siljigan — ergashadi (Stretch ramkasiga tushgan uch)
  if(vStay) return P;
  if(eMoved) return eMoved;
  return P;
}
const dimSame=(a,b)=>Math.abs(a.x-b.x)<1e-9 && Math.abs(a.y-b.y)<1e-9;
function dimShiftPlace(d, olds, news){
  // butun o'lchov bir xil siljigan bo'lsa (ko'chirish) — o'lchov chizig'i ham birga; aks holda (Stretch) chiziq joyida
  if(!d.place || !olds.length) return;
  const dx=news[0].x-olds[0].x, dy=news[0].y-olds[0].y; if(Math.abs(dx)<1e-9 && Math.abs(dy)<1e-9) return;
  for(let i=1;i<olds.length;i++){ if(Math.abs((news[i].x-olds[i].x)-dx)>1e-6 || Math.abs((news[i].y-olds[i].y)-dy)>1e-6) return; }
  d.place={x:d.place.x+dx, y:d.place.y+dy};
}
// Aylana/yoy uzunligi o'lchovi: markaz va radiusi mos kelgan aylana/yoy bo'yicha
function dimFollowArc(d, prev, pairs){
  for(let i=0;i<prev.length;i++){
    const o=prev[i], c=pairs[i]; if(!o||!c) continue;
    if(d.full && o.kind==='circle' && o.center && c.center && Math.abs(o.radius-d.r)<=DIM_ASSOC_TOL && dimNear(o.center,{x:d.cx,y:d.cy})){
      if(dimSame(o.center,c.center) && Math.abs(o.radius-c.radius)<1e-9) return;
      const dx=c.center.x-d.cx, dy=c.center.y-d.cy;
      d.cx=c.center.x; d.cy=c.center.y; d.r=c.radius; d.arcLen=2*Math.PI*c.radius;
      if(d.place) d.place={x:d.place.x+dx, y:d.place.y+dy}; return;
    }
    if(!d.full && o.kind==='arc' && c.kind==='arc' && typeof circleFrom3Pts==='function'){
      const oc=circleFrom3Pts(o.arcA,o.arcMid,o.arcB); if(!oc || Math.abs(oc.r-d.r)>DIM_ASSOC_TOL || !dimNear(oc,{x:d.cx,y:d.cy})) continue;
      if(dimSame(o.arcA,c.arcA)&&dimSame(o.arcMid,c.arcMid)&&dimSame(o.arcB,c.arcB)) return;
      const segs=(typeof shapeToSegs==='function'&&typeof coalesceSegs==='function')?coalesceSegs(shapeToSegs(c)):[];
      const sg=segs.find(s=>s.t==='A'), ai=sg&&typeof segArcInfo==='function'?segArcInfo(sg):null;
      const nc=circleFrom3Pts(c.arcA,c.arcMid,c.arcB); if(!nc) return;
      const dx=nc.x-d.cx, dy=nc.y-d.cy;
      d.cx=nc.x; d.cy=nc.y; d.r=nc.r;
      if(ai){ d.a0=ai.a0; d.sweep=ai.sweep; d.arcLen=Math.abs(ai.sweep)*ai.r; }
      if(d.place) d.place={x:d.place.x+dx, y:d.place.y+dy}; return;
    }
  }
}
const DIM_KEYS={h:['p1','p2'], v:['p1','p2'], aligned:['p1','p2'], angular:['center','a','b']};
// prev — oldingi holat shakllari (compact yoki to'liq), cur — hozirgi; dims — o'zgartiriladigan o'lchovlar
function dimAssocFollow(dims, prev, cur){
  if(!dims || !dims.length || !prev || !cur) return false;
  const pairs=dimPairShapes(prev, cur);
  let any=false;
  for(let i=0;i<prev.length;i++){ const o=prev[i], c=pairs[i]; if(!o) continue; if(!c){any=true;continue}
    const Do=dimDefPts(o), Dc=dimDefPts(c); if(Do.length!==Dc.length){any=true;continue}
    for(let k=0;k<Do.length;k++) if(!dimSame(Do[k],Dc[k])){any=true;break} if(any) break }
  if(!any) return false;   // shakllar o'zgarmagan — tez chiqish
  let changed=false;
  for(const d of dims){
    if(d.kind==='arclen'){ const b=JSON.stringify(d); dimFollowArc(d, prev, pairs); if(JSON.stringify(d)!==b) changed=true; continue; }
    const keys=DIM_KEYS[d.kind]; if(!keys) continue;
    const olds=[], news=[];
    keys.forEach((k,ki)=>{ const P=d[k]; if(!P) return; const N=dimFollowPt(P, d['b'+(ki+1)], prev, pairs); olds.push(P); news.push(N); });
    if(olds.every((P,i)=>dimSame(P,news[i]))) continue;
    dimShiftPlace(d, olds, news);
    keys.forEach((k,ki)=>{ if(d[k]) d[k]={x:news[ki].x, y:news[ki].y}; });
    changed=true;
  }
  return changed;
}

// Yaratishda: har nuqta uchun shu nuqtada uchi/qirrasi bo'lgan shakl (tanlangan — ustun; aks holda eng yuqoridagisi) eslab qolinadi.
function dimAssocBind(d){
  if(!d || typeof drawnLines==='undefined') return;
  const keys=DIM_KEYS[d.kind]; if(!keys) return;
  // Avval o'lchovning HAMMA nuqtalari tegishli bo'lgan shakl (ya'ni o'lchanayotgan obyekt) — yonma-yon shkaflarning umumiy burchagi
  // bo'lsa ham to'g'ri shaklga bog'lanadi
  let whole=null, wScore=-1;
  drawnLines.forEach((s,i)=>{ if(!s || s.hidden) return; if(!keys.every(k=>!d[k] || dimAttachIn(d[k], s))) return;
    const sc=(s.selected?1000000:0)+i; if(sc>wScore){ wScore=sc; whole=s; } });
  if(whole && typeof ensureUid==='function'){ const u=ensureUid(whole); keys.forEach((k,ki)=>{ if(d[k]) d['b'+(ki+1)]=u; }); return; }
  keys.forEach((k,ki)=>{
    const P=d[k]; if(!P) return; let best=null, bestScore=-1;
    drawnLines.forEach((s,i)=>{
      if(!s || s.hidden) return; const a=dimAttachIn(P, s); if(!a) return;
      const score=(s.selected?1000000:0)+(a.k==='v'?500000:0)+i;
      if(score>bestScore){ bestScore=score; best=s; }
    });
    if(best && typeof ensureUid==='function') d['b'+(ki+1)]=ensureUid(best);
  });
}

// pushHistory dan oldin chaqiriladi: oldingi tarix holati bilan solishtirib o'lchovlarni yangilaydi.
let dimAssocSkipOnce=false;   // Stretch jonli yangilagan bo'lsa — qayta qo'llanmaydi
function dimAssocSync(prevSnap){
  if(dimAssocSkipOnce){ dimAssocSkipOnce=false; return; }
  if(!prevSnap || typeof dimensions==='undefined' || !dimensions.length || typeof drawnLines==='undefined') return;
  try{ dimAssocFollow(dimensions, prevSnap.drawnLines||[], drawnLines); }catch(err){ console.warn('dim-assoc:', err.message); }
}
// Stretch jonli ko'rinishi: base — Stretch boshidagi shakllar (stretchSnap)
let dimLive=null;
let gripDimBase=null;   // grip sudrash boshidagi shakllar (o'lchov bo'lsa) — o'lchov jonli ergashadi
function dimAssocLive(base){
  if(typeof dimensions==='undefined' || !base) return;
  if(!dimLive || dimLive.base!==base) dimLive={base, dims:JSON.parse(JSON.stringify(dimensions))};
  if(!dimLive.dims.length) return;
  const ds=JSON.parse(JSON.stringify(dimLive.dims));
  try{ dimAssocFollow(ds, base, drawnLines); }catch(err){ console.warn('dim-assoc:', err.message); return; }
  dimensions=ds; dimAssocSkipOnce=true;
}
// Stretch tugadi (tasdiq yoki Esc): shakllarning yakuniy holatiga moslab, jonli holat tozalanadi
function dimAssocLiveEnd(){
  if(!dimLive) return; const L=dimLive; dimLive=null;
  if(!L.dims.length){ dimAssocSkipOnce=false; return; }
  const ds=JSON.parse(JSON.stringify(L.dims));
  try{ dimAssocFollow(ds, L.base, drawnLines); dimensions=ds; }catch(err){ console.warn('dim-assoc:', err.message); }
  dimAssocSkipOnce=false;
}
