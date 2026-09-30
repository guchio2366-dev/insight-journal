import {inflateRawSync} from 'node:zlib';

/** Original ZIP bytes are read without shell tools, network access or dependencies. */
export function readZipEntries(buffer) {
  let end = -1;
  for (let p = buffer.length - 22; p >= Math.max(0, buffer.length - 65557); p--) {
    if (buffer.readUInt32LE(p) === 0x06054b50) { end = p; break; }
  }
  if (end < 0) throw new Error('ZIP end record not found');
  const count = buffer.readUInt16LE(end + 10), entries = new Map();
  let p = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('Invalid ZIP central directory');
    const flags = buffer.readUInt16LE(p + 8), method = buffer.readUInt16LE(p + 10), size = buffer.readUInt32LE(p + 20), rawSize = buffer.readUInt32LE(p + 24), nameLength = buffer.readUInt16LE(p + 28), extraLength = buffer.readUInt16LE(p + 30), commentLength = buffer.readUInt16LE(p + 32), local = buffer.readUInt32LE(p + 42), name = buffer.subarray(p + 46, p + 46 + nameLength).toString('utf8');
    if (flags & 1) throw new Error('Encrypted ZIP is unsupported');
    if (buffer.readUInt32LE(local) !== 0x04034b50) throw new Error('Invalid ZIP local record');
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28), compressed = buffer.subarray(start, start + size);
    const content = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed) : null;
    if (!content || content.length !== rawSize) throw new Error(`Unsupported or damaged ZIP entry ${name}`);
    entries.set(name, content);
    p += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export function parseDbf(buffer) {
  const count = buffer.readUInt32LE(4), header = buffer.readUInt16LE(8), size = buffer.readUInt16LE(10), fields = [];
  let offset = 1;
  for (let p = 32; buffer[p] !== 13; p += 32) {
    const name = buffer.subarray(p, p + 11).toString('ascii').replace(/\0.*$/, ''), length = buffer[p + 16];
    fields.push({name, length, offset}); offset += length;
  }
  return Array.from({length: count}, (_, row) => Object.fromEntries(fields.map(f => [f.name, buffer.subarray(header + row * size + f.offset, header + row * size + f.offset + f.length).toString('utf8').trim()])));
}

/** Polygon ring structure is retained, including interior rings and multipart records. */
export function readShapeRecords(buffer) {
  if (buffer.readInt32BE(0) !== 9994) throw new Error('Invalid shapefile');
  const records = [];
  for (let p = 100; p < buffer.length;) {
    const bytes = buffer.readInt32BE(p + 4) * 2, start = p + 8, type = buffer.readInt32LE(start);
    if (type === 0) records.push({type, rings: [], bbox: null});
    else {
      if (![5, 15, 25].includes(type)) throw new Error(`Expected polygon shapefile, got ${type}`);
      const parts = buffer.readInt32LE(start + 36), count = buffer.readInt32LE(start + 40), indexes = Array.from({length: parts}, (_, i) => buffer.readInt32LE(start + 44 + i * 4)), pointsStart = start + 44 + parts * 4;
      const points = Array.from({length: count}, (_, i) => [buffer.readDoubleLE(pointsStart + i * 16), buffer.readDoubleLE(pointsStart + i * 16 + 8)]);
      records.push({type, bbox: Array.from({length: 4}, (_, i) => buffer.readDoubleLE(start + 4 + i * 8)), rings: indexes.map((index, i) => points.slice(index, indexes[i + 1] ?? count))});
    }
    p = start + bytes;
  }
  return records;
}

const radians = Math.PI / 180, a = 6378137, f = 1 / 298.257222101, e = Math.sqrt(f * (2 - f));
const m = phi => Math.cos(phi) / Math.sqrt(1 - e * e * Math.sin(phi) ** 2);
const t = phi => Math.tan(Math.PI / 4 - phi / 2) / ((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi))) ** (e / 2);
const phi1 = 49 * radians, phi2 = 77 * radians, phi0 = 63.390675 * radians, lambda0 = -91.86666666666666 * radians;
const n = Math.log(m(phi1) / m(phi2)) / Math.log(t(phi1) / t(phi2)), F = m(phi1) / (n * t(phi1) ** n), rho0 = a * F * t(phi0) ** n;

/** EPSG:3347 NAD83 / Statistics Canada Lambert, GRS 1980 ellipsoid. */
export function inverseCanadaLambert([x, y]) {
  const dx = x - 6200000, dy = rho0 - (y - 3000000), rho = Math.hypot(dx, dy), theta = Math.atan2(dx, dy), q = (rho / (a * F)) ** (1 / n);
  let phi = Math.PI / 2 - 2 * Math.atan(q);
  for (let i = 0; i < 15; i++) {
    const next = Math.PI / 2 - 2 * Math.atan(q * ((1 - e * Math.sin(phi)) / (1 + e * Math.sin(phi))) ** (e / 2));
    if (Math.abs(next - phi) < 1e-13) { phi = next; break; } phi = next;
  }
  return [(lambda0 + theta / n) / radians, phi / radians];
}
export function forwardCanadaLambert([lon, lat]) {
  const rho = a * F * t(lat * radians) ** n, theta = n * (lon * radians - lambda0);
  return [6200000 + rho * Math.sin(theta), 3000000 + rho0 - rho * Math.cos(theta)];
}
export function projectCanada([lon, lat]) { return [(lon + 145) / 95 * 900, (85 - lat) / 45 * 580]; }
export function coordinateBounds(points) { return points.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [Infinity, Infinity, -Infinity, -Infinity]); }
export function signedRingArea(ring) { let area = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; return area / 2; }

/** Shapefile outer rings are clockwise; match holes to the smallest containing outer ring. */
export function shapefilePolygonGroups(rings) {
  const outers = rings.map((ring, index) => ({ring, index, area: signedRingArea(ring)})).filter(r => r.area < 0);
  if (!outers.length && rings.length) throw new Error('Shapefile has no clockwise outer ring');
  const groups = outers.map(r => [r.index]);
  for (let i = 0; i < rings.length; i++) {
    if (signedRingArea(rings[i]) <= 0) continue;
    const candidates = outers.filter(r => pointInRings(rings[i][0], [r.ring])).sort((a, b) => Math.abs(a.area) - Math.abs(b.area));
    if (!candidates.length) throw new Error('Shapefile interior ring has no containing outer ring');
    groups[outers.indexOf(candidates[0])].push(i);
  }
  return groups;
}

function squareDistanceToSegment(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], k = dx || dy ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return (p[0] - a[0] - k * dx) ** 2 + (p[1] - a[1] - k * dy) ** 2;
}
/** Display simplification only. No polygon areas or density estimates are computed. */
export function simplifyRing(ring, toleranceMetres = 250) {
  if (ring.length <= 4) return ring;
  const keep = new Set([0, ring.length - 1]), stack = [[0, ring.length - 1]], tolerance2 = toleranceMetres ** 2;
  while (stack.length) {
    const [first, last] = stack.pop(); let farthest = -1, distance = tolerance2;
    for (let i = first + 1; i < last; i++) { const d = squareDistanceToSegment(ring[i], ring[first], ring[last]); if (d > distance) { distance = d; farthest = i; } }
    if (farthest >= 0) { keep.add(farthest); stack.push([first, farthest], [farthest, last]); }
  }
  const output = [...keep].sort((a, b) => a - b).map(i => ring[i]);
  return output.length >= 4 && Math.sign(signedRingArea(output)) === Math.sign(signedRingArea(ring)) ? output : ring;
}
export function pointInRings([x, y], rings) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
