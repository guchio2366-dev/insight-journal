import {japanAreas,japanArea} from '../data/atlas/japan-areas';
import {japanSector,japanSiteInSector} from '../lib/atlas-japan-sectors';
import {japanBaseStyle} from '../lib/atlas-japan-map-style';
import {mountJapanInset} from './atlas-japan-inset';
import {japanClimateRegions} from '../data/atlas/japan-nature-v2';
import {formatJapanQuantity} from '../lib/atlas-japan-number';
import {japanFoundationPresentation} from './atlas-japan-foundation-presentations';
import {mountJapanAgricultureLayers} from './atlas-japan-agriculture-layers';
import {mountJapanNatureLayers,type JapanNatureLayers} from './atlas-japan-nature-layers';
import {japanAgricultureProducts,japanAgricultureSites,japanForestrySites} from '../data/atlas/japan-agriculture-v2';
import {japanNatureFeatureIds} from '../data/atlas/japan-nature-v2';
import {layoutJapanLabels} from '../lib/atlas-japan-label-layout';
import {readJapanState,writeJapanState,japanReturnURL,japanDefaults,type JapanState} from '../lib/atlas-japan-state';
import {japanReadings,japanIndustryReadings} from '../data/atlas/japan-reading';
import {industryScale,industryValueLabel,type IndustryAdmin,type IndustryTopic} from '../data/atlas/asia-industry';
import {decodeAsiaNumericGrid,readAsiaNumericCell,type AsiaNumericGrid} from '../lib/atlas-asia-numeric-grid';
import type {AsiaField} from '../lib/atlas-asia-state';
import type {AsiaClimateCity} from '../data/atlas/asia-climate-cities';
import type {JapanIndustryCluster} from '../data/atlas/japan-industry-clusters';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

type PopulationCity={id:string;name:string;coordinates:[number,number];population:number;areaKm2:number;density:number;history:Record<string,number>};
type Config={bounds:number[];assetBase:string;cities:AsiaClimateCity[];sites:JapanIndustryCluster[];industries:{id:string;label:string;color:string;lead:string;reason:string}[];populationCities:PopulationCity[];populationPlaces:{id:string;name:string;coordinates:[number,number];plain:string}[];natureAssetBase:string};
type Industry={admin:IndustryAdmin[];topics:IndustryTopic[];geometry:any};
type Population={width:number;height:number;bounds3857:number[];imageCoordinates:[number,number][];image:string;grid:string;breaks:number[];colors:string[];zeroColor:string;missingColor:string};
const root=document.querySelector<HTMLElement>('[data-japan-atlas]');
if(root)void start(root);

