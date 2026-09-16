import {industryStateGroups} from '../data/atlas/industry-geography';
import type {IndustryRegion} from '../data/atlas/industry-regions';
import {placeIndustryEconomicLabels} from '../lib/atlas-industry-markers';
export function renderIndustryOverview(markers:HTMLElement,frame:HTMLElement,list:HTMLElement,regions:IndustryRegion[],project:(p:[number,number])=>{x:number;y:number},selected:string|null,select:(r:IndustryRegion[])=>void){
 const groups=industryStateGroups(regions),narrow=frame.clientWidth<650;
 const focus=(document.activeElement as HTMLElement)?.dataset.industryOverviewState;
 markers.replaceChildren();list.replaceChildren();list.hidden=false;
 const visible=groups.map(g=>({...g,...project(g.coordinates)})).filter(g=>g.x>=0&&g.y>=0&&g.x<=frame.clientWidth&&g.y<=frame.clientHeight);
 const labels=placeIndustryEconomicLabels(visible.map(g=>({id:g.id,x:g.x,y:g.y,radius:4,width:narrow?Math.min(108,g.name.length*11+12):148,height:narrow?24:28+Math.ceil(g.industries.join('・').length/12)*16})),frame.clientWidth,frame.clientHeight);
 for(const g of visible){
  const b=document.createElement('button');b.type='button';b.className='industry-overview-pin';b.dataset.industryOverviewState=g.id;b.dataset.industryMarker=g.regions[0].id;b.setAttribute('aria-label',`${g.name}：${g.industries.join('・')}`);b.setAttribute('aria-pressed',String(g.regions.some(r=>r.id===selected)));b.style.left=`${g.x-22}px`;b.style.top=`${g.y-22}px`;
  const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.className='industry-overview-label';const name=document.createElement('strong');name.textContent=g.name;label.append(name);
  const fields=document.createElement('small');fields.textContent=g.industries.join('・');label.append(fields);
  const box=labels.find(l=>l.id===g.id)!;label.style.left=`${box.left-g.x+22}px`;label.style.top=`${box.top-g.y+22}px`;label.style.width=`${box.width}px`;
  const line=document.createElement('b');line.className='industry-overview-leader';const x=Math.max(box.left,Math.min(box.left+box.width,g.x)),y=Math.max(box.top,Math.min(box.top+box.height,g.y));line.style.width=`${Math.hypot(x-g.x,y-g.y)}px`;line.style.transform=`rotate(${Math.atan2(y-g.y,x-g.x)}rad)`;line.setAttribute('aria-hidden','true');
  b.append(line,dot,label);b.addEventListener('click',()=>select(g.regions));markers.append(b);
 }
 // Mobile companion key stays expanded: all industries are visible without a tap.
 for(const g of groups){const b=document.createElement('button');b.type='button';b.dataset.industryOverviewState=g.id;b.setAttribute('aria-pressed',String(g.regions.some(r=>r.id===selected)));const name=document.createElement('strong');name.textContent=g.name;const fields=document.createElement('span');fields.textContent=g.industries.join('・');b.append(name,fields);b.addEventListener('click',()=>select(g.regions));list.append(b);}
 if(focus)markers.querySelector<HTMLButtonElement>(`[data-industry-overview-state="${focus}"]`)?.focus({preventScroll:true});
}
