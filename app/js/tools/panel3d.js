/* ==========================================================================
   js/tools/panel3d.js  —  Rugby 1.1.2: "Panel 3D" rejimi
   CNC / raspil korpus mebel uchun 3D panel muharriri.
   - 3 xil panel: gorizontal, vertikal, frontal (standart qalinlik 16 mm)
   - shakl: to'rtburchak, uchburchak, beshburchak, L, U yoki panelga 2 marta
     bosib o'zingiz chizish
   - butun korpusni ko'chirish / aylantirish / cho'zish (qalinlik o'zgarmaydi)
   - Old/Yon/Yuqori — ortografik (2D reja kabi), Izometrik — perspektiva
   - 2D chizma (buildDXF) yoki DXF fayl 3D da chiziq bo'lib ko'rinadi, yopiq
     konturlarni panelga aylantirish mumkin
   - Raspil ro'yxati (CSV)
   Model loyiha faylida sahifa bilan birga saqlanadi (page.panel3d).
   Bu fayl three.min.js (js/vendor) dan keyin yuklanadi.
   ========================================================================== */
(function(){
'use strict';
const TPL=[{n:'Panel',w:568,h:480}];   // bitta universal panel; yo'nalishi joriy ko'rinishdan olinadi
const SHP={rect:"To'rtburchak",tri:'Uchburchak',pent:'Beshburchak',L:'L-simon',U:'U-simon'};
const ORI={front:'Old (XY)',side:'Yon (ZY)',flat:'Gorizontal (XZ)'};
let ruler=null,guides=[],Gg=null,rulerMat=null,vsel=new Set(),vH=null;
let pm=null,vname='iso',mag=true,snapMark=null,thick2d=true;
let msel=[],tool='select',gz=null,gzR=null,gzS=null,planeMode='plan';
let panels=[],uid=1,sel=null,T=16,lines=[],ortho=false,wire=false,grp=false,dr=null,act=null;
let wrap=null,inited=false,isOpen=false,failed=false,dirtyR=true,asp=1,mode='model',clSel=new Set(),clSkip=false;
let renderer,cv,scene,pcam,ocam,cam,P,grid,Dg,fillMat,selMat,lineMat,selLine,dxfMat,ebMat,eHov=null;
let az=.7,el=.5,R=2200;let tg=null;
const q=s=>wrap.querySelector(s);
const qa=s=>wrap.querySelectorAll(s);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return Number.isFinite(n)?n:0};
const cssv=n=>getComputedStyle(wrap||document.documentElement).getPropertyValue(n).trim()||'';
function markDirty(){try{if(typeof markProjectDirty==='function'&&!(typeof pagesHydrating!=='undefined'&&pagesHydrating))markProjectDirty();}catch(e){}}

/* ---------------- panel geometriyasi ---------------- */
function Mof(p){   // panel yo'nalishi: 3x3 butun matritsa (satr = dunyo o'qi, ustun = panel o'qi: w,h,t)
  if(p.m)return p.m;
  const E=new THREE.Euler(p.o==='flat'?-Math.PI/2:0,(p.o==='side'?Math.PI/2:0)+(p.ry||0)*Math.PI/2,0,'YXZ'),M=new THREE.Matrix4().makeRotationFromEuler(E).elements,m=[];
  for(let a=0;a<3;a++)for(let l=0;l<3;l++)m.push(Math.round(M[l*4+a]));return m}
function KEY(p){const m=Mof(p),k=['w','h','t'],o=[];for(let a=0;a<3;a++)for(let l=0;l<3;l++)if(Math.abs(m[a*3+l])===1)o[a]=k[l];return o}
const oriOf=p=>['side','flat','front'][KEY(p).indexOf('t')];
function rot90(axis,dir){let R=axis===0?[1,0,0,0,0,-1,0,1,0]:axis===1?[0,0,1,0,1,0,-1,0,0]:[0,-1,0,1,0,0,0,0,1];if(dir<0)R=[R[0],R[3],R[6],R[1],R[4],R[7],R[2],R[5],R[8]];return R}
function rotateSel(ps,axis,dir){
  if(!ps.length)return;const[mn,mx]=bboxOf(ps),c=[0,1,2].map(a=>(mn[a]+mx[a])/2),R=rot90(axis,dir);
  for(const p of ps){const v=[p.x-c[0],p.y-c[1],p.z-c[2]],n=[0,1,2].map(a=>R[a*3]*v[0]+R[a*3+1]*v[1]+R[a*3+2]*v[2]);
    p.x=c[0]+n[0];p.y=c[1]+n[1];p.z=c[2]+n[2];const m=Mof(p),o=[];
    for(let a=0;a<3;a++)for(let l=0;l<3;l++)o.push(Math.round(R[a*3]*m[l]+R[a*3+1]*m[3+l]+R[a*3+2]*m[6+l]));
    p.m=o;place(p)}
  props();changed()}
const ext=p=>KEY(p).map(k=>p[k]);
function prof(p){
  if(p.pts)return p.pts.map(a=>[a[0]*p.w/p.bw,a[1]*p.h/p.bh]);
  const s=p.shape||(p.c?'L':'rect'),w=p.w,h=p.h,c=Math.min(p.c||100,w/2-.5,h-1);
  if(s==='tri')return[[0,0],[w,0],[w/2,h]];
  if(s==='pent')return[[0,0],[w,0],[w,h*.6],[w/2,h],[0,h*.6]];
  if(s==='L')return[[0,0],[w,0],[w,c],[c,c],[c,h],[0,h]];
  if(s==='U')return[[0,0],[w,0],[w,h],[w-c,h],[w-c,c],[c,c],[c,h],[0,h]];
  return[[0,0],[w,0],[w,h],[0,h]];
}
const shapeOf=p=>p.pts?'poly':p.shape||(p.c?'L':'rect');
const hasC=p=>!p.pts&&(p.shape==='L'||p.shape==='U'||(!p.shape&&p.c));
const flatV=()=>!!cam&&cam===ocam&&!thick2d;   // 2D ko'rinishlarda qalinlik yashirin
function extS(p){const e=ext(p);if(flatV())e[KEY(p).indexOf('t')]=0;return e}
function applyFlat(){for(const p of panels)if(p.g)place(p);dirtyR=true}
function place(p){if(!p.g)return;const g=p.g;g.scale.set(1,1,flatV()?.001:1);g.position.set(p.x,p.y,p.z);const m=Mof(p);g.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(m[0],m[1],m[2],0,m[3],m[4],m[5],0,m[6],m[7],m[8],0,0,0,0,1));dirtyR=true}
function build(p){
  if(!inited)return;
  if(p.g){P.remove(p.g);p.g.traverse(o=>o.geometry&&o.geometry.dispose())}
  const sh=new THREE.Shape(prof(p).map(a=>new THREE.Vector2(a[0]-p.w/2,a[1]-p.h/2)));
  const geo=new THREE.ExtrudeGeometry(sh,{depth:p.t,bevelEnabled:false});geo.translate(0,0,-p.t/2);
  const m=new THREE.Mesh(geo,fillMat);m.userData.pid=p.id;
  const e=new THREE.LineSegments(new THREE.EdgesGeometry(geo,1),lineMat);
  p.g=new THREE.Group();p.g.add(m,e);{const eg=ebGroup(p);if(eg)p.g.add(eg)}{const gg=grainLines(p);if(gg)p.g.add(gg)}P.add(p.g);place(p);p.g.visible=!p.hid;paint();
}
let showGrain=true,grainMat=null;
function grainLines(p){   // tekstura: panel ikki yuzasida yo'nalish bo'ylab ingichka chiziqlar (shakl ichida kesiladi)
  if(!hasGr(p)||!showGrain)return null;
  const pr=prof(p).map(a=>[a[0]-p.w/2,a[1]-p.h/2]),n=pr.length,alongX=p.gr==='w',across=alongX?p.h:p.w,cnt=Math.max(4,Math.min(40,Math.round(across/35))),v=[];
  for(let k=1;k<cnt;k++){const c=-across/2+across*k/cnt,xs=[];
    for(let i=0;i<n;i++){const a=pr[i],b=pr[(i+1)%n],a1=alongX?a[1]:a[0],b1=alongX?b[1]:b[0];
      if((a1<=c&&b1>c)||(b1<=c&&a1>c)){const t=(c-a1)/(b1-a1);xs.push(alongX?a[0]+t*(b[0]-a[0]):a[1]+t*(b[1]-a[1]))}}
    xs.sort((u,w)=>u-w);
    for(let j=0;j+1<xs.length;j+=2){const u0=xs[j]+3,u1=xs[j+1]-3;if(u1<=u0)continue;
      for(const z of[p.t/2+.3,-p.t/2-.3])alongX?v.push(u0,c,z,u1,c,z):v.push(c,u0,z,c,u1,z)}}
  if(!v.length)return null;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  const ls=new THREE.LineSegments(g,grainMat);ls.userData.grain=1;return ls}
function toggleGrain(){showGrain=!showGrain;panels.forEach(build);viewMenuSync()}
function ebGroup(p){   // kromka (qirra lentasi) belgilangan qirralar: rangli yupqa tasma
  const pr=prof(p),n=pr.length;if(!p.eb||p.eb.length!==n)return null;
  const c=pr.map(a=>[a[0]-p.w/2,a[1]-p.h/2]);let area=0;for(let i=0;i<n;i++){const a=c[i],b=c[(i+1)%n];area+=a[0]*b[1]-b[0]*a[1]}
  const sg=area>=0?1:-1,g=new THREE.Group();
  for(let i=0;i<n;i++){const t=p.eb[i];if(!(t>0))continue;const a=c[i],b=c[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-6)continue;
    const k=Math.max(t,1.5),nx=dy/len*sg,ny=-dx/len*sg,m=new THREE.Mesh(new THREE.BoxGeometry(len,k,p.t),ebMat);
    m.rotation.z=Math.atan2(dy,dx);m.position.set((a[0]+b[0])/2+nx*k/2,(a[1]+b[1])/2+ny*k/2,0);m.userData.pid=p.id;g.add(m)}
  return g.children.length?g:null}
function ebInfo(p){   // raspil/eksport uchun: Uz1/Uz2/En1/En2 (mm), qirra uzunligi (m), qalinlik bo'yicha metr
  const pr=prof(p),n=pr.length;if(!p.eb||p.eb.length!==n||!p.eb.some(v=>v>0))return{txt:'-',len:0,byT:{}};
  const L=[];for(let i=0;i<n;i++){const a=pr[i],b=pr[(i+1)%n];L.push(Math.hypot(b[0]-a[0],b[1]-a[1]))}
  let len=0;const byT={};p.eb.forEach((t,i)=>{if(t>0){len+=L[i];byT[t]=(byT[t]||0)+L[i]/1000}});
  let txt;
  if(n===4&&!p.pts&&(p.shape===undefined||p.shape==='rect')&&!p.c){const e=p.eb,f=v=>v>0?+(+v).toFixed(2):'-';txt=(p.w>=p.h?[e[0],e[2],e[1],e[3]]:[e[1],e[3],e[0],e[2]]).map(f).join('/')}   // uzunlik tomon: katta o'lcham bo'ylab
  else txt=p.eb.filter(v=>v>0).length+' qirra: '+[...new Set(p.eb.filter(v=>v>0))].join('/')+' mm';
  return{txt,len:len/1000,byT}}
function paint(){kzSync();if(!inited)return;for(const p of panels){if(!p.g)continue;const s=msel.includes(p.id);p.g.children[0].material=s?selMat:fillMat;p.g.children[1].material=s?selLine:lineMat}dirtyR=true}
function add(o){
  const p=Object.assign({id:uid++,x:0,y:0,z:0,t:T},o);
  if(o.x===undefined){p.x=(panels.length%5)*60-120;p.y=ext(p)[1]/2;p.z=0}
  panels.push(p);build(p);return p}
const cur=()=>panels.find(p=>p.id===sel);
function del(p){if(p.g&&P)P.remove(p.g);panels=panels.filter(a=>a!==p);msel=msel.filter(i=>i!==p.id);if(sel===p.id)sel=msel.length?msel[msel.length-1]:null;props();list();changed()}
let hist=[],hi=-1;
const snapStr=()=>JSON.stringify(panels.map(({g,...r})=>r));
function histBtns(){if(!wrap)return;q('#p3bUndo').disabled=hi<=0;q('#p3bRedo').disabled=hi>=hist.length-1}
function histReset(){hist=[snapStr()];hi=0;histBtns()}
function histPush(){const t=snapStr();if(hist[hi]===t)return;hist=hist.slice(0,hi+1);hist.push(t);if(hist.length>100)hist.shift();hi=hist.length-1;histBtns()}
function histGo(d){
  const n=hi+d;if(n<0||n>=hist.length)return;hi=n;
  if(dr)endDraw();if(pm){pm=null;q('#p3hint').textContent=HINT}
  for(const p of panels)if(p.g){P.remove(p.g);p.g.traverse(o=>o.geometry&&o.geometry.dispose())}
  panels=JSON.parse(hist[hi]);panels.forEach(build);msel=msel.filter(i=>panels.some(p=>p.id===i));sel=msel.length?msel[msel.length-1]:null;
  paint();props();list();markDirty();if(mode==='cut')clRender();kzSync();histBtns()}
function changed(){histPush();pmFill();markDirty();if(mode==='cut')clRender();kzSync()}

