/* ==========================================================================
   js/ui/i18n.js
   IKKI TILLILIK — UZ (mahalliy) / EN (global)

   Dogbone / T-Bone / Fillet / Chamfer Editor — modulli tuzilma.
   DIQQAT: fayllar index.html da QAT'IY tartibda yuklanadi. Tartibni
   o'zgartirmang — kod global scope'da ishlaydi va tartibga bog'liq.
   ========================================================================== */

// ===== NIMA UCHUN BU MODUL BOR =====
//
// Dastur ikki auditoriya uchun tarqatiladi: mahalliy (o'zbek) va global
// (ingliz). Barcha matnni ikki nusxada yozib chiqish o'rniga — bitta
// lug'at + kalit so'zlar orqali ishlaydi:
//
//   HTML da:  <button data-i18n="save">Saqlash</button>
//   JS da:    t('save')                     → "Saqlash" yoki "Save"
//             t('cornersSelected', {n:5})   → "5 ta tanlandi" / "5 selected"
//
// QAMROV: barcha statik interfeys (tugmalar, panel sarlavhalari, checkbox
// yozuvlari, tooltip'lar) to'liq ikki tilli. Asboblarning ENG MUHIM holat
// xabarlari (masalan "Offset: chiziqni bosing") ham tarjima qilingan —
// bular yangi foydalanuvchiga dasturni qanday ishlatishni tushuntiradi.
//
// Kamroq muhim, tez o'tib ketadigan ba'zi konsol xabarlari hozircha faqat
// o'zbekcha qolishi mumkin — bular foydalanuvchi interfeysida ko'rinmaydi.

