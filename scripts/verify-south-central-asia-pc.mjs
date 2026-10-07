import assert from 'node:assert/strict';

// Uses the existing CI's guarded, normally sandboxed browser and local build.
export const southCentralProfiles=[
 {name:'south-desktop',viewport:{width:1536,height:864}},
 {name:'south-laptop',viewport:{width:1280,height:720}},
 {name:'south-small',viewport:{width:1024,height:768}},
];
export const southCentralImageCount=10*southCentralProfiles.length;

export async function verifySouthCentralAsia(page,{source,profile,capture}){
 const checks=[];
 const record=name=>checks.push({name,passed:true});
 const ready=()=>page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);
 const open=async(route)=>{await page.goto(source+`/atlas/asia/${route}`,{waitUntil:'domcontentloaded'});await ready();await page.waitForLoadState('networkidle');};
 const screenshot=async id=>{await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);});await capture(page,profile,id,'asia');};
 const story=async id=>{const picker=page.locator('[data-place-story]');await picker.selectOption(id);await page.waitForFunction(id=>new URL(location.href).searchParams.get('story')===id,id);await page.waitForLoadState('networkidle');};
 const scope=()=>page.locator('[data-country-select] option').evaluateAll(nodes=>nodes.filter(n=>n.value&&!n.disabled&&!n.hidden).map(n=>n.value));

 await open('south-central-asia/industry/');
 assert.equal(new URL(page.url()).searchParams.get('place'),null);
 assert.deepEqual(await scope(),['IND']);
 await page.locator('[data-focus-reading]').waitFor({state:'visible'});
 assert.match(await page.locator('[data-focus-reading-body]').textContent(),/グジャラート.*アナンド.*カルナータカ.*ベンガルール.*ウズベキスタン/s);
 const config=await page.locator('[data-asia-config]').evaluate(n=>JSON.parse(n.textContent));
 assert.deepEqual(Object.keys(config.focusReadings).sort(),['agriculture','industry','natural','population']);
 assert.equal(config.countries.length,13);assert(config.contentExtent.every(Number.isFinite));
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
 return {profile:profile.name,passed:true,checks};
}
