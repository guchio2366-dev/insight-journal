/** Local built files only; use normally sandboxed preinstalled Chrome. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const output=process.env.FORESTRY_REVIEW_OUTPUT??'/tmp/regional-forestry-pc-review';
const viewports=(process.env.FORESTRY_REVIEW_VIEWPORTS??'1536x864,1920x1080').split(',').map(size=>{const match=/^(\d+)x(\d+)$/.exec(size);assert.ok(match,`Invalid CSS viewport: ${size}`);return {width:Number(match[1]),height:Number(match[2])};});
await mkdir(output,{recursive:true});
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewports:[],checks:[],errors:[],failedRequests:[],africaReviewEvidence:{humanImageReview:'not-confirmed'}};
if(process.env.FORESTRY_REVIEW_EXPECTED_HEAD)assert.equal(report.commit,process.env.FORESTRY_REVIEW_EXPECTED_HEAD);
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');let file=path.resolve('dist','.'+pathname);assert.ok(file.startsWith(path.resolve('dist')+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/insight-journal';
let browser;
const save=()=>writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 report.browser={version:browser.version(),chromiumSandbox:true};
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.failedRequests.push(response.url());});
  // Latin America is measured against its farming shell by verify-latin-forestry-workspace.mjs.
  for(const region of ['africa','oceania','russia']){
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
   const measureLayout=()=>page.evaluate(region=>{
    const box=element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};},b=selector=>box(document.querySelector(selector));
    const drawn=element=>{const s=getComputedStyle(element);return {...box(element),display:s.display,visibility:s.visibility,opacity:Number(s.opacity)};};
    const markers=[...document.querySelectorAll('svg [data-forest-example]')].map(element=>({id:element.dataset.forestExample,...box(element)}));
    const result={cssViewport:{width:innerWidth,height:innerHeight},devicePixelRatio,scroll:{x:scrollX,y:scrollY},news:b('.atlas-news'),map:b('.forest-map-stage'),reading:b('.forest-reading'),legend:b('.forest-legend'),markers,overflow:document.documentElement.scrollWidth>innerWidth,contentOverflow:[...document.querySelectorAll('.forest-reading,.forest-reading-scroll,.forest-legend')].filter(element=>element.scrollWidth>element.clientWidth+2).map(element=>element.className)};
    if(region==='africa'){
     const grid=document.querySelector('.forest-primary-grid'),style=getComputedStyle(grid);
     const screenText=element=>{const matrix=element.getScreenCTM();return {...drawn(element),text:element.textContent,fontPx:parseFloat(getComputedStyle(element).fontSize)*Math.hypot(matrix.a,matrix.b)};};
     result.africa={grid:{...box(grid),display:style.display,contentWidth:grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),gap:parseFloat(style.columnGap),tracks:style.gridTemplateColumns.split(/\s+/).map(Number.parseFloat)},fieldNavigation:b('.africa-fields'),subNavigation:b('.forest-subfields'),mapHeading:b('.forest-map-heading'),svg:b('[data-forest-map]'),markers:[...document.querySelectorAll('svg [data-forest-example]')].map(element=>({id:element.dataset.forestExample,...drawn(element),circle:drawn(element.querySelector('circle')),number:screenText(element.querySelector('.forest-marker-number')),label:screenText(element.querySelector('.forest-marker-label'))})),buttons:[...document.querySelectorAll('.forest-reading .forest-example-choices button')].map(element=>({id:element.dataset.forestExample??'overview',...drawn(element)}))};
    }
    return result;
   },region);
   const assertInside=(box,frame,message)=>{assert.ok(box.width>0&&box.height>0,message+' has drawn dimensions');assert.ok(box.x>=frame.x-2&&box.y>=frame.y-2&&box.x+box.width<=frame.x+frame.width+2&&box.y+box.height<=frame.y+frame.height+2,message+' fits its frame');};
   const assertDrawn=(box,message)=>{assert.ok(box.display!=='none'&&box.visibility==='visible'&&box.opacity>0,message+' is visible');};
   const assertAfricaLayout=measure=>{
    const a=measure.africa,available=a.grid.contentWidth-a.grid.gap,minimumReader=viewport.width<1200?290:320,expectedReader=Math.max(minimumReader,available/2.5),expectedMap=available-expectedReader;
    assert.equal(a.grid.display,'grid');assert.equal(a.grid.tracks.length,2);assert.ok(expectedMap>0,'shared Africa grid has map space');
    assert.ok(Math.abs(measure.map.width-expectedMap)<=2,'Africa map follows shared 1.5:1 grid and reader minimum');assert.ok(Math.abs(measure.reading.width-expectedReader)<=2,'Africa reader follows shared grid');
    assert.ok(Math.abs(a.grid.tracks[0]-expectedMap)<=2&&Math.abs(a.grid.tracks[1]-expectedReader)<=2,'computed grid tracks match shared layout');
    assert.ok(a.subNavigation.y>=a.fieldNavigation.y+a.fieldNavigation.height-2,'field navigation precedes forestry navigation without overlap');
    assert.ok(a.mapHeading.y>=a.subNavigation.y+a.subNavigation.height-2,'forestry navigation precedes map heading without overlap');
    assert.ok(measure.map.y>=a.mapHeading.y+a.mapHeading.height-2,'map starts below its heading without overlap');
    assert.equal(a.markers.length,locators);for(const marker of a.markers){assertDrawn(marker,'Africa marker '+marker.id);assertInside(marker,a.svg,'Africa marker '+marker.id);for(const [kind,text]of [['number',marker.number],['label',marker.label]]){assertDrawn(text,'Africa '+kind+' '+marker.id);assertInside(text,a.svg,'Africa '+kind+' '+marker.id);assert.ok(text.fontPx>=12-.01,'Africa '+kind+' is at least 12 screen pixels');}assertDrawn(marker.circle,'Africa marker circle '+marker.id);assertInside(marker.circle,a.svg,'Africa marker circle '+marker.id);assert.ok(marker.circle.width>=19.5&&marker.circle.height>=19.5,'Africa marker retains its 20 px screen diameter');}
    assert.equal(a.buttons.length,config.reading.examples.length+1);for(const button of a.buttons){assertDrawn(button,'Africa reading button '+button.id);assertInside(button,measure.reading,'Africa reading button '+button.id);}
   };
   const assertLayout=measure=>{assert.deepEqual(measure.cssViewport,viewport);assert.equal(measure.devicePixelRatio,1);assert.equal(measure.overflow,false);assert.deepEqual(measure.contentOverflow,[]);const minimumMapHeight=viewport.width<1200&&region==='russia'?410:440;assert.ok(measure.map.height>minimumMapHeight);if(region==='africa')assertAfricaLayout(measure);else assert.ok(measure.map.width>480);assert.ok(measure.reading.x>measure.map.x+measure.map.width-2);assert.ok(measure.legend.y>=measure.map.y+measure.map.height-2);for(const box of [measure.map,measure.reading,measure.legend]){assert.ok(box.x>=0);assert.ok(box.x+box.width<=viewport.width+2);}assert.ok(measure.legend.x+measure.legend.width<=measure.reading.x+2);};
   const assertFirstViewport=measure=>{assertLayout(measure);assert.deepEqual(measure.scroll,{x:0,y:0});assert.ok(measure.news.x+measure.news.width<=measure.map.x, 'news remains left of map');if(region!=='africa')assert.ok(measure.map.y<viewport.height/3,'map starts in upper third');for(const box of [measure.news,measure.map,measure.reading,measure.legend,...measure.markers]){assert.ok(box.y>=0);assert.ok(box.y+box.height<=viewport.height+2,'initial map, explanation, legend and all region labels are visible without page scroll');}};
   const measure=await measureLayout();report.currentViewport={region,phase:'overview',measure};assertFirstViewport(measure);
   const shot=async(suffix,fullPage=true)=>{const name=`${region}-${viewport.width}-${suffix}.png`,bytes=await page.screenshot({path:path.join(output,name),animations:'disabled',fullPage});return {file:name,fullPage,scroll:await page.evaluate(()=>({x:scrollX,y:scrollY})),imagePixels:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)},sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
   const wholeMissing=['africa','latin-america'].includes(region),landFills=await page.locator('[data-forest-land] path').evaluateAll(paths=>paths.map(path=>path.getAttribute('fill')));assert.ok(landFills.length>0);assert.ok(landFills.every(fill=>wholeMissing?fill==='#f1eee5':fill===`url(#forest-missing-${region})`));if(wholeMissing){assert.match(await page.locator('.forest-map-heading').innerText(),/全域の森林被覆面：未取得/);assert.match(await page.locator('[data-forest-map-note]').innerText(),/中立色は森林の有無を示しません/);}
   const initialViewport=await shot('overview-viewport',false),initial=await shot('overview');
   if(region==='africa')for(const example of config.reading.examples)await page.locator(`svg [data-forest-example="${example.id}"] circle`).click({trial:true});
   // Select an already visible map marker, so the selected viewport also needs
   // no page scrolling; below-map button operations are verified separately.
   const last=config.reading.examples.at(-1);await page.locator(`svg [data-forest-example="${last.id}"]`).click();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),last.title);
   const selectedViewportLayout=await measureLayout();report.currentViewport={region,phase:'selected',measure:selectedViewportLayout};assertFirstViewport(selectedViewportLayout);const selectedViewport=await shot('selected-viewport',false);
   for(const example of config.reading.examples){if(region==='africa'){await page.locator(`svg [data-forest-example="${example.id}"] circle`).click({trial:true});await page.locator(`svg [data-forest-example="${example.id}"] circle`).click();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),example.title);const markerLayout=await measureLayout();report.currentViewport={region,phase:'marker-'+example.id,measure:markerLayout};assertFirstViewport(markerLayout);}await page.locator(`button[data-forest-example="${example.id}"]`).click();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),example.title);assert.equal(await map.getAttribute('viewBox'),camera);assert.equal(await page.locator('svg [data-forest-example]').count(),locators);assert.equal(await page.locator('[data-forest-raster]').count(),region==='russia'?1:0);assert.equal(await page.locator('[data-forest-reference]').count(),references);if(region==='africa'){const buttonLayout=await measureLayout();report.currentViewport={region,phase:'reading-button-'+example.id,measure:buttonLayout};assertFirstViewport(buttonLayout);}}
   const selectedLayout=await measureLayout();assertLayout(selectedLayout);const selected=await shot('selected');
   await page.locator('[data-forest-zoom=in]').click();const zoomed=await map.getAttribute('viewBox');assert.notEqual(zoomed,camera);
   await page.locator('[data-forest-clear]').click();assert.equal(await map.getAttribute('viewBox'),zoomed);
   const first=config.reading.examples[0];await page.locator(`button[data-forest-example="${first.id}"]`).focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-forest-reading-title]').textContent(),first.title);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-forest-reading-title]').textContent(),first.title);
   const restored=(await map.getAttribute('viewBox')).split(' ').map(Number),previous=zoomed.split(' ').map(Number);restored.forEach((value,index)=>assert.ok(Math.abs(value-previous[index])<.001));
   await map.focus();await page.keyboard.press('ArrowRight');assert.notEqual(await map.getAttribute('viewBox'),zoomed);
   await page.locator('[data-forest-reset]').click();assert.equal(await map.getAttribute('viewBox'),camera);assert.equal(await page.locator('[data-forest-clear]').isVisible(),false);
   await page.locator(`svg [data-forest-example="${first.id}"]`).click();assert.equal(await page.locator('[data-forest-reading-title]').textContent(),first.title);
   report.viewports.push({region,viewport,...measure,selectedLayout,selectedViewportLayout,locators,references,raster:region==='russia'?'western-Russia-only':'not-acquired',initial,selected,initialViewport,selectedViewport});
  }
  await context.close();await save();
 }
 // The existing entry tabs lead to the module through actual user operations.
 const context=await browser.newContext({viewport:{width:1536,height:864},serviceWorkers:'block'});await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());const page=await context.newPage();
 for(const region of ['africa','latin-america','oceania','russia']){
  await page.goto(base+(region==='africa'?'/atlas/africa/?field=agriculture&topic=farming':`/atlas/${region}/agriculture/`),{waitUntil:'networkidle'});
  const control=region==='africa'?page.locator('[data-africa-topic="forestry"]'):page.getByRole('link',{name:'林業',exact:true});await control.click();await page.waitForURL(url=>url.pathname.endsWith(`/atlas/${region}/agriculture/forestry/`));assert.equal(await page.locator('[data-regional-forestry]').getAttribute('data-region'),region);
 }
 report.checks.push(`${viewports.length*3} PC region/viewport combinations, initial and selected: zero-scroll viewport screenshots with left news, complete map/all region labels, right explanation and legend visible simultaneously; exact CSS innerWidth/innerHeight recorded separately from screenshot/preview pixels; no overlap or horizontal overflow; all locators/raster retained on selection; zoom/clear/reset, keyboard, marker click and reload restore; 4 existing forestry entries`);
 await context.close();assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);delete report.currentViewport;report.result='passed';await save();
 // Public local-site screenshots only. Optional readable previews also let the
 // authorized job-log reader inspect evidence when ZIP transfer is unavailable.
 if(process.env.FORESTRY_REVIEW_INLINE_PREVIEWS==='1'){
  const {default:sharp}=await import('sharp');
  for(const view of report.viewports)for(const shot of [view.initialViewport,view.selectedViewport]){
   const bytes=await sharp(path.join(output,shot.file)).resize({width:1280,withoutEnlargement:true}).webp({quality:90}).toBuffer();
   const encoded=bytes.toString('base64'),name=shot.file.replace(/\.png$/,'.webp'),parts=Math.ceil(encoded.length/8192);
   const metadata=await sharp(bytes).metadata();shot.preview={file:name,imagePixels:{width:metadata.width,height:metadata.height},sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
   console.log(`FORESTRY_VISUAL ${name} ${parts} ${crypto.createHash('sha256').update(bytes).digest('hex')}`);
   for(let part=0;part<parts;part++)console.log(`FORESTRY_VISUAL_PART ${name} ${part} ${encoded.slice(part*8192,(part+1)*8192)}`);
  }
  await save();
  console.log(`FORESTRY_REPORT ${JSON.stringify(report)}`);
 }
}catch(error){report.result='failed';report.failure=error.stack;await save();console.log(`FORESTRY_FAILURE_LAYOUT ${JSON.stringify(report.currentViewport)}`);throw error;}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
