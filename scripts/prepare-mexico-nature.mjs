import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {lambertInverse} from '../src/lib/atlas-mexico-projection.mjs';
import {geometryTopologyIssues} from './lib/mexico-geometry-topology.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = resolve(repo, 'data-source/atlas/mexico/nature');
const publicDir = resolve(repo, 'public/assets/atlas/mexico-nature-v1');
const dataPath = resolve(repo, 'src/data/atlas/mexico/nature-v1.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const decoder = new TextDecoder('windows-1252');

/** Read the ordinary ZIP central directory without adding a GIS or ZIP dependency. */
export function unzip(buffer) {
  let end = buffer.length - 22;
  while (end >= Math.max(0, buffer.length - 65557) && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('ZIP central directory is missing');
  const count = buffer.readUInt16LE(end + 10), files = new Map();
  let cursor = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid ZIP directory');
    const method = buffer.readUInt16LE(cursor + 10), compressed = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28), extraLength = buffer.readUInt16LE(cursor + 30), commentLength = buffer.readUInt16LE(cursor + 32);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const local = buffer.readUInt32LE(cursor + 42);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const bytes = buffer.subarray(start, start + compressed);
    if (!name.endsWith('/')) files.set(name, method === 0 ? Buffer.from(bytes) : method === 8 ? inflateRawSync(bytes) : (() => {throw new Error(`Unsupported ZIP method ${method}`);})());
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

export function parseDbf(buffer) {
  const count = buffer.readUInt32LE(4), headerLength = buffer.readUInt16LE(8), recordLength = buffer.readUInt16LE(10);
  const fields = [];
  let offset = 1;
  for (let cursor = 32; cursor < headerLength - 1 && buffer[cursor] !== 13; cursor += 32) {
    const name = buffer.subarray(cursor, cursor + 11).toString('ascii').replace(/\0.*$/, '');
    const type = String.fromCharCode(buffer[cursor + 11]), length = buffer[cursor + 16];
    fields.push({name, type, length, offset}); offset += length;
  }
  return Array.from({length: count}, (_, index) => {
    const start = headerLength + index * recordLength;
    if (buffer[start] === 42) throw new Error(`Deleted DBF record ${index}`);
    return Object.fromEntries(fields.map(field => {
      const text = decoder.decode(buffer.subarray(start + field.offset, start + field.offset + field.length)).trim();
      return [field.name, field.type === 'N' || field.type === 'F' ? text === '' ? null : Number(text) : text];
    }));
  });
}

export function parseShp(buffer) {
  if (buffer.readInt32BE(0) !== 9994 || buffer.readInt32LE(32) !== 5) throw new Error('Expected a polygon shapefile');
  const records = [];
  for (let cursor = 100; cursor < buffer.length;) {
    const size = buffer.readInt32BE(cursor + 4) * 2, start = cursor + 8, type = buffer.readInt32LE(start);
    if (type !== 5) throw new Error(`Unexpected SHP record type ${type}`);
    const partCount = buffer.readInt32LE(start + 36), pointCount = buffer.readInt32LE(start + 40);
    const pointStart = start + 44 + partCount * 4;
    const points = Array.from({length: pointCount}, (_, index) => [buffer.readDoubleLE(pointStart + index * 16), buffer.readDoubleLE(pointStart + index * 16 + 8)]);
    const parts = Array.from({length: partCount}, (_, index) => buffer.readInt32LE(start + 44 + index * 4));
    records.push(parts.map((part, index) => points.slice(part, parts[index + 1] ?? pointCount)));
    cursor += 8 + size;
  }
  return records;
}

const squaredDistanceToSegment = (point, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length));
  return (point[0] - a[0] - t * dx) ** 2 + (point[1] - a[1] - t * dy) ** 2;
};

