'use strict';
// Panel 3D: OBJ eksport/import round-trip va list hisobi (haqiqiy three.js r128 bilan, WebGL kerak emas)
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const sb={console,Math,JSON,Set,Map,Array,Object,Number,String,parseInt,parseFloat,document:{documentElement:{}},getComputedStyle:()=>({getPropertyValue:()=>''})};
sb.window=sb;sb.self=sb;vm.createContext(sb);
vm.runInContext(fs.readFileSync(path.join(root,'app/js/vendor/three.min.js'),'utf8'),sb);
vm.runInContext(fs.readFileSync(path.join(root,'app/js/tools/panel3d.js'),'utf8'),sb);
const P=sb.Panel3D;
// 1. Namuna korpus: 2 yon (vertikal), past (gorizontal), orqa (frontal)
const T=16,W=600,H=720,D=500;
P.load({T,uid:10,panels:[
 {id:1,n:'Yon chap',w:D,h:H,t:T,o:'side',x:-(W/2-T/2),y:H/2,z:0},
 {id:2,n:'Yon ong',w:D,h:H,t:T,o:'side',x:W/2-T/2,y:H/2,z:0},
 {id:3,n:'Past',w:W-2*T,h:D,t:T,o:'flat',x:0,y:T/2,z:0},
 {id:4,n:'Orqa',w:W-2*T,h:H-2*T,t:T,o:'front',x:0,y:H/2,z:-D/2+T/2}]});
