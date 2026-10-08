import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash,webcrypto} from 'node:crypto';
import {validateWestNaturalManifest,decodeWestNaturalCollection,assembleWestNaturalChunks,westGroundwaterReading,westRepresentativeBasins} from '../../src/lib/atlas-west-asia-natural.mjs';
globalThis.crypto??=webcrypto;
const base='public/assets/atlas/west-asia-natural-presentation-v1/';
const manifest=JSON.parse(await readFile(base+'manifest.json','utf8'));
const packed=async(m,lines=false)=>Buffer.from(await assembleWestNaturalChunks(await Promise.all(m[lines?'lineChunks':'bandChunks'].map(c=>readFile(base+c.file,'utf8'))),m[lines?'lineChunks':'bandChunks']));
const sha=raw=>createHash('sha256').update(raw).digest('hex');

test('西アジアの250mm／500m凡例・保存格子・欠測数・配信を検証する',async()=>{
 assert.equal(validateWestNaturalManifest(manifest),manifest);
 for(const [kind,m] of Object.entries(manifest.layers)){
  const raw=await readFile(m.sourceGrid);
  // Keep a single backing buffer for precise little-endian source checks.
  const decompressed=gunzipSync(raw),view=new DataView(decompressed.buffer,decompressed.byteOffset,decompressed.byteLength);let valid=0,negative=0;
  for(let i=0;i<view.byteLength;i+=4){const n=view.getFloat32(i,true);if(n!==m.sourceNoData){valid++;if(n<0)negative++;}}
  assert.equal(sha(raw),m.sourceGridSHA256);assert.equal(valid,m.validCellCount);assert.equal(m.maskedCellCount,1000*987-valid);
  assert.equal(m.interval,kind==='rainfall'?250:500);assert.equal(kind==='elevation'&&negative>0,kind==='elevation');
  for(const lines of [false,true]){
   const compressed=await packed(m,lines);
   const collection=await decodeWestNaturalCollection(compressed,m,lines);
   assert.deepEqual(await decodeWestNaturalCollection(gunzipSync(compressed),m,lines),collection);
   assert.equal(collection.features.length,m[lines?'lineCount':'bandCount']);
  }
 }
 const wrong=structuredClone(manifest);wrong.layers.rainfall.interval=500;assert.throws(()=>validateWestNaturalManifest(wrong));
 const bytes=await packed(manifest.layers.rainfall);bytes[20]^=1;await assert.rejects(decodeWestNaturalCollection(bytes,manifest.layers.rainfall));
});

test('250mm／500m線の全頂点が対応する色帯の境界にある',async()=>{
 for(const m of Object.values(manifest.layers)){
  const bands=JSON.parse(gunzipSync(await packed(m))),lines=JSON.parse(gunzipSync(await packed(m,true)));
  const vertices=new Map(m.breaks.map(value=>[value,new Set()]));
  for(const f of bands.features)for(const ring of f.geometry.coordinates){assert.deepEqual(ring[0],ring.at(-1));for(const p of ring){vertices.get(f.properties.lower).add(p.join(','));vertices.get(f.properties.upper).add(p.join(','));}}
  for(const f of lines.features)for(const p of f.geometry.coordinates)assert(vertices.get(f.properties.value).has(p.join(',')),`${f.properties.value}: ${p}`);
 }
});

test('同一生成処理が0・ちょうど250mm・海面下・欠測の穴を区別する',async()=>{
 const bytes=await readFile(base+'validation-fixtures.json'),fixtures=JSON.parse(bytes);
 assert.equal(sha(bytes),manifest.validationFixturesSHA256);
 assert.equal(sha(await readFile(manifest.algorithm)),manifest.algorithmSHA256);
 const inside=([x,y],ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;};
 const covered=(point,features)=>features.some(f=>inside(point,f.geometry.coordinates[0])&&!f.geometry.coordinates.slice(1).some(ring=>inside(point,ring)));
 assert.deepEqual(fixtures.map(f=>f.value),[0,250,-100]);
 assert.deepEqual(fixtures.map(f=>[...new Set(f.bands.features.map(b=>b.properties.lower))]),[[0],[250],[-500]]);
 for(const f of fixtures){assert.equal(f.input.flat().filter(n=>n!==f.noData).length,24);assert.equal(f.metadata.validCellCount,24);assert.equal(f.metadata.maskedCellCount,1);assert(covered(f.validPoint,f.bands.features));assert.equal(covered(f.missingPoint,f.bands.features),false);}
});

test('代表流域は上下流の原形状を保ち、地下水の区分は涵養と貯留を区別する',async()=>{
 const basins=JSON.parse(await readFile('public/assets/atlas/west-asia-v1/basins.json','utf8'));
 assert.equal(basins.features.length,437);
 assert(basins.features.find(f=>f.properties.id===westRepresentativeBasins[0]).properties.bounds[1]<0);
 assert.match(westGroundwaterReading({HYGEO2:11}).description,/2未満.*残存量・取水量ではありません/);
 assert.equal(westGroundwaterReading({HYGEO2:24}).title,'複雑な地質構造');
});
