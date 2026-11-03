// Panel Types — Bazis "fragment"larining 2D varianti.
// Qadamlar: 1) tur va boshlash burchagi (L1/L2/R1/R2), 2) magnit bilan
// boshlang'ich nuqta, keyin qarama-qarshi burchak (en, Tab, bo'y, Enter),
// 3) ramka/shkaf turlarida ichiga polka: g'ildirak yoki raqam — soni,
// H/V — yo'nalish, Enter/klik — tayyor, Esc/o'ng klik — polkasiz.
// Depth — chizma darajasi (0 dan Z koordinata): Modeling'da fragment shu
// tekislikda joylashadi. Barcha panellar qalinligi t × ko'paytiruvchi.
const PT_TYPES=[
  {id:'block',g:0,n:"Blok (to'liq to'rtburchak)"},
  {id:'v',g:0,n:'Vertikal panel (I)'},
  {id:'L',g:0,n:'L burchak'},
  {id:'h',g:0,n:'Gorizontal panel (—)'},
  {id:'T',g:0,n:'Tik panel + tokcha (⊢)'},
  {id:'r1',g:1,n:"Ramka: tepa va past to'liq"},
  {id:'r2',g:1,n:"Ramka: yon tomonlar to'liq"},
  {id:'r3',g:1,n:"Ramka: tepa to'liq, past yonlar orasida"},
  {id:'r4',g:1,n:"Ramka: past to'liq, tepa yonlar orasida"},
  {id:'c1',g:2,n:"Shkaf: tepa va o'rta to'liq, pastda blok"},
  {id:'c2',g:2,n:"Shkaf: yon tomonlar to'liq, pastda blok"},
  {id:'c3',g:2,n:"Shkaf: tepa to'liq, yonlar pastgacha, pastda blok"},
  {id:'c4',g:2,n:"Shkaf: o'rta to'liq, yonlar tepagacha, pastda blok"}];
const PT_GROUPS=['Asosiy','Ramka','Shkaf'];
const PT_CORNERS=[['L1','Pastki-chap','⌞'],['L2','Yuqori-chap','⌜'],['R1',"Yuqori-o'ng",'⌝'],['R2',"Pastki-o'ng",'⌟']];
let ptType='T',ptCorner='L2',ptLastH=300,ptSDir='h',ptShelf=null;
const ptEl=id=>document.getElementById(id);
const ptT=()=>Math.max(.1,parseFloat(ptEl('ptT')?.value)||16)*Math.max(1,Math.round(parseFloat(ptEl('ptK')?.value)||1));
const ptLevel=()=>{const v=parseFloat(ptEl('ptD')?.value);return isFinite(v)?v:0};
const ptAsk=()=>ptEl('ptSAsk')?ptEl('ptSAsk').checked:true;
const ptDefN=()=>Math.max(0,Math.round(parseFloat(ptEl('ptSN')?.value)||0));
// Bo'yi yozilmagan bo'lsa: sichqoncha bo'yicha, u ham yo'q bo'lsa oxirgi bo'y
function ptAutoH(){
  try{const A=currentDraw&&currentDraw.points[0],m=mouseRawWorld||getPreviewPoint();const h=A&&m?Math.abs(m.y-A.y):0;return h>1?h:ptLastH}catch(e){return ptLastH}}

