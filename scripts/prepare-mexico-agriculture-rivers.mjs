#!/usr/bin/env node
/** Derive the small country map's river context from its existing INEGI source.
 * No download, synthetic watercourse or geometry inference is performed.
 */
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const result=await build({entryPoints:['src/lib/atlas-mexico-geometry.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {geometryPath}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const source='public/assets/atlas/mexico-water-v1/rivers.geojson.gz',bytes=await readFile(source);
const rivers=JSON.parse(gunzipSync(bytes));
const paths=rivers.features.map(feature=>`<path d="${geometryPath(feature.geometry)}" stroke-width="${feature.properties.order===9?.8:feature.properties.order===8?.5:.3}"/>`).join('');
const output='public/assets/atlas/mexico-agriculture-v2';await mkdir(output,{recursive:true});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 580" width="900" height="580"><g fill="none" stroke="#4d94af" stroke-linecap="round" stroke-opacity=".62">${paths}</g></svg>`;
await writeFile(`${output}/rivers.svg`,svg);
await writeFile(`${output}/rivers-manifest.json`,JSON.stringify({source,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sourceMetadata:'../mexico-water-v1/rivers.source.json',output:'rivers.svg',outputSha256:createHash('sha256').update(svg).digest('hex'),projection:'Existing Mexico Lambert, 900×580; same projection as relief.webp',method:'All existing selected Strahler-order 7–9 segments are projected without smoothing or adding coordinates. This is contextual hydrology, not an inventory of every national river.',licence:'https://www.inegi.org.mx/inegi/terminos.html'},null,2)+'\n');
console.log(`Reused ${rivers.features.length} existing river-order groups`);
