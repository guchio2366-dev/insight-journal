import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {centralIndustries,centralIndustrySites,centralIndustryMetrics,centralIndustrySources,centralIndustryMetric,formatCentralMetric,centralIndustrySectors} from '../../src/data/atlas/central-asia-industry.ts';
import {readCentralIndustryState,writeCentralIndustryState,projectCentralIndustry,fitCentralIndustryFrame,zoomCentralIndustryFrame,groupCentralIndustryLabels,placeCentralIndustryLabel,centralIndustryVisibleSites,centralIndustryStageReading} from '../../src/lib/atlas-central-asia-industry.ts';

test('All eleven approved items have sourced Central Asian locations, stage-aware sectors and independently scoped quantities',()=>{
 assert.deepEqual(new Set(centralIndustries.map(i=>i.id)),new Set(['oil','gas','uranium','copper','gold','hydro','textiles','flour','logistics','tourism','chromium']));
 assert.deepEqual(centralIndustrySectors.map(s=>s.id),['resources','manufacturing','services']);
 assert.equal(new Set(centralIndustrySites.map(s=>s.id)).size,centralIndustrySites.length);
 const countries=new Set(['KAZ','KGZ','TJK','TKM','UZB']);
 for(const item of centralIndustries){
  const sites=centralIndustrySites.filter(s=>s.industry===item.id);assert(sites.length,item.id+' has a verified location');
  for(const sector of item.sectors)assert(sites.some(s=>s.sectors.includes(sector)),item.id+' in '+sector);
  assert(centralIndustryMetrics.some(m=>m.industry===item.id&&m.column==='size'));
  assert(centralIndustryMetrics.some(m=>m.industry===item.id&&m.column==='world'));
  for(const source of item.sourceIds)assert(centralIndustrySources[source]);
 }
 for(const site of centralIndustrySites){assert(countries.has(site.country));assert(site.coordinates.every(Number.isFinite));assert(site.sources.length);site.sources.forEach(id=>assert(centralIndustrySources[id]));assert(site.stage&&site.position&&site.note);assert.equal(site.value,undefined,'Guide marks do not impersonate production-weighted symbols');if(site.localMetric)assert(centralIndustryMetric(site.localMetric));}
 for(const metric of centralIndustryMetrics){assert(metric.year&&metric.scope&&metric.definition&&metric.sources.length);metric.sources.forEach(id=>assert(centralIndustrySources[id]));if(metric.status==='未確認')assert.equal(metric.value,null);if(metric.unit==='%')assert(metric.denominator,'Every percent has its original denominator');}
 assert.equal(centralIndustrySites.find(s=>s.id==='central-rogun').status,'一部稼働・建設中');
 assert.deepEqual(centralIndustries.find(i=>i.id==='flour').sectors,['manufacturing']);
 assert.deepEqual(centralIndustries.find(i=>i.id==='textiles').sectors,['manufacturing']);
 assert.match(centralIndustries.find(i=>i.id==='flour').overview,/製粉工場.*コスタナイ/);
});

test('Stage and denominator traps remain explicit: uranium oxide, processed flour, contract buyers and service scopes',()=>{
 const m=centralIndustryMetric;
 assert.equal(m('uranium-production').unit,'tU');assert.equal(m('uranium-oxide').unit,'t U₃O₈');
 assert.equal(m('oil-export').value,79041.2*.505);assert.equal(m('copper-export').value,79041.2*.088);
 assert.equal(m('flour-afghanistan').value,1590193/1591360.1*100);
 assert.equal(m('chromium-revenue').value,(825236236+89193667)/1e6);
 assert.equal(m('hydro-capacity').value,2848+3427+5841+2+2441);
 assert.equal(m('hydro-world').value,m('hydro-capacity').value/1295765*100);
 assert.equal(m('clothing-valley').value,12.8/24.2*100);
 assert.match(m('uranium-japan').definition,/最終消費量/);
 assert.match(m('travel-samarkand').scope,/州/);assert.match(m('travel-samarkand').definition,/観光全体の値ではない/);
 assert.match(m('logistics-pipeline').definition,/鉄道の稼ぎにしない/);
 for(const id of ['textile-world','logistics-world']){assert.equal(m(id).value,null);assert.equal(formatCentralMetric(m(id)),'未確認');}
 for(const id of ['sc-bozshakol-copper','central-aktogay'])assert(centralIndustrySites.find(s=>s.id===id).sources.includes('kaz-coordinates'));
});

