/* Keyboard normalization and conflict checks. No DOM or CAD globals. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RugbyShortcuts=api;})(globalThis,function(){
  'use strict';
  function fromEvent(e){
    if(e.isComposing || ['Control','Shift','Alt','Meta','Dead','Unidentified'].includes(e.key)) return '';
    let key = e.code==='Space'?'Space': /^Key[A-Z]$/.test(e.code||'') ? e.code.slice(3) : e.key;
    if(key.length===1) key=key.toUpperCase();
    const parts=[]; if(e.ctrlKey||e.metaKey)parts.push('Ctrl');if(e.altKey)parts.push('Alt');if(e.shiftKey)parts.push('Shift');
    return parts.concat(key).join('+');
  }
  function scope(id){return id.startsWith('model3d.')?'modeling':/^(file\.|page\.|settings\.|view\.model3d$|edit\.(undo|redo|redoAlt)$)/.test(id)?'global':'drawing';}
  function validate(combo, id, bindings){
    if(!combo) return '';
    const bits=combo.split('+'), key=bits.pop();
    const expected=['Ctrl','Alt','Shift'].filter(p=>bits.includes(p));
    if(bits.join('+')!==expected.join('+') || !/^(?:[A-Z]|F(?:[1-9]|1[0-2])|Space|PageUp|PageDown|Insert|Delete|Home|End)$/.test(key))
      return 'Harf, F1–F12 yoki PageUp/PageDown kabi tugmani tanlang.';
    if(['Alt+F4','Ctrl+Alt+Delete','Ctrl+W','Ctrl+Q','Ctrl+R','Ctrl+Shift+R','F5','Ctrl+Tab','Ctrl+Shift+Tab'].includes(combo))
      return 'Bu kombinatsiya tizim yoki oynaga ajratilgan.';
    const other=Object.keys(bindings).find(k=>k!==id&&bindings[k]===combo&&(scope(k)===scope(id)||scope(k)==='global'||scope(id)==='global'));
    return other ? 'conflict:'+other : '';
  }
  function restore(defaults, raw){
    const result={...defaults};
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return result;
    // Validate the complete candidate at once, so swapping two shortcuts survives restart.
    for(const id of Object.keys(defaults))if(typeof raw[id]==='string')result[id]=raw[id];
    return Object.entries(result).some(([id,v])=>validate(v,id,result)) ? {...defaults} : result;
  }
  return {fromEvent,validate,restore,scope};
});
