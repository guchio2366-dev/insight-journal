import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {westSawnwoodRow, westSawnwoodSeries} from '../../src/data/atlas/west-asia-forestry.mjs';

const data=JSON.parse(readFileSync(new URL('../../public/assets/atlas/west-asia-v1/data.json',import.meta.url)));

test('sawnwood flows retain original units, years and FAOSTAT flags',()=>{
  const turkey=westSawnwoodRow(data,'TUR',2024);
  assert.deepEqual(turkey.production,{value:9425000,flag:'E'});
  assert.deepEqual(turkey.imports,{value:949299,flag:'A'});
  assert.deepEqual(turkey.exports,{value:221253,flag:'A'});
  assert.equal(westSawnwoodSeries(data,'TUR').length,10);
  assert.deepEqual(westSawnwoodRow(data,'SAU',2024).imports,{value:1697646,flag:'X'});
});

test('zero is distinct from an absent forestry observation',()=>{
  assert.deepEqual(westSawnwoodRow(data,'SAU',2024).production,{value:0,flag:'E'});
  assert.equal(westSawnwoodRow(data,'SAU',1900).production,null);
  for(const country of data.countries){
    const row=westSawnwoodRow(data,country.code,2024);
    assert(row.production&&row.imports&&row.exports,`${country.code} 2024 flows incomplete`);
  }
});

test('all 600 retained country/year/flow observations remain separate and valid',()=>{
  assert.equal(data.countries.length,20);
  let count=0;
  for(const country of data.countries){
    const series=westSawnwoodSeries(data,country.code);
    assert.deepEqual(series.map(row=>row.year),Array.from({length:10},(_,i)=>2015+i));
    for(const row of series)for(const key of ['production','imports','exports']){
      assert.ok(row[key],`${country.code} ${row.year} ${key}`);
      assert.ok(['A','E','X'].includes(row[key].flag));
      assert.ok(row[key].value>=0);
      count++;
    }
  }
  assert.equal(count,600);
});
