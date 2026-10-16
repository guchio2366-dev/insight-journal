import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from './lib/agro-review-identity.mjs';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

// This runner always retains Chromium's sandbox and uses only the cloud build.
const out=resolve(process.env.AGRO_REVIEW_OUTPUT??process.env.SOUTHEAST_AGRO_REVIEW_OUT??'/tmp/southeast-agro-review'),dist=resolve('dist');
await mkdir(out,{recursive:true});
const viewports=[{width:1896,height:996},{width:1280,height:665}];
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sandbox:true,deviceScaleFactor:1.5,requestedViewports:viewports,status:'running',cases:[],errors:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let p=resolve(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));if(!p.startsWith(dist+sep))throw Error('outside build');if((await stat(p)).isDirectory())p=resolve(p,'index.html');res.writeHead(200,{'Content-Type':mime[extname(p)]??'application/octet-stream'});res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
let browser,stage='preflight';
try{

 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 stage='browser-launch';
 await verifyAgroReviewIdentity(report);browser=await chromium.launch({executablePath:process.env.SOUTHEAST_AGRO_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});await verifyAgroBrowserSandbox(browser,report);
 stage='page-checks';
 const origin=`http://127.0.0.1:${server.address().port}`;
 for(const viewport of viewports){
  const page=await browser.newPage({viewport,deviceScaleFactor:1.5,serviceWorkers:'block'});page.setDefaultTimeout(25000);
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
  const host=page.locator('[data-southeast-agro-statistics]');
  const ready=async topic=>{await page.waitForFunction(t=>document.querySelector('[data-asia-atlas]')?.dataset.southeastFarmTopic===t&&document.querySelector('[data-southeast-agro-statistics]')?.getAttribute('aria-busy')!=='true'&&document.querySelector('[data-southeast-agro-statistics]')?.dataset.ready==='true',topic);};
  for(const topic of ['rice','oilpalm','robusta','cattle','chicken','forest']){
   await page.goto(`${origin}/insight-journal/atlas/asia/southeast-asia/agriculture/?topic=${topic}`,{waitUntil:'networkidle'});
   await ready(topic);await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
   assert.equal(await host.isVisible(),true);
   const measure=await host.evaluate(el=>{const r=el.getBoundingClientRect(),map=document.querySelector('.asia-map-frame').getBoundingClientRect(),news=document.querySelector('.atlas-news').getBoundingClientRect();return {y:r.y,mapBottom:map.bottom,mapWidth:map.width,newsRight:news.right,x:r.x,width:r.width,overflow:el.scrollWidth>el.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,stages:[...el.querySelectorAll('.agro-columns>section')].map(n=>({stage:n.dataset.agroStage,y:n.getBoundingClientRect().y,font:parseFloat(getComputedStyle(n.querySelector(':scope>p:not(.agro-meta)')??n).fontSize),metadataFonts:[...n.querySelectorAll(':scope>p.agro-meta')].map(p=>parseFloat(getComputedStyle(p).fontSize))}))};});
   assert.equal(measure.overflow,false);assert.equal(measure.pageOverflow,false);assert.ok(measure.y>=measure.mapBottom-1);assert.ok(measure.x>=measure.newsRight-1);assert.ok(measure.mapWidth>350);
   assert.deepEqual(measure.stages.map(s=>s.stage),['production','use','destinations']);assert.ok(measure.stages.every(s=>s.font>=14));assert.ok(measure.stages.every(s=>s.metadataFonts.every(font=>font>=12)));assert.ok(Math.max(...measure.stages.map(s=>s.y))-Math.min(...measure.stages.map(s=>s.y))<2);
   await page.screenshot({path:resolve(out,`${viewport.width}-${topic}-map.png`)});await host.scrollIntoViewIfNeeded();await host.screenshot({path:resolve(out,`${viewport.width}-${topic}-statistics.png`)});
   if(topic==='rice'){
    await host.locator('[data-southeast-agro-country]').selectOption('VNM');await page.waitForFunction(()=>document.querySelector('[data-southeast-agro-statistics]')?.textContent.includes('26.85'));
    assert.match(await host.innerText(),/2024\/25.*26\.85.*22\.3/s);
    await host.locator('.southeast-agro-reference>summary').click();assert.match(await host.innerText(),/2023暦年.*HS1006/s);
    await host.screenshot({path:resolve(out,`${viewport.width}-rice-vietnam.png`)});
   }
   if(topic==='forest'){
    for(const id of ['sawnwood-production','wood-pulp-production']){
     await host.locator('[data-southeast-agro-series]').selectOption(id);await page.waitForFunction(()=>document.querySelector('[data-southeast-agro-statistics]')?.getAttribute('aria-busy')!=='true');
     if(id==='wood-pulp-production')assert.equal(await host.locator('.agro-world-pie,.agro-band').count(),0);
    }
   }
   report.cases.push({viewport,topic,...measure});
  }
  await page.locator('[data-farm-choice="overview"]').click();await host.waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-south-central-farm-connections]').isVisible(),true);
  await page.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status=stage==='browser-launch'?'blocked-browser-launch':'failed';report.errors.push(error.message);process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,report:resolve(out,'report.json'),cases:report.cases.length}));}
