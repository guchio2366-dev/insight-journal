// Real production-build review. Reuses runner Chrome with its sandbox enabled.
// Only local built files are served; no sources or browsers are downloaded here.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const output=resolve(process.env.REGION_REVIEW_OUTPUT??'/tmp/oceania-russia-first-stage');
const farmingOnly=process.env.REGION_REVIEW_FARMING_ONLY==='1';
const industryReview=process.env.REGION_REVIEW_INDUSTRY==='1';
const physicalReview=process.env.REGION_REVIEW_PHYSICAL==='1';
const representativeOnly=process.env.REGION_REVIEW_REPRESENTATIVE_ONLY==='1';
const focusDeltaOnly=process.env.REGION_REVIEW_FOCUS_DELTA_ONLY==='1';
const regions=(process.env.REGION_REVIEW_REGIONS??'oceania,russia').split(',');
assert.ok(regions.length>0&&regions.every(region=>['oceania','russia'].includes(region)));
await mkdir(output,{recursive:true});
const directory=resolve('dist');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  assert.ok(pathname.startsWith('/insight-journal/'));
  pathname=pathname.slice('/insight-journal/'.length);if(pathname.endsWith('/'))pathname+='index.html';
  const file=resolve(directory,pathname);assert.ok(file.startsWith(directory+sep));
  const body=await readFile(file);res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(body);
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Missing local built file');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/`;
const result={status:'running',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(resolve(directory,'_release.json'),'utf8')),sandbox:true,viewports:[],checks:[],screenshots:[],errors:[],requests:[]};
let browser;
try{
 if(process.env.REGION_REVIEW_EXPECTED_HEAD){assert.equal(result.head,process.env.REGION_REVIEW_EXPECTED_HEAD);assert.equal(result.build.commitSha,result.head);}
 browser=await chromium.launch({executablePath:process.env.REGION_REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 result.browser=browser.version();
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(base).origin){result.errors.push(`Unexpected external request: ${url.href}`);return route.abort();}
  const response=await route.fetch({maxRedirects:0});
  result.requests.push({path:url.pathname,status:response.status()});
  if(response.status()>=400)result.errors.push(`${response.status()} ${url.pathname}`);
  await route.fulfill({response});await response.dispose();
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',error=>result.errors.push(error.message));
 const root=region=>page.locator(`[data-${region}-learning]`);
 const ready=async region=>{
  await page.waitForFunction(region=>document.querySelector(`[data-${region}-learning]`)?.dataset[region+'Ready']==='true',region);
  await page.evaluate(async()=>{
   await document.fonts.ready;
   await Promise.all([...document.querySelectorAll('[data-normal-view]:not([hidden]) image,[data-comparison-view]:not([hidden]) image')].map(el=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(new Error('Built distribution image failed: '+el.getAttribute('href')));image.src=el.getAttribute('href');})));
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
 };
 const open=async(region,field,search='')=>{await page.goto(`${base}atlas/${region}/${field}/${search}`,{waitUntil:'networkidle'});await ready(region);};
 const shot=async name=>{if(!name.includes('-nature-')){if(focusDeltaOnly&&!/^(?:oceania-agriculture-(1536|1920|1024)|russia-agriculture-(1536|1920))-(overview|crop-focus|single-product|selected-with-other-distributions)$/.test(name))return;if(representativeOnly&&!/^(?:oceania|russia)-agriculture-(1536|1024|1920)-(overview|crop-focus|single-product|selected-with-other-distributions)$/.test(name))return;}await page.screenshot({path:resolve(output,name+'.png'),fullPage:true});result.screenshots.push(name+'.png');};
 const annotationShot=async(map,product)=>{
  // Capture document pixels without element scrolling or a retained SVG handle.
  // Closing the details can resize the root and replace its SVG in the next frame.
  const clip=await map.locator(`[data-farming-place][data-place-product="${product}"]`).first().evaluate(el=>{
   const b=el.getBoundingClientRect(),x=Math.floor(b.x+scrollX),y=Math.floor(b.y+scrollY);
   return {x,y,width:Math.ceil(b.right+scrollX)-x,height:Math.ceil(b.bottom+scrollY)-y};
  });
  assert.ok(clip.width>0&&clip.height>0);
  return {clip,png:await page.screenshot({fullPage:true,clip})};
 };
 if(industryReview&&regions.includes('oceania')){
  await page.setViewportSize({width:1920,height:1080});
  assert.equal(await page.evaluate(()=>devicePixelRatio),1,'PC capture uses DPR 1');
  await open('oceania','industry');
  const host=root('oceania'),map=host.locator('[data-primary-map]');
  const capture=async name=>{const file=`oceania-industry-1920-${name}.png`;await page.screenshot({path:resolve(output,file),fullPage:true});result.screenshots.push(file);};
  const marks=()=>map.locator('[data-oceania-industry-location]');
  const mines=()=>map.locator('circle[stroke="#fff"][fill]');
  const frame=await map.locator('svg').first().getAttribute('viewBox');
  assert.equal(await host.locator('[data-place]').inputValue(),'all');
  assert.equal(await host.locator('[data-layer]').inputValue(),'industry-all');
  assert.equal(await marks().count(),8);
  assert.equal(await mines().count(),347);
  assert.equal(await map.locator('[data-oceania-industry-location][aria-pressed="true"]').count(),0);
  assert.match(await host.locator('[data-theme-title]').textContent(),/オセアニアの主要産業/);
  await capture('overview');
  await map.locator('[data-oceania-industry-location="lae-port"] path').click();await ready('oceania');
  assert.equal(new URL(page.url()).searchParams.get('industryLocation'),'lae-port');
  assert.equal(await host.locator('[data-theme-title]').textContent(),'ラエ港');
  assert.match(await host.locator('[data-explanation]').textContent(),/個々の鉱山の輸出港や鉱山からの輸送経路は/);
  assert.match(await host.locator('[data-source-list]').textContent(),/ラエ港の位置資料/);
  assert.equal(await host.locator('[data-oceania-industry-return]').isVisible(),true);
  assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
  assert.equal(await marks().count(),8);assert.equal(await mines().count(),347);
  assert.equal(await map.locator('[data-oceania-industry-location="lae-port"]').getAttribute('aria-pressed'),'true');
  await capture('lae-selected');
  await page.reload({waitUntil:'networkidle'});await ready('oceania');
  assert.equal(await host.locator('[data-theme-title]').textContent(),'ラエ港');
  assert.equal(await marks().count(),8);assert.equal(await mines().count(),347);
  await capture('lae-reloaded');
  await host.locator('[data-oceania-industry-return]').click();await ready('oceania');
  assert.equal(new URL(page.url()).searchParams.has('industryLocation'),false);
  assert.equal(await host.locator('[data-oceania-industry-return]').isVisible(),false);
  assert.equal(await marks().count(),8);assert.equal(await mines().count(),347);
  assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
  await capture('reset');
  await page.reload({waitUntil:'networkidle'});await ready('oceania');
  assert.equal(new URL(page.url()).searchParams.has('industryLocation'),false);
  assert.equal(await host.locator('[data-oceania-industry-return]').isVisible(),false);
  assert.equal(await marks().count(),8);assert.equal(await mines().count(),347);
  result.checks.push('Oceania industry at 1920×1080 CSS pixels and DPR 1: overview, Lae representative selection, reload and reset retain all eight named places, 347 Australian mine marks, source reading and the full regional frame.');
 }
 if(!farmingOnly||physicalReview){
  for(const width of [1920,1536,1024]){
   await page.setViewportSize({width,height:width===1920?1080:864});
   for(const region of regions){
    await open(region,'nature');
    const host=root(region),map=host.locator('[data-primary-map]');
    if(region==='oceania'){
     const heading=await host.locator('.oceania-learning-map-heading').first().boundingBox();
     const mapBounds=await map.boundingBox();
     assert.ok(heading.y+heading.height<=mapBounds.y+1,'Nature title and selector stay outside the map image');
    }
    const frame=await map.locator('svg').first().getAttribute('viewBox');
    for(const [id,unit,step] of [['precipitation','mm／年','250 mm'],['elevation','m（海抜）','500 m']]){
     await host.locator('[data-layer]').selectOption(id);await ready(region);
     assert.equal(new URL(page.url()).searchParams.get('layer'),id);
     assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     assert.equal(await host.locator('[data-place]').inputValue(),'all');
     assert.ok(await map.locator(`image[href*="${id}.png"]`).count()>0);
     assert.match(await host.locator('[data-primary-unit]').textContent(),new RegExp(unit.replace(/[()]/g,'\\$&')));
     assert.match(await host.locator('[data-primary-legend]').textContent(),new RegExp(step));
     assert.match(await host.locator('[data-primary-legend]').textContent(),/欠測・未収録（0ではない）/);
     assert.match(await host.locator('[data-coverage]').textContent(),id==='precipitation'?/河川|水量/:/標高/);
     assert.ok((await host.locator('[data-primary-legend]').boundingBox()).height<190);
     if(region==='oceania'){
      assert.equal(await map.locator('[data-map-place]').count(),0,'Numeric nature surfaces have outlines without country-selection targets');
      const point=await map.locator('svg').first().evaluate(svg=>{const point=svg.createSVGPoint();point.x=(134-110)/140*1200;point.y=(25+25)/83*757;const screen=point.matrixTransform(svg.getScreenCTM());return {x:screen.x,y:screen.y};});
      const before=page.url();await page.mouse.click(point.x,point.y);
      assert.equal(page.url(),before,'Clicking the Australian numeric surface retains the whole-region reading');
      assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     }
     if(id==='precipitation'){
      const labels=map.locator('[data-isohyet-label]');
      assert.equal(await labels.count(),region==='oceania'?6:7);
      assert.equal(await map.locator('[data-precipitation-map-unit]').isVisible(),true);
      const boxes=await map.locator('[data-isohyet-label-box]').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {id:node.parentElement.dataset.isohyetLabel,x:b.x,y:b.y,width:b.width,height:b.height};}));
      const names=await map.locator('svg > text').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {name:node.textContent,x:b.x,y:b.y,width:b.width,height:b.height};}));
      const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
      const bounds=await map.boundingBox();
      for(const [index,box] of boxes.entries()){
       assert.ok(box.height>=20,`${region}/${width}: rainfall number is readable`);
       assert.ok(box.x>=bounds.x&&box.y>=bounds.y&&box.x+box.width<=bounds.x+bounds.width&&box.y+box.height<=bounds.y+bounds.height,`${region}/${width}: rainfall label stays inside map`);
       for(const other of boxes.slice(index+1))assert.equal(overlap(box,other),false,`${region}/${width}: rainfall numbers do not overlap`);
       for(const name of names)assert.equal(overlap(box,name),false,`${region}/${width}: rainfall number ${box.id} avoids ${name.name}; ${JSON.stringify({box,name})}`);
      }
     }
     await shot(`${region}-nature-${width}-${id}`);
     await page.reload({waitUntil:'networkidle'});await ready(region);
     assert.equal(await host.locator('[data-layer]').inputValue(),id);
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await host.locator('[data-layer]').selectOption('rivers');await ready(region);
    assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
    assert.equal(await map.locator('[data-river-name]').count(),region==='russia'?5:3);
    if(region==='russia'&&width===1920){
     assert.ok(await map.locator('[data-river-label="Yenisey"]').isVisible());
     assert.equal(await map.locator('[data-region-marker][data-map-place="siberia"]').isVisible(),false,'Broad region box does not cover the river name');
    }
    assert.match(await host.locator('[data-primary-unit]').textContent(),/流向は示さない/);
    assert.match(await host.locator('[data-coverage]').textContent(),/流向・河口/);
    await shot(`${region}-nature-${width}-rivers`);
    await page.reload({waitUntil:'networkidle'});await ready(region);
    assert.equal(await host.locator('[data-layer]').inputValue(),'rivers');
   }
  }
  result.checks.push('Annual precipitation, selected named rivers, and elevation retain the whole-region frame, source distinctions, direct URL and reload state at 1920, 1536 and 1024px; Oceania nature controls remain outside the map.');
 }
 for(const width of representativeOnly?[1920,1536,1024]:[1920,1536,1280,1024]){
  await page.setViewportSize({width,height:width===1920?1080:864});
  for(const region of regions){
   const dimensions=[];
   for(const field of farmingOnly?['agriculture']:['agriculture','nature','industry','population']){
    await open(region,field);
    const host=root(region),map=host.locator('[data-primary-map]'),frame=await map.locator('svg').first().getAttribute('viewBox');
    assert.equal(await host.locator('[data-place]').inputValue(),'all');
    assert.equal(new URL(page.url()).searchParams.get('scope'),'all');
    if(region==='russia'&&field==='industry'){assert.equal(await map.locator('[data-russia-industry-location]').count(),10);assert.equal(await host.locator('[data-reading-status]').textContent(),'ロシアの概要');}
    else assert.ok((await host.locator('[data-theme-title]').textContent()).startsWith(region==='oceania'?'オセアニアの':'ロシアの'));
    assert.equal(await host.locator('[data-theme][aria-pressed=true]').count(),0);
    assert.equal(await host.locator('[data-primary-legend-spacer]').evaluate(el=>el.getBoundingClientRect().height),0);
    assert.ok(await host.locator('[data-primary-legend]').isVisible());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
    const bounds=await map.boundingBox();assert.ok(bounds.width>300&&bounds.height>=299);
    dimensions.push({field,width:bounds.width,height:bounds.height,frame});
    await shot(`${region}-${field}-${width}-overview`);
    if(farmingOnly){
     if(region==='russia'){
      const wheatShare=host.locator('.russia-wheat-share');
      const tradeGrid=host.locator('.russia-farming-trade-grid');
      assert.ok(await wheatShare.isVisible(),'Historical wheat share chart is visible below the map');
      assert.equal(await tradeGrid.locator(':scope > *').count(),3,'Supply, destinations and world share form three columns');
      const gridBounds=await tradeGrid.boundingBox(),shareBounds=await wheatShare.boundingBox();
      assert.ok(shareBounds.width<gridBounds.width*.38,'World share uses only the right third');
      assert.ok(gridBounds.height<430,'The lower row stays compact');
      assert.deepEqual(await tradeGrid.locator('.russia-wheat-use-bars strong').allTextContents(),['39.5百万t','23.5百万t','18百万t']);
      assert.match(await tradeGrid.textContent(),/2020年7月〜2021年2月.*エジプトとトルコ/);
      assert.match(await tradeGrid.textContent(),/全相手国別総量が未収録/);
      assert.equal(await wheatShare.locator('details').evaluate(el=>el.open),false,'Detailed values start folded');
      assert.match(await wheatShare.locator('h2').textContent(),/2022年.*12\.9%/);
      assert.deepEqual(await wheatShare.locator('tbody tr td:last-child').allTextContents(),['11.1%','9.7%','12.9%']);
      assert.equal(await wheatShare.locator('svg path.russia-wheat-line').count(),1);
      assert.match(await wheatShare.textContent(),/2023・24年.*非公式値.*除外/);
      assert.match(await wheatShare.textContent(),/2020年収穫面積とは別指標/);
      assert.ok((await wheatShare.boundingBox()).y>bounds.y+bounds.height,'Chart follows the map');
      const crop=await tradeGrid.evaluate(el=>{const b=el.getBoundingClientRect();return {x:Math.floor(b.left+scrollX),y:Math.floor(b.top+scrollY),width:Math.ceil(b.width),height:Math.ceil(b.height)};});
      await page.screenshot({path:resolve(output,`russia-agriculture-${width}-lower-row.png`),fullPage:true,clip:crop});
      result.screenshots.push(`russia-agriculture-${width}-lower-row.png`);
      const candidates=host.locator('.russia-farming-candidates');
      assert.ok(await candidates.isVisible());
      assert.match(await candidates.textContent(),/大麦.*テンサイ.*ヒマワリ種子/);
      assert.match(await candidates.textContent(),/ライムギ：.*2022\/23年度生産量は200万t.*全国分布格子は未収録/);
      assert.doesNotMatch(await candidates.textContent(),/暫定候補|次点候補|掲載の下限/);
      await candidates.locator('summary').click();
      assert.equal(await candidates.locator('li').count(),10);
      assert.match(await candidates.textContent(),/ライムギの全国行.*未収録/);
      const productCrop=await candidates.evaluate(el=>{const b=el.getBoundingClientRect();return {x:Math.floor(b.left+scrollX),y:Math.floor(b.top+scrollY),width:Math.ceil(b.width),height:Math.ceil(b.height)};});
      await page.screenshot({path:resolve(output,`russia-agriculture-${width}-products.png`),fullPage:true,clip:productCrop});
      result.screenshots.push(`russia-agriculture-${width}-products.png`);
      await candidates.locator('summary').click();
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok(await map.locator('path[fill="#e5e9e6"]').count()>0,'Initial missing area uses a quiet solid fill');
      assert.equal(await map.locator('[data-farming-product="cattle"][data-farming-mode="missing"]').getAttribute('opacity'),'0.18');
      const legend=host.locator('[data-primary-legend]'),key=host.locator('[data-key-legend]'),reading=host.locator('.russia-learning-reading');
      assert.equal(await key.evaluate(el=>!!el.closest('.russia-learning-map-panel')),true,'Legend belongs to the map panel');
      assert.equal(await reading.locator('[data-primary-legend]').count(),0,'Right reading is free of the map legend');
      assert.ok((await key.boundingBox()).y>=bounds.y+bounds.height-1,'Legend sits below the map');
      assert.ok(await host.locator('[data-geography-reading]').isVisible(),'Geographical explanation is visible initially');
      assert.equal(await host.locator('[data-explanation]').isVisible(),false,'Technical reading is folded initially');
      assert.match(await host.locator('[data-takeaway]').textContent(),/ロストフ.*オムスク.*ヤクーツク/);
      assert.match(await host.locator('[data-geography-reading]').textContent(),/冬小麦.*春小麦.*飼料.*肉・乳/);
      assert.doesNotMatch(await host.locator('[data-geography-reading]').textContent(),/4,500万t|USDAの2020\/21年度需給表/);
      const readingCrop=await reading.evaluate(el=>{const b=el.getBoundingClientRect();return {x:Math.floor(b.left+scrollX),y:Math.floor(b.top+scrollY),width:Math.ceil(b.width),height:Math.ceil(b.height)};});
      await page.screenshot({path:resolve(output,`russia-agriculture-${width}-reading.png`),fullPage:true,clip:readingCrop});
      result.screenshots.push(`russia-agriculture-${width}-reading.png`);
      assert.equal(await legend.locator('[data-farming-key]').count(),2);assert.equal(await legend.locator('[data-farming-legend]').count(),0);
      assert.ok((await key.boundingBox()).height<130,'Compact key and closed detail stay short');
      assert.equal(await host.locator('[data-primary-legend-definitions]').isVisible(),false);
      assert.equal(await host.locator('[data-region-option]').count(),0);assert.equal(await map.locator('[data-region-marker]').count(),0);
      assert.equal(await host.locator('[data-place]').count(),1,'One primary region control');
      const regionControl=await host.locator('[data-place]').boundingBox(),layerControl=await host.locator('[data-layer]').boundingBox();
      assert.ok(regionControl.y<bounds.y&&layerControl.y<bounds.y,'Primary controls are above the map');
      assert.ok(regionControl.x<(await reading.boundingBox()).x,'Region control is in the left workspace');
      const places=map.locator('[data-farming-place]');assert.equal(await places.count(),4);
      assert.deepEqual(await places.evaluateAll(elements=>elements.map(el=>Number(el.getAttribute('opacity')))),[1,1,1,1]);
      assert.equal(await places.locator('text').filter({hasText:'小麦｜'}).count(),2);assert.equal(await places.locator('text').filter({hasText:'牛｜'}).count(),2);
      const labels=await places.locator('rect').evaluateAll(elements=>elements.map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
      for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(labels[i].x+labels[i].width<=labels[j].x||labels[j].x+labels[j].width<=labels[i].x||labels[i].y+labels[i].height<=labels[j].y||labels[j].y+labels[j].height<=labels[i].y,'Farming names do not overlap');
      const legendDetails=host.locator('[data-climate-dictionary]');await legendDetails.locator('summary').click();
      assert.ok(await host.locator('[data-primary-legend-definitions]').isVisible());assert.match(await legendDetails.textContent(),/牛の有効0は点を描きません/);
      assert.equal(await legendDetails.locator('[data-farming-legend="cattle"] > div > span').count(),6);
      await legendDetails.locator('summary').click();
      const readingDetails=host.locator('.russia-learning-explanation');await readingDetails.locator('summary').click();
      assert.ok(await host.locator('[data-explanation]').isVisible());assert.ok(await host.locator('[data-coverage]').isVisible());
      const reader=await host.locator('.russia-learning-reading').evaluate(el=>({maxHeight:getComputedStyle(el).maxHeight,overflow:getComputedStyle(el).overflowY,client:el.clientHeight}));
      const scroll=await host.locator('.russia-reading-scroll').evaluate(el=>({overflow:getComputedStyle(el).overflowY,client:el.clientHeight}));
      assert.match(reader.maxHeight,/px$/);assert.equal(reader.overflow,'hidden');assert.ok(reader.client>0);
      assert.equal(scroll.overflow,'auto');assert.ok(scroll.client>0);
      await readingDetails.locator('summary').click();
      assert.equal(await map.locator('[data-farming-product="cattle"][data-farming-mode="missing"] rect[mask]').count(),1);
     }
     if(region==='oceania'){
      const key=host.locator('[data-key-legend]'),reading=host.locator('.oceania-learning-reading');
      const exportPanel=host.locator('[data-export-reading]');
      assert.ok(await exportPanel.isVisible());
      assert.deepEqual(await exportPanel.locator('li strong').allTextContents(),['85％','82％','77％','75％']);
      assert.match(await exportPanel.textContent(),/2022–23～2024–25年の3年平均・数量ベース/);
      assert.match(await exportPanel.textContent(),/2020年の収穫面積・家畜密度/);
      assert.match(await exportPanel.textContent(),/カノーラの位置は地図に未収録/);
      assert.ok((await exportPanel.boundingBox()).y>(await map.boundingBox()).y+bounds.height);
      assert.equal(await key.evaluate(el=>!!el.closest('.oceania-learning-map-panel')),true);
      assert.equal(await reading.locator('[data-primary-legend]').count(),0);
      assert.ok((await key.boundingBox()).y>=bounds.y+bounds.height-1);
      assert.ok((await key.boundingBox()).height<150);
      assert.equal(await host.locator('[data-primary-legend] [data-farming-key]').count(),5);
      assert.ok(await host.locator('[data-geography-reading]').isVisible());
      assert.match(await host.locator('[data-geography-reading]').textContent(),/南西部.*雨[\s\S]*牧草.*水[\s\S]*発酵・乾燥/);
      assert.equal(await host.locator('[data-explanation]').isVisible(),false);
      assert.equal(await host.locator('[data-primary-legend-definitions]').isVisible(),false);
      assert.equal(await host.locator('[data-place]').count(),1);
      assert.equal(await map.locator('[data-map-place]').count(),0,'Agriculture has no duplicate country controls/popups');
      const regionControl=await host.locator('[data-place]').boundingBox(),layerControl=await host.locator('[data-layer]').boundingBox();
      assert.ok(regionControl.y<bounds.y&&layerControl.y<bounds.y);
      assert.ok(regionControl.x<(await reading.boundingBox()).x);
      assert.equal(await host.locator('.oceania-learning-layer > span').evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
      const places=map.locator('[data-farming-place]');assert.equal(await places.count(),9);
      assert.equal(await map.locator('[data-farming-belt]').count(),7);
      for(const id of ['wheat-southeast','wheat-nz','coconut-png-islands','cacao-solomon-west'])assert.equal(await map.locator(`[data-farming-place="${id}"]`).count(),1);
      const labels=await places.locator('rect').evaluateAll(elements=>elements.map(el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
      for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.ok(labels[i].x+labels[i].width<=labels[j].x||labels[j].x+labels[j].width<=labels[i].x||labels[i].y+labels[i].height<=labels[j].y||labels[j].y+labels[j].height<=labels[i].y,'Farming names do not overlap');
      const legendDetails=host.locator('[data-primary-legend-dictionary]');await legendDetails.locator('summary').click();
      assert.ok(await host.locator('[data-primary-legend-definitions]').isVisible());
      assert.equal(await legendDetails.locator('[data-farming-legend]').count(),5);
      assert.match(await legendDetails.textContent(),/有効0.*未収録/);
      await legendDetails.locator('summary').click();
      const readingDetails=host.locator('.oceania-learning-explanation');await readingDetails.locator('summary').click();
      assert.ok(await host.locator('[data-explanation]').isVisible());assert.ok(await host.locator('[data-coverage]').isVisible());
      const reader=await host.locator('.oceania-learning-reading').evaluate(el=>({maxHeight:getComputedStyle(el).maxHeight,overflow:getComputedStyle(el).overflowY,client:el.clientHeight}));
      const scroll=await host.locator('.oceania-workspace-reading-scroll').evaluate(el=>({overflow:getComputedStyle(el).overflowY,client:el.clientHeight}));
      assert.match(reader.maxHeight,/px$/);assert.equal(reader.overflow,'hidden');assert.ok(reader.client>0);
      assert.equal(scroll.overflow,'auto');assert.ok(scroll.client>0);
      await readingDetails.locator('summary').click();
      await host.locator('[data-place]').selectOption('NZL');await ready(region);
      assert.match(await host.locator('[data-geography-reading]').textContent(),/乳牛と肉牛、羊毛と食肉/);
      assert.ok(await map.locator('[data-farming-product="sheep"]').count()>0);
      await host.locator('[data-place]').selectOption('all');await ready(region);
     }
     assert.equal(await host.locator('[data-layer]').inputValue(),'farming-all');
     const products=region==='russia'?['cattle','wheat']:['cacao','cattle','coconut','sheep','wheat'];
     const shown=async()=>[...new Set(await map.locator('[data-farming-product]').evaluateAll(elements=>elements.map(el=>el.dataset.farmingProduct)))].sort();
     assert.deepEqual(await shown(),products);
     if(region==='oceania')assert.equal(await map.locator('[data-farming-place]').evaluateAll(elements=>elements.every(el=>Number(getComputedStyle(el).opacity)===1)),true);
     assert.match(await host.locator('[data-explanation]').textContent(),region==='russia'?/他の品目の全国分布格子は未収録/:/上位10/);
     const cattle=map.locator('[data-farming-product="cattle"][data-farming-mode="texture"]');
     const initialOpacity=Number(await cattle.getAttribute('opacity'));
     const initialAnnotationPixels=new Map();
     if(region==='oceania'){await ready(region);for(const product of products)initialAnnotationPixels.set(product,await annotationShot(map,product));}
     await host.locator('[data-layer]').selectOption('wheat');await ready(region);
     assert.deepEqual(await shown(),products);
     assert.ok(Number(await cattle.getAttribute('opacity'))<initialOpacity);
     if(region==='russia'){
      const annotations=await map.locator('[data-farming-place]').evaluateAll(elements=>elements.map(el=>({product:el.dataset.placeProduct,opacity:Number(el.getAttribute('opacity'))})));
      assert.ok(annotations.filter(item=>item.product==='wheat').every(item=>item.opacity===1));
      assert.ok(annotations.filter(item=>item.product==='cattle').every(item=>item.opacity===.32));
     }
     assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     assert.equal(Number(await map.locator('[data-farming-product="wheat"][data-farming-mode="outline"]').getAttribute('opacity')),1);
     if(region==='oceania'){
      const annotations=await map.locator('[data-farming-place]').evaluateAll(elements=>elements.map(el=>({product:el.dataset.placeProduct,opacity:Number(getComputedStyle(el).opacity),hasName:!!el.querySelector('text'),hasIcon:!!el.querySelector('g[transform]')})));
      assert.equal(annotations.length,9);assert.ok(annotations.filter(item=>item.product==='wheat').every(item=>item.opacity===1));
      for(const item of annotations.filter(item=>item.product!=='wheat')){assert.ok(item.opacity>0&&item.opacity<.4,'Other names and livestock icons become faint');assert.ok(item.hasName&&item.hasIcon,'Faint annotations remain in the map');}
      const renderDeltas=[];
      for(const product of new Set(annotations.filter(item=>item.product!=='wheat').map(item=>item.product))){
       const item=annotations.find(item=>item.product===product);
       const before=initialAnnotationPixels.get(item.product),after=await annotationShot(map,item.product);
       assert.equal(after.clip.width,before.clip.width,'Annotation width stays fixed after crop focus');
       assert.equal(after.clip.height,before.clip.height,'Annotation height stays fixed after crop focus');
       assert.ok(Math.abs(after.clip.x-before.clip.x)<=4&&Math.abs(after.clip.y-before.clip.y)<=4,'Map controls do not substantially move annotations');
       assert.ok(!before.png.equals(after.png),'Rendered nonselected name/icon pixels change after crop focus');
       renderDeltas.push({product:item.product,overviewOpacity:1,cropFocusOpacity:item.opacity,clip:before.clip,overviewPngSha256:createHash('sha256').update(before.png).digest('hex'),cropFocusPngSha256:createHash('sha256').update(after.png).digest('hex')});
      }
      (result.annotationRenderDeltas??=[]).push({width,items:renderDeltas});
      result.checks.push(`Oceania ${width}px: all nine reading names start at opacity 1; wheat selection retains all three wheat names and fades the other products' names/icons to 0.32 while all five distributions remain.`);
     }
     await shot(`${region}-agriculture-${width}-crop-focus`);
     await page.reload({waitUntil:'networkidle'});await ready(region);
     assert.equal(await host.locator('[data-layer]').inputValue(),'wheat');assert.deepEqual(await shown(),products);
     await host.locator('[data-layer]').selectOption('cattle');await ready(region);
     assert.deepEqual(await shown(),products);
     if(region==='russia')assert.ok(await map.locator('[data-farming-place][data-place-product="wheat"][opacity="0.32"]').count()>0);
     assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     assert.match(await host.locator('[data-primary-legend-definitions] [data-farming-legend="cattle"] h3').textContent(),/頭／km²/);
     const single=host.locator('[data-farming-single]');assert.ok(await single.isVisible());
     await single.click();await ready(region);
     assert.equal(new URL(page.url()).searchParams.get('single'),'1');
     assert.equal(await single.getAttribute('aria-pressed'),'true');
     assert.deepEqual(await shown(),['cattle']);
     assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
     assert.equal(await host.locator('[data-primary-legend] [data-farming-key]:visible').count(),1);
     await shot(`${region}-agriculture-${width}-single-product`);
     await page.reload({waitUntil:'networkidle'});await ready(region);
     assert.deepEqual(await shown(),['cattle']);
     await single.click();await ready(region);
     assert.equal(new URL(page.url()).searchParams.has('single'),false);
     assert.deepEqual(await shown(),products);
     await page.goBack({waitUntil:'networkidle'});await ready(region);
     assert.deepEqual(await shown(),['cattle']);
     await page.goForward({waitUntil:'networkidle'});await ready(region);
     assert.deepEqual(await shown(),products);
     if(width===1536)await shot(`${region}-agriculture-${width}-livestock-focus`);
     if(region==='oceania')for(const product of ['coconut','cacao','sheep']){await host.locator('[data-layer]').selectOption(product);await ready(region);assert.deepEqual(await shown(),products);assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);assert.equal(await map.locator(`[data-farming-product="${product}"][data-farming-mode="quantity"]`).count(),1);}
     await host.locator('[data-layer]').selectOption('farming-all');await ready(region);
    }
    const layer=await host.locator('[data-layer]').inputValue(),compare=await host.locator('[data-compare-layer]').inputValue();
    if(region==='oceania')await host.locator('[data-place]').selectOption('PNG');
    else if(field==='agriculture'){await host.locator('[data-place]').focus();await host.locator('[data-place]').press('End');}
    else if(field==='industry')await host.locator('[data-region-option=far-east]').press('Enter');
    else await map.locator('[data-region-marker][data-map-place=far-east]').press('Enter');
    await ready(region);
    assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
    assert.equal(await host.locator('[data-layer]').inputValue(),layer);
    assert.equal(await host.locator('[data-compare-layer]').inputValue(),compare);
    if(region==='russia'){
     if(field==='agriculture'){
      assert.equal(await host.locator('[data-place]').inputValue(),'far-east');assert.equal(await map.locator('[data-region-marker]').count(),0);
      assert.match(await host.locator('[data-geography-reading]').textContent(),/ヤクーツク付近.*低密度の正値/);
      assert.equal(await host.locator('[data-place]').evaluate(el=>document.activeElement===el),true,'Native keyboard region focus survives redraw');
     }else if(field==='industry'){
      assert.equal(await host.locator('[data-place]').inputValue(),'far-east');assert.equal(await map.locator('[data-region-marker]').count(),0);assert.equal(await map.locator('[data-russia-industry-location]').count(),10);assert.equal(await host.locator('[data-region-option=far-east]').evaluate(el=>document.activeElement===el),true);
     }else{
      assert.equal(await map.locator('[data-region-marker]').count(),3);
      assert.equal(await map.locator('[data-region-marker][data-map-place=far-east]').evaluate(el=>document.activeElement===el),true,'Keyboard focus survives redraw');
     }
    }
    if(region==='oceania'&&field==='industry'){
     assert.equal(await map.locator('circle[fill][stroke="#fff"]').count(),347);
     assert.ok(await map.locator('path[fill][stroke="#fff"]').count()>0);
    }
    if(width===1536)await shot(`${region}-${field}-selected-with-other-distributions`);
    await page.reload({waitUntil:'networkidle'});await ready(region);
    assert.equal(await host.locator('[data-layer]').inputValue(),layer);
    assert.equal(await map.locator('svg').first().getAttribute('viewBox'),frame);
    await host.locator('[data-place]').selectOption('all');await ready(region);
    if(region==='russia'&&field==='industry'){assert.equal(await map.locator('[data-russia-industry-location]').count(),10);assert.equal(await host.locator('[data-reading-status]').textContent(),'ロシアの概要');}
    else assert.ok((await host.locator('[data-theme-title]').textContent()).startsWith(region==='oceania'?'オセアニアの':'ロシアの'));
   }
   for(const dimension of dimensions){assert.ok(Math.abs(dimension.width-dimensions[0].width)<2,`${region} field map widths agree`);assert.ok(Math.abs(dimension.height-dimensions[0].height)<2,`${region} field map heights agree`);}
   result.viewports.push({region,width,maps:dimensions});
  }
 }
 result.checks.push(farmingOnly?'Changed farming pages start with all saved crop/livestock products, full extent and overview. Product focus, country/native keyboard region selection, reload and reset retain other distributions.':'All eight direct field routes start at full extent and overview without a selected country/region/theme.');
 result.checks.push(farmingOnly?'At the requested PC widths including 1920×1080, crop focus keeps the full frame, and the explicit single-product mode survives reload and restores all saved products.':'All four field map dimensions agree per region at 1920, 1536, 1280 and 1024px; hidden legend duplicates reserve no height.');
 if(farmingOnly&&regions.includes('russia'))result.checks.push('Russia has source-backed crop/cattle names in the map, one left region control, a compact two-product key below the map, visible geographical reading and folded full technical/quantity information. Native keyboard focus and product retention pass.');
 await page.setViewportSize({width:1536,height:864});
 for(const region of regions){
  await open(region,'agriculture','?scope=all&layer=wheat&compare=cattle&view=comparison');
  const host=root(region),frame=await host.locator('[data-original-map] svg').first().getAttribute('viewBox');
  assert.equal(await host.locator('[data-comparison-map] svg').first().getAttribute('viewBox'),frame);
  assert.match(await host.locator('[data-original-unit]').textContent(),/ha/);assert.match(await host.locator('[data-comparison-unit]').textContent(),/頭/);
  await shot(`${region}-crop-livestock-comparison`);
 }
 // Existing US reference pages are captured, without claiming data completeness or exact inter-region geometry parity.
 for(const field of farmingOnly?[]:['agriculture','nature','industry','population']){
  await page.goto(`${base}atlas/north-america/${field}/`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  await shot(`us-${field}-reference`);
 }
 result.checks.push(farmingOnly?'Farming overlays and focused comparison retain separate source units, true zero and missing; product availability is explicitly limited.':'Crop and livestock comparison uses the same extent and separate units.');
 assert.deepEqual(result.errors,[]);
 result.status='passed';console.log(JSON.stringify({status:result.status,head:result.head,checks:result.checks,viewports:result.viewports,screenshots:result.screenshots},null,2));
}catch(error){
 result.status='failed';result.failure=String(error);
 if(process.env.GITHUB_ACTIONS==='true'){
  const detail=String(error?.stack??error).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
  console.error(`::error title=Oceania and Russia browser review failed::${detail}`);
 }
 throw error;
}
finally{await writeFile(resolve(output,'results.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));}
