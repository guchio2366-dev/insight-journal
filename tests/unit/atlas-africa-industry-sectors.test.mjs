import test from 'node:test';
import assert from 'node:assert/strict';
import {africaIndustrySectors,africaSectorIndustries,africaSectorSites,africaIndustrySectorSites,africaIndustryNationalReferences} from '../../src/data/atlas/africa-industry-sectors.ts';
import {africaIndustryLocations} from '../../src/data/atlas/africa-industry-locations.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';
import {africaIndustryMetrics,africaIndustryMetricsFor} from '../../src/data/atlas/africa-industry-research.ts';
import {africaIndustryMapAnnotations} from '../../src/data/atlas/africa-industry-map-annotations.ts';
import {readFileSync} from 'node:fs';

test('source-backed three-sector roles keep old evidence, operating limits and meaningful overlaps',()=>{
 assert.deepEqual(africaIndustrySectors.map(row=>row.id),['resources','manufacturing','services']);
 assert.equal(new Set(africaSectorIndustries.map(row=>row.id)).size,africaSectorIndustries.length);
 for(const industry of africaSectorIndustries){assert(africaIndustrySectorSites(industry.sector).some(site=>site.roles.some(role=>role.industry===industry.id)));assert(industry.reading&&industry.reason);assert(industry.sources.every(source=>new URL(source.url).protocol==='https:'));}
 for(const legacy of africaIndustryLocations){const row=africaSectorSites.find(row=>row.id===legacy.id);assert.deepEqual(row.coordinates,legacy.coordinates);assert.equal(row.reading,legacy.reading);assert.deepEqual(row.sources,legacy.sources);assert.equal(row.status,legacy.status);}
 assert.deepEqual(africaIndustryNationalReferences.map(row=>row.id).sort(),['mozambique-tantalum','namibia-diamonds','zimbabwe-chromium']);
 assert(africaIndustryNationalReferences.every(row=>row.roles.length===0));
 for(const id of ['soyo-gas','lagos','kansanshi-copper'])assert.equal(new Set(africaSectorSites.find(row=>row.id===id).roles.map(row=>row.sector)).size,2);
 const power=africaSectorSites.find(row=>row.id==='olkaria-power');assert.match(power.reading,/送電網/);assert.match(power.note,/概略代表位置/);
 for(const id of ['lekki-refining','lekki-fertilizer','bonny-lng','nairobi-digital','johannesburg-digital'])assert(africaSectorSites.find(row=>row.id===id).sources.length);
});

test('overview annotations use a bounded set of existing sites in the matching sector',()=>{
 assert.deepEqual(africaIndustrySectors.map(sector=>africaIndustryMapAnnotations.filter(row=>row.sector===sector.id).length),[10,8,6]);
 assert.equal(new Set(africaIndustryMapAnnotations.map(row=>row.siteId)).size,africaIndustryMapAnnotations.length);
 for(const row of africaIndustryMapAnnotations){
  for(const id of [row.siteId,...(row.relatedSiteIds??[])])assert(africaIndustrySectorSites(row.sector).some(site=>site.id===id),`${id} is a sourced site in ${row.sector}`);
  assert(row.label.length<=26&&row.label.includes(' · '));
 }
});

