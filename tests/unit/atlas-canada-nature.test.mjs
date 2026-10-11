import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readCanadaNatureState,writeCanadaNatureState} from '../../src/lib/atlas-canada-nature.ts';
const data=JSON.parse(await readFile('src/data/atlas/canada/climate.json','utf8'));
const cities=data.stations.map(s=>s.id),waters=['Mackenzie','Lake Ontario'];
test('Canadian composites retain official independent monthly/annual values and observation locations',()=>{
 assert.equal(data.period,'1991–2020');assert.equal(data.stations.length,9);
 const added={toronto:{climateId:'6158355',coordinates:[-79.4,43.67],annualTemperatureC:9.7,annualPrecipitationMm:822.7},montreal:{climateId:'7025250',coordinates:[-73.75,45.47],annualTemperatureC:7,annualPrecipitationMm:1040.9},calgary:{climateId:'3031092',coordinates:[-114.01,51.12],annualTemperatureC:4.5,annualPrecipitationMm:445.4},halifax:{climateId:'8202250',coordinates:[-63.5,44.88],annualTemperatureC:6.9,annualPrecipitationMm:1393.3}};
 for(const [id,expected] of Object.entries(added)){const station=data.stations.find(row=>row.id===id);for(const [key,value] of Object.entries(expected))assert.deepEqual(station[key],value,id+' '+key);}
 assert.deepEqual(data.stations.find(row=>row.id==='toronto').temperatureC,[-3.5,-2.7,1.7,7.8,14.5,19.8,22.5,21.9,17.9,11.2,5.2,-0.1]);
 const ottawa=data.stations.find(s=>s.id==='ottawa');
 assert.equal(ottawa.climateId,'6105976');assert.deepEqual(ottawa.coordinates,[-75.72,45.38]);
 assert.deepEqual(ottawa.temperatureC,[-9.6,-8.1,-2.2,6.2,13.8,18.8,21.3,20.1,15.6,8.8,2,-5.1]);
 assert.equal(ottawa.annualPrecipitationMm,938.1);
 assert.equal(data.stations.find(s=>s.id==='vancouver').annualPrecipitationMm,1159.5);
 assert.equal(data.stations.find(s=>s.id==='iqaluit').temperatureC[0],-26);
 assert.equal(data.stations.find(s=>s.id==='regina').climateId,'4016560');
 for(const s of data.stations){assert.equal(s.temperatureC.length,12);assert.equal(s.precipitationMm.length,12);assert.ok(s.temperatureC.every(v=>v===null||Number.isFinite(v)));assert.ok(s.precipitationMm.every(v=>v===null||v>=0));assert.match(s.sourceUrl,/^https:\/\/climate.weather.gc.ca\//);assert.match(s.sourceSha256,/^[a-f0-9]{64}$/);}
});
test('Canadian state round trips comparison, water isolation and camera without losing unrelated query',()=>{
 const initial=new URL('https://example.com/insight-journal/atlas/north-america/canada/nature/?news=one');
 const expected={city:'regina',compare:'ottawa',view:'water',water:'Mackenzie',only:true,frame:[250,200,300,200],landform:null,landformOnly:false,landformBounds:null};
 const saved=writeCanadaNatureState(initial,expected);assert.equal(saved.searchParams.get('news'),'one');
 assert.deepEqual(readCanadaNatureState(saved,cities,waters),expected);
 assert.deepEqual(readCanadaNatureState(new URL('https://example.com/?city=unknown&compare=unknown&view=unknown&water=unknown&frame=NaN,1,2,3'),cities,waters),{city:'ottawa',compare:null,view:'climate',water:null,only:false,frame:null,landform:null,landformOnly:false,landformBounds:null});
 assert.equal(readCanadaNatureState(new URL('https://example.com/?city=regina&compare=regina'),cities,waters).compare,null);
});
test('landform geographic camera accepts finite ordered bounds and restores them without changing the water camera',()=>{
 const original=new URL('https://example.com/?view=landform&landformBounds=-125,45,-100,60&frame=200,200,400,250');
 const state=readCanadaNatureState(original,cities,waters);assert.deepEqual(state.landformBounds,[-125,45,-100,60]);assert.deepEqual(readCanadaNatureState(writeCanadaNatureState(original,state),cities,waters),state);
 for(const invalid of ['NaN,45,-100,60','-125,90,-100,95','-125,60,-100,45','-100,45,-125,60','-181,45,-100,60','-125,45,-100'])assert.equal(readCanadaNatureState(new URL('https://example.com/?landformBounds='+invalid),cities,waters).landformBounds,null);
});
test('landform selection and isolation round trip independently from water and retain comparison return context',()=>{
 const original=new URL('https://example.com/?view=landform&landform=interior-plains&landformOnly=1&water=Mackenzie&only=1&cropReturn=product%3Dwheat');
 const state=readCanadaNatureState(original,cities,waters);
 assert.equal(state.landform,'interior-plains');assert.equal(state.landformOnly,true);assert.equal(state.water,'Mackenzie');assert.equal(state.only,true);
 const saved=writeCanadaNatureState(original,state);assert.equal(saved.searchParams.get('cropReturn'),'product=wheat');assert.deepEqual(readCanadaNatureState(saved,cities,waters),state);
 const invalid=readCanadaNatureState(new URL('https://example.com/?landform=imagined&landformOnly=1'),cities,waters);assert.equal(invalid.landform,null);assert.equal(invalid.landformOnly,false);
 const clear=writeCanadaNatureState(saved,{...state,landform:null,landformOnly:false});assert.equal(clear.searchParams.has('landform'),false);assert.equal(clear.searchParams.has('landformOnly'),false);assert.equal(clear.searchParams.get('water'),'Mackenzie');
});
test('Canadian water geometry retains Natural Earth except the exact separately sourced St. Lawrence replacement',async()=>{
 const manifest=JSON.parse(await readFile('public/assets/atlas/canada-nature-v1/manifest.json','utf8'));
 for(const water of manifest.waters){
  const kind=water.file.split('.')[0];const raw=await readFile(`data-source/atlas/canada/${kind}.geojson`);
  assert.equal(createHash('sha256').update(raw).digest('hex'),water.inputSha256);
  const output=await readFile(`src/data/atlas/canada/${water.file}`);
  assert.equal(createHash('sha256').update(output).digest('hex'),water.sha256);
  const originals=JSON.parse(raw).features,selected=JSON.parse(output).features;
  assert.equal(selected.length,water.count);
  for(const f of selected){
   if(kind==='rivers'&&f.properties.name==='St. Lawrence'){
    const source=JSON.parse(await readFile('data-source/atlas/canada/st-lawrence/feature.json'));
    assert.deepEqual(f.geometry,source.geometry);assert.equal(f.properties.sourceId,'nrcan-cgndb-st-lawrence');assert.equal(water.replacementSources[0].vertexCount,3135);
   }else assert.ok(originals.some(o=>o.properties.name===f.properties.name&&JSON.stringify(o.geometry)===JSON.stringify(f.geometry)));
  }
 }
 for(const [file,key] of [['physiographic-regions.jpg','thumbnailSha256'],['physiographic-regions-full.jpg','inputSha256']])assert.equal(createHash('sha256').update(await readFile(`public/assets/atlas/canada-nature-v1/${file}`)).digest('hex'),manifest.physiography[key]);
 assert.equal(manifest.physiography.edition,2009);assert.match(manifest.physiography.license,/Open Government/);
});
