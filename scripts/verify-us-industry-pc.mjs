import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const phase=process.env.US_REVIEW_PHASE??'after',dir=resolve(process.env.US_REVIEW_BUILD??'dist'),out=resolve('docs/review/us-industry-20261014');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let p=resolve(dir,new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal\//,''));if(!p.startsWith(dir+sep))throw Error('outside');if((await stat(p)).isDirectory())p=resolve(p,'index.html');res.writeHead(200,{'Content-Type':mime[extname(p)]??'application/octet-stream'});res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={phase,environment:'cloud Chromium, not user PC',baselineCommit:'63e998cc16e671230b3c1a9d0a95803e1d6d0545',records:[],operations:[],errors:[]};let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768},{width:1024,height:768}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  for(const field of ['agriculture','nature','industry','population']){
   const populationGeometry=field==='population'?page.waitForResponse(r=>r.url().endsWith('/population/v1/counties.geo.json')&&r.ok()):null;
   await page.goto(`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/${field}/`,{waitUntil:'networkidle'});
   if(populationGeometry){await (await populationGeometry).finished();await page.waitForTimeout(2000);}
   await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]')?.dataset.renderState==='ready',{timeout:30000});await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
   const data=await page.evaluate(()=>{const box=s=>{const n=document.querySelector(s);if(!n)return null;const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};const img=document.querySelector('[data-fallback-image]'),map=document.querySelector('[data-map-surface] canvas'),svg=document.querySelector('[data-us-map]');return {viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,scale:visualViewport.scale,scroll:{x:scrollX,y:scrollY},frame:box('[data-map-frame]'),reading:box('[data-us-industry] .us-industry-reading, [data-field-national]:not([hidden])'),statistics:box('#us-industry-statistics,[data-field-content]:not([hidden])'),canvas:map?{width:map.clientWidth,height:map.clientHeight}:null,svg:svg?.getAttribute('viewBox')??null,horizontalOverflow:document.documentElement.scrollWidth>innerWidth,labels:[...document.querySelectorAll('[data-us-map-industry]')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.usMapIndustry,x:r.x,y:r.y,right:r.right,bottom:r.bottom};})};});
   const file=`${phase}-${field}-${viewport.width}.jpg`;await page.screenshot({path:resolve(out,file),type:'jpeg',quality:78});report.records.push({field,file,...data});assert.equal(data.scale,1);assert.equal(data.horizontalOverflow,false,`${field}/${viewport.width}: overflow`);
   if(phase==='after'&&field==='industry'){
    assert.ok(Math.abs(data.frame.width/data.frame.height-5/3)<.01,`${viewport.width}: industry map aspect ratio`);
    const geometry=()=>page.locator('[data-us-overlay]').getAttribute('data-layout'),before=await geometry(),camera=await page.locator('[data-us-map]').getAttribute('viewBox');
    await page.locator('[data-us-map-industry="natural-gas"]').click();assert.equal(await geometry(),before);assert.equal(await page.locator('[data-us-map]').getAttribute('viewBox'),camera);assert.match(await page.locator('[data-us-title]').textContent(),/天然ガス/);
    await page.locator('[data-us-only]').check();assert.equal(await geometry(),before);await page.locator('[data-us-only]').uncheck();
    for(const sector of ['manufacturing','services','construction-real-estate']){
     await page.locator(`[data-us-sector="${sector}"]`).click();const labels=await page.locator('[data-us-map-industry]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.usMapIndustry,x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
     for(let i=0;i<labels.length;i++)for(const b of labels.slice(i+1)){const a=labels[i];assert.ok(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),`${viewport.width}/${sector}: ${a.id}/${b.id} overlap`);}
     await page.screenshot({path:resolve(out,`after-industry-${sector}-${viewport.width}.jpg`),type:'jpeg',quality:78});
     const key=await page.locator('nav[data-us-key]').innerText();assert.ok(key.length>0);
    }
    await page.locator('[data-us-sector="manufacturing"]').click();await page.locator('[data-us-key="chip-packaging"]').click();await page.reload({waitUntil:'networkidle'});await page.locator('[data-us-title]').filter({hasText:'半導体後工程'}).waitFor();
    await page.locator('[data-us-site-list]').evaluate(n=>n.parentElement.open=true);await page.locator('[data-us-site-option="rio-rancho-packaging"]').click();assert.match(await page.locator('[data-us-site-scope]').textContent(),/稼働/);
    await page.locator('[data-us-zoom="in"]').click();const zoomed=await page.locator('[data-us-map]').getAttribute('viewBox');await page.locator('[data-us-clear]').click();assert.equal(await page.locator('[data-us-map]').getAttribute('viewBox'),zoomed);await page.locator('[data-us-zoom="fit"]').click();assert.equal(await page.locator('[data-us-map]').getAttribute('viewBox'),'0 0 1000 600');
    report.operations.push({viewport:viewport.width,selectionFixed:true,onlyFixed:true,allSectors:true,reload:true,operatingVsPlanned:true,zoomAndReset:true});
   }
  }
  await context.close();
 }
 if(phase==='after'){
  const storyContext=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1,locale:'ja-JP'}),story=await storyContext.newPage();await story.goto(`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/industry/?sector=manufacturing&subsector=auto&popStory=detroit-migration`,{waitUntil:'networkidle'});await story.waitForURL('**/population/industry/**');await story.waitForFunction(()=>document.querySelector('[data-atlas-explorer]')?.dataset.popStoryActive==='detroit-migration'&&document.querySelectorAll('.population-story-outline').length===1);await story.locator('[data-pop-story-back]').click();await story.waitForFunction(()=>document.querySelector('[data-atlas-explorer]')?.dataset.field==='population'&&!document.querySelector('[data-atlas-explorer]')?.dataset.popStoryActive);report.populationContext={legacyUrlRedirect:true,sourceStory:true,countyOutline:true,returnToPopulation:true};await storyContext.close();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,locale:'ja-JP'}),page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/industry/`,{waitUntil:'networkidle'});await page.locator('[data-us-key="power"]').click();assert.match(await page.locator('[data-us-title]').textContent(),/電力/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(out,'after-industry-mobile.jpg'),type:'jpeg',quality:78});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}finally{
 await writeFile(resolve(out,`${phase}-report.json`),JSON.stringify(report,null,2)+'\n');
 // The existing authenticated Actions log reader is also an evidence transport.
 // This is generated review evidence, with no credential or permission changes.
 if(process.env.GITHUB_ACTIONS==='true'){
  console.log('US_REVIEW_REPORT '+JSON.stringify(report));
  for(const field of ['agriculture','nature','industry','population']){const file=`${phase}-${field}-1920.jpg`;try{console.log('US_REVIEW_IMAGE '+JSON.stringify({file,base64:(await readFile(resolve(out,file))).toString('base64')}));}catch{}}
  if(phase==='after'){const file='after-industry-manufacturing-1024.jpg';try{console.log('US_REVIEW_IMAGE '+JSON.stringify({file,base64:(await readFile(resolve(out,file))).toString('base64')}));}catch{}}
 }
 await browser?.close();await new Promise(r=>server.close(r));
}