/* ---------------- sahna, kamera ---------------- */
function lum(c){const m=/#?([0-9a-f]{6})/i.exec(c);if(!m)return 0;const n=parseInt(m[1],16);return (((n>>16)&255)*.299+((n>>8)&255)*.587+(n&255)*.114)/255}
function theme(){
  if(!inited)return;
  scene.background=new THREE.Color(cssv('--sc')||'#e9ecf1');
  fillMat.color.set(cssv('--fill')||'#f0d9c4');selMat.color.set(cssv('--ac2')||'#2f7de1');
  lineMat.color.set(cssv('--line')||'#c9372f');selLine.color.set(cssv('--ac2')||'#2f7de1');dxfMat.color.set(cssv('--ac2')||'#2f7de1');if(snapMark)snapMark.material.color.set(cssv('--ac2')||'#5ee1ff');
  if(grid)scene.remove(grid);grid=new THREE.GridHelper(6000,60,cssv('--g1')||'#b9bfcc',cssv('--g2')||'#d5d9e1');scene.add(grid);
  modeMat();iconsDraw();dirtyR=true}
function modeMat(){for(const m of[fillMat,selMat]){m.opacity=wire?.07:1;m.depthWrite=!wire;m.transparent=wire;m.needsUpdate=true}dirtyR=true}
function upd(){
  cam.position.set(tg.x+R*Math.cos(el)*Math.sin(az),tg.y+R*Math.sin(el),tg.z+R*Math.cos(el)*Math.cos(az));
  // Top/Bottom: kamera aynan tik (qiya emas) — yon qirralar qo'shaloq chiziq bo'lib ko'rinmaydi
  if(Math.abs(el)>Math.PI/2-.0011){const sg=el>0?-1:1;cam.up.set(sg*Math.sin(az),0,sg*Math.cos(az))}else cam.up.set(0,1,0);
  cam.lookAt(tg);
  const bb=new THREE.Box3().setFromObject(P);bb.expandByPoint(tg);const S=bb.getSize(new THREE.Vector3()).length()*1.1+200;   // chuqurlik oralig'i sahnaga moslanadi (z-fighting oldini oladi)
  // Clipping keng: yaqinlashganda ham, uzoqlashganda ham panel/setka kesilmaydi (log depth buffer aniqlikni saqlaydi)
  const FAR=Math.max(R*30,R+S*4,80000);
  if(cam===ocam){const hh=R*Math.tan(Math.PI/9);cam.left=-hh*asp;cam.right=hh*asp;cam.top=hh;cam.bottom=-hh;cam.near=-FAR;cam.far=FAR;cam.updateProjectionMatrix()}
  else{cam.near=Math.max(.5,R/2000);cam.far=FAR;cam.updateProjectionMatrix()}
  if(snapMark)snapMark.scale.setScalar(R*.008);dirtyR=true}
function frame(){
  const b=new THREE.Box3().setFromObject(P);
  if(b.isEmpty()){tg.set(0,300,0);R=2200}else{b.getCenter(tg);R=Math.max(b.getSize(new THREE.Vector3()).length()*1.5,600)}
  upd()}
function setView(v){
  const m={iso:[.7,.5],top:[0,Math.PI/2],front:[0,0],left:[-Math.PI/2,0],right:[Math.PI/2,0],back:[Math.PI,0],bottom:[0,-Math.PI/2]}[v];[az,el]=m;cam=v==='iso'?pcam:ocam;vname=v;applyFlat();if(pm&&!pm.p)pm.o=viewOri();frame();
  qa('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v))}
function resize(){
  if(!inited||!isOpen)return;const v=q('.p3view'),w=v.clientWidth,h=v.clientHeight;if(!w||!h)return;
  renderer.setSize(w,h,false);asp=w/h;pcam.aspect=asp;pcam.updateProjectionMatrix();upd()}

/* ---------------- UI ---------------- */
const PROPL={n:'Nomi',w:'Eni',h:"Bo'yi",t:'Qalinlik',q:'Soni',c:'Qirra kengligi',x:'X',y:'Y',z:'Z',s:'Shakl',o:'Orientatsiya',g:'Tekstura'};
const PROPD=['n','w','h','t','q','g','c','x','y','z','s','o'];
let propOrder=(()=>{try{const a=JSON.parse(localStorage.getItem('p3order')||'null');if(Array.isArray(a)&&a.length===PROPD.length&&PROPD.every(k=>a.includes(k)))return a}catch(e){}return PROPD.slice()})();
function saveOrder(){try{localStorage.setItem('p3order',JSON.stringify(propOrder))}catch(e){}}
function reorder(from,to,after){const a=propOrder.filter(k=>k!==from),i=a.indexOf(to);if(i<0)return;a.splice(i+(after?1:0),0,from);propOrder=a;saveOrder();props()}
// Bir nechta panel tanlanganda: umumiy qiymatlar; o'zgartirilgan maydon hammasiga qo'llanadi, «turli» maydonga tegilmaydi
function multiProps(ps){
  const b=q('#p3pp'),same=f=>{const v=ps.map(f);return v.every(x=>x===v[0])?v[0]:null};
  const fv=v=>v===null?'':+(+v).toFixed(2);
  const fld=(k,lbl,v,ttl)=>`<div class="p3r"><label>${lbl}</label><input id="p3m_${k}" type="text" inputmode="decimal" value="${fv(v)}" placeholder="${v===null?'turli':''}" title="${ttl||''}"></div>`;
  const g=same(x=>x.gr||''),mat=same(x=>x.mat||'');
  const kr=ps.map(x=>ebInfo(x).len).reduce((a,c)=>a+c,0);
  b.innerHTML=`<div class="p3multi"><b>Tanlangan: ${ps.length} ta panel</b>
   <p class="p3mu">Maydonni o'zgartirsangiz — hamma tanlanganlarga qo'llanadi. «turli» (bo'sh) maydon tegilmaydi.</p>
   ${fld('t','Qalinlik',same(x=>x.t),"Hamma tanlangan panellarga bir xil qalinlik (mm)")}
   ${fld('w','Eni',same(x=>x.w))}
   ${fld('h',"Bo'yi",same(x=>x.h))}
   ${fld('q','Soni',same(x=>x.q||1))}
   <div class="p3r"><label>Tekstura</label><select id="p3m_g">${g===null?'<option value="*" selected>— turli —</option>':''}${Object.entries(GRN).map(([v,t])=>`<option value="${v}"${g===v?' selected':''}>${t}</option>`).join('')}</select></div>
   <div class="p3r"><label>Material</label><input id="p3m_mat" value="${esc(mat===null?'':mat)}" placeholder="${mat===null?'turli':''}"></div>
   <div class="p3dh" style="padding:8px 0 2px">Kromka (tanlangan ${ps.length} ta panel)</div>
   <div class="p3r"><label>Qalinlik (mm)</label><input id="p3m_ebT" type="text" inputmode="decimal" value="${esc(q('#p3ebT')?q('#p3ebT').value:'0.4')}"></div>
   <div class="p3row"><button id="p3m_ebAll">Hamma qirra</button><button id="p3m_ebLong">Uzun tomonlar</button><button id="p3m_ebShort">Qisqa tomonlar</button><button id="p3m_ebClr">Tozalash</button></div>
   <p class="p3mu">Jami kromka: ${kr.toFixed(2)} m</p>
   <div class="p3row"><button id="p3m_copy">Nusxa</button><button id="p3m_del">O'chirish</button></div></div>`;
  const apply=fn=>{ps.forEach(fn);ps.forEach(build);paint();list();changed();props()};
  for(const k of['t','w','h'])q('#p3m_'+k).onchange=e=>{const v=num(e.target.value);if(!(v>0))return;apply(x=>{x[k]=Math.max(k==='t'?.1:1,v)})};
  q('#p3m_q').onchange=e=>{const v=Math.round(num(e.target.value));if(!(v>0))return;apply(x=>{x.q=v})};
  q('#p3m_g').onchange=e=>{const v=e.target.value;if(v==='*')return;apply(x=>{if(v)x.gr=v;else delete x.gr})};
  q('#p3m_mat').onchange=e=>{const v=e.target.value.trim();apply(x=>{if(v)x.mat=v;else delete x.mat})};
  const ebT=()=>{const v=Math.max(.1,num(q('#p3m_ebT').value)||.4);if(q('#p3ebT'))q('#p3ebT').value=v;return v};
  [['All','all'],['Long','long'],['Short','short'],['Clr','clear']].forEach(([i,m])=>q('#p3m_eb'+i).onclick=()=>{ebApplyTo(ps,m,ebT());paint();list();changed();props()});
  q('#p3m_copy').onclick=()=>copySel();
  q('#p3m_del').onclick=()=>ps.forEach(del);
}
function props(){
  if(!wrap)return;
  {const ps=selected();if(ps.length>1){multiProps(ps);return}}
  const p=cur(),b=q('#p3pp');
  if(!p){b.innerHTML='<p class="p3mu">Panel tanlang yoki shablondan qo\'shing.</p>';return}
  const so=Object.entries(p.pts?Object.assign({},SHP,{poly:'Chizilgan'}):SHP).map(([k,v])=>`<option value="${k}"${k===shapeOf(p)?' selected':''}>${v}</option>`).join('');
  const oo=Object.entries(ORI).map(([k,v])=>`<option value="${k}"${k===oriOf(p)?' selected':''}>${v}</option>`).join('');
  const field=k=>k==='n'?`<input id="p3f_n" value="${esc(p.n)}">`:k==='s'?`<select id="p3f_s">${so}</select>`:k==='o'?`<select id="p3f_o">${oo}</select>`:k==='g'?`<select id="p3f_g" title="Tekstura (tola) yo'nalishi: 3D da chiziqlar bilan ko'rinadi, Cutlist'da L shu yo'nalishda chiqadi">${Object.entries(GRN).map(([v,t])=>`<option value="${v}"${(p.gr||'')===v?' selected':''}>${t}</option>`).join('')}</select>`
    :`<input id="p3f_${k}" type="text" inputmode="decimal" value="${+(k==='q'?(p.q||1):p[k]).toFixed(2)}">`;
  const row=k=>`<div class="p3r" data-k="${k}"><span class="p3h" title="Sudrab joyini almashtiring">⠿</span><label>${PROPL[k]}</label>${field(k)}<span class="p3ar"><button class="p3u" title="Yuqoriga">↑</button><button class="p3d" title="Pastga">↓</button></span></div>`;
  b.innerHTML=propOrder.filter(k=>k!=='c'||hasC(p)).map(row).join('')+`
  <p class="p3mu">X, Y, Z — panel markazi (mm). Eni/bo'yi o'zgarsa qalinlik o'zgarmaydi. Qatorlarni ⠿ dan sudrab yoki ↑↓ bilan tartiblang. Panelga 2 marta bosing — shaklini chizish.</p>
  <div class="p3row"><button id="p3bRot">↻ 90°</button><button id="p3bDup">Nusxa</button><button id="p3bDel">O'chirish</button></div>`;
  q('#p3f_n').onchange=e=>{p.n=e.target.value;list();changed()};
  for(const k of['w','h','t','c'])if(q('#p3f_'+k))q('#p3f_'+k).onchange=e=>{p[k]=Math.max(1,num(e.target.value)||1);build(p);props();list();changed()};
  q('#p3f_q').onchange=e=>{p.q=Math.max(1,Math.round(num(e.target.value))||1);props();changed()};
  for(const k of['x','y','z'])q('#p3f_'+k).onchange=e=>{p[k]=num(e.target.value);place(p);changed()};
  q('#p3f_g').onchange=e=>{grApply([p],e.target.value);list();changed()};
  q('#p3f_o').onchange=e=>{p.o=e.target.value;delete p.m;p.ry=0;place(p);changed()};
  q('#p3f_s').onchange=e=>{const v=e.target.value;if(v==='poly')return;delete p.pts;delete p.eb;p.shape=v;if((v==='L'||v==='U')&&!p.c)p.c=100;build(p);props();changed()};
  qa('#p3pp .p3r').forEach(r=>{const k=r.dataset.k,h=r.querySelector('.p3h');
    r.querySelector('.p3u').onclick=()=>{const v=propOrder.filter(x=>x!=='c'||hasC(p)),i=v.indexOf(k);if(i>0)reorder(k,v[i-1],false)};
    r.querySelector('.p3d').onclick=()=>{const v=propOrder.filter(x=>x!=='c'||hasC(p)),i=v.indexOf(k);if(i<v.length-1)reorder(k,v[i+1],true)};
    h.onmousedown=()=>{r.draggable=true};r.ondragend=()=>{r.draggable=false};
    r.ondragstart=e=>{e.dataTransfer.setData('text/plain',k);e.dataTransfer.effectAllowed='move'};
    r.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};
    r.ondrop=e=>{e.preventDefault();const f=e.dataTransfer.getData('text/plain');if(!f||f===k)return;const v=propOrder.filter(x=>x!=='c'||hasC(p));reorder(f,k,v.indexOf(f)<v.indexOf(k))}});
  q('#p3bRot').onclick=()=>{
    if(!p.pts&&(p.c||(p.shape&&p.shape!=='rect'))){p.pts=prof(p);p.bw=p.w;p.bh=p.h;delete p.c;p.shape='poly'}
    if(p.pts){p.pts=p.pts.map(a=>[a[1],p.bw-a[0]]);[p.bw,p.bh]=[p.bh,p.bw]}
    if(p.eb&&!p.pts&&p.eb.length===4)p.eb=[p.eb[1],p.eb[2],p.eb[3],p.eb[0]];   // 90° aylantirishda kromka o'sha jismoniy qirrada qoladi
    if(hasGr(p))p.gr=p.gr==='w'?'h':'w';   // tekstura jismoniy yo'nalishda qoladi
    [p.w,p.h]=[p.h,p.w];build(p);props();list();changed()};
  q('#p3bDup').onclick=()=>{const c=Object.assign({},p,{g:null,id:uid++,x:p.x+40});if(p.pts)c.pts=p.pts.map(a=>a.slice());panels.push(c);build(c);select(c.id);changed()};
  q('#p3bDel').onclick=()=>del(p);
}
function syncPos(p){for(const k of['x','y','z']){const i=q('#p3f_'+k);if(i)i.value=+p[k].toFixed(2)}}
function list(){
  if(!wrap)return;
  q('#p3pl').innerHTML=panels.map(p=>`<div class="p3it${msel.includes(p.id)?' s':''}${p.hid?' h':''}" data-id="${p.id}">${esc(p.n)}<span>${+p.w.toFixed(1)}×${+p.h.toFixed(1)}×${+p.t.toFixed(1)}${(p.q||1)>1?' ×'+p.q:''}</span></div>`).join('')||'<p class="p3mu">Panel yo\'q.</p>';
  qa('.p3it').forEach(e=>e.onclick=()=>select(+e.dataset.id));
  selMatOpts();
}
function selByMat(m,t){const v=panels.filter(p=>!p.hid&&matN(p)===m&&(t==null||+p.t.toFixed(2)===t));if(!v.length)return 0;msel=v.map(p=>p.id);sel=msel[msel.length-1];paint();props();list();pmFill();dirtyR=true;return v.length}
function selMatOpts(){const el=q('#p3selMat');if(!el)return;const m=new Map();for(const p of panels){if(p.hid)continue;const a=matN(p),t=+p.t.toFixed(2);const r=m.get(a)||{n:0,ts:new Map()};r.n+=1;r.ts.set(t,(r.ts.get(t)||0)+1);m.set(a,r)}
  el.innerHTML='<option value="">— tanlash —</option>'+[...m.keys()].sort().map(a=>{const r=m.get(a);return `<option value="${esc(a)}|">${esc(matLbl(a))} — ${r.n} ta</option>`+(r.ts.size>1?[...r.ts.keys()].sort((x,y)=>x-y).map(t=>`<option value="${esc(a)}|${t}">&nbsp;&nbsp;${esc(matLbl(a))} · ${t} mm — ${r.ts.get(t)} ta</option>`).join(''):'')}).join('');el.value=''}
function clearSel(){msel=[];sel=null;paint();props();list();pmFill()}
function selectAllP(){const v=panels.filter(p=>!p.hid);if(!v.length)return;msel=v.map(p=>p.id);sel=msel[msel.length-1];paint();props();list();pmFill();dirtyR=true}
function frameSel(){const ps=selected().filter(p=>p.g&&!p.hid);if(!ps.length){frame();return}const b=new THREE.Box3();ps.forEach(p=>b.expandByObject(p.g));b.getCenter(tg);R=Math.max(b.getSize(new THREE.Vector3()).length()*1.5,300);upd()}
// Menyudagi hotkey yorliqlari joriy sozlamadan olinadi (tugma almashtirilsa o'zi yangilanadi)
const P3KB={p3tSel:'tool.select',p3tMov:'tool.move',p3tRot:'tool.rotate',p3tScl:'tool.scale',p3tStr:'tool.stretch',p3tEdg:'tool.edge',p3mkRul:'tool.ruler',p3mkGd:'tool.guide',p3mkGc:'guide.clear',
  p3oCopy:'obj.copy',p3oMx:'obj.mirrorX',p3oMy:'obj.mirrorY',p3oMz:'obj.mirrorZ',p3oDel:'obj.delete',p3vmHide:'view.hide',p3vmIso:'view.isolate',p3vmUn:'view.unhide',
  p3vmSolid:'view.solid',p3vmWire:'view.wire',p3vmThick:'view.thick',p3vmGrain:'view.grain',p3vmFrame:'view.frame',p3vmFrameSel:'view.frameSel',p3mkMag:'snap.magnet',p3bOrtho:'snap.ortho',p3pnNew:'panel.new',p3pnFromDraw:'panel.fromDraw',p3pnDraw:'panel.draw',
  p3bGrp:'sel.group',p3bDraw:'panel.load2d',p3bRot:'obj.rot90',p3bRL:'body.rotL',p3bRR:'body.rotR'};
function p3KbSync(){
  if(!wrap)return;
  for(const id in P3KB){const b=q('#'+id);if(!b)continue;const k=p3Keys[P3KB[id]]||'';
    if(!b.dataset.t0)b.dataset.t0=b.title||'';b.title=b.dataset.t0+(k?(b.dataset.t0?' — ':'')+'Hotkey: '+k:'');
    if(!b.classList.contains('p3di'))continue;let s=b.querySelector('.kb');if(!s){s=document.createElement('span');s.className='kb';b.appendChild(s)}s.textContent=k;s.hidden=!k}
  qa('[data-v]').forEach(b=>{const k=p3Keys['view.'+b.dataset.v]||'';if(!b.dataset.t0)b.dataset.t0=b.title||'';b.title=b.dataset.t0+(k?' — '+k:'')})}
function select(id,add){
  if(id==null){clearSel();return}
  msel=add?(msel.includes(id)?msel.filter(i=>i!==id):[...msel,id]):[id];
  sel=msel.length?msel[msel.length-1]:null;paint();props();list();pmFill()}
const selected=()=>panels.filter(p=>msel.includes(p.id));
function iconDraw(t,c){
  const x=c.getContext('2d');c.width=c.height=96;x.clearRect(0,0,96,96);
  const pr=prof(t),s=56/Math.max(t.w,t.h),dx=14,dy=-14,W=t.w*s,H=t.h*s,ox=(96-W-dx)/2,oy=(96+H+dy)/2+Math.abs(dy)/2-8;
  const pt=(a,d)=>[ox+a[0]*s+(d?dx:0),oy-a[1]*s+(d?dy:0)];
  const path=d=>{x.beginPath();pr.forEach((a,i)=>{const z=pt(a,d);i?x.lineTo(z[0],z[1]):x.moveTo(z[0],z[1])});x.closePath()};
  x.lineWidth=2.4;x.lineJoin='round';x.strokeStyle=cssv('--line');x.fillStyle=cssv('--fill');
  path(1);x.fill();x.stroke();
  pr.forEach(a=>{const u=pt(a,0),v=pt(a,1);x.beginPath();x.moveTo(u[0],u[1]);x.lineTo(v[0],v[1]);x.stroke()});
  path(0);x.fill();x.stroke()}
function iconsDraw(){if(!wrap)return;qa('.p3tile canvas').forEach((c,i)=>iconDraw(TPL[i],c))}

/* ---------------- Cutlist (raskroy) rejimi ---------------- */
// Tekstura (tola) yo'nalishi: p.gr = 'h' — panel bo'yi bo'ylab, 'w' — eni bo'ylab, yo'q — tekstura muhim emas.
// L (uzunlik) — teksturali panelda DOIM tekstura bo'ylab o'lcham (raskroy dasturlari shunday kutadi), teksturasizda uzun tomon.
const GRN={'':"Yo'q",h:"Bo'yi bo'ylab ║",w:"Eni bo'ylab ═"};
const hasGr=p=>p.gr==='w'||p.gr==='h';
const Lk=p=>hasGr(p)?p.gr:(p.w>=p.h?'w':'h');
const LW=p=>{const k=Lk(p);return[p[k],p[k==='w'?'h':'w']]};
const canRot=p=>!hasGr(p)&&p.rot!==false;
function grCycle(p){p.gr=p.gr==='h'?'w':p.gr==='w'?undefined:'h';if(!p.gr)delete p.gr}
function edgeSlots(p){   // kromka qirralari: L — L o'lchamga (tekstura yoki uzun tomon) parallel, W — unga tik; tartib = profil segmentlari tartibi
  const pr=prof(p),n=pr.length,H=[],V=[];
  for(let i=0;i<n;i++){const a=pr[i],b=pr[(i+1)%n];(Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])?H:V).push(i)}
  return Lk(p)==='w'?{L:H,W:V}:{L:V,W:H}}
const ebAt=(p,i)=>(p.eb&&p.eb.length===prof(p).length)?(+p.eb[i]||0):0;
const ebNeed=(ps,k)=>Math.min(4,Math.max(2,...ps.map(p=>edgeSlots(p)[k].length)));   // L1..L4 / W1..W4 (to'rtburchakda L1,L2,W1,W2)
const ebCells=(p,k,n)=>{const s=edgeSlots(p)[k];return Array.from({length:n},(_,j)=>j<s.length?{i:s[j],v:ebAt(p,s[j])}:null)};
const ebOver=p=>{const s=edgeSlots(p);return[...s.L.slice(4),...s.W.slice(4)].filter(i=>ebAt(p,i)>0).length};
const matN=p=>(p.mat||'').trim(),matLbl=m=>m||'(materialsiz)';
const clFilt=(ps,tf,mf)=>ps.filter(p=>(!tf||+p.t.toFixed(2)===+tf)&&(mf==null||mf==='*'||matN(p)===mf));
const clT=()=>Math.max(.1,num(q('#p3clEbT').value)||.4);
function clSummary(){
  const el=q('#p3clSum');if(!el)return;let cnt=0,A=0;const EB={};
  for(const p of panels){const n=p.q||1,e=ebInfo(p);cnt+=n;A+=p.w*p.h*n/1e6;for(const t in e.byT)EB[t]=(EB[t]||0)+e.byT[t]*n}
  const ts=Object.keys(EB).sort((a,b)=>a-b);
  el.innerHTML=`<p class="p3mu">Panellar: ${panels.length} xil, ${cnt} dona · ${A.toFixed(2)} m²</p>`+(ts.length?`<p class="p3mu">Kromka: ${ts.map(t=>EB[t].toFixed(2)+' m ('+t+' mm)').join(' · ')}</p>`:'<p class="p3mu">Kromka belgilanmagan.</p>');
  const tf=q('#p3clTf');if(tf){const c0=tf.value,all=[...new Set(panels.map(p=>+p.t.toFixed(2)))].sort((a,b)=>a-b);
    tf.innerHTML='<option value="">Hamma qalinlik</option>'+all.map(t=>`<option value="${t}">${t} mm</option>`).join('');if(all.map(String).includes(c0))tf.value=c0}
  const mf=q('#p3clMf');if(mf){const c0=mf.value,all=[...new Set(panels.map(matN))].sort();
    mf.innerHTML='<option value="*">Hamma material</option>'+all.map(m=>`<option value="${esc(m)}">${esc(matLbl(m))}</option>`).join('');if(all.includes(c0))mf.value=c0}}
function clRender(){
  if(!wrap)return;
  if(clSkip){clSkip=false;clSummary();return}
  const ps=panels,nL=ebNeed(ps,'L'),nW=ebNeed(ps,'W'),tab=q('#p3clTab');
  if(!ps.length){tab.innerHTML='<p class="p3mu" style="padding:14px">Panel yo\'q. Modeling bo\'limida panel yasang yoki Drawing bo\'limidagi yopiq konturlarni «Panel ▸ Chizmadan panel yasash» bilan panelga aylantiring.</p>';clSummary();return}
  const th=(t,c)=>`<th${c?` class="${c}"`:''}>${t}</th>`;
  let h='<table class="p3cl-t"><thead><tr><th><input type="checkbox" id="p3clAll"'+(ps.every(p=>clSel.has(p.id))?' checked':'')+' title="Hammasini tanlash"></th>'
    +['№','Nomi','L (uzunlik)','W (eni)','t','Soni','Tekstura','Aylantirish','Material','Izoh'].map(x=>th(x)).join('')
    +Array.from({length:nL},(_,j)=>th('L'+(j+1),'k')).join('')+Array.from({length:nW},(_,j)=>th('W'+(j+1),'k')).join('')+th('Kromka (m)')+'</tr></thead><tbody>';
  ps.forEach((p,r)=>{
    const[L,W]=LW(p),ei=ebInfo(p),inp=(f,v,w)=>`<input data-id="${p.id}" data-f="${f}" value="${esc(v)}" style="width:${w}px">`;
    const cell=c=>c?`<td class="k"><button class="ke${c.v>0?' on':''}" data-id="${p.id}" data-e="${c.i}" title="Bosing: kromka qo'yish/olish">${c.v>0?+c.v.toFixed(2):'·'}</button></td>`:'<td class="k off">—</td>';
    h+=`<tr><td><input type="checkbox" data-id="${p.id}" data-f="sel"${clSel.has(p.id)?' checked':''}></td><td>${r+1}</td><td>${inp('n',p.n,130)}</td><td>${+L.toFixed(1)}</td><td>${+W.toFixed(1)}</td><td>${inp('t',+p.t.toFixed(2),44)}</td><td>${inp('q',p.q||1,40)}</td><td><button class="ke gr${hasGr(p)?' on':''}" data-id="${p.id}" data-gr="1" title="Bosing: Yo'q → Bo'yi bo'ylab → Eni bo'ylab. Teksturali panelda L = tekstura bo'ylab o'lcham, aylantirish taqiqlanadi">${hasGr(p)?(p.gr==='h'?'║ bo\'yi':'═ eni'):'—'}</button></td><td><input type="checkbox" data-id="${p.id}" data-f="rot"${canRot(p)?' checked':''}${hasGr(p)?' disabled title="Teksturali panel aylantirilmaydi"':''}></td><td>${inp('mat',p.mat||'',70)}</td><td>${inp('note',p.note||'',110)}</td>`
      +ebCells(p,'L',nL).map(cell).join('')+ebCells(p,'W',nW).map(cell).join('')+`<td>${ei.len?ei.len.toFixed(2):'—'}</td></tr>`});
  tab.innerHTML=h+'</tbody></table>';clSummary()}
function clEdit(id,f,v){
  const p=panels.find(a=>a.id===id);if(!p)return;
  if(f==='n')p.n=v;else if(f==='q')p.q=Math.max(1,Math.round(num(v))||1);else if(f==='t'){p.t=Math.max(.1,num(v)||p.t);build(p)}
  else if(f==='rot')p.rot=!!v;else if(f==='mat')p.mat=v;else if(f==='note')p.note=v;
  if(f!=='t')clSkip=true;   // matn kataklarini tahrirlashda jadval qayta chizilmaydi (fokus yo'qolmasligi uchun)
  changed()}
function clEdge(id,i){
  const p=panels.find(a=>a.id===id);if(!p)return;const n=prof(p).length,t=clT();
  p.eb=(p.eb&&p.eb.length===n)?p.eb.slice():new Array(n).fill(0);p.eb[i]=p.eb[i]===t?0:t;if(!p.eb.some(v=>v>0))delete p.eb;
  build(p);changed()}
