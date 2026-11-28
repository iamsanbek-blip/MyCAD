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

    // Qotmaslik: tanlangan krishani qo'shni boka burchagi bilan ustma-ust turgan o'z burchagidan ushlab 10 px sursa — ergashadi
    {await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0},{id:2,n:'krisha',w:568,h:500,t:16,o:'flat',x:300,y:728,z:0},{id:3,n:"boka o'ng",w:500,h:720,t:16,o:'side',x:592,y:360,z:0}]});
        Panel3D._select([2]);Panel3D._setTool('move');Panel3D._view('front')});
      if(await ev(()=>document.getElementById('p3bOrtho').classList.contains('on')))await ev(()=>document.getElementById('p3bFree').click());
      await page.waitForTimeout(80);const c=await scr(16,720,250);   // krisha chap-past-old burchagi = boka yuqori-o'ng-old burchagi
      await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(c.x+5,c.y-4,{steps:2});await page.mouse.move(c.x+10,c.y-8,{steps:2});
      const mid=await pb();await page.mouse.move(c.x+25,c.y-20,{steps:3});const mid2=await pb();await page.keyboard.press('Escape');await page.mouse.up();
      assert.ok(mid.x!==300||mid.y!==728,'10 px da ergashdi (qotmadi): '+JSON.stringify(mid));assert.ok(mid2.x>mid.x,'davom etdi '+JSON.stringify([mid,mid2]));
      passed.push("Move: o'z burchagidan (qo'shni panel burchagi bilan ustma-ust) ushlangan krisha 10 px da ergashadi — joyiga «yopishib» qolmaydi")}
    // Tanlov ustun: tanlangan katta panel chetini bosish — yonidagi ingichka panel tanlanmaydi, tanlangan suriladi
    {await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'polka',w:568,h:480,t:16,o:'flat',x:300,y:400,z:0},{id:2,n:'yupqa',w:500,h:720,t:16,o:'side',x:592,y:360,z:0}]});
        Panel3D._select([1]);Panel3D._setTool('move');Panel3D._view('top')});await page.waitForTimeout(80);
      const e=await scr(580,408,0);await page.mouse.move(e.x,e.y);await page.mouse.down();await page.mouse.move(e.x-30,e.y,{steps:4});await page.mouse.up();
      const r=await ev(()=>({sel:Panel3D._msel(),x:Panel3D._state().panels.map(p=>Math.round(p.x))}));assert.deepEqual(r.sel,[1]);assert.ok(r.x[0]<300&&r.x[1]===592,JSON.stringify(r));
      passed.push("Move: tanlangan polka chetida (yonida ingichka boka) bosildi — tanlov o'zgarmadi, polka surildi, boka joyida")}
    // Strelka uchlari sichqoncha ostida yonadi (Top va Iso)
    for(const v of['top','iso']){await ev(v=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'A',w:400,h:300,t:16,o:'front',x:0,y:150,z:0}]});Panel3D._select([1]);Panel3D._setTool('move');Panel3D._view(v)},v);await page.waitForTimeout(80);
      const g=await ev(()=>Panel3D._gz());for(const k of['a0','a1','a2']){if(!g['v'+k[1]])continue;await page.mouse.move(g.c.x,g.c.y+200);await page.mouse.move(g[k].x,g[k].y,{steps:3});
        assert.equal(await ev(()=>document.querySelector('#p3wrap .p3view canvas').style.cursor),'pointer',v+' '+k+' uchi yonmadi')}}
    passed.push("Move strelkalari uchida (Top va Iso) dasta yonadi — kursor «pointer»");
    const pa=()=>ev(()=>{const p=Panel3D._state().panels.find(x=>x.id===1);return{x:p.x,y:p.y,z:p.z}});
    // Qulflangan yo'nalish: X strelkasini bir marta bosish — keyin panelni (uchidan) qiyshiq sudrash faqat X bo'yicha; zoom sudrash paytida siljishni buzmaydi
    {await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'A',w:400,h:300,t:16,o:'front',x:0,y:150,z:0},{id:2,n:'B',w:300,h:200,t:16,o:'front',x:600,y:100,z:0}]});Panel3D._select([1]);Panel3D._setTool('move');Panel3D._view('front')});
      if(await ev(()=>document.getElementById('p3bOrtho').classList.contains('on')))await ev(()=>document.getElementById('p3bFree').click());
      await page.waitForTimeout(80);let g=await ev(()=>Panel3D._gz());await page.mouse.move(g.a0.x,g.a0.y);await page.mouse.down();await page.mouse.up();
      assert.deepEqual(await ev(()=>Panel3D._lock()),{ax:0,n:-1},'X qulflandi');
      const c=await scr(-200,300,8);await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(c.x+40,c.y+35,{steps:4});await page.mouse.move(c.x+80,c.y+70,{steps:4});
      const m1=await pa();assert.ok(m1.x>0&&m1.y===150&&m1.z===0,'faqat X: '+JSON.stringify(m1));
      await page.mouse.wheel(0,-300);await page.waitForTimeout(60);const m2=await pa();assert.ok(Math.abs(m2.x-m1.x)<.01&&m2.y===150,'zoom siljishni saqlaydi '+JSON.stringify([m1,m2]));
      await page.mouse.move(c.x+100,c.y+90,{steps:3});const m3=await pa();assert.ok(m3.x>m2.x&&m3.y===150,'zoomdan keyin X bo\'yicha davom '+JSON.stringify([m2,m3]));await page.mouse.up();
      g=await ev(()=>Panel3D._gz());await page.mouse.move(g.c.x,g.c.y);await page.mouse.down();await page.mouse.up();assert.equal(await ev(()=>Panel3D._lock()),null,'oq markaz — qulf olindi');
      passed.push("Qulf: X strelkasi bir marta bosildi — panel uchidan qiyshiq sudralsa ham faqat X bo'yicha; sudrash paytida zoom siljishni saqlaydi; oq markaz — erkin")}
    // Magnit turlari Free rejimda: uch, o'rta, markaz — tanlangan nuqta aniq nishonga tushadi
    for(const[k,tgt,exp]of[['end',[750,200,8],[750,200]],['mid',[600,200,8],[600,200]],['cen',[600,100,8],[600,100]]]){
      await ev(k=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'A',w:400,h:300,t:16,o:'front',x:0,y:150,z:0},{id:2,n:'B',w:300,h:200,t:16,o:'front',x:600,y:100,z:0}]});Panel3D._select([1]);Panel3D._setTool('move');Panel3D._view('front');Panel3D._setLock(null);
        for(const b of document.querySelectorAll('[data-snap]')){const on=b.classList.contains('chk'),want=b.dataset.snap===k||b.dataset.snap==='end';if(on!==want)b.click()}},k);await page.waitForTimeout(60);
      const a=await scr(200,300,8),b=await scr(...tgt);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move((a.x+b.x)/2,(a.y+b.y)/2,{steps:3});await page.mouse.move(b.x+3,b.y-2,{steps:5});
      const h=await ev(()=>Panel3D._act());await page.mouse.up();const r=await pa();
      assert.deepEqual([r.x+200,r.y+150],exp,k+' magnit: '+JSON.stringify([r,h]));assert.equal(h.hit,k)}
    await ev(()=>{for(const b of document.querySelectorAll('[data-snap]')){const on=b.classList.contains('chk'),want=b.dataset.snap==='end'||b.dataset.snap==='mid';if(on!==want)b.click()}});
    passed.push("Magnit (Free): A ning yuqori-o'ng uchi B ning uchi / qirra o'rtasi / markaziga aynan tushadi (uch, o'rta, markaz)");
    // Barqarorlik: sudrash paytida oyna fokusni yo'qotsa (Alt+Tab) — bekor; tugma oyna tashqarisida qo'yilsa — keyingi harakatda yakunlanadi; keyingi bosish ishlaydi
    {await reset('front');await ev(()=>Panel3D._select([2]));const c=await scr(600,100,8);
      await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(c.x+60,c.y,{steps:4});assert.equal((await ev(()=>Panel3D._act())).k,'xf');
      await ev(()=>window.dispatchEvent(new Event('blur')));assert.equal(await ev(()=>Panel3D._act()),null,'blur — amal tozalandi');let b=await pb();assert.equal(b.x,600,'blur — joyiga qaytdi');await page.mouse.up();
      const e0=await ev(()=>{const r=document.querySelector('#p3wrap .p3view canvas').getBoundingClientRect();return{x:r.left+r.width*.5,y:r.top+30}});await page.mouse.move(e0.x,e0.y);await page.mouse.down();await page.mouse.move(e0.x+30,e0.y+20,{steps:3});assert.equal((await ev(()=>Panel3D._act())).k,'rect');
      await ev(()=>{const cv=document.querySelector('#p3wrap .p3view canvas');cv.dispatchEvent(new PointerEvent('pointermove',{clientX:10,clientY:10,buttons:0,pointerType:'mouse',bubbles:true}))});
      assert.equal(await ev(()=>Panel3D._act()),null,'tugmasiz harakat — ramka yakunlandi');await page.mouse.up();
      await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(c.x+50,c.y,{steps:4});await page.mouse.up();b=await pb();assert.ok(b.x>600,'keyingi sudrash ishlaydi '+JSON.stringify(b));
      passed.push("Barqarorlik: Alt+Tab (blur) sudrashni bekor qiladi, oyna tashqarisida qo'yilgan tugma ramkani yakunlaydi — keyingi sudrash darhol ishlaydi")}
    // Video holati: Top ko'rinish, kuchli zoom — baland (987 mm) panel ustki uchidan ushlab surish har masshtabda ishlaydi
    {const tall=[{id:1,n:'oyoq',w:50,h:987,t:16,o:'side',x:0,y:493.5,z:0},{id:2,n:'oyoq2',w:50,h:987,t:16,o:'side',x:300,y:493.5,z:0}];
      const pt=()=>ev(()=>{const p=Panel3D._state().panels.find(x=>x.id===1);return{x:p.x,y:p.y,z:p.z}});
      for(const clicks of[0,3,6,9]){await ev(t=>{Panel3D.load({T:16,uid:10,panels:t});Panel3D._select([1]);Panel3D._setTool('move');Panel3D._view('top')},tall);
        if(await ev(()=>document.getElementById('p3bOrtho').classList.contains('on')))await ev(()=>document.getElementById('p3bFree').click());
        await page.waitForTimeout(60);let c=await scr(22,987,36);await page.mouse.move(c.x,c.y);for(let i=0;i<clicks;i++){await page.mouse.wheel(0,-400);await page.waitForTimeout(20)}   // bo'sh joyda zoom (videodagidek) — kamera nishoni pastda qoladi
        c=await scr(8,987,25);const R=await ev(()=>Panel3D._cam().R);
        {const rr=await ev(()=>{const r=document.querySelector('#p3wrap .p3view canvas').getBoundingClientRect();return{l:r.left,t:r.top,r:r.right,b:r.bottom}});assert.ok(c.x>rr.l+5&&c.x<rr.r-60&&c.y>rr.t+5&&c.y<rr.b-50,'nuqta ekranda R='+R)}await page.mouse.move(c.x,c.y);await page.mouse.down();await page.mouse.move(c.x+12,c.y+9,{steps:3});await page.mouse.move(c.x+40,c.y+30,{steps:4});
        const m=await pt();await page.mouse.up();assert.ok(Math.hypot(m.x,m.z)>1&&m.y===493.5,'zoom R='+R+': surilmadi '+JSON.stringify(m))}
      passed.push("Top ko'rinish, 4 xil zoom (yaqin ham): 987 mm baland panel ustki uchidan ushlanib suriladi (oldin yaqinlashganda ΔX 0 bo'lib qolardi)")}
    // Yoysimon panelning bo'sh ichki qismini bosish — panel tanlanmaydi; yoyning o'zini bosish — tanlanadi
    {const pts=[];for(let i=0;i<=24;i++){const a=(20+i*140/24)*Math.PI/180;pts.push([500+500*Math.cos(a),500*Math.sin(a)])}for(let i=24;i>=0;i--){const a=(20+i*140/24)*Math.PI/180;pts.push([500+450*Math.cos(a),450*Math.sin(a)])}
      const y0=Math.min(...pts.map(q=>q[1]));for(const q of pts)q[1]-=y0;const bh=Math.max(...pts.map(q=>q[1]));
      await ev(([pts,bh])=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'yoy',w:1000,h:bh,bw:1000,bh,t:16,o:'flat',x:0,y:700,z:0,shape:'poly',pts}]});Panel3D._select([]);Panel3D._setTool('move');Panel3D._view('top')},[pts,bh]);
      await page.waitForTimeout(60);
      for(const dz of[-100,-40,40,100]){const c=await scr(0,708,dz);await page.mouse.click(c.x,c.y);}   // markazda yoy tasmasi v∈[279,329]; bu nuqtalar v=65…265 — bo'sh
      const s1=await ev(()=>Panel3D._msel());assert.deepEqual(s1,[],'bo\'sh ichki qism tanlandi: '+JSON.stringify(s1));
      {const v=(bh/2)-((279+329)/2);let c=await scr(0,708,v);await page.mouse.click(c.x,c.y);let s2=await ev(()=>Panel3D._msel());
        if(!s2.length){c=await scr(0,708,-v);await page.mouse.click(c.x,c.y);s2=await ev(()=>Panel3D._msel())}assert.deepEqual(s2,[1],'yoyning o\'zi tanlanadi')}
      passed.push("Yoysimon panel: ichki bo'sh joyni bosish (4 nuqta) hech narsani tanlamaydi, yoy tasmasini bosish — tanlaydi")}
    // Maydon qotmasin: C (nusxa) kursorga ergashib turganda Eni maydoniga bosib raqam yozish — yoziladi, nusxa joyiga qo'yiladi
    {await reset('front');await ev(()=>Panel3D._select([2]));const c=await scr(600,100,8);await page.mouse.move(c.x,c.y);await page.keyboard.press('c');
      await page.mouse.move(c.x+40,c.y,{steps:3});assert.equal((await ev(()=>Panel3D._act())||{}).k,'xf','nusxa rejimi');
      await page.click('#p3f_w');await page.keyboard.press('Control+a');await page.keyboard.type('450');
      const v=await ev(()=>document.getElementById('p3f_w').value);assert.equal(v,'450','maydonga yozildi');assert.equal(await ev(()=>Panel3D._act()),null,'amal yakunlandi');
      await page.keyboard.press('Tab');await page.waitForTimeout(40);
      const n=await ev(()=>Panel3D._state().panels);assert.equal(n.length,3,'nusxa qo\'yildi');assert.equal(n[2].w,450,'Eni 450 qo\'llandi');
      passed.push("Maydon qotmaydi: C nusxa rejimida Eni maydoniga bosib «450» yozildi (raqamlar ko'chirishga yutilmadi), nusxa joyiga qo'yildi")}
    assert.deepEqual(errors,[],'No page errors');
    console.log(JSON.stringify({status:'passed',checks:passed},null,2));
  }catch(e){console.error(e&&e.stack||e);console.error('ERRORS:',JSON.stringify(errors));console.error('PASSED:',JSON.stringify(passed,null,1));process.exitCode=1}
  finally{await browser.close();try{fs.rmSync(tmp,{recursive:true,force:true})}catch(e){}}
})();
