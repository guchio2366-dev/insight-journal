import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {europeLayers,layerColor} from '../../src/data/atlas/europe/layers.ts';
import {europeReadings} from '../../src/data/atlas/europe/readings.ts';
import {readEuropeState,writeEuropeState,displayCell} from '../../src/lib/atlas-europe-view.ts';
const bytes=p=>readFileSync(new URL('../../'+p,import.meta.url));
const json=p=>JSON.parse(bytes(p));
const countries=json('src/data/atlas/europe/countries.json');
test('全主題と比較元・地点をURLに保存し、未知の主題を受け付けない',()=>{
 assert.equal(new Set(europeLayers.map(l=>l.id)).size,europeLayers.length);
 for(const l of europeLayers){
  const state=readEuropeState('?place=UKR&layer=overlay&returnLayer='+l.id+'&feature=brasov',countries,['london']);
  assert.equal(state.returnLayer,l.id);assert.equal(state.feature,'brasov');
  assert.deepEqual(readEuropeState(writeEuropeState(new URL('https://example.test'),state).search,countries,['london']),state);
 }
 assert.equal(readEuropeState('?layer=unknown',countries,['london'],'density').layer,'density');
});
test('主題の分野へURLを同期し、地域入口・比較元・選択国を維持する',()=>{
 const state=readEuropeState('?place=FRA&layer=density&render=static',countries,['london'],'hubs');
 const current=new URL('https://example.test/insight-journal/atlas/europe/industry/?external=kept');
 assert.equal(writeEuropeState(current,state).pathname,'/insight-journal/atlas/europe/population/');
 assert.equal(writeEuropeState(current,state).searchParams.get('place'),'FRA');
 assert.equal(writeEuropeState(current,state).searchParams.get('external'),'kept');
 for(const layer of europeLayers)assert.equal(writeEuropeState(current,{...state,layer:layer.id}).pathname,`/insight-journal/atlas/europe/${layer.field}/`);
 const overlay={...state,layer:'overlay',returnLayer:'density'};
 assert.equal(writeEuropeState(current,overlay).pathname,'/insight-journal/atlas/europe/population/');
 assert.equal(writeEuropeState(current,overlay).searchParams.get('returnLayer'),'density');
 assert.equal(writeEuropeState(new URL('https://example.test/insight-journal/atlas/europe/'),state).pathname,'/insight-journal/atlas/europe/');
});

test('45対象の全国値は2023年に固定し、0と欠測を分けて塗る',()=>{
 const data=json('src/data/atlas/europe/country-statistics.json');assert.equal(data.year,2023);
 assert.equal(data.indicators.length,10);
 for(const i of data.indicators){assert.equal(Object.keys(i.values).length,45);for(const c of countries)assert.equal(Object.keys(i.values[c.code]).length,5);}
 const population=data.indicators.find(i=>i.id==='population');assert.ok(population.values.UKR['2023']>30e6);assert.ok(population.values.RUS['2023']>140e6);
 assert.equal(population.values.VAT['2023'],null);
 const layer=europeLayers.find(l=>l.id==='growth');assert.notEqual(layerColor(layer,null),layerColor(layer,0));assert.notEqual(layerColor(layer,-3),layerColor(layer,3));
});
test('配信アセットは出典記録のSHA256と一致する',()=>{
 for(const dir of ['context-v1','physical-v1','population-v1','farming-v1']){
  const base='public/assets/atlas/europe/'+dir+'/';const m=json(base+'manifest.json');
  const records=m.files??Object.assign({},...m.layers.map(l=>l.files));
  for(const [name,record] of Object.entries(records))assert.equal(createHash('sha256').update(bytes(base+name)).digest('hex'),record.sha256,name);
 }
});
test('人口格子と負標高のデータ契約を守り、海域を0にしない',()=>{
 const raw=gunzipSync(bytes('public/assets/atlas/europe/population-v1/density.bin.gz'));
 assert.equal(raw.length,1800*1502*4);const pop=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 assert.equal(displayCell(pop,[-20,40]).value,null);
 assert.ok(displayCell(pop,[2.35,48.86]).value>1000);
 assert.equal(displayCell(pop,[65,50]),null);
 const height=gunzipSync(bytes('public/assets/atlas/europe/physical-v1/elevation.bin.gz'));
 assert.equal(height.length,1800*1502*2);const h=Float32Array.from(new Int16Array(height.buffer,height.byteOffset,height.length/2));
 assert.equal(displayCell(h,[-20,40],-32768).value,null);
 assert.ok(displayCell(h,[8.0,46.5],-32768).value>1500);
 assert.ok(h.some(v=>v<0&&v!==-32768));
});
test('都市と産業拠点は国・座標・出典を持ち、作物と家畜の単位を混同しない',()=>{
 const cities=json('src/data/atlas/europe/population-cities.json');assert.equal(cities.length,132);
 for(const c of [...cities,...europeReadings]){assert.ok(countries.some(x=>x.code===c.country));assert.ok(c.coordinates[0]>=-25&&c.coordinates[0]<=65&&c.coordinates[1]>=32&&c.coordinates[1]<=73);}
 assert.equal(europeReadings.filter(r=>r.field==='industry').length,14);
 for(const r of europeReadings)assert.ok(r.source.startsWith('https://')&&r.period&&r.body);
 assert.equal(europeLayers.filter(l=>l.unit==='収穫面積 ha / 格子').length,12);
 assert.equal(europeLayers.find(l=>l.id==='chicken').unit,'羽/km²');
});
