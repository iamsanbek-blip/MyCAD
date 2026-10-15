/* ==========================================================================
   js/model/state.js
   Global holat + ixcham UNDO/REDO tarixi

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= state =================
let polygons = [];
let corners = [];   // {pi,vi,x,y,e1,e2,theta,bis,mode,size,offset,tboneDir,selected}
let history = [], historyIndex = -1;
let historyLimit = 50; // configurable via the sidebar

let _uidSeq = 0;
// Every shape gets a stable id. Corner settings are remembered per shape id,
// not per array index — otherwise a NEW shape would silently inherit the
// dogbone settings of whatever used to sit at that index.
function ensureUid(l){ if(!l.uid) l.uid = 'u'+(++_uidSeq)+'_'+Date.now().toString(36); return l.uid; }
function cornerKey(c){ return c.source+':'+(c.uid||c.pi)+':'+c.vi; }
// ---- COMPACT UNDO/REDO ----
// A shape's dense `points` array is derived data (it is rebuilt from grips +
// segMeta, or from the circle/arc definition). Storing it in every history
// entry made undo heavy on big drawings, so snapshots keep only the DEFINING
// data and the points are regenerated on restore.
function compactShape(l){
  const o={};
  for(const k in l){
    if(k==='points') continue;                       // derived — not stored
    const v=l[k];
    o[k] = (v && typeof v==='object') ? JSON.parse(JSON.stringify(v)) : v;
  }
  const rebuildable = l.kind==='circle' || l.kind==='arc' || (l.grips && l.grips.length>=2);
  if(!rebuildable) o.points = JSON.parse(JSON.stringify(l.points||[]));
  return o;
}
function expandShape(o){
  const l={};
  for(const k in o){
    const v=o[k];
    l[k] = (v && typeof v==='object') ? JSON.parse(JSON.stringify(v)) : v;
  }
  if(l.points && l.points.length) return l;          // stored verbatim
  try{
    if(l.kind==='circle' && l.center && l.radius>0){
      const c=l.center, r=l.radius;
      l.points=genCirclePts(c,r);
      if(!l.grips) l.grips=[{x:c.x+r,y:c.y},{x:c.x-r,y:c.y},{x:c.x,y:c.y+r},{x:c.x,y:c.y-r}];
      return l;
    }
    if(l.kind==='arc' && l.arcA && l.arcMid && l.arcB){
      l.points=genArcThrough(l.arcA,l.arcMid,l.arcB,32);
      if(!l.grips) l.grips=[l.arcA,l.arcMid,l.arcB];
      return l;
    }
    if(l.grips && l.grips.length>=2){
      const segs=gripsMetaToSegs(l.grips, l.segMeta, !!l.closed);
      let pts = segs.length ? segsToPoints(segs) : l.grips.map(p=>({x:p.x,y:p.y}));
      // a closed chain ends where it started — drop that duplicate so the
      // rebuilt shape matches the original point-for-point
      if(l.closed && pts.length>2){
        const f=pts[0], q=pts[pts.length-1];
        if(Math.hypot(f.x-q.x, f.y-q.y) < 1e-9) pts=pts.slice(0,-1);
      }
      l.points = pts;
      return l;
    }
  }catch(err){ console.warn('shape rebuild failed, keeping grips only:', err.message); }
  l.points = (l.grips||[]).map(p=>({x:p.x,y:p.y}));
  return l;
}
function snapshot(){
  return {
    scene3d:typeof panelScene==='undefined'?undefined:RugbyPanels.copy(panelScene),
    drawnLines: drawnLines.map(compactShape),
    dimensions: JSON.parse(JSON.stringify(dimensions)),
    texts: (typeof texts!=='undefined') ? JSON.parse(JSON.stringify(texts)) : [],
    layers: JSON.parse(JSON.stringify(layers)),
    activeLayer: activeLayer,
    activeColor: activeColor,
    refImages: typeof refImages==='undefined'?[]:refImages.map(({img,...data})=>JSON.parse(JSON.stringify(data))),
    nestSheets: typeof nestSheets==='undefined'?[]:JSON.parse(JSON.stringify(nestSheets)),
    cornerSettings: corners.map(c=>({key:cornerKey(c), mode:c.mode, size:c.size, offset:c.offset||0, tboneDir:c.tboneDir||'auto', tboneMirror:!!c.tboneMirror}))
  };
}
function pushHistory(){
  if(typeof markProjectDirty==='function') markProjectDirty();
  let snap;
  try{ snap = snapshot(); }
  catch(err){ console.warn('snapshot failed:', err.message); return; }
  history = history.slice(0, historyIndex+1);
  history.push(snap);
  while(history.length > historyLimit){ history.shift(); }
  historyIndex = history.length-1;
  updateHistoryStats();
}
function restore(snap){
  if(!snap) return;
  try{
    if(typeof panelScene!=='undefined')panelScene=RugbyPanels.normalize(snap.scene3d);
    drawnLines = (snap.drawnLines||[]).map(expandShape);
    dimensions = JSON.parse(JSON.stringify(snap.dimensions||[]));
    if(typeof texts!=='undefined') texts = JSON.parse(JSON.stringify(snap.texts||[]));
    if(snap.layers){ layers = JSON.parse(JSON.stringify(snap.layers)); }
    if(snap.activeLayer && layers.some(l=>l.id===snap.activeLayer)) activeLayer = snap.activeLayer;
    if(snap.activeColor) activeColor=snap.activeColor;
    if(snap.refImages && typeof refImages!=='undefined'){
      refImages=JSON.parse(JSON.stringify(snap.refImages));refImages.forEach(r=>attachRefImage(r));
      activeRefId=refImages[0]?.id||null;
      if(typeof renderRefPanel==='function')renderRefPanel();
    }
    if(snap.nestSheets && typeof nestSheets!=='undefined')nestSheets=JSON.parse(JSON.stringify(snap.nestSheets));
    const settingsMap = new Map((snap.cornerSettings||[]).map(s=>[s.key, s]));
    detectCorners(settingsMap);
    renderDrawnList(); renderList();
    if(typeof renderLayerPanel==='function') renderLayerPanel();
    if(typeof panelRefresh==='function')panelRefresh();
  }catch(err){
    console.warn('restore failed:', err.message);
  }
}
function undo(){ if(historyIndex>0){ if(typeof markProjectDirty==='function')markProjectDirty(); historyIndex--; restore(history[historyIndex]); draw(); updateHistoryStats(); } }
function redo(){ if(historyIndex<history.length-1){ if(typeof markProjectDirty==='function')markProjectDirty(); historyIndex++; restore(history[historyIndex]); draw(); updateHistoryStats(); } }
function updateHistoryStats(){
  const el = document.getElementById('historyStats');
  if(el) el.textContent = (historyIndex+1)+' / '+history.length+' (limit: '+historyLimit+')';
}

// ---- line/polyline drawing tool state ----
let appMode = 'edit'; // 'edit' | 'draw'
let orthoMode = true;
let drawTool = 'none'; // 'line' | 'circle' | 'rect' | 'arc' | 'polygon' | 'none'
// Color palette (name → hex + AutoCAD Color Index for DXF). Default = amber outline.
const COLOR_PALETTE = [
  {hex:'#ffb454', aci:40, name:'Amber'},
  {hex:'#ff6b6b', aci:1,  name:'Qizil'},
  {hex:'#ffe680', aci:2,  name:'Sariq'},
  {hex:'#6ee7a8', aci:3,  name:'Yashil'},
  {hex:'#5ee1ff', aci:4,  name:'Cyan'},
  {hex:'#8ab4f8', aci:5,  name:'Ko\'k'},
  {hex:'#ff8ad8', aci:6,  name:'Pushti'},
  {hex:'#ffffff', aci:7,  name:'Oq'},
];
let activeColor = COLOR_PALETTE[0].hex; // color applied to new shapes
