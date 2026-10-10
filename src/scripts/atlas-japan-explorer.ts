import {layoutJapanLabels} from '../lib/atlas-japan-label-layout';
import {readJapanState,writeJapanState,japanReturnURL,japanDefaults,type JapanState} from '../lib/atlas-japan-state';
import {japanReadings,japanIndustryReadings} from '../data/atlas/japan-reading';
import {industryScale,industryValueLabel,type IndustryAdmin,type IndustryTopic} from '../data/atlas/asia-industry';
import {decodeAsiaNumericGrid,readAsiaNumericCell,type AsiaNumericGrid} from '../lib/atlas-asia-numeric-grid';
import type {AsiaField} from '../lib/atlas-asia-state';
import type {AsiaClimateCity} from '../data/atlas/asia-climate-cities';
import type {EastCluster} from '../data/atlas/east-asia-industry-clusters';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

type PopulationCity={id:string;name:string;coordinates:[number,number];population:number;areaKm2:number;density:number;history:Record<string,number>};
type Config={bounds:number[];assetBase:string;cities:AsiaClimateCity[];sites:EastCluster[];industries:{id:string;label:string;color:string}[];populationCities:PopulationCity[]};
type Industry={admin:IndustryAdmin[];topics:IndustryTopic[];geometry:any};
type Population={width:number;height:number;bounds3857:number[];imageCoordinates:[number,number][];image:string;grid:string;breaks:number[];colors:string[]};
const root=document.querySelector<HTMLElement>('[data-japan-atlas]');
if(root)void start(root);

