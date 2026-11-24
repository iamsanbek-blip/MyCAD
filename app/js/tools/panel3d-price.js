/* ==========================================================================
   js/tools/panel3d-price.js  —  Modeling: narx hisobi (smeta)
   DOM'siz sof hisob; panel3d.js undan foydalanadi (RugbyPrice.compute(panels, prices, H)).

   Narxlar (foydalanuvchi bir marta kiritadi, shu kompyuterda saqlanadi):
     mat["MDF|16"]   — bitta list narxi (material + qalinlik)
     eb["0.4"]       — kromka, 1 metr (qalinlik bo'yicha)
     hw.konf …       — furnitura, dona (yevrovint, ekssentrik, shkant, polkaderjatel, petlya, ruchka)
     work.cut …      — ish: raspil (m), kromka yopishtirish (m), teshik (dona), paz (m), CNC (list)
     extra[]         — qo'shimcha qatorlar (yetkazish, yig'ish …), ustama %
   Material: «list» rejimida listlar soni (MaxRects, Cutlist «List hisobi» bilan bir xil); «m²» rejimida maydon × (1 + chiqit %).
   Detal narxi: material (guruhning haqiqiy list narxi detallar maydoniga bo'lib), kromka, ishlar, furnitura —
   detallar yig'indisi = jami (qo'shimcha qatorlar va ustamasiz).
   ========================================================================== */
