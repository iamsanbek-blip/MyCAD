'use strict';
const fs=require('node:fs'),path=require('node:path');
exports.routeExports=async(app,dir)=>app.evaluate(({dialog},folder)=>{dialog.showSaveDialog=async(_window,options)=>({canceled:false,filePath:folder+'/'+options.defaultPath.replace(/^.*[\\/]/,'')});},dir);
exports.waitFile=async(dir,name)=>{const file=path.join(dir,name),end=Date.now()+15000;while(Date.now()<end){if(fs.existsSync(file)&&fs.statSync(file).size>0)return file;await new Promise(r=>setTimeout(r,50));}throw Error('Native export did not create '+name);};
