import test from 'node:test';
import assert from 'node:assert/strict';
import countries from '../../src/data/atlas/europe/countries.json' with {type:'json'};
import {smreSource,smreRow,smreLargestGroup,smreSurfaceColor} from '../../src/lib/atlas-europe-smre-surface.ts';

test('SMRE overview covers precisely the atlas countries with original eight rounded categories',()=>{
  assert.deepEqual(smreSource.rows.map(row=>row.code).sort(),countries.map(country=>country.code).sort());
  for(const row of smreSource.rows){
    assert.equal(row.shares.length,8);assert.ok(row.shares.every(value=>value>=0&&value<=100));
    const total=Math.round(row.shares.reduce((a,b)=>a+b,0)*10)/10;
    const anomaly=smreSource.sourceAnomalies[row.code];
    if(anomaly)assert.equal(total,anomaly.publishedTotal);else assert.ok(Math.abs(total-100)<=.4,row.code);
    assert.ok([1,2,3].includes(row.quality));assert.ok(row.pdfPage>=57&&row.pdfPage<=63);
  }
  assert.equal(smreRow('BIH').shares[5],50.7);
  assert.equal(smreRow('DEU').shares[6],33.1,'unaffiliated is a published category, not a residual');
  assert.match(smreSource.license,/ODbL/);
});

test('broad confessional colours compare countries without creating internal regions',()=>{
  assert.equal(smreLargestGroup('POL').id,'catholic');
  assert.equal(smreLargestGroup('SWE').id,'protestant');
  assert.equal(smreLargestGroup('RUS').id,'orthodox');
  assert.equal(smreLargestGroup('BIH').id,'muslim');
  assert.equal(smreLargestGroup('CZE').id,'unaffiliated');
  assert.equal(smreLargestGroup('DEU').id,'mixed');
  assert.equal(smreSurfaceColor('UNKNOWN'),undefined);
});
