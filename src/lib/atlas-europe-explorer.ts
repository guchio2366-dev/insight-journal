import { frame, project, unproject, wheatCell, displayCell, visibleBounds, readEuropeState, writeEuropeState } from './atlas-europe-view';
import { layerColor, fields, europeFieldHeadings, type EuropeLayer } from '../data/atlas/europe/layers';
import type { EuropeReading } from '../data/atlas/europe/readings';
import type { Geometry } from './atlas-europe-geometry';
import type { Map as LibreMap } from 'maplibre-gl';
import { createEuropeAnnotations } from './atlas-europe-annotations';
import { europeReaderCopy } from './atlas-europe-reader';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
type Country = { code: string; name: string; region: string };
type City = { id: string; name: string; country: string; coordinates: [number, number] };
type Feature = { type: 'Feature'; properties: { code: string; kind: string }; geometry: Geometry };
type Place = City & {rank?:number;capital?:boolean};
type Indicator = {id:string;label:string;unit:string;year:number;values:Record<string,Record<string,number|null>>;sourceUrl:string};

export function initEuropeAtlas() {
  const root = document.querySelector<HTMLElement>('[data-europe-detail]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const config = JSON.parse(root.querySelector('[data-eu-config]')!.textContent!) as { countries: Country[]; cities: City[]; geography: { type: 'FeatureCollection'; features: Feature[] }; climate: string; wheat: string; wheatValues: string; initialLayer: string; layers:EuropeLayer[];populationCities:Place[];readings:EuropeReading[];statistics:{indicators:Indicator[]} };
  const { countries, cities, geography } = config;
  const query = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const all = <T extends Element>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
  const staticMap = query<SVGSVGElement>('[data-eu-static]');
  const liveMap = query<HTMLElement>('[data-eu-live]');
  const status = query<HTMLElement>('[data-eu-map-status]');
  const ids = cities.map(c => c.id);
  let state = readEuropeState(location.search, countries, ids, config.initialLayer);
  state.compare=[]; // Legacy comparison URLs open the primary city's adjacent chart.
  const valueCache = new Map<string, Promise<Float32Array>>();
  let gridRequest = 0;
  let map: LibreMap | undefined;
  let loadedSubject = '';
  let lastLayer = '';
  let generation = 0;
  let box = [0, 0, frame.width, frame.height];
  let failed = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  const regionNames: Record<string, string> = { all: '欧州全体', north: '北欧', west: '西欧', south: '南欧', east: '東欧' };

  const subject = () => config.layers.find(l=>l.id===(state.layer==='overlay'?(state.returnLayer==='climate'?'wheat':state.returnLayer):state.layer)) ?? config.layers[0];
  const climateReader = () => state.layer==='climate'||state.layer==='overlay';
  const features = [...config.populationCities,...config.readings];
  const visibleFeatures = () => subject().field==='population' ? config.populationCities : subject().field==='industry' ? config.readings.filter(r=>r.field==='industry') : subject().field==='nature'&&state.layer!=='climate' ? config.readings.filter(r=>r.field==='nature'&&r.layer===(state.layer==='water'?'water':'terrain')) : [];
  const featureVisible = (id:string) => {
    const p=visibleFeatures().find(p=>p.id===id); if(!p)return false;
    if(state.place)return p.country===state.place;
    if(state.region!=='all' && countries.find(c=>c.code===p.country)?.region!==state.region)return false;
    return !('rank' in p) || (p.rank??0)<=(state.region==='all'?1:3) || p.id===state.feature;
  };
  const annotations=createEuropeAnnotations(query<HTMLElement>('.eu-map-stage'),cities,features,
    ()=>({climate:climateReader(),city:state.city,feature:state.feature,detailed:map&&liveMap.classList.contains('is-ready')?map.getBounds().getEast()-map.getBounds().getWest()<60:box[2]<frame.width*.65,places:visibleFeatures().filter(p=>featureVisible(p.id))}),
    coordinate=>{
      if(map&&liveMap.classList.contains('is-ready'))return map.project(coordinate as [number,number]);
      const [x,y]=project(coordinate), matrix=staticMap.getScreenCTM(),rect=query<HTMLElement>('.eu-map-stage').getBoundingClientRect();
      const point=matrix?new DOMPoint(x,y).matrixTransform(matrix):new DOMPoint();
      return {x:point.x-rect.left,y:point.y-rect.top};
    },(kind,id)=>kind==='city'?selectCity(id):selectFeature(id));
  function setLayer(id:string) {
    if(id==='overlay' && state.layer!=='overlay')state.returnLayer=state.layer;
    state.layer=id;delete state.feature;commit(false);
  }
  function selectFeature(id:string) {
    const p=features.find(p=>p.id===id);if(!p)return;
    state.feature=id;commit(false);
  }
  function updateReader() {
    const layer=subject(),copy=europeReaderCopy(layer);
    query<HTMLElement>('[data-eu-climate-reader]').hidden=!climateReader();
    query<HTMLElement>('[data-eu-subject-reader]').hidden=climateReader();
    query('[data-eu-subject-title]').textContent=copy.title;
    query('[data-eu-subject-takeaway]').textContent=copy.takeaway;
    query('[data-eu-subject-intro]').textContent=copy.body;
    query('[data-eu-subject-note]').textContent=copy.note;
    const feature=visibleFeatures().find(p=>p.id===state.feature);
    query<HTMLElement>('[data-eu-subject-intro]').hidden=!!feature;
    const card=query<HTMLElement>('[data-eu-feature-card]');card.replaceChildren();card.hidden=!feature;
    if(feature){
      const heading=document.createElement('h3');heading.textContent=feature.name;card.append(heading);
      const add=(text:string)=>{const p=document.createElement('p');p.textContent=text;card.append(p);};
      if('body' in feature){add(feature.body);const a=document.createElement('a');a.href=feature.source;a.textContent=feature.sourceLabel+' · '+feature.period;a.className='eu-source-link';card.append(a);}
      else add(`${countries.find(c=>c.code===feature.country)?.name}の${feature.capital?'首都':'都市'}です。都市の点は位置を示し、人口の大小を表すものではありません。`);
    }
    const country=countries.find(c=>c.code===state.place);
    query<HTMLElement>('[data-eu-country-reader]').hidden=!country||layer.field==='nature';
    query('[data-eu-country-title]').textContent=country?country.name+'の国全体の数値':'';
    const panel=query('[data-eu-national-values]');panel.replaceChildren();
    const preferred=layer.field==='population'?['population','urban']:layer.field==='industry'?['manufacturing','industry','services']:['forest','agrishare'];
    if(country&&layer.field!=='nature')for(const id of preferred){const ind=config.statistics.indicators.find(i=>i.id===id)!;const value=ind.values[country.code]?.['2023'];const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),a=document.createElement('a');a.href=ind.sourceUrl;a.textContent=ind.label;dt.append(a);dd.textContent=value==null?'データなし':value.toLocaleString('ja-JP',{maximumFractionDigits:id==='population'?0:2})+' '+ind.unit;row.append(dt,dd);panel.append(row);}
  }

  function layers() {
    const layer=subject();
    const climateVisible = state.layer === 'climate'||state.layer==='overlay', wheatVisible = layer.id==='wheat';
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
    const custom=layer.id!=='wheat'&&layer.id!=='climate';
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
    all<SVGElement>('[data-eu-shape]').forEach(shape=>{shape.style.fill=indicator?fills.find(([code])=>code===shape.dataset.euShape)?.[1]??'#d9dcda':'transparent';});
    if(map?.getLayer('land'))map.setPaintProperty('land','fill-color',indicator?['match',['get','code'],...fills.flat(),'#edece5']:'#edece5');
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
    query<HTMLAnchorElement>('[data-eu-layer-source]').href=layer.source;
    query<HTMLElement>('[data-eu-subject-grid]').hidden=!custom||!layer.grid;
    query('[data-eu-grid-title]').textContent=layer.title+' · '+layer.unit;
    const layerKey=state.layer+'|'+state.returnLayer;
    if(lastLayer!==layerKey){gridRequest++;query('[data-eu-subject-result]').textContent='地図を押すと、その位置に対応する格子の数値を表示します。';query('[data-eu-grid-result]').textContent='地図を押すと、その格子に割り当てられた収穫面積（ha）を表示します。';lastLayer=layerKey;}
    query<HTMLElement>('[data-eu-wheat-reading]').hidden = !wheatVisible;
    all<HTMLElement>('[data-eu-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.euLayer === state.layer)));
    query('[data-eu-map-title]').textContent = layer.title+(state.layer==='overlay'?'と気候を重ねる':'');
    query('#eu-map-label').textContent=layer.title+'。地図の名前から地点を選べます。';
    query<SVGGElement>('[data-eu-static-codes]').style.display=climateVisible?'':'none';
    query<SVGGElement>('[data-eu-static-codes]').removeAttribute('hidden');
  }
  async function showGrid(point: number[]) {
    const layer=subject();if(!layer.grid)return;
    const request = ++gridRequest;
    const target = query<HTMLElement>(layer.id==='wheat'?'[data-eu-grid-result]':'[data-eu-subject-result]');
    target.textContent = '格子の数値を読み込んでいます…';
    try {
      if(!valueCache.has(layer.grid))valueCache.set(layer.grid,fetch(layer.grid).then(async r => {
        if (!r.ok || !r.body) throw new Error('Wheat values unavailable');
        const bytes = new Uint8Array(await r.arrayBuffer());
        const buffer = bytes[0] === 0x1f && bytes[1] === 0x8b
          ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
          : bytes.buffer;
        if (buffer.byteLength !== (layer.gridType==='display'?1800*1502:1080*492) * (layer.encoding==='int16'?2:4)) throw new Error('Invalid Europe grid');
        return layer.encoding==='int16'?Float32Array.from(new Int16Array(buffer)):new Float32Array(buffer);
      }));
      const values=await valueCache.get(layer.grid)!;
      // Keep at most three numeric grids; switching subjects does not accumulate all datasets.
      while(valueCache.size>3)valueCache.delete(valueCache.keys().next().value!);
      const cell = layer.gridType==='display'?displayCell(values,point,layer.nodata):wheatCell(values, point);
      if (request !== gridRequest) return;
      target.textContent = !cell ? '表示範囲外です。' : `${layer.gridType==='display'?'表示格子':'元格子'}中心 ${cell.center[1].toFixed(3)}°N, ${cell.center[0].toFixed(3)}°E：${cell.value === null ? 'データなし' : `${cell.value>0&&cell.value<.1?'0.1未満（0超）':cell.value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} ${layer.unit.replace('収穫面積 ','')}`}（${layer.period}）`;
    } catch (error) { console.warn('Europe grid unavailable', error); valueCache.delete(layer.grid); if (request === gridRequest) target.textContent = '数値を読み込めませんでした。地図の分布と凡例を確認できます。別の格子を押すと再試行します。'; }
  }

  function selectionBounds() {
    const codes = countries.filter(c => state.place ? c.code === state.place : state.region === 'all' || c.region === state.region).map(c => c.code);
    if (state.region === 'all' && !state.place) return [[-25, 32], [65, 73]] as [[number, number], [number, number]];
    return visibleBounds(geography.features.filter(f => codes.includes(f.properties.code)).map(f => f.geometry));
  }
  function staticSymbols() {
    const scale=Math.min(staticMap.clientWidth/box[2],staticMap.clientHeight/box[3]);if(!scale)return;
    all<SVGGElement>('[data-eu-point],[data-eu-feature-point]').forEach(g=>{const id=g.dataset.euPoint??g.dataset.euFeaturePoint;const p=[...cities,...features].find(p=>p.id===id);if(!p)return;const [x,y]=project(p.coordinates);g.querySelector('circle')?.setAttribute('r',String(5/scale));const label=g.querySelector('text');label?.setAttribute('x',String(x+9/scale));label?.setAttribute('y',String(y-9/scale));if(label)label.style.fontSize=12/scale+'px';});
  }
  function fit() {
    const bounds = selectionBounds();
    const [left, bottom] = project(bounds[0]);
    const [right, top] = project(bounds[1]);
    const width = Math.max(right - left, 24), height = Math.max(bottom - top, 24);
    box = [(left + right - width) / 2 - width * .12, (top + bottom - height) / 2 - height * .12, width * 1.24, height * 1.24];
    if (state.region === 'all' && !state.place) box = [0, 0, frame.width, frame.height];
    staticMap.setAttribute('viewBox', box.join(' '));
    staticSymbols();
    map?.fitBounds(bounds, { padding: {top:20,bottom:42,left:14,right:14}, maxZoom: 7, duration: reduced ? 0 : 450 });
    annotations.refresh();
  }
  function render(refit = false) {
    const currentField=fields.find(field=>field.id===subject().field)!;
    query('[data-eu-field-label]').textContent=currentField.label;
    query('[data-eu-field-kicker]').textContent='EUROPE · '+currentField.id.toUpperCase();
    query('[data-eu-field-heading]').textContent=europeFieldHeadings[currentField.id];
    query<HTMLElement>('.eu-workspace').dataset.field=currentField.id==='nature'?'natural':currentField.id;
    all<HTMLElement>('[data-eu-topic-field]').forEach(group=>{group.hidden=group.dataset.euTopicField!==currentField.id;});
    const topic=subject().id;
    const selectedTopic=currentField.id==='agriculture'?(topic==='forest'?'forest':['cattle','pig','chicken','sheep'].includes(topic)?'cattle':'wheat'):currentField.id==='industry'?(topic==='services'?'services':'hubs'):currentField.id==='population'?'density':topic;
    all<HTMLElement>('[data-eu-topic]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.euTopic===selectedTopic)));
    document.title=`欧州の${currentField.label}｜Insight Journal`;
    const canonical=writeEuropeState(new URL(location.href),state);
    if(canonical.pathname!==location.pathname)history.replaceState({},'',canonical);
    const active = [state.city];
    const place = countries.find(c => c.code === state.place);
    query('[data-eu-focus]').textContent = `${place?.name ?? regionNames[state.region]} · ${subject().period}${state.place === 'RUS' ? subject().indicator?' · 数値はロシア全土':' · 地図は表示枠内のみ' : ''}`;
    all<HTMLElement>('[data-eu-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.euRegion === state.region)));
    all<SVGElement>('[data-eu-shape]').forEach(shape => shape.classList.toggle('is-selected', shape.dataset.euShape === state.place));
    all<HTMLElement>('[data-city-card]').forEach(card => { card.hidden = !active.includes(card.dataset.cityCard!); card.style.order = String(active.indexOf(card.dataset.cityCard!)); });
    all<SVGElement>('[data-eu-point]').forEach(point => {point.classList.toggle('is-active', active.includes(point.dataset.euPoint!));point.style.display=climateReader()?'':'none';point.removeAttribute('hidden');});
    all<SVGElement>('[data-eu-feature-point]').forEach(p=>{p.style.display=featureVisible(p.dataset.euFeaturePoint!)?'':'none';p.removeAttribute('hidden');p.classList.toggle('is-active',p.dataset.euFeaturePoint===state.feature);});
    if (map?.getLayer('selected')) map.setFilter('selected', ['==', ['get', 'code'], state.place]);
    all<HTMLAnchorElement>('[data-base-map]').forEach(a => { a.href = writeEuropeState(new URL(a.href), state).href; });
    all<HTMLAnchorElement>('[data-eu-field]').forEach(a => { a.href = writeEuropeState(new URL(a.href), { ...state, layer: a.dataset.euField! }).href;if(a.dataset.euField===currentField.initial)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
    query<HTMLButtonElement>('[data-eu-render]').textContent = failed || state.render === 'static' ? '操作できる地図に戻す' : '簡易表示にする';
    layers();
    updateReader();
    query<HTMLElement>('.eu-read-panel').setAttribute('aria-labelledby',climateReader()?'eu-city-heading':'eu-subject-title');
    if(!failed)status.textContent=climateReader()?'都市名を押すと、雨温図を表示します。拡大すると、ほかの都市名も表示します。':visibleFeatures().length?'地図の名前を押すと、その場所の説明を表示します。':subject().grid?'地図を押すと、その位置の値を地図の下に表示します。':'国を押すと、国全体の数値を表示します。';
    all<HTMLElement>('[data-eu-extra-field]').forEach(el=>{el.hidden=el.dataset.euExtraField!==currentField.id;});
    requestAnimationFrame(() => { map?.resize(); if (refit) fit(); annotations.refresh(); });
  }
  function commit(refit = false) { history.pushState({}, '', writeEuropeState(new URL(location.href), state)); render(refit); }
  function selectCountry(code: string) {
    const country = countries.find(c => c.code === code);
    state.place = country?.code ?? '';
    delete state.feature;
    if (country) {
      state.region = country.region;
      const city = cities.find(c => c.country === code);
      if (city) { state.city = city.id; state.compare = state.compare.filter(id => id !== city.id); }
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
  function disposeMap() {
    generation++;
    clearTimeout(loadTimer);
    loadedSubject='';
    map?.remove(); map = undefined;
    liveMap.classList.remove('is-ready'); staticMap.style.visibility = 'visible';
  }
  function fallback() {
    disposeMap(); failed = true;
    status.textContent = '簡易地図で表示中。地図の名前から雨温図や解説を表示できます。';
    query<HTMLButtonElement>('[data-eu-render]').textContent = '操作できる地図を再試行';
    fit();
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
      map.on('move',()=>annotations.refresh(false));
      map.on('moveend',()=>annotations.refresh());
      map.on('error', () => { if (!failed && token === generation) fallback(); });
      map.getCanvas().addEventListener('webglcontextlost', fallback, { once: true });
      map.on('load', () => {
        if (token !== generation || !map) return;
        clearTimeout(loadTimer);
        map.addSource('countries', { type: 'geojson', data: geography as any });
        map.addLayer({ id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': '#edece5' } });
        map.addLayer({ id: 'context', type: 'fill', source: 'countries', filter: ['==', ['get', 'kind'], 'context'], paint: { 'fill-color': '#e9e6dc', 'fill-opacity': .55 } });
        map.addLayer({ id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': '#536a6f', 'line-width': .7 } });
        map.addLayer({ id: 'selected', type: 'line', source: 'countries', filter: ['==', ['get', 'code'], state.place], paint: { 'line-color': '#173c48', 'line-width': 3 } });
        map.on('click', 'land', e => { const code = e.features?.[0]?.properties?.code; if (subject().indicator && countries.some(c => c.code === code)) selectCountry(code); });
        map.on('click', e => { void showGrid([e.lngLat.lng, e.lngLat.lat]); });
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
    void showGrid(unproject([point.x, point.y]));
  });
  all<HTMLElement>('[data-eu-layer]').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.euLayer!)));
  all<HTMLElement>('[data-eu-topic]').forEach(button=>button.addEventListener('click',()=>setLayer(button.dataset.euTopic!)));
  query('[data-eu-reset]').addEventListener('click', () => { state.region = 'all'; state.place = ''; delete state.feature;commit(true); });
  all<HTMLElement>('[data-eu-zoom]').forEach(button => button.addEventListener('click', () => {
    const factor = button.dataset.euZoom === 'in' ? .7 : 1 / .7;
    if (map) { factor < 1 ? map.zoomIn() : map.zoomOut(); return; }
    const w = Math.min(frame.width * 2, Math.max(24, box[2] * factor));
    const h = w / box[2] * box[3]; box = [box[0] + (box[2] - w) / 2, box[1] + (box[3] - h) / 2, w, h]; staticMap.setAttribute('viewBox', box.join(' '));staticSymbols();annotations.refresh();
  }));
  query('[data-eu-render]').addEventListener('click', () => { state.render = failed || state.render === 'static' ? 'auto' : 'static'; disposeMap(); commit(true); void startMap(); });
  window.addEventListener('popstate', () => { const previousRender = state.render; state = readEuropeState(location.search, countries, ids, config.initialLayer); state.compare=[]; render(true); if (previousRender !== state.render) { disposeMap(); void startMap(); } });
  new ResizeObserver(staticSymbols).observe(staticMap);
  render(true); void startMap();
}