test('Three maps partition the source locations by work stage, with processing retained only in manufacturing',()=>{
 const all=centralIndustrySectors.flatMap(sector=>centralIndustryVisibleSites({sector:sector.id,industry:null,site:null,only:false,country:null,frame:null}));
 assert.equal(all.length,centralIndustrySites.length);assert.equal(new Set(all.map(site=>site.id)).size,all.length);
 for(const site of centralIndustrySites){assert.equal(site.sectors.length,1);if(site.kind==='processing')assert.deepEqual(site.sectors,['manufacturing']);if(site.kind==='service')assert.deepEqual(site.sectors,['services']);}
 assert.match(centralIndustryStageReading('copper','resources').title,/採掘/);assert.match(centralIndustryStageReading('copper','manufacturing').title,/製錬/);
 assert.equal(centralIndustryStageReading('chromium','resources').label,'クロム鉱');assert.equal(centralIndustryStageReading('chromium','manufacturing').label,'フェロクロム');
});

test('URL restoration rejects cross-sector sites and invalid frames and preserves unrelated return state',()=>{
 const read=query=>readCentralIndustryState(new URL('https://example.org/atlas/asia/central-asia/industry/'+query));
 const state=read('?sector=manufacturing&subsector=chromium&detail=central-aktobe-chromium&only=1&place=KAZ&industryFrame=30,20,900,580');
 assert.equal(state.site,'central-aktobe-chromium');assert.equal(state.only,true);
 assert.equal(read('?sector=services&subsector=chromium&detail=central-aktobe-chromium&only=1').industry,null);
 assert.equal(read('?place=IND').country,null);
 for(const query of ['?industryFrame=1,2,0,10','?industryFrame=1,,900,500','?industryFrame=NaN,1,900,500'])assert.equal(read(query).frame,null);
 assert.equal(read('?topic=sc-cotton').industry,'textiles');assert.equal(read('?topic=sc-hydro').industry,'hydro');
 assert.equal(read('?topic=sc-oilgas&detail=sc-galkynysh-gas').industry,'gas');
 assert.equal(read('?topic=sc-minerals&detail=sc-bozshakol-copper').industry,'copper');
 assert.equal(read('?topic=sc-minerals&detail=sc-muruntau-gold').industry,'gold');
 assert.equal(read('?topic=sc-overview&detail=sc-bozshakol-copper').industry,'copper');
 const url=writeCentralIndustryState(new URL('https://example.org/atlas/asia/central-asia/industry/?back=population&year=2025&topic=old'),state);assert.equal(url.searchParams.get('back'),'population');assert.equal(url.searchParams.has('year'),false);assert.deepEqual(readCentralIndustryState(url),state);
 const only=centralIndustryVisibleSites(state);assert(only.length);assert(only.every(s=>s.industry==='chromium'));
 assert(centralIndustryVisibleSites({...state,only:false}).length>only.length);
});

test('Projection anchors and view framing use the same geography and do not depend on industry selection',()=>{
 const a=projectCentralIndustry([50,40]),b=projectCentralIndustry([60,40]),c=projectCentralIndustry([50,50]);assert(b[0]>a[0]);assert(c[1]<a[1]);
 for(const ratio of [1.65,.85]){let frame=fitCentralIndustryFrame([46,35,87,56],ratio);assert(Math.abs(frame[2]/frame[3]-ratio)<1e-10);for(const factor of [.8,1.25])for(let n=0;n<60;n++)frame=zoomCentralIndustryFrame(frame,factor);const state={sector:'resources',industry:null,site:null,only:false,country:null,frame};assert(readCentralIndustryState(writeCentralIndustryState(new URL('https://example.org/'),state)).frame);}
 const points=centralIndustrySites.map(site=>({site,point:projectCentralIndustry(site.coordinates)}));
 const groups=groupCentralIndustryLabels(points);assert.equal(groups.flat().length,points.length);assert(groups.every(g=>g.every(p=>p.site.industry===g[0].site.industry&&p.site.country===g[0].site.country&&p.site.sectors[0]===g[0].site.sectors[0]&&(p.site.kind!=='service'||p.site.stage===g[0].site.stage))));
 const box=placeCentralIndustryLabel([[100,100]],[110,45],[400,300],[[95,95,105,105]]);assert(box);assert(!(box[0]<105&&box[2]>95&&box[1]<105&&box[3]>95));assert.deepEqual(placeCentralIndustryLabel([[100,100]],[110,45],[400,300],[[95,95,105,105]]),box);
});

test('Only Central Asia industry routes to the dedicated component; other regional renderers keep their contracts',()=>{
 const route=readFileSync('src/pages/atlas/asia/[region]/[field].astro','utf8');assert.match(route,/focusId==='central-asia'&&initialField==='industry'/);assert.match(route,/:<AsiaAtlasPage/);
 const page=readFileSync('src/components/atlas/asia/CentralAsiaIndustryPage.astro','utf8');assert(page.indexOf('<CentralAsiaIndustryStatistics')>page.indexOf('</aside>'));assert.match(page,/data-central-config/);
 const script=readFileSync('src/scripts/atlas-central-asia-industry.ts','utf8');assert.match(script,/if\(key===geometryKey\)return/);assert.doesNotMatch(script,/flyTo|easeTo|addSource|fetch\(/);assert.doesNotMatch(script,/data-central-flow/);
});
