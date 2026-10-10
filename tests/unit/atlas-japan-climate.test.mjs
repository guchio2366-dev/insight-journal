import test from 'node:test';
import assert from 'node:assert/strict';
import {asiaClimateCities} from '../../src/data/atlas/asia-climate-cities.ts';
import {climateAxes} from '../../src/lib/atlas-climate-axes.ts';
test('日本3観測所は#300の共通軸で実値を含み、札幌だけ最低気温に応じて広げる',()=>{
 const cities=asiaClimateCities.filter(c=>c.countryCode==='JPN');assert.equal(cities.length,3);
 for(const city of cities){const axes=climateAxes(city.temperatureC,city.precipitationMm);assert.equal(axes.temperatureMin,city.id==='sapporo'?-10:-3);assert.equal(axes.temperatureMax,40);assert.equal(axes.rainMax,350);for(const t of city.temperatureC)if(t!==null)assert(t>=axes.temperatureMin&&t<=axes.temperatureMax);for(const r of city.precipitationMm)if(r!==null)assert(r>=0&&r<=axes.rainMax);}
});
