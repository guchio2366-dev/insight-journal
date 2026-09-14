import {boxesOverlap,type Box,type Point} from './atlas-nature-labels.ts';

export type ClimateCodeLabel={id:string;code:string;coordinate:number[];alternatives:number[][];minZoom:number};
export type CodeInput={id:string;code:string;anchors:Point[];width:number;height:number};
export type CodePlacement=Box&{id:string;anchor:Point};

/** Try only verified in-class anchors; never move a code into a neighbouring class. */
export function layoutClimateCodes(items:CodeInput[],bounds:Box,obstacles:Box[]):CodePlacement[]{
  const placed:CodePlacement[]=[];
  for(const item of items){
    for(const anchor of item.anchors){
      const rect={id:item.id,anchor,left:anchor.x-item.width/2,right:anchor.x+item.width/2,top:anchor.y-item.height/2,bottom:anchor.y+item.height/2};
      if(rect.left<bounds.left+3||rect.right>bounds.right-3||rect.top<bounds.top+3||rect.bottom>bounds.bottom-3)continue;
      if([...obstacles,...placed].some(box=>boxesOverlap(rect,box,4)))continue;
      placed.push(rect);break;
    }
  }
  return placed;
}
