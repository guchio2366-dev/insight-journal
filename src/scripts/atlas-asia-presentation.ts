import {layoutNatureLabels,leaderEnd,type Box} from '../lib/atlas-nature-labels';
import {layoutClimateCodes,type CodeInput} from '../lib/atlas-climate-code-labels';
import type {AsiaState} from '../lib/atlas-asia-state';
import {majorClimateCities} from '../data/atlas/asia-focus';
type Coordinate=[number,number];
type Annotation={id:string;text:string;coordinate:Coordinate;anchors?:Coordinate[];product?:string;kind?:string;color?:string;value?:number};
export type AsiaPresentation={
 settlements?:Record<string,{file:string;categories:{id:string;label:string;color:string;anchors:Coordinate[]}[]}>;
 farming:{file:string;products:{id:string;title:string;kind:string;color:string;threshold:number;unit:string}[];labels:Annotation[]};
 rainfall:{file:string;levels:number[];labels:Annotation[]};
 terrain?:{file:string;levels:number[];labels:Annotation[]};
 climate:{id:number;code:string;name:string;anchors:Coordinate[];minZoom:number}[];
};
type City={id:string;name:string;coordinates:Coordinate;countryCode?:string;country?:string};
export function createAsiaPresentation(root:HTMLElement,config:{presentation:AsiaPresentation;presentationBase:string;cities:City[];population?:{cities:City[]};riverFile?:string;riverIds?:string[];landforms?:{id:string;name:string;coordinates:Coordinate}[];waterFocus?:{id:string;name:string;river:string}[];selectLandform?:(id:string)=>void},getState:()=>AsiaState,chooseCity:(id:string)=>void,chooseUrban:(id:string)=>void,choosePoint:(point:Coordinate)=>void,chooseFarm:(id:string)=>void,onStatus:(message:string)=>void){
 const metadata=config.presentation,overlay=root.querySelector<HTMLElement>('[data-map-annotations]')!;
 let map:import('maplibre-gl').Map|null=null,revision=0,scheduled=0,disposed=false;
 let errorMode:string|null=null;
 const events=new AbortController();
 const controls=root.querySelectorAll<HTMLInputElement>('[data-farm-kind]');
 const selectedKinds=new Set(controls.length?[...controls].filter(control=>control.checked).map(control=>control.dataset.farmKind!):['crop','livestock']);
 const datasets=new Map<string,any>(),pending=new Map<string,Promise<any>>();
 const buttons=new Map<string,HTMLButtonElement>();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
 const mode=()=>{const s=getState();return s.field==='natural'?(s.topic??'climate'):s.field==='agriculture'?(s.topic??(s.city?'rice':'overview')):s.field==='population'?(!s.topic||['density','urban'].includes(s.topic)?'population':['ethnicity','religion'].includes(s.topic)?s.topic:null):null;};
 async function load(file:string){
  if(datasets.has(file))return datasets.get(file);
  if(!pending.has(file))pending.set(file,(async()=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);try{const response=await fetch(file.startsWith('/')?file:config.presentationBase+file,{signal:abort.signal});if(!response.ok)throw Error('Presentation asset '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());const text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);const data=JSON.parse(text);datasets.set(file,data);return data;}finally{clearTimeout(timer);}})().finally(()=>pending.delete(file)));
  return pending.get(file)!;
 }
 function line(x1:number,y1:number,x2:number,y2:number,color='#637c81') {const el=document.createElementNS(svg.namespaceURI,'line');for(const [key,value] of Object.entries({x1,y1,x2,y2,stroke:color,'stroke-width':.9}))el.setAttribute(key,String(value));svg.append(el);}
 function dot(x:number,y:number){const el=document.createElementNS(svg.namespaceURI,'circle');for(const [key,value] of Object.entries({cx:x,cy:y,r:3.5,fill:'#fff',stroke:'#345965','stroke-width':1.8}))el.setAttribute(key,String(value));svg.append(el);}
 function button(id:string,text:string,kind:string,action:()=>void){
  let b=buttons.get(id);if(!b){b=document.createElement('button');b.type='button';b.onclick=event=>{event.stopPropagation();action();};buttons.set(id,b);overlay.append(b);}
  b.className=kind;b.textContent=text;b.hidden=true;return b;
 }
 function measuredWidth(b:HTMLButtonElement,fallback:number){b.hidden=false;b.style.width='max-content';const width=b.getBoundingClientRect().width;b.hidden=true;return width||fallback;}
 function update(){
  scheduled=0;if(!map||disposed||typeof map.project!=='function')return;
  const active=mode(),state=getState(),water=active==='overview'&&state.overlay==='water';overlay.hidden=!['climate','population','overview','precipitation','terrain','landform','water','basins','groundwater','ethnicity','religion'].includes(active??'');
  for(const b of buttons.values())b.hidden=true;svg.replaceChildren();if(overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;
  const compact=width<440,bounds={left:0,top:0,right:width,bottom:height};
  const obstacles:Box[]=[{left:width-(compact?62:70),top:0,right:width,bottom:compact?165:190}];
  const project=(p:Coordinate)=>map!.project(p);
  const waterCities=['water','basins','groundwater'].includes(active??'');
  const cities=active==='climate'?config.cities:active==='population'?config.population?.cities??[]:waterCities?config.cities.filter(c=>majorClimateCities.has(c.id)):[];
  let visible=cities.filter(c=>{const p=project(c.coordinates);return p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height;});
  if(active==='climate'){
   // Station points survive label thinning and collisions. Hover/focus names
   // and tap-to-open diagrams also expose stations without a permanent label.
   for(const city of visible){
    const p=project(city.coordinates),b=button('station-'+city.id,'','asia-climate-station',()=>chooseCity(city.id));
    b.dataset.station=city.id;b.setAttribute('aria-label',city.name+'の雨温図');b.setAttribute('aria-pressed',String(state.city===city.id));
    const name=document.createElement('span');name.textContent=city.name;if(p.x>width-150){name.style.left='auto';name.style.right='calc(50% + 9px)';}b.append(name);
    b.style.left=p.x+'px';b.style.top=p.y+'px';b.hidden=false;
    obstacles.push({left:p.x-5,top:p.y-5,right:p.x+5,bottom:p.y+5});
   }
   visible=visible.filter(c=>majorClimateCities.has(c.id)||c.id===state.city);
  }
  if(active==='population'&&map.getZoom()<5){
   const ordered=[...visible].sort((a,b)=>Number(b.id===state.detail)-Number(a.id===state.detail));
   const chosen:City[]=[];const limit=compact?8:12;
   for(const city of ordered){const p=project(city.coordinates);if(city.id===state.detail||chosen.every(c=>{const q=project(c.coordinates);return Math.hypot(p.x-q.x,p.y-q.y)>43;}))chosen.push(city);if(chosen.length===limit)break;}
   visible=chosen;
  }
  if(active==='population')for(const id of ['asia-urban-points','asia-urban-hit'])if(map.getLayer(id))map.setFilter(id,['in',['get','id'],['literal',visible.map(c=>c.id)]]);
  const inputs=visible.map(c=>{const b=button(active+'-'+c.id,c.name.split('／')[0],'asia-city-name',()=>active==='climate'?chooseCity(c.id):waterCities?choosePoint(c.coordinates):chooseUrban(c.id));b.dataset[active==='climate'?'mapCity':'mapUrban']=c.id;b.setAttribute('aria-label',`${c.name}の${active==='climate'?'雨温図':waterCities?'場所':'人口'}`);b.setAttribute('aria-pressed',String((active==='climate'?state.city:state.detail)===c.id));return {id:c.id,anchor:project(c.coordinates),width:Math.max(40,c.name.split('／')[0].length*(compact?11:12)+14),height:compact?28:32};});
  const placed=layoutNatureLabels(inputs,bounds,obstacles);
  for(const rect of placed){const b=buttons.get(active+'-'+rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);if(active!=='climate')dot(rect.anchor.x,rect.anchor.y);}
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
   const lines=feature.geometry.type==='MultiLineString'?feature.geometry.coordinates:[feature.geometry.coordinates],path=[...lines].sort((a:any,b:any)=>b.length-a.length)[0];if(path?.length)annotation.push({id:focus.river,text:focus.name,coordinate:path[Math.floor(path.length/2)],kind:'river'});
  }
  if(active==='landform')annotation.push(...(config.landforms??[]).map(f=>({id:f.id,text:f.name,coordinate:f.coordinates,kind:'landform'})));
  if(active==='overview'&&!water&&datasets.has(metadata.farming.file)){const groups=metadata.farming.products.map(p=>{const labels=metadata.farming.labels.filter(a=>a.product===p.id);return labels.length?{...labels[0],id:p.id,anchors:labels.map(a=>a.coordinate)}:null;}).filter((a):a is NonNullable<typeof a>=>!!a&&selectedKinds.has(a.kind??'crop'));const crops=groups.filter(a=>a.kind==='crop'),animals=groups.filter(a=>a.kind==='livestock');for(let i=0;i<Math.max(crops.length,animals.length);i++){if(crops[i])annotation.push(crops[i]);if(animals[i])annotation.push(animals[i]);}}
  if(water&&config.riverFile&&datasets.has(config.riverFile))for(const f of datasets.get(config.riverFile).features.filter((f:any)=>config.riverIds?.includes(f.properties.id))){const lines=f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates];const line=[...lines].sort((a:any,b:any)=>b.length-a.length)[0];annotation.push({id:f.properties.id,text:f.properties.label,coordinate:line[Math.floor(line.length/2)],kind:'river'});}
  const isoline=active==='terrain'?metadata.terrain:active==='precipitation'||water?metadata.rainfall:null;
  if(isoline&&datasets.has(isoline.file))annotation.push(...isoline.labels.filter(a=>!a.value||a.value%(water?1000:active==='terrain'?1000:500)===0).slice(0,water?6:12));
  for(const a of annotation){const id=active+'-'+a.id;const b=button(id,a.text,a.kind==='river'?'asia-river-label':a.kind==='landform'?'asia-landform-label':a.product?'asia-farm-label':a.kind==='settlement'?'asia-settlement-label':'asia-rain-label',()=>a.product?chooseFarm(a.product):a.kind==='landform'&&config.selectLandform?config.selectLandform(a.id):choosePoint(a.coordinate));if(a.color)b.style.setProperty('--label-color',a.color);if(a.kind==='settlement')b.onclick=event=>{event.stopPropagation();const point=b.dataset.coordinate?.split(',').map(Number) as Coordinate|undefined;if(point)choosePoint(point);};b.setAttribute('aria-label',a.product?a.text+'の詳しい分布':['river','landform','settlement'].includes(a.kind??'')?a.text:`${a.text}${active==='terrain'?'mの等高線':'mmの等雨量線'}`);codes.push({id,code:a.text,anchors:(a.anchors??[a.coordinate]).map(project),width:measuredWidth(b,a.text.length*11+10),height:24});}
  const codePlacements=layoutClimateCodes(codes,bounds,[...obstacles,...placed]);
  for(const rect of codePlacements){const b=buttons.get(rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';if(rect.id.startsWith('climate-')){const cls=metadata.climate.find(c=>'climate-'+c.id===rect.id)!;const index=cls.anchors.findIndex(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});b.dataset.coordinate=cls.anchors[Math.max(0,index)].join(',');}if(active&&metadata.settlements?.[active]){const c=metadata.settlements[active].categories.find(c=>active+'-'+c.id===rect.id);const anchor=c?.anchors.find(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});if(anchor)b.dataset.coordinate=anchor.join(',');}if(rect.leader){const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);}}
 }
 function schedule(){if(!scheduled&&!disposed)scheduled=requestAnimationFrame(update);}
 async function show(currentMap:import('maplibre-gl').Map){
  if(map!==currentMap){map=currentMap;map.on('movestart',()=>{overlay.hidden=true;});map.on('moveend',schedule);map.on('resize',schedule);}
  const seq=++revision,current=mode();schedule();
  if(errorMode!==current){errorMode=null;onStatus('');}
  const settlement=current?metadata.settlements?.[current]:undefined;
  const farm=current==='overview',water=farm&&getState().overlay==='water',terrain=current==='terrain'&&!!metadata.terrain;
  if(farm){const reading=root.querySelector<HTMLElement>('[data-grid-reading]');if(reading)reading.textContent=water?'米の概略栽培域（緑）・主な川（青）・250mm間隔の年降水量を重ねています。':selectedKinds.size===2?'作物と家畜の特徴的な分布を同時に表示しています。品目名を選ぶと詳しい分布を読めます。':selectedKinds.size===0?'地図に表示する作物・家畜をチェックしてください。':selectedKinds.has('crop')?'作物の特徴的な分布を表示しています。家畜の分布は非表示です。':'家畜の特徴的な分布を表示しています。作物の分布は非表示です。';}
  for(const id of ['asia-settlement-fill','asia-farm-overview-fill','asia-farm-overview-crop','asia-farm-overview-livestock-fill','asia-farm-overview-livestock','asia-rainfall-lines','asia-terrain-lines','asia-farm-rivers'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  if(!farm&&current!=='precipitation'&&!terrain&&!settlement)return;
  const requested=[...(settlement?[config.presentationBase.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file]:[]),...(farm?[metadata.farming.file]:[]),...(current==='precipitation'||water?[metadata.rainfall.file]:[]),...(terrain?[metadata.terrain!.file]:[]),...(water&&config.riverFile?[config.riverFile]:[])];
  try{
   await Promise.all(requested.map(load));if(seq!==revision||map!==currentMap||disposed)return;
   if(settlement){const id='asia-settlement-fill',file=config.presentationBase.replace('asia-presentation-v1/','asia-settlements-v1/')+settlement.file;const data=datasets.get(file);if(!map.getSource(id)){map.addSource(id,{type:'geojson',data});map.addLayer({id,type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':.8}},'asia-country-border');}else (map.getSource(id) as import('maplibre-gl').GeoJSONSource).setData(data);map.setLayoutProperty(id,'visibility','visible');}
   if(farm){
    const id='asia-farm-overview';
    if(!map.getSource(id)){
     map.addSource(id,{type:'geojson',data:datasets.get(metadata.farming.file)});
     const opacity:any=['case',['==',['get','distribution'],'spread'],.36,.76];
     map.addLayer({id:id+'-fill',type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':opacity}},'asia-country-border');
     map.addLayer({id:id+'-livestock-fill',type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':opacity}},'asia-country-border');
     map.addLayer({id:id+'-crop',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.7,'line-width':.85}},'asia-country-border');
     map.addLayer({id:id+'-livestock',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.7,'line-width':1.2}},'asia-country-border');
    }
    for(const [suffix,kind] of [['fill','crop'],['crop','crop'],['livestock-fill','livestock'],['livestock','livestock']]){const layer=id+'-'+suffix;map.setFilter(layer,['all',['==',['get','kind'],kind],...(water?[['==',['get','id'],'rice']]:[])] as any);map.setLayoutProperty(layer,'visibility',suffix.endsWith('fill')&&(water?kind==='crop':selectedKinds.has(kind))?'visible':'none');}
   }
   for(const [visible,id,record,color] of [[current==='precipitation'||water,'asia-rainfall-lines',metadata.rainfall,'#347d9c'],[terrain,'asia-terrain-lines',metadata.terrain,'#8c7051']] as const){
    if(!visible||!record)continue;
    if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:datasets.get(record.file)});map.addLayer({id,type:'line',source:id,paint:{'line-color':color,'line-width':['case',['==',['%',['get','value'],1000],0],1,.5],'line-opacity':['case',['==',['%',['get','value'],1000],0],.8,.4]}},'asia-country-border');}
    map.setLayoutProperty(id,'visibility','visible');
   }
   if(water&&config.riverFile){const id='asia-farm-rivers';if(!map.getSource(id)){map.addSource(id,{type:'geojson',data:datasets.get(config.riverFile)});map.addLayer({id,type:'line',source:id,filter:['in',['get','id'],['literal',config.riverIds??[]]],paint:{'line-color':'#17688b','line-width':2,'line-opacity':.95}});}map.setLayoutProperty(id,'visibility','visible');}
   errorMode=null;onStatus('');schedule();
  }catch{if(seq===revision&&map===currentMap&&!disposed){errorMode=current;onStatus(settlement?'居住域の資料を取得できませんでした。再読み込みをお試しください。':farm?'農畜産物の分布図を取得できませんでした。凡例から品目別の詳細図を選べます。':terrain?'等高線を取得できませんでした。地点を選ぶと標高を確認できます。':'等雨量線を取得できませんでした。地点ごとの降水量は選んで確認できます。');}}

 }
 for(const control of controls)control.addEventListener('change',()=>{if(control.checked)selectedKinds.add(control.dataset.farmKind!);else selectedKinds.delete(control.dataset.farmKind!);if(map)void show(map);},{signal:events.signal});
 return {show,refresh:schedule,setRivers(data:any){if(config.riverFile)datasets.set(config.riverFile,data);schedule();},destroy(){disposed=true;events.abort();cancelAnimationFrame(scheduled);overlay.replaceChildren();onStatus('');}};
}
