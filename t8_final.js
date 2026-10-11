const {makeEnv}=require('./harness');
const {run,sb}=makeEnv();
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

console.log('=== EXTENSION chegarasi endi oshkormi? ===');
sb.__c={mode:'dogbone', size:6, theta:Math.PI/2};
const rgD=run('cornerOffsetRange(__c)');
// YANGILANDI: chegara endi ASIMMETRIK — musbat r, manfiy r/sin(theta/2)
// YANGI KELISHUV: musbat = markaz burchak ICHIGA (chegara r/sin(θ/2)),
//                 manfiy = markaz materialga (chegara r)
t('dogbone musbat chegara = 0.98·r/sin45 = +8.32',
  Math.abs(rgD.max-6/Math.sin(Math.PI/4)*0.98)<1e-6, 'max='+rgD.max.toFixed(3));
t('dogbone manfiy chegara = -0.98r = -5.88', Math.abs(rgD.min+6*0.98)<1e-9, 'min='+rgD.min.toFixed(3));
sb.__c={mode:'chamfer', size:6, theta:Math.PI/2};
t('chamfer uchun chegara katta', run('cornerOffsetLimit(__c)')>100);
sb.__c={mode:'fillet', size:6, theta:Math.PI/2};
const fl=run('cornerOffsetLimit(__c)');
t('fillet uchun 0.98·r/sin(θ/2)=8.32', Math.abs(fl-6/Math.sin(Math.PI/4)*0.98)<1e-6, 'lim='+fl.toFixed(3));

// haqiqiy geometriya: chegara ichida monoton o'sadimi?
const RECT=[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}];
function depth(ext){
  run(`drawnLines=[{kind:'line',layer:'cut',closed:true,
        grips:${JSON.stringify(RECT)},points:${JSON.stringify(RECT)}}];
       detectCorners(); corners.forEach(c=>{c.mode='dogbone';c.size=6;c.offset=${ext};});`);
  const p=run('JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))');
  let d=-1e9;
  p.forEach(n=>{ if(n.arc&&n.from){const{cx,cy,r,ccw,sweep}=n.arc;
      const a0=Math.atan2(n.from.y-cy,n.from.x-cx);
      for(let k=0;k<=40;k++){const a=a0+(ccw?1:-1)*sweep*k/40;
        const x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);
        const v=-(x+y)*Math.SQRT1_2; if(v>d)d=v;}}});
  return d;
}
console.log('\n  ext   chuqurlik');
let mono=true, prev=1e9;
for(const e of [-5.8,-4,-2,0,2,4,5.8]){
  const d=depth(e);
  console.log('  %s   %s', String(e).padStart(5), d.toFixed(3));
  if(d>=prev) mono=false; prev=d;
}
// musbat → materialga kamroq kiradi, manfiy → ko'proq
t('ext oshgani sari materialga kamroq kiradi', mono);

console.log('\n=== OFFSET: shakl darajasida ===');
run(`drawnLines=[{kind:'line',layer:'cut',closed:true,
      grips:${JSON.stringify(RECT)},points:${JSON.stringify(RECT)}}];`);
for(const [nm,sign] of [['tashqariga',-1],['ichkariga',1]]){
  sb.__l=run('drawnLines[0]'); sb.__d=10; sb.__s=sign;
  const r=run('JSON.parse(JSON.stringify(offsetShapeSegs(__l,__d,__s)||null))');
  t(nm+': 4 ta toza segment', r&&r.segs&&r.segs.length===4, r&&r.segs?r.segs.length+' ta':'null');
  if(r&&r.segs){
    sb.__sg=r.segs; sb.__t=run('drawnLines[0]');
    const built=run('JSON.parse(JSON.stringify(shapeFromSegs(__sg,true,__t)))');
    t(nm+': grip soni 4 (zich nuqta emas)', built&&built.grips&&built.grips.length===4,
      built&&built.grips?built.grips.length+' grip':'null');
  }
}
console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
