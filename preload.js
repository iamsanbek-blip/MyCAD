// Asosiy oyna uchun xavfsiz ko'prik.
// contextIsolation yoqilgan — sahifaga faqat shu funksiyalar ko'rinadi.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  assistant: {
    load:()=>ipcRenderer.invoke('assistant:load'),
    set:(changes,bases)=>ipcRenderer.invoke('assistant:set',changes,bases),
    sync:()=>ipcRenderer.invoke('assistant:sync'),
    configure:input=>ipcRenderer.invoke('assistant:configure',input),
    plan:input=>ipcRenderer.invoke('assistant:plan',input),
    export:()=>ipcRenderer.invoke('assistant:export'),
    import:()=>ipcRenderer.invoke('assistant:import'),
    onProfile:fn=>{const listener=(_e,value)=>fn(value);ipcRenderer.on('assistant:profile',listener);return()=>ipcRenderer.removeListener('assistant:profile',listener);}
  },
  ready:()=>ipcRenderer.send('app:renderer-ready'),
  confirmReplace:()=>ipcRenderer.invoke('project:confirm-replace'),
  closeAfterSave:()=>ipcRenderer.send('app:close-after-save'),
  onSaveAndClose:fn=>ipcRenderer.on('project:save-and-close',()=>fn()),
  version:     ()        => ipcRenderer.invoke('app:version'),
  confirmQuit: (isDirty) => ipcRenderer.invoke('confirm-quit', isDirty),
  onOpenFile:  (fn) => ipcRenderer.on('open-file', (_e, text, name, fullPath) => fn(text, name, fullPath)),

  // Loyiha fayllari — tizimning o'z dialoglari
  saveProjectAs: (content, suggestedName) => ipcRenderer.invoke('project:saveAs', content, suggestedName),
  saveProjectTo: (filePath, content)      => ipcRenderer.invoke('project:save', filePath, content),
  openProject:   ()                       => ipcRenderer.invoke('project:open'),
  exportFile: (content,name) => ipcRenderer.invoke('file:export',content,name),
});
