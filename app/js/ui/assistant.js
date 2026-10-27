/* AI console, reviewed CAD transactions and portable user extensions. */
let assistantProfile={values:{},conflicts:[],knownKeys:[]},assistantPending=null,assistantImage=null,assistantConfig={},assistantBooted=false,assistantApplying=false,assistantProfileDraft=null;
function assistantElement(id){return document.getElementById(id);}
function assistantStatus(text){const e=assistantElement('assistantStatus');if(e)e.textContent=text;}
function assistantOpen(){assistantElement('assistantConsole').hidden=false;assistantElement('assistantPrompt').focus();}
function assistantClose(){assistantElement('assistantConsole').hidden=true;}
function assistantDock(where){assistantElement('assistantConsole').dataset.dock=where;assistantElement('assistantDockSelect').value=where;}
function assistantContext(){return{scene:RugbyPanels.copy(panelScene),selected:panelSelectionIds(),templates:Object.fromEntries(Object.entries(assistantProfile.values).filter(([k])=>k.startsWith('template:')))};}
function assistantStamp(){return JSON.stringify({page:activePageId,revision:projectRevision,scene:panelScene,selected:panelSelectionIds(),bindings:shortcutBindings,profile:assistantProfile.values});}
function assistantSettings(actions){const changes={},bindings={...shortcutBindings};for(const a of actions){if(a.type==='layout')changes.consoleDock=a.dock;if(a.type==='hotkey'){if(!RUGBY_COMMANDS.some(c=>c.id===a.command))throw Error('Buyruq topilmadi: '+a.command);bindings[a.command]=a.key;changes.shortcuts=bindings;}}
  if(changes.shortcuts)for(const [id,key]of Object.entries(bindings)){const err=RugbyShortcuts.validate(key,id,bindings);if(err)throw Error(shortcutError(err));}return changes;
}
function assistantPreview(raw,sources=[],evidence=''){
  const prepared=RugbyAssistantPlan.prepare(raw,assistantContext(),RugbyPanels);assistantSettings(prepared.settings);
  assistantPending={...prepared,stamp:assistantStamp()};
  assistantElement('assistantSummary').textContent=[prepared.plan.summary,...prepared.plan.questions.map(q=>'• '+q),...prepared.results].join('\n');
  assistantElement('assistantDetails').textContent=JSON.stringify(prepared.plan.actions,null,2);
  const rows=assistantElement('assistantPreviewRows');rows.replaceChildren();
  const changed=prepared.scene.panels.filter(p=>!panelScene.panels.some(old=>old.id===p.id&&JSON.stringify(old)===JSON.stringify(p)));
  for(const p of changed.slice(0,200)){const tr=document.createElement('tr');for(const text of [p.name,p.width+' × '+p.height+' × '+p.thickness,p.position.map(n=>+n.toFixed(3)).join(' / ')]){const td=document.createElement('td');td.textContent=text;tr.appendChild(td);}rows.appendChild(tr);}
  for(const a of prepared.rectangles){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=3;td.textContent='2D rectangle: '+a.width+' × '+a.height+' mm';tr.appendChild(td);rows.appendChild(tr);}
  assistantElement('assistantTable').hidden=changed.length+prepared.rectangles.length===0;
  assistantElement('assistantSources').replaceChildren();for(const s of sources){if(!/^https:\/\//.test(s.url))continue;const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title||s.url;assistantElement('assistantSources').appendChild(a);}
  assistantElement('assistantEvidence').textContent=evidence;
  assistantElement('assistantApply').disabled=!prepared.plan.actions.length||!!prepared.plan.questions.length;
  assistantElement('assistantSaveMacro').disabled=!prepared.plan.actions.length||!!prepared.plan.questions.length;
  assistantElement('assistantReview').hidden=false;assistantOpen();assistantStatus('Reja tayyor. O‘lchamlar va amallarni tekshiring.');return prepared;
}
async function assistantApplyPlan(){
  if(!assistantPending||assistantApplying)return;
  if(assistantStamp()!==assistantPending.stamp){assistantStatus('Chizma, tanlov yoki profil o‘zgardi. “Qayta hisoblash”ni bosing.');return;}
  const p=assistantPending;if(p.plan.questions.length)return;
  if(p.geometry&&(panelEditSession||currentDraw||transformTool)){assistantStatus('Avval joriy chizish yoki tahrir amalini tugating.');return;}
  assistantApplying=true;
  const changes=assistantSettings(p.settings);assistantElement('assistantApply').disabled=true;
  const geometryStamp=JSON.stringify([activePageId,projectRevision,panelScene,panelSelectionIds()]);
  try{
    // Disk commit first. Geometry remains untouched on persistence failure.
    if(Object.keys(changes).length)await assistantRemember(changes);
    if(p.geometry){
      if(JSON.stringify([activePageId,projectRevision,panelScene,panelSelectionIds()])!==geometryStamp)throw Error('Chizma o‘zgardi; rejani qayta hisoblang.');
      if(panelEditSession||currentDraw)throw Error('Avval joriy chizish yoki kontur tahririni tugating.');
      const before=snapshot();try{
        panelScene=RugbyPanels.copy(p.scene);
        for(const a of p.rectangles){const [x,y]=a.position,pts=[{x,y},{x:x+a.width,y},{x:x+a.width,y:y+a.height},{x,y:y+a.height}];drawnLines.push({uid:RugbyPanels.id(),kind:'line',points:pts,grips:RugbyPanels.copy(pts),closed:true,layer:activeLayer,color:activeColor});}
        if(p.rectangles.length)detectCorners();pushHistory();panelRefresh();repaintPage();
        if(p.created&&appMode!=='model3d'){restoringProject=true;try{setAppMode('model3d');}finally{restoringProject=false;}}
        if(p.created)panelView?.fit();
      }catch(e){restore(before);throw e;}
    }
    assistantPending=null;assistantElement('assistantApply').disabled=true;assistantStatus(p.geometry?'Bajarildi. Ctrl+Z — chizmani qaytarish.':(Object.keys(changes).length?'Bajarildi. Sozlamalar profilga saqlandi.':'Hisob tayyor: '+p.results.join('; ')));
  }catch(e){assistantStatus(e.message);assistantElement('assistantApply').disabled=false;}finally{assistantApplying=false;}
}
function assistantRemember(changes,bases=assistantProfile.versions){
  if(assistantApplying=== 'profile')return;
  const api=window.desktop?.assistant;
  if(api)return api.set(changes,bases).then(view=>{assistantAcceptProfile(view);return view;});
  // Browser preview has only local preferences. Cloud connection is desktop-only.
  const values={...assistantProfile.values};for(const[k,v]of Object.entries(changes))if(v===null)delete values[k];else values[k]=RugbyPanels.copy(v);
  localStorage.setItem('rugby.assistant.local.v1',JSON.stringify(values));assistantAcceptProfile({...assistantProfile,values});
}
function assistantRememberQuiet(changes){try{const p=assistantRemember(changes);p?.catch(e=>assistantStatus('Profil saqlanmadi: '+e.message));}catch(e){assistantStatus('Profil saqlanmadi: '+e.message);}}
function assistantAcceptProfile(profile){
  assistantProfile=profile;const v=profile.values||{};
  const sync=profile.sync;assistantElement('assistantSyncBadge').textContent=sync?sync.message:'Mahalliy profil';
  assistantElement('assistantSyncDetails').textContent=(sync?.message||'Mahalliy profil')+(sync?.lastSync?' · '+new Date(sync.lastSync).toLocaleString():'');
  // Never replace an open hotkey draft. Apply pending settings when it closes.
  if(assistantElement('shortcutDialog')?.open){assistantProfileDraft=profile;return;}
  const wasApplying=assistantApplying;assistantApplying='profile';try{
    assistantRegisterMacros();
    const defaults={...DEFAULT_SHORTCUTS};for(const c of RUGBY_COMMANDS)if(!(c.id in defaults))defaults[c.id]='';
    shortcutBindings=RugbyShortcuts.restore(defaults,v.shortcuts||((profile.knownKeys||[]).includes('shortcuts')?{}:shortcutBindings));localStorage.setItem(SHORTCUT_STORAGE,JSON.stringify(shortcutBindings));refreshShortcutLabels();
    if(v.consoleDock)assistantDock(v.consoleDock);
    if(v.theme&&THEMES[v.theme]){applyTheme(v.theme,{silent:true});localStorage.setItem('rugby.theme',v.theme);}
    if(typeof v.grid==='boolean'){setGridVisible(v.grid,{silent:true});localStorage.setItem('rugby.grid',v.grid?'1':'0');}
    if(Array.isArray(v.cutColumns)&&v.cutColumns.length===Object.keys(RugbyCutList.columns).length){cutOrder=[...v.cutColumns];localStorage.setItem('rugby.cut.columns',JSON.stringify(cutOrder));}
    if(Array.isArray(v.panelProperties)){panelPropertyOrder=[...v.panelProperties,...panelPropertyKeys.filter(k=>!v.panelProperties.includes(k))];panelArrangeProperties();localStorage.setItem('rugby.panel.properties',JSON.stringify(panelPropertyOrder));}
    assistantRenderLibrary();assistantRenderConflicts();
  }finally{assistantApplying=wasApplying;}
}
function assistantRegisterMacros(){
  for(let i=RUGBY_COMMANDS.length-1;i>=0;i--)if(RUGBY_COMMANDS[i].id.startsWith('macro.'))RUGBY_COMMANDS.splice(i,1);
  for(const [id,m]of Object.entries(assistantProfile.values).filter(([k])=>k.startsWith('macro:'))){
    try{RugbyAssistantPlan.validate(m.plan);RUGBY_COMMANDS.push({id:'macro.'+id.slice(6),label:'Makros · '+m.name,key:'',inField:false,run:()=>assistantPreview(m.plan)});}catch(e){assistantStatus('Makros ochilmadi: '+e.message);}
  }
}
function assistantRenderLibrary(){
  const list=assistantElement('assistantLibrary');list.replaceChildren();
  for(const [key,v]of Object.entries(assistantProfile.values).filter(([k])=>/^(macro|template):/.test(k))){
    const row=document.createElement('div'),b=document.createElement('button'),del=document.createElement('button');row.className='assistantLibraryRow';b.textContent=(key.startsWith('macro:')?'ƒ ':'▦ ')+v.name;b.onclick=()=>{try{assistantPreview(key.startsWith('macro:')?v.plan:{version:1,summary:v.name+' shablonini kiritish',questions:[],actions:[{type:'template',id:key,position:[0,0,0]}]});}catch(e){assistantStatus(e.message);}};
    del.textContent='O‘chirish';del.onclick=async()=>{if(await askText('O‘chirish uchun HA yozing: '+v.name,'')!=='HA')return;assistantRememberQuiet({[key]:null});};row.append(b,del);list.appendChild(row);
  }
  if(!list.children.length)list.textContent='Saqlangan makros va shablonlar shu yerda ko‘rinadi.';
}
function assistantRenderConflicts(){const list=assistantElement('assistantConflicts');list.replaceChildren();for(const c of assistantProfile.conflicts||[]){const box=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Ikki xil o‘zgarish: '+c.key;box.appendChild(summary);for(const v of c.variants){const text=document.createElement('pre');text.textContent=JSON.stringify(v.value,null,2);const b=document.createElement('button');b.textContent='Shu variantni tanlash · '+v.device.slice(0,8);b.onclick=()=>assistantRememberQuiet({[c.key]:v.value});box.append(text,b);}list.appendChild(box);}}
function assistantConfiguration(config){assistantConfig=config;assistantElement('assistantProvider').value=config.provider||'off';assistantElement('assistantModel').value=config.model||'gpt-4.1';assistantElement('assistantRepo').value=config.repo||'';assistantElement('assistantBranch').value=config.branch||'main';assistantElement('assistantFolder').textContent=config.folder||'Papka tanlanmagan';assistantElement('assistantKeyState').textContent=(config.hasAIKey?'AI kaliti mavjud. ':'AI kaliti kiritilmagan. ')+(config.encrypted?'Kalit ushbu kompyuterda shifrlanadi.':'Kalit faqat joriy seansda turadi.')+(config.credentialError||'');assistantProviderFields();}
function assistantProviderFields(){const p=assistantElement('assistantProvider').value;assistantElement('assistantFolderOptions').hidden=p!=='folder';assistantElement('assistantGithubOptions').hidden=p!=='github';}
async function assistantSaveConnection(chooseFolder=false){
  if(!window.desktop?.assistant){assistantStatus('AI va internet sinxronlash Desktop versiyada ishlaydi.');return;}
  const btn=assistantElement('assistantSaveConnection');btn.disabled=true;
  try{const result=await window.desktop.assistant.configure({provider:assistantElement('assistantProvider').value,chooseFolder,repo:assistantElement('assistantRepo').value.trim(),branch:assistantElement('assistantBranch').value.trim(),model:assistantElement('assistantModel').value.trim(),aiKey:assistantElement('assistantKey').value.trim(),githubKey:assistantElement('assistantGithubKey').value.trim(),clearAIKey:assistantElement('assistantForgetKey').checked,clearGithubKey:assistantElement('assistantForgetGithub').checked});if(result.canceled)return;assistantConfiguration(result.config);assistantElement('assistantKey').value='';assistantElement('assistantGithubKey').value='';assistantElement('assistantForgetKey').checked=false;assistantElement('assistantForgetGithub').checked=false;assistantAcceptProfile(result.profile);assistantStatus('Ulanish saqlandi.');}catch(e){assistantStatus(e.message);}finally{btn.disabled=false;}
}
async function assistantAsk(){
  if(!window.desktop?.assistant){assistantStatus('Online AI uchun Rugby Desktop oching.');return;}
  const prompt=assistantElement('assistantPrompt').value.trim();if(!prompt){assistantStatus('Topshiriq yozing.');return;}
  const btn=assistantElement('assistantAsk');btn.disabled=true;assistantStatus('AI tahlil qilmoqda…');
  const stamp=assistantStamp();
  try{const selected=panelScene.panels.filter(p=>panelSelectionIds().includes(p.id));const context={selected:selected.map(p=>({name:p.name,width:p.width,height:p.height,thickness:p.thickness,position:p.position,rotation:p.rotation})),commands:RUGBY_COMMANDS.map(c=>({id:c.id,label:c.label,key:shortcutBindings[c.id]})),templates:Object.entries(assistantProfile.values).filter(([k])=>k.startsWith('template:')).map(([id,v])=>({id,name:v.name})),units:'mm'};
    const r=await window.desktop.assistant.plan({prompt,web:assistantElement('assistantWeb').checked,image:assistantImage,context});assistantPreview(r.plan,r.sources,r.evidence);if(stamp!==assistantStamp()){assistantPending.stamp=stamp;assistantStatus('Tahlil davomida chizma o‘zgardi. “Qayta hisoblash”ni bosing.');}
  }catch(e){assistantStatus(e.message);}finally{btn.disabled=false;}
}
async function assistantSaveMacro(){const plan=assistantPending?.plan;if(!plan?.actions.length)return;const name=await askText('Yangi funksiya / makros nomi','Mening funksiyam');if(!name?.trim())return;await assistantRemember({['macro:'+RugbyPanels.id()]:{name:name.trim().slice(0,80),plan:RugbyAssistantPlan.validate(plan)}});assistantStatus('Funksiya saqlandi. F10 orqali hotkey belgilang.');}
async function assistantSaveBlock(){const selected=panelScene.panels.filter(p=>panelSelectionIds().includes(p.id));if(!selected.length||selected.length>200){assistantStatus('Shablon uchun 1–200 ta 3D panel tanlang.');return;}const name=await askText('Shablon blok nomi','Mening blokim');if(!name?.trim())return;const origin=selected[0].position;const panels=selected.map(p=>{const c=RugbyPanels.copy(p);delete c.sourceDrawingId;c.position=c.position.map((v,i)=>v-origin[i]);return c;});await assistantRemember({['template:'+RugbyPanels.id()]:{name:name.trim().slice(0,80),panels}});assistantStatus('Blok profilga saqlandi. Kiritishda birinchi panel markazi [0,0,0] bo‘ladi.');}
async function initAssistant(){
  if(assistantBooted)return;assistantBooted=true;
  const bind=(id,fn)=>assistantElement(id).addEventListener('click',()=>{try{const r=fn();r?.catch?.(e=>assistantStatus(e.message));}catch(e){assistantStatus(e.message);}});
  bind('assistantToggle',assistantOpen);bind('assistantClose',assistantClose);bind('assistantAsk',assistantAsk);bind('assistantApply',assistantApplyPlan);bind('assistantRecalculate',()=>{if(assistantPending)assistantPreview(assistantPending.plan);});bind('assistantSaveMacro',assistantSaveMacro);bind('assistantSaveBlock',assistantSaveBlock);
  bind('assistantSaveConnection',()=>assistantSaveConnection());bind('assistantChooseFolder',()=>assistantSaveConnection(true));
  bind('assistantSyncNow',async()=>{if(window.desktop?.assistant)assistantAcceptProfile(await window.desktop.assistant.sync());else assistantStatus('Sinxronlash uchun Desktop versiya kerak.');});
  bind('assistantBackup',async()=>{const name=await window.desktop?.assistant?.export();if(name)assistantStatus('Zaxira nusxasi saqlandi: '+name);});
  bind('assistantRestore',async()=>{const result=await window.desktop?.assistant?.import();if(result)assistantAcceptProfile(result);});
  bind('assistantClearImage',()=>{assistantImage=null;assistantElement('assistantImageName').textContent='Rasm tanlanmagan';assistantElement('assistantImage').value='';});
  bind('assistantLocalCabinet',()=>assistantPreview({version:1,summary:'900 × 600 × 2000 mm korpus, 16 mm panel, 4 polka. O‘lchamlarni quyidagi reja orqali ko‘rishingiz mumkin.',questions:[],actions:[{type:'cabinet',name:'Korpus A',width:900,depth:600,height:2000,thickness:16,shelves:4,position:[0,0,0]}]}));
  bind('assistantLocalCalc',()=>{const expression=assistantElement('assistantExpression').value;assistantPreview({version:1,summary:'Aniq arifmetik hisob',questions:[],actions:[{type:'calculate',expression}]});});
  assistantElement('assistantProvider').addEventListener('change',assistantProviderFields);
  assistantElement('assistantDockSelect').addEventListener('change',e=>assistantRememberQuiet({consoleDock:e.target.value}));
  assistantElement('assistantImage').addEventListener('change',async e=>{const f=e.target.files?.[0];assistantImage=null;if(!f)return;if(!['image/png','image/jpeg'].includes(f.type)||f.size>8*1024*1024){assistantStatus('8 MB gacha PNG yoki JPG tanlang.');e.target.value='';return;}try{assistantImage=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Rasm ochilmadi.'));reader.readAsDataURL(f);});assistantElement('assistantImageName').textContent=f.name;}catch(err){assistantStatus(err.message);}});
  assistantElement('shortcutDialog').addEventListener('close',()=>{if(assistantProfileDraft){const v=assistantProfileDraft;assistantProfileDraft=null;assistantAcceptProfile(v);}});
  try{if(window.desktop?.assistant){const r=await window.desktop.assistant.load();assistantConfiguration(r.config);const migration={};if(!(r.profile.knownKeys||[]).length){for(const [key,storage]of [['shortcuts',SHORTCUT_STORAGE],['theme','rugby.theme'],['grid','rugby.grid'],['cutColumns','rugby.cut.columns'],['panelProperties','rugby.panel.properties']]){const raw=localStorage.getItem(storage);if(raw!==null)try{migration[key]=key==='theme'?raw:key==='grid'?raw==='1':JSON.parse(raw);}catch{}}}assistantAcceptProfile(r.profile);window.desktop.assistant.onProfile(assistantAcceptProfile);if(Object.keys(migration).length)await assistantRemember(migration);}else{let values={};try{values=JSON.parse(localStorage.getItem('rugby.assistant.local.v1'))||{};}catch{}assistantAcceptProfile({...assistantProfile,values});assistantStatus('Brauzer namoyishi: online AI va sinxronlash Desktop’da ishlaydi.');}}
  catch(e){assistantStatus('Profil ochilmadi: '+e.message);}
}
