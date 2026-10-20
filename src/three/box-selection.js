import * as THREE from 'three';
// Window selection: every projected geometry vertex must be inside the rectangle.
export function panelsInRectangle(meshes,camera,rect,size){
 camera.updateMatrixWorld(true);const ids=[];
 for(const m of meshes){if(!m.visible)continue;m.updateMatrixWorld(true);const a=m.geometry.getAttribute('position');let inside=!!a?.count;
  for(let i=0;inside&&i<a.count;i++){const q=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).project(camera);const x=(q.x+1)*size.width/2,y=(1-q.y)*size.height/2;inside=q.z>=-1&&q.z<=1&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom;}
  if(inside)ids.push(m.userData.panel.id);
 }return ids;
}
