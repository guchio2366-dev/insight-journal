import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {unzip, parseDbf, parseShp} from './prepare-mexico-nature.mjs';
import {lambertForward} from '../src/lib/atlas-mexico-projection.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(repo, 'public/assets/atlas/mexico-nature-parity-v1');
export const pinnedInputs = {
  climate: '9678ed5307ec9ba9adeb958926a78226165017363f23761135ade400d53b896f',
  relief: '23f106a3001a4bca916e0aab7f6ffb99810599895b0d00ae8b2dcc90272efb2a',
  geometry: '7a215a77ce3109b72571502029ca42ab61298234bc34cf6e6d209b267b6ed89d',
};
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const suffix = (files, extension) => {
  const entry = [...files].find(([name]) => name.toLowerCase().endsWith(extension));
  if (!entry) throw new Error(`Archive lacks ${extension}`);
  return entry[1];
};

const segmentDistanceSquared = (point, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
  return (point[0] - a[0] - t * dx) ** 2 + (point[1] - a[1] - t * dy) ** 2;
};

/** SHP parts can include disjoint outer rings and holes. Use their even-odd fill. */
export function polygonSignedDistance(point, rings) {
  let inside = false, distanceSquared = Infinity;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[j], b = ring[i];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    distanceSquared = Math.min(distanceSquared, segmentDistanceSquared(point, a, b));
  }
  const distance = Math.sqrt(distanceSquared);
  return distance === 0 ? 0 : inside ? distance : -distance;
}
export const strictlyInside = (point, rings) => polygonSignedDistance(point, rings) > 0.01;

function bounds(rings) {
  const result = [Infinity, Infinity, -Infinity, -Infinity];
  for (const ring of rings) for (const [x, y] of ring) {
    result[0] = Math.min(result[0], x); result[1] = Math.min(result[1], y);
    result[2] = Math.max(result[2], x); result[3] = Math.max(result[3], y);
  }
  return result;
}
function ringArea(ring) {
  const origin = ring[0]; let area = 0;
  for (let i = 0; i < ring.length - 1; i++) area += (ring[i][0] - origin[0]) * (ring[i + 1][1] - origin[1]) - (ring[i + 1][0] - origin[0]) * (ring[i][1] - origin[1]);
  return area / 2;
}
const geometryArea = rings => Math.abs(rings.reduce((total, ring) => total + ringArea(ring), 0));

export function nativeMapTransform(boundsNative) {
  const [minX, minY, maxX, maxY] = boundsNative;
  const scale = Math.min(844 / (maxX - minX), 524 / (maxY - minY));
  const left = (900 - (maxX - minX) * scale) / 2, top = (580 - (maxY - minY) * scale) / 2;
  return {
    project: ([x, y]) => [left + (x - minX) * scale, top + (maxY - y) * scale],
    unproject: ([x, y]) => [minX + (x - left) / scale, maxY - (y - top) / scale],
  };
}
export const displayBoxesOverlap = (a, b, gap = 3) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
export const estimatedLabelWidth = (text, fontSize) => [...text].reduce((width, character) => width + (/^[\x00-\x7f]$/.test(character) ? fontSize * .68 : fontSize), 0) + 10;
export function leaderIntersectsBox(a, b, box) {
  let low = 0, high = 1;
  for (const [axis, minimum, maximum] of [[0, box.left, box.right], [1, box.top, box.bottom]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) {if (a[axis] <= minimum || a[axis] >= maximum) return false; continue;}
    const first = (minimum - a[axis]) / delta, second = (maximum - a[axis]) / delta;
    low = Math.max(low, Math.min(first, second)); high = Math.min(high, Math.max(first, second));
    if (low >= high) return false;
  }
  return high > 0 && low < 1;
}

