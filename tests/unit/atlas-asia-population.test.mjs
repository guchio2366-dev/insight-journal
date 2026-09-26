import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeAsiaNumericGrid,readAsiaNumericCell} from '../../src/lib/atlas-asia-numeric-grid.ts';
const base=new URL('../../public/assets/atlas/asia-population-v1/',import.meta.url);
const read=name=>readFileSync(new URL(name,base));
const m=JSON.parse(read('manifest.json'));
const all=Object.values(m.regions).flatMap(r=>r.cities);

test('人口の配信データは52都市・30か国を含み、人口年と都市範囲の年を分けて記録する',()=>{
 assert.equal(m.populationYear,2020);assert.equal(m.urbanBoundaryYear,2025);assert.equal(all.length,52);
 const countries=new Set(all.map(c=>c.country));assert.equal(countries.size,30);assert.ok(!countries.has('IRN')&&!countries.has('RUS'));
 assert.equal(all.filter(c=>c.detail).length,11);assert.equal(new Set(all.map(c=>c.id)).size,52);
 for(const [name,file] of Object.entries(m.files)){const bytes=read(name);assert.equal(bytes.length,file.bytes,name);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,name);}
 for(const r of Object.values(m.regions)){
  const shapes=JSON.parse(read(r.urban));assert.equal(shapes.features.length,r.cities.length);
  const geography=JSON.parse(read(r.geography));for(const code of Object.keys(r.countryCoverage))assert.ok(geography.features.some(f=>f.properties.code===code&&f.properties.target),code);
  for(const c of r.cities){assert.ok(c.coordinates[0]>=r.bounds4326[0]&&c.coordinates[0]<=r.bounds4326[2]);assert.ok(c.coordinates[1]>=r.bounds4326[1]&&c.coordinates[1]<=r.bounds4326[3]);assert.equal(c.population,c.history['2020']);assert.equal(c.density,c.population/c.areaKm2);assert.ok(shapes.features.find(f=>f.id===c.id));}
  for(const coverage of Object.values(r.countryCoverage)){assert.ok(coverage.listedUrbanCentres>=1);assert.ok(coverage.sourceUrbanCentres>=coverage.listedUrbanCentres);}
 }
 // Independently checked source attributes; do not substitute 2025 population.
 const tokyo=all.find(c=>c.sourceId===5929);assert.equal(tokyo.population,33447551.24);assert.equal(tokyo.areaKm2,5165);
 assert.ok(tokyo.coordinates[0]>139&&tokyo.coordinates[0]<140&&tokyo.coordinates[1]>35&&tokyo.coordinates[1]<36,'GeoPackage centroid columns are projected metres, not geographic degrees');
 assert.ok(Object.values(m.files).reduce((n,f)=>n+f.bytes,0)<12_000_000);
});

test('広域・11都市の人口照会は画像寸法と一致し、小島・都市の実際の人口格子を残す',async()=>{
 for(const r of [...Object.values(m.regions),...all.filter(c=>c.detail).map(c=>c.detail)]){
  const png=read(r.image);assert.equal(png.readUInt32BE(16),r.width);assert.equal(png.readUInt32BE(20),r.height);
  const grid=await decodeAsiaNumericGrid(read(r.grid),r,'float32',-1);assert.equal(grid.values.length,r.width*r.height);
  assert.ok(grid.values.every(v=>Number.isFinite(v)&&v>=-1));assert.ok(grid.values.some(v=>v>0));
 }
 for(const [id,lng,lat,min,max] of [[5929,139.76,35.68,1000,100000],[178,103.85,1.30,1000,100000],[165,73.51,4.18,10000,150000],[7963,77.22,28.62,1000,150000]]){
  const r=all.find(c=>c.sourceId===id).detail,grid=await decodeAsiaNumericGrid(read(r.grid),r,'float32',-1),value=readAsiaNumericCell(grid,lng,lat);
  assert.ok(value>min&&value<max,`${id}: ${value}`);assert.equal(r.sourceCellKm,1);
 }
});