// Fragment ichidagi to'rtburchaklar [x0,y0,x1,y1], (0,0) — pastki-chap.
// open — polka qo'yiladigan ichki bo'shliq (ramka/shkaf turlarida).
// Shkaf: pastki blok bo'yi 100 mm (PT_BLOCK_H), ustida t qalinlikdagi o'rta panel
const PT_BLOCK_H=100;
function ptLayout(type,W,D,t,bh){
  if(type==='v')W=t;
  if(type==='h')D=t;
  const R=(a,b,c,d)=>[a,b,c,d],m=bh!=null?bh:Math.max(1,Math.min(PT_BLOCK_H,D-2*t-1));let r=[],open=null;
  switch(type){
    case 'block':r=[R(0,0,W,D)];open=R(0,0,W,D);break;   // blok ichiga ham polka: blok polkalar bilan bo'laklarga bo'linadi
    case 'v':case 'h':r=[R(0,0,W,D)];break;
    case 'L':r=[R(0,0,t,D),R(t,0,W,t)];break;
    case 'T':r=[R(0,0,t,D),R(t,(D-t)/2,W,(D+t)/2)];break;
    case 'r1':r=[R(0,D-t,W,D),R(0,0,W,t),R(0,t,t,D-t),R(W-t,t,W,D-t)];open=R(t,t,W-t,D-t);break;
    case 'r2':r=[R(0,0,t,D),R(W-t,0,W,D),R(t,D-t,W-t,D),R(t,0,W-t,t)];open=R(t,t,W-t,D-t);break;
    case 'r3':r=[R(0,D-t,W,D),R(0,0,t,D-t),R(W-t,0,W,D-t),R(t,0,W-t,t)];open=R(t,t,W-t,D-t);break;
    case 'r4':r=[R(0,0,W,t),R(0,t,t,D),R(W-t,t,W,D),R(t,D-t,W-t,D)];open=R(t,t,W-t,D-t);break;
    case 'c1':r=[R(0,D-t,W,D),R(0,m+t,t,D-t),R(W-t,m+t,W,D-t),R(0,m,W,m+t),R(0,0,W,m)];open=R(t,m+t,W-t,D-t);break;
    case 'c2':r=[R(0,0,t,D),R(W-t,0,W,D),R(t,D-t,W-t,D),R(t,m,W-t,m+t),R(t,0,W-t,m)];open=R(t,m+t,W-t,D-t);break;
    case 'c3':r=[R(0,D-t,W,D),R(0,0,t,D-t),R(W-t,0,W,D-t),R(t,m,W-t,m+t),R(t,0,W-t,m)];open=R(t,m+t,W-t,D-t);break;
    case 'c4':r=[R(0,m+t,t,D),R(W-t,m+t,W,D),R(t,D-t,W-t,D),R(0,m,W,m+t),R(0,0,W,m)];open=R(t,m+t,W-t,D-t);break;
  }
  if(open&&(open[2]-open[0]<1e-6||open[3]-open[1]<1e-6))open=null;
  return{W,D,open,rects:r.filter(a=>a[2]-a[0]>1e-6&&a[3]-a[1]>1e-6)};
}
// Ichki bo'shliqqa n ta polka (h — gorizontal, v — vertikal), teng oraliq bilan
function ptShelves(open,n,dir,t){
  if(!open||!(n>0))return[];
  const[x0,y0,x1,y1]=open,L=dir==='v'?x1-x0:y1-y0,gap=(L-n*t)/(n+1);if(gap<=0)return[];
  const out=[];for(let i=0;i<n;i++){const a=gap*(i+1)+t*i;out.push(dir==='v'?[x0+a,y0,x0+a+t,y1]:[x0,y0+a,x1,y0+a+t])}
  return out}