function ebApplyTo(ps,mode,t){   // hamma qirra / eng uzun / eng qisqa / tozalash
  for(const p of ps){const sg=segsOf(p),L=sg.map(s=>Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1])),mx=Math.max(...L),mn=Math.min(...L);
    if(mode==='clear'){delete p.eb;build(p);continue}
    p.eb=L.map(l=>mode==='all'||(mode==='long'&&l>=mx-1e-6)||(mode==='short'&&l<=mn+1e-6)?t:0);
    if(!p.eb.some(v=>v>0))delete p.eb;build(p)}}
function clBulk(mode){const ps=clSel.size?panels.filter(p=>clSel.has(p.id)):panels;if(!ps.length)return;ebApplyTo(ps,mode,clT());changed()}
function grApply(ps,v){for(const p of ps){if(v)p.gr=v;else delete p.gr;build(p)}}
function clGrBulk(v){const ps=clSel.size?panels.filter(p=>clSel.has(p.id)):panels;if(!ps.length)return;grApply(ps,v);props();changed()}
function clOpts(){
  const D={dl:';',hdr:true,dec:'.',kf:'mm',tf:'',mf:'*',mat:false,note:true,rot:true,tex:true,km:true};
  if(!wrap||!q('#p3clDl'))return D;
  return{dl:q('#p3clDl').value,hdr:q('#p3clH').checked,dec:q('#p3clDec').value,kf:q('#p3clKf').value,tf:q('#p3clTf').value,mf:q('#p3clMf')?q('#p3clMf').value:'*',mat:q('#p3clIMat').checked,note:q('#p3clINote').checked,rot:q('#p3clIRot').checked,tex:q('#p3clITex')?q('#p3clITex').checked:true,km:q('#p3clIKm').checked}}
function clExportData(opts){   // raskroy dasturi uchun CSV/TXT: Uzunlik, Eni, Soni, Nomi, Qalinlik, [Material, Izoh, Aylantirish], L1..L4, W1..W4, [Kromka (m)]
  const o=Object.assign(clOpts(),opts||{}),sep=o.dl==='tab'?'\t':o.dl,f=v=>String(+(+v).toFixed(2)).replace('.',o.dec),
    bad=new RegExp('['+(sep==='\t'?'\\t':sep===','?',':';')+'\\r\\n]','g'),clean=v=>String(v).replace(bad,' ');
  const ps=clFilt(panels,o.tf,o.mf),nL=ebNeed(ps,'L'),nW=ebNeed(ps,'W'),m=new Map();
  for(const p of ps){const ev=[...ebCells(p,'L',nL),...ebCells(p,'W',nW)].map(c=>c?c.v:0),over=ebOver(p),
    key=[p.n,...LW(p),p.t,p.mat||'',p.note||'',canRot(p)?1:0,hasGr(p)?1:0,ev.join(','),over].join('|'),r=m.get(key)||{p,ev,over,n:0};r.n+=p.q||1;m.set(key,r)}
  const head=['Uzunlik','Eni','Soni','Nomi','Qalinlik'];if(o.mat)head.push('Material');if(o.note)head.push('Izoh');if(o.rot)head.push('Aylantirish');if(o.tex)head.push('Tekstura');
  for(let j=1;j<=nL;j++)head.push('L'+j);for(let j=1;j<=nW;j++)head.push('W'+j);if(o.km)head.push('Kromka (m)');
  const kv=v=>o.kf==='flag'?(v>0?1:0):f(v);
  const rows=[...m.values()].map(r=>{const p=r.p,lw=LW(p),row=[f(lw[0]),f(lw[1]),r.n,clean(p.n),f(p.t)];
    if(o.mat)row.push(clean(p.mat||''));if(o.note)row.push(clean((p.note||'')+(r.over?` (+${r.over} qirra kromka)`:'')));if(o.rot)row.push(canRot(p)?1:0);if(o.tex)row.push(hasGr(p)?1:0);
    r.ev.forEach(v=>row.push(kv(v)));if(o.km)row.push(f(ebInfo(p).len*r.n));return row});
  const ext=o.dl==='tab'?'txt':'csv';
  return{text:(o.hdr?[head,...rows]:rows).map(r=>r.join(sep)).join('\r\n'),name:'raskroy.'+ext,mime:ext==='txt'?'text/plain':'text/csv',n:rows.length,head,rows}}
