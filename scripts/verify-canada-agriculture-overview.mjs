/** Geographic production belts and independently retained source values, in a real PC browser. */
import {readFile} from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
export async function verifyCanadaAgricultureOverview({page,url,output,result}){
 const data=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/census-agriculture.json'));
 const entry=url('canada/agriculture/'),root='[data-canada-agri-overview]';
 const wait=async()=>{await page.locator('#canada-agri-map[data-ready=true]').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const get=method=>page.locator(root).evaluate((r,method)=>r.canadaAgriculture[method](),method);
 const overlaps=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
 for(const [width,height] of [[1920,1080],[1896,996]]){
  await page.setViewportSize({width,height});await page.goto(entry,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await wait();
  const stats=await get('getRenderStats'),map=await page.locator('#canada-agri-map-frame').boundingBox();
  assert.equal(stats.granularity,'editorial-production-belts');assert.equal(stats.retainedCcs,1757);assert.equal(stats.retainedValues,21084);assert.equal(stats.sourceCcsCells,17570);assert.equal(stats.selected,null);
  assert.equal(stats.coloredCcs,0);assert.equal(stats.visibleSymbols,0);assert.equal(stats.productionBelts.length,32);assert.deepEqual(stats.visibleLayers,['crop','livestock']);
  assert.equal(await page.locator('#canada-agri-zoom-in,#canada-agri-zoom-out,#canada-agri-reset,#canada-agri-south').count(),0);
  assert.ok(map.width>(width===1920?850:550));assert.ok(map.height>=300);assert.ok(map.y+map.height<height);
  const products=new Set(stats.labels.map(label=>label.product));for(const product of ['canola','wheat','beef','lentils','potatoes'])assert.ok(products.has(product),`${width}: map names ${product}`);
  for(let i=0;i<stats.labels.length;i++)for(const other of stats.labels.slice(i+1))assert.ok(!overlaps(stats.labels[i].box,other.box),`${width}: product labels remain separate`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('#canada-agri-statistics-detail').getAttribute('open'),null);
  const environment=await page.evaluate(()=>({cssViewport:[innerWidth,innerHeight],dpr:devicePixelRatio,visualScale:visualViewport.scale}));
  result.viewports.push({width,height,primary:width===1920,topic:'agriculture-overview',map,...environment,sourceRegions:stats.retainedCcs,indicatorCells:stats.retainedValues,productionBelts:stats.productionBelts.length,visibleLabelProducts:[...products]});
  await page.screenshot({path:path.join(output,`canada-agriculture-${width}.png`)});
 }
 result.checks.push('1920 CSS px primary and 1896 auxiliary: independent production belts replace administrative maximum-crop fills; source values remain unchanged');
 await page.setViewportSize({width:1920,height:1080});await page.goto(entry,{waitUntil:'networkidle'});await wait();const camera=(await get('getState')).camera;
 for(const product of ['canola','wheat','beef','dairy','pork','chicken','soybeans','corn','lentils','potatoes']){
  await page.locator(`${root} [data-metric=${product}]`).click();await wait();const stats=await get('getRenderStats');assert.equal(stats.productionBelts.length,32);assert.ok(stats.productionBelts.some(b=>b.product===product));assert.deepEqual((await get('getState')).camera,camera);assert.equal(stats.opacities[product],1);assert.ok(await page.locator('#canada-agri-distribution-overview .reading-source-links a').count());
 }
 await page.locator(`${root} [data-metric=canola]`).click();await wait();await page.locator('[data-agri-layer=crop]').uncheck();await wait();assert.equal((await get('getState')).metric,null,'Hiding crops clears the selected canola');assert.equal(new URL(page.url()).searchParams.has('agriFocus'),false);assert.equal((await get('getRenderStats')).opacities.beef,1,'Livestock no longer fades after hidden crop selection');await page.reload({waitUntil:'networkidle'});await wait();assert.equal((await get('getState')).metric,null);await page.goBack();await wait();await page.locator('[data-agri-layer=crop]').check();await page.locator(`${root} [data-metric=canola]`).click();await wait();assert.equal((await get('getRenderStats')).opacities.beef,.45);await page.screenshot({path:path.join(output,'canada-agriculture-selected-canola.png')});
 await page.locator('[data-agri-layer=livestock]').uncheck();await wait();let stats=await get('getRenderStats');assert.deepEqual(stats.visibleLayers,['crop']);assert.ok(stats.productionBelts.every(b=>!['beef','dairy','pork','chicken'].includes(b.product)));await page.screenshot({path:path.join(output,'canada-agriculture-crops-only.png')});
 await page.locator('[data-agri-layer=crop]').uncheck();await wait();assert.equal((await get('getRenderStats')).productionBelts.length,0);
 await page.locator('[data-agri-layer=livestock]').check();await wait();assert.deepEqual((await get('getRenderStats')).visibleLayers,['livestock']);await page.screenshot({path:path.join(output,'canada-agriculture-livestock-only.png')});await page.reload({waitUntil:'networkidle'});await wait();assert.deepEqual((await get('getRenderStats')).visibleLayers,['livestock']);await page.goBack();await wait();assert.deepEqual((await get('getRenderStats')).visibleLayers,[]);
 await page.locator('[data-agri-layer=crop]').check();await page.locator('[data-agri-layer=livestock]').check();await page.locator(`${root} [data-metric=""]`).click();await wait();assert.equal((await get('getState')).metric,null);assert.equal((await get('getRenderStats')).productionBelts.length,32);assert.deepEqual((await get('getState')).camera,camera);
 result.checks.push('All ten selections retain other distributions and camera; crop/livestock independent on/off, clear, history and reload restore state');
 const ccs=Object.keys(data.records).find(id=>data.records[id].provinceCode==='47'&&['canola','wheat','hay','beef','pasture'].every(p=>data.records[id].cells[p].value>0));
 await page.locator('#canada-agri-region').selectOption(ccs);await wait();assert.deepEqual((await get('getState')).camera,camera);assert.equal((await get('getRenderStats')).productionBelts.length,32);
 for(const product of Object.keys(data.products))assert.deepEqual(await page.locator(root).evaluate((r,[ccs,product])=>r.canadaAgriculture.getCell(ccs,product),[ccs,product]),data.records[ccs].cells[product]);
 for(const product of ['pork','chicken']){const cell=await page.locator(root).evaluate((r,[ccs,product])=>r.canadaAgriculture.getCell(ccs,product),[ccs,product]);assert.equal(cell.status,'not-covered');assert.equal(cell.value,null);}
 await page.reload({waitUntil:'networkidle'});await wait();assert.equal((await get('getState')).ccs,ccs);await page.locator('#canada-agri-clear-region').click();await wait();assert.equal((await get('getState')).ccs,null);
 await page.locator(`${root} [data-metric=pork]`).click();await wait();assert.match(await page.locator(`${root} [data-value=pork]`).textContent(),/13.98 百万頭/);assert.match(await page.locator(`${root} [data-value=chicken]`).textContent(),/2,823 生産者/);
 const preserved=await get('getState');await page.locator(`${root} [data-canola-select-item]`).first().click();assert.ok(await page.locator('[data-canola-selected-map]').isVisible());await page.locator('[data-canola-overview-return]').click();await wait();assert.deepEqual(await get('getState'),preserved);
 await page.locator('.country-topic-tabs a').filter({hasText:'林業'}).click();await page.waitForURL('**/agriculture/forestry/');await page.goBack({waitUntil:'networkidle'});await wait();assert.deepEqual(await get('getState'),preserved);
 await page.locator('#canada-agri-region').selectOption('2021S05021001214');await wait();assert.match(await page.locator(`${root} [data-value=canola]`).textContent(),/0 ha/);assert.match(await page.locator(`${root} [data-value=beef]`).textContent(),/非公表 F/);
 await page.locator('#canada-agri-region').selectOption(Object.keys(data.records).find(id=>!data.records[id].covered));await wait();assert.equal(await page.locator('#canada-agri-values').getByText('対象外・未収録',{exact:false}).count(),12);
 result.checks.push('CCS selection retains exact cells; pork/chicken remain unavailable at CCS; zero, F and not-covered and forestry/legacy roundtrips remain distinct');
 await page.route('**/canada-census-agriculture-v1/census-agriculture.json',route=>route.abort());await page.goto(entry,{waitUntil:'networkidle'});await page.locator(`${root}[data-load-error]`).waitFor();assert.ok(await page.locator('[data-overview-fallback]').isVisible());assert.equal(await page.locator('#canada-agri-values tr').count(),12);await page.unroute('**/canada-census-agriculture-v1/census-agriculture.json');result.checks.push('Fetch failure retains dated production-belt fallback and national source values');
}