const ptMaxN=(open,dir,t)=>open?Math.max(0,Math.floor(((dir==='v'?open[2]-open[0]:open[3]-open[1])-1)/(t+1))):0;
// A — boshlang'ich (tanlangan burchak), B — qarama-qarshi burchak (en × bo'y).
function ptPlace(A,B,type,corner){
  type=type||ptType;corner=corner||ptCorner;
  const t=ptT(),W=Math.abs(B.x-A.x),H=Math.abs(B.y-A.y);
  if(W<1e-6&&type!=='v')return null;if(H<1e-6&&type!=='h')return null;
  const f=ptLayout(type,W,H,t);
  const o={L1:[A.x,A.y],L2:[A.x,A.y-f.D],R1:[A.x-f.W,A.y-f.D],R2:[A.x-f.W,A.y]}[corner];
  const mv=r=>[o[0]+r[0],o[1]+r[1],o[0]+r[2],o[1]+r[3]];
  return{W:f.W,D:f.D,t,z:ptLevel(),type,origin:o,open:f.open?mv(f.open):null,rects:f.rects.map(mv)};
}
// Blok + polkalar: blok polkalar orasidagi bo'laklarga ajraladi (ustma-ust kontur bo'lmaydi)
function ptBlockSplit(f,sh){
  if(f.type!=='block'||!sh||!sh.length)return f.rects;
  const[x0,y0,x1,y1]=f.rects[0],v=sh[0][0]!==x0||sh[0][2]!==x1,out=[];let a=v?x0:y0;
  for(const r of sh){const b=v?r[0]:r[1];if(b-a>1e-6)out.push(v?[a,y0,b,y1]:[x0,a,x1,b]);a=v?r[2]:r[3]}
  const e=v?x1:y1;if(e-a>1e-6)out.push(v?[a,y0,e,y1]:[x0,a,x1,e]);return out}
function ptPush(f,extra){
  const all=ptBlockSplit(f,extra).concat(extra||[]);
  const gid=(all.length>1&&typeof newGroupId==='function')?newGroupId():null;
  for(const r of all){
    const rp=genRectPts({x:r[0],y:r[1]},{x:r[2],y:r[3]});
    const sh={kind:'rect',closed:true,selected:false,layer:activeLayer,points:rp,grips:rp.map(p=>({x:p.x,y:p.y})),ptype:f.type,ptz:f.z};
    if(gid!==null)sh.group=gid;
    drawnLines.push(sh);
  }
}
function ptCommit(A,B){
  const f=ptPlace(A,B);if(!f||!f.rects.length)return;
  if(f.D>1)ptLastH=f.D;
  if(f.open&&ptAsk()){   // polka bosqichi
    ptShelf={f,dir:ptSDir,n:Math.min(ptDefN(),ptMaxN(f.open,ptSDir,f.t)),typed:''};
    ptShelfHint();return'defer'}
  ptPush(f);
}
function ptShelfHint(){
  const h=ptEl('hint');if(!h||!ptShelf)return;
  h.innerHTML='<b>Polkalar:</b> g\'ildirak yoki raqam — soni &middot; <b>H</b>/<b>V</b> (yoki Tab) — gorizontal/vertikal &middot; <b>Enter</b>/chap klik — tayyor &middot; <b>Esc</b>/o\'ng klik — polkasiz';
}
function ptShelfSet(n){
  if(!ptShelf)return;const s=ptShelf;s.n=Math.max(0,Math.min(ptMaxN(s.f.open,s.dir,s.f.t),n|0));draw()}
function ptShelfDir(d){
  if(!ptShelf)return;ptShelf.dir=d;ptSDir=d;ptRefresh();ptShelfSet(ptShelf.n)}
function ptShelfFinish(keep){
  const s=ptShelf;if(!s)return;ptShelf=null;
  ptPush(s.f,keep?ptShelves(s.f.open,s.n,s.dir,s.f.t):[]);
  if(keep&&s.n>0&&ptEl('ptSN'))ptEl('ptSN').value=s.n;
  try{detectCorners();renderList()}catch(e){}
  pushHistory();renderDrawnList();
  const h=ptEl('hint');if(h)h.textContent='Fragment qo\'yildi'+(keep&&s.n?': '+s.n+' ta '+(s.dir==='v'?'vertikal':'gorizontal')+' polka':'')+'.';
  draw();
}
function ptRectsPath(c,rects,sp){
  for(const r of rects){const p=sp(r[0],r[1]),q=sp(r[2],r[3]);const x=Math.min(p.x,q.x),y=Math.min(p.y,q.y),w=Math.abs(q.x-p.x),h=Math.abs(q.y-p.y);c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h)}}
