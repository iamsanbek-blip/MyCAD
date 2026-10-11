/* ==========================================================================
   js/ui/input-view.js
   Ko'rinish: pan / zoom / box-select va primitiv generatorlar

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= interactions: click / pan / zoom / box-select =================
let selecting=false, selStart={x:0,y:0}, selCur={x:0,y:0};
let panning=false, panStart={x:0,y:0}, panOrigin={x:0,y:0};
let mouseDownPos=null, mouseDownCorner=null, mouseDownModKey=false;
let draggingGrip=null, dragMoved=false; // {li,pi} index into drawnLines[li].points[pi] while dragging a vertex
// transform tools operate on the currently-selected drawn shapes:
//  step 0 = idle, step 1 = waiting for base point, step 2 = waiting for target
let transformTool=null;   // null | 'move' | 'rotate' | 'scale' | 'mirror'
let transformStep=0;
let transformBase=null;   // world point chosen as the base/pivot
let transformSnapshot=null; // deep copy of selected shapes' geometry at transform start
let trimMode=false; // Trim/Extend tool active: plain click trims, Ctrl/Shift+click extends
// Dimension tool: places measurement annotations. Each dimension stores its own
// geometry so it renders independently of the shapes it measures.
// dimensions[] = {kind:'h'|'v'|'aligned'|'angular', p1, p2, [center], off, textSize}
let dimensions=[];
let dimTool=null;        // null | 'h' | 'v' | 'aligned' | 'angular'
let offsetMode=false;    // Offset tool active
let offsetPick=null;     // Offset: tanlangan shakl indeksi (2 bosqichli oqim)
let pendingMirrorKey=false; // true briefly after M is pressed, waiting for optional 'i' (Mirror)
let offsetTyped='';      // typed offset distance (in-progress)
let lastOffsetDist=0;    // remembered offset distance, reused for the next offset
let joinMode=false;      // Join tool waiting for a typed distance before joining
let joinTyped='';        // in-progress typed join tolerance
let lastJoinDist=1;      // remembered join tolerance (mm), default 1mm
let dimStep=0;           // 0 idle, 1 first pt, 2 second pt, 3 offset/placement
let dimPts=[];           // points collected so far for the in-progress dimension
let pendingLineClickIdx=null; // drawnLines index tentatively clicked, resolved to a select on mouseup if not dragged

// --- snapping helpers (endpoint / midpoint / nearest-on-segment) ---
// ---- primitive shape generators (world coords) ----
function genCirclePts(center, radius, segments){
  segments = segments||64;
  const pts=[];
  for(let k=0;k<segments;k++){ const a=(k/segments)*Math.PI*2; pts.push({x:center.x+radius*Math.cos(a), y:center.y+radius*Math.sin(a)}); }
  return pts;
}
// Rectangle by WIDTH x HEIGHT (AutoCAD style): the typed size is applied in the
// quadrant the cursor sits in, so the shape grows the way the user is pointing.
function rectCornerFromWH(base, cursor, w, h){
  const sx = (cursor.x < base.x) ? -1 : 1;
  const sy = (cursor.y < base.y) ? -1 : 1;
  return {x: base.x + sx*Math.abs(w), y: base.y + sy*Math.abs(h)};
}
// The size currently being typed for the rectangle, or null when nothing typed.
function pendingRectWH(){
  if(drawTool!=='rect' || !currentDraw || currentDraw.points.length!==1) return null;
  const w = parseFloat(typedLen);
  if(!isFinite(w) || w<=0) return null;
  let hh = parseFloat(typedLen2);
  if(!isFinite(hh) || hh<=0) hh = w;      // only one value typed -> square
  return {w, h:hh};
}
function genRectPts(a, b){
  const x0=Math.min(a.x,b.x), x1=Math.max(a.x,b.x), y0=Math.min(a.y,b.y), y1=Math.max(a.y,b.y);
  return [{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
}
// arc passing through three points p1 (start), p2 (a point on the arc), p3 (end)
