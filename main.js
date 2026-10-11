// ============================================================================
//  RUGBY — CNC Corner Editor
//  Electron asosiy jarayoni (main process)
//
//  Oqim:
//    1. TO'LIQ EKRAN splash ochiladi — atlas shader foni + logo animatsiyasi
//    2. Fon rejimida asosiy oyna yuklanadi
//    3. Asosiy oyna tayyor bo'lgach VA splash kamida MIN_SPLASH_MS ko'ringach,
//       splash yumshoq so'nib yopiladi, dastur ko'rinadi
//
//  Splash "kamida N ms, lekin dastur tayyor bo'lgunicha" turadi — shuning
//  uchun sekin kompyuterda ham oq ekran ko'rinmaydi.
// ============================================================================

const { app, BrowserWindow, protocol, net, dialog, ipcMain, shell, nativeImage }
  = require('electron');
const path = require('path');
const url  = require('url');
// The graphical smoke test gets an isolated profile; normal launches are unchanged.
if(process.env.NODE_ENV==='test' && process.env.RUGBY_TEST_USER_DATA_DIR){
  app.setPath('userData',path.resolve(process.env.RUGBY_TEST_USER_DATA_DIR));
}
const {writeProjectAtomic} = require('./desktop/project-files');
const authorizedProjectPaths = new Set();
let rendererReady=false, queuedOpenFile=null;

const MIN_SPLASH_MS = 250;               // tayyor oynani sun'iy kutdirmaymiz
const APP_DIR    = path.join(__dirname, 'app');
const ASSETS_DIR = path.join(__dirname, 'assets');

let splashWin = null;
let mainWin   = null;
let splashShownAt = 0;
let splashClosed  = false;

// ---------------------------------------------------------------------------
//  Bitta nusxa qoidasi — dastur ikki marta ochilmasin
// ---------------------------------------------------------------------------
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
    deliverFile(pendingFileArg(argv));
  });
}

// ---------------------------------------------------------------------------
//  Maxsus "app://" protokoli
//
//  Sabab: dastur file:// orqali yuklansa Chromium File System Access API'ni
//  (Ctrl+S bilan papka tanlash) BERMAYDI. Maxsus protokolni "secure" deb
//  ro'yxatdan o'tkazsak sahifa xavfsiz kontekstda ishlaydi va saqlash/ochish
//  dialoglari to'liq ishlaydi — brauzerdagi cheklov yo'qoladi.
// ---------------------------------------------------------------------------
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

function registerAppProtocol() {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const target = path.normalize(path.join(APP_DIR, rel));
    if (path.relative(APP_DIR,target).startsWith('..') || path.isAbsolute(path.relative(APP_DIR,target))) return new Response('Forbidden', { status: 403 });
    return net.fetch(url.pathToFileURL(target).toString());
  });
}

// ---------------------------------------------------------------------------
//  Splash — TO'LIQ EKRAN
// ---------------------------------------------------------------------------
function createSplash() {
  splashWin = new BrowserWindow({
    fullscreen: true,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0b1220',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload-splash.js'),
    },
  });

  splashWin.setMenuBarVisibility(false);
  splashWin.loadFile(path.join(__dirname, 'splash.html'));

  splashWin.once('ready-to-show', () => {
    splashWin.show();
    splashShownAt = Date.now();
  });
  splashWin.on('closed', () => { splashWin = null; });
}

function splashSay(msg, pct) {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.webContents.send('splash:status', msg, pct);
  }
}

function closeSplash() {
  if (splashClosed) return;
  splashClosed = true;
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.webContents.send('splash:done');
    setTimeout(() => {
      if (splashWin && !splashWin.isDestroyed()) splashWin.close();
      if (mainWin && !mainWin.isDestroyed()) { mainWin.show(); mainWin.focus(); }
    }, 340);                            // so'nish animatsiyasi tugashini kutamiz
  } else if (mainWin) {
    mainWin.show(); mainWin.focus();
  }
}

// Esc yoki bosish bilan o'tkazib yuborish
ipcMain.on('splash:skip', () => {
  if (mainWin && mainWin.webContents.isLoading()) return;   // hali tayyor emas
  closeSplash();
});

// ---------------------------------------------------------------------------
//  Asosiy oyna
// ---------------------------------------------------------------------------
function createMain() {
  const icon = nativeImage.createFromPath(path.join(ASSETS_DIR, 'icon-512.png'));

  mainWin = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b1220',
    show: false,
    icon,
    title: 'Rugby — CNC Corner Editor',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWin.setMenuBarVisibility(false);
  splashSay('Interfeys yuklanmoqda…', 35);
  mainWin.loadURL('app://local/index.html');

  mainWin.webContents.once('did-finish-load', () => {
    splashSay('Modullar tayyorlanmoqda…', 78);
    if(rendererReady)deliverFile(queuedOpenFile);
  });

  mainWin.once('ready-to-show', () => {
    const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - splashShownAt));
    setTimeout(closeSplash, wait);
  });

  // yuklanmasa ham qotib qolmasin
  setTimeout(() => { if (!splashClosed) closeSplash(); }, 15000);

  mainWin.webContents.setWindowOpenHandler(({ url: u }) => {
    if (/^https?:/.test(u)) shell.openExternal(u);
    return { action: 'deny' };
  });

  mainWin.webContents.on('will-prevent-unload', (event) => {
    const response=dialog.showMessageBoxSync(mainWin,{
      type:'question',buttons:['Bekor','Saqlamay chiqish','Saqlash'],defaultId:2,cancelId:0,
      title:'Saqlanmagan loyiha',message:'Barcha sahifalarni saqlaysizmi?'
    });
    if(response===1)event.preventDefault();
    if(response===2)mainWin.webContents.send('project:save-and-close');
  });
  mainWin.webContents.on('will-navigate', (event,u)=>{if(u!=='app://local/index.html')event.preventDefault();});
  mainWin.webContents.on('did-fail-load', (_e,code,description,validatedURL,isMainFrame)=>{
    if(isMainFrame&&code!==-3)dialog.showErrorBox('Rugby yuklanmadi',description+' ('+code+')');
  });
  mainWin.on('closed', () => { mainWin = null; rendererReady=false; });
}

