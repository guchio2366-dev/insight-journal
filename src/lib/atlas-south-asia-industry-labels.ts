import type {SouthIndustryMapLabel} from '../data/atlas/south-asia-industry-cartography';
export type SouthLabelBox={left:number;top:number;right:number;bottom:number};
type Point={x:number;y:number};
type Viewport={width:number;height:number};
const textWidth=(text:string)=>[...text].reduce((sum,char)=>sum+(/[\u0000-\u007f]/.test(char)?6.5:11.5),0);
export function southIndustryLabelSize(label:Pick<SouthIndustryMapLabel,'industry'|'place'>){
 return {width:Math.ceil(Math.max(60,textWidth(label.industry)+10,textWidth(label.place)+10)),height:30};
}
// Selection is absent. Text only uses neighbours of the original anchor.
// If it won't fit, keep its inspectable point rather than a distant sticky note.
export function southIndustryLabelPlacement(point:Point,viewport:Viewport,occupied:SouthLabelBox[],size={width:132,height:30}){
 const {width,height}=size,gap=9;
 const candidates=[
  {anchor:'left',offset:[gap,0],dx:gap,dy:-height/2},
  {anchor:'right',offset:[-gap,0],dx:-width-gap,dy:-height/2},
  {anchor:'bottom',offset:[0,-gap],dx:-width/2,dy:-height-gap},
  {anchor:'top',offset:[0,gap],dx:-width/2,dy:gap},
  {anchor:'top-left',offset:[gap,gap],dx:gap,dy:gap},
  {anchor:'top-right',offset:[-gap,gap],dx:-width-gap,dy:gap},
  {anchor:'bottom-left',offset:[gap,-gap],dx:gap,dy:-height-gap},
  {anchor:'bottom-right',offset:[-gap,-gap],dx:-width-gap,dy:-height-gap},
 ] as const;
 for(const candidate of candidates){
  const box={left:point.x+candidate.dx,top:point.y+candidate.dy,right:point.x+candidate.dx+width,bottom:point.y+candidate.dy+height};
  if(box.left<5||box.right>viewport.width-5||box.top<5||box.bottom>viewport.height-5)continue;
  if(occupied.some(other=>box.left<other.right+4&&box.right+4>other.left&&box.top<other.bottom+4&&box.bottom+4>other.top))continue;
  occupied.push(box);return {...candidate,box,width,height};
 }
 return undefined;
}
// The shared renderer should reuse this layout while inspecting a sector.
export function southIndustryLabelLayout(labels:readonly SouthIndustryMapLabel[],project:(point:[number,number])=>Point,viewport:Viewport,points:readonly [number,number][]=[],reserved:readonly SouthLabelBox[]=[]){
 const occupied:SouthLabelBox[]=[...reserved,...points.map(point=>{const p=project(point);return {left:p.x-4,top:p.y-4,right:p.x+4,bottom:p.y+4};})];
 const budget=viewport.width<500?7:viewport.width<850?12:14;let named=0;
 const placed=new Map<string,ReturnType<typeof southIndustryLabelPlacement>>();
 const place=(label:SouthIndustryMapLabel)=>{if(named>=budget||placed.has(label.id))return false;const placement=southIndustryLabelPlacement(project(label.point),viewport,occupied,southIndustryLabelSize(label));if(!placement)return false;placed.set(label.id,placement);named++;return true;};
 // Give each industry an evidenced place first, trying another site when a
 // crowded primary anchor cannot carry text. Then add geographic detail.
 for(const group of new Set(labels.map(label=>label.group)))for(const label of labels.filter(label=>label.group===group))if(place(label))break;
 for(const label of labels)place(label);
 return labels.map(label=>{
  const position=project(label.point),size=southIndustryLabelSize(label);
  const placement=placed.get(label.id);
  return {label,position,size,placement};
 });
}
