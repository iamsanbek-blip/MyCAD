/* ==========================================================================
   js/tools/panel3d-xlap.js  —  Modeling: kesishgan panellarni bir-biriga kiygizish (o'zaro o'yiq, «egg-crate» / cross-halving)
   DOM'siz sof hisob; panel3d.js undan foydalanadi: RugbyXLap.create({Wof, prof}).

   Ikki panel (istalgan burchakda, qiya ham) kesishsa: ikkala o'rta tekislik kesishgan chiziq L bo'ylab har panel profili qaysi
   oraliqda (λ) mavjudligi topiladi. Umumiy oraliq — kesishma:
     • X holat (bir uchi A ning chekkasi, ikkinchisi B niki) — yarim-yarim: har panelga o'z chekkasidan o'rtagacha o'yiq;
     • B butunlay A ichidan o'tadi — A ga B kesimi bo'yicha o'yiq, A ning yaqin chekkasiga ochiladi (yoki «teshik» rejimida yopiq kesik).
   O'yiq kengligi qalinlik va burchakdan aniq hisoblanadi (kesimning 4 burchagi, zazor bilan), qiya panelda o'yiq qiya bo'ladi.
   Ichki burchaklarga dogbone (freza Ø) qo'shiladi — CNC to'g'ri burchakni kesa olmaydi.
   ========================================================================== */
(function(root){
'use strict';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len=a=>Math.hypot(a[0],a[1],a[2]),
  nrm=a=>{const l=len(a);return l>1e-15?mul(a,1/l):a};
function area(P){let s=0;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];s+=a[0]*b[1]-b[0]*a[1]}return s/2}
function inPoly(P,x,y){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
function hull(P){const p=P.map(a=>[a[0],a[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]),cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=1e-9)lo.pop();lo.push(q)}
  for(let i=p.length-1;i>=0;i--){const q=p[i];while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=1e-9)up.pop();up.push(q)}
  up.pop();lo.pop();return lo.concat(up)}
/* S − C (Greiner–Hormann). Natija: ko'pburchaklar ro'yxati; null — chegaralar kesishmaydi; 'deg' — hal qilib bo'lmadi. */
function diff(S,C){for(let tr=0;tr<5;tr++){const r=gh(S,tr?C.map(p=>[p[0]+1e-5*tr*1.37,p[1]+1e-5*tr*.91]):C);if(r!=='deg')return r}return 'deg'}
function gh(S,C){
  const mk=P=>{const L=P.map(p=>({x:p[0],y:p[1],inter:false}));L.forEach((v,i)=>{v.next=L[(i+1)%L.length];v.prev=L[(i-1+L.length)%L.length]});return L[0]};
  const s=mk(S),c=mk(C),nn=v=>{let w=v.next;while(w.inter)w=w.next;return w};
  const ins=(v,a,b)=>{let cur=a.next;while(cur!==b&&cur.alpha<v.alpha)cur=cur.next;v.next=cur;v.prev=cur.prev;cur.prev.next=v;cur.prev=v};
  const E=1e-10;let n=0,sv=s;
  do{const s2=nn(sv);let cv=c;do{const c2=nn(cv);
    const dx1=s2.x-sv.x,dy1=s2.y-sv.y,dx2=c2.x-cv.x,dy2=c2.y-cv.y,den=dx1*dy2-dy1*dx2;
    if(Math.abs(den)>1e-14){const a=((cv.x-sv.x)*dy2-(cv.y-sv.y)*dx2)/den,b=((cv.x-sv.x)*dy1-(cv.y-sv.y)*dx1)/den;
      if(a>-E&&a<1+E&&b>-E&&b<1+E){if(a<E||a>1-E||b<E||b>1-E)return 'deg';
        const x=sv.x+a*dx1,y=sv.y+a*dy1,i1={x,y,inter:true,alpha:a},i2={x,y,inter:true,alpha:b};i1.nb=i2;i2.nb=i1;ins(i1,sv,s2);ins(i2,cv,c2);n++}}
    else{const cr=(cv.x-sv.x)*dy1-(cv.y-sv.y)*dx1;if(Math.abs(cr)<1e-9*Math.hypot(dx1,dy1)){const L2=dx1*dx1+dy1*dy1||1,t0=((cv.x-sv.x)*dx1+(cv.y-sv.y)*dy1)/L2,t1=((c2.x-sv.x)*dx1+(c2.y-sv.y)*dy1)/L2;if(Math.max(t0,t1)>E&&Math.min(t0,t1)<1-E)return 'deg'}}
    cv=c2}while(cv!==c);sv=s2}while(sv!==s);
  if(!n)return null;
  const mark=(start,P,flip)=>{let e=!inPoly(P,start.x,start.y);if(flip)e=!e;let v=start;do{if(v.inter){v.entry=e;e=!e}v=v.next}while(v!==start)};
  mark(s,C,true);mark(c,S,false);   // ayirish: subyekt belgilari teskari
  const out=[];
  for(;;){let st=null,w=s;do{if(w.inter&&!w.vis){st=w;break}w=w.next}while(w!==s);if(!st)break;
    const poly=[[st.x,st.y]];let cur=st,g=0;
    do{cur.vis=true;cur.nb.vis=true;
      if(cur.entry){do{cur=cur.next;poly.push([cur.x,cur.y])}while(!cur.inter)}else{do{cur=cur.prev;poly.push([cur.x,cur.y])}while(!cur.inter)}
      cur=cur.nb}while(!cur.vis&&++g<1e5);
    const l=poly[poly.length-1];if(Math.hypot(l[0]-poly[0][0],l[1]-poly[0][1])<1e-9)poly.pop();if(poly.length>=3)out.push(poly)}
  return out}
