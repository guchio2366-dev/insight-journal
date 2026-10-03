import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
import {sumCompleteMonthlyNormals,sourceCellIndex,precipitationColor} from '../../scripts/prepare-west-asia-precipitation.mjs';
import {westPrecipitationLayer,decodeWestPrecipitationGrid} from '../../src/lib/atlas-west-asia-precipitation.mjs';
import {gridIndex,readWestState,westSearch} from '../../src/lib/atlas-west-asia-state.mjs';
import {westTopics,westReading} from '../../src/data/atlas/west-asia-topics.mjs';

const root=new URL('../../',import.meta.url),base='public/assets/atlas/west-asia-precipitation-v1/';
const bytes=name=>readFileSync(new URL(name,root)),json=name=>JSON.parse(bytes(name).toString('utf8'));
const manifest=json(base+'manifest.json'),data=json('public/assets/atlas/west-asia-v1/data.json');
const layer=westPrecipitationLayer(manifest,data),raw=gunzipSync(bytes(base+'values.bin.gz'));
const grid=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4);
const sha=value=>createHash('sha256').update(value).digest('hex');
const arrayBuffer=value=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);

test('年降水量は12か月の完全な平年値だけ合計し、0と欠測を区別する',()=>{
 assert.equal(sumCompleteMonthlyNormals(Array(12).fill(0)),0);
 assert.equal(sumCompleteMonthlyNormals(Array(12).fill(100)),1200);
 assert.equal(sumCompleteMonthlyNormals(Array(11).fill(100)),null);
 for(const missing of [-99999.9921875,-1,NaN,Infinity])assert.equal(sumCompleteMonthlyNormals([missing,...Array(11).fill(100)]),null);
 assert.equal(precipitationColor(-1),null);assert.ok(precipitationColor(0));
 assert.notEqual(precipitationColor(99.999),precipitationColor(100));
});

test('GPCCの原典・権利根拠・出力と入力の実ハッシュを固定する',()=>{
 assert.equal(manifest.inputSha256,'3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5');
 assert.equal(manifest.inputMd5,'d701c717e08ce6ad457c9f4004984d65');
 assert.equal(manifest.period,'1991-01-01/2020-12-31');assert.equal(manifest.edition,'2025');
 assert.equal(manifest.originalResolution,'0.25° regular latitude/longitude grid');
 assert.equal(manifest.license,'CC BY 4.0');assert.deepEqual(manifest.licenseEvidence.dataCiteRightsList,[]);
 assert.equal(manifest.licenseEvidence.directLegalNoticeStatus,403);
 assert.equal(manifest.processing.rawSourceIncludedInRepository,false);assert.equal(manifest.processing.sourceMutation,false);
 assert.equal(manifest.lookup.uncompressedBytes,raw.length);assert.equal(manifest.lookup.uncompressedSha256,sha(raw));
 for(const [name,record]of Object.entries(manifest.files)){const b=bytes(base+name);assert.equal(b.length,record.bytes,name);assert.equal(sha(b),record.sha256,name);}
 for(const input of manifest.inputs)assert.equal(sha(bytes(input.path)),input.sha256,input.path);
 assert.equal(data.layers.some(item=>item.id==='annual-precipitation'),false,'既存の公開snapshotには新assetを埋め込まない');
 assert.equal(layer.width,data.width);assert.equal(layer.height,data.height);assert.deepEqual(layer.bounds,data.bounds);
});

test('独立manifestの契約・gzipまたは展開済みデータの実ハッシュと破損を検証する',async()=>{
 const zipped=bytes(base+'values.bin.gz');
 assert.deepEqual(await decodeWestPrecipitationGrid(arrayBuffer(zipped),layer),grid);
 assert.deepEqual(await decodeWestPrecipitationGrid(arrayBuffer(raw),layer),grid);
 const damaged=Buffer.from(raw);damaged[100]^=1;await assert.rejects(decodeWestPrecipitationGrid(arrayBuffer(damaged),layer),/ハッシュ/);
 await assert.rejects(decodeWestPrecipitationGrid(new ArrayBuffer(3),layer),/サイズ/);
 for(const update of [{period:'1981-01-01/2010-12-31'},{edition:'2024'},{inputSha256:'0'.repeat(64)},{width:999},{bounds:[23,10,65,45]},{colors:['#000000']}])assert.throws(()=>westPrecipitationLayer({...manifest,...update},data),/契約/);
 assert.throws(()=>westPrecipitationLayer({...manifest,inputMd5:'invalid-checksum'},data),/契約/);
 assert.equal(westPrecipitationLayer({...manifest,inputMd5:'0'.repeat(32)},data).id,layer.id,'ブラウザーの原典同定は固定SHA-256で行い、MD5の固定値は生成処理と独立検算で照合する');
 assert.throws(()=>westPrecipitationLayer({...manifest,lookup:{...manifest.lookup,nodata:0}},data),/契約/);
});

