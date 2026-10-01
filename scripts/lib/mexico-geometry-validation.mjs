const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function ringIntersections(ring) {
 const result=[],cells=new Map(),tested=new Set(),step=ring.length>10000?.008:.06;
 for(let i=0;i<ring.length-1;i++){
  const a=ring[i],b=ring[i+1],x0=Math.floor(Math.min(a[0],b[0])/step),x1=Math.floor(Math.max(a[0],b[0])/step),y0=Math.floor(Math.min(a[1],b[1])/step),y1=Math.floor(Math.max(a[1],b[1])/step);
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
   const key=`${x}:${y}`,others=cells.get(key)??[];
   for(const j of others){if(Math.abs(i-j)<=1||(i===ring.length-2&&j===0))continue;const pair=`${j}:${i}`;if(tested.has(pair))continue;tested.add(pair);const c=ring[j],d=ring[j+1];if(cross(a,b,c)*cross(a,b,d)<-1e-20&&cross(c,d,a)*cross(c,d,b)<-1e-20)result.push([j,i]);}
   others.push(i);cells.set(key,others);
  }
 }
 return result;
}
export function geometryIntersections(features) {
 const result=[];
 for(const feature of features){const polys=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];
  for(let p=0;p<polys.length;p++)for(let r=0;r<polys[p].length;r++)for(const segments of ringIntersections(polys[p][r]))result.push({state:feature.properties.code,polygonIndex:p,ringIndex:r,segments});
 }
 return result;
}
