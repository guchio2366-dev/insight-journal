/** Screen-space labels stay near their real geographic anchors. Never push a
 * crowded label down the country: find a bounded local slot or leave the
 * accessible point and statistics to identify it. */
export type JapanLabelAnchor={id:string;x:number;y:number;width:number;height:number;offset:[number,number]};
export type JapanLabelRect={id:string;x:number;y:number;width:number;height:number;endX:number;endY:number;leaderLength:number};
export const japanLabelMaxLeader=64;
export function layoutJapanLabels(anchors:JapanLabelAnchor[],width:number,height:number):Map<string,JapanLabelRect>{
 const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
 const overlaps=(a:JapanLabelRect,b:JapanLabelRect)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+4&&a.y+a.height+4>b.y;
 const items=anchors.filter(a=>a.x>=0&&a.x<=width&&a.y>=0&&a.y<=height).map(a=>{
  const candidates:JapanLabelRect[]=[];
  const add=(x:number,y:number)=>{
   if(width<a.width+12||height<a.height+48)return;
   x=clamp(x,6,width-a.width-6);y=clamp(y,6,height-a.height-38);
   const endX=clamp(a.x,x,x+a.width),endY=clamp(a.y,y,y+a.height),leaderLength=Math.hypot(a.x-endX,a.y-endY);
   if(leaderLength<7||leaderLength>japanLabelMaxLeader)return;
   if(anchors.some(p=>p.x>x-5&&p.x<x+a.width+5&&p.y>y-5&&p.y<y+a.height+5))return;
   if(candidates.some(c=>Math.abs(c.x-x)<1&&Math.abs(c.y-y)<1))return;
   candidates.push({id:a.id,x,y,width:a.width,height:a.height,endX,endY,leaderLength});
  };
  add(a.x+a.offset[0],a.y+a.offset[1]);
  for(const gap of [10,22,38,52,64])for(const dx of [-a.width-gap,-a.width/2,gap])for(const dy of [-a.height-gap,-a.height/2,gap])add(a.x+dx,a.y+dy);
  candidates.sort((p,q)=>p.leaderLength-q.leaderLength||Math.hypot(p.x-a.x-a.offset[0],p.y-a.y-a.offset[1])-Math.hypot(q.x-a.x-a.offset[0],q.y-a.y-a.offset[1]));
  return {a,candidates};
 });
 // Most crowded anchors first; bounded backtracking lets neighbours trade slots.
 items.sort((p,q)=>p.candidates.length-q.candidates.length);
 let visits=0,best:JapanLabelRect[]=[];
 function search(index:number,placed:JapanLabelRect[]):boolean{
  if(placed.length>best.length)best=[...placed];
  if(index===items.length)return placed.length===items.length;
  if(visits>=30000)return false;visits++;
  for(const rect of items[index].candidates){if(visits>=30000)break;if(placed.some(p=>overlaps(p,rect)))continue;placed.push(rect);if(search(index+1,placed))return true;placed.pop();}
  return false;
 }
 search(0,[]);
 // If a zoomed or tiny frame cannot hold all labels, keep a useful local subset.
 for(const {candidates} of items)if(!best.some(p=>p.id===candidates[0]?.id)){const candidate=candidates.find(c=>!best.some(p=>overlaps(p,c)));if(candidate)best.push(candidate);}
 return new Map(best.map(rect=>[rect.id,rect]));
}
