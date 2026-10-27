import type {AsiaCamera,AsiaState} from './atlas-asia-state.ts';

export type SoutheastCoordinate=readonly [number,number];
export type SoutheastLandformExtent={id:string;lines:readonly (readonly (readonly number[])[])[]};
type PhysicalFocus={id:string;coordinates:readonly number[]};

/** The existing Nu and Salween lines meet at exactly [98.50792,20.951254]. */
export function southeastRiverIds(id:string|null|undefined):string[]{
 return id==='rivers-301'||id==='rivers-351'?['rivers-301','rivers-351']:id?[id]:[];
}
export function southeastRiverId(id:string):string{return id==='rivers-301'?'rivers-351':id;}

function inRing(point:SoutheastCoordinate,ring:readonly (readonly number[])[]):boolean{
 const [x,y]=point;let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [ax,ay]=ring[j],[bx,by]=ring[i];
  const cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
  if(Math.abs(cross)<1e-10&&x>=Math.min(ax,bx)&&x<=Math.max(ax,bx)&&y>=Math.min(ay,by)&&y<=Math.max(ay,by))return true;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return inside;
}

/** Only the existing named outline contains a selection; there is no nearest fallback. */
export function southeastLandformAtPoint(point:SoutheastCoordinate,extents:readonly SoutheastLandformExtent[]):string|null{
 // Even-odd containment also preserves holes in the source's flattened rings.
 return extents.find(feature=>feature.lines.filter(ring=>inRing(point,ring)).length%2===1)?.id??null;
}

/** A terrain selection keeps its layer and camera instead of selecting the country. */
export function southeastLandformState(state:AsiaState,focus:PhysicalFocus,camera:AsiaCamera|null):AsiaState{
 return {...state,field:'natural',topic:state.topic==='terrain'?'terrain':'landform',detail:focus.id,point:[focus.coordinates[0],focus.coordinates[1]],place:null,city:null,story:null,camera};
}
