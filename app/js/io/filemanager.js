/* Document-wide file lifecycle. A failed/cancelled read never changes the save path. */
let projectFileHandle=null, projectFilePath=null, projectFileName=null;
let projectDirty=false, projectRevision=0, saveInFlight=null, fileOperationBusy=false;
function onDesktop(){return !!window.desktop?.saveProjectAs;}
function fsApiAvailable(){return onDesktop()||typeof window.showSaveFilePicker==='function';}
function markProjectDirty(){
  if(typeof pagesHydrating!=='undefined'&&pagesHydrating)return;
  projectRevision++;projectDirty=true;updateFileBadge();
}
function markProjectSaved(name,handle,fullPath,revision=projectRevision){
  if(name!==undefined)projectFileName=name;
  if(handle!==undefined)projectFileHandle=handle;
  if(fullPath!==undefined)projectFilePath=fullPath;
  projectDirty=revision!==projectRevision;updateFileBadge();
}
function updateFileBadge(){
  const name=projectFileName||'Nomsiz loyiha';
  const el=document.getElementById('currentFileName');
  if(el){el.textContent=name+(projectDirty?' •':'');el.title=projectFilePath||'Barcha sahifalar bitta .dbe faylga saqlanadi.';}
  const badge=document.getElementById('projectFileStatus');if(badge){badge.textContent=name+(projectDirty?' •':'');badge.title='Loyiha: '+name;}
  document.title=(projectDirty?'• ':'')+name+' — Rugby';
}
function setHint(msg){const h=document.getElementById('hint');if(h)h.textContent=msg;if(typeof appMode!=='undefined'&&appMode==='model3d')panelMessage(msg);}
function projectText(){return JSON.stringify(buildProject());}
function projectIsEmpty(){
  return !documentPages.some(p=>p.id===activePageId
    ? drawnLines.length||dimensions.length||texts.length||refImages.length||panelScene.panels.length||panelScene.templates.length
    : p.shapes.length||p.dimensions.length||p.texts.length||p.refImages.length||p.scene3d?.panels.length||p.scene3d?.templates.length);
}
async function chooseUnsavedAction(){
  if(window.desktop?.confirmReplace)return window.desktop.confirmReplace();
  const d=document.getElementById('unsavedDialog');
  return new Promise(resolve=>{
    d.returnValue='cancel';d.showModal();
    d.addEventListener('close',()=>resolve(d.returnValue||'cancel'),{once:true});
  });
}
async function mayReplaceDocument(){
  // Finish an already-started write before a different document can own its path.
  if(saveInFlight)await saveInFlight;
  if(!projectDirty)return true;
  const choice=await chooseUnsavedAction();
  if(choice==='discard')return true;
  if(choice==='save')return !!(await saveProjectQuick())&&!projectDirty;
  return false;
}
async function newProject(){
  if(fileOperationBusy)return false;fileOperationBusy=true;
  try{
    settlePageInteraction();
    if(!await mayReplaceDocument())return false;
    const page=RugbyDocument.emptyPage();page.view={...view};
    documentPages=[page];activePageId=page.id;applyPageData(page);
    projectRevision++;markProjectSaved(null,null,null);setHint('Yangi loyiha · Sahifa 1');return true;
  }finally{fileOperationBusy=false;}
}
async function performSave(asNew){
  try{
    settlePageInteraction();
    const text=projectText(), revision=projectRevision;
    const suggested=/\.dbe$/i.test(projectFileName||'')?projectFileName:(projectFileName||'loyiha').replace(/\.json$/i,'')+'.dbe';
    if(onDesktop()){
      const r=!asNew&&projectFilePath
        ? await window.desktop.saveProjectTo(projectFilePath,text)
        : await window.desktop.saveProjectAs(text,projectFilePath||suggested);
      if(!r)return false;
      markProjectSaved(r.name,null,r.path,revision);setHint('Saqlandi: '+r.name+' · barcha sahifalar');return true;
    }
    if(typeof window.showSaveFilePicker==='function'){
      try{
        const handle=!asNew&&projectFileHandle?projectFileHandle:await window.showSaveFilePicker({suggestedName:suggested,types:[{description:'Rugby loyihasi',accept:{'application/json':['.dbe']}}]});
        const writer=await handle.createWritable();await writer.write(text);await writer.close();
        markProjectSaved(handle.name,handle,null,revision);setHint('Saqlandi: '+handle.name+' · barcha sahifalar');return true;
      }catch(err){
        if(!['SecurityError','NotAllowedError','NotSupportedError'].includes(err.name))throw err;
        // Embedded browser permissions may expose the API but reject its use.
      }
    }
    if(!await downloadFile(text,suggested,'application/json'))return false;
    markProjectSaved(suggested,null,null,revision);setHint('Saqlandi: '+suggested+' · File → Ochish orqali qayta oching.');return true;
  }catch(err){if(err.name!=='AbortError')alert('Saqlash amalga oshmadi: '+err.message);return false;}
}
function queueSave(asNew){
  if(saveInFlight)return saveInFlight;
  saveInFlight=performSave(asNew).finally(()=>{saveInFlight=null;});return saveInFlight;
}
function saveProjectQuick(){return queueSave(false);}
function saveProjectAs(){return queueSave(true);}
async function acceptProjectFile(text,name,handle=null,fullPath=null){
  try{RugbyDocument.decode(text);}catch(err){alert('Loyiha ochilmadi: '+err.message);return false;}
  settlePageInteraction();
  if(!await mayReplaceDocument())return false;
  if(!loadProject(text,name))return false;
  projectRevision++;markProjectSaved(name,handle,fullPath);return true;
}
async function openProjectDialog(){
  if(fileOperationBusy)return false;fileOperationBusy=true;
  try{
    if(onDesktop()&&window.desktop.openProject){
      const r=await window.desktop.openProject();if(!r)return false;
      return await acceptProjectFile(r.text,r.name,null,r.path);
    }
    // Native file input works in embedded browsers without filesystem permissions.
    const input=document.getElementById('projInput');input.value='';input.click();return false;
  }catch(err){if(err.name==='SecurityError'||err.name==='NotAllowedError'){document.getElementById('projInput').click();return false;}if(err.name!=='AbortError')alert('Fayl ochilmadi: '+err.message);return false;}
  finally{fileOperationBusy=false;}
}
async function openProjectUpload(file){
  if(!file||fileOperationBusy)return false;fileOperationBusy=true;
  try{const text=typeof file.text==='function'?await file.text():await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Faylni o‘qib bo‘lmadi.'));reader.readAsText(file);});return await acceptProjectFile(text,file.name);}
  catch(err){alert('Fayl ochilmadi: '+err.message);return false;}
  finally{fileOperationBusy=false;document.getElementById('projInput').value='';}
}
function triggerImportDXF(){document.getElementById('fileInput')?.click();}
function triggerExportDXF(){document.getElementById('exportBtn')?.click();}
function wireFileManager(){
  for(const [id,fn]of Object.entries({newProjBtn:newProject,openProjBtn:openProjectDialog,saveProjBtn:saveProjectQuick,saveAsProjBtn:saveProjectAs}))
    document.getElementById(id)?.addEventListener('click',fn);
  window.addEventListener('beforeunload',e=>{if(projectDirty){e.preventDefault();e.returnValue='';}});
  if(window.desktop?.onOpenFile)window.desktop.onOpenFile(async(text,name,fullPath)=>{
    if(fileOperationBusy)return;fileOperationBusy=true;
    try{await acceptProjectFile(text,name,null,fullPath||null);}finally{fileOperationBusy=false;}
  });
  if(window.desktop?.onSaveAndClose)window.desktop.onSaveAndClose(async()=>{
    if(await saveProjectQuick()&&!projectDirty)window.desktop.closeAfterSave();
  });
  updateFileBadge();
}
