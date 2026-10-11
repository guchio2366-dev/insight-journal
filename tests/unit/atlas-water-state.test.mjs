import test from 'node:test';import assert from 'node:assert/strict';
import {readWaterState,writeWaterState,waterTargetUrl,waterContains} from '../../src/lib/atlas-water-state.ts';
test('water URL defaults, validates, preserves independent selections and other fields',()=>{
 const source=new URL('https://example.com/insight-journal/atlas/north-america/nature/?env=water&city=denver&crop=wheat&waterView=bad&basin=fake');
 assert.deepEqual(readWaterState(source),{waterView:'rivers',precipBand:null,basin:null});
 const next=waterTargetUrl(source,'/insight-journal/atlas/north-america/','basins','missouri');
 assert.equal(next.searchParams.get('crop'),'wheat');assert.equal(next.searchParams.get('city'),'denver');assert.equal(readWaterState(next).basin,'missouri');
 const both=writeWaterState(next,{waterView:'precipitation',basin:'missouri',precipBand:'1000-1500'});assert.deepEqual(readWaterState(both),{waterView:'precipitation',basin:'missouri',precipBand:'1000-1500'});
});
test('fallback picking excludes polygon holes and outside areas',()=>{
 const g={type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]]};
 assert.equal(waterContains(g,[1,1]),true);assert.equal(waterContains(g,[5,5]),false);assert.equal(waterContains(g,[11,5]),false);
});

import {readFileSync} from 'node:fs';import {gunzipSync,gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {usPrecipitationBands as precipitationBands,riverBasins} from '../../src/data/atlas/water-resources.ts';
const dir='public/assets/atlas/water-v1/';
const load=name=>JSON.parse(gunzipSync(readFileSync(dir+name+'.geojson.gz')));
test('water assets preserve selected labels, source probes, closed basins and US scope',()=>{
 const precip=load('precipitation'),basins=load('basins');
 const bands=precip.features.filter(f=>f.properties.kind==='band'),areas=basins.features.filter(f=>f.properties.kind==='basin');
 for(const item of precipitationBands)assert.ok(waterContains(bands.find(f=>f.properties.id===item.id).geometry,item.anchor),item.id);
 for(const item of riverBasins)assert.ok(waterContains(areas.find(f=>f.properties.id===item.id).geometry,item.anchor),item.id);
 const m=JSON.parse(readFileSync(dir+'manifest.json'));
 for(const probe of m.precipitation.probes)assert.ok(waterContains(bands.find(f=>f.properties.id===probe.band).geometry,probe.coordinate),probe.name);
 for(const p of [[-120,50],[-114,31],[-108,42]])assert.equal(areas.some(f=>waterContains(f.geometry,p)),false,'outside US or Great Divide closed basin');
 assert.ok(m.basins.units.ohio.some(x=>x.huc8.startsWith('06')),'Tennessee belongs to Ohio');
 assert.ok(!m.basins.units.sacramento.some(x=>x.huc8==='18020001'),'Goose Lake excluded');
 assert.ok(!m.basins.units.colorado.some(x=>x.huc8==='14040200'),'Great Divide excluded');
 for(const [file,record] of Object.entries(m.files))assert.equal(createHash('sha256').update(readFileSync(dir+file)).digest('hex'),record.sha256,file);
 for(const mode of ['precipitation','basins'])assert.ok(readFileSync(dir+mode+'.geojson.gz').length+readFileSync(dir+mode+'-fallback.webp').length<1_000_000,'per-view transfer budget');
});
test('青の降水帯と実収録等雨量線の値が一致し、未取得の追加線を捏造しない',()=>{
 const data=load('precipitation'),m=JSON.parse(readFileSync(dir+'manifest.json'));
 for(const band of precipitationBands){
  assert.equal(data.features.find(f=>f.properties.kind==='band'&&f.properties.id===band.id).properties.color,band.color);
  const n=parseInt(band.color.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;assert.ok(b>=g&&g>=r,band.id+' must be blue');
 }
 assert.deepEqual([...new Set(data.features.filter(f=>f.properties.kind==='isohyet').map(f=>f.properties.value))].sort((a,b)=>a-b),[250,500,750,1000,1500,2000]);
 assert.deepEqual(m.processing.displayRevision.unacquiredIsohyetsMm,[1250,1750]);
 const basins=load('basins');
 for(const id of ['missouri','ohio']){assert.equal(riverBasins.find(b=>b.id===id).parent,'mississippi');assert.ok(basins.features.some(f=>f.properties.id===id&&f.properties.kind==='basin'));}
});
