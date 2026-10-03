import { frame, project, unproject, wheatCell, displayCell, visibleBounds, readEuropeState, writeEuropeState, defaultEuropeCity } from './atlas-europe-view';
import { farmingPresentation, farmingAtPoint, updateFarmingMap, type FarmingAreas } from './atlas-europe-farming';
import { layerColor, fields, europeFieldHeadings, type EuropeLayer } from '../data/atlas/europe/layers';
import type { EuropeReading } from '../data/atlas/europe/readings';
import type { Geometry } from './atlas-europe-geometry';
import type { Map as LibreMap } from 'maplibre-gl';
import { createEuropeAnnotations } from './atlas-europe-annotations';
import { europeReaderCopy, europeReaderSources } from './atlas-europe-reader';
import { europeComparisonLinks, readEuropeReturn, europeComparisonUrl, europeNamedReturnUrl, europeComparisonQuestion, europeComparisonSourceLabel } from './atlas-europe-comparison';
import { renderEuropeOrigin } from './atlas-europe-comparison-renderer';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { createEuropePopulationCases, cultureSelection, cultureColor, cultureBounds, type CultureMapData, type CultureBounds } from './atlas-europe-population-cases';
import { europeDrainageBasins, europeDrainageBasinByIndex, europeDrainageIndexForBasin, normaliseEuropeDrainageBasin, europeDrainageOutline } from './atlas-europe-drainage';
import drainageManifest from '../../public/assets/atlas/europe/drainage-v1/manifest.json' with {type:'json'};
import { readEuropeFarmingFocus, writeEuropeFarmingFocus } from '../data/atlas/europe/farming-water-comparisons';
import { createEuropeFarmingStatistics } from '../scripts/atlas-europe-farming-statistics';
import { europeFarmAvailableMetrics } from '../data/atlas/europe/farming-statistics';
type Country = { code: string; name: string; region: string };
type City = { id: string; name: string; country: string; coordinates: [number, number] };
type Feature = { type: 'Feature'; properties: { code: string; kind: string }; geometry: Geometry };
type Place = City & {rank?:number;capital?:boolean};
type Indicator = {id:string;label:string;unit:string;year:number;values:Record<string,Record<string,number|null>>;sourceUrl:string};

