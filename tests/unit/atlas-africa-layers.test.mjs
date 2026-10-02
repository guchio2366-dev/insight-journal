import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {africaLayerPath,africaGridValue,africaActualLayerKey,africaRasterCategory} from '../../src/scripts/atlas-africa-layers.ts';
import {readState,writeState,africaComparisonSnapshot} from '../../src/data/atlas/africa-atlas.ts';

test('display grids preserve zero, negative elevation and missing values with north-first cell indexing',()=>{
 const metadata={bounds:[0,0,2,2],width:2,height:2,encoding:'int16-le-gzip',noData:-32768};
 const bytes=new Uint8Array(8),view=new DataView(bytes.buffer);[0,-137,1000,-32768].forEach((value,index)=>view.setInt16(index*2,value,true));
 assert.equal(africaGridValue(bytes,metadata,.5,1.5),0);assert.equal(africaGridValue(bytes,metadata,1.5,1.5),-137);assert.equal(africaGridValue(bytes,metadata,.5,.5),1000);assert.equal(africaGridValue(bytes,metadata,1.5,.5),null);assert.equal(africaGridValue(bytes,metadata,2,1),null);
 const population=new Uint8Array(16),floats=new DataView(population.buffer);[0,40000.5,-1,12.5].forEach((value,index)=>floats.setFloat32(index*4,value,true));
 assert.equal(africaGridValue(population,{...metadata,encoding:'float32-le-gzip',noData:-1},.5,1.5),0);assert.equal(africaGridValue(population,{...metadata,encoding:'float32-le-gzip',noData:-1},1.5,1.5),40000.5);assert.equal(africaGridValue(population,{...metadata,encoding:'float32-le-gzip',noData:-1},.5,.5),null);
 const populationManifest=JSON.parse(readFileSync(new URL('../../public/assets/atlas/africa-population-v1/manifest.json',import.meta.url),'utf8')),actual=populationManifest.layers.population;
 assert.equal(africaRasterCategory(populationManifest.representativeSpots[0].displayPersonsPerKm2,actual).id,'density-6');assert.equal(africaRasterCategory(0,actual).id,'density-0');assert.equal(africaRasterCategory(-1,actual),null);
});
test('separate river lines and polygon holes never acquire invented connectors',()=>{
 const path=africaLayerPath({type:'MultiLineString',coordinates:[[[0,0],[1,1]],[[10,10],[11,11]]]});assert.equal((path.match(/M/g)??[]).length,2);assert.equal((path.match(/L/g)??[]).length,2);
 const polygon=africaLayerPath({type:'Polygon',coordinates:[[[0,0],[2,0],[2,2],[0,0]],[[.5,.5],[1,.5],[1,1],[.5,.5]]]});assert.equal((polygon.match(/M/g)??[]).length,2);assert.equal((polygon.match(/Z/g)??[]).length,2);
});
test('comparison snapshot restores source topic, class, point, countries, year and viewport after reload',()=>{
 const source=readState('?field=population&topic=ethnicity&place=EGY&compare=GHA&year=2023&region=north&zoom=country&layerClass=ethnicity-65102000&layerPoint=31.2,30.0');
 const comparison={...source,context:'EN.POP.DNST',sourceState:africaComparisonSnapshot(source)};
 const loaded=readState(writeState(comparison,new URL('https://example.com/atlas/africa/')).search);
 assert.equal(loaded.context,'EN.POP.DNST');assert.deepEqual(readState('?'+loaded.sourceState),source);assert.equal(africaActualLayerKey(loaded),'ethnicity');
 assert.equal(readState('?layerClass=<invalid>&layerPoint=500,500&sourceState=sourceState=x').layerClass,'');assert.equal(readState('?layerPoint=500,500').layerPoint,'');
 const initial=readState('?field=nature&place=KEN');assert.equal(initial.topic,'climate');assert.equal(initial.zoom,'all');assert.equal(initial.region,'all');assert.equal(initial.place,'KEN');
 const legacy=readState('?field=nature&theme=nile-water');assert.equal(legacy.topic,'water');assert.equal(legacy.view,'statistics');assert.equal(legacy.zoom,'theme');assert.equal(readState('?field=nature&metric=ER.H2O.INTR.PC').water,'river');
});
