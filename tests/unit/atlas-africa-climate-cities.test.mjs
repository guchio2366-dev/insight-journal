import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {africaClimateCities,africaClimateCityById,africaClimateCityCoverage,africaClimateCityReuseSource} from '../../src/data/atlas/africa-climate-cities.ts';
import {africaClimateClassAnchors} from '../../src/scripts/atlas-africa-layers.ts';

const root=new URL('../../',import.meta.url);
const original=JSON.parse(readFileSync(new URL(africaClimateCityReuseSource,root),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('public/assets/atlas/africa-physical-v1/manifest.json',root),'utf8'));

test('twelve African stations retain 12 monthly values, coordinates and individual source links',()=>{
 assert.equal(africaClimateCities.length,12);
 assert.match(africaClimateCityCoverage,/12観測所/);
 assert.match(africaClimateCityCoverage,/赤道雨林.*未収録/);
 const station=africaClimateCityById('helwan'),source=original.find(row=>row.id==='helwan');
 assert.ok(station);assert.ok(source);
 for(const key of ['id','countryCode','name','stationId','stationName','coordinates','elevationM','temperatureC','precipitationMm','normalPeriod','sourceUrl','sourceName','sourceRetrievedAt','sourceTermsUrl','sourceSha256','notes','missingMonths','reading'])assert.deepEqual(station[key],source[key],key);
 assert.equal(station.normalPeriod,'1991–2020');
 assert.equal(station.temperatureC.length,12);assert.equal(station.precipitationMm.length,12);
 assert.equal(station.temperatureC.filter(value=>value===null).length,0);
 assert.equal(station.precipitationMm.filter(value=>value===null).length,0);
 assert.deepEqual(station.precipitationMm.slice(4,8),[0,0,0,0]);
 assert.ok(Math.abs(station.precipitationMm.reduce((sum,value)=>sum+value,0)-29.7)<1e-10);
 assert.equal(new URL(station.sourceUrl).searchParams.get('n'),station.stationId);
 assert.equal(new URL(station.sourceUrl).hostname,'www.data.jma.go.jp');
 assert.equal(new URL(station.sourceTermsUrl).hostname,'www.jma.go.jp');
 for(const city of africaClimateCities){assert.equal(city.temperatureC.length,12);assert.equal(city.precipitationMm.length,12);assert.equal(city.missingMonths.temperature.length,0);assert.equal(city.missingMonths.precipitation.length,0);const url=new URL(city.sourceUrl);assert.equal(url.searchParams.get('n')??url.searchParams.get('stn'),city.stationId);}
 assert.deepEqual(africaClimateCityById('dakar')?.precipitationMm,[0,0.7,0.1,0,0.3,8.7,55.3,166.9,140.4,27.1,0.8,1]);
 assert.deepEqual(africaClimateCityById('bamako')?.temperatureC,[25,28.1,30.9,32.4,31.4,28.8,26.4,25.6,26.1,27.2,26.8,25.2]);
 assert.deepEqual(africaClimateCityById('dar-es-salaam')?.precipitationMm,[53.4,66,167.6,259.5,162.8,22,16.5,15.3,21.8,79,121.7,135.2]);
 const addis=africaClimateCityById('addis-ababa'),cape=africaClimateCityById('cape-town');assert.ok(addis);assert.ok(cape);
 assert.deepEqual([addis.stationName,addis.coordinates,addis.elevationM],['ADDIS ABABA-BOLE',[38.75,9.03],2354]);
 assert.deepEqual(addis.temperatureC,[16.4,17.4,18.4,18.6,18.8,17.4,16.1,16.1,16.5,16.5,16,15.4]);
 assert.deepEqual(addis.precipitationMm,[15.2,24.7,55.4,71.3,110.6,136,240.4,267.3,151.9,49.4,17.7,7]);
 assert.deepEqual([cape.stationName,cape.coordinates,cape.elevationM],['CAPE TOWN INTNL. AIRPORT',[18.6,-33.97],46]);
 assert.deepEqual(cape.temperatureC,[21.6,21.7,20.2,17.7,15.3,13.1,12.5,12.9,14.4,16.8,18.5,20.6]);
 assert.deepEqual(cape.precipitationMm,[9.6,10.6,13.1,41.4,63.1,89,81.2,73,44.1,29,26.4,12.1]);
 assert.deepEqual([addis.classification.code,cape.classification.code],['Cwb','Csb']);
 assert.equal(addis.classification.displayName,'温帯冬季少雨気候');
 assert.equal(cape.classification.displayName,'地中海性気候・夏が比較的涼しい型');
 assert.equal(addis.classification.name,manifest.layers.climate.classes.find(row=>row.id===12).name);
 assert.equal(cape.classification.name,manifest.layers.climate.classes.find(row=>row.id===9).name);
 assert.match(addis.classification.description,/0℃.*22℃.*10分の1/);
 assert.match(cape.classification.description,/0℃.*22℃.*40 mm.*3分の1/);
 assert.ok([addis,cape].every(city=>city.notes.some(note=>note.includes('無欠測だったことを意味しません'))));
 assert.equal(africaClimateCityById('nairobi'),undefined);
});

