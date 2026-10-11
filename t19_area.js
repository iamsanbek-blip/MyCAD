const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=require('path').join(__dirname, 'app', '');
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

const el=()=>({value:'',checked:true,style:{},classList:{add(){},remove(){},toggle(){}},
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
load('js/geometry/segments.js'); load('js/geometry/arcfit.js');
vm.runInContext(`
  function layerOf(){ return {visible:true, locked:false, color:'#f00'}; }
`, sb);
load('js/tools/area.js');
const run=c=>vm.runInContext(c,sb);
const call=(fn,...a)=>{ sb.__a=JSON.parse(JSON.stringify(a));
  return run(fn+'.apply(null,__a)'); };

function mkShape(segs, closed){
  sb.__s=JSON.parse(JSON.stringify(segs)); sb.__c=closed;
  return run('JSON.parse(JSON.stringify(shapeFromSegs(__s,__c,{kind:"line",layer:"cut"})))');
}

console.log('=== 1. Oddiy shakllar — ANALITIK qiymat bilan solishtirish ===\n');

// to'rtburchak 200×120 = 24000 mm²
const R=[[0,0],[200,0],[200,120],[0,120]];
const rs=[]; for(let i=0;i<4;i++) rs.push({t:'L',a:{x:R[i][0],y:R[i][1]},b:{x:R[(i+1)%4][0],y:R[(i+1)%4][1]}});
let sh=mkShape(rs,true); sb.__l=sh;
let a=run('shapeArea(__l)'), p=run('shapePerimeter(__l)');
t('to\'rtburchak 200×120 → 24000 mm²', Math.abs(a-24000)<1e-6, a.toFixed(4));
t('perimetr → 640 mm', Math.abs(p-640)<1e-6, p.toFixed(4));

// uchburchak (0,0)(100,0)(0,80) = 4000
const tr=[{t:'L',a:{x:0,y:0},b:{x:100,y:0}},{t:'L',a:{x:100,y:0},b:{x:0,y:80}},
          {t:'L',a:{x:0,y:80},b:{x:0,y:0}}];
sh=mkShape(tr,true); sb.__l=sh;
a=run('shapeArea(__l)');
t('uchburchak → 4000 mm²', Math.abs(a-4000)<1e-6, a.toFixed(4));

// aylana r=50 → π·2500 = 7853.98
sb.__l={kind:'circle', center:{x:0,y:0}, radius:50, closed:true, points:[]};
a=run('shapeArea(__l)'); p=run('shapePerimeter(__l)');
t('aylana r=50 → 7853.9816 mm²', Math.abs(a-Math.PI*2500)<1e-9, a.toFixed(4));
t('aylana perimetri → 314.1593 mm', Math.abs(p-2*Math.PI*50)<1e-9, p.toFixed(4));

console.log('\n=== 2. YOY aniq hisoblanadimi? (asosiy sinov) ===\n');
// yarim doira r=40 ustiga qo'yilgan to'rtburchak 80×50
//   to'rtburchak 80×50 = 4000
//   yarim doira r=40   = π·1600/2 = 2513.274
//   jami               = 6513.274
const half=[
  {t:'L', a:{x:-40,y:0},  b:{x:40,y:0}},
  {t:'L', a:{x:40,y:0},   b:{x:40,y:50}},
  {t:'A', a:{x:40,y:50},  m:{x:0,y:90}, b:{x:-40,y:50}},   // yarim doira
  {t:'L', a:{x:-40,y:50}, b:{x:-40,y:0}},
];
sh=mkShape(half,true); sb.__l=sh;
a=run('shapeArea(__l)');
const exact=80*50 + Math.PI*40*40/2;
t('to\'rtburchak+yarim doira → '+exact.toFixed(4), Math.abs(a-exact)<1e-6, a.toFixed(4));

// zich nuqtalar bilan hisoblasak qancha xato bo'lardi?
sb.__p=sh.points;
const approx=Math.abs(run('signedArea(__p)'));
console.log('   aniq hisob:      '+a.toFixed(4)+' mm²');
console.log('   zich nuqtalar:   '+approx.toFixed(4)+' mm²   (xato '+
            Math.abs(approx-exact).toFixed(4)+' mm²)');
t('aniq usul zich nuqtalardan yaxshiroq',
  Math.abs(a-exact) < Math.abs(approx-exact),
  'aniq xato '+Math.abs(a-exact).toExponential(2)+' vs zich '+Math.abs(approx-exact).toFixed(3));

// ICHKARIGA qaragan yoy (o'yiq) — ayirilishi kerak
const notch=[
  {t:'L', a:{x:-40,y:0},  b:{x:40,y:0}},
  {t:'L', a:{x:40,y:0},   b:{x:40,y:50}},
  {t:'A', a:{x:40,y:50},  m:{x:0,y:10}, b:{x:-40,y:50}},   // ichkariga botgan
  {t:'L', a:{x:-40,y:50}, b:{x:-40,y:0}},
];
sh=mkShape(notch,true); sb.__l=sh;
a=run('shapeArea(__l)');
const exact2=80*50 - Math.PI*40*40/2;
t('ichkariga botgan yoy AYIRILADI → '+exact2.toFixed(4), Math.abs(a-exact2)<1e-6, a.toFixed(4));

console.log('\n=== 3. TESHIKLAR ayiriladimi? ===\n');
run(`drawnLines=[];`);
// tashqi 200×120, ichida r=20 aylana
sb.__outer=mkShape(rs,true);
run(`__outer.selected=true; drawnLines.push(__outer);`);
run(`drawnLines.push({kind:'circle', center:{x:100,y:60}, radius:20, closed:true,
      selected:true, layer:'cut',
      points:Array.from({length:60},(_,i)=>({x:100+20*Math.cos(i/60*6.283),
                                            y:60+20*Math.sin(i/60*6.283)}))});`);
const r3=run('JSON.parse(JSON.stringify((()=>{const r=measureSelection(null);'+
             'return {count:r.count, gross:r.gross, holes:r.holes, net:r.net};})()))');
const hole=Math.PI*400;
console.log('   yalpi: '+r3.gross.toFixed(2)+'  teshik: '+r3.holes.toFixed(2)+
            '  sof: '+r3.net.toFixed(2));
t('2 ta kontur topildi', r3.count===2);
t('aylana TESHIK deb aniqlandi', Math.abs(r3.holes-hole)<1, r3.holes.toFixed(3));
t('sof maydon = 24000 − 1256.6', Math.abs(r3.net-(24000-hole))<1, r3.net.toFixed(3));

console.log('\n=== 4. Ochiq chiziqda maydon yo\'q ===\n');
const open=[{t:'L',a:{x:0,y:0},b:{x:100,y:0}},{t:'L',a:{x:100,y:0},b:{x:100,y:50}}];
sh=mkShape(open,false); sb.__l=sh;
t('ochiq chiziq → 0', run('shapeArea(__l)')===0);
t('lekin perimetri bor → 150', Math.abs(run('shapePerimeter(__l)')-150)<1e-6);

console.log('\n=== 5. Birlik formatlash ===\n');
[[500,'500.00 mm²'],[25000,'250.00 sm²'],[2440*1220,'2.98 m²']].forEach(([v,exp])=>{
  sb.__v=v; const got=run('fmtArea(__v)');
  t(v+' mm² → '+exp, got===exp, got);
});
sb.__v=1500; t('1500 mm → 1.50 m', run('fmtLen(__v)')==='1.50 m', run('fmtLen(__v)'));

console.log('\n=== 6. Integratsiya ===\n');
const html=fs.readFileSync(ROOT+'/index.html','utf8');
t('▦ Maydon tugmasi', html.includes('id="areaBtn"'));
t('hisobot qutisi', html.includes('id="areaReport"'));
t('area.js yuklanadi', html.includes('js/tools/area.js'));
t('app.js da ulangan', /wireArea\(\)/.test(fs.readFileSync(ROOT+'/js/app.js','utf8')));
// Keyboard behavior is covered by tests/workspace.test.cjs.
console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