const obj=P._objText(0.001),lines=obj.split('\n');
assert.equal(lines.filter(l=>l.startsWith('o ')).length,4);
assert.equal(lines.filter(l=>l.startsWith('v ')).length,32);   // 4 quti x 8 uch
assert.ok(lines.every(l=>!l.startsWith('f ')||l.split(' ').length===4));
// metr: yon panel 0.016 x 0.72 x 0.5
const vs=lines.filter(l=>l.startsWith('v ')).slice(0,8).map(l=>l.split(' ').slice(1).map(Number));
const dim=a=>Math.max(...vs.map(v=>v[a]))-Math.min(...vs.map(v=>v[a]));
assert.ok(Math.abs(dim(0)-0.016)<1e-6&&Math.abs(dim(1)-0.72)<1e-6&&Math.abs(dim(2)-0.5)<1e-6,'yon panel o\'lchami metrda to\'g\'ri');
// 2. Import (metrdan avtomatik mm): 4 panel, qalinlik 16, joylashuv saqlanadi
P.load({panels:[]});
const objs=P._parseOBJ(obj),r=P._objToPanels(objs);
assert.equal(r.made,4);assert.equal(r.skipped,0);
const back=P._state().panels;
assert.equal(back.length,4);
for(const p of back)assert.ok(Math.abs(p.t-16)<1e-3,'qalinlik 16');
const yon=back.find(p=>p.n==='Yon chap');assert.ok(Math.abs(yon.w-500)<1e-3&&Math.abs(yon.h-720)<1e-3&&yon.o==='side');
assert.ok(Math.abs(yon.x+292)<1e-3&&Math.abs(yon.y-360)<1e-3);
// 3. Quti bo'lmagan (uchburchak prizma) o'tkazib yuboriladi
const L=[ 'o Uchburchak','v 0 0 0','v 1 0 0','v 0 1 0','v 0 0 1','v 1 0 1','v 0 1 1','f 1 2 3','f 4 6 5' ].join('\n');
const r2=P._objToPanels(P._parseOBJ(L));assert.equal(r2.made,1,'uchburchak prizma — panel');assert.equal(P._state().panels.slice(-1)[0].pts.length,3);
// 3b. Bir xil qalinlikdagi har qanday prizma: yoysimon qovurg'a (o'yiq bilan), qiya plita, teshikli plita; qalinligi o'zgaruvchan — o'tkaziladi
{const V=[],F=[],O=[];let base=0;const obj=(name,vs,fs)=>{O.push('o '+name);vs.forEach(v=>O.push('v '+v.map(x=>(x/1000).toFixed(6)).join(' ')));fs.forEach(f=>O.push('f '+f.map(i=>i+1+base).join(' ')));base+=vs.length};
  const prism=(name,loop,t,map,holes=[])=>{const n=loop.length,vs=[],fs=[];const all=[loop,...holes];
    for(const z of[0,t])for(const l of all)for(const q of l)vs.push(map(q[0],q[1],z));
    const N=all.reduce((a,l)=>a+l.length,0);let o=0;
    for(const l of all){const m=l.length;for(let i=0;i<m;i++)fs.push([o+i,o+(i+1)%m,N+o+(i+1)%m,N+o+i]);o+=m}
    if(!holes.length){fs.push(loop.map((_,i)=>i));fs.push(loop.map((_,i)=>N+i).reverse())}
    else{const H=holes[0],hb=n;for(const z of[0,N])for(let i=0;i<4;i++)fs.push([z+i,z+(i+1)%4,z+hb+(i+1)%4,z+hb+i])}   // kvadrat va ichki kvadrat orasidagi 4 to'rtburchak qopqoq
    obj(name,vs,fs)};
  const arc=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2/3;arc.push([380*Math.cos(a),380*Math.sin(a)])}arc.push([300*Math.cos(Math.PI*2/3),300*Math.sin(Math.PI*2/3)]);
  for(let i=24;i>=0;i--){const a=i/24*Math.PI*2/3;if(i===12){const c=Math.cos(a),s2=Math.sin(a);arc.push([300*c+8*s2,300*s2-8*c],[330*c+8*s2,330*s2-8*c],[330*c-8*s2,330*s2+8*c],[300*c-8*s2,300*s2+8*c]);continue}arc.push([300*Math.cos(a),300*Math.sin(a)])}   // o'rtada 16×30 o'yiq (ustun uchun)
  prism('Qovurga',arc,16,(u,v,z)=>[u,500+z,-v]);
  const c=Math.cos(Math.PI/6),s3=Math.sin(Math.PI/6);prism('Qiya',[[0,0],[400,0],[400,300],[0,300]],18,(u,v,z)=>[u*c-z*s3+1000,v,u*s3+z*c]);   // Y atrofida 30°
  prism('Teshikli',[[0,0],[400,0],[400,400],[0,400]],16,(u,v,z)=>[u,v,z+2000],[[[150,150],[250,150],[250,250],[150,250]]]);
  O.push('o Pona','v 0 0 0','v 0.1 0 0','v 0.1 0.1 0','v 0 0.1 0','v 0 0 0.01','v 0.1 0 0.03','v 0.1 0.1 0.03','v 0 0.1 0.01','f 1 2 3 4','f 5 8 7 6','f 1 5 6 2','f 2 6 7 3','f 3 7 8 4','f 4 8 5 1');   // qalinligi 10..30 — panel emas
  P.load({panels:[]});const r3=P._objToPanels(P._parseOBJ(O.join('\n')));
  assert.equal(r3.made,3,JSON.stringify(r3));assert.equal(r3.skip.join(),'Pona');
  const ps=P._state().panels,Q=ps.find(p=>p.n==='Qovurga'),T2=ps.find(p=>p.n==='Qiya'),H=ps.find(p=>p.n==='Teshikli');
  assert.equal(Q.o,'flat');assert.equal(Q.t,16);assert.ok(Q.pts&&Q.pts.length>=50,'yoy konturi saqlanadi');assert.ok(Math.abs(Q.y-508)<.01);
  assert.ok(Math.abs(T2.t-18)<.01&&T2.rt,'qiya plita — erkin burchak');assert.ok(Math.abs(T2.w-400)<.01&&Math.abs(T2.h-300)<.01);
  const ang=2*Math.acos(Math.abs(T2.rt[3]))*180/Math.PI;assert.ok(Math.abs(ang-30)<.01||Math.abs(ang-60)<.01,'burchak '+ang);
  assert.equal(H.shape,'rect');assert.equal(H.ops.length,1);assert.equal(H.ops[0].k,'c');assert.equal(H.ops[0].pts.map(q=>q.map(Math.round).join(',')).sort().join(' '),'150,150 150,250 250,150 250,250');
  // markaz: teshikli plita 0..400 × 0..400, z 2000..2016
  assert.ok(Math.abs(H.x-200)<.01&&Math.abs(H.y-200)<.01&&Math.abs(H.z-2008)<.01,JSON.stringify([H.x,H.y,H.z]))}
