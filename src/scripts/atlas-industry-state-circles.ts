import {industrySectors,industrySymbol} from '../data/atlas/industry-catalog';
import {stateEconomyValue,type StateEconomyComparison} from '../data/atlas/industry-state-economy';
import {placeIndustryEconomicLabels} from '../lib/atlas-industry-markers';
export function renderStateCircles(markers:HTMLElement,frame:HTMLElement,c:StateEconomyComparison|null,project:(p:[number,number])=>{x:number;y:number},selected:string|null,select:(id:string)=>void){
 let layer=markers.querySelector<HTMLElement>('[data-industry-state-layer]');
 if(!c){layer?.remove();return;}
 if(!layer){layer=document.createElement('div');layer.dataset.industryStateLayer='';layer.className='industry-state-layer';markers.prepend(layer);}
 const focus=(document.activeElement as HTMLElement)?.dataset.industryStateMarker;
 layer.replaceChildren();
 const color=industrySectors.find(s=>s.id===c.sector)?.color??'#435965';
 const points=c.points.slice(0,5).map(p=>({...p,...project(p.coordinates as [number,number])})).filter(p=>p.x>=0&&p.y>=0&&p.x<=frame.clientWidth&&p.y<=frame.clientHeight);
 const named=points;
 const labelWidth=(name:string)=>Math.max(70,name.length*(frame.clientWidth<650?10:11)+10);
 const labels=placeIndustryEconomicLabels(named.map(p=>({id:p.id,x:p.x,y:p.y,radius:p.radius,width:labelWidth(p.name),height:24})),frame.clientWidth,frame.clientHeight);
 for(const p of points){
  const b=document.createElement('button');b.type='button';b.className='industry-state-marker';b.dataset.industryStateMarker=p.id;b.dataset.economicValue=String(p.value);b.dataset.economicRank=String(p.rank);
  b.style.left=`${p.x-22}px`;b.style.top=`${p.y-22}px`;b.style.transform='none';b.style.setProperty('--industry-color',color);
  b.setAttribute('aria-label',`${p.name}、${c.label}の${c.metric} ${stateEconomyValue(p.value,c)} ${c.displayUnit}、${c.year}年、公表値のある${c.total}州・DC中${p.rank}位`);b.setAttribute('aria-pressed',String(p.id===selected));
  const circle=document.createElement('i');circle.style.width=circle.style.height=`${2*p.radius}px`;circle.setAttribute('aria-hidden','true');b.append(circle);
  const anchor=document.createElement('em');anchor.setAttribute('aria-hidden','true');anchor.textContent=industrySymbol(c.sector as Parameters<typeof industrySymbol>[0],c.subsector);b.append(anchor);
  const label=document.createElement('span');label.textContent=p.name;label.style.zIndex='2';label.setAttribute('aria-hidden','true');
  const box=labels.find(l=>l.id===p.id)??{left:Math.max(4,Math.min(frame.clientWidth-labelWidth(p.name)-4,p.x+Math.max(12,p.radius))),top:Math.max(4,p.y-30),width:labelWidth(p.name)};label.style.left=`${box.left-p.x+22}px`;label.style.top=`${box.top-p.y+22}px`;label.style.width=`${box.width}px`;
  // Show selected/top labels; every circle keeps its accessible name and table row.
  label.hidden=!named.some(n=>n.id===p.id);
  const leader=document.createElement('b');leader.className='industry-state-leader';leader.style.zIndex='1';leader.hidden=label.hidden;leader.setAttribute('aria-hidden','true');
  const x=Math.max(box.left,Math.min(box.left+box.width,p.x)),y=Math.max(box.top,Math.min(box.top+box.height,p.y));
  leader.style.width=`${Math.hypot(x-p.x,y-p.y)}px`;leader.style.transform=`rotate(${Math.atan2(y-p.y,x-p.x)}rad)`;
  b.append(leader,label);b.addEventListener('click',()=>select(p.id));layer.append(b);
 }
 if(focus)layer.querySelector<HTMLButtonElement>(`[data-industry-state-marker="${focus}"]`)?.focus({preventScroll:true});
}
