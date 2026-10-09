#!/usr/bin/env node
// Compact evidence of West Asia's region roles, water, climate and farming on PC.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {access,mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
const repo=fileURLToPath(new URL('../',import.meta.url));
const out=path.join(repo,'review-artifacts','west-asia-priority');await mkdir(out,{recursive:true});
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const root=await realpath(path.join(repo,'dist'));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{assert(req.method==='GET'||req.method==='HEAD');const url=new URL(req.url,'http://127.0.0.1');assert(url.pathname.startsWith(basePath+'/'));let file=path.resolve(root,'.'+url.pathname.slice(basePath.length));assert(file.startsWith(root+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);assert(file.startsWith(root+path.sep));const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404).end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const record={status:'running',headSHA:process.env.REVIEW_HEAD_SHA,runId:process.env.GITHUB_RUN_ID,browser:null,images:[],checks:[]};let browser;
try{
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.match(record.headSHA??'',/^[a-f0-9]{40}$/i);
 assert(process.env.REVIEW_CHROME_PATH);await access(process.env.REVIEW_CHROME_PATH,constants.X_OK);
 assert(process.env.REVIEW_JAPANESE_FONTS?.trim());assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim());
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});record.browser={version:browser.version(),chromiumSandbox:true,extraFlags:[]};
 for(const width of [1440,1024]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,serviceWorkers:'block'});const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failed.push(response.url());});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const open=async route=>{await page.goto(origin+basePath+'/atlas/west-asia/'+route+'/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);await page.evaluate(()=>document.fonts.ready);};
  const ready=async()=>page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);
  const capture=async label=>{await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const map=await page.locator('[data-west-map]').boundingBox();assert(map&&map.width>400&&map.height>300);const file=`${width}-${label}.jpg`,bytes=await page.screenshot({path:path.join(out,file),type:'jpeg',quality:74,animations:'disabled'});record.images.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});};
  const labelOverlap=async selector=>page.evaluate(sel=>{const boxes=[...document.querySelectorAll(sel)].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.getBoundingClientRect());let overlaps=0;for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>3&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>3)overlaps++;}return overlaps;},selector);
  await open('industry');assert.equal(await page.locator('[data-industry-site]').count(),12);assert.equal(await labelOverlap('[data-industry-site] [data-marker-label]'),0);await capture('industry-all');
  await page.locator('[data-west-topic-button="industry-extraction"]').click();await ready();assert.equal(await page.locator('[data-industry-site]').count(),2);assert(await page.locator('[data-industry-site="upper-zakum"]').count());
  await page.locator('[data-west-country]').selectOption('ARE');await ready();assert.equal(await page.locator('[data-industry-site]').count(),2);await capture('industry-extraction-uae');
  await page.locator('[data-west-topic-button="industry-ports"]').click();await ready();assert(await page.locator('[data-industry-site="suez"]').count());await capture('industry-ports');
  await open('nature');await page.locator('[data-west-city]').selectOption('riyadh');await ready();await page.waitForFunction(()=>document.querySelector('[data-west-climate-class]')?.textContent.includes('BWh'));assert.equal(await page.locator('[data-city] rect').count(),0);await capture('climate-riyadh');
  await page.locator('[data-west-standard-group="水資源"]').click();await ready();await page.locator('[data-west-topic-button="basins"]').first().click();await ready();assert.equal(await page.locator('.west-basin-place').count(),4);const before=await page.locator('[data-west-map]').getAttribute('viewBox');await page.locator('[data-west-representative-basin="1060034260"]').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));await ready();assert.equal(await page.locator('[data-west-map]').getAttribute('viewBox'),before);await capture('basin-nile');
  await open('agriculture');assert.equal(await page.locator('[data-west-farm-context]').count(),5);assert(await page.locator('[data-west-farm-supply]').textContent().then(x=>x.includes('世界生産比')));await capture('farming-all');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);record.checks.push({width,passed:true});await context.close();
 }
 record.status='passed';
}catch(error){record.status='failed';record.error=error.stack??String(error);console.error(record.error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(out,'metadata.json'),JSON.stringify(record,null,2)+'\n');}
