import climate from '../data/atlas/canada/climate.json';
export type CanadaCensusProductId = 'canola' | 'wheat' | 'beef' | 'pasture' | 'hay' | 'soybeans' | 'corn' | 'lentils' | 'potatoes' | 'dairy';
export type CanadaCensusBounds = [number, number, number, number];
export interface CanadaCensusMapState { selected: string | null; only: boolean; bounds: CanadaCensusBounds | null; }
export interface CanadaCensusComponent { id: string; variable: string; value: number | null; quality: string | null; }
export interface CanadaCensusCell { value: number | null; quality: string | null; status: 'published' | 'quality-f' | 'not-covered'; components: CanadaCensusComponent[]; }
export interface CanadaCensusRecord { uid: string; name: string; provinceCode: string; covered: boolean; cells: Record<CanadaCensusProductId, CanadaCensusCell>; }
export interface CanadaCensusProduct { id: CanadaCensusProductId; label: string; unit: string; unitLabel?: string; definition?: string; sourceTableId: string; sourceTableUrl?: string; notes?: string[] | string; }
export interface CanadaCensusGeometry { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][]; }
export interface CanadaCensusFeature { type: 'Feature'; id?: string | number; properties: Record<string, unknown>; geometry: CanadaCensusGeometry; }
export interface CanadaCensusCollection { type: 'FeatureCollection'; features: CanadaCensusFeature[]; }

