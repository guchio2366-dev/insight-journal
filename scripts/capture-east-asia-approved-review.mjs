#!/usr/bin/env node
// Actual sandboxed production-browser evidence for the approved East Asia scope.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','east-asia-approved');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const results={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,browser:null,sandbox:true,fonts:process.env.REVIEW_JAPANESE_FONTS??execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}),externalAttempts:[],cases:[],images:[],status:'running'};
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
 assert(results.fonts.trim(),'Japanese fonts are required');
 assert(process.env.REVIEW_CHROME_PATH,'An already-installed Chrome is required');
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});
 results.browser=browser.version();
 for(const profile of [{name:'desktop',width:1440,height:1000},{name:'laptop',width:1024,height:768}]){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==host.origin){results.externalAttempts.push(url.origin+url.pathname);await route.abort('blockedbyclient');}else await route.continue();});
  await context.routeWebSocket('**/*',socket=>{results.externalAttempts.push(socket.url());socket.close();});
  async function ready(page){await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');}
  async function open(page,field,query=''){await page.goto(`${host.origin}${basePath}/atlas/asia/east-asia/${field}/${query}`,{waitUntil:'domcontentloaded'});await ready(page);}
  async function shot(page,id,fullPage=false){const name=`${profile.name}-${id}.jpg`,file=path.join(output,name);await page.screenshot({path:file,type:'jpeg',quality:76,animations:'disabled',fullPage});const bytes=await readFile(file);results.images.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:page.url(),fullPage});}
  async function geometry(page){return page.evaluate(()=>{const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};const reading=document.querySelector('.asia-reading-panel');return {map:rect('.asia-map-frame'),reading:rect('.asia-reading-panel'),news:rect('.atlas-news'),readingOverflow:getComputedStyle(reading).overflowY,overflow:document.documentElement.scrollWidth>innerWidth};});}
  async function layout(page){const g=await geometry(page);assert.equal(g.overflow,false);assert(g.map.width>=300);assert(g.map.height>=320);assert(g.news.right<=g.map.left+1);assert(g.map.right<=g.reading.left+1);assert(['auto','scroll'].includes(g.readingOverflow));return g;}
  async function stations(page){return page.locator('[data-station]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.station,x:n.style.left,y:n.style.top})).sort((a,b)=>a.id.localeCompare(b.id)));}
  async function run(name,action){const record={profile:profile.name,name,passed:false,errors:[],failedRequests:[]};results.cases.push(record);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>record.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)record.failedRequests.push({url:new URL(r.url()).pathname,status:r.status()});});try{record.evidence=await action(page);assert.deepEqual(record.errors,[]);assert.deepEqual(record.failedRequests,[]);record.passed=true;}catch(e){record.failure=e.stack??String(e);await shot(page,name+'-failure').catch(()=>{});}finally{await page.close();await save();}console.log(`${record.passed?'PASS':'FAIL'} ${profile.name} ${name}${record.failure?': '+record.failure.split('\n')[0]:''}`);}
  await run('climate',async page=>{
   await open(page,'nature');const initial=await layout(page),before=await stations(page);assert(before.length>0);await shot(page,'climate-initial');
   await page.locator('[data-station="tokyo"]').click();await ready(page);const selected=page.locator('[data-city-panel="tokyo"]');assert.equal(await selected.isVisible(),true);assert.match(await selected.locator('h2').textContent(),/東京の雨温図/);assert.match(await selected.locator('[data-city-class-description]').textContent(),/0℃超.*22℃以上.*40mm未満/);const text=await selected.textContent();assert.match(text,/秋雨前線.*台風/);assert.match(text,/西高東低.*山地/);assert.match(text,/関東平野/);assert.doesNotMatch(text,/長江|黄河|二期作/);assert.deepEqual(await stations(page),before,'Tokyo must preserve all geographic station positions');await shot(page,'climate-tokyo');
   await page.reload();await ready(page);assert.deepEqual(await stations(page),before,'Reload selected Tokyo retains whole-region camera');
   await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await selected.isVisible(),false);await page.locator('[data-field="natural"]').first().click();await ready(page);assert.deepEqual(await stations(page),before);
   await page.goBack();await ready(page);assert.equal(await selected.isVisible(),false);
   return {initial,stationPositionsBefore:before,selectedCamera:'same projected positions before, after selection, reload and tab round trip'};
  });
  await run('population',async page=>{
   await open(page,'population');const initial=await layout(page);assert.match(await page.locator('[data-population-takeaway]').textContent(),/四川盆地.*成都.*重慶.*武漢.*西安/);assert.match(await page.locator('[data-population-detail]').textContent(),/灌漑農業.*工業化/);const helper=page.locator('.population-picker');assert.equal(await helper.isVisible(),true);assert(await helper.evaluate(n=>Boolean(n.closest('[data-asia-map-items]'))));await shot(page,'population-initial');
   const city=page.locator('[data-map-urban]:visible').first(),id=await city.getAttribute('data-map-urban');await city.click();await ready(page);assert.match(await page.locator('[data-population-title]').textContent(),/人口/);const camera=new URL(page.url()).searchParams;assert(camera.has('z'));await shot(page,'population-selected');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);
   await page.locator('[data-field="industry"]').first().click();await ready(page);assert.equal(await helper.isVisible(),false);await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await helper.isVisible(),true);return {initial,city:id};
  });
  await run('industry',async page=>{
   await open(page,'industry');const initial=await layout(page);assert.equal(new URL(page.url()).searchParams.get('topic'),'east-clusters');const host=page.locator('[data-east-cluster-reading]');assert.equal(await host.isVisible(),true);assert.match(await host.textContent(),/台湾/);assert.equal(await page.locator('[data-east-industry-journey]').isVisible(),false);assert(await page.locator('[data-industry-cluster]:visible').count()>5);await shot(page,'industry-initial');
   await page.locator('[data-industry-feature="east-chips"]').click();await ready(page);assert.match(await host.locator('[data-east-cluster-title]').textContent(),/半導体/);await page.locator('[data-industry-cluster="hsinchu"]').click();await ready(page);assert.match(await host.locator('[data-east-cluster-detail]').textContent(),/新竹/);await shot(page,'industry-chips-hsinchu');await page.goBack();await ready(page);assert.equal(await host.locator('[data-east-cluster-detail]').isVisible(),false);await page.locator('[data-field="natural"]').first().click();await ready(page);assert.equal(await host.isVisible(),false);await page.locator('[data-field="industry"]').first().click();await ready(page);assert.equal(await host.isVisible(),true);return {initial};
  });
  await run('farming',async page=>{
   await open(page,'agriculture');const initial=await layout(page),section=page.locator('[data-east-farm-foundations]');assert.equal(await section.isVisible(),true);const text=await section.textContent();assert.match(text,/供給と用途.*域外輸出入相手.*カロリー構成/s);assert.doesNotMatch(text,/丸太生産量|全商品輸出先|丸太・製材の供給/);assert.match(text,/未収録/);assert.match(await page.locator('[data-farm-overview-reading]').textContent(),/日本.*朝鮮半島.*モンゴル/s);await shot(page,'farming-initial');await section.scrollIntoViewIfNeeded();await shot(page,'farming-statistics');
   await page.locator('[data-farm-choice="rice"]').first().click();await ready(page);assert.doesNotMatch(await section.textContent(),/丸太生産量|全商品輸出先/);await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.get('topic'),'overview');await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await section.isVisible(),false);await page.locator('[data-field="agriculture"]').first().click();await ready(page);assert.equal(await section.isVisible(),true);return {initial,missingDataExplicit:true};
  });
  await run('rainfall',async page=>{
   await open(page,'nature','?topic=precipitation');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');const initial=await layout(page);assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/山.*内陸/s);assert.match(await page.locator('[data-hydrology-legend-note]').textContent(),/1981–2010.*1991–2020/);const labels=page.locator('.asia-rain-label:visible');const numbers=await labels.allTextContents();assert(numbers.includes('4,500'),'4500 line needs a visible label');assert(numbers.includes('5,500'),'5500 line needs a visible label');await shot(page,'rainfall-initial');await page.locator('.asia-rain-label:visible').filter({hasText:'4,500'}).click();await ready(page);assert.match(await page.locator('[data-hydrology-value]').textContent(),/mm\/年/);await shot(page,'rainfall-selected');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('at'),false);await page.locator('[data-field="population"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);return {initial,labels:numbers};
  });
  await run('basins',async page=>{
   await open(page,'nature','?topic=basins');const names=['長江','黄河','タリム川','アムール川'];for(const name of names)await page.locator('.asia-river-label').filter({hasText:name}).waitFor({state:'visible'});const initial=await layout(page);assert.equal(await page.locator('[data-basin-shortcuts]').isVisible(),false);assert.match(await page.locator('[data-hydrology-lead]').textContent(),/長江.*黄河.*アムール.*タリム/s);await shot(page,'basins-initial');await page.locator('.asia-river-label').filter({hasText:'黄河'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'b-4060007850');assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/青海.*渤海.*灌漑/s);await shot(page,'basins-yellow');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);await page.locator('[data-field="agriculture"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);for(const name of names)assert.equal(await page.locator('.asia-river-label').filter({hasText:name}).isVisible(),true);return {initial,riverNames:names};
  });
  await context.close();
 }
 results.status=results.cases.every(c=>c.passed)&&results.externalAttempts.length===0?'passed':'failed';await save();assert.equal(results.status,'passed','See results.json and failure images');
}finally{await save();await browser?.close();await new Promise(resolve=>host?.server.close(resolve)??resolve());}