const I18N_DICT = {
  uz: {
    // ---- Brend / sarlavha ----
    appTitle: 'CNC Corner Editor',
    tagline: 'CNC Corner Editor',

    // ---- Yuqori panel: rejim ----
    modeBoneEdit: 'Bone edit',
    modeDraw: 'Chizish',
    modeNone: 'None',
    tool_delete: "O'chirish",

    // ---- Chizish asboblari ----
    tool_line: 'Line',
    tool_circle: 'Circle',
    tool_rect: 'Rect',
    tool_arc: 'Arc',
    tool_polygon: 'Polygon',
    ortho: 'Ortho',
    freehand: 'Free',

    // ---- Tahrirlash asboblari ----
    tool_move: 'Move',
    tool_rotate: 'Rotate',
    tool_scale: 'Scale',
    tool_mirror: 'Mirror',
    tool_stretch: 'Stretch',
    tool_trim: 'Trim/Extend',
    tool_offset: 'Offset',
    tool_fillet: 'Fillet',
    tool_chamfer: 'Chamfer',
    tool_join: 'Join',
    tool_explode: 'Explode',
    tool_array: 'Array',
    tool_group: 'Group',
    tool_ungroup: 'Ungroup',
    tool_simplify: 'Soddalash',

    // ---- O'lchovlar ----
    dim_h: 'Dim-H', dim_v: 'Dim-V', dim_a: 'Dim-A', dim_ang: 'Dim-Ang',
    dim_arc: 'Dim-Arc', dim_area: 'Maydon',

    // ---- Snap paneli ----
    snapEndpoint: 'Endpoint', snapMidpoint: 'Midpoint', snapCenter: 'Center',
    snapIntersect: 'Intersection', snapPerp: 'Perpendicular', snapParallel: 'Parallel',
    snapNear: 'Near', snapGrid: 'Grid', snapAngle: 'Angle',

    // ---- Ko'rinish / mavzu ----
    gridLabel: 'Katak',
    themeLabel: '\u{1F3A8}',

    // ---- CNC Nesting paneli ----
    nestTitle: 'CNC Nesting', nestList: 'List', nestGap: 'Oraliq',
    nestMargin: 'Chet', nestRotate: "90\u00b0 burish", nestPlace: 'Joylash',
    nestClear: 'List',

    // ---- Matn asbobi ----
    textToolLabel: 'Matn', textHeight: 'H', textAngle: '\u2220',

    // ---- Yon panel: Fayl ----
    fileSection: 'Fayl', fileNew: 'Yangi', fileOpen: 'Ochish',
    fileSave: 'Saqlash', fileSaveAs: 'Saqlash\u2026', fileUnsaved: 'nomsiz loyiha',
    importSection: 'Import', importDxf: 'DXF fayl',
    refSection: 'Referens rasm (shablon)', refUpload: 'Rasm yuklash', refEdit: 'Tahrir',
    refNone: 'Rasm yuklanmagan.',
    refHint: "Rasm chizmaning ORQASIDA turadi. Tahrir yoqilganda sudrab suring; o'lcham, burchak va shaffoflikni pastdan sozlang.",
    exportSection: 'Export', exportDxf: 'DXF', exportSvg: 'SVG', exportPng: 'PNG',
    exportHint: 'Chizmani boshqa dasturlar uchun chiqaradi',

    // ---- Maydon (Area) paneli ----
    areaSection: 'Maydon (Area)',
    areaHint: "Yopiq shakl(lar)ni tanlang va \u25a6 Maydon tugmasini bosing.",
    areaNote: "Yoylar aniq formula bilan hisoblanadi. Ichkaridagi kontur teshik deb ayiriladi.",

    // ---- Qatlamlar ----
    layersSection: 'Layers (Qatlamlar)', layerCut: 'Cut (Kesish)',
    layerEngrave: "Engrave (O'yish)", layerDrill: 'Drill (Teshik)', layerGeneral: 'General',
    layerAdd: '+ Yangi qatlam',
    layerHint: "Faol qatlamni bosing \u2014 yangi chizmalar shunga tushadi.",

    // ---- Rang paneli ----
    colorSection: 'Rang (tanlangan shakllarga)',

    // ---- Umumiy so'zlar ----
    ok: 'OK', cancel: 'Bekor', close: 'Yopish', apply: "Qo'llash",
    finish: 'Tugatish',
    cancel_btn: 'Bekor',
    align: 'Tekislash',
    apply_btn: 'Bajarish',
    centerView: 'Markazga',
    refUploadBtn: 'Rasm yuklash',
    refEditBtn: 'Tahrir',
    addLayer: '+ Yangi qatlam',
    applyAll: 'Barchaga',
    ignoreSmall: 'Kichik slotlarni ignore',
    ignoreAngle: 'Yassi burchaklarni ignore',
    langSwitch: 'EN',
  },

  en: {
    appTitle: 'CNC Corner Editor',
    tagline: 'CNC Corner Editor',

    modeBoneEdit: 'Bone edit',
    modeDraw: 'Draw',
    modeNone: 'None',
    tool_delete: 'Delete',

    tool_line: 'Line',
    tool_circle: 'Circle',
    tool_rect: 'Rect',
    tool_arc: 'Arc',
    tool_polygon: 'Polygon',
    ortho: 'Ortho',
    freehand: 'Free',

    tool_move: 'Move',
    tool_rotate: 'Rotate',
    tool_scale: 'Scale',
    tool_mirror: 'Mirror',
    tool_stretch: 'Stretch',
    tool_trim: 'Trim/Extend',
    tool_offset: 'Offset',
    tool_fillet: 'Fillet',
    tool_chamfer: 'Chamfer',
    tool_join: 'Join',
    tool_explode: 'Explode',
    tool_array: 'Array',
    tool_group: 'Group',
    tool_ungroup: 'Ungroup',
    tool_simplify: 'Simplify',

    dim_h: 'Dim-H', dim_v: 'Dim-V', dim_a: 'Dim-A', dim_ang: 'Dim-Ang',
    dim_arc: 'Dim-Arc', dim_area: 'Area',

    snapEndpoint: 'Endpoint', snapMidpoint: 'Midpoint', snapCenter: 'Center',
    snapIntersect: 'Intersection', snapPerp: 'Perpendicular', snapParallel: 'Parallel',
    snapNear: 'Near', snapGrid: 'Grid', snapAngle: 'Angle',

    gridLabel: 'Grid',
    themeLabel: '\u{1F3A8}',

    nestTitle: 'CNC Nesting', nestList: 'Sheet', nestGap: 'Gap',
    nestMargin: 'Margin', nestRotate: 'Rotate 90\u00b0', nestPlace: 'Nest',
    nestClear: 'Sheet',

    textToolLabel: 'Text', textHeight: 'H', textAngle: '\u2220',

    fileSection: 'File', fileNew: 'New', fileOpen: 'Open',
    fileSave: 'Save', fileSaveAs: 'Save As\u2026', fileUnsaved: 'untitled project',
    importSection: 'Import', importDxf: 'DXF file',
    refSection: 'Reference image (template)', refUpload: 'Upload image', refEdit: 'Edit',
    refNone: 'No image loaded.',
    refHint: 'The image sits BEHIND the drawing. When editing is on, drag to move it; adjust size, angle and opacity below.',
    exportSection: 'Export', exportDxf: 'DXF', exportSvg: 'SVG', exportPng: 'PNG',
    exportHint: 'Exports the drawing for use in other programs',

    areaSection: 'Area',
    areaHint: 'Select closed shape(s) and click \u25a6 Area.',
    areaNote: 'Arcs are computed with an exact formula. Inner contours are treated as holes and subtracted.',

    layersSection: 'Layers', layerCut: 'Cut',
    layerEngrave: 'Engrave', layerDrill: 'Drill', layerGeneral: 'General',
    layerAdd: '+ New layer',
    layerHint: 'Click a layer to make it active \u2014 new drawings go there.',

    colorSection: 'Color (selected shapes)',

    ok: 'OK', cancel: 'Cancel', close: 'Close', apply: 'Apply',
    finish: 'Finish',
    cancel_btn: 'Cancel',
    align: 'Align',
    apply_btn: 'Apply',
    centerView: 'Center view',
    refUploadBtn: 'Upload image',
    refEditBtn: 'Edit',
    addLayer: '+ New layer',
    applyAll: 'Apply to all',
    ignoreSmall: 'Ignore small slots',
    ignoreAngle: 'Ignore flat corners',
    langSwitch: "O'Z",
  },
};

