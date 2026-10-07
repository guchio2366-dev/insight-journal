/** Canada agriculture acceptance, reusing the existing real Chromium/build harness. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
export async function verifyCanadaAgricultureOverview({page,url,output,result}){
 const data=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/census-agriculture.json'));
 const overviewUrl=url('canada/agriculture/'),api='[data-canada-agri-overview]';
 const wait=async()=>{await page.locator('#canada-agri-map[data-ready=true]').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const get=method=>page.locator(api).evaluate((root,method)=>root.canadaAgriculture[method](),method);

 for(const [width,height]of [[1536,864],[1280,720],[1024,768]]){
  await page.setViewportSize({width,height});await page.goto(url('agriculture/'),{waitUntil:'networkidle'});const us=await page.locator('.atlas-map-frame:visible').first().boundingBox();
  await page.goto(overviewUrl,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await wait();const stats=await get('getRenderStats'),map=await page.locator('#canada-agri-map-frame').boundingBox();
  for(const dimension of ['x','y','width','height'])assert.ok(Math.abs(us[dimension]-map[dimension])<2,`${width}: US map ${dimension}`);
  assert.equal(stats.granularity,'official-province');assert.equal(stats.retainedCcs,1757);assert.equal(stats.retainedValues,21084);assert.equal(stats.metrics.length,12);assert.equal(stats.selected,null);assert.equal(await page.locator('.map-story:visible').count(),3);assert.equal(await page.locator('.country-topic-tabs a:visible').count(),2);
  const collision=await page.locator(api).evaluate(root=>{const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}},overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;const stories=[...root.querySelectorAll('.map-story')].filter(e=>!e.hidden),controls=[...root.querySelectorAll('.map-tools,.map-year'),root.closest('[data-canada-agriculture]').querySelector('.country-topic-tabs')],labels=[...root.querySelectorAll('.province-label')].filter(e=>!e.hidden);return stories.flatMap((a,i)=>[...stories.slice(i+1),...controls,...labels].filter(b=>overlap(rect(a),rect(b))).map(b=>[a.textContent,b.textContent]));});
  assert.deepEqual(collision,[],`${width}: cards clear controls and province labels`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#canada-agri-statistics-detail').getAttribute('open'),null);
  const coveredSymbols=await page.locator(api).evaluate(root=>{const frame=root.querySelector('#canada-agri-map-frame').getBoundingClientRect(),cards=[...root.querySelectorAll('.map-story')].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect());return root.canadaAgriculture.getDisplayTargets().filter(t=>cards.some(c=>t.point[0]-22<c.right-frame.x&&t.point[0]+22>c.left-frame.x&&t.point[1]-9<c.bottom-frame.y&&t.point[1]+25>c.top-frame.y)).map(t=>t.province);});
  assert.deepEqual(coveredSymbols,[],`${width}: source glyphs remain visible around cards`);
  result.viewports.push({width,height,topic:'agriculture-overview',us,map,sourceRegions:stats.retainedCcs,indicatorCells:stats.retainedValues,visibleSymbols:stats.visibleSymbols,cardCollisions:collision});await page.screenshot({path:path.join(output,`canada-agriculture-${width}.png`)});
 }
 result.checks.push('PC three-width map geometry matches actual US agriculture; all three cards clear both topic tabs, map controls and province labels');
 await page.setViewportSize({width:1536,height:864});await page.goto(overviewUrl,{waitUntil:'networkidle'});await wait();
 await page.locator('#canada-agri-reset').click();await wait();let stats=await get('getRenderStats');assert.equal(stats.view,'whole-canada');assert.equal(Object.keys(stats.provinceIndicators).length,13);const whole=(await get('getState')).camera;await page.locator('#canada-agri-zoom-in').click();await wait();const after=(await get('getState')).camera;assert.ok(after[2]>whole[2]&&after[2]<1);assert.ok(Math.abs(after[0]-whole[0])<.01&&Math.abs(after[1]-whole[1])<.01);await page.reload();await wait();assert.ok(Math.abs((await get('getState')).camera[2]-after[2])<.001);await page.locator('#canada-agri-south').click();await wait();assert.equal((await get('getState')).camera[2],1);
 await page.locator('[data-canada-agri-overview] [data-metric=canola]').click();await wait();stats=await get('getRenderStats');assert.equal(stats.opacities.beef,.14);assert.equal(stats.metrics.length,12);
 for(const product of ['canola','wheat','beef','dairy','pork','chicken','soybeans','corn','lentils','potatoes']){
  await page.locator(`[data-canada-agri-overview] [data-metric=${product}]`).click();await wait();
  assert.ok((await page.locator('#canada-agri-distribution-overview .distribution-section').count())>=3);
  assert.ok(await page.locator('#canada-agri-distribution-overview .reading-source-links a').count());
  assert.equal((await get('getRenderStats')).metrics.length,12);
 }
 await page.locator('[data-canada-agri-overview] [data-metric=soybeans]').click();await wait();
 for(const livestock of ['beef','dairy','pork','chicken'])assert.equal((await get('getRenderStats')).opacities[livestock],.14);
 await page.locator('[data-agri-ccs-focus="2021S05023536020"]').click();await wait();assert.equal((await get('getState')).ccs,'2021S05023536020');assert.equal((await get('getRenderStats')).granularity,'ccs-display-cells');
 for(const product of ['pork','chicken']){const cell=await page.locator(api).evaluate((root,product)=>root.canadaAgriculture.getCell('2021S05023536020',product),product);assert.equal(cell.status,'not-covered');assert.equal(cell.value,null);}
 assert.equal((await get('getRenderStats')).sourceCcsCells,17570);assert.deepEqual((await get('getRenderStats')).provinceOnlyMetrics,['pork','chicken']);
 await page.locator('[data-canada-agri-overview] [data-metric=pork]').click();await page.locator('#canada-agri-clear-region').click();await wait();assert.match(await page.locator('[data-value=pork]').textContent(),/13.98 百万頭/);assert.match(await page.locator('[data-value=chicken]').textContent(),/2,823 生産者/);
 result.checks.push('All ten product readings have geographic explanation and linked primary sources; representative CCS focus works; pork and chicken retain province-only measures, years and national units');
 await page.locator('[data-canada-agri-overview] [data-metric=canola]').click();await wait();
 const ccs=Object.keys(data.records).find(id=>data.records[id].provinceCode==='47'&&['canola','wheat','hay','beef','pasture'].every(p=>data.records[id].cells[p].value>0));await page.locator('#canada-agri-region').selectOption(ccs);await page.locator('#canada-agri-focus-region').click();await wait();stats=await get('getRenderStats');assert.equal(stats.granularity,'ccs-display-cells');const members=stats.groups.flatMap(g=>g.members);assert.equal(new Set(members).size,members.length);assert.equal(stats.retainedValues,21084);
 for(const product of Object.keys(data.products))assert.deepEqual(await page.locator(api).evaluate((root,[ccs,product])=>root.canadaAgriculture.getCell(ccs,product),[ccs,product]),data.records[ccs].cells[product]);assert.notEqual(await page.locator('#canada-agri-statistics-detail').getAttribute('open'),null);
 await page.reload({waitUntil:'networkidle'});await wait();assert.equal((await get('getState')).ccs,ccs);assert.equal((await get('getRenderStats')).granularity,'ccs-display-cells');
 const targets=await get('getDisplayTargets'),single=targets.find(t=>t.members.length===1&&t.point[0]>30&&t.point[0]<650&&t.point[1]>35&&t.point[1]<430);assert.ok(single);const box=await page.locator('#canada-agri-map').boundingBox();await page.mouse.click(box.x+single.point[0],box.y+single.point[1]);await wait();assert.equal((await get('getState')).ccs,single.members[0]);
 result.checks.push('Whole country, continuous zoom, 12-indicator focus, CCS selection and exact source cells/components survive reload; other distributions stay visible');
 const preserved=(await get('getState'));await page.locator('[data-canada-agri-overview] [data-canola-select-item]').first().click();assert.equal(await page.locator('[data-canola-selected-map]').isVisible(),true);assert.equal(await page.locator('[data-canola-country-map]').isVisible(),false);await page.locator('[data-canola-overview-return]').click();await wait();assert.deepEqual(await get('getState'),preserved);
 await page.locator('.country-topic-tabs a').filter({hasText:'林業'}).click();await page.waitForURL('**/agriculture/forestry/');await page.goBack({waitUntil:'networkidle'});await wait();assert.deepEqual(await get('getState'),preserved);
 await page.locator('#canada-agri-region').selectOption('2021S05021001214');await wait();assert.match(await page.locator('[data-canada-agri-overview] [data-value=canola]').textContent(),/0 ha/);assert.match(await page.locator('[data-canada-agri-overview] [data-value=beef]').textContent(),/非公表 F/);const missing=Object.keys(data.records).find(id=>!data.records[id].covered);await page.locator('#canada-agri-region').selectOption(missing);await wait();assert.equal(await page.locator('#canada-agri-values').getByText('対象外・未収録',{exact:false}).count(),12);
 await page.locator('#canada-agri-clear-region').click();await wait();assert.equal((await get('getState')).ccs,null);await page.locator('#canada-agri-reset').click();await wait();assert.equal((await get('getState')).metric,null);assert.equal((await get('getRenderStats')).view,'whole-canada');
 result.checks.push('Agriculture/forestry navigation and legacy product reading return preserve overview state; public zero, F and not-covered remain distinct; reset clears selection');
 await page.route('**/canada-census-agriculture-v1/census-agriculture.json',route=>route.abort());await page.goto(overviewUrl,{waitUntil:'networkidle'});await page.locator('[data-canada-agri-overview][data-load-error]').waitFor();assert.equal(await page.locator('[data-overview-fallback]').isVisible(),true);assert.equal(await page.locator('#canada-agri-values tr').count(),12);assert.match(await page.locator('#canada-agri-map-status').textContent(),/読み込めません/);result.checks.push('Fetch failure retains truthful dated fallback, national values and original product links');
 await page.unroute('**/canada-census-agriculture-v1/census-agriculture.json');

}
