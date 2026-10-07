import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
import sharp from 'sharp';
import {europeLayers} from '../../src/data/atlas/europe/layers.ts';
import {europeElevationBreaks,europeElevationColors,europeElevationLabels} from '../../src/data/atlas/europe/elevation-style.ts';

const folder=new URL('../../public/assets/atlas/europe/physical-v1/',import.meta.url);
const bytes=name=>readFileSync(new URL(name,folder));
const manifest=JSON.parse(bytes('manifest.json'));
const archive=bytes('elevation.bin.gz'),grid=gunzipSync(archive);
const sha=value=>createHash('sha256').update(value).digest('hex');

test('500 m colour bands keep the original display heights, contours and hydrography',()=>{
  assert.deepEqual(europeElevationBreaks,Array.from({length:11},(_,i)=>i*500));
  assert.equal(europeElevationColors.length,12);assert.equal(europeElevationLabels.length,12);
  const pinned={'elevation.bin.gz':'a41d65b5215f7577ad57915d9226f087b53e2d815e9287693a2789ab0d6b0ecf','contours.png':'cda82f6547af428306d5a9682cabdf42b8c340a15e2de1018c26855f81829e17','terrain.png':'5f0dc4479c3c117af60e6f7a2760f88269a4a6cc0682490a7a4f85b981d4d11d','water.png':'71c846ca4ec89b0575010f08f7fd510c5ca5b1a1a899cfd2da6c32206c5f51f7'};
  for(const [name,hash] of Object.entries(pinned))assert.equal(sha(bytes(name)),hash,name);
  assert.equal(manifest.elevationStyle.gridSha256,pinned['elevation.bin.gz']);
  assert.equal(manifest.elevationStyle.contourSha256,pinned['contours.png']);
  assert.equal(manifest.elevationStyle.intervalM,500);
  const layer=europeLayers.find(layer=>layer.id==='contours');
  assert.equal(layer.image,'/assets/atlas/europe/physical-v1/elevation.png');
  assert.deepEqual(layer.colors.slice(2),europeElevationColors);assert.deepEqual(layer.labels.slice(2),europeElevationLabels);
  assert.equal(layer.valueUnit,'m');assert.equal(layer.nodata,-32768);
  assert.equal(sha(bytes('elevation.png')),manifest.files['elevation.png'].sha256);
});

test('all displayed colours and line pixels agree with the retained height and missing mask',async()=>{
  const png=bytes('elevation.png'),chunks=[];
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  for(let offset=8;offset<png.length;){
    const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+size);
    if(type==='IHDR'){assert.equal(data.readUInt32BE(0),1800);assert.equal(data.readUInt32BE(4),1502);assert.equal(data[8],8);assert.equal(data[9],6);}
    if(type==='IDAT')chunks.push(data);offset+=size+12;
  }
  const scanlines=inflateSync(Buffer.concat(chunks));assert.equal(scanlines.length,1502*(1800*4+1));
  const {data:lines,info}=await sharp(bytes('contours.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.channels,4);assert.equal(grid.length,1800*1502*2);
  const palette=europeElevationColors.map(color=>Buffer.from(color.slice(1),'hex'));
  let valid=0,linePixels=0,alphaMismatch=0,colourMismatch=0;
  const valuesSeen=new Set();
  for(let row=0;row<1502;row++){
    assert.equal(scanlines[row*(1800*4+1)],0);
    for(let column=0;column<1800;column++){
      const index=row*1800+column,value=grid.readInt16LE(index*2),source=index*4,offset=row*(1800*4+1)+1+column*4;
      const present=value!==-32768;
      if(scanlines[offset+3]!== (present?255:0))alphaMismatch++;
      if(!present)continue;
      valid++;valuesSeen.add(value);
      const lineAlpha=lines[source+3];assert.ok(lineAlpha===0||lineAlpha===255);
      const expected=lineAlpha?lines.subarray(source,source+3):palette[value<0?0:Math.min(11,1+Math.floor(value/500))];
      if(lineAlpha)linePixels++;
      if(!scanlines.subarray(offset,offset+3).equals(expected))colourMismatch++;
    }
  }
  assert.equal(alphaMismatch,0);assert.equal(colourMismatch,0);
  assert.equal(valid,manifest.elevationStyle.validPixels);assert.equal(linePixels,manifest.elevationStyle.contourPixels);
  for(const boundary of [-1,0,499,500,999,1000,1499,1500,1999,2000,2499,2500,2999,3000])assert.ok(valuesSeen.has(boundary),`Published cells exercise ${boundary} m`);
  assert.ok(valuesSeen.has(4608),'The actual high-altitude tail is also classified; no absent height samples are fabricated');
});
