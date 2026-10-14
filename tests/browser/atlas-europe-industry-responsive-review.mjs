import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4322/insight-journal/';
const output=process.env.EUROPE_INDUSTRY_OUTPUT??'/tmp/europe-industry-responsive';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const checks=[];
try{
 for(const viewport of [{width:390,height:844},{width:844,height:390}])for(const renderer of ['auto','static']){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(new URL('atlas/europe/industry/?render='+renderer,base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  await page.evaluate(()=>document.fonts.ready);if(renderer==='auto')await page.locator('.eu-live-map.is-ready').waitFor();
  const settle=async()=>{await page.waitForTimeout(180);};
  const snapshot=()=>page.evaluate(()=>({frame:document.querySelector('[data-eu-static]').getAttribute('viewBox'),labels:Object.fromEntries([...document.querySelectorAll('[data-eu-industry][data-eu-map-kind="feature"]')].filter(n=>!n.hidden).map(n=>[n.dataset.euMapPlace,[n.style.transform,n.offsetWidth,n.offsetHeight]]))}));
  const stable=(before,after)=>{assert.equal(before.frame,after.frame);for(const[id,box]of Object.entries(after.labels))assert.deepEqual(box,before.labels[id],id+' moves');};
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[data-eu-industry-sector="${sector}"]`).click();await settle();
   const before=await snapshot();
   const layout=await page.evaluate(()=>{
    const stage=document.querySelector('.eu-map-stage').getBoundingClientRect();
    const labels=[...document.querySelectorAll('[data-eu-industry][data-eu-map-kind="feature"]:not(.is-point-only)')].filter(n=>!n.hidden).map(n=>({id:n.dataset.euMapPlace,r:n.getBoundingClientRect()}));
    return {width:document.documentElement.scrollWidth,labels:labels.length,outside:labels.filter(({r})=>r.left<stage.left||r.right>stage.right||r.top<stage.top||r.bottom>stage.bottom).map(n=>n.id),overlaps:labels.flatMap((a,i)=>labels.slice(i+1).filter(b=>a.r.left<b.r.right&&a.r.right>b.r.left&&a.r.top<b.r.bottom&&a.r.bottom>b.r.top).map(b=>[a.id,b.id]))};
   });
   assert.ok(layout.width<=viewport.width+1,'document overflows');assert.ok(layout.labels>=4);assert.deepEqual(layout.outside,[]);assert.deepEqual(layout.overlaps,[]);
   await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(output,`${viewport.width}-${viewport.height}-${renderer}-${sector}.png`)});
   const groups=await page.locator('[data-eu-industry-group]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.euIndustryGroup));
   for(const group of groups){
    await page.locator(`[data-eu-industry-group="${group}"]`).click();await settle();stable(before,await snapshot());
    assert.equal(await page.locator('[data-eu-industry-evidence]:visible').getAttribute('data-eu-industry-evidence'),group);
    await page.locator('[data-eu-single]').click();await settle();stable(before,await snapshot());
    await page.locator('[data-eu-return-multi]').click();await settle();stable(before,await snapshot());
   }
   const select=page.locator('[data-eu-feature-choice]');assert.equal(await select.isVisible(),true);
   const first=await select.locator('option').nth(1).getAttribute('value');await select.selectOption(first);await settle();stable(before,await snapshot());assert.equal(new URL(page.url()).searchParams.get('feature'),first);
   await page.locator('[data-eu-industry-all]').click();await settle();
   checks.push({viewport,renderer,sector,groups:groups.length,layout});console.log(JSON.stringify(checks.at(-1)));
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2)+'\n');
}finally{await browser.close();}
