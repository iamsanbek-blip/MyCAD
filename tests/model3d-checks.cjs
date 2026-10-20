'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{routeExports,waitFile}=require('./native-save.cjs');
module.exports=async(app,page,temporary,artifactDir)=>{
 const checks=[],canvas=page.locator('#model3dViewport > canvas');
 const blur=()=>page.evaluate(()=>document.activeElement?.blur());
 const menu=async(name,id)=>{await page.locator('#'+name+'MenuToggle').click();await page.locator('#'+id).click();};
 await page.evaluate(()=>{setAppMode('draw');drawnLines=[];panelScene=RugbyPanels.empty();setDrawTool('rect');addDrawPoint({x:0,y:0});addDrawPoint({x:600,y:400});setDrawTool('none');});
 await page.locator('#mode3dBtn').click();await page.waitForFunction(()=>panelView!==null,null,{timeout:15000});
 assert.equal(await canvas.count(),1);assert.equal(await page.locator('.axisNavigator canvas').count(),1);
 assert.equal(await page.evaluate(()=>panelScene.panels.length),1);assert.equal(await page.evaluate(()=>panelScene.panels[0].thickness),16);
 await page.locator('#panelSceneList button').first().click();
 await page.locator('#panelWidth').fill('900');await page.locator('#panelHeight').fill('500');await page.locator('#panelRY').fill('27.5');await page.locator('#panelX').fill('300');await page.locator('#panelApply').click();
 assert.deepEqual(await page.evaluate(()=>{const p=panelScene.panels[0];return[p.width,p.height,p.thickness,p.rotation[1],p.position[0]];}),[900,500,16,27.5,300]);
 await blur();await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>panelScene.panels[0].width),600);await page.keyboard.press('Control+y');assert.equal(await page.evaluate(()=>panelScene.panels[0].width),900);
 await page.keyboard.press('Control+d');assert.equal(await page.evaluate(()=>panelScene.panels.length),2);await page.locator('#panelThickness').fill('18');await page.locator('#panelApply').click();
 assert.deepEqual(await page.evaluate(()=>panelScene.panels.map(p=>p.thickness)),[16,18]);
 assert.equal(await page.evaluate(()=>panelView.objects.children.every(m=>{m.geometry.computeBoundingBox();return Math.abs(m.geometry.boundingBox.max.z-m.geometry.boundingBox.min.z-m.userData.panel.thickness)<.001&&m.scale.z===1;})),true);
 checks.push('Rectangle converts once to solid 16mm panel; numeric edits, duplicate, independent thickness and undo/redo work');
 await blur();await page.keyboard.press('Control+a');assert.equal(await page.evaluate(()=>panelSelectionIds().length),2);await page.keyboard.press('Delete');assert.equal(await page.evaluate(()=>panelScene.panels.length),0);await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>panelScene.panels.length),2);
 await page.keyboard.press('Control+a');await menu('view','viewHide');assert.equal(await page.evaluate(()=>panelScene.panels.every(p=>p.hidden)),true);await menu('view','viewUnhide');assert.equal(await page.evaluate(()=>panelScene.panels.some(p=>p.hidden)),false);
 checks.push('Ctrl+A / Delete removes the full selection in one undo; Hide and Unhide apply to all selected panels');
 await page.locator('#panelViewtop').click();assert.equal(await page.locator('#viewPresets [aria-pressed=true]').count(),1);
 await blur();await page.keyboard.press('n');assert.equal(await page.evaluate(()=>panelScene.panels.length),3);await page.keyboard.press('n');assert.equal(await page.evaluate(()=>panelScene.panels.length),3);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>panelScene.panels.length),2);
 await page.locator('#panelNew').click();const box=await canvas.boundingBox();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.6);await page.mouse.click(box.x+box.width*.3,box.y+box.height*.6);assert.equal(await page.evaluate(()=>panelScene.panels.length),3);assert.equal(await page.evaluate(()=>panelScene.panels.at(-1).thickness),16);await blur();await page.keyboard.press('Control+z');assert.equal(await page.evaluate(()=>panelScene.panels.length),2);
 checks.push('Universal panel follows cursor, N is Modeling-only, repeated N and Escape cancel without leftovers, placement is one undo');
 await page.locator('#panelViewiso').click();const before=await page.evaluate(()=>panelView.camera.position.toArray()),b=await canvas.boundingBox();await page.mouse.move(b.x+b.width*.8,b.y+b.height*.75);await page.mouse.down({button:'middle'});await page.mouse.move(b.x+b.width*.65,b.y+b.height*.6,{steps:10});await page.mouse.up({button:'middle'});assert.notDeepEqual(await page.evaluate(()=>panelView.camera.position.toArray()),before);
 const pixels=await page.evaluate(()=>{const c=panelView.renderer.domElement,o=document.createElement('canvas');o.width=c.width;o.height=c.height;const ctx=o.getContext('2d');ctx.drawImage(c,0,0);const d=ctx.getImageData(0,0,o.width,o.height).data;let count=0;for(let i=0;i<d.length;i+=4)if(d[i]>90&&d[i]>d[i+2]*1.15)count++;return count;});assert.ok(pixels>100,'solid panel pixels rendered');
 checks.push('Middle mouse orbits; solid panels rendered by WebGL; XYZ navigator present; only one view preset active');
 const originalPage=await page.evaluate(()=>activePageId),saved=await page.evaluate(()=>projectText());assert.equal(JSON.parse(saved).version,3);await page.locator('#pageAddBtn').click();assert.equal(await page.evaluate(()=>panelScene.panels.length),0);await page.locator('[data-page-id="'+originalPage+'"]').click();assert.equal(await page.evaluate(()=>panelScene.panels.length),2);
 await page.evaluate(t=>loadProject(t,'3d.dbe'),saved);assert.deepEqual(await page.evaluate(()=>panelScene.panels.map(p=>p.thickness)),[16,18]);
 await routeExports(app,temporary);for(const format of ['csv','txt','xlsx']){await page.locator('#panelQuickFormat').selectOption(format);await page.locator('#panelQuickExport').click();const file=await waitFile(temporary,'Rugby-raskroy.'+format),bytes=fs.readFileSync(file);assert.ok(bytes.length>20);if(format==='xlsx')assert.equal(bytes.subarray(0,2).toString(),'PK');else{assert.ok(bytes.toString('utf8').includes('900'));assert.ok(bytes.toString('utf8').includes('18'));}await page.waitForFunction(()=>document.getElementById('panelQuickStatus').textContent==='Eksport saqlandi.');}
 checks.push('Multipage v3 persistence retains panels; right-side CSV/TXT/XLSX exports use actual preload IPC and filesystem bytes');
 // Controlled geometry with real mouse A-to-B clicks, including target close to cursor.
 await page.evaluate(()=>{panelView.cancel();panelScene=RugbyPanels.empty();drawnLines=[];const t=RugbyPanels.template([{x:0,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}]);const a=RugbyPanels.instantiate(t),b=RugbyPanels.instantiate(t);a.position=[0,0,8];b.position=[800.125,0,8];panelScene.panels=[a,b];pushHistory();panelRefresh();panelSelect(a.id);panelView.fit('top');});
 const endpoints=await page.evaluate(()=>{const ms=panelView.objects.children,c=panelView.camera,r=panelView.renderer.domElement.getBoundingClientRect();const at=(m,x)=>{m.updateMatrixWorld(true);const v=m.localToWorld(m.position.clone().set(x,200,8)).project(c);return{x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};};return{a:at(ms[0],-300),b:at(ms[1],300)};});
 await blur();await page.keyboard.press('g');await page.mouse.click(endpoints.a.x,endpoints.a.y);await page.mouse.move(endpoints.b.x+3,endpoints.b.y+2,{steps:8});await page.mouse.click(endpoints.b.x+3,endpoints.b.y+2);
 assert.ok(Math.abs(await page.evaluate(()=>panelScene.panels[0].position[0])-1400.125)<1e-7,'B snaps exactly, not to a rounded grid');
 assert.equal(await page.evaluate(()=>panelScene.panels[0].thickness),16);
 checks.push('Real G A-to-B pointer placement snaps target endpoint exactly at fractional 1400.125mm without changing thickness');
 // Real rectangle selection after switching to Select (no gizmo interference).
 await blur();await page.keyboard.press('v');await page.locator('#panelViewtop').click();const bb=await canvas.boundingBox();await page.mouse.move(bb.x+15,bb.y+15);await page.mouse.down();await page.mouse.move(bb.x+bb.width-15,bb.y+bb.height-15,{steps:12});await page.mouse.up();assert.equal(await page.evaluate(()=>panelSelectionIds().length),2);
 checks.push('Dragging an empty-space rectangle selects both panels');
 await page.locator('#panelViewiso').click();
 if(artifactDir){fs.mkdirSync(artifactDir,{recursive:true});await page.screenshot({path:path.join(artifactDir,'model3d.png')});fs.writeFileSync(path.join(artifactDir,'model3d.json'),JSON.stringify({status:'passed',checks,panelPixels:pixels},null,2));}
 await page.locator('#modeSelectBtn').click();assert.equal(await page.locator('#cncDeleteDock #deleteLineBtn').count(),1);await page.locator('#workspaceExpandBtn').click();assert.equal(await page.locator('#sidebar').isVisible(),false);await page.locator('#workspaceExpandBtn').click();await page.locator('#modeDrawBtn').click();assert.equal(await page.locator('#drawToolbar #deleteLineBtn').count(),1);checks.push('Cnc Delete is docked at bottom; workspace expand hides the sidebar; Drawing restores Delete to its toolbar');return checks;
};
