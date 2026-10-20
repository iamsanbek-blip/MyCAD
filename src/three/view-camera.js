import * as THREE from 'three';
export function viewCamera(direction,center,size,aspect){
 const distance=Math.max(200,size*1.7),span=Math.max(100,size*.65);
 const camera=direction==='iso'?new THREE.PerspectiveCamera(42,aspect,.1,1000000):new THREE.OrthographicCamera(-span*aspect,span*aspect,span,-span,.1,1000000);
 camera.up.set(...((direction==='top'||direction==='bottom')?[0,1,0]:[0,0,1]));
 const vectors={top:[0,0,1],bottom:[0,0,-1],front:[0,-1,0],side:[1,0,0],right:[1,0,0],left:[-1,0,0],back:[0,1,0],iso:[1,-1,.8]};camera.position.copy(center).add(new THREE.Vector3(...vectors[direction]).normalize().multiplyScalar(distance));camera.lookAt(center);camera.updateMatrixWorld(true);return camera;
}
