'use strict';
// Modeling furnitura (panel3d-hw.js): ulanishlarni topish, teshik/paz joylash, panel o'zgarishlari, DXF va CSV.
// Faqat Node: node tests/panel3d-hw.cjs. Panel yo'nalishi (Mof) va profil (prof) panel3d.js dan olinadi.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.THREE=require('../app/js/vendor/three.min.js');
const src=fs.readFileSync(path.join(__dirname,'../app/js/tools/panel3d.js'),'utf8');
const grab=n=>{const i=src.indexOf('function '+n+'(');assert.ok(i>=0,n);let d=0,j=src.indexOf('{',i);for(;;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(!d)break}}return src.slice(i,j+1)};
const {Mof,prof}=new Function(grab('Mof')+';'+grab('prof')+';return{Mof,prof}')();
const RugbyHW=require('../app/js/tools/panel3d-hw.js'),HW=RugbyHW.create({Mof,prof}),Doc=require('../app/js/core/document-codec.js');
const passed=[];const ok=(m)=>passed.push(m);
const W=(p,u,v,z)=>{const m=Mof(p),l=[u-p.w/2,v-p.h/2,z];return[0,1,2].map(a=>[p.x,p.y,p.z][a]+m[a*3]*l[0]+m[a*3+1]*l[1]+m[a*3+2]*l[2])};
const Wd=(p,n)=>{const m=Mof(p);return[0,1,2].map(a=>m[a*3]*n[0]+m[a*3+1]*n[1])};
const near=(a,b,e=.02)=>a.every((v,i)=>Math.abs(v-b[i])<=e);
const faceW=(p,o)=>W(p,o.u,o.v,(o.f==='A'?1:-1)*p.t/2);
const corpus=()=>[
  {id:1,n:'A. chap boka',w:500,h:720,t:16,o:'side',x:8,y:360,z:0},
  {id:2,n:"A. o'ng boka",w:500,h:720,t:16,o:'side',x:592,y:360,z:0},
  {id:3,n:'A. dno',w:568,h:500,t:16,o:'flat',x:300,y:8,z:0},
  {id:4,n:'A. krisha',w:568,h:500,t:16,o:'flat',x:300,y:712,z:0},
  {id:5,n:'A. polka',w:568,h:480,t:16,o:'flat',x:300,y:480,z:-10},
  {id:7,n:'A. orqa devor',w:584,h:704,t:4,o:'front',x:300,y:360,z:-240},     // har tomondan 8 mm pazga kiradi
  {id:8,n:'A. fasad',w:596,h:716,t:16,o:'front',x:300,y:360,z:258}];
const byId=(ps,id)=>ps.find(p=>p.id===id);
const ops=(p,t)=>(p.ops||[]).filter(o=>!t||o.t===t);

