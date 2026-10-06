// Recalculate station climate classifications from retained official data; no downloads.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// Run from the repository root, or pass that root explicitly. All evidence paths
// stored in the audit are relative to it. An optional second argument sets the output path.
const repo = resolve(process.argv[2] ?? process.cwd());
const {unzip, parseDbf, parseShp} = await import(pathToFileURL(resolve(repo, 'scripts/prepare-mexico-nature.mjs')));
const {lambertForward, lambertInverse, mexicoProjection} = await import(pathToFileURL(resolve(repo, 'src/lib/atlas-mexico-projection.mjs')));
const digest = data => createHash('sha256').update(data).digest('hex');
const archivePath = 'data-source/atlas/mexico/nature/climate-2008.zip';
const stationPath = 'src/data/atlas/mexico/climate-normals.json';
const displayPath = 'src/data/atlas/mexico/nature-v1.json';
const [archive, stationBytes, displayBytes, indexBytes] = await Promise.all([archivePath, stationPath, displayPath, 'src/data/atlas/mexico/geometry-index.json'].map(name => readFile(resolve(repo, name))));
const files = unzip(archive), lookup = suffix => [...files].find(([name]) => name.toLowerCase().endsWith(suffix));
const dbf = lookup('.dbf'), shp = lookup('.shp'), prj = lookup('.prj');
const records = parseDbf(dbf[1]), shapes = parseShp(shp[1]);
const stations = JSON.parse(stationBytes), display = JSON.parse(displayBytes), index = JSON.parse(indexBytes);
if (digest(archive) !== '9678ed5307ec9ba9adeb958926a78226165017363f23761135ade400d53b896f' || digest(archive) !== display.climate.source.sha256 || records.length !== shapes.length) throw new Error('Source identity mismatch');
const [minX, minY, maxX, maxY] = index.metadata.boundsNative;
const scale = Math.min(844 / (maxX - minX), 524 / (maxY - minY));
const left = (900 - (maxX - minX) * scale) / 2, top = (580 - (maxY - minY) * scale) / 2;
const projectNative = ([x, y]) => [left + (x - minX) * scale, top + (maxY - y) * scale];
function locate(point, rings) {
  let inside = false, minimum = Infinity, nearest = null;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
    const ring = rings[ringIndex];
    for (let segment = 0; segment < ring.length - 1; segment++) {
      const a = ring[segment], b = ring[segment + 1], dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
      const fraction = length ? Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length)) : 0;
      const foot = [a[0] + fraction * dx, a[1] + fraction * dy], distance = Math.hypot(point[0] - foot[0], point[1] - foot[1]);
      if (distance < minimum) {minimum = distance; nearest = {ringIndex0: ringIndex, segmentIndex0: segment, nativePoint: foot, lonLat: lambertInverse(foot)};}
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < a[0] + (point[1] - a[1]) * dx / dy) inside = !inside;
    }
  }
  return {strictlyInside: inside && minimum > 1e-7, onBoundary: minimum <= 1e-7, boundaryToleranceM: 1e-7, boundaryDistanceNativeM: minimum, nearest};
}
const summarize = row => ({featureId: `climate-${row.OBJECTID}`, objectId: row.OBJECTID, classId: String(row.TIPO_N), sourceCode: row.CLAVE, sourceLabel: row.TIPO_C});
const results = [];
for (const station of stations.stations) {
  const native = lambertForward(station.coordinates), matches = [], distances = [];
  for (let i = 0; i < records.length; i++) {
    const found = locate(native, shapes[i]), entry = {...summarize(records[i]), recordIndex0: i, ...found};
    distances.push(entry); if (found.strictlyInside || found.onBoundary) matches.push(entry);
  }
  if (matches.length !== 1 || !matches[0].strictlyInside) throw new Error(`Nonunique or boundary match: ${station.id}`);
  const original = matches[0], category = display.climate.classes.find(item => item.id === original.classId);
  const rendered = display.climate.features.flatMap(feature => {
    const found = locate(native, feature.geometry.coordinates);
    return found.strictlyInside ? [{featureId: feature.id, classId: feature.classId, sourceCode: feature.sourceCode, sourceLabel: feature.sourceLabel, ...found}] : [];
  });
  const sourceText = await readFile(resolve(repo, station.selectedSourceFile), 'utf8');
  if (digest(Buffer.from(sourceText)) !== station.selectedSourceSha256) throw new Error('Selected station source hash mismatch');
  const coordinateStrings = ['LONGITUD', 'LATITUD'].map(key => sourceText.match(new RegExp(key + '\\s*:\\s*([-\\d.]+)'))[1]);
  if (coordinateStrings.some((value, i) => Number(value) !== station.coordinates[i])) throw new Error('Station coordinate differs from original selected text');
  const halfLastDigits = coordinateStrings.map(value => 0.5 * 10 ** -(value.split('.')[1]?.length ?? 0));
  const roundingCorners = [-1, 1].flatMap(x => [-1, 1].map(y => {
    const lonLat = [station.coordinates[0] + x * halfLastDigits[0], station.coordinates[1] + y * halfLastDigits[1]], projected = lambertForward(lonLat);
    return {lonLat, displacementNativeM: Math.hypot(projected[0] - native[0], projected[1] - native[1]), strictlyInsideOriginal: locate(projected, shapes[original.recordIndex0]).strictlyInside};
  }));
  const roundedChecks = [4, 5, 6].map(digits => {
    const lonLat = station.coordinates.map(value => Number(value.toFixed(digits))), projected = lambertForward(lonLat);
    return {digits, lonLat, displacementNativeM: Math.hypot(projected[0] - native[0], projected[1] - native[1]), strictlyInsideOriginal: locate(projected, shapes[original.recordIndex0]).strictlyInside};
  });
  distances.sort((a, b) => a.boundaryDistanceNativeM - b.boundaryDistanceNativeM);
  results.push({
    stationId: station.id, officialStationId: station.stationId, nameJa: station.name,
    coordinatesLonLat: station.coordinates, coordinatesSourceStrings: coordinateStrings,
    coordinateSourceFile: station.selectedSourceFile, coordinateSourceSha256: digest(Buffer.from(sourceText)),
    pointNativeM: native, pointDisplaySvg: projectNative(native), original,
    labelJa: category.labelJa, sourceClassLabel: category.labelSource,
    displayGeometryMatches: rendered,
    nearestDifferentSourceCode: distances.find(item => item.sourceCode !== original.sourceCode),
    nearestDifferentOriginalClass: distances.find(item => item.classId !== original.classId),
    displayedDecimalRounding: {assumption: 'half a last printed decimal unit; this is a rounding sensitivity check, not a claim of station positional accuracy', maxCornerDisplacementNativeM: Math.max(...roundingCorners.map(item => item.displacementNativeM)), corners: roundingCorners, roundedCoordinateChecks: roundedChecks},
    stationPeriod: station.period, classificationEdition: display.climate.source.edition,
    classificationObservationPeriod: display.climate.source.observedPeriod,
    suggestedHeadingJa: `観測所所在地の気候区分：${category.labelJa}〔${original.sourceCode}〕`,
  });
}
const audit = {
  method: 'Original unmodified SHP rings and matching DBF rows; station lon/lat projected by existing lambertForward; independent even-odd ray crossing across all 1695 records with explicit boundary exclusion; shortest Euclidean point-to-segment distance in native Lambert metres.',
  projection: mexicoProjection, sourceProjectionWkt: prj[1].toString(),
  svgPlacement: 'The same projectNative formula as src/lib/atlas-mexico-geometry.ts; point-in-polygon uses native metres, not rounded SVG path strings.',
  source: {archivePath, archiveBytes: archive.length, archiveSha256: digest(archive), members: [dbf, shp, prj].map(([name, bytes]) => ({name, bytes: bytes.length, sha256: digest(bytes)})), records: records.length, sourceUrl: display.climate.source.url, scale: display.climate.source.scale, classification: 'Köppen modified by E. García with INEGI contributions; not Beck or an unmodified US Köppen classification'},
  inputs: [{file: stationPath, sha256: digest(stationBytes)}, {file: displayPath, sha256: digest(displayBytes)}, {file: 'src/data/atlas/mexico/geometry-index.json', sha256: digest(indexBytes)}],
  results,
  limitationsJa: [
    '分類は都市全域の面積最大分類ではなく、SMN観測所座標を原分類図へ重ねた所在地の分類です。',
    '2008はINEGI図の刊行年で、統一観測対象期間は不明です。1991–2020のSMN月別値から再分類していません。',
    'SHPはITRF92/GRS80のLambert投影です。保存されたSMN座標資料には測地基準・座標時点・位置精度の明示がなく、時点付き測地変換は適用していません。',
    '1:1,000,000の原図はアナログ資料を数値化した分類です。表示小数桁と計算距離は測量精度を意味しません。原資料に定量的位置誤差がないため、その影響量は断定しません。',
    '原コードの細分類記号を分解した閾値の説明や、BS1と米国BShの同値変換は行いません。',
  ],
};
const out = pathToFileURL(resolve(process.argv[3] ?? resolve(repo, 'data-source/atlas/mexico/climate-normals/classification-audit.json')));
await writeFile(out, JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify({file: out.pathname, stations: results.map(item => ({id: item.stationId, classification: item.original.sourceCode, labelJa: item.labelJa, featureId: item.original.featureId, boundaryM: item.original.boundaryDistanceNativeM, nearestDifferentClassM: item.nearestDifferentOriginalClass.boundaryDistanceNativeM, roundingDisplacementM: item.displayedDecimalRounding.maxCornerDisplacementNativeM, round4decimal: item.displayedDecimalRounding.roundedCoordinateChecks[0]}))}, null, 2));
