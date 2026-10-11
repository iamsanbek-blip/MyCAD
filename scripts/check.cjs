const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const js=[...walk(path.join(root,'app/js')),...walk(path.join(root,'desktop')),path.join(root,'main.js'),path.join(root,'preload.js'),path.join(root,'preload-splash.js')];
let fails=0;for(const f of js){const p=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(p.status){console.error(p.stderr);fails++;}}
const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
for(const [,rel]of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g))if(!fs.existsSync(path.join(root,'app',rel))){console.error('Missing asset',rel);fails++;}
console.log(`Syntax/assets: ${js.length} JavaScript files, ${fails} errors.`);process.exitCode=fails?1:0;
