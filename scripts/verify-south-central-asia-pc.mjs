import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

// Uses the existing CI's guarded, normally sandboxed browser and local build.
export const southCentralProfiles=[
 {name:'south-desktop',viewport:{width:1536,height:864}},
 {name:'south-laptop',viewport:{width:1280,height:720}},
 {name:'south-small',viewport:{width:1024,height:768}},
];
export const southCentralImageCount=10*southCentralProfiles.length;

export async function verifySouthCentralAsia(page,{source,profile,capture}){
 const checks=[],bandsChecks=[];
 const reviewFoundation=process.env.SOUTH_CENTRAL_FOUNDATION_REVIEW==='1'&&profile.name==='south-desktop';
 const record=name=>checks.push({name,passed:true});
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);
 const open=async(route)=>{await page.goto(source+`/atlas/asia/${route}`,{waitUntil:'domcontentloaded'});await ready();if(reviewFoundation)await page.waitForLoadState('networkidle');};
 const screenshot=async id=>{if(!id.includes('-aligned-')&&!['south-central-industry-overview','south-central-cultural-distribution'].includes(id))return;await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;scrollTo({top:0,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.equal(await page.evaluate(()=>scrollY),0,'Regional screenshots must start at the page top');await capture(page,profile,id,'asia');};
 const story=async id=>{const picker=page.locator('[data-place-story]');await picker.selectOption(id);await page.waitForFunction(id=>new URL(location.href).searchParams.get('story')===id,id);await page.waitForLoadState('networkidle');};
 const scope=()=>page.locator('[data-country-select] option').evaluateAll(nodes=>nodes.filter(n=>n.value&&!n.disabled&&!n.hidden).map(n=>n.value));
 const extentChecks=[];
 const extentFits=async(label,serializeCamera=false)=>{
  if(serializeCamera){
   await page.locator('[data-zoom-in]').click();await page.waitForFunction(()=>new URL(location.href).searchParams.has('z'));
   const enlarged=Number(new URL(page.url()).searchParams.get('z'));
   await page.locator('[data-zoom-out]').click();await page.waitForFunction(z=>Number(new URL(location.href).searchParams.get('z'))<z-.9,enlarged);
  }
  const url=new URL(page.url()),camera={lng:Number(url.searchParams.get('lng')),lat:Number(url.searchParams.get('lat')),zoom:Number(url.searchParams.get('z'))};
  assert(url.searchParams.has('z'),'A real map camera is required for extent verification');
  const extent=await page.locator('[data-asia-config]').evaluate(n=>JSON.parse(n.textContent).contentExtent),box=await page.locator('[data-map-surface]').boundingBox();
  const project=(lon,lat)=>[(lon+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2],centre=project(camera.lng,camera.lat),world=512*2**camera.zoom;
  const corners=[[extent[0],extent[1]],[extent[2],extent[3]]].map(p=>{const q=project(...p);return {x:box.width/2+(q[0]-centre[0])*world,y:box.height/2+(q[1]-centre[1])*world};});
  for(const p of corners){assert(p.x>=-2&&p.x<=box.width+2&&p.y>=-2&&p.y<=box.height+2,`${label}: complete regional extent must fit the real map viewport: ${JSON.stringify({camera,box,corners,extent})}`);}
  extentChecks.push({label,camera,extent,corners,passed:true});
 };

 // Foundation operations passed in all three PC sizes on the first contour
 // review run. Retain the deeper suite for explicit regional follow-up; the
 // regular CI budget covers all new contour views in every PC size.
 if(reviewFoundation){
 await open('south-central-asia/industry/');
 assert.equal(new URL(page.url()).searchParams.get('place'),null);
 assert.deepEqual(await scope(),['IND']);
 await page.locator('[data-focus-reading]').waitFor({state:'visible'});
 assert.match(await page.locator('[data-focus-reading-body]').textContent(),/グジャラート.*アナンド.*カルナータカ.*ベンガルール.*ウズベキスタン/s);
 const config=await page.locator('[data-asia-config]').evaluate(n=>JSON.parse(n.textContent));
 assert.deepEqual(Object.keys(config.focusReadings).sort(),['agriculture','industry','natural','population']);
 assert.equal(config.countries.length,13);assert(config.contentExtent.every(Number.isFinite));
 await extentFits('south-central industry overview',true);
 const before=page.url();await page.locator('[data-map-surface]').click({position:{x:30,y:30}});assert.equal(page.url(),before);
 await screenshot('south-central-industry-overview');record('regional overview, four reading guides, India-only country entry and inert industry background');

 await page.locator('[data-industry-feature="in-manufacturing"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-industry-detail]')?.options.length>1&&document.querySelector('[data-industry-status]')?.textContent==='');
 assert.equal(new URL(page.url()).searchParams.get('place'),'IND');
 await story('gujarat-manufacturing');
 assert.equal(new URL(page.url()).searchParams.get('detail'),'IN-GJ');
 assert.match(await page.locator('[data-place-story-text]').textContent(),/2022–23.*グジャラート.*マハーラーシュトラ.*タミル/s);
 assert.match(await page.locator('[data-place-story-scope]').textContent(),/乳加工以外|乳製品だけ/);
 await screenshot('india-gujarat-manufacturing');
 await page.locator('[data-place-bridge-topic="buffalo"]').click();
 await page.waitForFunction(()=>location.pathname.includes('/agriculture/')&&new URL(location.href).searchParams.get('topic')==='buffalo');
 const comparison=new URL(page.url());assert.deepEqual(comparison.searchParams.get('at').split(',').map(Number),[72.95,22.56]);assert(comparison.searchParams.get('back'));
 await page.reload({waitUntil:'domcontentloaded'});await ready();
 await page.locator('[data-comparison-back]').click();
 await page.waitForFunction(()=>new URL(location.href).searchParams.get('story')==='gujarat-manufacturing');
 assert.equal(new URL(page.url()).searchParams.get('detail'),'IN-GJ');record('India manufacturing keeps source year and definition; Anand comparison reload and return preserve the state');

 await story('bengaluru-services');
 assert.equal(new URL(page.url()).searchParams.get('topic'),'in-services');assert.equal(new URL(page.url()).searchParams.get('detail'),'IN-KA');
 assert.match(await page.locator('[data-place-story-text]').textContent(),/1992.*1993/s);
 assert.match(await page.locator('[data-place-story-scope]').textContent(),/ソフトウェアだけ.*HS/s);
 await page.reload({waitUntil:'domcontentloaded'});await ready();
 await page.locator('[data-place-story-body]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-place-story]').inputValue(),'bengaluru-services');
 await screenshot('india-bengaluru-services');record('India services preserves Karnataka totals separately from Bengaluru software and commodity trade');

 await open('central-asia/industry/');assert.deepEqual(await scope(),[]);
 assert.equal(await page.locator('[data-industry-feature="in-manufacturing"]').isVisible(),false);
 assert.equal(await page.locator('[data-industry-topic] option[value="in-services"]').count(),0);
 const centralStories=await page.locator('[data-place-story] option').evaluateAll(nodes=>nodes.map(n=>n.value));
 assert(centralStories.includes('uzbekistan-market'));assert(!centralStories.includes('gujarat-manufacturing'));
 await story('uzbekistan-market');assert.match(await page.locator('[data-place-story-scope]').textContent(),/対象はインド.*地域的特徴/s);
 await screenshot('central-asia-cotton-processing');
 await page.locator('[data-place-bridge-topic="cotton"]').click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('topic')==='cotton');assert.deepEqual(new URL(page.url()).searchParams.get('at').split(',').map(Number),[71.5,40.6]);
 await page.locator('[data-comparison-back]').click();await page.waitForFunction(()=>new URL(location.href).searchParams.get('story')==='uzbekistan-market');record('Central Asia has regional examples, without India national entries; Fergana comparison returns to the regional case');

 for(const [region,city] of [['south-asia','new-delhi'],['central-asia','tashkent']]){
  await open(`${region}/nature/`);assert.equal(new URL(page.url()).searchParams.get('place'),null);
  await page.locator('[data-focus-reading]').waitFor({state:'visible'});
  await extentFits(`${region} initial climate`,true);
  const station=page.locator(`.asia-climate-station[data-station="${city}"]`);
  assert.equal(await station.evaluate(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-station]')?.getAttribute('data-station');}),city,'A nearby transparent station hit box must not intercept this city');
  await station.click();
  const chart=page.locator(`[data-city-panel="${city}"] [data-city-statistics]`);await chart.waitFor({state:'visible'});
  await page.waitForFunction(city=>!document.querySelector(`[data-city-panel="${city}"] [data-city-class-name]`).textContent.includes('未取得'),city);
  await page.evaluate(()=>scrollTo(0,0));
  const layout=await page.evaluate(city=>{const box=q=>{const r=document.querySelector(q).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};return {first:document.querySelector('.asia-reading-panel').firstElementChild.hasAttribute('data-city-reading-host'),map:box('[data-map-surface]'),chart:box(`[data-city-panel="${city}"] [data-city-statistics]`),linksBelow:document.querySelector('[data-asia-map-items]').contains(document.querySelector('[data-reading-dock-links]'))};},city);
  assert(layout.first&&layout.linksBelow);assert(layout.chart.x>=layout.map.right&&layout.chart.bottom<=profile.viewport.height);
  assert.match(await page.locator(`[data-city-panel="${city}"] .city-farming`).textContent(),/灌漑|綿花|小麦/);
  await screenshot(`${region}-city-chart`);
  await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(new URL(page.url()).searchParams.get('city'),city);
 }
 record('South and Central Asia map-city selection leads the right column with a complete rain-temperature chart and preserves selection on reload');

 for(const [region,product] of [['south-asia','wheat'],['central-asia','cotton']]){
  await open(`${region}/agriculture/`);await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.farmContextStatus==='ready');
  assert.equal(new URL(page.url()).searchParams.get('place'),null);
  const livestock=page.locator('.asia-livestock-point:visible'),count=await livestock.count();assert(count>0);
  await page.locator(`[data-farm-choice="${product}"]`).click();await page.waitForFunction(product=>document.querySelector('[data-asia-atlas]').dataset.farmSelected===product,product);
  await extentFits(`${region} selected crop context`);
  assert.equal(await livestock.count(),count);for(const opacity of await livestock.evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).opacity)))assert.equal(Number(opacity),.2);
  const url=page.url();await page.locator('[data-map-surface]').click({position:{x:30,y:30}});assert.equal(page.url(),url);
  await screenshot(`${region}-${product}-context`);
 }
 record('Punjab wheat and Central Asian cotton retain livestock context and ignore unrelated background clicks');

 await open('south-central-asia/population/?topic=ethnicity');
 await page.locator('[data-settlement-reading="ethnicity"] [data-settlement-overview]').waitFor({state:'visible'});
 assert.match(await page.locator('[data-settlement-reading="ethnicity"] [data-settlement-overview]').textContent(),/最多|参考|特徴/);
 await screenshot('south-central-cultural-distribution');record('Ethnic distribution remains a separate reference from population density and majority classifications');

 await open('central-asia/nature/?topic=terrain');
 await page.waitForFunction(()=>document.querySelector('[data-map-period]')?.textContent.includes('500m'));
 await screenshot('central-asia-500m-elevation');record('Central Asian elevation uses the existing 500m contours');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }else{
  await open('south-central-asia/industry/');await screenshot('south-central-industry-overview');
  await open('south-central-asia/population/?topic=ethnicity');await screenshot('south-central-cultural-distribution');
 }
 // Reuse the fixed 30-image regional budget for two overview references and
 // eight new band scenes across desktop, laptop and the smaller PC viewport.
 for(const [topic,kind,interval,legend] of [['precipitation','rainfall',250,'[data-hydrology-scale]'],['terrain','terrain',500,'[data-physical-legend] .asia-physical-key']]){
  let expected;
  for(const region of ['south-central-asia','south-asia','central-asia']){
   await open(`${region}/nature/?topic=${topic}`);
   await page.waitForFunction(kind=>{const r=document.querySelector('[data-asia-atlas]');return r.dataset.contourBandStatus==='ready'&&r.dataset.contourBandKind===kind;},kind);
   expected=await page.locator('[data-asia-config]').evaluate((node,kind)=>JSON.parse(node.textContent).presentation[kind].bands,kind);
   assert.equal(expected.interval,interval);
   const wanted=await page.evaluate(b=>b.colors.map((color,i)=>{const e=document.createElement('i');e.style.backgroundColor=color;return {color:e.style.backgroundColor,label:`${b.breaks[i].toLocaleString('ja-JP')}–${b.breaks[i+1].toLocaleString('ja-JP')}`};}),expected);
   const actual=await page.locator(`${legend} > span`).evaluateAll(nodes=>nodes.filter(n=>/–/.test(n.textContent)).map(n=>({color:n.querySelector('i').style.backgroundColor,label:n.textContent})));
   assert.deepEqual(actual,wanted,'Visible explanation legend must use the generated intervals and colors');
   const mapLegend=await page.locator('[data-reading-map-legend] .asia-comparison-compact-key > span').evaluateAll(nodes=>nodes.map(n=>({color:n.querySelector('i').style.backgroundColor,label:n.textContent})));
   assert.deepEqual(mapLegend,wanted,'Legend below the map must use the same generated intervals');
   await screenshot(`${region}-aligned-${kind}-overview`);
   bandsChecks.push({region,kind,interval,sourceGridSHA256:expected.sourceGridSHA256,legendMatches:true});
  }
  const point=kind==='rainfall'?[75.5,12.9]:[85.3,27.7];
  await open(`south-asia/nature/?topic=${topic}&lng=${point[0].toFixed(5)}&lat=${point[1].toFixed(5)}&z=6.000&at=${point.map(n=>n.toFixed(5)).join(',')}`);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='ready');
  const selector=kind==='rainfall'?'[data-hydrology-value]':'[data-physical-value]';
  await page.waitForFunction(selector=>/\d/.test(document.querySelector(selector)?.textContent??''),selector);
  const cfg=await page.locator('[data-asia-config]').evaluate(n=>JSON.parse(n.textContent)),grid=kind==='rainfall'?cfg.water.precipitation:cfg.physical;
  const raw=gunzipSync(await readFile(fileURLToPath(new URL('../'+expected.sourceGrid,import.meta.url)))),[w,s,e,n]=grid.bounds3857;
  const x=6378137*point[0]*Math.PI/180,y=6378137*Math.log(Math.tan(Math.PI/4+point[1]*Math.PI/360));
  const value=raw.readInt16LE(2*(Math.floor((n-y)/(n-s)*grid.height)*grid.width+Math.floor((x-w)/(e-w)*grid.width)));
  assert.notEqual(value,-32768);assert((await page.locator(selector).textContent()).includes(value.toLocaleString('ja-JP')),'Point lookup must retain the original, unsmoothed source value');
  await screenshot(`south-asia-aligned-${kind}-point`);
  const url=page.url();await page.reload({waitUntil:'domcontentloaded'});await ready();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='ready');assert.equal(page.url(),url);
  await page.locator('[data-dock-compare="agriculture"]').click();
  // The preceding run verified both comparison geometries on desktop and
  // laptop. Check the remaining smaller PC here without repeating that load.
  if(profile.name==='south-small'){
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.comparisonOriginal==='outline');
   assert.doesNotMatch(await page.locator('[data-comparison-legend]').textContent(),/元分布の描画を取得できませんでした/,'Original comparison must render every regional band part');
  }
  await page.locator('[data-comparison-back]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='ready');assert.equal(page.url(),url,'Comparison return must retain the original point, topic and camera');
  assert.equal(await page.locator('.maplibregl-popup').count(),0);
  bandsChecks.push({region:'south-asia',kind,interval,point,originalPointValue:value,reloadRetainsURL:true,comparisonRetainsURL:true});
 }
 record('South/Central rainfall 250mm and elevation 500m bands use aligned legends in all three focus views; original point values survive reload and comparison');
 return {profile:profile.name,passed:true,checks,extentChecks,bandsChecks};
}
