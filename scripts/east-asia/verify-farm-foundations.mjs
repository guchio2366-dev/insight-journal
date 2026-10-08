#!/usr/bin/env node
/** Focused real-browser review of the built East Asia farm foundation reading. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist'),out=resolve('review-artifacts/east-asia-farm-foundations');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),sub=url.pathname.replace(/^\/insight-journal\//,'');if(sub.includes('..'))throw Error('invalid path');const name=join(root,sub.endsWith('/')?sub+'index.html':sub),body=await readFile(name);res.writeHead(200,{'content-type':mime[extname(name)]??'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}/insight-journal`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
try{
 await mkdir(out,{recursive:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin)return route.abort();return route.continue();});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/atlas/north-america/agriculture/',{waitUntil:'domcontentloaded'});await page.screenshot({path:join(out,'us-agriculture-pc.png')});
 await page.goto(base+'/atlas/asia/east-asia/agriculture/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
 const section=page.locator('[data-east-farm-foundations]');await section.waitFor({state:'visible'});
 assert.match(await section.textContent(),/4対象の丸太生産量/);assert.equal(await section.locator('[data-east-world-share] .east-bar').count(),4);
 await page.screenshot({path:join(out,'east-overview-pc.png'),fullPage:true});
 await page.goto(base+'/atlas/asia/east-asia/agriculture/?topic=forest&place=TWN',{waitUntil:'domcontentloaded'});await section.waitFor({state:'visible'});
 await page.waitForLoadState('networkidle');
 assert.match(await section.locator('[data-east-world-share]').textContent(),/未掲載.*公表0とは異なります/);
 assert.match(await section.locator('[data-east-export-partners]').textContent(),/全商品輸出先.*丸太・製材の輸出先/);
 assert.equal(await page.locator('[data-country-select]').inputValue(),'TWN');
 await page.screenshot({path:join(out,'east-taiwan-forest-pc.png'),fullPage:true});
 await page.reload({waitUntil:'domcontentloaded'});await section.waitFor({state:'visible'});assert.equal(await page.locator('[data-country-select]').inputValue(),'TWN');
 const before=new URL(page.url());await page.locator('[data-farming-panel] [data-compare="industry"]').click();await page.locator('[data-comparison-back]').click();await section.waitFor({state:'visible'});const restored=new URL(page.url());for(const key of ['topic','place','at'])assert.equal(restored.searchParams.get(key),before.searchParams.get(key));
 await page.goto(base+'/atlas/asia/east-asia/agriculture/?topic=wheat&place=JPN',{waitUntil:'domcontentloaded'});await section.waitFor({state:'visible'});
 assert.match(await section.locator('[data-east-supply-title]').textContent(),/小麦の生産・商品貿易/);
 assert.match(await section.locator('[data-east-forest-flows]').textContent(),/2024年.*2023年.*名目米ドル/);
 assert.match(await section.locator('[data-east-world-share]').textContent(),/小麦生産量/);
 assert.equal(await section.locator('[data-east-world-share] tbody tr').count(),10);
 await section.screenshot({path:join(out,'east-japan-wheat-pc.png')});
 assert.deepEqual(errors,[]);
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});await mobile.route('**/*',route=>{if(new URL(route.request().url()).origin!==new URL(base).origin)return route.abort();return route.continue();});await mobile.goto(base+'/atlas/asia/east-asia/agriculture/?topic=forest&place=TWN',{waitUntil:'domcontentloaded'});await mobile.locator('[data-east-farm-foundations]').waitFor({state:'visible'});await mobile.waitForLoadState('networkidle');assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.locator('[data-east-farm-foundations]').screenshot({path:join(out,'east-taiwan-forest-mobile.png')});
 console.log(JSON.stringify({status:'passed',images:['us-agriculture-pc.png','east-overview-pc.png','east-taiwan-forest-pc.png','east-japan-wheat-pc.png','east-taiwan-forest-mobile.png'],scope:'local production build; external requests blocked'},null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
