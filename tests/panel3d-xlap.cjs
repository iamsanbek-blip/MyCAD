'use strict';
// Modeling: o'zaro o'yiq (panel3d-xlap.js) — kesishma topish, yarim-yarim / to'liq o'yiq, qiya panel, dogbone, to'qnashuv tekshiruvi.
// Faqat Node: node tests/panel3d-xlap.cjs
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.THREE=require('../app/js/vendor/three.min.js');
const src=fs.readFileSync(path.join(__dirname,'../app/js/tools/panel3d.js'),'utf8');
const grab=n=>{const i=src.indexOf('function '+n+'(');assert.ok(i>=0,n);let d=0,j=src.indexOf('{',i);for(;;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(!d)break}}return src.slice(i,j+1)};
const {Wof,prof}=new Function('const rtQ=p=>new THREE.Quaternion(p.rt[0],p.rt[1],p.rt[2],p.rt[3]);'+grab('Mof')+';'+grab('Wof')+';'+grab('prof')+';return{Wof,prof}')();
const XL=require('../app/js/tools/panel3d-xlap.js'),X=XL.create({Wof,prof});
const passed=[],ok=m=>passed.push(m),A2=P=>Math.abs(XL.area(P));
const apply=(plans,o)=>{for(const pl of plans)for(const s of pl.slots){const r=X.cut(s.p,s.poly,o);assert.ok(!r.err,r.err);if(r.hole)(s.p.ops=s.p.ops||[]).push({k:'c',th:1,pts:r.hole});else{s.p.pts=r.pts;s.p.shape='poly';s.p.bw=s.p.w;s.p.bh=s.p.h}}};

// 1. To'g'ri burchakli X: A (y −50..50) va B (y 0..400) — umumiy 50 mm, har biri o'z chekkasidan 25 mm (yarim-yarim)
{const A={id:1,w:400,h:100,t:16,o:'front',x:0,y:0,z:0},B={id:2,w:100,h:400,t:16,o:'side',x:0,y:200,z:0};
  assert.equal(X.interference([A,B]).length,1);
  const pl=X.plan([A,B],{cl:.2});assert.equal(pl.length,1);assert.equal(pl[0].kind,'half');assert.equal(pl[0].slots.length,2);
  const a0=A2(prof(A)),b0=A2(prof(B));apply(pl,{});
  assert.ok(Math.abs((a0-A2(A.pts))-(16.4*25))<1,'A o\'yig\'i 16.4 × 25: '+(a0-A2(A.pts)));assert.ok(Math.abs((b0-A2(B.pts))-(16.4*25))<1,'B: '+(b0-A2(B.pts)));
  assert.deepEqual(X.interference([A,B]),[],'kiygizilgandan keyin to\'qnashuv yo\'q');
  ok("To'g'ri burchakli X: ikkala panelga 16.4×25 o'yiq (yarim-yarim, zazor 0.2), keyin to'qnashuv yo'q")}

// 2. Ustun (50 eni) qovurg'adan (120 eni) to'liq o'tadi → qovurg'aga 50×16 o'yiq, yaqin chekkasidan ochiladi; ustun butun qoladi
{const rib={id:1,w:600,h:120,t:16,o:'flat',x:0,y:500,z:0},post={id:2,w:50,h:900,t:16,o:'side',x:100,y:450,z:-20};   // ustun z −45..5, qovurg'a z −60..60
  const pl=X.plan([rib,post],{cl:.2});assert.equal(pl[0].kind,'through');assert.equal(pl[0].slots.length,1);assert.equal(pl[0].slots[0].p,rib);
  apply(pl,{});assert.equal(post.pts,undefined,'ustun o\'zgarmadi');assert.deepEqual(X.interference([rib,post]),[]);
  const vs=rib.pts.map(q=>q[1]);assert.ok(Math.min(...vs)===0||Math.max(...vs)===120);
  const rib2={id:3,w:600,h:120,t:16,o:'flat',x:0,y:500,z:0},pl2=X.plan([rib2,post],{cl:.2,mode:'hole'});apply(pl2,{});assert.equal(rib2.ops.length,1,'teshik rejimi — yopiq kesik');
  assert.deepEqual(X.interference([rib2,post]),[]);
  ok("Ustun qovurg'adan o'tadi: qovurg'aga ochiq o'yiq (yaqin chekkadan) yoki «teshik» rejimida yopiq kesik; ustun butun, to'qnashuv yo'q")}

