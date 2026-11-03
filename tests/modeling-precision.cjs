'use strict';
// Modeling (Panel 3D) aniqlik testi: magnit, Move gizmo, raqamli kiritish, 3D kursor.
// Haqiqiy brauzer (Chromium + WebGL/SwiftShader), web build (scripts/build-web.py) va haqiqiy sichqoncha harakati.
// Ishga tushirish: node tests/modeling-precision.cjs   (python3 va playwright kerak; boshqa Chromium: RUGBY_CHROMIUM=/yo'l/chrome)
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-prec-')),html=path.join(tmp,'rugby-web.html');
execFileSync('python3',[path.join(root,'scripts/build-web.py'),html]);
const errors=[],passed=[];
const A={id:1,n:'A',w:400,h:300,t:16,o:'front',x:0,y:150,z:0};    // x[-200,200] y[0,300] z[-8,8]
const B={id:2,n:'B',w:300,h:200,t:16,o:'front',x:600,y:100,z:0};  // x[450,750] y[0,200]
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RUGBY_CHROMIUM||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:900}});
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    await page.goto('file://'+html);await page.waitForFunction(()=>typeof Panel3D!=='undefined');
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    assert.ok(await page.evaluate(()=>!document.querySelector('#p3wrap').textContent.includes('WebGL ishga tushmadi')),'WebGL');
    const ev=(f,a)=>page.evaluate(f,a);
    const reset=async(view)=>{await ev(([a,b])=>{Panel3D.load({T:16,uid:10,panels:[a,b]});Panel3D._select([]);Panel3D._setTool('move')},[A,B]);await ev(v=>Panel3D._view(v),view);await page.waitForTimeout(60)};
    const pb=()=>ev(()=>{const p=Panel3D._state().panels.find(x=>x.id===2);return{x:p.x,y:p.y,z:p.z,m:p.m||null}});
    const scr=(x,y,z)=>ev(([x,y,z])=>Panel3D._scr(x,y,z),[x,y,z]);
    const drag=async(a,b,opt={})=>{await page.mouse.move(a.x,a.y,{steps:3});await page.mouse.down();await page.mouse.move((a.x+b.x)/2+7,(a.y+b.y)/2+5,{steps:6});
      await page.mouse.move(b.x,b.y,{steps:8});if(opt.before)await opt.before();if(!opt.hold)await page.mouse.up()};

    // 1. Old (Front) ko'rinish: B ni chap-yuqori uchidan ushlab A ning o'ng-yuqori uchiga — aniq tushadi
    await reset('front');
    await drag(await scr(450,200,8),await scr(203,297,8));   // nishondan 3 mm chetroq — magnit tortib oladi
    let b=await pb();assert.deepEqual([b.x,b.y,b.z],[350,200,0],'uch → uch: '+JSON.stringify(b));
    passed.push('Front: uchidan ushlab uchga — B(350, 200, 0) aynan');

    // 2. Iso: X strelkasi bilan sudrash, kursor A uchiga — faqat X o'zgaradi, B qirrasi A uchi bilan bir tekislikda
    await reset('iso');await ev(()=>Panel3D._select([2]));let g=await ev(()=>Panel3D._gz());
    assert.ok(g.v0&&g.v1&&g.v2,'iso: uchala o\'q ko\'rinadi');
    await drag(g.a0,await scr(200,300,8));b=await pb();
    assert.equal(b.y,100);assert.equal(b.z,0);
    const xs=[450,600,750].map(v=>v+b.x-600);assert.ok(xs.some(v=>Math.abs(v-200)<1e-9),'X o\'qi bo\'ylab magnit: '+JSON.stringify(b));
    passed.push(`Iso: X strelkasi + magnit — Y/Z o'zgarmadi, qirra x=200 (B.x=${b.x})`);

    // 3. Sudrash davomida raqam kiritish: 125 Enter — aniq +125 mm
    await reset('iso');await ev(()=>Panel3D._select([2]));g=await ev(()=>Panel3D._gz());
    await drag(g.a0,{x:g.a0.x+40,y:g.a0.y+3},{hold:true});
    await page.keyboard.type('125');assert.equal((await ev(()=>Panel3D._act())).typed,'125');await page.keyboard.press('Enter');await page.mouse.up();
    b=await pb();assert.deepEqual([b.x,b.y,b.z],[725,100,0]);passed.push('X strelkasi + «125 Enter» — B.x 600 → 725 aynan');
    // Ctrl+Z bitta qadam ortga
    await page.keyboard.press('Control+z');b=await pb();assert.equal(b.x,600);passed.push('Undo: bitta Ctrl+Z bilan qaytadi');

    // 4. Esc va o'ng tugma — bekor (joyiga qaytadi)
    await reset('iso');await ev(()=>Panel3D._select([2]));g=await ev(()=>Panel3D._gz());
    await drag(g.a0,{x:g.a0.x+120,y:g.a0.y},{hold:true});assert.notEqual((await pb()).x,600);await page.keyboard.press('Escape');await page.mouse.up();
    b=await pb();assert.deepEqual([b.x,b.y,b.z],[600,100,0]);
    await drag(g.a2,{x:g.a2.x-90,y:g.a2.y+40},{hold:true});assert.notEqual((await pb()).z,0);
    await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();
    b=await pb();assert.deepEqual([b.x,b.y,b.z],[600,100,0]);assert.equal(await ev(()=>Panel3D._act()),null);
    passed.push('Esc va o\'ng tugma sudrashni bekor qiladi (joyiga qaytadi)');

    // 5. Sudrash davomida X tugmasi — o'q cheklovi (Blender kabi); Shift+Y — XZ tekisligi
    await reset('iso');await ev(()=>Panel3D._select([2]));
    {const c=await scr(470,180,8);await drag(c,{x:c.x+160,y:c.y-70},{before:()=>page.keyboard.press('x')});}   // panel yuzasidan (gizmo dastalaridan uzoqda)
    b=await pb();assert.ok(b.x!==600&&b.y===100&&b.z===0,'X cheklovi: '+JSON.stringify(b));
    await reset('iso');await ev(()=>Panel3D._select([2]));
    {const c=await scr(470,180,8);await drag(c,{x:c.x+130,y:c.y-90},{before:()=>page.keyboard.press('Shift+Y')});}
    b=await pb();assert.ok(b.y===100&&(b.x!==600||b.z!==0),'Shift+Y (XZ tekisligi): '+JSON.stringify(b));
    passed.push('Sudrash davomida X — faqat X o\'qi, Shift+Y — XZ tekisligi (Y o\'zgarmaydi)');

    // 6. Tekislik dastasi (XZ) — Y o'zgarmaydi; markaz (oq) — ekran tekisligi
    await reset('iso');await ev(()=>Panel3D._select([2]));g=await ev(()=>Panel3D._gz());assert.ok(g.pv1,'XZ dastasi ko\'rinadi');
    await drag(g.p1,{x:g.p1.x+70,y:g.p1.y+35});b=await pb();assert.ok(b.y===100&&(b.x!==600||b.z!==0),'XZ dastasi: '+JSON.stringify(b));
    passed.push('Gizmo XZ tekislik dastasi: Y aynan saqlanadi');

    // 7. Qadam nisbiy: 10 mm qadam, magnit o'chiq — siljish 10 ga karrali (markaz 16/2 da qolsa ham buzilmaydi)
    await reset('front');await ev(()=>{document.querySelector('#p3step').value='10'});await page.keyboard.press('Space');
    {const c=await scr(600,100,8);await drag({x:c.x+13,y:c.y+11},{x:c.x+237,y:c.y+11});}
    b=await pb();assert.ok(b.x!==600&&Math.abs((b.x-600)/10-Math.round((b.x-600)/10))<1e-9&&b.y===100,'qadam: '+JSON.stringify(b));
    await page.keyboard.press('Space');await ev(()=>{document.querySelector('#p3step').value='1'});
    passed.push(`Qadam 10 mm siljishga qo'llanadi (Δx=${b.x-600})`);

    // 8. Qirra (Edge) magniti: B uchi A ning yuqori qirrasiga (uch/o'rta emas) — y aynan 300
    await reset('front');await ev(()=>{Panel3D._snapM.edge=true});
    await drag(await scr(450,200,8),await scr(60,300,8));b=await pb();
    assert.equal(b.y,200,'qirra y');assert.ok(Math.abs(b.x-210)<3,'qirra x ≈ 210: '+b.x);
    await ev(()=>{Panel3D._snapM.edge=false});passed.push(`Qirra magniti: B uchi A qirrasida (y=300 aynan, x=${(b.x-150).toFixed(2)})`);

    // 9. Ushlash nuqtasi oldindan ko'rinadi (Move asbobi, tanlangan panel uchi ustida)
    await reset('front');await ev(()=>Panel3D._select([2]));
    {const c=await scr(750,0,8);await page.mouse.move(c.x+2,c.y-1,{steps:4});}
    assert.equal(await ev(()=>{const m=document.querySelector('#p3snap');return !m.hidden&&m.className}),'p3snap end','uch belgisi');
    assert.equal(await page.locator('#p3snap i').isVisible(),true,'belgi shakli ko\'rinadi');
    assert.match(await page.locator('#p3snap').textContent(),/Uch/);passed.push('Hover: ushlash uchi belgisi (kvadrat + «Uch»)');

    // 10. 3D kursor: Shift + o'ng tugma A uchiga — aynan; Alt+S — B markazi kursorga; Pivot = kursor bilan aylantirish
    await reset('iso');{const c=await scr(200,300,8);await page.mouse.move(c.x+2,c.y+2,{steps:3});}
    await page.keyboard.down('Shift');await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.keyboard.up('Shift');
    assert.deepEqual(await ev(()=>Panel3D._cursor()),[200,300,8]);
    await ev(()=>Panel3D._select([2]));await page.keyboard.press('Alt+s');b=await pb();assert.deepEqual([b.x,b.y,b.z],[200,300,8]);
    g=await ev(()=>Panel3D._gz());await drag(g.a0,{x:g.a0.x+30,y:g.a0.y},{hold:true});await page.keyboard.type('100');await page.keyboard.press('Enter');await page.mouse.up();
    assert.equal((await pb()).x,300);
    await page.keyboard.press('p');assert.equal(await ev(()=>Panel3D._pivot()),'cursor');
    await ev(()=>Panel3D._setTool('rotate'));{const c=await scr(300,300,8);await page.mouse.move(c.x,c.y,{steps:2});await page.mouse.down();await page.mouse.up()}
    b=await pb();assert.deepEqual([b.x,b.y,b.z].map(v=>Math.round(v*1e6)/1e6),[200,300,-92],'kursor atrofida 90°: '+JSON.stringify(b));
    await page.keyboard.press('p');passed.push('3D kursor: Shift+o\'ng tugma uchga aynan, Alt+S, Pivot=kursor bilan 90° (200, 300, −92)');

    // 11. Yangi panel (N): kursor A uchiga — panel burchagi aynan shu uchda
    await reset('front');await page.keyboard.press('n');
    {const c=await scr(-200,300,8);await page.mouse.move(c.x+60,c.y+60,{steps:4});await page.mouse.move(c.x+2,c.y-2,{steps:6});await page.mouse.down();await page.mouse.up()}
    const np=await ev(()=>{const p=Panel3D._state().panels.find(x=>x.id>2);return{x:p.x,y:p.y,w:p.w,h:p.h}});
    const cs=[[np.x-np.w/2,np.y-np.h/2],[np.x+np.w/2,np.y-np.h/2],[np.x-np.w/2,np.y+np.h/2],[np.x+np.w/2,np.y+np.h/2]];
    assert.ok(cs.some(c=>c[0]===-200&&c[1]===300),'yangi panel burchagi (-200,300): '+JSON.stringify(np));passed.push('Yangi panel: burchagi A uchiga aynan tushdi');

    // 12. 2D ko'rinishda chuqurlik (Z) magnit bilan o'zgarmaydi; ko'rish o'qi strelkasi yashirin
    await reset('front');await ev(()=>Panel3D._select([2]));g=await ev(()=>Panel3D._gz());assert.equal(g.v2,false,'Front: Z strelkasi yashirin');
    await drag(await scr(450,200,8),await scr(200,300,-8));assert.equal((await pb()).z,0);passed.push('Front: Z strelkasi yashirin, magnit chuqurlikni o\'zgartirmaydi');

    assert.deepEqual(errors,[],'No page errors');
    console.log(JSON.stringify({status:'passed',checks:passed},null,2));
  }catch(e){console.error(e&&e.stack||e);console.error('ERRORS:',JSON.stringify(errors));console.error('PASSED:',JSON.stringify(passed,null,1));process.exitCode=1}
  finally{await browser.close();try{fs.rmSync(tmp,{recursive:true,force:true})}catch(e){}}
})();
