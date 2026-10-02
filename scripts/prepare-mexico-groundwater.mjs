/** Reuse the reviewed INEGI national units; raster overview avoids an all-class browser fetch. */
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import sharp from 'sharp';
import {lambertForward} from '../src/lib/atlas-mexico-projection.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const input=resolve(root,'data-source/atlas/mexico/groundwater');
const output=resolve(root,'public/assets/atlas/mexico-groundwater-v1');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonicalBytes=await readFile(resolve(input,'groundwater.canonical.source.json'));
const canonical=JSON.parse(canonicalBytes);
const geometryBytes=await readFile(resolve(root,'src/data/atlas/mexico/geometry.json'));
const indexBytes=await readFile(resolve(root,'src/data/atlas/mexico/geometry-index.json'));
const projectionBytes=await readFile(resolve(root,'src/lib/atlas-mexico-projection.mjs'));
const states=JSON.parse(geometryBytes), index=JSON.parse(indexBytes);
if(hash(geometryBytes)!==canonical.nationalDisplayMask.boundarySha256)throw new Error('Reviewed national boundary changed');
const [minX,minY,maxX,maxY]=index.metadata.boundsNative;
const width=900,height=580,scale=Math.min((width-56)/(maxX-minX),(height-56)/(maxY-minY));
const left=(width-(maxX-minX)*scale)/2,top=(height-(maxY-minY)*scale)/2;
function project(coordinate){const [x,y]=lambertForward(coordinate);return [left+(x-minX)*scale,top+(maxY-y)*scale];}
function geometryPath(geometry){
 const line=points=>points.map((point,i)=>{const [x,y]=project(point);return `${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;}).join('')+'Z';
 if(geometry.type==='Polygon')return geometry.coordinates.map(line).join('');
 if(geometry.type==='MultiPolygon')return geometry.coordinates.flat().map(line).join('');
 throw new Error('Groundwater overview requires source polygons');
}
await mkdir(output,{recursive:true});
const classFiles={};const collections=[];let members=0,rings=0;
for(const entry of Object.values(canonical.classFiles)){
 if(!/^groundwater-[0-9]+[A-Za-z]+\.geojson\.gz$/.test(entry.file))throw new Error('Unexpected class transport filename');
 const bytes=await readFile(resolve(input,entry.file));
 if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new Error(`${entry.id}: transport changed`);
 const decoded=gunzipSync(bytes);
 if(decoded.length!==entry.decodedAsset.bytes||hash(decoded)!==entry.decodedAsset.sha256)throw new Error(`${entry.id}: decoded changed`);
 const collection=JSON.parse(decoded);
 if(collection.type!=='FeatureCollection'||collection.features.length!==1||collection.features[0].properties.classId!==entry.classId)throw new Error('Class identity changed');
 if(hash(JSON.stringify(collection.features[0].geometry))!==entry.geometrySha256)throw new Error('Class geometry changed');
 await copyFile(resolve(input,entry.file),resolve(output,entry.file));
 classFiles[entry.classId]={...entry,label:entry.label.replace('収量','産出収量'),fullLabel:entry.fullLabel.replace('収量','産出収量')};
 collections.push({entry:classFiles[entry.classId],feature:collection.features[0]});
 members+=entry.sourceMemberCount;rings+=entry.sourceRingCount;
}
if(Object.keys(classFiles).length!==10||members!==29479||rings!==48769)throw new Error('Nationwide class/source member coverage changed');
const mask=states.features.map(feature=>geometryPath(feature.geometry)).join('');
const paths=collections.map(({entry,feature})=>`<path fill="${entry.color}" fill-rule="evenodd" d="${geometryPath(feature.geometry)}"/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1160" viewBox="0 0 900 580"><defs><clipPath id="national"><path fill-rule="evenodd" clip-rule="evenodd" d="${mask}"/></clipPath></defs><g clip-path="url(#national)">${paths}</g></svg>`;
const png=await sharp(Buffer.from(svg),{unlimited:true}).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
await writeFile(resolve(output,'groundwater-overview.png'),png);
// Apply the identical display boundary as an alpha image, without browser path unions.
const maskSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1160" viewBox="0 0 900 580"><path fill="#ffffff" fill-rule="evenodd" d="${mask}"/></svg>`;
const maskPng=await sharp(Buffer.from(maskSvg),{unlimited:true}).png({compressionLevel:9,adaptiveFiltering:false}).toBuffer();
await writeFile(resolve(output,'groundwater-country-mask.png'),maskPng);
const countryMaskAsset={file:'groundwater-country-mask.png',width:1800,height:1160,viewBox:'0 0 900 580',bytes:maskPng.length,sha256:hash(maskPng),format:'PNG',maskType:'alpha',
 nationalBoundarySha256:hash(geometryBytes),projectionSourceSha256:hash(projectionBytes),geometryIndexSha256:hash(indexBytes),stateCount:states.features.length,
 method:'Rasterize the identical retained 32-state display boundary in the existing Mexico Lambert coordinates, even-odd fill and identical two-decimal display paths. Only the national display mask is rasterized; selected-class vector members, rings and coordinates remain unchanged.',
 limitation:'A display mask at 1800 by 1160 pixels; country edges may show raster antialiasing when magnified. It does not define legal aquifers or administrative boundaries for analysis.'};
const overviewAsset={file:'groundwater-overview.png',width:1800,height:1160,viewBox:'0 0 900 580',bytes:png.length,sha256:hash(png),format:'PNG',
 geometrySourceSha256:hash(canonicalBytes),nationalBoundarySha256:hash(geometryBytes),projectionSourceSha256:hash(projectionBytes),geometryIndexSha256:hash(indexBytes),
 classCount:10,sourceMemberCount:members,sourceRingCount:rings,renderer:'sharp (Astro dependency)',
 method:'Render the identical reviewed class polygons in the existing Mexico Lambert map coordinates, even-odd fill, clipped only for display to retained 32-state boundary. The image has no administrative aquifer or present-water-volume meaning.',
 limitation:'A national display image; tiny parts may fall below image resolution. The selected-class vector retains all source members and rings. No area totals, local boundaries or water availability are inferred.'};
const metadata={...canonical,name:'地下水の水理地質10分類',edition:'Serie II（1996作成・2008改訂）',
 file:overviewAsset.file,deliveryMode:'national-overview-and-selected-class',defaultSelectedClassId:'all',classFiles,overviewAsset,countryMaskAsset,
 legend:Object.values(classFiles).map(({id,label,fullLabel,color,material,measure,sourceClass,sourceName})=>({id,label,fullLabel,color,material,measure,sourceClass,sourceName})),
 title:'地下水の水理地質：材質・産出収量／賦存可能性',
 meaning:'固結・非固結の材質ごとに、原典の産出収量区分（L/s）または地下水の賦存可能性を示します。現在の地下水量・取水量・法定帯水層境界ではありません。',
 selectedDistributionNotice:'全国図は全10分類。分類選択時はその分類の全国分布だけを表示します。未着色は他分類や除外水面などで、水なし・欠測を意味しません。',
 publicationStatus:'Prepared for the Mexico groundwater implementation; browser/performance and publication gates are required.',
 sourceInput:{file:'groundwater.canonical.source.json',bytes:canonicalBytes.length,sha256:hash(canonicalBytes)}};
await writeFile(resolve(output,'groundwater.source.json'),JSON.stringify(metadata,null,2)+'\n');
const manifest={schemaVersion:1,regionId:'mexico',coverage:canonical.coverage,coordinateReference:'EPSG:4326 vectors; pre-rendered image in existing Mexico Lambert coordinates.',layers:{groundwater:metadata}};
await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({classCount:10,sourceMemberCount:members,sourceRingCount:rings,overviewBytes:png.length,overviewSha256:hash(png),countryMaskBytes:maskPng.length,countryMaskSha256:hash(maskPng),largestClassBytes:Math.max(...Object.values(classFiles).map(entry=>entry.bytes)),totalClassBytes:Object.values(classFiles).reduce((sum,entry)=>sum+entry.bytes,0)}));
