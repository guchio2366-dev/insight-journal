/** Offline extraction of the already adopted, SHA-pinned GPCC normal. */
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import path from 'node:path';
import {readNetcdfHeader,sumCompleteMonthlyNormals,sourceCellIndex} from '../europe/prepare-precipitation.mjs';
const at=process.argv.indexOf('--cache');if(at<0)throw Error('Usage: --cache <private-source-cache>');
const folder=path.resolve(process.argv[at+1]),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
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
