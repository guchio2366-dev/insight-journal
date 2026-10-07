/** Repaint the published GPCC display grid without touching its source values. */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {breaks,colors,encodePng,width,height,lookupNoData} from './prepare-precipitation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const folder=path.join(root,'public/assets/atlas/europe/precipitation-v1');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const gridArchive=await fs.readFile(path.join(folder,'values.bin.gz'));
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
if(hash(gridArchive)!==manifest.files['values.bin.gz'].sha256)throw Error('Published source-derived display grid differs from its pinned manifest');
const grid=zlib.gunzipSync(gridArchive);
if(grid.byteLength!==width*height*4||manifest.width!==width||manifest.height!==height||manifest.lookup.nodata!==lookupNoData)throw Error('Display grid contract changed');
const palette=colors.map(color=>Buffer.from(color.slice(1),'hex'));
const rgba=Buffer.alloc(width*height*4);
for(let index=0;index<width*height;index++){
  const value=grid.readFloatLE(index*4);
  if(!Number.isFinite(value)||value===lookupNoData)continue;
  if(value<0)throw Error(`Unexpected negative rainfall at display cell ${index}`);
  let band=0;while(band<breaks.length&&value>=breaks[band])band++;
  palette[band].copy(rgba,index*4);rgba[index*4+3]=255;
}
const image=encodePng(rgba);
manifest.breaks=breaks;
manifest.colors=colors;
manifest.styleUpdatedAt='2026-10-07';
manifest.processing.palette='250 mm/year blue classes from the retained float32 display grid; edges follow sampled source-cell values and are not surveyed isohyets.';
manifest.processing.reclassificationInputSha256=manifest.files['values.bin.gz'].sha256;
manifest.files['precipitation.png']={sha256:hash(image),bytes:image.length};
await fs.writeFile(path.join(folder,'precipitation.png'),image);
await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({imageBytes:image.length,gridSha256:manifest.processing.reclassificationInputSha256,bands:colors.length}));
