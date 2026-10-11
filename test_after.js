const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = require('path').join(__dirname, 'app');

const checks = {};
function el(id) {
  return {
    get checked() { return checks[id] !== undefined ? checks[id] : true; },
    set checked(v) { checks[id] = v; },
    value: '', style: {}, classList: { add(){}, remove(){}, toggle(){} },
    addEventListener() {}, appendChild() {}, innerHTML: '', textContent: '',
  };
}
const sandbox = {
  console, Math, Date, JSON, Number, Array, Object, String, Set, Map,
  isFinite, parseFloat, parseInt, alert(){}, setTimeout(){},
  document: { getElementById: el, addEventListener(){}, createElement: ()=>el('x'),
              querySelectorAll: ()=>[], readyState: 'loading', body: el('b') },
  window: { addEventListener(){}, devicePixelRatio: 1 },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const load = m => {
  let src = fs.readFileSync(path.join(ROOT, m), 'utf8');
  if (m.endsWith('arcfit.js')) src = src.split('function doTrimAt')[0];
  if (m.endsWith('cnc.js'))    src = src.split('function runNesting')[0];
  vm.runInContext(src, sandbox, { filename: m });
};
['js/geometry/core.js', 'js/model/layers.js', 'js/geometry/segments.js',
 'js/geometry/arcfit.js'].forEach(load);
vm.runInContext(`
  var view={scale:1,ox:0,oy:0}; var polygons=[];
  function safeNum(id,fb){ return fb; }
  function transformShapeBy(l,fn){ l.points=l.points.map(fn); if(l.grips) l.grips=l.grips.map(fn); }
  function shapeBBox(l){ let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    (l.points||[]).forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);});
    return isFinite(x0)?{x0,y0,x1,y1}:null; }
  function isShapeEditable(){ return true; }
  function alignUnits(){ return []; }
  function moveUnit(u,dx,dy){ u.shapes.forEach(s=>transformShapeBy(s,p=>({x:p.x+dx,y:p.y+dy}))); }
  var ctx=null; function toScreen(p){return p;} function draw(){}
`, sandbox);
load('js/geometry/snap.js');
load('js/tools/cnc.js');

const S = new Proxy({}, { get: (_, k) => vm.runInContext(String(k), sandbox) });
const set = (n, v) => { sandbox.__t = v; vm.runInContext(n + ' = __t;', sandbox); };

let fails = 0;
const t = (name, cond, extra) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra && !cond ? '   → ' + extra : ''));
  if (!cond) fails++;
};

// ============================ 1. JOIN ============================
console.log('\n===== 1. JOIN: arc tekis chiziqqa aylanmasligi =====');

const closedArcLast = [
  { t:'L', a:{x:0,y:0},     b:{x:100,y:0} },
  { t:'L', a:{x:100,y:0},   b:{x:100,y:100} },
  { t:'A', a:{x:100,y:100}, m:{x:50,y:150}, b:{x:0,y:0} },
];
let j = S.shapeFromSegs(closedArcLast, true, {});
let back = S.shapeToSegs(j);
t('yopiq zanjir, OXIRGI segment arc → arc saqlandi',
  back.filter(s=>s.t==='A').length === 1, 'segMeta=' + JSON.stringify(j.segMeta));

const closedArcFirst = [
  { t:'A', a:{x:0,y:0},     m:{x:50,y:-40}, b:{x:100,y:0} },
  { t:'L', a:{x:100,y:0},   b:{x:100,y:100} },
  { t:'L', a:{x:100,y:100}, b:{x:0,y:0} },
];
back = S.shapeToSegs(S.shapeFromSegs(closedArcFirst, true, {}));
t('yopiq zanjir, BIRINCHI segment arc → arc saqlandi',
  back.filter(s=>s.t==='A').length === 1);

const closedTwoArcs = [
  { t:'A', a:{x:0,y:0},     m:{x:50,y:-40},  b:{x:100,y:0} },
  { t:'L', a:{x:100,y:0},   b:{x:100,y:100} },
  { t:'A', a:{x:100,y:100}, m:{x:50,y:150},  b:{x:0,y:0} },
];
back = S.shapeToSegs(S.shapeFromSegs(closedTwoArcs, true, {}));
t('yopiq zanjir, IKKI arc → ikkalasi saqlandi',
  back.filter(s=>s.t==='A').length === 2, back.map(s=>s.t).join(''));

