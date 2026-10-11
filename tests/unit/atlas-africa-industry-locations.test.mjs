import test from 'node:test';
import assert from 'node:assert/strict';
import {africaIndustryLocations,africaIndustryLocationById,africaIndustryLocationOverview,africaIndustryCommodities} from '../../src/data/atlas/africa-industry-locations.ts';
import {themeById} from '../../src/data/atlas/africa-themes.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';

test('industry examples cover distinct production and service roles with sourced geographic limits',()=>{
 const expected=['hassi-rmel-gas','niger-delta-oil','drc-copper-cobalt','zambia-copperbelt','jwaneng-diamonds','casablanca-industry','lagos'];
 assert.deepEqual(africaIndustryLocations.slice(0,expected.length).map(row=>row.id),expected);
 assert.equal(new Set(africaIndustryLocations.map(row=>row.id)).size,africaIndustryLocations.length);
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

test('commodity joins cover broad roles and distinguish source geography and operating status',()=>{
 const ids=new Set(africaIndustryCommodities.map(row=>row.id));
 assert.equal(ids.size,18);
 for(const row of africaIndustryLocations){
  assert.ok(row.commodityIds.length);assert.ok(row.countryCodes.length);
  for(const id of row.commodityIds)assert.ok(ids.has(id));
  assert.ok(['production','development','paused'].includes(row.status));
  assert.ok(['region','country','urban'].includes(row.geographicScope));
  assert.ok(row.evidencePeriod);
 }
 for(const id of ids)assert.ok(africaIndustryLocations.some(row=>row.commodityIds.includes(id)),`no region for ${id}`);
 for(const id of ['oil','gas','uranium','copper-cobalt','bauxite-iron','pgm-chromium','lithium','tantalum-tin','graphite','rare-earth','gold','automotive-aerospace','textile-apparel','food-processing','urban-services']){
  assert.ok(africaIndustryLocations.filter(row=>row.commodityIds.includes(id)).length>=2,`multiple source regions for ${id}`);
 }
 assert.equal(africaIndustryLocationById('phalaborwa-rare-earth').status,'development');
 assert.equal(africaIndustryLocationById('gakara-rare-earth').status,'paused');
 assert.equal(africaIndustryLocationById('balama-graphite').status,'paused');
 assert.equal(africaIndustryLocationById('mozambique-tantalum').geographicScope,'country');
 assert.deepEqual(africaIndustryLocationById('hassi-rmel-gas').coordinates,[3.3,32.9]);
 assert.deepEqual(africaIndustryLocationById('jwaneng-diamonds').coordinates,[24.7,-24.6]);
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
