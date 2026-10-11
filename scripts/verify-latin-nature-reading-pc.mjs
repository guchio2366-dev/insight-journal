/** Exact-head, sandbox-on PC evidence at a fixed CSS viewport and scroll position. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import sharp from 'sharp';
const baseline=process.env.LATIN_READING_BASELINE==='1',output=process.env.LATIN_READING_OUTPUT??'/tmp/latin-nature-reading-review';
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,shots:[],checks:[],errors:[],failedRequests:[],result:'pending'};
if(process.env.LATIN_READING_EXPECTED_HEAD)assert.equal(report.commit,process.env.LATIN_READING_EXPECTED_HEAD);
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');let file=path.resolve('dist','.'+pathname);assert.ok(file.startsWith(path.resolve('dist')+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/insight-journal/atlas/latin-america/';let browser;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});report.browser={version:browser.version(),chromiumSandbox:true};
 for(const viewport of baseline?[{width:1920,height:1080}]:[{width:1920,height:1080},{width:390,height:844}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedRequests.push(r.url());});
  const ready=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('[data-latin-workspace]')?.dataset.layoutReady==='true');await page.evaluate(()=>scrollTo(0,0));};
  const go=async(route)=>{await page.goto(base+route,{waitUntil:'networkidle'});await ready();};
  const measure=()=>page.evaluate(()=>{const box=s=>{const el=[...document.querySelectorAll(s)].find(n=>n.getBoundingClientRect().width&&!n.closest('[hidden]'));if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{url:location.pathname+location.search,cssViewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualViewportScale:visualViewport.scale,browserZoomPercent:100,documentZoom:getComputedStyle(document.documentElement).zoom,scroll:{x:scrollX,y:scrollY},map:box('.latin-nature-map,.latin-agriculture-map'),reader:box('.latin-reading'),news:box('.atlas-news'),fields:box('.latin-fields'),nav:[...document.querySelectorAll('.latin-fields>a')].map(el=>({text:el.textContent.trim(),active:el.getAttribute('aria-current'),width:el.getBoundingClientRect().width,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})),overflow:document.documentElement.scrollWidth>innerWidth,activeSection:document.querySelector('[data-latin-workspace]')?.dataset.latinActiveSection};});
  const shot=async(name,scroll=0)=>{await page.mouse.move(0,0);await page.evaluate(y=>scrollTo(0,y),scroll);const meta=await measure();assert.deepEqual(meta.cssViewport,viewport);assert.equal(meta.dpr,1);assert.equal(meta.visualViewportScale,1);assert.equal(meta.overflow,false);assert.deepEqual(meta.scroll,{x:0,y:scroll});const file=`${baseline?'before':'after'}-${name}-${viewport.width}.png`,bytes=await page.screenshot({path:path.join(output,file),animations:'disabled'});report.shots.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),primary:viewport.width===1920,...meta});};
  const riverLabels=async()=>{if(baseline)return;const labels=await page.locator('[data-foundation-map=rivers] [data-foundation-river-label],[data-foundation-map=rivers] [data-foundation-annotation] text').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{text:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};}).filter(r=>r.w&&r.h));for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'River/place labels overlap: '+a.text+' / '+b.text);}report.checks.push({riverLabelCollisionCheck:true,url:page.url(),labels:labels.map(r=>r.text)});};
  for(const section of viewport.width===1920?['climate','rivers','rainfall','terrain','elevation','basins']:['climate','rainfall','terrain','elevation']){
   await go('nature/?section='+section+'&scope=all');
   if(!baseline&&section!=='basins'){
    const selector=section==='climate'?'[data-nature-map-host]':'[data-foundation-map='+section+']';assert.equal(await page.locator(selector+' svg').count(),1);
    if(section==='climate'){assert.equal(await page.locator('[data-climate-class]').count(),21);assert.ok((await page.locator(selector+' image').first().getAttribute('href')).endsWith('/latin-america-climate-v1/latin-america.png'));}
    if(section==='terrain'){assert.equal(await page.locator(selector+' [data-landform-area]').count(),8);assert.equal(await page.locator(selector+' image').count(),0);}
    if(section==='rainfall'){assert.ok(await page.locator(selector+' [data-foundation-annotation=isohyet]').count());assert.ok(await page.locator('[data-rainfall-piecewise-legend]').isVisible());}
    if(section==='elevation')assert.ok(await page.locator(selector+' [data-foundation-annotation=contour]').count());
    if(viewport.width===1920)assert.ok((await measure()).map.height>=500);
   }
   if(section==='basins')assert.ok(await page.locator('[data-latin-unavailable]').isVisible());
   if(!baseline&&section==='rivers'){for(const id of ['river-7','river-3'])assert.equal(await page.locator(`[data-foundation-river-label="${id}"]`).count(),1);await riverLabels();}
   await shot(section+'-all');
   if(viewport.width===1920&&['rivers','rainfall','terrain','elevation'].includes(section)){
    await page.selectOption('select[data-nature-scope]','central');await ready();if(section==='rivers')await riverLabels();await shot(section+'-central');
    await page.selectOption('select[data-nature-scope]','south');await ready();if(section==='rivers')await riverLabels();await shot(section+'-south');
    await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('select[data-nature-scope]').inputValue(),'south');assert.equal((await measure()).activeSection,section);report.checks.push({section,viewport,reload:true});
   }
  }
  if(viewport.width===1920){
   await go('nature/?section=elevation&scope=country&place=CHL');await shot('elevation-chile');
   await go('nature/?section=rivers&scope=south');const river=page.locator('[data-foundation-river]').filter({hasNot:page.locator('[aria-hidden=true]')}).first();
   if(!baseline){const id=await river.getAttribute('data-foundation-river');await river.focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).searchParams.get('river'),id);await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator(`[data-foundation-river="${id}"][aria-pressed=true]`).count(),1);report.checks.push({riverSelection:id,directReload:true});}
   await go('nature/');await page.locator('[data-latin-section=terrain]').click();await ready();assert.equal((await measure()).activeSection,'terrain');await page.goBack({waitUntil:'networkidle'});await ready();assert.equal((await measure()).activeSection,'climate');report.checks.push({normalTransitionAndBack:true});
   await go('agriculture/?layer=coff');await page.locator('.latin-statistics details').last().evaluate(el=>el.open=true);
   if(!baseline)assert.match(await page.locator('[data-latin-agriculture-stat-rows]').evaluate(el=>el.closest('table').querySelector('thead').textContent),/地図：アラビカ.*統計：生豆・全品種/);
   await shot('agriculture-coffee-statistics',1400);
   const header=await page.locator('[data-latin-agriculture-stat-rows]').evaluate(el=>{const r=el.closest('table').querySelector('thead').getBoundingClientRect();return {top:r.top,bottom:r.bottom};});assert.ok(header.top>=0&&header.bottom<=viewport.height,'Country statistics header must be visible in its separate fixed-scroll evidence');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.result=baseline?'baseline-recorded':'passed';
}catch(error){report.result='failed';report.failure=String(error);throw error;}
finally{
 for(const shot of report.shots){const bytes=await sharp(path.join(output,shot.file)).webp({quality:82}).toBuffer(),encoded=bytes.toString('base64');shot.preview={file:shot.file.replace(/\.png$/,'.webp'),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};await writeFile(path.join(output,shot.preview.file),bytes);for(let at=0;at<encoded.length;at+=48000)console.log('LATIN_NATURE_PREVIEW '+JSON.stringify({file:shot.preview.file,part:at/48000,total:Math.ceil(encoded.length/48000),base64:encoded.slice(at,at+48000)}));}
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('LATIN_NATURE_REPORT '+JSON.stringify(report));await browser?.close();await new Promise(r=>server.close(r));
}