test('all approved Africa industries have scoped evidence and retain product-stage distinctions',()=>{
 assert.equal(africaSectorIndustries.length,36);
 assert.deepEqual(africaSectorIndustries.reduce((counts,row)=>(counts[row.sector]++,counts),{resources:0,manufacturing:0,services:0}),{resources:20,manufacturing:10,services:6});
 const ids=new Set(africaSectorIndustries.map(row=>row.id));
 for(const id of ['copper','cobalt','pgm','chromium','bauxite','iron-ore','phosphate','tantalum','tin','tourism','communications','steel','cement'])assert(ids.has(id),id);
 for(const id of ['copper-cobalt','bauxite-iron','pgm-chromium','tantalum-tin'])assert(!ids.has(id));
 for(const industry of africaSectorIndustries){
  const rows=africaIndustryMetricsFor(industry.id);
  assert(rows.length>0,industry.id);
  assert(rows.some(row=>row.value!==null)||industry.id==='rare-earth',industry.id);
  for(const row of rows){assert(row.period&&row.geography&&row.definition&&row.unit);assert.equal(new URL(row.source).protocol,'https:');assert(row.value===null||Number.isFinite(row.value));assert.equal(row.quality==='unverified',row.value===null);}
 }
 assert.equal(africaIndustryMetrics.filter(row=>row.industry==='phosphate'&&row.group==='scale')[0].value,35.3);
 assert.equal(africaIndustryMetricsFor('lithium').find(row=>row.group==='scale').value,1);
 assert.match(africaIndustryMetricsFor('lithium').find(row=>row.group==='scale').unit,/鉱石総重量/);
 assert.equal(africaIndustryMetrics.filter(row=>row.industry==='fertilizer'&&row.group==='scale')[0].value,12.3);
 assert.match(africaIndustryMetricsFor('tourism')[0].definition,/エジプトは中東/);
 assert.match(africaIndustryMetricsFor('communications')[1].geography,/サハラ以南/);
 assert.match(africaIndustryMetricsFor('diamonds')[0].definition,/研磨や人工ダイヤは除く/);
 const anchors=JSON.parse(readFileSync(new URL('../../data-source/atlas/africa/industry-approved-20261014/natural-earth-city-anchors.json',import.meta.url),'utf8'));
 for(const [id,city] of [['alexandria-steel','Alexandria'],['marrakesh-tourism','Marrakesh'],['luxor-tourism','Luxor'],['suez-cement','Suez'],['rubavu-tantalum','Gisenyi']]){
  const site=africaSectorSites.find(row=>row.id===id),anchor=anchors.cities.find(row=>row.name===city);
  assert.deepEqual(site.coordinates,anchor.coordinates,id);assert.match(site.note,/市点|都市点/);
 }
 assert.match(africaSectorSites.find(row=>row.id==='jorf-phosphate-processing').note,/鉱山や工場の実測座標ではありません/);
 assert.equal(africaSectorSites.find(row=>row.id==='jorf-phosphate-processing').roles[0].stage,'リン鉱石の加工・利用');
});

test('every sector and industry survives URL reload, right-only filtering, and scoped field exit',()=>{
 for(const industry of africaSectorIndustries){const state=readState('?'+new URLSearchParams({field:'industry',industrySector:industry.sector,industryCommodity:industry.id,industryOnly:'1',unknown:'keep'}));assert.equal(state.industrySector,industry.sector);assert.equal(state.industryCommodity,industry.id);assert.equal(state.industryOnly,true);const url=writeState({...state},new URL('https://example.com/atlas/africa/?unknown=keep'));assert.deepEqual(readState(url.search),state);assert.equal(url.searchParams.get('unknown'),'keep');const changed={...state,field:'nature'};const cleared=writeState(changed,new URL(url));for(const key of ['industrySector','industryCommodity','industryOnly'])assert(!cleared.searchParams.has(key));}
 for(const invalid of ['__proto__','constructor','Resources',' resources '])assert.equal(readState('?field=industry&industrySector='+encodeURIComponent(invalid)).industrySector,'resources');
 assert.equal(readState('?field=industry&industrySector=services&industryCommodity=oil&industryOnly=1').industryOnly,false);
 assert.equal(readState('?field=industry&industryCommodity=automotive-aerospace&industryLocation=casablanca-industry').industryCommodity,'aerospace');
 assert.equal(readState('?field=industry&industryCommodity=urban-services&industryLocation=lagos').industryCommodity,'logistics');
 assert.equal(readState('?field=industry&industryOnly=1').industryOnly,false);
});
