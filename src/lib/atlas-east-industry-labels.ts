import type {Box,Point} from './atlas-nature-labels';

export type IndustrySite = {id:string;country:string;anchor:Point};
export type IndustryLabelGroup = {id:string;members:IndustrySite[];anchor:Point};
export type GroupLabelInput = IndustryLabelGroup & {width:number;height:number};
export type GroupLabelPlacement = GroupLabelInput & Box;
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
const center=(members:IndustrySite[]):Point=>({x:members.reduce((n,s)=>n+s.anchor.x,0)/members.length,y:members.reduce((n,s)=>n+s.anchor.y,0)/members.length});

/** Initial overview only: complete-link groups cannot chain along an entire coast. */
export function groupIndustrySites(sites:IndustrySite[],mapWidth:number):IndustryLabelGroup[]{
 const groups=sites.map(s=>[s]),diameter=mapWidth*.075;
 for(;;){
  let pair:[number,number]|null=null,best=Infinity;
  for(let a=0;a<groups.length;a++)for(let b=a+1;b<groups.length;b++){
   if(groups[a][0].country!==groups[b][0].country)continue;
   if(groups[a].some(x=>groups[b].some(y=>distance(x.anchor,y.anchor)>diameter)))continue;
   const gap=distance(center(groups[a]),center(groups[b]));
   if(gap<best){best=gap;pair=[a,b];}
  }
  if(!pair)break;
  groups[pair[0]].push(...groups[pair[1]]);groups.splice(pair[1],1);
 }
 return groups.map(members=>({id:members.map(s=>s.id).sort().join('+'),members,anchor:center(members)}));
}

export const groupLeaderEnd=(anchor:Point,box:Box):Point=>({x:Math.max(box.left,Math.min(box.right,anchor.x)),y:Math.max(box.top,Math.min(box.bottom,anchor.y))});
const overlap=(a:Box,b:Box,gap=3)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const cross=(a:Point,b:Point,c:Point,d:Point)=>{
 const turn=(x:Point,y:Point,z:Point)=>(y.x-x.x)*(z.y-x.y)-(y.y-x.y)*(z.x-x.x);
 return turn(a,b,c)*turn(a,b,d)<-.001&&turn(c,d,a)*turn(c,d,b)<-.001;
};
const crosses=(a:GroupLabelPlacement,b:GroupLabelPlacement)=>a.members.some(x=>b.members.some(y=>cross(x.anchor,groupLeaderEnd(x.anchor,a),y.anchor,groupLeaderEnd(y.anchor,b))));
const cuts=(label:GroupLabelPlacement,box:Box)=>label.members.some(({anchor})=>{
 const end=groupLeaderEnd(anchor,label);
 if(anchor.x>box.left&&anchor.x<box.right&&anchor.y>box.top&&anchor.y<box.bottom)return true;
 const edges:[[Point,Point],[Point,Point],[Point,Point],[Point,Point]]=[
  [{x:box.left,y:box.top},{x:box.right,y:box.top}],[{x:box.right,y:box.top},{x:box.right,y:box.bottom}],
  [{x:box.right,y:box.bottom},{x:box.left,y:box.bottom}],[{x:box.left,y:box.bottom},{x:box.left,y:box.top}],
 ];return edges.some(([a,b])=>cross(anchor,end,a,b));
});

/** Find nearby boxes jointly; a free box far inland is never a valid fallback. */
export function layoutIndustryGroups(items:GroupLabelInput[],bounds:Box,obstacles:Box[]=[]):GroupLabelPlacement[]{
 const sites=items.flatMap(g=>g.members),maxLeader=Math.min(66,(bounds.right-bounds.left)*.135);
 const candidates=items.map(item=>{
  const out:{rect:GroupLabelPlacement;score:number}[]=[];
  const minX=Math.max(bounds.left+3,item.anchor.x-item.width-maxLeader),maxX=Math.min(bounds.right-item.width-3,item.anchor.x+maxLeader);
  const minY=Math.max(bounds.top+3,item.anchor.y-item.height-maxLeader),maxY=Math.min(bounds.bottom-item.height-3,item.anchor.y+maxLeader);
  for(let left=minX;left<=maxX;left+=4)for(let top=minY;top<=maxY;top+=4){
   const rect={...item,left,top,right:left+item.width,bottom:top+item.height};
   if(obstacles.some(o=>overlap(rect,o))||sites.some(s=>overlap(rect,{left:s.anchor.x-7,top:s.anchor.y-7,right:s.anchor.x+7,bottom:s.anchor.y+7},1)))continue;
   const lengths=item.members.map(s=>distance(s.anchor,groupLeaderEnd(s.anchor,rect)));
   if(lengths.some(n=>n>maxLeader))continue;
   const middle={x:left+item.width/2,y:top+item.height/2};
   out.push({rect,score:Math.max(...lengths)**2+lengths.reduce((sum,n)=>sum+n*n,0)/lengths.length+distance(middle,item.anchor)*2});
  }
  return out.sort((a,b)=>a.score-b.score);
 });
 const order=items.map((_,i)=>i).sort((a,b)=>candidates[a].length-candidates[b].length);
 let best:GroupLabelPlacement[]|null=null,visits=0;
 const place=(index:number,placed:GroupLabelPlacement[],score:number)=>{
  if(++visits>3000||best)return;
  if(index===order.length){best=[...placed];return;}
  for(const {rect,score:cost} of candidates[order[index]]){
   if(placed.some(p=>overlap(p,rect)||crosses(p,rect)||cuts(p,rect)||cuts(rect,p)))continue;
   place(index+1,[...placed,rect],score+cost);
   // Nearby placements a few pixels apart are equivalent; bounded search also
   // keeps move/resize redraws responsive.
   if(visits>3000||best)return;
  }
 };
 place(0,[],0);
 if(best)return items.map(item=>best!.find(p=>p.id===item.id)!);
 // At a zoomed edge there may be no room for a box. Keep every original point;
 // its existing map hit target still opens the exact city's reading.
 const placed:GroupLabelPlacement[]=[];
 for(const index of order){const candidate=candidates[index].find(({rect})=>!placed.some(p=>overlap(p,rect)||crosses(p,rect)||cuts(p,rect)||cuts(rect,p)));if(candidate)placed.push(candidate.rect);}
 return placed;
}
