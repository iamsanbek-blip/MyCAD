/* ==========================================================================
   js/ui/panels-list.js
   Bulk bar, burchaklar ro'yxati, radius rejimi, auto-ignore

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ================= bulk bar =================
//
// TUZATILDI (jiddiy xato): ilgari "Qo'llash" bosilganda mode+size+offset+
// tboneDir+tboneMirror BARCHASI, foydalanuvchi ularga tegmagan bo'lsa ham,
// maydondagi ESKI/DEFAULT qiymat bilan HAMMA tanlangan burchaklarga
// yozilardi. Masalan foydalanuvchi faqat extension'ni o'zgartirmoqchi
// bo'lsa-yu, radius maydonida eskirib qolgan "21" turgan bo'lsa — Qo'llash
// bosilganda BARCHA burchaklar radiusi 21 mm ga aylanardi. Katta radius
// ko'pincha qirraga sig'maydi va relief butunlay yo'qolib, foydalanuvchiga
// "hech narsa o'zgarmayapti / qotib qoldi" bo'lib ko'rinardi — bu ikkala
// shikoyatning ILDIZI edi.
//
// ENDI: har maydon MUSTAQIL. Faqat foydalanuvchi qo'lini tekkizgan maydon
// darhol (typing paytida) qo'llanadi; tegilmagan maydonlar mavjud
// qiymatlarni SAQLAB QOLADI. Tanlov o'zgarganda maydonlar joriy umumiy
// qiymat bilan yangilanadi (aralash bo'lsa bo'sh/aralash holatga qaytadi).
let bulkTouched = {mode:false, size:false, offset:false, tboneDir:false, tboneMirror:false};

function bulkCommon(field){
  const sel = corners.filter(c=>c.selected);
  if(!sel.length) return {mixed:true, value:null};
  const first = sel[0][field];
  const same = sel.every(c => c[field]===first || (typeof first==='number' && Math.abs((c[field]||0)-(first||0))<1e-9));
  return same ? {mixed:false, value:first} : {mixed:true, value:null};
}

function updateBulkBar(){
  const sel = corners.filter(c=>c.selected);
  const bar = document.getElementById('bulkBar');
  if(sel.length===0){ bar.style.display='none'; return; }
  bar.style.display='flex';
  document.getElementById('bulkCount').textContent = sel.length+' ta tanlandi';

  // Tanlov o'zgarganda: har maydonni joriy qiymatlarga sinxronlaymiz va
  // "tegilgan" belgilarini tozalaymiz — endi hech narsa tasodifan yozilmaydi.
  bulkTouched = {mode:false, size:false, offset:false, tboneDir:false, tboneMirror:false};

  const modeSel=document.getElementById('bulkMode');
  const mC=bulkCommon('mode');
  [...modeSel.options].forEach(o=>{ if(o.value==='__mixed__') o.remove(); });
  if(mC.mixed){
    const opt=document.createElement('option'); opt.value='__mixed__'; opt.textContent='(aralash)';
    modeSel.insertBefore(opt, modeSel.firstChild); modeSel.value='__mixed__';
  } else modeSel.value = mC.value;

  const sizeInp=document.getElementById('bulkSize');
  const sC=bulkCommon('size');
  sizeInp.value = sC.mixed ? '' : (+sC.value).toFixed(2).replace(/\.?0+$/,'');
  sizeInp.placeholder = sC.mixed ? 'aralash' : '';

  const offInp=document.getElementById('bulkOffset');
  const oC=bulkCommon('offset');
  offInp.value = oC.mixed ? '' : (+(oC.value||0)).toFixed(2).replace(/\.?0+$/,'').replace(/^-0$/,'0');
  offInp.placeholder = oC.mixed ? 'aralash' : '';

  const dirSel=document.getElementById('bulkTboneDir');
  const dC=bulkCommon('tboneDir');
  [...dirSel.options].forEach(o=>{ if(o.value==='__mixed__') o.remove(); });
  if(dC.mixed){
    const opt=document.createElement('option'); opt.value='__mixed__'; opt.textContent='(aralash)';
    dirSel.insertBefore(opt, dirSel.firstChild); dirSel.value='__mixed__';
  } else dirSel.value = dC.value || 'auto';

  const mirChk=document.getElementById('bulkTboneMirror');
  const mirC=bulkCommon('tboneMirror');
  mirChk.indeterminate = mirC.mixed;
  if(!mirC.mixed) mirChk.checked = !!mirC.value;
}

// Har maydon: input/change bosqichida darhol qo'llaydi, faqat SHU maydonni.
document.getElementById('bulkMode').addEventListener('change',(e)=>{
  if(e.target.value==='__mixed__') return;   // foydalanuvchi tanlamagan — teginilmagan
  bulkTouched.mode=true;
  corners.filter(c=>c.selected).forEach(c=>{ c.mode=e.target.value; });
  pushHistory(); draw(); renderList();
});
document.getElementById('bulkSize').addEventListener('input',(e)=>{
  if(e.target.value==='') return;            // bo'sh — hali teginilmagan
  bulkTouched.size=true;
  const v=safeSize(e.target.value, 3);
  corners.filter(c=>c.selected).forEach(c=>{ c.size=v; });
  // DIQQAT: bu yerda renderList() chaqirilmaydi. U burchaklar ro'yxatini
  // innerHTML bilan QAYTA QURADI va shu paytda yozilayotgan maydonni
  // DOM'dan yo'q qiladi — fokus ketadi, raqam yo'qoladi.
  // Ro'yxat maydondan chiqqanda ('change') yangilanadi.
  (typeof requestRedraw==='function' ? requestRedraw : draw)();
});
document.getElementById('bulkSize').addEventListener('change', ()=>{
  if(bulkTouched.size) pushHistory();
  renderList();                    // ro'yxat endi xavfsiz yangilanadi
});
document.getElementById('bulkOffset').addEventListener('input',(e)=>{
  if(e.target.value==='') return;
  bulkTouched.offset=true;
  const v=safeOffset(e.target.value);
  corners.filter(c=>c.selected).forEach(c=>{
    const lim=(typeof cornerOffsetLimit==='function')?cornerOffsetLimit(c):Infinity;
    c.offset=Math.max(-lim, Math.min(v, lim));
  });
  // renderList() bu yerda ham chaqirilmaydi — yuqoridagi izohga qarang
  (typeof requestRedraw==='function' ? requestRedraw : draw)();
});
document.getElementById('bulkOffset').addEventListener('change', ()=>{
  if(bulkTouched.offset) pushHistory();
  renderList();
});
document.getElementById('bulkTboneDir').addEventListener('change',(e)=>{
  if(e.target.value==='__mixed__') return;
  bulkTouched.tboneDir=true;
  corners.filter(c=>c.selected).forEach(c=>{ c.tboneDir=e.target.value; });
  pushHistory(); draw(); renderList();
});
document.getElementById('bulkTboneMirror').addEventListener('change',(e)=>{
  bulkTouched.tboneMirror=true;
  const v=e.target.checked;
  corners.filter(c=>c.selected).forEach(c=>{ c.tboneMirror=v; });
  pushHistory(); draw(); renderList();
});
// "Qo'llash" endi shart emas (hammasi live), lekin tugma qoladi — mode
// tanlanmagan (aralash) holatda ham hech narsani buzmaydi, faqat yopadi.
document.getElementById('bulkApply').addEventListener('click', ()=>{
  pushHistory(); draw(); renderList();
});
document.getElementById('bulkClear').addEventListener('click', ()=>{
  corners.forEach(c=>c.selected=false);
  updateBulkBar(); draw(); renderList();
});

// ================= sidebar list =================
function renderList(){
  const list = document.getElementById('cornerList');

  // TUZATILDI (maydon "ba'zan qabul qilmaydi" muammosi):
  // Bu funksiya butun ro'yxatni innerHTML='' bilan qayta quradi. Agar
  // foydalanuvchi shu paytda biror maydonga raqam yozayotgan bo'lsa, o'sha
  // maydon DOM'dan olib tashlanadi — fokus yo'qoladi, yozilayotgan qiymat
  // esa yo'qoladi. Tashqaridan qaraganda "maydon kulrang bo'lib qoldi va
  // raqamni qabul qilmayapti" bo'lib ko'rinadi.
  //
  // Yechim: yozilayotgan maydonni eslab qolib, qayta qurilgandan keyin
  // fokusni va kursor o'rnini qaytaramiz.
  const ae = document.activeElement;
  let restore = null;
  if(ae && ae.tagName==='INPUT' && list.contains(ae)){
    restore = {
      idx: ae.dataset.idx,
      cls: ae.className,
      start: ae.selectionStart,
      end: ae.selectionEnd,
      val: ae.value,
    };
  }

  list.innerHTML='';
  corners.forEach((c,idx)=>{
    const div = document.createElement('div');
    div.className='corner-item'+(c.selected?' sel':'');
    div.innerHTML = `
      <div class="head">
        <span class="idx">#${idx+1} (${c.x.toFixed(1)}, ${c.y.toFixed(1)}) &middot; ${(c.theta*180/Math.PI).toFixed(0)}&deg;</span>
        <span class="tag ${c.mode}">${c.mode}</span>
      </div>
      <div class="ctrls">
        <select data-idx="${idx}" class="modeSel">
          ${MODES.map(m=>`<option value="${m}" ${m===c.mode?'selected':''}>${m}</option>`).join('')}
        </select>
        <input type="text" inputmode="decimal" data-idx="${idx}" class="sizeInp" value="${c.size}" style="width:46px" title="Radius (mm) — vergul ham bo'ladi">
        <input type="text" inputmode="decimal" data-idx="${idx}" class="offsetInp" value="${c.offset||0}" style="width:46px" title="Extension (mm) — bissektrisa bo'ylab surish, manfiy ham bo'ladi">
        ${(c.mode==='tbone') ? `<select data-idx="${idx}" class="tboneDirSel" title="T-Bone yo'nalishi" style="width:52px">
          <option value="auto" ${c.tboneDir==='auto'?'selected':''}>Auto</option>
          <option value="e1" ${c.tboneDir==='e1'?'selected':''}>Chap</option>
          <option value="e2" ${c.tboneDir==='e2'?'selected':''}>O'ng</option>
        </select>
        <button class="flipBtn" data-idx="${idx}" title="Mirror — bulge'ni qarama-qarshi tomonga o'tkazish" style="${c.tboneMirror?('background:var(--blue);color:#062031;'):''}">⇄M</button>` : ''}
      </div>`;
    div.addEventListener('click',(ev)=>{
      if(ev.target.tagName==='SELECT'||ev.target.tagName==='INPUT'||ev.target.tagName==='BUTTON') return;
      c.selected = !c.selected;
      draw(); renderList(); updateBulkBar();
    });
    list.appendChild(div);
  });
  list.querySelectorAll('.modeSel').forEach(sel=>{
    sel.addEventListener('change',(e)=>{
      corners[+e.target.dataset.idx].mode = e.target.value;
      pushHistory(); draw(); renderList();
    });
  });
  list.querySelectorAll('.sizeInp').forEach(inp=>{
    inp.addEventListener('input',(e)=>{
      corners[+e.target.dataset.idx].size = safeSize(e.target.value, corners[+e.target.dataset.idx].size);
      // Har bosilgan harfda to'liq draw() chaqirish og'ir va yozishni
      // sekinlashtiradi. requestRedraw() kadr boshiga BIR MARTA chizadi.
      (typeof requestRedraw==='function' ? requestRedraw : draw)();
    });
    inp.addEventListener('change', ()=>pushHistory());
  });
  list.querySelectorAll('.offsetInp').forEach(inp=>{
    // TUZATILDI: ilgari har bosilgan harfda qiymat qirqilib, maydonga qaytib
    // yozilardi — shuning uchun "-0.1" kabi sonni yozib bo'lmasdi ("qotib
    // qolgan" tuyg'usi). Endi yozayotganda faqat QO'LLANADI, chegaraga
    // tushirish esa maydondan chiqqanda (blur / Enter) bajariladi.
    inp.addEventListener('input',(e)=>{
      const c = corners[+e.target.dataset.idx];
      if(!c) return;
      const rg = (typeof cornerOffsetRange==='function') ? cornerOffsetRange(c) : {min:-Infinity,max:Infinity};
      const v = safeOffset(e.target.value);
      c.offset = Math.max(rg.min, Math.min(v, rg.max));
      (typeof requestRedraw==='function' ? requestRedraw : draw)();
    });
    inp.addEventListener('change',(e)=>{
      const c = corners[+e.target.dataset.idx];
      if(!c) return;
      const rg = (typeof cornerOffsetRange==='function') ? cornerOffsetRange(c) : {min:-Infinity,max:Infinity};
      const v = safeOffset(e.target.value);
      const clamped = Math.max(rg.min, Math.min(v, rg.max));
      c.offset = clamped;
      e.target.value = String(+clamped.toFixed(3));
      if(Math.abs(clamped - v) > 1e-9){
        const h=document.getElementById('hint');
        if(h) h.innerHTML = 'Extension oralig\'i: <b>'+(+rg.min.toFixed(2))+' … +'+(+rg.max.toFixed(2))+
                            ' mm</b> (radius '+(c.size||0)+' mm, burchak '+
                            Math.round((c.theta||0)*180/Math.PI)+'°). Shu qiymat qo\'llandi.';
      }
      pushHistory(); draw();
    });
    inp.addEventListener('change', ()=>pushHistory());
  });
  list.querySelectorAll('.tboneDirSel').forEach(sel=>{
    sel.addEventListener('change',(e)=>{
      corners[+e.target.dataset.idx].tboneDir = e.target.value;
      pushHistory(); draw(); renderList();
    });
  });
  list.querySelectorAll('.flipBtn').forEach(btn=>{
    btn.addEventListener('click',(e)=>{
      e.stopPropagation();
      const c = corners[+e.target.dataset.idx];
      c.tboneMirror = !c.tboneMirror;
      pushHistory(); draw(); renderList();
    });
  });
  document.getElementById('stats').textContent = `${corners.length} ta burchak topildi`;
}

document.getElementById('applyAllBtn').addEventListener('click', ()=>{
  const mode = document.getElementById('defaultMode').value;
  const size = safeSize(document.getElementById('defaultSize').value, 3);
  const offset = safeOffset(document.getElementById('defaultOffset').value);
  const tboneDir = document.getElementById('defaultTboneDir').value;
  const tboneMirror = document.getElementById('defaultTboneMirror').checked;
  const restrict = document.getElementById('restrictAngleRange').checked;
  const aMin = parseNum(document.getElementById('angleMin').value, 0)||0;
  const aMax = parseNum(document.getElementById('angleMax').value, 180)||180;
  let applied=0, skipped=0;
  corners.forEach(c=>{
    const deg = c.theta*180/Math.PI;
    const inRange = !restrict || (deg>=aMin && deg<=aMax) || mode==='ignore' || mode==='chamfer';
    c.mode = inRange ? mode : 'ignore';
    if(inRange) applied++; else skipped++;
    c.size=size; c.offset=offset; c.tboneDir=tboneDir; c.tboneMirror=tboneMirror;
  });
  pushHistory();
  draw(); renderList();
  // Tell the user exactly what happened — otherwise the angle filter silently
  // skipping most corners looks like the button did nothing.
  const hint=document.getElementById('hint');
  if(hint){
    let msg = applied+' ta burchakka "'+mode+'" qo\'llandi';
    if(skipped>0){
      msg += ' &middot; '+skipped+' ta burchak o\'tkazib yuborildi, chunki ular '+
             aMin+'–'+aMax+'° diapazonidan tashqarida. Hammasiga qo\'llash uchun '+
             '"Faqat shu diapazonda qo\'llash" belgisini oling yoki diapazonni kengaytiring.';
    }
    hint.innerHTML = msg+'.';
  }

  // fokusni qaytarish (yuqoridagi izohga qarang)
  if(restore){
    const sel = list.querySelector('input.'+restore.cls.split(' ').join('.')+'[data-idx="'+restore.idx+'"]');
    if(sel){
      sel.value = restore.val;          // yozilayotgan matn saqlanadi
      sel.focus();
      try{ sel.setSelectionRange(restore.start, restore.end); }catch(err){}
    }
  }
});

// ================= radius mode (tool diameter vs custom) =================
const radiusModeDiameter = document.getElementById('radiusModeDiameter');
const radiusModeCustom = document.getElementById('radiusModeCustom');
const toolDiameterInp = document.getElementById('toolDiameter');
const defaultSizeInp = document.getElementById('defaultSize');
function syncRadiusFromDiameter(){
  if(radiusModeDiameter.checked){
    defaultSizeInp.value = (safeSize(toolDiameterInp.value, 6)/2).toFixed(2);
  }
}
function updateRadiusModeUI(){
  const useDiameter = radiusModeDiameter.checked;
  toolDiameterInp.disabled = !useDiameter;
  defaultSizeInp.readOnly = useDiameter;
  toolDiameterInp.style.opacity = useDiameter? '1':'0.4';
  defaultSizeInp.style.opacity = useDiameter? '0.7':'1';
  if(useDiameter) syncRadiusFromDiameter();
}
radiusModeDiameter.addEventListener('change', updateRadiusModeUI);
radiusModeCustom.addEventListener('change', updateRadiusModeUI);
toolDiameterInp.addEventListener('input', syncRadiusFromDiameter);
toolDiameterInp.addEventListener('change', syncRadiusFromDiameter);
updateRadiusModeUI();

// ================= auto-ignore rules =================
document.getElementById('ignoreSmallBtn').addEventListener('click', ()=>{
  const thr = parseNum(document.getElementById('ignoreSlotWidth').value, 0)||0;
  let count=0;
  polygons.forEach((poly,pi)=>{
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    poly.points.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y);});
    const minDim = Math.min(maxX-minX, maxY-minY);
    if(minDim < thr){
      corners.filter(c=>c.pi===pi).forEach(c=>{ c.mode='ignore'; count++; });
    }
  });
  pushHistory(); draw(); renderList();
  alert(count+' ta burchak (kichik slotlar) ignore qilindi.');
});
document.getElementById('ignoreAngleBtn').addEventListener('click', ()=>{
  const thrDeg = parseNum(document.getElementById('ignoreAngleDeg').value, 135)||135;
  let count=0;
  corners.forEach(c=>{
    if((c.theta*180/Math.PI) > thrDeg){ c.mode='ignore'; count++; }
  });
  pushHistory(); draw(); renderList();
  alert(count+' ta yassi burchak ignore qilindi.');
});
