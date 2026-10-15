import test from 'node:test';
import assert from 'node:assert/strict';
import {industryMapSector, industrySectorItems, groupIndustryMapLabels, layoutIndustryMapLabels} from '../../src/lib/atlas-industry-sector-map.ts';

test('sector membership retains original records and meaningful dual roles, without an all-sector fallback', () => {
  const mine = {id: 'mine', sectors: ['resources'], coordinates: [70, 40]}, refinery = {id: 'refinery', sectors: ['resources', 'manufacturing'], coordinates: [71, 40]}, port = {id: 'port', sectors: ['services'], coordinates: [72, 40]};
  const rows = [mine, refinery, port], membership = row => row.sectors;
  assert.deepEqual(industrySectorItems(rows, 'resources', membership), [mine, refinery]);
  assert.deepEqual(industrySectorItems(rows, 'manufacturing', membership), [refinery]);
  assert.deepEqual(industrySectorItems(rows, 'services', membership), [port]);
  assert.equal(industrySectorItems(rows, 'resources', membership)[1], refinery);
  assert.deepEqual(refinery.coordinates, [71, 40]);
  assert.equal(industryMapSector('resource'), 'resources');
  assert.equal(industryMapSector('all'), 'resources');
  assert.equal(industryMapSector('invalid', 'services'), 'services');
});

test('nearby labels group only compatible industry, country and stage, with a real member anchor and no long chains', () => {
  const p = (id, x, industry = 'copper', extra = {}) => ({id, x, y: 100, industry, label: '銅', country: 'A', stage: 'mine', ...extra});
  const points = [p('a', 100), p('b', 140), p('c', 180), p('foreign', 100, 'copper', {country: 'B'}), p('smelter', 100, 'copper', {stage: 'smelt'}), p('steel', 100, 'steel')];
  const groups = groupIndustryMapLabels(points, 58);
  assert.equal(groups.length, 5);
  assert.deepEqual(groups, groupIndustryMapLabels([...points].reverse(), 58));
  assert.deepEqual(groups.flatMap(g => g.members.map(p => p.id)).sort(), points.map(p => p.id).sort());
  for (const group of groups) {
    assert(group.members.includes(group.anchor));
    for (const a of group.members) for (const b of group.members) assert(Math.hypot(a.x - b.x, a.y - b.y) <= 58);
  }
});

for (const width of [390, 820, 1280, 1896]) test(`compact labels at ${width}px remain inside the map, avoid points/controls, and omit unplaceable labels`, () => {
  const points = Array.from({length: 30}, (_, i) => ({id: String(i).padStart(2, '0'), industry: 'industry-' + i, label: '産業' + i, x: 15 + (i % 5) * (width - 50) / 5, y: 30 + Math.floor(i / 5) * 45}));
  const groups = groupIndustryMapLabels(points), reserved = [{left: width - 70, top: 0, right: width, bottom: 160}];
  const result = layoutIndustryMapLabels(groups, {width, height: 340}, {points, reserved});
  assert(result.placed.length > 0); assert(result.omitted.length > 0);
  assert.equal(result.placed.length + result.omitted.length, groups.length);
  const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  for (const {box, group} of result.placed) {
    assert(box.left >= 4 && box.top >= 4 && box.right <= width - 4 && box.bottom <= 336);
    assert(!reserved.some(b => overlap(box, b)));
    assert(!points.some(p => overlap(box, {left: p.x - 5, top: p.y - 5, right: p.x + 5, bottom: p.y + 5})));
    const {x, y} = group.anchor;
    assert(Math.hypot(x - Math.max(box.left, Math.min(x, box.right)), y - Math.max(box.top, Math.min(y, box.bottom))) <= 40);
  }
  for (const [i, a] of result.placed.entries()) for (const b of result.placed.slice(i + 1)) assert(!overlap(a.box, b.box));
  assert.deepEqual(result, layoutIndustryMapLabels([...groups].reverse(), {width, height: 340}, {points, reserved}));
});
