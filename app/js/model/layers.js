/* ==========================================================================
   js/model/layers.js
   Qatlamlar (CNC operatsiya turlari bo'yicha)

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== Layers (qatlamlar) — CNC operatsiya turlari bo'yicha =====
// Each shape carries a `layer` id. A layer has a name, color, visibility and
// lock flag. CNC software separates operations (cut / engrave / drill) by layer,
// and DXF export writes each layer as its own DXF LAYER.
let layers = [
  {id:'cut',     name:'Cut (Kesish)',     color:'#ff6b6b', aci:1, visible:true, locked:false},
  {id:'engrave', name:'Engrave (O\'yish)', color:'#5ee1ff', aci:4, visible:true, locked:false},
  {id:'drill',   name:'Drill (Teshik)',   color:'#ffe680', aci:2, visible:true, locked:false},
  {id:'default', name:'General',          color:'#ffb454', aci:40, visible:true, locked:false},
];
let activeLayer = 'cut'; // new shapes go onto this layer
function getLayer(id){ return layers.find(l=>l.id===id) || layers[layers.length-1]; }
function layerOf(shape){ return getLayer(shape.layer || 'default'); }

let polygonSides = 6;
let drawnLines = [];  // [{points:[{x,y}], closed:bool, selected:bool, center:{x,y}?, radius:num?}]
let currentDraw = null; // {points:[{x,y}]} while actively drawing
let lineArcMode = false; // legacy flag kept in sync with lineSubmode
let lineSubmode = 'straight'; // 'straight' | 'arc' (A: bulge arc) | 'midarc' (S: through-middle arc)
let typedLen = '';      // string of digits/decimal being typed for exact length
let typedLen2 = '';     // Rectangle: the SECOND value (height); typedLen is the width
let mouseRawWorld = null; // cursor BEFORE Ortho/Angle/Grid — used to pick the rectangle quadrant
let typingSecond = false; // true once the user switched to the height field
let hoverSnap = null;   // {point:{x,y}, type:'endpoint'|'midpoint'|'nearest'|'center'|'intersection'|'perpendicular'|'parallel'}
let mouseWorld = {x:0,y:0};

function signedArea(pts){
  let a=0; const n=pts.length;
  for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n]; a += p.x*q.y - q.x*p.y; }
  return a/2;
}