// 1. To'liq korpus: tur bo'yicha sonlar, ogohlantirish yo'q
{const ps=corpus(),r=HW.place(ps,ps,{});
  assert.deepEqual(r.cnt,{konf:16,polka:4,paz:4,petlya:2,planka:4,ruchka:2});assert.deepEqual(r.warn,[]);
  ok("Korpus: 8 yevrovint (16 teshik), 4 polkaderjatel, 4 paz, 2 petlya + 4 planka teshigi, ruchka — ogohlantirishsiz")
  // 2. Yevrovint: A yuzadagi Ø7 (teshib o'tadi) va B qirradagi Ø5×50 — bitta dunyo nuqtasida, chet teshigi B ichiga qaraydi
  let pairs=0;
  for(const B of ps)for(const e of ops(B,'konf').filter(o=>o.k==='e')){const P=W(B,e.u,e.v,e.c),A=ps.find(a=>a!==B&&ops(a,'konf').some(o=>o.k==='d'&&near(faceW(a,o),P)));
    assert.ok(A,`${B.n}: chet teshigiga mos yuza teshigi bor`);const f=ops(A,'konf').find(o=>o.k==='d'&&near(faceW(A,o),P));
    assert.equal(f.d,7);assert.equal(f.th,1);assert.equal(e.d,5);assert.equal(e.z,50);
    const n=Wd(B,e.n),In=P.map((v,i)=>v+n[i]*e.z),bx=[0,1,2].map(a=>{const m=Mof(B),d=[B.w,B.h,B.t];let s=0;for(let l=0;l<3;l++)s+=Math.abs(m[a*3+l])*d[l];return[[B.x,B.y,B.z][a]-s/2,[B.x,B.y,B.z][a]+s/2]});
    assert.ok(In.every((v,i)=>v>=bx[i][0]-.01&&v<=bx[i][1]+.01),'chuqurlik B ichida');pairs++}
  assert.equal(pairs,8);
  const dno=byId(ps,3);assert.deepEqual(ops(dno,'konf').map(o=>o.v).sort((a,b)=>a-b),[50,50,450,450]);
  ok("Yevrovint: yuza Ø7 va chet Ø5×50 aynan bir nuqtada (dunyo koordinatasida), chet teshigi panel ichiga; uchidan 50 mm")
  // 3. Polkaderjatel: bokada Ø5×10, polka ostidan 8 mm, oldi/orqadan 37 mm; polkaning o'zida teshik yo'q
  const L=byId(ps,1),pins=ops(L,'polka');assert.equal(pins.length,2);
  for(const o of pins){const P=faceW(L,o);assert.equal(o.d,5);assert.equal(o.z,10);assert.ok(Math.abs(P[1]-(472-8))<.01);assert.ok(Math.abs(P[0]-16)<.01,'ichki yuza')}
  assert.deepEqual(pins.map(o=>faceW(L,o)[2]).sort((a,b)=>a-b).map(v=>+v.toFixed(2)),[-213,193]);assert.equal(ops(byId(ps,5)).length,0);
  ok("Polkaderjatel: boka ichki yuzasida Ø5×10, polka ostidan 8 mm, oldi/orqa chetidan 37 mm; polka o'zi teshilmaydi")
  // 4. Paz: orqa devor 4 mm + 0.5 zazor = 4.5 eni, chuqurligi kirish (8 mm); boka, dno, krishada
  for(const id of[1,2,3,4]){const g=ops(byId(ps,id),'paz');assert.equal(g.length,1);const o=g[0],w=Math.min(o.u1-o.u0,o.v1-o.v0);assert.equal(+w.toFixed(2),4.5);assert.equal(o.z,8)}
  assert.equal(ops(byId(ps,7)).length,0);
  ok("Orqa devor pazi: eni 4.5 (4 + 0.5), chuqurligi 8 (panel kirgan masofa) — 2 boka, dno, krishada; orqa devorda teshik yo'q")
  // 5. Petlya: fasad ichki yuzasida Ø35×13, markazi chetdan 4+17.5; bokada planka teshiklari oldidan 37, ±16; ruchka — qarama-qarshi tomonda
  const F=byId(ps,8),cups=ops(F,'petlya');assert.equal(cups.length,2);
  for(const o of cups){const P=faceW(F,o);assert.equal(o.d,35);assert.equal(o.z,13);assert.ok(Math.abs(P[0]-(2+21.5))<.01);assert.ok(Math.abs(P[2]-250)<.01,'ichki yuza (korpus tomoni)')}
  assert.deepEqual(cups.map(o=>+faceW(F,o)[1].toFixed(2)).sort((a,b)=>a-b),[102,618]);
  const pl=ops(L,'planka').map(o=>faceW(L,o));assert.equal(pl.length,4);for(const P of pl){assert.ok(Math.abs(P[2]-(250-37))<.01);assert.ok(Math.abs(P[0]-16)<.01)}
  assert.deepEqual(pl.map(P=>+P[1].toFixed(2)).sort((a,b)=>a-b),[86,118,602,634]);
  const hd=ops(F,'ruchka').map(o=>faceW(F,o));assert.ok(hd.every(P=>Math.abs(P[0]-(598-40))<.01));assert.deepEqual(hd.map(P=>+P[1].toFixed(2)).sort((a,b)=>a-b),[296,424]);
  ok("Petlya: chashka Ø35×13 fasad ichida, chetdan 21.5; planka teshiklari boka oldidan 37, ±16; ruchka 128 mm qarama-qarshi chetda")
  // 6. Qayta joylash — avtomatik teshiklar almashadi, qo'lda qo'yilgan qoladi
  byId(ps,5).ops=[{k:'d',f:'A',u:100,v:100,d:5,z:10,t:'man'}];const n0=ps.reduce((a,p)=>a+ops(p).length,0);HW.place(ps,ps,{});
  assert.equal(ps.reduce((a,p)=>a+ops(p).length,0),n0);assert.equal(ops(byId(ps,5),'man').length,1);
  ok("Qayta «Furnituralash»: avtomatik teshiklar ikki marta qo'yilmaydi, qo'lda qo'yilgan teshik saqlanadi")}

