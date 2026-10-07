/** Offline only: GPCC fixed normal subset and exact acquired ETOPO native window. */
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {readNetcdfHeader,sumCompleteMonthlyNormals,sourceCellIndex} from '../europe/prepare-precipitation.mjs';
import path from 'node:path';
const args=process.argv.slice(2),at=args.indexOf('--cache'),gt=args.indexOf('--geotiff-module');
if(at<0||gt<0)throw Error('Usage: node scripts/latin-america/extract-water-terrain.mjs --cache <private-source-cache> --geotiff-module <GeoTIFF.js 3.0.5 module path>');
const folder=path.resolve(args[at+1]);
const {fromFile}=await import(path.resolve(args[gt+1]));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const archive=await fs.readFile(folder+'/gpcc-1991-2020-025.nc.gz');
if(sha(archive)!=='3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5')throw Error('GPCC checksum');
const bytes=zlib.gunzipSync(archive),header=readNetcdfHeader(bytes),variable=header.variables.find(v=>v.name==='gpcc_precip'),lon=header.variables.find(v=>v.name==='lon'),lat=header.variables.find(v=>v.name==='lat');
if(header.records!==12||variable.type!==5||variable.attributes.units!=='mm/month'||header.globals.time_coverage_start!=='1991-01-01'||header.globals.time_coverage_end!=='2020-12-31')throw Error('GPCC period/variable');
for(let i=0;i<1440;i++)if(bytes.readDoubleBE(lon.offset+8*i)!==-179.875+i*.25)throw Error('longitude');
for(let i=0;i<720;i++)if(bytes.readDoubleBE(lat.offset+8*i)!==89.875-i*.25)throw Error('latitude');
const stride=header.variables.filter(v=>v.dimensions[0]?.name==='time').reduce((sum,v)=>sum+v.recordBytes,0),missing=variable.attributes._FillValue;
const window=[347,247,589,585],width=window[2]-window[0],height=window[3]-window[1],grid=Buffer.alloc(width*height*4);
const monthsAt=(row,col)=>Array.from({length:12},(_,m)=>bytes.readFloatBE(variable.offset+m*stride+(row*1440+col)*4));
let valid=0,min=Infinity,max=-Infinity;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const annual=sumCompleteMonthlyNormals(monthsAt(window[1]+y,window[0]+x),missing),value=annual===null?-1:Math.fround(annual);grid.writeFloatLE(value,(y*width+x)*4);if(value>=0){valid++;min=Math.min(min,value);max=Math.max(max,value);}}
const samples=[['San Jose',-84.0833,9.9333],['Manaus',-60.0167,-3.1333],['Lima',-77.1167,-12.0167],['Santiago',-70.7833,-33.3833],['Bogota',-74.15,4.7],['Buenos Aires',-58.4167,-34.5833]].map(([name,x,y])=>{const c=sourceCellIndex(x,y),months=monthsAt(c.row,c.column);return {name,coordinate:[x,y],cellCenter:c.center,months,annual:Math.fround(sumCompleteMonthlyNormals(months,missing)),row:c.row,column:c.column};});
await fs.writeFile(folder+'/gpcc-annual.f32',grid);
await fs.writeFile(folder+'/gpcc-extraction.json',JSON.stringify({width,height,window,firstCenter:[-179.875+window[0]*.25,89.875-window[1]*.25],step:[.25,-.25],nodata:-1,valid,range:[min,max],samples,gridSha256:sha(grid),sourceCoordinates:{firstLongitude:bytes.readDoubleBE(lon.offset),firstLatitude:bytes.readDoubleBE(lat.offset),declaredLatitudeUnit:lat.attributes.units,usedConvention:'Actual north-positive coordinate array; inconsistent degrees_south attribute not used to flip source.'},sourceTitle:header.globals.title,sourcePeriod:[header.globals.time_coverage_start,header.globals.time_coverage_end]},null,2)+'\n');
console.log('GPCC complete',width,height,valid,min,max);
const acquisition=JSON.parse(await fs.readFile(folder+'/etopo-range-acquisition.json','utf8'));
if(acquisition.sourceGlobalBytes!==465969062||acquisition.fullGlobalSourceDownloaded!==false||acquisition.fullGlobalSha256LocallyVerified!==false)throw Error('Partial source identity');
const sparse=await fs.open(folder+'/etopo-latin-sparse.tif','r');
try{
 const header=await fs.readFile(folder+'/etopo-header.bin');if(sha(header)!==acquisition.headerSha256)throw Error('ETOPO header checksum');
 for(const r of acquisition.ranges){const data=Buffer.alloc(r.bytes);const read=await sparse.read(data,0,r.bytes,r.start);if(read.bytesRead!==r.bytes||sha(data)!==r.sha256)throw Error('ETOPO acquired range checksum');}
}finally{await sparse.close();}
const tiff=await fromFile(folder+'/etopo-latin-sparse.tif');
try{
const image=await tiff.getImage(0),resolution=image.getResolution(),origin=image.getOrigin(),geokeys=image.getGeoKeys();
if(image.getWidth()!==21600||image.getHeight()!==10800||Math.abs(resolution[0]-1/60)>1e-12||Math.abs(resolution[1]+1/60)>1e-12||origin[0]!==-180||origin[1]!==90||Number(image.getGDALNoData())!==-99999)throw Error('ETOPO raster identity');
const window=[5220,3720,8820,8760],values=await image.readRasters({window,samples:[0],interleave:true});
if(!(values instanceof Float32Array)||values.length!==3600*5040)throw Error('ETOPO decoder output');
const grid=Buffer.from(values.buffer,values.byteOffset,values.byteLength);let min=Infinity,max=-Infinity,missing=0;
for(const v of values){if(!Number.isFinite(v)||v===-99999){missing++;continue;}min=Math.min(min,v);max=Math.max(max,v);}
await fs.writeFile(folder+'/etopo-native.f32',grid);
await fs.writeFile(folder+'/etopo-extraction.json',JSON.stringify({width:3600,height:5040,window,origin:[-93,28],firstCenter:[-93+1/120,28-1/120],step:[1/60,-1/60],nodata:-99999,geokeys,missing,range:[min,max],decoder:'geotiff.js 3.0.5',encoding:'little-endian float32 row-major',gridSha256:sha(grid),partialSource:true,fullGlobalSourceDownloaded:false},null,2)+'\n');
console.log('ETOPO complete',values.length,min,max,missing);
}finally{await tiff.close();}
