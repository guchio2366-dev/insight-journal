import {createForestry} from './atlas-forestry';
import {normalizeForestNavigation} from '../lib/atlas-forestry-state';
import {loadAgricultureGeometry} from '../lib/atlas-agriculture-geometry';
import {natureEditorial} from '../data/atlas/nature-editorial';
import {renderNatureReading} from '../lib/atlas-nature-reading';
import {createAgricultureInsights} from './atlas-agriculture-insights';
import {normalizeInsightNavigation} from '../lib/atlas-agriculture-insight-state';
import {cityClimateCodes} from '../data/atlas/city-climate-reading';
import {createWaterController} from './atlas-water';
import {createPopulationController} from './atlas-population';
import {createPopulationInsights} from './atlas-population-insights';
import {normalizePopulationInsight} from '../lib/atlas-population-insight-state';
import { createAgricultureDetails } from './atlas-agriculture-details';
import type { AgricultureRelation } from '../data/atlas/agriculture-relations';
import { relationContextFeatures } from '../lib/atlas-relation-geometry';
import { readAtlasState, writeAtlasState, type MapField, type NatureMode, type ViewMode } from '../lib/atlas-state';
import { validNatureFeature } from '../lib/atlas-nature-state';
import { createNatureLoader, contourLabelCandidates } from '../lib/atlas-nature-loader';
import { chooseCardPlacement, type Rect } from '../lib/atlas-card-placement';
import type { GeoJSONSource, Map as LibreMap } from 'maplibre-gl';
import { createIndustryController } from './atlas-industry';
import { createNatureLabels } from './atlas-nature-labels';
import { projectNatureFallback, unprojectNatureFallback } from '../lib/atlas-nature-labels';
import { subsectorLabel } from '../data/atlas/industry-catalog';
import { createAtlasStyle, setFieldLayers } from '../lib/atlas-style';
import { cityAgricultureUrl } from '../lib/atlas-city-agriculture-link';
import { isProduct } from '../lib/atlas-agriculture-detail-state';

type RegionalCopy = {id:string;cropIds:string[];title:string;summary:string;compactSummary:string;bounds:[number,number,number,number];detailCrop:string};
type ClimateCity = {id:string;nameJa:string;stationId:string;stationName:string;longitude:number;latitude:number;elevationM:number;period:string;temperatureC:number[];precipitationMm:number[];annualPrecipitationMm:number;koppenCode:string|null};
type LivestockRegion={id:string;kindId:string;label:string;anchor:[number,number];summary:string};
type SelectionCopy = {full:string;compact:string};

