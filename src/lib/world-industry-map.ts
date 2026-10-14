import type { Site } from '../data/atlas/world-industry/types';

export const mapWidth = 1120;
export const mapHeight = 490;
export function project([longitude, latitude]: number[]): [number, number] {
  return [(longitude + 180) / 360 * mapWidth, (85 - latitude) / 150 * mapHeight];
}
export function countryPath(geometry: { type: string; coordinates: unknown }): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return (polygons as number[][][][]).flatMap(polygon => polygon.map(ring =>
    ring.map((point, i) => {
      const [x, y] = project(point);
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join('') + 'Z',
  )).join('');
}

// Layout is computed from the complete sector at build time. Selection never
// recalculates positions, fits bounds, resizes marks or changes label text.
export function layoutSites(sites: Site[]) {
  const placed: { x: number; y: number; width: number; height: number }[] = [];
  return sites.map(site => {
    const [px, py] = project(site.coordinates);
    const width = Math.max(124, Math.min(230, [...site.name].length * 12 + 36));
    const height = 29;
    let best = { x: px + 14, y: py - 15, width, height };
    let score = Infinity;
    const offsets: [number, number][] = site.labelOffset ? [site.labelOffset] : [];
    for (const dy of [-15, -50, 20, -85, 55, -120, 90, 125, -155]) {
      for (const dx of [18, -width - 18, -width / 2]) offsets.push([dx, dy]);
    }
    for (const [dx, dy] of offsets) {
      const candidate = { x: Math.max(8, Math.min(mapWidth - width - 8, px + dx)), y: Math.max(8, Math.min(mapHeight - height - 8, py + dy)), width, height };
      const overlaps = placed.reduce((n, item) => n + (candidate.x < item.x + item.width + 8 && candidate.x + width + 8 > item.x && candidate.y < item.y + item.height + 6 && candidate.y + height + 6 > item.y ? 1 : 0), 0);
      const hidesPoint = sites.some(other => {
        const [x, y] = project(other.coordinates);
        return x > candidate.x - 7 && x < candidate.x + width + 7 && y > candidate.y - 7 && y < candidate.y + height + 7;
      });
      const distance = Math.hypot(candidate.x + width / 2 - px, candidate.y + height / 2 - py);
      const cost = overlaps * 100000 + Number(hidesPoint) * 2000 + distance;
      if (cost < score) { best = candidate; score = cost; }
    }
    placed.push(best);
    return { site, px, py, ...best };
  });
}

export function connectionPath(from: Site, to: Site): string {
  const [x1, y1] = project(from.coordinates);
  const [x2, y2] = project(to.coordinates);
  const bend = Math.min(85, Math.abs(x1 - x2) * .18 + 16);
  return `M${x1},${y1} Q${(x1 + x2) / 2},${Math.min(y1, y2) - bend} ${x2},${y2}`;
}
