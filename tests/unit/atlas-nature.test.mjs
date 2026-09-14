import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readAtlasState,writeAtlasState,climateCityIds} from '../../src/lib/atlas-state.ts';
import {climateCell,validNatureFeature} from '../../src/lib/atlas-nature-state.ts';
import {createNatureLoader} from '../../src/lib/atlas-nature-loader.ts';
const base=new URL('../../public/assets/atlas/nature-v1/',import.meta.url);
const archiveBase=new URL('../../data/derived/nature-v1/contours-detail/',import.meta.url);
const read=name=>readFileSync(new URL(name,base));
const json=name=>JSON.parse(read(name));
const readArchive=name=>readFileSync(new URL(name,archiveBase));
const archiveJson=name=>JSON.parse(readArchive(name));

test('自然環境・旧経路・都市・畜産・位置をURL往復で保持する',()=>{
 const source=new URL('https://example.com/insight-journal/atlas/north-america/land/?city=miami&agriLayers=livestock&animal=dairy&animalRegion=california-dairy&lng=-120&lat=38&z=5');
 const s=readAtlasState(source);assert.equal(s.field,'natural');assert.equal(s.env,'landform');
 const out=writeAtlasState(source,'/insight-journal/atlas/north-america/','natural',s.camera,s.crop,s.region,s.stats,s.view,s.agriLayers,s.animal,s.animalRegion,{env:'water',city:s.city,natureFeature:'water:High Plains Aquifer'});
 const restored=readAtlasState(out);assert.equal(out.pathname,'/insight-journal/atlas/north-america/nature/');assert.equal(restored.city,'miami');assert.equal(restored.animalRegion,'california-dairy');assert.deepEqual(restored.camera,s.camera);assert.equal(restored.natureFeature,'water:High Plains Aquifer');
 assert.equal(validNatureFeature('water:<script>'),null);assert.equal(validNatureFeature('climate:unknown'),null);assert.equal(validNatureFeature('elevation:9999'),null);
 for(const value of ['elevation:0','elevation:500','elevation:4000'])assert.equal(validNatureFeature(value),value);
 for(const value of ['elevation:-50','elevation:100','elevation:250','elevation:4500','elevation:0500'])assert.equal(validNatureFeature(value),null);
 const legacy=readAtlasState(new URL('https://example.com/insight-journal/atlas/north-america/nature/?env=contour&natureFeature=elevation:250&lng=-110&lat=40&z=7'));
 assert.equal(legacy.natureFeature,null);assert.deepEqual(legacy.camera,{lng:-110,lat:40,zoom:7});
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

test('全国の座標、気候セル、公開等高線の500m間隔を一致させる',()=>{
 const m=json('manifest.json');assert.equal(climateCell(180,0,...m.climate.gridSize,m.climate.gridBounds3857),null);
 const city=json('climate-cities.json')[0];const index=climateCell(city.longitude,city.latitude,...m.climate.gridSize,m.climate.gridBounds3857);assert.ok(index>=0&&index<m.climate.gridSize[0]*m.climate.gridSize[1]*4);
 assert.deepEqual(m.elevation.contourIntervalsM,[500]);assert.equal(m.elevation.featureCount,32268);
 const contours=JSON.parse(gunzipSync(read('contours.geojson.gz')));assert.equal(contours.features.length,m.elevation.featureCount);
 assert.ok(contours.features.every(feature=>feature.geometry.type==='LineString'&&feature.properties.elevationM>=0&&feature.properties.elevationM<=4000&&feature.properties.elevationM%500===0&&feature.properties.index===(feature.properties.elevationM%1000===0)));
});

test('公開自然環境資産の全ハッシュとgzipを検証し、巨大な未圧縮等高線を配信しない',()=>{
 const m=json('manifest.json');for(const [name,record] of Object.entries(m.files)){
  const raw=read(name);assert.equal(raw.byteLength,record.bytes,name);assert.equal(createHash('sha256').update(raw).digest('hex'),record.sha256,name);
  if(name.endsWith('.gz')){const data=JSON.parse(gunzipSync(raw));assert.equal(data.type,'FeatureCollection');assert.ok(data.features.every(f=>Number.isFinite(f.properties.elevationM)));}
 }
 assert.equal(Object.keys(m.files).length,13);assert.equal(Object.values(m.files).reduce((sum,item)=>sum+item.bytes,0),3666441);
 assert.ok(read('landform-interactive.webp').byteLength<450000);
 assert.ok(read('contours.geojson.gz').byteLength<3e6);assert.ok(!Object.keys(m.files).some(name=>name==='contour-tiles.json'||name.startsWith('contours/')));
 assert.deepEqual(m.elevation.preservedDetailArchive,{repositoryPath:'data/derived/nature-v1/contours-detail/manifest.json',publiclyServed:false,fileCount:62,compressedBytes:24093925});
 const aquifers=json('aquifers.geojson').features;for(const name of ['High Plains Aquifer','Central Valley Aquifer System'])assert.ok(aquifers.some(f=>f.properties.AQ_NAME===name));
});

test('地域別等高線62件を同じ内容とGit Blob SHAで公開外に保全する',()=>{
 const manifest=archiveJson('manifest.json'),index=archiveJson('contour-tiles.json');
 assert.equal(manifest.sourcePublicCommit,'e1490e34ee3f03a5506fcfa5fb49223c0a450845');assert.equal(manifest.fileCount,62);assert.equal(manifest.compressedBytes,24093925);
 assert.deepEqual(Object.fromEntries([100,250].map(interval=>[interval,manifest.files.filter(file=>file.intervalM===interval).length])),{100:31,250:31});
 const paths=new Set(),oldPaths=new Set();
 for(const record of manifest.files){
  assert.ok(!paths.has(record.path));paths.add(record.path);assert.ok(!oldPaths.has(record.oldPublicPath));oldPaths.add(record.oldPublicPath);
  assert.match(record.path,/^(?:100|250)\/.+\.geojson\.gz$/);assert.equal(Number(record.path.split('/')[0]),record.intervalM);
  const raw=readArchive(record.path);assert.equal(raw.byteLength,record.bytes,record.path);assert.equal(createHash('sha256').update(raw).digest('hex'),record.sha256,record.path);
  const header=Buffer.from(`blob ${raw.byteLength}\0`);assert.equal(createHash('sha1').update(Buffer.concat([header,raw])).digest('hex'),record.gitBlobSha,record.path);
  const tile=index.find(item=>item.file===record.path);assert.ok(tile,record.path);assert.equal(tile.intervalM,record.intervalM);assert.deepEqual(tile.bounds,record.bounds);assert.equal(tile.bytes,record.bytes);
 }
 assert.equal(index.length,62);for(const interval of ['100','250'])assert.equal(readdirSync(new URL(interval+'/',archiveBase)).filter(name=>name.endsWith('.geojson.gz')).length,31);
});

test('全国等高線を一度だけ共有し、失敗した取得だけ再試行する',async()=>{
 const requests=[];let fail=true;
 const loader=createNatureLoader('/assets/',async url=>{requests.push(String(url));if(fail){fail=false;return new Response('',{status:503});}return new Response(read('contours.geojson.gz'));});
 await assert.rejects(loader.contours([-128,22,-64,52],3));
 const [a,b]=await Promise.all([loader.contours([-110,35,-100,45],5),loader.contours([-90,30,-80,40],7)]);const c=await loader.contours([-128,22,-64,52],4);
 assert.deepEqual(requests,['/assets/contours.geojson.gz','/assets/contours.geojson.gz']);assert.strictEqual(a,b);assert.strictEqual(b,c);assert.ok(a.features.length>0);
 assert.ok(requests.every(url=>!url.includes('contour-tiles')&&!url.includes('/contours/')));
});