// 7. Ekssentrik: B yuzada Ø15×13 qirradan 34 mm (A tomonga qaragan yuzada), B chetida Ø8, A da shtok Ø5×11
{const ps=corpus(),r=HW.place(ps,ps,{con:'ekss',pin:{on:false}});assert.equal(r.cnt.ekss,36);   // 6 ulanish (polka ham qotiriladi) × 2 joy × 3 teshik
  const K=byId(ps,4),cam=ops(K,'ekss').filter(o=>o.k==='d');assert.equal(cam.length,4);
  for(const o of cam){const P=faceW(K,o);assert.equal(o.d,15);assert.ok(Math.abs(P[1]-704)<.01,'krisha ostki yuzasi');assert.ok(Math.abs(Math.min(P[0]-16,584-P[0])-34)<.01)}
  const L=byId(ps,1);assert.ok(ops(L,'ekss').every(o=>o.k==='d'&&o.d===5&&o.z===11));
  ok("Ekssentrik: Ø15×13 krishaning ichki (ostki) yuzasida, boka yuzasidan 34 mm; chetida Ø8; bokada shtok Ø5×11")}

// 8. Panelni 90° burish va Mirror: teshik panel bilan birga, tekshiruv toza
{const ps=corpus();HW.place(ps,ps,{});const K=byId(ps,4),before=ops(K).map(o=>o.k==='g'?[o.u0,o.v0,o.u1,o.v1]:[o.u,o.v]);
  HW.rot90(K,K.w);[K.w,K.h]=[K.h,K.w];assert.deepEqual(HW.check(K),[]);
  const e=ops(K).find(o=>o.k==='e');assert.ok(e.u>=0&&e.u<=K.w&&(e.v===0||Math.abs(e.v-K.h)<.01),'chet teshigi yangi qirrada');
  HW.rot90(K,K.w);[K.w,K.h]=[K.h,K.w];HW.rot90(K,K.w);[K.w,K.h]=[K.h,K.w];HW.rot90(K,K.w);[K.w,K.h]=[K.h,K.w];
  assert.deepEqual(ops(K).map(o=>o.k==='g'?[o.u0,o.v0,o.u1,o.v1]:[o.u,o.v]),before);
  const L=byId(ps,1),c=JSON.parse(JSON.stringify(L));HW.mirror(c,'w');HW.mirror(c,'w');assert.deepEqual(c.ops,L.ops);
  HW.mirror(c,'t');assert.ok(c.ops.filter(o=>o.f).every((o,i)=>o.f!==L.ops.filter(x=>x.f)[i].f));
  ok("Panel 90° (eni↔bo'yi): teshiklar panel bilan buriladi, 4 marta burish — aynan avvalgi; Mirror: u ko'zgu, qalinlik o'qida A↔B")}

