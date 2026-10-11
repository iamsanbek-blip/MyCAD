const {makeEnv}=require('./harness');
const {run,sb}=makeEnv();
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};
const RECT=[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}];  // ichi = +x,+y

function probe(r,ext){
  run(`drawnLines=[{kind:'line',layer:'cut',closed:true,
        grips:${JSON.stringify(RECT)},points:${JSON.stringify(RECT)}}];
       detectCorners(); corners.forEach(c=>{c.mode='dogbone';c.size=${r};c.offset=${ext};});`);
  const p=run('JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))');
  let arc=null, from=null;
  p.forEach(n=>{ if(n.arc && Math.hypot(n.arc.cx,n.arc.cy)<r*3){ arc=n.arc; from=n.from; } });
  if(!arc) return null;
  // materialga eng chuqur kirgan nuqta (bissektrisadan tashqariga = -x,-y)
  let deep=-1e9;
  for(let k=0;k<=200;k++){
    const a=Math.atan2(from.y-arc.cy, from.x-arc.cx)+(arc.ccw?1:-1)*arc.sweep*k/200;
    const x=arc.cx+arc.r*Math.cos(a), y=arc.cy+arc.r*Math.sin(a);
    const d=-(x+y)*Math.SQRT1_2;      // tashqariga (materialga) chuqurlik
    if(d>deep) deep=d;
  }
  const onX=p.filter(n=>Math.abs(n.y)<1e-6&&n.x>1e-9).map(n=>n.x).sort((a,b)=>a-b);
  return {arc, trim:(onX[0]!=null?onX[0]:null), deep};
}

console.log('=== SPESIFIKATSIYA BO\'YICHA TEKSHIRUV (r=3.1) ===\n');
console.log('   ext     markaz            joylashuvi    devor kesimi   materialga chuqurlik');
const rows=[];
for(const e of [-3.0,-1.5,0,1.5,3.0,4.2]){
  const q=probe(3.1,e);
  if(!q){ console.log('   '+String(e).padStart(5)+'    —'); continue; }
  const side = (q.arc.cx>0.001) ? 'ICHKARIDA' : (q.arc.cx<-0.001 ? 'TASHQARIDA' : 'burchakda');
  console.log('   '+String(e).padStart(5)+'   ('+q.arc.cx.toFixed(2).padStart(6)+','+q.arc.cy.toFixed(2).padStart(6)+')   '+
    side.padEnd(12)+q.trim.toFixed(3).padStart(8)+' mm '+q.deep.toFixed(3).padStart(12)+' mm');
  rows.push({e, cx:q.arc.cx, r:q.arc.r, trim:q.trim, deep:q.deep});
}

console.log('');
const pos=rows.filter(x=>x.e>0), neg=rows.filter(x=>x.e<0);
t('MUSBAT → markaz burchak ICHIDA', pos.every(x=>x.cx>0.001),
  pos.map(x=>x.e+':'+x.cx.toFixed(2)).join(' '));
t('MANFIY → markaz TASHQARIDA (materialda)', neg.every(x=>x.cx<-0.001),
  neg.map(x=>x.e+':'+x.cx.toFixed(2)).join(' '));
t('MUSBAT → materialga kamroq kiradi (material KO\'PROQ qoladi)',
  pos.every(x=>x.deep < rows.find(y=>y.e===0).deep),
  'ext=0 da '+rows.find(y=>y.e===0).deep.toFixed(2)+', musbatlarda '+pos.map(x=>x.deep.toFixed(2)).join('/'));
t('MANFIY → materialga ko\'proq kiradi (material KAMROQ qoladi)',
  neg.every(x=>x.deep > rows.find(y=>y.e===0).deep),
  neg.map(x=>x.deep.toFixed(2)).join('/'));
t('RADIUS hamma holatda aynan 3.1000', rows.every(x=>Math.abs(x.r-3.1)<1e-9),
  rows.map(x=>x.r.toFixed(4)).join(' '));

console.log('\n=== UNION: kontur uzluksizmi? ===');
// yoy uchlari devor kesimi nuqtalariga AYNAN tushishi kerak
function continuity(r,ext){
  run(`drawnLines=[{kind:'line',layer:'cut',closed:true,
        grips:${JSON.stringify(RECT)},points:${JSON.stringify(RECT)}}];
       detectCorners(); corners.forEach(c=>{c.mode='dogbone';c.size=${r};c.offset=${ext};});`);
  const p=run('JSON.parse(JSON.stringify(buildDrawnModifiedPaths()[0]))');
  let worst=0;
  for(let i=0;i<p.length;i++){
    const n=p[i];
    if(!n.arc || !n.from) continue;
    // yoy boshi oldingi tugun bilan mos kelsinmi
    const prev=p[(i-1+p.length)%p.length];
    worst=Math.max(worst, Math.hypot(n.from.x-prev.x, n.from.y-prev.y));
    // yoy oxiri o'z tugunida
    const a0=Math.atan2(n.from.y-n.arc.cy, n.from.x-n.arc.cx);
    const a1=a0+(n.arc.ccw?1:-1)*n.arc.sweep;
    const ex=n.arc.cx+n.arc.r*Math.cos(a1), ey=n.arc.cy+n.arc.r*Math.sin(a1);
    worst=Math.max(worst, Math.hypot(ex-n.x, ey-n.y));
  }
  return worst;
}
for(const e of [-3,-1,0,1,3,4.2]){
  const g=continuity(3.1,e);
  t('ext='+e+': yoy va devor AYNAN tutashadi (bo\'shliq '+g.toExponential(1)+')', g<1e-9);
}

console.log('\n=== Chegaralar ===');
sb.__c={mode:'dogbone', size:3.1, theta:Math.PI/2};
const rg=run('cornerOffsetRange(__c)');
console.log('   90° burchak, r=3.1 → oraliq '+rg.min.toFixed(3)+' … +'+rg.max.toFixed(3));
t('musbat chegara = 0.98·r/sin45 = +4.29', Math.abs(rg.max-3.1/Math.sin(Math.PI/4)*0.98)<1e-6, 'max='+rg.max.toFixed(3));
t('manfiy chegara = -0.98·r = -3.04', Math.abs(rg.min+3.1*0.98)<1e-9, 'min='+rg.min.toFixed(3));
t('siz yozgan 3.04 endi bemalol sig\'adi', 3.04 <= rg.max);

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
