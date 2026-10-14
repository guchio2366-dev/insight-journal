import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const output=process.env.OCEANIA_REVIEW_OUTPUT??'/tmp/oceania-industry-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.OCEANIA_CHROMIUM??'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const context=await browser.newContext({deviceScaleFactor:1});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const route=process.env.OCEANIA_REVIEW_URL??'http://localhost:4321/insight-journal/atlas/oceania/industry/';
const report={route,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sandboxRequired:true,browserVersion:browser.version(),viewports:[],checks:[],screenshots:[],errors};
const settle=async()=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
const geometry=()=>page.locator('[data-primary-map] [data-oceania-product-label]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.oceaniaProductLabel,box:n.dataset.labelBox})));
async function audit(){
 await settle();const data=await page.evaluate(()=>{
  const r=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
  const map=document.querySelector('[data-primary-map]'),labels=[...map.querySelectorAll('[data-oceania-product-label]')].filter(n=>getComputedStyle(n.closest('[data-oceania-product-mark]')).display!=='none').map(n=>({id:n.dataset.oceaniaProductLabel,box:r(n.querySelector('rect')),text:r(n.querySelector('text'))}));
  return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,countryNames:[...map.querySelectorAll('[data-catalog-country-names] text')].map(r),map:r(map),stats:r(document.querySelector('[data-oceania-industry-statistics]')),labels,viewBox:map.querySelector('svg').getAttribute('viewBox')};
 });
 assert.equal(data.overflow,false,'No horizontal overflow');
 assert(data.stats.y>=data.map.bottom,'Statistics below map');
 for(const [i,a]of data.labels.entries()){
  assert(a.box.x>=data.map.x-1&&a.box.y>=data.map.y-1&&a.box.right<=data.map.right+1&&a.box.bottom<=data.map.bottom+1,'Annotation stays inside map: '+a.id);
  assert(a.text.right<=a.box.right+1,'Industry name fits: '+a.id);
  for(const n of data.countryNames)assert(!(a.box.x<n.right&&a.box.right>n.x&&a.box.y<n.bottom&&a.box.bottom>n.y),'Country names remain clear');
  for(const b of data.labels.slice(i+1))assert(!(a.box.x<b.box.right&&a.box.right>b.box.x&&a.box.y<b.box.bottom&&a.box.bottom>b.box.y),'No label overlap');
 }
 return data;
}
try{
 for(const [width,height]of [[1920,1080],[1896,996],[390,844]]){
  await page.setViewportSize({width,height});await page.goto(route,{waitUntil:'networkidle'});await settle();
  await page.locator('[data-oceania-ready=true]').waitFor();
  const initial=await audit(),fixed=await geometry();assert.equal(fixed.length,18);assert.equal(initial.labels.length,18);
  assert.equal(await page.locator('[data-primary-map] circle[data-oceania-mine-tags]').count(),347,'Existing mine inventory retained');
  assert.equal(await page.locator('[data-primary-map] [data-oceania-industry-location]').count(),8,'Existing guide inventory retained');
  const options=await page.locator('[data-oceania-product] option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(v=>v!=='all'));
  assert.equal(options.length,18);
  await page.screenshot({path:path.join(output,`${width}-initial.png`)});report.screenshots.push(`${width}-initial.png`);
  for(const id of options){
   await page.locator('[data-oceania-product]').selectOption(id);await settle();await page.locator(`[data-primary-map] [data-oceania-product-label=${id}]`).click();await settle();
   assert.deepEqual(await geometry(),fixed,'Selection keeps label positions');
   assert.equal(await page.locator('[data-primary-map] svg').getAttribute('viewBox'),initial.viewBox);
   assert.equal(new URL(page.url()).searchParams.get('product'),id);
   assert((await page.locator('[data-theme-title]').textContent()).length>0);
   assert((await page.locator('[data-catalog-stat=scale] [data-catalog-stat-copy]').textContent()).length>20);
   await audit();
  }
  await page.locator('[data-oceania-product]').selectOption('nickel');await settle();await page.screenshot({path:path.join(output,`${width}-nickel.png`)});report.screenshots.push(`${width}-nickel.png`);
  await page.locator('[data-oceania-product-only]').click();assert.equal((await audit()).labels.length,1);assert.deepEqual(await geometry(),fixed);
  await page.reload({waitUntil:'networkidle'});await settle();assert.equal(await page.locator('[data-oceania-product]').inputValue(),'nickel');assert.equal((await audit()).labels.length,1);
  await page.locator('[data-oceania-product-only]').click();await settle();assert.equal((await audit()).labels.length,18);
  await page.locator('[data-oceania-product-clear]').click();await settle();assert.equal(await page.locator('[data-oceania-product]').inputValue(),'all');assert.deepEqual(await geometry(),fixed);
  await page.goBack();await settle();assert.equal(await page.locator('[data-oceania-product]').inputValue(),'nickel');
  await page.goForward();await settle();assert.equal(await page.locator('[data-oceania-product]').inputValue(),'all');
  for(const sector of ['resources','manufacturing','services']){await page.locator(`[data-industry-sector=${sector}]`).click();await settle();assert.deepEqual(await geometry(),fixed);assert.equal(await page.locator('[data-primary-map] svg').getAttribute('viewBox'),initial.viewBox);await audit();}
  await page.locator('[data-oceania-product-clear]').click();await settle();
  await page.locator('[data-primary-map] [data-oceania-product-label=uranium]').focus();await page.keyboard.press('Enter');await settle();assert.equal(await page.locator('[data-oceania-product]').inputValue(),'uranium');assert.deepEqual(await geometry(),fixed);
  await page.locator('[data-oceania-product]').selectOption('dairy');await settle();await page.locator('[data-oceania-industry-statistics]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-dairy-statistics.png`)});report.screenshots.push(`${width}-dairy-statistics.png`);
  report.viewports.push({width,height,labels:18,products:18,map:initial.map,statistics:initial.stats,checks:['initial overview','18 selections','fixed labels and camera','explicit only','reload','clear','history','3 sectors','keyboard','statistics below map','no horizontal overflow']});
 }
 assert.deepEqual(errors,[]);
 report.checks.push('No page errors; source-backed 347 mines and 8 existing guides retained; all 18 products visible and operable; labels fit and do not overlap.');
 await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
