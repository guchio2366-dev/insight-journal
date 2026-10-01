import {lambertForward} from '../../src/lib/atlas-mexico-projection.mjs';

const polygons=f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
const key=p=>p.join(',');
const orient=(a,b,c)=>{const x=(b[0]-a[0])*(c[1]-a[1]),y=(b[1]-a[1])*(c[0]-a[0]),d=x-y;return Math.abs(d)<=3.3306690738754716e-16*(Math.abs(x)+Math.abs(y))?0:Math.sign(d);};
const proper=(a,b,c,d)=>orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0;
const area=ring=>{const o=ring[0];let s=0;for(let i=0;i<ring.length-1;i++)s+=(ring[i][0]-o[0])*(ring[i+1][1]-o[1])-(ring[i+1][0]-o[0])*(ring[i][1]-o[1]);return s/2;};
const bounds=ring=>{const b=[Infinity,Infinity,-Infinity,-Infinity];for(const [x,y]of ring){b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}return b;};
const relation=(point,ring)=>{let inside=false;for(let i=0,j=ring.length-2;i<ring.length-1;j=i++){
 const a=ring[j],b=ring[i];if(orient(a,b,point)===0&&point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]))return 2;
 if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside?1:0;};
const inPolygon=(point,polygon,original=false)=>{const field=original?'originalNative':'native',outer=relation(point,polygon.rings[0][field]);if(outer!==1)return outer;for(const hole of polygon.rings.slice(1)){const r=relation(point,hole[field]);if(r===1)return 0;if(r===2)return 2;}return 1;};

// Validate in the same Lambert plane used to draw the map. Retained vertices
// remain an ordered source subsequence, allowing each new chord to be checked
// against its original chain rather than treating source defects as new ones.
export function geometryTopologyIssues(sourceFeatures,features){
 const sources=new Map(sourceFeatures.map(f=>[f.properties.cve_ent??f.properties.code,f]));
 const records=[],polygonRecords=[],issues=[];
 for(const f of features){const code=f.properties.code??f.properties.cve_ent,original=sources.get(code),from=polygons(original),to=polygons(f);
  for(let p=0;p<to.length;p++){const poly={code,index:p,rings:[]};polygonRecords.push(poly);
   for(let r=0;r<to[p].length;r++){const ring=to[p][r],originalRing=from[p][r],native=ring.map(lambertForward),originalNative=originalRing.map(lambertForward),n=originalRing.length-1;
    const start=originalRing.findIndex(p=>key(p)===key(ring[0])),indices=[start];let cursor=start;
    for(let i=1;i<ring.length;i++){let next=cursor+1;while(next<=start+n&&key(originalRing[next%n])!==key(ring[i]))next++;if(next>start+n)throw Error('Derived ring is not an ordered source subsequence');indices.push(next);cursor=next;}
    const record={id:`${code}:${p}:${r}`,code,p,r,native,originalNative,indices,bounds:bounds(native)};records.push(record);poly.rings.push(record);
    if(Math.sign(area(native))!==Math.sign(area(originalNative)))issues.push({kind:'orientation',rings:[record.id]});
   }
  }
 }
 for(const poly of polygonRecords)for(const hole of poly.rings.slice(1))for(const point of hole.native)if(relation(point,poly.rings[0].native)===0&&relation(point,poly.rings[0].originalNative)!==0){issues.push({kind:'hole-containment',rings:[hole.id,poly.rings[0].id]});break;}
 for(let i=0;i<polygonRecords.length;i++)for(let j=i+1;j<polygonRecords.length;j++){
  const a=polygonRecords[i],b=polygonRecords[j];if(a.code!==b.code)continue;const aa=a.rings[0].bounds,bb=b.rings[0].bounds;if(aa[0]>bb[2]||bb[0]>aa[2]||aa[1]>bb[3]||bb[1]>aa[3])continue;
  for(const [child,parent]of [[a,b],[b,a]]){const point=child.rings[0].native[0];if(inPolygon(point,parent)===1&&inPolygon(point,parent,true)!==1)issues.push({kind:'polygon-containment',rings:[child.rings[0].id,parent.rings[0].id]});}
 }
 const baselineCross=(a,b)=>{const ar=a.record,br=b.record,na=ar.originalNative.length-1,nb=br.originalNative.length-1;for(let i=ar.indices[a.index];i<ar.indices[a.index+1];i++)for(let j=br.indices[b.index];j<br.indices[b.index+1];j++)if(proper(ar.originalNative[i%na],ar.originalNative[(i+1)%na],br.originalNative[j%nb],br.originalNative[(j+1)%nb]))return true;return false;};
 const cells=new Map(),step=1000;
 for(const record of records)for(let i=0;i<record.native.length-1;i++){
  const a=record.native[i],b=record.native[i+1];if(a[0]===b[0]&&a[1]===b[1])continue;
  const segment={record,index:i,a,b,x0:Math.floor(Math.min(a[0],b[0])/step),x1:Math.floor(Math.max(a[0],b[0])/step),y0:Math.floor(Math.min(a[1],b[1])/step),y1:Math.floor(Math.max(a[1],b[1])/step)};
  for(let x=segment.x0;x<=segment.x1;x++)for(let y=segment.y0;y<=segment.y1;y++){
   const cell=`${x}:${y}`,others=cells.get(cell)??[];
   for(const other of others){
    if(x!==Math.max(segment.x0,other.x0)||y!==Math.max(segment.y0,other.y0))continue;
    if(record===other.record&&(Math.abs(i-other.index)<=1||(i===record.native.length-2&&other.index===0)))continue;
    if(Math.max(a[0],b[0])<Math.min(other.a[0],other.b[0])||Math.min(a[0],b[0])>Math.max(other.a[0],other.b[0])||Math.max(a[1],b[1])<Math.min(other.a[1],other.b[1])||Math.min(a[1],b[1])>Math.max(other.a[1],other.b[1]))continue;
    if(proper(a,b,other.a,other.b)&&!baselineCross(segment,other))issues.push({kind:'intersection',rings:[record.id,other.record.id],segments:[i,other.index]});
   }
   others.push(segment);cells.set(cell,others);
  }
 }
 return issues;
}