export const canadaCensusSize = { width: 900, height: 580 };
export const canadaCensusNationalBounds: [[number, number], [number, number]] = [[-143, 40], [-50, 84]];
const radians = Math.PI / 180, west = -143 * radians;
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85.051, Math.min(85.051, latitude)) * radians / 2));
const north = mercatorY(84), spanX = 93 * radians, spanY = north - mercatorY(40);
const scale = Math.min(900 / spanX, 580 / spanY), offsetX = (900 - spanX * scale) / 2, offsetY = (580 - spanY * scale) / 2;
export const projectCanadaCensus = ([longitude, latitude]: readonly number[]): [number, number] => [offsetX + (longitude * radians - west) * scale, offsetY + (north - mercatorY(latitude)) * scale];
export const unprojectCanadaCensus = ([x, y]: readonly number[]): [number, number] => [(west + (x - offsetX) / scale) / radians, (2 * Math.atan(Math.exp(north - (y - offsetY) / scale)) - Math.PI / 2) / radians];
export const canadaCensusRings = (geometry: CanadaCensusGeometry): number[][][] => geometry.type === 'Polygon' ? geometry.coordinates as number[][][] : (geometry.coordinates as number[][][][]).flat();
export function canadaCensusPath(geometry: CanadaCensusGeometry) {
  return canadaCensusRings(geometry).map(ring => ring.map((coordinate, index) => { const [x, y] = projectCanadaCensus(coordinate); return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`; }).join('') + 'Z').join('');
}
export function canadaCensusFeatureBounds(geometry: CanadaCensusGeometry): CanadaCensusBounds {
  const result: CanadaCensusBounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of canadaCensusRings(geometry)) for (const [longitude, latitude] of ring) { result[0] = Math.min(result[0], longitude); result[1] = Math.min(result[1], latitude); result[2] = Math.max(result[2], longitude); result[3] = Math.max(result[3], latitude); }
  return result;
}
export const canadaCensusColors = ['#fffdf1', '#e4e7b6', '#bbce96', '#88b57c', '#548d68', '#28634f'];
export const canadaCensusBreaks = (product: CanadaCensusProductId) => product === 'beef' ? [100, 500, 1000, 5000] : product === 'hay' ? [1000, 5000, 10000, 50000] : [1000, 5000, 25000, 100000];
export function canadaCensusColor(cell: CanadaCensusCell, product: CanadaCensusProductId): string {
  if (cell.status === 'not-covered') return '#d7dcdb';
  if (cell.value === null) return '#e7e0d3';
  if (cell.value === 0) return canadaCensusColors[0];
  const index = canadaCensusBreaks(product).findIndex(limit => cell.value! <= limit);
  return canadaCensusColors[index === -1 ? 5 : index + 1];
}
export function canadaCensusLegend(product: CanadaCensusProductId, unit: string) {
  const breaks = canadaCensusBreaks(product), format = (value: number) => value.toLocaleString('ja-JP');
  return [
    { color: canadaCensusColors[0], label: `0 ${unit}` },
    ...breaks.map((limit, index) => ({ color: canadaCensusColors[index + 1], label: `${index === 0 ? '0超' : format(breaks[index - 1]) + '超'}–${format(limit)} ${unit}` })),
    { color: canadaCensusColors[5], label: `${format(breaks.at(-1)!)} ${unit}超` },
  ];
}
export function canadaCensusValueText(cell: CanadaCensusCell, unit: string) {
  if (cell.status === 'not-covered') return '対象外・未収録（ゼロではありません）';
  if (cell.value === null) return '非公表（品質 F）';
  const caution = cell.quality === 'E' || cell.components.some(component => component.quality === 'E');
  const grade = cell.quality ? `／品質 ${cell.quality}` : `／成分の品質 ${cell.components.map(component => component.quality ?? '未収録').join('・')}`;
  return `${cell.value.toLocaleString('ja-JP')} ${unit}${grade}${caution ? '（注意して利用）' : ''}`;
}
export const canadaCensusProvinceNames: Record<string, string> = { '10': 'ニューファンドランド・ラブラドール', '11': 'プリンスエドワード島', '12': 'ノバスコシア', '13': 'ニューブランズウィック', '24': 'ケベック', '35': 'オンタリオ', '46': 'マニトバ', '47': 'サスカチュワン', '48': 'アルバータ', '59': 'ブリティッシュコロンビア', '60': 'ユーコン', '61': 'ノースウエスト準州', '62': 'ヌナブト' };

export function canadaCensusContains(geometry: CanadaCensusGeometry, point: number[]) {
  const inside = (ring: number[][]) => { let hit = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [x, y] = ring[i], [px, py] = ring[j]; if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) hit = !hit; } return hit; };
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
  return polygons.some(polygon => inside(polygon[0]) && polygon.slice(1).every(hole => !inside(hole)));
}
/** Province name placement is checked against its official CCS geometries, never a farm locator. */
export function canadaCensusGeographicLabels(collection: CanadaCensusCollection) {
  const preferred: Record<string, number[]> = { '10': [-57.5, 49.4], '11': [-63.3, 46.3], '12': [-62.6, 45.3], '13': [-66.7, 46.3], '24': [-72, 51], '35': [-84, 49], '46': [-98.5, 54], '47': [-105.5, 54], '48': [-114.4, 55], '59': [-124, 55], '60': [-135, 65], '61': [-120, 66], '62': [-97, 70] };
  return Object.entries(canadaCensusProvinceNames).flatMap(([id, name]) => {
    const features = collection.features.filter(feature => String(feature.properties.PRUID) === id);
    if (!features.length) return [];
    let labelAnchor = preferred[id];
    if (!features.some(feature => canadaCensusContains(feature.geometry, labelAnchor))) {
      let anchor: number[] | undefined;
      const ranked = features.map(feature => ({ feature, bounds: canadaCensusFeatureBounds(feature.geometry) })).sort((a, b) => (b.bounds[2] - b.bounds[0]) * (b.bounds[3] - b.bounds[1]) - (a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1]));
      for (const { feature, bounds } of ranked) {
        for (const y of [.5, .4, .6, .3, .7, .2, .8]) for (const x of [.5, .4, .6, .3, .7, .2, .8]) { const point = [bounds[0] + (bounds[2] - bounds[0]) * x, bounds[1] + (bounds[3] - bounds[1]) * y]; if (!anchor && canadaCensusContains(feature.geometry, point)) anchor = point; }
        if (anchor) break;
      }
      if (!anchor) return [];
      labelAnchor = anchor;
    }
    return [{ id, name, labelAnchor }];
  });
}

export function readCanadaCensusMapState(url: URL, ids: string[]): CanadaCensusMapState {
  const id = url.searchParams.get('ccs'), selected = id && ids.includes(id) ? id : null;
  const parts = (url.searchParams.get('ccsBounds') ?? '').split(',');
  const values = parts.map(Number);
  const valid = parts.length === 4 && parts.every(part => part.trim() !== '') && values.every(Number.isFinite) && values[0] >= -180 && values[2] <= 180 && values[1] >= -85.051 && values[3] <= 85.051 && values[0] < values[2] && values[1] < values[3];
  return { selected, only: !!selected && url.searchParams.get('ccsOnly') === '1', bounds: valid ? values as CanadaCensusBounds : null };
}
export function writeCanadaCensusMapState(url: URL, state: CanadaCensusMapState) {
  const result = new URL(url); for (const key of ['ccs', 'ccsOnly', 'ccsBounds']) result.searchParams.delete(key);
  if (state.selected) result.searchParams.set('ccs', state.selected);
  if (state.selected && state.only) result.searchParams.set('ccsOnly', '1');
  if (state.bounds) result.searchParams.set('ccsBounds', state.bounds.join(','));
  return result;
}

export function joinCanadaCensusGeometry(collection: CanadaCensusCollection, records: Record<string, CanadaCensusRecord>, product: CanadaCensusProductId): CanadaCensusCollection {
  const seen = new Set<string>();
  const features = collection.features.map(feature => {
    const id = String(feature.properties.DGUID ?? ''), record = records[id];
    if (!record || seen.has(id)) throw new Error('Canada census DGUID join is incomplete or duplicated');
    seen.add(id);
    const cell = record.cells[product];
    return { ...feature, id, properties: { ...feature.properties, id, color: canadaCensusColor(cell, product), status: cell.status, name: record.name } };
  });
  if (seen.size !== Object.keys(records).length) throw new Error('Canada census records and boundaries do not match');
  return { ...collection, features };
}

export interface CanadaCensusObservation { name: string; coordinates: readonly number[]; station?: string; }
/** Observation annotations are limited to the five source-backed climate stations. */
export function resolveCanadaCensusObservation(input?: CanadaCensusObservation | null): CanadaCensusObservation | null {
  if (!input || !Array.isArray(input.coordinates) || input.coordinates.length !== 2) return null;
  const station = climate.stations.find(station => station.name === input.name && station.coordinates.every((coordinate, index) => coordinate === input.coordinates[index]));
  return station ? { name: station.name, station: station.station, coordinates: [...station.coordinates] } : null;
}

/** Compact selected quantity; derived indicators have no invented aggregate grade. */
export function canadaCensusShortValueText(cell: CanadaCensusCell, unit: string): string {
  if (cell.status === 'not-covered') return '対象外・未収録（ゼロではありません）';
  if (cell.value === null) return '非公表（品質 F）';
  return cell.value.toLocaleString('ja-JP') + ' ' + unit + (cell.quality ? '（品質 ' + cell.quality + (cell.quality === 'E' ? '・注意して利用' : '') + '）' : '');
}
