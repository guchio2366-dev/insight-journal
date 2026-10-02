export interface CanadaLandformRegion {
  id: string;
  sourceName: string;
  name: string;
  nameJapanese?: string;
  color: string;
  labelAnchor: number[];
  description: string;
}

export interface CanadaLandformGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}
export interface CanadaLandformFeature {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: CanadaLandformGeometry;
}
export interface CanadaLandformCollection {
  type: 'FeatureCollection';
  features: CanadaLandformFeature[];
}

export const canadaLandformSize = { width: 900, height: 580 };
export const canadaLandformBounds: [[number, number], [number, number]] = [[-143, 40], [-50, 84]];
const radians = Math.PI / 180;
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85.05112878, Math.min(85.05112878, latitude)) * radians / 2));
const west = canadaLandformBounds[0][0] * radians;
const north = mercatorY(canadaLandformBounds[1][1]);
const spanX = (canadaLandformBounds[1][0] - canadaLandformBounds[0][0]) * radians;
const spanY = north - mercatorY(canadaLandformBounds[0][1]);
const scale = Math.min(canadaLandformSize.width / spanX, canadaLandformSize.height / spanY);
const offsetX = (canadaLandformSize.width - spanX * scale) / 2;
const offsetY = (canadaLandformSize.height - spanY * scale) / 2;

/** The fallback uses the same north-up Web Mercator coordinate frame as MapLibre. */
export function projectCanadaLandform([longitude, latitude]: readonly number[]): [number, number] {
  return [offsetX + (longitude * radians - west) * scale, offsetY + (north - mercatorY(latitude)) * scale];
}

export function unprojectCanadaLandform([x, y]: readonly number[]): [number, number] {
  return [(west + (x - offsetX) / scale) / radians, (2 * Math.atan(Math.exp(north - (y - offsetY) / scale)) - Math.PI / 2) / radians];
}

export function canadaLandformRings(geometry: CanadaLandformGeometry): number[][][] {
  return geometry.type === 'Polygon' ? geometry.coordinates as number[][][] : (geometry.coordinates as number[][][][]).flat();
}

export function canadaLandformPath(geometry: CanadaLandformGeometry): string {
  return canadaLandformRings(geometry).map(ring => ring.map((coordinate, index) => {
    const [x, y] = projectCanadaLandform(coordinate);
    return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;
  }).join('') + 'Z').join('');
}

export function canadaLandformFeatureBounds(geometry: CanadaLandformGeometry): [[number, number], [number, number]] {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const ring of canadaLandformRings(geometry)) for (const [longitude, latitude] of ring) {
    west = Math.min(west, longitude); east = Math.max(east, longitude);
    south = Math.min(south, latitude); north = Math.max(north, latitude);
  }
  return [[west, south], [east, north]];
}

/** Stable UI IDs are joined to the official English region name; source geometry is retained. */
export function prepareCanadaLandforms(collection: CanadaLandformCollection, regions: CanadaLandformRegion[]): CanadaLandformCollection {
  const seen = new Set<string>();
  const features = collection.features.map(feature => {
    const region = regions.find(item => item.sourceName === feature.properties.RegionEn);
    if (!region || seen.has(region.id)) throw new Error('Canada physiography region/source mismatch');
    seen.add(region.id);
    return { ...feature, id: region.id, properties: { ...feature.properties, id: region.id, color: region.color, nameJapanese: region.nameJapanese ?? region.name } };
  });
  if (seen.size !== regions.length || regions.length !== 7) throw new Error('Canada physiography requires the seven official regions');
  return { ...collection, features };
}
