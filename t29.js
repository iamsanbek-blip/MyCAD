const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=require('path').join(__dirname, 'app', '');
const el=()=>({value:'',checked:true,style:{},classList:{add(){},remove(){},toggle(){}},
  addEventListener(){},appendChild(){},click(){},innerHTML:'',textContent:''});
const sb={console,Math,JSON,Number,Array,Object,String,Set,Map,isFinite,parseFloat,parseInt,Error,
  document:{getElementById:el,addEventListener(){},createElement:()=>el(),querySelectorAll:()=>[],body:el()},
  window:{addEventListener(){}}};
sb.globalThis=sb; vm.createContext(sb);
const load=m=>{let s=fs.readFileSync(path.join(ROOT,m),'utf8');
  if(m.endsWith('arcfit.js')) s=s.split('function doTrimAt')[0];
  vm.runInContext(s,sb,{filename:m});};
load('js/geometry/core.js'); load('js/model/layers.js');
load('js/geometry/segments.js'); load('js/geometry/arcfit.js'); load('js/io/dxf-import.js');
const run=c=>vm.runInContext(c,sb);
let fails=0;
const t=(n,c,e)=>{console.log((c?'  ok   ':'  FAIL ')+n+(e&&!c?'   → '+e:'')); if(!c)fails++;};

function maxDev(orig, fitPts, closed){
  let worst=0;
  const n=fitPts.length;
  for(const p of orig){
    let best=Infinity;
    for(let i=0;i<(closed?n:n-1);i++){
      const a=fitPts[i], b=fitPts[(i+1)%n];
      const dx=b.x-a.x, dy=b.y-a.y, L2=dx*dx+dy*dy;
      let tt = L2>0 ? ((p.x-a.x)*dx+(p.y-a.y)*dy)/L2 : 0;
      tt=Math.max(0,Math.min(1,tt));
      const d=Math.hypot(a.x+dx*tt-p.x, a.y+dy*tt-p.y);
      if(d<best) best=d;
    }
    if(best>worst) worst=best;
  }
  return worst;
}
// haqiqiy spline'ni juda zich hisoblab, etalon sifatida olamiz
function dense(txt, idx){
  sb.__t=txt;
  return run('parseDXF(__t)')[idx];
}

const files=fs.readdirSync(require('path').join(__dirname,'tests','fixtures')).filter(f=>f.endsWith('.dxf'));
console.log('=== IMPORT ANIQLIGI (mm) ===\n');
for(const f of files){
  const txt=fs.readFileSync((require('path').join(__dirname,'tests','fixtures')+'/')+f,'utf8');
  sb.__t=txt;
  const polys=run('parseDXF(__t)');
  let npt=0, nfit=0, worst=0, failed=0;
  const sample=polys.filter(p=>p.points.length>12).slice(0,30);
  for(const poly of sample){
    npt+=poly.points.length;
    sb.__p=poly.points; sb.__c=!!poly.closed;
    sb.__tol = 0.05;
    const fit=run('fitArcsToShape(__p,__c,__tol)');
    if(!fit){ failed++; nfit+=poly.points.length; continue; }
    nfit+=fit.points.length;
    worst=Math.max(worst, maxDev(poly.points, fit.points, !!poly.closed));
  }
  console.log('  '+f.slice(11,44));
  console.log('     shakllar: '+polys.length+'   nuqta: '+npt+' → '+nfit);
  console.log('     eng katta og\'ish: '+worst.toFixed(4)+' mm');
  t('  og\'ish 0.08 mm dan kam', worst<0.08, worst.toFixed(4)+' mm');
}

console.log('\n=== BIRLIK ta\'sir qilmasligi ===\n');
// bir xil spline, turli birlikda — natija bir xil aniqlikda bo'lishi kerak
function mk(units, scaleCoord){
  const c=(v)=>String(v*scaleCoord);
  return '0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n'+units+'\n0\nENDSEC\n'+
    '0\nSECTION\n2\nENTITIES\n0\nSPLINE\n71\n3\n'+
    ['0','0','0','0','1','1','1','1'].map(k=>'40\n'+k+'\n').join('')+
    '10\n'+c(0)+'\n20\n'+c(0)+'\n10\n'+c(0)+'\n20\n'+c(100)+'\n'+
    '10\n'+c(100)+'\n20\n'+c(100)+'\n10\n'+c(100)+'\n20\n'+c(0)+'\n'+
    '0\nENDSEC\n0\nEOF\n';
}
// mm da 100 birlik = 100mm; duymda 100/25.4 birlik = 100mm; sm da 10 birlik = 100mm
const cases=[['mm',4,1],['duym',1,1/25.4],['sm',5,1/10],['metr',6,1/1000]];
const counts=[];
cases.forEach(([nm,code,sc])=>{
  sb.__t=mk(code, sc);
  const q=run('parseDXF(__t)');
  const n=q[0].points.length;
  let x0=Infinity,x1=-Infinity,y1=-Infinity;
  q[0].points.forEach(p=>{x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);});
  counts.push(n);
  console.log('  '+nm.padEnd(6)+' → '+String(n).padStart(4)+' nuqta   kenglik '+
              (x1-x0).toFixed(2)+' mm   balandlik '+y1.toFixed(2)+' mm');
});
const spread=Math.max(...counts)-Math.min(...counts);
t('barcha birlikda nuqta soni deyarli bir xil', spread<=Math.max(...counts)*0.15,
  'farq '+spread+' ('+counts.join('/')+')');

console.log('\n=== Sozlamalar joyidami ===\n');
const fl=fs.readFileSync(ROOT+'/js/io/file-load.js','utf8');
t('DXF_FIT_TOL = 0.05', /DXF_FIT_TOL\s*=\s*0\.05/.test(fl));
t('SPLINE uchun 0.05', /DXF_FIT_TOL_SMOOTH\s*=\s*0\.05/.test(fl));
t('eski 0.25 qolmadi', !/fitArcsToShape\(pts, !!poly\.closed, 0\.25\)/.test(fl));
const di=fs.readFileSync(ROOT+'/js/io/dxf-import.js','utf8');
t('tekislash mm da (DXF_TESS_MM)', /DXF_TESS_MM\s*=\s*0\.01/.test(di));
t('smooth bayrog\'i uzatiladi', /push\(s\.pts, s\.closed, T, true\)/.test(di));

console.log('\n'+(fails?'❌ '+fails+' ta yiqildi':'✅ Barcha testlar o\'tdi'));
process.exit(fails?1:0);
