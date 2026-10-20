const test=require('node:test'),assert=require('node:assert/strict'),THREE=require('three'),P=require('../app/js/core/panel-model.js');
require('esbuild').buildSync({entryPoints:['src/three/anchors.js'],outfile:'/tmp/rugby-anchor-test.cjs',bundle:true,platform:'node',format:'cjs'});
const {panelAnchors,worldAnchors,anchorTranslation}=require('/tmp/rugby-anchor-test.cjs');
const p=P.instantiate(P.template([{x:0,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}]));
test('anchors on both surfaces exactly 16mm apart; type filters work',()=>{const a=panelAnchors(p,{vertex:true});assert.equal(a.length,8);assert.equal(a[0].point.distanceTo(a[4].point),16);assert.equal(panelAnchors(p,{}).length,0);assert.equal(panelAnchors(p,{midpoint:true}).length,12);});
test('arbitrary rotation and planar scale retain thickness; exact point-to-point placement',()=>{const m=new THREE.Object3D();m.userData.panel=p;m.position.set(12,60,-30);m.rotation.set(.34,1.2,-.7);m.scale.set(2,.5,1);const a=worldAnchors(m,{vertex:true});assert.ok(Math.abs(a[0].point.distanceTo(a[4].point)-16)<1e-8);const source=a[0].point.clone(),target=new THREE.Vector3(-15,800,19),pos=anchorTranslation(source,target,m.position);m.position.copy(pos);assert.ok(worldAnchors(m,{vertex:true})[0].point.distanceTo(target)<1e-8);});
require('esbuild').buildSync({entryPoints:['src/three/view-camera.js'],outfile:'/tmp/rugby-camera-test.cjs',bundle:true,platform:'node',format:'cjs'});
const {viewCamera}=require('/tmp/rugby-camera-test.cjs');
test('front/side/top use orthographic projection; iso stays perspective',()=>{for(const view of ['front','side','top','left','right','back']){const camera=viewCamera(view,new THREE.Vector3(),1000,1.5);assert.equal(camera.isOrthographicCamera,true);const a=new THREE.Vector3(10,20,30),b=a.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(500));const ap=a.project(camera),bp=b.project(camera);assert.ok(Math.abs(ap.x-bp.x)<1e-8&&Math.abs(ap.y-bp.y)<1e-8);}assert.equal(viewCamera('iso',new THREE.Vector3(),1000,1.5).isPerspectiveCamera,true);});

require('esbuild').buildSync({entryPoints:['src/three/visibility.js'],outfile:'/tmp/rugby-visibility-test.cjs',bundle:true,platform:'node',format:'cjs'});
const {createVisibility}=require('/tmp/rugby-visibility-test.cjs');
test('visibility survives same-page rebuild, isolation excludes others, unhide and page reset restore panels',()=>{const v=createVisibility();v.sync('pageA',['a','b']);v.hide('a');assert.equal(v.visible('a'),false);v.sync('pageA',['a','b']);assert.equal(v.visible('a'),false);v.isolate('b');assert.equal(v.visible('b'),true);assert.equal(v.visible('a'),false);v.all();assert.equal(v.visible('a'),true);v.isolate('b');v.sync('pageB',['a','b']);assert.equal(v.visible('a'),true);assert.equal(v.visible('b'),true);});
test('opposite view pairs have opposing viewing directions',()=>{for(const [a,b] of [['left','right'],['front','back']]){const ca=viewCamera(a,new THREE.Vector3(),1000,1),cb=viewCamera(b,new THREE.Vector3(),1000,1);assert.ok(ca.getWorldDirection(new THREE.Vector3()).dot(cb.getWorldDirection(new THREE.Vector3()))<-.99999);}});

test('placement finds B behind another panel; ordinary hover occludes it and hidden targets stay excluded',()=>{
 const {nearestAnchor}=require('/tmp/rugby-anchor-test.cjs');
 const camera=new THREE.PerspectiveCamera(45,1,1,10000);camera.position.set(0,0,1000);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
 function mesh(z){const m=new THREE.Mesh(new THREE.BoxGeometry(600,400,16),new THREE.MeshBasicMaterial());m.position.z=z;m.userData.panel=p;m.updateMatrixWorld(true);return m;}
 const target=mesh(0),blocker=mesh(150);
 // Blocker is visible but has no anchor at the target's projected corner.
 blocker.scale.set(2,2,1);blocker.updateMatrixWorld(true);
 const corner=worldAnchors(target,{vertex:true})[4],q=corner.point.clone().project(camera);
 const screen={width:800,height:800,x:(q.x+1)*400,y:(1-q.y)*400};
 assert.equal(nearestAnchor(camera,[target,blocker],screen,{vertex:true}),null);
 const b=nearestAnchor(camera,[target,blocker],screen,{vertex:true},{through:true});
 assert.equal(b.mesh,target);assert.ok(b.point.distanceTo(corner.point)<1e-8);
 const source=new THREE.Vector3(100,200,300),original=new THREE.Vector3(10,20,30);
 assert.ok(source.clone().add(anchorTranslation(source,b.point,original).sub(original)).distanceTo(b.point)<1e-8);
 target.visible=false;assert.equal(nearestAnchor(camera,[target,blocker],screen,{vertex:true},{through:true}),null);
});
test('profile extrusion preserves XY footprint, starts at Z=0 and keeps material thickness on resize',()=>{
 for(const [w,h] of [[16,500],[450,16]])for(const angle of [0,.47]){
  const points=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>({x:100+x*Math.cos(angle)-y*Math.sin(angle),y:200+x*Math.sin(angle)+y*Math.cos(angle)}));
  const panel=P.extrude(points,500),m=new THREE.Object3D();m.userData.panel=panel;m.position.fromArray(panel.position);m.rotation.set(...panel.rotation.map(THREE.MathUtils.degToRad));const anchors=worldAnchors(m,{vertex:true});
  assert.ok(Math.abs(panel.thickness-16)<1e-8);assert.equal(panel.height,500);assert.ok(Math.abs(Math.min(...anchors.map(a=>a.point.z)))<1e-8);assert.ok(Math.abs(Math.max(...anchors.map(a=>a.point.z))-500)<1e-8);
  for(const v of points)for(const z of [0,500])assert.ok(anchors.some(a=>a.point.distanceTo(new THREE.Vector3(v.x,v.y,z))<1e-7));
  assert.ok(Math.abs(P.update(panel,{height:750}).thickness-16)<1e-8);
 }
});
test('snap retains a locked anchor within release radius and releases it outside',()=>{const {nearestAnchor}=require('/tmp/rugby-anchor-test.cjs');const camera=viewCamera('top',new THREE.Vector3(),1000,1),m=new THREE.Object3D();m.userData.panel=p;const a=worldAnchors(m,{vertex:true})[4],q=a.point.clone().project(camera),screen={width:800,height:800,x:(q.x+1)*400+20,y:(1-q.y)*400};const held=nearestAnchor(camera,[m],screen,{vertex:true},{through:true,locked:a});assert.ok(held.point.distanceTo(a.point)<1e-8);assert.equal(nearestAnchor(camera,[m],{...screen,x:5000},{vertex:true},{through:true,locked:a}),null);});
