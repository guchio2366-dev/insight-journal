import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
import {decodeAsiaNumericGrid,readAsiaNumericCell} from '../../src/lib/atlas-asia-numeric-grid.ts';
import {normalizeWaterState,waterContains,waterScenes,groundwaterClasses,precipitationBreaks,precipitationColors} from '../../src/data/atlas/asia-water.ts';
const base=new URL('../../public/assets/atlas/asia-water-v1/',import.meta.url),read=name=>readFileSync(new URL(name,base));
const manifest=JSON.parse(read('manifest.json'));
const data=(r,t)=>JSON.parse(gunzipSync(read(manifest.regions[r][t])));
const grids=Object.fromEntries(await Promise.all(Object.entries(manifest.regions).map(async([r,c])=>[r,await decodeAsiaNumericGrid(read(c.precipitation.grid),c.precipitation,'int16',-32768)])));

test('水の3主題は資料・期間・縮尺を区別し、30か国を重複なく収録する',()=>{
 assert.equal(manifest.precipitation.period,'1981–2010');assert.equal(manifest.precipitation.sourceScale,1);assert.equal(manifest.precipitation.license,'CC0 1.0');
 assert.equal(manifest.basins.license,'CC BY 4.0');assert.match(manifest.basins.method,/NEXT_SINK, not MAIN_BAS/);assert.equal(manifest.groundwater.scale,'1:25,000,000');
 const countries=Object.values(manifest.regions).flatMap(r=>Object.keys(r.coverage));assert.equal(countries.length,30);assert.equal(new Set(countries).size,30);assert.ok(!countries.includes('IRN')&&!countries.includes('RUS'));
 assert.equal(manifest.regions['south-central-asia'].coverage.MDV.basins,0);
 for(const [file,record] of Object.entries(manifest.files)){const bytes=read(file);assert.equal(bytes.length,record.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,file);}
 assert.ok(Object.values(manifest.files).reduce((n,f)=>n+f.bytes,0)<12_000_000);
});

test('集水域は国ごとに切った数値にせず、沿岸の小流域群へ一つの流量を割り当てない',()=>{
 for(const [region,config] of Object.entries(manifest.regions))for(const topic of ['basins','groundwater']){
  const d=data(region,topic),ids=new Set(d.records.map(r=>r.id));assert.equal(ids.size,d.records.length);assert.equal(d.geometry.features.length,ids.size);
  for(const record of d.records){
   const f=d.geometry.features.find(f=>f.properties.id===record.id);assert.ok(f);assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));assert.ok(record.countries.length);
   assert.ok(record.countries.every(c=>c in config.coverage));assert.ok(waterContains(f.geometry,record.point),record.id+' representative point');
   if(topic==='basins'){assert.ok(record.areaKm2>0);assert.ok(record.subBasins>=1);if(record.coastal)assert.equal(record.flow,null);else{assert.ok(record.flow.lowestMonth<=record.flow.mean);assert.ok(record.flow.mean<=record.flow.highestMonth);}assert.ok(d.outlines.features.some(f=>f.properties.id===record.id));}
   else assert.ok(groundwaterClasses[record.class]);
  }
 }
 const mekong=data('southeast-asia','basins').records.find(r=>!r.coastal&&r.rivers.includes('メコン川'));
 assert.ok(mekong.areaKm2>700000&&mekong.areaKm2<900000);assert.ok(mekong.countries.includes('KHM'));assert.ok(mekong.otherTargetCountries.includes('CHN'));
 const indus=data('south-central-asia','basins').records.find(r=>!r.coastal&&r.rivers.includes('インダス川'));
 // Independent source SUB_AREA sums for NEXT_SINK 4060033640 and 4060017020.
 // These connected catchments exclude adjacent endorheic/coastal drainage.
 assert.equal(indus.areaKm2,857634.5);assert.equal(mekong.areaKm2,774339.2);assert.ok(indus.countries.includes('PAK')&&indus.countries.includes('IND'));
});

test('降水量は多雨・乾燥の分布を持ち、海と欠測を0に置き換えない',()=>{
 const rain=(r,x,y)=>readAsiaNumericCell(grids[r],x,y);
 assert.ok(rain('east-asia',139.75,35.69)>1400&&rain('east-asia',139.75,35.69)<1800);
 assert.ok(rain('east-asia',83,40)<100);assert.ok(rain('southeast-asia',103.82,1.35)>2000);
 assert.ok(rain('south-central-asia',74.9,13)>2500);assert.ok(rain('south-central-asia',60.6,41.5)<250);
 assert.equal(rain('east-asia',140,20),null);assert.equal(rain('south-central-asia',46,0),null);
 for(const s of waterScenes)assert.notEqual(rain(s.region,...s.point),null,s.name);
});

