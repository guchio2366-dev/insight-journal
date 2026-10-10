import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Window} from 'happy-dom';
import {industryCountryFacts,eastIndustryCountries,industryTopicsForPlace,industryScopeCountries,normalizeIndustryState} from '../../src/data/atlas/asia-industry.ts';
import {createAsiaNavigation} from '../../src/scripts/atlas-asia-navigation.ts';
import {tradeTopics} from '../../src/data/atlas/asia-trade.ts';
const base=new URL('../../public/assets/atlas/asia-industry-v1/',import.meta.url);
const manifestRegion=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8')).regions['east-asia'];
const region={...manifestRegion,topics:[...manifestRegion.topics,...tradeTopics]};
const data=JSON.parse(gunzipSync(readFileSync(new URL(region.data,base))));
const state={field:'industry',topic:'jp-20',place:'JPN',detail:'JP-43',point:[130,33],city:null,camera:{lng:130,lat:33,zoom:6},sector:null,subsector:null};

test('東アジアの国別産業は4対象で、国の主題候補と直接URLを一致させる',()=>{
 assert.deepEqual(industryScopeCountries(region,null),['CHN','JPN','KOR','TWN']);
 for(const country of eastIndustryCountries){
  assert.deepEqual(industryScopeCountries(region,country.code),[country.code]);
  const topics=industryTopicsForPlace(region,country.code);
  assert.ok(topics.some(t=>t.id==='manufacturing'));
  assert.ok(topics.every(t=>!t.country||t.country===country.code));
 }
 for(const code of ['CHN','KOR','TWN']){
  const normalized=normalizeIndustryState(region,{...state,place:code},data);
  assert.equal(normalized.place,code);assert.equal(normalized.topic,'manufacturing');assert.equal(normalized.detail,null);assert.equal(normalized.point,null);
 }
 const regional=normalizeIndustryState(region,{...state,place:'MNG',topic:'manufacturing'},data);
 assert.equal(regional.place,null);assert.equal(regional.detail,null);assert.equal(regional.point,null);
 const national=JSON.parse(gunzipSync(readFileSync(new URL('national.json.gz',base))));
 assert.equal(national.indicators.some(i=>i.observations.some(o=>o.countryCode==='TWN'&&o.value!==null)),false);
 assert.match(national.missingNotes.TWN,/台湾.*欠測/);
});

test('地域・国・産業の操作は対象国を保ち、国変更で他国の主題を解除し、同国ではカメラを保つ',async()=>{
 const window=new Window();let current={...state};const calls=[];
 const features=['manufacturing','jp-31','jp-28','cn-steel','power-all','services'];
 window.document.body.innerHTML=`<div id="root"><div data-industry-navigation><nav>${['all',...eastIndustryCountries.map(c=>c.code)].map(c=>`<button data-industry-country="${c}">${c}</button>`).join('')}</nav><p data-industry-country-scope></p>${['manufacturing','resources','services'].map(sector=>`<button data-industry-sector="${sector}"></button><nav data-industry-subsectors="${sector}">${features.map(id=>`<button data-industry-feature="${id}"></button>`).join('')}<button data-industry-current-feature data-industry-feature=""></button></nav>`).join('')}</div><details data-industry-all><select data-industry-topic>${region.topics.map(t=>`<option value="${t.id}">${t.title}</option>`).join('')}</select></details></div>`;
 const root=window.document.querySelector('#root'),q=s=>root.querySelector(s);
 let navigation;
 navigation=createAsiaNavigation(root,region,()=>current,(next,fit)=>{calls.push({next,fit});current=normalizeIndustryState(region,next,data);navigation.render();},()=>{},()=>{},()=>{});
 try{
  navigation.render();
  assert.equal(q('[data-industry-feature="cn-steel"]').hidden,true);
  assert.equal(q('option[value="cn-steel"]').disabled,true);
  q('[data-industry-country="JPN"]').click();
  assert.equal(calls.at(-1).fit,false);assert.deepEqual(current.camera,state.camera);assert.equal(current.detail,'JP-43');
  q('[data-industry-feature="manufacturing"]').click();
  assert.equal(current.place,'JPN');assert.equal(current.topic,'manufacturing');assert.deepEqual(current.camera,state.camera);
  current={...state};navigation.render();q('[data-industry-country="CHN"]').click();
  assert.equal(current.place,'CHN');assert.equal(current.topic,'manufacturing');assert.equal(current.detail,null);assert.equal(current.point,null);assert.equal(current.camera,null);assert.equal(calls.at(-1).fit,true);
  assert.equal(q('option[value="jp-31"]').disabled,true);assert.equal(q('option[value="cn-steel"]').disabled,false);
  q('[data-industry-feature="cn-steel"]').click();assert.equal(current.place,'CHN');assert.equal(current.topic,'cn-steel');
  q('[data-industry-country="all"]').click();
  assert.equal(current.place,null);assert.equal(current.topic,'manufacturing');assert.equal(current.detail,null);assert.equal(calls.at(-1).fit,true);
  assert.equal(q('option[value="jp-31"]').disabled,false);assert.equal(q('[data-industry-country="all"]').getAttribute('aria-pressed'),'true');
  q('[data-industry-country="TWN"]').click();q('[data-industry-feature="power-all"]').click();
  assert.equal(current.place,'TWN');assert.equal(current.topic,'power-all');
  assert.equal(q('[data-industry-feature="jp-31"]').hidden,true);assert.equal(q('[data-industry-feature="cn-steel"]').hidden,true);
  current={...current,topic:'trade-exports',detail:'t-85'};navigation.render();q('[data-industry-country="CHN"]').click();
  assert.equal(current.place,'CHN');assert.equal(current.topic,'trade-exports');assert.equal(current.detail,'t-85','a country change retains the compatible HS chapter');
 }finally{await window.happyDOM.close();}
});

test('保存済み国別数量は全国GDP比・共通2024年で限定5対象に接続し台湾の欠測を保持する',()=>{
 const national=JSON.parse(gunzipSync(readFileSync(new URL('national.json.gz',base))));
 const expected={KOR:[26.6179725157922,57.5005082410932],TWN:[null,null],IDN:[18.984004004374,43.7709161521491],VNM:[24.3330816740279,42.3541982658904],THA:[24.2392268675556,59.270961161831]};
 for(const [code,values] of Object.entries(expected)){const facts=industryCountryFacts(national,code);assert.deepEqual(facts.map(f=>f.value),values);assert.ok(facts.every(f=>f.year===2024&&f.unit==='GDP比 %'&&f.sourceUrl.includes('metadataglossary')));}
 for(const code of ['MYS','JPN','SGP',null])assert.deepEqual(industryCountryFacts(national,code),[]);
 assert.deepEqual(industryCountryFacts(null,'KOR'),[]);
});
