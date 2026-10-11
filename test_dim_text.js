// Ekran (render.js) va PNG (raster.js) o'lchov geometriyasini SOLISHTIRISH.
// Ikkalasi ham haqiqiy fayllardan yuklanadi — qayta yozilmaydi.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = require('path').join(__dirname, 'app');

// ---- yozib boruvchi 2D kontekst ----
function recCtx() {
  const rec = { ops: [] };
  const noop = () => {};
  const c = {
    ops: rec.ops,
    save: noop, restore: noop, beginPath: noop, closePath: noop, stroke: noop,
    fill: noop, fillRect: noop, strokeRect: noop, setLineDash: noop, clip: noop,
    drawImage: noop, scale: noop, clearRect: noop, arcTo: noop, quadraticCurveTo: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: (t) => ({ width: String(t).length * 6 }),
    fillText: (t, x, y) => rec.ops.push(['text', t, x, y]),
    strokeText: noop,
    moveTo: (x, y) => rec.ops.push(['M', x, y]),
    lineTo: (x, y) => rec.ops.push(['L', x, y]),
    arc: (x, y, r, a0, a1, ccw) => rec.ops.push(['A', x, y, r, a0, a1, !!ccw]),
    translate: (x, y) => { rec.tx = x; rec.ty = y; },
    rotate: (a) => { rec.rot = a; },
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
    textAlign: '', textBaseline: '', lineJoin: '', lineCap: '',
  };
  return c;
}

function makeSandbox() {
  const canvases = [];
  const screenCtx = recCtx();
  const el = (id) => (id === 'cv' ? {
    width:800, height:600, style:{}, getContext: () => screenCtx,
    addEventListener(){}, getBoundingClientRect: () => ({left:0,top:0,width:800,height:600}),
  } : {
    value: id === 'dimTextSize' ? '10' : (id === 'dimPrecision' ? '1' : (id === 'dimUnit' ? 'mm' : '')),
    checked: true, style: {}, classList: { add(){}, remove(){}, toggle(){} },
    addEventListener() {}, appendChild() {}, removeChild() {}, click() {},
    innerHTML: '', textContent: '', getBoundingClientRect: () => ({ left:0, top:0, width:800, height:600 }),
  });
  const sb = {
    console, Math, JSON, Number, Array, Object, String, Set, Map, Date,
    isFinite, parseFloat, parseInt, alert(){}, prompt: () => null,
    setTimeout(){}, TextEncoder: global.TextEncoder, btoa: global.btoa,
    document: {
      getElementById: el, addEventListener(){}, querySelectorAll: () => [],
      readyState: 'loading', body: el('b'),
      createElement: (tag) => {
        if (tag !== 'canvas') return el(tag);
        const c2 = recCtx();
        const cv = { width:0, height:0, getContext: () => c2, toBlob(){}, style:{} };
        canvases.push({ cv, ctx: c2 });
        return cv;
      },
    },
    window: { addEventListener(){}, devicePixelRatio: 1 },
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
  };
  sb.globalThis = sb;
  sb.__canvases = canvases;
  sb.__screenCtx = screenCtx;
  vm.createContext(sb);
  return sb;
}

const read = m => fs.readFileSync(path.join(ROOT, m), 'utf8');

let fails = 0;
const t = (name, cond, extra) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (extra && !cond ? '   → ' + extra : ''));
  if (!cond) fails++;
};

// =====================================================================
// Sinov o'lchovi: ALIGNED (hotkey D) — qiya, `place` chetga surilgan
// =====================================================================
const DIM = {
  kind: 'aligned',
  p1: { x: 0,   y: 0 },
  p2: { x: 300, y: 200 },
  place: { x: 60, y: 140 },      // foydalanuvchi chetga surgan uchinchi nuqta
  textSize: 10, prec: 1, unit: 'mm',
};

