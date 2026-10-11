import type {Point,ProtectedLine} from './atlas-nature-labels';
const majorRivers=new Set(['Mississippi','Missouri','Ohio','Colorado','Columbia','Sacramento','San Joaquin']);
const paths=(geometry:any):number[][][]=>geometry.type==='LineString'?[geometry.coordinates]:geometry.type==='MultiLineString'?geometry.coordinates:geometry.type==='GeometryCollection'?geometry.geometries.flatMap(paths):[];
/** Protect the source-backed main channels without moving their geographic paths. */
export function protectedRiverLines(features:any[],project:(p:[number,number])=>Point):ProtectedLine[]{
 const lines:ProtectedLine[]=[];
 for(const feature of features){
  if(feature.properties.kind!=='river'||!majorRivers.has(feature.properties.name))continue;
  for(const path of paths(feature.geometry)){
   let previous:Point|undefined;
   for(let i=0;i<path.length;i++){
    const point=project(path[i] as [number,number]);
    if(previous&&(i===path.length-1||Math.hypot(point.x-previous.x,point.y-previous.y)>=3)){lines.push([previous,point]);previous=point;}else if(!previous)previous=point;
   }
  }
 }
 return lines;
}
