import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {japanEntryURL,readJapanState,writeJapanState,japanReturnURL,safeJapanReturn} from '../../src/lib/atlas-japan-state.ts';
import {writeAsiaAtlasState} from '../../src/lib/atlas-asia-state.ts';
const url=path=>new URL('https://example.org/insight-journal/atlas/'+path);
const context={prefectures:['JP-23'],cities:['tokyo','uc-5929'],sites:['toyota']};
test('農産地と自然の選択を独立URLに保持し、別分野の同名パラメータを引き継がない',()=>{
 const scoped={...context,agricultureSites:['tokachi-farming'],naturalFeatures:['river-ishikari','climate-region-japan-sea'],urbanCities:['uc-5929','jp-pop-niigata'],climateCities:['tokyo']};
 const farm=readJapanState(url('japan/agriculture/?topic=wheat&site=tokachi-farming&feature=river-ishikari'),scoped);
 assert.equal(farm.site,'tokachi-farming');assert.equal(farm.feature,null);assert.equal(farm.city,null);
 const water=readJapanState(url('japan/nature/?topic=water&feature=river-ishikari&site=tokachi-farming'),scoped);
 assert.equal(water.feature,'river-ishikari');assert.equal(water.site,null);
 assert.deepEqual(readJapanState(writeJapanState(url('japan/nature/'),water),scoped),water);
 assert.equal(readJapanState(url('japan/population/?city=jp-pop-niigata&feature=river-ishikari'),scoped).city,'jp-pop-niigata');
 assert.equal(readJapanState(url('japan/population/?city=jp-pop-niigata&feature=river-ishikari'),scoped).feature,null);
 assert.equal(readJapanState(url('japan/nature/?feature=unverified'),scoped).feature,null);
 assert.equal(readJapanState(url('japan/nature/?topic=climate&feature=river-ishikari'),scoped).feature,null);
 assert.equal(readJapanState(url('japan/agriculture/?topic=forest&site=tokachi-farming'),scoped).site,null);
});
test('日本への明示入口は現在分野を引き継ぎ元の地図範囲と選択をURLで保存する',()=>{
 const original=url('asia/east-asia/nature/?city=tokyo&place=JPN&lng=137&lat=38&z=4.5');
 const state={field:'natural',topic:'climate',city:'tokyo',place:'JPN',camera:{lng:137,lat:38,zoom:4.5},back:null};
 const next=japanEntryURL(original,state);assert.equal(next.pathname,'/insight-journal/atlas/japan/nature/');
 const japan=readJapanState(next,context);assert.equal(japan.city,null);assert.equal(japan.prefecture,null);
 assert.equal(japanReturnURL(next,japan).href,writeAsiaAtlasState(original,state).href);
 const switched={...japan,field:'industry',topic:'jp-31',prefecture:'JP-23',camera:{lng:136,lat:35,zoom:6}};
 const written=writeJapanState(next,switched);assert.equal(written.pathname,'/insight-journal/atlas/japan/industry/');
 assert.deepEqual(readJapanState(written,context),switched);
 assert.equal(japanReturnURL(written,switched).href,writeAsiaAtlasState(original,state).href);
});
test('直接URLは県を選ばず、外部・別ルートのreturnと不正な座標を拒否する',()=>{
 const direct=url('japan/industry/?topic=missing&prefecture=JP-99&site=unknown&lng=&lat=36&z=20');
 const state=readJapanState(direct,context);assert.equal(state.topic,'clusters');assert.equal(state.camera,null);assert.equal(state.prefecture,null);assert.equal(state.site,null);
 assert.equal(japanReturnURL(direct,state).pathname,'/insight-journal/atlas/asia/east-asia/industry/');
 for(const value of ['https://evil.test/','//evil.test/','/insight-journal/atlas/japan/industry/','/insight-journal/atlas/asia/east-asia/nature/?return=x','/other/atlas/asia/east-asia/nature/','/insight-journal/atlas/asia/east-asia/industry/\\evil'])assert.equal(safeJapanReturn(value,direct),null,value);
});
test('観測所・都市域と選択産業の立地を別々に検証する',()=>{
 const scoped={...context,climateCities:['tokyo'],urbanCities:['uc-5929'],siteIndustries:{toyota:['auto']}};
 assert.equal(readJapanState(url('japan/nature/?city=uc-5929'),scoped).city,null);
 assert.equal(readJapanState(url('japan/population/?topic=urban&city=tokyo'),scoped).city,null);
 assert.equal(readJapanState(url('japan/industry/?topic=chips&site=toyota'),scoped).site,null);
 assert.equal(readJapanState(url('japan/industry/?topic=auto&site=toyota'),scoped).site,'toyota');
});
test('全国の金額・時点・原表状態と人口の5km集約値を保持する',()=>{
 const read=name=>JSON.parse(readFileSync(new URL('../../public/assets/atlas/'+name,import.meta.url),'utf8'));
 const original=read('asia-industry-v1/east-asia.json'),japan=read('japan-v1/industry.json');
 assert.equal(japan.admin.length,47);assert.deepEqual(japan.admin,original.admin.filter(a=>a.country==='JPN').sort((a,b)=>a.id.localeCompare(b.id)));
 assert.equal(japan.admin.reduce((n,a)=>n+a.series['jp-00'][0].value,0),381654010);
 const metadata=read('japan-v1/population.json');assert.equal(metadata.sourceCellKm,5);assert.equal(metadata.year,2020);assert.equal(metadata.validation.inlandValuesUnchanged,true);
 const base=read('asia-population-v1/manifest.json').regions['east-asia'];
 const bytes=name=>gunzipSync(readFileSync(new URL('../../public/assets/atlas/'+name,import.meta.url)));
 const data=bytes('japan-v1/population.density.gz'),source=bytes('asia-population-v1/east-asia.density.gz');
 const dx=(base.bounds3857[2]-base.bounds3857[0])/base.width,dy=(base.bounds3857[3]-base.bounds3857[1])/base.height;
 const col=Math.round((metadata.bounds3857[0]-base.bounds3857[0])/dx),row=Math.round((base.bounds3857[3]-metadata.bounds3857[3])/dy);
 assert.equal(data.length,metadata.width*metadata.height*4);
 let checked=0;
 for(let r=0;r<metadata.height;r++)for(let c=0;c<metadata.width;c++){const value=data.readFloatLE((r*metadata.width+c)*4);if(value===-200)continue;assert.equal(value,source.readFloatLE(((row+r)*base.width+col+c)*4));checked++;}
 assert(checked>10000);
});
