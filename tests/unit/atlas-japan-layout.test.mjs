import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import crypto from 'node:crypto';
import {japanAreas,japanArea,japanInsetBounds} from '../../src/data/atlas/japan-areas.ts';
import {japanIndustrySectors,japanSiteInSector} from '../../src/lib/atlas-japan-sectors.ts';
import {japanIndustryClusters} from '../../src/data/atlas/japan-industry-clusters.ts';
import {readJapanState,writeJapanState} from '../../src/lib/atlas-japan-state.ts';
import {japanClimateDefinition,japanStationClassCaveat} from '../../src/lib/atlas-japan-climate-definition.ts';
import {japanClimateCities} from '../../src/data/atlas/japan-climate-cities.ts';
import {japanNatureFeatureIds,getJapanNatureReading} from '../../src/data/atlas/japan-nature-v2.ts';
const url=p=>new URL('https://example.test/insight-journal/atlas/japan/'+p);
const context={prefectures:Array.from({length:47},(_,i)=>'JP-'+String(i+1).padStart(2,'0')),cities:japanClimateCities.map(c=>c.id),agricultureSites:['tokachi-farming'],forestrySites:['wood-nagai'],sites:japanIndustryClusters.map(s=>s.id),siteIndustries:Object.fromEntries(japanIndustryClusters.map(s=>[s.id,s.industries])),naturalFeatures:Object.values(japanNatureFeatureIds).flat()};
test('地方は47県を一度ずつ割り当て、区分変更で統計や形状を作らない',()=>{
 const assigned=japanAreas.slice(1).flatMap(a=>a.prefectures);assert.equal(assigned.length,47);assert.equal(new Set(assigned).size,47);assert.deepEqual(assigned.slice().sort(),context.prefectures);
 assert(japanArea('chubu').prefectures.includes('JP-15'));assert(japanArea('kinki').prefectures.includes('JP-24'));assert(!japanArea('kyushu').prefectures.includes('JP-47'));
 for(const area of japanAreas){assert(area.bounds[0]<area.bounds[2]);assert(area.bounds[1]<area.bounds[3]);}
 assert(japanInsetBounds[0]<127.69&&japanInsetBounds[2]>127.69);assert(japanInsetBounds[1]<26.21&&japanInsetBounds[3]>26.21);
});
test('全地方・全分野で表示範囲と既存選択、ON/OFF、帰路をURLに保存する',()=>{
 for(const area of japanAreas)for(const field of ['agriculture','nature','industry','population']){
  const initial=readJapanState(url(field+'/?area='+area.id+'&crops=off&livestock=off&lng=138&lat=38&z=5'),context);
  assert.equal(initial.area,area.id);assert.equal(initial.showCrops,false);assert.equal(initial.showLivestock,false);
  assert.deepEqual(readJapanState(writeJapanState(url(field+'/'),initial),context),initial);
 }
 const selected=readJapanState(url('agriculture/?topic=wheat&site=tokachi-farming&area=hokkaido&crops=off'),context);
 const local=readJapanState(writeJapanState(url('agriculture/'),{...selected,area:'tohoku',camera:null}),context);assert.equal(local.site,selected.site);assert.equal(local.topic,selected.topic);assert.equal(local.showCrops,false);
});
test('産業三分類は既存拠点を業種で整理し、無関係な分類のURL選択を混入させない',()=>{
 assert.deepEqual(japanIndustrySectors.map(s=>s.id),['resources','manufacturing','services']);
 for(const site of japanIndustryClusters)assert(japanIndustrySectors.some(s=>japanSiteInSector(site.industries,s.id)),site.id);
 const services=readJapanState(url('industry/?sector=services&topic=services&site=tokyo-finance&area=kanto'),context);assert.equal(services.site,'tokyo-finance');assert.equal(services.sector,'services');
 assert.equal(readJapanState(url('industry/?sector=resources&topic=services&site=tokyo-finance'),context).site,null);
 assert.equal(readJapanState(url('industry/?sector=resources&topic=jp-31&prefecture=JP-23'),context).prefecture,null);
});
test('旧水資源・人口URLを保全し、流域と地下水の説明を混同しない',()=>{
 const basin=japanNatureFeatureIds.basins.find(id=>id.startsWith('b-')),ground=japanNatureFeatureIds.groundwater[0];
 const oldBasin=readJapanState(url('nature/?topic=water&feature='+basin),context);assert.equal(oldBasin.topic,'basins');assert.equal(oldBasin.feature,basin);
 const oldGround=readJapanState(url('nature/?topic=groundwater&feature='+ground),context);assert.equal(oldGround.topic,'water');assert.equal(oldGround.feature,ground);
 assert.match(getJapanNatureReading('water',ground).overview,/安全な取水量/);
 assert.equal(readJapanState(url('population/?topic=urban'),context).topic,'density');
});
test('代表観測所の地図区分は実際の表示格子から読み、札幌の差を隠さない',()=>{
 const base='public/assets/atlas/japan-nature-v2/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json')),input=fs.readFileSync(base+manifest.climate.grid),grid=gunzipSync(input),records=JSON.parse(fs.readFileSync(base+'station-climate-classes.json'));
 assert.equal(records.length,6);
 for(const record of records){const [x,y]=record.pixel;assert.equal(grid[y*manifest.climate.width+x],record.classId);assert.equal(record.gridSha256,crypto.createHash('sha256').update(input).digest('hex'));assert.equal(record.sourceResolutionDegrees,.1);assert.equal(manifest.climate.classes.find(c=>c.id===record.classId)?.code??null,record.code);}
 const sapporo=japanClimateCities.find(c=>c.id==='sapporo');assert.match(japanStationClassCaveat('Dfb',sapporo.temperatureC),/一致しない項目/);assert.match(japanClimateDefinition('Dfb'),/22℃未満/);
});
test('起伏陰影は既存標高の派生図で、入力値・解像度・処理条件を保持する',()=>{
 const base='public/assets/atlas/japan-nature-v2/',m=JSON.parse(fs.readFileSync(base+'manifest.json'));assert.equal(m.terrain.sourceResolutionDegrees,m.elevation.sourceResolutionDegrees);
 assert.equal(m.terrain.sourceGridSha256,crypto.createHash('sha256').update(fs.readFileSync(base+m.elevation.grid)).digest('hex'));
 assert.equal(m.terrain.scriptSha256,crypto.createHash('sha256').update(fs.readFileSync(m.terrain.script)).digest('hex'));assert.match(m.terrain.method,/no source-value alteration|no vertical exaggeration/);assert.match(m.terrain.method,/transparent/);
});
