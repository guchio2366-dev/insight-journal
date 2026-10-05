import {readCanadaIndustryState,writeCanadaIndustryState,formatCanadaIndustryValue,canadaIndustryComparisonUrl,type CanadaIndustryState} from '../lib/atlas-canada-industry';
import {canadaIndustryRegions,canadaIndustrySectors,type CanadaIndustrySector} from '../data/atlas/canada/industry-reading';
import {renderPopulationIndustryComparison} from './atlas-canada-population-industry-comparison';
import {hydrateCanadaPopulationGeometry} from './atlas-canada-population-geometry-loader';

/** Follow the US sector → geographic reading → related statistics interaction. */
export function initCanadaIndustry(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-industry-config]')!.textContent!),ids=config.provinces.map((p:any)=>p.id);
 const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector);
 const all=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
 const map=$<SVGSVGElement>('[data-industry-map]')!,initialFrame=map.getAttribute('viewBox')!,storageKey='insight-journal:canada-industry:v1';
 const valueText=(v:any)=>formatCanadaIndustryValue(v.value)+(v.value===null?'':'%')+([v.status,v.symbol].filter(Boolean).length?'（'+[v.status,v.symbol].filter(Boolean).join(' ')+'）':'');
 const sectorMetric=(sector:CanadaIndustrySector):CanadaIndustryState['metric']=>sector==='resources'?'mining':sector==='services'?'services':'manufacturing';
 function selection(url:URL):CanadaIndustryState{
  const state=readCanadaIndustryState(url,config.years,ids);
  if(!state.sector){const legacy=url.searchParams.has('metric');state.sector=legacy?(state.metric==='mining'?'resources':state.metric):'all';state.region=null;if(!legacy&&!url.searchParams.has('province')){state.province='Ontario';state.metric='manufacturing';}}
  return state;
 }
 let state=selection(new URL(location.href));
 const tabs=all<HTMLButtonElement>('[data-industry-sector][role="tab"]');
 function render(){
  const sector=canadaIndustrySectors.find(s=>s.id===state.sector)!,region=canadaIndustryRegions.find(r=>r.id===state.region);
  for(const key of ['year','province','compare','metric'] as const){const select=$<HTMLSelectElement>('[data-industry-'+key+']');if(select)select.value=String(state[key]??'');}
  for(const tab of tabs){const active=tab.dataset.industrySector===sector.id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  $('#canada-industry-map-panel')?.setAttribute('aria-labelledby','canada-industry-sector-'+sector.id);
  const breadcrumb=$('[data-industry-breadcrumb]');if(breadcrumb)breadcrumb.textContent=sector.label+(region?' ／ '+region.name:'');
  const compare=$<HTMLSelectElement>('[data-industry-compare]');if(compare)for(const option of compare.options)option.disabled=option.value===state.province;
  const only=$<HTMLInputElement>('[data-industry-only]');if(only)only.checked=state.only;
  const rows=config.data.filter((r:any)=>r.year===state.year),metric=config.metrics.find((m:any)=>m.id===state.metric),selected=[state.province,state.compare].filter(Boolean);
  const mapTitle='カナダの'+sector.label+'を読む地域'+(region?'：'+region.name:'');
  const title=map.querySelector('title');if(title)title.textContent=mapTitle;
  const heading=$('[data-canada-industry-map-title]');if(heading)heading.textContent=mapTitle;
  for(const shape of all<SVGPathElement>('[data-industry-province-shape]')){
   const id=shape.dataset.industryProvinceShape!,row=rows.find((r:any)=>r.id===id);
   shape.setAttribute('fill','#edf1df');shape.style.display='';
   shape.classList.toggle('is-selected-industry',!!region&&id===region.province);shape.classList.toggle('is-compared-industry',id===state.compare);
   shape.setAttribute('aria-pressed',String(!!region&&id===region.province));shape.setAttribute('aria-label',row.name+'の位置を選ぶ');
   const title=shape.querySelector('title');if(title)title.textContent=row.name+'（2021年の州・準州境界）';
  }
  for(const label of all<SVGElement>('[data-industry-province-label]'))label.style.display='';
  for(const mark of all<SVGElement>('[data-industry-region-markers] [data-industry-region]')){
   const item=canadaIndustryRegions.find(r=>r.id===mark.dataset.industryRegion)!,visible=sector.id==='all'||item.sector===sector.id;
   mark.style.display=visible?'':'none';mark.setAttribute('aria-hidden',String(!visible));mark.setAttribute('tabindex',visible?'0':'-1');
   mark.classList.toggle('is-selected',item.id===state.region);mark.setAttribute('aria-pressed',String(item.id===state.region));
  }
  for(const button of all<HTMLButtonElement>('button[data-industry-region]')){const item=canadaIndustryRegions.find(r=>r.id===button.dataset.industryRegion)!;button.hidden=sector.id!=='all'&&item.sector!==sector.id;button.setAttribute('aria-pressed',String(item.id===state.region));}
  const general=$<HTMLDetailsElement>('[data-industry-general-reading]');if(general){general.hidden=!!region;general.open=true;}
  for(const article of all<HTMLElement>('[data-industry-sector-reading]'))article.hidden=!!region||article.dataset.industrySectorReading!==sector.id;
  for(const article of all<HTMLElement>('[data-industry-reading]:not([data-industry-sector-reading])'))article.hidden=!!region||article.dataset.industryReading!==(sector.id==='resources'?'mining':sector.id);
  for(const article of all<HTMLElement>('[data-industry-region-reading]'))article.hidden=article.dataset.industryRegionReading!==state.region;
  for(const row of all<HTMLElement>('[data-industry-row]')){row.hidden=Number(row.dataset.year)!==state.year;row.classList.toggle('is-selected-province',selected.includes(row.dataset.industryRow!));}
  for(const cell of all<HTMLElement>('[data-industry-cell]'))cell.classList.toggle('is-current-metric',cell.dataset.industryCell===state.metric);
  for(const bar of all<HTMLElement>('[data-industry-bar]')){
   const row=bar.closest<HTMLElement>('[data-industry-row]')!,record=config.data.find((r:any)=>r.year===Number(row.dataset.year)&&r.id===row.dataset.industryRow),value=record.values[state.metric];
   bar.style.width=String(value.value??0)+'%';bar.parentElement!.classList.toggle('is-missing',value.value===null);bar.parentElement!.setAttribute('aria-label',record.name+': '+valueText(value));
  }
  const comparison=$('[data-industry-comparison]');if(comparison)comparison.textContent=state.year+'年 '+metric.name+'の州内GDP割合 — '+selected.map(id=>{const row=rows.find((r:any)=>r.id===id);return row.name+': '+valueText(row.values[state.metric]);}).join(' / ');
  for(const [index,card] of all<HTMLElement>('[data-industry-card]').entries()){
   const id=selected[index];card.hidden=!id;if(!id)continue;const row=rows.find((r:any)=>r.id===id),value=row.values[state.metric];
   card.querySelector('[data-industry-card-name]')!.textContent=row.name;card.querySelector('[data-industry-card-value]')!.textContent=valueText(value);
   const bar=card.querySelector<HTMLElement>('[data-industry-card-bar]')!;bar.style.width=String(value.value??0)+'%';bar.parentElement!.classList.toggle('is-missing',value.value===null);
  }
  // Selection never resets the camera. Explicit camera actions are independent.
  $('[data-industry-focus]')?.setAttribute('aria-pressed',String(state.zoom));
  const status=$('[data-industry-map-status]');if(status)status.textContent=sector.label+(region?' ／ '+region.name:'')+'。点は地域読解の案内位置で、同じ大きさです。生産量・出荷額・施設の位置を表しません。';
  for(const link of all<HTMLAnchorElement>('[data-industry-nature-link]'))link.href=canadaIndustryComparisonUrl(new URL(location.href),new URL(link.dataset.industryNatureLink!,location.href),state,config.population.cmas.map((c:any)=>c.id)).href;
  const populationComparison=renderPopulationIndustryComparison(root,config,state);root.classList.toggle('is-learning-comparison',populationComparison);root.classList.toggle('is-population-comparison',populationComparison);
 }
 function update(patch:Partial<CanadaIndustryState>){state={...state,...patch};if(state.province===state.compare)state.compare=null;history.pushState(null,'',writeCanadaIndustryState(new URL(location.href),state));render();}
 const chooseSector=(id:CanadaIndustrySector)=>update({sector:id,region:null,metric:sectorMetric(id)});
 for(const link of all<HTMLAnchorElement>('a[href="#canada-industry-statistics"]'))link.addEventListener('click',()=>{const statistics=$<HTMLDetailsElement>('#canada-industry-statistics');if(statistics)statistics.open=true;});
 for(const button of all<HTMLButtonElement>('button[data-industry-sector]'))button.addEventListener('click',()=>chooseSector(button.dataset.industrySector as CanadaIndustrySector));
 for(const [index,tab] of tabs.entries())tab.addEventListener('keydown',event=>{const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:null;if(next!==null){event.preventDefault();tabs[next].click();tabs[next].focus();}});
 for(const mark of all<HTMLElement|SVGElement>('[data-industry-region]')){
  const choose=()=>{const region=canadaIndustryRegions.find(r=>r.id===mark.dataset.industryRegion)!;update({sector:region.sector,region:region.id,province:region.province,metric:region.gdpMetric});};
  mark.addEventListener('click',choose);if(mark.tagName.toLowerCase()!=='button')mark.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});
 }
 for(const button of all<HTMLButtonElement>('[data-industry-overview]'))button.addEventListener('click',()=>{update({region:null});tabs.find(t=>t.dataset.industrySector===state.sector)?.focus();});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.region){event.preventDefault();update({region:null});tabs.find(t=>t.dataset.industrySector===state.sector)?.focus();}});
 for(const key of ['year','province','compare','metric'] as const)$<HTMLSelectElement>('[data-industry-'+key+']')?.addEventListener('change',event=>{const value=(event.target as HTMLSelectElement).value;update({[key]:key==='year'?Number(value):value||null,...(key==='province'||key==='metric'?{region:null}:{})});});
 for(const shape of all<SVGElement>('[data-industry-province-shape]')){
  const choose=()=>{const region=canadaIndustryRegions.find(r=>r.province===shape.dataset.industryProvinceShape&&(state.sector==='all'||r.sector===state.sector));update(region?{region:region.id,sector:region.sector,province:region.province,metric:region.gdpMetric}:{province:shape.dataset.industryProvinceShape!,region:null});};
  shape.addEventListener('click',choose);shape.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose();}});
 }
 $<HTMLInputElement>('[data-industry-only]')?.addEventListener('change',event=>update({only:(event.target as HTMLInputElement).checked}));
 $('[data-industry-focus]')?.addEventListener('click',()=>{const zoom=!state.zoom;if(zoom){const [xmin,ymin,xmax,ymax]=config.geometry.find((g:any)=>g.id===state.province).bounds,pad=20;map.setAttribute('viewBox',[Math.max(0,xmin-pad),Math.max(0,ymin-pad),Math.min(900,Math.max(80,xmax-xmin+pad*2)),Math.min(580,Math.max(80,ymax-ymin+pad*2))].join(' '));}else map.setAttribute('viewBox',initialFrame);update({zoom});});
 $('[data-industry-reset]')?.addEventListener('click',()=>{map.setAttribute('viewBox',initialFrame);update({only:false,zoom:false});});
 const savedStatus=(message:string)=>{const status=$('[data-industry-saved-status]');if(status)status.textContent=message;};
 $('[data-industry-save]')?.addEventListener('click',()=>{try{localStorage.setItem(storageKey,writeCanadaIndustryState(new URL(location.href),state).search);savedStatus('分野・地域と州別統計の選択を保存しました。');}catch{savedStatus('このブラウザーでは保存できません。URLで選択を保持できます。');}});
 $('[data-industry-restore]')?.addEventListener('click',()=>{try{const saved=localStorage.getItem(storageKey);if(saved){state=selection(new URL(saved,location.href));history.pushState(null,'',writeCanadaIndustryState(new URL(location.href),state));render();savedStatus('保存した選択を復元しました。');}else savedStatus('保存した選択はありません。');}catch{savedStatus('保存を読み出せません。URLで選択を保持できます。');}});
 window.addEventListener('popstate',()=>{state=selection(new URL(location.href));render();});render();
 void hydrateCanadaPopulationGeometry(root,'[data-industry-config]',{config,onReady:render,onError:render});
}