// ---------- 1. EKRAN yo'li (render.js) ----------
const sbS = makeSandbox();
vm.runInContext(`
  function sub(a,b){return{x:a.x-b.x,y:a.y-b.y};}
  function add(a,b){return{x:a.x+b.x,y:a.y+b.y};}
  function len(v){return Math.hypot(v.x,v.y);}
  function dot(a,b){return a.x*b.x+a.y*b.y;}
  function dimTextSize(){ return 10; }
  var dimensions=[], drawnLines=[], polygons=[], corners=[], refImages=[];
  var dimTool=null, dimPts=[];
`, sbS);
vm.runInContext(read('js/ui/render.js'), sbS, { filename: 'render.js' });
const ctxS = sbS.__screenCtx;
sbS.__d = DIM;
vm.runInContext('drawOneDimension(__d, false);', sbS);

// o'lchov chizig'i = eng uzun M→L juftligi (ekran fazosida)
function longestSeg(ops) {
  let best = null;
  for (let i = 0; i < ops.length - 1; i++) {
    if (ops[i][0] !== 'M' || ops[i + 1][0] !== 'L') continue;
    const a = { x: ops[i][1], y: ops[i][2] }, b = { x: ops[i + 1][1], y: ops[i + 1][2] };
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (!best || d > best.d) best = { a, b, d };
  }
  return best;
}
const segS = longestSeg(ctxS.ops);
// ekran → dunyo (toScreen ning teskarisi)
const screenWorld = segS && {
  a: { x: segS.a.x, y: -segS.a.y },
  b: { x: segS.b.x, y: -segS.b.y },
};

// ---------- 2. PNG yo'li (raster.js) ----------
const sbP = makeSandbox();
vm.runInContext(`
  function sub(a,b){return{x:a.x-b.x,y:a.y-b.y};}
  function len(v){return Math.hypot(v.x,v.y);}
  function dot(a,b){return a.x*b.x+a.y*b.y;}
  function dimTextSize(){ return 10; }
  function shapeColor(){ return '#ffb454'; }
  function layerOf(){ return {visible:true, color:'#ff6b6b'}; }
  function buildDrawnModifiedPaths(){ return []; }
  function buildModifiedPaths(){ return []; }
  var drawnLines=[], dimensions=[], texts=[];
  var DIM_RATIO={arrow:0.30, arrowW:0.10, over:0.20, gap:0.10, pad:0.15, lw:0.05};
  var DIM_HALO_RATIO=0.22, TEXT_LINE_H=1.35;
`, sbP);
vm.runInContext(read('js/io/raster.js'), sbP, { filename: 'raster.js' });
sbP.__d = DIM;
vm.runInContext('dimensions = [__d]; exportPNG();', sbP);

const rec = sbP.__canvases[0];
t('PNG eksport canvas yaratdi', !!rec);
const segP = rec && longestSeg(rec.ctx.ops);

// piksel → dunyo (raster.js dagi tx ning teskarisi)
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
[DIM.p1, DIM.p2, DIM.place].forEach(p => {
  minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
  maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
});
const pad = 40, w = maxX - minX, h = maxY - minY;
const sc = Math.min(1600 / w, 1600 / h, 8);
const ch = Math.ceil(h * sc) + pad * 2;
const inv = p => ({ x: (p.x - pad) / sc + minX, y: (ch - pad - p.y) / sc + minY });
const pngWorld = segP && { a: inv(segP.a), b: inv(segP.b) };

console.log('\n===== 1. ALIGNED o\'lchov: ekran ↔ PNG joylashuvi =====');
const near = (a, b, tol) => a && b &&
  Math.abs(a.x - b.x) < (tol || 0.01) && Math.abs(a.y - b.y) < (tol || 0.01);

// juftliklar teskari tartibda bo'lishi mumkin — ikkalasini ham sinaymiz
const same = screenWorld && pngWorld &&
  ((near(screenWorld.a, pngWorld.a) && near(screenWorld.b, pngWorld.b)) ||
   (near(screenWorld.a, pngWorld.b) && near(screenWorld.b, pngWorld.a)));

console.log('   ekran  :', JSON.stringify(screenWorld));
console.log('   PNG    :', JSON.stringify(pngWorld));
t('o\'lchov chizig\'i AYNAN bir xil dunyo koordinatasida', same);

