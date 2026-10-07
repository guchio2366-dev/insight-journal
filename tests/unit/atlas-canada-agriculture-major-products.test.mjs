import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const code=await bundleCanadaSource('src/lib/atlas-canada-agriculture-supplement.ts',{format:'esm',platform:'node'});
const {combineCanadaAgricultureSources}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const read=async path=>JSON.parse(await readFile(path));
const census=await read('src/data/atlas/canada/census-agriculture.json'),supplement=await read('src/data/atlas/canada/agriculture-provincial-supplement.json'),reading=await read('src/data/atlas/canada/agriculture-major-reading.json');
test('province inventory shares and chicken producer counts stay independent of CCS and national units',()=>{
 const before=JSON.stringify(census),data=combineCanadaAgricultureSources(census,supplement);
 assert.equal(JSON.stringify(census),before);assert.equal(Object.keys(data.products).length,12);
 assert.equal(data.products.pork.national.value,13.98);assert.equal(data.products.pork.national.unit,'百万頭');assert.equal(data.products.pork.unit,'%');
 assert.equal(data.products.chicken.national.value,2823);assert.equal(data.products.chicken.unit,'生産者');
 assert.deepEqual(data.provinces.filter(p=>p.cells.pork.status==='published').map(p=>[p.code,p.cells.pork.value]),[['24',30],['35',27],['46',24]]);
 assert.equal(data.provinces.filter(p=>p.cells.chicken.status==='published').length,10);
 assert.equal(data.provinces.find(p=>p.code==='60').cells.chicken.status,'not-covered');
 for(const [id,record]of Object.entries(data.records)){
  for(const product of ['pork','chicken'])assert.deepEqual(record.cells[product],{value:null,quality:null,status:'not-covered',components:[]});
  for(const product of Object.keys(census.products))assert.deepEqual(record.cells[product],census.records[id].cells[product]);
 }
});
test('ten substantive product readings retain primary sources and actual mapped CCS references',()=>{
 assert.equal(Object.keys(reading.products).length,10);
 for(const [id,profile]of Object.entries(reading.products)){
  assert.ok(profile.keySentence.length>25,id);assert.ok(profile.paragraphs.length>=3,id);assert.equal(profile.headings.length,profile.paragraphs.length);
  for(const [index,paragraph]of profile.paragraphs.entries()){assert.ok(paragraph.length>65,id);assert.ok(profile.paragraphSourceIds[index].length);for(const source of profile.paragraphSourceIds[index]){assert.ok(profile.sourceIds.includes(source));assert.match(reading.sources[source].url,/^https:\/\//);}}
  for(const place of profile.focusCcs??[])assert.ok(census.records[place.id]);
 }
 assert.match(reading.products.corn.metricNote,/子実用＋サイレージ用.*純粋な飼料量ではない/);
 assert.match(reading.products.pork.metricNote,/丸めシェア/);assert.match(reading.products.chicken.metricNote,/生産者数/);
});
test('source ledger checksums and all shipped province transcriptions agree',async()=>{
 const source=await readFile('data-source/atlas/canada/agriculture/major-products/provincial-supplement.json');
 assert.deepEqual(source,await readFile('public/assets/atlas/canada-agriculture-major-v1/provincial-supplement.json'));assert.deepEqual(source,await readFile('src/data/atlas/canada/agriculture-provincial-supplement.json'));
 const manifest=await read('data-source/atlas/canada/agriculture/major-products/manifest.json');
 for(const f of manifest.files){const bytes=await readFile(f.file);assert.equal(bytes.length,f.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);}
});
