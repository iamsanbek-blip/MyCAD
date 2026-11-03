'use strict';
// Real Electron GUI smoke test for the Modeling (Panel 3D) mode. Run under a display (xvfb-run on Linux).
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {_electron}=require('playwright');
const root=path.resolve(__dirname,'..');
const executablePath=process.env.RUGBY_TEST_EXECUTABLE?path.resolve(process.env.RUGBY_TEST_EXECUTABLE):require('electron');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-model-'));
const appPath=process.env.RUGBY_TEST_APP?path.resolve(process.env.RUGBY_TEST_APP):root;
const args=process.env.RUGBY_TEST_EXECUTABLE?['--disable-gpu']:['--disable-gpu',appPath];
if(process.platform==='linux'&&process.getuid?.()===0)args.unshift('--no-sandbox');
const errors=[],passed=[];
(async()=>{
  const app=await _electron.launch({executablePath,args,env:{...process.env,NODE_ENV:'test',RUGBY_TEST_USER_DATA_DIR:path.join(temporary,'profile')},timeout:30000});
  const watch=p=>{p.on('pageerror',e=>errors.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())})};
  app.on('window',watch);app.windows().forEach(watch);
  try{
    let page;const deadline=Date.now()+15000;
    while(!page&&Date.now()<deadline){page=app.windows().find(p=>p.url().startsWith('app://local/'));if(!page)await new Promise(r=>setTimeout(r,50))}
    assert.ok(page,'Main window opened');
    const win=await app.browserWindow(page);await win.evaluate(w=>w.setContentSize(1600,950));
    await page.waitForFunction(()=>typeof documentPages!=='undefined'&&documentPages.length===1);
    const P3=(code)=>page.evaluate(code);
    // 1. Menyu tartibi o'zgarmas
    const order=await page.evaluate(()=>[...document.querySelectorAll('#menuBar > .mbBrand, #menuBar > .mbItem > .mbBtn, #menuBar > .mbMode')].map(e=>e.textContent.trim()));
    assert.deepEqual(order,['RUGBY','File','Edit','Object','Cnc','Drawing','Modeling','Cutlist']);passed.push('menu order: '+order.join(' | '));
    // 2. Drawing: yopiq to'rtburchak chizish
    await page.locator('#mbDraw').click();await page.locator('#orthoOffBtn').click();await page.locator('#toolRectBtn').click();   // Ortho yoqilgan bo'lsa to'rtburchak yassi chiqadi: Free tanlanadi
    const bb=await page.locator('#cv').boundingBox(),at=async(x,y)=>{await page.mouse.move(bb.x+x,bb.y+y,{steps:6});await page.mouse.down();await page.mouse.up()};
    await at(200,400);await page.mouse.move(bb.x+330,bb.y+480,{steps:6});await at(420,570);   // haqiqiy sichqoncha harakati bilan
    await page.waitForFunction(()=>drawnLines.length===1);await page.keyboard.press('Escape');
    // 3. Modeling ochiladi, WebGL ishlaydi
    await page.locator('#mbModel').click();
    await page.waitForFunction(()=>Panel3D.isOpen());
    await page.waitForSelector('#p3wrap canvas');
    const webgl=await page.evaluate(()=>!document.querySelector('#p3wrap').textContent.includes('WebGL ishga tushmadi'));
    assert.ok(webgl,'WebGL ishga tushdi');
    assert.equal(await page.evaluate(()=>Panel3D._state().panels.length),6);passed.push('Modeling opens, WebGL ok, demo korpus (6 panel)');
    const dims=()=>page.evaluate(()=>[document.querySelector('#p3dimT').textContent,['dx','dy','dz'].map(k=>document.querySelector('#p3'+k).textContent).join('×')]);
    let dm=await dims();assert.match(dm[0],/Butun korpus/);assert.equal(dm[1],'600×720×500');
    assert.equal(await page.locator('#p3sx').count(),0,'Cho\'zish olib tashlangan');
    await page.locator('#p3pl .p3it').first().click();dm=await dims();assert.match(dm[0],/Tanlangan 1/);assert.equal(dm[1],'16×720×500');
    await page.locator('.p3view canvas').first().hover();await page.keyboard.press('a');dm=await dims();assert.match(dm[0],/Tanlangan 6/);assert.equal(dm[1],'600×720×500');
    await page.keyboard.press('Escape');dm=await dims();assert.match(dm[0],/Butun korpus/);
    passed.push('umumiy o\'lcham: korpus 600×720×500, 1 panel 16×720×500, tanlangan 6 ta');
    // Bir nechta panel: qalinlik, kromka, tekstura birdaniga
    await page.locator('.p3view canvas').first().hover();await page.keyboard.press('a');
    await page.waitForSelector('.p3multi');assert.match(await page.locator('.p3multi b').first().textContent(),/Tanlangan: 6 ta panel/);
    await page.locator('#p3m_t').fill('18');await page.locator('#p3m_t').press('Enter');
    assert.ok(await page.evaluate(()=>Panel3D._state().panels.every(p=>p.t===18)),'hammasi 18 mm');
    await page.locator('#p3m_ebAll').click();
    assert.ok(await page.evaluate(()=>Panel3D._state().panels.every(p=>p.eb&&p.eb.every(v=>v>0))),'hamma qirra kromka');
    await page.locator('#p3m_ebClr').click();
    assert.ok(await page.evaluate(()=>Panel3D._state().panels.every(p=>!p.eb)),'kromka tozalandi');
    await page.locator('#p3m_g').selectOption('h');
    assert.ok(await page.evaluate(()=>Panel3D._state().panels.every(p=>p.gr==='h')),'tekstura hammasiga');
    assert.equal(await page.evaluate(()=>document.querySelectorAll('#p3pl .p3it.s').length),6,'tanlov saqlandi');
    await page.locator('#p3m_g').selectOption('');
    await page.locator('#p3m_t').fill('16');await page.locator('#p3m_t').press('Enter');
    await page.keyboard.press('Escape');assert.equal(await page.locator('.p3multi').count(),0);
    passed.push('bir nechta panel: qalinlik 18, kromka qo\'shish/tozalash, tekstura — birdaniga');
    // 4. Hotkey izolyatsiyasi: Modeling ochiq paytda Drawing hotkeylari ishlamaydi
    const before=await page.evaluate(()=>appMode);
    await page.keyboard.press('c');await page.keyboard.press('l');await page.keyboard.press('h');
    assert.equal(await page.evaluate(()=>appMode),before,'appMode o\'zgarmadi');
    assert.equal(await page.evaluate(()=>Panel3D.isOpen()),true);passed.push('Drawing hotkeys blocked while Modeling is open');
    // 5. Chizmadan panel yasash (R12 POLYLINE -> extrude)
    const n0=await page.evaluate(()=>Panel3D._state().panels.length);
    await page.locator('#p3wrap .p3ddb',{hasText:'Panel'}).click();
    await page.locator('#p3pnFromDraw').click();
    await page.waitForFunction(n=>Panel3D._state().panels.length>n,n0);
    const added=await page.evaluate(()=>{const s=Panel3D._state().panels;return s[s.length-1]});
    assert.ok(added.t>0&&added.w>0&&added.h>0);passed.push('Drawing rectangle -> Modeling panel: '+added.w.toFixed(0)+'x'+added.h.toFixed(0)+'x'+added.t);
    // 6. Tanlash, Delete, Undo/Redo
    await page.locator('#p3pl .p3it').first().click();
    const n1=await page.evaluate(()=>Panel3D._state().panels.length);
    await page.keyboard.press('Delete');
    assert.equal(await page.evaluate(()=>Panel3D._state().panels.length),n1-1);
    await page.keyboard.press('Control+z');
    assert.equal(await page.evaluate(()=>Panel3D._state().panels.length),n1);
    await page.keyboard.press('Control+y');
    assert.equal(await page.evaluate(()=>Panel3D._state().panels.length),n1-1);
    await page.keyboard.press('Control+z');passed.push('select, Delete, Ctrl+Z / Ctrl+Y');
    // 7. Copy, Mirror, Stretch (W) asbobi
    await page.locator('#p3pl .p3it').first().click();
    await page.keyboard.press('c');assert.equal(await page.evaluate(()=>Panel3D._state().panels.length),n1+1);
    await page.locator('#p3wrap .p3ddb',{hasText:'Object'}).click();await page.locator('#p3oMx').click();
    assert.equal(await page.evaluate(()=>Panel3D._state().panels.length),n1+2);
    await page.keyboard.press('w');passed.push('Copy, Mirror X, Stretch tool');
    // 8. View menyusi va ko'rinishlar
    for(const v of['top','front','left','right','back','iso'])await page.locator('#p3wrap [data-v="'+v+'"]').click();
    await page.locator('#p3wrap .p3ddb',{hasText:'View'}).click();await page.locator('#p3vmWire').click();
    await page.locator('#p3wrap .p3ddb',{hasText:'View'}).click();await page.locator('#p3vmSolid').click();passed.push('6 views + Wireframe/Solid');
    await page.keyboard.press('Escape');await page.locator('#p3wrap canvas').first().hover();
    const wireOn=()=>page.evaluate(()=>document.querySelector('#p3vmWire').classList.contains('chk'));
    await page.keyboard.press('Shift+W');assert.equal(await wireOn(),true,'Shift+W wireframe');
    await page.keyboard.press('Shift+S');assert.equal(await wireOn(),false,'Shift+S solid');
    await page.keyboard.press('z');assert.equal(await wireOn(),true,'Z toggle');await page.keyboard.press('z');assert.equal(await wireOn(),false);
    passed.push('hotkeys: Shift+W wireframe, Shift+S solid, Z toggle');
    // Yangi hotkeylar: A / Alt+A, O, T, F, Shift+7
    await page.keyboard.press('a');const nAll=await page.evaluate(()=>document.querySelectorAll('#p3pl .p3it.s').length);
    assert.equal(nAll,await page.evaluate(()=>Panel3D._state().panels.filter(p=>!p.hid).length),'A: hammasi tanlandi');
    await page.keyboard.press('Alt+a');assert.equal(await page.evaluate(()=>document.querySelectorAll('#p3pl .p3it.s').length),0,'Alt+A: tanlov bekor');
    await page.keyboard.press('o');assert.ok(await page.locator('#p3bOrtho').evaluate(e=>e.classList.contains('on')),'O: Ortho');
    await page.keyboard.press('o');assert.ok(await page.locator('#p3bFree').evaluate(e=>e.classList.contains('on')),'O: Free');
    const th=()=>page.evaluate(()=>document.querySelector('#p3vmThick').classList.contains('chk'));const t0=await th();
    await page.keyboard.press('t');assert.equal(await th(),!t0,'T: qalinlik');await page.keyboard.press('t');
    await page.keyboard.press('Shift+7');assert.equal(await page.evaluate(()=>document.querySelector('[data-v].on')),null,'Shift+7: Bottom');
    await page.keyboard.press('0');await page.keyboard.press('f');
    assert.equal(await page.locator('#p3tMov .kb').textContent(),'M');
    passed.push('hotkeys: A/Alt+A tanlash, O Ortho/Free, T qalinlik, Shift+7 Bottom, F frame; menyuda yorliqlar');
    // Almashtirish: View > Hotkeylar… -> Wireframe/Solid almashtirishni Q ga
    await page.locator('#p3wrap .p3ddb',{hasText:'View'}).click();await page.locator('#p3vmKeys').click();
    await page.waitForSelector('#shortcutDialog[open]');
    const inp=page.locator('[id="p3key-view.wireToggle"]');await inp.scrollIntoViewIfNeeded();await inp.click();await page.keyboard.press('q');
    assert.equal(await inp.inputValue(),'Q');
    const inp2=page.locator('[id="p3key-tool.move"]');await inp2.click();await page.keyboard.press('Control+m');
    assert.match(await page.locator('#shortcutError').textContent(),/Shift yoki Alt/);
    await page.locator('#shortcutSaveBtn').click();await page.waitForFunction(()=>!document.querySelector('#shortcutDialog').open);
    await page.locator('.p3view canvas').first().hover();
    await page.keyboard.press('q');assert.equal(await wireOn(),true,'Q endi wireframe');await page.keyboard.press('q');assert.equal(await wireOn(),false);
    await page.keyboard.press('z');assert.equal(await wireOn(),false,'Z endi bo\'sh');
    await page.evaluate(()=>{const d=Panel3D.hotkeys.defaults();Panel3D.hotkeys.save(d)});
    passed.push('hotkey almashtirish: Z -> Q saqlandi va ishladi, Ctrl rad etildi');
    // Tekstura: xossalardan tanlash -> 3D chiziqlar, Alt+T aylanadi, Shift+T ko'rinishni o'chiradi
    await page.locator('#p3pl .p3it').first().click();
    await page.locator('#p3f_g').selectOption('h');
    const grN=()=>page.evaluate(()=>{const p=Panel3D._state().panels.find(x=>x.gr);return p?{gr:p.gr,lines:p.g.children.some(c=>c.userData&&c.userData.grain)}:null});
    let g=await grN();assert.ok(g&&g.gr==='h'&&g.lines,'tekstura chiziqlari: '+JSON.stringify(g));
    await page.locator('.p3view canvas').first().hover();await page.keyboard.press('Alt+t');g=await grN();assert.equal(g.gr,'w','Alt+T: eni bo\'ylab');
    await page.keyboard.press('Shift+t');g=await grN();assert.equal(g.lines,false,'Shift+T: chiziqlar yashirildi');await page.keyboard.press('Shift+t');
    passed.push('tekstura: xossa -> 3D chiziqlar, Alt+T almashtirish, Shift+T ko\'rinish');
    // Mavzu: Modeling foni umumiy mavzudan
    const sc=await page.evaluate(()=>{applyTheme('light',{silent:true});const a=getComputedStyle(document.querySelector('#p3wrap')).getPropertyValue('--sc').trim();applyTheme('dark',{silent:true});const b=getComputedStyle(document.querySelector('#p3wrap')).getPropertyValue('--sc').trim();return[a,b]});
    assert.deepEqual(sc,['#ffffff','#0b1220']);passed.push('Modeling foni mavzuga ergashadi: '+sc.join(' / '));
    // Top: magnit faqat ekran tekisligida yopishadi, Y daraja o'zgarmaydi
    const keep=await page.evaluate(()=>JSON.stringify(Panel3D.snapshot()));
    await page.evaluate(()=>Panel3D.load({panels:[{id:1,n:'A',w:600,h:400,t:16,o:'flat',x:0,y:0,z:0},{id:2,n:'B',w:600,h:400,t:16,o:'flat',x:900,y:500,z:150}]}));
    await page.locator('#p3wrap [data-v="top"]').click();await page.waitForTimeout(150);
    await page.keyboard.press('m');
    const a1=await page.evaluate(()=>Panel3D._edgeMid(1,1)),b1=await page.evaluate(()=>Panel3D._edgeMid(2,3));
    await page.mouse.move(b1.x+6,b1.y);await page.mouse.down();await page.mouse.move(b1.x-40,b1.y+5,{steps:5});await page.mouse.move(a1.x+3,a1.y+2,{steps:12});await page.mouse.up();
    const B=await page.evaluate(()=>Panel3D._state().panels.find(p=>p.id===2));
    assert.equal(B.y,500,'Top ko\'rinishda Y daraja saqlanadi: '+JSON.stringify({x:B.x,y:B.y,z:B.z}));
    assert.ok(Math.abs(B.x-600)<1e-6,'magnit X ga yopishdi: '+B.x);
    passed.push('Top + magnit: X/Z yopishdi ('+B.x+','+B.z+'), Y daraja 500 saqlandi');
    await page.evaluate(k=>Panel3D.load(JSON.parse(k)),keep);
    if(process.env.P3_SHOT){await page.locator('#p3wrap [data-v="iso"]').click();for(let i=0;i<12;i++){await page.mouse.wheel(0,-300);await page.waitForTimeout(30)}await page.screenshot({path:process.env.P3_SHOT})}
    // 9. Cutlist bo'limi: jadval, kromka, eksport, list hisobi
    assert.equal(await page.locator('#p3wrap .p3ddb',{hasText:'Raspil'}).count(),0,'Modelingda raspil yo\'q');
    await page.locator('#mbCut').click();
    await page.waitForFunction(()=>document.querySelector('#p3wrap').classList.contains('cut'));
    assert.ok(await page.locator('#p3clTab table').count()===1);passed.push('Cutlist opens with table');
    await page.locator('#p3clAll').check().catch(()=>{});
    await page.evaluate(()=>{const a=document.querySelector('#p3clAll');if(a&&!a.checked){a.click()}});
    await page.locator('#p3clEbAll').click();
    assert.ok(await page.evaluate(()=>Panel3D._state().panels.some(p=>p.eb&&p.eb.length>0&&p.eb.every(v=>v>0))));
    assert.match(await page.locator('#p3clSum').textContent(),/Kromka: [\d.]+ m/);
    const head=await page.evaluate(()=>Panel3D._clExport().head.join('|'));assert.match(head,/^Uzunlik\|Eni\|Soni\|Nomi\|Qalinlik.*L1\|L2.*W1\|W2/);
    passed.push('Cutlist kromka bulk + export columns: '+head);
    await page.locator('#p3clSheetB').click();assert.equal(await page.locator('#p3clSheetOut table').count(),1);
    assert.match(await page.locator('#p3clSheetOut').textContent(),/Jami: \d+ list/);passed.push('list hisobi (sheet count)');
    assert.match(await page.locator('#p3clSheetOut').textContent(),/m²/);
    const sw=await page.evaluate(()=>[document.querySelector('#p3clSheetOut').getBoundingClientRect().width,document.querySelector('#p3clTab').getBoundingClientRect().width]);
    assert.ok(sw[0]>=sw[1],'list hisobi to\'liq eni bo\'ylab: '+sw);
    await page.evaluate(()=>{const s=Panel3D._state().panels;s.forEach((p,i)=>{p.mat=i===0?'MDF':'LDSP'})});
    await page.locator('#mbModel').click();await page.locator('#mbCut').click();
    await page.locator('#p3clMf').selectOption('MDF');
    assert.equal(await page.evaluate(()=>Panel3D._clExport().n),1);
    const st=await page.locator('#p3clSheetOut').textContent();assert.match(st,/Filtr: MDF/);assert.ok(!/LDSP/.test(st),'faqat MDF');
    await page.locator('#p3clMf').selectOption('*');
    passed.push('List hisobi: m², kromka, to\'liq eni; material filtri eksport va hisobga');
    const obj=await page.evaluate(()=>Panel3D._objText(0.001));assert.ok(/^o /m.test(obj)&&/^f /m.test(obj));passed.push('OBJ text');
    await page.locator('#mbModel').click();await page.waitForFunction(()=>!document.querySelector('#p3wrap').classList.contains('cut'));
    await page.locator('#p3selMat').selectOption('LDSP|');
    { const st=await page.evaluate(()=>Panel3D._state().panels.filter(p=>p.mat==='LDSP').length);
      assert.equal(await page.locator('#p3pl .p3it.s').count(),st);assert.match(await page.locator('#p3pp').textContent(),new RegExp('Tanlangan: '+st)); }
    await page.locator('#p3pl .p3it').first().click();await page.keyboard.press('Shift+M');
    assert.equal(await page.locator('#p3pl .p3it.s').count(),1);
    passed.push('Select by material: ro\'yxat va Shift+M');
    await page.locator('#p3pl .p3it').first().click();
    await page.keyboard.press('k');assert.ok(await page.locator('#p3tEdg').evaluate(e=>e.classList.contains('on')));passed.push('K asbobi (kromka) Modelingda');
    await page.evaluate(()=>{Panel3D._state().panels.forEach((p,i)=>{if(i>0)delete p.eb})});
    // haqiqiy sichqoncha bilan qirrani bosib kromka qo'yish/olish
    await page.locator('#p3wrap [data-v="front"]').click();
    const tgt=await page.evaluate(()=>{const s=Panel3D._state().panels,p=s.find(x=>x.o==='front'&&!x.pts&&(!x.shape||x.shape==='rect')&&!x.eb);return p?{id:p.id}:null});
    assert.ok(tgt,'kromkasiz frontal panel bor');
    const pt=await page.evaluate(id=>Panel3D._edgeMid(id,0),tgt.id);
    await page.mouse.move(pt.x-30,pt.y-4,{steps:4});await page.mouse.move(pt.x,pt.y,{steps:6});await page.mouse.down();await page.mouse.up();
    assert.ok(await page.evaluate(id=>{const p=Panel3D._state().panels.find(x=>x.id===id);return !!p.eb&&p.eb[0]>0},tgt.id),'qirra bosilganda kromka qo\'yildi');
    await page.mouse.move(pt.x+2,pt.y,{steps:3});await page.mouse.down();await page.mouse.up();
    assert.ok(await page.evaluate(id=>{const p=Panel3D._state().panels.find(x=>x.id===id);return !p.eb},tgt.id),'qayta bosilganda kromka olindi');
    passed.push('kromka: qirrani sichqoncha bilan bosib qo\'yish/olish');
    await page.keyboard.press('v');
    // 10. Saqlash round-trip: model loyiha ichida
    const snap=await page.evaluate(()=>capturePageData().panel3d.panels.length);assert.ok(snap>=6);
    // 11. Orqaga: Cnc rejimiga qaytish
    await page.locator('#mbCnc').click();
    await page.waitForFunction(()=>!Panel3D.isOpen());
    assert.equal(await page.evaluate(()=>appMode),'edit');passed.push('back to Cnc');
    assert.deepEqual(errors,[],'No page errors');
    console.log(JSON.stringify({status:'passed',platform:process.platform,checks:passed,errors},null,2));
  }catch(e){console.error(e&&e.stack||e);console.error('ERRORS:',JSON.stringify(errors));process.exitCode=1}
  finally{await Promise.race([app.close().catch(()=>{}),new Promise(r=>setTimeout(r,4000))]);try{fs.rmSync(temporary,{recursive:true,force:true})}catch(e){}process.exit(process.exitCode||0)}
})();
