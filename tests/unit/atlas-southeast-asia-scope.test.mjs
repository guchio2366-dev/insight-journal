import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {southeastIndustryCountryScope} from '../../src/data/atlas/asia/southeast-asia-industry.ts';
import {industryCountryChoices,industryScopeCountries,industryTopicsForPlace,normalizeIndustryState,industryValues} from '../../src/data/atlas/asia-industry.ts';
import {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';
const root=new URL('../../public/assets/atlas/asia-industry-v1/',import.meta.url);
const original=JSON.parse(readFileSync(new URL('manifest.json',root))).regions['southeast-asia'];
const region={...original,countryScope:southeastIndustryCountryScope};
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
