import {southeastIndustryKinds,southeastIndustrySites,type SoutheastIndustryKind} from '../data/atlas/asia/southeast-asia-industry-sites';
import type {AsiaState} from '../lib/atlas-asia-state';

/** Sourced regional examples. Country GDP share and trade layers use their own data. */
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
 const legend=document.createElement('div');legend.className='southeast-industry-map-legend';legend.dataset.southeastIndustryLegend='';legend.textContent='● 工場・港・都市　◆ 原料地域の代表位置 ／ 青=製造、橙=資源、緑=港、紫=サービス';overlay.append(legend);
 const family=(site:typeof southeastIndustrySites[number])=>site.kind==='rubber'||site.kind==='wood'||site.kind==='metals'||site.kind==='energy'?'resource':site.kind==='tourism'||site.kind==='finance'||site.kind==='it-bpm'?'service':site.kind==='logistics'?'network':'factory';
 for(const site of southeastIndustrySites){
  const button=document.createElement('button');button.type='button';button.className=`southeast-industry-map-point ${family(site)} ${site.stage}`;button.setAttribute('aria-label',site.industryName+'・'+site.placeName+'：'+(site.stage==='raw'?'原料地域の代表位置':site.stage==='service'?'サービス拠点':'加工・産業拠点'));button.title=site.label;button.dataset.southeastIndustryPoint=site.id;button.addEventListener('click',event=>{event.stopPropagation();chooseSite(site.id);});overlay.append(button);points.set(site.id,button);
  const label=document.createElement('div');label.className=`southeast-industry-map-label ${family(site)}`;label.dataset.southeastIndustryLabel=site.id;label.setAttribute('aria-hidden','true');const industry=document.createElement('strong');industry.textContent=site.industryName;const place=document.createElement('small');place.textContent=site.placeName;label.append(industry,place);overlay.append(label);labels.set(site.id,label);
 }
 function position(){
  if(!map||overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;leaders.replaceChildren();
  const locations=southeastIndustrySites.map(site=>({site,p:map!.project(site.point)}));
  for(const {site,p} of locations){const point=points.get(site.id)!;point.style.left=p.x+'px';point.style.top=p.y+'px';point.hidden=p.x<8||p.x>width-8||p.y<8||p.y>height-8;labels.get(site.id)!.hidden=true;}
  // In the overview, one callout per group keeps all distribution dots visible without 30 labels.
  const visible=kind==='all'?southeastIndustryKinds.slice(1).map(group=>locations.find(x=>x.site.kind===group.id)!).filter(x=>x&&!points.get(x.site.id)!.hidden):locations.filter(x=>x.site.kind===kind&&!points.get(x.site.id)!.hidden);
  const westKinds=new Set<SoutheastIndustryKind>(['electronics','automotive','petrochemicals','logistics','tourism','rubber','finance']);
  for(const side of ['west','east'] as const){
   const lane=visible.filter(({site})=>(kind==='all'?westKinds.has(site.kind):site.point[0]<105)===(side==='west')).sort((a,b)=>a.p.y-b.p.y);
   const labelHeight=kind==='all'?30:36,gap=3,start=side==='west'?53:8;
   lane.forEach(({site,p},index)=>{const label=labels.get(site.id)!,labelWidth=kind==='all'?112:132;const left=side==='west'?8:width-labelWidth-8;
    const top=kind==='all'?start+index*(labelHeight+gap):Math.min(height-labelHeight-5,Math.max(start+index*(labelHeight+gap),p.y-labelHeight/2));
    label.hidden=false;label.style.left=left+'px';label.style.top=top+'px';label.style.width=labelWidth+'px';label.style.height=labelHeight+'px';
    if(kind==='all'){label.querySelector('strong')!.textContent=southeastIndustryKinds.find(x=>x.id===site.kind)!.label;label.querySelector('small')!.textContent=site.placeName;}
    else{label.querySelector('strong')!.textContent=site.industryName;label.querySelector('small')!.textContent=site.placeName;}
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(side==='west'?left+labelWidth:left));line.setAttribute('y2',String(top+labelHeight/2));leaders.append(line);
   });
  }
 }
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