function clSheet(){
  const L=num(q('#p3shL').value)||2800,W=num(q('#p3shW').value)||2070,K=Math.max(0,num(q('#p3shK').value)),Tr=Math.max(0,num(q('#p3shT').value)),SW=L-2*Tr,SH=W-2*Tr,groups={};
  const o=clOpts(),ps=clFilt(panels,o.tf,o.mf);
  for(const p of ps){const t=+p.t.toFixed(2),key=matN(p)+'|'+t,g=groups[key]=groups[key]||{m:matN(p),t,items:[],A:0,eb:{}};const lw=LW(p),n=p.q||1,e=ebInfo(p);
    g.A+=p.w*p.h*n/1e6;for(const k in e.byT)g.eb[k]=(g.eb[k]||0)+e.byT[k]*n;for(let i=0;i<n;i++)g.items.push({w:lw[0],h:lw[1],rot:canRot(p)})}
  let tot=0,rows='',bad=0,TA=0,TS=0;const TE={};
  const ebS=eb=>{const ks=Object.keys(eb).sort((a,b)=>a-b);return ks.length?ks.map(k=>`${eb[k].toFixed(2)} m <span class="p3mu">(${k} mm)</span>`).join('<br>'):'—'};
  const keys=Object.keys(groups).sort((a,b)=>groups[a].m.localeCompare(groups[b].m)||groups[a].t-groups[b].t);
  for(const k of keys){const g=groups[k],items=g.items,r=packSheets(items,SW,SH,K),n=r.sheets.length,used=r.sheets.reduce((a,s)=>a+s.area,0),SA=n*L*W/1e6;
    tot+=n;bad+=r.unfit.length;TA+=g.A;TS+=SA;for(const t in g.eb)TE[t]=(TE[t]||0)+g.eb[t];
    rows+=`<tr><td><b>${esc(matLbl(g.m))}</b></td><td>${g.t} mm</td><td>${items.length}</td><td>${g.A.toFixed(2)} m²</td><td>${ebS(g.eb)}</td><td><b>${n}</b> <span class="p3mu">(${SA.toFixed(2)} m²)</span></td><td>${n?(used/(n*L*W)*100).toFixed(0)+'%':'—'}<br><span class="p3mu">${r.sheets.map(h=>(h.area/(L*W)*100).toFixed(0)+'%').join(' · ')}</span></td><td>${r.unfit.length||''}</td></tr>`}
  const flt=[o.tf?o.tf+' mm':'',o.mf&&o.mf!=='*'?matLbl(o.mf):''].filter(Boolean).join(' · ');
  if(rows&&keys.length>1)rows+=`<tr class="tot"><td colspan="2"><b>Jami</b></td><td>${keys.reduce((a,k)=>a+groups[k].items.length,0)}</td><td><b>${TA.toFixed(2)} m²</b></td><td>${ebS(TE)}</td><td><b>${tot}</b> <span class="p3mu">(${TS.toFixed(2)} m²)</span></td><td></td><td>${bad||''}</td></tr>`;
  q('#p3clSheetOut').innerHTML=rows?`<div class="p3clwh"><b>List hisobi</b>${flt?` <span class="p3flt">Filtr: ${esc(flt)}</span>`:' <span class="p3mu">— hamma material</span>'}<span style="flex:1"></span><button id="p3clSheetX" title="Yopish">✕</button></div><table><tr><th>Material</th><th>Qalinlik</th><th>Panel (dona)</th><th>Panellar maydoni</th><th>Kromka</th><th>List</th><th>Foydalanish (o'rtacha / har list)</th><th>Sig'mas</th></tr>${rows}</table><p class="p3mu"><b>Jami: ${tot} list</b> (${L}×${W} mm${bad?`; ${bad} ta panel listga sig'maydi`:''}). Foydalanish = panellar maydoni / listlar maydoni; qolgani chiqit. Taxminiy hisob: MaxRects; teksturali panellar L o'lchami list uzunligi bo'ylab joylanadi va aylantirilmaydi; «Aylantirish» o'chirilganlar ham aylantirilmaydi.</p>`:`<p class="p3mu">${flt?'Filtr ('+esc(flt)+') bo\'yicha panel yo\'q.':'Panel yo\'q.'}</p>`;
  const x=q('#p3clSheetX');if(x)x.onclick=()=>{q('#p3clSheetOut').innerHTML=''}}
function clWire(){
  const tab=q('#p3clTab');
  tab.addEventListener('change',e=>{const t=e.target,id=+t.dataset.id,f=t.dataset.f;
    if(t.id==='p3clAll'){clSel=t.checked?new Set(panels.map(p=>p.id)):new Set();clRender();return}
    if(!f)return;if(f==='sel'){t.checked?clSel.add(id):clSel.delete(id);return}
    clEdit(id,f,f==='rot'?t.checked:t.value)});
  tab.addEventListener('click',e=>{const b=e.target.closest('button.ke');if(!b)return;if(b.dataset.gr){const p=panels.find(a=>a.id===+b.dataset.id);if(p){grCycle(p);build(p);props();changed()}return}clEdge(+b.dataset.id,+b.dataset.e)});
  q('#p3clEbT').onchange=e=>{const v=Math.max(.1,num(e.target.value)||.4);e.target.value=v;q('#p3ebT').value=v};
  q('#p3ebT').addEventListener('change',e=>{q('#p3clEbT').value=e.target.value});
  [['All','all'],['Long','long'],['Short','short'],['Clr','clear']].forEach(([i,m])=>q('#p3clEb'+i).onclick=()=>clBulk(m));
  [['H','h'],['W','w'],['N','']].forEach(([i,v])=>q('#p3clGr'+i).onclick=()=>clGrBulk(v));
  q('#p3clTApply').onclick=()=>{const v=num(q('#p3clTb').value);if(!(v>0))return;const ps=clSel.size?panels.filter(p=>clSel.has(p.id)):panels;ps.forEach(p=>{p.t=v;build(p)});props();changed()};
  const say2=t=>{q('#p3clInfo').textContent=t};
  q('#p3clExp').onclick=()=>{const d=clExportData();if(!d.n){say2("Eksport qilinadigan panel yo'q.");return}
    try{if(typeof downloadFile==='function'){downloadFile(d.text,d.name,d.mime);say2(`${d.name}: ${d.n} qator, ${d.head.length} ustun.`);return}}catch(e){}
    try{navigator.clipboard.writeText(d.text);say2("Fayl yuklab bo'lmadi, matn nusxalandi.")}catch(e){}};
  q('#p3clCopy').onclick=async()=>{const d=clExportData();try{await navigator.clipboard.writeText(d.text);say2(`Nusxalandi: ${d.n} qator.`)}catch(e){say2("Nusxalab bo'lmadi.")}};
  q('#p3clSheetB').onclick=clSheet;
  ['#p3clTf','#p3clMf'].forEach(id=>q(id).addEventListener('change',()=>{if(q('#p3clSheetOut').innerHTML)clSheet()}))}
function openCut(){
  if(!wrap)initUI();
  if(isOpen&&mode==='model'){if(dr)endDraw();cancelPlace()}
  mode='cut';wrap.classList.add('cut');isOpen=true;document.body.classList.add('p3On');wrap.style.display='flex';place3d();
  const id=x=>document.getElementById(x);if(id('modeCutlistBtn'))id('modeCutlistBtn').classList.add('active');
  for(const x of['modePanel3dBtn','modeSelectBtn','modeDrawBtn'])if(id(x))id(x).classList.remove('active');
  clRender();dirtyR=true}

/* ---------------- DXF / 2D chizma ---------------- */
function parseDXF(t){
  const L=t.split(/\r?\n/),ents=[];let c=null,poly=null;
  for(let i=0;i+1<L.length;i+=2){const g=parseInt(L[i]),v=L[i+1].trim(),n=parseFloat(v);
    if(g===0){   // R12 (Rugby eksporti): POLYLINE + VERTEX... + SEQEND; yangi: LWPOLYLINE
      if(c){if(c.t==='VERTEX'){if(c.poly&&c.pts[0])c.poly.pts.push(c.pts[0])}else if(c.t!=='POLYLINE')ents.push(c)}
      c=null;
      if(v==='POLYLINE'){c={t:'POLYLINE',pts:[],f:0};poly=c}
      else if(v==='VERTEX'&&poly)c={t:'VERTEX',pts:[],f:0,poly}
      else if(v==='SEQEND'){if(poly){ents.push(poly);poly=null}}
      else if(['LINE','LWPOLYLINE','CIRCLE','ARC'].includes(v))c={t:v,pts:[],f:0};
      continue}
    if(!c)continue;
    if(g===10)c.pts.push([n,0,0]);else if(g===20&&c.pts.length)c.pts[c.pts.length-1][1]=n;
    else if(g===42&&c.pts.length)c.pts[c.pts.length-1][2]=n;
    else if(g===11)c.e=[n,0];else if(g===21&&c.e)c.e[1]=n;
    else if(g===40)c.r=n;else if(g===50)c.a0=n;else if(g===51)c.a1=n;else if(g===70)c.f=parseInt(v)}
  if(c)ents.push(c);
  const out=[];
  for(const e of ents){
    if(e.t==='LINE'&&e.e&&e.pts[0])out.push({p:[[e.pts[0][0],e.pts[0][1]],e.e],c:false});
    else if((e.t==='LWPOLYLINE'||e.t==='POLYLINE')&&e.pts.length>1){
      const closed=!!(e.f&1),pts=[],n=e.pts.length;
      for(let i=0;i<(closed?n:n-1);i++){
        const a=e.pts[i],b=e.pts[(i+1)%n];pts.push([a[0],a[1]]);
        if(a[2]){const th=4*Math.atan(a[2]),dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy);
          if(d>1e-9){const h=(d/2)/Math.tan(th/2),cx=(a[0]+b[0])/2-dy/d*h,cy=(a[1]+b[1])/2+dx/d*h,r=Math.hypot(a[0]-cx,a[1]-cy),a0=Math.atan2(a[1]-cy,a[0]-cx),k=Math.max(2,Math.ceil(Math.abs(th)/.2));
            for(let j=1;j<k;j++){const ang=a0+th*j/k;pts.push([cx+r*Math.cos(ang),cy+r*Math.sin(ang)])}}}
      }
      if(!closed)pts.push([e.pts[n-1][0],e.pts[n-1][1]]);
      out.push({p:pts,c:closed})}
    else if((e.t==='CIRCLE'||e.t==='ARC')&&e.pts[0]&&e.r){
      const a0=e.t==='ARC'?e.a0*Math.PI/180:0;let a1=e.t==='ARC'?e.a1*Math.PI/180:Math.PI*2;if(a1<=a0)a1+=Math.PI*2;
      const n=Math.max(8,Math.ceil((a1-a0)/(Math.PI*2)*72)),pts=[];
      for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n;pts.push([e.pts[0][0]+e.r*Math.cos(a),e.pts[0][1]+e.r*Math.sin(a)])}
      out.push({p:pts,c:false,circle:e.t==='CIRCLE'})}}
  return out}
function setLines(polys,name){
  lines=polys.map(l=>{const o={p:l.p.map(a=>[+a[0].toFixed(2),+a[1].toFixed(2)]),c:l.c,circle:!!l.circle};if(l.z)o.z=+l.z;return o});
  drawLines();const closed=lines.filter(l=>l.c&&l.p.length>2).length;
  if(wrap){q('#p3dxfInfo').textContent=lines.length?`${name}: ${lines.length} ta kontur, ${closed} tasi yopiq (panelga aylantirish mumkin). Birlik: mm.`:`${name}: kontur topilmadi.`;
    q('#p3bDxfP').hidden=!closed;q('#p3bDxfC').hidden=!lines.length}
  markDirty()}
function drawLines(){
  if(!inited)return;if(Dg){scene.remove(Dg);Dg.geometry.dispose();Dg=null}
  if(!lines.length){dirtyR=true;return}
  const v=[];for(const l of lines){const a=l.p,n=a.length+(l.c?1:0);for(let i=0;i<n-1;i++){const s=a[i],e=a[(i+1)%a.length];if(planeMode==='plan')v.push(s[0],0,-s[1],e[0],0,-e[1]);else v.push(s[0],s[1],0,e[0],e[1],0)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  Dg=new THREE.LineSegments(g,dxfMat);scene.add(Dg);dirtyR=true}
function fromDrawing(){
  if(typeof buildDXF!=='function'){return}
  let t='';try{t=buildDXF()}catch(e){t=''}
  const polys=parseDXF(t||'');
  // Panel Types: har bir fragment konturining darajasi (Depth / Z) 3D ga o'tadi
  const lv=(typeof drawnLines!=='undefined'?drawnLines:[]).filter(s=>s.ptz&&s.points&&s.points.length).map(s=>{const X=s.points.map(p=>p.x),Y=s.points.map(p=>p.y);return{b:[Math.min(...X),Math.min(...Y),Math.max(...X),Math.max(...Y)],z:+s.ptz}});
  if(lv.length)for(const pl of polys){const X=pl.p.map(a=>a[0]),Y=pl.p.map(a=>a[1]),b=[Math.min(...X),Math.min(...Y),Math.max(...X),Math.max(...Y)];
    const k=lv.findIndex(o=>o.b.every((v,i)=>Math.abs(v-b[i])<1e-3));if(k>=0){pl.z=lv[k].z;lv.splice(k,1)}}
  setLines(polys,'2D chizma');if(polys.length)frame()}
function isRectPoly(pts,x0,y0,x1,y1){   // eksen bo'ylab joylashgan to'rtburchakmi?
  const a=pts.filter((p,i)=>i===0||Math.hypot(p[0]-pts[i-1][0],p[1]-pts[i-1][1])>1e-6);
  if(a.length>1&&Math.hypot(a[0][0]-a[a.length-1][0],a[0][1]-a[a.length-1][1])<1e-6)a.pop();
  if(a.length!==4)return false;const e=1e-3,cs=new Set();
  for(const p of a){const cx=Math.abs(p[0]-x0)<e?0:Math.abs(p[0]-x1)<e?1:-1,cy=Math.abs(p[1]-y0)<e?0:Math.abs(p[1]-y1)<e?1:-1;if(cx<0||cy<0)return false;cs.add(cx+','+cy)}
  return cs.size===4}
function dxfToPanels(){   // yopiq konturlarni extrude qilib 3D panelga aylantiradi
  const D=Math.max(1,num(q('#p3dxD').value)||500),plan=planeMode==='plan',conv=new Set();let i=1,last=null;
  for(const l of lines){
    if(!l.c||l.circle||l.p.length<3)continue;
    const xs=l.p.map(a=>a[0]),ys=l.p.map(a=>a[1]),x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys),w=x1-x0,h=y1-y0;
    if(w<1||h<1)continue;
    const nm='Panel '+i++;conv.add(l);
    if(isRectPoly(l.p,x0,y0,x1,y1)){
      // to'rtburchak: eng kichik o'lcham panel qalinligi bo'ladi (masalan 16×500 kontur, 500 extrude -> 500×500×16 panel)
      const lz=+l.z||0,cx=x0+w/2,cy=y0+h/2,d=plan?[w,D,h]:[w,h,D],c=plan?[cx,lz+D/2,-cy]:[cx,cy,lz+D/2],th=d.indexOf(Math.min(...d));
      const o=th===0?'side':th===1?'flat':'front',dims=th===0?{w:d[2],h:d[1]}:th===1?{w:d[0],h:d[2]}:{w:d[0],h:d[1]};
      last=add({n:nm,w:dims.w,h:dims.h,t:d[th],o,x:c[0],y:c[1],z:c[2]})}
    else{
      const lz=+l.z||0,pts=l.p.map(a=>[a[0]-x0,a[1]-y0]),cx=x0+w/2,cy=y0+h/2;
      last=add(plan?{n:nm,w,h,t:D,bw:w,bh:h,pts,shape:'poly',o:'flat',x:cx,y:lz+D/2,z:-cy}:{n:nm,w,h,t:D,bw:w,bh:h,pts,shape:'poly',o:'front',x:cx,y:cy,z:lz+D/2})}}
  if(last){
    lines=lines.filter(l=>!conv.has(l));drawLines();   // aylangan konturlar chiziq sifatida qolmaydi (takroran aylantirmaslik uchun)
    q('#p3dxfInfo').textContent=`${conv.size} ta kontur panelga aylandi (extrude ${D} mm).`;
    q('#p3bDxfP').hidden=!lines.some(l=>l.c&&!l.circle);q('#p3bDxfC').hidden=!lines.length;
    select(last.id);frame();changed()}
  return conv.size}

/* ---------------- sichqoncha / klaviatura ---------------- */
const ray=new THREE.Raycaster(),m2=new THREE.Vector2();
function ndc(e){const r=cv.getBoundingClientRect();m2.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(m2,cam)}
function pick(e){
  ndc(e);const h=ray.intersectObjects(P.children,true).find(x=>{const pp=panels.find(a=>a.id===x.object.userData.pid);return pp&&!pp.hid}),hid=h?h.object.userData.pid:null;
  const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,pad=6;let thin=null,any=null;
  for(const p of panels){if(p.hid)continue;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const o of offs(extS(p),{end:true,mid:false,cen:false})){const v=new THREE.Vector3(p.x+o[0],p.y+o[1],p.z+o[2]).project(cam),sx=(v.x+1)/2*r.width,sy=(1-v.y)/2*r.height;x0=Math.min(x0,sx);y0=Math.min(y0,sy);x1=Math.max(x1,sx);y1=Math.max(y1,sy)}
    if(mx<x0-pad||mx>x1+pad||my<y0-pad||my>y1+pad)continue;
    const w=x1-x0,hh=y1-y0,area=(w+2*pad)*(hh+2*pad);
    if(Math.min(w,hh)<14&&(!thin||area<thin.area))thin={id:p.id,area};   // ingichka panel (qirrasi bilan ko'rinayotgan) tanlashga ustun
    if(!any||area<any.area)any={id:p.id,area}}
  return thin?thin.id:hid||(any?any.id:null)}
function drawPlane(p){p.g.updateMatrixWorld(true);return new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0,0,1).applyQuaternion(p.g.quaternion),p.g.position)}
function drawPt(e,p){ndc(e);const v=new THREE.Vector3();if(!ray.ray.intersectPlane(drawPlane(p),v))return null;const l=p.g.worldToLocal(v),st=num(q('#p3step').value),r=a=>st?Math.round(a/st)*st:a;return[r(l.x),r(l.y)]}
function drawShow(){const d=dr,a=d.pts.concat(d.cur?[d.cur]:[]);if(d.line)d.p.g.remove(d.line);
  d.line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(a.map(v=>new THREE.Vector3(v[0],v[1],d.p.t/2+.5))),selLine);d.p.g.add(d.line);dirtyR=true}
const HINT="Alt+chap yoki o'rta tugma: aylantirish · O'ng tugma: siljitish · G'ildirak: masshtab · V/M/R/S: asboblar · 2 marta bosing: shaklini chizish";
function startDraw(p){
  if(dr)endDraw();select(p.id);dr={p,pts:[],cur:null};
  cam=ocam;applyFlat();[az,el]=oriOf(p)==='front'?[0,0]:oriOf(p)==='side'?[Math.PI/2,0]:[0,Math.PI/2];vname=oriOf(p)==='front'?'front':oriOf(p)==='side'?'right':'top';tg.set(p.x,p.y,p.z);R=Math.max(p.w,p.h)*2.2;upd();
  q('#p3hint').textContent="Chizish: nuqtalarni bosing · boshlang'ich nuqtani bosing yoki Enter — yopish · Backspace — orqaga · Esc — bekor"}
function endDraw(){if(!dr)return;if(dr.line)dr.p.g.remove(dr.line);dr=null;q('#p3hint').textContent=HINT;dirtyR=true}
function finishDraw(){
  const d=dr,p=d.p;if(d.pts.length<3){endDraw();return}
  const xs=d.pts.map(a=>a[0]),ys=d.pts.map(a=>a[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  if(x1-x0<1||y1-y0<1){endDraw();return}
  const c=p.g.localToWorld(new THREE.Vector3((x0+x1)/2,(y0+y1)/2,0));
  p.pts=d.pts.map(a=>[a[0]-x0,a[1]-y0]);p.w=p.bw=x1-x0;p.h=p.bh=y1-y0;p.shape='poly';delete p.c;p.x=c.x;p.y=c.y;p.z=c.z;
  endDraw();build(p);props();list();changed()}
const viewOri=()=>vname==='left'||vname==='right'?'side':vname==='top'?'flat':'front';
const snapM={end:true,mid:true,cen:false};   // Endpoint/Vertex, Midpoint, Center
const offs=(e,m=snapM)=>{const nd=e.filter(v=>v>0).length,o=[],V=a=>e[a]>0?[-1,0,1]:[0];
  for(const i of V(0))for(const j of V(1))for(const k of V(2)){const n=(i?1:0)+(j?1:0)+(k?1:0),ok=n===nd?m.end:n===nd-1?m.mid:m.cen;
    if(ok)o.push([i*e[0]/2,j*e[1]/2,k*e[2]/2])}
  return o};
function hideSnap(){if(snapMark){snapMark.visible=false;dirtyR=true}}
// 2D (Top/Front/Left...) ko'rinishda ko'rish o'qi bo'yicha koordinata (daraja) magnit bilan o'zgarmasligi kerak:
// ekranda faqat tekislikdagi yopishish ko'rinadi, chuqurlik esa boshqa ko'rinishda kutilmagan joyga ketib qolardi.
const lockAx=()=>cam===ocam?viewAxis():-1;
function magnet(c,e,excl){const r=magnet3(c,e,excl),ax=lockAx();if(r&&ax>=0){const k=['x','y','z'][ax],dv=c[k]-r.c[k];r.c[k]=c[k];r.T=r.T.clone();r.T[k]+=dv}return r}
function magnet3(c,e,excl){const ex=Array.isArray(excl)?excl:[excl];
  const w=cv.clientWidth,h=cv.clientHeight,prj=v=>{const a=v.clone().project(cam);return[(a.x+1)/2*w,(1-a.y)/2*h]};
  const H=offs(e),hv=H.map(o=>new THREE.Vector3(c.x+o[0],c.y+o[1],c.z+o[2])),hs=hv.map(prj);let best=null;
  for(const p of panels){if(ex.includes(p)||p.hid)continue;
    for(const o of offs(extS(p))){const T=new THREE.Vector3(p.x+o[0],p.y+o[1],p.z+o[2]),ts=prj(T);
      for(let i=0;i<H.length;i++){const d=Math.hypot(ts[0]-hs[i][0],ts[1]-hs[i][1]);if(d>18)continue;
        const cost=d+.002*T.distanceTo(hv[i]);if(!best||cost<best.cost)best={cost,T,off:H[i]}}}}
  if(best)return{c:new THREE.Vector3(best.T.x-best.off[0],best.T.y-best.off[1],best.T.z-best.off[2]),T:best.T};
  if(!guides.length)return null;
  const f=cam.getWorldDirection(new THREE.Vector3());let bg=null;   // yordamchi chiziqqa yopishish (ko'rinish tekisligida)
  for(const g of guides){const G=new THREE.Vector3(...g.p),D=new THREE.Vector3();D.setComponent(g.a,1);
    for(let i=0;i<hv.length;i++){const w=G.clone().sub(hv[i]),dl=w.clone().sub(D.clone().multiplyScalar(w.dot(D)));dl.sub(f.clone().multiplyScalar(dl.dot(f)));
      const p2=prj(hv[i].clone().add(dl)),d=Math.hypot(p2[0]-hs[i][0],p2[1]-hs[i][1]);
      if(d<10&&(!bg||d<bg.d))bg={d,dl,T:hv[i].clone().add(dl)}}}
  return bg&&{c:c.clone().add(bg.dl),T:bg.T}}
function movePlace(e){
  ndc(e);const o=pm.o,nrm=o==='side'?new THREE.Vector3(1,0,0):o==='flat'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);
  const v=new THREE.Vector3();if(!ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(nrm,tg),v))return;
  const st=num(q('#p3step').value),r=a=>st?Math.round(a/st)*st:a;
  let c=new THREE.Vector3(o==='side'?tg.x:r(v.x),o==='flat'?tg.y:r(v.y),o==='front'?tg.z:r(v.z));
  let hit=null;
  if(mag){hit=magnet(c,extS({o,w:TPL[0].w,h:TPL[0].h,t:T,ry:0}),pm.p);if(hit)c=hit.c}
  if(snapMark){snapMark.visible=!!hit;if(hit)snapMark.position.copy(hit.T)}
  if(!pm.p){pm.p=add({n:'Panel',w:TPL[0].w,h:TPL[0].h,o,x:c.x,y:c.y,z:c.z});paint()}else{pm.p.x=c.x;pm.p.y=c.y;pm.p.z=c.z;place(pm.p)}
  dirtyR=true}
const TOOLH={edge:"Kromka: panel qirrasiga olib boring (moviy chiziq) va bosing — kromka qo'yiladi/olinadi. Qalinlik: Panel ▸ Kromka",stretch:"Stretch: burchak nuqtalarini ramka bilan (yoki bosib, Shift — qo'shish) belgilang, so'ng nuqtani sudrang yoki pastdagi X/Y/Z masofani kiriting. Panel tanlangan bo'lsa faqat shularning nuqtalari",ruler:"Lineyka: ikki nuqtani bosing (magnit uchlar/o'rta nuqta/markazga yopishadi). Esc — tozalash",guide:"Yordamchi chiziq: nuqtani bosing — ekrandagi gorizontal o'q bo'ylab chiziq (Shift — vertikal). Magnit shu chiziqqa yopishadi",select:"Tanlash: panelga bosing yoki bo'sh joyda ramka torting (chapdan o'ngga — to'liq ichida, o'ngdan chapga — tegib o'tgan). Shift — qo'shish",move:"Ko'chirish: strelkalarni yoki panelni sudrang (Ortho/Free, magnit ishlaydi). Tanlanganlar birga siljiydi",rotate:"Aylantirish: halqani sudrang (90° qadam) yoki panelga bosing — ko'rinish o'qi atrofida 90° (Shift — teskari)",scale:"Masshtab: o'q uchidagi kubni (bitta yo'nalish) yoki markaziy sariq kubni (hamma yo'nalish) sudrang. Qalinlik o'zgarmaydi"};
function setTool(t){tool=t;[['Sel','select'],['Mov','move'],['Rot','rotate'],['Scl','scale'],['Str','stretch'],['Edg','edge']].forEach(([i,n])=>q('#p3t'+i).classList.toggle('on',n===t));q('#p3mkRul').classList.toggle('on',t==='ruler');q('#p3mkGd').classList.toggle('on',t==='guide');if(t!=='ruler')clearRuler();if(t!=='edge')edgeClear();if(!pm&&!dr)q('#p3hint').textContent=TOOLH[t];dirtyR=true}
const viewAxis=()=>vname==='front'||vname==='back'?2:vname==='left'||vname==='right'?0:1;
function screenBox(p){const r=cv.getBoundingClientRect();let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const o of offs(ext(p),{end:true,mid:false,cen:false})){const v=new THREE.Vector3(p.x+o[0],p.y+o[1],p.z+o[2]).project(cam),sx=(v.x+1)/2*r.width,sy=(1-v.y)/2*r.height;x0=Math.min(x0,sx);y0=Math.min(y0,sy);x1=Math.max(x1,sx);y1=Math.max(y1,sy)}
  return[x0,y0,x1,y1]}
function drawRect(){const a=act,vr=q('.p3view').getBoundingClientRect(),d=q('#p3rect');d.hidden=false;
  d.style.cssText=`left:${Math.min(a.x0,a.x)-vr.left}px;top:${Math.min(a.y0,a.y)-vr.top}px;width:${Math.abs(a.x-a.x0)}px;height:${Math.abs(a.y-a.y0)}px;border-style:${a.x<a.x0?'dashed':'solid'}`}
function finishRect(){
  const a=act;q('#p3rect').hidden=true;
  if(a.v){finishVRect(a);return}
  if(a.moved<4){if(!a.add)clearSel();return}
  const vr=q('.p3view').getBoundingClientRect(),X0=Math.min(a.x0,a.x)-vr.left,X1=Math.max(a.x0,a.x)-vr.left,Y0=Math.min(a.y0,a.y)-vr.top,Y1=Math.max(a.y0,a.y)-vr.top,crossing=a.x<a.x0,ids=[];
  for(const p of panels){if(p.hid)continue;const b=screenBox(p),inside=b[0]>=X0&&b[2]<=X1&&b[1]>=Y0&&b[3]<=Y1,hit=!(b[2]<X0||b[0]>X1||b[3]<Y0||b[1]>Y1);if(crossing?hit:inside)ids.push(p.id)}
  msel=a.add?[...new Set([...msel,...ids])]:ids;sel=msel.length?msel[msel.length-1]:null;paint();props();list()}
function startScale(e,g){
  const ps=selected();if(!ps.length)return;const[mn,mx]=bboxOf(ps);
  act={k:'scale',g,x0:e.clientX,y0:e.clientY,ax:-1,cen:[0,1,2].map(a=>(mn[a]+mx[a])/2),base:ps.map(p=>({p,w:p.w,h:p.h,x:p.x,y:p.y,z:p.z}))}}
function scaleMove(e){
  const dx=e.clientX-act.x0,dy=e.clientY-act.y0,st=num(q('#p3step').value),rs=v=>st?Math.max(st,Math.round(v/st)*st):Math.max(1,v);
  let sa=[1,1,1],s;
  if(act.g!==undefined){   // masshtab gizmosi: o'q (bitta yo'nalish) yoki markaziy kub (hamma yo'nalish)
    if(act.g===3){s=Math.exp((dx-dy)*.003);sa=[s,s,s]}
    else{const r=cv.getBoundingClientRect(),c=new THREE.Vector3(...act.cen),A=new THREE.Vector3();A.setComponent(act.g,1);
      const p0=c.clone().project(cam),p1=c.clone().add(A).project(cam),vx=(p1.x-p0.x)*r.width,vy=-(p1.y-p0.y)*r.height,L=Math.hypot(vx,vy);
      if(L<1e-6)return;s=Math.exp((dx*vx+dy*vy)/L*.004);sa[act.g]=s}}
  else{
    const ri=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0).toArray().map(Math.abs),up=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1).toArray().map(Math.abs);
    if(ortho){if(act.ax<0){if(Math.hypot(dx,dy)<8)return;act.ax=Math.abs(dx)>=Math.abs(dy)?ri.indexOf(Math.max(...ri)):up.indexOf(Math.max(...up));act.hor=Math.abs(dx)>=Math.abs(dy)}
      s=Math.exp((act.hor?dx:-dy)*.004);sa[act.ax]=s}
    else{s=Math.exp(dx*.004);sa=[s,s,s]}}
  for(const b of act.base){const p=b.p,K=KEY(p);
    for(let a=0;a<3;a++){const pk=['x','y','z'][a];p[pk]=act.cen[a]+(b[pk]-act.cen[a])*sa[a];
      if(K[a]!=='t')p[K[a]]=rs(b[K[a]]*sa[a])}
    build(p)}
  {const cc=cur();if(cc)syncPos(cc)}props_dims();dirtyR=true}
function props_dims(){const p=cur();if(!p)return;for(const k of['w','h']){const i=q('#p3f_'+k);if(i)i.value=+p[k].toFixed(2)}}
function buildGizmo(){
  gz=new THREE.Group();const cols=[0xff5555,0x55dd77,0x5599ff];
  for(let a=0;a<3;a++){const g=new THREE.Group(),mat=new THREE.MeshBasicMaterial({color:cols[a],depthTest:false,transparent:true});
    const sh=new THREE.Mesh(new THREE.CylinderGeometry(3,3,80,8),mat),co=new THREE.Mesh(new THREE.ConeGeometry(9,28,12),mat),hit=new THREE.Mesh(new THREE.CylinderGeometry(16,16,130,6),new THREE.MeshBasicMaterial({visible:false}));
    sh.position.y=40;co.position.y=94;hit.position.y=65;[sh,co,hit].forEach(m=>{m.renderOrder=998;m.userData.ax=a});g.add(sh,co,hit);
    if(a===0)g.rotation.z=-Math.PI/2;else if(a===2)g.rotation.x=Math.PI/2;gz.add(g)}
  gz.visible=false;scene.add(gz);
  const orient=(g,a)=>{if(a===0)g.rotation.z=-Math.PI/2;else if(a===2)g.rotation.x=Math.PI/2};
  const inv=()=>new THREE.MeshBasicMaterial({visible:false}),mk=c=>new THREE.MeshBasicMaterial({color:c,depthTest:false,transparent:true});
  gzR=new THREE.Group();gzS=new THREE.Group();
  for(let a=0;a<3;a++){
    const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(80,2.6,8,56),mk(cols[a])),hit=new THREE.Mesh(new THREE.TorusGeometry(80,11,6,28),inv());   // aylantirish halqalari
    [ring,hit].forEach(m=>{m.renderOrder=998;m.userData.ax=a});g.add(ring,hit);
    if(a===0)g.rotation.y=Math.PI/2;else if(a===1)g.rotation.x=-Math.PI/2;gzR.add(g);
    const h=new THREE.Group(),sh=new THREE.Mesh(new THREE.CylinderGeometry(3,3,80,8),mk(cols[a])),cu=new THREE.Mesh(new THREE.BoxGeometry(18,18,18),mk(cols[a])),ht=new THREE.Mesh(new THREE.CylinderGeometry(16,16,130,6),inv());   // masshtab: o'q + kub
    sh.position.y=40;cu.position.y=92;ht.position.y=65;[sh,cu,ht].forEach(m=>{m.renderOrder=998;m.userData.ax=a});h.add(sh,cu,ht);orient(h,a);gzS.add(h)}
  const cc=new THREE.Mesh(new THREE.BoxGeometry(26,26,26),mk(0xffd24d)),ch=new THREE.Mesh(new THREE.BoxGeometry(40,40,40),inv());[cc,ch].forEach(m=>{m.renderOrder=999;m.userData.ax=3});gzS.add(cc,ch);
  gzR.visible=gzS.visible=false;scene.add(gzR,gzS)}
const activeGizmo=()=>{const g=tool==='move'?gz:tool==='rotate'?gzR:tool==='scale'?gzS:null;return g&&g.visible?g:null};
function updateGizmo(){
  if(!gz)return;for(const g of[gz,gzR,gzS])g.visible=false;
  const g=tool==='move'?gz:tool==='rotate'?gzR:tool==='scale'?gzS:null,ps=selected();   // Tanlash asbobida gizmo yo'q (3ds Max kabi)
  if(!g||!ps.length||dr||pm)return;g.visible=true;
  const[mn,mx]=bboxOf(ps);g.position.set((mn[0]+mx[0])/2,(mn[1]+mx[1])/2,(mn[2]+mx[2])/2);g.scale.setScalar(R*.0016)}
function axisT(C0,A){const O=ray.ray.origin,D=ray.ray.direction,w=C0.clone().sub(O),b=A.dot(D),d=A.dot(w),e=D.dot(w),den=1-b*b;return den<1e-6?null:(b*e-d)/den}
function startGizmo(e,ax){
  const ps=selected(),A=new THREE.Vector3();A.setComponent(ax,1);ndc(e);const C0=gz.position.clone(),t0=axisT(C0,A);if(t0==null)return;
  act={k:'gizmo',ax,A,C0,t0,base:ps.map(p=>({p,x:p.x,y:p.y,z:p.z}))}}
function gizmoMove(e){
  ndc(e);const t=axisT(act.C0,act.A);if(t==null)return;let d=t-act.t0;const st=num(q('#p3step').value);if(st)d=Math.round(d/st)*st;
  const pk=['x','y','z'][act.ax];for(const b of act.base)b.p[pk]=b[pk]+d;
  let hit=null;
  if(mag){const p=act.base[0].p,c0=new THREE.Vector3(p.x,p.y,p.z);hit=magnet(c0,extS(p),act.base.map(b=>b.p));
    if(hit){const dd=hit.c.clone().sub(c0);dd.setComponent(act.ax,0);if(dd.length()>.5)hit=null}
    if(hit){const ad=hit.c[pk]-p[pk];for(const b of act.base)b.p[pk]+=ad}}
  if(snapMark){snapMark.visible=!!hit;if(hit)snapMark.position.copy(hit.T)}
  for(const b of act.base)place(b.p);{const cc=cur();if(cc)syncPos(cc)}dirtyR=true}
function startRotG(e,ax){
  const ps=selected();if(!ps.length)return;const r=cv.getBoundingClientRect(),c=gzR.position.clone(),pr=c.clone().project(cam),
    cx=r.left+(pr.x+1)/2*r.width,cy=r.top+(1-pr.y)/2*r.height,A=new THREE.Vector3();A.setComponent(ax,1);
  act={k:'rotg',ax,cx,cy,facing:A.dot(cam.position.clone().sub(c))>=0?1:-1,a:Math.atan2(-(e.clientY-cy),e.clientX-cx),acc:0}}
function rotgMove(e){
  const ang=Math.atan2(-(e.clientY-act.cy),e.clientX-act.cx);let d=ang-act.a;
  while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;act.a=ang;act.acc+=d;
  while(Math.abs(act.acc)>=Math.PI/4){const sg=Math.sign(act.acc);rotateSel(selected(),act.ax,sg*act.facing);act.acc-=sg*Math.PI/2}}   // 90° qadam
function applyVis(){for(const p of panels)if(p.g)p.g.visible=!p.hid;dirtyR=true}
function hideSel(){const ps=selected();if(!ps.length)return;ps.forEach(p=>{p.hid=true});msel=[];sel=null;applyVis();paint();props();list();changed()}
function isolateSel(){if(!selected().length)return;panels.forEach(p=>{p.hid=!msel.includes(p.id)});applyVis();paint();list();changed()}
function unhideAll(){if(!panels.some(p=>p.hid))return;panels.forEach(p=>{delete p.hid});applyVis();list();changed()}
function toggleWire(){wire=!wire;modeMat();viewMenuSync()}
function setWire(v){wire=!!v;modeMat();viewMenuSync()}
function toggleThick(){thick2d=!thick2d;applyFlat();viewMenuSync()}
function viewMenuSync(){if(!wrap)return;q('#p3vmSolid').classList.toggle('chk',!wire);q('#p3vmWire').classList.toggle('chk',wire);q('#p3vmThick').classList.toggle('chk',thick2d);q('#p3vmGrain').classList.toggle('chk',showGrain)}
function menuSync(){
  viewMenuSync();
  q('#p3mkMag').classList.toggle('chk',mag);qa('[data-snap]').forEach(b=>b.classList.toggle('chk',!!snapM[b.dataset.snap]));
  const p=cur();qa('[data-shape]').forEach(b=>b.classList.toggle('chk',!!p&&shapeOf(p)===b.dataset.shape));pmFill()}
function pmFill(){if(!wrap)return;const sp=selected(),ps=sp.length?sp:(cur()?[cur()]:[]);
  for(const k of['n','w','h','t','q']){const i=q('#p3pm_'+k);if(!i||document.activeElement===i)continue;i.disabled=!ps.length;
    const vals=ps.map(p=>k==='n'?p.n:k==='q'?(p.q||1):+p[k].toFixed(2)),same=vals.length&&vals.every(v=>v===vals[0]);
    i.value=same?vals[0]:'';i.placeholder=ps.length>1&&!same?'turli':''}
  const h=q('#p3pmHead');if(h)h.textContent=ps.length>1?`Tanlangan: ${ps.length} ta panel (hammasiga)`:'Tanlangan panel'}
function setProp(k,v){const sp=selected(),ps=sp.length?sp:(cur()?[cur()]:[]);if(!ps.length)return;if(k!=='n'&&!(num(v)>0))return;for(const p of ps){if(k==='n')p.n=v;else if(k==='q')p.q=Math.max(1,Math.round(num(v))||1);else{p[k]=Math.max(k==='t'?.1:1,num(v)||1);build(p)}}paint();props();list();changed()}
function setShape(v){const ps=selected();if(!ps.length)return;for(const p of ps){delete p.pts;delete p.eb;p.shape=v;if((v==='L'||v==='U')&&!p.c)p.c=100;build(p)}props();list();changed()}
function clonePanel(p){const c=Object.assign({},p,{g:null,id:uid++});delete c.hid;if(p.pts)c.pts=p.pts.map(a=>a.slice());if(p.m)c.m=p.m.slice();return c}
function copySel(){const ps=selected();if(!ps.length)return;const ids=[];
  for(const p of ps){const c=clonePanel(p);c.x+=50;panels.push(c);build(c);ids.push(c.id)}
  msel=ids;sel=ids[ids.length-1];paint();props();list();setTool('move');changed()}
function mirrorSel(a){   // nusxa: tekislik — butun model markazi (hammasi tanlangan bo'lsa — tashqi yuzasi)
  const ps=selected();if(!ps.length)return;const[mn,mx]=bbox(),[sn,sx]=bboxOf(ps);let plane=(mn[a]+mx[a])/2;
  if(sn[a]<=mn[a]+1e-6&&sx[a]>=mx[a]-1e-6)plane=sx[a];
  const pk=['x','y','z'][a],ids=[];
  for(const p of ps){const c=clonePanel(p);c[pk]=2*plane-p[pk];const k=KEY(p)[a];
    if(k!=='t'&&c.eb&&!c.pts&&c.eb.length===4&&(!c.shape||c.shape==='rect')&&!c.c){const e=c.eb;c.eb=k==='w'?[e[0],e[3],e[2],e[1]]:[e[2],e[1],e[0],e[3]]}   // oddiy to'rtburchak: aks etganda chap/o'ng yoki past/yuqori almashadi
    if(k!=='t'){if(!c.pts&&(c.shape&&c.shape!=='rect'||c.c)){c.pts=prof(p);c.bw=p.w;c.bh=p.h;delete c.c;c.shape='poly'}
      if(c.pts)c.pts=k==='w'?c.pts.map(v=>[c.bw-v[0],v[1]]):c.pts.map(v=>[v[0],c.bh-v[1]])}
    panels.push(c);build(c);ids.push(c.id)}
  msel=ids;sel=ids[ids.length-1];paint();props();list();changed()}
/* --- lineyka va yordamchi chiziqlar --- */
function pickPoint(e){
  const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null;
  if(mag)for(const p of panels){if(p.hid)continue;for(const o of offs(extS(p))){const T=new THREE.Vector3(p.x+o[0],p.y+o[1],p.z+o[2]),v=T.clone().project(cam),d=Math.hypot((v.x+1)/2*r.width-mx,(1-v.y)/2*r.height-my);if(d<14&&(!best||d<best.d))best={d,T}}}
  if(best)return best.T;
  ndc(e);const v=new THREE.Vector3();return ray.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(cam.getWorldDirection(new THREE.Vector3()),tg),v)?v:null}
function rulerDraw(){
  if(!ruler)return;const B=ruler.B||ruler.cur;if(ruler.line){scene.remove(ruler.line);ruler.line.geometry.dispose()}
  ruler.line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([ruler.A,B]),rulerMat);ruler.line.renderOrder=997;scene.add(ruler.line);
  const d=B.clone().sub(ruler.A),l=q('#p3rul');l.textContent=`${d.length().toFixed(1)} mm  (Δx ${d.x.toFixed(1)}, Δy ${d.y.toFixed(1)}, Δz ${d.z.toFixed(1)})`;l.hidden=false;rulerLabel();dirtyR=true}
function rulerLabel(){if(!ruler)return;const r=cv.getBoundingClientRect(),m=ruler.A.clone().add(ruler.B||ruler.cur).multiplyScalar(.5).project(cam),l=q('#p3rul');
  l.style.left=(m.x+1)/2*r.width+'px';l.style.top=(1-m.y)/2*r.height+'px'}
function clearRuler(){if(!ruler)return;if(ruler.line){scene.remove(ruler.line);ruler.line.geometry.dispose()}ruler=null;if(wrap)q('#p3rul').hidden=true;dirtyR=true}
function rulerClick(e){const a=pickPoint(e);if(!a)return;if(!ruler||ruler.B){clearRuler();ruler={A:a,B:null,cur:a.clone()}}else ruler.B=a;rulerDraw()}
function rulerMove(e){if(!ruler||ruler.B)return;const a=pickPoint(e);if(a){ruler.cur=a;rulerDraw()}}
function drawGuides(){
  if(!Gg)return;for(const c of[...Gg.children]){Gg.remove(c);c.geometry.dispose()}
  for(const g of guides){const a=new THREE.Vector3(...g.p),b=a.clone(),c=a.clone();b.setComponent(g.a,a.getComponent(g.a)-20000);c.setComponent(g.a,a.getComponent(g.a)+20000);
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([b,c]),new THREE.LineDashedMaterial({color:0x5ee1ff,dashSize:30,gapSize:20,depthTest:false,transparent:true,opacity:.75}));l.computeLineDistances();l.renderOrder=996;Gg.add(l)}
  dirtyR=true}
function addGuide(e){
  const a=pickPoint(e);if(!a)return;
  const ri=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0).toArray().map(Math.abs),up=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1).toArray().map(Math.abs),v=e.shiftKey?up:ri;
  guides.push({p:a.toArray().map(x=>+x.toFixed(2)),a:v.indexOf(Math.max(...v))});drawGuides();markDirty()}
let navPts=[];
function navDraw(){
  const c=q('#p3nav');if(!c||!cam)return;cam.updateMatrixWorld();const x=c.getContext('2d'),S=c.width,C=S/2,L=S*.33;x.clearRect(0,0,S,S);
  const r=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0),u=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1),f=cam.getWorldDirection(new THREE.Vector3());
  const ax=[['X',[1,0,0],'#ff5555',['right','left']],['Y',[0,1,0],'#55dd77',['top','bottom']],['Z',[0,0,1],'#5599ff',['front','back']]],pts=[];
  for(const[n,v,col,keys]of ax)for(const sg of[1,-1]){const a=new THREE.Vector3(...v).multiplyScalar(sg);pts.push({n,sg,col,x:C+a.dot(r)*L,y:C-a.dot(u)*L,d:a.dot(f),key:keys[sg>0?0:1]})}
  navPts=pts;pts.sort((a,b)=>b.d-a.d);
  x.fillStyle='rgba(120,140,170,.14)';x.beginPath();x.arc(C,C,S*.47,0,7);x.fill();
  x.font='bold 22px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';
  for(const p of pts){
    if(p.sg>0){x.strokeStyle=p.col;x.lineWidth=5;x.beginPath();x.moveTo(C,C);x.lineTo(p.x,p.y);x.stroke()}
    x.beginPath();x.arc(p.x,p.y,p.sg>0?17:12,0,7);x.fillStyle=p.sg>0?p.col:'rgba(20,30,50,.75)';x.fill();
    x.lineWidth=p.key===vname?4:2;x.strokeStyle=p.key===vname?'#fff':p.col;x.stroke();
    if(p.sg>0){x.fillStyle='#0b1220';x.fillText(p.n,p.x,p.y+1)}}}
function navClick(e){
  const c=q('#p3nav'),r=c.getBoundingClientRect(),k=c.width/r.width,mx=(e.clientX-r.left)*k,my=(e.clientY-r.top)*k;let best=null;
  for(const p of navPts){const d=Math.hypot(p.x-mx,p.y-my);if(d<(p.sg>0?22:16)&&(!best||p.d<best.d))best=p}   // old tomondagisi ustun
  if(best)setView(best.key)}
/* --- Stretch: burchak nuqtalarini belgilab masofaga surish --- */
function stretchCands(){
  const ps=(msel.length?selected():panels).filter(p=>!p.hid&&p.g),out=[];
  for(const p of ps){p.g.updateMatrixWorld(true);prof(p).forEach((a,i)=>out.push({p,i,key:p.id+':'+i,w:p.g.localToWorld(new THREE.Vector3(a[0]-p.w/2,a[1]-p.h/2,0))}))}
  return out}
function stretchHandles(){
  if(vH){scene.remove(vH);vH.children.forEach(c=>c.geometry.dispose());vH=null}
  const bar=q('#p3sd');
  if(tool!=='stretch'||!inited){if(bar)bar.hidden=true;return}
  const cs=stretchCands(),keys=new Set(cs.map(c=>c.key));for(const k of[...vsel])if(!keys.has(k))vsel.delete(k);
  const g1=[],g2=[];for(const c of cs)(vsel.has(c.key)?g2:g1).push(c.w.x,c.w.y,c.w.z);
  vH=new THREE.Group();
  const mk=(arr,col,size)=>{if(!arr.length)return;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
    const pt=new THREE.Points(g,new THREE.PointsMaterial({color:col,size,sizeAttenuation:false,depthTest:false,transparent:true}));pt.renderOrder=999;vH.add(pt)};
  mk(g1,0xaab4c8,8);mk(g2,0xffb454,13);scene.add(vH);
  bar.hidden=!vsel.size;q('#p3sdn').textContent=vsel.size}
function stretchPick(e){
  const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null;
  for(const c of stretchCands()){const v=c.w.clone().project(cam),d=Math.hypot((v.x+1)/2*r.width-mx,(1-v.y)/2*r.height-my);if(d<12&&(!best||d<best.d))best={c,d}}
  return best&&best.c}
function snapBase(p){return{p,w:p.w,h:p.h,x:p.x,y:p.y,z:p.z,shape:p.shape,c:p.c,bw:p.bw,bh:p.bh,pts:p.pts?p.pts.map(a=>a.slice()):null}}
function restoreBase(b){const p=b.p;p.w=b.w;p.h=b.h;p.x=b.x;p.y=b.y;p.z=b.z;p.shape=b.shape;p.c=b.c;p.bw=b.bw;p.bh=b.bh;p.pts=b.pts?b.pts.map(a=>a.slice()):null;
  if(p.shape===undefined)delete p.shape;if(p.c===undefined)delete p.c;if(p.bw===undefined)delete p.bw;if(p.bh===undefined)delete p.bh;if(!p.pts)delete p.pts}
function applyStretchD(b,keys,d){
  const p=b.p;restoreBase(b);
  const idx=keys.filter(k=>k.startsWith(p.id+':')).map(k=>+k.split(':')[1]);if(!idx.length){build(p);return}
  if(new Set(idx).size>=prof(p).length){p.x+=d.x;p.y+=d.y;p.z+=d.z;build(p);return}   // panelning hamma nuqtasi belgilangan: butun panel har qanday o'q bo'ylab (qalinlik o'qi ham) ko'chadi
  const m=Mof(p),dl=[0,1].map(l=>m[l]*d.x+m[3+l]*d.y+m[6+l]*d.z);   // dunyo siljishining panel tekisligidagi tashkil etuvchilari (qalinlik o'qi e'tiborga olinmaydi)
  let pts=prof(p);for(const i of idx)pts[i]=[pts[i][0]+dl[0],pts[i][1]+dl[1]];
  const xs=pts.map(a=>a[0]),ys=pts.map(a=>a[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
  if(x1-x0<1||y1-y0<1){restoreBase(b);build(p);return}
  const W=x1-x0,H=y1-y0,ox=(x0+x1)/2-p.w/2,oy=(y0+y1)/2-p.h/2;pts=pts.map(a=>[a[0]-x0,a[1]-y0]);
  p.x+=m[0]*ox+m[1]*oy;p.y+=m[3]*ox+m[4]*oy;p.z+=m[6]*ox+m[7]*oy;
  p.w=p.bw=W;p.h=p.bh=H;delete p.c;
  if(isRectPoly(pts,0,0,W,H)){delete p.pts;p.shape='rect'}else{p.pts=pts;p.shape='poly'}
  build(p)}
function nearestTarget(V,excl){
  const r=cv.getBoundingClientRect(),pv=V.clone().project(cam),sx=(pv.x+1)/2*r.width,sy=(1-pv.y)/2*r.height;let best=null;
  for(const p of panels){if(p.hid||excl.has(p.id))continue;for(const o of offs(extS(p))){const T=new THREE.Vector3(p.x+o[0],p.y+o[1],p.z+o[2]),v=T.clone().project(cam),d=Math.hypot((v.x+1)/2*r.width-sx,(1-v.y)/2*r.height-sy);if(d<14&&(!best||d<best.d))best={d,T}}}
  return best&&best.T}
function startStretch(e){
  const sel=stretchCands().filter(c=>vsel.has(c.key));if(!sel.length)return;
  const ids=[...new Set(sel.map(c=>c.p.id))],cen=sel.reduce((a,c)=>a.add(c.w),new THREE.Vector3()).multiplyScalar(1/sel.length);
  const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(cam.getWorldDirection(new THREE.Vector3()),cen),pt=new THREE.Vector3();ndc(e);ray.ray.intersectPlane(pl,pt);
  act={k:'stretch',bases:ids.map(id=>snapBase(panels.find(a=>a.id===id))),vs:[...vsel],pl,pt,ax:-1,first:sel[0].w.clone()}}
function stretchMove(e){
  ndc(e);const v=new THREE.Vector3();if(!ray.ray.intersectPlane(act.pl,v))return;const d=v.sub(act.pt),st=num(q('#p3step').value),rs=x=>st?Math.round(x/st)*st:x;
  if(ortho){const a=[d.x,d.y,d.z].map(Math.abs);if(act.ax<0){if(Math.hypot(d.x,d.y,d.z)<8)return;act.ax=a.indexOf(Math.max(...a))}for(let i=0;i<3;i++)if(i!==act.ax)d.setComponent(i,0)}
  d.set(rs(d.x),rs(d.y),rs(d.z));
  let hit=null;if(mag){const V=act.first.clone().add(d);hit=nearestTarget(V,new Set(act.bases.map(b=>b.p.id)));if(hit){const sh=hit.clone().sub(V),ax=lockAx();if(ax>=0){sh.setComponent(ax,0);hit=V.clone().add(sh)}d.add(sh)}}
  if(snapMark){snapMark.visible=!!hit;if(hit)snapMark.position.copy(hit)}
  for(const b of act.bases)applyStretchD(b,act.vs,d);dirtyR=true}
function stretchEnd(){hideSnap();vsel.clear();props();list();changed()}
function stretchNumeric(){
  const d=new THREE.Vector3(num(q('#p3sdx').value),num(q('#p3sdy').value),num(q('#p3sdz').value));
  const sel=stretchCands().filter(c=>vsel.has(c.key));if(!sel.length||(!d.x&&!d.y&&!d.z))return;
  const ids=[...new Set(sel.map(c=>c.p.id))],keys=[...vsel];
  for(const id of ids)applyStretchD(snapBase(panels.find(a=>a.id===id)),keys,d);
  vsel.clear();props();list();changed()}
function finishVRect(a){
  if(a.moved<4){if(!a.add)vsel.clear();dirtyR=true;return}
  const r=cv.getBoundingClientRect(),X0=Math.min(a.x0,a.x)-r.left,X1=Math.max(a.x0,a.x)-r.left,Y0=Math.min(a.y0,a.y)-r.top,Y1=Math.max(a.y0,a.y)-r.top,ns=a.add?new Set(vsel):new Set();
  for(const c of stretchCands()){const v=c.w.clone().project(cam),sx=(v.x+1)/2*r.width,sy=(1-v.y)/2*r.height;if(sx>=X0&&sx<=X1&&sy>=Y0&&sy<=Y1)ns.add(c.key)}
  vsel=ns;dirtyR=true}
/* --- OBJ eksport/import (Blender, mijozga ko'rsatish) va list hisobi --- */
function say(m){try{if(typeof setHint==='function')setHint(m)}catch(e){}if(wrap){const h=q('#p3hint');if(h)h.textContent=m}}
function objText(unit){   // unit: 0.001 = metr (Blender standarti), 1 = mm. Y — yuqoriga (Blender importida standart o'qlar)
  const out=['# Rugby 1.1.2 — Panel 3D eksport','# birlik: '+(unit===1?'mm':'metr')+'; o\'qlar: Y yuqoriga'];let base=0;
  for(const p of panels){
    if(p.hid)continue;
    const sh=new THREE.Shape(prof(p).map(a=>new THREE.Vector2(a[0]-p.w/2,a[1]-p.h/2))),geo=new THREE.ExtrudeGeometry(sh,{depth:p.t,bevelEnabled:false});
    geo.translate(0,0,-p.t/2);const m=Mof(p);geo.applyMatrix4(new THREE.Matrix4().set(m[0],m[1],m[2],p.x,m[3],m[4],m[5],p.y,m[6],m[7],m[8],p.z,0,0,0,1));
    const pos=geo.attributes.position,idx=new Map(),verts=[],faces=[];
    for(let i=0;i<pos.count;i+=3){const f=[];
      for(let k=0;k<3;k++){const x=pos.getX(i+k)*unit,y=pos.getY(i+k)*unit,z=pos.getZ(i+k)*unit,key=x.toFixed(6)+','+y.toFixed(6)+','+z.toFixed(6);
        let id=idx.get(key);if(id===undefined){id=verts.length+1;idx.set(key,id);verts.push([x,y,z])}f.push(id)}
      if(f[0]!==f[1]&&f[1]!==f[2]&&f[0]!==f[2])faces.push(f)}
    geo.dispose();
    out.push('o '+String(p.n).replace(/\s+/g,'_')+'_'+p.id);
    for(const v of verts)out.push('v '+v.map(x=>+x.toFixed(6)).join(' '));
    for(const f of faces)out.push('f '+f.map(i=>i+base).join(' '));
    base+=verts.length}
  return out.join('\n')+'\n'}
function exportOBJ(unit){
  if(!panels.some(p=>!p.hid)){say("OBJ eksport: panel yo'q");return}
  const text=objText(unit),name=unit===1?'rugby-panels-mm.obj':'rugby-panels.obj';
  try{if(typeof downloadFile==='function'){downloadFile(text,name,'text/plain');say(`OBJ eksport: ${name} (${panels.filter(p=>!p.hid).length} panel, ${unit===1?'mm':'metr'})`);return}}catch(e){}
  try{navigator.clipboard.writeText(text);say("OBJ matni nusxalandi")}catch(e){say("OBJ eksport bajarilmadi")}}
function parseOBJ(text){
  const V=[],objs=[];let cur=null;
  for(const raw of text.split(/\r?\n/)){const l=raw.trim();if(!l||l[0]==='#')continue;const t=l.split(/\s+/);
    if(t[0]==='v')V.push([+t[1],+t[2],+t[3]]);
    else if(t[0]==='o'||t[0]==='g'){cur={name:t.slice(1).join(' ')||'Obyekt',idx:new Set()};objs.push(cur)}
    else if(t[0]==='f'){if(!cur){cur={name:'Obyekt',idx:new Set()};objs.push(cur)}
      for(let i=1;i<t.length;i++){let k=parseInt(t[i].split('/')[0]);if(k<0)k=V.length+k+1;cur.idx.add(k-1)}}}
  return objs.filter(o=>o.idx.size).map(o=>({name:o.name,pts:[...o.idx].map(i=>V[i]).filter(Boolean)}))}
function objToPanels(objs){   // faqat quti (8 uchli) shakllar panelga aylanadi: eng kichik o'lcham qalinlik
  let made=0,skipped=0;if(!objs.length)return{made,skipped};
  const all=objs.flatMap(o=>o.pts),span=Math.max(...[0,1,2].map(a=>Math.max(...all.map(p=>p[a]))-Math.min(...all.map(p=>p[a])))),k=span>0&&span<30?1000:1;   // metrda bo'lsa mm ga o'tkaziladi
  for(const o of objs){
    const mn=[0,1,2].map(a=>Math.min(...o.pts.map(p=>p[a]))),mx=[0,1,2].map(a=>Math.max(...o.pts.map(p=>p[a]))),eps=1e-4*Math.max(1e-9,...mx.map((v,a)=>v-mn[a]));
    const uniq=new Set(o.pts.map(p=>p.map(v=>Math.round(v/eps)).join(',')));
    if(!(uniq.size===8&&o.pts.every(p=>[0,1,2].every(a=>Math.abs(p[a]-mn[a])<eps||Math.abs(p[a]-mx[a])<eps)))){skipped++;continue}
    const d=[0,1,2].map(a=>(mx[a]-mn[a])*k),c=[0,1,2].map(a=>(mx[a]+mn[a])/2*k),th=d.indexOf(Math.min(...d));
    if(!(d[th]>0)){skipped++;continue}
    const ori=th===0?'side':th===1?'flat':'front',dm=th===0?{w:d[2],h:d[1]}:th===1?{w:d[0],h:d[2]}:{w:d[0],h:d[1]};
    add({n:o.name.replace(/_\d+$/,'').replace(/_/g,' '),w:dm.w,h:dm.h,t:d[th],o:ori,x:c[0],y:c[1],z:c[2]});made++}
  return{made,skipped}}
function importOBJ(){
  if(!wrap)initUI();
  const i=document.createElement('input');i.type='file';i.accept='.obj';
  i.onchange=async()=>{const f=i.files[0];if(!f)return;const r=objToPanels(parseOBJ(await f.text()));
    if(r.made){list();props();if(inited)frame();changed()}
    say(r.made?`OBJ import: ${r.made} ta panel qo'shildi${r.skipped?`, ${r.skipped} ta quti bo'lmagan ob'ekt o'tkazib yuborildi`:''}`:"OBJ import: quti shaklidagi (panel) ob'ekt topilmadi")};
  i.click()}