// 4. List hisobi: 2800x2070, kerf 4, chekka 10
const SW=2800-20,SH=2070-20;
const items=[];for(let i=0;i<12;i++)items.push({w:500,h:500});
let res=P._pack(items,SW,SH,4);assert.equal(res.sheets.length,1);assert.equal(res.unfit.length,0);
const big=[];for(let i=0;i<40;i++)big.push({w:1000,h:700});   // 40 x 0.7 m2 = 28 m2 / 5.8 m2 ~ >=5 list
res=P._pack(big,SW,SH,4);assert.ok(res.sheets.length>=5&&res.sheets.length<=8,'list soni oqilona: '+res.sheets.length);
res=P._pack([{w:3000,h:100}],SW,SH,4);assert.equal(res.unfit.length,1);   // listga sig'maydi
// 5. Kromka: Uz1/Uz2/En1/En2 va metr
P.load({panels:[{id:1,n:'Polka',w:568,h:480,t:16,o:'flat',x:0,y:0,z:0,eb:[2,0,2,1]},{id:2,n:'Tik',w:480,h:568,t:16,o:'front',x:0,y:0,z:0,eb:[2,0,2,1]},{id:3,n:'Yalang',w:300,h:300,t:16,o:'front',x:0,y:0,z:0}]});
const ps=P._state().panels,e1=P._ebInfo(ps[0]),e2=P._ebInfo(ps[1]),e3=P._ebInfo(ps[2]);
assert.equal(e1.txt,'2/2/-/1');assert.ok(Math.abs(e1.len-(0.568*2+0.48))<1e-9);   // eni 568 >= bo'yi 480: uzun tomonlar = past/yuqori
assert.equal(e2.txt,'-/1/2/2');assert.equal(e3.txt,'-');assert.equal(e3.len,0);
const ex=P._clExport({dl:';',dec:'.',kf:'mm',tf:'',hdr:true,mat:false,note:false,rot:false,km:true});
assert.equal(ex.head.slice(0,5).join('|'),['Uzunlik','Eni','Soni','Nomi','Qalinlik'].join('|'));assert.ok(ex.head.includes('L1')&&ex.head.includes('W1')&&ex.head.includes('Kromka (m)'));
const pol=ex.rows.find(r=>r[3]==='Polka');assert.ok(pol);assert.equal(ex.rows.length,3);
const sl=P._edgeSlots(ps[0]);assert.ok(sl.L.length===2&&sl.W.length===2,'to\'rtburchakda 2 ta L va 2 ta W');
assert.equal(ex.name,'raskroy.csv');assert.ok(ex.text.split('\r\n')[0].startsWith('Uzunlik;Eni;Soni;Nomi;Qalinlik'));
// 6. Stretch: hamma nuqta belgilansa panel qalinlik o'qi bo'ylab ham ko'chadi (flat panel, Y -100)
P.load({panels:[{id:1,n:'Polka',w:568,h:480,t:16,o:'flat',x:0,y:300,z:0}]});
let st=P._stretch(1,[0,1,2,3],{x:0,y:-100,z:0});assert.equal(st.y,200);assert.equal(st.w,568);assert.equal(st.h,480);
st=P._stretch(1,[0,1,2,3],{x:50,y:0,z:0});assert.equal(st.x,50);assert.equal(st.w,568);
P.load({panels:[{id:2,n:'Yon',w:500,h:720,t:16,o:'side',x:0,y:0,z:0}]});
st=P._stretch(2,[0,1,2,3],{x:-100,y:0,z:0});assert.equal(st.x,-100);assert.equal(st.w,500);
// 7. Tekstura: L doim tekstura bo'ylab, aylantirish 0, Tekstura 1; kromka L qirralari tekstura bo'ylab
P.load({panels:[{id:1,n:'Eshik',w:300,h:800,t:16,o:'front',x:0,y:0,z:0,gr:'w',eb:[1,2,1,2]},{id:2,n:'Polka',w:568,h:480,t:16,o:'flat',x:0,y:0,z:0}]});
const gx=P._clExport({dl:';',dec:'.',kf:'mm',tf:'',hdr:true,mat:false,note:false,rot:true,tex:true,km:false});
assert.equal(gx.head.join('|'),'Uzunlik|Eni|Soni|Nomi|Qalinlik|Aylantirish|Tekstura|L1|L2|W1|W2');
const ge=gx.rows.find(r=>r[3]==='Eshik');assert.equal(ge.slice(0,2).join('x'),'300x800');assert.equal(ge[5],0);assert.equal(ge[6],1);
assert.equal(ge.slice(7).join(','),'1,1,2,2','L qirralar (eni bo\'ylab, 300 mm) = 1 mm');
const gp=gx.rows.find(r=>r[3]==='Polka');assert.equal(gp.slice(0,2).join('x'),'568x480');assert.equal(gp[5],1);assert.equal(gp[6],0);
console.log('panel3d-export: ok');
