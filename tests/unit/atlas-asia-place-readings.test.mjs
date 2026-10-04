import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {asiaPlaceReadings,availablePlaceReadings,choosePlaceReading,selectedPlaceReading,normalizePlaceReading,startPlaceComparison} from '../../src/data/atlas/asia-place-readings.ts';
import {asiaFocusFieldReadings,asiaFocusForPath} from '../../src/data/atlas/asia-focus.ts';
import {waterContains} from '../../src/data/atlas/asia-water.ts';
import {readAsiaAtlasState,writeAsiaAtlasState,startAsiaComparison,restoreAsiaComparison,gridCellAt} from '../../src/lib/atlas-asia-state.ts';
import {asiaNaturalTopics} from '../../src/data/atlas/asia-physical-reading.ts';
import {tradeTopics} from '../../src/data/atlas/asia-trade.ts';
const asset=(type,file='manifest.json')=>JSON.parse(file.endsWith('.gz')?gunzipSync(readFileSync(`public/assets/atlas/asia-${type}-v1/${file}`)):readFileSync(`public/assets/atlas/asia-${type}-v1/${file}`,'utf8'));
const farm=asset('farming'),industry=asset('industry'),population=asset('population'),trade=asset('trade');
const base={field:'natural',place:null,city:null,point:null,detail:null,topic:null,back:null,camera:null};
const seasonalCases=['north-china-wheat','niigata-rice','mekong-rice','punjab-wheat','fergana-cotton','kazakhstan-wheat'];
const monthIds=Array.from({length:12},(_,i)=>'m-'+String(i+1).padStart(2,'0'));
const cropHaAt=(scene,topic=scene.topic)=>{
 if(topic==='rice'){
  const grid=asset('agriculture',`${scene.region}-rice-grid.json`),[lng,lat]=scene.point;
  const col=Math.floor((lng-grid.bounds[0])/grid.cellSize),row=Math.floor((grid.bounds[3]-lat)/grid.cellSize);
  assert.ok(col>=0&&col<grid.width&&row>=0&&row<grid.height,scene.id+' rice point is in grid bounds');
  const index=row*grid.width+col;
  assert.ok(grid.validRuns.some(([start,length])=>index>=start&&index<start+length),scene.id+' rice cell is valid');
  return grid.positiveCells.find(([cell])=>cell===index)?.[1]??0;
 }
 const layer=farm.regions[scene.region].layers.find(l=>l.id===topic);
 const bytes=gunzipSync(readFileSync(`public/assets/atlas/asia-farming-v1/${layer.grid}`));
 const values=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 return gridCellAt({...layer,values},...scene.point);
};

