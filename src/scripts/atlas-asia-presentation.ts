import {layoutNatureLabels,leaderEnd,type Box} from '../lib/atlas-nature-labels';
import {layoutClimateCodes,type CodeInput} from '../lib/atlas-climate-code-labels';
import type {AsiaState} from '../lib/atlas-asia-state';
import {majorClimateCities,indiaPopulationLabels} from '../data/atlas/asia-focus';
import {contourBandFiles,type AsiaContourBands} from '../data/atlas/asia-contour-bands';
type Coordinate=[number,number];
type Annotation={id:string;text:string;coordinate:Coordinate;anchors?:Coordinate[];product?:string;kind?:string;color?:string;value?:number};
export type AsiaPresentation={
 settlements?:Record<string,{file:string;categories:{id:string;label:string;color:string;anchors:Coordinate[];sourceGroups?:{statename:string;group:string}[]}[]}>;
 farming:{file:string;products:{id:string;title:string;kind:string;color:string;threshold:number;unit:string}[];labels:Annotation[]};
 rainfall:{file:string;levels:number[];labels:Annotation[];bands?:AsiaContourBands};
 terrain?:{file:string;levels:number[];labels:Annotation[];bands?:AsiaContourBands};
 climate:{id:number;code:string;name:string;anchors:Coordinate[];minZoom:number}[];
};
type City={id:string;name:string;coordinates:Coordinate;countryCode?:string;country?:string};
export function createAsiaPresentation(root:HTMLElement,config:{presentation:AsiaPresentation;allowSingleItem?:boolean;presentationBase:string;cities:City[];population?:{cities:City[]};riverFile?:string;riverIds?:string[];landforms?:{id:string;name:string;coordinates:Coordinate}[];selectSettlement?:(id:string|null)=>void;selectFarmKinds?:(farms:AsiaState['farms'])=>void;waterFocus?:{id:string;name:string;displayName?:string;river:string}[];selectLandform?:(id:string)=>void},getState:()=>AsiaState,chooseCity:(id:string)=>void,chooseUrban:(id:string)=>void,choosePoint:(point:Coordinate)=>void,chooseFarm:(id:string)=>void,onStatus:(message:string)=>void){
 const metadata=config.presentation,overlay=root.querySelector<HTMLElement>('[data-map-annotations]')!;
 let map:import('maplibre-gl').Map|null=null,revision=0,scheduled=0,disposed=false;
 let errorMode:string|null=null;
 const events=new AbortController();
 const controls=root.querySelectorAll<HTMLInputElement>('[data-farm-kind]');
 const selectedKinds=new Set(controls.length?[...controls].filter(control=>control.checked).map(control=>control.dataset.farmKind!):['crop','livestock']);
 const toggles=root.querySelectorAll<HTMLButtonElement>('[data-farm-toggle]');
 const syncKinds=()=>{if(config.selectFarmKinds){selectedKinds.clear();const value=getState().farms;if(value!=='none')for(const kind of ['crop','livestock'])if(!value||value===kind)selectedKinds.add(kind);}if(singleFarm()){selectedKinds.clear();selectedKinds.add(singleFarm()!.kind);}for(const b of toggles){const on=selectedKinds.has(b.dataset.farmToggle!);b.setAttribute('aria-pressed',String(on));const label=b.querySelector('span');if(label)label.textContent=on?'表示':'非表示';}};
 const datasets=new Map<string,any>(),pending=new Map<string,Promise<any>>();
 const sourceWaits=new Set<()=>void>();
 const buttons=new Map<string,HTMLButtonElement>();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
 const selectedFarm=()=>getState().field==='agriculture'?metadata.farming.products.find(p=>p.id===getState().topic):undefined;
 const singleFarm=()=>config.allowSingleItem&&getState().single?selectedFarm():undefined;
 const mode=()=>{const s=getState();return s.field==='natural'?(s.topic??'climate'):s.field==='agriculture'?(selectedFarm()?'overview':s.topic??(s.city?'rice':'overview')):s.field==='population'?(!s.topic||['density','urban'].includes(s.topic)?'population':['ethnicity','religion'].includes(s.topic)?s.topic:null):null;};
 async function load(file:string){
  if(datasets.has(file))return datasets.get(file);
  if(!pending.has(file))pending.set(file,(async()=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);try{const response=await fetch(file.startsWith('/')?file:config.presentationBase+file,{signal:abort.signal});if(!response.ok)throw Error('Presentation asset '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());const text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);const data=JSON.parse(text);datasets.set(file,data);return data;}finally{clearTimeout(timer);}})().finally(()=>pending.delete(file)));
  return pending.get(file)!;
 }
 function line(x1:number,y1:number,x2:number,y2:number,color='#637c81') {const el=document.createElementNS(svg.namespaceURI,'line');for(const [key,value] of Object.entries({x1,y1,x2,y2,stroke:color,'stroke-width':.9}))el.setAttribute(key,String(value));svg.append(el);}
 function dot(x:number,y:number){const el=document.createElementNS(svg.namespaceURI,'circle');for(const [key,value] of Object.entries({cx:x,cy:y,r:3.5,fill:'#fff',stroke:'#345965','stroke-width':1.8}))el.setAttribute(key,String(value));svg.append(el);}
 function button(id:string,text:string,kind:string,action:()=>void){
  let b=buttons.get(id);if(!b){b=document.createElement('button');b.type='button';b.onclick=event=>{event.stopPropagation();action();};buttons.set(id,b);overlay.append(b);}
  b.className=kind;b.textContent=text;b.hidden=true;b.style.opacity='1';return b;
 }
 function measuredWidth(b:HTMLButtonElement,fallback:number){b.hidden=false;b.style.width='max-content';const width=b.getBoundingClientRect().width;b.hidden=true;return width||fallback;}
 function update(){
  scheduled=0;if(!map||disposed||typeof map.project!=='function')return;
  const active=mode(),state=getState(),water=active==='overview'&&state.overlay==='water';overlay.hidden=!['climate','population','overview','precipitation','terrain','landform','water','basins','groundwater','ethnicity','religion'].includes(active??'');
  for(const b of buttons.values())b.hidden=true;svg.replaceChildren();if(overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;
  const compact=width<440,bounds={left:0,top:0,right:width,bottom:height};
  const obstacles:Box[]=[{left:width-(compact?62:70),top:0,right:width,bottom:compact?165:190}];
  if(active==='overview')obstacles.push({left:0,top:0,right:225,bottom:55});
  const project=(p:Coordinate)=>map!.project(p);
  const southeastPopulation=active==='population'&&root.dataset.region==='southeast-asia';
  const waterCities=['water','basins','groundwater'].includes(active??'');
  const cities=active==='climate'?config.cities:active==='population'?config.population?.cities??[]:waterCities?config.cities.filter(c=>majorClimateCities.has(c.id)):[];
  let visible=cities.filter(c=>{const p=project(c.coordinates);return p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height;});
  if(active==='climate'||active==='population'){
   // Station points survive label thinning and collisions. Hover/focus names
   // and tap-to-open diagrams also expose stations without a permanent label.
   for(const city of visible){
    if(southeastPopulation)continue;
    const p=project(city.coordinates),b=button('station-'+city.id,'','asia-climate-station',()=>active==='climate'?chooseCity(city.id):chooseUrban(city.id));
    // In the compact Central Asian view, nearby stations can be closer than
    // the default 24px hit box. Keep their geographic points and keyboard
    // buttons, while preventing an invisible neighbour from owning the centre.
    if(active==='climate'&&root.dataset.region==='south-central-asia'){
     const nearest=Math.min(...visible.filter(other=>other.id!==city.id).map(other=>{const q=project(other.coordinates);return Math.hypot(p.x-q.x,p.y-q.y);}));
     const target=Math.min(24,Math.max(12,nearest*1.5));b.style.width=b.style.height=target+'px';
    }
    b.dataset.station=city.id;b.setAttribute('aria-label',city.name+(active==='climate'?'の雨温図':'の位置'));b.setAttribute('aria-pressed',String(active==='climate'?state.city===city.id:state.point?.every((n,i)=>Math.abs(n-city.coordinates[i])<.001)));
    const name=document.createElement('span');name.textContent=city.name;if(p.x>width-150){name.style.left='auto';name.style.right='calc(50% + 9px)';}b.append(name);
    b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=false;
    obstacles.push({left:p.x-5,top:p.y-5,right:p.x+5,bottom:p.y+5});
   }
   visible=visible.filter(c=>active==='climate'?majorClimateCities.has(c.id)||c.id===state.city:c.country!=='IND'||!!indiaPopulationLabels[c.id]||state.point?.every((n,i)=>Math.abs(n-c.coordinates[i])<.001));
  }
  if(active==='population'&&map.getZoom()<5){
   const ordered=[...visible].sort((a,b)=>Number(b.id===state.detail)-Number(a.id===state.detail));
   const chosen:City[]=[];const limit=compact?8:12;
   for(const city of ordered){const p=project(city.coordinates);if(city.id===state.detail||chosen.every(c=>{const q=project(c.coordinates);return Math.hypot(p.x-q.x,p.y-q.y)>43;}))chosen.push(city);if(chosen.length===limit)break;}
   visible=chosen;
  }
  if(active==='population')for(const id of ['asia-urban-points','asia-urban-hit'])if(map.getLayer(id))map.setFilter(id,['in',['get','id'],['literal',cities.map(c=>c.id)]]);
  const inputs=visible.map(c=>{const shortName=waterCities&&root.dataset.region==='southeast-asia'?c.id==='quezon-city'?'マニラ':c.name.replace(/（.*$/, ''):c.name.split('／')[0];const b=button(active+'-'+c.id,shortName,southeastPopulation?'asia-city-name asia-population-name':waterCities&&root.dataset.region==='southeast-asia'?'asia-city-name asia-water-city-name':'asia-city-name',()=>active==='climate'?chooseCity(c.id):waterCities?choosePoint(c.coordinates):chooseUrban(c.id));if(southeastPopulation){b.disabled=true;b.setAttribute('aria-label',shortName+'の位置');}else{b.dataset[active==='climate'?'mapCity':'mapUrban']=c.id;b.setAttribute('aria-label',`${c.name}の${active==='climate'?'雨温図':waterCities?'場所':'人口'}`);b.setAttribute('aria-pressed',String((active==='climate'?state.city:state.detail)===c.id));}return {id:c.id,anchor:project(c.coordinates),width:Math.max(32,shortName.length*(southeastPopulation?10:compact?11:12)+10),height:southeastPopulation?19:waterCities?22:compact?28:32};});
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
  if(active&&metadata.settlements?.[active])for(const c of metadata.settlements[active].categories.filter(c=>!c.id.endsWith('-shared')))annotation.push({id:c.id,text:c.label,coordinate:c.anchors[0],anchors:c.anchors,color:c.color,kind:'settlement'});
  if(['water','basins'].includes(active??'')&&config.riverFile&&datasets.has(config.riverFile))for(const focus of config.waterFocus??[]){
   const feature=datasets.get(config.riverFile).features.find((f:any)=>f.properties.id===focus.river);if(!feature)continue;
   const lines=feature.geometry.type==='MultiLineString'?feature.geometry.coordinates:[feature.geometry.coordinates],path=[...lines].sort((a:any,b:any)=>b.length-a.length)[0];if(path?.length)annotation.push({id:focus.river,text:focus.displayName??focus.name,coordinate:path[Math.floor(path.length/2)],kind:'river'});
  }
  if(active==='landform')annotation.push(...(config.landforms??[]).map(f=>({id:f.id,text:f.name,coordinate:f.coordinates,kind:'landform'})));
  if(active==='overview'&&!water&&datasets.has(metadata.farming.file)){const groups=metadata.farming.products.map(p=>{const labels=metadata.farming.labels.filter(a=>a.product===p.id);return labels.length?{...labels[0],id:p.id,anchors:labels.map(a=>a.coordinate)}:null;}).filter((a):a is NonNullable<typeof a>=>!!a&&selectedKinds.has(a.kind??'crop')&&(!singleFarm()||a.product===singleFarm()!.id));annotation.push(...groups.filter(a=>a.kind==='crop'));
   if(selectedKinds.has('livestock')){
    const points=metadata.farming.labels.filter(a=>a.kind==='livestock'&&(!singleFarm()||a.product===singleFarm()!.id)).filter(a=>Number(a.id.split('-').at(-1))<3);
    for(const a of points){const p=project(a.coordinate);if(p.x<12||p.y<12||p.x>width-12||p.y>height-12)continue;
     const b=button('animal-point-'+a.id,'','asia-climate-station asia-livestock-point',()=>chooseFarm(a.product!));b.style.opacity=selectedFarm()?.kind==='crop'?'.2':'1';b.style.left=p.x+'px';b.style.top=p.y+'px';b.style.setProperty('--label-color',a.color??'#80583b');b.setAttribute('aria-label',a.text+'の代表地点');b.setAttribute('aria-pressed',String(state.topic===a.product));const name=document.createElement('span');name.textContent=a.text;b.append(name);b.hidden=false;
     obstacles.push({left:p.x-6,top:p.y-6,right:p.x+6,bottom:p.y+6});
     // One permanent name per kind; all representative points keep hover names.
    }
    const animalInputs=groups.filter(a=>a.kind==='livestock').flatMap(a=>{
     const anchor=a.anchors.map(project).find(p=>p.x>=12&&p.y>=12&&p.x<=width-12&&p.y<=height-12);if(!anchor)return [];
     const id='overview-animal-'+a.id,b=button(id,a.text,'asia-farm-label',()=>chooseFarm(a.product!));b.style.opacity=selectedFarm()?.kind==='crop'?'.2':'1';b.style.setProperty('--label-color',a.color??'#80583b');b.setAttribute('aria-label',a.text+'の詳しい分布');b.setAttribute('aria-pressed',String(state.topic===a.product));
     return [{id,anchor,width:measuredWidth(b,a.text.length*12+10),height:24}];
    });
    for(const rect of layoutNatureLabels(animalInputs,bounds,obstacles)){
     const b=buttons.get(rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);placed.push(rect);
    }
   }}
  if(water&&config.riverFile&&datasets.has(config.riverFile))for(const f of datasets.get(config.riverFile).features.filter((f:any)=>config.riverIds?.includes(f.properties.id))){const lines=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];const line=[...lines].sort((a:any,b:any)=>b.length-a.length)[0];annotation.push({id:f.properties.id,text:f.properties.label,coordinate:line[Math.floor(line.length/2)],kind:'river'});}
  const isoline=active==='terrain'?(metadata.terrain?.bands??metadata.terrain):active==='precipitation'?(metadata.rainfall.bands??metadata.rainfall):water?metadata.rainfall:null;
  if(isoline&&('file' in isoline&&isoline.file?datasets.has(isoline.file):contourBandFiles(isoline as AsiaContourBands,'band').every(file=>datasets.has(file))))annotation.push(...isoline.labels.filter(a=>!a.value||a.value%(water?1000:active==='terrain'?1000:500)===0).slice(0,water?6:12));
  for(const a of annotation){const id=active+'-'+a.id;const b=button(id,a.text,a.kind==='river'?'asia-river-label':a.kind==='landform'?'asia-landform-label':a.product?'asia-farm-label':a.kind==='settlement'?'asia-settlement-label':'asia-rain-label',()=>a.product?chooseFarm(a.product):a.kind==='landform'&&config.selectLandform?config.selectLandform(a.id):choosePoint(a.coordinate));if(a.color)b.style.setProperty('--label-color',a.color);if(a.kind==='settlement'){b.onclick=event=>{event.stopPropagation();config.selectSettlement?.(a.id);};b.setAttribute('aria-pressed',String(state.detail===a.id));}b.setAttribute('aria-label',a.product?a.text+'の詳しい分布':['river','landform','settlement'].includes(a.kind??'')?a.text:`${a.text}${active==='terrain'?'mの等高線':'mmの等雨量線'}`);codes.push({id,code:a.text,anchors:(a.anchors??[a.coordinate]).map(project),width:measuredWidth(b,a.text.length*11+10),height:24});}
  const codePlacements=layoutClimateCodes(codes,bounds,[...obstacles,...placed]);
  for(const rect of codePlacements){const b=buttons.get(rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';if(rect.id.startsWith('climate-')){const cls=metadata.climate.find(c=>'climate-'+c.id===rect.id)!;const index=cls.anchors.findIndex(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});b.dataset.coordinate=cls.anchors[Math.max(0,index)].join(',');}if(active&&metadata.settlements?.[active]){const c=metadata.settlements[active].categories.find(c=>active+'-'+c.id===rect.id);const anchor=c?.anchors.find(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});if(anchor)b.dataset.coordinate=anchor.join(',');}if(rect.leader||rect.id.startsWith('overview-animal-')){const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);}}
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
  if(map!==currentMap){map=currentMap;map.on('movestart',()=>{overlay.hidden=true;});map.on('moveend',schedule);map.on('resize',schedule);}
  syncKinds();const seq=++revision,current=mode();schedule();
  if(errorMode!==current){errorMode=null;onStatus('');}
  const settlement=current?metadata.settlements?.[current]:undefined;
  const farm=current==='overview',water=farm&&getState().overlay==='water',terrain=current==='terrain'&&!!metadata.terrain;
  const bands=current==='precipitation'?metadata.rainfall.bands:terrain?metadata.terrain?.bands:undefined;
  const bandFiles=bands?contourBandFiles(bands,'band'):[],lineFiles=bands?contourBandFiles(bands,'line'):[];
  const geometry=(files:string[])=>files.length===1?datasets.get(files[0]):{type:'FeatureCollection',features:files.flatMap(file=>datasets.get(file).features)};
  root.dataset.contourBandStatus=bands?'loading':'inactive';root.dataset.contourBandKind=bands?(terrain?'terrain':'rainfall'):'';
  root.dataset.farmContextStatus=farm?'loading':'inactive';
  if(farm){const reading=root.querySelector<HTMLElement>('[data-grid-reading]');if(reading&&(!selectedFarm()||!getState().point))reading.textContent=singleFarm()?singleFarm()!.title+'の概略分布だけを表示しています。右のボタンで全品目へ戻れます。':water?'米の概略栽培域（緑）・主な川（青）・250mm間隔の年降水量を重ねています。':selectedFarm()?.kind==='crop'?'色は各作物の概略分布、太い輪郭は選択した作物です。家畜の代表点は薄く表示しています。':selectedKinds.size===2?'作物の栽培域と畜産の代表点を表示しています。品目名を選ぶと詳しい分布を読めます。':selectedKinds.size===0?'作物・畜産は非表示です。左上のボタンで表示できます。':selectedKinds.has('crop')?'作物の特徴的な分布を表示しています。家畜の分布は非表示です。':'家畜の特徴的な分布を表示しています。作物の分布は非表示です。';}
  for(const id of ['asia-settlement-fill','asia-settlement-selected-halo','asia-settlement-selected','asia-farm-overview-fill','asia-farm-overview-crop','asia-farm-overview-selected-halo','asia-farm-overview-selected','asia-farm-overview-livestock-fill','asia-farm-overview-livestock','asia-rainfall-lines','asia-terrain-lines','asia-rainfall-aligned-lines','asia-terrain-aligned-lines','asia-rainfall-bands','asia-terrain-bands','asia-farm-rivers'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  if(!farm&&current!=='precipitation'&&!terrain&&!settlement)return;
  const requested=[...(settlement?[config.presentationBase.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file]:[]),...(farm?[metadata.farming.file]:[]),...bandFiles,...lineFiles,...(!bands&&(current==='precipitation'||water)?[metadata.rainfall.file]:[]),...(!bands&&terrain?[metadata.terrain!.file]:[]),...(water&&config.riverFile?[config.riverFile]:[])];
  try{
   await Promise.all(requested.map(load));if(seq!==revision||map!==currentMap||disposed)return;
   if(settlement){const id='asia-settlement-fill',file=config.presentationBase.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file;const data=datasets.get(file);if(!map.getSource(id)){map.addSource(id,{type:'geojson',data});map.addLayer({id,type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':.8}},'asia-country-border');}else (map.getSource(id) as import('maplibre-gl').GeoJSONSource).setData(data);map.setLayoutProperty(id,'visibility','visible');
    for(const [suffix,color,width] of [['halo','#fffdf5',5],['line','#203f4a',2.5]] as const){const selected=suffix==='line'?'asia-settlement-selected':'asia-settlement-selected-halo';if(!map.getLayer(selected))map.addLayer({id:selected,type:'line',source:id,paint:{'line-color':color,'line-width':width}});map.setFilter(selected,['==',['get','id'],getState().detail??'']);map.setLayoutProperty(selected,'visibility','visible');}
   }
   if(farm){
    const id='asia-farm-overview';
    if(!map.getSource(id)){
     map.addSource(id,{type:'geojson',data:datasets.get(metadata.farming.file)});
     const opacity:any=['case',['==',['get','distribution'],'spread'],.36,.76];
     map.addLayer({id:id+'-fill',type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':opacity}},'asia-country-border');
     map.addLayer({id:id+'-livestock-fill',type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':opacity}},'asia-country-border');
     map.addLayer({id:id+'-crop',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.7,'line-width':.85}},'asia-country-border');
     map.addLayer({id:id+'-livestock',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.7,'line-width':1.2}},'asia-country-border');
     map.addLayer({id:id+'-selected-halo',type:'line',source:id,paint:{'line-color':'#fffdf5','line-width':5}});
     map.addLayer({id:id+'-selected',type:'line',source:id,paint:{'line-color':'#203f4a','line-width':2.5}});
    }
    for(const [suffix,kind] of [['fill','crop'],['crop','crop'],['livestock-fill','livestock'],['livestock','livestock']]){const layer=id+'-'+suffix;map.setFilter(layer,['all',['==',['get','kind'],kind],...(water?[['==',['get','id'],'rice']]:singleFarm()?[['==',['get','id'],singleFarm()!.id]]:[])] as any);map.setLayoutProperty(layer,'visibility',suffix==='fill'&&(water?kind==='crop':selectedKinds.has(kind))?'visible':'none');}
    for(const suffix of ['selected-halo','selected']){const selected=id+'-'+suffix;map.setFilter(selected,['==',['get','id'],selectedFarm()?.id??'']);map.setLayoutProperty(selected,'visibility',!water&&selectedFarm()?.kind==='crop'&&selectedKinds.has('crop')?'visible':'none');}
   }
   if(bands){const id=terrain?'asia-terrain-bands':'asia-rainfall-bands';if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:geometry(bandFiles),tolerance:0});map.addLayer({id,type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':1,'fill-antialias':false}},'asia-country-border');}map.setLayoutProperty(id,'visibility','visible');}
   for(const [visible,baseId,record,color] of [[current==='precipitation'||water,'asia-rainfall-lines',metadata.rainfall,'#347d9c'],[terrain,'asia-terrain-lines',metadata.terrain,'#8c7051']] as const){
    if(!visible||!record)continue;
    const id=bands?baseId.replace('-lines','-aligned-lines'):baseId;
    if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:bands?geometry(lineFiles):datasets.get(record.file),...(bands?{tolerance:0}:{})});map.addLayer({id,type:'line',source:id,paint:{'line-color':color,'line-width':['case',['==',['%',['get','value'],1000],0],1,.5],'line-opacity':['case',['==',['%',['get','value'],1000],0],.8,.4]}},'asia-country-border');}
    map.setLayoutProperty(id,'visibility','visible');
   }
   if(bands){await Promise.all([sourceReady(currentMap,terrain?'asia-terrain-bands':'asia-rainfall-bands',seq),sourceReady(currentMap,terrain?'asia-terrain-aligned-lines':'asia-rainfall-aligned-lines',seq)]);if(seq!==revision||map!==currentMap||disposed)return;root.dataset.contourBandStatus='ready';}
   if(water&&config.riverFile){const id='asia-farm-rivers';if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:datasets.get(config.riverFile)});map.addLayer({id,type:'line',source:id,filter:['in',['get','id'],['literal',config.riverIds??[]]],paint:{'line-color':'#17688b','line-width':2,'line-opacity':.95}});}map.setLayoutProperty(id,'visibility','visible');}
   if(farm){root.dataset.farmContextStatus='ready';root.dataset.farmSelected=selectedFarm()?.id??'';root.dataset.farmView=singleFarm()?'single':'all';}
   errorMode=null;onStatus('');schedule();
  }catch{if(seq===revision&&map===currentMap&&!disposed){errorMode=current;if(bands)root.dataset.contourBandStatus='error';if(farm)root.dataset.farmContextStatus='error';onStatus(settlement?'居住域の資料を取得できませんでした。再読み込みをお試しください。':farm?'農畜産物の概略分布を取得できませんでした。地点の値と国別統計は品目の欄で確認できます。':bands?'等値線と色帯を取得できませんでした。地点の原格子値は選んで確認できます。':terrain?'等高線を取得できませんでした。地点を選ぶと標高を確認できます。':'等雨量線を取得できませんでした。地点ごとの降水量は選んで確認できます。');}}

 }
 for(const b of toggles)b.addEventListener('click',()=>{const kind=b.dataset.farmToggle!;if(selectedKinds.has(kind))selectedKinds.delete(kind);else selectedKinds.add(kind);const value=selectedKinds.size===2?null:selectedKinds.size===0?'none':[...selectedKinds][0] as 'crop'|'livestock';config.selectFarmKinds?.(value);if(map&&!config.selectFarmKinds)void show(map);},{signal:events.signal});
 for(const control of controls)control.addEventListener('change',()=>{if(control.checked)selectedKinds.add(control.dataset.farmKind!);else selectedKinds.delete(control.dataset.farmKind!);config.selectFarmKinds?.(selectedKinds.size===2?null:selectedKinds.size===0?'none':[...selectedKinds][0] as 'crop'|'livestock');if(map&&!config.selectFarmKinds)void show(map);},{signal:events.signal});
 return {show,refresh:schedule,setRivers(data:any){if(config.riverFile)datasets.set(config.riverFile,data);schedule();},destroy(){disposed=true;for(const cancel of sourceWaits)cancel();events.abort();cancelAnimationFrame(scheduled);overlay.replaceChildren();onStatus('');}};
}
