import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { livestockKinds,livestockRegions,livestockReadings,livestockSources } from '../../src/data/atlas/livestock.ts';

test('畜産5分類に詳説と公式出典がある',()=>{
 assert.equal(livestockKinds.length,5);
 assert.deepEqual(livestockReadings.map(item=>item.id),livestockKinds.map(item=>item.id));
 assert.ok(livestockSources.some(source=>source.publisher==='USDA NASS'));
 for(const item of livestockReadings)assert.ok(item.body.length>=100,item.id);
});

test('畜産地域は重複しないIDと米国本土内の代表点を持つ',()=>{
 assert.equal(new Set(livestockRegions.map(region=>region.id)).size,livestockRegions.length);
 for(const region of livestockRegions){
  assert.ok(livestockKinds.some(kind=>kind.id===region.kindId),region.id);
  assert.ok(region.anchor[0]>=-128&&region.anchor[0]<=-64,region.id);
  assert.ok(region.anchor[1]>=22&&region.anchor[1]<=52,region.id);
  assert.ok(region.summary.length>=35,region.id);
 }
});

test('軽量な畜産代替図を同梱する',async()=>{
 for(const name of ['agriculture-livestock-fallback.svg','livestock-fallback.svg']){
  const file=await stat(new URL(`../../public/assets/atlas/livestock/v1/${name}`,import.meta.url));
  assert.ok(file.size<350_000,`${name}: ${file.size}`);
 }
});
