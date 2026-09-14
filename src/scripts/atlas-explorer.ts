import type { AgricultureRelation } from '../data/atlas/agriculture-relations';
import { relationContextFeatures } from '../lib/atlas-relation-geometry';
import { readAtlasState, writeAtlasState, type MapField, type NatureMode, type ViewMode } from '../lib/atlas-state';
import { validNatureFeature, climateCell, climateFamilyNames } from '../lib/atlas-nature-state';
import { createNatureLoader, contourLabelCandidates } from '../lib/atlas-nature-loader';
import { chooseCardPlacement, type Rect } from '../lib/atlas-card-placement';
import type { GeoJSONSource, Map as LibreMap } from 'maplibre-gl';
import { createIndustryController } from './atlas-industry';
import { createNatureLabels } from './atlas-nature-labels';
import { projectNatureFallback, unprojectNatureFallback } from '../lib/atlas-nature-labels';
import { subsectorLabel } from '../data/atlas/industry-catalog';
import { createAtlasStyle, setFieldLayers } from '../lib/atlas-style';

type RegionalCopy = {id:string;cropIds:string[];title:string;summary:string;compactSummary:string;bounds:[number,number,number,number];detailCrop:string};
type ClimateCity = {id:string;nameJa:string;stationId:string;stationName:string;longitude:number;latitude:number;elevationM:number;period:string;temperatureC:number[];precipitationMm:number[];annualPrecipitationMm:number};
type LivestockRegion={id:string;kindId:string;label:string;anchor:[number,number];summary:string};
type SelectionCopy = {full:string;compact:string};

