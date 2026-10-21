import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const data=JSON.parse(readFileSync(new URL('../public/assets/atlas/southeast-asia-v1/food-balances-2023.json',import.meta.url),'utf8'));
assert.equal(data.year,2023);
assert.equal(data.unit,'t');
assert.equal(data.scope.countries.length,10);
assert.equal(new Set(data.scope.countries).size,10);
assert.ok(!data.scope.countries.includes('TLS'));
assert.deepEqual(data.scope.excluded,['TLS']);
assert.deepEqual(data.commodities.map(row=>row.table),[7,22,37,52,67]);
// Original Table 7/22/52 totals have one-tonne discrepancies; do not silently balance them.
const expectedDifferences={rice:[0,-1],maize:[0,1],sugar:[0,0],soybean:[-1,0],cassava:[0,0]};
for(const row of data.commodities){
 const v=row.totals;
 for(const value of Object.values(v))assert.ok(Number.isSafeInteger(value)&&value>=0);
 assert.equal(v.totalSupply,v.totalDemand);
 assert.deepEqual([v.beginningStock+v.production+v.imports-v.totalSupply,v.domesticUtilization+v.exports+v.endingStock-v.totalDemand],expectedDifferences[row.id]);
}
// Independent published production/domestic-utilization ratios. Sugar Table 40 conflicts with Table 37.
for(const [id,ratio] of Object.entries({rice:110.52,maize:68.76,soybean:5.89,cassava:153.15})){
 const {totals}=data.commodities.find(row=>row.id===id);
 assert.equal(Number((totals.production/totals.domesticUtilization*100).toFixed(2)),ratio);
}
const rice=data.commodities.find(row=>row.id==='rice');
assert.deepEqual(rice.countries.map(row=>row.code).sort(),[...data.scope.countries].sort());
assert.equal(rice.countries.find(row=>row.code==='SGP').production,null);
assert.equal(rice.countries.find(row=>row.code==='BRN').exports,null);
assert.equal(rice.countries.find(row=>row.code==='MYS').beginningStock,null);
assert.deepEqual(rice.countries.find(row=>row.code==='PHL').estimatedFields,['beginningStock','production','imports','domesticUtilization']);
for(const row of rice.countries){
 for(const key of row.estimatedFields)assert.equal(typeof row[key],'number');
}
assert.ok(data.notes.some(note=>note.includes('Table 37')&&note.includes('Table 40')));
console.log('AFSIS 2023: five original balances, preserved discrepancies, ten-country rice scope and estimate/null semantics verified.');
