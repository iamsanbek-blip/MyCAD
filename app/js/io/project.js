/* Project codec and transactional page replacement. Geometry is handled by pages.js. */
let restoringProject=false;
const PROJECT_VERSION = RugbyDocument.VERSION;
function buildProject(){
  rememberActivePage();
  const pages=documentPages.map(({history,historyIndex,...data})=>data);
  return {...RugbyDocument.encode(pages,activePageId),workspace:appMode};
}
function saveProject(){ return saveProjectQuick(); }
function loadProject(text, fileName){
  let incoming;
  try{ incoming=RugbyDocument.decode(text); }
  catch(err){ alert('Loyiha ochilmadi: '+err.message); return false; }
  settlePageInteraction();rememberActivePage();
  const previous=documentPages, previousId=activePageId,previousMode=appMode;
  try{
    documentPages=incoming.pages;activePageId=incoming.activePageId;
    applyPageData(activePage());
    restoringProject=true;try{setAppMode(incoming.workspace||(panelScene.panels.length?'model3d':'draw'));}finally{restoringProject=false;}
    const name=document.getElementById('importedName');if(name)name.textContent=fileName||'Loyiha';
    setHint('Ochildi: '+(fileName||'loyiha')+' · '+documentPages.length+' sahifa');
    return true;
  }catch(err){
    documentPages=previous;activePageId=previousId;
    try{applyPageData(activePage());restoringProject=true;setAppMode(previousMode);}catch(restoreError){console.error(restoreError);}finally{restoringProject=false;}
    alert('Loyiha ochilmadi: '+err.message);return false;
  }
}
// ---- reference image panel ----
function renderRefPanel(){
  const box=document.getElementById('refList');
  if(!box) return;
  box.innerHTML='';
  if(!refImages.length){
    box.innerHTML='<div class="sub">Rasm yuklanmagan.</div>';
    return;
  }
  refImages.forEach(r=>{
    const row=document.createElement('div');
    row.className='corner-item'+(r.id===activeRefId?' sel':'');
    row.style.cssText='padding:6px;margin-bottom:6px;';
    const wmm=(isFinite(r.wmm)?r.wmm:200).toFixed(1);
    const hmm=(isFinite(r.hmm)?r.hmm:200).toFixed(1);
    row.innerHTML =
      '<div style="display:flex;align-items:center;gap:6px;">'+
        '<span style="flex:1;font-size:12px;'+(r.id===activeRefId?'color:var(--cyan);font-weight:600;':'')+'" data-pick="'+r.id+'">'+
          (r.name||'rasm')+' <span style="color:var(--text-dim);">'+wmm+'×'+hmm+' mm</span></span>'+
        '<button class="flipBtn" data-vis="'+r.id+'" title="Korinish">'+(r.visible?'👁':'🚫')+'</button>'+
        '<button class="flipBtn" data-lock="'+r.id+'" title="Qulf">'+(r.locked?'🔒':'🔓')+'</button>'+
        '<button class="flipBtn" data-del="'+r.id+'" title="Ochirish">✕</button>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:4px;margin-top:5px;font-size:11px;color:var(--text-dim);">'+
        'Shaffoflik<input type="range" min="0" max="100" value="'+Math.round((r.opacity==null?0.5:r.opacity)*100)+'" data-op="'+r.id+'" style="flex:1;">'+
        '<span style="width:30px;text-align:right;">'+Math.round((r.opacity==null?0.5:r.opacity)*100)+'%</span>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:4px;margin-top:5px;font-size:11px;color:var(--text-dim);flex-wrap:wrap;">'+
        '<label style="display:flex;align-items:center;gap:3px;">En<input type="number" data-w="'+r.id+'" value="'+wmm+'" min="0.1" step="1" style="width:64px;padding:2px;">mm</label>'+
        '<label style="display:flex;align-items:center;gap:3px;">Burchak<input type="number" data-rot="'+r.id+'" value="'+(r.rot||0)+'" step="1" style="width:54px;padding:2px;">&deg;</label>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;color:var(--text-dim);">'+
        '<label style="display:flex;align-items:center;gap:3px;">X<input type="number" data-x="'+r.id+'" value="'+(r.x||0).toFixed(1)+'" step="1" style="width:64px;padding:2px;"></label>'+
        '<label style="display:flex;align-items:center;gap:3px;">Y<input type="number" data-y="'+r.id+'" value="'+(r.y||0).toFixed(1)+'" step="1" style="width:64px;padding:2px;"></label>'+
        '<button class="flipBtn" data-center="'+r.id+'" title="Chizma markaziga qoyish">⌖</button>'+
      '</div>';
    const q=s=>row.querySelector(s);
    q('[data-pick]').addEventListener('click', ()=>{ activeRefId=r.id; renderRefPanel(); draw(); });
    q('[data-vis]').addEventListener('click', ()=>{ r.visible=!r.visible; renderRefPanel(); draw(); });
    q('[data-lock]').addEventListener('click', ()=>{ r.locked=!r.locked; renderRefPanel(); draw(); });
    q('[data-del]').addEventListener('click', ()=>{ removeReference(r.id); });
    q('[data-op]').addEventListener('input', (e)=>{
      r.opacity=parseFloat(e.target.value)/100;
      if(e.target.nextElementSibling)e.target.nextElementSibling.textContent=Math.round(r.opacity*100)+'%';
      draw();
    });
    q('[data-w]').addEventListener('change', (e)=>{
      const v=parseFloat(e.target.value);
      if(isFinite(v)&&v>0){ r.wmm=v; r.hmm=v*(r.aspect||1); }
      draw(); renderRefPanel();
    });
    q('[data-rot]').addEventListener('change', (e)=>{
      const v=parseFloat(e.target.value); if(isFinite(v)) r.rot=v; draw(); renderRefPanel();
    });
    q('[data-x]').addEventListener('change', (e)=>{ const v=parseFloat(e.target.value); if(isFinite(v)) r.x=v; draw(); renderRefPanel(); });
    q('[data-y]').addEventListener('change', (e)=>{ const v=parseFloat(e.target.value); if(isFinite(v)) r.y=v; draw(); renderRefPanel(); });
    q('[data-center]').addEventListener('click', ()=>{
      // put the image over the middle of the current drawing (or the origin)
      let cx=0, cy=0, n=0;
      drawnLines.forEach(l=>l.points.forEach(p=>{ cx+=p.x; cy+=p.y; n++; }));
      if(n){ r.x=cx/n; r.y=cy/n; }
      draw(); renderRefPanel();
    });
    row.addEventListener('change',()=>pushHistory());
    row.addEventListener('click',e=>{if(e.target.closest('[data-vis],[data-lock],[data-center]'))pushHistory();});
    box.appendChild(row);
  });
}
function setRefEditMode(on){
  refEditMode = !!on;
  const b=document.getElementById('refEditBtn');
  if(b) b.classList.toggle('active', refEditMode);
  const hint=document.getElementById('hint');
  if(hint) hint.innerHTML = refEditMode
    ? 'Rasm tahriri YOQILDI — rasmni sudrab suring. Qulflangan rasm surilmaydi.'
    : 'Rasm tahriri o\'chirildi.';
  draw();
}
