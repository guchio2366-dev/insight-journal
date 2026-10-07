/** Offline rendering of the exact ContourPy vector intermediate, no geographic resampling.
 * node scripts/latin-america/rasterize-water-terrain.mjs --cache <private-source-cache>
 * Uses installed Playwright and the selected local Chromium, never downloads a browser.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),args=process.argv.slice(2),at=args.indexOf('--cache');
if(at<0)throw Error('Usage: --cache <private-source-cache>');
const cache=path.resolve(args[at+1]),output=path.join(root,'public/assets/atlas/latin-water-terrain-v1'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(path.join(cache,'contour-manifest.json'),'utf8'));
const browser=await chromium.launch({executablePath:process.env.LATIN_PREP_CHROME_PATH??'/usr/bin/chromium',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1800,height:1160},reducedMotion:'reduce'});
 const vectors={},checks={};
 for(const kind of ['rainfall','elevation','terrain']){
  const vector=await fs.readFile(path.join(cache,kind+'.svg'));if(sha(vector)!==manifest.files[kind+'.svg'].sha256)throw Error('Vector intermediate hash mismatch');
  const svgText=vector.toString('utf8'),levels=[...svgText.matchAll(/data-contour="([0-9.]+)"/g)].map(m=>Number(m[1])),data=kind==='rainfall'?manifest.rainfall:manifest.elevation;
  if(JSON.stringify(levels)!==JSON.stringify(data.levels.slice(1,-1)))throw Error('Actual contour levels differ from published legend');
  const colors=kind==='terrain'?manifest.elevation.terrainColors:data.colors;
  if(colors.some(c=>!svgText.includes('fill="'+c+'"')))throw Error('Missing filled interval in actual vector intermediate');
  const result=await page.evaluate(async svg=>{
   const blob=new Blob([svg.replace('<svg ','<svg width="1800" height="1160" ')],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),image=new Image();
   try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url;});const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1160;const context=canvas.getContext('2d');context.drawImage(image,0,0,1800,1160);return {base64:canvas.toDataURL('image/png').split(',')[1],naturalSize:[image.naturalWidth,image.naturalHeight]};}finally{URL.revokeObjectURL(url);}
  },vector.toString('utf8'));
  const png=Buffer.from(result.base64,'base64');await fs.writeFile(path.join(output,kind+'.png'),png);
  vectors[kind+'.svg']=manifest.files[kind+'.svg'];delete manifest.files[kind+'.svg'];manifest.files[kind+'.png']={sha256:sha(png),bytes:png.length,width:1800,height:1160};
  checks[kind]={inputSvgSha256:sha(vector),inputViewBox:[0,0,900,580],outputSize:[1800,1160],nativeDecodedImageSize:result.naturalSize,actualContourLevels:levels,actualFilledColors:colors,outputPngSha256:sha(png),browser:browser.version()};
 }
 manifest.vectorIntermediates={cachePolicy:'Original source-derived SVG remains in the private preparation cache; normal site builds use the checked-in PNG rendered from those exact contours and fills.',files:vectors};
 manifest.processing.displayRasterization='Exact generated ContourPy SVG contours and interval fills rasterized by Chromium to 1800×1160 transparent PNG; shared 900×580 projected frame. This increases display sampling only, not source geographic resolution.';
 manifest.reproduction.rasterizeScript='scripts/latin-america/rasterize-water-terrain.mjs';manifest.reproduction.dependencies+='; existing Playwright and local Chromium for offline image rendering.';
 manifest.preparationScripts['scripts/latin-america/rasterize-water-terrain.mjs']=sha(await fs.readFile(fileURLToPath(import.meta.url)));
 const verification=Buffer.from(JSON.stringify(checks,null,2)+'\n');await fs.writeFile(path.join(root,'data-source/atlas/latin-america/water-terrain/rasterization.json'),verification);await fs.writeFile(path.join(output,'rasterization.json'),verification);manifest.files['rasterization.json']={sha256:sha(verification),bytes:verification.length};
 await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(checks,null,2));
}finally{await browser.close();}
