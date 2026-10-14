// Conservative screen-space envelopes. Selection is deliberately absent from
// this contract: only a viewport change can change a label placement.
export type SouthLabelBox={left:number;top:number;right:number;bottom:number};
const candidates=[
 {anchor:'left',offset:[12,0],dx:12,dy:-21},
 {anchor:'right',offset:[-12,0],dx:-162,dy:-21},
 {anchor:'bottom',offset:[0,-12],dx:-75,dy:-54},
 {anchor:'top',offset:[0,12],dx:-75,dy:12},
 {anchor:'left',offset:[12,-66],dx:12,dy:-87},
 {anchor:'right',offset:[-12,66],dx:-162,dy:45},
 {anchor:'left',offset:[12,112],dx:12,dy:91},
 {anchor:'right',offset:[-12,-112],dx:-162,dy:-133},
 {anchor:'left',offset:[180,0],dx:180,dy:-21},
 {anchor:'right',offset:[-180,0],dx:-330,dy:-21},
 {anchor:'bottom',offset:[0,-170],dx:-75,dy:-212},
 {anchor:'top',offset:[0,170],dx:-75,dy:170},
 {anchor:'left',offset:[180,112],dx:180,dy:91},
 {anchor:'right',offset:[-180,-112],dx:-330,dy:-133},
] as const;
export function southIndustryLabelPlacement(point:{x:number;y:number},viewport:{width:number;height:number},occupied:SouthLabelBox[]){
 for(const candidate of candidates){
  const dy=candidate.anchor==='left'||candidate.anchor==='right'?candidate.offset[1]-30:candidate.anchor==='bottom'?candidate.offset[1]-60:candidate.offset[1];
  const box={left:point.x+candidate.dx,top:point.y+dy,right:point.x+candidate.dx+150,bottom:point.y+dy+60};
  if(box.left<4||box.right>viewport.width-4||box.top<4||box.bottom>viewport.height-4)continue;
  if(occupied.some(other=>box.left<other.right+6&&box.right+6>other.left&&box.top<other.bottom+6&&box.bottom+6>other.top))continue;
  occupied.push(box);return candidate;
 }
 return undefined;
}
