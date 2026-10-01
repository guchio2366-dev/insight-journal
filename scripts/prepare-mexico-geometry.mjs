import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {lambertForward,mexicoProjection} from '../src/lib/atlas-mexico-projection.mjs';
import {geometryTopologyIssues} from './lib/mexico-geometry-topology.mjs';
const input=process.argv[2]??'../research/inegi-geo-states-response.json';
const raw=await readFile(input),source=JSON.parse(raw);
if(source.type!=='FeatureCollection'||source.features.length!==32)throw new Error('Expected 32 official state geometries');
const names=['アグアスカリエンテス','バハ・カリフォルニア','バハ・カリフォルニア・スル','カンペチェ','コアウイラ','コリマ','チアパス','チワワ','メキシコ市','ドゥランゴ','グアナフアト','ゲレロ','イダルゴ','ハリスコ','メヒコ州','ミチョアカン','モレロス','ナヤリット','ヌエボ・レオン','オアハカ','プエブラ','ケレタロ','キンタナ・ロー','サン・ルイス・ポトシ','シナロア','ソノラ','タバスコ','タマウリパス','トラスカラ','ベラクルス','ユカタン','サカテカス'];
const rings=g=>g.type==='MultiPolygon'?g.coordinates.flat():g.coordinates;
let bounds=[Infinity,Infinity,-Infinity,-Infinity],originalVertices=0;
const neighbors=new Map();
const key=p=>p.join(',');
for(const feature of source.features)for(const ring of rings(feature.geometry)) {
  originalVertices+=ring.length;
  for(let i=0;i<ring.length-1;i++) {
    const a=key(ring[i]),b=key(ring[i+1]);
    if(a===b)continue;
    if(!neighbors.has(a))neighbors.set(a,new Set());if(!neighbors.has(b))neighbors.set(b,new Set());
    neighbors.get(a).add(b);neighbors.get(b).add(a);
    const [x,y]=lambertForward(ring[i]);bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];
  }
}
const scale=Math.min(844/(bounds[2]-bounds[0]),524/(bounds[3]-bounds[1]));
// Shared arcs are simplified once, in the official Lambert plane. 0.18 display
// pixel is a national locator tolerance, not a cadastral or area measurement.
const toleranceM=.18/scale,arcCache=new Map(),arcTolerances=new Map(),ringArcs=new Map();
let currentRing='';
const distanceSquared=(p,a,b)=>{let x=a[0],y=a[1],dx=b[0]-x,dy=b[1]-y;if(dx||dy){let u=((p[0]-x)*dx+(p[1]-y)*dy)/(dx*dx+dy*dy);u=Math.max(0,Math.min(1,u));x+=u*dx;y+=u*dy;}return (p[0]-x)**2+(p[1]-y)**2;};
function dp(points,tolerance=toleranceM) {
  if(points.length<3)return points;
  const projected=points.map(lambertForward),keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
  while(stack.length){const [a,b]=stack.pop();let max=tolerance**2,index=-1;for(let i=a+1;i<b;i++){const d=distanceSquared(projected[i],projected[a],projected[b]);if(d>max){max=d;index=i;}}if(index>=0){keep.add(index);stack.push([a,index],[index,b]);}}
  return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
function arc(points) {
  const forward=points.map(key).join(';'),reverse=points.slice().reverse().map(key).join(';'),rev=reverse<forward,canonical=rev?reverse:forward;
  if(!ringArcs.has(currentRing))ringArcs.set(currentRing,new Set());ringArcs.get(currentRing).add(canonical);
  if(!arcCache.has(canonical))arcCache.set(canonical,dp(rev?points.slice().reverse():points,arcTolerances.get(canonical)??toleranceM));
  const result=arcCache.get(canonical);return rev?result.slice().reverse():result;
}
function simplifyRing(ring,id) {
  currentRing=id;
  const points=ring.slice(0,-1),junctions=[];
  for(let i=0;i<points.length;i++)if(neighbors.get(key(points[i]))?.size!==2)junctions.push(i);
  if(!junctions.length) {
    let anchor=0;for(let i=1;i<points.length;i++)if(key(points[i])<key(points[anchor]))anchor=i;
    points.push(...points.splice(0,anchor));
    const half=Math.floor(points.length/2),closed=[...points,points[0]];
    const result=[...arc(closed.slice(0,half+1)).slice(0,-1),...arc(closed.slice(half))];
    return result.length>=4?result:ring;
  }
  const start=junctions[0],closed=[...points.slice(start),...points.slice(0,start),points[start]],result=[];
  let from=0;
  for(let i=1;i<closed.length;i++)if(i===closed.length-1||neighbors.get(key(closed[i]))?.size!==2){result.push(...arc(closed.slice(from,i+1)).slice(0,-1));from=i;}
  result.push(result[0]);return result.length>=4?result:ring;
}
const ringArea=ring=>ring.slice(1).reduce((sum,p,i)=>sum+ring[i][0]*p[1]-p[0]*ring[i][1],0)/2;
function labelPoint(g) {
  const outer=rings(g).reduce((a,b)=>Math.abs(ringArea(b))>Math.abs(ringArea(a))?b:a);
  const area=ringArea(outer);let x=0,y=0;
  for(let i=0;i<outer.length-1;i++){const a=outer[i],b=outer[i+1],cross=a[0]*b[1]-b[0]*a[1];x+=(a[0]+b[0])*cross;y+=(a[1]+b[1])*cross;}
  return [x/(6*area),y/(6*area)];
}
let outputVertices=0,features=[],validationPasses=0;
for(let pass=0;pass<12;pass++){
arcCache.clear();ringArcs.clear();outputVertices=0;
features=source.features.map(feature=>{
  const code=feature.properties.cve_ent;
  const geometry=feature.geometry.type==='MultiPolygon'?{type:'MultiPolygon',coordinates:feature.geometry.coordinates.map((poly,p)=>poly.map((ring,r)=>simplifyRing(ring,`${code}:${p}:${r}`)))}:{type:'Polygon',coordinates:feature.geometry.coordinates.map((ring,r)=>simplifyRing(ring,`${code}:0:${r}`))};
  for(const ring of rings(geometry))outputVertices+=ring.length;
  return {type:'Feature',properties:{code,cve_ent:code,cvegeo:code,name:feature.properties.nomgeo,nameJa:names[Number(code)-1],label:labelPoint(feature.geometry)},geometry};
});
const invalid=geometryTopologyIssues(source.features,features);validationPasses=pass+1;
console.log(JSON.stringify({pass,outputVertices,topologyIssues:invalid.length,kinds:invalid.reduce((o,x)=>(o[x.kind]=(o[x.kind]??0)+1,o),{})}));
if(!invalid.length)break;
if(pass===11)throw new Error('Geometry simplification introduced unresolved topology defects');
for(const id of new Set(invalid.flatMap(hit=>hit.rings)))for(const key of ringArcs.get(id)??[])arcTolerances.set(key,pass>=7?0:(arcTolerances.get(key)??toleranceM)/4);
}
const data={type:'FeatureCollection',metadata:{sourceUrl:'https://gaia.inegi.org.mx/wscatgeo/v2/geo/mgee/',documentation:'https://www.inegi.org.mx/servicios/catalogounico.html',sourceMetadata:source.metadatos,sourceSha256:createHash('sha256').update(raw).digest('hex'),license:'https://www.inegi.org.mx/inegi/terminos.html',projection:mexicoProjection,boundsNative:bounds,simplification:{algorithm:'Shared-arc Douglas-Peucker in INEGI Lambert plane; graph junctions fixed; adaptive smaller tolerance for new intersections, containment or orientation changes against source chains',maximumToleranceM:toleranceM,minimumToleranceM:Math.min(toleranceM,...arcTolerances.values()),originalVertices,outputVertices,sharedArcCount:arcCache.size,validationPasses,newProperIntersections:0,newContainments:0,orientationChanges:0},coordinateNote:'GeoJSON geographical coordinates are plotted using the GRS80 Lambert parameters of the INEGI thematic .prj. No epoch-dependent datum transformation or cadastral precision is claimed.'},features};
await mkdir('src/data/atlas/mexico',{recursive:true});
await writeFile('src/data/atlas/mexico/geometry.json',JSON.stringify(data));
const index={metadata:data.metadata,states:features.map(feature=>{
 let b=[Infinity,Infinity,-Infinity,-Infinity];
 for(const ring of rings(feature.geometry))for(const point of ring){const [x,y]=lambertForward(point);b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];}
 return {...feature.properties,boundsNative:b};
})};
await writeFile('src/data/atlas/mexico/geometry-index.json',JSON.stringify(index));
await mkdir('public/assets/atlas/mexico-common-v1',{recursive:true});
await writeFile('public/assets/atlas/mexico-common-v1/geometry-provenance.json',JSON.stringify(data.metadata,null,2)+'\n');
console.log(JSON.stringify({states:features.length,bounds,originalVertices,outputVertices,toleranceM,bytes:Buffer.byteLength(JSON.stringify(data))}));
