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

const samePoint = (a, b) => a[0] === b[0] && a[1] === b[1];
const floatBits = new DataView(new ArrayBuffer(8));
function exactFloat(value) {
  if (value === 0) return {integer: 0n, exponent: 0};
  floatBits.setFloat64(0, value);
  const bits = floatBits.getBigUint64(0), exponent = Number((bits >> 52n) & 2047n);
  const integer = (bits & ((1n << 52n) - 1n)) | (exponent ? 1n << 52n : 0n);
  return {integer: bits >> 63n ? -integer : integer, exponent: exponent ? exponent - 1075 : -1074};
}
function exactDifference(a, b) {
  const x = exactFloat(a), y = exactFloat(b), exponent = Math.min(x.exponent, y.exponent);
  return {integer: (x.integer << BigInt(x.exponent - exponent)) - (y.integer << BigInt(y.exponent - exponent)), exponent};
}
/** An exact dyadic fallback avoids treating near-collinear boundaries as crossings. */
function orientation(a, b, c) {
  const left = (b[0] - a[0]) * (c[1] - a[1]), right = (b[1] - a[1]) * (c[0] - a[0]), determinant = left - right;
  if (Math.abs(determinant) > 8 * Number.EPSILON * (Math.abs(left) + Math.abs(right))) return Math.sign(determinant);
  const x1 = exactDifference(b[0], a[0]), y1 = exactDifference(b[1], a[1]), x2 = exactDifference(c[0], a[0]), y2 = exactDifference(c[1], a[1]);
  const e1 = x1.exponent + y2.exponent, e2 = y1.exponent + x2.exponent, exponent = Math.min(e1, e2);
  const exact = (x1.integer * y2.integer << BigInt(e1 - exponent)) - (y1.integer * x2.integer << BigInt(e2 - exponent));
  return exact > 0n ? 1 : exact < 0n ? -1 : 0;
}
const inBox = (p, a, b) => p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
/** Classify proper crossings, isolated touches and collinear overlap separately. */
export function segmentRelation(a, b, c, d) {
  if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) || Math.max(c[0], d[0]) < Math.min(a[0], b[0]) || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) || Math.max(c[1], d[1]) < Math.min(a[1], b[1])) return null;
  const abC = orientation(a, b, c), abD = orientation(a, b, d), cdA = orientation(c, d, a), cdB = orientation(c, d, b);
  if (abC * abD < 0 && cdA * cdB < 0) return 'cross';
  if (abC === 0 && abD === 0 && cdA === 0 && cdB === 0) {
    const axis = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 0 : 1;
    const low = Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis])), high = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]));
    return high > low ? 'overlap' : high === low ? 'touch' : null;
  }
  return (abC === 0 && inBox(c, a, b)) || (abD === 0 && inBox(d, a, b)) || (cdA === 0 && inBox(a, c, d)) || (cdB === 0 && inBox(b, c, d)) ? 'touch' : null;
}
function pointOnRing(point, ring) {
  for (let i = 0; i < ring.length - 1; i++) if (inBox(point, ring[i], ring[i + 1]) && orientation(ring[i], ring[i + 1], point) === 0) return true;
  return false;
}

/** Validate one outer ring and its holes, in either native or GeoJSON winding.
 * A bounding-box sweep checks every potentially intersecting segment pair.
 * Once two closed, simple boundaries do not cross, containment of one point
 * establishes containment of the whole hole. Rings are never altered here.
 */
export function validatePolygonTopology(rings, {maxIssues = 1000} = {}) {
  const issues = [], counts = {}, segments = [], lengths = [];
  const add = issue => {counts[issue.type] = (counts[issue.type] ?? 0) + 1; if (issues.length < maxIssues) issues.push(issue);};
  if (!rings.length) return {valid: false, issues: [{type: 'missing-outer'}], counts: {'missing-outer': 1}};
  const outerSign = Math.sign(signedRingArea(rings[0]));
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r]; lengths[r] = ring.length - 1;
    if (ring.length < 4 || new Set(ring.map(p => `${p[0]},${p[1]}`)).size < 3) add({type: 'degenerate-ring', ring: r});
    if (!ring.length || !samePoint(ring[0], ring.at(-1))) add({type: 'open-ring', ring: r});
    const sign = Math.sign(signedRingArea(ring));
    if (!sign || (r && sign === outerSign)) add({type: 'ring-winding', ring: r});
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      if (!a.every(Number.isFinite) || !b.every(Number.isFinite)) {add({type: 'nonfinite-coordinate', ring: r}); continue;}
      if (samePoint(a, b)) continue;
      segments.push({a, b, ring: r, edge: i, minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1])});
    }
  }
  segments.sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  let active = [];
  for (const segment of segments) {
    active = active.filter(a => a.maxX >= segment.minX);
    for (const other of active) {
      if (other.maxY < segment.minY || segment.maxY < other.minY) continue;
      const relation = segmentRelation(segment.a, segment.b, other.a, other.b);
      if (!relation) continue;
      if (segment.ring === other.ring) {
        const gap = Math.abs(segment.edge - other.edge), adjacent = gap === 1 || gap === lengths[segment.ring] - 1;
        if (adjacent && relation === 'touch') continue;
        add({type: `self-${relation}`, ring: segment.ring, edges: [other.edge, segment.edge]});
      } else {
        add({type: `${segment.ring && other.ring ? 'hole-hole' : 'outer-hole'}-${relation}`, rings: [other.ring, segment.ring], edges: [other.edge, segment.edge]});
      }
    }
    active.push(segment);
  }
  for (let h = 1; h < rings.length; h++) {
    const point = rings[h][0];
    if (point && !pointInRings(point, [rings[0]]) && !pointOnRing(point, rings[0])) add({type: 'hole-outside', ring: h});
    for (let other = 1; other < h; other++) {
      if (point && pointInRings(point, [rings[other]])) add({type: 'nested-holes', rings: [other, h]});
      else if (rings[other][0] && pointInRings(rings[other][0], [rings[h]])) add({type: 'nested-holes', rings: [other, h]});
    }
  }
  return {valid: Object.keys(counts).length === 0, issues, counts};
}

