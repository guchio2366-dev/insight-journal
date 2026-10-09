import {createAsiaPresentation,type AsiaPresentation} from './atlas-asia-presentation';
import {contourBandLabels} from '../data/atlas/asia-contour-bands';
import {indiaPopulationLabels} from '../data/atlas/asia-focus';
import {createAsiaNavigation} from './atlas-asia-navigation';
import { readAsiaAtlasState, writeAsiaAtlasState, startAsiaComparison, restoreAsiaComparison, gridCellAt, type AsiaState, type AsiaCamera, type AsiaField, type AsiaStateContext } from '../lib/atlas-asia-state';
import { getAsiaRiceLayer, asiaRiceLegend, asiaRiceReading, asiaRiceRegionNotes, asiaRiceSources, readAsiaRiceCell, type AsiaRiceGrid } from '../data/atlas/asia-agriculture';
import type { AsiaClimateCity } from '../data/atlas/asia-climate-cities';
import type { AsiaClimateClass } from '../data/atlas/asia-climate-definitions';
import { decodeAsiaClimateGrid } from '../lib/atlas-asia-climate-grid';
import { decodeAsiaNumericGrid, readAsiaNumericCell, type AsiaNumericGrid } from '../lib/atlas-asia-numeric-grid';
import { asiaPhysicalReading, asiaNaturalTopics, type AsiaPhysicalFocus } from '../data/atlas/asia-physical-reading';
import {asiaPopulationTopics,asiaPopulationReading,asiaUrbanReading,type AsiaPopulationRegion,type AsiaPopulationRaster} from '../data/atlas/asia-population';
import {renderAsiaFarmingPanel,renderSouthCentralFarmConnections} from './atlas-asia-farming-panel';
import {renderEastAsiaFarmFoundations} from './atlas-east-asia-farm-foundations';
import {createAsiaIndustry} from './atlas-asia-industry';
import {hasIndustryCountryScope,industryCountryChoices,normalizeScopedIndustryState} from '../data/atlas/asia-industry';
import {asiaWaterFocus} from '../data/atlas/asia-water-focus';
import {createAsiaWater} from './atlas-asia-water';
import {createAsiaSeasonalPrecipitation} from './atlas-asia-seasonal-precipitation';
import {createAsiaSocial} from './atlas-asia-social';
import {createAsiaTrade} from './atlas-asia-trade';
import {createPlaceReadings} from './atlas-asia-place-readings';
import {createAsiaComparison} from './atlas-asia-comparison';
import {createAsiaReadingDock} from './atlas-asia-reading-dock';
import {createAsiaLayout} from './atlas-asia-layout';
import {asiaPlaceReadings,normalizePlaceReading,selectedPlaceReading} from '../data/atlas/asia-place-readings';
import {isTradeTopic,normalizeTradeState,type TradeRegion} from '../data/atlas/asia-trade';
import {socialGroup,socialTopic,isSocialDetailId,normalizeSocialState,type SocialRegion} from '../data/atlas/asia-social';
import {isWaterTopic,normalizeWaterState,waterScenes,type WaterRegion} from '../data/atlas/asia-water';
import {isIndustryDetailId,normalizeIndustryState,type IndustryRegion} from '../data/atlas/asia-industry';
import type {AsiaFarmingRegion,AsiaFarmingLayer,AsiaFarmStatistics} from '../data/atlas/asia-farming';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

const root=document.querySelector<HTMLElement>('[data-asia-atlas]');
if(root) start(root);

