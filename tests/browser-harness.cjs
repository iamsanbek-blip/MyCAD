// Loads the real renderer scripts in their HTML order. DOM/canvas are test doubles;
// this is integration coverage, not a graphical browser or Electron smoke test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
function createHarness(storage=new Map()){
  let document; const all=[],errors=[],alerts=[];
  const ctx=new Proxy({measureText:t=>({width:String(t).length*7,actualBoundingBoxAscent:10,actualBoundingBoxDescent:2}),getImageData:()=>({data:new Uint8ClampedArray(4)}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
  function element(tag='div'){
    const e={tagName:tag.toUpperCase(),type:'',id:'',value:'',defaultValue:'',checked:false,defaultChecked:false,disabled:false,
      dataset:{},children:[],parentElement:null,style:{setProperty(k,v){this[k]=v;}},attributes:{},listeners:{},className:'',textContent:'',
      width:1200,height:800,clientWidth:1200,clientHeight:800,isContentEditable:false,selectionStart:0,selectionEnd:0,
      addEventListener(t,f){(this.listeners[t]||=[]).push(f);},removeEventListener(t,f){this.listeners[t]=(this.listeners[t]||[]).filter(x=>x!==f);},
      emit(t,event={}){const ev={target:this,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},stopImmediatePropagation(){},...event};for(const f of this.listeners[t]||[])f(ev);return ev;},
      setAttribute(k,v){this.attributes[k]=v;},getAttribute(k){return this.attributes[k]??null;},
      appendChild(child){child.parentElement=this;this.children.push(child);return child;},append(...children){children.forEach(c=>this.appendChild(c));},
      replaceChildren(...children){this.children=[];this.append(...children);},remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this);},
      focus(){document.activeElement=this;},blur(){document.activeElement=document.body;},select(){},setSelectionRange(){},scrollIntoView(){},
      getBoundingClientRect:()=>({left:0,top:0,width:1200,height:800}),getContext:()=>ctx,
      click(){this.emit('click');},showModal(){this.open=true;},close(v){this.open=false;this.returnValue=v;this.emit('close');},
      closest(sel){if(sel==='#shortcutDialog'){let n=this;while(n){if(n.id==='shortcutDialog')return n;n=n.parentElement;}}return null;},
      querySelector(sel){
        if(sel.includes('aria-selected'))return this.children.find(c=>c.attributes['aria-selected']==='true')||null;
        if(sel==='.kb')return null;
        if(!this._queries)this._queries={};return this._queries[sel]||=(element('input'));
      },querySelectorAll(){return [];}
    };
    e.classList={add(...v){e.className=[...new Set(e.className.split(' ').concat(v))].join(' ');},remove(...v){e.className=e.className.split(' ').filter(x=>!v.includes(x)).join(' ');},contains(v){return e.className.split(' ').includes(v);},toggle(v,on){const enabled=on===undefined?!this.contains(v):on;enabled?this.add(v):this.remove(v);return enabled;}};
    Object.defineProperty(e,'innerHTML',{get(){return this._html||'';},set(v){this._html=v;this.children=[];}});
    Object.defineProperty(e,'options',{get(){return this.children;}});
    all.push(e);return e;
  }
  document=element('document');document.body=element('body');document.documentElement=element('html');document.readyState='loading';document.activeElement=document.body;
  document.getElementById=id=>all.find(e=>e.id===id)||null;
  document.createElement=element;
  document.querySelector=sel=>sel==='dialog[open]'?all.find(e=>e.tagName==='DIALOG'&&e.open)||null:sel==='.pageTab.active'?all.find(e=>e.classList.contains('pageTab')&&e.classList.contains('active'))||null:null;
  const html=fs.readFileSync(path.join(ROOT,'app/index.html'),'utf8');
  for(const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*\bid="[^"]+"[^>]*)>/gi)){
    const e=element(m[1]);for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))e.setAttribute(a[1],a[2]);
    e.id=e.getAttribute('id');e.type=e.getAttribute('type')||'';e.value=e.defaultValue=e.getAttribute('value')||'';
    e.checked=e.defaultChecked=/\bchecked\b/.test(m[2]);e.className=e.getAttribute('class')||'';
    for(const rule of (e.getAttribute('style')||'').split(';')){const [k,v]=rule.split(':');if(k&&v)e.style[k.trim()]=v.trim();}
  }
  for(const m of html.matchAll(/<select\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)){
    const e=document.getElementById(m[1]),options=[...m[2].matchAll(/<option\b[^>]*value="([^"]*)"[^>]*>/g)];
    e.value=e.defaultValue=(options.find(o=>o[0].includes('selected'))||options[0])?.[1]||'';
  }
  const win=element('window');
  const sb={console:{log(){},warn(){},error(...v){errors.push(v);}},document,Math,Date,JSON,Number,Array,Object,String,Set,Map,RegExp,Error,Promise,
    URL,Blob,Uint8Array,Uint8ClampedArray,isFinite,parseFloat,parseInt,devicePixelRatio:1,navigator:{language:'uz'},
    alert:m=>alerts.push(m),confirm:()=>true,performance:{now:()=>0},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    Image:class{constructor(){this.width=100;this.height=100;}},FileReader:class{},
    addEventListener:win.addEventListener.bind(win),removeEventListener:win.removeEventListener.bind(win)};
  sb.window=sb;sb.globalThis=sb;vm.createContext(sb);
  const run=code=>vm.runInContext(code,sb);
  const scripts=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]);
  for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(ROOT,'app',file),'utf8'),sb,{filename:file});
  run('initApp()');
  return {run,sb,document,window:win,alerts,errors,storage,scripts,element};
}
module.exports={createHarness};
if(require.main===module){const h=createHarness();console.log('Renderer initialized:',h.scripts.length,'scripts. Pages:',h.run('documentPages.length'));}