/** Derived annotation layout only; source positions and geographic claims stay fixed. */
export function layoutParityLabels(labels, transform, stations) {
  const stationObstacles = stations.flatMap(station => {
    const [x, y] = transform.project(lambertForward(station.coordinates));
    const text = station.id === 'mexico-city-tacubaya' ? 'メキシコシティ' : 'Culiacan';
    return [{left: x - 10, right: x + 10, top: y - 10, bottom: y + 10},
      {left: x + 8, right: x + 12 + estimatedLabelWidth(text, 18), top: y - 30, bottom: y + 1}];
  });
  const controls = {left: 811, right: 900, top: 0, bottom: 244};
  const field = {left: 12, right: 888, top: 12, bottom: 568};
  for (const view of ['climate', 'relief']) {
    const fontSize = view === 'climate' ? 18 : 17;
    const obstacles = [controls, ...(view === 'climate' ? stationObstacles : [])];
    const items = labels.filter(label => label.view === view).map(label => {
      const anchorMap = transform.project(label.pointNative), text = view === 'climate' ? label.sourceCode : label.labelJa;
      return {label, anchorMap, width: estimatedLabelWidth(text, fontSize), height: fontSize + 10};
    });
    const placed = [];
    // Long labels get first choice; all candidate searches prefer the real anchor.
    for (const item of [...items].sort((a, b) => b.width - a.width || a.label.id.localeCompare(b.label.id))) {
      const [ax, ay] = item.anchorMap, candidates = [];
      const otherAnchors = items.filter(other => other !== item).map(other => ({left: other.anchorMap[0] - 6, right: other.anchorMap[0] + 6, top: other.anchorMap[1] - 6, bottom: other.anchorMap[1] + 6}));
      const add = (x, y) => {
        const left = Math.max(field.left, Math.min(field.right - item.width, x - item.width / 2));
        const top = Math.max(field.top, Math.min(field.bottom - item.height, y - item.height / 2));
        const box = {left, top, right: left + item.width, bottom: top + item.height};
        if ([...obstacles, ...otherAnchors, ...placed.map(other => other.box)].some(other => displayBoxesOverlap(box, other))) return;
        const leader = [Math.max(box.left, Math.min(box.right, ax)), Math.max(box.top, Math.min(box.bottom, ay))];
        const leaderObstacles = obstacles.filter(other => !(ax >= other.left && ax <= other.right && ay >= other.top && ay <= other.bottom));
        if ([...leaderObstacles, ...placed.map(other => other.box)].some(other => leaderIntersectsBox(item.anchorMap, leader, other))) return;
        if (placed.some(other => leaderIntersectsBox(other.anchorMap, other.leader, box))) return;
        const center = [(box.left + box.right) / 2, (box.top + box.bottom) / 2];
        candidates.push({box, center, leader, distance: (center[0] - ax) ** 2 + (center[1] - ay) ** 2});
      };
      add(ax, ay);
      for (let y = field.top + item.height / 2; y <= field.bottom - item.height / 2; y += 8) {
        for (let x = field.left + item.width / 2; x <= field.right - item.width / 2; x += 8) add(x, y);
      }
      candidates.sort((a, b) => a.distance - b.distance || a.center[1] - b.center[1] || a.center[0] - b.center[0]);
      if (!candidates.length) throw new Error(`Cannot place ${item.label.id} without annotation overlap`);
      const selected = candidates[0], leader = selected.leader;
      item.label.displayPointNative = transform.unproject(selected.center);
      item.label.displayBoxMap = selected.box;
      item.label.leaderEndNative = transform.unproject(leader);
      item.label.displayDisplaced = Math.hypot(selected.center[0] - ax, selected.center[1] - ay) > .01;
      item.label.displayFontSizeMap = fontSize;
      item.label.displayDisplacementMap = Math.hypot(selected.center[0] - ax, selected.center[1] - ay);
      placed.push({box: selected.box, label: item.label, anchorMap: item.anchorMap, leader});
    }
  }
  return {mapViewBox: [0, 0, 900, 580], minimumSupportedWidthPx: 591, intendedViewportPx: [591, 381], fontSizesMap: {climate: 18, relief: 17},
    boundsMap: field, controlObstacleMap: controls, climateStationObstaclesMap: stationObstacles,
    textWidthEstimate: '0.68 em per ASCII code glyph; 1 em per Japanese glyph; 10 SVG units extra stroke/padding; label height font size + 10 SVG units',
    leaderPlacement: 'Text avoids other source-anchor dots; leaders avoid other label text boxes, city labels, station points and controls. A leader whose fixed source anchor lies within a station glyph starts beneath that glyph; it is not relocated. Leaders may cross other leaders.',
    semantics: 'displayPointNative is a derived annotation centre only. pointNative remains the strictly interior source anchor. Displaced text requires a leader from pointNative to leaderEndNative; no geographic feature or source coordinate moves.'};
}

