import { projectCanadaLandform } from './atlas-canada-landform-map';

export type CanadaNaturalLayer = 'climate' | 'elevation';
export type CanadaNaturalBounds = [number, number, number, number];
export interface CanadaNaturalGroup { id: string; name: string; color: string; description: string; labelAnchor?: number[]; }
export interface CanadaNaturalStation { id: string; name: string; coordinates: number[]; }
export interface CanadaNaturalContourLabel { key: string; id: string; elevationM: number; coordinates: [number, number]; }
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

/** Sparse labels use existing contour vertices, never an invented coordinate. */
export function canadaNaturalContourLabels(collection: CanadaNaturalCollection): CanadaNaturalContourLabel[] {
  // Checked vertices cover the Cordillera, Interior Plains and eastern Shield.
  // A reference is used only when it still exactly matches a source vertex.
  const referenceVertices: Record<string, [number, number][]> = {
    '500': [[-125.975,52.398244],[-107.075,52.027342],[-72.441667,52.040323]],
    '1000': [[-124.10384,54.958333]], '2000': [[-133.975,64.803103]],
  };
  const checked = new Map<string, [number, number][]>();
  const byId = new Map<string, { elevationM: number; candidates: { coordinates: [number, number]; point: [number, number]; length: number }[] }>();
  for (const feature of collection.features) {
    if (!canadaNaturalIsLine(feature.geometry)) continue;
    const id = String(feature.properties.id), elevationM = Number(feature.properties.elevation_m);
    if (!Number.isFinite(elevationM) || elevationM <= 0 || String(elevationM) !== id) continue;
    const group = byId.get(id) ?? { elevationM, candidates: [] };
    byId.set(id, group);
    for (const part of canadaNaturalParts(feature.geometry)) {
      if (part.length < 2) continue;
      for (const reference of referenceVertices[id] ?? []) if (part.some(coordinate => coordinate[0]===reference[0] && coordinate[1]===reference[1])) {
        const vertices = checked.get(id) ?? [];
        if (!vertices.some(coordinate => coordinate[0]===reference[0] && coordinate[1]===reference[1])) vertices.push(reference);
        checked.set(id,vertices);
      }
      const points = part.map(coordinate => projectCanadaLandform(coordinate));
      const distances = points.map((point, index) => index ? Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) : 0);
      const length = distances.reduce((total, distance) => total + distance, 0);
      if (!(length > 0)) continue;
      let accumulated = 0, index = 0;
      for (; index < distances.length - 1 && accumulated < length / 2; index++) accumulated += distances[index];
      const coordinates = part[index] as [number, number], point = points[index];
      group.candidates.push({ coordinates: [coordinates[0], coordinates[1]], point, length });
    }
  }
  const labels: CanadaNaturalContourLabel[] = [];
  for (const [id, group] of byId) {
    const references = checked.get(id);
    if (references?.length) {
      for (const [index,coordinates] of references.entries()) labels.push({ key:`${id}-${index+1}`,id,elevationM:group.elevationM,coordinates:[...coordinates] });
      continue;
    }
    const chosen: [number, number][] = [], maximum = group.elevationM <= 2000 ? 3 : 1;
    for (const candidate of group.candidates.sort((a, b) => b.length - a.length)) {
      if (chosen.some(point => Math.hypot(point[0] - candidate.point[0], point[1] - candidate.point[1]) < 85)) continue;
      chosen.push(candidate.point);
      labels.push({ key: `${id}-${chosen.length}`, id, elevationM: group.elevationM, coordinates: candidate.coordinates });
      if (chosen.length >= maximum) break;
    }
  }
  return labels;
}

export const canadaNaturalContourWidth = (elevationM: number) => elevationM === 500 ? .7 : 1.8;
export const canadaNaturalContourOpacity = (elevationM: number) => elevationM === 500 ? .45 : .9;
