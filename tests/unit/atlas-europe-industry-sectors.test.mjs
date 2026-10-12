import {europeComparisonUrl,europeNamedReturnUrl,readEuropeReturn} from '../../src/lib/atlas-europe-comparison.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {europeReadings} from '../../src/data/atlas/europe/readings.ts';
import {europeIndustrySectors,europeIndustrySectorCopy,europeIndustryInSector,europeIndustryGroupsForSite,europeIndustrySectorForGroup} from '../../src/lib/atlas-europe-industry.ts';
import {readEuropeState,writeEuropeState} from '../../src/lib/atlas-europe-view.ts';
const countries=[{code:'DEU',region:'west'}];
test('three purposes retain all 22 previous sites and distinguish extraction and shared processing stages',()=>{
 const sites=europeReadings.filter(r=>r.field==='industry');
 assert.equal(sites.length,30);
 for(const sector of europeIndustrySectors){
  const members=sites.filter(site=>europeIndustryInSector(site.id,sector));assert.ok(members.length>=9);
  for(const group of europeIndustrySectorCopy[sector].groups)assert.ok(members.some(site=>europeIndustryGroupsForSite(site.id,sector).includes(group)),sector+group);
  for(const id of europeIndustrySectorCopy[sector].labels)assert.ok(members.some(site=>site.id===id));
 }
 for(const site of sites){assert.ok(europeIndustrySectors.some(sector=>europeIndustryInSector(site.id,sector)));assert.ok(site.source.startsWith('https://'));}
 for(const id of ['pernis','glogow'])for(const sector of ['resources','manufacturing'])assert.ok(europeIndustryInSector(id,sector));
 assert.equal(europeIndustryInSector('lubin','manufacturing'),false);
 assert.equal(europeIndustryInSector('kiruna','manufacturing'),false);
 assert.equal(europeIndustryInSector('wageningen_food','services'),true);
 assert.equal(europeIndustryInSector('wageningen_food','manufacturing'),false,'research is not a production point');
});
test('legacy groups infer a compatible sector; solo state requires a valid group and survives history URLs',()=>{
 for(const [group,sector]of [['自動車・機械','manufacturing'],['金融','services'],['エネルギー','resources']]){
  assert.equal(europeIndustrySectorForGroup(group),sector);
  const state=readEuropeState('?layer=hubs&industryGroup='+group+'&industryOnly=1',countries,[],'hubs');
  assert.equal(state.industrySector,sector);assert.equal(state.industryOnly,true);
  assert.deepEqual(readEuropeState(writeEuropeState(new URL('https://example.test/atlas/europe/industry/'),state).search,countries,[],'hubs'),state);
 }
 for(const query of ['industrySector=resources&industryGroup=金融&industryOnly=1','industrySector=bad&industryOnly=1']){
  const state=readEuropeState('?layer=hubs&'+query,countries,[],'hubs');assert.equal(state.industryOnly,undefined);assert.equal(state.industryGroup,undefined);
 }
 const crop=readEuropeState('?layer=wheat&industrySector=services&industryOnly=1',countries,[]);assert.equal(crop.industrySector,undefined);assert.equal(crop.industryOnly,undefined);
});

test('industry category, underscore site IDs and solo distribution survive comparison return',()=>{
 const source=readEuropeState('?layer=hubs&industrySector=services&industryGroup=金融&industryOnly=1&feature=london_finance',countries,[],'hubs');
 assert.equal(source.feature,'london_finance');
 const next=europeComparisonUrl(new URL('https://example.test/atlas/europe/industry/'),source,{id:'hubs-density',label:'人口',question:'比較',targetLayer:'density'});
 const saved=readEuropeReturn(next.searchParams.get('europeReturn'),countries,[]);assert.equal(saved.industrySector,'services');assert.equal(saved.industryOnly,true);assert.equal(saved.feature,'london_finance');
 const restored=europeNamedReturnUrl(next,saved);assert.equal(restored.searchParams.get('industryGroup'),'金融');assert.equal(restored.searchParams.get('industryOnly'),'1');
 assert.equal(readEuropeState('?layer=hubs&feature=rotterdam',countries,[],'hubs').industrySector,'manufacturing');
});
