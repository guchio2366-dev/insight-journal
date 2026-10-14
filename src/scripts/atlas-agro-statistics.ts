import {renderAgroExistingStatistics} from './atlas-agro-existing-statistics.ts';
import {agroProduction,agroTopicSeries,renderAgroColumns,type AgroData,type AgroReference} from '../lib/atlas-agro-statistics.ts';
type Selection={country:string;topic:string;active?:boolean;year?:number};
type Config={scope:string;country:string;topic:string;topics:string[];countries:{code:string;name:string}[];nationalOnly:boolean;url:string;files:Record<string,{file:string}>;reference?:AgroReference;labels:Record<string,string>;sources?:{overview:string;selected:string}};
const instances=new WeakMap<HTMLElement,(selection:Selection)=>void>();
const requested=new Map<string,Promise<AgroData>>();
function load(url:string){
 let pending=requested.get(url);
 if(!pending){pending=fetch(url).then(async response=>{if(!response.ok)throw Error('統計原表を取得できません');const bytes=new Uint8Array(await response.arrayBuffer());const text=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);const data=JSON.parse(text);if(!data.countries||!Array.isArray(data.sources)||!data.method)throw Error('統計の形式が不正です');return data as AgroData;}).catch(error=>{requested.delete(url);throw error;});requested.set(url,pending);}
 return pending;
}
function initialize(host:HTMLElement){
 if(instances.has(host))return instances.get(host)!;
 const configNode=host.querySelector('[data-agro-config]');
 // Standalone readers and no-script fixtures may retain HTML while removing
 // embedded configuration. Optional statistics must never break the atlas.
 if(!configNode){host.hidden=true;return (_selection:Selection)=>{};}
 const config=JSON.parse(configNode.textContent!) as Config;
 const content=host.querySelector<HTMLElement>('[data-agro-content]')!,status=host.querySelector<HTMLElement>('[data-agro-status]')!,heading=host.querySelector<HTMLElement>('[data-agro-heading]')!,retry=host.querySelector<HTMLButtonElement>('[data-agro-retry]')!,seriesSelect=host.querySelector<HTMLSelectElement>('[data-agro-series-select]')!,countrySelect=host.querySelector<HTMLSelectElement>('[data-agro-country-select]');
 let selection:Selection={country:config.country,topic:config.topic,active:true},generation=0,chosen='';
 async function update(next:Selection){
  const changed=selection.country!==next.country||selection.topic!==next.topic;if(changed)chosen='';selection={...next};const token=++generation;
  // Japan's existing, independent display is excluded even on an East Asia map.
  host.hidden=next.active===false||next.country==='JPN'||config.nationalOnly&&!next.country;
  if(host.hidden){content.replaceChildren();return;}
  heading.textContent=config.scope+' · '+(config.countries.find(c=>c.code===next.country)?.name??next.country);
  if(countrySelect)countrySelect.value=next.country;
  host.dataset.agroReady='false';retry.hidden=true;status.textContent='国・Worldの同定義の原値を読み込んでいます…';
  // Clear immediately so a pending request cannot display the previous country.
  content.replaceChildren();
  try{
   const overview=['overview','all','farming-overview','farming-all','crops'].includes(next.topic);
   const allowed=overview?[...new Set((config.topics??[]).flatMap(agroTopicSeries))]:agroTopicSeries(next.topic);
   // An overview offers existing products; request one product at a time rather
   // than downloading all national series merely to populate the selector.
   const ids=overview?[chosen||allowed.find(id=>config.files[id])||'']:allowed;
   const datasets=await Promise.all(ids.filter(id=>config.files[id]).map(id=>load(config.url+config.files[id].file)));if(token!==generation)return;
   const data:AgroData={countries:{},sources:datasets[0]?.sources??[],method:datasets[0]?.method??'選択品目の保存原表は未収録です。'};
   for(const dataset of datasets)for(const [code,country] of Object.entries(dataset.countries)){const existing=data.countries[code];data.countries[code]={name:country.name,series:existing?[...existing.series,...country.series.filter(s=>!existing.series.some(old=>old.id===s.id))]:country.series};}
   const available=data.countries[next.country]?.series.filter(s=>agroProduction(s)&&allowed.includes(s.id))??[];
   const id=available.find(s=>s.id===chosen)?.id??available[0]?.id??ids[0]??allowed[0];
   const options=overview?allowed.filter(id=>config.files[id]).map(id=>({id,label:available.find(s=>s.id===id)?.label??config.labels[id]??id})):available;
   seriesSelect.replaceChildren(...options.map(series=>{const option=document.createElement('option');option.value=series.id;option.textContent=series.label;return option;}));seriesSelect.value=id;
   host.querySelector<HTMLElement>('[data-agro-series-control]')!.hidden=options.length<2;
   const renderer=overview?(await import('../lib/atlas-agro-statistics-overview.ts')).renderAgroOverviewColumns:renderAgroColumns;
   if(token!==generation)return;
   const sourceHost=host.querySelector<HTMLElement>('[data-agro-sources]');if(sourceHost&&config.sources)sourceHost.innerHTML=overview?config.sources.overview:config.sources.selected;
   status.textContent=overview?`${next.year??2024}年・全国値。地図の収穫面積・家畜密度とは別の数量です。左・中央・右の原表と欠測を個別に示します。`:'生産量と世界シェア → 国内での使用・輸出 → 輸出先の量と構成比。年・製品が異なる参考は別掲します。';
   content.innerHTML=renderer(data,next.country,id,next.year??2024,config.reference);
   await renderAgroExistingStatistics(content,next.country,id,!overview);
   if(!overview)for(const details of content.querySelectorAll<HTMLDetailsElement>('.agro-other-reference'))if(!details.querySelector('[data-agro-existing-trade],[data-agro-existing-supply]')?.children.length)details.remove();
   if(token===generation&&!host.hidden)host.dataset.agroReady='true';
  }catch{if(token!==generation)return;status.textContent='統計を取得できませんでした。地図の選択は保持しています。';retry.hidden=false;}
 }
 host.addEventListener('click',event=>{const a=(event.target as Element).closest<HTMLAnchorElement>('[data-agro-reference-link]');if(!a)return;const target=document.getElementById(a.hash.slice(1));if(!target)return;for(let node:HTMLElement|null=target;node;node=node.parentElement)if(node instanceof HTMLDetailsElement)node.open=true;});
 seriesSelect.addEventListener('change',()=>{chosen=seriesSelect.value;void update(selection);});
 countrySelect?.addEventListener('change',()=>void update({...selection,country:countrySelect.value}));
 retry.addEventListener('click',()=>void update(selection));
 const sync=(next:Selection)=>{void update(next);};instances.set(host,sync);
 if(config.country)sync(selection);
 return sync;
}
export function initAgroStatistics(){for(const host of document.querySelectorAll<HTMLElement>('[data-agro-statistics]'))initialize(host);}
/** Called at existing render boundaries; late data never restores an old choice. */
export function syncAgroStatistics(root:ParentNode,selection:Selection){
 const host=root.querySelector<HTMLElement>('[data-agro-statistics]');if(!host)return;
 const control=host.querySelector<HTMLElement>('[data-agro-country-control]');if(control)control.hidden=true;
 initialize(host)(selection);
}
