import { readAtlasState, writeAtlasState, type MapField, type ViewMode } from '../lib/atlas-state';
import { chooseCardPlacement, type Rect } from '../lib/atlas-card-placement';
import type { Map as LibreMap } from 'maplibre-gl';
import { createAtlasStyle, setFieldLayers } from '../lib/atlas-style';

type RegionalCopy = {
  id:string; cropIds:string[]; title:string; summary:string; compactSummary:string;
  bounds:[number,number,number,number]; detailCrop:string;
};
type LivestockRegion={id:string;kindId:string;label:string;anchor:[number,number];summary:string};

export async function startAtlas() {
  const root=document.querySelector<HTMLElement>('[data-atlas-explorer]');
  if(!root || root.dataset.initialized) return;
  root.dataset.initialized='true'; root.dataset.enhanced='true'; root.dataset.renderState='loading';
  const config=JSON.parse(root.querySelector('[data-explorer-config]')!.textContent!);
  const el=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const frame=el('[data-map-frame]'), fallback=el('[data-fallback]'), surface=el('[data-map-surface]');
  const selection=el('[data-selection]'), selectionSlot=el('[data-selection-slot]');
  const initial=readAtlasState(new URL(location.href),config.initialField);
  let field:MapField=initial.field, map:LibreMap|undefined, selected:string|null=null, selectedRegion:string|null=null;
  let selectedAnimal:string|null=initial.animal,selectedAnimalRegion:string|null=initial.animalRegion,agriLayers=new Set<string>(initial.agriLayers);
  let selectedStats:string=initial.stats, view:ViewMode=initial.view, failed=false, ready=false, restoring=false, suppressNextMove=false;
  let labels:any[]=[]; let currentCopy:{full:string;compact:string}|null=null; let selectedCoordinate:[number,number]|null=null;
  const allCrops=new Map<string,any>(config.crops.map((crop:any)=>[crop.id,crop]));
  const allRegions=new Map<string,RegionalCopy>(config.regionalInsights.map((region:RegionalCopy)=>[region.id,region]));
  const allLivestockRegions=new Map<string,LivestockRegion>(config.livestockRegions.map((r:LivestockRegion)=>[r.id,r])),allLivestockKinds=new Map<string,any>(config.livestockKinds.map((k:any)=>[k.id,k]));
  const status=el('[data-fallback-status]');
  const criticalController=new AbortController();
  let timeout:number;

  function save(push=false) {
    if(restoring)return;
    const center=map?.getCenter();
    const camera=center?{lng:center.lng,lat:center.lat,zoom:map!.getZoom()}:initial.camera??undefined;
    const url=writeAtlasState(new URL(location.href),config.base,field,camera,selected,selectedRegion,selectedStats,view,[...agriLayers] as any,selectedAnimal,selectedAnimalRegion);
    if(config.reviewMode){url.pathname=config.base+'review/';url.searchParams.set('field',field);}
    history[push?'pushState':'replaceState']({},'',url);
  }

  function updateStats(id:string, saveUrl=true) {
    if(!config.statisticCropIds.includes(id))return;
    selectedStats=id;
    root.querySelectorAll<HTMLButtonElement>('[data-stat-select]').forEach(button=>{
      const active=button.dataset.statSelect===id;
      button.setAttribute('aria-selected',String(active)); button.tabIndex=active?0:-1;
    });
    root.querySelectorAll<HTMLElement>('[data-stat-panel]').forEach(panel=>panel.hidden=panel.dataset.statPanel!==id);
    if(saveUrl)save();
  }

  function moveSelectionBelow() {
    selection.classList.add('atlas-selection--below');
    selection.removeAttribute('data-placement');
    selection.style.removeProperty('left'); selection.style.removeProperty('top'); selection.style.removeProperty('visibility');
    selectionSlot.appendChild(selection);
    if(currentCopy)el('[data-selection-text]').textContent=currentCopy.compact;
  }

  function localRect(node:Element):Rect {
    const a=node.getBoundingClientRect(),b=frame.getBoundingClientRect();
    return {left:a.left-b.left-5,top:a.top-b.top-5,right:a.right-b.left+5,bottom:a.bottom-b.top+5};
  }

  function selectedRegionRect():Rect|null {
    const region=selectedRegion?allRegions.get(selectedRegion):null;
    if(region&&map){
      const [west,south,east,north]=region.bounds;
      const points=[[west,south],[west,north],[east,south],[east,north]].map(point=>map!.project(point as [number,number]));
      return {left:Math.min(...points.map(point=>point.x))-8,top:Math.min(...points.map(point=>point.y))-8,right:Math.max(...points.map(point=>point.x))+8,bottom:Math.max(...points.map(point=>point.y))+8};
    }
    if(!selectedCoordinate||!map)return null;
    const point=map.project(selectedCoordinate);
    return {left:point.x-45,top:point.y-45,right:point.x+45,bottom:point.y+45};
  }

  function placeSelectionCard() {
    if(selection.hidden)return;
    if(!ready||!map||failed||!selectedCoordinate){moveSelectionBelow();return;}
    frame.appendChild(selection); selection.classList.remove('atlas-selection--below');
    selection.style.left='0';selection.style.top='0';selection.style.visibility='hidden';
    el('[data-selection-text]').textContent=frame.clientWidth<650&&currentCopy?currentCopy.compact:currentCopy?.full??'';
    const protectedRects:Rect[]=[];
    const target=selectedRegionRect();if(target)protectedRects.push(target);
    for(const node of root.querySelectorAll<HTMLElement>('.atlas-map-tools,[data-agri-layers],[data-layer-caption],.atlas-geolabel:not([hidden]),.atlas-livestock-marker[aria-pressed="true"]'))protectedRects.push(localRect(node));
    const result=chooseCardPlacement(
      {width:frame.clientWidth,height:frame.clientHeight},
      {width:selection.offsetWidth,height:selection.offsetHeight},
      protectedRects,
      frame.clientWidth<650?6:9
    );
    if(!result){moveSelectionBelow();return;}
    selection.dataset.placement=result.id;selection.style.left=`${result.left}px`;selection.style.top=`${result.top}px`;selection.style.visibility='visible';
  }

  function closeSelection(saveUrl=true) {
    selected=null;selectedRegion=null;selectedAnimal=null;selectedAnimalRegion=null;selectedCoordinate=null;currentCopy=null;selection.hidden=true;
    frame.appendChild(selection);selection.classList.remove('atlas-selection--below');selection.style.removeProperty('left');selection.style.removeProperty('top');selection.style.removeProperty('visibility');
    root.querySelectorAll('[data-crop-select]').forEach(node=>node.removeAttribute('aria-current'));
    el('[data-selection-candidates]').hidden=true;el('[data-selection-candidates]').replaceChildren();renderLivestockMarkers();
    if(saveUrl)save();
  }

  function regionFor(cropId:string, longitude?:number, latitude?:number, requested?:string|null) {
    const normalized=cropId==='corn-soybean'?['corn','soybean']:[cropId];
    if(requested){const saved=allRegions.get(requested);if(saved?.cropIds.some(crop=>normalized.includes(crop)))return saved;}
    if(longitude===undefined||latitude===undefined)return null;
    return config.regionalInsights
      .filter((region:RegionalCopy)=>region.cropIds.some(crop=>normalized.includes(crop)))
      .filter((region:RegionalCopy)=>longitude>=region.bounds[0]&&longitude<=region.bounds[2]&&latitude>=region.bounds[1]&&latitude<=region.bounds[3])
      .sort((left:RegionalCopy,right:RegionalCopy)=>(left.bounds[2]-left.bounds[0])*(left.bounds[3]-left.bounds[1])-(right.bounds[2]-right.bounds[0])*(right.bounds[3]-right.bounds[1]))[0]??null;
  }

  function selectCrop(id:string, longitude?:number, latitude?:number, requestedRegion?:string|null, saveUrl=true) {
    const crop=id==='corn-soybean'?{name:'とうもろこし・大豆の重なり',summary:'近い地域で両方の作物がまとまります。この図だけでは、同じ畑の輪作や同時栽培は判定できません。'}:allCrops.get(id);
    if(!crop)return;
    const region=regionFor(id,longitude,latitude,requestedRegion);
    selected=id;selectedRegion=region?.id??null;selectedAnimal=null;selectedAnimalRegion=null;
    if(longitude!==undefined&&latitude!==undefined)selectedCoordinate=[longitude,latitude];
    else if(region){const [west,south,east,north]=region.bounds;selectedCoordinate=[(west+east)/2,(south+north)/2];}
    else selectedCoordinate=null;
    currentCopy={full:region?.summary??crop.summary,compact:region?.compactSummary??crop.summary};
    el('[data-selection-title]').textContent=region?.title??crop.name;
    el('[data-selection-text]').textContent=currentCopy.full;
    el('[data-selection-candidates]').hidden=true;el('[data-selection-candidates]').replaceChildren();
    const detailCrop=region?.detailCrop??(id==='corn-soybean'?'corn':id);
    el<HTMLAnchorElement>('[data-selection-link]').href=config.statisticCropIds.includes(detailCrop)?'#crop-details':'#atlas-method';
    el('[data-selection-link]').textContent=config.statisticCropIds.includes(detailCrop)?'↓ 作物の詳説へ':'↓ 表示方法へ';
    if(config.statisticCropIds.includes(detailCrop))updateStats(detailCrop,false);
    root.querySelectorAll<HTMLElement>('[data-crop-select]').forEach(node=>{
      if(node.dataset.cropSelect===id)node.setAttribute('aria-current','true');else node.removeAttribute('aria-current');
    });
    selection.hidden=false;renderLivestockMarkers();placeSelectionCard();
    if(saveUrl)save();
  }

  function selectLivestock(regionId:string,saveUrl=true){const region=allLivestockRegions.get(regionId);if(!region)return;const kind=allLivestockKinds.get(region.kindId);if(!kind)return;selected=null;selectedRegion=null;selectedAnimal=region.kindId;selectedAnimalRegion=region.id;selectedCoordinate=region.anchor;currentCopy={full:region.summary,compact:region.summary};el('[data-selection-title]').textContent=`${region.label}の${kind.label}`;el('[data-selection-text]').textContent=currentCopy.full;el('[data-selection-candidates]').hidden=true;el('[data-selection-candidates]').replaceChildren();el<HTMLAnchorElement>('[data-selection-link]').href=`#livestock-${region.kindId}`;el('[data-selection-link]').textContent='↓ 畜産の詳説へ';root.querySelectorAll('[data-crop-select]').forEach(n=>n.removeAttribute('aria-current'));selection.hidden=false;renderLivestockMarkers();placeSelectionCard();if(saveUrl)save();}

  function showLivestockCandidates(regions:LivestockRegion[],coordinate:[number,number]){selected=null;selectedRegion=null;selectedAnimal=null;selectedAnimalRegion=null;selectedCoordinate=coordinate;currentCopy={full:'同じ範囲に複数の畜産地域があります。読みたい対象を選んでください。',compact:'複数の対象があります。'};el('[data-selection-title]').textContent='重なっている畜産';el('[data-selection-text]').textContent=currentCopy.full;const holder=el('[data-selection-candidates]');holder.replaceChildren();holder.hidden=false;for(const region of regions){const kind=allLivestockKinds.get(region.kindId),button=document.createElement('button');button.type='button';button.textContent=`${kind.symbol} ${region.label}・${kind.label}`;button.addEventListener('click',()=>selectLivestock(region.id));holder.appendChild(button);}el<HTMLAnchorElement>('[data-selection-link]').href='#livestock-details';el('[data-selection-link]').textContent='↓ 畜産の詳説へ';selection.hidden=false;placeSelectionCard();}

  function renderLivestockMarkers(){const holder=el('[data-livestock-markers]');holder.replaceChildren();if(!ready||!map||field!=='agriculture'||!agriLayers.has('livestock'))return;const visible=config.livestockRegions.map((region:LivestockRegion)=>({region,point:map!.project(region.anchor)})).filter(({point}:any)=>point.x>=20&&point.y>=20&&point.x<=frame.clientWidth-20&&point.y<=frame.clientHeight-20),groups:{regions:LivestockRegion[];points:any[]}[]=[],distance=frame.clientWidth<650?58:48;for(const item of visible){const found=groups.find(g=>Math.hypot(g.points[0].x-item.point.x,g.points[0].y-item.point.y)<distance);if(found){found.regions.push(item.region);found.points.push(item.point);}else groups.push({regions:[item.region],points:[item.point]});}for(const group of groups){const button=document.createElement('button');button.type='button';button.className='atlas-livestock-marker';const x=group.points.reduce((s,p)=>s+p.x,0)/group.points.length,y=group.points.reduce((s,p)=>s+p.y,0)/group.points.length;button.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px) translate(-50%,-50%)`;if(group.regions.length===1){const region=group.regions[0],kind=allLivestockKinds.get(region.kindId);button.style.setProperty('--livestock-color',kind.color);button.innerHTML=`<i aria-hidden="true">${kind.symbol}</i><span>${kind.label}</span>`;button.setAttribute('aria-label',`${region.label}の${kind.label}`);button.setAttribute('aria-pressed',String(selectedAnimalRegion===region.id));button.addEventListener('click',e=>{e.stopPropagation();selectLivestock(region.id);});}else{button.classList.add('is-cluster');button.innerHTML=`<i aria-hidden="true">${group.regions.length}</i><span>畜産</span>`;button.setAttribute('aria-label',`${group.regions.length}件の畜産地域を選ぶ`);button.addEventListener('click',e=>{e.stopPropagation();const p=map!.unproject([x,y]);showLivestockCandidates(group.regions,[p.lng,p.lat]);});}holder.appendChild(button);}}

  function updateFallbackImage(){const image=el<HTMLImageElement>('[data-fallback-image]'),overlay=el<HTMLImageElement>('[data-fallback-livestock]'),link=el<HTMLAnchorElement>('[data-fallback-full]');const showCrops=field==='agriculture'&&agriLayers.has('crops'),showLivestock=field==='agriculture'&&agriLayers.has('livestock');const src=config.assetBase+(showCrops?'agriculture':'land')+'-fallback.webp';image.src=src;image.alt=showCrops?'米国本土の地形・河川と主要作物の栽培域の概略図。':'米国本土の地形と水系。';overlay.hidden=!showLivestock;overlay.src=config.livestockAssetBase+(showCrops?'agriculture-livestock':'livestock')+'-fallback.svg';link.href=src;}

  function syncAgricultureLayers(saveUrl=true){root.querySelectorAll<HTMLInputElement>('[data-agri-layer]').forEach(input=>input.checked=agriLayers.has(input.value));if(ready&&map)setFieldLayers(map,field,agriLayers.has('crops'));updateFallbackImage();el('[data-livestock-key]').hidden=!agriLayers.has('livestock');renderLivestockMarkers();renderLabels();if((selected&&!agriLayers.has('crops'))||(selectedAnimal&&!agriLayers.has('livestock')))closeSelection(false);if(saveUrl)save();}

  function setField(next:MapField,push=false) {
    field=next;root.dataset.field=field;
    root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(link=>{
      if(link.dataset.field===field)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    root.querySelectorAll<HTMLElement>('[data-field-content]').forEach(section=>section.hidden=!section.dataset.fieldContent!.split(' ').includes(field));
    root.querySelectorAll<HTMLElement>('[data-field-national]').forEach(section=>section.hidden=!section.dataset.fieldNational!.split(' ').includes(field));
    el('[data-crop-key]').hidden=field!=='agriculture';el('[data-land-key]').hidden=field==='agriculture';el('[data-agri-layers]').hidden=field!=='agriculture';updateFallbackImage();
    el('[data-layer-caption]').textContent=field==='agriculture'?'作物 2023 · 畜産 2022（概略）':'地形・水系';
    closeSelection(false);
    if(ready&&map){setFieldLayers(map,field,agriLayers.has('crops'));renderLabels();renderLivestockMarkers();}
    if(push)save(true);
  }

  function fail(message:string) {
    if(failed)return;failed=true;ready=false;clearTimeout(timeout);criticalController.abort();
    root.dataset.renderState='fallback';fallback.hidden=false;surface.hidden=true;
    el('[data-map-labels]').hidden=true;el('[data-livestock-markers]').hidden=true;el('.atlas-map-tools').hidden=true;
    status.textContent=message+'（代替図）';map?.remove();map=undefined;
    if(selection.hidden){if(initial.animalRegion)selectLivestock(initial.animalRegion,false);else if(initial.crop)selectCrop(initial.crop,undefined,undefined,initial.region,false);}
    if(!selection.hidden)moveSelectionBelow();
  }

  root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(link=>link.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();setField(link.dataset.field as MapField,true);
  }));
  root.querySelectorAll<HTMLAnchorElement>('[data-crop-select]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();agriLayers.add('crops');syncAgricultureLayers(false);selectCrop(link.dataset.cropSelect!);
  }));
  root.querySelectorAll<HTMLInputElement>('[data-agri-layer]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)agriLayers.add(input.value);else agriLayers.delete(input.value);syncAgricultureLayers();}));
  root.querySelectorAll<HTMLButtonElement>('[data-stat-select]').forEach(button=>{
    button.addEventListener('click',()=>updateStats(button.dataset.statSelect!));
    button.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();const buttons=[...root.querySelectorAll<HTMLButtonElement>('[data-stat-select]')];
      const next=(buttons.indexOf(button)+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();updateStats(buttons[next].dataset.statSelect!);
    });
  });
  el('[data-close-selection]').addEventListener('click',()=>closeSelection());
  el('[data-selection-link]').addEventListener('click',()=>{
    if(config.statisticCropIds.includes(selectedStats))updateStats(selectedStats,false);
    const target=(el<HTMLAnchorElement>('[data-selection-link]').getAttribute('href')||'#crop-details').slice(1);document.getElementById(target)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape')closeSelection();});
  updateStats(selectedStats,false);setField(field);
  timeout=window.setTimeout(()=>fail('地図データの読み込みが完了しませんでした。'),25000);

  function renderLabels() {
    if(!map||!ready)return;
    const width=frame.clientWidth,height=frame.clientHeight,occupied:number[][]=[];
    for(const item of labels){
      const node=item.node as HTMLElement;
      if(item.kind==='crop'&&(field!=='agriculture'||!agriLayers.has('crops'))){node.hidden=true;continue;}
      const point=map.project([item.lng,item.lat]);node.hidden=false;
      const nodeWidth=node.offsetWidth,nodeHeight=node.offsetHeight;
      const rect=[point.x-nodeWidth/2,point.y-nodeHeight/2,point.x+nodeWidth/2,point.y+nodeHeight/2];
      const outside=rect[0]<5||rect[1]<28||rect[2]>width-5||rect[3]>height-5;
      const tools=rect[2]>width-54&&rect[1]<150;
      const collide=occupied.some(other=>rect[0]<other[2]+5&&rect[2]>other[0]-5&&rect[1]<other[3]+3&&rect[3]>other[1]-3);
      node.hidden=outside||tools||collide;
      if(!node.hidden){node.style.transform=`translate(${Math.round(point.x-nodeWidth/2)}px,${Math.round(point.y-nodeHeight/2)}px)`;occupied.push(rect);}
    }
  }

  try {
    const fetchJson=async(name:string)=>{
      const testMissing=config.reviewMode&&new URL(location.href).searchParams.get('qa')==='asset-error'&&name==='manifest.json';
      const response=await fetch(config.assetBase+(testMissing?'qa-missing-manifest.json':name),{signal:criticalController.signal});
      if(!response.ok)throw new Error(name+': '+response.status);return response.json();
    };
    const [lib,manifest,base,crops,land,stateLabels,cropLabels]=await Promise.all([
      import('maplibre-gl'),fetchJson('manifest.json'),fetchJson('base.geojson'),fetchJson('agriculture.geojson'),fetchJson('land.geojson'),fetchJson('labels.json'),fetchJson('crop-labels.json')
    ]);
    if(failed)return;
    const style=createAtlasStyle(config,manifest,base,crops,land);
    lib.setWorkerCount(1);
    map=new lib.Map({container:surface,style,attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,pitchWithRotate:false,rollEnabled:false,maxPitch:0,maxZoom:7,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),bounds:manifest.fitBounds,fitBoundsOptions:{padding:{top:30,bottom:14,left:12,right:12}},maxBounds:[[-137,16],[-56,58]],refreshExpiredTiles:false,fadeDuration:0});
    map.touchZoomRotate.disableRotation();map.scrollZoom.disable();
    if(initial.camera&&initial.view==='custom')map.jumpTo({center:[initial.camera.lng,initial.camera.lat],zoom:initial.camera.zoom});
    surface.addEventListener('webglcontextlost',()=>fail('この端末の地図描画が停止しました。'),true);
    map.on('error',event=>{console.error('Atlas data/render error',event.error?.message);fail('地図の描画またはデータの読み込みに失敗しました。');});
    map.once('load',()=>{
      if(failed||!map)return;
      ready=true;clearTimeout(timeout);root.dataset.renderState='ready';fallback.hidden=true;el('[data-livestock-markers]').hidden=false;el('.atlas-map-tools').hidden=false;
      const size=12,rgba=new Uint8Array(size*size*4);
      for(let row=0;row<size;row++)for(let column=0;column<size;column++){const index=(row*size+column)*4;rgba.set((column+row)%size<3?[169,139,38,165]:[0,0,0,0],index);}
      map.addImage('overlap-stripe',{width:size,height:size,data:rgba});map.setPaintProperty('crops-overlap','fill-pattern','overlap-stripe');
      labels=[...cropLabels,...config.geographicLabels,...stateLabels].sort((left,right)=>left.priority-right.priority);
      const labelParent=el('[data-map-labels]');
      for(const item of labels){const node=document.createElement('span');node.className='atlas-geolabel atlas-geolabel--'+item.kind;node.textContent=item.name;node.hidden=true;if(item.color)node.style.setProperty('--label-color',item.color);labelParent.appendChild(node);item.node=node;}
      setField(field);updateStats(initial.stats,false);syncAgricultureLayers(false);
      if(initial.animalRegion)selectLivestock(initial.animalRegion,false);else if(initial.crop)selectCrop(initial.crop,undefined,undefined,initial.region,false);
      renderLabels();placeSelectionCard();save();
      map.on('move',()=>{renderLabels();renderLivestockMarkers();if(!selection.hidden&&selection.parentElement===frame)selection.style.visibility='hidden';});
      map.on('moveend',()=>{
        if(!suppressNextMove)view='custom';else suppressNextMove=false;
        renderLabels();renderLivestockMarkers();placeSelectionCard();save();
      });
      map.on('click',event=>{
        if(field==='agriculture'){
          if(!agriLayers.has('crops')){closeSelection();return;}
          const features=map!.queryRenderedFeatures([[event.point.x-6,event.point.y-6],[event.point.x+6,event.point.y+6]],{layers:['crops-fill','crops-overlap']});
          const feature=features.find(item=>item.properties.id==='corn-soybean')??features[0];
          if(feature)selectCrop(feature.properties.id,event.lngLat.lng,event.lngLat.lat);else closeSelection();
        }else{
          const features=map!.queryRenderedFeatures(event.point,{layers:['land-picking']}).sort((left,right)=>left.properties.area-right.properties.area);
          if(!features.length){closeSelection();return;}
          selected=null;selectedRegion=null;selectedCoordinate=[event.lngLat.lng,event.lngLat.lat];currentCopy={full:'Natural Earthの地誌的な地域区分です。土壌や地質の境界ではありません。農業へ切り替えると、同じ位置で栽培域を比べられます。',compact:'地誌的な概略区分です。土壌・地質の境界ではありません。'};
          el('[data-selection-title]').textContent=features[0].properties.name;el('[data-selection-text]').textContent=currentCopy.full;
          el<HTMLAnchorElement>('[data-selection-link]').href='#land-conditions';el('[data-selection-link]').textContent='↓ 土地の解説へ';selection.hidden=false;placeSelectionCard();save();
        }
      });
      root.querySelectorAll<HTMLButtonElement>('[data-map-action]').forEach(button=>button.addEventListener('click',()=>{
        if(!map)return;closeSelection(false);
        if(button.dataset.mapAction==='fit'){view='fit';suppressNextMove=true;map.fitBounds(manifest.fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});}
        if(button.dataset.mapAction==='in'){view='custom';map.zoomIn({duration:0});}
        if(button.dataset.mapAction==='out'){view='custom';map.zoomOut({duration:0});}
      }));
      let lastWidth=frame.clientWidth,lastHeight=frame.clientHeight;
      new ResizeObserver(()=>{
        if(!map||failed)return;
        const width=frame.clientWidth,height=frame.clientHeight;if(width===lastWidth&&height===lastHeight)return;
        lastWidth=width;lastHeight=height;map.resize();
        if(view==='fit'){suppressNextMove=true;map.fitBounds(manifest.fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});}
        else{renderLabels();renderLivestockMarkers();placeSelectionCard();}
      }).observe(frame);
      if(config.reviewMode)window.addEventListener('message',event=>{
        if(event.origin!==location.origin||event.source!==parent||event.data!=='atlas-qa-lose-context'||!map)return;
        map.getCanvas().getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
      });
    });
    window.addEventListener('popstate',()=>{
      restoring=true;const state=readAtlasState(new URL(location.href),config.initialField);view=state.view;agriLayers=new Set(state.agriLayers);setField(state.field);updateStats(state.stats,false);syncAgricultureLayers(false);
      if(state.camera&&map&&state.view==='custom')map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});
      if(state.animalRegion)selectLivestock(state.animalRegion,false);else if(state.crop)selectCrop(state.crop,undefined,undefined,state.region,false);restoring=false;
    });
    const hashTarget=location.hash?document.getElementById(location.hash.slice(1)):null;
    if(hashTarget?.closest('details'))hashTarget.closest('details')!.open=true;
  }catch(error){console.error('Atlas initialization',error);fail('この環境では操作できる地図を読み込めませんでした。');}
}
