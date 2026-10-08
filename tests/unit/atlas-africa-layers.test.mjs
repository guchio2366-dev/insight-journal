import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {africaLayerPath,africaGridValue,africaGridValueLabel,africaActualLayerKey,africaRasterCategory,africaGridClassOutline} from '../../src/scripts/atlas-africa-layers.ts';
import {projectAfrica} from '../../src/lib/atlas-africa-geometry.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';

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
test('source point and class survive reload while retired comparison state cannot restore a statistical map',()=>{
 const source=readState('?field=population&topic=distribution&place=EGY&compare=GHA&year=2023&region=north&zoom=country&layerClass=density-6&layerPoint=31.2,30.0&context=EN.POP.DNST&sourceState=field%3Dnature&view=statistics');
 const loaded=readState(writeState({...source},new URL('https://example.com/atlas/africa/')).search);
 assert.equal(loaded.layerClass,'density-6');assert.equal(loaded.layerPoint,'31.2,30');assert.equal(africaActualLayerKey(loaded),'distribution');
 for(const key of ['place','compare','context','sourceState'])assert.equal(loaded[key],'');assert.equal(loaded.view,'distribution');assert.equal(loaded.zoom,'all');
 assert.equal(readState('?layerClass=<invalid>&layerPoint=500,500').layerClass,'');assert.equal(readState('?layerPoint=500,500').layerPoint,'');
 for(const [field,topic] of [['population','ethnicity'],['population','religion'],['nature','terrain']]){
  const guide=readState(`?field=${field}&topic=${topic}&layerClass=old&layerPoint=7,10&view=statistics`);
  assert.equal(guide.layerClass,'');assert.equal(guide.layerPoint,'');assert.equal(guide.view,'distribution');
 }
});
test('legacy production selection resolves to the retained crop area while livestock remains its own source',()=>{
 for(const [topic,crop,livestock,layer] of [['farming','rice','goats','crop-rice-harvested'],['livestock','cassava','sheep','livestock-sheep']]){
  const state=readState(`?field=agriculture&topic=${topic}&crop=${crop}&cropMeasure=production&livestock=${livestock}&place=KEN&compare=ETH&layerPoint=38,1`);
  assert.equal(africaActualLayerKey(state),layer);assert.equal(state.layerPoint,'38,1');assert.equal(state.context,'');
 }
});

test('agriculture thresholds keep zero, small positive values, boundaries and missing separate',()=>{
 const layer={noData:-1,zeroValue:0,zeroId:'zero',zeroColor:'#fafafa',breaks:[1,10],colors:['#eeeeee','#aaaaaa','#555555'],positiveLegend:[{id:'low'},{id:'medium'},{id:'high'}],legend:[{id:'zero'},{id:'low'},{id:'medium'},{id:'high'}]};
 for(const [value,id] of [[0,'zero'],[.0001,'low'],[.999,'low'],[1,'medium'],[9.999,'medium'],[10,'high']])assert.equal(africaRasterCategory(value,layer).id,id);
 for(const value of [-1,NaN,Infinity])assert.equal(africaRasterCategory(value,layer),null);
 const bytes=new Uint8Array(8),floats=new DataView(bytes.buffer);floats.setFloat32(0,0,true);floats.setFloat32(4,NaN,true);const metadata={bounds:[0,0,2,1],width:2,height:1,encoding:'float32-le-gzip',noData:-1};
 assert.equal(africaGridValue(bytes,metadata,.5,.5),0);assert.equal(africaGridValue(bytes,metadata,1.5,.5),null);
});

test('point labels keep actual tiny crop and cattle values positive while using readable rounded precision',()=>{
 assert.equal(africaGridValueLabel(0),'0');
 assert.equal(africaGridValueLabel(0.00010143596591660753),'0.0001014');
 assert.equal(africaGridValueLabel(4.657324268e-7),'0.0000004657');
 for(const value of [Number.MIN_VALUE,1.401298464324817e-45,1e-20,.00099999])assert.ok(Number(africaGridValueLabel(value).replaceAll(',',''))>0);
 assert.equal(africaGridValueLabel(1200.123456),'1,200.123');
 assert.equal(africaGridValueLabel(1.123456),'1.123');
});

test('selected class outlines follow cell edges, leave holes, and never bridge missing or other classes',()=>{
 const layer={bounds:[0,0,3,3],width:3,height:3,encoding:'uint8',noData:0,classes:[{id:1,color:'#aaa'},{id:2,color:'#bbb'}]};
 const ring=africaGridClassOutline(new Uint8Array([1,1,1,1,0,1,1,1,1]),layer,'1');
 assert.equal((ring.match(/M/g)??[]).length,8,'four outer edges and four edges around the noData hole');
 const point=(column,row)=>projectAfrica([column,3-row]).map(value=>value.toFixed(2));
 const [left,top]=point(0,0),[right]=point(3,0),[innerLeft,innerTop]=point(1,1),[innerRight]=point(2,1);
 assert.ok(ring.includes(`M${left},${top}H${right}`));assert.ok(ring.includes(`M${innerLeft},${innerTop}H${innerRight}`));
 const separated=africaGridClassOutline(new Uint8Array([1,2,1,0,0,0,0,0,0]),layer,'1');
 assert.ok(!separated.includes(`M${left},${top}H${right}`),'unselected middle cell is not bridged');
 assert.equal((separated.match(/M/g)??[]).length,8);
 assert.equal(africaGridClassOutline(new Uint8Array(9),layer,'1'),'');
 assert.equal(africaGridClassOutline(new Uint8Array([1]),layer,'unknown'),'');
});

test('outline categories use actual signed elevation and zero population while excluding missing and nonfinite cells',()=>{
 const common={bounds:[0,0,3,1],width:3,height:1,breaks:[0,10],colors:['#aaa','#bbb','#ccc']};
 const elevation=new Uint8Array(6),signed=new DataView(elevation.buffer);[-5,0,-32768].forEach((value,index)=>signed.setInt16(index*2,value,true));
 assert.notEqual(africaGridClassOutline(elevation,{...common,encoding:'int16',noData:-32768},'0'),'');
 assert.notEqual(africaGridClassOutline(elevation,{...common,encoding:'int16',noData:-32768},'1'),'');
 assert.equal(africaGridClassOutline(elevation,{...common,encoding:'int16',noData:-32768},'2'),'');
 const population=new Uint8Array(12),floats=new DataView(population.buffer);[0,NaN,-1].forEach((value,index)=>floats.setFloat32(index*4,value,true));
 const outline=africaGridClassOutline(population,{...common,encoding:'float32',noData:-1,breaks:[1,10],legend:[{id:'density-0'},{id:'density-1'},{id:'density-2'}]},'density-0');
 assert.equal((outline.match(/M/g)??[]).length,4,'only the available zero-valued cell is enclosed');
});
