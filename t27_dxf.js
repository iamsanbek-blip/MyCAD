const fs=require('fs'), vm=require('vm');
const APP=require('path').join(__dirname, 'app', '')+'/';
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};
const sb={console,Math,parseInt,parseFloat,isFinite,String,Array,Object,Error,JSON};
sb.globalThis=sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync(APP+'js/io/dxf-import.js','utf8'), sb);
const parse=(txt)=>{ sb.__t=txt; return vm.runInContext('parseDXF(__t)', sb); };

// ---- minimal DXF yasovchi ----
function dxf(entities, blocks, units){
  let s='0\nSECTION\n2\nHEADER\n';
  if(units!=null) s+='9\n$INSUNITS\n70\n'+units+'\n';
  s+='0\nENDSEC\n';
  if(blocks){ s+='0\nSECTION\n2\nBLOCKS\n'+blocks+'0\nENDSEC\n'; }
  s+='0\nSECTION\n2\nENTITIES\n'+entities+'0\nENDSEC\n0\nEOF\n';
  return s;
}
const bbox=(polys)=>{
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  polys.forEach(p=>p.points.forEach(q=>{x0=Math.min(x0,q.x);y0=Math.min(y0,q.y);
    x1=Math.max(x1,q.x);y1=Math.max(y1,q.y);}));
  return {x0,y0,x1,y1,w:x1-x0,h:y1-y0};
};

console.log('=== 1. Har bir element turi ===\n');

let p=parse(dxf('0\nLINE\n8\n0\n10\n0\n20\n0\n11\n100\n21\n50\n', null, 4));
t('LINE', p.length===1 && p[0].points.length===2, p.length+' shakl');
t('  koordinatalar', Math.abs(p[0].points[1].x-100)<1e-9 && Math.abs(p[0].points[1].y-50)<1e-9);

p=parse(dxf('0\nCIRCLE\n8\n0\n10\n10\n20\n20\n40\n5\n', null, 4));
t('CIRCLE', p.length===1 && p[0].closed);
t('  diametr 10', Math.abs(bbox(p).w-10)<0.05, bbox(p).w.toFixed(3));

p=parse(dxf('0\nARC\n8\n0\n10\n0\n20\n0\n40\n10\n50\n0\n51\n90\n', null, 4));
t('ARC', p.length===1 && !p[0].closed);
t('  chorak yoy', Math.abs(bbox(p).w-10)<0.1 && Math.abs(bbox(p).h-10)<0.1,
  bbox(p).w.toFixed(2)+'×'+bbox(p).h.toFixed(2));

p=parse(dxf('0\nLWPOLYLINE\n8\n0\n70\n1\n10\n0\n20\n0\n10\n10\n20\n0\n10\n10\n20\n10\n10\n0\n20\n10\n', null, 4));
t('LWPOLYLINE yopiq', p.length===1 && p[0].closed && p[0].points.length===4);

p=parse(dxf('0\nPOLYLINE\n8\n0\n70\n1\n0\nVERTEX\n10\n0\n20\n0\n0\nVERTEX\n10\n20\n20\n0\n0\nVERTEX\n10\n20\n20\n20\n0\nSEQEND\n', null, 4));
t('POLYLINE + VERTEX', p.length===1 && p[0].points.length===3, p.length?p[0].points.length+' nuqta':'yo\'q');
t('  yopiq bayrog\'i', p.length===1 && p[0].closed);

p=parse(dxf('0\nELLIPSE\n8\n0\n10\n0\n20\n0\n11\n20\n21\n0\n40\n0.5\n41\n0\n42\n6.283185307179586\n', null, 4));
t('ELLIPSE', p.length===1 && p[0].closed);
t('  40×20 mm', Math.abs(bbox(p).w-40)<0.2 && Math.abs(bbox(p).h-20)<0.2,
  bbox(p).w.toFixed(2)+'×'+bbox(p).h.toFixed(2));

p=parse(dxf('0\nPOINT\n8\n0\n10\n5\n20\n5\n', null, 4));
t('POINT (xoch belgisi)', p.length===2);

p=parse(dxf('0\nSOLID\n8\n0\n10\n0\n20\n0\n11\n10\n21\n0\n12\n0\n22\n10\n13\n10\n23\n10\n', null, 4));
t('SOLID', p.length===1 && p[0].closed && p[0].points.length>=3);