export async function startAtlas() {
  const root=document.querySelector<HTMLElement>('[data-atlas-explorer]');
  if(!root || root.dataset.initialized)return;
  root.dataset.initialized='true';root.dataset.enhanced='true';root.dataset.renderState='loading';
  const config=JSON.parse(root.querySelector('[data-explorer-config]')!.textContent!);
  const el=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const frame=el('[data-map-frame]'),fallback=el('[data-fallback]'),surface=el('[data-map-surface]');
  const selection=el('[data-selection]'),selectionSlot=el('[data-selection-slot]'),natureDetail=el('[data-nature-detail]');
  const initial=readAtlasState(new URL(location.href),config.initialField);
  const legacyCity=location.hash.startsWith('#climate-table-')?location.hash.slice(15):null;
  if(legacyCity&&config.climateCities.some((city:ClimateCity)=>city.id===legacyCity)&&!initial.city)initial.city=legacyCity;
  let field:MapField=initial.field,natureMode:NatureMode=initial.env,map:LibreMap|undefined;
  let selectedCrop:string|null=initial.crop,selectedRegion:string|null=initial.region,selectedCity:string|null=initial.city,natureFeature:string|null=initial.city&&initial.natureFeature?.startsWith('climate:')?null:initial.natureFeature;
  let selectedAnimal=initial.animal,selectedAnimalRegion=initial.animalRegion,agriLayers=new Set<string>(initial.agriLayers);
  let selectedRelation:string|null=initial.relation,relationTrigger:HTMLElement|null=null;
  const allRelations=new Map<string,AgricultureRelation>((config.agricultureRelations??[]).map((r:AgricultureRelation)=>[r.id,r]));
  let lastRelationSignature:string|undefined;
  let insights:ReturnType<typeof createAgricultureInsights>|undefined;
  let forestry:ReturnType<typeof createForestry>|undefined;
  let populationStories:ReturnType<typeof createPopulationInsights>|undefined;
  const isForestry=()=>field==='agriculture'&&agricultureDetails.state().reading.view.kind==='forestry';
  let selectedStats:string=initial.stats,view:ViewMode=initial.view,failed=false,ready=false,restoring=false,suppressNextMove=false;
  let labels:any[]=[];let currentCopy:SelectionCopy|null=null;let selectedCoordinate:[number,number]|null=null;
  const allCrops=new Map<string,any>(config.crops.map((crop:any)=>[crop.id,crop]));
  const allRegions=new Map<string,RegionalCopy>(config.regionalInsights.map((region:RegionalCopy)=>[region.id,region]));
  const allCities=new Map<string,ClimateCity>(config.climateCities.map((city:ClimateCity)=>[city.id,city]));
  const allLivestockRegions=new Map<string,LivestockRegion>(config.livestockRegions.map((r:LivestockRegion)=>[r.id,r])),allLivestockKinds=new Map<string,any>(config.livestockKinds.map((k:any)=>[k.id,k]));
  const status=el('[data-fallback-status]');
  const criticalController=new AbortController();
  const natureLoader=createNatureLoader(config.natureAssetBase);
  let natureGeneration=0,pendingNatureKey='',mapMoving=false;
  const appliedNatureKeys=new Set<string>();
  let contourLabels:any[]=[], landFeatures:any[]=[], cropFeatures:any[]=[], baseFeatures:any[]=[], overlayFeatures:any[]=[];
  let natureSelectedGeometry:any=null;
  let timeout:number;
  let savedCamera=initial.camera??undefined;
  let fitBounds:[[number,number],[number,number]]=[[-128,24],[-64,50]];
  let natureTrigger:HTMLElement|null=null;
  const natureLabelController=createNatureLabels(root,[
    ...config.climateCities.map((city:ClimateCity)=>({id:'city:'+city.id,name:city.nameJa,coordinate:[city.longitude,city.latitude],mode:'climate'})),
    ...Object.entries(config.natureFeatureCopy).filter(([key])=>key.startsWith('landform:')).map(([id,value]:[string,any])=>({id,name:id==='landform:大西洋海岸平野'?'大西洋岸平野':id.split(':')[1],coordinate:value.anchor,mode:'landform'})),
    ...Object.entries(config.natureFeatureCopy).filter(([key])=>key.startsWith('water:')).map(([id,value]:[string,any])=>({id,name:value.title,coordinate:value.anchor,mode:'water'})),
  ],{
    active:()=>field==='natural'&&!(natureMode==='water'&&water.active()),mode:()=>natureMode,zoom:()=>map?.getZoom()??3,
    project:()=>ready&&map&&!failed&&fallback.hidden?coordinate=>map!.project(coordinate):null,
    select:(entry,trigger)=>entry.mode==='climate'?selectCity(entry.id.slice(5),true,trigger):showNatureFeature(entry.id,undefined,undefined,true,trigger),
    placed:()=>{if(!mapMoving)placeSelectionCard();},
  },config.climateCodeLabels);

  function cityAt(point:{x:number;y:number},project:(p:[number,number])=>{x:number;y:number}){
    return [...allCities.values()].map(city=>({city,p:project([city.longitude,city.latitude])})).filter(({p})=>Math.hypot(p.x-point.x,p.y-point.y)<=12).sort((a,b)=>Math.hypot(a.p.x-point.x,a.p.y-point.y)-Math.hypot(b.p.x-point.x,b.p.y-point.y))[0]?.city;
  }


  const agricultureDetails=createAgricultureDetails(root,(state,push,url,source)=>{selectedStats=state.stats;if(!source){selectedRegion=null;selectedAnimalRegion=null;}if(source!=='restore'&&state.reading?.view.kind==='product'){agriLayers.add(allLivestockKinds.has(state.reading.view.id)?'livestock':'crops');}syncAgricultureReading();syncAgricultureLayers(false);save(push,url);});
  selectedStats=agricultureDetails.state().stats;

  const industries=createIndustryController(root,config.industryRegions,config.industrySources,{
    active:()=>field==='industry',
    project:()=>ready&&map&&!failed&&fallback.hidden?(p)=>map!.project(p):null,
    changed:(push)=>{save(push);requestAnimationFrame(placeSelectionCard);},
    hide:()=>hideSelection(),
    show:(region)=>{
      hideSelection();const copy=`${region.function}。${region.description}`;
      showSelection(region.name,`${subsectorLabel(region.sector,region.subsector)} · ${region.scope} · ${region.year}`,{full:copy,compact:copy},region.coordinates,'#industry-detail','この分野の詳説へ');
      requestAnimationFrame(placeSelectionCard);
    },
    agriculture:()=>{root.dataset.industryVisited='true';setField('agriculture',true);},
  });

  const population=createPopulationController(root,config.populationAssetBase??config.assetBase.replace(/v3\/$/,'population/v1/'),{cities:config.climateCities,active:()=>field==='population',map:()=>ready&&!failed?map:undefined,changed:push=>save(push),fit:bounds=>{if(map&&bounds){view='custom';map.fitBounds(bounds,{padding:30,duration:0,maxZoom:10});}}});

  const water=createWaterController(root,config.base,{dragged:()=>mapDragged,active:()=>field==='natural'&&natureMode==='water',map:()=>ready&&!failed?map:undefined,project:()=>ready&&map&&!failed&&fallback.hidden?p=>map!.project(p):null,changed:()=>save(true),viewChanged:()=>{natureGeneration++;pendingNatureKey='';setNatureMode(natureMode,true);}});

  insights=createAgricultureInsights(root,config,{
    state:()=>{const reading=agricultureDetails.state().reading.view;return {field,mode:natureMode,waterView:water.view(),feature:natureFeature,product:reading.kind==='product'?reading.id:null,layers:agriLayers,ready,failed};},
    map:()=>ready&&!failed?map:undefined,
    project:()=>ready&&map&&!failed&&fallback.hidden?p=>map!.project(p as [number,number]):null,
    box:()=>natureLabelController.fallbackBox(),
    features:()=>({crops:cropFeatures,land:landFeatures,base:baseFeatures,overlays:overlayFeatures}),
    fit:bounds=>{if(map&&ready&&!failed){view='custom';map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:32,duration:0,maxZoom:7});save();}}
  });

  forestry=createForestry(root,config.base,{field:()=>field,selected:()=>isForestry(),project:()=>ready&&map&&!failed&&fallback.hidden?p=>map!.project(p as [number,number]):null,changed:()=>save()});
  forestry.sync();

  populationStories=createPopulationInsights(root,config,{
    field:()=>field,population:population.state,load:population.load,
    map:()=>ready&&!failed?map:undefined,
    project:()=>ready&&map&&!failed&&fallback.hidden?p=>map!.project(p as [number,number]):null,
    markers:()=>industries.renderMarkers(),
    canFocus:()=>!restoring,
    fit:bounds=>{if(map&&ready&&!failed){view='custom';map.fitBounds([[bounds[0],bounds[1]],[bounds[2],bounds[3]]],{padding:45,duration:0,maxZoom:7});save();}}
  });

  function cameraState(){
    const center=map?.getCenter();
    return center?{lng:center.lng,lat:center.lat,zoom:map!.getZoom()}:savedCamera;
  }

  function save(push=false,sourceUrl=new URL(location.href)){
    if(restoring)return;
    let url=water.write(population.write(industries.write(writeAtlasState(sourceUrl,config.base,field,cameraState(),selectedCrop,selectedRegion,selectedStats,view,[...agriLayers] as any,selectedAnimal,selectedAnimalRegion,{env:natureMode,city:selectedCity,natureFeature},selectedRelation,agricultureDetails.state()))));
    url=normalizePopulationInsight(normalizeForestNavigation(normalizeInsightNavigation(url,sourceUrl,config.base,field),field),config.base);
    if(field==='industry'&&push)url.hash='';
    if(config.reviewMode){url.pathname=config.base+'review/';url.searchParams.set('field',field);}
    history[push?'pushState':'replaceState']({},'',url);
    insights?.sync();forestry?.sync();populationStories?.sync();
    const returnUrl=new URL(url);returnUrl.pathname=config.base+'industry/';returnUrl.searchParams.delete('field');
    el<HTMLAnchorElement>('[data-industry-return-link]').href=returnUrl.pathname+returnUrl.search;
    root.querySelectorAll<HTMLAnchorElement>('[data-cross-link="agriculture"]').forEach(link=>{
      const target=writeAtlasState(new URL(url),config.base,'agriculture',cameraState(),selectedCrop,selectedRegion,selectedStats,view,[...agriLayers] as any,selectedAnimal,selectedAnimalRegion,{env:natureMode,city:selectedCity,natureFeature},selectedRelation,agricultureDetails.state());
      link.href=target.pathname+target.search;
    });
    root.querySelectorAll<HTMLAnchorElement>('[data-city-agriculture-link]').forEach(link=>{
      const product=link.dataset.cityAgricultureLink??null,city=link.closest<HTMLElement>('[data-city-panel]')?.dataset.cityPanel;
      if(!city||!isProduct(product))return;
      const target=cityAgricultureUrl(url,config.base,city,product);
      link.href=target.pathname+target.search+target.hash;
    });
  }

  function moveSelectionBelow(){
    selection.classList.add('atlas-selection--below');selection.removeAttribute('data-placement');
    selection.style.removeProperty('left');selection.style.removeProperty('top');selection.style.removeProperty('visibility');selectionSlot.appendChild(selection);
    if(currentCopy)el('[data-selection-text]').textContent=currentCopy.compact;
  }

  function localRect(node:Element):Rect{
    const a=node.getBoundingClientRect(),b=frame.getBoundingClientRect();
    return {left:a.left-b.left-5,top:a.top-b.top-5,right:a.right-b.left+5,bottom:a.bottom-b.top+5};
  }

  function selectedRegionRect():Rect|null{
    if(field==='natural'&&natureSelectedGeometry&&map){
      const coords:number[][]=[];const walk=(value:any)=>{if(typeof value[0]==='number')coords.push(value);else value.forEach(walk);};walk(natureSelectedGeometry.coordinates);
      const points=coords.map(p=>map!.project(p as [number,number]));
      if(points.length)return {left:Math.min(...points.map(p=>p.x))-8,right:Math.max(...points.map(p=>p.x))+8,top:Math.min(...points.map(p=>p.y))-8,bottom:Math.max(...points.map(p=>p.y))+8};
    }
    const region=selectedRegion?allRegions.get(selectedRegion):null;
    if(field==='agriculture'&&region&&map){
      const [west,south,east,north]=region.bounds;
      const points=[[west,south],[west,north],[east,south],[east,north]].map(point=>map!.project(point as [number,number]));
      return {left:Math.min(...points.map(point=>point.x))-8,top:Math.min(...points.map(point=>point.y))-8,right:Math.max(...points.map(point=>point.x))+8,bottom:Math.max(...points.map(point=>point.y))+8};
    }
    if(!selectedCoordinate||!map)return null;
    const point=map.project(selectedCoordinate);
    return {left:point.x-44,top:point.y-44,right:point.x+44,bottom:point.y+44};
  }

  function placeSelectionCard(){
    if(selection.hidden)return;
    if(!ready||!map||failed||!fallback.hidden||!selectedCoordinate||frame.clientWidth<650){moveSelectionBelow();return;}
    frame.appendChild(selection);selection.classList.remove('atlas-selection--below');selection.style.left='0';selection.style.top='0';selection.style.visibility='hidden';
    el('[data-selection-text]').textContent=frame.clientWidth<650&&currentCopy?currentCopy.compact:currentCopy?.full??'';
    const protectedRects:Rect[]=[];const target=selectedRegionRect();if(target)protectedRects.push(target);
    if(field==='agriculture'&&selectedRelation){
      const relation=allRelations.get(selectedRelation)!;
      const features=[...(agriLayers.has('crops')?cropFeatures.filter(f=>(relation.cropIds as readonly string[]).includes(f.properties.id)):[]),...relationContextFeatures(relation.baseFeatureIds,baseFeatures,landFeatures,overlayFeatures)];
      for(const feature of features){
        const points:{x:number;y:number}[]=[];const walk=(value:any)=>{if(typeof value[0]==='number')points.push(map!.project(value));else value.forEach(walk);};walk(feature.geometry.coordinates);
        if(points.length)protectedRects.push({left:Math.min(...points.map(p=>p.x))-8,right:Math.max(...points.map(p=>p.x))+8,top:Math.min(...points.map(p=>p.y))-8,bottom:Math.max(...points.map(p=>p.y))+8});
      }
    }
    for(const node of root.querySelectorAll<HTMLElement>('.atlas-map-tools,[data-layer-caption],.atlas-geolabel:not([hidden]),.atlas-nature-label:not([hidden]),.industry-marker,.atlas-livestock-marker,.atlas-agri-layers'))protectedRects.push(localRect(node));
    const result=chooseCardPlacement({width:frame.clientWidth,height:frame.clientHeight},{width:selection.offsetWidth,height:selection.offsetHeight},protectedRects,frame.clientWidth<650?6:9);
    if(!result){moveSelectionBelow();return;}
    selection.dataset.placement=result.id;selection.style.left=`${result.left}px`;selection.style.top=`${result.top}px`;selection.style.visibility='visible';
  }

  function hideNatureDetail(){
    natureDetail.hidden=true;el('[data-nature-jump]').hidden=true;
    root.querySelectorAll<HTMLElement>('[data-nature-empty]').forEach(node=>node.hidden=false);
  }

  function renderNatureChrome(){
    const active=field==='natural';
    el('[data-climate-overview]').hidden=!active||natureMode!=='climate';
    const guide=el('[data-nature-guide]');guide.hidden=!active||(natureMode==='contour'&&!fallback.hidden);
    const guides:Record<NatureMode,string>={climate:'都市名をタップすると、雨温図と気候の解説を表示します。',water:'地図の川・湖・帯水層の名前をタップすると、解説を表示します。',landform:'地図の山脈・高原・平原の名前をタップすると、解説を表示します。',contour:'等高線をタップすると、その線の標高を表示します。'};
    guide.textContent=guides[natureMode];water.render();
  }

  function hideSelection(){
    hideNatureDetail();
    selection.hidden=true;frame.appendChild(selection);selection.classList.remove('atlas-selection--below','atlas-selection--climate');
    selection.style.removeProperty('left');selection.style.removeProperty('top');selection.style.removeProperty('visibility');
    el('[data-selection-candidates]').hidden=true;el('[data-selection-candidates]').replaceChildren();
    el('[data-relation-warning]').hidden=true;
    currentCopy=null;selectedCoordinate=null;natureSelectedGeometry=null;syncNatureLabelSelection();
    (map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:[]});
  }

  function closeSelection(saveUrl=true,restoreFocus=false){
    const origin=field==='natural'?natureTrigger:relationTrigger;
    if(field==='agriculture'){agricultureDetails.overview();return;}
    else if(field==='natural')natureFeature=null;
    if(field==='industry')industries.clearSelection();
    hideSelection();renderCity();updateFocusButton();if(saveUrl)save(true);if(restoreFocus){const visible=origin?.isConnected&&!origin.closest('[hidden]');if(visible)origin.focus({preventScroll:true});else if(field==='natural')el(`[data-nature-mode="${natureMode}"]`).focus({preventScroll:true});}
  }

  function showSelection(title:string,kicker:string,copy:SelectionCopy,coordinate:[number,number]|null,linkHref:string,linkText:string){
    currentCopy=copy;selectedCoordinate=coordinate;el('[data-selection-title]').textContent=title;el('[data-selection-kicker]').textContent=kicker;el('[data-selection-text]').textContent=copy.full;
    const link=el<HTMLAnchorElement>('[data-selection-link]');link.href=linkHref;link.textContent=linkText;
    selection.hidden=false;placeSelectionCard();updateFocusButton();
  }

  function regionFor(cropId:string,longitude?:number,latitude?:number,requested?:string|null){
    const normalized=cropId==='corn-soybean'?['corn','soybean']:[cropId];
    if(requested){const saved=allRegions.get(requested);if(saved?.cropIds.some(crop=>normalized.includes(crop)))return saved;}
    if(longitude===undefined||latitude===undefined)return null;
    return config.regionalInsights.filter((region:RegionalCopy)=>region.cropIds.some(crop=>normalized.includes(crop))).filter((region:RegionalCopy)=>longitude>=region.bounds[0]&&longitude<=region.bounds[2]&&latitude>=region.bounds[1]&&latitude<=region.bounds[3]).sort((left:RegionalCopy,right:RegionalCopy)=>(left.bounds[2]-left.bounds[0])*(left.bounds[3]-left.bounds[1])-(right.bounds[2]-right.bounds[0])*(right.bounds[3]-right.bounds[1]))[0]??null;
  }

  function syncAgricultureReading(){
    const v=agricultureDetails.state().reading.view;
    const previousCrop=selectedCrop,previousAnimal=selectedAnimal;
    selectedRelation=v.kind==='relation'?v.id:null;
    selectedCrop=v.kind==='map-context'?'corn-soybean':v.kind==='product'&&allCrops.has(v.id)?v.id:null;
    selectedAnimal=v.kind==='product'&&allLivestockKinds.has(v.id)?v.id:null;
    if(previousCrop!==selectedCrop)selectedRegion=null;
    if(previousAnimal!==selectedAnimal)selectedAnimalRegion=null;
    hideSelection();syncRelationVisuals();renderLivestockMarkers();insights?.sync();
    const cropRegion=selectedRegion?allRegions.get(selectedRegion):null,animalRegion=selectedAnimalRegion?allLivestockRegions.get(selectedAnimalRegion):null;
    agricultureDetails.region(cropRegion?.title??animalRegion?.label,cropRegion?.summary??animalRegion?.summary);
  }

  function selectCrop(id:string,longitude?:number,latitude?:number,requestedRegion?:string|null,saveUrl=true){
    if(id!=='corn-soybean'&&!allCrops.has(id))return;
    const region=regionFor(id,longitude,latitude,requestedRegion);
    selectedCrop=id;selectedRegion=region?.id??null;selectedAnimal=null;selectedAnimalRegion=null;
    if(id==='corn-soybean')agricultureDetails.selectContext(saveUrl);else agricultureDetails.selectProduct(id,saveUrl,'map');
    syncAgricultureReading();
  }

  // City observations have their own state and never participate in map-card placement.
  function syncNatureLabelSelection(){
    natureLabelController.sync(field!=='natural'?null:natureMode==='climate'?(selectedCity?'city:'+selectedCity:null):natureFeature);
  }

  // Fit the regional examples against the unscrolled viewport. Keep their summary
  // reachable even when space is short; a user's own open/close choice wins.
  function fitCityCrop(){
    const panel=root.querySelector<HTMLElement>('[data-city-panel]:not([hidden])');
    const crop=panel?.querySelector<HTMLDetailsElement>('[data-city-crop]');if(!crop||crop.dataset.userToggled)return;
    crop.open=window.innerWidth>=960;
    if(!crop.open)return;
    const reading=panel!.querySelector<HTMLElement>('[data-city-reading]')!;
    const bottom=reading.getBoundingClientRect().bottom+window.scrollY;
    crop.open=bottom<=window.innerHeight-16;
  }

  function renderCity(){
    if(field==='natural'&&!natureFeature?.startsWith('climate:')&&(!selectedCity||!allCities.has(selectedCity)))selectedCity='los-angeles';
    const city=selectedCity?allCities.get(selectedCity):null,active=field==='natural'&&natureMode==='climate'&&!natureFeature?.startsWith('climate:');
    root.dataset.selectedCity=city?.id??'';
    el('[data-climate-chart]').hidden=!active||!city;
    root.querySelectorAll<HTMLElement>('[data-city-panel]').forEach(panel=>panel.hidden=!active||panel.dataset.cityPanel!==city?.id);
    const jump=el('[data-city-jump]');jump.hidden=!active||!city;jump.textContent=city?city.nameJa+'の雨温図へ':'都市の雨温図へ';
    syncNatureLabelSelection();if(active)requestAnimationFrame(fitCityCrop);
  }

  function selectCity(id:string,saveUrl=true,_trigger?:HTMLElement){
    const city=allCities.get(id);if(!city)return;
    const changed=selectedCity!==id;selectedCity=id;
    if(saveUrl){natureFeature=null;hideSelection();updateFocusButton();}
    renderCity();
    if(saveUrl){el('[data-atlas-live]').textContent=city.nameJa+'、'+(city.koppenCode??'気候区分のデータなし')+'の雨温図を表示しました。';save(changed);}
  }

  function showNatureFeature(key:string,title?:string,coordinate?:[number,number],saveUrl=true,trigger?:HTMLElement){
    if(!validNatureFeature(key))return;if(saveUrl)natureTrigger=trigger??surface;
    hideSelection();
    const configured=config.natureFeatureCopy[key];
    let copy:SelectionCopy,anchor=coordinate??configured?.anchor??null,heading=configured?.title??title??key.split(':')[1];
    if(configured)copy={full:configured.full,compact:configured.compact};
    else if(key.startsWith('climate:')){const code=key.slice(8),info=cityClimateCodes[code];heading=code+'・'+(info?.name??'気候区分');copy={full:(info?.meaning??'ケッペン＝ガイガーの気候区分です。')+'。1991–2020年の分類格子を強調しています。都市の一点の観測値や、作物の栽培限界を示すものではありません。',compact:info?.meaning??'気温と降水の組合せによる区分です。'};selectedCity=null;}
    else if(key.startsWith('landform:'))copy={full:'Natural Earthの地誌的な概略区分です。周囲の陰影とあわせて、山地・高原・平原の位置と広がりを読みます。地質や土壌の境界ではありません。',compact:'地誌的な概略区分です。地質・土壌の境界ではありません。'};
    else if(key.startsWith('elevation:')){const value=Number(key.split(':')[1]);copy={full:`標高${value.toLocaleString('ja-JP')}mの等高線です。同じ値の線は全域で同じ基準とし、ロッキー山脈とアパラチア山脈の高さを直接比べられます。`,compact:`標高${value.toLocaleString('ja-JP')}mの等高線です。全国で同じ基準です。`};heading=`${value.toLocaleString('ja-JP')} m 等高線`;}
    else return;
    natureFeature=key;if(key.startsWith('climate:'))renderCity();
    if(key.startsWith('landform:')){const feature=landFeatures.find(item=>item.properties.name===key.split(':')[1]);natureSelectedGeometry=feature?.geometry??null;(map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:feature?[feature]:[]});}
    else {natureSelectedGeometry=null;(map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:[]});}
    el('[data-nature-detail-title]').textContent=heading;
    renderNatureReading(el('[data-nature-detail-text]'),copy.full,natureEditorial[key],new URL(location.href),config.base);
    const detailLink=el<HTMLAnchorElement>('[data-nature-detail-link]');detailLink.href='#natural-conditions';detailLink.textContent='自然環境の概説へ';
    natureDetail.hidden=false;root.querySelectorAll<HTMLElement>('[data-nature-empty]').forEach(node=>node.hidden=true);
    const jump=el('[data-nature-jump]');jump.hidden=false;jump.textContent=heading+'の解説へ';
    syncNatureLabelSelection();if(saveUrl){el('[data-atlas-live]').textContent=heading+'の説明を表示しました。';save();}
  }

  function modePrefix(){return natureMode==='contour'?'elevation':natureMode;}

  function selectLivestock(regionId:string,saveUrl=true){
    const region=allLivestockRegions.get(regionId);if(!region)return;
    selectedAnimal=region.kindId;selectedAnimalRegion=region.id;selectedCrop=null;selectedRegion=null;
    agricultureDetails.selectProduct(region.kindId,saveUrl,'map');syncAgricultureReading();
  }
  function showLivestockCandidates(regions:LivestockRegion[],coordinate:[number,number]){
    hideSelection();agricultureDetails.candidates(regions.map(region=>({label:`${region.label}・${allLivestockKinds.get(region.kindId).label}`,select:()=>selectLivestock(region.id)})));
  }

  function renderLivestockMarkers(){const holder=el('[data-livestock-markers]');holder.replaceChildren();if(!ready||!map||field!=='agriculture'||isForestry()||!agriLayers.has('livestock'))return;const visible=config.livestockRegions.map((region:LivestockRegion)=>({region,point:map!.project(region.anchor)})).filter(({point}:any)=>point.x>=20&&point.y>=20&&point.x<=frame.clientWidth-20&&point.y<=frame.clientHeight-20),groups:{regions:LivestockRegion[];points:any[]}[]=[],distance=frame.clientWidth<650?58:48;for(const item of visible){const found=groups.find(g=>item.region.kindId!==selectedAnimal&&g.regions[0].kindId!==selectedAnimal&&Math.hypot(g.points[0].x-item.point.x,g.points[0].y-item.point.y)<distance);if(found){found.regions.push(item.region);found.points.push(item.point);}else groups.push({regions:[item.region],points:[item.point]});}for(const group of groups){const button=document.createElement('button');button.type='button';button.className='atlas-livestock-marker';const x=group.points.reduce((s,p)=>s+p.x,0)/group.points.length,y=group.points.reduce((s,p)=>s+p.y,0)/group.points.length;button.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;if(group.regions.length===1){const region=group.regions[0],kind=allLivestockKinds.get(region.kindId);button.style.setProperty('--livestock-color',kind.color);button.innerHTML=`<i aria-hidden="true">${kind.symbol}</i><span>${kind.label}</span>`;button.setAttribute('aria-label',`${region.label}の${kind.label}`);button.setAttribute('aria-pressed',String(selectedAnimalRegion?selectedAnimalRegion===region.id:selectedAnimal===region.kindId));button.addEventListener('click',e=>{e.stopPropagation();selectLivestock(region.id);});}else{button.classList.add('is-cluster');button.innerHTML=`<i aria-hidden="true">${group.regions.length}</i><span>畜産</span>`;button.setAttribute('aria-label',`${group.regions.length}件の畜産地域を選ぶ`);button.addEventListener('click',e=>{e.stopPropagation();const p=map!.unproject([x,y]);showLivestockCandidates(group.regions,[p.lng,p.lat]);});}const related=selectedRelation?allRelations.get(selectedRelation):null;const emphasized=group.regions.some(region=>related?(related.livestockRegionIds as readonly string[]).includes(region.id):selectedAnimal===region.kindId);button.classList.toggle('is-related',Boolean(emphasized));if(emphasized)button.setAttribute('aria-label',button.getAttribute('aria-label')+(selectedRelation?'、選択した関係で強調中':'、選択した品目で強調中'));holder.appendChild(button);}}

  function updateFallbackImage(){if(water.active()){water.render();return;}if(field==='population'){population.fallback();return;}const image=el<HTMLImageElement>('[data-fallback-image]'),overlay=el<HTMLImageElement>('[data-fallback-livestock]'),link=el<HTMLAnchorElement>('[data-fallback-full]');const showCrops=field==='agriculture'&&!isForestry()&&agriLayers.has('crops'),showLivestock=field==='agriculture'&&!isForestry()&&agriLayers.has('livestock');const src=field==='natural'?config.natureAssetBase+(['landform','water'].includes(natureMode)?`${natureMode}-interactive.webp`:`${natureMode}-fallback.webp`):config.assetBase+(showCrops?'agriculture':'land')+'-fallback.webp';image.src=src;image.alt=field==='natural'?'米国本土の自然環境・'+config.natureModes.find((m:any)=>m.id===natureMode).label:showCrops?'米国本土の地形・河川と主要作物の栽培域の概略図。':'米国本土の地形と水系。';overlay.hidden=!showLivestock;overlay.src=config.livestockAssetBase+(showCrops?'agriculture-livestock':'livestock')+'-fallback.svg';link.href=field==='natural'?config.natureAssetBase+`${natureMode}-fallback.webp`:src;}

  function syncAgricultureLayers(saveUrl=true){syncRelationVisuals();root.querySelectorAll<HTMLInputElement>('[data-agri-layer]').forEach(input=>input.checked=agriLayers.has(input.value));if(ready&&map)setFieldLayers(map,field,natureMode,agriLayers.has('crops')&&!isForestry());updateFallbackImage();renderLivestockMarkers();renderLabels();placeSelectionCard();forestry?.sync();if(saveUrl)save(true);}


  function fallbackForCurrentView(){
    if(water.active())return {base:water.assetBase,name:water.view()+'-fallback.webp',alt:'米国本土の'+(water.view()==='basins'?'河川の流域':'年平均降水量')};
    if(field==='population')return {base:config.populationAssetBase,name:'density.webp',alt:'米国本土の人口密度'};
    if(field==='agriculture')return {base:config.assetBase,name:agriLayers.has('crops')?'agriculture-fallback.webp':'land-fallback.webp',alt:'米国本土の主要作物の栽培分布'};
    if(field==='natural')return {base:config.natureAssetBase,name:['landform','water'].includes(natureMode)?`${natureMode}-interactive.webp`:`${natureMode}-fallback.webp`,alt:'米国本土の自然環境'};
    return {base:config.assetBase,name:'land-fallback.webp',alt:'米国本土の地形と水系'};
  }

  function updateFocusButton(){

    const button=el('[data-focus-selection]');
    button.hidden=!ready||!map||!fallback.hidden||!selectedCoordinate||map.getBounds().contains(selectedCoordinate);
  }

  function updateContourLegend(){
    el('[data-contour-index]').textContent='主要線 1,000 m';
    el('[data-contour-secondary]').textContent='補助線 500 m';
    if(field==='natural'&&natureMode==='contour')el('[data-layer-caption]').textContent='標高500m間隔 · 主要線1,000m';
  }

  function showNatureReady(){
    root.dataset.natureLoad='ready';root.dataset.renderState='ready';surface.hidden=false;fallback.hidden=true;
    el('[data-map-labels]').hidden=false;el('.atlas-map-tools').hidden=false;renderNatureChrome();if(water.active())void water.ensure().catch(()=>{});
  }

  async function ensureNatureModeData(mode:NatureMode){
    if(!map||!ready||field!=='natural')return;
    const key=mode==='water'&&water.active()?'water:'+water.view():mode==='contour'?'contour:500':mode;
    if(!water.active()&&appliedNatureKeys.has(key)){updateContourLegend();showNatureReady();renderLabels();placeSelectionCard();updateFocusButton();return;}
    if(pendingNatureKey===key)return;
    const generation=++natureGeneration;pendingNatureKey=key;
    root.dataset.natureLoad='loading';surface.hidden=true;fallback.hidden=false;el('[data-map-labels]').hidden=true;el('.atlas-map-tools').hidden=true;
    status.textContent=`${config.natureModes.find((item:any)=>item.id===mode).label}を読み込み中…`;
    el('[data-retry-nature]').hidden=true;updateFallbackImage();updateContourLegend();
    try{
      let data:any=null;
      if(mode==='water'){if(water.active())await water.ensure();else data=await natureLoader.json('aquifers.geojson');}
      if(mode==='contour')data=await natureLoader.contours();
      if(!root.isConnected||generation!==natureGeneration||field!=='natural'||natureMode!==mode||!map)return;
      if(data)(map.getSource(mode==='water'?'aquifers':'contours') as GeoJSONSource).setData(data);
      if(mode==='contour'){
        map.setFilter('contours-index',['==',['%',['get','elevationM'],1000],0]);
        map.setFilter('contours-secondary',['!=',['%',['get','elevationM'],1000],0]);
        for(const item of contourLabels)item.node.remove();
        contourLabels=contourLabelCandidates(data);const parent=el('[data-map-labels]');
        for(const item of contourLabels){const node=document.createElement('span');node.className='atlas-geolabel atlas-geolabel--contour';node.textContent=item.name;node.hidden=true;parent.appendChild(node);item.node=node;}
        updateContourLegend();
      }
      appliedNatureKeys.add(key);pendingNatureKey='';showNatureReady();
      const previousView=view;suppressNextMove=true;map.resize();view=previousView;suppressNextMove=false;renderLabels();placeSelectionCard();updateFocusButton();
    }catch(error){
      if(!root.isConnected||generation!==natureGeneration||field!=='natural'||natureMode!==mode)return;
      pendingNatureKey='';root.dataset.natureLoad='error';root.dataset.renderState='fallback';status.textContent='この表示のデータを読み込めませんでした（代替図）。';el('[data-retry-nature]').hidden=false;moveSelectionBelow();
      console.error('Natural environment data',error);
    }
  }

  function renderLabels(){
    insights?.schedule();
    populationStories?.schedule();
    natureLabelController.schedule();water.schedule();if(!map||!ready)return;
    const width=frame.clientWidth,height=frame.clientHeight,occupied:number[][]=[];
    for(const item of [...labels,...contourLabels]){
      const node=item.node as HTMLElement;
      let visible=true;
      if(item.kind==='crop'&&(field!=='agriculture'||isForestry()||!agriLayers.has('crops')))visible=false;
      if(item.fields&&!item.fields.includes(field))visible=false;
      if(item.modes&&(field!=='natural'||!item.modes.includes(natureMode)))visible=false;
      if((field==='natural'||field==='industry')&&item.kind==='state')visible=false;
      if(field==='natural'&&item.baseLabel){
        if(item.kind==='physical')visible=natureMode==='landform'&&!config.natureLabels.some((label:any)=>label.name===item.name&&label.modes?.includes('landform'));
        if(item.kind==='water')visible=natureMode==='water';
      }
      if(field==='natural'&&natureMode==='landform'&&item.kind==='physical')visible=false;
      if(field==='natural'&&natureMode==='water'&&(item.kind==='water'||item.kind==='nature'))visible=false;
      if(!visible){node.hidden=true;continue;}
      const point=map.project([item.lng,item.lat]);node.hidden=false;
      const nodeWidth=node.offsetWidth,nodeHeight=node.offsetHeight,rect=[point.x-nodeWidth/2,point.y-nodeHeight/2,point.x+nodeWidth/2,point.y+nodeHeight/2];
      const outside=rect[0]<5||rect[1]<28||rect[2]>width-5||rect[3]>height-5,tools=rect[2]>width-54&&rect[1]<150;
      const collide=occupied.some(other=>rect[0]<other[2]+5&&rect[2]>other[0]-5&&rect[1]<other[3]+3&&rect[3]>other[1]-3);
      node.hidden=outside||tools||collide;if(!node.hidden){node.style.transform=`translate(${Math.round(point.x-nodeWidth/2)}px,${Math.round(point.y-nodeHeight/2)}px)`;occupied.push(rect);}
    }
  }

  function restoreSelectionForView(){
    hideSelection();renderCity();renderNatureChrome();if(water.active()&&!ready)void water.ensure().catch(()=>{});
    if(field==='agriculture')syncAgricultureReading();
    else if(field==='natural'&&!water.active()&&natureFeature?.startsWith(modePrefix()+':'))showNatureFeature(natureFeature,undefined,undefined,false);
    else if(field==='industry')industries.restoreSelection();
  }

  function setNatureMode(next:NatureMode,push=false){
    natureLabelController.schedule();
    if(next!==natureMode){natureGeneration++;pendingNatureKey='';}
    natureMode=next;root.dataset.natureMode=next;el('.atlas-fallback-map').tabIndex=field==='natural'&&next==='climate'?0:-1;if(field==='natural')el('[data-map-panel]').setAttribute('aria-labelledby',`nature-tab-${next}`);
    root.querySelectorAll<HTMLButtonElement>('[data-nature-mode]').forEach(button=>{const active=button.dataset.natureMode===next;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    root.querySelectorAll<HTMLElement>('[data-nature-key-panel]').forEach(panel=>panel.hidden=panel.dataset.natureKeyPanel!==next);
    root.querySelectorAll<HTMLElement>('[data-nature-summary-panel]').forEach(panel=>panel.hidden=panel.dataset.natureSummaryPanel!==next);
    const captions:Record<NatureMode,string>={climate:'ケッペン＝ガイガー区分 · 1991–2020',water:'河川・湖・貯水池・主要帯水層',landform:'山脈・高原・平原と地形陰影',contour:'標高500m間隔 · 主要線1,000m'};
    if(field==='natural')el('[data-layer-caption]').textContent=captions[next];updateFallbackImage();
    if(ready&&map){setFieldLayers(map,field,natureMode,agriLayers.has('crops')&&!isForestry());void ensureNatureModeData(natureMode);renderLabels();}restoreSelectionForView();if(push)save(true);
  }

  function setField(next:MapField,push=false){
    natureLabelController.schedule();
    if(next!==field){natureGeneration++;pendingNatureKey='';}
    field=next;root.dataset.field=field;el('.atlas-fallback-map').tabIndex=field==='natural'&&natureMode==='climate'?0:-1;el('[data-agriculture-relations-host]').hidden=field!=='agriculture';syncRelationVisuals();
    if(field==='industry')root.dataset.industryVisited='true';
    el('[data-industry-return]').hidden=!(root.dataset.industryVisited||new URL(location.href).searchParams.has('sector'));
    if(field!=='natural'&&ready&&!failed){surface.hidden=false;fallback.hidden=true;el('[data-map-labels]').hidden=false;el('.atlas-map-tools').hidden=false;root.dataset.renderState='ready';}
    el('[data-map-panel]').setAttribute('role',field==='natural'||field==='industry'?'tabpanel':'group');
    root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(link=>link.dataset.field===field?link.setAttribute('aria-current','page'):link.removeAttribute('aria-current'));
    root.querySelectorAll<HTMLElement>('[data-field-content]').forEach(section=>section.hidden=!section.dataset.fieldContent!.split(' ').includes(field));
    root.querySelectorAll<HTMLElement>('[data-field-national]').forEach(section=>section.hidden=!section.dataset.fieldNational!.split(' ').includes(field));
    el('[data-crop-key]').hidden=field!=='agriculture';el('[data-land-key]').hidden=field!=='overview';el('[data-nature-key]').hidden=field!=='natural';el('[data-nature-controls]').hidden=field!=='natural';
    const fallbackView=fallbackForCurrentView();el<HTMLImageElement>('[data-fallback-image]').src=fallbackView.base+fallbackView.name;el<HTMLAnchorElement>('[data-fallback-full]').href=fallbackView.base+fallbackView.name;el<HTMLImageElement>('[data-fallback-image]').alt=fallbackView.alt;
    if(field==='agriculture')el('[data-layer-caption]').textContent='作物 2023 · 畜産 2022（概略）';else if(field==='natural')el('[data-layer-caption]').textContent=config.natureModes.find((mode:any)=>mode.id===natureMode).caption;else if(field==='overview')el('[data-layer-caption]').textContent='地形・水系';
    if(ready&&map){setFieldLayers(map,field,natureMode,agriLayers.has('crops')&&!isForestry());if(field==='natural'){void ensureNatureModeData(natureMode);const context=cropFeatures.filter(item=>selectedCrop&&item.properties.id===selectedCrop);(map.getSource('crop-context') as GeoJSONSource).setData({type:'FeatureCollection',features:context});}renderLabels();}
    el('[data-agri-layers]').hidden=field!=='agriculture';updateFallbackImage();renderLivestockMarkers();
    industries.render();void population.render();restoreSelectionForView();insights?.sync();forestry?.sync();populationStories?.sync();if(push)save(true);
  }

  function fail(message:string){
    if(failed)return;failed=true;ready=false;mapMoving=false;clearTimeout(timeout);criticalController.abort();root.dataset.renderState='fallback';fallback.hidden=false;surface.hidden=true;el('[data-map-labels]').hidden=true;el('[data-livestock-markers]').hidden=true;el('.atlas-map-tools').hidden=true;status.textContent=message+'（代替図）';if(natureTrigger===surface)natureTrigger=el('.atlas-fallback-map');savedCamera=cameraState();map?.remove();map=undefined;population.unavailable();insights?.sync();forestry?.sync();populationStories?.sync();natureLabelController.schedule();syncRelationVisuals();industries.renderMarkers();population.renderMarkers();if(!selection.hidden)moveSelectionBelow();renderNatureChrome();if(water.active())void water.ensure().catch(()=>{});
  }

  function activeRelation(){return field==='agriculture'&&selectedRelation?allRelations.get(selectedRelation):undefined;}
  function syncRelationVisuals(){
    const relation=activeRelation();
    root.querySelectorAll<HTMLButtonElement>('[data-relation-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.relationSelect===relation?.id)));
    root.querySelectorAll<HTMLElement>('[data-relation-item]').forEach(item=>item.classList.toggle('is-selected',item.dataset.relationItem===relation?.id));
    root.querySelectorAll('[data-fallback-relation]').forEach(group=>group.toggleAttribute('hidden',group.getAttribute('data-fallback-relation')!==relation?.id));
    root.querySelectorAll('[data-relation-crops]').forEach(group=>group.toggleAttribute('hidden',!agriLayers.has('crops')));
    root.querySelectorAll('[data-relation-animals]').forEach(group=>group.toggleAttribute('hidden',!agriLayers.has('livestock')));
    const selected=field==='agriculture'?selectedCrop:null;
    const signature=relation?.id??selected??'';
    if(ready&&map&&lastRelationSignature!==signature){
      lastRelationSignature=signature;
      const emphasized=selected==='corn'||selected==='soybean'?[selected,'corn-soybean']:selected?[selected]:[];
      map.setPaintProperty('crops-fill','fill-opacity',selected?['case',['in',['get','id'],['literal',emphasized]],0.72,0.22]:0.62);
      map.setPaintProperty('crops-outline','line-opacity',selected?['case',['in',['get','id'],['literal',emphasized]],0.9,0.35]:0.85);
      map.setPaintProperty('crops-overlap','fill-opacity',selected?(emphasized.includes('corn-soybean')?0.32:0.1):0.18);
      map.setFilter('crop-relation-highlight',relation?['in',['get','id'],['literal',[...relation.cropIds]]]:['==',['get','id'],selected??'__no-relation__']);
      (map.getSource('agriculture-relation-context') as GeoJSONSource).setData({type:'FeatureCollection',features:relation?relationContextFeatures(relation.baseFeatureIds,baseFeatures,landFeatures,overlayFeatures):[]});
    }
    const required=relation?.requiredLayers??(selectedCrop?['crops']:selectedAnimal?['livestock']:[]);
    const missing=required.filter(layer=>!agriLayers.has(layer));
    el('[data-agri-layer-warning]').hidden=!missing.length;
    el('[data-agri-layer-warning] p').textContent=missing.length?`${missing.map(layer=>layer==='crops'?'作物':'畜産').join('・')}が非表示です。表示設定は維持しています。`:'';
    el('[data-relation-warning]').hidden=!missing.length;
    el('[data-relation-warning-text]').textContent=missing.length?`${missing.map(layer=>layer==='crops'?'作物':'畜産').join('・')}が非表示です。表示設定は維持しています。`:'';
  }
  el('[data-enable-relation-layers]').addEventListener('click',()=>{activeRelation()?.requiredLayers.forEach(layer=>agriLayers.add(layer));syncAgricultureLayers();});
  el('[data-agri-enable-layers]').addEventListener('click',()=>{const required=activeRelation()?.requiredLayers??(selectedCrop?['crops']:selectedAnimal?['livestock']:[]);required.forEach(layer=>agriLayers.add(layer));syncAgricultureLayers();});

  el('[data-industry-return-link]').addEventListener('click',event=>{if((event as MouseEvent).metaKey||(event as MouseEvent).ctrlKey||(event as MouseEvent).shiftKey||(event as MouseEvent).altKey)return;event.preventDefault();setField('industry',true);});
  root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(link=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();setField(link.dataset.field as MapField,true);}));
  root.querySelectorAll<HTMLButtonElement>('[data-nature-mode]').forEach(button=>{
    button.addEventListener('click',()=>setNatureMode(button.dataset.natureMode as NatureMode,true));
    button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-nature-mode]')],step=['ArrowRight','ArrowDown'].includes(event.key)?1:-1,next=(buttons.indexOf(button)+step+buttons.length)%buttons.length;buttons[next].focus();setNatureMode(buttons[next].dataset.natureMode as NatureMode,true);});
  });
  root.querySelectorAll<HTMLInputElement>('[data-agri-layer]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)agriLayers.add(input.value);else agriLayers.delete(input.value);syncAgricultureLayers();}));
  el('[data-city-jump]').addEventListener('click',event=>{event.preventDefault();el('#city-climate-heading').focus();el('#city-climate-heading').scrollIntoView({block:'start'});});
  root.querySelectorAll<HTMLDetailsElement>('[data-city-crop]').forEach(detail=>detail.querySelector('summary')!.addEventListener('click',()=>{detail.dataset.userToggled='true';}));
  el('[data-close-nature-detail]').addEventListener('click',()=>closeSelection(true,true));
  el('[data-nature-jump]').addEventListener('click',event=>{event.preventDefault();el('#nature-feature-heading').focus();el('#nature-feature-heading').scrollIntoView({block:'start'});});
  el('[data-retry-nature]').addEventListener('click',()=>{appliedNatureKeys.delete(natureMode==='contour'?'contour:500':natureMode);void ensureNatureModeData(natureMode);});
  el('[data-focus-selection]').addEventListener('click',()=>{if(map&&selectedCoordinate){view='custom';map.jumpTo({center:selectedCoordinate});}});
  root.querySelectorAll('details').forEach(detail=>detail.addEventListener('toggle',()=>placeSelectionCard()));
  el('[data-close-selection]').addEventListener('click',()=>closeSelection(true,true));root.addEventListener('keydown',event=>{if(event.defaultPrevented||event.key!=='Escape')return;if(!selection.hidden||(field==='natural'&&!natureDetail.hidden)){event.preventDefault();closeSelection(true,true);return;}});
  let pointerStart:{x:number;y:number}|null=null,mapDragged=false;
  for(const target of [surface,fallback]){
    target.addEventListener('pointerdown',event=>{mapDragged=Boolean(pointerStart);pointerStart={x:event.clientX,y:event.clientY};});
    target.addEventListener('pointermove',event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6)mapDragged=true;});
    target.addEventListener('pointerup',()=>{pointerStart=null;});
    target.addEventListener('pointercancel',()=>{pointerStart=null;mapDragged=true;});
  }
  const fallbackMap=el('.atlas-fallback-map');fallbackMap.tabIndex=0;fallbackMap.setAttribute('aria-label','米国本土の代替図。都市・水資源・地形は名前から選べます');
  fallbackMap.addEventListener('click',event=>{
    if(fallback.hidden||field!=='natural'||natureMode!=='climate'||mapDragged)return;
    const rect=frame.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top},box=natureLabelController.fallbackBox();
    const coordinate=unprojectNatureFallback(point,box);if(!coordinate)return;
    const city=cityAt(point,p=>projectNatureFallback(p,box));if(city)selectCity(city.id,true,fallbackMap);
  });
  setNatureMode(natureMode);setField(field);syncAgricultureLayers(false);if(field==='natural')save();if(water.active())void water.ensure().catch(()=>{});window.addEventListener('resize',fitCityCrop);document.fonts?.ready.then(fitCityCrop);timeout=window.setTimeout(()=>fail('地図データの読み込みが完了しませんでした。'),30000);

  function restoreFromUrl(){restoring=true;natureGeneration++;pendingNatureKey='';const state=readAtlasState(new URL(location.href),config.initialField);agricultureDetails.restore();water.restore();selectedStats=agricultureDetails.state().stats;field=state.field;natureMode=state.env;agriLayers=new Set(state.agriLayers);selectedRelation=state.relation;relationTrigger=null;natureTrigger=null;selectedAnimal=state.animal;selectedAnimalRegion=state.animalRegion;selectedCrop=state.crop;selectedRegion=state.region;selectedCity=state.city;natureFeature=state.city&&state.natureFeature?.startsWith('climate:')?null:state.natureFeature;view=state.view;savedCamera=state.camera??undefined;industries.restore();population.restore();setField(field);setNatureMode(natureMode);syncAgricultureLayers(false);if(state.camera&&map&&state.view==='custom')map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});else if(map&&state.view==='fit'){suppressNextMove=true;map.fitBounds(fitBounds,{duration:0,padding:{top:30,bottom:14,left:12,right:12}});}restoring=false;populationStories?.sync();if(field==='natural')save();}
  window.addEventListener('popstate',restoreFromUrl);
  // These destinations share this explorer. Keep its map and loaded geometry alive.
  root.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=(event.target as Element).closest<HTMLAnchorElement>('a[data-agri-insight-link],a.agri-insight-back,a[data-nature-reading-link],a[data-forest-compare],a[data-forest-back],a[data-pop-story-link],a[data-pop-story-back],a[data-pop-story-compare]');
    if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||![config.base+'agriculture/',config.base+'nature/',config.base+'industry/',config.base+'population/'].includes(url.pathname))return;
    event.preventDefault();
    const previous=new URL(location.href);
    const isPopulationStory=link.matches('[data-pop-story-link],[data-pop-story-back],[data-pop-story-compare]');
    if(isPopulationStory)populationStories?.prepareNavigation(url,link);
    insights?.prepareNavigation(url);
    history.pushState({},'',url);
    restoreFromUrl();
    if(isPopulationStory){populationStories?.afterNavigation(link,previous);return;}
    const heading=el<HTMLElement>(root.dataset.cornStory?'#agri-insight-heading':field==='agriculture'?'#agri-reading-heading':link.hasAttribute('data-forest-compare')?'#forest-comparison-heading':link.hasAttribute('data-nature-reading-link')?(water.active()?'#water-reading-title':natureFeature?'#nature-feature-heading':natureMode==='climate'?'#city-climate-heading':'#nature-map-panel'):'#agri-insight-heading');
    if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    if(link.matches('[data-corn-story-link],.agri-insight-back')){
      const body=el('[data-agri-reading-body]');body.scrollTop=0;
      const panel=root.dataset.cornStory?el('.agri-insight-context'):el('[data-agri-reading-panel]');
      if(panel&&innerWidth<1200)panel.scrollIntoView({block:'start',behavior:'instant'});
    }
  });


  try{
    const fetchJson=async(base:string,name:string)=>{const testMissing=config.reviewMode&&new URL(location.href).searchParams.get('qa')==='asset-error'&&name==='manifest.json';const response=await fetch(base+(testMissing?'qa-missing-manifest.json':name),{signal:criticalController.signal});if(!response.ok)throw new Error(name+': '+response.status);return response.json();};
    const empty={type:'FeatureCollection',features:[]};
    const [lib,manifest,base,crops,land,stateLabels,cropLabels,natureManifest,overlays]=await Promise.all([import('maplibre-gl'),fetchJson(config.assetBase,'manifest.json'),fetchJson(config.assetBase,'base.geojson'),loadAgricultureGeometry(config.assetBase),fetchJson(config.assetBase,'land.geojson'),fetchJson(config.assetBase,'labels.json'),fetchJson(config.assetBase,'crop-labels.json'),natureLoader.json('manifest.json'),fetchJson(config.natureAssetBase,'overlays.geojson')]);
    if(failed)return;
    fitBounds=[[-128,22],[-64,52]];landFeatures=land.features;cropFeatures=crops.features;baseFeatures=base.features;overlayFeatures=overlays.features;
    const style=createAtlasStyle(config,manifest,base,crops,land,{manifest:natureManifest,cities:config.climateCities,aquifers:empty,contours:empty,overlays});
    lib.setWorkerCount(1);map=new lib.Map({container:surface,style,attributionControl:false,cooperativeGestures:true,locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は２本指で動かせます'},renderWorldCopies:false,dragRotate:false,touchPitch:false,pitchWithRotate:false,rollEnabled:false,maxPitch:0,maxZoom:10,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),bounds:fitBounds,fitBoundsOptions:{padding:{top:30,bottom:14,left:12,right:12}},maxBounds:[[-137,16],[-56,58]],refreshExpiredTiles:false,fadeDuration:0});
    map.touchZoomRotate.disableRotation();map.scrollZoom.disable();if(savedCamera&&view==='custom')map.jumpTo({center:[savedCamera.lng,savedCamera.lat],zoom:savedCamera.zoom});
    surface.addEventListener('webglcontextlost',()=>fail('この端末の地図描画が停止しました。'),true);map.on('error',event=>{console.error('Atlas data/render error',event.error?.message);fail('地図の描画またはデータの読み込みに失敗しました。');});
    map.once('load',()=>{
      if(failed||!map)return;ready=true;clearTimeout(timeout);root.dataset.renderState='ready';fallback.hidden=true;el('.atlas-map-tools').hidden=false;
      const size=12,rgba=new Uint8Array(size*size*4);for(let row=0;row<size;row++)for(let column=0;column<size;column++){const index=(row*size+column)*4;rgba.set((column+row)%size<3?[169,139,38,165]:[0,0,0,0],index);}map.addImage('overlap-stripe',{width:size,height:size,data:rgba});map.setPaintProperty('crops-overlap','fill-pattern','overlap-stripe');
      const pattern=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++)pattern.set((x+y)%size<2?[128,112,145,220]:[0,0,0,0],(y*size+x)*4);map.addImage('aquifer-stripe',{width:size,height:size,data:pattern});map.setPaintProperty('aquifers-pattern','fill-pattern','aquifer-stripe');
      labels=[...cropLabels,...config.geographicLabels.map((item:any)=>({...item,baseLabel:true})),...config.natureLabels,...stateLabels.map((item:any)=>({...item,baseLabel:true}))].sort((left,right)=>left.priority-right.priority);
      const labelParent=el('[data-map-labels]');for(const item of labels){const node=document.createElement('span');node.className='atlas-geolabel atlas-geolabel--'+item.kind;node.textContent=item.name;node.hidden=true;if(item.color)node.style.setProperty('--label-color',item.color);labelParent.appendChild(node);item.node=node;}
      setField(field);setNatureMode(natureMode);renderLabels();restoreSelectionForView();save();
      map.on('movestart',()=>{mapMoving=true;});map.on('dragstart',()=>{mapDragged=true;});
      map.on('move',()=>{forestry?.schedule();renderLabels();renderLivestockMarkers();industries.renderMarkers();population.renderMarkers();if(!selection.hidden&&selection.parentElement===frame)selection.style.visibility='hidden';});map.on('moveend',()=>{mapMoving=false;if(!suppressNextMove)view='custom';else suppressNextMove=false;renderLabels();renderLivestockMarkers();industries.renderMarkers();population.renderMarkers();placeSelectionCard();updateFocusButton();save();});
      map.on('click',event=>{
        if(field==='population'){population.click(event.point);return;}
        if(field==='natural'&&mapDragged)return;
        if(field==='agriculture'){
          if(isForestry())return;
          if(!agriLayers.has('crops')){closeSelection();return;}
          const features=map!.queryRenderedFeatures([[event.point.x-6,event.point.y-6],[event.point.x+6,event.point.y+6]],{layers:['crops-fill','crops-overlap']});const feature=features.find(item=>item.properties.id==='corn-soybean')??features[0];if(feature)selectCrop(feature.properties.id,event.lngLat.lng,event.lngLat.lat);else closeSelection();return;
        }
        if(field==='natural'){
          const box:[[number,number],[number,number]]=[[event.point.x-8,event.point.y-8],[event.point.x+8,event.point.y+8]];
          if(natureMode==='climate'){const city=cityAt(event.point,p=>map!.project(p));if(city)selectCity(city.id,true,surface);return;}
          if(natureMode==='water'&&water.click(event.point))return;
          if(natureMode==='water'){const candidates=map!.queryRenderedFeatures(box,{layers:['reservoir-points','rivers','lakes','aquifers-fill']});const feature=candidates.filter(item=>validNatureFeature('water:'+(item.properties.kind==='reservoir'?item.properties.id:item.properties.AQ_NAME??item.properties.name))).sort((a,b)=>['reservoir-points','rivers','lakes','aquifers-fill'].indexOf(a.layer.id)-['reservoir-points','rivers','lakes','aquifers-fill'].indexOf(b.layer.id))[0];if(!feature){natureFeature=null;hideSelection();save();return;}const identity=feature.properties.kind==='reservoir'?feature.properties.id:feature.properties.AQ_NAME??feature.properties.name;showNatureFeature(`water:${identity}`,feature.properties.nameJa,[event.lngLat.lng,event.lngLat.lat]);return;}
          if(natureMode==='landform'){const feature=map!.queryRenderedFeatures(event.point,{layers:['land-picking']}).sort((left,right)=>left.properties.area-right.properties.area)[0];if(!feature){natureFeature=null;hideSelection();save();return;}showNatureFeature(`landform:${feature.properties.name}`,feature.properties.name,[event.lngLat.lng,event.lngLat.lat]);return;}
          const feature=map!.queryRenderedFeatures(box,{layers:['contours-hit']}).sort((left,right)=>Number(right.properties.index)-Number(left.properties.index))[0];if(feature)showNatureFeature(`elevation:${feature.properties.elevationM}`,undefined,[event.lngLat.lng,event.lngLat.lat]);else{natureFeature=null;hideSelection();save();}return;
        }
        if(field==='industry'){closeSelection();return;}
        const features=map!.queryRenderedFeatures(event.point,{layers:['land-picking']}).sort((left,right)=>left.properties.area-right.properties.area);if(!features.length){hideSelection();return;}showSelection(features[0].properties.name,'選択地域',{full:'Natural Earthの地誌的な地域区分です。自然環境へ切り替えると、同じ位置で気候・水・地形・標高を比べられます。',compact:'地誌的な概略区分です。自然環境で詳しく比べられます。'},[event.lngLat.lng,event.lngLat.lat],'#land-conditions','↓ 土地の解説へ');
      });
      root.querySelectorAll<HTMLButtonElement>('[data-map-action]').forEach(button=>button.addEventListener('click',()=>{if(!map)return;if(button.dataset.mapAction==='fit'){if(field==='population')population.national();view='fit';suppressNextMove=true;map.fitBounds(fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});}if(button.dataset.mapAction==='in'){view='custom';map.zoomIn({duration:0});}if(button.dataset.mapAction==='out'){view='custom';map.zoomOut({duration:0});}}));
      let lastWidth=frame.clientWidth,lastHeight=frame.clientHeight;new ResizeObserver(()=>{if(!map||failed)return;const width=frame.clientWidth,height=frame.clientHeight;if(width===lastWidth&&height===lastHeight)return;lastWidth=width;lastHeight=height;const oldView=view;suppressNextMove=true;map.resize();if(oldView==='fit'){suppressNextMove=true;map.fitBounds(fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});}else{renderLabels();renderLivestockMarkers();industries.renderMarkers();population.renderMarkers();placeSelectionCard();}}).observe(frame);
      if(config.reviewMode)window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data!=='atlas-qa-lose-context'||!map)return;map.getCanvas().getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();});
    });

    const hashTarget=location.hash?document.getElementById(location.hash.slice(1)):null;if(hashTarget?.closest('details'))hashTarget.closest('details')!.open=true;
  }catch(error){console.error('Atlas initialization',error);fail('この環境では操作できる地図を読み込めませんでした。');}
}
