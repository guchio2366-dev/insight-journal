import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {europeIndustryInSector,europeIndustrySectorCopy} from '../../src/lib/atlas-europe-industry.ts';
import {europeReadings} from '../../src/data/atlas/europe/readings.ts';
const base=process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4331/insight-journal/';
const output=process.env.EUROPE_INDUSTRY_OUTPUT??'/tmp/europe-industry-readability';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const checks=[];
try{
 for(const viewport of [{width:1920,height:1080},{width:390,height:844},{width:844,height:390}])for(const renderer of ['auto','static']){
  const context=await browser.newContext({viewport,deviceScaleFactor:1}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('atlas/europe/industry/?render='+renderer,base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  await page.evaluate(()=>document.fonts.ready);if(renderer==='auto')await page.locator('.eu-live-map.is-ready').waitFor();
  const settle=async()=>{await page.waitForTimeout(220);};
  const snapshot=()=>page.evaluate(()=>({frame:document.querySelector('[data-eu-static]').getAttribute('viewBox'),labels:Object.fromEntries([...document.querySelectorAll('[data-eu-map-kind="feature"][data-eu-industry]')].filter(n=>!n.hidden).map(n=>[n.dataset.euMapPlace,[n.style.transform,n.offsetWidth,n.offsetHeight]]))}));
  for(const sector of ['resources','manufacturing','services']){
   await page.locator('[data-eu-industry-product-menu]').evaluate(n=>n.open=false);
   await page.locator(`button[data-eu-industry-sector="${sector}"]`).click();await settle();
   assert.equal(await page.locator('[data-eu-industry-group]:visible').count(),0,'choices stay folded outside the map');
   const result=await page.evaluate(()=>{
    const stage=document.querySelector('.eu-map-stage'),box=stage.getBoundingClientRect();
    const points=[...document.querySelectorAll('[data-eu-map-kind="feature"][data-eu-industry]')].filter(n=>!n.hidden);
    const labels=points.filter(n=>!n.classList.contains('is-point-only')).map(n=>({id:n.dataset.euMapPlace,r:n.getBoundingClientRect()}));
    const leaders=[...document.querySelectorAll('[data-eu-annotations] .eu-label-leader')].filter(n=>n.style.display!=='none').map(n=>Math.hypot(+n.getAttribute('x2')-n.getAttribute('x1'),+n.getAttribute('y2')-n.getAttribute('y1')));
    return {width:document.documentElement.scrollWidth,points:points.map(n=>n.dataset.euMapPlace),labels:labels.length,labelArea:labels.reduce((s,n)=>s+n.r.width*n.r.height,0)/(box.width*box.height),maxLeader:Math.max(0,...leaders),keyInside:!!stage.querySelector('[data-eu-inline-industry-key]'),choicesInside:stage.querySelectorAll('[data-eu-industry-group]').length,titleInside:!!stage.querySelector('.eu-map-heading'),legend:[...document.querySelectorAll('[data-eu-industry-key-item]')].filter(n=>!n.hidden).map(n=>n.dataset.euIndustryKeyItem),outside:labels.filter(({r})=>r.left<box.left||r.right>box.right||r.top<box.top||r.bottom>box.bottom).map(n=>n.id),overlaps:labels.flatMap((a,i)=>labels.slice(i+1).filter(b=>a.r.left<b.r.right&&a.r.right>b.r.left&&a.r.top<b.r.bottom&&a.r.bottom>b.r.top).map(b=>[a.id,b.id]))};
   });
   const expected=europeReadings.filter(p=>p.field==='industry'&&europeIndustryInSector(p.id,sector)).map(p=>p.id).sort();
   assert.deepEqual(result.points.sort(),expected,'only this sector, with every verified source point retained');
   assert.deepEqual([...result.legend].sort(),[...europeIndustrySectorCopy[sector].groups].sort());
   assert.ok(result.maxLeader<=24.01);assert.ok(result.labels>=3);assert.ok(result.labelArea<(viewport.width<900?.08:.035));
   assert.equal(result.keyInside,false);assert.equal(result.titleInside,false);assert.equal(result.choicesInside,0);
   assert.deepEqual(result.overlaps,[]);assert.deepEqual(result.outside,[]);assert.ok(result.width<=viewport.width+1);
   await page.locator('.eu-map-stage').scrollIntoViewIfNeeded();
   const file=`${viewport.width}-${viewport.height}-${renderer}-${sector}.png`;await page.screenshot({path:path.join(output,file)});
   await page.locator('[data-eu-industry-product-menu]').evaluate(n=>n.open=true);await settle();
   await page.locator('[data-eu-industry-all]').click();await settle();const fixed=await snapshot();
   for(const group of europeIndustrySectorCopy[sector].groups){
    await page.locator(`[data-eu-industry-group="${group}"]`).click();await settle();assert.deepEqual(await snapshot(),fixed,'selection moves the map or a reserved label');
    assert.equal(await page.locator('[data-eu-industry-evidence]:visible').getAttribute('data-eu-industry-evidence'),group);
   }
   await page.locator('[data-eu-single]').click();await settle();const solo=await snapshot();assert.equal(solo.frame,fixed.frame);for(const[id,slot]of Object.entries(solo.labels))assert.deepEqual(slot,fixed.labels[id]);
   await page.locator('[data-eu-return-multi]').click();await settle();assert.deepEqual(await snapshot(),fixed);
   const choice=page.locator('[data-eu-feature-choice]');const site=await choice.locator('option').nth(1).getAttribute('value');await choice.selectOption(site);await settle();assert.deepEqual(await snapshot(),fixed);
   checks.push({viewport,renderer,sector,...result,screenshot:file});await writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2)+'\n');console.log(JSON.stringify({viewport,renderer,sector,labels:result.labels,points:result.points.length,labelArea:result.labelArea,maxLeader:result.maxLeader}));
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2)+'\n');
}finally{await browser.close();}
