import { europeRings, type Geometry } from './atlas-europe-geometry.ts';
import { europeLayers } from '../data/atlas/europe/layers.ts';

export const frame = { width: 1200, height: 1001, west: -25, east: 65, south: 32, north: 73 };
const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
export function project([lon, lat]: number[]): [number, number] {
  return [(lon + 25) / 90 * frame.width, (mercator(73) - mercator(lat)) / (mercator(73) - mercator(32)) * frame.height];
}
export function unproject([x, y]: number[]): [number, number] {
  const latitude = 2 * Math.atan(Math.exp(mercator(73) - y / frame.height * (mercator(73) - mercator(32)))) - Math.PI / 2;
  return [x / frame.width * 90 - 25, latitude * 180 / Math.PI];
}
export function viewPath(geometry: Geometry): string {
  return europeRings(geometry).map(ring => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(v => v.toFixed(2)).join(',')}`).join('') + 'Z').join('');
}
export function visibleBounds(geometries: Geometry[]): [[number, number], [number, number]] {
  const points = geometries.flatMap(g => europeRings(g).flat());
  if (!points.length) return [[-25, 32], [65, 73]];
  return [[Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1]))], [Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))]];
}
export type EuropeState = { region: string; place: string; city: string; compare: string[]; render: string; layer: string; returnLayer: string; feature?: string };
export function readEuropeState(search: string, countries: { code: string; region: string }[], cityIds: string[], initialLayer = 'climate'): EuropeState {
  const p = new URLSearchParams(search);
  const place = countries.find(c => c.code === p.get('place'));
  const region = place?.region ?? (['north', 'west', 'south', 'east'].includes(p.get('region') ?? '') ? p.get('region')! : 'all');
  const city = cityIds.includes(p.get('city') ?? '') ? p.get('city')! : cityIds[0];
  const compare = [...new Set((p.get('compare') ?? '').split(','))].filter(id => cityIds.includes(id) && id !== city).slice(0, 2);
  const allowed = europeLayers.map(l => l.id);
  const layer = [...allowed, 'overlay'].includes(p.get('layer') ?? '') ? p.get('layer')! : initialLayer;
  const returnLayer = allowed.includes(p.get('returnLayer') ?? '') ? p.get('returnLayer')! : initialLayer;
  const state: EuropeState = { region, place: place?.code ?? '', city, compare, render: p.get('render') === 'static' ? 'static' : 'auto', layer, returnLayer };
  if (/^[a-z0-9-]{1,60}$/.test(p.get('feature') ?? '')) state.feature = p.get('feature')!;
  return state;
}
export function writeEuropeState(url: URL, state: EuropeState): URL {
  const next = new URL(url);
  for (const key of ['region', 'place', 'city', 'compare', 'render', 'layer', 'returnLayer', 'feature']) next.searchParams.delete(key);
  if (state.region !== 'all') next.searchParams.set('region', state.region);
  if (state.place) next.searchParams.set('place', state.place);
  if (state.city) next.searchParams.set('city', state.city);
  if (state.compare.length) next.searchParams.set('compare', state.compare.join(','));
  if (state.render === 'static') next.searchParams.set('render', 'static');
  if (state.layer) next.searchParams.set('layer', state.layer);
  if (state.layer === 'overlay') next.searchParams.set('returnLayer', state.returnLayer);
  if (state.feature) next.searchParams.set('feature', state.feature);
  return next;
}
export function displayCell(values: Float32Array, point: number[], nodata = -1) {
  const [lon, lat] = point;
  if (lon < -25 || lon >= 65 || lat <= 32 || lat > 73) return null;
  const [x,y]=project(point), width=1800, height=1502;
  const col=Math.min(width-1,Math.floor(x/frame.width*width)), row=Math.min(height-1,Math.floor(y/frame.height*height));
  const value=values[row*width+col];
  return {value:!Number.isFinite(value)||value===nodata?null:value,center:unproject([(col+.5)/width*frame.width,(row+.5)/height*frame.height])};
}
export function wheatCell(values: Float32Array, [lon, lat]: number[]): { value: number | null; center: number[] } | null {
  if (lon < -25 || lon >= 65 || lat <= 32 || lat > 73) return null;
  const col = Math.floor((lon + 25) * 12), row = Math.floor((73 - lat) * 12);
  const value = values[row * 1080 + col];
  return { value: !Number.isFinite(value) || value < 0 ? null : value, center: [-25 + (col + .5) / 12, 73 - (row + .5) / 12] };
}
export function climateSummary(months: { temperature: number | null; precipitation: number | null }[]) {
  const temperatures = months.map(m => m.temperature);
  const precipitation = months.map(m => m.precipitation);
  const completeTemperature = temperatures.length === 12 && temperatures.every(v => v !== null);
  const completePrecipitation = precipitation.length === 12 && precipitation.every(v => v !== null);
  return {
    range: completeTemperature ? Math.max(...temperatures as number[]) - Math.min(...temperatures as number[]) : null,
    coldest: completeTemperature ? Math.min(...temperatures as number[]) : null,
    warmest: completeTemperature ? Math.max(...temperatures as number[]) : null,
    annualRain: completePrecipitation ? (precipitation as number[]).reduce((a, b) => a + b, 0) : null,
  };
}
