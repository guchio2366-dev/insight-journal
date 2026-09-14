import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateReligionData,religiousShareColor,religiousShareLabel} from '../../src/lib/atlas-population-religion.ts';
import {missingColor,shareColors} from '../../src/data/atlas/population.ts';
const reviewed=JSON.parse(await readFile('data/atlas/population-religion-reviewed.json','utf8'));
test('reviewed religion observations require ten groups, adult universe and unique valid states',()=>{
 assert.ok(validateReligionData(reviewed));const d=structuredClone(reviewed);d.rows=[{id:'state:06',shares:structuredClone(d.national)}];assert.ok(validateReligionData(d));d.rows.push(d.rows[0]);assert.equal(validateReligionData(d),false);d.rows.pop();d.rows[0].id='county:06037';assert.equal(validateReligionData(d),false);d.rows[0].id='state:60';assert.equal(validateReligionData(d),false);d.rows=[];d.universe='all residents';assert.equal(validateReligionData(d),false);
});
test('less-than values, suppressed cells and intervals crossing bins never become exact points',()=>{
 const less={status:'bounded',lower:0,upper:1,upperExclusive:true};assert.equal(religiousShareLabel(less),'1%未満');assert.equal(religiousShareColor(less),missingColor);assert.equal(religiousShareColor({status:'value',value:0}),shareColors[0]);assert.equal(religiousShareColor({status:'bounded',lower:1,upper:5,upperExclusive:true}),shareColors[2]);assert.equal(religiousShareColor({status:'bounded',lower:1,upper:5,upperExclusive:false}),missingColor);assert.equal(religiousShareColor({status:'suppressed',reason:'small sample'}),missingColor);assert.equal(religiousShareLabel({status:'suppressed',reason:'small sample'}),'非公表');
});
test('unknown parent aggregates stay missing and malformed observations are rejected',()=>{
 assert.equal(reviewed.national.otherChristian.status,'missing');assert.equal(reviewed.national.other.status,'missing');assert.equal(reviewed.national.protestant.value,40);const d=structuredClone(reviewed);d.national.muslim={status:'value',value:NaN};assert.equal(validateReligionData(d),false);d.national.muslim={status:'value',value:101};assert.equal(validateReligionData(d),false);delete d.national.muslim;assert.equal(validateReligionData(d),false);
});
