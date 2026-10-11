// Read only: record the already published Japanese atlas at the primary viewport.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const site='https://guchio2366-dev.github.io/insight-journal';
const output='review-artifacts/japan';
await mkdir(output,{recursive:true});
const report={kind:'production-baseline',status:'running',viewport:{width:1920,height:1080},dpr:1,browserZoomPercent:100,chromiumSandbox:true,release:null,images:[],checks:[],errors:[],console:[]};
let browser,page;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 report.browser=browser.version();
 const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===site?route.continue():route.abort());
 report.release=await (await context.request.get(site+'/insight-journal/_release.json',{failOnStatusCode:true})).json();
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push({type:m.type(),message:m.text()});});
 const camera=async()=>JSON.parse(await page.locator('[data-japan-atlas]').getAttribute('data-map-camera'));
 const settle=async()=>{await page.waitForFunction(()=>document.querySelector('[data-japan-atlas]')?.dataset.mapReady==='true');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>{const r=document.querySelector('[data-japan-atlas]');return r.dataset.renderedTopic===r.dataset.field+':'+r.dataset.topic;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const shot=async name=>{await settle();const geometry=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualScale:visualViewport.scale,documentZoom:getComputedStyle(document.documentElement).zoom,overflow:document.documentElement.scrollWidth>innerWidth,map:document.querySelector('.japan-map-frame').getBoundingClientRect().toJSON(),reading:document.querySelector('.japan-reading').getBoundingClientRect().toJSON()}));assert.deepEqual(geometry.viewport,report.viewport);assert.equal(geometry.dpr,1);assert.equal(geometry.visualScale,1);assert.equal(geometry.overflow,false);const file='production-1920-'+name+'.jpg';await page.mouse.move(0,0);await page.screenshot({path:output+'/'+file,type:'jpeg',quality:90,animations:'disabled'});report.images.push({file,geometry,camera:await camera()});};
 for(const field of ['agriculture','nature','industry','population']){
  await page.goto(site+'/insight-journal/atlas/japan/'+field+'/',{waitUntil:'networkidle'});await shot(field);
  if(field==='nature'){const before=await camera();await page.locator('[data-japan-climate-city]').selectOption('tokyo');await shot('tokyo-climate');assert.deepEqual(await camera(),before);await page.reload({waitUntil:'networkidle'});await settle();assert.equal(await page.locator('[data-japan-climate-city]').inputValue(),'tokyo');report.checks.push('Production Tokyo: real camera unchanged and selected city restored after reload');}
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;}
finally{await writeFile(output+'/production-baseline.json',JSON.stringify(report,null,2)+'\n');await browser?.close();}
