import test from 'node:test';
import assert from 'node:assert/strict';
import { europeReligionRegionalEvidence, religionEvidenceShare } from '../../src/data/atlas/europe/religion-regional-evidence.ts';

test('regional religion excerpts retain distinct sources, denominators and question scopes',()=>{
  assert.equal(europeReligionRegionalEvidence.length,7);
  assert.equal(new Set(europeReligionRegionalEvidence.map(row=>row.id)).size,7);
  for(const row of europeReligionRegionalEvidence){
    assert.ok(row.source.startsWith('https://'));
    assert.ok(row.license&&row.universe&&row.question&&row.coordinateMeaning);
    assert.ok(row.denominator>0);
    assert.ok(row.measures.every(item=>item.count>=0&&item.count<=row.denominator));
  }
  const subotica=europeReligionRegionalEvidence.find(row=>row.id==='religion-subotica');
  assert.deepEqual(subotica.measures.map(item=>item.count),[59748,37674]);
  assert.ok(Math.abs(religionEvidenceShare(59748,123952)-48.2)<.01);
  assert.match(europeReligionRegionalEvidence.find(row=>row.id==='religion-narva').universe,/15歳以上の標本調査/);
  assert.notEqual(europeReligionRegionalEvidence.find(row=>row.id==='religion-usti').question,europeReligionRegionalEvidence.find(row=>row.id==='religion-saare').question);
});
