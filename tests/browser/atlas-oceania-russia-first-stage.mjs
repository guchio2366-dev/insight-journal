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
const representativeOnly=process.env.REGION_REVIEW_REPRESENTATIVE_ONLY==='1';
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
 const shot=async name=>{if(representativeOnly&&!/^russia-agriculture-(1536|1024)-(overview|crop-focus)$/.test(name))return;await page.screenshot({path:resolve(output,name+'.png'),fullPage:true});result.screenshots.push(name+'.png');};
 for(const width of representativeOnly?[1536,1024]:[1536,1280,1024]){
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
     if(region==='russia'){
      const legend=host.locator('[data-primary-legend]'),key=host.locator('[data-key-legend]'),reading=host.locator('.russia-learning-reading');
      assert.equal(await key.evaluate(el=>!!el.closest('.russia-learning-map-panel')),true,'Legend belongs to the map panel');
      assert.equal(await reading.locator('[data-primary-legend]').count(),0,'Right reading is free of the map legend');
      assert.ok((await key.boundingBox()).y>=bounds.y+bounds.height-1,'Legend sits below the map');
      assert.ok(await host.locator('[data-geography-reading]').isVisible(),'Geographical explanation is visible initially');
      assert.equal(await host.locator('[data-explanation]').isVisible(),false,'Technical reading is folded initially');
      assert.match(await host.locator('[data-takeaway]').textContent(),/ロストフ.*オムスク.*ヤクーツク/);
      assert.match(await host.locator('[data-geography-reading]').textContent(),/生育期.*飼料.*肉・乳/);
      assert.equal(await legend.locator('[data-farming-key]').count(),2);assert.equal(await legend.locator('[data-farming-legend]').count(),0);
      assert.ok((await key.boundingBox()).height<130,'Compact key and closed detail stay short');
      assert.equal(await host.locator('[data-primary-legend-definitions]').isVisible(),false);
      assert.equal(await host.locator('[data-region-option]').count(),0);assert.equal(await map.locator('[data-region-marker]').count(),0);
      assert.equal(await host.locator('[data-place]').count(),1,'One primary region control');
      const regionControl=await host.locator('[data-place]').boundingBox(),layerControl=await host.locator('[data-layer]').boundingBox();
      assert.ok(regionControl.y<bounds.y&&layerControl.y<bounds.y,'Primary controls are above the map');
      assert.ok(regionControl.x<(await reading.boundingBox()).x,'Region control is in the left workspace');
      const places=map.locator('[data-farming-place]');assert.equal(await places.count(),4);
      assert.equal(await places.locator('text').filter({hasText:'小麦｜'}).count(),2);assert.equal(await places.locator('text').filter({hasText:'牛｜'}).count(),2);
      const labels=await places.locator('rect').evaluateAll(elements=>elements.map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
      for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(labels[i].x+labels[i].width<=labels[j].x||labels[j].x+labels[j].width<=labels[i].x||labels[i].y+labels[i].height<=labels[j].y||labels[j].y+labels[j].height<=labels[i].y,'Farming names do not overlap');
      const legendDetails=host.locator('[data-climate-dictionary]');await legendDetails.locator('summary').click();
      assert.ok(await host.locator('[data-primary-legend-definitions]').isVisible());assert.match(await legendDetails.textContent(),/牛の有効0は点を描きません/);
      assert.equal(await legendDetails.locator('[data-farming-legend="cattle"] > div > span').count(),6);
      await legendDetails.locator('summary').click();
      const readingDetails=host.locator('.russia-learning-explanation');await readingDetails.locator('summary').click();
      assert.ok(await host.locator('[data-explanation]').isVisible());assert.ok(await host.locator('[data-coverage]').isVisible());
      for(const selector of ['.russia-learning-reading','.russia-reading-scroll','.russia-learning-coverage']){
       const geometry=await host.locator(selector).evaluate(el=>({maxHeight:getComputedStyle(el).maxHeight,overflow:getComputedStyle(el).overflowY,client:el.clientHeight,scroll:el.scrollHeight}));
       assert.equal(geometry.maxHeight,'none',`${selector} has no height cap`);assert.equal(geometry.overflow,'visible');
       assert.ok(geometry.scroll<=geometry.client+1,`${selector} retains the full text`);
      }
      await readingDetails.locator('summary').click();
      assert.equal(await map.locator('[data-farming-product="cattle"][data-farming-mode="missing"] rect[mask]').count(),1);
     }
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
     assert.match(await host.locator('[data-primary-legend-definitions] [data-farming-legend="cattle"] h3').textContent(),/頭／km²/);
     if(width===1536)await shot(`${region}-agriculture-${width}-livestock-focus`);
     await host.locator('[data-layer]').selectOption('farming-all');await ready(region);
    }
    const layer=await host.locator('[data-layer]').inputValue(),compare=await host.locator('[data-compare-layer]').inputValue();
    if(region==='oceania')await host.locator('[data-place]').selectOption('PNG');
    else if(field==='agriculture'){await host.locator('[data-place]').focus();await host.locator('[data-place]').press('End');}
    else await map.locator('[data-region-marker][data-map-place=far-east]').press('Enter');
    await ready(region);
    assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
    assert.equal(await host.locator('[data-layer]').inputValue(),layer);
    assert.equal(await host.locator('[data-compare-layer]').inputValue(),compare);
    if(region==='russia'){
     if(field==='agriculture'){
      assert.equal(await host.locator('[data-place]').inputValue(),'far-east');assert.equal(await map.locator('[data-region-marker]').count(),0);
      assert.equal(await host.locator('[data-place]').evaluate(el=>document.activeElement===el),true,'Native keyboard region focus survives redraw');
     }else{
      assert.equal(await map.locator('[data-region-marker]').count(),3);
      assert.equal(await map.locator('[data-region-marker][data-map-place=far-east]').evaluate(el=>document.activeElement===el),true,'Keyboard focus survives redraw');
     }
    }
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
 result.checks.push(farmingOnly?'Changed farming pages start with all saved crop/livestock products, full extent and overview. Product focus, country/native keyboard region selection, reload and reset retain other distributions.':'All eight direct field routes start at full extent and overview without a selected country/region/theme.');
 result.checks.push(farmingOnly?'At the requested PC widths, crop focus keeps the full frame, strengthens its outline and makes livestock thinner. Both units and missing/zero keys remain visible.':'All four field map dimensions agree per region at 1536, 1280 and 1024px; hidden legend duplicates reserve no height.');
 if(farmingOnly&&regions.includes('russia'))result.checks.push('Russia has source-backed crop/cattle names in the map, one left region control, a compact two-product key below the map, visible geographical reading and folded full technical/quantity information. Native keyboard focus and product retention pass.');
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
