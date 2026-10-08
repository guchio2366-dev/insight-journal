#!/usr/bin/env node
// A small, sandboxed production-browser review of the four East Asia industry entries.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {verifyAsiaIndustryCountry} from './verify-asia-industry-country.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','east-industry');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const results={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,chrome:null,sandbox:true,certificateExceptions:false,externalAttempts:[],cases:[],status:'running'};
await mkdir(output,{recursive:true});
const save=()=>writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');

async function serveBuild(){
 const root=await realpath(path.join(repo,'dist'));
 const server=createServer(async(req,res)=>{
  try{
   assert(['GET','HEAD'].includes(req.method));
   let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   assert(pathname.startsWith(basePath+'/'));pathname=pathname.slice(basePath.length);
   let file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+path.sep));
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   file=await realpath(file);assert(file.startsWith(root+path.sep));
   const body=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Missing built asset');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}

let browser,host;
try{
 host=await serveBuild();
 const executablePath=process.env.REVIEW_CHROME_PATH;
 assert(executablePath,'An already installed Chrome path is required');
 browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
 results.chrome=browser.version();
 const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==host.origin){results.externalAttempts.push({url:url.origin+url.pathname,method:route.request().method()});await route.abort('blockedbyclient');return;}
  await route.continue();
 });
 await context.routeWebSocket('**/*',socket=>{results.externalAttempts.push({url:socket.url(),type:'websocket'});socket.close({code:1008,reason:'Local review only'});});
 async function runCase(name,action){
  const record={name,passed:false,errors:[],failedRequests:[]};results.cases.push(record);
  const page=await context.newPage();page.setDefaultTimeout(12000);
  page.on('pageerror',error=>record.errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)record.failedRequests.push({status:response.status(),url:new URL(response.url()).pathname});});
  try{record.evidence=await action(page);assert.deepEqual(record.errors,[]);assert.deepEqual(record.failedRequests,[]);record.passed=true;}
  catch(error){record.failure=error?.stack??String(error);}
  finally{await page.close();await save();}
  console.log(`${record.passed?'PASS':'FAIL'} ${name}${record.failure?': '+record.failure.split('\n')[0]:''}`);
 }
 await runCase('country-navigation',page=>verifyAsiaIndustryCountry(page,{profile:'desktop',source:host.origin+basePath}));
 for(const [code,expected] of [['CHN','24.84%'],['JPN','18.82%'],['KOR','26.62%'],['TWN','WDIで未掲載']])await runCase(`country-${code}`,async page=>{
  await page.goto(`${host.origin}${basePath}/atlas/asia/east-asia/industry/?topic=manufacturing&place=${code}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{const root=document.querySelector('[data-asia-atlas]');return root?.dataset.mapReady==='true'&&root.querySelector('[data-map-fallback]')?.hidden&&root.querySelector('[data-industry-status]')?.textContent===''&&!root.querySelector('[data-east-industry-journey]')?.hidden;});
  const guide=page.locator('[data-east-industry-journey]'),summary=await guide.locator('[data-east-industry-journey-summary]').textContent();
  assert(summary.includes(expected),`${code}: expected sourced country reading`);
  const gap=await guide.locator('[data-east-industry-journey-gap]').textContent();
  if(code==='TWN'){
   assert.match(gap,/未掲載：台湾のWDI製造業付加価値/);
   assert.match(gap,/公式統計.*定義・年.*照合/);
  }else{assert.match(gap,/未収録：/);assert.match(gap,/公式/);}
  assert.match(await page.locator('[data-industry-legend-note]').textContent(),/東アジア4対象は同じ色区分/);
  if(code==='TWN')assert.match(await page.locator('[data-industry-value]').textContent(),/台湾：未掲載/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await page.waitForLoadState('networkidle');
  const image=`${code.toLowerCase()}.png`;await page.screenshot({path:path.join(output,image),animations:'disabled'});
  return {summary,gap,image};
 });
 await runCase('us-reference',async page=>{
  await page.goto(`${host.origin}${basePath}/atlas/north-america/industry/?sector=manufacturing&subsector=auto`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]')?.dataset.renderState==='ready');
  await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await page.waitForLoadState('networkidle');
  await page.screenshot({path:path.join(output,'us-manufacturing.png'),animations:'disabled'});
  return {image:'us-manufacturing.png'};
 });
 await context.close();
 assert.deepEqual(results.externalAttempts,[],'No external requests are allowed');
 results.status=results.cases.every(c=>c.passed)?'passed':'failed';
}catch(error){results.status='failed';results.failure=error?.stack??String(error);}
finally{
 await browser?.close();if(host)await new Promise(resolve=>host.server.close(resolve));
 const images=await Promise.all(['chn.png','jpn.png','kor.png','twn.png','us-manufacturing.png'].map(async name=>{try{return (await stat(path.join(output,name))).size;}catch{return 0;}}));
 results.imageBytes=images.reduce((a,b)=>a+b,0);await save();
}
assert.equal(results.status,'passed',results.failure??results.cases.filter(c=>!c.passed).map(c=>c.failure).join('\n'));
assert(results.imageBytes<20*1024*1024,'The focused review artifact must stay below 20 MiB');
