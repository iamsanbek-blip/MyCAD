const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=require('path').join(__dirname, 'app', '');
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

// snap katakchalari yoqilgan bo'lishi kerak (grid va angle o'chiq)
const ON=['snapEndpointChk','snapMidpointChk','snapCenterChk','snapIntersectChk','snapNearChk'];
const el=(id)=>({value:(id==='gridStepInp'?'10':(id==='angleStepInp'?'15':'')),
  checked: ON.includes(id), style:{}, classList:{add(){},remove(){},toggle(){}},
  addEventListener(){},appendChild(){},click(){},innerHTML:'',textContent:'',title:''});
const sb={console,Math,JSON,Number,Array,Object,String,Set,Map,Date,isFinite,
  parseFloat,parseInt,alert(){},setTimeout(){},
  document:{getElementById:el,addEventListener(){},createElement:()=>el(),
            querySelectorAll:()=>[],body:el(),readyState:'loading'},
  window:{addEventListener(){}}};
sb.globalThis=sb; vm.createContext(sb);
const load=m=>{ let s=fs.readFileSync(path.join(ROOT,m),'utf8');
  if(m.endsWith('arcfit.js')) s=s.split('function doTrimAt')[0];
  vm.runInContext(s,sb,{filename:m}); };
load('js/geometry/core.js'); load('js/model/layers.js');
load('js/geometry/segments.js'); load('js/geometry/arcfit.js'); load('js/geometry/offset.js');
vm.runInContext(`
  var view={scale:1,ox:0,oy:0}, polygons=[];
  var orthoMode=false;
  var transformTool=null, transformStep=0, stretchMode=null, draggingGrip=null;
  function safeNum(id, fb){ return fb; }
`, sb);
load('js/geometry/snap.js');
const run=c=>vm.runInContext(c,sb);

// ---- sinov chizmasi: uzun vertikal chiziq + ko'chirilayotgan to'rtburchak ----
function setup(){
  run(`
    drawnLines=[
      // MO'LJAL: vertikal chiziq (0,0)-(0,1000), o'rtasi (0,500)
      {kind:'line', layer:'cut', closed:false, selected:false,
       points:[{x:0,y:0},{x:0,y:1000}], grips:[{x:0,y:0},{x:0,y:1000}]},
      // KO'CHIRILAYOTGAN to'rtburchak, kursor yonida
      {kind:'line', layer:'cut', closed:true, selected:true,
       points:[{x:300,y:300},{x:400,y:300},{x:400,y:700},{x:300,y:700}],
       grips:[{x:300,y:300},{x:400,y:300},{x:400,y:700},{x:300,y:700}]}
    ];
  `);
}

console.log('=== 1. Ko\'chirilayotgan shakl O\'ZIGA snap qiladimi? ===\n');
setup();
// Move rejimi YO'Q — hamma narsa snap manbai
run('transformTool=null; transformStep=0;');
let mids = run('JSON.parse(JSON.stringify(snapVertexPoints().mids))');
console.log('   Move YO\'Q  → midpoint nuqtalari: '+mids.length+' ta');
const hadOwn = mids.some(m=>Math.abs(m.x-350)<1 || Math.abs(m.x-400)<1 || Math.abs(m.x-300)<1);
t('oddiy holatda to\'rtburchak midpointlari bor', hadOwn);

// Move rejimi YOQ — tanlangan shakl chiqarilishi kerak
run('transformTool="move"; transformStep=2;');
mids = run('JSON.parse(JSON.stringify(snapVertexPoints().mids))');
console.log('   Move FAOL  → midpoint nuqtalari: '+mids.length+' ta');
t('Move paytida o\'z midpointlari YO\'Q',
  !mids.some(m=>m.x>200), 'qolgan: '+JSON.stringify(mids.filter(m=>m.x>200)));
t('MO\'LJALdagi chiziq midpointi (0,500) QOLDI',
  mids.some(m=>Math.abs(m.x)<1e-6 && Math.abs(m.y-500)<1e-6),
  JSON.stringify(mids));

console.log('\n=== 2. Kursor bo\'sh joyda — snap chiqmasligi kerak ===\n');
run('transformTool="move"; transformStep=2; view={scale:1,ox:0,oy:0};');
// bo'sh joy: (350, 480) — to'rtburchak ichida, lekin u endi manba emas
sb.__p={x:350,y:480};
let sn = run('JSON.parse(JSON.stringify(findSnapCandidate(__p)||null))');
t('bo\'sh joyda snap YO\'Q', sn===null, sn && sn.type);
// mo'ljal chizig'ining o'rtasiga yaqin: (5, 502)
sb.__p={x:5,y:502};
sn = run('JSON.parse(JSON.stringify(findSnapCandidate(__p)||null))');
t('mo\'ljal o\'rtasida → midpoint', sn && sn.type==='midpoint', sn && sn.type);
t('aynan (0,500) ga tushadi',
  sn && Math.abs(sn.point.x)<1e-6 && Math.abs(sn.point.y-500)<1e-6,
  sn && JSON.stringify(sn.point));
// mo'ljal chizig'ining o'rtasidan uzoq: (5, 300)
sb.__p={x:5,y:300};
sn = run('JSON.parse(JSON.stringify(findSnapCandidate(__p)||null))');
t('o\'rtadan uzoqda midpoint DEMAYDI', !sn || sn.type!=='midpoint', sn && sn.type);

