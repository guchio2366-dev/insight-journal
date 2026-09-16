import {industrySectors} from '../data/atlas/industry-catalog';
import {stateEconomyValue,type StateEconomyComparison} from '../data/atlas/industry-state-economy';
import {placeIndustryEconomicLabels} from '../lib/atlas-industry-markers';
export function renderStateCircles(markers:HTMLElement,frame:HTMLElement,c:StateEconomyComparison|null,project:(p:[number,number])=>{x:number;y:number},selected:string|null,select:(id:string)=>void){
 let layer=markers.querySelector<HTMLElement>('[data-industry-state-layer]');
 if(!c){layer?.remove();return;}
 if(!layer){layer=document.createElement('div');layer.dataset.industryStateLayer='';layer.className='industry-state-layer';markers.prepend(layer);}
 const focus=(document.activeElement as HTMLElement)?.dataset.industryStateMarker;
 layer.replaceChildren();
 const color=industrySectors.find(s=>s.id===c.sector)?.color??'#435965';
 const points=c.points.map(p=>({...p,...project(p.coordinates as [number,number])})).filter(p=>p.x>=0&&p.y>=0&&p.x<=frame.clientWidth&&p.y<=frame.clientHeight);
 const labels=placeIndustryEconomicLabels(points.map(p=>({id:p.id,x:p.x,y:p.y,radius:p.radius,width:frame.clientWidth<650?66:94,height:24})),frame.clientWidth,frame.clientHeight);
 for(const p of points){
  const b=document.createElement('button');b.type='button';b.className='industry-state-marker';b.dataset.industryStateMarker=p.id;b.dataset.economicValue=String(p.value);b.dataset.economicRank=String(p.rank);
  b.style.left=`${p.x}px`;b.style.top=`${p.y}px`;b.style.setProperty('--industry-color',color);
  b.setAttribute('aria-label',`${p.name}、${c.label}の${c.metric} ${stateEconomyValue(p.value,c)} ${c.displayUnit}、${c.year}年、公表値のある${c.total}州・DC中${p.rank}位`);b.setAttribute('aria-pressed',String(p.id===selected));
  const circle=document.createElement('i');circle.style.width=circle.style.height=`${2*p.radius}px`;circle.setAttribute('aria-hidden','true');b.append(circle);
  const anchor=document.createElement('em');anchor.setAttribute('aria-hidden','true');b.append(anchor);
  const label=document.createElement('span');label.textContent=p.name;label.setAttribute('aria-hidden','true');
  const box=labels.find(l=>l.id===p.id)!;label.style.left=`${box.left-p.x+22}px`;label.style.top=`${box.top-p.y+22}px`;label.style.width=`${box.width}px`;
  // At narrow widths show selected/top labels; every circle keeps its accessible name and table row.
  label.hidden=frame.clientWidth<650&&p.id!==selected&&p.rank>3;
  const leader=document.createElement('b');leader.className='industry-state-leader';leader.hidden=label.hidden;leader.setAttribute('aria-hidden','true');
  const x=Math.max(box.left,Math.min(box.left+box.width,p.x)),y=Math.max(box.top,Math.min(box.top+box.height,p.y));
  leader.style.width=`${Math.hypot(x-p.x,y-p.y)}px`;leader.style.transform=`rotate(${Math.atan2(y-p.y,x-p.x)}rad)`;
  b.append(leader,label);b.addEventListener('click',()=>select(p.id));layer.append(b);
 }
 if(focus)layer.querySelector<HTMLButtonElement>(`[data-industry-state-marker="${focus}"]`)?.focus({preventScroll:true});
}