/** A 300 m display simplification retaining exact original vertices and all rings. */
export function simplifyRing(ring, tolerance = 300) {
  if (ring.length < 5 || tolerance === 0) return ring.map(point => [...point]);
  const keep = new Set([0, ring.length - 1]), stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop(); let maximum = tolerance ** 2, selected = -1;
    for (let index = first + 1; index < last; index++) {
      const distance = squaredDistanceToSegment(ring[index], ring[first], ring[last]);
      if (distance > maximum) {maximum = distance; selected = index;}
    }
    if (selected >= 0) {keep.add(selected); stack.push([first, selected], [selected, last]);}
  }
  let result = ring.filter((_, index) => keep.has(index));
  if (result.length < 4) result = ring;
  result = result.map(point => [...point]);
  if (result[0][0] !== result.at(-1)[0] || result[0][1] !== result.at(-1)[1]) result.push([...result[0]]);
  return result;
}

/** Reject new crossings, hole containment changes and orientation changes. */
export function validateNaturalTopology(features, originals) {
  const geographic = rings => ({type: 'Polygon', coordinates: rings.map(ring => ring.map(lambertInverse))});
  const sourceFeatures = features.map(feature => ({properties: {code: feature.id}, geometry: geographic(originals.get(feature.id))}));
  const key = point => point.join(','), neighbors = new Map(), arcCache = new Map(), arcTolerances = new Map(), ringArcs = new Map();
  for (const feature of features) for (const ring of originals.get(feature.id)) for (let index = 0; index < ring.length - 1; index++) {
    const a = key(ring[index]), b = key(ring[index + 1]); if (a === b) continue;
    if (!neighbors.has(a)) neighbors.set(a, new Set()); if (!neighbors.has(b)) neighbors.set(b, new Set());
    neighbors.get(a).add(b); neighbors.get(b).add(a);
  }
  let currentRing = '';
  const arc = points => {
    const forward = points.map(key).join(';'), reverse = [...points].reverse().map(key).join(';'), reversed = reverse < forward, canonical = reversed ? reverse : forward;
    if (!ringArcs.has(currentRing)) ringArcs.set(currentRing, new Set()); ringArcs.get(currentRing).add(canonical);
    if (!arcCache.has(canonical)) {
      const ordered = reversed ? [...points].reverse() : points, tolerance = arcTolerances.get(canonical) ?? 300;
      if (!tolerance || ordered.length < 3) arcCache.set(canonical, ordered);
      else {
        const keep = new Set([0, ordered.length - 1]), stack = [[0, ordered.length - 1]];
        while (stack.length) {const [first, last] = stack.pop(); let maximum = tolerance ** 2, selected = -1; for (let index = first + 1; index < last; index++) {const distance = squaredDistanceToSegment(ordered[index], ordered[first], ordered[last]); if (distance > maximum) {maximum = distance; selected = index;}} if (selected >= 0) {keep.add(selected); stack.push([first, selected], [selected, last]);}}
        arcCache.set(canonical, [...keep].sort((a, b) => a - b).map(index => ordered[index]));
      }
    }
    const result = arcCache.get(canonical); return reversed ? [...result].reverse() : result;
  };
  const ring = (original, id) => {
    currentRing = id;
    const points = original.slice(0, -1), junctions = [];
    for (let index = 0; index < points.length; index++) if (neighbors.get(key(points[index]))?.size !== 2) junctions.push(index);
    if (!junctions.length) {
      let anchor = 0; for (let index = 1; index < points.length; index++) if (key(points[index]) < key(points[anchor])) anchor = index;
      points.push(...points.splice(0, anchor));
      // Two canonical anchors also agree for oppositely oriented closed shared rings.
      let split = 1, maximum = -1; for (let index = 1; index < points.length; index++) {const distance = (points[index][0] - points[0][0]) ** 2 + (points[index][1] - points[0][1]) ** 2; if (distance > maximum || (distance === maximum && key(points[index]) < key(points[split]))) {maximum = distance; split = index;}}
      const closed = [...points, points[0]], result = [...arc(closed.slice(0, split + 1)).slice(0, -1), ...arc(closed.slice(split))];
      return result.length >= 4 ? result : original;
    }
    const start = junctions[0], closed = [...points.slice(start), ...points.slice(0, start), points[start]], result = [];
    let from = 0; for (let index = 1; index < closed.length; index++) if (index === closed.length - 1 || neighbors.get(key(closed[index]))?.size !== 2) {result.push(...arc(closed.slice(from, index + 1)).slice(0, -1)); from = index;}
    result.push(result[0]); return result.length >= 4 ? result : original;
  };
  let passes = 0;
  for (let pass = 0; pass < 25; pass++) {
    arcCache.clear(); ringArcs.clear();
    for (const feature of features) feature.geometry.coordinates = originals.get(feature.id).map((original, index) => ring(original, `${feature.id}:0:${index}`));
    const rendered = features.map(feature => ({properties: {code: feature.id}, geometry: geographic(feature.geometry.coordinates)}));
    const issues = geometryTopologyIssues(sourceFeatures, rendered); passes = pass + 1;
    console.log(JSON.stringify({layer: features[0].id.split('-')[0], pass, topologyIssues: issues.length}));
    if (!issues.length) return {validationPasses: passes, sharedArcCount: arcCache.size, adaptedArcs: arcTolerances.size, minimumToleranceM: Math.min(300, ...arcTolerances.values()), newProperIntersections: 0, newContainments: 0, orientationChanges: 0};
    if (pass === 24) throw new Error(`Natural geometry simplification has unresolved topology changes: ${JSON.stringify(issues.slice(0, 8))}`);
    for (const ringId of new Set(issues.flatMap(issue => issue.rings))) {
      for (const canonical of ringArcs.get(ringId) ?? []) arcTolerances.set(canonical, pass >= 7 ? 0 : (arcTolerances.get(canonical) ?? 300) / 4);
    }
  }
}

