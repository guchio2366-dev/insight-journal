import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {decodeAsiaNumericGrid,readAsiaNumericCell} from '../../src/lib/atlas-asia-numeric-grid.ts';
import {asiaPhysicalFocus} from '../../src/data/atlas/asia-physical-reading.ts';

const base=new URL('../../public/assets/atlas/asia-physical-v1/',import.meta.url);
const read=name=>readFileSync(new URL(name,base));
const manifest=JSON.parse(read('manifest.json'));
const grids=Object.fromEntries(await Promise.all(Object.entries(manifest.regions).map(async([id,r])=>[id,await decodeAsiaNumericGrid(read(r.grid),r,'int16',-32768)])));

test('地形の配信ファイルは原本と境界の加工記録を持ち、30か国の範囲と照会寸法が一致する',()=>{
 assert.match(manifest.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(manifest.sourceResolutionDegrees,1/60);
 assert.equal(manifest.lookup.noData,-32768);assert.equal(manifest.contourIntervalM,500);
 for(const [name,file] of Object.entries(manifest.files)){const raw=read(name);assert.equal(raw.length,file.bytes,name);assert.equal(createHash('sha256').update(raw).digest('hex'),file.sha256,name);}
 const codes=[];
 for(const [id,r] of Object.entries(manifest.regions)){
  const raw=read(r.image);assert.equal(raw.readUInt32BE(16),r.width);assert.equal(raw.readUInt32BE(20),r.height);
  const grid=grids[id];assert.equal(grid.values.length,r.width*r.height);
  const valid=grid.values.reduce((n,value)=>n+(value!==-32768?1:0),0);
  assert.equal(valid,r.validPixels);assert.equal(valid+r.countryMaskOverlapCount,Object.values(r.countryCoverage).reduce((n,c)=>n+c.validPixels,0));
  codes.push(...Object.keys(r.countryCoverage));
  const water=JSON.parse(read(r.water));assert.equal(water.features.length,r.waterFeatures.length);
  const ids=new Set();for(const f of water.features){assert.ok(!ids.has(f.id));ids.add(f.id);assert.ok(f.properties.countries.length>0);assert.ok(f.properties.countries.every(code=>code in r.countryCoverage));assert.ok(['LineString','MultiLineString','Polygon','MultiPolygon'].includes(f.geometry.type));}
 }
 assert.equal(codes.length,30);assert.equal(new Set(codes).size,30);assert.ok(!codes.includes('RUS')&&!codes.includes('IRN'));
 assert.ok(Object.values(manifest.files).reduce((n,f)=>n+f.bytes,0)<15_000_000,'lazy terrain assets stay within 15 MB for all regions combined');
});

test('着目点はその地域に存在し、高原・低地・海を独立した地理的な期待値で見分ける',()=>{
 for(const f of asiaPhysicalFocus){assert.ok(f.country in manifest.regions[f.region].countryCoverage);assert.notEqual(readAsiaNumericCell(grids[f.region],...f.coordinates),null,f.name);}
 const high=readAsiaNumericCell(grids['east-asia'],89,33);assert.ok(high>4000&&high<6000);
 const basin=readAsiaNumericCell(grids['east-asia'],104.1,30.5);assert.ok(basin>200&&basin<1000);
 const low=readAsiaNumericCell(grids['southeast-asia'],105.9,10.3);assert.ok(low>=-10&&low<100);
 assert.equal(readAsiaNumericCell(grids['east-asia'],140,20),null);
 assert.equal(readAsiaNumericCell(grids['south-central-asia'],46,0),null);
});

test('数値格子は0と負の値を保持し、欠測・範囲外・破損を区別する',async()=>{
 const meta={width:2,height:2,bounds3857:[-100,-100,100,100]},raw=Buffer.alloc(8);
 [-75,0,250,-32768].forEach((n,i)=>raw.writeInt16LE(n,i*2));
 for(const input of [raw,gzipSync(raw)]){
  const grid=await decodeAsiaNumericGrid(input,meta,'int16',-32768);
  assert.equal(readAsiaNumericCell(grid,-.0004,.0004),-75);assert.equal(readAsiaNumericCell(grid,.0004,.0004),0);
  assert.equal(readAsiaNumericCell(grid,.0004,-.0004),null);assert.equal(readAsiaNumericCell(grid,180,30),null);assert.equal(readAsiaNumericCell(grid,NaN,30),null);
 }
 const floats=Buffer.alloc(16);[0,-1,1.25,NaN].forEach((n,i)=>floats.writeFloatLE(n,i*4));
 const f=await decodeAsiaNumericGrid(floats,meta,'float32',-1);assert.equal(readAsiaNumericCell(f,-.0004,.0004),0);assert.equal(readAsiaNumericCell(f,-.0004,-.0004),1.25);assert.equal(readAsiaNumericCell(f,.0004,-.0004),null);
 await assert.rejects(decodeAsiaNumericGrid(raw.subarray(0,6),meta,'int16',-32768));
 await assert.rejects(decodeAsiaNumericGrid(raw,{...meta,width:5000},'int16',-32768));
 await assert.rejects(decodeAsiaNumericGrid(raw,{...meta,bounds3857:[100,100,-100,-100]},'int16',-32768));
});
