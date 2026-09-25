import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync,inflateSync} from 'node:zlib';
import {decodeAsiaClimateGrid} from '../../src/lib/atlas-asia-climate-grid.ts';
import {gridCellAt,mercatorPoint} from '../../src/lib/atlas-asia-state.ts';

const base=new URL('../../public/assets/atlas/asia-climate-v2/',import.meta.url);
const read=name=>readFileSync(new URL(name,base));
const manifest=JSON.parse(read('manifest.json'));
const palette=JSON.parse(read('legend.json'));
const grids=Object.fromEntries(Object.entries(manifest.regions).map(([id,r])=>[id,{...r,values:gunzipSync(read(r.grid))}]));
const hash=raw=>createHash('sha256').update(raw).digest('hex');

// Independent PNG decoding detects palette/row/column mismatches in delivery.
function pixels(raw){
  const w=raw.readUInt32BE(16),h=raw.readUInt32BE(20),stride=w*4,chunks=[];
  assert.equal(raw[24],8);assert.equal(raw[25],6);assert.equal(raw[28],0);
  for(let at=8;at<raw.length;){const size=raw.readUInt32BE(at);if(raw.toString('ascii',at+4,at+8)==='IDAT')chunks.push(raw.subarray(at+8,at+8+size));at+=size+12;}
  const input=inflateSync(Buffer.concat(chunks)),output=Buffer.alloc(h*stride);
  assert.equal(input.length,h*(stride+1));
  for(let y=0;y<h;y++)for(let x=0;x<stride;x++){
    const at=y*stride+x,left=x>=4?output[at-4]:0,up=y?output[at-stride]:0,upper=y&&x>=4?output[at-stride-4]:0;
    const filter=input[y*(stride+1)];let predictor=0;
    if(filter===1)predictor=left;
    else if(filter===2)predictor=up;
    else if(filter===3)predictor=Math.floor((left+up)/2);
    else if(filter===4){const p=left+up-upper,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upper);predictor=a<=b&&a<=c?left:b<=c?up:upper;}
    else assert.equal(filter,0);
    output[at]=(input[y*(stride+1)+x+1]+predictor)&255;
  }
  return {w,h,output};
}

test('詳細版は固定1km原本を使い、約2.23km投影格子と圧縮配信の加工記録を保持する',()=>{
  assert.equal(manifest.source.member,'1991_2020/koppen_geiger_0p00833333.tif');
  assert.equal(manifest.source.archiveSha256,'d37b8d05b39b96e7cf6e9007b024c7d1ab301d6668409e3e792962a2408fc05d');
  assert.equal(manifest.source.sourceResolutionDegrees,1/120);
  assert.equal(manifest.source.license,'CC BY 4.0');assert.equal(manifest.period,'1991–2020');
  assert.ok(manifest.processing.targetPixelSizeMetres3857>2220&&manifest.processing.targetPixelSizeMetres3857<2230);
  assert.equal(hash(readFileSync(new URL('../../'+manifest.processing.script,import.meta.url))),manifest.processing.scriptSha256);
  assert.equal(hash(readFileSync(new URL('../../'+manifest.processing.boundaryFile,import.meta.url))),manifest.processing.boundarySha256);
  for(const [name,record] of Object.entries(manifest.files)){const raw=read(name);assert.equal(raw.length,record.bytes,name);assert.equal(hash(raw),record.sha256,name);}
  assert.ok(Object.values(manifest.files).reduce((sum,f)=>sum+f.bytes,0)<1_600_000,'all regional delivery assets remain below 1.6 MB');
});

test('詳細格子の分類数・対象国・欠測が一致し、0と小島の欠測を分類値にしない',()=>{
  for(const [region,grid] of Object.entries(grids)){
    assert.equal(grid.values.length,grid.width*grid.height);
    assert.ok(grid.width<=4096&&grid.height<=4096);
    const counts=Array(31).fill(0);for(const value of grid.values){assert.ok(value<=30);counts[value]++;}
    assert.deepEqual(Object.fromEntries(counts.map((count,id)=>[id,count]).filter(([id,count])=>id>0&&count>0)),grid.classPixelCounts,region);
    assert.equal(counts.slice(1).reduce((sum,n)=>sum+n),grid.classifiedPixels);
    for(const [country,v] of Object.entries(grid.countryCoverage)){
      assert.ok(!['RUS','IRN'].includes(country));assert.equal(v.maskPixels,v.classifiedPixels+v.sourceNoDataPixels);
    }
  }
  assert.equal(Object.values(grids).reduce((n,g)=>n+Object.keys(g.countryCoverage).length,0),30);
  assert.deepEqual(grids['south-central-asia'].countriesWithoutClassifiedPixels,['MDV']);
  assert.equal(gridCellAt(grids['south-central-asia'],73.51,4.18),null);
});

test('1km原本へ独立照会した地点と、配信格子・PNGの色が一致する',()=>{
  // Verified directly against the archived 30-arc-second TIFF at each display
  // cell centre using rasterio.sample; these expected IDs are not read from PNG.
  const probes={'east-asia':[[139.76,35.68,14],[126.98,37.57,21],[106.92,47.92,7],[140,20,0]],'southeast-asia':[[103.82,1.35,1],[100.5,13.75,3],[106.83,-6.18,1],[92,-10,0]],'south-central-asia':[[77.21,28.61,6],[76.95,43.24,25],[73.51,4.18,0],[46,0,0]]};
  for(const [region,points] of Object.entries(probes)){
    const grid=grids[region],png=pixels(read(grid.image));assert.equal(png.w,grid.width);assert.equal(png.h,grid.height);
    for(const [lng,lat,id] of points){
      assert.equal(gridCellAt(grid,lng,lat),id||null,`${region}: ${lng},${lat}`);
      const [x,y]=mercatorPoint(lng,lat),[west,south,east,north]=grid.bounds3857;
      const col=Math.floor((x-west)/(east-west)*grid.width),row=Math.floor((north-y)/(north-south)*grid.height),at=(row*grid.width+col)*4;
      const color=palette.find(c=>c.id===id)?.color;
      assert.deepEqual([...png.output.subarray(at,at+4)],color?[...Buffer.from(color.slice(1),'hex'),255]:[0,0,0,0]);
    }
  }
});

test('ブラウザー用の解凍は圧縮／透過解凍済みの両方を読み、破損・誤った分類値を拒否する',async()=>{
  const metadata={width:2,height:2,bounds3857:[-100,-100,100,100]},values=Uint8Array.of(14,21,0,1);
  for(const raw of [values,gzipSync(values)]){
    const decoded=await decodeAsiaClimateGrid(raw,metadata);assert.deepEqual([...decoded.values],[14,21,0,1]);
  }
  await assert.rejects(decodeAsiaClimateGrid(Uint8Array.of(14,21,0),metadata));
  await assert.rejects(decodeAsiaClimateGrid(Uint8Array.of(14,31,0,1),metadata));
  await assert.rejects(decodeAsiaClimateGrid(gzipSync(values).subarray(0,9),metadata));
  await assert.rejects(decodeAsiaClimateGrid(values,{...metadata,width:0}));
});
