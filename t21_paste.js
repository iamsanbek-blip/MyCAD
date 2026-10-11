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
  var view={scale:1,ox:0,oy:0};
  var ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
           stroke(){},setLineDash(){},arc(){},fill(){},
           strokeStyle:'',lineWidth:1,fillStyle:''};
  function toScreen(p){ return {x:p.x, y:-p.y}; }
  function draw(){} function renderDrawnList(){} function renderList(){}
  function pushHistory(){} function sanitizeDrawnLines(){}
  function detectCorners(){} function finishTransform(){}
  function isShapeEditable(){ return true; }
  function layerOf(){ return {visible:true, locked:false, color:'#f00'}; }
  function compactShape(l){ return JSON.parse(JSON.stringify(l)); }
  function expandShape(l){ return l; }
  var groupSeq=1;
  function newGroupId(){ return 'g'+(groupSeq++); }
`, sb);
load('js/tools/align.js');       // shapeBBox shu yerda
load('js/tools/clipboard.js');
const run=c=>vm.runInContext(c,sb);

// --- sinov shakli: 100x60 to'rtburchak, (200,300) da ---
function mkRect(x,y,w,h){
  const pts=[{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+h},{x:x,y:y+h}];
  return {kind:'line', layer:'cut', closed:true, selected:true,
          points:JSON.parse(JSON.stringify(pts)),
          grips:JSON.parse(JSON.stringify(pts))};
}

console.log('=== 1. Ctrl+V endi interaktiv rejimga o\'tadimi? ===\n');
sb.__r = mkRect(200,300,100,60);
run('drawnLines=[__r];');
run('copySelected(false);');
t('nusxa buferga olindi', run('clipboard.length')===1);
t('boshida joylashtirish rejimi O\'CHIQ', run('pasteMode')===false);

run('startPastePlace();');
t('Ctrl+V → rejim YONDI', run('pasteMode')===true);
t('shakl hali qo\'shilmadi (faqat ko\'rinish)', run('drawnLines.length')===1);
const base=run('JSON.parse(JSON.stringify(pastePreview.base))');
t('bazaviy nuqta = markaz (250, 330)',
  Math.abs(base.x-250)<1e-9 && Math.abs(base.y-330)<1e-9,
  '('+base.x+', '+base.y+')');

console.log('\n=== 2. Bosilgan joyga AYNAN tushadimi? ===\n');
[[0,0],[1000,500],[-300,-200],[777.5,-123.25]].forEach(([tx,ty])=>{
  sb.__r2 = mkRect(200,300,100,60);
  run('drawnLines=[__r2]; clipboard=[]; copySelected(false); startPastePlace();');
  sb.__pt={x:tx,y:ty};
  run('commitPastePlace(__pt);');
  const added=run('JSON.parse(JSON.stringify(drawnLines[drawnLines.length-1].points))');
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  added.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);});
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  t('('+tx+', '+ty+') ga qo\'yildi → markaz aynan shu yerda',
    Math.abs(cx-tx)<1e-9 && Math.abs(cy-ty)<1e-9,
    'markaz ('+cx+', '+cy+')');
});

console.log('\n=== 3. O\'lcham va shakl buzilmaydimi? ===\n');
sb.__r3 = mkRect(200,300,100,60);
run('drawnLines=[__r3]; clipboard=[]; copySelected(false); startPastePlace();');
sb.__pt={x:0,y:0};
run('commitPastePlace(__pt);');
const nw=run('JSON.parse(JSON.stringify(drawnLines[drawnLines.length-1]))');
let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
nw.points.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);});
t('kenglik 100 saqlandi', Math.abs((x1-x0)-100)<1e-9, (x1-x0).toFixed(4));
t('balandlik 60 saqlandi', Math.abs((y1-y0)-60)<1e-9, (y1-y0).toFixed(4));
t('nuqta soni bir xil', nw.points.length===4, nw.points.length+' ta');
t('grips ham ko\'chdi', nw.grips && Math.abs(nw.grips[0].x-(-50))<1e-9,
  nw.grips? JSON.stringify(nw.grips[0]) : 'yo\'q');
t('yangi shakl TANLANGAN', nw.selected===true);
t('asl shakl tanlovdan chiqdi', run('drawnLines[0].selected')===false);

console.log('\n=== 4. Rejim to\'g\'ri yopiladimi? ===\n');
t('qo\'yilgach rejim o\'chdi', run('pasteMode')===false);
t('ko\'rinish tozalandi', run('pastePreview')===null);
run('startPastePlace(); cancelPastePlace();');
t('Esc → rejim o\'chdi', run('pasteMode')===false);
t('Esc → shakl qo\'shilmadi', run('drawnLines.length')===2,
  run('drawnLines.length')+' ta');

console.log('\n=== 5. Bir nechta shakl birga ===\n');
sb.__a=mkRect(0,0,50,50); sb.__b=mkRect(100,0,50,50);
run('drawnLines=[__a,__b]; __a.selected=true; __b.selected=true; clipboard=[]; copySelected(false);');
t('2 ta shakl buferda', run('clipboard.length')===2);
run('startPastePlace();');
const b2=run('JSON.parse(JSON.stringify(pastePreview.base))');
t('umumiy markaz (75, 25)', Math.abs(b2.x-75)<1e-9 && Math.abs(b2.y-25)<1e-9,
  '('+b2.x+', '+b2.y+')');
sb.__pt={x:500,y:500};
run('commitPastePlace(__pt);');
t('ikkalasi ham qo\'shildi', run('drawnLines.length')===4);
const g1=run('drawnLines[2].group'), g2=run('drawnLines[3].group');
t('guruhsiz shakllar guruhsiz qoldi', !g1 && !g2);

console.log('\n=== 6. Guruh yangi ID oladimi? ===\n');
sb.__g1=mkRect(0,0,40,40); sb.__g2=mkRect(50,0,40,40);
run(`__g1.group='gOLD'; __g2.group='gOLD';
     drawnLines=[__g1,__g2]; __g1.selected=true; __g2.selected=true;
     clipboard=[]; copySelected(false); startPastePlace();`);
sb.__pt={x:900,y:900};
run('commitPastePlace(__pt);');
const ng1=run('drawnLines[2].group'), ng2=run('drawnLines[3].group');
t('nusxa YANGI guruh ID oldi', ng1 && ng1!=='gOLD', ng1);
t('ikkalasi BITTA guruhda', ng1===ng2, ng1+' vs '+ng2);
t('asl guruh o\'zgarmadi', run('drawnLines[0].group')==='gOLD');

console.log('\n=== 7. Integratsiya ===\n');
const ks=fs.readFileSync(ROOT+'/js/ui/input-keys.js','utf8');
// Ctrl+Shift+V is exercised through the command registry in workspace.test.cjs.
t('Esc → cancelPastePlace', /pasteMode && e\.key==='Escape'[\s\S]{0,60}cancelPastePlace/.test(ks));
const ms=fs.readFileSync(ROOT+'/js/ui/input-mouse.js','utf8');
t('bosish → commitPastePlace', /pasteMode[\s\S]{0,200}commitPastePlace/.test(ms));
t('snap ishlatiladi', /pasteMode[\s\S]{0,200}findSnapCandidate/.test(ms));
const rs=fs.readFileSync(ROOT+'/js/ui/render.js','utf8');
t('ko\'rinish chiziladi', /drawPastePreview\(\)/.test(rs));

// tartib: joylashtirish boshqa asboblardan oldin
const iPaste=ms.indexOf('pasteMode'), iFillet=ms.indexOf('filletMode');
t('joylashtirish fillet/offsetdan OLDIN', iPaste>0 && iPaste<iFillet,
  'paste@'+iPaste+' fillet@'+iFillet);

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