test('全ての事例と比較先が、実在する主題・国・行政区域・都市・商品区分につながる',()=>{
 assert.equal(new Set(asiaPlaceReadings.map(s=>s.id)).size,asiaPlaceReadings.length);
 for(const region of Object.keys(farm.regions)){
  const records=asiaPlaceReadings.filter(s=>s.region===region),r=industry.regions[region],p=population.regions[region];
  const data=asset('industry',r.data.split('/').at(-1));
  assert.ok(records.filter(s=>s.field==='agriculture').length>=3);
  assert.ok(records.some(s=>s.field==='population'));assert.ok(records.some(s=>s.field==='industry'));
  const validate=(s,country)=>{
   const ids=s.field==='agriculture'?['rice',...farm.regions[region].layers.map(t=>t.id)]:s.field==='natural'?asiaNaturalTopics.map(t=>t.id):s.field==='population'?['density','urban']:[...r.topics,...tradeTopics].map(t=>t.id);
   assert.ok(ids.includes(s.topic),region+' '+s.topic);
   if(s.topic==='seasonal-precipitation'){assert.equal(s.field,'natural');assert.ok(monthIds.includes(s.detail),s.detail);assert.ok(s.question?.length>40);assert.match(s.label,/\d+月/);}
   else if(s.detail?.startsWith('t-'))assert.ok(trade.chapters[s.detail.slice(2)]);
   else if(s.field==='industry'&&s.detail){const row=data.admin.find(d=>d.id===s.detail&&d.country===country);assert.ok(row,s.detail);assert.ok(row.series[s.topic]?.length,s.topic+' '+s.detail);}
   else if(s.field==='population'&&s.detail)assert.ok(p.cities.some(c=>c.id===s.detail&&c.country===country),s.detail);
  };
  for(const s of records){validate(s,s.country);for(const b of s.bridges)validate(b,s.country);for(const source of [s.source,...s.additionalSources??[]])assert.match(source.url,/^https:\/\//);assert.ok(s.scope.length>40);}
 }
});

test('中央アジアのfocusは南アジアの事例を混ぜず、4分野から収録済みの比較へ進める',()=>{
 assert.equal(asiaFocusForPath('/insight-journal/atlas/asia/central-asia/industry/'),'central-asia');
 assert.equal(asiaFocusForPath('/atlas/asia/south-central-asia/nature/'),undefined);
 for(const field of ['natural','agriculture','industry','population'])assert.ok(asiaFocusFieldReadings['central-asia'][field].takeaway);
 for(const field of ['agriculture','industry','population']){
  const scenes=availablePlaceReadings('south-central-asia',field,'central-asia');
  assert.ok(scenes.length>0,field);
  assert.ok(scenes.every(s=>['KAZ','KGZ','TJK','TKM','UZB'].includes(s.country)));
  assert.ok(availablePlaceReadings('south-central-asia',field,'south-asia').every(s=>!['KAZ','KGZ','TJK','TKM','UZB'].includes(s.country)));
 }
 const scene=asiaPlaceReadings.find(s=>s.id==='fergana-cotton'),selected=choosePlaceReading(base,scene);
 const url=new URL('https://example.org/atlas/asia/central-asia/agriculture/');
 const target=startPlaceComparison(url,selected,scene.bridges.find(b=>b.topic==='basins'));
 assert.deepEqual(target.point,scene.point);
 const context={countries:['UZB'],cities:[],bounds:[45,-2,99,57],fields:['natural','agriculture'],topics:{natural:['basins'],agriculture:['cotton']},stories:{agriculture:[scene.id]}};
 const restored=restoreAsiaComparison(url,target,context);
 assert.equal(restored.story,scene.id);assert.equal(restored.topic,'cotton');assert.deepEqual(restored.point,scene.point);
});

test('説明は国・分野・主題・詳細・着目地点と整合する場合だけ表示する',()=>{
 const scene=asiaPlaceReadings.find(s=>s.id==='north-china-wheat'),state=choosePlaceReading(base,scene);
 assert.equal(selectedPlaceReading(scene.region,state),scene);
 for(const change of [{field:'industry'},{place:'JPN'},{topic:'rice'},{detail:'unknown'},{point:[115,38]},{story:'<script>'}])assert.equal(normalizePlaceReading(scene.region,{...state,...change}).story,null);
 assert.equal(normalizePlaceReading('southeast-asia',state).story,null);
});

test('季節比較の全事例は掲載作物の正の実格子と、対象国を含む実流域に対応する',()=>{
 for(const id of seasonalCases){
  const s=asiaPlaceReadings.find(s=>s.id===id);
  assert.ok(cropHaAt(s)>0,id+' has a positive crop cell');
  for(const b of s.bridges.filter(b=>b.field==='agriculture'&&b.topic==='rice'))assert.ok(cropHaAt(s,b.topic)>0,id+' rice comparison has a positive crop cell');
  const basin=asset('water',`${s.region}.basins.json.gz`);
  const hit=basin.geometry.features.find(f=>waterContains(f.geometry,s.point));
  assert.ok(hit,id+' is in a real basin');
  const record=basin.records.find(r=>r.id===hit.properties.id);
  assert.ok(record.countries.includes(s.country),id+' basin includes the source country');
  if(id==='mekong-rice'){assert.equal(record.id,'b-4060017020');assert.ok(record.rivers.includes('メコン川'));assert.equal(record.coastal,false);}
  if(id==='fergana-cotton')assert.ok(record.rivers.includes('シルダリヤ川'));
 }
 const basin=asset('water','south-central-asia.basins.json.gz');
 for(const id of ['fergana-cotton','tashkent-city']){
  const s=asiaPlaceReadings.find(s=>s.id===id),b=s.bridges.find(b=>b.topic==='basins');
  const point=startPlaceComparison(new URL('https://example.org/atlas/asia/central-asia/population/'),choosePlaceReading(base,s),b).point;
  const hit=basin.geometry.features.find(f=>waterContains(f.geometry,point));
  assert.ok(hit,id+' is in a real basin');
  assert.ok(basin.records.find(r=>r.id===hit.properties.id).countries.includes(s.country),id+' basin includes the source country');
 }
});

test('三地域と中央アジアfocusの作物から具体的な月を開き、月変更・再読込後も元の事例へ復帰する',()=>{
 const expectedMonths={'north-china-wheat':'m-04','niigata-rice':'m-07','mekong-rice':'m-03','punjab-wheat':'m-06','fergana-cotton':'m-07','kazakhstan-wheat':'m-07'};
 const regions=new Set();
 for(const id of seasonalCases){
  const scene=asiaPlaceReadings.find(s=>s.id===id),bridge=scene.bridges.find(b=>b.topic==='seasonal-precipitation');
  assert.ok(bridge,id+' has a seasonal comparison');assert.equal(bridge.detail,expectedMonths[id]);regions.add(scene.region);
  const context={countries:[scene.country],cities:[],bounds:[45,-12,155,57],fields:['natural','agriculture'],topics:{natural:['seasonal-precipitation'],agriculture:[scene.topic]},details:{natural:monthIds},stories:{agriculture:[scene.id]}};
  const url=new URL(`https://example.org/atlas/asia/${scene.region}/agriculture/`);
  const source=readAsiaAtlasState(writeAsiaAtlasState(url,choosePlaceReading(base,scene)),context);
  const target=startPlaceComparison(url,source,bridge),targetUrl=writeAsiaAtlasState(url,target);
  const reloaded=readAsiaAtlasState(targetUrl,context);
  assert.equal(reloaded.field,'natural');assert.equal(reloaded.topic,'seasonal-precipitation');assert.equal(reloaded.detail,bridge.detail);
  assert.equal(reloaded.story,undefined);assert.deepEqual(reloaded.point,source.point);assert.deepEqual(reloaded.camera,source.camera);
  const switchedUrl=writeAsiaAtlasState(targetUrl,{...reloaded,detail:bridge.detail==='m-01'?'m-07':'m-01'});
  const switched=readAsiaAtlasState(switchedUrl,context);
  assert.equal(switched.back,reloaded.back);assert.deepEqual(restoreAsiaComparison(switchedUrl,switched,context),source);
 }
 assert.equal(regions.size,3);
 for(const id of ['fergana-cotton','kazakhstan-wheat'])assert.ok(availablePlaceReadings('south-central-asia','agriculture','central-asia').find(s=>s.id===id)?.bridges.some(b=>b.topic==='seasonal-precipitation'));
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

test('バンコクの都市代表点を渡して実際の流域を選び、復帰時には都市範囲へ戻す',()=>{
 const scene=asiaPlaceReadings.find(s=>s.id==='bangkok-city'),bridge=scene.bridges.find(b=>b.topic==='basins');
 const city=population.regions[scene.region].cities.find(c=>c.id===scene.detail);
 const state=choosePlaceReading(base,scene),url=new URL('https://example.org/atlas/asia/southeast-asia/population/');
 const target=startPlaceComparison(url,state,bridge);assert.ok(target.point);assert.equal(target.story,undefined);
 target.point.forEach((v,i)=>assert.ok(Math.abs(v-city.coordinates[i])<0.00001));
 const basin=asset('water','southeast-asia.basins.json.gz');
 const hit=basin.geometry.features.find(f=>waterContains(f.geometry,target.point));assert.ok(hit,'a real basin contains the city point');
 assert.ok(basin.records.find(r=>r.id===hit.properties.id).countries.includes('THA'));
 const context={countries:['THA'],cities:[],bounds:[91,-12,143,30],fields:['population','natural'],topics:{population:['urban']},details:{population:[scene.detail]},stories:{population:[scene.id]}};
 const back=restoreAsiaComparison(url,target,context);assert.equal(back.point,undefined);assert.equal(back.detail,scene.detail);assert.equal(back.story,scene.id);
 for(const s of asiaPlaceReadings)for(const b of s.bridges.filter(b=>b.topic==='basins'))assert.ok(startPlaceComparison(url,choosePlaceReading(base,s),b).point,'every same-location basin comparison has a point');
});
