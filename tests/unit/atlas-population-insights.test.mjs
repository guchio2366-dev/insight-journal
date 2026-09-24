import test from 'node:test';
import assert from 'node:assert/strict';
import {populationInsights} from '../../src/data/atlas/population-insights.ts';
import {populationInsightUrl,populationComparisonUrl,readPopulationInsight,normalizePopulationInsight} from '../../src/lib/atlas-population-insight-state.ts';
const base='/insight-journal/atlas/north-america/';
const source=new URL('https://example.com'+base+'population/?popView=ethnicity&popCity=detroit&popGeo=county:26163&popEthnicity=black&view=custom&lng=-83&lat=42&z=6');

test('all four destinations preserve the source selection and camera through a direct URL',()=>{
 for(const item of populationInsights){
  const target=populationInsightUrl(source,base,item.id),ctx=readPopulationInsight(new URL(target.href),base);
  assert.equal(ctx.item.id,item.id);assert.equal(target.searchParams.has('z'),false);
  assert.equal(target.pathname,base+item.page+'/');
  for(const key of ['popView','popCity','popGeo','popEthnicity','view','lng','lat','z'])assert.equal(ctx.back.searchParams.get(key),source.searchParams.get(key));
  assert.equal(ctx.back.origin,source.origin);assert.equal(ctx.back.pathname,base+'population/');
 }
});

test('comparison preserves the same camera and return target, and clears incompatible state',()=>{
 for(const id of ['black-belt-vote','lds-vote']){
  const target=populationInsightUrl(source,base,id);
  for(const [k,v] of new URLSearchParams('view=custom&lng=-111.8&lat=40.4&z=7'))target.searchParams.set(k,v);
  const origin=populationComparisonUrl(target,base,true),vote=populationComparisonUrl(origin,base,false);
  assert.ok(readPopulationInsight(origin,base).origin);assert.equal(readPopulationInsight(vote,base).origin,false);
  assert.equal(origin.searchParams.has('popVoteState'),false);
  for(const key of ['view','lng','lat','z','popStoryReturn'])assert.equal(origin.searchParams.get(key),target.searchParams.get(key));
  assert.deepEqual([...vote.searchParams].sort(),[...target.searchParams].sort());
 }
});

test('unrelated destinations dismiss the story and forged return targets remain local',()=>{
 for(const item of populationInsights){
  const target=populationInsightUrl(source,base,item.id);target.pathname=base+'agriculture/';
  assert.equal(normalizePopulationInsight(target,base).searchParams.has('popStory'),false);
  for(const invalid of ['https://evil.example/','popView=vote&popView=religion','evil=1','x'.repeat(1700)]){
   const malicious=populationInsightUrl(source,base,item.id);malicious.searchParams.set('popStoryReturn',invalid);
   const back=readPopulationInsight(malicious,base).back;
   assert.equal(back.origin,source.origin);assert.equal(back.pathname,base+'population/');assert.equal(back.searchParams.has('evil'),false);
  }
 }
});
