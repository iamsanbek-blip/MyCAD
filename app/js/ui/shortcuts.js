/* Command registry: add a command here once; settings and dispatch share it. */
const RUGBY_COMMANDS = [
  ['view.model3d','3D modellash','Shift+F3',()=>setAppMode('model3d'),'mode3dBtn'],
  ['file.new','Yangi loyiha','Ctrl+N',()=>newProject(),'newProjBtn',true],
  ['file.open','Loyihani ochish','Ctrl+O',()=>openProjectDialog(),'openProjBtn',true],
  ['file.save','Barcha sahifalarni saqlash','Ctrl+S',()=>saveProjectQuick(),'saveProjBtn',true],
  ['file.saveAs','Boshqa nom bilan saqlash','Ctrl+Shift+S',()=>saveProjectAs(),'saveAsProjBtn',true],
  ['file.import','DXF import','Ctrl+I',()=>triggerImportDXF(),'importBtn'],
  ['file.export','Joriy sahifani DXF eksport','Ctrl+E',()=>triggerExportDXF(),'exportBtn'],
  ['edit.undo','Bekor qilish — Undo','Ctrl+Z',()=>undo(),'undoBtn'],
  ['edit.redo','Qaytarish — Redo','Ctrl+Y',()=>redo(),'redoBtn'],
  ['edit.redoAlt','Qaytarish — qo‘shimcha tugma','Ctrl+Shift+Z',()=>redo()],
  ['edit.copy','Nusxalash','Ctrl+C',()=>copySelected(false)],
  ['edit.cut','Kesib olish','Ctrl+X',()=>copySelected(true)],
  ['edit.paste','Nusxani joylashtirish','Ctrl+V',()=>startPastePlace()],
  ['edit.pasteQuick','Nusxani darhol qo‘yish','Ctrl+Shift+V',()=>pasteClipboard(10/view.scale,-10/view.scale)],
  ['edit.duplicate','Obyekt nusxasi','Ctrl+D',()=>duplicateSelected()],
  ['edit.selectAll','Hammasini tanlash','Ctrl+A',()=>selectAllObjects()],
  ['edit.delete','Tanlanganlarni o‘chirish','Delete',()=>deleteSelectedShapes(),'deleteLineBtn'],
  ['edit.group','Guruhlash','Ctrl+G',()=>groupSelected(),'groupBtn'],
  ['edit.ungroup','Guruhni ajratish','Ctrl+Shift+G',()=>ungroupSelected(),'ungroupBtn'],
  ['draw.line','Chiziq / Polyline','L',()=>chooseDrawingTool('line'),'toolLineBtn'],
  ['draw.circle','Aylana','C',()=>chooseDrawingTool('circle'),'toolCircleBtn'],
  ['draw.rect','To‘rtburchak','K',()=>chooseDrawingTool('rect'),'toolRectBtn'],
  ['draw.arc','Yoy','A',()=>chooseDrawingTool('arc'),'toolArcBtn'],
  ['draw.polygon','Ko‘pburchak','G',()=>chooseDrawingTool('polygon'),'toolPolygonBtn'],
  ['draw.none','Tanlash asbobi','N',()=>chooseDrawingTool('none'),'toolNoneBtn'],
  ['tool.move','Ko‘chirish','M',()=>startTransform('move'),'moveBtn'],
  ['tool.rotate','Aylantirish','R',()=>startTransform('rotate'),'rotateBtn'],
  ['tool.scale','Masshtab','S',()=>startTransform('scale'),'scaleBtn'],
  ['tool.mirror','Oyna aksi','I',()=>startTransform('mirror'),'mirrorBtn'],
  ['tool.stretch','Stretch','W',()=>stretchMode?finishStretch():startStretch(),'stretchBtn'],
  ['tool.trim','Trim / Extend','T',()=>trimMode?finishTrim():startTrim(),'trimBtn'],
  ['tool.offset','Offset','O',()=>offsetMode?finishOffset():startOffset(),'offsetBtn'],
  ['tool.fillet','Fillet','F',()=>filletMode==='fillet'?finishFillet():startFillet('fillet'),'filletBtn'],
  ['tool.chamfer','Chamfer','Shift+F',()=>filletMode==='chamfer'?finishFillet():startFillet('chamfer'),'chamferBtn'],
  ['tool.join','Birlashtirish','J',()=>document.getElementById('joinBtn').click(),'joinBtn'],
  ['tool.explode','Segmentlarga ajratish','E',()=>document.getElementById('explodeBtn').click(),'explodeBtn'],
  ['tool.dimension','O‘lcham','D',()=>startDim('aligned'),'dimAlignBtn'],
  ['tool.text','Matn','B',()=>toggleTextTool(),'textAddBtn'],
  ['tool.area','Maydon va perimetr','Shift+A',()=>reportArea()],
  ['view.grid','Katakni ko‘rsatish / yashirish','H',()=>toggleGrid(),'gridToggle'],
  ['view.ortho','Ortho','F8',()=>{orthoMode=!orthoMode;document.getElementById('orthoOnBtn').classList.toggle('active',orthoMode);document.getElementById('orthoOffBtn').classList.toggle('active',!orthoMode);draw();}],
  ['page.add','Yangi sahifa','Shift+F11',()=>addPage(),'pageAddBtn'],
  ['page.next','Keyingi sahifa','Ctrl+PageDown',()=>nextPage(1)],
  ['page.previous','Oldingi sahifa','Ctrl+PageUp',()=>nextPage(-1)],
  ['page.rename','Sahifani nomlash','F2',()=>renamePage(),'pageRenameBtn'],
  ['settings.keys','Hotkey sozlamalari','F10',()=>openShortcutSettings(),'shortcutSettingsBtn']
].map(([id,label,key,run,button,inField])=>({id,label,key,run,button,inField:!!inField}));
const SHORTCUT_STORAGE='rugby.shortcuts.v1';
const DEFAULT_SHORTCUTS=Object.fromEntries(RUGBY_COMMANDS.map(c=>[c.id,c.key]));
let shortcutBindings={...DEFAULT_SHORTCUTS},shortcutDraft=null;
function chooseDrawingTool(tool){
  if(appMode==='draw'&&drawTool==='line'&&currentDraw&&(tool==='line'||tool==='arc')){
    lineSubmode=tool==='arc'?'arc':'straight';lineArcMode=tool==='arc';currentDraw.pendingArcMid=null;updateLineModeBadge();return;
  }
  if(appMode!=='draw')setAppMode('draw');setDrawTool(tool);
}
function handleShortcut(e){
  if(e.defaultPrevented||e.isComposing)return;
  if(isTextInputTarget(e.target)||inInputField())return;
  if(typeof pngRegionSelection!=='undefined' && pngRegionSelection)return;
  if(document.querySelector('dialog[open]')||document.getElementById('askOverlay')?.style.display==='flex')return;
  const combo=RugbyShortcuts.fromEvent(e);if(!combo)return;
  const command=RUGBY_COMMANDS.find(c=>shortcutBindings[c.id]===combo);if(!command)return;
  const el=e.target;const inField=el?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(el?.tagName);
  if(inField&&(!command.inField||(!e.ctrlKey&&!e.metaKey&&!e.altKey)))return;
  if(currentDraw&&typedLen!==''&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&combo.length===1)return;
  if(currentDraw&&command.id==='edit.delete')return;
  if(appMode==='model3d'){
    const handlers={'edit.delete':panelDelete,'edit.duplicate':panelDuplicate,'tool.move':()=>panelMode('translate'),'tool.rotate':()=>panelMode('rotate'),'tool.scale':()=>panelMode('scale'),'view.ortho':panelToggleOrtho};
    if(handlers[command.id]){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)handlers[command.id]();return;}
    if(!/^(file\.(new|open|save|saveAs)|page\.|edit\.(undo|redo)|settings\.|view\.model3d)/.test(command.id))return;
  }
  e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
  Promise.resolve(command.run()).catch(err=>{console.error(err);alert('Buyruq bajarilmadi: '+err.message);});
}
function refreshShortcutLabels(){
  RUGBY_COMMANDS.forEach(c=>{
    const e=document.getElementById(c.button);if(!e)return;
    e.title=c.label+(shortcutBindings[c.id]?' — '+shortcutBindings[c.id]:'');
    const badge=e.querySelector('.kb');if(badge)badge.textContent=shortcutBindings[c.id]||'—';
  });
}
function shortcutError(error){
  if(error.startsWith('conflict:'))return 'Bu tugma band: '+RUGBY_COMMANDS.find(c=>c.id===error.slice(9))?.label+'. Avval o‘sha buyruq tugmasini bo‘shating.';
  return error;
}
function renderShortcutRows(){
  const box=document.getElementById('shortcutRows'),filter=document.getElementById('shortcutSearch').value.toLocaleLowerCase();
  box.replaceChildren();
  RUGBY_COMMANDS.filter(c=>(c.label+' '+shortcutDraft[c.id]).toLocaleLowerCase().includes(filter)).forEach(c=>{
    const row=document.createElement('div');row.className='shortcutRow';
    const label=document.createElement('label');label.textContent=c.label;label.htmlFor='key-'+c.id;
    const input=document.createElement('input');input.id='key-'+c.id;input.readOnly=true;input.value=shortcutDraft[c.id]||'—';
    input.setAttribute('aria-label',c.label+' hotkey');input.title='Bosing, keyin yangi kombinatsiyani bosing';
    input.addEventListener('keydown',e=>{
      if(e.key==='Tab')return;e.preventDefault();e.stopPropagation();if(e.key==='Escape'){input.blur();return;}
      const combo=RugbyShortcuts.fromEvent(e);if(!combo)return;
      const error=RugbyShortcuts.validate(combo,c.id,shortcutDraft);
      document.getElementById('shortcutError').textContent=error?shortcutError(error):'';
      if(!error){shortcutDraft[c.id]=combo;input.value=combo;}
    });
    const clear=document.createElement('button');clear.type='button';clear.className='secondary';clear.textContent='Bo‘shatish';
    clear.addEventListener('click',()=>{shortcutDraft[c.id]='';input.value='—';document.getElementById('shortcutError').textContent='';});
    row.append(label,input,clear);box.appendChild(row);
  });
}
function openShortcutSettings(){
  shortcutDraft={...shortcutBindings};document.getElementById('shortcutSearch').value='';document.getElementById('shortcutError').textContent='';
  renderShortcutRows();document.getElementById('shortcutDialog').showModal();document.getElementById('shortcutSearch').focus();
}
function wireShortcuts(){
  try{shortcutBindings=RugbyShortcuts.restore(DEFAULT_SHORTCUTS,JSON.parse(localStorage.getItem(SHORTCUT_STORAGE)));}catch{shortcutBindings={...DEFAULT_SHORTCUTS};}
  window.addEventListener('keydown',handleShortcut,true);
  document.getElementById('shortcutSettingsBtn').addEventListener('click',openShortcutSettings);
  document.getElementById('shortcutSearch').addEventListener('input',renderShortcutRows);
  document.getElementById('shortcutResetBtn').addEventListener('click',()=>{shortcutDraft={...DEFAULT_SHORTCUTS};renderShortcutRows();document.getElementById('shortcutError').textContent='';});
  document.getElementById('shortcutSaveBtn').addEventListener('click',()=>{
    try{localStorage.setItem(SHORTCUT_STORAGE,JSON.stringify(shortcutDraft));}
    catch{document.getElementById('shortcutError').textContent='Sozlamani saqlab bo‘lmadi. Diskdagi joyni tekshiring.';return;}
    shortcutBindings={...shortcutDraft};refreshShortcutLabels();document.getElementById('shortcutDialog').close();setHint('Hotkey sozlamalari saqlandi.');
  });
  document.getElementById('shortcutCancelBtn').addEventListener('click',()=>document.getElementById('shortcutDialog').close());
  refreshShortcutLabels();
}
