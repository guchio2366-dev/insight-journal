#!/usr/bin/env node
// Review-only PC captures from a clean West Asia production build.
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
const root=await realpath(path.join(repo,'dist'));
const output=path.join(repo,'review-artifacts','west-asia-three');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  assert(req.method==='GET'||req.method==='HEAD');
  const url=new URL(req.url,'http://127.0.0.1');assert(url.pathname.startsWith(basePath+'/'));
  let file=path.resolve(root,'.'+url.pathname.slice(basePath.length));assert(file.startsWith(root+path.sep));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);assert(file.startsWith(root+path.sep));
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const evidence={status:'running',headSHA:process.env.REVIEW_HEAD_SHA??null,baseSHA:process.env.REVIEW_BASE_SHA??null,viewport:{width:1440,height:1000},images:[],browser:null};
let browser;
try{
 const executablePath=process.env.REVIEW_CHROME_PATH;
 assert(executablePath,'Runner preinstalled Chrome is required');await access(executablePath,constants.X_OK);
 assert(process.env.REVIEW_JAPANESE_FONTS?.trim());assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim());
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.match(evidence.headSHA??'',/^[a-f0-9]{40}$/i);
 browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
 evidence.browser={version:browser.version(),chromiumSandbox:true,extraFlags:[]};
 const context=await browser.newContext({viewport:evidence.viewport,deviceScaleFactor:1,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],failedResponses=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failedResponses.push(response.url());});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);
 const open=async route=>{await page.goto(origin+basePath+'/atlas/west-asia/'+route,{waitUntil:'domcontentloaded'});await ready();await page.evaluate(()=>document.fonts.ready);};
 const capture=async(label,description)=>{
  await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const map=await page.locator('[data-west-map]').boundingBox(),reading=await page.locator('.west-reading').boundingBox();
  assert(map&&map.width>400&&map.height>250&&map.y<evidence.viewport.height);
  assert(reading&&reading.width>300&&reading.x>map.x+map.width);
  const file=label+'.jpg',bytes=await page.screenshot({path:path.join(output,file),type:'jpeg',quality:78,fullPage:true,animations:'disabled'});
  evidence.images.push({file,description,url:new URL(page.url()).pathname+new URL(page.url()).search,map,reading,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 };
 await open('industry/?topic=oil&country=SAU');
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'oil');
 assert.equal(await page.locator('[data-west-country]').inputValue(),'SAU');
 assert.match(await page.locator('[data-west-detail]').innerText(),/ジュバイル|ラス・タヌラ/);
 assert.match(await page.locator('[data-west-legend]').innerText(),/GDP比/);
 await capture('01-saudi-oil','サウジアラビアの石油資源レント。右欄は採掘・精製・石油化学の位置を区別する。');
 await open('agriculture/');
 assert.equal(await page.locator('[data-west-country]').inputValue(),'');
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'farming-overview');
 assert.equal(await page.locator('[data-west-farm-context]').count(),5);
 assert.equal(await page.locator('[data-west-production-selection] li').count(),10);
 await capture('02-farming-overview','小麦・大麦の面と羊・山羊・牛の点。2020年の細地域推計と2024年の国別生産重量候補を区別する。');
 await open('nature/');
 await page.locator('[data-west-standard-group="水資源"]').click();await ready();
 assert.equal(await page.locator('[data-west-country]').inputValue(),'');
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'rivers');
 assert.equal(await page.locator('[data-west-water-groundwater]').count(),1);
 assert.equal(await page.locator('[data-west-water-rivers] path').count(),162);
 await capture('03-rivers-groundwater','河川・湖と地下水を含む地層の広域区分。利用可能量・井戸の取水量ではない。');
 assert.deepEqual(errors,[]);assert.deepEqual(failedResponses,[]);
 evidence.status='passed';
}catch(error){evidence.status='failed';evidence.error=error.stack??String(error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'metadata.json'),JSON.stringify(evidence,null,2)+'\n');}
