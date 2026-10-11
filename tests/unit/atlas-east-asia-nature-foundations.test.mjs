import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {asiaWaterFocus} from '../../src/data/atlas/asia-water-focus.ts';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
test('Yellow River retains its stable basin link and all three original mainstem sections',()=>{
 const water=json('public/assets/atlas/asia-physical-v1/east-asia.water.json');
 const focus=asiaWaterFocus['east-asia'].find(f=>f.name==='黄河');
 const river=water.features.find(f=>f.properties.id===focus.river);
 assert.deepEqual(river.properties.sourceIds,[28,212,213]);
 assert.ok(river.properties.bounds[0]<100,'source region must not be reduced to lower Yellow River');
 assert.ok(river.properties.bounds[2]>119);
 assert.ok(river.geometry.coordinates.length>=3,'retain original line pieces without invented connectors');
 assert.equal(water.features.some(f=>['rivers-28','rivers-212'].includes(f.properties.id)),false,'old separate Huang sections must not duplicate the mainstem');
 assert.equal(new Set(water.features.map(f=>f.properties.id)).size,water.features.length);
});
test('named landform extents are source polygons, including plains and inner-Asian basins',()=>{
 const geo=json('public/assets/atlas/east-asia-v1/landforms.json');
 assert.equal(geo.features.length,9);assert.equal(geo.source.license,'Public domain');
 const keyed=Object.fromEntries(geo.features.map(f=>[f.properties.id,f]));
 for(const id of ['sichuan-basin','tarim-basin','north-china-plain','tibetan-plateau','mongolian-plateau'])assert.ok(keyed[id]);
 assert.equal(keyed['north-china-plain'].properties.kind,'Plain');
 for(const f of geo.features){assert.ok(f.properties.sourceId);assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));
  const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();
  assert.ok(rings.some(r=>r.length>10),'geographic extent cannot be replaced with a rectangular selection box');
 }
});