function packSheets(items,SW,SH,K){   // MaxRects (best short side fit), aylantirish ruxsat; tola yo'nalishi hisobga olinmaydi
  const sheets=[],unfit=[],place=(sh,iw,ih,it)=>{
    let best=null;
    for(const f of sh.free)for(const rot of(it.rot===false?[0]:[0,1])){const w=rot?ih:iw,h=rot?iw:ih;if(w<=f.w&&h<=f.h){const s=Math.min(f.w-w,f.h-h),l=Math.max(f.w-w,f.h-h);if(!best||s<best.s||(s===best.s&&l<best.l))best={f,w,h,s,l}}}
    if(!best)return false;
    const px=best.f.x,py=best.f.y,pw=best.w,ph=best.h,nf=[];
    for(const f of sh.free){
      if(px>=f.x+f.w||px+pw<=f.x||py>=f.y+f.h||py+ph<=f.y){nf.push(f);continue}
      if(px>f.x)nf.push({x:f.x,y:f.y,w:px-f.x,h:f.h});
      if(px+pw<f.x+f.w)nf.push({x:px+pw,y:f.y,w:f.x+f.w-px-pw,h:f.h});
      if(py>f.y)nf.push({x:f.x,y:f.y,w:f.w,h:py-f.y});
      if(py+ph<f.y+f.h)nf.push({x:f.x,y:py+ph,w:f.w,h:f.y+f.h-py-ph})}
    sh.free=nf.filter((a,i)=>!nf.some((b,j)=>j!==i&&a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h&&(j<i||!(b.x===a.x&&b.y===a.y&&b.w===a.w&&b.h===a.h))));
    sh.area+=it.w*it.h;sh.n++;return true};
  const sorted=items.slice().sort((a,b)=>Math.max(b.w,b.h)-Math.max(a.w,a.h)||b.w*b.h-a.w*a.h);
  for(const it of sorted){
    const iw=it.w+K,ih=it.h+K;
    if(!((iw<=SW+K&&ih<=SH+K)||(it.rot!==false&&ih<=SW+K&&iw<=SH+K))){unfit.push(it);continue}
    let ok=false;for(const sh of sheets)if(place(sh,iw,ih,it)){ok=true;break}
    if(!ok){const sh={free:[{x:0,y:0,w:SW+K,h:SH+K}],area:0,n:0};sheets.push(sh);place(sh,iw,ih,it)}}
  return{sheets,unfit}}
