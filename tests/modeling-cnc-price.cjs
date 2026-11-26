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
    // ramka bilan hamma ulanishni tanlab «Yo'q» — furnitura teshiklari olib tashlanadi (paz/petlya qoladi); Ctrl+Z
    {const pts=await ev(()=>Panel3D._joints().filter(l=>l.kind==='con').map(l=>Panel3D._jointScr(l.key)));const xs=pts.map(q=>q.x),ys=pts.map(q=>q.y);
      await page.mouse.move(Math.max(...xs)+40,Math.max(...ys)+40);await page.mouse.down();await page.mouse.move(Math.min(...xs)-40,Math.min(...ys)-40,{steps:6});await page.mouse.up();
      assert.match(await page.locator('#p3jb .p3jn').textContent(),/^\d+ ✓/);await page.locator('#p3jb [data-jt="none"]').click();
      const js=await ev(()=>Panel3D._joints().filter(l=>l.kind==='con'));assert.ok(js.length>0&&js.every(l=>l.cur==='none'),JSON.stringify(js.map(l=>l.cur)));
      assert.ok(!(await ev(()=>[1,2,3,4,5].flatMap(i=>Panel3D._hw.ops(i)))).some(o=>/^(konf|ekss|shkant|polka)$/.test(o.t)),'ulanish teshiklari yo\'q');
      await ev(()=>document.activeElement&&document.activeElement.blur());await page.keyboard.press('Control+z');assert.ok((await ev(()=>Panel3D._joints())).some(l=>l.kind==='con'&&l.cur!=='none'))}
    await page.keyboard.press('Escape');await page.keyboard.press('v');assert.ok(await page.locator('#p3jb').isHidden());
    passed.push("Furnitura asbobi (J): dno–chap boka ulanishiga shkant (o'ng tomoni yevrovint qoldi), yana bosish — umumiy; Shift bilan 2 polka ulanishi → yevrovint (polkaderjatel o'rniga), Ctrl+Z; ⇅ — ekssentrik o'yig'i krishaning ikkinchi yuzasiga va qaytadi; Ship-paz — dno tishlari, bokada kesik, yana bosish — umumiy; ramka bilan hamma ulanish → «Yo'q», Ctrl+Z");

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
    const gd=await ev(()=>Panel3D._guides()),gr=gd.filter(g=>g.k==='rect');   // qo'shni panellar izi: 2 boka, dno, krisha (fasadga tegadi)
    assert.equal(gr.length,4,JSON.stringify(gr));assert.ok(gd.filter(g=>g.k==='line').length>=6);
    assert.ok(gr.some(g=>{const xs=g.pts.map(q=>q[0]);return Math.min(...xs)===-2&&Math.max(...xs)===14}),'chap boka izi fasad chetida (u −2..14)');
    assert.ok(await ev(()=>texts.some(t=>t.text==='A. dno'&&t.layer==='YORDAMCHI')));
    const fOps=await ev(()=>{const s=documentPages[0].panel3d.panels.find(p=>p.id===8);return(s.ops||[]).filter(o=>o.k==='d').length});assert.equal(ed.c,fOps);
    await ev(()=>{const c=drawnLines.find(l=>l.kind==='line'&&!l.p3g);const pts=[{x:0,y:0},{x:596,y:0},{x:596,y:616},{x:496,y:716},{x:0,y:716}];c.points=pts;c.grips=pts.map(o=>({...o}));
      const ce={x:298,y:60};drawnLines.push({kind:'circle',center:ce,radius:4,closed:true,selected:false,layer:'DRILL_D8_Z12',points:genCirclePts(ce,4),grips:[]})});
    await page.locator('#p3edOk').click();await page.waitForFunction(()=>Panel3D.isOpen());
    const F=await ev(()=>{const p=Panel3D._state().panels.find(p=>p.id===8);return{pts:p.pts,w:p.w,h:p.h,x:p.x,y:p.y,z:p.z,eb:p.eb||null,man:(p.ops||[]).filter(o=>o.t==='man'),n:(p.ops||[]).filter(o=>o.k==='d').length,pages:documentPages.map(x=>x.name)}});
    assert.deepEqual(F.pts,[[0,0],[596,0],[596,616],[496,716],[0,716]]);assert.deepEqual([F.w,F.h,F.x,F.y,F.z],[596,716,300,360,258]);
    assert.deepEqual(F.man,[{k:'d',f:'A',u:298,v:60,d:8,z:12,t:'man'}]);assert.equal(F.n,fOps+1);assert.equal(F.eb,null,'kromka qirralar soni o\'zgardi');
    assert.deepEqual(F.pages,['Sahifa 1','CNC · LDSP oq 16 mm','CNC · MDF 16 mm','CNC · XDF 4 mm']);
    await page.keyboard.press('Control+z');assert.equal(await ev(()=>Panel3D._state().panels.find(p=>p.id===8).pts),undefined);
    passed.push("Fasad 2 marta bosildi → «✎ A. fasad» Drawing sahifasi (qo'shni 4 panel izi va yordamchi chiziqlar, nomlari bilan); kesilgan burchak va Ø8×12 teshik «Modeling'ga qaytarish» bilan panelga o'tdi, joyi o'zgarmadi, vaqtinchalik sahifa o'chdi; Ctrl+Z qaytaradi");
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
    // 9. Panel rangi: avtomatik neytral (material bo'yicha), qo'lda tanlash, «Avto», «Materialga» — loyihada saqlanadi
    await ev(()=>{Panel3D._setTool('select');Panel3D.load({T:16,uid:10,panels:[{id:1,n:'a',w:500,h:720,t:16,o:'side',x:8,y:360,z:0,mat:'LDSP oq'},{id:2,n:'b',w:500,h:720,t:16,o:'side',x:592,y:360,z:0,mat:'LDSP oq'},{id:3,n:'c',w:568,h:500,t:16,o:'flat',x:300,y:8,z:0}]});Panel3D._select([])});
    const c0=await ev(()=>[1,2,3].map(i=>Panel3D._col(i)));assert.equal(c0[0],c0[1]);assert.equal(c0[2],'#bfc8d4');assert.notEqual(c0[0],c0[2]);
    await page.locator('#p3pl .p3it').nth(0).click();await page.waitForSelector('#p3fCol');
    await page.locator('#p3fCol').evaluate(e=>{e.value='#336699';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))});
    assert.deepEqual(await ev(()=>[Panel3D._col(1),Panel3D._col(2)]),['#336699',c0[1]]);
    await page.locator('#p3fColA').click();assert.equal(await ev(()=>Panel3D._col(1)),c0[0]);
    await page.locator('#p3fCol').evaluate(e=>{e.value='#aa7744';e.dispatchEvent(new Event('change',{bubbles:true}))});await page.locator('#p3fColM').click();
    assert.deepEqual(await ev(()=>[1,2,3].map(i=>Panel3D._col(i))),['#aa7744','#aa7744','#bfc8d4']);
    const snap=await ev(()=>Panel3D.snapshot());assert.deepEqual(snap.mc,{'LDSP oq':'#aa7744'});await ev(s=>Panel3D.load(s),snap);assert.equal(await ev(()=>Panel3D._col(2)),'#aa7744');
    passed.push("Panel rangi: material bo'yicha avtomatik neytral (bir materialda bir xil, materialsiz — #bfc8d4), qo'lda tanlash, Avto, Materialga — loyihada saqlanadi");
    // 9b. Panel tanlanganda: materiali va shu material LIST o'lchami (tahrirlanadi, materialga bog'lanadi); narx va list hisobi shu o'lcham bilan
    await page.locator('#p3pl .p3it').nth(2).click();await page.waitForSelector('.p3psum');
    assert.match(await page.locator('.p3psum').textContent(),/^\(materialsiz\) · list/);assert.deepEqual([await page.locator('#p3msL').inputValue(),await page.locator('#p3msW').inputValue()],['2800','2070']);
    assert.equal(await page.locator('#p3selMat').inputValue(),'|');
    await page.locator('#p3pl .p3it').nth(0).click();assert.equal(await page.locator('#p3selMat').inputValue(),'LDSP oq|');
    await page.fill('#p3f_mat','LMDF');await page.press('#p3f_mat','Enter');assert.equal(await ev(()=>Panel3D._state().panels[0].mat),'LMDF');assert.equal(await page.locator('#p3selMat').inputValue(),'LMDF|');
    await page.fill('#p3msL','2750');await page.press('#p3msL','Tab');await page.fill('#p3msW','1830');await page.press('#p3msW','Enter');
    const g2=await ev(()=>Panel3D._price().groups.find(g=>g.m==='LMDF'));assert.deepEqual([g2.L,g2.W],[2750,1830]);
    assert.ok(await ev(()=>Panel3D._price().groups.some(g=>g.m==='LDSP oq'&&g.L===2800&&g.W===2070)),'boshqa material umumiy o\'lchamda');
    const sn=await ev(()=>Panel3D.snapshot());assert.deepEqual(sn.ms,{LMDF:{L:2750,W:1830}});await ev(s=>Panel3D.load(s),sn);assert.deepEqual(await ev(()=>{const g=Panel3D._price().groups.find(g=>g.m==='LMDF');return[g.L,g.W]}),[2750,1830]);
    passed.push("Panel tanlanganda: materiali va list o'lchami (LMDF — 2750×1830, LDSP oq — 2800×2070 umumiy), narx shu o'lcham bilan, loyihada saqlanadi; «Material bo'yicha» ro'yxatida o'z materiali");

    // 10. Kromka viewportda qalinliksiz (2 mm kromka panel o'lchamini kattalashtirmaydi), Cutlist eksportida esa 2 mm belgilanadi
    const kb=await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0,eb:[2,2,2,2]}]});const p=Panel3D._state().panels[0],b=new THREE.Box3().setFromObject(p.g),d=Panel3D._clExport();
      return{y:b.max.y-b.min.y,z:b.max.z-b.min.z,head:d.head,row:d.rows[0],eb:Panel3D._ebInfo(p)}});
    assert.ok(kb.y<=720.6&&kb.z<=500.6,JSON.stringify(kb));assert.ok(kb.head.includes('L1')&&kb.row.includes('2'));assert.ok(Math.abs(kb.eb.len-2.44)<1e-6);
    passed.push(`Kromka: viewportda qalinliksiz tasma (2 mm kromkali boka ${kb.y.toFixed(1)}×${kb.z.toFixed(1)} — o'lcham o'zgarmadi), Cutlist'da 2 mm va 2.44 m`);
    // 11. Nusxa (C) / massiv: ulanish tanlovi nusxa sheriklariga o'tadi, guruh — yangi guruh
    const cp=await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0,grp:'gA'},{id:2,n:'boka2',w:500,h:720,t:16,o:'side',x:592,y:360,z:0,grp:'gA'},{id:4,n:'krisha',w:568,h:500,t:16,o:'flat',x:300,y:712,z:0,jc:{1:'ekss'},jf:{1:1},grp:'gA'}]});
      return null});
    await page.locator('#p3wrap .p3view canvas').first().click({position:{x:5,y:5}});await ev(()=>Panel3D._select([1,2,4]));await page.keyboard.press('c');await page.keyboard.press('Escape');
    const cps=await ev(()=>Panel3D._state().panels.map(p=>({id:p.id,grp:p.grp,jc:p.jc||null,jf:p.jf||null})));
    const orig=cps.filter(p=>p.id<=4),cop=cps.filter(p=>p.id>4);assert.equal(cop.length,3);
    assert.ok(cop.every(c=>c.grp&&c.grp!=='gA')&&new Set(cop.map(c=>c.grp)).size===1,'nusxa — o\'z guruhi');
    const kc=cop.find(c=>c.jc);assert.deepEqual(Object.keys(kc.jc).map(Number),[cop.find(c=>!c.jc&&c.id!==kc.id&&c.id===Math.min(...cop.map(x=>x.id))).id]);assert.deepEqual(Object.keys(kc.jf).map(Number),Object.keys(kc.jc).map(Number));
    assert.deepEqual(orig.find(o=>o.id===4).jc,{1:'ekss'});
    passed.push("Nusxa (C): krishaning ulanish tanlovi (ekss, ⇅) nusxa bokasiga bog'landi, nusxalar alohida yangi guruhda");
    // 12. «Butun korpus ▸ Ko'chirish»: tanlov bo'lsa — faqat tanlangan panel, bo'lmasa — hammasi
    await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0},{id:2,n:'polka',w:568,h:480,t:16,o:'flat',x:300,y:360,z:0}]});Panel3D._select([2])});
    assert.match(await page.locator('#p3mvT').textContent(),/tanlangan 1 ta panel/);
    await page.fill('#p3mx','0');await page.fill('#p3my','100');await page.fill('#p3mz','0');await page.locator('#p3bMove').click();
    let xy=await ev(()=>Panel3D._state().panels.map(p=>[p.id,p.y]));assert.deepEqual(xy,[[1,360],[2,460]]);
    await page.locator('#p3bRR').click();xy=await ev(()=>Panel3D._state().panels.map(p=>[p.id,p.x,p.y,p.z]));assert.deepEqual(xy[0],[1,8,360,0],'tanlanmagan boka burilmadi');
    await ev(()=>Panel3D._select([]));assert.match(await page.locator('#p3mvT').textContent(),/butun korpus/);
    await page.locator('#p3bMove').click();xy=await ev(()=>Panel3D._state().panels.map(p=>p.y));assert.deepEqual(xy,[460,560]);
    passed.push("Ko'chirish / burish: tanlangan polka 100 mm ko'chdi va burildi, boka joyida; tanlovsiz — butun korpus ko'chdi");
    // 13. Rotate: Free — erkin burchak (Ctrl — butun gradus), Ortho — 90° qadam; 90° karrali bo'lsa butun yo'nalishga qaytadi; qiya panelga furnitura yo'q
    await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0},{id:2,n:'krisha',w:568,h:500,t:16,o:'flat',x:300,y:712,z:0},{id:3,n:"o'ng boka",w:500,h:720,t:16,o:'side',x:592,y:360,z:0}]});Panel3D._setTool('rotate');Panel3D._select([2])});
    await ev(()=>document.getElementById('p3bFree').click());
    let rd=await ev(()=>Panel3D._rotDrag(2,37.36,false));assert.equal(rd,37.4);assert.equal(await ev(()=>Panel3D._rtDeg(2)),37.4);
    const ex=await ev(()=>Panel3D._ext(2));assert.ok(Math.abs(ex[0]-(568*Math.cos(37.4*Math.PI/180)+16*Math.sin(37.4*Math.PI/180)))<.05,JSON.stringify(ex));
    assert.ok(!(await ev(()=>Panel3D._joints())).some(l=>l.a===2||l.b===2||String(l.key).split('>').includes('2')),'qiya krisha — ulanish yo\'q');
    await ev(()=>Panel3D._select([2]));rd=await ev(()=>Panel3D._rotDrag(2,-12.6,true));assert.equal(rd,-13);assert.equal(await ev(()=>Panel3D._rtDeg(2)),24.4);
    const sn2=await ev(()=>Panel3D.snapshot());await ev(s=>Panel3D.load(s),sn2);assert.equal(await ev(()=>Panel3D._rtDeg(2)),24.4,'loyihada saqlanadi');
    await ev(()=>Panel3D._select([2]));await page.waitForSelector('#p3bRt0');await page.locator('#p3bRt0').click();assert.equal(await ev(()=>Panel3D._state().panels[1].rt),undefined);
    await ev(()=>Panel3D._select([2]));rd=await ev(()=>Panel3D._rotDrag(1,90,true));const k90=await ev(()=>({rt:Panel3D._state().panels[1].rt,m:Panel3D._state().panels[1].m}));
    assert.equal(k90.rt,undefined,'90° — butun yo\'nalish');assert.ok(Array.isArray(k90.m)&&k90.m.every(v=>Number.isInteger(v)),JSON.stringify(k90));
    await ev(()=>document.getElementById('p3bOrtho').click());await ev(()=>Panel3D._select([1]));await ev(()=>Panel3D._rotDrag(1,30,false));assert.equal(await ev(()=>Panel3D._state().panels[0].rt),undefined,'Ortho: 30° — burilmaydi');
    await ev(()=>Panel3D._select([1]));await ev(()=>Panel3D._rotDrag(1,80,false));
    assert.equal(await ev(()=>Panel3D._state().panels[0].rt),undefined);assert.deepEqual(await ev(()=>Panel3D._ext(1)),[500,720,16],'Ortho: 80° sudrash — 90° qadam');
    await ev(()=>document.getElementById('p3bFree').click());await ev(()=>Panel3D._setTool('select'));
    passed.push("Rotate: Free — 37.4° erkin, Ctrl — butun gradus (−13°), gabarit qiya bo'yicha, qiya panelga avtomatik ulanish yo'q, loyihada saqlanadi, «To'g'rilash»; 90° — butun yo'nalishga qaytdi; Ortho — 90° qadam");
    // 14. Drawing'da tahrir: yordamchi chiziqlar tanlanmaydi (faqat magnit); ichki to'rtburchak — kesik (3D da haqiqiy teshik), «O'yiq» — POCKET_Z8
    await ev(()=>{Panel3D.load({T:16,uid:10,panels:[{id:1,n:'boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0},{id:2,n:'polka',w:568,h:480,t:16,o:'flat',x:300,y:360,z:10}]});Panel3D._edit(1)});
    await page.waitForFunction(()=>Panel3D._editing());
    const gl=await ev(()=>{const g=drawnLines.filter(l=>l.p3g);const n=selectAllObjects();return{n:g.length,lock:layerOf(g[0]).locked,sel:g.some(l=>l.selected),snap:g.every(l=>!snapSkipShape(l)),tx:texts.filter(t=>t.layer==='YORDAMCHI').some(t=>t.selected)}});
    assert.ok(gl.n>0&&gl.lock&&!gl.sel&&!gl.tx&&gl.snap,JSON.stringify(gl));await ev(()=>deselectAllObjects());
    await ev(()=>{const r=genRectPts({x:100,y:200},{x:300,y:400});drawnLines.push({kind:'rect',closed:true,selected:false,layer:activeLayer,points:r,grips:r.map(o=>({...o}))})});
    await page.fill('#p3edZ','6');await page.press('#p3edZ','Enter');await page.locator('#p3edPk').click();assert.equal(await ev(()=>activeLayer),'POCKET_Z6');
    await ev(()=>{const r=genRectPts({x:150,y:500},{x:350,y:600});drawnLines.push({kind:'rect',closed:true,selected:false,layer:activeLayer,points:r,grips:r.map(o=>({...o}))})});
    await page.locator('#p3edOk').click();await page.waitForFunction(()=>Panel3D.isOpen());
    const C=await ev(()=>{const p=Panel3D._state().panels[0],cs=(p.ops||[]).filter(o=>o.k==='c'),g=p.g.children[0].geometry;return{cs,holes:g.parameters.shapes.holes.length,dxf:Panel3D._hw.dxf().text}});
    assert.equal(C.cs.length,2);assert.ok(C.cs.some(o=>o.th&&o.pts.length===4));assert.ok(C.cs.some(o=>!o.th&&o.z===6&&o.f==='A'));assert.equal(C.holes,1,'3D: kesik — haqiqiy teshik');
    assert.match(C.dxf,/POCKET_Z6/);
    await ev(()=>Panel3D._edit(1));await page.waitForFunction(()=>Panel3D._editing());assert.deepEqual(await ev(()=>drawnLines.filter(l=>l.p3op&&l.kind==='line').map(l=>l.layer).sort()),['CUT_Z16','POCKET_Z6']);
    await page.locator('#p3edOk').click();await page.waitForFunction(()=>Panel3D.isOpen());assert.equal(await ev(()=>Panel3D._state().panels[0].ops.filter(o=>o.k==='c').length),2,'qayta ochib-yopilganda saqlanadi');
    await ev(()=>Panel3D._cnc());const cn=await ev(()=>({pk:drawnLines.filter(l=>l.layer==='POCKET_Z6'&&l.p3op).length,cut:drawnLines.filter(l=>l.layer==='CUT_Z16'&&l.p3op).length}));
    assert.deepEqual(cn,{pk:1,cut:1},'CNC sahifasida o\'yiq va kesik detal guruhida');
    passed.push("Drawing tahriri: yordamchi chiziqlar qulflangan (Ctrl+A tanlamaydi, magnit yopishadi); ichki to'rtburchak — kesik (3D teshik), «O'yiq 6 mm» — POCKET_Z6 (DXF'da), qayta ochilganda o'z qatlamida; CNC sahifasida detal guruhida");
    assert.deepEqual(errors,[]);
  }finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true})}
  console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`modeling-cnc-price: ${passed.length} checks passed`);
})().catch(e=>{console.error(e);if(errors.length)console.error(errors);process.exit(1)});
