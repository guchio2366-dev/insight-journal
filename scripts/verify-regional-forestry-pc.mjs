/** Local built files only; use normally sandboxed preinstalled Chrome. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const output=process.env.FORESTRY_REVIEW_OUTPUT??'/tmp/regional-forestry-pc-review';
await mkdir(output,{recursive:true});
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewports:[],checks:[],errors:[],failedRequests:[]};
if(process.env.FORESTRY_REVIEW_EXPECTED_HEAD)assert.equal(report.commit,process.env.FORESTRY_REVIEW_EXPECTED_HEAD);
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');let file=path.resolve('dist','.'+pathname);assert.ok(file.startsWith(path.resolve('dist')+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/insight-journal';
let browser;
const save=()=>writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 report.browser={version:browser.version(),chromiumSandbox:true};
 for(const viewport of [{width:1536,height:864},{width:1920,height:1080}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.failedRequests.push(response.url());});
  for(const region of ['africa','latin-america','oceania','russia']){
   const route=base+`/atlas/${region}/agriculture/forestry/`;
   await page.goto(route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>document.querySelector('[data-regional-forestry]')?.dataset.forestInitialized==='true');
   if(['russia','oceania'].includes(region))await page.waitForFunction(()=>document.querySelector('[data-regional-forestry]')?.dataset.forestReferenceStatus==='ready');
   if(region==='russia')await page.waitForFunction(()=>document.querySelector('[data-regional-forestry]')?.dataset.forestRasterStatus==='ready');
   assert.equal(await page.locator('[data-forest-raster]').count(),region==='russia'?1:0);
   assert.equal(await page.locator('select').count(),0);
   const references=region==='russia'?2:region==='oceania'?1:0;assert.equal(await page.locator('[data-forest-reference]').count(),references);
   const config=await page.locator('[data-forest-config]').evaluate(element=>JSON.parse(element.textContent));
   const map=page.locator('[data-forest-map]'),camera=await map.getAttribute('viewBox'),locators=await page.locator('svg [data-forest-example]').count();
   const measure=await page.evaluate(()=>{const b=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {map:b('.forest-map-stage'),reading:b('.forest-reading'),overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(measure.overflow,false);assert.ok(measure.map.width>480&&measure.map.height>440);assert.ok(measure.reading.x>measure.map.x+measure.map.width-2);
   const shot=async suffix=>{const name=`${region}-${viewport.width}-${suffix}.png`,bytes=await page.screenshot({path:path.join(output,name),animations:'disabled',fullPage:true});return {file:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
   const initial=await shot('overview');
   for(const example of config.reading.examples){await page.locator(`button[data-forest-example="${example.id}"]`).click();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),example.title);assert.equal(await map.getAttribute('viewBox'),camera);assert.equal(await page.locator('svg [data-forest-example]').count(),locators);assert.equal(await page.locator('[data-forest-raster]').count(),region==='russia'?1:0);assert.equal(await page.locator('[data-forest-reference]').count(),references);}
   const selected=await shot('selected');
   await page.locator('[data-forest-zoom=in]').click();const zoomed=await map.getAttribute('viewBox');assert.notEqual(zoomed,camera);
   await page.locator('[data-forest-clear]').click();assert.equal(await map.getAttribute('viewBox'),zoomed);
   const first=config.reading.examples[0];await page.locator(`button[data-forest-example="${first.id}"]`).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-forest-reading-title]').textContent(),first.title);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-forest-reading-title]').textContent(),first.title);
   const restored=(await map.getAttribute('viewBox')).split(' ').map(Number),previous=zoomed.split(' ').map(Number);restored.forEach((value,index)=>assert.ok(Math.abs(value-previous[index])<.001));
   await map.focus();await page.keyboard.press('ArrowRight');assert.notEqual(await map.getAttribute('viewBox'),zoomed);
   await page.locator('[data-forest-reset]').click();assert.equal(await map.getAttribute('viewBox'),camera);assert.equal(await page.locator('[data-forest-clear]').isVisible(),false);
   await page.locator(`svg [data-forest-example="${first.id}"]`).click();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),first.title);
   report.viewports.push({region,viewport,...measure,locators,references,raster:region==='russia'?'western-Russia-only':'not-acquired',initial,selected});
  }
  await context.close();await save();
 }
 // The existing entry tabs lead to the module through actual user operations.
 const context=await browser.newContext({viewport:{width:1536,height:864},serviceWorkers:'block'});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const page=await context.newPage();
 for(const region of ['africa','latin-america','oceania','russia']){
  await page.goto(base+(region==='africa'?'/atlas/africa/?field=agriculture&topic=farming':`/atlas/${region}/agriculture/`),{waitUntil:'networkidle'});
  const control=region==='africa'?page.locator('[data-africa-topic="forestry"]'):page.getByRole('link',{name:'林業',exact:true});await control.click();await page.waitForURL(`**/atlas/${region}/agriculture/forestry/`);assert.equal(await page.locator('[data-regional-forestry]').getAttribute('data-region'),region);
 }
 report.checks.push('8 PC overview/selected views: no horizontal overflow, right reading alongside large map; all locators/raster retained on selection; zoom/clear/reset, keyboard, marker click and reload restore; 4 existing forestry entries');
 await context.close();assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.result='passed';await save();
 // Public local-site screenshots only. Optional readable previews also let the
 // authorized job-log reader inspect evidence when ZIP transfer is unavailable.
 if(process.env.FORESTRY_REVIEW_INLINE_PREVIEWS==='1'){
  const {default:sharp}=await import('sharp');
  for(const view of report.viewports)for(const shot of [view.initial,view.selected]){
   const bytes=await sharp(path.join(output,shot.file)).resize({width:1280,withoutEnlargement:true}).webp({quality:90}).toBuffer();
   const encoded=bytes.toString('base64'),name=shot.file.replace(/\.png$/,'.webp'),parts=Math.ceil(encoded.length/8192);
   console.log(`FORESTRY_VISUAL ${name} ${parts} ${crypto.createHash('sha256').update(bytes).digest('hex')}`);
   for(let part=0;part<parts;part++)console.log(`FORESTRY_VISUAL_PART ${name} ${part} ${encoded.slice(part*8192,(part+1)*8192)}`);
  }
  console.log(`FORESTRY_REPORT ${JSON.stringify(report)}`);
 }
}catch(error){report.result='failed';report.failure=error.stack;await save();throw error;}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
