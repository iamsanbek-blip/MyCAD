'use strict';
// Drawing: assotsiativ o'lchov — haqiqiy brauzer (Chromium), web build, haqiqiy sichqoncha va klaviatura.
// Shkaf (to'rtburchak 300×500) → burchaklarga magnit bilan gorizontal o'lchov → Stretch ramka + «100» Enter → o'lchov 400.
// Ishga tushirish: node tests/dim-assoc-ui.cjs   (python3 va playwright kerak; boshqa Chromium: RUGBY_CHROMIUM=/yo'l/chrome)
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-dim-')),html=path.join(tmp,'rugby-web.html');
execFileSync('python3',[path.join(root,'scripts/build-web.py'),html]);
const errors=[],passed=[];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RUGBY_CHROMIUM||undefined});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:900}});
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    await page.goto('file://'+html);await page.waitForFunction(()=>typeof drawnLines!=='undefined'&&typeof dimAssocSync==='function');
    const ev=(f,a)=>page.evaluate(f,a);
    const S=(x,y)=>ev(([x,y])=>{const c=document.getElementById('cv').getBoundingClientRect(),s=toScreen({x,y});return{x:c.left+s.x,y:c.top+s.y}},[x,y]);
    await page.locator('#mbDraw').click();
    await ev(()=>{setAppMode('draw');setDrawTool('rect');addDrawPoint({x:0,y:0});addDrawPoint({x:300,y:500});view.scale=.8;view.ox=450;view.oy=760;draw()});
    // O'lchov: burchaklarga 3 px chetdan bosiladi — magnit aynan uchga tortadi
    await page.click('#dimHorizBtn');
    for(const[x,y,o]of[[0,0,3],[300,0,-3],[150,-60,0]]){const p=await S(x,y);await page.mouse.move(p.x+o,p.y-o);await page.mouse.click(p.x+o,p.y-o);await page.waitForTimeout(30)}
    await page.keyboard.press('Escape');
    let d=await ev(()=>JSON.parse(JSON.stringify(dimensions)));assert.equal(d.length,1);assert.deepEqual([d[0].p1,d[0].p2],[{x:0,y:0},{x:300,y:0}]);
    assert.ok(d[0].b1&&d[0].b1===await ev(()=>drawnLines[0].uid),'shkafga bog\'landi');
    passed.push("O'lchov: burchaklar yonidan bosildi — magnit aynan (0,0)–(300,0), shkafga bog'landi");
    // Stretch: o'ng tomon uchlari ustidan ramka, bazaviy nuqta — o'ng past burchak, o'ngga «100» Enter
    await page.click('#stretchBtn');const a=await S(260,560),b=await S(340,-30);
    await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up();
    const bp=await S(300,0);await page.mouse.click(bp.x+2,bp.y-2);const t=await S(380,0);await page.mouse.move(t.x,t.y,{steps:5});
    const live=await ev(()=>Math.abs(dimensions[0].p2.x-dimensions[0].p1.x));assert.ok(live>300.5,'sudrash paytida jonli: '+live);
    await page.keyboard.type('100');await page.keyboard.press('Enter');await page.waitForTimeout(40);
    d=await ev(()=>JSON.parse(JSON.stringify(dimensions)));assert.equal(Math.abs(d[0].p2.x-d[0].p1.x),400);assert.deepEqual(d[0].place,{x:150,y:-60});
    const xs=await ev(()=>drawnLines[0].grips.map(g=>g.x).sort((p,q)=>p-q));assert.deepEqual([xs[0],xs[3]],[0,400]);
    passed.push("Stretch (ramka + «100» Enter): shkaf 300 → 400, o'lchov o'zi 400 bo'ldi (sudrash paytida ham jonli), o'lchov chizig'i joyida");
    // Esc bilan bekor — o'lchov o'zgarmaydi
    await page.click('#stretchBtn');await page.mouse.move(a.x+(await S(100,0)).x-(await S(0,0)).x,a.y);
    {const a2=await S(360,560),b2=await S(440,-30);await page.mouse.move(a2.x,a2.y);await page.mouse.down();await page.mouse.move(b2.x,b2.y,{steps:6});await page.mouse.up();
      const bp2=await S(400,0);await page.mouse.click(bp2.x,bp2.y);const t2=await S(520,0);await page.mouse.move(t2.x,t2.y,{steps:5});
      assert.ok(await ev(()=>Math.abs(dimensions[0].p2.x-dimensions[0].p1.x))>400.5,'jonli');await page.keyboard.press('Escape');}
    assert.equal(await ev(()=>Math.abs(dimensions[0].p2.x-dimensions[0].p1.x)),400,'Esc — o\'lchov 400 da qoldi');
    passed.push("Stretch Esc bilan bekor — shkaf ham, o'lchov ham 400 da qoldi");
    await page.keyboard.press('Control+z');assert.equal(await ev(()=>Math.abs(dimensions[0].p2.x-dimensions[0].p1.x)),300,'Ctrl+Z');
    await page.keyboard.press('Control+y');assert.equal(await ev(()=>Math.abs(dimensions[0].p2.x-dimensions[0].p1.x)),400,'Ctrl+Y');
    passed.push('Ctrl+Z — shkaf va o\'lchov 300, Ctrl+Y — 400');
    assert.deepEqual(errors,[],'No page errors');console.log(JSON.stringify({status:'passed',checks:passed},null,2));
  }catch(e){console.error(e);console.error('ERRORS:',errors);console.error('PASSED:',passed);process.exitCode=1}
  finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}
})();