function start(root:HTMLElement) {
  const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const $$=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
  const physicalKey=root.querySelector<HTMLElement>('[data-physical-legend] .asia-physical-key'),physicalKeyHTML=physicalKey?.innerHTML;
  const physicalLegendNote=root.querySelector<HTMLElement>('[data-physical-legend] p'),physicalLegendText=physicalLegendNote?.textContent;
  const config=JSON.parse($('[data-asia-config]').textContent!) as {
    regionId:'east-asia'|'southeast-asia'|'south-central-asia';label:string;bounds:number[];contentExtent?:number[];dataBounds?:number[];
    countries:{code:string;name:string;bounds:number[]}[];cities:AsiaClimateCity[];classes:AsiaClimateClass[];
    geographyUrl:string;climateBase:string;agricultureBase:string;climate:any;
    physicalBase?:string;physical?:any;physicalFocus?:AsiaPhysicalFocus[];
    populationBase?:string;population?:AsiaPopulationRegion;
    farmingBase?:string;farming?:AsiaFarmingRegion;
    industryBase?:string;industry?:IndustryRegion;industryCountryCodes?:string[];
    waterBase?:string;water?:WaterRegion;seasonalBase?:string;
    socialBase?:string;social?:SocialRegion;
    presentation?:AsiaPresentation;presentationBase?:string;
    farmInsight?:{title:string;lead:string;waterTitle:string;waterLead:string;rivers:string[]};
    tradeBase?:string;trade?:TradeRegion;tradeChapters?:Record<string,string>;
  };
  const context:AsiaStateContext={countries:config.countries.map(c=>c.code),cities:config.cities,bounds:config.dataBounds??config.bounds,fields:['natural','agriculture'],topics:{natural:asiaNaturalTopics.map(t=>t.id)},details:{natural:[...(config.physicalFocus??[]).map(f=>f.id),...(config.physical?.waterFeatures??[]).map((f:any)=>f.id)]}};
  if(config.population){context.fields=[...context.fields,'population'];context.topics!.population=[...asiaPopulationTopics.map(t=>t.id),'ethnicity','religion'];context.details!.population=config.population.cities.map(c=>c.id);}
  if(config.social){context.topics!.population=[...context.topics!.population!,...config.social.topics.map(t=>t.id)];const urbanIds=context.details!.population as string[];context.details!.population=id=>urbanIds.includes(id)||isSocialDetailId(id);}
  if(config.farming)context.topics!.agriculture=['overview','rice',...config.farming.layers.map(t=>t.id)];
  if(config.industry){context.fields=[...context.fields,'industry'];context.topics!.industry=config.industry.topics.map(t=>t.id);context.details!.industry=isIndustryDetailId;}
  if(config.water){const physicalIds=context.details!.natural as readonly string[];context.details!.natural=id=>physicalIds.includes(id)||/^m-(0[1-9]|1[0-2])$/.test(id)||/^[bg]-\d{1,12}$/.test(id)||waterScenes.some(s=>s.region===config.regionId&&s.id===id);}
  const settlementIds=Object.values(config.presentation?.settlements??{}).flatMap(r=>r.categories.map(c=>c.id));
  if(context.details?.population){const previous=context.details.population;context.details.population=id=>settlementIds.includes(id)||(typeof previous==='function'?previous(id):previous.includes(id));}
  const countrySelect=$<HTMLSelectElement>('[data-country-select]'),citySelect=$<HTMLSelectElement>('[data-city-select]');
  const overviewTitle=$('[data-reading-title]').textContent!,overviewSummary=$('[data-reading-summary]').textContent!;
  let industry:ReturnType<typeof createAsiaIndustry>|null=null;
  let hydrology:ReturnType<typeof createAsiaWater>|null=null;
  let seasonal:ReturnType<typeof createAsiaSeasonalPrecipitation>|null=null;
  let social:ReturnType<typeof createAsiaSocial>|null=null;
  let trade:ReturnType<typeof createAsiaTrade>|null=null;
  context.stories=Object.fromEntries(context.fields.map(field=>[field,asiaPlaceReadings.filter(s=>s.region===config.regionId&&s.field===field).map(s=>s.id)]));
  function readState():AsiaState {return normalizePlaceReading(config.regionId,readBaseState());}
  function readBaseState():AsiaState {
    let restored=normalizeScopedIndustryState(config.industry,readAsiaAtlasState(new URL(location.href),context));
    if(restored.field==='industry'&&config.industry&&hasIndustryCountryScope(config.industry)&&restored.place&&!industryCountryChoices(config.industry).some(c=>c.code===restored.place))restored={...restored,place:null,detail:null,point:null,story:null};
    if(restored.field==='natural'&&restored.topic==='water'&&restored.detail?.startsWith('b-'))restored={...restored,topic:'basins'};
    if(restored.field==='industry'&&config.trade&&isTradeTopic(restored.topic))return normalizeTradeState(restored,config.tradeChapters!);
    if(restored.field==='industry'&&config.industry)return industry?.normalize(restored)??normalizeIndustryState(config.industry,restored);
    if(restored.field==='population'){
      if(['ethnicity','religion'].includes(restored.topic??''))return {...restored,detail:config.presentation?.settlements?.[restored.topic!]?.categories.some(c=>c.id===restored.detail)?restored.detail:null,city:null,point:null,place:null};
      if(config.social&&socialTopic(config.social,restored))return social?.normalize(restored)??normalizeSocialState(config.social,restored);
      const urban=config.population?.cities.find(c=>c.id===restored.detail&&(!restored.place||c.country===restored.place));
      return {...restored,detail:urban?.id??null,place:urban?.country??restored.place,point:restored.point??config.cities.find(c=>c.id===restored.city)?.coordinates??null,city:null};
    }
    if(restored.field!=='natural')return restored;
    if(restored.topic==='seasonal-precipitation')return seasonal?.normalize(restored)??{...restored,detail:/^m-(0[1-9]|1[0-2])$/.test(restored.detail??'')?restored.detail:'m-07',city:null};
    if(config.water&&isWaterTopic(restored.topic)&&!(restored.topic==='water'&&config.physical?.waterFeatures.some((f:any)=>f.id===restored.detail)))return hydrology?.normalize(restored)??normalizeWaterState(config.regionId,restored);
    if(!restored.topic||restored.topic==='climate')return {...restored,detail:null};
    const focus=config.physicalFocus?.find(f=>f.id===restored.detail),water=config.physical?.waterFeatures.find((f:any)=>f.id===restored.detail);
    const detailAllowed=focus?['terrain','landform'].includes(restored.topic??'')&&(!restored.place||restored.place===focus.country):water?restored.topic==='water'&&(!restored.place||water.countries.includes(restored.place)):false;
    if(focus&&detailAllowed)return {...restored,place:focus.country,point:focus.coordinates,city:null};
    const city=config.cities.find(c=>c.id===restored.city);
    return {...restored,detail:detailAllowed?restored.detail:null,point:restored.point??city?.coordinates??null,city:null};
  }
  let state:AsiaState=readState();
  let map:import('maplibre-gl').Map|null=null;
  let mapReady=false,starting=false,suppressCamera=false,sourceFailed=false,attempt=0,moveTimer:ReturnType<typeof setTimeout>|undefined;
  const navigationBounds=config.dataBounds??config.bounds;
  const climateManifest={regions:{[config.regionId]:config.climate}};
  let climateGrid:any=null,riceGrid:AsiaRiceGrid|null=null;
  let gridPromise:Promise<any>|null=null,ricePromise:Promise<AsiaRiceGrid>|null=null;
  let physicalGrid:AsiaNumericGrid|null=null,physicalPromise:Promise<AsiaNumericGrid>|null=null,waterPromise:Promise<any>|null=null,fieldRevision=0;
  const populationGrids=new Map<string,AsiaNumericGrid>(),populationPromises=new Map<string,Promise<AsiaNumericGrid>>();
  let urbanPromise:Promise<any>|null=null,populationGeographyPromise:Promise<any>|null=null;
  const urbanCity=()=>state.field==='population'?config.population?.cities.find(c=>c.id===state.detail):undefined;
  const populationRaster=():AsiaPopulationRaster|undefined=>{const detail=urbanCity()?.detail,point=state.point,b=detail?.bounds4326;return detail&&(!point||b&&point[0]>=b[0]&&point[0]<=b[2]&&point[1]>=b[1]&&point[1]<=b[3])?detail:config.population;};
  const farmingTopic=()=>state.field==='agriculture'?(state.topic??(state.city?'rice':config.presentation?'overview':'rice')):null;
  const farmingLayer=()=>config.farming?.layers.find(t=>t.id===farmingTopic());
  const farmingGrids=new Map<string,AsiaNumericGrid>(),farmingPromises=new Map<string,Promise<AsiaNumericGrid>>();
  let farmingStatistics:AsiaFarmStatistics|null=null,farmingStatisticsPromise:Promise<AsiaFarmStatistics>|null=null,farmingStatisticsError=false;
  const naturalTopic=()=>state.field==='natural'?(state.topic??'climate'):null;
  const isPhysical=()=>['terrain','landform'].includes(naturalTopic()??'')||naturalTopic()==='water'&&!config.water;
  const optionalHidden=(selector:string,hidden:boolean)=>{const el=$(selector);if(el)el.hidden=hidden;};
  let selectedClass:number|null=null,selectedPoint:[number,number]|null=state.point??null;
  const markers:{city:AsiaClimateCity;button:HTMLButtonElement;marker:import('maplibre-gl').Marker}[]=[];
  let pointMarker:import('maplibre-gl').Marker|null=null,pointLabel:HTMLElement|null=null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const riceLayer=getAsiaRiceLayer(config.regionId)!;
  const riceNote=asiaRiceRegionNotes[config.regionId];
  industry=config.industry?createAsiaIndustry(root,{industry:config.industry,industryBase:config.industryBase!,countries:config.countries},()=>state,navigate,camera,()=>{state=industry!.normalize(state);const d=industry!.detail();if(d?.point)state={...state,point:state.point??d.point};selectedPoint=state.point??null;persist(false);render();fitSelection();}):null;
  hydrology=config.water?createAsiaWater(root,{regionId:config.regionId,water:config.water,waterBase:config.waterBase!,countries:config.countries,waterFeatures:config.physical?.waterFeatures,contourBands:config.presentation?.rainfall.bands},()=>state,navigate,camera,()=>{state=hydrology!.normalize(state);selectedPoint=state.point??null;persist(false);render();fitSelection();}):null;
  seasonal=config.seasonalBase?createAsiaSeasonalPrecipitation(root,{regionId:config.regionId,seasonalBase:config.seasonalBase},()=>state,navigate,camera,()=>{render();}):null;
  social=config.social?createAsiaSocial(root,{social:config.social,socialBase:config.socialBase!,countries:config.countries},()=>state,navigate,camera,()=>{state=social!.normalize(state);selectedPoint=state.point??null;persist(false);render();fitSelection();}):null;
  trade=config.trade?createAsiaTrade(root,{trade:config.trade,tradeBase:config.tradeBase!,chapters:config.tradeChapters!,countries:config.countries,domesticTopics:config.industry?.topics??[],industry:config.industry},()=>state,navigate,camera):null;
  const placeReadings=createPlaceReadings(root,config.regionId,()=>state,navigate,camera);
  const comparison=createAsiaComparison(root,config,context,()=>state);
  const readingDock=createAsiaReadingDock(root);
  const learningLayout=createAsiaLayout(root);
  let shownChartCity:string|null=null;
  let shownUrbanDetail:string|null=null;


  function chooseFarm(topic:string){navigate({...state,field:'agriculture',topic,single:false,farms:config.presentation?.farming.products.some(p=>p.id===topic)?null:state.farms,overlay:null,detail:null,story:null,point:state.point??config.cities.find(c=>c.id===state.city)?.coordinates??null,city:null,camera:camera()},false);}
  function choosePopulation(topic:string){if(config.social?.topics.some(t=>t.id===topic))social?.chooseTopic(topic);else {const eastSettlement=config.regionId==='east-asia'&&['ethnicity','religion'].includes(topic);navigate({...state,field:'population',topic,detail:null,story:null,city:null,camera:eastSettlement?null:camera()},eastSettlement);}}
  const navigation=createAsiaNavigation(root,config.industry,()=>state,navigate,choosePopulation,selectNaturalTopic,chooseFarm);
  let presentation:ReturnType<typeof createAsiaPresentation>|null=null;
  let mainStatus={message:'',error:false},presentationError='';
  function countryAtPoint(point:[number,number]){if(!mapReady||!map)return null;const layers=['asia-population-country-hit','asia-country-hit'].filter(id=>!!map!.getLayer(id));return map.queryRenderedFeatures(map.project(point),{layers})[0]?.properties.code??null;}
  function selectSettlement(id:string|null){
   if(id&&!config.presentation?.settlements?.[state.topic??'']?.categories.some(c=>c.id===id))return;
   navigate({...state,detail:id,city:null,place:null,point:null,story:null,camera:camera()},false);
  }
  function createPresentation(){presentation?.destroy();presentation=config.presentation&&$('[data-map-annotations]')?createAsiaPresentation(root,{presentation:config.presentation,regionId:config.regionId,allowSingleItem:config.regionId==='southeast-asia',presentationBase:config.presentationBase!,selectSettlement,selectFarmKinds:farms=>navigate({...state,farms,single:false,camera:camera()},false),cities:config.cities,population:config.population,riverFile:config.physical&&config.physicalBase!+config.physical.water.split('/').at(-1),riverIds:config.farmInsight?.rivers,landforms:config.physicalFocus,waterFocus:asiaWaterFocus[config.regionId],selectBasin:id=>hydrology?.select(id),selectLandform:id=>{const f=config.physicalFocus?.find(f=>f.id===id);if(f)navigate({...state,topic:'landform',detail:id,point:f.coordinates,city:null,place:f.country,camera:camera()},false);}},()=>state,selectCity,selectUrban,point=>navigate({...state,point,place:countryAtPoint(point),city:null,detail:null,story:null,camera:camera()},false),chooseFarm,message=>{presentationError=message;renderMapStatus();}):null;}
  createPresentation();

  async function fetchAsset<T>(url:string,read:(response:Response)=>Promise<T>):Promise<T> {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try {const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`${response.status}: ${url}`);return await read(response);}
    finally{clearTimeout(timer);}
  }
  const fetchJson=(url:string)=>fetchAsset(url,response=>response.json());
  const asset=(base:string,name:string)=>base+name.split('/').at(-1);
  function status(message:string,error=false) {
    mainStatus={message,error};renderMapStatus();
  }
  function renderMapStatus() {
    const message=mainStatus.error?mainStatus.message:presentationError||mainStatus.message;
    const el=$('[data-map-state]');el.textContent=message;el.hidden=!message;
    $('[data-map-retry]').hidden=!(mainStatus.error||presentationError);
  }
  const restoreIndustryExtent=(target:AsiaField)=>target==='industry'&&config.regionId==='east-asia'&&state.field==='population'&&['ethnicity','religion'].includes(state.topic??'');
  function syncFieldLinks() {
    $$<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(a=>{if(a.dataset.field===state.field)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');a.href=writeAsiaAtlasState(new URL(a.href),{...state,field:a.dataset.field as AsiaField,topic:a.dataset.field===state.field?state.topic:null,detail:a.dataset.field===state.field?state.detail:null,story:a.dataset.field===state.field?state.story:null,camera:restoreIndustryExtent(a.dataset.field as AsiaField)?null:state.camera,back:null}).href;});
  }
  function persist(push:boolean) {
    syncFieldLinks();
    const url=writeAsiaAtlasState(new URL(location.href),state);
    if(url.href===location.href)return;
    history[push?'pushState':'replaceState']({},'',url);
  }
  function navigate(next:AsiaState,fit=true) {
    const scoped=normalizeScopedIndustryState(config.industry,next);if(scoped!==next)fit=true;next=scoped;
    if(next.field!=='agriculture'||next.topic&&next.topic!=='overview')next={...next,overlay:null};
    if(next.field!=='industry')next={...next,sector:null,subsector:null};
    if(next.field==='industry')next={...next,point:next.point??config.cities.find(c=>c.id===next.city)?.coordinates??null};
    if(industry)next=industry.normalize(next);
    if(trade)next=trade.normalize(next);
    if(hydrology)next=hydrology.normalize(next);
    if(seasonal)next=seasonal.normalize(next);
    if(next.field==='population'&&['ethnicity','religion'].includes(next.topic??''))next={...next,point:null,place:null,city:null};
    if(next.field==='population')next={...next,point:next.point??config.cities.find(c=>c.id===next.city)?.coordinates??null,city:null};
    if(social)next=social.normalize(next);
    state=normalizePlaceReading(config.regionId,next);selectedClass=null;selectedPoint=state.point??null;persist(true);render();const reading=$('.asia-reading-scroll');if(reading)reading.scrollTop=0;if(fit)fitSelection();
  }
  function camera():AsiaCamera|null {if(!mapReady||!map)return state.camera;const c=map.getCenter();return{lng:c.lng,lat:c.lat,zoom:map.getZoom()};}
  function fitSelection() {
    if(!mapReady||!map)return;
    suppressCamera=true;clearTimeout(moveTimer);
    if(state.camera)map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});
    else if(hydrology?.active()&&hydrology.scene())map.jumpTo({center:hydrology.scene()!.point,zoom:5});
    else if(hydrology?.active()&&state.detail&&hydrology.detail()){const b=hydrology.detail()!.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:35,maxZoom:7,duration:0});}
    else if(state.field==='industry'&&industry?.detail()){const d=industry.detail()!;if('bounds' in d&&d.bounds){const b=d.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:35,maxZoom:7,duration:0});}else if(d.point)map.jumpTo({center:d.point,zoom:7});}
    else if(social?.active()&&social.detail()){const b=social.detail()!.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:35,maxZoom:7,duration:0});}
    else if(config.regionId!=='east-asia'&&urbanCity()){const city=urbanCity()!,b=city.detail?.bounds4326??city.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:25,maxZoom:9,duration:0});}
    else if(state.detail&&(isPhysical()||naturalTopic()==='water')){const focus=config.physicalFocus?.find(f=>f.id===state.detail),water=config.physical?.waterFeatures.find((f:any)=>f.id===state.detail);if(focus)map.jumpTo({center:focus.coordinates,zoom:5});else if(water){const b=water.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:35,maxZoom:7,duration:0});}}
    else if(state.city&&config.regionId!=='east-asia'){const c=config.cities.find(c=>c.id===state.city)!;map.jumpTo({center:c.coordinates,zoom:5});}
    else {const eastSettlement=config.regionId==='east-asia'&&state.field==='population'&&['ethnicity','religion'].includes(state.topic??'');const b=eastSettlement?[77,20,148,51]:(config.regionId==='east-asia'&&(state.city||urbanCity())?null:config.countries.find(c=>c.code===state.place)?.bounds)??config.contentExtent??config.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:eastSettlement?8:config.regionId==='east-asia'?5:12,maxZoom:9,duration:0});}
    if(config.regionId==='east-asia'&&state.field==='population'&&['ethnicity','religion'].includes(state.topic??'')){const center=map.getCenter();root.dataset.mapCamera=JSON.stringify({lng:center.lng,lat:center.lat,zoom:map.getZoom()});}
    requestAnimationFrame(()=>{suppressCamera=false;});
  }
  function industryCountryCodes(){return config.industryCountryCodes??(config.industry&&hasIndustryCountryScope(config.industry)?industryCountryChoices(config.industry).map(c=>c.code):null);}
  function selectCountry(code:string|null) {if(code===state.place)return;const scope=state.field==='industry'?industryCountryCodes():null;if(scope&&code&&!scope.includes(code))return;const topic=config.industry?.topics.find(t=>t.id===state.topic),g=config.social&&socialGroup(config.social,state);navigate({...state,place:code,city:null,camera:null,back:null,point:null,detail:trade?.active()?state.detail:null,topic:g?.country&&g.country!==code?'national-age-old':state.field==='industry'&&topic?.country&&topic.country!==code?'manufacturing':state.topic});}
  function selectCity(id:string) {const city=config.cities.find(c=>c.id===id);if(!city)return;navigate({...state,field:'natural',topic:null,detail:null,place:city.countryCode,city:id,camera:camera(),back:null,point:null},false);}
  function selectNaturalTopic(topic:string) {navigate({...state,field:'natural',topic:topic==='climate'?null:topic,detail:null,city:topic==='climate'?state.city:null,point:state.point??config.cities.find(c=>c.id===state.city)?.coordinates??null,camera:camera()},false);}
  function clearDetail() {navigate({...state,detail:null,point:null,city:null,camera:camera()},false);}
  function selectUrban(id:string){if(!id){clearDetail();return;}const city=config.population?.cities.find(c=>c.id===id);if(city)navigate({...state,field:'population',topic:'urban',detail:city.id,place:city.country,city:null,point:city.coordinates,camera:camera()},false);}
  function selectWater(id:string) {if(!id){clearDetail();return;}const water=config.physical?.waterFeatures.find((f:any)=>f.id===id);if(!water)return;navigate({...state,field:'natural',topic:'water',detail:id,city:null,point:null,camera:camera(),place:state.place&&water.countries.includes(state.place)?state.place:water.countries.length===1?water.countries[0]:null});}

  function render() {
    const city=config.cities.find(c=>c.id===state.city),country=config.countries.find(c=>c.code===state.place);
    const chartCity=naturalTopic()==='climate'?city?.id??null:null;
    if(chartCity&&chartCity!==shownChartCity){const details=root.querySelector<HTMLDetailsElement>('[data-reading-details]');if(details)details.open=true;}
    shownChartCity=chartCity;
    const urbanDetail=state.field==='population'&&state.topic==='urban'?state.detail:null;
    if(urbanDetail&&urbanDetail!==shownUrbanDetail){const details=root.querySelector<HTMLDetailsElement>('[data-reading-details]');if(details)details.open=true;shownUrbanDetail=urbanDetail;}
    countrySelect.value=state.place??'';
    const industryScope=state.field==='industry'?industryCountryCodes():null;
    for(const option of countrySelect.options){const allowed=!industryScope||!option.value||industryScope.includes(option.value);option.hidden=!allowed;option.disabled=!allowed;}
    const countryPicker=$('[data-country-picker]'),countryList=$('.asia-country-list');
    if(config.regionId==='southeast-asia'){if(countryPicker)countryPicker.hidden=state.field!=='industry';if(countryList)countryList.hidden=state.field!=='industry';}
    citySelect.value=state.city??'';
    for(const option of citySelect.options){const allowed=config.regionId==='southeast-asia'||!state.place||!option.value||option.dataset.country===state.place;option.hidden=!allowed;option.disabled=!allowed;}
    $$<HTMLButtonElement>('[data-country-button]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.countryButton===state.place));b.hidden=!!industryScope&&!industryScope.includes(b.dataset.countryButton!);});
    $$('[data-map-country]').forEach(p=>p.classList.toggle('is-selected',(p as SVGPathElement).dataset.mapCountry===state.place));
    syncFieldLinks();
    const explorer=$<HTMLElement>('[data-asia-explorer]');
    if(explorer){explorer.dataset.field=state.field;explorer.dataset.topic=state.topic??'';}
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
    const singleButton=$<HTMLButtonElement>('[data-southeast-farm-single]');
    if(singleButton){const product=config.presentation?.farming.products.find(p=>p.id===state.topic);singleButton.hidden=state.field!=='agriculture'||!product;singleButton.textContent=state.single?'全品目の分布に戻す':'この品目だけ表示';singleButton.setAttribute('aria-pressed',String(Boolean(state.single)));}
    for(const button of $$<HTMLButtonElement>('[data-natural-topic]'))button.setAttribute('aria-pressed',String(button.dataset.naturalTopic===(naturalTopic()??'climate')));
    renderPhysical();
    renderPopulation();
    renderFarming();
    industry?.render();
    hydrology?.render();
    seasonal?.render();
    social?.render();
    trade?.render();
    placeReadings.render();
    navigation.render();
    comparison.render(state);
    optionalHidden('[data-farming-selector]',state.field!=='agriculture');
    renderClass();
    renderGridReading();
    readingDock.render(state);
    learningLayout.render(state);
    for(const item of markers){item.button.hidden=!climate;item.button.setAttribute('aria-pressed',String(item.city.id===state.city));item.button.style.opacity=!state.place||item.city.countryCode===state.place?'1':'.45';}
    if(pointLabel){pointLabel.hidden=!selectedPoint||state.field==='agriculture'||state.field==='industry'||!!hydrology?.active()||!!seasonal?.active()||(state.field==='population'&&['ethnicity','religion'].includes(state.topic??''))||naturalTopic()==='climate';if(selectedPoint){pointMarker?.setLngLat(selectedPoint);pointLabel.textContent=config.countries.find(c=>c.code===state.place)?.name??'選択した地点';}}
    if(mapReady&&map){map.setFilter('asia-country-selected',['==',['get','code'],state.city?'':state.place??'']);void showField();}
    requestAnimationFrame(syncLayout);
  }
  function renderClass() {
    const classification=config.classes.find(c=>c.id===selectedClass);
    const city=config.cities.find(c=>c.id===state.city);
    const cityClass=city&&climateGrid?config.classes.find(c=>c.id===gridCellAt(climateGrid,...city.coordinates)):null;
    if(city){
      const panel=$$('[data-city-panel]').find(p=>p.dataset.cityPanel===city.id);
      const code=panel?.querySelector('[data-city-class-code]'),name=panel?.querySelector('[data-city-class-name]'),description=panel?.querySelector('[data-city-class-description]');
      if(code)code.textContent=cityClass?.code??'';
      if(name)name.textContent=cityClass?.name??(climateGrid?'気候区分：この地点は未分類':'気候区分：未取得');
      if(description)description.textContent=city.id==='tokyo'&&cityClass?.code==='Cfa'?'採用するBeck et al.（2023）のKöppen–Geiger分類では、乾燥気候Bを先に判定します。Cは最寒月平均が0℃超・18℃未満、aは最暖月平均22℃以上。fは乾季条件s・wのどちらにも該当しない区分です。北半球の夏半年は4–9月、冬半年は10–3月。sは夏の最少雨月40mm未満かつ冬の最多雨月の3分の1未満、wは冬の最少雨月が夏の最多雨月の10分の1未満。Bの判定は年降水量（mm）が20×年平均気温（℃）＋季節配分による補正（夏に70％以上なら280、冬に70％以上なら0、それ以外は140）未満。これは観測所ではなく地図格子の区分です。':cityClass?.description??(climateGrid?'海岸や小島など、広域格子では分類値がない地点もあります。':'');
    }
    $('[data-class-reading]').hidden=naturalTopic()!=='climate'||!classification||Boolean(city&&cityClass?.id===classification.id);
    $$('[data-climate-class]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.climateClass)===selectedClass)));
    if(!state.city)$('[data-overview]').hidden=naturalTopic()!=='climate'||Boolean(classification);
    if(!classification)return;
    $('[data-class-code]').textContent=classification.code;$('[data-class-name]').textContent=classification.name;$('[data-class-description]').textContent=classification.description;
  }
  function renderGridReading() {
    if(state.field==='industry'||hydrology?.active()||seasonal?.active()||social?.active())return;
    if(state.field==='population'&&['ethnicity','religion'].includes(state.topic??'')){$('[data-grid-reading]').textContent=config.regionId==='east-asia'&&state.topic==='religion'&&!state.detail?'地図上の色帯は各国の宗教回答の構成です。中国の二つの数値は別の質問で、色帯に合算していません。背景の灰色は無宗教を示しません。':'面は掲載した集団の居住域の概略です。灰色は居住域の重なり、色のない地域は未分類です。';return;}
    if(farmingTopic()==='overview'){$('[data-grid-reading]').textContent='作物と家畜の特徴的な分布を同時に表示しています。品目名を選ぶと詳しい分布を読めます。';return;}
    const farm=farmingLayer();
    if(farm){
      const point=selectedPoint??config.cities.find(c=>c.id===state.city)?.coordinates,grid=farm.grid?farmingGrids.get(farm.grid):null;
      let message=farm.kind==='forest'?'森林は提供元の参考画像です。地点の数値は計算せず、国別の面積・木材生産量を下の統計で表示します。':'品目名・畜産の点から分布を選べます。雨温図などから同じ場所へ切り替えた場合は、その格子の推計値を表示します。';
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
    let text=state.field==='natural'?'地図上の陸地を選ぶと、気候区分を確認できます。':'品目名から米の分布を選べます。雨温図などから同じ場所へ切り替えると、格子内の米の収穫面積を確認できます。';
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
    const settlement=state.field==='population'&&['ethnicity','religion'].includes(state.topic??'');
    for(const e of $$<HTMLElement>('[data-settlement-reading]'))e.hidden=!settlement||e.dataset.settlementReading!==state.topic;
    for(const e of $$<HTMLElement>('[data-settlement-legend]'))e.hidden=!settlement||e.dataset.settlementLegend!==state.topic;
    for(const e of $$<HTMLElement>('[data-religion-overview-key]'))e.hidden=!!state.detail;
    const active=state.field==='population'&&!social?.active()&&!settlement;
    for(const e of $$<HTMLElement>('[data-settlement-overview]'))e.hidden=!!state.detail;
    for(const e of $$<HTMLElement>('[data-settlement-detail]'))e.hidden=!settlement||e.dataset.settlementTopic!==state.topic||e.dataset.settlementDetail!==state.detail;
    for(const e of $$<HTMLElement>('[data-settlement-choice]'))e.setAttribute('aria-pressed',String(settlement&&e.dataset.settlementTopic===state.topic&&e.dataset.settlementChoice===state.detail));
    if(settlement){const eastReligion=config.regionId==='east-asia'&&state.topic==='religion';$('[data-map-eyebrow]').textContent=eastReligion?'Population · Survey 2023 / Census 2020':'Population · Settlement areas · 2020';$('[data-map-period]').textContent=eastReligion?'調査対象・質問を国ごとに確認':'掲載集団の居住域';$('[data-map-title]').textContent=state.topic==='ethnicity'?'民族の居住域':eastReligion?'東アジアの宗教調査':'宗教と結びついた居住域';$('[data-map-gesture]').textContent=eastReligion?'日本・韓国・台湾の成人調査とモンゴルの国勢調査を右側で読み、GeoEPRの限定事例は下の一覧から選べます。':'色面や名称を選ぶと輪郭を強調し、右側にその分布の説明を表示します。';$('[data-grid-reading]').textContent=eastReligion?state.detail?'GeoEPRの限定事例を選択中です。色面は住民の宗教割合ではありません。':'日本・韓国・台湾の成人調査とモンゴルの国勢調査を分けて読みます。灰色は宗教なしではありません。':state.detail?'選択した居住域を強調しています。':'色面は資料に掲載された居住域です。無着色は人口0を意味しません。';}
    for(const selector of ['[data-population-reading]','[data-population-legend]'])optionalHidden(selector,!active);
    optionalHidden('[data-population-topics]',state.field!=='population');
    if(!active||!config.population)return;
    const selectedCity=config.population.cities.find(c=>state.point&&Math.abs(c.coordinates[0]-state.point[0])<.001&&Math.abs(c.coordinates[1]-state.point[1])<.001);
    const city=state.topic==='urban'?urbanCity():undefined,reading=asiaPopulationReading[config.regionId],country=config.countries.find(c=>c.code===state.place),record=populationRaster()!;
    const topic=$<HTMLSelectElement>('[data-population-topic]');if(topic)topic.value=state.topic??'density';
    $('[data-map-title]').textContent=state.topic==='urban'?'都市の広がりと人口':'人口の分布';$('[data-map-eyebrow]').textContent='Population · 2020';$('[data-map-period]').textContent='推計人口 / 格子面積';
    const gesture=$('[data-map-gesture]');if(gesture)gesture.textContent='都市の点で都市の範囲と人口を、陸地の地点で2020年の格子密度を表示します。都市選択では地図の位置と縮尺を保ちます。';
    $('[data-population-title]').textContent=city?`${city.name}の人口を読む`:country?`${country.name}の人口分布を読む`:'人口の分布を読む';
    $('[data-population-takeaway]').textContent=city?`${city.name}の都市範囲に、2020年には約${Math.round(city.population).toLocaleString('ja-JP')}人が暮らしていたと推計されています。範囲は2025年の資料によるもので、市区町村の境界とは異なります。`:reading.takeaway;
    $('[data-population-detail]').textContent=city?(asiaUrbanReading[city.sourceName]??`${city.name}の輪郭の内側と外側で、人口が集中する場所を比べてください。広域図は5km格子を使うため、細かい街区の比較には適しません。人口の表は地図の色から合計した値ではなく、資料がこの都市範囲に対して公表した推計値です。`):reading.reading;
    const cityNote=$('[data-population-city-note]');if(cityNote){cityNote.hidden=!selectedCity||!indiaPopulationLabels[selectedCity.id];cityNote.textContent=selectedCity?indiaPopulationLabels[selectedCity.id]??'':'';}
    const select=$<HTMLSelectElement>('[data-population-city]');select.value=city?.id??'';
    for(const option of select.options){const allowed=!state.place||!option.value||option.dataset.country===state.place;option.hidden=!allowed;option.disabled=!allowed;}
    const coverage=state.place?config.population.countryCoverage[state.place]:null;
    $('[data-population-coverage]').textContent=coverage?`${country?.name}について、資料中の${coverage.sourceUrbanCentres.toLocaleString('ja-JP')}都市のうち${coverage.listedUrbanCentres}都市を一覧に掲載しています。全国の合計人口を示すものではありません。`:`この地域では${config.population.cities.length}都市を一覧に掲載しています。全都市の一覧ではありません。`;
    $('[data-population-resolution]').textContent=city?.detail?'この都市の詳細図は1kmの元格子を使っています。詳細図の外側には広域図を表示しています。':'広域図は5×5個の1km格子をまとめています。拡大しても、元の1km格子の細かさに戻るわけではありません。';
    optionalHidden('[data-population-city-facts]',!city);
    if(city){
      $('[data-urban-population]').textContent=`約${Math.round(city.population).toLocaleString('ja-JP')} 人`;$('[data-urban-area]').textContent=`${city.areaKm2.toLocaleString('ja-JP')} km²`;$('[data-urban-density]').textContent=city.density===null?'資料に値がありません':`${Math.round(city.density).toLocaleString('ja-JP')} 人/km²`;
      const table=$('[data-urban-history]');table.replaceChildren();for(const [year,value] of Object.entries(city.history)){if(config.regionId==='east-asia'&&Number(year)>2020)continue;const row=document.createElement('tr'),label=document.createElement('th'),cell=document.createElement('td');label.scope='row';label.textContent=`${year}年`;cell.textContent=value===null?'資料に値がありません':Math.round(value).toLocaleString('ja-JP');row.append(label,cell);table.append(row);}
    }
    if(selectedPoint&&!populationGrids.has(record.grid))void loadPopulationGrid(record).then(()=>{if(state.field==='population'&&!social?.active())renderGridReading();}).catch(()=>{if(state.field==='population'&&!social?.active()&&populationRaster()?.grid===record.grid){const message='人口の数値を取得できませんでした。再読み込みをお試しください。';$('[data-population-value]').textContent=message;status(message,true);}});
  }
  async function loadFarmingGrid(record:AsiaFarmingLayer) {
    if(!record.grid)return null;const key=record.grid;
    if(farmingGrids.has(key))return farmingGrids.get(key)!;
    if(!farmingPromises.has(key))farmingPromises.set(key,fetchAsset(asset(config.farmingBase!,key),async response=>decodeAsiaNumericGrid(new Uint8Array(await response.arrayBuffer()),record,'float32',-1)).then(grid=>{
      // A late response for a previous topic must not refill the retained cache.
      if(farmingLayer()?.grid===key){farmingGrids.clear();farmingGrids.set(key,grid);}
      return grid;
    }).finally(()=>farmingPromises.delete(key)));
    return farmingPromises.get(key)!;
  }
  async function loadFarmingStatistics(){
    if(farmingStatistics)return farmingStatistics;
    farmingStatisticsPromise??=fetchAsset(asset(config.farmingBase!,'statistics.json.gz'),async response=>{const bytes=new Uint8Array(await response.arrayBuffer());const decoded=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);return JSON.parse(decoded) as AsiaFarmStatistics;}).then(data=>{farmingStatistics=data;farmingStatisticsError=false;return data;}).catch(error=>{farmingStatisticsPromise=null;farmingStatisticsError=true;throw error;});
    return farmingStatisticsPromise;
  }
  function renderFarming(){
    const active=state.field==='agriculture',layer=farmingLayer(),topic=farmingTopic();
    renderSouthCentralFarmConnections(root,config.regionId,active,topic,config.countries.find(c=>c.code===state.place));
    renderEastAsiaFarmFoundations(root,config.regionId,active,topic,config.countries.find(c=>c.code===state.place));
    for(const key of farmingGrids.keys())if(key!==layer?.grid)farmingGrids.delete(key);
    optionalHidden('[data-farm-switches]',!active||topic!=='overview'||state.overlay==='water');
    optionalHidden('[data-farming-topics]',true);optionalHidden('[data-farming-panel]',!active||topic==='overview');optionalHidden('[data-farm-overview-reading]',!active||topic!=='overview');optionalHidden('[data-farm-overview-legend]',!active||layer?.kind==='forest');optionalHidden('[data-farming-legend]',!layer||!!config.presentation&&layer.kind!=='forest');
    if(!active||!config.farming)return;
    const select=$<HTMLSelectElement>('[data-farming-topic]');if(select)select.value=topic!;
    for(const b of $$<HTMLButtonElement>('[data-farm-choice]'))b.setAttribute('aria-pressed',String(b.dataset.farmChoice===topic));
    const water=topic==='overview'&&state.overlay==='water';
    for(const c of $$<HTMLInputElement>('[data-farm-kind]'))c.disabled=topic!=='overview'||water;
    for(const b of $$<HTMLButtonElement>('[data-farm-water]'))b.setAttribute('aria-pressed',String(water));
    if(config.farmInsight){$('[data-farm-insight-title]').textContent=water?config.farmInsight.waterTitle:config.farmInsight.title;$('[data-farm-insight-lead]').textContent=water?config.farmInsight.waterLead:config.farmInsight.lead;}
    const farmReturn=$('[data-farm-choice="overview"]');if(farmReturn)farmReturn.hidden=topic==='overview';
    optionalHidden('[data-farm-density-key]',!active||topic!=='overview'||water);
    if(topic==='overview'){$('[data-map-title]').textContent=water?'米の栽培域・雨・川':'農畜産物の特徴的な分布';$('[data-map-gesture]').textContent=water?'緑は米の概略栽培域、青の太線は主な川、細線は250mm間隔の年降水量です。':'品目名を選ぶと詳しい分布を開きます。地図は2本指で移動・拡大できます。';return;}
    renderAsiaFarmingPanel(root,config.regionId,topic!,layer,config.countries.find(c=>c.code===state.place),farmingStatistics);
    optionalHidden('[data-farming-statistics-retry]',!farmingStatisticsError);
    if(farmingStatisticsError&&state.place)$('[data-farming-statistics-status]').textContent='統計を取得できませんでした。再読み込みをお試しください。';
    if(state.place&&!farmingStatistics&&!farmingStatisticsError)void loadFarmingStatistics().then(()=>{if(state.field==='agriculture')renderFarming();}).catch(()=>{if(state.field==='agriculture')renderFarming();});
    if(!layer)return;
    $('[data-map-title]').textContent=layer.title;$('[data-map-eyebrow]').textContent='Agriculture & Forestry · 2020';$('[data-map-period]').textContent=layer.unit??'森林の参考図';
    $('[data-map-gesture]').textContent=config.regionId==='southeast-asia'?(layer.kind==='forest'?'林業の分布と資料の説明を右で読めます。地図は2本指で移動・拡大できます。':'品目名・畜産の点から分布を選びます。背景のクリックでは選択を変えません。地図は2本指で移動・拡大できます。'):layer.kind==='forest'?'国の選択欄から森林面積と木材の統計を読めます。地図は2本指で移動・拡大できます。':'品目名・畜産の点から分布を選び、国の選択欄から公表統計を読めます。背景のクリックでは選択を変えません。地図は2本指で移動・拡大できます。';
    $('[data-farming-legend-title]').textContent=layer.kind==='forest'?'森林の分布（2020年・参考画像）':`${layer.title}（${layer.unit}・2020年）`;
    const scale=$('[data-farming-scale]');scale.replaceChildren();
    for(const [i,color] of (layer.colors??['4d9221']).entries()){const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor='#'+color;const breaks=layer.breaks??[],label=layer.kind==='forest'?'資料で森林と分類された場所':i===0?`0より大きく${breaks[0]}未満`:i===breaks.length?`${breaks[i-1].toLocaleString('ja-JP')}以上`:`${breaks[i-1].toLocaleString('ja-JP')}以上${breaks[i].toLocaleString('ja-JP')}未満`;item.append(swatch,document.createTextNode(label));scale.append(item);}
    $('[data-farming-legend-note]').textContent=layer.kind==='forest'?'提供元が描いた画像を表示しています。元資料の10m分類をこの広域図で読み分けられるわけではありません。色から森林面積は計算しません。':'色がない場所は、推計0・欠測・海を含みます。同じ場所の比較で示す地点値は0と欠測を区別します。元資料は5分角（南北で約9km）で、拡大しても畑や農場を特定できません。';
    if((selectedPoint||state.city)&&layer.grid&&!farmingGrids.has(layer.grid))void loadFarmingGrid(layer).then(()=>{if(farmingLayer()?.id===layer.id)renderGridReading();}).catch(()=>{if(farmingLayer()?.id===layer.id){const message='選択した主題の数値を取得できませんでした。再読み込みをお試しください。';$('[data-farming-value]').textContent=message;status(message,true);}});
  }
  function renderPhysical() {
    const physical=isPhysical();
    optionalHidden('[data-physical-reading]',!physical);optionalHidden('[data-physical-legend]',!physical);root.dataset.physicalView=naturalTopic()??'';
    const gesture=$('[data-map-gesture]');if(gesture)gesture.textContent=physical?'地形の着目点・河川・湖は一覧からも選べます。地図は2本指で移動・拡大できます。':state.field==='natural'?'都市の点を選ぶと雨温図が開きます。地図は2本指で移動・拡大できます。':'品目名から米の分布を選びます。雨温図などから同じ場所を比較すると米の収穫面積を表示します。背景クリックでは選択を変えません。地図は2本指で移動・拡大できます。';
    if(!physical||!config.physical)return;
    const bands=naturalTopic()==='terrain'?config.presentation?.terrain?.bands:undefined;
    if(physicalKey){if(bands){physicalKey.replaceChildren();for(const band of contourBandLabels(bands)){const span=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=band.color;span.append(swatch,document.createTextNode(band.label));physicalKey.append(span);}}else physicalKey.innerHTML=physicalKeyHTML??'';}
    if(physicalLegendNote)physicalLegendNote.textContent=(physicalLegendText??'')+(bands?' 色帯も500mごとで、線と同じ平滑化した表示値から作っています。地点の標高は平滑化前の原格子値です。':'');
    const physicalMethod=root.querySelector<HTMLElement>('[data-physical-reading] .asia-method');
    if(physicalMethod){let note=physicalMethod.querySelector<HTMLElement>('[data-terrain-band-method]');if(bands&&!note){note=document.createElement('p');note.dataset.terrainBandMethod='';physicalMethod.querySelector('p')?.before(note);}if(note){note.hidden=!bands;note.textContent='この標高図の線と色帯は、原格子を投影座標上の半径約6kmでならした同じ値から500mごとに補間しています。短い線を省かず、線と面を別々に簡略化しません。下記の短い線と細部の省略は従来の地形表示の生成方法です。地点の標高は平滑化前の原格子値です。';}}
    const landform=naturalTopic()==='landform',waterTopic=naturalTopic()==='water',reading=asiaPhysicalReading[config.regionId];
    $('[data-map-title]').textContent=waterTopic?'河川・湖と地形':landform?'山地・高原・平野の位置':'標高と等高線';
    $('[data-map-eyebrow]').textContent='Terrain · ETOPO 2022';$('[data-map-period]').textContent=landform?'地形の着目点 · 背景は標高':'標高 m · 500m等高線';
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
    const revision=++fieldRevision,natural=naturalTopic()==='climate',rice=farmingTopic()==='rice',physical=isPhysical(),water=['water','basins','groundwater'].includes(naturalTopic()??'');
    // Hide the previous field before awaiting geography or any other asset.
    if(!seasonal?.active())seasonal?.hide();
    void presentation?.show(map);
    map.setLayoutProperty('asia-climate','visibility',natural?'visible':'none');
    if(rice&&!config.presentation&&!map.getSource('asia-rice')){
      map.addSource('asia-rice',{type:'image',url:asset(config.agricultureBase,riceLayer.imageUrl),coordinates:riceLayer.coordinates as [number,number][]});
      map.addLayer({id:'asia-rice',type:'raster',source:'asia-rice',paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');
    }
    if(map.getLayer('asia-rice'))map.setLayoutProperty('asia-rice','visibility',rice&&!config.presentation?'visible':'none');
    const selectedFarm=farmingLayer(),farm=!config.presentation||selectedFarm?.kind==='forest'?selectedFarm:undefined;
    for(const layer of config.farming?.layers??[]){
      if(layer.id===farm?.id)continue;
      const id='asia-farming-'+layer.id;
      if(map.getLayer(id))map.removeLayer(id);
      if(map.getSource(id))map.removeSource(id);
    }
    if(farm&&!map.getSource('asia-farming-'+farm.id)){const id='asia-farming-'+farm.id;map.addSource(id,{type:'image',url:asset(config.farmingBase!,farm.image),coordinates:farm.imageCoordinates});map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');}
    for(const layer of config.farming?.layers??[]){const id='asia-farming-'+layer.id;if(map.getLayer(id))map.setLayoutProperty(id,'visibility',farm?.id===layer.id?'visible':'none');}
    if(!physical)for(const id of ['asia-terrain','asia-contours'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
    if(!water)for(const id of ['asia-lakes','asia-rivers','asia-rivers-hit','asia-water-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
    const population=state.field==='population'&&!!config.population&&!social?.active()&&!['ethnicity','religion'].includes(state.topic??''),urban=population&&state.topic==='urban',selectedUrban=urbanCity();
    if(population){
      for(const [id,record] of [['asia-population',config.population],...(selectedUrban?.detail?[[`asia-population-${selectedUrban.id}`,selectedUrban.detail]]:[])] as [string,AsiaPopulationRaster][]){
        if(!map.getSource(id)){map.addSource(id,{type:'image',url:asset(config.populationBase!,record.image),coordinates:record.imageCoordinates});map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');}
      }
      if(!map.getSource('asia-urban-points')){
        map.addSource('asia-urban-points',{type:'geojson',data:{type:'FeatureCollection',features:config.population!.cities.map(c=>({type:'Feature',properties:{id:c.id,name:c.name},geometry:{type:'Point',coordinates:c.coordinates}}))}});
        map.addLayer({id:'asia-urban-points',type:'circle',source:'asia-urban-points',paint:{'circle-radius':config.regionId==='east-asia'?3:5,'circle-color':'#fff','circle-stroke-color':'#173b60','circle-stroke-width':config.regionId==='east-asia'?1:2}});
        map.addLayer({id:'asia-urban-hit',type:'circle',source:'asia-urban-points',paint:{'circle-radius':14,'circle-opacity':0}});
      }
    }
    for(const id of ['asia-population',...(config.population?.cities.filter(c=>c.detail).map(c=>`asia-population-${c.id}`)??[])])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',population&&(id==='asia-population'||id===`asia-population-${selectedUrban?.id}`)?'visible':'none');
    for(const id of ['asia-urban-points','asia-urban-hit'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',population?'visible':'none');
    for(const id of ['asia-urban-boundary','asia-urban-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',population&&(urban||!!selectedUrban)?'visible':'none');
    const populationGeographyVisibility=()=>{
      if(!map)return;const detailed=(population||social?.active()||!!farm||state.field==='industry'||hydrology?.active()||seasonal?.active())&&!!map.getSource('asia-population-geography');
      // The detailed file clips neighbouring countries to its own coverage.
      // Keep the existing world land/context under it in South/Central Asia:
      // a wider full-region fit must not turn omitted context land into ocean.
      for(const id of ['asia-land','asia-context','asia-context-border','asia-country-hit','asia-country-border','asia-country-selected'])map.setLayoutProperty(id,'visibility',detailed&&!(config.regionId==='south-central-asia'&&['asia-land','asia-context','asia-context-border'].includes(id))?'none':'visible');
      for(const id of ['asia-population-land','asia-population-context','asia-population-country-hit','asia-population-border','asia-population-country-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',detailed?'visible':'none');
      if(map.getLayer('asia-population-country-selected'))map.setFilter('asia-population-country-selected',['==',['get','code'],state.city||hydrology?.active()?'':state.place??'']);
    };
    populationGeographyVisibility();
    if((population||social?.active()||farm||state.field==='industry'||hydrology?.active()||seasonal?.active())&&config.population?.geography&&!map.getSource('asia-population-geography')){
      try{
        populationGeographyPromise??=fetchJson(asset(config.populationBase!,config.population.geography)).catch(error=>{populationGeographyPromise=null;throw error;});const data=await populationGeographyPromise;
        if(revision!==fieldRevision||!mapReady||!map)return;
        if(!map.getSource('asia-population-geography')){
          map.addSource('asia-population-geography',{type:'geojson',data});
          map.addLayer({id:'asia-population-land',type:'fill',source:'asia-population-geography',paint:{'fill-color':'#e1e4db'}},'asia-climate');
          map.addLayer({id:'asia-population-context',type:'fill',source:'asia-population-geography',filter:['==',['get','target'],false],paint:{'fill-color':'#d7dad5'}},'asia-country-border');
          map.addLayer({id:'asia-population-country-hit',type:'fill',source:'asia-population-geography',filter:['==',['get','target'],true],paint:{'fill-opacity':0}},'asia-country-border');
          map.addLayer({id:'asia-population-border',type:'line',source:'asia-population-geography',...(config.regionId==='south-central-asia'?{filter:['==',['get','target'],true]}:{}),paint:{'line-color':'#5b7077','line-width':.65}},'asia-country-border');
          map.addLayer({id:'asia-population-country-selected',type:'line',source:'asia-population-geography',filter:['==',['get','code'],state.place??''],paint:{'line-color':'#304954','line-width':1.3}},'asia-country-border');
        }
        populationGeographyVisibility();
      }catch{if(revision===fieldRevision)status('詳細な海岸線を取得できませんでした。概略の国境と都市の表は引き続き読めます。',true);}
    }
    if(revision===fieldRevision&&map)void industry?.show(map);
    if(revision===fieldRevision&&map)void hydrology?.show(map);
    if(revision===fieldRevision&&map)void seasonal?.show(map);
    if(revision===fieldRevision&&map)void social?.show(map);
    if(revision===fieldRevision&&map)void trade?.show(map);
    if(revision===fieldRevision&&map)void comparison.show(map);
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
    for(const id of ['asia-terrain','asia-contours'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',physical&&!(naturalTopic()==='terrain'&&config.presentation?.terrain?.bands)&&!(id==='asia-contours'&&(naturalTopic()==='landform'||!!config.presentation?.terrain))?'visible':'none');
    if(map.getLayer('asia-terrain'))map.setPaintProperty('asia-terrain','raster-opacity',naturalTopic()==='terrain'&&config.presentation?.terrain? .3:1);
    for(const id of ['asia-lakes','asia-rivers','asia-rivers-hit','asia-water-selected'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',water?'visible':'none');
    if(water&&config.physical&&!map.getSource('asia-water')){
      try{
        waterPromise??=fetchJson(asset(config.physicalBase!,config.physical.water)).catch(error=>{waterPromise=null;throw error;});
        const data=await waterPromise;presentation?.setRivers(data);
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
    const note=document.createElement('p');note.textContent='色なし：1ha未満・推計0・データなしを含みます。雨温図などから同じ場所を比較すると、地点値で区別できます。';scale.append(keys,note);
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
      if(map){createPresentation();markers.splice(0).forEach(m=>m.marker.remove());pointMarker?.remove();pointMarker=null;pointLabel=null;map.remove();map=null;}
      mapReady=false;lib.setWorkerUrl(workerUrl);lib.setWorkerCount(1);
      map=new lib.Map({container:$('[data-map-surface]'),attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,maxPitch:0,trackResize:false,maxZoom:9,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),cooperativeGestures:true,locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は2本指で動かせます'},bounds:[[config.bounds[0],config.bounds[1]],[config.bounds[2],config.bounds[3]]],fitBoundsOptions:{padding:20},maxBounds:config.regionId==='south-central-asia'?undefined:[[Math.max(-180,navigationBounds[0]-15),Math.max(-80,navigationBounds[1]-15)],[Math.min(180,navigationBounds[2]+15),Math.min(80,navigationBounds[3]+15)]],style:{version:8,sources:{'asia-land':{type:'geojson',data:lands},'asia-countries':{type:'geojson',data:selected},'asia-context':{type:'geojson',data:nearby},'asia-climate':{type:'image',url:asset(config.climateBase,region.image),coordinates:region.imageCoordinates}},layers:[{id:'asia-ocean',type:'background',paint:{'background-color':'#e6eef0'}},{id:'asia-land',type:'fill',source:'asia-land',paint:{'fill-color':'#e1e4db'}},{id:'asia-climate',type:'raster',source:'asia-climate',paint:{'raster-opacity':1,'raster-resampling':'nearest','raster-fade-duration':0}},{id:'asia-context',type:'fill',source:'asia-context',paint:{'fill-color':'#d7dad5'}},{id:'asia-context-border',type:'line',source:'asia-context',paint:{'line-color':'#f6f6ee','line-width':.65}},{id:'asia-country-hit',type:'fill',source:'asia-countries',paint:{'fill-opacity':0}},{id:'asia-country-border',type:'line',source:'asia-countries',paint:{'line-color':'#354c56','line-opacity':.6,'line-width':.8}},{id:'asia-country-selected',type:'line',source:'asia-countries',filter:['==',['get','code'],''],paint:{'line-color':'#28363d','line-width':2.6}}]}});
      map.scrollZoom.disable();map.touchZoomRotate.disableRotation();
      map.once('load',()=>{
        if(currentAttempt!==attempt)return;
        clearTimeout(timeout);mapReady=true;$('[data-map-fallback]').hidden=true;if(!sourceFailed)status('');
        pointLabel=document.createElement('span');pointLabel.className='asia-point-marker';pointLabel.hidden=true;
        pointMarker=new lib.Marker({element:pointLabel,anchor:'bottom'}).setLngLat([config.bounds[0],config.bounds[1]]).addTo(map!);
        if(!presentation)for(const city of config.cities){
          const button=document.createElement('button');button.type='button';button.className='asia-city-marker';button.setAttribute('aria-label',`${city.name}の雨温図`);button.dataset.mapCity=city.id;
          const dot=document.createElement('i'),label=document.createElement('span');dot.setAttribute('aria-hidden','true');label.textContent=city.name;button.append(dot,label);
          button.addEventListener('click',event=>{event.stopPropagation();selectCity(city.id);});
          const marker=new lib.Marker({element:button,anchor:'left'}).setLngLat(city.coordinates).addTo(map!);markers.push({city,button,marker});
        }
        render();syncLayout();fitSelection();root.dataset.mapReady='true';root.dataset.mapLoadMs=String(Math.round(performance.now()-initialStarted));
      });
      map.on('click',async event=>{
        if(!mapReady||!map)return;
        // Crop/livestock keys and the labelled product points own agriculture
        // selection. A click on the unrelated background cannot select a country.
        if(state.field==='agriculture')return;
        if(state.field==='population'&&['ethnicity','religion'].includes(state.topic??'')){const hit=map.getLayer('asia-settlement-fill')?map.queryRenderedFeatures(event.point,{layers:['asia-settlement-fill']})[0]:null;selectSettlement(hit?.properties.id??null);return;}
        if(social?.active()){
          if(social.hit(event.point,[event.lngLat.lng,event.lngLat.lat]))return;
          const hit=map.queryRenderedFeatures(event.point,{layers:[map.getSource('asia-population-geography')?'asia-population-country-hit':'asia-country-hit']})[0];
          if(hit?.properties.code)selectCountry(hit.properties.code);return;
        }
        if(state.field==='industry'){
          if(industry?.hit(event.point))return;
          if(config.regionId==='south-central-asia')return;
          const contextHit=map.queryRenderedFeatures(event.point,{layers:[map.getSource('asia-population-geography')?'asia-population-context':'asia-context']})[0];
          if(contextHit?.properties.code&&!context.countries.includes(contextHit.properties.code))return;
          const hit=map.queryRenderedFeatures(event.point,{layers:[map.getSource('asia-population-geography')?'asia-population-country-hit':'asia-country-hit']})[0];
          if(hit?.properties.code)selectCountry(hit.properties.code);return;
        }
        if(hydrology?.active()){
          const point:[number,number]=[event.lngLat.lng,event.lngLat.lat];
          if(naturalTopic()==='precipitation'){
            navigate({...state,point,detail:null,story:null,city:null,camera:camera()},false);return;
          }
          // Basin/aquifer features remain selectable; empty background leaves
          // the selected water system and its highlighted river unchanged.
          if(naturalTopic()==='water'&&map.getLayer('asia-rivers-hit')){
            const river=map.queryRenderedFeatures(event.point,{layers:['asia-rivers-hit','asia-lakes']})[0];
            if(river?.properties.id){selectWater(river.properties.id);return;}
          }
          hydrology.hit(event.point,point);return;
        }
        if(state.field==='population'||farmingLayer()||hydrology?.active()||seasonal?.active()){
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
        const hit=map.queryRenderedFeatures(event.point,{layers:[(state.field==='population'||farmingLayer()||hydrology?.active()||seasonal?.active())&&map.getSource('asia-population-geography')?'asia-population-country-hit':'asia-country-hit']})[0];
        if(hydrology?.active()&&hydrology.hit(event.point,[event.lngLat.lng,event.lngLat.lat],hit?.properties.code))return;
        // Southeast climate/elevation cells are meaningful only on target land.
        // Gray countries and sea must retain the current city or landform.
        if(config.regionId==='southeast-asia'&&state.field==='natural'&&!hit?.properties.code)return;
        selectedPoint=[event.lngLat.lng,event.lngLat.lat];
        const keepUrban=state.field==='population'&&(!hit?.properties.code||hit.properties.code===state.place);
        state={...state,point:selectedPoint,place:hit?.properties.code??null,city:null,detail:keepUrban||seasonal?.active()?state.detail:null,story:null,camera:camera()};persist(true);render();
        if(hydrology?.active()||seasonal?.active())return;
        if(farmingLayer()){const layer=farmingLayer()!;try{await loadFarmingGrid(layer);if(farmingLayer()?.id===layer.id)renderGridReading();}catch{if(farmingLayer()?.id===layer.id)status('選択した主題の数値を取得できませんでした。再読み込みをお試しください。',true);}return;}
        if(state.field==='population'){const record=populationRaster()!;try{await loadPopulationGrid(record);if(state.field==='population'&&!social?.active())renderGridReading();}catch{if(state.field==='population'&&!social?.active()&&populationRaster()?.grid===record.grid)status('人口の数値を取得できませんでした。再読み込みをお試しください。',true);}return;}
        if(isPhysical()){try{await loadPhysicalGrid();if(isPhysical())renderGridReading();}catch{if(isPhysical())status('標高の数値を取得できませんでした。再読み込みをお試しください。',true);}}
        else if(state.field==='natural'){try{await loadClimateGrid();if(naturalTopic()==='climate')renderGridReading();}catch{if(naturalTopic()==='climate')status('気候の数値を取得できませんでした。再読み込みをお試しください。',true);}}
        else {try{await loadRiceGrid();if(farmingTopic()==='rice')renderGridReading();}catch{if(farmingTopic()==='rice')status('米の数値を取得できませんでした。気候の表示は利用できます。',true);}}
      });
      // Our ResizeObserver owns sizing (trackResize is false). MapLibre emits
      // moveend on resize too; that event must not turn an automatic fit into
      // a saved camera and prevent the next width change from fitting again.
      map.on('moveend',event=>{if(config.regionId==='east-asia'&&state.field==='population'&&['ethnicity','religion'].includes(state.topic??'')){const center=map!.getCenter();root.dataset.mapCamera=JSON.stringify({lng:center.lng,lat:center.lat,zoom:map!.getZoom()});}if(event.asiaLayoutResize||suppressCamera||!mapReady)return;clearTimeout(moveTimer);moveTimer=setTimeout(()=>{state={...state,camera:camera()};persist(false);},120);});
      map.on('error',event=>{if(currentAttempt!==attempt)return;if(event.sourceId?.startsWith('asia-seasonal-precipitation-m-'))return;sourceFailed=true;console.warn('Asia map asset failed',event.error?.message);status('地図の一部を読み込めませんでした。都市の図表・出典は引き続き読めます。',true);});
      map.getCanvas().addEventListener('webglcontextlost',()=>{mapReady=false;$('[data-map-fallback]').hidden=false;root.dataset.mapReady='false';status('地図の描画が停止しました。国の一覧と都市の図表は利用できます。',true);},{once:true});
    }catch(error){console.warn('Asia map unavailable',error);$('[data-map-fallback]').hidden=false;status('詳細地図を読み込めませんでした。国の位置と都市の図表は利用できます。',true);}
    finally{starting=false;}
  }
  for(const b of $$<HTMLButtonElement>('[data-settlement-choice]'))b.addEventListener('click',()=>selectSettlement(b.dataset.settlementChoice!));
  for(const b of $$<HTMLButtonElement>('[data-settlement-clear]'))b.addEventListener('click',()=>selectSettlement(null));
  countrySelect.addEventListener('change',()=>selectCountry(countrySelect.value||null));
  for(const button of $$<HTMLButtonElement>('[data-natural-topic]'))button.addEventListener('click',()=>selectNaturalTopic(button.dataset.naturalTopic!));
  $$<HTMLButtonElement>('[data-southeast-farm-single]').forEach(button=>button.addEventListener('click',()=>navigate({...state,single:!state.single,farms:null,camera:camera()},false)));
  $<HTMLSelectElement>('[data-farming-topic]')?.addEventListener('change',event=>navigate({...state,field:'agriculture',topic:(event.target as HTMLSelectElement).value,detail:null,point:state.point??config.cities.find(c=>c.id===state.city)?.coordinates??null,city:null,camera:camera()},false));
  $('[data-farming-statistics-retry]')?.addEventListener('click',()=>{farmingStatisticsError=false;renderFarming();});
  for(const button of $$<HTMLButtonElement>('[data-farm-water]'))button.addEventListener('click',()=>navigate({...state,field:'agriculture',topic:'overview',overlay:state.overlay==='water'?null:'water',detail:null,story:null,point:null,city:null,camera:camera()},false));
  $<HTMLSelectElement>('[data-population-topic]')?.addEventListener('change',event=>{const topic=(event.target as HTMLSelectElement).value;if(config.social?.topics.some(t=>t.id===topic))social?.chooseTopic(topic);else navigate({...state,field:'population',topic,city:null,camera:camera()},false);});
  $<HTMLSelectElement>('[data-population-city]')?.addEventListener('change',event=>selectUrban((event.target as HTMLSelectElement).value));
  $('[data-population-centroid]')?.addEventListener('click',()=>{const city=urbanCity();if(city)navigate({...state,point:city.coordinates,camera:camera()},false);});
  $<HTMLSelectElement>('[data-physical-focus]')?.addEventListener('change',event=>{const id=(event.target as HTMLSelectElement).value;if(!id){clearDetail();return;}const focus=config.physicalFocus?.find(f=>f.id===id);if(focus)navigate({...state,field:'natural',topic:naturalTopic()==='landform'?'landform':'terrain',detail:focus.id,place:focus.country,point:focus.coordinates,city:null,camera:null});});
  $<HTMLSelectElement>('[data-water-select]')?.addEventListener('change',event=>selectWater((event.target as HTMLSelectElement).value));
  citySelect.addEventListener('change',()=>{if(citySelect.value)selectCity(citySelect.value);else navigate({...state,city:null,camera:null,...(config.regionId==='southeast-asia'?{place:null,point:null}:{})});});
  $$<HTMLButtonElement>('[data-country-button]').forEach(b=>b.addEventListener('click',()=>selectCountry(b.dataset.countryButton!)));
  $$<SVGPathElement>('[data-map-country]').forEach(p=>p.addEventListener('click',()=>selectCountry(p.dataset.mapCountry!)));
  $$<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(a=>a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();const fit=restoreIndustryExtent(a.dataset.field as AsiaField);navigate({...state,field:a.dataset.field as AsiaField,topic:a.dataset.field===state.field?state.topic:null,detail:a.dataset.field===state.field?state.detail:null,story:a.dataset.field===state.field?state.story:null,camera:fit?null:camera(),back:null},fit);}));
  $$<HTMLButtonElement>('[data-compare]').forEach(b=>b.addEventListener('click',()=>navigate({...startAsiaComparison(new URL(location.href),{...state,camera:camera()},b.dataset.compare as AsiaField),...(b.dataset.compare==='agriculture'?{topic:'rice'}:{})},false)));
  $('[data-comparison-back]').addEventListener('click',()=>navigate(restoreAsiaComparison(new URL(location.href),state,context)));
  $$<HTMLButtonElement>('[data-climate-class]').forEach(b=>b.addEventListener('click',()=>{selectedClass=Number(b.dataset.climateClass);selectedPoint=null;state={...state,point:null};persist(false);renderClass();readingDock.render(state);const c=config.classes.find(c=>c.id===selectedClass)!;$('[data-grid-reading]').textContent=`凡例：${c.code} ${c.name} · ${c.description}`;}));
  $('[data-reset]').addEventListener('click',()=>navigate({field:state.field,place:null,city:null,camera:null,back:null}));
  $('[data-map-fit]').addEventListener('click',()=>{state={...state,camera:null};persist(true);fitSelection();});
  $('[data-zoom-in]').addEventListener('click',()=>map?.zoomIn({duration:reduced?0:160}));
  $('[data-zoom-out]').addEventListener('click',()=>map?.zoomOut({duration:reduced?0:160}));
  $('[data-map-retry]').addEventListener('click',()=>{state={...state,camera:camera()};mapReady=false;root.dataset.mapReady='false';void initialiseMap();});
  window.addEventListener('popstate',()=>{state=readState();selectedPoint=state.point??null;selectedClass=null;render();fitSelection();});
  window.addEventListener('pagehide',event=>{clearTimeout(moveTimer);if(!event.persisted){presentation?.destroy();map?.remove();map=null;mapReady=false;}});
  window.addEventListener('pageshow',event=>{if(event.persisted){map?.resize({asiaLayoutResize:true});syncLayout();if(!mapReady)void initialiseMap();}});
  function syncReadingLayout(){
    // Each reading pane uses its own distance to the viewport bottom. Neither
    // the map's aspect ratio nor a short article determines the pane height.
    for(const [selector,property] of [['.asia-reading-panel','--asia-reading-height'],['.atlas-news','--asia-news-height']] as const){
      const pane=$(selector);if(!pane)continue;
      // A selected religion case shortens the map column. Keep the sticky
      // reading inside that column so its top cannot be pushed off screen.
      const selectedReligion=selector==='.asia-reading-panel'&&config.regionId==='east-asia'&&state.field==='population'&&state.topic==='religion'&&!!state.detail;
      const bottom=selectedReligion?Math.min(window.innerHeight-12,$('.asia-map-panel')?.getBoundingClientRect().bottom??window.innerHeight-12):window.innerHeight-12;
      const value=window.innerWidth>=960?`${Math.max(0,Math.floor(bottom-Math.max(12,pane.getBoundingClientRect().top)))}px`:'';
      if(root.style.getPropertyValue(property)!==value){if(value)root.style.setProperty(property,value);else root.style.removeProperty(property);}
    }
  }
  let lastMapSize='';
  function syncLayout(){
    const frame=$('.asia-map-frame'),key=$('[data-farm-overview-legend]');
    if(frame&&config.regionId==='east-asia'&&window.innerWidth>=960&&config.contentExtent){
      const [west,south,east,north]=config.contentExtent,merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
      const ratio=(merc(north)-merc(south))/((east-west)*Math.PI/180);
      root.style.setProperty('--east-map-content-height',`${Math.ceil(Math.max(320,(frame.clientWidth-10)*ratio+10))}px`);
    }
    if(frame&&window.innerWidth>=(config.regionId==='east-asia'?960:1200))root.style.setProperty('--asia-map-available-height',`${Math.max(0,Math.floor(window.innerHeight-frame.getBoundingClientRect().top-12))}px`);
    if(frame&&key&&state.field==='agriculture'&&window.innerWidth>=1200){const height=Math.max(200,Math.min(640,window.innerHeight-frame.getBoundingClientRect().top-key.getBoundingClientRect().height-20));root.style.setProperty('--asia-farm-map-height',`${Math.floor(height)}px`);}
    if(frame){const size=`${frame.clientWidth}:${frame.clientHeight}`;if(size!==lastMapSize){lastMapSize=size;map?.resize({asiaLayoutResize:true});if(mapReady&&!state.camera)fitSelection();}}syncReadingLayout();
  }
  const layoutObserver=new ResizeObserver(syncLayout);layoutObserver.observe($('[data-map-surface]'));
  if($('[data-farm-overview-legend]'))layoutObserver.observe($('[data-farm-overview-legend]'));
  for(const selector of ['.atlas-workspace','.asia-region-shell'])if($(selector))layoutObserver.observe($(selector));
  let readingLayoutFrame=0;
  window.addEventListener('scroll',()=>{if(!readingLayoutFrame)readingLayoutFrame=requestAnimationFrame(()=>{readingLayoutFrame=0;syncReadingLayout();});},{passive:true});
  window.addEventListener('resize',syncLayout);
  for(const details of $$<HTMLDetailsElement>('details'))details.addEventListener('toggle',()=>requestAnimationFrame(syncLayout));
  sourceText();render();persist(false);syncLayout();void initialiseMap();
}
