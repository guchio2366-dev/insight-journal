/** Canada PC acceptance against actual built assets and a sandboxed browser. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import config from '../astro.config.mjs';
import {verifyCanadaNaturalReading} from './verify-canada-natural-reading.mjs';
import {verifyCanadaElevationBands,verifyCanadaElevationRasterInteraction} from './verify-canada-elevation-bands.mjs';
import {verifyCanadaIndustryPilot} from './verify-canada-industry-pilot.mjs';
import {verifyCanadaDemographicsReading} from './verify-canada-demographics-reading.mjs';
import {verifyCanadaForestryOverview} from './verify-canada-forestry-overview.mjs';
import {verifyCanadaAgricultureOverview} from './verify-canada-agriculture-overview.mjs';
const dist=path.resolve('dist'),output=path.resolve(process.env.ATLAS_QA_OUTPUT??'/tmp/atlas-canada-qa'),base=String(config.base??'').replace(/\/$/,'');
await mkdir(output,{recursive:true});
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',sandboxRequired:true,browserZoom:'100% (visualViewport.scale=1; no CSS zoom)',viewports:[],checks:[],screenshots:[],failures:[]};
const server=createServer(async(req,res)=>{try{let route=new URL(req.url,'http://local').pathname;if(base&&route.startsWith(base))route=route.slice(base.length);if(route.endsWith('/'))route+='index.html';const file=path.resolve(dist,'.'+route);assert(file.startsWith(dist+'/'));const bytes=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
try{
 browser=await chromium.launch({executablePath:process.env.ATLAS_CHROMIUM_PATH||process.env.INDUSTRY_REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});result.browserVersion=browser.version();
 page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const evidence=new Set(['canada-agriculture-1920.png','canada-agriculture-crops-only.png','canada-agriculture-livestock-only.png','canada-forestry-1920.png','canada-climate-initial-1920.png','canada-rivers-st-lawrence-1920.png','canada-rain-initial-1920.png','canada-drainage-initial-1920.png','canada-landform-initial-1920.png','canada-distribution-1920-initial.png','canada-ethnicity-1920-initial.png','canada-religion-1920-initial.png','canada-religion-peel-simultaneous.png']);
 const capture=page.screenshot.bind(page),transport=[];
 page.screenshot=async options=>{const image=await capture(options);if(evidence.has(path.basename(options.path??''))){const file=path.basename(options.path).replace(/\.png$/,'.jpg');await capture({...options,path:path.join(output,file),type:'jpeg',quality:90});transport.push(file);}return image;};
 const url=route=>`http://127.0.0.1:${server.address().port}${base}/atlas/north-america/`+route;
 for(const [name,verify]of [['industry',verifyCanadaIndustryPilot],['agriculture',verifyCanadaAgricultureOverview],['forestry',verifyCanadaForestryOverview],['natural-reading',verifyCanadaNaturalReading],['demographics',verifyCanadaDemographicsReading],['elevation',verifyCanadaElevationBands],['elevation-interaction',verifyCanadaElevationRasterInteraction]]){
  try{console.log('Canada PC check',name);await verify({page,url,output,result});}
  catch(error){result.failures.push({name,error:error.stack});console.error(name,error);await page.screenshot({path:path.join(output,name+'-failure.png')});}
 }
 for(const file of transport)console.log('CANADA_MAP_IMAGE '+JSON.stringify({file,base64:(await readFile(path.join(output,file))).toString('base64')}));
 assert.deepEqual(errors,[],'No browser runtime errors');assert.deepEqual(result.failures,[],'Every requested Canada map check passes');result.status='passed';
}catch(error){result.status=browser?'failed':'blocked';result.error=error.stack;process.exitCode=1;console.error(error);}
finally{
 await writeFile(path.join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log('CANADA_MAP_VERIFICATION '+JSON.stringify(result));
 await browser?.close();await new Promise(resolve=>server.close(resolve));
}
