/* ==========================================================================
   js/ui/theme.js
   MAVZU (tema) va GRID boshqaruvi

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== MAVZULAR =====
// Har mavzu chizish maydonining fonini VA grid ranglarini belgilaydi.
// Yon panel (sidebar) ham unga moslashadi.
//
// Tanlov `.dbe` loyihaga EMAS, brauzer/Electron xotirasiga saqlanadi —
// bu foydalanuvchining shaxsiy sozlamasi, chizmaning bir qismi emas.

const THEMES = {
  dark: {
    name: 'To\'q ko\'k',
    canvas: '#0b1220',
    gridMinor: 'rgba(122,143,175,0.12)',
    gridMajor: 'rgba(122,143,175,0.22)',
    axisX: '#ff6b6b', axisY: '#6ee7a8',
    halo: '#0b1220',
    ui: { bg:'#0b1220', panel:'#111b2e', panel2:'#16233b', line:'#2a3b58',
          text:'#dce6f5', textDim:'#93a3bd' },
  },
  black: {
    name: 'Qora',
    canvas: '#000000',
    gridMinor: 'rgba(150,150,150,0.14)',
    gridMajor: 'rgba(150,150,150,0.26)',
    axisX: '#ff5555', axisY: '#55dd88',
    halo: '#000000',
    ui: { bg:'#0a0a0a', panel:'#141414', panel2:'#1e1e1e', line:'#333333',
          text:'#e6e6e6', textDim:'#9a9a9a' },
  },
  grey: {
    name: 'Kulrang',
    canvas: '#2b2f36',
    gridMinor: 'rgba(190,200,215,0.13)',
    gridMajor: 'rgba(190,200,215,0.24)',
    axisX: '#ff7b7b', axisY: '#7fe3a8',
    halo: '#2b2f36',
    ui: { bg:'#22262c', panel:'#2b3038', panel2:'#343a44', line:'#454c58',
          text:'#e4e9f0', textDim:'#a7b0bd' },
  },
  light: {
    name: 'Oq (bosma)',
    canvas: '#ffffff',
    gridMinor: 'rgba(60,80,110,0.13)',
    gridMajor: 'rgba(60,80,110,0.26)',
    axisX: '#cc2222', axisY: '#118844',
    halo: '#ffffff',
    ui: { bg:'#eef1f5', panel:'#ffffff', panel2:'#f2f5f9', line:'#c8d2e0',
          text:'#1b2432', textDim:'#5a6779' },
  },
  blueprint: {
    name: 'Chizma (blueprint)',
    canvas: '#0d2b4d',
    gridMinor: 'rgba(190,225,255,0.16)',
    gridMajor: 'rgba(190,225,255,0.30)',
    axisX: '#ff9a9a', axisY: '#9affc4',
    halo: '#0d2b4d',
    ui: { bg:'#0b2340', panel:'#123456', panel2:'#18406a', line:'#2b5c8f',
          text:'#dceeff', textDim:'#93b8d8' },
  },
};

let currentTheme = 'dark';
let gridVisible  = true;

function themeDef(){ return THEMES[currentTheme] || THEMES.dark; }

// Chizma ranglari (shakl, o'lchov) oq fonda ko'rinmay qolmasligi uchun
// mavzu "yorug'"mi yoki "to'q"mi ekanini bilish kerak.
function themeIsLight(){
  const c = themeDef().canvas.replace('#','');
  const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  return (0.299*r + 0.587*g + 0.114*b) > 140;
}

function applyTheme(key, opts){
  if(!THEMES[key]) key = 'dark';
  currentTheme = key;
  const t = THEMES[key];
  const R = document.documentElement.style;
  R.setProperty('--bg',        t.ui.bg);
  R.setProperty('--panel',     t.ui.panel);
  R.setProperty('--panel-2',   t.ui.panel2);
  R.setProperty('--line',      t.ui.line);
  R.setProperty('--text',      t.ui.text);
  R.setProperty('--text-dim',  t.ui.textDim);
  document.body.classList.toggle('lightTheme', themeIsLight());

  const sel = document.getElementById('themeSel');
  if(sel && sel.value !== key) sel.value = key;

  if(!opts || !opts.silent) saveThemePrefs();
  if(typeof draw === 'function') draw();
}

function setGridVisible(on, opts){
  gridVisible = !!on;
  const cb = document.getElementById('gridToggle');
  if(cb) cb.checked = gridVisible;
  if(!opts || !opts.silent) saveThemePrefs();
  if(typeof draw === 'function') draw();
}
function toggleGrid(){
  setGridVisible(!gridVisible);
  const h=document.getElementById('hint');
  if(h) h.innerHTML = gridVisible ? 'Katak yoqildi [H]' : 'Katak o\'chirildi [H]';
}

// ---- sozlamalarni eslab qolish ------------------------------------------
function saveThemePrefs(){
  try{
    localStorage.setItem('rugby.theme', currentTheme);
    localStorage.setItem('rugby.grid', gridVisible ? '1' : '0');
  }catch(e){ /* xotira yo'q — muhim emas */ }
}
function loadThemePrefs(){
  let th='dark', gr=true;
  try{
    const a=localStorage.getItem('rugby.theme'); if(a && THEMES[a]) th=a;
    const b=localStorage.getItem('rugby.grid'); if(b!==null) gr = b==='1';
  }catch(e){}
  applyTheme(th, {silent:true});
  setGridVisible(gr, {silent:true});
}

// ---- tugmalarni ulash ----------------------------------------------------
function wireTheme(){
  const sel=document.getElementById('themeSel');
  if(sel){
    Object.keys(THEMES).forEach(k=>{
      const o=document.createElement('option');
      o.value=k; o.textContent=THEMES[k].name;
      sel.appendChild(o);
    });
    sel.addEventListener('change', ()=>applyTheme(sel.value));
  }
  const cb=document.getElementById('gridToggle');
  if(cb) cb.addEventListener('change', ()=>setGridVisible(cb.checked));
  loadThemePrefs();
}
