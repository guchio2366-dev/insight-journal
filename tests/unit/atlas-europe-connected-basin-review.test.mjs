import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Danube connection evidence does not promote a clipped display group or partial river line to a full river basin',async()=>{
  const evidence=JSON.parse(await readFile('data-source/atlas/europe/drainage/connected-basin-review.json'));
  const danube=evidence.reviews.find(row=>row.name==='Danube');
  assert.equal(danube.unitCount,9);
  assert.equal(danube.sourceNetworkClosed,true);
  assert.deepEqual(danube.pfafDigits,[1,2,3,4,5,6,7,8,9]);
  assert.equal(danube.lineStartBasin,2040539930);
  assert.equal(danube.lineEndBasin,danube.mainBasin);
  assert.equal(danube.mainstemComplete,false);
  assert.match(danube.productDecision,/Do not call this a verified complete/);
});
