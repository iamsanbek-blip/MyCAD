'use strict';
// Modeling: panelga ulagich tanlash (aralash), Narx (smeta) paneli, CNC'ga yuborish (nesting, teshik detal bilan ko'chadi),
// panelni 2 marta bosib Drawing'da tahrirlash. Haqiqiy brauzer (Chromium), web build, haqiqiy sichqoncha.
// Ishga tushirish: node tests/modeling-cnc-price.cjs (RUGBY_CHROMIUM ixtiyoriy)
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rugby-cnc-')),html=path.join(tmp,'rugby-web.html');
execFileSync('python3',[path.join(root,'scripts/build-web.py'),html]);
const errors=[],passed=[];
const corpus=[
  {id:1,n:'A. chap boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0,mat:'LDSP oq',gr:'h',eb:[0,1,0,0]},{id:2,n:"A. o'ng boka",w:500,h:720,t:16,o:'side',x:592,y:360,z:0,mat:'LDSP oq',eb:[0,1,0,0]},
  {id:3,n:'A. dno',w:568,h:500,t:16,o:'flat',x:300,y:8,z:0,mat:'LDSP oq'},{id:4,n:'A. krisha',w:568,h:500,t:16,o:'flat',x:300,y:712,z:0,mat:'LDSP oq'},
  {id:5,n:'A. polka',w:568,h:480,t:16,o:'flat',x:300,y:480,z:-10,mat:'LDSP oq',eb:[1,0,0,0]},{id:7,n:'A. orqa devor',w:584,h:704,t:4,o:'front',x:300,y:360,z:-240,mat:'XDF'},
  {id:8,n:'A. fasad',w:596,h:716,t:16,o:'front',x:300,y:360,z:258,mat:'MDF',eb:[1,1,1,1]}];
const PRICES={mat:{'LDSP oq|16':450000,'XDF|4':120000,'MDF|16':900000},eb:{'1':3000},hw:{konf:500,ekss:2500,shkant:100,polka:300,petlya:15000,ruchka:25000},work:{cut:4000,edge:2500,drill:1000,groove:3000},extra:[{n:'Yetkazish',v:100000}],markup:10};
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.RUGBY_CHROMIUM||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  try{
    const page=await (await browser.newContext({viewport:{width:1500,height:900}})).newPage();
    page.on('pageerror',e=>errors.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
    page.on('dialog',d=>{errors.push('dialog: '+d.message());d.dismiss()});
    const ev=(f,a)=>page.evaluate(f,a);
    await page.goto('file://'+html);await page.waitForFunction(()=>typeof Panel3D!=='undefined');await ev(()=>localStorage.clear());await page.reload();
    await page.waitForFunction(()=>typeof Panel3D!=='undefined'&&typeof RugbyPrice!=='undefined');
    await ev(()=>{window.__saved=[];window.claude={use:async k=>k==='downloads'?{save:async({filename,data})=>{window.__saved.push({filename,text:typeof data==='string'?data:await data.text()})}}:null}});
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    await ev(ps=>{Panel3D.load({T:16,uid:100,panels:ps});Panel3D._select([]);Panel3D._view('iso');Panel3D._hw.place()},corpus);
    const types=id=>ev(id=>[...new Set(Panel3D._hw.ops(id).map(o=>o.t))].sort(),id);

    // 1. Panel xossalarida ulagich: krisha — «Ekssentrik + shkant» → korpus qayta furnituralanadi; bokada uch tur
    await page.locator('#p3pl .p3it').nth(3).click();await page.waitForSelector('#p3opCon');
    await page.selectOption('#p3opCon','ekss+shkant');
    assert.deepEqual(await types(1),['ekss','konf','paz','planka','polka','shkant']);assert.deepEqual(await types(3),['konf','paz']);
    assert.equal(await ev(()=>Panel3D._state().panels.find(p=>p.id===4).con),'ekss+shkant');
    await page.locator('#p3pl .p3it').nth(3).click();assert.equal(await page.locator('#p3opCon').inputValue(),'ekss+shkant');
    passed.push("Ulagich panelda: krisha — ekssentrik + shkant, dno — yevrovint; korpus o'zi qayta teshiladi (chap bokada konf, ekss, shkant)");

    // 1b. Avtomatik moslash: o'ng boka 100 mm o'ngga, krisha 100 mm kengaytirildi (xossalar maydonlari) — teshiklar o'zi qayta qo'yiladi
    const setF=async(i,k,v)=>{await page.locator('#p3pl .p3it').nth(i).click();await page.waitForSelector('#p3f_'+k);await page.fill('#p3f_'+k,String(v));await page.press('#p3f_'+k,'Enter')};
    await setF(1,'x',692);assert.equal((await ev(()=>Panel3D._hw.ops(2))).filter(o=>o.t==='konf'||o.t==='ekss'||o.t==='shkant').length,0,'boka ajraldi — ulanish teshiklari yo\'q');
    await setF(3,'w',668);await setF(3,'x',350);
    const K=await ev(()=>Panel3D._hw.ops(4)),R=await ev(()=>Panel3D._hw.ops(2));
    assert.deepEqual([...new Set(K.filter(o=>o.k==='e').map(o=>o.u))].sort((a,b)=>a-b),[0,668]);assert.ok(R.some(o=>o.t==='ekss'&&o.k==='d'&&o.v===712),'o\'ng bokada krisha shtoki qaytdi');
    assert.ok(!R.some(o=>o.t==='konf'),'dno o\'ng bokaga tegmaydi');
    await ev(()=>document.activeElement.blur());await page.keyboard.press('Control+z');assert.equal(await ev(()=>Panel3D._state().panels.find(p=>p.id===4).x),300);
    assert.ok((await ev(()=>Panel3D._hw.ops(4))).every(o=>o.k!=='e'||o.u===0||o.u===668));
    await ev(()=>document.activeElement.blur());await page.keyboard.press('Control+y');assert.equal(await ev(()=>Panel3D._state().panels.find(p=>p.id===4).x),350);await setF(1,'x',592);await setF(3,'w',568);await setF(3,'x',300);
    assert.deepEqual([...new Set((await ev(()=>Panel3D._hw.ops(4))).filter(o=>o.k==='e').map(o=>o.u))].sort((a,b)=>a-b),[0,568]);assert.deepEqual(await types(2),['ekss','konf','paz','polka','shkant']);
    passed.push("Avtomatik moslash: boka surilsa ulanish teshiklari yo'qoladi, krisha kengaytirilsa chet teshigi 668 ga ko'chadi va bokada qaytadi; Ctrl+Z bitta qadam; qaytarilganda avvalgi holat");

    // 2. Narx paneli: 3D oyna chetidagi tugma, jami = hisob; narx o'zgarsa jami yangilanadi; detal narxi xossalarda; CSV
    await ev(P=>Panel3D._price(P),PRICES);
    await page.locator('#p3prTab').click();await page.waitForSelector('#p3pr:not([hidden])');
    const money=v=>Math.round(v).toLocaleString('ru-RU').replace(/ /g,' ');
    let r=await ev(()=>Panel3D._price());
    assert.match(await page.locator('.p3prSum b').textContent(),new RegExp(money(r.total)+" so'm"));assert.match(await page.locator('#p3prTab').textContent(),new RegExp(money(r.total)));
    const per=r.perPanel.reduce((a,x)=>a+x.sum,0);assert.ok(Math.abs(per-(r.matT+r.ebT+r.hwT+r.workT))<1e-6);
    assert.deepEqual(r.hw.map(h=>h.k),['konf','ekss','shkant','polka','petlya','ruchka']);
    const t0=r.total,inp=page.locator('input.p3prI[data-k="mat.LDSP oq|16"]');await inp.fill('550000');await inp.press('Enter');
    r=await ev(()=>Panel3D._price());assert.ok(Math.abs(r.total-t0-100000*r.groups.find(g=>g.key==='LDSP oq|16').sheets*1.1)<1e-6,'jami +100 000 × list × 1.1');
    assert.equal(await ev(()=>JSON.parse(localStorage.getItem('rugby.price.v1')).mat['LDSP oq|16']),550000);
    await page.locator('#p3pr tr[data-id="8"]').click();assert.match(await page.locator('.p3prLine').textContent(),/Narx: [\d ]+ so'm/);
    await page.locator('#p3prCsv').click();await page.waitForFunction(()=>window.__saved.length>=1);
    const csv=await ev(()=>window.__saved[0]);assert.equal(csv.filename,'rugby-smeta.csv');assert.match(csv.text,new RegExp("JAMI \\(so'm\\);;;;;;;"+Math.round(r.total)));
    await page.locator('#p3prX').click();
    passed.push(`Narx: jami ${money(t0)} so'm = material + kromka + furnitura + ishlar + qo'shimcha + 10%; LDSP narxi o'zgarganda jami darhol yangilanadi; detal narxi xossalarda; smeta CSV`);

    // 3. CNC'ga yuborish: har material — sahifa, har detal — guruh; detallar listda; teksturali detal burilmagan
    await ev(()=>Panel3D._select([]));await page.keyboard.press('Alt+f');await page.waitForSelector('#p3hw:not([hidden])');await page.locator('#p3hwNest').click();
    await page.waitForFunction(()=>!Panel3D.isOpen()&&document.getElementById('mbCnc').classList.contains('active'));
    const st=await ev(()=>({pages:documentPages.map(p=>p.name),active:activePage().name,sheets:nestSheets.map(s=>[s.x0,s.y0,s.x1,s.y1]),
      parts:[...new Set(drawnLines.map(l=>l.group))].map(g=>{const sh=drawnLines.filter(l=>l.group===g),c=sh.find(l=>l.p3),b=shapeBBox(c);
        return{n:c.p3.n,nr:!!c.nr,b:[b.x0,b.y0,b.x1,b.y1],holes:sh.filter(l=>l.p3op).map(l=>{const h=shapeBBox(l);return[h.x0,h.y0,h.x1,h.y1]}),layers:[...new Set(sh.map(l=>l.layer))]}})}));
    assert.deepEqual(st.pages,['Sahifa 1','CNC · LDSP oq 16 mm','CNC · MDF 16 mm','CNC · XDF 4 mm']);assert.equal(st.active,'CNC · LDSP oq 16 mm');assert.equal(st.parts.length,5);
    for(const p of st.parts){assert.ok(st.sheets.some(s=>p.b[0]>=s[0]-.01&&p.b[1]>=s[1]-.01&&p.b[2]<=s[2]+.01&&p.b[3]<=s[3]+.01),p.n+' listda');
      for(const h of p.holes)assert.ok(h[0]>=p.b[0]-.01&&h[1]>=p.b[1]-.01&&h[2]<=p.b[2]+.01&&h[3]<=p.b[3]+.01,p.n+': teshik detal ichida')}
    const L=st.parts.find(p=>p.n==='A. chap boka');assert.ok(L.nr);assert.deepEqual([Math.round(L.b[2]-L.b[0]),Math.round(L.b[3]-L.b[1])],[720,500]);
    assert.ok(L.layers.includes('CUT_Z16')&&L.layers.includes('DRILL_D5_Z10'));
    passed.push(`CNC'ga yuborish: 3 sahifa (LDSP, MDF, XDF), 5 detal ${st.sheets.length} listda, teshiklar detal ichida, teksturali chap boka 720×500 va burilmagan`);

    // 4. Haqiqiy sichqoncha: detal konturini bosish — butun guruh tanlanadi; Move (M) bilan boshqa joyga — teshiklar birga ko'chadi
    const scr=(x,y)=>ev(([x,y])=>{const s=toScreen({x,y}),r=canvas.getBoundingClientRect();return{x:r.left+s.x,y:r.top+s.y}},[x,y]);
    const midL=await scr(L.b[0]+(L.b[2]-L.b[0])/2,L.b[1]);await page.mouse.click(midL.x,midL.y);
    const sel=await ev(()=>{const s=drawnLines.filter(l=>l.selected);return{n:s.length,g:new Set(s.map(l=>l.group)).size,name:(s.find(l=>l.p3)||{}).p3?.n}});
    assert.equal(sel.g,1);assert.equal(sel.name,'A. chap boka');assert.equal(sel.n,1+L.holes.length);
    const rel=()=>ev(()=>{const s=drawnLines.filter(l=>l.selected),c=shapeBBox(s.find(l=>l.p3));return{c:[c.x0,c.y0],h:s.filter(l=>l.p3op).map(l=>{const b=shapeBBox(l);return[+(b.x0-c.x0).toFixed(3),+(b.y0-c.y0).toFixed(3)]})}});
    const before=await rel();await page.keyboard.press('m');const a=await scr(L.b[0],L.b[1]);await page.mouse.click(a.x,a.y);
    const sw=st.sheets[st.sheets.length-1],dst=await scr(sw[2]+400,L.b[1]);await page.mouse.click(dst.x,dst.y);
    const after=await rel();assert.ok(after.c[0]>sw[2],'boshqa joyga ko\'chdi: '+JSON.stringify([before.c,after.c]));assert.deepEqual(after.h,before.h);
    passed.push(`Detal Move bilan boshqa joyga (${Math.round(after.c[0]-before.c[0])} mm) — ${after.h.length} ta teshik detalga nisbatan aynan joyida`);
    await page.locator('#nestRunBtn').click();
    const re=await ev(()=>[...new Set(drawnLines.map(l=>l.group))].every(g=>{const sh=drawnLines.filter(l=>l.group===g),c=shapeBBox(sh.find(l=>l.p3));return sh.filter(l=>l.p3op).every(l=>{const b=shapeBBox(l);return b.x0>=c.x0-.01&&b.x1<=c.x1+.01&&b.y0>=c.y0-.01&&b.y1<=c.y1+.01})}));
    assert.ok(re);passed.push("Cnc ▸ Joylash qayta bosilganda ham teshiklar o'z detali ichida");

    // 5. CNC sahifasida turib Modeling bosilsa — model sahifasi (Sahifa 1) o'zi ochiladi, 7 panel; CNC DXF qatlamlari
    const dx=await ev(()=>{const t=buildDXF();return[...new Set([...t.matchAll(/\n0\nCIRCLE\n8\n([^\n]+)\n/g)].map(m=>m[1]))].sort()});
    assert.ok(dx.includes('DRILL_D5_Z10')&&dx.includes('DRILL_D7_THRU')&&dx.includes('DRILL_D15_Z13'),'Drawing DXF: '+dx.join(','));
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    assert.equal(await ev(()=>activePage().name),'Sahifa 1');assert.equal(await ev(()=>Panel3D._state().panels.length),7);
    await page.locator('#mbCnc').click();await page.locator('.pageTab').nth(2).click();assert.equal(await ev(()=>activePage().name),'CNC · MDF 16 mm');await page.locator('#mbCut').click();await page.waitForFunction(()=>Panel3D.isOpen());assert.equal(await ev(()=>activePage().name),'Sahifa 1');
    await page.locator('#mbModel').click();await page.waitForFunction(()=>Panel3D.isOpen());
    passed.push("CNC sahifasida Modeling/Cutlist bosilsa model sahifasi (Sahifa 1) o'zi ochiladi — 7 panel; CNC sahifasi DXF'ida teshik qatlamlari (DRILL_D5_Z10, DRILL_D7_THRU, DRILL_D15_Z13)");

    // 6. Fasadni 2 marta bosish → Drawing'da vaqtinchalik sahifa; kontur va teshik o'zgartirib «Modeling'ga qaytarish»
    await ev(()=>{Panel3D._view('front');Panel3D._select([])});await page.waitForTimeout(150);
    const fc=await ev(()=>Panel3D._scr(300,360,266.5));await page.mouse.dblclick(fc.x,fc.y);
    await page.waitForFunction(()=>Panel3D._editing()&&document.getElementById('mbDraw').classList.contains('active'));
    const ed=await ev(()=>({page:activePage().name,c:drawnLines.filter(l=>l.kind==='circle').length,ops:0,bar:document.getElementById('p3editBar').textContent}));
    assert.equal(ed.page,'✎ A. fasad');assert.match(ed.bar,/A\. fasad/);
    const fOps=await ev(()=>{const s=documentPages[0].panel3d.panels.find(p=>p.id===8);return(s.ops||[]).filter(o=>o.k==='d').length});assert.equal(ed.c,fOps);
    await ev(()=>{const c=drawnLines.find(l=>l.kind==='line');const pts=[{x:0,y:0},{x:596,y:0},{x:596,y:616},{x:496,y:716},{x:0,y:716}];c.points=pts;c.grips=pts.map(o=>({...o}));
      const ce={x:298,y:60};drawnLines.push({kind:'circle',center:ce,radius:4,closed:true,selected:false,layer:'DRILL_D8_Z12',points:genCirclePts(ce,4),grips:[]})});
    await page.locator('#p3edOk').click();await page.waitForFunction(()=>Panel3D.isOpen());
    const F=await ev(()=>{const p=Panel3D._state().panels.find(p=>p.id===8);return{pts:p.pts,w:p.w,h:p.h,x:p.x,y:p.y,z:p.z,eb:p.eb||null,man:(p.ops||[]).filter(o=>o.t==='man'),n:(p.ops||[]).filter(o=>o.k==='d').length,pages:documentPages.map(x=>x.name)}});
    assert.deepEqual(F.pts,[[0,0],[596,0],[596,616],[496,716],[0,716]]);assert.deepEqual([F.w,F.h,F.x,F.y,F.z],[596,716,300,360,258]);
    assert.deepEqual(F.man,[{k:'d',f:'A',u:298,v:60,d:8,z:12,t:'man'}]);assert.equal(F.n,fOps+1);assert.equal(F.eb,null,'kromka qirralar soni o\'zgardi');
    assert.deepEqual(F.pages,['Sahifa 1','CNC · LDSP oq 16 mm','CNC · MDF 16 mm','CNC · XDF 4 mm']);
    await page.keyboard.press('Control+z');assert.equal(await ev(()=>Panel3D._state().panels.find(p=>p.id===8).pts),undefined);
    passed.push("Fasad 2 marta bosildi → «✎ A. fasad» Drawing sahifasi; kesilgan burchak va Ø8×12 teshik «Modeling'ga qaytarish» bilan panelga o'tdi, joyi o'zgarmadi, vaqtinchalik sahifa o'chdi; Ctrl+Z qaytaradi");
    await ev(()=>Panel3D._select([]));await page.mouse.dblclick(fc.x,fc.y);await page.waitForFunction(()=>Panel3D._editing());
    await ev(()=>{drawnLines.length=0});await page.locator('#p3edNo').click();await page.waitForFunction(()=>Panel3D.isOpen());
    assert.equal(await ev(()=>Panel3D._state().panels.find(p=>p.id===8).pts),undefined);assert.equal(await ev(()=>documentPages.length),4);
    passed.push("Bekor qilish: panel o'zgarmaydi, vaqtinchalik sahifa o'chadi");
    assert.deepEqual(errors,[]);
  }finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}
  console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`modeling-cnc-price: ${passed.length} checks passed`);
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exit(1)});
