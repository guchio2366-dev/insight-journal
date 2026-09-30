import { getOverviewRegion, type OverviewRegionId } from './country-overview';
import { features as regionalFeatures } from './regional-atlas';
import europeGeography from './overview-europe-countries.json';
import africaGeography from './africa-geography.json';
import oceaniaGeography from './oceania-countries.json';
import westGeography from '../../../public/assets/atlas/west-asia-v1/geography.json';
import europeCities from './europe/population-cities.json';
import worldCities from './overview-cities.json';
import worldLakes from './overview-lakes.json';
import europeLakes from '../../../public/assets/atlas/europe/context-v1/lakes.json';
import caspian from './europe/climate-water.json';

export type OverviewMapPoint = [number, number];
export type OverviewMapBounds = [number, number, number, number];
type Geometry = { type: string; coordinates: number[][][] | number[][][][] };
type Feature = { properties: { code?: string }; geometry: Geometry };
type Polygon = OverviewMapPoint[][];
export interface OverviewMapCountry {
  code: string;
  name: string;
  path: string;
  label: OverviewMapPoint;
  /** Projected pixels: minimum x, minimum y, maximum x, maximum y. */
  bounds: OverviewMapBounds;
  /** Projected polygon area, used only to prioritize labels, never a national statistic. */
  area: number;
}
export interface OverviewMap {
  width: number;
  height: number;
  /** Geographic viewport: west, south, east, north; Pacific longitudes may exceed 180. */
  bounds: OverviewMapBounds;
  projection: string;
  countries: OverviewMapCountry[];
  context: string[];
  cities: { id: string; name: string; country: string; point: OverviewMapPoint; capital: boolean; rank: number }[];
  waters: { name: string; point: OverviewMapPoint }[];
  lakes: string[];
  sources: { label: string; url: string }[];
  notes: string[];
}

const viewports: Record<OverviewRegionId, { bounds: OverviewMapBounds; parallel: number }> = {
  'north-america': { bounds: [-170, 8, -50, 84], parallel: 45 },
  europe: { bounds: [-25, 32, 65, 73], parallel: 53 },
  'latin-america': { bounds: [-93, -57, -33, 28], parallel: -12 },
  'west-asia': { bounds: [23, 10, 64, 45], parallel: 28 },
  africa: { bounds: [-27, -36, 64, 39], parallel: 0 },
  oceania: { bounds: [110, -58, 250, 25], parallel: -20 },
  'east-asia': { bounds: [72, 17, 155, 56], parallel: 35 },
  'southeast-asia': { bounds: [91, -12, 143, 30], parallel: 10 },
  'south-central-asia': { bounds: [45, -2, 99, 57], parallel: 27 },
  'south-asia': { bounds: [60, -2, 99, 39], parallel: 21 },
  'central-asia': { bounds: [46.4, 29.2, 87.4, 55.5], parallel: 42 },
};
const neBase = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/';

function unwrapRing(ring: number[][], center: number): OverviewMapPoint[] {
  const output: OverviewMapPoint[] = [];
  for (const [longitude, latitude] of ring) {
    let lon = longitude;
    const previous = output.at(-1)?.[0];
    if (previous !== undefined) {
      while (lon - previous > 180) lon -= 360;
      while (lon - previous < -180) lon += 360;
    }
    output.push([lon, latitude]);
  }
  if (!output.length) return output;
  const mean = output.reduce((sum, point) => sum + point[0], 0) / output.length;
  const shift = Math.round((center - mean) / 360) * 360;
  return output.map(([x, y]) => [x + shift, y]);
}

function clipRing(ring: number[][], bounds: OverviewMapBounds): OverviewMapPoint[] {
  const [west, south, east, north] = bounds;
  let points = unwrapRing(ring, (west + east) / 2);
  if (points.length > 1 && points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1]) points.pop();
  for (const [axis, edge, minimum] of [[0, west, true], [0, east, false], [1, south, true], [1, north, false]] as [number, number, boolean][]) {
    const input = points;
    points = [];
    if (!input.length) break;
    const inside = (p: OverviewMapPoint) => minimum ? p[axis] >= edge : p[axis] <= edge;
    let previous = input.at(-1)!;
    for (const current of input) {
      if (inside(current) !== inside(previous)) {
        const t = (edge - previous[axis]) / (current[axis] - previous[axis]);
        points.push([previous[0] + t * (current[0] - previous[0]), previous[1] + t * (current[1] - previous[1])]);
      }
      if (inside(current)) points.push(current);
      previous = current;
    }
  }
  return points.length >= 3 ? [...points, points[0]] : [];
}

