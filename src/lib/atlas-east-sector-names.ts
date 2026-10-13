import {boxesOverlap,leaderEnd,lineIntersectsBox,type Box,type Point} from './atlas-nature-labels.ts';
export type SectorName={id:string;industry:string;width:number;height:number;anchors:{id:string;point:Point}[]};
export type SectorNamePlacement=Box&{id:string;industry:string;anchor:Point;site:string};
/** Only short, local correspondence lines. Every candidate is an original
 * source location; selection never changes candidate order or dimensions. */
export function placeEastSectorNames(items:SectorName[],bounds:Box,obstacles:Box[]):SectorNamePlacement[]{
 const placed:SectorNamePlacement[]=[];
 for(const item of items){
  let chosen:SectorNamePlacement|undefined;
  const candidates:SectorNamePlacement[]=[];
  for(const source of item.anchors){
   const primary=placed.find(p=>p.industry===item.industry);
   if(primary&&Math.hypot(source.point.x-primary.anchor.x,source.point.y-primary.anchor.y)<140)continue;
   for(const dx of [11,-item.width-11,-item.width/2])for(const dy of [0,-28,28,-56,56,-84,84]){
    const left=source.point.x+dx,top=source.point.y-item.height/2+dy;
    const box={id:item.id,industry:item.industry,anchor:source.point,site:source.id,left,top,right:left+item.width,bottom:top+item.height},end=leaderEnd(source.point,box),length=Math.hypot(end.x-source.point.x,end.y-source.point.y);
    if(length<7||length>72||left<bounds.left+3||top<bounds.top+3||box.right>bounds.right-3||box.bottom>bounds.bottom-3)continue;
    if([...obstacles,...placed].some(p=>boxesOverlap(p,box,3))||placed.some(p=>lineIntersectsBox([source.point,end],p,2)))continue;
    candidates.push(box);
   }
  }
  candidates.sort((a,b)=>{const distance=(p:SectorNamePlacement)=>{const end=leaderEnd(p.anchor,p);return Math.hypot(end.x-p.anchor.x,end.y-p.anchor.y);};return distance(a)-distance(b);});
  chosen=candidates[0];if(chosen)placed.push(chosen);
 }
 return placed;
}
