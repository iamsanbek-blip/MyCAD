import * as THREE from 'three';
// Local anchors include both skin surfaces and thickness edges: never flatten Z.
export function panelAnchors(p,types={vertex:true,midpoint:true,center:true}){
 const pts=p.outline.map(v=>new THREE.Vector3((v.x-p.baseWidth/2)*p.width/p.baseWidth,(v.y-p.baseHeight/2)*p.height/p.baseHeight,0)),out=[];
 const add=(v,type)=>out.push({point:v,type});
 for(const z of [-p.thickness/2,p.thickness/2]){
  for(let i=0;i<pts.length;i++){const a=pts[i].clone().setZ(z),b=pts[(i+1)%pts.length].clone().setZ(z);if(types.vertex||types.endpoint)add(a,'Vertex / Endpoint');if(types.midpoint)add(a.clone().add(b).multiplyScalar(.5),'Midpoint');}
  if(types.center)add(new THREE.Vector3(0,0,z),'Center');
 }
 if(types.midpoint)pts.forEach(p=>add(p.clone(),'Midpoint'));
 return out;
}
export function worldAnchors(mesh,types){mesh.updateMatrixWorld(true);const p=mesh.userData.panel;const rigid=new THREE.Matrix4().compose(mesh.position,mesh.quaternion,new THREE.Vector3(1,1,1));return panelAnchors({...p,width:p.baseWidth*mesh.scale.x,height:p.baseHeight*mesh.scale.y},types).map(a=>({...a,point:a.point.applyMatrix4(rigid),mesh}));}
export function anchorTranslation(source,target,position){return position.clone().add(target).sub(source);}

// Placement may snap through visible panels; hidden panels remain excluded.
export function nearestAnchor(camera,meshes,screen,types,{through=false,radius=18,locked=null}={}){
 const ray=new THREE.Raycaster();let best=null,distance=radius,depthBest=Infinity;
 meshes=meshes.filter(m=>m.visible);camera.updateMatrixWorld(true);
 if(locked&&meshes.includes(locked.mesh)){const q=locked.point.clone().project(camera),x=(q.x+1)*screen.width/2,y=(1-q.y)*screen.height/2;if(q.z>=-1&&q.z<=1&&Math.hypot(x-screen.x,y-screen.y)<=24)return {...locked,x,y};}
 for(const mesh of meshes)for(const a of worldAnchors(mesh,types)){
  const q=a.point.clone().project(camera);if(q.z < -1 || q.z > 1)continue;
  const x=(q.x+1)*screen.width/2,y=(1-q.y)*screen.height/2;
  const d=Math.hypot(x-screen.x,y-screen.y);if(d>distance+.001)continue;
  ray.setFromCamera(new THREE.Vector2(q.x,q.y),camera);
  const depth=a.point.distanceTo(ray.ray.origin);
  if(!through){const hit=ray.intersectObjects(meshes,false)[0];if(hit&&hit.distance<depth-Math.max(.05,depth*1e-5))continue;}
  if(d<distance-.001||(Math.abs(d-distance)<=.001&&depth<depthBest)){distance=d;depthBest=depth;best={...a,x,y};}
 }
 return best;
}
