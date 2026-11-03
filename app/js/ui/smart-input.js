/* ==========================================================================
   js/ui/smart-input.js — Smart kiritish (Rugby 1.1.2)
   Har bir matn/raqam maydoni oxirgi kiritilgan qiymatlarni eslab qoladi va yozish boshlanganda
   davomini taklif qiladi (Google qidiruvidagi kabi): «ch» → «chap boka», «3» → «3040».
   - Hamma <input> (va matn oynasi) ga o'zi ulanadi — asbob kodiga tegmaydi.
   - Tarix maydon turi bo'yicha: nom, material, izoh, matn, raqam; har birida oxirgi N ta (standart 15).
   - Tab yoki → — kulrang davomni qabul qilish; ↓/↑ — ro'yxat; ro'yxatdan tanlab Enter — qabul + tasdiq;
     Esc — ro'yxatni yopish. Oddiy Enter o'zgarmaydi (Drawing'da buyruqni tasdiqlaydi).
   - Chizma sozlamalari (o'lcham matni, aniqlik, birlik, matn balandligi) ham eslab qolinadi.
   Saqlash: localStorage (loyiha fayliga yozilmaydi). Sozlamalar: Edit ▸ Smart kiritish…
   Bu fayl boshqa skriptlardan oldin yuklanadi: keydown tinglovchisi birinchi bo'lishi kerak.
   ========================================================================== */
