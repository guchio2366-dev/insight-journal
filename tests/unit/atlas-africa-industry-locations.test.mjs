import test from 'node:test';
import assert from 'node:assert/strict';
import {africaIndustryLocations,africaIndustryLocationById,africaIndustryLocationOverview} from '../../src/data/atlas/africa-industry-locations.ts';
import {themeById} from '../../src/data/atlas/africa-themes.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';

test('industry examples cover distinct production and service roles with sourced geographic limits',()=>{
 const expected=['hassi-rmel-gas','niger-delta-oil','drc-copper-cobalt','zambia-copperbelt','jwaneng-diamonds','casablanca-industry','lagos'];
 assert.deepEqual(africaIndustryLocations.map(row=>row.id),expected);
 for(const location of africaIndustryLocations){
  assert.strictEqual(africaIndustryLocationById(location.id),location);
  assert.equal(location.coordinates.length,2);assert.ok(location.coordinates.every(Number.isFinite));
  assert.ok(location.mapLabel.includes('：'));assert.ok(location.sources.length);
  for(const source of location.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.label);}
  assert.equal(location.scope,africaIndustryLocationOverview.scope);
  if(location.themeId){const theme=themeById(location.themeId),mark=theme.marks.find(row=>row.id===location.id);assert.deepEqual(location.coordinates,mark.coordinates);assert.equal(location.reading,theme.takeaway);assert.deepEqual(location.sources,[{label:theme.sourceLabel,url:theme.source},...(theme.evidenceSources??[])]);}
 }
 assert.deepEqual(new Set(africaIndustryLocations.map(row=>row.kind)),new Set(['energy','metals','gems','manufacturing','transport']));
 assert.match(africaIndustryLocationOverview.reading,/ガス.*原油.*銅・コバルト.*ダイヤモンド/);
 assert.match(africaIndustryLocationOverview.scope,/産出量、埋蔵量/);
 assert.match(africaIndustryLocationById('jwaneng-diamonds').reading,/2024年.*ボツワナ全国.*カラット.*米ドル.*埋蔵量ではありません/);
 assert.match(africaIndustryLocationById('drc-copper-cobalt').reading,/2024年.*コバルト生産国.*埋蔵量/);
});

test('every industry location reloads independently of obsolete country comparisons and is scoped to industry',()=>{
 const base=new URL('https://example.com/atlas/africa/?utm=preserve');
 for(const {id} of africaIndustryLocations){
  const state=readState('?'+new URLSearchParams({field:'industry',industryLocation:id,place:'ZMB',compare:'MAR',year:'2023',view:'statistics',context:'NV.IND.TOTL.ZS',sourceState:'field=industry&place=ZMB'}));
  assert.equal(state.industryLocation,id);
  const written=writeState({...state},new URL(base));
  assert.equal(written.searchParams.get('industryLocation'),id);assert.equal(written.searchParams.get('utm'),'preserve');
  assert.equal(readState(written.search).industryLocation,id);
  for(const key of ['place','compare','year','metric','view','context','sourceState'])assert.equal(written.searchParams.has(key),true,`existing national comparison keeps ${key}`);
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
