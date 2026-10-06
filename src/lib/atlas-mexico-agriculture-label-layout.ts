/** Screen-space placement only: candidates remain tied to sourced crop anchors. */
export interface AgricultureLabelBox {left:number;top:number;right:number;bottom:number}
export interface AgricultureLabelCandidate {
 id:string; width:number; height:number; anchors:{x:number;y:number}[]; selected?:boolean;
}
export interface AgricultureLabelPlacement extends AgricultureLabelBox {id:string;x:number;y:number;anchorIndex:number;sourceX:number;sourceY:number;leader:boolean}
export function agricultureLabelIntersects(a:AgricultureLabelBox,b:AgricultureLabelBox,padding=4):boolean {
 return a.left<b.right+padding&&a.right>b.left-padding&&a.top<b.bottom+padding&&a.bottom>b.top-padding;
}
export function placeMexicoAgricultureLabels(items:AgricultureLabelCandidate[],width:number,height:number,obstacles:AgricultureLabelBox[]=[]):AgricultureLabelPlacement[] {
 const placed:AgricultureLabelPlacement[]=[],occupied=[...obstacles];
 // Selection gets first choice. Other crops remain represented by their map areas
 // and keys even when neither sourced label anchor fits the current viewport.
 const ordered=items.map((item,index)=>({item,index})).sort((a,b)=>Number(!!b.item.selected)-Number(!!a.item.selected)||a.index-b.index);
 for(const {item} of ordered){
  if(item.width<=0||item.height<=0)continue;
  let found:AgricultureLabelPlacement|undefined;
  // Prefer an exact source anchor, then a small typographic offset. Never clamp
  // an off-screen source point to the edge or move it to an unrelated region.
  for(const [dx,dy] of [[0,0],[0,-18],[0,18],[-18,0],[18,0]] as const){
   for(let anchorIndex=0;anchorIndex<item.anchors.length;anchorIndex++){
    const anchor=item.anchors[anchorIndex];
    if(anchor.x<0||anchor.x>width||anchor.y<0||anchor.y>height)continue;
    const x=anchor.x+dx,y=anchor.y+dy;
    const box={left:x-item.width/2,top:y-item.height/2,right:x+item.width/2,bottom:y+item.height/2};
    if(box.left<6||box.top<6||box.right>width-6||box.bottom>height-6||occupied.some(other=>agricultureLabelIntersects(box,other)))continue;
    found={id:item.id,x,y,anchorIndex,sourceX:anchor.x,sourceY:anchor.y,leader:false,...box};break;
   }
   if(found)break;
  }
  if(!found&&item.selected){
   // A selected name must not disappear behind a badge. Find the nearest free
   // callout position and expose the unchanged source point for its leader.
   const candidates:AgricultureLabelPlacement[]=[];
   item.anchors.forEach((anchor,anchorIndex)=>{
    if(anchor.x<0||anchor.x>width||anchor.y<0||anchor.y>height)return;
    const xs=[anchor.x,6+item.width/2,width-6-item.width/2,...occupied.flatMap(box=>[box.left-item.width/2-5,box.right+item.width/2+5])];
    const ys=[anchor.y,6+item.height/2,height-6-item.height/2,...occupied.flatMap(box=>[box.top-item.height/2-5,box.bottom+item.height/2+5])];
    for(const x of xs)for(const y of ys){
     const box={left:x-item.width/2,top:y-item.height/2,right:x+item.width/2,bottom:y+item.height/2};
     if(box.left<6||box.top<6||box.right>width-6||box.bottom>height-6||occupied.some(other=>agricultureLabelIntersects(box,other)))continue;
     candidates.push({id:item.id,x,y,anchorIndex,sourceX:anchor.x,sourceY:anchor.y,leader:true,...box});
    }
   });
   candidates.sort((a,b)=>Math.hypot(a.x-a.sourceX,a.y-a.sourceY)-Math.hypot(b.x-b.sourceX,b.y-b.sourceY));
   found=candidates[0];
  }
  if(found){placed.push(found);occupied.push(found);}
 }
 return placed;
}
