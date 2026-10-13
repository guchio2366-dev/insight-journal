import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4322/insight-journal/';
const output=process.env.EUROPE_REMAINDER_OUTPUT??'docs/review/europe-2026-10-13/images';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const records=[];
try{
 for(const renderer of ['auto','static']){
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const release=await(await page.request.get(new URL('_release.json',base).href)).json();if(process.env.EUROPE_REVIEW_EXPECTED_HEAD)assert.equal(release.commitSha,process.env.EUROPE_REVIEW_EXPECTED_HEAD);
  const open=async(field,layer)=>{await page.goto(new URL(`atlas/europe/${field}/?layer=${layer}${renderer==='static'?'&render=static':''}`,base).href,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('[data-europe-detail]').dataset.initialized==='true');if(renderer==='auto')await page.locator('.eu-live-map.is-ready').waitFor();await page.waitForTimeout(600);};
  const settle=async()=>{await page.waitForTimeout(220);};
  const positions=()=>page.locator('.eu-river-label:visible').evaluateAll(ns=>ns.map(n=>({id:n.dataset.euRiverLabel,left:n.style.left,top:n.style.top})));
  const capture=async(name)=>{await page.screenshot({path:path.join(output,renderer+'-'+name+'.png')});};
  await open('nature','drainage');const initial=await positions();assert.equal(initial.length,7);assert.equal(await page.locator('[data-eu-map-kind=feature]:visible').count(),0,'no duplicate river point labels');const frame=await page.locator('[data-eu-static]').getAttribute('viewBox');await capture('drainage-initial');
  for(const id of ['rhine','danube','seine','thames','don','volga','ural']){
   await page.locator(`[data-eu-river-label="${id}"]`).click();await settle();
   assert.equal(new URL(page.url()).searchParams.get('riverBasin'),id);assert.deepEqual(await positions(),initial);assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),frame);
   const missing=['thames','ural'].includes(id);if(missing){assert.equal(new URL(page.url()).searchParams.has('basin'),false);assert.equal(await page.locator('[data-eu-drainage-selection]').evaluate(n=>n.style.display),'none');assert.match(await page.locator('[data-eu-basin-summary]').textContent(),/未収録/);}else{await page.waitForFunction(()=>document.querySelector('[data-eu-drainage-selection]').style.display!=='none');assert.match(await page.locator('[data-eu-basin-summary]').textContent(),/全流域ではありません/);}
  }
  await capture('ural-no-false-polygon');
  await page.locator('[data-eu-main-river-choice]').selectOption('danube');await settle();await page.waitForFunction(()=>document.querySelector('[data-eu-drainage-selection]').style.display!=='none');await capture('danube-retained-outline');
  await page.reload({waitUntil:'networkidle'});if(renderer==='auto')await page.locator('.eu-live-map.is-ready').waitFor();await page.waitForTimeout(600);assert.equal(await page.locator('[data-eu-main-river-choice]').inputValue(),'danube');assert.deepEqual(await positions(),initial);
  await page.locator('[data-eu-main-river-clear]').click();await settle();await page.goBack();await settle();assert.equal(await page.locator('[data-eu-main-river-choice]').inputValue(),'danube');await page.goForward();await settle();assert.equal(await page.locator('[data-eu-main-river-choice]').inputValue(),'');
  const rivers={names:initial.map(x=>x.id),stableSelectionCameraAndLabels:true,missingThamesUralNotPainted:true,reloadHistory:true};
  await open('agriculture','livestock');const cattle=page.locator('[data-eu-map-place=cattle][data-eu-map-kind=crop]');assert.equal(await cattle.textContent(),'牛（乳用・肉用計）');const cow=await cattle.boundingBox(),chicken=await page.locator('[data-eu-map-place=chicken][data-eu-map-kind=crop]').boundingBox();assert.ok(cow.x+cow.width<=chicken.x||chicken.x+chicken.width<=cow.x||cow.y+cow.height<=chicken.y||chicken.y+chicken.height<=cow.y);
  const labels=()=>page.locator('.eu-crop-label:visible').evaluateAll(ns=>ns.map(n=>[n.dataset.euMapPlace,n.style.transform]));const all=await labels();await cattle.click();await settle();assert.deepEqual(await labels(),all);assert.equal(await page.locator('.eu-crop-label:visible').count(),4);assert.doesNotMatch(await page.locator('[data-eu-farming-regional-note]').textContent(),/四角|丸印/);await capture('livestock-cattle-selected');
  await open('agriculture','horticulture');assert.equal(await page.locator('.eu-crop-label:visible').count(),3);assert.match(await page.locator('[data-eu-farming-regional-note]').textContent(),/ブドウ.*オリーブ.*未収録/);assert.doesNotMatch(await page.locator('[data-eu-farming-regional-note]').textContent(),/四角|丸印/);await capture('horticulture');
  await open('population','language');await page.locator('[data-eu-language-regional] summary').click();await page.locator('[data-eu-language-daily] summary').click();assert.equal(await page.locator('[data-eu-language-regional] tbody tr').count(),8);assert.equal(await page.locator('[data-eu-language-daily] tbody tr').count(),10);assert.match(await page.locator('[data-eu-language-daily]').textContent(),/570人.*396人.*69%/);assert.match(await page.locator('[data-eu-language-daily]').textContent(),/全人口が分母ではありません/);assert.match(await page.locator('[data-eu-language-reader]').textContent(),/欧州全域.*未収録/);await page.locator('.eu-read-panel').evaluate(n=>n.scrollTop=n.scrollHeight);await page.evaluate(()=>window.scrollTo(0,0));await capture('language-supplement-scope');
  assert.deepEqual(errors,[]);records.push({renderer,release,rivers,cattleChickenNoCollision:true,farmingPeersAndLabelsRetained:true,regionalAndDailyLanguageRows:[8,10],viewport:{width:1920,height:1080,dpr:1},errors});await page.close();
 }
 await writeFile(path.join(output,'checks.json'),JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify({scenes:records.length,output}));
}finally{await browser.close();}
