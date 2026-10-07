import {westFields,westTopics,statisticalColors,observation,westReading} from '../data/atlas/west-asia-topics.mjs';
import {readWestState,westSearch,gridIndex,decodeWestGrid,zoomWestView,panWestView} from '../lib/atlas-west-asia-state.mjs';
import {stationAnnualRainfall,rainfallBreaks,rainfallColors,rainfallColor,isSettlementTopic,settlementSubject,validateSettlementCollection} from '../lib/atlas-west-asia-completion.mjs';
import {westAnnualPrecipitationId,westPrecipitationManifestPath,westPrecipitationLayer,decodeWestPrecipitationGrid} from '../lib/atlas-west-asia-precipitation.mjs';
import {westFarmingProducts,westFarmingProduct,isWestFarmingOverview,westFarmingGeometry} from '../lib/atlas-west-asia-farming.mjs';
import {westFieldIntroductions,westIndustryCountries,westIndustryCountry,westIndustryTakeaway,westRegionalReading,westReadingSources,westCityReadings,westFarmingSelection} from '../data/atlas/west-asia-readings.mjs';

// All classes present in the national-mask grid (1991–2020), including Cwb's four cells.
// Keep this region-wide key stable when the learner selects a country or pans the map.
const westClimateNames:Record<string,string>={
 BWh:'高温の砂漠',BWk:'低温の砂漠',BSh:'高温のステップ',BSk:'低温のステップ',
 Csa:'地中海性（暑夏）',Csb:'地中海性（暖夏）',Cwb:'冬乾燥温帯（暖夏）',
 Cfa:'温暖湿潤',Cfb:'西岸海洋性',Dsa:'夏乾燥冷帯（暑夏）',Dsb:'夏乾燥冷帯（暖夏）',Dsc:'夏乾燥冷帯（冷夏）',
 Dfa:'湿潤冷帯（暑夏）',Dfb:'湿潤冷帯（暖夏）',Dfc:'湿潤冷帯（冷夏）',ET:'ツンドラ'
};
const westClimateCompactNames:Record<string,string>={BWh:'高温砂漠',BWk:'低温砂漠',BSh:'高温草原',BSk:'低温草原',Csa:'夏乾暑夏',Csb:'夏乾暖夏',Cwb:'冬乾暖夏',Cfa:'温暖湿潤',Cfb:'西岸海洋',Dsa:'夏乾暑夏',Dsb:'夏乾暖夏',Dsc:'夏乾冷夏',Dfa:'湿潤暑夏',Dfb:'湿潤暖夏',Dfc:'湿潤冷夏',ET:'ツンドラ'};
const categoryLabels:Record<string,string>={precipitation:'降水量',ethnicity:'人種・民族',religion:'宗教'};

