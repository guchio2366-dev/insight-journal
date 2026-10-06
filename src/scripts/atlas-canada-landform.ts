import type { Map as LibreMap } from 'maplibre-gl';
import {
  canadaLandformBounds, canadaLandformFeatureBounds, canadaLandformSize, prepareCanadaLandforms, projectCanadaLandform, unprojectCanadaLandform,
  type CanadaLandformCollection, type CanadaLandformRegion,
} from '../lib/atlas-canada-landform-map';

export type CanadaLandformCameraBounds = [number, number, number, number];
export interface CanadaLandformState { selected: string | null; only: boolean; bounds?: CanadaLandformCameraBounds | null; }
export interface CanadaLandformController {
  render(state: CanadaLandformState): void;
  reset(): void;
  zoom(direction: 'in' | 'out'): void;
  focusSelected(): void;
  destroy(): void;
}
type Frame = [number, number, number, number];
interface Config { geometryUrl: string; regions: CanadaLandformRegion[]; context: unknown; rivers: unknown; lakes: unknown; workerUrl: string; }

/** Selection belongs to the host page. Camera gestures stay local to this map. */
export function initCanadaLandform(root: HTMLElement): CanadaLandformController {
  const config: Config = JSON.parse(root.querySelector('[data-canada-landform-config]')!.textContent!);
  const stage = root.querySelector<HTMLElement>('[data-canada-landform-stage]')!;
  const fallback = root.querySelector<SVGSVGElement>('[data-canada-landform-fallback]')!;
  const live = root.querySelector<HTMLElement>('[data-canada-landform-live]')!;
  const status = root.querySelector<HTMLElement>('[data-canada-landform-status]')!;
  const onlyControl = root.querySelector<HTMLInputElement>('[data-canada-landform-only]')!;
  const focusButton = root.querySelector<HTMLButtonElement>('[data-canada-landform-focus]')!;
  const labels = [...root.querySelectorAll<HTMLButtonElement>('[data-canada-landform-label]')];
  const fullFrame: Frame = [0, 0, canadaLandformSize.width, canadaLandformSize.height];
  const [worldLeft, worldTop] = projectCanadaLandform([-180, 85.051]);
  const [worldRight, worldBottom] = projectCanadaLandform([180, -85.051]);
  const abort = new AbortController();
  root.dataset.canadaLandformRender = 'svg';
  let state: CanadaLandformState = { selected: null, only: false };
  let frame: Frame = [...fullFrame];
  let geometry: CanadaLandformCollection | undefined;
  let map: LibreMap | undefined;
  let ready = false, started = false, destroyed = false, fitted = true, dragged = false;
  let cameraKey = 'fit', cameraCommitPending = false, programmaticCamera = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const emit = (name: string, detail: unknown) => root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  const select = (id: string) => { if (config.regions.some(region => region.id === id)) emit('canada-landform-select', { id }); };
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
  function cameraBounds(): CanadaLandformCameraBounds {
    frame = clampFrame(frame);
    const [west, north] = unprojectCanadaLandform([frame[0], frame[1]]);
    const [east, south] = unprojectCanadaLandform([frame[0] + frame[2], frame[1] + frame[3]]);
    const bounds = [west, south, east, north].map(value => Math.round(value * 100000) / 100000) as CanadaLandformCameraBounds;
    // Keep unusually small, restored cameras ordered at the host's five-decimal URL precision.
    if (bounds[0] === bounds[2]) { bounds[0] = Math.floor(west * 100000) / 100000; bounds[2] = Math.ceil(east * 100000) / 100000; }
    if (bounds[1] === bounds[3]) { bounds[1] = Math.floor(south * 100000) / 100000; bounds[3] = Math.ceil(north * 100000) / 100000; }
    return bounds;
  }
  function setFrame(bounds: CanadaLandformCameraBounds) {
    if (!bounds.every(Number.isFinite) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) { frame = [...fullFrame]; return false; }
    const [left, bottom] = projectCanadaLandform([bounds[0], bounds[1]]), [right, top] = projectCanadaLandform([bounds[2], bounds[3]]);
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
    draw(); emit('canada-landform-camera', { bounds });
  }
  function restoreCamera(bounds: CanadaLandformCameraBounds | null) {
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
      syncMapFrame();
      programmaticCamera = false;
    }
    draw();
  }

  function drawLabels() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(width / frame[2], height / frame[3]);
    const left = (width - frame[2] * ratio) / 2, top = (height - frame[3] * ratio) / 2;
    const occupied: number[][] = [[width - 60, 0, width, 205]];
    for (const label of [...labels].sort((a, b) => Number(b.dataset.canadaLandformLabel === state.selected) - Number(a.dataset.canadaLandformLabel === state.selected))) {
      const region = config.regions.find(item => item.id === label.dataset.canadaLandformLabel)!;
      if (state.only && state.selected && region.id !== state.selected) { label.hidden = true; continue; }
      const projected = ready && map ? map.project(region.labelAnchor as [number, number]) : null;
      const point = projectCanadaLandform(region.labelAnchor);
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
    for (const element of root.querySelectorAll<HTMLElement | SVGElement>('[data-canada-landform-shape],[data-canada-landform-label],[data-canada-landform-legend]')) {
      const id = element.getAttribute('data-canada-landform-shape') ?? element.getAttribute('data-canada-landform-label') ?? element.getAttribute('data-canada-landform-legend');
      element.classList.toggle('is-selected', id === state.selected);
      element.setAttribute('aria-pressed', String(id === state.selected));
      if (element.hasAttribute('data-canada-landform-shape')) {
        const hidden = state.only && !!state.selected && id !== state.selected;
        element.toggleAttribute('hidden', hidden);
        element.setAttribute('tabindex', hidden || ready ? '-1' : '0');
      }
    }
    onlyControl.checked = state.only; onlyControl.disabled = !state.selected; focusButton.disabled = !state.selected;
    if (map && ready) {
      const selected = ['==', ['get', 'id'], state.selected ?? '__none__'] as any;
      const filter = state.only && state.selected ? selected : null;
      map.setFilter('canada-landform-fill', filter);
      map.setPaintProperty('canada-landform-fill','fill-opacity',['case',selected,.24,0]);
      map.setFilter('canada-landform-boundaries', filter);
      map.setFilter('canada-landform-selected', selected);
    }
    const region = config.regions.find(item => item.id === state.selected);
    status.textContent = region ? `${region.name}${state.only ? 'だけを表示しています。' : 'を選びました。'} 地形の特徴を右の読み物で確認できます。` : '七つの地形地域を表示しています。地域や凡例から選べます。';
    drawLabels();
  }

  function fit() {
    fitted = true; frame = clampFrame([...fullFrame]); cameraKey = 'fit'; cameraCommitPending = false;
    if (ready && map) { programmaticCamera = true; map.fitBounds(canadaLandformBounds, { padding: { top: 18, right: 18, bottom: 18, left: 18 }, duration: 0 }); syncMapFrame(); programmaticCamera = false; }
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
    const path = root.querySelector<SVGPathElement>(`[data-canada-landform-shape="${state.selected}"]`);
    fitted = false;
    if (feature) {
      const bounds = canadaLandformFeatureBounds(feature.geometry);
      if (ready && map) { cameraCommitPending = true; map.fitBounds(bounds, { padding: { top: 35, right: 70, bottom: 35, left: 35 }, maxZoom: 7, duration: reducedMotion() ? 0 : 250 }); return; }
      const [left, bottom] = projectCanadaLandform(bounds[0]), [right, top] = projectCanadaLandform(bounds[1]);
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
    root.dataset.canadaLandformRender = 'svg'; draw(); if (pending) commitCamera();
  }
  async function start() {
    if (started || destroyed || root.hidden || !stage.clientWidth) return;
    started = true;
    if (new URL(location.href).searchParams.get('render') === 'static') { root.dataset.canadaLandformRender = 'svg'; return; }
    try {
      const geometryUrl = new URL(config.geometryUrl, location.href);
      if (geometryUrl.origin !== location.origin) throw new Error('Canada landform geometry must be local');
      const response = await fetch(geometryUrl.href, { signal: abort.signal });
      if (!response.ok) throw new Error(`Canada landform geometry ${response.status}`);
      geometry = prepareCanadaLandforms(await response.json(), config.regions);
      const libre = await import('maplibre-gl');
      if (destroyed) return;
      libre.setWorkerUrl(config.workerUrl); libre.setWorkerCount(1); live.style.visibility = 'hidden'; live.hidden = false;
      map = new libre.Map({
        container: live, style: { version: 8, sources: {
          'canada-landform-context': { type: 'geojson', data: config.context as any },
          'ca-rivers':{type:'geojson',data:config.rivers as any},'ca-lakes':{type:'geojson',data:config.lakes as any},'ca-contours':{type:'geojson',data:config.geometryUrl.replace('canada-physiography-v1/regions.geojson','canada-climate-elevation-v1/elevation-contours.geojson')},
          'canada-landform-regions': { type: 'geojson', data: geometry as any, tolerance: 0 },
        }, layers: [
          { id: 'canada-landform-ocean', type: 'background', paint: { 'background-color': '#e4eff0' } },
          { id: 'canada-landform-context-fill', type: 'fill', source: 'canada-landform-context', paint: { 'fill-color': '#edece5' } },
          { id: 'canada-landform-context-line', type: 'line', source: 'canada-landform-context', paint: { 'line-color': '#94aaaa', 'line-width': .7 } },
          {id:'ca-contours',type:'line',source:'ca-contours',filter:['<=',['get','elevation_m'],2000],paint:{'line-color':'#b2a886','line-width':.55,'line-opacity':.4}},
          {id:'ca-lakes',type:'fill',source:'ca-lakes',paint:{'fill-color':'#c6dfe4'}},
          {id:'ca-rivers',type:'line',source:'ca-rivers',paint:{'line-color':'#92b5c4','line-width':.7}},
          { id: 'canada-landform-fill', type: 'fill', source: 'canada-landform-regions', paint: { 'fill-color': '#d4c8a6', 'fill-opacity': ['case',['==',['get','id'],state.selected ?? '__none__'],.24,0] } },
          { id: 'canada-landform-boundaries', type: 'line', source: 'canada-landform-regions', paint: { 'line-color': '#69796e', 'line-opacity': 0, 'line-width': .7 } },
          { id: 'canada-landform-selected', type: 'line', source: 'canada-landform-regions', filter: ['==', ['get', 'id'], '__none__'], paint: { 'line-color': '#243f4c', 'line-width': 3 } },
        ] }, bounds: canadaLandformBounds, fitBoundsOptions: { padding: 18 },
        minZoom: .5, maxZoom: 9, attributionControl: false, renderWorldCopies: false, scrollZoom: false,
        cooperativeGestures: true, locale: { 'CooperativeGesturesHandler.MobileHelpText': '地図は２本指で動かせます' },
        dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0, fadeDuration: 0,
      });
      map.touchZoomRotate.disableRotation();
      loadTimer = setTimeout(fail, 15000);
      map.on('error', event => { console.warn('Canada landform map switched to the same-source SVG fallback:', event.error?.message); fail(); });
      map.on('dragstart', () => { dragged = true; fitted = false; cameraCommitPending = true; });
      map.on('movestart', event => { if ('originalEvent' in event && event.originalEvent && !programmaticCamera) { fitted = false; cameraCommitPending = true; } });
      map.on('move', () => { syncMapFrame(); drawLabels(); });
      map.on('moveend', () => { syncMapFrame(); drawLabels(); if (cameraCommitPending && !programmaticCamera) commitCamera(); setTimeout(() => { dragged = false; }, 0); });
      map.on('click', 'canada-landform-fill', event => { if (!dragged) select(String(event.features?.[0]?.properties?.id ?? '')); });
      map.on('mouseenter', 'canada-landform-fill', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'canada-landform-fill', () => { if (map) map.getCanvas().style.cursor = ''; });
      listen(map.getCanvas(), 'webglcontextlost', fail);
      map.once('load', () => {
        if (destroyed || !map) return;
        clearTimeout(loadTimer); ready = true; live.style.visibility = 'visible'; root.dataset.canadaLandformRender = 'maplibre';
        fallback.style.visibility = 'hidden'; fallback.setAttribute('aria-hidden', 'true'); fallback.setAttribute('tabindex', '-1');
        if (fitted) fit(); else {
          const bounds = cameraBounds(); programmaticCamera = true;
          map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 0, duration: 0 });
          syncMapFrame();
          programmaticCamera = false; draw();
        }
      });
    } catch (error) { console.warn('Canada landform renderer could not start:', error instanceof Error ? error.stack : String(error)); fail(); }
  }

  listen(root, 'click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-canada-landform-shape],[data-canada-landform-label],[data-canada-landform-legend]');
    if (target && !dragged) select(target.getAttribute('data-canada-landform-shape') ?? target.dataset.canadaLandformLabel ?? target.dataset.canadaLandformLegend ?? '');
  });
  for (const shape of root.querySelectorAll<SVGElement>('[data-canada-landform-shape]')) listen(shape, 'keydown', event => {
    const key = (event as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') { event.preventDefault(); select(shape.dataset.canadaLandformShape!); }
  });
  listen(onlyControl, 'change', () => emit('canada-landform-only', { only: onlyControl.checked }));
  listen(root.querySelector('[data-canada-landform-reset]')!, 'click', () => { fit(); emit('canada-landform-reset', {}); });
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-canada-landform-zoom]')) listen(button, 'click', () => zoom(button.dataset.canadaLandformZoom as 'in' | 'out'));
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
  root.querySelector('[data-canada-landform-fallback-labels]')?.setAttribute('hidden', '');
  draw(); void start();
  return {
    render(next) { const selected = config.regions.some(region => region.id === next.selected) ? next.selected : null; state = { selected, only: !!next.only && !!selected }; if ('bounds' in next) restoreCamera(next.bounds ?? null); draw(); if (!root.hidden) { map?.resize(); if (ready && fitted) fit(); void start(); } },
    reset: fit, zoom, focusSelected,
    destroy() { destroyed = true; abort.abort(); clearTimeout(loadTimer); resize?.disconnect(); visibility?.disconnect(); map?.remove(); map = undefined; },
  };
}
