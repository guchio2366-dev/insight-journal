export type Position = number[];
export type Geometry = { type: string; coordinates: number[][][] | number[][][][] };
export const europeBounds = { west: -25, east: 65, south: 32, north: 73 };
export const europeWidth = 1200;
// Equidistant cylindrical projection, true scale at 53°N.
export const europeHeight = Math.round(europeWidth * 41 / (90 * Math.cos(53 * Math.PI / 180)));

export function clipEuropeRing(ring: Position[]): Position[] {
  let points = ring.slice();
  if (points.length > 1 && points[0][0] === points.at(-1)![0] && points[0][1] === points.at(-1)![1]) points.pop();
  const edges: [number, number, boolean][] = [[0, -25, true], [0, 65, false], [1, 32, true], [1, 73, false]];
  for (const [axis, boundary, minimum] of edges) {
    const input = points;
    points = [];
    if (!input.length) break;
    let previous = input.at(-1)!;
    const inside = (point: Position) => minimum ? point[axis] >= boundary : point[axis] <= boundary;
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

export function europeRings(geometry: Geometry): Position[][] {
  const rings = geometry.type === 'Polygon' ? geometry.coordinates as Position[][] : (geometry.coordinates as Position[][][]).flat();
  return rings.map(clipEuropeRing).filter(ring => ring.length > 0);
}

export function projectEurope([longitude, latitude]: Position): Position {
  return [(longitude + 25) / 90 * europeWidth, (73 - latitude) / 41 * europeHeight];
}

export function europePath(geometry: Geometry): string {
  return europeRings(geometry).map(ring => ring.map((point, index) => {
    const [x, y] = projectEurope(point);
    return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join('') + 'Z').join('');
}
