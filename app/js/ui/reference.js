/* ==========================================================================
   js/ui/reference.js
   Fon rasm shabloni (JPG/PNG/SVG) — Blender uslubida

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== REFERENCE IMAGES (JPG / PNG / SVG) =====
// A reference image sits BEHIND the drawing, like a Blender background image.
// Geometry is stored in world millimetres: (x,y) is the image centre, `wmm` is
// its width in mm, `rot` degrees, `opacity` 0..1.
let refImages = [];        // [{id, src, img, x, y, wmm, hmm, rot, opacity, visible, locked, name}]
let activeRefId = null;    // which image the panel edits / the mouse can drag
let refEditMode = false;   // when true, dragging on canvas moves the active image
let draggingRef = null;    // {id, dx, dy} while dragging
function newRefId(){ return 'img_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function getRef(id){ return refImages.find(r=>r.id===id) || null; }
function activeRef(){ return getRef(activeRefId); }
// Attach an <img> to a reference entry, sizing it on first load.
function attachRefImage(ref, onReady){
  const im = new Image();
  im.onload = ()=>{
    ref.img = im;
    const nw = im.naturalWidth || im.width || 100;
    const nh = im.naturalHeight || im.height || 100;
    ref.aspect = (nh>0 && nw>0) ? (nh/nw) : 1;
    if(!isFinite(ref.wmm) || ref.wmm<=0){
      ref.wmm = 200;                                  // sensible default width
    }
    ref.hmm = ref.wmm * ref.aspect;
    if(onReady) onReady(ref);
    draw(); renderRefPanel();
  };
  im.onerror = ()=>{
    console.warn('reference image failed to load:', ref.name);
    if(onReady) onReady(ref);
  };
  im.src = ref.src;
}
function addReferenceImage(dataUrl, name){
  const ref = {id:newRefId(), src:dataUrl, img:null, x:0, y:0, wmm:200, hmm:200,
               aspect:1, rot:0, opacity:0.5, visible:true, locked:false, name:name||'rasm'};
  refImages.push(ref);
  activeRefId = ref.id;
  attachRefImage(ref);
  renderRefPanel();
  pushHistory();
  return ref;
}
function removeReference(id){
  refImages = refImages.filter(r=>r.id!==id);
  if(activeRefId===id) activeRefId = refImages.length ? refImages[refImages.length-1].id : null;
  draw(); renderRefPanel();
  pushHistory();
}
// The image's four corners in world space (honouring rotation).
function refCorners(ref){
  const hw=ref.wmm/2, hh=(ref.hmm||ref.wmm)/2;
  const a=(ref.rot||0)*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
  return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([dx,dy])=>({
    x: ref.x + dx*ca - dy*sa,
    y: ref.y + dx*sa + dy*ca
  }));
}
function refHitTest(worldPt){
  for(let i=refImages.length-1;i>=0;i--){
    const r=refImages[i];
    if(!r.visible || r.locked) continue;
    const a=-(r.rot||0)*Math.PI/180, ca=Math.cos(a), sa=Math.sin(a);
    const dx=worldPt.x-r.x, dy=worldPt.y-r.y;
    const lx=dx*ca - dy*sa, ly=dx*sa + dy*ca;   // into the image's own frame
    if(Math.abs(lx)<=r.wmm/2 && Math.abs(ly)<=(r.hmm||r.wmm)/2) return r;
  }
  return null;
}
// Draw every visible reference image behind the drawing.
function drawReferenceImages(){
  if(!refImages.length) return;
  refImages.forEach(r=>{
    if(!r.visible || !r.img) return;
    const c = toScreen({x:r.x, y:r.y});
    const w = r.wmm*view.scale, hgt=(r.hmm||r.wmm)*view.scale;
    if(!(w>0.5 && hgt>0.5)) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, r.opacity==null?0.5:r.opacity));
    ctx.translate(c.x, c.y);
    ctx.rotate(-(r.rot||0)*Math.PI/180);     // screen Y is flipped
    try{ ctx.drawImage(r.img, -w/2, -hgt/2, w, hgt); }catch(err){}
    ctx.restore();
    // outline the active image while reference editing is on
    if(refEditMode && r.id===activeRefId){
      const pts=refCorners(r).map(toScreen);
      ctx.save();
      ctx.setLineDash([6,4]); ctx.lineWidth=1.5;
      ctx.strokeStyle = r.locked ? '#ff6b6b' : '#5ee1ff';
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<4;i++) ctx.lineTo(pts[i].x,pts[i].y);
      ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
    }
  });
}