/* --- Kromka (qirra lentasi) belgilash: qirrani bosing --- */
const ebT=()=>Math.max(.1,num(q('#p3ebT').value)||.4);
function segsOf(p){const pr=prof(p),c=pr.map(a=>[a[0]-p.w/2,a[1]-p.h/2]);return c.map((a,i)=>({i,a,b:c[(i+1)%c.length]}))}
function edgePick(e){
  const r=cv.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top;let best=null;
  const sc=v=>[(v.x+1)/2*r.width,(1-v.y)/2*r.height,v.z];
  for(const p of panels){if(p.hid||!p.g)continue;p.g.updateMatrixWorld(true);
    for(const sg of segsOf(p)){
      const A=sc(p.g.localToWorld(new THREE.Vector3(sg.a[0],sg.a[1],0)).project(cam)),B=sc(p.g.localToWorld(new THREE.Vector3(sg.b[0],sg.b[1],0)).project(cam));
      const dx=B[0]-A[0],dy=B[1]-A[1],l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((mx-A[0])*dx+(my-A[1])*dy)/l2)):0,d=Math.hypot(mx-(A[0]+dx*t),my-(A[1]+dy*t)),z=(A[2]+B[2])/2;
      if(d<14&&(!best||d<best.d-.5||(Math.abs(d-best.d)<=.5&&z<best.z)))best={p,i:sg.i,d,z,wa:p.g.localToWorld(new THREE.Vector3(sg.a[0],sg.a[1],0)),wb:p.g.localToWorld(new THREE.Vector3(sg.b[0],sg.b[1],0))}}}
  return best}
function edgeClear(){if(eHov){scene.remove(eHov);eHov.geometry.dispose();eHov=null;dirtyR=true}}
function edgeHover(e){
  const h=edgePick(e);edgeClear();if(!h)return;
  eHov=new THREE.Line(new THREE.BufferGeometry().setFromPoints([h.wa,h.wb]),new THREE.LineBasicMaterial({color:0x5ee1ff,depthTest:false,linewidth:2}));eHov.renderOrder=997;scene.add(eHov);dirtyR=true}
function edgeToggle(h){
  const p=h.p,n=prof(p).length,t=ebT();p.eb=(p.eb&&p.eb.length===n)?p.eb.slice():new Array(n).fill(0);
  p.eb[h.i]=p.eb[h.i]===t?0:t;if(!p.eb.some(v=>v>0))delete p.eb;
  build(p);edgeClear();props();list();changed()}
function toggleMag(){mag=!mag;const b=q('#p3bMag');if(b)b.classList.toggle('on',mag);if(!mag)hideSnap();
  q('#p3hint').textContent=mag?"Magnit yoqildi: panel burchak/o'rta nuqtalarga yopishadi (Probel — o'chirish)":"Magnit o'chirildi (Probel — yoqish)"}
function startPlace(){if(dr)endDraw();cancelPlace();if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();pm={o:viewOri(),p:null};q('#p3hint').textContent="Panel kursorda: joyiga bosib qo'ying · Probel — magnit · Esc — bekor";}
function cancelPlace(){hideSnap();if(!pm)return;if(pm.p)del(pm.p);pm=null;q('#p3hint').textContent=HINT}
function onDown(e){
  cv.setPointerCapture(e.pointerId);
  if(pm&&e.button===0&&!e.shiftKey){if(!pm.p)movePlace(e);const p=pm.p;pm=null;hideSnap();q('#p3hint').textContent=HINT;if(p){select(p.id);changed()}return}
  if(dr&&e.button===0&&!e.shiftKey){const a=drawPt(e,dr.p);if(!a)return;const f=dr.pts[0];
    if(f&&dr.pts.length>2&&Math.hypot(a[0]-f[0],a[1]-f[1])<R*.02)finishDraw();else{dr.pts.push(a);drawShow()}return}
  const cx=e.clientX,cy=e.clientY;
  if(e.button===1||(e.button===0&&e.altKey)){act={k:'orbit',x:cx,y:cy,moved:0};return}
  if(e.button===2||dr){act={k:'pan',x:cx,y:cy,moved:0};return}
  if(e.button===0&&tool==='ruler'){rulerClick(e);return}
  if(e.button===0&&tool==='guide'){addGuide(e);return}
  if(tool==='stretch'&&e.button===0){
    const c=stretchPick(e);
    if(c){if(e.shiftKey||e.ctrlKey){vsel.has(c.key)?vsel.delete(c.key):vsel.add(c.key);dirtyR=true;return}
      if(!vsel.has(c.key)){vsel.clear();vsel.add(c.key)}
      startStretch(e);dirtyR=true;return}
    const pid=pick(e);if(pid){select(pid,e.shiftKey||e.ctrlKey);dirtyR=true;return}
    act={k:'rect',v:true,x0:cx,y0:cy,x:cx,y:cy,add:e.shiftKey||e.ctrlKey,moved:0};return}
  if(tool==='edge'&&e.button===0){const h=edgePick(e);if(h)edgeToggle(h);return}
  const AG=activeGizmo();
  if(e.button===0&&AG){AG.updateMatrixWorld(true);ndc(e);const gh=ray.intersectObject(AG,true)[0];
    if(gh){const ax=gh.object.userData.ax;if(tool==='move')startGizmo(e,ax);else if(tool==='rotate')startRotG(e,ax);else startScale(e,ax);return}}
  const id=pick(e);
  if(id){
    const add=(e.shiftKey||e.ctrlKey)&&tool!=='rotate';
    if(tool==='rotate'){if(!msel.includes(id))select(id);rotateSel(selected(),viewAxis(),e.shiftKey?-1:1);return}
    if(add){select(id,true);return}
    if(!msel.includes(id))select(id);else{sel=id;props();list()}
    if(tool==='move'){
      const p=panels.find(a=>a.id===id),n=cam.getWorldDirection(new THREE.Vector3()),pl=new THREE.Plane().setFromNormalAndCoplanarPoint(n,new THREE.Vector3(p.x,p.y,p.z)),pt=new THREE.Vector3();
      ray.ray.intersectPlane(pl,pt);const grpL=grp?panels:(msel.length>1?selected():null);
      act={k:'drag',p,pl,pt,s:[p.x,p.y,p.z],ax:-1,all:grpL?grpL.map(a=>[a,a.x,a.y,a.z]):null}}
    else if(tool==='scale')startScale(e);
    return}
  act={k:'rect',x0:cx,y0:cy,x:cx,y:cy,add:e.shiftKey||e.ctrlKey,moved:0}}
function onMove(e){
  if(pm&&!act){movePlace(e);return}
  if(tool==='ruler'&&!act&&!dr){rulerMove(e);return}
  if(tool==='edge'&&!act&&!dr){edgeHover(e);return}
  if(dr&&!act){dr.cur=drawPt(e,dr.p);drawShow();return}
  if(!act)return;
  if(act.k==='rect'){act.x=e.clientX;act.y=e.clientY;act.moved=Math.abs(act.x-act.x0)+Math.abs(act.y-act.y0);drawRect();return}
  if(act.k==='scale'){scaleMove(e);return}
  if(act.k==='gizmo'){gizmoMove(e);return}
  if(act.k==='rotg'){rotgMove(e);return}
  if(act.k==='stretch'){stretchMove(e);return}
  if(act.k==='drag'){ndc(e);const v=new THREE.Vector3();if(!ray.ray.intersectPlane(act.pl,v))return;const d=v.sub(act.pt).toArray();
    if(ortho){if(act.ax<0){if(Math.hypot(...d)<8)return;act.ax=d.map(Math.abs).indexOf(Math.max(...d.map(Math.abs)))}for(let i=0;i<3;i++)if(i!==act.ax)d[i]=0}
    const st=num(q('#p3step').value),p=act.p,r=a=>st?Math.round(a/st)*st:a;
    p.x=r(act.s[0]+d[0]);p.y=r(act.s[1]+d[1]);p.z=r(act.s[2]+d[2]);
    if(mag){const c0=new THREE.Vector3(p.x,p.y,p.z);let hit=magnet(c0,extS(p),act.all?act.all.map(a=>a[0]):[p]);
      if(hit&&ortho&&act.ax>=0){const dd=hit.c.clone().sub(c0);dd.setComponent(act.ax,0);if(dd.length()>.5)hit=null}
      if(hit){p.x=hit.c.x;p.y=hit.c.y;p.z=hit.c.z}
      if(snapMark){snapMark.visible=!!hit;if(hit)snapMark.position.copy(hit.T)}}
    place(p);syncPos(p);
    if(act.all)act.all.forEach(([a,x,y,z])=>{a.x=x+p.x-act.s[0];a.y=y+p.y-act.s[1];a.z=z+p.z-act.s[2];place(a)});return}
  const dx=e.clientX-act.x,dy=e.clientY-act.y;act.x=e.clientX;act.y=e.clientY;act.moved+=Math.abs(dx)+Math.abs(dy);
  if(act.k==='orbit'){if(cam===ocam){cam=pcam;vname='iso';applyFlat();qa('[data-v]').forEach(b=>b.classList.remove('on'))}az-=dx*.007;el=Math.max(-1.55,Math.min(1.55,el+dy*.007))}
  else{const k=R*.0016,r=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0),u=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1);tg.addScaledVector(r,-dx*k).addScaledVector(u,dy*k)}
  upd()}
function onUp(){
  hideSnap();
  if(act){if(act.k==='drag'||act.k==='scale'||act.k==='gizmo')changed();else if(act.k==='stretch')stretchEnd();else if(act.k==='rect')finishRect()}act=null}
/* Modeling hotkeylari — Drawing/CNC hotkeylaridan ALOHIDA (o'z saqlash kaliti, Hotkey oynasida alohida bo'lim) */
const P3CMD=[
  // Asboblar
  ['tool.select','Asbob: Select (tanlash)','V',()=>setTool('select')],['tool.move','Asbob: Move (ko\'chirish)','M',()=>setTool('move')],
  ['tool.rotate','Asbob: Rotate (aylantirish)','R',()=>setTool('rotate')],['tool.scale','Asbob: Scale (masshtab)','S',()=>setTool('scale')],
  ['tool.stretch','Asbob: Stretch (nuqtalarni surish)','W',()=>setTool('stretch')],['tool.edge','Asbob: Kromka belgilash','K',()=>setTool('edge')],
  ['tool.ruler','Asbob: Lineyka (o\'lchash)','L',()=>setTool(tool==='ruler'?'select':'ruler')],['tool.guide','Asbob: Yordamchi chiziq','G',()=>setTool(tool==='guide'?'select':'guide')],
  ['guide.clear','Yordamchi chiziqlarni o\'chirish','Shift+G',()=>q('#p3mkGc').click()],
  // Tanlash
  ['sel.all','Tanlash: hammasini tanlash','A',()=>selectAllP()],['sel.none','Tanlash: tanlovni bekor qilish','Alt+A',()=>{clearSel();dirtyR=true}],
  ['sel.group','Tanlash: Korpus rejimi (hammasi birga)','B',()=>q('#p3bGrp').click()],
  ['sel.mat','Tanlash: shu materialdagi panellar (material + qalinlik)','Shift+M',()=>{const p=selected()[0];if(p)selByMat(matN(p),+p.t.toFixed(2))}],
  // Obyekt
  ['obj.copy','Obyekt: Copy (nusxa)','C',()=>copySel()],['obj.rot90','Obyekt: panelni 90° burish (eni ↔ bo\'yi)','Shift+R',()=>{const b=q('#p3bRot');if(b)b.click()}],
  ['obj.mirrorX','Obyekt: Mirror X','Shift+X',()=>mirrorSel(0)],['obj.mirrorY','Obyekt: Mirror Y','Shift+Y',()=>mirrorSel(1)],['obj.mirrorZ','Obyekt: Mirror Z','Shift+Z',()=>mirrorSel(2)],
  ['obj.delete','Obyekt: Delete (o\'chirish)','Delete',()=>selected().forEach(del)],
  // Panel
  ['panel.new','Panel: yangi panel (kursorga)','N',()=>{if(inited)startPlace()}],['panel.draw','Panel: shaklini chizish','D',()=>q('#p3pnDraw').click()],
  ['panel.fromDraw','Panel: chizmadan panel yasash (extrude)','Shift+N',()=>q('#p3pnFromDraw').click()],['panel.load2d','Panel: Drawing chizmasini yuklash','Shift+D',()=>q('#p3bDraw').click()],
  // Magnit / yo'nalish
  ['snap.magnet','Magnit yoqish/o\'chirish','Space',()=>toggleMag()],['snap.ortho','Ortho / Free almashtirish','O',()=>q(ortho?'#p3bFree':'#p3bOrtho').click()],
  // Ko'rinish
  ['view.iso','Ko\'rinish: Iso','0',()=>setView('iso')],['view.front','Ko\'rinish: Front','1',()=>setView('front')],['view.back','Ko\'rinish: Back','2',()=>setView('back')],
  ['view.right','Ko\'rinish: Right','3',()=>setView('right')],['view.left','Ko\'rinish: Left','4',()=>setView('left')],['view.top','Ko\'rinish: Top','7',()=>setView('top')],
  ['view.bottom','Ko\'rinish: Bottom','Shift+7',()=>setView('bottom')],
  ['view.frame','Ko\'rinish: hammasini ekranga sig\'dirish','F',()=>frame()],['view.frameSel','Ko\'rinish: tanlanganni ekranga sig\'dirish','Shift+F',()=>frameSel()],
  ['view.wireToggle','Ko\'rinish: Wireframe / Solid almashtirish','Z',()=>toggleWire()],['view.solid','Ko\'rinish: Solid','Shift+S',()=>setWire(false)],['view.wire','Ko\'rinish: Wireframe','Shift+W',()=>setWire(true)],
  ['view.thick','Ko\'rinish: qalinlik (2D) yoqish/o\'chirish','T',()=>toggleThick()],['view.grain','Ko\'rinish: tekstura chiziqlari','Shift+T',()=>toggleGrain()],
  ['obj.grain','Obyekt: tekstura yo\'nalishi (yo\'q → bo\'yi → eni)','Alt+T',()=>{const ps=selected();if(!ps.length)return;ps.forEach(p=>{grCycle(p);build(p)});props();list();changed()}],
  ['view.hide','Ko\'rinish: Hide selection','H',()=>hideSel()],['view.isolate','Ko\'rinish: Isolate selection','I',()=>isolateSel()],['view.unhide','Ko\'rinish: Unhide all','Shift+H',()=>unhideAll()],
  // Butun korpus (standart tugmasiz — kerak bo'lsa tayinlang)
  ['body.rotL','Korpus: 90° chapga burish','',()=>rotK(-1)],['body.rotR','Korpus: 90° o\'ngga burish','',()=>rotK(1)],
  ['scene.demo','Sahna: namuna korpus','',()=>q('#p3bDemo').click()]
].map(([id,label,key,run])=>({id,label,key,run}));
const P3_STORE='rugby.shortcuts.p3.v1';
const P3_DEF=Object.fromEntries(P3CMD.map(c=>[c.id,c.key]));
let p3Keys={...P3_DEF};
try{const o=JSON.parse(localStorage.getItem(P3_STORE)||'null');if(o&&typeof o==='object')for(const c of P3CMD)if(typeof o[c.id]==='string')p3Keys[c.id]=o[c.id]}catch(e){}
function p3combo(e){
  if(['Control','Shift','Alt','Meta','Dead','Unidentified'].includes(e.key))return '';
  const code=e.code||'',k=/^Key[A-Z]$/.test(code)?code.slice(3):/^Digit[0-9]$/.test(code)?code.slice(5):/^Numpad[0-9]$/.test(code)?code.slice(6):e.key===' '?'Space':e.key.length===1?e.key.toUpperCase():e.key;
  return (e.ctrlKey||e.metaKey?'Ctrl+':'')+(e.altKey?'Alt+':'')+(e.shiftKey?'Shift+':'')+k}
