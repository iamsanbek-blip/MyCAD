import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
// Offline renderer. Page data and undo live in the UI adapter, not in Three objects.
window.createRugby3DViewport=function(host,cb){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#202833');
 const camera=new THREE.PerspectiveCamera(42,1,.1,1000000);camera.up.set(0,0,1);camera.position.set(1200,-1400,1100);
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.target.set(0,0,150);orbit.update();
 const gizmo=new TransformControls(camera,renderer.domElement);scene.add(gizmo.getHelper());
 scene.add(new THREE.HemisphereLight(0xffffff,0x546070,2.4));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(500,-800,1500);scene.add(light);
 const grid=new THREE.GridHelper(10000,100,0x56677a,0x354252);grid.rotation.x=Math.PI/2;scene.add(grid,new THREE.AxesHelper(300));
 const objects=new THREE.Group(),guides=new THREE.Group();scene.add(objects,guides);
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
 let selected=null,ortho=true,start=null,lineMode=false,lineStart=null,down=null,disposed=false;
 const render=()=>{if(!disposed)renderer.render(scene,camera);};
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);render();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function clear(group){for(const o of [...group.children]){group.remove(o);o.traverse(n=>{n.geometry?.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());});}}
 function build(p){const shape=new THREE.Shape(p.outline.map(v=>new THREE.Vector2(v.x-p.baseWidth/2,v.y-p.baseHeight/2)));
  const geo=new THREE.ExtrudeGeometry(shape,{depth:p.thickness,bevelEnabled:false,steps:1});geo.translate(0,0,-p.thickness/2);
  const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:p.id===selected?0x54d8f0:0xc3a67b,roughness:.8}));
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x182536})));
  mesh.position.fromArray(p.position);mesh.rotation.set(...p.rotation.map(THREE.MathUtils.degToRad));mesh.scale.set(p.width/p.baseWidth,p.height/p.baseHeight,1);mesh.userData.panel=p;objects.add(mesh);
 }
 function select(id){selected=id;gizmo.detach();for(const m of objects.children){m.material.color.set(m.userData.panel.id===id?0x54d8f0:0xc3a67b);if(m.userData.panel.id===id&&!lineMode)gizmo.attach(m);}render();}
 function sync(data,lines){gizmo.detach();clear(objects);clear(guides);data.panels.forEach(build);for(const l of lines){if(!l.points||l.points.length<2)continue;const pts=l.points.map(p=>new THREE.Vector3(p.x,p.y,0));if(l.closed)pts.push(pts[0].clone());guides.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:l.color||0xff7078})));}select(selected);}
 function setMode(v){gizmo.setMode(v);gizmo.setSpace(v==='scale'?'local':'world');gizmo.showZ=v!=='scale';render();}
 function setOrtho(on){ortho=on;gizmo.setTranslationSnap(on?1:null);gizmo.setRotationSnap(on?Math.PI/2:null);gizmo.setScaleSnap(on?.05:null);render();}
 orbit.addEventListener('change',render);gizmo.addEventListener('change',render);
 gizmo.addEventListener('mouseDown',()=>{const m=gizmo.object;start=m?{position:m.position.clone(),rotation:m.rotation.clone(),scale:m.scale.clone()}:null;});
 gizmo.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;});
 gizmo.addEventListener('objectChange',()=>{const m=gizmo.object;if(m){m.scale.z=1;m.scale.x=Math.max(.0001,m.scale.x);m.scale.y=Math.max(.0001,m.scale.y);}render();});
 gizmo.addEventListener('mouseUp',()=>{const m=gizmo.object;if(!m||!start)return;start=null;cb.transform(m.userData.panel.id,{position:m.position.toArray(),rotation:[m.rotation.x,m.rotation.y,m.rotation.z].map(THREE.MathUtils.radToDeg),width:m.userData.panel.baseWidth*m.scale.x,height:m.userData.panel.baseHeight*m.scale.y});});
 function cast(e){const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);}
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,gizmo:!!gizmo.axis};});
 renderer.domElement.addEventListener('pointerup',e=>{if(e.button!==0||!down||down.gizmo||Math.hypot(e.clientX-down.x,e.clientY-down.y)>4)return;cast(e);
  if(lineMode){const v=ray.ray.intersectPlane(plane,new THREE.Vector3());if(!v)return;if(!lineStart){lineStart=v;cb.message('Ikkinchi nuqtani bosing. Esc — bekor.');}else{if(ortho){if(Math.abs(v.x-lineStart.x)>Math.abs(v.y-lineStart.y))v.y=lineStart.y;else v.x=lineStart.x;}if(v.distanceTo(lineStart)>.001)cb.line({x:lineStart.x,y:lineStart.y},{x:v.x,y:v.y});lineStart=null;}return;}
  cb.select(ray.intersectObjects(objects.children,false)[0]?.object.userData.panel.id||null);
 });
 function fit(direction='iso'){const box=new THREE.Box3().setFromObject(objects);if(box.isEmpty())box.setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(800,800,300));const c=box.getCenter(new THREE.Vector3()),d=box.getSize(new THREE.Vector3()).length();orbit.target.copy(c);const dirs={top:[0,.001,1],front:[0,-1,.001],side:[1,0,.001],iso:[1,-1,.8]};camera.position.copy(c).add(new THREE.Vector3(...dirs[direction]).normalize().multiplyScalar(Math.max(200,d*1.7)));orbit.update();render();}
 function cancel(){lineStart=null;if(start&&gizmo.object){gizmo.reset();gizmo.object.position.copy(start.position);gizmo.object.rotation.copy(start.rotation);gizmo.object.scale.copy(start.scale);start=null;}render();}
 setMode('translate');setOrtho(true);resize();
 return{sync,select,setMode,setOrtho,fit,resize,cancel,renderer,scene,camera,gizmo,objects,
  setGuides:on=>{guides.visible=on;render();},setLine:on=>{lineMode=on;lineStart=null;orbit.enableRotate=!on;if(on)gizmo.detach();else select(selected);render();},
  dispose:()=>{disposed=true;observer.disconnect();orbit.dispose();gizmo.dispose();clear(objects);clear(guides);renderer.dispose();renderer.domElement.remove();}};
};
