import {europeComparisonUrl,europeNamedReturnUrl,readEuropeReturn} from '../../src/lib/atlas-europe-comparison.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {europeReadings} from '../../src/data/atlas/europe/readings.ts';
import {europeIndustrySectors,europeIndustrySectorCopy,europeIndustryInSector,europeIndustryGroupsForSite,europeIndustrySectorForGroup,europeIndustryGroupReading} from '../../src/lib/atlas-europe-industry.ts';
import {readEuropeState,writeEuropeState} from '../../src/lib/atlas-europe-view.ts';
import {europeIndustryGroups,europeIndustryProfiles} from '../../src/data/atlas/europe/industry-catalog.ts';
const countries=[{code:'DEU',region:'west'}];
test('all sixteen adopted and five additional products have separate sourced profiles and compatible map evidence',()=>{
 assert.equal(new Set(europeIndustryGroups).size,21);
 for(const group of europeIndustryGroups){
  assert.ok(europeIndustrySectors.some(sector=>europeIndustrySectorCopy[sector].groups.includes(group)));
  assert.ok(europeReadings.some(site=>site.field==='industry'&&europeIndustryGroupsForSite(site.id,europeIndustrySectorForGroup(group)).includes(group)),group);
  const profile=europeIndustryProfiles[group];assert.ok(profile.evidence.length>=2,group);
  for(const evidence of profile.evidence){for(const field of ['year','scope','definition','value','source'])assert.ok(evidence[field],group+field);assert.ok(evidence.source.startsWith('https://'));}
 }
 assert.match(europeIndustryProfiles['半導体製造装置'].evidence[0].scope,/世界連結/);
 assert.match(europeIndustryProfiles['食品・飲料加工'].evidence[0].definition,/総付加価値/);
 assert.match(europeIndustryProfiles['ITサービス'].missing,/対象分類が違う/);
 assert.match(europeIndustryProfiles['繊維・衣服'].missing,/基準年は未確認/);
 assert.match(europeIndustryProfiles['銅採鉱・精錬'].missing,/世界生産分母は未取得/);
 assert.match(europeIndustryGroupReading('石油・天然ガス','manufacturing').overview,/ペルニス.*精製/);
 assert.doesNotMatch(europeIndustryGroupReading('石油・天然ガス','manufacturing').overview,/ノルウェー沖/);
 assert.match(europeIndustryGroupReading('銅採鉱・精錬','manufacturing').overview,/グウォグフ.*精錬|グウォグフ.*精製/);
});
test('three purposes retain all 30 previous sites and distinguish extraction and shared processing stages',()=>{
 const sites=europeReadings.filter(r=>r.field==='industry');
 assert.equal(sites.length,44);
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
 const legacySite=readEuropeState('?layer=hubs&industryGroup=自動車・機械&feature=veldhoven&industryOnly=1',countries,[],'hubs');
 assert.equal(legacySite.industryGroup,'半導体製造装置');assert.equal(legacySite.feature,'veldhoven');assert.equal(legacySite.industryOnly,true);
 assert.equal(readEuropeState('?layer=hubs&industrySector=resources&feature=veldhoven',countries,[],'hubs').feature,undefined);
});

test('industry category, underscore site IDs and solo distribution survive comparison return',()=>{
 const source=readEuropeState('?layer=hubs&industrySector=services&industryGroup=金融&industryOnly=1&feature=london_finance',countries,[],'hubs');
 assert.equal(source.feature,'london_finance');
 const next=europeComparisonUrl(new URL('https://example.test/atlas/europe/industry/'),source,{id:'hubs-density',label:'人口',question:'比較',targetLayer:'density'});
 const saved=readEuropeReturn(next.searchParams.get('europeReturn'),countries,[]);assert.equal(saved.industrySector,'services');assert.equal(saved.industryOnly,true);assert.equal(saved.feature,'london_finance');
 const restored=europeNamedReturnUrl(next,saved);assert.equal(restored.searchParams.get('industryGroup'),'金融・保険');assert.equal(restored.searchParams.get('industryOnly'),'1');
 assert.equal(readEuropeState('?layer=hubs&feature=rotterdam',countries,[],'hubs').industrySector,'manufacturing');
});
