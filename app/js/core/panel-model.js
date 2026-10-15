/* Pure panel model: local XY sizes and an independent, unscaled Z thickness. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RugbyPanels=api;})(globalThis,function(){
 'use strict';
 const copy=v=>JSON.parse(JSON.stringify(v)),id=()=> 'p_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,10);
 const empty=()=>({version:1,defaultThickness:16,templates:[],panels:[]});
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
 function instantiate(t,thickness=16){if(!positive(thickness))throw Error('Qalinlik noto‘g‘ri.');return{id:id(),name:t.name,outline:copy(t.outline),baseWidth:t.width,baseHeight:t.height,width:t.width,height:t.height,thickness,position:[0,0,0],rotation:[0,0,0]};}
 function update(p,patch){const n={...copy(p),...copy(patch)};for(const k of ['width','height','thickness','baseWidth','baseHeight'])if(!positive(n[k]))throw Error('O‘lcham 0 dan katta va 1 000 000 mm dan oshmasin.');if(!vector(n.position)||!vector(n.rotation))throw Error('Joylashuv yoki burchak noto‘g‘ri.');return n;}
 function normalize(raw){if(raw===undefined)return empty();if(!raw||raw.version!==1||!positive(raw.defaultThickness)||!Array.isArray(raw.panels)||!Array.isArray(raw.templates)||raw.panels.length>10000||raw.templates.length>10000)throw Error('3D sahna noto‘g‘ri.');const s=copy(raw),ids=new Set();
  for(const p of s.panels){update(p,{});contour(p.outline);if(typeof p.id!=='string'||typeof p.name!=='string'||ids.has(p.id))throw Error('Panel ID yoki nomi noto‘g‘ri.');ids.add(p.id);}
  for(const t of s.templates){if(!positive(t.width)||!positive(t.height)||typeof t.name!=='string')throw Error('Shablon noto‘g‘ri.');contour(t.outline);}return s;
 }
 return{copy,id,empty,bounds,contour,template,instantiate,update,normalize};
});
