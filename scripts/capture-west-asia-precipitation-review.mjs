#!/usr/bin/env node
// One additional West Asia screenshot; the Riyadh and Nile screens already
// exist in the current-equivalent PC acceptance artifact.
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
const output=path.join(repo,'review-artifacts','west-asia-precipitation');
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
 await page.goto(origin+basePath+'/atlas/west-asia/nature/?topic=annual-precipitation',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);
 await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-west-country]').inputValue(),'');
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'annual-precipitation');
 assert.equal(await page.locator('[data-west-band="rainfall"]').count(),107);
 assert((await page.locator('[data-west-aligned-line="rainfall"]').count())>0);
 assert.match(await page.locator('[data-west-legend]').innerText(),/250/);
 assert.match(await page.locator('[data-west-legend]').innerText(),/1991–2020/);
 assert.match(await page.locator('[data-west-detail]').textContent(),/GPCC/);
 const map=await page.locator('[data-west-map]').boundingBox(),reading=await page.locator('.west-reading').boundingBox();
 assert(map&&map.width>400&&map.height>250&&map.y<evidence.viewport.height);
 assert(reading&&reading.width>300&&reading.x>map.x+map.width);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.evaluate(()=>{window.scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const file='annual-precipitation.jpg',bytes=await page.screenshot({path:path.join(output,file),type:'jpeg',quality:78,fullPage:true,animations:'disabled'});
 evidence.images.push({file,url:new URL(page.url()).pathname+new URL(page.url()).search,map,reading,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 assert.deepEqual(errors,[]);assert.deepEqual(failedResponses,[]);
 evidence.status='passed';
}catch(error){evidence.status='failed';evidence.error=error.stack??String(error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'metadata.json'),JSON.stringify(evidence,null,2)+'\n');}
