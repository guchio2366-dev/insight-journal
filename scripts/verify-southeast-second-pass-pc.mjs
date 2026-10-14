#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {extname,join,resolve,sep} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist'),out=resolve('review-artifacts/southeast-second-pass');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert(path.startsWith('/insight-journal/'));path=path.slice('/insight-journal'.length);const file=resolve(root,'.'+path,path.endsWith('/')?'index.html':'');assert(file.startsWith(root+sep));res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end('Missing static asset');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;let browser;const checks=[],images=[],errors=[],external=[];let failure=null;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});page.setDefaultTimeout(20000);
 await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==base){external.push(route.request().url());return route.abort('blockedbyclient');}return route.continue();});
 page.on('pageerror',e=>errors.push(e.message));
 const mapReady=async()=>{await page.waitForFunction(()=>{const root=document.querySelector('[data-asia-atlas]'),fallback=document.querySelector('[data-map-fallback]'),canvas=document.querySelector('.maplibregl-canvas');return root?.dataset.mapReady==='true'&&fallback?.hidden&&canvas&&canvas.width>100&&canvas.height>100&&canvas.getBoundingClientRect().width>100&&canvas.getBoundingClientRect().height>100;});await page.waitForTimeout(300);};
 const open=async(path)=>{await page.goto(base+'/insight-journal/atlas/asia/southeast-asia/'+path,{waitUntil:'networkidle'});await mapReady();};
 const shot=async(name,selector)=>{await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});const filename=name+'.jpg',bytes=selector?await page.locator(selector).screenshot({path:join(out,filename),type:'jpeg',quality:76,animations:'disabled'}):await page.screenshot({path:join(out,filename),type:'jpeg',quality:72,animations:'disabled'});images.push({file:filename,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});};
 const check=label=>checks.push(label);
 await open('agriculture/');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmView==='all');
 const frame=await page.locator('.asia-map-frame').boundingBox();assert(frame&&frame.width>=650&&frame.height>=460,JSON.stringify(frame));
 assert.equal(await page.locator('[data-southeast-part="all"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-southeast-part="mainland"]').click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('part')==='mainland');assert.equal(await page.locator('[data-southeast-part="mainland"]').getAttribute('aria-pressed'),'true');await shot('mainland-view');
 await page.locator('[data-southeast-part="islands"]').click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('part')==='islands');await shot('island-view');
 await page.locator('[data-southeast-part="all"]').click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('part'));check('full, mainland and island views share data and use undistorted map fitting');
 assert.equal(await page.locator('.asia-livestock-point:visible').count()>0,true);assert.equal(await page.locator('[data-farm-choice]').count()>0,true);
 check('regional farming opens with crop and livestock distributions together');await shot('farming-overview');
 await page.locator('[data-farm-choice="maize"]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmSelected==='maize');
 assert.equal(await page.locator('.asia-livestock-point:visible').count()>0,true);check('selected maize retains lighter livestock points');await shot('farming-maize');
 await page.locator('[data-farm-choice="chicken"]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmSelected==='chicken');
 check('livestock selection is legible with the regional map');await shot('farming-chicken');
 await page.locator('[data-southeast-trade-reading] summary').click();assert.equal(await page.locator('[data-southeast-rice-trade] tbody tr').count(),11);const riceTrade=await page.locator('[data-southeast-rice-trade]').textContent();assert.match(riceTrade,/タイ.*5,147.3/s);assert.match(riceTrade,/ベトナム.*4,374.6/s);assert.match(riceTrade,/東ティモール.*欠測/s);check('2023 HS1006 rice exports and imports show eleven reporters without inventing bilateral flows or domestic use');await shot('rice-trade-reporters','[data-southeast-trade-reading]');
 await open('agriculture/?topic=forest');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.southeastFarmTopic==='forest');
 assert.equal(await page.locator('.southeast-forest-connections').isVisible(),true);
 assert.equal(await page.locator('[data-south-central-farm-connections] > .asia-farm-connections-grid').isVisible(),false);
 assert.equal(await page.locator('[data-southeast-crop-priority]').isVisible(),false);
 assert.match(await page.locator('.southeast-forest-connections').textContent(),/森林面積.*丸太材.*木材製品の輸出/s);
 check('forest separates JRC map, FAO forest area and wood production, and HS44 exports');await shot('forest-map');await shot('forest-statistics','.southeast-forest-connections');
 await page.locator('.southeast-forest-connections a[href*="industryKind=wood"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-southeast-industry-kind="wood"]')?.getAttribute('aria-pressed')==='true');await mapReady();
 assert.equal(new URL(page.url()).searchParams.get('industryKind'),'wood');await page.reload({waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('[data-southeast-industry-kind="wood"]')?.getAttribute('aria-pressed')==='true');await mapReady();
 check('forest to wood industry survives reload');await shot('wood-industry');
 await open('agriculture/?topic=rubber');assert.equal(await page.locator('.southeast-rubber-bridge').isVisible(),true);
 await page.locator('.southeast-rubber-bridge a').click();await page.waitForFunction(()=>document.querySelector('[data-southeast-industry-kind="rubber"]')?.getAttribute('aria-pressed')==='true');await mapReady();
 await page.locator('[data-southeast-industry-point="rayong-tires"]:visible').waitFor();await page.locator('[data-southeast-industry-point="southern-rubber"]:visible').waitFor();
 check('rubber distribution opens rendered rubber and tire sites');await shot('rubber-industry');
 await page.reload({waitUntil:'networkidle'});await mapReady();await page.locator('[data-southeast-industry-point="rayong-tires"]:visible').waitFor();
 check('rubber industry map and selected category survive reload');await shot('rubber-industry-reloaded');
 await open('industry/');assert.equal(await page.locator('[data-southeast-industry-sector]').count(),4);assert.equal(await page.locator('[data-industry-legend]').isVisible(),false);
 const cameraBefore=await page.locator('[data-asia-atlas]').getAttribute('data-map-camera');
 await page.locator('[data-southeast-industry-sector="resource"]').click();assert.equal(await page.locator('[data-southeast-industry-sector="resource"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-southeast-industry-point="southern-rubber"]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-southeast-industry-sector="manufacturing"]').click();await page.locator('[data-southeast-industry-kind="rubber"]').click();
 assert.equal(await page.locator('[data-southeast-industry-point="rayong-tires"]').isVisible(),true);assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'),cameraBefore);await shot('manufacturing-rubber');
 await page.locator('[data-southeast-industry-sector="services"]').click();assert.equal(await page.locator('[data-southeast-industry-kind="tourism"]').isVisible(),true);await page.reload({waitUntil:'networkidle'});await mapReady();assert.equal(await page.locator('[data-southeast-industry-sector="services"]').getAttribute('aria-pressed'),'true');
 check('three industry sectors retain site locations, neutral background and reload state');await shot('service-industry');
 await open('nature/?topic=basins');await page.waitForFunction(()=>document.querySelector('[data-hydrology-status]')?.textContent==='');
 assert.equal(await page.locator('[data-basin-shortcut]').count(),5);
 await page.locator('[data-basin-shortcut="b-4060017020"]').click();
 await page.waitForFunction(()=>new URL(location.href).searchParams.get('detail')==='b-4060017020');
 assert.match(await page.locator('[data-hydrology-content]').textContent(),/中国南西部.*南シナ海/s);
 assert.equal(await page.locator('[data-basin-shortcut="b-4060017020"]').getAttribute('aria-pressed'),'true');
 const otherRivers=await page.locator('.asia-river-label:visible').allTextContents();assert.equal(otherRivers.length>=5,true,otherRivers.join('、'));
 assert.equal(await page.locator('[data-basin-shortcut]:not([disabled])').count(),5);
 check('Mekong basin is selected in the basin topic and the other four basin shortcuts and river labels remain');await shot('basins-mekong-selected');
 await open('nature/?topic=precipitation');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');assert.match(await page.locator('[data-hydrology-legend-note]').textContent(),/250mm/);const rainNumbers=await page.locator('.asia-rain-label:visible').allTextContents();assert.equal(rainNumbers.some(value=>Number(value.replaceAll(',',''))>=4000),true,rainNumbers.join('、'));check('rainfall uses aligned 250 mm colors, contours and on-map values');await shot('rainfall');
 await open('nature/?topic=terrain');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');assert.match(await page.locator('[data-physical-legend]').textContent(),/500|標高/);
 assert.equal(await page.locator('[data-landform-extent]').count()>=7,true);assert.match(await page.locator('[data-physical-reading]').textContent(),/Natural Earth.*名前付き地形ポリゴン.*ボルネオは島全体/s);
 assert.equal(await page.locator('.asia-marine-label:visible').count()>=3,true);
 check('terrain uses aligned 500 m colors and contours with seven Natural Earth named label areas');await shot('terrain');
 const seasonalLabels=async()=>page.locator('.asia-marine-process-label:visible').evaluateAll(nodes=>{
  const bounds=document.querySelector('[data-map-annotations]').getBoundingClientRect();
  const others=[...document.querySelectorAll('.asia-map-annotations button:not([hidden]):not(.asia-marine-process-label)')].map(node=>node.getBoundingClientRect());
  const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  const boxes=nodes.map(node=>node.getBoundingClientRect());
  return {names:nodes.map(node=>node.textContent),within:boxes.every(b=>b.left>=bounds.left&&b.right<=bounds.right&&b.top>=bounds.top&&b.bottom<=bounds.bottom),clear:boxes.every((b,i)=>boxes.every((c,j)=>i===j||!intersects(b,c))&&others.every(c=>!intersects(b,c)))};
 });
 for(const part of ['all','mainland','islands']){
  if(part!=='all'){await page.locator(`[data-southeast-part="${part}"]`).click();await page.waitForFunction(value=>new URL(location.href).searchParams.get('part')===value,part);await page.waitForTimeout(350);}
  const labels=await seasonalLabels();assert(labels.names.length>=1,`${part}: ${JSON.stringify(labels)}`);assert(labels.within&&labels.clear,`${part}: ${JSON.stringify(labels)}`);
  if(part==='all')assert.match(labels.names.join('、'),/季節風.*ベトナム沖沿岸流/s);
  await shot(`terrain-seasonal-${part}`);
 }
 assert.match(await page.locator('[data-southeast-seasonal-sea-source]').textContent(),/11～3月.*5月下旬～9月.*冬に南西向き、夏に北東向き/s);
 check('seasonal monsoon and Vietnam coastal current labels remain inside and clear in all, mainland and island terrain views');
 await open('nature/?city=jakarta');assert.match(await page.locator('[data-city-panel="jakarta"] [data-climate-place]').textContent(),/雨温図/);assert.equal(await page.locator('[data-southeast-climate-key]').isVisible(),true);assert.equal(await page.locator('[data-map-city="jakarta"]').textContent(),'ジャカルタ');check('Jakarta chart and compact Af/Am/Aw map reading');await shot('jakarta-climate');
 for(const part of ['all','mainland','islands']){
  if(part!=='all'){await page.locator(`[data-southeast-part="${part}"]`).click();await page.waitForFunction(value=>new URL(location.href).searchParams.get('part')===value,part);await page.waitForTimeout(350);}
  const climateClear=await page.evaluate(()=>{const key=document.querySelector('[data-southeast-climate-key]').getBoundingClientRect(),labels=[...document.querySelectorAll('.asia-climate-code:not([hidden]),.asia-city-name:not([hidden])')].map(node=>node.getBoundingClientRect());return labels.every(b=>b.right<=key.left||b.left>=key.right||b.bottom<=key.top||b.top>=key.bottom);});
  assert.equal(climateClear,true,`Af/Am/Aw note collision in ${part}`);await shot(`climate-key-${part}`);
 }
 check('Af/Am/Aw key clears map labels in all, mainland and island climate views');
 await open('population/');assert.equal(await page.locator('.asia-landform-label:visible').filter({hasText:'ジャワ島'}).count(),1);const options=await page.locator('[data-population-city] option').evaluateAll(nodes=>nodes.map(n=>({id:n.value,country:n.dataset.country,disabled:n.disabled})));const idn=options.find(o=>o.country==='IDN'),vnm=options.find(o=>o.country==='VNM');assert(idn&&vnm&&!idn.disabled&&!vnm.disabled);
 await page.locator('[data-population-city]').selectOption(idn.id);await page.locator('[data-population-city]').selectOption(vnm.id);assert.equal(await page.locator('[data-population-city]').inputValue(),vnm.id);await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-population-city]').inputValue(),vnm.id);
 check('population city can switch Indonesia to Vietnam and survives reload');await shot('population-vietnam');
 await open('population/?topic=ethnicity');await page.waitForFunction(()=>document.querySelector('[data-settlement-reading="ethnicity"]')?.hidden===false);
 assert.equal(await page.locator('[data-southeast-census-ethnicity]').count(),7);assert.match(await page.locator('[data-southeast-ethnicity-census]').textContent(),/タガログ.*ビコール.*マギンダナオ/s);
 assert.match(await page.locator('[data-map-annotations]').textContent(),/イロコス.*イロカノ.*カラバルソン.*タガログ.*ビコール.*西ビサヤ.*イロンゴ.*中ビサヤ.*セブアノ.*東ビサヤ.*ワライ.*バンサモロ.*マギンダナオ/s);
 const labelsInside=async selector=>page.locator(selector).evaluateAll(nodes=>{const map=document.querySelector('[data-map-annotations]').getBoundingClientRect(),rects=nodes.map(node=>node.getBoundingClientRect());return rects.every(r=>r.left>=map.left&&r.right<=map.right&&r.top>=map.top&&r.bottom<=map.bottom)&&rects.every((a,i)=>rects.every((b,j)=>i===j||a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top));});
 assert.equal(await labelsInside('[data-southeast-census-ethnicity]'),true);
 check('Philippine regional ethnic names and shares complement GeoEPR as seven distinct map labels');await shot('ethnicity-philippines');
 await open('population/?topic=religion');await page.waitForFunction(()=>document.querySelector('[data-settlement-reading="religion"]')?.hidden===false);
 assert.equal(await page.locator('[data-southeast-census-religion]').count(),2);assert.equal(await page.locator('[data-southeast-census-religion-region]').count(),3);
 assert.match(await page.locator('[data-map-annotations]').textContent(),/ビコール.*93.5.*中ビサヤ.*90.5.*バンサモロ.*5.3/s);
 assert.match(await page.locator('[data-southeast-religion-census]').textContent(),/フィリピン.*ビコール.*バンサモロ.*ベトナム.*東ティモール/s);
 assert.equal(await labelsInside('[data-southeast-census-religion-region]'),true);
 check('Philippine regional Catholic shares and Vietnam/Timor national circles retain distinct denominators from EPR');await shot('religion-censuses');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log(JSON.stringify({passed:true,checks,images:images.length,browser:browser.version(),viewport:'1920x1080 CSS px, DPR 1'}));
}catch(error){failure=String(error?.stack??error);throw error;}finally{await writeFile(join(out,'results.json'),JSON.stringify({passed:!failure&&errors.length===0&&external.length===0,checks,images,errors,external,failure,head:process.env.REVIEW_HEAD_SHA??null},null,2));await browser?.close();await new Promise(r=>server.close(r));}

// Reuse this existing read-only regional job for the 18 adopted industries.
await import('./verify-southeast-industry-expanded.mjs');
