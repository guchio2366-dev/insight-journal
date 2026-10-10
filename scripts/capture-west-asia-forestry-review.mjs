#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {access,mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {westSawnwoodRow} from '../src/data/atlas/west-asia-forestry.mjs';

const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','west-asia-forestry');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const root=await realpath(path.join(repo,'dist'));
const source=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/west-asia-v1/data.json'),'utf8'));
const forestryInput=source.agriculture.inputs.find(row=>row.file==='Forestry_E_All_Data_(Normalized).zip');
assert.match(forestryInput?.sha256??'',/^[a-f0-9]{64}$/);
for(const country of source.countries){const row=westSawnwoodRow(source,country.code,2024);assert(row.production&&row.imports&&row.exports,country.code);}
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  assert(req.method==='GET'||req.method==='HEAD');
  const url=new URL(req.url,'http://127.0.0.1');assert(url.pathname.startsWith(basePath+'/'));
  let file=path.resolve(root,'.'+url.pathname.slice(basePath.length));assert(file.startsWith(root+path.sep));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  file=await realpath(file);assert(file.startsWith(root+path.sep));
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin=`http://127.0.0.1:${server.address().port}`;
const record={status:'running',headSHA:process.env.REVIEW_HEAD_SHA??null,runId:process.env.GITHUB_RUN_ID??null,viewport:{width:1440,height:1000},source:{publisher:'FAOSTAT',domain:'Forestry',item:'Sawnwood 1872',year:2024,unit:'m3',targetCountries:20,rawArchive:forestryInput.file,rawSHA256:forestryInput.sha256},images:[],browser:null};
let browser;
try{
 const executablePath=process.env.REVIEW_CHROME_PATH;
 assert(executablePath,'Use the runner’s preinstalled Chrome');await access(executablePath,constants.X_OK);
 assert(process.env.REVIEW_JAPANESE_FONTS?.trim());assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim());
 assert.equal(process.env.GITHUB_ACTIONS,'true');assert.match(record.headSHA??'',/^[a-f0-9]{40}$/i);
 browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
 record.browser={version:browser.version(),chromiumSandbox:true,extraFlags:[]};
 const context=await browser.newContext({viewport:record.viewport,deviceScaleFactor:1,serviceWorkers:'block'});
 const page=await context.newPage(),errors=[],failedResponses=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)failedResponses.push(response.url());});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin+basePath+'/atlas/west-asia/agriculture/?topic=forest',{waitUntil:'domcontentloaded'});
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);
 await ready();await page.evaluate(()=>document.fonts.ready);
 assert.equal(await page.locator('[data-west-atlas]').getAttribute('data-topic'),'forest');
 assert.equal(await page.locator('[data-west-country]').inputValue(),'');
 assert(await page.locator('.west-sawnwood').isVisible());
 assert.equal(await page.locator('.west-sawnwood-panels>section').count(),3);
 assert.equal(await page.locator('.west-sawnwood-table tbody tr').count(),20);
 assert.equal(await page.locator('.west-sawnwood>details').evaluate(node=>node.open),false);
 assert.match(await page.locator('[data-west-forestry-reading]').innerText(),/9,425,000 m³.*0 m³.*1,697,646 m³/s);
 const capture=async(label)=>{
  await page.evaluate(()=>{window.scrollTo({top:0,left:0,behavior:'instant'});return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const map=await page.locator('[data-west-map]').boundingBox();
  const panel=await page.locator('.west-sawnwood').boundingBox();
  assert(map&&map.width>400&&map.height>250&&map.y>=0&&map.y<record.viewport.height);
  assert(panel&&panel.width>800);
  const file=label+'.jpg',bytes=await page.screenshot({path:path.join(output,file),type:'jpeg',quality:82,fullPage:true,animations:'disabled'});
  await page.locator('.west-sawnwood').evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert(await page.locator('.west-sawnwood').evaluate(node=>{
    const header=node.querySelector('h2').getBoundingClientRect(),first=node.querySelector('.west-sawnwood-panels li').getBoundingClientRect();
    return [header,first].every(box=>{const hit=document.elementFromPoint(box.x+4,box.y+box.height/2);return hit&&node.contains(hit);});
  }),'Forestry header or first flow row is covered by another panel');
  const statisticsFile=label+'-statistics.jpg',statisticsBytes=await page.locator('.west-sawnwood').screenshot({path:path.join(output,statisticsFile),type:'jpeg',quality:90,animations:'disabled'});
  const encoded=statisticsBytes.toString('base64');
  console.log('REVIEW_IMAGE_BEGIN '+JSON.stringify({file:statisticsFile,headSHA:record.headSHA,mime:'image/jpeg',sha256:createHash('sha256').update(statisticsBytes).digest('hex')}));
  for(let offset=0;offset<encoded.length;offset+=4096)console.log('REVIEW_IMAGE_CHUNK '+encoded.slice(offset,offset+4096));
  console.log('REVIEW_IMAGE_END');
  record.images.push({file,map,panel,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),statistics:{file:statisticsFile,bytes:statisticsBytes.length,sha256:createHash('sha256').update(statisticsBytes).digest('hex')}});
 };
 await capture('01-forest-overview');
 await page.locator('[data-west-country]').selectOption('SAU');await ready();
 assert.equal(await page.locator('[data-west-country]').inputValue(),'SAU');
 assert.match(await page.locator('.west-sawnwood-panels>section').first().innerText(),/サウジアラビア/);
 assert.match(await page.locator('.west-sawnwood-panels>section').nth(2).innerText(),/サウジアラビアの輸入量/);
 await capture('02-saudi-selected');
 assert.deepEqual(errors,[]);assert.deepEqual(failedResponses,[]);
 record.status='passed';console.log('REVIEW_METADATA '+JSON.stringify(record));
}catch(error){record.status='failed';record.error=error.stack??String(error);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'metadata.json'),JSON.stringify(record,null,2)+'\n');}
