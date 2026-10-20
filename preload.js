// Asosiy oyna uchun xavfsiz ko'prik.
// contextIsolation yoqilgan — sahifaga faqat shu funksiyalar ko'rinadi.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
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
