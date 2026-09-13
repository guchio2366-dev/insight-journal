import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readAtlasState,writeAtlasState,climateCityIds} from '../../src/lib/atlas-state.ts';
import {climateCell,contourInterval,validNatureFeature} from '../../src/lib/atlas-nature-state.ts';
import {createNatureLoader,intersectingTiles} from '../../src/lib/atlas-nature-loader.ts';
const base=new URL('../../public/assets/atlas/nature-v1/',import.meta.url);
const read=name=>readFileSync(new URL(name,base));
const json=name=>JSON.parse(read(name));

test('自然環境・旧経路・都市・畜産・位置をURL往復で保持する',()=>{
 const source=new URL('https://example.com/insight-journal/atlas/north-america/land/?city=miami&agriLayers=livestock&animal=dairy&animalRegion=california-dairy&lng=-120&lat=38&z=5');
 const s=readAtlasState(source);assert.equal(s.field,'natural');assert.equal(s.env,'landform');
 const out=writeAtlasState(source,'/insight-journal/atlas/north-america/','natural',s.camera,s.crop,s.region,s.stats,s.view,s.agriLayers,s.animal,s.animalRegion,{env:'water',city:s.city,natureFeature:'water:High Plains Aquifer'});
 const restored=readAtlasState(out);assert.equal(out.pathname,'/insight-journal/atlas/north-america/nature/');assert.equal(restored.city,'miami');assert.equal(restored.animalRegion,'california-dairy');assert.deepEqual(restored.camera,s.camera);assert.equal(restored.natureFeature,'water:High Plains Aquifer');
 assert.equal(validNatureFeature('water:<script>'),null);assert.equal(validNatureFeature('climate:unknown'),null);assert.equal(validNatureFeature('elevation:9999'),null);
});

test('12都市144か月の原値・変換・地点・品質情報が一致し共通軸内に入る',()=>{
 const cities=json('climate-cities.json');assert.deepEqual(cities.map(c=>c.id).sort(),[...climateCityIds].sort());
 const audit=JSON.parse(readFileSync(new URL('../../data/sources/nature-v1/monthly-audit.json',import.meta.url)));
 for(const city of cities){
  assert.equal(city.period,'1991–2020');assert.equal(city.temperatureC.length,12);assert.equal(city.precipitationMm.length,12);assert.equal(city.monthlyQuality.length,12);
  const raw=readFileSync(new URL(`../../data/sources/nature-v1/${city.stationId}.csv`,import.meta.url));assert.equal(createHash('sha256').update(raw).digest('hex'),city.inputSha256);
  for(const [i,m] of audit.find(a=>a.id===city.id).months.entries()){
   assert.ok(Math.abs(city.temperatureC[i]-(m.temperatureF-32)*5/9)<=.050001);assert.ok(Math.abs(city.precipitationMm[i]-m.precipitationIn*25.4)<=.050001);
   assert.ok(city.temperatureC[i]>=-10&&city.temperatureC[i]<=40);assert.ok(city.precipitationMm[i]>=0&&city.precipitationMm[i]<=350);
  }
  if(city.id==='washington-dc'){assert.equal(city.koppenCode,null);assert.match(city.koppenNote,/欠測|未収録/);}else assert.ok(json('climate-legend.json').some(c=>c.code===city.koppenCode&&c.id===city.koppenGridId));
 }
});

test('全国の座標、気候セル、等高線間隔と対象タイルの境界を一致させる',()=>{
 const m=json('manifest.json');assert.equal(climateCell(180,0,...m.climate.gridSize,m.climate.gridBounds3857),null);
 const city=json('climate-cities.json')[0];const index=climateCell(city.longitude,city.latitude,...m.climate.gridSize,m.climate.gridBounds3857);assert.ok(index>=0&&index<m.climate.gridSize[0]*m.climate.gridSize[1]*4);
 assert.deepEqual([4.49,4.5,5.99,6,7].map(contourInterval),[500,250,250,100,100]);
 const tiles=intersectingTiles(json('contour-tiles.json'),[-106,38,-102,42],6);assert.ok(tiles.length>0);assert.ok(tiles.every(t=>t.intervalM===100));
 assert.ok(!tiles.some(t=>t.bounds[2]<-106||t.bounds[0]>-102));
});

test('公開自然環境資産の全ハッシュとgzipを検証し、巨大な未圧縮等高線を配信しない',()=>{
 const m=json('manifest.json');for(const [name,record] of Object.entries(m.files)){
  const raw=read(name);assert.equal(raw.byteLength,record.bytes,name);assert.equal(createHash('sha256').update(raw).digest('hex'),record.sha256,name);
  if(name.endsWith('.gz')){const data=JSON.parse(gunzipSync(raw));assert.equal(data.type,'FeatureCollection');assert.ok(data.features.every(f=>Number.isFinite(f.properties.elevationM)));}
 }
 assert.ok(read('contours.geojson.gz').byteLength<3e6);assert.ok(!Object.keys(m.files).some(name=>name.includes('contours')&&name.endsWith('.geojson')));
 const aquifers=json('aquifers.geojson').features;for(const name of ['High Plains Aquifer','Central Valley Aquifer System'])assert.ok(aquifers.some(f=>f.properties.AQ_NAME===name));
});

test('等高線をキャッシュし失敗だけ再試行する',async()=>{
 let count=0,fail=true;
 const loader=createNatureLoader('/assets/',async url=>{count++;if(fail){fail=false;return new Response('',{status:503});}return new Response(read(url.split('/').at(-1)));});
 await assert.rejects(loader.json('contours.geojson.gz'));
 const [a,b]=await Promise.all([loader.json('contours.geojson.gz'),loader.json('contours.geojson.gz')]);assert.equal(count,2);assert.strictEqual(a,b);assert.ok(a.features.length>0);
});
