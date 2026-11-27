'use strict';
// Modeling: o'zaro o'yiq (kiygizish) — odam ishlagandek: OBJ import (yoysimon qovurg'a + ustunlar), nusxa (C) + Y −28 + Enter,
// erkin burish 10°, Object ▸ Kesishmalarni tekshirish, Object ▸ O'zaro o'yiq, qayta tekshirish, CNC, DXF, Ctrl+Z.
// Haqiqiy Chromium (web build). Ishga tushirish: node tests/modeling-xlap.cjs (RUGBY_CHROMIUM ixtiyoriy)
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-xlap-')),html=path.join(tmp,'rugby-web.html');
execFileSync('python3',[path.join(root,'scripts/build-web.py'),html]);
// sintetik «stul suyanchig'i»: yarim halqa qovurg'a (ichki R 330, tashqi R 400, Y=520 da) va 3 ta tik ustun (50×16) — metrda, Y yuqoriga
const O=[],v=(x,y,z)=>O.push('v '+[x,y,z].map(a=>(a/1000).toFixed(6)).join(' '));let base=0;
{const arc=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI;arc.push([400*Math.cos(a),-400*Math.sin(a)])}for(let i=40;i>=0;i--){const a=i/40*Math.PI;arc.push([330*Math.cos(a),-330*Math.sin(a)])}
  O.push('o Qovurga');for(const y of[512,528])for(const q of arc)v(q[0],y,q[1]);const n=arc.length;
  for(let i=0;i<n;i++)O.push(`f ${i+1} ${(i+1)%n+1} ${n+(i+1)%n+1} ${n+i+1}`);O.push('f '+arc.map((_,i)=>i+1).join(' '),'f '+arc.map((_,i)=>n+i+1).reverse().join(' '));base=2*n}
const post=(name,ang)=>{const c=[365*Math.cos(ang),-365*Math.sin(ang)],t=[-Math.sin(ang),-Math.cos(ang)],r=[Math.cos(ang),-Math.sin(ang)];   // radial 50 (r), qalinlik 16 (t)
  O.push('o '+name);const P=[];for(const s of[-8,8])for(const y of[0,700])for(const k of[-25,25])P.push([c[0]+t[0]*s+r[0]*k,y,c[1]+t[1]*s+r[1]*k]);P.forEach(p=>v(...p));
  for(const f of[[1,2,4,3],[5,7,8,6],[1,5,6,2],[3,4,8,7],[1,3,7,5],[2,6,8,4]])O.push('f '+f.map(i=>i+base).join(' '));base+=8};
