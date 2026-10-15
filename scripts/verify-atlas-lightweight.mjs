/** Cold-cache loopback measurements and screenshots, with Chromium sandbox enabled.
 * Usage: ATLAS_QA_PHASE=before ATLAS_QA_DIST=/tmp/... node scripts/verify-atlas-lightweight.mjs
 * Raw HTTP is intentional: transferred bytes here are not production gzip/Brotli bytes.
 */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {chromium} from 'playwright';
const phase=process.env.ATLAS_QA_PHASE??'after',dist=path.resolve(process.env.ATLAS_QA_DIST??'dist');
const output=path.resolve(process.env.ATLAS_QA_OUTPUT??'/tmp/atlas-lightweight',phase);
await mkdir(output,{recursive:true});
const result={phase,conditions:'Cloud Chromium; sandbox enabled; fresh context per load; raw loopback HTTP; no throttling; three loads per route/viewport',runs:[],html:{},checks:[]};
const server=createServer(async(req,res)=>{try{
 let route=new URL(req.url,'http://local').pathname.replace(/^\/insight-journal/,'');if(route.endsWith('/'))route+='index.html';
 const file=path.resolve(dist,'.'+route);assert(file.startsWith(dist+'/'));
 const bytes=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(bytes);
}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.ATLAS_CHROMIUM_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true,env:{...process.env,XDG_CONFIG_HOME:'/tmp/insight-chromium-config',XDG_CACHE_HOME:'/tmp/insight-chromium-cache'},ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 result.browser=browser.version();
 for(const size of [{width:1896,height:996,dpr:1},{width:1280,height:665,dpr:1.5}]){
  for(const route of ['nature/','population/','agriculture/','mexico/population/','mexico/population/?view=density']){
   const html=await readFile(path.join(dist,'atlas/north-america',route.split('?')[0],'index.html'));
   result.html[route]={raw:html.length,gzip:gzipSync(html).length};
   for(let repeat=0;repeat<3;repeat++){
    const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('Network.enable');
    let transferred=0;cdp.on('Network.loadingFinished',e=>transferred+=e.encodedDataLength);
    await page.goto(origin+route,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>{const root=document.querySelector('[data-atlas-explorer]');return root?root.dataset.renderState==='ready':document.querySelector('[data-mexico-field=population]')?.dataset.populationReady==='1';});
    await page.waitForTimeout(1000);
    const state=await page.evaluate(()=>({render:document.querySelector('[data-atlas-explorer]')?.getAttribute('data-render-state'),population:document.querySelector('[data-mexico-field=population]')?.getAttribute('data-population-ready'),dpr:devicePixelRatio,scale:visualViewport.scale,resources:performance.getEntriesByType('resource').map(e=>({url:new URL(e.name).pathname,encoded:e.encodedBodySize})),navigation:performance.getEntriesByType('navigation')[0]?.toJSON()}));
    const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
    result.runs.push({route,size,repeat,transferred,taskDuration:metrics.TaskDuration,scriptDuration:metrics.ScriptDuration,layoutDuration:metrics.LayoutDuration,errors,...state});
    assert.deepEqual(errors,[]);assert.equal(state.scale,1);assert.equal(state.dpr,size.dpr);
    if(!route.startsWith('mexico'))assert.equal(state.render,'ready');else assert.equal(state.population,'1');
    if(repeat===0){
     const frame=page.locator(route.startsWith('mexico')?'[data-population-legacy-frame]':'[data-map-frame]');
     if(await frame.isVisible())await frame.screenshot({path:path.join(output,`${size.width}-${route.replaceAll(/[^a-z0-9]/g,'_')}.png`)});
     await page.screenshot({path:path.join(output,`${size.width}-${route.replaceAll(/[^a-z0-9]/g,'_')}-page.png`)});
    }
    if(phase==='after'){
     if(route==='nature/'||route==='population/')assert.equal(state.resources.filter(e=>/\/(agriculture.geojson|crop-labels.json)$/.test(e.url)).length,0);
     if(route.startsWith('mexico'))assert.equal(state.resources.filter(e=>/mexico-population-v1\/.*\.svg$/.test(e.url)).length,0);
    }
    await context.close();console.log(phase,size.width,route,repeat,transferred);
   }
  }
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr});
  const page=await context.newPage();
  const cases=[
   ['nature-crop','nature/?env=landform&crop=rice','[data-map-frame]'],
   ['agriculture-product','agriculture/?agriReading=product:rice&agriProduct=rice&crop=rice','[data-map-frame]'],
   ['agriculture-relation','agriculture/?relation=california-rice-water','[data-map-frame]'],
   ['mexico-selected','mexico/population/?view=density&state=20','[data-population-legacy-frame]'],
   ['mexico-religion','mexico/population/?category=religion&reading=overview','[data-population-overview-maps]'],
   ['mexico-isolated','mexico/population/?view=density&state=20&only=1','[data-population-legacy-frame]'],
   ['mexico-static','mexico/population/?view=density&state=20&fallback=1','[data-population-legacy-frame]'],
   ['canada-elevation','canada/nature/?view=elevation','[data-canada-natural-layer=elevation] .atlas-map-frame'],
  ];
  for(const [name,route,selector]of cases){
   await page.goto(origin+route,{waitUntil:'networkidle'});
   if(route.startsWith('canada'))await page.locator('[data-canada-natural-layer=elevation][data-canada-natural-paint=ready]').waitFor();
   else await page.waitForFunction(()=>{const root=document.querySelector('[data-atlas-explorer]');return root?root.dataset.renderState==='ready':document.querySelector('[data-mexico-field=population]')?.dataset.populationReady==='1';});
   await page.waitForTimeout(300);await page.locator(selector).screenshot({path:path.join(output,`${size.width}-${name}.png`)});
   if(name==='mexico-static')assert.equal(await page.locator('[data-population-fallback-image]').evaluate(n=>n.complete&&n.naturalWidth>0),true);
   if(name==='nature-crop')assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(e=>e.name.endsWith('/agriculture.geojson'))),true);
   if(name==='mexico-selected'){
    await page.locator('[data-population-state-shape="08"]').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).searchParams.get('state'),'08');
    await page.keyboard.press('Enter');assert.equal(new URL(page.url()).searchParams.get('state'),'08');
    for(let i=0;i<3&&new URL(page.url()).searchParams.get('state')!=='20';i++){await page.goBack();await page.waitForTimeout(50);}
    assert.equal(new URL(page.url()).searchParams.get('state'),'20');await page.goForward();await page.waitForFunction(()=>new URL(location.href).searchParams.get('state')==='08');
   }
   result.checks.push({size,name,status:'passed'});
  }
  if(phase==='after'){
   let release;const gate=new Promise(resolve=>release=resolve),requests=[];
   const track=request=>{if(/\/(agriculture.geojson|crop-labels.json)$/.test(request.url()))requests.push(request.url());};page.on('request',track);
   await page.route('**/crop-labels.json',async route=>{await gate;await route.continue();});
   await page.goto(origin+'nature/?env=landform&view=custom&lng=-100&lat=38&z=4',{waitUntil:'networkidle'});
   assert.equal(requests.length,0);await page.locator('[data-field=agriculture]').click();
   await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]').dataset.agricultureLoad==='loading');
   await page.locator('[data-field=natural]').click();release();
   await page.waitForFunction(()=>{const d=document.querySelector('[data-atlas-explorer]').dataset;return d.agricultureLoad==='ready'&&d.natureLoad==='ready';});
   assert.equal(await page.locator('[data-atlas-explorer]').getAttribute('data-field'),'natural');
   await page.locator('[data-field=agriculture]').click();await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]').dataset.renderState==='ready');
   assert.equal(requests.filter(url=>url.endsWith('/crop-labels.json')).length,1);assert.equal(requests.filter(url=>url.endsWith('/agriculture.geojson')).length,1);
   await page.goBack();await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]').dataset.field==='natural');
   await page.goForward();await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]').dataset.field==='agriculture');
   assert.equal(Number(new URL(page.url()).searchParams.get('lng')),-100);assert.equal(Number(new URL(page.url()).searchParams.get('lat')),38);assert.equal(Number(new URL(page.url()).searchParams.get('z')),4);
   await page.unroute('**/crop-labels.json');requests.length=0;let fail=true;
   await page.route('**/agriculture.geojson',route=>fail?route.fulfill({status:503,body:'retry test'}):route.continue());
   await page.goto(origin+'nature/',{waitUntil:'networkidle'});await page.locator('[data-field=agriculture]').click();
   await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]').dataset.agricultureLoad==='error');
   assert.equal(await page.locator('[data-fallback]').isVisible(),true);fail=false;await page.locator('[data-retry-nature]').click();
   await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]').dataset.agricultureLoad==='ready');
   assert.equal(requests.filter(url=>url.endsWith('/agriculture.geojson')).length,2);await page.unroute('**/agriculture.geojson');page.off('request',track);
   result.checks.push({size,name:'Delayed agriculture tab round trip, camera, browser back/forward, error and retry',status:'passed'});
  }
  await context.close();
  const noJS=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr,javaScriptEnabled:false});
  const staticPage=await noJS.newPage();await staticPage.goto(origin+'mexico/population/?view=density',{waitUntil:'networkidle'});
  assert.equal(await staticPage.locator('[data-population-state-shape]').count(),32);assert.equal(await staticPage.locator('[data-population-table]').getAttribute('open'),'');
  await staticPage.locator('[data-population-map]').screenshot({path:path.join(output,`${size.width}-mexico-nojs.png`)});
  await staticPage.emulateMedia({media:'print'});await staticPage.screenshot({path:path.join(output,`${size.width}-mexico-print.png`)});await noJS.close();
  result.checks.push({size,name:'Mexico without JavaScript and print',status:'passed'});
 }
 result.status='passed';
}catch(error){result.status='failed';result.error=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(path.join(output,'measurements.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));}
