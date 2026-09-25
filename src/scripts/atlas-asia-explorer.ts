import { readAsiaAtlasState, writeAsiaAtlasState, startAsiaComparison, restoreAsiaComparison, gridCellAt, type AsiaState, type AsiaCamera, type AsiaField, type AsiaStateContext } from '../lib/atlas-asia-state';
import { getAsiaRiceLayer, asiaRiceLegend, asiaRiceReading, asiaRiceRegionNotes, asiaRiceSources, readAsiaRiceCell, type AsiaRiceGrid } from '../data/atlas/asia-agriculture';
import type { AsiaClimateCity } from '../data/atlas/asia-climate-cities';
import type { AsiaClimateClass } from '../data/atlas/asia-climate-definitions';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

const root=document.querySelector<HTMLElement>('[data-asia-atlas]');
if(root) start(root);

function start(root:HTMLElement) {
  const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  const $$=<T extends Element=HTMLElement>(selector:string)=>[...root.querySelectorAll<T>(selector)];
  const config=JSON.parse($('[data-asia-config]').textContent!) as {
    regionId:'east-asia'|'southeast-asia'|'south-central-asia';label:string;bounds:number[];
    countries:{code:string;name:string;bounds:number[]}[];cities:AsiaClimateCity[];classes:AsiaClimateClass[];
    geographyUrl:string;climateBase:string;agricultureBase:string;climate:any;
  };
  const context:AsiaStateContext={countries:config.countries.map(c=>c.code),cities:config.cities,bounds:config.bounds,fields:['natural','agriculture']};
  const countrySelect=$<HTMLSelectElement>('[data-country-select]'),citySelect=$<HTMLSelectElement>('[data-city-select]');
  const overviewTitle=$('[data-reading-title]').textContent!,overviewSummary=$('[data-reading-summary]').textContent!;
  let state:AsiaState=readAsiaAtlasState(new URL(location.href),context);
  let map:import('maplibre-gl').Map|null=null;
  let mapReady=false,starting=false,suppressCamera=false,sourceFailed=false,attempt=0,moveTimer:ReturnType<typeof setTimeout>|undefined;
  const climateManifest={regions:{[config.regionId]:config.climate}};
  let climateGrid:any=null,riceGrid:AsiaRiceGrid|null=null;
  let gridPromise:Promise<any>|null=null,ricePromise:Promise<AsiaRiceGrid>|null=null;
  let selectedClass:number|null=null,selectedPoint:[number,number]|null=state.point??null;
  const markers:{city:AsiaClimateCity;button:HTMLButtonElement;marker:import('maplibre-gl').Marker}[]=[];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const riceLayer=getAsiaRiceLayer(config.regionId)!;
  const riceNote=asiaRiceRegionNotes[config.regionId];

  async function fetchJson(url:string) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try {const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`${response.status}: ${url}`);return await response.json();}
    finally{clearTimeout(timer);}
  }
  const asset=(base:string,name:string)=>base+name.split('/').at(-1);
  function status(message:string,error=false) {
    const el=$('[data-map-state]');el.textContent=message;el.hidden=!message;
    $('[data-map-retry]').hidden=!error;
  }
  function syncFieldLinks() {
    $$<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(a=>{if(a.dataset.field===state.field)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');a.href=writeAsiaAtlasState(new URL(a.href),{...state,field:a.dataset.field as AsiaField,back:null}).href;});
  }
  function persist(push:boolean) {
    syncFieldLinks();
    const url=writeAsiaAtlasState(new URL(location.href),state);
    if(url.href===location.href)return;
    history[push?'pushState':'replaceState']({},'',url);
  }
  function navigate(next:AsiaState,fit=true) {
    state=next;selectedClass=null;selectedPoint=state.point??null;persist(true);render();const reading=$('.asia-reading-scroll');if(reading)reading.scrollTop=0;if(fit)fitSelection();
  }
  function camera():AsiaCamera|null {if(!mapReady||!map)return state.camera;const c=map.getCenter();return{lng:c.lng,lat:c.lat,zoom:map.getZoom()};}
  function fitSelection() {
    if(!mapReady||!map)return;
    suppressCamera=true;clearTimeout(moveTimer);
    if(state.camera)map.jumpTo({center:[state.camera.lng,state.camera.lat],zoom:state.camera.zoom});
    else if(state.city){const c=config.cities.find(c=>c.id===state.city)!;map.jumpTo({center:c.coordinates,zoom:5});}
    else {const b=config.countries.find(c=>c.code===state.place)?.bounds??config.bounds;map.fitBounds([[b[0],b[1]],[b[2],b[3]]],{padding:state.place?45:20,maxZoom:state.place?6.5:4.5,duration:0});}
    requestAnimationFrame(()=>{suppressCamera=false;});
  }
  function selectCountry(code:string|null) {navigate({...state,place:code,city:null,camera:null,back:null,point:null});}
  function selectCity(id:string) {const city=config.cities.find(c=>c.id===id);if(!city)return;navigate({...state,field:'natural',place:city.countryCode,city:id,camera:null,back:null,point:null});}

  function render() {
    const city=config.cities.find(c=>c.id===state.city),country=config.countries.find(c=>c.code===state.place);
    countrySelect.value=state.place??'';
    citySelect.value=state.city??'';
    for(const option of citySelect.options){const allowed=!state.place||!option.value||option.dataset.country===state.place;option.hidden=!allowed;option.disabled=!allowed;}
    $$<HTMLButtonElement>('[data-country-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.countryButton===state.place)));
    $$('[data-map-country]').forEach(p=>p.classList.toggle('is-selected',(p as SVGPathElement).dataset.mapCountry===state.place));
    syncFieldLinks();
    const explorer=$<HTMLElement>('[data-asia-explorer]');
    if(explorer)explorer.dataset.field=state.field;
    const fieldPanel=$<HTMLElement>('[data-field-national]');if(fieldPanel)fieldPanel.dataset.fieldNational=state.field;
    const placeLabel=$('[data-current-place]');if(placeLabel)placeLabel.textContent=country?.name??`${config.label}全体`;
    const cityPicker=$<HTMLElement>('[data-city-picker]');if(cityPicker)cityPicker.hidden=state.field!=='natural';
    $$<HTMLElement>('[data-city-panel]').forEach(el=>el.hidden=state.field!=='natural'||el.dataset.cityPanel!==state.city);
    $('[data-overview]').hidden=state.field!=='natural'||Boolean(city);
    $('[data-rice-reading]').hidden=state.field!=='agriculture';
    $('[data-climate-legend]').hidden=state.field!=='natural';
    $('[data-agriculture-legend]').hidden=state.field!=='agriculture';
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
    renderClass();
    renderGridReading();
    for(const item of markers){item.button.setAttribute('aria-pressed',String(item.city.id===state.city));item.button.style.opacity=!state.place||item.city.countryCode===state.place?'1':'.45';}
    if(mapReady&&map){map.setFilter('asia-country-selected',['==',['get','code'],state.place??'']);void showField();}
  }
  function renderClass() {
    const classification=config.classes.find(c=>c.id===selectedClass);
    $('[data-class-reading]').hidden=state.field!=='natural'||!classification;
    $$('[data-climate-class]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.climateClass)===selectedClass)));
    if(!classification)return;
    $('[data-class-code]').textContent=classification.code;$('[data-class-name]').textContent=classification.name;$('[data-class-description]').textContent=classification.description;
  }
  function renderGridReading() {
    let text=state.field==='natural'?'地図上の陸地を選ぶと、気候区分を確認できます。':'地図上の対象地域を選ぶと、格子内の米の収穫面積を確認できます。';
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
    gridPromise??=fetchJson(asset(config.climateBase,climateManifest.regions[config.regionId].grid)).then(grid=>{climateGrid=grid;return grid;}).catch(error=>{gridPromise=null;throw error;});
    return gridPromise;
  }
  async function loadRiceGrid() {
    if(riceGrid)return riceGrid;
    ricePromise??=fetchJson(asset(config.agricultureBase,riceLayer.queryUrl)).then(grid=>{riceGrid=grid;return grid;}).catch(error=>{ricePromise=null;throw error;});
    return ricePromise;
  }
  async function showField() {
    if(!mapReady||!map)return;
    const natural=state.field==='natural';
    map.setLayoutProperty('asia-climate','visibility',natural?'visible':'none');
    if(!natural&&!map.getSource('asia-rice')){
      map.addSource('asia-rice',{type:'image',url:asset(config.agricultureBase,riceLayer.imageUrl),coordinates:riceLayer.coordinates as [number,number][]});
      map.addLayer({id:'asia-rice',type:'raster',source:'asia-rice',paint:{'raster-opacity':.95,'raster-resampling':'nearest','raster-fade-duration':0}},'asia-context');
    }
    if(map.getLayer('asia-rice'))map.setLayoutProperty('asia-rice','visibility',natural?'none':'visible');
    if((state.city||selectedPoint)&&natural){try{await loadClimateGrid();if(state.field==='natural')renderGridReading();}catch{if(state.field==='natural')status('気候の数値を取得できませんでした。雨温図は引き続き読めます。',true);}}
    if(!natural){try{await loadRiceGrid();if(state.field==='agriculture'){renderGridReading();if(!sourceFailed)status('');}}catch{if(state.field==='agriculture')status('米の数値を取得できませんでした。気候や都市の雨温図へ切り替えられます。',true);}}
  }
  function sourceText() {
    const climate=$('[data-climate-method]');
    climate.textContent='表示・選択用の元格子は0.1度（南北約11km）。分類値を最近傍で再投影しています。出典：Beckほか（2023）／CC BY 4.0。地域抽出・加工：Insight Journal。';
    const agr=$('[data-agriculture-method]');agr.replaceChildren();
    const a=document.createElement('a');a.href=asiaRiceSources[0].href;a.textContent='IFPRI MapSPAM 2020 v2r2 / CGIAR';agr.append(a,document.createTextNode(`。${asiaRiceReading.scaleNote} ${asiaRiceReading.attribution}`));
    const src=$('[data-rice-source]');src.replaceChildren(document.createTextNode('出典：'));
    for(const [index,source] of asiaRiceSources.entries()){if(index)src.append(document.createTextNode(' · '));const link=document.createElement('a');link.href=source.href;link.textContent=source.label;src.append(link);}
    $('[data-rice-summary]').textContent=riceNote.reading;
    $('.asia-rice-reading>.asia-takeaway').textContent=riceNote.takeaway;
    const scale=$('[data-rice-scale]'),keys=document.createElement('div');keys.className='asia-rice-key';
    for(const entry of asiaRiceLegend){const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.backgroundColor=entry.color;item.append(swatch,document.createTextNode(entry.label));keys.append(item);}
    const note=document.createElement('p');note.textContent='色なし：1ha未満・推計0・データなしを含みます。区別は地図を選んで確認してください。';scale.append(keys,note);
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
      if(map){markers.splice(0).forEach(m=>m.marker.remove());map.remove();map=null;}
      mapReady=false;lib.setWorkerUrl(workerUrl);lib.setWorkerCount(1);
      map=new lib.Map({container:$('[data-map-surface]'),attributionControl:false,renderWorldCopies:false,dragRotate:false,touchPitch:false,maxPitch:0,maxZoom:9,minZoom:1,pixelRatio:Math.min(devicePixelRatio,2),cooperativeGestures:true,locale:{'CooperativeGesturesHandler.MobileHelpText':'地図は2本指で動かせます'},bounds:[[config.bounds[0],config.bounds[1]],[config.bounds[2],config.bounds[3]]],fitBoundsOptions:{padding:20},maxBounds:[[Math.max(-180,config.bounds[0]-15),Math.max(-80,config.bounds[1]-15)],[Math.min(180,config.bounds[2]+15),Math.min(80,config.bounds[3]+15)]],style:{version:8,sources:{'asia-land':{type:'geojson',data:lands},'asia-countries':{type:'geojson',data:selected},'asia-context':{type:'geojson',data:nearby},'asia-climate':{type:'image',url:asset(config.climateBase,region.image),coordinates:region.imageCoordinates}},layers:[{id:'asia-ocean',type:'background',paint:{'background-color':'#e6eef0'}},{id:'asia-land',type:'fill',source:'asia-land',paint:{'fill-color':'#e1e4db'}},{id:'asia-climate',type:'raster',source:'asia-climate',paint:{'raster-opacity':.8,'raster-resampling':'nearest','raster-fade-duration':0}},{id:'asia-context',type:'fill',source:'asia-context',paint:{'fill-color':'#d7dad5'}},{id:'asia-context-border',type:'line',source:'asia-context',paint:{'line-color':'#f6f6ee','line-width':.65}},{id:'asia-country-hit',type:'fill',source:'asia-countries',paint:{'fill-opacity':0}},{id:'asia-country-border',type:'line',source:'asia-countries',paint:{'line-color':'#354c56','line-opacity':.6,'line-width':.8}},{id:'asia-country-selected',type:'line',source:'asia-countries',filter:['==',['get','code'],''],paint:{'line-color':'#28363d','line-width':2.6}}]}});
      map.scrollZoom.disable();map.touchZoomRotate.disableRotation();
      map.once('load',()=>{
        if(currentAttempt!==attempt)return;
        clearTimeout(timeout);mapReady=true;$('[data-map-fallback]').hidden=true;if(!sourceFailed)status('');
        for(const city of config.cities){
          const button=document.createElement('button');button.type='button';button.className='asia-city-marker';button.setAttribute('aria-label',`${city.name}の雨温図`);button.dataset.mapCity=city.id;
          const dot=document.createElement('i'),label=document.createElement('span');dot.setAttribute('aria-hidden','true');label.textContent=city.name;button.append(dot,label);
          button.addEventListener('click',event=>{event.stopPropagation();selectCity(city.id);});
          const marker=new lib.Marker({element:button,anchor:'left'}).setLngLat(city.coordinates).addTo(map!);markers.push({city,button,marker});
        }
        render();fitSelection();root.dataset.mapReady='true';root.dataset.mapLoadMs=String(Math.round(performance.now()-initialStarted));
      });
      map.on('click',async event=>{
        if(!mapReady||!map)return;
        const hit=map.queryRenderedFeatures(event.point,{layers:['asia-country-hit']})[0];
        selectedPoint=[event.lngLat.lng,event.lngLat.lat];
        state={...state,point:selectedPoint,place:hit?.properties.code??state.place,city:null,camera:camera()};persist(true);render();
        if(state.field==='natural'){try{await loadClimateGrid();if(state.field==='natural')renderGridReading();}catch{if(state.field==='natural')status('気候の数値を取得できませんでした。再読み込みをお試しください。',true);}}
        else {try{await loadRiceGrid();if(state.field==='agriculture')renderGridReading();}catch{if(state.field==='agriculture')status('米の数値を取得できませんでした。気候の表示は利用できます。',true);}}
      });
      map.on('moveend',()=>{if(suppressCamera||!mapReady)return;clearTimeout(moveTimer);moveTimer=setTimeout(()=>{state={...state,camera:camera()};persist(false);},120);});
      map.on('error',event=>{if(currentAttempt!==attempt)return;sourceFailed=true;console.warn('Asia map asset failed',event.error?.message);status('地図の一部を読み込めませんでした。都市の図表・出典は引き続き読めます。',true);});
      map.getCanvas().addEventListener('webglcontextlost',()=>{mapReady=false;$('[data-map-fallback]').hidden=false;root.dataset.mapReady='false';status('地図の描画が停止しました。国の一覧と都市の図表は利用できます。',true);},{once:true});
    }catch(error){console.warn('Asia map unavailable',error);$('[data-map-fallback]').hidden=false;status('詳細地図を読み込めませんでした。国の位置と都市の図表は利用できます。',true);}
    finally{starting=false;}
  }
  countrySelect.addEventListener('change',()=>selectCountry(countrySelect.value||null));
  citySelect.addEventListener('change',()=>{if(citySelect.value)selectCity(citySelect.value);else navigate({...state,city:null,camera:null});});
  $$<HTMLButtonElement>('[data-country-button]').forEach(b=>b.addEventListener('click',()=>selectCountry(b.dataset.countryButton!)));
  $$<SVGPathElement>('[data-map-country]').forEach(p=>p.addEventListener('click',()=>selectCountry(p.dataset.mapCountry!)));
  $$<HTMLAnchorElement>('.atlas-tabs [data-field]').forEach(a=>a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();navigate({...state,field:a.dataset.field as AsiaField,camera:camera(),back:null},false);}));
  $$<HTMLButtonElement>('[data-compare]').forEach(b=>b.addEventListener('click',()=>navigate(startAsiaComparison(new URL(location.href),{...state,camera:camera()},b.dataset.compare as AsiaField),false)));
  $('[data-comparison-back]').addEventListener('click',()=>navigate(restoreAsiaComparison(new URL(location.href),state,context)));
  $$<HTMLButtonElement>('[data-climate-class]').forEach(b=>b.addEventListener('click',()=>{selectedClass=Number(b.dataset.climateClass);selectedPoint=null;state={...state,point:null};persist(false);renderClass();const c=config.classes.find(c=>c.id===selectedClass)!;$('[data-grid-reading]').textContent=`凡例：${c.code} ${c.name} · ${c.description}`;}));
  $('[data-reset]').addEventListener('click',()=>navigate({field:state.field,place:null,city:null,camera:null,back:null}));
  $('[data-map-fit]').addEventListener('click',()=>{state={...state,camera:null};persist(true);fitSelection();});
  $('[data-zoom-in]').addEventListener('click',()=>map?.zoomIn({duration:reduced?0:160}));
  $('[data-zoom-out]').addEventListener('click',()=>map?.zoomOut({duration:reduced?0:160}));
  $('[data-map-retry]').addEventListener('click',()=>{state={...state,camera:camera()};mapReady=false;root.dataset.mapReady='false';void initialiseMap();});
  window.addEventListener('popstate',()=>{state=readAsiaAtlasState(new URL(location.href),context);selectedPoint=state.point??null;selectedClass=null;render();fitSelection();});
  window.addEventListener('pagehide',event=>{clearTimeout(moveTimer);if(!event.persisted){map?.remove();map=null;mapReady=false;}});
  window.addEventListener('pageshow',event=>{if(event.persisted){map?.resize();if(!mapReady)void initialiseMap();}});
  const syncLayout=()=>{map?.resize();const height=$('.asia-map-frame')?.getBoundingClientRect().height;if(height)root.style.setProperty('--asia-map-height',`${height}px`);};
  const layoutObserver=new ResizeObserver(syncLayout);layoutObserver.observe($('[data-map-surface]'));
  window.addEventListener('resize',syncLayout);
  sourceText();render();persist(false);syncLayout();void initialiseMap();
}
