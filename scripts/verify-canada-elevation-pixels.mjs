/** Compare old/new hit testing against real full-resolution RGBA pixels. No sandbox bypass. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const output='/tmp/atlas-lightweight',manifest=JSON.parse(await readFile('public/assets/atlas/canada-climate-elevation-v1/elevation-bands-manifest.json'));
const compiled=[];
const baseline=process.env.ATLAS_QA_RASTER_BEFORE?await readFile(process.env.ATLAS_QA_RASTER_BEFORE,'utf8'):execFileSync('git',['show','d166204299c2a12acd7c0275b9d0114d49c5040e:src/scripts/atlas-canada-elevation-raster.ts'],{encoding:'utf8'});
for(const contents of [baseline,await readFile('src/scripts/atlas-canada-elevation-raster.ts','utf8')]){
 const code=await build({stdin:{contents,loader:'ts',resolveDir:path.resolve('src/scripts')},bundle:true,write:false,format:'iife',globalName:'RasterTest'});compiled.push(code.outputFiles[0].text);
}
const server=createServer(async(req,res)=>{const bytes=await readFile('public/assets/atlas/canada-climate-elevation-v1/elevation-classes.png');res.writeHead(200,{'content-type':'image/png','access-control-allow-origin':'*'});res.end(bytes);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;const report={conditions:'Cloud Chromium, sandbox enabled, actual 5460×7515 PNG, no throttling; full reference RGBA retained only in this test',runs:[]};
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,chromiumSandbox:true,env:{...process.env,XDG_CONFIG_HOME:'/tmp/insight-chromium-config',XDG_CACHE_HOME:'/tmp/insight-chromium-cache'},ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 for(let repeat=0;repeat<3;repeat++)for(const [index,code]of compiled.entries()){
  const page=await browser.newPage();await page.addScriptTag({content:code});
  const data=await page.evaluate(async({manifest,url,index})=>{
   const bitmap=await createImageBitmap(await(await fetch(url)).blob());
   const reference=document.createElement('canvas');reference.width=bitmap.width;reference.height=bitmap.height;
   const ref=reference.getContext('2d',{willReadFrequently:true});ref.drawImage(bitmap,0,0);
   const rgba=ref.getImageData(0,0,bitmap.width,bitmap.height).data;
   const samples=new Map(),points=[];
   // Include every palette value, transparent pixels, all edge pixels and a deterministic grid.
   for(let n=0;n<rgba.length;n+=4){const key=rgba[n+3]?(rgba[n]<<16|rgba[n+1]<<8|rgba[n+2]):'transparent';if(!samples.has(key))samples.set(key,[n/4%bitmap.width,Math.floor(n/4/bitmap.width)]);}
   points.push(...samples.values());
   for(let x=0;x<bitmap.width;x++){points.push([x,0],[x,bitmap.height-1]);}
   for(let y=0;y<bitmap.height;y++){points.push([0,y],[bitmap.width-1,y]);}
   for(let y=19;y<bitmap.height;y+=127)for(let x=13;x<bitmap.width;x+=113)points.push([x,y]);
   points.push([-1,0],[bitmap.width,0],[0,-1],[0,bitmap.height]);
   const config={imageUrl:url,...manifest.raster,groups:manifest.levels.map(g=>({id:g.id,outlineUrl:url,imageUrl:url,bounds:g.bounds}))};
   const original=document.createElement.bind(document),canvases=[];
   document.createElement=function(name,...args){const node=original(name,...args);if(name==='canvas')canvases.push(node);return node;};
   const root=original('div'),fallback=document.createElementNS('http://www.w3.org/2000/svg','svg');root.append(fallback);document.body.append(root);
   const raster=RasterTest.createCanadaElevationRaster(root,fallback,config,new AbortController().signal);await raster.load();
   const merc=y=>Math.log(Math.tan(Math.PI/4+y*Math.PI/360)),north=merc(config.coordinates[0][1]),south=merc(config.coordinates[2][1]);
   const lonlat=([x,y])=>[config.coordinates[0][0]+(x+.5)/config.width*(config.coordinates[1][0]-config.coordinates[0][0]),(2*Math.atan(Math.exp(north-(y+.5)/config.height*(north-south)))-Math.PI/2)*180/Math.PI];
   const expected=([x,y])=>{if(x<0||y<0||x>=bitmap.width||y>=bitmap.height)return null;const n=(y*bitmap.width+x)*4;if(!rgba[n+3])return null;const color='#'+[...rgba.slice(n,n+3)].map(v=>v.toString(16).padStart(2,'0')).join(''),i=config.palette.indexOf(color);return i>0?config.groups[i-1].id:null;};
   const first=performance.now();raster.hit(...lonlat(points[0]));const firstHitMs=performance.now()-first;
   let mismatches=0;const start=performance.now();for(const point of points)if(raster.hit(...lonlat(point))!==expected(point))mismatches++;
   // Alternate colour/transparent and reselect to catch retained 1×1 pixels.
   for(let i=0;i<3;i++)for(const point of samples.values())if(raster.hit(...lonlat(point))!==expected(point))mismatches++;
   const batchMs=performance.now()-start,dimensions=canvases.map(c=>[c.width,c.height]);raster.destroy();bitmap.close();
   return {implementation:index?'after':'before',firstHitMs,batchMs,points:points.length,classes:samples.size,mismatches,dimensions};
  },{manifest,url:`http://127.0.0.1:${server.address().port}/elevation.png`,index});
  assert.equal(data.mismatches,0);assert.equal(data.classes,14);assert.deepEqual(data.dimensions,index?[[1,1]]:[[5460,7515]]);report.runs.push({repeat,...data});console.log(data);await page.close();
 }
 report.status='passed';
}catch(error){report.status='failed';report.error=error.stack;process.exitCode=1;console.error(error);}
finally{await mkdir(output,{recursive:true});await writeFile(path.join(output,'canada-pixels.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