post('Ustun chap',Math.PI*.25);post('Ustun orta',Math.PI*.5);post("Ustun o'ng",Math.PI*.75);
fs.writeFileSync(path.join(tmp,'suyanchiq.obj'),O.join('\n'));
const errors=[],passed=[];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RUGBY_CHROMIUM||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    const page=await (await browser.newContext({viewport:{width:1500,height:950}})).newPage();
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});page.on('dialog',d=>{errors.push('dialog: '+d.message());d.dismiss()});
    const ev=(f,a)=>page.evaluate(f,a),hint=()=>ev(()=>document.getElementById('p3hint').textContent);
    await page.goto('file://'+html);await page.waitForFunction(()=>typeof Panel3D!=='undefined');await ev(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>typeof Panel3D!=='undefined');
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());await ev(()=>Panel3D.load({T:16,uid:10,panels:[]}));
    // 1. File ▸ Import ▸ OBJ
    await page.locator('#mbFile .mbBtn').click();const [fc]=await Promise.all([page.waitForEvent('filechooser'),page.locator('#mbFile [data-act="obj-in"]').click()]);await fc.setFiles(path.join(tmp,'suyanchiq.obj'));
    await page.waitForFunction(()=>Panel3D._state().panels.length===4);assert.match(await hint(),/4 ta panel \(qalinlik: 16 mm ×4\)/);
    const ps0=await ev(()=>Panel3D._state().panels.map(p=>({id:p.id,n:p.n,rt:!!p.rt})));assert.equal(ps0.filter(p=>p.rt).length,2,'45° ustunlar — erkin burchak');
    const obj=async id=>{await page.locator('#p3wrap .p3ddb',{hasText:'Object'}).click();await page.locator('#'+id).click()};
    const cb=await page.locator('#p3wrap .p3view canvas').first().boundingBox(),cx=cb.x+cb.width/2,cy=cb.y+cb.height/2;
    // 2. Tekshirish → 3 juft; hammasini tanlab (A) O'zaro o'yiq → kesishma qolmaydi
    await obj('p3oClash');assert.match(await hint(),/Kesishma: 3 juft/);
    await ev(()=>Panel3D._setTool('select'));await page.mouse.move(cx,cy);await page.keyboard.press('a');assert.equal((await ev(()=>Panel3D._msel())).length,4);
    await obj('p3oXlap');assert.match(await hint(),/3 ta kesishma — 0 ta yarim-yarim, 3 ta to'liq o'tish; 1 ta panel o'yildi · kesishma qolmadi/);
    await obj('p3oClash');assert.match(await hint(),/Kesishma yo'q/);
    passed.push("Qovurg'a × 3 ustun (ikkitasi 45° qiya): tekshirish 3 juft, O'zaro o'yiq — qovurg'aga 3 o'yiq, keyin kesishma yo'q");
    // 3. Qovurg'adan nusxa (C) → Y −80 → Enter; erkin burish 10° (X o'qi)
    const rib=ps0.find(p=>p.n==='Qovurga').id;await page.locator('#p3pl .p3it',{hasText:'Qovurga'}).click();
    await page.mouse.move(cx,cy);await page.keyboard.press('c');await page.mouse.move(cx+30,cy-20,{steps:4});await page.keyboard.press('y');await page.keyboard.type('-80');await page.keyboard.press('Enter');
    const cp=await ev(()=>{const ps=Panel3D._state().panels,p=ps[ps.length-1];return{id:p.id,y:p.y,n:ps.length}});
    const y0=await ev(i=>Panel3D._state().panels.find(p=>p.id===i).y,rib);assert.equal(cp.n,5);assert.ok(Math.abs(cp.y-(y0-80))<1e-6,'nusxa aniq −80: '+cp.y);
    await ev(()=>document.getElementById('p3bFree').click());await ev(i=>{Panel3D._select([i]);Panel3D._setTool('rotate')},cp.id);
    assert.equal(await ev(()=>Panel3D._rotDrag(0,10,true)),10);assert.equal(await ev(i=>Panel3D._rtDeg(i),cp.id),10);
    passed.push("Nusxa (C) + Y −80 + Enter — aniq 80 mm pastda; erkin burish 10° (Ctrl — butun gradus)");
    // 4. Qiya qovurg'a ustunlarni kesadi → tekshirish → O'zaro o'yiq → yana tekshirish
    // nusxa o'yilgan qovurg'adan — qiyalikdan keyin ham bitta ustun eski o'yig'iga sig'ishi mumkin; qolganlari kesishadi
    await ev(()=>{Panel3D._setTool('select');Panel3D._select([])});await obj('p3oClash');const nk=+(/Kesishma: (\d+) juft/.exec(await hint())||[])[1];assert.ok(nk>=2,await hint());
    const sel=await ev(()=>Panel3D._msel());assert.ok(sel.includes(cp.id)&&sel.length===nk+1,'kesishgan panellar tanlandi '+sel);
    await obj('p3oXlap');assert.match(await hint(),/kesishma qolmadi/);await obj('p3oClash');assert.match(await hint(),/Kesishma yo'q/);
    const q=await ev(i=>{const p=Panel3D._state().panels.find(x=>x.id===i);return{n:p.pts.length,rt:Panel3D._rtDeg(i)}},cp.id);assert.equal(q.rt,10);
    passed.push(`10° qiya qovurg'a: ${nk} ta kesishma topildi, o'yiqlar (kontur ${q.n} nuqta, dogbone bilan), keyin kesishma yo'q`);
    // 5. Ctrl+Z — o'yiqlar qaytadi (kesishma yana bor); Ctrl+Y — qayta
    await page.mouse.move(cx,cy);await page.keyboard.press('Control+z');await ev(()=>Panel3D._select([]));await obj('p3oClash');assert.match(await hint(),new RegExp('Kesishma: '+nk+' juft'));
    await page.keyboard.press('Control+y');await ev(()=>Panel3D._select([]));await obj('p3oClash');assert.match(await hint(),/Kesishma yo'q/);
    passed.push(`Ctrl+Z — o'yiqlar bekor (${nk} juft kesishma), Ctrl+Y — qaytdi`);
    // 6. CNC va DXF: qiya qovurg'a konturi o'yiqlar bilan
    const dx=await ev(i=>{Panel3D._select([i]);return Panel3D._hw.dxf().text},cp.id);assert.match(dx,/CUT_Z16/);
    await ev(()=>Panel3D._select([]));await ev(()=>Panel3D._cnc());const cn=await ev(()=>drawnLines.filter(l=>l.p3).map(l=>({n:l.p3.n,k:l.points.length})));
    assert.equal(cn.length,5);assert.ok(cn.filter(c=>c.n==='Qovurga').every(c=>c.k>=90),JSON.stringify(cn));
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    passed.push("CNC: 5 detal listga joylandi, qovurg'alar o'yiqli kontur bilan; DXF — CUT_Z16");
    // 7. Yuqori Object menyusi: Modeling bo'limi — Furnitura (sozlamalar, Ship-paz zazor / freza Ø), O'zaro o'yiq, tekshirish
    await page.locator('#mbObject .mbBtn').click();assert.ok(await page.locator('#mbObject [data-act="p3:p3oHw"]').isVisible());await page.locator('#mbObject [data-act="p3:p3oHw"]').click();
    await page.waitForSelector('#p3hw:not([hidden])');assert.ok(await ev(()=>!!document.getElementById('p3hw_tab_cl')&&!!document.getElementById('p3hw_tab_d')),'Ship-paz: zazor va freza Ø maydonlari');
    // Furnitura oynasi — akkordeon: bitta bo'lim ochilsa qolganlari yopiladi
    const sums=page.locator('#p3hw details.p3hwd > summary');const nS=await sums.count();assert.ok(nS>=4);
    await sums.nth(0).click();await sums.nth(nS-1).click();await page.waitForTimeout(100);assert.equal(await ev(()=>document.querySelectorAll('#p3hw details.p3hwd[open]').length),1);
    await page.locator('#p3hw details.p3hwd > summary',{hasText:"O'zaro o'yiq"}).click();await page.waitForTimeout(100);assert.equal(await ev(()=>[...document.querySelectorAll('#p3hw details.p3hwd[open]')].map(d=>d.querySelector('summary').textContent).join()),"Ship-paz va O'zaro o'yiq (zazor, freza Ø)");
    assert.ok(await page.locator('#p3hw_tab_cl').isVisible(),'zazor maydoni ko\'rinadi');
    // chap panel: yo'riqnoma yashirin, Panel ustiga olib borilsa ko'rinadi; 2D chizma / DXF — Shablonlar ostida, Butun korpusdan yuqorida
    await page.keyboard.press('Escape');await ev(()=>document.getElementById('p3hw').hidden=true);
    assert.ok(await page.locator('#p3tplHelp').isHidden());await page.locator('#p3tpl .p3tile').first().hover();assert.ok(await page.locator('#p3tplHelp').isVisible());
    await page.mouse.move(cx,cy);await page.waitForTimeout(400);assert.ok(await page.locator('#p3tplHelp').isHidden());
    assert.ok(await ev(()=>{const h=[...document.querySelectorAll('#p3wrap .p3lib h4')].map(x=>x.textContent);return h.indexOf('2D chizma / DXF')===1&&h.indexOf('Butun korpus')>1}),'tartib');
    passed.push("Furnitura oynasi akkordeon (bitta bo'lim ochiq), «Ship-paz va O'zaro o'yiq» bo'limida zazor; yo'riqnoma faqat Panel ustida ko'rinadi; 2D chizma / DXF tepada");
    await page.keyboard.press('Escape');await page.locator('#mbDraw').click();await page.locator('#mbObject .mbBtn').click();assert.ok(await page.locator('#mbObject .mbP3').first().isHidden(),'Drawing\'da Modeling bo\'limi yashirin');await page.keyboard.press('Escape');
    passed.push("Yuqori Object menyusi: Modeling ochiq bo'lsa — Furnitura (Ship-paz zazor, freza Ø), Kesishmalarni tekshirish, O'zaro o'yiq; Drawing'da yashirin");
    assert.deepEqual(errors,[]);
  }finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}
  console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`modeling-xlap: ${passed.length} checks passed`);
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exit(1)});
