import { projectCanadaLandform } from './atlas-canada-landform-map';

export type CanadaNaturalLayer = 'climate' | 'elevation';
export type CanadaNaturalBounds = [number, number, number, number];
export interface CanadaNaturalGroup { id: string; name: string; color: string; description: string; labelAnchor?: number[]; }
export interface CanadaNaturalStation { id: string; name: string; coordinates: number[]; }
export interface CanadaNaturalGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString';
  coordinates: number[][] | number[][][] | number[][][][];
}
export interface CanadaNaturalFeature { type: 'Feature'; id?: string | number; properties: Record<string, unknown>; geometry: CanadaNaturalGeometry; }
export interface CanadaNaturalCollection { type: 'FeatureCollection'; features: CanadaNaturalFeature[]; }
export interface CanadaNaturalSource {
  publisher?: string; title?: string; brief?: string; catalogueUrl?: string; descriptionUrl?: string;
  licenceUrl?: string; licence?: string; attribution?: string;
}

export const canadaNaturalIsLine = (geometry: CanadaNaturalGeometry) => geometry.type === 'LineString' || geometry.type === 'MultiLineString';
export function canadaNaturalParts(geometry: CanadaNaturalGeometry): number[][][] {
  if (geometry.type === 'LineString') return [geometry.coordinates as number[][]];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as number[][][][]).flat();
  return geometry.coordinates as number[][][];
}
/** All source vertices stay in the same north-up Mercator frame as the landform map. */
export function canadaNaturalPath(geometry: CanadaNaturalGeometry): string {
  const close = !canadaNaturalIsLine(geometry);
  return canadaNaturalParts(geometry).map(part => part.map((coordinate, index) => {
    const [x, y] = projectCanadaLandform(coordinate);
    return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;
  }).join('') + (close ? 'Z' : '')).join('');
}
/** Palette comes only from the manifest's classification, never station values. */
export function prepareCanadaNaturalLayer(collection: CanadaNaturalCollection, groups: CanadaNaturalGroup[]): CanadaNaturalCollection {
  const byId = new Map(groups.map(group => [String(group.id), group]));
  return { ...collection, features: collection.features.map((feature, index) => {
    const id = String(feature.properties.id ?? feature.id ?? '');
    const group = byId.get(id);
    if (!group) throw new Error(`Canada natural layer has an unknown classification: ${id}`);
    return { ...feature, id: feature.id ?? index, properties: { ...feature.properties, id, color: group.color, nameJapanese: group.name } };
  }) };
}
export function canadaNaturalGroupBounds(collection: CanadaNaturalCollection, id: string): [[number, number], [number, number]] | null {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity;
  for (const feature of collection.features) if (String(feature.properties.id) === id) {
    for (const part of canadaNaturalParts(feature.geometry)) for (const [longitude, latitude] of part) {
      west = Math.min(west, longitude); east = Math.max(east, longitude);
      south = Math.min(south, latitude); north = Math.max(north, latitude);
    }
  }
  return Number.isFinite(west) ? [[west, south], [east, north]] : null;
}
