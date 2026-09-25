export type AsiaRegionId = 'east-asia' | 'southeast-asia' | 'south-central-asia';
export type AsiaField = 'natural' | 'agriculture' | 'industry' | 'population';
export type AsiaCamera = { lng: number; lat: number; zoom: number };
export type AsiaState = { field: AsiaField; place: string | null; city: string | null; camera: AsiaCamera | null; back: string | null; point?: [number, number] | null; topic?: string | null; detail?: string | null; compare?: string | null };
export type AsiaStateContext = { countries: readonly string[]; cities: readonly { id: string; countryCode: string }[]; bounds: readonly number[]; fields: readonly AsiaField[]; topics?: Partial<Record<AsiaField, readonly string[]>>; details?: Partial<Record<AsiaField, readonly string[]>> };
const ownedKeys = ['field', 'place', 'city', 'lng', 'lat', 'z', 'back', 'region', 'at', 'topic', 'detail', 'compare'];
export const asiaFieldPaths: Record<AsiaField, string> = { natural: 'nature', agriculture: 'agriculture', industry: 'industry', population: 'population' };
const routeField = (url: URL): AsiaField | undefined => Object.entries(asiaFieldPaths).find(([, path]) => url.pathname.endsWith(`/${path}/`))?.[0] as AsiaField | undefined;

export function readAsiaAtlasState(url: URL, context: AsiaStateContext): AsiaState {
  const q = url.searchParams;
  const requested = q.get('field') ?? routeField(url);
  const field = context.fields.includes(requested as AsiaField) ? requested as AsiaField : 'natural';
  const rawPlace = q.get('place');
  let place = rawPlace && context.countries.includes(rawPlace) ? rawPlace : null;
  const cityRecord = context.cities.find(c => c.id === q.get('city') && (!place || c.countryCode === place));
  const city = cityRecord?.id ?? null;
  if (cityRecord) place = cityRecord.countryCode;
  const n = (key: string, min: number, max: number) => {
    const raw = q.get(key); if (!raw?.trim()) return null;
    const value = Number(raw); return Number.isFinite(value) && value >= min && value <= max ? value : null;
  };
  const lng = n('lng', Math.max(-180, context.bounds[0] - 15), Math.min(180, context.bounds[2] + 15));
  const lat = n('lat', Math.max(-80, context.bounds[1] - 15), Math.min(80, context.bounds[3] + 15));
  const zoom = n('z', 1, 9);
  const camera = lng !== null && lat !== null && zoom !== null ? { lng, lat, zoom } : null;
  const rawBack = q.get('back');
  const back = rawBack && rawBack.length <= 600 && !new URLSearchParams(rawBack).has('back') ? rawBack : null;
  const coordinates=q.get('at')?.split(',');
  const point=coordinates?.length===2&&coordinates.every(v=>v.trim()!==''&&Number.isFinite(Number(v)))?coordinates.map(Number):null;
  const validPoint=point&&point[0]>=context.bounds[0]&&point[0]<=context.bounds[2]&&point[1]>=context.bounds[1]&&point[1]<=context.bounds[3]?point as [number,number]:null;
  const topic = q.get('topic'), detail = q.get('detail'), compare = q.get('compare');
  return { field, place, city, camera, back, ...(validPoint?{point:validPoint}:{}),
    ...(topic && context.topics?.[field]?.includes(topic) ? {topic} : {}),
    ...(detail && context.details?.[field]?.includes(detail) ? {detail} : {}),
    ...(compare && compare !== place && context.countries.includes(compare) ? {compare} : {}) };
}

export function writeAsiaAtlasState(url: URL, state: AsiaState): URL {
  const next = new URL(url);
  ownedKeys.forEach(key => next.searchParams.delete(key));
  const regionPath=next.pathname.match(/^(.*\/atlas\/asia\/(?:east-asia|southeast-asia|south-central-asia))(?:\/(?:nature|agriculture|industry|population))?\/?$/);
  if (regionPath) next.pathname = `${regionPath[1]}/${asiaFieldPaths[state.field]}/`;
  else if (state.field !== 'natural') next.searchParams.set('field', state.field);
  if (state.topic) next.searchParams.set('topic', state.topic);
  if (state.detail) next.searchParams.set('detail', state.detail);
  if (state.compare) next.searchParams.set('compare', state.compare);
  if (state.place) next.searchParams.set('place', state.place);
  if (state.city) next.searchParams.set('city', state.city);
  if (state.camera) {
    next.searchParams.set('lng', state.camera.lng.toFixed(5));
    next.searchParams.set('lat', state.camera.lat.toFixed(5));
    next.searchParams.set('z', state.camera.zoom.toFixed(3));
  }
  if (state.back) next.searchParams.set('back', state.back);
  if (state.point) next.searchParams.set('at', state.point.map(v=>v.toFixed(5)).join(','));
  return next;
}

export function startAsiaComparison(url: URL, state: AsiaState, field: AsiaField): AsiaState {
  const from = writeAsiaAtlasState(url, { ...state, back: null });
  const approved = new URLSearchParams();
  for (const key of ownedKeys) if (key !== 'back' && from.searchParams.has(key)) approved.set(key, from.searchParams.get(key)!);
  approved.set('field', state.field);
  const {topic, detail, ...base} = state;
  return { ...base, field, back: approved.toString() };
}

export function restoreAsiaComparison(url: URL, state: AsiaState, context: AsiaStateContext): AsiaState {
  if (!state.back) return state;
  const previous = new URL(url); previous.search = state.back;
  return { ...readAsiaAtlasState(previous, context), back: null };
}

export function mercatorPoint(lng: number, lat: number): [number, number] {
  const limit = Math.max(-85.05112878, Math.min(85.05112878, lat));
  return [6378137 * lng * Math.PI / 180, 6378137 * Math.log(Math.tan(Math.PI / 4 + limit * Math.PI / 360))];
}

export function gridCellAt(grid: { width: number; height: number; bounds3857: number[]; values: number[] }, lng: number, lat: number): number | null {
  const [x, y] = mercatorPoint(lng, lat), [west, south, east, north] = grid.bounds3857;
  if (x < west || x >= east || y <= south || y > north) return null;
  const col = Math.floor((x - west) / (east - west) * grid.width);
  const row = Math.floor((north - y) / (north - south) * grid.height);
  const value = grid.values[row * grid.width + col];
  return Number.isFinite(value) && value > 0 ? value : null;
}
