import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

const root=new URL('../../public/assets/atlas/',import.meta.url);
async function asset(name){return JSON.parse(gunzipSync(await readFile(new URL(name,root))));}

test('中央アジアの家畜分布は牛・羊・山羊の各面を保持する',async()=>{
 const data=await asset('asia-presentation-v1/central-asia.livestock-areas.json.gz');
 assert.equal(data.type,'FeatureCollection');
 assert.deepEqual(data.features.map(f=>`${f.properties.id}:${f.properties.distribution}`).sort(),['cattle:core','cattle:spread','goat:core','goat:spread','sheep:core','sheep:spread']);
 for(const f of data.features){assert.equal(f.properties.kind,'livestock');assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));}
});

test('中央アジアの民族・宗教面は別資産に切り出され、全国割合を含まない',async()=>{
 for(const topic of ['ethnicity','religion']){
  const data=await asset(`asia-settlements-v1/central-asia.${topic}.json.gz`);
  assert.ok(data.features.length>0);
  assert.ok(data.features.every(f=>f.properties.id.startsWith(topic+'-')));
  assert.ok(data.features.every(f=>!('share' in f.properties)&&!('percentage' in f.properties)));
 }
});
