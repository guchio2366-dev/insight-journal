import {industryPlaceLabel} from '../data/atlas/industry-geography';
import {industrySectors,industrySymbol} from '../data/atlas/industry-catalog';
import type {IndustryRegion} from '../data/atlas/industry-regions';
import {layoutNatureLabels,leaderEnd} from '../lib/atlas-nature-labels';

/** Groups only records for the same registered place, never different anchors. */
export function industryPlaceGroups(regions:readonly IndustryRegion[]){
 const places=new Map<string,IndustryRegion[]>();
 for(const region of regions)places.set(region.placeId,[...(places.get(region.placeId)??[]),region]);
 return [...places].map(([id,regions])=>({id,regions,name:regions[0].name,coordinates:regions[0].coordinates,industries:[...new Set(regions.map(industryPlaceLabel))]}));
}

export function renderIndustryOverview(markers:HTMLElement,frame:HTMLElement,list:HTMLElement,regions:IndustryRegion[],project:(p:[number,number])=>{x:number;y:number},selected:string|null,select:(r:IndustryRegion[])=>void){
 const groups=industryPlaceGroups(regions),narrow=frame.clientWidth<650;
 const focus=(document.activeElement as HTMLElement)?.dataset.industryPlace;
 markers.replaceChildren();list.replaceChildren();list.hidden=false;markers.dataset.stateEconomy='false';
 const visible=groups.map(g=>({...g,anchor:project(g.coordinates)})).filter(g=>g.anchor.x>=0&&g.anchor.y>=0&&g.anchor.x<=frame.clientWidth&&g.anchor.y<=frame.clientHeight-40);
 const nodes=visible.map(g=>{
  const button=document.createElement('button');button.type='button';button.className='industry-overview-pin industry-cluster-pin';button.dataset.industryPlace=g.id;button.dataset.industryMarker=g.regions[0].id;
  button.setAttribute('aria-label',`${g.industries.join('・')}：${g.name}（${g.regions[0].scope}）。地域の解説を開く`);button.setAttribute('aria-pressed',String(g.regions.some(r=>r.id===selected)));
  button.style.left=`${g.anchor.x-22}px`;button.style.top=`${g.anchor.y-22}px`;
  const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');dot.textContent=industrySymbol(g.regions[0].sector,g.regions[0].subsector);dot.style.background=industrySectors.find(s=>s.id===g.regions[0].sector)!.color;
  const label=document.createElement('span');label.className='industry-overview-label';label.style.width=`${narrow?124:160}px`;
  const industry=document.createElement('strong');industry.textContent=g.industries.slice(0,3).join('・')+(g.industries.length>3?` ほか${g.industries.length-3}業種`:'');
  const place=document.createElement('small');place.textContent=g.name+(g.regions[0].scope.startsWith('州')?'（州の例）':'');label.append(industry,place);
  const line=document.createElement('b');line.className='industry-overview-leader';line.setAttribute('aria-hidden','true');button.append(line,dot,label);button.addEventListener('click',()=>select(g.regions));markers.append(button);
  return {g,button,label,line,width:label.offsetWidth||(narrow?124:160),height:label.offsetHeight||Math.ceil(industry.textContent.length/(narrow?9:12))*18+24};
 });
 const bounds={left:4,top:4,right:frame.clientWidth-4,bottom:frame.clientHeight-40};
 const obstacles=[{left:frame.clientWidth-58,top:10,right:frame.clientWidth-4,bottom:160}];
 const labels=layoutNatureLabels(nodes.map(({g,width,height})=>({id:g.id,anchor:g.anchor,width,height})),bounds,obstacles);
 for(const {g,label,line} of nodes){
  const box=labels.find(l=>l.id===g.id)!;label.style.left=`${box.left-g.anchor.x+22}px`;label.style.top=`${box.top-g.anchor.y+22}px`;
  const end=leaderEnd(g.anchor,box);line.style.width=`${Math.hypot(end.x-g.anchor.x,end.y-g.anchor.y)}px`;line.style.transform=`rotate(${Math.atan2(end.y-g.anchor.y,end.x-g.anchor.x)}rad)`;
 }
 // All registered places remain reachable on narrow screens and when panned out.
 for(const g of groups){const button=document.createElement('button');button.type='button';button.dataset.industryPlace=g.id;button.setAttribute('aria-pressed',String(g.regions.some(r=>r.id===selected)));const fields=document.createElement('strong'),place=document.createElement('span');fields.textContent=g.industries.join('・');place.textContent=g.name;button.append(fields,place);button.addEventListener('click',()=>select(g.regions));list.append(button);}
 if(focus)markers.querySelector<HTMLButtonElement>(`[data-industry-place="${focus}"]`)?.focus({preventScroll:true});
}
