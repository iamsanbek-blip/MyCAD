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

    // 1c. Furnitura asbobi (J) — Kromka kabi: ulanish chizig'ini bosish; yana bosish — umumiy; Shift bilan bir nechtasi + tur tugmasi
    await ev(()=>Panel3D._view('iso'));await page.locator('#p3wrap .p3view canvas').first().click({position:{x:8,y:8}});await page.keyboard.press('j');
    await page.waitForSelector('#p3jb:not([hidden])');const jc=k=>ev(k=>Panel3D._joints().find(l=>l.key===k),k);
    assert.equal((await jc('3>1')).cur,'konf');await page.locator('#p3jb [data-jt="shkant"]').click();
    let sp=await ev(()=>Panel3D._jointScr('3>1'));await page.mouse.move(sp.x,sp.y);await page.mouse.click(sp.x,sp.y);
    assert.deepEqual([(await jc('3>1')).cur,(await jc('3>1')).own],['shkant',true]);assert.ok((await ev(()=>Panel3D._hw.ops(3))).filter(o=>o.k==='e'&&o.u===0).every(o=>o.t==='shkant'));
    assert.ok((await ev(()=>Panel3D._hw.ops(3))).some(o=>o.k==='e'&&o.u===568&&o.t==='konf'),'dno o\'ng tomoni o\'zgarmadi');
    await page.mouse.click(sp.x,sp.y);assert.deepEqual([(await jc('3>1')).cur,(await jc('3>1')).own],['konf',false]);
    for(const k of['5>1','5>2']){sp=await ev(k=>Panel3D._jointScr(k),k);await page.mouse.move(sp.x,sp.y);await page.keyboard.down('Shift');await page.mouse.click(sp.x,sp.y);await page.keyboard.up('Shift')}
    assert.equal((await jc('5>1')).cur,'polka');await page.locator('#p3jb [data-jt="konf"]').click();
    assert.deepEqual([(await jc('5>1')).cur,(await jc('5>2')).cur],['konf','konf']);assert.ok(!(await ev(()=>Panel3D._hw.ops(1))).some(o=>o.t==='polka'));
    assert.equal((await ev(()=>Panel3D._hw.ops(5))).filter(o=>o.k==='e'&&o.t==='konf').length,4);
    await ev(()=>document.activeElement&&document.activeElement.blur());await page.keyboard.press('Control+z');assert.equal((await jc('5>1')).cur,'polka');
    // ekssentrik o'yig'ini ikkinchi yuzaga: krisha–chap boka (umumiy tur «ekss+shkant» krishada) → ⇅
    const camY=()=>ev(()=>Panel3D._hw.ops(4).filter(o=>o.t==='ekss'&&o.d===15&&o.u<100).map(o=>o.f));assert.deepEqual([...new Set(await camY())],['B']);
    await page.locator('#p3jb [data-jt="flip"]').click();sp=await ev(()=>Panel3D._jointScr('4>1'));await page.mouse.move(sp.x,sp.y);await page.mouse.click(sp.x,sp.y);
    assert.deepEqual([...new Set(await camY())],['A']);assert.equal((await jc('4>1')).flip,true);await page.mouse.click(sp.x,sp.y);assert.deepEqual([...new Set(await camY())],['B']);
    // ship-paz (metallsiz) — dno–chap boka ulanishiga: dno qirrasida tishlar, bokada kesik/teshik; yana bosish — umumiy
    await page.locator('#p3jb [data-jt="tab"]').click();sp=await ev(()=>Panel3D._jointScr('3>1'));await page.mouse.move(sp.x,sp.y);await page.mouse.click(sp.x,sp.y);
    assert.equal((await jc('3>1')).cur,'tab');assert.ok((await ev(()=>Panel3D._hw.ops(3))).filter(o=>o.k==='t').length>=2);assert.ok((await ev(()=>Panel3D._hw.ops(1))).some(o=>o.k==='s'));
    assert.ok(!(await ev(()=>Panel3D._hw.ops(3))).some(o=>o.k==='e'&&o.u===0),'dno chap qirrasida yevrovint yo\'q');
    await page.mouse.click(sp.x,sp.y);assert.equal((await jc('3>1')).cur,'konf');assert.ok(!(await ev(()=>Panel3D._hw.ops(1))).some(o=>o.k==='s'));
    await page.keyboard.press('Escape');await page.keyboard.press('v');assert.ok(await page.locator('#p3jb').isHidden());
    passed.push("Furnitura asbobi (J): dno–chap boka ulanishiga shkant (o'ng tomoni yevrovint qoldi), yana bosish — umumiy; Shift bilan 2 polka ulanishi → yevrovint (polkaderjatel o'rniga), Ctrl+Z; ⇅ — ekssentrik o'yig'i krishaning ikkinchi yuzasiga va qaytadi; Ship-paz — dno tishlari, bokada kesik, yana bosish — umumiy");

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

    // 3b. Detal raqami/nomi: xaritada, DXF LABEL qatlamida; «🏷 Birkalar» — A4 stiker varaq, faqat tanlanganlar, HTML fayl, chop etish
    const lb=await ev(()=>{const t=buildDXF();return{layer:t.includes('0\nLAYER\n2\nLABEL\n'),texts:[...t.matchAll(/\nTEXT\n8\nLABEL\n[\s\S]*?\n1\n([^\n]+)\n/g)].map(m=>m[1]),list:partList().map(p=>[p.no,p.n,p.sheet])}});
    assert.ok(lb.layer);assert.equal(lb.texts.length,10);assert.deepEqual(lb.list.map(x=>x[0]),[1,2,3,4,5]);assert.ok(lb.list.every(x=>x[2]===1));
    assert.ok(lb.texts.includes('#1 A. chap boka'));
    await page.locator('#nestLabelsBtn').click();await page.waitForSelector('#plDlg');
    assert.equal(await page.locator('#plPrev .plCell .plNo').count(),5);assert.match(await page.locator('#plInfo').textContent(),/5 ta birka · 1 varaq A4 \(70×37 mm\)/);
    assert.match(await page.locator('#plPrev .plCell').first().textContent(),/#1\s*A\. chap boka\s*720 × 500 × 16 LDSP oq\s*Kromka: 1 mm — 1 tomon · teshik \d+/);
    await page.selectOption('#plLay','40');await page.fill('#plOrder','Oshxona-12');await page.fill('#plSkip','3');
    assert.match(await page.locator('#plInfo').textContent(),/5 ta birka · 1 varaq A4 \(52\.5×29\.7 mm\)/);assert.equal(await page.locator('#plPrev .plCell.empty').count(),3);
    await ev(()=>{window.__printed=null;window.print=()=>{window.__printed=document.getElementById('plPrintHost').querySelectorAll('.plCell .plNo').length}});
    await page.locator('#plPrint').click();assert.equal(await ev(()=>window.__printed),5);
    const nSaved=await ev(()=>window.__saved.length);await page.locator('#plSave').click();await page.waitForFunction(n=>window.__saved.length>n,nSaved);
    const hf=await ev(()=>window.__saved[window.__saved.length-1]);assert.equal(hf.filename,'birkalar-Oshxona-12.html');assert.match(hf.text,/@page\{size:A4;margin:0\}/);assert.match(hf.text,/Oshxona-12 · List 1\/1/);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#plDlg').count(),0);
    assert.equal(await ev(()=>JSON.parse(localStorage.getItem('rugby.labels.v1')).lay),'40');
    passed.push("Detal birkasi: xaritada «#1 A. chap boka / 720×500 · L1», DXF LABEL qatlamida 10 ta yozuv; 🏷 Birkalar — 5 ta (70×37), 40 talik varaq + 3 katak o'tkazib, chop etishga 5 ta, HTML fayl «Oshxona-12 · List 1/1»");

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
    // 7. Guruh, massiv (yuqori Object menyusidan), teng taqsimlash — Modeling'da
    await ev(()=>Panel3D._select([1,2]));await page.keyboard.press('Control+g');
    assert.ok(await ev(()=>{const ps=Panel3D._state().panels;const a=ps.find(p=>p.id===1).grp;return !!a&&ps.find(p=>p.id===2).grp===a}));
    await page.locator('#p3pl .p3it').nth(0).click();assert.equal(await ev(()=>document.querySelectorAll('#p3pl .p3it.s').length),2,'guruh a\'zosi bosilsa — ikkalasi');
    await page.keyboard.press('Control+Shift+G');await page.locator('#p3pl .p3it').nth(0).click();assert.equal(await ev(()=>document.querySelectorAll('#p3pl .p3it.s').length),1);
    await page.locator('#p3pl .p3it').nth(4).click();   // polka
    await page.locator('#mbObject .mbBtn').click();await page.locator('#mbObject [data-click="arrayBtn"]').click();await page.waitForSelector('#p3arr:not([hidden])');
    assert.equal(await ev(()=>activePage().name),'Sahifa 1');assert.ok(await ev(()=>Panel3D.isOpen()));
    await page.fill('#p3arrN','2');await page.fill('#p3arrDx','0');await page.fill('#p3arrDy','-150');await page.locator('#p3arrGo').click();
    const sh=await ev(()=>Panel3D._state().panels.filter(p=>/polka/.test(p.n)).map(p=>[p.id,p.y]));assert.deepEqual(sh.map(x=>x[1]),[480,330,180]);
    assert.equal((await ev(()=>Panel3D._hw.ops(1))).filter(o=>o.t==='polka').length,6,'yangi polkalarga polkaderjatel o\'zi');
    await ev(ids=>Panel3D._select(ids),[3,4,...sh.map(x=>x[0])]);await page.locator('.p3ddb',{hasText:'Object'}).click();await page.locator('#p3oDistY').click();
    const ys=await ev(()=>Panel3D._state().panels.filter(p=>/polka/.test(p.n)).map(p=>p.y).sort((a,b)=>a-b));assert.deepEqual(ys,[184,360,536]);
    await ev(()=>document.activeElement&&document.activeElement.blur());await page.keyboard.press('Control+z');
    assert.deepEqual(await ev(()=>Panel3D._state().panels.filter(p=>/polka/.test(p.n)).map(p=>p.y).sort((a,b)=>a-b)),[180,330,480]);
    passed.push("Modeling: Ctrl+G guruh (birini bosish — ikkalasi), Ctrl+Shift+G; yuqori Object ▸ Array → polka 2 nusxa (−150 mm), polkaderjatel o'zi 6; Teng taqsimlash Y — dno va krisha orasida 184/360/536; Ctrl+Z");
    // 8. Stretch (W): tanlangan nuqtalarda X/Y/Z strelkalari; X strelkasini sudrash — faqat X bo'ylab cho'ziladi, sudrashda faol o'q sariq
    await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'krisha',w:568,h:500,t:16,o:'flat',x:300,y:712,z:0}]});Panel3D._select([]);Panel3D._view('iso');Panel3D._setTool('stretch');Panel3D._vsel(['1:1','1:2'])});
    await page.waitForTimeout(150);assert.ok((await ev(()=>Panel3D._vsel())).gz,'strelkalar ko\'rinadi');
    const G=await ev(()=>Panel3D._gz()),m={x:(G.c.x+G.a0.x)/2,y:(G.c.y+G.a0.y)/2};await page.mouse.move(m.x,m.y);await page.mouse.down();
    const dir={x:G.a0.x-G.c.x,y:G.a0.y-G.c.y},dl=Math.hypot(dir.x,dir.y);await page.mouse.move(m.x+dir.x/dl*70,m.y+dir.y/dl*70,{steps:8});
    assert.match(await page.locator('#p3hint').textContent(),/Stretch X o'qi: ΔX [\d.]+  ΔY 0  ΔZ 0 mm/);
    await page.mouse.up();const SK=await ev(()=>{const k=Panel3D._state().panels[0];return{w:k.w,h:k.h,x:k.x,y:k.y,z:k.z}});
    assert.ok(SK.w>580,'cho\'zildi: '+SK.w);assert.equal(SK.h,500);assert.equal(SK.y,712);assert.equal(SK.z,0);assert.ok(Math.abs((SK.x-300)-(SK.w-568)/2)<.01,'faqat o\'ng tomon');
    assert.deepEqual((await ev(()=>Panel3D._vsel())).keys,['1:1','1:2'],'nuqtalar tanlovi qoladi');
    passed.push(`Stretch (W): nuqtalar ustida X/Y/Z strelka; X strelkasi bilan ${Math.round(SK.w-568)} mm cho'zildi (faqat X, chap tomon joyida), tanlov saqlanadi — keyingi strelka bilan davom`);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}
  console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`modeling-cnc-price: ${passed.length} checks passed`);
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exit(1)});