function ringArea(ring: OverviewMapPoint[]): number {
  return Math.abs(ring.reduce((sum, p, i) => {
    const q = ring[(i + 1) % ring.length];
    return sum + p[0] * q[1] - q[0] * p[1];
  }, 0)) / 2;
}
function pointInRing([x, y]: OverviewMapPoint, ring: OverviewMapPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
function pointInPolygon(point: OverviewMapPoint, polygon: Polygon): boolean {
  return pointInRing(point, polygon[0]) && !polygon.slice(1).some(ring => pointInRing(point, ring));
}
function extent(points: OverviewMapPoint[]): OverviewMapBounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  return [minX, minY, maxX, maxY];
}
function segmentDistanceSquared(p: OverviewMapPoint, a: OverviewMapPoint, b: OverviewMapPoint): number {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
}

/** A label point inside the largest visible land polygon, avoiding interior lakes. */
function interiorLabel(polygon: Polygon, waterPolygons: Polygon[] = []): OverviewMapPoint {
  const [left, top, right, bottom] = extent(polygon[0]);
  let best: OverviewMapPoint = polygon[0][0], clearance = -1;
  const consider = (point: OverviewMapPoint) => {
    if (!pointInPolygon(point, polygon) || waterPolygons.some(water => pointInPolygon(point, water))) return;
    let distance = Infinity;
    for (const ring of polygon) for (let i = 1; i < ring.length; i++) distance = Math.min(distance, segmentDistanceSquared(point, ring[i - 1], ring[i]));
    if (distance > clearance) { clearance = distance; best = point; }
  };
  // Scanline midpoints remain inside narrow islands and long countries, where a bbox center fails.
  for (let row = 0; row < 25; row++) {
    const y = top + (bottom - top) * (row + .5) / 25;
    const intersections: number[] = [];
    for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i];
      if ((a[1] > y) !== (b[1] > y)) intersections.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) consider([(intersections[i] + intersections[i + 1]) / 2, y]);
  }
  let step = Math.max(right - left, bottom - top) / 12;
  for (let pass = 0; pass < 7; pass++, step /= 2) {
    const [x, y] = best;
    for (const dx of [-step, 0, step]) for (const dy of [-step, 0, step]) consider([x + dx, y + dy]);
  }
  return best;
}

