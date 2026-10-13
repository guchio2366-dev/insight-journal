/** Read-only acceptance against the existing public Pages site; no local server. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright';
const site='https://guchio2366-dev.github.io/insight-journal/',expected=process.env.EXPECTED_RELEASE_SHA;
assert.match(expected??'',/^[a-f0-9]{40}$/,'Require the exact deployed main SHA');
const output='review-artifacts/approved-pages-release';await mkdir(output,{recursive:true});
const report={expectedReleaseSha:expected,site,status:'running',browserLocation:'GitHub Actions ubuntu-latest runner; installed Google Chrome',chromiumSandbox:true,checks:[],screenshots:[],errors:[],failedResponses:[]};let browser,page;
const settled=async()=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.evaluate(()=>scrollTo(0,0));};
const go=async(route)=>{await page.goto(site+route,{waitUntil:'networkidle'});await settled();};
const measure=()=>page.evaluate(()=>{const rect=s=>{const el=[...document.querySelectorAll(s)].find(n=>n.getBoundingClientRect().width);if(!el)return null;const r=el.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{url:location.href,cssViewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualViewportScale:visualViewport.scale,browserZoomPercent:100,documentZoom:getComputedStyle(document.documentElement).zoom,scroll:{x:scrollX,y:scrollY},map:rect('[data-ca-map-frame],.latin-agriculture-map,.forest-map-stage,.lp-map'),reader:rect('.ca-pilot-reading,.latin-reading'),news:rect('.atlas-news'),fields:rect('.latin-fields'),nav:[...document.querySelectorAll('.latin-fields>a')].map(el=>{const s=getComputedStyle(el);return{text:el.textContent.trim(),active:el.getAttribute('aria-current'),background:s.backgroundColor,color:s.color};}),overflow:document.documentElement.scrollWidth>innerWidth};});
const shot=async(name)=>{await page.mouse.move(0,0);const meta=await measure();assert.deepEqual(meta.cssViewport,{width:1920,height:1080});assert.equal(meta.dpr,1);assert.equal(meta.visualViewportScale,1);assert.deepEqual(meta.scroll,{x:0,y:0});assert.equal(meta.overflow,false);const bytes=await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});report.screenshots.push({file:name+'.png',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),...meta});};
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});report.browserVersion=browser.version();
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedResponses.push({url:r.url(),status:r.status()});});
 const releaseResponse=await context.request.get(site+'_release.json',{failOnStatusCode:true});report.release=await releaseResponse.json();assert.equal(report.release.commitSha,expected,'Public release must be the approved integrated main commit');
 await go('atlas/north-america/canada/industry/');const state=()=>page.locator('[data-ca-industry-pilot]').evaluate(r=>r.canadaIndustryView);
 for(const sector of ['resources','manufacturing','services']){await page.locator(`[data-ca-sector=${sector}]`).click();await settled();assert.equal((await state()).sector,sector);assert.ok(await page.locator('[data-ca-cluster]').count()>0);await shot('canada-'+sector);}
 await page.locator('[data-ca-sector=resources]').click();await page.locator('[data-ca-marker=sudbury]').click();await settled();assert.equal((await state()).site,'sudbury');const frame=(await state()).frame;await page.locator('[data-ca-overlap]').click();await settled();assert.equal((await state()).sector,'manufacturing');assert.equal((await state()).site,'sudbury');assert.deepEqual((await state()).frame,frame);await page.reload({waitUntil:'networkidle'});await settled();assert.equal((await state()).site,'sudbury');await shot('canada-sudbury-manufacturing');await page.goBack();await settled();assert.equal((await state()).sector,'resources');report.checks.push('Canada: 3 categories, clusters retained, Sudbury overlap preserves camera, reload and back');
 await go('atlas/latin-america/agriculture/');
 const farming=await measure(),crop=page.locator('[data-agriculture-crops] [data-latin-product-distribution]');
 const layers=()=>page.locator('[data-agriculture-crops],[data-agriculture-livestock]').count();
 const labels=()=>page.locator('[data-latin-agriculture-map] g[data-latin-agriculture-layer]').evaluateAll(nodes=>nodes.map(n=>n.dataset.latinAgricultureLayer));
 const baselineLabels=await labels(),href=await crop.getAttribute('href'),farmFrame=await page.locator('[data-latin-agriculture-map]').getAttribute('data-agriculture-frame');
 assert.equal(await layers(),2);assert.match(href,/crop-bands\.png$/);
 assert.equal(await page.locator('[data-latin-agriculture-overview-legend] [data-latin-agriculture-layer]:not([data-latin-agriculture-layer=all])').count(),11);
 await page.locator('[data-latin-agriculture-livestock]').uncheck();assert.equal(await layers(),1);
 const cell=await crop.evaluate(async el=>{const bitmap=new Image();bitmap.src=el.dataset.hitImage;await bitmap.decode();const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);const a=c.getImageData(0,0,canvas.width,canvas.height).data;for(let y=180;y<canvas.height-180;y++)for(let x=120;x<canvas.width-120;x++)if(a[(y*canvas.width+x)*4]===1&&[-5,0,5].every(dy=>[-5,0,5].every(dx=>a[((y+dy)*canvas.width+x+dx)*4]===1))){const p=new DOMPoint(el.x.baseVal.value+(x+.5)/canvas.width*el.width.baseVal.value,el.y.baseVal.value+(y+.5)/canvas.height*el.height.baseVal.value).matrixTransform(el.getScreenCTM());if(p.y<innerHeight-30&&document.elementFromPoint(p.x,p.y)?.closest('[data-latin-product-distribution]')===el)return{x:p.x,y:p.y};}throw Error('No visible supported soy distribution cell');});
 await page.mouse.click(cell.x,cell.y);await page.waitForURL('**layer=soyb**');
 assert.match(await page.locator('[data-latin-agriculture-reading-title]').textContent(),/大豆/);
 assert.equal(await crop.getAttribute('href'),href);assert.equal(await page.locator('[data-agriculture-selected-outline]').count(),1);
 await page.locator('[data-latin-agriculture-livestock]').check();assert.equal(await layers(),2);
 assert.deepEqual(await labels(),baselineLabels);assert.equal(await page.locator('[data-latin-agriculture-map]').getAttribute('data-agriculture-frame'),farmFrame);
 await shot('latin-soy-selected');
 await page.locator('[data-latin-agriculture-link]').filter({hasText:'林業'}).click();await settled();const forest=await measure();
 for(const k of ['map','reader','news','fields','nav'])assert.deepEqual(forest[k],farming[k],k+' changes across farming/forestry');
 for(const m of [farming,forest])for(const k of ['map','reader'])assert.ok(m[k]?.height>=440,k+' retains the accepted minimum reading/map height');
 await shot('latin-forestry');await page.reload({waitUntil:'networkidle'});await settled();assert.deepEqual((await measure()).map,forest.map);
 await page.goBack({waitUntil:'networkidle'});await settled();assert.match(await page.locator('[data-latin-agriculture-reading-title]').textContent(),/大豆/);
 assert.equal(await layers(),2);assert.deepEqual(await labels(),baselineLabels);
 report.checks.push('Latin: accepted separate crop/cattle rasters, real soy pixel selection, 11 sourced products and all baseline labels retained, fixed agriculture camera; farming/forestry map and reader dimensions exactly match with shared navigation/news/fields and minimum frame sizes; reload and back');
 await go('atlas/latin-america/population/');assert.equal(await page.locator('[data-lp-target-map] [data-city-locator]').count(),20);assert.equal(await page.locator('[data-lp-target-map] [data-population-status=UN-2018-agglomeration]').count(),7);await page.locator('[data-lp-target-map] [data-lp-city=lima]').click();assert.match(await page.locator('[data-lp-overview]').textContent(),/10,391,000人/);assert.equal(await page.locator('[data-lp-target-map] [data-population-status=UN-2018-agglomeration]').count(),7);await shot('latin-lima');await page.reload({waitUntil:'networkidle'});await settled();assert.match(await page.locator('[data-lp-reading-title]').textContent(),/リマ/);await page.locator('[data-lp-layer-select]').selectOption('spatial');assert.equal(await page.locator('[data-lp-target-legend] li').count(),5);assert.match(await page.locator('[data-lp-target-legend]').textContent(),/人\/km²/);await shot('latin-density');report.checks.push('Latin population: accepted 20 visible city locators with 7 sourced WUP2018 counts; Lima selection retains peers/reloads; separate 2020 density with 5 bins');
 for(const [section,group] of [['ethnicity','mestizo'],['religion','protestant']]){
  await go('atlas/latin-america/population/?section='+section);
  const host=page.locator(`[data-lc-map=${section}]`),ids=()=>host.locator('[data-lc-select]').evaluateAll(nodes=>nodes.map(n=>n.dataset.lcSelect));
  const baselineIds=await ids(),frame=await host.locator('svg').getAttribute('viewBox'),layers=await host.locator('[data-lc-layer]').count();
  assert.equal(await host.locator('svg').count(),1);assert.equal(await host.locator('[data-lc-area]').count(),34);assert.ok(layers>30);
  assert.equal(await host.locator('[data-lc-evidence=reference-only] path').count(),0,'Qualitative references must not become fabricated geographic faces');
  assert.equal(await page.locator('.latin-reading table').count(),0,'Detailed statistics remain below the shared workspace');
  if(section==='ethnicity')assert.match(await page.locator('[data-lp-overview]').textContent(),/エクアドルのメスチソ県別分布は未取得/);
  else{for(const id of ['catholic','protestant','none','hindu','muslim'])assert.ok(await host.locator(`[data-lc-layer=${id}]`).count());assert.equal(await page.locator('[data-lc-religion-survey] tbody tr').count(),18);assert.match(await page.locator('[data-lp-overview]').textContent(),/ウルグアイ.*割合なし.*国単位/);}
  await page.locator(`[data-lp-target-legend] [data-lc-select="distribution:${group}"]`).click();await settled();
  assert.equal(new URL(page.url()).searchParams.get('group'),'distribution:'+group);assert.deepEqual(await ids(),baselineIds);assert.equal(await host.locator('svg').getAttribute('viewBox'),frame);
  const opacity=await host.locator('[data-lc-layer]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('opacity')));
  await page.locator('[data-lc-isolate]').check();await settled();assert.equal(await host.locator('[data-lc-layer]').count(),layers);assert.deepEqual(await host.locator('[data-lc-layer]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('opacity'))),opacity);
  assert.ok(await host.locator('[data-lc-highlight=true]').count());assert.equal(await host.locator('svg').getAttribute('viewBox'),frame);await shot('latin-'+section+'-coexistence');
  await page.reload({waitUntil:'networkidle'});await settled();assert.equal(await page.locator('[data-lc-isolate]').isChecked(),true);await page.goBack({waitUntil:'networkidle'});await settled();assert.equal(await page.locator('[data-lc-isolate]').isChecked(),false);assert.deepEqual(await ids(),baselineIds);
  report.checks.push('Latin '+section+': accepted geographic evidence across 34 country contexts, peer distributions retained, reference-only evidence has no invented faces; group/emphasis/reload/back preserves camera and data; known source gaps retained');
 }
 await go('atlas/latin-america/population/?section=ethnicity');
 const ethnicityIds=await page.locator('[data-lc-map=ethnicity] [data-lc-select]').evaluateAll(nodes=>nodes.map(n=>n.dataset.lcSelect));
 for(const [country,id,count,value,name] of [['GTM','maya',6,'41.7%','guatemala'],['COL','la-guajira',33,'394,683人','colombia']]){
  const source=page.locator(`[data-lc-supplement-source=${country}]`);await source.locator(':scope > summary').click();
  const table=source.locator(`[data-lc-supplement-table=${country}]`);assert.equal(await table.locator('tbody tr').count(),count);
  const previousGroup=new URL(page.url()).searchParams.get('group');await table.locator(`[data-lc-select="${country}:${id}"]`).click();await settled();
  assert.ok((await page.locator('[data-lp-overview]').textContent()).includes(value));assert.deepEqual(await page.locator('[data-lc-map=ethnicity] [data-lc-select]').evaluateAll(nodes=>nodes.map(n=>n.dataset.lcSelect)),ethnicityIds);
  assert.equal(await page.locator('.latin-reading table').count(),0);await shot('latin-'+name);
  await page.reload({waitUntil:'networkidle'});await settled();assert.ok((await page.locator('[data-lp-overview]').textContent()).includes(value));await page.goBack({waitUntil:'networkidle'});await settled();assert.equal(new URL(page.url()).searchParams.get('group'),previousGroup);
 }
 const colombia=page.locator('[data-lc-supplement-source=COL]');if(!await colombia.evaluate(el=>el.open))await colombia.locator(':scope > summary').click();
 await colombia.locator('[data-lc-select="COL:san-andres-providencia-y-santa-catalina"]').click();await settled();assert.match(await page.locator('[data-lp-overview]').textContent(),/20人/);
 report.checks.push('Native supplementary statistics: Guatemala six categories retain 41.7% and Colombia 33 rows retain 394,683 persons and the last 20-person row; direct row click/reload/back; all accepted geographic selections retained and detailed tables stay below the map');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);process.exitCode=1;console.error(e);if(page)await shot('failure').catch(()=>{});}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');const {default:sharp}=await import('sharp');for(const item of report.screenshots){const bytes=await sharp(await readFile(path.join(output,item.file))).webp({quality:90}).toBuffer(),encoded=bytes.toString('base64'),name=item.file.replace(/\.png$/,'.webp');item.preview={file:name,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};console.log(`APPROVED_PAGES_IMAGE ${name} ${Math.ceil(encoded.length/8192)} ${item.preview.sha256}`);for(let i=0;i<Math.ceil(encoded.length/8192);i++)console.log(`APPROVED_PAGES_IMAGE_PART ${name} ${i} ${encoded.slice(i*8192,(i+1)*8192)}`);}await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log('APPROVED_PAGES_VERIFICATION '+JSON.stringify(report));await browser?.close();}
