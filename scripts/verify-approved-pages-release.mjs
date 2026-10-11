/** Read-only acceptance against the existing public Pages site; no local server. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import {verifyCanadaIndustryPilot} from './verify-canada-industry-pilot.mjs';
import {verifyCanadaAgricultureOverview} from './verify-canada-agriculture-overview.mjs';
import {verifyCanadaForestryOverview} from './verify-canada-forestry-overview.mjs';
import {verifyCanadaNaturalReading} from './verify-canada-natural-reading.mjs';
import {verifyCanadaDemographicsReading} from './verify-canada-demographics-reading.mjs';
import {verifyCanadaElevationBands,verifyCanadaElevationRasterInteraction} from './verify-canada-elevation-bands.mjs';

const site='https://guchio2366-dev.github.io/insight-journal/',expected=process.env.EXPECTED_RELEASE_SHA;
assert.match(expected??'',/^[a-f0-9]{40}$/,'Require the exact deployed main SHA');
const output='review-artifacts/approved-pages-release';await mkdir(output,{recursive:true});
const report={expectedReleaseSha:expected,site,status:'running',browserLocation:'GitHub Actions ubuntu-latest runner; installed Google Chrome',chromiumSandbox:true,checks:[],screenshots:[],viewports:[],nativeScreenshots:[],previews:[],errors:[],failedResponses:[]};let browser,page;
const nativeFiles=new Set();
const settled=async()=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>scrollTo(0,0));};
const go=async(route)=>{await page.goto(site+route,{waitUntil:'networkidle'});await settled();};
const measure=()=>page.evaluate(()=>{const rect=s=>{const el=[...document.querySelectorAll(s)].find(n=>n.getBoundingClientRect().width);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{url:location.href,cssViewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualViewportScale:visualViewport.scale,browserZoomPercent:100,documentZoom:getComputedStyle(document.documentElement).zoom,scroll:{x:scrollX,y:scrollY},map:rect('[data-ca-map-frame],.latin-agriculture-map,.forest-map-stage,.lp-map'),reader:rect('.ca-pilot-reading,.latin-reading'),news:rect('.atlas-news'),fields:rect('.latin-fields'),nav:[...document.querySelectorAll('.latin-fields>a')].map(el=>{const s=getComputedStyle(el);return{text:el.textContent.trim(),active:el.getAttribute('aria-current'),background:s.backgroundColor,color:s.color};}),overflow:document.documentElement.scrollWidth>innerWidth};});
const shot=async(name)=>{await page.mouse.move(0,0);const meta=await measure();assert.deepEqual(meta.cssViewport,{width:1920,height:1080});assert.equal(meta.dpr,1);assert.equal(meta.visualViewportScale,1);assert.deepEqual(meta.scroll,{x:0,y:0});assert.equal(meta.overflow,false);const bytes=await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});report.screenshots.push({file:name+'.png',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),...meta});};
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});report.browserVersion=browser.version();
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});page=await context.newPage();const capture=page.screenshot.bind(page);page.screenshot=async options=>{if(options.path)nativeFiles.add(path.basename(options.path));return capture(options);};page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedResponses.push({url:r.url(),status:r.status()});});
 const releaseResponse=await context.request.get(site+'_release.json',{failOnStatusCode:true});report.release=await releaseResponse.json();assert.equal(report.release.commitSha,expected,'Public release must be the approved integrated main commit');

 report.verifierHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 report.deployedCommit=report.release.commitSha;
 report.verificationScope='Read-only public Pages acceptance; unchanged Canada verifiers from approved merge, plus existing release checks';
 const publicUrl=route=>site+'atlas/north-america/'+route;
 report.majorNavigation=[];
 for(const [field,label] of [['overview','概要'],['agriculture','農林業'],['nature','自然環境'],['industry','主要産業'],['population','人口']]){
  await go('atlas/north-america/canada/industry/');
  await page.locator('.canada-fields').getByRole('link',{name:label,exact:true}).click();
  await page.waitForLoadState('networkidle');await settled();
  const destination=page.url();
  assert(destination.startsWith(site+'atlas/north-america/'));
  if(field==='overview')assert.equal(new URL(destination).searchParams.get('country'),'CAN');
  else assert(new URL(destination).pathname.endsWith('/canada/'+field+'/'));
  await page.reload({waitUntil:'networkidle'});await settled();assert.equal(page.url(),destination);
  if(field!=='industry'){await page.goBack({waitUntil:'networkidle'});await settled();assert(new URL(page.url()).pathname.endsWith('/canada/industry/'));}
  report.majorNavigation.push({field,destination,checks:['initial actual main-tab click','reload',field==='industry'?'current industry entry':'back to industry']});
 }
 report.checks.push('All five Canada major tabs: actual navigation, initial response, reload and back to industry');
 for(const [name,verify] of [['industry',verifyCanadaIndustryPilot],['agriculture',verifyCanadaAgricultureOverview],['forestry',verifyCanadaForestryOverview],['natural-reading',verifyCanadaNaturalReading],['demographics',verifyCanadaDemographicsReading],['elevation',verifyCanadaElevationBands],['elevation-interaction',verifyCanadaElevationRasterInteraction]]){
  console.log('PUBLIC_CANADA_CHECK '+name);
  await verify({page,url:publicUrl,output,result:report});
 }
 if(report.elevationInitialActivation)report.elevationInitialActivation.method='Public Pages responses; includes public-network latency. Source raster and pixel assertions use approved checked-in evidence.';
 await page.setViewportSize({width:1920,height:1080});

 await go('atlas/north-america/canada/industry/');const state=()=>page.locator('[data-ca-industry-pilot]').evaluate(r=>r.canadaIndustryView);
 for(const sector of ['resources','manufacturing','services']){await page.locator(`[data-ca-sector=${sector}]`).click();await settled();assert.equal((await state()).sector,sector);assert.ok(await page.locator('[data-ca-cluster]').count()>0);await shot('canada-'+sector);}
 await page.locator('[data-ca-sector=resources]').click();await page.locator('[data-ca-marker=sudbury]').click();await settled();assert.equal((await state()).site,'sudbury');const frame=(await state()).frame;await page.locator('[data-ca-overlap]').click();await settled();assert.equal((await state()).sector,'manufacturing');assert.equal((await state()).site,'sudbury');assert.deepEqual((await state()).frame,frame);await page.reload({waitUntil:'networkidle'});await settled();assert.equal((await state()).site,'sudbury');await shot('canada-sudbury-manufacturing');await page.goBack();await settled();assert.equal((await state()).sector,'resources');report.checks.push('Canada: 3 categories, clusters retained, Sudbury overlap preserves camera, reload and back');
 await go('atlas/latin-america/agriculture/');const farming=await measure(),image=page.locator('[data-latin-product-distribution]'),href=await image.getAttribute('href');
 const cell=await image.evaluate(async el=>{const bitmap=new Image();bitmap.src=el.dataset.hitImage;await bitmap.decode();const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);const a=c.getImageData(0,0,canvas.width,canvas.height).data;for(let y=180;y<canvas.height-180;y++)for(let x=120;x<canvas.width-120;x++)if(a[(y*canvas.width+x)*4]===1&&[-5,0,5].every(dy=>[-5,0,5].every(dx=>a[((y+dy)*canvas.width+x+dx)*4]===1))){const p=new DOMPoint(el.x.baseVal.value+(x+.5)/canvas.width*el.width.baseVal.value,el.y.baseVal.value+(y+.5)/canvas.height*el.height.baseVal.value).matrixTransform(el.getScreenCTM());if(p.y<innerHeight-30&&document.elementFromPoint(p.x,p.y)===el)return{x:p.x,y:p.y};}throw Error('No visible soy distribution cell');});
 await page.mouse.click(cell.x,cell.y);await page.waitForURL('**layer=soyb**');assert.match(await page.locator('[data-latin-agriculture-reading-title]').textContent(),/大豆/);assert.equal(await image.getAttribute('href'),href);assert.equal(await page.locator('[data-latin-agriculture-map] g[data-latin-agriculture-layer]').count(),11);await shot('latin-soy-selected');
 await page.getByRole('link',{name:'林業',exact:true}).click();await settled();const forest=await measure();for(const k of ['map','reader','news','fields','nav'])assert.deepEqual(forest[k],farming[k],k+' changes across farming/forestry');await shot('latin-forestry');await page.reload({waitUntil:'networkidle'});await settled();assert.deepEqual((await measure()).map,forest.map);await page.goBack({waitUntil:'networkidle'});await settled();assert.match(await page.locator('[data-latin-agriculture-reading-title]').textContent(),/大豆/);report.checks.push('Latin: actual soy distribution pixel selects without removing 11 products; forestry common frame/nav/news/reader; reload and back');
 await go('atlas/latin-america/population/');assert.equal(await page.locator('[data-lp-target-map] [data-city-population]').count(),7);await page.locator('[data-lp-target-map] [data-lp-city=lima]').click();assert.match(await page.locator('[data-lp-overview]').textContent(),/10,391,000人/);assert.equal(await page.locator('[data-lp-target-map] [data-city-population]').count(),7);await shot('latin-lima');await page.reload({waitUntil:'networkidle'});await settled();assert.match(await page.locator('[data-lp-reading-title]').textContent(),/リマ/);await page.locator('[data-lp-layer-select]').selectOption('spatial');assert.equal(await page.locator('[data-lp-target-legend] li').count(),5);assert.match(await page.locator('[data-lp-target-legend]').textContent(),/人\/km²/);await shot('latin-density');report.checks.push('Latin population: 7 WUP2018 urban counts, Lima selection retains peers/reloads; separate 2020 density with 5 bins');
 await page.locator('[data-latin-section=ethnicity]').click();await settled();assert.equal(await page.locator('[data-lc-map=ethnicity] [data-lc-select]').count(),16);
 for(const [country,id,count,value,name] of [['GTM','maya',6,'41.7%','guatemala'],['COL','la-guajira',33,'394,683人','colombia']]){await page.locator(`[data-lc-map=ethnicity] [data-lc-source=${country}]`).click();assert.equal(await page.locator(`[data-lc-supplement-table=${country}] tbody tr`).count(),count);await page.locator(`[data-lc-supplement-table=${country}] [data-lc-select="${country}:${id}"]`).click();assert.ok((await page.locator('[data-lp-overview]').textContent()).includes(value));assert.equal(await page.locator('[data-lc-map=ethnicity] [data-lc-select]').count(),16);await page.evaluate(()=>document.querySelector('.latin-reading-scroll').scrollTop=0);await shot('latin-'+name);await page.reload({waitUntil:'networkidle'});await settled();assert.ok((await page.locator('[data-lp-overview]').textContent()).includes(value));await page.goBack();await settled();assert.equal(new URL(page.url()).searchParams.get('group'),country+':national');}
 await page.locator('[data-lc-supplement-table=COL] [data-lc-select="COL:san-andres-providencia-y-santa-catalina"]').click();assert.match(await page.locator('[data-lp-overview]').textContent(),/20人/);await page.locator('[data-latin-section=religion]').click();await settled();assert.equal(await page.locator('[data-lc-map=religion] [data-lc-select]').count(),18);assert.match(await page.locator('[data-lp-status]').textContent(),/全域の整備完了を意味しません/);await page.evaluate(()=>document.querySelector('.latin-reading-scroll').scrollTop=0);await shot('latin-religion-partial');report.checks.push('Culture: Guatemala 6 native percentages and Colombia 33 indigenous counts; all 16 marks retained; row selection/reload/back; Colombia last 20-person row; Chile-only religion and incomplete whole-region coverage retained');
 const finalRelease=await (await context.request.get(site+'_release.json',{failOnStatusCode:true})).json();assert.equal(finalRelease.commitSha,expected,'Release remained unchanged during public acceptance');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;console.error(e);if(page)await shot('failure').catch(()=>{});}

finally{
 report.nativeScreenshots=[...nativeFiles];
 await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
 const selected=new Set([
  '1920-resources-initial.png','1920-manufacturing-initial.png','1920-services-initial.png',
  '1920-resources-overlap-sudbury.png','1920-manufacturing-overlap-sudbury.png','1920-statistics-three-columns.png',
  'canada-agriculture-1920.png','canada-agriculture-livestock-only.png','canada-forestry-1920.png',
  'canada-forestry-lower-statistics-1920.png','canada-forestry-source-footer-1920.png',
  'canada-climate-initial-1920.png','canada-rivers-st-lawrence-1920.png','canada-rain-initial-1920.png',
  'canada-drainage-initial-1920.png','canada-landform-initial-1920.png',
  'canada-distribution-1920-initial.png','canada-ethnicity-1920-initial.png',
  'canada-religion-1920-initial.png','canada-religion-peel-simultaneous.png','failure.png'
 ]);
 const {default:sharp}=await import('sharp');
 for(const file of nativeFiles){
  if(!selected.has(file))continue;
  const bytes=await sharp(await readFile(path.join(output,file))).webp({quality:90}).toBuffer();
  const encoded=bytes.toString('base64'),name=file.replace(/\.png$/,'.webp');
  const preview={file:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  report.previews.push(preview);
  console.log('APPROVED_PAGES_IMAGE '+name+' '+Math.ceil(encoded.length/8192)+' '+preview.sha256);
  for(let i=0;i<Math.ceil(encoded.length/8192);i++)console.log('APPROVED_PAGES_IMAGE_PART '+name+' '+i+' '+encoded.slice(i*8192,(i+1)*8192));
 }
 await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');
 console.log('APPROVED_PAGES_VERIFICATION '+JSON.stringify(report));await browser?.close();
}