// 9. DXF (R12): kontur, teshik, paz, chet teshigi qatlamlari; B tomoni ag'darilgan; Ø5.2 → Ø5 sverlo, Ø12 — sverlo yo'q
{const ps=corpus();HW.place(ps,ps,{});byId(ps,5).ops=[{k:'d',f:'A',u:100,v:100,d:5.2,z:10,t:'man'},{k:'d',f:'A',u:200,v:100,d:12,z:8,t:'man'}];
  const d=HW.dxf(ps,{}),t=d.text;
  assert.ok(t.startsWith('0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009'));assert.ok(t.endsWith('0\nEOF\n'));
  for(const l of['CUT_Z16','CUT_Z4','DRILL_D7_THRU','DRILL_D5_Z10','GROOVE_W4_5_Z8','HDRILL_D5_Z50','DRILL_D35_Z13','DRILL_D5_Z12','DRILL_D5_THRU','DRILL_D12_Z8'])assert.ok(d.layers.includes(l),l);
  assert.ok(d.layers.every(l=>/^[A-Za-z0-9_$-]{1,31}$/.test(l)));
  for(const l of d.layers)assert.ok(t.includes('0\nLAYER\n2\n'+l+'\n'),'qatlam jadvalida: '+l);
  const ent=[...t.matchAll(/0\nCIRCLE\n8\n([^\n]+)\n10\n([^\n]+)\n20\n([^\n]+)\n30\n0\n40\n([^\n]+)\n/g)];
  assert.equal(ent.length,d.drills+d.edges);assert.ok(ent.some(m=>m[1]==='DRILL_D5_Z10'&&+m[4]===2.5));
  assert.deepEqual(d.mapped,['Ø5.2→5 (1 ta)']);assert.deepEqual(d.noDrill,['Ø12 (1 ta)']);
  // B tomonida ko'r teshik yoki paz bor panellar: o'ng boka (polkaderjatel, paz), krisha (paz), fasad (petlya chashkasi) → 7 panel + 3 = 10 chizma
  assert.equal(d.panels,7);assert.equal(d.sides,10);
  const labels=[...t.matchAll(/0\nTEXT\n8\nLABEL\n[\s\S]*?\n1\n([^\n]+)\n/g)].map(m=>m[1]);assert.equal(labels.length,20);
  assert.ok(labels.includes("A. o'ng boka")&&labels.includes("500x720x16 B (ag'darilgan)"));
  // ag'darilgan B tomon: u → eni−u
  const oR=byId(ps,2),pinB=ops(oR,'polka')[0],rows=[...t.matchAll(/0\nPOLYLINE\n8\nCUT_Z16\n[\s\S]*?SEQEND/g)];assert.ok(rows.length>=8);
  const off={};{let cx=0;for(const p of ps){const sides=(p.ops||[]).some(x=>(x.k==='d'&&x.f==='B'&&!x.th)||(x.k==='g'&&x.f==='B'))?['A','B']:['A'];for(const s of sides){off[p.id+s]=cx;cx+=p.w+100}}}
  const xB=off['2B']+(oR.w-pinB.u);assert.ok(ent.some(m=>m[1]==='DRILL_D5_Z10'&&Math.abs(+m[2]-xB)<.01&&Math.abs(+m[3]-pinB.v)<.01),'B tomoni ko\'zgu');
  const d2=HW.dxf(ps,{dxf:{snap:false,dec:'p',drill:'D{d}-Z{z}'}});assert.ok(d2.layers.includes('D5p2-Z10'));assert.deepEqual(d2.mapped,[]);
  ok("DXF R12: qatlam jadvali, Ø/chuqurlik qatlam nomida; B tomon ag'darilgan; Ø5.2→Ø5 yaxlitlanadi, Ø12 «sverlo yo'q»; qatlam shabloni sozlanadi")
  const csv=HW.csv(ps).split('\r\n');assert.equal(csv[0],"Panel;Turi;Tomon;U;V;Diametr;Chuqurlik;Teshib o'tadi;Yo'nalish");
  assert.ok(csv.some(r=>r.startsWith('A. dno;Yevrovint;Chet;0;')&&r.endsWith(';5;50;;1,0')));
  ok("Teshiklar CSV: panel, tur, tomon (A/B/Chet), U, V, Ø, chuqurlik, yo'nalish")}

// 10. Tekshiruv va saqlash
{const p={id:1,n:'Test',w:300,h:200,t:16,o:'front',x:0,y:0,z:0,ops:[{k:'d',f:'A',u:-5,v:10,d:5,z:10},{k:'d',f:'A',u:2,v:100,d:8,z:10},{k:'d',f:'A',u:100,v:100,d:8,z:16},{k:'d',f:'A',u:104,v:100,d:5,z:10},{k:'e',u:150,v:0,c:0,n:[0,1],d:15,z:30}]};
  const w=HW.check(p);for(const s of['panel tashqarisida','chetga juda yaqin','teshilib ketadi','ustma-ust','sig\'maydi'])assert.ok(w.some(m=>m.includes(s)),s);
  assert.equal(HW.sanitize([{k:'d',u:1,v:2,d:5,z:3,f:'A'},{k:'x'},null,{k:'d',u:'a'}]).length,1);assert.equal(HW.sanitize([{k:'q'}]),undefined);
  const ps=corpus();HW.place(ps,ps,{});const model={v:1,T:16,uid:9,panels:ps};
  const doc=Doc.decode(JSON.stringify({format:'dogbone-editor-project',version:2,units:'mm',pages:[{id:'p1',name:'S',panel3d:model}],activePageId:'p1'}));
  const back=(doc.pages||doc.document.pages)[0].panel3d;assert.deepEqual(back.panels.map(p=>p.ops||[]),ps.map(p=>p.ops||[]));
  const e0=Doc.encode(doc.pages||doc.document.pages,'p1'),enc=JSON.parse(typeof e0==='string'?e0:JSON.stringify(e0));assert.deepEqual(enc.pages[0].panel3d.panels[0].ops,ps[0].ops);
  const re=Doc.decode(JSON.stringify(enc));assert.deepEqual((re.pages||re.document.pages)[0].panel3d.panels.map(p=>p.ops||[]),ps.map(p=>p.ops||[]));
  ok("Tekshiruv: tashqarida, chetga yaqin, teshilib ketadi, ustma-ust, chetga sig'maydi; loyiha faylida (encode/decode) teshiklar saqlanadi")}

