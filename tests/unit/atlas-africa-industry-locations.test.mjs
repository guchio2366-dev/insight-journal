import test from 'node:test';
import assert from 'node:assert/strict';
import {africaIndustryLocations,africaIndustryLocationById,africaIndustryLocationOverview} from '../../src/data/atlas/africa-industry-locations.ts';
import {themeById} from '../../src/data/atlas/africa-themes.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';

test('industry and city examples retain the approved representative points, full prose and every source',()=>{
 const expected=['zambia-copperbelt','zambia-northwest','lusaka','casablanca-industry','casablanca-airport','lagos','accra','nairobi','cairo','alexandria','luxor'];
 assert.deepEqual(africaIndustryLocations.map(row=>row.id),expected);
 for(const location of africaIndustryLocations){
  const theme=themeById(location.themeId),mark=theme.marks.find(row=>row.id===location.id);
  assert.strictEqual(africaIndustryLocationById(location.id),location);
  assert.ok(mark,'each displayed location belongs to an approved source theme');
  assert.deepEqual(location.coordinates,mark.coordinates,'no new facility, mine, route or extent is inferred');
  assert.equal(location.coordinates.length,2);assert.ok(location.coordinates.every(Number.isFinite));
  assert.equal(location.label,mark.label);assert.equal(location.note,mark.note);
  assert.equal(location.reading,theme.takeaway);
  assert.deepEqual(location.sources,[{label:theme.sourceLabel,url:theme.source},...(theme.evidenceSources??[])]);
  assert.equal(location.scope,africaIndustryLocationOverview.scope);
 }
 assert.match(africaIndustryLocationOverview.scope,/正確な施設位置や境界ではなく/);
 assert.match(africaIndustryLocationOverview.scope,/生産量・埋蔵量・雇用・都市人口を表しません/);
 assert.match(africaIndustryLocationOverview.missing,/原油や複数の鉱物/);
 assert.match(africaIndustryLocationOverview.missing,/未収録/);
});

test('every industry location reloads independently of obsolete country comparisons and is scoped to industry',()=>{
 const base=new URL('https://example.com/atlas/africa/?utm=preserve');
 for(const {id} of africaIndustryLocations){
  const state=readState('?'+new URLSearchParams({field:'industry',industryLocation:id,place:'ZMB',compare:'MAR',year:'2023',view:'statistics',context:'NV.IND.TOTL.ZS',sourceState:'field=industry&place=ZMB'}));
  assert.equal(state.industryLocation,id);
  const written=writeState({...state},new URL(base));
  assert.equal(written.searchParams.get('industryLocation'),id);assert.equal(written.searchParams.get('utm'),'preserve');
  assert.equal(readState(written.search).industryLocation,id);
  for(const key of ['place','compare','year','metric','view','context','sourceState'])assert.equal(written.searchParams.has(key),false,key);
  for(const field of ['nature','agriculture','population']){
   assert.equal(readState('?'+new URLSearchParams({field,industryLocation:id})).industryLocation,'');
   const changed={...state,field};
   assert.equal(writeState(changed,new URL(written)).searchParams.has('industryLocation'),false);
   assert.equal(changed.industryLocation,'');
  }
 }
 for(const id of ['constructor','__proto__','Lagos','lagos,accra',' lagos ','nile-approximate','nigeria-oil']){
  assert.equal(africaIndustryLocationById(id),undefined);
  assert.equal(readState('?'+new URLSearchParams({field:'industry',industryLocation:id})).industryLocation,'');
 }
});
