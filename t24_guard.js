const fs=require('fs'), vm=require('vm');
const APP=require('path').join(__dirname, 'app', '')+'/';
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};
const read=f=>fs.readFileSync(APP+f,'utf8');

console.log('=== 1. HODISA IZOLYATSIYASI ===\n');
const g=read('js/ui/input-guard.js');
['keydown','keyup','keypress'].forEach(ev=>{
  t(ev+' izolyatsiya qilinadi', new RegExp("'"+ev+"'").test(g));
});
// MUHIM: sichqoncha hodisalari ATAYLAB to'xtatilmaydi — aks holda kanvasda
// sudrab, maydon ustida qo'yib yuborilganda mouseup yo'qoladi va holat qotadi.
t('mouseup izolyatsiya QILINMAYDI', !/KEY_EVENTS[\s\S]{0,200}'mouseup'/.test(g));
t('sudrash kafolati bor', /function wireDragSafetyNet/.test(g));
t('mouseup dan keyin tekshiriladi', /window\.addEventListener\('mouseup'[\s\S]{0,900}resetInteractionState/.test(g));
t('tugmasiz harakatda ham tozalanadi', /e\.buttons !== 0[\s\S]{0,900}resetInteractionState/.test(g));
t('stopPropagation chaqiriladi', /e\.stopPropagation\(\)/.test(g));
t('CAPTURE bosqichida (true)', /addEventListener\(type,[\s\S]{0,400}\}, true\)/.test(g));
t('Esc va Enter o\'tkaziladi', /e\.key==='Escape' \|\| e\.key==='Enter'/.test(g));
t('Ctrl buyruqlari o\'tkaziladi', /if\(e\.ctrlKey \|\| e\.metaKey\) return/.test(g));
t('eval ishlatilmaydi', !/\beval\(/.test(g));

// izolyatsiya mantiqini simulyatsiya
function isolated(target, type, e){
  const isField = ['INPUT','SELECT','TEXTAREA'].includes(target);
  if(!isField) return false;
  if(type.startsWith('key') && (e.key==='Escape'||e.key==='Enter')) return false;
  if(e.ctrlKey||e.metaKey) return false;
  return true;   // stopPropagation
}
console.log('');
[['INPUT + "5" yozish','INPUT','keydown',{key:'5'},true],
 ['INPUT + Escape','INPUT','keydown',{key:'Escape'},false],
 ['INPUT + Ctrl+S','INPUT','keydown',{key:'s',ctrlKey:true},false],
 ['CANVAS + "5"','CANVAS','keydown',{key:'5'},false],
].forEach(([nm,tg,ty,e,exp])=>{
  t(nm+' → '+(exp?'to\'xtatiladi':'o\'tkaziladi'), isolated(tg,ty,e)===exp);
});

console.log('\n=== 2. HOTKEY HIMOYASI ===\n');
const ks=read('js/ui/input-keys.js');
t('modifikatorsiz klavish bloklanadi',
  /if\(inField && !e\.ctrlKey && !e\.metaKey && !e\.altKey\)\{[\s\S]{0,300}return;/.test(ks));
t('Esc maydondan chiqaradi', /e\.key === 'Escape'[\s\S]{0,120}blur\(\)/.test(ks));
t('inInputField() ishlatiladi', /inInputField\(\)/.test(ks));

function hotkeyBlocked(inField, e){
  return !!(inField && !e.ctrlKey && !e.metaKey && !e.altKey);
}
console.log('');
[['maydonda "l" (line hotkey)', true, {key:'l'}, true],
 ['maydonda Ctrl+S', true, {key:'s',ctrlKey:true}, false],
 ['maydonda Ctrl+Z', true, {key:'z',ctrlKey:true}, false],
 ['kanvasda "l"', false, {key:'l'}, false],
].forEach(([nm,f,e,exp])=>{
  t(nm+' → '+(exp?'bloklanadi':'o\'tadi'), hotkeyBlocked(f,e)===exp);
});

console.log('\n=== 3. FOKUS RESET (qotib qolgan holat) ===\n');
t('window blur ushlanadi', /window\.addEventListener\('blur'/.test(g));
t('visibilitychange ushlanadi', /visibilitychange/.test(g));
t('mouseleave ushlanadi', /'mouseleave'/.test(g));
t('focusin da ham tozalanadi', /'focusin'[\s\S]{0,200}resetInteractionState/.test(g));

// reset barcha muhim bayroqlarni qamrab oladimi?
const flags=['panning','selecting','draggingGrip','dragMoved','mouseDownPos',
             'mouseDownCorner','mouseDownModKey','pendingLineClickIdx',
             'draggingText','stretchBoxing','pendingMirrorKey'];
flags.forEach(f=>t('  '+f+' tozalanadi', new RegExp('\\b'+f+'\\b').test(g)));

// funksional sinov
const _raf=[];
const sb={console,setTimeout,requestAnimationFrame:(f)=>{_raf.push(f);},
  document:{addEventListener(){},activeElement:null,hidden:false},
  window:{addEventListener(){}}};
sb.globalThis=sb; vm.createContext(sb);
vm.runInContext(`
  var panning=true, selecting=true, draggingGrip={li:0,pi:1}, dragMoved=true,
      mouseDownPos={x:1,y:2}, mouseDownCorner={}, mouseDownModKey=true,
      pendingLineClickIdx=3, draggingText={id:'t'}, stretchBoxing=true,
      pendingMirrorKey=true;
  var _drawCalls=0;
  function draw(){ _drawCalls++; }
`, sb);
vm.runInContext(g.slice(g.indexOf('function resetInteractionState'),
                        g.indexOf('function wireFocusReset')), sb);
const cleared=vm.runInContext('resetInteractionState("test")', sb);
console.log('');
t('11 ta bayroq tozalandi', cleared.length===11, cleared.length+' ta: '+cleared.join(', '));
flags.forEach(f=>{
  const v=vm.runInContext(f, sb);
  const ok = (v===false || v===null);
  if(!ok) t('  '+f+' → bo\'sh', false, String(v));
});
t('hammasi bo\'sh holatda', flags.every(f=>{
  const v=vm.runInContext(f,sb); return v===false||v===null; }));
t('tozalangach qayta chizadi', vm.runInContext('_drawCalls',sb)>0);
// ikkinchi marta — o'zgarish yo'q
const again=vm.runInContext('resetInteractionState("test2")', sb);
t('ikkinchi chaqiruvda hech narsa tozalanmaydi', again.length===0, again.length+' ta');

console.log('\n=== 4. QAYTA CHIZISH CHEKLOVI (debounce) ===\n');
t('requestRedraw funksiyasi bor', /function requestRedraw/.test(g));
t('requestAnimationFrame ishlatiladi', /requestAnimationFrame/.test(g));
const pl=read('js/ui/panels-list.js');
t('burchak radius maydoni requestRedraw ishlatadi',
  /size = safeSize[\s\S]{0,300}requestRedraw/.test(pl));
t('burchak extension maydoni ham', /c\.offset = Math\.max[\s\S]{0,120}requestRedraw/.test(pl));
t('bulkSize requestRedraw', /bulkTouched\.size=true[\s\S]{0,400}requestRedraw/.test(pl));
t('bulkOffset requestRedraw', /bulkTouched\.offset=true[\s\S]{0,500}requestRedraw/.test(pl));

// eng muhimi: 'input' ichida renderList() QOLMADI
let bad=0;
const re=/addEventListener\('input'/g; let m;
while((m=re.exec(pl))!==null){
  const end=pl.indexOf('});', m.index);
  if(pl.slice(m.index,end).includes('renderList()')) bad++;
}
t('hech bir "input" ishlovchisi ro\'yxatni qayta qurmaydi', bad===0, bad+' ta qoldi');
t('ro\'yxat "change" da yangilanadi',
  /addEventListener\('change'[\s\S]{0,140}renderList\(\)/.test(pl));

// debounce sinovi
vm.runInContext(g.slice(g.indexOf('let _redrawQueued'), g.indexOf('function wireInputGuard')), sb);
vm.runInContext('_drawCalls=0;', sb);
_raf.length=0;
vm.runInContext('requestRedraw(); requestRedraw(); requestRedraw();', sb);
t('3 ta chaqiruv → 1 ta kadr navbatga qo\'yildi', _raf.length===1, _raf.length+' ta');
_raf.forEach(f=>f());                       // kadr keldi
t('kadr kelganda 1 marta chizildi', vm.runInContext('_drawCalls',sb)===1,
  vm.runInContext('_drawCalls',sb)+' marta');
_raf.length=0;
vm.runInContext('requestRedraw();', sb);
t('navbat bo\'shagach yana ishlaydi', _raf.length===1);

console.log('\n=== 4b. FOKUS KAFOLATI ===\n');
t('maydonga bosilganda holat tozalanadi', /field-mousedown/.test(g));
t('fokus ikki bosqichda beriladi', /setTimeout\(grab, 0\)[\s\S]{0,80}requestAnimationFrame\(grab\)/.test(g));
const css=read('css/style.css');
t('fokus uslubi ko\'rinadi', /input:focus[\s\S]{0,200}box-shadow/.test(css));

console.log('\n=== 5. Integratsiya ===\n');
const html=read('index.html');
t('input-guard.js yuklanadi', html.includes('js/ui/input-guard.js'));
t('input-keys.js dan OLDIN',
  html.indexOf('js/ui/input-guard.js') < html.indexOf('js/ui/input-keys.js'));
t('app.js da ulangan', /wireInputGuard\(\)/.test(read('js/app.js')));

console.log('\n=== 6. Chizish/eksportga tegilmadimi? ===\n');
['js/io/dxf-export.js','js/io/raster.js','js/geometry/offset.js',
 'js/geometry/segments.js','js/model/corners.js','js/tools/area.js'].forEach(f=>{
  const s=read(f);
  t(f.split('/').pop()+' o\'zgarmagan (guard kodi yo\'q)',
    !/wireInputGuard|resetInteractionState|stopPropagation/.test(s));
});

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
