const {makeEnv}=require('./harness');
const {run,sb}=makeEnv();
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};
const call=(fn,...a)=>{ sb.__a=JSON.parse(JSON.stringify(a));
  return run('JSON.parse(JSON.stringify('+fn+'.apply(null,__a)||null))'); };

const RECT=[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}];
function rectSegs(){
  const s=[]; for(let i=0;i<4;i++) s.push({t:'L',a:RECT[i],b:RECT[(i+1)%4]});
  return s;
}
function arcInfo(s){ sb.__q=s; return run('segArcInfo(__q)'); }

console.log('=== 1. FILLET: to\'rtburchak burchagiga R=20 ===');
const shape={kind:'line',closed:true,layer:'cut',points:RECT,grips:RECT};
const r1=call('applyFilletAt', shape, rectSegs(), 0, 1, 'fillet', 20);
t('xatosiz bajarildi', r1 && !r1.err, r1 && r1.err);
if(r1 && r1.segs){
  const segs=r1.segs;
  t('4 segment → 5 segment (1 ta yoy qo\'shildi)', segs.length===5, segs.length+' ta');
  const arcs=segs.filter(s=>s.t==='A');
  t('AYNAN 1 ta yoy', arcs.length===1, arcs.length+' ta');
  if(arcs.length){
    const ai=arcInfo(arcs[0]);
    t('radius aynan 20', Math.abs(ai.r-20)<1e-6, 'r='+ai.r.toFixed(5));
    t('sweep = 90° (to\'g\'ri burchak)', Math.abs(Math.abs(ai.sweep)-Math.PI/2)<1e-6,
      (Math.abs(ai.sweep)*180/Math.PI).toFixed(3)+'°');
    t('markaz (180,20) da', Math.abs(ai.cx-180)<1e-6&&Math.abs(ai.cy-20)<1e-6,
      '('+ai.cx.toFixed(3)+', '+ai.cy.toFixed(3)+')');
  }
  // zanjir uzluksizmi
  let cont=true;
  for(let i=0;i<segs.length;i++){ const n=segs[(i+1)%segs.length];
    if(Math.hypot(segs[i].b.x-n.a.x, segs[i].b.y-n.a.y)>1e-7) cont=false; }
  t('zanjir uzluksiz', cont);

  console.log('\n=== 2. EXPLODE/JOIN dan keyin yoy saqlanadimi? ===');
  sb.__s=segs; sb.__t=shape;
  const built=run('JSON.parse(JSON.stringify(shapeFromSegs(__s,true,__t)))');
  t('grips bilan shakl qurildi', !!built && !!built.grips, built&&built.grips&&built.grips.length+' grip');
  t('grip soni oz (zich nuqta emas)', built.grips.length<=8, built.grips.length+' ta');
  sb.__b=built;
  const back=run('JSON.parse(JSON.stringify(shapeToSegs(__b)))');
  t('qayta o\'qilganda yoy saqlandi', back.filter(s=>s.t==='A').length===1,
    back.filter(s=>s.t==='A').length+' yoy / '+back.length+' segment');
  const bi=back.find(s=>s.t==='A');
  if(bi){ const ai2=arcInfo(bi);
    t('radius o\'zgarmadi (20)', Math.abs(ai2.r-20)<1e-6, 'r='+ai2.r.toFixed(5)); }
  // yana bir marta aylantiramiz — barqarormi?
  sb.__s2=back;
  const b2=run('JSON.parse(JSON.stringify(shapeFromSegs(__s2,true,__t)))');
  sb.__b2=b2;
  const back2=run('JSON.parse(JSON.stringify(shapeToSegs(__b2)))');
  t('ikkinchi aylanishda ham barqaror', back2.filter(s=>s.t==='A').length===1,
    back2.filter(s=>s.t==='A').length+' yoy');
}

console.log('\n=== 3. CHAMFER ===');
const c1=call('applyFilletAt', shape, rectSegs(), 0, 1, 'chamfer', 15);
t('xatosiz', c1 && !c1.err, c1 && c1.err);
if(c1 && c1.segs){
  t('5 segment', c1.segs.length===5, c1.segs.length+' ta');
  t('yoy YO\'Q (faqat chiziq)', c1.segs.every(s=>s.t!=='A'));
  const mid=c1.segs[1];
  t('qiya chiziq (185,0)→(200,15)',
    Math.abs(mid.a.x-185)<1e-6&&Math.abs(mid.a.y)<1e-6&&
    Math.abs(mid.b.x-200)<1e-6&&Math.abs(mid.b.y-15)<1e-6,
    JSON.stringify(mid.a)+'→'+JSON.stringify(mid.b));
}

console.log('\n=== 4. Chegaraviy holatlar ===');
const big=call('applyFilletAt', shape, rectSegs(), 0, 1, 'fillet', 500);
t('juda katta radius → tushunarli xato', big && !!big.err, JSON.stringify(big&&big.segs&&big.segs.length));
const nonAdj=call('applyFilletAt', shape, rectSegs(), 0, 2, 'fillet', 10);
t('yonma-yon bo\'lmagan qirralar → xato', nonAdj && !!nonAdj.err, nonAdj&&nonAdj.err);
const wrap=call('applyFilletAt', shape, rectSegs(), 3, 0, 'fillet', 15);
t('aylanma burchak (oxirgi→birinchi) ishlaydi', wrap && !wrap.err && wrap.segs.length===5,
  wrap&&(wrap.err||wrap.segs.length+' segment'));

console.log('\n=== 5. Turli burchaklarda fillet ===');
for(const deg of [30,45,60,90,120,150]){
  const a=deg*Math.PI/180;
  const pts=[{x:100,y:0},{x:0,y:0},{x:100*Math.cos(a),y:100*Math.sin(a)}];
  const segs=[{t:'L',a:pts[0],b:pts[1]},{t:'L',a:pts[1],b:pts[2]}];
  const sh={kind:'line',closed:false,layer:'cut',points:pts,grips:pts};
  const r=call('applyFilletAt', sh, segs, 0, 1, 'fillet', 10);
  let msg='xato';
  if(r&&r.segs){ const A=r.segs.filter(s=>s.t==='A');
    if(A.length===1){ const ai=arcInfo(A[0]);
      msg = Math.abs(ai.r-10)<1e-6 ? 'ok (sweep '+(Math.abs(ai.sweep)*180/Math.PI).toFixed(0)+'°)' : 'radius xato';
    } else msg=A.length+' yoy';
  } else if(r&&r.err) msg=r.err;
  t(deg+'° burchak', msg.startsWith('ok'), msg);
}
console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
