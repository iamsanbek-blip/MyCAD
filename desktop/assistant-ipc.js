'use strict';
const fs=require('node:fs'),path=require('node:path');
const {ProfileStore,atomic,readJson}=require('./profile-store');
const {FolderProvider,GithubProvider,SyncEngine}=require('./profile-sync');
const AI=require('./ai-service');
function registerAssistant({app,ipcMain,dialog,safeStorage,assertRenderer,getWindow}){
 const dir=path.join(app.getPath('userData'),'assistant'),store=new ProfileStore(dir),configPath=path.join(dir,'connection.json'),secretPath=path.join(dir,'credentials.json');
 let config=fs.existsSync(configPath)?readJson(configPath):{provider:'off',model:'gpt-4.1'},secrets={},credentialError='';
 const encrypted=()=>safeStorage.isEncryptionAvailable()&&safeStorage.getSelectedStorageBackend?.()!=='basic_text';
 if(fs.existsSync(secretPath)){try{if(encrypted())for(const [k,v]of Object.entries(readJson(secretPath)))secrets[k]=safeStorage.decryptString(Buffer.from(v,'base64'));else credentialError='Kalitlarni qayta kiriting: tizim shifrlash xizmati mavjud emas.';}catch{credentialError='Bu kompyuterda kalitlar ochilmadi; qayta kiriting.';}}
 const notify=view=>{const win=getWindow();if(win&&!win.isDestroyed())win.webContents.send('assistant:profile',view);};
 const engine=new SyncEngine(store,notify);
 const configure=()=>engine.configure(config.provider==='folder'?new FolderProvider(config.folder):config.provider==='github'?new GithubProvider(config.repo,config.branch,secrets.github):null);
 try{configure();}catch(e){engine.status={state:'error',message:e.message,lastSync:null};}
 const publicConfig=()=>({provider:config.provider,folder:config.folder||'',repo:config.repo||'',branch:config.branch||'main',model:config.model||'gpt-4.1',hasAIKey:!!secrets.ai,hasGithubKey:!!secrets.github,encrypted:encrypted(),credentialError});
 const handle=(name,fn)=>ipcMain.handle('assistant:'+name,async(event,...args)=>{assertRenderer(event);return fn(...args);});
 let debounce,busyAI=false;
 const schedule=()=>{clearTimeout(debounce);debounce=setTimeout(()=>engine.sync(),1200);debounce.unref?.();};
 handle('load',()=>({profile:engine.view(),config:publicConfig()}));
 handle('set',(changes,bases)=>{store.setMany(changes,bases);engine.status={...engine.status,state:engine.provider?'pending':'local',message:engine.provider?'Kompyuterda saqlandi; sinxronlash kutilmoqda':'Shu kompyuterda saqlandi'};notify(engine.view());schedule();return engine.view();});
 handle('sync',()=>engine.sync());
 handle('configure',async input=>{
   if(engine.pending)throw Error('Sinxronlash tugashini kuting.');
   if(!input||!['off','folder','github'].includes(input.provider)||typeof input.model!=='string'||!/^[a-zA-Z0-9._:-]{1,100}$/.test(input.model))throw Error('Ulanish sozlamasi noto‘g‘ri.');
   const next={provider:input.provider,model:input.model};let folder=config.folder;
   if(input.provider==='folder'){if(input.chooseFolder||!folder){const r=await dialog.showOpenDialog(getWindow(),{title:'Google Drive ichidagi Rugby profil papkasini tanlang',properties:['openDirectory','createDirectory']});if(r.canceled)return{canceled:true};folder=r.filePaths[0];}next.folder=folder;}
   const nextSecrets={...secrets};for(const [from,to]of [['aiKey','ai'],['githubKey','github']])if(input[from]!==undefined){if(typeof input[from]!=='string'||input[from].length>1000)throw Error('Kalit noto‘g‘ri.');if(input[from])nextSecrets[to]=input[from];}if(input.clearAIKey)delete nextSecrets.ai;if(input.clearGithubKey)delete nextSecrets.github;
   if(input.provider==='github'){next.repo=input.repo;next.branch=input.branch;const p=new GithubProvider(next.repo,next.branch,nextSecrets.github);await p.read();}
   if(encrypted()){const enc={};for(const [k,v]of Object.entries(nextSecrets))enc[k]=safeStorage.encryptString(v).toString('base64');atomic(secretPath,enc);}else if(fs.existsSync(secretPath))fs.unlinkSync(secretPath);
   atomic(configPath,next);config=next;secrets=nextSecrets;credentialError='';configure();schedule();return{config:publicConfig(),profile:engine.view()};
 });
 handle('plan',async input=>{if(busyAI)throw Error('Oldingi AI so‘rovi tugashini kuting.');busyAI=true;try{return await AI.plan(input,{key:secrets.ai,model:config.model});}finally{busyAI=false;}});
 handle('export',async()=>{const r=await dialog.showSaveDialog(getWindow(),{title:'Profil zaxira nusxasi',defaultPath:'Rugby-profile.json',filters:[{name:'Rugby profil',extensions:['json']}]});if(r.canceled)return null;atomic(r.filePath,store.doc);return path.basename(r.filePath);});
 handle('import',async()=>{const r=await dialog.showOpenDialog(getWindow(),{title:'Profilni tiklash',filters:[{name:'Rugby profil',extensions:['json']}],properties:['openFile']});if(r.canceled)return null;store.import(readJson(r.filePaths[0]));notify(engine.view());schedule();return engine.view();});
 // Poll while running; changes are saved immediately even with no internet.
 const interval=setInterval(()=>engine.sync(),30000);interval.unref?.();schedule();
 app.once('before-quit',()=>{clearInterval(interval);clearTimeout(debounce);});
 return engine;
}
module.exports={registerAssistant};
