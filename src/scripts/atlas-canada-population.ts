import {readCanadaPopulationState,writeCanadaPopulationState,formatCanadaPopulationValue,canadaPopulationDensityColor,canadaPopulationNatureUrl,canadaPopulationIndustryUrl,canadaPopulationFrame,populationStateKeys,populationStorageKey,type CanadaPopulationState} from '../lib/atlas-canada-population';
export function initCanadaPopulation(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-population-config]')!.textContent!),ids=config.cmas.map((r:any)=>r.id),initialUrl=new URL(location.href);
 let initial=initialUrl;
 if(!populationStateKeys.some(key=>initialUrl.searchParams.has(key)))try{const stored=localStorage.getItem(populationStorageKey);if(stored){const params=new URLSearchParams(stored);initial=new URL(initialUrl);for(const key of populationStateKeys){const value=params.get(key);if(value)initial.searchParams.set(key,value);}}}catch{}
 let state=readCanadaPopulationState(initial,ids);
 if(initial!==initialUrl)history.replaceState(null,'',writeCanadaPopulationState(initialUrl,state));
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const metricValue=(record:any)=>state.metric==='density'?record.density2021:record.population[state.year];
 function alignQuantityLegend(){const map=root.querySelector<SVGSVGElement>('[data-population-map]')!,legend=root.querySelector<SVGSVGElement>('[data-population-population-legend] svg');const matrix=map.getScreenCTM?.();if(legend&&matrix&&Number.isFinite(matrix.a)&&matrix.a>0){const frame=canadaPopulationFrame(state,config.geometry);legend.style.width=`${280*matrix.a*frame[2]/760}px`;}}
 function render(){
  for(const key of ['year','cma','compare','metric','zoom'])$<HTMLSelectElement>(`[data-population-${key}]`).value=String(state[key as keyof CanadaPopulationState]??'');
  $<HTMLSelectElement>('[data-population-year]').disabled=state.metric==='density';
  for(const option of $<HTMLSelectElement>('[data-population-compare]').options)option.disabled=option.value===state.cma;
  $('[data-population-only]').setAttribute('aria-pressed',String(state.only));
  const selected=config.cmas.find((r:any)=>r.id===state.cma),compare=config.cmas.find((r:any)=>r.id===state.compare),max=Math.max(1,...config.cmas.flatMap((r:any)=>state.metric==='density'?[r.density2021.value??0]:[r.population[2016].value??0,r.population[2021].value??0])),unit=state.metric==='density'?'人/km²':'人',frame=canadaPopulationFrame(state,config.geometry),scale=frame[2]/760;
  root.querySelector('[data-population-map]')!.setAttribute('viewBox',frame.join(' '));
  for(const g of root.querySelectorAll<SVGElement>('[data-population-map-cma]')){
   const id=g.dataset.populationMapCma!,r=config.cmas.find((r:any)=>r.id===id),v=metricValue(r),isSelected=[state.cma,state.compare].includes(id);g.style.display=state.only&&!isSelected?'none':'';g.setAttribute('aria-pressed',String(id===state.cma));g.classList.toggle('is-selected-cma',id===state.cma);g.classList.toggle('is-comparing-cma',id===state.compare);
   const polygon=g.querySelector<SVGPathElement>('[data-population-boundary]')!;polygon.style.fill=state.metric==='density'?canadaPopulationDensityColor(v.value):'#c7d9bc';
   const circle=g.querySelector<SVGCircleElement>('[data-population-symbol]')!;circle.style.display=state.metric==='population'&&v.value!==null?'':'none';circle.setAttribute('r',String(v.value===null?0:Math.sqrt(v.value/max)*22*scale));
   g.querySelector('title')!.textContent=`${r.name}都市圏、${state.year}年 ${formatCanadaPopulationValue(v.value,state.metric)} ${unit}${v.symbol?' '+v.symbol:''}`;
   const label=g.querySelector<SVGTextElement>('[data-population-label]')!;label.style.display=isSelected||['535','462','933'].includes(id)&&!state.only?'':'none';label.style.fontSize=`${18*scale}px`;
  }
  const cards=[selected,compare].filter(Boolean).map((r:any)=>{const v=metricValue(r);return `${r.name}: ${formatCanadaPopulationValue(v.value,state.metric)}${v.value===null?'':' '+unit}${v.symbol?' ('+v.symbol+')':''}`;});
  $('[data-population-comparison]').textContent=`${state.year}年 ${state.metric==='density'?'都市圏全体の人口密度':'都市圏人口'} — ${cards.join(' / ')}`;
  const growth=(r:any)=>r.changePercent.value===null?'未公表':`${r.changePercent.value>0?'+':''}${r.changePercent.value.toFixed(1)}%${r.changePercent.symbol?' '+r.changePercent.symbol:''}`;
  $('[data-population-change]').textContent=`2016→2021年の変化: ${selected.name} ${growth(selected)}${compare?' / '+compare.name+' '+growth(compare):''}。2021年境界での比較。`;
  $('[data-population-map-status]').textContent=`境界は2021年固定 / ${state.metric==='density'?'2021年密度を色で表示':state.year+'年人口を円の面積で表示'} / ${state.only?'選択した都市圏だけ':'41都市圏'} / ${state.zoom==='country'?'カナダ全体':state.zoom==='selected'?'選択都市圏を拡大':'南部'}`;
  $('[data-population-population-legend]').hidden=state.metric!=='population';$('[data-population-density-legend]').hidden=state.metric!=='density';
  for(const row of root.querySelectorAll<HTMLElement>('[data-population-row]')){const r=config.cmas.find((r:any)=>r.id===row.dataset.populationRow),v=metricValue(r);row.classList.toggle('is-selected-province',[state.cma,state.compare].includes(r.id));const bar=row.querySelector<HTMLElement>('[data-population-bar]')!;bar.style.width=v.value===null?'0%':`${v.value/max*100}%`;bar.parentElement!.classList.toggle('is-missing',v.value===null);bar.parentElement!.setAttribute('aria-label',`${r.name}: ${formatCanadaPopulationValue(v.value,state.metric)} ${unit}`);}
  for(const td of root.querySelectorAll<HTMLElement>('[data-population-cell]'))td.classList.toggle('is-current-metric',td.dataset.populationCell===(state.metric==='density'?'density':String(state.year)));
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-population-nature-link]'))a.href=canadaPopulationNatureUrl(new URL(location.href),new URL(a.dataset.populationNatureLink!,location.href),state).href;
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-population-industry-link]'))a.href=canadaPopulationIndustryUrl(new URL(location.href),new URL(a.dataset.populationIndustryLink!,location.href),state,config.geometry,config.industryProvinces).href;
  try{localStorage.setItem(populationStorageKey,writeCanadaPopulationState(new URL(location.href),state).searchParams.toString());}catch{}
  alignQuantityLegend();
 }
 function update(patch:Partial<CanadaPopulationState>){state={...state,...patch};if(state.metric==='density')state.year=2021;if(state.compare===state.cma)state.compare=null;history.pushState(null,'',writeCanadaPopulationState(new URL(location.href),state));render();}
 for(const key of ['year','cma','compare','metric','zoom'])$<HTMLSelectElement>(`[data-population-${key}]`).addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;update({[key]:key==='year'?Number(value):value||null});});
 for(const marker of root.querySelectorAll<SVGElement>('[data-population-map-cma]')){const choose=()=>update({cma:marker.dataset.populationMapCma});marker.addEventListener('click',choose);marker.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
 for(const button of root.querySelectorAll<HTMLElement>('[data-population-locate]'))button.addEventListener('click',()=>update({cma:button.dataset.populationLocate,zoom:'selected'}));
 $('[data-population-only]').addEventListener('click',()=>update({only:!state.only}));$('[data-population-reset]').addEventListener('click',()=>update({only:false,zoom:'south'}));
 window.addEventListener('popstate',()=>{state=readCanadaPopulationState(new URL(location.href),ids);render();});
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(alignQuantityLegend);observer.observe(root.querySelector('[data-population-map]')!);}
 window.addEventListener('resize',alignQuantityLegend);
 render();
}
