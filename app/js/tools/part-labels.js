/* ==========================================================================
   js/tools/part-labels.js — CNC sahifasidagi detallar: raqam/nom yozuvi va birkalar (A4 stiker)

   Modeling ▸ «CNC'ga yuborish» har detal konturiga p3 = {no, n, w, h, L, W, t, mat, eb, ebs, holes, q} yozadi
   (L × W — Cutlist kabi: uzunlik tekstura bo'ylab yoki uzun tomon; w, h — panel o'z yo'nalishida, kromka sxemasi uchun).
   - Nesting xaritasida (Drawing/Cnc) har detal o'rtasida «#3 A. chap boka / 720×500» — kontur bilan birga ko'chadi
     (alohida shakl emas, har chizishda konturdan hisoblanadi). DXF eksportda LABEL qatlamida TEXT.
   - «🏷 Birkalar»: A4 stiker varaq (24 / 21 / 14 / 40 katak), raqam, nom, o'lcham, material, kromka sxemasi, list raqami,
     buyurtma nomi. Chop etish (brauzer/Electron print) yoki HTML fayl.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi (global scope).
   ========================================================================== */
const PL_LAYOUTS={
  '24':{n:'24 ta — 70×37 mm (3×8)',cols:3,rows:8,w:70,h:37,mx:0,my:0.5,gx:0,gy:0},
  '21':{n:'21 ta — 70×42.3 mm (3×7)',cols:3,rows:7,w:70,h:42.3,mx:0,my:0.45,gx:0,gy:0},
  '14':{n:'14 ta — 105×42.3 mm (2×7)',cols:2,rows:7,w:105,h:42.3,mx:0,my:0.45,gx:0,gy:0},
  '40':{n:'40 ta — 52.5×29.7 mm (4×10)',cols:4,rows:10,w:52.5,h:29.7,mx:0,my:0,gx:0,gy:0}};
const PL_STORE='rugby.labels.v1';
function plPrefs(){try{return Object.assign({lay:'24',order:'',skip:0},JSON.parse(localStorage.getItem(PL_STORE)||'{}'))}catch(e){return{lay:'24',order:'',skip:0}}}
function plSave(o){try{localStorage.setItem(PL_STORE,JSON.stringify(o))}catch(e){}}
// Joriy sahifadagi detallar (raqam tartibida); raqam bo'lmasa (eski sahifa) — tartib bo'yicha beriladi
function partList(){
  const cs=drawnLines.filter(l=>l.p3&&l.points&&l.points.length>2),sheets=(typeof nestSheets!=='undefined'&&nestSheets)||[];
  const out=cs.map((l,i)=>{const b=shapeBBox(l),cx=(b.x0+b.x1)/2,cy=(b.y0+b.y1)/2,s=sheets.findIndex(r=>cx>=r.x0&&cx<=r.x1&&cy>=r.y0&&cy<=r.y1);
    return Object.assign({},l.p3,{no:l.p3.no||i+1,shape:l,b,sheet:s>=0?s+1:0,sheets:sheets.length,sel:!!l.selected||drawnLines.some(x=>x.selected&&x.group&&x.group===l.group)})});
  return out.sort((a,b)=>a.no-b.no)}
const plTxt=s=>String(s==null?'':s);
const plNum=v=>String(+(+v).toFixed(1));
/* --- nesting xaritasidagi yozuv (har kadrda) --- */
function drawPartLabels(){
  if(typeof drawnLines==='undefined'||!drawnLines.some(l=>l.p3))return;
  const light=typeof themeIsLight==='function'&&themeIsLight();
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of partList()){const lay=layerOf(p.shape);if(p.shape.hidden||(lay&&lay.visible===false))continue;
    const b=p.b,bw=b.x1-b.x0,bh=b.y1-b.y0,hW=Math.min(60,Math.max(8,Math.min(bw,bh)/7)),px=hW*view.scale;if(px<4)continue;
    const c=toScreen({x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2}),maxW=bw*view.scale*.9;
    ctx.fillStyle=light?'rgba(20,40,70,.85)':'rgba(255,214,140,.92)';
    ctx.font=`600 ${px.toFixed(1)}px system-ui,"Segoe UI",sans-serif`;
    const t1=`#${p.no} ${plTxt(p.n)}`;ctx.fillText(ctx.measureText(t1).width>maxW?'#'+p.no:t1,c.x,c.y-px*.6);
    ctx.font=`${(px*.8).toFixed(1)}px system-ui,"Segoe UI",sans-serif`;ctx.fillStyle=light?'rgba(20,40,70,.7)':'rgba(220,230,245,.75)';
    const t2=`${plNum(p.L||p.w)}×${plNum(p.W||p.h)}${p.sheet?' · L'+p.sheet:''}`;if(ctx.measureText(t2).width<=maxW)ctx.fillText(t2,c.x,c.y+px*.6)}
  ctx.restore()}