function ptypePreview(c,A,B){
  const f=ptPlace(A,B);
  const sp=(x,y)=>toScreen({x,y});
  c.save();
  if(f){
    const o=f.origin;
    // umumiy chegara
    const a=sp(o[0],o[1]),b=sp(o[0]+f.W,o[1]+f.D);
    c.strokeStyle='rgba(255,205,90,.55)';c.lineWidth=1;c.setLineDash([4,4]);
    c.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));
    // panellar
    c.strokeStyle='rgba(94,225,255,.85)';c.fillStyle='rgba(94,225,255,.10)';c.lineWidth=2;c.setLineDash([6,4]);
    ptRectsPath(c,f.rects,sp);
    c.setLineDash([]);
    // burchak belgilari
    const cs={L1:[o[0],o[1]],L2:[o[0],o[1]+f.D],R1:[o[0]+f.W,o[1]+f.D],R2:[o[0]+f.W,o[1]]};
    c.font='11px sans-serif';
    for(const k in cs){
      const s=sp(cs[k][0],cs[k][1]),on=k===ptCorner;
      c.fillStyle=on?'#ffcd5a':'rgba(220,230,245,.7)';
      c.beginPath();c.arc(s.x,s.y,on?5:3,0,Math.PI*2);c.fill();
      c.fillText(k,s.x+(k[0]==='L'?-18:6),s.y+(k==='L1'||k==='R2'?14:-6));
    }
    const m=sp(o[0]+f.W/2,o[1]+f.D);
    c.fillStyle='#ffcd5a';c.fillText(Math.round(f.W)+' × '+Math.round(f.D)+' · t'+f.t+' · Z '+f.z,m.x-40,m.y-8);
  }
  c.restore();
}
// Polka bosqichi: fragment + polkalar + yorliq
function ptShelfDraw(c){
  const s=ptShelf;if(!s)return;
  const sp=(x,y)=>toScreen({x,y}),f=s.f;
  c.save();
  c.strokeStyle='rgba(94,225,255,.9)';c.fillStyle='rgba(94,225,255,.12)';c.lineWidth=2;
  const sh=ptShelves(f.open,s.n,s.dir,f.t);
  ptRectsPath(c,ptBlockSplit(f,sh),sp);
  c.strokeStyle='#ffcd5a';c.fillStyle='rgba(255,205,90,.30)';ptRectsPath(c,sh,sp);
  c.setLineDash([4,4]);c.strokeStyle='rgba(255,205,90,.6)';c.lineWidth=1;
  const p=sp(f.open[0],f.open[1]),q=sp(f.open[2],f.open[3]);c.strokeRect(Math.min(p.x,q.x),Math.min(p.y,q.y),Math.abs(q.x-p.x),Math.abs(q.y-p.y));
  c.setLineDash([]);
  const L=s.dir==='v'?f.open[2]-f.open[0]:f.open[3]-f.open[1],gap=s.n>0?(L-s.n*f.t)/(s.n+1):L;
  const txt='Polka: '+s.n+(s.typed?'_':'')+' · '+(s.dir==='v'?'vertikal |':'gorizontal —')+' · oraliq '+gap.toFixed(1)+' mm';
  const m=sp((f.open[0]+f.open[2])/2,f.open[3]);
  c.font='bold 13px sans-serif';const w=c.measureText(txt).width+16;
  c.fillStyle='rgba(11,18,32,.88)';c.fillRect(m.x-w/2,m.y-30,w,22);
  c.strokeStyle='#ffcd5a';c.strokeRect(m.x-w/2,m.y-30,w,22);
  c.fillStyle='#ffcd5a';c.fillText(txt,m.x-w/2+8,m.y-14);
  c.restore();
}
function ptIcon(type){
  const cab=type[0]==='c',W=cab?11:20,D=cab?18:16,t=cab?2:3.4,ox=(24-W)/2,oy=(20-D)/2;
  const f=ptLayout(type,W,D,t,cab?7:null);
  const rs=f.rects.map(r=>`<rect x="${(ox+r[0]).toFixed(1)}" y="${(oy+D-r[3]).toFixed(1)}" width="${(r[2]-r[0]).toFixed(1)}" height="${(r[3]-r[1]).toFixed(1)}"/>`).join('');
  return `<svg viewBox="0 0 24 20" fill="currentColor" fill-opacity=".35" stroke="currentColor" stroke-width=".7">${rs}</svg>`;
}
function ptRefresh(){
  if(ptShelf&&typeof drawTool!=='undefined'&&drawTool!=='ptype')ptShelfFinish(true);
  const pop=ptEl('ptPop');if(!pop)return;
  pop.querySelectorAll('[data-pt]').forEach(b=>b.classList.toggle('active',b.dataset.pt===ptType));
  pop.querySelectorAll('[data-pc]').forEach(b=>b.classList.toggle('active',b.dataset.pc===ptCorner));
  pop.querySelectorAll('[data-sd]').forEach(b=>b.classList.toggle('active',b.dataset.sd===ptSDir));
  const on=typeof drawTool!=='undefined'&&drawTool==='ptype';
  ptEl('ptToggle')?.classList.toggle('active',on);
  const nm=ptEl('ptName');if(nm){const ty=PT_TYPES.find(x=>x.id===ptType)||{g:0};nm.textContent=(ty.g===1?'Ramka'+ptType[1]:ty.g===2?'Shkaf'+ptType[1]:ptType.toUpperCase())+' · '+ptCorner}
}
function ptClose(){const p=ptEl('ptPop');if(p)p.hidden=true}
function ptInit(){
  if(ptEl('ptGroup'))return;
  const anchor=ptEl('deleteLineBtn')?.closest('.dtGroup')||ptEl('toolGroup');
  if(!anchor||typeof anchor.insertAdjacentElement!=='function')return;
  const g=document.createElement('div');
  g.className='dtGroup';g.id='ptGroup';g.style.display='none';
  const grp=k=>PT_TYPES.filter(t=>t.g===k).map(t=>`<button class="dtBtn ptBtn" data-pt="${t.id}" title="${t.n}">${ptIcon(t.id)}</button>`).join('');
  const cors=PT_CORNERS.map(c=>`<button class="dtBtn ptCor" data-pc="${c[0]}" title="${c[1]}">${c[0]} ${c[2]}</button>`).join('');
  g.innerHTML=`<button class="dtBtn" id="ptToggle" title="Panel Types — fragment chizish (Bazis fragmentlarining 2D varianti)">▦ Panel Types ▾ <span class="ptName" id="ptName"></span></button>
    <label class="ptF" title="Depth — chizma darajasi: 0 dan boshlab Z koordinata (mm). Modeling'da fragment shu tekislikda turadi (masalan 0 va 100 — 100 mm farqli ikki tekislik)">Depth <input id="ptD" type="number" value="0" step="1"></label>
    <label class="ptF" title="Panel qalinligi (mm)">t <input id="ptT" type="number" value="16" min="0.1" step="0.1"></label>
    <label class="ptF" title="Qalinlikni ko'paytirish (masalan ×2 = 32 mm)">× <input id="ptK" type="number" value="1" min="1" step="1"></label>
    <div class="ptPop" id="ptPop" hidden>
      <div class="ptSec"><span class="ptNum">1</span><span class="ptLbl">Tur</span>
        <div class="ptTypes">${PT_GROUPS.map((n,k)=>`<div class="ptTg"><span class="ptTgN">${n}</span><div class="ptTgB">${grp(k)}</div></div>`).join('')}</div></div>
      <div class="ptSec"><span class="ptNum">2</span><span class="ptLbl">Boshlash nuqtasi</span>${cors}<span class="ptHint">keyin: en, Tab, bo'y, Enter</span></div>
      <div class="ptSec"><span class="ptNum">3</span><span class="ptLbl">Ichki polka</span>
        <button class="dtBtn ptSd" data-sd="h" title="Gorizontal polkalar (H)">— Gorizontal</button>
        <button class="dtBtn ptSd" data-sd="v" title="Vertikal to'siqlar (V)">| Vertikal</button>
        <label class="ptF" title="Boshlang'ich polka soni (keyin g'ildirak bilan o'zgartiriladi)">soni <input id="ptSN" type="number" value="0" min="0" step="1"></label>
        <label class="ptChk" title="Blok, ramka yoki shkaf qo'yilgandan keyin polka sonini so'rash"><input id="ptSAsk" type="checkbox" checked> chizgandan keyin so'rash</label></div>
      <div class="ptFoot">Blok/ramka/shkaf qo'yilgach: <b>g'ildirak</b> yoki <b>raqam</b> — polka soni, <b>H/V</b> — yo'nalish, <b>Enter</b> — tayyor, <b>Esc</b> — polkasiz. Polka qalinligi = t × ko'paytiruvchi.</div>
    </div>`;
  anchor.insertAdjacentElement('afterend',g);
  const pop=ptEl('ptPop');
  ptEl('ptToggle').addEventListener('click',e=>{e.stopPropagation();pop.hidden=!pop.hidden;ptRefresh()});
  pop.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    const toDraw=()=>{if(typeof appMode!=='undefined'&&appMode!=='draw')setAppMode('draw')};
    if(b.dataset.pt){ptType=b.dataset.pt;toDraw();setDrawTool('ptype');ptClose()}
    else if(b.dataset.pc){ptCorner=b.dataset.pc;toDraw();if(drawTool!=='ptype')setDrawTool('ptype');ptRefresh();draw()}
    else if(b.dataset.sd){ptSDir=b.dataset.sd;if(ptShelf)ptShelfDir(ptSDir);ptRefresh()}
  });
  document.addEventListener('mousedown',e=>{if(!pop.hidden&&!g.contains(e.target))ptClose()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!pop.hidden){e.preventDefault();e.stopImmediatePropagation();ptClose()}},true);
  g.querySelectorAll('input').forEach(i=>{
    i.addEventListener('input',()=>draw());
    i.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation()});
  });
  // Polka bosqichi: klaviatura, g'ildirak, sichqoncha (boshqa ishlovchilardan oldin)
  const stop=e=>{e.preventDefault();e.stopImmediatePropagation()};
  window.addEventListener('keydown',e=>{
    const s=ptShelf;if(!s)return;
    if(e.target&&/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
    const k=e.key;
    if(/^[0-9]$/.test(k)){stop(e);s.typed=(s.typed+k).slice(-3);ptShelfSet(parseInt(s.typed,10))}
    else if(k==='Backspace'){stop(e);s.typed=s.typed.slice(0,-1);ptShelfSet(parseInt(s.typed||'0',10))}
    else if(k==='h'||k==='H'){stop(e);ptShelfDir('h')}
    else if(k==='v'||k==='V'){stop(e);ptShelfDir('v')}
    else if(k==='Tab'){stop(e);ptShelfDir(s.dir==='h'?'v':'h')}
    else if(k==='ArrowUp'||k==='+'||k==='='){stop(e);s.typed='';ptShelfSet(s.n+1)}
    else if(k==='ArrowDown'||k==='-'){stop(e);s.typed='';ptShelfSet(s.n-1)}
    else if(k==='Enter'){stop(e);ptShelfFinish(true)}
    else if(k==='Escape'){stop(e);ptShelfFinish(false)}
    else if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&k.length===1)stop(e);   // boshqa hotkeylar bu bosqichda ishlamaydi
  },true);
  const onCv=e=>e.target&&e.target.id==='cv';
  window.addEventListener('wheel',e=>{if(!ptShelf||!onCv(e)||e.ctrlKey)return;e.preventDefault();e.stopImmediatePropagation();ptShelf.typed='';ptShelfSet(ptShelf.n+(e.deltaY<0?1:-1))},{capture:true,passive:false});
  window.addEventListener('mousedown',e=>{if(!ptShelf||!onCv(e))return;stop(e);ptShelfFinish(e.button!==2)},true);
  ptRefresh();
}
try{ptInit()}catch(e){console.warn('Panel Types init:',e)}
