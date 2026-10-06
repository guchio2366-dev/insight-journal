import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {industryValues,industryValueLabel,industryScale,normalizeIndustryState} from '../../src/data/atlas/asia-industry.ts';
const root=new URL('../../public/assets/atlas/asia-industry-v1/',import.meta.url);
const read=name=>JSON.parse(name.endsWith('.gz')?gunzipSync(readFileSync(new URL(name,root))):readFileSync(new URL(name,root),'utf8'));
const manifest=read('manifest.json'),national=read('national.json.gz');
test('産業原本の値・単位・地域の対応を保持し、秘匿とゼロを区別する',()=>{
 const east=read('east-asia.json.gz'),se=read('southeast-asia.json.gz'),south=read('south-central-asia.json.gz');
 assert.equal(east.admin.find(a=>a.id==='JP-23').series['jp-00'][0].value,59314388);
 assert.equal(east.admin.find(a=>a.id==='CN-HE').series['cn-steel'][0].value,230520);
 assert.equal(east.admin.find(a=>a.sourceName==='Beijing').series['cn-steel'][0].value,null);
 assert.equal(south.admin.find(a=>a.id==='IN-GJ').series['in-manufacturing'].find(v=>v.year==='2022–23').value,44015190);
 assert.deepEqual(south.admin.find(a=>a.id==='IN-LA').series['in-manufacturing'],[]);
 assert.equal(se.admin.find(a=>a.id==='MY-16').series['my-p3'].find(v=>v.year==='2025').value,0);
 assert.equal(se.admin.find(a=>a.id==='MY-16').series['my-p3'].find(v=>v.year==='2023').value,null);
 assert.equal(se.admin.find(a=>a.id==='MY-supra').point,undefined);
 assert.equal(se.geometry.features.some(f=>f.properties.id==='MY-supra'),false);
 assert.equal(east.power.length+se.power.length+south.power.length,7702);
 assert.equal(east.steel.CHN.total,1087894);assert.equal(east.steel.JPN.total,105900);
 for(const data of [east,se,south])for(const plant of data.power){assert.equal(plant.point.length,2);assert.ok(plant.capacity>=0);assert.equal(plant.generation.length,7);assert.ok(plant.generation.every(g=>Number(g.year)>=2013&&Number(g.year)<=2019));}
 assert.ok(east.admin.some(a=>Object.values(a.series).some(s=>s.some(v=>v.status==='秘匿'&&v.value===null))));
});
test('全主題の地域とIDは一意で、国別の分母と固定年を保持する',()=>{
 for(const region of Object.values(manifest.regions)){
  const data=read(region.data),records=[...data.admin,...data.power];assert.equal(new Set(records.map(d=>d.id)).size,records.length);
  assert.equal(region.details,undefined);for(const record of records)assert.ok(region.countries.includes(record.country));
  for(const t of region.topics){assert.ok(t.source.startsWith('https://'));assert.ok(t.note&&t.unit&&t.year);const values=industryValues(t,data,national,region.countries);assert.ok(values.every(v=>v.value===null||Number.isFinite(v.value)));}
  assert.equal(region.topics.find(t=>t.id==='resource-rents').year,'2021');assert.equal(region.topics.find(t=>t.id==='manufactured-exports').year,'2023');
 }
});
test('日本の公表値・秘匿X・該当なし***を原本の状態付きで読み出す',()=>{
 const region=manifest.regions['east-asia'],data=read(region.data);
 const values=id=>industryValues(region.topics.find(t=>t.id===id),data,national,region.countries);
 const aichi=values('jp-00').find(v=>v.id==='JP-23');
 assert.deepEqual(aichi,{id:'JP-23',value:59314388,status:'公表値（0は丸め単位未満を含む）'});
 assert.equal(industryValueLabel(aichi),'59,314,388');
 for(const [id,status] of [['JP-43','秘匿'],['JP-42','該当なし']]){
  const original=data.admin.find(a=>a.id===id).series['jp-20'][0],value=values('jp-20').find(v=>v.id===id);
  assert.deepEqual(original,{year:'2024',value:null,status});
  assert.deepEqual(value,{id,value:null,status});
  assert.equal(industryValueLabel(value),status);
 }
 // Every Japanese topic must carry the original publication state through
 // projection, rather than fixing only the sample prefectures above.
 for(const topic of region.topics.filter(t=>t.country==='JPN')){
  for(const value of industryValues(topic,data,national,region.countries)){
   const original=data.admin.find(a=>a.id===value.id).series[topic.id]?.find(v=>v.year===topic.year);
   assert.equal(value.status,original?.status,`${value.id} ${topic.id}`);
  }
 }
});
test('プトラジャヤの2023年未掲載と2025年公表0を同じ値表示でも区別する',()=>{
 const region=manifest.regions['southeast-asia'],data=read(region.data),topic=region.topics.find(t=>t.id==='my-p3');
 const valueAt=year=>industryValues({...topic,year},data,national,region.countries).find(v=>v.id==='MY-16');
 assert.equal(valueAt('2023').value,null);assert.equal(industryValueLabel(valueAt('2023')),'未掲載');
 assert.equal(valueAt('2025').value,0);assert.equal(industryValueLabel(valueAt('2025')),'0（公表値）');
 const scale=industryScale(topic,[valueAt('2023'),valueAt('2025'),{value:32}]);
 assert.notEqual(scale.color(valueAt('2023').value),scale.color(valueAt('2025').value));
 assert.equal(industryValueLabel(valueAt('2022')),'未掲載','absent years also remain missing');
});
test('状態表示は非数値の理由を分け、数値の0と公表桁数を保持する',()=>{
 for(const [value,label] of [
  [{value:null,status:'秘匿'},'秘匿'],[{value:null,status:'該当なし'},'該当なし'],
  [{value:null},'未掲載'],[{value:null,status:'公表値（0は丸め単位未満を含む）'},'未掲載'],
  [{value:0},'0（公表値）'],[{value:0,status:'公表値（0は丸め単位未満を含む）'},'0（公表値）'],
  [{value:1234.5},'1,234.5'],[{value:-5},'-5'],
 ])assert.equal(industryValueLabel(value),label);
});
test('別の国・電源・主題のURLを混ぜず、ゼロと欠測の色を分ける',()=>{
 const region=manifest.regions['east-asia'],data=read(region.data),base={field:'industry',place:null,city:null,camera:null,back:null};
 assert.equal(normalizeIndustryState(region,{...base,topic:'jp-00',detail:'JP-23'},data).place,'JPN');
 assert.equal(normalizeIndustryState(region,{...base,topic:'jp-00',place:'CHN',detail:'JP-23'},data).detail,null);
 const plant=data.power.find(p=>p.fuel==='Coal');assert.equal(normalizeIndustryState(region,{...base,topic:'power-coal',detail:plant.id},data).detail,plant.id);
 assert.equal(normalizeIndustryState(region,{...base,topic:'power-hydro',detail:plant.id},data).detail,null);
 assert.equal(normalizeIndustryState(region,{...base,topic:'manufacturing',detail:plant.id},data).detail,null);
 const scale=industryScale(region.topics[0],[{value:0},{value:null},{value:32}]);assert.notEqual(scale.color(0),scale.color(null));
});