function inheritedContactsOnly(source, output) {
  if (source.valid) return output.valid;
  if (Object.keys(source.counts).some(type => type !== 'self-touch') || Object.keys(output.counts).some(type => type !== 'self-touch') || source.counts['self-touch'] !== output.counts['self-touch']) return false;
  const contacts = report => report.issues.map(i => `${i.ring}:${[...i.edges].sort((a, b) => a - b).join(',')}`).sort();
  return JSON.stringify(contacts(source)) === JSON.stringify(contacts(output));
}

/** Retry a whole polygon at lower tolerances, then retain every official vertex.
 * Both native and transformed delivery rings must pass. Original self-touch
 * contacts are reported separately and preserved without splitting or repair.
 */
export function simplifyPolygonTopology(rings, toleranceMetres = 250, {retryTolerances = [], transform = p => p, transformOriginal = transform, preserveOriginal = false} = {}) {
  const source = validatePolygonTopology(rings), attempts = [];
  if (source.valid && !preserveOriginal) for (const tolerance of [toleranceMetres, ...retryTolerances]) {
    const simplified = rings.map(ring => simplifyRing(ring, tolerance)), native = validatePolygonTopology(simplified);
    const outputRings = native.valid ? simplified.map(ring => ring.map(transform)) : null;
    const output = outputRings ? validatePolygonTopology(outputRings) : null;
    attempts.push({toleranceMetres: tolerance, native, output});
    if (native.valid && output.valid) return {rings: simplified, outputRings, fallback: false, source, candidate: attempts[0].native, attempts, toleranceMetres: tolerance, output, sourceContactsPreserved: false};
  }
  const outputRings = rings.map(ring => ring.map(transformOriginal)), output = validatePolygonTopology(outputRings);
  return {rings, outputRings, fallback: true, source, candidate: attempts[0]?.native ?? source, attempts, toleranceMetres: 0, output, sourceContactsPreserved: !source.valid && inheritedContactsOnly(source, output), accepted: inheritedContactsOnly(source, output)};
}

/** Separate polygons may touch at isolated points, but their interiors cannot
 * overlap. Islands inside another polygon's hole remain separate valid parts.
 */
export function validateMultiPolygonTopology(polygons, {maxIssues = 1000} = {}) {
  const issues = [], counts = {}, segments = [], bounds = polygons.map(p => coordinateBounds(p[0]));
  const add = issue => {counts[issue.type] = (counts[issue.type] ?? 0) + 1; if (issues.length < maxIssues) issues.push(issue);};
  for (let polygon = 0; polygon < polygons.length; polygon++) for (let ring = 0; ring < polygons[polygon].length; ring++) {
    const points = polygons[polygon][ring];
    for (let edge = 0; edge < points.length - 1; edge++) {
      const a = points[edge], b = points[edge + 1];if (samePoint(a, b)) continue;
      segments.push({a, b, polygon, ring, edge, minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1])});
    }
  }
  segments.sort((a, b) => a.minX - b.minX || a.minY - b.minY);
  let active = [];
  for (const segment of segments) {
    active = active.filter(a => a.maxX >= segment.minX);
    for (const other of active) {
      if (other.polygon === segment.polygon || other.maxY < segment.minY || segment.maxY < other.minY) continue;
      const relation = segmentRelation(segment.a, segment.b, other.a, other.b);
      if (relation) add({type: `polygon-${relation}`, polygons: [other.polygon, segment.polygon], rings: [other.ring, segment.ring], edges: [other.edge, segment.edge]});
    }
    active.push(segment);
  }
  const contained = (outer, polygon) => {
    for (const point of outer) {
      if (polygon.some(ring => pointOnRing(point, ring))) continue;
      return pointInRings(point, polygon);
    }
    return false;
  };
  for (let a = 0; a < polygons.length; a++) for (let b = 0; b < a; b++) {
    const x = bounds[a], y = bounds[b];
    if (x[2] < y[0] || y[2] < x[0] || x[3] < y[1] || y[3] < x[1]) continue;
    if (contained(polygons[a][0], polygons[b]) || contained(polygons[b][0], polygons[a])) add({type: 'polygon-containment', polygons: [b, a]});
  }
  return {valid: Object.keys(counts).every(type => type === 'polygon-touch'), issues, counts};
}
