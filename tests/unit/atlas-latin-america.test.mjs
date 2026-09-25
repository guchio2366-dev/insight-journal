import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {latinEconomyTopics} from '../../src/data/atlas/latin-america-economy.ts';
import {latinSocietyTopics} from '../../src/data/atlas/latin-america-society.ts';
import {latinClimateCities,climateClasses} from '../../src/data/atlas/latin-america-climate.ts';
import {readLatinState,writeLatinState,cropValueAt,cropIds,latinFields} from '../../src/lib/atlas-latin-america-state.ts';

const json=async path=>JSON.parse(await readFile(new URL('../../'+path,import.meta.url),'utf8'));
const geography=await json('src/data/atlas/regional-countries.json');
const countries=geography.features.filter(({properties:p})=>(p.region==='South America'||['Central America','Caribbean'].includes(p.subregion))&&p.code!=='MEX').map(f=>f.properties.code);
const topics=[...latinSocietyTopics,...latinEconomyTopics],ids=new Set(topics.map(t=>t.id));
const read=search=>readLatinState(search,topics,countries,latinClimateCities);

test('Latin readings and comparisons resolve against the actual country filter and topic catalog',()=>{
 assert.equal(ids.size,topics.length,'topic IDs must be unique');
 for(const field of latinFields)assert.ok(topics.some(t=>t.field===field),field);
 for(const topic of topics){
  assert.ok(topic.countries.length,topic.id);
  for(const country of topic.countries)assert.ok(countries.includes(country),`${topic.id}: country ${country} is absent from the selector`);
  for(const related of topic.relatedIds){assert.ok(ids.has(related),`${topic.id} links to missing ${related}`);assert.notEqual(related,topic.id);}
  assert.ok(topic.placeLabel?.length,'marker must identify its example location');
  const [lon,lat]=topic.location,[w,s,e,n]=topic.extent;
  assert.ok(w<e&&s<n&&lon>=w&&lon<=e&&lat>=s&&lat<=n,`${topic.id} location must fit its reading viewport`);
 }
 for(const code of ['BRA','ARG','CHL','GTM','JAM'])assert.ok(topics.some(t=>t.countries.includes(code)),code);
 for(const code of ['MEX','USA','CAN'])assert.equal(countries.includes(code),false);
});

test('quantitative topic claims retain units, period, geographic denominator and a cited source',()=>{
 for(const topic of topics){
  assert.ok(topic.sources.length,topic.id);
  for(const source of topic.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.label,topic.id);}
  for(const statistic of topic.stats??[]){
   assert.ok(Number.isFinite(statistic.value),topic.id);
   assert.ok(statistic.unit&&statistic.year&&statistic.scope,topic.id);
   assert.ok(topic.sources.some(s=>s.url===statistic.sourceUrl),`${topic.id}: statistic source is missing from the reading`);
  }
 }
});

test('climate charts have twelve observed months and traceable, in-region stations',()=>{
 assert.equal(new Set(latinClimateCities.map(c=>c.id)).size,latinClimateCities.length);
 assert.equal(new Set(climateClasses.map(c=>c.id)).size,climateClasses.length);
 for(const city of latinClimateCities){
  assert.ok(countries.includes(city.countryCode),city.id);
  assert.equal(city.temperatureC.length,12,city.id);assert.equal(city.precipitationMm.length,12,city.id);
  assert.ok(city.temperatureC.every(v=>v===null||Number.isFinite(v)),city.id);
  assert.ok(city.precipitationMm.every(v=>v===null||Number.isFinite(v)&&v>=0),city.id);
  assert.ok(city.stationName&&city.stationId&&city.period,city.id);assert.equal(new URL(city.sourceUrl).protocol,'https:');
 }
});

test('invalid URLs cannot select foreign countries, missing topics or invalid field/crop values',()=>{
 const invalid=read('?field=unsupported&topic=missing&place=MEX&city=missing&crop=missing&view=missing');
 assert.deepEqual(invalid,{field:'nature',topic:'',place:'',city:'',crop:'soyb',view:'climate',camera:undefined});
 assert.equal(read('?field=industry&topic=andes&city=manaus').topic,'');
 assert.equal(read('?field=industry&city=manaus').city,'');
});

test('a shared reading round trips its topic, crop, country and exact equatorial camera',()=>{
 const initial=read('?field=agriculture&topic=cerrado-soy&place=BRA&crop=maiz&map=-60,0,4');
 assert.deepEqual(read(writeLatinState(initial)),initial);
 assert.deepEqual(initial.camera,[-60,0,4]);
 const natural=read('?field=nature&topic=amazon&view=rivers');
 assert.deepEqual(read(writeLatinState(natural)),natural);
 assert.equal(new URLSearchParams(writeLatinState(natural)).has('crop'),false);
});