class MaxHeap {
  values = [];
  push(cell) {
    const values = this.values; let index = values.length; values.push(cell);
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (values[parent].maximum >= cell.maximum) break;
      values[index] = values[parent]; index = parent;
    }
    values[index] = cell;
  }
  pop() {
    const values = this.values, first = values[0], last = values.pop();
    if (values.length) {
      let index = 0;
      while (index * 2 + 1 < values.length) {
        let child = index * 2 + 1;
        if (child + 1 < values.length && values[child + 1].maximum > values[child].maximum) child++;
        if (values[child].maximum <= last.maximum) break;
        values[index] = values[child]; index = child;
      }
      values[index] = last;
    }
    return first;
  }
}

/** Deterministic pole-of-inaccessibility search in the original native plane. */
function pole(rings, originalRings = null) {
  const [x0, y0, x1, y1] = bounds(rings), width = x1 - x0, height = y1 - y0;
  if (width <= 0 || height <= 0) throw new Error('Cannot label a degenerate polygon');
  const tolerance = Math.min(250, Math.min(width, height) / 100);
  const distance = point => {
    const display = polygonSignedDistance(point, rings);
    return originalRings && display > 0 ? Math.min(display, polygonSignedDistance(point, originalRings)) : display;
  };
  const cell = (x, y, half) => {const d = distance([x, y]); return {x, y, half, d, maximum: d + half * Math.SQRT2};};
  const heap = new MaxHeap();
  let best = cell((x0 + x1) / 2, (y0 + y1) / 2, 0);
  heap.push(cell(best.x, best.y, Math.max(width, height) / 2));
  let iterations = 0;
  while (heap.values.length) {
    const current = heap.pop();
    if (current.d > best.d) best = current;
    if (current.maximum - best.d <= tolerance) continue;
    const half = current.half / 2;
    for (const dx of [-half, half]) for (const dy of [-half, half]) heap.push(cell(current.x + dx, current.y + dy, half));
    if (++iterations > 250000) throw new Error('Interior label search exceeded its bound');
  }
  if (best.d <= 0.01) throw new Error('No strict interior label coordinate found');
  return [best.x, best.y];
}

export function interiorAnchor(displayRings, originalRings) {
  let point = pole(displayRings);
  if (!strictlyInside(point, originalRings)) point = pole(displayRings, originalRings);
  if (!strictlyInside(point, displayRings) || !strictlyInside(point, originalRings)) throw new Error('Label is outside its original or display polygon');
  return {pointNative: point, clearanceM: Math.min(polygonSignedDistance(point, displayRings), polygonSignedDistance(point, originalRings))};
}

export function extractUsPalette(script) {
  const codes = script.match(/codes='([^']+)'\.split\(\)/)?.[1].split(/\s+/);
  const colors = script.match(/palette='([^']+)'\.split\(\)/)?.[1].split(/\s+/);
  if (!codes || !colors || codes.length !== 30 || colors.length !== 30) throw new Error('US reference palette contract changed');
  return Object.fromEntries(codes.map((code, index) => [code, `#${colors[index]}`]));
}