console.log('\n=== 3. Endpoint / Center ham o\'zini chiqaradimi? ===\n');
run('transformTool="move"; transformStep=2;');
const eps = run('JSON.parse(JSON.stringify(snapVertexPoints().eps))');
t('endpoint: o\'z burchaklari yo\'q', !eps.some(p=>p.x>200),
  JSON.stringify(eps.filter(p=>p.x>200)));
t('endpoint: mo\'ljal uchlari qoldi',
  eps.some(p=>Math.abs(p.x)<1e-6 && Math.abs(p.y-1000)<1e-6));
run(`drawnLines.push({kind:'circle', layer:'cut', selected:true, closed:true,
      center:{x:350,y:500}, radius:40, points:[], grips:[]});`);
const ctrs = run('JSON.parse(JSON.stringify(allCenters()))');
t('center: ko\'chirilayotgan aylana markazi yo\'q', !ctrs.some(c=>Math.abs(c.x-350)<1),
  JSON.stringify(ctrs));

console.log('\n=== 4. Stretch: ORTHO da masofa AYNAN bo\'ladimi? ===\n');
vm.runInContext(`
  var stretchBase=null, stretchTyped='', stretchPicks=[], stretchSnap=null;
  var stretchBox={x0:0,y0:0,x1:0,y1:0}, stretchBoxing=false;
  var drawnLinesBackup=null;
  function collectStretchVerts(){ return []; }
  function rebuildStretched(){}
  function updateStretchHint(){}
  function draw(){} function renderList(){} function renderDrawnList(){}
  function pushHistory(){} function detectCorners(){}
  function finishTransform(){} function finishTrim(){} function finishDim(){}
  function finishOffset(){} function finishFillet(){}
`, sb);
const ts=fs.readFileSync(ROOT+'/js/tools/transform.js','utf8');
const i=ts.indexOf('function stretchDelta'); const j=ts.indexOf('\n}', i);
run(ts.slice(i, j+2));

run('orthoMode=true; stretchBase={x:0,y:0}; stretchTyped="200";');
console.log('   ortho YOQ, 200 mm yozilgan. Kursor turli burchaklarda:\n');
console.log('     kursor               natija         masofa');
[[300,0],[300,60],[300,150],[300,-90],[300,299]].forEach(([x,y])=>{
  sb.__w={x:x,y:y};
  const d=run('JSON.parse(JSON.stringify(stretchDelta(__w)))');
  const L=Math.hypot(d.x,d.y);
  console.log('     ('+String(x).padStart(4)+','+String(y).padStart(5)+')   ('+
    d.x.toFixed(1).padStart(6)+','+d.y.toFixed(1).padStart(6)+')   '+L.toFixed(3));
  t('  kursor ('+x+','+y+') → aynan 200 mm', Math.abs(L-200)<1e-9, L.toFixed(4));
  t('  ortho: faqat gorizontal', Math.abs(d.y)<1e-9, 'dy='+d.y.toFixed(4));
});

console.log('\n   vertikal yo\'nalish:');
[[60,300],[-40,300]].forEach(([x,y])=>{
  sb.__w={x:x,y:y};
  const d=run('JSON.parse(JSON.stringify(stretchDelta(__w)))');
  const L=Math.hypot(d.x,d.y);
  t('  kursor ('+x+','+y+') → 200 mm, faqat vertikal',
    Math.abs(L-200)<1e-9 && Math.abs(d.x)<1e-9,
    'd=('+d.x.toFixed(2)+','+d.y.toFixed(2)+') L='+L.toFixed(3));
});

console.log('\n=== 5. Ortho O\'CHIQ bo\'lsa erkin yo\'nalish ===\n');
run('orthoMode=false;');
sb.__w={x:300,y:300};
let d=run('JSON.parse(JSON.stringify(stretchDelta(__w)))');
t('45° yo\'nalishda ham 200 mm', Math.abs(Math.hypot(d.x,d.y)-200)<1e-9,
  Math.hypot(d.x,d.y).toFixed(4));
t('yo\'nalish saqlanadi (45°)', Math.abs(d.x-d.y)<1e-9,
  'd=('+d.x.toFixed(2)+','+d.y.toFixed(2)+')');

console.log('\n=== 6. Masofa yozilmagan holat buzilmadimi? ===\n');
run('orthoMode=true; stretchTyped="";');
sb.__w={x:137,y:42};
d=run('JSON.parse(JSON.stringify(stretchDelta(__w)))');
t('ortho: kursorning X i olinadi', Math.abs(d.x-137)<1e-9 && Math.abs(d.y)<1e-9,
  'd=('+d.x+','+d.y+')');
run('orthoMode=false;');
d=run('JSON.parse(JSON.stringify(stretchDelta(__w)))');
t('ortho o\'chiq: kursor aynan', Math.abs(d.x-137)<1e-9 && Math.abs(d.y-42)<1e-9,
  'd=('+d.x+','+d.y+')');

console.log('\n=== 7. Move ham to\'g\'ri tartibda? ===\n');
const ds=fs.readFileSync(ROOT+'/js/ui/input-drag.js','utf8');
t('Move yo\'nalishi ortho dan olinadi',
  /const ref = snap \? snap\.point[\s\S]{0,140}applyOrtho\(transformBase, w\)/.test(ds));
t('xom kursor (w) dan olinmaydi', !/let dir=sub\(w, transformBase\)/.test(ds));
t('parseNum ishlatiladi (vergul)', /parseNum\(transformTyped/.test(ds));

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
