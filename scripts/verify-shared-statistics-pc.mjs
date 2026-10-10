/** Serve only built local files; use installed Chromium with its sandbox enabled. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const directory=resolve('dist'),output=resolve(process.env.SHARED_STAT_REVIEW_OUTPUT??'/tmp/shared-statistics-pc');
await mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let pathname=new URL(req.url,'http://localhost').pathname;assert.ok(pathname.startsWith('/insight-journal/'));pathname=decodeURIComponent(pathname.slice(17));if(pathname.endsWith('/'))pathname+='index.html';const file=resolve(directory,pathname);assert.ok(file.startsWith(directory+sep));const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,report={sandbox:true,checks:[],screenshots:[],errors:[]};
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.SHARED_STAT_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 report.browser=browser.version();
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
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
 for(const [topic,place,expected] of [['forest','IND','製材の輸入量'],['cattle','IND','牛の生乳の生産量']]){
  await page.goto(origin+`/insight-journal/atlas/asia/south-central-asia/agriculture/?topic=${topic}&place=${place}`,{waitUntil:'networkidle'});
  const tables=page.locator('[data-farming-statistics-tables]');await tables.getByText(expected,{exact:false}).first().waitFor();
  assert.match(await tables.innerText(),/世界値・区分/);
  await tables.screenshot({path:resolve(output,`south-central-${topic}-1440.png`)});
  report.checks.push({case:'Asia national table',topic,place,width:1440});report.screenshots.push(`south-central-${topic}-1440.png`);
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{await browser?.close();server.close();await writeFile(resolve(output,'verification.json'),JSON.stringify(report,null,2)+'\n');}
