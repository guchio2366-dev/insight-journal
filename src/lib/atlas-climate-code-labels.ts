import {boxesOverlap,type Box,type Point} from './atlas-nature-labels.ts';

export type ClimateCodeLabel={id:string;code:string;coordinate:number[];alternatives:number[][];minZoom:number};
export type CodeInput={id:string;code:string;anchors:Point[];width:number;height:number};
export type CodePlacement=Box&{id:string;anchor:Point;leader:boolean};

/** Every anchor stays in its verified class. Short leaders identify small regions. */
export function layoutClimateCodes(items:CodeInput[],bounds:Box,obstacles:Box[]):CodePlacement[]{
  const placed:CodePlacement[]=[];
  for(const item of items){
    const offsets=[[0,0],[0,-22],[0,22],[-24,0],[24,0],[-18,-18],[18,-18],[-18,18],[18,18]];
    let found=false;
    for(const [dx,dy] of offsets){
    for(const anchor of item.anchors){
      if(anchor.x<bounds.left||anchor.x>bounds.right||anchor.y<bounds.top||anchor.y>bounds.bottom)continue;
      const leader=dx!==0||dy!==0;
      if(leader&&obstacles.some(box=>anchor.x>=box.left&&anchor.x<=box.right&&anchor.y>=box.top&&anchor.y<=box.bottom))continue;
      const rect={id:item.id,anchor,leader,left:anchor.x+dx-item.width/2,right:anchor.x+dx+item.width/2,top:anchor.y+dy-item.height/2,bottom:anchor.y+dy+item.height/2};
      if(rect.left<bounds.left+3||rect.right>bounds.right-3||rect.top<bounds.top+3||rect.bottom>bounds.bottom-3)continue;
      if([...obstacles,...placed].some(box=>boxesOverlap(rect,box,4)))continue;
      placed.push(rect);found=true;break;
    }
    if(found)break;
    }
  }
  return placed;
}
