import test from 'node:test';
import assert from 'node:assert/strict';
import {japanClimateCities,japanAdditionalClimateCities,japanClimateSelectedRecordSha256} from '../../src/data/atlas/japan-climate-cities.ts';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {climateAxes} from '../../src/lib/atlas-climate-axes.ts';
test('日本6観測所は共通軸で実値を含み、札幌だけ最低気温に応じて広げる',()=>{
 const cities=japanClimateCities;assert.equal(cities.length,6);
 for(const city of cities){const axes=climateAxes(city.temperatureC,city.precipitationMm);assert.equal(axes.temperatureMin,city.id==='sapporo'?-10:-3);assert.equal(axes.temperatureMax,40);assert.equal(axes.rainMax,350);for(const t of city.temperatureC)if(t!==null)assert(t>=axes.temperatureMin&&t<=axes.temperatureMax);for(const r of city.precipitationMm)if(r!==null)assert(r>=0&&r<=axes.rainMax);}
});
test('追加3都市は公的月別平年列・期間・定義を保持し、丸め差を月値の変更で埋めない',()=>{
 const bytes=readFileSync(new URL('../../data-source/atlas/japan-second-pass/jma-selected-normals.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),japanClimateSelectedRecordSha256);
 const records=JSON.parse(bytes);assert.equal(records.length,3);
 for(const record of records){const city=japanAdditionalClimateCities.find(c=>c.id===record.id);assert.deepEqual(city.temperatureC,record.temperatureC);assert.deepEqual(city.precipitationMm,record.precipitationMm);assert.equal(city.normalPeriod,'1991–2020');assert.equal(city.temperatureC.length,12);assert.equal(city.precipitationMm.length,12);assert.equal(city.sourceUrl,record.sourceUrl);assert.match(city.notes.join(' '),/原HTMLのSHAではありません/);assert.match(record.license,/PDL1.0/);assert(Math.abs(city.precipitationMm.reduce((s,v)=>s+v,0)-record.sourceAnnualPrecipitationMm)<.2);}
 assert.equal(japanAdditionalClimateCities.find(c=>c.id==='matsumoto').temperatureC[0],-.3);
 assert.equal(japanAdditionalClimateCities.find(c=>c.id==='kanazawa').precipitationMm[11],301.1);
 assert.equal(japanAdditionalClimateCities.find(c=>c.id==='takamatsu').precipitationMm[0],39.4);
});
