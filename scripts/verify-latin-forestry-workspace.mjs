/** Built local files only. The baseline mode records main without claiming a pass. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const baseline=process.env.LATIN_FORESTRY_BASELINE==='1';
const output=process.env.LATIN_FORESTRY_OUTPUT??'/tmp/latin-forestry-workspace-review';
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,viewports:[],otherRegions:[],errors:[],failedRequests:[]};
if(process.env.LATIN_FORESTRY_EXPECTED_HEAD)assert.equal(report.commit,process.env.LATIN_FORESTRY_EXPECTED_HEAD);
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');let file=path.resolve('dist','.'+pathname);assert.ok(file.startsWith(path.resolve('dist')+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/insight-journal';
let browser;
const save=()=>writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 report.browser={version:browser.version(),chromiumSandbox:true};
 for(const viewport of [{width:1920,height:1080},{width:1024,height:768}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.failedRequests.push(response.url());});
  const ready=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('[data-regional-forestry]')?.dataset.forestInitialized==='true'||document.querySelector('[data-latin-workspace]')?.dataset.layoutReady==='true');await page.evaluate(()=>scrollTo(0,0));};
  const measure=()=>page.evaluate(()=>{
   const box=element=>{if(!element)return null;const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
   const b=selector=>box(document.querySelector(selector)),style=element=>{const s=getComputedStyle(element);return {fontSize:s.fontSize,fontWeight:s.fontWeight,color:s.color,background:s.backgroundColor,borderRadius:s.borderRadius,padding:s.padding};};
   const nav=document.querySelector('.latin-fields,.forest-fields');
   return {cssViewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualViewportScale:visualViewport.scale,browserZoomPercent:100,scroll:{x:scrollX,y:scrollY},news:b('.atlas-news'),fields:box(nav),fieldLinks:[...nav.children].map(el=>({text:el.textContent.trim(),active:el.getAttribute('aria-current'),box:box(el),style:style(el)})),subfields:b('.latin-agriculture-subfields,.forest-subfields'),subfieldLinks:[...document.querySelectorAll('.latin-agriculture-subfields>*:not(script),.forest-subfields>a')].map(el=>({text:el.textContent.trim(),active:el.getAttribute('aria-current')==='page'||el.getAttribute('aria-pressed')==='true',box:box(el),style:style(el)})),map:b('.forest-map-stage,.latin-agriculture-map'),reading:b('.latin-reading,.forest-reading'),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  const shot=async(name)=>{const file=`${name}-${viewport.width}.png`,bytes=await page.screenshot({path:path.join(output,file),animations:'disabled',fullPage:false});return {file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),imagePixels:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)}};};
  await page.goto(base+'/atlas/latin-america/agriculture/',{waitUntil:'networkidle'});await ready();
  const agriculture=await measure(),agricultureImage=await shot('agriculture');
  await page.getByRole('link',{name:'林業',exact:true}).click();await page.waitForURL('**/agriculture/forestry/**');await ready();
  const forestry=await measure(),forestryImage=await shot('forestry');
  report.viewports.push({viewport,primary:viewport.width===1920,agriculture,forestry,agricultureImage,forestryImage});await save();
  if(!baseline){
   const assertCommon=(a,b)=>{for(const key of ['cssViewport','dpr','visualViewportScale','scroll','news','fields','fieldLinks','map','reading','subfields'])assert.deepEqual(a[key],b[key],`Common ${key} changed at ${viewport.width}`);assert.deepEqual(b.fieldLinks.map(el=>el.text),['概要','農林業','自然環境','主要産業','人口']);assert.deepEqual(b.subfieldLinks.map(el=>el.text),['農畜産','林業']);assert.deepEqual(b.subfieldLinks.map(el=>el.active),[false,true]);assert.equal(b.overflow,false);};
   assertCommon(agriculture,forestry);
   await page.goBack({waitUntil:'networkidle'});await ready();assert.deepEqual(await measure(),agriculture);
   await page.goForward({waitUntil:'networkidle'});await ready();assertCommon(agriculture,await measure());
   await page.getByRole('link',{name:'農畜産',exact:true}).click();await page.waitForURL('**/agriculture/**');await ready();assert.deepEqual(await measure(),agriculture);
   await page.goto(base+'/atlas/latin-america/agriculture/forestry/?example=amazon',{waitUntil:'networkidle'});await ready();assertCommon(agriculture,await measure());
   const config=await page.locator('[data-forest-config]').evaluate(el=>JSON.parse(el.textContent));
   await page.goto(base+`/atlas/latin-america/agriculture/forestry/?example=${config.reading.examples[0].id}`,{waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),config.reading.examples[0].title);assertCommon(agriculture,await measure());
   await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),config.reading.examples[0].title);assertCommon(agriculture,await measure());
   await page.locator('[data-forest-clear]').click();await page.evaluate(()=>scrollTo(0,0));assertCommon(agriculture,await measure());
   const selectedImage=await shot('forestry-restored');report.viewports.at(-1).selectedImage=selectedImage;
  }
  if(viewport.width===1920)for(const region of ['africa','oceania','russia']){
   await page.goto(base+`/atlas/${region}/agriculture/forestry/`,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('[data-regional-forestry]')?.dataset.forestInitialized==='true');await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo(0,0));
   const layout=await page.evaluate(()=>{const b=s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {news:b('.atlas-news'),fields:b('.forest-fields'),map:b('.forest-map-stage'),reading:b('.forest-reading')};});
   report.otherRegions.push({region,layout,image:await shot(region+'-forestry')});
  }
  await context.close();await save();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.result=baseline?'baseline-recorded':'passed';await save();
}catch(error){report.result='failed';report.failure=error.stack;await save();throw error;}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
