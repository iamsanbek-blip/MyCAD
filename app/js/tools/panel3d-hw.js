/* ==========================================================================
   js/tools/panel3d-hw.js  —  Modeling: furnitura, teshik va paz (присадка)
   DOM'siz sof mantiq; panel3d.js undan foydalanadi (RugbyHW.create({Mof,prof})).

   Teshik/paz panelning O'Z koordinatasida saqlanadi (p.ops) — panel ko'chsa yoki
   3D da aylansa teshiklar u bilan yuradi:
     u, v — profil koordinatasi (0..eni, 0..bo'yi), A yuza — mahalliy +z (t/2), B — −z.
     {k:'d', f:'A'|'B', u,v, d, z, th?}   yuza teshigi (th — teshib o'tadi)
     {k:'e', u,v, c, n:[nu,nv], d, z}      chet (gorizontal) teshigi: (u,v) — qirradagi nuqta,
                                           n — ichkariga yo'nalish, c — qalinlik markazidan siljish
     {k:'g', f, u0,v0,u1,v1, z}            paz (to'rtburchak cho'ntak)
   a:1 — «Furnituralash» qo'ygan (qayta joylashda almashtiriladi); t — tur (konf, ekss, shkant,
   polka, petlya, planka, ruchka, paz, qo'lda).

   Ulanish: B panelning QIRRASI A panelning YUZASIGA tegadi (perpendikulyar). Korpus tahlili
   (Avto-nom) bilan bir xil tolerans: oraliq ≤ 3 mm.
   ========================================================================== */