// These are display hue donors, not conversions to standard Köppen subtypes.
export function displayMapping(sourceCode) {
  if (/^A\(C\)/.test(sourceCode)) return {displayKey: /^A\(C\)w/.test(sourceCode) ? 'a-c-subhumid' : 'a-c-humid', colorReferenceCode: /^A\(C\)w/.test(sourceCode) ? 'Aw' : 'Am', sourcePrefix: 'A(C)', mappingBasis: 'Separate García warm A/C transition; tropical hue reuse only'};
  if (/^\(A\)C/.test(sourceCode)) return {displayKey: /^\(A\)C(?:\(w|x')/.test(sourceCode) ? 'c-a-subhumid' : 'c-a-humid', colorReferenceCode: /^\(A\)C(?:\(w|x')/.test(sourceCode) ? 'Cwa' : 'Cfa', sourcePrefix: '(A)C', mappingBasis: 'Separate García warm C/A transition; temperate hue reuse only'};
  if (/^C\(E\)/.test(sourceCode)) return {displayKey: /\(m\)/.test(sourceCode) ? 'c-e-humid' : 'c-e-subhumid', colorReferenceCode: /\(m\)/.test(sourceCode) ? 'Cfc' : 'Cwc', sourcePrefix: 'C(E)', mappingBasis: 'Separate García cool C/E transition; cool temperate hue reuse only; no D assignment'};
  if (sourceCode === 'E(T)H') return {displayKey: 'e-th-highland', colorReferenceCode: 'ET', sourcePrefix: 'E(T)H', mappingBasis: 'Original cold highland symbol retained separately; gray hue reuse only, not a Beck ET assignment'};
  if (/^Af/.test(sourceCode)) return {displayKey: 'a-f', colorReferenceCode: 'Af', sourcePrefix: 'Af', mappingBasis: 'Shared A/f prefix; original modified suffix retained'};
  if (/^Am/.test(sourceCode)) return {displayKey: 'a-m', colorReferenceCode: 'Am', sourcePrefix: 'Am', mappingBasis: 'Shared A/m prefix; original modified suffix retained'};
  if (/^Aw/.test(sourceCode)) return {displayKey: 'a-w', colorReferenceCode: 'Aw', sourcePrefix: 'Aw', mappingBasis: 'Shared A/w prefix; original moisture and season modifiers retained'};
  if (/^BW/.test(sourceCode)) return {displayKey: /^BWk/.test(sourceCode) ? 'bw-k' : 'bw-h', colorReferenceCode: /^BWk/.test(sourceCode) ? 'BWk' : 'BWh', sourcePrefix: 'BW', mappingBasis: 'Shared BW arid prefix with source h/k marker; donor hue only'};
  if (/^BS/.test(sourceCode)) return {displayKey: /^BS[01]?k/.test(sourceCode) ? 'bs-k' : 'bs-h', colorReferenceCode: /^BS[01]?k/.test(sourceCode) ? 'BSk' : 'BSh', sourcePrefix: sourceCode.startsWith('BS0') ? 'BS0' : sourceCode.startsWith('BS1') ? 'BS1' : 'BS', mappingBasis: 'Shared BS dry prefix with source h/k marker; García BS0/BS1 distinctions retained, donor hue only'};
  if (/^Cs/.test(sourceCode)) return {displayKey: 'c-s', colorReferenceCode: 'Csa', sourcePrefix: 'Cs', mappingBasis: 'Shared C/s prefix; summer subtype a/b/c unspecified, donor hue only'};
  if (/^C\(w/.test(sourceCode)) return {displayKey: 'c-w', colorReferenceCode: 'Cwa', sourcePrefix: 'C(w)', mappingBasis: 'Shared C/w marker; source moisture modifiers retained, summer subtype unspecified'};
  if (/^Cx'/.test(sourceCode)) return {displayKey: 'c-x', colorReferenceCode: 'Cfb', sourcePrefix: "Cx'", mappingBasis: 'Original García x-prime rain regime retained separately; donor hue only'};
  if (/^C\((?:m|fm)\)/.test(sourceCode)) return {displayKey: 'c-humid', colorReferenceCode: 'Cfa', sourcePrefix: 'C(m)/C(fm)', mappingBasis: 'Original García humid C symbols retained; donor hue only, no f/a subtype conversion'};
  throw new Error(`No justified display mapping for original source code ${sourceCode}`);
}

const displayNames = {
  'a-f': 'Af 系（原記号を保持）', 'a-m': 'Am 系（原記号を保持）', 'a-w': 'Aw 系（原記号を保持）',
  'a-c-humid': 'A(C) 移行型・湿潤', 'a-c-subhumid': 'A(C) 移行型・亜湿潤',
  'c-a-humid': '(A)C 移行型・湿潤', 'c-a-subhumid': '(A)C 移行型・亜湿潤',
  'c-e-humid': 'C(E) 冷涼移行型・湿潤', 'c-e-subhumid': 'C(E) 冷涼移行型・亜湿潤', 'e-th-highland': 'E(T)H 寒冷高地型',
  'bw-h': 'BW 系・h 記号', 'bw-k': 'BW 系・k 記号', 'bs-h': 'BS 系・h 記号', 'bs-k': 'BS 系・k 記号',
  'c-s': 'Cs 系', 'c-w': 'C(w) 系', 'c-x': "Cx' 系", 'c-humid': 'C(m)・C(fm) 系',
};

function makeLabels(layer, view, originals, geometrySha256) {
  return layer.classes.filter(category => category.status !== 'missing').map(category => {
    const candidates = layer.features.filter(feature => feature.classId === category.id && feature.status !== 'missing' && feature.sourceLabel === category.labelSource)
      .sort((a, b) => geometryArea(b.geometry.coordinates) - geometryArea(a.geometry.coordinates) || a.id.localeCompare(b.id));
    if (!candidates.length) throw new Error(`No official feature agrees with ${view} class ${category.id}`);
    const feature = candidates[0], original = originals.get(feature.id);
    if (!original) throw new Error(`Original feature absent: ${feature.id}`);
    const anchor = interiorAnchor(feature.geometry.coordinates, original);
    return {
      id: `${view}-class-${category.id}`, view, classId: category.id, sourceCode: feature.sourceCode,
      labelJa: category.labelJa, labelSource: category.labelSource, ...anchor, sourceFeatureId: feature.id,
      source: {agency: layer.source.agency, url: layer.source.url, edition: layer.source.edition, archiveSha256: layer.source.sha256, geometrySha256},
    };
  });
}

export async function prepareParity() {
  const geometryPath = resolve(repo, 'src/data/atlas/mexico/nature-v1.json');
  const publicGeometryPath = resolve(repo, 'public/assets/atlas/mexico-nature-v1/nature-v1.json');
  const sourceDir = resolve(repo, 'data-source/atlas/mexico/nature');
  const [geometryBytes, publicBytes, climateBytes, reliefBytes, usScriptBytes, metadataBytes, indexBytes, stationBytes] = await Promise.all([
    readFile(geometryPath), readFile(publicGeometryPath), readFile(resolve(sourceDir, 'climate-2008.zip')),
    readFile(resolve(sourceDir, 'relief-2001.zip')), readFile(resolve(repo, 'scripts/refine-atlas-nature.py')), readFile(resolve(sourceDir, 'climas1m.htm')),
    readFile(resolve(repo, 'src/data/atlas/mexico/geometry-index.json')), readFile(resolve(repo, 'src/data/atlas/mexico/climate-normals.json')),
  ]);
  const geometrySha256 = sha256(geometryBytes);
  if (!geometryBytes.equals(publicBytes)) throw new Error('Source and public geometry disagree');
  for (const [name, bytes] of [['climate', climateBytes], ['relief', reliefBytes], ['geometry', geometryBytes]]) if (sha256(bytes) !== pinnedInputs[name]) throw new Error(`Pinned ${name} source changed`);
  const data = JSON.parse(geometryBytes);
  const climateZip = unzip(climateBytes), reliefZip = unzip(suffix(unzip(reliefBytes), '.zip'));
  const originalMaps = {};
  for (const [view, files] of [['climate', climateZip], ['relief', reliefZip]]) {
    const rows = parseDbf(suffix(files, '.dbf')), geometries = parseShp(suffix(files, '.shp'));
    if (rows.length !== geometries.length) throw new Error('Original DBF and SHP record counts disagree');
    originalMaps[view] = new Map(rows.map((row, index) => [`${view}-${row.OBJECTID}`, geometries[index]]));
  }
  const labels = {schemaVersion: 1, generatedAt: '2026-10-05', projection: data.projection, geometrySha256,
    coordinateRole: 'Strict interior of identified original INEGI polygon and its unchanged display polygon; native projected meters; not a city or summit location',
    labels: [...makeLabels(data.climate, 'climate', originalMaps.climate, geometrySha256), ...makeLabels(data.relief, 'relief', originalMaps.relief, geometrySha256)]};
  labels.labelLayout = {...layoutParityLabels(labels.labels, nativeMapTransform(JSON.parse(indexBytes).metadata.boundsNative), JSON.parse(stationBytes).stations),
    stationCoordinateSource: {file: 'src/data/atlas/mexico/climate-normals.json', sha256: sha256(stationBytes)},
    frameSource: {file: 'src/data/atlas/mexico/geometry-index.json', sha256: sha256(indexBytes)}};
  const usPalette = extractUsPalette(usScriptBytes.toString('utf8')), bySourceCode = {}, displayGroups = new Map();
  for (const code of [...new Set(data.climate.features.map(feature => feature.sourceCode))].sort()) {
    const features = data.climate.features.filter(feature => feature.sourceCode === code), mapping = displayMapping(code);
    const color = usPalette[mapping.colorReferenceCode];
    bySourceCode[code] = {...mapping, color, equivalence: 'display-hue-only',
      labelSources: [...new Set(features.map(feature => feature.sourceLabel))].sort(), classIds: [...new Set(features.map(feature => feature.classId))].sort(), featureCount: features.length};
    const group = displayGroups.get(mapping.displayKey) ?? {id: mapping.displayKey, labelJa: displayNames[mapping.displayKey], color, colorReferenceCode: mapping.colorReferenceCode, sourcePrefixes: [], sourceCodes: []};
    if (!group.sourcePrefixes.includes(mapping.sourcePrefix)) group.sourcePrefixes.push(mapping.sourcePrefix);
    group.sourceCodes.push(code); displayGroups.set(mapping.displayKey, group);
  }
  const notes = [
    'The 21 original INEGI TIPO_N classes and every original García modified Köppen CLAVE remain unchanged. No conversion to Beck 30 classes, standard five families, or a 1991–2020 observation period is performed.',
    'Colors are exact hue values from the existing US display palette. colorReferenceCode identifies a hue donor only; it does not classify a Mexico polygon as that US class.',
    'A(C), (A)C, C(E), and E(T)H are separately identified transitional or highland symbols. C(E) is never reassigned to D. No D-prefixed symbol occurs in these source polygons.',
    'Original climate-551 retains classId 32, sourceCode BS0hw, and sourceLabel Seco semicálido. The source archive contains this inconsistent TIPO_N/CLAVE combination after its documented 2021 correction; no silent repair is made.',
    'An original class can contain several display hues. Its legend must show its colors or the original modified-code display groups, not a single claimed Beck equivalent.',
    'Relief colors and translated class names are preserved from the existing INEGI province presentation. S/It remains missing, with no province-name label anchor.',
  ];
  const palette = {schemaVersion: 1, generatedAt: '2026-10-05', geometrySha256, classification: 'INEGI / García modified Köppen', equivalence: 'display-hue-only',
    reference: {file: 'scripts/refine-atlas-nature.py', sha256: sha256(usScriptBytes), role: 'Existing US display hue values only'},
    climate: {bySourceCode, displayGroups: [...displayGroups.values()], classes: data.climate.classes.map(category => {
      const sourceCodes = [...new Set(data.climate.features.filter(feature => feature.classId === category.id).map(feature => feature.sourceCode))].sort();
      return {...category, sourceCodes, colors: [...new Set(sourceCodes.map(code => bySourceCode[code].color))]};
    })}, relief: {classes: data.relief.classes.map(category => ({...category}))}, notes};
  await mkdir(outputDir, {recursive: true});
  const assetHashes = [];
  for (const [file, value] of [['labels.json', labels], ['palette.json', palette]]) {
    const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
    if (file === 'labels.json') await writeFile(resolve(outputDir, file), bytes);
    else if (!bytes.equals(await readFile(resolve(outputDir, file)))) throw new Error('Label preparation must not change the existing palette');
    assetHashes.push({file, sha256: sha256(bytes), bytes: bytes.length});
  }
  const manifest = {schemaVersion: 1, generatedAt: '2026-10-05', sources: [data.climate.source, data.relief.source], projection: data.projection,
    geometry: {file: '../mexico-nature-v1/nature-v1.json', sha256: geometrySha256, unchanged: true},
    semanticEvidence: {file: 'data-source/atlas/mexico/nature/climas1m.htm', sha256: sha256(metadataBytes), description: 'Original INEGI archive metadata identifies Köppen classification modified by E. García, with INEGI contributions for Mexican conditions'},
    paletteReference: palette.reference, labelLayout: labels.labelLayout, assets: assetHashes, counts: {climateClasses: data.climate.classes.length, climateSourceCodes: Object.keys(bySourceCode).length,
      climateLabels: labels.labels.filter(label => label.view === 'climate').length, reliefLabels: labels.labels.filter(label => label.view === 'relief').length, missingReliefLabels: 0},
    processing: {labelSelection: 'Largest source-label-matching valid feature in each original class; deterministic pole-of-inaccessibility of unchanged display rings; strict containment checked against unsimplified original SHP and display rings using even-odd fill, including holes',
      labelToleranceM: 'At most 250 m; at most one hundredth of the smaller feature span', coordinateTransform: 'None: original Lambert Conformal Conic / ITRF92 native meter coordinates', sourceGeometryMutation: false, paletteRole: 'Display only; no original category, geometry, source code, period or provenance change'}, notes};
  await writeFile(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!geometryBytes.equals(await readFile(geometryPath)) || !publicBytes.equals(await readFile(publicGeometryPath))) throw new Error('Geometry bytes changed during preparation');
  return {labels, palette, manifest};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {manifest} = await prepareParity();
  console.log(JSON.stringify({outputDir, ...manifest.counts, geometrySha256: manifest.geometry.sha256}));
}
