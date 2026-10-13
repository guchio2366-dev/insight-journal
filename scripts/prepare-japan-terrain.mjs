/** Numerical-grid derivative; does not edit a photograph or interpolate source values. */
import fs from 'node:fs';
import {gunzipSync,deflateSync} from 'node:zlib';
import crypto from 'node:crypto';
const base='public/assets/atlas/japan-nature-v2/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json','utf8')),surface=manifest.elevation;
const input=fs.readFileSync(base+surface.grid),data=gunzipSync(input),width=surface.width,height=surface.height;
const value=(x,y)=>x<0||y<0||x>=width||y>=height?surface.noData:data.readFloatLE((y*width+x)*4);
const stride=width*4,raw=Buffer.alloc((stride+1)*height),[west,south,east,north]=surface.bounds3857,R=6378137;
const dx=(east-west)/width,dy=(north-south)/height,az=315*Math.PI/180,alt=45*Math.PI/180;
for(let y=0;y<height;y++){
 const mercatorY=north-(y+.5)*dy,lat=2*Math.atan(Math.exp(mercatorY/R))-Math.PI/2,scale=Math.cos(lat);
 for(let x=0;x<width;x++){
  const center=value(x,y),left=value(x-1,y),right=value(x+1,y),up=value(x,y-1),down=value(x,y+1);
  if([center,left,right,up,down].some(v=>v===surface.noData||!Number.isFinite(v)))continue;
  const gx=(right-left)/(2*dx*scale),gy=(up-down)/(2*dy*scale);
  const nx=-gx,ny=-gy,nz=1,n=Math.hypot(nx,ny,nz),light=(nx*Math.sin(az)*Math.cos(alt)+ny*Math.cos(az)*Math.cos(alt)+nz*Math.sin(alt))/n;
  const shade=Math.round(120+125*Math.max(0,Math.min(1,light))),i=y*(stride+1)+1+x*4;
  raw[i]=raw[i+1]=raw[i+2]=shade;raw[i+3]=230;
 }
}
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
const crc=b=>{let c=0xffffffff;for(const v of b)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
const chunk=(name,b)=>{const kind=Buffer.from(name),out=Buffer.alloc(12+b.length);out.writeUInt32BE(b.length,0);kind.copy(out,4);b.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([kind,b])),8+b.length);return out;};
const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),name='terrain-hillshade.png';fs.writeFileSync(base+name,png);
manifest.terrain={image:name,sourceGrid:surface.grid,sourceGridSha256:hash(input),sourceResolutionDegrees:surface.sourceResolutionDegrees,edition:2022,license:'CC0-1.0',source:surface.sourceUrl,method:'Central differences of existing ETOPO2022 display-grid samples, no source-value alteration or interpolation. Ground spacing corrects Mercator by cos(latitude). Azimuth315°, altitude45°, no vertical exaggeration. Centre and four neighbours must be valid; otherwise transparent. Artificial relief shading, not photography or landform classification.',script:'scripts/prepare-japan-terrain.mjs',scriptSha256:hash(fs.readFileSync('scripts/prepare-japan-terrain.mjs'))};
manifest.files[name]={bytes:png.length,sha256:hash(png)};fs.writeFileSync(base+'manifest.json',JSON.stringify(manifest)+'\n');console.log(JSON.stringify({image:name,bytes:png.length,sourceGridSha256:hash(input)}));
