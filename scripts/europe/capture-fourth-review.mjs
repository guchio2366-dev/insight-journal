import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const mode=process.argv[2]??'after';
const output=`docs/review/europe-2026-10-12/${mode}`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const records=[];
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const operations=[];
 for(const [field,layer] of [['nature','climate'],['agriculture','crops'],['agriculture','livestock'],['agriculture','horticulture'],['agriculture','treecover'],['nature','water'],['nature','drainage'],['nature','terrain'],['nature','contours'],['population','density'],['population','religion']]) {
  await page.goto(`http://127.0.0.1:4322/insight-journal/atlas/europe/${field}/?layer=${layer}`,{waitUntil:'networkidle'});
  await page.locator('.eu-live-map.is-ready').waitFor({timeout:30000});
  await page.waitForTimeout(300);
  await page.screenshot({path:`${output}/${layer}-1920.png`,animations:'disabled'});
  records.push({field,layer,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scale:visualViewport.scale,map:{width:document.querySelector('.eu-map-stage').clientWidth,height:document.querySelector('.eu-map-stage').clientHeight}})),labels:await page.locator('.eu-map-label:visible,.eu-terrain-place-label:visible,.eu-river-label:visible').allTextContents()});
  if(mode==='after'){
   assert.equal(await page.locator('.eu-map-buttons,[data-eu-city-hint]').count(),0);
   if(layer==='climate'){
    const positions=()=>page.locator('[data-eu-map-kind=city]:visible').evaluateAll(nodes=>nodes.map(n=>[n.dataset.euMapPlace,n.style.transform]));
    const original=await positions(),extent=await page.locator('[data-eu-static]').getAttribute('viewBox');
    assert.equal(await page.locator('[data-eu-map-kind=city][data-eu-map-place=lisbon]').isVisible(),true);
    await page.locator('[data-eu-map-kind=city][data-eu-map-place=london]').click();await page.waitForTimeout(150);
    assert.deepEqual(await positions(),original);assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),extent);
    await page.locator('[data-eu-map-kind=city][data-eu-map-place=london]').click();await page.waitForTimeout(100);assert.deepEqual(await positions(),original);
    await page.locator('[data-eu-city-choice]').selectOption('');await page.waitForTimeout(100);assert.deepEqual(await positions(),original);
    await page.goBack();await page.waitForTimeout(150);assert.deepEqual(await positions(),original);
    await page.goForward();await page.waitForTimeout(150);assert.deepEqual(await positions(),original);
    await page.reload({waitUntil:'networkidle'});await page.locator('.eu-live-map.is-ready').waitFor();assert.deepEqual(await positions(),original);
    operations.push({topic:'climate',selectRepeatClearHistoryReload:true,stableLabels:true,stableSvgExtent:true,lisbon:true});
   }
   if(['crops','livestock','horticulture'].includes(layer)){
    const positions=()=>page.locator('.eu-crop-label:visible').evaluateAll(nodes=>nodes.map(n=>[n.dataset.euMapPlace,n.style.transform]));
    const original=await positions(),id=original[0][0];
    await page.locator(`[data-eu-layer=${id}]`).click();await page.waitForTimeout(120);assert.deepEqual(await positions(),original);
    await page.locator('[data-eu-overview]').click();await page.waitForTimeout(120);assert.deepEqual(await positions(),original);
    assert.equal(await page.locator('[data-eu-farming-evidence]:visible').count(),0);
    operations.push({topic:layer,fixedProductLabels:true,selectClearOtherItemsRetained:true,noNationalTags:true});
   }
   if(['treecover','contours'].includes(layer)){
    await page.locator('.eu-map-stage').click({position:{x:650,y:400}});await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-eu-selected-point]').isVisible(),false);
    operations.push({topic:layer,noClickCircle:true});
   }
   if(layer==='religion')assert.equal(await page.locator('[data-eu-smre-marker]:visible').count(),0);
  }
 }
 assert.deepEqual(errors,[]);
 await writeFile(`${output}/checks.json`,JSON.stringify({baseHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}),records,operations,errors},null,2)+'\n');
 console.log(JSON.stringify({mode,views:records.length,errors}));
}finally {await browser.close();}
