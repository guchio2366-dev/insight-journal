/** Offline rendering with existing Sharp. No network or new site dependency. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const at=process.argv.indexOf('--cache');if(at<0)throw Error('Usage: --cache <private-source-cache>');
const cache=path.resolve(process.argv[at+1]),output='public/assets/atlas/latin-nature-reading-v2/',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await fs.readFile(output+'manifest.json','utf8'));
for(const kind of ['rainfall','elevation']){
 const source=kind==='rainfall'?output+'rainfall.svg':path.join(cache,'elevation-reading.svg');
 const svg=await fs.readFile(source);if(sha(svg)!==manifest[kind].svgSha256)throw Error('Source-derived vector hash mismatch');
 const levels=[...svg.toString().matchAll(/data-contour="([0-9.]+)"/g)].map(m=>Number(m[1]));
 if(JSON.stringify(levels)!==JSON.stringify(manifest[kind].levels.slice(1,-1)))throw Error('Contour levels do not match legend');
 const bytes=await sharp(svg).resize(1800,1160).png().toBuffer();await fs.writeFile(output+kind+'.png',bytes);
 manifest.files[kind+'.png']={bytes:bytes.length,sha256:sha(bytes),width:1800,height:1160,rasterizer:'existing sharp '+sharp.versions.sharp,actualContourLevels:levels};
}
manifest.preparation.rasterizeScript='scripts/latin-america/rasterize-reading-enhancements.mjs';
manifest.preparation.rasterizeScriptSha256=sha(await fs.readFile(manifest.preparation.rasterizeScript));
await fs.writeFile(output+'manifest.json',JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile('data-source/atlas/latin-america/nature-reading/source.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Readable source-derived rainfall/elevation rendered and hashes recorded');
