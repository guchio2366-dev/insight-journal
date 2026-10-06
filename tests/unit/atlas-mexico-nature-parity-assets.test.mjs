import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {unzip, parseDbf, parseShp} from '../../scripts/prepare-mexico-nature.mjs';
import {pinnedInputs, displayMapping, extractUsPalette, interiorAnchor, strictlyInside, nativeMapTransform, layoutParityLabels, displayBoxesOverlap, estimatedLabelWidth, leaderIntersectsBox} from '../../scripts/prepare-mexico-nature-parity-labels.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const assetDir = 'public/assets/atlas/mexico-nature-parity-v1/';
const [labels, palette, manifest, data, geometryBytes, publicBytes, usScript] = await Promise.all([
  json(`${assetDir}labels.json`), json(`${assetDir}palette.json`), json(`${assetDir}manifest.json`),
  json('src/data/atlas/mexico/nature-v1.json'), readFile('src/data/atlas/mexico/nature-v1.json'),
  readFile('public/assets/atlas/mexico-nature-v1/nature-v1.json'), readFile('scripts/refine-atlas-nature.py'),
]);
const original = {};
const suffix = (files, extension) => [...files].find(([name]) => name.toLowerCase().endsWith(extension))[1];
for (const view of ['climate', 'relief']) {
  const bytes = await readFile(`data-source/atlas/mexico/nature/${view === 'climate' ? 'climate-2008' : 'relief-2001'}.zip`);
  const outer = unzip(bytes), files = view === 'relief' ? unzip(suffix(outer, '.zip')) : outer;
  const rows = parseDbf(suffix(files, '.dbf')), geometry = parseShp(suffix(files, '.shp'));
  original[view] = {bytes, records: new Map(rows.map((row, index) => [`${view}-${row.OBJECTID}`, {row, rings: geometry[index]}]))};
}

// Separate ray-crossing check, supporting disjoint SHP outer parts and holes.
function independentContains(point, rings) {
  let crossings = 0;
  for (const ring of rings) for (let index = 0; index < ring.length - 1; index++) {
    const a = ring[index], b = ring[index + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    const cross = dx * (point[1] - a[1]) - dy * (point[0] - a[0]);
    if (Math.abs(cross) < 1e-6 && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])) return false;
    if ((a[1] <= point[1] && b[1] > point[1]) || (b[1] <= point[1] && a[1] > point[1])) {
      if (a[0] + (point[1] - a[1]) * dx / dy > point[0]) crossings++;
    }
  }
  return crossings % 2 === 1;
}

test('new display assets preserve the pinned official archives and both existing geometry copies byte-for-byte', () => {
  assert.equal(sha256(geometryBytes), pinnedInputs.geometry);
  assert.deepEqual(geometryBytes, publicBytes);
  for (const view of ['climate', 'relief']) assert.equal(sha256(original[view].bytes), pinnedInputs[view]);
  assert.equal(manifest.geometry.sha256, pinnedInputs.geometry);
  assert.equal(manifest.geometry.unchanged, true);
  assert.equal(manifest.processing.sourceGeometryMutation, false);
  assert.deepEqual(labels.projection, data.projection);
  assert.equal(labels.projection.units, 'm');
  assert.equal(labels.projection.datum, 'ITRF92');
});

test('exactly one official-class anchor covers each of 21 climates and 15 valid provinces; missing S/It is excluded', () => {
  assert.equal(labels.labels.length, 36);
  assert.equal(new Set(labels.labels.map(label => label.id)).size, 36);
  for (const view of ['climate', 'relief']) {
    const expected = data[view].classes.filter(category => category.status !== 'missing').map(category => category.id).sort();
    const actual = labels.labels.filter(label => label.view === view).map(label => label.classId).sort();
    assert.deepEqual(actual, expected);
  }
  assert.equal(labels.labels.some(label => label.classId === 'S/It'), false);
  assert.equal(manifest.counts.missingReliefLabels, 0);
});

test('all 36 native anchors are strictly inside the exact identified original feature and display feature, outside holes', () => {
  for (const label of labels.labels) {
    assert.equal(label.pointNative.length, 2);
    assert.ok(label.pointNative.every(Number.isFinite));
    assert.ok(label.pointNative[0] > 500000, 'native meters are not longitude');
    const category = data[label.view].classes.find(category => category.id === label.classId);
    const feature = data[label.view].features.find(feature => feature.id === label.sourceFeatureId);
    const record = original[label.view].records.get(label.sourceFeatureId);
    assert.ok(feature && record, label.id);
    assert.equal(feature.classId, label.classId);
    assert.equal(label.sourceCode, record.row.CLAVE);
    assert.equal(label.labelJa, category.labelJa);
    assert.equal(label.labelSource, category.labelSource);
    assert.equal(feature.sourceLabel, label.labelSource);
    assert.equal(feature.status, 'valid');
    assert.ok(independentContains(label.pointNative, feature.geometry.coordinates), `${label.id} display containment`);
    assert.ok(independentContains(label.pointNative, record.rings), `${label.id} original containment`);
    assert.ok(strictlyInside(label.pointNative, feature.geometry.coordinates));
    assert.ok(strictlyInside(label.pointNative, record.rings));
    assert.ok(label.clearanceM > 0.01);
    assert.equal(label.source.archiveSha256, pinnedInputs[label.view]);
    assert.equal(label.source.geometrySha256, pinnedInputs.geometry);
    assert.equal(label.source.url, data[label.view].source.url);
  }
});

