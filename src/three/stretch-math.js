import * as THREE from 'three';
export function panelCorner(p,i){const v=p.outline[i];return new THREE.Vector3((v.x-p.baseWidth/2)*p.width/p.baseWidth,(v.y-p.baseHeight/2)*p.height/p.baseHeight,0).applyEuler(new THREE.Euler(...p.rotation.map(THREE.MathUtils.degToRad))).add(new THREE.Vector3(...p.position));}
export function stretchedPanel(p,indices,worldDelta,validate=true){
 const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation.map(THREE.MathUtils.degToRad))),d=worldDelta.clone().applyQuaternion(q.clone().invert());
 const pts=p.outline.map((v,i)=>({x:(v.x-p.baseWidth/2)*p.width/p.baseWidth+(indices.has(i)?d.x:0),y:(v.y-p.baseHeight/2)*p.height/p.baseHeight+(indices.has(i)?d.y:0)}));
 const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
 if(!Number.isFinite(w+h)||w<.001||h<.001||w>1e6||h>1e6)throw Error('Stretch o‘lchami yaroqsiz.');
 if(validate){if(pts.length>2000)throw Error('Stretch uchun kontur nuqtalarini 2000 tagacha soddalashtiring.');const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);let area=0;
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-6)throw Error('Burchaklar ustma-ust tushdi.');area+=a.x*b.y-b.x*a.y;for(let j=i+2;j<pts.length;j++){if(i===0&&j===pts.length-1)continue;const c=pts[j],e=pts[(j+1)%pts.length];const overlap=Math.max(Math.min(a.x,b.x),Math.min(c.x,e.x))<=Math.min(Math.max(a.x,b.x),Math.max(c.x,e.x))+1e-8&&Math.max(Math.min(a.y,b.y),Math.min(c.y,e.y))<=Math.min(Math.max(a.y,b.y),Math.max(c.y,e.y))+1e-8;if(overlap&&cross(a,b,c)*cross(a,b,e)<=0&&cross(c,e,a)*cross(c,e,b)<=0)throw Error('Kontur o‘zini kesib o‘tdi.');}}
  if(Math.abs(area)<1e-6)throw Error('Kontur maydoni nol.');
 }
 const shift=new THREE.Vector3(x+w/2,y+h/2,0).applyQuaternion(q);return {...p,outline:pts.map(v=>({x:v.x-x,y:v.y-y})),baseWidth:w,baseHeight:h,width:w,height:h,position:p.position.map((v,i)=>v+shift.getComponent(i))};
}
