import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {validateReligionData,validateReligionDominantData,religiousShareColor,religiousShareLabel} from '../../src/lib/atlas-population-religion.ts';
import {validateReligionOverview} from '../../src/lib/atlas-population-religion-overview.ts';
import {missingColor,shareColors} from '../../src/data/atlas/population.ts';
const reviewed=JSON.parse(await readFile('data/atlas/population-religion-reviewed.json','utf8'));
const overview=JSON.parse(await readFile('data/atlas/population-religion-overview-reviewed.json','utf8'));
const dominant=JSON.parse(await readFile('data/atlas/population-religion-dominant-reviewed.json','utf8'));
test('county religion winners reconcile with reviewed categories and 2020 boundaries',async()=>{
 assert.ok(validateReligionDominantData(dominant));assert.equal(dominant.rows.length,3108);assert.deepEqual(Object.fromEntries(dominant.categories.map(item=>[item.id,item.count])),{catholic:1221,southern_baptist:1056,mainline_protestant:327,nondenominational:274,other_conservative_protestant:116,latter_day_saints:94,black_protestant:15,other:2,unreported:3});
 const path='public/assets/atlas/population/v1/religion-counties-2020.geo.json.gz',geometry=JSON.parse(gunzipSync(await readFile(path)));assert.equal(geometry.features.length,3108);assert.deepEqual(new Set(geometry.features.map(feature=>feature.properties.id)),new Set(dominant.rows.map(row=>row.id)));assert.ok((await stat(path)).size<1_200_000);
 const broken=structuredClone(dominant);broken.rows[0].category='unknown';assert.equal(validateReligionDominantData(broken),false);
 const duplicate=structuredClone(dominant);duplicate.rows[1].id=duplicate.rows[0].id;assert.equal(validateReligionDominantData(duplicate),false);
});
test('national religion overview preserves Pew parent categories and the published rounding gap',()=>{
 assert.ok(validateReligionOverview(overview));assert.equal(overview.categories.reduce((sum,item)=>sum+item.value,0),98);
 const duplicate=structuredClone(overview);duplicate.categories[0].id=duplicate.categories[1].id;assert.equal(validateReligionOverview(duplicate),false);
 const over=structuredClone(overview);over.categories[0].value=101;assert.equal(validateReligionOverview(over),false);
});
test('reviewed religion observations require ten groups, adult universe and unique valid states',()=>{
 assert.ok(validateReligionData(reviewed));const d=structuredClone(reviewed);d.rows=[{id:'state:06',shares:structuredClone(d.national)}];assert.ok(validateReligionData(d));d.rows.push(d.rows[0]);assert.equal(validateReligionData(d),false);d.rows.pop();d.rows[0].id='county:06037';assert.equal(validateReligionData(d),false);d.rows[0].id='state:60';assert.equal(validateReligionData(d),false);d.rows=[];d.universe='all residents';assert.equal(validateReligionData(d),false);
});
test('less-than values, suppressed cells and intervals crossing bins never become exact points',()=>{
 const less={status:'bounded',lower:0,upper:1,upperExclusive:true};assert.equal(religiousShareLabel(less),'1%未満');assert.equal(religiousShareColor(less),missingColor);assert.equal(religiousShareColor({status:'value',value:0}),shareColors[0]);assert.equal(religiousShareColor({status:'bounded',lower:1,upper:5,upperExclusive:true}),shareColors[2]);assert.equal(religiousShareColor({status:'bounded',lower:1,upper:5,upperExclusive:false}),missingColor);assert.equal(religiousShareColor({status:'suppressed',reason:'small sample'}),missingColor);assert.equal(religiousShareLabel({status:'suppressed',reason:'small sample'}),'非公表');
});
test('unknown parent aggregates stay missing and malformed observations are rejected',()=>{
 assert.equal(reviewed.national.otherChristian.status,'missing');assert.equal(reviewed.national.other.status,'missing');assert.equal(reviewed.national.protestant.value,40);const d=structuredClone(reviewed);d.national.muslim={status:'value',value:NaN};assert.equal(validateReligionData(d),false);d.national.muslim={status:'value',value:101};assert.equal(validateReligionData(d),false);delete d.national.muslim;assert.equal(validateReligionData(d),false);
});