(function(){
'use strict';
const STORE='rugby.smart.v1',PREFS='rugby.prefs.v1';
const DICT={name:["chap boka","o'ng boka","krisha","dno","polka","oraliq boka","orqa devor","fasad"]};
const REMEMBER=['dimTextSize','dimPrecision','dimUnit','textSize'];   // har ochilganda qayta o'zgartirmaslik uchun
let cfg={on:true,n:15,h:{}};
try{const o=JSON.parse(localStorage.getItem(STORE)||'null');if(o&&typeof o==='object'){cfg.on=o.on!==false;cfg.n=Math.max(5,Math.min(50,+o.n||15));cfg.h=o.h&&typeof o.h==='object'?o.h:{}}}catch(e){}
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(cfg))}catch(e){}};
// apostrof variantlari (o' o‘ oʻ o`) va katta-kichik harf farqi hisobga olinmaydi
const norm=s=>String(s).toLocaleLowerCase().replace(/[‘’ʻʼ`´]/g,"'").replace(/,/g,'.').trim();

function catOf(el){
  if(!el||el.disabled||el.readOnly)return null;
  if(el.closest&&el.closest('#shortcutDialog,#smartDialog'))return null;   // hotkey yozish maydonlari
  if(el.dataset&&el.dataset.smart)return el.dataset.smart==='off'?null:el.dataset.smart;
  if(el.tagName==='TEXTAREA')return el.id==='askInput'?'text':null;
  if(el.tagName!=='INPUT')return null;
  const t=(el.getAttribute('type')||'text').toLowerCase();if(t!=='text'&&t!=='number'&&t!=='search')return null;
  const id=el.id||'',f=el.dataset?el.dataset.f:'';
  if(id==='p3f_n'||id==='p3pm_n'||f==='n')return 'name';
  if(f==='mat'||/mat/i.test(id))return 'mat';
  if(f==='note')return 'note';
  if(t==='number'||el.inputMode==='decimal'||el.getAttribute('inputmode')==='decimal'||f==='q'||f==='t')return 'num';
  return id?'f:'+id:null}

function remember(cat,v){
  v=String(v).trim();if(!cat||!v)return;
  if(cat==='num'){if(!/^-?\d+(?:[.,]\d+)?$/.test(v)||v.replace(/^-/,'').length<2)return;v=v.replace(',','.')}   // 0, 1 kabi bir xonali qiymatlar taklifga arzimaydi
  else if(v.length<2)return;
  const a=(cfg.h[cat]||[]).filter(x=>norm(x)!==norm(v));a.unshift(v);cfg.h[cat]=a.slice(0,cfg.n);save()}

function suggest(cat,typed,all){   // all — bo'sh maydonda ↓: oxirgi qiymatlar
  const t=norm(typed);if(!t&&!all)return[];
  const pool=[...(cfg.h[cat]||[]),...(DICT[cat]||[]).map(v=>({v,d:1}))],seen=new Set(),pre=[],mid=[];
  for(const it of pool){const v=typeof it==='string'?it:it.v,n=norm(v);if(seen.has(n)||n===t)continue;seen.add(n);
    const o={v,d:typeof it!=='string'};if(n.startsWith(t))pre.push(o);else if(cat!=='num'&&t.length>1&&n.includes(t))mid.push(o)}   // «ichida bor» — 2+ harfdan
  return pre.concat(mid).slice(0,8)}

/* ---------- ko'rinish: kulrang davom (ghost) va ro'yxat ---------- */
let box=null,ghost=null,cur=null,items=[],hi=-1,nav=false;
function ensureUI(){
  if(box)return;
  box=document.createElement('div');box.id='smartList';box.className='smartList';box.hidden=true;box.setAttribute('role','listbox');
  ghost=document.createElement('div');ghost.id='smartGhost';ghost.className='smartGhost';ghost.hidden=true;
  document.body.append(box,ghost);
  box.addEventListener('mousedown',e=>{const li=e.target.closest('[data-i]');if(!li)return;e.preventDefault();accept(+li.dataset.i,true)})}
function hide(){if(box){box.hidden=true;ghost.hidden=true}items=[];hi=-1;nav=false}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function show(el,all){
  ensureUI();cur=el;const cat=catOf(el);
  if(!cfg.on||!cat){hide();return}
  const typed=el.value;items=suggest(cat,typed,all);hi=-1;nav=false;
  if(!items.length){hide();return}
  const r=el.getBoundingClientRect(),t=norm(typed);
  box.innerHTML=items.map((o,i)=>{const n=norm(o.v),k=n.startsWith(t)?t.length:0;
    return `<div class="smartIt" data-i="${i}" role="option"><b>${esc(o.v.slice(0,k))}</b>${esc(o.v.slice(k))}${o.d?'<span>lug\'at</span>':''}</div>`}).join('');
  box.style.left=Math.round(r.left)+'px';box.style.top=Math.round(r.bottom+2)+'px';box.style.minWidth=Math.max(140,Math.round(r.width))+'px';box.hidden=false;
  // kulrang davom: faqat boshlanishi mos kelsa va kursor oxirida bo'lsa (bitta qatorli maydon)
  const g=t&&items.find(o=>norm(o.v).startsWith(t));
  if(g&&el.tagName==='INPUT'&&el.selectionStart===typed.length&&el.scrollWidth<=el.clientWidth+1){
    const cs=getComputedStyle(el);
    ghost.style.cssText=`left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;font:${cs.font};letter-spacing:${cs.letterSpacing};`+
      `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft};border:${cs.borderTopWidth} solid transparent;text-align:${cs.textAlign};line-height:${r.height-parseFloat(cs.borderTopWidth)*2-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)}px`;
    ghost.innerHTML=`<i>${esc(typed)}</i>${esc(g.v.slice(typed.length))}`;ghost.hidden=false;ghost.dataset.v=g.v}
  else{ghost.hidden=true;ghost.dataset.v=''}}
function mark(){if(!box)return;[...box.children].forEach((c,i)=>c.classList.toggle('on',i===hi));const c=box.children[hi];if(c&&c.scrollIntoView)c.scrollIntoView({block:'nearest'});ghost.hidden=true}
function accept(i,commit){
  const el=cur;if(!el)return;const v=i>=0&&items[i]?items[i].v:ghost.dataset.v;if(!v){hide();return}
  el.value=v;try{el.setSelectionRange(v.length,v.length)}catch(e){}
  el.dispatchEvent(new Event('input',{bubbles:true}));hide();
  if(commit){el.dispatchEvent(new Event('change',{bubbles:true}))}}

/* ---------- hodisalar (capture: boshqa tinglovchilardan oldin) ---------- */
window.addEventListener('keydown',e=>{
  const el=e.target;
  if(e.key==='ArrowDown'&&cfg.on&&!e.altKey&&!e.ctrlKey&&el&&el.value===''&&catOf(el)&&(!box||box.hidden||el!==cur)){show(el,true);if(items.length){e.preventDefault();e.stopImmediatePropagation()}return}
  if(el!==cur||!box||box.hidden||e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key,stop=()=>{e.preventDefault();e.stopImmediatePropagation()};
  if(k==='ArrowDown'){hi=Math.min(items.length-1,hi+1);nav=true;mark();stop()}
  else if(k==='ArrowUp'){hi=Math.max(-1,hi-1);nav=hi>=0;mark();if(hi<0)show(el);stop()}
  else if(k==='Tab'&&!e.shiftKey&&(nav||ghost.dataset.v)){accept(nav?hi:-1,false);stop()}
  else if(k==='ArrowRight'&&!nav&&ghost.dataset.v&&el.selectionStart===el.value.length){accept(-1,false);stop()}
  else if(k==='Enter'&&nav&&hi>=0){accept(hi,false)}   // tanlangan qiymat qo'yiladi, Enter o'z ishini davom ettiradi (tasdiq)
  else if(k==='Escape'){hide();stop()}},true);
document.addEventListener('input',e=>{const el=e.target;if(catOf(el))show(el);else if(el===cur)hide()},true);
document.addEventListener('change',e=>{const c=catOf(e.target);if(c&&cfg.on)remember(c,e.target.value)},true);
document.addEventListener('focusout',e=>{if(e.target===cur)setTimeout(()=>{if(document.activeElement!==cur)hide()},0)},true);
window.addEventListener('scroll',()=>{if(box&&!box.hidden)hide()},true);
window.addEventListener('resize',hide);
// Matn oynasi (askInput) Enter bilan yopiladi — change hodisasi bo'lmaydi: qiymat yuborilganda tarixga yoziladi
document.addEventListener('keydown',e=>{const el=e.target;if(el&&el.id==='askInput'&&e.key==='Enter'&&!e.shiftKey&&cfg.on)remember('text',el.value)},true);
document.addEventListener('click',e=>{if(e.target&&e.target.id==='askOk'){const a=document.getElementById('askInput');if(a&&cfg.on)remember('text',a.value)}},true);

/* ---------- chizma sozlamalarini eslab qolish ---------- */
let prefs={};try{prefs=JSON.parse(localStorage.getItem(PREFS)||'{}')||{}}catch(e){prefs={}}
function restorePrefs(){for(const id of REMEMBER){const el=document.getElementById(id);if(!el||prefs[id]==null)continue;
  if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===prefs[id]))continue;el.value=prefs[id]}}
document.addEventListener('change',e=>{const id=e.target&&e.target.id;if(!REMEMBER.includes(id))return;prefs[id]=e.target.value;try{localStorage.setItem(PREFS,JSON.stringify(prefs))}catch(_){}},true);

/* ---------- sozlamalar oynasi: Edit ▸ Smart kiritish… ---------- */
const CATN={name:'Detal nomlari',num:'Raqamlar (o\'lchamlar)',mat:'Material',note:'Izoh',text:'Chizma matni'};
function openDialog(){
  let d=document.getElementById('smartDialog');
  if(!d){d=document.createElement('dialog');d.id='smartDialog';d.setAttribute('aria-labelledby','smartTitle');document.body.appendChild(d)}
  const cats=Object.keys(cfg.h).filter(k=>(cfg.h[k]||[]).length),lab=k=>CATN[k]||('Maydon: '+k.replace(/^f:/,''));
  d.innerHTML=`<h2 id="smartTitle">Smart kiritish</h2>
  <p>Yozishni boshlang — oxirgi qiymatlardan davomi taklif qilinadi. <b>Tab</b> yoki <b>→</b> — kulrang davomni qabul qilish, <b>↓ ↑</b> — ro'yxat, ro'yxatdan tanlab <b>Enter</b> — qabul va tasdiq, <b>Esc</b> — yopish.</p>
  <label class="smartRow"><input type="checkbox" id="smartOn"${cfg.on?' checked':''}> Smart kiritish yoqilgan</label>
  <label class="smartRow">Har bir turdan eslab qolish soni <input type="number" id="smartN" min="5" max="50" value="${cfg.n}"></label>
  <div class="smartCats">${cats.length?cats.map(k=>`<div class="smartCat"><b>${esc(lab(k))}</b> <span>${(cfg.h[k]||[]).map(esc).join(' · ')}</span><button class="secondary" data-clr="${esc(k)}">Tozalash</button></div>`).join(''):'<p>Hali tarix yo\'q.</p>'}</div>
  <div class="dialogActions"><button class="secondary" id="smartClrAll">Hammasini tozalash</button><span></span><button id="smartClose">Yopish</button></div>`;
  d.querySelector('#smartOn').onchange=e=>{cfg.on=e.target.checked;save();if(!cfg.on)hide()};
  d.querySelector('#smartN').onchange=e=>{cfg.n=Math.max(5,Math.min(50,Math.round(+e.target.value)||15));e.target.value=cfg.n;for(const k in cfg.h)cfg.h[k]=cfg.h[k].slice(0,cfg.n);save()};
  d.querySelectorAll('[data-clr]').forEach(b=>b.onclick=()=>{delete cfg.h[b.dataset.clr];save();openDialog()});
  d.querySelector('#smartClrAll').onclick=()=>{cfg.h={};save();openDialog()};
  d.querySelector('#smartClose').onclick=()=>d.close();
  if(!d.open)d.showModal()}

function init(){restorePrefs();const b=document.getElementById('smartSettingsBtn');if(b)b.addEventListener('click',openDialog)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.SmartInput={open:openDialog,remember,suggest,get:()=>JSON.parse(JSON.stringify(cfg)),clear:()=>{cfg.h={};save()}};
})();
