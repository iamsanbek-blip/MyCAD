function syncWorkspaceLayout(){
 const dock=document.getElementById('cncDeleteDock'),slot=document.getElementById('drawDeleteSlot'),group=document.getElementById('deleteGroup');
 if(appMode==='edit')dock.appendChild(group);else if(group.parentNode!==slot.parentNode)slot.after(group);
}
function showPanelInspector(){
 closeMainMenus();document.body.classList.remove('workspaceWide');document.getElementById('model3dWorkspace').classList.remove('sidesHidden');
 document.getElementById('workspaceExpandBtn').setAttribute('aria-pressed','false');
 document.getElementById('panelInspectorProperties').open=true;document.getElementById('panelName').focus();
}
function initCompactWorkspace(){
 const button=document.getElementById('workspaceExpandBtn');
 button.addEventListener('click',()=>{const wide=document.body.classList.toggle('workspaceWide');button.setAttribute('aria-pressed',String(wide));resizeCanvas();panelView?.resize();});
 syncWorkspaceLayout();
 document.getElementById('panelCreateMenu').addEventListener('click',()=>{closeMainMenus();document.getElementById('panelNew').click();});
 document.getElementById('panelDockMagnet').addEventListener('click',panelToggleMagnet);
 document.getElementById('panelQuickExport').addEventListener('click',()=>{panelUpdateThicknessFilter();panelCutExport(document.getElementById('panelQuickFormat').value);});
 document.getElementById('panelQuickCopy').addEventListener('click',panelCutCopy);
 document.getElementById('cutCopy').addEventListener('click',panelCutCopy);
}
async function panelCutCopy(){
 try{const rows=panelCutRows();if(!rows.length)throw Error('Eksport uchun panel yo‘q.');
 await navigator.clipboard.writeText(RugbyCutList.serialize(rows,cutOrder,false,panelCutOptions()));
 panelExportStatus(rows.length+' qator nusxalandi. Excel yoki matn muharririga qo‘ying.');
 }catch(e){panelExportStatus('Nusxalanmadi: '+e.message+' TXT eksportdan foydalaning.');}
}
function panelExportStatus(message){for(const id of ['cutExportStatus','panelQuickStatus'])document.getElementById(id).textContent=message;}

async function panelOpenSample(){
 try{const r=await fetch('samples/korpus-3d.dbe');if(!r.ok)throw Error('Namuna yuklanmadi.');if(await acceptProjectFile(await r.text(),'korpus-3d.dbe'))setAppMode('model3d');}catch(e){alert(e.message);}
}
