const fs=require('fs'), vm=require('vm');
const APP=require('path').join(__dirname, 'app', '')+'/';
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};
const read=f=>fs.readFileSync(APP+f,'utf8');

console.log('=== 1. Raqam maydonlari: vergul va barqarorlik ===');
const html=read('index.html');
t('type="number" umuman qolmadi', !html.includes('type="number"'),
  (html.match(/type="number"/g)||[]).length+' ta qoldi');
t('25+ maydon inputmode=decimal', (html.match(/inputmode="decimal"/g)||[]).length>=25,
  (html.match(/inputmode="decimal"/g)||[]).length+' ta');

const sb={console,Math,parseFloat,isFinite,String,Number};
sb.globalThis=sb; vm.createContext(sb);
vm.runInContext(read('js/geometry/core.js'), sb);
const pn=(v,f)=>{sb.__v=v; sb.__f=f; return vm.runInContext('parseNum(__v,__f)',sb);};
[["10,5 → 10.5","10,5",10.5],["10.5 → 10.5","10.5",10.5],["-1,8","-1,8",-1.8],
 ["bo'sh → fallback","",99],["faqat '-' → fallback","-",99],["'.' → fallback",".",99]
].forEach(([nm,v,exp])=>{
  t(nm, Math.abs(pn(v,99)-exp)<1e-9, 'olindi '+pn(v,99));
});

console.log('\n  Maydon o\'qiydigan funksiyalar parseNum ishlatadimi:');
[['js/tools/dimension.js','dimTextSize'],
 ['js/tools/fillet.js','filletRadius'],
 ['js/tools/text.js','textSizeInput'],
 ['js/ui/panels-layers.js','safeNum'],
 ['js/ui/render.js','drawWorldGrid']].forEach(([f,fn])=>{
  const src=read(f);
  const i=src.indexOf('function '+fn);
  const body=src.slice(i, i+500);
  t('  '+fn, /parseNum\(/.test(body), 'hali parseFloat ishlatadi');
});

console.log('\n=== 2. Fokus buzilishi ("ba\'zan qabul qilmaydi") ===');
const pl=read('js/ui/panels-list.js');
t('renderList fokusni eslab qoladi', /const ae = document\.activeElement/.test(pl));
t('kursor o\'rni saqlanadi', /selectionStart/.test(pl) && /setSelectionRange/.test(pl));
t('yozilayotgan qiymat saqlanadi', /sel\.value = restore\.val/.test(pl));
t('fokus qaytariladi', /sel\.focus\(\)/.test(pl));

console.log('\n=== 3. GRID o\'chirish / yoqish ===');
const th=read('js/ui/theme.js');
const rd=read('js/ui/render.js');
t('gridVisible o\'zgaruvchisi', /let gridVisible/.test(th));
t('toggleGrid funksiyasi', /function toggleGrid/.test(th));
t('drawWorldGrid tekshiradi', /!gridVisible\) return/.test(rd));
t('UI katakchasi', html.includes('id="gridToggle"'));
// YANGILANDI: G polygon uchun band edi, grid H ga ko'chirildi
t('sozlama eslab qolinadi', /localStorage\.setItem\('rugby\.grid'/.test(th));

console.log('\n=== 4. MAVZULAR ===');
const sb2={console,Math,parseInt,parseFloat,Object,String,
  document:{documentElement:{style:{setProperty(){}}},
            body:{classList:{toggle(){}}},
            getElementById:()=>null, createElement:()=>({})},
  localStorage:{getItem:()=>null,setItem(){}}};
sb2.globalThis=sb2; vm.createContext(sb2);
vm.runInContext(th, sb2);
const keys=vm.runInContext('Object.keys(THEMES)', sb2);
t('5 ta mavzu', keys.length===5, keys.join(', '));
console.log('   '+keys.map(k=>vm.runInContext('THEMES["'+k+'"].name',sb2)).join(' · '));

[['light',true],['dark',false],['black',false],['grey',false],['blueprint',false]]
.forEach(([k,exp])=>{
  vm.runInContext('currentTheme="'+k+'"', sb2);
  t('  '+k+' → '+(exp?"yorug'":"to'q"), vm.runInContext('themeIsLight()',sb2)===exp);
});
t('har mavzuda kanvas+grid+ui rangi bor',
  keys.every(k=>vm.runInContext(
    '!!(THEMES["'+k+'"].canvas && THEMES["'+k+'"].gridMinor && THEMES["'+k+'"].ui)',sb2)));
t('render fon rangini mavzudan oladi', /ctx\.fillStyle = themeDef\(\)\.canvas/.test(rd));
t('grid rangi mavzudan', /themeDef\(\)\.gridMinor/.test(rd) && /themeDef\(\)\.gridMajor/.test(rd));
t('halo rangi mavzuga ergashadi', /function DIM_HALO_COLOR/.test(rd));
t('UI select', html.includes('id="themeSel"'));
t('yorug\' mavzu CSS', read('css/style.css').includes('body.lightTheme'));
t('sozlama eslab qolinadi', /localStorage\.setItem\('rugby\.theme'/.test(th));
t('theme.js yuklanadi', html.includes('js/ui/theme.js'));
t('app.js da ulangan', /wireTheme\(\)/.test(read('js/app.js')));

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