// ---------------------------------------------------------------------------
//  Til holati
// ---------------------------------------------------------------------------
let currentLang = 'uz';

function detectDefaultLang(){
  try{
    const saved = localStorage.getItem('rugby.lang');
    if(saved && I18N_DICT[saved]) return saved;
  }catch(e){}
  // brauzer tili o'zbekcha bo'lmasa — ingliz tilini standart qilamiz
  // (global tarqatishda foydalanuvchi birinchi marta o'z tilida ko'rsin)
  const nav = (typeof navigator!=='undefined' && navigator.language) || '';
  if(/^uz/i.test(nav)) return 'uz';
  return 'uz';   // ilova ichida o'zgarmas standart — HTML sahifasi tilni belgilaydi
}

function t(key, vars){
  const dict = I18N_DICT[currentLang] || I18N_DICT.uz;
  let s = (key in dict) ? dict[key] : ((I18N_DICT.uz[key]) || key);
  if(vars){
    Object.keys(vars).forEach(k=>{ s = s.replace('{'+k+'}', vars[k]); });
  }
  return s;
}

// HTML dagi data-i18n* atributlarini joriy tilga moslaydi
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.documentElement.lang = currentLang;
  const sw = document.getElementById('langSwitchBtn');
  if(sw) sw.textContent = t('langSwitch');
}

function setLang(lang){
  if(!I18N_DICT[lang]) lang = 'uz';
  currentLang = lang;
  try{ localStorage.setItem('rugby.lang', lang); }catch(e){}
  applyI18n();
}

function toggleLang(){ setLang(currentLang==='uz' ? 'en' : 'uz'); }

function wireI18n(){
  currentLang = detectDefaultLang();
  const btn = document.getElementById('langSwitchBtn');
  if(btn) btn.addEventListener('click', toggleLang);
  applyI18n();
}
