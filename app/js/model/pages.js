/* Adapter between a multi-page document and the existing geometry engine.
   Only the active page is projected into the legacy globals. */
let documentPages = [], activePageId = null, pagesHydrating = false;
const PAGE_CONTROL_IDS = ['nestSheetW','nestSheetH','nestMargin','nestGap','gridStepInp','snapGridChk','angleStepInp','snapAngleChk'];
function capturePageData(){
  const settings={};
  PAGE_CONTROL_IDS.forEach(id=>{const e=document.getElementById(id);if(e)settings[id]=e.type==='checkbox'?e.checked:e.value;});
  return {
    layers:RugbyDocument.clone(layers), activeLayer, activeColor,
    shapes:drawnLines.map(compactShape), dimensions:RugbyDocument.clone(dimensions), texts:RugbyDocument.clone(texts),
    refImages:refImages.map(r=>{const {img,...data}=r;return RugbyDocument.clone(data);}),
    corners:corners.map(c=>({key:cornerKey(c),mode:c.mode,size:c.size,offset:c.offset||0,tboneDir:c.tboneDir||'auto',tboneMirror:!!c.tboneMirror})),
    view:{...view}, nestSheets:RugbyDocument.clone(nestSheets), settings
  };
}
function activePage(){return documentPages.find(p=>p.id===activePageId);}
function rememberActivePage(){
  const page=activePage();if(!page)return;
  Object.assign(page,capturePageData());
  page.history=history;page.historyIndex=historyIndex;
}
function settlePageInteraction(){
  // Roll back live previews: changing a tab must never commit a half-move.
  if(transformTool && transformSnapshot){
    transformSnapshot.forEach((s,i)=>{if(s)drawnLines[i]=RugbyDocument.clone(s);});
  }
  if(stretchMode && stretchSnap)drawnLines=RugbyDocument.clone(stretchSnap);
  finishTransform();finishStretch();finishTrim();finishOffset();finishFillet();finishDim();finishTextTool();finishArray();cancelPastePlace();
  if(currentDraw){
    if(drawTool==='line' && currentDraw.points.length>=2)finishDraw();else cancelDraw();
  }
  resetInteractionState('page-switch');draggingRef=null;refEditMode=false;hoverSnap=null;
  dimArcPick=null;pendingMirrorKey=false;currentDraw=null;typedLen='';typedLen2='';typingSecond=false;
  detectCorners();
}
function repaintPage(){
  renderLayerPanel();renderColorPalette();renderRefPanel();renderDrawnList();renderList();updateHistoryStats();
  updateDrawActionButtons();updateTypedBadge();renderPageTabs();draw();
}
function applyPageData(page){
  const was=pagesHydrating;pagesHydrating=true;
  try{
    layers=RugbyDocument.clone(page.layers);activeLayer=page.activeLayer;activeColor=page.activeColor;
    polygons=[];drawnLines=page.shapes.map(expandShape);dimensions=RugbyDocument.clone(page.dimensions);texts=RugbyDocument.clone(page.texts);
    refImages=RugbyDocument.clone(page.refImages).map(r=>({...r,img:null}));activeRefId=refImages[0]?.id||null;
    refImages.forEach(r=>attachRefImage(r));
    nestSheets=RugbyDocument.clone(page.nestSheets||[]);nestVariants=[];nestVariantIdx=0;nestSignature='';
    view={...page.view};
    PAGE_CONTROL_IDS.forEach(id=>{const e=document.getElementById(id);if(!e)return;
      const v=page.settings?.[id];if(e.type==='checkbox')e.checked=v===undefined?e.defaultChecked:!!v;else e.value=v===undefined?e.defaultValue:v;
    });
    corners=[];detectCorners(new Map(page.corners.map(c=>[c.key,c])));
    history=page.history||[];historyIndex=Number.isInteger(page.historyIndex)?page.historyIndex:history.length-1;
    if(!history.length){history=[];historyIndex=-1;pushHistory();}
    repaintPage();
  }finally{pagesHydrating=was;}
}
function switchPage(id){
  const next=documentPages.find(p=>p.id===id);if(!next||id===activePageId)return false;
  settlePageInteraction();rememberActivePage();activePageId=id;applyPageData(next);
  setHint(next.name+' · '+next.shapes.length+' ta shakl');return true;
}
function nextPage(delta){
  const i=documentPages.findIndex(p=>p.id===activePageId);
  return switchPage(documentPages[(i+delta+documentPages.length)%documentPages.length].id);
}
function pageName(base='Sahifa'){
  let i=1;while(documentPages.some(p=>p.name===base+' '+i))i++;return base+' '+i;
}
function addPage(){
  if(documentPages.length>=500){alert('Bitta loyihada ko‘pi bilan 500 sahifa.');return false;}
  settlePageInteraction();rememberActivePage();
  const page=RugbyDocument.emptyPage(pageName());page.view={...view};
  documentPages.push(page);activePageId=page.id;applyPageData(page);markProjectDirty();return page.id;
}
function duplicatePage(){
  if(documentPages.length>=500)return false;
  settlePageInteraction();rememberActivePage();const original=activePage();
  const {history:oldHistory,historyIndex:oldIndex,...data}=original;
  const copy=RugbyDocument.clone(data);copy.id=RugbyDocument.uid();copy.name=pageName(original.name+' — nusxa');
  const i=documentPages.indexOf(original);documentPages.splice(i+1,0,copy);activePageId=copy.id;
  applyPageData(copy);markProjectDirty();return copy.id;
}
async function renamePage(){
  const page=activePage();if(!page)return;
  const value=await askText('Sahifa nomi',page.name);if(value===null)return;
  const name=value.replace(/[\r\n]+/g,' ').trim().slice(0,80);
  if(!name){alert('Sahifa nomi bo‘sh bo‘lmasin.');return;}
  if(documentPages.some(p=>p.id!==page.id&&p.name===name)){alert('Bu nomli sahifa bor.');return;}
  if(page.name!==name){page.name=name;renderPageTabs();markProjectDirty();}
}
function movePage(delta){
  const i=documentPages.findIndex(p=>p.id===activePageId),target=i+delta;
  if(target<0||target>=documentPages.length)return false;
  const [page]=documentPages.splice(i,1);documentPages.splice(target,0,page);renderPageTabs();markProjectDirty();return true;
}
function deletePage(){
  if(documentPages.length===1){setHint('Oxirgi sahifani o‘chirib bo‘lmaydi.');return false;}
  const page=activePage();if(!confirm('“'+page.name+'” sahifasi va undagi chizmalar o‘chirilsinmi?'))return false;
  settlePageInteraction();const i=documentPages.indexOf(page);documentPages.splice(i,1);
  const next=documentPages[Math.min(i,documentPages.length-1)];activePageId=next.id;applyPageData(next);markProjectDirty();return true;
}
function renderPageTabs(){
  const tabs=document.getElementById('pageTabs');if(!tabs)return;
  tabs.replaceChildren();documentPages.forEach((page,index)=>{
    const b=document.createElement('button');b.type='button';b.className='pageTab'+(page.id===activePageId?' active':'');
    b.setAttribute('role','tab');b.setAttribute('aria-selected',String(page.id===activePageId));b.dataset.pageId=page.id;
    b.textContent=(index+1)+'  '+page.name;b.title=page.name+' — ikki marta bosib nomlash';
    b.addEventListener('click',()=>switchPage(page.id));b.addEventListener('dblclick',()=>{switchPage(page.id);renamePage();});
    tabs.appendChild(b);
  });
  const i=documentPages.findIndex(p=>p.id===activePageId);
  document.getElementById('pageLeftBtn').disabled=i<=0;document.getElementById('pageRightBtn').disabled=i>=documentPages.length-1;
  document.getElementById('pageDeleteBtn').disabled=documentPages.length<=1;
  const count=document.getElementById('pageCount');count.textContent=(i+1)+' / '+documentPages.length;
  tabs.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function initPages(){
  const page={...RugbyDocument.emptyPage(),...capturePageData(),history,historyIndex};
  documentPages=[page];activePageId=page.id;
  const bindings={pageAddBtn:addPage,pageDuplicateBtn:duplicatePage,pageRenameBtn:renamePage,pageDeleteBtn:deletePage,
    pageLeftBtn:()=>movePage(-1),pageRightBtn:()=>movePage(1)};
  Object.entries(bindings).forEach(([id,fn])=>document.getElementById(id).addEventListener('click',fn));
  document.getElementById('pageTabs').addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      e.preventDefault();e.stopPropagation();nextPage(e.key==='ArrowLeft'?-1:1);
      document.querySelector('.pageTab.active')?.focus();
    }
  });
  PAGE_CONTROL_IDS.forEach(id=>document.getElementById(id)?.addEventListener('change',markProjectDirty));
  renderPageTabs();
}
