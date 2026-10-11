import type {PilotCluster} from './atlas-canada-industry-pilot';

export type PilotLabelPoint={c:PilotCluster;point:number[]};
/** Nearby guide positions share an industry label; no industrial extent or flow is inferred. */
export function groupPilotLabelPoints(points:PilotLabelPoint[],maximumDiameter=105){
 const groups:PilotLabelPoint[][]=[];
 for(const point of points){
  const group=groups.find(g=>g[0].c.industry===point.c.industry&&g.every(p=>Math.hypot(p.point[0]-point.point[0],p.point[1]-point.point[1])<=maximumDiameter));
  if(group)group.push(point);else groups.push([point]);
 }
 return groups;
}

/** Short, local correspondences only. A crowded label may be omitted, never moved across Canada. */
export function placePilotLabel(points:number[][],size:number[],frame:number[],occupied:number[][],maximumLeader=95){
 const [width,height]=size,[mapWidth,mapHeight]=frame,x=points.reduce((n,p)=>n+p[0],0)/points.length,y=points.reduce((n,p)=>n+p[1],0)/points.length;
 const offsets:number[][]=[];
 for(let dy=-110;dy<=110;dy+=5)for(let dx=-110;dx<=110;dx+=5)offsets.push([dx,dy]);
 offsets.sort((a,b)=>a[0]**2+a[1]**2-b[0]**2-b[1]**2);
 for(const [dx,dy]of offsets){
  const left=Math.max(5,Math.min(mapWidth-width-5,x+dx-width/2)),top=Math.max(5,Math.min(mapHeight-height-28,y+dy-height/2)),box=[left,top,left+width,top+height];
  if(occupied.some(b=>box[0]<b[2]+4&&box[2]>b[0]-4&&box[1]<b[3]+4&&box[3]>b[1]-4))continue;
  if(points.some(p=>Math.hypot(p[0]-Math.max(box[0],Math.min(box[2],p[0])),p[1]-Math.max(box[1],Math.min(box[3],p[1])))>maximumLeader))continue;
  return box;
 }
 return null;
}
