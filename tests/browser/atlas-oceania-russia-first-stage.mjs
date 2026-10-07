// Real production-build review. Reuses runner Chrome with its sandbox enabled.
// Only local built files are served; no sources or browsers are downloaded here.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const output=resolve(process.env.REGION_REVIEW_OUTPUT??'/tmp/oceania-russia-first-stage');
const farmingOnly=process.env.REGION_REVIEW_FARMING_ONLY==='1';
const regions=(process.env.REGION_REVIEW_REGIONS??'oceania,russia').split(',');
assert.ok(regions.length>0&&regions.every(region=>['oceania','russia'].includes(region)));
await mkdir(output,{recursive:true});
const directory=resolve('dist');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  assert.ok(pathname.startsWith('/insight-journal/'));
  pathname=pathname.slice('/insight-journal/'.length);if(pathname.endsWith('/'))pathname+='index.html';
  const file=resolve(directory,pathname);assert.ok(file.startsWith(directory+sep));
  const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(body);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Missing local built file');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/`;
const result={status:'running',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(resolve(directory,'_release.json'),'utf8')),sandbox:true,viewports:[],checks:[],screenshots:[],errors:[],requests:[]};
let browser;
try{
 if(process.env.REGION_REVIEW_EXPECTED_HEAD){assert.equal(result.head,process.env.REGION_REVIEW_EXPECTED_HEAD);assert.equal(result.build.commitSha,result.head);}
 browser=await chromium.launch({executablePath:process.env.REGION_REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 result.browser=browser.version();
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(base).origin){result.errors.push(`Unexpected external request: ${url.href}`);return route.abort();}
  const response=await route.fetch({maxRedirects:0});
  result.requests.push({path:url.pathname,status:response.status()});
  if(response.status()>=400)result.errors.push(`${response.status()} ${url.pathname}`);
  await route.fulfill({response});await response.dispose();
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>result.errors.push(error.message));
 const root=region=>page.locator(`[data-${region}-learning]`);
 const ready=async region=>{
  await page.waitForFunction(region=>document.querySelector(`[data-${region}-learning]`)?.dataset[region+'Ready']==='true',region);
  await page.evaluate(async()=>{
   await document.fonts.ready;
   await Promise.all([...document.querySelectorAll('[data-normal-view]:not([hidden]) image,[data-comparison-view]:not([hidden]) image')].map(el=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error('Built distribution image failed: '+el.getAttribute('href')));image.src=el.getAttribute('href');})));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
 };
 const open=async(region,field,search='')=>{await page.goto(`${base}atlas/${region}/${field}/${search}`,{waitUntil:'networkidle'});await ready(region);};
 const shot=async name=>{await page.screenshot({path:resolve(output,name+'.png'),fullPage:true});result.screenshots.push(name+'.png');};
 for(const width of [1536,1280,1024]){
  await page.setViewportSize({width,height:864});
  for(const region of regions){
   const dimensions=[];
   for(const field of farmingOnly?['agriculture']:['agriculture','nature','industry','population']){
    await open(region,field);
    const host=root(region),map=host.locator('[data-primary-map]'),frame=await map.locator('svg').first().getAttribute('viewBox');
    assert.equal(await host.locator('[data-place]').inputValue(),'all');
    assert.equal(new URL(page.url()).searchParams.get('scope'),'all');
    assert.ok((await host.locator('[data-theme-title]').textContent()).startsWith(region==='oceania'?'オセアニアの':'ロシアの'));
    assert.equal(await host.locator('[data-theme][aria-pressed=true]').count(),0);
    assert.equal(await host.locator('[data-primary-legend-spacer]').evaluate(el=>el.getBoundingClientRect().height),0);
    assert.ok(await host.locator('[data-primary-legend]').isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
    const bounds=await map.boundingBox();assert.ok(bounds.width>300&&bounds.height>=299);
    dimensions.push({field,width:bounds.width,height:bounds.height,frame});
    await shot(`${region}-${field}-${width}-overview`);
    if(farmingOnly){
     assert.equal(await host.locator('[data-layer]').inputValue(),'farming-all');
     const products=region==='russia'?['cattle','wheat']:['cacao','cattle','coconut','sheep','wheat'];
     const shown=async()=>[...new Set(await map.locator('[data-farming-product]').evaluateAll(elements=>elements.map(el=>el.dataset.farmingProduct)))].sort();
     assert.deepEqual(await shown(),products);
     assert.match(await host.locator('[data-explanation]').textContent(),/上位10/);
     const cattle=map.locator('[data-farming-product="cattle"][data-farming-mode="texture"]');
     const initialOpacity=Number(await cattle.getAttribute('opacity'));
     await host.locator('[data-layer]').selectOption('wheat');await ready(region);
     assert.deepEqual(await shown(),products);
     assert.ok(Number(await cattle.getAttribute('opacity'))<initialOpacity);
     assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     assert.equal(Number(await map.locator('[data-farming-product="wheat"][data-farming-mode="outline"]').getAttribute('opacity')),1);
     await shot(`${region}-agriculture-${width}-crop-focus`);
     await page.reload({waitUntil:'networkidle'});await ready(region);
     assert.equal(await host.locator('[data-layer]').inputValue(),'wheat');assert.deepEqual(await shown(),products);
     await host.locator('[data-layer]').selectOption('cattle');await ready(region);
     assert.deepEqual(await shown(),products);
     assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     assert.match(await host.locator('[data-farming-legend="cattle"] h3').textContent(),/頭／km²/);
     if(width===1536)await shot(`${region}-agriculture-${width}-livestock-focus`);
     await host.locator('[data-layer]').selectOption('farming-all');await ready(region);
    }
    const layer=await host.locator('[data-layer]').inputValue(),compare=await host.locator('[data-compare-layer]').inputValue();
    if(region==='oceania')await host.locator('[data-place]').selectOption('PNG');
    else await map.locator('[data-region-marker][data-map-place=far-east]').press('Enter');
    await ready(region);
    assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
    assert.equal(await host.locator('[data-layer]').inputValue(),layer);
    assert.equal(await host.locator('[data-compare-layer]').inputValue(),compare);
    if(region==='russia')assert.equal(await map.locator('[data-region-marker]').count(),3);
    if(region==='oceania'&&field==='industry'){
     assert.equal(await map.locator('circle[fill][stroke="#fff"]').count(),347);
     assert.ok(await map.locator('path[fill][stroke="#fff"]').count()>0);
    }
    if(width===1536)await shot(`${region}-${field}-selected-with-other-distributions`);
    await page.reload({waitUntil:'networkidle'});await ready(region);
    assert.equal(await host.locator('[data-layer]').inputValue(),layer);
    assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
    await host.locator('[data-place]').selectOption('all');await ready(region);
    assert.ok((await host.locator('[data-theme-title]').textContent()).startsWith(region==='oceania'?'オセアニアの':'ロシアの'));
   }
   for(const dimension of dimensions){assert.ok(Math.abs(dimension.width-dimensions[0].width)<2,`${region} field map widths agree`);assert.ok(Math.abs(dimension.height-dimensions[0].height)<2,`${region} field map heights agree`);}
   result.viewports.push({region,width,maps:dimensions});
  }
 }
 result.checks.push(farmingOnly?'Changed farming pages start with all saved crop/livestock products, full extent and overview. Product focus, country/keyboard region selection, reload and reset retain other distributions.':'All eight direct field routes start at full extent and overview without a selected country/region/theme.');
 result.checks.push(farmingOnly?'At 1536, 1280 and 1024px, crop focus keeps the full frame, strengthens its outline and makes livestock thinner. Both units and missing/zero keys remain visible.':'All four field map dimensions agree per region at 1536, 1280 and 1024px; hidden legend duplicates reserve no height.');
 await page.setViewportSize({width:1536,height:864});
 for(const region of regions){
  await open(region,'agriculture','?scope=all&layer=wheat&compare=cattle&view=comparison');
  const host=root(region),frame=await host.locator('[data-original-map] svg').first().getAttribute('viewBox');
  assert.equal(await host.locator('[data-comparison-map] svg').first().getAttribute('viewBox'),frame);
  assert.match(await host.locator('[data-original-unit]').textContent(),/ha/);assert.match(await host.locator('[data-comparison-unit]').textContent(),/頭/);
  await shot(`${region}-crop-livestock-comparison`);
 }
 // Existing US reference pages are captured, without claiming data completeness or exact inter-region geometry parity.
 for(const field of farmingOnly?[]:['agriculture','nature','industry','population']){
  await page.goto(`${base}atlas/north-america/${field}/`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await shot(`us-${field}-reference`);
 }
 result.checks.push(farmingOnly?'Farming overlays and focused comparison retain separate source units, true zero and missing; product availability is explicitly limited.':'Crop and livestock comparison uses the same extent and separate units.');
 assert.deepEqual(result.errors,[]);
 result.status='passed';console.log(JSON.stringify({status:result.status,head:result.head,checks:result.checks,viewports:result.viewports,screenshots:result.screenshots},null,2));
}catch(error){result.status='failed';result.failure=String(error);throw error;}
finally{await writeFile(resolve(output,'results.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));}
