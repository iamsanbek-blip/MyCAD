// Panel 3D: DXF parser va hujjat formati round-trip (Node, WebGL kerak emas)
const assert=require('node:assert'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Doc=require('../app/js/core/document-codec.js');
const src=fs.readFileSync(path.join(__dirname,'../app/js/tools/panel3d.js'),'utf8');
const sb={window:{},THREE:{Raycaster:function(){},Vector2:function(){}},document:{documentElement:{}},getComputedStyle:()=>({getPropertyValue:()=>''})};
sb.window=sb;vm.createContext(sb);vm.runInContext(src,sb);
const polys=sb.Panel3D._parseDXF('0\nSECTION\n2\nENTITIES\n0\nLWPOLYLINE\n70\n1\n10\n0\n20\n0\n10\n100\n20\n0\n10\n100\n20\n50\n10\n0\n20\n50\n0\nLINE\n10\n0\n20\n0\n11\n5\n21\n5\n0\nENDSEC\n');
assert.strictEqual(polys.length,2);assert.ok(polys[0].c&&polys[0].p.length===4);
const page=Doc.emptyPage?Doc.emptyPage('A'):null;
const model={v:1,T:16,uid:3,panels:[{id:1,n:'Yon',w:500,h:720,t:16,o:'side',x:0,y:360,z:0}],lines:[]};
const doc=Doc.decode?Doc.decode(JSON.stringify({format:'dogbone-editor-project',version:2,units:'mm',pages:[Object.assign(page||{},{panel3d:model})],activePageId:null})):null;
if(doc)assert.deepStrictEqual((doc.pages||doc.document.pages)[0].panel3d,model);
// Rugby R12 eksporti: POLYLINE + VERTEX + SEQEND (yopiq to'rtburchak 16x500)
const r12='0\nSECTION\n2\nENTITIES\n0\nPOLYLINE\n8\n0\n66\n1\n70\n1\n0\nVERTEX\n8\n0\n10\n0\n20\n0\n30\n0\n0\nVERTEX\n8\n0\n10\n16\n20\n0\n30\n0\n0\nVERTEX\n8\n0\n10\n16\n20\n500\n30\n0\n0\nVERTEX\n8\n0\n10\n0\n20\n500\n30\n0\n0\nSEQEND\n8\n0\n0\nENDSEC\n0\nEOF\n';
const rp=sb.Panel3D._parseDXF(r12);assert.strictEqual(rp.length,1);assert.ok(rp[0].c);assert.strictEqual(rp[0].p.length,4);assert.strictEqual(JSON.stringify(rp[0].p[2]),'[16,500]');
// Kontur -> panel: 16x500 kontur + 500 extrude = 500x500x16 (yon), 450x16 -> 450x500x16 (old)
{const K=src.slice(src.indexOf('function Mof(p){'),src.indexOf('function rotateSel')),C=src.slice(src.indexOf('function isRectPoly'),src.indexOf('/* ---------------- sichqoncha'));
 const THREE3=sb.THREE.Euler?sb.THREE:null;
 try{const T3=require('three/build/three.js'),out=[],s2={THREE:T3,Math,Set,JSON,Number,Array,Object,String,planeMode:'plan',lines:[],q:()=>({value:'500',textContent:'',hidden:false}),drawLines(){},num:v=>parseFloat(v),add:o=>{out.push(o);return{id:out.length}},select(){},frame(){},changed(){}};
  vm.createContext(s2);vm.runInContext(K+C,s2);
  s2.lines=[{p:[[0,0],[16,0],[16,500],[0,500]],c:true},{p:[[16,0],[466,0],[466,16],[16,16]],c:true}];vm.runInContext('dxfToPanels()',s2);
  assert.strictEqual(out.length,2);assert.strictEqual(out[0].t,16);assert.strictEqual(out[0].w,500);assert.strictEqual(out[1].o,'front');assert.strictEqual(out[1].w,450);
 }catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}}
console.log('panel3d: ok');
