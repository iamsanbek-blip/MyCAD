const {makeEnv}=require('./harness');
const {run,sb}=makeEnv();
const F=require('./flat');
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

function seg(js){ sb.__x=js; return run('__x'); }
function offset(segs, closed, d){
  sb.__s=JSON.parse(JSON.stringify(segs)); sb.__c=closed; sb.__d=d;
  return run('JSON.parse(JSON.stringify(offsetSegChain(__s,__c,__d)||[]))');
}
function flatSegs(segs){
  const pts=[];
  segs.forEach(s=>{
    if(s.t==='A'){
      sb.__q=s; const ai=run('segArcInfo(__q)');
      const N=Math.max(10,Math.ceil(Math.abs(ai.sweep)/0.04));
      for(let k=0;k<=N;k++){const a=ai.a0+ai.sweep*k/N;
        pts.push({x:ai.cx+ai.r*Math.cos(a), y:ai.cy+ai.r*Math.sin(a)});}
    } else { pts.push({x:s.a.x,y:s.a.y}); pts.push({x:s.b.x,y:s.b.y}); }
  });
  return pts;
}
function minDistToChain(p, segs){
  let best=Infinity;
  segs.forEach(s=>{
    if(s.t==='A'){ sb.__q=s; const ai=run('segArcInfo(__q)');
      best=Math.min(best, Math.abs(Math.hypot(p.x-ai.cx,p.y-ai.cy)-ai.r)); return; }
    const dx=s.b.x-s.a.x, dy=s.b.y-s.a.y, L2=dx*dx+dy*dy;
    let tt=L2>0?((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/L2:0; tt=Math.max(0,Math.min(1,tt));
    best=Math.min(best, Math.hypot(s.a.x+dx*tt-p.x, s.a.y+dy*tt-p.y));
  });
  return best;
}

// ---------- 1. To'rtburchak ----------
console.log('=== 1. To\'RTBURCHAK 200×120, offset 10mm ===');
const R=[{t:'L',a:{x:0,y:0},b:{x:200,y:0}},{t:'L',a:{x:200,y:0},b:{x:200,y:120}},
         {t:'L',a:{x:200,y:120},b:{x:0,y:120}},{t:'L',a:{x:0,y:120},b:{x:0,y:0}}];
for(const [nm,d] of [['tashqariga',-10],['ichkariga',10]]){
  const o=offset(R,true,d);
  const line=o.filter(s=>s.t!=='A').length, arc=o.filter(s=>s.t==='A').length;
  t(nm+': 4 ta segment (zich nuqta emas)', o.length===4, o.length+' ta (L:'+line+' A:'+arc+')');
  // masofa to'g'rimi
  // qirra O'RTALARIDA masofa aynan 10 bo'lishi kerak
  // (burchak uchi tabiiy ravishda 10*sqrt(2) uzoqda — bu to'g'ri)
  let mn=Infinity,mx=-Infinity;
  o.forEach(s=>{ const m={x:(s.a.x+s.b.x)/2, y:(s.a.y+s.b.y)/2};
                 const q=minDistToChain(m,R); mn=Math.min(mn,q); mx=Math.max(mx,q); });
  t(nm+': qirra masofasi aynan 10mm', Math.abs(mn-10)<1e-6&&Math.abs(mx-10)<1e-6,
    'min='+mn.toFixed(4)+' max='+mx.toFixed(4));
  const pts=flatSegs(o);
  t(nm+': o\'zini kesmaydi', !F.selfIntersects(pts));
}

// ---------- 2. Yoyli shakl ----------
console.log('\n=== 2. YOY saqlanadimi? ===');
const A=[{t:'L',a:{x:0,y:0},b:{x:100,y:0}},
         {t:'A',a:{x:100,y:0},m:{x:140,y:40},b:{x:100,y:80}},
         {t:'L',a:{x:100,y:80},b:{x:0,y:80}},
         {t:'L',a:{x:0,y:80},b:{x:0,y:0}}];
for(const d of [-8, 8]){
  const o=offset(A,true,d);
  const arcs=o.filter(s=>s.t==='A').length;
  t('offset '+(d<0?'tashqariga':'ichkariga')+': yoy yoyligicha qoldi',
    arcs>=1, 'yoylar: '+arcs+' / segmentlar: '+o.length);
}
const o8=offset(A,true,-8);
const arc8=o8.find(s=>s.t==='A');
if(arc8){ sb.__q=arc8; const ai=run('segArcInfo(__q)');
  sb.__q=A[1]; const a0=run('segArcInfo(__q)');
  t('yoy radiusi 40 → 48 bo\'ldi', Math.abs(ai.r-(a0.r+8))<1e-6,
    'r='+ai.r.toFixed(3)+' (asl '+a0.r.toFixed(3)+')');
  t('yoy markazi joyida qoldi', Math.hypot(ai.cx-a0.cx,ai.cy-a0.cy)<1e-6);
}

// ---------- 3. Ichkariga katta offset ----------
console.log('\n=== 3. Chegaraviy holatlar ===');
const small=offset(R,true,80);
t('shakldan kattaroq offset → bo\'sh yoki toza', !small.length || !F.selfIntersects(flatSegs(small)),
  small.length+' segment');
const o59=offset(R,true,59);
t('ichkariga 59mm (120 balandlikda) → toza', !F.selfIntersects(flatSegs(o59)), o59.length+' segment');

// ---------- 4. Ochiq polyline ----------
console.log('\n=== 4. Ochiq chiziq ===');
const OP=[{t:'L',a:{x:0,y:0},b:{x:100,y:0}},{t:'L',a:{x:100,y:0},b:{x:100,y:60}},
          {t:'L',a:{x:100,y:60},b:{x:180,y:60}}];
const oo=offset(OP,false,-12);
t('3 segment → 3 segment', oo.length===3, oo.length+' ta');
const pts=flatSegs(oo);
let mn=Infinity; pts.forEach(p=>mn=Math.min(mn,minDistToChain(p,OP)));
t('masofa 12mm', Math.abs(mn-12)<1e-6, mn.toFixed(4));

// ---------- 5. Ko'p burchakli murakkab shakl ----------
console.log('\n=== 5. Murakkab shakl (L-profil) ===');
const Lp=[[0,0],[120,0],[120,40],[60,40],[60,100],[0,100]].map(([x,y])=>({x,y}));
const Ls=[]; for(let i=0;i<Lp.length;i++) Ls.push({t:'L',a:Lp[i],b:Lp[(i+1)%Lp.length]});
for(const d of [-10,10,20]){
  const o=offset(Ls,true,d);
  const f=flatSegs(o);
  t('L-profil offset '+d+': toza', o.length>0 && !F.selfIntersects(f),
    o.length+' segment, kesishdi='+F.selfIntersects(f));
}
console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
