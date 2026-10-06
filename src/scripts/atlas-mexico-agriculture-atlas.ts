import {renderAgricultureMarkers} from '../lib/atlas-agriculture-markers';
import {readMexicoAgricultureAtlasState,writeMexicoAgricultureAtlasState,agricultureCameraViewBox,normalizeMexicoAgricultureCamera,type MexicoAgricultureAtlasState} from '../lib/atlas-mexico-agriculture-atlas-state';
import {mexicoAgricultureLabel} from '../data/atlas/mexico/agriculture-catalog';
import {placeMexicoAgricultureLabels,agricultureLabelIntersects,type AgricultureLabelBox} from '../lib/atlas-mexico-agriculture-label-layout';
interface Marker {id:string;kindId:string;label:string;stateCode:string;municipalityCode:string;point:[number,number];production:number;unit:string;valueMxN:number;sourceUrl:string}
interface Config {crops:{id:string;name:string;color:string}[];cropLabelPoints?:{cropId:string;point:[number,number]}[];livestockKinds:{id:string;label:string;color:string;symbol:string}[];markers:Marker[];states:{code:string;name:string;point:[number,number]}[];naturePath:string;agriculturePath:string;statistics:Record<string,any>}
const hidden=(element:Element|null,value:boolean)=>{if(!element)return;if(value)element.setAttribute('hidden','');else element.removeAttribute('hidden');};
export function initMexicoAgricultureAtlas(root:HTMLElement):void {
 if(root.dataset.agricultureReady==='true')return;
 const payload=root.querySelector('[data-mexico-agriculture-config]');if(!payload?.textContent)return;
 const config=JSON.parse(payload.textContent) as Config;
 let state=readMexicoAgricultureAtlasState(new URL(location.href));
 if(!config.markers.some(marker=>marker.id===state.region))state.region=null;
 
 const q=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const svg=q<SVGSVGElement>('[data-agriculture-map]'),frame=q('[data-map-frame]');
 const panel=q('[data-agri-reading-panel]'),heading=q('#agri-reading-heading'),overview=q('[data-agri-overview]');
 const kinds=new Map(config.livestockKinds.map(kind=>[kind.id,kind]));
 const cropIds=new Set(config.crops.map(crop=>crop.id));
 const cropLabels=Array.from(root.querySelectorAll<SVGTextElement>('[data-crop-label]'));
 const labelAnchors=new Map(cropLabels.map(node=>{
  const sourced=config.cropLabelPoints?.filter(label=>label.cropId===node.dataset.cropLabel).map(label=>label.point)??[];
  return [node.dataset.cropLabel!,sourced.length?sourced:[[Number(node.getAttribute('x')),Number(node.getAttribute('y'))] as [number,number]]];
 }));
 const overviewMarkers:Marker[]=[];
 for(const kind of config.livestockKinds){
  const candidates=config.markers.filter(marker=>marker.kindId===kind.id);
  const clearance=(marker:Marker)=>overviewMarkers.length?Math.min(...overviewMarkers.map(other=>Math.hypot(marker.point[0]-other.point[0],marker.point[1]-other.point[1]))):0;
  candidates.sort((a,b)=>clearance(b)-clearance(a));if(candidates[0])overviewMarkers.push(candidates[0]);
 }
 const overviewMarkerIds=new Set(overviewMarkers.map(marker=>marker.id));

 const text=(selector:string,value:string)=>{const node=root.querySelector(selector);if(node)node.textContent=value;};
 let lastTrigger:HTMLElement|null=null,candidates:Marker[]=[],suppressMapClickUntil=0;
 const pageLinks=new Map(Array.from(root.querySelectorAll<HTMLAnchorElement>('.mexico-fields a')).map(link=>[link,link.href]));
 function syncMainFields(){
  const query=new URL(location.href).searchParams,raw=query.get('state'),code=raw&&/^(0?[1-9]|[12][0-9]|3[0-2])$/.test(raw)?raw.padStart(2,'0'):null;
  const mode=query.get('reading')==='item'?'item':'overview';
  for(const [link,href]of pageLinks){const url=new URL(href);const nationalPopulation=url.pathname.endsWith('/population/');if(code&&!nationalPopulation)url.searchParams.set('state',code);url.searchParams.set('reading',nationalPopulation?'overview':mode);link.href=url.href;}
 }
 for(const type of ['click','auxclick','focusin'])root.addEventListener(type,event=>{if((event.target as Element).closest('.mexico-fields>a'))syncMainFields();},{capture:true});
 function project(point:[number,number]){
  const [x,y,w,h]=agricultureCameraViewBox(state),width=frame.clientWidth,height=frame.clientHeight;
  const scale=Math.min(width/w,height/h),left=(width-w*scale)/2,top=(height-h*scale)/2;
  return {x:left+(point[0]-x)*scale,y:top+(point[1]-y)*scale};
 }
 function renderMarkers(){
  const holder=q('[data-livestock-markers]');
  const visible=state.item!=='pine'&&state.livestock&&(!state.onlyItem||!state.item||kinds.has(state.item));
  hidden(holder,!visible);
  renderAgricultureMarkers({holder,width:frame.clientWidth,height:frame.clientHeight,
   items:visible?config.markers.filter(marker=>marker.kindId===state.item||overviewMarkerIds.has(marker.id)).filter(marker=>!state.onlyItem||!state.item||marker.kindId===state.item).map(region=>({region,point:project(region.point)})):[],
   kinds,selectedKind:state.item,selectedRegion:state.region,
   select:region=>choose(region.kindId,region),candidates:regions=>{candidates=regions;renderCandidates();},
  });
  renderMapLabels();
 }
 function renderMapLabels(){
  const width=frame.clientWidth,height=frame.clientHeight;if(!width||!height)return;
  const frameRect=frame.getBoundingClientRect(),[, ,viewWidth,viewHeight]=agricultureCameraViewBox(state);
  const scale=Math.min(width/viewWidth,height/viewHeight);
  const box=(node:Element):AgricultureLabelBox|null=>{
   const rect=node.getBoundingClientRect();
   return rect.width&&rect.height?{left:rect.left-frameRect.left,top:rect.top-frameRect.top,right:rect.right-frameRect.left,bottom:rect.bottom-frameRect.top}:null;
  };
  const obstacles=Array.from(root.querySelectorAll('[data-agri-layers],.atlas-map-tools,.atlas-layer-caption,.atlas-livestock-marker')).filter(node=>!node.closest('[hidden]')).map(box).filter((value):value is AgricultureLabelBox=>!!value);
  const visible=state.crops&&state.item!=='pine';
  const items=cropLabels.filter(node=>visible&&(!state.onlyItem||!state.item||node.dataset.cropLabel===state.item)).map(node=>{
   const selected=node.dataset.cropLabel===state.item,fontSize=selected?15:width<560?12.5:13.5;
   hidden(node,false);node.style.fontSize=`${fontSize/scale}px`;
   const measured=node.getComputedTextLength?.();
   return {id:node.dataset.cropLabel!,selected,width:(measured&&Number.isFinite(measured)?measured*scale:Array.from(node.textContent??'').length*fontSize)+6,height:fontSize+8,anchors:labelAnchors.get(node.dataset.cropLabel!)!.map(project)};
  });
  const placements=placeMexicoAgricultureLabels(items,width,height,obstacles),byId=new Map(placements.map(item=>[item.id,item]));
  const [vx,vy]=agricultureCameraViewBox(state),left=(width-viewWidth*scale)/2,top=(height-viewHeight*scale)/2;
  const leaders=root.querySelector('[data-mexico-crop-label-leaders]');leaders?.replaceChildren();
  for(const node of cropLabels){
   const placement=byId.get(node.dataset.cropLabel!);hidden(node,!placement);
   if(!placement){delete node.dataset.labelSourceIndex;continue;}
   node.setAttribute('x',String(vx+(placement.x-left)/scale));node.setAttribute('y',String(vy+(placement.y-top)/scale));
   node.dataset.labelSourceIndex=String(placement.anchorIndex);
   if(placement.leader&&leaders){
    const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'line'),point=document.createElementNS(ns,'circle');
    const sx=vx+(placement.sourceX-left)/scale,sy=vy+(placement.sourceY-top)/scale;
    const endX=Math.max(placement.left,Math.min(placement.right,placement.sourceX)),endY=Math.max(placement.top,Math.min(placement.bottom,placement.sourceY));
    for(const [key,value] of Object.entries({x1:sx,y1:sy,x2:vx+(endX-left)/scale,y2:vy+(endY-top)/scale}))line.setAttribute(key,String(value));
    point.setAttribute('cx',String(sx));point.setAttribute('cy',String(sy));point.setAttribute('r',String(2.5/scale));
    for(const element of [line,point])element.style.setProperty('--crop-color',config.crops.find(crop=>crop.id===placement.id)!.color);
    leaders.append(line,point);
   }
  }
  // Crop names take precedence over decorative physical labels. Crop areas and
  // the complete commodity key remain visible regardless of label placement.
  const occupied=[...obstacles,...placements];
  for(const node of root.querySelectorAll<SVGTextElement>('.mexico-agriculture-geography text')){
   hidden(node,false);const rect=box(node);
   const collision=rect&&(rect.left<3||rect.top<3||rect.right>width-3||rect.bottom>height-3||occupied.some(other=>agricultureLabelIntersects(rect,other,2)));
   hidden(node,!!collision);if(rect&&!collision)occupied.push(rect);
  }
 }
 function renderCandidates(){
  const box=q('[data-agri-candidates]');box.replaceChildren();hidden(box,!candidates.length);
  if(!candidates.length)return;
  hidden(overview,true);hidden(panel,false);heading.textContent='重なっている畜産の産地';
  for(const copy of root.querySelectorAll('[data-agriculture-reading]'))hidden(copy,true);
  hidden(q('[data-mexico-region-reading]'),true);
  for(const region of candidates){const button=document.createElement('button');button.type='button';button.textContent=`${mexicoAgricultureLabel(region.kindId)}：${region.label}`;button.addEventListener('click',()=>choose(region.kindId,region));box.append(button);}
 }
 function render(){
  const selected=!!state.item,forestry=state.item==='pine',cropSelected=!!state.item&&cropIds.has(state.item),animalSelected=!!state.item&&kinds.has(state.item);
  root.dataset.mexicoReadingSelected=String(selected);root.dataset.agriReading=forestry?'forestry':selected?'product':'overview';
  root.dataset.agricultureCurrentItem=state.item??'';root.dataset.agricultureCurrentState=state.state??'';
  root.dataset.agricultureCrops=String(state.crops);root.dataset.agricultureLivestock=String(state.livestock);
  hidden(overview,selected);hidden(panel,!selected);heading.textContent=state.item?mexicoAgricultureLabel(state.item):'';
  for(const copy of root.querySelectorAll<HTMLElement>('[data-agriculture-reading]'))hidden(copy,copy.dataset.agricultureReading!==state.item);
  for(const input of root.querySelectorAll<HTMLInputElement>('[data-agri-layer]'))input.checked=input.value==='crops'?state.crops:state.livestock;
  const cropVisible=state.crops&&!forestry&&(!state.onlyItem||!state.item||cropSelected);
  hidden(q('[data-mexico-crop-zones]'),!cropVisible);hidden(q('[data-mexico-crop-labels]'),!cropVisible);
  for(const node of root.querySelectorAll<HTMLElement|SVGElement>('[data-crop-zone]')){
   const id=node.getAttribute('data-crop-zone');node.classList.toggle('is-selected',id===state.item);node.classList.toggle('is-muted',cropSelected&&id!==state.item);
   if(node.tagName.toLowerCase()==='text')node.setAttribute('aria-pressed',String(id===state.item));else node.removeAttribute('aria-pressed');
   hidden(node,cropVisible&&state.onlyItem&&!!state.item&&id!==state.item);
  }
  hidden(q('[data-agri-layers]'),forestry);hidden(q('[data-mexico-tree-cover]'),!forestry);
  for(const link of root.querySelectorAll<HTMLAnchorElement>('[data-crop-select],[data-livestock-select],[data-forestry-select]')){
   const id=link.dataset.cropSelect??link.dataset.livestockSelect??'pine';
   if(state.item===id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');
   link.setAttribute('aria-controls','agri-reading-heading');
   link.href=writeMexicoAgricultureAtlasState(new URL(location.href),{...state,item:id,state:null,region:null}).href;
  }
  const warning=(cropSelected&&!state.crops)||(animalSelected&&!state.livestock);
  hidden(q('[data-agri-layer-warning]'),!warning);
  hidden(q('[data-mexico-agriculture-statistics]'),!selected);
  text('[data-mexico-statistics-heading]',state.item?`${mexicoAgricultureLabel(state.item)}の統計`:'全国と州の統計');
  for(const stats of root.querySelectorAll<HTMLElement>('[data-mexico-stat-panel]'))hidden(stats,stats.dataset.mexicoStatPanel!==state.item);
  q<HTMLSelectElement>('[data-agriculture-state]').value=selected?state.state??'':'';
  q<HTMLInputElement>('[data-mexico-only-item]').checked=state.onlyItem;
  for(const node of root.querySelectorAll<HTMLElement>('[data-agriculture-pick]'))node.setAttribute('aria-pressed',String(node.dataset.agriculturePick===state.state));
  for(const row of root.querySelectorAll<HTMLElement>('[data-agriculture-stat-row]'))row.classList.toggle('is-selected',row.dataset.agricultureStatRow===state.state);
  const region=config.markers.find(marker=>marker.id===state.region);
  hidden(q('[data-mexico-region-reading]'),!selected||(!region&&!state.state));
  if(region){
   text('[data-mexico-region-heading]','選択した市町村の産地');
   text('[data-mexico-region-scope]','市町村全体の年間生産統計。記号は自治体庁所在地に置き、個別の農場・施設の位置を表していません。');
   text('[data-mexico-region-name]',`${region.label}（${config.states.find(s=>s.code===region.stateCode)?.name??region.stateCode}）`);
   text('[data-mexico-region-production]',`2025年 ${mexicoAgricultureLabel(region.kindId)}：${region.production.toLocaleString('ja-JP',{maximumFractionDigits:0})} ${region.unit}`);
  }else if(selected&&state.state){
   text('[data-mexico-region-heading]','選択した州');
   text('[data-mexico-region-scope]','州全体の公表値です。地図は主要栽培域・産地の分布で、この州の統計値の区域を強調しません。');
   const row=config.statistics[state.item??'corn']?.rows.find((row:any)=>row.code===state.state);
   text('[data-mexico-region-name]',config.states.find(s=>s.code===state.state)?.name??state.state);
   text('[data-mexico-region-production]',row?`${config.statistics[state.item??'corn'].year}：${row.production===null?'数量は単純合算しません':row.production.toLocaleString('ja-JP',{maximumFractionDigits:1})+' '+config.statistics[state.item??'corn'].unit}`:'');
  }
  for(const link of root.querySelectorAll<HTMLAnchorElement>('[data-agriculture-nature-comparison]')){
   const id=link.dataset.agricultureNatureComparison!,metric=id==='corn'?'maize':id;
   const code=state.state??(id==='pine'?'10':id==='cattle'?'30':'25');
   const url=new URL(config.naturePath,location.origin);
   for(const [key,value]of Object.entries({compare:'irrigation',from:'agriculture',state:code,sourceState:code,sourceMetric:metric,sourceOnly:'0',sourceFallback:'0',sourceCrops:state.crops?'1':'0',sourceLivestock:state.livestock?'1':'0',sourceOnlyItem:state.onlyItem?'1':'0',sourceAgriItem:id,sourceAgriState:state.state??'none',sourceAgriCamera:[state.x,state.y,state.zoom].join(','),reading:'item'}))url.searchParams.set(key,value);
   link.href=url.href;
  }
  syncMainFields();
  svg.classList.toggle('is-zoomed',state.zoom>1);
  svg.setAttribute('viewBox',agricultureCameraViewBox(state).map(value=>value.toFixed(2)).join(' '));
  text('[data-mexico-map-note]',forestry?'緑は2021年の樹木被覆。松材取得量の多いドゥランゴ・チワワなどの州別数量は統計で確認できます。樹木被覆は松林・伐採区域の境界ではありません。':'作物は推計主要栽培域、畜産は生産の多い市町村の代表位置。記号の大きさは数量を表しません。');
  text('#mexico-agriculture-map-title',forestry?'メキシコの樹木被覆と森林資源':'メキシコの主要栽培域と畜産の産地');
  text('[data-layer-caption]',forestry?'樹木被覆2021・州別松材統計2022':state.item==='irrigation'?'主要栽培域と地形・河川 / 灌漑率は統計で確認':'作物 2020推計・畜産産地 2025（概略）');
  q<HTMLButtonElement>('[data-map-action="out"]').disabled=state.zoom<=1;
  q<HTMLButtonElement>('[data-map-action="in"]').disabled=state.zoom>=5;
  renderMarkers();renderCandidates();root.dataset.agricultureReady='true';root.dataset.renderState='ready';
 }
 function save(push=true){state={...state,...normalizeMexicoAgricultureCamera(state)};const url=writeMexicoAgricultureAtlasState(new URL(location.href),state);if(url.href!==location.href){if(push)history.pushState(null,'',url);else history.replaceState(null,'',url);}render();}
 function choose(id:string,region?:Marker){
  if(!config.statistics[id]&&!root.querySelector(`[data-agriculture-reading="${id}"]`))return;
  candidates=[];state={...state,item:id,state:region?.stateCode??null,region:region?.id??null};save();
  q('[data-agri-reading-body]').scrollTop=0;
  text('[data-atlas-live]',`${mexicoAgricultureLabel(id)}の解説を表示しました。`);
  if(!matchMedia('(min-width:960px) and (min-height:600px)').matches){heading.scrollIntoView({block:'start',behavior:'instant'});heading.focus({preventScroll:true});}
 }
 function back(){candidates=[];state={...state,item:null,region:null,onlyItem:false};save();text('[data-atlas-live]','メキシコの農林業を表示しました。');if(lastTrigger?.isConnected)lastTrigger.focus({preventScroll:true});}
 root.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
  const target=event.target as Element;
  const link=target.closest<HTMLElement>('[data-crop-select],[data-livestock-select],[data-forestry-select],[data-mexico-agriculture-item]');
  if(link){event.preventDefault();lastTrigger=link;choose(link.dataset.cropSelect??link.dataset.livestockSelect??link.dataset.mexicoAgricultureItem??'pine');return;}
  const zone=target.closest<SVGElement>('text[data-crop-zone]');if(zone&&Date.now()<suppressMapClickUntil){event.preventDefault();return;}if(zone){event.preventDefault();choose(zone.dataset.cropZone!);return;}
  const pick=target.closest<HTMLElement>('[data-agriculture-pick]');if(pick){state={...state,state:pick.dataset.agriculturePick!,region:null};save();return;}
 });
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&(state.item||candidates.length)){event.preventDefault();back();return;}
  if(['Enter',' '].includes(event.key)){const zone=(event.target as Element).closest<SVGElement>('text[data-crop-zone]');if(zone){event.preventDefault();choose(zone.dataset.cropZone!);}}
 });
 q('[data-agri-overview-button]').addEventListener('click',back);
 for(const input of root.querySelectorAll<HTMLInputElement>('[data-agri-layer]'))input.addEventListener('change',()=>{state={...state,[input.value]:input.checked};save();});
 q('[data-agri-enable-layers]').addEventListener('click',()=>{if(state.item&&cropIds.has(state.item))state.crops=true;else state.livestock=true;save();});
 q<HTMLInputElement>('[data-mexico-only-item]').addEventListener('change',event=>{state.onlyItem=(event.target as HTMLInputElement).checked;save();});
 q<HTMLSelectElement>('[data-agriculture-state]').addEventListener('change',event=>{state.state=(event.target as HTMLSelectElement).value||null;if(!state.item&&state.state)state.item='corn';state.region=null;save();});
 for(const button of root.querySelectorAll<HTMLButtonElement>('[data-map-action]'))button.addEventListener('click',()=>{
  if(button.dataset.mapAction==='fit'){state={...state,zoom:1,x:450,y:290};}
  else state.zoom=Math.max(1,Math.min(5,state.zoom*(button.dataset.mapAction==='in'?1.35:1/1.35)));
  save();
 });
 let drag:{x:number;y:number;initial:MexicoAgricultureAtlasState;moved:boolean;pointerId:number}|null=null;
 svg.addEventListener('pointerdown',event=>{if(event.button!==0||state.zoom<=1)return;drag={x:event.clientX,y:event.clientY,initial:{...state},moved:false,pointerId:event.pointerId};});
 svg.addEventListener('pointermove',event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)<5)return;drag.moved=true;svg.setPointerCapture?.(event.pointerId);svg.classList.add('is-panning');const scale=Math.min(frame.clientWidth/900,frame.clientHeight/580)*state.zoom;state.x=Math.max(0,Math.min(900,drag.initial.x-dx/scale));state.y=Math.max(0,Math.min(580,drag.initial.y-dy/scale));state={...state,...normalizeMexicoAgricultureCamera(state)};drag.initial={...state};drag.x=event.clientX;drag.y=event.clientY;svg.setAttribute('viewBox',agricultureCameraViewBox(state).join(' '));renderMarkers();});
 const endDrag=()=>{if(!drag)return;const moved=drag.moved;drag=null;svg.classList.remove('is-panning');if(moved){suppressMapClickUntil=Date.now()+300;save();}};
 svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
 window.addEventListener('popstate',()=>{state=readMexicoAgricultureAtlasState(new URL(location.href));candidates=[];render();});
 window.addEventListener('hashchange',()=>{state=readMexicoAgricultureAtlasState(new URL(location.href));candidates=[];save(false);});
 const fitPanel=()=>{const height=q('.atlas-map-column').getBoundingClientRect().height;if(height>0)panel.style.setProperty('--agri-map-height',`${Math.round(height)}px`);renderMarkers();};
 if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitPanel).observe(frame);window.addEventListener('resize',fitPanel);
 document.fonts?.ready.then(fitPanel);
 save(false);requestAnimationFrame(fitPanel);
}
