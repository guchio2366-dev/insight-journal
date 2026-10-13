/** Verify the integrated build or the existing Pages deployment, with sandboxed Chrome. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {waitForUsReligionPaint} from './verify-us-religion-paint.mjs';

const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const expected=process.env.INTEGRATION_EXPECTED_SHA??head;
assert.equal(head,expected,'checkout must match the requested release');
const publishedExpected=process.env.INTEGRATION_PUBLISHED_SHA||expected;
assert.match(publishedExpected,/^[a-f0-9]{40}$/,'published release must be a complete pinned SHA');
const dist=resolve('dist'),out=resolve('review-artifacts/integrated-maps');
await mkdir(out,{recursive:true});
const production=process.env.INTEGRATION_TARGET==='production';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
let server,browser,page;
if(!production){
 server=createServer(async(req,res)=>{try{
  let file=resolve(dist,'.'+new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,''));
  assert(file.startsWith(dist+sep));if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(await readFile(file));
 }catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
}
const base=production?'https://guchio2366-dev.github.io/insight-journal':`http://127.0.0.1:${server.address().port}/insight-journal`;
const origin=new URL(base).origin;
const report={head,expected,publishedExpected:production?publishedExpected:expected,target:production?'production':'build',base,startedAt:new Date().toISOString(),viewport:{width:1920,height:1080},dpr:1,sandbox:true,status:'running',scenes:[],operations:[],assets:[],images:[],errors:[],failedRequests:[],externalRequests:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function shot(name){
 await page.evaluate(async()=>{await document.fonts.ready;scrollTo({top:0,left:0,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 const file=name+'.jpg',bytes=await page.screenshot({path:resolve(out,file),type:'jpeg',quality:55,animations:'disabled'});
 report.images.push({file,sha256:hash(bytes),url:page.url()});
}
async function settle(){await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function stableFarmSnapshot(selected){
 return page.evaluate(async selected=>{
  let previous='',since=0,frames=0,last;const started=performance.now();
  while(performance.now()-started<10000){
   const root=document.querySelector('[data-asia-atlas]'),frame=root.querySelector('.asia-map-frame'),b=frame.getBoundingClientRect();
   last={selected:root.dataset.farmSelected,ready:root.dataset.farmContextStatus,mapReady:root.dataset.mapReady,camera:JSON.parse(root.dataset.mapCamera),scroll:{x:scrollX,y:scrollY},frame:{x:b.x,y:b.y,width:b.width,height:b.height},layout:{height:root.style.getPropertyValue('--asia-farm-map-height'),available:root.style.getPropertyValue('--asia-map-available-height')},points:[...root.querySelectorAll('.asia-livestock-point')].filter(n=>n.getBoundingClientRect().width&&!n.hidden).map(n=>({name:n.getAttribute('aria-label'),x:parseFloat(n.style.left),y:parseFloat(n.style.top),opacity:parseFloat(getComputedStyle(n).opacity)}))};
   const fingerprint=JSON.stringify(last),now=performance.now();
   if(last.ready==='ready'&&last.mapReady==='true'&&last.selected===selected&&last.points.length&&fingerprint===previous){frames++;if(frames>=3&&now-since>=500)return{...last,stableFrames:frames,stableMs:now-since};}
   else{since=now;frames=1;previous=fingerprint;}
   await new Promise(r=>requestAnimationFrame(r));
  }
  throw Error('Farm layout did not reach a naturally stable state: '+JSON.stringify(last));
 },selected);
}
async function checkAsset(relative){
 const response=await page.request.get(base+'/'+relative);assert.equal(response.status(),200,relative);
 const actual=await response.body(),local=await readFile(resolve(dist,relative));
 assert.equal(hash(actual),hash(local),relative+' must match this checkout build');
 report.assets.push({path:relative,sha256:hash(actual)});await response.dispose();
}
async function camera(scene){
 if(scene.cameraRoot)return JSON.parse(await page.locator(scene.cameraRoot).getAttribute('data-map-camera'));
 if(scene.urlCamera){const q=new URL(page.url()).searchParams;return{lng:Number(q.get('lng')),lat:Number(q.get('lat')),zoom:Number(q.get('z'))};}
 return scene.svg?await page.locator(scene.svg).first().getAttribute('viewBox'):null;
}
function sameCamera(actual,before,tolerance=1e-6){
 if(typeof before==='string')assert.equal(actual,before,'selection preserves SVG camera');
 else if(before){for(const key of ['lng','lat','zoom'])assert(Math.abs(actual[key]-before[key])<=tolerance,'selection preserves '+key);}
}
const scenes=[
 {id:'us',path:'north-america/nature/',map:'[data-map-frame]',ready:'[data-atlas-explorer][data-render-state="ready"][data-nature-load="ready"]',urlCamera:true,select:'[data-nature-label="city:miami"]'},
 {id:'canada',path:'north-america/canada/nature/?view=climate',map:'[data-canada-natural-layer="climate"] .atlas-map-frame',svg:'[data-canada-natural-layer="climate"] [data-canada-natural-fallback]',select:'[data-canada-natural-city="toronto"]'},
 {id:'mexico',path:'north-america/mexico/nature/',map:'[data-mexico-nature-main-map]',ready:'[data-mexico-workspace][data-mexico-nature-ready="true"]',svg:'[data-mexico-nature-main-map]',select:'svg [data-mexico-climate-city="mexico-city-tacubaya"]'},
 {id:'latin',path:'latin-america/nature/',map:'.latin-nature-map',ready:'[data-latin-workspace][data-layout-ready="true"]'},
 {id:'europe',path:'europe/nature/',map:'.eu-map-stage',selectControl:'[data-eu-city-choice]'},
 {id:'africa',path:'africa/?field=nature&topic=climate',map:'.africa-map-frame',svg:'.africa-map',select:'[data-africa-city-label="antananarivo"]',keyboard:true},
 {id:'japan',path:'japan/nature/',map:'.japan-map-frame',ready:'[data-japan-atlas][data-map-ready="true"][data-nature-ready="true"]',cameraRoot:'[data-japan-atlas]',selectControl:'[data-japan-climate-city]'},
 ...['east-asia','south-asia','central-asia','southeast-asia'].map(id=>({id,path:'asia/'+id+'/nature/',map:'.asia-map-frame',ready:'[data-asia-atlas][data-map-ready="true"]',cameraRoot:'[data-asia-atlas]',selectControl:'[data-city-select]'})),
 {id:'west-asia',path:'west-asia/nature/',map:'[data-west-map]',ready:'[data-west-atlas][data-ready="true"]',svg:'[data-west-map]'},
 ...['russia','oceania'].map(id=>({id,path:id+'/nature/',map:'[data-primary-map]',ready:`[data-${id}-learning][data-${id}-ready="true"]`})),
];
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 report.browser=browser.version();
 const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,locale:'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(/^https?:$/.test(url.protocol)&&url.origin!==origin){report.externalRequests.push(url.href);return route.abort();}return route.continue();});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400)report.failedRequests.push({url:response.url(),status:response.status()});});
 const release=await page.request.get(base+'/_release.json');assert.equal(release.status(),200);report.release=await release.json();assert.equal(report.release.commitSha,report.publishedExpected);await release.dispose();
 for(const scene of scenes){
  const response=await page.goto(base+'/atlas/'+scene.path,{waitUntil:'networkidle'});assert.equal(response.status(),200,scene.id);
  if(scene.ready)await page.locator(scene.ready).waitFor();await settle();
  const map=page.locator(scene.map).first();assert(await map.isVisible(),scene.id+' visible map');const box=await map.boundingBox();assert(box.width>400&&box.height>280,scene.id+' readable map');
  const metrics=await page.evaluate(()=>({dpr:devicePixelRatio,scale:visualViewport.scale,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.deepEqual(metrics,{dpr:1,scale:1,width:1920,height:1080,overflow:false});
  if(scene.cameraRoot){assert.equal(await page.locator(scene.id==='japan'?'[data-japan-fallback]':'[data-map-fallback]').isVisible(),false);}
  if(scene.id==='us')assert.equal(await page.locator('[data-fallback]').isVisible(),false);
  // Match actual loaded shared bundles against the exact build, as well as raster data below.
  const bundles=await page.locator('script[src],link[rel="stylesheet"][href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')??n.getAttribute('href')).filter(url=>url.startsWith('/insight-journal/_astro/')));
  for(const url of [...new Set(bundles)]){const relative=url.slice('/insight-journal/'.length);if(!report.assets.some(a=>a.path===relative))await checkAsset(relative);}
  await shot(scene.id+'-initial');
  const before=await camera(scene),initialCity=new URL(page.url()).searchParams.get('city');let selected;
  if(scene.selectControl){
   const control=page.locator(scene.selectControl);selected=await control.locator('option').evaluateAll(nodes=>nodes.find(n=>n.value&&!n.disabled&&!n.hidden)?.value);assert(selected,scene.id+' has a selectable city');await control.selectOption(selected);
  }else if(scene.select){
   const target=page.locator(scene.select);if(scene.keyboard){await target.focus();await page.keyboard.press('Enter');}else await target.click();selected=scene.select;
  }
  if(selected){
   await settle();sameCamera(await camera(scene),before);const selectedURL=page.url();
   assert(new URL(selectedURL).searchParams.has('city'),scene.id+' records selected city');
   if(scene.selectControl)assert.equal(await page.locator(scene.selectControl).inputValue(),selected);
   await page.reload({waitUntil:'networkidle'});if(scene.ready)await page.locator(scene.ready).waitFor();await settle();assert.equal(page.url(),selectedURL);sameCamera(await camera(scene),before,0.001);
   if(scene.selectControl)assert.equal(await page.locator(scene.selectControl).inputValue(),selected);
   if(['east-asia','south-asia','central-asia','mexico','japan'].includes(scene.id))await shot(scene.id+'-selected-reloaded');
   await page.goBack({waitUntil:'networkidle'});await settle();assert.equal(new URL(page.url()).searchParams.get('city'),initialCity,scene.id+' restores preceding selection');
   report.operations.push({region:scene.id,selection:selected,reload:true,back:true,cameraPreserved:Boolean(scene.svg||scene.cameraRoot||scene.urlCamera)});
  }else{await page.reload({waitUntil:'networkidle'});if(scene.ready)await page.locator(scene.ready).waitFor();assert(await page.locator(scene.map).first().isVisible());}
  report.scenes.push({region:scene.id,url:base+'/atlas/'+scene.path,map:box,metrics});
 }
 // Preserve the existing Asia context-review assertions without duplicating its
 // screenshots: selecting a crop keeps all other sourced livestock points.
 for(const region of ['east-asia','south-asia','central-asia','southeast-asia']){
  await page.goto(base+'/atlas/asia/'+region+'/agriculture/',{waitUntil:'networkidle'});
  await page.locator('[data-asia-atlas][data-farm-context-status="ready"]').waitFor();await settle();
  const product=await page.locator('[data-asia-config]').evaluate(node=>JSON.parse(node.textContent).presentation.farming.products.find(p=>p.kind==='crop'&&p.id!=='rice').id);
  const points=page.locator('.asia-livestock-point:visible');
  const anchors=()=>points.evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('aria-label'),x:parseFloat(node.style.left),y:parseFloat(node.style.top),opacity:parseFloat(getComputedStyle(node).opacity)})));
  await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  const beforeSnapshot=await stableFarmSnapshot(''),before=beforeSnapshot.points;assert(before.length>0,region+' sourced livestock is visible');
  const beforeCamera=beforeSnapshot.camera;
  const trigger=page.locator(`[data-farm-choice="${product}"]`).first(),triggerBox=await trigger.boundingBox();await trigger.click();
  await page.locator(`[data-asia-atlas][data-farm-context-status="ready"][data-farm-selected="${product}"]`).waitFor();await settle();
  const afterClick=await stableFarmSnapshot(product),selectedURL=page.url();sameCamera(afterClick.camera,beforeCamera);
  await page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  const afterSnapshot=await stableFarmSnapshot(product),selected=afterSnapshot.points;
  assert.equal(page.url(),selectedURL,'Measurement scroll preserves the selected URL');sameCamera(afterSnapshot.camera,afterClick.camera);
  assert.deepEqual(afterSnapshot.frame,beforeSnapshot.frame,'Compare anchors in the same naturally settled viewport frame');
  report.operations.push({region,kind:'farm-layout-diagnostic',triggerBox,before:beforeSnapshot,afterClick,after:afterSnapshot,measurementScrollPreservesUrlAndCamera:true});
  assert.equal(selected.length,before.length,region+' retains other livestock points');
  for(let i=0;i<before.length;i++){assert.equal(selected[i].name,before[i].name);assert.equal(selected[i].opacity,.2);for(const axis of ['x','y'])assert(Math.abs(selected[i][axis]-before[i][axis])<=1,region+' retains source anchors within 1 CSS pixel');}
  sameCamera(await camera({cameraRoot:'[data-asia-atlas]'}),beforeCamera);assert.equal(await page.locator('[data-farming-legend]').isVisible(),false);
  await page.reload({waitUntil:'networkidle'});await page.locator(`[data-asia-atlas][data-farm-context-status="ready"][data-farm-selected="${product}"]`).waitFor();await settle();
  assert.equal((await anchors()).length,before.length);sameCamera(await camera({cameraRoot:'[data-asia-atlas]'}),beforeCamera,.001);
  await page.locator('[data-farm-choice="overview"]').first().click();await page.locator('[data-asia-atlas][data-farm-context-status="ready"][data-farm-selected=""]').waitFor();await settle();
  assert.equal((await anchors()).length,before.length);report.operations.push({region,crop:product,livestockPoints:before.length,otherDistributionsRetained:true,sourceAnchorsRetained:true,reload:true,clear:true,cameraPreserved:true});
 }
 // The two agriculture-key changes must survive their shared-component merge.
 await page.goto(base+'/atlas/north-america/agriculture/',{waitUntil:'networkidle'});await page.locator('[data-atlas-explorer][data-render-state="ready"]').waitFor();assert.match(await page.locator('.atlas-quantity-note').textContent(),/生産量を表しません/);
 await page.locator('[data-forestry-select]').first().click();await page.locator('[data-atlas-explorer][data-forest-active="true"]').waitFor();await shot('us-forestry-navigation');
 await page.goto(base+'/atlas/north-america/mexico/agriculture/',{waitUntil:'networkidle'});await page.locator('[data-mexico-agriculture-atlas][data-agriculture-ready="true"]').waitFor();
 const forestLink=page.locator('.mexico-agriculture-subtopics [data-forestry-select]');
 assert(await forestLink.isVisible(),'Mexico forestry remains in the large-category navigation');await forestLink.click();
 await page.locator('[data-mexico-agriculture-atlas][data-agri-reading="forestry"][data-agriculture-current-item="pine"]').waitFor();await settle();
 assert.equal(new URL(page.url()).searchParams.get('agriItem'),'pine');assert(await page.locator('[data-mexico-tree-cover]').isVisible());await shot('mexico-forestry-navigation');
 report.operations.push({region:'us,mexico',forestryNavigation:true});
 // Check the final US solver output against painted boxes, including reduced-motion CSS.
 await page.goto(base+'/atlas/north-america/population/?popView=religion',{waitUntil:'networkidle'});await page.locator('[data-atlas-explorer][data-render-state="ready"]').waitFor();await page.waitForFunction(()=>/郡のデータ/.test(document.querySelector('[data-pop-status]')?.textContent??''));await settle();
 const religionPaint=await waitForUsReligionPaint(page);
 const rectangles=await page.evaluate(()=>{
  const box=n=>{const b=n.getBoundingClientRect();return{id:n.getAttribute('data-pop-city')??n.getAttribute('data-pop-religion-marker'),left:b.left,top:b.top,right:b.right,bottom:b.bottom,transition:getComputedStyle(n).transitionProperty};};
  const ny=box(document.querySelector('[data-pop-city-markers] [data-pop-city="new-york"]')),stories=[...document.querySelectorAll('[data-pop-religion-markers] .atlas-nature-label:not([hidden])')].map(box);
  const frame=document.querySelector('[data-map-frame]'),f=frame.getBoundingClientRect();return{ny,stories,layout:JSON.parse(document.querySelector('[data-pop-religion-markers]').dataset.layoutDiagnostics),origin:{x:f.left+frame.clientLeft,y:f.top+frame.clientTop}};
 });
 assert.equal(rectangles.layout.coordinateSpace,'map-frame-content-box');
 for(const painted of [rectangles.ny,...rectangles.stories]){
  assert.equal(painted.transition,'none');const solved=painted.id==='new-york'?rectangles.layout.obstacles.find(b=>b.id===painted.id):rectangles.layout.placed.find(b=>b.id===painted.id);assert(solved);
  for(const [edge,axis] of [['left','x'],['right','x'],['top','y'],['bottom','y']])assert(Math.abs(solved[edge]+rectangles.origin[axis]-painted[edge])<1e-6,painted.id+' painted '+edge+' matches solver');
 }
 for(const b of rectangles.stories){const a=rectangles.ny;assert(!(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top),'NY/religion collision');}
 report.operations.push({region:'us',solverMatchesPaint:true,newYorkReligionNoCollision:true,countyColorsPainted:religionPaint,rectangles});await shot('us-religion-boxes');
 // A real county hit also proves that population-fill has rendered features.
 const religionFrame=await page.locator('[data-map-frame]').boundingBox();
 await page.mouse.click(religionFrame.x+religionFrame.width*.5,religionFrame.y+religionFrame.height*.5);
 await page.waitForFunction(()=>!!new URL(location.href).searchParams.get('popReligion'));
 const selectedReligion=new URL(page.url()).searchParams.get('popReligion');
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>/郡のデータ/.test(document.querySelector('[data-pop-status]')?.textContent??''));
 const reloadedReligionPaint=await waitForUsReligionPaint(page);
 assert.equal(new URL(page.url()).searchParams.get('popReligion'),selectedReligion);
 await page.goBack({waitUntil:'networkidle'});await settle();assert.equal(new URL(page.url()).searchParams.get('popReligion'),null);
 report.operations.push({region:'us',renderedCountyClick:true,selectedReligion,reload:true,back:true,countyColorsPainted:reloadedReligionPaint});
 for(const asset of ['water-v1/precipitation-fallback.webp','latin-nature-reading-v2/geography.json','europe/precipitation-v1/manifest.json','africa-natural-presentation-v2/manifest.json','japan-agriculture-v3/forest.png','asia-presentation-v1/manifest.json','russia-physical-v1/manifest.json','oceania-physical-v1/manifest.json','population/v1/religion-counties-2020.geo.json.gz','population/v1/religion-dominant.json.gz'])await checkAsset('assets/atlas/'+asset);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.externalRequests,[]);report.status='passed';
}catch(error){report.status='failed';report.failure=String(error.stack);if(page&&!page.isClosed())await shot('failure').catch(()=>{});throw error;}
finally{
 report.finishedAt=new Date().toISOString();await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 await browser?.close();if(server)await new Promise(r=>server.close(r));
 console.log('INTEGRATED_MAP_REPORT '+JSON.stringify(report));
 if(process.env.INTEGRATION_REVIEW_LOG_IMAGES==='1')for(const item of [...report.images].reverse()){
  const encoded=(await readFile(resolve(out,item.file))).toString('base64'),parts=Math.ceil(encoded.length/8192);
  console.log('INTEGRATED_MAP_IMAGE '+JSON.stringify({...item,parts}));
  for(let index=0;index<parts;index++)console.log('INTEGRATED_MAP_IMAGE_PART '+JSON.stringify({file:item.file,index,parts,data:encoded.slice(index*8192,(index+1)*8192)}));
 }
 console.log(JSON.stringify({status:report.status,head:report.head,target:report.target,scenes:report.scenes.length,operations:report.operations.length,images:report.images.length,assets:report.assets.length}));
}