test('every station classification matches the retained Africa grid at its exact coordinate',()=>{
 const layer=manifest.layers.climate;
 for(const {classification,coordinates} of africaClimateCities){
 const compressed=readFileSync(new URL(classification.grid,root));
 assert.equal(createHash('sha256').update(compressed).digest('hex'),classification.gridSha256);
 if(classification.maskedMapMissing){const original=JSON.parse(readFileSync(new URL('data-source/atlas/africa/climate-normals/original-classification.json',root)));assert.equal(classification.gridSha256,original.gridSha256);assert.equal(original.sourceSha256,layer.sourceSha256);assert.equal(createHash('sha256').update(readFileSync(new URL(original.source,root))).digest('hex'),original.sourceSha256);const mapValues=gunzipSync(readFileSync(new URL('public/assets/atlas/africa-physical-v1/climate.values.gz',root)));assert.equal(mapValues[classification.row*layer.width+classification.column],0,'display-mask missing must not be filled');}else assert.equal(classification.gridSha256,manifest.files[layer.grid].sha256);
 const [lon,lat]=coordinates,[west,, ,north]=layer.bounds;
 const column=Math.floor((lon-west)*10),row=Math.floor((north-lat)*10);
 assert.equal(column,classification.column);assert.equal(row,classification.row);
 const value=gunzipSync(compressed)[row*layer.width+column];
 assert.notEqual(value,layer.noData);assert.equal(value,classification.id);
 const category=layer.classes.find(item=>item.id===value);
 for(const key of ['id','code','name','color'])assert.equal(classification[key],category[key],key);
 for(const key of ['period','sourceName','sourceUrl','license','licenseUrl','resolutionDegrees'])assert.equal(classification[key],layer[key],key);
 }
});

test('station normal and geographic explanation remain distinct',()=>{
 for(const city of africaClimateCities){assert.ok(city.geographicReason);assert.ok(city.agricultureLink);assert.match(city.notes.join(''),/格子.*別/);}
});

test('every map caption is placed inside its named published climate cell',()=>{
 const layer=manifest.layers.climate,values=gunzipSync(readFileSync(new URL('public/assets/atlas/africa-physical-v1/climate.values.gz',root)));
 for(const anchor of africaClimateClassAnchors){const [lon,lat]=anchor.coordinates,row=Math.floor((layer.bounds[3]-lat)/layer.resolutionDegrees),column=Math.floor((lon-layer.bounds[0])/layer.resolutionDegrees),category=layer.classes.find(item=>item.id===anchor.id);
  assert.equal(values[row*layer.width+column],anchor.id,anchor.label);assert.ok(category);assert.match(anchor.label,new RegExp(`^${category.code}$`));
 }
 assert.equal(africaClimateClassAnchors.find(row=>row.id===1)?.label,'Af');
 assert.equal(africaClimateClassAnchors.find(row=>row.id===12)?.label,'Cwb');
 assert.equal(africaClimateClassAnchors.find(row=>row.id===8)?.label,'Csa');
});


test('additional JMA station arrays, coordinates and IDs agree with retained monthly table evidence',()=>{
 const original=JSON.parse(readFileSync(new URL('data-source/atlas/africa/climate-normals/additional-stations.json',root)));
 assert.deepEqual(original.stations.map(row=>row.stationId),['67095','67083','67027','60369','68588','67161']);
 for(const source of original.stations){const city=africaClimateCityById(source.id);for(const key of ['stationId','stationName','coordinates','elevationM','temperatureC','precipitationMm','normalPeriod','missingMonths'])assert.deepEqual(city[key],source[key],source.id+' '+key);}
 assert.deepEqual(africaClimateCities.filter(city=>city.classification.maskedMapMissing).map(city=>city.id),['toamasina','mahajanga']);
 assert.equal(africaClimateCityById('toamasina').classification.code,'Af');assert.equal(africaClimateCityById('mahajanga').classification.code,'Aw');
 assert.equal(africaClimateCityById('toliara').classification.code,'BSh');assert.equal(africaClimateCityById('algiers').classification.code,'Csa');assert.equal(africaClimateCityById('durban').classification.code,'Cfa');
});
