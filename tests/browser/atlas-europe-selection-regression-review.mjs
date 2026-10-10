// Use an existing local production preview. Set EUROPE_SELECTION_EXPECT=old only
// to record the two pre-fix reproductions; the default asserts corrected behavior.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const base=new URL(process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4173/insight-journal/');
assert.equal(base.protocol,'http:');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname));
const old=process.env.EUROPE_SELECTION_EXPECT==='old';
const repository=fileURLToPath(new URL('../../',import.meta.url));
const provenance={
  capturedAt:new Date().toISOString(),
  gitHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repository,encoding:'utf8'}).trim(),
  gitSrcTree:execFileSync('git',['rev-parse','HEAD:src'],{cwd:repository,encoding:'utf8'}).trim(),
};
const output=process.env.EUROPE_REVIEW_OUTPUT??`/tmp/europe-selection-${old?'before':'after'}`;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const records=[];
const profiles=[{name:'desktop',viewport:{width:1440,height:1000}},{name:'laptop',viewport:{width:1280,height:800}}];
async function ready(page,render){
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  if(render==='auto')await page.locator('[data-eu-live].is-ready').waitFor();
  else await page.waitForFunction(()=>getComputedStyle(document.querySelector('[data-eu-static]')).visibility==='visible');
}
async function followComparison(page,id){
  const link=page.locator(`[data-eu-comparison-link="${id}"]`);
  if(!old){
    const menu=page.locator('[data-eu-comparison-aux]');
    await menu.waitFor({state:'visible'});
    if(!(await menu.evaluate(node=>node.open)))await menu.locator('summary').click();
    assert.equal(await menu.evaluate(node=>node.open),true);
    await link.waitFor({state:'visible'});
  }
  await link.click();
}
async function snapshot(page,name){
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${output}/${name}.png`,fullPage:true});
}
async function drainageState(page){return page.evaluate(()=>({
  basin:new URL(location.href).searchParams.get('basin'),
  choice:document.querySelector('[data-eu-drainage-choice]').value,
  outline:document.querySelector('[data-eu-drainage-selection]').style.display!=='none',
  summary:document.querySelector('[data-eu-basin-summary]').textContent,
  result:document.querySelector('[data-eu-subject-result]').textContent,
  comparison:document.querySelector('[data-eu-comparison-link="drainage-density"]').href,
}));}
async function drainageFeedback(page){
  assert.equal(await page.locator('[data-eu-subject-grid]').count(),1);
  assert.equal(await page.locator('[data-eu-subject-result]').count(),1);
  assert.equal(await page.locator('[data-eu-subject-result]').isVisible(),true);
  const placement=await page.evaluate(()=>{
    const controls=document.querySelector('[data-eu-drainage-controls]');
    const choice=controls.querySelector('[data-eu-drainage-choice]').getBoundingClientRect();
    const summary=controls.querySelector('[data-eu-basin-summary]');
    const grid=document.querySelector('[data-eu-subject-grid]');
    const result=document.querySelector('[data-eu-subject-result]');
    return {insideControls:grid.parentElement===controls,afterSummary:summary.nextElementSibling===grid,
      gridGap:grid.getBoundingClientRect().top-summary.getBoundingClientRect().bottom,
      resultGap:result.getBoundingClientRect().top-choice.bottom,live:result.getAttribute('aria-live'),
      fontSize:parseFloat(getComputedStyle(result).fontSize),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth||controls.scrollWidth>controls.clientWidth+1};
  });
  assert.equal(placement.insideControls,true);assert.equal(placement.afterSummary,true);
  assert.ok(placement.gridGap>=0&&placement.gridGap<=24,JSON.stringify(placement));
  assert.ok(placement.resultGap>=0&&placement.resultGap<=180,JSON.stringify(placement));
  assert.equal(placement.live,'polite');
  assert.ok(placement.fontSize>=14,JSON.stringify(placement));assert.equal(placement.horizontalOverflow,false);
  return placement;
}
async function settled(page,pattern){
  await page.waitForFunction(pattern=>{
    const node=document.querySelector('[data-eu-subject-result]');
    return node&&!node.hasAttribute('aria-busy')&&new RegExp(pattern).test(node.textContent);
  },pattern);
  return page.locator('[data-eu-subject-result]').textContent();
}
try{
 for(const profile of profiles){
  const context=await browser.newContext({viewport:profile.viewport,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>new URL(route.request().url()).hostname===base.hostname?route.continue():route.abort());
  for(const render of ['auto','static']){
   const suffix=render==='static'?'&render=static':'';
   await page.goto(new URL(`atlas/europe/nature/?layer=drainage${suffix}`,base).href,{waitUntil:'networkidle'});await ready(page,render);
   const basin=await page.locator('[data-eu-drainage-choice] option').evaluateAll(nodes=>nodes.find(node=>node.value)?.value);
   assert.ok(basin);await page.locator('[data-eu-drainage-choice]').selectOption(basin);
   await page.waitForFunction(()=>document.querySelector('[data-eu-drainage-selection]').style.display!=='none');
   const drainageSelected=await drainageState(page);
   const feedbackSelected=old?null:await drainageFeedback(page);
   await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
   const bounds=await page.locator('.eu-map-stage').boundingBox();assert.ok(bounds);
   // Both renderers letterbox the published extent. The left margin is outside
   // longitude -25, and the real map event must produce the out-of-range message.
   const outsideClick={x:bounds.x+8,y:bounds.y+bounds.height*.2};
   await page.mouse.click(outsideClick.x,outsideClick.y);
   await settled(page,'表示範囲外');
   const drainageAfter=await drainageState(page);
   const feedbackOutside=old?null:await drainageFeedback(page);
   if(old){assert.equal(drainageAfter.basin,basin);assert.equal(drainageAfter.choice,basin);assert.equal(drainageAfter.outline,true);}
   else{
    assert.equal(drainageAfter.basin,null);assert.equal(drainageAfter.choice,'');assert.equal(drainageAfter.outline,false);
    const comparison=new URL(drainageAfter.comparison);assert.equal(comparison.searchParams.has('basin'),false);
    const origin=new URLSearchParams(comparison.searchParams.get('europeReturn')??'');assert.equal(origin.has('basin'),false);
   }
   await snapshot(page,`${profile.name}-${render}-drainage-outside`);
   let feedbackValue=null;
   if(!old){
    await page.goBack();await ready(page,render);
    await page.waitForFunction(basin=>new URL(location.href).searchParams.get('basin')===basin&&document.querySelector('[data-eu-drainage-selection]').style.display!=='none',basin);
    await page.goForward();await ready(page,render);
    assert.equal((await drainageState(page)).basin,null);assert.equal((await drainageState(page)).outline,false);
    await page.reload({waitUntil:'networkidle'});await ready(page,render);assert.equal((await drainageState(page)).choice,'');assert.equal((await drainageState(page)).outline,false);
    await drainageFeedback(page);
    await page.locator('[data-eu-feature-select="rhine"]').click();
    const value=await settled(page,'表示格子中心.*BasinATLAS');
    assert.ok(new URL(page.url()).searchParams.get('basin'));assert.doesNotMatch(value,/データなし/);
    feedbackValue={value,...await drainageFeedback(page)};
   }
   await page.goto(new URL(`atlas/europe/population/?layer=density${suffix}`,base).href,{waitUntil:'networkidle'});await ready(page,render);
   // The annotations expose the real projected London point in both renderers.
   // Read its position only; use a real mouse event on the map rather than state injection.
   const londonPixel=await page.evaluate(()=>{
    const overlay=document.querySelector('[data-eu-annotations]');
    const buttons=[...overlay.querySelectorAll('button[data-eu-map-place]')];
    const index=buttons.findIndex(node=>node.textContent==='ロンドン'&&node.dataset.euMapKind==='feature');
    if(index<0)throw new Error('London feature annotation missing');
    const dot=overlay.querySelectorAll('.eu-label-dot')[index],r=dot.getBoundingClientRect();
    return {x:r.x+r.width/2,y:r.y+r.height/2};
   });
   await page.mouse.click(londonPixel.x,londonPixel.y);
   const density=await settled(page,'（2020）');
   const sourceUrl=page.url(),sourcePoint=new URL(sourceUrl).searchParams.get('point');assert.ok(sourcePoint);
   const [lng,lat]=sourcePoint.split(',').map(Number);assert.ok(Math.abs(lng+.1187)<.3&&Math.abs(lat-51.5019)<.3,`London click: ${sourcePoint}`);
   await followComparison(page,'population-terrain');
   await page.waitForURL('**/nature/**');await ready(page,render);const targetValue=await settled(page,'（ETOPO 2022）');
   const target={url:page.url(),point:new URL(page.url()).searchParams.get('point'),feature:new URL(page.url()).searchParams.get('feature'),value:targetValue,heading:await page.locator('[data-eu-feature-card]').textContent()};
   assert.equal(target.feature,'alps');assert.match(target.heading,/アルプス/);
   if(old)assert.equal(target.point,sourcePoint,'Old build reproduces London value under Alps explanation');
   else{
    assert.equal(target.point,'9.5,46.6');assert.match(target.value,/：2,283 m（ETOPO 2022）$/);
    assert.equal(await page.locator('[data-eu-selected-point]:visible').count(),1);
    await page.reload({waitUntil:'networkidle'});await ready(page,render);assert.equal(await settled(page,'（ETOPO 2022）'),targetValue);
   }
   await snapshot(page,`${profile.name}-${render}-population-to-alps`);
   await page.locator('[data-eu-comparison-return]').click();await page.waitForURL('**/population/**');await ready(page,render);
   const returned=await settled(page,'（2020）');assert.equal(new URL(page.url()).searchParams.get('point'),sourcePoint);assert.equal(returned,density);
   if(!old){
    await page.goBack();await ready(page,render);assert.equal(await settled(page,'（ETOPO 2022）'),targetValue);
    await page.goForward();await ready(page,render);assert.equal(await settled(page,'（2020）'),density);
   }
   records.push({profile:profile.name,render,expect:old?'old defects reproduced':'fixed',drainageSelected,drainageAfter,feedbackSelected,feedbackOutside,feedbackValue,outsideClick,londonPixel,sourcePoint,density,target,returned});
   await writeFile(`${output}/results.json`,JSON.stringify({preview:base.href,...provenance,records,errors},null,2));
   console.log(JSON.stringify({profile:profile.name,render,old,basin,afterBasin:drainageAfter.basin,sourcePoint,targetPoint:target.point,targetValue}));
  }
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close();}
