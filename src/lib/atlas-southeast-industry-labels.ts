export type SoutheastLabelBox={left:number;top:number;right:number;bottom:number};
export type SoutheastLabelPoint={x:number;y:number};
export type SoutheastLabelInput={id:string;x:number;y:number;width:number;height:number;leaderPoints?:SoutheastLabelPoint[]};
export const southeastLabelIntersects=(a:SoutheastLabelBox,b:SoutheastLabelBox,padding=0)=>a.left<b.right+padding&&a.right>b.left-padding&&a.top<b.bottom+padding&&a.bottom>b.top-padding;
export const southeastLabelLeaderEnd=(p:SoutheastLabelPoint,box:SoutheastLabelBox)=>({x:Math.max(box.left,Math.min(p.x,box.right)),y:Math.max(box.top,Math.min(p.y,box.bottom))});
/** Segment/rectangle clipping rejects leaders that cut through another label. */
export function southeastLeaderIntersectsBox(a:SoutheastLabelPoint,b:SoutheastLabelPoint,box:SoutheastLabelBox,padding=0){
 let enter=0,leave=1;
 for(const [start,delta,min,max] of [[a.x,b.x-a.x,box.left-padding,box.right+padding],[a.y,b.y-a.y,box.top-padding,box.bottom+padding]]){
  if(delta===0){if(start<min||start>max)return false;continue;}
  const t1=(min-start)/delta,t2=(max-start)/delta;enter=Math.max(enter,Math.min(t1,t2));leave=Math.min(leave,Math.max(t1,t2));
  if(enter>leave)return false;
 }
 return true;
}
/** The current sector supplies entries; industry/site selection never affects layout. */
export function placeSoutheastIndustryLabels(entries:SoutheastLabelInput[],width:number,height:number,reserved:SoutheastLabelBox[]=[],protectedPoints:{x:number;y:number}[]=entries){
 const boxes=new Map<string,SoutheastLabelBox>();
 const placedLeaders:{start:SoutheastLabelPoint;end:SoutheastLabelPoint}[]=[];
 const anchors=entries.filter(p=>p.x>=8&&p.x<=width-8&&p.y>=8&&p.y<=height-8);
 const density=(p:SoutheastLabelInput)=>anchors.filter(q=>Math.hypot(p.x-q.x,p.y-q.y)<90).length;
 const ordered=[...anchors].sort((a,b)=>density(b)-density(a)||a.y-b.y||a.id.localeCompare(b.id));
 for(const p of ordered){
  let best:{box:SoutheastLabelBox;score:number}|null=null;
  for(const distance of [10,18,28,40,48])for(const shift of [0,-16,16,-28,28])for(const side of ['right','left','above','below'] as const){
   const x=side==='right'?p.x+distance:side==='left'?p.x-distance-p.width:p.x-p.width/2+shift;
   const y=side==='below'?p.y+distance:side==='above'?p.y-distance-p.height:p.y-p.height/2+shift;
   const box={left:x,top:y,right:x+p.width,bottom:y+p.height};
   if(x<5||y<5||box.right>width-5||box.bottom>height-5)continue;
   if(reserved.some(b=>southeastLabelIntersects(box,b,3))||[...boxes.values()].some(b=>southeastLabelIntersects(box,b,3)))continue;
   if(protectedPoints.some(a=>a.x>=8&&a.x<=width-8&&a.y>=8&&a.y<=height-8&&southeastLabelIntersects(box,{left:a.x-6,top:a.y-6,right:a.x+6,bottom:a.y+6},2)))continue;
   const lines=(p.leaderPoints??[p]).map(start=>({start,end:southeastLabelLeaderEnd(start,box)}));
   const lengths=lines.map(line=>Math.hypot(line.end.x-line.start.x,line.end.y-line.start.y));
   if(lengths.some(length=>length>48))continue;
   if(lines.some(line=>[...reserved,...boxes.values()].some(b=>southeastLeaderIntersectsBox(line.start,line.end,b,2))))continue;
   if(placedLeaders.some(line=>southeastLeaderIntersectsBox(line.start,line.end,box,2)))continue;
   const score=Math.max(...lengths)+Math.abs(shift)*.12;
   if(!best||score<best.score)best={box,score};
  }
  if(best){boxes.set(p.id,best.box);for(const start of p.leaderPoints??[p])placedLeaders.push({start,end:southeastLabelLeaderEnd(start,best.box)});}
 }
 return boxes;
}
