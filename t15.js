const {makeEnv}=require('./harness');
const {run,sb}=makeEnv();
const fs=require('fs');
const APP=require('path').join(__dirname, 'app', '')+'/';
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

console.log('=== 1. DOGBONE extension oralig\'i endi to\'g\'rimi? ===');
console.log('   (r=3mm, musbat chegara r, manfiy chegara r/sin(θ/2))\n');
console.log('   burchak    ruxsat etilgan oraliq      kutilgan');
for(const deg of [45,90,120]){
  sb.__c={mode:'dogbone', size:3, theta:deg*Math.PI/180};
  const rg=run('cornerOffsetRange(__c)');
  const expMin=-3*0.98, expMax=(3/Math.sin(deg*Math.PI/360))*0.98;
  console.log('    '+String(deg+'°').padStart(5)+'    '+
    rg.min.toFixed(2).padStart(7)+' … +'+rg.max.toFixed(2)+
    '        '+expMin.toFixed(2)+' … +'+expMax.toFixed(2));
  t(deg+'° oralig\'i to\'g\'ri', Math.abs(rg.min-expMin)<1e-6 && Math.abs(rg.max-expMax)<1e-6);
}
sb.__c={mode:'dogbone', size:3, theta:Math.PI/2};
const rg90=run('cornerOffsetRange(__c)');
t('musbat tomon endi 2.94 dan uzoqroq', rg90.max > 4, 'max='+rg90.max.toFixed(3));

console.log('\n=== 2. Doira HARAKATLANADI, radius O\'ZGARMAYDI ===');
const RECT=[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}];
function probe(ext){
  run(`drawnLines=[{kind:'line',layer:'cut',closed:true,
        grips:${JSON.stringify(RECT)},points:${JSON.stringify(RECT)}}];
       detectCorners(); corners.forEach(c=>{c.mode='dogbone';c.size=3;c.offset=${ext};});`);
  const p=run('JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))');
  const arcs=p.filter(n=>n.arc);
  // (0,0) burchagidagi yoy markazi va radiusi
  let best=null,bd=1e9;
  arcs.forEach(n=>{const d=Math.hypot(n.arc.cx,n.arc.cy); if(d<bd){bd=d;best=n.arc;}});
  return best;
}
console.log('    ext     markaz (cx, cy)        radius');
let radii=[], centers=[];
for(const e of [-2.9,-2,-1,0,1,2,4]){
  const a=probe(e);
  if(!a){ console.log('    '+String(e).padStart(5)+'    —'); continue; }
  radii.push(a.r); centers.push({e, x:a.cx, y:a.cy});
  console.log('    '+String(e).padStart(5)+'    ('+a.cx.toFixed(3).padStart(7)+', '+a.cy.toFixed(3).padStart(7)+')     '+a.r.toFixed(4));
}
t('RADIUS hamma holatda 3.0000', radii.every(r=>Math.abs(r-3)<1e-9), 'radiuslar: '+radii.map(x=>x.toFixed(3)).join(', '));
// markaz bissektrisa bo'ylab chiziqli suriladimi?
let lin=true;
for(let i=1;i<centers.length;i++){
  const dE=centers[i].e-centers[i-1].e;
  const dx=centers[i].x-centers[i-1].x, dy=centers[i].y-centers[i-1].y;
  const dist=Math.hypot(dx,dy);
  if(Math.abs(dist-Math.abs(dE))>1e-6) lin=false;
}
t('markaz aynan ext mm ga suriladi', lin);
{
  const a=centers[0], b=centers[centers.length-1];   // ext=-4 va ext=+2.9
  // ext oshganda markaz teskari tomonga siljishi kerak
  const dE=b.e-a.e, dX=b.x-a.x;
  // YANGI KELISHUV: ext oshgani sari markaz burchak ICHIGA siljiydi
  t('ext oshsa markaz ichkariga siljiydi', dE*dX > 0,
    'ext '+a.e+'→'+b.e+' da cx '+a.x.toFixed(2)+'→'+b.x.toFixed(2));
  const dir=Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI;
  t('surilish bissektrisa bo\'ylab (45°)', Math.abs(dir-45)<0.01,
    'yo\'nalish '+dir.toFixed(1)+'°');
}
t('+4 ham ishlaydi (ilgari 2.85 da to\'xtardi)', centers.some(c=>c.e===4));

console.log('\n=== 3. Matn oynasi: klavishlar ushlanadimi? ===');
const ts=fs.readFileSync(APP+'js/tools/text.js','utf8');
t('tinglovchi DOCUMENT da (textarea emas)', /document\.addEventListener\('keydown', onKey, true\)/.test(ts));
t('capture bosqichida (true)', /onKey, true\)/.test(ts));
t('fokus qaytariladi', /if\(document\.activeElement!==ta\) ta\.focus\(\)/.test(ts));
t('Enter tasdiqlaydi, Shift+Enter yangi qator', /e\.key==='Enter' && !e\.shiftKey/.test(ts));
t('ikki marta yopilmaydi', /if\(closed\) return;/.test(ts));
t('closedRef qoldig\'i yo\'q', !ts.includes('closedRef'));

console.log('\n=== 4. Yoy uzunligi o\'lchovini TANLASH ===');
run('var view={scale:1,ox:0,oy:0};');
run('function toScreen(p){ return {x:p.x*view.scale+view.ox, y:view.oy-p.y*view.scale}; }');
const snapSrc=fs.readFileSync(APP+'js/geometry/snap.js','utf8');
run(snapSrc.match(/function nearestPointOnSegment\([\s\S]*?\n}/)[0]);
run(snapSrc.match(/function findDimensionNear\([\s\S]*?\n}/)[0]);
// to'liq aylana: markaz (0,0), r=50, yozuv (80,80)
run(`dimensions=[{kind:'arclen', cx:0, cy:0, r:50, a0:0, sweep:Math.PI*2, full:true,
                 arcLen:2*Math.PI*50, place:{x:80,y:80}, textSize:10, prec:1, unit:'mm'}];`);
t('aylana chizig\'i bosilganda topiladi', run('findDimensionNear(50,0)')===0);
t('yozuv joyi bosilganda topiladi', run('findDimensionNear(80,-80)')===0);
t('uzoq joy — topilmaydi', run('findDimensionNear(300,300)')===null);
// yarim yoy
run(`dimensions=[{kind:'arclen', cx:0, cy:0, r:50, a0:0, sweep:Math.PI, full:false,
                 arcLen:Math.PI*50, place:{x:0,y:90}, textSize:10, prec:1, unit:'mm'}];`);
t('yoy USTIDA topiladi (yuqori yarim)', run('findDimensionNear(0,-50)')===0);
t('yoy TASHQARISIDA topilmaydi (past yarim)', run('findDimensionNear(0,50)')===null);

console.log('\n=== 5. Tanlangan o\'lchov o\'chiriladimi? ===');
const ks=fs.readFileSync(APP+'js/ui/input-keys.js','utf8');
t('deleteSelectedShapes o\'lchovlarni ham o\'chiradi',
  /dimensions = dimensions\.filter\(d=>!d\.selected\)/.test(ks));
const ms=fs.readFileSync(APP+'js/ui/input-mouse.js','utf8');
t('bosilganda tanlanadi', /dimensions\[dimHit\]\.selected = !dimensions\[dimHit\]\.selected/.test(ms));

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