async function start(root:HTMLElement){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const all=<T extends HTMLElement=HTMLElement>(s:string)=>[...root.querySelectorAll<T>(s)];
 const config:Config=JSON.parse($('[data-japan-config]').textContent!);
 const context={prefectures:Array.from({length:47},(_,i)=>'JP-'+String(i+1).padStart(2,'0')),cities:[...config.cities,...config.populationCities].map(c=>c.id),climateCities:config.cities.map(c=>c.id),urbanCities:config.populationPlaces.map(c=>c.id),agricultureSites:japanAgricultureSites.map(s=>s.id),forestrySites:japanForestrySites.map(s=>s.id),naturalFeatures:[...Object.values(japanNatureFeatureIds).flat(),...Array.from({length:7},(_,i)=>'elevation-'+i*500),...Array.from({length:17},(_,i)=>'precipitation-'+(i+1)*250)],sites:config.sites.map(s=>s.id),siteIndustries:Object.fromEntries(config.sites.map(s=>[s.id,s.industries]))};
 let state=readJapanState(new URL(location.href),context);
 let inset:Awaited<ReturnType<typeof mountJapanInset>>|null=null;
 let map:import('maplibre-gl').Map|null=null,lib:typeof import('maplibre-gl')|null=null;
 let industry:Industry|null=null,population:Population|null=null,grid:AsiaNumericGrid|null=null,gridPromise:Promise<AsiaNumericGrid>|null=null;
 let nature:JapanNatureLayers|null=null,natureSample=0,renderRevision=0;
 let farming:ReturnType<typeof mountJapanAgricultureLayers>|null=null;
 let ready=false,suppressCamera=false,generation=0,timer:ReturnType<typeof setTimeout>|undefined;
 const markers:import('maplibre-gl').Marker[]=[];
 let point:[number,number]|null=null;
 const number=formatJapanQuantity;
 const camera=()=>{if(!map||!ready)return state.camera;const center=map.getCenter();return{lng:center.lng,lat:center.lat,zoom:map.getZoom()};};
 const quantity=()=>state.field==='industry'&&state.topic.startsWith('jp-');
 const status=(message:string,error=false)=>{$('[data-japan-map-status]').textContent=message;$('[data-japan-map-status]').hidden=!message;$('[data-japan-retry]').hidden=!error;root.dataset.mapError=String(error);};
 function persist(push:boolean){const url=writeJapanState(new URL(location.href),state);if(url.href!==location.href)history[push?'pushState':'replaceState']({},'',url);syncLinks();}
 function syncLinks(){
  $<HTMLAnchorElement>('[data-japan-return]').href=japanReturnURL(new URL(location.href),state).href;
  for(const a of all<HTMLAnchorElement>('[data-japan-field]')){
   const field=a.dataset.japanField as AsiaField;
   a.href=writeJapanState(new URL(a.href),{...state,field,topic:field===state.field?state.topic:japanDefaults[field],prefecture:field===state.field?state.prefecture:null,city:field===state.field?state.city:null,site:field===state.field?state.site:null,feature:field===state.field?state.feature:null}).href;
   if(field===state.field)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  }
  for(const a of all<HTMLAnchorElement>('.japan-region .regional-tabs a')){const u=new URL(a.href);u.pathname=u.pathname.replace(/\/(nature|agriculture|industry|population)\/$/,'/').replace(/\/$/,'/'+({natural:'nature',agriculture:'agriculture',industry:'industry',population:'population'}[state.field])+'/');a.href=u.href;}
  for(const a of all<HTMLAnchorElement>('[data-japan-area]')){const area=a.dataset.japanArea!;a.href=writeJapanState(new URL(a.href),{...state,area:area as any,camera:null}).href;if(area===state.area)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  const title=`${japanArea(state.area).name}・${{industry:'主要産業',agriculture:'農林業',natural:'自然環境',population:'人口'}[state.field]}｜Insight Journal`;
  document.title=title;
  document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.setAttribute('href',location.origin+location.pathname);
 }
 function navigate(next:JapanState){natureSample++;state=readJapanState(writeJapanState(new URL(location.href),next),context);point=null;$('[data-japan-farm-value]').textContent='地図上の陸地を選ぶと米・小麦の推計収穫面積と豚の推計密度を確認できます。2020年・原5分角（約7–9km）。';persist(true);render();}
 function topic(id:string){navigate({...state,topic:id,prefecture:null,city:null,site:null,feature:null,camera:camera()});}
 function city(id:string,field:AsiaField){const region=japanClimateRegions.find(r=>'climate-region-'+r.id===state.feature);const keepRegion=region?.representative===config.cities.find(c=>c.id===id)?.name;navigate({...state,field,topic:field==='natural'?state.field==='natural'?state.topic:'climate':state.topic,city:id===state.city?null:id||null,prefecture:null,site:null,feature:keepRegion?state.feature:null,camera:camera()});}
 function feature(id:string){navigate({...state,feature:state.feature===id?null:id,city:null,site:null,camera:camera()});}
 function site(id:string){if(state.field==='agriculture'){navigate({...state,site:state.site===id?null:id,city:null,prefecture:null,feature:null,camera:camera()});return;}const s=config.sites.find(s=>s.id===id);if(!s)return;navigate({...state,topic:state.topic==='clusters'||s.industries.includes(state.topic)?state.topic:s.industries[0],site:id,city:null,prefecture:null,camera:camera()});}
 function prefecture(id:string){navigate({...state,prefecture:id||null,site:null,city:null,camera:camera()});}
 function render(){
  $('.japan-atlas').dataset.field=state.field;root.dataset.field=state.field;root.dataset.area=state.area??'japan';root.dataset.sector=state.sector??'manufacturing';
  const waterTopics=['water','groundwater','precipitation','basins'];for(const b of all('[data-japan-nature-category]'))b.setAttribute('aria-pressed',String(b.dataset.japanNatureCategory===(waterTopics.includes(state.topic)?'water':state.topic)));
  $('[data-japan-water-controls]').hidden=state.field!=='natural'||!waterTopics.includes(state.topic);
  for(const b of all('[data-japan-sector]'))b.setAttribute('aria-pressed',String(b.dataset.japanSector===state.sector));
  $('[data-japan-industry-products]').hidden=state.field!=='industry';$('[data-japan-farm-products]').hidden=state.field!=='agriculture'||state.topic==='forest';
  $('[data-japan-quantity-entry]').hidden=state.sector!=='manufacturing';
  const observation=state.field==='natural'&&['climate','stations'].includes(state.topic);$('[data-japan-observation-controls]').hidden=!observation;
  const climateRegion=japanClimateRegions.find(r=>'climate-region-'+r.id===state.feature),station=config.cities.find(c=>c.id===state.city);
  $<HTMLSelectElement>('[data-japan-climate-region]').value=climateRegion?'climate-region-'+climateRegion.id:'';
  $('[data-japan-climate-context-summary]').textContent=climateRegion?`気候地域：${climateRegion.name}（地理的な説明）。観測所選択とは別です。${station?'観測所：'+station.name+'。':''}`:'気候地域の説明と観測所の地点平年値を別々に読みます。';
  const representative=$<HTMLButtonElement>('[data-japan-representative-station]');representative.hidden=!climateRegion;representative.textContent=climateRegion?climateRegion.representative+'の雨温図を読む（代表観測所）':'';representative.dataset.city=climateRegion?config.cities.find(c=>c.name===climateRegion.representative)?.id:'';
  $('[data-japan-inset]').hidden=state.area!=='japan';
  const fallbackBounds=japanArea(state.area).bounds,mercator=(lat:number)=>180/Math.PI*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));$('[data-japan-fallback] svg').setAttribute('viewBox',`${fallbackBounds[0]} ${-mercator(fallbackBounds[3])} ${fallbackBounds[2]-fallbackBounds[0]} ${mercator(fallbackBounds[3])-mercator(fallbackBounds[1])}`);
  $('[data-japan-map-caption]').textContent=state.area==='japan'?'全国：本土／沖縄・南西諸島は左上の挿入図（別の位置・縮尺）。':japanArea(state.area).name+'の主要な陸地。全国データを保持し、県所属の遠隔島の一部は表示範囲外です。';
  root.dataset.topic=state.topic;root.dataset.farmCrops=String(state.showCrops!==false);root.dataset.farmLivestock=String(state.showLivestock!==false);
  for(const input of all<HTMLInputElement>('[data-japan-farm-layer]'))input.checked=input.dataset.japanFarmLayer==='crops'?state.showCrops!==false:state.showLivestock!==false;
  $('[data-japan-farm-layers]').hidden=state.topic==='forest';root.dataset.prefecture=state.prefecture??'';root.dataset.city=state.city??'';root.dataset.site=state.site??'';root.dataset.feature=state.feature??'';
  $('[data-japan-farm-value]').hidden=state.topic==='forest';
  for(const e of all('[data-japan-controls]'))e.hidden=e.dataset.japanControls!==state.field;
  for(const e of all('[data-japan-statistics]'))e.hidden=e.dataset.japanStatistics!==state.field;
  const isQuantity=quantity();
  $('[data-japan-cluster-controls]').hidden=isQuantity;
  $('[data-japan-quantity-controls]').hidden=!isQuantity;
  $('[data-japan-cluster-statistics]').hidden=isQuantity;
  $('[data-japan-quantity-statistics]').hidden=!isQuantity;
  for(const b of all('[data-japan-mode]'))b.setAttribute('aria-pressed',String((b.dataset.japanMode==='jp-00')===isQuantity));
 for(const b of all('[data-japan-topic]'))b.setAttribute('aria-pressed',String(b.dataset.japanTopic===state.topic));
  $<HTMLSelectElement>('[data-japan-prefecture]').value=state.prefecture??'';
  $<HTMLSelectElement>('[data-japan-climate-city]').value=state.field==='natural'?state.city??'':'';
  $<HTMLSelectElement>('[data-japan-urban-city]').value=state.field==='population'?state.city??'':'';
  $<HTMLSelectElement>('[data-japan-industry-topic]').value=isQuantity?state.topic:'jp-00';
  for(const e of all('[data-japan-farm-panel]'))e.hidden=e.dataset.japanFarmPanel!==state.topic;
  for(const e of all('[data-japan-farm-series]'))e.hidden=state.topic==='forest'?!['forest-area','roundwood-production'].includes(e.dataset.japanFarmSeries!):e.dataset.japanFarmSeries!==state.topic+'-production';
  for(const e of all('[data-japan-climate-chart]'))e.hidden=state.field!=='natural'||e.dataset.japanClimateChart!==state.city;
  $('[data-japan-selected-climate]').hidden=state.field!=='natural'||!state.city;
  for(const e of all('[data-japan-agriculture-panel]'))e.hidden=e.dataset.japanAgriculturePanel!==state.topic;
  for(const b of all('[data-japan-feature]'))b.setAttribute('aria-pressed',String(b.dataset.japanFeature===state.feature));

  for(const b of all('[data-japan-farm-topic]'))b.setAttribute('aria-pressed',String(b.dataset.japanFarmTopic===state.topic));
  for(const e of all('[data-japan-site-row]')){const site=config.sites.find(s=>s.id===e.dataset.japanSiteRow)!;e.hidden=!japanSiteInSector(site.industries,state.sector)||(state.topic!=='clusters'&&!site.industries.includes(state.topic));}
  for(const b of all('[data-japan-cluster-controls] [data-japan-topic]'))b.hidden=b.dataset.japanTopic!=='clusters'&&!japanSiteInSector([b.dataset.japanTopic!],state.sector);
  const reading=japanReadings[state.field];
  $('[data-japan-reading-title]').textContent=reading.title;
  $('[data-japan-overview]').textContent=reading.overview;
  $('[data-japan-reason]').textContent=reading.reason;
  $('[data-japan-gap]').textContent=reading.gap;
  $('[data-japan-selection]').hidden=true;
  const legend=$('[data-japan-legend]');legend.replaceChildren();
  function key(label:string,color:string){const row=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=color;row.append(swatch,document.createTextNode(label));legend.append(row);}
  let title='日本全国',period='',method='';
  if(state.field==='industry'){
   if(isQuantity&&industry){
    const t=industry.topics.find(t=>t.id===state.topic)!;
    title=t.title.replace('日本：','')+'｜県別出荷額等';period='2024年・兆円';
    const values=industry.admin.map(a=>({id:a.id,...(a.series[t.id]?.find(v=>v.year===t.year)??{value:null})}));
    const scale=industryScale(t,values);
    const trillion=(v:number)=>(v/1e6).toLocaleString('ja-JP',{maximumFractionDigits:3});
    ['0〜'+trillion(scale.breaks[0])+'未満',...scale.breaks.map((v,i)=>trillion(v)+(i===3?'以上':'〜'+trillion(scale.breaks[i+1])+'未満'))].forEach((label,i)=>key(label+' 兆円',scale.colors[i]));
    key('秘匿・該当なし・未掲載','#d2ceca');
    method='県全体の数量を色で比較。実際の工場位置や産業集積の範囲は表しません。沿岸の未割当部分は基図色です。';
    const valid=values.filter(v=>v.value!==null),sum=valid.reduce((n,v)=>n+v.value!,0);
    $('[data-japan-total]').textContent=trillion(sum)+' 兆円';$('[data-japan-observed]').textContent=valid.length+' / 47県';
    $('[data-japan-quantity-title]').textContent=t.title.replace('日本：','')+'の県別出荷額等';
    const ranked=industry.admin.slice().sort((a,b)=>(b.series[t.id]?.[0]?.value??-1)-(a.series[t.id]?.[0]?.value??-1));
    const body=$('[data-japan-industry-table]');body.replaceChildren();
    for(const a of ranked){const observation=a.series[t.id]?.find(v=>v.year===t.year);const row=document.createElement('tr'),th=document.createElement('th'),button=document.createElement('button');th.scope='row';button.type='button';button.textContent=a.name;button.addEventListener('click',()=>prefecture(a.id));th.append(button);row.append(th);for(const text of [industryValueLabel(observation),observation?.status??'未掲載',a.employment2025==null?'未掲載':number(a.employment2025)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}row.setAttribute('aria-selected',String(state.prefecture===a.id));body.append(row);}
    const first=ranked.filter(a=>a.series[t.id]?.[0]?.value!=null).slice(0,3);
    $('[data-japan-overview]').textContent=`${t.title.replace('日本：','')}の公表出荷額等は、${first.map(a=>a.name).join('・')}が上位です。県全体の年間金額を比べています。`;
    $('[data-japan-reason]').textContent='同じ県でも業種によって順位が変わります。部品・素材を他の地域へ送る生産も出荷額に含まれます。この金額だけでは、港や人口との関係、県内の工場位置、産業が集まる理由を確定できません。';
    const selected=industry.admin.find(a=>a.id===state.prefecture);if(selected){const o=selected.series[t.id]?.find(v=>v.year===t.year);selection(selected.name,`${t.title.replace('日本：','')}：${industryValueLabel(o)}${o?.value==null?'':' 百万円'}（2024年）。原表の状態：${o?.status??'未掲載'}。製造業計の従業者は${selected.employment2025==null?'未掲載':number(selected.employment2025)+'人'}（2025年6月1日）。`,t.source);}
    if(ready&&map){const expression=['match',['get','id'],...values.flatMap(v=>[v.id,scale.color(v.value)]),'#d2ceca'];map.setPaintProperty('japan-prefecture-fill','fill-color',expression as any);inset?.setQuantityPaint(expression);}
   }else{
    title=state.topic==='clusters'?japanSector(state.sector).name+'の立地例':config.industries.find(i=>i.id===state.topic)?.label+'の代表例';period='出典別・概略位置';
    for(const i of config.industries.filter(i=>japanSiteInSector([i.id],state.sector)&&(state.topic==='clusters'||i.id===state.topic)))key(i.label,i.color);
    method='産業の種類と代表的な立地を示す概略図。記号の大きさは生産量を表しません。';
    if(state.topic==='clusters'){$('[data-japan-overview]').textContent=japanSector(state.sector).overview;$('[data-japan-reason]').textContent=japanSector(state.sector).reason;}
    const local=japanIndustryReadings[state.topic as keyof typeof japanIndustryReadings],definition=config.industries.find(i=>i.id===state.topic);if(local){$('[data-japan-overview]').textContent=local.overview;$('[data-japan-reason]').textContent=local.reason;}else if(definition){$('[data-japan-overview]').textContent=definition.lead;$('[data-japan-reason]').textContent=definition.reason;}
    const selected=config.sites.find(s=>s.id===state.site);if(selected)selection(selected.industries.map(id=>config.industries.find(i=>i.id===id)?.label).join('・')+'｜'+selected.name,(selected.note??'')+' 都市・地域の概略位置。県別数量や施設の敷地境界ではありません。',selected.source);
   }
  }else{
   const presentation=japanFoundationPresentation(state,nature)!;
   title=presentation.title;period=presentation.period;method=presentation.method;
   $('[data-japan-reading-title]').textContent=presentation.reading.title;
   $('[data-japan-overview]').textContent=presentation.reading.overview;
   $('[data-japan-reason]').textContent=presentation.reading.reason;
   $('[data-japan-gap]').textContent=presentation.reading.gap;
   for(const item of presentation.legend)key(item.label,item.color);
   if(state.field==='population'&&population){key('0（推計値）','#'+population.zeroColor);key('陸域の欠測・未収録','#'+population.missingColor);}if(state.field==='population'&&population)population.colors.forEach((color,i)=>key(i===0?'0超〜1未満':i===population!.breaks.length?'10,000以上':number(population!.breaks[i-1])+'〜'+number(population!.breaks[i])+'未満','#'+color));
   if(presentation.selection){const selected=presentation.selection;selection(selected.title,selected.body,selected.source);}
  }
  $('[data-japan-map-title]').textContent=title;$('[data-japan-map-title]').title=title;$('[data-japan-map-period]').textContent=period;$('[data-japan-method]').textContent=method;
  if(ready&&map){map.setLayoutProperty('japan-prefecture-fill','visibility',isQuantity?'visible':'none');map.setLayoutProperty('japan-population','visibility',state.field==='population'?'visible':'none');map.setFilter('japan-prefecture-selected',['==',['get','id'],state.prefecture??'']);if(map.getLayer('japan-urban'))map.setLayoutProperty('japan-urban','visibility',state.field==='population'&&state.topic==='urban'?'visible':'none');nature?.show(state.field==='natural'?state.topic:'',state.feature);farming?.show(state.field,state.topic,state);root.dataset.farmVisibleLayers=JSON.stringify(farming?.visibleLayers()??[]);root.dataset.natureTopic=state.field==='natural'?state.topic:'';renderMarkers();const revision=++renderRevision;root.dataset.renderedTopic='';const rendered=state.field+':'+state.topic;map.once('idle',()=>{if(revision===renderRevision)root.dataset.renderedTopic=rendered;});map.triggerRepaint();}
  syncLinks();
 }
 function selection(title:string,body:string,source:string){
 const place=state.field==='industry'?config.sites.find(s=>s.id===state.site)?.point:state.field==='agriculture'?[...japanAgricultureSites,...japanForestrySites].find(s=>s.id===state.site)?.coordinates:[...config.cities,...config.populationPlaces].find(c=>c.id===state.city)?.coordinates;
 if(state.area!=='japan'&&place){const b=japanArea(state.area).bounds;if(place[0]<b[0]||place[0]>b[2]||place[1]<b[1]||place[1]>b[3])body+=' この地点は現在の地方表示の範囲外です。全国資料の選択を保持しています。';}
 $('[data-japan-selection]').hidden=false;$('[data-japan-selection-title]').textContent=title;$('[data-japan-selection-body]').textContent=body;$<HTMLAnchorElement>('[data-japan-selection-source]').href=source;}
 type Label={id:string;title:string;fullTitle?:string;subtitle:string;point:[number,number];color:string;offset:[number,number];select:()=>void;selected:boolean;muted?:boolean;reference?:boolean;priority?:number};
 let labels:{data:Label;button:HTMLElement;line:SVGLineElement}[]=[];
 let placementKey='',placement:ReturnType<typeof layoutJapanLabels>|null=null;
 function renderMarkers(){
  if(!map||!lib)return;markers.splice(0).forEach(m=>m.remove());const overlay=$('[data-japan-labels]');overlay.replaceChildren();labels=[];
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
  const items:Label[]=[];
  if(state.field==='industry'&&!quantity()){
   const offsets:Record<string,[number,number]>={toyota:[34,-39],yokkaichi:[-125,-62],osaka:[-132,-26],imabari:[-108,20],kitakyushu:[-145,-40],kumamoto:[28,30],nagasaki:[-98,42]};
   const representatives=new Set(config.industries.map(i=>config.sites.find(s=>s.industries.includes(i.id))?.id));
   for(const s of config.sites.filter(s=>japanSiteInSector(s.industries,state.sector))){const i=config.industries.find(i=>i.id===(s.industries.includes(state.topic)?state.topic:s.industries[0]))!;items.push({id:s.id,title:s.label??s.industries.map(id=>config.industries.find(i=>i.id===id)?.label).join('・'),subtitle:s.name,point:s.point,color:i.color,offset:offsets[s.id]??[10,10],select:()=>site(s.id),selected:state.site===s.id,muted:state.topic!=='clusters'&&!s.industries.includes(state.topic),priority:representatives.has(s.id)?20:0});}
  }else if(state.field!=='industry'){
   for(const label of japanFoundationPresentation(state,nature)!.labels)items.push({...label,reference:label.kind==='reference',offset:[12,-25],select:()=>label.kind==='site'?site(label.id):label.kind==='feature'?feature(label.id):city(label.id,state.field)});
  }
  inset?.render(state,items);
  for(const data of items){const dot=document.createElement(data.reference?'span':'button');if(dot instanceof HTMLButtonElement)dot.type='button';dot.className='japan-point';dot.classList.toggle('is-muted',!!data.muted);dot.classList.toggle('is-selected',data.selected);dot.style.setProperty('--point-color',data.color);if(data.reference)dot.setAttribute('aria-hidden','true');else dot.setAttribute('aria-pressed',String(data.selected));dot.setAttribute('aria-label',(data.fullTitle??data.title)+'（'+data.subtitle+'）');if(!data.reference)dot.addEventListener('click',data.select);markers.push(new lib.Marker({element:dot}).setLngLat(data.point).addTo(map));const button=document.createElement(data.reference?'span':'button');if(button instanceof HTMLButtonElement)button.type='button';else button.className='japan-reference-label';button.dataset.japanMapLabel=data.id;button.classList.toggle('is-muted',!!data.muted);button.style.setProperty('--point-color',data.color);button.append(document.createTextNode(data.title));const small=document.createElement('small');small.textContent=data.subtitle;if(!data.reference)button.append(small);button.title=(data.fullTitle??data.title)+'（'+data.subtitle+'）';button.setAttribute('aria-label',button.title);if(!data.reference){button.setAttribute('aria-pressed',String(data.selected));button.addEventListener('click',data.select);}overlay.append(button);if(state.field==='agriculture'&&state.topic!=='forest'){
 const site=japanAgricultureSites.find(s=>s.id===data.id),titles=site?.products.map(id=>japanAgricultureProducts.find(p=>p.id===id)!.title)??[];
 const defaultTitle=titles.slice(0,2).join('・')+(titles.length>2?' ほか'+(titles.length-2)+'品目':'');
 const canvas=document.createElement('canvas'),measure=canvas.getContext('2d')!;measure.font=getComputedStyle(button).font;
 const titleWidth=Math.max(...[data.title,defaultTitle,...titles].map(title=>measure.measureText(title).width))+18;measure.font=getComputedStyle(small).font;
 button.style.width=Math.ceil(Math.max(titleWidth,measure.measureText(data.subtitle).width+20))+'px';
 }const line=document.createElementNS('http://www.w3.org/2000/svg','line');svg.append(line);labels.push({data,button,line});}
  for(const lat of [25,30,35,40,45]){const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.dataset.latitude=String(lat);text.textContent=lat+'°N';text.setAttribute('text-anchor','end');svg.append(text);}
  positionLabels();
 }
 function positionLabels(){
  if(!map)return;const frame=$('.japan-map-frame');
  for(const text of all<SVGTextElement & HTMLElement>('[data-latitude]')){const y=map.project([146.3,Number(text.dataset.latitude)]).y;text.setAttribute('x',String(frame.clientWidth-8));text.setAttribute('y',String(y-4));text.style.display=y>12&&y<frame.clientHeight-35?'':'none';}
  const anchors=labels.map(({data,button})=>{button.hidden=false;const p=map!.project(data.point);return {id:data.id,x:p.x,y:p.y,width:button.offsetWidth,height:button.offsetHeight,offset:data.offset,priority:data.priority??(!data.reference?10:0)};});
  const key=JSON.stringify([state.field,state.field==='industry'?state.sector:state.field==='agriculture'?(state.topic==='forest'?'forest':'farm'):['climate','stations'].includes(state.topic)?'climate':state.topic,state.showCrops,state.showLivestock,frame.clientWidth,frame.clientHeight,anchors.map(({id,x,y})=>({id,x,y}))]);
  if(key!==placementKey||!placement){placement=layoutJapanLabels(anchors,frame.clientWidth,frame.clientHeight);placementKey=key;}
  const placed=placement;
  for(const {data,button,line} of labels){const rect=placed.get(data.id),p=map.project(data.point);button.hidden=!rect;line.style.display=rect?'':'none';if(!rect)continue;
   button.style.left=rect.x+'px';button.style.top=rect.y+'px';button.dataset.leaderLength=String(rect.leaderLength);
   line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(rect.endX));line.setAttribute('y2',String(rect.endY));
  }
 }
 function fit(){if(!map||!ready)return;suppressCamera=true;if(state.camera)map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});else {const bounds=japanArea(state.area).bounds;map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:{top:8,bottom:12,left:8,right:8},duration:0});}suppressCamera=false;positionLabels();recordCamera();}
 function recordCamera(){if(map){const c=map.getCenter();root.dataset.mapCamera=JSON.stringify({lng:c.lng,lat:c.lat,zoom:map.getZoom()});root.dataset.mapExtent=JSON.stringify(map.getBounds().toArray());}}
 async function fetchJson<T>(name:string):Promise<T>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(config.assetBase+name,{signal:controller.signal});if(!r.ok)throw new Error('Asset '+r.status);return await r.json();}finally{clearTimeout(timeout);}}
 async function loadGrid(){
  if(grid)return grid;if(!population)throw new Error('Population not loaded');
  if(!gridPromise)gridPromise=(async()=>{const r=await fetch(config.assetBase+population!.grid);if(!r.ok)throw new Error('Grid '+r.status);return decodeAsiaNumericGrid(new Uint8Array(await r.arrayBuffer()),population!,'float32',-200);})().catch(error=>{gridPromise=null;throw error;});
  grid=await gridPromise;return grid;
 }
 async function initialise(){
  const revision=++generation;ready=false;nature=null;farming=null;root.dataset.natureReady='false';root.dataset.mapReady='false';status('全国図を読み込んでいます');inset?.remove();inset=null;map?.remove();map=null;markers.splice(0).forEach(m=>m.remove());$('[data-japan-labels]').replaceChildren();$('[data-japan-fallback]').hidden=false;
  try{
   const loaded=await Promise.all([import('maplibre-gl'),fetchJson<any>('geography.json'),fetchJson<Industry>('industry.json'),fetchJson<Population>('population.json')]);
   if(revision!==generation)return;[lib,,industry,population]=loaded;const geography=loaded[1];lib.setWorkerUrl(workerUrl);
   map=new lib.Map({container:$('[data-map-surface]'),attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,maxPitch:0,minZoom:2,maxZoom:10,trackResize:false,maxBounds:[[110,15],[160,55]],cooperativeGestures:true,pixelRatio:Math.min(devicePixelRatio,2),locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は2本指で動かせます'},style:japanBaseStyle(geography,industry.geometry,population,config.assetBase) as any});
   map.on('load',async()=>{if(revision!==generation)return;ready=true;root.dataset.mapReady='true';$('[data-japan-fallback]').hidden=true;status('');fit();render();const currentMap=map!;farming=mountJapanAgricultureLayers(currentMap,config.assetBase.replace('japan-v1/','japan-agriculture-v3/'));render();try{const mounted=await mountJapanNatureLayers(currentMap,config.natureAssetBase);if(revision!==generation)return;nature=mounted;root.dataset.natureReady='true';render();}catch{if(revision===generation){root.dataset.natureReady='false';if(state.field==='natural')status('自然環境の主題を取得できませんでした。全国基図と統計は利用できます。',true);}}try{const response=await fetch(config.assetBase.replace('japan-v1/','japan-population-v2/')+'urban.geojson');if(!response.ok)throw Error();const geometry=await response.json();if(revision!==generation)return;currentMap.addSource('japan-urban',{type:'geojson',data:geometry});currentMap.addLayer({id:'japan-urban',type:'line',source:'japan-urban',paint:{'line-color':'#a74830','line-width':1.5}},'japan-coast');render();}catch{}});
   map.on('error',()=>status('地図の一部を取得できませんでした。地図下の統計と出典を確認できます。',true));
   map.on('move',()=>{positionLabels();recordCamera();});
   map.on('moveend',event=>{if(!ready||suppressCamera||event.japanResize)return;clearTimeout(timer);timer=setTimeout(()=>{state={...state,camera:camera()};persist(false);},120);});
   async function handleMapClick(event:import('maplibre-gl').MapMouseEvent,targetMap:import('maplibre-gl').Map,targetNature:JapanNatureLayers|null,targetFarm:ReturnType<typeof mountJapanAgricultureLayers>|null){
    if(state.field==='natural'&&targetNature){const id=targetNature.hit(event,state.topic);if(id)feature(id);const sampleRevision=++natureSample;const requested=state.topic,selected:[number,number]=[event.lngLat.lng,event.lngLat.lat];try{const text=await targetNature.sample(requested,...selected);if(sampleRevision===natureSample&&state.field==='natural'&&state.topic===requested&&text){$('[data-japan-nature-value]').textContent=text;$('[data-japan-selection]').hidden=false;$('[data-japan-selection-body]').textContent=text;}}catch{$('[data-japan-nature-value]').textContent='数値を取得できませんでした。再度選択してお試しください。';}}
    else if(state.field==='agriculture'&&targetFarm&&targetMap.queryRenderedFeatures(event.point,{layers:['japan-land']}).length){const revision=++natureSample,requested=state.topic;try{const text=await targetFarm.sample(requested,event.lngLat.lng,event.lngLat.lat,state);if(revision===natureSample&&state.field==='agriculture'&&state.topic===requested)$('[data-japan-farm-value]').textContent=text;}catch{$('[data-japan-farm-value]').textContent='選択地点の数値を取得できませんでした。再度選択してお試しください。';}}
    else if(quantity()){const hit=targetMap.queryRenderedFeatures(event.point,{layers:['japan-prefecture-fill']})[0];if(hit?.properties.id)prefecture(hit.properties.id);}
    else if(state.field==='population'&&targetMap.queryRenderedFeatures(event.point,{layers:['japan-land']}).length){
     point=[event.lngLat.lng,event.lngLat.lat];const selected=point;const revision=generation;try{const g=await loadGrid();if(generation!==revision||state.field!=='population'||point!==selected)return;const v=readAsiaNumericCell(g,selected[0],selected[1]);$('[data-japan-grid-value]').textContent=`選択地点 ${selected[1].toFixed(3)}°N / ${selected[0].toFixed(3)}°E：`+(v==null?'欠測・未収録（0ではありません）':number(v)+' 人/km²（2020年・5km集約推計）');}catch{$('[data-japan-grid-value]').textContent='選択地点の数値を取得できませんでした。再度選択してお試しください。';}
    }
   }
   map.on('click',event=>void handleMapClick(event,map!,nature,farming));
   void mountJapanInset(root,lib,geography,industry.geometry,population,config.assetBase,config.natureAssetBase,(event,targetMap,targetNature,targetFarm)=>void handleMapClick(event,targetMap,targetNature,targetFarm)).then(mounted=>{if(revision!==generation){mounted.remove();return;}inset=mounted;render();if(root.dataset.insetError==='true')status('挿入図の一部を取得できませんでした。再試行できます。',true);}).catch(()=>{if(revision!==generation)return;root.dataset.insetError='true';$('[data-japan-inset-status]').hidden=false;$('[data-japan-inset-status]').textContent='挿入図の主題を取得できませんでした';status('挿入図を取得できませんでした。再試行できます。',true);});
  }catch{if(revision===generation)status('全国図を表示できませんでした。基図のみを表示しています。地図下の統計と出典は利用できます。',true);}
  render();
 }
 for(const a of all<HTMLAnchorElement>('[data-japan-area]'))a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();clearTimeout(timer);navigate({...state,area:a.dataset.japanArea as any,camera:null});fit();});
 for(const b of all('[data-japan-sector]'))b.addEventListener('click',()=>navigate({...state,sector:b.dataset.japanSector as any,topic:'clusters',site:null,prefecture:null,camera:camera()}));
 for(const b of all('[data-japan-nature-category]'))b.addEventListener('click',()=>topic(b.dataset.japanNatureCategory!));
 $<HTMLSelectElement>('[data-japan-climate-region]').addEventListener('change',event=>feature((event.target as HTMLSelectElement).value));
 $('[data-japan-representative-station]').addEventListener('click',()=>city($('[data-japan-representative-station]').dataset.city??'','natural'));
 for(const a of all<HTMLAnchorElement>('[data-japan-field]'))a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();const field=a.dataset.japanField as AsiaField;if(field===state.field)return;navigate({...state,field,topic:japanDefaults[field],prefecture:null,city:null,site:null,feature:null,camera:camera()});});
 for(const b of all('[data-japan-topic]'))b.addEventListener('click',()=>topic(b.dataset.japanTopic!));
 for(const b of all('[data-japan-farm-site]'))b.addEventListener('click',()=>site(b.dataset.japanFarmSite!));
 for(const b of all('[data-japan-farm-topic]'))b.addEventListener('click',()=>topic(b.dataset.japanFarmTopic!));
 for(const input of all<HTMLInputElement>('[data-japan-farm-layer]'))input.addEventListener('change',()=>navigate({...state,[input.dataset.japanFarmLayer==='crops'?'showCrops':'showLivestock']:input.checked,camera:camera()}));
 $('[data-japan-clear-selection]').addEventListener('click',()=>navigate({...state,prefecture:null,city:null,site:null,feature:null,camera:camera()}));
 for(const b of all('[data-japan-feature]'))b.addEventListener('click',()=>feature(b.dataset.japanFeature!));
 for(const b of all('[data-japan-mode]'))b.addEventListener('click',()=>topic(b.dataset.japanMode!));
 for(const b of all('[data-japan-site]'))b.addEventListener('click',()=>site(b.dataset.japanSite!));
 for(const b of all('[data-japan-urban]'))b.addEventListener('click',()=>city(b.dataset.japanUrban!,'population'));
 for(const b of all('[data-compare]'))b.addEventListener('click',()=>navigate({...state,field:'agriculture',topic:'wheat',city:null,prefecture:null,site:null,camera:camera()}));
 $<HTMLSelectElement>('[data-japan-industry-topic]').addEventListener('change',event=>topic((event.target as HTMLSelectElement).value));
 $<HTMLSelectElement>('[data-japan-prefecture]').addEventListener('change',event=>prefecture((event.target as HTMLSelectElement).value));
 $<HTMLSelectElement>('[data-japan-climate-city]').addEventListener('change',event=>city((event.target as HTMLSelectElement).value,'natural'));
 $<HTMLSelectElement>('[data-japan-urban-city]').addEventListener('change',event=>city((event.target as HTMLSelectElement).value,'population'));
 for(const b of all('[data-japan-zoom]'))b.addEventListener('click',()=>map?.zoomTo(map.getZoom()+Number(b.dataset.japanZoom),{duration:0}));
 $('[data-japan-fit]').addEventListener('click',()=>{state={...state,camera:null};persist(true);fit();});
 $('[data-japan-retry]').addEventListener('click',()=>{state={...state,camera:camera()};void initialise();});
 window.addEventListener('popstate',()=>{clearTimeout(timer);natureSample++;state=readJapanState(new URL(location.href),context);point=null;render();fit();});
 function sizePanels(){
  const frame=$('.japan-map-frame'),reading=$('.japan-reading');
  // Document positions avoid changing the map's size while the user scrolls.
  const frameTop=frame.getBoundingClientRect().top+window.scrollY,readingTop=$('.japan-primary-grid').getBoundingClientRect().top+window.scrollY;
  root.style.setProperty('--japan-map-height',Math.max(280,innerHeight-frameTop-14)+'px');
  root.style.setProperty('--japan-reading-height',Math.max(320,innerHeight-readingTop-14)+'px');
 }
 window.addEventListener('resize',sizePanels);
 const panelObserver=new ResizeObserver(sizePanels);for(const element of all('.japan-heading,.japan-region,.japan-tabs,.japan-controls,.japan-map-heading'))panelObserver.observe(element);
 sizePanels();
 let size='';const observer=new ResizeObserver(()=>{const frame=$('.japan-map-frame'),next=frame.clientWidth+':'+frame.clientHeight;if(next===size)return;size=next;if(map){suppressCamera=true;map.resize({japanResize:true});suppressCamera=false;if(ready&&!state.camera)fit();positionLabels();inset?.resize();}});observer.observe($('.japan-map-frame'));
 window.addEventListener('pagehide',()=>{clearTimeout(timer);if(ready&&state.camera){state={...state,camera:camera()};persist(false);}});
 render();await initialise();
}
