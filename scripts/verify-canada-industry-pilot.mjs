import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const pilot=JSON.parse(await readFile('src/data/atlas/canada/industry-pilot.json','utf8'));
const wait=async page=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
export async function verifyCanadaIndustryPilot({page,url,output,result}){
 const state=()=>page.locator('[data-ca-industry-pilot]').evaluate(r=>r.canadaIndustryView);
 const capture=async name=>{await wait(page);const metadata=await page.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {cssViewport:{width:innerWidth,height:innerHeight},browserZoom:visualViewport.scale,devicePixelRatio,documentZoom:getComputedStyle(document.documentElement).zoom,mapFrame:rect(document.querySelector('[data-ca-map-frame]')),statisticsColumns:[...document.querySelectorAll('.ca-pilot-stat-card')].map(rect),viewBox:document.querySelector('[data-ca-map]').getAttribute('viewBox'),labelCount:document.querySelectorAll('[data-ca-marker]').length,markCount:document.querySelectorAll('[data-ca-cluster]').length,labelsIncomplete:document.querySelector('[data-ca-industry-pilot]').dataset.labelsIncomplete??null};});await page.screenshot({path:path.join(output,name+'.png')});result.screenshots.push({file:name+'.png',...metadata});};
 async function checkDistribution(sector,only=false){
  await wait(page);const current=await state(),expected=pilot.clusters.filter(c=>c.sectors.includes(sector)&&(!only||c.industry===current.industry));
  const info=await page.locator('[data-ca-industry-pilot]').evaluate(r=>{const b=r.querySelector('[data-ca-map-frame]').getBoundingClientRect(),boxes=[...r.querySelectorAll('.ca-pilot-map-label')].map(n=>{const a=n.getBoundingClientRect();return {x:a.x,y:a.y,right:a.right,bottom:a.bottom};});return {stage:{x:b.x,y:b.y,right:b.right,bottom:b.bottom},boxes,marks:[...r.querySelectorAll('[data-ca-cluster]')].map(n=>({id:n.dataset.caCluster,coordinate:n.dataset.coordinate,industry:n.dataset.industry})),incomplete:r.dataset.labelsIncomplete??null};});
  assert.equal(info.incomplete,null,'All source-supported labels fit this PC frame');assert.deepEqual(info.marks.map(m=>m.id).sort(),expected.map(c=>c.id).sort(),'Every selected-category distribution remains visible');
  for(const mark of info.marks)assert.equal(mark.coordinate,expected.find(c=>c.id===mark.id).coordinates.join(','),'Source location stays attached to its mark');
  for(const [i,a]of info.boxes.entries()){assert(a.x>=info.stage.x&&a.y>=info.stage.y&&a.right<=info.stage.right&&a.bottom<=info.stage.bottom,'Labels stay within the map');for(const b of info.boxes.slice(i+1))assert(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),'Industry labels do not overlap');}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
  return info.marks.length;
 }
 const route=url('canada/industry/');
 for(const [width,height,role]of [[1920,1080,'primary'],[1440,900,'auxiliary']]){
  await page.setViewportSize({width,height});await page.goto(route,{waitUntil:'networkidle'});await wait(page);
  assert.equal(await page.evaluate(()=>devicePixelRatio),1);assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[data-ca-sector="${sector}"]`).click();await wait(page);const initial=await state();assert.equal(initial.industry,null);assert.equal(initial.site,null);assert.equal(initial.only,false);
   const count=await checkDistribution(sector);await capture(`${width}-${sector}-initial`);
   const item=pilot.industries.find(i=>i.sectors.includes(sector));await page.locator(`[data-ca-subtabs="${sector}"] [data-ca-subsector="${item.id}"]`).click();assert.equal((await state()).industry,item.id);assert.deepEqual((await state()).frame,initial.frame,'Industry selection preserves camera');await checkDistribution(sector);
   const target=pilot.clusters.find(c=>c.sectors.includes(sector)&&c.industry===item.id);await page.locator(`[data-ca-marker="${target.id}"]`).click();assert.equal((await state()).site,target.id);await checkDistribution(sector);await capture(`${width}-${sector}-selected`);
   await page.locator('[data-ca-only]').check();await checkDistribution(sector,true);assert.equal((await state()).only,true);await page.reload({waitUntil:'networkidle'});await wait(page);assert.equal((await state()).site,target.id);assert.equal((await state()).only,true);await checkDistribution(sector,true);
   await page.locator('[data-ca-only]').uncheck();await checkDistribution(sector);await page.locator('[data-ca-clear]').click();assert.equal((await state()).industry,null);assert.equal((await state()).only,false);await checkDistribution(sector);
   await page.goBack();await wait(page);assert.equal((await state()).industry,item.id);assert.equal((await state()).site,target.id);await checkDistribution(sector);
   await page.locator('[data-ca-clear]').click();const next=sector==='services'?'resources':'services',before=(await state()).frame;await page.locator(`[data-ca-sector="${next}"]`).click();assert.deepEqual((await state()).frame,before,'Category switch preserves camera');await page.goBack();await wait(page);assert.equal((await state()).sector,sector);assert.deepEqual((await state()).frame,before);
   result.viewports.push({width,height,role,sector,sourceClusters:count,checks:['initial','industry highlight retains peers','site selection','explicit only','clear','category switch without camera change','history','reload']});
  }
  for(const action of ['in','out']){
   for(let n=0;n<20;n++)await page.locator(`[data-ca-camera="${action}"]`).click();await wait(page);const before=(await state()).frame;
   await page.reload({waitUntil:'networkidle'});await wait(page);const restored=(await state()).frame;restored.forEach((value,i)=>assert(Math.abs(value-before[i])<=.001,'Camera scale survives reload at both zoom limits'));
  }
  await page.locator('[data-ca-camera=reset]').click();await checkDistribution((await state()).sector);
  result.checks.push(`${width} CSS px: minimum and maximum zoom survive reload`);
 }
 await page.setViewportSize({width:1920,height:1080});await page.goto(route,{waitUntil:'networkidle'});await wait(page);
 for(const id of ['edmonton','sudbury','kitimat']){
  await page.locator('[data-ca-sector=resources]').click();await wait(page);await page.locator(`[data-ca-marker="${id}"]`).click();await wait(page);const before=(await state()).frame;
  await capture(`1920-resources-overlap-${id}`);await page.locator('[data-ca-overlap]').click();await wait(page);assert.equal((await state()).sector,'manufacturing');assert.equal((await state()).site,id);assert.deepEqual((await state()).frame,before);await checkDistribution('manufacturing');await capture(`1920-manufacturing-overlap-${id}`);
 }
 await page.locator('[data-ca-sector=resources]').click();await page.locator('[data-ca-subtabs=resources] [data-ca-subsector=nickel]').click();await wait(page);assert.equal(await page.locator('[data-ca-flow=voisey-long-harbour]').count(),1);await capture('1920-nickel-documented-supply');
 await page.locator('[data-ca-sector=manufacturing]').click();assert.equal(await page.locator('[data-ca-flow]').count(),0);
 await page.locator('[data-ca-camera=in]').click();await wait(page);const zoom=(await state()).frame;await page.locator('[data-ca-map]').focus();await page.keyboard.press('ArrowRight');await wait(page);const moved=(await state()).frame;assert(moved[0]>zoom[0]);await page.locator('[data-ca-sector=services]').click();assert.deepEqual((await state()).frame,moved);await page.reload({waitUntil:'networkidle'});await wait(page);(await state()).frame.forEach((n,i)=>assert(Math.abs(n-moved[i])<.001));
 await page.locator('[data-ca-camera=reset]').click();await wait(page);await checkDistribution('services');
 assert.match(await page.locator('[data-ca-international-indicator=exports]').textContent(),/420/);assert.match(await page.locator('[data-ca-international-indicator=us-share]').textContent(),/93/);assert.match(await page.locator('[data-ca-international-indicator=alberta-share]').textContent(),/91/);
 const columns=await page.locator('.ca-pilot-stat-card').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width})));assert(columns.every(c=>Math.abs(c.y-columns[0].y)<1));assert(columns[0].x<columns[1].x&&columns[1].x<columns[2].x);
 result.checks.push('1920×1080 CSS viewport at 100% and DPR1 is primary; 1440×900 is auxiliary. All 3 categories verified for initial/selection/only/clear/switch/history/reload; 3 overlapping processors; source-documented supply only; camera pan/zoom/reload; 3 statistics columns and preserved CER figures.');
}
