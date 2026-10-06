export type IndustryLabel = {id:string;x:number;y:number;width:number;height:number};
export type IndustryLabelPlacement = IndustryLabel & {left:number;top:number};

/** Place every reading label without changing its state anchor or dropping a topic. */
export function layoutMexicoIndustryLabels(labels:IndustryLabel[],frame:{width:number;height:number},gap=5):IndustryLabelPlacement[] {
 const placed:IndustryLabelPlacement[]=[];
 const overlap=(a:{left:number;top:number;width:number;height:number},b:{left:number;top:number;width:number;height:number})=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left)+gap)*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top)+gap);
 const sorted=[...labels].sort((a,b)=>a.y-b.y||a.x-b.x||a.id.localeCompare(b.id));
 for(const label of sorted){
  const {x,y,width,height}=label,candidates:{left:number;top:number}[]=[];
  for(let ring=0;ring<9;ring++)for(const dy of ring===0?[-height-12,12]:[-height-12-ring*24,12+ring*24])for(const dx of [12,-width-12,-width/2])candidates.push({left:x+dx,top:y+dy});
  // A dense group may need to use nearby open map space rather than omit a label.
  for(let top=6;top+height<=frame.height-6;top+=20)for(let left=6;left+width<=frame.width-6;left+=24)candidates.push({left,top});
  let best={left:Math.max(6,Math.min(frame.width-width-6,x+12)),top:Math.max(6,Math.min(frame.height-height-6,y-height-12))},bestScore=Infinity;
  for(const candidate of candidates){
   if(candidate.left<6||candidate.top<6||candidate.left+width>frame.width-6||candidate.top+height>frame.height-6)continue;
   const box={...candidate,width,height};
   const collisions=placed.reduce((sum,other)=>sum+overlap(box,other),0)+labels.reduce((sum,anchor)=>sum+overlap(box,{left:anchor.x-7,top:anchor.y-7,width:14,height:14}),0);
   const nearestX=Math.max(candidate.left,Math.min(x,candidate.left+width)),nearestY=Math.max(candidate.top,Math.min(y,candidate.top+height));
   const distance=Math.hypot(nearestX-x,nearestY-y);
   const score=collisions*1_000_000+distance+(candidate.left<x?1:0);
   if(score<bestScore){bestScore=score;best=candidate;}
  }
  placed.push({...label,...best});
 }
 return placed;
}
