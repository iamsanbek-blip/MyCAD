/* ==========================================================================
   js/geometry/arcfit.js
   Arc fitting: zich nuqtalarni line+arc segmentlarga siqish

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== Arc fitting: compress a dense point run into few line+arc segments =====
// Analyzes a polyline's points and returns a compact shape with grips only at
// real vertices/arc-through points, plus segMeta describing each segment. The
// result renders identically (within `tol` mm) but is far lighter and editable.
function circleFrom3Pts(a,b,c){
  const ax=a.x,ay=a.y,bx=b.x,by=b.y,cx=c.x,cy=c.y;
  const d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));
  if(Math.abs(d)<1e-9) return null;
  const ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d;
  const uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d;
  return {x:ux,y:uy,r:Math.hypot(ax-ux,ay-uy)};
}
function segmentFitCheck(pts,i,j,tol){
  const a=pts[i], b=pts[j];
  const ab=sub(b,a); const abLen=len(ab)||1;
  let maxLineDev=0;
  for(let k=i+1;k<j;k++){
    const cross=Math.abs((pts[k].x-a.x)*ab.y-(pts[k].y-a.y)*ab.x)/abLen;
    if(cross>maxLineDev) maxLineDev=cross;
  }
  if(maxLineDev<=tol) return {type:'line'};
  // An arc needs at least 2 intermediate points (so a single L-corner of 3
  // points is NEVER mistaken for an arc — any 3 points fit a circle trivially).
  if(j-i < 3) return null;
  const mid=pts[Math.floor((i+j)/2)];
  const circ=circleFrom3Pts(a,mid,b);
  if(!circ) return null;
  // reject absurd radii (near-straight runs) — those should be lines
  if(circ.r > abLen*50) return null;
  let maxArcDev=0;
  for(let k=i+1;k<j;k++){
    const dev=Math.abs(Math.hypot(pts[k].x-circ.x,pts[k].y-circ.y)-circ.r);
    if(dev>maxArcDev) maxArcDev=dev;
  }
  if(maxArcDev>tol) return null;

  // TUZATILDI: yuqoridagi tekshiruv nuqtalar AYLANA USTIDA yotishini
  // tasdiqlaydi, lekin ular yoyning QAYSI QISMIDA ekanini tekshirmaydi.
  // Natijada nuqtalar aylananing uzun tomonini bosib o'tsa-yu, tiklanadigan
  // yoy qisqa tomondan ketsa, chizma butunlay boshqa joydan o'tardi.
  // O'lchov: bitta naqshda 257 nuqtali shakl 5 ta gripga siqilib,
  // 1.53 mm og'ish bergan edi.
  //
  // Endi burchaklar KETMA-KET (monoton) o'sishini talab qilamiz va
  // o'rta nuqta haqiqatan o'rtada ekanini tekshiramiz.
  const ang = k => Math.atan2(pts[k].y-circ.y, pts[k].x-circ.x);
  const TWO = Math.PI*2;
  const a0 = ang(i);
  let prev = 0, total = 0, dir = 0;
  for(let k=i+1;k<=j;k++){
    let d = ang(k) - a0;
    while(d - prev >  Math.PI) d -= TWO;
    while(d - prev < -Math.PI) d += TWO;
    const step = d - prev;
    if(dir === 0 && Math.abs(step) > 1e-12) dir = step > 0 ? 1 : -1;
    // yo'nalish o'zgarsa — bu bitta yoy emas
    if(dir !== 0 && step*dir < -1e-9) return null;
    prev = d; total = d;
  }
  if(Math.abs(total) < 1e-9) return null;
  if(Math.abs(total) >= TWO - 1e-6) return null;     // to'liq aylanadan oshdi

  // o'rta grip haqiqatan yoyning o'rtasida bo'lsin
  const mAng = ang(Math.floor((i+j)/2)) - a0;
  let mm = mAng;
  while(mm - total/2 >  Math.PI) mm -= TWO;
  while(mm - total/2 < -Math.PI) mm += TWO;
  if(mm*dir < -1e-9 || Math.abs(mm) > Math.abs(total)+1e-9) return null;

  return {type:'arc', mid:{x:mid.x,y:mid.y}};
}
// detect a sharp corner at index k (angle change bigger than ~25°), which must
// break a fit run so corners are preserved as real vertices
function isSharpCorner(pts,k){
  if(k<=0 || k>=pts.length-1) return false;
  const a=sub(pts[k],pts[k-1]), b=sub(pts[k+1],pts[k]);
  const la=len(a), lb=len(b);
  if(la<1e-9||lb<1e-9) return false;
  const cosang=(a.x*b.x+a.y*b.y)/(la*lb);
  return cosang < 0.9063; // > ~25° turn = a corner
}
// Returns {grips:[...], segMeta:[...], points:[...]} or null if not worth compressing.
function fitArcsToShape(rawPts, closed, tol){
  tol = tol || 0.2;
  const pts = rawPts;
  if(pts.length < 4) return null; // too small to bother
  const segList=[];
  let i=0;
  const end = pts.length-1;
  while(i < end){
    let bestJ=i+1, bestFit={type:'line'};
    for(let j=i+2;j<=end;j++){
      // never let a run extend PAST a sharp corner — the corner must stay a vertex
      if(isSharpCorner(pts, j-1)){ break; }
      const fit=segmentFitCheck(pts,i,j,tol);
      if(fit){ bestJ=j; bestFit=fit; }
      else break;
    }
    segList.push(Object.assign({from:i,to:bestJ}, bestFit));
    i=bestJ;
  }
  // if compression isn't meaningful, skip
  if(segList.length >= pts.length*0.5) return null;
  // build grips + segMeta from the segment list
  const grips=[{x:pts[0].x,y:pts[0].y}];
  const segMeta=['start'];
  const renderPts=[{x:pts[0].x,y:pts[0].y}];
  segList.forEach(s=>{
    if(s.type==='arc'){
      grips.push({x:s.mid.x,y:s.mid.y}); segMeta.push('arcMid');
      grips.push({x:pts[s.to].x,y:pts[s.to].y}); segMeta.push('arcEnd');
      // render points: sample the arc through from→mid→to
      const arcSeg=genArcThrough(pts[s.from], s.mid, pts[s.to], 16);
      for(let k=1;k<arcSeg.length;k++) renderPts.push(arcSeg[k]);
    } else {
      grips.push({x:pts[s.to].x,y:pts[s.to].y}); segMeta.push('straight');
      renderPts.push({x:pts[s.to].x,y:pts[s.to].y});
    }
  });
  const hasArc = segMeta.some(m=>m==='arcMid'||m==='arcEnd');
  return {grips, segMeta: hasArc?segMeta:null, points:renderPts};
}
function arcFromPoints(pts){
  if(pts.length<3) return {kind:'line', closed:false, selected:false, points:pts.map(p=>({x:p.x,y:p.y})), grips:pts.map(p=>({x:p.x,y:p.y}))};
  const A=pts[0], B=pts[pts.length-1], M=pts[Math.floor(pts.length/2)];
  // collinearity test: if the mid point is basically on line A-B, it's straight
  const AB=sub(B,A); const abLen=len(AB)||1;
  const cross=Math.abs((M.x-A.x)*AB.y-(M.y-A.y)*AB.x)/abLen;
  if(cross<1e-3){ return {kind:'line', closed:false, selected:false, points:[{x:A.x,y:A.y},{x:B.x,y:B.y}], grips:[{x:A.x,y:A.y},{x:B.x,y:B.y}]}; }
  const a={x:A.x,y:A.y}, m={x:M.x,y:M.y}, b={x:B.x,y:B.y};
  return {kind:'arc', closed:false, selected:false, points:genArcThrough(a,m,b,24), arcA:a, arcMid:m, arcB:b, grips:[a,m,b]};
}
