'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async function(app,page,temporary,artifactDir){
 const passed=[];
 await page.locator('#assistantToggle').click();
 await page.waitForSelector('#assistantConsole:not([hidden])');
 await page.getByText('Internet talab qilmaydigan amallar',{exact:true}).click();
 const before=await page.evaluate(()=>panelScene.panels.length);
 await page.locator('#assistantLocalCabinet').click();
 await page.waitForSelector('#assistantReview:not([hidden])');
 assert.equal(await page.evaluate(()=>panelScene.panels.length),before,'Preview does not mutate scene');
 assert.equal(await page.locator('#assistantPreviewRows tr').count(),8);
 assert.match(await page.locator('#assistantStatus').innerText(),/Reja tayyor/);
 if(artifactDir){fs.mkdirSync(artifactDir,{recursive:true});await page.screenshot({path:path.join(artifactDir,'assistant-preview.png')});}
 await page.locator('#assistantApply').click();
 await page.waitForFunction(n=>panelScene.panels.length===n+8,before);
 await page.locator('#assistantClose').click();
 await page.keyboard.press('Control+z');
 await page.waitForFunction(n=>panelScene.panels.length===n,before);
 passed.push('AI console previews 8 exact cabinet panels and applies with single-step undo');
 // A custom function is saved through the real IPC/store and survives renderer reload.
 await page.locator('#assistantToggle').click();
 await page.locator('#assistantLocalCabinet').click();
 await page.locator('#assistantSaveMacro').click();
 await page.locator('#askInput').fill('GUI korpus');await page.locator('#askOk').click();
 await page.waitForFunction(()=>Object.values(assistantProfile.values).some(v=>v?.name==='GUI korpus'));
 assert.equal(await page.evaluate(()=>!!window.desktop.assistant),true);
 await page.evaluate(()=>{projectDirty=false;});await page.reload();
 await page.waitForFunction(()=>RUGBY_COMMANDS.some(c=>c.label==='Makros · GUI korpus'));
 await page.locator('#assistantToggle').click();
 await page.getByText('Makroslar va shablon bloklar',{exact:true}).click();
 await page.getByRole('button',{name:'ƒ GUI korpus',exact:true}).click();
 assert.equal(await page.locator('#assistantPreviewRows tr').count(),8);
 assert.match(await page.locator('#assistantStatus').innerText(),/Reja tayyor/);
 passed.push('new macro persists across renderer reload and is immediately registered as a hotkey command');
 // Drive folder is selected via a stubbed native dialog, but actual sync uses disk.
 const cloud=path.join(temporary,'cloud-profile');fs.mkdirSync(cloud,{recursive:true});
 await app.evaluate(({dialog},folder)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[folder]});},cloud);
 await page.locator('#assistantConnection > summary').click();
 await page.locator('#assistantProvider').selectOption('folder');
 await page.locator('#assistantChooseFolder').click();
 await page.waitForFunction(()=>assistantConfig.provider==='folder');
 await page.locator('#assistantSyncNow').click();
 await page.waitForFunction(()=>assistantProfile.sync?.state==='synced');
 const files=fs.readdirSync(path.join(cloud,'RugbyProfile-v1'));assert.ok(files.some(n=>n.endsWith('.json')));
 const profile=JSON.parse(fs.readFileSync(path.join(cloud,'RugbyProfile-v1',files.find(n=>n.endsWith('.json'))),'utf8'));
 assert.ok(profile.ops.some(o=>o.value?.name==='GUI korpus'));
 passed.push('Drive-folder configuration and profile replication use actual native IPC and disk');
 for(const width of [1100,1600]){const win=await app.browserWindow(page);await win.evaluate((w,width)=>w.setContentSize(width,900),width);await page.waitForFunction(w=>innerWidth===w,width);const bounds=await page.locator('#assistantConsole').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);}
 if(artifactDir){fs.mkdirSync(artifactDir,{recursive:true});await page.screenshot({path:path.join(artifactDir,'assistant.png')});}
 await page.locator('#assistantClose').click();
 return passed;
};
