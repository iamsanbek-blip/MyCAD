function flatten(path){
  const out=[];
  for(const n of path){
    if(n.arc&&n.from){
      const {cx,cy,r,ccw,sweep}=n.arc;
      const a0=Math.atan2(n.from.y-cy,n.from.x-cx);
      const N=Math.max(8,Math.ceil(sweep/0.05));
      for(let k=0;k<=N;k++){const a=a0+(ccw?1:-1)*sweep*k/N;
        out.push({x:cx+r*Math.cos(a),y:cy+r*Math.sin(a)});}
    } else out.push({x:n.x,y:n.y});
  }
  return out;
}
function segInt(p1,p2,p3,p4){
  const d=(p2.x-p1.x)*(p4.y-p3.y)-(p2.y-p1.y)*(p4.x-p3.x);
  if(Math.abs(d)<1e-12)return false;
  const t=((p3.x-p1.x)*(p4.y-p3.y)-(p3.y-p1.y)*(p4.x-p3.x))/d;
  const u=((p3.x-p1.x)*(p2.y-p1.y)-(p3.y-p1.y)*(p2.x-p1.x))/d;
  return t>1e-9&&t<1-1e-9&&u>1e-9&&u<1-1e-9;
}
function selfIntersects(pts){
  const n=pts.length;
  for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;
    if(segInt(pts[i],pts[(i+1)%n],pts[j],pts[(j+1)%n]))return true;
  }
  return false;
}
module.exports={flatten,selfIntersects};
