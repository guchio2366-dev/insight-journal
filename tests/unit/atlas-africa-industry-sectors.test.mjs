import test from 'node:test';
import assert from 'node:assert/strict';
import {africaIndustrySectors,africaSectorIndustries,africaSectorSites,africaIndustrySectorSites,africaIndustryNationalReferences} from '../../src/data/atlas/africa-industry-sectors.ts';
import {africaIndustryLocations} from '../../src/data/atlas/africa-industry-locations.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';

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

test('every sector and industry survives URL reload, right-only filtering, and scoped field exit',()=>{
 for(const industry of africaSectorIndustries){const state=readState('?'+new URLSearchParams({field:'industry',industrySector:industry.sector,industryCommodity:industry.id,industryOnly:'1',unknown:'keep'}));assert.equal(state.industrySector,industry.sector);assert.equal(state.industryCommodity,industry.id);assert.equal(state.industryOnly,true);const url=writeState({...state},new URL('https://example.com/atlas/africa/?unknown=keep'));assert.deepEqual(readState(url.search),state);assert.equal(url.searchParams.get('unknown'),'keep');const changed={...state,field:'nature'};const cleared=writeState(changed,new URL(url));for(const key of ['industrySector','industryCommodity','industryOnly'])assert(!cleared.searchParams.has(key));}
 for(const invalid of ['__proto__','constructor','Resources',' resources '])assert.equal(readState('?field=industry&industrySector='+encodeURIComponent(invalid)).industrySector,'resources');
 assert.equal(readState('?field=industry&industrySector=services&industryCommodity=oil&industryOnly=1').industryOnly,false);
 assert.equal(readState('?field=industry&industryCommodity=automotive-aerospace&industryLocation=casablanca-industry').industryCommodity,'aerospace');
 assert.equal(readState('?field=industry&industryCommodity=urban-services&industryLocation=lagos').industryCommodity,'logistics');
 assert.equal(readState('?field=industry&industryOnly=1').industryOnly,false);
});
