/** Whole-Mexico 2021 tree-cover display from verified WorldCover categorical overviews.
 * Offline regeneration: node scripts/prepare-mexico-tree-cover.mjs
 * Original overview range acquisition is documented in the retained source manifest.
 * No complete 10 m tile or new network request is used by this generator.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { lambertForward, lambertInverse, mexicoProjection } from '../src/lib/atlas-mexico-projection.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const arg=(key,fallback)=>args.includes(key)?path.resolve(args[args.indexOf(key)+1]):fallback;
const provenance=arg('--source',path.join(root,'data-source/atlas/mexico/tree-cover-2021'));
const output=arg('--output',path.join(root,'public/assets/atlas/mexico-agriculture-v2'));
const width=1800,height=1160,mapWidth=900,mapHeight=580;
const geoBytes=await fs.readFile(path.join(root,'src/data/atlas/mexico/geometry.json'));
const geography=JSON.parse(geoBytes),index=JSON.parse(await fs.readFile(path.join(root,'src/data/atlas/mexico/geometry-index.json'),'utf8'));
const [minX,minY,maxX,maxY]=index.metadata.boundsNative;
const scale=Math.min((mapWidth-56)/(maxX-minX),(mapHeight-56)/(maxY-minY));
const left=(mapWidth-(maxX-minX)*scale)/2,top=(mapHeight-(maxY-minY)*scale)/2;
const project=coordinate=>{const [x,y]=lambertForward(coordinate);return [(left+(x-minX)*scale)*2,(top+(maxY-y)*scale)*2];};
const unproject=(x,y)=>lambertInverse([minX+((x+.5)/2-left)/scale,maxY-((y+.5)/2-top)/scale]);
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sourceCodes=new Set([0,10,20,30,40,50,60,70,80,90,95,100]);
function tileName(longitude, latitude) {
  const west = Math.floor(longitude / 3) * 3, lower = Math.floor(latitude / 3) * 3;
  return `${lower < 0 ? 'S' : 'N'}${String(Math.abs(lower)).padStart(2, '0')}${west < 0 ? 'W' : 'E'}${String(Math.abs(west)).padStart(3, '0')}`;
}
function tileBounds(tile) {
  const match = /^([NS])(\d{2})([EW])(\d{3})$/.exec(tile);
  if (!match) throw new Error('Invalid WorldCover tile');
  const lower = Number(match[2]) * (match[1] === 'S' ? -1 : 1), west = Number(match[4]) * (match[3] === 'W' ? -1 : 1);
  return [west, lower, west + 3, lower + 3];
}

/** Classic, little-endian TIFF metadata; reject formats outside this product. */
function parseTiff(prefix) {
  if (prefix.readUInt16LE(0) !== 0x4949 || prefix.readUInt16LE(2) !== 42) throw new Error('Unsupported TIFF header');
  let offset = prefix.readUInt32LE(4);
  const ifds = [];
  while (offset) {
    if (ifds.length >= 12 || offset + 2 > prefix.length) throw new Error('Invalid TIFF IFD');
    const count = prefix.readUInt16LE(offset), tags = {};
    for (let i = 0; i < count; i++) {
      const at = offset + 2 + i * 12;
      if (at + 12 > prefix.length) throw new Error('TIFF metadata exceeds prefix');
      const tag = prefix.readUInt16LE(at), type = prefix.readUInt16LE(at + 2), n = prefix.readUInt32LE(at + 4), raw = prefix.readUInt32LE(at + 8);
      if (n === 1 && [1, 3, 4].includes(type)) tags[tag] = type === 1 ? raw & 255 : type === 3 ? raw & 65535 : raw;
      if ([42112, 42113].includes(tag) && type === 2) {
        const start = n <= 4 ? at + 8 : raw;
        if (start + n > prefix.length) throw new Error('TIFF metadata string exceeds prefix');
        tags[tag] = prefix.subarray(start, start + n).toString('utf8').replaceAll('\0', '');
      }
    }
    ifds.push(tags);
    offset = prefix.readUInt32LE(offset + 2 + count * 12);
  }
  const original = ifds[0], overview = ifds.at(-1);
  if (original[256] !== 36000 || original[257] !== 36000 || original[258] !== 8 || original[277] !== 1) throw new Error('Unexpected WorldCover source dimensions');
  if (overview[256] !== 562 || overview[257] !== 562 || overview[259] !== 8 || overview[317] !== 1 || overview[322] !== 1024 || overview[323] !== 1024 || overview[42113] !== '0') throw new Error('Unexpected WorldCover categorical overview');
  if (!original[42112]?.includes('2021-12-31') || !original[42112]?.includes('CC-BY 4.0')) throw new Error('WorldCover year/license metadata mismatch');
  if (!Number.isInteger(overview[324]) || overview[325] < 1 || overview[325] > 1_200_000) throw new Error('Unexpected overview block range');
  return { original, overview, ifdCount: ifds.length };
}