/* --- DXF: LABEL qatlamida TEXT (kesilmaydi) --- */
function partLabelsDXF(){
  let s='';for(const p of partList()){const b=p.b,h=Math.min(40,Math.max(6,Math.min(b.x1-b.x0,b.y1-b.y0)/8)),x=b.x0+h,y=(b.y0+b.y1)/2;
    const t=s2=>String(s2).replace(/[\r\n]+/g,' ');
    s+='0\nTEXT\n8\nLABEL\n10\n'+x+'\n20\n'+(y+h*.3)+'\n30\n0\n40\n'+h+'\n1\n'+t('#'+p.no+' '+p.n)+'\n';
    s+='0\nTEXT\n8\nLABEL\n10\n'+x+'\n20\n'+(y-h*1.2)+'\n30\n0\n40\n'+(h*.8)+'\n1\n'+t(plNum(p.L||p.w)+'x'+plNum(p.W||p.h)+'x'+plNum(p.t)+(p.sheet?' L'+p.sheet:''))+'\n'}
  return s}
/* --- birka --- */
const plEsc=s=>plTxt(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function plEdgeSvg(p){   // to'rtburchak panel: kromka qirralari qalin (0 past, 1 o'ng, 2 tepa, 3 chap — panel o'z yo'nalishida)
  if(!p.ebs||p.ebs.length!==4)return'';const W=34,H=Math.max(10,Math.min(26,34*p.h/p.w)),x0=3,y0=3,e=p.ebs;
  const L=(i,a,b,c,d)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#000" stroke-width="${e[i]>0?3:.6}"${e[i]>0?'':' stroke-dasharray="1.5 1.5"'}/>`;
  return `<svg class="plEb" viewBox="0 0 40 ${H+6}" width="40" height="${H+6}">${L(0,x0,y0+H,x0+W,y0+H)}${L(1,x0+W,y0+H,x0+W,y0)}${L(2,x0+W,y0,x0,y0)}${L(3,x0,y0,x0,y0+H)}</svg>`}
function plEbTxt(p){   // «1 mm — 2 tomon, 0.4 mm — 1 tomon»; to'rtburchak bo'lmasa — Cutlist yozuvi
  if(p.ebs&&p.ebs.length){const m={};p.ebs.forEach(t=>{if(t>0)m[t]=(m[t]||0)+1});const k=Object.keys(m).sort((a,b)=>b-a);return k.length?k.map(t=>`${+t} mm — ${m[t]} tomon`).join(', '):"yo'q"}
  return p.eb&&p.eb!=='-'?p.eb:"yo'q"}
function plCell(p,order){
  return `<div class="plNo">#${p.no}</div><div class="plN">${plEsc(p.n)}</div>
    <div class="plD"><b>${plNum(p.L||p.w)} × ${plNum(p.W||p.h)} × ${plNum(p.t)}</b> ${plEsc(p.mat||'')}</div>
    <div class="plK">${plEdgeSvg(p)}<span>Kromka: ${plEsc(plEbTxt(p))}${p.holes?` · teshik ${p.holes}${p.side==='B'?' (B tomon tepada)':''}`:''}</span></div>
    <div class="plF">${plEsc(order||'')}${p.sheet?` · List ${p.sheet}/${p.sheets}`:''}</div>`}
const PL_CSS=`.plSheet{width:210mm;height:297mm;position:relative;box-sizing:border-box;background:#fff;color:#000;overflow:hidden;font-family:Arial,"Segoe UI",sans-serif;page-break-after:always;break-after:page}
.plSheet:last-child{page-break-after:auto;break-after:auto}
.plCell{position:absolute;box-sizing:border-box;padding:2.2mm 3mm;overflow:hidden;display:flex;flex-direction:column;gap:.6mm;line-height:1.15}
.plCell.empty{visibility:hidden}.plNo{position:absolute;right:3mm;top:2mm;font-size:5.2mm;font-weight:800}
.plN{font-size:3.6mm;font-weight:700;padding-right:12mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.plD{font-size:3.1mm}.plD b{font-size:3.4mm}
.plK{display:flex;align-items:center;gap:1.5mm;font-size:2.6mm}.plEb{flex:none}.plF{font-size:2.5mm;color:#333;margin-top:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
function plSheetsHTML(parts,lay,order,skip,guides){
  const L=PL_LAYOUTS[lay]||PL_LAYOUTS['24'],per=L.cols*L.rows,cells=[...new Array(Math.max(0,skip|0)).fill(null),...parts],pages=[];
  const ox=(210-L.cols*L.w)/2,oy=(297-L.rows*L.h)/2;
  for(let i=0;i<cells.length;i+=per){let h='';
    for(let k=0;k<per;k++){const p=cells[i+k],c=k%L.cols,r=Math.floor(k/L.cols),st=`left:${(ox+c*L.w).toFixed(2)}mm;top:${(oy+r*L.h).toFixed(2)}mm;width:${L.w}mm;height:${L.h}mm${guides?';outline:.2mm dashed #bbb':''}`;
      h+=p?`<div class="plCell" style="${st}">${plCell(p,order)}</div>`:(i+k<cells.length||guides?`<div class="plCell${p===null?' empty':''}" style="${st}"></div>`:'')}
    pages.push(`<div class="plSheet">${h}</div>`)}
  return pages.join('')}
function plHTMLDoc(parts,lay,order,skip){
  return `<!doctype html><html><head><meta charset="utf-8"><title>Birkalar ${plEsc(order)}</title><style>@page{size:A4;margin:0}html,body{margin:0;background:#888}${PL_CSS}
@media screen{.plSheet{margin:10mm auto;box-shadow:0 2px 10px rgba(0,0,0,.4)}}@media print{html,body{background:#fff}}</style></head><body>${plSheetsHTML(parts,lay,order,skip,false)}</body></html>`}
function openPartLabels(){
  const all=partList();
  if(!all.length){if(typeof setHint==='function')setHint('Birka uchun detal yo\'q — Modeling ▸ Furnitura (Alt+F) ▸ «CNC\'ga yuborish» bilan yaratilgan CNC sahifasini oching.');return false}
  const pr=plPrefs();
  let d=document.getElementById('plDlg');if(d)d.remove();
  d=document.createElement('div');d.id='plDlg';d.className='plDlg';d.setAttribute('role','dialog');d.setAttribute('aria-label','Birkalar');
  document.body.appendChild(d);
  const anySel=all.some(p=>p.sel);
  d.innerHTML=`<div class="plBar"><b>Birkalar — A4 stiker</b>
    <label>Varaq <select id="plLay">${Object.entries(PL_LAYOUTS).map(([k,v])=>`<option value="${k}"${k===pr.lay?' selected':''}>${v.n}</option>`).join('')}</select></label>
    <label>Buyurtma <input id="plOrder" value="${plEsc(pr.order)}" placeholder="masalan Oshxona-12"></label>
    <label title="Avval ishlatilgan varaqdagi bo'sh kataklardan boshlash">O'tkazib yuborish <input id="plSkip" inputmode="numeric" value="${pr.skip||0}" style="width:48px"></label>
    <label><input type="checkbox" id="plOnlySel"${anySel?' checked':''}${anySel?'':' disabled'}> Faqat tanlanganlar</label>
    <span style="flex:1"></span><button id="plPrint" class="on">🖨 Chop etish</button><button id="plSave">HTML fayl</button><button id="plClose">✕</button></div>
    <p class="plInfo" id="plInfo"></p><div class="plPrev" id="plPrev"></div>`;
  const get=()=>{const o={lay:d.querySelector('#plLay').value,order:d.querySelector('#plOrder').value.trim().slice(0,60),skip:Math.max(0,Math.min(200,parseInt(d.querySelector('#plSkip').value,10)||0))};plSave(o);return o};
  const parts=()=>{const s=d.querySelector('#plOnlySel').checked;return all.filter(p=>!s||p.sel)};
  const render=()=>{const o=get(),ps=parts(),L=PL_LAYOUTS[o.lay],n=Math.ceil((ps.length+o.skip)/(L.cols*L.rows));
    d.querySelector('#plPrev').innerHTML=plSheetsHTML(ps,o.lay,o.order,o.skip,true);
    d.querySelector('#plInfo').textContent=`${ps.length} ta birka · ${n} varaq A4 (${L.w}×${L.h} mm). Printerda: qog'oz A4, masshtab 100% («Fit to page» o'chiq), chetlar — yo'q / minimal.`};
  d.addEventListener('change',render);d.addEventListener('input',render);
  d.querySelector('#plClose').onclick=()=>d.remove();
  d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();d.remove()}});
  d.querySelector('#plSave').onclick=()=>{const o=get();try{downloadFile(plHTMLDoc(parts(),o.lay,o.order,o.skip),'birkalar'+(o.order?'-'+o.order.replace(/[^\w\-]+/g,'_'):'')+'.html','text/html')}catch(e){}};
  d.querySelector('#plPrint').onclick=()=>{const o=get();let host=document.getElementById('plPrintHost');if(!host){host=document.createElement('div');host.id='plPrintHost';document.body.appendChild(host)}
    host.innerHTML=`<style>@page{size:A4;margin:0}</style>`+plSheetsHTML(parts(),o.lay,o.order,o.skip,false);document.body.classList.add('plPrinting');
    const done=()=>{document.body.classList.remove('plPrinting');host.innerHTML='';window.removeEventListener('afterprint',done)};window.addEventListener('afterprint',done);
    try{window.print()}catch(e){done();alert("Chop etish bu ko'rinishda ochilmadi — «HTML fayl» ni saqlab, brauzerda oching va Ctrl+P.")}setTimeout(()=>{if(document.body.classList.contains('plPrinting')&&!matchMedia('print').matches)done()},1500)};
  render();return true}
(function(){if(!document.head||typeof document.head.appendChild!=='function')return;   // testlardagi DOM o'rinbosarida head yo'q
  const st=document.createElement('style');st.textContent=PL_CSS+`
.plDlg{position:fixed;inset:24px;z-index:2000;display:flex;flex-direction:column;background:var(--panel,#111b2e);color:var(--text,#dce6f5);border:1px solid var(--ui-line,#2a3b58);border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.5);font:13px/1.35 system-ui,"Segoe UI",sans-serif}
.plBar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--ui-line,#2a3b58)}.plBar label{display:flex;gap:5px;align-items:center;color:var(--text-dim,#93a3bd)}
.plBar input,.plBar select{width:auto;background:var(--panel-2,#16233b);color:inherit;border:1px solid var(--ui-line,#2a3b58);border-radius:5px;padding:4px 6px;font:inherit}
.plBar button{width:auto;padding:5px 10px;border-radius:6px;border:1px solid var(--ui-line,#2a3b58);background:var(--panel-2,#16233b);color:inherit;cursor:pointer;font:inherit}.plBar button.on{border-color:#ffb454;color:#ffb454}
.plInfo{margin:6px 12px;color:var(--text-dim,#93a3bd)}.plPrev{flex:1;overflow:auto;background:#5b6470;padding:6mm 0}.plPrev .plSheet{margin:0 auto 6mm;box-shadow:0 2px 10px rgba(0,0,0,.4)}
#plPrintHost{display:none}
@media print{body.plPrinting>*:not(#plPrintHost){display:none!important}body.plPrinting #plPrintHost{display:block}body.plPrinting{background:#fff!important}}`;
  document.head.appendChild(st)})();
{const b=document.getElementById('nestLabelsBtn');if(b)b.addEventListener('click',()=>openPartLabels())}
