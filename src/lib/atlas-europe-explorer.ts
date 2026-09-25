import { frame, project, unproject, wheatCell, displayCell, visibleBounds, readEuropeState, writeEuropeState } from './atlas-europe-view';
import { layerColor, fields, europeFieldHeadings, type EuropeLayer } from '../data/atlas/europe/layers';
import type { EuropeReading } from '../data/atlas/europe/readings';
import type { Geometry } from './atlas-europe-geometry';
import type { Map as LibreMap, Marker } from 'maplibre-gl';
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
  const countrySelect = query<HTMLSelectElement>('[data-eu-country]');
  const citySelect = query<HTMLSelectElement>('[data-eu-city]');
  const staticMap = query<SVGSVGElement>('[data-eu-static]');
  const liveMap = query<HTMLElement>('[data-eu-live]');
  const status = query<HTMLElement>('[data-eu-map-status]');
  const message = query<HTMLElement>('[data-eu-message]');
  const ids = cities.map(c => c.id);
  let state = readEuropeState(location.search, countries, ids, config.initialLayer);
  const valueCache = new Map<string, Promise<Float32Array>>();
  let gridRequest = 0;
  let map: LibreMap | undefined;
  let markers: { city: string; marker: Marker; element: HTMLButtonElement }[] = [];
  let featureMarkers: {id:string;marker:Marker;element:HTMLButtonElement}[]=[];
  let loadedSubject = '';
  let lastLayer = '';
  let generation = 0;
  let box = [0, 0, frame.width, frame.height];
  let failed = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  const regionNames: Record<string, string> = { all: '欧州全体', north: '北欧', west: '西欧', south: '南欧', east: '東欧' };

  const subject = () => config.layers.find(l=>l.id===(state.layer==='overlay'?(state.returnLayer==='climate'?'wheat':state.returnLayer):state.layer)) ?? config.layers[0];
  const climateReader = () => state.layer==='climate'||state.layer==='wheat'||state.layer==='overlay';
  const features = [...config.populationCities,...config.readings];
  const visibleFeatures = () => subject().field==='population' ? config.populationCities : subject().field==='industry' ? config.readings.filter(r=>r.field==='industry') : subject().field==='nature'&&state.layer!=='climate' ? config.readings.filter(r=>r.field==='nature') : [];
  const featureVisible = (id:string) => {
    const p=visibleFeatures().find(p=>p.id===id); if(!p)return false;
    if(state.place)return p.country===state.place;
    if(state.region!=='all' && countries.find(c=>c.code===p.country)?.region!==state.region)return false;
    return !('rank' in p) || (p.rank??0)<=(state.region==='all'?1:3) || p.id===state.feature;
  };
  function setLayer(id:string) {
    if(id==='overlay' && state.layer!=='overlay')state.returnLayer=state.layer;
    state.layer=id;commit(false);
  }
  function selectFeature(id:string) {
    const p=features.find(p=>p.id===id);if(!p)return;
    state.feature=id;state.place=p.country;state.region=countries.find(c=>c.code===p.country)!.region;commit(true);
  }
  function updateReader() {
    const layer=subject();
    query<HTMLElement>('[data-eu-climate-reader]').hidden=!climateReader();
    query<HTMLElement>('[data-eu-subject-reader]').hidden=climateReader();
    query('[data-eu-subject-title]').textContent=layer.title;
    query('[data-eu-subject-note]').textContent=layer.note;
    const available=visibleFeatures().filter(p=>!state.place||p.country===state.place);
    const select=query<HTMLSelectElement>('[data-eu-feature]');
    select.replaceChildren(new Option('選択してください',''),...available.map(p=>new Option(`${p.name}${'group' in p?' · '+p.group:''}`,p.id)));
    select.value=state.feature??'';select.disabled=!available.length;
    query('[data-eu-feature-help]').textContent=layer.field==='population'?'都市の位置を選べます。都市人口のランキングではありません。':layer.field==='industry'?'出典付きの代表地点。国を選ぶと一覧を絞ります。':layer.field==='nature'?'水系と山地の解説を選べます。':'作物や家畜を切り替え、地図を押すと格子の値を確認できます。';
    const feature=available.find(p=>p.id===state.feature);
    const card=query('[data-eu-feature-card]');card.replaceChildren();
    if(feature){
      const heading=document.createElement('h3');heading.textContent=feature.name;card.append(heading);
      const add=(text:string)=>{const p=document.createElement('p');p.textContent=text;card.append(p);};
      if('body' in feature){add(feature.body);add(feature.question);const a=document.createElement('a');a.href=feature.source;a.textContent=feature.sourceLabel+' · '+feature.period;a.className='eu-source-link';card.append(a);}
      else add(`${countries.find(c=>c.code===feature.country)?.name} · ${feature.capital?'首都':'都市'}。座標 ${feature.coordinates[1].toFixed(2)}°N, ${feature.coordinates[0].toFixed(2)}°E。Natural Earthの位置データで、周辺の人口格子とは別資料です。`);
    }
    const country=countries.find(c=>c.code===state.place);
    query('[data-eu-country-title]').textContent=country?country.name+' · 国全体の指標':'国を選んで数値を確認';
    const panel=query('[data-eu-national-values]');panel.replaceChildren();
    const preferred=layer.field==='population'?['population','urban','age','growth']:layer.field==='industry'?['manufacturing','industry','services','gdp']:['forest','agrishare','population'];
    if(country)for(const id of preferred){const ind=config.statistics.indicators.find(i=>i.id===id)!;const value=ind.values[country.code]?.['2023'];const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd'),a=document.createElement('a');a.href=ind.sourceUrl;a.textContent=ind.label;dt.append(a);dd.textContent=value==null?'データなし':value.toLocaleString('ja-JP',{maximumFractionDigits:id==='population'?0:2})+' '+ind.unit;row.append(dt,dd);panel.append(row);}
    const ind=config.statistics.indicators.find(i=>i.id===(layer.indicator??(layer.field==='population'?'population':'')));
    query<HTMLElement>('[data-eu-trend]').hidden=!country||!ind;
    const tbody=query('[data-eu-trend-rows]');tbody.replaceChildren();
    query<HTMLElement>('[data-eu-country-comparison]').hidden=!ind;
    const comparison=query('[data-eu-country-comparison-rows]');comparison.replaceChildren();
    if(ind){query('[data-eu-country-comparison-caption]').textContent=ind.label+'（'+ind.unit+'）';for(const c of countries.toSorted((a,b)=>a.name.localeCompare(b.name,'ja'))){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent=c.name;button.addEventListener('click',()=>selectCountry(c.code));th.append(button);const v=ind.values[c.code]?.['2023'];td.textContent=v==null?'—':v.toLocaleString('ja-JP',{maximumFractionDigits:ind.id==='population'?0:2});tr.append(th,td);comparison.append(tr);}}
    if(country&&ind){query('[data-eu-trend-caption]').textContent=country.name+' · '+ind.label+'（'+ind.unit+'）';for(const year of ['2020','2021','2022','2023','2024']){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.textContent=year;const value=ind.values[country.code]?.[year];td.textContent=value==null?'—':value.toLocaleString('ja-JP',{maximumFractionDigits:ind.id==='population'?0:2});tr.append(th,td);tbody.append(tr);}}
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
    query<HTMLSelectElement>('[data-eu-subject]').value=layer.id;
    query<HTMLButtonElement>('[data-eu-layer="overlay"]').disabled=!layer.grid&&layer.id!=='climate';
    query<HTMLElement>('[data-eu-wheat-reading]').hidden = !wheatVisible;
    query<HTMLElement>('[data-eu-layer-back]').hidden = state.layer !== 'overlay';
    all<HTMLElement>('[data-eu-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.euLayer === state.layer)));
    query('[data-eu-map-title]').textContent = layer.title+(state.layer==='overlay'?'と気候を重ねる':'');
    query('#eu-map-label').textContent=layer.title+'。国・都市・地点は一覧から選択できます。';
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
    const p=features.find(p=>p.id===state.feature&&featureVisible(p.id));
    if(p)return [[Math.max(-25,p.coordinates[0]-3),Math.max(32,p.coordinates[1]-2)],[Math.min(65,p.coordinates[0]+3),Math.min(73,p.coordinates[1]+2)]] as [[number,number],[number,number]];
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
    map?.fitBounds(bounds, { padding: 35, maxZoom: 7, duration: reduced ? 0 : 450 });
  }
  function render(refit = false) {
    const currentField=fields.find(field=>field.id===subject().field)!;
    query('[data-eu-field-label]').textContent=currentField.label;
    query('[data-eu-field-kicker]').textContent='EUROPE · '+currentField.id.toUpperCase();
    query('[data-eu-field-heading]').textContent=europeFieldHeadings[currentField.id];
    document.title=`欧州の${currentField.label}｜Insight Journal`;
    const canonical=writeEuropeState(new URL(location.href),state);
    if(canonical.pathname!==location.pathname)history.replaceState({},'',canonical);
    countrySelect.value = state.place;
    citySelect.value = state.city;
    const active = [state.city, ...state.compare];
    root.classList.toggle('is-comparing', state.compare.length > 0&&climateReader());
    query<HTMLElement>('[data-eu-comparison]').hidden = state.compare.length === 0;
    query('[data-eu-compare-label]').textContent = `${active.length}地点を比較中`;
    const place = countries.find(c => c.code === state.place);
    query('[data-eu-focus]').textContent = `${place?.name ?? regionNames[state.region]} · ${subject().period}${state.place === 'RUS' ? subject().indicator?' · 数値はロシア全土':' · 地図は表示枠内のみ' : ''}`;
    all<HTMLElement>('[data-eu-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.euRegion === state.region)));
    all<SVGElement>('[data-eu-shape]').forEach(shape => shape.classList.toggle('is-selected', shape.dataset.euShape === state.place));
    all<HTMLElement>('[data-city-card]').forEach(card => { card.hidden = !active.includes(card.dataset.cityCard!); card.style.order = String(active.indexOf(card.dataset.cityCard!)); });
    all<SVGElement>('[data-eu-point]').forEach(point => {point.classList.toggle('is-active', active.includes(point.dataset.euPoint!));point.style.display=climateReader()?'':'none';point.removeAttribute('hidden');});
    markers.forEach(({ city, element }) => {element.hidden=!climateReader(); element.classList.toggle('is-active', active.includes(city)); element.setAttribute('aria-pressed', String(active.includes(city))); });
    all<SVGElement>('[data-eu-feature-point]').forEach(p=>{p.style.display=featureVisible(p.dataset.euFeaturePoint!)?'':'none';p.removeAttribute('hidden');p.classList.toggle('is-active',p.dataset.euFeaturePoint===state.feature);});
    featureMarkers.forEach(({id,element})=>{element.hidden=!featureVisible(id);element.classList.toggle('is-active',id===state.feature);element.setAttribute('aria-pressed',String(id===state.feature));});
    if (map?.getLayer('selected')) map.setFilter('selected', ['==', ['get', 'code'], state.place]);
    all<HTMLAnchorElement>('[data-base-map]').forEach(a => { a.href = writeEuropeState(new URL(a.href), state).href; });
    all<HTMLAnchorElement>('[data-eu-field]').forEach(a => { a.href = writeEuropeState(new URL(a.href), { ...state, layer: a.dataset.euField! }).href;if(a.dataset.euField===currentField.initial)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current'); });
    const city = cities.find(c => c.id === state.city)!;
    message.textContent = place && city.country !== place.code ? `${place.name}を地図で選択中。雨温図は${city.name}です。${cities.some(c => c.country === place.code) ? '観測地点の一覧から変更できます。' : '選んだ国の観測地点はこの一覧にありません。'}` : '';
    query<HTMLButtonElement>('[data-eu-render]').textContent = failed || state.render === 'static' ? '操作できる地図に戻す' : '簡易表示にする';
    layers();
    updateReader();
    query<HTMLElement>('.eu-read-panel').setAttribute('aria-labelledby',climateReader()?'eu-city-heading':'eu-subject-title');
    requestAnimationFrame(() => { map?.resize(); if (refit) fit(); });
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
    state.compare = state.compare.filter(c => c !== id);
    state.place = city.country;
    state.region = countries.find(c => c.code === city.country)!.region;
    commit(true);
  }
  function disposeMap() {
    generation++;
    clearTimeout(loadTimer);
    markers.forEach(m => m.marker.remove()); markers = [];
    featureMarkers.forEach(m=>m.marker.remove());featureMarkers=[];loadedSubject='';
    map?.remove(); map = undefined;
    liveMap.classList.remove('is-ready'); staticMap.style.visibility = 'visible';
  }
  function fallback() {
    disposeMap(); failed = true;
    status.textContent = '簡易地図で表示中。国・地点の選択と比較は利用できます。';
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
      map = new libre.Map({ container: liveMap, style: { version: 8, sources: {}, layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': '#e7eff1' } }] }, bounds: [[-25, 32], [65, 73]], fitBoundsOptions: { padding: 30 }, maxBounds: [[-35, 25], [75, 78]], minZoom: 1, maxZoom: 8, attributionControl: false, scrollZoom: false, dragRotate: false, pitchWithRotate: false, touchPitch: false });
      map.touchZoomRotate.disableRotation();
      loadTimer = setTimeout(() => { if (token === generation) fallback(); }, 15000);
      if (matchMedia('(pointer: coarse)').matches) map.dragPan.disable();
      map.addControl(new libre.AttributionControl({ compact: true, customAttribution: 'Natural Earth · Beck · JMA · IFPRI · FAO · EC JRC · NOAA · World Bank' }));
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
        map.on('click', 'land', e => { const code = e.features?.[0]?.properties?.code; if (!subject().grid && countries.some(c => c.code === code)) selectCountry(code); });
        map.on('click', e => { void showGrid([e.lngLat.lng, e.lngLat.lat]); });
        markers = cities.map(city => {
          const element = document.createElement('button'); element.type = 'button'; element.className = 'eu-marker'; element.setAttribute('aria-label', `${city.name}の雨温図`); element.title = city.name;
          const label = document.createElement('span'); label.textContent = city.name; element.append(label);
          element.addEventListener('click', e => { e.stopPropagation(); selectCity(city.id); });
          return { city: city.id, element, marker: new libre.Marker({ element }).setLngLat(city.coordinates).addTo(map!) };
        });
        featureMarkers=features.map(p=>{const element=document.createElement('button');element.type='button';element.className='eu-marker';element.setAttribute('aria-label',p.name+'の解説');const label=document.createElement('span');label.textContent=p.name;element.append(label);element.addEventListener('click',e=>{e.stopPropagation();selectFeature(p.id);});return {id:p.id,element,marker:new libre.Marker({element}).setLngLat(p.coordinates).addTo(map!)};});
        liveMap.classList.add('is-ready'); staticMap.style.visibility = 'hidden'; status.textContent = '丸印で地点を選択。格子図は地図を押すと数値を表示。＋・−で拡大縮小。';
        render(true);
      });
    } catch { if (token === generation) fallback(); }
  }
  countrySelect.addEventListener('change', () => selectCountry(countrySelect.value));
  all<SVGImageElement>('image').forEach(img=>img.addEventListener('error',()=>{if(img.style.display!=='none')status.textContent='地図画像を取得できませんでした。出典・解説・国別の数値は確認できます。主題を選び直すか、通常地図への再試行を使ってください。';}));
  citySelect.addEventListener('change', () => selectCity(citySelect.value));
  all<HTMLElement>('[data-eu-region]').forEach(button => button.addEventListener('click', () => { state.region = button.dataset.euRegion!; state.place = ''; delete state.feature;commit(true); }));
  all<SVGElement>('[data-eu-shape]').forEach(shape => shape.addEventListener('click', () => { if (!subject().grid) selectCountry(shape.dataset.euShape!); }));
  staticMap.addEventListener('click', event => {
    if (state.layer === 'climate') return;
    const transform = staticMap.getScreenCTM(); if (!transform) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    void showGrid(unproject([point.x, point.y]));
  });
  all<HTMLElement>('[data-eu-layer]').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.euLayer!)));
  query<HTMLSelectElement>('[data-eu-subject]').addEventListener('change',e=>setLayer((e.target as HTMLSelectElement).value));
  query<HTMLSelectElement>('[data-eu-feature]').addEventListener('change',e=>selectFeature((e.target as HTMLSelectElement).value));
  all<HTMLElement>('[data-eu-jump]').forEach(b=>b.addEventListener('click',()=>{setLayer(b.dataset.euJump!);query('[data-eu-map-title]').scrollIntoView({block:'start'});}));
  all<HTMLElement>('[data-eu-reading]').forEach(b=>b.addEventListener('click',()=>{const r=config.readings.find(r=>r.id===b.dataset.euReading)!;state.layer=r.layer;selectFeature(r.id);query('[data-eu-map-title]').scrollIntoView({block:'start'});}));
  query('[data-eu-layer-back]').addEventListener('click', () => { state.layer = state.returnLayer; commit(false); });
  all<HTMLElement>('[data-eu-wheat-country]').forEach(b => b.addEventListener('click', () => { state.layer = 'wheat'; selectCountry(b.dataset.euWheatCountry!); query('[data-eu-map-title]').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); }));
  query('[data-eu-reset]').addEventListener('click', () => { state.region = 'all'; state.place = ''; delete state.feature;commit(true); });
  all<HTMLElement>('[data-eu-zoom]').forEach(button => button.addEventListener('click', () => {
    const factor = button.dataset.euZoom === 'in' ? .7 : 1 / .7;
    if (map) { factor < 1 ? map.zoomIn() : map.zoomOut(); return; }
    const w = Math.min(frame.width * 2, Math.max(24, box[2] * factor));
    const h = w / box[2] * box[3]; box = [box[0] + (box[2] - w) / 2, box[1] + (box[3] - h) / 2, w, h]; staticMap.setAttribute('viewBox', box.join(' '));staticSymbols();
  }));
  query('[data-eu-add]').addEventListener('click', () => {
    const id = query<HTMLSelectElement>('[data-eu-compare]').value;
    if (!id || id === state.city || state.compare.includes(id)) { message.textContent = '表示中とは別の地点を選んでください。'; return; }
    if (state.compare.length >= 2) { message.textContent = '比較は3地点までです。「1地点に戻る」で選び直せます。'; return; }
    state.compare.push(id); commit(false);
  });
  query('[data-eu-close]').addEventListener('click', () => { state.compare = []; commit(false); });
  all<HTMLElement>('[data-eu-preset]').forEach(button => button.addEventListener('click', () => { const [city, ...compare] = button.dataset.euPreset!.split(','); state = { ...state, city, compare, region: 'all', place: '', layer:'climate',feature:undefined }; commit(true); query('[data-eu-city]').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); }));
  query('[data-eu-render]').addEventListener('click', () => { state.render = failed || state.render === 'static' ? 'auto' : 'static'; disposeMap(); commit(true); void startMap(); });
  window.addEventListener('popstate', () => { const previousRender = state.render; state = readEuropeState(location.search, countries, ids, config.initialLayer); render(true); if (previousRender !== state.render) { disposeMap(); void startMap(); } });
  new ResizeObserver(staticSymbols).observe(staticMap);
  render(true); void startMap();
}
