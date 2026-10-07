/** Restore no values: extract the pinned GPCC window and render its contours. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {readNetcdfHeader,encodePng,width,height} from './prepare-precipitation.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const old=JSON.parse(await fs.readFile(path.join(root,'public/assets/atlas/europe/precipitation-v1/manifest.json'),'utf8'));
const sourceAt=process.argv.indexOf('--source');
const source=path.resolve(sourceAt<0?path.join(root,'../europe-water-research/gpcc-1991-2020-v2025-025.nc.gz'):process.argv[sourceAt+1]);
const archive=await fs.readFile(source),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
if(archive.length!==old.inputBytes||sha(archive)!==old.inputSha256||createHash('md5').update(archive).digest('hex')!==old.inputMd5)throw Error('Pinned GPCC original differs');
const raw=gunzipSync(archive),header=readNetcdfHeader(raw);
const variable=header.variables.find(item=>item.name==='gpcc_precip');
const lon=header.variables.find(item=>item.name==='lon'),lat=header.variables.find(item=>item.name==='lat');
if(header.records!==12||header.globals.time_coverage_start!=='1991-01-01'||header.globals.time_coverage_end!=='2020-12-31'||variable.type!==5||variable.attributes.units!=='mm/month')throw Error('Source baseline/variable changed');
const firstColumn=619,lastColumn=980,firstRow=67,lastRow=232,columns=lastColumn-firstColumn+1,rows=lastRow-firstRow+1;
const longitude=Array.from({length:columns},(_,i)=>raw.readDoubleBE(lon.offset+(firstColumn+i)*8));
const latitude=Array.from({length:rows},(_,i)=>raw.readDoubleBE(lat.offset+(firstRow+i)*8));
if(!longitude.every((value,i)=>value===-25.125+i*.25)||!latitude.every((value,i)=>value===73.125-i*.25))throw Error('Native coordinate orientation changed');
const stride=header.variables.filter(item=>item.dimensions[0]?.name==='time').reduce((sum,item)=>sum+item.recordBytes,0);
const monthly=Buffer.alloc(12*rows*columns*4);
for(let month=0;month<12;month++)for(let r=0;r<rows;r++)for(let c=0;c<columns;c++){
  const value=raw.readFloatBE(variable.offset+month*stride+((firstRow+r)*1440+firstColumn+c)*4);
  monthly.writeFloatLE(value,((month*rows+r)*columns+c)*4);
}
const sourceFolder=path.join(root,'data-source/atlas/europe/precipitation');
const output=path.join(root,'public/assets/atlas/europe/precipitation-contours-v1');
await fs.mkdir(output,{recursive:true});
const monthlyArchive=gzipSync(monthly,{level:9});
await fs.writeFile(path.join(sourceFolder,'isohyets-monthly-window.bin.gz'),monthlyArchive);
const window={originalArchiveSha256:old.inputSha256,originalArchiveBytes:old.inputBytes,
  rows,columns,months:12,longitude,latitude,encoding:'little-endian float32, month-row-column',sourceNoData:variable.attributes._FillValue,
  monthlyWindow:{path:'data-source/atlas/europe/precipitation/isohyets-monthly-window.bin.gz',sha256:sha(monthlyArchive),bytes:monthlyArchive.length},
  period:old.period,sourceUnit:'mm/month',license:old.license,licenseUrl:old.licenseUrl,licenseEvidence:old.licenseEvidence};
await fs.writeFile(path.join(output,'native-window.json'),JSON.stringify(window,null,2)+'\n');
execFileSync('python',[path.join(root,'scripts/europe/prepare-precipitation-isohyets.py'),'--repo',root],{stdio:'inherit'});
const svg=await fs.readFile(path.join(output,'precipitation.svg'));
const {data:rgba,info}=await sharp(svg,{limitInputPixels:width*height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
if(info.width!==width||info.height!==height||info.channels!==4)throw Error('Contour rendering frame changed');
const oldRgba=await sharp(path.join(root,'public/assets/atlas/europe/precipitation-v1/precipitation.png')).ensureAlpha().raw().toBuffer();
let paintedPixels=0,partialPixels=0;
for(let i=0;i<width*height;i++){
  if(!oldRgba[i*4+3]&&rgba[i*4+3])throw Error('Contour rendering entered a source-missing/outside pixel');
  if(rgba[i*4+3])paintedPixels++;if(rgba[i*4+3]>0&&rgba[i*4+3]<255)partialPixels++;
}
const image=encodePng(rgba);await fs.writeFile(path.join(output,'precipitation.png'),image);
const manifest=JSON.parse(await fs.readFile(path.join(output,'manifest.json'),'utf8'));
manifest.files['precipitation.png']={sha256:sha(image),bytes:image.length};
manifest.rendering={engine:'Existing locked sharp SVG renderer',version:sharp.versions.sharp,paintedPixels,partialPixels,
  oldValidPixels:old.validation.validDisplayPixels,sourceMissingPixelsFilled:0,
  note:'Colours and lines come from the same contour geometry. Coast/source-missing mask is unchanged; quads lacking any valid annual corner remain unpainted. PNG anti-aliasing does not add source observations.'};
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({imageBytes:image.length,monthlyWindowBytes:monthlyArchive.length,paintedPixels,sourceMissingPixelsFilled:0}));