const climateGroups = [
  {id: 'dry', label: '乾燥・非常に乾燥', color: '#d5a95b'},
  {id: 'semidry', label: '半乾燥', color: '#e7cf91'},
  {id: 'warm-humid', label: '高温・湿潤', color: '#28775f'},
  {id: 'warm-subhumid', label: '高温・亜湿潤', color: '#89b973'},
  {id: 'temperate', label: '温帯・湿潤／亜湿潤', color: '#69a8c7'},
  {id: 'cold', label: '寒冷・やや寒冷', color: '#aea1c4'},
];
const climateLabels = {
  'Calido humedo': '高温・湿潤', 'Calido subhumedo': '高温・亜湿潤', 'Semicalido humedo': 'やや高温・湿潤', 'Semicalido subhumedo': 'やや高温・亜湿潤',
  'Templado humedo': '温帯・湿潤', 'Templado subhumedo': '温帯・亜湿潤', 'Semifrio subhumedo': 'やや寒冷・亜湿潤', 'Frio': '寒冷',
  'Muy seco calido': '非常に乾燥・高温', 'Muy seco muy calido': '非常に乾燥・非常に高温', 'Muy seco semicalido': '非常に乾燥・やや高温', 'Muy seco templado': '非常に乾燥・温帯',
  'Seco calido': '乾燥・高温', 'Seco muy calido': '乾燥・非常に高温', 'Seco semicalido': '乾燥・やや高温', 'Seco templado': '乾燥・温帯',
  'Semiseco calido': '半乾燥・高温', 'Semiseco muy calido': '半乾燥・非常に高温', 'Semiseco semicalido': '半乾燥・やや高温', 'Semiseco semifrio': '半乾燥・やや寒冷', 'Semiseco templado': '半乾燥・温帯',
};
const ascii = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const climateGroup = sourceLabel => {const label = ascii(sourceLabel); return label.startsWith('Muy seco') || label.startsWith('Seco') ? 'dry' : label.startsWith('Semiseco') ? 'semidry' : label.startsWith('Templado') ? 'temperate' : label.startsWith('Frio') || label.startsWith('Semifrio') ? 'cold' : label.endsWith('subhumedo') ? 'warm-subhumid' : 'warm-humid';};
const reliefLabels = {
  'I': 'バハ・カリフォルニア半島', 'II': 'ソノラ平原', 'III': '西シエラマドレ', 'IV': '北部の山地と平原', 'V': '東シエラマドレ', 'VI': '北米大平原',
  'VII': '太平洋沿岸平原', 'VIII': 'メキシコ湾北部沿岸平原', 'IX': '中央高原', 'X': 'メキシコ火山帯', 'XI': 'ユカタン半島', 'XII': '南シエラマドレ',
  'XIII': 'メキシコ湾南部沿岸平原', 'XIV': 'チアパス・グアテマラ山地', 'XV': '中米山脈', 'S/It': '原資料の地形分類なし',
};
const reliefColors = ['#dfc895', '#d8b875', '#a88364', '#d4a58b', '#bf9477', '#d4c99c', '#c3d79e', '#a8cbb0', '#d1beac', '#bc99aa', '#c4d5bf', '#999d71', '#79aaab', '#96a985', '#9694b4'];
const lookup = (files, suffix) => [...files].find(([name]) => name.toLowerCase().endsWith(suffix))[1];