export async function startAtlas() {
  const root=document.querySelector<HTMLElement>('[data-atlas-explorer]');
  if(!root || root.dataset.initialized)return;
  root.dataset.initialized='true';root.dataset.enhanced='true';root.dataset.renderState='loading';
  const config=JSON.parse(root.querySelector('[data-explorer-config]')!.textContent!);
  const el=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const frame=el('[data-map-frame]'),fallback=el('[data-fallback]'),surface=el('[data-map-surface]');
  const selection=el('[data-selection]'),selectionSlot=el('[data-selection-slot]');
  const initial=readAtlasState(new URL(location.href),config.initialField);
  let field:MapField=initial.field,natureMode:NatureMode=initial.env,map:LibreMap|undefined;
  let selectedCrop:string|null=initial.crop,selectedRegion:string|null=initial.region,selectedCity:string|null=initial.city,natureFeature:string|null=initial.natureFeature;
  let selectedAnimal=initial.animal,selectedAnimalRegion=initial.animalRegion,agriLayers=new Set<string>(initial.agriLayers);
  let selectedRelation:string|null=initial.relation,relationTrigger:HTMLElement|null=null;
  const allRelations=new Map<string,AgricultureRelation>((config.agricultureRelations??[]).map((r:AgricultureRelation)=>[r.id,r]));
  let lastRelationSignature:string|undefined;
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
  let climatePixels:ImageData|null=null;
  let climateBounds:number[]=[];
  let climateRequest:Promise<void>|null=null,naturePickGeneration=0,natureTrigger:HTMLElement|null=null;
  const natureLabelController=createNatureLabels(root,[
    ...config.climateCities.map((city:ClimateCity)=>({id:'city:'+city.id,name:city.nameJa,coordinate:[city.longitude,city.latitude],mode:'climate'})),
    ...Object.entries(config.natureFeatureCopy).filter(([key])=>key.startsWith('landform:')).map(([id,value]:[string,any])=>({id,name:id==='landform:大西洋海岸平野'?'大西洋岸平野':id.split(':')[1],coordinate:value.anchor,mode:'landform'})),
  ],{
    active:()=>field==='natural',mode:()=>natureMode,
    project:()=>ready&&map&&!failed&&fallback.hidden?coordinate=>map!.project(coordinate):null,
    select:(entry,trigger)=>entry.mode==='climate'?selectCity(entry.id.slice(5),true,trigger):showNatureFeature(entry.id,undefined,undefined,true,trigger),
    placed:()=>{if(!mapMoving)placeSelectionCard();},
  });

  async function loadClimatePixels(){
    if(climatePixels)return;
    if(!climateRequest)climateRequest=(async()=>{
      const [manifest,response]=await Promise.all([natureLoader.json('manifest.json'),fetch(config.natureAssetBase+'climate-classes.png')]);
      if(!response.ok)throw Error('Climate classes');
      climateBounds=manifest.climate.gridBounds3857;
      const bitmap=await createImageBitmap(await response.blob());
      try{
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
        const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Climate canvas');
        context.drawImage(bitmap,0,0);climatePixels=context.getImageData(0,0,canvas.width,canvas.height);
      }finally{bitmap.close();}
    })().finally(()=>{climateRequest=null;});
    return climateRequest;
  }

  async function pickClimate(coordinate:[number,number],trigger:HTMLElement){
    const generation=++naturePickGeneration;
    try{await loadClimatePixels();}catch{
      if(generation===naturePickGeneration&&field==='natural'&&natureMode==='climate'){
        closeSelection();el('[data-atlas-live]').textContent='この位置の気候区分を確認できませんでした。都市の雨温図は名前から開けます。';
      }
      return;
    }
    if(generation!==naturePickGeneration||field!=='natural'||natureMode!=='climate')return;
    const index=climateCell(...coordinate,climatePixels!.width,climatePixels!.height,climateBounds);
    const id=index===null?0:climatePixels!.data[index];
    const item=config.climateLegend.find((item:any)=>item.id===id);
    if(item)showNatureFeature('climate:'+item.code,undefined,coordinate,true,trigger);
    else {closeSelection();el('[data-atlas-live]').textContent='この位置の気候区分は収録されていません。';}
  }

  function cityAt(point:{x:number;y:number},project:(p:[number,number])=>{x:number;y:number}){
    return [...allCities.values()].map(city=>({city,p:project([city.longitude,city.latitude])})).filter(({p})=>Math.hypot(p.x-point.x,p.y-point.y)<=12).sort((a,b)=>Math.hypot(a.p.x-point.x,a.p.y-point.y)-Math.hypot(b.p.x-point.x,b.p.y-point.y))[0]?.city;
  }


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

  function cameraState(){
    const center=map?.getCenter();
    return center?{lng:center.lng,lat:center.lat,zoom:map!.getZoom()}:savedCamera;
  }

  function save(push=false){
    if(restoring)return;
    const url=industries.write(writeAtlasState(new URL(location.href),config.base,field,cameraState(),selectedCrop,selectedRegion,selectedStats,view,[...agriLayers] as any,selectedAnimal,selectedAnimalRegion,{env:natureMode,city:selectedCity,natureFeature},selectedRelation));
    if(field==='industry'&&push)url.hash='';
    if(config.reviewMode){url.pathname=config.base+'review/';url.searchParams.set('field',field);}
    history[push?'pushState':'replaceState']({},'',url);
    const returnUrl=new URL(url);returnUrl.pathname=config.base+'industry/';returnUrl.searchParams.delete('field');
    el<HTMLAnchorElement>('[data-industry-return-link]').href=returnUrl.pathname+returnUrl.search;
    root.querySelectorAll<HTMLAnchorElement>('[data-cross-link="agriculture"]').forEach(link=>{
      const target=writeAtlasState(new URL(url),config.base,'agriculture',cameraState(),selectedCrop,selectedRegion,selectedStats,view,[...agriLayers] as any,selectedAnimal,selectedAnimalRegion,{env:natureMode,city:selectedCity,natureFeature},selectedRelation);
      link.href=target.pathname+target.search;
    });
  }

  function updateStats(id:string,saveUrl=true){
    if(!config.statisticCropIds.includes(id))return;
    selectedStats=id;
    root.querySelectorAll<HTMLButtonElement>('[data-stat-select]').forEach(button=>{
      const active=button.dataset.statSelect===id;
      button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
    });
    root.querySelectorAll<HTMLElement>('[data-stat-panel]').forEach(panel=>panel.hidden=panel.dataset.statPanel!==id);
    if(saveUrl)save();
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

  function hideSelection(){
    selection.hidden=true;frame.appendChild(selection);selection.classList.remove('atlas-selection--below','atlas-selection--climate');
    selection.style.removeProperty('left');selection.style.removeProperty('top');selection.style.removeProperty('visibility');
    el('[data-climate-chart]').hidden=true;root.querySelectorAll<HTMLElement>('[data-city-panel]').forEach(panel=>panel.hidden=true);
    el('[data-selection-candidates]').hidden=true;el('[data-selection-candidates]').replaceChildren();
    el('[data-relation-warning]').hidden=true;
    currentCopy=null;selectedCoordinate=null;natureSelectedGeometry=null;natureLabelController.sync(null);
    (map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:[]});
  }

  function closeSelection(saveUrl=true,restoreFocus=false){
    const origin=field==='natural'?natureTrigger:relationTrigger;naturePickGeneration++;
    if(field==='agriculture'){selectedRelation=null;relationTrigger=null;syncRelationVisuals();selectedAnimal=null;selectedAnimalRegion=null;selectedCrop=null;selectedRegion=null;root.querySelectorAll('[data-crop-select]').forEach(node=>node.removeAttribute('aria-current'));}
    else if(field==='natural'){
      if(natureMode==='climate'&&!el('[data-climate-chart]').hidden){selectedCity=null;el<HTMLSelectElement>('[data-city-select]').value='';}
      else natureFeature=null;
    }
    if(field==='industry')industries.clearSelection();
    hideSelection();root.querySelectorAll<HTMLSelectElement>('[data-feature-select]').forEach(select=>select.value='');updateFocusButton();if(saveUrl)save(true);if(restoreFocus&&origin?.isConnected)origin.focus({preventScroll:true});
  }

  function showSelection(title:string,kicker:string,copy:SelectionCopy,coordinate:[number,number]|null,linkHref:string,linkText:string,cityId?:string){
    currentCopy=copy;selectedCoordinate=coordinate;el('[data-selection-title]').textContent=title;el('[data-selection-kicker]').textContent=kicker;el('[data-selection-text]').textContent=copy.full;
    const link=el<HTMLAnchorElement>('[data-selection-link]');link.href=linkHref;link.textContent=linkText;
    const chart=el('[data-climate-chart]');chart.hidden=!cityId;selection.classList.toggle('atlas-selection--climate',Boolean(cityId));
    root.querySelectorAll<HTMLElement>('[data-city-panel]').forEach(panel=>panel.hidden=panel.dataset.cityPanel!==cityId);
    selection.hidden=false;placeSelectionCard();updateFocusButton();
  }

  function regionFor(cropId:string,longitude?:number,latitude?:number,requested?:string|null){
    const normalized=cropId==='corn-soybean'?['corn','soybean']:[cropId];
    if(requested){const saved=allRegions.get(requested);if(saved?.cropIds.some(crop=>normalized.includes(crop)))return saved;}
    if(longitude===undefined||latitude===undefined)return null;
    return config.regionalInsights.filter((region:RegionalCopy)=>region.cropIds.some(crop=>normalized.includes(crop))).filter((region:RegionalCopy)=>longitude>=region.bounds[0]&&longitude<=region.bounds[2]&&latitude>=region.bounds[1]&&latitude<=region.bounds[3]).sort((left:RegionalCopy,right:RegionalCopy)=>(left.bounds[2]-left.bounds[0])*(left.bounds[3]-left.bounds[1])-(right.bounds[2]-right.bounds[0])*(right.bounds[3]-right.bounds[1]))[0]??null;
  }

  function selectCrop(id:string,longitude?:number,latitude?:number,requestedRegion?:string|null,saveUrl=true){
    const crop=id==='corn-soybean'?{name:'とうもろこし・大豆の重なり',summary:'近い地域で両方の作物がまとまります。この図だけでは、同じ畑の輪作や同時栽培は判定できません。'}:allCrops.get(id);if(!crop)return;
    selectedRelation=null;relationTrigger=null;syncRelationVisuals();
    const region=regionFor(id,longitude,latitude,requestedRegion);selectedCrop=id;selectedRegion=region?.id??null;selectedAnimal=null;selectedAnimalRegion=null;renderLivestockMarkers();
    const coordinate:[number,number]|null=longitude!==undefined&&latitude!==undefined?[longitude,latitude]:region?[(region.bounds[0]+region.bounds[2])/2,(region.bounds[1]+region.bounds[3])/2]:null;
    const detailCrop=region?.detailCrop??(id==='corn-soybean'?'corn':id);if(config.statisticCropIds.includes(detailCrop))updateStats(detailCrop,false);
    root.querySelectorAll<HTMLElement>('[data-crop-select]').forEach(node=>node.dataset.cropSelect===id?node.setAttribute('aria-current','true'):node.removeAttribute('aria-current'));
    showSelection(region?.title??crop.name,'選択地域',{full:region?.summary??crop.summary,compact:region?.compactSummary??crop.summary},coordinate,config.statisticCropIds.includes(detailCrop)?'#crop-details':'#atlas-method',config.statisticCropIds.includes(detailCrop)?'↓ 作物の詳説へ':'↓ 表示方法へ');
    if(saveUrl)save();
  }

  function selectCity(id:string,saveUrl=true,trigger?:HTMLElement){
    const city=allCities.get(id);if(!city)return;naturePickGeneration++;if(saveUrl)natureTrigger=trigger??surface;
    selectedCity=id;if(saveUrl||natureFeature?.startsWith('climate:'))natureFeature=null;el<HTMLSelectElement>('[data-city-select]').value=id;
    const cold=Math.min(...city.temperatureC),warm=Math.max(...city.temperatureC),wet=Math.max(...city.precipitationMm);
    const coldMonth=city.temperatureC.indexOf(cold)+1,warmMonth=city.temperatureC.indexOf(warm)+1,wetMonth=city.precipitationMm.indexOf(wet)+1;
    const full=`NOAAの${city.period}年平年値です。月平均気温は${coldMonth}月の${cold.toFixed(1)}℃から${warmMonth}月の${warm.toFixed(1)}℃まで変化し、月降水量は${wetMonth}月が最多です。都市全域ではなく「${city.stationName}」の観測点を表します。`;
    const code=(city as any).koppenCode;const climate=config.climateLegend.find((item:any)=>item.code===code);
    const compact=`${code??'観測地点の気候区分は沿岸格子のため未収録'}${climate?' '+climate.nameJa:''}。月平均気温は${coldMonth}月 ${cold.toFixed(1)}℃〜${warmMonth}月 ${warm.toFixed(1)}℃。`;
    natureSelectedGeometry=null;
    (map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:[{type:'Feature',properties:{kind:'city'},geometry:{type:'Point',coordinates:[city.longitude,city.latitude]}}]});
    showSelection(city.nameJa,'都市の雨温図',{full:compact,compact},[city.longitude,city.latitude],'#natural-conditions','↓ 自然環境の概説へ',city.id);
    natureLabelController.sync('city:'+id);if(saveUrl){el('[data-atlas-live]').textContent=city.nameJa+'の雨温図を表示しました。';save(true);}
  }

  function showNatureFeature(key:string,title?:string,coordinate?:[number,number],saveUrl=true,trigger?:HTMLElement){
    if(!validNatureFeature(key))return;naturePickGeneration++;if(saveUrl)natureTrigger=trigger??surface;
    const configured=config.natureFeatureCopy[key];
    let copy:SelectionCopy,anchor=coordinate??configured?.anchor??null,heading=configured?.title??title??key.split(':')[1];
    if(configured)copy={full:configured.full,compact:configured.compact};
    else if(key.startsWith('climate:')){const item=config.climateLegend.find((item:any)=>item.code===key.split(':')[1]);if(!item)return;heading=`${climateFamilyNames[item.code[0]]}｜${item.nameJa}（${item.code}）`;const code=item.code;let description=code[0]==='B'?(code[1]==='W'?'降水が非常に少ない砂漠の気候です。':'砂漠より降水がある半乾燥のステップ気候です。'):code[0]==='A'?'年間を通して気温が高い熱帯の気候です。':code[0]==='E'?'最も暖かい月でも低温となる寒帯の気候です。':`${code[0]==='D'?'冬の寒さが強い冷帯':'比較的穏やかな冬を持つ温帯'}で、${code[1]==='s'?'夏に降水が少なくなります':code[1]==='w'?'冬に降水が少なくなります':'明瞭な乾季がありません'}。`;copy={full:description+' 1991–2020年の分類格子を示します。',compact:description+' 1991–2020年の分類格子です。'};}
    else if(key.startsWith('landform:'))copy={full:'Natural Earthの地誌的な概略区分です。周囲の陰影とあわせて、山地・高原・平原の位置と広がりを読みます。地質や土壌の境界ではありません。',compact:'地誌的な概略区分です。地質・土壌の境界ではありません。'};
    else if(key.startsWith('elevation:')){const value=Number(key.split(':')[1]);copy={full:`標高${value.toLocaleString('ja-JP')}mの等高線です。同じ値の線は全域で同じ基準とし、ロッキー山脈とアパラチア山脈の高さを直接比べられます。`,compact:`標高${value.toLocaleString('ja-JP')}mの等高線です。全国で同じ基準です。`};heading=`${value.toLocaleString('ja-JP')} m 等高線`;}
    else return;
    natureFeature=key;
    root.querySelectorAll<HTMLSelectElement>('[data-feature-select]').forEach(select=>select.value=[...select.options].some(option=>option.value===key)?key:'');
    if(key.startsWith('landform:')){const feature=landFeatures.find(item=>item.properties.name===key.split(':')[1]);natureSelectedGeometry=feature?.geometry??null;(map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:feature?[feature]:[]});}
    else {natureSelectedGeometry=null;(map?.getSource('nature-highlight') as GeoJSONSource|undefined)?.setData({type:'FeatureCollection',features:[]});}
    showSelection(heading,'自然環境',{full:copy.full,compact:copy.compact},anchor,key.startsWith('climate:')?'#source-koppen':'#natural-conditions',key.startsWith('climate:')?'↓ 気候区分の出典へ':'↓ 自然環境の概説へ');natureLabelController.sync(key);if(saveUrl){el('[data-atlas-live]').textContent=heading+'の説明を表示しました。';save();}
  }

  function modePrefix(){return natureMode==='contour'?'elevation':natureMode;}

  function selectLivestock(regionId:string,saveUrl=true){hideSelection();selectedRelation=null;relationTrigger=null;syncRelationVisuals();el('[data-selection-kicker]').textContent='選択地域';const region=allLivestockRegions.get(regionId);if(!region)return;const kind=allLivestockKinds.get(region.kindId);if(!kind)return;selectedCrop=null;selectedRegion=null;selectedAnimal=region.kindId;selectedAnimalRegion=region.id;selectedCoordinate=region.anchor;currentCopy={full:region.summary,compact:region.summary};el('[data-selection-title]').textContent=`${region.label}の${kind.label}`;el('[data-selection-text]').textContent=currentCopy.full;el('[data-selection-candidates]').hidden=true;el('[data-selection-candidates]').replaceChildren();el<HTMLAnchorElement>('[data-selection-link]').href=`#livestock-${region.kindId}`;el('[data-selection-link]').textContent='↓ 畜産の詳説へ';root.querySelectorAll('[data-crop-select]').forEach(n=>n.removeAttribute('aria-current'));selection.hidden=false;renderLivestockMarkers();placeSelectionCard();if(saveUrl)save();}

  function showLivestockCandidates(regions:LivestockRegion[],coordinate:[number,number]){hideSelection();selectedRelation=null;relationTrigger=null;syncRelationVisuals();selectedCrop=null;selectedRegion=null;selectedAnimal=null;selectedAnimalRegion=null;selectedCoordinate=coordinate;currentCopy={full:'同じ範囲に複数の畜産地域があります。読みたい対象を選んでください。',compact:'複数の対象があります。'};el('[data-selection-title]').textContent='重なっている畜産';el('[data-selection-text]').textContent=currentCopy.full;const holder=el('[data-selection-candidates]');holder.replaceChildren();holder.hidden=false;for(const region of regions){const kind=allLivestockKinds.get(region.kindId),button=document.createElement('button');button.type='button';button.textContent=`${kind.symbol} ${region.label}・${kind.label}`;button.addEventListener('click',()=>selectLivestock(region.id));holder.appendChild(button);}el<HTMLAnchorElement>('[data-selection-link]').href='#livestock-details';el('[data-selection-link]').textContent='↓ 畜産の詳説へ';selection.hidden=false;placeSelectionCard();}

  function renderLivestockMarkers(){const holder=el('[data-livestock-markers]');holder.replaceChildren();if(!ready||!map||field!=='agriculture'||!agriLayers.has('livestock'))return;const visible=config.livestockRegions.map((region:LivestockRegion)=>({region,point:map!.project(region.anchor)})).filter(({point}:any)=>point.x>=20&&point.y>=20&&point.x<=frame.clientWidth-20&&point.y<=frame.clientHeight-20),groups:{regions:LivestockRegion[];points:any[]}[]=[],distance=frame.clientWidth<650?58:48;for(const item of visible){const found=groups.find(g=>Math.hypot(g.points[0].x-item.point.x,g.points[0].y-item.point.y)<distance);if(found){found.regions.push(item.region);found.points.push(item.point);}else groups.push({regions:[item.region],points:[item.point]});}for(const group of groups){const button=document.createElement('button');button.type='button';button.className='atlas-livestock-marker';const x=group.points.reduce((s,p)=>s+p.x,0)/group.points.length,y=group.points.reduce((s,p)=>s+p.y,0)/group.points.length;button.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;if(group.regions.length===1){const region=group.regions[0],kind=allLivestockKinds.get(region.kindId);button.style.setProperty('--livestock-color',kind.color);button.innerHTML=`<i aria-hidden="true">${kind.symbol}</i><span>${kind.label}</span>`;button.setAttribute('aria-label',`${region.label}の${kind.label}`);button.setAttribute('aria-pressed',String(selectedAnimalRegion===region.id));button.addEventListener('click',e=>{e.stopPropagation();selectLivestock(region.id);});}else{button.classList.add('is-cluster');button.innerHTML=`<i aria-hidden="true">${group.regions.length}</i><span>畜産</span>`;button.setAttribute('aria-label',`${group.regions.length}件の畜産地域を選ぶ`);button.addEventListener('click',e=>{e.stopPropagation();const p=map!.unproject([x,y]);showLivestockCandidates(group.regions,[p.lng,p.lat]);});}const related=selectedRelation?allRelations.get(selectedRelation):null;const emphasized=related&&group.regions.some(region=>(related.livestockRegionIds as readonly string[]).includes(region.id));button.classList.toggle('is-related',Boolean(emphasized));if(emphasized)button.setAttribute('aria-label',button.getAttribute('aria-label')+'、選択した関係で強調中');holder.appendChild(button);}}

  function updateFallbackImage(){const image=el<HTMLImageElement>('[data-fallback-image]'),overlay=el<HTMLImageElement>('[data-fallback-livestock]'),link=el<HTMLAnchorElement>('[data-fallback-full]');const showCrops=field==='agriculture'&&agriLayers.has('crops'),showLivestock=field==='agriculture'&&agriLayers.has('livestock');const src=field==='natural'?config.natureAssetBase+(natureMode==='landform'?'landform-interactive.webp':`${natureMode}-fallback.webp`):config.assetBase+(showCrops?'agriculture':'land')+'-fallback.webp';image.src=src;image.alt=field==='natural'?'米国本土の自然環境・'+config.natureModes.find((m:any)=>m.id===natureMode).label:showCrops?'米国本土の地形・河川と主要作物の栽培域の概略図。':'米国本土の地形と水系。';overlay.hidden=!showLivestock;overlay.src=config.livestockAssetBase+(showCrops?'agriculture-livestock':'livestock')+'-fallback.svg';link.href=field==='natural'?config.natureAssetBase+`${natureMode}-fallback.webp`:src;}

  function syncAgricultureLayers(saveUrl=true){syncRelationVisuals();root.querySelectorAll<HTMLInputElement>('[data-agri-layer]').forEach(input=>input.checked=agriLayers.has(input.value));if(ready&&map)setFieldLayers(map,field,natureMode,agriLayers.has('crops'));updateFallbackImage();el('[data-livestock-key]').hidden=!agriLayers.has('livestock');renderLivestockMarkers();renderLabels();if(field==='agriculture'&&((selectedCrop&&!agriLayers.has('crops'))||(selectedAnimal&&!agriLayers.has('livestock'))))closeSelection(false);placeSelectionCard();if(saveUrl)save(true);}


  function fallbackForCurrentView(){
    if(field==='agriculture')return {base:config.assetBase,name:agriLayers.has('crops')?'agriculture-fallback.webp':'land-fallback.webp',alt:'米国本土の主要作物の栽培分布'};
    if(field==='natural')return {base:config.natureAssetBase,name:natureMode==='landform'?'landform-interactive.webp':`${natureMode}-fallback.webp`,alt:'米国本土の自然環境'};
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
    el('[data-map-labels]').hidden=false;el('.atlas-map-tools').hidden=false;
  }

  async function ensureNatureModeData(mode:NatureMode){
    if(!map||!ready||field!=='natural')return;
    const key=mode==='contour'?'contour:500':mode;
    if(appliedNatureKeys.has(key)){updateContourLegend();showNatureReady();renderLabels();placeSelectionCard();updateFocusButton();return;}
    if(pendingNatureKey===key)return;
    const generation=++natureGeneration;pendingNatureKey=key;
    root.dataset.natureLoad='loading';surface.hidden=true;fallback.hidden=false;el('[data-map-labels]').hidden=true;el('.atlas-map-tools').hidden=true;
    status.textContent=`${config.natureModes.find((item:any)=>item.id===mode).label}を読み込み中…`;
    el('[data-retry-nature]').hidden=true;updateFallbackImage();updateContourLegend();
    try{
      let data:any=null;
      if(mode==='climate')await loadClimatePixels();
      if(mode==='water')data=await natureLoader.json('aquifers.geojson');
      if(mode==='contour')data=await natureLoader.contours();
      if(generation!==natureGeneration||field!=='natural'||natureMode!==mode||!map)return;
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
      if(generation!==natureGeneration||field!=='natural'||natureMode!==mode)return;
      pendingNatureKey='';root.dataset.natureLoad='error';root.dataset.renderState='fallback';status.textContent='この表示のデータを読み込めませんでした（代替図）。';el('[data-retry-nature]').hidden=false;moveSelectionBelow();
      console.error('Natural environment data',error);
    }
  }

  function renderLabels(){
    natureLabelController.schedule();if(!map||!ready)return;
    const width=frame.clientWidth,height=frame.clientHeight,occupied:number[][]=[];
    for(const item of [...labels,...contourLabels]){
      const node=item.node as HTMLElement;
      let visible=true;
      if(item.kind==='crop'&&(field!=='agriculture'||!agriLayers.has('crops')))visible=false;
      if(item.fields&&!item.fields.includes(field))visible=false;
      if(item.modes&&(field!=='natural'||!item.modes.includes(natureMode)))visible=false;
      if((field==='natural'||field==='industry')&&item.kind==='state')visible=false;
      if(field==='natural'&&item.baseLabel){
        if(item.kind==='physical')visible=natureMode==='landform'&&!config.natureLabels.some((label:any)=>label.name===item.name&&label.modes?.includes('landform'));
        if(item.kind==='water')visible=natureMode==='water';
      }
      if(field==='natural'&&natureMode==='landform'&&item.kind==='physical')visible=false;
      if(!visible){node.hidden=true;continue;}
      const point=map.project([item.lng,item.lat]);node.hidden=false;
      const nodeWidth=node.offsetWidth,nodeHeight=node.offsetHeight,rect=[point.x-nodeWidth/2,point.y-nodeHeight/2,point.x+nodeWidth/2,point.y+nodeHeight/2];
      const outside=rect[0]<5||rect[1]<28||rect[2]>width-5||rect[3]>height-5,tools=rect[2]>width-54&&rect[1]<150;
      const collide=occupied.some(other=>rect[0]<other[2]+5&&rect[2]>other[0]-5&&rect[1]<other[3]+3&&rect[3]>other[1]-3);
      node.hidden=outside||tools||collide;if(!node.hidden){node.style.transform=`translate(${Math.round(point.x-nodeWidth/2)}px,${Math.round(point.y-nodeHeight/2)}px)`;occupied.push(rect);}
    }
  }

  function restoreSelectionForView(){
    hideSelection();
    if(field==='agriculture'&&selectedRelation)selectRelation(selectedRelation,undefined,false);
    else if(field==='agriculture'&&selectedAnimalRegion)selectLivestock(selectedAnimalRegion,false);
    else if(field==='agriculture'&&selectedCrop)selectCrop(selectedCrop,undefined,undefined,selectedRegion,false);
    else if(field==='natural'&&natureFeature?.startsWith(modePrefix()+':'))showNatureFeature(natureFeature,undefined,undefined,false);
    else if(field==='natural'&&natureMode==='climate'&&selectedCity)selectCity(selectedCity,false);
    else if(field==='industry')industries.restoreSelection();
  }

  function setNatureMode(next:NatureMode,push=false){
    naturePickGeneration++;natureLabelController.schedule();
    if(next!==natureMode){natureGeneration++;pendingNatureKey='';}
    natureMode=next;root.dataset.natureMode=next;el('.atlas-fallback-map').tabIndex=field==='natural'&&next==='climate'?0:-1;if(field==='natural')el('[data-map-panel]').setAttribute('aria-labelledby',`nature-tab-${next}`);
    el('[data-feature-picker]').hidden=next==='climate'||next==='contour';
    root.querySelectorAll<HTMLElement>('[data-feature-options]').forEach(group=>group.hidden=group.dataset.featureOptions!==next);
    root.querySelectorAll<HTMLButtonElement>('[data-nature-mode]').forEach(button=>{const active=button.dataset.natureMode===next;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    el('[data-city-picker]').hidden=next!=='climate';root.querySelectorAll<HTMLElement>('[data-nature-key-panel]').forEach(panel=>panel.hidden=panel.dataset.natureKeyPanel!==next);
    root.querySelectorAll<HTMLElement>('[data-nature-summary-panel]').forEach(panel=>panel.hidden=panel.dataset.natureSummaryPanel!==next);
    const captions:Record<NatureMode,string>={climate:'ケッペン＝ガイガー区分 · 1991–2020',water:'河川・湖・貯水池・主要帯水層',landform:'山脈・高原・平原と地形陰影',contour:'標高500m間隔 · 主要線1,000m'};
    if(field==='natural')el('[data-layer-caption]').textContent=captions[next];updateFallbackImage();
    if(ready&&map){setFieldLayers(map,field,natureMode,agriLayers.has('crops'));void ensureNatureModeData(natureMode);renderLabels();}restoreSelectionForView();if(push)save(true);
  }

  function setField(next:MapField,push=false){
    naturePickGeneration++;natureLabelController.schedule();
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
    if(ready&&map){setFieldLayers(map,field,natureMode,agriLayers.has('crops'));if(field==='natural'){void ensureNatureModeData(natureMode);const context=cropFeatures.filter(item=>selectedCrop&&item.properties.id===selectedCrop);(map.getSource('crop-context') as GeoJSONSource).setData({type:'FeatureCollection',features:context});}renderLabels();}
    el('[data-agri-layers]').hidden=field!=='agriculture';updateFallbackImage();renderLivestockMarkers();
    industries.render();restoreSelectionForView();if(push)save(true);
  }

  function fail(message:string){
    if(failed)return;failed=true;ready=false;mapMoving=false;clearTimeout(timeout);criticalController.abort();root.dataset.renderState='fallback';fallback.hidden=false;surface.hidden=true;el('[data-map-labels]').hidden=true;el('[data-livestock-markers]').hidden=true;el('.atlas-map-tools').hidden=true;status.textContent=message+'（代替図）';if(natureTrigger===surface)natureTrigger=el('.atlas-fallback-map');savedCamera=cameraState();map?.remove();map=undefined;natureLabelController.schedule();syncRelationVisuals();industries.renderMarkers();if(!selection.hidden)moveSelectionBelow();
  }

  function activeRelation(){return field==='agriculture'&&selectedRelation?allRelations.get(selectedRelation):undefined;}
  function syncRelationVisuals(){
    const relation=activeRelation();
    root.querySelectorAll<HTMLButtonElement>('[data-relation-select]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.relationSelect===relation?.id)));
    root.querySelectorAll<HTMLElement>('[data-relation-item]').forEach(item=>item.classList.toggle('is-selected',item.dataset.relationItem===relation?.id));
    root.querySelectorAll('[data-fallback-relation]').forEach(group=>group.toggleAttribute('hidden',group.getAttribute('data-fallback-relation')!==relation?.id));
    root.querySelectorAll('[data-relation-crops]').forEach(group=>group.toggleAttribute('hidden',!agriLayers.has('crops')));
    root.querySelectorAll('[data-relation-animals]').forEach(group=>group.toggleAttribute('hidden',!agriLayers.has('livestock')));
    const signature=relation?.id??'';
    if(ready&&map&&lastRelationSignature!==signature){
      lastRelationSignature=signature;
      map.setFilter('crop-relation-highlight',relation?['in',['get','id'],['literal',[...relation.cropIds]]]:['==',['get','id'],'__no-relation__']);
      (map.getSource('agriculture-relation-context') as GeoJSONSource).setData({type:'FeatureCollection',features:relation?relationContextFeatures(relation.baseFeatureIds,baseFeatures,landFeatures,overlayFeatures):[]});
    }
    const missing=relation?.requiredLayers.filter(layer=>!agriLayers.has(layer))??[];
    el('[data-relation-warning]').hidden=!missing.length;
    el('[data-relation-warning-text]').textContent=missing.length?`${missing.map(layer=>layer==='crops'?'作物':'畜産').join('・')}が非表示です。表示設定は維持しています。`:'';
  }
  function selectRelation(id:string,trigger?:HTMLElement,saveUrl=true){
    const relation=allRelations.get(id);if(!relation)return;
    if(saveUrl&&selectedRelation===id){closeSelection(true,true);return;}
    hideSelection();selectedRelation=id;relationTrigger=trigger??relationTrigger;
    selectedCrop=null;selectedRegion=null;selectedAnimal=null;selectedAnimalRegion=null;
    root.querySelectorAll('[data-crop-select]').forEach(node=>node.removeAttribute('aria-current'));
    syncRelationVisuals();renderLivestockMarkers();
    showSelection(relation.title,'分布のつながり',{full:relation.mapSummary,compact:relation.takeaway},[...relation.anchor],`#relation-${relation.id}`,'↓ このつながりを詳しく読む');
    syncRelationVisuals();placeSelectionCard();
    if(saveUrl){el('[data-atlas-live]').textContent=`${relation.title}を選択。地図の位置と全国統計は変わりません。`;save(true);}
  }
  root.querySelectorAll<HTMLButtonElement>('[data-relation-select]').forEach(button=>button.addEventListener('click',()=>selectRelation(button.dataset.relationSelect!,button)));
  el('[data-enable-relation-layers]').addEventListener('click',()=>{activeRelation()?.requiredLayers.forEach(layer=>agriLayers.add(layer));syncAgricultureLayers();});
  const wideRelations=matchMedia('(min-width:900px)');
  const sizeRelationDetails=()=>root.querySelectorAll<HTMLDetailsElement>('[data-relation-details]').forEach(detail=>detail.open=wideRelations.matches);
  sizeRelationDetails();wideRelations.addEventListener('change',sizeRelationDetails);
  root.querySelectorAll<HTMLAnchorElement>('[data-relation-detail-link],[data-selection-link]').forEach(link=>link.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const id=link.hash.slice(1);
    if(id.startsWith('crop-')&&config.statisticCropIds.includes(id.slice(5))){event.preventDefault();updateStats(id.slice(5),false);save(true);const target=el('#'+id);target.scrollIntoView({block:'start'});target.tabIndex=-1;target.focus({preventScroll:true});}
    else if(id.startsWith('relation-')){event.preventDefault();const target=el('#'+id);target.querySelector<HTMLDetailsElement>('details')!.open=true;target.scrollIntoView({block:'start'});target.tabIndex=-1;target.focus({preventScroll:true});}
  }));

  el('[data-industry-return-link]').addEventListener('click',event=>{if((event as MouseEvent).metaKey||(event as MouseEvent).ctrlKey||(event as MouseEvent).shiftKey||(event as MouseEvent).altKey)return;event.preventDefault();setField('industry',true);});
  root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(link=>link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();setField(link.dataset.field as MapField,true);}));
  root.querySelectorAll<HTMLAnchorElement>('[data-crop-select]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();agriLayers.add('crops');syncAgricultureLayers(false);selectCrop(link.dataset.cropSelect!);}));
  root.querySelectorAll<HTMLButtonElement>('[data-nature-mode]').forEach(button=>{
    button.addEventListener('click',()=>setNatureMode(button.dataset.natureMode as NatureMode,true));
    button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-nature-mode]')],step=['ArrowRight','ArrowDown'].includes(event.key)?1:-1,next=(buttons.indexOf(button)+step+buttons.length)%buttons.length;buttons[next].focus();setNatureMode(buttons[next].dataset.natureMode as NatureMode,true);});
  });
  root.querySelectorAll<HTMLInputElement>('[data-agri-layer]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)agriLayers.add(input.value);else agriLayers.delete(input.value);syncAgricultureLayers();}));
  el<HTMLSelectElement>('[data-city-select]').addEventListener('change',event=>{const id=(event.currentTarget as HTMLSelectElement).value;if(id)selectCity(id,true,event.currentTarget as HTMLElement);else{selectedCity=null;closeSelection();}});
  root.querySelectorAll<HTMLButtonElement>('[data-stat-select]').forEach(button=>{button.addEventListener('click',()=>updateStats(button.dataset.statSelect!));button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-stat-select]')],next=(buttons.indexOf(button)+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();updateStats(buttons[next].dataset.statSelect!);});});
  el('[data-retry-nature]').addEventListener('click',()=>{appliedNatureKeys.delete(natureMode==='contour'?'contour:500':natureMode);void ensureNatureModeData(natureMode);});
  el('[data-focus-selection]').addEventListener('click',()=>{if(map&&selectedCoordinate){view='custom';map.jumpTo({center:selectedCoordinate});}});
  root.querySelectorAll<HTMLSelectElement>('[data-feature-select]').forEach(select=>select.addEventListener('change',()=>{if(select.value)showNatureFeature(select.value,undefined,undefined,true,select);else closeSelection();}));
  root.querySelectorAll('details').forEach(detail=>detail.addEventListener('toggle',()=>placeSelectionCard()));
  el('[data-close-selection]').addEventListener('click',()=>closeSelection(true,true));root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!selection.hidden)closeSelection(true,true);});
  let pointerStart:{x:number;y:number}|null=null,mapDragged=false;
  for(const target of [surface,fallback]){
    target.addEventListener('pointerdown',event=>{mapDragged=Boolean(pointerStart);pointerStart={x:event.clientX,y:event.clientY};});
    target.addEventListener('pointermove',event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6)mapDragged=true;});
    target.addEventListener('pointerup',()=>{pointerStart=null;});
    target.addEventListener('pointercancel',()=>{pointerStart=null;mapDragged=true;});
  }
  const fallbackMap=el('.atlas-fallback-map');fallbackMap.tabIndex=0;fallbackMap.setAttribute('aria-label','代替図の気候区分。都市と地形は名前から選べます');
  fallbackMap.addEventListener('click',event=>{
    if(fallback.hidden||field!=='natural'||natureMode!=='climate'||mapDragged)return;
    const rect=frame.getBoundingClientRect(),point={x:event.clientX-rect.left,y:event.clientY-rect.top},box=natureLabelController.fallbackBox();
    const coordinate=unprojectNatureFallback(point,box);if(!coordinate)return;
    const city=cityAt(point,p=>projectNatureFallback(p,box));if(city)selectCity(city.id,true,fallbackMap);else void pickClimate(coordinate,fallbackMap);
  });
  if(location.hash.startsWith('#crop-')&&config.statisticCropIds.includes(location.hash.slice(6)))selectedStats=location.hash.slice(6);
  updateStats(selectedStats,false);setNatureMode(natureMode);setField(field);syncAgricultureLayers(false);timeout=window.setTimeout(()=>fail('地図データの読み込みが完了しませんでした。'),30000);

    window.addEventListener('popstate',()=>{restoring=true;natureGeneration++;pendingNatureKey='';const state=readAtlasState(new URL(location.href),config.initialField);field=state.field;natureMode=state.env;agriLayers=new Set(state.agriLayers);selectedRelation=state.relation;relationTrigger=null;natureTrigger=null;naturePickGeneration++;selectedAnimal=state.animal;selectedAnimalRegion=state.animalRegion;selectedCrop=state.crop;selectedRegion=state.region;selectedCity=state.city;natureFeature=state.natureFeature;view=state.view;savedCamera=state.camera??undefined;industries.restore();setField(field);setNatureMode(natureMode);updateStats(state.stats,false);syncAgricultureLayers(false);if(state.camera&&map&&state.view==='custom')map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});else if(map&&state.view==='fit'){suppressNextMove=true;map.fitBounds(fitBounds,{duration:0,padding:{top:30,bottom:14,left:12,right:12}});}restoring=false;});

  try{
    const fetchJson=async(base:string,name:string)=>{const testMissing=config.reviewMode&&new URL(location.href).searchParams.get('qa')==='asset-error'&&name==='manifest.json';const response=await fetch(base+(testMissing?'qa-missing-manifest.json':name),{signal:criticalController.signal});if(!response.ok)throw new Error(name+': '+response.status);return response.json();};
    const empty={type:'FeatureCollection',features:[]};
    const [lib,manifest,base,crops,land,stateLabels,cropLabels,natureManifest,overlays]=await Promise.all([import('maplibre-gl'),fetchJson(config.assetBase,'manifest.json'),fetchJson(config.assetBase,'base.geojson'),fetchJson(config.assetBase,'agriculture.geojson'),fetchJson(config.assetBase,'land.geojson'),fetchJson(config.assetBase,'labels.json'),fetchJson(config.assetBase,'crop-labels.json'),natureLoader.json('manifest.json'),fetchJson(config.natureAssetBase,'overlays.geojson')]);
    if(failed)return;
    fitBounds=[[-128,22],[-64,52]];landFeatures=land.features;cropFeatures=crops.features;baseFeatures=base.features;overlayFeatures=overlays.features;
    climateBounds=natureManifest.climate.gridBounds3857??[];
    const style=createAtlasStyle(config,manifest,base,crops,land,{manifest:natureManifest,cities:config.climateCities,aquifers:empty,contours:empty,overlays});
    lib.setWorkerCount(1);map=new lib.Map({container:surface,style,attributionControl:false,cooperativeGestures:true,locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は２本指で動かせます'},renderWorldCopies:false,dragRotate:false,touchPitch:false,pitchWithRotate:false,rollEnabled:false,maxPitch:0,maxZoom:7,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),bounds:fitBounds,fitBoundsOptions:{padding:{top:30,bottom:14,left:12,right:12}},maxBounds:[[-137,16],[-56,58]],refreshExpiredTiles:false,fadeDuration:0});
    map.touchZoomRotate.disableRotation();map.scrollZoom.disable();if(initial.camera&&initial.view==='custom')map.jumpTo({center:[initial.camera.lng,initial.camera.lat],zoom:initial.camera.zoom});
    surface.addEventListener('webglcontextlost',()=>fail('この端末の地図描画が停止しました。'),true);map.on('error',event=>{console.error('Atlas data/render error',event.error?.message);fail('地図の描画またはデータの読み込みに失敗しました。');});
    map.once('load',()=>{
      if(failed||!map)return;ready=true;clearTimeout(timeout);root.dataset.renderState='ready';fallback.hidden=true;el('.atlas-map-tools').hidden=false;
      const size=12,rgba=new Uint8Array(size*size*4);for(let row=0;row<size;row++)for(let column=0;column<size;column++){const index=(row*size+column)*4;rgba.set((column+row)%size<3?[169,139,38,165]:[0,0,0,0],index);}map.addImage('overlap-stripe',{width:size,height:size,data:rgba});map.setPaintProperty('crops-overlap','fill-pattern','overlap-stripe');
      const pattern=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++)pattern.set((x+y)%size<2?[128,112,145,220]:[0,0,0,0],(y*size+x)*4);map.addImage('aquifer-stripe',{width:size,height:size,data:pattern});map.setPaintProperty('aquifers-pattern','fill-pattern','aquifer-stripe');
      labels=[...cropLabels,...config.geographicLabels.map((item:any)=>({...item,baseLabel:true})),...config.natureLabels,...stateLabels.map((item:any)=>({...item,baseLabel:true}))].sort((left,right)=>left.priority-right.priority);
      const labelParent=el('[data-map-labels]');for(const item of labels){const node=document.createElement('span');node.className='atlas-geolabel atlas-geolabel--'+item.kind;node.textContent=item.name;node.hidden=true;if(item.color)node.style.setProperty('--label-color',item.color);labelParent.appendChild(node);item.node=node;}
      setField(field);setNatureMode(natureMode);updateStats(selectedStats,false);renderLabels();restoreSelectionForView();save();
      map.on('movestart',()=>{mapMoving=true;});map.on('dragstart',()=>{mapDragged=true;});
      map.on('move',()=>{renderLabels();renderLivestockMarkers();industries.renderMarkers();if(!selection.hidden&&selection.parentElement===frame)selection.style.visibility='hidden';});map.on('moveend',()=>{mapMoving=false;if(!suppressNextMove)view='custom';else suppressNextMove=false;renderLabels();renderLivestockMarkers();industries.renderMarkers();placeSelectionCard();updateFocusButton();save();});
      map.on('click',event=>{
        if(field==='natural'&&mapDragged)return;
        if(field==='agriculture'){
          if(!agriLayers.has('crops')){closeSelection();return;}
          const features=map!.queryRenderedFeatures([[event.point.x-6,event.point.y-6],[event.point.x+6,event.point.y+6]],{layers:['crops-fill','crops-overlap']});const feature=features.find(item=>item.properties.id==='corn-soybean')??features[0];if(feature)selectCrop(feature.properties.id,event.lngLat.lng,event.lngLat.lat);else closeSelection();return;
        }
        if(field==='natural'){
          const box:[[number,number],[number,number]]=[[event.point.x-8,event.point.y-8],[event.point.x+8,event.point.y+8]];
          if(natureMode==='climate'){const city=cityAt(event.point,p=>map!.project(p));if(city)selectCity(city.id,true,surface);else void pickClimate([event.lngLat.lng,event.lngLat.lat],surface);return;}
          if(natureMode==='water'){const candidates=map!.queryRenderedFeatures(box,{layers:['reservoir-points','rivers','lakes','aquifers-fill']});const feature=candidates.filter(item=>validNatureFeature('water:'+(item.properties.kind==='reservoir'?item.properties.id:item.properties.AQ_NAME??item.properties.name))).sort((a,b)=>['reservoir-points','rivers','lakes','aquifers-fill'].indexOf(a.layer.id)-['reservoir-points','rivers','lakes','aquifers-fill'].indexOf(b.layer.id))[0];if(!feature){natureFeature=null;hideSelection();save();return;}const identity=feature.properties.kind==='reservoir'?feature.properties.id:feature.properties.AQ_NAME??feature.properties.name;showNatureFeature(`water:${identity}`,feature.properties.nameJa,[event.lngLat.lng,event.lngLat.lat]);return;}
          if(natureMode==='landform'){const feature=map!.queryRenderedFeatures(event.point,{layers:['land-picking']}).sort((left,right)=>left.properties.area-right.properties.area)[0];if(!feature){natureFeature=null;hideSelection();save();return;}showNatureFeature(`landform:${feature.properties.name}`,feature.properties.name,[event.lngLat.lng,event.lngLat.lat]);return;}
          const feature=map!.queryRenderedFeatures(box,{layers:['contours-hit']}).sort((left,right)=>Number(right.properties.index)-Number(left.properties.index))[0];if(feature)showNatureFeature(`elevation:${feature.properties.elevationM}`,undefined,[event.lngLat.lng,event.lngLat.lat]);else{natureFeature=null;hideSelection();save();}return;
        }
        if(field==='industry'){closeSelection();return;}
        const features=map!.queryRenderedFeatures(event.point,{layers:['land-picking']}).sort((left,right)=>left.properties.area-right.properties.area);if(!features.length){hideSelection();return;}showSelection(features[0].properties.name,'選択地域',{full:'Natural Earthの地誌的な地域区分です。自然環境へ切り替えると、同じ位置で気候・水・地形・標高を比べられます。',compact:'地誌的な概略区分です。自然環境で詳しく比べられます。'},[event.lngLat.lng,event.lngLat.lat],'#land-conditions','↓ 土地の解説へ');
      });
      root.querySelectorAll<HTMLButtonElement>('[data-map-action]').forEach(button=>button.addEventListener('click',()=>{if(!map)return;if(button.dataset.mapAction==='fit'){view='fit';suppressNextMove=true;map.fitBounds(fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});}if(button.dataset.mapAction==='in'){view='custom';map.zoomIn({duration:0});}if(button.dataset.mapAction==='out'){view='custom';map.zoomOut({duration:0});}}));
      let lastWidth=frame.clientWidth,lastHeight=frame.clientHeight;new ResizeObserver(()=>{if(!map||failed)return;const width=frame.clientWidth,height=frame.clientHeight;if(width===lastWidth&&height===lastHeight)return;lastWidth=width;lastHeight=height;const oldView=view;suppressNextMove=true;map.resize();if(oldView==='fit'){suppressNextMove=true;map.fitBounds(fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});}else{renderLabels();renderLivestockMarkers();industries.renderMarkers();placeSelectionCard();}}).observe(frame);
      if(config.reviewMode)window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data!=='atlas-qa-lose-context'||!map)return;map.getCanvas().getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();});
    });

    const hashTarget=location.hash?document.getElementById(location.hash.slice(1)):null;if(hashTarget?.closest('details'))hashTarget.closest('details')!.open=true;
  }catch(error){console.error('Atlas initialization',error);fail('この環境では操作できる地図を読み込めませんでした。');}
}
