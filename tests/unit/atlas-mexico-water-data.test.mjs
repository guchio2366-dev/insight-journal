import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const base = process.env.MEXICO_VECTOR_DATA_DIR ?? fileURLToPath(new URL('../../public/assets/atlas/mexico-water-v1/', import.meta.url));
const read = name => readFileSync(resolve(base, name));
const manifest = JSON.parse(read('manifest.json'));
const data = Object.fromEntries(Object.entries(manifest.layers).map(([id, record]) => [id, JSON.parse(record.file.endsWith('.gz') ? gunzipSync(read(record.file)) : read(record.file))]));
const sha = raw => createHash('sha256').update(raw).digest('hex');
function points(coordinates, visit) {
  if (!coordinates.length) return;
  if (typeof coordinates[0] === 'number') visit(coordinates);
  else for (const child of coordinates) points(child, visit);
}

test('配信資産は原典メタデータのhash・件数と一致し、実座標を持つ', () => {
  for (const [id, record] of Object.entries(manifest.layers)) {
    const raw = read(record.file), vector = data[id];
    assert.equal(sha(raw), record.sha256, id);
    assert.equal(raw.length, record.bytes, id);
    if (record.decodedAsset) {
      const decoded = gunzipSync(raw);
      assert.equal(sha(decoded), record.decodedAsset.sha256);
      assert.equal(decoded.length, record.decodedAsset.bytes);
    }
    assert.equal(vector.type, 'FeatureCollection');
    assert.equal(vector.features.length, record.featureCount);
    assert.ok(vector.features.length > 0);
    assert.equal(new Set(vector.features.map(f => f.properties.id)).size, vector.features.length, id);
    for (const feature of vector.features) {
      assert.ok(['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(feature.geometry.type));
      points(feature.geometry.coordinates, ([lon, lat]) => {
        assert.ok(Number.isFinite(lon) && Number.isFinite(lat));
        assert.ok(lon > -120 && lon < -85 && lat > 13 && lat < 34, `${id}: axis order or coverage`);
      });
    }
  }
});

test('降水は原典の19等雨量値492線で、刊行年を観測期にしない', () => {
  const record = manifest.layers.precipitation, vector = data.precipitation;
  assert.equal(record.edition, 2006);
  assert.equal(record.observedPeriod, null);
  assert.equal(record.observationPeriodEvidence.reportedPeriod, '1921–1975');
  assert.equal(record.observationPeriodEvidence.printedPage, 15);
  assert.equal(record.observationPeriodEvidence.thisArchiveCorrespondence, 'unconfirmed');
  assert.equal(record.unit, 'mm/year');
  assert.equal(vector.features.length, 492);
  assert.deepEqual([...new Set(vector.features.map(f => f.properties.annualMm))].sort((a,b) => a-b),
    [100,200,300,400,500,600,700,800,1000,1100,1200,1300,1500,2000,2500,3000,3500,4000,4500]);
  assert.equal(record.originalRecordCount - record.excludedRecordCount, 492);
  assert.ok(vector.features.every(f => ['LineString', 'MultiLineString'].includes(f.geometry.type)));
});

test('国内流域は158原IDと正式分類を保持し、海外全流域とは区別する', () => {
  const record = manifest.layers.basins, vector = data.basins;
  assert.equal(vector.features.length, 158);
  assert.equal(record.originalRecordCount, 158);
  assert.equal(record.excludedRecordCount, 0);
  assert.equal(record.observedPeriod, null);
  assert.equal(record.edition, null);
  assert.match(record.coverage, /foreign upstream.*not provided/);
  assert.ok(vector.features.every(f => /^RH\d{2}[A-Z]$/.test(f.properties.sourceId) && f.properties.sourceName));
  const types = vector.features.reduce((acc, f) => {acc[f.properties.basinType] = (acc[f.properties.basinType] ?? 0) + 1; return acc;}, {});
  assert.deepEqual(types, {EXORREICA:143, ENDORREICA:15});
  assert.equal(record.displaySimplification.preserveTopology, true);
});

test('等高線は11実標高値の5490線で、版・基準面・表示間隔を区別する', () => {
  const record = manifest.layers.contours, vector = data.contours;
  assert.equal(record.edition, 2022);
  assert.equal(record.observedPeriod, null);
  assert.equal(record.unit, 'm');
  assert.equal(record.verticalDatum, 'EGM2008 geoid');
  assert.equal(record.displayIntervalM, 500);
  assert.equal(vector.features.length, 5490);
  assert.deepEqual([...new Set(vector.features.map(f => f.properties.elevationM))].sort((a,b) => a-b),
    [0,500,1000,1500,2000,2500,3000,3500,4000,4500,5000]);
  assert.ok(vector.features.every(f => f.geometry.type === 'LineString' && f.properties.unit === 'm'));
});

test('河川は小流域内次数を3分類にまとめ、全原セグメントとpartを保持する', {skip: !data.rivers}, () => {
  const record = manifest.layers.rivers, vector = data.rivers;
  assert.equal(vector.features.length, 3);
  assert.equal(record.originalRecordCount, 61350);
  assert.equal(record.observedPeriod, null);
  assert.equal(record.unit, 'subbasin Strahler order');
  assert.match(record.limitations.join(' '), /not a continuous national/);
  assert.deepEqual(vector.features.map(f => f.properties.sourceSegmentCount), [51277,9866,207]);
  const ids = vector.features.flatMap(f => f.properties.sourceIds);
  assert.equal(ids.length, 61350);
  assert.equal(new Set(ids).size, 61350);
  for (const feature of vector.features) {
    assert.equal(feature.geometry.type, 'MultiLineString');
    assert.equal(feature.geometry.coordinates.length, feature.properties.sourcePartCount);
    assert.ok(feature.geometry.coordinates.every(line => line.length >= 2));
    assert.match(feature.properties.name, /小流域内Strahler/);
    assert.equal(feature.properties.color, record.legend.find(key => key.id === feature.properties.id).color);
  }
});

test('地下水は法定帯水層を捏造せず、収量6区分と賦存可能性4区分を保つ', {skip: !data.groundwater}, () => {
  const record = manifest.layers.groundwater, vector = data.groundwater;
  assert.equal(vector.features.length, 10);
  assert.equal(record.originalRecordCount, 34551);
  assert.equal(record.selectedSourceRecordCount, 29479);
  assert.equal(record.excludedRecordCount, 5072);
  assert.equal(record.observedPeriod, null);
  assert.match(record.limitations.join(' '), /not CONAGUA's 653/);
  assert.equal(vector.features.filter(f => f.properties.measure === 'yield').length, 6);
  assert.equal(vector.features.filter(f => f.properties.measure === 'potential').length, 4);
  const expected = {'1A':143,'2M':948,'3B':1190,'4PM':1084,'5PB':10733,'6a':246,'7m':934,'8b':1391,'9pm':3645,'10pb':9165};
  assert.deepEqual(record.sourceClassCounts, expected);
  const ordinals = vector.features.flatMap(f => f.properties.sourceRecordOrdinals);
  assert.equal(ordinals.length, 29479);
  assert.equal(new Set(ordinals).size, 29479);
  let rings = 0;
  for (const feature of vector.features) {
    const props = feature.properties;
    assert.equal(feature.geometry.type, 'MultiPolygon');
    assert.equal(props.sourceMemberCount, expected[props.sourceClass]);
    assert.equal(props.sourceMemberCount, props.sourceRecordOrdinals.length);
    const key = record.legend.find(key => key.id === props.classId);
    assert.ok(key); assert.equal(key.color, props.color); assert.equal(key.fullLabel ?? key.label, props.nameJa);
    rings += feature.geometry.coordinates.reduce((n,polygon) => n + polygon.length, 0);
  }
  assert.equal(rings, record.sourceRingCount);
  assert.equal(record.sourceRingCount, 48769);
  const low = vector.features.find(f => f.properties.sourceClass === '10pb').properties.sourceDescriptionVariants;
  assert.equal(low['Material no consolidado con posibilidades bajas'], 9162);
  assert.equal(low[' Material no consolidado con posibilidades bajas'], 3);
});
