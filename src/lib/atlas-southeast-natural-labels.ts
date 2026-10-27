import {boxesOverlap,leaderEnd,lineIntersectsBox,type Box,type Point,type ProtectedLine} from './atlas-nature-labels.ts';
import type {CodeInput,CodePlacement} from './atlas-climate-code-labels.ts';

type Coordinate=[number,number];
type RiverGeometry={type:string;coordinates:any};
const paths=(geometry:RiverGeometry):Coordinate[][]=>geometry.type==='LineString'?[geometry.coordinates]:geometry.type==='MultiLineString'?geometry.coordinates:[];

/** Downstream endpoints come from the existing line, never a guessed mouth coordinate. */
export function southeastRiverAnchors(id:string,geometry:RiverGeometry):Coordinate[]{
 const lines=paths(geometry),ends=lines.flatMap(line=>[line[0],line.at(-1)!]).filter(Boolean);
 const outlet=ends.sort((a,b)=>id==='rivers-234'?a[0]-b[0]:a[1]-b[1])[0];
 if(!outlet)return [];
 const seen=new Set<string>();
 return [outlet,...lines.flat().sort((a,b)=>(a[0]-outlet[0])**2+(a[1]-outlet[1])**2-((b[0]-outlet[0])**2+(b[1]-outlet[1])**2))].filter(point=>{const key=point.join(',');if(seen.has(key))return false;seen.add(key);return true;});
}

export function southeastRiverSegments(features:readonly {geometry:RiverGeometry}[],project:(point:Coordinate)=>Point):ProtectedLine[]{
 return features.flatMap(feature=>paths(feature.geometry).flatMap(path=>path.slice(1).map((point,i)=>[project(path[i]),project(point)] as const)));
}

/** Keep names off every river line, with a leader to the first visible downstream anchor. */
export function layoutSoutheastRiverNames(items:CodeInput[],bounds:Box,obstacles:Box[],rivers:readonly ProtectedLine[]):CodePlacement[]{
 const priority=['rivers-121','rivers-351','rivers-254','rivers-210','rivers-234'];
 const placed:CodePlacement[]=[];
 for(const item of [...items].sort((a,b)=>priority.findIndex(id=>a.id.endsWith(id))-priority.findIndex(id=>b.id.endsWith(id)))){
  const anchor=item.anchors.find(p=>p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom);
  if(!anchor)continue;
  const candidates:CodePlacement[]=[];
  const add=(left:number,top:number)=>{
   const rect={id:item.id,anchor,leader:true,left,top,right:left+item.width,bottom:top+item.height};
   const end=leaderEnd(anchor,rect);
   if(rect.left<bounds.left+4||rect.right>bounds.right-4||rect.top<bounds.top+4||rect.bottom>bounds.bottom-4||Math.hypot(end.x-anchor.x,end.y-anchor.y)<14)return;
   if([...obstacles,...placed].some(other=>boxesOverlap(rect,other,4))||rivers.some(line=>lineIntersectsBox(line,rect,5)))return;
   candidates.push(rect);
  };
  for(const gap of [18,30,48,72,96])for(const [x,y] of [[anchor.x+gap,anchor.y-item.height/2],[anchor.x-item.width-gap,anchor.y-item.height/2],[anchor.x-item.width/2,anchor.y+gap],[anchor.x-item.width/2,anchor.y-item.height-gap],[anchor.x+gap,anchor.y+gap],[anchor.x-item.width-gap,anchor.y+gap],[anchor.x+gap,anchor.y-item.height-gap],[anchor.x-item.width-gap,anchor.y-item.height-gap]])add(x,y);
  if(!candidates.length)for(let y=bounds.top+4;y+item.height<=bounds.bottom-4;y+=item.height+10)for(let x=bounds.left+4;x+item.width<=bounds.right-4;x+=item.width+12)add(x,y);
  candidates.sort((a,b)=>{const aEnd=leaderEnd(anchor,a),bEnd=leaderEnd(anchor,b);return Math.hypot(aEnd.x-anchor.x,aEnd.y-anchor.y)-Math.hypot(bEnd.x-anchor.x,bEnd.y-anchor.y);});
  if(candidates[0])placed.push(candidates[0]);
 }
 return placed;
}
