const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=require('path').join(__dirname, 'app', '');
const sb={console,Math,JSON,Number,Array,Object,Set,Map,isFinite,
  Uint8Array,Int32Array,parseFloat,parseInt};
sb.globalThis=sb; vm.createContext(sb);
const src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
vm.runInContext(src('js/tools/nest-raster.js'), sb);
vm.runInContext(src('js/tools/cnc.js').split('function nestApply')[0], sb);
const run=c=>vm.runInContext(c,sb);

function crescent(R,r,off){
  const out=[];
  for(let a=30;a<=330;a+=6) out.push({x:R*Math.cos(a*Math.PI/180), y:R*Math.sin(a*Math.PI/180)});
  for(let a=330;a>=30;a-=6) out.push({x:off+r*Math.cos(a*Math.PI/180), y:r*Math.sin(a*Math.PI/180)});
  return out;
}
function mkUnit(pts){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  pts.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);});
  return {shapes:[{points:pts}], bbox:{x0,y0,x1,y1}};
}
const cfg={SW:2440,SH:1220,gap:10,MAR:10,usableW:2420,usableH:1200,allowRot:true};

function bench(name, units){
  const items=units.map(u=>({w:u.bbox.x1-u.bbox.x0, h:u.bbox.y1-u.bbox.y0}));
  const idx=items.map((_,i)=>i);
  const orders=[
    idx.slice().sort((a,b)=>items[b].h-items[a].h),
    idx.slice().sort((a,b)=>items[b].w*items[b].h-items[a].w*items[a].h),
    idx.slice().sort((a,b)=>items[b].w-items[a].w),
    idx.slice().sort((a,b)=>Math.max(items[b].w,items[b].h)-Math.max(items[a].w,items[a].h)),
  ];
  const t0=Date.now();
  sb.__u=units; sb.__g=cfg.gap;
  const holes=run('__u.map(u=>partFreeRects(u,8,__g,3))');
  const holeCount=holes.reduce((a,h)=>a+h.length,0);
  let plain=null, withHoles=null;
  const better=(a,b)=> !b ? a : (a.sheetCount<b.sheetCount ||
      (a.sheetCount===b.sheetCount && a.compact<b.compact)) ? a : b;
  for(const o of orders) for(const h of ['area','bl','short','long']){
    sb.__i=items; sb.__o=o; sb.__h=h; sb.__c=cfg;
    const p=run('nestPack(__i,__o,__h,__c)');
    if(p) plain=better(p,plain);
    sb.__hl=holes;
    const p2=run('nestPack(__i,__o,__h,__c,__hl)');
    if(p2) withHoles=better(p2,withHoles);
  }
  const ms=Date.now()-t0;
  const dS = plain.sheetCount - withHoles.sheetCount;
  const dC = plain.compact - withHoles.compact;
  const gain = dS>0 ? ('−'+dS+' LIST')
             : (dC>1 ? ('ixcham −'+Math.round(dC)+'mm ('+Math.round(dC/plain.compact*100)+'%)')
             : (dC<-1 ? 'yomonroq' : 'teng'));
  console.log('  '+name.padEnd(26)+
    ' list '+plain.sheetCount+'→'+withHoles.sheetCount+
    '   band balandlik '+Math.round(plain.compact)+'→'+Math.round(withHoles.compact)+'mm'+
    '   o\'yiq:'+String(holeCount).padStart(3)+
    '   '+gain.padEnd(20)+'('+ms+'ms)');
}
console.log('LIST 2440×1220, oraliq 10mm\n');
let u1=[]; for(let i=0;i<12;i++) u1.push(mkUnit(crescent(300,180,120)));
bench('12 yarim oy', u1);
let u2=[]; for(let i=0;i<10;i++) u2.push(mkUnit(crescent(300,180,120)));
for(let i=0;i<40;i++){const s=70+(i%4)*20; u2.push(mkUnit([{x:0,y:0},{x:s,y:0},{x:s,y:s},{x:0,y:s}]));}
bench('8 oy + 24 mayda kvadrat', u2);
let u3=[]; for(let i=0;i<8;i++) u3.push(mkUnit(crescent(380,240,150)));
for(let i=0;i<48;i++){const s=80+(i%5)*15; u3.push(mkUnit([{x:0,y:0},{x:s,y:0},{x:s,y:s*0.7},{x:0,y:s*0.7}]));}
bench('6 katta oy + 30 mayda', u3);
function Lshape(a,b,t){ return [{x:0,y:0},{x:a,y:0},{x:a,y:t},{x:t,y:t},{x:t,y:b},{x:0,y:b}]; }
let u4=[]; for(let i=0;i<10;i++) u4.push(mkUnit(Lshape(500,400,100)));
for(let i=0;i<20;i++){const s=90; u4.push(mkUnit([{x:0,y:0},{x:s,y:0},{x:s,y:s},{x:0,y:s}]));}
bench('10 L-profil + 20 kvadrat', u4);
let u5=[]; for(let i=0;i<24;i++) u5.push(mkUnit([{x:0,y:0},{x:400,y:0},{x:400,y:250},{x:0,y:250}]));
bench('24 to\'rtburchak (nazorat)', u5);