// Decode the published PNG independently, including every PNG scanline filter.
function pixels(raw){
 const w=raw.readUInt32BE(16),h=raw.readUInt32BE(20),stride=w*4,chunks=[];assert.equal(raw[24],8);assert.equal(raw[25],6);
 for(let at=8;at<raw.length;){const size=raw.readUInt32BE(at);if(raw.toString('ascii',at+4,at+8)==='IDAT')chunks.push(raw.subarray(at+8,at+8+size));at+=size+12;}
 const input=inflateSync(Buffer.concat(chunks)),out=Buffer.alloc(h*stride);
 for(let y=0;y<h;y++)for(let x=0;x<stride;x++){const at=y*stride+x,a=x>=4?out[at-4]:0,b=y?out[at-stride]:0,c=y&&x>=4?out[at-stride-4]:0,f=input[y*(stride+1)];let p=0;if(f===1)p=a;else if(f===2)p=b;else if(f===3)p=Math.floor((a+b)/2);else if(f===4){const z=a+b-c,da=Math.abs(z-a),db=Math.abs(z-b),dc=Math.abs(z-c);p=da<=db&&da<=dc?a:db<=dc?b:c;}else assert.equal(f,0);out[at]=(input[y*(stride+1)+x+1]+p)&255;}
 return {w,h,out};
}
test('地図の降水色と照会値が同じ格子・区間になり、透明な欠測を保持する',()=>{
 for(const [region,config] of Object.entries(manifest.regions)){
  const png=pixels(read(config.precipitation.image)),grid=grids[region];assert.equal(png.w,grid.width);assert.equal(png.h,grid.height);
  for(let i=0;i<grid.values.length;i+=97){const n=grid.values[i],color=precipitationColors[precipitationBreaks.filter(b=>n>=b).length];assert.deepEqual([...png.out.subarray(i*4,i*4+4)],n===-32768?[0,0,0,0]:[...Buffer.from(color.slice(1),'hex'),255]);}
 }
});

test('水のURLは主題・地域・国・区域を照合し、穴を含む多角形を正しく判定する',()=>{
 const state={field:'natural',topic:'basins',place:null,city:null,camera:null,back:null};
 const d=data('east-asia','basins'),japan=d.records.find(r=>r.countries.length===1&&r.countries[0]==='JPN');
 assert.equal(normalizeWaterState('east-asia',{...state,detail:japan.id},d).place,'JPN');
 assert.equal(normalizeWaterState('east-asia',{...state,detail:japan.id,place:'CHN'},d).detail,null);
 assert.equal(normalizeWaterState('east-asia',{...state,topic:'groundwater',detail:japan.id}).detail,null);
 assert.equal(normalizeWaterState('east-asia',{...state,detail:'b-9999999999999'}).detail,null);
 assert.equal(normalizeWaterState('east-asia',{...state,detail:'b-123'},d).detail,null);
 assert.equal(normalizeWaterState('east-asia',{...state,detail:'w-mekong'}).detail,null);
 const scene=normalizeWaterState('east-asia',{...state,topic:'precipitation',detail:'w-tokyo'});assert.equal(scene.place,'JPN');assert.deepEqual(scene.point,[139.75,35.69]);
 const polygon={type:'Polygon',coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[3,1],[3,3],[1,3],[1,1]]]};assert.equal(waterContains(polygon,[2,2]),false);assert.equal(waterContains(polygon,[.5,.5]),true);
});


test('主な川の流域リンクは既存資料の出口と実際の河川を指す',async()=>{
 const {asiaWaterFocus}=await import('../../src/data/atlas/asia-water-focus.ts');
 const fs=await import('node:fs'),z=await import('node:zlib');
 const physical=JSON.parse(fs.readFileSync('public/assets/atlas/asia-physical-v1/manifest.json','utf8'));
 for(const [region,focus] of Object.entries(asiaWaterFocus)){
  const data=JSON.parse(z.gunzipSync(fs.readFileSync(`public/assets/atlas/asia-water-v1/${region}.basins.json.gz`)));
  for(const item of focus){const basin=data.records.find(r=>r.id===item.id),river=physical.regions[region].waterFeatures.find(f=>f.id===item.river);assert.ok(basin&&!basin.coastal);assert.ok(river);assert.ok(basin.rivers.includes(river.name));}
 }
});
