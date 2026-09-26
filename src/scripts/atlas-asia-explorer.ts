import { readAsiaAtlasState, writeAsiaAtlasState, startAsiaComparison, restoreAsiaComparison, gridCellAt, type AsiaState, type AsiaCamera, type AsiaField, type AsiaStateContext } from '../lib/atlas-asia-state';
import { getAsiaRiceLayer, asiaRiceLegend, asiaRiceReading, asiaRiceRegionNotes, asiaRiceSources, readAsiaRiceCell, type AsiaRiceGrid } from '../data/atlas/asia-agriculture';
import type { AsiaClimateCity } from '../data/atlas/asia-climate-cities';
import type { AsiaClimateClass } from '../data/atlas/asia-climate-definitions';
import { decodeAsiaClimateGrid } from '../lib/atlas-asia-climate-grid';
import { decodeAsiaNumericGrid, readAsiaNumericCell, type AsiaNumericGrid } from '../lib/atlas-asia-numeric-grid';
import { asiaPhysicalReading, asiaNaturalTopics, type AsiaPhysicalFocus } from '../data/atlas/asia-physical-reading';
import {asiaPopulationTopics,asiaPopulationReading,asiaUrbanReading,type AsiaPopulationRegion,type AsiaPopulationRaster} from '../data/atlas/asia-population';
import {renderAsiaFarmingPanel} from './atlas-asia-farming-panel';
import type {AsiaFarmingRegion,AsiaFarmingLayer,AsiaFarmStatistics} from '../data/atlas/asia-farming';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

const root=document.querySelector<HTMLElement>('[data-asia-atlas]');
if(root) start(root);

