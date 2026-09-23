import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {ethnicityComposition,ethnicityFill,ethnicityMissingColor,cityEthnicityCounts,ethnicityCityCounties} from '../../src/lib/atlas-population-concentration.ts';
import {ethnicityColors,dominantCategory} from '../../src/lib/atlas-population-dominant.ts';
const counts=ns=>ns.map(n=>[n,null]);
const national=counts([55,12,20,6,1,1,4,1]);
test('a non-largest group can qualify by relative share; 20% and 5% limits are inclusive',()=>{
 assert.deepEqual(ethnicityComposition(counts([80,0,0,9,5,0,6,0]),national).qualified,[3,4,6]);
 assert.deepEqual(ethnicityComposition(counts([76,0,20,0,4,0,0,0]),national).qualified,[2]);
 assert.deepEqual(ethnicityComposition(counts([77,0,19,0,4,0,0,0]),national).qualified,[]);
 assert.equal(ethnicityFill(counts([80,0,0,9,5,0,6,0]),national),ethnicityColors[3]);
});
test('multiple qualifying groups remain available; largest qualifying share gives the fill with stable ties',()=>{
 const result=ethnicityComposition(counts([40,20,20,10,5,0,5,0]),national);
 assert.deepEqual(result.qualified,[1,2,3,4]);assert.equal(result.primary,1);
 assert.equal(ethnicityFill(counts([95,1,1,1,1,0,1,0]),national),ethnicityColors[0]);
});
test('missing, invalid and zero estimates stay distinct from a gray context county',()=>{
 for(const row of [undefined,[],counts([0,0,0,0,0,0,0,0]),counts([90,null,0,0,0,0,0,0]),counts([90,-1,0,0,0,0,0,0]),counts([Infinity,0,0,0,0,0,0,0])])assert.equal(ethnicityFill(row,national),ethnicityMissingColor);
 assert.equal(ethnicityComposition(national,undefined),null);
 assert.equal(ethnicityComposition(national,counts([0,0,0,0,0,0,0,0])),null);
});
test('real county data reveals King County Asian concentration and retains each city scope without invented estimates',()=>{
 const data=JSON.parse(gunzipSync(readFileSync('public/assets/atlas/population/v1/ethnicity.json.gz'))),rows=new Map(data.rows.map(row=>[row.id,row]));
 const king=rows.get('county:53033');assert.equal(dominantCategory(king.counts),0);
 assert.ok(ethnicityComposition(king.counts,data.national).qualified.includes(3));
 for(const city of Object.keys(ethnicityCityCounties))assert.ok(ethnicityComposition(cityEthnicityCounts(city,rows),data.national),city);
 const ny=cityEthnicityCounts('new-york',rows);assert.equal(ny[0][0],ethnicityCityCounties['new-york'].reduce((sum,id)=>sum+rows.get('county:'+id).counts[0][0],0));
 assert.equal(cityEthnicityCounts('new-york',new Map()),null);
 const bay=ethnicityComposition(cityEthnicityCounts('san-francisco',rows),data.national);assert.ok(bay.qualified.includes(2));assert.ok(bay.qualified.includes(3));
});
