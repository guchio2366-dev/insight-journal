import type { Map as LibreMap } from 'maplibre-gl';
import {
  canadaCensusNationalBounds, canadaCensusFeatureBounds, canadaCensusSize, joinCanadaCensusGeometry, projectCanadaCensus, unprojectCanadaCensus, canadaCensusColor, canadaCensusLegend, canadaCensusProvinceNames, canadaCensusValueText, canadaCensusShortValueText, resolveCanadaCensusObservation,
  type CanadaCensusCollection, type CanadaCensusRecord, type CanadaCensusProduct, type CanadaCensusProductId, type CanadaCensusObservation,
} from '../lib/atlas-canada-census-map';

export type CanadaCensusCameraBounds = [number, number, number, number];
export interface CanadaCensusState { product: CanadaCensusProductId; selected: string | null; only: boolean; bounds?: CanadaCensusCameraBounds | null; observation?: CanadaCensusObservation | null; }
export interface CanadaCensusController {
  render(state: CanadaCensusState): void;
  reset(): void;
  zoom(direction: 'in' | 'out'): void;
  focusSelected(): void;
  destroy(): void;
}
type Frame = [number, number, number, number];
interface Config { geometry: {url:string}; records: Record<string, CanadaCensusRecord>; products: Record<CanadaCensusProductId, CanadaCensusProduct>; productId: CanadaCensusProductId; context: unknown; workerUrl: string; geographicLabels: {id:string;name:string;labelAnchor:number[]}[]; patternF:string;patternMissing:string; }

