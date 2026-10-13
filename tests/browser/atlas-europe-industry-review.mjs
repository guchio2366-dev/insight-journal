import {europeIndustrySectorCopy} from '../../src/lib/atlas-europe-industry.ts';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const base=process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4322/insight-journal/';
const output=process.env.EUROPE_INDUSTRY_OUTPUT??'docs/review/europe-industry-2026-10-12/images';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const result={viewport:{width:1920,height:1080},deviceScaleFactor:1,checks:[],screenshots:[]};
try{
 for(const renderer of ['auto','static']){
  const context=await browser.newContext({viewport:result.viewport,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('atlas/europe/industry/?layer=hubs'+(renderer==='static'?'&render=static':''),base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  await page.evaluate(()=>document.fonts.ready);
  if(renderer==='auto')await page.locator('.eu-live-map.is-ready').waitFor();
  await page.waitForTimeout(600);
  const release=await page.request.get(new URL('_release.json',base).href);result.release=await release.json();
  if(process.env.EUROPE_REVIEW_EXPECTED_HEAD)assert.equal(result.release.commitSha,process.env.EUROPE_REVIEW_EXPECTED_HEAD);
  const settle=async()=>{await page.waitForTimeout(180);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
  const snapshot=()=>page.evaluate(()=>({frame:document.querySelector('[data-eu-static]').getAttribute('viewBox'),labels:Object.fromEntries([...document.querySelectorAll('[data-eu-map-kind="feature"][data-eu-industry]')].filter(n=>!n.hidden).map(n=>[n.dataset.euMapPlace,{transform:n.style.transform,w:n.offsetWidth,h:n.offsetHeight}])),geography:document.querySelector('[data-europe-detail]').dataset.euGeography,render:document.querySelector('[data-eu-live]').classList.contains('is-ready')?'live':'static'}));
  const stable=(before,after)=>{assert.equal(after.frame,before.frame);for(const [id,rect] of Object.entries(after.labels))assert.deepEqual(rect,before.labels[id],id+' moves during selection');};
  const capture=async name=>{await page.screenshot({path:path.join(output,renderer+'-'+name+'.png')});result.screenshots.push(renderer+'-'+name+'.png');};
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[data-eu-industry-sector="${sector}"]`).click();await settle();
   assert.equal(new URL(page.url()).searchParams.get('industrySector'),sector);
   assert.equal(new URL(page.url()).searchParams.has('feature'),false);
   assert.equal(new URL(page.url()).searchParams.has('place'),false);
   const initial=await snapshot();assert.equal(initial.geography,'detailed');
   if(renderer==='auto')assert.equal(initial.render,'live');
   const labels=await page.locator('[data-eu-map-kind="feature"][data-eu-industry]:visible').count();assert.ok(labels>=9);
   const overlaps=await page.evaluate(()=>{const labels=[...document.querySelectorAll('[data-eu-map-kind="feature"][data-eu-industry]:not(.is-point-only)')].filter(n=>!n.hidden).map(n=>({id:n.dataset.euMapPlace,r:n.getBoundingClientRect()}));return labels.flatMap((a,i)=>labels.slice(i+1).filter(b=>a.r.left<b.r.right&&a.r.right>b.r.left&&a.r.top<b.r.bottom&&a.r.bottom>b.r.top).map(b=>[a.id,b.id]));});assert.deepEqual(overlaps,[]);
   for(const id of europeIndustrySectorCopy[sector].labels)assert.equal(await page.locator(`[data-eu-map-place="${id}"][data-eu-map-kind="feature"]:not(.is-point-only)`).isVisible(),true,id+' required name');
   await capture(sector+'-initial');
   const pointer=page.locator('[data-eu-map-kind="feature"][data-eu-industry]:not(.is-point-only):visible').first();
   await pointer.click();await settle();stable(initial,await snapshot());
   await pointer.click();await settle();stable(initial,await snapshot());
   await page.locator('[data-eu-industry-all]').click();await settle();
   const groups=await page.locator('[data-eu-industry-group]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.euIndustryGroup));
   await page.locator('[data-eu-industry-all]').focus();await page.keyboard.press('ArrowRight');await settle();stable(initial,await snapshot());
   assert.equal(new URL(page.url()).searchParams.get('industryGroup'),groups[0]);
   await page.keyboard.press('Escape');await settle();assert.equal(new URL(page.url()).searchParams.has('industryGroup'),false);
   const visited=new Set();
   for(const group of groups){
    await page.locator(`[data-eu-industry-group="${group}"]`).click();await settle();stable(initial,await snapshot());
    assert.equal(await page.locator('[data-eu-single]').isVisible(),true);
    const ids=await page.locator('[data-eu-map-kind="feature"][data-eu-industry]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.euMapPlace));
    for(const id of ids.filter(id=>!visited.has(id))){
     visited.add(id);
     // Direct click dispatch also covers point-only buttons without hover changing hit boxes.
     await page.locator(`[data-eu-map-place="${id}"][data-eu-map-kind="feature"]`).evaluate(node=>node.click());await settle();stable(initial,await snapshot());
     assert.equal(new URL(page.url()).searchParams.get('feature'),id);
     assert.ok((await page.locator('[data-eu-feature-card]').textContent()).length>40);
     const reader=await page.locator('.eu-read-panel').evaluate(n=>{n.scrollTop=n.scrollHeight;return {reachable:n.scrollTop+n.clientHeight>=n.scrollHeight-2,sources:n.querySelectorAll('[data-eu-feature-card] a[href^="https://"]').length};});assert.equal(reader.reachable,true);assert.ok(reader.sources>0);
    }
    await page.locator(`[data-eu-industry-group="${group}"]`).click();await settle();
    await page.locator('[data-eu-single]').click();await settle();stable(initial,await snapshot());
    assert.equal(new URL(page.url()).searchParams.get('industryOnly'),'1');
    if(group===groups[0]){
     await page.reload({waitUntil:'networkidle'});if(renderer==='auto')await page.locator('.eu-live-map.is-ready').waitFor();await page.waitForTimeout(600);await settle();stable(initial,await snapshot());
     await page.locator('[data-eu-return-multi]').click();await settle();stable(initial,await snapshot());
     await page.goBack();await settle();assert.equal(new URL(page.url()).searchParams.get('industryOnly'),'1');stable(initial,await snapshot());
     await page.goForward();await settle();stable(initial,await snapshot());
    }else{await page.locator('[data-eu-return-multi]').click();await settle();stable(initial,await snapshot());}
   }
   await page.locator('[data-eu-industry-all]').click();await settle();stable(initial,await snapshot());
   assert.equal(new URL(page.url()).searchParams.has('industryGroup'),false);
   result.checks.push({renderer,sector,groups:groups.length,labels,initial});
   console.log(JSON.stringify({renderer,sector,groups:groups.length,labels}));
  }
  await page.locator('[data-eu-industry-sector="manufacturing"]').click();await settle();
  await page.locator('[data-eu-industry-group="航空機"]').click();await settle();await capture('manufacturing-aircraft');
  await page.locator('[data-eu-single]').click();await settle();await capture('manufacturing-aircraft-only');
  assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(path.join(output,'checks.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({checks:result.checks.length,screenshots:result.screenshots.length,release:result.release}));
}finally{await browser.close();}