const root=document.querySelector<HTMLElement>('[data-west-atlas]');
if(root) init(root);
async function init(root:HTMLElement){
 const $=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const assets=root.dataset.assets!,field=root.dataset.field!;
 const settlementAssets=root.dataset.settlementsAssets??assets.replace('west-asia-v1/','west-asia-settlements-v1/');
 const svg=$<SVGSVGElement>('[data-west-map]'),scene=$<SVGGElement>('[data-west-scene]');
 const countrySelect=document.querySelector<HTMLSelectElement>('[data-west-country]')!;
 const citySelect=$<HTMLSelectElement>('[data-west-city]'),urbanSelect=$<HTMLSelectElement>('[data-west-urban]');
 const basinSelect=$<HTMLSelectElement>('[data-west-basin]'),yearSelect=$<HTMLSelectElement>('[data-west-year]');
 const settlementSelect=$<HTMLSelectElement>('[data-west-settlement]');
 const loading=$('[data-west-loading]'),retry=$<HTMLButtonElement>('[data-west-retry]');
 const legendBox=$('[data-west-legend]'),mapExtras=$('[data-west-map-extras]'),agriSwitches=$('[data-west-agri-switches]');
 const statControls=$('[data-west-stat-controls]'),comparisonKey=$('[data-west-comparison-key]'),comparisonDetails=$<HTMLDetailsElement>('[data-west-comparison-details]');
 const statistics=$('[data-west-comparison]'),shell=root.closest<HTMLElement>('[data-atlas-shell]');
 const statisticsContent=document.createElement('div'),statisticsControls=document.createElement('div');statisticsContent.dataset.westStatisticsContent='';statisticsControls.dataset.westStatisticsControls='';statistics.append(statisticsControls,statisticsContent);
 const yearLabel=$('[data-west-year-label]');
 if(shell){shell.classList.add('west-layout-shell');statistics.classList.add('west-layout-statistics');shell.append(statistics);statistics.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-west-country-button]');if(button)changeCountry(button.dataset.westCountryButton!);});}
 const anchor=(el:Element)=>{const a=document.createComment('west-comparison-home');el.before(a);return a;};
 const legendHome=anchor(legendBox),mapExtrasHome=anchor(mapExtras),agriHome=anchor(agriSwitches),statHome=anchor(statControls),comparisonKeyHome=anchor(comparisonKey),comparisonDetailsHome=anchor(comparisonDetails);
 const desktopComparison=window.matchMedia('(min-width:960px)');
 const cache=new Map<string,Promise<any>>(),grids=new Map<string,Promise<Float32Array>>();
 const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 const format=(n:number|null,digits=1)=>n===null?'未収録':n.toLocaleString('ja-JP',{maximumFractionDigits:digits});
 const json=(name:string)=>{
  if(!cache.has(name))cache.set(name,fetch(assets+name).then(r=>{if(!r.ok)throw Error('資料を取得できませんでした。');return r.json();}).catch(e=>{cache.delete(name);throw e;}));
  return cache.get(name)!;
 };
 let settlementManifest:any=null;
 const settlementCollections=new Map<string,any>();
 async function settlementJSON(name:string){
  const key=settlementAssets+name;
  if(!cache.has(key))cache.set(key,fetch(key).then(async r=>{if(!r.ok)throw Error('掲載居住域資料を取得できませんでした。');const bytes=new Uint8Array(await r.arrayBuffer());const raw=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);return JSON.parse(raw);}).catch(e=>{cache.delete(key);throw e;}));
  return cache.get(key)!;
 }
 async function loadSettlements(id:string){
  if(!isSettlementTopic(id))return;
  settlementManifest??=await settlementJSON('manifest.json');
  const subject=settlementSubject(settlementManifest,id);if(!subject?.file)throw Error('掲載居住域の主題を確認できませんでした。');
  if(!settlementCollections.has(id)){try{settlementCollections.set(id,validateSettlementCollection(await settlementJSON(subject.file),subject));}catch(e){cache.delete(settlementAssets+subject.file);throw e;}}
 }
 let data:any,geography:any,state:any,comparisonSource:any=null,cityExplicit=false,pointSide='target',split=50,renderVersion=0,pointVersion=0;
 let unavailable='',openWaterGroup=false,readingOverview=!new URLSearchParams(location.search).has('topic')&&!new URLSearchParams(location.search).has('country')&&!new URLSearchParams(location.search).has('city');
 const fieldIntroductions:Record<string,string>=westFieldIntroductions;
 const statisticalCountries=(t:any)=>t.field==='industry'?westIndustryCountries.map(code=>data.countries.find((c:any)=>c.code===code)).filter(Boolean):data.countries;
 const standardGroup=(t:any)=>field==='agriculture'?(t.id==='forest'?'林業':'農畜産'):field==='industry'?'地域主要産業':field==='population'?(isSettlementTopic(t.id)?t.group:'人口分布'):t.group;
 const fail=(message:string)=>{loading.hidden=false;loading.textContent=message;retry.hidden=false;const more=retry.closest<HTMLDetailsElement>('[data-west-comparison-details]');if(more)more.open=true;};
 const project=([lng,lat]:number[])=>[(lng*Math.PI/180*6378137-data.bounds3857[0])/(data.bounds3857[2]-data.bounds3857[0])*data.width,(data.bounds3857[3]-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*6378137)/(data.bounds3857[2]-data.bounds3857[0])*data.width];
 const unproject=([x,y]:number[])=>[(data.bounds3857[0]+x/data.width*(data.bounds3857[2]-data.bounds3857[0]))/6378137*180/Math.PI,(2*Math.atan(Math.exp((data.bounds3857[3]-y/data.width*(data.bounds3857[2]-data.bounds3857[0]))/6378137))-Math.PI/2)*180/Math.PI];
 const path=(g:any):string=>{
  const line=(a:number[][],closed=false)=>a.map((p,i)=>{const v=project(p);return `${i?'L':'M'}${v[0].toFixed(2)},${v[1].toFixed(2)}`;}).join('')+(closed?'Z':'');
  if(g.type==='Polygon')return g.coordinates.map((a:number[][])=>line(a,true)).join('');
  if(g.type==='MultiPolygon')return g.coordinates.flat().map((a:number[][])=>line(a,true)).join('');
  if(g.type==='LineString')return line(g.coordinates);
  if(g.type==='MultiLineString')return g.coordinates.map((a:number[][])=>line(a)).join('');
  if(g.type==='GeometryCollection')return g.geometries.map(path).join('');
  return '';
 };
 let paths:any[]=[];
 const view=()=>state.view??[0,0,data.width,data.height];
 const fit=(b:number[],padding=.16)=>{
  const a=project([b[0],b[3]]),z=project([b[2],b[1]]),w=Math.max(20,z[0]-a[0]),h=Math.max(20,z[1]-a[1]);
  return [a[0]-w*padding,a[1]-h*padding,w*(1+2*padding),h*(1+2*padding)];
 };
 const country=()=>data.countries.find((c:any)=>c.code===state.country);
 const topic=()=>westTopics.find(t=>t.id===state.topic)!;
 const layer=(t=topic())=>data.layers.find((l:any)=>l.id===t.layer);
 const sourceTopic=()=>comparisonSource?westTopics.find(t=>t.id===comparisonSource.topic):null;
 async function loadAnnualPrecipitation(){
  if(data.layers.some((l:any)=>l.id===westAnnualPrecipitationId))return;
  try{const manifest=await json(westPrecipitationManifestPath);if(data.layers.some((l:any)=>l.id===westAnnualPrecipitationId))return;const l=westPrecipitationLayer(manifest,data);data={...data,layers:[...data.layers,l]};}
  catch(error){cache.delete(westPrecipitationManifestPath);throw error;}
 }
 function restoreComparison(search:string){
  const p=new URLSearchParams(search);pointSide=p.get('side')==='source'?'source':'target';
  cityExplicit=!!state.city&&p.has('city');
  comparisonSource=null;const from=p.get('from');if(!from)return;
  const id=new URLSearchParams(from).get('topic'),source=westTopics.find(t=>t.id===id);
  if(!source||!westReading(source).comparisons.some((c:any)=>c.topic===state.topic))return;
  comparisonSource=readWestState(from,source.field,data);
 }
 function currentSearch(){
  const p=new URLSearchParams(westSearch(state));
  if(comparisonSource)p.set('from',westSearch(comparisonSource));
  if(comparisonSource&&pointSide==='source')p.set('side','source');
  return '?'+p.toString();
 }
 function compareHref(id:string){
  const target=westTopics.find(t=>t.id===id)!;
  const next={...state,field:target.field,topic:id};
  if(target.field==='industry'&&!westIndustryCountry(next.country))next.country='';
  if((target.indicator||target.faoItem)&&!statisticalCountries(target).some((c:any)=>observation(data,target,c.code,next.year).value!==null)){
   next.year=[2024,2023,2022,2021,2020].find(y=>statisticalCountries(target).some((c:any)=>observation(data,target,c.code,y).value!==null))??next.year;
  }
  const p=new URLSearchParams(westSearch(next));p.set('from',westSearch(state));
  return location.pathname.split('/atlas/')[0]+'/atlas/west-asia/'+westFields.find(f=>f.id===target.field)!.route+'/?'+p.toString();
 }
 function links(){
  root.querySelectorAll<HTMLAnchorElement>('[data-west-field]').forEach(a=>{a.href=a.href.split('?')[0]+westSearch(state,a.dataset.westField);});
  const base=location.pathname.split('/atlas/')[0];
  const t=topic(),reading=westReading(t),source=sourceTopic(),related=$('[data-west-related]');
  if(!related)return;
  const originalCountry=source?data.countries.find((c:any)=>c.code===comparisonSource.country)?.name:null;
  const originalCity=source?data.cities.find((c:any)=>c.id===comparisonSource.city)?.name:null;
  const originalGroup=source&&isSettlementTopic(source.id)?settlementSubject(settlementManifest,source.id)?.categories.find((c:any)=>c.id===comparisonSource.group)?.label:null;
  const originalName=[originalCountry,originalCity,originalGroup].filter(Boolean).join('・');
  related.innerHTML=source
   ?`<h3>比較を終えて元の解説へ</h3><a data-west-return href="${esc(base+'/atlas/west-asia/'+westFields.find(f=>f.id===source.field)!.route+'/'+westSearch(comparisonSource))}">${esc(source.label)}へ戻る${originalName?'（'+esc(originalName)+'）':''} →</a>`
   :`<h3>この関係を地図で確かめる</h3>${reading.comparisons.map((c:any)=>`<a data-west-compare="${esc(c.topic)}" href="${esc(compareHref(c.topic))}">${esc(c.label)} →</a>`).join('')}`;
 }
 function commit(replace=false){
  const url=location.pathname+currentSearch();history[replace?'replaceState':'pushState']({},'',url);links();
 }
 function applyView(){
  const b=view();svg.setAttribute('viewBox',b.join(' '));
  const rect=scene.querySelector('[data-west-source-clip]'),divider=scene.querySelector('[data-west-divider]');
  if(rect){rect.setAttribute('x',String(b[0]));rect.setAttribute('y',String(b[1]));rect.setAttribute('width',String(b[2]*split/100));rect.setAttribute('height',String(b[3]));}
  const targetRect=scene.querySelector('[data-west-target-clip]');
  if(targetRect){targetRect.setAttribute('x',String(b[0]+b[2]*split/100));targetRect.setAttribute('y',String(b[1]));targetRect.setAttribute('width',String(b[2]*(100-split)/100));targetRect.setAttribute('height',String(b[3]));}
  if(divider){const x=String(b[0]+b[2]*split/100);divider.setAttribute('x1',x);divider.setAttribute('x2',x);divider.setAttribute('y1',String(b[1]));divider.setAttribute('y2',String(b[1]+b[3]));}
  const k=Math.max(b[2]/Math.max(svg.clientWidth,1),b[3]/Math.max(svg.clientHeight,1));
  scene.querySelectorAll<SVGElement>('[data-marker]').forEach(el=>{el.setAttribute('transform',`translate(${el.dataset.x},${el.dataset.y}) scale(${k})`);});
  scene.querySelectorAll<SVGTextElement>('.west-map-label').forEach(el=>el.style.fontSize=11*k+'px');
  // Keep label sizes stable on screen and move labels, never geographic anchors.
  const placed:number[][]=[],ox=(svg.clientWidth-b[2]/k)/2,oy=(svg.clientHeight-b[3]/k)/2;
  const markers=[...scene.querySelectorAll<SVGGElement>('[data-marker]')].sort((a,b)=>Number(b.classList.contains('is-selected'))-Number(a.classList.contains('is-selected')));
  for(const marker of markers){
   const label=marker.querySelector<SVGGElement>('[data-marker-label]');if(!label)continue;
   const w=Number(label.dataset.width),h=44,x=(Number(marker.dataset.x)-b[0])/k+ox,y=(Number(marker.dataset.y)-b[1])/k+oy;
   const boundary=ox+b[2]*split/100/k;
   const left=comparisonSource?ox:0,right=comparisonSource?ox+b[2]/k:svg.clientWidth;
   const minX=comparisonSource&&marker.dataset.markerSide==='target'?boundary:left,maxX=comparisonSource&&marker.dataset.markerSide==='source'?boundary:right;
   const minY=comparisonSource?oy:0,maxY=comparisonSource?oy+b[3]/k:svg.clientHeight;
   if(x<minX||y<minY||x>maxX||y>maxY||maxX-minX<w+4||maxY-minY<h+4){label.style.display='none';marker.querySelector('line')!.style.display='none';continue;}
   const candidates=[[8,-h-7],[-w-8,-h-7],[8,8],[-w-8,8],[-w/2,-h-18],[-w/2,18],[15,-h/2],[-w-15,-h/2]];
   let best:number[]|null=null,bestScore=Infinity;
   for(const [dx,dy] of candidates){
    const lx=Math.max(minX+2,Math.min(maxX-w-2,x+dx)),ly=Math.max(minY+2,Math.min(maxY-h-2,y+dy));
    const score=placed.reduce((sum,r)=>sum+Math.max(0,Math.min(lx+w+3,r[0]+r[2])-Math.max(lx-3,r[0]))*Math.max(0,Math.min(ly+h+3,r[1]+r[3])-Math.max(ly-3,r[1])),0);
    if(score<bestScore){best=[lx,ly,w,h];bestScore=score;}
   }
   if(!best)continue;
   const visible=bestScore<40||marker.classList.contains('is-selected');label.style.display=visible?'':'none';marker.querySelector('line')!.style.display=visible?'':'none';
   if(!visible)continue;placed.push(best);
   label.setAttribute('transform',`translate(${best[0]-x},${best[1]-y})`);
   const line=marker.querySelector('line')!;line.setAttribute('x2',String(best[0]-x+w/2));line.setAttribute('y2',String(best[1]-y+h/2));
  }
 }
 function changeCountry(code:string,fitCountry=true){
  if(field==='industry'&&code&&!westIndustryCountry(code))return;
  readingOverview=false;
  state.country=code;state.point=null;state.basin='';
  if(state.city&&data.cities.find((c:any)=>c.id===state.city)?.countryCode!==code){state.city='';cityExplicit=false;}
  if(topic().id==='climate'&&!state.city)state.city=data.cities.find((c:any)=>!code||c.countryCode===code)?.id??'';
  if(state.urban&&data.urban.cities.find((c:any)=>c.id===state.urban)?.countryCode!==code)state.urban='';
  if(fitCountry&&field!=='industry')state.view=code?fit(country().bounds):null;
  commit();void render();
 }
 function selectCity(id:string){
  readingOverview=false;
  state.city=id;cityExplicit=!!id;state.point=null;
  const city=data.cities.find((c:any)=>c.id===id);
  if(city)state.country=city.countryCode;
  commit();void render();
 }
 function selectUrban(id:string){
  readingOverview=false;
  state.urban=id;state.point=null;
  const city=data.urban.cities.find((c:any)=>c.id===id);
  if(city){state.country=city.countryCode;state.view=fit(city.bounds,.65);}
  commit();void render();
 }
 async function selectBasin(id:string){
  const basins=await json('basins.json');const f=basins.features.find((f:any)=>f.properties.id===id);
  state.basin=f?id:'';state.point=null;if(f){state.view=fit(f.properties.bounds,.08);if(state.country&&!f.properties.countries.includes(state.country)){state.country='';state.city='';state.urban='';}}commit();void render();
 }
 function availableYear(t:any){
  if(!t.indicator&&!t.faoItem)return;
  if(statisticalCountries(t).some((c:any)=>observation(data,t,c.code,state.year).value!==null))return;
  const y=[2024,2023,2022,2021,2020].find(y=>statisticalCountries(t).some((c:any)=>observation(data,t,c.code,y).value!==null));
  if(y!==undefined){state.year=y;state.yearNotice=`この主題の収録状況に合わせ、国別統計を${y}年へ切り替えました。`;}
 }
 function changeTopic(id:string){
  const source=sourceTopic(),keepComparison=!!source&&westReading(source).comparisons.some((c:any)=>c.topic===id);
  unavailable='';state.category='';openWaterGroup=false;readingOverview=false;
  if(!keepComparison){comparisonSource=null;state.point=null;state.basin='';}
  state.topic=id;
  if(!keepComparison)availableYear(topic());commit();void render();
 }
 async function getGrid(l:any){
  if(!grids.has(l.id))grids.set(l.id,fetch(assets+l.grid).then(async r=>{if(!r.ok)throw Error('数値を取得できませんでした。');const bytes=await r.arrayBuffer();return l.id===westAnnualPrecipitationId?decodeWestPrecipitationGrid(bytes,l):decodeWestGrid(bytes,l);}).catch(e=>{grids.delete(l.id);throw e;}));
  return grids.get(l.id)!;
 }
 const farmingGeometry=new Map<string,Promise<ReturnType<typeof westFarmingGeometry>>>();
 function farmingShape(l:any){
  if(!farmingGeometry.has(l.id))farmingGeometry.set(l.id,getGrid(l).then(values=>westFarmingGeometry(values,l)).catch(error=>{farmingGeometry.delete(l.id);throw error;}));
  return farmingGeometry.get(l.id)!;
 }
 async function farmingMarkup(t:any,selection:any,interactive=false){
  const selected=westFarmingProduct(t),items=await Promise.all(westFarmingProducts.map(async product=>({product,shape:await farmingShape(data.layers.find((l:any)=>l.id===product.id))})));
  let html='<g clip-path="url(#west-target-land)">';
  for(const {product,shape} of items){
   const attrs=interactive?`data-west-farm="${product.id}" role="button" tabindex="0" aria-label="${product.label}の分布を選択" aria-pressed="${selected?.id===product.id}"`:'';
   if(product.kind==='crop')html+=`<path data-west-farm-context="${product.id}" d="${shape.outline}" fill="none" stroke="${product.color}" stroke-width=".75" vector-effect="non-scaling-stroke" ${attrs}/>`;
   else html+='<g data-west-farm-context="'+product.id+'" opacity="'+(selected?.kind==='crop'?'.2':'1')+'">'+shape.points.map((p:any)=>`<circle cx="${p.x}" cy="${p.y}" r="${selected?.id===product.id?5:3.5}" fill="#fffdf5" stroke="${product.color}" stroke-width="${selected?.id===product.id?3:1.7}" vector-effect="non-scaling-stroke" ${attrs}/>`).join('')+'</g>';
  }
  if(selected?.kind==='crop'){
   const shape=await farmingShape(layer(t));
   for(const [color,width] of [['#fffdf5',4.5],['#203f4a',2.5]])html+=`<path data-west-farm-selected="${esc(t.id)}" d="${shape.outline}" fill="none" stroke="${color}" stroke-width="${width}" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  return html+'</g>';
 }
 async function readPoint(coord:number[],label='選択地点',selectedTopic=topic()){
  const version=++pointVersion,l=layer(selectedTopic);if(!l)return;
  if(!l.grid){$('[data-west-point]').textContent='この画像は提供元が描画した森林の参考図です。地点の数値・分類は収録していません。国別の森林面積率は右の統計で確認できます。';return;}
  const out=$('[data-west-point]');out.textContent=label+'の値を読み込んでいます。';
  try{
   const grid=await getGrid(l);if(version!==pointVersion)return;
   const index=gridIndex(coord[0],coord[1],l),value=index<0?null:grid[index];
   const prefix=`${label}${comparisonSource?'・'+selectedTopic.label:''}（東経${coord[0].toFixed(2)}°・北緯${coord[1].toFixed(2)}°）`;
   if(value===null||value===l.noData||!Number.isFinite(value)){out.textContent=prefix+'：この格子の値は未収録です。海岸・小島では原資料の解像度も影響します。';const heading=root.querySelector('[data-west-climate-class]');if(heading&&label!=='選択地点')heading.textContent='気候区分：この格子は未収録です。';return;}
   if(l.id==='climate'){
    const c=data.classes.find((c:any)=>c.id===value);out.innerHTML=`${esc(prefix)}：<strong>${esc(c?.code)} ${esc(c?.name)}</strong>（${esc(l.year)}）。${esc(c?.description)}`;
    if(label!=='選択地点'){
     const heading=root.querySelector('[data-west-climate-class]'),description=root.querySelector('[data-west-climate-description]');
     if(heading)heading.textContent=c?c.code+' '+c.name:'気候区分：未収録';
     if(description)description.textContent=c?.description??'この観測地点を含む格子は未収録です。';
    }
   }else if(l.id===westAnnualPrecipitationId)out.textContent=prefix+'：'+format(value,1)+' mm／年（1991–2020年平年値）。GPCC v2025・0.25°原格子の12か月合計です。表示格子が選ぶ最近傍原格子の値で、地点の実測値や現在の水利用可能量ではありません。'+(value===0?'原資料の値は0です。未収録とは区別しています。':'');
   else out.textContent=prefix+'：'+format(value,1)+' '+l.unit+'（'+l.year+'）。'+(value===0?'原資料の値は0です。未収録とは区別しています。':'格子の推計値・補間値であり、地点の実測値とは限りません。');
  }catch{if(version===pointVersion){out.hidden=false;const message=label+'・'+selectedTopic.label+'の数値を読み込めませんでした。地図の選択は続けられます。「資料を再読み込みする」で再試行できます。';out.textContent=message;const heading=root.querySelector('[data-west-climate-class]');if(heading&&l.id==='climate'&&label!=='選択地点')heading.textContent='気候区分を読み込めませんでした。';fail(message);}}
 }
 async function cityClassification(city:any,version:number){
  try{
   const l=layer(westTopics.find(t=>t.id==='climate')!),grid=await getGrid(l),index=gridIndex(...city.coordinates,l);
   if(version!==renderVersion)return;const c=index<0?null:data.classes.find((c:any)=>c.id===grid[index]);
   const heading=root.querySelector('[data-west-climate-class]'),description=root.querySelector('[data-west-climate-description]');
   if(heading)heading.textContent=c?c.code+' '+c.name:'気候区分：この格子は未収録です。';
   if(description)description.textContent=c?.description??'この観測地点を含む格子は未収録です。';
  }catch{if(version===renderVersion){const heading=root.querySelector('[data-west-climate-class]');if(heading)heading.textContent='観測地点の気候区分を読み込めませんでした。';}}
 }
 function sourceLink(t:any){return t.indicator?'https://data.worldbank.org/indicator/'+t.indicator:'https://www.fao.org/faostat/en/#data/'+(t.faoDomain==='Inputs_LandUse'?'RL':'QCL');}
 function details(){
  const t=topic(),c=country(),city=data.cities.find((x:any)=>x.id===state.city),urban=data.urban.cities.find((x:any)=>x.id===state.urban);
  const reading=westReading(t),source=sourceTopic(),comparison=source?westReading(source).comparisons.find((x:any)=>x.topic===t.id):null;
  statistics.hidden=true;statisticsContent.replaceChildren();statistics.setAttribute('aria-label',t.id==='climate'?'観測所の気温・降水量':t.id==='cities'?'都市中心部の人口推計':'国別統計');
  let html=`<header class="west-reading-header"><p class="atlas-eyebrow">${c?esc(c.name):'西アジア・中東'}</p>${!source&&!readingOverview?'<button type="button" data-west-reading-overview>概論へ戻る</button>':''}<h2 id="west-detail-title">${esc(unavailable?unavailable:!source&&readingOverview?westFields.find(f=>f.id===field)!.label+'の概論':t.id==='precipitation'?'降水量':t.label)}</h2></header>`;
  html+=unavailable?`<p class="atlas-reading-takeaway"><strong>${esc(unavailable)}は未整備です。表示中の${esc(t.label)}は参考図です。</strong></p>`:source?`<section class="west-comparison-reading"><h3>${esc(source.label)} × ${esc(t.label)}</h3><p class="atlas-reading-takeaway"><strong>${esc(comparison?.explanation)}</strong></p><p class="west-stat-note">左は元の主題、右は比較先です。地図の境目を動かすと、同じ場所の両方の分布を読めます。凡例の単位・時点も比べてください。</p></section>`:`<p class="atlas-reading-takeaway"><strong>${esc(field==='industry'?westIndustryTakeaway(state.country):readingOverview?fieldIntroductions[field]:reading.message)}</strong></p>`;
  html+='<div class="west-related west-reading-dock" data-west-related></div>';
  html+='<div data-west-reading-key></div>';
  html+='<div data-west-reading-extra>';
  if(unavailable)html+=`<p>この項目を20対象で比較できる資料は未収録です。参考図の分布・凡例・統計と元の比較の選択は保持しています。</p><button type="button" data-west-resume-topic>参考図の説明へ戻る</button>`;
  if(!source&&field!=='industry')html+=`${readingOverview?'<h3>'+esc(t.label)+'</h3>':''}<p>${esc(reading.reason)}</p>`;
  if(field==='industry')html+=`<nav class="atlas-water-tabs west-water-items" aria-label="産業の説明対象" data-west-industry-scope><button type="button" data-west-country-button="" aria-pressed="${!c}">地域全体の供給網</button>${westIndustryCountries.map(code=>`<button type="button" data-west-country-button="${code}" aria-pressed="${c?.code===code}">${esc(data.countries.find((row:any)=>row.code===code)?.name)}</button>`).join('')}</nav><p class="west-stat-note">国別産業の比較は3か国です。地域全体の供給網には、他国の資源・通過点も含めます。下の国別統計は供給網の流量ではありません。</p>`;
  const regional=westRegionalReading(t,{country:state.country,basin:state.basin});
  if(regional){html+=`<section data-west-regional-reading><h3>${esc(regional.heading)}</h3>${regional.paragraphs.map((paragraph:string)=>`<p>${esc(paragraph)}</p>`).join('')}<details><summary>この地域説明の根拠・対象時点</summary>${regional.sources.map((id:string)=>{const source=westReadingSources[id];return `<p><a href="${esc(source.url)}">${esc(source.label)}</a> · ${esc(source.period)}</p>`;}).join('')}</details></section>`;}
  if(t.id==='farming-overview')html+=`<details data-west-farming-selection><summary>品目の採用候補・次点・収録範囲</summary>${Object.values(westFarmingSelection).map(text=>`<p>${esc(text)}</p>`).join('')}</details>`;
  statistics.hidden=true;
  if(state.city&&!['climate','precipitation'].includes(t.id))html+=`<p class="west-persisted">${esc(city?.name)}の選択を保持しています。「気候区分」へ戻ると同じ雨温図を読めます。</p>`;
  if(['climate','precipitation'].includes(t.id)){
   if(city){
    const annual=stationAnnualRainfall(city);
    html+=t.id==='precipitation'?`<section data-west-rain-reading><h3>${esc(city.name)}の観測所</h3><p class="west-value" data-west-rain-value>${annual===null?'年合計は未収録':format(annual)+' mm／年'}</p><p>${esc(city.normalPeriod)}の月別平年値の合計。${annual===null?'12か月が揃わないため補いません。':'国平均や地点間を補間した雨量ではありません。'}</p><p><a href="${esc(city.sourceUrl)}">${esc(city.sourceName)}・${esc(city.stationName)}</a></p></section>`:`<section class="atlas-city-climate"><h3>${esc(city.name)}の気候</h3><div class="atlas-climate-diagrams" data-west-active-chart></div></section>`;
    if(t.id==='precipitation'){statistics.hidden=false;statisticsContent.innerHTML=`<h2>${esc(city.name)}の雨温図</h2><details class="west-chart-details" ${!source||cityExplicit?'open':''}><summary>雨温図・月別の数値・観測地点</summary><div class="atlas-climate-diagrams" data-west-active-chart></div></details>`;}
   }
   else{
    const count=data.cities.filter((x:any)=>!c||x.countryCode===c.code).length;
    html+='<h3>観測所の平年値</h3><p>'+(c?esc(c.name)+'：':'')+(count?`地図の地点、または地図下の一覧から${count}観測所を選べます。`:'この国・地域では今回の資料取得範囲に観測所の平年値がありません。近隣国の値を代用しません。地域全体に戻ると、収録した18観測所を選べます。')+'観測所の値と国全体の値を区別してください。</p>';
   }
  }
  if(isSettlementTopic(t.id)){
   const subject=settlementSubject(settlementManifest,t.id),group=subject?.categories.find((c:any)=>c.id===state.group);
   if(c&&!subject?.coverage?.find((row:any)=>row.code===c.code)?.hasExamples)html+=`<p class="west-coverage-note">${esc(c.name)}に対応する掲載域の例はこの初回版にありません。集団・信仰の不在ではなく、国単位の所属情報を局所の面へ代用していません。</p>`;
   html+=`<section data-west-settlement-reading><h3>${esc(group?.label??'掲載域全体')}</h3><p>${esc(t.description)}</p>${group?`<p>原資料の掲載集団：${esc((group.sourceGroups??[]).map((g:any)=>typeof g==='string'?g:g.label??g.name??g.group??g.id).join('、'))}。分類の色は人数や割合ではありません。</p>`:''}<p>居住域は2020年に有効なGeoEPR 2021の掲載範囲。宗教情報はEPR-ED 2021の集団情報で、2020年の局所観測値ではありません。</p><p>原典で地域を描ける掲載集団の域を抽出しています。域を重ねた部分は共有域として示し、各集団の元の掲載範囲も保持します。集団を選ぶとその全掲載域を前面に表示します。薄い灰色の背景は未掲載・対象外、濃い灰色は掲載域の重なりです。未掲載は集団や信仰の不在を意味しません。</p><p><a href="${esc(settlementAssets+'manifest.json')}">掲載対象・原典・加工方法・利用条件</a></p></section>`;
  }
  if(t.id==='cities'){
   if(urban){
    html+=`<h3>${esc(urban.name)}</h3><p>2025年の都市中心部の範囲を固定して、過去年の人口を比べます。行政市の人口とは範囲が異なります。</p><p class="west-stat-note">都市の境界は金色の線で示します。人口の変化はこの固定した範囲の変化で、当時の都市の広がりの変化とは異なります。</p><p><a href="#west-statistics">${esc(urban.name)}の人口推計・面積・出典を下段で読む</a></p>`;
    statistics.hidden=false;statisticsContent.innerHTML=`<h2>${esc(urban.name)}の都市中心部人口</h2><p>都市中心部の2025年の範囲：${format(urban.areaKm2)} km²。以下の人口は同じ範囲を使った推計です。</p><table data-west-urban-statistics><caption>行政市の人口ではありません。JRC UCDB R2024A</caption><thead><tr><th>年</th><th>推計人口</th></tr></thead><tbody>${Object.entries(urban.history).map(([y,v])=>`<tr><th>${y}年</th><td>${format(v as number,0)}人</td></tr>`).join('')}</tbody></table><p><a href="https://human-settlement.emergency.copernicus.eu/ucdb2024.php">JRC UCDB R2024Aの出典・対象範囲</a></p>`;
   }else html+='<p>各国・地域で原資料に収録された都市中心部のうち、2020年の推計人口が多い上位2件を選んでいます。地図の円、または都市の一覧から選択してください。</p>';
  }
  if(t.indicator||t.faoItem){
   if(c){
    const r=observation(data,t,c.code,state.year),has=r.value!==null;
    const measure=t.faoElement==='5510'?'国別の生産量':t.faoElement==='5111'?'国別の飼養頭数':t.id==='forest'?'国別の森林面積率':t.id==='density'?'国別の総人口':'選択した年の値';
    html+=`<h3>${measure}</h3><p class="west-value">${format(r.value,t.unit==='人'||t.unit==='TEU'?0:1)}${has?` <small>${esc(r.unit)}</small>`:''}</p><p class="west-stat-note">${state.year}年 · ${esc(r.source)}${r.flag?' · 資料のフラグ：'+esc(r.flag)+'（'+esc(data.agriculture.flags[r.flag]??'原資料の注記')+'）':''}</p>`;
    if(!has)html+='<p>この国・地域と年の組合せは未収録です。0ではありません。年を変更すると、その年の収録値を確認できます。</p>';
   }
   const rows=statisticalCountries(t).map((c:any)=>({c,r:observation(data,t,c.code,state.year)}));
   if(!c)html+='<p class="atlas-reading-prompt">地図の国名、またはページ上部の国・地域を選ぶと、その国の統計を表示します。</p>';
   const scope=t.field==='industry'?'3か国':'20か国・地域';
   html+=`<p class="west-stat-note"><a href="${sourceLink(t)}">国別統計の定義・出典を確認する</a> · <a href="#west-statistics">${scope}の比較へ</a></p>`;
   const comparison=statisticsContent;statistics.hidden=false;
   comparison.innerHTML=`<h2>${esc(t.label)}の国別統計</h2><details><summary>${scope}を同じ年で比較する</summary><table><caption>${state.year}年 · ${esc(t.unit??'原資料の単位')}。国単位の値で、国内の分布を示しません。</caption><thead><tr><th>国・地域</th><th>値</th></tr></thead><tbody>${rows.map(({c,r}:any)=>`<tr><th><button data-west-country-button="${c.code}">${esc(c.name)}</button></th><td>${format(r.value,t.unit==='人'||t.unit==='TEU'?0:1)}</td></tr>`).join('')}</tbody></table></details>`;
  }
  html+=`<details class="west-reading-definitions"><summary>この指標の意味・資料の範囲</summary><p>${esc(t.description)}</p>`;
  if(t.id==='basins')html+='<p>流域の識別番号はHydroATLASのNEXT_SINKに対応します。ナイル川など地域外に続く流域も切り取らず、選択すると全体を表示します。色は流域の区別で、水量の大小ではありません。</p>';
  if(t.id==='groundwater')html+='<p>涵養は雨などが地下へ浸透して補給されることです。個々の井戸の深さ・水質・持続可能な取水量は未収録です。</p>';
  if(t.id===westAnnualPrecipitationId){const coverage=layer()?.countryCoverage?.find((row:any)=>row.code===c?.code);html+='<p>GPCC v2025は雨量計観測に基づく0.25°格子の補間平年値です。1991–2020年の月別平年値が12か月揃う原格子だけ合計します。画像と地点の値は同じfloat32配列で、最近傍原格子の年合計を表示します。表示画素を細かくしても原資料の解像度は増えません。</p><p>年降水量は雨・雪などの水当量です。河川流量・地下水涵養・取水量・現在の渇水や利用可能な水量とは異なります。観測所の降水量は別の主題で確認できます。</p>';if(coverage?.missingDisplayPixelCenters)html+=`<p class="west-coverage-note">${esc(c.name)}の一部の海岸・小島は原格子が未収録です。近隣国や海の値で補わず、灰色で表示します。</p>`;html+=`<p><a href="${esc(assets+westPrecipitationManifestPath)}">GPCCの取得・加工・利用条件・配信ハッシュ</a></p>`;}
  if(t.id==='desalination')html+='<p>20か国・地域で同じ年・定義の淡水化施設一覧と供給量は未収録です。</p><p><a href="https://www.fao.org/aquastat/en/overview/methodology/">FAO AQUASTATの定義と方法</a></p>';
  html+='</details></div>';
  $('[data-west-detail]').innerHTML=html;
  if(city&&['climate','precipitation'].includes(t.id)){
   const tpl=root.querySelector<HTMLTemplateElement>(`template[data-west-chart="${city.id}"]`);
   if(tpl){const chart=(t.id==='climate'?root:statistics).querySelector('[data-west-active-chart]')!;chart.append(tpl.content.cloneNode(true));if(westCityReadings[city.id]){const paragraph=document.createElement('p');paragraph.dataset.westCityGeography='';paragraph.textContent=westCityReadings[city.id];chart.querySelector('[data-west-climate-description]')?.after(paragraph);}}
  }
 }
 function legendHtml(t:any,year:number,complete=false,selectedGroup=state.group,interactive=true){
  const l=layer(t);let html='';
  const swatches=(items:{color:string,label:string}[])=>'<div class="west-swatches">'+items.map(x=>`<span><i style="background:${esc(x.color)}"></i>${esc(x.label)}</span>`).join('')+'</div>';
  if(isWestFarmingOverview(t)){
   html=swatches(westFarmingProducts.map(p=>({color:p.color,label:p.label+(p.kind==='crop'?'の概略栽培域':'の代表格子')})))+'<p>2020年の推計。色は品目の区別、太い輪郭は選択作物です。作物を選ぶと家畜の点を薄くします。点の数・輪郭の面積から生産量や頭数は計算しません。</p>';
  }else if(t.id==='precipitation'){
   html=swatches(rainfallColors.map((color,i)=>({color,label:i===0?'100未満':i===rainfallBreaks.length?'2,000以上':format(rainfallBreaks[i-1],0)+'〜'+format(rainfallBreaks[i],0)+'未満'})))+'<p>観測所の月別平年値の年合計 · mm／年。18地点の点のみ、期間は地点ごと。</p>';
  }else if(isSettlementTopic(t.id)){
   html='<div class="west-settlement-key">'+(settlementSubject(settlementManifest,t.id)?.categories??[]).map((c:any)=>interactive?`<button type="button" data-west-settlement-button="${esc(c.id)}" aria-pressed="${selectedGroup===c.id}"><i style="background:${esc(c.color)}"></i>${esc(c.label)}</button>`:`<span data-west-settlement-source-key="${esc(c.id)}" data-selected="${selectedGroup===c.id}"><i style="background:${esc(c.color)}"></i>${esc(c.label)}${selectedGroup===c.id?'（元図の選択）':''}</span>`).join('')+'</div><p>色は掲載域の識別（重なりあり）。GeoEPR 2021の2020年有効域／宗教は集団資料の帰属例。</p>';
  }else if(t.id==='climate'){
   const classes=swatches(data.classes.map((c:any)=>({color:c.color,label:c.code+' '+c.name})));
   const groups='<div class="west-climate-key"><span>A 熱帯</span><span>B 乾燥帯</span><span>C 温帯</span><span>D 冷帯</span><span>E 寒帯</span><span><b class="atlas-city-dot"></b> 雨温図の都市</span></div>';
   const dictionary='<details class="west-complete-key" data-west-climate-dictionary><summary>世界の全30区分・正式名を読む（1991–2020年）</summary>'+classes+'</details>';
   const names=comparisonSource?westClimateNames:westClimateCompactNames;
   const regional=complete?'<div class="west-regional-climate-key"><p>対象20か国・地域の全16区分 · 1991–2020年</p><div class="west-swatches">'+data.classes.filter((c:any)=>westClimateNames[c.code]).map((c:any)=>`<span data-west-climate-key="${esc(c.code)}" title="${esc(c.name)}"><i style="background:${esc(c.color)}"></i>${esc(c.code+' '+names[c.code])}</span>`).join('')+'</div></div>':'';
   html=complete?regional+'<div class="west-climate-key"><span>B 乾燥帯・C 温帯・D 冷帯・E 寒帯</span><span><b class="atlas-city-dot"></b> 雨温図の都市</span></div>'+dictionary:groups+dictionary;
  }else if(l?.id==='forest'){
   html=swatches([{color:'#008000',label:'森林の参考分布（2020年）'}]);
  }else if(l){
   html=swatches(l.colors.map((color:string,i:number)=>({color,label:i===0?`${format(l.breaks[0])}未満`:i===l.colors.length-1?`${format(l.breaks[i-1])}以上`:`${format(l.breaks[i-1])}〜${format(l.breaks[i])}未満`})))+`<p>${esc(l.unit)} · ${esc(l.year)}</p>`;
  }else if(t.id==='groundwater')html=swatches([{color:'#90bdcf',label:'広い地下水盆'},{color:'#a9c399',label:'複雑な地質構造'},{color:'#dfc89e',label:'局所的・浅い帯水層'}]);
  else if(t.indicator||t.faoItem){const breaks=t.breaks??[1,10,100,1000,10000];html=swatches(statisticalColors.slice(0,breaks.length+1).map((color,i)=>({color,label:i===0?`${format(breaks[0])}未満`:i===breaks.length?`${format(breaks[i-1])}以上`:`${format(breaks[i-1])}〜${format(breaks[i])}未満`})))+`<p>国別比較 · ${year}年 · ${esc(t.unit)}</p>`;}
  else html='<p>'+(t.id==='basins'?'色は流域の区別を示します。川は青い線、湖は水色で示します。':'川は青い線、湖は水色で示します。線の太さは流量を表しません。')+'</p>';
  if(t.id==='cities')html+=swatches([{color:'#c48b23',label:'都市中心部の境界（2025年の固定範囲）'}]);
  if(isWestFarmingOverview(t))html+=swatches([{color:'#e4e5df',label:'周辺国・正の推計なし・欠測（地点で区別）'}]);
  else if(t.id==='climate')html+=swatches([{color:'#e4e5df',label:'周辺国・未収録'}]);
  else html+=swatches([{color:'#e4e5df',label:l?'周辺国・未収録（区別は場所を選択）':'未収録・対象外'}]);
  return html;
 }
 function legend(){
  const t=topic(),l=layer(),source=sourceTopic();
  legendBox.innerHTML=source?`<section class="west-legend-subject ${source.id==='climate'?'west-legend-climate':''}"><h3>左｜${esc(source.label)}</h3>${legendHtml(source,comparisonSource.year,desktopComparison.matches,comparisonSource.group,false)}</section><section class="west-legend-subject ${t.id==='climate'?'west-legend-climate':''}"><h3>右｜${esc(t.label)}</h3>${legendHtml(t,state.year,desktopComparison.matches)}</section>`:legendHtml(t,state.year,t.id==='climate');
  if(!source&&t.id==='climate'){const background=legendBox.querySelector(':scope>.west-swatches');if(background){legendBox.querySelector('.west-climate-key')!.append(...background.children);background.remove();}}
  if(source&&desktopComparison.matches){
   for(const subject of legendBox.querySelectorAll<HTMLElement>('.west-legend-subject')){
    const heading=document.createElement('div');heading.className='west-legend-heading';heading.append(subject.querySelector('h3')!);
    const period=subject.querySelector('.west-regional-climate-key>p')??subject.querySelector(':scope>p');if(period)heading.append(period);
    subject.prepend(heading);
    if(subject.classList.contains('west-legend-climate')){
     const background=subject.querySelector(':scope>.west-swatches');if(background){subject.querySelector('.west-climate-key')!.append(...background.children);background.remove();}
    }else{
     const keys=document.createElement('div');keys.className='west-swatches';
     for(const row of subject.querySelectorAll(':scope>.west-swatches')){keys.append(...row.children);row.remove();}subject.append(keys);
    }
   }
  }
  $('[data-west-method]').textContent=l?.method??((t.indicator||t.faoItem)?'同じ年の国別統計を比較する図です。国内の位置や密度を表しません。未収録は灰色で示します。':t.id==='groundwater'?'WHYMAP：世界縮尺1:25,000,000の帯水層の広域区分です。取水量・貯留量・現在の渇水は示しません。':'Natural Earth v5.1.2の河川・湖。流域はHydroATLAS v1.0の同じ下流出口につながる区画を統合しています。');
  function subjectSource(subject:any,year:number){
   const subjectLayer=layer(subject);
   if(subject.id==='precipitation')return '<a href="https://www.data.jma.go.jp/tcc/tcc/products/climate/climatview/frame.php">気象庁 ClimatView</a>。観測所・平年期間・原典は選択地点の説明と下段の図表に記載。';
   if(isSettlementTopic(subject.id))return `<a href="${esc(settlementAssets+'manifest.json')}">GeoEPR / EPR-ED 2021・集団資料の掲載範囲と利用条件</a>。居住域は2020年有効、宗教は集団情報で局所人口割合ではありません。`;
   if(subjectLayer)return `<a href="${esc(subjectLayer.sourceUrl)}">${esc(subjectLayer.source)}</a> · ${esc(subjectLayer.year)} · ${esc(subjectLayer.license)} · ${esc(subjectLayer.method)}${subject.vector==='contours'?'。等高線は500m間隔です。':''}`;
   if(subject.indicator||subject.faoItem)return `<a href="${sourceLink(subject)}">${subject.indicator?'World Bank WDI':'FAOSTAT'}</a> · ${year}年 · CC BY 4.0`;
   return `<a href="${subject.id==='groundwater'?'https://www.whymap.org/':subject.id==='basins'?'https://www.hydrosheds.org/hydroatlas':'https://www.naturalearthdata.com/'}">${subject.id==='groundwater'?'BGR / UNESCO WHYMAP（広域概況図）':subject.id==='basins'?'HydroATLAS v1.0（地形による流域・CC BY 4.0）':'Natural Earth v5.1.2（パブリックドメイン）'}</a>。現在の観測値ではありません。`;
  }
  if(isWestFarmingOverview(t))$('[data-west-method]').textContent='MapSPAM / GLWの2020年推計格子。作物は4×4表示格子内の正の推計値のある範囲を輪郭化し、家畜は地図を6×4に分けた範囲の最大密度の格子を代表点とします。農場・放牧地の境界や観測地点ではありません。';
  if(t.id==='precipitation')$('[data-west-method]').textContent='18観測所の月別平年値。12か月が揃う地点のみ合計し、地点間や国平均へ補間しません。';
  if(isSettlementTopic(t.id))$('[data-west-method]').textContent=t.description;
  $('[data-west-source]').innerHTML=source?`右の図：${esc(t.label)} · ${subjectSource(t,state.year)}<br>左の元図：${esc(source.label)} · ${subjectSource(source,comparisonSource.year)}`:`出典：${subjectSource(t,state.year)}`;
  $('[data-west-period]').textContent=t.id==='precipitation'?'観測所別の平年期間':isSettlementTopic(t.id)?'2020年有効居住域／資料2021版':l?.year??((t.indicator||t.faoItem)?state.year+'年':'地理・地形資料');
 }
 function comparisonLayout(){
  const compact=!!comparisonSource&&desktopComparison.matches;
  root.dataset.comparisonWorkspace=String(compact);comparisonKey.hidden=!compact;comparisonDetails.hidden=!compact;
  const extra=root.querySelector<HTMLElement>('[data-west-reading-extra]');
  if(compact){
   const reading=$('.west-reading');reading.append(comparisonKey,comparisonDetails);
   comparisonKey.append(legendBox);
   const dictionaries=[...legendBox.querySelectorAll('[data-west-climate-dictionary]')];
   comparisonDetails.querySelector('summary')!.textContent=(dictionaries.length?'全30気候区分の辞書・':'')+'選択した場所の詳細・雨温図・国別統計・出典';
   $('[data-west-more-reading]').replaceChildren(...dictionaries,...(extra?[extra]:[]),statControls);
   $('[data-west-more-map]').replaceChildren(agriSwitches,mapExtras);
   comparisonDetails.open=cityExplicit||!!state.point||!!state.basin;
   requestAnimationFrame(sizeComparisonMap);
  }else{
   comparisonKeyHome.after(comparisonKey);comparisonDetailsHome.after(comparisonDetails);
   legendHome.after(legendBox);mapExtrasHome.after(mapExtras);agriHome.after(agriSwitches);statHome.after(statControls);
   if(extra)$('[data-west-detail]').append(extra);
   $('[data-west-more-reading]').replaceChildren();$('[data-west-more-map]').replaceChildren();
   if(!comparisonSource){
    if(desktopComparison.matches&&(field==='agriculture'||['climate','density','precipitation',westAnnualPrecipitationId,'ethnicity','religion'].includes(topic().id)))$('[data-west-reading-key]').append(legendBox);
    if(extra)extra.append(...legendBox.querySelectorAll('[data-west-climate-dictionary]'));
    statisticsControls.append(statControls);
   }
   root.style.removeProperty('--west-comparison-map-height');
   root.dataset.comparisonColumns='false';
  }
  requestAnimationFrame(syncReadingHeight);
 }
 function syncReadingHeight(){
  const pane=$('.west-reading'),height=window.innerWidth>=960?Math.max(200,window.innerHeight-pane.getBoundingClientRect().top-12)+'px':'';
  if(root.style.getPropertyValue('--west-reading-height')!==height){if(height)root.style.setProperty('--west-reading-height',height);else root.style.removeProperty('--west-reading-height');}
 }
 function sizeComparisonMap(){
  if(root.dataset.comparisonWorkspace!=='true')return;
  const grid=$('.atlas-primary-grid'),swipe=$('[data-west-swipe]');
  const box=getComputedStyle(grid),inset=['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].reduce((sum,key)=>sum+(parseFloat(box[key as keyof CSSStyleDeclaration] as string)||0),0);
  const columns=grid.getBoundingClientRect().width-inset>=884;
  root.dataset.comparisonColumns=String(columns);
  const reserved=comparisonKey.closest('.west-reading')?0:columns?0:comparisonKey.getBoundingClientRect().height;
  const available=window.innerHeight-grid.getBoundingClientRect().top-reserved-16;
  const height=Math.max(columns?300:330,Math.min(440,available-swipe.getBoundingClientRect().height-8));
  root.style.setProperty('--west-comparison-map-height',height+'px');applyView();
 }
 function rainMarkers(selection:any,side:string){
  return data.cities.map((c:any)=>{const p=project(c.coordinates),value=stationAnnualRainfall(c),name=c.name.replace(/（.*?）/g,'')+' '+(value===null?'欠測':format(value,0)+'mm'),width=Math.max(70,[...name].reduce((n:number,s:string)=>n+(s.charCodeAt(0)>255?12:7),0)+14);
   return `<g class="west-station west-rain-station ${selection.city===c.id?'is-selected':''}" data-marker data-marker-side="${side}" data-x="${p[0]}" data-y="${p[1]}" ${side==='target'?`data-city="${c.id}" role="button" tabindex="0" aria-pressed="${selection.city===c.id}"`:''} aria-label="${esc(c.name+'、'+(value===null?'年合計未収録':format(value)+' mm／年')+'、'+c.normalPeriod)}"><title>${esc(c.name)} · ${value===null?'年合計未収録':format(value)+' mm／年'} · ${esc(c.normalPeriod)}</title><line x1="0" y1="0" x2="0" y2="0"/><circle r="6" style="fill:${rainfallColor(value)}"/><g data-marker-label data-width="${width}"><rect width="${width}" height="44" rx="2"/><text x="${width/2}" y="27" text-anchor="middle">${esc(name)}</text></g></g>`;
  }).join('');
 }
 function settlementMarkup(id:string,selection:any,interactive=false){
  return [...(settlementCollections.get(id)?.features??[])].sort((a:any,b:any)=>Number(a.properties.id===selection.group)-Number(b.properties.id===selection.group)).map((f:any)=>`<path d="${path(f.geometry)}" fill="${esc(f.properties.color)}" fill-opacity=".75" fill-rule="evenodd" stroke="${selection.group===f.properties.id?'#183844':'#586d69'}" stroke-width="${selection.group===f.properties.id?2.2:.5}" vector-effect="non-scaling-stroke" ${interactive?`data-settlement="${esc(f.properties.id)}" role="button" tabindex="0" aria-label="${esc(f.properties.label)}の掲載域を選択" aria-pressed="${selection.group===f.properties.id}"`:''}><title>${esc(f.properties.label)}（掲載居住域・人口割合ではありません）</title></path>`).join('');
 }
 function selectSettlement(id:string){
  const subject=settlementSubject(settlementManifest,topic().id);if(id&&!subject?.categories.some((c:any)=>c.id===id))return;
  state.group=id;readingOverview=false;commit();void render();
 }
 async function sourceMarkup(){
  const t=sourceTopic();if(!t)return '';const l=isWestFarmingOverview(t)?null:layer(t),year=comparisonSource.year;
  let html=paths.map(f=>{
   const value=f.target&&(t.field!=='industry'||westIndustryCountry(f.code))&&!l&&!isWestFarmingOverview(t)&&(t.indicator||t.faoItem)?observation(data,t,f.code,year).value:null;
   const breaks=t.breaks??[1,10,100,1000,10000],fill=value===null?'#e4e5df':statisticalColors[breaks.filter((b:number)=>value>=b).length];
   return `<path d="${f.d}" fill="${fill}" fill-rule="evenodd" stroke="#b7c3c1" stroke-width=".5" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  if(l)html+=`<image data-west-raster href="${esc(assets+l.image)}" x="0" y="0" width="${data.width}" height="${data.height}" preserveAspectRatio="none" clip-path="url(#west-target-land)" style="image-rendering:pixelated;pointer-events:none"/>`;
  if(t.vector&&t.vector!=='rivers'&&t.vector!=='settlements'){
   const vectors=t.vector==='urban'?data.urban.features:await json(t.vector+'.json');
   html+=vectors.features.map((f:any,i:number)=>{
    const fill=t.vector==='basins'?['#adc8ae','#d8c3a0','#b9c5dc','#d2b4b4','#c6cda8'][i%5]:t.vector==='groundwater'?({'1':'#90bdcf','2':'#a9c399','3':'#dfc89e'} as any)[String(f.properties.HYGEO2)[0]]??'#ddd':'none';
    return `<path d="${path(f.geometry)}" fill="${fill}" fill-opacity="${t.vector==='basins'?'.8':'1'}" fill-rule="evenodd" stroke="${t.vector==='urban'?'#c48b23':'#748676'}" stroke-width="${t.vector==='urban'?1.4:.7}" vector-effect="non-scaling-stroke"><title>${esc(f.properties.name??'元の主題')}</title></path>`;
   }).join('');
  }
  if(isWestFarmingOverview(t))html+=await farmingMarkup(t,comparisonSource,false);
  if(isSettlementTopic(t.id))html+=settlementMarkup(t.id,comparisonSource);
  if(t.id==='precipitation')html+=rainMarkers(comparisonSource,'source');
  if(['rivers','basins','groundwater','contours'].includes(t.vector??'')||t.id==='terrain'){
   const [rivers,lakes]=await Promise.all([json('rivers.json'),json('lakes.json')]);
   html+=lakes.features.map((f:any)=>`<path d="${path(f.geometry)}" fill="#9ac6d5" stroke="#629cad" stroke-width=".6" vector-effect="non-scaling-stroke"/>`).join('');
   html+=rivers.features.map((f:any)=>`<path d="${path(f.geometry)}" fill="none" stroke="#4c91b0" stroke-width="1" vector-effect="non-scaling-stroke"><title>${esc(f.properties.name)}</title></path>`).join('');
  }
  if(t.id==='climate')html+=data.cities.map((c:any)=>{
   const p=project(c.coordinates),name=c.name.replace(/（.*?）/g,''),width=Math.max(52,[...name].reduce((n:number,s:string)=>n+(s.charCodeAt(0)>255?12:7),0)+14);
   return `<g class="west-station ${comparisonSource.city===c.id?'is-selected':''}" data-marker data-marker-side="source" data-x="${p[0]}" data-y="${p[1]}"><title>${esc(c.name)}・元図の観測所</title><line x1="0" y1="0" x2="0" y2="0"/><circle r="4"/><g data-marker-label data-width="${width}"><rect width="${width}" height="44" rx="2"/><text x="${width/2}" y="27" text-anchor="middle">${esc(name)}</text></g></g>`;
  }).join('');
  return html;
 }
 async function draw(version:number){
  const t=topic(),l=isWestFarmingOverview(t)?null:layer();let vectors:any=null,rivers:any=null,lakes:any=null;
  if(t.vector==='urban')vectors=data.urban.features;
  else if(t.vector&&t.vector!=='settlements')vectors=await json(t.vector+'.json');
  if(['rivers','basins','groundwater','contours'].includes(t.vector??'')||t.id==='terrain'){
   [rivers,lakes]=await Promise.all([json('rivers.json'),json('lakes.json')]);
  }
  if(version!==renderVersion)return;
  let html='<defs><clipPath id="west-target-land">'+paths.filter(f=>f.target).map(f=>`<path d="${f.d}" clip-rule="evenodd"/>`).join('')+'</clipPath></defs>';
  html+=`<g ${comparisonSource?'clip-path="url(#west-target-half)"':''}>`;
  html+=paths.map(f=>{
   let fill='#e4e5df';
   if(f.target&&(t.field!=='industry'||westIndustryCountry(f.code))&&!l&&!isWestFarmingOverview(t)&&(t.indicator||t.faoItem)){
    const value=observation(data,t,f.code,state.year).value,breaks=t.breaks??[1,10,100,1000,10000];
    fill=value===null?'#e4e5df':statisticalColors[breaks.filter((b:number)=>value>=b).length];
   }
   return `<path d="${f.d}" fill="${fill}" fill-rule="evenodd" stroke="#b7c3c1" stroke-width=".5" vector-effect="non-scaling-stroke"/>`;
  }).join('');
  if(l)html+=`<image data-west-raster href="${esc(assets+l.image)}" x="0" y="0" width="${data.width}" height="${data.height}" preserveAspectRatio="none" clip-path="url(#west-target-land)" style="image-rendering:pixelated;pointer-events:none"/>`;
  if(vectors&&t.vector!=='rivers')html+=vectors.features.map((f:any,i:number)=>{
   let fill='none',stroke='#866953',width=.65,attrs='';
   if(t.vector==='basins'){fill=['#adc8ae','#d8c3a0','#b9c5dc','#d2b4b4','#c6cda8'][i%5];stroke=state.basin===f.properties.id?'#9d3c2e':'#748676';width=state.basin===f.properties.id?2.4:.7;attrs=`data-basin="${f.properties.id}"`;}
   if(t.vector==='groundwater'){fill=({'1':'#90bdcf','2':'#a9c399','3':'#dfc89e'} as any)[String(f.properties.HYGEO2)[0]]??'#ddd';stroke='#a0aea2';width=.3;attrs=`data-ground="${i}"`;}
   if(t.vector==='urban'){stroke='#c48b23';width=state.urban===f.properties.id?3:1.4;attrs=`data-urban="${f.properties.id}"`;}
   return `<path d="${path(f.geometry)}" fill="${fill}" fill-opacity="${t.vector==='basins'?'.8':'1'}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${width}" vector-effect="non-scaling-stroke" ${attrs}><title>${esc(f.properties.name??f.properties.elevation+' m')}</title></path>`;
  }).join('');
  if(lakes)html+=lakes.features.map((f:any)=>`<path d="${path(f.geometry)}" fill="#9ac6d5" stroke="#629cad" stroke-width=".6" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
  if(rivers)html+=rivers.features.map((f:any)=>`<path d="${path(f.geometry)}" fill="none" stroke="#4c91b0" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"><title>${esc(f.properties.name)}</title></path>`).join('');
  if(isWestFarmingOverview(t)){html+=await farmingMarkup(t,state,true);if(version!==renderVersion)return;}
  if(isSettlementTopic(t.id))html+=settlementMarkup(t.id,state,true);
  html+='</g>';
  if(comparisonSource){
   const original=await sourceMarkup();if(version!==renderVersion)return;
   html+=`<defs><clipPath id="west-source-half"><rect data-west-source-clip/></clipPath><clipPath id="west-target-half"><rect data-west-target-clip/></clipPath></defs><g clip-path="url(#west-source-half)" pointer-events="none">${original}</g><line data-west-divider stroke="#1c3947" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  }
  html+=paths.filter(f=>f.target).map(f=>`<path class="west-country-line ${state.country===f.code?'is-selected':''}" ${t.field==='industry'&&!westIndustryCountry(f.code)?'style="pointer-events:none"':`data-country="${f.code}"`} d="${f.d}" fill-rule="evenodd" ${(isWestFarmingOverview(t)||['basins','groundwater','urban','settlements'].includes(t.vector??''))?'style="pointer-events:stroke"':''}></path>`).join('');
  if(t.id!=='climate')html+=data.countries.filter((c:any)=>c.code===state.country||['TUR','IRN','SAU','EGY','IRQ','YEM','OMN'].includes(c.code)).map((c:any)=>{const p=project(c.center);return `<text class="west-map-label" x="${p[0]}" y="${p[1]}" text-anchor="middle">${esc(c.name)}</text>`;}).join('');
  if(t.id==='climate'){
   const grid=await getGrid(l);if(version!==renderVersion)return;
   for(let lat=16;lat<=42;lat+=5)for(let lng=27;lng<=62;lng+=5){
    const index=gridIndex(lng,lat,l),value=index<0?l.noData:grid[index],c=data.classes.find((c:any)=>c.id===value);
    if(c){const p=project([lng,lat]);html+=`<text class="west-map-label west-climate-code" x="${p[0]}" y="${p[1]}" text-anchor="middle" ${comparisonSource?'clip-path="url(#west-target-half)"':''} aria-hidden="true">${esc(c.code)}</text>`;}
   }
  }
  if(t.id==='precipitation')html+=`<g ${comparisonSource?'clip-path="url(#west-target-half)"':''}>${rainMarkers(state,'target')}</g>`;
  const points=t.id==='climate'?data.cities:t.id==='cities'?data.urban.cities:[];
  html+=`<g ${comparisonSource?'clip-path="url(#west-target-half)"':''}>`+points.map((c:any)=>{
   const p=project(c.coordinates),selected=state.city===c.id||state.urban===c.id,name=c.name.replace(/（.*?）/g,''),width=Math.max(52,[...name].reduce((n:number,s:string)=>n+(s.charCodeAt(0)>255?12:7),0)+14);
   return `<g class="west-station ${selected?'is-selected':''}" data-marker data-marker-side="target" data-x="${p[0]}" data-y="${p[1]}" data-${t.id==='climate'?'city':'urban'}="${c.id}" role="button" tabindex="0" aria-label="${esc(c.name)}を選択" aria-pressed="${selected}"><title>${esc(c.name)}</title><line x1="0" y1="0" x2="0" y2="0"/><circle r="4"/><g data-marker-label data-width="${width}"><rect width="${width}" height="44" rx="2"/><text x="${width/2}" y="27" text-anchor="middle">${esc(name)}</text></g></g>`;
  }).join('')+'</g>';
  scene.innerHTML=html;applyView();
  scene.querySelectorAll<SVGImageElement>('[data-west-raster]').forEach(raster=>raster.addEventListener('error',()=>{if(version===renderVersion)fail('分布画像を読み込めませんでした。国の選択と統計は利用できます。');}));
  if(t.vector==='basins'){
   basinSelect.innerHTML='<option value="">流域を選択</option>'+vectors.features.filter((f:any)=>!state.country||f.properties.countries?.includes(state.country)).map((f:any)=>`<option value="${f.properties.id}">${esc(f.properties.name)}</option>`).join('');basinSelect.value=state.basin;
  }
  loading.hidden=true;retry.hidden=true;
 }
 async function render(){
  const version=++renderVersion;++pointVersion;const restoreMapFocus=svg.contains(document.activeElement);
  unavailable=categoryLabels[state.category]??'';
  const t=topic();
  if(field==='industry'&&state.country&&!westIndustryCountry(state.country)){state.country='';commit(true);}
  for(const option of countrySelect.options){const outside=field==='industry'&&!!option.value&&!westIndustryCountry(option.value);option.hidden=outside;option.disabled=outside;}
  countrySelect.value=state.country;yearSelect.value=String(state.year);root.dataset.topic=t.id;
  const source=sourceTopic(),swipe=$('[data-west-swipe]');swipe.hidden=!source;root.dataset.comparing=String(!!source);
  if(t.id!==westAnnualPrecipitationId&&source?.id!==westAnnualPrecipitationId)grids.delete(westAnnualPrecipitationId);
  root.dataset.ready='false';
  if(t.id===westAnnualPrecipitationId||source?.id===westAnnualPrecipitationId)try{await loadAnnualPrecipitation();if(version!==renderVersion)return;}catch{if(version===renderVersion){scene.replaceChildren();legendBox.replaceChildren();details();links();fail('年降水量の資料を確認できませんでした。「資料を再読み込みする」で再試行できます。観測所の降水量や他の主題も選べます。');}return;}
  if(isSettlementTopic(t.id)||source&&isSettlementTopic(source.id))try{await Promise.all([loadSettlements(t.id),...(source?[loadSettlements(source.id)]:[])]);}catch{if(version===renderVersion){scene.replaceChildren();legendBox.replaceChildren();$('[data-west-detail]').textContent='掲載居住域を読み込めませんでした。未掲載と0人は同じ意味ではありません。';fail('掲載居住域を読み込めませんでした。資料を再読み込みして再試行できます。');}return;}
  if(version!==renderVersion)return;
  const subject=settlementSubject(settlementManifest,t.id);
  if(isSettlementTopic(t.id)&&state.group&&!subject.categories.some((c:any)=>c.id===state.group)){state.group='';commit(true);}
  const settlementLabel=root.querySelector<HTMLElement>('[data-west-settlement-label]');if(settlementLabel)settlementLabel.hidden=!isSettlementTopic(t.id);
  if(settlementSelect){settlementSelect.innerHTML='<option value="">掲載域全体</option>'+(subject?.categories??[]).map((c:any)=>`<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');settlementSelect.value=state.group??'';}
  if(source){$('[data-west-source-name]').textContent='左｜'+source.label;$('[data-west-target-name]').textContent='右｜'+t.label;}
  if(field==='natural')root.dataset.natureMode=t.group==='水資源'?'water':t.id==='terrain'?'landform':t.id==='contours'?'contour':'climate';
  $('[data-west-scope]').textContent=country()?.name??(field==='industry'?'地域供給網／国別産業3か国':'20か国・地域');
  yearLabel.hidden=!(t.indicator||t.faoItem);
  $('[data-west-city-label]').hidden=!['climate','precipitation'].includes(t.id);$('[data-west-urban-label]').hidden=t.id!=='cities';$('[data-west-basin-label]').hidden=t.id!=='basins';
  const fillOptions=(select:HTMLSelectElement,items:any[],value:string)=>{
   select.innerHTML='<option value="">'+(select===citySelect?'観測所を選択':'都市を選択')+'</option>'+items.filter(c=>!state.country||c.countryCode===state.country).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');select.value=value;
  };
  fillOptions(citySelect,data.cities,state.city);fillOptions(urbanSelect,data.urban.cities,state.urban);
  root.querySelectorAll<HTMLButtonElement>('[data-west-group]').forEach(b=>{const selected=b.dataset.westGroup===t.group;b.setAttribute('aria-selected',String(selected));b.setAttribute('aria-pressed',String(selected));b.tabIndex=selected?0:-1;});
  root.querySelectorAll<HTMLButtonElement>('[data-west-standard-group]').forEach(b=>{const selected=b.dataset.westStandardGroup===(unavailable==='降水量'||openWaterGroup?'水資源':unavailable||standardGroup(t));b.setAttribute('aria-selected',String(selected));b.setAttribute('aria-pressed',String(selected));b.tabIndex=selected?0:-1;});
  root.querySelectorAll<HTMLButtonElement>('[data-west-unavailable]').forEach(b=>{const selected=b.dataset.westUnavailable===unavailable;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
  root.querySelectorAll<HTMLElement>('[data-west-item-group]').forEach(el=>{const forestry=standardGroup(t)==='林業';el.hidden=forestry&&el.dataset.westItemGroup!=='土地・森林';el.querySelectorAll<HTMLButtonElement>('[data-west-topic-button]').forEach(button=>button.hidden=forestry?button.dataset.westTopicButton!=='forest':button.dataset.westTopicButton==='forest');if(el.dataset.westItemGroup==='土地・森林')el.querySelector('strong')!.textContent=forestry?'森林':'土地利用';});
  const waterItems=root.querySelector<HTMLElement>('[data-west-water-items]');if(waterItems)waterItems.hidden=t.group!=='水資源'||['basins','precipitation',westAnnualPrecipitationId].includes(t.id)||!!unavailable;
  const status=root.querySelector<HTMLElement>('[data-west-control-status]');if(status)status.textContent=unavailable?unavailable+'は未整備です。':t.label+'を表示しています。';
  root.querySelectorAll<HTMLButtonElement>('[data-west-topic-button]').forEach(b=>{const selected=!unavailable&&(b.dataset.westTopicButton===t.id||(!!b.closest('.west-agri-picker')&&t.id.startsWith(b.dataset.westTopicButton+'-'))||(!!b.closest('[data-west-subgroup="水資源"]')&&b.dataset.westTopicButton==='rivers'&&['groundwater','desalination'].includes(t.id)));if(b.getAttribute('role')==='tab'){b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}else b.setAttribute('aria-pressed',String(selected));});
  root.querySelectorAll<HTMLElement>('[data-west-subgroup]').forEach(el=>el.hidden=el.dataset.westSubgroup!==(state.category==='precipitation'||openWaterGroup?'水資源':t.group));
  root.querySelectorAll<HTMLElement>('[data-west-cultivation]').forEach(el=>el.hidden=!(t.id===el.dataset.westCultivation||t.id.startsWith(el.dataset.westCultivation+'-')));
  const overview=root.querySelector<HTMLElement>('[data-west-climate-overview]');if(overview)overview.hidden=t.id!=='climate';
  statControls.hidden=!(t.indicator||t.faoItem);
  $('[data-west-caption]').textContent=unavailable?unavailable+'：未整備（参考図 '+t.label+'）':source?'左右で比較':t.id==='climate'?'ケッペン＝ガイガー区分':t.label;
  $('[data-west-guide]').textContent=t.id==='climate'?'都市名をタップすると、雨温図と気候の解説を表示します。':t.id==='cities'?'都市名をタップすると、人口と範囲の説明を表示します。':'地図の国・対象を選ぶと、解説と統計を表示します。';
  $('[data-west-point]').hidden=!state.point&&!state.basin&&!state.yearNotice;
  $('#west-map-title').textContent=t.label;details();legend();links();comparisonLayout();loading.hidden=false;loading.textContent='地図資料を読み込んでいます。';
  if(!state.point)$('[data-west-point]').textContent=state.yearNotice??(country()?country().name+'を選択しています。'+(layer()?'地図の場所を選ぶと、収録されている格子の値を確認できます。':'一覧や地図から、別の対象へ切り替えられます。'):'国・都市の一覧、または地図の場所を選択してください。');
  state.yearNotice=null;
  if(t.id==='climate'&&state.point){const city=data.cities.find((c:any)=>c.id===state.city);if(city)void cityClassification(city,version);}
  try{await draw(version);if(version!==renderVersion)return;root.dataset.ready='true';if(restoreMapFocus)svg.focus({preventScroll:true});const city=data.cities.find((c:any)=>c.id===state.city);if(t.id==='climate'&&city&&!state.point)void readPoint(city.coordinates,city.name);else if(state.point){const selected=pointSide==='source'&&source?source:t;if(layer(selected))void readPoint(state.point,'選択地点',selected);}if(t.id==='basins'&&state.basin){const basins=await json('basins.json');const f=basins.features.find((f:any)=>f.properties.id===state.basin);if(f&&version===renderVersion)$('[data-west-point]').textContent=f.properties.name+'の全体を表示しています。地域の外に続く上流も含みます。';}}catch{if(version===renderVersion)fail('この地図の資料を読み込めませんでした。国別統計と分野の切替は利用できます。');}
 }
 async function start(explicitCity?:boolean){
  try{
   [data,geography]=await Promise.all([json('data.json'),json('geography.json')]);
   paths=geography.features.map((f:any)=>({...f.properties,d:path(f.geometry)}));
   state=readWestState(location.search,field,data);openWaterGroup=false;restoreComparison(location.search);if(!new URLSearchParams(location.search).has('year'))availableYear(topic());
   if(explicitCity!==undefined)cityExplicit=explicitCity;
   // An omitted map parameter means the regional extent, including across fields.
   // Only an explicit country-picker action changes the viewport to that country.
   const url=new URL(location.href),lng=Number(url.searchParams.get('lng')),lat=Number(url.searchParams.get('lat'));
   if(url.searchParams.has('lng')&&url.searchParams.has('lat')&&lng>=23&&lng<=64&&lat>=10&&lat<=45)state.view=fit([lng-3,lat-2,lng+3,lat+2]);
   commit(true);await render();
  }catch{fail('資料を読み込めませんでした。下の基本人口表と出典は利用できます。再読み込みで再試行してください。');}
 }
 countrySelect.addEventListener('change',()=>data&&changeCountry(countrySelect.value));
 citySelect.addEventListener('change',()=>data&&selectCity(citySelect.value));
 urbanSelect.addEventListener('change',()=>data&&selectUrban(urbanSelect.value));
 settlementSelect?.addEventListener('change',()=>data&&selectSettlement(settlementSelect.value));
 basinSelect.addEventListener('change',()=>{if(data)void selectBasin(basinSelect.value).catch(()=>fail('流域を読み込めませんでした。'));});
 yearSelect.addEventListener('change',()=>{if(data){state.year=Number(yearSelect.value);commit();void render();}});
 $<HTMLInputElement>('[data-west-split]').addEventListener('input',event=>{split=Number((event.target as HTMLInputElement).value);applyView();});
 retry.addEventListener('click',()=>{cache.clear();grids.clear();settlementCollections.clear();settlementManifest=null;void start(cityExplicit);});
 function zoom(factor:number){state.view=zoomWestView(view(),factor);applyView();commit();}
 root.addEventListener('click',event=>{
  if(!data)return;const target=event.target as Element;
  if(target.closest('[data-west-reading-overview]')){readingOverview=true;details();legend();links();comparisonLayout();return;}
  if(target.closest('[data-west-resume-topic]')){state.category='';readingOverview=false;commit();render();return;}
  const missing=target.closest<HTMLElement>('[data-west-unavailable]');if(missing){state.category='precipitation';openWaterGroup=false;readingOverview=false;commit();render();return;}
  const standard=target.closest<HTMLElement>('[data-west-standard-group]');if(standard){const group=standard.dataset.westStandardGroup!;if(['人種・民族','宗教'].includes(group)){readingOverview=false;changeTopic(group==='宗教'?'religion':'ethnicity');return;}if(field==='natural'&&group==='水資源'&&comparisonSource&&!westReading(sourceTopic()!).comparisons.some((c:any)=>c.topic==='rivers')){openWaterGroup=true;readingOverview=false;render();return;}const id=field==='agriculture'?(group==='林業'?'forest':'farming-overview'):field==='industry'?'manufacturing':field==='population'?'density':westTopics.find(t=>t.field===field&&t.group===group)!.id;unavailable='';readingOverview=false;changeTopic(id);return;}
  const settlementButton=target.closest<HTMLElement>('[data-west-settlement-button]');if(settlementButton){selectSettlement(settlementButton.dataset.westSettlementButton!);return;}
  if(target.closest('[data-west-topic-button],[data-west-country-button]')){readingOverview=false;}
  const group=target.closest<HTMLElement>('[data-west-group]');if(group){const t=westTopics.find(t=>t.field===field&&t.group===group.dataset.westGroup)!;changeTopic(t.id);}
  const topicButton=target.closest<HTMLElement>('[data-west-topic-button]');if(topicButton)changeTopic(topicButton.dataset.westTopicButton!);
  const c=target.closest<HTMLElement>('[data-west-country-button]');if(c)changeCountry(c.dataset.westCountryButton!);
  const z=target.closest<HTMLElement>('[data-west-zoom]');if(z)zoom(Number(z.dataset.westZoom));
  if(target.closest('[data-west-reset]')){state.view=null;commit();applyView();}
 });
 root.addEventListener('keydown',event=>{
  const target=event.target as HTMLElement;if(target.getAttribute('role')!=='tab'||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...target.parentElement!.querySelectorAll<HTMLButtonElement>('[role=tab]')];const index=tabs.indexOf(target as HTMLButtonElement);
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  event.preventDefault();tabs[next].focus();tabs[next].click();
 });
 let down:{x:number,y:number,view:number[],point:DOMPoint,target:Element}|null=null,moved=false;
 const svgPoint=(e:PointerEvent)=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
 svg.addEventListener('pointerdown',e=>{if(!data||e.button!==0)return;const p=svgPoint(e);down={x:e.clientX,y:e.clientY,point:p,view:[...view()],target:e.target as Element};moved=false;svg.setPointerCapture(e.pointerId);});
 svg.addEventListener('pointermove',e=>{
  if(!down)return;
  if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)moved=true;
  if(moved){const p=svgPoint(e);state.view=panWestView(view(),down.point.x-p.x,down.point.y-p.y);applyView();}
 });
 svg.addEventListener('pointerup',e=>{
  if(!down)return;const saved=down;down=null;svg.releasePointerCapture(e.pointerId);
  if(moved){commit();return;}
  const target=saved.target;
  const p=svgPoint(e),onSource=!!comparisonSource&&p.x<view()[0]+view()[2]*split/100;
  const city=target.closest<SVGElement>('[data-city]');if(city&&!onSource){selectCity(city.dataset.city!);return;}
  const farm=target.closest<SVGElement>('[data-west-farm]');if(farm&&!onSource){readingOverview=false;changeTopic(farm.dataset.westFarm!);return;}
  const settlement=target.closest<SVGElement>('[data-settlement]');if(settlement&&!onSource){selectSettlement(settlement.dataset.settlement!);return;}
  const urban=target.closest<SVGElement>('[data-urban]');if(urban&&!onSource){selectUrban(urban.dataset.urban!);return;}
  const basin=target.closest<SVGElement>('[data-basin]');if(basin&&!onSource){void selectBasin(basin.dataset.basin!).catch(()=>fail('流域を読み込めませんでした。'));return;}
  const ground=target.closest<SVGElement>('[data-ground]');if(ground&&!onSource){void json('groundwater.json').then(g=>{const p=g.features[Number(ground.dataset.ground)].properties;const category=({'1':'広い地下水盆','2':'複雑な地質構造','3':'局所的・浅い帯水層'} as any)[String(p.HYGEO2)[0]]??'原資料の区分';const ranges:Record<number,string>={11:'2未満',12:'2〜20',13:'20〜100',14:'100〜300',15:'300超',22:'20未満',23:'20〜100',24:'100〜300',25:'300超',33:'100未満',34:'100超'};$('[data-west-point]').hidden=false;$('[data-west-point]').textContent='帯水層の種類：'+category+'。涵養区分：'+(ranges[Number(p.HYGEO2)]??'区分値なし')+' mm／年。地下水の残存量・取水量ではありません。';});return;}
  const c=target.closest<SVGElement>('[data-country]');if(c){state.country=c.dataset.country;if(data.cities.find((x:any)=>x.id===state.city)?.countryCode!==state.country)state.city='';if(data.urban.cities.find((x:any)=>x.id===state.urban)?.countryCode!==state.country)state.urban='';}
  pointSide=onSource?'source':'target';state.point=unproject([p.x,p.y]);commit();void render();
 });
 svg.addEventListener('pointercancel',()=>{if(down&&moved)commit();down=null;});
 svg.addEventListener('keydown',e=>{
  if(!data)return;const target=e.target as Element;
  if(['Enter',' '].includes(e.key)){
   const farm=target.closest<SVGElement>('[data-west-farm]');if(farm){e.preventDefault();readingOverview=false;changeTopic(farm.dataset.westFarm!);return;}
   const group=target.closest<SVGElement>('[data-settlement]');if(group){e.preventDefault();selectSettlement(group.dataset.settlement!);return;}
   const c=target.closest<SVGElement>('[data-city]'),u=target.closest<SVGElement>('[data-urban]');
   if(c||u){e.preventDefault();if(c)selectCity(c.dataset.city!);else selectUrban(u!.dataset.urban!);return;}
  }
  if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){
   e.preventDefault();if(['+','='].includes(e.key)){zoom(.65);return;}if(e.key==='-'){zoom(1.54);return;}
   const b=[...view()];if(e.key==='Home')state.view=null;
   else{state.view=panWestView(b,e.key==='ArrowLeft'?-b[2]*.18:e.key==='ArrowRight'?b[2]*.18:0,e.key==='ArrowUp'?-b[3]*.18:e.key==='ArrowDown'?b[3]*.18:0);}
   applyView();commit();
  }
 });
 window.addEventListener('popstate',()=>{if(data){state=readWestState(location.search,field,data);openWaterGroup=false;restoreComparison(location.search);const p=new URLSearchParams(location.search);readingOverview=!p.has('topic')&&!p.has('country')&&!p.has('city')&&!p.has('category');if(p.has('lng')&&p.has('lat')){const lng=Number(p.get('lng')),lat=Number(p.get('lat'));if(Number.isFinite(lng)&&Number.isFinite(lat)&&lng>=23&&lng<=64&&lat>=10&&lat<=45)state.view=fit([lng-3,lat-2,lng+3,lat+2]);}void render();}});
 new ResizeObserver(()=>{if(data&&state)applyView();}).observe(svg);
 new ResizeObserver(()=>{if(data&&state){sizeComparisonMap();syncReadingHeight();}}).observe($('.atlas-primary-grid'));
 window.addEventListener('resize',()=>{if(data&&state){sizeComparisonMap();syncReadingHeight();}});
 desktopComparison.addEventListener('change',()=>{if(data&&state){legend();comparisonLayout();}});
 await start();
}
