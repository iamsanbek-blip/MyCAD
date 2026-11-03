'use strict';
// Smart kiritish (tarix, takliflar, Tab/↓/Enter/Esc), eslab qolinadigan chizma sozlamalari, o'lcham yozuvi formati va
// Modeling «Avto-nom» (chap/o'ng boka, krisha, dno, polka, orqa devor, fasad; korpus harfi A., B.).
// Haqiqiy brauzer (Chromium), web build, haqiqiy klaviatura. Ishga tushirish: node tests/smart-autoname.cjs (RUGBY_CHROMIUM ixtiyoriy)
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-smart-')),html=path.join(tmp,'rugby-web.html');
execFileSync('python3',[path.join(root,'scripts/build-web.py'),html]);
const errors=[],passed=[];
// Korpus: 600×720×500, 16 mm; krisha bokalar orasida; 2 polka; orqa devor; fasad (old tomonda, z>0)
const corpus=(id0,dx,overlayTop)=>[
  {id:id0+1,n:'Panel',w:500,h:720,t:16,o:'side',x:dx+8,y:360,z:0},
  {id:id0+2,n:'Panel',w:500,h:720,t:16,o:'side',x:dx+592,y:360,z:0},
  {id:id0+3,n:'Panel',w:568,h:500,t:16,o:'flat',x:dx+300,y:8,z:0},
  overlayTop?{id:id0+4,n:'Panel',w:600,h:500,t:16,o:'flat',x:dx+300,y:728,z:0}:{id:id0+4,n:'Panel',w:568,h:500,t:16,o:'flat',x:dx+300,y:712,z:0},
  {id:id0+5,n:'Panel',w:568,h:480,t:16,o:'flat',x:dx+300,y:480,z:-10},
  {id:id0+6,n:'Panel',w:568,h:480,t:16,o:'flat',x:dx+300,y:250,z:-10},
  {id:id0+7,n:'Panel',w:568,h:688,t:16,o:'front',x:dx+300,y:360,z:-242},
  {id:id0+8,n:'Panel',w:596,h:716,t:16,o:'front',x:dx+300,y:360,z:258}];
