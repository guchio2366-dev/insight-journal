import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';
import {mapPaintDifference,labelInk} from '../browser/helpers/atlas-map-paint-review.mjs';

const enabled=process.env.ATLAS_ASIA_BROWSER==='1';
const base='/insight-journal',root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const reviewFolder=path.resolve('review-artifacts/south-central-focus'),review={head:null,requestedHead:process.env.REVIEW_HEAD_SHA??null,buildRelease:null,sandbox:true,images:[],industryTransitions:[],captureAdjustments:[],renderChecks:[],deliveredPaintChecks:[]};
const renderReferences=new WeakMap();
const renderFollowup=new Set(['south-asia-industry','south-asia-industry-cleared','south-asia-industry-cleared-confirmed','1920-south-asia-industry-selected-sc-chattogram-garments','1440-south-asia-industry-selected-sc-dhaka-garments','1440-south-asia-industry-selected-sc-chattogram-garments','1024-south-asia-industry-selected-sc-dhaka-garments','1024-south-asia-industry-selected-sc-chattogram-garments']);
async function saveReview(){
 await mkdir(reviewFolder,{recursive:true});
 if(!review.head){review.head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();review.buildRelease=JSON.parse(await readFile(path.join(root,'_release.json'),'utf8'));if(review.requestedHead)assert.equal(review.head,review.requestedHead);}
 await writeFile(path.join(reviewFolder,'review.json'),JSON.stringify(review,null,2)+'\n');
}
async function settled(page){await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
async function captureState(page){return page.evaluate(()=>{const root=document.querySelector('[data-asia-atlas]'),map=root.atlasReviewMap,c=map.getCenter();return {url:location.href,camera:{lng:c.lng,lat:c.lat,zoom:map.getZoom()},selected:[...root.querySelectorAll('.asia-industry-regional-label[aria-pressed="true"]')].map(label=>label.dataset.industrySite),country:root.querySelector('[data-country-select]')?.value??null};});}
async function stableIndustryFrame(page,name){
 await page.waitForFunction(()=>{const root=document.querySelector('[data-asia-atlas]'),map=root?.atlasReviewMap;return map&&root.dataset.mapReady==='true'&&map.loaded()&&map.areTilesLoaded()&&!map.isMoving();});
 const before=await captureState(page);
 await page.mouse.move(1,1);
 await page.locator('.asia-map-frame').evaluate(frame=>frame.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const after=await captureState(page);assert.deepEqual(after,before,name+': revealing the map preserves URL, selection and exact camera');
 const saved=process.env.SC_FOCUSED_REVIEW!=='1'||renderFollowup.has(name);
 review.captureAdjustments.push({case:name,file:saved?name+'.png':null,viewport:page.viewportSize(),before,after,status:'passed'});
 let previous=null,consecutive=0,stableSince=0,result;
 const deadline=Date.now()+10000;
 while(Date.now()<deadline){
  await page.waitForFunction(()=>{const map=document.querySelector('[data-asia-atlas]')?.atlasReviewMap;return map&&map.loaded()&&map.areTilesLoaded()&&!map.isMoving();});
  const scene=await page.evaluate(()=>{
   const root=document.querySelector('[data-asia-atlas]'),map=root.atlasReviewMap,canvas=map.getCanvas(),rect=canvas.getBoundingClientRect(),frame=root.querySelector('.asia-map-frame'),gl=canvas.getContext('webgl2');
   const box=element=>{const r=element.getBoundingClientRect();return {left:r.left-rect.left,top:r.top-rect.top,right:r.right-rect.left,bottom:r.bottom-rect.top};};
   const markers=[...root.querySelectorAll('.maplibregl-marker')].filter(element=>element.getBoundingClientRect().width>0&&getComputedStyle(element).visibility!=='hidden');
   const masks=markers.map(element=>{const r=box(element);return {left:r.left-7,top:r.top-7,right:r.right+7,bottom:r.bottom+7};});
   const config=JSON.parse(root.querySelector('[data-asia-config]').textContent);for(const site of config.industrySites){const p=map.project(site.point);masks.push({left:p.x-22,top:p.y-22,right:p.x+22,bottom:p.y+22});}
   const visible=[[rect.left+4,rect.top+4],[rect.right-4,rect.top+4],[rect.left+4,rect.bottom-4],[rect.right-4,rect.bottom-4]].every(([x,y])=>x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&frame.contains(document.elementFromPoint(x,y)));
   return {bounds:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},clip:{x:Math.floor(rect.left),y:Math.floor(rect.top),width:Math.ceil(rect.right)-Math.floor(rect.left),height:Math.ceil(rect.bottom)-Math.floor(rect.top)},visible,loaded:map.loaded(),tilesLoaded:map.areTilesLoaded(),moving:map.isMoving(),contextHealthy:!!gl&&!gl.isContextLost(),masks,steel:box(root.querySelector('[data-industry-site="sc-odisha-steel"]'))};
  });
  assert.equal(scene.visible,true,name+': the complete map is inside the viewport and unobstructed');assert.equal(scene.contextHealthy,true,name+': live WebGL context');
  const png=await page.screenshot({clip:scene.clip,animations:'disabled'}),hash=createHash('sha256').update(png).digest('hex');
  if(hash===previous){consecutive++;}else{previous=hash;consecutive=1;stableSince=Date.now();}
  result={scene,png,hash,consecutive,stableMs:Date.now()-stableSince};
  if(consecutive>=3&&result.stableMs>=500)break;
  await page.waitForTimeout(100);
 }
 assert.ok(result?.consecutive>=3&&result.stableMs>=500,name+': three equal rendered map frames remain stable for at least 500ms');
 const {data,info}=await sharp(result.png).ensureAlpha().raw().toBuffer({resolveWithObject:true});result.pixels={data,width:info.width,height:info.height};
 let ocean=0,land=0;for(let i=0;i<data.length;i+=4){if(Math.abs(data[i]-230)<=3&&Math.abs(data[i+1]-238)<=3&&Math.abs(data[i+2]-240)<=3)ocean++;if(Math.abs(data[i]-225)<=3&&Math.abs(data[i+1]-228)<=3&&Math.abs(data[i+2]-219)<=3)land++;}
 const painted={oceanFraction:ocean/(info.width*info.height),landFraction:land/(info.width*info.height)};
 assert.ok(painted.oceanFraction>.02&&painted.landFraction>.05,name+': the stable reference contains the actual ocean and land paint: '+JSON.stringify(painted));
 const reference=renderReferences.get(page);let paint=null,ink=null;
 if(reference){
  paint=mapPaintDifference(reference.pixels,result.pixels,[...reference.scene.masks,...result.scene.masks]);
  assert.ok(paint.sampled>result.pixels.width*result.pixels.height*.2,name+': enough geographic pixels remain outside the overlays');
  assert.ok(paint.fraction<=.005,name+': geography has no persistent missing paint: '+JSON.stringify(paint));
  const beforeInk=labelInk(reference.pixels,reference.scene.steel),afterInk=labelInk(result.pixels,result.scene.steel);ink={before:beforeInk,after:afterInk};
  assert.ok(beforeInk.dark>20&&afterInk.dark>=beforeInk.dark*.95,name+': retained steel label text has no missing paint: '+JSON.stringify(ink));
 }else{renderReferences.set(page,result);}
 review.renderChecks.push({case:name,file:saved?name+'.png':null,viewport:page.viewportSize(),scene:result.scene,canvasSha256:result.hash,stableFrames:result.consecutive,stableMs:result.stableMs,painted,paint,steelInk:ink,status:'passed'});
 console.log(`Map render ${name}: visible, loaded, stable ${result.consecutive} frames/${result.stableMs}ms; missing paint ${paint?.fraction??'reference'}`);
 return result;
}
async function capturePc(page,name){
 const baseline=name==='south-asia-industry'||/^\d+-south-asia-industry-initial$/.test(name),wanted=process.env.SC_FOCUSED_REVIEW!=='1'||renderFollowup.has(name);
 if(!wanted&&!baseline)return;
 let render=null;
 if(baseline||renderFollowup.has(name)){await page.waitForLoadState('networkidle');render=await stableIndustryFrame(page,name);}
 if(!wanted){await saveReview();return;}
 if(!render){await page.waitForLoadState('networkidle');await settled(page);}await mkdir(reviewFolder,{recursive:true});
 const file=name+'.png';await page.screenshot({path:path.join(reviewFolder,file),animations:'disabled',fullPage:false});
 const bytes=await readFile(path.join(reviewFolder,file)),state=await page.evaluate(()=>({region:document.querySelector('[data-asia-config]')?.textContent?JSON.parse(document.querySelector('[data-asia-config]').textContent).focusId:null,field:document.querySelector('[data-asia-atlas]')?.dataset.field,query:location.search,dpr:devicePixelRatio}));
 if(render){
  assert.equal(state.dpr,1,'paint comparison uses the recorded DPR1 viewport');
  const clip=render.scene.clip,{data,info}=await sharp(bytes).extract({left:clip.x,top:clip.y,width:clip.width,height:clip.height}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),pixels={data,width:info.width,height:info.height},reference=renderReferences.get(page);
  const paint=mapPaintDifference(reference.pixels,pixels,[...reference.scene.masks,...render.scene.masks]),ink={before:labelInk(reference.pixels,reference.scene.steel),after:labelInk(pixels,render.scene.steel)};
  assert.ok(paint.fraction<=.005,file+': the delivered viewport PNG retains complete geographic paint: '+JSON.stringify(paint));
  assert.ok(ink.after.dark>=ink.before.dark*.95,file+': the delivered viewport PNG retains steel label paint: '+JSON.stringify(ink));
  review.deliveredPaintChecks.push({file,paint,steelInk:ink,status:'passed'});
 }
 review.images.push({file,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:page.viewportSize(),dpr:state.dpr,pngSize:{width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)},sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:page.url(),state,mapBounds:render?.scene.bounds??null});await saveReview();
}
async function industrySnapshot(page){
 await page.waitForLoadState('networkidle');
 await settled(page);
 return page.evaluate(()=>{
  const canvas=document.querySelector('.maplibregl-canvas').getBoundingClientRect();
  return {canvas:{left:canvas.left,top:canvas.top,width:canvas.width,height:canvas.height},camera:document.querySelector('[data-asia-atlas]').dataset.mapCamera,labels:[...document.querySelectorAll('.asia-industry-regional-label')].map(label=>{const box=label.getBoundingClientRect();return {id:label.dataset.industrySite,name:label.textContent,compact:label.classList.contains('is-compact'),named:[...label.children].some(child=>getComputedStyle(child).display!=='none'),pressed:label.getAttribute('aria-pressed')==='true',left:box.left-canvas.left,top:box.top-canvas.top,width:box.width,height:box.height};})};
 });
}
async function verifyIndustrySelection(page,before,selected,context,positionTolerance=.75){
 const after=await industrySnapshot(page);
 const identities=snapshot=>snapshot.labels.map(({id,name,compact,named})=>({id,name,compact,named}));
 assert.deepEqual(identities(after),identities(before),context+': displayed names and compact markers remain fixed');
 // History restores the existing URL precision (5 decimals for coordinates,
 // 3 for zoom). Pointer clicks may also scroll the document to the reading list.
 // Neither is a geographic label move: compare that precision, map size and
 // every label's position relative to the map, including compact markers.
 const camera=value=>{const c=JSON.parse(value);return {lng:c.lng.toFixed(5),lat:c.lat.toFixed(5),zoom:c.zoom.toFixed(3)};};
 assert.deepEqual(camera(after.camera),camera(before.camera),context+': camera remains fixed at the retained URL precision');
 for(const key of ['width','height'])assert.ok(Math.abs(after.canvas[key]-before.canvas[key])<=.75,context+': map '+key+' remains fixed: '+JSON.stringify({before:before.canvas,after:after.canvas}));
 for(const [i,label]of after.labels.entries())for(const key of ['left','top','width','height'])assert.ok(Math.abs(label[key]-before.labels[i][key])<=positionTolerance,`${context}: ${label.id} ${key} remains fixed relative to the map: ${before.labels[i][key]} → ${label[key]}`);
 assert.deepEqual(after.labels.filter(label=>label.pressed).map(label=>label.id),selected?[selected]:[],context+': only the chosen marker is emphasized');
 review.industryTransitions.push({context,viewport:page.viewportSize(),selected,positionTolerance,before,after,status:'passed'});await saveReview();
 return after;
}
async function serve(){
 const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith(base+'/')){res.writeHead(404).end();return;}
  const file=path.resolve(root,'.'+pathname.slice(base.length)+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
 }catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,url:`http://127.0.0.1:${server.address().port}${base}`};
}

