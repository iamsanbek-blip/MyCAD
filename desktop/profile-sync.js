'use strict';
const fs=require('node:fs'),path=require('node:path');
const {atomic,validate,merge,readJson,MAX_BYTES}=require('./profile-store');
const {request}=require('./online-http');
class FolderProvider{
  constructor(folder){this.dir=path.join(folder,'RugbyProfile-v1');}
  async read(){
    if(!fs.existsSync(this.dir))return[];
    const names=fs.readdirSync(this.dir).filter(n=>n.endsWith('.json'));
    if(names.length>200)throw Error('Sinxronlash papkasida juda ko‘p fayl.');
    return names.map(n=>{const p=path.join(this.dir,n);if(fs.lstatSync(p).isSymbolicLink())throw Error('Profil fayli havola bo‘lishi mumkin emas.');return validate(readJson(p));});
  }
  async write(device,doc){fs.mkdirSync(this.dir,{recursive:true});atomic(path.join(this.dir,device+'.json'),doc);}
}
class GithubProvider{
  constructor(repo,branch,token,fetcher){if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)||!/^[A-Za-z0-9_./-]{1,150}$/.test(branch))throw Error('GitHub repo yoki branch noto‘g‘ri.');if(!token)throw Error('GitHub token kiriting.');this.repo=repo;this.branch=branch;this.token=token;this.fetcher=fetcher;this.shas=new Map();}
  api(route,init={}){return request('https://api.github.com/repos/'+this.repo+route,{...init,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+this.token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Rugby-Profile','Content-Type':'application/json',...init.headers}},this.fetcher);}
  async read(){
    const info=await this.api('');if(info.private!==true)throw Error('Shaxsiy profil uchun PRIVATE GitHub repository tanlang. MyCAD ochiq repozitori mos emas.');
    // Verify an existing branch before treating a missing profile directory as empty.
    await this.api('/branches/'+encodeURIComponent(this.branch));
    let list;try{list=await this.api('/contents/rugby-profile?ref='+encodeURIComponent(this.branch));}catch(e){if(e.status===404)return[];throw e;}
    if(!Array.isArray(list)||list.length>200)throw Error('Profil katalogi noto‘g‘ri.');const docs=[];
    for(const item of list){if(item.type!=='file'||!/^[-a-f0-9]{36}\.json$/.test(item.name))throw Error('Profil katalogida noma’lum fayl.');if(item.size>MAX_BYTES)throw Error('Profil fayli juda katta.');
      let f=await this.api('/contents/rugby-profile/'+item.name+'?ref='+encodeURIComponent(this.branch));
      if(f.encoding==='none'&&/^[a-f0-9]{40}$/.test(f.sha))f=await this.api('/git/blobs/'+f.sha);
      if(f.encoding!=='base64'||typeof f.content!=='string')throw Error('GitHub profil javobi noto‘g‘ri.');
      docs.push(validate(JSON.parse(Buffer.from(f.content,'base64').toString('utf8'))));this.shas.set(item.name,f.sha);
    }
    return docs;
  }
  async write(device,doc){const name=device+'.json',data=JSON.stringify(doc),sha=this.shas.get(name);
    const body={message:'Sync Rugby profile',branch:this.branch,content:Buffer.from(data).toString('base64')};if(sha)body.sha=sha;
    const r=await this.api('/contents/rugby-profile/'+name,{method:'PUT',body:JSON.stringify(body)});this.shas.set(name,r.content.sha);
  }
}
class SyncEngine{
  constructor(store,notify=()=>{}){this.store=store;this.notify=notify;this.provider=null;this.pending=null;this.status={state:'local',message:'Shu kompyuterda saqlanadi',lastSync:null};}
  configure(provider){if(this.pending)throw Error('Sinxronlash tugashini kuting.');this.provider=provider;this.status={...this.status,state:provider?'ready':'local',message:provider?'Sinxronlash tayyor':'Shu kompyuterda saqlanadi',lastSync:null};}
  async sync(){if(this.pending)return this.pending;if(!this.provider)return this.view();const provider=this.provider;
    this.pending=(async()=>{try{
      this.status.state='syncing';this.notify(this.view());
      const docs=await provider.read(); // Any corrupt/unreadable file aborts without uploading.
      this.store.import(merge(this.store.doc,...docs));
      // Publish a complete merged replica per device. Unique filenames avoid Drive races;
      // other devices retain history even if the original device is lost.
      const candidate=JSON.stringify(this.store.doc);
      if(!docs.some(d=>JSON.stringify(d)===candidate))await provider.write(this.store.device,this.store.doc);
      this.status={state:'synced',message:'Sinxronlandi',lastSync:new Date().toISOString()};
    }catch(e){this.status={...this.status,state:'error',message:e.message};}finally{this.pending=null;this.notify(this.view());}return this.view();})();return this.pending;
  }
  view(){return{...this.store.view(),sync:{...this.status}};}
}
module.exports={FolderProvider,GithubProvider,SyncEngine};
