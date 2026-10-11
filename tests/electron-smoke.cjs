'use strict';
// Real Chromium + Electron + preload + filesystem IPC. Dialog choices are stubbed.
// This is a GUI/runtime test, not a Smart App Control or code-signing test.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {_electron} = require('playwright');
const root = path.resolve(__dirname, '..');
const appPath = process.env.RUGBY_TEST_APP_PATH ? path.resolve(process.env.RUGBY_TEST_APP_PATH) : root;
const executablePath = process.env.RUGBY_TEST_EXECUTABLE ? path.resolve(process.env.RUGBY_TEST_EXECUTABLE) : require('electron');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'rugby-gui-'));
const savedFile = path.join(temporary, 'two-pages.dbe');
const errors = [];
const passed = [];
const artifactDir = process.env.RUGBY_TEST_ARTIFACTS ? path.resolve(process.env.RUGBY_TEST_ARTIFACTS) : null;
const electronArgs = process.env.RUGBY_TEST_EXECUTABLE ? ['--disable-gpu'] : ['--disable-gpu', appPath];
// Chromium cannot sandbox a root process in this isolated Linux test container.
// The production app does not receive this flag.
if (process.platform === 'linux' && process.getuid?.() === 0) electronArgs.unshift('--no-sandbox');

(async () => {
  const app = await _electron.launch({
    executablePath, args: electronArgs,
    env: {...process.env, NODE_ENV: 'test', RUGBY_TEST_USER_DATA_DIR: path.join(temporary, 'profile')},
    timeout: 30000
  });
  let page;
  const watch = p => p.on('pageerror', error => errors.push(error.message));
  app.on('window', watch);
  app.windows().forEach(watch);
  try {
    // The splash is a separate first window. Wait for the application origin.
    const deadline = Date.now() + 15000;
    while (!page && Date.now() < deadline) {
      page = app.windows().find(p => p.url().startsWith('app://local/'));
      if (!page) await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(page, 'Main window opened');
    await page.waitForFunction(() => typeof documentPages !== 'undefined' && documentPages.length === 1);
    assert.equal(await page.evaluate(() => !!window.desktop?.saveProjectAs), true);
    const appVersion = await app.evaluate(({app}) => app.getVersion());
    assert.equal(appVersion, require('../package.json').version);
    passed.push('real app:// renderer and isolated preload started');

    // Windows may constrain the initial window to the CI display's small work
    // area. Set the content size explicitly before using drawing coordinates.
    const mainWindow = await app.browserWindow(page);
    await mainWindow.evaluate(window => window.setContentSize(1600, 950));
    await page.waitForFunction(() => window.innerWidth === 1600 && window.innerHeight === 950);

    await page.locator('#modeDrawBtn').click();
    await page.locator('#toolRectBtn').click();
    await page.locator('#cv').click({position: {x:200,y:400}});
    await page.locator('#cv').click({position: {x:420,y:570}});
    await page.waitForFunction(() => drawnLines.length === 1);
    await page.keyboard.press('Escape');
    await page.locator('#pageAddBtn').click();
    assert.equal(await page.evaluate(() => drawnLines.length), 0);
    await page.locator('#modeDrawBtn').click();
    await page.locator('#toolCircleBtn').click();
    await page.locator('#cv').click({position: {x:500,y:470}});
    await page.locator('#cv').click({position: {x:565,y:470}});
    await page.waitForFunction(() => drawnLines.length === 1);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+PageUp');
    assert.equal(await page.evaluate(() => drawnLines[0].kind), 'rect');
    passed.push('mouse drawing and keyboard page navigation preserve independent geometry');

    await page.keyboard.press('F10');
    await page.locator('#shortcutSearch').fill('Chiziq');
    const binding = page.locator('input[id="key-draw.line"]');
    await binding.click();
    await binding.press('q');
    await page.locator('#shortcutSaveBtn').click();
    await page.keyboard.press('q');
    assert.equal(await page.evaluate(() => drawTool), 'line');
    await page.keyboard.press('Escape');
    passed.push('hotkey editor receives real keyboard events and executes remapped command');

    await app.evaluate(({dialog}, file) => {
      dialog.showSaveDialog = async () => ({canceled:false,filePath:file});
      dialog.showOpenDialog = async () => ({canceled:false,filePaths:[file]});
    }, savedFile);
    await page.keyboard.press('Control+s');
    await page.waitForFunction(() => projectFilePath && !projectDirty);
    const content = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
    assert.equal(content.pages.length, 2);
    assert.equal(content.pages[0].shapes.length, 1);
    assert.equal(content.pages[1].shapes.length, 1);
    await page.locator('#newProjBtn').click();
    await page.waitForFunction(() => documentPages.length === 1 && drawnLines.length === 0);
    await page.keyboard.press('Control+o');
    await page.waitForFunction(() => documentPages.length === 2);
    assert.equal(await page.evaluate(() => projectDirty), false);
    passed.push('save, new and reopen round-trip through actual Electron IPC and disk');

    await page.keyboard.press('F10');
    await page.locator('#shortcutCancelBtn').click();
    for (const [width,height] of [[1600,950],[1100,700]]) {
      const win = await app.browserWindow(page);
      await win.evaluate((window, size) => window.setContentSize(...size), [width,height]);
      await page.waitForFunction(w => window.innerWidth === w, width);
      const overflow = await page.evaluate(() => {
        const toolbar = document.getElementById('drawToolbar').getBoundingClientRect();
        return [...document.querySelectorAll('#drawToolbar button,#drawToolbar input,#drawToolbar select')]
          .filter(e => e.getClientRects().length && e.getBoundingClientRect().right > toolbar.right + 1)
          .map(e => e.id);
      });
      assert.deepEqual(overflow, [], 'Toolbar stays out of sidebar at '+width);
    }
    passed.push('toolbar fits the canvas at 1600x950 and 1100x700');
    assert.deepEqual(errors, []);
    if (artifactDir) {
      fs.mkdirSync(artifactDir, {recursive:true});
      await page.screenshot({path:path.join(artifactDir,'electron-smoke.png')});
      fs.writeFileSync(path.join(artifactDir,'electron-smoke.json'), JSON.stringify({
        status:'passed', platform:process.platform, electron:require('electron/package.json').version,
        appVersion, testedApp:process.env.RUGBY_TEST_EXECUTABLE ? 'packaged Windows executable' : appPath.endsWith('.asar') ? 'packaged app.asar' : 'source directory',
        appArchiveSha256:appPath.endsWith('.asar') ? require('node:crypto').createHash('sha256').update(fs.readFileSync(appPath)).digest('hex') : null,
        checks:passed, pageErrors:errors, nativeDialogs:'choices mocked', smartAppControl:'not tested'
      },null,2)+'\n');
    }
    console.log(JSON.stringify({status:'passed',platform:process.platform,checks:passed,pageErrors:errors},null,2));
  } catch (error) {
    if (artifactDir && page && !page.isClosed()) {
      fs.mkdirSync(artifactDir, {recursive:true});
      await page.screenshot({path:path.join(artifactDir,'failure.png')}).catch(()=>{});
      const viewport = await page.evaluate(() => ({width:innerWidth,height:innerHeight})).catch(()=>null);
      fs.writeFileSync(path.join(artifactDir,'failure.json'),JSON.stringify({error:String(error),viewport,passed,pageErrors:errors},null,2));
    }
    throw error;
  } finally {
    if (page && !page.isClosed()) await page.evaluate(() => {projectDirty=false;}).catch(()=>{});
    await app.close();
    fs.rmSync(temporary, {recursive:true,force:true});
  }
})().catch(error => {console.error(error);process.exitCode=1;});