/** Selection belongs to the host page. Camera gestures stay local to this map. */
export function initCanadaCensusMap(root: HTMLElement): CanadaCensusController {
  const config: Config = JSON.parse(root.querySelector('[data-canada-census-config]')!.textContent!);
  const stage = root.querySelector<HTMLElement>('[data-canada-census-stage]')!;
  const fallback = root.querySelector<SVGSVGElement>('[data-canada-census-fallback]')!;
  const live = root.querySelector<HTMLElement>('[data-canada-census-live]')!;
  const status = root.querySelector<HTMLElement>('[data-canada-census-status]')!;
  const onlyControl = root.querySelector<HTMLInputElement>('[data-canada-census-only]')!;
  const focusButton = root.querySelector<HTMLButtonElement>('[data-canada-census-focus]')!;
  const labels = [...root.querySelectorAll<HTMLElement>('[data-canada-census-label]')];
  const selector=root.querySelector<HTMLSelectElement>('[data-canada-census-region]')!;
  const selectedValue=root.querySelector<HTMLElement>('[data-canada-census-selected-value]');
  const observationMarker=root.querySelector<HTMLElement>('[data-canada-census-observation]');
  const observationLabel=root.querySelector<HTMLElement>('[data-canada-census-observation-label]');
  const observationKey=root.querySelector<HTMLElement>('[data-canada-census-observation-key]');
  const observationName=root.querySelector<HTMLElement>('[data-canada-census-observation-name]');
  const observationOutside=root.querySelector<HTMLElement>('[data-canada-census-observation-outside]');
  const scope=root.closest<HTMLElement>('[data-canada-agriculture],[data-canada-beef],[data-canada-nature]')??root;
  const fullFrame: Frame = [0, 0, canadaCensusSize.width, canadaCensusSize.height];
  const [worldLeft, worldTop] = projectCanadaCensus([-180, 85.051]);
  const [worldRight, worldBottom] = projectCanadaCensus([180, -85.051]);
  const abort = new AbortController();
  root.dataset.canadaCensusRender = 'svg';
  let state: CanadaCensusState = { product: config.productId, selected: null, only: false };
  let rawGeometry:CanadaCensusCollection|undefined, geometryProduct:CanadaCensusProductId=config.productId, legendProduct:CanadaCensusProductId|undefined;
  let frame: Frame = [...fullFrame];
  let geometry: CanadaCensusCollection | undefined;
  let map: LibreMap | undefined;
  let ready = false, started = false, destroyed = false, fitted = true, dragged = false;
  let cameraKey = 'fit', cameraCommitPending = false, programmaticCamera = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const emit = (name: string, detail: unknown) => root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  const select = (id: string) => { if (!id || Object.prototype.hasOwnProperty.call(config.records,id)) emit('canada-census-select', { id: id || null }); };
  const listen = (target: EventTarget, name: string, handler: EventListener, options: AddEventListenerOptions = {}) => target.addEventListener(name, handler, { ...options, signal: abort.signal });

  /** Move the complete Mercator viewport into the world; never clip its four edges separately. */
  function clampFrame(next: Frame): Frame {
    if (!next.every(Number.isFinite) || next[2] <= 0 || next[3] <= 0) return [...fullFrame];
    const scale = Math.min(1, (worldRight - worldLeft) / next[2], (worldBottom - worldTop) / next[3]);
    const width = next[2] * scale, height = next[3] * scale;
    if (!(width > 0 && height > 0)) return [...fullFrame];
    return [
      Math.max(worldLeft, Math.min(worldRight - width, next[0] + (next[2] - width) / 2)),
      Math.max(worldTop, Math.min(worldBottom - height, next[1] + (next[3] - height) / 2)),
      width, height,
    ];
  }
  function cameraBounds(): CanadaCensusCameraBounds {
    frame = clampFrame(frame);
    const [west, north] = unprojectCanadaCensus([frame[0], frame[1]]);
    const [east, south] = unprojectCanadaCensus([frame[0] + frame[2], frame[1] + frame[3]]);
    const bounds = [west, south, east, north].map(value => Math.round(value * 100000) / 100000) as CanadaCensusCameraBounds;
    // Keep unusually small, restored cameras ordered at the host's five-decimal URL precision.
    if (bounds[0] === bounds[2]) { bounds[0] = Math.floor(west * 100000) / 100000; bounds[2] = Math.ceil(east * 100000) / 100000; }
    if (bounds[1] === bounds[3]) { bounds[1] = Math.floor(south * 100000) / 100000; bounds[3] = Math.ceil(north * 100000) / 100000; }
    return bounds;
  }
  function setFrame(bounds: CanadaCensusCameraBounds) {
    if (!bounds.every(Number.isFinite) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) { frame = [...fullFrame]; return false; }
    const [left, bottom] = projectCanadaCensus([bounds[0], bounds[1]]), [right, top] = projectCanadaCensus([bounds[2], bounds[3]]);
    frame = clampFrame([left, top, right - left, bottom - top]);
    return true;
  }
  function syncMapFrame() {
    if (!ready || !map) return;
    const bounds = map.getBounds();
    setFrame([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
  }
  function commitCamera() {
    syncMapFrame();
    const bounds = cameraBounds();
    cameraKey = bounds.join(','); cameraCommitPending = false;
    draw(); emit('canada-census-camera', { bounds });
  }
  function restoreCamera(bounds: CanadaCensusCameraBounds | null) {
    const key = bounds?.join(',') ?? 'fit';
    if (key === cameraKey) return;
    cameraKey = key; cameraCommitPending = false;
    if (!bounds) { fit(); return; }
    if (!setFrame(bounds)) { fit(); return; }
    fitted = false;
    const normalized = cameraBounds(); cameraKey = normalized.join(',');
    if (ready && map) {
      programmaticCamera = true;
      map.fitBounds([[normalized[0], normalized[1]], [normalized[2], normalized[3]]], { padding: 0, duration: 0 });
      programmaticCamera = false;
    }
    draw();
  }


  function drawObservation() {
    if(!observationMarker||!observationLabel||!observationKey||!observationName||!observationOutside)return;
    const observation=state.observation;
    observationKey.hidden=!observation;
    observationMarker.hidden=true;observationOutside.hidden=true;
    if(!observation)return;
    const name=`${observation.name} / ${observation.station}`;
    observationName.textContent=name;observationLabel.textContent=name;
    observationMarker.setAttribute('aria-label',`気候観測点：${name}（面積・頭数ではない）`);
    const width=stage.clientWidth,height=stage.clientHeight;
    if(!width||!height)return;
    const projected=ready&&map?map.project(observation.coordinates as [number,number]):null;
    const point=projectCanadaCensus(observation.coordinates),ratio=Math.min(width/frame[2],height/frame[3]);
    const x=projected?.x??(point[0]-frame[0])*ratio+(width-frame[2]*ratio)/2;
    const y=projected?.y??(point[1]-frame[1])*ratio+(height-frame[3]*ratio)/2;
    const inside=Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=width&&y>=0&&y<=height;
    observationOutside.hidden=inside;
    // Keep the point at its real projected position. Offscreen points have no surrogate.
    observationMarker.style.left=`${x}px`;observationMarker.style.top=`${y}px`;observationMarker.hidden=!inside;
    if(!inside)return;
    observationMarker.classList.toggle('is-left',x>width/2);
    const labelHeight=observationLabel.offsetHeight||36;
    const offset=Math.max(labelHeight/2+3,Math.min(height-labelHeight/2-3,y))-y;
    observationLabel.style.transform=`translateY(calc(-50% + ${offset}px))`;
  }

  function drawLabels() {
    drawObservation();
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(width / frame[2], height / frame[3]);
    const left = (width - frame[2] * ratio) / 2, top = (height - frame[3] * ratio) / 2;
    const occupied: number[][] = [[width - 60, 0, width, 205], [0, 0, Math.min(280, width - 80), state.selected ? 174 : 145]];
    for (const label of labels) {
      const region = config.geographicLabels.find(item => item.id === label.dataset.canadaCensusLabel)!;
      if (state.only && state.selected) { label.hidden = true; continue; }
      const projected = ready && map ? map.project(region.labelAnchor as [number, number]) : null;
      const point = projectCanadaCensus(region.labelAnchor);
      const x = projected?.x ?? (point[0] - frame[0]) * ratio + left;
      const y = projected?.y ?? (point[1] - frame[1]) * ratio + top;
      label.hidden = false;
      const w = label.offsetWidth || Math.min(185, (label.textContent?.length ?? 0) * 12 + 14), h = label.offsetHeight || 30;
      const box = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
      // Keep labels at their checked in-polygon anchors; the legend covers omitted collisions.
      label.hidden = box[0] < 3 || box[1] < 3 || box[2] > width - 3 || box[3] > height - 3 || occupied.some(([x1, y1, x2, y2]) => box[0] < x2 + 3 && box[2] > x1 - 3 && box[1] < y2 + 3 && box[3] > y1 - 3);
      label.style.left = `${x}px`; label.style.top = `${y}px`;
      if (!label.hidden) occupied.push(box);
    }
  }

  function draw() {
    frame = clampFrame(frame);
    fallback.setAttribute('viewBox', frame.join(' '));
    const product=config.products[state.product];
    if(legendProduct!==state.product){
      legendProduct=state.product;
      for(const title of root.querySelectorAll('[data-canada-census-product-title]'))title.textContent=product.label;
      const title=`${product.label}：2021年、地域別申告値（${product.unit}）`;
      root.querySelector('[data-canada-census-map-title]')!.textContent=title;
      root.querySelector('[data-canada-census-legend]')!.setAttribute('aria-label',title);
      root.querySelector('[data-canada-census-legend-title]')!.textContent=`${product.label}／2021年／${product.unit}`;
      const scale=root.querySelector('[data-canada-census-scale]')!;scale.replaceChildren();
      for(const item of canadaCensusLegend(state.product,product.unit)){const li=document.createElement('li'),swatch=document.createElement('i');swatch.style.background=item.color;swatch.setAttribute('aria-hidden','true');li.append(swatch,document.createTextNode(item.label));scale.append(li);}
      root.querySelector('[data-canada-census-definition]')!.textContent=`${product.definition??''} ${Array.isArray(product.notes)?product.notes.join(' '):product.notes??''}`;
      const source=root.querySelector<HTMLAnchorElement>('[data-canada-census-table-source]');if(source)source.href=product.sourceTableUrl??'';
      for(const shape of root.querySelectorAll<SVGPathElement>('[data-canada-census-shape]')){const record=config.records[shape.dataset.canadaCensusShape!],cell=record.cells[state.product],text=`${record.name}（${record.uid}、${canadaCensusProvinceNames[record.provinceCode]}）2021年 ${product.label} ${canadaCensusValueText(cell,product.unit)}`;shape.setAttribute('fill',cell.status==='not-covered'?`url(#${config.patternMissing})`:cell.value===null?`url(#${config.patternF})`:canadaCensusColor(cell,state.product));shape.dataset.canadaCensusCellStatus=cell.status;shape.setAttribute('aria-label',text);let title=shape.querySelector<SVGTitleElement>('title');if(!title){title=document.createElementNS('http://www.w3.org/2000/svg','title');shape.append(title);}title.textContent=text;}
    }
    selector.value=state.selected??'';
    for (const element of root.querySelectorAll<SVGElement>('[data-canada-census-shape]')) {
      const id = element.getAttribute('data-canada-census-shape');
      element.classList.toggle('is-selected', id === state.selected);
      element.setAttribute('aria-pressed', String(id === state.selected));
      if (element.hasAttribute('data-canada-census-shape')) {
        const hidden = state.only && !!state.selected && id !== state.selected;
        element.toggleAttribute('hidden', hidden);
        element.setAttribute('tabindex', hidden || ready || id!==state.selected ? '-1' : '0');
      }
    }
    onlyControl.checked = state.only; onlyControl.disabled = !state.selected; focusButton.disabled = !state.selected;
    if (map && ready) {
      if(rawGeometry && geometryProduct!==state.product){geometry=joinCanadaCensusGeometry(rawGeometry,config.records,state.product);geometryProduct=state.product;(map.getSource('canada-census-regions') as any).setData(geometry);}
      const selected = ['==', ['get', 'id'], state.selected ?? '__none__'] as any;
      const filter = state.only && state.selected ? selected : null;
      map.setFilter('canada-census-fill', filter);
      map.setFilter('canada-census-boundaries', filter);
      for(const [layer,status] of [['canada-census-quality-f','quality-f'],['canada-census-not-covered','not-covered']])map.setFilter(layer,filter?['all',['==',['get','status'],status],selected]:['==',['get','status'],status]);
      map.setFilter('canada-census-selected', selected);
    }
    const region = state.selected?config.records[state.selected]:undefined;
    if(selectedValue){selectedValue.hidden=!region;selectedValue.textContent=region?canadaCensusShortValueText(region.cells[state.product],product.unit):'';}
    status.textContent = region ? `${region.name}：${canadaCensusValueText(region.cells[state.product],product.unit)}${state.only?'。この地域だけを表示。':''}` : '2021年の地域別申告値を表示しています。地域や地域選択から選べます。';
    scope.querySelectorAll<HTMLElement>('[data-canada-census-national-header]').forEach(header=>{header.hidden=!!region;});const reading=scope.querySelector<HTMLElement>('[data-canada-census-reading]');if(reading){reading.hidden=!region;if(region){reading.querySelector('[data-canada-census-reading-title]')!.textContent=`${region.name}（${canadaCensusProvinceNames[region.provinceCode]}）`;const cell=region.cells[state.product];reading.querySelector('[data-canada-census-reading-value]')!.textContent=`2021年 ${product.label}：${cell.status==='not-covered'?'対象外・未収録':cell.value===null?'非公表':cell.value.toLocaleString('ja-JP')+' '+product.unit}`;const quality=reading.querySelector('[data-canada-census-reading-quality]');if(quality)quality.textContent=canadaCensusValueText(cell,product.unit);reading.querySelector('[data-canada-census-reading-components]')!.textContent=region.cells[state.product].components.map(component=>`${component.variable}：${component.value===null?'非公表':component.value.toLocaleString('ja-JP')+' '+product.unit}（品質 ${component.quality??'未収録'}）`).join(' ／ ');reading.querySelector('[data-canada-census-reading-id]')!.textContent=`CCS ${region.uid}／DGUID ${state.selected}。農場の本拠地に集計された申告値で、実際の圃場や牛の場所ではありません。`;const source=reading.querySelector<HTMLAnchorElement>('[data-canada-census-reading-source]');if(source)source.href=product.sourceTableUrl??'';}}
    drawLabels();
  }

  function fit() {
    fitted = true; frame = clampFrame([...fullFrame]); cameraKey = 'fit'; cameraCommitPending = false;
    if (ready && map) { programmaticCamera = true; map.fitBounds(canadaCensusNationalBounds, { padding: { top: 18, right: 18, bottom: 18, left: 18 }, duration: 0 }); programmaticCamera = false; }
    draw();
  }
  function zoom(direction: 'in' | 'out') {
    fitted = false;
    if (ready && map) { cameraCommitPending = true; direction === 'in' ? map.zoomIn({ duration: reducedMotion() ? 0 : 150 }) : map.zoomOut({ duration: reducedMotion() ? 0 : 150 }); return; }
    const factor = direction === 'in' ? .7 : 1 / .7;
    const width = Math.max(30, frame[2] * factor);
    const height = frame[3] * width / frame[2];
    frame = [frame[0] + (frame[2] - width) / 2, frame[1] + (frame[3] - height) / 2, width, height];
    commitCamera();
  }
  function focusSelected() {
    if (!state.selected) return;
    const feature = geometry?.features.find(item => item.properties.id === state.selected);
    const path = root.querySelector<SVGPathElement>(`[data-canada-census-shape="${state.selected}"]`);
    fitted = false;
    if (feature) {
      const flatBounds = canadaCensusFeatureBounds(feature.geometry), bounds:[[number,number],[number,number]]=[[flatBounds[0],flatBounds[1]],[flatBounds[2],flatBounds[3]]];
      if (ready && map) { cameraCommitPending = true; map.fitBounds(bounds, { padding: { top: 35, right: 70, bottom: 35, left: 35 }, maxZoom: 7, duration: reducedMotion() ? 0 : 250 }); return; }
      const [left, bottom] = projectCanadaCensus(bounds[0]), [right, top] = projectCanadaCensus(bounds[1]);
      frame = [left - 25, top - 25, Math.max(60, right - left + 50), Math.max(60, bottom - top + 50)];
    } else if (path && typeof path.getBBox === 'function') {
      const bounds = path.getBBox(); frame = [bounds.x - 25, bounds.y - 25, Math.max(60, bounds.width + 50), Math.max(60, bounds.height + 50)];
    }
    commitCamera();
  }

  function fail() {
    if (destroyed) return;
    syncMapFrame();
    const pending = cameraCommitPending;
    clearTimeout(loadTimer); ready = false; map?.remove(); map = undefined;
    live.hidden = true; live.style.visibility = 'hidden'; fallback.style.visibility = 'visible'; fallback.removeAttribute('aria-hidden'); fallback.setAttribute('tabindex', '0');
    root.dataset.canadaCensusRender = 'svg'; draw(); if (pending) commitCamera();
  }
  async function start() {
    if (started || destroyed || root.hidden || !stage.clientWidth) return;
    started = true;
    if (new URL(location.href).searchParams.get('render') === 'static') { root.dataset.canadaCensusRender = 'svg'; return; }
    try {
      const geometryUrl = new URL(config.geometry.url, location.href);
      if (geometryUrl.origin !== location.origin) throw new Error('Canada census geometry must be local');
      const response = await fetch(geometryUrl.href, { signal: abort.signal });
      if (!response.ok) throw new Error(`Canada census geometry ${response.status}`);
      rawGeometry=await response.json(); geometry = joinCanadaCensusGeometry(rawGeometry!, config.records, state.product); geometryProduct=state.product;
      const libre = await import('maplibre-gl');
      if (destroyed) return;
      libre.setWorkerUrl(config.workerUrl); libre.setWorkerCount(1); live.style.visibility = 'hidden'; live.hidden = false;
      map = new libre.Map({
        container: live, style: { version: 8, sources: {
          'canada-census-context': { type: 'geojson', data: config.context as any },
          'canada-census-regions': { type: 'geojson', data: geometry as any, tolerance: 0 },
        }, layers: [
          { id: 'canada-census-ocean', type: 'background', paint: { 'background-color': '#e4eff0' } },
          { id: 'canada-census-context-fill', type: 'fill', source: 'canada-census-context', paint: { 'fill-color': '#edece5' } },
          { id: 'canada-census-context-line', type: 'line', source: 'canada-census-context', paint: { 'line-color': '#94aaaa', 'line-width': .7 } },
          { id: 'canada-census-fill', type: 'fill', source: 'canada-census-regions', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1 } },
          { id: 'canada-census-boundaries', type: 'line', source: 'canada-census-regions', paint: { 'line-color': '#69796e', 'line-width': .7 } },
          { id: 'canada-census-selected', type: 'line', source: 'canada-census-regions', filter: ['==', ['get', 'id'], '__none__'], paint: { 'line-color': '#243f4c', 'line-width': 3 } },
        ] }, bounds: canadaCensusNationalBounds, fitBoundsOptions: { padding: 18 },
        minZoom: .5, maxZoom: 9, attributionControl: false, renderWorldCopies: false, scrollZoom: false,
        cooperativeGestures: true, locale: { 'CooperativeGesturesHandler.MobileHelpText': '地図は２本指で動かせます' },
        dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0, fadeDuration: 0,
      });
      map.touchZoomRotate.disableRotation();
      loadTimer = setTimeout(fail, 15000);
      map.on('error', fail);
      map.on('dragstart', () => { dragged = true; fitted = false; cameraCommitPending = true; });
      map.on('movestart', event => { if ('originalEvent' in event && event.originalEvent && !programmaticCamera) { fitted = false; cameraCommitPending = true; } });
      map.on('move', () => { syncMapFrame(); drawLabels(); });
      map.on('moveend', () => { syncMapFrame(); drawLabels(); if (cameraCommitPending && !programmaticCamera) commitCamera(); setTimeout(() => { dragged = false; }, 0); });
      map.on('click', 'canada-census-fill', event => { if (!dragged) select(String(event.features?.[0]?.properties?.id ?? '')); });
      map.on('mouseenter', 'canada-census-fill', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'canada-census-fill', () => { if (map) map.getCanvas().style.cursor = ''; });
      listen(map.getCanvas(), 'webglcontextlost', fail);
      map.once('load', () => {
        if (destroyed || !map) return;
        for(const [id,cross] of [['canada-census-f',false],['canada-census-uncovered',true]] as const){const size=10,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const line=(x+y)%size===0||(cross&&(x-y+size)%size===0);data.set(line?[120,119,109,255]:cross?[215,220,219,255]:[231,224,211,255],(y*size+x)*4);}map.addImage(id,{width:size,height:size,data});}
        map.addLayer({id:'canada-census-quality-f',type:'fill',source:'canada-census-regions',filter:['==',['get','status'],'quality-f'],paint:{'fill-pattern':'canada-census-f'}},'canada-census-boundaries');
        map.addLayer({id:'canada-census-not-covered',type:'fill',source:'canada-census-regions',filter:['==',['get','status'],'not-covered'],paint:{'fill-pattern':'canada-census-uncovered'}},'canada-census-boundaries');
        clearTimeout(loadTimer); ready = true; live.style.visibility = 'visible'; root.dataset.canadaCensusRender = 'maplibre';
        fallback.style.visibility = 'hidden'; fallback.setAttribute('aria-hidden', 'true'); fallback.setAttribute('tabindex', '-1');
        if (fitted) fit(); else {
          const bounds = cameraBounds(); programmaticCamera = true;
          map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 0, duration: 0 });
          programmaticCamera = false; draw();
        }
      });
    } catch { fail(); }
  }

  listen(root, 'click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-canada-census-shape]');
    if (target && !dragged) select(target.getAttribute('data-canada-census-shape') ?? '');
  });
  for (const shape of root.querySelectorAll<SVGElement>('[data-canada-census-shape]')) listen(shape, 'keydown', event => {
    const key = (event as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') { event.preventDefault(); select(shape.dataset.canadaCensusShape!); }
  });
  listen(onlyControl, 'change', () => emit('canada-census-only', { only: onlyControl.checked }));
  listen(selector,'change',()=>select(selector.value));
  listen(root.querySelector('[data-canada-census-reset]')!, 'click', () => { fit(); emit('canada-census-reset', {}); });
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-canada-census-zoom]')) listen(button, 'click', () => zoom(button.dataset.canadaCensusZoom as 'in' | 'out'));
  listen(focusButton, 'click', focusSelected);

  let drag: { x: number; y: number; frame: Frame; pointerId: number } | undefined;
  listen(fallback, 'pointerdown', event => {
    const pointer = event as PointerEvent;
    if (ready || pointer.button !== 0 || pointer.pointerType === 'touch') return;
    drag = { x: pointer.clientX, y: pointer.clientY, frame: [...frame], pointerId: pointer.pointerId }; dragged = false;
  });
  listen(fallback, 'pointermove', event => {
    if (!drag) return;
    const pointer = event as PointerEvent, dx = pointer.clientX - drag.x, dy = pointer.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 5) return;
    dragged = true; fitted = false; fallback.setPointerCapture?.(drag.pointerId);
    const ratio = Math.min(stage.clientWidth / drag.frame[2], stage.clientHeight / drag.frame[3]);
    frame = [drag.frame[0] - dx / ratio, drag.frame[1] - dy / ratio, drag.frame[2], drag.frame[3]]; draw();
  });
  const finishDrag = () => { if (drag && dragged) commitCamera(); drag = undefined; setTimeout(() => { dragged = false; }, 0); };
  listen(fallback, 'pointerup', finishDrag); listen(fallback, 'pointercancel', finishDrag);
  listen(fallback, 'keydown', event => {
    if (event.target !== fallback) return;
    const key = (event as KeyboardEvent).key;
    if (key === '+' || key === '=') { event.preventDefault(); zoom('in'); }
    else if (key === '-') { event.preventDefault(); zoom('out'); }
    else if (key.startsWith('Arrow')) {
      event.preventDefault(); fitted = false;
      const x = key === 'ArrowLeft' ? -.1 : key === 'ArrowRight' ? .1 : 0, y = key === 'ArrowUp' ? -.1 : key === 'ArrowDown' ? .1 : 0;
      frame = [frame[0] + frame[2] * x, frame[1] + frame[3] * y, frame[2], frame[3]]; commitCamera();
    }
  });
  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
    if (ready && map && stage.clientWidth && stage.clientHeight) { map.resize(); if (fitted) fit(); else drawLabels(); }
    else { drawLabels(); void start(); }
  });
  resize?.observe(stage);
  const visibility = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(() => { if (!root.hidden) { map?.resize(); if (ready && fitted) fit(); else draw(); void start(); } });
  visibility?.observe(root, { attributes: true, attributeFilter: ['hidden'] });
  root.querySelector('[data-canada-census-fallback-labels]')?.setAttribute('hidden', '');
  draw(); void start();
  return {
    render(next) { const selected = !!next.selected && Object.prototype.hasOwnProperty.call(config.records,next.selected) ? next.selected : null; state = { product:next.product, selected, only: !!next.only && !!selected, observation:resolveCanadaCensusObservation(next.observation) }; if ('bounds' in next) restoreCamera(next.bounds ?? null); draw(); if (!root.hidden) { map?.resize(); if (ready && fitted) fit(); void start(); } },
    reset: fit, zoom, focusSelected,
    destroy() { destroyed = true; abort.abort(); clearTimeout(loadTimer); resize?.disconnect(); visibility?.disconnect(); map?.remove(); map = undefined; },
  };
}
