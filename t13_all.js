const {makeEnv}=require('./harness');
const {run,sb}=makeEnv();
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

console.log('=== 1. VERGUL bilan son kiritish ===');
[['−1,8 → -1.8','-1,8',-1.8],['3,5 → 3.5','3,5',3.5],['nuqta ham','2.25',2.25],
 ['bo\'sh → 0','',0],['faqat minus → 0','-',0],['axlat → 0','abc',0]].forEach(([nm,inp,exp])=>{
  sb.__v=inp; const got=run('safeOffset(__v)');
  t(nm, Math.abs(got-exp)<1e-9, 'olindi: '+got);
});
sb.__v='4,5'; t('safeSize ham vergulni oladi', Math.abs(run('safeSize(__v,1)')-4.5)<1e-9);

console.log('\n=== 2. DOGBONE extension kichik qiymatlarda ham suriladi ===');
const RECT=[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}];
function depth(ext){
  run(`drawnLines=[{kind:'line',layer:'cut',closed:true,
        grips:${JSON.stringify(RECT)},points:${JSON.stringify(RECT)}}];
       detectCorners(); corners.forEach(c=>{c.mode='dogbone';c.size=3;c.offset=${ext};});`);
  const p=run('JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))');
  let d=-1e9;
  p.forEach(n=>{ if(n.arc&&n.from){const{cx,cy,r,ccw,sweep}=n.arc;
    const a0=Math.atan2(n.from.y-cy,n.from.x-cx);
    for(let k=0;k<=60;k++){const a=a0+(ccw?1:-1)*sweep*k/60;
      const v=-((cx+r*Math.cos(a))+(cy+r*Math.sin(a)))*Math.SQRT1_2; if(v>d)d=v;}}});
  return d;
}
const d0=depth(0), dm=depth(-0.1), dp=depth(0.1), dm1=depth(-1), dp1=depth(1);
console.log('   ext=-1 → %s   ext=-0.1 → %s   ext=0 → %s   ext=+0.1 → %s   ext=+1 → %s',
  dm1.toFixed(3), dm.toFixed(3), d0.toFixed(3), dp.toFixed(3), dp1.toFixed(3));
// YANGI KELISHUV: musbat → chuqurlik KAMAYADI (material ko'proq qoladi)
t('+0.1 → materialga 0.1mm kamroq kiradi', Math.abs((d0-dp)-0.1)<1e-6, 'farq '+(d0-dp).toFixed(4));
t('-0.1 → materialga 0.1mm ko\'proq kiradi', Math.abs((dm-d0)-0.1)<1e-6, 'farq '+(dm-d0).toFixed(4));
t('±1 ham aynan 1mm', Math.abs((d0-dp1)-1)<1e-6 && Math.abs((dm1-d0)-1)<1e-6);
// radius o'zgarmasligi
run(`corners.forEach(c=>{c.offset=-0.5;});`);
const p2=run('JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))');
const rr=p2.filter(n=>n.arc).map(n=>n.arc.r);
t('yoy radiusi hamisha 3mm (o\'zgarmaydi)', rr.every(r=>Math.abs(r-3)<1e-6), 'radiuslar: '+rr.map(x=>x.toFixed(2)).join(','));

console.log('\n=== 3. Burchak nuqtasi zoom bilan kichrayadi ===');
// render.js dan faqat kerakli funksiyani ajratib olamiz
{
  const rs=require('fs').readFileSync(require('path').join(__dirname, 'app', 'js/ui/render.js'),'utf8');
  const m=rs.match(/const CORNER_DOT_MIN_PX[\s\S]*?\n}/);
  run(m[0]);
}
sb.__c={size:3};
run('view={scale:1,ox:0,oy:0}'); const r1=run('cornerDotR(__c)');
run('view={scale:0.05,ox:0,oy:0}'); const r2=run('cornerDotR(__c)');
run('view={scale:20,ox:0,oy:0}');  const r3=run('cornerDotR(__c)');
console.log('   zoom 1× → %s px   zoom 0.05× → %s px   zoom 20× → %s px',
  r1.toFixed(2), r2.toFixed(3), r3.toFixed(2));
t('uzoqdan juda kichik (chizilmaydi)', r2 < run('CORNER_DOT_MIN_PX'), 'r='+r2.toFixed(3));
t('yaqindan 6px bilan cheklangan', Math.abs(r3-6)<1e-9, 'r='+r3);
run('view={scale:1,ox:0,oy:0}');

console.log('\n=== 4. Yoy/aylana uzunligi o\'lchovi ===');
{
  const pts=[]; for(let a=0;a<360;a+=6) pts.push({x:50*Math.cos(a*Math.PI/180),y:50*Math.sin(a*Math.PI/180)});
  sb.__pts=pts;
  run(`drawnLines=[{kind:'circle',layer:'cut',center:{x:0,y:0},radius:50,closed:true,
        points:__pts, grips:[]}];`);
  // dimension.js dagi findArcNear ni yuklaymiz
  const ds=require('fs').readFileSync(require('path').join(__dirname, 'app', 'js/tools/dimension.js'),'utf8');
  const m=ds.match(/function findArcNear\([\s\S]*?\n}/);
  run('var view={scale:1,ox:0,oy:0};');
  run(m[0]);
}
sb.__p={x:50,y:0};
const a1=run('JSON.parse(JSON.stringify(findArcNear(__p)||null))');
t('aylana topildi', !!a1);
if(a1) t('aylana uzunligi 2πr = 314.16', Math.abs(a1.len-2*Math.PI*50)<1e-6, a1.len.toFixed(3));
const AS=[{t:'L',a:{x:0,y:0},b:{x:100,y:0}},
          {t:'A',a:{x:100,y:0},m:{x:140,y:40},b:{x:100,y:80}},
          {t:'L',a:{x:100,y:80},b:{x:0,y:80}},{t:'L',a:{x:0,y:80},b:{x:0,y:0}}];
sb.__s=AS; sb.__t={kind:'line',layer:'cut',closed:true};
run('drawnLines=[shapeFromSegs(__s,true,__t)]');
sb.__p={x:140,y:40};
const a2=run('JSON.parse(JSON.stringify(findArcNear(__p)||null))');
t('yoy topildi', !!a2);
if(a2){
  sb.__q=AS[1]; const ai=run('segArcInfo(__q)');
  t('yoy uzunligi = |sweep|×r', Math.abs(a2.len-Math.abs(ai.sweep)*ai.r)<1e-4,
    a2.len.toFixed(3)+' vs '+(Math.abs(ai.sweep)*ai.r).toFixed(3));
}

console.log('\n=== 5. Matn: prompt() o\'rniga oyna ===');
const fs=require('fs');
const ts=fs.readFileSync(require('path').join(__dirname, 'app', 'js/tools/text.js'),'utf8');
t('prompt() chaqiruvi yo\'q', !/[^.\w]prompt\(/.test(ts.replace(/\/\/.*/g,'')));
t('askText() oynasi bor', /function askText\(/.test(ts));
t('placeTextAt async', /async function placeTextAt/.test(ts));
const ih=fs.readFileSync(require('path').join(__dirname, 'app', 'index.html'),'utf8');
t('index.html da oyna bor', ih.includes('askOverlay') && ih.includes('askInput'));

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
