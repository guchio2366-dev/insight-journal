#!/usr/bin/env node
/** Capture the built US/Asia PC atlas and its operations using only local assets. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {constants} from 'node:fs';
import {access,mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,inflateSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {verifyAsiaIndustryCountry} from './verify-asia-industry-country.mjs';

const run=promisify(execFile);
const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','asia-pc');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const profiles=[{name:'desktop',viewport:{width:1440,height:1000}},{name:'laptop',viewport:{width:1024,height:768}}];
const scenes=[
 {id:'manufacturing-overview',us:'/atlas/north-america/industry/?sector=manufacturing&subsector=all',asia:'/atlas/asia/east-asia/industry/?topic=manufacturing',subsector:'all',topic:'manufacturing',alignTop:true},
 {id:'manufacturing-individual',us:'/atlas/north-america/industry/?sector=manufacturing&subsector=auto',asia:'/atlas/asia/east-asia/industry/?topic=jp-31',subsector:'auto',topic:'jp-31',alignTop:true},
 {id:'climate',us:'/atlas/north-america/nature/',asia:'/atlas/asia/east-asia/nature/',alignTop:true},
 {id:'population',us:'/atlas/north-america/population/',asia:'/atlas/asia/east-asia/population/',alignTop:true,comparisonScope:'layout-only; the US reference does not show a population distribution fill, so distribution rendering equivalence is not assessed'},
];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.gz':'application/gzip'};
const metadata={schemaVersion:1,status:'running',startedAt:new Date().toISOString(),checkedOutSHA:null,headSHA:process.env.REVIEW_HEAD_SHA||null,baseSHA:process.env.REVIEW_BASE_SHA||null,beforeSHA:process.env.REVIEW_BEFORE_SHA||null,githubSHA:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,runAttempt:process.env.GITHUB_RUN_ATTEMPT||null,repository:process.env.GITHUB_REPOSITORY||null,basePath,profiles,output:'review-artifacts/asia-pc',expectedImageCount:74,expectedComparisonCount:8,fonts:{setup:process.env.REVIEW_JAPANESE_FONT_SETUP||'preinstalled',families:process.env.REVIEW_JAPANESE_FONTS||null,match:process.env.REVIEW_JAPANESE_FONT_MATCH||null},browser:null,scope:'Local production build only; public deployment is not accessed.',notes:['US automobiles and Japanese transport equipment retain their respective statistical definitions.','Industry map dimensions use the compact US population frame; other dimensions and all corresponding field tops agree within 1 CSS pixel.','Population is a layout-only comparison: the US reference does not show a population distribution fill; no distribution rendering equivalence is asserted.','Each PNG shows the viewport once; no duplicate map-crop artifacts are generated.']};
const results={captures:[],comparisons:[],operations:[],externalCommunicationAttempts:[],blockedWebSockets:[]};
const failure=error=>error?.stack??String(error);
async function persist(){
 await writeFile(path.join(output,'metadata.json'),JSON.stringify({...metadata,captureCount:results.captures.length,operationCount:results.operations.length,externalCommunicationAttempts:results.externalCommunicationAttempts},null,2)+'\n');
 await writeFile(path.join(output,'results.json'),JSON.stringify({...metadata,...results},null,2)+'\n');
}

async function serveBuild(){
 const root=await realpath(path.join(repo,'dist'));
 for(const scene of scenes)for(const region of ['us','asia'])await access(path.join(root,scene[region].split('?')[0],'index.html'));
 const server=createServer(async(req,res)=>{
  try{
   assert(req.method==='GET'||req.method==='HEAD');
   let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   assert(!basePath||pathname.startsWith(basePath+'/'));pathname=pathname.slice(basePath.length);
   let file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+path.sep));
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   file=await realpath(file);assert(file.startsWith(root+path.sep));assert((await stat(file)).isFile());
   const body=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Missing built asset');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}

function requestDescription(raw){
 try{const url=new URL(raw);return {url:url.origin+url.pathname,queryParameterNames:[...url.searchParams.keys()]};}catch{return {url:String(raw)};}
}
async function isolatedPage(browser,host,profile,record){
 const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:1,isMobile:false,hasTouch:false,serviceWorkers:'block'});
 const control={failIndustry:false,industryRequests:0,failContourBands:false},expectedFailures=new WeakSet();
 record.errors=[];record.failedRequests=[];record.externalCommunicationAttempts=[];
 // Install before creating a page. Cross-origin HTTP requests never continue.
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!==host.origin){
   const item={case:record.id,at:new Date().toISOString(),method:request.method(),resourceType:request.resourceType(),...requestDescription(request.url()),action:'blocked-before-network'};
   record.externalCommunicationAttempts.push(item);results.externalCommunicationAttempts.push(item);
   await route.abort('blockedbyclient');return;
  }
  if(url.pathname.endsWith('/assets/atlas/asia-industry-v1/east-asia.json.gz')){
   control.industryRequests++;
   if(control.failIndustry){expectedFailures.add(request);await route.fulfill({status:503,body:'Expected local retry regression failure'});return;}
  }
  if(control.failContourBands&&url.pathname.endsWith('/east-asia.rainfall-bands.json.gz')){expectedFailures.add(request);await route.fulfill({status:503,body:'Expected local contour-band retry failure'});return;}
  await route.continue();
 });
 // No application WebSocket is needed; intercept before connectToServer().
 await context.routeWebSocket('**/*',socket=>{
  const item={case:record.id,at:new Date().toISOString(),...requestDescription(socket.url()),action:'blocked-before-network'};
  results.blockedWebSockets.push(item);
  if(new URL(socket.url()).origin!==host.origin){results.externalCommunicationAttempts.push(item);record.externalCommunicationAttempts.push(item);}
  socket.close({code:1008,reason:'Only local static review assets are allowed'});
 });
 const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
 page.on('pageerror',error=>record.errors.push(error.message));
 page.on('response',response=>{if(response.status()>=400&&!expectedFailures.has(response.request()))record.failedRequests.push({status:response.status(),...requestDescription(response.url())});});
 page.on('requestfailed',request=>{if(!request.failure()?.errorText.includes('ERR_ABORTED'))record.failedRequests.push({...requestDescription(request.url()),error:request.failure()?.errorText??'Request failed'});});
 return {page,context,control};
}
function assertClean(record){
 assert.deepEqual(record.externalCommunicationAttempts,[],'No external communication attempts');
 assert.deepEqual(record.errors,[],'No browser runtime errors');
 assert.deepEqual(record.failedRequests,[],'No unexpected failed local assets');
}
async function settle(page){
 await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 await page.waitForLoadState('networkidle');
}
async function open(page,host,route,region='asia',scene){
 await page.goto(host.origin+basePath+route,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(region=>{
  const root=document.querySelector(region==='asia'?'[data-asia-atlas]':'[data-atlas-explorer]');
  return region==='asia'?root?.dataset.mapReady==='true'&&root.querySelector('[data-map-fallback]')?.hidden:root?.dataset.renderState==='ready'&&root.querySelector('[data-fallback]')?.hidden;
 },region,{timeout:30000});
 if(region==='asia'&&scene?.topic)await page.waitForFunction(topic=>document.querySelector('[data-industry-topic]')?.value===topic&&document.querySelector('[data-industry-status]')?.textContent==='',scene.topic);
 if(region==='us'&&scene?.subsector)await page.waitForFunction(subsector=>{const root=document.querySelector('[data-atlas-explorer]');return root?.dataset.industrySector==='manufacturing'&&root.dataset.industrySubsector===subsector;},scene.subsector);
 await settle(page);
}

// Decode the viewport PNG and inspect only its visible map pixels. This avoids
// producing a second screenshot artifact or accepting a merely present canvas.
function mapPixels(png,box){
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let width,height,channels;const chunks=[];
 for(let offset=8;offset<png.length;){
  const length=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+length);
  if(kind==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert([2,6].includes(data[9]));assert.equal(data[12],0);channels=data[9]===6?4:3;}
  if(kind==='IDAT')chunks.push(data);offset+=length+12;
 }
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(height*stride);
 assert.equal(raw.length,(stride+1)*height);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert(filter<=4);for(let x=0;x<stride;x++){const offset=y*stride+x,left=x>=channels?pixels[offset-channels]:0,up=y?pixels[offset-stride]:0,upperLeft=y&&x>=channels?pixels[offset-stride-channels]:0;pixels[offset]=(raw[y*(stride+1)+1+x]+[0,left,up,Math.floor((left+up)/2),paeth(left,up,upperLeft)][filter])&255;}}
 const colors=new Map();let samples=0,backgroundPoint=null;
 for(let y=Math.max(0,Math.ceil(box.y+4));y<Math.min(height,Math.floor(box.y+box.height-4));y+=3)for(let x=Math.max(0,Math.ceil(box.x+4));x<Math.min(width,Math.floor(box.x+box.width-4));x+=3){const i=(y*width+x)*channels;if(channels===4&&pixels[i+3]<128)continue;const key=`${pixels[i]>>4},${pixels[i+1]>>4},${pixels[i+2]>>4}`;colors.set(key,(colors.get(key)??0)+1);samples++;if(!backgroundPoint&&x>box.x+24&&x<box.x+box.width-24&&y>box.y+24&&y<box.y+box.height-24&&['230,238,240','215,218,213','225,228,219'].includes(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`))backgroundPoint={x,y};}
 const evidence={viewportWidth:width,viewportHeight:height,sampledMapPixels:samples,colorBuckets:colors.size,dominantColorRatio:samples?Math.max(...colors.values())/samples:1};
 assert(samples>1000,`The visible map has too few pixels to review: ${JSON.stringify({box,...evidence})}`);
 assert(colors.size>=16&&evidence.dominantColorRatio<.98,`The map is blank or nearly uniform: ${JSON.stringify(evidence)}`);return {...evidence,backgroundPoint,colorBucketKeys:[...colors.keys()]};
}
async function geometry(page){
 return page.evaluate(()=>{
  const rect=selector=>{const node=[...document.querySelectorAll(selector)].find(node=>{const r=node.getBoundingClientRect();return r.width>0&&r.height>0;});if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,documentY:r.y+scrollY};};
  const asia=Boolean(document.querySelector('[data-asia-atlas]')),guide=document.querySelector(asia?'.asia-industry-guide':'.industry-guide'),scope=document.querySelector('[data-population-scope]');
  return {url:location.href,path:location.pathname+location.search,map:rect('[data-map-surface]'),overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth,rendering:asia?{mode:'MapLibre',mapReady:document.querySelector('[data-asia-atlas]').dataset.mapReady,fallbackHidden:document.querySelector('[data-map-fallback]').hidden}:{mode:'MapLibre',renderState:document.querySelector('[data-atlas-explorer]').dataset.renderState,fallbackHidden:document.querySelector('[data-fallback]').hidden},header:{fieldTabs:rect('.atlas-tabs'),regions:rect('.regional-tabs'),country:rect(asia?'[data-country-select]':'.regional-countries'),reset:rect('[data-reset]'),guide:rect(asia?'.asia-industry-guide':'.industry-guide'),guideText:guide?.textContent.replace(/\s+/g,' ').trim()??null,guideFontSize:guide?getComputedStyle(guide).fontSize:null,guideLineHeight:guide?getComputedStyle(guide).lineHeight:null,guideClipped:guide?guide.scrollWidth>guide.clientWidth+1||guide.scrollHeight>guide.clientHeight+1:null},populationScope:scope?{box:rect('[data-population-scope]'),text:scope.innerText,fontSize:getComputedStyle(scope).fontSize,clipped:scope.scrollWidth>scope.clientWidth+1||scope.scrollHeight>scope.clientHeight+1}:null,fonts:{status:document.fonts.status,bodyFamily:getComputedStyle(document.body).fontFamily}};
 });
}
async function capture(browser,host,profile,scene,region){
 const record={id:`${profile.name}-${region}-${scene.id}`,profile:profile.name,viewport:profile.viewport,region,scene:scene.id,path:basePath+scene[region],passed:false};
 const {page,context}=await isolatedPage(browser,host,profile,record);
 try{
  await open(page,host,scene[region],region,scene);
  Object.assign(record,await geometry(page));assert(record.map,'A visible map surface is required');assert(record.header.fieldTabs,'Main field tabs must remain visible');assert.equal(record.overflow,false,'No horizontal overflow');
  if(region==='asia'&&scene.topic){assert(record.header.guide?.height>0,'The manufacturing guide must remain visible');assert(parseFloat(record.header.guideFontSize)>=13&&parseFloat(record.header.guideLineHeight)>=19.5,'Map alignment must not shrink the guide below 13px type and 19.5px line height');assert.equal(record.header.guideClipped,false,'The guide must show its complete classification and statistical topic');}
  if(region==='asia'&&scene.id==='population'){
   assert(record.populationScope?.box,'The population scope must remain visible');
   for(const meaning of [/2020/,/推計/,/格子/,/面積/])assert.match(record.populationScope.text,meaning);
   assert(parseFloat(record.populationScope.fontSize)>=13,'Population scope must use at least 13px type');assert.equal(record.populationScope.clipped,false,'The population scope must be readable in full');
  }
  const png=await page.screenshot({fullPage:false,animations:'disabled'});
  record.screenshot=record.id+'.png';await writeFile(path.join(output,record.screenshot),png);
  record.screenshotSHA256=createHash('sha256').update(png).digest('hex');record.mapPixels=mapPixels(png,record.map);
  assertClean(record);record.passed=true;
 }catch(error){
  record.failure=failure(error);
  if(!record.screenshot){try{record.screenshot=record.id+'.png';await page.screenshot({path:path.join(output,record.screenshot),fullPage:false,animations:'disabled'});}catch(captureError){record.screenshot=null;record.screenshotFailure=failure(captureError);}}
 }finally{record.completedAt=new Date().toISOString();await context.close();results.captures.push(record);await persist();}
 console.log(`${record.passed?'PASS':'FAIL'} capture ${record.id}${record.failure?': '+record.failure.split('\n')[0]:''}`);
}
function compare(){
 for(const profile of profiles)for(const scene of scenes){
  const us=results.captures.find(row=>row.profile===profile.name&&row.scene===scene.id&&row.region==='us'),asia=results.captures.find(row=>row.profile===profile.name&&row.scene===scene.id&&row.region==='asia');
  const sizeReference=scene.id.startsWith('manufacturing')?results.captures.find(row=>row.profile===profile.name&&row.scene==='population'&&row.region==='us'):us;
  const difference=sizeReference?.map&&us?.map&&asia?.map?{width:asia.map.width-sizeReference.map.width,height:asia.map.height-sizeReference.map.height,mapTop:asia.map.documentY-us.map.documentY,fieldTabsTop:asia.header.fieldTabs&&us.header.fieldTabs?asia.header.fieldTabs.documentY-us.header.fieldTabs.documentY:null}:null;
  const passed=Boolean(us?.passed&&asia?.passed&&difference&&Math.abs(difference.width)<=1&&Math.abs(difference.height)<=1&&Math.abs(difference.mapTop)<=1&&difference.fieldTabsTop!==null&&Math.abs(difference.fieldTabsTop)<=1);
  results.comparisons.push({profile:profile.name,viewport:profile.viewport,scene:scene.id,usPath:us?.path,asiaPath:asia?.path,usMap:us?.map,sizeReferenceScene:sizeReference?.scene,sizeReferenceMap:sizeReference?.map,asiaMap:asia?.map,difference,mapTopAlignmentRequired:true,fieldTabsAlignmentRequired:true,comparisonScope:scene.comparisonScope??'layout and nonblank map; industry size uses the compact US population frame, while header alignment uses the corresponding industry page',toleranceCssPixels:1,passed,...(!passed?{failure:'Both captures must pass; map width and height must match the stated compact reference, and map and main field-tab tops must match the corresponding field within 1 CSS px.'}:{})});
 }
}

async function contextPicture(page,profile,id,region){
 const record={id:`${profile.name}-${id}`,profile:profile.name,viewport:profile.viewport,region,scene:id,passed:false};
 Object.assign(record,await page.evaluate(()=>{const node=document.querySelector('[data-west-map],[data-map-surface]'),r=node.getBoundingClientRect();return {path:location.pathname+location.search,map:{x:r.x,y:r.y,width:r.width,height:r.height,documentY:r.y+scrollY},overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth};}));
 assert.equal(record.overflow,false,'Changed screens must not overflow horizontally');
 const png=await page.screenshot({fullPage:false,animations:'disabled'});
 record.screenshot=record.id+'.png';await writeFile(path.join(output,record.screenshot),png);
 record.screenshotSHA256=createHash('sha256').update(png).digest('hex');record.mapPixels=mapPixels(png,record.map);record.passed=true;
 results.captures.push(record);await persist();
}
async function checkContextOperations(browser,host,profile){
 for(const region of ['east-asia','southeast-asia','south-central-asia','south-asia','central-asia'])await operation(browser,host,profile,`${region}-farm-context`,async page=>{
  await open(page,host,`/atlas/asia/${region}/agriculture/`);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.farmContextStatus==='ready');
  assert.equal(await page.locator('[data-country-select]').inputValue(),'');
  const product=await page.locator('[data-asia-config]').evaluate(node=>JSON.parse(node.textContent).presentation.farming.products.find(p=>p.kind==='crop'&&p.id!=='rice').id);
  const livestock=page.locator('.asia-livestock-point:visible'),before=await livestock.count();
  // Initial fitted views omit camera URL parameters. Compare projected map
  // anchors so serializing the unchanged camera is not mistaken for a move.
  const anchors=()=>livestock.evaluateAll(nodes=>nodes.map(node=>({name:node.getAttribute('aria-label'),x:parseFloat(node.style.left),y:parseFloat(node.style.top)})));
  const cameraAnchors=await anchors();assert(before>0,'Regional extent needs visible map anchors');
  await contextPicture(page,profile,`${region}-farm-overview`,'asia');
  await page.locator(`[data-farm-choice="${product}"]`).click();
  await page.waitForFunction(id=>{const root=document.querySelector('[data-asia-atlas]');return root.dataset.farmContextStatus==='ready'&&root.dataset.farmSelected===id;},product);
  await settle(page);
  assert.equal(await livestock.count(),before,'Livestock points stay in the map');
  for(const opacity of await livestock.evaluateAll(nodes=>nodes.map(node=>parseFloat(getComputedStyle(node).opacity))))assert.equal(opacity,.2);
  assert.equal(await page.locator('[data-farming-legend]').isVisible(),false,'Context map must not display the quantitative raster key');
  const selectedAnchors=await anchors();for(let i=0;i<before;i++){assert.equal(selectedAnchors[i].name,cameraAnchors[i].name);for(const axis of ['x','y'])assert(Math.abs(selectedAnchors[i][axis]-cameraAnchors[i][axis])<=1,'Crop choice must retain projected regional map anchors within 1 CSS pixel');}
  for(const key of ['lng','lat','z']){const value=new URL(page.url()).searchParams.get(key);assert(value!==null&&Number.isFinite(Number(value)),'Crop choice must serialize its current camera');}
  await contextPicture(page,profile,`${region}-farm-selected`,'asia');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(id=>document.querySelector('[data-asia-atlas]')?.dataset.farmSelected===id,product);
  await page.locator('[data-farm-choice="overview"]').click();
  await page.waitForFunction(()=>{const root=document.querySelector('[data-asia-atlas]');return root.dataset.farmContextStatus==='ready'&&root.dataset.farmSelected==='';});
  return {crop:product,livestockPointCount:before,otherDistributionsRetained:true,selectedUrlReloadAndClear:true};
 });
 await operation(browser,host,profile,'west-asia-farm-context',async page=>{
  await page.goto(host.origin+basePath+'/atlas/west-asia/agriculture/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true');await settle(page);
  assert.equal(await page.locator('[data-west-country]').inputValue(),'');
  const contexts=page.locator('[data-west-farm-context]');assert.equal(await contexts.count(),5);
  assert.equal(new URL(page.url()).searchParams.get('topic'),'farming-overview');
  assert.equal(await page.locator('.west-country-line title').count(),0);
  const frame=await page.locator('[data-west-map]').getAttribute('viewBox');
  await contextPicture(page,profile,'west-asia-farm-overview','west-asia');
  await page.locator('.west-agri-picker [data-west-topic-button="wheat"]').click();await page.waitForSelector('[data-west-farm-selected="wheat"]');await settle(page);
  assert.equal(await contexts.count(),5);
  for(const id of ['sheep','goat','cattle'])assert.equal(await page.locator(`[data-west-farm-context="${id}"]`).getAttribute('opacity'),'.2');
  assert.equal(await page.locator('[data-west-map]').getAttribute('viewBox'),frame);
  await contextPicture(page,profile,'west-asia-farm-selected','west-asia');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-west-farm-selected="wheat"]');
  await page.locator('[data-west-topic-button="farming-overview"]').click();await page.waitForFunction(()=>!document.querySelector('[data-west-farm-selected]')&&document.querySelector('[data-west-atlas]').dataset.topic==='farming-overview');
  return {allFiveSourceProducts:true,cropOutline:true,livestockFaded:true,regionalExtentRetained:true,urlReloadAndClear:true};
 });
 for(const region of ['east-asia','west-asia'])await operation(browser,host,profile,`${region}-city-chart-right`,async page=>{
  const west=region==='west-asia';
  if(west){await page.goto(host.origin+basePath+'/atlas/west-asia/nature/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true');await page.locator('[data-west-city-label] > summary').click();await page.locator('[data-west-city]').selectOption('riyadh');}
  else{await open(page,host,'/atlas/asia/east-asia/nature/');await page.locator('[data-city-select]').selectOption('tokyo');}
  const chart=west?'[data-west-detail] [data-west-active-chart] svg':'[data-city-panel="tokyo"] [data-city-statistics] svg';
  await page.waitForSelector(chart);await settle(page);
  const layout=await page.evaluate(({west,chart})=>{const plot=document.querySelector(chart).getBoundingClientRect(),map=document.querySelector(west?'[data-west-map]':'[data-map-surface]').getBoundingClientRect(),reading=document.querySelector(west?'[data-west-detail] .atlas-city-reading':'[data-city-panel="tokyo"] .city-climate-reading').getBoundingClientRect();return {plot:{x:plot.x,y:plot.y,width:plot.width,height:plot.height},mapRight:map.right,readingTop:reading.top,plotBottom:plot.bottom};},{west,chart});
  assert(layout.plot.x>=layout.mapRight,'Selected city chart is on the right');assert(layout.readingTop>=layout.plotBottom,'Climate explanation follows its chart');
  assert.equal(await page.locator(west?'.west-subtabs [data-west-topic-button="precipitation"]':'[data-water-topics] [data-water-view="seasonal-precipitation"]').count(),0);
  await contextPicture(page,profile,`${region}-city-chart-right`,west?'west-asia':'asia');
  let scrolledLayout=null;
  if(west){
   const pane=page.locator('.west-reading');
   const delta=await page.locator(chart).evaluate(node=>node.getBoundingClientRect().top-node.closest('.west-reading').getBoundingClientRect().top-40);
   await pane.hover();await page.mouse.wheel(0,delta);await settle(page);
   scrolledLayout=await page.evaluate(chart=>{const plot=document.querySelector(chart).getBoundingClientRect(),pane=document.querySelector('.west-reading'),reading=pane.querySelector('.atlas-city-reading').getBoundingClientRect(),p=pane.getBoundingClientRect(),map=document.querySelector('[data-west-map]').getBoundingClientRect();return {plot:{left:plot.left,top:plot.top,right:plot.right,bottom:plot.bottom},pane:{left:p.left,top:p.top,right:p.right,bottom:p.bottom,scrollTop:pane.scrollTop},readingTop:reading.top,mapRight:map.right,viewportHeight:innerHeight};},chart);
   assert(scrolledLayout.pane.scrollTop>0,'Wheel scroll must reach the chart within the right reading pane');
   assert(scrolledLayout.plot.left>=scrolledLayout.mapRight&&scrolledLayout.plot.right<=scrolledLayout.pane.right,'Scrolled chart stays inside the right column');
   assert(scrolledLayout.plot.top>=scrolledLayout.pane.top&&scrolledLayout.plot.bottom<=Math.min(scrolledLayout.pane.bottom,scrolledLayout.viewportHeight),'The complete chart is visible after scrolling the reading pane');
   assert(scrolledLayout.readingTop>=scrolledLayout.plot.bottom&&scrolledLayout.readingTop<scrolledLayout.pane.bottom,'The climate reading follows the visible chart in the same pane');
   await contextPicture(page,profile,`${region}-city-chart-right-scrolled`,'west-asia');
  }
  return {city:west?'riyadh':'tokyo',chartRight:true,climateReadingBelowChart:true,waterMonthlyTabAbsent:true,layout,scrolledLayout};
 });
 await operation(browser,host,profile,'us-farming-reference',async page=>{await open(page,host,'/atlas/north-america/agriculture/','us');await contextPicture(page,profile,'us-farming-reference','us');return {referenceOnly:true};});
}

// The same DOM/URL contracts as tests/e2e/atlas-asia-industry-status.test.mjs,
// executed here under the capture's network guard instead of a child browser.
const table=(page,caption)=>page.locator('[data-industry-content] table').filter({has:page.locator('caption').filter({hasText:caption})});
const row=(page,owner,name)=>owner.locator('tbody tr').filter({has:page.getByRole('rowheader',{name,exact:true})});
async function expand(details){if(!await details.evaluate(node=>node.open))await details.locator(':scope > summary').click();}
async function industryReady(page){await page.waitForFunction(()=>document.querySelector('[data-industry-detail]')?.options.length>1&&document.querySelector('[data-industry-status]')?.textContent==='');}
async function selected(page,name,label){
 await page.waitForFunction(({name,label})=>{const text=document.querySelector('[data-industry-value]')?.textContent??'';return text.includes(name)&&text.includes(label);},{name,label});
 const text=await page.locator('[data-industry-value]').textContent();assert.equal(await page.locator('[data-grid-reading]').textContent(),text);
 assert.ok((await page.locator('[data-industry-detail]').evaluate(select=>select.selectedOptions[0].textContent)).includes(label));
 if(['秘匿','該当なし'].includes(label)){assert.doesNotMatch(text,/未掲載/);assert.doesNotMatch(await page.locator('[data-industry-lead]').textContent(),/\d+番目/);}
 return text;
}
async function operation(browser,host,profile,name,action){
 const record={id:`${profile.name}-${name}`,profile:profile.name,viewport:profile.viewport,name,passed:false};
 const {page,context,control}=await isolatedPage(browser,host,profile,record);
 try{record.checks=await action(page,control);await settle(page);assertClean(record);record.passed=true;}catch(error){record.failure=failure(error);}
 finally{record.path=new URL(page.url()).pathname+new URL(page.url()).search;record.completedAt=new Date().toISOString();await context.close();results.operations.push(record);await persist();}
 console.log(`${record.passed?'PASS':'FAIL'} operation ${record.id}${record.failure?': '+record.failure.split('\n')[0]:''}`);
}
async function checkOperations(browser,host,profile,source){
 await operation(browser,host,profile,'country-reset-focus',async page=>{
  await open(page,host,'/atlas/asia/east-asia/industry/?topic=manufacturing');
  await page.locator('[data-country-select]').selectOption('JPN');assert.equal(new URL(page.url()).searchParams.get('place'),'JPN');
  await page.locator('[data-reset]').click();assert.equal(await page.locator('[data-country-select]').inputValue(),'');assert.equal(new URL(page.url()).searchParams.get('place'),null);
  await open(page,host,'/atlas/asia/south-central-asia/industry/?topic=manufacturing');
  for(const [focus,country] of [['south-asia','IND'],['central-asia','KAZ']]){
   assert.deepEqual(await page.locator('[data-focus-link]').evaluateAll(links=>links.map(link=>link.dataset.focusLink)),['south-central-asia','south-asia','central-asia']);
   await page.locator(`[data-focus-link="${focus}"]`).focus();await page.keyboard.press('Enter');await page.waitForURL(`**/atlas/asia/${focus}/industry/**`);
   await page.locator('[data-country-select]').selectOption(country);assert.equal(new URL(page.url()).searchParams.get('place'),country);
   await page.locator('[data-reset]').click();assert.equal(new URL(page.url()).pathname,`${basePath}/atlas/asia/${focus}/industry/`);assert.equal(await page.locator('[data-country-select]').inputValue(),'');assert.equal(await page.locator(`[data-focus-link="${focus}"]`).getAttribute('aria-current'),'page');
  }
  return {countrySelection:true,reset:true,keyboardFocusLinks:['south-asia','central-asia'],focusRetained:true};
 });
 await operation(browser,host,profile,'japan-publication-status-url',async page=>{
  await open(page,host,'/atlas/asia/east-asia/industry/?topic=jp-20&place=JPN&detail=JP-23');await industryReady(page);await expand(page.locator('[data-reading-details]'));
  const observations=[];
  for(const [id,name,label] of [['JP-23','愛知県','22,155'],['JP-43','熊本県','秘匿'],['JP-42','長崎県','該当なし']]){
   await page.locator('[data-industry-detail]').selectOption(id);observations.push(await selected(page,name,label));assert.equal(new URL(page.url()).searchParams.get('detail'),id);
   await expand(page.locator('[data-industry-content] details').filter({has:page.locator('caption').filter({hasText:/^公表値の推移/})}));
   const sectors=table(page,/^24業種/);assert.equal(await sectors.locator('tbody tr').count(),24);
   for(const [owner,target] of [[sectors,source.sectorName],[table(page,/^国内の地域/),name],[table(page,/^公表値の推移/),'2024']]){const cell=row(page,owner,target);assert.ok((await cell.locator('td').textContent()).includes(label));if(['秘匿','該当なし'].includes(label))assert.equal(await cell.locator('.industry-bar').count(),0);}
   const names=await table(page,/^国内の地域/).locator('tbody th').allTextContents();assert.equal(names.length,47);assert.deepEqual(names.slice(0,source.rankedNames.length),source.rankedNames);
  }
  for(const selector of ['[data-industry-scale]','[data-reading-map-legend]'])for(const label of ['秘匿','該当なし','未掲載'])assert.ok((await page.locator(selector).textContent()).includes(label));
  await row(page,table(page,/^24業種/),source.transportName).getByRole('button').click();await selected(page,'長崎県','511,044');
  await row(page,table(page,/^24業種/),source.sectorName).getByRole('button').click();await selected(page,'長崎県','該当なし');
  await page.locator('[data-dock-compare="population"]').click();await page.locator('[data-comparison-back]').click();await selected(page,'長崎県','該当なし');
  assert.equal(new URL(page.url()).searchParams.get('topic'),'jp-20');await page.reload({waitUntil:'domcontentloaded'});await industryReady(page);await selected(page,'長崎県','該当なし');
  return {observations,sourceMarkers:{X:'秘匿','***':'該当なし'},sectorCount:24,domesticCount:47,numericRankingOnly:true,pointerTopicButtons:true,comparisonReturn:true,urlReload:true};
 });
 await operation(browser,host,profile,'putrajaya-missing-zero',async page=>{
  await open(page,host,'/atlas/asia/southeast-asia/industry/?topic=my-p3&place=MYS&detail=MY-16');await industryReady(page);const value=await selected(page,'プトラジャヤ','0（公表値）');
  await expand(page.locator('[data-industry-content] details').filter({has:page.locator('caption').filter({hasText:/^公表値の推移/})}));
  const history=table(page,/^公表値の推移/),missing=await row(page,history,'2023').locator('td').textContent(),zero=await row(page,history,'2025').locator('td').textContent();
  assert.match(missing,/^未掲載/);assert.match(zero,/^0（公表値）/);assert.match(await row(page,table(page,/^国内の地域/),'プトラジャヤ').locator('td').textContent(),/^0（公表値）/);assert.match(await page.locator('[data-industry-lead]').textContent(),/番目/);
  return {selection:value,year2023:missing,year2025:zero,zeroIncludedInRanking:true};
 });
 await operation(browser,host,profile,'city-month-comparison',async page=>{
  await open(page,host,'/atlas/asia/east-asia/nature/?place=JPN&city=tokyo');const city=page.locator('[data-city-select]');assert.equal(await city.inputValue(),'tokyo');
  await page.locator('[data-country-select]').selectOption('CHN');assert.equal(await city.inputValue(),'');assert.deepEqual(await city.locator('option[value="tokyo"]').evaluate(option=>({disabled:option.disabled,hidden:option.hidden})),{disabled:true,hidden:true});
  await city.selectOption('beijing');
  const chart=page.locator('[data-city-statistics]:visible');await chart.waitFor({state:'visible'});
  const pickerChart=await chart.evaluate(node=>({svg:node.querySelector('svg').innerHTML,monthly:node.closest('[data-city-panel]').querySelector('.monthly-values table').textContent}));
  await city.selectOption('');assert.equal(new URL(page.url()).searchParams.get('city'),null);
  await page.locator('[data-station="beijing"]').click();await page.locator('[data-city-panel="beijing"]').waitFor({state:'visible'});
  assert.equal(await city.inputValue(),'beijing');assert.equal(new URL(page.url()).searchParams.get('place'),'CHN');assert.equal(new URL(page.url()).searchParams.get('city'),'beijing');
  assert.deepEqual(await chart.evaluate(node=>({svg:node.querySelector('svg').innerHTML,monthly:node.closest('[data-city-panel]').querySelector('.monthly-values table').textContent})),pickerChart,'Picker and map city click must show the same rain-temperature chart and monthly values');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-city-panel="beijing"]').waitFor({state:'visible'});assert.equal(await city.inputValue(),'beijing');
  await page.locator('[data-dock-compare="industry"]').click();assert.equal(await city.isVisible(),false);await page.locator('[data-comparison-back]').click();assert.equal(await city.inputValue(),'beijing');
  assert.equal(await page.locator('[data-water-topics] [data-natural-topic="seasonal-precipitation"]').count(),0);await open(page,host,'/atlas/asia/east-asia/nature/?topic=seasonal-precipitation&place=CHN&detail=m-07');const month=page.locator('[data-seasonal-month]');await month.waitFor({state:'visible'});
  await month.selectOption('m-01');await page.locator('[data-seasonal-previous]').click();assert.equal(await month.inputValue(),'m-12');await page.locator('[data-seasonal-next]').click();assert.equal(await month.inputValue(),'m-01');
  await page.locator('[data-dock-compare="industry"]').click();await page.locator('[data-comparison-back]').click();assert.equal(await month.inputValue(),'m-01');
  await page.locator('[data-natural-group="climate"]').click();await city.waitFor({state:'visible'});assert.equal(await month.isVisible(),false);await city.selectOption('beijing');assert.equal(new URL(page.url()).searchParams.get('city'),'beijing');
  return {countryCityFilter:true,pickerAndMapCityChart:true,pickerAndMapCityURL:true,cityURLReload:true,cityComparisonReturn:true,previousMonth:'m-12',nextMonth:'m-01',monthComparisonReturn:'m-01',climatePickerRestored:true};
 });
 await operation(browser,host,profile,'industry-fetch-retry',async(page,control)=>{
  control.failIndustry=true;
  await page.goto(host.origin+basePath+'/atlas/asia/east-asia/industry/?topic=jp-20&place=JPN&detail=JP-43',{waitUntil:'domcontentloaded'});
  await expand(page.locator('[data-reading-details]'));await page.locator('[data-industry-retry]').waitFor({state:'visible'});assert.match(await page.locator('[data-industry-status]').textContent(),/取得できません/);
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);
  await settle(page);
  // The panel and main legend have independent initial loaders. A late map
  // load must not start a third request while the explicit retry is visible.
  assert.equal(control.industryRequests,2,'Only the panel and main legend may request the failed asset before explicit retry');
  const before=new URL(page.url()),attempts=control.industryRequests;control.failIndustry=false;await page.locator('[data-industry-retry]').click();await industryReady(page);await selected(page,'熊本県','秘匿');
  assert(control.industryRequests>attempts);assert.equal(await page.locator('[data-industry-retry]').isVisible(),false);for(const key of ['topic','place','detail'])assert.equal(new URL(page.url()).searchParams.get(key),before.searchParams.get(key));
  return {simulatedHTTPStatus:503,lateMapLoadDidNotRetry:true,requestsBeforeRetry:attempts,requestsAfterRetry:control.industryRequests,selectionAfterRetry:'熊本県：秘匿',urlSelectionRetained:true};
 });
}

async function checkRequestedCorrections(browser,host,profile){
 for(const [region,country,city] of [['east-asia','JPN','tokyo'],['southeast-asia','THA','bangkok'],['south-central-asia','IND','new-delhi']])await operation(browser,host,profile,`${region}-requested-corrections`,async page=>{
  await open(page,host,`/atlas/asia/${region}/nature/?place=${country}&city=${city}`);
  const chart=page.locator(`[data-city-panel="${city}"] [data-city-statistics]`);await chart.waitFor({state:'visible'});
  await page.waitForFunction(city=>!document.querySelector(`[data-city-panel="${city}"] [data-city-class-name]`).textContent.includes('未取得'),city);
  const boxes=await page.evaluate(city=>{
   const box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};
   return {panel:box(document.querySelector('.asia-reading-panel')),chart:box(document.querySelector(`[data-city-panel="${city}"] [data-city-statistics]`)),map:box(document.querySelector('[data-map-surface]')),first:document.querySelector('.asia-reading-panel').firstElementChild.hasAttribute('data-city-reading-host'),linksBelow:document.querySelector('[data-asia-map-items]').contains(document.querySelector('[data-reading-dock-links]'))};
  },city);
  assert(boxes.first&&boxes.linksBelow);assert(boxes.chart.y-boxes.panel.y<=24&&boxes.chart.x>=boxes.map.right,'Rain-temperature figure must lead the right column');
  assert(boxes.chart.bottom<=profile.viewport.height,'The complete figure must be visible before scrolling');
  assert.equal(await page.locator('[data-reading-dock]').isVisible(),false);assert.match(await page.locator(`[data-city-panel="${city}"] .city-farming`).textContent(),/灌漑|デルタ/);
  await contextPicture(page,profile,`${region}-city-first`,'asia');
  await open(page,host,`/atlas/asia/${region}/agriculture/`);await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.farmContextStatus==='ready');
  const product=await page.locator('[data-asia-config]').evaluate(node=>JSON.parse(node.textContent).presentation.farming.products.find(p=>p.kind==='crop'&&p.id!=='rice').id);
  await page.locator(`[data-farm-choice="${product}"]`).click();await page.waitForFunction(id=>document.querySelector('[data-asia-atlas]').dataset.farmSelected===id,product);
  const agricultureURL=page.url();await page.locator('[data-map-surface]').click({position:{x:30,y:30}});
  assert.equal(page.url(),agricultureURL,'Unrelated agriculture background must be inert');assert.equal(await page.locator('.asia-point-marker').isVisible(),false);
  assert.equal(await page.locator('[data-map-surface] canvas').evaluate(node=>getComputedStyle(node).outlineStyle),'none','Pointer click must not add a rectangular focus frame');
  await contextPicture(page,profile,`${region}-agriculture-inert-background`,'asia');
  await open(page,host,`/atlas/asia/${region}/nature/?topic=precipitation`);
  const rainPoint=await page.locator('[data-map-surface]').evaluate(node=>{
   const r=node.getBoundingClientRect();
   for(const y of [100,60,140])for(const x of [100,60,140]){
    const point={x:r.left+x,y:r.top+y},hit=document.elementFromPoint(point.x,point.y);
    if(hit?.tagName==='CANVAS'&&node.contains(hit))return point;
   }
   throw new Error('A visible map canvas point without a rainfall label is required');
  });
  await page.mouse.click(rainPoint.x,rainPoint.y);
  await page.waitForFunction(()=>new URL(location.href).searchParams.has('at'));
  assert(new URL(page.url()).searchParams.get('at'),'Rainfall background click must perform the point lookup');
  await page.waitForFunction(()=>/年降水量.*mm\/年|この地点はデータなし、または表示範囲外/.test(document.querySelector('[data-hydrology-value]')?.textContent??''));
  assert.equal(new URL(page.url()).searchParams.get('place'),null,'Rainfall point lookup must not select a background country');assert.equal(await page.locator('.asia-point-marker').isVisible(),false);
  await contextPicture(page,profile,`${region}-rainfall-no-country-popup`,'asia');
  await open(page,host,`/atlas/asia/${region}/nature/?topic=basins`);const basin=page.locator('[data-hydrology-detail]');
  await page.waitForFunction(()=>document.querySelector('[data-hydrology-detail]')?.options.length>1);
  await expand(page.locator('[data-hydrology-panel] > details').first());
  const id=await basin.locator('option').evaluateAll(options=>options.find(o=>o.value&&!o.disabled).value);await basin.selectOption(id);
  await page.waitForFunction(id=>new URL(location.href).searchParams.get('detail')===id,id);
  await settle(page);
  await page.locator('[data-map-surface]').scrollIntoViewIfNeeded();
  const basinURL=page.url(),basinValue=await page.locator('[data-hydrology-value]').textContent(),map=await page.locator('[data-map-surface]').boundingBox();
  const background=mapPixels(await page.screenshot({fullPage:false,animations:'disabled'}),{x:map.x,y:map.y,width:map.width,height:map.height}).backgroundPoint;
  assert(background,'A visible uncovered background pixel is required for the inert-click check');await page.mouse.click(background.x,background.y);assert.equal(page.url(),basinURL,'Empty background must retain the selected basin');
  assert.equal(await page.locator('[data-hydrology-value]').textContent(),basinValue);assert.equal(await page.locator('.asia-point-marker').isVisible(),false);
  await contextPicture(page,profile,`${region}-basin-selection-retained`,'asia');
  return {cityFirst:boxes,agricultureBackgroundInert:true,productSelectionPreserved:product,rainfallLookupDoesNotSelectCountry:true,basinBackgroundPreservesSelection:id,noCountryPopups:true,noPointerFocusRectangle:true};
 });
 await operation(browser,host,profile,'east-industry-country-pilot',async page=>{
  const checks=await verifyAsiaIndustryCountry(page,{profile,source:host.origin+basePath});
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden&&document.querySelector('[data-trade-status]')?.textContent==='');
  await settle(page);
  await contextPicture(page,profile,'east-industry-country-pilot','asia');return checks;
 });
}

async function checkEastContourBands(browser,host,profile){
 await operation(browser,host,profile,'east-aligned-contour-bands',async(page,control)=>{
  const evidence=[];
  for(const [topic,kind,interval,legend] of [['precipitation','rainfall',250,'[data-hydrology-scale]'],['terrain','terrain',500,'[data-physical-legend] .asia-physical-key']]){
   await open(page,host,`/atlas/asia/east-asia/nature/?topic=${topic}`);
   await page.waitForFunction(kind=>{const r=document.querySelector('[data-asia-atlas]');return r.dataset.contourBandStatus==='ready'&&r.dataset.contourBandKind===kind;},kind);
   const expected=await page.locator('[data-asia-config]').evaluate((node,kind)=>JSON.parse(node.textContent).presentation[kind].bands,kind);
   assert.equal(expected.interval,interval);
   const actual=await page.locator(`${legend} > span`).evaluateAll(nodes=>nodes.filter(n=>/–/.test(n.textContent)).map(n=>({color:n.querySelector('i').style.backgroundColor,label:n.textContent})));
   const wanted=await page.evaluate(b=>b.colors.map((color,i)=>{const e=document.createElement('i');e.style.backgroundColor=color;return {color:e.style.backgroundColor,label:`${b.breaks[i].toLocaleString('ja-JP')}–${b.breaks[i+1].toLocaleString('ja-JP')}`};}),expected);
   assert.deepEqual(actual,wanted,'Legend colors and thresholds match the generated polygons');
   await settle(page);await contextPicture(page,profile,`east-${kind}-bands-overview`,'asia');
   const capture=results.captures.at(-1),palette=expected.colors.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)>>4).join(','));
   const rendered=palette.filter(c=>capture.mapPixels.colorBucketKeys.includes(c));assert(new Set(rendered).size>=4,'The actual canvas must render several generated palette colors');
   await open(page,host,`/atlas/asia/east-asia/nature/?topic=${topic}&lng=121.00000&lat=23.80000&z=6.000&at=121.00000,23.80000`);
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='ready');
   const valueSelector=topic==='precipitation'?'[data-hydrology-value]':'[data-physical-value]';
   await page.waitForFunction(selector=>/\d/.test(document.querySelector(selector)?.textContent??''),valueSelector);
   const cfg=await page.locator('[data-asia-config]').evaluate(node=>JSON.parse(node.textContent)),grid=kind==='rainfall'?cfg.water.precipitation:cfg.physical;
   const raw=gunzipSync(await readFile(path.join(repo,expected.sourceGrid))),[w,s,e,n]=grid.bounds3857;
   const x=6378137*121*Math.PI/180,y=6378137*Math.log(Math.tan(Math.PI/4+23.8*Math.PI/360));
   const value=raw.readInt16LE(2*(Math.floor((n-y)/(n-s)*grid.height)*grid.width+Math.floor((x-w)/(e-w)*grid.width)));
   assert.notEqual(value,-32768);assert((await page.locator(valueSelector).textContent()).includes(value.toLocaleString('ja-JP')),'Point reading retains the original unsmoothed source value');
   await settle(page);await contextPicture(page,profile,`east-${kind}-bands-detail`,'asia');
   const url=page.url();await page.reload();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='ready');
   assert.equal(page.url(),url,'Reload preserves the topic, point and camera');assert.equal(await page.locator('.maplibregl-popup').count(),0);
   evidence.push({kind,interval,paletteMatches:new Set(rendered).size,sourceGridSHA256:expected.sourceGridSHA256,originalPointValue:value,reloadRetainsURL:true});
  }
  control.failContourBands=true;await open(page,host,'/atlas/asia/east-asia/nature/?topic=precipitation&at=139.75000,35.69000');
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='error');
  const url=page.url();control.failContourBands=false;await page.locator('[data-map-retry]').click();
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.contourBandStatus==='ready');
  assert.equal(page.url(),url,'Retry retains the selected point');return {bands:evidence,retryRetainsPoint:true};
 });
}

async function main(){
 await mkdir(output,{recursive:true});await persist();let host,browser;
 try{
  metadata.checkedOutSHA=(await run('git',['rev-parse','HEAD'],{cwd:repo})).stdout.trim();
  const ci=process.env.GITHUB_ACTIONS==='true';
  const sandbox=process.env.ATLAS_ASIA_BROWSER_UNSANDBOXED!=='1';
  metadata.scriptSHA256=createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
  metadata.workingTreeChanges=(await run('git',['status','--porcelain','--untracked-files=all','--','.',':(exclude)review-artifacts/asia-pc'],{cwd:repo})).stdout.trim().split('\n').filter(Boolean);
  metadata.workingTreeDirty=metadata.workingTreeChanges.length>0;
  if(ci)assert.equal(metadata.workingTreeDirty,false,'CI must capture a clean checked-out source tree');
  if(ci){assert(sandbox,'CI must use the normal Chromium sandbox');assert.equal(process.env.RUNNER_OS,'Linux');assert.match(metadata.headSHA??'',/^[a-f0-9]{40}$/i);assert(metadata.runId,'CI run ID is required');assert(metadata.fonts.families?.trim(),'Verified Japanese-capable runner fonts are required');assert(metadata.fonts.match?.trim(),'Japanese font resolution must be recorded');}
  metadata.headSHASource=metadata.headSHA?'REVIEW_HEAD_SHA':'local-checked-out-commit';metadata.headSHA??=metadata.checkedOutSHA;
  assert.match(metadata.headSHA,/^[a-f0-9]{40}$/i);assert.equal(metadata.checkedOutSHA,metadata.headSHA,'The checked-out commit must equal the reviewed head SHA');
  for(const sha of [metadata.baseSHA,metadata.beforeSHA])if(sha)assert.match(sha,/^[a-f0-9]{40}$/i);
  metadata.fonts.source=metadata.fonts.families&&metadata.fonts.match?'verified-environment':'local-fontconfig';
  metadata.fonts.families??=(await run('fc-list',[':lang=ja','family'])).stdout.trim();
  metadata.fonts.match??=(await Promise.all(['sans-serif:lang=ja','serif:lang=ja'].map(pattern=>run('fc-match',['-f','%{family}\n',pattern])))).map(result=>result.stdout.trim()).join('\n');
  assert(metadata.fonts.families.trim(),'Existing Japanese-capable fonts are required; no font installation is performed');assert(metadata.fonts.match.trim(),'Japanese font resolution must be recorded');
  const executablePath=process.env.REVIEW_CHROME_PATH;assert(executablePath,'Set REVIEW_CHROME_PATH to an already installed Chrome');await access(executablePath,constants.X_OK);
  metadata.headMatchesCheckedOut=metadata.headSHA?metadata.checkedOutSHA===metadata.headSHA:null;
  host=await serveBuild();metadata.previewOrigin=host.origin;
  browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:sandbox});metadata.browser={version:browser.version(),executablePath,headless:true,chromiumSandbox:sandbox,deviceScaleFactor:1,additionalFlags:[],certificateExceptions:false};await persist();
  const manifest=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/asia-industry-v1/manifest.json'),'utf8'));
  const east=JSON.parse(gunzipSync(await readFile(path.join(repo,'public/assets/atlas/asia-industry-v1',manifest.regions['east-asia'].data))));
  const source={sectorName:manifest.regions['east-asia'].topics.find(topic=>topic.id==='jp-20').title.replace('日本：',''),transportName:manifest.regions['east-asia'].topics.find(topic=>topic.id==='jp-31').title.replace('日本：',''),rankedNames:east.admin.filter(row=>row.country==='JPN').map(row=>({name:row.name,...row.series['jp-20'].find(value=>value.year==='2024')})).filter(row=>row.value!==null).sort((a,b)=>b.value-a.value).map(row=>row.name)};
  for(const profile of profiles)for(const scene of scenes)for(const region of ['us','asia'])await capture(browser,host,profile,scene,region);
  compare();await persist();
  for(const profile of profiles)await checkOperations(browser,host,profile,source);
  for(const profile of profiles)await checkContextOperations(browser,host,profile);
  for(const profile of profiles)await checkRequestedCorrections(browser,host,profile);
  for(const profile of profiles)await checkEastContourBands(browser,host,profile);
  metadata.expectedImageCount=82;
  assert.equal(results.captures.length,82);assert(results.captures.every(row=>row.passed),'All 82 viewport captures must pass');
  assert.equal(results.comparisons.length,8);assert(results.comparisons.every(row=>row.passed),'All 8 geometry comparisons must pass');
  assert.equal(results.operations.length,38);assert(results.operations.every(row=>row.passed),'All 38 PC operation groups must pass');
  assert.deepEqual(results.externalCommunicationAttempts,[]);assert.deepEqual(results.blockedWebSockets,[]);
  metadata.status='passed';
 }catch(error){metadata.status='failed';metadata.failure=failure(error);process.exitCode=1;}
 finally{await browser?.close();if(host)await new Promise(resolve=>host.server.close(resolve));metadata.completedAt=new Date().toISOString();await persist();}
 console.log(JSON.stringify({status:metadata.status,checkedOutSHA:metadata.checkedOutSHA,images:results.captures.filter(row=>row.passed).length,comparisons:results.comparisons.filter(row=>row.passed).length,operations:results.operations.filter(row=>row.passed).length,externalAttempts:results.externalCommunicationAttempts.length,output:metadata.output,failure:metadata.failure?.split('\n')[0]},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
