import {industryPlaceLabel} from '../data/atlas/industry-geography';
import {industrySectors,industrySymbol} from '../data/atlas/industry-catalog';
import type {IndustryRegion} from '../data/atlas/industry-regions';
import {layoutNatureLabels,leaderEnd} from '../lib/atlas-nature-labels';
import type {Point} from '../lib/atlas-nature-labels';

/** Groups only records for the same registered place, never different anchors. */
export function industryPlaceGroups(regions:readonly IndustryRegion[]){
 const places=new Map<string,IndustryRegion[]>();
 for(const region of regions)places.set(region.placeId,[...(places.get(region.placeId)??[]),region]);
 return [...places].map(([id,regions])=>({id,regions,name:regions[0].name,coordinates:regions[0].coordinates,industries:[...new Set(regions.map(industryPlaceLabel))]}));
}

type ProjectedPlace=ReturnType<typeof industryPlaceGroups>[number]&{anchor:Point};
/** Screen-space label groups only: all source positions stay as individual pins. */
export function industryLabelClusters(places:ProjectedPlace[],radius=78){
 const clusters:ProjectedPlace[][]=[];
 for(const place of places){
  const cluster=clusters.find(group=>group.every(other=>Math.hypot(place.anchor.x-other.anchor.x,place.anchor.y-other.anchor.y)<=radius));
  if(cluster)cluster.push(place);else clusters.push([place]);
 }
 return clusters.map(members=>({id:members[0].id,anchor:members[0].anchor,members,regions:members.flatMap(g=>g.regions),industries:[...new Set(members.flatMap(g=>g.industries))]}));
}

export function renderIndustryOverview(markers:HTMLElement,frame:HTMLElement,list:HTMLElement,regions:IndustryRegion[],project:(p:[number,number])=>{x:number;y:number},selected:string|null,select:(r:IndustryRegion[])=>void){
 const groups=industryPlaceGroups(regions.filter(r=>r.mapRole!=='context')),allGroups=industryPlaceGroups(regions),narrow=frame.clientWidth<650,compactOverview=narrow&&groups.length>6;
 const focus=(document.activeElement as HTMLElement)?.dataset.industryPlace;
 markers.replaceChildren();list.replaceChildren();list.hidden=false;markers.dataset.stateEconomy='false';
 const visible=groups.map(g=>({...g,anchor:project(g.coordinates)})).filter(g=>g.anchor.x>=0&&g.anchor.y>=0&&g.anchor.x<=frame.clientWidth&&g.anchor.y<=frame.clientHeight-40);
 const clustered=!narrow&&visible.length>6;
 const clusters=industryLabelClusters(visible,clustered?78:0);
 const nodes=visible.map(g=>{
  const cluster=clusters.find(c=>c.members.some(member=>member.id===g.id))!;
  const labelOwner=cluster.id===g.id;
  const target=labelOwner?cluster.regions:g.regions;
  const button=document.createElement('button');button.type='button';button.className='industry-overview-pin industry-cluster-pin';button.dataset.industryPlace=g.id;button.dataset.industryMarker=g.regions[0].id;
  button.setAttribute('aria-label',`${[...new Set(target.map(industryPlaceLabel))].join('・')}：${[...new Set(target.map(r=>r.name))].join('・')}。地域と分野の解説を開く`);button.setAttribute('aria-pressed',String(target.some(r=>r.id===selected)));
  button.style.left=`${g.anchor.x-22}px`;button.style.top=`${g.anchor.y-22}px`;
  const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');dot.textContent=industrySymbol(g.regions[0].sector,g.regions[0].subsector);dot.style.background=industrySectors.find(s=>s.id===g.regions[0].sector)!.color;
  const label=document.createElement('span');label.className='industry-overview-label';label.style.width=`${narrow?124:144}px`;label.hidden=compactOverview||!labelOwner;
  const fields=labelOwner?cluster.industries:g.industries;
  const industry=document.createElement('strong');industry.textContent=fields.slice(0,2).join('・');
  const place=document.createElement('small');place.textContent=cluster.members.length>1&&labelOwner?`近接する${cluster.members.length}地域`:(g.name+(g.regions[0].scope.startsWith('州')?'（州の例）':''));
  if(fields.length>2)place.textContent+=` ＋${fields.length-2}分野`;
  label.title=target.map(r=>`${r.name}：${industryPlaceLabel(r)}`).join('／');label.append(industry,place);
  const line=document.createElement('b');line.className='industry-overview-leader';line.hidden=label.hidden;line.setAttribute('aria-hidden','true');button.append(line,dot,label);button.addEventListener('click',()=>select(target));markers.append(button);
  return {g,button,label,line,width:label.offsetWidth||(narrow?124:144),height:label.offsetHeight||Math.ceil(industry.textContent.length/(narrow?9:11))*18+36};
 });
 const bounds={left:4,top:4,right:frame.clientWidth-4,bottom:frame.clientHeight-40};
 const obstacles=[{left:frame.clientWidth-58,top:10,right:frame.clientWidth-4,bottom:160}];
 const labelNodes=nodes.filter(node=>!node.label.hidden);
 const labels=layoutNatureLabels(labelNodes.map(({g,width,height})=>({id:g.id,anchor:g.anchor,width,height})),bounds,[...obstacles,...visible.map(({anchor})=>({left:anchor.x-12,top:anchor.y-12,right:anchor.x+12,bottom:anchor.y+12}))]);
 for(const {g,label,line} of labelNodes){
  const box=labels.find(l=>l.id===g.id)!;label.style.left=`${box.left-g.anchor.x+22}px`;label.style.top=`${box.top-g.anchor.y+22}px`;
  const end=leaderEnd(g.anchor,box);line.style.width=`${Math.hypot(end.x-g.anchor.x,end.y-g.anchor.y)}px`;line.style.transform=`rotate(${Math.atan2(end.y-g.anchor.y,end.x-g.anchor.x)}rad)`;
 }
 // All registered places remain reachable on narrow screens and when panned out.
 for(const g of allGroups){const button=document.createElement('button');button.type='button';button.dataset.industryPlace=g.id;button.setAttribute('aria-pressed',String(g.regions.some(r=>r.id===selected)));const fields=document.createElement('strong'),place=document.createElement('span');fields.textContent=g.industries.join('・');place.textContent=g.name+(g.regions.every(r=>r.mapRole==='context')?'（地域の補足）':'');button.append(fields,place);button.addEventListener('click',()=>select(g.regions));list.append(button);}
 if(focus)markers.querySelector<HTMLButtonElement>(`[data-industry-place="${focus}"]`)?.focus({preventScroll:true});
}
