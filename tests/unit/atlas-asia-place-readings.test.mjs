import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {asiaPlaceReadings,choosePlaceReading,selectedPlaceReading,normalizePlaceReading} from '../../src/data/atlas/asia-place-readings.ts';
import {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison} from '../../src/lib/atlas-asia-state.ts';
import {asiaNaturalTopics} from '../../src/data/atlas/asia-physical-reading.ts';
import {tradeTopics} from '../../src/data/atlas/asia-trade.ts';
const asset=(type,file='manifest.json')=>JSON.parse(file.endsWith('.gz')?gunzipSync(readFileSync(`public/assets/atlas/asia-${type}-v1/${file}`)):readFileSync(`public/assets/atlas/asia-${type}-v1/${file}`,'utf8'));
const farm=asset('farming'),industry=asset('industry'),population=asset('population'),trade=asset('trade');
const base={field:'natural',place:null,city:null,point:null,detail:null,topic:null,back:null,camera:null};

test('全ての事例と比較先が、実在する主題・国・行政区域・都市・商品区分につながる',()=>{
 assert.equal(new Set(asiaPlaceReadings.map(s=>s.id)).size,asiaPlaceReadings.length);
 for(const region of Object.keys(farm.regions)){
  const records=asiaPlaceReadings.filter(s=>s.region===region),r=industry.regions[region],p=population.regions[region];
  const data=asset('industry',r.data.split('/').at(-1));
  assert.equal(records.filter(s=>s.field==='agriculture').length,3);
  assert.ok(records.some(s=>s.field==='population'));assert.ok(records.some(s=>s.field==='industry'));
  const validate=(s,country)=>{
   const ids=s.field==='agriculture'?['rice',...farm.regions[region].layers.map(t=>t.id)]:s.field==='natural'?asiaNaturalTopics.map(t=>t.id):s.field==='population'?['density','urban']:[...r.topics,...tradeTopics].map(t=>t.id);
   assert.ok(ids.includes(s.topic),region+' '+s.topic);
   if(s.detail?.startsWith('t-'))assert.ok(trade.chapters[s.detail.slice(2)]);
   else if(s.field==='industry'&&s.detail){const row=data.admin.find(d=>d.id===s.detail&&d.country===country);assert.ok(row,s.detail);assert.ok(row.series[s.topic]?.length,s.topic+' '+s.detail);}
   else if(s.field==='population'&&s.detail)assert.ok(p.cities.some(c=>c.id===s.detail&&c.country===country),s.detail);
  };
  for(const s of records){validate(s,s.country);for(const b of s.bridges)validate(b,s.country);assert.match(s.source.url,/^https:\/\//);assert.ok(s.scope.length>40);}
 }
});

test('説明は国・分野・主題・詳細・着目地点と整合する場合だけ表示する',()=>{
 const scene=asiaPlaceReadings.find(s=>s.id==='north-china-wheat'),state=choosePlaceReading(base,scene);
 assert.equal(selectedPlaceReading(scene.region,state),scene);
 for(const change of [{field:'industry'},{place:'JPN'},{topic:'rice'},{detail:'unknown'},{point:[115,38]},{story:'<script>'}])assert.equal(normalizePlaceReading(scene.region,{...state,...change}).story,null);
 assert.equal(normalizePlaceReading('southeast-asia',state).story,null);
});

test('事例→別分野→再読込→復帰で、説明・主題・地点・カメラを保持する',()=>{
 const scene=asiaPlaceReadings.find(s=>s.id==='north-china-wheat'),selected=choosePlaceReading(base,scene);
 const context={countries:['CHN'],cities:[],bounds:[72,17,155,56],fields:['natural','agriculture'],topics:{agriculture:['wheat']},stories:{agriculture:[scene.id]}};
 const url=new URL('https://example.org/atlas/asia/east-asia/agriculture/');
 const current=readAsiaAtlasState(writeAsiaAtlasState(url,selected),context);
 assert.equal(current.story,scene.id);
 const comparison=startAsiaComparison(url,current,'natural');assert.equal(comparison.story,undefined);
 const target=writeAsiaAtlasState(url,comparison),restored=restoreAsiaComparison(target,readAsiaAtlasState(target,context),context);
 assert.deepEqual(restored,current);assert.equal(selectedPlaceReading(scene.region,restored),scene);
 assert.equal(readAsiaAtlasState(new URL(url+'?story=unknown'),context).story,undefined);
});

test('都市名は日本語表示でも原資料名・数値・都市IDを保持する',()=>{
 for(const [region,id,name,source] of [['east-asia','uc-5213','名古屋','Nagoya'],['south-central-asia','uc-9558','ベンガルール','Bengaluru']]){
  const c=population.regions[region].cities.find(c=>c.id===id);assert.equal(c.name,name);assert.equal(c.sourceName,source);assert.ok(c.population>1000000);
 }
});
