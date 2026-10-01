import {readCanadaIndustryState,writeCanadaIndustryState,formatCanadaIndustryValue,industryShareColor,canadaIndustryComparisonUrl,type CanadaIndustryState} from '../lib/atlas-canada-industry';
import {renderPopulationIndustryComparison} from './atlas-canada-population-industry-comparison';
import {hydrateCanadaPopulationGeometry} from './atlas-canada-population-geometry-loader';
export function initCanadaIndustry(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-industry-config]')!.textContent!),ids=config.provinces.map((p:any)=>p.id),$=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const valueText=(v:any)=>`${formatCanadaIndustryValue(v.value)}${v.value===null?'':'%'}${[v.status,v.symbol].filter(Boolean).length?`（${[v.status,v.symbol].filter(Boolean).join(' ')}）`:''}`;
 let state=readCanadaIndustryState(new URL(location.href),config.years,ids);const storageKey='insight-journal:canada-industry:v1';
 function render(){
  for(const key of ['year','province','compare','metric'])$<HTMLSelectElement>(`[data-industry-${key}]`).value=String(state[key as keyof CanadaIndustryState]??'');
  for(const o of $<HTMLSelectElement>('[data-industry-compare]').options)o.disabled=o.value===state.province;
  $<HTMLInputElement>('[data-industry-only]').checked=state.only;
  const rows=config.data.filter((r:any)=>r.year===state.year),metric=config.metrics.find((m:any)=>m.id===state.metric),selected=[state.province,state.compare].filter(Boolean);
  root.querySelector('[data-industry-map] title')!.textContent=`${state.year}年、${metric.name}の州内GDP割合${state.only?'（選択州のみ）':''}`;
  for(const shape of root.querySelectorAll<SVGPathElement>('[data-industry-province-shape]')){const id=shape.dataset.industryProvinceShape!,r=rows.find((r:any)=>r.id===id),v=r.values[state.metric];shape.setAttribute('fill',industryShareColor(v.value));shape.style.display=state.only&&!selected.includes(id)?'none':'';shape.classList.toggle('is-selected-industry',id===state.province);shape.classList.toggle('is-compared-industry',id===state.compare);shape.setAttribute('aria-pressed',String(id===state.province));shape.setAttribute('aria-label',`${r.name} ${state.year}年 ${metric.name} ${valueText(v)}`);shape.querySelector('title')!.textContent=shape.getAttribute('aria-label')!;}
  for(const label of root.querySelectorAll<SVGElement>('[data-industry-province-label]'))label.style.display=state.only&&!selected.includes(label.dataset.industryProvinceLabel!)?'none':'';
  for(const row of root.querySelectorAll<HTMLElement>('[data-industry-row]')){row.hidden=Number(row.dataset.year)!==state.year;row.classList.toggle('is-selected-province',selected.includes(row.dataset.industryRow!));}
  for(const cell of root.querySelectorAll<HTMLElement>('[data-industry-cell]'))cell.classList.toggle('is-current-metric',cell.dataset.industryCell===state.metric);
  for(const bar of root.querySelectorAll<HTMLElement>('[data-industry-bar]')){const row=bar.closest<HTMLElement>('[data-industry-row]')!,r=config.data.find((r:any)=>r.year===Number(row.dataset.year)&&r.id===row.dataset.industryRow),v=r.values[state.metric];bar.style.width=`${v.value??0}%`;bar.parentElement!.classList.toggle('is-missing',v.value===null);bar.parentElement!.setAttribute('aria-label',`${r.name}: ${valueText(v)}`);}
  for(const panel of root.querySelectorAll<HTMLElement>('[data-industry-reading]'))panel.hidden=panel.dataset.industryReading!==state.metric;
  const values=selected.map(id=>{const r=rows.find((r:any)=>r.id===id),v=r.values[state.metric];return `${r.name}: ${formatCanadaIndustryValue(v.value)}${v.value===null?'':'%'}${[v.status,v.symbol].filter(Boolean).length?`（${[v.status,v.symbol].filter(Boolean).join(' ')}）`:''}`;});
  $('[data-industry-comparison]').textContent=`${state.year}年 ${metric.name}の州内GDP割合 — ${values.join(' / ')}`;
  for(const [i,slot] of [...root.querySelectorAll<HTMLElement>('[data-industry-card]')].entries()){const id=selected[i];slot.hidden=!id;if(id){const r=rows.find((r:any)=>r.id===id),v=r.values[state.metric];slot.querySelector('[data-industry-card-name]')!.textContent=r.name;slot.querySelector('[data-industry-card-value]')!.textContent=valueText(v);const bar=slot.querySelector<HTMLElement>('[data-industry-card-bar]')!;bar.style.width=`${v.value??0}%`;bar.parentElement!.classList.toggle('is-missing',v.value===null);}}
  const bounds=config.geometry.find((g:any)=>g.id===state.province).bounds,[xmin,ymin,xmax,ymax]=bounds,pad=20,w=Math.max(80,xmax-xmin+pad*2),h=Math.max(80,ymax-ymin+pad*2);root.querySelector('[data-industry-map]')!.setAttribute('viewBox',state.zoom?[Math.max(0,xmin-pad),Math.max(0,ymin-pad),Math.min(900,w),Math.min(580,h)].join(' '):'0 0 900 580');
  $('[data-industry-focus]').setAttribute('aria-pressed',String(state.zoom));$('[data-industry-map-status]').textContent=`${state.year}年・州内GDP割合（%）。${state.only?'選んだ州・比較州のみ':'13州・準州'}を表示。${state.zoom?'選択州を拡大。':''}`;
  for(const a of root.querySelectorAll<HTMLAnchorElement>('[data-industry-nature-link]'))a.href=canadaIndustryComparisonUrl(new URL(location.href),new URL(a.dataset.industryNatureLink!,location.href),state,config.population.cmas.map((c:any)=>c.id)).href;
  const populationComparison=renderPopulationIndustryComparison(root,config,state);
  root.classList.toggle('is-learning-comparison',populationComparison);
  root.classList.toggle('is-population-comparison',populationComparison);
  const general=$<HTMLDetailsElement>('[data-industry-general-reading]');
  if(general.dataset.comparison!==String(populationComparison)){general.open=!populationComparison;general.dataset.comparison=String(populationComparison);}
 }
 function update(patch:Partial<CanadaIndustryState>){state={...state,...patch};if(state.province===state.compare)state.compare=null;history.pushState(null,'',writeCanadaIndustryState(new URL(location.href),state));render();}
 for(const key of ['year','province','compare','metric'])$<HTMLSelectElement>(`[data-industry-${key}]`).addEventListener('change',e=>{const v=(e.target as HTMLSelectElement).value;update({[key]:key==='year'?Number(v):v||null});});
 for(const shape of root.querySelectorAll<SVGElement>('[data-industry-province-shape]')){const choose=()=>update({province:shape.dataset.industryProvinceShape!});shape.addEventListener('click',choose);shape.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});}
 for(const b of root.querySelectorAll<HTMLElement>('[data-industry-example]'))b.addEventListener('click',()=>update({province:b.dataset.province!,compare:b.dataset.compare||null,metric:b.dataset.industryExample as CanadaIndustryState['metric']}));
 $('[data-industry-only]').addEventListener('change',e=>update({only:(e.target as HTMLInputElement).checked}));$('[data-industry-focus]').addEventListener('click',()=>update({zoom:!state.zoom}));$('[data-industry-reset]').addEventListener('click',()=>update({only:false,zoom:false}));
 $('[data-industry-save]').addEventListener('click',()=>{try{localStorage.setItem(storageKey,writeCanadaIndustryState(new URL(location.href),state).search);$('[data-industry-saved-status]').textContent='この年・分類・州比較・地図表示を保存しました。';}catch{$('[data-industry-saved-status]').textContent='このブラウザでは保存できません。URLで比較を保持できます。';}});
 $('[data-industry-restore]').addEventListener('click',()=>{try{const saved=localStorage.getItem(storageKey);if(saved){state=readCanadaIndustryState(new URL(saved,location.href),config.years,ids);history.pushState(null,'',writeCanadaIndustryState(new URL(location.href),state));render();$('[data-industry-saved-status]').textContent='保存した比較を復元しました。';}else $('[data-industry-saved-status]').textContent='保存した比較はありません。';}catch{$('[data-industry-saved-status]').textContent='保存を読み出せません。URLで比較を保持できます。';}});
 window.addEventListener('popstate',()=>{state=readCanadaIndustryState(new URL(location.href),config.years,ids);render();});render();
 void hydrateCanadaPopulationGeometry(root,'[data-industry-config]',{config,onReady:render,onError:render});
}
