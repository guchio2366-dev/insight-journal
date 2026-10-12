/** Exact-head desktop industry review, with the ordinary Chrome sandbox. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import sharp from 'sharp';
const baseline=process.env.LATIN_INDUSTRY_BASELINE==='1';
const output=process.env.LATIN_INDUSTRY_OUTPUT??'/tmp/latin-industry-review';
const data=baseline?{industries:[],sites:[]}:JSON.parse(await readFile('src/data/atlas/latin-america/industry-sectors.json','utf8'));
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,viewports:[],shots:[],errors:[],failedRequests:[],coverage:{industries:data.industries.length,sites:data.sites.length}};
if(process.env.LATIN_REVIEW_EXPECTED_HEAD)assert.equal(report.commit,process.env.LATIN_REVIEW_EXPECTED_HEAD);
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');let file=path.resolve('dist','.'+pathname);assert.ok(file.startsWith(path.resolve('dist')+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/insight-journal/atlas/latin-america/industry/';let browser;
const save=()=>writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});report.browser={version:browser.version(),chromiumSandbox:true};
 for(const viewport of [{width:1920,height:1080},{width:1896,height:996}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedRequests.push(r.url());});
  const ready=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('[data-latin-workspace]')?.dataset.layoutReady==='true');if(!baseline)await page.waitForFunction(()=>document.querySelector('[data-latin-industry-sectors]')?.dataset.lisReady==='true');await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);};
  const go=async(search='')=>{await page.goto(url+search,{waitUntil:'networkidle'});await ready();};
  const measure=()=>page.evaluate(isBaseline=>{const box=s=>{const el=document.querySelector(s),r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return {cssViewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualViewportScale:visualViewport.scale,browserZoomPercent:100,scroll:{x:scrollX,y:scrollY},map:box(isBaseline?'.latin-industry-map':'[data-lis-map]'),reader:box(isBaseline?'.latin-industry-reading':'[data-lis-reader]'),news:box('.atlas-news'),fields:box('.latin-fields'),nav:[...document.querySelectorAll('.latin-fields>a')].map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return{text:el.textContent.trim(),active:el.getAttribute('aria-current'),width:r.width,height:r.height,color:s.color,background:s.backgroundColor,font:s.font};}),overflow:document.documentElement.scrollWidth>innerWidth,documentZoom:getComputedStyle(document.documentElement).zoom};},baseline);
  const view={viewport,primary:viewport.width===1920,measurements:{},checks:[]};report.viewports.push(view);
  const shot=async(name)=>{await page.mouse.move(0,0);await page.evaluate(()=>{scrollTo(0,0);const reader=document.querySelector('[data-lis-reader]');if(reader)reader.scrollTop=0;});const file=name+'-'+viewport.width+'.png',bytes=await page.screenshot({path:path.join(output,file),animations:'disabled'}),preview=file.replace('.png','.webp'),webp=await sharp(bytes).webp({quality:86}).toBuffer();await writeFile(path.join(output,preview),webp);report.shots.push({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),preview:{file:preview,sha256:crypto.createHash('sha256').update(webp).digest('hex')}});};
  const layout=()=>page.evaluate(()=>({viewBox:document.querySelector('[data-lis-svg]').getAttribute('viewBox'),geography:document.querySelector('[data-lis-svg]>g').getAttribute('transform'),labels:[...document.querySelectorAll('[data-lis-label] text')].map(el=>{const r=el.getBoundingClientRect();return [el.textContent,r.x,r.y,r.width,r.height];}),marks:[...document.querySelectorAll('[data-lis-map] [data-lis-site]')].map(el=>[el.dataset.lisSite,el.dataset.screenPoint])}));
  const checkLabels=async()=>{const current=await layout();for(let i=0;i<current.labels.length;i++)for(let j=i+1;j<current.labels.length;j++){const [at,ax,ay,aw,ah]=current.labels[i],[bt,bx,by,bw,bh]=current.labels[j];assert.ok(!(ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by),'Label overlap: '+at+' / '+bt);}const points=await page.locator('[data-lis-map] [data-lis-site]').evaluateAll(els=>els.map(el=>{const [x,y]=el.dataset.screenPoint.split(',').map(Number),p=new DOMPoint(x,y).matrixTransform(el.ownerSVGElement.getScreenCTM());return{id:el.dataset.lisSite,x:p.x,y:p.y};}));for(let i=0;i<points.length;i++){const a=points[i];for(let j=i+1;j<points.length;j++){const b=points[j];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=15.9,'Nearby mark overlap: '+a.id+'/'+b.id);}for(const [text,x,y,w,h] of current.labels)assert.ok(!(a.x>x-5&&a.x<x+w+5&&a.y>y-5&&a.y<y+h+5),'Point covered by label: '+a.id+'/'+text);}return current;};
  await go();const shared=await measure();
  if(baseline){view.measurements.locations=shared;await shot('before-locations');await context.close();await save();continue;}
  for(const sector of data.sectors){
   await page.locator(`[data-latin-industry-sector=${sector.id}]`).click();await page.waitForTimeout(80);view.measurements[sector.id]=await measure();const geometry=view.measurements[sector.id];for(const key of ['map','reader','news','fields','nav'])assert.deepEqual(geometry[key],shared[key],key+' changed between sectors');assert.equal(geometry.overflow,false);assert.equal(geometry.dpr,1);assert.equal(geometry.visualViewportScale,1);assert.deepEqual(geometry.scroll,{x:0,y:0});assert.ok(geometry.map.y+geometry.map.height<=viewport.height);
   const initial=await checkLabels();assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-industry'),'all');await shot(sector.id+'-initial');
   if(!view.primary)continue;
   for(const industry of data.industries.filter(i=>i.sectors.includes(sector.id))){
    // Actual map labels are clicked; the below-map legend remains supplementary.
    const label=page.locator(`[data-lis-label][data-lis-industry=${industry.id}]`).first();assert.ok(await label.count(),industry.id+' missing initial map name');await label.locator('text').click();assert.deepEqual(await layout(),initial,'Selection moved camera, labels or peers: '+industry.id);assert.match(await page.locator('[data-lis-overview]').textContent(),new RegExp(industry.overview.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    if(['refining','medical','tourism','food'].includes(industry.id))await shot(sector.id+'-'+industry.id+'-selected');
    await page.locator('[data-lis-single]').click();const single=await layout();assert.equal(single.geography,initial.geography);assert.equal(single.viewBox,initial.viewBox);assert.ok(single.marks.every(m=>data.sites.find(s=>s.id===m[0]).industry===industry.id));for(const l of single.labels)assert.ok(initial.labels.some(x=>JSON.stringify(x)===JSON.stringify(l)));await page.locator('[data-lis-single]').click();assert.deepEqual(await layout(),initial);
   }
   for(const site of data.sites.filter(s=>s.sectors.includes(sector.id))){
    // Read all object handlers through the browser, retaining scroll and camera.
    const mark=page.locator(`[data-lis-map] [data-lis-site=${site.id}]`);await mark.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-site'),site.id);assert.deepEqual(await layout(),initial);assert.equal(await page.locator('[data-lis-site-note]').textContent(),site.note);assert.equal(await page.locator('[data-lis-coordinate-note]').textContent(),site.coordinateMeaning);
    for(const ref of site.sources)assert.ok(await page.locator(`[data-lis-sources] a[href="${data.sources.find(s=>s.id===ref).url}"]`).count());
   }
   await page.locator('[data-lis-clear]').click();assert.deepEqual(await layout(),initial);view.checks.push(sector.id+': every industry and site, retained peers/camera/labels, explicit single, original source links');
  }
  if(view.primary){
   await go('?sector=resources&site=reduc&single=1&scope=south');await shot('refining-single-south');await page.locator('[data-lis-overlap]').click();assert.equal(new URL(page.url()).searchParams.get('sector'),'manufacturing');assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-site'),'reduc');await shot('refining-manufacturing-overlap');await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-site'),'reduc');await page.goBack({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('sector'),'resources');await page.goForward({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('sector'),'manufacturing');
   await go('?place=BRA&scope=country&only=1&fallback=1');await page.locator('[data-latin-industry-sector=services]').click();const link=new URL(await page.locator('.latin-fields a[href*=nature]').getAttribute('href'),url);assert.equal(link.searchParams.get('place'),'BRA');assert.equal(link.searchParams.get('scope'),'country');assert.equal(link.searchParams.get('only'),'1');
   await page.locator('[data-lis-scope]').selectOption('central');await shot('services-central');await page.locator('[data-lis-scope]').selectOption('south');await shot('services-south');await page.locator('[data-latin-industry-sector=services]').focus();await page.keyboard.press('Home');assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-sector'),'resources');
   await page.locator('[data-lis-reader] details').last().evaluate(el=>el.open=true);await page.locator('[data-lis-reader]').evaluate(el=>el.scrollTop=el.scrollHeight);assert.ok(await page.locator('[data-lis-sources] a').count()>0);view.checks.push('direct URL, reload, back, forward, meaningful overlap, region, keyboard tabs, country field context, reader end/source access');
  }
  await context.close();await save();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.result=baseline?'baseline-recorded':'passed';
}catch(error){report.result='failed';report.failure=String(error);throw error;}finally{await save();console.log('LATIN_INDUSTRY_REPORT '+JSON.stringify(report));if(browser)await browser.close();await new Promise(r=>server.close(r));}
