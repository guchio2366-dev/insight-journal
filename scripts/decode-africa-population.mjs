/** Offline equal-area GHS population aggregation into the Africa longitude/latitude display grid. */
import {createReadStream} from 'node:fs';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const opt=n=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:undefined;
const source=opt('--source'),out=opt('--out'),pkg=opt('--geotiff-package'),proofPath=opt('--source-proof');
if(!source||!out||!pkg||!proofPath)throw Error('--source, --out, --geotiff-package and --source-proof required');
const proof=JSON.parse(await readFile(proofPath,'utf8')),hash=createHash('sha256');
for await(const block of createReadStream(source))hash.update(block);
if(hash.digest('hex')!==proof.sourceSha256)throw Error('Original population file differs from acquisition record');
const {fromFile}=await import(pathToFileURL(path.join(pkg,'dist-module/geotiff.js')).href);
const tif=await fromFile(source),image=await tif.getImage(),origin=image.getOrigin(),resolution=image.getResolution(),keys=image.getGeoKeys(),noData=image.getGDALNoData();
if(Math.abs(resolution[0]-1000)>1e-7||Math.abs(resolution[1]+1000)>1e-7||noData!==-200)throw Error('Expected retained GHS-POP 1km equal-area grid and -200 noData');
const keyText=JSON.stringify(keys);
if(!/Mollweide/i.test(keyText)&&keys.ProjectedCSTypeGeoKey!==54009)throw Error('Source CRS must explicitly identify Mollweide / 54009');
const R=6378137,sqrt2=Math.SQRT2,rad=Math.PI/180,bounds=[-27,-36,64,39],width=910,height=750,step=.1;
function project(lon,lat){let t=lat*rad;for(let i=0;i<20;i++){const d=(2*t+Math.sin(2*t)-Math.PI*Math.sin(lat*rad))/(2+2*Math.cos(2*t));t-=d;if(Math.abs(d)<1e-13)break;}return [2*sqrt2*R/Math.PI*lon*rad*Math.cos(t),sqrt2*R*Math.sin(t)];}
function inverse(x,y){const t=Math.asin(y/(sqrt2*R)),lat=Math.asin((2*t+Math.sin(2*t))/Math.PI)/rad,lon=Math.PI*x/(2*sqrt2*R*Math.cos(t))/rad;return [lon,lat];}
const frameXY=[project(bounds[0],0)[0],project(0,bounds[1])[1],project(bounds[2],0)[0],project(0,bounds[3])[1]];
const window=[Math.max(0,Math.floor((frameXY[0]-origin[0])/resolution[0])),Math.max(0,Math.floor((frameXY[3]-origin[1])/resolution[1])),Math.min(image.getWidth(),Math.ceil((frameXY[2]-origin[0])/resolution[0])),Math.min(image.getHeight(),Math.ceil((frameXY[1]-origin[1])/resolution[1]))];
const sums=new Float64Array(width*height),counts=new Uint32Array(width*height),zeroCounts=new Uint32Array(width*height);
let considered=0,positiveSource=0,zeroSource=0,invalidSource=0,inputSum=0;
console.log(JSON.stringify({stage:'population-window',sourceSize:[image.getWidth(),image.getHeight()],origin,resolution,geoKeys:keys,noData,window}));
for(let start=window[1];start<window[3];start+=128){
 const stop=Math.min(start+128,window[3]),nativeWidth=window[2]-window[0];
 const data=await image.readRasters({window:[window[0],start,window[2],stop],samples:[0],interleave:true});
 for(let localRow=0;localRow<stop-start;localRow++){
  const y=origin[1]+(start+localRow+.5)*resolution[1],theta=Math.asin(y/(sqrt2*R)),lat=Math.asin((2*theta+Math.sin(2*theta))/Math.PI)/rad,row=Math.floor((bounds[3]-lat)/step);
  if(row<0||row>=height)continue;
  const factor=Math.PI/(2*sqrt2*R*Math.cos(theta))/rad;
  for(let localCol=0;localCol<nativeWidth;localCol++){
   const lon=(origin[0]+(window[0]+localCol+.5)*resolution[0])*factor,col=Math.floor((lon-bounds[0])/step);
   if(col<0||col>=width)continue;
   const v=data[localRow*nativeWidth+localCol];
   if(!Number.isFinite(v)||v===noData||v<0){invalidSource++;continue;}
   const index=row*width+col;sums[index]+=v;counts[index]++;inputSum+=v;considered++;
   if(v===0){zeroCounts[index]++;zeroSource++;}else positiveSource++;
  }
 }
 console.log(JSON.stringify({stage:'population-aggregate',sourceRow:stop,totalSourceRows:window[3],validSourceCells:considered}));
}
const density=new Float32Array(width*height);for(let i=0;i<density.length;i++)density[i]=counts[i]>0?sums[i]/counts[i]:-1;
const binnedSum=sums.reduce((a,b)=>a+b,0),conserved=Math.abs(binnedSum-inputSum)<=Math.max(1e-5,Math.abs(inputSum)*1e-10);
if(!conserved)throw Error('Native population sum was not conserved during binning');
const reps=[];for(const [name,lon,lat] of [['Cairo',31.24,30.04],['Lagos',3.379,6.524],['Nairobi',36.82,-1.286],['Sahara',15,23],['Cape Town',18.42,-33.925],['Seychelles',55.45,-4.62],['Ocean',-20,0]]){
 const [x,y]=project(lon,lat),nativeCol=Math.floor((x-origin[0])/resolution[0]),nativeRow=Math.floor((y-origin[1])/resolution[1]),values=await image.readRasters({window:[nativeCol,nativeRow,nativeCol+1,nativeRow+1],samples:[0],interleave:true}),row=Math.floor((bounds[3]-lat)/step),col=Math.floor((lon-bounds[0])/step),i=row*width+col,roundTrip=inverse(x,y);
 if(Math.abs(roundTrip[0]-lon)>1e-9||Math.abs(roundTrip[1]-lat)>1e-9)throw Error('Mollweide round trip mismatch');
 reps.push({name,lon,lat,nativeCol,nativeRow,nativePersonsPer1KmCell:values[0],displayRow:row,displayCol:col,displayPersonsPerKm2:density[i],sumPersons:sums[i],validSourceCellAreaKm2:counts[i],zeroSourceCells:zeroCounts[i],meanCheck:counts[i]?Math.abs(density[i]-sums[i]/counts[i])<=Math.max(1e-5,Math.abs(density[i])*1e-7):density[i]===-1});
}
if(reps.some(r=>!r.meanCheck))throw Error('Representative mean checks failed');
await mkdir(out,{recursive:true});const bytes=Buffer.from(density.buffer,density.byteOffset,density.byteLength),countBytes=Buffer.from(counts.buffer,counts.byteOffset,counts.byteLength);
await writeFile(path.join(out,'africa-population-density.f32'),bytes);await writeFile(path.join(out,'africa-population-counts.u32'),countBytes);
const meta={source:proof,sourceGeometry:{width:image.getWidth(),height:image.getHeight(),origin,resolution,geoKeys:keys,noData},file:'africa-population-density.f32',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),countsFile:'africa-population-counts.u32',countsSha256:createHash('sha256').update(countBytes).digest('hex'),width,height,bounds,resolutionDegrees:step,encoding:'float32-little-endian',noData:-1,unit:'persons/km²',considered,positiveSource,zeroSource,invalidSource,inputSum,binnedSum,conserved,representativeSpots:reps,method:'Inverse spherical Mollweide (semi-major radius6378137m) at actual 1km equal-area source cell centres. Assign each valid original cell to its longitude/latitude0.1° destination cell. Sum original persons and divide by the count of valid1km² source cells, an area mean; no spatial interpolation. Source noData-200 is excluded, zero persons is included.'};
await writeFile(path.join(out,'africa-population-density.json'),JSON.stringify(meta,null,2)+'\n');await tif.close();
console.log(JSON.stringify({stage:'population-density-ready',file:path.join(out,meta.file),conserved,considered,representativeSpots:reps}));