test('anchor preparation excludes holes, boundaries and outside coordinates, including disjoint original outer rings', () => {
  const square = [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]];
  const hole = [[5, 5], [5, 15], [15, 15], [15, 5], [5, 5]];
  const separateOuter = [[30, 0], [40, 0], [40, 10], [30, 10], [30, 0]];
  const rings = [square, hole, separateOuter];
  for (const point of [[10, 10], [0, 0], [5, 10], [25, 5], [-1, 5]]) assert.equal(strictlyInside(point, rings), false);
  for (const point of [[2, 2], [35, 5]]) assert.equal(strictlyInside(point, rings), true);
  const anchor = interiorAnchor(rings, rings);
  assert.ok(independentContains(anchor.pointNative, rings));
  assert.ok(anchor.clearanceM > 0);
});

test('every original modified Köppen code uses an exact existing US hue with an explicit display-only mapping', () => {
  const hues = extractUsPalette(usScript.toString('utf8'));
  const codes = [...new Set(data.climate.features.map(feature => feature.sourceCode))].sort();
  assert.equal(codes.length, 111);
  assert.deepEqual(Object.keys(palette.climate.bySourceCode).sort(), codes);
  for (const code of codes) {
    const entry = palette.climate.bySourceCode[code];
    assert.equal(entry.equivalence, 'display-hue-only');
    assert.equal(entry.color, hues[entry.colorReferenceCode]);
    assert.equal(entry.featureCount, data.climate.features.filter(feature => feature.sourceCode === code).length);
    assert.ok(entry.mappingBasis.length > 20);
    assert.equal(Object.hasOwn(entry, 'koppenCode'), false);
  }
  assert.equal(palette.reference.sha256, sha256(usScript));
  assert.equal(palette.classification, 'INEGI / García modified Köppen');
  assert.equal(palette.equivalence, 'display-hue-only');
});

test('transitions and highlands stay separate; humidity modifiers are not mistaken for class symbols', () => {
  for (const [code, key] of [['A(C)m(w)', 'a-c-humid'], ['A(C)w1(w)', 'a-c-subhumid'], ['(A)C(m)(w)', 'c-a-humid'], ['(A)C(w0)(w)', 'c-a-subhumid'], ['C(E)(m)(w)', 'c-e-humid'], ['C(E)(w1)(w)', 'c-e-subhumid'], ['E(T)H', 'e-th-highland']]) {
    assert.equal(displayMapping(code).displayKey, key);
    assert.equal(palette.climate.bySourceCode[code].displayKey, key);
  }
  for (const code of ['C(E)(m)(w)', 'C(E)(w1)(w)']) assert.ok(!palette.climate.bySourceCode[code].colorReferenceCode.startsWith('D'));
  assert.throws(() => displayMapping('Dfb'), /No justified/);
  assert.throws(() => displayMapping('invented'), /No justified/);
});

test('original class definitions and the documented climate-551 inconsistency survive palette preparation', () => {
  assert.deepEqual(palette.climate.classes.map(({sourceCodes, colors, ...category}) => category), data.climate.classes);
  assert.deepEqual(palette.relief.classes, data.relief.classes);
  for (const category of palette.climate.classes) {
    const features = data.climate.features.filter(feature => feature.classId === category.id);
    assert.deepEqual(category.sourceCodes, [...new Set(features.map(feature => feature.sourceCode))].sort());
    assert.deepEqual(category.colors, [...new Set(category.sourceCodes.map(code => palette.climate.bySourceCode[code].color))]);
  }
  const corrected = data.climate.features.find(feature => feature.id === 'climate-551');
  assert.equal(corrected.classId, '32'); assert.equal(corrected.sourceCode, 'BS0hw'); assert.equal(corrected.sourceLabel, 'Seco semicálido');
  assert.ok(palette.climate.classes.find(category => category.id === '32').colors.length > 1);
  assert.ok(manifest.notes.some(note => note.includes('climate-551')));
  assert.ok(manifest.notes.some(note => note.includes('No conversion to Beck 30')));
});

