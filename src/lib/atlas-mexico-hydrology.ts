export const mexicoHydrologyLayers = ['rivers', 'groundwater', 'precipitation', 'basins', 'contours'] as const;
export type MexicoHydrologyLayer = typeof mexicoHydrologyLayers[number];
export type MexicoWaterBase = 'plain' | 'climate' | 'relief';
export const mexicoGroundwaterClassIds = ['groundwater-1A','groundwater-2M','groundwater-3B','groundwater-4PM','groundwater-5PB','groundwater-6a','groundwater-7m','groundwater-8b','groundwater-9pm','groundwater-10pb'] as const;
export type MexicoGroundwaterClass = 'all' | typeof mexicoGroundwaterClassIds[number];
export interface MexicoWaterSelection {base: MexicoWaterBase; feature: string; groundwaterClass?: MexicoGroundwaterClass}
export interface MexicoWaterGeometry {type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString'; coordinates: any}
export interface MexicoWaterFeature {type: 'Feature'; id?: string | number; geometry: MexicoWaterGeometry; properties: Record<string, any>}
export interface MexicoWaterCollection {type: 'FeatureCollection'; features: MexicoWaterFeature[]}
export interface MexicoWaterKey {id?: string | number; label: string; color: string; fullLabel?: string; symbol?: string; min?: number; max?: number}
export interface MexicoGroundwaterFile {file: string; classId?: string; fullLabel?: string; sourceName?: string; color?: string; material?: string; measure?: string; sourceMemberCount?: number; [key: string]: any}
export interface MexicoWaterLayer {
  file: string | null; title?: string; publisher?: string; url?: string; license?: string; credit?: string;
  edition?: string | number; observedPeriod?: string; unit?: string; meaning?: string; limitations?: string;
  source?: {publisher?: string; url?: string; license?: string; credit?: string};
  legend?: MexicoWaterKey[]; intervalM?: number; displayIntervalM?: number; crs?: string;
  deliveryMode?: string; classFiles?: Record<string, MexicoGroundwaterFile>; overviewAsset?: {file: string; width: number; height: number; [key: string]: any};
  countryMaskAsset?: {file: string; width: number; height: number; viewBox: string; bytes: number; sha256: string; nationalBoundarySha256: string; projectionSourceSha256: string; geometryIndexSha256: string; [key: string]: any};
  [key: string]: any;
}
export interface MexicoWaterManifest {layers: Partial<Record<MexicoHydrologyLayer, MexicoWaterLayer>>; crs?: string; [key: string]: any}
// Match the US legend in water-resources.ts; these colors classify real line values,
// never areas between the Mexican source isohyets.
export const mexicoPrecipitationKeys: MexicoWaterKey[] = [
  {id:'lt250',label:'250mm未満',color:'#f2dfb3',min:0,max:250,symbol:'line'},
  {id:'250-500',label:'250〜500mm未満',color:'#e0e4be',min:250,max:500,symbol:'line'},
  {id:'500-750',label:'500〜750mm未満',color:'#b9d8b8',min:500,max:750,symbol:'line'},
  {id:'750-1000',label:'750〜1,000mm未満',color:'#8bc8bf',min:750,max:1000,symbol:'line'},
  {id:'1000-1500',label:'1,000〜1,500mm未満',color:'#60afb8',min:1000,max:1500,symbol:'line'},
  {id:'1500-2000',label:'1,500〜2,000mm未満',color:'#378eaa',min:1500,max:2000,symbol:'line'},
  {id:'gte2000',label:'2,000mm以上',color:'#216782',min:2000,symbol:'line'},
];
export const mexicoBasinKeys: MexicoWaterKey[] = [
  {id:'EXORREICA',label:'外流域（143区分）',color:'#d6e5df'},
  {id:'ENDORREICA',label:'閉鎖流域（15区分）',color:'#e3ce93'},
  {id:'basins',label:'国内流域界（158区分）',color:'#0e7490',symbol:'line'},
];
export function mexicoPrecipitationKey(value: number): MexicoWaterKey | undefined {
  return Number.isFinite(value) ? mexicoPrecipitationKeys.find(key => value >= key.min! && (key.max === undefined || value < key.max)) : undefined;
}
export function mexicoBasinTypeText(feature: MexicoWaterFeature): string {
  return feature.properties.basinType === 'ENDORREICA' ? '閉鎖流域（ENDORREICA）：水は海へ直接流出せず、内陸に集まる区分。' : feature.properties.basinType === 'EXORREICA' ? '外流域（EXORREICA）：海へ向かう水系の区分。' : '原資料の流出先分類は未確認。';
}
export function readMexicoWaterSelection(url: URL): MexicoWaterSelection {
  const base = url.searchParams.get('waterBase');
  let feature = url.searchParams.get('waterFeature') ?? '';
  const requestedClass = url.searchParams.get('waterClass') ?? (feature.startsWith('groundwater:') ? feature.slice('groundwater:'.length) : 'all');
  const selected = mexicoGroundwaterClassIds.includes(requestedClass as typeof mexicoGroundwaterClassIds[number]) ? requestedClass as MexicoGroundwaterClass : undefined;
  if (feature.startsWith('groundwater:') && (requestedClass === 'all' || (selected && feature !== `groundwater:${selected}`))) feature = '';
  return {base: base === 'climate' || base === 'relief' ? base : 'plain', feature: /^(rivers|groundwater|precipitation|basins|contours):[^\x00-\x1f]{1,160}$/.test(feature) ? feature : '', ...(selected ? {groundwaterClass: selected} : {})};
}
export function writeMexicoWaterSelection(url: URL, selection: MexicoWaterSelection): URL {
  const next = new URL(url);
  if (selection.base === 'plain') next.searchParams.delete('waterBase'); else next.searchParams.set('waterBase', selection.base);
  const feature = selection.feature.startsWith('groundwater:') && (selection.groundwaterClass === 'all' || (selection.groundwaterClass && selection.feature !== `groundwater:${selection.groundwaterClass}`)) ? '' : selection.feature;
  if (readMexicoWaterSelection(new URL(`https://example.invalid/?waterFeature=${encodeURIComponent(feature)}`)).feature) next.searchParams.set('waterFeature', feature);
  else next.searchParams.delete('waterFeature');
  if (selection.groundwaterClass && mexicoGroundwaterClassIds.includes(selection.groundwaterClass as typeof mexicoGroundwaterClassIds[number])) next.searchParams.set('waterClass', selection.groundwaterClass);
  else next.searchParams.delete('waterClass');
  return next;
}
export function mexicoGroundwaterDefinition(record?: MexicoGroundwaterFile): string {
  const material = record?.material === 'consolidated' ? '固結材料は、まとまりある連続した岩石です。' : record?.material === 'unconsolidated' ? '非固結材料は、ばらばらで未固結の材料です。' : '固結は連続した岩石、非固結はばらばらで未固結の材料です。';
  return `${material}${record?.measure === 'potential' ? '賦存可能性の中・低は、材料の透水性などから地下水を見いだす見込みを表す定性的な区分です。低は地下水がゼロという意味ではありません。' : record?.measure === 'yield' ? '収量は原典の井戸産出量の区分（L/s）です。この地点の井戸の実測値や現在の揚水量ではありません。' : '井戸産出量の3区分（L/s）と、地下水を見いだす賦存可能性の2区分は別の尺度です。'}現在の地下水量・貯水量や法定帯水層の境界ではありません。`;
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
    if (layer === 'precipitation' && (!['LineString','MultiLineString'].includes(feature.geometry.type) || !Number.isFinite(feature.properties.annualMm ?? feature.properties.value))) throw new Error('等雨量線の実線と年降水量mmがありません');
    if (layer === 'basins' && !['Polygon','MultiPolygon'].includes(feature.geometry.type)) throw new Error('原流域の面がありません');
  }
  return collection;
}
export function mexicoWaterLayersForCategory(category: string): MexicoHydrologyLayer[] {
  return category === 'rivers-groundwater' ? ['groundwater', 'rivers'] : category === 'precipitation' ? ['precipitation'] : category === 'basins' ? ['basins', 'rivers'] : category === 'elevation' ? ['contours'] : [];
}
export function mexicoWaterFeatureFill(feature: MexicoWaterFeature, layer: MexicoHydrologyLayer, metadata: MexicoWaterLayer): string {
  if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') return 'none';
  if (layer === 'basins') return mexicoBasinKeys.find(key => key.id === feature.properties.basinType)?.color ?? '#d6e5df';
  const key = String(feature.properties.band ?? feature.properties.classId ?? feature.properties.category ?? '');
  const entry = metadata.legend?.find(item => String(item.id) === key);
  const color = entry?.color ?? feature.properties.color;
  return typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#d9ddd9';
}
export function mexicoWaterFeatureStroke(feature: MexicoWaterFeature, layer: MexicoHydrologyLayer, metadata: MexicoWaterLayer): string {
  if (layer === 'basins') return metadata.legend?.find(key => key.id === 'basins' || key.symbol === 'line')?.color ?? metadata.legend?.[0]?.color ?? '#0e7490';
  if (layer === 'precipitation') return mexicoPrecipitationKey(feature.properties.annualMm ?? feature.properties.value)?.color ?? '#397f9a';
  const id = String(feature.properties.classId ?? feature.properties.band ?? feature.properties.category ?? '');
  const color = metadata.legend?.find(key => String(key.id) === id)?.color ?? feature.properties.color;
  if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) return color;
  return layer === 'contours' ? '#a28b6f' : layer === 'rivers' || layer === 'precipitation' ? '#397f9a' : '#758e90';
}
export function mexicoWaterUnit(metadata: MexicoWaterLayer): string {
  return metadata.id === 'groundwater' || /yield class|occurrence potential/i.test(metadata.unit ?? '') ? '井戸産出量（L/s）・賦存可能性（別尺度）' : metadata.unit === 'mm/year' ? 'mm/年' : metadata.unit === 'domestic basin division' ? '国内流域区分' : metadata.unit === 'm' && metadata.verticalDatum ? 'm（EGM2008）' : /Strahler/i.test(metadata.unit ?? '') ? '小流域内Strahler次数' : metadata.unit ?? '';
}
export function mexicoWaterSourceText(metadata: MexicoWaterLayer): string {
  const publisher = metadata.publisher ?? metadata.source?.publisher ?? '原資料';
  return [publisher, metadata.edition ? `${metadata.edition}刊行版` : '', metadata.observedPeriod ? `対象期間 ${metadata.observedPeriod}` : metadata.id === 'groundwater' ? '統一観測期未確認' : metadata.id === 'precipitation' || metadata.unit === 'mm/year' ? '観測期間との対応未確認' : '統一観測期間未記載', mexicoWaterUnit(metadata)].filter(Boolean).join(' · ');
}
export interface MexicoWaterLabel {id: string; value: number; point: number[]; x: number; y: number; text: string; box: number[]}
export interface MexicoBasinLabel {id: string; point: number[]; x: number; y: number; text: string; box: number[]}
function basinPolygons(feature: MexicoWaterFeature): number[][][][] {
  return feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [];
}
function ringContains(ring: number[][], point: readonly number[]): boolean {
  let inside = false;
  for (let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const a=ring[i],b=ring[j];
    if ((a[1]>point[1]) !== (b[1]>point[1]) && point[0] < (b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function mexicoBasinContains(feature: MexicoWaterFeature, point: readonly number[]): boolean {
  return basinPolygons(feature).some(polygon => ringContains(polygon[0],point) && !polygon.slice(1).some(hole=>ringContains(hole,point)));
}
// A label candidate is only a position for typography, never a hydrological measurement.
export function mexicoBasinLabelPoint(feature: MexicoWaterFeature): number[] | null {
  let best: number[] | null = null, distance = -1;
  for (const polygon of basinPolygons(feature)) {
    const outer=polygon[0];
    const bounds=outer.reduce((box,point)=>[Math.min(box[0],point[0]),Math.min(box[1],point[1]),Math.max(box[2],point[0]),Math.max(box[3],point[1])],[Infinity,Infinity,-Infinity,-Infinity]);
    for(let row=0;row<9;row++)for(let column=0;column<9;column++) {
      const point=[bounds[0]+(column+.5)*(bounds[2]-bounds[0])/9,bounds[1]+(row+.5)*(bounds[3]-bounds[1])/9];
      if(!ringContains(outer,point)||polygon.slice(1).some(hole=>ringContains(hole,point)))continue;
      let closest=Infinity;
      for(const ring of polygon)for(let i=1;i<ring.length;i++) {
        const a=ring[i-1],b=ring[i],dx=b[0]-a[0],dy=b[1]-a[1],denominator=dx*dx+dy*dy;
        const t=denominator?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dy)/denominator)):0;
        closest=Math.min(closest,(point[0]-a[0]-t*dx)**2+(point[1]-a[1]-t*dy)**2);
      }
      if(closest>distance){best=point;distance=closest;}
    }
  }
  return best;
}
export function mexicoBasinLabels(features: MexicoWaterFeature[], anchors: Map<string, number[] | null>, project: (p:number[])=>number[], frame:number[], fontSize:number, selectedId='', forbidden:number[][]=[]): MexicoBasinLabel[] {
  const labels: MexicoBasinLabel[]=[];
  const ranked=features.map(feature=>({feature,id:mexicoWaterFeatureId(feature)})).sort((a,b)=>Number(b.id===selectedId)-Number(a.id===selectedId) || Number(b.feature.properties.sourceArea ?? 0)-Number(a.feature.properties.sourceArea ?? 0));
  for(const {feature,id} of ranked) {
    if(!anchors.has(id))anchors.set(id,mexicoBasinLabelPoint(feature));
    const point=anchors.get(id);if(!point)continue;
    const [x,y]=project(point),text=String(feature.properties.sourceName ?? mexicoWaterFeatureName(feature));
    const width=(text.length*.58+1)*fontSize,height=1.45*fontSize,box=[x-width/2,y-height/2,width,height];
    if(box[0]<frame[0]+3||box[1]<frame[1]+3||box[0]+width>frame[0]+frame[2]-3||box[1]+height>frame[1]+frame[3]-3)continue;
    if([...forbidden,...labels.map(label=>label.box)].some(other=>box[0]<other[0]+other[2]+fontSize&&box[0]+width+fontSize>other[0]&&box[1]<other[1]+other[3]+fontSize&&box[1]+height+fontSize>other[1]))continue;
    labels.push({id,point,x,y,text,box});if(labels.length===12)break;
  }
  return labels;
}
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