const openArcLast = [
  { t:'L', a:{x:0,y:0},   b:{x:100,y:0} },
  { t:'A', a:{x:100,y:0}, m:{x:150,y:50}, b:{x:100,y:100} },
];
back = S.shapeToSegs(S.shapeFromSegs(openArcLast, false, {}));
t('ochiq zanjir, oxirgi arc → arc saqlandi (nazorat)',
  back.filter(s=>s.t==='A').length === 1);

// seam geometriyasi to'g'rimi?
j = S.shapeFromSegs(closedArcLast, true, {});
back = S.shapeToSegs(j);
const seam = back[back.length-1];
t('yopuvchi arc aynan boshlanish nuqtasiga qaytadi',
  seam && Math.abs(seam.b.x-0)<1e-9 && Math.abs(seam.b.y-0)<1e-9, JSON.stringify(seam && seam.b));
t('yopuvchi arc o\'rta nuqtasi saqlandi (50,150)',
  seam && seam.t==='A' && Math.abs(seam.m.x-50)<1e-9 && Math.abs(seam.m.y-150)<1e-9,
  JSON.stringify(seam && seam.m));

// ============================ 2. SNAP ============================
console.log('\n===== 2. SNAP: chizilayotgan chiziqning midpoint/center\'i =====');

set('drawnLines', []);
set('currentDraw', { points: [{x:0,y:0}, {x:100,y:0}], segModes: ['straight','straight'] });
let vp = S.snapVertexPoints();
t('chizilayotgan chiziq midpoint beradi', vp.mids.length === 1, 'mids=' + vp.mids.length);
t('midpoint = (50,0)', vp.mids[0] && Math.abs(vp.mids[0].x-50)<1e-9, JSON.stringify(vp.mids[0]));
let sn = S.findSnapCandidate({x:50.4, y:0.4});
t('kursor → type=midpoint (ilgari "nearest" edi)', sn && sn.type==='midpoint', sn && sn.type);

set('currentDraw', { points: [{x:0,y:0},{x:100,y:0},{x:100,y:80}], segModes:['straight','straight','straight'] });
vp = S.snapVertexPoints();
t('2 segmentli chizilayotgan polyline → 2 midpoint', vp.mids.length === 2, 'mids=' + vp.mids.length);
sn = S.findSnapCandidate({x:100, y:40.3});
t('2-segment midpoint topildi', sn && sn.type==='midpoint', sn && sn.type);

// chizilayotgan ARC: markaz va egri ustidagi o'rta nuqta
set('currentDraw', { points: [{x:0,y:0},{x:100,y:0}],
                     segModes: ['straight', {kind:'arc', mid:{x:50,y:50}}] });
vp = S.snapVertexPoints();
t('chizilayotgan arc midpoint beradi', vp.mids.length === 1, 'mids=' + vp.mids.length);
t('arc midpoint egri USTIDA (50,50), vatar o\'rtasida emas',
  vp.mids[0] && Math.abs(vp.mids[0].y-50)<1e-9, JSON.stringify(vp.mids[0]));
const ctrs = S.allCenters();
t('chizilayotgan arc markazi topildi', ctrs.length === 1, 'centers=' + ctrs.length);
t('markaz ≈ (50,0)', ctrs[0] && Math.abs(ctrs[0].x-50)<1e-6 && Math.abs(ctrs[0].y-0)<1e-6,
  JSON.stringify(ctrs[0]));
sn = S.findSnapCandidate({x:50.3, y:0.3});
t('kursor markaz yonida → type=center', sn && sn.type==='center', sn && sn.type);

// tugallangan shakl ham ishlashda davom etsin (regressiya nazorati)
set('currentDraw', null);
set('drawnLines', [{ kind:'line', layer:'cut', points:[{x:0,y:0},{x:100,y:0}],
                     grips:[{x:0,y:0},{x:100,y:0}], closed:false }]);
sn = S.findSnapCandidate({x:50.4, y:0.4});
t('tugallangan chiziq midpoint (regressiya)', sn && sn.type==='midpoint', sn && sn.type);
sn = S.findSnapCandidate({x:0.3, y:0.3});
t('endpoint hamon ustunlikda (regressiya)', sn && sn.type==='endpoint', sn && sn.type);

// midpoint center'dan ustun bo'lishi
set('drawnLines', [
  { kind:'line', layer:'cut', points:[{x:0,y:0},{x:100,y:0}], grips:[{x:0,y:0},{x:100,y:0}] },
  { kind:'circle', layer:'cut', center:{x:52,y:2}, radius:30, points:[], grips:[] },
]);
sn = S.findSnapCandidate({x:50.5, y:0.5});
t('midpoint yaqinroq bo\'lsa center\'dan ustun', sn && sn.type==='midpoint', sn && sn.type);