(function(root){
'use strict';
const HW_KEYS=[['konf','Yevrovint','dona'],['ekss','Ekssentrik (komplekt)','dona'],['shkant','Shkant','dona'],['polka','Polkaderjatel','dona'],['petlya','Petlya','dona'],['ruchka','Ruchka','dona']];
const WORK_KEYS=[['cut','Raspil (kesish)','m'],['edge','Kromka yopishtirish','m'],['drill','Teshik (присадка)','dona'],['groove','Paz','m'],['cnc','CNC ishlov','list']];
const DEF={cur:"so'm",mode:'sheet',waste:15,mat:{},eb:{},hw:{},work:{},extra:[],markup:0};
const num=v=>{const n=+v;return Number.isFinite(n)&&n>=0?n:0};
function merge(o){const r=JSON.parse(JSON.stringify(DEF));if(!o||typeof o!=='object')return r;
  if(typeof o.cur==='string')r.cur=o.cur.slice(0,12);if(o.mode==='m2'||o.mode==='sheet')r.mode=o.mode;r.waste=num(o.waste);r.markup=num(o.markup);
  for(const k of['mat','eb','hw','work'])if(o[k]&&typeof o[k]==='object')for(const x in o[k])r[k][x]=num(o[k][x]);
  if(Array.isArray(o.extra))r.extra=o.extra.filter(e=>e&&typeof e==='object').map(e=>({n:String(e.n||'').slice(0,60),v:num(e.v)})).slice(0,30);
  return r}
// H: {prof, matN, LW, canRot, ebInfo, pack(items,SW,SH,K), sheet:{L,W,K,T}}
function compute(panels,prices,H){
  const P=merge(prices),vis=panels.filter(p=>!p.hid),S=H.sheet||{L:2800,W:2070,K:4,T:10},SW=S.L-2*S.T,SH=S.W-2*S.T,SA=S.L*S.W/1e6;
  const per=new Map(vis.map(p=>[p.id,{id:p.id,n:p.n||'Panel',q:p.q||1,mat:0,edge:0,work:0,hw:0,area:0}]));
  const groups=new Map(),missing=new Set();
  // material
  for(const p of vis){const t=+(+p.t).toFixed(2),key=H.matN(p)+'|'+t,g=groups.get(key)||{key,m:H.matN(p),t,items:[],area:0,ps:[]};
    const lw=H.LW(p),n=p.q||1,a=areaOf(H.prof(p))/1e6;g.area+=a*n;g.ps.push(p);per.get(p.id).area=a;
    for(let i=0;i<n;i++)g.items.push({w:lw[0],h:lw[1],rot:H.canRot(p)});groups.set(key,g)}
  let matT=0,sheetsT=0;
  const G=[...groups.values()].sort((a,b)=>a.m.localeCompare(b.m)||a.t-b.t).map(g=>{
    const gs=H.sheetFor?H.sheetFor(g.m):S,gSW=gs.L-2*gs.T,gSH=gs.W-2*gs.T,gSA=gs.L*gs.W/1e6;   // material o'z list o'lchami (LMDF 2750×1830, akril …)
    const price=num(P.mat[g.key]),r=H.pack(g.items,gSW,gSH,gs.K),sheets=r.sheets.length+r.unfit.length;
    const cost=P.mode==='m2'?g.area*(1+P.waste/100)*price/gSA:sheets*price;if(!price)missing.add('mat:'+g.key);
    for(const p of g.ps){const x=per.get(p.id);x.mat=g.area?cost*x.area/g.area:0}   // bitta detal (q=1) uchun
    matT+=cost;sheetsT+=sheets;return{key:g.key,m:g.m,t:g.t,sheets,area:g.area,price,cost,unfit:r.unfit.length,L:gs.L,W:gs.W}});
  // kromka
  const EB=new Map();let ebM=0;
  for(const p of vis){const e=H.ebInfo(p),n=p.q||1,x=per.get(p.id);
    for(const t in e.byT){const k=String(+(+t).toFixed(2)),m=e.byT[t];EB.set(k,(EB.get(k)||0)+m*n);ebM+=m*n;x.edge+=m*num(P.eb[k])}}
  const ebRows=[...EB].sort((a,b)=>a[0]-b[0]).map(([t,m])=>{const price=num(P.eb[t]);if(!price)missing.add('eb:'+t);return{t,m,price,cost:m*price}});
  // furnitura va ishlar (teshiklardan)
  const hwN={},hwPer=new Map();let holes=0,grooveM=0,cutM=0;
  for(const p of vis){const n=p.q||1,ops=p.ops||[],c={};
    for(const o of ops){if(o.k==='g'){grooveM+=Math.max(o.u1-o.u0,o.v1-o.v0)/1000*n;continue}if(o.k!=='d'&&o.k!=='e')continue;holes+=n;   // ship-paz (s, t) — CNC kesimi, teshik emas
      const t=o.t;if(t==='konf'&&o.k==='e')c.konf=(c.konf||0)+1;else if(t==='ekss'&&o.k==='e')c.ekss=(c.ekss||0)+1;else if(t==='shkant'&&o.k==='e')c.shkant=(c.shkant||0)+1;
      else if(t==='polka'&&(o.m||!ops.some(x=>x.t==='polka'&&x.m)))c.polka=(c.polka||0)+1;else if(t==='petlya')c.petlya=(c.petlya||0)+1;else if(t==='ruchka')c.ruchka=(c.ruchka||0)+.5}
    for(const k in c){hwN[k]=(hwN[k]||0)+c[k]*n}hwPer.set(p.id,c);
    cutM+=perim(H.prof(p))/1000*n}
  const hwRows=HW_KEYS.filter(([k])=>hwN[k]).map(([k,l,u])=>{const price=num(P.hw[k]);if(!price)missing.add('hw:'+k);return{k,l,u,n:hwN[k],price,cost:hwN[k]*price}});
  for(const p of vis){const x=per.get(p.id),c=hwPer.get(p.id)||{};for(const k in c)x.hw+=c[k]*num(P.hw[k])}
  const qty={cut:cutM,edge:ebM,drill:holes,groove:grooveM,cnc:sheetsT};
  const workRows=WORK_KEYS.map(([k,l,u])=>{const price=num(P.work[k]);return{k,l,u,n:qty[k],price,cost:qty[k]*price}}).filter(r=>r.n>0);
  // ishlarni detalga bo'lish: raspil — perimetr, kromka — o'z metri, teshik/paz — o'z teshiklari, CNC — maydon ulushi
  const areaT=vis.reduce((a,p)=>a+per.get(p.id).area*(p.q||1),0);
  for(const p of vis){const x=per.get(p.id),ops=p.ops||[],e=H.ebInfo(p);
    x.work=perim(H.prof(p))/1000*num(P.work.cut)+e.len*num(P.work.edge)+ops.filter(o=>o.k==='d'||o.k==='e').length*num(P.work.drill)+
      ops.filter(o=>o.k==='g').reduce((a,o)=>a+Math.max(o.u1-o.u0,o.v1-o.v0)/1000,0)*num(P.work.groove)+(areaT?sheetsT*num(P.work.cnc)*x.area/areaT:0);
    x.total=x.mat+x.edge+x.work+x.hw;x.sum=x.total*x.q}
  const ebT=ebRows.reduce((a,r)=>a+r.cost,0),hwT=hwRows.reduce((a,r)=>a+r.cost,0),workT=workRows.reduce((a,r)=>a+r.cost,0),exT=P.extra.reduce((a,e)=>a+e.v,0);
  const sub=matT+ebT+hwT+workT+exT,mk=sub*P.markup/100;
  return{cur:P.cur,mode:P.mode,groups:G,eb:ebRows,hw:hwRows,work:workRows,extra:P.extra,matT,ebT,hwT,workT,exT,sub,markup:mk,total:sub+mk,sheets:sheetsT,
    perPanel:[...per.values()],missing:[...missing]}}
function areaOf(pr){let s=0;for(let i=0;i<pr.length;i++){const a=pr[i],b=pr[(i+1)%pr.length];s+=a[0]*b[1]-b[0]*a[1]}return Math.abs(s)/2}
function perim(pr){let s=0;for(let i=0;i<pr.length;i++){const a=pr[i],b=pr[(i+1)%pr.length];s+=Math.hypot(b[0]-a[0],b[1]-a[1])}return s}
const money=(v,cur)=>Math.round(v).toLocaleString('ru-RU').replace(/ /g,' ')+(cur?' '+cur:'');
const api={DEF,HW_KEYS,WORK_KEYS,merge,compute,money};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.RugbyPrice=api;
})(typeof window!=='undefined'?window:globalThis);
