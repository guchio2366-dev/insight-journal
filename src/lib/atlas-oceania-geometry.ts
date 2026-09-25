export type Position = number[];
export type Geometry = { type: string; coordinates: Position[][] | Position[][][] };
export const oceaniaBounds = [110, -58, 250, 25] as const;
export const oceaniaWidth = 1200;
export const oceaniaHeight = Math.round(oceaniaWidth * 83 / (140 * Math.cos(20 * Math.PI / 180)));

/** Unwrap each ring, then choose its copy nearest the central Pacific. */
export function unwrapPacificRing(ring: Position[]): Position[] {
  const points: Position[] = [];
  for (const [longitude, latitude] of ring) {
    let lon = longitude;
    const previous = points.at(-1)?.[0];
    if (previous !== undefined) {
      while (lon - previous > 180) lon -= 360;
      while (lon - previous < -180) lon += 360;
    }
    points.push([lon, latitude]);
  }
  if (!points.length) return [];
  const mean = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const shift = Math.round((180 - mean) / 360) * 360;
  return points.map(([lon, lat]) => [lon + shift, lat]);
}

export function clipOceaniaRing(ring: Position[]): Position[] {
  let points = unwrapPacificRing(ring);
  if (points.length > 1 && points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1]) points.pop();
  const edges: [number, number, boolean][] = [[0, 110, true], [0, 250, false], [1, -58, true], [1, 25, false]];
  for (const [axis, boundary, minimum] of edges) {
    const input = points;
    points = [];
    if (!input.length) break;
    let previous = input.at(-1)!;
    const inside = (p: Position) => minimum ? p[axis] >= boundary : p[axis] <= boundary;
    for (const current of input) {
      if (inside(current) !== inside(previous)) {
        const t = (boundary - previous[axis]) / (current[axis] - previous[axis]);
        points.push([previous[0] + t * (current[0] - previous[0]), previous[1] + t * (current[1] - previous[1])]);
      }
      if (inside(current)) points.push(current);
      previous = current;
    }
  }
  return points.length >= 3 ? [...points, points[0]] : [];
}

export function oceaniaRings(geometry: Geometry): Position[][] {
  const rings = geometry.type === 'Polygon' ? geometry.coordinates as Position[][] : (geometry.coordinates as Position[][][]).flat();
  return rings.map(clipOceaniaRing).filter(ring => ring.length > 0);
}

export function projectOceania([longitude, latitude]: Position): Position {
  const lon = longitude < 0 ? longitude + 360 : longitude;
  return [(lon - 110) / 140 * oceaniaWidth, (25 - latitude) / 83 * oceaniaHeight];
}

export function oceaniaPath(geometry: Geometry): string {
  return oceaniaRings(geometry).map(ring => ring.map((point, index) => {
    const [x, y] = projectOceania(point);
    return `${index ? 'L' : 'M'}${x.toFixed(3)},${y.toFixed(3)}`;
  }).join('') + 'Z').join('');
}

/** Projected extent, used by both static markup and the browser controller. */
export function oceaniaExtent(geometry: Geometry): number[] {
  const points = oceaniaRings(geometry).flat().map(projectOceania);
  if (!points.length) return [];
  return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
}
