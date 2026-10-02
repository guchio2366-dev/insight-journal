import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const base=new URL('../../public/assets/atlas/mexico-groundwater-v1/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
const layer=manifest.layers.groundwater;
const canonical=JSON.parse(await readFile(new URL('../../data-source/atlas/mexico/groundwater/groundwater.canonical.source.json',import.meta.url),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Mexico groundwater keeps all ten official classes and separate yield/potential meanings',()=>{
 assert.equal(layer.legend.length,10);
 assert.deepEqual(layer.legend.map(entry=>entry.sourceClass),['1A','2M','3B','4PM','5PB','6a','7m','8b','9pm','10pb']);
 assert.equal(layer.legend.filter(entry=>entry.measure==='yield').length,6);
 assert.equal(layer.legend.filter(entry=>entry.measure==='potential').length,4);
 assert.equal(layer.legend.filter(entry=>entry.material==='consolidated').length,5);
 for(const entry of layer.legend)assert.equal(entry.sourceName,canonical.classFiles[entry.id].sourceName);
 assert.match(layer.meaning,/現在の地下水量・取水量・法定帯水層境界ではありません/);
 assert.match(layer.selectedDistributionNotice,/水なし・欠測を意味しません/);
});

test('Mexico groundwater serves identical reviewed class bytes, members and rings',async()=>{
 const ordinals=new Set();let rings=0;
 for(const entry of Object.values(layer.classFiles)){
  const bytes=await readFile(new URL(entry.file,base));
  assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),canonical.classFiles[entry.id].sha256);
  const decoded=gunzipSync(bytes);assert.equal(decoded.length,entry.decodedAsset.bytes);assert.equal(sha(decoded),entry.decodedAsset.sha256);
  const collection=JSON.parse(decoded);assert.equal(collection.features.length,1);
  const feature=collection.features[0];assert.equal(feature.properties.classId,entry.id);
  assert.equal(sha(JSON.stringify(feature.geometry)),entry.geometrySha256);
  const members=feature.properties.sourceRecordOrdinals;
  assert.equal(members.length,entry.sourceMemberCount);
  for(const ordinal of members){assert.equal(ordinals.has(ordinal),false);ordinals.add(ordinal);}
  const count=feature.geometry.coordinates.reduce((sum,polygon)=>sum+polygon.length,0);assert.equal(count,entry.sourceRingCount);rings+=count;
 }
 assert.equal(ordinals.size,29479);assert.equal(rings,48769);
});

test('Mexico groundwater national overview has the same projection and reviewed boundary',async()=>{
 const image=await readFile(new URL(layer.overviewAsset.file,base));
 assert.equal(image.length,layer.overviewAsset.bytes);assert.equal(sha(image),layer.overviewAsset.sha256);
 assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(image.readUInt32BE(16),1800);assert.equal(image.readUInt32BE(20),1160);
 assert.equal(layer.overviewAsset.viewBox,'0 0 900 580');assert.equal(layer.overviewAsset.classCount,10);
 const geometry=await readFile(new URL('../../src/data/atlas/mexico/geometry.json',import.meta.url));
 const projection=await readFile(new URL('../../src/lib/atlas-mexico-projection.mjs',import.meta.url));
 assert.equal(sha(geometry),layer.overviewAsset.nationalBoundarySha256);assert.equal(sha(projection),layer.overviewAsset.projectionSourceSha256);
 assert.ok(image.length<1_000_000);assert.equal(layer.defaultSelectedClassId,'all');
});

test('Mexico groundwater records archival dates and unknown observation period honestly',()=>{
 assert.equal(layer.sourceCreationDate,'1996-03-01');assert.equal(layer.sourceRevisionDate,'2008-12-01');
 assert.equal(layer.observedPeriod,null);assert.equal(layer.scale,250000);
 assert.equal(layer.originalRecordCount,34551);assert.equal(layer.selectedSourceRecordCount,29479);assert.equal(layer.excludedRecordCount,5072);
 assert.equal(layer.sourceInvalidRecordOrdinals.length,92);
 assert.match(layer.geometryMeaning,/Not legal aquifer boundaries/);
 assert.match(layer.method,/without dissolve, make_valid, buffer repair/);
 assert.equal(layer.nationalDisplayMask.required,true);
});
