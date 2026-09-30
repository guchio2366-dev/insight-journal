import {readCanadaForestryState,writeCanadaForestryState,formatCanadaForestryValue,canadaForestryComparisonUrl,type CanadaForestryState} from '../lib/atlas-canada-forestry';
export function initCanadaForestry(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-forestry-config]')!.textContent!),ids=config.provinces.map((p:any)=>p.id);
 let state=readCanadaForestryState(new URL(location.href),config.years,ids);
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 function render(){
  for(const key of ['year','province','compare','metric','cover','region'])$<HTMLSelectElement>(`[data-forestry-${key}]`).value=String(state[key as keyof CanadaForestryState]??'');
  for(const option of $<HTMLSelectElement>('[data-forestry-compare]').options)option.disabled=option.value===state.province;
  const data=config.data.filter((r:any)=>r.year===state.year),metric=config.metrics.find((m:any)=>m.id===state.metric),max=Math.max(1,...data.filter((r:any)=>r.id!=='Canada').map((r:any)=>r.values[state.metric].value??0));
  for(const row of root.querySelectorAll<HTMLElement>('[data-forestry-row]')){row.hidden=Number(row.dataset.year)!==state.year;row.classList.toggle('is-selected-province',[state.province,state.compare].includes(row.dataset.forestryRow!));}
  for(const cell of root.querySelectorAll<HTMLElement>('[data-forestry-cell]'))cell.classList.toggle('is-current-metric',cell.dataset.forestryCell===state.metric);
  for(const bar of root.querySelectorAll<HTMLElement>('[data-forestry-bar]')){const r=data.find((r:any)=>r.id===bar.dataset.forestryBar),v=r.values[state.metric];bar.style.width=v.value===null?'0%':`${v.value/max*100}%`;bar.parentElement!.classList.toggle('is-missing',v.value===null);bar.parentElement!.setAttribute('aria-label',`${r.name}: ${v.status==='x'?'秘匿 x':formatCanadaForestryValue(v.value)} 千CAD`);}
  const cards=[state.province,state.compare].filter(Boolean).map(id=>{const r=data.find((r:any)=>r.id===id),v=r.values[state.metric],flags=[v.status,v.symbol].filter(Boolean).join(' ');return `${r.name}: ${v.status==='x'?'秘匿':formatCanadaForestryValue(v.value)}${v.value===null?'':' 千CAD'}${flags?`（${flags}）`:''}`;});
  $('[data-forestry-comparison]').textContent=`${state.year}年 ${metric.name}の名目製造品収入 — ${cards.join(' / ')}`;
  for(const image of root.querySelectorAll<SVGImageElement>('[data-forestry-cover-layer]'))image.style.display=image.dataset.forestryCoverLayer===state.cover?'':'none';
  for(const panel of root.querySelectorAll<HTMLElement>('[data-forestry-region-reading]'))panel.hidden=panel.dataset.forestryRegionReading!==state.region;
  for(const marker of root.querySelectorAll<SVGElement>('[data-forestry-region-marker]'))marker.setAttribute('aria-pressed',String(marker.dataset.forestryRegionMarker===state.region));
  const region=config.regions.find((r:any)=>r.id===state.region),cover=state.cover==='all'?'森林4分類すべて':config.classes.find((c:any)=>c.id===state.cover).name;
  const [x,y]=region.point;const frame=state.zoom?[Math.max(0,Math.min(600,x-150)),Math.max(0,Math.min(360,y-110)),300,220]:[0,0,900,580];root.querySelector('[data-forestry-map]')!.setAttribute('viewBox',frame.join(' '));
  $('[data-forestry-focus]').setAttribute('aria-pressed',String(state.zoom));$('[data-forestry-map-status]').textContent=`2020年固定：${cover}。${state.zoom?region.name+'の位置を拡大':'カナダ全体'}。`;
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-forestry-nature-link]'))a.href=canadaForestryComparisonUrl(new URL(location.href),new URL(a.dataset.forestryNatureLink!,location.href),state).href;
 }
 function update(patch:Partial<CanadaForestryState>){state={...state,...patch};if(state.compare===state.province)state.compare=null;history.pushState(null,'',writeCanadaForestryState(new URL(location.href),state));render();}
 for(const key of ['year','province','compare','metric','cover'])$<HTMLSelectElement>(`[data-forestry-${key}]`).addEventListener('change',e=>{const v=(e.target as HTMLSelectElement).value;update({[key]:key==='year'?Number(v):v||null});});
 const selectRegion=(id:string)=>{const region=config.regions.find((r:any)=>r.id===id);if(region)update({region:id as CanadaForestryState['region'],province:region.province});};
 $<HTMLSelectElement>('[data-forestry-region]').addEventListener('change',e=>selectRegion((e.target as HTMLSelectElement).value));
 for(const marker of root.querySelectorAll<SVGElement>('[data-forestry-region-marker]')){marker.addEventListener('click',()=>selectRegion(marker.dataset.forestryRegionMarker!));marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(marker.dataset.forestryRegionMarker!);}});}
 $('[data-forestry-focus]').addEventListener('click',()=>update({zoom:!state.zoom}));$('[data-forestry-map-reset]').addEventListener('click',()=>update({cover:'all',zoom:false}));
 window.addEventListener('popstate',()=>{state=readCanadaForestryState(new URL(location.href),config.years,ids);render();});render();
}