// Nazorat: `place` haqiqatan hisobga olinyaptimi? (bug bo'lsa chiziq p1→p2 bo'lardi)
const naive = near(pngWorld && pngWorld.a, DIM.p1, 0.5) && near(pngWorld && pngWorld.b, DIM.p2, 0.5);
t('PNG endi p1→p2 ga tushib qolmayapti (place hisobga olindi)', !naive,
  naive ? 'chiziq hamon p1→p2 orasida' : '');

// Kutilgan qiymat: p1/p2 ning `place` orqali o'tuvchi chiziqqa proyeksiyasi
const dd = { x: DIM.p2.x - DIM.p1.x, y: DIM.p2.y - DIM.p1.y };
const L = Math.hypot(dd.x, dd.y);
const dir = { x: dd.x / L, y: dd.y / L };
const proj = p => {
  const rel = { x: p.x - DIM.place.x, y: p.y - DIM.place.y };
  const tt = rel.x * dir.x + rel.y * dir.y;
  return { x: DIM.place.x + dir.x * tt, y: DIM.place.y + dir.y * tt };
};
const e1 = proj(DIM.p1), e2 = proj(DIM.p2);
t('PNG nazariy proyeksiyaga mos',
  pngWorld && ((near(pngWorld.a, e1, 0.05) && near(pngWorld.b, e2, 0.05)) ||
               (near(pngWorld.a, e2, 0.05) && near(pngWorld.b, e1, 0.05))),
  JSON.stringify([e1, e2]));

// ---------- gorizontal/vertikal regressiya ----------
console.log('\n===== 2. H / V o\'lchovlar regressiyasi =====');
['h', 'v'].forEach(kind => {
  const D = { kind, p1:{x:0,y:0}, p2:{x:300,y:200}, place:{x:60,y:140}, textSize:10, prec:1, unit:'mm' };

  const s2 = makeSandbox();
  vm.runInContext(`
    function sub(a,b){return{x:a.x-b.x,y:a.y-b.y};} function add(a,b){return{x:a.x+b.x,y:a.y+b.y};}
    function len(v){return Math.hypot(v.x,v.y);} function dot(a,b){return a.x*b.x+a.y*b.y;}
    function dimTextSize(){return 10;}
    var dimensions=[],drawnLines=[],polygons=[],corners=[],refImages=[],dimTool=null,dimPts=[];
  `, s2);
  vm.runInContext(read('js/ui/render.js'), s2);
  const c2 = s2.__screenCtx; s2.__d = D;
  vm.runInContext('drawOneDimension(__d,false);', s2);
  const sw = longestSeg(c2.ops);
  const swW = { a:{x:sw.a.x,y:-sw.a.y}, b:{x:sw.b.x,y:-sw.b.y} };

  const s3 = makeSandbox();
  vm.runInContext(`
    function sub(a,b){return{x:a.x-b.x,y:a.y-b.y};} function len(v){return Math.hypot(v.x,v.y);}
    function dot(a,b){return a.x*b.x+a.y*b.y;} function dimTextSize(){return 10;}
    function shapeColor(){return '#ffb454';} function layerOf(){return{visible:true,color:'#f00'};}
    function buildDrawnModifiedPaths(){return [];} function buildModifiedPaths(){return [];}
    var drawnLines=[],dimensions=[],texts=[];
    var DIM_RATIO={arrow:0.30,arrowW:0.10,over:0.20,gap:0.10,pad:0.15,lw:0.05};
    var DIM_HALO_RATIO=0.22, TEXT_LINE_H=1.35;
  `, s3);
  vm.runInContext(read('js/io/raster.js'), s3);
  s3.__d = D;
  vm.runInContext('dimensions=[__d]; exportPNG();', s3);
  const pw = longestSeg(s3.__canvases[0].ctx.ops);
  const pwW = { a: inv(pw.a), b: inv(pw.b) };

  const ok = (near(swW.a, pwW.a, 0.05) && near(swW.b, pwW.b, 0.05)) ||
             (near(swW.a, pwW.b, 0.05) && near(swW.b, pwW.a, 0.05));
  t('kind=' + kind + ' → ekran va PNG mos', ok,
    'ekran ' + JSON.stringify(swW) + ' vs png ' + JSON.stringify(pwW));
});

