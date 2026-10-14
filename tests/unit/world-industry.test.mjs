import test from 'node:test';
import assert from 'node:assert/strict';
import { sectors, groups } from '../../src/data/atlas/world-industry/index.ts';
import { layoutSites, mapWidth, mapHeight } from '../../src/lib/world-industry-map.ts';

test('world pilot contains exactly the seven approved sectors and complete sourced stages', () => {
  assert.deepEqual(sectors.map(s => s.id), ['semiconductor', 'solar', 'battery', 'gas', 'oil', 'copper', 'steel']);
  assert.deepEqual(groups.flatMap(g => g.ids), sectors.map(s => s.id));
  for (const sector of sectors) {
    assert.ok(sector.scope);
    const ids = new Set(sector.sites.map(s => s.id));
    assert.equal(ids.size, sector.sites.length);
    for (const stage of sector.stages) assert.ok(sector.sites.some(s => s.stage === stage.id), `${sector.id}/${stage.id} has a representative`);
    for (const site of sector.sites) {
      assert.ok(sector.stages.some(s => s.id === site.stage));
      assert.ok(site.coordinates[0] >= -180 && site.coordinates[0] <= 180);
      assert.ok(site.coordinates[1] >= -65 && site.coordinates[1] <= 85);
      assert.ok(site.kind && site.status && site.note);
      for (const key of ['value', 'unit', 'year', 'basis', 'scope']) assert.ok(site.scale[key], `${site.id} missing ${key}`);
      assert.ok(site.sources.length);
      for (const source of site.sources) assert.equal(new URL(source.url).protocol, 'https:');
    }
    for (const link of sector.links) {
      assert.ok(ids.has(link.from) && ids.has(link.to));
      assert.notEqual(link.from, link.to);
      assert.ok(link.evidence && link.year && link.sources.length, 'supply lines require their own dated evidence');
    }
  }
});

test('all fixed labels fit the world map and do not collide', () => {
  for (const sector of sectors) {
    const labels = layoutSites(sector.sites);
    for (const label of labels) {
      assert.ok(label.x >= 0 && label.y >= 0 && label.x + label.width <= mapWidth && label.y + label.height <= mapHeight);
    }
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      assert.ok(!(a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y), `${sector.id}: ${a.site.name} overlaps ${b.site.name}`);
    }
  }
});
