export type SoutheastLabelBox={left:number;top:number;right:number;bottom:number};
export type SoutheastLabelInput={id:string;x:number;y:number;width:number;height:number};
export const southeastLabelIntersects=(a:SoutheastLabelBox,b:SoutheastLabelBox,padding=0)=>a.left<b.right+padding&&a.right>b.left-padding&&a.top<b.bottom+padding&&a.bottom>b.top-padding;
/** Camera/viewport geometry only: selection, category and sector are not inputs. */
export function placeSoutheastIndustryLabels(entries:SoutheastLabelInput[],width:number,height:number,reserved:SoutheastLabelBox[]=[],protectedPoints:{x:number;y:number}[]=entries){
 const boxes=new Map<string,SoutheastLabelBox>();
 const anchors=entries.filter(p=>p.x>=8&&p.x<=width-8&&p.y>=8&&p.y<=height-8);
 const density=(p:SoutheastLabelInput)=>anchors.filter(q=>Math.hypot(p.x-q.x,p.y-q.y)<90).length;
 const ordered=[...anchors].sort((a,b)=>density(b)-density(a)||a.y-b.y||a.id.localeCompare(b.id));
 for(const p of ordered){
  let best:{box:SoutheastLabelBox;score:number}|null=null;
  for(const distance of [18,32,48,68,92,120,155,190,230])for(const shift of [0,-24,24,-48,48,-72,72,-96,96,-130,130])for(const side of ['right','left','above','below'] as const){
   const x=side==='right'?p.x+distance:side==='left'?p.x-distance-p.width:p.x-p.width/2+shift;
   const y=side==='below'?p.y+distance:side==='above'?p.y-distance-p.height:p.y-p.height/2+shift;
   const box={left:x,top:y,right:x+p.width,bottom:y+p.height};
   if(x<5||y<5||box.right>width-5||box.bottom>height-5)continue;
   if(reserved.some(b=>southeastLabelIntersects(box,b,4))||[...boxes.values()].some(b=>southeastLabelIntersects(box,b,5)))continue;
   if(protectedPoints.some(a=>a.x>=8&&a.x<=width-8&&a.y>=8&&a.y<=height-8&&southeastLabelIntersects(box,{left:a.x-11,top:a.y-11,right:a.x+11,bottom:a.y+11},2)))continue;
   const score=Math.hypot(Math.max(x,Math.min(p.x,box.right))-p.x,Math.max(y,Math.min(p.y,box.bottom))-p.y)+Math.abs(shift)*.12;
   if(!best||score<best.score)best={box,score};
  }
  if(best)boxes.set(p.id,best.box);
 }
 return boxes;
}
