export const canadaWaterTopics = ['surface', 'precipitation', 'drainage', 'groundwater', 'aquifers'] as const;
export type WaterTopic = typeof canadaWaterTopics[number];
export type WaterDatasetTopic = Exclude<WaterTopic, 'surface'>;
export type CanadaWaterFrame = [number, number, number, number];
export interface CanadaWaterState { topic: WaterTopic; area: string | null; only: boolean; frame: CanadaWaterFrame | null; }
export interface CanadaWaterGroup { id: string; name: string; color: string; description?: string; }
export interface CanadaWaterArea { id: string; name: string; group?: string; description?: string; }
export interface CanadaWaterSource { title: string; url: string; publisher?: string; year?: string | number; licence?: string; licenceUrl?: string; attribution?: string; note?: string; }
export interface CanadaWaterDataset {
 title: string; groups: CanadaWaterGroup[]; legendGroups?: CanadaWaterGroup[]; areas?: CanadaWaterArea[]; groupProperty?: string;
 geometryUrl?: string; imageUrl?: string; images?: {id: string; url: string}[]; classImages?: {group: string; url: string}[];
 scope: string; reading: string; method?: string; note?: string; excludedFillNotice?: string; invalidGeometryCount?: number; sources: CanadaWaterSource[]; defaultFrame?: CanadaWaterFrame;
}
export interface CanadaWaterConfig {
 id?: string; datasets?: Record<WaterDatasetTopic, CanadaWaterDataset>; layers?: Record<WaterDatasetTopic, CanadaWaterDataset>;
 projection?: {width: number; height: number; bounds: number[]};
}
export type CanadaWaterIds = Partial<Record<WaterTopic, readonly (string | {id: string})[]>>;
export const canadaWaterSize = { width: 900, height: 580 };
// Keep the source coordinate frame stable for raster registration and old links.
// Default camera prioritizes inhabited southern Canada; the northern edge is Alaska's latitude.
export const canadaWaterFullFrame: CanadaWaterFrame = [0, 180.444444, 900, 399.555556];
/** Longitude/latitude locator, deliberately shared with the parent water map. It is not an area projection. */
export function projectCanadaWater([longitude, latitude]: readonly number[]): [number, number] {
 return [(longitude + 145) / 95 * 900, (85 - latitude) / 45 * 580];
}
export function validCanadaWaterFrame(value: unknown): value is CanadaWaterFrame {
 return Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) && value[0] >= 0 && value[1] >= 0 && value[2] >= 2 && value[3] >= 2 && value[0] + value[2] <= 900.001 && value[1] + value[3] <= 580.001;
}
export function readCanadaWaterState(url: URL, ids: CanadaWaterIds = {}): CanadaWaterState {
 const rawTopic = url.searchParams.get('waterTopic') ?? 'surface';
 const topic: WaterTopic = canadaWaterTopics.includes(rawTopic as WaterTopic) ? rawTopic as WaterTopic : 'surface';
 const rawArea = url.searchParams.get('waterArea');
 const area = rawArea && (ids[topic] ?? []).some(item => (typeof item === 'string' ? item : item.id) === rawArea) ? rawArea : null;
 const rawFrame = (url.searchParams.get('waterFrame') ?? '').split(',');
 const parsedFrame = rawFrame.map(Number);
 const frame = rawFrame.every(part => part.trim() !== '') && validCanadaWaterFrame(parsedFrame) ? parsedFrame : null;
 return {topic, area, only: !!area && url.searchParams.get('waterOnly') === '1', frame};
}
/** This codec owns four keys; comparison returns, the surface-water state and the fragment survive unchanged. */
export function writeCanadaWaterState(url: URL, state: CanadaWaterState): URL {
 const next = new URL(url);
 for (const key of ['waterTopic', 'waterArea', 'waterOnly', 'waterFrame']) next.searchParams.delete(key);
 if (state.topic !== 'surface') next.searchParams.set('waterTopic', state.topic);
 if (state.topic !== 'surface' && state.area) next.searchParams.set('waterArea', state.area);
 if (state.topic !== 'surface' && state.area && state.only) next.searchParams.set('waterOnly', '1');
 if (state.topic !== 'surface' && validCanadaWaterFrame(state.frame)) next.searchParams.set('waterFrame', state.frame.map(value => Math.round(value * 1000) / 1000).join(','));
 return next;
}
export function canadaWaterDatasets(config: CanadaWaterConfig): Record<WaterDatasetTopic, CanadaWaterDataset> {
 const datasets = config.datasets ?? config.layers;
 if (!datasets) throw new Error('Canada water datasets are missing.');
 return datasets;
}
export function canadaWaterIds(config: CanadaWaterConfig): CanadaWaterIds {
 return Object.fromEntries(Object.entries(canadaWaterDatasets(config)).map(([topic, dataset]) => [topic, [...dataset.groups, ...(dataset.areas ?? [])].map(item => item.id)]));
}
export interface CanadaWaterGeometry { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][]; }
export interface CanadaWaterFeature { type: 'Feature'; id?: string | number; properties: Record<string, unknown>; geometry: CanadaWaterGeometry; }
export interface CanadaWaterCollection { type: 'FeatureCollection'; features: CanadaWaterFeature[]; }
export function canadaWaterRings(geometry: CanadaWaterGeometry): number[][][] {
 return geometry.type === 'MultiPolygon' ? (geometry.coordinates as number[][][][]).flat() : geometry.coordinates as number[][][];
}
export function canadaWaterPath(geometry: CanadaWaterGeometry): string {
 return canadaWaterRings(geometry).map(ring => ring.map((point, index) => {const [x,y] = projectCanadaWater(point); return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;}).join('') + 'Z').join('');
}
export function canadaWaterFit(features: readonly CanadaWaterFeature[]): CanadaWaterFrame | null {
 let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
 for (const feature of features) for (const ring of canadaWaterRings(feature.geometry)) for (const coordinate of ring) {
  const [x,y] = projectCanadaWater(coordinate); left = Math.min(left,x); top = Math.min(top,y); right = Math.max(right,x); bottom = Math.max(bottom,y);
 }
 if (!Number.isFinite(left)) return null;
 // Preserve the map's viewport aspect ratio rather than stretching a small aquifer.
 const centerX = (left+right)/2, centerY = (top+bottom)/2;
 let width = Math.max(3, (right-left)*1.18), height = Math.max(3, (bottom-top)*1.18);
 width = Math.max(width,height*900/580); height = width*580/900;
 const scale = Math.min(1,900/width,580/height); width *= scale; height *= scale;
 return [Math.max(0,Math.min(900-width,centerX-width/2)),Math.max(0,Math.min(580-height,centerY-height/2)),width,height];
}
export function validateCanadaWaterCollection(input: unknown, dataset: CanadaWaterDataset): CanadaWaterCollection {
 const collection = input as CanadaWaterCollection;
 if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features) || !collection.features.length) throw new Error('Map geometry is empty.');
 const groups = new Set(dataset.groups.map(group => group.id));
 for (const feature of collection.features) {
  if (!feature?.properties || !['Polygon','MultiPolygon'].includes(feature.geometry?.type)) throw new Error('Map geometry is not polygon data.');
  if (!groups.has(String(feature.properties[dataset.groupProperty ?? 'group']))) throw new Error('Map classification is unknown.');
  for (const ring of canadaWaterRings(feature.geometry)) {
   if (!Array.isArray(ring) || ring.length < 4) throw new Error('Map ring is invalid.');
   for (const point of ring) if (!Array.isArray(point) || point.length < 2 || !point.slice(0,2).every(Number.isFinite) || point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90) throw new Error('Map coordinates are not geographic.');
  }
 }
 return collection;
}
