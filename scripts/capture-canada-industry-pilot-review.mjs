import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';
import config from '../astro.config.mjs';
import {verifyCanadaIndustryPilot} from './verify-canada-industry-pilot.mjs';
const dist=path.resolve('dist'),output=path.resolve(process.env.CANADA_PILOT_REVIEW_OUTPUT??'review-artifacts/canada-industry-pilot'),base=String(config.base??'').replace(/\/$/,'');
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',sandboxRequired:true,browserZoom:'100% (visualViewport.scale=1; no CSS zoom)',viewports:[],checks:[],screenshots:[]};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let url=new URL(req.url,'http://local').pathname;if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);assert(file.startsWith(dist+'/'));res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 result.browserVersion=browser.version();const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await verifyCanadaIndustryPilot({page,url:route=>`http://127.0.0.1:${server.address().port}${base}/atlas/north-america/`+route,output,result});assert.deepEqual(errors,[]);result.status='passed';
}catch(error){result.status=browser?'failed':'blocked';result.error=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({head:result.head,status:result.status,output}));}
