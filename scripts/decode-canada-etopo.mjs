/** Decode an exact native Canada window of the pinned NOAA ETOPO2022 DEM.
 * Preparation only; requires GeoTIFF.js 3.0.5 separately from the site build.
 * node scripts/decode-canada-etopo.mjs --source ORIGINAL.tif --out CACHE
 *   --geotiff-package /path/to/node_modules/geotiff
 */
import {createReadStream} from 'node:fs';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const option=name=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:undefined;
const source=option('--source'),target=option('--out'),packageRoot=option('--geotiff-package');
if(!source||!target)throw Error('--source <original GeoTIFF> and --out <cache directory> required');
const expected='9d27d4b8ea8e76977e2988bca667d7c8fa68b927355feffcddd6b4875a7fd08e',digest=createHash('sha256');
for await(const chunk of createReadStream(source))digest.update(chunk);
if(digest.digest('hex')!==expected)throw Error('Pinned full-source SHA256 mismatch');
const {fromFile}=await(packageRoot?import(pathToFileURL(path.join(packageRoot,'dist-module/geotiff.js')).href):import('geotiff'));
const t=await fromFile(source),i=await t.getImage(),o=i.getOrigin(),r=i.getResolution(),keys=i.getGeoKeys();
if(i.getWidth()!==21600||i.getHeight()!==10800||keys.GeographicTypeGeoKey!==4326||keys.VerticalCSTypeGeoKey!==3855||Math.abs(r[0]-1/60)>1e-12)throw Error('Unexpected original DEM layout');
const bounds=[-142,40,-51,84],window=[Math.floor((bounds[0]-o[0])/r[0]),Math.floor((bounds[3]-o[1])/r[1]),Math.ceil((bounds[2]-o[0])/r[0]),Math.ceil((bounds[1]-o[1])/r[1])];
const data=await i.readRasters({window,samples:[0],interleave:true});
if(!(data instanceof Float32Array))throw Error('Expected original float32 source');
const bytes=Buffer.from(data.buffer,data.byteOffset,data.byteLength),name='canada-etopo-window.f32';
await mkdir(target,{recursive:true});await writeFile(path.join(target,name),bytes);
const metadata={sourceSha256:expected,sourceBytes:(await stat(source)).size,file:name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:window[2]-window[0],height:window[3]-window[1],bounds,window,origin:[o[0]+window[0]*r[0],o[1]+window[1]*r[1]],resolution:[r[0],r[1]],dtype:'float32-little-endian',noData:i.getGDALNoData(),geoKeys:keys,method:'GeoTIFF.js 3.0.5 exact native window read; no resampling or integer casting'};
await writeFile(path.join(target,'canada-etopo-window.json'),JSON.stringify(metadata,null,2)+'\n');await t.close();console.log(JSON.stringify(metadata));