test('南アジア・中央アジアの入口から選択、復帰、分野往復が地域内に保たれる',{skip:enabled?false:'ATLAS_ASIA_BROWSER=1 with a production build',timeout:180000},async()=>{
 const {chromium}=await import('playwright'),{server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1}),errors=[];
  await page.addInitScript(()=>{window.atlasRenderReview=true;});
  const focusedCaptures=new Set(['south-asia-climate-initial','south-asia-climate','south-asia-agriculture','south-asia-agriculture-tea','south-asia-forest-use','south-asia-terrain','south-asia-landform','south-asia-industry','south-asia-industry-selected','south-asia-industry-cleared','south-asia-population','south-asia-ethnicity','south-asia-religion','south-asia-nepal-religion','south-asia-sri-lanka-religion','south-asia-precipitation','south-asia-basins','south-asia-basin-selected','south-asia-groundwater','central-asia-climate-initial','central-asia-climate','central-asia-industry','central-asia-industry-selected','central-asia-agriculture','central-asia-population','central-asia-terrain','central-asia-landform','central-asia-religion','central-asia-precipitation','central-asia-water-selected','central-asia-ethnicity']);

  const capture=async name=>{if(process.env.SC_FOCUSED_REVIEW==='1'&&!focusedCaptures.has(name))return;await capturePc(page,name);};
  page.on('pageerror',error=>errors.push(error.message));
  for(const [region,expected,selected,city,foreign] of [
   ['south-asia',['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK'],'IND','new-delhi','KAZ'],
   ['central-asia',['KAZ','KGZ','TJK','TKM','UZB'],'KAZ','astana','IND'],
  ]){
   await page.goto(`${url}/atlas/asia/${region}/nature/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
   const config=JSON.parse(await page.locator('[data-asia-config]').textContent());
   assert.deepEqual(config.countries.map(c=>c.code).sort(),expected);
   assert.equal(config.focusId,region);
   assert.equal(config.cities.some(c=>c.id===city),true);
   assert.equal(await page.locator(`[data-country-select] option[value="${foreign}"]`).count(),0);
   assert.equal(await page.locator(`.regional-tabs a[href$="/${region}/"]`).getAttribute('aria-current'),'page');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(region==='central-asia'){
    const wind=page.locator('.asia-farm-region-label').filter({hasText:'中緯度の偏西風'});
    await wind.waitFor({state:'visible'});
    assert.match(await wind.textContent(),/偏西風/);
    assert.match(await page.locator('#asia-sources').textContent(),/地図の偏西風は/);
   }
   assert.equal(await page.locator('[data-country-select]').inputValue(),'');
   assert.equal(await page.locator('[data-city-select]').inputValue(),'');
   assert.equal(new URL(page.url()).searchParams.get('city'),null);
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   await capture(`${region}-climate-initial`);
   await page.locator('[data-city-select]').selectOption(city);
   assert.equal(new URL(page.url()).searchParams.get('city'),city);
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   await page.locator(`[data-city-panel="${city}"]`).waitFor({state:'visible'});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
   assert.equal(new URL(page.url()).searchParams.get('city'),city);
   await capture(`${region}-climate`);
   await page.locator('[data-reset]').click();
   assert.equal(new URL(page.url()).searchParams.get('city'),null);
   await page.locator('[data-country-select]').selectOption(selected);
   assert.equal(new URL(page.url()).searchParams.get('place'),selected);
   const otherCity=region==='south-asia'?'dhaka':'tashkent';
   assert.equal(await page.locator(`[data-city-select] option[value="${otherCity}"]`).isEnabled(),true);
   await page.locator('[data-city-select]').selectOption(otherCity);
   assert.equal(new URL(page.url()).searchParams.get('city'),otherCity);
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
   assert.equal(await page.locator('[data-city-select]').inputValue(),otherCity);
   assert.equal(await page.locator(`[data-city-select] option[value="${city}"]`).isEnabled(),true);
   await page.locator('[data-city-select]').selectOption(city);
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   await page.locator('[data-reset]').click();
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   assert.match(await page.locator('[data-current-place]').textContent(),new RegExp(region==='south-asia'?'南アジア':'中央アジア'));
   await page.locator(`.atlas-tabs [data-field="industry"]`).click();
   await page.waitForURL(`**/atlas/asia/${region}/industry/**`);
   const industry=JSON.parse(await page.locator('[data-asia-config]').textContent());
   assert.ok(industry.industrySites.every(site=>expected.includes(site.country)));
   assert.equal(await page.locator('[data-sc-industry-topic] option[value="sc-hydro"]').count(),1);
   await page.locator('.asia-industry-regional-label').first().waitFor({state:'visible'});
   assert.equal(await page.locator('.asia-industry-regional-label').count(),industry.industrySites.length);
   assert.match(await page.locator('.asia-industry-regional-label').first().textContent(),region==='south-asia'?/医薬品/: /石油|ウラン/);
   if(region==='south-asia'){
    assert.ok(await page.locator('.asia-industry-regional-label.is-compact').count()>0);
    assert.equal(await page.locator('.asia-industry-regional-label[data-industry-site="sc-dhaka-garments"] span').textContent(),'ダッカ・チッタゴン');
    for(const [id,industryName] of [['sc-ahmedabad-pharma','医薬品'],['sc-bengaluru-it','ITサービス']]){
     const label=page.locator(`.asia-industry-regional-label[data-industry-site="${id}"]`);
     assert.equal(await label.evaluate(node=>node.classList.contains('is-compact')),false);
     assert.match(await label.textContent(),new RegExp(industryName));
    }
   }
   if(region==='central-asia')for(const [id,name] of [['sc-inkai-uranium','インカイのウラン'],['sc-bozshakol-copper','ボズシャコルの銅'],['sc-muruntau-gold','ムルンタウの金']])assert.match(await page.locator(`[data-industry-site="${id}"]`).textContent(),new RegExp(name));
   const industryBefore=region==='south-asia'?await industrySnapshot(page):null;
   await capture(`${region}-industry`);
   await page.locator(region==='south-asia'?'.asia-industry-regional-label[data-industry-site="sc-dhaka-garments"]':'.asia-industry-regional-label').first().click();
   assert.ok(new URL(page.url()).searchParams.get('detail'));
   assert.equal(await page.locator('.asia-industry-regional-label[aria-pressed="true"].is-compact').count(),0);
   if(industryBefore)await verifyIndustrySelection(page,industryBefore,'sc-dhaka-garments','1920 South Asia Dhaka selection');
   await capture(`${region}-industry-selected`);
   await page.goBack();
   await page.waitForFunction(()=>new URL(location.href).searchParams.get('detail')===null);
   // URL round-trip can cross MapLibre's nearest-pixel boundary by one pixel.
   if(industryBefore){await verifyIndustrySelection(page,industryBefore,null,'1920 South Asia clear through history',1);await capture('south-asia-industry-cleared');await capturePc(page,'south-asia-industry-cleared-confirmed');}
   await page.goBack();
   await page.waitForURL(`**/atlas/asia/${region}/nature/**`);
   assert.equal(await page.locator('[data-country-select]').inputValue(),'');
   await page.locator(`.atlas-tabs [data-field="population"]`).click();
   await page.waitForURL(`**/atlas/asia/${region}/population/**`);
   const population=JSON.parse(await page.locator('[data-asia-config]').textContent());
   assert.ok(population.population.cities.every(item=>expected.includes(item.country)));
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.populationRiverStatus==='ready');
   await capture(`${region}-population`);
   const censusCodes=await page.locator('[data-sc-religion-select]').evaluateAll(buttons=>buttons.map(button=>button.dataset.scReligionSelect));
   assert.deepEqual(censusCodes,region==='central-asia'?['KAZ','KGZ','TJK','TKM','UZB']:['IND','PAK','BGD','NPL','LKA']);
   for(const topic of ['ethnicity','religion']){
    const visibleIds=population.presentation.settlements[topic].categories.map(category=>category.id);
    const legendIds=await page.locator(`[data-settlement-legend="${topic}"] [data-settlement-choice]`).evaluateAll(buttons=>buttons.map(button=>button.dataset.settlementChoice));
    assert.deepEqual(legendIds,visibleIds);
   }
   await page.goto(`${url}/atlas/asia/${region}/agriculture/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.focusMaskStatus==='ready');
   await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('[data-asia-atlas]')?.dataset.farmContextStatus));
   assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-farm-context-status'),'ready',await page.locator('[data-asia-atlas]').getAttribute('data-presentation-last-error'));
   if(region==='south-asia')assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-farm-livestock-features'),'8');
   await capture(`${region}-agriculture`);
   if(region==='south-asia'){
    for(const product of ['rice','wheat','cotton','chickpea','tea','sugarcane'])assert.equal(await page.locator(`.asia-farm-label[data-product="${product}"]`).count(),1);
    const camera=await page.locator('[data-asia-atlas]').getAttribute('data-map-camera');
    await page.locator('.asia-farm-label[data-product="tea"]').click();
    assert.equal(new URL(page.url()).searchParams.get('topic'),'tea');
    assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'),camera,'Selecting a crop keeps the regional view');
    assert.equal(await page.locator('.asia-farm-label[data-product="tea"]').getAttribute('aria-pressed'),'true');
    await capture('south-asia-agriculture-tea');
   }
   if(region==='central-asia'){
    assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-farm-livestock-features'),'6');
    for(const product of ['cattle','sheep','goat'])assert.equal(await page.locator(`[data-farm-choice="${product}"]`).count(),1);
    assert.match(await page.locator('[data-farm-density-key]').textContent(),/濃さは一律/);
   }
   const farmChoices=await page.locator('[data-farm-choice]').evaluateAll(nodes=>nodes.map(n=>n.dataset.farmChoice));
   assert.equal(farmChoices.includes(region==='central-asia'?'rice':'tea'),region==='south-asia');
   await page.locator('[data-farming-topic]').selectOption('forest');
   await page.locator('[data-country-select]').selectOption(region==='south-asia'?'IND':'KAZ');
   await page.waitForFunction(()=>document.querySelector('[data-farming-statistics-tables]')?.textContent?.includes('燃料材の生産量'));
   assert.match(await page.locator('[data-farming-statistics-tables]').textContent(),/産業用丸太の生産量/);
   assert.match(await page.locator('[data-farming-reference]').textContent(),region==='south-asia'?/FAO・ネパール/: /UNECE・中央アジア/);
   if(region==='central-asia')assert.doesNotMatch(await page.locator('[data-farming-reference]').textContent(),/インド|India|India State/i);
   await capture(`${region}-forest-use`);
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=terrain`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');
   if(region==='central-asia'){
    const turan=page.locator('.asia-farm-region-label').filter({hasText:'トゥランの乾燥低地'});
    await turan.waitFor({state:'visible'});
    assert.match(await turan.textContent(),/トゥランの乾燥低地/);
    assert.match(await page.locator('[data-sc-landform-sources]').textContent(),/トゥランの冬季寒冷砂漠/);
   }
   await capture(`${region}-terrain`);
   const terrainText=await page.locator('[data-physical-reading]').textContent();
   if(region==='central-asia')assert.doesNotMatch(terrainText,/ネパール|デカン|インド半島|ベンガル/);
   if(region==='central-asia')assert.ok(await page.locator('.asia-landform-label').count()>=5);
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=landform`,{waitUntil:'domcontentloaded'});
   await page.locator('.asia-landform-label').first().waitFor({state:'visible'});
   await capture(`${region}-landform`);
   await page.locator('.asia-landform-label').first().click();
   assert.ok(new URL(page.url()).searchParams.get('detail'));
   if(region==='central-asia')assert.equal(new URL(page.url()).searchParams.get('place'),null);
   assert.equal(await page.locator('[data-physical-reading]').isVisible(),true);
   await capture(`${region}-landform-selected`);
   if(region==='central-asia'&&process.env.SC_FOCUSED_REVIEW==='1')await capturePc(page,'central-asia-landform-selected');
   await page.goto(`${url}/atlas/asia/${region}/population/?topic=religion`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(count=>document.querySelectorAll('.sc-religion-marker').length===count,region==='central-asia'?1:5);
   await page.waitForFunction(count=>document.querySelectorAll('.sc-religion-report-marker:not(.local)').length===count,region==='central-asia'?4:0);
   if(region==='south-asia')await page.waitForFunction(()=>document.querySelectorAll('.sc-religion-local-marker').length===8);
   if(region==='south-asia')await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.southReligionStates==='34');
   if(region==='south-asia'){
    const collisions=await page.evaluate(()=>['NPL','LKA'].flatMap(code=>{const label=document.querySelector(`.sc-religion-marker[data-religion-country="${code}"] span`)?.getBoundingClientRect();if(!label)return [code+' national label missing'];return [...document.querySelectorAll('.sc-religion-local-marker.is-compact')].filter(dot=>{const box=dot.getBoundingClientRect();return box.left<label.right+2&&box.right>label.left-2&&box.top<label.bottom+2&&box.bottom>label.top-2;}).map(dot=>code+':'+dot.dataset.religionLocal); }));
    assert.deepEqual(collisions,[]);
   }
   await capture(`${region}-religion`);
   const markers=await page.locator('.sc-religion-marker').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
   assert.equal(markers.some(label=>label.includes('カザフスタン')),region==='central-asia');
   await page.locator('.sc-religion-marker').first().click();
   assert.ok(expected.includes(new URL(page.url()).searchParams.get('place')));
   await page.goBack();
   await page.waitForFunction(()=>new URL(location.href).searchParams.get('place')===null);
   assert.equal(await page.locator('.sc-religion-marker').count(),region==='central-asia'?1:5);
   if(region==='south-asia'){
    await page.locator('[data-religion-local="pk-sindh-religion"]').click();
    assert.equal(new URL(page.url()).searchParams.get('story'),'pk-sindh-religion');
    assert.match(await page.locator('[data-sc-religion-local-reading]').textContent(),/6.43%/);
    assert.equal(await page.locator('[data-sc-religion-country="PAK"]').isVisible(),false);
    assert.equal(await page.locator('[data-sc-religion-local-panel]').evaluate(node=>node.previousElementSibling?.tagName),'H2');
    await capture('south-asia-sindh-religion');
    await page.goBack();
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('place')===null);
    for(const [id,name] of [['np-koshi-kirat','south-asia-nepal-religion'],['lk-jaffna-hindu','south-asia-sri-lanka-religion']]){
     await page.locator(`[data-religion-local="${id}"]`).click();
     assert.equal(new URL(page.url()).searchParams.get('story'),id);
     assert.equal(await page.locator(`[data-religion-local="${id}"].is-compact`).count(),0);
     assert.equal(await page.locator('[data-sc-religion-local-panel]').isVisible(),true);
     await capture(name);
     await page.goBack();
     await page.waitForFunction(()=>new URL(location.href).searchParams.get('story')===null);
    }
   }
   if(region==='central-asia'){
    assert.equal(await page.locator('[data-settlement-legend="religion"]').isVisible(),true);
    assert.match(await page.locator('[data-sc-religion-census]').textContent(),/GeoEPR 2021/);
    await page.locator('.sc-religion-report-marker[aria-label^="タジキスタン"]').click();
    assert.equal(new URL(page.url()).searchParams.get('place'),'TJK');
    assert.match(await page.locator('[data-sc-religion-country="TJK"]').textContent(),/GBAO/);
    await page.goBack();
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('place')===null);
   }
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=precipitation`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');
   assert.ok(Number(await page.locator('[data-asia-atlas]').getAttribute('data-contour-band-features'))>0);
   assert.ok(Number(await page.locator('[data-asia-atlas]').getAttribute('data-contour-line-features'))>0);
   assert.match(await page.locator('[data-hydrology-legend]').textContent(),/250.*500/s);
   if(region==='south-asia')assert.match(await page.locator('[data-hydrology-legend]').textContent(),/3,000以上/);
   if(region==='central-asia')assert.ok(await page.locator('.asia-rain-label').count()>0);
   await capture(`${region}-precipitation`);
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=basins`,{waitUntil:'domcontentloaded'});
   await page.locator('[data-basin-shortcuts] button:enabled').first().waitFor();
   assert.equal(await page.locator('[data-basin-shortcuts]').isVisible(),true);
   await page.locator('[data-hydrology-detail-label]').waitFor({state:'visible'});
   if(region==='south-asia')await page.locator('.asia-river-label').filter({hasText:'ブラマプトラ川'}).waitFor({state:'visible'});
   await capture(`${region}-basins`);
   const basinOption=await page.locator('[data-hydrology-detail] option:not([value=""])').first().getAttribute('value');
   await page.locator('[data-hydrology-detail]').selectOption(basinOption);
   assert.equal(new URL(page.url()).searchParams.get('detail'),basinOption);
   await page.goBack();
   await page.waitForFunction(()=>new URL(location.href).searchParams.get('detail')===null);
   await page.locator('[data-basin-shortcuts] button:enabled').first().click();
   assert.ok(new URL(page.url()).searchParams.get('detail'));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('[data-basin-shortcuts] button[aria-pressed="true"]').first().waitFor();
   await capture(`${region}-basin-selected`);
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=groundwater`,{waitUntil:'domcontentloaded'});
   await page.locator('[data-hydrology-detail-label]').waitFor({state:'visible'});
   await page.locator('[data-hydrology-detail] option:not([value=""])').first().waitFor({state:'attached'});
   await capture(`${region}-groundwater`);
   const groundwaterOption=await page.locator('[data-hydrology-detail] option:not([value=""])').first().getAttribute('value');
   await page.locator('[data-hydrology-detail]').selectOption(groundwaterOption);
   assert.equal(new URL(page.url()).searchParams.get('detail'),groundwaterOption);
   await capture(`${region}-groundwater-selected`);
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=water`,{waitUntil:'domcontentloaded'});
   await page.locator('[data-water-picker]').waitFor({state:'visible'});
   await page.locator('[data-water-select]').selectOption(region==='south-asia'?'rivers-194':'rivers-112');
   if(region==='central-asia')assert.equal(await page.locator('.asia-city-name:visible').count(),0);
   assert.match(await page.locator('[data-south-central-river-reading]').textContent(),region==='south-asia'?/ガンジス/:/アムダリヤ/);
   if(region==='south-asia'){
    await page.locator('[data-water-select]').selectOption('rivers-134');
    assert.match(await page.locator('[data-south-central-river-reading]').textContent(),/ブラマプトラ/);
   }
   await capture(`${region}-water-selected`);
   await page.goto(`${url}/atlas/asia/${region}/population/?topic=ethnicity`,{waitUntil:'domcontentloaded'});
   await capture(`${region}-ethnicity`);
   if(region==='south-asia'){
    await page.locator('[data-sc-domestic-topic="in-language-overview"]').click();
    await page.waitForURL('**topic=in-language-overview**');
    await capture('south-asia-mother-tongue');
    await page.goto(`${url}/atlas/asia/${region}/population/?topic=religion`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-sc-domestic-topic="in-religion-muslim"]').click();
    await page.waitForURL('**topic=in-religion-muslim**');
    await capture('south-asia-state-religion');
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

test('南アジアの三産業入口と作物重複域を表示する',{skip:enabled?false:'ATLAS_ASIA_BROWSER=1 with a production build',timeout:120000},async()=>{
 const {chromium}=await import('playwright'),{server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  await page.goto(`${url}/atlas/asia/south-asia/industry/`);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
  assert.deepEqual(await page.locator('.asia-industry-sectors button').allTextContents(),['資源・エネルギー','製造業','サービス業']);
  for(const [topic,expected] of [['sc-south-resources','水力'],['sc-south-manufacturing','医薬品'],['sc-south-services','ITサービス']]){
   await page.locator(`[data-industry-feature="${topic}"]`).click();
   await page.waitForFunction(id=>new URL(location.href).searchParams.get('topic')===id,topic);
   assert.match(await page.locator('[data-industry-title]').textContent(),new RegExp(topic==='sc-south-resources'?'資源・エネルギー':topic==='sc-south-manufacturing'?'製造業':'サービス業'));
   assert.match((await page.locator('.asia-industry-regional-label').allTextContents()).join(' '),new RegExp(expected));
  }
  await page.goto(`${url}/atlas/asia/south-asia/agriculture/?topic=tea`);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmContextStatus==='ready');
  const manifest=JSON.parse(await page.locator('[data-asia-config]').textContent());
  assert.equal(manifest.presentation.farming.cropFile,'south-asia.crop-areas.json.gz');
  assert.match(await page.locator('[data-grid-reading]').textContent(),/他作物と重なる/);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

test('中央アジアの地形操作は国選択を作らず宗教色面の透過度を復元する',{skip:enabled?false:'ATLAS_ASIA_BROWSER=1 with a production build',timeout:120000},async()=>{
 const {chromium}=await import('playwright'),{server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  await page.goto(`${url}/atlas/asia/central-asia/nature/?topic=terrain&place=KAZ`);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');
  assert.equal(new URL(page.url()).searchParams.get('place'),null);
  const focus=await page.locator('[data-physical-focus] option[value]:not([value=""])').first().getAttribute('value');
  await page.locator('[data-physical-focus]').selectOption(focus);
  assert.equal(new URL(page.url()).searchParams.get('place'),null);
  assert.equal(await page.locator('[data-current-place]').textContent().then(t=>t.includes('中央アジア')),true);
  const contour=page.locator('.asia-rain-label[aria-label$="mの等高線"]:visible').first();
  await contour.waitFor({state:'visible'});
  await contour.click();
  assert.equal(new URL(page.url()).searchParams.get('place'),null);
  assert.match(await page.locator('.asia-point-marker').textContent(),/選択した地点/);
  await capturePc(page,'central-asia-terrain-selected');
  await page.goto(`${url}/atlas/asia/central-asia/population/?topic=ethnicity`);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.settlementPaintOpacity==='0.8');
  await capturePc(page,'central-asia-ethnicity-before-religion');
  await page.locator('[data-population-group="religion"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.settlementPaintOpacity==='0.43');
  await capturePc(page,'central-asia-religion-between-ethnicity');
  await page.locator('[data-population-group="identity"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.settlementPaintOpacity==='0.8');
  await capturePc(page,'central-asia-ethnicity-restored');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

test('南アジア産業の全地点とPC三幅の代表選択は表示集合と相対位置を固定する',{skip:enabled?false:'ATLAS_ASIA_BROWSER=1 with a production build',timeout:90000},async()=>{
 const {chromium}=await import('playwright'),{server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  for(const [width,height]of [[1920,1080],[1440,900],[1024,768]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>{window.atlasRenderReview=true;});
   await page.goto(`${url}/atlas/asia/south-asia/industry/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelectorAll('.asia-industry-regional-label').length>0);
   const before=await industrySnapshot(page);
   assert.ok(before.labels.some(label=>label.compact));
   assert.equal(before.labels.some(label=>label.pressed),false);
   const sites=JSON.parse(await page.locator('[data-asia-config]').textContent()).industrySites;
   assert.deepEqual(before.labels.map(label=>label.id).sort(),sites.map(site=>site.id).sort());
   await capturePc(page,`${width}-south-asia-industry-initial`);
   const compact='sc-chattogram-garments';assert.equal(before.labels.find(label=>label.id===compact).compact,true);
   const selectionIds=width===1920?before.labels.map(label=>label.id):['sc-dhaka-garments',compact,'sc-ahmedabad-pharma','sc-bengaluru-it'];
   for(const id of selectionIds){
    console.log(`South industry ${width}px: selecting ${id}`);
    // The existing reading list also selects sites whose overview marker is compact.
    await page.locator('.sc-industry-site-list button').filter({hasText:sites.find(site=>site.id===id).name}).click();
    await page.waitForFunction(selected=>new URL(location.href).searchParams.get('detail')===selected,id);
    await verifyIndustrySelection(page,before,id,`${width} South Asia ${id}`);
    if(id==='sc-dhaka-garments'||id===compact)await capturePc(page,`${width}-south-asia-industry-selected-${id}`);
   }
   await page.locator('[data-reset]').click();
   await page.waitForFunction(()=>new URL(location.href).searchParams.get('detail')===null);
   await verifyIndustrySelection(page,before,null,`${width} South Asia reset`);
   await capturePc(page,`${width}-south-asia-industry-reset`);
   assert.deepEqual(errors,[]);await page.close();
   console.log(`South industry ${width}px: ${selectionIds.length} selections and reset passed`);
  }
  if(process.env.SC_FOCUSED_REVIEW==='1'){
   assert.equal(review.images.length,8,'only the eight requested render followup views are saved');
   const total=review.images.reduce((sum,image)=>sum+image.bytes,0)+(await readFile(path.join(reviewFolder,'review.json'))).length;
   assert.ok(total<20_000_000,'the standalone render followup remains below 20MB');console.log(`Render followup: ${review.images.length} PNGs plus review.json; ${total} uncompressed bytes < 20MB.`);
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
