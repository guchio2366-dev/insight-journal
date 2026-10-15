import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import config from '../astro.config.mjs';
import {verifyCanadaIndustryPilot} from './verify-canada-industry-pilot.mjs';
const dist=path.resolve('dist'),output=path.resolve(process.env.CANADA_PILOT_REVIEW_OUTPUT??'review-artifacts/canada-industry-pilot'),base=String(config.base??'').replace(/\/$/,'');
const localDiff=execFileSync('git',['diff','--binary','HEAD']);
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),worktree:{dirty:localDiff.length>0,diffSha256:createHash('sha256').update(localDiff).digest('hex'),files:execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean)},status:'running',sandboxRequired:true,browserZoom:'100% (visualViewport.scale=1; no CSS zoom)',viewports:[],checks:[],screenshots:[]};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let url=new URL(req.url,'http://local').pathname;if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);assert(file.startsWith(dist+'/'));res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser,page;
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 result.browserVersion=browser.version();page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const transportNames=new Set(['1920-resources-initial','1920-manufacturing-initial','1920-services-initial','1920-resources-overlap-sudbury','1920-manufacturing-overlap-sudbury','1920-statistics-three-columns','failure']);
 const capture=page.screenshot.bind(page);
 page.screenshot=async options=>{const bytes=await capture(options),name=path.basename(options.path??'').replace(/\.png$/,'');if(process.env.CANADA_REVIEW_LOG_IMAGES==='1'&&transportNames.has(name))await capture({...options,path:path.join(output,name+'.jpg'),type:'jpeg',quality:80});return bytes;};
 await verifyCanadaIndustryPilot({page,url:route=>`http://127.0.0.1:${server.address().port}${base}/atlas/north-america/`+route,output,result});assert.deepEqual(errors,[]);result.status='passed';
}catch(error){result.status=browser?'failed':'blocked';result.error=error.stack;process.exitCode=1;console.error(error);if(page){await page.screenshot({path:path.join(output,'failure.png')});result.failureViewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,map:document.querySelector('[data-ca-map-frame]').getBoundingClientRect().toJSON(),sector:document.querySelector('[data-ca-industry-pilot]').canadaIndustryView?.sector}));}}
finally{
 await writeFile(path.join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');
 console.log('CANADA_PILOT_VERIFICATION '+JSON.stringify(result));
 // Keep review images readable through the authorized GitHub logs API as well as
 // the artifact ZIP, whose temporary download host may be unavailable to reviewers.
 const evidence=['1920-resources-initial.jpg','1920-manufacturing-initial.jpg','1920-services-initial.jpg','1920-resources-overlap-sudbury.jpg','1920-manufacturing-overlap-sudbury.jpg','1920-statistics-three-columns.jpg','failure.jpg'];
 if(process.env.CANADA_REVIEW_LOG_IMAGES==='1')for(const file of evidence){try{console.log('CANADA_PILOT_IMAGE '+JSON.stringify({file,base64:(await readFile(path.join(output,file))).toString('base64')}));}catch{}}
 await browser?.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({head:result.head,status:result.status,output}));
}