function p3validate(combo,id,draft){
  if(!combo)return '';
  const bits=combo.split('+'),key=bits.pop();
  if(bits.some(b=>b!=='Shift'&&b!=='Alt')||bits.join('+')!==['Alt','Shift'].filter(b=>bits.includes(b)).join('+'))return "Modeling uchun yolg'iz tugma, Shift yoki Alt bilan birga tanlang (Ctrl+Z/Y — undo/redo).";
  if(!/^(?:[A-Z]|[0-9]|Space|Delete|Insert|PageUp|PageDown|Home|End|F(?:[1-4]|[6-9]|10))$/.test(key))return "Harf, raqam, Space, Delete yoki F1–F10 (F5 dan tashqari) tugmasini tanlang.";
  const o=Object.keys(draft).find(k=>k!==id&&draft[k]===combo);return o?'conflict:'+o:''}
function onKey(e){
  if(!isOpen)return;
  const t=e.target,inField=!!t&&/INPUT|SELECT|TEXTAREA/.test(t.tagName||'');
  if((e.ctrlKey||e.metaKey)&&!e.altKey&&/^[zy]$/i.test(e.key)&&!inField){
    e.preventDefault();e.stopImmediatePropagation();(e.key.toLowerCase()==='y'||e.shiftKey)?histGo(1):histGo(-1);return}
  {const c0=(!e.ctrlKey&&!e.metaKey&&!inField&&mode!=='cut'&&!dr&&(e.altKey||/^F\d+$/.test(e.key)))?P3CMD.find(c=>p3Keys[c.id]&&p3Keys[c.id]===p3combo(e)):null;
    if(c0){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)c0.run();return}}
  if(e.ctrlKey||e.metaKey||e.altKey){   // Ctrl+S/O/N/I/E Rugby'ga o'tadi; Drawing'ning boshqa Ctrl-buyruqlari Modeling'da bloklanadi
    if(inField)return;if((e.ctrlKey||e.metaKey)&&!e.altKey&&/^[nosie]$/i.test(e.key))return;e.stopImmediatePropagation();return}
  if(/^F\d+$/.test(e.key))return;
  if(inField)return;
  e.stopImmediatePropagation();   // Drawing/CNC hotkeylari Modeling'da ishlamaydi
  if(mode==='cut')return;   // Cutlist: 3D buyruqlari yo'q
  if(dr){if(e.key==='Enter')finishDraw();else if(e.key==='Escape')endDraw();else if(e.key==='Backspace'){dr.pts.pop();drawShow()}e.preventDefault();return}
  if(pm&&e.key==='Escape'){cancelPlace();e.preventDefault();return}
  if(e.key==='Escape'){clearRuler();vsel.clear();clearSel();dirtyR=true;return}
  const combo=p3combo(e),cmd=P3CMD.find(c=>p3Keys[c.id]&&p3Keys[c.id]===combo);
  if(cmd){e.preventDefault();if(!e.repeat)cmd.run();return}
  const ps=selected();if(!ps.length)return;
  const st=num(q('#p3step').value)||1,k={ArrowLeft:['x',-1],ArrowRight:['x',1],ArrowUp:['z',-1],ArrowDown:['z',1],PageUp:['y',1],PageDown:['y',-1]}[e.key];
  if(k){e.preventDefault();for(const p of ps){p[k[0]]+=k[1]*st;place(p)}{const cc=cur();if(cc)syncPos(cc)}changed()}}

/* ---------------- butun korpus ---------------- */
function bbox(){return bboxOf(panels)}
function bboxOf(ps){const mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];for(const p of ps){const e=ext(p),c=[p.x,p.y,p.z];for(let a=0;a<3;a++){mn[a]=Math.min(mn[a],c[a]-e[a]/2);mx[a]=Math.max(mx[a],c[a]+e[a]/2)}}return[mn,mx]}
// Umumiy o'lcham: tanlangan panellar (bir nechta) yoki tanlov bo'lmasa — butun korpus gabariti (X eni, Y bo'yi, Z chuqurligi)
function kzSync(){
  if(!wrap||!q('#p3dim'))return;
  const sl=selected().filter(p=>!p.hid),vis=panels.filter(p=>!p.hid),ps=sl.length?sl:vis;
  q('#p3dimT').textContent=sl.length?`Tanlangan ${sl.length} ta panel — umumiy o'lcham`:`Butun korpus — umumiy o'lcham${vis.length?` (${vis.length} panel)`:''}`;
  q('#p3dim').classList.toggle('sel',!!sl.length);
  if(!ps.length){['dx','dy','dz'].forEach(id=>q('#p3'+id).textContent='—');return}
  const[mn,mx]=bboxOf(ps);['dx','dy','dz'].forEach((id,a)=>q('#p3'+id).textContent=+(mx[a]-mn[a]).toFixed(1))}
function rotK(dir){if(!panels.length)return;rotateSel(panels,1,dir);frame()}
/* ---------------- namuna ---------------- */
function demo(){
  for(const p of panels)if(p.g&&P)P.remove(p.g);panels=[];sel=null;msel=[];
  const W=600,H=720,D=500,m=(n,o)=>add(Object.assign({n},o));
  m('Yon devor chap',{w:D,h:H,o:'side',x:-(W/2-T/2),y:H/2,z:0});
  m("Yon devor o'ng",{w:D,h:H,o:'side',x:W/2-T/2,y:H/2,z:0});
  m('Past (dno)',{w:W-2*T,h:D,o:'flat',x:0,y:T/2,z:0});
  m('Usti',{w:W-2*T,h:D,o:'flat',x:0,y:H-T/2,z:0});
  m('Polka',{w:W-2*T,h:D-20,o:'flat',x:0,y:H/2,z:10});
  m('Orqa devor',{w:W-2*T,h:H-2*T,o:'front',x:0,y:H/2,z:-D/2+T/2});
  list();props();changed();histReset();if(inited)setView('iso')}

/* ---------------- saqlash (loyiha fayli bilan) ---------------- */
function snapshot(){
  const big=lines.reduce((s,l)=>s+l.p.length,0)>60000;
  return{v:1,T,uid,guides,pl:planeMode,dp:q&&wrap&&q('#p3dxD')?q('#p3dxD').value:'500',panels:panels.map(({g,...r})=>JSON.parse(JSON.stringify(r))),lines:big?[]:lines}}
function load(d){
  if(inited){for(const p of panels)if(p.g)P.remove(p.g)}
  panels=[];sel=null;msel=[];lines=[];guides=[];dr=null;
  if(d&&Array.isArray(d.panels)){T=d.T>0?d.T:16;uid=d.uid||1;
    panels=d.panels.filter(p=>p&&p.o&&p.w>0&&p.h>0&&p.t>0).map(p=>Object.assign({},p));
    uid=Math.max(uid,...panels.map(p=>p.id+1),1);
    lines=Array.isArray(d.lines)?d.lines:[];planeMode=d.pl||'front';guides=Array.isArray(d.guides)?d.guides:[]}
  else{T=16;uid=1}
  if(wrap){q('#p3T').value=T;q('#p3dxP').value=planeMode;if(d&&d.dp)q('#p3dxD').value=d.dp;sync()}
  histReset()}
function sync(){
  if(inited){panels.forEach(build);drawLines();drawGuides();if(isOpen)frame()}
  if(wrap){props();list();kzSync();if(mode==='cut')clRender();
    q('#p3dxfInfo').textContent=lines.length?`${lines.length} ta chiziq (3D chizma).`:"DXF faylni tanlang yoki «2D chizmadan» bosing.";
    q('#p3bDxfP').hidden=!lines.some(l=>l.c&&!l.circle);q('#p3bDxfC').hidden=!lines.length}}