function start(root:HTMLElement) {
  const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const $$=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
  const config=JSON.parse($('[data-asia-config]').textContent!) as {
    regionId:'east-asia'|'southeast-asia'|'south-central-asia';label:string;bounds:number[];
    countries:{code:string;name:string;bounds:number[]}[];cities:AsiaClimateCity[];classes:AsiaClimateClass[];
    geographyUrl:string;climateBase:string;agricultureBase:string;climate:any;
    physicalBase?:string;physical?:any;physicalFocus?:AsiaPhysicalFocus[];
    populationBase?:string;population?:AsiaPopulationRegion;
    farmingBase?:string;farming?:AsiaFarmingRegion;
  };
  const context:AsiaStateContext={countries:config.countries.map(c=>c.code),cities:config.cities,bounds:config.bounds,fields:['natural','agriculture'],topics:{natural:asiaNaturalTopics.map(t=>t.id)},details:{natural:[...(config.physicalFocus??[]).map(f=>f.id),...(config.physical?.waterFeatures??[]).map((f:any)=>f.id)]}};
  if(config.population){context.fields=[...context.fields,'population'];context.topics!.population=asiaPopulationTopics.map(t=>t.id);context.details!.population=config.population.cities.map(c=>c.id);}
  if(config.farming)context.topics!.agriculture=['rice',...config.farming.layers.map(t=>t.id)];
  const countrySelect=$<HTMLSelectElement>('[data-country-select]'),citySelect=$<HTMLSelectElement>('[data-city-select]');
  const overviewTitle=$('[data-reading-title]').textContent!,overviewSummary=$('[data-reading-summary]').textContent!;
  function readState():AsiaState {
    const restored=readAsiaAtlasState(new URL(location.href),context);
    if(restored.field==='population'){
      const urban=config.population?.cities.find(c=>c.id===restored.detail&&(!restored.place||c.country===restored.place));
      return {...restored,detail:urban?.id??null,place:urban?.country??restored.place,point:restored.point??config.cities.find(c=>c.id===restored.city)?.coordinates??null,city:null};
    }
    if(restored.field!=='natural')return restored;
    if(!restored.topic||restored.topic==='climate')return {...restored,detail:null};
    const focus=config.physicalFocus?.find(f=>f.id===restored.detail),water=config.physical?.waterFeatures.find((f:any)=>f.id===restored.detail);
    const detailAllowed=focus?restored.topic==='terrain'&&(!restored.place||restored.place===focus.country):water?restored.topic==='water'&&(!restored.place||water.countries.includes(restored.place)):false;
    if(focus&&detailAllowed)return {...restored,place:focus.country,point:focus.coordinates,city:null};
    const city=config.cities.find(c=>c.id===restored.city);
    return {...restored,detail:detailAllowed?restored.detail:null,point:restored.point??city?.coordinates??null,city:null};
  }
  let state:AsiaState=readState();
  let map:import('maplibre-gl').Map|null=null;
  let mapReady=false,starting=false,suppressCamera=false,sourceFailed=false,attempt=0,moveTimer:ReturnType<typeof setTimeout>|undefined;
  const climateManifest={regions:{[config.regionId]:config.climate}};
  let climateGrid:any=null,riceGrid:AsiaRiceGrid|null=null;
  let gridPromise:Promise<any>|null=null,ricePromise:Promise<AsiaRiceGrid>|null=null;
  let physicalGrid:AsiaNumericGrid|null=null,physicalPromise:Promise<AsiaNumericGrid>|null=null,waterPromise:Promise<any>|null=null,fieldRevision=0;
  const populationGrids=new Map<string,AsiaNumericGrid>(),populationPromises=new Map<string,Promise<AsiaNumericGrid>>();
  let urbanPromise:Promise<any>|null=null,populationGeographyPromise:Promise<any>|null=null;
  const urbanCity=()=>state.field==='population'?config.population?.cities.find(c=>c.id===state.detail):undefined;
  const populationRaster=():AsiaPopulationRaster|undefined=>{const detail=urbanCity()?.detail,point=state.point,b=detail?.bounds4326;return detail&&(!point||b&&point[0]>=b[0]&&point[0]<=b[2]&&point[1]>=b[1]&&point[1]<=b[3])?detail:config.population;};
  const farmingTopic=()=>state.field==='agriculture'?(state.topic??'rice'):null;
  const farmingLayer=()=>config.farming?.layers.find(t=>t.id===farmingTopic());
  const farmingGrids=new Map<string,AsiaNumericGrid>(),farmingPromises=new Map<string,Promise<AsiaNumericGrid>>();
  let farmingStatistics:AsiaFarmStatistics|null=null,farmingStatisticsPromise:Promise<AsiaFarmStatistics>|null=null,farmingStatisticsError=false;
  const naturalTopic=()=>state.field==='natural'?(state.topic??'climate'):null;
  const isPhysical=()=>naturalTopic()==='terrain'||naturalTopic()==='water';
  const optionalHidden=(selector:string,hidden:boolean)=>{const el=$(selector);if(el)el.hidden=hidden;};
  let selectedClass:number|null=null,selectedPoint:[number,number]|null=state.point??null;
  const markers:{city:AsiaClimateCity;button:HTMLButtonElement;marker:import('maplibre-gl').Marker}[]=[];
  let pointMarker:import('maplibre-gl').Marker|null=null,pointLabel:HTMLElement|null=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const riceLayer=getAsiaRiceLayer(config.regionId)!;
  const riceNote=asiaRiceRegionNotes[config.regionId];

  async function fetchAsset<T>(url:string,read:(response:Response)=>Promise<T>):Promise<T> {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try {const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`${response.status}: ${url}`);return await read(response);}
    finally{clearTimeout(timer);}
  }
  const fetchJson=(url:string)=>fetchAsset(url,response=>response.json());
  const asset=(base:string,name:string)=>base+name.split('/').at(-1);
  function status(message:string,error=false) {
    const el=$('[data-map-state]');el.textContent=message;el.hidden=!message;
    $('[data-map-retry]').hidden=!error;
  }
  function syncFieldLinks() {
    $$<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(a=>{if(a.dataset.field===state.field)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');a.href=writeAsiaAtlasState(new URL(a.href),{...state,field:a.dataset.field as AsiaField,topic:a.dataset.field===state.field?state.topic:null,detail:a.dataset.field===state.field?state.detail:null,back:null}).href;});
  }
  function persist(push:boolean) {
    syncFieldLinks();
    const url=writeAsiaAtlasState(new URL(location.href),state);
    if(url.href===location.href)return;
    history[push?'pushState':'replaceState']({},'',url);
  }
  function navigate(next:AsiaState,fit=true) {
    if(next.field==='population')next={...next,point:next.point??config.cities.find(c=>c.id===next.city)?.coordinates??null,city:null};
    state=next;selectedClass=null;selectedPoint=state.point??null;persist(true);render();const reading=$('.asia-reading-scroll');if(reading)reading.scrollTop=0;if(fit)fitSelection();
  }
  function camera():AsiaCamera|null {if(!mapReady||!map)return state.camera;const c=map.getCenter();return{lng:c.lng,lat:c.lat,zoom:map.getZoom()};}
  function fitSelection() {
    if(!mapReady||!map)return;
    suppressCamera=true;clearTimeout(moveTimer);
    if(state.camera)map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});
    else if(urbanCity()){const city=urbanCity()!,b=city.detail?.bounds4326??city.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:25,maxZoom:9,duration:0});}
    else if(state.detail&&isPhysical()){const focus=config.physicalFocus?.find(f=>f.id===state.detail),water=config.physical?.waterFeatures.find((f:any)=>f.id===state.detail);if(focus)map.jumpTo({center:focus.coordinates,zoom:5});else if(water){const b=water.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:35,maxZoom:7,duration:0});}}
    else if(state.city){const c=config.cities.find(c=>c.id===state.city)!;map.jumpTo({center:c.coordinates,zoom:5});}
    else {const b=config.countries.find(c=>c.code===state.place)?.bounds??config.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:state.place?45:20,maxZoom:state.place?6.5:4.5,duration:0});}
    requestAnimationFrame(()=>{suppressCamera=false;});
  }
  function selectCountry(code:string|null) {navigate({...state,place:code,city:null,camera:null,back:null,point:null,detail:null});}
  function selectCity(id:string) {const city=config.cities.find(c=>c.id===id);if(!city)return;navigate({...state,field:'natural',topic:null,detail:null,place:city.countryCode,city:id,camera:null,back:null,point:null});}
  function selectNaturalTopic(topic:string) {navigate({...state,field:'natural',topic:topic==='climate'?null:topic,detail:null,city:topic==='climate'?state.city:null,point:state.point??config.cities.find(c=>c.id===state.city)?.coordinates??null,camera:camera()},false);}
  function clearDetail() {navigate({...state,detail:null,point:null,city:null,camera:camera()},false);}
  function selectUrban(id:string){if(!id){clearDetail();return;}const city=config.population?.cities.find(c=>c.id===id);if(city)navigate({...state,field:'population',topic:'urban',detail:id,place:city.country,city:null,point:null,camera:null});}
  function selectWater(id:string) {if(!id){clearDetail();return;}const water=config.physical?.waterFeatures.find((f:any)=>f.id===id);if(!water)return;navigate({...state,field:'natural',topic:'water',detail:id,city:null,point:null,camera:null,place:state.place&&water.countries.includes(state.place)?state.place:water.countries.length===1?water.countries[0]:null});}

  function render() {
    const city=config.cities.find(c=>c.id===state.city),country=config.countries.find(c=>c.code===state.place);
    countrySelect.value=state.place??'';
    citySelect.value=state.city??'';
    for(const option of citySelect.options){const allowed=!state.place||!option.value||option.dataset.country===state.place;option.hidden=!allowed;option.disabled=!allowed;}
    $$<HTMLButtonElement>('[data-country-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.countryButton===state.place)));
    $$('[data-map-country]').forEach(p=>p.classList.toggle('is-selected',(p as SVGPathElement).dataset.mapCountry===state.place));
    syncFieldLinks();
    const explorer=$<HTMLElement>('[data-asia-explorer]');
    if(explorer)explorer.dataset.field=state.field;
    const fieldPanel=$<HTMLElement>('[data-field-national]');if(fieldPanel)fieldPanel.dataset.fieldNational=state.field;
    const placeLabel=$('[data-current-place]');if(placeLabel)placeLabel.textContent=country?.name??`${config.label}全体`;
    const climate=naturalTopic()==='climate';
    const cityPicker=$<HTMLElement>('[data-city-picker]');if(cityPicker)cityPicker.hidden=!climate;
    $$<HTMLElement>('[data-city-panel]').forEach(el=>el.hidden=!climate||el.dataset.cityPanel!==state.city);
    $('[data-overview]').hidden=!climate||Boolean(city);
    $('[data-rice-reading]').hidden=farmingTopic()!=='rice';
    $('[data-climate-legend]').hidden=!climate;
    $('[data-agriculture-legend]').hidden=farmingTopic()!=='rice';
    $('[data-map-title]').textContent=state.field==='natural'?'気候区分と都市':'米の収穫面積';
    $('[data-map-eyebrow]').textContent=state.field==='natural'?'Climate · 1991–2020':'Agriculture · 2020';
    $('[data-map-period]').textContent=state.field==='natural'?'ケッペン＝ガイガー':'モデルによる推計';
    $('[data-reading-title]').textContent=country?`${country.name}の気候を読む`:overviewTitle;
    $('[data-reading-summary]').textContent=country?`${country.name}の範囲に地図を合わせています。気候区分の広がりと、観測地点ごとの季節の変化を比べてください。`:overviewSummary;
    $('[data-reading-questions]').hidden=Boolean(country);
    const available=config.cities.filter(c=>!state.place||c.countryCode===state.place);
    const next=$('.asia-next>p');next.textContent=available.length?'都市を選ぶと、雨温図と月別の数値を読めます。':'この国・地域の都市平年値は掲載資料を確認中です。地図の気候区分はクリックして読めます。';
    const list=$('.asia-city-links');list.replaceChildren();
    for(const c of available.slice(0,6)){const button=document.createElement('button');button.type='button';button.textContent=c.name;button.addEventListener('click',()=>selectCity(c.id));list.append(button);}
    $('[data-comparison-return]').hidden=!state.back;
    optionalHidden('[data-natural-topics]',state.field!=='natural');
    const topicSelect=$<HTMLSelectElement>('[data-natural-topic]');if(topicSelect)topicSelect.value=naturalTopic()??'climate';
    renderPhysical();
    renderPopulation();
    renderFarming();
    renderClass();
    renderGridReading();
    for(const item of markers){item.button.hidden=!climate;item.button.setAttribute('aria-pressed',String(item.city.id===state.city));item.button.style.opacity=!state.place||item.city.countryCode===state.place?'1':'.45';}
    if(pointLabel){pointLabel.hidden=!selectedPoint;if(selectedPoint){pointMarker?.setLngLat(selectedPoint);pointLabel.textContent=config.physicalFocus?.find(f=>f.id===state.detail)?.name??'選択地点';}}
    if(mapReady&&map){map.setFilter('asia-country-selected',['==',['get','code'],state.place??'']);void showField();}
  }
  function renderClass() {
    const classification=config.classes.find(c=>c.id===selectedClass);
    $('[data-class-reading]').hidden=naturalTopic()!=='climate'||!classification;
    $$('[data-climate-class]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.climateClass)===selectedClass)));
    if(!classification)return;
    $('[data-class-code]').textContent=classification.code;$('[data-class-name]').textContent=classification.name;$('[data-class-description]').textContent=classification.description;
  }
  function renderGridReading() {
    const farm=farmingLayer();
    if(farm){
      const point=selectedPoint??config.cities.find(c=>c.id===state.city)?.coordinates,grid=farm.grid?farmingGrids.get(farm.grid):null;
      let message=farm.kind==='forest'?'森林は提供元の参考画像です。地点の数値は計算せず、国別の面積・木材生産量を下の統計で表示します。':'地図上の地点を選ぶと、表示している格子の推計値を表示します。';
      if(point&&farm.grid){const value=grid?readAsiaNumericCell(grid,...point):null;message=!grid?'選択地点の数値を読み込んでいます。':value===null?'この地点はデータなし、または表示範囲外です。推計0とは異なります。':`${point[1].toFixed(3)}°, ${point[0].toFixed(3)}° · ${farm.title} ${value.toLocaleString('ja-JP',{maximumFractionDigits:2})} ${farm.unit}（2020年の推計）${value===0?'。元資料の推計値は0です。':''}`;}
      $('[data-grid-reading]').textContent=message;const el=$('[data-farming-value]');if(el)el.textContent=message;return;
    }
    if(state.field==='population'&&config.population){
      const record=populationRaster()!,grid=populationGrids.get(record.grid);
      let message='地図上の地点を選ぶと、格子面積当たりの推計人口を表示します。';
      if(selectedPoint){
        const value=grid?readAsiaNumericCell(grid,...selectedPoint):null;
        message=!grid?'選択地点の推計人口を読み込んでいます。':value===null?'この地点は読み込んだ人口図の範囲外か、データがない地点です。推計0人とは異なります。':`${selectedPoint[1].toFixed(3)}°, ${selectedPoint[0].toFixed(3)}° · ${value.toLocaleString('ja-JP',{maximumFractionDigits:1})} 人/km²（2020年の推計、${record.sourceCellKm}km格子）${value===0?'。元資料で人口が0の格子です。海の格子も含むため、陸上の無人地域とは限りません。':''}`;
      }
      $('[data-grid-reading]').textContent=message;const el=$('[data-population-value]');if(el)el.textContent=message;return;
    }
    if(isPhysical()){
      const value=selectedPoint&&physicalGrid?readAsiaNumericCell(physicalGrid,...selectedPoint):null;
      const water=config.physical?.waterFeatures.find((f:any)=>f.id===state.detail);
      const text=selectedPoint?(value!==null?`${selectedPoint[1].toFixed(2)}°, ${selectedPoint[0].toFixed(2)}° · 格子の標高 ${value.toLocaleString('ja-JP')} m（EGM2008基準）`:physicalGrid?'選択位置に有効な標高格子がありません。対象外・海岸・小島の欠測を含みます。':'選択地点の標高を読み込んでいます。'):water?`${water.label??water.name}の${water.kind==='rivers'?'流路':'概略範囲'}を選択中。標高は地図の陸地を選んで確認できます。`:'地図または着目点の一覧から選ぶと、格子の標高を表示します。';
      $('[data-grid-reading]').textContent=text;
      const valueEl=$('[data-physical-value]');if(valueEl)valueEl.textContent=text;
      return;
    }
    let text=state.field==='natural'?'地図上の陸地を選ぶと、気候区分を確認できます。':'地図上の対象地域を選ぶと、格子内の米の収穫面積を確認できます。';
    const point=selectedPoint??config.cities.find(c=>c.id===state.city)?.coordinates;
    if(state.field==='natural'&&climateManifest&&state.place&&climateManifest.regions[config.regionId].countryCoverage[state.place]?.classifiedPixels===0)text='この国・地域は広域の気候格子で分類できる画素がありません。都市の観測値は別に確認できます。';
    const riceCoverage=riceLayer.countries.find(c=>c.code===state.place);
    if(state.field==='agriculture'&&riceCoverage?.validCells===0)text=riceCoverage.maskCells===0?'この国・地域の小島は、今回の広域格子と国境の組合せでは表示できません。米の収穫面積が0という意味ではありません。':'この国・地域は採用した米の分布データに有効な格子がありません。米の収穫面積が0という意味ではありません。';
    if(point){
      if(state.field==='natural'&&climateGrid){
        const id=gridCellAt(climateGrid,point[0],point[1]),classification=config.classes.find(c=>c.id===id);
        text=classification?`${point[1].toFixed(2)}°, ${point[0].toFixed(2)}° · ${classification.code} ${classification.name}`:'選択位置の広域格子には分類値がありません。海岸・小島などは元データや境界の解像度で欠測になります。';
        selectedClass=id;renderClass();
      }
      if(state.field==='agriculture'&&riceGrid){const result=readAsiaRiceCell(riceGrid,point[0],point[1]);text=result.status==='value'?`${point[1].toFixed(2)}°, ${point[0].toFixed(2)}° · 米の収穫面積 ${result.harvestedHa.toLocaleString('ja-JP',{maximumFractionDigits:1})} ha／格子`:'選択した格子はデータなし、または対象範囲外です。米の収穫面積が0という意味ではありません。';$('[data-rice-value]').textContent=text;}
    }
    if(state.field==='agriculture')$('[data-rice-value]').textContent=text;
    $('[data-grid-reading]').textContent=text;
  }
  async function loadClimateGrid() {
    if(climateGrid)return climateGrid;
    if(!climateManifest)return null;
    const record=climateManifest.regions[config.regionId],url=asset(config.climateBase,record.grid);
    gridPromise??=(record.gridEncoding==='uint8-gzip'
      ?fetchAsset(url,async response=>decodeAsiaClimateGrid(new Uint8Array(await response.arrayBuffer()),record))
      :fetchJson(url)).then(grid=>{climateGrid=grid;return grid;}).catch(error=>{gridPromise=null;throw error;});
    return gridPromise;
  }
  async function loadRiceGrid() {
    if(riceGrid)return riceGrid;
    ricePromise??=fetchJson(asset(config.agricultureBase,riceLayer.queryUrl)).then(grid=>{riceGrid=grid;return grid;}).catch(error=>{ricePromise=null;throw error;});
    return ricePromise;
  }
  async function loadPhysicalGrid() {
    if(physicalGrid)return physicalGrid;
    physicalPromise??=fetchAsset(asset(config.physicalBase!,config.physical.grid),async response=>decodeAsiaNumericGrid(new Uint8Array(await response.arrayBuffer()),config.physical,'int16',-32768)).then(grid=>{physicalGrid=grid;return grid;}).catch(error=>{physicalPromise=null;throw error;});
    return physicalPromise;
  }
  async function loadPopulationGrid(record:AsiaPopulationRaster){
    if(populationGrids.has(record.grid))return populationGrids.get(record.grid)!;
    if(!populationPromises.has(record.grid))populationPromises.set(record.grid,fetchAsset(asset(config.populationBase!,record.grid),async response=>decodeAsiaNumericGrid(new Uint8Array(await response.arrayBuffer()),record,'float32',-1)).then(grid=>{populationGrids.set(record.grid,grid);return grid;}).catch(error=>{populationPromises.delete(record.grid);throw error;}));
    return populationPromises.get(record.grid)!;
  }
  function renderPopulation(){
    const active=state.field==='population';
    for(const selector of ['[data-population-reading]','[data-population-legend]','[data-population-topics]'])optionalHidden(selector,!active);
    if(!active||!config.population)return;
    const city=urbanCity(),reading=asiaPopulationReading[config.regionId],country=config.countries.find(c=>c.code===state.place),record=populationRaster()!;
    const topic=$<HTMLSelectElement>('[data-population-topic]');if(topic)topic.value=state.topic??'density';
    $('[data-map-title]').textContent=state.topic==='urban'?'都市の広がりと人口':'人口の分布';$('[data-map-eyebrow]').textContent='Population · 2020';$('[data-map-period]').textContent='推計人口 / 格子面積';
    const gesture=$('[data-map-gesture]');if(gesture)gesture.textContent='都市の丸か一覧を選ぶと、都市の範囲と人口を読めます。地図は2本指で移動・拡大できます。';
    $('[data-population-title]').textContent=city?`${city.name}の人口を読む`:country?`${country.name}の人口分布を読む`:'人口の分布を読む';
    $('[data-population-takeaway]').textContent=city?`${city.name}の都市範囲に、2020年には約${Math.round(city.population).toLocaleString('ja-JP')}人が暮らしていたと推計されています。範囲は2025年の資料によるもので、市区町村の境界とは異なります。`:reading.takeaway;
    $('[data-population-detail]').textContent=city?(asiaUrbanReading[city.sourceName]??`${city.name}の輪郭の内側と外側で、人口が集中する場所を比べてください。広域図は5km格子を使うため、細かい街区の比較には適しません。人口の表は地図の色から合計した値ではなく、資料がこの都市範囲に対して公表した推計値です。`):reading.reading;
    const select=$<HTMLSelectElement>('[data-population-city]');select.value=city?.id??'';
    for(const option of select.options){const allowed=!state.place||!option.value||option.dataset.country===state.place;option.hidden=!allowed;option.disabled=!allowed;}
    const coverage=state.place?config.population.countryCoverage[state.place]:null;
    $('[data-population-coverage]').textContent=coverage?`${country?.name}について、資料中の${coverage.sourceUrbanCentres.toLocaleString('ja-JP')}都市のうち${coverage.listedUrbanCentres}都市を一覧に掲載しています。全国の合計人口を示すものではありません。`:`この地域では${config.population.cities.length}都市を一覧に掲載しています。全都市の一覧ではありません。`;
    $('[data-population-resolution]').textContent=city?.detail?'この都市の詳細図は1kmの元格子を使っています。詳細図の外側には広域図を表示しています。':'広域図は5×5個の1km格子をまとめています。拡大しても、元の1km格子の細かさに戻るわけではありません。';
    optionalHidden('[data-population-city-facts]',!city);
    if(city){
      $('[data-urban-population]').textContent=`約${Math.round(city.population).toLocaleString('ja-JP')} 人`;$('[data-urban-area]').textContent=`${city.areaKm2.toLocaleString('ja-JP')} km²`;$('[data-urban-density]').textContent=city.density===null?'資料に値がありません':`${Math.round(city.density).toLocaleString('ja-JP')} 人/km²`;
      const table=$('[data-urban-history]');table.replaceChildren();for(const [year,value] of Object.entries(city.history)){const row=document.createElement('tr'),label=document.createElement('th'),cell=document.createElement('td');label.scope='row';label.textContent=`${year}年`;cell.textContent=value===null?'資料に値がありません':Math.round(value).toLocaleString('ja-JP');row.append(label,cell);table.append(row);}
    }
    if(selectedPoint&&!populationGrids.has(record.grid))void loadPopulationGrid(record).then(()=>{if(state.field==='population')renderGridReading();}).catch(()=>{if(state.field==='population'&&populationRaster()?.grid===record.grid){const message='人口の数値を取得できませんでした。再読み込みをお試しください。';$('[data-population-value]').textContent=message;status(message,true);}});
  }
  async function loadFarmingGrid(record:AsiaFarmingLayer) {
    if(!record.grid)return null;const key=record.grid;
    if(farmingGrids.has(key))return farmingGrids.get(key)!;
    if(!farmingPromises.has(key))farmingPromises.set(key,fetchAsset(asset(config.farmingBase!,key),async response=>decodeAsiaNumericGrid(new Uint8Array(await response.arrayBuffer()),record,'float32',-1)).then(grid=>{farmingGrids.set(key,grid);return grid;}).catch(error=>{farmingPromises.delete(key);throw error;}));
    return farmingPromises.get(key)!;
  }
  async function loadFarmingStatistics(){
    if(farmingStatistics)return farmingStatistics;
    farmingStatisticsPromise??=fetchAsset(asset(config.farmingBase!,'statistics.json.gz'),async response=>{const bytes=new Uint8Array(await response.arrayBuffer());const decoded=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);return JSON.parse(decoded) as AsiaFarmStatistics;}).then(data=>{farmingStatistics=data;farmingStatisticsError=false;return data;}).catch(error=>{farmingStatisticsPromise=null;farmingStatisticsError=true;throw error;});
    return farmingStatisticsPromise;
  }
  function renderFarming(){
    const active=state.field==='agriculture',layer=farmingLayer(),topic=farmingTopic();
    optionalHidden('[data-farming-topics]',!active);optionalHidden('[data-farming-panel]',!active);optionalHidden('[data-farming-legend]',!layer);
    if(!active||!config.farming)return;
    const select=$<HTMLSelectElement>('[data-farming-topic]');if(select)select.value=topic!;
    renderAsiaFarmingPanel(root,config.regionId,topic!,layer,config.countries.find(c=>c.code===state.place),farmingStatistics);
    optionalHidden('[data-farming-statistics-retry]',!farmingStatisticsError);
    if(farmingStatisticsError&&state.place)$('[data-farming-statistics-status]').textContent='統計を取得できませんでした。再読み込みをお試しください。';
    if(state.place&&!farmingStatistics&&!farmingStatisticsError)void loadFarmingStatistics().then(()=>{if(state.field==='agriculture')renderFarming();}).catch(()=>{if(state.field==='agriculture')renderFarming();});
    if(!layer)return;
    $('[data-map-title]').textContent=layer.title;$('[data-map-eyebrow]').textContent='Agriculture & Forestry · 2020';$('[data-map-period]').textContent=layer.unit??'森林の参考図';
    $('[data-map-gesture]').textContent=layer.kind==='forest'?'国を選ぶと森林面積と木材の統計を読めます。地図は2本指で移動・拡大できます。':'地点を選ぶと推計値、国を選ぶと公表統計を読めます。地図は2本指で移動・拡大できます。';
    $('[data-farming-legend-title]').textContent=layer.kind==='forest'?'森林の分布（2020年・参考画像）':`${layer.title}（${layer.unit}・2020年）`;
    const scale=$('[data-farming-scale]');scale.replaceChildren();
    for(const [i,color] of (layer.colors??['4d9221']).entries()){const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor='#'+color;const breaks=layer.breaks??[],label=layer.kind==='forest'?'資料で森林と分類された場所':i===0?`0より大きく${breaks[0]}未満`:i===breaks.length?`${breaks[i-1].toLocaleString('ja-JP')}以上`:`${breaks[i-1].toLocaleString('ja-JP')}以上${breaks[i].toLocaleString('ja-JP')}未満`;item.append(swatch,document.createTextNode(label));scale.append(item);}
    $('[data-farming-legend-note]').textContent=layer.kind==='forest'?'提供元が描いた画像を表示しています。元資料の10m分類をこの広域図で読み分けられるわけではありません。色から森林面積は計算しません。':'色がない場所は、推計0・欠測・海を含みます。地点を選ぶと0と欠測を区別できます。元資料は5分角（南北で約9km）で、拡大しても畑や農場を特定できません。';
    if((selectedPoint||state.city)&&layer.grid&&!farmingGrids.has(layer.grid))void loadFarmingGrid(layer).then(()=>{if(farmingLayer()?.id===layer.id)renderGridReading();}).catch(()=>{if(farmingLayer()?.id===layer.id){const message='選択した主題の数値を取得できませんでした。再読み込みをお試しください。';$('[data-farming-value]').textContent=message;status(message,true);}});
  }
  function renderPhysical() {
    const physical=isPhysical();
    optionalHidden('[data-physical-reading]',!physical);optionalHidden('[data-physical-legend]',!physical);
    const gesture=$('[data-map-gesture]');if(gesture)gesture.textContent=physical?'地形の着目点・河川・湖は一覧からも選べます。地図は2本指で移動・拡大できます。':state.field==='natural'?'都市の点を選ぶと雨温図が開きます。地図は2本指で移動・拡大できます。':'地図の地点を選ぶと米の収穫面積を表示します。地図は2本指で移動・拡大できます。';
    if(!physical||!config.physical)return;
    const waterTopic=naturalTopic()==='water',reading=asiaPhysicalReading[config.regionId];
    $('[data-map-title]').textContent=waterTopic?'河川・湖と地形':'標高と等高線';
    $('[data-map-eyebrow]').textContent='Terrain · ETOPO 2022';$('[data-map-period]').textContent='標高 m · 500m等高線';
    $('[data-physical-title]').textContent=waterTopic?'水系と地形を読む':'高低差から地域を読む';
    $('[data-physical-takeaway]').textContent=waterTopic?reading.water:reading.terrain;
    const focus=config.physicalFocus?.find(f=>f.id===state.detail),water=config.physical.waterFeatures.find((f:any)=>f.id===state.detail);
    $('[data-physical-detail-title]').textContent=focus?.name??water?.label??water?.name??(waterTopic?'河川の流路と湖の位置':'高低差と広がり');
    $('[data-physical-detail]').textContent=focus?.reading??(water?`${water.kind==='rivers'?'河川':'湖'}：${water.name}。この表示範囲で接する対象国・地域は${water.countries.map((code:string)=>config.countries.find(c=>c.code===code)?.name??code).join('・')}です。資料の概略形状を表示しており、現在の水量や水面の広がりを示すものではありません。`:waterTopic?reading.waterDetail:reading.terrainDetail);
    $('[data-physical-context]').textContent=focus||water?(waterTopic?reading.waterDetail:reading.terrainDetail):state.place?`${config.countries.find(c=>c.code===state.place)?.name}を選択中です。国内の複数の地点を選び、標高の違いを比較してください。`:'';
    const focusSelect=$<HTMLSelectElement>('[data-physical-focus]');focusSelect.value=focus?.id??'';
    for(const option of focusSelect.options){const allowed=!state.place||!option.value||option.dataset.country===state.place;option.hidden=!allowed;option.disabled=!allowed;}
    optionalHidden('[data-water-picker]',!waterTopic);
    const waterSelect=$<HTMLSelectElement>('[data-water-select]');waterSelect.value=water?.id??'';
    for(const option of waterSelect.options){const allowed=!state.place||!option.value||config.physical.waterFeatures.find((f:any)=>f.id===option.value)?.countries.includes(state.place);option.hidden=!allowed;option.disabled=!allowed;}
    if(selectedPoint&&!physicalGrid)void loadPhysicalGrid().then(()=>{if(isPhysical())renderGridReading();}).catch(()=>{if(isPhysical()){const message='標高の数値を取得できませんでした。再読み込みをお試しください。';$('[data-physical-value]').textContent=message;$('[data-grid-reading]').textContent=message;status(message,true);}});
  }
  async function showField() {
    if(!mapReady||!map)return;
    const revision=++fieldRevision,natural=naturalTopic()==='climate',rice=farmingTopic()==='rice',physical=isPhysical(),water=naturalTopic()==='water';
    map.setLayoutProperty('asia-climate','visibility',natural?'visible':'none');
    if(rice&&!map.getSource('asia-rice')){
      map.addSource('asia-rice',{type:'image',url:asset(config.agricultureBase,riceLayer.imageUrl),coordinates:riceLayer.coordinates as [number,number][]});
      map.addLayer({id:'asia-rice',type:'raster',source:'asia-rice',paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');
    }
    if(map.getLayer('asia-rice'))map.setLayoutProperty('asia-rice','visibility',rice?'visible':'none');
    const farm=farmingLayer();
    if(farm&&!map.getSource('asia-farming-'+farm.id)){const id='asia-farming-'+farm.id;map.addSource(id,{type:'image',url:asset(config.farmingBase!,farm.image),coordinates:farm.imageCoordinates});map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');}
    for(const layer of config.farming?.layers??[]){const id='asia-farming-'+layer.id;if(map.getLayer(id))map.setLayoutProperty(id,'visibility',farm?.id===layer.id?'visible':'none');}
    if(!physical)for(const id of ['asia-terrain','asia-contours'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
    if(!water)for(const id of ['asia-lakes','asia-rivers','asia-rivers-hit','asia-water-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
    const population=state.field==='population'&&!!config.population,urban=population&&state.topic==='urban',selectedUrban=urbanCity();
    if(population){
      for(const [id,record] of [['asia-population',config.population],...(selectedUrban?.detail?[[`asia-population-${selectedUrban.id}`,selectedUrban.detail]]:[])] as [string,AsiaPopulationRaster][]){
        if(!map.getSource(id)){map.addSource(id,{type:'image',url:asset(config.populationBase!,record.image),coordinates:record.imageCoordinates});map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');}
      }
      if(!map.getSource('asia-urban-points')){
        map.addSource('asia-urban-points',{type:'geojson',data:{type:'FeatureCollection',features:config.population!.cities.map(c=>({type:'Feature',properties:{id:c.id,name:c.name},geometry:{type:'Point',coordinates:c.coordinates}}))}});
        map.addLayer({id:'asia-urban-points',type:'circle',source:'asia-urban-points',paint:{'circle-radius':5,'circle-color':'#fff','circle-stroke-color':'#173b60','circle-stroke-width':2}});
        map.addLayer({id:'asia-urban-hit',type:'circle',source:'asia-urban-points',paint:{'circle-radius':14,'circle-opacity':0}});
      }
    }
    for(const id of ['asia-population',...(config.population?.cities.filter(c=>c.detail).map(c=>`asia-population-${c.id}`)??[])])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',population&&(id==='asia-population'||id===`asia-population-${selectedUrban?.id}`)?'visible':'none');
    for(const id of ['asia-urban-points','asia-urban-hit'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',population?'visible':'none');
    for(const id of ['asia-urban-boundary','asia-urban-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',population&&(urban||!!selectedUrban)?'visible':'none');
    const populationGeographyVisibility=()=>{
      if(!map)return;const detailed=(population||!!farm)&&!!map.getSource('asia-population-geography');
      for(const id of ['asia-land','asia-context','asia-context-border','asia-country-hit','asia-country-border','asia-country-selected'])map.setLayoutProperty(id,'visibility',detailed?'none':'visible');
      for(const id of ['asia-population-land','asia-population-context','asia-population-country-hit','asia-population-border','asia-population-country-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',detailed?'visible':'none');
      if(map.getLayer('asia-population-country-selected'))map.setFilter('asia-population-country-selected',['==',['get','code'],state.place??'']);
    };
    populationGeographyVisibility();
    if((population||farm)&&config.population?.geography&&!map.getSource('asia-population-geography')){
      try{
        populationGeographyPromise??=fetchJson(asset(config.populationBase!,config.population.geography)).catch(error=>{populationGeographyPromise=null;throw error;});const data=await populationGeographyPromise;
        if(revision!==fieldRevision||!mapReady||!map)return;
        if(!map.getSource('asia-population-geography')){
          map.addSource('asia-population-geography',{type:'geojson',data});
          map.addLayer({id:'asia-population-land',type:'fill',source:'asia-population-geography',paint:{'fill-color':'#e1e4db'}},'asia-climate');
          map.addLayer({id:'asia-population-context',type:'fill',source:'asia-population-geography',filter:['==',['get','target'],false],paint:{'fill-color':'#d7dad5'}},'asia-country-border');
          map.addLayer({id:'asia-population-country-hit',type:'fill',source:'asia-population-geography',filter:['==',['get','target'],true],paint:{'fill-opacity':0}},'asia-country-border');
          map.addLayer({id:'asia-population-border',type:'line',source:'asia-population-geography',paint:{'line-color':'#5b7077','line-width':.65}},'asia-country-border');
          map.addLayer({id:'asia-population-country-selected',type:'line',source:'asia-population-geography',filter:['==',['get','code'],state.place??''],paint:{'line-color':'#304954','line-width':1.3}},'asia-country-border');
        }
        populationGeographyVisibility();
      }catch{if(revision===fieldRevision)status('詳細な海岸線を取得できませんでした。概略の国境と都市の表は引き続き読めます。',true);}
    }
    if(population&&(urban||selectedUrban)&&!map.getSource('asia-urban')){
      try{
        urbanPromise??=fetchJson(asset(config.populationBase!,config.population!.urban)).catch(error=>{urbanPromise=null;throw error;});const data=await urbanPromise;
        if(revision!==fieldRevision||!mapReady||!map)return;
        if(!map.getSource('asia-urban')){map.addSource('asia-urban',{type:'geojson',data});map.addLayer({id:'asia-urban-boundary',type:'line',source:'asia-urban',paint:{'line-color':'#543c3c','line-width':1.2,'line-opacity':.8}});map.addLayer({id:'asia-urban-selected',type:'line',source:'asia-urban',paint:{'line-color':'#9d342c','line-width':2.5}});}
      }catch{if(revision===fieldRevision)status('都市の輪郭を取得できませんでした。都市の一覧と人口の表は引き続き読めます。',true);}
    }
    if(map?.getLayer('asia-urban-selected'))map.setFilter('asia-urban-selected',['==',['get','id'],selectedUrban?.id??'']);
    if(physical&&config.physical&&!map.getSource('asia-terrain')){
      for(const [id,file] of [['asia-terrain',config.physical.image],['asia-contours',config.physical.contours]]){
        map.addSource(id,{type:'image',url:asset(config.physicalBase!,file),coordinates:config.physical.imageCoordinates});
        map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':1,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');
      }
    }
    for(const id of ['asia-terrain','asia-contours'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',physical?'visible':'none');
    for(const id of ['asia-lakes','asia-rivers','asia-rivers-hit','asia-water-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',water?'visible':'none');
    if(water&&config.physical&&!map.getSource('asia-water')){
      try{
        waterPromise??=fetchJson(asset(config.physicalBase!,config.physical.water)).catch(error=>{waterPromise=null;throw error;});
        const data=await waterPromise;
        if(revision!==fieldRevision||!mapReady||!map)return;
        if(!map.getSource('asia-water')){
          map.addSource('asia-water',{type:'geojson',data});
          map.addLayer({id:'asia-lakes',type:'fill',source:'asia-water',filter:['==',['get','kind'],'lakes'],paint:{'fill-color':'#89bacd','fill-opacity':.9}},'asia-country-border');
          map.addLayer({id:'asia-rivers',type:'line',source:'asia-water',filter:['==',['get','kind'],'rivers'],paint:{'line-color':'#176c94','line-width':['interpolate',['linear'],['zoom'],2,1,7,2]}},'asia-country-border');
          map.addLayer({id:'asia-rivers-hit',type:'line',source:'asia-water',filter:['==',['get','kind'],'rivers'],paint:{'line-width':14,'line-opacity':0}},'asia-country-border');
          map.addLayer({id:'asia-water-selected',type:'line',source:'asia-water',filter:['==',['get','id'],state.detail??''],paint:{'line-color':'#163f66','line-width':3}},'asia-country-border');
        }
        if(!sourceFailed)status('');
      }catch{if(revision===fieldRevision)status('河川・湖の形状を取得できませんでした。一覧と説明は利用できます。',true);}
    }
    if(map?.getLayer('asia-water-selected'))map.setFilter('asia-water-selected',['==',['get','id'],state.detail??'']);
    if((state.city||selectedPoint)&&natural){try{await loadClimateGrid();if(naturalTopic()==='climate')renderGridReading();}catch{if(naturalTopic()==='climate')status('気候の数値を取得できませんでした。雨温図は引き続き読めます。',true);}}
    if(rice){try{await loadRiceGrid();if(farmingTopic()==='rice'){renderGridReading();if(!sourceFailed)status('');}}catch{if(farmingTopic()==='rice')status('米の数値を取得できませんでした。気候や都市の雨温図へ切り替えられます。',true);}}
  }
  function sourceText() {
    const climate=$('[data-climate-method]');
    climate.textContent='元データは30秒角（赤道付近で約1km）。表示・選択はWeb Mercator上で約2.23km間隔の格子に、分類値を最近傍で再標本化しています。地表での間隔は緯度により小さくなります。国境の概略化による海岸・小島の欠測は残ります。出典：Beckほか（2023）／CC BY 4.0。地域抽出・加工：Insight Journal。';
    const agr=$('[data-agriculture-method]');agr.replaceChildren();
    const a=document.createElement('a');a.href=asiaRiceSources[0].href;a.textContent='IFPRI MapSPAM 2020 v2r2 / CGIAR';agr.append(a,document.createTextNode(`。${asiaRiceReading.scaleNote} ${asiaRiceReading.attribution.replace('農業の派生','米の派生')}`));
    const src=$('[data-rice-source]');src.replaceChildren(document.createTextNode('出典：'));
    for(const [index,source] of asiaRiceSources.entries()){if(index)src.append(document.createTextNode(' · '));const link=document.createElement('a');link.href=source.href;link.textContent=source.label;src.append(link);}
    $('[data-rice-summary]').textContent=riceNote.reading;
    $('.asia-rice-reading>.asia-takeaway').textContent=riceNote.takeaway;
    const scale=$('[data-rice-scale]'),keys=document.createElement('div');keys.className='asia-rice-key';
    for(const entry of asiaRiceLegend){const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=entry.color;item.append(swatch,document.createTextNode(entry.label));keys.append(item);}
    const note=document.createElement('p');note.textContent='色なし：1ha未満・推計0・データなしを含みます。区別は地図を選んで確認してください。';scale.append(keys,note);
  }

  async function initialiseMap() {
    if(starting)return;starting=true;sourceFailed=false;const currentAttempt=++attempt;const initialStarted=performance.now();status('地図を読み込んでいます');
    const timeout=setTimeout(()=>{if(currentAttempt===attempt&&!mapReady)status('地図の表示に時間がかかっています。都市の雨温図と数値は選んで読めます。',true);},20000);
    try{
      const [lib,geography]=await Promise.all([import('maplibre-gl'),fetchJson(config.geographyUrl)]);
      for(const button of $$('[data-climate-class]'))button.hidden=!config.climate.classIds.includes(Number(button.dataset.climateClass));
      const region=config.climate;
      const targets=new Set(context.countries);
      const lands={...geography,features:geography.features.filter((f:any)=>f.geometry)};
      const selected={...lands,features:lands.features.filter((f:any)=>targets.has(f.properties.code))};
      const nearby={...lands,features:lands.features.filter((f:any)=>!targets.has(f.properties.code))};
      if(map){markers.splice(0).forEach(m=>m.marker.remove());pointMarker?.remove();pointMarker=null;pointLabel=null;map.remove();map=null;}
      mapReady=false;lib.setWorkerUrl(workerUrl);lib.setWorkerCount(1);
      map=new lib.Map({container:$('[data-map-surface]'),attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,maxPitch:0,maxZoom:9,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),cooperativeGestures:true,locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は2本指で動かせます'},bounds:[[config.bounds[0],config.bounds[1]],[config.bounds[2],config.bounds[3]]],fitBoundsOptions:{padding:20},maxBounds:[[Math.max(-180,config.bounds[0]-15),Math.max(-80,config.bounds[1]-15)],[Math.min(180,config.bounds[2]+15),Math.min(80,config.bounds[3]+15)]],style:{version:8,sources:{'asia-land':{type:'geojson',data:lands},'asia-countries':{type:'geojson',data:selected},'asia-context':{type:'geojson',data:nearby},'asia-climate':{type:'image',url:asset(config.climateBase,region.image),coordinates:region.imageCoordinates}},layers:[{id:'asia-ocean',type:'background',paint:{'background-color':'#e6eef0'}},{id:'asia-land',type:'fill',source:'asia-land',paint:{'fill-color':'#e1e4db'}},{id:'asia-climate',type:'raster',source:'asia-climate',paint:{'raster-opacity':.8,'raster-resampling':'nearest','raster-fade-duration':0}},{id:'asia-context',type:'fill',source:'asia-context',paint:{'fill-color':'#d7dad5'}},{id:'asia-context-border',type:'line',source:'asia-context',paint:{'line-color':'#f6f6ee','line-width':.65}},{id:'asia-country-hit',type:'fill',source:'asia-countries',paint:{'fill-opacity':0}},{id:'asia-country-border',type:'line',source:'asia-countries',paint:{'line-color':'#354c56','line-opacity':.6,'line-width':.8}},{id:'asia-country-selected',type:'line',source:'asia-countries',filter:['==',['get','code'],''],paint:{'line-color':'#28363d','line-width':2.6}}]}});
      map.scrollZoom.disable();map.touchZoomRotate.disableRotation();
      map.once('load',()=>{
        if(currentAttempt!==attempt)return;
        clearTimeout(timeout);mapReady=true;$('[data-map-fallback]').hidden=true;if(!sourceFailed)status('');
        pointLabel=document.createElement('span');pointLabel.className='asia-point-marker';pointLabel.hidden=true;
        pointMarker=new lib.Marker({element:pointLabel,anchor:'bottom'}).setLngLat([config.bounds[0],config.bounds[1]]).addTo(map!);
        for(const city of config.cities){
          const button=document.createElement('button');button.type='button';button.className='asia-city-marker';button.setAttribute('aria-label',`${city.name}の雨温図`);button.dataset.mapCity=city.id;
          const dot=document.createElement('i'),label=document.createElement('span');dot.setAttribute('aria-hidden','true');label.textContent=city.name;button.append(dot,label);
          button.addEventListener('click',event=>{event.stopPropagation();selectCity(city.id);});
          const marker=new lib.Marker({element:button,anchor:'left'}).setLngLat(city.coordinates).addTo(map!);markers.push({city,button,marker});
        }
        render();fitSelection();root.dataset.mapReady='true';root.dataset.mapLoadMs=String(Math.round(performance.now()-initialStarted));
      });
      map.on('click',async event=>{
        if(!mapReady||!map)return;
        if(state.field==='population'||farmingLayer()){
          const city=state.field==='population'&&map.getLayer('asia-urban-hit')?map.queryRenderedFeatures(event.point,{layers:['asia-urban-hit']})[0]:null;
          /* Population points must not intercept farming clicks. */
          if(city?.properties.id){selectUrban(city.properties.id);return;}
          const contextHit=map.queryRenderedFeatures(event.point,{layers:[map.getSource('asia-population-geography')?'asia-population-context':'asia-context']})[0];
          if(contextHit?.properties.code&&!context.countries.includes(contextHit.properties.code)){const message='灰色の周辺国は、この地域の地図の選択対象に含めていません。';$('[data-grid-reading]').textContent=message;return;}
        }
        if(naturalTopic()==='water'&&map.getLayer('asia-rivers-hit')){
          const feature=map.queryRenderedFeatures(event.point,{layers:['asia-rivers-hit','asia-lakes']})[0];
          if(feature?.properties.id){selectWater(feature.properties.id);return;}
        }
        const hit=map.queryRenderedFeatures(event.point,{layers:[(state.field==='population'||farmingLayer())&&map.getSource('asia-population-geography')?'asia-population-country-hit':'asia-country-hit']})[0];
        selectedPoint=[event.lngLat.lng,event.lngLat.lat];
        const keepUrban=state.field==='population'&&(!hit?.properties.code||hit.properties.code===state.place);
        state={...state,point:selectedPoint,place:hit?.properties.code??state.place,city:null,detail:keepUrban?state.detail:null,camera:camera()};persist(true);render();
        if(farmingLayer()){const layer=farmingLayer()!;try{await loadFarmingGrid(layer);if(farmingLayer()?.id===layer.id)renderGridReading();}catch{if(farmingLayer()?.id===layer.id)status('選択した主題の数値を取得できませんでした。再読み込みをお試しください。',true);}return;}
        if(state.field==='population'){try{await loadPopulationGrid(populationRaster()!);if(state.field==='population')renderGridReading();}catch{if(state.field==='population')status('人口の数値を取得できませんでした。再読み込みをお試しください。',true);}return;}
        if(isPhysical()){try{await loadPhysicalGrid();if(isPhysical())renderGridReading();}catch{if(isPhysical())status('標高の数値を取得できませんでした。再読み込みをお試しください。',true);}}
        else if(state.field==='natural'){try{await loadClimateGrid();if(naturalTopic()==='climate')renderGridReading();}catch{if(naturalTopic()==='climate')status('気候の数値を取得できませんでした。再読み込みをお試しください。',true);}}
        else {try{await loadRiceGrid();if(farmingTopic()==='rice')renderGridReading();}catch{if(farmingTopic()==='rice')status('米の数値を取得できませんでした。気候の表示は利用できます。',true);}}
      });
      map.on('moveend',()=>{if(suppressCamera||!mapReady)return;clearTimeout(moveTimer);moveTimer=setTimeout(()=>{state={...state,camera:camera()};persist(false);},120);});
      map.on('error',event=>{if(currentAttempt!==attempt)return;sourceFailed=true;console.warn('Asia map asset failed',event.error?.message);status('地図の一部を読み込めませんでした。都市の図表・出典は引き続き読めます。',true);});
      map.getCanvas().addEventListener('webglcontextlost',()=>{mapReady=false;$('[data-map-fallback]').hidden=false;root.dataset.mapReady='false';status('地図の描画が停止しました。国の一覧と都市の図表は利用できます。',true);},{once:true});
    }catch(error){console.warn('Asia map unavailable',error);$('[data-map-fallback]').hidden=false;status('詳細地図を読み込めませんでした。国の位置と都市の図表は利用できます。',true);}
    finally{starting=false;}
  }
  countrySelect.addEventListener('change',()=>selectCountry(countrySelect.value||null));
  $<HTMLSelectElement>('[data-natural-topic]')?.addEventListener('change',event=>selectNaturalTopic((event.target as HTMLSelectElement).value));
  $<HTMLSelectElement>('[data-farming-topic]')?.addEventListener('change',event=>navigate({...state,field:'agriculture',topic:(event.target as HTMLSelectElement).value,detail:null,point:state.point??config.cities.find(c=>c.id===state.city)?.coordinates??null,city:null,camera:camera()},false));
  $('[data-farming-statistics-retry]')?.addEventListener('click',()=>{farmingStatisticsError=false;renderFarming();});
  $<HTMLSelectElement>('[data-population-topic]')?.addEventListener('change',event=>navigate({...state,field:'population',topic:(event.target as HTMLSelectElement).value,city:null,camera:camera()},false));
  $<HTMLSelectElement>('[data-population-city]')?.addEventListener('change',event=>selectUrban((event.target as HTMLSelectElement).value));
  $('[data-population-centroid]')?.addEventListener('click',()=>{const city=urbanCity();if(city)navigate({...state,point:city.coordinates,camera:camera()},false);});
  $<HTMLSelectElement>('[data-physical-focus]')?.addEventListener('change',event=>{const id=(event.target as HTMLSelectElement).value;if(!id){clearDetail();return;}const focus=config.physicalFocus?.find(f=>f.id===id);if(focus)navigate({...state,field:'natural',topic:'terrain',detail:focus.id,place:focus.country,point:focus.coordinates,city:null,camera:null});});
  $<HTMLSelectElement>('[data-water-select]')?.addEventListener('change',event=>selectWater((event.target as HTMLSelectElement).value));
  citySelect.addEventListener('change',()=>{if(citySelect.value)selectCity(citySelect.value);else navigate({...state,city:null,camera:null});});
  $$<HTMLButtonElement>('[data-country-button]').forEach(b=>b.addEventListener('click',()=>selectCountry(b.dataset.countryButton!)));
  $$<SVGPathElement>('[data-map-country]').forEach(p=>p.addEventListener('click',()=>selectCountry(p.dataset.mapCountry!)));
  $$<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(a=>a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();navigate({...state,field:a.dataset.field as AsiaField,topic:a.dataset.field===state.field?state.topic:null,detail:a.dataset.field===state.field?state.detail:null,camera:camera(),back:null},false);}));
  $$<HTMLButtonElement>('[data-compare]').forEach(b=>b.addEventListener('click',()=>navigate(startAsiaComparison(new URL(location.href),{...state,camera:camera()},b.dataset.compare as AsiaField),false)));
  $('[data-comparison-back]').addEventListener('click',()=>navigate(restoreAsiaComparison(new URL(location.href),state,context)));
  $$<HTMLButtonElement>('[data-climate-class]').forEach(b=>b.addEventListener('click',()=>{selectedClass=Number(b.dataset.climateClass);selectedPoint=null;state={...state,point:null};persist(false);renderClass();const c=config.classes.find(c=>c.id===selectedClass)!;$('[data-grid-reading]').textContent=`凡例：${c.code} ${c.name} · ${c.description}`;}));
  $('[data-reset]').addEventListener('click',()=>navigate({field:state.field,place:null,city:null,camera:null,back:null}));
  $('[data-map-fit]').addEventListener('click',()=>{state={...state,camera:null};persist(true);fitSelection();});
  $('[data-zoom-in]').addEventListener('click',()=>map?.zoomIn({duration:reduced?0:160}));
  $('[data-zoom-out]').addEventListener('click',()=>map?.zoomOut({duration:reduced?0:160}));
  $('[data-map-retry]').addEventListener('click',()=>{state={...state,camera:camera()};mapReady=false;root.dataset.mapReady='false';void initialiseMap();});
  window.addEventListener('popstate',()=>{state=readState();selectedPoint=state.point??null;selectedClass=null;render();fitSelection();});
  window.addEventListener('pagehide',event=>{clearTimeout(moveTimer);if(!event.persisted){map?.remove();map=null;mapReady=false;}});
  window.addEventListener('pageshow',event=>{if(event.persisted){map?.resize();if(!mapReady)void initialiseMap();}});
  const syncLayout=()=>{map?.resize();const height=$('.asia-map-frame')?.getBoundingClientRect().height;if(height)root.style.setProperty('--asia-map-height',`${height}px`);};
  const layoutObserver=new ResizeObserver(syncLayout);layoutObserver.observe($('[data-map-surface]'));
  window.addEventListener('resize',syncLayout);
  sourceText();render();persist(false);syncLayout();void initialiseMap();
}