export function initEuropeAtlas() {
  const root = document.querySelector<HTMLElement>('[data-europe-detail]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const config = JSON.parse(root.querySelector('[data-eu-config]')!.textContent!) as { farmingAreas:FarmingAreas; countries: Country[]; cities: City[]; geography: { type: 'FeatureCollection'; features: Feature[] }; climateWater: { type:'FeatureCollection';features:{type:'Feature';properties:{id:string;name:string};geometry:Geometry}[] }; climate: string; wheat: string; wheatValues: string; initialLayer: string; layers:EuropeLayer[];populationCities:Place[];readings:EuropeReading[];statistics:{indicators:Indicator[]} };
  const { countries, cities, geography } = config;
  const query = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const staticMap = query<SVGSVGElement>('[data-eu-static]');
  const liveMap = query<HTMLElement>('[data-eu-live]');
  const status = query<HTMLElement>('[data-eu-map-status]');
  const ids = cities.map(c => c.id);
  let state = readEuropeState(location.search, countries, ids, config.initialLayer);
  state.compare=[]; // Legacy comparison URLs retain the primary city's statistics.
  const valueCache = new Map<string, Promise<Float32Array>>();
  let gridRequest = 0;
  let focusRequest = 0;
  let drainageRequest=0;
  let drainageDrawn='';
  let drainageImage='';
  let map: LibreMap | undefined;
  let loadedSubject = '';
  let lastLayer = '';
  let generation = 0;
  let box = [0, 0, frame.width, frame.height];
  let failed = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  const regionNames: Record<string, string> = { all: '欧州全体', north: '北欧', west: '西欧', south: '南欧', east: '東欧' };
  const comparisonDetails=query<HTMLDetailsElement>('.eu-comparison-origin');
  const comparisonDetailsHome=document.createComment('Europe comparison methods');comparisonDetails.before(comparisonDetailsHome);
  const farmStatistics=createEuropeFarmingStatistics(root,{
    countries,onCountry:selectCountry,
    onChange:choice=>{
      Object.assign(state,choice);
      const compare=[...new Set(choice.farmCompare??[])].filter(code=>code!==state.place&&countries.some(country=>country.code===code)).slice(0,2);
      if(compare.length)state.farmCompare=compare;else delete state.farmCompare;
      commit(false);
    },
  });
  const cultureActive=()=>state.layer==='ethnicity'||state.layer==='religion';
  let cultureData:CultureMapData={type:'FeatureCollection',features:[]};
  let cultureRunning=false;
  const cultureReader=query<HTMLElement>('[data-eu-culture-reader]');
  function paintCulture() {
    if(!map?.getLayer('land'))return;
    const source=map.getSource('eu-culture') as any;
    if(source)source.setData(cultureData);
    else {
      map.addSource('eu-culture',{type:'geojson',data:cultureData as any});
      map.addLayer({id:'eu-culture-fill',type:'fill',source:'eu-culture',paint:{'fill-color':['get','fill']}},'borders');
      map.addLayer({id:'eu-culture-line',type:'line',source:'eu-culture',paint:{'line-color':['case',['get','selected'],'#841e37','#f7f5eb'],'line-width':['case',['get','selected'],2.5,.6]}},'borders');
    }
    for(const id of ['eu-culture-fill','eu-culture-line'])if(map.getLayer(id))map.setLayoutProperty(id,'visibility',cultureActive()?'visible':'none');
  }
  function fitCulture(bounds:CultureBounds) {
    if(!cultureActive())return;
    const points=bounds.map(project),x=Math.min(...points.map(point=>point[0])),y=Math.min(...points.map(point=>point[1]));
    const width=Math.max(2,Math.abs(points[1][0]-points[0][0])),height=Math.max(2,Math.abs(points[1][1]-points[0][1]));
    // Reserve the SVG footer's screen space as well as the normal edge padding.
    const footerHeight=(query<HTMLElement>('.eu-map-footer')?.getBoundingClientRect().height??42)+6;
    const safeFraction=Math.min(.3,footerHeight/Math.max(160,staticMap.clientHeight));
    box=[x-width*.04,y-height*.04,width*1.08,height*1.08/(1-safeFraction)];
    staticMap.setAttribute('viewBox',box.join(' '));
    map?.fitBounds(bounds,{padding:{top:18,bottom:45,left:15,right:15},maxZoom:7,duration:0});
    annotations.refresh();
  }
  const culture=createEuropePopulationCases(cultureReader,{
    active:false,base:location.pathname.split('/atlas/europe/')[0]+'/',mapLayer:query<SVGGElement>('[data-eu-culture-layer]'),
    onMapData:data=>{cultureData=data;paintCulture();},onFitBounds:fitCulture,
    onChange:choice=>{Object.assign(state,choice);commit(false);},
  });
  query<HTMLElement>('[data-eu-culture-controls-host]').append(cultureReader.querySelector('.eu-culture-controls')!);
  const drainageChoice=query<HTMLSelectElement>('[data-eu-drainage-choice]');
  for(const basin of europeDrainageBasins.filter(basin=>drainageManifest.colorAssignments.some(item=>item.index===basin.index&&item.displayPixelCenters>0))){
    const option=document.createElement('option');option.value=String(basin.HYBAS_ID);option.textContent=`${basin.HYBAS_ID}（Pfaf ${basin.PFAF_ID}）`;drainageChoice.append(option);
  }

  async function gridValues(layer:EuropeLayer) {
    if(!layer.grid)throw new Error('No numeric grid');
    if(!valueCache.has(layer.grid))valueCache.set(layer.grid,fetch(layer.grid).then(async response=>{
      if(!response.ok)throw new Error('Europe grid unavailable');
      const bytes=new Uint8Array(await response.arrayBuffer());
      const buffer=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():bytes.buffer;
      if(buffer.byteLength!==(layer.gridType==='display'?1800*1502:1080*492)*(layer.encoding==='int16'?2:4))throw new Error('Invalid Europe grid');
      return layer.encoding==='int16'?Float32Array.from(new Int16Array(buffer)):new Float32Array(buffer);
    }));
    try{return await valueCache.get(layer.grid)!;}catch(error){valueCache.delete(layer.grid);throw error;}
  }
  async function paintDrainage() {
    const active=state.layer==='drainage',selected=normaliseEuropeDrainageBasin(state.basin);
    query<HTMLElement>('[data-eu-drainage-controls]').hidden=!active;
    if(selected&&!Array.from(drainageChoice.options).some(option=>option.value===selected)){
      const option=document.createElement('option');option.value=selected;option.textContent=selected+'（表示範囲内の有効画素なし）';drainageChoice.append(option);
    }
    drainageChoice.value=selected??'';
    const image=query<SVGImageElement>('[data-eu-drainage-selection]');
    const matching=active&&!!selected&&drainageDrawn===selected&&!!drainageImage;
    image.style.display=matching?'':'none';
    if(map?.getLayer('drainage-selected'))map.setLayoutProperty('drainage-selected','visibility',matching?'visible':'none');
    if(!active||!selected){
      drainageRequest++;
      if(!selected)query('[data-eu-basin-summary]').textContent='色は区画を見分けるための識別色です。量の大小ではありません。';
      return;
    }
    const index=europeDrainageIndexForBasin(selected)!,basin=europeDrainageBasinByIndex(index)!;
    query('[data-eu-basin-summary]').textContent=`選択：HYBAS_ID ${selected} · Pfafstetter ${basin.PFAF_ID}。濃い輪郭は表示格子上の区画で、その河川の流域全体とは限りません。`;
    const token=++drainageRequest;
    try {
      if(drainageDrawn!==selected){
        const values=await gridValues(config.layers.find(layer=>layer.id==='drainage')!);
        if(token!==drainageRequest||state.layer!=='drainage'||state.basin!==selected)return;
        const outline=europeDrainageOutline(values,index),canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1502;
        canvas.getContext('2d')!.putImageData(new ImageData(outline.rgba,1800,1502),0,0);
        drainageImage=canvas.toDataURL('image/png');drainageDrawn=selected;
        if(outline.transparent)query('[data-eu-basin-summary]').textContent+= ' この区画は表示範囲内に有効な画素がありません。';
      }
      image.setAttribute('href',drainageImage);
      image.style.display='';
      if(map?.getLayer('land')){
        const source=map.getSource('drainage-selected') as any;
        if(source)source.updateImage({url:drainageImage});
        else {map.addSource('drainage-selected',{type:'image',url:drainageImage,coordinates:[[-25,73],[65,73],[65,32],[-25,32]]});map.addLayer({id:'drainage-selected',type:'raster',source:'drainage-selected',paint:{'raster-resampling':'nearest','raster-fade-duration':0}},'context');}
        // The subject raster is recreated on topic changes; keep its selection above it.
        map.moveLayer('drainage-selected','context');
        map.setLayoutProperty('drainage-selected','visibility','visible');
      }
    }catch(error){if(token===drainageRequest){
      image.style.display='none';
      if(map?.getLayer('drainage-selected'))map.setLayoutProperty('drainage-selected','visibility','none');
      query('[data-eu-basin-summary]').textContent='選択区画の輪郭を取得できませんでした。区画を選び直して再試行できます。';
    }}
  }

  const subject = () => config.layers.find(l=>l.id===(state.layer==='overlay'?(state.returnLayer==='climate'?'wheat':state.returnLayer):state.layer)) ?? config.layers[0];
  const climateReader = () => state.layer==='climate'||state.layer==='overlay';
  const farmingItems=config.farmingAreas.features.map(feature=>feature.properties);
  const farmingView=()=>farmingPresentation(state,farmingItems);
  const features = [...config.populationCities,...config.readings];
    const visibleFeatures = () => subject().field==='population'&&!cultureActive() ? config.populationCities : subject().field==='industry' ? config.readings.filter(r=>r.field==='industry') : subject().field==='nature'&&['water','drainage','terrain','contours'].includes(state.layer) ? config.readings.filter(r=>r.field==='nature'&&r.layer===(['water','drainage'].includes(state.layer)?'water':'terrain')) : [];
  const featureVisible = (id:string) => {
    const p=visibleFeatures().find(p=>p.id===id); if(!p)return false;
    if(state.place)return p.country===state.place;
    if(state.region!=='all' && countries.find(c=>c.code===p.country)?.region!==state.region)return false;
    return !('rank' in p) || (p.rank??0)<=(state.region==='all'?1:3) || p.id===state.feature;
  };
  function sizeReader() {
    const top=query<HTMLElement>('.eu-map-stage').getBoundingClientRect().top+window.scrollY;
    root!.style.setProperty('--eu-reader-height',`${Math.max(220,window.innerHeight-top-12)}px`);
  }
  const annotations=createEuropeAnnotations(query<HTMLElement>('.eu-map-stage'),cities,features,
    ()=>({climate:climateReader(),crops:farmingView().active,farmingIds:farmingView().visible.map(item=>item.id),selectedFarming:farmingView().item?.id,city:state.city,feature:state.feature,detailed:map&&liveMap.classList.contains('is-ready')?map.getBounds().getEast()-map.getBounds().getWest()<60:box[2]<frame.width*.65,places:visibleFeatures().filter(p=>featureVisible(p.id))}),
    coordinate=>{
      if(map&&liveMap.classList.contains('is-ready'))return map.project(coordinate as [number,number]);
      const [x,y]=project(coordinate), matrix=staticMap.getScreenCTM(),rect=query<HTMLElement>('.eu-map-stage').getBoundingClientRect();
      const point=matrix?new DOMPoint(x,y).matrixTransform(matrix):new DOMPoint();
      return {x:point.x-rect.left,y:point.y-rect.top};
    },(kind,id)=>kind==='city'?selectCity(id):kind==='crop'?setLayer(id):selectFeature(id),farmingItems);
  function setLayer(id:string) {
    if(id==='overlay' && state.layer!=='overlay')state.returnLayer=state.layer;
    state.layer=id;
    if(state.farmMeasure&&!europeFarmAvailableMetrics(id).some(metric=>metric.id===state.farmMeasure))delete state.farmMeasure;
    if(!farmingItems.some(item=>item.id===id))delete state.single;
    query<HTMLElement>('[data-eu-farm-candidates]').hidden=true;
    commit(false);
  }
  function selectFeature(id:string) {
    const p=features.find(p=>p.id===id);if(!p)return;
    state.feature=id;commit(false);
    if(state.layer==='drainage')void showGrid(p.coordinates);
  }
  function updateReader() {
    const layer=subject(),copy=europeReaderCopy(layer),farm=farmingView();
    query<HTMLElement>('[data-eu-climate-reader]').hidden=!climateReader();
    query<HTMLElement>('[data-eu-subject-reader]').hidden=cultureActive();
    root!.classList.toggle('is-eu-climate-reading',climateReader());
    query('[data-eu-subject-title]').textContent=copy.title;
    query('[data-eu-subject-takeaway]').textContent=copy.takeaway;
    query('[data-eu-subject-intro]').textContent=copy.body;
    query('[data-eu-subject-note]').textContent=copy.note;
    query<HTMLElement>('[data-eu-reading-focus]').hidden=layer.id!=='wheat'||state.place==='GBR';
    query<HTMLAnchorElement>('[data-eu-subject-source]').href=layer.source;
    const readingSources=query<HTMLElement>('[data-eu-reading-sources]');readingSources.replaceChildren();
    for(const source of europeReaderSources(layer)){const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.className='eu-source-link';readingSources.append(a);}
    const feature=state.layer==='drainage'?undefined:visibleFeatures().find(p=>p.id===state.feature&&featureVisible(p.id));
    if(feature){
      query('[data-eu-subject-title]').textContent=`${feature.name}（${countries.find(country=>country.code===feature.country)?.name??feature.country}）`;
      // Reuse the sourced reading's first sentence; its full text and source
      // remain in the independently scrolling details below.
      query('[data-eu-subject-takeaway]').textContent='body' in feature
        ? feature.body.match(/^.*?[。！？]/u)?.[0]??feature.body
        : `${countries.find(c=>c.code===feature.country)?.name}の${feature.capital?'首都':'都市'}です。都市の点は位置を示し、人口の大小を表すものではありません。`;
    }
    const overview=query<HTMLButtonElement>('[data-eu-overview]');
    overview.hidden=!farm.item&&!feature&&!['forest','treecover'].includes(layer.id);
    overview.textContent=layer.field==='agriculture'?'← 欧州の農林業':`← ${layer.title}の概論`;
    const hiddenNote=query<HTMLElement>('[data-eu-hidden-note]');
    hiddenNote.hidden=!farm.item||farm.selectedVisible;
    hiddenNote.textContent=farm.item?`${farm.item.kind==='crop'?'作物':'畜産'}の表示がオフのため、${farm.item.name}の分布は非表示です。説明の選択は維持しています。`:'';
    const single=query<HTMLButtonElement>('[data-eu-single]');single.hidden=!farm.item||farm.single;
    single.textContent=farm.item?`${farm.item.name}のみの表示に切り替える`:'';
    query<HTMLElement>('[data-eu-return-multi]').hidden=!farm.single;
    query<HTMLElement>('[data-eu-climate-statistics]').hidden=!climateReader()||!state.city;
    query<HTMLElement>('[data-eu-farming-statistics]').hidden=layer.field!=='agriculture';
    const statisticsName=farm.item?.name??(['forest','treecover'].includes(layer.id)?'林業':'欧州の農畜産物');
    query('[data-eu-statistics-title]').textContent=statisticsName+'の統計';
    all<HTMLElement>('[data-eu-statistics-item]').forEach(el=>{el.textContent=statisticsName;});
    void farmStatistics.update(state);
    query<HTMLElement>('[data-eu-subject-intro]').hidden=!!feature;
    const card=query<HTMLElement>('[data-eu-feature-card]');card.replaceChildren();card.hidden=!feature;
    if(feature){
      const heading=document.createElement('h3');heading.textContent=feature.name;card.append(heading);
      const add=(text:string)=>{const p=document.createElement('p');p.textContent=text;card.append(p);};
      if('body' in feature){add(feature.body);const a=document.createElement('a');a.href=feature.source;a.textContent=feature.sourceLabel+' · '+feature.period;a.className='eu-source-link';card.append(a);}
      else add(`${countries.find(c=>c.code===feature.country)?.name}の${feature.capital?'首都':'都市'}です。都市の点は位置を示し、人口の大小を表すものではありません。`);
    }
    const details=query<HTMLDetailsElement>('.eu-reader-body');
    // Keep the climate overview's long explanation in the same independent
    // reading area as the selected station, below its plot and sourced reading.
    query<HTMLElement>(climateReader()?'[data-eu-climate-reader]':'[data-eu-subject-reader]').append(details);
    // Named source readings stay immediately available; the overview's methods
    // are secondary to the key statement and genuine comparison entries.
    details.open=!!feature||layer.field==='industry'||layer.field==='population';
    const country=countries.find(c=>c.code===state.place);
    query<HTMLElement>('[data-eu-country-reader]').hidden=!country||layer.field==='nature';
    query('[data-eu-country-title]').textContent=country?country.name+'の国全体の数値':'';
    const panel=query('[data-eu-national-values]');panel.replaceChildren();
    const preferred=layer.field==='population'?Array.from(new Set([...(layer.indicator?[layer.indicator]:[]),'population','urban'])):layer.field==='industry'?['manufacturing','industry','services']:['forest','agrishare'];
    if(country&&layer.field!=='nature')for(const id of preferred){const ind=config.statistics.indicators.find(i=>i.id===id)!;const value=ind.values[country.code]?.['2023'];const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),a=document.createElement('a');a.href=ind.sourceUrl;a.textContent=ind.label;dt.append(a);dd.textContent=value==null?'データなし':value.toLocaleString('ja-JP',{maximumFractionDigits:id==='population'?0:2})+' '+ind.unit;row.append(dt,dd);panel.append(row);}
  }

  function updateComparison() {
    const source=readEuropeReturn(new URL(location.href).searchParams.get('europeReturn')??'',countries,ids);
    const layer=subject(),panel=query<HTMLElement>('[data-eu-comparison-context]');
    const focus=comparisonFocus();
    const focusPanel=query<HTMLElement>('[data-eu-farming-comparison-focus]');
    focusPanel.hidden=!focus;
    root!.classList.toggle('has-eu-farming-focus',!!focus);
    query<HTMLElement>('.eu-reader-summary').hidden=!!focus;
    if(focus)focusPanel.querySelector('details')!.append(comparisonDetails);
    else comparisonDetailsHome.after(comparisonDetails);
    const focusValue=query<HTMLElement>('[data-eu-farming-focus-value]');
    focusValue.hidden=!focus||!layer.grid||layer.id==='drainage';
    if(focus){
      query('[data-eu-farming-focus-description]').textContent=focus.description;
      query('[data-eu-farming-focus-scope]').textContent=`${focus.period}。${focus.question}`;
      const sources=query('[data-eu-farming-focus-sources]');sources.replaceChildren();
      for(const source of focus.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.className='eu-source-link';sources.append(a);}
      if(layer.grid&&layer.id!=='drainage')void showFocusValue();
    }else focusRequest++;
    panel.hidden=!source;root!.classList.toggle('has-eu-comparison',!!source);
    const links=query<HTMLElement>('[data-eu-comparison-links]');links.replaceChildren();
    query(cultureActive()?'[data-culture-takeaway]':'[data-eu-subject-takeaway]').after(links);
    for(const item of europeComparisonLinks(state)) {
      const a=document.createElement('a');a.href=europeComparisonUrl(new URL(location.href),state,item).href;a.textContent=item.label;a.title=item.question;a.dataset.euComparisonLink=item.id;links.append(a);
    }
    if(source) {
      const sourceLayer=config.layers.find(l=>l.id===(source.layer==='overlay'?(source.returnLayer==='climate'?'wheat':source.returnLayer):source.layer))!;
      const current=climateReader()?cities.find(c=>c.id===state.city)?.name:visibleFeatures().find(f=>f.id===state.feature&&featureVisible(f.id))?.name;
      query('[data-eu-comparison-heading]').textContent=`${europeComparisonSourceLabel(source)} × ${focus?.title??current??layer.title}`;
      query('[data-eu-comparison-question]').textContent=europeComparisonQuestion(source,layer.id,state.city,state.feature,focus?.id,state.basin);
      const back=query<HTMLAnchorElement>('[data-eu-comparison-return]');back.href=europeNamedReturnUrl(new URL(location.href),source).href;back.textContent=`${europeComparisonSourceLabel(source)}の元の選択へ戻る`;
      const originalFarm=farmingPresentation(source,farmingItems);
      query('[data-eu-comparison-scope]').textContent=originalFarm.active
        ? `${sourceLayer.period}。元格子から主な集中域を抽出した概略の面で、農場や全生産域の境界ではありません。品目別の色や面積を数量比較には使いません。`
        : `${sourceLayer.period} · ${sourceLayer.unit}。${sourceLayer.note}`;
      const originalCredit=query<HTMLElement>('[data-eu-comparison-attribution]');originalCredit.hidden=!sourceLayer.attribution;originalCredit.textContent=sourceLayer.attribution??'';
      const originalLicence=query<HTMLAnchorElement>('[data-eu-comparison-licence]');originalLicence.hidden=!sourceLayer.licence;originalLicence.href=sourceLayer.licence??sourceLayer.source;
      const attribution=query<HTMLAnchorElement>('[data-eu-comparison-source]');attribution.href=originalFarm.active?new URL(location.pathname.split('/atlas/europe/')[0]+'/assets/atlas/europe/farming-overview-v2/manifest.json',location.origin).href:sourceLayer.source;attribution.textContent=originalFarm.active?'元分布の出典・抽出方法':'元の図の原典';
    }
    renderEuropeOrigin(root!,source,layer,config,map);
    // The original concentration key belongs immediately under its overlay.
    // Basin controls remain available below, without displacing that colour key.
    if(focus)query<HTMLElement>('.eu-map-stage').after(query('[data-eu-origin-key]'));
    updateFocusMarker();
  }

  function comparisonFocus(){
    const focus=readEuropeFarmingFocus(location.search,subject().id);
    if(!focus)return undefined;
    const source=readEuropeReturn(new URL(location.href).searchParams.get('europeReturn')??'',countries,ids);
    return source&&europeComparisonLinks(source).some(item=>item.id===focus.id)?focus:undefined;
  }
  async function showFocusValue(){
    const focus=comparisonFocus(),layer=subject(),token=++focusRequest;
    if(!focus||!layer.grid)return;
    const target=query<HTMLElement>('[data-eu-farming-focus-value]');
    target.textContent='比較地点の格子を確認しています…';
    try{
      const values=await gridValues(layer);
      if(token!==focusRequest||comparisonFocus()?.id!==focus.id)return;
      while(valueCache.size>3)valueCache.delete(valueCache.keys().next().value!);
      const cell=layer.gridType==='display'?displayCell(values,[...focus.point],layer.nodata):wheatCell(values,[...focus.point]);
      const text=!cell||cell.value===null?'データなし':`${cell.value.toLocaleString('ja-JP',{maximumFractionDigits:1})} ${layer.unit}`;
      target.textContent=`比較地点：${text}（${layer.period}）${cell?` · ${layer.gridType==='display'?'表示':'原'}格子中心 ${cell.center[1].toFixed(3)}°N, ${cell.center[0].toFixed(3)}°E`:''}`;
    }catch{
      if(token===focusRequest)target.textContent='比較地点の数値を取得できませんでした。表示を切り替えると再確認します。';
    }
  }
  function updateFocusMarker(){
    const marker=query<HTMLElement>('[data-eu-farming-focus-marker]'),focus=comparisonFocus();
    marker.hidden=!focus;
    if(!focus)return;
    const stage=query<HTMLElement>('.eu-map-stage').getBoundingClientRect();
    let position:{x:number;y:number};
    if(map&&liveMap.classList.contains('is-ready'))position=map.project([...focus.point] as [number,number]);
    else {
      const matrix=staticMap.getScreenCTM();if(!matrix){marker.hidden=true;return;}
      const [x,y]=project([...focus.point]),point=new DOMPoint(x,y).matrixTransform(matrix);
      position={x:point.x-stage.left,y:point.y-stage.top};
    }
    if(position.x<0||position.y<0||position.x>stage.width||position.y>stage.height){marker.hidden=true;return;}
    marker.style.left=`${position.x}px`;marker.style.top=`${position.y}px`;
    query('[data-eu-farming-focus-point-label]').textContent=focus.pointLabel;
  }

  function layers() {
    const layer=subject(),farm=farmingView();
    const climateVisible = state.layer === 'climate'||state.layer==='overlay', wheatVisible = layer.id==='wheat'&&!farm.active;
    query<SVGGElement>('[data-eu-climate-water]').style.display=climateVisible?'':'none';
    for(const id of ['climate-water','climate-water-outline'])if(map?.getLayer(id))map.setLayoutProperty(id,'visibility',climateVisible?'visible':'none');
    for (const [name, visible, url] of [['climate', climateVisible, config.climate], ['wheat', wheatVisible, config.wheat]] as const) {
      const svgImage = query<SVGImageElement>(`[data-eu-${name}-image]`);
      svgImage.style.display = visible ? '' : 'none';
      if (visible && !svgImage.getAttribute('href')) svgImage.setAttribute('href', url);
      const opacity = name === 'wheat' && state.layer === 'overlay' ? .62 : 1;
      svgImage.style.opacity = String(opacity);
      query<HTMLElement>(`[data-eu-${name}-legend]`).hidden = !visible;
      if (map?.getLayer('land')) {
        if (visible && !map.getSource(name)) {
          map.addSource(name, { type: 'image', url, coordinates: [[-25, 73], [65, 73], [65, 32], [-25, 32]] });
          map.addLayer({ id: name, type: 'raster', source: name, paint: { 'raster-opacity': opacity, 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } }, name === 'climate' && map.getLayer('wheat') ? 'wheat' : 'context');
        }
        if (map.getLayer(name)) { map.setLayoutProperty(name, 'visibility', visible ? 'visible' : 'none'); map.setPaintProperty(name, 'raster-opacity', opacity); }
      }
    }
    const custom=layer.id!=='wheat'&&layer.id!=='climate'&&!farm.active;
    const image=query<SVGImageElement>('[data-eu-subject-image]');
    image.style.display=custom&&layer.image?'':'none';image.style.opacity=state.layer==='overlay'?'.62':'1';
    if(custom&&layer.image&&image.getAttribute('href')!==layer.image)image.setAttribute('href',layer.image);
    if(map?.getLayer('land')){
      const next=custom&&layer.image?layer.id:'';
      if(loadedSubject!==next){if(loadedSubject){map.removeLayer('subject-'+loadedSubject);map.removeSource('subject-'+loadedSubject);}loadedSubject=next;
        if(next){map.addSource('subject-'+next,{type:'image',url:layer.image!,coordinates:[[-25,73],[65,73],[65,32],[-25,32]]});map.addLayer({id:'subject-'+next,type:'raster',source:'subject-'+next,paint:{'raster-resampling':'nearest','raster-fade-duration':0}},'context');}}
      if(next)map.setPaintProperty('subject-'+next,'raster-opacity',state.layer==='overlay'?.62:1);
      if(next&&map.getLayer('climate'))map.moveLayer('climate','subject-'+next);
    }
    const indicator=config.statistics.indicators.find(i=>i.id===layer.indicator);
    const fills=countries.map(c=>[c.code,indicator?layerColor(layer,indicator.values[c.code]?.['2023']??null):'#edece5'] as const);
    all<SVGElement>('[data-eu-shape]').forEach(shape=>{shape.style.fill=cultureActive()?cultureColor(null):indicator?fills.find(([code])=>code===shape.dataset.euShape)?.[1]??'#d9dcda':'transparent';});
    if(map?.getLayer('land'))map.setPaintProperty('land','fill-color',cultureActive()?cultureColor(null):indicator?['match',['get','code'],...fills.flat(),'#edece5']:'#edece5');
    paintCulture();
    updateFarmingMap(root,map,config.farmingAreas,state);
    query<SVGGElement>('[data-eu-farming-shapes]').style.display=farm.active?'':'none';
    query<HTMLElement>('[data-eu-farming-legend]').hidden=!farm.active;
    query<HTMLElement>('[data-eu-farming-list]').hidden=layer.field!=='agriculture';
    all<HTMLElement>('[data-eu-farming-children]').forEach(section=>{section.hidden=['forest','treecover'].includes(layer.id)?section.dataset.euFarmingChildren!=='forest':section.dataset.euFarmingChildren==='forest';});
    query<HTMLElement>('[data-eu-farming-toggles]').hidden=layer.field!=='agriculture'||['forest','treecover'].includes(layer.id);
    all<HTMLButtonElement>('[data-eu-toggle]').forEach(button=>{
      const enabled=button.dataset.euToggle==='crop'?state.showCrops!==false:state.showLivestock!==false;
      button.setAttribute('aria-pressed',String(enabled));
      button.querySelector('span')!.textContent=enabled?'表示中':'非表示';
      button.disabled=farm.single||!farm.active;
    });
    query<HTMLElement>('[data-eu-city-list]').hidden=!climateReader();
    query<HTMLElement>('[data-eu-water-options]').hidden=!['water','precipitation','drainage'].includes(state.layer);
    const places=visibleFeatures().filter(p=>featureVisible(p.id));
    query<HTMLElement>('[data-eu-feature-list]').hidden=!places.length;
    const choices=query('[data-eu-feature-options]');choices.replaceChildren();
    if(layer.field==='population'){
      const select=document.createElement('select');select.setAttribute('aria-label','人口地図の都市を選ぶ');select.dataset.euFeatureChoice='';
      const prompt=document.createElement('option');prompt.value='';prompt.textContent='都市を選ぶ';select.append(prompt);
      for(const place of places){const option=document.createElement('option');option.value=place.id;option.textContent=place.name;select.append(option);}
      select.value=state.feature??'';select.addEventListener('change',()=>{if(select.value)selectFeature(select.value);});choices.append(select);
    } else for(const place of places){const button=document.createElement('button');button.type='button';button.textContent=place.name;button.dataset.euFeatureSelect=place.id;button.setAttribute('aria-pressed',String(state.feature===place.id));button.addEventListener('click',()=>selectFeature(place.id));choices.append(button);}
    query<HTMLElement>('[data-eu-subject-legend]').hidden=!custom;
    query('[data-eu-legend-title]').textContent=layer.title+' · '+layer.period+' · '+layer.unit;
    const key=query('[data-eu-legend-items]');key.replaceChildren();
    if(custom){
      const labels=layer.labels??layer.colors?.map((_,i)=>i===0?`${layer.breaks![0]}未満`:i===layer.breaks!.length?`${layer.breaks![i-1]}以上`:`${layer.breaks![i-1]}〜${layer.breaks![i]}未満`)??[];
      const swatch=(color:string,label:string)=>{const d=document.createElement('div'),s=document.createElement('span'),t=document.createElement('span');s.className='eu-swatch';s.style.background=color;t.textContent=label;d.append(s,t);key.append(d);};
      labels.forEach((label,i)=>swatch(layer.colors![i],label));
      if(layer.indicator||layer.grid)swatch(layer.indicator?'#d9dcda':'repeating-linear-gradient(45deg,#fff,#fff 3px,#ccd3cc 3px,#ccd3cc 4px)','データなし');
    }
    query('[data-eu-layer-note]').textContent=layer.note;
    const credit=query<HTMLElement>('[data-eu-layer-attribution]');credit.hidden=!layer.attribution;credit.textContent=layer.attribution??'';
    const licence=query<HTMLAnchorElement>('[data-eu-layer-licence]');licence.hidden=!layer.licence;licence.href=layer.licence??layer.source;
    const manifest=query<HTMLAnchorElement>('[data-eu-layer-manifest]');manifest.hidden=!layer.manifest;manifest.href=layer.manifest??layer.source;
    query<HTMLAnchorElement>('[data-eu-layer-source]').href=layer.source;
    query<HTMLElement>('[data-eu-subject-grid]').hidden=layer.id==='wheat'||!layer.grid||farm.active&&!farm.selectedVisible;
    query('[data-eu-grid-title]').textContent=layer.title+' · '+layer.unit+' · '+layer.period;
    const layerKey=state.layer+'|'+state.returnLayer;
    if(lastLayer!==layerKey){invalidateGridReading();query('[data-eu-subject-result]').textContent='地図を押すと、その位置に対応する格子の数値を表示します。';query('[data-eu-grid-result]').textContent='地図を押すと、その格子に割り当てられた収穫面積（ha）を表示します。';lastLayer=layerKey;}
    query<HTMLElement>('[data-eu-wheat-reading]').hidden = !(layer.id==='wheat'&&(!farm.active||farm.selectedVisible));
    all<HTMLElement>('[data-eu-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.euLayer === state.layer)));
    query('[data-eu-map-title]').textContent = farm.active?(farm.single?farm.item!.name+'のみの分布':'作物・畜産の主な分布'):layer.title+(state.layer==='overlay'?'と気候を重ねる':'');
    query('#eu-map-label').textContent=layer.title+'。地図の名前から地点を選べます。';
    query<SVGGElement>('[data-eu-static-codes]').style.display=climateVisible?'':'none';
    query<SVGGElement>('[data-eu-static-codes]').removeAttribute('hidden');
    query<SVGGElement>('[data-eu-static-crops]').style.display='none';
    query<SVGGElement>('[data-eu-static-crops]').removeAttribute('hidden');
    void paintDrainage();
  }
  async function showGrid(point: number[]) {
    const layer=subject(),farm=farmingView();if(!layer.grid||farm.active&&!farm.selectedVisible)return;
    const request = ++gridRequest;
    const target = query<HTMLElement>(layer.id==='wheat'?'[data-eu-grid-result]':'[data-eu-subject-result]');
    target.textContent = '格子の数値を読み込んでいます…';
    target.setAttribute('aria-busy','true');
    try {
      const values=await gridValues(layer);
      // Keep at most three numeric grids; switching subjects does not accumulate all datasets.
      while(valueCache.size>3)valueCache.delete(valueCache.keys().next().value!);
      const cell = layer.gridType==='display'?displayCell(values,point,layer.nodata):wheatCell(values, point);
      if (request !== gridRequest) return;
      if(layer.id==='drainage'){
        delete state.feature;
        const basin=cell?.value===null?undefined:europeDrainageBasinByIndex(cell?.value);
        if(basin){state.basin=String(basin.HYBAS_ID);commit(false);}
        else {delete state.basin;commit(false);query('[data-eu-basin-summary]').textContent='この表示位置には有効な区画がありません。欠損や表示枠外を推測で補いません。';}
      }
      const valueText=!cell||cell.value===null?'データなし':layer.valueLabels?.[cell.value]??`${cell.value>0&&cell.value<.1?'0.1未満（0超）':cell.value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} ${layer.unit.replace('収穫面積 ','')}`;
      target.textContent = !cell ? '表示範囲外です。' : `${layer.gridType==='display'?'表示格子':'元格子'}中心 ${cell.center[1].toFixed(3)}°N, ${cell.center[0].toFixed(3)}°E：${valueText}（${layer.period}）`;
      target.removeAttribute('aria-busy');
    } catch (error) { console.warn('Europe grid unavailable', error); valueCache.delete(layer.grid); if (request === gridRequest) { target.textContent = '数値を読み込めませんでした。地図の分布と凡例を確認できます。別の格子を押すと再試行します。'; target.removeAttribute('aria-busy'); } }
  }

  function selectionBounds() {
    const focus=comparisonFocus();
    if(focus)return [[focus.focusBounds[0],focus.focusBounds[1]],[focus.focusBounds[2],focus.focusBounds[3]]] as [[number,number],[number,number]];
    const codes = countries.filter(c => state.place ? c.code === state.place : state.region === 'all' || c.region === state.region).map(c => c.code);
    if (state.region === 'all' && !state.place) return [[-25, 32], [65, 73]] as [[number, number], [number, number]];
    return visibleBounds(geography.features.filter(f => codes.includes(f.properties.code)).map(f => f.geometry));
  }
  function staticSymbols() {
    const scale=Math.min(staticMap.clientWidth/box[2],staticMap.clientHeight/box[3]);if(!scale)return;
    all<SVGGElement>('[data-eu-point],[data-eu-feature-point]').forEach(g=>{const id=g.dataset.euPoint??g.dataset.euFeaturePoint;const p=[...cities,...features].find(p=>p.id===id);if(!p)return;const [x,y]=project(p.coordinates);g.querySelector('circle')?.setAttribute('r',String(5/scale));const label=g.querySelector('text');label?.setAttribute('x',String(x+9/scale));label?.setAttribute('y',String(y-9/scale));if(label)label.style.fontSize=12/scale+'px';});
  }
  function fit() {
    if(cultureActive()&&cultureData.features.length){fitCulture(cultureBounds(cultureData));return;}
    const bounds = selectionBounds();
    const [left, bottom] = project(bounds[0]);
    const [right, top] = project(bounds[1]);
    const width = Math.max(right - left, 24), height = Math.max(bottom - top, 24);
    box = [(left + right - width) / 2 - width * .12, (top + bottom - height) / 2 - height * .12, width * 1.24, height * 1.24];
    if (state.region === 'all' && !state.place&&!comparisonFocus()) box = [0, 0, frame.width, frame.height];
    staticMap.setAttribute('viewBox', box.join(' '));
    staticSymbols();
    map?.fitBounds(bounds, { padding: {top:20,bottom:42,left:14,right:14}, maxZoom: 7, duration: reduced ? 0 : 450 });
    annotations.refresh();
    updateFocusMarker();
  }
  function render(refit = false) {
    query<HTMLElement>('[data-eu-farm-candidates]').hidden=true;
    const currentField=fields.find(field=>field.id===subject().field)!;
    query('[data-eu-field-label]').textContent=currentField.label;
    query('[data-eu-field-kicker]').textContent='EUROPE · '+currentField.id.toUpperCase();
    query('[data-eu-field-heading]').textContent=europeFieldHeadings[currentField.id];
    query<HTMLElement>('.eu-workspace').dataset.field=currentField.id==='nature'?'natural':currentField.id;
    all<HTMLElement>('[data-eu-topic-field]').forEach(group=>{group.hidden=group.dataset.euTopicField!==currentField.id;});
    const topic=subject().id;
    query<HTMLElement>('[data-eu-culture-host]').hidden=!cultureActive();
    query<HTMLElement>('[data-eu-culture-controls-host]').hidden=!cultureActive();
    root!.classList.toggle('is-eu-culture-reading',cultureActive());
    if(cultureActive()){
      if(cultureReader.dataset.cultureTopic!==topic)culture.setTopic(topic as 'ethnicity'|'religion');
      const previous=culture.readState();
      if(['cultureCase','cultureCategory','cultureArea'].some(key=>state[key as keyof EuropeState]!==undefined&&state[key as keyof EuropeState]!==previous[key as keyof typeof previous]))culture.applyState(state);
      Object.assign(state,culture.readState());
      if(!cultureRunning){cultureRunning=true;culture.setActive(true);}
      const selected=cultureSelection(culture.readState(),topic as 'ethnicity'|'religion');
      query('[data-culture-takeaway]').textContent=selected.censusCase.grain==='LAD'?'イングランド・ウェールズで自己申告分類の地域差を読む事例です。欧州全域の分布ではありません。':'クロアチアの自己申告分類を全国値で読む事例です。行政区と同じ粒度では比較しません。';
    }else if(cultureRunning){cultureRunning=false;culture.setActive(false);}
    const selectedTopic=currentField.id==='agriculture'?(['forest','treecover'].includes(topic)?'treecover':'crops'):currentField.id==='population'?(cultureActive()?topic:'density'):['precipitation','drainage'].includes(topic)?'water':topic;
    const selectedIndustry=topic==='hubs'?config.readings.find(reading=>reading.id===state.feature&&reading.field==='industry'):undefined;
    all<HTMLElement>('[data-eu-topic]').forEach(button=>{
      const representative=config.readings.find(reading=>reading.id===button.dataset.euTopicFeature);
      const selected=button.closest('[data-eu-water-options]')?topic:selectedTopic;
      const active=representative?topic==='hubs'&&selectedIndustry?.group===representative.group:button.dataset.euTopic===selected&&!(topic==='hubs'&&selectedIndustry);
      button.setAttribute('aria-pressed',String(active));
    });
    all<HTMLSelectElement>('[data-eu-layer-choice]').forEach(select=>{
      const irrelevant=cultureActive()&&select.dataset.euLayerChoice==='population';
      select.closest('label')!.hidden=irrelevant;select.disabled=irrelevant;
      if(!irrelevant)select.value=select.dataset.euLayerChoice===currentField.id?topic:select.options[0].value;
    });
    document.title=`欧州の${currentField.label}｜Insight Journal`;
    const canonical=writeEuropeState(new URL(location.href),state);
    if(canonical.pathname!==location.pathname||cultureActive()&&canonical.href!==location.href)history.replaceState({},'',canonical);
    const active = [state.city];
    const place = countries.find(c => c.code === state.place);
    query('[data-eu-focus]').textContent = `${place?.name ?? regionNames[state.region]} · ${subject().period}${state.place === 'RUS' ? subject().indicator?' · 数値はロシア全土':' · 地図は表示枠内のみ' : ''}`;
    if(cultureActive())query('[data-eu-focus]').textContent=`${cultureSelection(culture.readState(),topic as 'ethnicity'|'religion').area.name} · 2021年国勢調査`;
    all<HTMLButtonElement>('[data-eu-region]').forEach(button => {
      button.setAttribute('aria-pressed',String(!cultureActive()&&button.dataset.euRegion===state.region));
      button.disabled=cultureActive();
      button.title=cultureActive()?'この事例の表示範囲は地図下の「事例」で選びます。':'';
    });
    all<SVGElement>('[data-eu-shape]').forEach(shape => shape.classList.toggle('is-selected', shape.dataset.euShape === state.place));
    all<HTMLElement>('[data-city-card]').forEach(card => { card.hidden = !active.includes(card.dataset.cityCard!); card.style.order = String(active.indexOf(card.dataset.cityCard!)); });
    all<HTMLElement>('[data-city-reading]').forEach(card=>{card.hidden=card.dataset.cityReading!==state.city;});
    all<HTMLElement>('[data-eu-city-select]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.euCitySelect===state.city)));
    query<HTMLSelectElement>('[data-eu-city-choice]').value=state.city;
    const city=cities.find(city=>city.id===state.city);
    query('#eu-city-heading').textContent=city?`${city.name}の気候と農畜産`:'気候の読み方：観測地点未選択';
    query<HTMLElement>('[data-eu-capital-missing]').hidden=!!city;
    query('[data-eu-capital-missing]').textContent=`対象国：${place?.name??'未選択'}。首都の観測値は未収録です。地図下の都市一覧から、収録済みの観測地点を選べます。`;
    query<HTMLElement>('[data-eu-climate-statistics-link]').hidden=!city;
    all<SVGElement>('[data-eu-point]').forEach(point => {point.classList.toggle('is-active', active.includes(point.dataset.euPoint!));point.style.display=climateReader()?'':'none';point.removeAttribute('hidden');});
    all<SVGElement>('[data-eu-feature-point]').forEach(p=>{p.style.display=featureVisible(p.dataset.euFeaturePoint!)?'':'none';p.removeAttribute('hidden');p.classList.toggle('is-active',p.dataset.euFeaturePoint===state.feature);});
    if (map?.getLayer('selected')) map.setFilter('selected', ['==', ['get', 'code'], state.place]);
    all<HTMLAnchorElement>('[data-base-map]').forEach(a => { a.href = writeEuropeState(new URL(a.href), state).href; });
    all<HTMLAnchorElement>('[data-eu-field]').forEach(a => { a.href = writeEuropeState(new URL(a.href), { ...state, layer: a.dataset.euField! }).href;if(a.dataset.euField===currentField.initial)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
    query<HTMLButtonElement>('[data-eu-render]').textContent = failed || state.render === 'static' ? '操作地図' : '簡易表示';
    query<HTMLButtonElement>('[data-eu-render]').setAttribute('aria-label',failed||state.render==='static'?'操作できる地図に戻す':'簡易表示にする');
    layers();
    updateReader();
    updateComparison();
    query<HTMLElement>('.eu-read-panel').setAttribute('aria-labelledby',cultureActive()?'eu-culture-reader-title':climateReader()?'eu-city-heading':'eu-subject-title');
    const farm=farmingView();
    const guidance=climateReader()?'都市名を押すと、右の説明・雨温図と、下の月別数値が切り替わります。':cultureActive()?'地図下で事例・分類・行政区を選び、同じ表の総人口に対する割合を読みます。':farm.active?farm.single?`${farm.item!.name}だけを表示中です。元の表示には右側のボタンで戻れます。`:!farm.visible.length?'作物・畜産の分布は非表示です。左上のボタンで表示できます。':farm.item&&!farm.selectedVisible?`${farm.item.name}の分布は非表示です。選択した説明は右側に表示しています。`:'品目名を選ぶと、その分布全体の輪郭を強調します。重なる場所では候補を選べます。':visibleFeatures().length?'地図の名前を押すと、その場所の説明を表示します。':subject().grid?'地図を押すと、その位置の値を画面下部に表示します。':subject().indicator?'国を押すと、画面下部に国全体の数値を表示します。':'地図の凡例と右側の説明を読み比べます。';
    status.textContent=(failed?'簡易地図で表示中。':'')+guidance;
    query<HTMLElement>('[data-eu-statistics]').hidden=all<HTMLElement>('[data-eu-statistics] > *').every(section=>section.hidden);
    all<HTMLElement>('[data-eu-extra-field]').forEach(el=>{el.hidden=el.dataset.euExtraField!==currentField.id;});
    requestAnimationFrame(() => { sizeReader(); map?.resize(); if (refit) fit(); annotations.refresh(); });
  }
  function invalidateGridReading() {
    gridRequest++;
    for(const selector of ['[data-eu-grid-result]','[data-eu-subject-result]']){
      const result=query<HTMLElement>(selector);
      if(result.getAttribute('aria-busy')==='true'||state.layer==='drainage'&&selector==='[data-eu-subject-result]')result.textContent=selector==='[data-eu-grid-result]'?'地図を押すと、その格子に割り当てられた収穫面積（ha）を表示します。':'地図を押すと、その位置に対応する格子の数値を表示します。';
      result.removeAttribute('aria-busy');
    }
  }
  function commit(refit = false, keepFocus = false) { invalidateGridReading();const focus=keepFocus?comparisonFocus():undefined;history.pushState({}, '', writeEuropeFarmingFocus(writeEuropeState(new URL(location.href), state),focus?.id)); render(refit); }
  function selectCountry(code: string) {
    const country = countries.find(c => c.code === code);
    state.place = country?.code ?? '';
    if(state.farmCompare){state.farmCompare=state.farmCompare.filter(code=>code!==state.place);if(!state.farmCompare.length)delete state.farmCompare;}
    delete state.feature;
    if (country) {
      state.region = country.region;
      state.city=defaultEuropeCity(code,ids);state.compare=[];
    }
    commit(true);
  }
  function selectCity(id: string) {
    const city = cities.find(c => c.id === id);
    if (!city) return;
    state.city = id;
    delete state.feature;
    state.compare = [];
    commit(false);
  }
  function returnOverview() {
    if(subject().field==='agriculture'){state.layer='crops';delete state.single;}
    else delete state.feature;
    query<HTMLElement>('[data-eu-farm-candidates]').hidden=true;
    commit(false);
  }
  function mapSelection(point:number[]) {
    const farm=farmingView();
    if(!farm.active){void showGrid(point);return;}
    const candidates=farmingAtPoint(config.farmingAreas,point,farm.visible.map(item=>item.id));
    const panel=query<HTMLElement>('[data-eu-farm-candidates]');panel.replaceChildren();panel.hidden=true;
    if(candidates.length===1){if(state.layer!==candidates[0].id)setLayer(candidates[0].id);void showGrid(point);return;}
    if(candidates.length>1){
      const text=document.createElement('p');text.textContent='この位置では分布が重なっています。読みたい品目を選んでください。';panel.append(text);
      for(const item of candidates){const button=document.createElement('button');button.type='button';button.textContent=item.name;button.addEventListener('click',()=>{setLayer(item.id);void showGrid(point);});panel.append(button);}
      panel.hidden=false;panel.querySelector('button')?.focus({preventScroll:true});
      status.textContent='分布が重なっています。地図下の候補から品目を選んでください。';return;
    }
    if(farm.single)void showGrid(point);
    else if(farm.item)returnOverview();
  }
  function disposeMap() {
    generation++;
    clearTimeout(loadTimer);
    loadedSubject='';
    map?.remove(); map = undefined;
    liveMap.classList.remove('is-ready'); staticMap.style.visibility = 'visible';
  }
  function fallback() {
    disposeMap(); failed = true;
    render(true);
  }
  async function startMap() {
    if (state.render === 'static') { fallback(); return; }
    failed = false;
    const token = ++generation;
    try {
      const [libre] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
      if (token !== generation || state.render === 'static') return;
      libre.setWorkerUrl(workerUrl);
      // Allow vertical letterboxing on phones without forcing Iceland out of view.
      map = new libre.Map({ container: liveMap, style: { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#e7eff1' } }] }, bounds: [[-25, 32], [65, 73]], fitBoundsOptions: { padding: 30 }, maxBounds: [[-60, 0], [100, 85]], minZoom: .4, maxZoom: 8, attributionControl: false, scrollZoom: false, dragRotate: false, pitchWithRotate: false, touchPitch: false });
      map.touchZoomRotate.disableRotation();
      loadTimer = setTimeout(() => { if (token === generation) fallback(); }, 15000);
      if (matchMedia('(pointer: coarse)').matches) map.dragPan.disable();
      // The map footer and source sections provide attribution for the local datasets.
      map.on('move',()=>{annotations.refresh(false);updateFocusMarker();});
      map.on('moveend',()=>{annotations.refresh();updateFocusMarker();});
      map.on('error', () => { if (!failed && token === generation) fallback(); });
      map.getCanvas().addEventListener('webglcontextlost', fallback, { once: true });
      map.on('load', () => {
        if (token !== generation || !map) return;
        clearTimeout(loadTimer);
        map.addSource('countries', { type: 'geojson', data: geography as any });
        map.addLayer({ id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': '#edece5' } });
        map.addLayer({ id: 'context', type: 'fill', source: 'countries', filter: ['==', ['get', 'kind'], 'context'], paint: { 'fill-color': '#e9e6dc', 'fill-opacity': .55 } });
        map.addLayer({ id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': '#536a6f', 'line-width': .7 } });
        map.addSource('climate-water',{type:'geojson',data:config.climateWater as any});
        map.addLayer({id:'climate-water',type:'fill',source:'climate-water',paint:{'fill-color':'#e7eff1'}});
        map.addLayer({id:'climate-water-outline',type:'line',source:'climate-water',paint:{'line-color':'#8ca6aa','line-width':.7}});
        map.addLayer({ id: 'selected', type: 'line', source: 'countries', filter: ['==', ['get', 'code'], state.place], paint: { 'line-color': '#173c48', 'line-width': 3 } });
        map.on('click', 'land', e => { const code = e.features?.[0]?.properties?.code; if (subject().indicator && countries.some(c => c.code === code)) selectCountry(code); });
        map.on('click','eu-culture-fill',e=>{if(cultureActive()){const code=e.features?.[0]?.properties?.code;if(typeof code==='string')culture.selectArea(code);}});
        map.on('click', e => { mapSelection([e.lngLat.lng, e.lngLat.lat]); });
        liveMap.classList.add('is-ready'); staticMap.style.visibility = 'hidden'; status.textContent = '地図の名前から地点を選べます。';
        render(true);
      });
    } catch { if (token === generation) fallback(); }
  }
  all<SVGImageElement>('image').forEach(img=>img.addEventListener('error',()=>{if(img.style.display!=='none')status.textContent='地図画像を取得できませんでした。出典・解説・国別の数値は確認できます。主題を選び直すか、通常地図への再試行を使ってください。';}));
  all<HTMLElement>('[data-eu-region]').forEach(button => button.addEventListener('click', () => { state.region = button.dataset.euRegion!; state.place = ''; delete state.feature;commit(true); }));
  all<SVGElement>('[data-eu-shape]').forEach(shape => shape.addEventListener('click', () => { if (subject().indicator) selectCountry(shape.dataset.euShape!); }));
  staticMap.addEventListener('click', event => {
    if (state.layer === 'climate') return;
    const transform = staticMap.getScreenCTM(); if (!transform) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    mapSelection(unproject([point.x, point.y]));
  });
  all<HTMLElement>('[data-eu-layer]').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.euLayer!)));
  all<HTMLElement>('[data-eu-topic]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.euTopicFeature){
      const representative=config.readings.find(reading=>reading.id===button.dataset.euTopicFeature)!;
      state.layer='hubs';state.feature=representative.id;state.place=representative.country;
      state.region=countries.find(country=>country.code===representative.country)?.region??'all';
      delete state.single;commit(true);
    }
    else {if(subject().field==='industry')delete state.feature;setLayer(button.dataset.euTopic!);}
  }));
  all<HTMLSelectElement>('[data-eu-layer-choice]').forEach(select=>select.addEventListener('change',()=>{
    if(config.layers.some(layer=>layer.id===select.value&&layer.field===select.dataset.euLayerChoice))setLayer(select.value);
  }));
  all<HTMLElement>('[data-eu-city-select]').forEach(button=>button.addEventListener('click',()=>selectCity(button.dataset.euCitySelect!)));
  query<HTMLSelectElement>('[data-eu-city-choice]').addEventListener('change',event=>selectCity((event.target as HTMLSelectElement).value));
  all<HTMLElement>('[data-eu-toggle]').forEach(button=>button.addEventListener('click',()=>{
    if(button.dataset.euToggle==='crop')state.showCrops=state.showCrops===false;
    else state.showLivestock=state.showLivestock===false;
    query<HTMLElement>('[data-eu-farm-candidates]').hidden=true;commit(false);
  }));
  query('[data-eu-single]').addEventListener('click',()=>{if(farmingView().item){state.single=true;commit(false);}});
  query('[data-eu-reading-focus]').addEventListener('click',()=>{if(subject().id==='wheat'){state.single=true;selectCountry('GBR');}});
  query('[data-eu-return-multi]').addEventListener('click',()=>{delete state.single;commit(false);});
  query('[data-eu-overview]').addEventListener('click',returnOverview);
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){
    if(farmingView().item||state.feature)returnOverview();
    query<HTMLElement>('[data-eu-farm-candidates]').hidden=true;
    query<HTMLElement>('.eu-map-stage').focus({preventScroll:true});
  }});
  query('[data-eu-reset]').addEventListener('click', () => { state.region = 'all'; state.place = ''; delete state.feature;commit(true); });
  drainageChoice.addEventListener('change',()=>{state.basin=normaliseEuropeDrainageBasin(drainageChoice.value);delete state.feature;commit(false);});
  query('[data-eu-drainage-clear]').addEventListener('click',()=>{delete state.basin;delete state.feature;commit(false);query('[data-eu-basin-summary]').textContent='色は区画を見分けるための識別色です。量の大小ではありません。';});
  all<HTMLElement>('[data-eu-zoom]').forEach(button => button.addEventListener('click', () => {
    const factor = button.dataset.euZoom === 'in' ? .7 : 1 / .7;
    if (map) { factor < 1 ? map.zoomIn() : map.zoomOut(); return; }
    const w = Math.min(frame.width * 2, Math.max(24, box[2] * factor));
    const h = w / box[2] * box[3]; box = [box[0] + (box[2] - w) / 2, box[1] + (box[3] - h) / 2, w, h]; staticMap.setAttribute('viewBox', box.join(' '));staticSymbols();annotations.refresh();updateFocusMarker();
  }));
  query('[data-eu-render]').addEventListener('click', () => { state.render = failed || state.render === 'static' ? 'auto' : 'static'; disposeMap(); commit(true,true); void startMap(); });
  window.addEventListener('popstate', () => { invalidateGridReading();const previousRender = state.render; state = readEuropeState(location.search, countries, ids, config.initialLayer); state.compare=[]; render(true); if (previousRender !== state.render) { disposeMap(); void startMap(); } });
  new ResizeObserver(()=>{staticSymbols();sizeReader();updateFocusMarker();}).observe(staticMap);
  render(true); void startMap();
}
