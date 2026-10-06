import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';

const directory = 'public/assets/atlas/canada-water-v1/';
const data = JSON.parse(await readFile('src/data/atlas/canada/water-resources.json', 'utf8'));
const manifest = JSON.parse(await readFile(directory + 'manifest.json', 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const geometrySha = collection => sha(Buffer.from(JSON.stringify(collection.features.map(feature => feature.geometry))));
const collection = async file => JSON.parse(await readFile(directory + file, 'utf8'));

test('Water config keeps geometry external, units and licence provenance explicit, and geographic scopes distinct', () => {
  assert.deepEqual(Object.keys(data.datasets), ['precipitation', 'drainage', 'groundwater', 'aquifers']);
  assert.deepEqual(data.projection.bounds, [-145, 40, -50, 85]);
  assert.equal(data.projection.width, 900); assert.equal(data.projection.height, 580);
  for (const dataset of Object.values(data.datasets)) {
    assert.ok(dataset.title && dataset.scope && dataset.reading && dataset.method);
    assert.ok(dataset.groups.every(group => group.id && group.name && group.sourceName && /^#[a-f\d]{6}$/i.test(group.color)));
    for (const source of dataset.sources) {
      assert.match(source.url, /^https:\/\//); assert.match(source.licence, /Open Government Licence|HydroSHEDS Licence/);
      assert.match(source.licenceUrl, /^https:\/\//); assert.match(source.accessed, /^2026-10-0[25]$/);
      assert.ok(source.publisher && source.year && source.attribution);
    }
    assert.equal('features' in dataset, false);
  }
  assert.equal(data.datasets.precipitation.units, 'mm/year');
  assert.equal(data.datasets.precipitation.clipToCanada, true);
  assert.deepEqual(data.datasets.precipitation.imageBounds, data.projection.bounds);
  assert.match(data.datasets.drainage.method, /MAIN_BAS・NEXT_DOWN/);assert.doesNotMatch(data.datasets.drainage.geometryUrl,/drainage-regions/);
  assert.match(data.datasets.aquifers.reading, /空白は地下水が存在しない/);
  assert.match(data.datasets.groundwater.note, /利用可能量は示しません/);
  assert.match(manifest.excluded.reason, /No explicit blanket reuse licence verified/);
});

test('Public source evidence and map assets retain SHA-256 integrity; compressed geometry is byte-identical', async () => {
  for (const asset of manifest.assets) {
    const bytes = await readFile(directory + asset.file);
    assert.equal(bytes.length, asset.bytes, asset.file);
    assert.equal(sha(bytes), asset.sha256, asset.file);
    if (asset.file.endsWith('.geojson.gz')) assert.deepEqual(gunzipSync(bytes), await readFile(directory + asset.file.slice(0, -3)));
  }
  assert.equal(manifest.drainage.sourceArchive.sha256, 'a1648eb2d9e2cf03e410b2acffa4c968e8cfaedc3fffb0aa5fed706c791043ac');
  assert.equal(manifest.groundwater.sourceArchive.sha256, '14c1907da61e55c8e3ce0f55093ccbd18de72f6476ca06b12dc6f9e883e39b24');
  assert.equal(manifest.sourceIntermediates.some(record => /raw-1991-2020.*\.bin$/.test(record.file)), false);
});

test('BC public licence URLs use the verified readable canonical page while original response evidence remains private', async () => {
  const canonical = 'https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc';
  assert.equal(data.datasets.aquifers.sources[0].licenceUrl, canonical);
  assert.equal(manifest.aquifers.source.licence_url, canonical);
  const provenance = await collection('groundwater-source-provenance.json');
  assert.equal(provenance.adopted_layers[1].licence_url, canonical);
  const proof = await collection('bc-licence-url-verification.json');
  assert.equal(proof.status, 200); assert.equal(proof.sameContentAsOriginalLicence, true);
  assert.equal(proof.finalUrl, canonical); assert.equal(proof.responseBytes, 145001);
  assert.equal(proof.responseSha256, 'b913baf2b66ae7ea155937237ad608905ed6329dd3d7a38af3b60b1aae6a5a17');
  assert.equal(proof.title, 'Open Government Licence - British Columbia - Province of British Columbia');
  for (const file of ['src/data/atlas/canada/water-resources.json', directory + 'manifest.json', directory + 'groundwater-source-provenance.json', 'scripts/prepare-canada-water-resources.mjs']) {
    assert.doesNotMatch(await readFile(file, 'utf8'), /gov\/content\?id=[a-f\d]{32}/i, file);
  }
});

test('Precipitation derives from all 360 source months, keeps the land mask, and exposes seven US-aligned categorical rasters', async () => {
  const ranges = JSON.parse(await readFile(directory + 'precipitation-range-manifest.json', 'utf8'));
  assert.deepEqual(ranges.map(range => range.year), Array.from({length: 30}, (_, index) => 1991 + index));
  assert.equal(ranges.reduce((sum, range) => sum + range.bytes, 0), 840587040);
  for (let index = 0; index < ranges.length; index++) {
    assert.equal(ranges[index].timeValues.length, 12); assert.match(ranges[index].sha256, /^[a-f\d]{64}$/);
    assert.equal(ranges[index].rangeEnd - ranges[index].rangeStart + 1, ranges[index].bytes);
    if (index) assert.equal(ranges[index - 1].rangeEnd + 1, ranges[index].rangeStart);
  }
  assert.equal(manifest.precipitation.summary.annualValidLandCells, 100945);
  assert.equal(manifest.precipitation.summary.annualMissingLandCells, 0);
  assert.equal(manifest.precipitation.summary.allNonLandCellsMasked, true);
  assert.equal(data.datasets.precipitation.groups.reduce((s,g)=>s+g.sourceCellCount,0),100945);assert.equal(data.datasets.precipitation.groups.length,7);
  const rows = gunzipSync(await readFile(directory + 'annual-valid-grid-points.csv.gz')).toString('utf8').trim().split(/\r?\n/);
  assert.equal(rows.shift(), 'grid_index_xmajor,longitude,latitude,annual_precipitation_mm,grid_area_km2');
  assert.equal(rows.length, 100945);
  const ids = new Set();
  for (const line of rows) {
    const [index, lon, lat, mm, area] = line.split(',').map(Number);
    assert.ok(Number.isInteger(index) && index >= 0 && index < 291870);
    assert.ok(lon >= -145 && lon <= -50 && lat >= 40 && lat <= 85 && mm >= 136.9 && mm <= 3986.4 && area > 0);
    ids.add(index);
  }
  assert.equal(ids.size, 100945);
  const union = new Uint8Array(1900 * 900);
  for (const image of data.datasets.precipitation.images) {
    const group = data.datasets.precipitation.groups.find(group => group.id === image.id);
    const color = group.color.slice(1).match(/../g).map(hex => Number.parseInt(hex, 16));
    const {data: pixels, info} = await sharp('public' + image.url).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    assert.equal(info.width, 1900); assert.equal(info.height, 900);
    let opaque = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      assert.ok(pixels[index + 3] === 0 || pixels[index + 3] === 255);
      if (!pixels[index + 3]) continue;
      assert.equal(pixels[index], color[0]); assert.equal(pixels[index + 1], color[1]); assert.equal(pixels[index + 2], color[2]);
      union[index / 4] = 1; opaque++;
    }
    assert.ok(opaque > 0 && opaque < union.length);
  }
  const all = await sharp('public' + data.datasets.precipitation.imageUrl).ensureAlpha().raw().toBuffer();
  for (let index = 0; index < union.length; index++) assert.equal(all[index * 4 + 3] > 0, Boolean(union[index]));
  assert.ok(manifest.precipitation.rendering.resampling.includes('no interpolated or fabricated'));
});

test('Archived statistical drainage data remains intact, but is no longer the displayed river catchments', async () => {
  const regions = await collection('drainage-regions.geojson');
  assert.equal(regions.features.length, 25);
  assert.equal(geometrySha(regions), '3217d067cf66c7cb5acbcc1385cd4d1bb1115a4b54d26510198fedee2362f9d3');
  const source = JSON.parse(await readFile(directory + 'drainage-source-regions.json', 'utf8'));
  for (const feature of regions.features) {
    const properties = feature.properties, original = source.find(region => region.id.padStart(2, '0') === properties.id);
    assert.ok(original);assert.notEqual(data.datasets.drainage.geometryUrl,'/assets/atlas/canada-water-v1/drainage-regions.geojson');
    assert.equal(properties.name, original.name); assert.equal(properties.sourceName, original.name);
    assert.equal(properties.oceanAreaId, original.oceanAreaId); assert.ok(original.oceanAreaName);
    assert.equal(properties.areaType, 'statisticalDrainageRegion');
    const id = Number(properties.id), expectedOcean = id <= 5 ? '1' : id <= 8 ? '2' : id === 9 ? '3' : id <= 18 ? '4' : '5';
    assert.equal(properties.oceanAreaId, expectedOcean);
  }
  assert.equal(manifest.drainage.validation.allValid, true); assert.equal(manifest.drainage.validation.coverageValid, true);
  assert.equal(manifest.drainage.validation.polygons, 26825); assert.equal(manifest.drainage.validation.holes, 5);
  assert.equal(manifest.drainage.validation.allComponentsAndHolesRetained, true);
});

test('National groundwater preserves original coordinates and source IDs, including all seven invalid outline-only parts', async () => {
  const regions = await collection('hydrogeological-regions.geojson');
  assert.equal(regions.features.length, 1176);
  assert.equal(geometrySha(regions), '5ad5fab08a33c9495cdb63be69126a66c80056c55ed9a3b607e5c437be928589');
  assert.equal(geometrySha(regions), manifest.groundwater.originalGeometrySha256);
  const invalid = regions.features.filter(feature => feature.properties.fillExcluded);
  assert.deepEqual(invalid.map(feature => feature.properties.sourcePartIndex), [45, 65, 97, 112, 150, 237, 441]);
  for (const feature of regions.features) {
    const properties = feature.properties, group = data.datasets.groundwater.groups.find(group => group.id === properties.group);
    assert.ok(group); assert.equal(properties.PRIMARY_, group.sourceName); assert.equal(properties.name, group.sourceName);
    assert.ok(Number.isFinite(properties.AQUIFER_DI) && Number.isFinite(properties.AQUIFER__1));
    assert.equal(properties.validity === 'source-invalid', properties.fillExcluded);
    if (properties.fillExcluded) {assert.equal(properties.validityNotice, '原資料の形状不整合で塗り表示を除外'); assert.match(properties.validityReason, /Self-intersection/);}
  }
  for (const group of data.datasets.groundwater.groups) assert.equal(regions.features.filter(feature => feature.properties.group === group.id).length, group.sourceFeatureCount);
  assert.equal(manifest.groundwater.topology.original.invalid_geometry_count, 7);
  assert.equal(manifest.groundwater.topology.unchanged_geometry_wkb_count, 1176);
  assert.equal(manifest.groundwater.noGeometryRepair, true);
  const diagnostic = await collection('groundwater-invalid-regions-impact.json');
  assert.equal(diagnostic.invalid_count, 7);
  assert.deepEqual(diagnostic.records.map(record => record.original_index), [45, 65, 97, 112, 150, 237, 441]);
  assert.ok(diagnostic.records.every(record => record.proper_crossing_pair_count > 0));
  assert.match(manifest.groundwater.invalidPartDiagnostic.interpretation, /not an area or groundwater quantity/);
});

test('BC example retains 149 individually addressable mapped aquifers, source names and years, and two material classes', async () => {
  const aquifers = await collection('bc-fraser-aquifers.geojson');
  assert.equal(aquifers.features.length, 149);
  assert.equal(geometrySha(aquifers), 'd0571d57e6d386b6d0cfe6325f503c9df55836feaf48cceddd481f0605ac681c');
  assert.equal(geometrySha(aquifers), manifest.aquifers.originalGeometrySha256);
  assert.equal(new Set(data.datasets.aquifers.areas.map(area => area.id)).size, 149);
  let missingNames = 0;
  for (const feature of aquifers.features) {
    const properties = feature.properties, area = data.datasets.aquifers.areas.find(area => area.id === properties.id);
    assert.ok(area); assert.equal(properties.id, String(properties.AQUIFER_ID)); assert.equal(area.group, properties.group);
    assert.equal(properties.name, properties.NAME || properties.LOCATION); assert.equal(properties.sourceName, properties.NAME);
    assert.ok(properties.MAPPING_YEAR >= 1993 && properties.MAPPING_YEAR <= 2025);
    assert.match(properties.sourceFeatureId, /^WHSE_WATER_MANAGEMENT\./);
    assert.equal(properties.fillExcluded, false); assert.equal(properties.validity, 'valid');
    if (!properties.NAME) missingNames++;
  }
  assert.equal(missingNames, 58);
  assert.equal(aquifers.features.filter(feature => feature.properties.group === 'sand-gravel').length, 117);
  assert.equal(aquifers.features.filter(feature => feature.properties.group === 'bedrock').length, 32);
  assert.deepEqual(data.datasets.aquifers.queryBbox, [-123.4, 48.85, -121.6, 49.5]);
  assert.equal(manifest.aquifers.topology.original.invalid_geometry_count, 0);
  assert.equal(manifest.aquifers.topology.unchanged_geometry_wkb_count, 149);
});
