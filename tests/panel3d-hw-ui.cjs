'use strict';
// Modeling ▸ Furnitura va teshiklar: oyna (Alt+F), «Furnituralash», 3D ko'rinish, panel xossalaridagi teshiklar ro'yxati,
// DXF/CSV yuklab olish, undo, loyiha holatida saqlanish. Haqiqiy brauzer (Chromium), web build.
// Ishga tushirish: node tests/panel3d-hw-ui.cjs (RUGBY_CHROMIUM ixtiyoriy)
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-hw-')),html=path.join(tmp,'rugby-web.html');
execFileSync('python3',[path.join(root,'scripts/build-web.py'),html]);
const errors=[],passed=[];
const corpus=[
  {id:1,n:'A. chap boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0},{id:2,n:"A. o'ng boka",w:500,h:720,t:16,o:'side',x:592,y:360,z:0},
  {id:3,n:'A. dno',w:568,h:500,t:16,o:'flat',x:300,y:8,z:0},{id:4,n:'A. krisha',w:568,h:500,t:16,o:'flat',x:300,y:712,z:0},
  {id:5,n:'A. polka',w:568,h:480,t:16,o:'flat',x:300,y:480,z:-10},{id:7,n:'A. orqa devor',w:584,h:704,t:4,o:'front',x:300,y:360,z:-240},
  {id:8,n:'A. fasad',w:596,h:716,t:16,o:'front',x:300,y:360,z:258}];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RUGBY_CHROMIUM||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    const ctx=await browser.newContext({viewport:{width:1500,height:900},acceptDownloads:false}),page=await ctx.newPage();
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    const ev=(f,a)=>page.evaluate(f,a);
    await page.goto('file://'+html);await page.waitForFunction(()=>typeof Panel3D!=='undefined'&&typeof RugbyHW!=='undefined');await ev(()=>localStorage.clear());await page.reload();
    await page.waitForFunction(()=>typeof Panel3D!=='undefined');
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    await ev(ps=>{Panel3D.load({T:16,uid:100,panels:ps});Panel3D._select([]);Panel3D._view('iso')},corpus);

    // 1. Object menyusi va Alt+F oynani ochadi; sozlamalar ko'rinadi
    await page.locator('#p3wrap .p3view canvas').first().click({position:{x:8,y:8}});await page.keyboard.press('Alt+f');
    await page.waitForSelector('#p3hw:not([hidden])');
    assert.equal(await page.locator('#p3hw_con').inputValue(),'konf');assert.equal(await page.locator('#p3hw_konf_ez').inputValue(),'50');
    assert.match(await page.locator('#p3hwScope').textContent(),/Hamma ko'rinadigan panel \(7\)/);
    await page.locator('#p3hwX').click();assert.ok(await page.locator('#p3hw').isHidden());
    await page.locator('.p3ddb',{hasText:'Object'}).click();await page.locator('#p3oHw').click();await page.waitForSelector('#p3hw:not([hidden])');
    passed.push("Oyna: Alt+F va Object ▸ Furnitura; standart — yevrovint, chet chuqurligi 50");

    // 2. Furnituralash: hisobot, teshiklar panellarga yozildi, 3D da ko'rinadi
    await page.locator('#p3hwGo').click();
    const out=await page.locator('#p3hwOut').textContent();
    assert.match(out,/14 ta ulanish/);assert.match(out,/Yevrovint: 16/);assert.match(out,/Petlya: 2/);assert.match(out,/Paz: 4/);assert.match(out,/xato topilmadi/);
    const opsN=await ev(()=>Panel3D._state().panels.map(p=>(p.ops||[]).length));assert.deepEqual(opsN,[11,7,5,5,0,0,4]);
    const vis=await ev(()=>Panel3D._state().panels.map(p=>!!p.g&&p.g.children.some(c=>c.userData&&c.userData.ops)));assert.deepEqual(vis,[true,true,true,true,false,false,true]);
    passed.push("«Furnituralash»: 14 ulanish, hisobot (yevrovint 16, petlya 2, paz 4), xatosiz; teshiklar 3D da chiziladi");

    // 3. Ko'rinish menyusi: teshiklarni yashirish / ko'rsatish
    await page.locator('#p3hwX').click();await page.locator('.p3ddb',{hasText:'View'}).click();await page.locator('#p3vmOps').click();
    assert.equal(await ev(()=>Panel3D._hw.showOps()),false);assert.ok(await ev(()=>Panel3D._state().panels.every(p=>!p.g.children.some(c=>c.userData&&c.userData.ops))));
    await page.locator('.p3ddb',{hasText:'View'}).click();await page.locator('#p3vmOps').click();assert.equal(await ev(()=>Panel3D._hw.showOps()),true);
    passed.push("View ▸ Teshik va pazlarni ko'rsatish: yashiradi va qaytaradi");

    // 4. Panel xossalari: teshiklar ro'yxati, qo'lda teshik qo'shish (Ø5.2), o'chirish
    await page.locator('#p3pl .p3it').nth(4).click();await page.waitForSelector('#p3opT');
    assert.match(await page.locator('#p3opT').textContent(),/Teshiklar: 0/);await page.locator('#p3opT').click();
    await page.fill('#p3opU','100');await page.fill('#p3opV','100');await page.fill('#p3opD','5.2');await page.fill('#p3opZ','10');await page.locator('#p3opAdd').click();
    assert.match(await page.locator('#p3opT').textContent(),/Teshiklar: 1/);assert.deepEqual(await ev(()=>Panel3D._hw.ops(5)),[{k:'d',f:'A',u:100,v:100,d:5.2,z:10,t:'man'}]);
    await page.locator('#p3pl .p3it').nth(0).click();await page.waitForSelector('#p3opT');assert.match(await page.locator('#p3opT').textContent(),/Teshiklar: 10 · paz 1/);
    await page.locator('.p3opX').first().click();assert.equal(await ev(()=>Panel3D._hw.ops(1).length),10);
    passed.push("Panel xossalari: teshiklar ro'yxati, qo'lda Ø5.2 teshik qo'shish, ✕ bilan o'chirish");

    // 5. Undo: o'chirish qaytadi; qayta Furnituralash qo'lda teshikni saqlaydi
    await page.keyboard.press('Control+z');assert.equal(await ev(()=>Panel3D._hw.ops(1).length),11);
    await ev(()=>Panel3D._select([]));await page.keyboard.press('Alt+f');await page.locator('#p3hwGo').click();
    assert.equal(await ev(()=>Panel3D._hw.ops(5).length),1);
    passed.push("Ctrl+Z teshik o'chirishni qaytaradi; qayta «Furnituralash» qo'lda qo'yilgan teshikni saqlaydi");

    // 6. DXF va CSV yuklab olish: haqiqiy fayl; Ø5.2 → Ø5 sverlo
    // web build: fayl claude.ai «downloads» orqali saqlanadi (.dxf → .dxf.txt) — shu yerda o'rnini bosuvchi bilan ushlanadi
    await ev(()=>{window.__saved=[];window.claude={use:async k=>k==='downloads'?{save:async({filename,data})=>{window.__saved.push({filename,text:typeof data==='string'?data:await data.text()})}}:null}});
    const saved=async(sel,n)=>{await page.locator(sel).click();await page.waitForFunction(n=>window.__saved.length>=n,n);return ev(()=>window.__saved[window.__saved.length-1])};
    let f=await saved('#p3hwDxf',1);assert.equal(f.filename,'rugby-cnc.dxf.txt');
    const dxf=f.text;assert.ok(dxf.includes('$ACADVER\n1\nAC1009'));assert.ok(dxf.endsWith('0\nEOF\n'));
    assert.equal((dxf.match(/\nCIRCLE\n/g)||[]).length,(dxf.match(/\nCIRCLE\n8\n(DRILL|HDRILL)_/g)||[]).length);
    const o2=await page.locator('#p3hwOut').textContent();assert.match(o2,/7 panel, 10 chizma/);assert.match(o2,/Ø5\.2→5 \(1 ta\)/);
    f=await saved('#p3hwCsv',2);assert.equal(f.filename,'rugby-teshiklar.csv');
    const csv=f.text;assert.match(csv,/^Panel;Turi;Tomon;U;V;Diametr;Chuqurlik/);assert.equal(csv.split('\r\n').length,1+33);
    if(process.env.RUGBY_HW_DXF)fs.writeFileSync(process.env.RUGBY_HW_DXF,dxf);   // tashqi tekshiruv uchun (masalan ezdxf)
    passed.push("DXF eksport: rugby-cnc.dxf (R12, 7 panel, 10 chizma, Ø5.2→Ø5); Teshiklar CSV: 33 qator");

    // 7. Sozlama o'zgarishi eslab qolinadi; tanlangan panellar bo'yicha ishlaydi
    await page.selectOption('#p3hw_con','ekss');await page.locator('#p3hwX').click();
    await ev(()=>Panel3D._select([1,3]));await page.keyboard.press('Alt+f');assert.match(await page.locator('#p3hwScope').textContent(),/Tanlangan 2 ta panel/);
    assert.equal(await page.locator('#p3hw_con').inputValue(),'ekss');await page.locator('#p3hwGo').click();
    assert.match(await page.locator('#p3hwOut').textContent(),/1 ta ulanish/);assert.equal(await ev(()=>JSON.parse(localStorage.getItem('rugby.hw.v1')).con),'ekss');
    assert.ok(await ev(()=>Panel3D._hw.ops(3).some(o=>o.t==='ekss'&&o.d===15)));
    passed.push("Sozlama (ekssentrik) eslab qolinadi; tanlangan 2 panel — faqat ular orasidagi 1 ulanish");

    // 8. Loyiha holati: snapshot → load teshiklarni saqlaydi; buzuq yozuv tashlanadi
    const snap=await ev(()=>{const s=Panel3D.snapshot();s.panels[4].ops.push({k:'zz'});return s});
    await ev(s=>Panel3D.load(s),snap);const after=await ev(()=>Panel3D._state().panels.map(p=>p.ops||[]));
    assert.deepEqual(after[4],[{k:'d',f:'A',u:100,v:100,d:5.2,z:10,t:'man'}]);assert.deepEqual(after.map(a=>a.length),snap.panels.map(p=>(p.ops||[]).filter(o=>o.k!=='zz').length));
    passed.push("Saqlash/ochish: teshiklar saqlanadi, noto'g'ri yozuv tashlanadi");
    assert.deepEqual(errors,[]);
  }finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}
  console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`panel3d-hw-ui: ${passed.length} checks passed`);
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exit(1)});
