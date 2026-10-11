/** Actual CSD population and simultaneous source CD compositions in a PC browser. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {projectCanadaMap} from '../src/lib/atlas-canada-map-presentation.ts';
import {demographicComposition} from '../src/lib/atlas-canada-concentration.ts';
import {buildCanadaReligionView,canadaReligionComposition,canadaReligionInitialIds} from '../src/lib/atlas-canada-religion-view.ts';
export async function verifyCanadaDemographicsReading({page,url,output,result}){
 const raw=Object.fromEntries(await Promise.all(['ethnicity','religion'].map(async topic=>[topic,JSON.parse(await readFile(`src/data/atlas/canada/profile-${topic}.json`))])));
 const data={ethnicity:raw.ethnicity,religion:buildCanadaReligionView(raw.religion)};
 const manifest=JSON.parse(await readFile('public/assets/atlas/canada-population-grid-v1/manifest.json')),binary=gunzipSync(await readFile('public/assets/atlas/canada-population-grid-v1/density.bin.gz')),grid=new Float32Array(binary.buffer,binary.byteOffset,binary.length/4),population=JSON.parse(await readFile('src/data/atlas/canada/population.json'));
 const wait=async(topic)=>{await page.locator('[data-regions-ready=true]').waitFor();if(topic==='distribution')await page.locator('[data-population-grid-ready=true]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const frame=()=>page.locator('[data-population-map]').getAttribute('viewBox');
 const shot=async(name)=>{const metadata=await page.evaluate(()=>({cssViewport:{width:innerWidth,height:innerHeight},browserZoom:visualViewport.scale,devicePixelRatio,mapFrame:document.querySelector('.atlas-map-frame').getBoundingClientRect().toJSON(),viewBox:document.querySelector('[data-population-map]').getAttribute('viewBox')}));await page.screenshot({path:path.join(output,name+'.png')});result.screenshots.push({file:name+'.png',...metadata});};
 for(const [width,height,role]of [[1920,1080,'primary'],[1440,900,'auxiliary']])for(const topic of ['distribution','ethnicity','religion']){
  await page.setViewportSize({width,height});await page.goto(url('canada/population/?topic='+topic),{waitUntil:'networkidle'});await wait(topic);
  assert.equal(await page.evaluate(()=>devicePixelRatio),1);assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  assert.equal(await page.locator('[data-population-reset],[data-population-whole],[data-population-scale]').count(),0);
  assert.equal(await page.locator('[data-population-category-dots],[data-religion-region-symbols] circle').count(),0,'No demographic dot cloud');
  assert.equal(await page.locator('[data-population-region]').count(),293);
  const visibleAnchors=await page.locator('.population-anchor').evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').length);assert(visibleAnchors<=9,'Only important source city reference points remain');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const camera=await frame();await shot(`canada-${topic}-${width}-initial`);
  if(topic==='distribution'){
   assert.equal(await page.locator('[data-population-grid-image]').count(),1);
   assert.match(await page.locator('[data-population-coverage-brief]').textContent(),/2020年推計/);
   assert.deepEqual(await page.locator('[data-canada-population]').evaluate(n=>({size:[n.canadaPopulationGrid.manifest.width,n.canadaPopulationGrid.manifest.height],period:n.canadaPopulationGrid.manifest.populationYear})),{size:[1000,1293],period:2020});
   assert.equal(await page.locator('[data-population-regions]').evaluate(n=>getComputedStyle(n).display),'none');
   const point=projectCanadaMap([-79.95,43.95]),target=await page.locator('[data-population-map]').evaluate((n,p)=>{const v=new DOMPoint(...p).matrixTransform(n.getScreenCTM());return{x:v.x,y:v.y};},point);
   await page.locator('[data-population-grid-image]').evaluate(n=>n.addEventListener('click',e=>{n.qaLastClick={x:e.clientX,y:e.clientY};},{once:true}));await page.mouse.click(target.x,target.y);await wait(topic);
   const id=new URL(page.url()).searchParams.get('grid');assert(id,'Actual density image is selectable');
   const expectedId=await page.locator('[data-population-grid-image]').evaluate((n,m)=>{const r=n.getBoundingClientRect(),p=n.qaLastClick;return Math.floor((p.x-r.x)/r.width*m.width)+','+Math.floor((p.y-r.y)/r.height*m.height);},manifest);assert.equal(id,expectedId,'Mouse coordinates correspond to the actual source-image cell');
   const [col,row]=id.split(',').map(Number),value=grid[row*manifest.width+col];assert(value>0);assert.match(await page.locator('[data-population-comparison]').textContent(),/2020年推計/);assert((await page.locator('[data-population-comparison]').textContent()).includes(value.toLocaleString('ja-JP',{maximumFractionDigits:1})));assert.equal(await frame(),camera);
   assert.equal(await page.locator('[data-population-grid-selected]').getAttribute('data-population-grid-selected'),id);await shot(`canada-population-${width}-selected-grid`);
   await page.reload({waitUntil:'networkidle'});await wait(topic);assert.equal(new URL(page.url()).searchParams.get('grid'),id);assert.equal(await frame(),camera);
   await page.locator('[data-population-clear-selection]').click();assert.equal(new URL(page.url()).searchParams.has('grid'),false);await page.goBack();await wait(topic);assert.equal(new URL(page.url()).searchParams.get('grid'),id);
   await page.locator('[data-population-map-cma="535"]').press('Enter');await wait(topic);assert.equal(new URL(page.url()).searchParams.has('grid'),false);assert((await page.locator('[data-population-comparison]').textContent()).includes(population.cmas.find(r=>r.id==='535').population[2021].value.toLocaleString('ja-JP')));assert.match(await page.locator('[data-population-comparison]').textContent(),/2021年/);assert.equal(await frame(),camera);
   await page.locator('[data-population-clear-selection]').click();await page.locator('[data-population-map]').press('Enter');assert(new URL(page.url()).searchParams.has('grid'),'Keyboard can select the actual displayed centre cell');assert.equal(await frame(),camera);
  }else{
   const ids=topic==='religion'?[...canadaReligionInitialIds]:['4','5','6','7','8','87'];
   const expected=data[topic].regions.map(r=>({id:r.id,groups:(topic==='religion'?canadaReligionComposition(r,data[topic]):demographicComposition(r,data[topic],topic)).qualified.filter(g=>ids.includes(g.id)).map(g=>g.id)}));
   const paint=await page.locator('[data-population-region]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.populationRegion,n.style.fill])));
   for(const record of expected.filter(r=>r.groups.length>1)){
    assert.match(paint[record.id],new RegExp(`canada-${topic}-concentration-${record.groups.join('-')}`),'All qualifying compositions share the same area');
    assert.deepEqual(await page.locator(`#canada-${topic}-concentration-${record.groups.join('-')} [data-population-concentration-group]`).evaluateAll(nodes=>nodes.map(n=>n.dataset.populationConcentrationGroup)),record.groups);
   }
   assert(expected.some(r=>r.groups.length>1),'Initial map simultaneously shows overlapping distributions');
   await page.locator('[data-population-map-cma="535"]').press('Enter');await wait(topic);assert.equal(await frame(),camera);assert.deepEqual(await page.locator('[data-population-region]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.populationRegion,n.style.fill]))),paint,'Place selection preserves all distributions');
   assert.equal(await page.locator('[data-population-composition-rows] tr').count(),topic==='religion'?13:14);
   await page.locator(`[data-population-category="${topic==='religion'?'11':'5'}"]`).click();await wait(topic);assert.equal(await frame(),camera);assert(await page.locator('[data-population-region]').evaluateAll(nodes=>nodes.some(n=>Number(n.style.fillOpacity)===.38)&&nodes.some(n=>n.style.fillOpacity==='1')),'Focus keeps contextual distributions');
   await shot(`canada-${topic}-${width}-selected`);await page.reload({waitUntil:'networkidle'});await wait(topic);assert.equal(new URL(page.url()).searchParams.get('cma'),'535');assert.equal(await frame(),camera);
   await page.locator('[data-population-category=""]').click();await page.locator('[data-population-clear-selection]').click();await wait(topic);assert.equal(await frame(),camera);await page.goBack();await wait(topic);assert.equal(new URL(page.url()).searchParams.get('cma'),'535');
  }
  const next=topic==='religion'?'ethnicity':'religion';await page.locator(`[data-population-topic=${next}]`).click();await wait(next);assert.equal(await frame(),camera,'Topic switch preserves the southern camera');await page.goBack();await wait(topic);assert.equal(await frame(),camera);
  result.viewports.push({width,height,role,topic,map:await page.locator('.atlas-map-frame').boundingBox(),checks:['initial','selection with peers','clear','switch','history','reload','unchanged source geography']});
 }
 await page.setViewportSize({width:1920,height:1080});await page.goto(url('canada/population/?topic=religion'),{waitUntil:'networkidle'});await wait('religion');await page.locator('[data-demographic-example="3521"]').click();assert.match(await page.locator('[data-demographic-comparison]').textContent(),/イスラム教 12\.6%.*ヒンドゥー教 12\.7%.*シク教 13\.8%/);assert.equal(await page.locator('[data-religion-source-rows] tr').count(),23);await shot('canada-religion-peel-simultaneous');
 await page.route('**/canada-population-grid-v1/density.bin.gz',r=>r.abort());await page.goto(url('canada/population/'),{waitUntil:'networkidle'});await page.locator('[data-population-grid-error=true]').waitFor();assert.match(await page.locator('[data-population-map-status]').textContent(),/人口グリッドを取得できません.*統計地域/);assert.notEqual(await page.locator('[data-population-regions]').evaluate(n=>getComputedStyle(n).display),'none');await page.unroute('**/canada-population-grid-v1/density.bin.gz');
 result.checks.push('1920 primary and 1440 auxiliary: genuine 2020 GHSL density pixels; actual mouse/source-cell registration and source Float32 value; keyboard/cell/clear/history/reload; separate 2021 Toronto CMA figures; 293 CD simultaneous ethnic/religious distributions; no maximum-only paint or category dot cloud; topic switch/camera and explicit data-failure fallback.');
}
