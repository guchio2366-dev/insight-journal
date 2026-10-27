import {southeastFarmGroup,isSoutheastFarmGroupTopic,southeastFarmMapNote} from '../data/atlas/asia/southeast-asia-farm-groups';
import {southeastFarmMapFilter,southeastFarmCropLabels,renderSoutheastLivestockMarkers} from '../lib/atlas-southeast-farm-map';
import {layoutNatureLabels,leaderEnd,boxesOverlap,type Box} from '../lib/atlas-nature-labels';
import {layoutClimateCodes,type CodeInput,type CodePlacement} from '../lib/atlas-climate-code-labels';
import type {AsiaState} from '../lib/atlas-asia-state';
import {majorClimateCities,indiaPopulationLabels} from '../data/atlas/asia-focus';
import {contourBandFiles,type AsiaContourBands} from '../data/atlas/asia-contour-bands';
import {centralRainfallColor,southRainfallColor} from '../data/atlas/asia-south-central-rainfall-legend';
import {southeastRainfallColor} from '../lib/atlas-southeast-rainfall';
import {southCentralReligionCensuses,southCentralReligionReports,southCentralReligionLocalCases} from '../data/atlas/asia-south-central-religion';
import {Marker} from 'maplibre-gl';
import {eastCultureExamples} from '../data/atlas/east-asia-cultural-geography';
import southeastLandformExtents from '../data/atlas/asia/southeast-landform-extents.json';
import {southeastRiverAnchors,southeastRiverSegments,layoutSoutheastRiverNames} from '../lib/atlas-southeast-natural-labels.ts';
import {southeastLandformAtPoint,southeastRiverIds as southeastSelectedRiverIds} from '../lib/atlas-southeast-natural-selection.ts';
import {eastForestSites,eastOceanNames} from '../data/atlas/east-asia-review-geography.ts';
import eastSeas from '../../public/assets/atlas/east-asia-v2/seas.json';
type Coordinate=[number,number];
type Annotation={id:string;text:string;coordinate:Coordinate;anchors?:Coordinate[];product?:string;kind?:string;color?:string;value?:number};
export type AsiaPresentation={
 settlements?:Record<string,{file:string;categories:{id:string;label:string;color:string;anchors:Coordinate[];sourceGroups?:{statename:string;group:string}[]}[]}>;
 farming:{file:string;cropFile?:string;livestockFile?:string;products:{id:string;title:string;kind:string;color:string;threshold:number;unit:string}[];labels:Annotation[]};
 rainfall:{file:string;levels:number[];labels:Annotation[];bands?:AsiaContourBands};
 terrain?:{file:string;levels:number[];labels:Annotation[];bands?:AsiaContourBands};
 climate:{id:number;code:string;name:string;anchors:Coordinate[];minZoom:number}[];
};
type City={id:string;name:string;coordinates:Coordinate;countryCode?:string;country?:string};
export function createAsiaPresentation(root:HTMLElement,config:{presentation:AsiaPresentation;regionId?:string;focusId?:string;allowSingleItem?:boolean;presentationBase:string;socialBase?:string;religionCountries?:string[];cities:City[];population?:{cities:City[]};riverFile?:string;riverIds?:string[];landforms?:{id:string;name:string;coordinates:Coordinate}[];selectSettlement?:(id:string|null)=>void;selectReligionCountry?:(code:string,localId?:string)=>void;selectBasin?:(id:string)=>void;selectRiver?:(id:string)=>void;selectFarmKinds?:(farms:AsiaState['farms'])=>void;waterFocus?:{id:string;name:string;displayName?:string;river:string}[];selectForestCountry?:(code:string)=>void;selectLandform?:(id:string)=>void},getState:()=>AsiaState,chooseCity:(id:string)=>void,chooseUrban:(id:string)=>void,choosePoint:(point:Coordinate)=>void,chooseFarm:(id:string)=>void,onStatus:(message:string)=>void){
 const metadata=config.presentation,overlay=root.querySelector<HTMLElement>('[data-map-annotations]')!;
 let map:import('maplibre-gl').Map|null=null,revision=0,scheduled=0,disposed=false;
 let errorMode:string|null=null;
 const events=new AbortController();
 const controls=root.querySelectorAll<HTMLInputElement>('[data-farm-kind]');
 const selectedKinds=new Set(controls.length?[...controls].filter(control=>control.checked).map(control=>control.dataset.farmKind!):['crop','livestock']);
 const toggles=root.querySelectorAll<HTMLButtonElement>('[data-farm-toggle]');
 const syncKinds=()=>{if(config.selectFarmKinds){selectedKinds.clear();const value=getState().farms;if(value!=='none')for(const kind of ['crop','livestock'])if(!value||value===kind)selectedKinds.add(kind);}if(config.regionId==='southeast-asia'){selectedKinds.clear();const group=southeastFarmGroup(getState().topic);if(group)selectedKinds.add(group.kind);}if(singleFarm()){selectedKinds.clear();selectedKinds.add(singleFarm()!.kind);}for(const b of toggles){const on=selectedKinds.has(b.dataset.farmToggle!);b.setAttribute('aria-pressed',String(on));const label=b.querySelector('span');if(label)label.textContent=on?'表示':'非表示';}};
 const datasets=new Map<string,any>(),pending=new Map<string,Promise<any>>();
 const sourceWaits=new Set<()=>void>();
 const buttons=new Map<string,HTMLButtonElement>();
 let religionMarkers:Marker[]=[];
 const clearReligionMarkers=()=>{for(const marker of religionMarkers)marker.remove();religionMarkers=[];};
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
 const selectedFarm=()=>getState().field==='agriculture'?metadata.farming.products.find(p=>p.id===getState().topic):undefined;
 const singleFarm=()=>config.allowSingleItem&&getState().single?selectedFarm():undefined;
 const mode=()=>{const s=getState();return s.field==='natural'?(s.topic??'climate'):s.field==='agriculture'?(selectedFarm()||config.regionId==='southeast-asia'&&isSoutheastFarmGroupTopic(s.topic)?'overview':s.topic??(s.city?'rice':'overview')):s.field==='population'?(!s.topic||['density','urban'].includes(s.topic)?'population':['ethnicity','religion'].includes(s.topic)?s.topic:null):null;};
 async function load(file:string){
  if(datasets.has(file))return datasets.get(file);
  if(!pending.has(file))pending.set(file,(async()=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);try{const response=await fetch(file.startsWith('/')?file:config.presentationBase+file,{signal:abort.signal});if(!response.ok)throw Error('Presentation asset '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());const text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);const data=JSON.parse(text);datasets.set(file,data);return data;}finally{clearTimeout(timer);}})().finally(()=>pending.delete(file)));
  return pending.get(file)!;
 }
 function line(x1:number,y1:number,x2:number,y2:number,color='#637c81') {const el=document.createElementNS(svg.namespaceURI,'line');for(const [key,value] of Object.entries({x1,y1,x2,y2,stroke:color,'stroke-width':.9}))el.setAttribute(key,String(value));svg.append(el);return el;}
 function dot(x:number,y:number){const el=document.createElementNS(svg.namespaceURI,'circle');for(const [key,value] of Object.entries({cx:x,cy:y,r:3.5,fill:'#fff',stroke:'#345965','stroke-width':1.8}))el.setAttribute(key,String(value));svg.append(el);}
 function button(id:string,text:string,kind:string,action:()=>void){
  let b=buttons.get(id);if(!b){b=document.createElement('button');b.type='button';b.onclick=event=>{event.stopPropagation();action();};buttons.set(id,b);overlay.append(b);}
  b.className=kind;b.textContent=text;b.hidden=true;b.style.opacity='1';return b;
 }
 function measuredWidth(b:HTMLButtonElement,fallback:number){b.hidden=false;b.style.width='max-content';const width=b.getBoundingClientRect().width;b.hidden=true;return width||fallback;}
 function update(){
  scheduled=0;if(!map||disposed||typeof map.project!=='function')return;
  const active=mode(),state=getState(),water=active==='overview'&&state.overlay==='water',eastFarmReferences=active==='overview'&&config.regionId==='east-asia',centralFarmReferences=active==='overview'&&config.focusId==='central-asia'&&!water;overlay.hidden=!['climate','population','overview','precipitation','terrain','landform','water','basins','groundwater','ethnicity','religion','forest'].includes(active??'');const southeastClimateKey=root.querySelector<HTMLElement>('[data-southeast-climate-key]');if(southeastClimateKey)southeastClimateKey.hidden=active!=='climate';
  for(const b of buttons.values())b.hidden=true;overlay.querySelectorAll('.asia-religion-marker,[data-east-water-city]').forEach(marker=>marker.remove());svg.replaceChildren();if(overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;
  const compact=width<440,bounds={left:0,top:0,right:width,bottom:height};
  const obstacles:Box[]=[{left:width-(compact?62:70),top:0,right:width,bottom:compact?165:190}];
  if(active==='climate'&&southeastClimateKey&&!southeastClimateKey.hidden){
   const key=southeastClimateKey.getBoundingClientRect(),frame=overlay.getBoundingClientRect();
   obstacles.push({left:key.left-frame.left,top:key.top-frame.top,right:key.right-frame.left,bottom:key.bottom-frame.top});
  }
  if(active==='overview'&&config.regionId!=='southeast-asia')obstacles.push({left:0,top:0,right:225,bottom:55});
  const project=(p:Coordinate)=>map!.project(p);
  if(config.regionId==='southeast-asia'&&['terrain','landform'].includes(active??''))for(const footprint of southeastLandformExtents.features){
   for(const coords of footprint.lines){
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.dataset.landformExtent=footprint.id;
    path.setAttribute('d',coords.map(([lon,lat],index)=>{const p=project([lon,lat]);return `${index?'L':'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;}).join(' '));
    path.setAttribute('fill','none');path.setAttribute('stroke',state.detail===footprint.id?'#a4422f':'#6d345b');
    path.setAttribute('stroke-width',state.detail===footprint.id?'2.8':'1.5');path.setAttribute('stroke-dasharray',state.detail===footprint.id?'':'5 3');
    path.setAttribute('opacity',state.detail&&state.detail!==footprint.id?'.38':'.85');svg.append(path);
   }
  }
  const southeastPopulation=active==='population'&&root.dataset.region==='southeast-asia';
  const waterCities=['water','basins','groundwater'].includes(active??'');
  const cities=active==='climate'?config.cities:active==='population'?config.population?.cities??[]:waterCities&&root.dataset.region!=='southeast-asia'&&config.focusId!=='central-asia'?config.cities.filter(c=>majorClimateCities.has(c.id)&&(root.dataset.region!=='south-central-asia'||['new-delhi','karachi','dhaka','tashkent','astana'].includes(c.id))):[];
  let visible=cities.filter(c=>{const p=project(c.coordinates);return p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height;});
  if(active==='climate'||active==='population'){
   // Station points survive label thinning and collisions. Hover/focus names
   // and tap-to-open diagrams also expose stations without a permanent label.
   for(const city of visible){
    if(southeastPopulation)continue;
    const p=project(city.coordinates),b=button('station-'+city.id,'',active==='population'&&config.regionId==='east-asia'?'asia-climate-station asia-population-station':'asia-climate-station',()=>active==='climate'?chooseCity(city.id):chooseUrban(city.id));
    // In the compact Central Asian view, nearby stations can be closer than
    // the default 24px hit box. Keep their geographic points and keyboard
    // buttons, while preventing an invisible neighbour from owning the centre.
    if(active==='climate'&&root.dataset.region==='south-central-asia'){
     const nearest=Math.min(...visible.filter(other=>other.id!==city.id).map(other=>{const q=project(other.coordinates);return Math.hypot(p.x-q.x,p.y-q.y);}));
     const target=Math.min(24,Math.max(12,nearest*1.5));b.style.width=b.style.height=target+'px';
    }
    b.dataset.station=city.id;if(active==='population')b.dataset.urbanPoint=city.id;b.setAttribute('aria-label',city.name+(active==='climate'?'の雨温図':'の都市位置。選ぶと公表人口を表示'));b.setAttribute('aria-pressed',String(active==='climate'?state.city===city.id:state.detail===city.id));
    const name=document.createElement('span');name.textContent=city.name;if(p.x>width-150){name.style.left='auto';name.style.right='calc(50% + 9px)';}b.append(name);
    b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=false;
    obstacles.push({left:p.x-5,top:p.y-5,right:p.x+5,bottom:p.y+5});
   }
   visible=visible.filter(c=>active==='climate'?majorClimateCities.has(c.id)||config.regionId!=='east-asia'&&c.id===state.city:c.country!=='IND'||!!indiaPopulationLabels[c.id]||state.point?.every((n,i)=>Math.abs(n-c.coordinates[i])<.001));
  }
  if(active==='population'&&map.getZoom()<5){
   const priority=root.dataset.region==='south-central-asia'?['uc-6090','uc-7963','uc-11352','uc-2457','uc-7794','uc-2907','uc-2847','uc-4865','uc-632','uc-1822']:[];
   const ordered=config.regionId==='east-asia'?[...visible]:[...visible].sort((a,b)=>Number(b.id===state.detail)-Number(a.id===state.detail)||(priority.indexOf(a.id)<0?99:priority.indexOf(a.id))-(priority.indexOf(b.id)<0?99:priority.indexOf(b.id)));
   const chosen:City[]=[];const limit=root.dataset.region==='south-central-asia'?compact?6:9:compact?8:12;
   for(const city of ordered){const p=project(city.coordinates);if(config.regionId!=='east-asia'&&city.id===state.detail||chosen.every(c=>{const q=project(c.coordinates);return Math.hypot(p.x-q.x,p.y-q.y)>43;}))chosen.push(city);if(chosen.length===limit)break;}
   visible=chosen;
  }
  if(active==='population')for(const id of ['asia-urban-points','asia-urban-hit'])if(map.getLayer(id))map.setFilter(id,['in',['get','id'],['literal',cities.map(c=>c.id)]]);
  if(waterCities&&active!=='basins'&&config.regionId==='east-asia'){
   for(const city of visible){const point=project(city.coordinates),marker=document.createElement('span');marker.className='east-water-city-point';marker.dataset.eastWaterCity=city.id;marker.dataset.coordinate=city.coordinates.join(',');marker.setAttribute('role','img');marker.setAttribute('aria-label',city.name+'の位置');marker.tabIndex=0;marker.style.left=point.x+'px';marker.style.top=point.y+'px';const label=document.createElement('span');label.textContent=city.name;marker.append(label);marker.addEventListener('click',event=>event.stopPropagation());overlay.append(marker);}visible=[];
  }
  if(active==='basins'&&root.dataset.region==='east-asia')visible=[];
  const inputs=visible.map(c=>{const shortName=active==='climate'&&root.dataset.region==='southeast-asia'?c.id==='quezon-city'?'マニラ':c.id==='jakarta'?'ジャカルタ':c.name.replace(/（.*$/, ''):c.name.split('／')[0];const b=button(active+'-'+c.id,shortName,southeastPopulation?'asia-city-name asia-population-name':'asia-city-name',()=>active==='climate'?chooseCity(c.id):waterCities?choosePoint(c.coordinates):chooseUrban(c.id));if(southeastPopulation){b.disabled=true;b.setAttribute('aria-label',shortName+'の位置');}else{b.dataset[active==='climate'?'mapCity':'mapUrban']=c.id;b.setAttribute('aria-label',`${c.name}の${active==='climate'?'雨温図':waterCities?'場所':'人口'}`);b.setAttribute('aria-pressed',String((active==='climate'?state.city:state.detail)===c.id));}return {id:c.id,anchor:project(c.coordinates),width:Math.max(32,shortName.length*(southeastPopulation?10:compact?11:12)+10),height:southeastPopulation?19:compact?28:32};});
  const placed=layoutNatureLabels(inputs,bounds,obstacles);
  for(const rect of placed){const b=buttons.get(active+'-'+rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);if(active!=='climate'&&!southeastPopulation)dot(rect.anchor.x,rect.anchor.y);}
  const codes:CodeInput[]=[];
  if(active==='climate')for(const cls of metadata.climate){
   if(map.getZoom()<cls.minZoom)continue;
   const text=cls.code,id='climate-'+cls.id;const b=button(id,text,'asia-climate-code',()=>choosePoint(cls.anchors[0]));b.setAttribute('aria-label',`${cls.code} ${cls.name}の分布を確認`);
   // The click target uses the anchor actually chosen by the collision layout.
   b.onclick=event=>{event.stopImmediatePropagation();const point=b.dataset.coordinate?.split(',').map(Number) as Coordinate;choosePoint(point);};
   codes.push({id,code:text,anchors:cls.anchors.map(project),width:measuredWidth(b,cls.code.length*9+12),height:24});
  }
  const annotation:Annotation[]=[];
  if(active&&metadata.settlements?.[active]&&!(root.dataset.region==='south-central-asia'&&active==='religion'&&!state.detail)){
   const major=new Set(['ethnicity-0','ethnicity-1','ethnicity-2','ethnicity-4','ethnicity-5','ethnicity-7','ethnicity-10','ethnicity-13','ethnicity-14']);
   const detailed=map.getZoom()>=4.7||!!state.detail;
   for(const c of metadata.settlements[active].categories.filter(c=>!c.id.endsWith('-shared')&&(root.dataset.region!=='south-central-asia'||active!=='ethnicity'||detailed||major.has(c.id)))){
    annotation.push({id:c.id,text:c.label,coordinate:c.anchors[0],anchors:c.anchors,color:c.color,kind:'settlement'});
   }
  }
  if(config.regionId==='east-asia'&&['ethnicity','religion'].includes(active??'')){
   const origin=overlay.getBoundingClientRect();
   for(const marker of overlay.querySelectorAll<HTMLElement>('.asia-religion-marker')){const rect=marker.getBoundingClientRect();obstacles.push({left:rect.left-origin.left,top:rect.top-origin.top,right:rect.right-origin.left,bottom:rect.bottom-origin.top});}
   for(const example of eastCultureExamples.filter(example=>example.topic===active))annotation.push({id:example.id,text:example.label,coordinate:example.point,kind:'culture'});
  }
  if((['water','basins'].includes(active??'')||active==='landform'&&config.regionId==='east-asia')&&config.riverFile&&datasets.has(config.riverFile))for(const focus of config.waterFocus??[]){
   const feature=datasets.get(config.riverFile).features.find((f:any)=>f.properties.id===focus.river);if(!feature)continue;
   const lines=feature.geometry.type==='MultiLineString'?feature.geometry.coordinates:[feature.geometry.coordinates],path=[...lines].sort((a:any,b:any)=>b.length-a.length)[0];if(path?.length){const anchors=root.dataset.region==='southeast-asia'?southeastRiverAnchors(focus.river,feature.geometry):undefined;annotation.push({id:focus.river,text:focus.displayName??focus.name,coordinate:path[Math.floor(path.length/2)],anchors,kind:'river'});}
  }
  if(active==='forest'&&config.regionId==='east-asia')for(const site of eastForestSites)annotation.push({id:site.id,text:site.name,coordinate:site.point,kind:'forest-site'});
  if(active==='landform'&&config.regionId==='east-asia')for(const item of eastOceanNames)annotation.push({id:item.id,text:item.name,coordinate:item.point,kind:'reference'});
  if(active==='landform'&&config.regionId==='east-asia')for(const sea of eastSeas.names)annotation.push({id:sea.id,text:sea.name,coordinate:sea.point as Coordinate,kind:'reference'});
  if(config.focusId==='central-asia'&&['terrain','landform'].includes(active??''))annotation.push({id:'central-turan-lowland',text:'トゥランの乾燥低地',coordinate:[61.5,42.8],anchors:[[61.5,42.8],[58.5,40.8],[63.5,44]],kind:'reference'});
  if(config.focusId==='central-asia'&&active==='climate')annotation.push({id:'central-westerlies',text:'中緯度の偏西風（概略）',coordinate:[58,49],anchors:[[58,49],[56,47.5],[61,50.5]],kind:'reference'});
  if(config.focusId==='south-asia'&&['terrain','landform'].includes(active??''))annotation.push({id:'palk-strait',text:'ポーク海峡',coordinate:[80.35,9.55],kind:'reference'});
  if(config.focusId==='south-asia'&&active==='climate')annotation.push({id:'southwest-monsoon',text:'南西季節風 ↗（夏）',coordinate:[68,12],kind:'reference'});
  if(active==='landform'||active==='terrain'&&config.regionId==='southeast-asia'||active==='terrain'&&['south-asia','central-asia'].includes(config.focusId??'')||active==='climate'&&config.regionId==='east-asia')annotation.push(...(config.landforms??[]).filter(f=>active!=='climate'||['tibetan-plateau','sichuan-basin','north-china-plain','mongolian-plateau','japan-alps','taiwan-mountains'].includes(f.id)).map(f=>({id:f.id,text:f.name,coordinate:f.coordinates,kind:active==='climate'?'reference':'landform'})));
  if(config.regionId==='southeast-asia'&&['terrain','landform'].includes(active??''))annotation.push(...([
   {id:'monsoon-winds',text:'冬↙ 北東季節風\n夏↗ 南西季節風',coordinate:[103,7.5] as Coordinate,anchors:[[103,7.5],[105,6],[100,8]] as Coordinate[],kind:'marine-process'},
   {id:'vietnam-coastal-current',text:'ベトナム沖沿岸流\n冬↙／夏↗',coordinate:[112,15.5] as Coordinate,anchors:[[112,15.5],[110,12],[113,11]] as Coordinate[],kind:'marine-process'},
  ] as Annotation[]));
  if(config.regionId==='southeast-asia'&&['terrain','landform'].includes(active??''))annotation.push(...([
   ['andaman-sea','アンダマン海',[95,11]],['south-china-sea','南シナ海',[113,13]],['java-sea','ジャワ海',[111,-4]],
   ['malacca-strait','マラッカ海峡',[100.8,3.7]],['makassar-strait','マカッサル海峡',[118,-2]],
  ] as [string,string,Coordinate][]).map(([id,text,coordinate])=>({id,text,coordinate,kind:'marine'})));
  if(active==='population'&&config.regionId==='southeast-asia')annotation.push({id:'java-population',text:'ジャワ島',coordinate:[110.4,-7.4],kind:'landform'});
  if(active==='overview'&&!water&&datasets.has(metadata.farming.file)){const southCentral=root.dataset.region==='south-central-asia';const southAnchors:Record<string,string>={rice:'rice-0',wheat:'wheat-2',cotton:'cotton-1',chickpea:'chickpea-0',tea:'tea-3',sugarcane:'sugarcane-2'};const groups=metadata.farming.products.map(p=>{const labels=metadata.farming.labels.filter(a=>a.product===p.id);const preferred=config.focusId==='south-asia'?labels.find(a=>a.id===southAnchors[p.id]):undefined;return labels.length?{...(preferred??labels[0]),id:p.id,anchors:config.focusId==='south-asia'&&p.kind==='crop'?[preferred?.coordinate??labels[0].coordinate]:labels.map(a=>a.coordinate)}:null;}).filter((a):a is NonNullable<typeof a>=>!!a&&selectedKinds.has(a.kind??'crop')&&(!singleFarm()||a.product===singleFarm()!.id));const cropGroups=config.regionId==='southeast-asia'?southeastFarmCropLabels(metadata.farming.labels,state.topic,state.single,{project,bounds}):config.regionId==='east-asia'?metadata.farming.labels.filter(a=>a.kind==='crop'&&selectedKinds.has('crop')&&(!singleFarm()||a.product===singleFarm()!.id)):groups.filter(a=>a.kind==='crop');if(southCentral&&config.focusId!=='south-asia'&&selectedFarm()?.kind==='crop')cropGroups.sort((a,b)=>Number(b.product===selectedFarm()!.id)-Number(a.product===selectedFarm()!.id));annotation.push(...cropGroups);
   if(selectedKinds.has('livestock')&&config.regionId==='southeast-asia')placed.push(...renderSoutheastLivestockMarkers({labels:metadata.farming.labels,topic:state.topic,single:state.single,bounds,obstacles,project,button,chooseFarm,line}));
   if(selectedKinds.has('livestock')&&config.regionId!=='southeast-asia'){
    const points=metadata.farming.labels.filter(a=>a.kind==='livestock'&&(!singleFarm()||a.product===singleFarm()!.id)).filter(a=>Number(a.id.split('-').at(-1))<3);
    const pointPositions:{x:number;y:number}[]=[];
    for(const a of points){const p=project(a.coordinate);if(p.x<12||p.y<12||p.x>width-12||p.y>height-12)continue;
     if(southCentral&&pointPositions.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<17))continue;
     pointPositions.push(p);
     const b=button('animal-point-'+a.id,'','asia-climate-station asia-livestock-point',()=>chooseFarm(a.product!));b.style.opacity=selectedFarm()?.kind==='crop'?'.2':'1';b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.setProperty('--label-color',a.color??'#80583b');b.setAttribute('aria-label',a.text+'の代表地点');b.setAttribute('aria-pressed',String(state.topic===a.product));const name=document.createElement('span');name.textContent=a.text;b.append(name);b.hidden=false;
     obstacles.push({left:p.x-6,top:p.y-6,right:p.x+6,bottom:p.y+6});
     // One permanent name per kind; all representative points keep hover names.
    }
    const animalNames=config.regionId==='east-asia'?metadata.farming.labels.filter(a=>['sheep-2','sheep-0','goat-1','goat-2','cattle-0','cattle-1','pig-0','pig-1','chicken-0','chicken-2'].includes(a.id)&&(!singleFarm()||a.product===singleFarm()!.id)):groups.filter(a=>a.kind==='livestock');
    const animalInputs=animalNames.flatMap(a=>{
     const anchor=(a.anchors??[a.coordinate]).map(project).find(p=>p.x>=12&&p.y>=12&&p.x<=width-12&&p.y<=height-12);if(!anchor)return [];
     const id='overview-animal-'+a.id,b=button(id,a.text,'asia-farm-label',()=>chooseFarm(a.product!));b.style.opacity=selectedFarm()?.kind==='crop'?'.2':'1';b.style.setProperty('--label-color',a.color??'#80583b');b.setAttribute('aria-label',a.text+'の詳しい分布');b.setAttribute('aria-pressed',String(state.topic===a.product));
     return [{id,anchor,width:measuredWidth(b,a.text.length*12+10),height:24}];
    });
    for(const rect of layoutNatureLabels(animalInputs,bounds,obstacles)){
     const b=buttons.get(rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);placed.push(rect);
    }
   }}
  if((water||eastFarmReferences||centralFarmReferences)&&config.riverFile&&datasets.has(config.riverFile))for(const f of datasets.get(config.riverFile).features.filter((f:any)=>config.riverIds?.includes(f.properties.id))){const lines=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];const line=[...lines].sort((a:any,b:any)=>b.length-a.length)[0];annotation.push({id:f.properties.id,text:f.properties.label,coordinate:line[Math.floor(line.length/2)],kind:'river'});}
  if(eastFarmReferences){
    for(const [id,text,coordinate] of [['ea-north-plain','華北平原',[116,36]],['ea-sichuan','四川盆地',[104.1,30.5]],['ea-mongolia','モンゴル',[104,47]],['ea-korea','朝鮮半島',[127.5,38]],['ea-japan','日本',[139,36]]] as [string,string,Coordinate][])
      annotation.push({id,text,coordinate,kind:'reference'});
  }
  if(centralFarmReferences){annotation.push({id:'central-wheat-belt',text:'北部の小麦帯',coordinate:[66.4,52.1],kind:'reference'},{id:'central-fergana-farm',text:'フェルガナ盆地・灌漑',coordinate:[71.3,40.3],kind:'reference'});}
  if(config.focusId==='central-asia'&&['climate','water','basins','groundwater','ethnicity'].includes(active??'')){
   for(const [id,text,coordinate] of [['central-kaz','カザフスタン',[64,49]],['central-uzb','ウズベキスタン',[64.7,42.1]],['central-tkm','トルクメニスタン',[57.8,39.1]],['central-kgz','キルギス',[75.1,42.5]],['central-tjk','タジキスタン',[71.2,38.5]]] as [string,string,Coordinate][])annotation.push({id,text,coordinate,kind:'reference'});
  }
  const isoline=active==='terrain'?(metadata.terrain?.bands??metadata.terrain):active==='precipitation'?(metadata.rainfall.bands??metadata.rainfall):water?metadata.rainfall:null;
  if(isoline&&('file' in isoline&&isoline.file?datasets.has(isoline.file):contourBandFiles(isoline as AsiaContourBands,'band').every(file=>datasets.has(file))))annotation.push(...[...isoline.labels].sort((a,b)=>active==='precipitation'&&root.dataset.region==='east-asia'?Number([4500,5500].includes(b.value??0))-Number([4500,5500].includes(a.value??0)):0).filter(a=>active==='precipitation'&&root.dataset.region==='southeast-asia'?[1000,1500,2000,2500,3000,4000].includes(a.value??-1):!a.value||a.value%(config.focusId==='central-asia'&&active==='precipitation'?250:water?1000:active==='terrain'&&config.focusId==='central-asia'?500:active==='terrain'?1000:500)===0).slice(0,water?6:config.focusId==='central-asia'?24:root.dataset.region==='east-asia'?30:12));
  for(const a of annotation){const id=(a.kind==='reference'&&config.regionId!=='east-asia'?'reference':active)+'-'+a.id;const b=button(id,a.text,a.kind==='river'?'asia-river-label':a.kind==='landform'?'asia-landform-label':a.kind==='marine'?'asia-marine-label':a.kind==='marine-process'?'asia-marine-process-label':a.kind==='culture'?'asia-culture-label':a.kind==='forest-site'?'east-forest-site':a.kind==='reference'?(active==='overview'||config.regionId!=='east-asia'?'asia-farm-region-label':'asia-geographic-name'):a.product?'asia-farm-label':a.kind==='settlement'?'asia-settlement-label':'asia-rain-label',()=>a.product?chooseFarm(a.product):a.kind==='landform'&&config.selectLandform?config.selectLandform(a.id):a.kind==='river'&&active==='basins'&&config.selectBasin?config.selectBasin(config.waterFocus!.find(f=>f.river===a.id)!.id):a.kind==='river'&&active==='water'&&config.selectRiver?config.selectRiver(a.id):choosePoint(a.coordinate));b.disabled=a.kind==='reference'||a.kind==='marine'||a.kind==='marine-process'||(eastFarmReferences||active==='landform'&&config.regionId==='east-asia')&&a.kind==='river'||active==='terrain'&&config.regionId==='east-asia';if(a.kind==='forest-site'){b.dataset.forestSite=a.id;b.dataset.coordinate=a.coordinate.join(',');b.onclick=event=>{event.stopPropagation();config.selectForestCountry?.(eastForestSites.find(s=>s.id===a.id)!.country);root.querySelector<HTMLElement>('#forest-site-'+a.id)?.scrollIntoView({block:'nearest',behavior:'instant'});};}if(a.kind==='culture'){b.dataset.culturePoint=a.id;b.onclick=event=>{event.stopPropagation();root.querySelector<HTMLElement>('#culture-'+a.id)?.scrollIntoView({block:'nearest',behavior:'instant'});};}if(a.color)b.style.setProperty('--label-color',a.color);if(a.product&&['south-central-asia','east-asia','southeast-asia'].includes(root.dataset.region??'')){b.dataset.product=a.product;b.dataset.kind=a.kind??'';b.style.opacity=config.regionId!=='southeast-asia'&&selectedFarm()?.kind==='crop'&&a.product!==selectedFarm()!.id?'.38':'1';b.setAttribute('aria-pressed',String(a.product===state.topic));}if(config.regionId==='southeast-asia'&&(a.kind==='river'||a.kind==='landform')){b.dataset[a.kind==='river'?'southeastRiver':'southeastLandform']=a.id;b.setAttribute('aria-pressed',String(a.kind==='river'?southeastSelectedRiverIds(state.detail).includes(a.id)||config.waterFocus?.find(f=>f.id===state.detail)?.river===a.id:state.detail===a.id));}if(a.kind==='settlement'){b.onclick=event=>{event.stopPropagation();config.selectSettlement?.(a.id);};b.setAttribute('aria-pressed',String(state.detail===a.id));}b.setAttribute('aria-label',a.kind==='reference'?a.text+'（地域名）':a.product?a.text+'の詳しい分布':['river','landform','settlement','culture','marine','marine-process'].includes(a.kind??'')?a.text:`${a.text}${active==='terrain'?'mの等高線':'mmの等雨量線'}`);codes.push({id,code:a.text,anchors:(a.anchors??[a.coordinate]).map(project),width:measuredWidth(b,a.text.length*11+10),height:a.kind==='marine-process'?34:24});}
  const southeastRiverIds=root.dataset.region==='southeast-asia'&&['water','basins'].includes(active??'')?new Set(config.waterFocus?.map(f=>active+'-'+f.river)):new Set<string>();
  const riverCodes=codes.filter(c=>southeastRiverIds.has(c.id));
  const riverLines=riverCodes.length&&config.riverFile?southeastRiverSegments(datasets.get(config.riverFile)?.features??[],project):[];
  const riverPlacements=layoutSoutheastRiverNames(riverCodes,bounds,[...obstacles,...placed],riverLines);
  const rainfallCallouts=active==='precipitation'&&root.dataset.region==='east-asia';
  const rainInputs=codes.flatMap(c=>{const anchor=c.anchors.find(p=>p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height);return anchor?[{id:c.id,anchor,width:c.width,height:c.height,minLeaderLength:rainfallCallouts?(['4,500','5,500'].includes(buttons.get(c.id)!.textContent!)?16:12):undefined}]:[];});
  const smallRainAreas=rainInputs.filter(c=>['4,500','5,500'].includes(buttons.get(c.id)!.textContent!)).map(c=>({left:c.anchor.x-14,right:c.anchor.x+14,top:c.anchor.y-14,bottom:c.anchor.y+14}));
  const cultureIds=new Set(annotation.filter(a=>a.kind==='culture').map(a=>active+'-'+a.id));
  const eastSettlementIds=new Set(config.regionId==='east-asia'?annotation.filter(a=>a.kind==='settlement').map(a=>active+'-'+a.id):[]);
  const culturePlacements=layoutNatureLabels(codes.filter(c=>cultureIds.has(c.id)||eastSettlementIds.has(c.id)).map(c=>({id:c.id,anchor:c.anchors.find(p=>p.x>=bounds.left&&p.x<=bounds.right&&p.y>=bounds.top&&p.y<=bounds.bottom)??c.anchors[0],width:c.width,height:c.height,minLeaderLength:8})),bounds,[...obstacles,...placed]);
  for(const rect of culturePlacements){dot(rect.anchor.x,rect.anchor.y);const end=leaderEnd(rect.anchor,rect);const leader=line(rect.anchor.x,rect.anchor.y,end.x,end.y);if(cultureIds.has(rect.id)){leader.setAttribute('data-culture-leader',rect.id);buttons.get(rect.id)!.dataset.cultureAnchor=JSON.stringify(rect.anchor);}}
  const centralRain=active==='precipitation'&&config.focusId==='central-asia';
  const centralRainCodes=centralRain?codes.filter(c=>c.id.startsWith('precipitation-rainfall-')):[];
  const centralRainPlaced:CodePlacement[]=[];
  for(const c of centralRainCodes){const anchor=c.anchors.find(p=>p.x>c.width/2+3&&p.x<width-c.width/2-3&&p.y>c.height/2+3&&p.y<height-c.height/2-3);if(!anchor)continue;const rect={id:c.id,anchor,left:anchor.x-c.width/2,right:anchor.x+c.width/2,top:anchor.y-c.height/2,bottom:anchor.y+c.height/2};if([...obstacles,...placed,...centralRainPlaced].some(other=>boxesOverlap(rect,other,3)))continue;centralRainPlaced.push(rect);}
  const otherCodes=codes.filter(c=>!southeastRiverIds.has(c.id)&&!cultureIds.has(c.id)&&!eastSettlementIds.has(c.id)&&!centralRainCodes.includes(c));
  if(config.focusId==='central-asia'&&active==='climate')otherCodes.sort((a,b)=>Number(b.id==='reference-central-westerlies')-Number(a.id==='reference-central-westerlies'));
  const codePlacements=rainfallCallouts?layoutNatureLabels(rainInputs,bounds,[...obstacles,...placed,...smallRainAreas]):[...riverPlacements,...culturePlacements,...centralRainPlaced,...layoutClimateCodes(otherCodes,bounds,[...obstacles,...placed,...riverPlacements,...culturePlacements,...centralRainPlaced])];
  for(const rect of codePlacements){const b=buttons.get(rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';if(rect.id.startsWith('climate-')&&metadata.climate.some(c=>'climate-'+c.id===rect.id)){const cls=metadata.climate.find(c=>'climate-'+c.id===rect.id)!;const index=cls.anchors.findIndex(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});b.dataset.coordinate=cls.anchors[Math.max(0,index)].join(',');}if(active&&metadata.settlements?.[active]){const c=metadata.settlements[active].categories.find(c=>active+'-'+c.id===rect.id);const anchor=c?.anchors.find(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});if(anchor)b.dataset.coordinate=anchor.join(',');}if(('leader' in rect&&rect.leader)||rect.id.startsWith('overview-animal-')||active==='precipitation'){const end=leaderEnd(rect.anchor,rect),leader=line(rect.anchor.x,rect.anchor.y,end.x,end.y,rainfallCallouts?'#234f60':'#637c81');if(southeastRiverIds.has(rect.id)){b.dataset.southeastRiverAnchor=JSON.stringify(rect.anchor);leader.setAttribute('data-southeast-river-leader',rect.id);}if(rainfallCallouts){b.dataset.contourLabelId=rect.id;b.dataset.contourAnchor=JSON.stringify(rect.anchor);leader.setAttribute('data-rainfall-label',rect.id);leader.setAttribute('stroke-width','1.25');}}}
 }
 function schedule(){if(!scheduled&&!disposed)scheduled=requestAnimationFrame(update);}
 async function sourceReady(currentMap:import('maplibre-gl').Map,id:string,seq:number){
  if(currentMap.isSourceLoaded(id))return;
  await new Promise<void>((resolve,reject)=>{
   const cancel=()=>{cleanup();resolve();};
   const cleanup=()=>{clearTimeout(timer);currentMap.off('sourcedata',changed);currentMap.off('error',failed);sourceWaits.delete(cancel);};
   const changed=()=>{if(seq!==revision||map!==currentMap||disposed||currentMap.isSourceLoaded(id)){cleanup();resolve();}};
   const failed=(event:any)=>{if(event.sourceId===id){cleanup();reject(Error('Contour source unavailable'));}};
   const timer=setTimeout(()=>{cleanup();reject(Error('Contour source timed out'));},20000);
   currentMap.on('sourcedata',changed);currentMap.on('error',failed);sourceWaits.add(cancel);changed();
  });
 }
 async function show(currentMap:import('maplibre-gl').Map){
  for(const cancel of sourceWaits)cancel();
  clearReligionMarkers();
  if(map!==currentMap){map=currentMap;map.on('movestart',()=>{overlay.hidden=true;});map.on('moveend',schedule);map.on('resize',schedule);}
  syncKinds();const seq=++revision,current=mode();schedule();
  if(errorMode!==current){errorMode=null;onStatus('');}
  const censusReligion=root.dataset.region==='south-central-asia'&&current==='religion'&&!getState().detail;
  const southReligion=config.focusId==='south-asia'&&censusReligion&&!!config.socialBase;
  root.dataset.southReligionStates=southReligion?'loading':'';
  if(censusReligion)for(const census of southCentralReligionCensuses.filter(c=>!config.religionCountries||config.religionCountries.includes(c.code))){
   const marker=document.createElement('button');marker.type='button';marker.className='sc-religion-marker';marker.dataset.religionCountry=census.code;marker.setAttribute('aria-label',`${census.name}の${census.year}年宗教構成を読む`);marker.setAttribute('aria-pressed',String(getState().place===census.code));
   let angle=0;const colorStops=census.segments.map(segment=>{const next=angle+segment.share*3.6,stop=`${segment.color} ${angle}deg ${next}deg`;angle=next;return stop;});marker.style.background=`conic-gradient(${colorStops.join(',')})`;const label=document.createElement('span');label.textContent=census.name;marker.append(label);
   marker.addEventListener('click',event=>{event.stopPropagation();config.selectReligionCountry?.(census.code);});religionMarkers.push(new Marker({element:marker,anchor:'center'}).setLngLat(census.point).addTo(currentMap));
  }
  if(censusReligion)for(const report of southCentralReligionReports.filter(c=>!config.religionCountries||config.religionCountries.includes(c.code))){
   const marker=document.createElement('button');marker.type='button';marker.className='sc-religion-report-marker';marker.setAttribute('aria-label',`${report.name}の${report.year}年宗教報告を読む`);marker.setAttribute('aria-pressed',String(getState().place===report.code));marker.textContent=report.name;
   marker.addEventListener('click',event=>{event.stopPropagation();config.selectReligionCountry?.(report.code);});religionMarkers.push(new Marker({element:marker,anchor:'center'}).setLngLat(report.point).addTo(currentMap));
   if('local' in report){const note=document.createElement('button');note.type='button';note.className='sc-religion-report-marker local';note.textContent='GBAO';note.setAttribute('aria-label',report.local.label);note.addEventListener('click',event=>{event.stopPropagation();config.selectReligionCountry?.(report.code);});religionMarkers.push(new Marker({element:note,anchor:'center'}).setLngLat(report.local.point).addTo(currentMap));}
  }
  if(censusReligion)for(const local of southCentralReligionLocalCases.filter(c=>!config.religionCountries||config.religionCountries.includes(c.code))){
   const marker=document.createElement('button'),selected=getState().story===local.id;marker.type='button';marker.className='sc-religion-local-marker';marker.classList.toggle('is-compact',!selected&&['NPL','LKA'].includes(local.code));marker.dataset.religionLocal=local.id;marker.textContent=local.name;marker.title=local.name;marker.setAttribute('aria-label',local.name+'の'+local.year+'年宗教統計を読む');marker.setAttribute('aria-pressed',String(selected));marker.style.zIndex=selected?'20':'4';marker.addEventListener('click',event=>{event.stopPropagation();config.selectReligionCountry?.(local.code,local.id);});const localMarker=new Marker({element:marker,anchor:selected?'left':'center',offset:selected?[12,-12]:[0,0]}).setLngLat(local.point).addTo(currentMap);
   if(marker.classList.contains('is-compact')){const national=root.querySelector<HTMLElement>(`.sc-religion-marker[data-religion-country="${local.code}"] span`);if(national){const nameBox=national.getBoundingClientRect();for(const offset of [[0,0],[-22,-20],[22,-20],[-22,0],[22,0],[-22,-36],[22,-36]]){localMarker.setOffset(offset as [number,number]);const dot=marker.getBoundingClientRect();if(dot.right<nameBox.left-3||dot.left>nameBox.right+3||dot.bottom<nameBox.top-3||dot.top>nameBox.bottom+3)break;}}}
   religionMarkers.push(localMarker);
  }
  const settlement=censusReligion&&config.focusId!=='central-asia'?undefined:current?metadata.settlements?.[current]:undefined;
  root.dataset.settlementStatus=settlement?'loading':'inactive';root.dataset.settlementFeatures='';
  const farm=current==='overview',water=farm&&getState().overlay==='water',eastFarmReferences=farm&&config.regionId==='east-asia',centralFarmReferences=farm&&config.focusId==='central-asia'&&!water,terrain=current==='terrain'&&!!metadata.terrain;
  const bands=current==='precipitation'?metadata.rainfall.bands:terrain?metadata.terrain?.bands:undefined;
  const bandFiles=bands?contourBandFiles(bands,'band'):[],lineFiles=bands?contourBandFiles(bands,'line'):[];
  const geometry=(files:string[])=>files.length===1?datasets.get(files[0]):{type:'FeatureCollection',features:files.flatMap(file=>datasets.get(file).features)};
  root.dataset.contourBandStatus=bands?'loading':'inactive';root.dataset.contourBandKind=bands?(terrain?'terrain':'rainfall'):'';root.dataset.contourBandFeatures='';root.dataset.contourLineFeatures='';
  root.dataset.farmContextStatus=farm?'loading':'inactive';
  if(farm){const reading=root.querySelector<HTMLElement>('[data-grid-reading]');if(reading&&(!selectedFarm()||!getState().point))reading.textContent=config.regionId==='southeast-asia'&&!water?southeastFarmMapNote(getState().topic,getState().single):config.focusId==='central-asia'&&!water?(selectedFarm()?.kind==='crop'?'色面は作物の概略分布、輪郭は選択した作物です。家畜の色面を薄く表示しています。':selectedFarm()?.kind==='livestock'?'色面は牛・羊・山羊の相対的な分布です。輪郭は選択した家畜です。':'作物と牛・羊・山羊の概略分布を色面で表示しています。濃さは数量の差を表しません。'):singleFarm()?singleFarm()!.title+'の概略分布だけを表示しています。右のボタンで全品目へ戻れます。':water?'米の概略栽培域（緑）・主な川（青）・250mm間隔の年降水量を重ねています。':selectedFarm()?.kind==='crop'?'背景の淡い色は優勢作物の概略面、選択した作物の色面と輪郭は他作物と重なる栽培域も含む資料上の分布です。家畜の推計分布は薄く表示しています。':selectedKinds.size===2?'作物の色面は各格子で相対的に優勢な代表作物の概略です。品目を選ぶと、他の作物と重なる資料上の分布を表示します。畜産の推計分布も表示しています。':selectedKinds.size===0?'作物・畜産は非表示です。左上のボタンで表示できます。':selectedKinds.has('crop')?'作物の特徴的な分布を表示しています。家畜の分布は非表示です。':'家畜の特徴的な分布を表示しています。作物の分布は非表示です。';}
  for(const id of ['asia-settlement-fill','asia-settlement-selected-halo','asia-settlement-selected','asia-south-religion-fill','asia-south-religion-line','asia-farm-overview-fill','asia-farm-overview-crop','asia-farm-overview-full-crop-fill','asia-farm-overview-full-crop-line','asia-farm-overview-selected-halo','asia-farm-overview-selected','asia-farm-overview-livestock-fill','asia-farm-overview-livestock','asia-farm-overview-livestock-selected-halo','asia-farm-overview-livestock-selected','asia-rainfall-lines','asia-terrain-lines','asia-rainfall-aligned-lines','asia-terrain-aligned-lines','asia-rainfall-bands','asia-terrain-bands','asia-farm-rivers'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  if(config.regionId==='east-asia'&&current==='religion'&&!getState().detail){errorMode=null;onStatus('');}
  const landformRivers=config.regionId==='east-asia'&&current==='landform';
  if(!farm&&current!=='precipitation'&&!terrain&&!settlement&&!southReligion&&!landformRivers)return;
  const socialFile=config.socialBase+'south-central-asia.json.gz';
  const requested=[...(settlement?[config.presentationBase.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file]:[]),...(southReligion?[socialFile]:[]),...(farm?[metadata.farming.file,...(['south-asia','central-asia'].includes(config.focusId??'')&&metadata.farming.livestockFile?[metadata.farming.livestockFile]:[]),...(config.focusId==='south-asia'&&metadata.farming.cropFile?[metadata.farming.cropFile]:[])]:[]),...bandFiles,...lineFiles,...(!bands&&(current==='precipitation'||water)?[metadata.rainfall.file]:[]),...(!bands&&terrain?[metadata.terrain!.file]:[]),...((water||eastFarmReferences||centralFarmReferences||landformRivers)&&config.riverFile?[config.riverFile]:[])];
  try{
   await Promise.all(requested.map(load));if(seq!==revision||map!==currentMap||disposed)return;
   if(southReligion){const social=datasets.get(socialFile),records=new Map(social.records.filter((r:any)=>r.country==='IND').map((r:any)=>[r.id,r]));const features=social.geometry.features.filter((f:any)=>records.has(f.properties.id)).map((f:any)=>({...f,properties:{...f.properties,share:(records.get(f.properties.id) as any).series['in-religion-muslim']?.['2011']??null}}));const id='asia-south-religion';if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:{type:'FeatureCollection',features}});map.addLayer({id:id+'-fill',type:'fill',source:id,paint:{'fill-color':['step',['get','share'],'#edf5f8',10,'#d1e6ee',20,'#a6cedf',30,'#6da7c5',40,'#397fa9',50,'#17618d',75,'#123f6a'],'fill-opacity':.88}},'asia-country-border');map.addLayer({id:id+'-line',type:'line',source:id,paint:{'line-color':'#315a70','line-width':.65,'line-opacity':.65}},'asia-country-border');}map.setLayoutProperty(id+'-fill','visibility','visible');map.setLayoutProperty(id+'-line','visibility','visible');root.dataset.southReligionStates=String(features.length);}
   if(settlement){const id='asia-settlement-fill',file=config.presentationBase.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file;const data=datasets.get(file);if(!map.getSource(id)){map.addSource(id,{type:'geojson',data});map.addLayer({id,type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':config.focusId==='central-asia'&&current==='religion'?.43:.8}},'asia-country-border');}else (map.getSource(id) as import('maplibre-gl').GeoJSONSource).setData(data);map.setPaintProperty(id,'fill-opacity',config.focusId==='central-asia'&&current==='religion'?.43:.8);root.dataset.settlementPaintOpacity=String(map.getPaintProperty?.(id,'fill-opacity')??(config.focusId==='central-asia'&&current==='religion'?.43:.8));map.setLayoutProperty(id,'visibility','visible');
    for(const [suffix,color,width] of [['halo','#fffdf5',5],['line','#203f4a',2.5]] as const){const selected=suffix==='line'?'asia-settlement-selected':'asia-settlement-selected-halo';if(!map.getLayer(selected))map.addLayer({id:selected,type:'line',source:id,paint:{'line-color':color,'line-width':width}});map.setFilter(selected,['==',['get','id'],getState().detail??'']);map.setLayoutProperty(selected,'visibility','visible');}
   }
   if(settlement){await sourceReady(currentMap,'asia-settlement-fill',seq);if(seq!==revision||map!==currentMap||disposed)return;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(seq!==revision||map!==currentMap||disposed)return;root.dataset.settlementStatus='ready';root.dataset.settlementFeatures=String(currentMap.queryRenderedFeatures({layers:['asia-settlement-fill']}).length);}
   if(farm){
    const id='asia-farm-overview';
    const opacity:any=config.focusId==='central-asia'?.65:['case',['==',['get','distribution'],'spread'],.36,.76];
    if(!map.getSource(id)){
     map.addSource(id,{type:'geojson',data:datasets.get(metadata.farming.file)});
     if(['south-asia','central-asia'].includes(config.focusId??'')&&metadata.farming.livestockFile)map.addSource(id+'-livestock',{type:'geojson',data:datasets.get(metadata.farming.livestockFile)});
     if(config.focusId==='south-asia'&&metadata.farming.cropFile)map.addSource(id+'-full-crop',{type:'geojson',data:datasets.get(metadata.farming.cropFile)});
     const livestockSource=['south-asia','central-asia'].includes(config.focusId??'')&&metadata.farming.livestockFile?id+'-livestock':id;
     map.addLayer({id:id+'-fill',type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':opacity}},'asia-country-border');
     map.addLayer({id:id+'-livestock-fill',type:'fill',source:livestockSource,paint:{'fill-color':['get','color'],'fill-opacity':opacity}},'asia-country-border');
     map.addLayer({id:id+'-crop',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.7,'line-width':.85}},'asia-country-border');
     if(config.focusId==='south-asia'&&metadata.farming.cropFile){map.addLayer({id:id+'-full-crop-fill',type:'fill',source:id+'-full-crop',paint:{'fill-color':['get','color'],'fill-opacity':['case',['==',['get','distribution'],'core'],.62,.32]}},'asia-country-border');map.addLayer({id:id+'-full-crop-line',type:'line',source:id+'-full-crop',paint:{'line-color':['get','color'],'line-opacity':.9,'line-width':1.3}},'asia-country-border');}
     map.addLayer({id:id+'-livestock',type:'line',source:livestockSource,paint:{'line-color':['get','color'],'line-opacity':.7,'line-width':1.2}},'asia-country-border');
     map.addLayer({id:id+'-selected-halo',type:'line',source:config.focusId==='south-asia'&&metadata.farming.cropFile?id+'-full-crop':id,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fffdf5','line-width':config.regionId==='southeast-asia'?2.4:5}});
     map.addLayer({id:id+'-selected',type:'line',source:config.focusId==='south-asia'&&metadata.farming.cropFile?id+'-full-crop':id,layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#203f4a','line-width':config.regionId==='southeast-asia'?1.15:2.5}});
     if(livestockSource!==id){map.addLayer({id:id+'-livestock-selected-halo',type:'line',source:livestockSource,paint:{'line-color':'#fffdf5','line-width':5}});map.addLayer({id:id+'-livestock-selected',type:'line',source:livestockSource,paint:{'line-color':'#203f4a','line-width':2.5}});}
    }
    for(const [suffix,kind] of [['fill','crop'],['crop','crop'],['livestock-fill','livestock'],['livestock','livestock']]){const layer=id+'-'+suffix;map.setFilter(layer,['all',['==',['get','kind'],kind],...(water?[['==',['get','id'],'rice']]:config.regionId==='southeast-asia'?[southeastFarmMapFilter(getState().topic,getState().single)]:singleFarm()?[['==',['get','id'],singleFarm()!.id]]:[])] as any);map.setLayoutProperty(layer,'visibility',(suffix==='fill'&&(water?kind==='crop':selectedKinds.has(kind))||['south-asia','central-asia'].includes(config.focusId??'')&&suffix==='livestock-fill'&&!water&&selectedKinds.has('livestock'))?'visible':'none');}
    if(config.focusId==='south-asia'&&metadata.farming.cropFile){for(const suffix of ['full-crop-fill','full-crop-line']){const layer=id+'-'+suffix;map.setFilter(layer,['==',['get','id'],selectedFarm()?.kind==='crop'?selectedFarm()!.id:'']);map.setLayoutProperty(layer,'visibility',!water&&selectedFarm()?.kind==='crop'&&selectedKinds.has('crop')?'visible':'none');}map.setPaintProperty(id+'-fill','fill-opacity',selectedFarm()?.kind==='crop'?.08:opacity);}
    if(config.focusId==='south-asia')map.setPaintProperty(id+'-livestock-fill','fill-opacity',selectedFarm()?.kind==='crop'?.12:selectedFarm()?.kind==='livestock'?.42:.26);
    if(config.focusId==='central-asia')map.setPaintProperty(id+'-livestock-fill','fill-opacity',selectedFarm()?.kind==='crop'?.16:selectedFarm()?.kind==='livestock'?.72:.56);
    for(const suffix of ['selected-halo','selected']){const selected=id+'-'+suffix;map.setFilter(selected,['==',['get','id'],selectedFarm()?.id??'']);map.setLayoutProperty(selected,'visibility',!water&&selectedFarm()?.kind==='crop'&&selectedKinds.has('crop')?'visible':'none');}
    for(const suffix of ['livestock-selected-halo','livestock-selected']){const selected=id+'-'+suffix;if(!map.getLayer(selected))continue;map.setFilter(selected,['==',['get','id'],selectedFarm()?.id??'']);map.setLayoutProperty(selected,'visibility',!water&&selectedFarm()?.kind==='livestock'&&selectedKinds.has('livestock')?'visible':'none');}
   }
   if(bands){const id=terrain?'asia-terrain-bands':'asia-rainfall-bands';if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:geometry(bandFiles),tolerance:0});const paintColor=config.regionId==='southeast-asia'&&!terrain?['step',['get','lower'],southeastRainfallColor(0),...Array.from({length:49},(_,i)=>(i+1)*250).flatMap(n=>[n,southeastRainfallColor(n)])] as any:!terrain&&config.focusId==='central-asia'?['step',['get','lower'],centralRainfallColor(0),...([250,500,750,1000,1500,2000] as const).flatMap(n=>[n,centralRainfallColor(n)])] as any:!terrain&&config.focusId==='south-asia'?['step',['get','lower'],southRainfallColor(0),...([250,500,750,1000,1500,2000,3000] as const).flatMap(n=>[n,southRainfallColor(n)])] as any:['get','color'];map.addLayer({id,type:'fill',source:id,paint:{'fill-color':paintColor,'fill-opacity':1,'fill-antialias':false}},'asia-country-border');}map.setLayoutProperty(id,'visibility','visible');}
   for(const [visible,baseId,record,color] of [[current==='precipitation'||water,'asia-rainfall-lines',metadata.rainfall,'#347d9c'],[terrain,'asia-terrain-lines',metadata.terrain,'#8c7051']] as const){
    if(!visible||!record)continue;
    const id=bands?baseId.replace('-lines','-aligned-lines'):baseId;
    if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:bands?geometry(lineFiles):datasets.get(record.file),...(bands?{tolerance:0}:{})});map.addLayer({id,type:'line',source:id,paint:{'line-color':color,'line-width':['case',['==',['%',['get','value'],1000],0],1,.5],'line-opacity':['case',['==',['%',['get','value'],1000],0],.8,.4]}},'asia-country-border');}
    if(config.regionId==='southeast-asia'&&baseId==='asia-rainfall-lines')map.setFilter(id,current==='precipitation'?['<=',['get','value'],4000]:null);
    map.setLayoutProperty(id,'visibility','visible');
   }
   if(bands){const bandId=terrain?'asia-terrain-bands':'asia-rainfall-bands',lineId=terrain?'asia-terrain-aligned-lines':'asia-rainfall-aligned-lines';await Promise.all([sourceReady(currentMap,bandId,seq),sourceReady(currentMap,lineId,seq)]);if(seq!==revision||map!==currentMap||disposed)return;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(seq!==revision||map!==currentMap||disposed)return;root.dataset.contourBandFeatures=String(currentMap.queryRenderedFeatures({layers:[bandId]}).length);root.dataset.contourLineFeatures=String(currentMap.queryRenderedFeatures({layers:[lineId]}).length);root.dataset.contourBandStatus='ready';}
   if((water||eastFarmReferences||centralFarmReferences||landformRivers)&&config.riverFile){const id='asia-farm-rivers';if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:datasets.get(config.riverFile)});map.addLayer({id,type:'line',source:id,filter:['in',['get','id'],['literal',config.riverIds??[]]],paint:{'line-color':'#17688b','line-width':(eastFarmReferences||centralFarmReferences)&&!water?1.3:2,'line-opacity':(eastFarmReferences||centralFarmReferences)&&!water ? .55 : .95}});}map.setFilter(id,['in',['get','id'],['literal',landformRivers?(config.waterFocus??[]).map(f=>f.river):config.riverIds??[]]]);map.setLayoutProperty(id,'visibility','visible');}
   if(farm){root.dataset.farmContextStatus='ready';root.dataset.farmSelected=selectedFarm()?.id??'';root.dataset.farmView=singleFarm()?'single':config.regionId==='southeast-asia'?'group':'all';root.dataset.farmLivestockFeatures=['south-asia','central-asia'].includes(config.focusId??'')&&metadata.farming.livestockFile?String(datasets.get(metadata.farming.livestockFile).features.length):'';}
   errorMode=null;onStatus('');schedule();
  }catch(error){if(seq===revision&&map===currentMap&&!disposed){root.dataset.presentationLastError=error instanceof Error?error.message:String(error);errorMode=current;if(bands)root.dataset.contourBandStatus='error';if(farm)root.dataset.farmContextStatus='error';onStatus(southReligion?'インドの州別宗教統計を取得できませんでした。再読み込みをお試しください。':settlement?'居住域の資料を取得できませんでした。再読み込みをお試しください。':farm?'農畜産物の概略分布を取得できませんでした。地点の値と国別統計は品目の欄で確認できます。':bands?'等値線と色帯を取得できませんでした。地点の原格子値は選んで確認できます。':terrain?'等高線を取得できませんでした。地点を選ぶと標高を確認できます。':'等雨量線を取得できませんでした。地点ごとの降水量は選んで確認できます。');}}

 }
 for(const b of toggles)b.addEventListener('click',()=>{const kind=b.dataset.farmToggle!;if(selectedKinds.has(kind))selectedKinds.delete(kind);else selectedKinds.add(kind);const value=selectedKinds.size===2?null:selectedKinds.size===0?'none':[...selectedKinds][0] as 'crop'|'livestock';config.selectFarmKinds?.(value);if(map&&!config.selectFarmKinds)void show(map);},{signal:events.signal});
 for(const control of controls)control.addEventListener('change',()=>{if(control.checked)selectedKinds.add(control.dataset.farmKind!);else selectedKinds.delete(control.dataset.farmKind!);config.selectFarmKinds?.(selectedKinds.size===2?null:selectedKinds.size===0?'none':[...selectedKinds][0] as 'crop'|'livestock');if(map&&!config.selectFarmKinds)void show(map);},{signal:events.signal});
 return {show,refresh:schedule,landformAtPoint(point:Coordinate){return config.regionId==='southeast-asia'?southeastLandformAtPoint(point,southeastLandformExtents.features):null;},setRivers(data:any){if(config.riverFile)datasets.set(config.riverFile,data);schedule();},destroy(){disposed=true;clearReligionMarkers();for(const cancel of sourceWaits)cancel();events.abort();cancelAnimationFrame(scheduled);overlay.replaceChildren();onStatus('');}};
}
