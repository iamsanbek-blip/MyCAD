'use strict';
// Panel Types (Drawing) — real Electron GUI smoke test. xvfb-run ostida ishga tushiring.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {_electron}=require('playwright');
const root=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-pt-'));
const args=['--disable-gpu',root];if(process.platform==='linux'&&process.getuid?.()===0)args.unshift('--no-sandbox');
const shot=process.env.PT_SHOT||'';
const errors=[],passed=[];
(async()=>{
  const app=await _electron.launch({executablePath:require('electron'),args,env:{...process.env,NODE_ENV:'test',RUGBY_TEST_USER_DATA_DIR:path.join(temporary,'profile')},timeout:30000});
  const watch=p=>{p.on('pageerror',e=>errors.push('pageerror: '+e.message));p.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())})};
  app.on('window',watch);app.windows().forEach(watch);
  try{
    let page;const deadline=Date.now()+15000;
    while(!page&&Date.now()<deadline){page=app.windows().find(p=>p.url().startsWith('app://local/'));if(!page)await new Promise(r=>setTimeout(r,50))}
    const win=await app.browserWindow(page);await win.evaluate(w=>w.setContentSize(1600,950));
    await page.waitForFunction(()=>typeof documentPages!=='undefined'&&documentPages.length===1);
    const tbH0=await page.evaluate(()=>document.querySelector('#drawToolbar, .drawToolbar, #toolbar')?.getBoundingClientRect().height||0);
    await page.locator('#mbDraw').click();await page.locator('#orthoOffBtn').click();
    assert.ok(await page.locator('#ptGroup').isVisible());
    const tbH=await page.evaluate(()=>{const g=document.getElementById('ptGroup');let e=g.parentElement;return Math.round(e.getBoundingClientRect().height)});
    const right=await page.evaluate(()=>Math.round(document.getElementById('ptGroup').getBoundingClientRect().right));
    assert.ok(right<=1600,'ptGroup ekrandan chiqmaydi: '+right);passed.push('toolbar height '+tbH+'px, ptGroup right '+right+'px');
    await page.locator('#ptToggle').click();assert.ok(await page.locator('#ptPop').isVisible());
    assert.equal(await page.locator('#ptPop [data-pt]').count(),13);assert.equal(await page.locator('#ptPop [data-pc]').count(),4);
    const pr=await page.evaluate(()=>{const r=document.getElementById('ptPop').getBoundingClientRect();return{l:Math.round(r.left),r:Math.round(r.right)}});
    assert.ok(pr.l>=0&&pr.r<=1600,'popover ekranda: '+JSON.stringify(pr));
    if(shot){await page.locator('#ptPop [data-pt="T"]').hover();await page.screenshot({path:shot,clip:{x:0,y:0,width:1600,height:260}})}
    passed.push('popover: 13 tur (3 guruh), 4 burchak, ekranda '+pr.l+'..'+pr.r);
    // T, L2, depth 300
    await page.locator('#ptPop [data-pt="T"]').click();assert.equal(await page.evaluate(()=>drawTool),'ptype');
    await page.locator('#ptToggle').click();await page.locator('#ptPop [data-pc="L2"]').click();await page.keyboard.press('Escape');
    const bb=await page.locator('#cv').boundingBox(),at=async(x,y)=>{await page.mouse.move(bb.x+x,bb.y+y,{steps:6});await page.mouse.down();await page.mouse.up()};
    await at(300,300);await page.mouse.move(bb.x+500,bb.y+420,{steps:6});
    await page.keyboard.type('400');await page.keyboard.press('Tab');await page.keyboard.type('300');
    if(shot)await page.screenshot({path:shot.replace('.png','-draw.png'),clip:{x:bb.x,y:bb.y,width:900,height:600}});
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>drawnLines.length===2);
    const r1=await page.evaluate(()=>{const L=drawnLines;const ys=L.flatMap(l=>l.points.map(p=>p.y)),xs=L.flatMap(l=>l.points.map(p=>p.x));return{g:new Set(L.map(l=>l.group)).size,grp:!!L[0].group,D:Math.max(...ys)-Math.min(...ys),top:Math.max(...ys),W:Math.max(...xs)-Math.min(...xs)}});
    assert.equal(r1.g,1);assert.ok(r1.grp);assert.ok(Math.abs(r1.D-300)<1e-6,'bo\'y 300: '+r1.D);assert.ok(Math.abs(r1.W-400)<1e-6,'en 400: '+r1.W);
    const A=await page.evaluate(()=>drawnLines[0].points);
    passed.push('T: 2 kontur, 1 guruh, en×bo\'y (Tab) '+r1.W+'×'+r1.D);
    // L2: boshlang'ich nuqta yuqori-chap -> top = start y
    const start=await page.evaluate(()=>Math.max(...drawnLines.flatMap(l=>l.points.map(p=>p.y))));
    // ×2 = 32 mm
    await page.evaluate(()=>{drawnLines.length=0});
    await page.locator('#ptK').fill('2');await page.locator('#ptToggle').click();await page.locator('#ptPop [data-pt="v"]').click();
    await at(300,300);await page.keyboard.type('10');await page.keyboard.press('Tab');await page.keyboard.type('500');await page.keyboard.press('Enter');await page.waitForFunction(()=>drawnLines.length===1);
    const vw=await page.evaluate(()=>{const xs=drawnLines[0].points.map(p=>p.x);return Math.max(...xs)-Math.min(...xs)});
    assert.ok(Math.abs(vw-32)<1e-6,'×2 = 32: '+vw);passed.push('t 16 × 2 = '+vw+' mm');
    await page.locator('#ptK').fill('1');
    // 4 ramka, yozib kiritilgan kenglik 250 + Enter
    for(const ty of ['r1','r2','r3','r4']){
      await page.evaluate(()=>{drawnLines.length=0});
      await page.locator('#ptToggle').click();await page.locator(`#ptPop [data-pt="${ty}"]`).click();
      await at(300,300);await page.mouse.move(bb.x+400,bb.y+300,{steps:4});await page.keyboard.type('250');await page.keyboard.press('Tab');await page.keyboard.type('300');await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>drawnLines.length),0,'polka bosqichi: hali qo\'yilmagan');
      await page.keyboard.press('Escape');   // polkasiz
      await page.waitForFunction(()=>drawnLines.length===4);
      const r=await page.evaluate(()=>{const L=drawnLines,xs=L.flatMap(l=>l.points.map(p=>p.x)),ys=L.flatMap(l=>l.points.map(p=>p.y));
        const area=L.reduce((a,l)=>{const X=l.points.map(p=>p.x),Y=l.points.map(p=>p.y);return a+(Math.max(...X)-Math.min(...X))*(Math.max(...Y)-Math.min(...Y))},0);
        return{W:Math.max(...xs)-Math.min(...xs),D:Math.max(...ys)-Math.min(...ys),area}});
      assert.ok(Math.abs(r.W-250)<1e-6&&Math.abs(r.D-300)<1e-6,ty+' '+JSON.stringify(r));
      assert.ok(Math.abs(r.area-(250*300-(250-32)*(300-32)))<1e-6,ty+' maydon');
    }
    passed.push('4 ramka (r1–r4): 250×300, 4 panel, maydon to\'g\'ri (Esc = polkasiz)');
    // Polka: g'ildirak bilan 3 ta gorizontal, keyin raqam 2 + V -> 2 ta vertikal
    await page.evaluate(()=>{drawnLines.length=0});
    await page.locator('#ptToggle').click();await page.locator('#ptPop [data-pt="r1"]').click();
    await at(300,300);await page.keyboard.type('600');await page.keyboard.press('Tab');await page.keyboard.type('800');await page.keyboard.press('Enter');
    await page.mouse.move(bb.x+400,bb.y+350);for(let i=0;i<3;i++){await page.mouse.wheel(0,-100);await page.waitForTimeout(40)}
    assert.equal(await page.evaluate(()=>ptShelf.n),3);
    if(shot)await page.screenshot({path:shot.replace('.png','-shelf.png'),clip:{x:bb.x,y:bb.y,width:900,height:600}});
    await page.keyboard.press('Enter');await page.waitForFunction(()=>drawnLines.length===7);
    const hs=await page.evaluate(()=>drawnLines.slice(4).map(l=>{const X=l.points.map(p=>p.x),Y=l.points.map(p=>p.y);return[Math.max(...X)-Math.min(...X),Math.max(...Y)-Math.min(...Y),Math.min(...Y)]}));
    assert.ok(hs.every(h=>Math.abs(h[0]-568)<1e-6&&Math.abs(h[1]-16)<1e-6),'gorizontal polka 568×16: '+JSON.stringify(hs));
    const gaps=hs.map(h=>h[2]).sort((a,b)=>a-b);assert.ok(Math.abs((gaps[1]-gaps[0])-(gaps[2]-gaps[1]))<1e-6,'teng oraliq');
    assert.equal(await page.evaluate(()=>new Set(drawnLines.map(l=>l.group)).size),1);
    passed.push('polka: g\'ildirak 3 ta gorizontal 568×16, teng oraliq, bitta guruh');
    await page.evaluate(()=>{drawnLines.length=0});
    await at(300,300);await page.keyboard.type('600');await page.keyboard.press('Tab');await page.keyboard.type('800');await page.keyboard.press('Enter');
    await page.keyboard.press('v');await page.keyboard.type('2');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>drawnLines.length===6);
    const vs=await page.evaluate(()=>drawnLines.slice(4).map(l=>{const X=l.points.map(p=>p.x),Y=l.points.map(p=>p.y);return[Math.max(...X)-Math.min(...X),Math.max(...Y)-Math.min(...Y)]}));
    assert.ok(vs.every(h=>Math.abs(h[0]-16)<1e-6&&Math.abs(h[1]-768)<1e-6),'vertikal 16×768: '+JSON.stringify(vs));
    passed.push('polka: raqam 2 + V -> 2 ta vertikal 16×768');
    // Blok ichiga polka: 2 ta gorizontal -> 3 bo'lak + 2 polka, maydon saqlanadi
    await page.evaluate(()=>{drawnLines.length=0});
    await page.locator('#ptToggle').click();await page.locator('#ptPop [data-pt="block"]').click();
    await at(300,300);await page.keyboard.type('600');await page.keyboard.press('Tab');await page.keyboard.type('800');await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>drawnLines.length),0,'blokda ham polka bosqichi');
    await page.keyboard.press('h');await page.keyboard.type('2');await page.keyboard.press('Enter');
    await page.waitForFunction(()=>drawnLines.length===5);
    const ba=await page.evaluate(()=>drawnLines.reduce((a,l)=>{const X=l.points.map(p=>p.x),Y=l.points.map(p=>p.y);return a+(Math.max(...X)-Math.min(...X))*(Math.max(...Y)-Math.min(...Y))},0));
    assert.ok(Math.abs(ba-600*800)<1e-6,'blok maydoni saqlandi: '+ba);
    passed.push('blok + 2 polka: 3 bo\'lak + 2 polka, ustma-ust yo\'q');
    // Shkaf turlari: 5 kontur (tepa, 2 yon, o'rta, blok), polkasiz
    for(const ty of ['c1','c2','c3','c4']){
      await page.evaluate(()=>{drawnLines.length=0});
      await page.locator('#ptToggle').click();await page.locator(`#ptPop [data-pt="${ty}"]`).click();
      await at(300,300);await page.keyboard.type('600');await page.keyboard.press('Tab');await page.keyboard.type('1000');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
      await page.waitForFunction(()=>drawnLines.length===5);
      const r=await page.evaluate(()=>{const xs=drawnLines.flatMap(l=>l.points.map(p=>p.x)),ys=drawnLines.flatMap(l=>l.points.map(p=>p.y));return[Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)]});
      assert.ok(Math.abs(r[0]-600)<1e-6&&Math.abs(r[1]-1000)<1e-6,ty+' '+r);
      const blk=await page.evaluate(()=>{const ys=drawnLines.flatMap(l=>l.points.map(p=>p.y)),y0=Math.min(...ys);return drawnLines.map(l=>{const Y=l.points.map(p=>p.y);return[Math.min(...Y)-y0,Math.max(...Y)-Math.min(...Y)]}).filter(v=>Math.abs(v[0])<1e-6&&Math.abs(v[1]-100)<1e-6).length});
      assert.equal(blk,1,ty+': pastki blok bo\'yi 100');
    }
    passed.push('4 shkaf (c1–c4): 600×1000, 5 kontur, pastki blok 100 mm');
    // Depth = daraja: 100 va 0 da ikki blok -> Modelingda 100 mm farqli tekisliklar
    await page.evaluate(()=>{drawnLines.length=0});
    await page.locator('#ptToggle').click();await page.locator('#ptPop [data-pt="block"]').click();
    await page.locator('#ptD').fill('100');
    await at(300,300);await page.keyboard.type('600');await page.keyboard.press('Tab');await page.keyboard.type('400');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
    await page.locator('#ptD').fill('0');
    await at(300,300);await page.keyboard.type('600');await page.keyboard.press('Tab');await page.keyboard.type('400');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
    await page.waitForFunction(()=>drawnLines.length===2);
    assert.equal(await page.evaluate(()=>drawnLines.map(l=>l.ptz).join(',')),'100,0');
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    const n0=await page.evaluate(()=>Panel3D._state().panels.length);
    await page.locator('#p3wrap .p3ddb',{hasText:'Panel'}).click();await page.locator('#p3pnFromDraw').click();
    await page.waitForFunction(n=>Panel3D._state().panels.length>=n+2,n0);
    const two=await page.evaluate(n=>Panel3D._state().panels.slice(n).map(p=>({x:p.x,y:p.y,z:p.z,o:p.o})),n0);
    const ys=two.map(p=>p.y).sort((a,b)=>a-b);assert.ok(Math.abs(ys[1]-ys[0]-100)<1e-6,'100 mm farq: '+JSON.stringify(two));
    passed.push('Depth 100 / 0 -> Modelingda 2 panel, tekisliklar farqi '+(ys[1]-ys[0])+' mm');
    assert.deepEqual(errors,[],'No page errors');
    console.log(JSON.stringify({status:'passed',checks:passed,errors},null,2));
  }catch(e){console.error(e&&e.stack||e);console.error('ERRORS:',JSON.stringify(errors));process.exitCode=1}
  finally{await Promise.race([app.close().catch(()=>{}),new Promise(r=>setTimeout(r,4000))]);try{fs.rmSync(temporary,{recursive:true,force:true})}catch(e){}process.exit(process.exitCode||0)}
})();
