import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const raw=await readFile('public/assets/atlas/mexico-agriculture-v2/agriculture-atlas.json');
const data=JSON.parse(raw),manifest=JSON.parse(await readFile('public/assets/atlas/mexico-agriculture-v2/manifest.json','utf8'));
const bundle=await build({entryPoints:['src/lib/atlas-mexico-agriculture-atlas-state.ts'],bundle:true,write:false,format:'esm'});
const state=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const nearly=(a,b)=>assert.ok(Math.abs(a-b)<.1,`${a} != ${b}`);
test('Mexican 2025 nominal values reconcile within their own monetary denominator',()=>{
 assert.deepEqual(data.years,{map:2020,statistics:2025});
 for(const id of ['crops','livestock']){
  const group=data[id];assert.equal(group.states.length,32);
  assert.equal(new Set(group.states.map(state=>state.code)).size,32);
  nearly(group.national.totalValueMxN,group.states.reduce((sum,state)=>sum+state.totalValueMxN,0));
  nearly(group.national.totalValueMxN,Object.values(group.national.items).reduce((sum,item)=>sum+item.valueMxN,0));
  for(const [itemId,item]of Object.entries(group.national.items))nearly(item.valueMxN,group.states.reduce((sum,state)=>sum+(state.items[itemId]?.valueMxN??0),0));
  nearly(group.national.totalValueMxN,data.composition.find(group=>group.id===id).totalValueMxN);
 }
 nearly(data.crops.national.totalValueMxN,812156843406.75);nearly(data.livestock.national.totalValueMxN,848921916861);
 assert.equal(data.crops.national.items.other.production,null);assert.equal(data.livestock.national.items.other.production,null);
 assert.match(data.livestock.national.items.dairy.unit,/千.*L/);
 assert.match(data.metadata.methods.valueComposition,/1000.*Ganado en Pie|Ganado en Pie.*1000/s);
});
test('Modelled crop zones and municipality badges are distinct, sourced geographic records',()=>{
 assert.equal(data.cropZones.type,'FeatureCollection');assert.ok(data.cropZones.features.length>1000);
 assert.equal(new Set(data.cropZones.features.map(feature=>feature.properties.cropId)).size,11);
 assert.ok(data.cropZones.features.every(feature=>feature.properties.sourceCellCount>0));
 assert.equal(data.cropLabels.length,22);assert.equal(data.livestockMarkers.length,15);
 assert.deepEqual([...new Set(data.livestockMarkers.map(marker=>marker.kindId))].sort(),['beef','broiler','dairy','eggs','pork']);
 for(const marker of data.livestockMarkers){assert.ok(marker.valueMxN>0);assert.ok(marker.production>0);assert.match(marker.coordinateSourceUrl,/^https:\/\/gaia\.inegi\.org\.mx\/wscatgeo\/v2\/localidades\//);assert.ok(marker.anchor[0]<-86&&marker.anchor[0]>-119&&marker.anchor[1]>14&&marker.anchor[1]<33);}
 assert.match(data.metadata.methods.cropMap,/10%|0\.1/);
 assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.datasetSha256);
});
test('Overview intent, legacy routes, malformed cameras and complete state round trips are stable',()=>{
 const url=new URL('https://example.test/?metric=pine&state=08&reading=overview');
 assert.equal(state.readMexicoAgricultureAtlasState(url).item,null);assert.equal(state.readMexicoAgricultureAtlasState(url).state,'08');
 assert.equal(state.readMexicoAgricultureAtlasState(new URL('https://example.test/?metric=maize&state=25')).item,'corn');
 const desired={item:'coffee',state:'07',region:null,crops:true,livestock:false,onlyItem:true,zoom:2,x:500,y:320};
 assert.deepEqual(state.readMexicoAgricultureAtlasState(state.writeMexicoAgricultureAtlasState(new URL('https://example.test/'),desired)),desired);
 const invalid=state.readMexicoAgricultureAtlasState(new URL('https://example.test/?agriItem=bad&az=Infinity&ax=no&ay=-999&state=55'));
 assert.equal(invalid.item,null);assert.equal(invalid.state,null);assert.equal(invalid.zoom,1);assert.equal(invalid.x,450);assert.equal(invalid.y,290);
 assert.deepEqual(state.agricultureCameraViewBox({...desired,zoom:1}),[0,0,900,580]);
 assert.deepEqual(state.normalizeMexicoAgricultureCamera({zoom:1,x:800,y:500}),{zoom:1,x:450,y:290});
 assert.deepEqual(state.normalizeMexicoAgricultureCamera({zoom:2,x:0,y:580}),{zoom:2,x:225,y:435});
 for(const zoom of [1,2,5]){const [x,y,w,h]=state.agricultureCameraViewBox({zoom,x:-10,y:999});assert.ok(x>=0&&y>=0&&x+w<=900.0001&&y+h<=580.0001);}
});
