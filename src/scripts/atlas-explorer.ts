import { readAtlasState, writeAtlasState, type MapField } from '../lib/atlas-state';
import type { Map as LibreMap } from 'maplibre-gl';
import { createAtlasStyle, setFieldLayers } from '../lib/atlas-style';

export async function startAtlas() {
  const root=document.querySelector<HTMLElement>('[data-atlas-explorer]');
  if(!root || root.dataset.initialized) return;
  root.dataset.initialized='true'; root.dataset.renderState='loading';
  const config=JSON.parse(root.querySelector('[data-explorer-config]')!.textContent!);
  const el=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const frame=el('[data-map-frame]'), fallback=el('[data-fallback]'), surface=el('[data-map-surface]');
  const initial=readAtlasState(new URL(location.href),config.initialField);
  let field:MapField=initial.field, map:LibreMap|undefined, selected:string|null=null, failed=false, ready=false;
  let labels:any[]=[];
  const allCrops=new Map<string,any>(config.crops.map((c:any)=>[c.id,c]));
  const status=el('[data-fallback-status]');
  const criticalController=new AbortController();
  let timeout:number;

  function save(push=false) {
    const center=map?.getCenter();
    const camera=center?{lng:center.lng,lat:center.lat,zoom:map!.getZoom()}:initial.camera??undefined;
    const url=writeAtlasState(new URL(location.href),config.base,field,camera,selected);
    if(config.reviewMode){url.pathname=config.base+'review/';url.searchParams.set('field',field);}
    history[push?'pushState':'replaceState']({},'',url);
  }
  function closeSelection(saveUrl=true) {
    selected=null; el('[data-selection]').hidden=true;
    if(saveUrl) save();
  }
  function selectCrop(id:string, lng?:number, saveUrl=true) {
    const c=id==='corn-soybean'?{name:'とうもろこし・大豆の重なり',summary:'近い地域で両方の作物がまとまります。この図だけでは、同じ畑の輪作や同時栽培は判定できません。'}:allCrops.get(id);
    if(!c) return;
    selected=id;
    el('[data-selection-title]').textContent=c.name;
    let text=c.summary;
    if(id==='rice'&&lng!==undefined) text=lng < -110?'サクラメントバレーでは、夏に雨が少なくても灌漑と平坦な谷底が稲作を支えます。':'ミシシッピ川下流・湾岸の低地では、平坦な土地と水管理が稲作を支えます。';
    el('[data-selection-text]').textContent=text;
    el<HTMLAnchorElement>('[data-selection-link]').href='#crop-'+(id==='corn-soybean'?'corn':id);
    el('[data-selection]').hidden=false;
    if(saveUrl)save();
  }
  function setField(next:MapField,push=false) {
    field=next; root.dataset.field=field;
    root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(a=>{
      if(a.dataset.field===field)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    root.querySelectorAll<HTMLElement>('[data-field-content]').forEach(section=>section.hidden=!section.dataset.fieldContent!.split(' ').includes(field));
    el('[data-crop-key]').hidden=field!=='agriculture';el('[data-land-key]').hidden=field==='agriculture';
    el<HTMLImageElement>('[data-fallback-image]').src=config.assetBase+(field==='agriculture'?'agriculture':'land')+'-fallback.webp';
    el<HTMLAnchorElement>('[data-fallback-full]').href=config.assetBase+(field==='agriculture'?'agriculture':'land')+'-fallback.webp';
    el<HTMLImageElement>('[data-fallback-image]').alt=field==='agriculture'?'米国本土の地形・河川と、州境をまたぐ主要作物の栽培分布。下の作物別解説でも内容を読めます。':'米国本土の地形と水系。西部の山地、中央の平原、東部の山地を比べられます。';
    el('[data-layer-caption]').textContent=field==='agriculture'?'主要栽培域 · ２０２３年の衛星分類から概略化':'地形・水系';
    el('[data-detail-guide]').textContent='↓ '+(field==='agriculture'?'作物の特徴・用途と、地域に根付いた理由':'地形と水系から、地域の条件を読む');
    closeSelection(false);
    if(ready&&map){
      setFieldLayers(map,field);
      // Neither setStyle nor fitBounds is called here: preserve the one map and its camera.
      renderLabels();
    }
    if(push)save(true);
  }
  function fail(message:string) {
    if(failed)return; failed=true;ready=false;clearTimeout(timeout);criticalController.abort();
    root.dataset.renderState='fallback'; fallback.hidden=false;surface.hidden=true;
    el('[data-map-labels]').hidden=true;el('.atlas-map-tools').hidden=true;
    status.textContent=message+'（代替図）';
    map?.remove();map=undefined;
  }
  root.querySelectorAll<HTMLAnchorElement>('[data-field]').forEach(a=>a.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();setField(a.dataset.field as MapField,true);
  }));
  root.querySelectorAll<HTMLAnchorElement>('[data-crop-select]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();selectCrop(a.dataset.cropSelect!);}));
  el('[data-close-selection]').addEventListener('click',()=>closeSelection());
  el('[data-selection-link]').addEventListener('click',()=>{
    const id=selected==='corn-soybean'?'corn':selected;
    if(id)document.getElementById('crop-'+id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  root.addEventListener('keydown',e=>{if(e.key==='Escape')closeSelection();});
  setField(field);
  timeout=window.setTimeout(()=>fail('地図データの読み込みが完了しませんでした。'),25000);

  function renderLabels() {
    if(!map||!ready)return;
    const w=frame.clientWidth,h=frame.clientHeight,occupied:number[][]=[];
    // Essential orientation/crop labels are placed first. State labels yield when space is limited.
    for(const item of labels){
      const node=item.node as HTMLElement;
      if(item.kind==='crop'&&field!=='agriculture'){node.hidden=true;continue;}
      const pt=map.project([item.lng,item.lat]);
      node.hidden=false;
      const width=node.offsetWidth,height=node.offsetHeight;
      const r=[pt.x-width/2,pt.y-height/2,pt.x+width/2,pt.y+height/2];
      const outside=r[0]<5||r[1]<28||r[2]>w-5||r[3]>h-5;
      const tools=r[2]>w-54&&r[1]<150;
      const collide=occupied.some(b=>r[0]<b[2]+5&&r[2]>b[0]-5&&r[1]<b[3]+3&&r[3]>b[1]-3);
      node.hidden=outside||tools||collide;
      if(!node.hidden){node.style.transform=`translate(${Math.round(pt.x-width/2)}px,${Math.round(pt.y-height/2)}px)`;occupied.push(r);}
    }
  }
  try {
    const fetchJson=async(name:string)=>{
      // A review-only QA control exercises the real critical-asset error path.
      const testMissing=config.reviewMode&&new URL(location.href).searchParams.get('qa')==='asset-error'&&name==='manifest.json';
      const r=await fetch(config.assetBase+(testMissing?'qa-missing-manifest.json':name),{signal:criticalController.signal});
      if(!r.ok)throw new Error(name+': '+r.status);return r.json();
    };
    const [lib,manifest,base,crops,land,stateLabels,cropLabels]=await Promise.all([
      import('maplibre-gl'),fetchJson('manifest.json'),fetchJson('base.geojson'),fetchJson('agriculture.geojson'),fetchJson('land.geojson'),fetchJson('labels.json'),fetchJson('crop-labels.json')
    ]);
    if(failed)return;
    const style=createAtlasStyle(config,manifest,base,crops,land);
    lib.setWorkerCount(1);
    map=new lib.Map({container:surface,style,attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,pitchWithRotate:false,rollEnabled:false,maxPitch:0,maxZoom:7,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),bounds:manifest.fitBounds,fitBoundsOptions:{padding:{top:30,bottom:14,left:12,right:12}},maxBounds:[[-137,16],[-56,58]],refreshExpiredTiles:false,fadeDuration:0});
    map.touchZoomRotate.disableRotation();map.scrollZoom.disable();
    if(initial.camera)map.jumpTo({center:[initial.camera.lng,initial.camera.lat],zoom:initial.camera.zoom});
    surface.addEventListener('webglcontextlost',()=>fail('この端末の地図描画が停止しました。'),true);
    map.on('error',event=>{console.error('Atlas data/render error',event.error?.message);fail('地図の描画またはデータの読み込みに失敗しました。');});
    map.once('load',()=>{
      if(failed||!map)return;
      ready=true;clearTimeout(timeout);root.dataset.renderState='ready';fallback.hidden=true;el('.atlas-map-tools').hidden=false;
      // A tiny self-generated stripe texture denotes overlap; it is not geography.
      const size=12,rgba=new Uint8Array(size*size*4);
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=(y*size+x)*4;rgba.set((x+y)%size<3?[169,139,38,165]:[0,0,0,0],n);}
      map.addImage('overlap-stripe',{width:size,height:size,data:rgba});
      map.setPaintProperty('crops-overlap','fill-pattern','overlap-stripe');
      labels=[...cropLabels,...config.geographicLabels,...stateLabels].sort((a,b)=>a.priority-b.priority);
      const parent=el('[data-map-labels]');
      for(const item of labels){const node=document.createElement('span');node.className='atlas-geolabel atlas-geolabel--'+item.kind;node.textContent=item.name;node.hidden=true;if(item.color)node.style.setProperty('--label-color',item.color);parent.appendChild(node);item.node=node;}
      setField(field);save();
      if(initial.crop)selectCrop(initial.crop,undefined,false);
      map.on('move',renderLabels);
      map.on('moveend',()=>save());
      map.on('click',e=>{
        if(field==='agriculture'){
          const features=map!.queryRenderedFeatures([[e.point.x-5,e.point.y-5],[e.point.x+5,e.point.y+5]],{layers:['crops-fill','crops-overlap']});
          const f=features.find(f=>f.properties.id==='corn-soybean')??features[0];
          if(f)selectCrop(f.properties.id,e.lngLat.lng);else closeSelection();
        }else{
          const features=map!.queryRenderedFeatures(e.point,{layers:['land-picking']}).sort((a,b)=>a.properties.area-b.properties.area);
          if(!features.length){closeSelection();return;}
          el('[data-selection-title]').textContent=features[0].properties.name;
          el('[data-selection-text]').textContent='Natural Earthの地誌的な地域区分です。土壌や地質の境界ではありません。農業へ切り替えて、同じ位置で分布を比べられます。';
          el<HTMLAnchorElement>('[data-selection-link]').href='#land-conditions';el('[data-selection]').hidden=false;
        }
      });
      root.querySelectorAll<HTMLButtonElement>('[data-map-action]').forEach(b=>b.addEventListener('click',()=>{
        if(!map)return;closeSelection(false);
        if(b.dataset.mapAction==='fit')map.fitBounds(manifest.fitBounds,{padding:{top:30,bottom:14,left:12,right:12},duration:0});
        if(b.dataset.mapAction==='in')map.zoomIn({duration:0});
        if(b.dataset.mapAction==='out')map.zoomOut({duration:0});
      }));
      let lastWidth=frame.clientWidth,lastHeight=frame.clientHeight;
      new ResizeObserver(()=>{
        if(!map||failed)return;
        const w=frame.clientWidth,h=frame.clientHeight;if(w===lastWidth&&h===lastHeight)return;
        lastWidth=w;lastHeight=h;map.resize();renderLabels();
      }).observe(frame);
      if(config.reviewMode)window.addEventListener('message',event=>{
        if(event.origin!==location.origin||event.source!==parent||event.data!=='atlas-qa-lose-context'||!map)return;
        const gl=map.getCanvas().getContext('webgl2');
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
      });
    });
    window.addEventListener('popstate',()=>{
      const state=readAtlasState(new URL(location.href),config.initialField);setField(state.field);
      if(state.camera&&map)map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});
      if(state.crop)selectCrop(state.crop,undefined,false);
    });
    const hashTarget=location.hash?document.getElementById(location.hash.slice(1)):null;
    if(hashTarget?.closest('details'))hashTarget.closest('details')!.open=true;
  }catch(error){console.error('Atlas initialization',error);fail('この環境では操作できる地図を読み込めませんでした。');}
}