/* ---------------- ochish/yopish, qurish ---------------- */
const HTML=`
<div class="p3bar">
  <span class="p3seg"><button data-v="iso" class="on" title="Izometrik (perspektiva)">Iso</button><button data-v="top" title="Yuqori">Top</button><button data-v="front" title="Old">Front</button><button data-v="left" title="Chap">Left</button><button data-v="right" title="O'ng">Right</button><button data-v="back" title="Orqa">Back</button></span>
  <span class="p3dd"><button class="p3ddb" aria-haspopup="true" aria-expanded="false">View ▾</button><div class="p3ddm" hidden>
    <button class="p3di chk" id="p3vmSolid">Solid<span class="kb">Shift+S</span></button>
    <button class="p3di" id="p3vmWire">Wireframe<span class="kb">Shift+W · Z</span></button>
    <button class="p3di chk" id="p3vmGrain">Tekstura yo'nalishi (chiziqlar)</button>
    <button class="p3di chk" id="p3vmThick">Qalinlikni ko'rsatish (2D ko'rinishlarda)</button>
    <div class="p3dsep"></div>
    <button class="p3di" id="p3vmHide">Hide selection<span class="kb">H</span></button>
    <button class="p3di" id="p3vmIso">Isolate selection<span class="kb">I</span></button>
    <button class="p3di" id="p3vmUn">Unhide all<span class="kb">Shift+H</span></button>
    <button class="p3di" id="p3vmFrame">Hammasini ekranga sig'dirish</button>
    <button class="p3di" id="p3vmFrameSel">Tanlanganni ekranga sig'dirish</button>
    <button class="p3di" id="p3vmKeys">Hotkeylar (sozlash)…</button>
  </div></span>
  <span class="p3dd"><button class="p3ddb" aria-haspopup="true" aria-expanded="false">Panel ▾</button><div class="p3ddm" hidden>
    <button class="p3di" id="p3pnNew">Yangi panel<span class="kb">kursorga ilashadi</span></button>
    <button class="p3di" id="p3pnFromDraw" title="Drawing bo'limidagi yopiq konturlarni extrude qilib panel yasaydi (extrude chuqurligi chap paneldagi DXF bo'limida)">Chizmadan panel yasash (extrude)</button>
    <div class="p3dsep"></div><div class="p3dh" id="p3pmHead">Tanlangan panel</div>
    <div class="p3dr"><label>Nomi</label><input id="p3pm_n" disabled></div>
    <div class="p3dr"><label>Eni</label><input id="p3pm_w" type="text" inputmode="decimal" disabled></div>
    <div class="p3dr"><label>Bo'yi</label><input id="p3pm_h" type="text" inputmode="decimal" disabled></div>
    <div class="p3dr"><label>Qalinlik</label><input id="p3pm_t" type="text" inputmode="decimal" disabled></div>
    <div class="p3dr"><label>Soni</label><input id="p3pm_q" type="text" inputmode="decimal" disabled></div>
    <div class="p3dsep"></div><div class="p3dh">Shakl (turi)</div>
    <button class="p3di" data-shape="rect">To'rtburchak</button><button class="p3di" data-shape="tri">Uchburchak</button><button class="p3di" data-shape="pent">Beshburchak</button><button class="p3di" data-shape="L">L-simon</button><button class="p3di" data-shape="U">U-simon</button>
    <button class="p3di" id="p3pnDraw">Shaklni chizish…<span class="kb">2 marta bosish</span></button>
    <div class="p3dsep"></div><div class="p3dh">Kromka (qirra lentasi)</div>
    <div class="p3dh" style="padding-top:0;text-transform:none;letter-spacing:0">Jadval, eksport va list hisobi — Cutlist bo'limida</div>
    <div class="p3dr"><label>Qalinlik (mm)</label><input id="p3ebT" type="text" inputmode="decimal" value="0.4"></div>
    <div class="p3dsep"></div><div class="p3dh">Standart</div>
    <div class="p3dr"><label>Qalinlik</label><input id="p3T" type="text" inputmode="decimal" value="16"><button id="p3bAllT" title="Barcha panellarga shu qalinlikni qo'llash">Hammasiga</button></div>
  </div></span>
  <span class="p3dd"><button class="p3ddb" aria-haspopup="true" aria-expanded="false">Make ▾</button><div class="p3ddm" hidden>
    <button class="p3di chk" id="p3mkMag">Magnit<span class="kb">Probel</span></button>
    <button class="p3di chk" data-snap="end">Uchlar (Endpoint / Vertex)</button>
    <button class="p3di chk" data-snap="mid">O'rta nuqta (Midpoint)</button>
    <button class="p3di" data-snap="cen">Markaz (Center)</button>
    <div class="p3dsep"></div>
    <button class="p3di" id="p3bOrtho" title="Siljitish faqat bitta o'q bo'ylab">Ortho</button>
    <button class="p3di on" id="p3bFree" title="Ekran tekisligida erkin siljitish">Free</button>
    <div class="p3dr"><label>Qadam (mm)</label><input id="p3step" type="text" inputmode="decimal" value="1"></div>
    <div class="p3dsep"></div>
    <button class="p3di" id="p3mkRul">Lineyka (o'lchash)</button>
    <button class="p3di" id="p3mkGd">Yordamchi chiziq</button>
    <button class="p3di" id="p3mkGc">Yordamchi chiziqlarni o'chirish</button>
  </div></span>
  <span class="p3dd"><button class="p3ddb" aria-haspopup="true" aria-expanded="false">Object ▾</button><div class="p3ddm" hidden>
    <button class="p3di on" id="p3tSel" title="Tanlash: bosib yoki ramka bilan">Select<span class="kb">V</span></button>
    <button class="p3di" id="p3tMov" title="Ko'chirish">Move<span class="kb">M</span></button>
    <button class="p3di" id="p3tRot" title="Aylantirish: panelga bosing yoki halqani sudrang">Rotate<span class="kb">R</span></button>
    <button class="p3di" id="p3tScl" title="Masshtab: o'q uchidagi kubni sudrang">Scale<span class="kb">S</span></button>
    <button class="p3di" id="p3tStr" title="Burchak nuqtalarini belgilab, masofaga suring">Stretch<span class="kb">W</span></button>
    <button class="p3di" id="p3tEdg" title="Panel qirrasini bosib kromka belgilash">Kromka<span class="kb">K</span></button>
    <div class="p3dsep"></div>
    <button class="p3di" id="p3oCopy">Copy<span class="kb">C</span></button>
    <button class="p3di" id="p3oMx">Mirror X (nusxa)</button><button class="p3di" id="p3oMy">Mirror Y (nusxa)</button><button class="p3di" id="p3oMz">Mirror Z (nusxa)</button>
    <button class="p3di" id="p3oDel">Delete<span class="kb">Del</span></button>
    <div class="p3dsep"></div>
    <button class="p3di" id="p3bGrp" title="Sudralganda barcha panellar birga siljiydi">Korpus rejimi (hammasi birga)</button>
  </div></span>
  <span style="flex:1"></span>
  <button id="p3bUndo" title="Orqaga (Ctrl+Z)" disabled>↶</button><button id="p3bRedo" title="Qaytarish (Ctrl+Y)" disabled>↷</button>
</div>
<div class="p3main">
 <aside class="p3lib">
  <h4>Shablonlar</h4><div class="p3tpl" id="p3tpl"></div>
  <p class="p3mu">Bosing — panel kursorga ilashadi, joyiga bosib qo'ying. Magnit (Probel) — panel qo'yishda ham, sudrashda ham nuqtalari (uchlar, o'rta nuqta, markaz — «Magnit turi» da tanlanadi) boshqa panelniki bilan yopishadi. Panel joriy ko'rinishga mos tushadi: Old — frontal, Yon — vertikal, Yuqori — gorizontal. Panelga 2 marta bosing — shaklini chizish.</p>
  <div class="p3row"><button id="p3bDemo">Namuna korpus</button><button id="p3bClear">Tozalash</button></div>
  <h4>Butun korpus</h4>
  <div id="p3kz">
   <p class="p3mu" style="margin-top:0">Ko'chirish X, Y, Z (mm)</p>
   <div class="p3g3"><input id="p3mx" type="text" inputmode="decimal" value="0"><input id="p3my" type="text" inputmode="decimal" value="0"><input id="p3mz" type="text" inputmode="decimal" value="0"></div>
   <div class="p3row"><button id="p3bMove">Ko'chirish</button><button id="p3bRL">↺ 90°</button><button id="p3bRR">↻ 90°</button></div>
   <p class="p3mu" id="p3dimT">Umumiy o'lcham (gabarit)</p>
   <div class="p3dim" id="p3dim"><span><i>X</i><b id="p3dx">—</b></span><span><i>Y</i><b id="p3dy">—</b></span><span><i>Z</i><b id="p3dz">—</b></span></div>
  </div>
  <h4>2D chizma / DXF</h4>
  <div class="p3row" style="margin-top:0"><button id="p3bDraw">2D chizmadan</button><button id="p3bFile">DXF fayl…</button></div>
  <input type="file" id="p3file" accept=".dxf" style="display:none">
  <p class="p3mu" id="p3dxfInfo"></p>
  <div class="p3r"><label style="width:96px">Chizma tekisligi</label><select id="p3dxP"><option value="plan">Reja (yuqoridan)</option><option value="front">Old (XY)</option></select></div>
  <div class="p3r"><label style="width:96px">Extrude (mm)</label><input id="p3dxD" type="text" inputmode="decimal" value="500"></div>
  <div class="p3row"><button id="p3bDxfP" hidden>Yopiq konturlarni extrude qilish (panel)</button><button id="p3bDxfC" hidden>Chiziqlarni o'chirish</button></div>
 </aside>
 <div class="p3view"><div class="p3hint" id="p3hint"></div></div>
 <aside class="p3props">
  <h4>Panel xossalari</h4><div id="p3pp"></div>
  <h4>Panellar</h4>
  <div class="p3r p3selm"><label>Material bo'yicha</label><select id="p3selMat" title="Shu materialdagi (va qalinlikdagi) hamma panelni tanlash. Hotkey: Shift+M — tanlangan panel materialidagilarni tanlash"><option value="">— tanlash —</option></select></div>
  <div id="p3pl"></div>
 </aside>
</div>
<div class="p3cl">
 <div class="p3clbar"><b>Cutlist — raskroy ro'yxati</b><span class="p3mu">Panellar Modeling'dan olinadi. Katakchalarni shu yerda tahrirlash mumkin. Kromka: L1… / W1… katakchasini bosing (L — uzunlik: teksturali panelda tekstura bo'ylab, aks holda uzun tomon; W — unga tik).</span><span style="flex:1"></span>
  <label>Kromka (mm) <input id="p3clEbT" type="text" inputmode="decimal" value="0.4"></label>
  <button id="p3clEbAll" title="Tanlangan (tanlanmagan bo'lsa — hamma) panellarga: hamma qirra">Hamma qirra</button><button id="p3clEbLong">Uzun tomonlar</button><button id="p3clEbShort">Qisqa tomonlar</button><button id="p3clEbClr">Kromkasiz</button>
  <span class="p3clsep"></span><label title="Tanlangan (tanlanmagan bo'lsa — hamma) panellarga qalinlik">Qalinlik <input id="p3clTb" type="text" inputmode="decimal" placeholder="mm"></label><button id="p3clTApply">Qo'llash</button>
  <span class="p3clsep"></span><label>Tekstura</label><button id="p3clGrH" title="Tanlangan (tanlanmagan bo'lsa — hamma) panellarga: tekstura bo'yi bo'ylab">║ Bo'yi</button><button id="p3clGrW" title="Tekstura eni bo'ylab">═ Eni</button><button id="p3clGrN" title="Tekstura muhim emas (aylantirish mumkin)">Yo'q</button></div>
 <div class="p3clmain">
  <div class="p3cltab" id="p3clTab"></div>
  <aside class="p3clside">
   <h4>Jami</h4><div id="p3clSum"></div>
   <h4>Eksport (raskroy dasturi uchun)</h4>
   <div class="p3dr"><label>Ajratgich</label><select id="p3clDl"><option value=";">; (nuqta-vergul)</option><option value=",">, (vergul)</option><option value="tab">TAB</option></select></div>
   <div class="p3dr"><label>O'nlik</label><select id="p3clDec"><option value=".">0.5</option><option value=",">0,5</option></select></div>
   <div class="p3dr"><label>Kromka qiymati</label><select id="p3clKf"><option value="mm">qalinlik (mm)</option><option value="flag">1 / 0</option></select></div>
   <div class="p3dr"><label>Qalinlik</label><select id="p3clTf"><option value="">Hamma qalinlik</option></select></div>
   <div class="p3dr"><label>Material</label><select id="p3clMf" title="Eksport va List hisobi faqat shu materialdagi panellar bo'yicha"><option value="*">Hamma material</option></select></div>
   <div class="p3chks"><label class="p3chk"><input type="checkbox" id="p3clH" checked> Sarlavha qatori</label><label class="p3chk"><input type="checkbox" id="p3clIMat"> Material</label><label class="p3chk"><input type="checkbox" id="p3clINote" checked> Izoh</label><label class="p3chk"><input type="checkbox" id="p3clIRot" checked> Aylantirish</label><label class="p3chk" title="Tekstura: 1 — L tekstura bo'ylab (aylantirilmaydi), 0 — muhim emas"><input type="checkbox" id="p3clITex" checked> Tekstura</label><label class="p3chk"><input type="checkbox" id="p3clIKm" checked> Kromka (m)</label></div>
   <div class="p3row"><button id="p3clExp">Eksport</button><button id="p3clCopy">Nusxa</button></div>
   <p class="p3mu" id="p3clInfo">Ustunlar: Uzunlik, Eni, Soni, Nomi, Qalinlik, [Material, Izoh, Aylantirish], L1, L2, (L3, L4), W1, W2, (W3, W4), [Kromka (m)]. Bir xil panellar birlashtiriladi.</p>
   <h4>List hisobi</h4>
   <div class="p3g3"><label>List uzunligi<input id="p3shL" type="text" inputmode="decimal" value="2800"></label><label>List eni<input id="p3shW" type="text" inputmode="decimal" value="2070"></label><label>Kesim (kerf)<input id="p3shK" type="text" inputmode="decimal" value="4"></label></div>
   <div class="p3g3"><label>Chekka qirqim<input id="p3shT" type="text" inputmode="decimal" value="10"></label></div>
   <div class="p3row"><button id="p3clSheetB">Hisobla</button></div>
   <p class="p3mu">Natija pastda — to'liq eni bo'ylab. Yuqoridagi Qalinlik/Material filtri hisobga ham qo'llanadi.</p>
  </aside>
 </div>
 <div class="p3clwide" id="p3clSheetOut"></div>
</div>`;
function initUI(){
  const host=document.getElementById('canvasWrap');
  wrap=document.createElement('div');wrap.id='p3wrap';wrap.style.display='none';wrap.innerHTML=HTML;host.appendChild(wrap);
  for(const t of['mousedown','mouseup','mousemove','wheel','dblclick','contextmenu','click','keyup','dragover','drop'])
    wrap.addEventListener(t,e=>e.stopPropagation());
  q('#p3tpl').innerHTML=TPL.map(t=>`<button class="p3tile" title="${t.n} ${t.w}×${t.h}"><canvas></canvas>${t.n}</button>`).join('');
  q('#p3tpl').insertAdjacentHTML('beforeend','<button id="p3bMag" class="p3tile on" title="Magnit — panel burchak/o\'rta nuqtalarga yopishadi (Probel)"><svg viewBox="0 0 48 48" width="48" height="48"><path d="M13 10v17a11 11 0 0 0 22 0V10" fill="none" stroke="currentColor" stroke-width="5"/><path d="M10 5h8v9h-8zM30 5h8v9h-8z" fill="currentColor"/></svg>Magnit · Probel</button>');
  qa('#p3tpl .p3tile:not(#p3bMag)').forEach(b=>b.onclick=()=>{ensure();if(inited)startPlace()});
  q('#p3bMag').onclick=toggleMag;
  q('#p3tpl').insertAdjacentHTML('afterend','<button id="p3bMagT" style="margin-top:6px">Magnit turi ▾</button><div id="p3magMenu" class="p3menu" hidden><label><input type="checkbox" id="p3snE" checked> Uchlar (Endpoint / Vertex)</label><label><input type="checkbox" id="p3snM" checked> O\'rta nuqta (Midpoint)</label><label><input type="checkbox" id="p3snC"> Markaz (Center)</label></div>');
  q('#p3bMagT').onclick=()=>{const m=q('#p3magMenu');m.hidden=!m.hidden;q('#p3bMagT').textContent=m.hidden?'Magnit turi ▾':'Magnit turi ▴'};
  [['E','end'],['M','mid'],['C','cen']].forEach(([i,k])=>q('#p3sn'+i).onchange=e=>{snapM[k]=e.target.checked;hideSnap()});
  qa('[data-v]').forEach(b=>b.onclick=()=>{ensure();setView(b.dataset.v)});
  [['Sel','select'],['Mov','move'],['Rot','rotate'],['Scl','scale'],['Str','stretch'],['Edg','edge']].forEach(([i,t])=>q('#p3t'+i).onclick=()=>setTool(t));
  q('.p3view').insertAdjacentHTML('beforeend','<div class="p3rect" id="p3rect" hidden></div><div class="p3rul" id="p3rul" hidden></div><div class="p3sd" id="p3sd" hidden>Nuqtalar: <b id="p3sdn">0</b> · Surish (mm): X <input id="p3sdx" type="text" inputmode="decimal" value="0"> Y <input id="p3sdy" type="text" inputmode="decimal" value="0"> Z <input id="p3sdz" type="text" inputmode="decimal" value="0"> <button id="p3sdb">Qo‘llash</button></div><canvas class="p3nav" id="p3nav" width="192" height="192" title="Yo‘nalish: o‘qni bosing"></canvas>');
  q('#p3nav').onclick=navClick;
  q('#p3sdb').onclick=stretchNumeric;['x','y','z'].forEach(k=>q('#p3sd'+k).onkeydown=e=>{if(e.key==='Enter')stretchNumeric()});
  q('#p3bUndo').onclick=()=>histGo(-1);q('#p3bRedo').onclick=()=>histGo(1);
  q('#p3bOrtho').onclick=()=>{ortho=true;q('#p3bOrtho').classList.add('on');q('#p3bFree').classList.remove('on')};
  q('#p3bFree').onclick=()=>{ortho=false;q('#p3bFree').classList.add('on');q('#p3bOrtho').classList.remove('on')};
  const dds=[...qa('.p3dd')],ddHidden=d=>d.querySelector('.p3ddm').hidden,closeDD=()=>dds.forEach(d=>{d.querySelector('.p3ddm').hidden=true;d.querySelector('.p3ddb').setAttribute('aria-expanded','false')});
  const openDD=d=>{closeDD();d.querySelector('.p3ddm').hidden=false;d.querySelector('.p3ddb').setAttribute('aria-expanded','true');menuSync()};
  dds.forEach(d=>{const b=d.querySelector('.p3ddb'),m=d.querySelector('.p3ddm');
    b.onclick=()=>{const was=!m.hidden;closeDD();if(!was)openDD(d)};
    b.onmouseenter=()=>{if(dds.some(x=>!ddHidden(x))&&m.hidden)openDD(d)};
    m.addEventListener('click',e=>{if(e.target.closest('button.p3di'))closeDD()})});
  document.addEventListener('mousedown',e=>{if(!e.target.closest('.p3dd'))closeDD()},true);
  [['Solid',()=>{if(wire)toggleWire()}],['Wire',()=>{if(!wire)toggleWire()}],['Thick',toggleThick],['Grain',toggleGrain],['Hide',hideSel],['Iso',isolateSel],['Un',unhideAll],['Frame',()=>frame()],['FrameSel',()=>frameSel()],['Keys',()=>{if(typeof openShortcutSettings!=='function')return;openShortcutSettings();setTimeout(()=>{const h=[...document.querySelectorAll('#shortcutRows h3')].pop();if(h)h.scrollIntoView({block:'start'})},0)}]].forEach(([k,f])=>q('#p3vm'+k).onclick=f);
  p3KbSync();
  // Panel
  q('#p3pnNew').onclick=()=>{ensure();if(inited)startPlace()};
  q('#p3pnFromDraw').onclick=()=>{ensure();if(!inited)return;fromDrawing();const n=dxfToPanels();
    q('#p3hint').textContent=n?`Chizmadan ${n} ta panel yasaldi (extrude ${q('#p3dxD').value} mm). Tekislik: ${planeMode==='plan'?'Reja':'Old'}`:"Chizmada yopiq kontur topilmadi: Drawing bo'limida yopiq to'rtburchak chizing";};
  q('#p3pnDraw').onclick=()=>{const p=cur();if(p)startDraw(p)};
  ['n','w','h','t','q'].forEach(k=>q('#p3pm_'+k).onchange=e=>setProp(k,e.target.value));
  qa('[data-shape]').forEach(b=>b.onclick=()=>setShape(b.dataset.shape));
  // Make
  q('#p3mkMag').onclick=toggleMag;
  qa('[data-snap]').forEach(b=>b.onclick=()=>{const k=b.dataset.snap;snapM[k]=!snapM[k];q('#p3sn'+{end:'E',mid:'M',cen:'C'}[k]).checked=snapM[k];hideSnap()});
  q('#p3mkRul').onclick=()=>setTool(tool==='ruler'?'select':'ruler');
  q('#p3mkGd').onclick=()=>setTool(tool==='guide'?'select':'guide');
  q('#p3mkGc').onclick=()=>{guides=[];drawGuides();markDirty()};
  // Object
  q('#p3oCopy').onclick=copySel;q('#p3oMx').onclick=()=>mirrorSel(0);q('#p3oMy').onclick=()=>mirrorSel(1);q('#p3oMz').onclick=()=>mirrorSel(2);
  q('#p3oDel').onclick=()=>selected().forEach(del);
  q('#p3T').onchange=e=>{T=Math.max(1,num(e.target.value)||16);e.target.value=T;markDirty()};
  q('#p3bAllT').onclick=()=>{panels.forEach(p=>{p.t=T;build(p)});paint();props();list();changed()};
  q('#p3bGrp').onclick=()=>{grp=!grp;q('#p3bGrp').classList.toggle('on',grp)};
  q('#p3selMat').onchange=e=>{const v=e.target.value;if(!v)return;const i=v.lastIndexOf('|'),t=v.slice(i+1);selByMat(v.slice(0,i),t===''?null:+t)};
  q('#p3bDemo').onclick=()=>{ensure();demo()};
  q('#p3bClear').onclick=()=>{for(const p of panels)if(p.g)P.remove(p.g);panels=[];sel=null;msel=[];props();list();changed()};
  q('#p3bMove').onclick=()=>{const d=['mx','my','mz'].map(i=>num(q('#p3'+i).value));for(const p of panels){p.x+=d[0];p.y+=d[1];p.z+=d[2];place(p)}props();changed()};
  q('#p3bRL').onclick=()=>rotK(-1);q('#p3bRR').onclick=()=>rotK(1);
  q('#p3bDraw').onclick=()=>{ensure();fromDrawing()};
  q('#p3bFile').onclick=()=>q('#p3file').click();
  q('#p3file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;ensure();
    const t=await f.text();const polys=parseDXF(t);setLines(polys,f.name);if(polys.length)frame()};
  q('#p3bDxfP').onclick=dxfToPanels;
  q('#p3dxP').onchange=e=>{planeMode=e.target.value;drawLines();frame();markDirty()};
  q('#p3bDxfC').onclick=()=>{lines=[];drawLines();sync();markDirty()};
  clWire();
  q('#p3hint').textContent=TOOLH.select;
    window.addEventListener('resize',()=>{if(isOpen){place3d();resize()}});
  iconsDraw();
}
function ensure(){
  if(inited||failed)return;
  // WebGL: bir nechta sozlama bilan urinib ko'riladi (eski/zaif videokartalar, drayver muammosi, dasturiy render)
  const tries=[{antialias:true,logarithmicDepthBuffer:true},{antialias:false,logarithmicDepthBuffer:true},{antialias:false},{antialias:false,powerPreference:'low-power',failIfMajorPerformanceCaveat:false}];
  let err=null;
  for(const o of tries){try{renderer=new THREE.WebGLRenderer(o);err=null;break}catch(e){err=e;renderer=null}}
  if(!renderer){failed=true;const v=q('.p3view'),old=v.querySelector('.p3glerr');if(old)old.remove();
    v.insertAdjacentHTML('afterbegin',`<div class="p3glerr" style="padding:20px;max-width:640px"><p><b>3D ko'rinish (WebGL) ishga tushmadi.</b></p><p class="p3mu">Sabab: kompyuterning videokarta drayveri WebGL'ni bermadi (eski/buzilgan drayver, masofaviy ish stoli — RDP, virtual mashina yoki videokarta band). Panellar ro'yxati, Cutlist va eksport baribir ishlaydi.</p><p class="p3mu">Yechim: videokarta drayverini yangilang (Intel/AMD/NVIDIA sayti), dasturni qayta ishga tushiring; RDP orqali bo'lsa — kompyuterda to'g'ridan-to'g'ri oching.</p><p class="p3mu" style="opacity:.7">Texnik: ${esc(String(err&&err.message||err))}</p><button id="p3glRetry">Qayta urinish</button></div>`);
    q('#p3glRetry').onclick=()=>{failed=false;ensure();if(inited){const x=v.querySelector('.p3glerr');if(x)x.remove();resize();frame()}};
    return}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));q('.p3view').prepend(renderer.domElement);cv=renderer.domElement;
  // Videokarta vaqtincha uzilsa (uyqu, drayver qayta yuklanishi) — 3D tiklanadi
  cv.addEventListener('webglcontextlost',e=>{e.preventDefault();const h=q('#p3hint');if(h)h.textContent="3D ko'rinish vaqtincha uzildi (videokarta). Tiklanishini kuting…"},false);
  cv.addEventListener('webglcontextrestored',()=>{try{theme();panels.forEach(build);drawLines()}catch(e){}dirtyR=true;const h=q('#p3hint');if(h)h.textContent=TOOLH[tool]||HINT},false);
  scene=new THREE.Scene();pcam=new THREE.PerspectiveCamera(40,1,.5,200000);ocam=new THREE.OrthographicCamera(-1,1,1,-1,-200000,200000);cam=pcam;
  tg=new THREE.Vector3(0,300,0);
  scene.add(new THREE.AmbientLight(0xffffff,.75));const dl=new THREE.DirectionalLight(0xffffff,.55);dl.position.set(1,2,1.4);scene.add(dl);
  P=new THREE.Group();scene.add(P);
  fillMat=new THREE.MeshLambertMaterial({polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1,transparent:false});
  selMat=fillMat.clone();ebMat=new THREE.MeshBasicMaterial({color:0xffb454});grainMat=new THREE.LineBasicMaterial({color:0xc9a063,transparent:true,opacity:.75});lineMat=new THREE.LineBasicMaterial();selLine=new THREE.LineBasicMaterial();dxfMat=new THREE.LineBasicMaterial();
  cv.style.cssText='display:block;width:100%;height:100%;touch-action:none';
  cv.oncontextmenu=e=>e.preventDefault();cv.onpointerdown=onDown;cv.onpointermove=onMove;cv.onpointerup=onUp;
  cv.onwheel=e=>{e.preventDefault();R=Math.max(100,Math.min(30000,R*Math.exp(e.deltaY*.001)));upd()};
  cv.ondblclick=e=>{if(tool==='rotate'||tool==='scale')return;const id=pick(e),p=panels.find(a=>a.id===id);if(p&&!dr)startDraw(p)};
  snapMark=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshBasicMaterial({color:0x5ee1ff,depthTest:false,transparent:true}));snapMark.renderOrder=999;snapMark.visible=false;scene.add(snapMark);
  buildGizmo();Gg=new THREE.Group();scene.add(Gg);rulerMat=new THREE.LineBasicMaterial({color:0xffb454,depthTest:false});
  inited=true;theme();panels.forEach(build);drawLines();drawGuides();
  new ResizeObserver(resize).observe(q('.p3view'));
  (function loop(){if(dirtyR&&isOpen&&mode==='model'){updateGizmo();stretchHandles();if(ruler)rulerLabel();navDraw();renderer.render(scene,cam);dirtyR=false}requestAnimationFrame(loop)})();
}
function place3d(){const m=document.getElementById('menuBar');wrap.style.top=(m?Math.ceil(m.getBoundingClientRect().bottom):0)+'px'}
function open(){
  if(!wrap)initUI();
  mode='model';wrap.classList.remove('cut');isOpen=true;document.body.classList.add('p3On');wrap.style.display='flex';
  {const bc=document.getElementById('modeCutlistBtn');if(bc)bc.classList.remove('active')}
  const b=document.getElementById('modePanel3dBtn');if(b)b.classList.add('active');
  document.getElementById('modeSelectBtn').classList.remove('active');document.getElementById('modeDrawBtn').classList.remove('active');
  place3d();ensure();
  if(!panels.length&&!lines.length&&!open.seen){open.seen=true;demo()}
  if(inited){theme();resize();if(!open.viewed){open.viewed=true;setView('iso')}else upd()}
  iconsDraw();props();list();kzSync();histBtns();dirtyR=true}
function close(){
  if(!isOpen)return;if(dr)endDraw();cancelPlace();
  isOpen=false;mode='model';wrap.classList.remove('cut');document.body.classList.remove('p3On');wrap.style.display='none';
  {const bc=document.getElementById('modeCutlistBtn');if(bc)bc.classList.remove('active')}
  const b=document.getElementById('modePanel3dBtn');if(b)b.classList.remove('active');
  try{if(typeof appMode!=='undefined'){document.getElementById('modeSelectBtn').classList.toggle('active',appMode==='edit');document.getElementById('modeDrawBtn').classList.toggle('active',appMode==='draw')}}catch(e){}
  try{if(typeof draw==='function')draw()}catch(e){}}
function wire3d(){
  window.addEventListener('keydown',onKey,true);
  window.addEventListener('keyup',e=>{if(isOpen&&e.key===' '&&!/INPUT|SELECT|TEXTAREA/.test((e.target||{}).tagName||'')){e.preventDefault();e.stopImmediatePropagation()}},true);
  const b=document.getElementById('modePanel3dBtn');if(!b)return;
  b.addEventListener('click',()=>isOpen&&mode==='model'?close():open());
  const bc=document.getElementById('modeCutlistBtn');if(bc)bc.addEventListener('click',()=>isOpen&&mode==='cut'?close():openCut());
  ['modeSelectBtn','modeDrawBtn'].forEach(id=>document.getElementById(id).addEventListener('click',close));
}
window.Panel3D={retheme:()=>{if(inited)theme()},hotkeys:{commands:P3CMD.map(({id,label})=>({id,label})),defaults:()=>({...P3_DEF}),get:()=>({...p3Keys}),combo:p3combo,validate:p3validate,
    save:o=>{for(const c of P3CMD)if(typeof o[c.id]==='string')p3Keys[c.id]=o[c.id];p3KbSync();try{localStorage.setItem(P3_STORE,JSON.stringify(p3Keys))}catch(e){return false}return true}},undo:()=>histGo(-1),redo:()=>histGo(1),exportOBJ,importOBJ,_edgeMid:(id,i)=>{const p=panels.find(x=>x.id===id),sg=segsOf(p)[i],r=cv.getBoundingClientRect();p.g.updateMatrixWorld(true);const v=p.g.localToWorld(new THREE.Vector3((sg.a[0]+sg.b[0])/2,(sg.a[1]+sg.b[1])/2,0)).project(cam);return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}},_objText:objText,_ebInfo:ebInfo,_edgeSlots:edgeSlots,_clExport:clExportData,_stretch:(id,idx,d)=>{const p=panels.find(x=>x.id===id);applyStretchD(snapBase(p),idx.map(i=>id+':'+i),d);return{x:p.x,y:p.y,z:p.z,w:p.w,h:p.h}},_parseOBJ:parseOBJ,_objToPanels:objToPanels,_pack:packSheets,wire:wire3d,open,close,snapshot,load,isOpen:()=>isOpen,_parseDXF:parseDXF,_state:()=>({panels,lines})};
})();
