const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = require('path').join(__dirname, 'app');
const read = m => fs.readFileSync(path.join(ROOT, m), 'utf8');

let fails = 0;
const t = (name, cond, extra) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra && !cond ? '   → ' + extra : ''));
  if (!cond) fails++;
};

function baseSandbox() {
  const el = () => ({
    value: '', checked: true, style: {}, classList: { add(){}, remove(){}, toggle(){} },
    addEventListener(){}, appendChild(){}, click(){}, innerHTML: '', textContent: '', title: '',
  });
  const sb = {
    console, Math, JSON, Number, Array, Object, String, Set, Map, Date,
    isFinite, parseFloat, parseInt, alert(){}, confirm: () => true, setTimeout(){},
    document: { getElementById: el, addEventListener(){}, createElement: () => el(),
                querySelectorAll: () => [], body: el(), readyState: 'loading' },
    window: { addEventListener(){} },
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  return sb;
}

// =====================================================================
// 1. MOVE + relief (dogbone / T-bone / fillet / chamfer)
// =====================================================================
console.log('\n===== 1. Move: relief berilgan shakl ko\'chishi =====');

const sb = baseSandbox();
['js/geometry/core.js', 'js/model/layers.js', 'js/geometry/segments.js'].forEach(
  m => vm.runInContext(read(m), sb, { filename: m }));
vm.runInContext(read('js/geometry/arcfit.js').split('function doTrimAt')[0], sb);
vm.runInContext(read('js/model/corners.js'), sb, { filename: 'corners.js' });
vm.runInContext(`
  function compactShape(l){ return JSON.parse(JSON.stringify(l)); }
  function rebuildShape(l){ return l; }
  function updateHistoryStats(){}
  function safeNum(id,fb){ return fb; }
  var dimensions=[], texts=[];
`, sb);
vm.runInContext(read('js/model/state.js'), sb, { filename:'state.js' });
vm.runInContext(read('js/model/shapes.js'), sb, { filename: 'shapes.js' });

// transform.js uchun minimal muhit
vm.runInContext(`
  function renderList(){} function renderDrawnList(){} function draw(){}
  function snapVertexPoints(){return{eps:[],mids:[]};}
  function toScreen(p){return p;} var view={scale:1,ox:0,oy:0};
`, sb);
vm.runInContext(read('js/tools/transform.js'), sb, { filename: 'transform.js' });
['transformTool','transformBase','transformSnapshot','stretchSnap','stretchPicks'].forEach(n=>{
  try { vm.runInContext(n, sb); } catch(e){ vm.runInContext('var '+n+'=null;', sb); }
});

// 200x120 to'rtburchak, bitta burchakka DOGBONE
vm.runInContext(`
  drawnLines = [{
    kind:'line', layer:'cut', closed:true, selected:true,
    grips:[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}],
    points:[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}],
  }];
  detectCorners();
`, sb);
const nCorners = vm.runInContext('corners.length', sb);
t('to\'rtburchakda 4 ta burchak aniqlandi', nCorners === 4, 'topildi: ' + nCorners);

vm.runInContext(`
  corners.forEach(c=>{ c.mode='dogbone'; c.size=6; });
`, sb);

const pathBefore = vm.runInContext(
  'JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))', sb);
t('relief qo\'llangan yo\'l qurildi', Array.isArray(pathBefore) && pathBefore.length > 4,
  'nuqtalar: ' + (pathBefore && pathBefore.length));
// oddiy 4 burchakdan ko'proq nuqta bo'lishi kerak (dogbone qo'shimcha yoy qo'shadi)
const hasArc = pathBefore.some(n => n && n.arc);
t('dogbone yoylari mavjud', hasArc);

// --- MOVE: +500, +300 ---
vm.runInContext(`
  transformTool='move';
  transformBase={x:0,y:0};
  transformSnapshot = snapshotSelected();
  applyLiveTransform({x:500, y:300});
`, sb);

const pathAfter = vm.runInContext(
  'JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))', sb);

t('ko\'chirishdan keyin ham yo\'l bir xil tuzilishda',
  pathAfter && pathAfter.length === pathBefore.length,
  'oldin ' + pathBefore.length + ' → keyin ' + (pathAfter && pathAfter.length));

// HAR BIR nuqta aynan (500,300) ga siljigan bo'lishi kerak
let maxErr = 0, moved = 0;
if (pathAfter && pathAfter.length === pathBefore.length) {
  for (let i = 0; i < pathBefore.length; i++) {
    const a = pathBefore[i], b = pathAfter[i];
    const ex = Math.abs((b.x - a.x) - 500);
    const ey = Math.abs((b.y - a.y) - 300);
    maxErr = Math.max(maxErr, ex, ey);
    if (Math.hypot(b.x - a.x, b.y - a.y) > 1e-6) moved++;
  }
}
t('relief geometriyasining HAMMA nuqtasi ko\'chdi', moved === pathBefore.length,
  moved + '/' + pathBefore.length + ' ta nuqta ko\'chdi');
t('siljish aynan (500, 300)', maxErr < 1e-6, 'eng katta xato: ' + maxErr.toFixed(6));

// relief yoylarining markazlari ham ko'chdimi?
const arcsBefore = pathBefore.filter(n => n && n.arc).map(n => ({ cx: n.arc.cx, cy: n.arc.cy }));
const arcsAfter = pathAfter.filter(n => n && n.arc).map(n => ({ cx: n.arc.cx, cy: n.arc.cy }));
let arcErr = 0;
arcsBefore.forEach((a, i) => {
  if (!arcsAfter[i]) { arcErr = Infinity; return; }
  arcErr = Math.max(arcErr, Math.abs((arcsAfter[i].cx - a.cx) - 500),
                            Math.abs((arcsAfter[i].cy - a.cy) - 300));
});
t('dogbone yoy MARKAZLARI ham ko\'chdi (' + arcsBefore.length + ' ta yoy)',
  arcsBefore.length > 0 && arcErr < 1e-6, 'xato: ' + arcErr);

// sozlamalar saqlanib qoldimi?
const modesOk = vm.runInContext(
  'corners.length===4 && corners.every(c=>c.mode==="dogbone" && c.size===6)', sb);
t('burchak sozlamalari (dogbone, 6 mm) saqlanib qoldi', modesOk);

// =====================================================================
// 2. Chizishda Backspace / Esc
// =====================================================================
console.log('\n===== 2. Line chizish: Backspace va Esc =====');

const srcKeys = read('js/ui/input-keys.js');
const srcPanels = read('js/ui/panels-draw.js');

t('undoDrawPoint() funksiyasi qo\'shildi', /function undoDrawPoint\(/.test(srcPanels));
t('Backspace oxirgi nuqtani qaytaradi',
  /Backspace'[\s\S]{0,120}undoDrawPoint\(\)/.test(srcKeys.replace(/\n/g, '\n')) ||
  /undoDrawPoint\(\)/.test(srcKeys));
t('Esc endi cancelDraw() ga to\'g\'ridan-to\'g\'ri tushmaydi',
  /drawTool==='line' && currentDraw\.points\.length>=2[\s\S]{0,80}finishDraw\(\)/.test(srcKeys));

// undoDrawPoint mantiqini alohida sinash
const sb2 = baseSandbox();
vm.runInContext(`
  var currentDraw = {points:[{x:0,y:0},{x:10,y:0},{x:20,y:0},{x:30,y:0}],
                     segModes:['straight','straight','straight','straight'],
                     pendingArcMid:{x:5,y:5}};
  var typedLen='', typedLen2='', typingSecond=false, cancelled=false;
  function cancelDraw(){ currentDraw=null; cancelled=true; }
  function updateTypedBadge(){} function updateDrawActionButtons(){} function draw(){}
`, sb2);
const fnSrc = srcPanels.match(/function undoDrawPoint\(\)[\s\S]*?\n}/)[0];
vm.runInContext(fnSrc, sb2);

vm.runInContext('undoDrawPoint();', sb2);
t('4 nuqtadan 3 ta qoldi', vm.runInContext('currentDraw.points.length', sb2) === 3);
t('segModes ham qisqardi', vm.runInContext('currentDraw.segModes.length', sb2) === 3);
t('kutilayotgan arc o\'rtasi tozalandi', vm.runInContext('currentDraw.pendingArcMid', sb2) === null);
vm.runInContext('undoDrawPoint(); undoDrawPoint();', sb2);
t('1 nuqta qoldi', vm.runInContext('currentDraw && currentDraw.points.length', sb2) === 1);
vm.runInContext('undoDrawPoint();', sb2);
t('oxirgi nuqtadan keyin chizish bekor bo\'ladi', vm.runInContext('cancelled', sb2) === true);

// =====================================================================

// File lifecycle coverage moved to tests/workspace.test.cjs (full renderer).
console.log(fails ? fails+" failures" : "Move/drawing tests passed");
process.exit(fails?1:0);
