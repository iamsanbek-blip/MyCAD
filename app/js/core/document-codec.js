/* Versioned document format. Pure data only: usable in Node tests and the UI. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RugbyDocument = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FORMAT = 'dogbone-editor-project', VERSION = 2;
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => 'page_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  function emptyPage(name = 'Sahifa 1') {
    return {id: uid(), name, shapes: [], dimensions: [], texts: [], corners: [], refImages: [], nestSheets: [],
      layers: [
        {id:'cut',name:'Cut (Kesish)',color:'#ff6b6b',aci:1,visible:true,locked:false},
        {id:'engrave',name:"Engrave (O‘yish)",color:'#5ee1ff',aci:4,visible:true,locked:false},
        {id:'drill',name:'Drill (Teshik)',color:'#ffe680',aci:2,visible:true,locked:false},
        {id:'default',name:'General',color:'#ffb454',aci:40,visible:true,locked:false}],
      activeLayer:'cut',activeColor:'#ffb454',view:{scale:1,ox:0,oy:0},settings:{}};
  }
  function validateNumbers(value, depth = 0) {
    if (depth > 50) throw new Error('Loyiha tuzilmasi haddan tashqari chuqur.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Loyihada noto‘g‘ri son bor.');
    if (value && typeof value === 'object') Object.values(value).forEach(v => validateNumbers(v, depth + 1));
  }
  function normalizePage(raw, index) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Sahifa noto‘g‘ri.');
    const page = emptyPage('Sahifa ' + (index + 1));
    page.id = typeof raw.id === 'string' && raw.id ? raw.id : page.id;
    page.name = String(raw.name || page.name).trim().slice(0, 80) || page.name;
    for (const key of ['shapes','dimensions','texts','corners','refImages','nestSheets']) {
      if (raw[key] !== undefined && !Array.isArray(raw[key])) throw new Error(page.name + ': ' + key + ' ro‘yxat bo‘lishi kerak.');
      page[key] = clone(raw[key] || []);
      if (page[key].some(v => !v || typeof v !== 'object' || Array.isArray(v))) throw new Error(page.name + ': noto‘g‘ri ' + key + '.');
    }
    if (raw.layers !== undefined) {
      if (!Array.isArray(raw.layers) || !raw.layers.length || raw.layers.some(l => !l || typeof l.id !== 'string'))
        throw new Error(page.name + ': qatlamlar noto‘g‘ri.');
      if (new Set(raw.layers.map(l=>l.id)).size !== raw.layers.length) throw new Error('Qatlam ID takrorlangan.');
      page.layers = clone(raw.layers);
    }
    for (const shape of page.shapes) {
      for (const key of ['points','grips']) if (shape[key] !== undefined) {
        if (!Array.isArray(shape[key]) || shape[key].some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)))
          throw new Error(page.name + ': shakl koordinatalari noto‘g‘ri.');
      }
      for (const key of ['center','arcA','arcMid','arcB']) if (shape[key] !== undefined &&
        (!shape[key] || !Number.isFinite(shape[key].x) || !Number.isFinite(shape[key].y)))
        throw new Error(page.name + ': yoy koordinatalari noto‘g‘ri.');
      if (shape.kind === 'circle' && (!shape.center || !(shape.radius > 0))) throw new Error('Aylana radiusi noto‘g‘ri.');
      if (!shape.points && !shape.grips && shape.kind !== 'circle' && shape.kind !== 'arc') throw new Error('Shakl nuqtalari yo‘q.');
    }
    page.activeLayer = page.layers.some(l => l.id === raw.activeLayer) ? raw.activeLayer : page.layers[0].id;
    if (typeof raw.activeColor === 'string') page.activeColor = raw.activeColor;
    if (raw.view && Number.isFinite(raw.view.scale) && raw.view.scale > 0 &&
        Number.isFinite(raw.view.ox) && Number.isFinite(raw.view.oy)) page.view = clone(raw.view);
    if (raw.settings && typeof raw.settings === 'object' && !Array.isArray(raw.settings)) page.settings = clone(raw.settings);
    validateNumbers(page);
    return page;
  }
  function decode(input) {
    const p = typeof input === 'string' ? JSON.parse(input) : input;
    if (!p || p.format !== FORMAT) throw new Error('Bu Rugby loyiha fayli emas.');
    if (!Number.isInteger(p.version) || p.version < 1 || p.version > VERSION) throw new Error('Loyiha versiyasi qo‘llanmaydi.');
    if (p.units && p.units !== 'mm') throw new Error('Loyiha birligi mm bo‘lishi kerak.');
    const rawPages = p.version === 1 ? [{...p, name:'Sahifa 1'}] : p.pages;
    if (!Array.isArray(rawPages) || !rawPages.length || rawPages.length > 500) throw new Error('Loyihada 1–500 ta sahifa bo‘lishi kerak.');
    const pages = rawPages.map(normalizePage);
    if (new Set(pages.map(v => v.id)).size !== pages.length) throw new Error('Sahifa ID takrorlangan.');
    const activePageId = pages.some(v => v.id === p.activePageId) ? p.activePageId : pages[0].id;
    return {format:FORMAT,version:VERSION,units:'mm',pages,activePageId};
  }
  function encode(pages, activePageId) {
    return {...decode({format:FORMAT,version:VERSION,units:'mm',pages,activePageId}), saved:new Date().toISOString()};
  }
  return {FORMAT,VERSION,clone,uid,emptyPage,normalizePage,decode,encode};
});