// 11. Bitta detalda turli ulagich: krisha (B panel) — «ekssentrik + shkant», dno — umumiy (yevrovint)
{const ps=corpus();byId(ps,4).con='ekss+shkant';const r=HW.place(ps,ps,{pin:{on:false}});const L=byId(ps,1),types=new Set(ops(L).map(o=>o.t));
  assert.ok(types.has('konf')&&types.has('ekss')&&types.has('shkant'),'chap bokada uch tur');
  assert.equal(ops(byId(ps,3)).filter(o=>o.t==='konf').length,4);assert.ok(ops(byId(ps,4)).some(o=>o.t==='ekss'&&o.d===15));assert.ok(ops(byId(ps,4)).some(o=>o.t==='shkant'&&o.k==='e'));
  byId(ps,4).con='none';HW.place(ps,ps,{pin:{on:false}});assert.equal(ops(byId(ps,4)).filter(o=>o.t!=='paz').length,0,'krisha: «yo\'q» — faqat orqa devor pazi qoladi');assert.equal(ops(byId(ps,3)).filter(o=>o.t==='konf').length,4);
  const ps2=corpus();byId(ps2,3).con='shkant';HW.place(ps2,ps2,{});assert.ok(ops(byId(ps2,3)).filter(o=>o.k==='e').every(o=>o.t==='shkant'&&o.d===8));assert.ok(ops(byId(ps2,4)).filter(o=>o.k==='e').every(o=>o.t==='konf'));
  ok("Bitta detalda aralash ulagich: krisha — ekssentrik + shkant, dno — yevrovint (bokada uch tur); panel tanlovi umumiydan ustun")}

// 12. CNC uchun tekis detal: ishlov tomoni (B ko'p bo'lsa — ko'zgu), teksturali panel X bo'ylab, chet teshigi sanaladi
{const ps=corpus();byId(ps,1).gr='h';HW.place(ps,ps,{});
  const R=HW.flat(byId(ps,2),{});assert.equal(R.side,'B');const pin=ops(byId(ps,2),'polka')[0];assert.ok(R.circles.some(c=>Math.abs(c.x-(500-pin.u))<.01&&Math.abs(c.y-pin.v)<.01&&c.layer==='DRILL_D5_Z10'));
  const L=HW.flat(byId(ps,1),{});assert.equal(L.side,'A');assert.ok(L.rot&&L.noRot);assert.deepEqual([L.w,L.h],[720,500]);
  const xs=L.contour.map(c=>c[0]),ys=L.contour.map(c=>c[1]);assert.deepEqual([Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)],[0,720,0,500]);
  assert.ok(L.circles.every(c=>c.x>=0&&c.x<=720&&c.y>=0&&c.y<=500));const p0=ops(byId(ps,1),'polka')[0];assert.ok(L.circles.some(c=>Math.abs(c.x-p0.v)<.01&&Math.abs(c.y-(500-p0.u))<.01));
  const D=HW.flat(byId(ps,3),{});assert.equal(D.edge,4);assert.equal(D.circles.length,0);
  const K=HW.flat(byId(ps,4),{});assert.equal(K.side,'B');assert.equal(K.rects.length,1);assert.equal(K.rects[0].layer,'GROOVE_W4_5_Z8');
  ok("CNC detali: o'ng boka B tomondan (ko'zgu), teksturali chap boka 720×500 burilgan va burilmaydi, dno chet teshiklari sanaladi, krisha pazi B tomonda")}

