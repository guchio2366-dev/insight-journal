/** Re-render the retained, source-verified contour SVG after a palette change. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {encodePng,width,height} from './prepare-precipitation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const folder=path.join(root,'public/assets/atlas/europe/precipitation-contours-v1');
const source=path.join(root,'public/assets/atlas/europe/precipitation-v1/precipitation.png');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const svg=await fs.readFile(path.join(folder,'precipitation.svg'));
const {data:rgba,info}=await sharp(svg,{limitInputPixels:width*height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==width||info.height!==height||info.channels!==4)throw Error('Contour frame changed');
const sourceRgba=await sharp(source).ensureAlpha().raw().toBuffer();
let paintedPixels=0,partialPixels=0;
for(let i=0;i<width*height;i++){
  if(!sourceRgba[i*4+3]&&rgba[i*4+3])throw Error('Contour display entered a source-missing pixel');
  if(rgba[i*4+3])paintedPixels++;
  if(rgba[i*4+3]>0&&rgba[i*4+3]<255)partialPixels++;
}
const image=encodePng(rgba);
await fs.writeFile(path.join(folder,'precipitation.png'),image);
const manifest=JSON.parse(await fs.readFile(path.join(folder,'manifest.json'),'utf8'));
const sourceManifest=JSON.parse(await fs.readFile(path.join(root,'public/assets/atlas/europe/precipitation-v1/manifest.json'),'utf8'));
manifest.files['precipitation.png']={sha256:sha(image),bytes:image.length};
manifest.rendering={engine:'Retained sharp SVG renderer',version:sharp.versions.sharp,paintedPixels,partialPixels,
  oldValidPixels:sourceManifest.validation.validDisplayPixels,sourceMissingPixelsFilled:0,
  note:'Contours and adjacent bands retain the verified geometry. The palette changed; the source values and no-data mask did not.'};
await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({paintedPixels,partialPixels,imageBytes:image.length}));