async function start(root:HTMLElement){
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const all=<T extends HTMLElement=HTMLElement>(s:string)=>[...root.querySelectorAll<T>(s)];
 const config:Config=JSON.parse($('[data-japan-config]').textContent!);
 const context={prefectures:Array.from({length:47},(_,i)=>'JP-'+String(i+1).padStart(2,'0')),cities:[...config.cities,...config.populationCities].map(c=>c.id),climateCities:config.cities.map(c=>c.id),urbanCities:config.populationCities.map(c=>c.id),sites:config.sites.map(s=>s.id),siteIndustries:Object.fromEntries(config.sites.map(s=>[s.id,s.industries]))};
 let state=readJapanState(new URL(location.href),context);
 let map:import('maplibre-gl').Map|null=null,lib:typeof import('maplibre-gl')|null=null;
 let industry:Industry|null=null,population:Population|null=null,grid:AsiaNumericGrid|null=null,gridPromise:Promise<AsiaNumericGrid>|null=null;
 let ready=false,suppressCamera=false,generation=0,timer:ReturnType<typeof setTimeout>|undefined;
 const markers:import('maplibre-gl').Marker[]=[];
 let point:[number,number]|null=null;
 const number=(v:number)=>v.toLocaleString('ja-JP',{maximumFractionDigits:1});
 const camera=()=>{if(!map||!ready)return state.camera;const center=map.getCenter();return{lng:center.lng,lat:center.lat,zoom:map.getZoom()};};
 const quantity=()=>state.field==='industry'&&state.topic.startsWith('jp-');
 const status=(message:string,error=false)=>{$('[data-japan-map-status]').textContent=message;$('[data-japan-map-status]').hidden=!message;$('[data-japan-retry]').hidden=!error;root.dataset.mapError=String(error);};
 function persist(push:boolean){const url=writeJapanState(new URL(location.href),state);if(url.href!==location.href)history[push?'pushState':'replaceState']({},'',url);syncLinks();}
 function syncLinks(){
  $<HTMLAnchorElement>('[data-japan-return]').href=japanReturnURL(new URL(location.href),state).href;
  for(const a of all<HTMLAnchorElement>('[data-japan-field]')){
   const field=a.dataset.japanField as AsiaField;
   a.href=writeJapanState(new URL(a.href),{...state,field,topic:field===state.field?state.topic:japanDefaults[field],prefecture:field===state.field?state.prefecture:null,city:field===state.field?state.city:null,site:field===state.field?state.site:null}).href;
   if(field===state.field)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  }
  const title=`日本全国・${{industry:'主要産業',agriculture:'農林業',natural:'自然環境',population:'人口'}[state.field]}｜Insight Journal`;
  document.title=title;
  document.querySelector<HTMLLinkElement>('link[rel=canonical]')?.setAttribute('href',location.origin+location.pathname);
 }
 function navigate(next:JapanState){state=readJapanState(writeJapanState(new URL(location.href),next),context);point=null;persist(true);render();}
 function topic(id:string){navigate({...state,topic:id,prefecture:null,city:null,site:null,camera:camera()});}
 function city(id:string,field:AsiaField){navigate({...state,field,topic:field==='natural'?'stations':'urban',city:id||null,prefecture:null,site:null,camera:camera()});}
 function site(id:string){const s=config.sites.find(s=>s.id===id);if(!s)return;navigate({...state,site:id,city:null,prefecture:null,camera:camera()});}
 function prefecture(id:string){navigate({...state,prefecture:id||null,site:null,city:null,camera:camera()});}
 function render(){
  $('.japan-atlas').dataset.field=state.field;
  root.dataset.topic=state.topic;root.dataset.prefecture=state.prefecture??'';root.dataset.city=state.city??'';
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
  for(const e of all('[data-japan-climate-chart]'))e.classList.toggle('is-selected',e.dataset.japanClimateChart===state.city);
  for(const e of all('[data-japan-site-row]'))e.hidden=state.topic!=='clusters'&&!config.sites.find(s=>s.id===e.dataset.japanSiteRow)?.industries.includes(state.topic as any);
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
    title=t.title.replace('日本：','')+'｜県別出荷額等';period='2024年・百万円';
    const values=industry.admin.map(a=>({id:a.id,...(a.series[t.id]?.find(v=>v.year===t.year)??{value:null})}));
    const scale=industryScale(t,values);
    ['0以上〜'+number(scale.breaks[0])+'未満',...scale.breaks.map((v,i)=>number(v)+(i===3?'以上':'〜'+number(scale.breaks[i+1])+'未満'))].forEach((label,i)=>key(label,scale.colors[i]));
    key('秘匿・該当なし・未掲載','#d2ceca');
    method='県全体の数量を色で比較。実際の工場位置や産業集積の範囲は表しません。沿岸の未割当部分は基図色です。';
    const valid=values.filter(v=>v.value!==null),sum=valid.reduce((n,v)=>n+v.value!,0);
    $('[data-japan-total]').textContent=number(sum)+' 百万円';$('[data-japan-observed]').textContent=valid.length+' / 47県';
    $('[data-japan-quantity-title]').textContent=t.title.replace('日本：','')+'の県別出荷額等';
    const ranked=industry.admin.slice().sort((a,b)=>(b.series[t.id]?.[0]?.value??-1)-(a.series[t.id]?.[0]?.value??-1));
    const body=$('[data-japan-industry-table]');body.replaceChildren();
    for(const a of ranked){const observation=a.series[t.id]?.find(v=>v.year===t.year);const row=document.createElement('tr'),th=document.createElement('th'),button=document.createElement('button');th.scope='row';button.type='button';button.textContent=a.name;button.addEventListener('click',()=>prefecture(a.id));th.append(button);row.append(th);for(const text of [industryValueLabel(observation),observation?.status??'未掲載',a.employment2025==null?'未掲載':number(a.employment2025)]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}row.setAttribute('aria-selected',String(state.prefecture===a.id));body.append(row);}
    const first=ranked.filter(a=>a.series[t.id]?.[0]?.value!=null).slice(0,3);
    $('[data-japan-overview]').textContent=`${t.title.replace('日本：','')}の公表出荷額等は、${first.map(a=>a.name).join('・')}が上位です。県全体の年間金額を比べています。`;
    $('[data-japan-reason]').textContent='同じ県でも業種によって順位が変わります。部品・素材を他の地域へ送る生産も出荷額に含まれます。この金額だけでは、港や人口との関係、県内の工場位置、産業が集まる理由を確定できません。';
    const selected=industry.admin.find(a=>a.id===state.prefecture);if(selected){const o=selected.series[t.id]?.find(v=>v.year===t.year);selection(selected.name,`${t.title.replace('日本：','')}：${industryValueLabel(o)}${o?.value==null?'':' 百万円'}（2024年）。原表の状態：${o?.status??'未掲載'}。製造業計の従業者は${selected.employment2025==null?'未掲載':number(selected.employment2025)+'人'}（2025年6月1日）。`,t.source);}
    if(ready&&map){map.setPaintProperty('japan-prefecture-fill','fill-color',['match',['get','id'],...values.flatMap(v=>[v.id,scale.color(v.value)]),'#d2ceca']);}
   }else{
    title=state.topic==='clusters'?'主要産業の代表的な集積':config.industries.find(i=>i.id===state.topic)?.label+'の代表例';period='出典別・概略位置';
    for(const i of config.industries.filter(i=>state.topic==='clusters'||i.id===state.topic))key(i.label,i.color);
    method='産業の種類と代表的な立地を示す概略図。記号の大きさは生産量を表しません。';
    const local=japanIndustryReadings[state.topic as keyof typeof japanIndustryReadings];if(local){$('[data-japan-overview]').textContent=local.overview;$('[data-japan-reason]').textContent=local.reason;}
    const selected=config.sites.find(s=>s.id===state.site);if(selected)selection(selected.industries.map(id=>config.industries.find(i=>i.id===id)?.label).join('・')+'｜'+selected.name,'代表的な都市・工業地域の概略位置です。県別の数量や工場の敷地を示すものではありません。',selected.source);
   }
  }else if(state.field==='natural'){
   title='観測所の位置と雨温図';period='1991–2020年';method='観測点の平年値を地図下で比較。気候区分や全国の降水量分布を表す色は未収録です。';key('観測所','#446e65');
   const selected=config.cities.find(c=>c.id===state.city);if(selected)selection(selected.name,`${selected.stationName}。観測地点 ${selected.coordinates[1].toFixed(2)}°N / ${selected.coordinates[0].toFixed(2)}°E。地図下の雨温図と月別原表で比較できます。`,selected.sourceUrl);
  }else if(state.field==='agriculture'){
   title=({wheat:'小麦と需給',rice:'米の生産',forest:'森林と木材'} as Record<string,string>)[state.topic]+'｜全国統計';period='県別分布は整備中';method='地図は位置を示す基図です。選択した全国統計は地図下に表示し、県別分布として着色しません。';key('全国統計・県別分布未収録','#e2e8d8');
  }else if(population){
   title=state.topic==='urban'?'都市域の人口比較':'人口密度の全国分布';period='2020年・5km集約';
   population.colors.forEach((c,i)=>key(i===0?'1未満':i===population!.breaks.length?'10,000以上':number(population!.breaks[i-1])+'〜'+number(population!.breaks[i])+'未満','#'+c));
   method='人/km²。GHSLの5km集約推計を元の画素で切り出し、日本の詳細基図でマスク。透明な陸地は0値または欠測で、海や無人地と同一視しません。';
   const selected=config.populationCities.find(c=>c.id===state.city);if(selected)selection(selected.name+'都市域',`人口 ${number(Math.round(selected.population))}人、面積 ${number(selected.areaKm2)}km²、密度 ${number(Math.round(selected.density))}人/km²。2020年人口・2025年都市域。都市選択で全国図の縮尺を変えません。`,'https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php');
  }
  $('[data-japan-map-title]').textContent=title;$('[data-japan-map-period]').textContent=period;$('[data-japan-method]').textContent=method;
  if(ready&&map){map.setLayoutProperty('japan-prefecture-fill','visibility',isQuantity?'visible':'none');map.setLayoutProperty('japan-population','visibility',state.field==='population'?'visible':'none');map.setFilter('japan-prefecture-selected',['==',['get','id'],state.prefecture??'']);renderMarkers();}
  syncLinks();
 }
 function selection(title:string,body:string,source:string){$('[data-japan-selection]').hidden=false;$('[data-japan-selection-title]').textContent=title;$('[data-japan-selection-body]').textContent=body;$<HTMLAnchorElement>('[data-japan-selection-source]').href=source;}
 type Label={id:string;title:string;subtitle:string;point:[number,number];color:string;offset:[number,number];select:()=>void;selected:boolean};
 let labels:{data:Label;button:HTMLButtonElement;line:SVGLineElement}[]=[];
 function renderMarkers(){
  if(!map||!lib)return;markers.splice(0).forEach(m=>m.remove());const overlay=$('[data-japan-labels]');overlay.replaceChildren();labels=[];
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
  const items:Label[]=[];
  if(state.field==='industry'&&!quantity()){
   const offsets:Record<string,[number,number]>={toyota:[34,-39],yokkaichi:[-125,-62],osaka:[-132,-26],imabari:[-108,20],kitakyushu:[-145,-40],kumamoto:[28,30],nagasaki:[-98,42]};
   for(const s of config.sites.filter(s=>state.topic==='clusters'||s.industries.includes(state.topic as any))){const i=config.industries.find(i=>i.id===s.industries[0])!;items.push({id:s.id,title:s.industries.map(id=>config.industries.find(i=>i.id===id)?.label).join('・'),subtitle:s.name,point:s.point,color:i.color,offset:offsets[s.id]??[10,10],select:()=>site(s.id),selected:state.site===s.id});}
  }else if(state.field==='natural'){
   for(const c of config.cities)items.push({id:c.id,title:c.name,subtitle:c.coordinates[1].toFixed(1)+'°N',point:c.coordinates,color:'#446e65',offset:[12,-25],select:()=>city(c.id,'natural'),selected:state.city===c.id});
  }else if(state.field==='population'&&state.topic==='urban'){
   const offsets:Record<string,[number,number]>={'東京':[24,-45],'大阪':[-100,16],'名古屋':[-75,-50]};
   for(const c of config.populationCities)items.push({id:c.id,title:c.name,subtitle:Math.round(c.population/10000).toLocaleString('ja-JP')+'万人',point:c.coordinates,color:'#28627f',offset:offsets[c.name]??[10,10],select:()=>city(c.id,'population'),selected:state.city===c.id});
  }
  for(const data of items){const dot=document.createElement('button');dot.type='button';dot.className='japan-point';dot.style.setProperty('--point-color',data.color);dot.setAttribute('aria-label',data.title+'（'+data.subtitle+'）');dot.addEventListener('click',data.select);markers.push(new lib.Marker({element:dot}).setLngLat(data.point).addTo(map));const button=document.createElement('button');button.type='button';button.dataset.japanMapLabel=data.id;button.style.setProperty('--point-color',data.color);button.append(document.createTextNode(data.title));const small=document.createElement('small');small.textContent=data.subtitle;button.append(small);button.setAttribute('aria-pressed',String(data.selected));button.addEventListener('click',data.select);overlay.append(button);const line=document.createElementNS('http://www.w3.org/2000/svg','line');svg.append(line);labels.push({data,button,line});}
  for(const lat of [25,30,35,40,45]){const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.dataset.latitude=String(lat);text.textContent=lat+'°N';text.setAttribute('text-anchor','end');svg.append(text);}
  positionLabels();
 }
 function positionLabels(){
  if(!map)return;const frame=$('.japan-map-frame');
  for(const text of all<SVGTextElement & HTMLElement>('[data-latitude]')){const y=map.project([146.3,Number(text.dataset.latitude)]).y;text.setAttribute('x',String(frame.clientWidth-8));text.setAttribute('y',String(y-4));text.style.display=y>12&&y<frame.clientHeight-35?'':'none';}
  const anchors=labels.map(({data,button})=>{button.hidden=false;const p=map!.project(data.point);return {id:data.id,x:p.x,y:p.y,width:button.offsetWidth,height:button.offsetHeight,offset:data.offset};});
  const placed=layoutJapanLabels(anchors,frame.clientWidth,frame.clientHeight);
  for(const {data,button,line} of labels){const rect=placed.get(data.id),p=map.project(data.point);button.hidden=!rect;line.style.display=rect?'':'none';if(!rect)continue;
   button.style.left=rect.x+'px';button.style.top=rect.y+'px';button.dataset.leaderLength=String(rect.leaderLength);
   line.setAttribute('x1',String(p.x));line.setAttribute('y1',String(p.y));line.setAttribute('x2',String(rect.endX));line.setAttribute('y2',String(rect.endY));
  }
 }
 function fit(){if(!map||!ready)return;suppressCamera=true;if(state.camera)map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});else map.fitBounds([[config.bounds[0],config.bounds[1]],[config.bounds[2],config.bounds[3]]],{padding:{top:8,bottom:34,left:12,right:12},duration:0});suppressCamera=false;positionLabels();recordCamera();}
 function recordCamera(){if(map){const c=map.getCenter();root.dataset.mapCamera=JSON.stringify({lng:c.lng,lat:c.lat,zoom:map.getZoom()});root.dataset.mapExtent=JSON.stringify(map.getBounds().toArray());}}
 async function fetchJson<T>(name:string):Promise<T>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(config.assetBase+name,{signal:controller.signal});if(!r.ok)throw new Error('Asset '+r.status);return await r.json();}finally{clearTimeout(timeout);}}
 async function loadGrid(){
  if(grid)return grid;if(!population)throw new Error('Population not loaded');
  if(!gridPromise)gridPromise=(async()=>{const r=await fetch(config.assetBase+population!.grid);if(!r.ok)throw new Error('Grid '+r.status);return decodeAsiaNumericGrid(new Uint8Array(await r.arrayBuffer()),population!,'float32',-200);})().catch(error=>{gridPromise=null;throw error;});
  grid=await gridPromise;return grid;
 }
 async function initialise(){
  const revision=++generation;ready=false;root.dataset.mapReady='false';status('全国図を読み込んでいます');map?.remove();map=null;markers.splice(0).forEach(m=>m.remove());$('[data-japan-labels]').replaceChildren();$('[data-japan-fallback]').hidden=false;
  try{
   const loaded=await Promise.all([import('maplibre-gl'),fetchJson<any>('geography.json'),fetchJson<Industry>('industry.json'),fetchJson<Population>('population.json')]);
   if(revision!==generation)return;[lib,,industry,population]=loaded;const geography=loaded[1];lib.setWorkerUrl(workerUrl);
   const japan={type:'FeatureCollection',features:geography.features.filter((f:any)=>f.properties.code==='JPN')};
   const parallels={type:'FeatureCollection',features:[25,30,35,40,45].map(lat=>({type:'Feature',properties:{lat},geometry:{type:'LineString',coordinates:[[122.5,lat],[146.3,lat]]}}))};
   map=new lib.Map({container:$('[data-map-surface]'),attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,maxPitch:0,minZoom:2,maxZoom:10,trackResize:false,maxBounds:[[110,15],[160,55]],cooperativeGestures:true,pixelRatio:Math.min(devicePixelRatio,2),locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は2本指で動かせます'},style:{version:8,sources:{'japan-land':{type:'geojson',data:japan as any},'japan-prefectures':{type:'geojson',data:industry.geometry},'japan-population':{type:'image',url:config.assetBase+population.image,coordinates:population.imageCoordinates as any},'japan-parallels':{type:'geojson',data:parallels as any}},layers:[{id:'japan-ocean',type:'background',paint:{'background-color':'#e6eef0'}},{id:'japan-land',type:'fill',source:'japan-land',paint:{'fill-color':'#e2e8d8'}},{id:'japan-parallels',type:'line',source:'japan-parallels',paint:{'line-color':'#9dafab','line-opacity':.45,'line-width':.6,'line-dasharray':[4,5]}},{id:'japan-prefecture-fill',type:'fill',source:'japan-prefectures',layout:{visibility:'none'},paint:{'fill-color':'#d2ceca'}},{id:'japan-population',type:'raster',source:'japan-population',layout:{visibility:'none'},paint:{'raster-resampling':'nearest','raster-fade-duration':0}},{id:'japan-prefecture-border',type:'line',source:'japan-prefectures',paint:{'line-color':'#779087','line-width':.55,'line-opacity':.55}},{id:'japan-coast',type:'line',source:'japan-land',paint:{'line-color':'#547568','line-width':.9}},{id:'japan-prefecture-selected',type:'line',source:'japan-prefectures',filter:['==',['get','id'],''],paint:{'line-color':'#a74830','line-width':2}}]}});
   map.on('load',()=>{if(revision!==generation)return;ready=true;root.dataset.mapReady='true';$('[data-japan-fallback]').hidden=true;status('');fit();render();});
   map.on('error',()=>status('地図の一部を取得できませんでした。地図下の統計と出典を確認できます。',true));
   map.on('move',()=>{positionLabels();recordCamera();});
   map.on('moveend',event=>{if(!ready||suppressCamera||event.japanResize)return;clearTimeout(timer);timer=setTimeout(()=>{state={...state,camera:camera()};persist(false);},120);});
   map.on('click',async event=>{
    if(quantity()){const hit=map!.queryRenderedFeatures(event.point,{layers:['japan-prefecture-fill']})[0];if(hit?.properties.id)prefecture(hit.properties.id);}
    else if(state.field==='population'&&map!.queryRenderedFeatures(event.point,{layers:['japan-land']}).length){
     point=[event.lngLat.lng,event.lngLat.lat];const selected=point;const revision=generation;try{const g=await loadGrid();if(generation!==revision||state.field!=='population'||point!==selected)return;const v=readAsiaNumericCell(g,selected[0],selected[1]);$('[data-japan-grid-value]').textContent=`選択地点 ${selected[1].toFixed(3)}°N / ${selected[0].toFixed(3)}°E：`+(v==null?'欠測・未収録（0ではありません）':number(v)+' 人/km²（2020年・5km集約推計）');}catch{$('[data-japan-grid-value]').textContent='選択地点の数値を取得できませんでした。再度選択してお試しください。';}
    }
   });
  }catch{if(revision===generation)status('全国図を表示できませんでした。基図のみを表示しています。地図下の統計と出典は利用できます。',true);}
  render();
 }
 for(const a of all<HTMLAnchorElement>('[data-japan-field]'))a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();const field=a.dataset.japanField as AsiaField;if(field===state.field)return;navigate({...state,field,topic:japanDefaults[field],prefecture:null,city:null,site:null,camera:camera()});});
 for(const b of all('[data-japan-topic]'))b.addEventListener('click',()=>topic(b.dataset.japanTopic!));
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
 $('[data-japan-okinawa]').addEventListener('click',()=>{if(!map||!ready)return;clearTimeout(timer);suppressCamera=true;map.fitBounds([[122.8,23.9],[131.4,28.1]],{padding:{top:8,bottom:34,left:12,right:12},duration:0});state={...state,camera:camera()};suppressCamera=false;persist(true);positionLabels();recordCamera();});
 $('[data-japan-retry]').addEventListener('click',()=>{state={...state,camera:camera()};void initialise();});
 window.addEventListener('popstate',()=>{clearTimeout(timer);state=readJapanState(new URL(location.href),context);point=null;render();fit();});
 function sizePanels(){
  const frame=$('.japan-map-frame'),reading=$('.japan-reading');
  // Document positions avoid changing the map's size while the user scrolls.
  const frameTop=frame.getBoundingClientRect().top+window.scrollY,readingTop=reading.getBoundingClientRect().top+window.scrollY;
  const mapHeight=Math.max(360,Math.min(700,innerHeight-frameTop-72));
  root.style.setProperty('--japan-map-height',mapHeight+'px');
  const available=$('.japan-primary-grid').clientWidth;root.style.setProperty('--japan-map-width',Math.max(340,Math.min(available-294,mapHeight*.88))+'px');
  root.style.setProperty('--japan-reading-height',Math.max(320,Math.min(650,innerHeight-readingTop-16))+'px');
 }
 window.addEventListener('resize',sizePanels);
 const panelObserver=new ResizeObserver(sizePanels);for(const element of all('.japan-heading,.japan-region,.japan-tabs,.japan-controls,.japan-map-heading'))panelObserver.observe(element);
 sizePanels();
 let size='';const observer=new ResizeObserver(()=>{const frame=$('.japan-map-frame'),next=frame.clientWidth+':'+frame.clientHeight;if(next===size)return;size=next;if(map){suppressCamera=true;map.resize({japanResize:true});suppressCamera=false;if(ready&&!state.camera)fit();positionLabels();}});observer.observe($('.japan-map-frame'));
 window.addEventListener('pagehide',()=>{clearTimeout(timer);if(ready&&state.camera){state={...state,camera:camera()};persist(false);}});
 render();await initialise();
}
