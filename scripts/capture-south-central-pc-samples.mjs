#!/usr/bin/env node
/** South/Central Asia PC views from the checked-out local production build. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {access,mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url));
const root=await realpath(path.join(repo,'dist'));
const output=path.join(repo,'review-artifacts','south-central-pc-samples');
const base=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.gz':'application/gzip'};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
assert.equal(head,process.env.REVIEW_HEAD_SHA??head,'Capture must use the exact PR head');
if(process.env.GITHUB_ACTIONS==='true'){
 assert.equal(process.env.RUNNER_OS,'Linux');
 assert(process.env.REVIEW_JAPANESE_FONTS?.trim(),'Japanese fonts must be verified on the runner');
 assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim(),'Japanese font resolution must be recorded');
}
const executablePath=process.env.REVIEW_CHROME_PATH;
assert(executablePath,'An existing Chrome executable is required');
await access(executablePath,constants.X_OK);
await mkdir(output,{recursive:true});
const results={status:'running',headSHA:head,runId:process.env.GITHUB_RUN_ID??null,viewport:{width:1536,height:864},browser:{sandbox:true,additionalFlags:[]},fonts:{setup:process.env.REVIEW_JAPANESE_FONT_SETUP??null,match:process.env.REVIEW_JAPANESE_FONT_MATCH??null},captures:[],externalAttempts:[]};
async function persist(){await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');}
await persist();
const server=createServer(async(req,res)=>{
 try{
  assert(req.method==='GET'||req.method==='HEAD');
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  assert(!base||pathname.startsWith(base+'/'));
  let file=path.resolve(root,'.'+pathname.slice(base.length));
  assert(file.startsWith(root+path.sep));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  file=await realpath(file);assert(file.startsWith(root+path.sep));
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Missing built asset');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
 results.browser.version=browser.version();
 const context=await browser.newContext({viewport:results.viewport,deviceScaleFactor:1,isMobile:false,hasTouch:false,serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  if(new URL(route.request().url()).origin!==origin){results.externalAttempts.push({url:new URL(route.request().url()).origin,resourceType:route.request().resourceType()});await route.abort('blockedbyclient');}
  else await route.continue();
 });
 await context.routeWebSocket('**/*',socket=>{results.externalAttempts.push({url:new URL(socket.url()).origin,resourceType:'websocket'});socket.close({code:1008,reason:'Local static review only'});});
 const scenes=[
  {id:'south-central-rivers-groundwater',route:'/atlas/asia/south-central-asia/nature/?topic=water',check:async page=>{
   await page.waitForFunction(()=>{const root=document.querySelector('[data-asia-atlas]'),panel=document.querySelector('[data-hydrology-panel]'),picker=document.querySelector('[data-hydrology-detail]');return root?.dataset.mapReady==='true'&&panel&&!panel.hidden&&picker?.options.length>1;});
   assert.match(await page.locator('[data-hydrology-panel]').textContent(),/河川|地下水/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }},
  {id:'south-central-nature',route:'/atlas/asia/south-central-asia/nature/',check:async page=>{
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);
   assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-region'),'south-central-asia');
   assert((await page.locator('[data-reading-dock-title]').textContent())?.trim(),'Regional reading must have a title');
   assert.equal(await page.locator('[data-ao-country]').count(),0);
  }},
  {id:'south-central-farm-world-share',route:'/atlas/asia/south-central-asia/agriculture/',check:async page=>{
   const section=page.locator('[data-south-central-farm-connections]');
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-south-central-world-share]')?.textContent?.includes('26.6％'));
   assert.equal(await section.locator('.asia-farm-connections-grid > section').count(),3);
   assert.match(await section.textContent(),/インドの米（籾米）.*26\.6％/s);
   assert.equal(await section.locator('svg.sc-share-chart').count(),1);
   const cards=await section.locator('.asia-farm-connections-grid > section').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
   assert(cards[0]<cards[2]*.7&&cards[1]<cards[2]*.7,'Unavailable cards must end near their content, without stretched blank space');
   assert.equal(await section.locator('[data-south-central-world-share] details[open]').count(),0,'Source and denominator notes start collapsed');
   await section.scrollIntoViewIfNeeded();
  }},
  {id:'central-asia-wheat-world-share',route:'/atlas/asia/central-asia/agriculture/?place=KAZ&topic=wheat',check:async page=>{
   const section=page.locator('[data-south-central-farm-connections]');
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-south-central-world-share]')?.textContent?.includes('2.3％'));
   assert.match(await section.textContent(),/カザフスタンの小麦.*2\.3％/s);
   assert.equal(await section.locator('svg.sc-share-chart').count(),1);
   await section.scrollIntoViewIfNeeded();
  }},
  {id:'south-asia-india-world-share',route:'/atlas/asia/south-asia/overview/?country=IND&topic=agriculture',check:async page=>{
   await page.waitForFunction(()=>document.querySelector('[data-ao-country]')?.value==='IND'&&!document.querySelector('[data-ao-panel="agriculture"]')?.hidden);
   const panel=page.locator('[data-ao-panel="agriculture"]');assert.match(await panel.textContent(),/米（籾米）.*2024年は26\.6％/s);
   await panel.getByText(/2024年は26\.6％/).first().scrollIntoViewIfNeeded();
  }},
  {id:'central-asia-kazakhstan-world-share',route:'/atlas/asia/central-asia/overview/?country=KAZ&topic=agriculture',check:async page=>{
   await page.waitForFunction(()=>document.querySelector('[data-ao-country]')?.value==='KAZ'&&!document.querySelector('[data-ao-panel="agriculture"]')?.hidden);
   const panel=page.locator('[data-ao-panel="agriculture"]');assert.match(await panel.textContent(),/小麦.*2024年は2\.3％/s);
   await panel.getByText(/2024年は2\.3％/).first().scrollIntoViewIfNeeded();
  }},
 ];
 const selected=process.env.REVIEW_SCENE?scenes.filter(scene=>scene.id===process.env.REVIEW_SCENE):scenes;
 assert.equal(selected.length,process.env.REVIEW_SCENE?1:5,'Review scene must be one known capture');
 for(const scene of selected){
  const page=await context.newPage(),errors=[],failures=[];
  page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(30000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
  try{
   await page.goto(origin+base+scene.route,{waitUntil:'domcontentloaded'});
   await scene.check(page);
   await page.waitForLoadState('networkidle');
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   const image=await page.screenshot({fullPage:false,animations:'disabled'});
   await writeFile(path.join(output,scene.id+'.png'),image);
   assert.deepEqual(errors,[],'No browser runtime errors');assert.deepEqual(failures,[],'No missing local assets');
   results.captures.push({id:scene.id,route:scene.route,bytes:image.length,sha256:sha256(image),passed:true});
   console.log(`PASS ${scene.id} (${image.length} bytes)`);
  }finally{await page.close();await persist();}
 }
 assert.equal(results.captures.length,selected.length);assert.deepEqual(results.externalAttempts,[]);
 results.status='passed';
}catch(error){results.status='failed';results.failure=error.stack??String(error);console.error(results.failure);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));results.completedAt=new Date().toISOString();await persist();}
console.log(JSON.stringify({status:results.status,headSHA:head,images:results.captures.length,externalAttempts:results.externalAttempts.length,failure:results.failure?.split('\n')[0]},null,2));
