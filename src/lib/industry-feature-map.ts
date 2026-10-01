export type IndustryRegion = 'north-america' | 'europe' | 'asia';
export type IndustryPoint = [number, number];
export type IndustryBounds = [number, number, number, number];
export type IndustryGeometry = { type: string; coordinates: number[][][] | number[][][][] };

export const industryMapWidth = 1000;
export const industryMapHeight = 550;
export const industryMapBounds: Record<IndustryRegion, IndustryBounds> = {
  'north-america': [-135, 15, -50, 70],
  europe: [-16, 34, 36, 72],
  asia: [65, -8, 146, 57],
};

/** Neutral locator projection: equidistant cylindrical, true scale at the viewport's mid-latitude. */
export function projectIndustry([longitude, latitude]: readonly number[], region: IndustryRegion): IndustryPoint {
  const [west, south, east, north] = industryMapBounds[region];
  const longitudeScale = Math.cos((north + south) / 2 * Math.PI / 180);
  const horizontalSpan = (east - west) * longitudeScale;
  const verticalSpan = north - south;
  const scale = Math.min(industryMapWidth / horizontalSpan, industryMapHeight / verticalSpan);
  const left = (industryMapWidth - horizontalSpan * scale) / 2;
  const top = (industryMapHeight - verticalSpan * scale) / 2;
  return [left + (longitude - west) * longitudeScale * scale, top + (north - latitude) * scale];
}

function unwrapRing(ring: number[][], center: number): IndustryPoint[] {
  const points: IndustryPoint[] = [];
  for (const [longitude, latitude] of ring) {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return [];
    let lon = longitude;
    const previous = points.at(-1)?.[0];
    if (previous !== undefined) {
      while (lon - previous > 180) lon -= 360;
      while (lon - previous < -180) lon += 360;
    }
    points.push([lon, latitude]);
  }
  if (!points.length) return [];
  const longitudes = points.map(point => point[0]);
  // Worldwide rings (e.g. Antarctica) cannot be interpreted as a local polygon.
  if (Math.max(...longitudes) - Math.min(...longitudes) > 180) return [];
  const mean = longitudes.reduce((total, longitude) => total + longitude, 0) / points.length;
  const shift = Math.round((center - mean) / 360) * 360;
  return points.map(([longitude, latitude]) => [longitude + shift, latitude]);
}

/** Clip before projection so a dateline-crossing ring never creates a filled horizontal wrap. */
function clipRing(ring: number[][], bounds: IndustryBounds): IndustryPoint[] {
  const [west, south, east, north] = bounds;
  let points = unwrapRing(ring, (west + east) / 2);
  if (points.length > 1 && points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1]) points.pop();
  const edges: [number, number, boolean][] = [[0, west, true], [0, east, false], [1, south, true], [1, north, false]];
  for (const [axis, edge, minimum] of edges) {
    const input = points;
    points = [];
    if (!input.length) break;
    const inside = (point: IndustryPoint) => minimum ? point[axis] >= edge : point[axis] <= edge;
    let previous = input.at(-1)!;
    for (const current of input) {
      if (inside(current) !== inside(previous)) {
        const fraction = (edge - previous[axis]) / (current[axis] - previous[axis]);
        points.push([previous[0] + fraction * (current[0] - previous[0]), previous[1] + fraction * (current[1] - previous[1])]);
      }
      if (inside(current)) points.push(current);
      previous = current;
    }
  }
  return points.length >= 3 ? points : [];
}

export function pathIndustry(geometry: IndustryGeometry, region: IndustryRegion): string {
  const rings = geometry.type === 'Polygon'
    ? geometry.coordinates as number[][][]
    : geometry.type === 'MultiPolygon' ? (geometry.coordinates as number[][][][]).flat() : [];
  return rings.map(ring => clipRing(ring, industryMapBounds[region])).filter(ring => ring.length > 0)
    .map(ring => ring.map((point, index) => {
      const [x, y] = projectIndustry(point, region);
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join('') + 'Z').join('');
}

/** EU Member States, checked against the EU's official country list on 2026-10-01.
 * https://european-union.europa.eu/principles-countries-history/eu-countries_en
 * Membership describes the statistical scope; it does not equate the EU with Europe.
 */
export const industryEuCountries = new Set([
  'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN',
  'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
]);

/** Fixed label positions separate nearby locators without moving their geographical anchors. */
export function industryLabelPosition(id: string, region: IndustryRegion, anchor: IndustryPoint, index = 0): IndustryPoint {
  const positions: Partial<Record<IndustryRegion, Record<string, IndustryPoint>>> = {
    'north-america': { CAN: [78, 110], USA: [696, 268], MEX: [620, 448] },
    europe: { NOR: [646, 91], DEU: [706, 253], FRA: [97, 367], NLD: [89, 239], EU: [668, 420], ESP: [668, 416] },
    asia: { CHN: [79, 161], JPN: [750, 124], THA: [110, 420], KOR: [722, 270], TWN: [737, 398] },
  };
  const known = positions[region]?.[id.toUpperCase()];
  if (known) return known;
  const x = anchor[0] > industryMapWidth / 2 ? 730 : 40;
  return [x, Math.max(58, Math.min(industryMapHeight - 94, anchor[1] + (index % 2 ? 48 : -48)))];
}
