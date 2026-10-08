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

test('four African stations retain 12 monthly values, coordinates and individual source links',()=>{
 assert.equal(africaClimateCities.length,4);
 assert.match(africaClimateCityCoverage,/4観測所/);
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
 for(const city of africaClimateCities){assert.equal(city.temperatureC.length,12);assert.equal(city.precipitationMm.length,12);assert.equal(city.missingMonths.temperature.length,0);assert.equal(city.missingMonths.precipitation.length,0);assert.equal(new URL(city.sourceUrl).searchParams.get('n'),city.stationId);}
 assert.deepEqual(africaClimateCityById('dakar')?.precipitationMm,[0,0.7,0.1,0,0.3,8.7,55.3,166.9,140.4,27.1,0.8,1]);
 assert.deepEqual(africaClimateCityById('bamako')?.temperatureC,[25,28.1,30.9,32.4,31.4,28.8,26.4,25.6,26.1,27.2,26.8,25.2]);
 assert.deepEqual(africaClimateCityById('dar-es-salaam')?.precipitationMm,[53.4,66,167.6,259.5,162.8,22,16.5,15.3,21.8,79,121.7,135.2]);
 assert.equal(africaClimateCityById('nairobi'),undefined);
});

test('every station classification matches the retained Africa grid at its exact coordinate',()=>{
 const layer=manifest.layers.climate;
 for(const {classification,coordinates} of africaClimateCities){
 const compressed=readFileSync(new URL(classification.grid,root));
 assert.equal(createHash('sha256').update(compressed).digest('hex'),classification.gridSha256);
 assert.equal(classification.gridSha256,manifest.files[layer.grid].sha256);
 const [lon,lat]=coordinates,[west,, ,north]=layer.bounds;
 const column=Math.floor((lon-west)/layer.resolutionDegrees),row=Math.floor((north-lat)/layer.resolutionDegrees);
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
  assert.equal(values[row*layer.width+column],anchor.id,anchor.label);assert.ok(category);assert.match(anchor.label,new RegExp(`^${category.code} `));
 }
});
