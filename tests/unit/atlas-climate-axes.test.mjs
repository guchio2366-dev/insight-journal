import test from 'node:test';
import assert from 'node:assert/strict';
import {climateAxes} from '../../src/lib/atlas-climate-axes.ts';
import {climatePlotCities} from '../fixtures/climate-plot-cities.mjs';
const months = v => Array(12).fill(v);
const step = (ticks, expected) => ticks.slice(1).forEach((v, i) => assert.equal(v - ticks[i], expected));

test('ordinary, cold, hot, and rainy domains retain linear intervals and minimally extend', () => {
 const ordinary = climateAxes(months(25), months(310));
 assert.equal(ordinary.temperatureMin, -3); assert.equal(ordinary.temperatureMax, 40);
 assert.equal(ordinary.rainMax, 350); assert.deepEqual(ordinary.rainTicks, [0,100,200,300]);
 assert.deepEqual(ordinary.temperatureTicks, [0,10,20,30,40]);
 for (const [value, limit] of [[-3,-3],[-3.1,-10],[-20,-20],[-20.1,-30]]) assert.equal(climateAxes(months(value), months(0)).temperatureMin, limit);
 for (const [value, limit] of [[40,40],[40.1,50],[51,60]]) assert.equal(climateAxes(months(value), months(0)).temperatureMax, limit);
 for (const [value, limit] of [[350,350],[350.1,400],[400,400],[645.5,650],[1201,1250]]) {
  const axes = climateAxes(months(28), months(value));
  assert.equal(axes.rainMax, limit); step(axes.rainTicks, 100);
  assert.ok(limit - value < 50); assert.equal(axes.peakRain, value);
 }
});

test('every stored regional station has twelve months and fits the same axis rules', () => {
 for (const [region, cities] of Object.entries(climatePlotCities)) for (const city of cities) {
  const axes = climateAxes(city.temperatureC, city.precipitationMm);
  step(axes.temperatureTicks, 10); step(axes.rainTicks, 100);
  for (const v of city.temperatureC.filter(v => v !== null)) assert.ok(v >= axes.temperatureMin && v <= axes.temperatureMax, `${region}/${city.id}: temperature ${v}`);
  for (const v of city.precipitationMm.filter(v => v !== null)) assert.ok(v >= 0 && v <= axes.rainMax, `${region}/${city.id}: rain ${v}`);
  if (axes.rainMax > 350) {assert.ok(axes.rainMax - axes.peakRain < 50); assert.ok(axes.peakLabel.includes(String(axes.peakMonths[0])));}
 }
});

test('missing, zero, ties, and malformed values remain distinct', () => {
 const missing = climateAxes(months(null), months(null));
 assert.equal(missing.temperatureMin, -3); assert.equal(missing.rainMax, 350); assert.deepEqual(missing.peakMonths, []);
 const rain = [null,0,750.6,750.6,...Array(8).fill(10)];
 const axes = climateAxes(months(30), rain);
 assert.deepEqual(axes.peakMonths, [3,4]); assert.match(axes.peakLabel, /3・4月 750.6 mm/);
 for (const [t, r] of [[months(NaN),months(1)],[months(1),months(-1)],[months(1),months(Infinity)],[[],months(1)]]) assert.throws(() => climateAxes(t,r));
});
