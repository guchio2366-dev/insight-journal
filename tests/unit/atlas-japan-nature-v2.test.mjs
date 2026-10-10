import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {getJapanNatureReading,japanNatureFeatureIds,japanClimateRegions,japanNatureCities,riverLabels,japanNatureRecords} from '../../src/data/atlas/japan-nature-v2.ts';
const asset=file=>readFileSync(new URL('../../public/assets/atlas/japan-nature-v2/'+file,import.meta.url));
const manifest=JSON.parse(asset('manifest.json'));
test('日本自然のすべての配信ファイルは取得・加工台帳のSHAと一致する',()=>{
 for(const [file,record] of Object.entries(manifest.files)){const bytes=asset(file);assert.equal(bytes.length,record.bytes,file);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,file);}
 assert.equal(manifest.elevation.sourceSha256,'9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e');
 assert.equal(manifest.precipitation.sourceSha256,'3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5');
});
test('地形・降水の線と段階色は500m/250mm原資料単位を保持し欠測をゼロへ変えない',()=>{
 for(const [kind,interval] of [['elevation',500],['precipitation',250]]){
  const source=manifest[kind];assert.equal(source.interval,interval);const bytes=gunzipSync(asset(source.grid));assert.equal(bytes.length,source.width*source.height*4);let valid=0;
  for(let i=0;i<bytes.length;i+=4){const value=bytes.readFloatLE(i);assert(Number.isFinite(value));if(value!==source.noData)valid++;}
  assert.equal(valid,source.validLandPixels);assert.deepEqual(source.bounds4326,[122,24,147,46]);
  for(const band of JSON.parse(asset(source.bands)).features){assert.equal(band.properties.upper-band.properties.lower,interval);assert.equal(band.properties.lower%interval,0);}
  for(const line of JSON.parse(asset(source.contours)).features)assert.equal(line.properties.value%interval,0);
 }
 assert.equal(manifest.precipitation.period,'1991–2020');assert.equal(manifest.precipitation.sourceResolutionDegrees,.25);
 assert(manifest.elevation.coastalNegativePixels>0,'coastal native negative elevations are retained');
});
test('Köppenの原0.1度を1kmに偽装せず国内六気候地域と別の資料として扱う',()=>{
 assert.equal(manifest.climate.sourceResolutionDegrees,.1);assert.equal(manifest.climate.noData,0);assert(manifest.climate.missingLandPixels>0);assert.equal(japanClimateRegions.length,6);assert.equal(japanNatureFeatureIds.climate.length,6);
 for(const id of japanNatureFeatureIds.climate){const r=getJapanNatureReading('climate',id);assert.match(r.overview,/同一の面分類ではありません/);assert(r.reason.length>25);}
 assert.equal(japanNatureCities.length,3);assert.match(getJapanNatureReading('climate','climate-region-seto-inland').overview,/月別平年値は未収録/);
 assert.equal(getJapanNatureReading('climate','unknown').title,getJapanNatureReading('climate').title);
});
test('河川は原典の3区間だけ、沿岸小流域群を単一河川の流域と扱わない',()=>{
 assert.deepEqual(riverLabels.map(r=>r.name).sort(),['利根川','最上川','石狩川'].sort());
 const coastal=japanNatureRecords.basins.find(record=>record.coastal);assert(coastal);assert.match(getJapanNatureReading('water',coastal.id).overview,/単独の大河川の流域ではありません/);
 for(const river of riverLabels){assert(japanNatureFeatureIds.water.includes(river.id));assert.equal(getJapanNatureReading('water',river.id).title,river.name);}
 const aquifer=japanNatureFeatureIds.groundwater[0];assert.match(getJapanNatureReading('groundwater',aquifer).overview,/安全な取水量を示す値ではありません/);
});