test('contradictory URL selections resolve to one reading and a compatible country',()=>{
 const city=read('?field=nature&city=manaus&topic=andes&place=CHL');
 assert.equal(city.city,'manaus');assert.equal(city.topic,'');assert.equal(city.place,'');
 assert.equal(read('?field=nature&city=manaus&place=BRA').place,'BRA');
 const topic=read('?field=nature&topic=amazon&place=CHL');
 assert.equal(topic.topic,'amazon');assert.equal(topic.place,'');
 assert.equal(read('?field=nature&topic=amazon&place=BRA').place,'BRA');
 const invalidCity=read('?field=nature&city=missing&topic=andes&place=BOL');
 assert.equal(invalidCity.city,'');assert.equal(invalidCity.topic,'andes');assert.equal(invalidCity.place,'BOL');
 assert.deepEqual(read(writeLatinState(city)),city);
});

test('blank, nonnumeric and out-of-range camera coordinates do not become real zero coordinates',()=>{
 for(const camera of ['-60,,3','-60, ,3','-60,NaN,3','-60,Infinity,3','-60,33,3','-101,0,3','-60,0,0','-60,0,10','-60,0']){
  assert.equal(read('?map='+encodeURIComponent(camera)).camera,undefined,camera);
 }
});

test('crop sampling distinguishes positive, valid zero, missing, and map-edge cells',()=>{
 const grid={bounds:[-64,-4,-60,0],width:4,height:4,cellSize:1,validRuns:[[0,2],[4,1]],positiveCells:[[0,12.5],[4,0.4]]};
 assert.equal(cropValueAt(grid,-63.5,-0.5),12.5);
 assert.equal(cropValueAt(grid,-62.5,-0.5),0);
 assert.equal(cropValueAt(grid,-61.5,-0.5),null);
 assert.equal(cropValueAt(grid,-63.5,-1.5),0.4,'values below the color threshold still have a value');
 assert.equal(cropValueAt(grid,-64,0),12.5);
 for(const [lon,lat] of [[-64.01,0],[-60,0],[-63,-4],[-63,0.01]])assert.equal(cropValueAt(grid,lon,lat),null);
});

test('published crop layers match selectors, mask out Mexico and preserve valid zero cells',async()=>{
 const manifest=await json('public/assets/atlas/latin-america-agriculture-v1/manifest.json');
 const livestock=await json('public/assets/atlas/latin-america-livestock-v1/manifest.json');
 assert.deepEqual([...manifest.layers.map(l=>l.id),...livestock.layers.map(l=>l.id),'none'].sort(),[...cropIds].sort());
 for(const layer of manifest.layers){
  assert.equal(layer.year,2020);assert.ok(layer.countries.every(c=>countries.includes(c.code)));
  const grid=await json('public/assets/atlas/latin-america-agriculture-v1/'+layer.query);
  assert.equal(grid.units,'ha');assert.equal(grid.year,layer.year);
  const valid=new Set(grid.validRuns.flatMap(([start,count])=>Array.from({length:count},(_,i)=>start+i)));
  for(const [index,value] of grid.positiveCells){assert.ok(valid.has(index),`${layer.id}: value without coverage`);assert.ok(Number.isFinite(value)&&value>0,layer.id);}
  const positives=new Map(grid.positiveCells),zero=[...valid].find(i=>!positives.has(i));
  assert.notEqual(zero,undefined,layer.id+' should retain valid zero coverage');
  const lon=grid.bounds[0]+(zero%grid.width+.5)*grid.cellSize,lat=grid.bounds[3]-(Math.floor(zero/grid.width)+.5)*grid.cellSize;
  assert.equal(cropValueAt(grid,lon,lat),0,layer.id);
 }
});

test('livestock densities retain animal units and a valid mask distinct from crop hectares',async()=>{
 const manifest=await json('public/assets/atlas/latin-america-livestock-v1/manifest.json');
 for(const layer of manifest.layers){
  assert.equal(layer.units,'head/km2');assert.equal(layer.year,2020);
  assert.ok(layer.countries.every(c=>countries.includes(c.code)));
  const grid=await json('public/assets/atlas/latin-america-livestock-v1/'+layer.query);
  assert.equal(grid.units,'head/km2');assert.equal(grid.year,2020);
  const [index,value]=grid.positiveCells.find(([,v])=>v>0);
  const lon=grid.bounds[0]+(index%grid.width+.5)*grid.cellSize,lat=grid.bounds[3]-(Math.floor(index/grid.width)+.5)*grid.cellSize;
  assert.equal(cropValueAt(grid,lon,lat),value,layer.id);
 }
});

test('country comparison indicators share one stated year and retain absent values',async()=>{
 const data=await json('public/assets/atlas/latin-america-context-v1/statistics.json');
 for(const indicator of data.indicators){
  assert.equal(Number(indicator.year),data.year);assert.ok(indicator.unit&&indicator.sourceUrl);
  for(const [code,value] of Object.entries(indicator.values)){assert.ok(countries.includes(code),code);assert.ok(value===null||Number.isFinite(value));}
 }
 assert.equal(data.indicators.find(i=>i.id==='NV.IND.MANF.ZS').values.VEN,null);
 assert.equal(Object.hasOwn(data.indicators[0].values,'MEX'),false);
});