const ROLES=['chap boka',"o'ng boka",'dno','krisha','polka 2','polka 1','orqa devor','fasad'];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RUGBY_CHROMIUM||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    const ctx=await browser.newContext({viewport:{width:1500,height:900}}),page=await ctx.newPage();
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    const ev=(f,a)=>page.evaluate(f,a);
    const boot=async()=>{await page.goto('file://'+html);await page.waitForFunction(()=>typeof Panel3D!=='undefined'&&typeof SmartInput!=='undefined')};
    await boot();await ev(()=>{localStorage.clear()});await boot();

    // 1. O'lcham yozuvi: kasr faqat kerak bo'lsa; standart aniqlik 0.00
    assert.deepEqual(await ev(()=>[fmtNum(3040,2),fmtNum(0.01,2),fmtNum(12.5,2),fmtNum(-0.001,2),fmtNum(7.25,1),dimPrecision()]),['3040','0.01','12.5','0','7.3',2]);
    passed.push("O'lcham yozuvi: 3040 · 0.01 · 12.5 (ortiqcha nol yo'q), standart aniqlik 0.00");

    // 2. Chizma sozlamalari eslab qolinadi (matn 70)
    await ev(()=>{for(const[id,v]of[['dimTextSize','70'],['textSize','70']]){const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))}});
    await boot();assert.deepEqual(await ev(()=>[dimTextSize(),textSizeInput()]),[70,70]);passed.push("Qayta ochilganda o'lcham matni va matn balandligi 70 saqlanadi");

    // 3. Modeling: nom maydonida tarix + lug'at, Tab — davomni qabul
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    const pick=async i=>{await page.locator('#p3pl .p3it').nth(i).click();await page.waitForSelector('#p3f_n')};
    const typeIn=async(sel,txt)=>{await page.locator(sel).click();await page.keyboard.press('Control+a');await page.keyboard.type(txt,{delay:15})};
    await pick(0);await typeIn('#p3f_n','Yon devor maxsus');await page.keyboard.press('Enter');
    assert.equal(await ev(()=>Panel3D._state().panels[0].n),'Yon devor maxsus');
    assert.equal((await ev(()=>SmartInput.get().h.name))[0],'Yon devor maxsus');
    await pick(1);await typeIn('#p3f_n','yon d');
    assert.equal(await ev(()=>!document.getElementById('smartList').hidden),true,'ro\'yxat chiqdi');
    assert.equal(await ev(()=>document.getElementById('smartGhost').dataset.v),'Yon devor maxsus','kulrang davom');
    await page.keyboard.press('Tab');assert.equal(await page.locator('#p3f_n').inputValue(),'Yon devor maxsus');
    assert.equal(await ev(()=>document.activeElement.id),'p3f_n','Tab fokusni olib ketmadi');
    await page.keyboard.press('Enter');assert.equal(await ev(()=>Panel3D._state().panels[1].n),'Yon devor maxsus');
    passed.push("Nom: «yon d» → kulrang «Yon devor maxsus», Tab qabul qildi, Enter saqladi");
    await pick(2);await typeIn('#p3f_n','ch');
    assert.match(await page.locator('#smartList').textContent(),/chap boka/);await page.keyboard.press('Tab');
    assert.equal(await page.locator('#p3f_n').inputValue(),'chap boka');await page.keyboard.press('Escape');passed.push("Lug'at: «ch» → «chap boka»");

    // 4. Raqam: 3040 eslab qolinadi; «3» → ↓ → Enter — qabul + tasdiq; Esc ro'yxatni yopadi, tanlovni emas
    await pick(3);await typeIn('#p3f_w','3040');await page.keyboard.press('Enter');
    await pick(4);await typeIn('#p3f_w','3');assert.match(await page.locator('#smartList').textContent(),/3040/);
    await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
    assert.equal(await ev(()=>Panel3D._state().panels[4].w),3040);passed.push('Raqam: «3» → ↓ Enter → eni 3040 (qabul + tasdiq)');
    await typeIn('#p3f_w','30');await page.keyboard.press('Escape');
    assert.equal(await ev(()=>document.getElementById('smartList').hidden),true);assert.ok((await ev(()=>Panel3D._state().panels.length))>0);
    await typeIn('#p3f_w','');await page.keyboard.press('Backspace');await page.keyboard.press('ArrowDown');
    assert.match(await page.locator('#smartList').textContent(),/3040/,'bo\'sh maydonda ↓ — oxirgi qiymatlar');await page.keyboard.press('Escape');
    passed.push("Esc faqat ro'yxatni yopadi; bo'sh maydonda ↓ — oxirgi qiymatlar");

    // 5. Tarix soni chegarasi va qayta ochilganda saqlanishi
    await ev(()=>{for(let i=0;i<30;i++)SmartInput.remember('num',String(100+i))});
    assert.equal((await ev(()=>SmartInput.get().h.num)).length,15);
    await boot();assert.equal((await ev(()=>SmartInput.get().h.num))[0],'129');assert.ok((await ev(()=>SmartInput.get().h.name)).includes('Yon devor maxsus'));
    passed.push('Tarix: har turdan oxirgi 15 ta, qayta ochilganda saqlanadi');

    // 6. Avto-nom: Front, tanlovsiz — ikki yonma-yon korpus (bokalar bir-biriga tegadi) → A., B.
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    const loadScene=ps=>ev(ps=>{Panel3D.load({T:16,uid:100,panels:ps});Panel3D._select([])},ps);
    const names=()=>ev(()=>Object.fromEntries(Panel3D._state().panels.map(p=>[p.id,p.n])));
    await loadScene([...corpus(0,0),...corpus(10,600)]);await ev(()=>Panel3D._view('front'));
    assert.equal((await ev(()=>Panel3D._clusters())).length,2,'ikki korpus');
    assert.equal(await ev(()=>Panel3D._autoName()),16);let n=await names();
    ROLES.forEach((r,i)=>{assert.equal(n[i+1],'A. '+r);assert.equal(n[i+11],'B. '+r)});
    passed.push("Avto-nom (Front, tanlovsiz): 2 korpus — «A. chap boka … A. fasad», «B. …»; polka 1/2 pastdan");
    // CSV: korpus bo'yicha guruhlangan, nom bitta katakda
    const csv=await ev(()=>Panel3D._clExport({dl:';',hdr:true}));
    const col=csv.head.indexOf('Nomi'),nm=csv.rows.map(r=>r[col]);
    assert.ok(nm.indexOf("B. chap boka")>nm.lastIndexOf("A. fasad"),'A… keyin B…');assert.ok(csv.text.includes(";A. chap boka;"));
    passed.push('CSV: «A. chap boka» bitta katakda, qatorlar A…, keyin B…');
    // Orqadan qaralsa chap/o'ng almashadi, harf saqlanadi (tanlov — bitta korpus)
    await ev(()=>{Panel3D._view('back');Panel3D._select([1,2,3,4,5,6,7,8])});await ev(()=>Panel3D._autoName());n=await names();
    assert.equal(n[2],'A. chap boka');assert.equal(n[1],"A. o'ng boka");assert.equal(n[11],'B. chap boka');
    passed.push("Back ko'rinishda: chap/o'ng tomoshabinga qarab almashdi, «A.» saqlandi, B tegilmadi");

    // 7. Yopuvchi krisha qo'shni korpusga tegsa — tanlov bilan nomlash: A, keyin B
    await loadScene([...corpus(0,0,true),...corpus(10,600,true)]);await ev(()=>Panel3D._view('front'));
    assert.equal((await ev(()=>Panel3D._clusters())).length,2,'yopuvchi krisha qo\'shni bokaga qirrasi bilan tegadi — korpuslar alohida');
    await ev(()=>Panel3D._select([1,2,3,4,5,6,7,8]));await ev(()=>Panel3D._autoName());
    await ev(()=>Panel3D._select([11,12,13,14,15,16,17,18]));await ev(()=>Panel3D._autoName());n=await names();
    ROLES.forEach((r,i)=>{assert.equal(n[i+1],'A. '+r);assert.equal(n[i+11],'B. '+r)});
    // Alt+N hotkey ham ishlaydi (bitta korpus sahnada — harfsiz)
    await loadScene(corpus(0,0));await ev(()=>Panel3D._view('front'));await page.locator('#p3wrap .p3view canvas').first().click({position:{x:8,y:8}});await page.keyboard.press('Alt+n');
    n=await names();ROLES.forEach((r,i)=>assert.equal(n[i+1],r));
    passed.push('Tanlab nomlash: A, keyin B (yopuvchi krisha tegsa ham); Alt+N; bitta korpus — harfsiz');

    // 8. Smart sozlamalar oynasi: Edit ▸ Smart kiritish…
    await page.locator('#mbEdit .mbBtn').click();await page.locator('#smartSettingsBtn').click();
    assert.equal(await ev(()=>document.getElementById('smartDialog').open),true);
    await page.locator('#smartN').fill('20');await page.locator('#smartN').press('Tab');assert.equal((await ev(()=>SmartInput.get())).n,20);
    await page.locator('#smartClose').click();passed.push('Edit ▸ Smart kiritish: eslab qolish soni 20 ga o\'zgardi');

    assert.deepEqual(errors,[],'No page errors');
    console.log(JSON.stringify({status:'passed',checks:passed},null,2));
  }catch(e){console.error(e&&e.stack||e);console.error('ERRORS:',JSON.stringify(errors));console.error('PASSED:',JSON.stringify(passed,null,1));process.exitCode=1}
  finally{await browser.close();try{fs.rmSync(tmp,{recursive:true,force:true})}catch(e){}}
})();
