#!/usr/bin/env node
// Two West Asia agriculture screens from the built site in normally sandboxed Chrome.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {access,mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {westProductionSelection} from '../src/data/atlas/west-asia-topics.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','west-asia-food');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const root=await realpath(path.join(repo,'dist'));
const source=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/west-asia-v1/data.json'),'utf8'));
const selected=westProductionSelection(source,2024);
assert.equal(selected.length,10);
assert.deepEqual(selected.slice(0,3).map(row=>row.id),['wheat','cattle-milk','barley']);
assert.deepEqual(source.agriculture.years,[2015,2016,2017,2018,2019,2020,2021,2022,2023,2024]);
const faoInput=source.agriculture.inputs.find(row=>row.file==='Production_Crops_Livestock_E_All_Data_(Normalized).zip');
assert.match(faoInput?.sha256??'',/^[a-f0-9]{64}$/);
await mkdir(output,{recursive:true});

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  assert(req.method==='GET'||req.method==='HEAD');
  const url=new URL(req.url,'http://127.0.0.1');
  assert(url.pathname.startsWith(basePath+'/'));
  let file=path.resolve(root,'.'+url.pathname.slice(basePath.length));
  assert(file.startsWith(root+path.sep));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  file=await realpath(file);assert(file.startsWith(root+path.sep));
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
const record={status:'running',headSHA:process.env.REVIEW_HEAD_SHA??null,runId:process.env.GITHUB_RUN_ID??null,viewport:{width:1440,height:1000},source:{publisher:'FAOSTAT',domain:'Production_Crops_Livestock',elementCode:'5510',year:2024,unit:'t',targetCountries:20,rawArchive:faoInput.file,rawSHA256:faoInput.sha256,method:source.agriculture.method},selection:selected,images:[],browser:null};
try{
 const executablePath=process.env.REVIEW_CHROME_PATH;
 assert(executablePath,'Use the runner\'s preinstalled Chrome');await access(executablePath,constants.X_OK);
 assert(process.env.REVIEW_JAPANESE_FONTS?.trim(),'Japanese-capable runner fonts are required');
 assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim(),'Resolved Japanese fonts are required');
 assert.equal(process.env.GITHUB_ACTIONS,'true');
 assert.match(record.headSHA??'',/^[a-f0-9]{40}$/i);
 browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
 record.browser={version:browser.version(),chromiumSandbox:true,extraFlags:[]};
 const context=await browser.newContext({viewport:record.viewport,deviceScaleFactor:1,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],failedResponses=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failedResponses.push(response.url());});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin+basePath+'/atlas/west-asia/agriculture/',{waitUntil:'domcontentloaded'});
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);
 await ready();await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-west-country]').inputValue(),'');
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'farming-overview');
 assert.equal(await page.locator('[data-west-farm-context]').count(),5);
 assert.equal(await page.locator('[data-west-production-selection] tbody tr').count(),10);
 assert(await page.locator('[data-west-production-selection]').isVisible());
 const capture=async label=>{
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const file=label+'.jpg',bytes=await page.screenshot({path:path.join(output,file),type:'jpeg',quality:78,fullPage:true,animations:'disabled'});
  record.images.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 };
 await capture('01-farming-overview');
 await page.locator('[data-west-production-selection] [data-west-topic-button="cattle-milk"]').click();await ready();
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'cattle-milk');
 assert.equal(await page.locator('[data-west-farm-context]').count(),0);
 assert(await page.locator('[data-west-detail]').innerText().then(text=>text.includes('牛の密度図')));
 await page.locator('[data-west-country]').selectOption('TUR');await ready();
 assert(await page.locator('[data-west-detail]').innerText().then(text=>text.includes('FAOSTAT')));
 assert.equal(await page.locator('[data-west-comparison] tbody tr').count(),20);
 await capture('02-cattle-milk-turkey');
 assert.deepEqual(errors,[]);assert.deepEqual(failedResponses,[]);
 assert.equal(record.images.length,2);
 record.status='passed';
}catch(error){record.status='failed';record.error=error.stack??String(error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'metadata.json'),JSON.stringify(record,null,2)+'\n');}
