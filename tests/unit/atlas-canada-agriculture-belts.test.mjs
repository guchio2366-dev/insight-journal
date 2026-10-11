import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const code=await bundleCanadaSource('src/lib/atlas-canada-agriculture-belts.ts',{format:'esm',platform:'node'});
const lib=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const data=JSON.parse(await readFile('src/data/atlas/canada/agriculture-production-belts.json'));

test('Canada independent production belts preserve overlaps, primary sources and their editorial geographic meaning',()=>{
 assert.equal(data.referenceYear,2021);assert.match(data.meaning,/最大品目.*量の大小.*面積・頭数を推計しません/);
 const ids=new Set();for(const belt of data.belts){assert.ok(!ids.has(belt.id));ids.add(belt.id);assert.ok(belt.sourceIds.length>0);for(const source of belt.sourceIds)assert.ok(data.sources[source]?.url.startsWith('https://www150.statcan.gc.ca/'));assert.deepEqual(belt.outline[0],belt.outline.at(-1));assert.ok(belt.outline.length>=5);for(const [lon,lat] of belt.outline){assert.ok(lon>=-145&&lon<=-50&&lat>=40&&lat<=60);}for(const forbidden of ['value','area','population','count','share'])assert.equal(Object.hasOwn(belt,forbidden),false);assert.match(lib.canadaAgricultureBeltPath(belt.outline),/^M.*Z$/);}
 assert.deepEqual([...new Set(data.belts.filter(b=>!b.auxiliary).map(b=>b.product))].sort(),['beef','canola','chicken','corn','dairy','lentils','pork','potatoes','soybeans','wheat']);
 assert.match(data.sources.chicken.geography,/肉用・採卵用.*鶏肉のみ.*ではない/);
 assert.match(data.sources.pork.geography,/地域頭数を復元しない/);
});
test('Canada crop/livestock switches are independent and selecting a product never isolates its distribution',()=>{
 const both=lib.canadaAgricultureVisibleBelts(null,['crop','livestock']),selected=lib.canadaAgricultureVisibleBelts('canola',['crop','livestock']);
 assert.deepEqual(selected,both);assert.ok(both.some(b=>b.product==='wheat')&&both.some(b=>b.product==='beef'));
 const crops=lib.canadaAgricultureVisibleBelts('canola',['crop']);assert.ok(crops.length>5);assert.ok(crops.every(b=>lib.canadaAgricultureProductLayer(b.product)==='crop'));
 const livestock=lib.canadaAgricultureVisibleBelts(null,['livestock']);assert.ok(livestock.length>4);assert.ok(livestock.every(b=>lib.canadaAgricultureProductLayer(b.product)==='livestock'));
 assert.deepEqual(lib.canadaAgricultureVisibleBelts(null,[]),[]);
 assert.equal(both.some(b=>b.auxiliary),false);const hay=lib.canadaAgricultureVisibleBelts('hay',['crop','livestock']);assert.equal(hay.filter(b=>b.auxiliary).length,2);assert.ok(hay.some(b=>b.product==='canola'));
});
test('Canada southern view fits production extents at actual wide and secondary PC map dimensions',()=>{
 for(const [width,height] of [[1080,584],[740,400]]){
  const [cx,cy,z]=lib.canadaAgricultureSouthCamera(width,height),scale=Math.min(width/900,height/580);
  for(const belt of data.belts.filter(b=>!b.auxiliary))for(const point of [...belt.outline,belt.labelAnchor]){
   const path=lib.canadaAgricultureBeltPath([point]),parts=path.match(/^M([-\d.]+),([-\d.]+)/),x=Number(parts[1]),y=Number(parts[2]);
   assert.ok(width/2+(x-cx)*scale*z>=5&&width/2+(x-cx)*scale*z<=width-5);assert.ok(height/2+(y-cy)*scale*z>=5&&height/2+(y-cy)*scale*z<=height-5);
  }
 }
});
test('Canada belt support ledger retains exact source cells and never allocates province-only quantities',async()=>{
 const support=JSON.parse(await readFile('data-source/atlas/canada/agriculture/production-belts/ccs-production-support.json'));
 const sourceBytes=await readFile('public/assets/atlas/canada-census-agriculture-v1/census-agriculture.json'),source=JSON.parse(sourceBytes);
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(support.sourceDataSha256,sha(sourceBytes));
 assert.equal(support.sourceGeometrySha256,sha(await readFile('public/assets/atlas/canada-census-agriculture-v1/ccs.geojson')));
 assert.equal(support.editorialBeltsSha256,sha(await readFile('src/data/atlas/canada/agriculture-production-belts.json')));
 assert.equal(support.belts.length,data.belts.length);
 for(const belt of support.belts){
  if(['pork','chicken'].includes(belt.product)){assert.equal(belt.ccsValuesAcquired,false);assert.equal(belt.provinceValuesAllocated,false);continue;}
  assert.ok(belt.supportingPublishedRegionCount>0);assert.ok(belt.largestPublishedExamples.length>0);
  for(const example of belt.largestPublishedExamples)assert.deepEqual(example.sourceCell,source.records[example.dguid].cells[belt.product]);
  for(const field of ['sum','quantity','area','headCount','production'])assert.equal(Object.hasOwn(belt,field),false);
 }
 const abPotatoes=support.belts.find(belt=>belt.id==='potatoes-alberta');
 assert.ok(abPotatoes.supportingPublishedRegionCount>=4);
 assert.ok(abPotatoes.largestPublishedExamples.some(example=>example.name==='Forty Mile County No. 8'));
});