console.log('\n=== 2. SPLINE (NURBS) ===\n');
// to'g'ri chiziqli spline: 1-darajali, 2 nazorat nuqtasi
p=parse(dxf('0\nSPLINE\n8\n0\n71\n1\n40\n0\n40\n0\n40\n1\n40\n1\n10\n0\n20\n0\n10\n100\n20\n0\n', null, 4));
t('SPLINE 1-daraja (to\'g\'ri chiziq)', p.length===1, p.length+' shakl');
if(p.length){
  const b=bbox(p);
  t('  0..100 oralig\'ida', Math.abs(b.x0)<1e-6 && Math.abs(b.x1-100)<1e-6,
    b.x0.toFixed(3)+'..'+b.x1.toFixed(3));
  t('  y=0 da tekis', Math.abs(b.h)<1e-9, 'h='+b.h);
}
// 3-darajali spline, 4 nazorat nuqtasi
const sp3='0\nSPLINE\n8\n0\n71\n3\n'+
  ['0','0','0','0','1','1','1','1'].map(k=>'40\n'+k+'\n').join('')+
  '10\n0\n20\n0\n10\n0\n20\n100\n10\n100\n20\n100\n10\n100\n20\n0\n';
p=parse(dxf(sp3, null, 4));
t('SPLINE 3-daraja (Bezier)', p.length===1);
if(p.length){
  const pts=p[0].points, b=bbox(p);
  t('  boshi (0,0)', Math.hypot(pts[0].x, pts[0].y)<1e-6,
    '('+pts[0].x.toFixed(3)+','+pts[0].y.toFixed(3)+')');
  t('  oxiri (100,0)', Math.hypot(pts[pts.length-1].x-100, pts[pts.length-1].y)<1e-4,
    '('+pts[pts.length-1].x.toFixed(3)+','+pts[pts.length-1].y.toFixed(3)+')');
  // Bezier eng baland nuqtasi = 3/4 * 100 = 75
  t('  eng baland nuqta 75 (Bezier nazariyasi)', Math.abs(b.y1-75)<0.5, b.y1.toFixed(3));
  t('  moslashuvchan: 200 dan kam nuqta', pts.length<200, pts.length+' nuqta');
}
// tugun vektorisiz — o'zi yasashi kerak
p=parse(dxf('0\nSPLINE\n8\n0\n71\n3\n10\n0\n20\n0\n10\n30\n20\n60\n10\n70\n20\n60\n10\n100\n20\n0\n', null, 4));
t('tugun vektorisiz ham ishlaydi', p.length===1 && p[0].points.length>2,
  p.length?p[0].points.length+' nuqta':'yo\'q');

console.log('\n=== 3. INSERT / BLOCK ===\n');
const blk='0\nBLOCK\n2\nKVADRAT\n10\n0\n20\n0\n'+
  '0\nLWPOLYLINE\n70\n1\n10\n0\n20\n0\n10\n10\n20\n0\n10\n10\n20\n10\n10\n0\n20\n10\n'+
  '0\nENDBLK\n';
p=parse(dxf('0\nINSERT\n8\n0\n2\nKVADRAT\n10\n100\n20\n200\n', blk, 4));
t('INSERT blokni ochadi', p.length===1, p.length+' shakl');
if(p.length){
  const b=bbox(p);
  t('  (100,200) ga ko\'chdi', Math.abs(b.x0-100)<1e-9 && Math.abs(b.y0-200)<1e-9,
    '('+b.x0+','+b.y0+')');
}
p=parse(dxf('0\nINSERT\n8\n0\n2\nKVADRAT\n10\n0\n20\n0\n41\n3\n42\n2\n', blk, 4));
t('INSERT masshtab (×3, ×2)', p.length===1 &&
  Math.abs(bbox(p).w-30)<1e-9 && Math.abs(bbox(p).h-20)<1e-9,
  p.length?bbox(p).w+'×'+bbox(p).h:'yo\'q');
p=parse(dxf('0\nINSERT\n8\n0\n2\nKVADRAT\n10\n0\n20\n0\n50\n90\n', blk, 4));
t('INSERT burilish 90°', p.length===1 &&
  Math.abs(bbox(p).x1)<1e-6 && Math.abs(bbox(p).y1-10)<1e-6,
  p.length?JSON.stringify(bbox(p)):'yo\'q');
// MINSERT massiv
p=parse(dxf('0\nINSERT\n8\n0\n2\nKVADRAT\n10\n0\n20\n0\n70\n1\n71\n3\n72\n2\n44\n20\n45\n30\n', blk, 4));
t('MINSERT massiv (3×2 = 6 nusxa)', p.length===6, p.length+' shakl');
// ichma-ich blok
const blk2=blk+'0\nBLOCK\n2\nTASHQI\n10\n0\n20\n0\n'+
  '0\nINSERT\n2\nKVADRAT\n10\n50\n20\n0\n0\nENDBLK\n';
