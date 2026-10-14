import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {eastSectors,eastSectorIndustries,eastSectorSites,eastSectorRows,eastSectorTopics,eastIndustrySector} from '../../src/data/atlas/east-asia-industry-sectors.ts';
import {normalizeIndustryState} from '../../src/data/atlas/asia-industry.ts';
import {readAsiaAtlasState,writeAsiaAtlasState} from '../../src/lib/atlas-asia-state.ts';
test('three sectors include distinct extraction, processing, products and service roles',()=>{
 assert.deepEqual(eastSectors.map(s=>s.id),['resources','manufacturing','services']);
 assert.equal(eastSectorIndustries.length,27);assert.equal(eastSectorSites.length,89);
 assert.equal(new Set(eastSectorSites.map(s=>s.id)).size,89);
 for(const sector of eastSectors){const kinds=eastSectorIndustries.filter(i=>i.sectors.includes(sector.id));assert(kinds.length>=4);for(const kind of kinds){assert(eastSectorRows(sector.id).some(s=>s.industries.includes(kind.id)));assert(kind.lead.length>30&&kind.reason.length>30);}}
 for(const site of eastSectorSites){assert(site.point.every(Number.isFinite));assert(['CHN','JPN','KOR','TWN','MNG','PRK'].includes(site.country));assert(site.source.startsWith('https://'));assert(site.scope);assert(site.stage);assert.equal('volume' in site,false);for(const id of site.industries)assert(eastSectorIndustries.some(i=>i.id===id));}
 assert.match(eastSectorSites.find(s=>s.id==='oyu-tolgoi').stage,/採掘・選鉱/);assert.match(eastSectorSites.find(s=>s.id==='toyo-copper').stage,/電解精製/);assert.match(eastSectorSites.find(s=>s.id==='naoetsu-lng').stage,/輸入LNG.*気化/);assert.match(eastSectorSites.find(s=>s.id==='tokyo-digital').stage,/開発・運用/);
 for(const id of ['copper','refining'])assert.deepEqual(eastSectorIndustries.find(i=>i.id===id).sectors,['resources','manufacturing']);
 assert.equal(eastIndustrySector('east-copper','manufacturing'),'manufacturing');assert.equal(eastIndustrySector('east-copper','resources'),'resources');
});
test('electricity examples preserve the actual published source ID, fuel and coordinate',()=>{
 const base=readFileSync(new URL('../../public/assets/atlas/asia-industry-v1/east-asia.json',import.meta.url)),original=JSON.parse(base);
 const selected=JSON.parse(readFileSync(new URL('../../public/assets/atlas/east-asia-v2/power-examples.json',import.meta.url)));
 assert.equal(selected.sourceSha256,createHash('sha256').update(base).digest('hex'));assert.match(selected.edition,/2021/);assert.equal(selected.rows.length,6);
 for(const row of selected.rows){const p=original.power.find(p=>p.id===row.id);assert(p);for(const key of ['name','fuel','capacity','country','point'])assert.deepEqual(row[key],p[key]);assert.deepEqual(eastSectorSites.find(s=>s.id==='power-'+row.id).point,row.point);}
});
test('selection URL keeps context, camera and single display but rejects another industry site',()=>{
 const region={topics:eastSectorTopics,countries:['CHN','JPN','KOR','TWN','MNG','PRK']},camera={lng:118,lat:32,zoom:3.4};
 const state={field:'industry',topic:'east-copper',sector:'manufacturing',detail:'toyo-copper',only:true,place:null,city:null,back:null,camera};
 assert.equal(normalizeIndustryState(region,state).detail,'toyo-copper');assert.equal(normalizeIndustryState(region,{...state,detail:'ukhaa-khudag'}).detail,null);
 assert.equal(normalizeIndustryState(region,{...state,topic:'east-clusters'}).only,false);
 const context={countries:region.countries,cities:[],fields:['natural','industry'],bounds:[70,12,152,60],topics:{industry:eastSectorTopics.map(t=>t.id)},details:{industry:eastSectorSites.map(s=>s.id)}};
 const url=writeAsiaAtlasState(new URL('https://example.com/atlas/asia/east-asia/industry/'),state);assert.equal(url.searchParams.get('industryview'),'single');const restored=readAsiaAtlasState(url,context);assert.equal(restored.only,true);assert.equal(restored.sector,'manufacturing');assert.deepEqual(restored.camera,camera);assert.equal(restored.detail,'toyo-copper');
 const other=writeAsiaAtlasState(url,{...state,field:'natural',topic:null});assert.equal(other.searchParams.get('industryview'),null);
});
test('national reference tables preserve twelve same-year observations and explicit missingness',()=>{
 const bytes=readFileSync(new URL('../../public/assets/atlas/asia-industry-v1/national.json.gz',import.meta.url)),original=JSON.parse(gunzipSync(bytes));
 const selected=JSON.parse(readFileSync(new URL('../../public/assets/atlas/east-asia-v2/economic-statistics.json',import.meta.url)));
 assert.equal(selected.sourceSha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(selected.year,2024);assert.equal(selected.series.length,2);assert.equal(selected.countries.length,6);
 for(const item of selected.series){const source=original.indicators.find(i=>i.id===item.id);assert.equal(item.metadataUrl,source.metadataUrl);assert.equal(item.unit,'GDP比 %');for(const country of selected.countries){const row=source.observations.find(o=>o.countryCode===country.code&&o.year===2024);assert.equal(item.values[country.code],row?.value??null);}assert.equal(item.values.TWN,null);assert.equal(item.values.PRK,null);}
});
