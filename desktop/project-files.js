'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const codec=require('../app/js/core/document-codec');
function validateContent(content){
  if(typeof content!=='string')throw new Error('Loyiha matni noto‘g‘ri.');
  codec.decode(content);
}
function writeProjectAtomic(filePath,content){
  validateContent(content);
  const temp=path.join(path.dirname(filePath),'.rugby-'+crypto.randomBytes(8).toString('hex')+'.tmp');
  let fd;
  try{
    fd=fs.openSync(temp,'wx');fs.writeFileSync(fd,content,'utf8');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
    fs.renameSync(temp,filePath);
  }finally{
    if(fd!==undefined)fs.closeSync(fd);
    if(fs.existsSync(temp))fs.unlinkSync(temp);
  }
  return {path:filePath,name:path.basename(filePath)};
}
module.exports={writeProjectAtomic,validateContent};
