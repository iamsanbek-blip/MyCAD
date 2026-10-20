const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});fs.cpSync(path.join(root,'app'),dist,{recursive:true});
fs.mkdirSync(path.join(dist,'samples'),{recursive:true});fs.copyFileSync(path.join(root,'namunalar/korpus-3d.dbe'),path.join(dist,'samples/korpus-3d.dbe'));
console.log('Browser app packaged from shared app/ source.');
