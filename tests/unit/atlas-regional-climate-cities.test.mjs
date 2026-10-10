import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {build,stop} from 'esbuild';
import {climateAxes} from '../../src/lib/atlas-climate-axes.ts';
const cities=JSON.parse(readFileSync(new URL('../../src/data/atlas/oceania-russia-climate-cities.json',import.meta.url)));
const bundle=await build({entryPoints:['src/data/atlas/oceania-russia-climate-reading.ts'],bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
const {regionalClimateReading}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
after(()=>stop());
test('ten identified official stations retain the selected Normal columns, twelve months, coordinates, period and provenance',()=>{
 assert.equal(cities.length,10);assert.equal(cities.filter(c=>c.region==='oceania').length,6);assert.equal(cities.filter(c=>c.region==='russia').length,4);
 for(const c of cities){
  const csv=readFileSync(new URL(`../../data-source/atlas/oceania-russia-climate-cities/${c.stationId}-normal.csv`,import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(csv).digest('hex'),c.selectedNormalSha256);
  const rows=csv.trim().split('\n').slice(1).map(l=>l.split(',').map(Number));assert.deepEqual(rows.map(r=>r[0]),Array.from({length:12},(_,i)=>i+1));
  assert.deepEqual(c.temperatureC,rows.map(r=>r[1]));assert.deepEqual(c.precipitationMm,rows.map(r=>r[2]));
  assert.ok(c.coordinates.length===2&&c.coordinates.every(Number.isFinite));assert.ok(c.precipitationMm.every(v=>Number.isFinite(v)&&v>=0));
  assert.equal(c.normalPeriod,'1991–2020');assert.equal(new URL(c.sourceUrl).searchParams.get('n'),c.stationId);assert.ok(!c.stationName.includes('Lat.:'));
  const occurrences=c.sourceNormalOccurrences;assert.equal(occurrences.length,12);assert.ok(occurrences.every(n=>n>=1));
 }
 assert.deepEqual(cities.find(c=>c.id==='rotuma').coordinates,[177.05,-12.5]);assert.equal(cities.find(c=>c.id==='rotuma').stationName,'ROTUMA');
 assert.deepEqual(cities.find(c=>c.id==='malye-karmakuly').coordinates,[52.7,72.37]);
});
test('station classes and cold/rain extensions follow the approved rules without rewriting raw values',()=>{
 const expected={darwin:['Aw',-3,500],'alice-springs':['BWh',-3,350],brisbane:['Cfa',-3,350],perth:['Csa',-3,350],hokitika:['Cfb',-3,350],rotuma:['Af',-3,400],moscow:['Dfb',-10,350],verkhoyansk:['Dsd',-50,350],vladivostok:['Dwb',-20,350],'malye-karmakuly':['ET',-20,350]};
 for(const c of cities){
  const before=JSON.stringify(c),a=climateAxes(c.temperatureC,c.precipitationMm),r=regionalClimateReading(c);
  assert.deepEqual([r.code,a.temperatureMin,a.rainMax],expected[c.id]);assert.equal(a.temperatureMax,40);
  assert.ok(r.definition&&r.reason&&r.landUse);assert.equal(JSON.stringify(c),before);
  for(const t of c.temperatureC)assert.ok(t>=a.temperatureMin&&t<=a.temperatureMax);
  for(const p of c.precipitationMm)assert.ok(p>=0&&p<=a.rainMax);
  for(let i=1;i<a.rainTicks.length;i++)assert.equal(a.rainTicks[i]-a.rainTicks[i-1],100);
  for(let i=1;i<a.temperatureTicks.length;i++)assert.equal(a.temperatureTicks[i]-a.temperatureTicks[i-1],10);
 }
});
