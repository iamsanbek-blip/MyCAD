'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const extensions=new Set(['txt','csv','xlsx','dxf','svg','png']);
function exportPayload(content,name){
  name=path.basename(String(name||''));
  const extension=path.extname(name).slice(1).toLowerCase();
  if(!extensions.has(extension))throw Error('Eksport formati qo‘llanmaydi.');
  const data=typeof content==='string'?Buffer.from(content,'utf8'):content instanceof Uint8Array?Buffer.from(content):null;
  if(!data||data.length>128*1024*1024)throw Error('Eksport ma’lumoti noto‘g‘ri yoki juda katta.');
  return {name,extension,data};
}
function writeExportAtomic(file,data){
  const temp=path.join(path.dirname(file),'.rugby-export-'+crypto.randomBytes(8).toString('hex')+'.tmp');
  let fd;
  try{fd=fs.openSync(temp,'wx');fs.writeFileSync(fd,data);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);}
  finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
  return {path:file,name:path.basename(file)};
}
module.exports={exportPayload,writeExportAtomic};
