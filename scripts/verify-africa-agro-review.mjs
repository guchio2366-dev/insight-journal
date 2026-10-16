import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from './lib/agro-review-identity.mjs';
/** Cloud-only review; retain Chromium's sandbox. No user PC connection. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const directory=resolve(process.env.AGRO_REVIEW_OUTPUT??process.env.AFRICA_AGRO_REVIEW_DIR??'docs/qa/africa-agro-statistics-20261016/browser');
await mkdir(directory,{recursive:true});
const dist=resolve('dist'),prefix='/insight-journal',mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.gz':'application/octet-stream'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');assert(url.pathname.startsWith(prefix+'/'));let file=resolve(dist,'.'+decodeURIComponent(url.pathname.slice(prefix.length)));assert(file.startsWith(dist+sep));if((await stat(file)).isDirectory())file=resolve(file,'index.html');res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const viewports=[{width:1896,height:996},{width:1280,height:665}],deviceScaleFactor=1.5;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sandbox:true,viewports,deviceScaleFactor,status:'running',cases:[],errors:[],forestStandaloneIntegration:'proposal only; shared component unchanged'};
for(const file of ['src/scripts/atlas-africa.ts','src/scripts/atlas-africa-agro-statistics.ts','src/styles/atlas-africa.css','src/data/atlas/africa-agro-marketing-year.json']){report.sources??={};report.sources[file]=createHash('sha256').update(await readFile(file)).digest('hex');}
const cases=[
 ['overview','?field=agriculture','overview'],
 ['region-coffee','?field=agriculture&crop=coffee&overview=0','custom'],
 ['east-cattle','?field=agriculture&topic=livestock&livestock=cattle&region=east&overview=0','custom'],
 ['south-africa-maize','?field=agriculture&crop=maize&place=ZAF&overview=0','custom'],
 ['egypt-maize','?field=agriculture&crop=maize&place=EGY&overview=0','custom'],
 ['nigeria-wheat','?field=agriculture&crop=wheat&place=NGA&overview=0','custom'],
 ['kenya-cattle','?field=agriculture&topic=livestock&livestock=cattle&place=KEN&overview=0','shared'],
 ['egypt-forestry-legacy-url','?field=agriculture&metric=AG.LND.FRST.ZS&topic=forestry&place=EGY&overview=0','shared']
];
let browser;
try{
 await verifyAgroReviewIdentity(report);browser=await chromium.launch({headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings'],executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium'});await verifyAgroBrowserSandbox(browser,report);
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,deviceScaleFactor,locale:'ja-JP',timezoneId:'UTC',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));page.on('requestfailed',request=>report.errors.push(request.url()+': '+request.failure()?.errorText));
  for(const [name,query,mode]of cases){
   await page.goto(`http://127.0.0.1:${server.address().port}${prefix}/atlas/africa/${query}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   if(name!=='egypt-forestry-legacy-url')await page.waitForFunction(()=>document.querySelector('[data-africa-atlas]')?.dataset.actualLayer==='true'&&document.querySelectorAll('[data-africa-commodity-layer]').length===9);
   const selector=mode==='custom'?'[data-africa-selected-agro]':mode==='shared'?'[data-agro-statistics]':'[data-africa-regional-statistics]',host=page.locator(selector);await host.waitFor({state:'visible'});
   if(mode==='shared')await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
   if(name==='east-cattle'){await host.locator('[data-africa-stat-series]').selectOption('cattle-milk');await host.locator('h2').filter({hasText:'生乳'}).waitFor();}
   if(name==='egypt-forestry-legacy-url')await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');
   const measured=await host.evaluate(element=>{const box=element.getBoundingClientRect(),map=document.querySelector('.africa-map-frame').getBoundingClientRect(),rail=document.querySelector('.atlas-news')?.getBoundingClientRect();return {box:{x:box.x,y:box.y,width:box.width},map:{x:map.x,y:map.y,width:map.width,height:map.height,bottom:map.bottom},rail:rail?{right:rail.right,width:rail.width}:null,columns:[...element.querySelectorAll('.agro-columns>section')].map(column=>{const rect=column.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width};}),overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:element.scrollWidth>element.clientWidth+1};});
   assert.equal(measured.overflow,false);assert.equal(measured.statisticsOverflow,false);assert.equal(measured.columns.length,3);assert(measured.columns.every(column=>Math.abs(column.y-measured.columns[0].y)<1));assert(measured.box.y>=measured.map.bottom-1);if(measured.rail?.width>0)assert(measured.box.x>=measured.rail.right-1);
   await page.screenshot({path:resolve(directory,`${name}-${viewport.width}-map.png`)});await host.screenshot({path:resolve(directory,`${name}-${viewport.width}-statistics.png`)});
   if(name==='south-africa-maize'){await host.locator('[data-africa-trade-reference] summary').click();assert.equal(await host.locator('.agro-partner-pie').count(),0);await host.screenshot({path:resolve(directory,`${name}-${viewport.width}-reference.png`)});}
   report.cases.push({name,viewport,deviceScaleFactor,measured});
  }
  await context.close();
 }
 assert.equal(report.errors.length,0);report.status='passed';
}catch(error){report.status='blocked-or-failed';report.errors.push(String(error));process.exitCode=1;}
finally{await browser?.close();await new Promise(done=>server.close(done));await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.length,report:resolve(directory,'report.json')}));}
