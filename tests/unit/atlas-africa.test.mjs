import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {countries,metrics,readState,writeState,valueAt,defaultYear,fillFor,rankedCountries} from '../../src/data/atlas/africa-atlas.ts';
import {africaPath,africaRings,clipAfricaRing,projectAfrica} from '../../src/lib/atlas-africa-geometry.ts';
const geo=JSON.parse(readFileSync(new URL('../../src/data/atlas/africa-geography.json',import.meta.url)));

test('Africa includes 54 countries plus Western Sahara, including island states and South Sudan',()=>{
 assert.equal(countries.length,55);assert.equal(countries.filter(c=>c.statistical).length,54);assert.equal(new Set(countries.map(c=>c.code)).size,55);
 for(const code of ['CPV','STP','COM','MUS','SYC','SSD','ESH','SOM']){const c=countries.find(c=>c.code===code);assert.ok(c?.name);const feature=geo.features.find(f=>f.properties.code===code);assert.ok(africaPath(feature.geometry).startsWith('M'));assert.ok(!/NaN|Infinity/.test(africaPath(feature.geometry)));}
 assert.ok(!countries.some(c=>c.code==='SOL'));
});
test('clip preserves intersections, holes, island paths and projection orientation',()=>{
 const clipped=clipAfricaRing([[-30,-40],[70,-40],[70,45],[-30,45],[-30,-40]]);
 assert.deepEqual(new Set(clipped.map(p=>p.join(','))),new Set(['-27,-36','64,-36','64,39','-27,39']));
 assert.deepEqual(clipAfricaRing([[80,0],[81,0],[81,1],[80,0]]),[]);
 for(const f of geo.features)assert.ok(africaRings(f.geometry).flat().every(([lon,lat])=>lon>=-27&&lon<=64&&lat>=-36&&lat<=39));
 assert.ok(projectAfrica([31,30])[1]<projectAfrica([18,-34])[1]);
 assert.ok(projectAfrica([-17,14])[0]<projectAfrica([39,-6])[0]);
});
test('WDI source values match fixed independent source spot checks; missing is never zero or previous year',()=>{
 assert.equal(valueAt('SP.POP.TOTL','NGA',2023),227882945);
 assert.equal(valueAt('SP.POP.TOTL','EGY',2023),114535772);
 assert.equal(valueAt('AG.YLD.CREL.KG','EGY',2023),7402.2);
 assert.equal(valueAt('AG.YLD.CREL.KG','NGA',2023),1548.6);
 assert.equal(valueAt('NY.GDP.TOTL.RT.ZS','NGA',2023),null);
 for(const m of metrics)assert.equal(valueAt(m.id,'ESH',2021),null);
 assert.equal(valueAt('AG.LND.PRCP.MM','EGY',2000),valueAt('AG.LND.PRCP.MM','EGY',2024));
 assert.equal(defaultYear('NY.GDP.TOTL.RT.ZS'),2021);
 assert.equal(defaultYear('ER.H2O.INTR.PC'),2022);
});
test('URL codec preserves four fields, comparison, filters and zoom; rejects invalid and prototype values',()=>{
 const state=readState('?field=industry&metric=NY.GDP.TOTL.RT.ZS&place=COD&compare=ZAF&region=central&year=2021&zoom=country');
 assert.deepEqual(readState(writeState(state,new URL('https://example.com/atlas/africa/?utm=test')).search),state);
 for(const field of ['bad','__proto__','constructor'])assert.equal(readState(`?field=${field}&region=${field}`).field,'nature');
 assert.equal(readState('?field=population&metric=AG.LND.ARBL.ZS&place=BAD&year=9999&zoom=bad').metric,'SP.POP.TOTL');
 assert.equal(readState('?place=COD&compare=COD').compare,'');
});
test('fixed color thresholds distinguish zero, negative growth and missing; counts have proportional symbols',()=>{
 const m=metrics.find(m=>m.id==='SP.POP.GROW');assert.notEqual(fillFor(null,m),fillFor(0,m));assert.notEqual(fillFor(-1,m),fillFor(1,m));
 assert.ok(metrics.find(m=>m.id==='SP.POP.TOTL').symbols);
 const state=readState('?field=population&region=west&year=2023');const rows=rankedCountries(state);
 assert.ok(rows.every(c=>c.region==='west'));assert.equal(rows[0].code,'NGA');
 assert.equal(metrics.length,15);assert.deepEqual(new Set(metrics.map(m=>m.field)),new Set(['nature','agriculture','industry','population']));
});
