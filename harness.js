// Geometry+model modullarini brauzersiz yuklaydigan umumiy muhit
const fs=require('fs'), path=require('path'), vm=require('vm');
const ROOT=require('path').join(__dirname, 'app', '');
function makeEnv(){
  const el=()=>({value:'',checked:true,style:{},classList:{add(){},remove(){},toggle(){}},
    addEventListener(){},appendChild(){},click(){},innerHTML:'',textContent:'',title:''});
  const sb={console,Math,JSON,Number,Array,Object,String,Set,Map,Date,isFinite,
    parseFloat,parseInt,alert(){},confirm:()=>true,setTimeout(){},
    document:{getElementById:el,addEventListener(){},createElement:()=>el(),
              querySelectorAll:()=>[],body:el(),readyState:'loading'},
    window:{addEventListener(){}}};
  sb.globalThis=sb; vm.createContext(sb);
  const load=m=>{ let s=fs.readFileSync(path.join(ROOT,m),'utf8');
    if(m.endsWith('arcfit.js')) s=s.split('function doTrimAt')[0];
    vm.runInContext(s,sb,{filename:m}); };
  load('js/geometry/core.js'); load('js/model/layers.js');
  load('js/geometry/segments.js'); load('js/geometry/arcfit.js'); load('js/geometry/offset.js');
  vm.runInContext(`
    function ensureUid(l){ if(!l.uid) l.uid='u'+(Math.random()*1e9|0); return l.uid; }
    function cornerKey(c){ return c.source+':'+(c.uid||c.pi)+':'+c.vi; }
    var dimensions=[], texts=[];
    function compactShape(l){ return JSON.parse(JSON.stringify(l)); }
    function rebuildShape(l){ return l; } function updateHistoryStats(){}
    function safeNum(id,fb){ return fb; }
  `,sb);
  load('js/model/state.js'); load('js/model/corners.js'); load('js/model/shapes.js');
  vm.runInContext('var view={scale:1,ox:0,oy:0}; function toWorld(x,y){return{x:x,y:-y};} function draw(){} function renderDrawnList(){} function renderList(){} function pushHistory(){} function sanitizeDrawnLines(){} function finishTransform(){}', sb);
  load('js/tools/fillet.js');
  return { sb, run:c=>vm.runInContext(c,sb), load };
}
module.exports={makeEnv, ROOT};
