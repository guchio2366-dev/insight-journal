import type { Map as LibreMap } from 'maplibre-gl';
import {
  canadaLandformBounds as canadaNaturalBounds, canadaLandformSize as canadaNaturalSize,
  projectCanadaLandform as projectCanadaNatural, unprojectCanadaLandform as unprojectCanadaNatural,
} from '../lib/atlas-canada-landform-map';
import {
  canadaNaturalGroupBounds, prepareCanadaNaturalLayer,
  type CanadaNaturalCollection, type CanadaNaturalContourLabel, type CanadaNaturalGroup, type CanadaNaturalLayer, type CanadaNaturalStation,
} from '../lib/atlas-canada-natural-layer';

export type CanadaNaturalCameraBounds = [number, number, number, number];
export interface CanadaNaturalState { selected: string | null; only: boolean; bounds?: CanadaNaturalCameraBounds | null; city?: string | null; }
export interface CanadaNaturalController {
  render(state: CanadaNaturalState): void;
  reset(): void;
  zoom(direction: 'in' | 'out'): void;
  focusSelected(): void;
  destroy(): void;
}
type Frame = [number, number, number, number];
interface Config { layer: CanadaNaturalLayer; geometryUrl: string; groups: CanadaNaturalGroup[]; stations: CanadaNaturalStation[]; contourLabels?: CanadaNaturalContourLabel[]; context: unknown; workerUrl: string; }

