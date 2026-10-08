import {canadaReligionColor,canadaReligionComposition} from '../lib/atlas-canada-religion-view';

const svg='http://www.w3.org/2000/svg';
const element=<K extends keyof SVGElementTagNameMap>(name:K)=>document.createElementNS(svg,name);

/** CD points identify source regions; CMA points are a separate, overlapping comparison. */
export function renderCanadaReligionMap(root:HTMLElement,data:any,focus:string|null,showCallouts:boolean){
 const map=root.querySelector<SVGSVGElement>('[data-population-map]')!,regions=root.querySelector<SVGGElement>('[data-religion-region-symbols]')!,callouts=root.querySelector<SVGGElement>('[data-religion-map-callouts]')!;
 regions.replaceChildren();callouts.replaceChildren();
 const frame=map.getBoundingClientRect(),viewBox=map.viewBox.baseVal,scale=Math.min(frame.width/viewBox.width,frame.height/viewBox.height)||1,radius=3.5/scale,step=7/scale,records=new Map(data.regions.map((record:any)=>[record.id,record]));
 for(const path of root.querySelectorAll<SVGPathElement>('[data-population-region]')){
  const record:any=records.get(path.dataset.populationRegion);if(!record)continue;
  const composed=canadaReligionComposition(record,data),dots=composed.qualified.slice();
  if(focus){const chosen=composed.rows.find((row:any)=>row.id===focus);if(chosen?.share>=1&&!dots.some((row:any)=>row.id===focus))dots.unshift(chosen);}
  if(!dots.length)continue;
  const box=path.getBBox(),anchor=record.id==='6204'?[733,177]:null,cx=anchor?.[0]??box.x+box.width/2,cy=anchor?.[1]??box.y+box.height/2;
  const group=element('g');group.dataset.religionRegionDots=record.id;
  for(const [index,row] of dots.slice(0,4).entries()){
   const dot=element('circle');dot.setAttribute('cx',String(cx+(index-(Math.min(dots.length,4)-1)/2)*step));dot.setAttribute('cy',String(cy));dot.setAttribute('r',String(radius));dot.setAttribute('fill',canadaReligionColor[row.id]);dot.setAttribute('stroke','#fffdf5');dot.setAttribute('stroke-width',String(.8/scale));dot.setAttribute('opacity',focus&&row.id!==focus?'.22':'1');dot.dataset.religionDot=row.id;group.append(dot);
  }
  regions.append(group);
 }
 if(!showCallouts)return;
 const examples=[
  {id:'6001',group:'25',text:'ユーコン 無宗教 60%',dx:-94,dy:-28},
  {id:'6204',group:'6',text:'ヌナブト 聖公会 47%',dx:-80,dy:-40},
  {id:'2492',group:'8',text:'QC カトリック 79%',dx:-115,dy:-38},
  {id:'1005',group:'6',text:'NL 聖公会 31%',dx:-123,dy:28},
  {id:'3521',group:'22',text:'Peel 3宗教 12〜14%',dx:-146,dy:28},
 ];
 for(const item of examples){
  const path=root.querySelector<SVGPathElement>(`[data-population-region="${item.id}"]`);if(!path)continue;
  const box=path.getBBox(),anchor=item.id==='6204'?[733,177]:null,x=anchor?.[0]??box.x+box.width/2,y=anchor?.[1]??box.y+box.height/2,group=element('g');
  group.classList.add('religion-map-callout');group.dataset.religionCallout=item.id;
  const text=element('text');text.style.fontSize=`${12/scale}px`;text.setAttribute('font-weight','700');text.setAttribute('fill','#263f48');text.textContent=item.text;group.append(text);callouts.append(group);
  const width=text.getBBox().width+12/scale,height=21/scale,view=map.viewBox.baseVal,rightInset=item.id==='6204'?66/scale:4/scale,tx=Math.max(view.x+4/scale,Math.min(view.x+view.width-width-rightInset,x+item.dx/scale)),ty=Math.max(view.y+4/scale,Math.min(view.y+view.height-height-4/scale,y+item.dy/scale));
  text.setAttribute('x',String(tx+6/scale));text.setAttribute('y',String(ty+15/scale));
  const line=element('path');line.setAttribute('d',`M${x},${y}L${tx+width/2},${ty+height/2}`);line.setAttribute('stroke',canadaReligionColor[item.group]);line.setAttribute('stroke-width',String(1/scale));line.setAttribute('fill','none');group.insertBefore(line,text);
  const label=element('rect');label.setAttribute('x',String(tx));label.setAttribute('y',String(ty));label.setAttribute('width',String(width));label.setAttribute('height',String(height));label.setAttribute('rx',String(3/scale));label.setAttribute('fill','#fffdf6');label.setAttribute('stroke',canadaReligionColor[item.group]);label.setAttribute('stroke-width',String(1/scale));group.insertBefore(label,text);
 }
}