test('manifest hashes independently verify the label bundle, palette, source metadata and license provenance', async () => {
  for (const asset of manifest.assets) {
    const bytes = await readFile(`${assetDir}${asset.file}`);
    assert.equal(sha256(bytes), asset.sha256); assert.equal(bytes.length, asset.bytes);
  }
  assert.equal(sha256(await readFile(manifest.semanticEvidence.file)), manifest.semanticEvidence.sha256);
  for (const source of manifest.sources) {
    assert.equal(source.agency, 'INEGI');
    assert.equal(source.observedPeriod, null);
    assert.equal(source.license.url, 'https://www.inegi.org.mx/inegi/terminos.html');
    assert.equal(source.license.creditRequired, true);
    assert.equal(source.license.transformationsDisclosed, true);
  }
});

test('all 36 derived text boxes fit the 591 by 381 map without label, station or control collisions', async () => {
  const index = await json('src/data/atlas/mexico/geometry-index.json'), transform = nativeMapTransform(index.metadata.boundsNative);
  assert.deepEqual(labels.labelLayout.intendedViewportPx, [591, 381]);
  assert.equal(labels.labelLayout.minimumSupportedWidthPx, 591);
  const field = labels.labelLayout.boundsMap;
  for (const view of ['climate', 'relief']) {
    const entries = labels.labels.filter(label => label.view === view);
    const obstacles = [labels.labelLayout.controlObstacleMap, ...(view === 'climate' ? labels.labelLayout.climateStationObstaclesMap : [])];
    for (const label of entries) {
      const box = label.displayBoxMap, center = transform.project(label.displayPointNative);
      assert.ok(box.left >= field.left && box.right <= field.right && box.top >= field.top && box.bottom <= field.bottom, label.id);
      assert.ok(Math.abs(center[0] - (box.left + box.right) / 2) < 1e-8);
      assert.ok(Math.abs(center[1] - (box.top + box.bottom) / 2) < 1e-8);
      const text = view === 'climate' ? label.sourceCode : label.labelJa;
      assert.ok(box.right - box.left >= estimatedLabelWidth(text, view === 'climate' ? 18 : 17) - 1e-8);
      for (const other of entries) if (other !== label) assert.equal(displayBoxesOverlap(box, other.displayBoxMap), false, `${label.id} overlaps ${other.id}`);
      for (const obstacle of obstacles) assert.equal(displayBoxesOverlap(box, obstacle), false, `${label.id} covers a city or control`);
      const anchor = transform.project(label.pointNative), end = transform.project(label.leaderEndNative);
      for (const other of entries) if (other !== label) {
        assert.equal(leaderIntersectsBox(anchor, end, other.displayBoxMap), false, `${label.id} leader crosses ${other.id} text`);
        const otherAnchor = transform.project(other.pointNative);
        assert.equal(displayBoxesOverlap(box, {left: otherAnchor[0] - 6, right: otherAnchor[0] + 6, top: otherAnchor[1] - 6, bottom: otherAnchor[1] + 6}), false, `${label.id} covers ${other.id} source point`);
      }
      for (const obstacle of obstacles) if (!(anchor[0] >= obstacle.left && anchor[0] <= obstacle.right && anchor[1] >= obstacle.top && anchor[1] <= obstacle.bottom)) assert.equal(leaderIntersectsBox(anchor, end, obstacle), false, `${label.id} leader crosses station or control`);
      assert.ok(Math.abs(end[0] - Math.max(box.left, Math.min(box.right, anchor[0]))) < 1e-8);
      assert.ok(Math.abs(end[1] - Math.max(box.top, Math.min(box.bottom, anchor[1]))) < 1e-8);
      assert.equal(label.displayDisplaced, Math.hypot(center[0] - anchor[0], center[1] - anchor[1]) > .01);
    }
  }
  assert.ok(labels.labels.some(label => label.displayDisplaced), 'crowding must be resolved by derived positions');
  assert.equal(sha256(await readFile(labels.labelLayout.stationCoordinateSource.file)), labels.labelLayout.stationCoordinateSource.sha256);
  assert.equal(sha256(await readFile(labels.labelLayout.frameSource.file)), labels.labelLayout.frameSource.sha256);
});

test('layout regeneration is deterministic and changes no source anchor, class, provenance, code or membership', async () => {
  const index = await json('src/data/atlas/mexico/geometry-index.json'), stations = await json('src/data/atlas/mexico/climate-normals.json');
  const copy = structuredClone(labels.labels), source = label => ({id: label.id, view: label.view, classId: label.classId, sourceCode: label.sourceCode, labelJa: label.labelJa, labelSource: label.labelSource, pointNative: label.pointNative, sourceFeatureId: label.sourceFeatureId, source: label.source});
  const before = copy.map(source);
  layoutParityLabels(copy, nativeMapTransform(index.metadata.boundsNative), stations.stations);
  assert.deepEqual(copy.map(source), before);
  assert.deepEqual(copy, labels.labels);
  assert.equal(copy.length, 36);
});