/** Selection belongs to the host page. Camera gestures stay local to this map. */
export function initCanadaNaturalLayer(root: HTMLElement, options: { deferStart?: boolean } = {}): CanadaNaturalController {
  const config: Config = JSON.parse(root.querySelector('[data-canada-natural-config]')!.textContent!);
  const stage = root.querySelector<HTMLElement>('[data-canada-natural-stage]')!;
  const fallback = root.querySelector<SVGSVGElement>('[data-canada-natural-fallback]')!;
  const live = root.querySelector<HTMLElement>('[data-canada-natural-live]')!;
  const status = root.querySelector<HTMLElement>('[data-canada-natural-status]')!;
  const onlyControl = root.querySelector<HTMLInputElement>('[data-canada-natural-only]')!;
  const focusButton = root.querySelector<HTMLButtonElement>('[data-canada-natural-focus]')!;
  const labels = [...root.querySelectorAll<HTMLButtonElement>('[data-canada-natural-city]')];
  const contourLabels = [...root.querySelectorAll<HTMLElement>('[data-canada-natural-contour-label]')];
  const fullFrame: Frame = [0, 0, canadaNaturalSize.width, canadaNaturalSize.height];
  const [worldLeft, worldTop] = projectCanadaNatural([-180, 85.051]);
  const [worldRight, worldBottom] = projectCanadaNatural([180, -85.051]);
  const abort = new AbortController();
  root.dataset.canadaNaturalRender = 'svg';
  let state: CanadaNaturalState = { selected: null, only: false };
  let frame: Frame = [...fullFrame];
  let geometry: CanadaNaturalCollection | undefined;
  let map: LibreMap | undefined;
  let ready = false, started = false, destroyed = false, fitted = true, dragged = false;
  let cameraKey = 'fit', cameraCommitPending = false, programmaticCamera = false;
  let loadTimer: ReturnType<typeof setTimeout> | undefined;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const emit = (name: string, detail: Record<string, unknown>) => root.dispatchEvent(new CustomEvent(name, { detail: { layer: config.layer, ...detail }, bubbles: true }));
  const select = (id: string) => { if (config.groups.some(group => group.id === id)) emit('canada-natural-select', { id }); };
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
  function cameraBounds(): CanadaNaturalCameraBounds {
    frame = clampFrame(frame);
    const [west, north] = unprojectCanadaNatural([frame[0], frame[1]]);
    const [east, south] = unprojectCanadaNatural([frame[0] + frame[2], frame[1] + frame[3]]);
    const bounds = [west, south, east, north].map(value => Math.round(value * 100000) / 100000) as CanadaNaturalCameraBounds;
    // Keep unusually small, restored cameras ordered at the host's five-decimal URL precision.
    if (bounds[0] === bounds[2]) { bounds[0] = Math.floor(west * 100000) / 100000; bounds[2] = Math.ceil(east * 100000) / 100000; }
    if (bounds[1] === bounds[3]) { bounds[1] = Math.floor(south * 100000) / 100000; bounds[3] = Math.ceil(north * 100000) / 100000; }
    return bounds;
  }
  function setFrame(bounds: CanadaNaturalCameraBounds) {
    if (!bounds.every(Number.isFinite) || bounds[0] >= bounds[2] || bounds[1] >= bounds[3]) { frame = [...fullFrame]; return false; }
    const [left, bottom] = projectCanadaNatural([bounds[0], bounds[1]]), [right, top] = projectCanadaNatural([bounds[2], bounds[3]]);
    frame = clampFrame([left, top, right - left, bottom - top]);
    return true;
  }
  function syncMapFrame() {
    if (!ready || !map) return;
    const bounds = map.getBounds();
    setFrame([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]);
  }
  function commitCamera() {
    clearTimeout(wheelTimer);
    syncMapFrame();
    const bounds = cameraBounds();
    cameraKey = bounds.join(','); cameraCommitPending = false;
    draw(); emit('canada-natural-camera', { bounds });
  }
  function restoreCamera(bounds: CanadaNaturalCameraBounds | null) {
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
    const occupied: number[][] = [[width - 60, 0, width, 183]];
    const positions = new Map(config.stations.map(station => {
      const projected = ready && map ? map.project(station.coordinates as [number, number]) : null, point = projectCanadaNatural(station.coordinates);
      return [station.id, [projected?.x ?? (point[0] - frame[0]) * ratio + left, projected?.y ?? (point[1] - frame[1]) * ratio + top]];
    }));
    const markerBoxes = [...positions].map(([id, [x,y]]) => ({ id, box: [x-6,y-12,x+6,y+12] }));
    for (const label of [...labels].sort((a, b) => Number(b.dataset.canadaNaturalCity === state.city) - Number(a.dataset.canadaNaturalCity === state.city))) {
      const station = config.stations.find(item => item.id === label.dataset.canadaNaturalCity)!;
      const [x,y] = positions.get(station.id)!;
      label.hidden = false;
      const text = label.querySelector<HTMLElement>('span');
      // Measure the full name on every redraw; a previously hidden name must
      // still reserve its full width when its city becomes selected.
      if (text) text.hidden = false;
      const w = text?.offsetWidth || Math.min(185, (label.textContent?.length ?? 0) * 12 + 8), h = text?.offsetHeight || 22;
      // The circle remains at the real observation coordinate at every scale.
      label.hidden = x < 3 || y < 3 || x > width - 3 || y > height - 3;
      const collisionBoxes = [...occupied, ...markerBoxes.filter(marker => marker.id !== station.id).map(marker => marker.box)];
      const candidates = station.id===state.city ? [[x+8,y],[x+8,y-28],[x+8,y+28],[x+8,y-50],[x+8,y+50],[x-w-8,y-28],[x-w-8,y+28]] : [[x+8,y]];
      const available = ([left,centerY]:number[]) => {
        const box=[left,centerY-h/2,left+w,centerY+h/2];
        return box[0]>=3 && box[1]>=3 && box[2]<=width-3 && box[3]<=height-3 && !collisionBoxes.some(([x1,y1,x2,y2]) => box[0]<x2+3 && box[2]>x1-3 && box[1]<y2+3 && box[3]>y1-3);
      };
      const placement = candidates.find(available);
      const [textLeft,textY] = placement ?? [Math.max(3,Math.min(width-w-3,x+8)),Math.max(h/2+3,Math.min(height-h/2-3,y-28))];
      if (text) {
        text.hidden = !placement && station.id!==state.city;
        text.style.left = `${textLeft-x+6}px`;
        text.style.top = `${12+textY-y}px`;
      }
      label.style.zIndex = station.id === state.city ? '2' : '1';
      label.style.left = `${x}px`; label.style.top = `${y}px`;
      if (!label.hidden) {
        occupied.push([x-6,y-12,x+6,y+12]);
        if (text && !text.hidden) occupied.push([textLeft,textY-h/2,textLeft+w,textY+h/2]);
      }
    }
    const byKey = new Map((config.contourLabels ?? []).map(label => [label.key,label]));
    const ordered = [...contourLabels].sort((a,b) => {
      const first = byKey.get(a.dataset.canadaNaturalContourLabel!)!, second = byKey.get(b.dataset.canadaNaturalContourLabel!)!;
      return Number(second.id===state.selected)-Number(first.id===state.selected) || Number(first.elevationM===500)-Number(second.elevationM===500);
    });
    for (const element of ordered) {
      const label = byKey.get(element.dataset.canadaNaturalContourLabel!);
      if (!label || state.only && state.selected && label.id !== state.selected) { element.hidden = true; continue; }
      const projected = ready && map ? map.project(label.coordinates) : null, point = projectCanadaNatural(label.coordinates);
      const x = projected?.x ?? (point[0]-frame[0])*ratio+left, y = projected?.y ?? (point[1]-frame[1])*ratio+top;
      element.hidden = false;
      const w = element.offsetWidth || 58, h = element.offsetHeight || 20, box = [x-w/2,y-h/2,x+w/2,y+h/2];
      element.classList.toggle('is-selected',label.id===state.selected);
      element.style.left = `${x}px`; element.style.top = `${y}px`;
      element.hidden = box[0]<3 || box[1]<3 || box[2]>width-3 || box[3]>height-3 || occupied.some(([x1,y1,x2,y2]) => box[0]<x2+5 && box[2]>x1-5 && box[1]<y2+5 && box[3]>y1-5);
      if (!element.hidden) occupied.push(box);
    }
  }

  function draw() {
    frame = clampFrame(frame);
    fallback.setAttribute('viewBox', frame.join(' '));
    for (const element of root.querySelectorAll<HTMLElement | SVGElement>('[data-canada-natural-shape],[data-canada-natural-legend]')) {
      const id = element.getAttribute('data-canada-natural-shape') ?? element.getAttribute('data-canada-natural-legend');
      element.classList.toggle('is-selected', id === state.selected);
      element.setAttribute('aria-pressed', String(id === state.selected));
      if (element.hasAttribute('data-canada-natural-shape')) {
        const hidden = state.only && !!state.selected && id !== state.selected;
        element.toggleAttribute('hidden', hidden);
        element.setAttribute('tabindex', hidden || ready ? '-1' : '0');
      }
    }
    for (const element of root.querySelectorAll<HTMLElement | SVGElement>('[data-canada-natural-city],[data-canada-natural-static-city]')) {
      const id = element.getAttribute('data-canada-natural-city') ?? element.getAttribute('data-canada-natural-static-city');
      element.classList.toggle('is-selected', id === state.city);
      element.setAttribute('aria-pressed', String(id === state.city));
    }
    onlyControl.checked = state.only; onlyControl.disabled = !state.selected; focusButton.disabled = !state.selected;
    if (map && ready) {
      const selected = ['==', ['get', 'id'], state.selected ?? '__none__'] as any;
      const all = ['has', 'id'];
      const filter = state.only && state.selected ? selected : all;
      map.setFilter('canada-natural-fill', ['all', ['==', ['geometry-type'], 'Polygon'], filter] as any);
      map.setFilter('canada-natural-boundaries', ['all', ['==', ['geometry-type'], 'Polygon'], filter] as any);
      map.setFilter('canada-natural-lines', ['all', ['==', ['geometry-type'], 'LineString'], filter] as any);
      map.setFilter('canada-natural-lines-hit', ['all', ['==', ['geometry-type'], 'LineString'], filter] as any);
      map.setFilter('canada-natural-selected', selected);
    }
    const group = config.groups.find(item => item.id === state.selected);
    status.textContent = group ? `${group.name}${state.only ? 'だけ表示。' : 'を選択。'} ${group.description}` : '地図か凡例で区分を選べます。';
    drawLabels();
  }

  function fit() {
    clearTimeout(wheelTimer);
    fitted = true; frame = clampFrame([...fullFrame]); cameraKey = 'fit'; cameraCommitPending = false;
    if (ready && map) { programmaticCamera = true; map.fitBounds(canadaNaturalBounds, { padding: { top: 18, right: 18, bottom: 18, left: 18 }, duration: 0 }); syncMapFrame(); programmaticCamera = false; }
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
    const bounds = geometry ? canadaNaturalGroupBounds(geometry, state.selected) : null;
    const path = [...root.querySelectorAll<SVGGElement>('[data-canada-natural-shape]')].find(element => element.dataset.canadaNaturalShape === state.selected);
    fitted = false;
    if (bounds) {
      if (ready && map) { cameraCommitPending = true; map.fitBounds(bounds, { padding: { top: 35, right: 70, bottom: 35, left: 35 }, maxZoom: 7, duration: reducedMotion() ? 0 : 250 }); return; }
      const [left, bottom] = projectCanadaNatural(bounds[0]), [right, top] = projectCanadaNatural(bounds[1]);
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
    root.dataset.canadaNaturalRender = 'svg'; draw(); if (pending) commitCamera();
  }
  async function start() {
    if (started || destroyed || root.hidden || !stage.clientWidth) return;
    started = true;
    if (new URL(location.href).searchParams.get('render') === 'static') { root.dataset.canadaNaturalRender = 'svg'; return; }
    try {
      const geometryUrl = new URL(config.geometryUrl, location.href);
      if (geometryUrl.origin !== location.origin) throw new Error('Canada landform geometry must be local');
      const response = await fetch(geometryUrl.href, { signal: abort.signal });
      if (!response.ok) throw new Error(`Canada landform geometry ${response.status}`);
      geometry = prepareCanadaNaturalLayer(await response.json(), config.groups);
      const libre = await import('maplibre-gl');
      if (destroyed) return;
      libre.setWorkerUrl(config.workerUrl); libre.setWorkerCount(1); live.style.visibility = 'hidden'; live.hidden = false;
      map = new libre.Map({
        container: live, style: { version: 8, sources: {
          'canada-natural-context': { type: 'geojson', data: config.context as any },
          'canada-natural-groups': { type: 'geojson', data: geometry as any, tolerance: 0 },
        }, layers: [
          { id: 'canada-natural-ocean', type: 'background', paint: { 'background-color': '#e4eff0' } },
          { id: 'canada-natural-context-fill', type: 'fill', source: 'canada-natural-context', paint: { 'fill-color': '#edece5' } },
          { id: 'canada-natural-context-line', type: 'line', source: 'canada-natural-context', paint: { 'line-color': '#94aaaa', 'line-width': .7 } },
          { id: 'canada-natural-fill', type: 'fill', source: 'canada-natural-groups', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1 } },
          { id: 'canada-natural-boundaries', type: 'line', source: 'canada-natural-groups', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'line-color': '#69796e', 'line-width': .35 } },
          { id: 'canada-natural-lines', type: 'line', source: 'canada-natural-groups', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': ['get', 'color'], 'line-width': ['case',['==',['get','elevation_m'],500],.7,1.8], 'line-opacity': ['case',['==',['get','elevation_m'],500],.45,.9] } },
          { id: 'canada-natural-lines-hit', type: 'line', source: 'canada-natural-groups', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#fff', 'line-width': 9, 'line-opacity': 0 } },
          { id: 'canada-natural-selected', type: 'line', source: 'canada-natural-groups', filter: ['==', ['get', 'id'], '__none__'], paint: { 'line-color': ['case', ['==', ['geometry-type'], 'LineString'], ['get', 'color'], '#243f4c'], 'line-width': 3 } },
        ] }, bounds: canadaNaturalBounds, fitBoundsOptions: { padding: 18 },
        minZoom: .5, maxZoom: 9, attributionControl: false, renderWorldCopies: false, scrollZoom: false,
        cooperativeGestures: true, locale: { 'CooperativeGesturesHandler.MobileHelpText': '地図は2本指で動かせます' },
        dragRotate: false, pitchWithRotate: false, touchPitch: false, maxPitch: 0, fadeDuration: 0,
      });
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      loadTimer = setTimeout(fail, 15000);
      map.on('error', event => { console.warn('Canada landform map switched to the same-source SVG fallback:', event.error?.message); fail(); });
      map.on('dragstart', () => { dragged = true; fitted = false; cameraCommitPending = true; });
      map.on('movestart', event => { if ('originalEvent' in event && event.originalEvent && !programmaticCamera) { fitted = false; cameraCommitPending = true; } });
      map.on('move', () => { syncMapFrame(); drawLabels(); });
      map.on('moveend', () => { syncMapFrame(); drawLabels(); if (cameraCommitPending && !programmaticCamera) commitCamera(); setTimeout(() => { dragged = false; }, 0); });
      map.on('click', ['canada-natural-fill', 'canada-natural-lines-hit'], event => { if (!dragged) select(String(event.features?.[0]?.properties?.id ?? '')); });
      map.on('mouseenter', 'canada-natural-fill', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'canada-natural-fill', () => { if (map) map.getCanvas().style.cursor = ''; });
      listen(map.getCanvas(), 'webglcontextlost', fail);
      map.once('load', () => {
        if (destroyed || !map) return;
        clearTimeout(loadTimer); ready = true; live.style.visibility = 'visible'; root.dataset.canadaNaturalRender = 'maplibre';
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
    const target = (event.target as Element).closest<HTMLElement>('[data-canada-natural-shape],[data-canada-natural-legend]');
    if (target && !dragged) select(target.getAttribute('data-canada-natural-shape') ?? target.dataset.canadaNaturalLegend ?? '');
    const city = (event.target as Element).closest<HTMLElement>('[data-canada-natural-city],[data-canada-natural-static-city]');
    if (city && !dragged) emit('canada-natural-city', { id: city.getAttribute('data-canada-natural-city') ?? city.getAttribute('data-canada-natural-static-city') });
  });
  for (const shape of root.querySelectorAll<SVGElement>('[data-canada-natural-shape]')) listen(shape, 'keydown', event => {
    const key = (event as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') { event.preventDefault(); select(shape.dataset.canadaNaturalShape!); }
  });
  for (const city of root.querySelectorAll<SVGElement>('[data-canada-natural-static-city]')) listen(city, 'keydown', event => {
    const key = (event as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') { event.preventDefault(); emit('canada-natural-city', { id: city.dataset.canadaNaturalStaticCity }); }
  });
  listen(onlyControl, 'change', () => emit('canada-natural-only', { only: onlyControl.checked }));
  listen(root.querySelector('[data-canada-natural-reset]')!, 'click', () => { fit(); emit('canada-natural-reset', {}); });
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-canada-natural-zoom]')) listen(button, 'click', () => zoom(button.dataset.canadaNaturalZoom as 'in' | 'out'));
  listen(focusButton, 'click', focusSelected);
  listen(stage, 'wheel', event => {
    const wheel = event as WheelEvent;
    event.preventDefault();
    if (destroyed || !wheel.deltaY) return;
    fitted = false;
    const rectangle = stage.getBoundingClientRect();
    const x = wheel.clientX - rectangle.left, y = wheel.clientY - rectangle.top;
    const delta = wheel.deltaY * (wheel.deltaMode === 1 ? 16 : wheel.deltaMode === 2 ? stage.clientHeight : 1);
    if (ready && map) {
      cameraCommitPending = true;
      map.zoomTo(map.getZoom() + Math.max(-.7, Math.min(.7, -delta * .003)), { around: map.unproject([x, y]), duration: 0 });
      return;
    }
    const ratio = Math.min(stage.clientWidth / frame[2], stage.clientHeight / frame[3]);
    if (!(ratio > 0)) return;
    const left = (stage.clientWidth - frame[2] * ratio) / 2, top = (stage.clientHeight - frame[3] * ratio) / 2;
    const anchorX = frame[0] + (x - left) / ratio, anchorY = frame[1] + (y - top) / ratio;
    const factor = Math.exp(Math.max(-.4, Math.min(.4, delta * .002)));
    const width = Math.max(30, frame[2] * factor), height = frame[3] * width / frame[2];
    frame = [anchorX - (anchorX - frame[0]) * width / frame[2], anchorY - (anchorY - frame[1]) * height / frame[3], width, height];
    draw(); clearTimeout(wheelTimer); wheelTimer = setTimeout(commitCamera, 120);
  }, { passive: false });

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
  root.querySelector('[data-canada-natural-static-stations]')?.setAttribute('hidden', '');
  root.querySelector('[data-canada-natural-static-contours]')?.setAttribute('hidden', '');
  draw(); if (!options.deferStart) void start();
  return {
    render(next) { const selected = config.groups.some(group => group.id === next.selected) ? next.selected : null; state = { selected, only: !!next.only && !!selected, city: next.city ?? state.city ?? null }; if ('bounds' in next) restoreCamera(next.bounds ?? null); draw(); if (!root.hidden) { map?.resize(); if (ready && fitted) fit(); void start(); } },
    reset: fit, zoom, focusSelected,
    destroy() { destroyed = true; abort.abort(); clearTimeout(loadTimer); clearTimeout(wheelTimer); resize?.disconnect(); visibility?.disconnect(); map?.remove(); map = undefined; },
  };
}
