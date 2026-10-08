import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('DGCIS rice partner rows reconcile with the published export totals',async()=>{
 const data=JSON.parse(await readFile(new URL('../../public/assets/atlas/south-central-asia-v1/india-rice-export-2023-24.json',import.meta.url),'utf8'));
 assert.equal(data.period,'2023-24年度');
 assert.equal(data.country,'IND');
 assert.equal(data.exports.basmati,5242182);
 assert.equal(data.exports.otherRice,11116703);
 assert.equal(data.basmatiDestinations.length,10);
 assert.equal(data.basmatiDestinations.reduce((sum,row)=>sum+row.quantity,0),4088488);
 assert.equal(data.exports.basmati-4088488,1153694);
 assert.ok(data.basmatiDestinations.every(row=>row.quantity>0));
 assert.match(data.source,/dgciskol\.gov\.in/);
});