// 13. Narx: list soni × narx, kromka metri, furnitura teshiklardan, ishlar; detallar yig'indisi = jami (qo'shimcha va ustamasiz)
{const PR=require('../app/js/tools/panel3d-price.js'),src2=src;const fn=n=>{const i=src2.indexOf('function '+n+'(');let d=0,j=src2.indexOf('{',i);for(;;j++){if(src2[j]==='{')d++;else if(src2[j]==='}'){d--;if(!d)break}}return src2.slice(i,j+1)};
  const {packSheets,ebInfo}=new Function('prof',fn('packSheets')+';'+fn('ebInfo')+';return{packSheets,ebInfo}')(prof);
  const ps=corpus();ps.forEach(p=>p.mat=p.t===4?'XDF':'LDSP');byId(ps,1).eb=[0,1,0,0];byId(ps,5).q=2;HW.place(ps,ps,{});
  const H={prof,matN:p=>p.mat||'',LW:p=>[Math.max(p.w,p.h),Math.min(p.w,p.h)],canRot:()=>true,ebInfo,pack:packSheets,sheet:{L:2800,W:2070,K:4,T:10}};
  const P={mat:{'LDSP|16':500000,'XDF|4':100000},eb:{'1':2000},hw:{konf:400,polka:200,petlya:12000,ruchka:20000},work:{cut:3000,drill:500,groove:2000,edge:1000},extra:[{n:'Yetkazish',v:50000}],markup:10};
  const r=PR.compute(ps,P,H);
  assert.deepEqual(r.groups.map(g=>[g.key,g.sheets,g.cost]),[['LDSP|16',1,500000],['XDF|4',1,100000]]);
  assert.deepEqual(r.hw.map(h=>[h.k,h.n]),[['konf',8],['polka',4],['petlya',2],['ruchka',1]]);
  assert.equal(r.eb[0].m,0.72);assert.equal(r.eb[0].cost,1440);
  const per=r.perPanel.reduce((a,x)=>a+x.sum,0);assert.ok(Math.abs(per-(r.matT+r.ebT+r.hwT+r.workT))<1e-6,'detallar yig\'indisi');
  assert.ok(Math.abs(r.total-(r.sub*1.1))<1e-6);assert.equal(r.sub,r.matT+r.ebT+r.hwT+r.workT+50000);
  const m2=PR.compute(ps,Object.assign({},P,{mode:'m2',waste:20}),H);assert.ok(Math.abs(m2.groups[0].cost-m2.groups[0].area*1.2*500000/(2.8*2.07))<1e-6);
  assert.deepEqual(PR.compute(ps,{},H).missing.slice(0,2),['mat:LDSP|16','mat:XDF|4']);assert.deepEqual(PR.merge({mat:{a:-5,b:'x'},extra:[{n:'q',v:-1}]}).extra,[{n:'q',v:0}]);
  ok("Narx: list soni × narx (m² + chiqit rejimi ham), kromka metri, furnitura (yevrovint 8, polkaderjatel 4 — bokadagi teshiklardan, polka soni 2 bo'lsa ham), ishlar; detallar yig'indisi = jami, ustama 10%")}

// 14. Ulanish chizig'iga tur (Furnitura asbobi): B panelda jc[A.id] — panel va umumiydan ustun; polka → yevrovint; o'chirish
{const ps=corpus();HW.setJoint(byId(ps,3),1,'ekss');HW.setJoint(byId(ps,5),2,'konf');HW.place(ps,ps,{});
  const L=HW.jointLines(ps,{}),g=k=>L.find(l=>l.key===k);
  assert.deepEqual([g('3>1').cur,g('3>1').own,g('3>2').cur,g('5>1').cur,g('5>2').cur,g('1>8').kind,g('7>1').kind],['ekss',true,'konf','polka','konf','door','groove']);
  assert.ok(ops(byId(ps,3)).filter(o=>o.k==='e'&&o.u===0).every(o=>o.t==='ekss')&&ops(byId(ps,3)).filter(o=>o.k==='e'&&o.u===568).every(o=>o.t==='konf'));
  assert.equal(ops(byId(ps,2),'polka').length,0);assert.equal(ops(byId(ps,1),'polka').length,2);assert.equal(ops(byId(ps,5)).filter(o=>o.k==='e').length,2);
  byId(ps,3).con='shkant';HW.place(ps,ps,{});assert.ok(ops(byId(ps,3)).filter(o=>o.k==='e'&&o.u===0).every(o=>o.t==='ekss'),'ulanish tanlovi panelnikidan ustun');
  HW.setJoint(byId(ps,3),1,'');HW.setJoint(byId(ps,5),2,'');assert.equal(byId(ps,3).jc,undefined);assert.equal(byId(ps,5).jc,undefined);
  ok("Ulanish chizig'iga tur: dno chap tomoni ekssentrik, o'ng tomoni yevrovint; polkaning bir tomoni qotiriladi, ikkinchisi polkaderjatel; panel tanlovidan ustun; o'chirish")}

console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`panel3d-hw: ${passed.length} checks passed`);