export async function prepareNature(inputDir) {
  await mkdir(sourceDir, {recursive: true}); await mkdir(publicDir, {recursive: true}); await mkdir(dirname(dataPath), {recursive: true});
  if (inputDir) for (const name of ['climate-2008.zip', 'relief-2001.zip', 'climate-2008-metadata.json', 'relief-2001-metadata.json']) await copyFile(resolve(inputDir, name), resolve(sourceDir, name));
  const climateBytes = await readFile(resolve(sourceDir, 'climate-2008.zip')), reliefBytes = await readFile(resolve(sourceDir, 'relief-2001.zip'));
  const climateZip = unzip(climateBytes), reliefOuter = unzip(reliefBytes), reliefZip = unzip(lookup(reliefOuter, '.zip'));
  const climateRecords = parseDbf(lookup(climateZip, '.dbf')), climateGeometry = parseShp(lookup(climateZip, '.shp'));
  const reliefRecords = parseDbf(lookup(reliefZip, '.dbf')), reliefGeometry = parseShp(lookup(reliefZip, '.shp'));
  if (climateRecords.length !== climateGeometry.length || reliefRecords.length !== reliefGeometry.length) throw new Error('SHP and DBF record counts disagree');
  const makeFeatures = (records, geometry, kind) => records.flatMap((record, index) => {
    if (kind === 'climate' ? ['Pais extranjero', 'Agua'].includes(ascii(record.TIPO_C)) : ['PAIS EXTRANJERO', 'CUERPO DE AGUA PERENNE'].includes(ascii(record.ENTIDAD))) return [];
    return [{id: `${kind}-${record.OBJECTID}`, classId: kind === 'climate' ? String(record.TIPO_N) : record.CLAVE, sourceCode: record.CLAVE, sourceLabel: kind === 'climate' ? record.TIPO_C : record.NOMBRE, status: record.ENTIDAD && ascii(record.ENTIDAD) === 'AREA SIN INFORMACION TEMATICA' ? 'missing' : 'valid', geometry: {type: 'Polygon', coordinates: geometry[index].map(ring => simplifyRing(ring))}, originalRingCount: geometry[index].length}];
  });
  const climateFeatures = makeFeatures(climateRecords, climateGeometry, 'climate'), reliefFeatures = makeFeatures(reliefRecords, reliefGeometry, 'relief');
  const climateOriginals = new Map(climateRecords.map((record, index) => [`climate-${record.OBJECTID}`, climateGeometry[index]]));
  const reliefOriginals = new Map(reliefRecords.map((record, index) => [`relief-${record.OBJECTID}`, reliefGeometry[index]]));
  const topology = {climate: validateNaturalTopology(climateFeatures, climateOriginals), relief: validateNaturalTopology(reliefFeatures, reliefOriginals)};
  const climateClasses = [...new Map(climateRecords.filter(r => !['Pais extranjero', 'Agua'].includes(ascii(r.TIPO_C))).map(r => [r.TIPO_N, {id: String(r.TIPO_N), labelJa: climateLabels[ascii(r.TIPO_C)], labelSource: r.TIPO_C, groupId: climateGroup(r.TIPO_C)}])).values()].sort((a, b) => Number(a.id) - Number(b.id));
  if (climateClasses.some(c => !c.labelJa)) throw new Error('An official climate class has no Japanese label');
  const reliefClasses = [...new Map(reliefRecords.filter(r => ['PROVINCIA', 'AREA SIN INFORMACION TEMATICA'].includes(ascii(r.ENTIDAD))).map(r => [r.CLAVE, {id: r.CLAVE, labelJa: reliefLabels[r.CLAVE], labelSource: r.NOMBRE, color: r.CLAVE === 'S/It' ? '#bfc3c7' : reliefColors[Object.keys(reliefLabels).indexOf(r.CLAVE)], status: ascii(r.ENTIDAD) === 'AREA SIN INFORMACION TEMATICA' ? 'missing' : 'valid'}])).values()];
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  for (const feature of [...climateFeatures, ...reliefFeatures]) for (const ring of feature.geometry.coordinates) for (const [x, y] of ring) {bounds[0] = Math.min(bounds[0], x); bounds[1] = Math.min(bounds[1], y); bounds[2] = Math.max(bounds[2], x); bounds[3] = Math.max(bounds[3], y);}
  const license = {name: 'Términos de Libre Uso de la Información del INEGI', url: 'https://www.inegi.org.mx/inegi/terminos.html', creditRequired: true, metadataPreserved: true, transformationsDisclosed: true};
  const climateSource = {agency: 'INEGI', product: 'Conjunto de datos vectoriales escala 1:1 000 000. Unidades climáticas', edition: 2008, observedPeriod: null, periodNote: '作図期の約4,000観測所の資料を使用。統一された観測対象期間は同梱説明に記載なし。2008は刊行年。', scale: 1000000, url: 'https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=702825267568', downloadUrl: 'https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/tematicas/CLIMAS/702825267568_s.zip', sha256: sha256(climateBytes), originalRecords: climateRecords.length, excludedRecords: climateRecords.length - climateFeatures.length, license, correction: {date: '2021-05-21', objectId: 551, classCode: 'BS0hw', featureCode: 22114, classLabel: 'Seco semicalido'}};
  const reliefSource = {agency: 'INEGI', product: 'Conjunto de datos vectoriales Fisiográficos. Continuo Nacional serie I. Provincias fisiográficas', edition: 2001, observedPeriod: null, periodNote: '2001版の自然地理地域区分。標高の観測値を示す資料ではない。', scale: 1000000, url: 'https://www.inegi.org.mx/app/biblioteca/ficha.html?upc=702825267575', downloadUrl: 'https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/tematicas/FISIOGRAFIA/702825267575_s.zip', sha256: sha256(reliefBytes), originalRecords: reliefRecords.length, excludedRecords: reliefRecords.length - reliefFeatures.length, license, individualUseConstraints: 'None', individualLicenseFile: 'metadatos/metadatos_cdv_1_1_000_000_provincias_fisiográficas.txt'};
  const data = {schemaVersion: 1, generatedAt: '2026-10-01', projection: {name: 'Lambert Conformal Conic', datum: 'ITRF92', ellipsoid: 'GRS80', semiMajorM: 6378137, inverseFlattening: 298.257222101, standardParallel1: 17.5, standardParallel2: 29.5, latitudeOfOrigin: 12, centralMeridian: -102, falseEastingM: 2500000, falseNorthingM: 0, units: 'm'}, processing: {simplificationToleranceM: 300, algorithm: 'Shared-arc original-vertex Douglas-Peucker; fixed graph junctions and canonical closed-ring anchors; adaptive smaller tolerance for new intersections, containment and orientation changes in the INEGI Lambert plane', coordinateRoundingM: 0, sourceRingsPreserved: true, topology, categoryAggregation: '原分類を保持し、画面の凡例だけ6気候群に集約。数量・面積・水収支の推計なし。', displayOnly: true}, bounds, climate: {source: climateSource, groups: climateGroups, classes: climateClasses, features: climateFeatures}, relief: {source: reliefSource, classes: reliefClasses, features: reliefFeatures}};
  const output = JSON.stringify(data);
  await writeFile(dataPath, output + '\n');
  const geometryMetadata = JSON.parse(await readFile(resolve(repo, 'src/data/atlas/mexico/geometry-index.json'), 'utf8')).metadata;
  const [minX, minY, maxX, maxY] = geometryMetadata.boundsNative;
  const scale = Math.min(844 / (maxX - minX), 524 / (maxY - minY));
  const left = (900 - (maxX - minX) * scale) / 2, top = (580 - (maxY - minY) * scale) / 2;
  const project = ([x, y]) => [left + (x - minX) * scale, top + (maxY - y) * scale];
  const path = feature => feature.geometry.coordinates.map(ring => ring.map((point, index) => {const [x, y] = project(point); return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('') + 'Z').join('');
  const assetManifest = [];
  for (const kind of ['climate', 'relief']) {
    const layer = data[kind], classes = new Map(layer.classes.map(item => [item.id, item]));
    const groups = new Map(climateGroups.map(item => [item.id, item]));
    const title = kind === 'climate' ? 'メキシコの気候区分・2008版（刊行年）' : 'メキシコの自然地理地域・2001版';
    const paths = layer.features.map(feature => {const category = classes.get(feature.classId); const color = kind === 'climate' ? groups.get(category.groupId).color : category.color; return `<path d="${path(feature)}" fill="${feature.status === 'missing' ? 'url(#missing)' : color}" stroke="${color}" stroke-width=".2" fill-rule="evenodd"/>`;}).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 580" role="img"><title>${title}</title><desc>Fuente: INEGI. 原典SHPから作成した全国分布。300 mの表示用簡略化。原分類・欠測区分は配信JSONと凡例に保持。</desc><defs><pattern id="missing" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#edf0ed"/><path d="M0 7L7 0" stroke="#919ba2" stroke-width="1"/></pattern></defs><rect width="900" height="580" fill="#eaf1ee"/>${paths}</svg>\n`;
    await writeFile(resolve(publicDir, `${kind}.svg`), svg);
    assetManifest.push({file: `${kind}.svg`, sha256: sha256(Buffer.from(svg)), viewBox: '0 0 900 580', boundsNative: geometryMetadata.boundsNative, role: 'Static fallback; same original thematic distribution as the interactive SVG'});
  }
  const manifest = {schemaVersion: 1, generatedAt: data.generatedAt, sources: [climateSource, reliefSource], projection: data.projection, processing: data.processing, geometryFile: 'nature-v1.json', geometrySha256: sha256(Buffer.from(output + '\n')), assets: assetManifest, counts: {climateClasses: climateClasses.length, climateFeatures: climateFeatures.length, reliefClasses: reliefClasses.length, reliefFeatures: reliefFeatures.length, reliefMissing: reliefFeatures.filter(f => f.status === 'missing').length}};
  await writeFile(resolve(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(resolve(publicDir, 'nature-v1.json'), output + '\n');
  for (const [name, bytes] of [...climateZip, ...reliefOuter]) if (/\.(txt|html?|csv)$/i.test(name)) {const outputName = name.replace(/^.*\//, '').replace(/[^a-zA-Z0-9_.-]/g, '_'); await writeFile(resolve(sourceDir, outputName), bytes);}
  console.log(JSON.stringify({output: dataPath, bytes: Buffer.byteLength(output), ...manifest.counts}));
  return data;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareNature(process.argv[2]);
