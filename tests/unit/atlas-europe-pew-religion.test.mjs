import test from 'node:test';
import assert from 'node:assert/strict';
import { pew2020EuropeRows, pew2020EuropeGroups, pew2020Share } from '../../src/data/atlas/europe/pew-religion-2020.ts';

test('Pew 2020 European excerpt preserves seven groups and explicit less-than values',()=>{
  assert.equal(pew2020EuropeGroups.length,7);
  assert.equal(pew2020EuropeRows.length,40);
  assert.equal(new Set(pew2020EuropeRows.map(row=>row.code)).size,40);
  assert.equal(pew2020Share('<0.1'),null);
  for(const row of pew2020EuropeRows){
    assert.equal(row.shares.length,7,row.code);
    assert.ok(row.shares.every(share=>share==='<0.1'||/^\d+\.\d$/.test(share)),row.code);
    const lowerBound=row.shares.reduce((sum,share)=>sum+(pew2020Share(share)??0),0);
    assert.ok(lowerBound>=99.2&&lowerBound<=100.6,`${row.code}: rounded group total ${lowerBound}`);
  }
  const byCode=Object.fromEntries(pew2020EuropeRows.map(row=>[row.code,row.shares]));
  assert.deepEqual(byCode.CZE.slice(0,3),['26.4','0.3','72.8']);
  assert.deepEqual(byCode.KOS.slice(0,3),['5.6','94.3','0.1']);
  assert.deepEqual(byCode.SRB.slice(0,3),['91.5','4.4','4.0']);
});
