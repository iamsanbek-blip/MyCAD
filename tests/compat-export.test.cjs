'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const P=require('../app/js/core/panel-model.js'),D=require('../app/js/core/document-codec.js'),E=require('../desktop/export-files.js'),{createHarness}=require('./browser-harness.cjs');
const legacy=()=>({v:1,T:18,panels:[{id:1,n:'Old panel',o:'front',w:600,h:400,t:16,q:3,x:100,y:200,z:300,ry:0}],lines:[{c:true,p:[[0,0],[100,0],[100,100]]}],guides:[{p:[0,0,0],a:0}],pl:'front'});
const project=raw=>({format:D.FORMAT,version:2,pages:[{...D.emptyPage(),scene3d:undefined,panel3d:raw}]});
function rotate(v,e){const [a,b,c]=e.map(n=>n*Math.PI/180);let[x,y,z]=v;[x,y]=[x*Math.cos(c)-y*Math.sin(c),x*Math.sin(c)+y*Math.cos(c)];[x,z]=[x*Math.cos(b)+z*Math.sin(b),-x*Math.sin(b)+z*Math.cos(b)];[y,z]=[y*Math.cos(a)-z*Math.sin(a),y*Math.sin(a)+z*Math.cos(a)];return[x,y,z];}
test('1.1.2 orientations keep world geometry after Y-up to Z-up conversion',()=>{
 for(const o of ['front','side','flat'])for(let ry=0;ry<4;ry++){
  const raw=legacy();Object.assign(raw.panels[0],{o,ry});const p=P.fromLegacy(raw).panels[0];
  assert.deepEqual(p.position,[100,-300,200]);assert.equal(p.thickness,16);
  for(const v of [[1,0,0],[0,1,0],[0,0,1]]){
   let q=rotate(v,[o==='flat'?-90:0,0,0]);q=rotate(q,[0,(o==='side'?90:0)+ry*90,0]);const expected=[q[0],-q[2],q[1]],got=rotate(v,p.rotation);
   got.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-8,o+' turn '+ry));
  }
 }
});
test('legacy custom matrix, contour, hidden flag, quantity and reference lines survive v3 disk format',()=>{
 const raw=legacy();Object.assign(raw.panels[0],{m:[0,-1,0,1,0,0,0,0,1],pts:[[0,0],[100,0],[0,100]],bw:100,bh:100,hid:true});raw.pl='plan';
 const d=D.decode(project(raw)),s=d.pages[0].scene3d,p=s.panels[0];
 assert.deepEqual(p.outline,[{x:0,y:0},{x:600,y:0},{x:0,y:400}]);assert.equal(p.hidden,true);assert.equal(p.quantity,3);assert.equal(s.defaultThickness,18);assert.deepEqual(s.referenceLines[0].points[2],[100,100,0]);
 const output=D.decode(JSON.stringify(D.encode(d.pages,d.activePageId)));assert.deepEqual(output.pages[0].scene3d,s);
});
test('invalid legacy import does not replace current drawings or panels',()=>{const h=createHarness();h.run("panelBasic('xy')");const before=h.run('JSON.stringify(capturePageData())'),raw=legacy();raw.panels[0].t=-16;h.sb.incoming=JSON.stringify(project(raw));assert.equal(h.run("loadProject(incoming,'broken.dbe')"),false);assert.equal(h.run('JSON.stringify(capturePageData())'),before);});
test('native export atomically replaces text/binary files and rejects unsupported data',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-export-'));try{
  const file=path.join(dir,'list.csv'),a=E.exportPayload('\ufeff"Nomi";"Eni"\r\n"Panel";"600"','list.csv');E.writeExportAtomic(file,a.data);assert.equal(fs.readFileSync(file,'utf8'),'\ufeff"Nomi";"Eni"\r\n"Panel";"600"');
  E.writeExportAtomic(file,E.exportPayload(new Uint8Array([80,75,3,4]),'list.xlsx').data);assert.deepEqual([...fs.readFileSync(file)],[80,75,3,4]);assert.deepEqual(fs.readdirSync(dir),['list.csv']);assert.throws(()=>E.exportPayload('x','bad.exe'));assert.throws(()=>E.exportPayload({},'bad.txt'));
  assert.throws(()=>E.writeExportAtomic(path.join(dir,'missing','list.csv'),a.data));assert.deepEqual(fs.readdirSync(dir),['list.csv']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