test('実原典の月別例で緯度の向きと年合計を照合し、地点照会に残す',()=>{
 const validation=json('data-source/atlas/west-asia/precipitation/validation.json');
 assert.equal(validation.sourceRecords,12);assert.deepEqual(validation.sourceDimensions,[1440,720]);
 assert.equal(validation.sourceCoordinates.firstLatitude,89.875);assert.equal(validation.sourceCoordinates.lastLatitude,-89.875);
 assert.equal(validation.sourceCoordinates.declaredLatitudeUnit,'degrees_south');
 for(const sample of validation.orientationSamples){assert.equal(sample.annualNormal,sample.monthlyNormals.reduce((sum,value)=>sum+value,0),sample.name);assert.notEqual(sample.annualNormal,sample.flippedLatitudeAnnual,sample.name);assert.deepEqual(sourceCellIndex(...sample.sourceCellCenter).center,sample.sourceCellCenter);}
 for(const name of ['Tehran','Riyadh']){const sample=validation.orientationSamples.find(row=>row.name===name),index=gridIndex(...sample.sourceCellCenter,layer);assert.ok(index>=0);assert.equal(grid[index],Math.fround(sample.annualNormal),name);}
 assert.equal(gridIndex(64,30,layer),-1);assert.equal(gridIndex(23,10,layer),-1);
 assert.equal(grid[gridIndex(57,29,layer)]>=0,true,'内陸の格子値を読む');
 assert.equal(grid[gridIndex(55,15,layer)],-1,'海を0にしない');
});

test('全987000画素の色と透明度がfloat32地点照会・欠測マスクに一致する',()=>{
 const png=bytes(base+'precipitation.png'),idat=[];
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 for(let at=8;at<png.length;){const length=png.readUInt32BE(at),type=png.subarray(at+4,at+8).toString('ascii'),chunk=png.subarray(at+8,at+8+length);if(type==='IHDR'){assert.equal(chunk.readUInt32BE(0),1000);assert.equal(chunk.readUInt32BE(4),987);assert.equal(chunk[9],6);}if(type==='IDAT')idat.push(chunk);at+=length+12;}
 const scanlines=inflateSync(Buffer.concat(idat)),palette=manifest.colors.map(color=>Buffer.from(color.slice(1),'hex'));
 assert.equal(scanlines.length,987*(1000*4+1));let mismatches=0,valid=0;
 for(let row=0;row<987;row++)assert.equal(scanlines[row*(1000*4+1)],0);
 for(let i=0;i<grid.length;i++){const row=Math.floor(i/1000),column=i%1000,at=row*(1000*4+1)+1+column*4,value=grid[i];if(value===-1){if(scanlines[at+3]!==0)mismatches++;}else{valid++;const expected=palette[manifest.breaks.filter(threshold=>value>=threshold).length];if(scanlines[at+3]!==255||expected.some((value,index)=>scanlines[at+index]!==value))mismatches++;}}
 assert.equal(mismatches,0);assert.equal(valid,manifest.validation.validDisplayPixels);
 assert.equal(manifest.countryCoverage.length,20);assert.equal(new Set(manifest.countryCoverage.map(row=>row.code)).size,20);
 for(const row of manifest.countryCoverage)assert.equal(row.displayPixelCenters,row.validDisplayPixelCenters+row.missingDisplayPixelCenters);
 assert.equal(manifest.countryCoverage.reduce((sum,row)=>sum+row.validDisplayPixelCenters,0),valid);
});

test('新主題のURL・灌漑と天水の比較は定義と時点を保ち、観測所18点を残す',()=>{
 const annual=westTopics.find(topic=>topic.id==='annual-precipitation');assert.equal(annual.layer,'annual-precipitation');
 assert.match(annual.description,/0.25°/);assert.match(annual.description,/12か月/);assert.match(annual.description,/現在の利用可能/);
 assert.equal(data.cities.length,18);assert.equal(westTopics.find(topic=>topic.id==='precipitation').layer,undefined);
 const state=readWestState('?topic=annual-precipitation&country=IRN&city=tehran&year=2020&map=100,120,400,300&at=51.4,35.7','natural',data);
 assert.equal(state.topic,'annual-precipitation');assert.deepEqual(readWestState(westSearch(state),'natural',data),state);
 for(const id of ['wheat-irrigated','wheat-rainfed']){const wheat=westTopics.find(topic=>topic.id===id);assert.ok(westReading(wheat).comparisons.some(row=>row.topic===annual.id));const row=westReading(annual).comparisons.find(row=>row.topic===id);assert.ok(row);assert.match(row.explanation,/取水量|栽培限界/);}
});
