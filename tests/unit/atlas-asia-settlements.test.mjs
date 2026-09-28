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
    if(topic==='religion'){assert.ok(g.groupReligiousShare>=.8);assert.ok(g.religion.startsWith(religions[c.label]));assert.notEqual(g.gwgroupid,85013000,'unreliable Papua religion record is not mapped');}
   }
   if(c.id.endsWith('-shared'))assert.equal(c.label,'掲載した居住域の重なり');else assert.ok(c.sourceGroups.length);
  }
 }
});
