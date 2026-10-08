import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {africaClimateCities,africaClimateCityById,africaClimateCityCoverage,africaClimateCityReuseSource} from '../../src/data/atlas/africa-climate-cities.ts';

const root=new URL('../../',import.meta.url);
const original=JSON.parse(readFileSync(new URL(africaClimateCityReuseSource,root),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('public/assets/atlas/africa-physical-v1/manifest.json',root),'utf8'));

test('the single African station preserves published monthly values, location, period and source provenance',()=>{
 assert.equal(africaClimateCities.length,1);
 assert.match(africaClimateCityCoverage,/1観測所/);
 assert.match(africaClimateCityCoverage,/他の主要都市.*未収録/);
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
 assert.equal(africaClimateCityById('nairobi'),undefined);
});

test('the Japanese classification and its provenance match the retained Africa grid at the station coordinate',()=>{
 const {classification,coordinates}=africaClimateCities[0],layer=manifest.layers.climate;
 const compressed=readFileSync(new URL(classification.grid,root));
 assert.equal(createHash('sha256').update(compressed).digest('hex'),classification.gridSha256);
 assert.equal(classification.gridSha256,manifest.files[layer.grid].sha256);
 const [lon,lat]=coordinates,[west,, ,north]=layer.bounds;
 const column=Math.floor((lon-west)/layer.resolutionDegrees),row=Math.floor((north-lat)/layer.resolutionDegrees);
 assert.equal(column,classification.column);assert.equal(row,classification.row);
 const value=gunzipSync(compressed)[row*layer.width+column];
 assert.notEqual(value,layer.noData);assert.equal(value,classification.id);
 const category=layer.classes.find(item=>item.id===value);
 for(const key of ['id','code','name','description','color'])assert.equal(classification[key],category[key],key);
 for(const key of ['period','sourceName','sourceUrl','license','licenseUrl','resolutionDegrees'])assert.equal(classification[key],layer[key],key);
 assert.equal(classification.code,'BWh');assert.equal(classification.name,'高温の砂漠気候');
});

test('station normals are not presented as sourced physical-cause explanations',()=>{
 assert.equal(africaClimateCities[0].geographicReason,null);
 assert.match(africaClimateCities[0].geographicReasonStatus,/出典付きの解説.*まだ収録していません/);
});
