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
 const labels=new Map<string,HTMLElement>();
 const leaders=document.createElementNS('http://www.w3.org/2000/svg','svg');leaders.classList.add('southeast-industry-leaders');leaders.setAttribute('aria-hidden','true');overlay.append(leaders);
 const legend=document.createElement('div');legend.className='southeast-industry-map-legend';legend.dataset.southeastIndustryLegend='';legend.setAttribute('aria-label','産業地点の凡例');
 for(const [name,kindClass] of [['製造・物流','manufacturing'],['ゴム・タイヤ','rubber'],['木材・家具','wood']]){const item=document.createElement('span');item.className=kindClass;item.textContent=name;legend.append(item);}
 const shape=document.createElement('span');shape.className='shapes';shape.textContent='● 産業・加工地点　◆ 原料産地';legend.append(shape);overlay.append(legend);
 for(const site of southeastIndustrySites){
  const button=document.createElement('button');button.type='button';button.className=`southeast-industry-map-point ${site.kind} ${site.stage}`;button.setAttribute('aria-label',site.industryName+'・'+site.placeName+'：'+(site.stage==='raw'?'原料産地':site.stage==='processing'?'加工・製造の地点':'産業の着目地点'));button.title=site.label;button.dataset.southeastIndustryPoint=site.id;button.addEventListener('click',event=>{event.stopPropagation();chooseSite(site.id);});overlay.append(button);points.set(site.id,button);
  const label=document.createElement('div');label.className=`southeast-industry-map-label ${site.kind}`;label.dataset.southeastIndustryLabel=site.id;label.setAttribute('aria-hidden','true');const industry=document.createElement('strong');industry.textContent=site.industryName;const place=document.createElement('small');place.textContent=site.placeName;label.append(industry,place);overlay.append(label);labels.set(site.id,label);
 }
 function position(){
  if(!map||overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;leaders.replaceChildren();
  const locations=southeastIndustrySites.map(site=>({site,p:map!.project(site.point)}));
  for(const {site,p} of locations){const point=points.get(site.id)!;point.style.left=p.x+'px';point.style.top=p.y+'px';point.hidden=p.x<8||p.x>width-8||p.y<8||p.y>height-8;labels.get(site.id)!.hidden=point.hidden;}
  const west=new Set(['thai-east','rayong-tires','southern-rubber','penang']);
  for(const side of ['west','east'] as const){
   const lane=locations.filter(({site})=>west.has(site.id)===(side==='west')&&!points.get(site.id)!.hidden).sort((a,b)=>a.p.y-b.p.y);
   let previous=side==='west'?68:6;
   for(const {site,p} of lane){const label=labels.get(site.id)!,labelWidth=side==='west'?102:128,labelHeight=36;
    const left=side==='west'?8:Math.min(width-labelWidth-8,Math.round(width*.5));
    const top=Math.max(previous,Math.min(height-labelHeight-6,p.y-labelHeight/2));previous=top+labelHeight+4;
    label.style.left=left+'px';label.style.top=top+'px';label.style.width=labelWidth+'px';
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(side==='west'?left+labelWidth:left));line.setAttribute('y2',String(top+labelHeight/2));leaders.append(line);
   }
  }
 }
 function render(){
  const state=getState(),active=state.field==='industry'&&!state.place&&!['trade-exports','trade-imports'].includes(state.topic??'');
  overlay.hidden=!active;
  summary.textContent=southeastIndustryKinds.find(x=>x.id===kind)!.reading;
  for(const b of categories)b.setAttribute('aria-pressed',String(b.dataset.southeastIndustryKind===kind));
  for(const site of southeastIndustrySites){const emphasis=kind==='all'||kind===site.kind,chosen=selectedId===site.id;const item=list.find(b=>b.dataset.southeastIndustrySite===site.id)!;item.classList.toggle('muted',!emphasis);item.setAttribute('aria-pressed',String(chosen));const point=points.get(site.id)!;point.classList.toggle('muted',!emphasis);point.classList.toggle('chosen',chosen);point.setAttribute('aria-pressed',String(chosen));labels.get(site.id)!.classList.toggle('muted',!emphasis);}
  const site=southeastIndustrySites.find(x=>x.id===selectedId);selected.hidden=!site;
  if(site){selected.querySelector<HTMLElement>('[data-southeast-industry-selected-title]')!.textContent=site.label;selected.querySelector<HTMLElement>('[data-southeast-industry-selected-reading]')!.textContent=site.reading;selected.querySelector<HTMLElement>('[data-southeast-industry-selected-year]')!.textContent=site.sourceYear;const a=selected.querySelector<HTMLAnchorElement>('[data-southeast-industry-selected-source]')!;a.textContent=site.sourceLabel;a.href=site.sourceUrl;}
  position();
 }
 function chooseSite(id:string){const site=southeastIndustrySites.find(s=>s.id===id);if(!site)return;selectedId=selectedId===id?null:id;kind=site.kind;render();}
 for(const b of categories)b.addEventListener('click',()=>{kind=b.dataset.southeastIndustryKind as typeof kind;selectedId=null;render();});
 for(const b of list)b.addEventListener('click',()=>chooseSite(b.dataset.southeastIndustrySite!));
 return {render,show(next:import('maplibre-gl').Map|null){if(next&&next!==map){map=next;map.on('move',position);map.on('resize',position);}render();}};
}