// ---------------------------------------------------------------------------
//  Saqlanmagan ish bo'lsa chiqishdan oldin so'rash
// ---------------------------------------------------------------------------
ipcMain.handle('confirm-quit', async (_e, isDirty) => {
  if (!isDirty) return true;
  const { response } = await dialog.showMessageBox(mainWin, {
    type: 'warning',
    buttons: ['Bekor qilish', 'Saqlamay chiqish'],
    defaultId: 0,
    cancelId: 0,
    title: 'Saqlanmagan o\'zgarishlar',
    message: 'Loyihada saqlanmagan o\'zgarishlar bor.',
    detail: 'Baribir chiqasizmi?',
  });
  return response === 1;
});

ipcMain.handle('app:version', () => app.getVersion());

// ---------------------------------------------------------------------------
//  LOYIHANI SAQLASH / OCHISH — tizimning O'Z dialoglari orqali
//
//  Nega shunday? Brauzerdagi File System Access API (showSaveFilePicker)
//  Electron ichida ishonchli emas. U ishlamaganda kod "yuklab olish"ga
//  tushardi — natijada Ctrl+S har safar YANGI fayl yaratardi
//  (loyiha.dbe, loyiha (1).dbe, loyiha (2).dbe ...).
//
//  Endi Electron'ning o'z dialog + fs modullari ishlatiladi: fayl yo'li
//  eslab qolinadi va Ctrl+S AYNAN o'sha fayl ustiga yozadi.
// ---------------------------------------------------------------------------
ipcMain.handle('project:saveAs', async (_e, content, suggestedName) => {
  assertRenderer(_e);
  const { canceled, filePath } = await dialog.showSaveDialog(mainWin, {
    title: 'Loyihani saqlash',
    defaultPath: suggestedName || 'loyiha.dbe',
    filters: [{ name: 'Rugby loyihasi', extensions: ['dbe'] }],
    properties: ['createDirectory', 'showOverwriteConfirmation'],
  });
  if (canceled || !filePath) return null;
  const result=writeProjectAtomic(filePath,content);
  authorizedProjectPaths.add(filePath);
  return result;
});

ipcMain.handle('project:save', async (_e, filePath, content) => {
  assertRenderer(_e);
  if(!authorizedProjectPaths.has(filePath))throw new Error('Faylni avval Ochish yoki Boshqa nom bilan saqlash orqali tanlang.');
  return writeProjectAtomic(filePath,content);
});

ipcMain.handle('project:open', async (_e) => {
  assertRenderer(_e);
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWin, {
    title: 'Loyihani ochish',
    filters: [{ name: 'Rugby loyihasi', extensions: ['dbe', 'json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths || !filePaths[0]) return null;
  const fp = filePaths[0];
  authorizedProjectPaths.add(fp);
  return { path: fp, name: path.basename(fp), text: fs.readFileSync(fp, 'utf8') };
});

// ---------------------------------------------------------------------------
//  .dbe faylni ikki marta bosib ochish (fayl assotsiatsiyasi)
// ---------------------------------------------------------------------------
const fs = require('fs');
function pendingFileArg(argv) {
  const a = (argv || []).find(v => typeof v === 'string' && v.toLowerCase().endsWith('.dbe'));
  return a && fs.existsSync(a) ? a : null;
}
function deliverFile(file) {
  if (!file) return;
  if(!mainWin||!rendererReady){queuedOpenFile=file;return;}
  queuedOpenFile=null;
  try {
    const text = fs.readFileSync(file, 'utf8');
    authorizedProjectPaths.add(file);
    mainWin.webContents.send('open-file', text, path.basename(file), file);
  } catch (e) { dialog.showErrorBox('Fayl ochilmadi',e.message); }
}

// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  if(!hasInstanceLock)return;
  queuedOpenFile=queuedOpenFile||pendingFileArg(process.argv);
  if (process.platform === 'win32') app.setAppUserModelId('uz.rugby.editor');
  registerAppProtocol();
  createSplash();
  createMain();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMain();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function assertRenderer(event){
  if(!mainWin || event.sender!==mainWin.webContents || !event.senderFrame?.url.startsWith('app://local/'))
    throw new Error('Noma’lum oynadan so‘rov.');
}
ipcMain.handle('project:confirm-replace',async(event)=>{
  assertRenderer(event);
  const {response}=await dialog.showMessageBox(mainWin,{type:'question',
    buttons:['Bekor','Saqlamay davom etish','Saqlash'],defaultId:2,cancelId:0,
    message:'Loyihada saqlanmagan o‘zgarishlar bor.',detail:'Barcha sahifalarni saqlaysizmi?'});
  return ['cancel','discard','save'][response]||'cancel';
});
ipcMain.on('app:renderer-ready',event=>{assertRenderer(event);rendererReady=true;deliverFile(queuedOpenFile);});
ipcMain.on('app:close-after-save',event=>{assertRenderer(event);mainWin.close();});
