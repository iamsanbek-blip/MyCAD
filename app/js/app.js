/* ==========================================================================
   js/app.js
   Bootstrap: initApp() va ilovani ishga tushirish

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

let _appInited=false;
function initApp(){
  if(_appInited) return;   // never wire listeners twice
  _appInited=true;
  resizeCanvas();
  polygons = [];
  corners = [];
  detectCorners();
  history=[]; historyIndex=-1; pushHistory();
  centerViewAtOrigin(1000);
  renderColorPalette();
  renderLayerPanel();
  // Interfeys himoyasi (maydon qotishini davolaydi) — js/ui/input-guard.js
  if(typeof wireInputGuard==='function') wireInputGuard();

  // Til (UZ/EN) — js/ui/i18n.js. Mavzudan OLDIN chaqiriladi, chunki
  // theme.js select ichiga variantlar qo'shadi va ular ham tarjima
  // qilinishi kerak bo'lishi mumkin kelajakda.
  if(typeof wireI18n==='function') wireI18n();

  // Mavzu va grid — js/ui/theme.js
  if(typeof wireTheme==='function') wireTheme();
  // Maydon o'lchash — js/tools/area.js
  if(typeof wireArea==='function') wireArea();

  // Fayl boshqaruvi (New / Open / Save / Save As) — js/io/filemanager.js
  initPages();
  initModel3D();
  wireFileManager();
  wireShortcuts();
  markProjectSaved(null,null,null);
  const projIn=document.getElementById('projInput');
  if(projIn){
    projIn.addEventListener('change', (e)=>{
      const f=e.target.files[0]; if(!f) return;
      const rd=new FileReader();
      rd.onload=()=>acceptProjectFile(rd.result,f.name,null,null);
      rd.onerror=()=>alert('Faylni o\'qib bo\'lmadi.');
      rd.readAsText(f);
      e.target.value='';
    });
  }
  [['alignLeftBtn','left'],['alignRightBtn','right'],['alignCenterXBtn','centerX'],
   ['alignTopBtn','top'],['alignBottomBtn','bottom'],['alignCenterYBtn','centerY']].forEach(([id,mode])=>{
    const b=document.getElementById(id);
    if(b) b.addEventListener('click', ()=>alignSelected(mode));
  });
  const dH=document.getElementById('distHBtn');
  if(dH) dH.addEventListener('click', ()=>distributeSelected('h'));
  const dV=document.getElementById('distVBtn');
  if(dV) dV.addEventListener('click', ()=>distributeSelected('v'));
  const arrB=document.getElementById('arrayBtn');
  if(arrB) arrB.addEventListener('click', ()=>{ if(arrayMode) finishArray(); else startArray(); });
  const arrApply=document.getElementById('arrayApplyBtn');
  if(arrApply) arrApply.addEventListener('click', applyArray);
  const arrCancel=document.getElementById('arrayCancelBtn');
  if(arrCancel) arrCancel.addEventListener('click', finishArray);
  const arrType=document.getElementById('arrayType');
  if(arrType) arrType.addEventListener('change', ()=>{ syncArrayPanel(); draw(); });
  const gB=document.getElementById('groupBtn');
  if(gB) gB.addEventListener('click', groupSelected);
  const ugB=document.getElementById('ungroupBtn');
  if(ugB) ugB.addEventListener('click', ungroupSelected);
  const nestRun=document.getElementById('nestRunBtn');
  if(nestRun) nestRun.addEventListener('click', runNesting);
  // Editing the sheet size instantly resizes the drawn sheet outline.
  ['nestSheetW','nestSheetH','nestMargin'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const upd=()=>{
      if(!nestSheets.length) return;
      const SW=safeNum('nestSheetW',2440,10), SH=safeNum('nestSheetH',1220,10);
      const step=SW+Math.max(safeNum('nestGap',10,0)*4,50);
      markProjectDirty();
      nestSheets=nestSheets.map((s,i)=>({x0:i*step, y0:0, x1:i*step+SW, y1:SH, index:i}));
      draw();
    };
    el.addEventListener('input', upd);
    el.addEventListener('change', upd);
  });
  const nestClr=document.getElementById('nestClearBtn');
  if(nestClr) nestClr.addEventListener('click', clearNestSheets);
  const refBtn=document.getElementById('refImgBtn');
  const refIn=document.getElementById('refImgInput');
  if(refBtn && refIn){
    refBtn.addEventListener('click', ()=>refIn.click());
    refIn.addEventListener('change', (e)=>{
      const f=e.target.files[0]; if(!f) return;
      if(!/^image\//.test(f.type) && !/\.(png|jpe?g|svg|webp|gif)$/i.test(f.name)){
        alert('Faqat rasm fayllari (JPG, PNG, SVG, WEBP, GIF).'); e.target.value=''; return;
      }
      const rd=new FileReader();
      rd.onload=()=>{ addReferenceImage(rd.result, f.name);
        document.getElementById('hint').innerHTML='Rasm yuklandi: '+f.name+' — "Tahrir" bilan joylashtiring.'; };
      rd.onerror=()=>alert('Rasmni o\'qib bo\'lmadi.');
      rd.readAsDataURL(f);
      e.target.value='';
    });
  }
  const refEd=document.getElementById('refEditBtn');
  if(refEd) refEd.addEventListener('click', ()=>setRefEditMode(!refEditMode));
  renderRefPanel();
  const fillChk=document.getElementById('fillShapeChk');
  if(fillChk) fillChk.addEventListener('change', (e)=>applyFillToSelection(e.target.checked));
  const addLyBtn=document.getElementById('addLayerBtn');
  if(addLyBtn) addLyBtn.addEventListener('click', addLayer);
  ['gridStepInp','snapGridChk','angleStepInp','snapAngleChk'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('change', ()=>draw());
    // Commit on change/blur; typing a grid value does not rebuild geometry.
  });
  // Matn asbobi tugmalari
  const tAdd=document.getElementById('textAddBtn');
  if(tAdd) tAdd.addEventListener('click', ()=>toggleTextTool());
  const tDel=document.getElementById('textDelBtn');
  if(tDel) tDel.addEventListener('click', ()=>{
    const n=deleteSelectedTexts();
    document.getElementById('hint').innerHTML = n ? (n+' ta matn o\'chirildi.') : 'O\'chirish uchun matnni bosib tanlang.';
  });
  const pngBtn=document.getElementById('exportPngBtn');
  if(pngBtn) pngBtn.addEventListener('click', ()=>exportPNG());
  document.getElementById('exportPngRegionBtn')?.addEventListener('click', startPNGRegionExport);
  draw();
  renderList();
  renderDrawnList();
  window.desktop?.ready?.();
}
if(document.readyState==='complete' || document.readyState==='interactive'){
  setTimeout(initApp, 0);
} else {
  window.addEventListener('load', initApp);
}
