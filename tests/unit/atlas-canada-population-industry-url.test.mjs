import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canadaPopulationIndustryUrl,readCanadaPopulationState} from '../../src/lib/atlas-canada-population.ts';
const geometry=JSON.parse(await readFile('src/data/atlas/canada/population-geometry.json','utf8')).features;
const provinces=JSON.parse(await readFile('src/data/atlas/canada/industry.json','utf8')).provinces;
const base='https://example.com/insight-journal/atlas/north-america/canada/';
test('Population-to-industry compares official constituent provinces and retains the source selection without copying unrelated parameters',()=>{
 for(const [cma,compare,expected] of [['535','462',['Ontario','Quebec']],['933',null,['British Columbia']],['505',null,['Quebec','Ontario']],['505','933',['Quebec','British Columbia']],['933','505',['British Columbia','Quebec']]]){
  const state={year:2016,cma,compare,metric:'population',only:true,zoom:'selected'};
  const target=canadaPopulationIndustryUrl(new URL(base+'population/?private=omit'),new URL(base+'industry/'),state,geometry,provinces);
  assert.equal(target.pathname,new URL(base+'industry/').pathname);assert.equal(target.searchParams.get('year'),'2025');assert.equal(target.searchParams.get('metric'),'services');
  assert.equal(target.searchParams.get('province'),expected[0]);assert.equal(target.searchParams.get('compare'),expected[1]??null);
  const raw=target.searchParams.get('populationReturn');assert.ok(raw);assert.equal(new URLSearchParams(raw).has('private'),false);
  assert.deepEqual(readCanadaPopulationState(new URL('?'+raw,base),geometry.map(g=>g.id)),state);
 }
});
