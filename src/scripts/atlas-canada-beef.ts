import {initCanadaCensusMap} from './atlas-canada-census-map';
import {readCanadaCensusMapState,writeCanadaCensusMapState,type CanadaCensusMapState} from '../lib/atlas-canada-census-map';
import {readCanadaBeefState,writeCanadaBeefState,formatCanadaBeefValue,type CanadaBeefState} from '../lib/atlas-canada-beef';
import {buildCanadaCropNatureUrl} from '../lib/atlas-canada-crop-comparison';
export function initCanadaBeef(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-beef-config]')!.textContent!),ids=config.provinces.map((p:any)=>p.id);
 let state=readCanadaBeefState(new URL(location.href),config.years,ids);
 const censusRoot=root.querySelector<HTMLElement>('[data-canada-census]'),censusConfig=censusRoot?JSON.parse(censusRoot.querySelector('[data-canada-census-config]')!.textContent!):null,censusIds=Object.keys(censusConfig?.records??{}),censusMap=censusRoot?initCanadaCensusMap(censusRoot):undefined;
 let censusState=readCanadaCensusMapState(new URL(location.href),censusIds);
 const sourceUrl=()=>writeCanadaCensusMapState(writeCanadaBeefState(new URL(location.href),state),censusState);
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 function render(){
  for(const key of ['year','province','compare','metric','map'])$<HTMLSelectElement>(`[data-beef-${key}]`).value=String(state[key as keyof CanadaBeefState]??'');
  for(const option of $<HTMLSelectElement>('[data-beef-compare]').options)option.disabled=option.value===state.province;
  for(const row of root.querySelectorAll<HTMLElement>('[data-beef-row]')){row.hidden=Number(row.dataset.year)!==state.year;row.classList.toggle('is-selected-province',[state.province,state.compare].includes(row.dataset.beefRow!));}
  for(const cell of root.querySelectorAll<HTMLElement>('[data-beef-cell]'))cell.classList.toggle('is-current-metric',cell.dataset.beefCell===state.metric);
  const metric=config.metrics.find((m:any)=>m.id===state.metric),data=config.data.filter((r:any)=>r.year===state.year);
  const cards=[state.province,state.compare].filter(Boolean).map(id=>{const r=data.find((r:any)=>r.id===id),v=r.values[state.metric],flags=[v.status,v.symbol].filter(Boolean).join(' ');return `${r.name}: ${formatCanadaBeefValue(v.value)} ${metric.unit}${flags?`（品質記号 ${flags}）`:''}`;});
  $('[data-beef-comparison]').textContent=`${state.year}年7月1日 ${metric.name} — ${cards.join(' ／ ')}`;
  const max=Math.max(1,...data.filter((r:any)=>r.id!=='Canada').map((r:any)=>r.values[state.metric].value??0));
  for(const bar of root.querySelectorAll<HTMLElement>('[data-beef-bar]')){const r=data.find((r:any)=>r.id===bar.dataset.beefBar),v=r.values[state.metric].value;bar.style.width=v===null?'0%':`${v/max*100}%`;bar.parentElement!.classList.toggle('is-missing',v===null);bar.parentElement!.setAttribute('aria-label',`${r.name}: ${formatCanadaBeefValue(v)} 千頭`);}
  for(const button of root.querySelectorAll<HTMLElement>('[data-beef-province-button]'))button.setAttribute('aria-pressed',String(button.dataset.beefProvinceButton===state.province));
  for(const panel of root.querySelectorAll<HTMLElement>('[data-beef-map-panel]'))panel.hidden=panel.dataset.beefMapPanel!==state.map;
  for(const scroll of root.querySelectorAll<HTMLElement>('[data-beef-map-scroll]'))scroll.classList.toggle('is-zoomed',state.zoom);
  $('[data-beef-zoom]').setAttribute('aria-pressed',String(state.zoom));
  censusMap?.render({product:state.map,...censusState});
  const source=sourceUrl();
  for(const link of root.querySelectorAll<HTMLAnchorElement>('[data-canada-crop-nature]')){const target=new URL(link.href,location.href);link.href=buildCanadaCropNatureUrl(source,'beef',target.searchParams.get('city')??'regina',(target.searchParams.get('view')??'climate') as 'climate'|'landform'|'water').href;}
  const primary=root.querySelector<HTMLElement>('[data-canada-crop-nature-primary]');if(primary)primary.textContent=`${censusConfig?.products?.[state.map]?.label??({beef:'肉用母牛',pasture:'放牧地',hay:'乾草など（Total hay）'})[state.map]}の2021年分布図とReginaの気候を並べる`;
 }
 function update(patch:Partial<CanadaBeefState>){state={...state,...patch};if(state.compare===state.province)state.compare=null;history.pushState(null,'',sourceUrl());render();}
 function updateCensus(patch:Partial<CanadaCensusMapState>){censusState={...censusState,...patch};if(!censusState.selected)censusState.only=false;history.pushState(null,'',sourceUrl());render();}
 censusRoot?.addEventListener('canada-census-select',event=>updateCensus({selected:(event as CustomEvent<{id:string|null}>).detail.id}));
 censusRoot?.addEventListener('canada-census-only',event=>updateCensus({only:(event as CustomEvent<{only:boolean}>).detail.only}));
 censusRoot?.addEventListener('canada-census-camera',event=>updateCensus({bounds:(event as CustomEvent<{bounds:CanadaCensusMapState['bounds']}>).detail.bounds}));
 censusRoot?.addEventListener('canada-census-reset',()=>updateCensus({selected:null,only:false,bounds:null}));
 for(const key of ['year','province','compare','metric','map'])$<HTMLSelectElement>(`[data-beef-${key}]`).addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;update({[key]:key==='year'?Number(value):value||null});});
 for(const button of root.querySelectorAll<HTMLElement>('[data-beef-province-button]'))button.addEventListener('click',()=>update({province:button.dataset.beefProvinceButton!}));
 $('[data-beef-zoom]').addEventListener('click',()=>update({zoom:!state.zoom}));$('[data-beef-map-reset]').addEventListener('click',()=>{update({zoom:false});for(const scroll of root.querySelectorAll<HTMLElement>('[data-beef-map-scroll]'))scroll.scrollTo?.(0,0);});
 window.addEventListener('popstate',()=>{state=readCanadaBeefState(new URL(location.href),config.years,ids);censusState=readCanadaCensusMapState(new URL(location.href),censusIds);render();});render();
}
