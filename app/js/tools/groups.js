/* ==========================================================================
   js/tools/groups.js
   Guruhlash va transform sessiyasini boshqarish

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== GROUPS =====
// A group is just a shared id on the member shapes. Selecting any member
// selects the whole group, and every transform already works on the selection,
// so groups move / rotate / copy as one unit without special-casing each tool.
let groupSeq = 1;
function newGroupId(){ return 'g'+(groupSeq++)+'_'+Date.now().toString(36); }
function shapesInGroup(gid){ return drawnLines.filter(l=>l.group===gid); }
// Extend a selection so that whole groups are always selected together.
function expandSelectionToGroups(){
  const gids = new Set(drawnLines.filter(l=>l.selected && l.group).map(l=>l.group));
  if(!gids.size) return false;
  let changed=false;
  drawnLines.forEach(l=>{
    if(l.group && gids.has(l.group) && !l.selected && isShapeEditable(l)){ l.selected=true; changed=true; }
  });
  return changed;
}
function groupSelected(){
  const sel = drawnLines.filter(l=>l.selected && isShapeEditable(l));
  if(sel.length<2){
    document.getElementById('hint').innerHTML='Guruhlash uchun kamida 2 ta shakl tanlang.';
    return false;
  }
  const gid = newGroupId();
  sel.forEach(l=>{ l.group = gid; });
  pushHistory(); draw(); renderDrawnList();
  document.getElementById('hint').innerHTML=sel.length+' ta shakl guruhlandi. Bittasini bossangiz butun guruh tanlanadi.';
  return true;
}
function ungroupSelected(){
  const gids = new Set(drawnLines.filter(l=>l.selected && l.group).map(l=>l.group));
  if(!gids.size){
    document.getElementById('hint').innerHTML='Yechiladigan guruh tanlanmagan.';
    return false;
  }
  let n=0;
  drawnLines.forEach(l=>{ if(l.group && gids.has(l.group)){ delete l.group; n++; } });
  pushHistory(); draw(); renderDrawnList();
  document.getElementById('hint').innerHTML=gids.size+' ta guruh yechildi ('+n+' shakl).';
  return true;
}
function startTransform(tool){
  if(!drawnLines.some(l=>l.selected && isShapeEditable(l))){
    alert('Avval transformatsiya qilinadigan chizmani tanlang. (Qulflangan yoki yashirin qatlamdagi shakllar tahrirlanmaydi.)');
    return;
  }
  transformTool=tool; transformStep=1; transformBase=null; transformSnapshot=null;
  ['moveBtn','rotateBtn','scaleBtn','mirrorBtn'].forEach(id=>document.getElementById(id).classList.remove('active'));
  const map={move:'moveBtn',rotate:'rotateBtn',scale:'scaleBtn',mirror:'mirrorBtn'};
  document.getElementById(map[tool]).classList.add('active');
  const hint=document.getElementById('hint');
  hint.innerHTML = 'Transform: '+tool.toUpperCase()+' — bazaviy nuqtani bosing (Esc: bekor)';
}
function finishTransform(){
  transformTool=null; transformStep=0; transformBase=null; transformSnapshot=null; transformTyped='';
  ['moveBtn','rotateBtn','scaleBtn','mirrorBtn'].forEach(id=>document.getElementById(id).classList.remove('active'));
}
document.getElementById('moveBtn').addEventListener('click', ()=>startTransform('move'));
document.getElementById('rotateBtn').addEventListener('click', ()=>startTransform('rotate'));
document.getElementById('scaleBtn').addEventListener('click', ()=>startTransform('scale'));
document.getElementById('mirrorBtn').addEventListener('click', ()=>startTransform('mirror'));
