const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createHarness}=require('./browser-harness.cjs');
const codec=require('../app/js/core/document-codec.js');
const keys=require('../app/js/core/shortcut-map.js');
const {writeProjectAtomic}=require('../desktop/project-files.js');
function rect(h,x=0){h.run(`setAppMode('draw');setDrawTool('rect');addDrawPoint({x:${x},y:0});addDrawPoint({x:${x+200},y:100});`);}
function key(h,key,mods={},target=h.document.body){
 const e={key,code:/^[a-z]$/i.test(key)?'Key'+key.toUpperCase():key,target,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...mods};
 h.sb.__event=e;h.run('handleShortcut(__event)');return e;
}
test('renderer loads every script in HTML order and starts clean',()=>{
 const h=createHarness();assert.equal(h.run('documentPages.length'),1);assert.equal(h.run('projectDirty'),false);assert.deepEqual(h.errors,[]);assert.deepEqual(h.alerts,[]);
});
test('pages isolate geometry, layer state, zoom and per-page undo/redo',()=>{
 const h=createHarness();rect(h);const first=h.run('activePageId');
 h.run("layers[0].name='Kesish A';view.scale=3;pushHistory();addPage();");
 assert.equal(h.run('drawnLines.length'),0);rect(h,400);const second=h.run('activePageId');
 h.run('undo()');assert.equal(h.run('drawnLines.length'),0);
 h.sb.pageId=first;h.run('switchPage(pageId)');assert.equal(h.run('drawnLines.length'),1);assert.equal(h.run('view.scale'),3);assert.equal(h.run('layers[0].name'),'Kesish A');
 h.sb.pageId=second;h.run('switchPage(pageId);redo()');assert.equal(h.run('drawnLines[0].points[0].x'),400);
 assert.notEqual(h.run('layers[0].name'),'Kesish A');
});
test('duplicate, reorder and delete operate on the right page without sharing geometry',()=>{
 const h=createHarness();rect(h);const first=h.run('activePageId');h.run('duplicatePage()');const copy=h.run('activePageId');
 h.run('drawnLines[0].points[0].x=999;movePage(-1)');assert.equal(h.run('documentPages[0].id'),copy);
 h.sb.first=first;h.run('switchPage(first)');assert.equal(h.run('drawnLines[0].points[0].x'),0);
 h.run('deletePage()');assert.equal(h.run('documentPages.length'),1);assert.equal(h.run('activePageId'),copy);
 assert.equal(h.run('deletePage()'),false);
});
test('round trip includes all pages, dimensions, text, relief and active tab',()=>{
 const h=createHarness();rect(h);h.run("corners[0].mode='dogbone';corners[0].size=3;dimensions=[{kind:'h',p1:{x:0,y:0},p2:{x:200,y:0},place:{x:0,y:-20}}];texts=[{id:'test',text:'A',x:0,y:0,size:10,rot:0,layer:'cut'}];pushHistory();addPage();");rect(h,500);
 const saved=h.run('projectText()');assert.equal(JSON.parse(saved).pages.length,2);
 const restored=createHarness();restored.sb.saved=saved;assert.equal(restored.run("loadProject(saved,'multi.dbe')"),true);
 assert.equal(restored.run('drawnLines[0].points[0].x'),500);restored.run('nextPage(-1)');
 assert.equal(restored.run('dimensions.length'),1);assert.equal(restored.run('texts[0].text'),'A');assert.equal(restored.run("corners[0].mode"),'dogbone');
 assert.deepEqual(restored.errors,[]);
});
test('legacy v1 opens as one page and v2 unknown versions are rejected',()=>{
 const p=codec.emptyPage();const v1={...p,format:codec.FORMAT,version:1};const out=codec.decode(JSON.stringify(v1));
 assert.equal(out.pages.length,1);assert.equal(out.version,2);assert.throws(()=>codec.decode({...v1,version:99}));
});
test('invalid inactive pages are rejected before any current data changes',()=>{
 const h=createHarness();rect(h);const before=h.run('projectText()');const p=JSON.parse(before);p.pages.push({...codec.emptyPage(),shapes:[{points:[{x:'bad',y:1}]}]});h.sb.bad=JSON.stringify(p);
 assert.equal(h.run("loadProject(bad,'broken.dbe')"),false);assert.equal(h.run('drawnLines.length'),1);assert.equal(h.run('documentPages.length'),1);
});
test('cancelled/invalid open preserves existing path and dirty flag',async()=>{
 const h=createHarness();rect(h);h.run("projectFilePath='good.dbe';projectFileName='good.dbe';");
 h.sb.bad='{"format":"no"}';assert.equal(await h.run("acceptProjectFile(bad,'bad.dbe',null,'bad.dbe')"),false);
 assert.equal(h.run('projectFilePath'),'good.dbe');assert.equal(h.run('projectDirty'),true);
 h.sb.incoming=JSON.stringify(codec.encode([codec.emptyPage()],null));h.sb.desktop={confirmReplace:async()=>'cancel'};
 assert.equal(await h.run("acceptProjectFile(incoming,'new.dbe',null,'new.dbe')"),false);assert.equal(h.run('drawnLines.length'),1);
});
test('desktop save/re-save serializes all pages to the selected file',async()=>{
 const h=createHarness(),writes=[];h.sb.desktop={saveProjectAs:async(content)=>{writes.push(['as',content]);return {path:'saved.dbe',name:'saved.dbe'};},saveProjectTo:async(p,content)=>{writes.push([p,content]);return {path:p,name:p};}};
 rect(h);h.run('addPage()');rect(h,300);assert.equal(await h.run('saveProjectQuick()'),true);
 assert.equal(JSON.parse(writes[0][1]).pages.length,2);assert.equal(h.run('projectDirty'),false);
 h.run('markProjectDirty()');await h.run('saveProjectQuick()');assert.equal(writes[1][0],'saved.dbe');
});
test('editing while Save As is open keeps later changes dirty',async()=>{
 const h=createHarness();let finish;h.sb.desktop={saveProjectAs:()=>new Promise(resolve=>finish=resolve)};
 rect(h);const pending=h.run('saveProjectQuick()');h.run('addPage()');finish({path:'old-snapshot.dbe',name:'old-snapshot.dbe'});await pending;
 assert.equal(h.run('projectDirty'),true);
});
test('blank multi-page documents can be saved and cancellation keeps identity',async()=>{
 const h=createHarness();h.run('addPage()');h.sb.desktop={saveProjectAs:async()=>null};
 assert.equal(await h.run('saveProjectQuick()'),false);assert.equal(h.run('projectFilePath'),null);assert.equal(h.run('projectDirty'),true);
});
test('new document waits for pending save so an old path cannot attach to new pages',async()=>{
 const h=createHarness();let finish;h.sb.desktop={saveProjectAs:()=>new Promise(resolve=>finish=resolve)};
 rect(h);const save=h.run('saveProjectQuick()'),fresh=h.run('newProject()');
 assert.equal(h.run('drawnLines.length'),1);finish({path:'old.dbe',name:'old.dbe'});
 await save;assert.equal(await fresh,true);assert.equal(h.run('drawnLines.length'),0);
 assert.equal(h.run('projectFilePath'),null);assert.equal(h.run('projectDirty'),false);
});
test('undo after save marks the whole document dirty',async()=>{
 const h=createHarness();rect(h);h.run('markProjectSaved("x",null,null);undo()');assert.equal(h.run('projectDirty'),true);
});
test('layer visibility and locking are saved changes with undo support',()=>{
 const h=createHarness();
 h.document.getElementById('layerList').children[0].querySelector('[data-vis]').click();
 assert.equal(h.run('projectDirty'),true);assert.equal(h.run('layers[0].visible'),false);
 h.run('undo()');assert.equal(h.run('layers[0].visible'),true);h.run('markProjectSaved()');
 h.document.getElementById('layerList').children[0].querySelector('[data-lock]').click();
 assert.equal(h.run('projectDirty'),true);assert.equal(h.run('layers[0].locked'),true);
});
test('switching tabs cancels a live transform without leaking it',()=>{
 const h=createHarness();rect(h);const first=h.run('activePageId');h.run("addPage();");h.sb.first=first;h.run("switchPage(first);drawnLines[0].selected=true;startTransform('move');transformBase={x:0,y:0};applyLiveTransform({x:100,y:100});nextPage(1);nextPage(-1)");
 assert.equal(h.run('drawnLines[0].points[0].x'),0);assert.equal(h.run('transformTool'),null);
});
test('Ctrl+A selects drawing but remains native inside input fields',()=>{
 const h=createHarness();rect(h);h.run('drawnLines[0].selected=false');assert.equal(key(h,'a',{ctrlKey:true}).defaultPrevented,true);
 assert.equal(h.run('drawnLines[0].selected'),true);h.run('drawnLines[0].selected=false');const input=h.document.getElementById('filletR');
 assert.equal(key(h,'a',{ctrlKey:true},input).defaultPrevented,undefined);assert.equal(h.run('drawnLines[0].selected'),false);
 assert.equal(key(h,'z',{ctrlKey:true},input).defaultPrevented,undefined);
});
test('custom bindings disable old key, persist and use physical key on Cyrillic layouts',()=>{
 const h=createHarness();h.run("shortcutBindings['draw.line']='Q';localStorage.setItem(SHORTCUT_STORAGE,JSON.stringify(shortcutBindings))");
 key(h,'l');assert.equal(h.run('drawTool'),'none');key(h,'q');assert.equal(h.run('drawTool'),'line');
 const restored=createHarness(h.storage);key(restored,'й',{code:'KeyQ'});assert.equal(restored.run('drawTool'),'line');
});
test('hotkeys detect conflicts, support swaps, reset and unassignment',()=>{
 const defaults={line:'L',circle:'C'};assert.match(keys.validate('C','line',defaults),/^conflict:/);
 assert.deepEqual(keys.restore(defaults,{line:'C',circle:'L'}),{line:'C',circle:'L'});
 assert.deepEqual(keys.restore(defaults,{line:'C'}),defaults);assert.equal(keys.validate('Escape','line',defaults).length>0,true);
 assert.equal(keys.restore(defaults,{line:''}).line,'');
});
test('settings modal prevents drawing hotkeys and saved button updates labels',()=>{
 const h=createHarness();h.run('openShortcutSettings()');assert.equal(key(h,'l').defaultPrevented,undefined);assert.equal(h.run('drawTool'),'none');
 h.run("shortcutDraft['draw.line']='Q'");h.document.getElementById('shortcutSaveBtn').click();
 assert.equal(h.document.getElementById('toolLineBtn').title,'Chiziq / Polyline — Q');assert.equal(h.run("shortcutBindings['draw.line']"),'Q');
});
test('page navigation shortcuts and drawing arc context remain independent',()=>{
 const h=createHarness();h.run('addPage();nextPage(-1)');const first=h.run('activePageId');key(h,'PageDown',{ctrlKey:true});assert.notEqual(h.run('activePageId'),first);
 key(h,'PageUp',{ctrlKey:true});assert.equal(h.run('activePageId'),first);key(h,'l');h.run('addDrawPoint({x:0,y:0})');key(h,'a');assert.equal(h.run('lineSubmode'),'arc');
});
test('quick paste and alternate redo execute through the configurable registry',()=>{
 const h=createHarness();rect(h);h.run('drawnLines[0].selected=true');key(h,'c',{ctrlKey:true});
 key(h,'v',{ctrlKey:true,shiftKey:true});assert.equal(h.run('drawnLines.length'),2);
 key(h,'z',{ctrlKey:true});assert.equal(h.run('drawnLines.length'),1);
 key(h,'z',{ctrlKey:true,shiftKey:true});assert.equal(h.run('drawnLines.length'),2);
});
test('atomic save protects prior file if validation fails',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-test-')),file=path.join(folder,'file.dbe');
 try{fs.writeFileSync(file,'original');assert.throws(()=>writeProjectAtomic(file,'broken'));assert.equal(fs.readFileSync(file,'utf8'),'original');
 const content=JSON.stringify(codec.encode([codec.emptyPage()],null));writeProjectAtomic(file,content);assert.equal(fs.readFileSync(file,'utf8'),content);assert.deepEqual(fs.readdirSync(folder),['file.dbe']);}
 finally{fs.rmSync(folder,{recursive:true,force:true});}
});
