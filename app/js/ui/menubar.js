/* js/ui/menubar.js — Rugby 1.1.2 asosiy menyu (Logo, File, Edit, Cnc, Drawing, Modeling).
   Menyu mavjud tugmalarni bosib ishlatadi (mantiq o'zgarmaydi); rejim tugmalari holati sinxronlanadi. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
let openItem=null;
function closeAll(){document.querySelectorAll('#menuBar .mbItem.open').forEach(m=>{m.classList.remove('open');m.querySelector('.mbBtn').setAttribute('aria-expanded','false')});openItem=null}
function openIt(it){closeAll();it.classList.add('open');it.querySelector('.mbBtn').setAttribute('aria-expanded','true');openItem=it}
function act(a){
  const p3=window.Panel3D&&window.Panel3D.isOpen&&window.Panel3D.isOpen();
  if(a==='undo'){if(p3)window.Panel3D.undo();else if($('undoBtn'))$('undoBtn').click()}
  else if(a==='redo'){if(p3)window.Panel3D.redo();else if($('redoBtn'))$('redoBtn').click()}
  else if(a==='obj-m'&&window.Panel3D)window.Panel3D.exportOBJ(0.001);
  else if(a==='obj-mm'&&window.Panel3D)window.Panel3D.exportOBJ(1);
  else if(a==='obj-in'&&window.Panel3D)window.Panel3D.importOBJ();}
function syncModes(){document.querySelectorAll('#menuBar .mbMode').forEach(b=>{const t=$(b.dataset.target);b.classList.toggle('active',!!t&&t.classList.contains('active'))})}
function syncLang(){const b=$('langSwitchBtn'),k=$('mbLangKb');if(b&&k)k.textContent=b.textContent.trim()}
function init(){
  const bar=$('menuBar');if(!bar)return;
  bar.querySelectorAll('.mbItem').forEach(it=>{
    const b=it.querySelector('.mbBtn');
    b.addEventListener('click',e=>{e.stopPropagation();it.classList.contains('open')?closeAll():openIt(it)});
    b.addEventListener('mouseenter',()=>{if(openItem&&openItem!==it)openIt(it)})});
  bar.querySelectorAll('.mbIt').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();closeAll();
    if(b.dataset.act){act(b.dataset.act);return}
    const t=$(b.dataset.click);if(t&&!t.disabled)t.click();setTimeout(syncLang,50)}));
  bar.querySelectorAll('.mbMode').forEach(b=>b.addEventListener('click',()=>{closeAll();const t=$(b.dataset.target);if(t)t.click();setTimeout(syncModes,0)}));
  document.addEventListener('mousedown',e=>{if(openItem&&!e.target.closest('#menuBar'))closeAll()},true);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&openItem){closeAll();e.stopPropagation()}},true);
  const mo=new MutationObserver(syncModes);
  ['modeSelectBtn','modeDrawBtn','modePanel3dBtn','modeCutlistBtn'].forEach(id=>{const t=$(id);if(t)mo.observe(t,{attributes:true,attributeFilter:['class']})});
  // Kam ishlatiladigan asboblar va "Chizish maydoni rangi" asboblar panelidan menyuga ko'chiriladi (elementlar saqlanadi, mantiq o'zgarmaydi)
  const move=(id,slot)=>{const el=$(id),box=$(slot);if(!el||!box)return;const lab=el.closest('label')||el;box.appendChild(lab)};
  move('themeSel','mbThemeSlot');move('joinDistInp','mbJoinSlot');
  ['explodeBtn','joinBtn','simplifyBtn','groupBtn','ungroupBtn','arrayBtn'].forEach(id=>{const e=$(id);if(e)e.classList.add('mbHidden')});
  const al=$('alignLeftBtn');if(al&&al.parentElement)al.parentElement.classList.add('mbHidden');
  syncModes();syncLang();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