// ============================ 3. NESTING ============================
console.log('\n===== 3. NESTING: MaxRects paketlash =====');

const cfg = { SW:2440, SH:1220, gap:10, MAR:10, usableW:2420, usableH:1200, allowRot:true };
const mk = (w,h,n) => Array.from({length:n}, () => ({w,h}));
const items = [...mk(600,400,6), ...mk(300,300,8), ...mk(900,200,4)];
const order = items.map((_,i)=>i).sort((a,b)=>items[b].h-items[a].h);

const plan = S.nestPack(items, order, 'area', cfg);
t('reja tuzildi', !!plan);
t('barcha detal joylandi', plan && plan.placements.every(p=>!!p));

// hech biri chegaradan chiqmadi
let inBounds = true;
plan.placements.forEach(p=>{
  if(p.x < -1e-6 || p.y < -1e-6) inBounds = false;
  if(p.x + p.w > cfg.usableW + 1e-6) inBounds = false;
  if(p.y + p.h > cfg.usableH + 1e-6) inBounds = false;
});
t('hamma detal list ichida', inBounds);

// kesishmaslik + gap tekshiruvi
let overlaps = 0, tooClose = 0;
for(let i=0;i<plan.placements.length;i++){
  for(let k=i+1;k<plan.placements.length;k++){
    const a=plan.placements[i], b=plan.placements[k];
    if(a.sheet !== b.sheet) continue;
    const sep = a.x+a.w <= b.x+1e-6 || b.x+b.w <= a.x+1e-6 ||
                a.y+a.h <= b.y+1e-6 || b.y+b.h <= a.y+1e-6;
    if(!sep) overlaps++;
    const gapX = Math.max(a.x-(b.x+b.w), b.x-(a.x+a.w));
    const gapY = Math.max(a.y-(b.y+b.h), b.y-(a.y+a.h));
    if(!sep) continue;
    if(Math.max(gapX,gapY) < cfg.gap - 1e-6) tooClose++;
  }
}
t('detallar kesishmaydi', overlaps === 0, overlaps + ' ta kesishish');
t('oraliq (gap) hamma joyda ≥ ' + cfg.gap + ' mm', tooClose === 0, tooClose + ' ta buzilish');

// shelf bilan solishtirish: MaxRects kamroq list ishlatishi kerak
const partArea = items.reduce((a,i)=>a+i.w*i.h,0);
const theoretical = Math.ceil(partArea/(cfg.SW*cfg.SH));
t('list soni nazariy minimumga yaqin (' + plan.sheetCount + ' vs min ' + theoretical + ')',
  plan.sheetCount <= theoretical + 1, plan.sheetCount + ' ta list');

// bir nechta farqli variant chiqishi
const ORD = {
  h: items.map((_,i)=>i).sort((a,b)=>items[b].h-items[a].h),
  w: items.map((_,i)=>i).sort((a,b)=>items[b].w-items[a].w),
  a: items.map((_,i)=>i).sort((a,b)=>items[b].w*items[b].h-items[a].w*items[a].h),
};
const sigs = new Set();
['area','bl','short','long'].forEach(hu=>{
  Object.values(ORD).forEach(o=>{
    const p = S.nestPack(items, o, hu, cfg);
    if(p) sigs.add(p.sheetCount+'|'+Math.round(p.compact)+'|'+Math.round(p.spread));
  });
});
t('kamida 3 ta FARQLI variant hosil bo\'ladi', sigs.size >= 3, sigs.size + ' ta noyob variant');

// burish: bo'yiga sig'maydigan, eniga sig'adigan detal
const tall = [{w:1150, h:2300}];
const rotPlan = S.nestPack(tall, [0], 'area', cfg);
t('sig\'magan detal 90° buriladi', rotPlan && rotPlan.placements[0] && rotPlan.placements[0].rot === true,
  JSON.stringify(rotPlan && rotPlan.placements[0]));
const noRot = S.nestPack(tall, [0], 'area', Object.assign({}, cfg, {allowRot:false}));
t('burish o\'chirilganda sig\'masa null qaytadi', noRot === null);

console.log('\n' + (fails ? '❌ ' + fails + ' ta test yiqildi' : '✅ Barcha testlar o\'tdi'));
process.exit(fails ? 1 : 0);