p=parse(dxf('0\nINSERT\n8\n0\n2\nTASHQI\n10\n0\n20\n100\n', blk2, 4));
t('ichma-ich blok', p.length===1 &&
  Math.abs(bbox(p).x0-50)<1e-9 && Math.abs(bbox(p).y0-100)<1e-9,
  p.length?'('+bbox(p).x0+','+bbox(p).y0+')':'yo\'q');
// yo'q blok — yiqilmasin
p=parse(dxf('0\nINSERT\n8\n0\n2\nYOQ\n10\n0\n20\n0\n0\nLINE\n10\n0\n20\n0\n11\n5\n21\n5\n', blk, 4));
t('mavjud bo\'lmagan blok — yiqilmaydi', p.length===1);

console.log('\n=== 4. BIRLIK konversiyasi ===\n');
[[1,25.4,'duym'],[4,1,'mm'],[5,10,'sm'],[6,1000,'m'],[2,304.8,'fut']].forEach(([code,k,nm])=>{
  const q=parse(dxf('0\nLINE\n10\n0\n20\n0\n11\n10\n21\n0\n', null, code));
  t(nm+' → mm (×'+k+')', Math.abs(bbox(q).w-10*k)<1e-6, bbox(q).w);
});
p=parse(dxf('0\nLINE\n10\n0\n20\n0\n11\n10\n21\n0\n', null, null));
t('$INSUNITS yo\'q → mm deb qabul qilinadi', Math.abs(bbox(p).w-10)<1e-9);

console.log('\n=== 5. Chidamlilik (nosoz fayllar) ===\n');
t('bo\'sh fayl', parse('0\nEOF\n').length===0);
t('faqat HEADER', parse(dxf('', null, 4)).length===0);
p=parse(dxf('0\nLINE\n10\nabc\n20\nxyz\n11\n5\n21\n5\n', null, 4));
t('nosoz sonlar tashlanadi', p.length===0 || p[0].points.every(q=>isFinite(q.x)));
p=parse(dxf('0\nTEXT\n1\nSalom\n0\nDIMENSION\n0\nHATCH\n0\nLINE\n10\n0\n20\n0\n11\n9\n21\n0\n', null, 4));
t('noma\'lum turlar o\'tkaziladi, chiziq qoladi', p.length===1);
t('o\'tkazilganlar hisobga olinadi',
  p._skipped && (p._skipped.TEXT===1 || p._skipped.DIMENSION===1),
  JSON.stringify(p._skipped));
try{ parse('AutoCAD Binary DXF\x00'); t('binary DXF → tushunarli xato', false); }
catch(e){ t('binary DXF → tushunarli xato', /binary/i.test(e.message)); }
// CRLF
p=parse(dxf('0\nLINE\n10\n0\n20\n0\n11\n7\n21\n0\n', null, 4).replace(/\n/g,'\r\n'));
t('CRLF qatorlar', p.length===1 && Math.abs(bbox(p).w-7)<1e-9);
// bo'sh qatorlar
p=parse('0\nSECTION\n2\nENTITIES\n\n0\nLINE\n10\n0\n20\n0\n11\n8\n21\n0\n0\nENDSEC\n0\nEOF\n');
t('bo\'sh qatorlar buzmaydi', p.length===1 && Math.abs(bbox(p).w-8)<1e-9);

console.log('\n=== 6. HAQIQIY fayllar ===\n');
const real=fs.readdirSync(require('path').join(__dirname,'tests','fixtures')).filter(f=>f.endsWith('.dxf'));
real.forEach(f=>{
  const q=parse(fs.readFileSync((require('path').join(__dirname,'tests','fixtures')+'/')+f,'utf8'));
  const b=bbox(q);
  const closed=q.filter(x=>x.closed).length;
  let npt=0; q.forEach(x=>npt+=x.points.length);
  t(f.slice(11,42)+' ochildi', q.length>0,
    q.length+' shakl');
  t('  o\'lcham mantiqiy (10..3000 mm)', b.w>10 && b.w<3000 && b.h>10 && b.h<3000,
    b.w.toFixed(1)+'×'+b.h.toFixed(1)+' mm');
  t('  nuqtalar oqilona (<40000)', npt<40000, npt+' nuqta');
  t('  nosoz koordinata yo\'q',
    q.every(x=>x.points.every(pt=>isFinite(pt.x)&&isFinite(pt.y))));
  t('  yopiq konturlar aniqlandi', closed>0, closed+'/'+q.length);
});

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
