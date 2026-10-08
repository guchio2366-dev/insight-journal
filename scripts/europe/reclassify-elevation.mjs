/** Use only the pinned, published display grid and existing contour lines. */
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {encodePng, width, height} from './prepare-precipitation.mjs';
import {europeElevationBreaks, europeElevationColors} from '../../src/data/atlas/europe/elevation-style.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const folder=path.join(root,'public/assets/atlas/europe/physical-v1');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
const archive=await fs.readFile(path.join(folder,'elevation.bin.gz'));
const contourImage=await fs.readFile(path.join(folder,'contours.png'));
for(const [name,bytes] of [['elevation.bin.gz',archive],['contours.png',contourImage]]){
  if(hash(bytes)!==manifest.files[name].sha256)throw Error(`Pinned ${name} differs from the recorded input`);
}
const grid=gunzipSync(archive);
if(grid.length!==width*height*2||manifest.width!==width||manifest.height!==height||manifest.lookupNoData!==-32768)throw Error('Elevation display contract changed');
const {data:lines,info}=await sharp(contourImage).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==width||info.height!==height||info.channels!==4)throw Error('Contour frame changed');
const palette=europeElevationColors.map(color=>Buffer.from(color.slice(1),'hex'));
const rgba=Buffer.alloc(width*height*4);
let valid=0,linePixels=0;
for(let index=0;index<width*height;index++){
  const value=grid.readInt16LE(index*2),offset=index*4;
  if(value===manifest.lookupNoData)continue;
  let band=0;while(band<europeElevationBreaks.length&&value>=europeElevationBreaks[band])band++;
  const base=palette[band],alpha=lines[offset+3];
  for(let channel=0;channel<3;channel++)rgba[offset+channel]=Math.round((lines[offset+channel]*alpha+base[channel]*(255-alpha))/255);
  rgba[offset+3]=255;valid++;if(alpha)linePixels++;
}
const image=encodePng(rgba);
manifest.elevationStyle={updatedAt:new Date().toISOString().slice(0,10),intervalM:500,breaks:europeElevationBreaks,colors:europeElevationColors,
  method:'500 m classes from the retained rounded int16 display-cell heights; existing 500 m contour raster composited only at valid display cells. No new sampling, interpolation, boundary inference or nodata filling. Colours encode height only, not snow or land cover.',
  gridSha256:hash(archive),contourSha256:hash(contourImage),validPixels:valid,contourPixels:linePixels};
manifest.files['elevation.png']={sha256:hash(image),bytes:image.length};
await fs.writeFile(path.join(folder,'elevation.png'),image);
await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({imageBytes:image.length,validPixels:valid,contourPixels:linePixels,bands:palette.length}));
