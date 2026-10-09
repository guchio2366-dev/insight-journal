import assert from 'node:assert/strict';

// Use the existing PC review's guarded page, normal browser sandbox and images.
export async function verifySoutheastAsiaRegion(page,options){
 try{return await checkSoutheastAsiaRegion(page,options);}catch(error){
  // The PC review reports the first log line; retain actual/expected and stack there.
  const detail=error instanceof Error?error.stack??error.message:String(error);
  throw new Error(detail.replace(/\s*\n\s*/g,' | '));
 }
}

async function checkSoutheastAsiaRegion(page,{source,capture:takePicture,background}){
 const base=source.replace(/\/$/,''),checks=[];
 const record=name=>checks.push({name,passed:true});
 // State and reading text update before asynchronous map sources paint. Keep
 // the shared nonblank-map check and capture the completed view after reloads
 // and case changes, rather than its loading frame.
 const capture=async id=>{
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  await takePicture(id);
 };
 const open=async(path)=>{await page.goto(base+'/atlas/asia/southeast-asia/'+path,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);};
 const ready=async()=>page.waitForFunction(()=>document.querySelector('[data-industry-status]')?.textContent===''&&document.querySelector('[data-industry-content] table'));
 const country=page.locator('[data-country-select]');
 const expand=async(selector)=>{const d=page.locator(selector);if(!await d.evaluate(n=>n.open))await d.locator(':scope > summary').click();};
 await open('industry/');await ready();
 assert.equal(await country.inputValue(),'');
 assert.deepEqual(await country.locator('option').evaluateAll(o=>o.filter(x=>!x.disabled).map(x=>x.value)),['','IDN','THA','VNM']);
 assert.equal(await page.locator('[data-industry-topic] option[value="my-p3"]').evaluate(o=>o.disabled),true);
 assert.match(await page.locator('[data-reading-dock-summary]').textContent(),/ジャワ島.*タイ東部.*ベトナムの南北/s);
 assert.match(await page.locator('[data-industry-region-reading]').textContent(),/11か国.*国内仕向け|11か国.*国内向け/s);
 const markerState=await page.locator('[data-southeast-industry-map]').evaluate(node=>({hidden:node.hidden,size:[node.clientWidth,node.clientHeight],field:document.querySelector('[data-asia-atlas]')?.getAttribute('data-field'),points:[...node.querySelectorAll('[data-southeast-industry-point]')].map(p=>({id:p.getAttribute('data-southeast-industry-point'),hidden:p.hidden,x:p.style.left,y:p.style.top}))}));
 assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-point]:visible').count(),30,JSON.stringify(markerState));
 assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-label]:visible').count(),13);
 assert.equal(await page.locator('[data-southeast-industry-kind]').count(),14);
 assert.match(await page.locator('[data-southeast-industry-legend]').textContent(),/● 工場・港・都市.*◆ 原料地域の代表位置/s);
 assert.match(await page.locator('[data-southeast-industry-label="southern-rubber"]').textContent(),/ゴム・タイヤ.*タイ南部/s);
 const labelBoxes=await page.locator('[data-southeast-industry-map] [data-southeast-industry-label]:visible').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),frame=node.parentElement.getBoundingClientRect();return {id:node.getAttribute('data-southeast-industry-label'),left:r.left-frame.left,top:r.top-frame.top,right:r.right-frame.left,bottom:r.bottom-frame.top,width:frame.width,height:frame.height};}));
 assert(labelBoxes.every(box=>box.left>=0&&box.top>=0&&box.right<=box.width&&box.bottom<=box.height),`Industry labels must remain in the map: ${JSON.stringify(labelBoxes)}`);
 for(let i=0;i<labelBoxes.length;i++)for(let j=i+1;j<labelBoxes.length;j++){const a=labelBoxes[i],b=labelBoxes[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`Industry labels overlap: ${a.id}, ${b.id}`);}
 assert.match(await page.locator('[data-reading-dock-summary]').textContent(),/ジャワ島.*タイ東部/);
 record('initial regional industry explains the three-country scope and broader supply network');await capture('industry-overview');
 await page.locator('[data-southeast-industry-kind="rubber"]').click();
 assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-point]:not(.muted)').count(),2);
 assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-point].muted').count(),28);
 await page.locator('[data-southeast-industry-site="rayong-tires"]').click();
 assert.match(await page.locator('[data-southeast-industry-selected-reading]').textContent(),/タイヤ工場/);
 assert.equal(await page.locator('[data-southeast-industry-selected-source]').getAttribute('href')!==null,true);
 record('all regional sites remain visible while rubber and tire stages are highlighted');await capture('industry-rubber-selected');
 await page.locator('[data-southeast-industry-kind="wood"]').click();
 assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-point]:not(.muted)').count(),2);
 assert.match(await page.locator('[data-southeast-industry-summary]').textContent(),/輸入木材/);
 for(const [group,count] of [['electronics',3],['automotive',2],['textiles',2],['food',2],['metals',2],['energy',3],['petrochemicals',3],['logistics',3],['tourism',3],['finance',1],['it-bpm',2]]){
  await page.locator(`[data-southeast-industry-kind="${group}"]`).click();
  assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-point]:not(.muted)').count(),count,group);
  assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-label]:visible').count(),count,group);
 }
 await page.locator('[data-southeast-industry-kind="all"]').click();
 assert.equal(await page.locator('[data-southeast-industry-map] [data-southeast-industry-point].muted').count(),0);

 for(const [code,name,story,expected]of [['IDN','インドネシア','jakarta-industry',/ジャカルタ/],['VNM','ベトナム','hochiminh-industry',/ホーチミン/],['THA','タイ','thailand-coast',/東部臨海部/]]){
  await country.selectOption(code);await page.waitForFunction(name=>document.querySelector('[data-industry-value]')?.textContent.includes(name),name);
  assert.match(await page.locator('[data-industry-country-reading]').textContent(),expected);
  assert.match(await page.locator('[data-industry-country-reading]').textContent(),/国全体|国の比率|タイ全体/);
  assert.equal(await page.locator('[data-industry-country-reading-source] a').getAttribute('href')!==null,true);
  await page.locator('[data-place-story]').selectOption(story);await page.waitForFunction(id=>new URL(location.href).searchParams.get('story')===id,story);
  const before=new URL(page.url());await page.locator('[data-place-story-bridges] button').first().click();
  await page.locator('[data-comparison-back]').click();await ready();
  const after=new URL(page.url());for(const key of ['place','topic','story','at'])assert.equal(after.searchParams.get(key),before.searchParams.get(key));
  await page.reload({waitUntil:'domcontentloaded'});await ready();assert.equal(new URL(page.url()).searchParams.get('story'),story);assert.equal(await country.inputValue(),code);
  record(code+' industry, source, comparison return and URL reload');await capture('industry-'+code);
 }
 await country.selectOption('VNM');await page.locator('[data-place-story]').selectOption('hanoi-industry');
 assert.match(await page.locator('[data-place-story-text]').textContent(),/紅河デルタ.*ハイフォン/);
 assert.match(await page.locator('[data-place-story-scope]').textContent(),/2011年.*2024年/s);
 record('Hanoi keeps the historical narrative separate from current national values');await capture('industry-hanoi');
 await country.selectOption('');await page.locator('[data-industry-region-reading]').waitFor({state:'visible'});
 await page.locator('[data-industry-reading-topic="trade-exports"][data-industry-reading-detail="t-85"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-trade-status]')?.textContent===''&&document.querySelector('[data-trade-chapter]')?.value==='85');
 assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.match(await page.locator('[data-trade-coverage]').textContent(),/11か国/);
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-trade-status]')?.textContent==='');
 assert.equal(new URL(page.url()).searchParams.get('detail'),'t-85');record('regional supply view retains all 11 reporters and the HS chapter on reload');await capture('regional-supply');

 await open('agriculture/');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmContextStatus==='ready');
 await page.waitForFunction(()=>document.querySelector('.asia-farm-connections-grid > section:first-child h3')?.textContent==='米を生産する国');
 const layout=await page.evaluate(()=>{
  const rectangle=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
  return {news:rectangle('.atlas-news'),grid:rectangle('.asia-layout'),workspace:rectangle('[data-southeast-top-workspace]'),map:rectangle('[data-southeast-top-workspace]>.atlas-map-column'),reading:rectangle('[data-southeast-top-workspace]>.asia-reading-panel'),statistics:rectangle('.asia-layout>.asia-farm-connections')};
 });
 assert(Math.abs(layout.statistics.x-layout.grid.x)<=1&&Math.abs(layout.statistics.width-layout.grid.width)<=1,'Regional statistics must span the full workspace beyond the news rail');
 assert(layout.statistics.y>=Math.max(layout.map.bottom,layout.reading.bottom)-1,'Statistics must begin below the map and its reading frame');
 assert(layout.news.x+layout.news.width<layout.statistics.x,'News rail must remain outside the statistics width');
 await expand('[data-southeast-forest-reading]');await expand('[data-southeast-trade-reading]');
 const readingScroll=await page.locator('[data-southeast-top-workspace]>.asia-reading-panel').evaluate(node=>{node.scrollTop=0;const before=node.scrollTop;node.scrollTop=180;return {before,after:node.scrollTop,overflow:getComputedStyle(node).overflowY};});
 assert(readingScroll.after>readingScroll.before&&readingScroll.overflow==='auto','The right reading must scroll inside its fixed frame');
 const pageScroll=await page.evaluate(()=>{
  const news=document.querySelector('.atlas-news'),shell=news.closest('.atlas-desktop-shell'),maxScroll=document.documentElement.scrollHeight-innerHeight;
  const shellY=shell.getBoundingClientRect().top+scrollY;
  scrollTo({top:Math.min(shellY+100,maxScroll-100),behavior:'instant'});
  const before=scrollY,firstTop=news.getBoundingClientRect().top;
  scrollTo({top:Math.min(before+100,maxScroll),behavior:'instant'});
  return {before,after:scrollY,firstTop,secondTop:news.getBoundingClientRect().top};
 });
 assert(pageScroll.after>pageScroll.before&&pageScroll.firstTop<=12&&Math.abs(pageScroll.secondTop-pageScroll.firstTop)<=1,`The page and news rail must scroll independently: ${JSON.stringify(pageScroll)}`);
 await page.locator('.asia-layout>.asia-farm-connections').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
 const lower=await page.evaluate(()=>{
  const rect=selector=>document.querySelector(selector).getBoundingClientRect();
  const reading=rect('[data-southeast-top-workspace]>.asia-reading-panel'),statistics=rect('.asia-layout>.asia-farm-connections');
  const cards=[...document.querySelectorAll('.asia-farm-connections-grid>section')].map(node=>{const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=Math.min(innerHeight-5,Math.max(5,r.y+Math.min(r.height/2,60)));return {visible:r.bottom>0&&r.top<innerHeight,uncovered:node.contains(document.elementFromPoint(x,y))};});
  return {readingBottom:reading.bottom,statisticsTop:statistics.top,cards};
 });
 assert(lower.readingBottom<=lower.statisticsTop+1&&lower.cards.length===3&&lower.cards.every(card=>card.visible&&card.uncovered),`All three statistics cards must remain visible and uncovered: ${JSON.stringify(lower)}`);
 await page.evaluate(()=>{scrollTo({top:0,behavior:'instant'});document.querySelector('[data-southeast-top-workspace]>.asia-reading-panel').scrollTop=0;});
 record('news rail, independent right reading scroll, and full-width regional statistics');
 assert.equal(await page.locator('.southeast-supply-bars li').count(),5);
 assert.match(await page.locator('.asia-farm-connections-grid > section:nth-child(2)').textContent(),/HS15章.*パーム油HS1511だけの相手国ではありません/s);
 assert.equal(await page.locator('.southeast-partner-list li').count(),5);
 assert.match(await page.locator('[data-southeast-forest-reading]').textContent(),/丸太材.*製材.*世界比/s);
 assert.match(await page.locator('[data-southeast-trade-reading]').textContent(),/2023年.*パーム油.*コーヒー.*木材製品.*天然ゴム/s);
 record('Southeast production bars, correctly scoped HS15 partner pie, forestry ratios and export examples');
 assert.equal(await country.isVisible(),false);assert.equal(await page.locator('.asia-country-list').isVisible(),false);
 const livestock=page.locator('.asia-livestock-point:visible'),count=await livestock.count();assert(count>0);
 await page.locator('[data-farm-choice="maize"]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmSelected==='maize');
 assert.doesNotMatch(await page.locator('[data-map-gesture]').textContent(),/国の選択欄/,'Agriculture guidance must not direct learners to a hidden country control');
 const projected=await livestock.evaluateAll(n=>n.map(x=>({name:x.getAttribute('aria-label'),x:parseFloat(x.style.left),y:parseFloat(x.style.top)})));
 await page.locator('[data-southeast-farm-single]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmView==='single');
 await page.waitForFunction(()=>document.querySelectorAll('.asia-livestock-point:not([hidden])').length===0);assert.equal(await livestock.count(),0);assert.equal(new URL(page.url()).searchParams.get('farmview'),'single');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmView==='single');
 await page.locator('[data-dock-compare="population"]').click();await page.locator('[data-comparison-back]').click();
 await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmView==='single');
 assert.equal(new URL(page.url()).searchParams.get('farmview'),'single');record('right-column single-product control survives reload and comparison');await capture('farm-single');
 await page.locator('[data-southeast-farm-single]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmView==='all');
 await page.waitForFunction(count=>document.querySelectorAll('.asia-livestock-point:not([hidden])').length===count,count);assert.equal(await livestock.count(),count);const restored=await livestock.evaluateAll(n=>n.map(x=>({name:x.getAttribute('aria-label'),x:parseFloat(x.style.left),y:parseFloat(x.style.top)})));
 assert.equal(restored.length,projected.length);for(let i=0;i<restored.length;i++){assert.equal(restored[i].name,projected[i].name);for(const key of ['x','y'])assert(Math.abs(restored[i][key]-projected[i][key])<=1);}
 record('returning to all products restores livestock and the regional camera');await capture('farm-all-restored');

 await page.locator('[data-farm-group="forestry"]').click();await expand('[data-reading-details]');await page.locator('[data-place-story]').selectOption('peninsula-forest');
 assert.match(await page.locator('[data-south-central-world-share]').textContent(),/森林面積.*2024年.*世界の森林面積/s);
 assert.doesNotMatch(await page.locator('[data-map-gesture]').textContent(),/国の選択欄/);
 const forest=new URL(page.url());assert.equal(forest.searchParams.get('place'),'MYS');
 const wood=page.locator('[data-place-story-bridges] [data-place-bridge-topic="trade-exports"]');assert.match(await wood.textContent(),/東南アジア全体/);await wood.click();
 await page.waitForFunction(()=>document.querySelector('[data-trade-status]')?.textContent===''&&document.querySelector('[data-trade-chapter]')?.value==='44');
 assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.equal(new URL(page.url()).searchParams.get('detail'),'t-44');assert.match(await page.locator('[data-trade-coverage]').textContent(),/11か国/);
 await page.locator('[data-comparison-back]').click();const forestBack=new URL(page.url());for(const key of ['place','topic','story','at'])assert.equal(forestBack.searchParams.get(key),forest.searchParams.get(key));
 record('forestry keeps the wood chapter in regional trade and restores the Malaysia forest case');
 await open('agriculture/?topic=maize&place=PHL');await page.locator('[data-farm-trade] table').waitFor({state:'visible'});
 await page.locator('[data-farm-trade] button').click();await page.waitForFunction(()=>document.querySelector('[data-trade-status]')?.textContent===''&&document.querySelector('[data-trade-chapter]')?.value==='10');
 assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.equal(new URL(page.url()).searchParams.get('detail'),'t-10');await page.locator('[data-comparison-back]').click();
 assert.equal(new URL(page.url()).searchParams.get('place'),'PHL');assert.equal(new URL(page.url()).searchParams.get('topic'),'maize');record('crop trade from an outside-study country keeps its HS chapter and comparison return');

 for(const [path,id,key,value]of [['nature/?city=bangkok&lng=116.576&lat=9.362&z=2.7','climate-background','city','bangkok'],['nature/?topic=terrain&detail=java-island&lng=116.576&lat=9.362&z=2.7','terrain-background','detail','java-island']]){
  await open(path);if(key==='city')await page.locator('[data-city-panel="bangkok"]').waitFor({state:'visible'});
  const point=await background();assert(point,'An uncovered map background point is required');
  assert.equal(await page.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('button,a,[role="button"]')),point),false,'The background click must not hit a city or annotation control');
  const before=page.url();await page.mouse.click(point.x,point.y);
  assert.equal(page.url(),before);assert.equal(new URL(page.url()).searchParams.get(key),value);record(id+' preserves the selected city or landform');await capture(id);
  if(key==='city'){
   assert.equal(await page.locator('[data-city-panel="bangkok"] [data-climate-place]').textContent(),'バンコク－タイの雨温図');
   assert.match(await page.locator('[data-city-panel="bangkok"] .city-takeaway').textContent(),/年較差が小さく、雨の季節差が大きい/);
   assert.match(await page.locator('[data-city-panel="bangkok"] .city-class-description').textContent(),/最寒月も18℃以上.*60mm未満.*100－年降水量.*÷25/s);
   const climateOrder=await page.locator('[data-city-panel="bangkok"]').evaluate(node=>{const chart=node.querySelector('figure'),takeaway=node.querySelector('.city-takeaway'),classification=node.querySelector('[data-city-climate-class]');return {chart:chart.getBoundingClientRect().bottom,takeaway:takeaway.getBoundingClientRect().top,class:classification.getBoundingClientRect().top};});
   assert(climateOrder.takeaway>=climateOrder.chart-1&&climateOrder.class>climateOrder.takeaway,`The rainfall reading must directly follow the chart: ${JSON.stringify(climateOrder)}`);
   assert.doesNotMatch(await page.locator('[data-city-panel="bangkok"] .city-farming').textContent(),/メコン|エーヤワディー/);
   const baseCamera=new URL(page.url());
   for(const city of ['jakarta','haiphong']){
    await page.locator('[data-city-select]').selectOption(city);await page.locator(`[data-city-panel="${city}"]`).waitFor({state:'visible'});
    await page.waitForFunction(city=>!document.querySelector(`[data-city-panel="${city}"] [data-city-class-name]`).textContent.includes('未取得'),city);
    const position=await page.locator(`[data-city-panel="${city}"] [data-city-statistics]`).evaluate(node=>{const p=document.querySelector('.asia-reading-panel'),a=p.getBoundingClientRect(),b=node.getBoundingClientRect();return {first:p.firstElementChild.hasAttribute('data-city-reading-host'),offset:b.top-a.top,bottom:b.bottom};});
    assert(position.first&&position.offset<=24&&position.bottom<=page.viewportSize().height);await capture('city-'+city);
    const currentCamera=new URL(page.url());for(const param of ['lng','lat','z'])assert(Math.abs(Number(currentCamera.searchParams.get(param))-Number(baseCamera.searchParams.get(param)))<.01,'Selecting another city must preserve the Southeast map camera');
   }
   await page.locator('[data-city-select]').selectOption('');assert.equal(new URL(page.url()).searchParams.get('place'),null);
   record('regional city picker reaches Jakarta and Haiphong directly and clears to the whole region');
  }

 }
 await open('nature/?topic=water');await page.waitForFunction(()=>document.querySelector('[data-hydrology-status]')?.textContent===''&&!document.querySelector('[data-southeast-water-overview]')?.hidden);
 assert.match(await page.locator('[data-southeast-water-overview]').textContent(),/大陸部.*島嶼部/s);
 assert.equal(await page.locator('[data-water-select]').locator('option').count()>5,true);
 assert.equal(await page.locator('.asia-water-city-name').filter({hasText:'マニラ'}).count()>0,true);
 const riverNames=await page.locator('.asia-river-label:visible').allTextContents();for(const river of ['エーヤワディー川','サルウィン川','メコン川','紅河','カプアス川'])assert(riverNames.includes(river),`The water map must name ${river}: ${riverNames.join('、')}`);
 record('water overview explains mainland and island waters with Manila/Jakarta labels');await capture('water-overview');
 await expand('[data-hydrology-panel] > details:first-of-type');
 await page.locator('[data-hydrology-related="basins"]').click();await page.locator('[data-basin-shortcut]').first().click();
 assert.equal(await page.locator('[data-hydrology-panel]').isVisible(),true);
 await page.locator('[data-hydrology-related="groundwater"]').click();assert.equal(await page.locator('[data-hydrology-panel]').isVisible(),true);
 record('representative basin and groundwater topic remain selectable');
 await open('population/');await page.waitForFunction(()=>document.querySelector('[data-population-reading]')?.textContent.includes('ジャワ島'));
 assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.match(await page.locator('[data-reading-dock-summary]').textContent(),/ジャワ島.*大都市/s);
 assert.equal(await page.locator('.asia-population-name:not([disabled])').count(),0);
 assert.match(await page.locator('[data-population-detail]').textContent(),/港.*交通.*工業/s);
 record('population overview has Southeast Asia geography and does not infer ethnicity or religion');await capture('population-overview');
 await page.locator('[data-population-city]').selectOption('uc-5472');await page.locator('[data-population-city-facts]').waitFor({state:'visible'});
 await page.locator('[data-population-city]').selectOption('');assert.equal(new URL(page.url()).searchParams.get('detail'),null);assert.equal(new URL(page.url()).searchParams.get('place'),null);
 await page.locator('.asia-field-tabs [data-field="industry"]').click();await page.locator('[data-industry-region-reading]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-southeast-industry-map]').isVisible(),true);
 record('population city selection and return, then industry tab, retain regional overview');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);record('no horizontal page overflow');
 return {passed:true,checks};
}
