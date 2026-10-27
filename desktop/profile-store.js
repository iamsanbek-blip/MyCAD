'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Plans=require('../app/js/core/assistant-plan'),Panels=require('../app/js/core/panel-model'),Shortcuts=require('../app/js/core/shortcut-map');
const MAX_BYTES=8*1024*1024,MAX_OPS=12000;
function atomic(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.'+crypto.randomUUID()+'.tmp';let fd;try{fd=fs.openSync(temp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);fs.closeSync(fd);fd=null;fs.renameSync(temp,file);}finally{if(fd!==undefined&&fd!==null)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}}
function checkedValue(key,value){
  if(value===null)return null;
  if(key==='shortcuts'){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>500)throw Error('Hotkey profili noto‘g‘ri.');
    for(const [id,key]of Object.entries(value)){if(!/^[a-zA-Z][a-zA-Z0-9._-]{0,119}$/.test(id)||typeof key!=='string')throw Error('Hotkey noto‘g‘ri.');const err=Shortcuts.validate(key,id,value);if(err)throw Error('Hotkey: '+err);}
  }else if(key==='consoleDock'){if(!['left','right','bottom'].includes(value))throw Error('Konsol joyi noto‘g‘ri.');}
  else if(key==='theme'){if(!['dark','black','grey','light','blueprint'].includes(value))throw Error('Rang mavzusi noto‘g‘ri.');}
  else if(key==='grid'){if(typeof value!=='boolean')throw Error('Katak sozlamasi noto‘g‘ri.');}
  else if(key==='cutColumns'||key==='panelProperties'){
    const allowed=key==='cutColumns'?['page','name','width','height','thickness','quantity']:['Name','Type','Width','Height','Thickness','Quantity','X','Y','Z','RX','RY','RZ','Extrude'];
    if(!Array.isArray(value)||value.length>30||new Set(value).size!==value.length||value.some(v=>!allowed.includes(v)))throw Error('Ustunlar ro‘yxati noto‘g‘ri.');
  }else if(key.startsWith('macro:')){
    if(!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>80)throw Error('Makros nomi noto‘g‘ri.');
    Plans.validate(value.plan);if(value.plan.questions.length||!value.plan.actions.length)throw Error('Makrosda bajariladigan reja bo‘lsin.');
    if(Object.keys(value).some(k=>!['name','plan'].includes(k)))throw Error('Makros maydoni noto‘g‘ri.');
  }else if(key.startsWith('template:')){
    if(!value||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||Object.keys(value).some(k=>!['name','panels'].includes(k)))throw Error('Blok nomi noto‘g‘ri.');
    const s=Panels.empty();s.panels=value.panels;Panels.normalize(s);if(!s.panels.length||s.panels.length>200)throw Error('Shablonda 1–200 panel bo‘lsin.');
  }else throw Error('Sinxronlash maydoni qo‘llanmaydi: '+key);
  return Plans.clone(value);
}
const validKey=k=>typeof k==='string'&&(/^(shortcuts|consoleDock|theme|grid|cutColumns|panelProperties)$/.test(k)||/^(macro|template):[a-zA-Z0-9_-]{1,100}$/.test(k));
function validate(doc){
  if(!doc||doc.format!=='rugby-profile'||doc.version!==1||!Array.isArray(doc.ops)||doc.ops.length>MAX_OPS||Buffer.byteLength(JSON.stringify(doc))>MAX_BYTES)throw Error('Profil fayli buzilgan yoki qo‘llanmaydigan versiya.');
  const seen=new Set();for(const o of doc.ops){
    if(!o||typeof o.device!=='string'||!/^[a-f0-9-]{36}$/.test(o.device)||!Number.isSafeInteger(o.seq)||o.seq<1||o.id!==o.device+':'+o.seq||seen.has(o.id)||!validKey(o.key)||!Array.isArray(o.parents)||o.parents.length>100||o.parents.some(p=>typeof p!=='string'||!/^[-a-f0-9]{36}:\d+$/.test(p)||p===o.id))throw Error('Profil yozuvi noto‘g‘ri.');
    if(Object.keys(o).some(k=>!['id','device','seq','key','value','parents'].includes(k)))throw Error('Profil yozuvida ortiqcha maydon.');
    checkedValue(o.key,o.value);seen.add(o.id);
  }
  return Plans.clone(doc);
}
function merge(...docs){
  const map=new Map();for(const d of docs)for(const o of validate(d).ops){const prev=map.get(o.id);if(prev&&JSON.stringify(prev)!==JSON.stringify(o))throw Error('Bir ID uchun qarama-qarshi profil yozuvi.');map.set(o.id,o);}
  // Parent edges must belong to the same setting; reject cycles before use.
  const visited=new Set(),visiting=new Set();
  function visit(o,depth=0){if(depth>MAX_OPS)throw Error('Profil tarixi juda uzun.');if(visiting.has(o.id))throw Error('Profil tarixida aylana.');if(visited.has(o.id))return;visiting.add(o.id);for(const id of o.parents){const p=map.get(id);if(p){if(p.key!==o.key)throw Error('Profil tarixi maydoni noto‘g‘ri.');visit(p,depth+1);}}visiting.delete(o.id);visited.add(o.id);}
  for(const o of map.values())visit(o);
  return validate({format:'rugby-profile',version:1,ops:[...map.values()].sort((a,b)=>a.device.localeCompare(b.device)||a.seq-b.seq)});
}
function materialize(doc){
  const superseded=new Set(doc.ops.flatMap(o=>o.parents)),heads={};for(const o of doc.ops)if(!superseded.has(o.id))(heads[o.key]??=[]).push(o);
  const values={},conflicts=[];for(const [key,ops]of Object.entries(heads)){
    ops.sort((a,b)=>a.seq-b.seq||a.device.localeCompare(b.device));const active=ops.at(-1);if(active.value!==null)values[key]=Plans.clone(active.value);
    if(ops.length>1&&ops.some(o=>JSON.stringify(o.value)!==JSON.stringify(active.value)))conflicts.push({key,variants:Plans.clone(ops)});
  }
  return{values,conflicts,heads};
}
function readJson(file){const stat=fs.statSync(file);if(stat.size>MAX_BYTES)throw Error('Profil fayli juda katta.');return JSON.parse(fs.readFileSync(file,'utf8'));}
class ProfileStore{
  constructor(dir){this.dir=dir;fs.mkdirSync(dir,{recursive:true});const identity=path.join(dir,'device.json');this.device=fs.existsSync(identity)?readJson(identity).device:crypto.randomUUID();if(!/^[a-f0-9-]{36}$/.test(this.device))throw Error('Qurilma profili buzilgan.');if(!fs.existsSync(identity))atomic(identity,{device:this.device});this.file=path.join(dir,'profile.json');this.doc=fs.existsSync(this.file)?merge(readJson(this.file)):{format:'rugby-profile',version:1,ops:[]};}
  view(){const {values,conflicts,heads}=materialize(this.doc);return{values,conflicts,knownKeys:Object.keys(heads),versions:Object.fromEntries(Object.entries(heads).map(([k,v])=>[k,v.map(o=>o.id)])),device:this.device};}
  save(next){next=merge(next);if(JSON.stringify(next)===JSON.stringify(this.doc))return false;if(fs.existsSync(this.file))atomic(this.file+'.backup',this.doc);atomic(this.file,next);this.doc=next;return true;}
  set(key,value){return this.setMany({[key]:value});}
  setMany(changes,bases){
    if(!changes||typeof changes!=='object'||Array.isArray(changes)||Object.keys(changes).length>500)throw Error('Profil o‘zgarishi noto‘g‘ri.');
    if(bases!==undefined&&(!bases||typeof bases!=='object'||Array.isArray(bases)))throw Error('Profil versiyasi noto‘g‘ri.');
    const next=Plans.clone(this.doc),state=materialize(next);let seq=Math.max(0,...next.ops.filter(o=>o.device===this.device).map(o=>o.seq));
    for(const [key,value]of Object.entries(changes)){if(!validKey(key))throw Error('Profil maydoni noto‘g‘ri.');checkedValue(key,value);const heads=state.heads[key]||[];let parents=bases?(Object.hasOwn(bases,key)?bases[key]:[]):heads.map(o=>o.id);if(!Array.isArray(parents)||parents.length>100||parents.some(id=>!next.ops.some(o=>o.id===id&&o.key===key)))throw Error('Profil tahriri eskirgan; qayta oching.');if(heads.length===1&&JSON.stringify(heads[0].value)===JSON.stringify(value))continue;next.ops.push({id:this.device+':'+(++seq),device:this.device,seq,key,value:Plans.clone(value),parents:[...new Set([...parents,...heads.filter(o=>o.device===this.device).map(o=>o.id)])]});}
    this.save(next);return this.view();
  }
  import(doc){this.save(merge(this.doc,doc));return this.view();}
}
module.exports={ProfileStore,atomic,validate,merge,materialize,readJson,MAX_BYTES,checkedValue};
