import {layoutNatureLabels,leaderEnd,type Box} from '../lib/atlas-nature-labels';
import {layoutClimateCodes,type CodeInput} from '../lib/atlas-climate-code-labels';
import type {AsiaState} from '../lib/atlas-asia-state';
type Coordinate=[number,number];
type Annotation={id:string;text:string;coordinate:Coordinate;product?:string;kind?:string;color?:string};
export type AsiaPresentation={
 farming:{file:string;products:{id:string;title:string;kind:string;color:string;threshold:number;unit:string}[];labels:Annotation[]};
 rainfall:{file:string;levels:number[];labels:Annotation[]};
 climate:{id:number;code:string;name:string;anchors:Coordinate[];minZoom:number}[];
};
type City={id:string;name:string;coordinates:Coordinate;countryCode?:string;country?:string};
export function createAsiaPresentation(root:HTMLElement,config:{presentation:AsiaPresentation;presentationBase:string;cities:City[];population?:{cities:City[]}},getState:()=>AsiaState,chooseCity:(id:string)=>void,chooseUrban:(id:string)=>void,choosePoint:(point:Coordinate)=>void,chooseFarm:(id:string)=>void,onStatus:(message:string)=>void){
 const metadata=config.presentation,overlay=root.querySelector<HTMLElement>('[data-map-annotations]')!;
 let map:import('maplibre-gl').Map|null=null,revision=0,scheduled=0,disposed=false;
 let errorMode:string|null=null;
 const events=new AbortController();
 const controls=root.querySelectorAll<HTMLInputElement>('[data-farm-kind]');
 const selectedKinds=new Set([...controls].filter(control=>control.checked).map(control=>control.dataset.farmKind!));
 const datasets=new Map<string,any>(),pending=new Map<string,Promise<any>>();
 const buttons=new Map<string,HTMLButtonElement>();
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');overlay.append(svg);
 const mode=()=>{const s=getState();return s.field==='natural'?(s.topic??'climate'):s.field==='agriculture'?(s.topic??(s.city?'rice':'overview')):s.field==='population'&&(!s.topic||['density','urban'].includes(s.topic))?'population':null;};
 async function load(file:string){
  if(datasets.has(file))return datasets.get(file);
  if(!pending.has(file))pending.set(file,(async()=>{const response=await fetch(config.presentationBase+file);if(!response.ok)throw Error('Presentation asset '+response.status);const bytes=new Uint8Array(await response.arrayBuffer());const text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);const data=JSON.parse(text);datasets.set(file,data);return data;})().finally(()=>pending.delete(file)));
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
  const active=mode(),state=getState();overlay.hidden=!['climate','population','overview','precipitation'].includes(active??'');
  for(const b of buttons.values())b.hidden=true;svg.replaceChildren();if(overlay.hidden)return;
  const width=overlay.clientWidth,height=overlay.clientHeight;if(!width||!height)return;
  const compact=width<440,bounds={left:0,top:0,right:width,bottom:height};
  const obstacles:Box[]=[{left:width-(compact?62:70),top:0,right:width,bottom:compact?165:190}];
  const project=(p:Coordinate)=>map!.project(p);
  const cities=active==='climate'?config.cities:active==='population'?config.population?.cities??[]:[];
  let visible=cities.filter(c=>{const p=project(c.coordinates);return p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height;});
  if(active==='population'&&map.getZoom()<5){
   const ordered=[...visible].sort((a,b)=>Number(b.id===state.detail)-Number(a.id===state.detail));
   const chosen:City[]=[];const limit=compact?8:12;
   for(const city of ordered){const p=project(city.coordinates);if(city.id===state.detail||chosen.every(c=>{const q=project(c.coordinates);return Math.hypot(p.x-q.x,p.y-q.y)>43;}))chosen.push(city);if(chosen.length===limit)break;}
   visible=chosen;
  }
  if(active==='population')for(const id of ['asia-urban-points','asia-urban-hit'])if(map.getLayer(id))map.setFilter(id,['in',['get','id'],['literal',visible.map(c=>c.id)]]);
  const inputs=visible.map(c=>{const b=button(active+'-'+c.id,c.name.split('／')[0],'asia-city-name',()=>active==='climate'?chooseCity(c.id):chooseUrban(c.id));b.dataset[active==='climate'?'mapCity':'mapUrban']=c.id;b.setAttribute('aria-label',`${c.name}の${active==='climate'?'雨温図':'人口'}`);b.setAttribute('aria-pressed',String((active==='climate'?state.city:state.detail)===c.id));return {id:c.id,anchor:project(c.coordinates),width:Math.max(40,c.name.split('／')[0].length*(compact?11:12)+14),height:compact?28:32};});
  const placed=layoutNatureLabels(inputs,bounds,obstacles);
  for(const rect of placed){const b=buttons.get(active+'-'+rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);dot(rect.anchor.x,rect.anchor.y);}
  const codes:CodeInput[]=[];
  if(active==='climate')for(const cls of metadata.climate){
   if(map.getZoom()<cls.minZoom)continue;
   const text=cls.code+' '+cls.name,id='climate-'+cls.id;const b=button(id,text,'asia-climate-code',()=>choosePoint(cls.anchors[0]));b.setAttribute('aria-label',`${cls.code} ${cls.name}の分布を確認`);
   // The click target uses the anchor actually chosen by the collision layout.
   b.onclick=event=>{event.stopImmediatePropagation();const point=b.dataset.coordinate?.split(',').map(Number) as Coordinate;choosePoint(point);};
   codes.push({id,code:text,anchors:cls.anchors.map(project),width:measuredWidth(b,cls.name.length*13+cls.code.length*8+18),height:24});
  }
  const annotation=active==='overview'&&datasets.has(metadata.farming.file)?metadata.farming.labels.filter(a=>selectedKinds.has(a.kind!)):active==='precipitation'&&datasets.has(metadata.rainfall.file)?metadata.rainfall.labels:[];
  for(const a of annotation){const id=active+'-'+a.id;const b=button(id,a.text,active==='overview'?'asia-farm-label':'asia-rain-label',()=>active==='overview'?chooseFarm(a.product!):choosePoint(a.coordinate));b.style.setProperty('--label-color',a.color??'#286487');codes.push({id,code:a.text,anchors:[project(a.coordinate)],width:measuredWidth(b,a.text.length*12+12),height:24});}
  const codePlacements=layoutClimateCodes(codes,bounds,[...obstacles,...placed]);
  for(const rect of codePlacements){const b=buttons.get(rect.id)!;b.hidden=false;b.style.left=rect.left+'px';b.style.top=rect.top+'px';b.style.width=(rect.right-rect.left)+'px';b.style.height=(rect.bottom-rect.top)+'px';if(rect.id.startsWith('climate-')){const cls=metadata.climate.find(c=>'climate-'+c.id===rect.id)!;const index=cls.anchors.findIndex(p=>{const q=project(p);return Math.abs(q.x-rect.anchor.x)<.1&&Math.abs(q.y-rect.anchor.y)<.1;});b.dataset.coordinate=cls.anchors[Math.max(0,index)].join(',');}if(rect.leader){const end=leaderEnd(rect.anchor,rect);line(rect.anchor.x,rect.anchor.y,end.x,end.y);}}
 }
 function schedule(){if(!scheduled&&!disposed)scheduled=requestAnimationFrame(update);}
 async function show(currentMap:import('maplibre-gl').Map){
  if(map!==currentMap){map=currentMap;map.on('movestart',()=>{overlay.hidden=true;});map.on('moveend',schedule);map.on('resize',schedule);}
  const seq=++revision,current=mode();schedule();
  if(errorMode!==current){errorMode=null;onStatus('');}
  if(current==='overview'){const reading=root.querySelector<HTMLElement>('[data-grid-reading]');if(reading)reading.textContent=selectedKinds.size===2?'作物と家畜の特徴的な分布を同時に表示しています。品目名を選ぶと詳しい分布を読めます。':selectedKinds.size===0?'地図に表示する作物・家畜をチェックしてください。':selectedKinds.has('crop')?'作物の特徴的な分布を表示しています。家畜の分布は非表示です。':'家畜の特徴的な分布を表示しています。作物の分布は非表示です。';}
  for(const id of ['asia-farm-overview-fill','asia-farm-overview-crop','asia-farm-overview-livestock','asia-rainfall-lines'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');
  if(current!=='overview'&&current!=='precipitation')return;
  const farm=current==='overview',id=farm?'asia-farm-overview':'asia-rainfall-lines';
  try{
   const data=await load(farm?metadata.farming.file:metadata.rainfall.file);if(seq!==revision||map!==currentMap||disposed)return;
   if(!map.getSource(id)){
    map.addSource(id,{type:'geojson',data});
    if(farm){
     map.addLayer({id:id+'-fill',type:'fill',source:id,paint:{'fill-color':['get','color'],'fill-opacity':.16}},'asia-country-border');
     map.addLayer({id:id+'-crop',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.8,'line-width':1.1}},'asia-country-border');
     map.addLayer({id:id+'-livestock',type:'line',source:id,paint:{'line-color':['get','color'],'line-opacity':.8,'line-width':1.2,'line-dasharray':[3,2]}},'asia-country-border');
    }else map.addLayer({id,type:'line',source:id,paint:{'line-color':'#347d9c','line-width':['interpolate',['linear'],['zoom'],1,.7,6,1.3],'line-opacity':.9}},'asia-country-border');
   }
   if(farm){for(const [suffix,kind] of [['fill','crop'],['crop','crop'],['livestock','livestock']]){const layer=id+'-'+suffix;map.setFilter(layer,['==',['get','kind'],kind]);map.setLayoutProperty(layer,'visibility',selectedKinds.has(kind)?'visible':'none');}}
   else map.setLayoutProperty(id,'visibility','visible');errorMode=null;onStatus('');schedule();
  }catch{if(seq===revision&&map===currentMap&&!disposed){errorMode=current;onStatus(farm?'農畜産物の分布図を取得できませんでした。凡例から品目別の詳細図を選べます。':'等雨量線を取得できませんでした。地点ごとの降水量は選んで確認できます。');}}
 }
 for(const control of controls)control.addEventListener('change',()=>{if(control.checked)selectedKinds.add(control.dataset.farmKind!);else selectedKinds.delete(control.dataset.farmKind!);if(map)void show(map);},{signal:events.signal});
 return {show,refresh:schedule,destroy(){disposed=true;events.abort();cancelAnimationFrame(scheduled);overlay.replaceChildren();onStatus('');}};
}
