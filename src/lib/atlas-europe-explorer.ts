import { frame, project, unproject, wheatCell, visibleBounds, readEuropeState, writeEuropeState } from './atlas-europe-view';
import type { Geometry } from './atlas-europe-geometry';
import type { Map as LibreMap, Marker } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
type Country = { code: string; name: string; region: string };
type City = { id: string; name: string; country: string; coordinates: [number, number] };
type Feature = { type: 'Feature'; properties: { code: string; kind: string }; geometry: Geometry };

export function initEuropeAtlas() {
  const root = document.querySelector<HTMLElement>('[data-europe-detail]');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const config = JSON.parse(root.querySelector('[data-eu-config]')!.textContent!) as { countries: Country[]; cities: City[]; geography: { type: 'FeatureCollection'; features: Feature[] }; climate: string; wheat: string; wheatValues: string; initialLayer: string };
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
  let previousLayer = state.layer === 'overlay' ? 'wheat' : state.layer;
  let valuesPromise: Promise<Float32Array> | undefined;
  let gridRequest = 0;
  let map: LibreMap | undefined;
  let markers: { city: string; marker: Marker; element: HTMLButtonElement }[] = [];
  let generation = 0;
  let box = [0, 0, frame.width, frame.height];
  let failed = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  const regionNames: Record<string, string> = { all: '欧州全体', north: '北欧', west: '西欧', south: '南欧', east: '東欧' };

  function layers() {
    const climateVisible = state.layer !== 'wheat', wheatVisible = state.layer !== 'climate';
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
    query<HTMLElement>('[data-eu-wheat-reading]').hidden = !wheatVisible;
    query<HTMLElement>('[data-eu-layer-back]').hidden = state.layer !== 'overlay';
    all<HTMLElement>('[data-eu-layer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.euLayer === state.layer)));
    query('[data-eu-map-title]').textContent = state.layer === 'climate' ? '欧州の気候区分' : state.layer === 'wheat' ? '小麦の収穫面積' : '小麦と気候を重ねる';
  }
  async function showGrid(point: number[]) {
    if (state.layer === 'climate') return;
    const request = ++gridRequest;
    const target = query<HTMLElement>('[data-eu-grid-result]');
    target.textContent = '格子の数値を読み込んでいます…';
    try {
      valuesPromise ??= fetch(config.wheatValues).then(async r => {
        if (!r.ok || !r.body) throw new Error('Wheat values unavailable');
        const bytes = new Uint8Array(await r.arrayBuffer());
        const buffer = bytes[0] === 0x1f && bytes[1] === 0x8b
          ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
          : bytes.buffer;
        if (buffer.byteLength !== 1080 * 492 * 4) throw new Error('Invalid wheat grid');
        return new Float32Array(buffer);
      });
      const cell = wheatCell(await valuesPromise, point);
      if (request !== gridRequest) return;
      target.textContent = !cell ? '表示範囲外です。' : `格子中心 ${cell.center[1].toFixed(3)}°N, ${cell.center[0].toFixed(3)}°E：${cell.value === null ? 'データなし' : cell.value === 0 ? '0 ha' : cell.value < .1 ? '0.1 ha未満（0超）' : `${cell.value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })} ha`}（2020年頃の推計）`;
    } catch (error) { console.warn('Europe wheat grid unavailable', error); valuesPromise = undefined; if (request === gridRequest) target.textContent = '数値を読み込めませんでした。地図の分布と凡例を確認できます。別の格子を押すと再試行します。'; }
  }

  function selectionBounds() {
    const codes = countries.filter(c => state.place ? c.code === state.place : state.region === 'all' || c.region === state.region).map(c => c.code);
    if (state.region === 'all' && !state.place) return [[-25, 32], [65, 73]] as [[number, number], [number, number]];
    return visibleBounds(geography.features.filter(f => codes.includes(f.properties.code)).map(f => f.geometry));
  }
  function fit() {
    const bounds = selectionBounds();
    const [left, bottom] = project(bounds[0]);
    const [right, top] = project(bounds[1]);
    const width = Math.max(right - left, 24), height = Math.max(bottom - top, 24);
    box = [(left + right - width) / 2 - width * .12, (top + bottom - height) / 2 - height * .12, width * 1.24, height * 1.24];
    if (state.region === 'all' && !state.place) box = [0, 0, frame.width, frame.height];
    staticMap.setAttribute('viewBox', box.join(' '));
    map?.fitBounds(bounds, { padding: 35, maxZoom: 7, duration: reduced ? 0 : 450 });
  }
  function render(refit = false) {
    countrySelect.value = state.place;
    citySelect.value = state.city;
    const active = [state.city, ...state.compare];
    root.classList.toggle('is-comparing', state.compare.length > 0);
    query<HTMLElement>('[data-eu-comparison]').hidden = state.compare.length === 0;
    query('[data-eu-compare-label]').textContent = `${active.length}地点を比較中`;
    const place = countries.find(c => c.code === state.place);
    query('[data-eu-focus]').textContent = `${place?.name ?? regionNames[state.region]} · ${state.layer === 'climate' ? '1991–2020年' : state.layer === 'wheat' ? '2020年頃' : '気候1991–2020 / 小麦2020年頃'}${state.place === 'RUS' ? ' · 表示枠内のみ' : ''}`;
    all<HTMLElement>('[data-eu-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.euRegion === state.region)));
    all<SVGElement>('[data-eu-shape]').forEach(shape => shape.classList.toggle('is-selected', shape.dataset.euShape === state.place));
    all<HTMLElement>('[data-city-card]').forEach(card => { card.hidden = !active.includes(card.dataset.cityCard!); card.style.order = String(active.indexOf(card.dataset.cityCard!)); });
    all<SVGElement>('[data-eu-point]').forEach(point => point.classList.toggle('is-active', active.includes(point.dataset.euPoint!)));
    markers.forEach(({ city, element }) => { element.classList.toggle('is-active', active.includes(city)); element.setAttribute('aria-pressed', String(active.includes(city))); });
    if (map?.getLayer('selected')) map.setFilter('selected', ['==', ['get', 'code'], state.place]);
    all<HTMLAnchorElement>('[data-base-map]').forEach(a => { a.href = writeEuropeState(new URL(a.href), state).href; });
    all<HTMLAnchorElement>('[data-eu-field]').forEach(a => { a.href = writeEuropeState(new URL(a.href), { ...state, layer: a.dataset.euField! }).href; });
    const city = cities.find(c => c.id === state.city)!;
    message.textContent = place && city.country !== place.code ? `${place.name}を地図で選択中。雨温図は${city.name}です。${cities.some(c => c.country === place.code) ? '観測地点の一覧から変更できます。' : '選んだ国の観測地点はこの一覧にありません。'}` : '';
    query<HTMLButtonElement>('[data-eu-render]').textContent = failed || state.render === 'static' ? '操作できる地図に戻す' : '簡易表示にする';
    layers();
    requestAnimationFrame(() => { map?.resize(); if (refit) fit(); });
  }
  function commit(refit = false) { history.pushState({}, '', writeEuropeState(new URL(location.href), state)); render(refit); }
  function selectCountry(code: string) {
    const country = countries.find(c => c.code === code);
    state.place = country?.code ?? '';
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
    state.compare = state.compare.filter(c => c !== id);
    state.place = city.country;
    state.region = countries.find(c => c.code === city.country)!.region;
    commit(true);
  }
  function disposeMap() {
    generation++;
    clearTimeout(loadTimer);
    markers.forEach(m => m.marker.remove()); markers = [];
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
      map.addControl(new libre.AttributionControl({ compact: true, customAttribution: 'Natural Earth · Beck et al. 2023 · JMA' }));
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
        map.on('click', 'land', e => { const code = e.features?.[0]?.properties?.code; if (state.layer === 'climate' && countries.some(c => c.code === code)) selectCountry(code); });
        map.on('click', e => { void showGrid([e.lngLat.lng, e.lngLat.lat]); });
        markers = cities.map(city => {
          const element = document.createElement('button'); element.type = 'button'; element.className = 'eu-marker'; element.setAttribute('aria-label', `${city.name}の雨温図`); element.title = city.name;
          const label = document.createElement('span'); label.textContent = city.name; element.append(label);
          element.addEventListener('click', e => { e.stopPropagation(); selectCity(city.id); });
          return { city: city.id, element, marker: new libre.Marker({ element }).setLngLat(city.coordinates).addTo(map!) };
        });
        liveMap.classList.add('is-ready'); staticMap.style.visibility = 'hidden'; status.textContent = '地点の丸印で雨温図。ズームは＋・−、地図の移動はドラッグ。';
        render(true);
      });
    } catch { if (token === generation) fallback(); }
  }
  countrySelect.addEventListener('change', () => selectCountry(countrySelect.value));
  citySelect.addEventListener('change', () => selectCity(citySelect.value));
  all<HTMLElement>('[data-eu-region]').forEach(button => button.addEventListener('click', () => { state.region = button.dataset.euRegion!; state.place = ''; commit(true); }));
  all<SVGElement>('[data-eu-shape]').forEach(shape => shape.addEventListener('click', () => { if (state.layer === 'climate') selectCountry(shape.dataset.euShape!); }));
  staticMap.addEventListener('click', event => {
    if (state.layer === 'climate') return;
    const transform = staticMap.getScreenCTM(); if (!transform) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
    void showGrid(unproject([point.x, point.y]));
  });
  all<HTMLElement>('[data-eu-layer]').forEach(b => b.addEventListener('click', () => { if (b.dataset.euLayer === 'overlay' && state.layer !== 'overlay') previousLayer = state.layer; state.layer = b.dataset.euLayer!; commit(false); }));
  query('[data-eu-layer-back]').addEventListener('click', () => { state.layer = previousLayer; commit(false); });
  all<HTMLElement>('[data-eu-wheat-country]').forEach(b => b.addEventListener('click', () => { state.layer = 'wheat'; selectCountry(b.dataset.euWheatCountry!); query('[data-eu-map-title]').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); }));
  query('[data-eu-reset]').addEventListener('click', () => { state.region = 'all'; state.place = ''; commit(true); });
  all<HTMLElement>('[data-eu-zoom]').forEach(button => button.addEventListener('click', () => {
    const factor = button.dataset.euZoom === 'in' ? .7 : 1 / .7;
    if (map) { factor < 1 ? map.zoomIn() : map.zoomOut(); return; }
    const w = Math.min(frame.width * 2, Math.max(24, box[2] * factor));
    const h = w / box[2] * box[3]; box = [box[0] + (box[2] - w) / 2, box[1] + (box[3] - h) / 2, w, h]; staticMap.setAttribute('viewBox', box.join(' '));
  }));
  query('[data-eu-add]').addEventListener('click', () => {
    const id = query<HTMLSelectElement>('[data-eu-compare]').value;
    if (!id || id === state.city || state.compare.includes(id)) { message.textContent = '表示中とは別の地点を選んでください。'; return; }
    if (state.compare.length >= 2) { message.textContent = '比較は3地点までです。「1地点に戻る」で選び直せます。'; return; }
    state.compare.push(id); commit(false);
  });
  query('[data-eu-close]').addEventListener('click', () => { state.compare = []; commit(false); });
  all<HTMLElement>('[data-eu-preset]').forEach(button => button.addEventListener('click', () => { const [city, ...compare] = button.dataset.euPreset!.split(','); state = { ...state, city, compare, region: 'all', place: '' }; commit(true); query('[data-eu-city]').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' }); }));
  query('[data-eu-render]').addEventListener('click', () => { state.render = failed || state.render === 'static' ? 'auto' : 'static'; disposeMap(); commit(true); void startMap(); });
  window.addEventListener('popstate', () => { const previousRender = state.render; state = readEuropeState(location.search, countries, ids, config.initialLayer); render(true); if (previousRender !== state.render) { disposeMap(); void startMap(); } });
  render(true); void startMap();
}
