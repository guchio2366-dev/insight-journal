import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve('review-artifacts/latin-agro-20261016');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{let path=resolve(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));if(!path.startsWith(dist+sep))throw Error('outside dist');if((await stat(path)).isDirectory())path=resolve(path,'index.html');res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal`,base=origin+'/atlas/latin-america/agriculture/';
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='',sandbox:true,deviceScaleFactor:1.5,status:'running',cases:[],operations:[],errors:[]};
let browser;
async function ready(page){await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');}
function measure(el){
 const rect=el.getBoundingClientRect(),columns=[...el.querySelectorAll(':scope > [data-latin-calendar-flow]>section,:scope > [data-agro-marketing-year]>section')].map(c=>{const b=c.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,font:parseFloat(getComputedStyle(c.querySelector('p:not(.agro-meta)')??c).fontSize)};});
 const map=document.querySelector('[data-map-surface]')?.getBoundingClientRect();
 return {x:rect.x,y:rect.y,w:rect.width,columns,overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:el.scrollWidth>el.clientWidth+1,mapBottom:map?.bottom,deviceScaleFactor:devicePixelRatio};
}
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 report.browser=browser.version();
 for(const viewport of [{width:1896,height:996},{width:1280,height:665}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto(base,{waitUntil:'networkidle'});
  await page.screenshot({path:resolve(out,`${viewport.width}-agriculture-unselected.png`)});
  assert.equal(await page.locator('[data-latin-quantity-key]').count(),0);
  const baseline=await page.locator('[data-latin-agriculture-map]').getAttribute('viewBox');
  for(const code of ['ARG','PRY','BOL','BRA','URY']){
   await page.goto(base+`?layer=soyb&place=${code}&scope=all`,{waitUntil:'networkidle'});await ready(page);
   const marker=page.locator(`[data-latin-quantity-key="${code}:soyb"]`);await marker.waitFor();
   const primary=code==='BRA'?page.locator('[data-agro-marketing-year="2024/25"]'):marker;
   const metrics=code==='BRA'?await primary.evaluate(el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,columns:[...el.children].map(c=>{const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,font:parseFloat(getComputedStyle(c.querySelector('p:not(.agro-meta)')??c).fontSize)};}),overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:el.scrollWidth>el.clientWidth+1,mapBottom:document.querySelector('[data-map-surface]')?.getBoundingClientRect().bottom,deviceScaleFactor:devicePixelRatio};}):await marker.evaluate(measure);
   assert.equal(metrics.deviceScaleFactor,1.5);assert.equal(metrics.columns.length,3);
   assert.ok(Math.max(...metrics.columns.map(c=>c.y))-Math.min(...metrics.columns.map(c=>c.y))<2,'three columns on both specified screens');
   assert.ok(metrics.columns.every(c=>c.font>=13),'readable text');
   assert.equal(metrics.overflow,false,'page overflow');assert.equal(metrics.statisticsOverflow,false,'statistics overflow');
   assert.ok(metrics.y>=metrics.mapBottom-1,'statistics below existing map');
   assert.equal(await page.locator('[data-latin-agriculture-map]').getAttribute('viewBox'),baseline);
   await page.screenshot({path:resolve(out,`${viewport.width}-${code}-map.png`)});
   await primary.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-${code}-statistics.png`)});
   if(code==='PRY')assert.match(await marker.innerText(),/Argentina.*対象34国・地域内.*86.19%/s);
   if(code==='BRA'){assert.equal(await marker.locator('.latin-partner-track').count(),0);assert.match(await marker.innerText(),/販売年度の相手数量は未収録/);}
   if(code==='URY')assert.match(await marker.innerText(),/Free Zones/);
   report.cases.push({name:code,viewport,...metrics});
  }
  // Existing selectors and history return to the published unselected view.
  await page.locator('[data-latin-agriculture-layer="all"]').first().click();await ready(page);
  assert.equal(await page.locator('[data-latin-quantity-key]').count(),0);
  await page.goBack();await page.locator('[data-latin-quantity-key="URY:soyb"]').waitFor();
  report.operations.push({name:'overview-and-history',viewport,passed:true});
  // An untouched crop keeps the shared same-table marketing-year balance.
  await page.goto(base+'?layer=maiz&place=BRA&scope=all',{waitUntil:'networkidle'});await ready(page);
  assert.equal(await page.locator('[data-latin-quantity-key]').count(),0);
  assert.ok(await page.locator('[data-agro-marketing-year="2024/25"]').count());
  report.operations.push({name:'maize-preserved',viewport,passed:true});
  const forest=base+'forestry/';
  await page.goto(forest,{waitUntil:'networkidle'});assert.equal(await page.locator('[data-latin-forestry-statistics]').isVisible(),false);assert.equal(await page.locator('[data-latin-forestry-statistics] select').count(),0);
  await page.screenshot({path:resolve(out,`${viewport.width}-forest-unselected.png`)});
  await page.locator('button[data-forest-example="chile"]').click();
  const host=page.locator('[data-latin-forestry-statistics]');await host.waitFor();
  for(const product of ['roundwood','sawnwood','pulp']){
   await host.locator('select').selectOption(product);const flow=host.locator(`[data-latin-forest-flow="${product}"]`);await flow.waitFor();
   const metrics=await flow.evaluate(el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,columns:[...el.children].map(c=>{const r=c.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,font:parseFloat(getComputedStyle(c.querySelector('p:not(.agro-meta)')??c).fontSize)};}),overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:el.scrollWidth>el.clientWidth+1,mapBottom:document.querySelector('[data-map-surface]')?.getBoundingClientRect().bottom,deviceScaleFactor:devicePixelRatio};});
   assert.equal(metrics.columns.length,3);assert.ok(Math.max(...metrics.columns.map(c=>c.y))-Math.min(...metrics.columns.map(c=>c.y))<2);assert.ok(metrics.columns.every(c=>c.font>=13));assert.equal(metrics.statisticsOverflow,false);assert.equal(metrics.overflow,false);assert.ok(metrics.y>=metrics.mapBottom-1);
   await page.screenshot({path:resolve(out,`${viewport.width}-forest-${product}-map.png`)});
   await flow.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-forest-${product}-statistics.png`)});
   report.cases.push({name:'forest-'+product,viewport,...metrics});
  }
  await page.locator('button[data-forest-overview]').click();assert.equal(await host.isVisible(),false);assert.equal(await host.locator('select').count(),0);
  assert.equal(await page.locator('[data-agro-statistics]').isVisible(),true);
  await page.goto(forest+'?example=chile',{waitUntil:'networkidle'});await page.locator('[data-latin-forest-flow="roundwood"]').waitFor();
  report.operations.push({name:'forest-clear-and-url-restore',viewport,passed:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.equal(report.cases.length,16);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,operations:report.operations.length,errors:report.errors}));