/* 2D: P0 + t·D chizig'ining ko'pburchak ichidagi oraliqlari [t0,t1] (juft-toq qoida) */
function lineIntervals(poly,P0,D){const ts=[],loops=Array.isArray(poly[0][0])?poly:[poly];   // bir nechta halqa (kontur + ichki kesiklar) — juft-toq
  for(const poly of loops)for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ex=b[0]-a[0],ey=b[1]-a[1],den=D[0]*ey-D[1]*ex;if(Math.abs(den)<1e-14)continue;
    const t=((a[0]-P0[0])*ey-(a[1]-P0[1])*ex)/den,s=((a[0]-P0[0])*D[1]-(a[1]-P0[1])*D[0])/den;if(s>=0&&s<1)ts.push(t)}
  ts.sort((x,y)=>x-y);const out=[];for(let i=0;i+1<ts.length;i+=2)if(ts[i+1]-ts[i]>1e-9)out.push([ts[i],ts[i+1]]);return out}
function circlePts(c,r,n=16){const o=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;o.push([c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)])}return o}

function create(G){
  const{Wof,prof}=G;
  const frame=p=>{const m=Wof(p),col=l=>[m[l],m[3+l],m[6+l]];return{u:col(0),v:col(1),n:col(2),c:[p.x,p.y,p.z],w:p.w,h:p.h,t:p.t}};
  const loops=p=>[prof(p),...(p.ops||[]).filter(o=>o.k==='c'&&o.th&&Array.isArray(o.pts)).map(o=>o.pts)];   // ichki kesiklar — material yo'q
  const toUV=(F,P)=>{const d=sub(P,F.c);return[dot(d,F.u)+F.w/2,dot(d,F.v)+F.h/2]};
  function bbox(p){const F=frame(p),pr=prof(p),mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
    for(const a of pr)for(const s of[-p.t/2,p.t/2]){const P=add(F.c,add(add(mul(F.u,a[0]-p.w/2),mul(F.v,a[1]-p.h/2)),mul(F.n,s)));for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],P[k]);mx[k]=Math.max(mx[k],P[k])}}return[mn,mx]}
  /* A va B kesishmalari. Har biri: {lo,hi (markaz chiziqda), sO, eO — qaysi panel chekkasi, ab — burchaklar ma'lumoti} */
  function crossings(A,B){
    const FA=frame(A),FB=frame(B);let L=cross(FA.n,FB.n);const sn=len(L);if(sn<.05)return[];L=mul(L,1/sn);   // ~3° dan kichik — parallel
    const cAB=dot(FA.n,FB.n),dA=dot(FA.n,FA.c),dB=dot(FB.n,FB.c),den=1-cAB*cAB;
    const X0=add(mul(FA.n,(dA-dB*cAB)/den),mul(FB.n,(dB-dA*cAB)/den)),eA=cross(FA.n,L),eB=cross(FB.n,L),PA=loops(A),PB=loops(B);
    const lineIn=(F,P,y)=>{const o=add(X0,y),P0=toUV(F,o),D=[dot(L,F.u),dot(L,F.v)];return lineIntervals(P,P0,D)};
    // kesim tekisligida nuqta (L ga ⟂): A dan sA, B dan sB masofada
    const corner=(sA,sB)=>{const o=(sB-sA*cAB)/dot(eA,FB.n);return add(mul(eA,o),mul(FA.n,sA))};
    const IA=lineIn(FA,PA,[0,0,0]),IB=lineIn(FB,PB,[0,0,0]),out=[];
    for(const a of IA)for(const b of IB){const lo=Math.max(a[0],b[0]),hi=Math.min(a[1],b[1]);if(hi-lo<.2)continue;
      out.push({A,B,FA,FB,L,X0,eA,eB,lo,hi,a,b,sO:a[0]>=b[0]?'A':'B',eO:a[1]<=b[1]?'A':'B',corner,lineIn,PA,PB})}
    return out}
  const pick=(list,lo,hi)=>{let best=null,bd=1e18;for(const iv of list){const ov=Math.min(iv[1],hi)-Math.max(iv[0],lo),d=ov>0?-ov:Math.max(iv[0]-hi,lo-iv[1]);if(d<bd){bd=d;best=iv}}return bd<60?best:null};
  /* Bitta kesishma uchun o'yiqlar rejasi: [{p, poly (panel 2D), hole}] */
  function planCrossing(x,o){
    const cl=o.cl||0,ext=3,mode=o.mode||'auto',{A,B,FA,FB,L,X0,corner,lineIn,PA,PB,lo,hi}=x,lm=(lo+hi)/2,res=[];
    const slotFor=(who,range)=>{   // who — o'yiladigan panel; range(Iown, Ioth) → [λ0, λ1] har burchakda
      const own=who==='A',F=own?FA:FB,Pown=own?PA:PB,Poth=own?PB:PA,to=own?B.t:A.t,tw=own?A.t:B.t,pts=[];
      const c0=[0,0,0],Io0=pick(lineIn(F,Pown,c0),lo,hi),Ix0=pick(lineIn(own?FB:FA,Poth,c0),lo,hi);
      for(const s1 of[-1,1])for(const s2 of[-1,1]){const sW=s1*tw/2,sO=s2*(to/2+cl),y=own?corner(sW,sO):corner(sO,sW);   // o'z qalinligi bo'yicha to'liq, sherik — zazor bilan
        // burchakda panel bo'lmasa (masalan sherik shu yuzada tugaydi) — markaz chiziq oralig'i: o'yiq baribir butun qalinlik bo'ylab kesiladi
        const Io=pick(lineIn(F,Pown,y),lo,hi)||Io0,Ix=pick(lineIn(own?FB:FA,Poth,y),lo,hi)||Ix0;if(!Io||!Ix)continue;const r=range(Io,Ix);if(!r||r[1]-r[0]<=0)continue;
        for(const t of r)pts.push(toUV(F,add(add(X0,y),mul(L,t))))}
      if(pts.length<6)return null;return hull(pts)};
    const P_=who=>who==='A'?A:B,full=who=>{const f=slotFor(who,(Io,Ix)=>[Math.max(Io[0]-ext,Ix[0]),Math.min(Io[1]+ext,Ix[1])]);return f?[{p:P_(who),poly:f}]:null};
    if(x.sO!==x.eO){   // X: yarim-yarim; bo'lmasa (masalan eski o'yiq yonida panel bo'linib ketsa) — biriga sherikning to'liq kesimi
      const half=[];for(const who of['A','B']){const st=x.sO===who,sl=slotFor(who,(Io)=>st?[Io[0]-ext,lm]:[lm,Io[1]+ext]);if(sl)half.push({p:P_(who),poly:sl})}
      res.options=[half.length===2?half:null,full('A'),full('B')].filter(Boolean);res.push(...(res.options[0]||[]))}
    else{const big=x.sO==='A'?'B':'A';   // kichigi (chekkalari ikkalasi ham uniki) kattasidan to'liq o'tadi — kattasiga o'yiq
      const near=(x.lo-(big==='A'?x.a:x.b)[0])<=((big==='A'?x.a:x.b)[1]-x.hi)?'start':'end';
      const st=slotFor(big,(Io,Ix)=>[Io[0]-ext,Ix[1]]),en=slotFor(big,(Io,Ix)=>[Ix[0],Io[1]+ext]),ex=slotFor(big,(Io,Ix)=>[Ix[0],Ix[1]]);
      // navbat bilan sinaladi (panelni ikkiga bo'lmaydigani olinadi): ochiq — yaqin chekkadan, keyin uzoq chekkadan, keyin aniq kesim (teshik/chekkaga tegsa — o'yiq)
      const alts=(mode==='hole'?[ex,near==='start'?st:en,near==='start'?en:st]:[near==='start'?st:en,near==='start'?en:st,ex]).filter(Boolean);
      if(alts.length)res.push({p:big==='A'?A:B,poly:alts[0],alts,hole:mode==='hole'});res.options=res.length?[res.slice()]:[]}
    return res}
  /* Panel profilidan o'yiqni ayirish (+ dogbone). Qaytaradi {pts} yoki {hole:pts} yoki {err} */
  function cut(p,poly,o){
    const P=prof(p).map(a=>a.slice()),r=diff(P,poly);
    if(r==='deg')return{err:'geometriya aniqlanmadi'};
    if(r===null)return inPoly(P,poly[0][0],poly[0][1])?{hole:poly}:{err:'o\'yiq panelga tegmaydi'};
    if(r.length!==1)return{err:'o\'yiq panelni ikkiga bo\'lib yuboradi'};
    let pts=r[0];if(area(pts)<0)pts=pts.reverse();
    if(o&&o.bone&&o.d>0){const R=o.d/2;   // ichki (panel ichidagi) burchaklar — freza aylanasi
      for(let i=0;i<poly.length;i++){const v=poly[i];if(!inPoly(P,v[0],v[1]))continue;const a=poly[(i+poly.length-1)%poly.length],b=poly[(i+1)%poly.length];
        const u1=[a[0]-v[0],a[1]-v[1]],u2=[b[0]-v[0],b[1]-v[1]],l1=Math.hypot(...u1),l2=Math.hypot(...u2);if(l1<1e-6||l2<1e-6)continue;
        const bi=[u1[0]/l1+u2[0]/l2,u1[1]/l1+u2[1]/l2],lb=Math.hypot(...bi);if(lb<1e-6)continue;
        const c=[v[0]+bi[0]/lb*R*.999,v[1]+bi[1]/lb*R*.999],r2=diff(pts,circlePts(c,R));if(Array.isArray(r2)&&r2.length===1){pts=r2[0];if(area(pts)<0)pts=pts.reverse()}}}
    return{pts}}
  /* Panellar to'plami uchun: har juftlik kesishmalari → rejalar */
  function plan(ps,o){const out=[],bb=new Map(ps.map(p=>[p.id,bbox(p)])),near=(a,b)=>[0,1,2].every(k=>a[0][k]<=b[1][k]+1&&b[0][k]<=a[1][k]+1);
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const A=ps[i],B=ps[j];if(!near(bb.get(A.id),bb.get(B.id)))continue;
      for(const x of crossings(A,B)){const sl=planCrossing(x,o);out.push({A,B,kind:x.sO!==x.eO?'half':'through',len:x.hi-x.lo,slots:sl,options:sl.options||[sl]})}}
    return out}
  /* Kesishish tekshiruvi: qalinlik bo'yicha 4 ichki burchakda ikkala panel ham bor uzunlik (mm). 0 — to'qnashuv yo'q */
  function interference(ps){const out=[],bb=new Map(ps.map(p=>[p.id,bbox(p)])),near=(a,b)=>[0,1,2].every(k=>a[0][k]<=b[1][k]&&b[0][k]<=a[1][k]);
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const A=ps[i],B=ps[j];if(!near(bb.get(A.id),bb.get(B.id)))continue;
      let worst=0;for(const x of crossings(A,B)){for(const s1 of[-.45,.45])for(const s2 of[-.45,.45]){const y=x.corner(s1*A.t,s2*B.t),IA=x.lineIn(x.FA,x.PA,y),IB=x.lineIn(x.FB,x.PB,y);
        for(const a of IA)for(const b of IB)worst=Math.max(worst,Math.min(a[1],b[1])-Math.max(a[0],b[0]))}}
      if(worst>.05)out.push({a:A.id,b:B.id,len:+worst.toFixed(2)})}
    return out}
  return{crossings,plan,cut,interference,bbox}}
const api={create,diff,lineIntervals,hull,area,inPoly};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.RugbyXLap=api;
})(typeof window!=='undefined'?window:globalThis);
