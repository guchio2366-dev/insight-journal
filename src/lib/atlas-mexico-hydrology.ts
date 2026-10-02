export const mexicoHydrologyLayers = ['rivers', 'groundwater', 'precipitation', 'basins', 'contours'] as const;
export type MexicoHydrologyLayer = typeof mexicoHydrologyLayers[number];
export type MexicoWaterBase = 'plain' | 'climate' | 'relief';
export interface MexicoWaterSelection {base: MexicoWaterBase; feature: string}
export interface MexicoWaterGeometry {type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString'; coordinates: any}
export interface MexicoWaterFeature {type: 'Feature'; id?: string | number; geometry: MexicoWaterGeometry; properties: Record<string, any>}
export interface MexicoWaterCollection {type: 'FeatureCollection'; features: MexicoWaterFeature[]}
export interface MexicoWaterKey {id?: string | number; label: string; color: string; fullLabel?: string; symbol?: string; min?: number; max?: number}
export interface MexicoWaterLayer {
  file: string; title?: string; publisher?: string; url?: string; license?: string; credit?: string;
  edition?: string | number; observedPeriod?: string; unit?: string; meaning?: string; limitations?: string;
  source?: {publisher?: string; url?: string; license?: string; credit?: string};
  legend?: MexicoWaterKey[]; intervalM?: number; displayIntervalM?: number; crs?: string;
  [key: string]: any;
}
export interface MexicoWaterManifest {layers: Partial<Record<MexicoHydrologyLayer, MexicoWaterLayer>>; crs?: string; [key: string]: any}
export function readMexicoWaterSelection(url: URL): MexicoWaterSelection {
  const base = url.searchParams.get('waterBase');
  const feature = url.searchParams.get('waterFeature') ?? '';
  return {base: base === 'climate' || base === 'relief' ? base : 'plain', feature: /^(rivers|groundwater|precipitation|basins|contours):[^\x00-\x1f]{1,160}$/.test(feature) ? feature : ''};
}
export function writeMexicoWaterSelection(url: URL, selection: MexicoWaterSelection): URL {
  const next = new URL(url);
  if (selection.base === 'plain') next.searchParams.delete('waterBase'); else next.searchParams.set('waterBase', selection.base);
  if (readMexicoWaterSelection(new URL(`https://example.invalid/?waterFeature=${encodeURIComponent(selection.feature)}`)).feature) next.searchParams.set('waterFeature', selection.feature);
  else next.searchParams.delete('waterFeature');
  return next;
}
export function mexicoWaterFeatureId(feature: MexicoWaterFeature): string {
  const id = feature.properties.id ?? feature.id;
  if (id === null || id === undefined || String(id).length === 0 || /[\x00-\x1f]/.test(String(id))) throw new Error('原資料の安定した地物IDがありません');
  return String(id);
}
export function mexicoWaterFeatureName(feature: MexicoWaterFeature): string {
  return String(feature.properties.nameJa ?? feature.properties.name ?? feature.properties.sourceName ?? mexicoWaterFeatureId(feature));
}
export function validateMexicoWaterCollection(value: unknown, layer: MexicoHydrologyLayer): MexicoWaterCollection {
  const collection = value as MexicoWaterCollection;
  if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features) || !collection.features.length) throw new Error('地物資料が空か、GeoJSONではありません');
  const ids = new Set<string>();
  const coordinates = (value: any): void => {
    if (!Array.isArray(value) || value.length < 1) throw new Error('座標がありません');
    if (typeof value[0] === 'number') {if (value.length < 2 || !Number.isFinite(value[0]) || !Number.isFinite(value[1]) || Math.abs(value[0]) > 180 || Math.abs(value[1]) > 90) throw new Error('経緯度の座標ではありません');}
    else value.forEach(coordinates);
  };
  for (const feature of collection.features) {
    if (feature.type !== 'Feature' || !feature.properties || !['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'].includes(feature.geometry?.type)) throw new Error('対応する線・面の地物ではありません');
    const id = mexicoWaterFeatureId(feature); if (ids.has(id)) throw new Error('原資料の地物IDが重複しています'); ids.add(id);
    coordinates(feature.geometry.coordinates);
    if (layer === 'contours' && !Number.isFinite(feature.properties.elevationM)) throw new Error('等高線の標高mがありません');
  }
  return collection;
}
export function mexicoWaterLayersForCategory(category: string): MexicoHydrologyLayer[] {
  return category === 'rivers-groundwater' ? ['groundwater', 'rivers'] : category === 'precipitation' ? ['precipitation'] : category === 'basins' ? ['basins', 'rivers'] : category === 'elevation' ? ['contours'] : [];
}
export function mexicoWaterFeatureFill(feature: MexicoWaterFeature, layer: MexicoHydrologyLayer, metadata: MexicoWaterLayer): string {
  if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') return 'none';
  if (layer === 'basins') return '#d6e5df';
  const key = String(feature.properties.band ?? feature.properties.classId ?? feature.properties.category ?? '');
  const entry = metadata.legend?.find(item => String(item.id) === key);
  const color = entry?.color ?? feature.properties.color;
  return typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#d9ddd9';
}
export function mexicoWaterFeatureStroke(feature: MexicoWaterFeature, layer: MexicoHydrologyLayer, metadata: MexicoWaterLayer): string {
  if (layer === 'basins') return metadata.legend?.[0]?.color ?? '#0e7490';
  const id = String(feature.properties.classId ?? feature.properties.band ?? feature.properties.category ?? '');
  const color = metadata.legend?.find(key => String(key.id) === id)?.color ?? feature.properties.color;
  if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) return color;
  return layer === 'contours' ? '#a28b6f' : layer === 'rivers' || layer === 'precipitation' ? '#397f9a' : '#758e90';
}
export function mexicoWaterUnit(metadata: MexicoWaterLayer): string {
  return metadata.unit === 'mm/year' ? 'mm/年' : metadata.unit === 'domestic basin division' ? '国内流域区分' : metadata.unit === 'm' && metadata.verticalDatum ? 'm（EGM2008）' : /Strahler/i.test(metadata.unit ?? '') ? '小流域内Strahler次数' : metadata.unit ?? '';
}
export function mexicoWaterSourceText(metadata: MexicoWaterLayer): string {
  const publisher = metadata.publisher ?? metadata.source?.publisher ?? '原資料';
  return [publisher, metadata.edition ? `${metadata.edition}刊行版` : '', metadata.observedPeriod ? `対象期間 ${metadata.observedPeriod}` : metadata.id === 'precipitation' || metadata.unit === 'mm/year' ? '観測期間との対応未確認' : '統一観測期間未記載', mexicoWaterUnit(metadata)].filter(Boolean).join(' · ');
}
export interface MexicoWaterLabel {id: string; value: number; point: number[]; x: number; y: number; text: string; box: number[]}
// Label anchors are retained source vertices. Estimated text boxes are in map coordinates.
export function mexicoWaterLineLabels(features: MexicoWaterFeature[], values: number[], project: (p: number[]) => number[], frame: number[], fontSize: number, unit: string, forbidden: number[][] = []): MexicoWaterLabel[] {
  const labels: MexicoWaterLabel[] = [];
  for (const value of values) {
    const candidates = features.filter(feature => (feature.properties.elevationM ?? feature.properties.value) === value).flatMap(feature => {
      const parts = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.type === 'MultiLineString' ? feature.geometry.coordinates : [];
      return parts.map((points: number[][]) => ({feature, points}));
    }).sort((a,b) => b.points.length - a.points.length);
    const text = `${value.toLocaleString('ja-JP')}${unit}`, width = (text.length * .65 + 1) * fontSize, height = 1.45 * fontSize;
    let found = false;
    for (const candidate of candidates) {
      for (const fraction of [.5, .3, .7, .1, .9]) {
        const point = candidate.points[Math.floor((candidate.points.length - 1) * fraction)], [x,y] = project(point), box = [x-width/2,y-height/2,width,height];
        if (box[0] < frame[0]+3 || box[1] < frame[1]+3 || box[0]+width > frame[0]+frame[2]-3 || box[1]+height > frame[1]+frame[3]-3) continue;
        if (forbidden.some(other => box[0] < other[0]+other[2]+fontSize && box[0]+width+fontSize > other[0] && box[1] < other[1]+other[3]+fontSize && box[1]+height+fontSize > other[1])) continue;
        if (labels.some(label => box[0] < label.box[0]+label.box[2]+fontSize && box[0]+width+fontSize > label.box[0] && box[1] < label.box[1]+label.box[3]+fontSize && box[1]+height+fontSize > label.box[1])) continue;
        labels.push({id: mexicoWaterFeatureId(candidate.feature), value, point, x, y, text, box}); found = true; break;
      }
      if (found) break;
    }
  }
  return labels;
}
export function mexicoContourGroups(features: MexicoWaterFeature[]): Map<number, MexicoWaterFeature[]> {
  const groups = new Map<number, MexicoWaterFeature[]>();
  for (const feature of features) {const level = feature.properties.elevationM; if (!Number.isFinite(level)) throw new Error('等高線の標高mがありません'); if (!groups.has(level)) groups.set(level, []); groups.get(level)!.push(feature);}
  return groups;
}
// Distances are in display coordinates and are used only for hit testing, never as geographic measurements.
export function closestMexicoContour(features: MexicoWaterFeature[], point: readonly number[], project: (p: number[]) => number[]): MexicoWaterFeature {
  let closest = features[0], minimum = Infinity;
  for (const feature of features) {
    const lines = feature.geometry.type === 'LineString' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const coordinates of lines) for (let i = 1; i < coordinates.length; i++) {
      const a = project(coordinates[i - 1]), b = project(coordinates[i]), dx = b[0] - a[0], dy = b[1] - a[1];
      const denominator = dx * dx + dy * dy, t = denominator ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / denominator)) : 0;
      const distance = (point[0] - a[0] - t * dx) ** 2 + (point[1] - a[1] - t * dy) ** 2;
      if (distance < minimum) {minimum = distance; closest = feature;}
    }
  }
  return closest;
}