(function(root){
'use strict';
const DEF={
  con:'konf',          // konf | ekss | shkant | none
  dowel:false,         // ulagich yonida qo'shimcha shkant (+32 mm o'rtaga qarab)
  e:50, step:500, minL:40, tol:3,
  konf:{fd:7,ed:5,ez:50},
  ekss:{d:15,z:13,b:34,ed:8,ez:34,bd:5,bz:11},
  shkant:{d:8,fz:12,ez:25},
  pin:{on:true,d:5,z:10,e:37,drop:8,row:0},
  hinge:{on:true,d:35,z:13,k:4,e:100,pd:5,pz:12,pe:37,ps:32},
  handle:{s:128,off:40,d:5},
  groove:{on:true,maxT:10,cl:.5,z:8},
  dxf:{drills:'5,7,8,15,35',tol:.3,snap:true,dec:'_',cut:'CUT_Z{t}',drill:'DRILL_D{d}_Z{z}',thru:'DRILL_D{d}_THRU',groove:'GROOVE_W{w}_Z{z}',edge:'HDRILL_D{d}_Z{z}',gap:100,rowW:6000}
};
const clone=o=>JSON.parse(JSON.stringify(o));
function merge(base,o){const r=clone(base);if(!o||typeof o!=='object')return r;
  for(const k in r){if(!(k in o))continue;const v=o[k];
    if(r[k]&&typeof r[k]==='object')r[k]=merge(r[k],v);
    else if(typeof r[k]==='number'){const n=+v;if(Number.isFinite(n))r[k]=n}
    else if(typeof r[k]==='boolean')r[k]=!!v;
    else if(typeof r[k]==='string'&&typeof v==='string')r[k]=v}
  return r}
const R2=v=>Math.round(v*100)/100;
const f2=v=>String(+(+v).toFixed(2));
const KPRE=/^([A-Z]{1,3})\.\s+/;
const T_NAME={konf:'Yevrovint',ekss:'Ekssentrik',shkant:'Shkant',polka:'Polkaderjatel',petlya:'Petlya',planka:'Petlya planka',ruchka:'Ruchka',paz:'Paz',man:"Qo'lda"};

function create(G){
  const {Mof,prof}=G;
  /* ---- panel ramkasi: dunyo = C + M·(u−w/2, v−h/2, z) ---- */
  const tAx=p=>{const m=Mof(p);for(let a=0;a<3;a++)if(Math.abs(m[a*3+2])===1)return a;return 2};
  const tSign=p=>{const m=Mof(p);return m[tAx(p)*3+2]};
  function box(p){const m=Mof(p),d=[p.w,p.h,p.t],c=[p.x,p.y,p.z];
    return[0,1,2].map(a=>{let e=0;for(let l=0;l<3;l++)e+=Math.abs(m[a*3+l])*d[l];return[c[a]-e/2,c[a]+e/2]})}
  function toLocal(p,P){const m=Mof(p),d=[P[0]-p.x,P[1]-p.y,P[2]-p.z],l=[0,0,0];
    for(let k=0;k<3;k++)for(let a=0;a<3;a++)l[k]+=m[a*3+k]*d[a];
    return[l[0]+p.w/2,l[1]+p.h/2,l[2]]}
  function dirLocal(p,D){const m=Mof(p),l=[0,0,0];for(let k=0;k<3;k++)for(let a=0;a<3;a++)l[k]+=m[a*3+k]*D[a];return l}
  const role=p=>{const n=String(p.n||'').toLowerCase().replace(KPRE,'').replace(/^[a-z]{1,3}\.\s+/,'');
    return /fasad/.test(n)?'door':/^polka/.test(n)?'shelf':/orqa devor/.test(n)?'back':''};

  function faceOp(p,P,o){const l=toLocal(p,P);return Object.assign({k:'d',f:l[2]>=0?'A':'B',u:R2(l[0]),v:R2(l[1])},o)}
  function edgeOp(p,P,inward,o){const l=toLocal(p,P),n=dirLocal(p,inward);
    return Object.assign({k:'e',u:R2(l[0]),v:R2(l[1]),c:R2(l[2]),n:[Math.round(n[0]),Math.round(n[1])]},o)}

  /* ---- ulanishlarni topish ---- */
  function joint(A,B,tol){const loose=role(A)==='door';   // fasad yon bokani to'liq yopmasligi mumkin (2 mm zazor)
    const ta=tAx(A),tb=tAx(B);if(ta===tb)return null;
    const a=box(A),b=box(B),gp=b[ta][0]-a[ta][1],gm=a[ta][0]-b[ta][1];
    const s=Math.abs(gp)<=Math.abs(gm)?1:-1,gap=s>0?gp:gm;
    if(gap>tol||gap<-Math.min(A.t-1,20))return null;
    const ovT=Math.min(a[tb][1],b[tb][1])-Math.max(a[tb][0],b[tb][0]);if(ovT<(loose?1:B.t-.5))return null;
    const c=3-ta-tb,c0=Math.max(a[c][0],b[c][0]),c1=Math.min(a[c][1],b[c][1]);
    return{A,B,ta,tb,c,s,gap,face:a[ta][s>0?1:0],bEdge:b[ta][s>0?0:1],mid:(b[tb][0]+b[tb][1])/2,c0,c1,a,b}}
  function joints(ps,o){const out=[];
    for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
      const x=joint(ps[i],ps[j],o.tol),y=joint(ps[j],ps[i],o.tol);
      let J=x&&y?(Math.abs(x.gap)<=Math.abs(y.gap)?x:y):x||y;
      if(J&&J.c1-J.c0>=o.minL)out.push(J)}
    return out}
  function spots(lo,hi,e,step){const L=hi-lo;if(L<=2*e+1)return[(lo+hi)/2];
    const n=Math.max(2,Math.ceil((L-2*e)/step)+1),r=[];for(let i=0;i<n;i++)r.push(lo+e+(L-2*e)*i/(n-1));return r}
  const pt=(J,vTa,vTb,vC)=>{const P=[0,0,0];P[J.ta]=vTa;P[J.tb]=vTb;P[J.c]=vC;return P};
  const cen=p=>[p.x,p.y,p.z];

  /* ---- furnituralash ---- */
  function place(all,targets,opts){
    const o=merge(DEF,opts),tg=targets.filter(p=>!p.hid),ids=new Set(tg.map(p=>p.id)),warn=[],cnt={};
    const add=(p,op)=>{(p.ops=p.ops||[]).push(Object.assign(op,{a:1}));cnt[op.t]=(cnt[op.t]||0)+1};
    for(const p of tg)if(p.ops){p.ops=p.ops.filter(x=>!x.a);if(!p.ops.length)delete p.ops}
    const J=joints(tg,o),thin=p=>p.t<=o.groove.maxT,doors=new Map();
    for(const j of J){const{A,B}=j;
      if(role(A)==='door'){if(tAx(B)!==1&&!thin(B)&&role(B)!=='door'){if(!doors.has(A.id))doors.set(A.id,[]);doors.get(A.id).push(j)}continue}
      if(role(B)==='door')continue;
      const inw=[0,0,0];inw[j.ta]=j.s;   // B ichkarisi: A yuzasidan uzoqlashish
      if(thin(B)){if(!o.groove.on)continue;
        const z=j.gap<-.5?R2(-j.gap):o.groove.z,hw=B.t/2+o.groove.cl/2,
          p0=faceOp(A,pt(j,j.face,j.mid-hw,j.c0),{}),p1=faceOp(A,pt(j,j.face,j.mid+hw,j.c1),{});
        add(A,{k:'g',f:p0.f,u0:Math.min(p0.u,p1.u),v0:Math.min(p0.v,p1.v),u1:Math.max(p0.u,p1.u),v1:Math.max(p0.v,p1.v),z,t:'paz'});
        if(j.gap>=-.5)warn.push(`${A.n} ↔ ${B.n}: ${B.n} pazga kirmaydi — har tomondan ${f2(z)} mm kattalashtiring`);
        continue}
      if(thin(A))continue;   // yupqa panel yuzasiga qalin panel qirrasi (mix) — teshik qo'yilmaydi
      if(role(B)==='shelf'&&o.pin.on&&j.tb===1){const P=o.pin,y0=j.b[1][0]-P.drop;
        for(const cp of[j.c0+P.e,j.c1-P.e])for(let k=-P.row;k<=P.row;k++)add(A,faceOp(A,pt(j,j.face,y0+32*k,cp),{d:P.d,z:P.z,t:'polka'}));
        continue}
      if(o.con==='none')continue;
      const S=spots(j.c0,j.c1,o.e,o.step),bLen=j.b[j.ta][1]-j.b[j.ta][0];
      const side=Math.sign(A[['x','y','z'][j.tb]]-B[['x','y','z'][j.tb]])||-1,bFace=side>0?j.b[j.tb][1]:j.b[j.tb][0];
      for(const cp of S){
        if(o.con==='konf'){const K=o.konf;
          add(A,faceOp(A,pt(j,j.face,j.mid,cp),{d:K.fd,z:A.t,th:1,t:'konf'}));
          add(B,edgeOp(B,pt(j,j.bEdge,j.mid,cp),inw,{d:K.ed,z:K.ez,t:'konf'}));
          if(K.ez>bLen-5)warn.push(`${B.n}: yevrovint chuqurligi ${K.ez} mm panel o'lchamidan katta`)}
        else if(o.con==='ekss'){const X=o.ekss;
          add(B,faceOp(B,pt(j,j.bEdge+j.s*X.b,bFace,cp),{d:X.d,z:X.z,t:'ekss'}));
          add(B,edgeOp(B,pt(j,j.bEdge,j.mid,cp),inw,{d:X.ed,z:X.ez,t:'ekss'}));
          add(A,faceOp(A,pt(j,j.face,j.mid,cp),{d:X.bd,z:X.bz,t:'ekss'}))}
        else if(o.con==='shkant'){const D=o.shkant;
          add(A,faceOp(A,pt(j,j.face,j.mid,cp),{d:D.d,z:D.fz,t:'shkant'}));
          add(B,edgeOp(B,pt(j,j.bEdge,j.mid,cp),inw,{d:D.d,z:D.ez,t:'shkant'}))}
        if(o.dowel&&o.con!=='shkant'&&S.length>1){const D=o.shkant,dc=cp<(j.c0+j.c1)/2?cp+32:cp-32;
          add(A,faceOp(A,pt(j,j.face,j.mid,dc),{d:D.d,z:D.fz,t:'shkant'}));
          add(B,edgeOp(B,pt(j,j.bEdge,j.mid,dc),inw,{d:D.d,z:D.ez,t:'shkant'}))}}}
    // fasadlar: petlya (eshik) va ruchka
    for(const F of tg.filter(p=>role(p)==='door')){
      const fb=box(F),ta=tAx(F),vert=ta===1?2:1,hor=3-ta-vert,H=fb[vert][1]-fb[vert][0],Wd=fb[hor][1]-fb[hor][0];
      const js=(doors.get(F.id)||[]).filter(j=>j.tb===hor),isDoor=H>=Wd;
      let hj=null;
      if(isDoor&&js.length&&o.hinge.on){const fc=(fb[hor][0]+fb[hor][1])/2,bc=j=>j.mid;
        const pref=F.hs==='R'?js.slice().sort((a,b)=>bc(b)-bc(a)):F.hs==='L'?js.slice().sort((a,b)=>bc(a)-bc(b)):js.slice().sort((a,b)=>Math.abs(bc(a)-fc)-Math.abs(bc(b)-fc)||bc(a)-bc(b));
        hj=pref[0];const j=hj,Hg=o.hinge,atMin=j.mid<fc,edge=atMin?fb[hor][0]:fb[hor][1],ins=atMin?1:-1;
        const n=H<=900?2:H<=1600?3:H<=2000?4:5,lo=Math.max(fb[vert][0]+Hg.e,j.c0+20),hi=Math.min(fb[vert][1]-Hg.e,j.c1-20);
        const ys=n===1||hi<=lo?[(lo+hi)/2]:Array.from({length:n},(_,i)=>lo+(hi-lo)*i/(n-1));
        const sInner=Math.sign(fc-j.mid)||1,pFace=sInner>0?j.b[hor][1]:j.b[hor][0];
        for(const y of ys){
          add(F,faceOp(F,pt(j,j.face,edge+ins*(Hg.k+Hg.d/2),y),{d:Hg.d,z:Hg.z,t:'petlya'}));
          for(const dy of[-Hg.ps/2,Hg.ps/2])add(j.B,faceOp(j.B,pt(j,j.bEdge+j.s*Hg.pe,pFace,y+dy),{d:Hg.pd,z:Hg.pz,t:'planka'}))}
        if(Hg.z>=F.t-1)warn.push(`${F.n}: petlya chashkasi chuqurligi ${Hg.z} mm qalinlikka yaqin`)}
      if(o.handle.s>0){const Hd=o.handle,fz=F[['x','y','z'][ta]]+(F.t/2)*(tSign(F)),P=[0,0,0];P[ta]=fz;
        const vc=(fb[vert][0]+fb[vert][1])/2,hc=(fb[hor][0]+fb[hor][1])/2,pts=[];
        if(isDoor){const atMin=hj?hj.mid<hc:false,x=atMin?fb[hor][1]-Hd.off:fb[hor][0]+Hd.off;for(const d of[-Hd.s/2,Hd.s/2]){const Q=P.slice();Q[hor]=x;Q[vert]=vc+d;pts.push(Q)}}
        else for(const d of[-Hd.s/2,Hd.s/2]){const Q=P.slice();Q[hor]=hc+d;Q[vert]=vc;pts.push(Q)}
        for(const Q of pts)add(F,faceOp(F,Q,{d:Hd.d,z:F.t,th:1,t:'ruchka'}))}}
    for(const p of tg)for(const m of check(p))warn.push(m);
    return{joints:J.length,cnt,warn,panels:tg.filter(p=>p.ops&&p.ops.some(x=>x.a)).length}}

  /* ---- tekshiruv ---- */
  function inPoly(P,u,v){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>v)!==(b[1]>v)&&u<(b[0]-a[0])*(v-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
  function dEdge(P,u,v){let m=Infinity;for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length],dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,((u-a[0])*dx+(v-a[1])*dy)/L)):0;m=Math.min(m,Math.hypot(u-a[0]-t*dx,v-a[1]-t*dy))}return m}
  function check(p){const out=[],ops=p.ops||[],P=prof(p),nm=p.n||'Panel';
    const fh=ops.filter(o=>o.k==='d');
    for(const o of fh){
      if(!inPoly(P,o.u,o.v)){out.push(`${nm}: Ø${f2(o.d)} teshik (${f2(o.u)}; ${f2(o.v)}) panel tashqarisida`);continue}
      if(dEdge(P,o.u,o.v)<o.d/2+.5)out.push(`${nm}: Ø${f2(o.d)} teshik (${f2(o.u)}; ${f2(o.v)}) chetga juda yaqin`);
      if(!o.th&&o.z>=p.t-.5)out.push(`${nm}: Ø${f2(o.d)} teshik chuqurligi ${f2(o.z)} mm — panel (${f2(p.t)}) teshilib ketadi`)}
    for(let i=0;i<fh.length;i++)for(let j=i+1;j<fh.length;j++){const a=fh[i],b=fh[j];
      if(a.f!==b.f&&!a.th&&!b.th)continue;
      if(Math.hypot(a.u-b.u,a.v-b.v)<(a.d+b.d)/2-.01)out.push(`${nm}: teshiklar ustma-ust (${f2(a.u)}; ${f2(a.v)}) — Ø${f2(a.d)} va Ø${f2(b.d)}`)}
    for(const o of ops.filter(o=>o.k==='e')){
      if(o.d>p.t-2)out.push(`${nm}: chet teshigi Ø${f2(o.d)} qalinlik ${f2(p.t)} mm ga sig'maydi`);
      if(dEdge(P,o.u,o.v)>1)out.push(`${nm}: chet teshigi (${f2(o.u)}; ${f2(o.v)}) qirrada emas — o'lcham o'zgargan bo'lsa «Furniturala»ni qayta bosing`)}
    for(const o of ops.filter(o=>o.k==='g'))if(!inPoly(P,(o.u0+o.u1)/2,(o.v0+o.v1)/2))out.push(`${nm}: paz panel tashqarisida`);
    return out}

  /* ---- panel o'zgarishlarida teshiklarni moslash ---- */
  function rot90(p,wOld){if(!p.ops)return;   // eni↔bo'yi: (u,v) → (v, w−u)
    for(const o of p.ops){if(o.k==='g'){const a=[o.v0,wOld-o.u0],b=[o.v1,wOld-o.u1];o.u0=Math.min(a[0],b[0]);o.u1=Math.max(a[0],b[0]);o.v0=Math.min(a[1],b[1]);o.v1=Math.max(a[1],b[1]);continue}
      [o.u,o.v]=[o.v,R2(wOld-o.u)];if(o.n)o.n=[o.n[1],-o.n[0]]}}
  function mirror(p,k){if(!p.ops)return;   // k: 'w' | 'h' | 't'
    for(const o of p.ops){
      if(k==='t'){if(o.f)o.f=o.f==='A'?'B':'A';if(o.k==='e')o.c=-o.c;continue}
      const i=k==='w'?0:1,W=k==='w'?p.w:p.h;
      if(o.k==='g'){if(i===0)[o.u0,o.u1]=[R2(W-o.u1),R2(W-o.u0)];else[o.v0,o.v1]=[R2(W-o.v1),R2(W-o.v0)];continue}
      if(i===0)o.u=R2(W-o.u);else o.v=R2(W-o.v);if(o.n)o.n[i]=-o.n[i]}}
  function sanitize(ops){if(!Array.isArray(ops))return undefined;
    const ok=o=>o&&typeof o==='object'&&(o.k==='d'||o.k==='e'||o.k==='g')&&['u','v','d','z'].every(k=>o.k==='g'||Number.isFinite(+o[k]))&&(o.k!=='g'||['u0','v0','u1','v1','z'].every(k=>Number.isFinite(+o[k])));
    const r=ops.filter(ok).map(o=>clone(o));return r.length?r:undefined}

  /* ---- sverloga yaxlitlash (masalan Ø5.2 → Ø5) ---- */
  function drillMap(o){const list=String(o.drills||'').split(/[,;\s]+/).map(Number).filter(v=>v>0);
    return d=>{if(!o.snap||!list.length)return{d,m:false};let best=null;for(const x of list)if(Math.abs(x-d)<=o.tol+1e-9&&(best===null||Math.abs(x-d)<Math.abs(best-d)))best=x;
      return best===null?{d,m:false,none:true}:{d:best,m:best!==d}}}

  /* ---- DXF (AutoCAD R12): har panel — A tomoni (+ B tomoni, ko'zgu) ---- */
  function dxf(ps,opts){
    const o=merge(DEF,opts).dxf,map=drillMap(o),num=v=>f2(v).replace('.',o.dec),
      ly=(tpl,x)=>tpl.replace(/\{(\w)\}/g,(_,k)=>x[k]!==undefined?num(x[k]):'').replace(/[^A-Za-z0-9_$-]/g,'_').slice(0,31)||'0';
    const used=new Map(),E=[],note=new Map(),none=new Map();let cx=0,cy=0,rowH=0,nDr=0,nEd=0,nGr=0,sides=0;
    const L=(name,aci)=>{if(!used.has(name))used.set(name,aci);return name};
    const poly=(pts,layer)=>{let s='0\nPOLYLINE\n8\n'+layer+'\n66\n1\n70\n1\n';for(const q of pts)s+='0\nVERTEX\n8\n'+layer+'\n10\n'+f2(q[0])+'\n20\n'+f2(q[1])+'\n30\n0\n';E.push(s+'0\nSEQEND\n8\n'+layer+'\n')};
    const circ=(x,y,r,layer)=>E.push('0\nCIRCLE\n8\n'+layer+'\n10\n'+f2(x)+'\n20\n'+f2(y)+'\n30\n0\n40\n'+f2(r)+'\n');
    const line=(a,b,layer)=>E.push('0\nLINE\n8\n'+layer+'\n10\n'+f2(a[0])+'\n20\n'+f2(a[1])+'\n30\n0\n11\n'+f2(b[0])+'\n21\n'+f2(b[1])+'\n31\n0\n');
    const text=(x,y,h,s,layer)=>E.push('0\nTEXT\n8\n'+layer+'\n10\n'+f2(x)+'\n20\n'+f2(y)+'\n30\n0\n40\n'+h+'\n1\n'+String(s).replace(/[\r\n]+/g,' ')+'\n');
    const drill=o2=>{const r=map(o2.d);if(r.m){const k=f2(o2.d)+'→'+f2(r.d);note.set(k,(note.get(k)||0)+1)}if(r.none)none.set(f2(o2.d),(none.get(f2(o2.d))||0)+1);return r.d};
    for(const p of ps){
      const ops=p.ops||[],P=prof(p),hasB=ops.some(x=>(x.k==='d'&&x.f==='B'&&!x.th)||(x.k==='g'&&x.f==='B'));
      for(const side of hasB?['A','B']:['A']){
        const W=p.w,H=p.h,mx=side==='B'?(u=>W-u):(u=>u);
        if(cx>0&&cx+W>o.rowW){cx=0;cy-=rowH+o.gap+60;rowH=0}
        const X=u=>cx+mx(u),Y=v=>cy+v;
        poly(P.map(q=>[X(q[0]),Y(q[1])]),L(ly(o.cut,{t:p.t}),7));
        for(const x of ops){
          if(x.k==='d'){if(side==='A'?!(x.f==='A'||x.th):!(x.f==='B'&&!x.th))continue;const d=drill(x);nDr++;
            circ(X(x.u),Y(x.v),d/2,x.th?L(ly(o.thru,{d,z:p.t}),5):L(ly(o.drill,{d,z:x.z}),1))}
          else if(x.k==='g'){if(x.f!==side)continue;nGr++;
            const w=Math.min(x.u1-x.u0,x.v1-x.v0),l=L(ly(o.groove,{w,z:x.z}),3);
            poly([[X(x.u0),Y(x.v0)],[X(x.u1),Y(x.v0)],[X(x.u1),Y(x.v1)],[X(x.u0),Y(x.v1)]],l)}
          else if(x.k==='e'&&side==='A'){nEd++;const d=drill(x),l=L(ly(o.edge,{d,z:x.z}),6),n=x.n||[0,0];
            line([X(x.u),Y(x.v)],[X(x.u+n[0]*x.z),Y(x.v+n[1]*x.z)],l);circ(X(x.u),Y(x.v),d/2,l)}}
        {const nm=String(p.n||'Panel'),h=Math.max(8,Math.min(18,W/Math.max(nm.length,14)*1.6));   // ikki qator: nom; o'lcham va tomon (qo'shni chizmaga chiqmasin)
          text(cx,cy-28,h,nm,L('LABEL',8));text(cx,cy-28-h*1.5,h,`${f2(p.w)}x${f2(p.h)}x${f2(p.t)}${(p.q||1)>1?' x'+p.q:''} ${side}${side==='B'?' (ag\'darilgan)':''}`,L('LABEL',8))}
        sides++;cx+=W+o.gap;rowH=Math.max(rowH,H)}}
    let s='0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n9\n$MEASUREMENT\n70\n1\n0\nENDSEC\n';
    s+='0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n1\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n0\nENDTAB\n';
    s+='0\nTABLE\n2\nLAYER\n70\n'+(used.size+1)+'\n0\nLAYER\n2\n0\n70\n0\n62\n7\n6\nCONTINUOUS\n';
    for(const[n,a]of used)s+='0\nLAYER\n2\n'+n+'\n70\n0\n62\n'+a+'\n6\nCONTINUOUS\n';
    s+='0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n'+E.join('')+'0\nENDSEC\n0\nEOF\n';
    return{text:s,sides,panels:ps.length,drills:nDr,edges:nEd,grooves:nGr,layers:[...used.keys()],mapped:[...note].map(([k,n])=>`Ø${k} (${n} ta)`),noDrill:[...none].map(([k,n])=>`Ø${k} (${n} ta)`)}}

  /* ---- teshiklar ro'yxati (CSV) ---- */
  function csv(ps){const rows=[['Panel','Turi','Tomon','U','V','Diametr','Chuqurlik','Teshib o\'tadi','Yo\'nalish']],c=v=>String(v).replace(/[;\r\n]/g,' ');
    for(const p of ps)for(const o of p.ops||[]){
      if(o.k==='g')rows.push([c(p.n||'Panel'),'Paz',o.f,`${f2(o.u0)}..${f2(o.u1)}`,`${f2(o.v0)}..${f2(o.v1)}`,f2(Math.min(o.u1-o.u0,o.v1-o.v0)),f2(o.z),'','']);
      else rows.push([c(p.n||'Panel'),T_NAME[o.t]||o.t||'',o.k==='e'?'Chet':o.f,f2(o.u),f2(o.v),f2(o.d),f2(o.k==='d'&&o.th?p.t:o.z),o.th?1:'',o.k==='e'?`${o.n[0]},${o.n[1]}`:''])}
    return rows.map(r=>r.join(';')).join('\r\n')}

  return{DEF,merge,place,check,joints,rot90,mirror,sanitize,dxf,csv,drillMap,tAx,toLocal,T_NAME}}
const api={create,DEF};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.RugbyHW=api;
})(typeof window!=='undefined'?window:globalThis);
