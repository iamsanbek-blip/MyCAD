// Splash oynasi uchun xavfsiz ko'prik
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
  version: () => ipcRenderer.invoke('app:version'),
  onStatus: (fn) => ipcRenderer.on('splash:status', (_e, msg, pct) => fn(msg, pct)),
  onDone:   (fn) => ipcRenderer.on('splash:done',   () => fn()),
  skip:     ()   => ipcRenderer.send('splash:skip'),
});