/** Fill polygon interiors at display-pixel centres, including interior rings. */
function paintCountry(mask, geometry, id) {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    const rings = polygon.map(ring => ring.map(project));
    const allY = rings.flatMap(ring => ring.map(point => point[1]));
    const start = Math.max(0, Math.ceil(Math.min(...allY) - .5)), end = Math.min(height - 1, Math.floor(Math.max(...allY) - .5));
    for (let y = start; y <= end; y++) {
      const intersections = [], centre = y + .5;
      for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[j], b = ring[i];
        if ((a[1] > centre) !== (b[1] > centre)) intersections.push(a[0] + (centre - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        const left = Math.max(0, Math.ceil(intersections[i] - .5)), right = Math.min(width - 1, Math.floor(intersections[i + 1] - .5));
        for (let x = left; x <= right; x++) mask[y * width + x] = id;
      }
    }
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let value = i; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; return value >>> 0; });
function crc32(bytes) { let value = 0xffffffff; for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) { const name = Buffer.from(type), buffer = Buffer.alloc(data.length + 12); buffer.writeUInt32BE(data.length, 0); name.copy(buffer, 4); data.copy(buffer, 8); buffer.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8); return buffer; }
function encodePng(rgba) {
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) rgba.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header), pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}


await fs.mkdir(output,{recursive:true});
const packed=await fs.readFile(path.join(provenance,'worldcover-overview-snapshot.json.gz'));
const acquisition=JSON.parse(zlib.gunzipSync(packed));
if(acquisition.maxAcquisitionBytes!==3547793||acquisition.tiles.length!==45)throw new Error('Changed bounded source extraction');
const decoded=new Map(),inputs=[];
for(const input of acquisition.tiles){
 const prefix=Buffer.from(input.prefixBase64,'base64'),compressed=Buffer.from(input.overviewBase64,'base64');
 if(prefix.length!==65536||sha(prefix)!==input.prefixSha256||sha(compressed)!==input.overviewSha256)throw new Error(`Input hash mismatch: ${input.tile}`);
 const {overview}=parseTiff(prefix);
 if(overview[324]!==input.overviewStart||overview[325]!==input.overviewBytes)throw new Error('Range metadata mismatch');
 const raster=zlib.inflateSync(compressed);
 if(raster.length!==1024*1024)throw new Error('Invalid decoded overview dimensions');
 const codes=new Set();for(let y=0;y<562;y++)for(let x=0;x<562;x++)codes.add(raster[y*1024+x]);
 if([...codes].some(code=>!sourceCodes.has(code)))throw new Error('Noncategorical source code');
 decoded.set(input.tile,raster);
 const {prefixBase64,overviewBase64,...metadata}=input;inputs.push(metadata);
}
const land=new Uint8Array(width*height);
geography.features.forEach((country,i)=>paintCountry(land,country.geometry,i+1));
const rgba=Buffer.alloc(width*height*4),classGrid=Buffer.alloc(width*height);
classGrid.fill(255);
const stateCoverage=geography.features.map(f=>({code:f.properties.code,displayPixels:0,treePixels:0,otherValidPixels:0,missingPixels:0}));
const missingTileCounts={},observedCodes={};let trees=0,valid=0,missing=0,inside=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const at=y*width+x,id=land[at];if(!id)continue;
 inside++;const stats=stateCoverage[id-1];stats.displayPixels++;
 const coordinate=unproject(x,y),tile=tileName(...coordinate),extent=tileBounds(tile),raster=decoded.get(tile);
 if(!raster){missing++;stats.missingPixels++;missingTileCounts[tile]=(missingTileCounts[tile]??0)+1;continue;}
 const col=Math.max(0,Math.min(561,Math.floor((coordinate[0]-extent[0])/3*562))),row=Math.max(0,Math.min(561,Math.floor((extent[3]-coordinate[1])/3*562)));
 const code=raster[row*1024+col];classGrid[at]=code;
 observedCodes[code]=(observedCodes[code]??0)+1;
 if(code===0){missing++;stats.missingPixels++;continue;}
 valid++;
 if(code===10){trees++;stats.treePixels++;rgba[at*4]=57;rgba[at*4+1]=113;rgba[at*4+2]=65;rgba[at*4+3]=170;}else stats.otherValidPixels++;
}
if(!trees||valid+missing!==inside||stateCoverage.length!==32)throw new Error('Invalid national crop mask/coverage');
for(let i=0;i<width*height;i++)if(rgba[i*4+3]&&(classGrid[i]!==10||!land[i]))throw new Error('Painted pixel not source tree-cover within Mexico');
const image=encodePng(rgba),query=zlib.gzipSync(classGrid,{level:9});
await fs.writeFile(path.join(output,'tree-cover-2021.png'),image);
await fs.writeFile(path.join(provenance,'tree-cover-display-codes.bin.gz'),query);
const source={title:'ESA WorldCover 10 m 2021 v200',sourceUrl:'https://esa-worldcover.org/en/data-access',doi:'https://doi.org/10.5281/zenodo.7254221',publisher:'ESA WorldCover consortium',referenceYear:2021,license:'CC-BY-4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',attribution:'© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium'};
const manifest={schemaVersion:1,label:'2021年の樹木被覆',retrieved:'2026-10-06',source,file:'tree-cover-2021.png',bytes:image.length,sha256:sha(image),width,height,mapViewBox:'0 0 900 580',projection:mexicoProjection,frame:{mapWidth,mapHeight,boundsNative:index.metadata.boundsNative,scale,left,top},sourceClass:10,sourceNoData:0,displayUnknownCode:255,extraction:{availableTiles:45,unavailableSourceTiles:acquisition.unavailableSourceTiles,boundedAcquisitionBytes:acquisition.maxAcquisitionBytes,complete10mTilesDownloaded:0,originalTileDimensions:[36000,36000],sampledOverviewDimensions:[562,562],overviewResolutionDegrees:3/562,overviewApproxResolutionAtEquatorM:594,providerOverviewResampling:'Not specified in source metadata; no quantitative area aggregation claim',displayResampling:'Nearest-neighbour categorical sampling at pixel centers using the exact existing Mexico Lambert inverse projection',countryMask:'Existing INEGI Mexico states, preserving holes; pixel-center inclusion',sourceRanges:inputs.map(t=>({tile:t.tile,url:t.url,prefixSha256:t.prefixSha256,overviewSha256:t.overviewSha256,overviewRange:`bytes=${t.overviewStart}-${t.overviewStart+t.overviewBytes-1}`}))},definition:'Source class10 tree cover, including plantations and orchards where mapped. Not pine distribution, harvest extent, forest legal status, timber availability or forest area statistics. Mangrove source class95 is separate and not included.',limitations:['Source2021 data and pine harvest2022 quantities are different indicators and remain separate.','Provider overview is approximately0.6km at equator; this national display is further generalized. It does not have10m display precision.','Other cover and missing source data are both transparent in the visual overlay, but their counts are tracked separately; no tree-area or percent-cover statistic is computed.','Small islands and patches can be unresolved by pixel centers. One offshore source tile N18W117 is unavailable and remains missing.'],coverage:{displayPixelsInsideMexico:inside,treeDisplayPixels:trees,otherValidDisplayPixels:valid-trees,missingDisplayPixels:missing,missingTileCounts,observedCodes,stateCoverage},inputs:{geometry:{path:'src/data/atlas/mexico/geometry.json',sha256:sha(geoBytes)},sourceSnapshot:{path:'data-source/atlas/mexico/tree-cover-2021/worldcover-overview-snapshot.json.gz',sha256:sha(packed),bytes:packed.length},query:{path:'data-source/atlas/mexico/tree-cover-2021/tree-cover-display-codes.bin.gz',sha256:sha(query),bytes:query.length}},reproduce:'node scripts/prepare-mexico-tree-cover.mjs'};
await fs.writeFile(path.join(output,'tree-cover-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(provenance,'range-inputs.json'),JSON.stringify({source,acquisition:inputs,unavailableSourceTiles:acquisition.unavailableSourceTiles},null,2)+'\n');
console.log(JSON.stringify({bytes:image.length,sha256:sha(image),trees,valid,missing,inside,missingTileCounts}));
