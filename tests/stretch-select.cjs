'use strict';
// Panel Types (Drawing) — real Electron GUI smoke test. xvfb-run ostida ishga tushiring.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {_electron}=require('playwright');
const root=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-st-'));
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
    await page.locator('#mbDraw').click();await page.locator('#orthoOffBtn').click();
    // ikki to'rtburchak (to'g'ridan-to'g'ri model orqali), ikkinchisi tanlangan
    await page.evaluate(()=>{const mk=(x,y,w,h)=>{const rp=genRectPts({x,y},{x:x+w,y:y+h});return{kind:'rect',closed:true,selected:false,layer:activeLayer,points:rp,grips:rp.map(p=>({x:p.x,y:p.y}))}};
      drawnLines.length=0;drawnLines.push(mk(0,0,200,100),mk(0,150,200,100));fitView&&fitView();draw()});
    const box=async()=>{const s=await page.evaluate(()=>{const a=toScreen({x:150,y:-20}),b=toScreen({x:260,y:280});const r=document.getElementById('cv').getBoundingClientRect();return{x0:r.left+a.x,y0:r.top+a.y,x1:r.left+b.x,y1:r.top+b.y}});
      await page.mouse.move(s.x0,s.y0);await page.mouse.down();await page.mouse.move((s.x0+s.x1)/2,(s.y0+s.y1)/2,{steps:4});await page.mouse.move(s.x1,s.y1,{steps:4});await page.mouse.up()};
    // tanlov yo'q -> ikkala obyektning o'ng nuqtalari (2+2)
    await page.evaluate(()=>{drawnLines.forEach(l=>l.selected=false);startStretch()});await box();
    let pk=await page.evaluate(()=>stretchPicks.map(p=>p.li));assert.equal(pk.length,4,'tanlovsiz: '+pk);assert.deepEqual([...new Set(pk)].sort(),[0,1]);
    await page.keyboard.press('Escape');await page.evaluate(()=>{if(stretchMode)finishStretch()});
    // 2-obyekt tanlangan -> faqat uning 2 nuqtasi
    await page.evaluate(()=>{drawnLines[1].selected=true;startStretch()});
    assert.match(await page.locator('#hint').innerHTML(),/tanlangan 1 ta obyekt/);
    await box();pk=await page.evaluate(()=>stretchPicks.map(p=>p.li));assert.deepEqual(pk,[1,1],'faqat tanlangan: '+pk);
    passed.push('Drawing Stretch: tanlovsiz 4 nuqta (2 obyekt), tanlangan bo\'lsa faqat uning 2 nuqtasi');
    assert.deepEqual(errors,[],'No page errors');
    console.log(JSON.stringify({status:'passed',checks:passed,errors},null,2));
  }catch(e){console.error(e&&e.stack||e);console.error('ERRORS:',JSON.stringify(errors));process.exitCode=1}
  finally{await Promise.race([app.close().catch(()=>{}),new Promise(r=>setTimeout(r,4000))]);try{fs.rmSync(temporary,{recursive:true,force:true})}catch(e){}process.exit(process.exitCode||0)}
})();
