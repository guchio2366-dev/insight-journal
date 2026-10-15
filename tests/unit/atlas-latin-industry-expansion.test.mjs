import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {industryBundle} from './atlas-latin-industry-helpers.mjs';
const raw=JSON.parse(await readFile('src/data/atlas/latin-america/industry-sectors.json','utf8'));
const code=await industryBundle("export * from './src/lib/atlas-latin-industry-evidence.ts';export * from './src/lib/atlas-latin-industry-sectors.ts';",'esm','node');
const lib=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const initial={sector:'resources',industry:null,site:null,single:false,scope:'all',place:'all'};

test('Small industry labels retain readable contrast on land, their light highlight and their halo',()=>{
 const rgb=hex=>[1,3,5].map(start=>parseInt(hex.slice(start,start+2),16));
 const luminance=channels=>channels.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,index)=>sum+n*[.2126,.7152,.0722][index],0);
 for(const i of raw.industries){
  const text=luminance(rgb(lib.industryLabelColor(i.color))),land=rgb('#f2f1e8');
  for(const bg of [land,rgb('#fffefa'),land.map((n,j)=>Math.round(n*.9+rgb(i.color)[j]*.1))])
   assert.ok((luminance(bg)+.05)/(text+.05)>=4.5,i.id+' text contrast');
 }
});

test('Every one of the 17 main and 5 additional research groups has a sourced map and distinct statistical coverage',()=>{
 assert.equal(raw.requirements.length,22);assert.equal(raw.requirements.filter(r=>r.researchRole==='main').length,17);
 assert.equal(raw.requirements.filter(r=>r.researchRole==='additional').length,5);
 for(const r of raw.requirements){assert.equal(r.adopted,true);for(const id of r.industryIds){
  const i=raw.industries.find(i=>i.id===id);assert.ok(i,id);assert.ok(raw.sites.some(s=>s.industry===id),id);
  assert.ok(lib.latinIndustryMetrics.some(m=>m.industry===id),id);assert.ok(i.sources.length,id);
 }}
 assert.deepEqual(raw.flows,[]);assert.deepEqual(raw.nextCandidates,[]);
 for(const site of raw.sites){const i=raw.industries.find(i=>i.id===site.industry);assert.ok(i);assert.ok(site.sectors.every(s=>i.sectors.includes(s)),site.id);assert.notEqual(site.country,'Mexico');}
 for(const id of ['aluminum','refining','steel','finance','digital'])assert.ok(raw.industries.some(i=>i.id===id),'retain '+id);
});

test('New administrative guide positions independently match the public original and are not factory coordinates',async()=>{
 const original=JSON.parse(await readFile('data-source/atlas/latin-america/industry-expansion-20261014/admin-original-subset.geojson','utf8'));
 assert.equal(original.fullInputSha256,raw.regionalSource.inputSha256);
 for(const s of raw.sites.filter(s=>s.coordinateSource.type==='admin-region-guide')){
  const f=original.features.find(f=>f.properties.ne_id===s.coordinateSource.neId);assert.ok(f,s.id);
  assert.equal(f.properties.iso_3166_2,s.coordinateSource.isoCode);assert.deepEqual(s.coordinates,[f.properties.longitude,f.properties.latitude]);
  assert.equal(s.locationKind,'regional-guide');assert.match(s.coordinateMeaning,/工場・鉱山・養殖池の点位置ではありません/);
 }
 const liza=raw.sites.find(s=>s.id==='liza-oil');assert.equal(liza.coordinateSource.row,'Liza-3');
 assert.deepEqual(liza.coordinates,[-56.948908,8.113158]);assert.match(liza.note,/2016.*現在のFPSO/);
});

test('Numbers preserve year, unit, denominator, stage and aggregation; missing remains null',()=>{
 assert.ok(lib.latinIndustryMetrics.length>=100);
 for(const m of lib.latinIndustryMetrics){assert.ok(m.period&&m.unit&&m.productStage&&m.geography);if(m.status==='missing')assert.equal(m.value,null);}
 const m=id=>lib.latinIndustryMetrics.find(m=>m.id===id);
 assert.equal(m('air-global-sales').geographicLevel,'company-global');assert.equal(m('beef-mt').geographicLevel,'admin1');
 assert.equal(m('soy-santa-fe').productStage,'油糧種子加工設備能力');assert.match(m('medical-export').productStage,/精密・医療機器部門/);
 assert.match(m('hydro-br').denominator,/国内電力供給/);assert.equal(m('oil-growth').status,'estimate');
 assert.equal(m('fishmeal-port-set').period,'2022');assert.equal(m('juice-production-world').status,'estimate');
 assert.equal(m('panama-revenue').geographicLevel,'authority');assert.match(m('tourism-bahamas-cruise').unit,/寄港訪問/);
 assert.match(m('shrimp-omarsa-capacity').unit,/能力/);assert.match(m('shrimp-export').productStage,/camarón/);
 for(const id of ['air-niche','tourism-world-missing','corporate-world-missing','fishoil-world-missing'])assert.equal(m(id).value,null);
 const wrong=structuredClone(lib.latinIndustryMetrics);wrong.find(m=>m.id==='cu-two-world').value=99;
 assert.throws(()=>lib.parseLatinIndustryMetrics(wrong),/calculation/);
 const missing=structuredClone(lib.latinIndustryMetrics);missing.find(m=>m.status==='missing').value=0;
 assert.throws(()=>lib.parseLatinIndustryMetrics(missing),/Invalid/);
 const denominator=structuredClone(lib.latinIndustryMetrics);denominator.find(m=>m.id==='medical-export-share').denominator=null;
 assert.throws(()=>lib.parseLatinIndustryMetrics(denominator),/Invalid/);
});

test('Manufacturing distinguishes raw materials from documented processing and does not reuse mine percentages',()=>{
 assert.equal(raw.sites.find(s=>s.id==='guayas-shrimp').stageKind,'extraction');
 assert.equal(raw.sites.find(s=>s.id==='duran-shrimp').stageKind,'processing');
 assert.equal(lib.latinIndustryMapAnnotation('niobium',raw.sites.filter(s=>s.industry==='niobium'),'manufacturing'),null);
 assert.match(lib.latinIndustryMapAnnotation('niobium',raw.sites.filter(s=>s.industry==='niobium'),'resources'),/ブラジル全体.*93%/);
 const sp=[raw.sites.find(s=>s.id==='sp-beef')];assert.match(lib.latinIndustryMapAnnotation('beef',sp,'manufacturing'),/サンパウロ州.*11.1/);
 assert.doesNotMatch(lib.latinIndustryMapAnnotation('beef',sp,'manufacturing'),/17.1/);
 const html=lib.renderLatinIndustryStatistics('manufacturing','aviation');assert.match(html,/世界事業/);assert.match(html,/未取得/);assert.doesNotMatch(html,/国内GDP.*75/);
});

test('Every adopted product remains selectable in a process-specific map without requiring every name on the overview',()=>{
 for(const i of raw.industries){const sectors=raw.sectors.filter(s=>lib.sectorIndustries(s.id).some(item=>item.id===i.id));assert.ok(sectors.length,i.id);for(const sector of sectors)assert.ok(lib.sectorSites(sector.id).some(s=>s.industry===i.id));}
 for(const sector of raw.sectors){const all=lib.statisticsForIndustrySelection(sector.id,null);assert.ok(all.every(m=>lib.sectorIndustries(sector.id).some(i=>i.id===m.industry)));}
 assert.ok(!lib.statisticsForIndustrySelection('resources',null).some(m=>['refining','alumina','aluminum','steel'].includes(m.industry)));
});
