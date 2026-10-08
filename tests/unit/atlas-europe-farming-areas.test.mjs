import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const root = new URL('../../', import.meta.url);
const bytes = path => readFileSync(new URL(path, root));
const json = path => JSON.parse(bytes(path).toString('utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
const manifest = json('public/assets/atlas/europe/farming-overview-v2/manifest.json');
const collection = json('src/data/atlas/europe/farming-areas.json');
const cropConfig = json('src/data/atlas/europe/crop-overview.json').crops;
const countries = json('src/data/atlas/europe-countries.json').features.filter(feature => feature.properties.kind === 'europe');
const polygons = geometry => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
const box = ring => ring.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);

function ringContains(ring, [x, y], tolerance = 0) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[j], [bx, by] = ring[i];
    const dx = bx - ax, dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const position = lengthSquared ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared)) : 0;
    if (Math.hypot(x - ax - position * dx, y - ay - position * dy) <= tolerance) return true;
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

function polygonContains(polygon, point, tolerance = 0) {
  return ringContains(polygon[0], point, tolerance) && !polygon.slice(1).some(ring => ringContains(ring, point));
}

const targetPolygons = countries.flatMap(country => polygons(country.geometry)).map(polygon => ({ polygon, bounds: box(polygon[0]) }));
function targetLandContains([x, y]) {
  const tolerance = .000002;
  return targetPolygons.some(({ polygon, bounds: [west, south, east, north] }) => x >= west - tolerance && x <= east + tolerance && y >= south - tolerance && y <= north + tolerance && polygonContains(polygon, [x, y], tolerance));
}

function gridValue(grid, [lon, lat]) {
  return grid[Math.floor((73 - lat) * 12) * 1080 + Math.floor((lon + 25) * 12)];
}

test('欧州の概略分布は元格子と照合できる16品目を独立した面で収録する', () => {
  assert.equal(collection.type, 'FeatureCollection');
  assert.equal(collection.features.length, 16);
  assert.deepEqual(new Set(collection.features.map(feature => feature.properties.id)), new Set([...cropConfig.map(crop => crop.id), 'cattle', 'pig', 'chicken', 'sheep']));
  assert.equal(manifest.coordinateReferenceSystem, 'EPSG:4326');
  assert.equal(manifest.processing.sourceMutation, false);
  assert.equal(sha(bytes(manifest.output.path)), manifest.output.sha256);
  for (const input of manifest.inputs) assert.equal(sha(bytes(input.path)), input.sha256, input.path);

  for (const feature of collection.features) {
    const { id, name, kind, color, threshold, unit, period, labelCoordinate } = feature.properties;
    const record = manifest.products.find(product => product.id === id);
    assert.equal(record.retainedComponents, record.supportedComponentsBeforeSelection, `${id}: 条件を満たす集中域を品目内の上位件数で落とさない`);
    if (id === 'wheat') assert.ok(record.countryCodes.includes('FRA') && record.countryCodes.includes('DEU'), '小麦は初期図からフランス・ドイツを含む');
    const input = manifest.inputs.find(item => item.id === id);
    const raw = gunzipSync(bytes(input.path));
    assert.equal(raw.byteLength, 1080 * 492 * 4);
    const grid = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    assert.ok(name && unit && period, id);
    assert.equal(threshold, record.threshold, id);
    assert.ok(threshold > 0, id);
    if (kind === 'crop') assert.equal(color, cropConfig.find(crop => crop.id === id).color);
    else assert.equal(kind, 'livestock');
    assert.ok(targetLandContains(labelCoordinate), `${id}: 名称は欧州対象国の陸域にある`);
    assert.ok(gridValue(grid, labelCoordinate) >= threshold, `${id}: 名称の位置に閾値以上の元格子がある`);
    assert.equal(gridValue(grid, labelCoordinate), record.labelSource.value, id);
    assert.ok(polygons(feature.geometry).some(polygon => polygonContains(polygon, labelCoordinate)), `${id}: 名称は自身の分布面内にある`);
    assert.ok(polygons(feature.geometry).length > 1, `${id}: 離れた分布を一つの図形に結ばない`);

    for (const polygon of polygons(feature.geometry)) {
      for (const ring of polygon) {
        assert.ok(ring.length >= 4, id);
        assert.deepEqual(ring[0], ring.at(-1), `${id}: 輪郭は閉じる`);
        for (const coordinate of ring) {
          assert.equal(coordinate.length, 2, id);
          assert.ok(coordinate.every(Number.isFinite), id);
          assert.ok(coordinate[0] >= -25 && coordinate[0] <= 65 && coordinate[1] >= 32 && coordinate[1] <= 73, id);
          assert.ok(targetLandContains(coordinate), `${id}: 背景国や海上には分布面を描かない (${coordinate})`);
        }
      }
      const [west, south, east, north] = box(polygon[0]);
      let supported = false;
      for (let row = Math.max(0, Math.floor((73 - north) * 12)); row <= Math.min(491, Math.ceil((73 - south) * 12)) && !supported; row++) {
        for (let col = Math.max(0, Math.floor((west + 25) * 12)); col <= Math.min(1079, Math.ceil((east + 25) * 12)); col++) {
          if (grid[row * 1080 + col] >= threshold && polygonContains(polygon, [-25 + (col + .5) / 12, 73 - (row + .5) / 12])) {
            supported = true;
            break;
          }
        }
      }
      assert.ok(supported, `${id}: すべての離れた分布面にも高値の元格子がある`);
    }
  }
});
