import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodeAsiaNumericGrid} from '../../src/lib/atlas-asia-numeric-grid.ts';
import {asiaFarmDefinitions,asiaFarmUnit} from '../../src/data/atlas/asia-farming.ts';
const base=new URL('../../public/assets/atlas/asia-farming-v1/',import.meta.url),read=name=>readFileSync(new URL(name,base));
const manifest=JSON.parse(read('manifest.json')),stats=JSON.parse(read('statistics.json'));

test('農林業の配信値は34枚の数値図と3枚の参考森林図を区別し、0と欠測を保持する',async()=>{
 let numeric=0,reference=0;
 for(const [name,file] of Object.entries(manifest.files)){const bytes=read(name);assert.equal(bytes.length,file.bytes,name);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,name);}
 for(const r of Object.values(manifest.regions))for(const layer of r.layers){
  assert.ok(asiaFarmDefinitions[layer.id]);const png=read(layer.image);assert.equal(png.readUInt32BE(16),layer.width);assert.equal(png.readUInt32BE(20),layer.height);
  if(layer.kind==='forest'){reference++;assert.equal(layer.query,null);assert.equal(layer.grid,undefined);continue;}
  numeric++;const grid=await decodeAsiaNumericGrid(read(layer.grid),layer,'float32',-1);
  assert.ok(grid.values.every(v=>v===-1||Number.isFinite(v)&&v>=0));assert.ok(grid.values.some(v=>v>0));assert.ok(grid.values.some(v=>v===-1));
  assert.equal(layer.sourceResolutionDegrees,1/12);for(const c of Object.values(layer.countryCoverage))assert.ok(c.positivePixels<=c.validPixels&&c.validPixels<=c.maskPixels);
 }
 assert.equal(numeric,34);assert.equal(reference,3);assert.deepEqual(JSON.parse(gunzipSync(read('statistics.json.gz'))),stats);
});

test('FAOの単位・中国の範囲・未掲載と0・生葉の定義を公表値のまま扱う',()=>{
 assert.equal(Object.keys(stats.countries).length,30);assert.equal(stats.countries.CHN.m49,156);assert.equal(stats.countries.TWN.m49,158);
 const get=(code,item,element,year)=>stats.countries[code].observations.find(r=>r.item===String(item)&&r.element===element&&r.year===year);
 assert.equal(get('CHN',15,'Production',2020).value,134250000);
 assert.equal(get('JPN',667,'Production',2020).value,328800);assert.match(asiaFarmDefinitions.tea.definition,/生葉/);
 const chicken=get('JPN',1057,'Stocks',2020);assert.equal(chicken.value,319156);assert.equal(chicken.unit,'1000 An');assert.equal(asiaFarmUnit(chicken.unit,'chicken'),'千羽');
 assert.equal(get('JPN',6646,'Area',2020).unit,'1000 ha');assert.equal(get('JPN',1861,'Production',2020).unit,'m3');
 assert.equal(get('TWN',6646,'Area',2020),undefined);
 assert.ok(Object.values(stats.countries).flatMap(c=>c.observations).some(r=>r.value===0));
 assert.match(asiaFarmDefinitions.arabica.definition,/種類を合計/);assert.match(asiaFarmDefinitions.pearlmillet.definition,/Millet分類全体/);
 for(const c of Object.values(stats.countries)){const ids=new Set();for(const r of c.observations){const id=[r.domain,r.item,r.elementCode,r.year,r.unit].join(':');assert.ok(!ids.has(id),id);ids.add(id);if(r.flag==='M')assert.equal(r.value,null);}}
});
