import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southeastIndustryCountryScope} from '../../src/data/atlas/asia/southeast-asia-industry.ts';
import {industryCountryChoices,industryScopeCountries,industryTopicsForPlace,normalizeIndustryState,normalizeScopedIndustryState,industryValues} from '../../src/data/atlas/asia-industry.ts';
import {tradeTopics} from '../../src/data/atlas/asia-trade.ts';
import {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';
import {availablePlaceReadings,choosePlaceReading,selectedPlaceReading,startPlaceComparison} from '../../src/data/atlas/asia-place-readings.ts';
import {southeastCropPriority} from '../../src/data/atlas/asia/southeast-asia-crop-priority.mjs';
const root=new URL('../../public/assets/atlas/asia-industry-v1/',import.meta.url);
const original=JSON.parse(readFileSync(new URL('manifest.json',root))).regions['southeast-asia'];
const region={...original,topics:[...original.topics,...tradeTopics],countryScope:southeastIndustryCountryScope};
const data=JSON.parse(gunzipSync(readFileSync(new URL(region.data,root))));
const national=JSON.parse(gunzipSync(readFileSync(new URL('national.json.gz',root))));
const state={field:'industry',place:null,city:null,topic:'manufacturing',detail:null,point:null,camera:null,back:null};

test('Southeast country study has three targets while the source region retains eleven',()=>{
 assert.deepEqual(industryCountryChoices(region).map(c=>c.code),['IDN','VNM','THA']);
 assert.equal(region.countries.length,11);assert.equal(region.countryScope.regionalTrade,true);
 assert.deepEqual(industryScopeCountries(region,null),['IDN','VNM','THA']);
 assert.ok(industryTopicsForPlace(region,null).every(t=>!t.country||['IDN','VNM','THA'].includes(t.country)));
 for(const code of ['IDN','VNM','THA']){
  assert.deepEqual(industryScopeCountries(region,code),[code]);
  const topics=industryTopicsForPlace(region,code);assert.ok(topics.some(t=>t.id==='manufacturing'));
  const actual=industryValues(topics.find(t=>t.id==='manufacturing'),data,national,[code])[0];
  assert.equal(actual.value,national.indicators.find(i=>i.id==='manufacturing').observations.find(o=>o.countryCode===code&&o.year===2024).value);
  assert.match(region.countryScope.readings[code].scope,/国全体|国の比率|タイ全体/);assert.match(region.countryScope.readings[code].source.url,/^https:\/\//);
 }
});

test('excluded domestic URLs and facilities cannot reintroduce a fourth country',()=>{
 const excluded=normalizeIndustryState(region,{...state,place:'MYS',topic:'my-p3',detail:'MY-16',point:[101.7,2.9]},data);
 assert.equal(excluded.place,null);assert.equal(excluded.topic,'manufacturing');assert.equal(excluded.detail,null);assert.equal(excluded.point,null);
 const plant=data.power.find(p=>p.country==='MYS');assert.ok(plant);
 assert.equal(normalizeIndustryState(region,{...state,topic:'power-all',detail:plant.id},data).detail,null);
 const source=data.admin.find(a=>a.id==='MY-16').series['my-p3'];
 assert.equal(source.find(o=>o.year==='2023').value,null);assert.equal(source.find(o=>o.year==='2025').value,0);
});

test('single-product state survives URL reload and comparison without contaminating the initial overview',()=>{
 const context={countries:region.countries,cities:[],fields:['natural','agriculture','industry','population'],bounds:[91,-12,143,30],topics:{agriculture:['overview','maize','chicken'],population:['density']}};
 const url=new URL('https://example.com/insight-journal/atlas/asia/southeast-asia/agriculture/');
 const chosen={...state,field:'agriculture',topic:'maize',single:true,camera:{lng:116.576,lat:9.362,zoom:2.835}};
 const written=writeAsiaAtlasState(url,chosen),reloaded=readAsiaAtlasState(written,context);
 assert.equal(written.searchParams.get('farmview'),'single');assert.equal(reloaded.single,true);assert.equal(reloaded.topic,'maize');assert.deepEqual(reloaded.camera,chosen.camera);
 const comparison=startAsiaComparison(written,reloaded,'population'),restored=restoreAsiaComparison(written,comparison,context);
 assert.equal(restored.single,true);assert.equal(restored.field,'agriculture');assert.equal(restored.topic,'maize');assert.deepEqual(restored.camera,chosen.camera);
 assert.equal(writeAsiaAtlasState(url,{...chosen,single:false}).searchParams.get('farmview'),null);
 assert.equal(readAsiaAtlasState(new URL(url.href+'?topic=overview&farmview=single'),context).single,undefined);
});

test('outside-country comparisons keep their commodity in regional trade and restore the original field',()=>{
 const context={countries:region.countries,cities:[],fields:['agriculture','industry'],bounds:[91,-12,143,30],topics:{agriculture:['forest','maize'],industry:['trade-exports','manufacturing']},details:{industry:id=>/^t-\d{2}$/.test(id)}};
 for(const [place,topic,chapter]of [['MYS','forest','44'],['PHL','maize','10']]){
  const from={...state,field:'agriculture',place,topic,point:[103,4.5],camera:{lng:103,lat:4.5,zoom:6}},url=new URL('https://example.com/atlas/asia/southeast-asia/agriculture/');
  const comparison={...startAsiaComparison(url,from,'industry'),topic:'trade-exports',detail:'t-'+chapter};
  const scoped=normalizeScopedIndustryState(region,comparison),actual=normalizeIndustryState(region,comparison,data);
  for(const value of [scoped,actual]){assert.equal(value.place,null);assert.equal(value.detail,'t-'+chapter);assert.equal(value.camera,null);assert.equal(value.point,null);assert.equal(value.back,comparison.back);}
  const reloaded=readAsiaAtlasState(writeAsiaAtlasState(url,scoped),context),restored=restoreAsiaComparison(url,reloaded,context);
  assert.equal(reloaded.detail,'t-'+chapter);assert.equal(restored.field,'agriculture');assert.equal(restored.place,place);assert.equal(restored.topic,topic);assert.deepEqual(restored.camera,from.camera);
 }
 assert.equal(normalizeScopedIndustryState({...region,countryScope:undefined},{...state,place:'MYS'}).place,'MYS');
});

test('three population readings connect real urban centres to country-wide industry without changing source years',()=>{
 const urban=JSON.parse(readFileSync(new URL('../../public/assets/atlas/asia-population-v1/manifest.json',import.meta.url))).regions['southeast-asia'];
 const scenes=availablePlaceReadings('southeast-asia','population').filter(s=>['jakarta-population','hanoi-population','hochiminh-population'].includes(s.id));
 assert.equal(scenes.length,3);
 for(const scene of scenes){
  const city=urban.cities.find(c=>c.id===scene.detail);
  assert.equal(city?.country,scene.country);
  assert.match(scene.scope,/2020年/);assert.match(scene.scope,/2025年/);
  assert.ok(scene.bridges.some(b=>b.field==='industry'&&b.topic==='manufacturing'));
  const selected=choosePlaceReading({...state,field:'population'},scene),url=new URL('https://example.org/atlas/asia/southeast-asia/population/');
  assert.equal(selectedPlaceReading('southeast-asia',selected),scene);
  const link=scene.bridges.find(b=>b.field==='industry'),compared=startPlaceComparison(url,selected,link);
  const context={countries:region.countries,cities:[],fields:['population','industry'],bounds:[91,-12,143,30],topics:{population:['urban'],industry:['manufacturing']},details:{population:[scene.detail]},stories:{population:[scene.id]}};
  assert.equal(restoreAsiaComparison(url,compared,context).story,scene.id);
 }
});

test('2020 crop shortlist is computed from reported tonnes and never counts coffee varieties twice',()=>{
 const statistics=JSON.parse(gunzipSync(readFileSync(new URL('../../public/assets/atlas/asia-farming-v1/statistics.json.gz',import.meta.url))));
 const farming=JSON.parse(readFileSync(new URL('../../public/assets/atlas/asia-farming-v1/manifest.json',import.meta.url))).regions['southeast-asia'];
 const priority=southeastCropPriority(statistics);
 assert.equal(priority.countryCount,11);assert.equal(priority.selected.length,10);assert.equal(priority.all.length,14);
 assert.deepEqual(priority.selected.slice(0,4).map(r=>r.code),['254','27','156','125']);
 assert.equal(priority.selected.at(-1).code,'191');assert.equal(priority.selected.at(-1).reportedCountries,1);
 const coffee=priority.selected.find(r=>r.code==='656');assert.deepEqual(coffee.maps,['arabica','robusta']);
 assert.equal(coffee.tonnes,priority.all.find(r=>r.code==='656').tonnes);
 for(const row of priority.all)for(const map of row.maps)assert.ok(map==='rice'||farming.layers.some(layer=>layer.id===map),map);
 assert.deepEqual(priority.selected.filter(r=>r.maps.length===0).map(r=>r.code),['667','236','191']);
});