// ---------- oq quti yo'qolganini tekshirish ----------
console.log('\n===== 3. Yorliq foni: katta oq quti o\'rniga halo =====');
const rasterSrc = read('js/io/raster.js');
const renderSrc = read('js/ui/render.js');
t('PNG da yorliq ortidagi fillRect olib tashlandi',
  !/fillStyle\s*=\s*HALO;\s*c\.fillRect/.test(rasterSrc));
t('PNG da harf konturi bo\'ylab strokeText ishlatiladi',
  /strokeStyle\s*=\s*HALO/.test(rasterSrc) && /strokeText/.test(rasterSrc));
t('Ekranda ham to\'la to\'rtburchak fon olib tashlandi',
  !/fillRect\(-tw\/2/.test(renderSrc) && !/fillRect\(tp\.x-tw\/2/.test(renderSrc));
t('Ekranda haloText() yordamchisi bor', /function haloText\(/.test(renderSrc));

// ---------- matn asbobi ----------
console.log('\n===== 4. Matn (Text) asbobi =====');
const sbT = makeSandbox();
vm.runInContext(`
  var view={scale:2, ox:0, oy:0};
  function toScreen(p){ return {x:p.x*view.scale, y:-p.y*view.scale}; }
  function toWorld(x,y){ return {x:x/view.scale, y:-y/view.scale}; }
  function layerOf(){ return {visible:true, locked:false, color:'#ff6b6b'}; }
  function pushHistory(){ globalThis.__pushed=(globalThis.__pushed||0)+1; }
  function draw(){}
  var activeLayer='cut', activeColor=null, __pushed=0;
  var ctx={ save(){}, restore(){}, translate(){}, rotate(){}, strokeText(){}, fillText(){},
            strokeRect(){}, setLineDash(){}, measureText:(s)=>({width:String(s).length*6}),
            font:'', fillStyle:'', strokeStyle:'', lineWidth:1, textAlign:'', textBaseline:'',
            lineJoin:'', lineCap:'' };
`, sbT);
vm.runInContext(read('js/tools/text.js'), sbT, { filename: 'text.js' });
const T = new Proxy({}, { get: (_, k) => vm.runInContext(String(k), sbT) });

vm.runInContext(`
  texts.push({id:'t1', x:100, y:50, text:'Qalinlik 18 mm', size:10, rot:0,
              color:null, layer:'cut', selected:false});
`, sbT);
t('matn qo\'shildi', T.texts.length === 1);

// urish sinovi: matn boshlanish nuqtasi ekranda (200, -100)
let hit = vm.runInContext('findTextNear(205, -95)', sbT);
t('matn ustiga bosilganda topiladi', !!hit, JSON.stringify(hit));
let miss = vm.runInContext('findTextNear(900, 900)', sbT);
t('uzoqdagi bosish matnni topmaydi', miss === null);

// tanlash + sudrash
vm.runInContext('textMouseDown(205, -95, {});', sbT);
t('bosilganda tanlanadi', T.texts[0].selected === true);
vm.runInContext('textMouseMove(305, -95);', sbT);
const moved = T.texts[0];
t('sudralganda X 50 mm ga suriladi (scale=2 → 100px)',
  Math.abs(moved.x - 150) < 1e-6, 'x=' + moved.x);
t('sudralganda Y o\'zgarmaydi', Math.abs(moved.y - 50) < 1e-6, 'y=' + moved.y);
const before = T.__pushed;
vm.runInContext('textMouseUp();', sbT);
t('sudrash tugagach tarixga yoziladi (undo ishlaydi)', T.__pushed === before + 1);

// ko'p qatorli matn
vm.runInContext(`texts.push({id:'t2', x:0, y:0, text:'A\\nBB\\nCCC', size:10, rot:0, layer:'cut'});`, sbT);
const b = vm.runInContext('textWorldBounds(texts[1])', sbT);
t('3 qatorli matn balandligi ≈ 3×10×1.35', Math.abs((b.y1 - b.y0) - 40.5) < 0.01,
  'h=' + (b.y1 - b.y0).toFixed(2));

// o'chirish
vm.runInContext('texts.forEach(t=>t.selected=true);', sbT);
const del = vm.runInContext('deleteSelectedTexts()', sbT);
t('tanlangan matnlar o\'chiriladi', del === 2 && T.texts.length === 0);

// boshqa asbob ishlayotganda matn bosishni ushlamasligi
vm.runInContext(`
  texts.push({id:'t9', x:100, y:50, text:'Test', size:10, rot:0, layer:'cut', selected:false});
  var dimTool='aligned';
`, sbT);
t('Dim asbobi yoqilganda matn bosishni USHLAMAYDI',
  vm.runInContext('textMouseDown(205,-95,{})', sbT) === false);
vm.runInContext('dimTool=null; var drawTool="line";', sbT);
t('Chizish asbobi yoqilganda ham ushlamaydi',
  vm.runInContext('textMouseDown(205,-95,{})', sbT) === false);
vm.runInContext('drawTool="none";', sbT);
t('Asbob yo\'q bo\'lsa matn tanlanadi',
  vm.runInContext('textMouseDown(205,-95,{})', sbT) === true);
vm.runInContext('draggingText=null; texts=[];', sbT);

// ---------- integratsiya ----------
console.log('\n===== 5. Integratsiya nuqtalari =====');
const files = {
  'render.js (chizish)':      ['js/ui/render.js', /drawTexts\(\)/],
  'input-mouse.js (bosish)':  ['js/ui/input-mouse.js', /textMouseDown\(/],
  'input-drag.js (sudrash)':  ['js/ui/input-drag.js', /textMouseMove\(/],
  'panels-draw.js (dblclick)':['js/ui/panels-draw.js', /textDblClick\(/],
  'state.js (undo/redo)':     ['js/model/state.js', /texts/],
  'raster.js (PNG)':          ['js/io/raster.js', /texts/],
  'app.js (tugmalar)':        ['js/app.js', /textAddBtn/],
  'index.html (UI + skript)': ['index.html', /tools\/text\.js/],
};
Object.entries(files).forEach(([label, [f, re]]) => {
  t(label + ' ulandi', re.test(read(f)));
});


// ---------- DXF TEXT haqiqiy chiqishi ----------
console.log('\n===== 6. DXF eksport: TEXT entity =====');
const sbD = makeSandbox();
vm.runInContext(`
  function layerOf(){ return {id:'cut', name:'Cut', aci:1, color:'#ff6b6b', visible:true}; }
  function shapeColor(){ return '#ff6b6b'; }
  function buildModifiedPaths(){ return []; }
  function buildDrawnModifiedPaths(){ return []; }
  function segArcInfo(){ return null; }
  var drawnLines=[], layers=[{id:'cut',name:'Cut',aci:1,color:'#ff6b6b',visible:true}];
  var TEXT_LINE_H=1.35;
  var COLOR_PALETTE=[{name:'red', hex:'#ff6b6b', aci:1}];
  var texts=[{id:'t1', x:25, y:60, text:'Qalinlik 18 mm\\nKesish: 3000', size:8, rot:30,
              color:'#ff6b6b', layer:'cut'}];
`, sbD);
vm.runInContext(read('js/io/dxf-export.js'), sbD, { filename:'dxf-export.js' });
const dxf = vm.runInContext('buildDXF()', sbD);
t('DXF da TEXT entity bor', /\n0\nTEXT\n/.test(dxf));
t('ikki qator → ikkita TEXT', (dxf.match(/\n0\nTEXT\n/g)||[]).length === 2,
  'topildi: ' + (dxf.match(/\n0\nTEXT\n/g)||[]).length);
t('matn balandligi (40) yozildi', /\n40\n8\n/.test(dxf));
t('burilish burchagi (50) yozildi', /\n50\n30\n/.test(dxf));
t('matn mazmuni yozildi', dxf.includes('Qalinlik 18 mm') && dxf.includes('Kesish: 3000'));
t('DXF to\'g\'ri yakunlanadi', dxf.trim().endsWith('EOF'));

console.log('\n' + (fails ? '❌ ' + fails + ' ta test yiqildi' : '✅ Barcha testlar o\'tdi'));
process.exit(fails ? 1 : 0);