/** Subpixel display simplification; source geometry remains unchanged. */
function simplifyRing(points: OverviewMapPoint[], tolerance = .18): OverviewMapPoint[] {
  if (points.length < 7) return points;
  const keep = new Set([0, points.length - 1]);
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let farthest = -1, distance = tolerance * tolerance;
    for (let i = start + 1; i < end; i++) {
      const d = segmentDistanceSquared(points[i], points[start], points[end]);
      if (d > distance) { distance = d; farthest = i; }
    }
    if (farthest !== -1) { keep.add(farthest); stack.push([start, farthest], [farthest, end]); }
  }
  const result = [...keep].sort((a, b) => a - b).map(i => points[i]);
  return result.length >= 4 ? result : points;
}
const polygonArea = (polygon: Polygon) => Math.max(0, ringArea(polygon[0]) - polygon.slice(1).reduce((sum, ring) => sum + ringArea(ring), 0));
const toPath = (polygons: Polygon[]) => polygons.map(polygon => polygon.map(ring => ring.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z').join('')).join('');
const cache = new Map<OverviewRegionId, OverviewMap>();

export function getOverviewMap(id: OverviewRegionId): OverviewMap {
  const cached = cache.get(id);
  if (cached) return cached;
  const region = getOverviewRegion(id), viewport = viewports[id];
  const [west, south, east, north] = viewport.bounds;
  const width = 1200, height = Math.round(width * (north - south) / ((east - west) * Math.cos(viewport.parallel * Math.PI / 180)));
  const wrap = (lon: number) => lon + Math.round(((west + east) / 2 - lon) / 360) * 360;
  const project = ([longitude, latitude]: number[]): OverviewMapPoint => [(wrap(longitude) - west) / (east - west) * width, (north - latitude) / (north - south) * height];
  const projectUnwrapped = ([longitude, latitude]: number[]): OverviewMapPoint => [(longitude - west) / (east - west) * width, (north - latitude) / (north - south) * height];
  const projectGeometry = (geometry: Geometry): Polygon[] => {
    if (!['Polygon', 'MultiPolygon'].includes(geometry.type)) return [];
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates as number[][][]] : geometry.coordinates as number[][][][];
    return polygons.flatMap(polygon => {
      const outer = clipRing(polygon[0], viewport.bounds);
      if (!outer.length) return [];
      return [[outer, ...polygon.slice(1).map(ring => clipRing(ring, viewport.bounds)).filter(ring => ring.length)]
        .map(ring => simplifyRing(ring.map(projectUnwrapped)))];
    });
  };
  const targetCodes = new Set(region.countries.map(country => country.code));
  const lakeFeatures = [...(id === 'europe' ? europeLakes.features : worldLakes.features), ...caspian.features] as { geometry: Geometry }[];
  const lakePolygons = lakeFeatures.map(feature => projectGeometry(feature.geometry)).filter(polygons => polygons.length);
  const preferred = (id === 'europe' ? europeGeography.features : id === 'africa' ? africaGeography.features : id === 'oceania' ? oceaniaGeography.features : id === 'west-asia' ? westGeography.features : regionalFeatures) as Feature[];
  const byCode = new Map<string, Feature[]>();
  for (const feature of preferred) {
    const code = feature.properties.code;
    if (code && targetCodes.has(code)) byCode.set(code, [...(byCode.get(code) ?? []), feature]);
  }
  const countries: OverviewMapCountry[] = region.countries.flatMap(country => {
    const shapes = (byCode.get(country.code) ?? []).flatMap(feature => projectGeometry(feature.geometry));
    if (!shapes.length) return [];
    const largest = [...shapes].sort((a, b) => polygonArea(b) - polygonArea(a))[0];
    return [{ ...country, path: toPath(shapes), label: interiorLabel(largest, lakePolygons.flat()), bounds: extent(shapes.flat(2)), area: shapes.reduce((sum, polygon) => sum + polygonArea(polygon), 0) }];
  });
  const context = (regionalFeatures as Feature[]).filter(feature => !targetCodes.has(feature.properties.code ?? '')).flatMap(feature => {
    const shapes = projectGeometry(feature.geometry);
    return shapes.length ? [toPath(shapes)] : [];
  });
  const rawCities = id === 'europe' ? europeCities : worldCities.cities;
  const cities = rawCities.filter(city => targetCodes.has(city.country)).map(city => ({ id: city.id, name: city.name, country: city.country, point: project(city.coordinates), capital: city.capital, rank: city.rank }))
    .filter(city => city.point[0] >= 0 && city.point[0] <= width && city.point[1] >= 0 && city.point[1] <= height)
    .sort((a, b) => a.rank - b.rank || Number(b.capital) - Number(a.capital) || a.name.localeCompare(b.name, 'ja')).slice(0, id === 'europe' ? 132 : 36);
  const lakes = lakePolygons.map(toPath);
  const sources = [
    { label: id === 'europe' ? '国境・海岸線：Natural Earth Admin 0 Countries 1:50m v5.1.2（周辺陸地1:110m）' : '国境・海岸線：Natural Earth（既存地図の1:110m・1:50m、西アジア1:10m）', url: id === 'europe' ? europeGeography.source.url : 'https://www.naturalearthdata.com/downloads/' },
    { label: id === 'europe' ? '都市：Natural Earth Populated Places 1:10m v5.1.2' : '都市：Natural Earth Populated Places 1:110m v5.1.2', url: id === 'europe' ? `${neBase}ne_10m_populated_places.geojson` : worldCities.source.url },
    { label: id === 'europe' ? '湖：Natural Earth Lakes 1:50m v5.1.2' : '湖：Natural Earth Lakes 1:110m v5.1.2', url: id === 'europe' ? `${neBase}ne_50m_lakes.geojson` : worldLakes.source.url },
  ];
  if (['europe', 'west-asia', 'south-central-asia', 'central-asia'].includes(id)) sources.push({ label: 'カスピ海：Natural Earth Ocean 1:110m v5.1.2', url: caspian.source.url });
  const notes = [
    '国名は表示範囲内の陸地に配置しています。都市は既存資料から選んだ代表点で、点の大きさは人口を表しません。',
    '境界・名称は資料上の概略表現です。小島・小さな湖や一部の都市は省略されます。面積の比較には適しません。',
  ];
  if (id === 'europe') notes.push('ロシアは表示範囲内の西部を掲載しています。');
  if (id === 'north-america') notes.push('カナダ・米国・メキシコを表示します。米国のアリューシャン列島の一部は表示範囲外です。');
  if (id === 'oceania') notes.push('180度経線をまたぐ島々を一続きに表示しています。小島の位置は国名ラベルでも確認できます。');
  const missing = region.countries.filter(country => !countries.some(shape => shape.code === country.code));
  if (missing.length) notes.push(`地図輪郭の未収録：${missing.map(country => country.name).join('・')}。国の選択欄から概要を確認できます。`);
  const result: OverviewMap = { width, height, bounds: viewport.bounds, projection: `等距円筒図法（標準緯線${Math.abs(viewport.parallel)}度${viewport.parallel < 0 ? 'S' : 'N'}）`, countries, context, cities, waters: [], lakes, sources, notes };
  cache.set(id, result);
  return result;
}
