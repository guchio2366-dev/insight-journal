import {southeastIndustryKinds,southeastIndustrySites,type SoutheastIndustryKind} from '../data/atlas/asia/southeast-asia-industry-sites';
import type {AsiaState} from '../lib/atlas-asia-state';

/** Region-only location guide. National WDI and trade layers remain authoritative. */
export function createSoutheastIndustryLocations(root:HTMLElement,getState:()=>AsiaState){
 const overlay=root.querySelector<HTMLElement>('[data-southeast-industry-map]');
 if(!overlay)return {show(_map:import('maplibre-gl').Map|null){},render(){}};
 const categories=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-kind]')];
 const list=[...root.querySelectorAll<HTMLButtonElement>('[data-southeast-industry-site]')];
 const summary=root.querySelector<HTMLElement>('[data-southeast-industry-summary]')!;
 const selected=root.querySelector<HTMLElement>('[data-southeast-industry-selected]')!;
 let kind:'all'|SoutheastIndustryKind='all',selectedId:string|null=null,map:import('maplibre-gl').Map|null=null;
 const points=new Map<string,HTMLButtonElement>();
 for(const site of southeastIndustrySites){
  const button=document.createElement('button');button.type='button';button.className=`southeast-industry-map-point ${site.kind} ${site.stage}`;button.setAttribute('aria-label',site.label+'：'+(site.stage==='raw'?'原料産地':site.stage==='processing'?'加工・製造の地点':'産業の着目地点'));button.title=site.label;button.dataset.southeastIndustryPoint=site.id;button.addEventListener('click',event=>{event.stopPropagation();chooseSite(site.id);});overlay.append(button);points.set(site.id,button);
 }
 function position(){if(!map||overlay.hidden)return;const width=overlay.clientWidth,height=overlay.clientHeight;for(const site of southeastIndustrySites){const b=points.get(site.id)!;const p=map.project(site.point);b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=p.x<8||p.x>width-8||p.y<8||p.y>height-8;}}
 function render(){
  const state=getState(),active=state.field==='industry'&&!state.place&&!['trade-exports','trade-imports'].includes(state.topic??'');
  overlay.hidden=!active;
  summary.textContent=southeastIndustryKinds.find(x=>x.id===kind)!.reading;
  for(const b of categories)b.setAttribute('aria-pressed',String(b.dataset.southeastIndustryKind===kind));
  for(const site of southeastIndustrySites){const emphasis=kind==='all'||kind===site.kind,chosen=selectedId===site.id;const item=list.find(b=>b.dataset.southeastIndustrySite===site.id)!;item.classList.toggle('muted',!emphasis);item.setAttribute('aria-pressed',String(chosen));const point=points.get(site.id)!;point.classList.toggle('muted',!emphasis);point.classList.toggle('chosen',chosen);point.setAttribute('aria-pressed',String(chosen));}
  const site=southeastIndustrySites.find(x=>x.id===selectedId);selected.hidden=!site;
  if(site){selected.querySelector<HTMLElement>('[data-southeast-industry-selected-title]')!.textContent=site.label;selected.querySelector<HTMLElement>('[data-southeast-industry-selected-reading]')!.textContent=site.reading;selected.querySelector<HTMLElement>('[data-southeast-industry-selected-year]')!.textContent=site.sourceYear;const a=selected.querySelector<HTMLAnchorElement>('[data-southeast-industry-selected-source]')!;a.textContent=site.sourceLabel;a.href=site.sourceUrl;}
  position();
 }
 function chooseSite(id:string){const site=southeastIndustrySites.find(s=>s.id===id);if(!site)return;selectedId=selectedId===id?null:id;kind=site.kind;render();}
 for(const b of categories)b.addEventListener('click',()=>{kind=b.dataset.southeastIndustryKind as typeof kind;selectedId=null;render();});
 for(const b of list)b.addEventListener('click',()=>chooseSite(b.dataset.southeastIndustrySite!));
 return {render,show(next:import('maplibre-gl').Map|null){if(next&&next!==map){map=next;map.on('move',position);map.on('resize',position);}render();}};
}
