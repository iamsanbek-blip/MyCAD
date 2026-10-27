'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const P=require('../app/js/core/assistant-plan'),Panels=require('../app/js/core/panel-model');
const {ProfileStore,merge,materialize,validate}=require('../desktop/profile-store');
const {FolderProvider,GithubProvider,SyncEngine}=require('../desktop/profile-sync');
const AI=require('../desktop/ai-service');
const {request}=require('../desktop/online-http');
const {createHarness}=require('./browser-harness.cjs');
const plan=actions=>({version:1,summary:'Sinov',questions:[],actions});
const cabinet={type:'cabinet',name:'A',width:900,depth:600,height:2000,thickness:16,shelves:4,position:[0,0,0]};
const empty=()=>({scene:Panels.empty(),selected:[]});
const temp=t=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-profile-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('cabinet is dimensionally exact with equal clear gaps and no mutation before apply',()=>{
 const c=empty(),r=P.prepare(plan([cabinet]),c,Panels);assert.equal(c.scene.panels.length,0);assert.equal(r.scene.panels.length,8);
 const sides=r.scene.panels.slice(0,2);for(const p of sides){assert.ok(Math.abs(P.extent(p,0)-16)<1e-8);assert.ok(Math.abs(P.extent(p,2)-2000)<1e-8);}
 const shelves=r.scene.panels.slice(4),gap=(2000-6*16)/5;let edge=16;for(const p of shelves){assert.equal(p.width,868);assert.ok(Math.abs(p.position[2]-8-edge-gap)<1e-9);edge=p.position[2]+8;}assert.ok(Math.abs(2000-16-edge-gap)<1e-9);
 assert.throws(()=>P.prepare(plan([{...cabinet,height:80}]),c,Panels),/yetarli/);
});
test('free volume shelves, rotated clear spacing, moves and array respect limits',()=>{
 const s=P.prepare(plan([{type:'shelves',width:500,depth:400,height:1000,thickness:16,count:3,position:[0,0,0]}]),empty(),Panels).scene;
 assert.equal(s.panels[1].position[2],500);const c={scene:s,selected:s.panels.map(p=>p.id)};
 const r=P.prepare(plan([{type:'distribute',axis:'z',gap:100},{type:'move',delta:[10,20,30]},{type:'array',copies:1,delta:[1000,0,0]}]),c,Panels);
 assert.equal(r.scene.panels.length,6);assert.equal(r.scene.panels[1].position[2]-r.scene.panels[0].position[2],116);assert.equal(r.scene.panels[3].position[0]-r.scene.panels[0].position[0],1000);assert.equal(s.panels.length,3);
 assert.throws(()=>P.prepare(plan([{type:'array',copies:101,delta:[1,0,0]}]),c,Panels));
});
test('calculator has arithmetic precedence and never evaluates JavaScript',()=>{
 assert.equal(P.calculate('(2000 - 6 * 16) / 5'),380.8);assert.equal(P.calculate('-(2+3)*4 + 2e2'),180);
 for(const v of ['1/0','process.exit()','1;throw 2','2**999','Infinity','1+','(2+3'])assert.throws(()=>P.calculate(v));
 assert.throws(()=>P.validate(plan([{type:'shell',command:'anything'}])));assert.throws(()=>P.validate(plan([{type:'move',delta:[1,2,NaN]}])));
 assert.throws(()=>P.validate({...plan([cabinet]),questions:['depth?']}));
 assert.throws(()=>P.validate(plan([{...cabinet,code:'anything'}])));
});
test('profile survives reinstall, merges devices, retains concurrent edits, and deletion does not resurrect',t=>{
 const dir=temp(t),a=new ProfileStore(path.join(dir,'a')),b=new ProfileStore(path.join(dir,'b'));
 a.set('consoleDock','left');b.import(a.doc);a.set('consoleDock','right');b.set('consoleDock','bottom');a.import(b.doc);b.import(a.doc);
 assert.deepEqual(a.doc,b.doc);assert.equal(a.view().conflicts.length,1);a.set('consoleDock','left');b.import(a.doc);assert.equal(b.view().conflicts.length,0);
 const m={name:'Korpus',plan:plan([cabinet])};a.set('macro:box',m);b.import(a.doc);a.set('macro:box',null);b.import(a.doc);assert.equal(b.view().values['macro:box'],undefined);
 const reinstall=new ProfileStore(path.join(dir,'a'));assert.deepEqual(reinstall.doc,a.doc);assert.equal(reinstall.device,a.device);
 const fresh=new ProfileStore(path.join(dir,'new-computer'));fresh.import(a.doc);assert.equal(fresh.view().values.consoleDock,'left');assert.notEqual(fresh.device,a.device);
});
test('stale hotkey drafts preserve concurrently received edits as conflicts',t=>{
 const dir=temp(t),a=new ProfileStore(path.join(dir,'a')),b=new ProfileStore(path.join(dir,'b'));
 a.set('shortcuts',{'draw.line':'Q'});b.import(a.doc);const bases=a.view().versions;b.set('shortcuts',{'draw.line':'Y'});a.import(b.doc);a.setMany({shortcuts:{'draw.line':'U'}},bases);assert.equal(a.view().conflicts.length,1);
});
test('profile refuses credentials, executable data, corrupt history and invalid hotkeys atomically',t=>{
 const a=new ProfileStore(temp(t));a.set('grid',true);const before=JSON.stringify(a.doc);
 for(const changes of [{apiKey:'secret'},{shortcuts:{'draw.line':'Ctrl+R'}},{'macro:x':{name:'x',plan:plan([{type:'exec'}])}},{theme:'black',token:'secret'}])assert.throws(()=>a.setMany(changes));
 assert.equal(JSON.stringify(a.doc),before);const bad=structuredClone(a.doc);bad.ops[0].parents=[bad.ops[0].id];assert.throws(()=>merge(bad));assert.throws(()=>validate({...a.doc,version:999}));
});
test('folder sync propagates extensions, settings and offline changes to three separate installations',async t=>{
 const dir=temp(t),cloud=path.join(dir,'drive');fs.mkdirSync(cloud);const a=new ProfileStore(path.join(dir,'a')),b=new ProfileStore(path.join(dir,'b'));
 const ea=new SyncEngine(a),eb=new SyncEngine(b);ea.configure(new FolderProvider(cloud));eb.configure(new FolderProvider(cloud));
 a.setMany({consoleDock:'left','macro:calc':{name:'Hisob',plan:plan([{type:'calculate',expression:'2*3'}])}});await ea.sync();await eb.sync();assert.equal(b.view().values['macro:calc'].name,'Hisob');
 b.set('theme','black');await eb.sync();await ea.sync();assert.equal(a.view().values.theme,'black');
 // Offline failure leaves all local changes queued and a useful status.
 ea.configure({read:async()=>{throw Error('offline');},write:()=>{throw Error('must not write');}});a.set('grid',false);const r=await ea.sync();assert.equal(r.sync.state,'error');assert.equal(a.view().values.grid,false);
 ea.configure(new FolderProvider(cloud));await ea.sync();await eb.sync();assert.equal(b.view().values.grid,false);
 const c=new ProfileStore(path.join(dir,'fresh')),ec=new SyncEngine(c);ec.configure(new FolderProvider(cloud));await ec.sync();assert.equal(c.view().values.theme,'black');assert.equal(c.view().values['macro:calc'].name,'Hisob');
});
test('corrupt cloud file cannot overwrite local profile or get replaced by an upload',async t=>{
 const dir=temp(t),a=new ProfileStore(path.join(dir,'a')),p=new FolderProvider(path.join(dir,'drive'));a.set('theme','light');fs.mkdirSync(p.dir,{recursive:true});fs.writeFileSync(path.join(p.dir,'bad.json'),'{broken');const e=new SyncEngine(a);e.configure(p);const r=await e.sync();assert.equal(r.sync.state,'error');assert.deepEqual(fs.readdirSync(p.dir),['bad.json']);assert.equal(a.view().values.theme,'light');
});
test('GitHub provider requires a private existing branch, handles initial directory and uses SHA on updates',async t=>{
 let record=null,sha='one';const writes=[];const a=new ProfileStore(temp(t));a.set('grid',true);
 const fake=async(url,opts)=>{const route=new URL(url).pathname;
   if(route==='/repos/u/p')return response({private:true});if(route.endsWith('/branches/main'))return response({name:'main'});
   if(opts.method==='PUT'){const data=JSON.parse(opts.body);writes.push(data);assert.equal(opts.redirect,'error');record=JSON.parse(Buffer.from(data.content,'base64'));sha=String(writes.length);return response({content:{sha}});}
   if(route.endsWith('/contents/rugby-profile'))return record?response([{name:a.device+'.json',type:'file',size:100}]):response({},404);
   return response({encoding:'base64',content:Buffer.from(JSON.stringify(record)).toString('base64'),sha});
 };
 const p=new GithubProvider('u/p','main','test-only',fake);assert.deepEqual(await p.read(),[]);await p.write(a.device,a.doc);await p.read();a.set('grid',false);await p.write(a.device,a.doc);assert.equal(writes[1].sha,'1');assert.equal(writes[0].branch,'main');
 await assert.rejects(()=>new GithubProvider('u/p','main','test',async()=>response({private:false})).read(),/PRIVATE/);
});
test('AI sends images as input data, returns validated plans, and does not send API key into the payload',async()=>{
 const calls=[],fake=async(url,opts)=>{calls.push({url,opts,body:JSON.parse(opts.body)});return response({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(plan([cabinet]))}]}]});};
 const img='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');const r=await AI.plan({prompt:'900 mm korpus',web:false,image:img,context:{}},{key:'test-secret',fetcher:fake});
 assert.equal(r.plan.actions[0].width,900);assert.equal(calls[0].body.store,false);assert.equal(calls[0].body.text.format.type,'json_schema');assert.equal(calls[0].body.input[0].content[1].type,'input_image');assert.equal(JSON.stringify(calls[0].body).includes('test-secret'),false);
 await assert.rejects(()=>AI.plan({prompt:'x',web:false},{key:'',fetcher:fake}),/kalit/);
 await assert.rejects(()=>AI.plan({prompt:'x',web:false},{key:'test',fetcher:async()=>response({status:'incomplete'})}),/to‘liq/);
});
test('web research returns source links separately before structured planning',async()=>{
 let n=0;const fake=async(_url,opts)=>{const b=JSON.parse(opts.body);if(n++===0){assert.equal(b.tools[0].type,'web_search');return response({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Furnitura 32 mm',annotations:[{type:'url_citation',url:'https://example.com/catalog',title:'Catalog'}]}]}]});}assert.equal(b.tools,undefined);assert.match(b.input[0].content[0].text,/Furnitura 32/);return response({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(plan([{type:'calculate',expression:'32*3'}]))}]}]});};
 const r=await AI.plan({prompt:'Catalogni tekshir',web:true},{key:'test',fetcher:fake});assert.equal(r.sources[0].url,'https://example.com/catalog');assert.equal(r.evidence,'Furnitura 32 mm');
});
test('HTTP wrapper bounds response size and reports authentication and rate-limit failures',async()=>{
 await assert.rejects(()=>request('https://example.com',{},async()=>response({},401)),/kalit/);
 await assert.rejects(()=>request('https://example.com',{},async()=>response({},429)),/limit/);
 await assert.rejects(()=>request('https://example.com',{maxBytes:10},async()=>response({long:'a'.repeat(20)})),/hajmi/);
});
test('review has no CAD effects, apply is one undo step and stale plans are blocked',async()=>{
 const h=createHarness();h.sb.planInput=plan([cabinet]);h.run('assistantPreview(planInput)');assert.equal(h.run('panelScene.panels.length'),0);const i=h.run('historyIndex');await h.run('assistantApplyPlan()');assert.equal(h.run('panelScene.panels.length'),8);assert.equal(h.run('historyIndex'),i+1);h.run('undo()');assert.equal(h.run('panelScene.panels.length'),0);
 h.run('assistantPreview(planInput);markProjectDirty()');await h.run('assistantApplyPlan()');assert.equal(h.run('panelScene.panels.length'),0);assert.match(h.document.getElementById('assistantStatus').textContent,/o‘zgardi/);
});
test('saved macros survive restart, appear in F10 and hotkeys preview rather than execute silently',()=>{
 const h=createHarness();h.sb.macro={name:'Hisob',plan:plan([{type:'calculate',expression:'2+3'}])};h.run("assistantRemember({'macro:test':macro});shortcutBindings['macro.test']='Ctrl+Shift+L';assistantRemember({shortcuts:shortcutBindings})");
 const fresh=createHarness(h.storage);assert.equal(fresh.run("RUGBY_COMMANDS.some(c=>c.id==='macro.test')"),true);assert.equal(fresh.run("shortcutBindings['macro.test']"),'Ctrl+Shift+L');fresh.run("RUGBY_COMMANDS.find(c=>c.id==='macro.test').run()");assert.equal(fresh.run('assistantPending.results[0]'),'2+3 = 5');assert.equal(fresh.run('panelScene.panels.length'),0);
});
test('an open shortcut editor keeps its draft while remote profile changes arrive',()=>{
 const h=createHarness();h.run("openShortcutSettings();shortcutDraft['draw.line']='Q';assistantAcceptProfile({values:{shortcuts:{...DEFAULT_SHORTCUTS,'draw.line':'Y'}},conflicts:[]})");assert.equal(h.run("shortcutDraft['draw.line']"),'Q');h.run("document.getElementById('shortcutDialog').close()");assert.equal(h.run("shortcutBindings['draw.line']"),'Y');
});

test('rapid local saves supersede earlier same-device writes without false conflicts',t=>{
 const a=new ProfileStore(temp(t));a.set('consoleDock','left');const bases=a.view().versions;
 a.setMany({consoleDock:'right'},bases);a.setMany({consoleDock:'bottom'},bases);
 assert.equal(a.view().values.consoleDock,'bottom');assert.equal(a.view().conflicts.length,0);
});

test('console button accepts synchronous preview results without reporting a false Promise error',()=>{
 const h=createHarness();h.document.getElementById('assistantLocalCabinet').click();
 assert.match(h.document.getElementById('assistantStatus').textContent,/Reja tayyor/);
 assert.equal(h.run('assistantPending.created'),8);
 assert.equal(h.run('panelScene.panels.length'),0);
});
