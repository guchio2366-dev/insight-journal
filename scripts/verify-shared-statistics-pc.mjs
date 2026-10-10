/** Serve only built local files; use installed Chromium with its sandbox enabled. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const directory=resolve('dist'),output=resolve(process.env.SHARED_STAT_REVIEW_OUTPUT??'/tmp/shared-statistics-pc'),compactOnly=process.env.SHARED_STAT_REVIEW_SCOPE==='asia-compact';
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let pathname=new URL(req.url,'http://localhost').pathname;assert.ok(pathname.startsWith('/insight-journal/'));pathname=decodeURIComponent(pathname.slice(17));if(pathname.endsWith('/'))pathname+='index.html';const file=resolve(directory,pathname);assert.ok(file.startsWith(directory+sep));const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,report={sandbox:true,scope:compactOnly?'asia-compact':'all',checks:[],screenshots:[],errors:[]};
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.SHARED_STAT_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 report.browser=browser.version();
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 if(!compactOnly){
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:1000});
  await page.goto(origin+'/insight-journal/atlas/russia/agriculture/',{waitUntil:'networkidle'});
  const panel=page.locator('[data-russia-forestry-statistics]');await panel.waitFor();
  assert.match(await panel.innerText(),/205,498,000/);assert.match(await panel.innerText(),/189百万t/);
  assert.equal(await panel.locator('svg').count(),3);
  await panel.locator('summary').first().click();assert.equal(await panel.locator('tbody tr').count(),30);
  const metrics=await panel.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,pageWidth:document.documentElement.clientWidth,pageScrollWidth:document.documentElement.scrollWidth}));
  assert.ok(metrics.scrollWidth<=metrics.width+1);assert.ok(metrics.pageScrollWidth<=metrics.pageWidth+1);
  await panel.screenshot({path:resolve(output,`russia-forestry-${width}.png`)});
  report.checks.push({case:'Russia forestry',width,metrics});report.screenshots.push(`russia-forestry-${width}.png`);
 }
 await page.setViewportSize({width:1440,height:1000});
 for(const width of [1440,1024,390]){
  await page.setViewportSize({width,height:1000});
  await page.goto(origin+'/insight-journal/atlas/oceania/agriculture/',{waitUntil:'networkidle'});
  const panel=page.locator('[data-oceania-livestock-production]');await panel.waitFor();
  assert.match(await panel.innerText(),/21,531,000/);assert.match(await panel.innerText(),/2.7％/);
  assert.equal(await panel.locator('tbody tr').count(),4);
  const metrics=await panel.evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,pageWidth:document.documentElement.clientWidth,pageScrollWidth:document.documentElement.scrollWidth}));
  assert.ok(metrics.scrollWidth<=metrics.width+1);assert.ok(metrics.pageScrollWidth<=metrics.pageWidth+1);
  await panel.screenshot({path:resolve(output,`oceania-production-${width}.png`)});
  report.checks.push({case:'Oceania cattle production',width,metrics});report.screenshots.push(`oceania-production-${width}.png`);
 }
 }
 for(const width of [1440,1024])for(const topic of ['forest','cattle']){
  await page.setViewportSize({width,height:1000});
  await page.goto(origin+`/insight-journal/atlas/asia/south-central-asia/agriculture/?topic=${topic}&place=IND`,{waitUntil:'networkidle'});
  const tables=page.locator('[data-farming-statistics-tables]'),history=tables.locator('.asia-stat-history');
  await tables.locator('.asia-stat-current').waitFor();
  assert.equal(await history.evaluate(el=>el.open),false,'raw years start closed');
  assert.equal(await tables.locator('.asia-stat-chart').count(),1,'one initial trend, selectable without extra scroll');
  assert.equal(await tables.locator('.asia-stat-current tbody tr').count(),topic==='forest'?7:2);
  assert.equal(await history.locator('tbody tr').count(),topic==='forest'?70:20,'available original years remain in the closed disclosure');
  assert.equal(await history.locator('tbody tr:visible').count(),0);
  assert.equal(await tables.locator('.asia-stat-trend-picker option').count(),topic==='forest'?7:2);
  if(topic==='forest'){
   assert.match(await tables.locator('.asia-stat-current').innerText(),/72,653 千ha/);
   assert.match(await tables.locator('.asia-stat-current').innerText(),/生産比の対象外/);
  }else{
   assert.match(await tables.locator('.asia-stat-current').innerText(),/194,753,479 頭/);
   assert.match(await tables.locator('.asia-stat-current').innerText(),/135,000,000 t/);
   assert.match(await tables.locator('.asia-stat-unavailable').innerText(),/資料上の欠測（M）/);
   assert.ok(!(await history.locator('caption').allTextContents()).some(text=>text.includes('牛肉')));
  }
  const panel=page.locator('.farming-statistics'),metrics=await panel.evaluate(el=>({height:el.getBoundingClientRect().height,width:el.clientWidth,scrollWidth:el.scrollWidth,pageWidth:document.documentElement.clientWidth,pageScrollWidth:document.documentElement.scrollWidth,currentFontSize:parseFloat(getComputedStyle(el.querySelector('.asia-stat-current')).fontSize)}));
  assert.ok(metrics.scrollWidth<=metrics.width+1);assert.ok(metrics.pageScrollWidth<=metrics.pageWidth+1);
  assert.ok(metrics.height<=(topic==='forest'?1200:850),`${topic} initial statistics height ${metrics.height}`);
  assert.ok(metrics.currentFontSize>=13,'current summary uses larger type than the original 11px year tables');
  const filename=`south-central-${topic}-${width}.png`;await panel.screenshot({path:resolve(output,filename)});report.screenshots.push(filename);
  const select=tables.locator('.asia-stat-trend-picker select');await select.selectOption(topic==='forest'?'6':'1');
  assert.match(await tables.locator('.asia-stat-chart').getAttribute('aria-label'),topic==='forest'?/製材の輸出量/:/牛の生乳/);
  if(topic==='cattle')assert.match(await tables.locator('.asia-stat-chart span').last().getAttribute('title'),/135,000,000 t/);
  await history.locator('summary').click();assert.equal(await history.locator('tbody tr:visible').count(),topic==='forest'?70:20);
  assert.match(await history.innerText(),/世界値・区分/);assert.match(await history.innerText(),/自給率ではありません/);
  if(topic==='cattle')assert.match(await history.innerText(),/牛肉.*2015–2024年.*資料上の欠測（M）/s);
  await history.locator('summary').click();assert.equal(await history.locator('tbody tr:visible').count(),0,'disclosure closes without changing the source tables');
  report.checks.push({case:'Asia compact national statistics',topic,place:'IND',width,metrics,retainedYearRows:topic==='forest'?70:20,trendSwitch:true,disclosureToggle:true});
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{await browser?.close();server.close();await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');}
