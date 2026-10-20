/* Pure panel model: local XY sizes and an independent, unscaled Z thickness. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RugbyPanels=api;})(globalThis,function(){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v)),id=()=> 'p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
 const empty=()=>({version:1,defaultThickness:16,importedDrawings:[],templates:[],panels:[],referenceLines:[]});
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<=1000000;
 const vector=v=>Array.isArray(v)&&v.length===3&&v.every(n=>Number.isFinite(n)&&Math.abs(n)<=1000000);
 function bounds(p){let x=Infinity,y=Infinity,r=-Infinity,t=-Infinity;for(const v of p){x=Math.min(x,v.x);y=Math.min(y,v.y);r=Math.max(r,v.x);t=Math.max(t,v.y);}return{x,y,width:r-x,height:t-y};}
 function contour(points){
  if(!Array.isArray(points)||points.length<3||points.length>20000||points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Panel konturi noto‘g‘ri.');
  let p=points.map(p=>({x:p.x,y:p.y}));if(Math.hypot(p[0].x-p.at(-1).x,p[0].y-p.at(-1).y)<1e-7)p.pop();
  const b=bounds(p);if(!positive(b.width)||!positive(b.height))throw Error('Panel eni va bo‘yi noldan katta bo‘lsin.');
  if(Math.abs(p.reduce((a,v,i)=>{const n=p[(i+1)%p.length];return a+v.x*n.y-n.x*v.y;},0))<1e-8)throw Error('Kontur maydoni nol.');return p;
 }
 function template(points,name='Panel'){const p=contour(points),b=bounds(p);return{id:id(),name:String(name).slice(0,80),width:b.width,height:b.height,outline:p.map(p=>({x:p.x-b.x,y:p.y-b.y}))};}
 function instantiate(t,thickness=16){if(!positive(thickness))throw Error('Qalinlik noto‘g‘ri.');return{id:id(),name:t.name,outline:copy(t.outline),baseWidth:t.width,baseHeight:t.height,width:t.width,height:t.height,thickness,quantity:1,position:[0,0,0],rotation:[0,0,0]};}
 // Extrude a closed XY profile along world +Z, preserving its original footprint.
 function extrude(points,depth=500,name='Extrude panel'){
  if(!positive(depth))throw Error('Extrude 0 dan katta va 1 000 000 mm dan oshmasin.');
  const pts=contour(points),b=bounds(pts),edges=pts.map((v,i)=>({x:pts[(i+1)%pts.length].x-v.x,y:pts[(i+1)%pts.length].y-v.y}));
  const len=v=>Math.hypot(v.x,v.y);
  const rectangle=pts.length===4&&edges.every((v,i)=>len(v)>1e-7&&Math.abs(v.x*edges[(i+1)%4].x+v.y*edges[(i+1)%4].y)<len(v)*len(edges[(i+1)%4])*1e-8)&&Math.hypot(edges[0].x+edges[2].x,edges[0].y+edges[2].y)<1e-6;
  let p;
  if(rectangle){const e=len(edges[0])>=len(edges[1])?edges[0]:edges[1],w=len(e),thickness=Math.min(len(edges[0]),len(edges[1]));
   p=instantiate(template([{x:0,y:0},{x:w,y:0},{x:w,y:depth},{x:0,y:depth}],name),thickness);
   p.rotation=[90,Math.atan2(e.y,e.x)*180/Math.PI,0];p.extrusionAxis='height';
  }else{p=instantiate(template(pts,name),depth);p.extrusionAxis='thickness';}
  p.position=[b.x+b.width/2,b.y+b.height/2,depth/2];return update(p,{});
 }
 function update(p,patch){const n={type:'Panel',quantity:1,...copy(p),...copy(patch)};if(typeof n.type!=='string'||n.type.length>80)throw Error('Panel turi noto‘g‘ri.');if(!Number.isInteger(n.quantity)||n.quantity<1||n.quantity>1000000)throw Error("Soni 1–1 000 000 orasidagi butun son bo‘lsin.");for(const k of ['width','height','thickness','baseWidth','baseHeight'])if(!positive(n[k]))throw Error('O‘lcham 0 dan katta va 1 000 000 mm dan oshmasin.');if(!vector(n.position)||!vector(n.rotation))throw Error('Joylashuv yoki burchak noto‘g‘ri.');return n;}
 function normalize(raw){if(raw===undefined)return empty();if(!raw||raw.version!==1||!positive(raw.defaultThickness)||!Array.isArray(raw.panels)||!Array.isArray(raw.templates)||raw.panels.length>10000||raw.templates.length>10000)throw Error('3D sahna noto‘g‘ri.');const s=copy(raw),ids=new Set();s.importedDrawings??=[];if(!Array.isArray(s.importedDrawings)||s.importedDrawings.some(v=>typeof v!=='string'))throw Error('Chizma bog‘lanishi noto‘g‘ri.');
  s.referenceLines??=[];
  if(!Array.isArray(s.referenceLines)||s.referenceLines.length>10000||s.referenceLines.some(l=>!l||!Array.isArray(l.points)||l.points.length>60000||l.points.some(p=>!vector(p))))throw Error('3D yordamchi chiziqlar noto‘g‘ri.');
  for(const p of s.panels){p.quantity??=1;update(p,{});contour(p.outline);if(typeof p.id!=='string'||typeof p.name!=='string'||ids.has(p.id))throw Error('Panel ID yoki nomi noto‘g‘ri.');ids.add(p.id);}
  for(const t of s.templates){if(!positive(t.width)||!positive(t.height)||typeof t.name!=='string')throw Error('Shablon noto‘g‘ri.');contour(t.outline);}return s;
 }
 // Rugby 1.1.2 used page.panel3d and Y-up coordinates. Convert to our Z-up
 // world with a proper rotation [x,-z,y], preserving all panel dimensions.
 function fromLegacy(raw){
  if(!raw||raw.v!==1||!Array.isArray(raw.panels))throw Error('1.1.2 modeli noto‘g‘ri.');
  const s=empty();s.defaultThickness=raw.T===undefined?16:raw.T;
  const world=v=>[v[0],-v[2],v[1]],mul=(a,b)=>a.map((_,i)=>[0,1,2].reduce((n,k)=>n+a[Math.floor(i/3)*3+k]*b[k*3+i%3],0));
  s.panels=raw.panels.map((p,i)=>{
   if(!p||!['front','side','flat'].includes(p.o)||![p.w,p.h,p.t].every(positive))throw Error('1.1.2 panel o‘lchami noto‘g‘ri.');
   const w=p.w,h=p.h,c=Math.min(p.c||100,w/2-.5,h-1),kind=p.shape||(p.c?'L':'rect');
   const profiles={rect:[[0,0],[w,0],[w,h],[0,h]],tri:[[0,0],[w,0],[w/2,h]],pent:[[0,0],[w,0],[w,h*.6],[w/2,h],[0,h*.6]],L:[[0,0],[w,0],[w,c],[c,c],[c,h],[0,h]],U:[[0,0],[w,0],[w,h],[w-c,h],[w-c,c],[c,c],[c,h],[0,h]]};
   if(p.pts&&(!Array.isArray(p.pts)||!positive(p.bw)||!positive(p.bh)))throw Error('1.1.2 konturi noto‘g‘ri.');
   const pts=p.pts?p.pts.map(a=>[a[0]*w/p.bw,a[1]*h/p.bh]):profiles[kind];
   if(!pts)throw Error('1.1.2 panel shakli qo‘llanmaydi: '+kind);
   const x=p.o==='flat'?-Math.PI/2:0,y=(p.o==='side'?Math.PI/2:0)+(p.ry||0)*Math.PI/2;
   const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y);
   const m=p.m||[cy,sy*sx,sy*cx,0,cx,-sx,-sy,cy*sx,cy*cx];
   if(!Array.isArray(m)||m.length!==9||m.some(v=>!Number.isFinite(v)))throw Error('1.1.2 yo‘nalishi noto‘g‘ri.');
   const r=mul([1,0,0,0,0,-1,0,1,0],m),ey=Math.asin(Math.max(-1,Math.min(1,r[2])));
   const ex=Math.abs(r[2])<.9999999?Math.atan2(-r[5],r[8]):Math.atan2(r[7],r[4]);
   const ez=Math.abs(r[2])<.9999999?Math.atan2(-r[1],r[0]):0;
   return update({id:'legacy_'+i+'_'+p.id,name:String(p.n||'Panel').slice(0,80),type:'Panel',outline:contour(pts.map(a=>({x:a[0],y:a[1]}))),baseWidth:w,baseHeight:h,width:w,height:h,thickness:p.t,quantity:p.q??1,position:world([p.x,p.y,p.z]),rotation:[ex,ey,ez].map(v=>v*180/Math.PI),hidden:!!p.hid},{});
  });
  if(raw.lines!==undefined&&!Array.isArray(raw.lines))throw Error('1.1.2 chiziqlar ro‘yxati noto‘g‘ri.');
  s.referenceLines=(raw.lines||[]).map(l=>({closed:!!l.c,points:l.p.map(a=>world(raw.pl==='plan'?[a[0],0,-a[1]]:[a[0],a[1],0]))}));
  for(const g of raw.guides||[]){if(!vector(g.p)||![0,1,2].includes(g.a))throw Error('1.1.2 yordamchi chiziq noto‘g‘ri.');const a=[...g.p],b=[...g.p];a[g.a]-=10000;b[g.a]+=10000;s.referenceLines.push({guide:true,points:[world(a),world(b)]});}
  return normalize(s);
 }
 return{copy,id,empty,bounds,contour,template,instantiate,extrude,update,normalize,fromLegacy};
});
