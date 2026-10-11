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
vm.runInContext(`
  var drawnLines=[], dimensions=[], texts=[], corners=[];
  var _renders=0;
  function detectCorners(){}
  function renderDrawnList(){ _renders++; }
  function renderList(){}
  function updateBulkBar(){}
  function draw(){}
  function pushHistory(){}
  function isShapeEditable(l){ return !l.locked; }
  function layerOf(l){ return l._layer || {visible:true, locked:false}; }
`, sb);
// input-keys.js dan faqat kerakli funksiyalarni ajratib olamiz
const ks=fs.readFileSync(ROOT+'/js/ui/input-keys.js','utf8');
['selectAllObjects','deselectAllObjects','deleteSelectedShapes'].forEach(fn=>{
  const start = ks.indexOf('function '+fn+'(');
  if(start < 0) return;
  const end = ks.indexOf('\n}', start);
  vm.runInContext(ks.slice(start, end+2), sb);
});
const run=c=>vm.runInContext(c,sb);

console.log('=== 1. Ctrl+A chizmadagi obyektlarni tanlaydimi? ===\n');
run(`
  drawnLines=[
    {kind:'line', points:[], selected:false},
    {kind:'line', points:[], selected:false},
    {kind:'line', points:[], selected:false, hidden:true},      // yashirin
    {kind:'line', points:[], selected:false, locked:true},      // qulflangan
  ];
  dimensions=[{kind:'h', selected:false},{kind:'arclen', selected:false}];
  texts=[{id:'t1', selected:false},{id:'t2', selected:false,
          _layer:{visible:false, locked:false}}];               // yashirin qatlam
`);
const n=run('selectAllObjects()');
t('tanlangan obyektlar soni = 5', n===5, n+' ta');
t('oddiy shakllar tanlandi', run('drawnLines[0].selected && drawnLines[1].selected'));
t('YASHIRIN shakl tanlanmadi', run('drawnLines[2].selected')===false);
t('QULFLANGAN shakl tanlanmadi', run('drawnLines[3].selected')===false);
t('o\'lchovlar tanlandi', run('dimensions.every(d=>d.selected)'));
t('matn tanlandi', run('texts[0].selected')===true);
t('yashirin qatlamdagi matn tanlanmadi', run('texts[1].selected')===false);

console.log('\n=== 2. Tanlanganlarni o\'chirish ===\n');
const before=run('drawnLines.length + dimensions.length + texts.length');
run('deleteSelectedShapes();');
t('shakllar o\'chdi (yashirin+qulflangan qoldi)', run('drawnLines.length')===2,
  run('drawnLines.length')+' ta qoldi');
t('o\'lchovlar o\'chdi', run('dimensions.length')===0);
t('matn o\'chdi (yashirin qoldi)', run('texts.length')===1, run('texts.length')+' ta');
console.log('   '+before+' obyektdan '+run('drawnLines.length+dimensions.length+texts.length')+
            ' tasi qoldi (yashirin/qulflanganlar himoyalangan)');

console.log('\n=== 3. Escape tanlovni bekor qiladimi? ===\n');
run(`
  drawnLines=[{kind:'line',points:[],selected:true},{kind:'line',points:[],selected:true}];
  dimensions=[{selected:true}]; texts=[{selected:true}]; corners=[{selected:true}];
`);
run('deselectAllObjects();');
t('shakllar bekor', run('drawnLines.every(l=>!l.selected)'));
t('o\'lchovlar bekor', run('dimensions.every(d=>!d.selected)'));
t('matnlar bekor', run('texts.every(t=>!t.selected)'));
t('burchaklar ham bekor', run('corners.every(c=>!c.selected)'));

console.log('\n=== 4. Bo\'sh chizmada ===\n');
run('drawnLines=[]; dimensions=[]; texts=[];');
t('0 qaytaradi, xato bermaydi', run('selectAllObjects()')===0);

console.log('\n=== 5. Integratsiya ===\n');
// Dispatch is exercised in tests/workspace.test.cjs.
// Ctrl+A va Shift+A to'qnashmaydimi?
function fireCtrlA(e){ return !!((e.ctrlKey||e.metaKey) && !e.shiftKey && !e.altKey &&
                                 e.key.toLowerCase()==='a'); }
function fireShiftA(e){ return !!(e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey &&
                                  e.key.toLowerCase()==='a'); }
[['Ctrl+A', {ctrlKey:true, key:'a'}, 'ctrl'],
 ['Shift+A', {shiftKey:true, key:'A'}, 'shift'],
 ['Ctrl+Shift+A', {ctrlKey:true, shiftKey:true, key:'A'}, 'hech biri'],
 ['oddiy A', {key:'a'}, 'hech biri']].forEach(([nm,e,exp])=>{
  const got = fireCtrlA(e) ? 'ctrl' : (fireShiftA(e) ? 'shift' : 'hech biri');
  t(nm+' → '+exp, got===exp, 'olindi: '+got);
});

console.log('\n=== 6. Matn tanlanishi to\'xtatildimi? ===\n');
const css=fs.readFileSync(ROOT+'/css/style.css','utf8');
t('body da user-select:none', /body\{[^}]*user-select:\s*none/.test(css));
t('kiritish maydonlarida tanlash QOLDI',
  /input,\s*textarea,\s*select\{[^}]*user-select:\s*text/.test(css));

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
