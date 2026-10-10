// Run against an already-built local preview. No deployment or browser download.
// EUROPE_REVIEW_CHROMIUM_PATH=/usr/bin/chromium node tests/browser/atlas-europe-elevation-review.mjs
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=new URL(process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4173/insight-journal/');
assert.equal(base.protocol,'http:');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname),'This review only accepts a local preview');
const output=process.env.EUROPE_REVIEW_OUTPUT??'/tmp/europe-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.EUROPE_REVIEW_CHROMIUM_PATH?{executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
const evidence=[];
const profiles=[{name:'desktop',viewport:{width:1440,height:1000}},{name:'laptop',viewport:{width:1280,height:800}}];
const result='[data-eu-subject-result]',marker='[data-eu-selected-point]';
async function settled(page){
  await page.waitForFunction(()=>{
    const value=document.querySelector('[data-eu-subject-result]');
    return value&&!value.hasAttribute('aria-busy')&&/（ETOPO 2022）/.test(value.textContent);
  });
  return page.locator(result).textContent();
}
async function ready(page,render){
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  if(render==='auto')await page.locator('[data-eu-live].is-ready').waitFor();
  else await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-eu-static]')).visibility==='visible');
}
async function followComparison(page,id){
  const menu=page.locator('[data-eu-comparison-aux]');
  await menu.waitFor({state:'visible'});
  if(!(await menu.evaluate(node=>node.open)))await menu.locator('summary').click();
  assert.equal(await menu.evaluate(node=>node.open),true);
  const link=menu.locator(`[data-eu-comparison-link="${id}"]`);
  await link.waitFor({state:'visible'});
  await link.click();
}
async function snapshot(page,name){
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true});
}
try{
  for(const profile of profiles){
    const context=await browser.newContext({...profile,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const render of ['auto','static']){
      const url=new URL(`atlas/europe/nature/?layer=terrain${render==='static'?'&render=static':''}`,base);
      await page.goto(url.href,{waitUntil:'networkidle'});await ready(page,render);
      const initialHistory=await page.evaluate(()=>history.length);
      const originalView=await page.locator('[data-eu-static]').getAttribute('viewBox');
      await page.locator('[data-eu-feature-select="alps"]').click();
      const terrain=await settled(page),savedPoint=new URL(page.url()).searchParams.get('point');
      assert.equal(savedPoint,'9.5,46.6');
      assert.match(terrain,/：[^：]+ m（ETOPO 2022）$/);
      assert.equal(await page.evaluate(()=>history.length),initialHistory+1,'One selection creates one history entry');
      assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),originalView,'Selection preserves the map extent');
      assert.equal(await page.locator(`${marker}:visible`).count(),1);
      assert.equal(await page.locator('.eu-read-panel [data-eu-subject-grid]').count(),1);
      assert.equal(await page.locator('[data-eu-subject-grid]').count(),1,'The value is not duplicated below the map');
      assert.equal(await page.locator('.eu-map-panel [data-eu-map-legend] [data-eu-subject-legend]').count(),1,'The single legend is under the map');
      await snapshot(page,`europe-${profile.name}-${render}-terrain`);

      await page.locator('[data-eu-topic="contours"]').click();
      assert.equal(await settled(page),terrain,'Terrain and contours show the same display-cell elevation');
      assert.match(await page.locator('[data-eu-legend-title]').textContent(),/500m間隔/);
      assert.doesNotMatch(await page.locator(result).textContent(),/間隔|標高 m/);
      assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),originalView);
      const swatches=await page.locator('[data-eu-legend-items] .eu-swatch').evaluateAll(nodes=>nodes.slice(0,2).map(node=>getComputedStyle(node).backgroundColor));
      assert.deepEqual(swatches,['rgb(184, 161, 130)','rgb(134, 103, 71)']);
      const font=await page.locator(result).evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
      assert.ok(font>=14,`Readable selection text: ${font}px`);
      const retainedCopy=await page.locator('[data-eu-subject-reader]').textContent();
      await snapshot(page,`europe-${profile.name}-${render}-contours`);

      await page.locator('[data-eu-topic="contours"]').focus();
      await page.keyboard.press('ArrowLeft');
      assert.equal(new URL(page.url()).searchParams.get('layer'),'terrain');
      assert.equal(await settled(page),terrain);
      await page.keyboard.press('ArrowRight');
      assert.equal(new URL(page.url()).searchParams.get('layer'),'contours');
      assert.equal(await settled(page),terrain);
      // Return to the original contour entry before testing the saved history.
      await page.goBack();await settled(page);await page.goBack();await settled(page);

      await page.goBack();await ready(page,render);assert.equal(await settled(page),terrain);
      assert.equal(new URL(page.url()).searchParams.get('layer'),'terrain');
      await page.goBack();await ready(page,render);
      await page.waitForFunction(()=>!new URL(location.href).searchParams.has('point')&&document.querySelector('[data-eu-subject-result]').textContent.startsWith('地図を押すと'));
      assert.equal(await page.locator(`${marker}:visible`).count(),0);
      await page.goForward();await ready(page,render);assert.equal(await settled(page),terrain);
      await page.goForward();await ready(page,render);assert.equal(await settled(page),terrain);
      await page.reload({waitUntil:'networkidle'});await ready(page,render);assert.equal(await settled(page),terrain);
      assert.equal(await page.locator('[data-eu-subject-reader]').textContent(),retainedCopy,'Reload retains the complete reader copy');

      await followComparison(page,'nature-density');
      await page.waitForURL('**/population/**');
      await page.locator('[data-eu-comparison-return]').waitFor();
      assert.match(await page.locator('[data-eu-comparison-return]').textContent(),/アルプス.*元の選択へ戻る/);
      assert.equal(new URL(page.url()).searchParams.get('point'),savedPoint);
      await page.locator('[data-eu-comparison-return]').click();
      await page.waitForURL('**/nature/**');await ready(page,render);
      assert.equal(await settled(page),terrain);assert.equal(new URL(page.url()).searchParams.get('point'),savedPoint);
      assert.equal(new URL(page.url()).searchParams.has('europeReturn'),false);

      // Exercise a real map click in each renderer, then restore it through history.
      await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
      const bounds=await page.locator('.eu-map-stage').boundingBox();assert.ok(bounds);
      const beforeClick=await page.evaluate(()=>history.length);
      await page.mouse.click(bounds.x+bounds.width*.43,bounds.y+bounds.height*.48);
      const clicked=await settled(page),clickedPoint=new URL(page.url()).searchParams.get('point');
      assert.notEqual(clickedPoint,savedPoint);assert.equal(new URL(page.url()).searchParams.has('feature'),false);
      assert.equal(await page.evaluate(()=>history.length),beforeClick+1);
      await page.goBack();assert.equal(await settled(page),terrain);
      await page.goForward();assert.equal(await settled(page),clicked);
      await page.reload({waitUntil:'networkidle'});await ready(page,render);assert.equal(await settled(page),clicked);
      await page.locator('[data-eu-render]').click();await ready(page,render==='auto'?'static':'auto');assert.equal(await settled(page),clicked);
      assert.equal(await page.locator(`${marker}:visible`).count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
      evidence.push({profile:profile.name,render,terrain,point:savedPoint,clickedPoint,clicked,selectedFontSize:font,checks:['same grid value','legend colours','no duplicate panel','one history entry','no camera refit','back to unselected','back/forward','reload','named comparison return','map click','renderer switch','no horizontal overflow'],screenshots:[`europe-${profile.name}-${render}-terrain.png`,`europe-${profile.name}-${render}-contours.png`]});
      assert.deepEqual(errors,[]);
    }
    // Capture the unchanged US reference with the same viewport and local build.
    await page.goto(new URL('atlas/north-america/nature/',base).href,{waitUntil:'networkidle'});
    await page.locator('[data-nature-mode="landform"]').click();
    await page.locator('[data-nature-label="landform:ロッキー山脈"]').click();
    await page.locator('[data-nature-detail]:visible').waitFor();
    await snapshot(page,`us-${profile.name}-landform`);
    await page.locator('[data-nature-mode="contour"]').click();
    await page.waitForFunction(()=>document.querySelector('button[data-nature-mode="contour"]').getAttribute('aria-selected')==='true');
    await page.waitForLoadState('networkidle');
    await snapshot(page,`us-${profile.name}-contours`);
    evidence.push({profile:profile.name,reference:'Unchanged US nature UI',contourRender:await page.locator('[data-atlas-explorer]').evaluate(node=>({renderState:node.dataset.renderState,natureLoad:node.dataset.natureLoad})),screenshots:[`us-${profile.name}-landform.png`,`us-${profile.name}-contours.png`]});
    await context.close();
  }
  await writeFile(`${output}/results.json`,JSON.stringify({preview:base.href,browser:await browser.version(),evidence},null,2));
  console.log(JSON.stringify({passed:true,profiles:profiles.map(profile=>profile.name),screenshots:12,output}));
}finally{await browser.close();}
