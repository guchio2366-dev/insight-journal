import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const base=path.resolve('public/assets/atlas/africa-natural-presentation-v2');
const read=name=>fs.readFileSync(path.join(base,name));
const json=name=>JSON.parse(name.endsWith('.gz')?gunzipSync(read(name)):read(name));
const manifest=json('manifest.json');
const window=json('rain-native-window.json');
const monthlyBuffer=gunzipSync(read('rain-monthly-native.bin.gz'));
const monthly=new Float32Array(monthlyBuffer.buffer,monthlyBuffer.byteOffset,monthlyBuffer.length/4);
const nativeCells=window.rows*window.columns;
function annual(r,c){
 const months=Array.from({length:12},(_,m)=>monthly[m*nativeCells+r*window.columns+c]);
 return months.every(v=>Number.isFinite(v)&&v>=0&&v!==window.sourceNoData)?Math.fround(months.reduce((a,b)=>a+b,0)):-1;
}
test('all derivatives are pinned, small and in the original Africa frame',()=>{
 assert.deepEqual(manifest.bounds,[-27,-36,64,39]);assert.equal(manifest.width,910);assert.equal(manifest.height,750);
 for(const [name,file]of Object.entries(manifest.files)){
  const data=read(name);assert.equal(data.length,file.bytes,name);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,name);
 }
 assert.equal(manifest.layers.rain.inputSha256,window.originalArchiveSha256);
 assert.equal(createHash('sha256').update(read('rain-monthly-native.bin.gz')).digest('hex'),window.monthlySha256);
 assert.equal(manifest.layers.rain.period,'1991–2020年平年値');assert.equal(manifest.layers.rain.license,'CC BY 4.0');
});
test('rain numeric lookup is exact 12-month native annual sum, with realistic place orientation',()=>{
 const buffer=gunzipSync(read('rain.values.gz'));const lookup=new Float32Array(buffer.buffer,buffer.byteOffset,buffer.length/4);
 for(const [lon,lat,min,max]of [[31.2,30.0,0,100],[23.7,-3.0,800,2600],[-10.5,6.5,2000,6000],[47.5,-18.9,800,2000],[15,-22.5,0,150]]){
  const r=Math.floor((39-lat)*10),c=Math.floor((lon+27)*10);
  const x=-27+(c+.5)/10,y=39-(r+.5)/10;
  const nr=Math.floor((90-y)*4)-Math.round((89.875-window.latitude[0])*4),nc=Math.floor((x+180)*4)-Math.round((window.longitude[0]+179.875)*4);
  const value=lookup[r*910+c];assert.equal(value,annual(nr,nc));assert.ok(value>=min&&value<=max,`${lon},${lat}: ${value}`);
 }
});
test('every rainfall line vertex lies on a valid native-grid linear 250mm crossing',()=>{
 let vertices=0;
 for(const f of json('rain-lines.geojson.gz').features){
  const level=f.properties.value;assert.equal(level%250,0);
  for(const part of f.geometry.coordinates)for(const [x,y]of part){
   const c=(x-window.longitude[0])*4,r=(window.latitude[0]-y)*4;
   let expected;
   if(Math.abs(r-Math.round(r))<1e-5){
    const rr=Math.round(r),cc=Math.min(Math.floor(c+1e-8),window.columns-2),a=annual(rr,cc),b=annual(rr,cc+1);assert.ok(a>=0&&b>=0);expected=a+(c-cc)*(b-a);
   }else{
    assert.ok(Math.abs(c-Math.round(c))<1e-5);const cc=Math.round(c),rr=Math.min(Math.floor(r+1e-8),window.rows-2),a=annual(rr,cc),b=annual(rr+1,cc);assert.ok(a>=0&&b>=0);expected=a+(r-rr)*(b-a);
   }
   assert.ok(Math.abs(expected-level)<.003,`${level}: ${expected}`);vertices++;
  }
 }
 assert.ok(vertices>5000);
});
test('elevation lines and adjoining legend bands use 500m, preserving the original numeric grid',()=>{
 const layer=manifest.layers.elevation;assert.deepEqual(layer.breaks,Array.from({length:10},(_,i)=>i*500));
 assert.equal(layer.grid,'../africa-physical-v1/elevation.values.gz');
 const features=json('elevation-lines.geojson.gz').features;assert.ok(features.length>=8);
 assert.ok(features.every(f=>f.properties.elevationM%500===0));
 assert.ok(!('file' in manifest.layers.terrain));assert.ok(!('contours' in manifest.layers.terrain));
});
test('rain blue darkens with increasing rainfall and masks ocean; relief remains distinct',async()=>{
 const layer=manifest.layers.rain;const luminance=hex=>{const n=parseInt(hex.slice(1),16);return .2126*(n>>16)+.7152*(n>>8&255)+.0722*(n&255);};
 assert.ok(layer.colors.every((color,i)=>i===0||luminance(color)<luminance(layer.colors[i-1])));
 for(const name of ['rain.png','terrain.png','elevation.png']){
  const {data,info}=await sharp(read(name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,910);assert.equal(info.height,750);
  const opaque=Array.from({length:910*750},(_,i)=>data[i*4+3]).filter(v=>v>0).length;assert.ok(opaque>220000&&opaque<270000,`${name} ${opaque}`);
  assert.equal(data[(100*910+20)*4+3],0,'ocean must be transparent');
 }
 assert.notEqual(manifest.files['terrain.png'].sha256,manifest.files['elevation.png'].sha256);
});
test('named major catchments preserve exact source geometry and one connected terminal',()=>{
 const original=JSON.parse(gunzipSync(fs.readFileSync('public/assets/atlas/africa-water-v1/basins.geojson.gz')));
 const areas=json('major-basins.geojson.gz');assert.equal(areas.features.length,11);
 for(const f of areas.features){
  const p=f.properties,source=original.features.find(item=>item.properties.sourceId===p.sourceId);assert.ok(source);
  assert.deepEqual(f.geometry,source.geometry,p.id);assert.equal(p.sourceAreaKm2,source.properties.sourceAreaKm2);
  const members=source.properties.sourceMemberAttributes,ids=new Set(members.map(m=>m.HYBAS_ID));
  assert.ok(members.every(m=>m.NEXT_SINK===p.NEXT_SINK&&(m.NEXT_DOWN===0||ids.has(m.NEXT_DOWN))));
  assert.equal(members.filter(m=>m.NEXT_DOWN===0).length,1);assert.equal(p.coastal,false);
  const links=new Map(members.map(m=>[m.HYBAS_ID,m.NEXT_DOWN]));
  for(const origin of ids){let current=origin;const seen=new Set();while(current){assert.ok(!seen.has(current));seen.add(current);current=links.get(current);}assert.ok(seen.has(p.NEXT_SINK));}
 }
 assert.equal(areas.features.find(f=>f.id==='chad').properties.endorheic,true);
 assert.equal(areas.features.find(f=>f.id==='okavango').properties.endorheic,true);
});
test('every displayed main flow is associated and spatially verified, with a separate delta exception',()=>{
 const areas=json('major-basins.geojson.gz'),rivers=json('major-rivers.geojson.gz');assert.ok(rivers.features.length>20);
 for(const f of rivers.features){
  const p=f.properties,b=areas.features.find(b=>b.id===p.basinId);assert.ok(b);assert.ok(b.properties.riverFeatureIds.includes(p.id));
  if(p.deltaCoastalAggregateException){assert.equal(p.sourceName,'Damietta Branch');assert.equal(p.basinId,'nile');}
  else assert.ok(p.spatialCheck.inside/p.spatialCheck.samples>.7,p.sourceName);
 }
 assert.equal(rivers.features.filter(f=>f.properties.deltaCoastalAggregateException).length,1);
});