// 3. Qiya: 15° (X atrofida) qiya qovurg'a tik ustunni kesadi — o'yiq qalinlik va burchak hisobida kengroq, keyin to'qnashuv yo'q
{const s=Math.sin(15/180*Math.PI/2),c=Math.cos(15/180*Math.PI/2);
  const rib={id:1,w:600,h:160,t:16,o:'flat',x:0,y:600,z:0,rt:[s,0,0,c]},post={id:2,w:50,h:900,t:16,o:'side',x:0,y:450,z:0};
  assert.equal(X.interference([rib,post]).length,1,'avval kesishadi');
  const pl=X.plan([rib,post],{cl:.2});assert.equal(pl[0].kind,'through');apply(pl,{bone:true,d:6});
  assert.deepEqual(X.interference([rib,post]),[],'qiya o\'yiqdan keyin to\'qnashuv yo\'q');
  const removed=A2(prof({w:600,h:160,shape:'rect'}))-A2(rib.pts);assert.ok(removed>16.4*50,'o\'yiq qiya kesim bo\'yicha kattaroq: '+removed.toFixed(1));
  ok(`Qiya 15°: qovurg'adagi o'yiq ${removed.toFixed(0)} mm² (tik holatdagi 820 dan katta — qiyalik hisobida), dogbone bilan, to'qnashuv yo'q`)}

// 4. Qiya X (ikkalasi ham chekkasidan): 20° qiya plita va tik plita — yarim-yarim
{const s=Math.sin(20/180*Math.PI/2),c=Math.cos(20/180*Math.PI/2);
  const A={id:1,w:400,h:120,t:18,o:'flat',x:0,y:300,z:30,rt:[s,0,0,c]},B={id:2,w:200,h:300,t:16,o:'side',x:0,y:200,z:100};
  const pl=X.plan([A,B],{cl:.2});assert.ok(pl.length===1,JSON.stringify(pl.map(p=>p.kind)));apply(pl,{bone:true,d:6});assert.deepEqual(X.interference([A,B]),[]);
  ok(`Qiya X (20°, 18 va 16 mm): ${pl[0].kind==='half'?'yarim-yarim':'to\'liq'} o'yiq, dogbone, to'qnashuv yo'q`)}

// 5. Parallel va uzoq panellar — kesishma yo'q
{const A={id:1,w:400,h:100,t:16,o:'front',x:0,y:0,z:0},B={id:2,w:400,h:100,t:16,o:'front',x:0,y:0,z:50},C={id:3,w:100,h:100,t:16,o:'side',x:900,y:0,z:0};
  assert.equal(X.plan([A,B,C],{}).length,0);assert.deepEqual(X.interference([A,B,C]),[]);ok("Parallel va uzoq panellar: o'yiq ham, to'qnashuv ham yo'q")}

// 6. Ko'pburchak ayirish: ikkiga bo'luvchi o'yiq — xato qaytaradi
{const P={id:1,w:100,h:50,t:16,o:'front',x:0,y:0,z:0},r=X.cut(P,[[40,-10],[60,-10],[60,80],[40,80]],{});assert.match(r.err,/ikkiga/);ok("Panelni ikkiga bo'luvchi o'yiq rad etiladi")}

console.log(passed.map(s=>'PASS '+s).join('\n'));console.log(`panel3d-xlap: ${passed.length} checks passed`);
