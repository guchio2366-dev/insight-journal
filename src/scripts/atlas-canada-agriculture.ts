import {readCanadaAgricultureState,writeCanadaAgricultureState,type CanadaAgricultureState} from '../lib/atlas-canada-agriculture';
export function initCanadaAgriculture(root:HTMLElement){
 const config=JSON.parse(root.querySelector('[data-canola-config]')!.textContent!),ids=config.provinces.map((p:any)=>p.id);
 let state=readCanadaAgricultureState(new URL(location.href),config.years,ids);
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const fmt=(v:number|null)=>v===null?'未収録':v.toLocaleString('ja-JP');
 function render(){
  for(const key of ['year','province','compare','metric'])$<HTMLSelectElement>(`[data-canola-${key}]`).value=String(state[key as keyof CanadaAgricultureState]??'');
  for(const option of $<HTMLSelectElement>('[data-canola-compare]').options)option.disabled=option.value===state.province;
  for(const row of root.querySelectorAll<HTMLElement>('[data-canola-row]'))row.hidden=Number(row.dataset.year)!==state.year;
  for(const cell of root.querySelectorAll<HTMLElement>('[data-canola-cell]'))cell.classList.toggle('is-current-metric',cell.dataset.canolaCell===state.metric);
  for(const row of root.querySelectorAll<HTMLElement>('[data-canola-row]'))row.classList.toggle('is-selected-province',[state.province,state.compare].includes(row.dataset.canolaRow!));
  const metric=config.metrics.find((m:any)=>m.id===state.metric),data=config.data.filter((r:any)=>r.year===state.year);
  const cards=[state.province,state.compare].filter(Boolean).map(id=>{const r=data.find((r:any)=>r.id===id),v=r.values[state.metric],flags=[v.status,v.symbol].filter(Boolean).join(' ');return `${r.name}: ${fmt(v.value)} ${metric.unit}${flags?`（品質記号 ${flags}）`:''}`;});
  $('[data-canola-comparison]').textContent=`${state.year}年 ${metric.name} — ${cards.join(' ／ ')}`;
  for(const button of root.querySelectorAll<HTMLElement>('[data-canola-province-button]'))button.setAttribute('aria-pressed',String(button.dataset.canolaProvinceButton===state.province));
  const values=data.filter((r:any)=>r.id!=='Canada').map((r:any)=>r.values[state.metric].value).filter((v:any)=>v!==null),max=Math.max(1,...values);
  for(const bar of root.querySelectorAll<HTMLElement>('[data-canola-bar]')){const r=data.find((r:any)=>r.id===bar.dataset.canolaBar),v=r.values[state.metric].value;bar.style.width=v===null?'0':`${v/max*100}%`;bar.parentElement!.classList.toggle('is-missing',v===null);bar.parentElement!.setAttribute('aria-label',`${r.name}: ${fmt(v)} ${metric.unit}`);}
  $('[data-canola-map-scroll]').classList.toggle('is-zoomed',state.zoom);$('[data-canola-zoom]').setAttribute('aria-pressed',String(state.zoom));
 }
 function update(patch:Partial<CanadaAgricultureState>){state={...state,...patch};if(state.compare===state.province)state.compare=null;history.pushState(null,'',writeCanadaAgricultureState(new URL(location.href),state));render();}
 for(const key of ['year','province','compare','metric'])$<HTMLSelectElement>(`[data-canola-${key}]`).addEventListener('change',e=>{const value=(e.target as HTMLSelectElement).value;update({[key]:key==='year'?Number(value):value||null});});
 for(const button of root.querySelectorAll<HTMLElement>('[data-canola-province-button]'))button.addEventListener('click',()=>update({province:button.dataset.canolaProvinceButton!}));
 $('[data-canola-zoom]').addEventListener('click',()=>update({zoom:!state.zoom}));$('[data-canola-map-reset]').addEventListener('click',()=>{update({zoom:false});$('[data-canola-map-scroll]').scrollTo?.(0,0);});
 window.addEventListener('popstate',()=>{state=readCanadaAgricultureState(new URL(location.href),config.years,ids);render();});render();
}
