import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {waterContains} from '../../src/data/atlas/asia-water.ts';
const base='public/assets/atlas/asia-settlements-v1/';
const manifest=JSON.parse(readFileSync(base+'manifest.json','utf8'));

test('居住域は行政区域の多数派統計と区別し、資料の集団定義・年・宗教の結合根拠を持つ',()=>{
 assert.equal(manifest.year,2020);assert.equal(manifest.sourceVersion,2021);
 assert.equal(manifest.sources.length,2);for(const s of manifest.sources)assert.match(s.sha256,/^[0-9a-f]{64}$/);
 assert.deepEqual(Object.keys(manifest.regions),['east-asia','southeast-asia','south-central-asia']);
 const religions={'イスラム教':'ARI','ヒンドゥー教':'ERH','仏教':'ERB','シク教':'ERS','キリスト教':'ARC'};
 for(const topics of Object.values(manifest.regions))for(const [topic,record] of Object.entries(topics)){
  const data=JSON.parse(gunzipSync(readFileSync(base+record.file)));
  assert.equal(data.features.length,record.categories.length);assert.ok(data.features.length>1);
  for(const c of record.categories){
   const f=data.features.find(f=>f.properties.id===c.id);assert.ok(f);assert.equal(f.properties.color,c.color);
   assert.ok(waterContains(f.geometry,c.anchors[0]),c.label+' label is inside its own displayed area');
   for(const g of c.sourceGroups){
    assert.ok(g.from<=2020&&g.to>=2020);assert.ok(['Regionally based','Regional & urban','Aggregate'].includes(g.type));
    assert.ok(g.group&&g.statename&&g.gwgroupid);
    if(topic==='religion'){if(g.mixed){assert.ok([70301000,70406000,70502000].includes(g.gwgroupid));assert.match(c.label,/複数の帰属/);assert.ok(g.groupReligiousShare<.8);assert.ok(g.segments.length>=2);}else{assert.ok(g.groupReligiousShare>=.8);assert.ok(g.religion.startsWith(religions[c.label]));}assert.notEqual(g.gwgroupid,85013000,'unreliable Papua religion record is not mapped');}
   }
   if(c.id.endsWith('-shared'))assert.equal(c.label,'掲載した居住域の重なり');else assert.ok(c.sourceGroups.length);
  }
 }
});

test('中央アジア3か国の複数の帰属を単一宗教の区域と偽らない',()=>{
 const record=manifest.regions['south-central-asia'].religion;
 const mixed=record.categories.find(c=>c.sourceGroups.some(g=>g.mixed));assert.ok(mixed);
 assert.deepEqual(mixed.sourceGroups.map(g=>g.gwgroupid).sort(),[70301000,70406000,70502000]);
 assert.deepEqual(mixed.sourceGroups.map(g=>g.groupReligiousShare),[.77,.66,.459]);
 const data=JSON.parse(gunzipSync(readFileSync(base+record.file)));assert.ok(data.features.find(f=>f.properties.id===mixed.id).geometry.coordinates.length);
});
