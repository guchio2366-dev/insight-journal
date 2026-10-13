#!/usr/bin/env node
/** Real PC acceptance for the approved Africa second review; no browser protection is disabled. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import config from '../../astro.config.mjs';
import {africaClimateCities} from '../../src/data/atlas/africa-climate-cities.ts';

const root=path.resolve(import.meta.dirname,'../..'),dist=path.join(root,'dist');
const output=path.resolve(process.env.AFRICA_REVIEW_OUTPUT??path.join(root,'review-artifacts/africa-pc-review'));
const representative=path.join(output,'representative'),base=String(config.base??'').replace(/\/$/,'');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const remainingReview=process.env.AFRICA_REVIEW_SCOPE==='remaining';
const thirdReview=remainingReview||process.env.AFRICA_REVIEW_SCOPE==='third';
const report={status:'running',reviewScope:'round2',head,startedAt:new Date().toISOString(),browserLaunch:{headless:true,chromiumSandbox:true,additionalFlags:[]},profiles:[],screenshots:[],remaining:[{item:'Africa-wide forest cover surface',status:'blocked',reason:'ESA/JRC and independent FAO consumer-local source acquisition returned HTTP proxy 403. Forestry frame checks do not satisfy forest-distribution completion.'},{item:'Broad ethnicity residence distribution',status:'blocked',reason:'A source with verified public redistribution permission has not been acquired. Language record points are not an ethnicity map; a guide is not distribution completion.'},{item:'Three user input screenshots',status:'unverified',libraryIds:['libfile_e6e132d2519881918c11f5484034915d','libfile_3a6c0985c278819181955d84fea67de7','libfile_3fc75e7f5c0c8191b40ee1ca1084e8f2'],reason:'Not acquired and not visually inspected in this consumer-local executor. Captures of the implementation do not establish comparison with the user input photos.'},{item:'Precise geolocated river-mouth markers',status:'not-acquired',reason:'Outlet names and verified connected catchments are available; exact river-mouth point coordinates have not been acquired and are not invented.'}],inputEvidence:{userInputPhotos:'not-inspected',browserCaptures:'current implementation only'},ci:{repository:process.env.AFRICA_REVIEW_REPOSITORY,runId:process.env.AFRICA_REVIEW_RUN_ID,attempt:process.env.AFRICA_REVIEW_RUN_ATTEMPT},fonts:{families:process.env.AFRICA_REVIEW_JAPANESE_FONTS,match:process.env.AFRICA_REVIEW_JAPANESE_FONT_MATCH,setup:process.env.AFRICA_REVIEW_JAPANESE_FONT_SETUP}};
await mkdir(representative,{recursive:true});
if(thirdReview){report.reviewScope=remainingReview?'remaining-20261013':'third-20261012';report.remaining.push(
 {item:'Ghana 16-region geography',status:'input-required',reason:'All 144 census counts are retained; geoBoundaries and independent OCHA shape acquisition stopped at proxy CONNECT403. Composition bars are statistics, not residence surfaces.'},
 {item:'Equatorial mainland climate station',status:'input-required',reason:'12 existing stations remain; a verified monthly-normal record was not acquired and no thirteenth record is invented.'},
 {item:'Named major aquifer areas',status:'input-required',reason:'BGS and independent BGR WHYMAP Africa requests stopped at proxy CONNECT403. Geology classes are not groundwater quantity.'},
 {item:'South Africa eastern plantations',status:'input-required',reason:'No verified plantation polygon was acquired from the South Africa national land-cover source; forest cover, plantations, and harvest sites remain distinct.'},
 {item:'Cocoa map layer',status:'input-required',reason:'ICCO public information supports high inclusion priority, but a matching spatial crop dataset and regional figures are not yet retained.'},
 {item:'New denomination/language switch structure',status:'proposal-pending',reason:'Parent research recorded separately; no denomination surfaces or language buffers/Voronoi are invented.'}
);}
if(remainingReview){report.completedWork=['Ghana2021 table5.7: 128 regional counts and 8 national categories','South Africa2022 home language table2.9:153 province rates and17 national rates','2222 owned Glottolog record inspection with original coordinates'];const row=report.remaining.find(row=>row.item==='New denomination/language switch structure');if(row){row.status='input-required';row.reason='Owned record inspection and limited statistical tables added. Continental denomination/language residence geometry remains unacquired; no new geographic mode or buffers/Voronoi invented.';}}
const save=async()=>{const bytes=JSON.stringify(report,null,2)+'\n';if(report.status.startsWith('passed'))assert(report.screenshots.reduce((sum,image)=>sum+image.bytes,0)+Buffer.byteLength(bytes)<20*1024*1024,'review images and JSON below 20 MiB');await writeFile(path.join(output,'review-metadata.json'),bytes);await writeFile(path.join(representative,'review-metadata.json'),bytes);};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(base&&url.startsWith(base+'/'))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);assert(file.startsWith(dist+path.sep));res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end('missing');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const site=`http://127.0.0.1:${server.address().port}`,origin=site+base;
let browser,currentPage,currentProfile;
const state=page=>Object.fromEntries(new URL(page.url()).searchParams);
async function settle(page){await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
async function view(page,query,ready){await page.goto(origin+'/atlas/africa/?'+query,{waitUntil:'networkidle'});if(ready)await page.locator(ready).first().waitFor();await settle(page);}
async function measure(locator){return locator.evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node),matrix=node instanceof SVGGraphicsElement?node.getScreenCTM():null;return {connected:node.isConnected,x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:s.display,visibility:s.visibility,opacity:s.opacity,fontPx:parseFloat(s.fontSize)*(matrix?Math.hypot(matrix.a,matrix.b):1),maxHeight:s.maxHeight};});}
async function visible(locator,within){
 // Async layer decoding replaces SVG groups. Resolve the current node for each
 // measurement, and check its connection/visibility/bbox in the same evaluation.
 let box,previous,stable=false;const deadline=Date.now()+30000;
 while(Date.now()<deadline){
  box=await measure(locator);
  const painted=box.connected&&box.display!=='none'&&box.visibility!=='hidden'&&box.width>0&&box.height>0;
  if(painted&&previous&&['x','y','width','height'].every(key=>Math.abs(box[key]-previous[key])<.01)){stable=true;break;}
  previous=painted?box:undefined;
  await locator.page().evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 }
 assert(box?.connected&&box.display!=='none'&&box.visibility!=='hidden','visible node: '+locator);
 assert(box.width>0&&box.height>0,'painted dimensions required');assert(stable,'painted dimensions must stabilize');
 if(within){const frame=await measure(within);assert(box.x>=frame.x-2&&box.y>=frame.y-2&&box.right<=frame.right+2&&box.bottom<=frame.bottom+2,'node must fit its map or reader frame');}return box;
}
async function labels(page,selector,frameSelector='.africa-map-frame'){const frame=await measure(page.locator(frameSelector));const rows=await page.locator(selector).evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node),m=node.getScreenCTM();return {id:node.getAttribute('data-africa-natural-label')??node.getAttribute('data-africa-basin-label')??node.getAttribute('data-africa-contour-label')??'',kind:node.getAttribute('data-africa-natural-kind')??'',text:[...node.childNodes].filter(n=>n.nodeName.toLowerCase()!=='title').map(n=>n.textContent).join('').trim(),x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,fontPx:parseFloat(s.fontSize)*(m?Math.hypot(m.a,m.b):1),display:s.display,visibility:s.visibility};}));for(const row of rows){assert(row.width>0&&row.height>0&&row.display!=='none'&&row.visibility!=='hidden','label actually drawn: '+row.text);assert(row.x>=frame.x-2&&row.right<=frame.right+2&&row.y>=frame.y-2&&row.bottom<=frame.bottom+2,'label clipped: '+row.text);}return rows;}
function importantNameCollisions(rows,scene){const pairs=[];for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j],width=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x)),height=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));if(width*height>4)pairs.push({first:a.id,second:b.id,intersectionPixels:width*height});}assert.deepEqual(pairs,[],scene+' important names must not collide in the primary PC viewport');return pairs;}
async function naturalNames(page,profile,scene,counts){const names=await labels(page,'[data-africa-natural-label]'),actual=Object.fromEntries(['terrain','river','sea','current','wind'].map(kind=>[kind,names.filter(n=>n.kind===kind).length]));for(const [kind,count]of Object.entries(counts))assert.equal(actual[kind],count,scene+' '+kind+' labels');assert(names.every(n=>n.fontPx>=9.5),'natural names have screen-stable readable size');const important=names.filter(n=>n.kind==='terrain'||['nile','congo','niger','atlantic','indian'].includes(n.id));const collisions=profile.width===1920?importantNameCollisions(important,scene):'secondary viewport: clipping checked; dense-name collisions recorded without extrapolation';return {counts:actual,names,importantNames:important.map(n=>n.id),collisions};}
async function shapeClick(page,locator){await visible(locator);const point=await locator.evaluate(node=>{const r=node.getBoundingClientRect();for(let y=1;y<25;y++)for(let x=1;x<25;x++){const px=r.left+r.width*x/25,py=r.top+r.height*y/25;if(document.elementFromPoint(px,py)===node)return {x:px,y:py};}return null;});assert(point,'map shape must have an unobstructed pointer target');await page.mouse.click(point.x,point.y);await settle(page);}
async function layout(page,profile,scene){await page.evaluate(()=>scrollTo(0,0));const result=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},pageOverflow:document.documentElement.scrollWidth>innerWidth+1,zoom:getComputedStyle(document.documentElement).zoom}));assert.equal(result.viewport.dpr,1);assert(result.zoom==='normal'||Number(result.zoom)===1,'CSS zoom is 100 percent');assert.equal(result.viewport.width,profile.width);assert.equal(result.viewport.height,profile.height);assert.equal(result.pageOverflow,false,scene+' horizontal overflow');const map=await visible(page.locator('.africa-map-frame,.forest-map-stage').first()),reader=await visible(page.locator('.africa-detail,.forest-reading').first());assert(reader.x>=map.right-2,scene+' map and reader overlap');if(profile.width===1920){assert(map.bottom<=profile.height+2,scene+' main map clipped by viewport');assert(reader.bottom<=profile.height+2,scene+' reader clipped by viewport');}profile.layouts.push({scene,...result,map,reader});}
async function capture(page,profile,scene){if(profile.width!==1920&&!['climate-toamasina','agriculture','unverified-climate-toamasina','unverified-agriculture'].includes(scene))return;await page.evaluate(()=>scrollTo(0,0));const file=`${profile.width}-${scene}.jpg`;await page.screenshot({path:path.join(representative,file),type:'jpeg',quality:66,animations:'disabled'});const bytes=await readFile(path.join(representative,file));report.screenshots.push({file,viewport:{width:profile.width,height:profile.height,dpr:1},scene,bytes:bytes.length,sha256:sha(bytes),fullPage:false});}
async function paintedBlue(page){const bytes=await page.locator('.africa-map').screenshot({type:'png'});return page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,image.width,image.height).data;let painted=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+2]>pixels[i]+30&&pixels[i+2]>pixels[i+1]+8)painted++;return painted;},bytes.toString('base64'));}
async function paintedAgriculture(page,profile){
 const before=await page.locator('.africa-map').screenshot({type:'png',animations:'disabled'}),layers=page.locator('[data-africa-agri-distribution]');
 const styles=await layers.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('style')));let control;
 try{await layers.evaluateAll(nodes=>nodes.forEach(n=>n.style.setProperty('visibility','hidden','important')));await settle(page);control=await page.locator('.africa-map').screenshot({type:'png',animations:'disabled'});}
 finally{await layers.evaluateAll((nodes,saved)=>nodes.forEach((n,i)=>saved[i]===null?n.removeAttribute('style'):n.setAttribute('style',saved[i])),styles);await settle(page);}
 const measured=await page.evaluate(async({before,control})=>{
  const decode=async bytes=>{const image=new Image();image.src='data:image/png;base64,'+bytes;await image.decode();return image;};
  const [image,hidden]=await Promise.all([decode(before),decode(control)]),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(hidden,0,0);const baseline=ctx.getImageData(0,0,canvas.width,canvas.height).data;
  const measure=candidate=>{let changed=0;for(let i=0;i<candidate.length;i+=4)if(Math.max(...[0,1,2].map(k=>Math.abs(candidate[i+k]-baseline[i+k])))>=18)changed++;return {changedPixels:changed,fraction:changed/(canvas.width*canvas.height)};};
  return {width:canvas.width,height:canvas.height,minimumFraction:.01,visible:measure(pixels),hiddenControl:measure(baseline)};
 },{before:before.toString('base64'),control:control.toString('base64')});
 const accepts=measurement=>assert(measurement.fraction>=measured.minimumFraction,'crop/livestock surfaces must actually paint beyond the labels');
 accepts(measured.visible);assert.throws(()=>accepts(measured.hiddenControl),/surfaces must actually paint/);measured.hiddenControl.rejected=true;
 if(profile.width===1920)for(const [scene,bytes]of [['agriculture-map-lossless',before],['agriculture-distribution-hidden-control',control]]){const file=`1920-${scene}.png`;await writeFile(path.join(representative,file),bytes);report.screenshots.push({file,scene,viewport:{width:profile.width,height:profile.height,dpr:1},bytes:bytes.length,sha256:sha(bytes),fullPage:false});}
 return measured;
}

// Preserve the original failed assertion while still delivering the other
// requested views for human review. These captures never count as passed tests.
async function captureRemainingViews(){
 if(!browser)return;
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===site?route.continue():route.abort());
 const page=await context.newPage(),profile={width:1920,height:1080};report.failureRepresentatives={status:'capture-only; acceptance failed',views:[]};
 const scenes=[
  ['climate-toamasina','field=nature&topic=climate&city=toamasina','[data-africa-city-reading=toamasina]'],
  ['agriculture','field=agriculture','[data-africa-agri-distribution]'],
  ['rain','field=nature&topic=water&water=rain','[data-africa-raster=water-rain]'],
  ['basins','field=nature&topic=water&water=basin','[data-africa-basin]'],
  ['rivers','field=nature&topic=water&water=river','[data-africa-river-feature]'],
  ['terrain','field=nature&topic=terrain','[data-africa-natural-label]'],
  ['elevation','field=nature&topic=elevation','[data-africa-contour]'],
  ['population','field=population','[data-africa-raster=distribution]'],
  ['religion','field=population&topic=religion','[data-africa-religion-country]'],
  ['language','field=population&topic=language','[data-africa-language-point]'],
  ['industry','field=industry','[data-africa-industry-location]'],
 ];
 try{
  for(const [scene,query,selector]of scenes){const record={scene,width:1920,acceptance:'not-passed'};report.failureRepresentatives.views.push(record);try{await page.goto(origin+'/atlas/africa/?'+query,{waitUntil:'networkidle',timeout:15000});await page.locator(selector).first().waitFor({timeout:15000});await settle(page);await capture(page,profile,'unverified-'+scene);record.capture='saved';record.actualLayer=await page.locator('[data-africa-atlas]').getAttribute('data-actual-layer');}catch(error){record.capture='failed';record.error=error.message;}}
  const record={scene:'forestry-frame',acceptance:'not-passed'};report.failureRepresentatives.views.push(record);try{await page.goto(origin+'/atlas/africa/agriculture/forestry/',{waitUntil:'networkidle',timeout:15000});await page.locator('[data-forest-map]').waitFor({timeout:15000});await settle(page);await capture(page,profile,'unverified-forestry-frame');record.capture='saved';}catch(error){record.capture='failed';record.error=error.message;}
 }finally{await context.close();}
 for(const [width,height]of [[1440,1000],[1024,768]]){
  const secondary=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
  await secondary.route('**/*',route=>new URL(route.request().url()).origin===site?route.continue():route.abort());
  const secondaryPage=await secondary.newPage();
  try{for(const [scene,query,selector]of scenes.slice(0,2)){const record={scene,width,acceptance:'not-passed'};report.failureRepresentatives.views.push(record);try{await secondaryPage.goto(origin+'/atlas/africa/?'+query,{waitUntil:'networkidle',timeout:15000});await secondaryPage.locator(selector).first().waitFor({timeout:15000});await settle(secondaryPage);await capture(secondaryPage,{width,height},'unverified-'+scene);record.capture='saved';}catch(error){record.capture='failed';record.error=error.message;}}}finally{await secondary.close();}
 }
}

try {
 const release=JSON.parse(await readFile(path.join(dist,'_release.json'),'utf8'));report.release=release;
 if(process.env.AFRICA_REVIEW_HEAD_SHA)assert.equal(head,process.env.AFRICA_REVIEW_HEAD_SHA,'reviewed checkout');
 if(process.env.GITHUB_ACTIONS==='true')assert.equal(release.commitSha,head,'built site embeds reviewed head');
 browser=await chromium.launch({executablePath:process.env.AFRICA_REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true});report.browserVersion=browser.version();
 for(const [width,height]of [[1920,1080],[1440,1000],[1024,768]]){
  const profile={width,height,dpr:1,status:'running',checks:[],layouts:[],climate:[],errors:[],failedRequests:[],externalRequests:[]};report.profiles.push(profile);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>{const url=route.request().url();if(/^https?:/.test(url)&&new URL(url).origin!==site){profile.externalRequests.push(url);return route.abort();}return route.continue();});
  const page=await context.newPage();currentPage=page;currentProfile=profile;page.on('pageerror',error=>profile.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)profile.failedRequests.push({status:response.status(),url:response.url()});});

  await view(page,'field=nature&topic=climate','[data-africa-raster=climate]');
  await layout(page,profile,'climate');assert.equal(await page.locator('[data-africa-city-label]').count(),12);
  profile.climateLabels=await labels(page,'[data-africa-climate-map-label],[data-africa-city-label]');
  await capture(page,profile,'climate');const camera=await page.locator('.africa-map').getAttribute('viewBox');
  for(const id of ['mahajanga','toamasina','antananarivo','toliara']){
   const button=page.locator(`[data-africa-city-label="${id}"]`);await visible(button,page.locator('.africa-map-frame'));
   assert(await button.evaluate(node=>{const box=node.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);return !!hit&&node.contains(hit);}),id+' normal click centre hits the visible city button');
   await button.click({trial:true});await button.click();await settle(page);
   assert.equal(state(page).city,id);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),camera,'city changes no camera');
   const reading=page.locator(`[data-africa-city-reading="${id}"]`),plot=reading.locator('[data-climate-plot]');await visible(reading);const box=await visible(plot,page.locator('.africa-detail'));
   const drawing=await plot.evaluate(node=>({viewBox:node.viewBox.baseVal.width?{width:node.viewBox.baseVal.width,height:node.viewBox.baseVal.height}:null,min:Number(node.dataset.temperatureMin),max:Number(node.dataset.temperatureMax),rainMax:Number(node.dataset.rainMax),temperatureTicks:[...node.querySelectorAll('[data-temperature-tick]')].map(n=>Number(n.dataset.temperatureTick)),rainTicks:[...node.querySelectorAll('[data-rain-tick]')].map(n=>Number(n.dataset.rainTick)),bars:[...node.querySelectorAll('.atlas-climate-bar')].map(n=>({y:Number(n.getAttribute('y')),height:Number(n.getAttribute('height'))})),plotTop:Number(node.dataset.plotTop),plotBottom:Number(node.dataset.plotBottom),maxHeight:getComputedStyle(node).maxHeight}));
   const city=africaClimateCities.find(city=>city.id===id),peak=Math.max(...city.precipitationMm);
   assert.equal(drawing.min,-3);assert.equal(drawing.max,40);assert.equal(drawing.rainMax,Math.max(350,Math.ceil(peak/50)*50));
   assert(drawing.temperatureTicks.every((tick,i,all)=>!i||tick-all[i-1]===10));assert(drawing.rainTicks.every((tick,i,all)=>!i||tick-all[i-1]===100));assert.equal(drawing.bars.length,12);assert(drawing.bars.every(bar=>bar.y>=drawing.plotTop-.1&&bar.y+bar.height<=drawing.plotBottom+.1));
   assert(Math.abs(box.height-box.width*drawing.viewBox.height/drawing.viewBox.width)<2,'SVG retains native drawing aspect ratio; fixed height cap must not shrink it');
   const figure=await measure(reading.locator('figure'));assert(box.width>=figure.width*.9,'SVG occupies the available figure width');
   profile.climate.push({id,box,figure,axes:drawing,peakRainMm:peak});
   if(id==='toamasina')await capture(page,profile,'climate-toamasina');
  }
  const widths=profile.climate.map(city=>city.box.width);assert(Math.max(...widths)-Math.min(...widths)<2,'four Madagascar diagrams have equal drawing width');
  profile.cityClickChecks=profile.climate.map(city=>city.id);
  for(const city of africaClimateCities.filter(city=>!profile.cityClickChecks.includes(city.id))){
   const button=page.locator(`[data-africa-city-label="${city.id}"]`);await visible(button,page.locator('.africa-map-frame'));
   assert(await button.evaluate(node=>{const box=node.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);return !!hit&&node.contains(hit);}),city.id+' normal click centre hits the visible city button');
   await button.click({trial:true});await button.click();await settle(page);
   assert.equal(state(page).city,city.id);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),camera,'every city changes no camera');
   const reading=page.locator(`[data-africa-city-reading="${city.id}"]`);await visible(reading);assert((await reading.innerText()).includes(city.classification.code),'selected station classification is actually in its visible reading');
   assert.equal(await reading.locator('.atlas-climate-bar').count(),city.precipitationMm.filter(value=>value!==null).length,'missing rain months are not fabricated');
   profile.cityClickChecks.push(city.id);
  }
  assert.equal(profile.cityClickChecks.length,12);
  await page.locator('[data-africa-city-return]').click();await settle(page);assert(!state(page).city);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),camera);
  const reader=await measure(page.locator('.africa-detail')),mapFrame=await measure(page.locator('.africa-map-frame'));
  const scroll=await page.locator('.africa-detail').evaluate(node=>({clientHeight:node.clientHeight,scrollHeight:node.scrollHeight,overflowY:getComputedStyle(node).overflowY}));
  assert(Math.abs(reader.height-mapFrame.height)<3,'reader uses the complete map-height panel');assert.equal(scroll.overflowY,'auto');assert(scroll.clientHeight>0&&scroll.scrollHeight>=scroll.clientHeight,'the actual reader scroll container has usable dimensions');
  profile.checks.push('12 drawn selectable cities; four Madagascar plots preserve width, aspect ratio, monthly bars and agreed axes; city return and camera stability');

  await page.locator('[data-field=agriculture]').click();await settle(page);await page.locator('[data-africa-agri-distribution]').first().waitFor();
  const distributions=page.locator('[data-africa-agri-distribution]:visible');assert.equal(await distributions.count(),9);
  const crops=page.locator('[data-agri-layer][value=crops]'),livestock=page.locator('[data-agri-layer][value=livestock]');
  await visible(crops);await visible(livestock);assert(await crops.isChecked());assert(await livestock.isChecked());
  profile.agricultureLabels=await labels(page,'[data-africa-agri-label-text]');assert(profile.agricultureLabels.every(label=>label.fontPx>=12),'commodity names have usable screen size');
  if(thirdReview){assert.equal(await page.locator('[data-africa-agri-glyph]').count(),0);const opacities=await page.locator('image[data-africa-agri-distribution]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.africaAgriDistribution,opacity:Number(n.getAttribute('opacity'))})));assert(opacities.every(n=>n.opacity>=.7),'source distributions have readable color strength');profile.agriculturePaint={opacities,measurement:await paintedAgriculture(page,profile)};const nav=await measure(page.locator('.africa-region-tabs')),region=await measure(page.locator('[data-africa-agri-region-label]'));assert(region.x<=nav.right+20,'regional selection stays beside world/Africa at the upper left');}
  await layout(page,profile,'agriculture');await capture(page,profile,'agriculture');
  await livestock.uncheck();await settle(page);assert.equal(await distributions.count(),6);await livestock.check();await settle(page);assert.equal(await distributions.count(),9);
  await crops.uncheck();await settle(page);assert.equal(await distributions.count(),3);await crops.check();await settle(page);assert.equal(await distributions.count(),9);
  const coffee=page.locator('[data-africa-agri-label="crop-coffee-harvested"]:visible').first();await coffee.click();await settle(page);assert.equal(state(page).crop,'coffee');assert.equal(await distributions.count(),9);
  await visible(page.locator('[data-africa-agri-only]'));await page.locator('[data-africa-agri-only]').click();await settle(page);assert.equal(await distributions.count(),1);await page.locator('[data-africa-agri-all]').click();await settle(page);assert.equal(await distributions.count(),9);
  const farmingTabs=await page.locator('.africa-fields>*').allTextContents();
  await page.locator('[data-africa-topic=forestry]').click();await page.waitForURL(url=>url.pathname.endsWith('/atlas/africa/agriculture/forestry/'));await settle(page);
  assert(await page.locator('.africa-desktop-shell').isVisible());assert.deepEqual(await page.locator('.africa-fields>*').allTextContents(),farmingTabs);assert.equal(await page.locator('[data-africa-atlas]').count(),0);
  await layout(page,profile,'forestry-frame');await capture(page,profile,'forestry-frame');
  await page.getByRole('link',{name:'農畜産',exact:true}).click();await settle(page);assert.equal(state(page).field,'agriculture');assert.equal(state(page).topic,'farming');assert.equal(await distributions.count(),9);
  profile.checks.push('all nine farming layers; actual crop/animal checkboxes filter 6/3; selection retains layers, right-side only/all, shared forestry tabs and URL return');

  await view(page,'field=nature&topic=water&water=rain','[data-africa-raster=water-rain]');
  await page.locator('[data-africa-contour-label]').first().waitFor();await settle(page);
  assert(await page.locator('[data-africa-contour]').count()>10);const rainValues=await page.locator('[data-africa-contour]').evaluateAll(nodes=>[...new Set(nodes.map(node=>Number(node.dataset.africaContour)))].sort((a,b)=>a-b));assert(rainValues.every(v=>v>0&&v%250===0));assert(rainValues.includes(250)&&rainValues.includes(1000));
  const rainLabels=await labels(page,'[data-africa-contour-label]');assert(rainLabels.length>=3);assert(rainLabels.every(row=>/mm/.test(row.text)));
  if(thirdReview){profile.rainTerrain=await labels(page,'[data-africa-natural-kind=terrain]');assert.equal(profile.rainTerrain.length,12);if(profile.width===1920)importantNameCollisions([...rainLabels,...profile.rainTerrain],'rainfall and major relief names');}
  assert.equal(await page.locator('[data-country-path]').evaluateAll(nodes=>nodes.some(node=>['#416d4b','#62955a','#92b574'].includes(node.getAttribute('fill')))),false,'green country-average map is not the rain distribution');
  const bluePixels=await paintedBlue(page);assert(bluePixels>300,'rain surface actually paints blue pixels');profile.rain={rainValues,labels:rainLabels,bluePixels,textCollisions:importantNameCollisions(rainLabels,'rainfall values and mm units at '+profile.width)};await layout(page,profile,'rain');await capture(page,profile,'rain');
  await page.locator('[data-africa-water=basin]').click();await settle(page);await page.locator('[data-africa-basin]').first().waitFor();
  await page.locator('[data-africa-basin-label]').first().waitFor();await settle(page);
  assert.equal(await page.locator('[data-africa-basin]').count(),11);const basinIds=await page.locator('[data-africa-basin]').evaluateAll(nodes=>nodes.map(node=>node.dataset.africaBasin).sort());assert.equal(new Set(basinIds).size,11);assert.equal(await page.locator('[data-africa-basin][fill^="url("]').count(),0,'basins have area fill rather than boundary hatching');
  await shapeClick(page,page.locator('[data-africa-basin=congo]'));assert.equal(state(page).river,'congo');assert.equal(await page.locator('[data-africa-basin]').count(),11);assert.equal(await page.locator('[data-africa-basin=congo]').getAttribute('aria-pressed'),'true');
  assert(await page.locator('[data-africa-river-feature=congo]').count()>0);profile.basin={ids:basinIds,labels:await labels(page,'[data-africa-basin-label]')};await layout(page,profile,'basins');await capture(page,profile,'basins');
  await page.locator('[data-africa-water=rain]').click();await settle(page);assert.equal(state(page).water,'rain');await page.locator('[data-africa-raster=water-rain]').waitFor();
  await page.locator('[data-africa-water=river]').click();await settle(page);await page.locator('[data-africa-natural-label]').first().waitFor();
  profile.rivers=await naturalNames(page,profile,'rivers',{terrain:12,river:11,sea:7,current:0,wind:0});
  if(thirdReview){const order=await page.locator('[data-africa-actual-layer]').evaluate(node=>{const children=[...node.children],lastBorder=Math.max(...children.map((n,i)=>n.hasAttribute('data-africa-country-border')?i:-1));return {borderCount:node.querySelectorAll('[data-africa-country-border]').length,labelsAboveBorders:[...node.querySelectorAll('[data-africa-natural-label]')].every(n=>children.indexOf(n)>lastBorder)};});assert.equal(order.borderCount,55);assert(order.labelsAboveBorders);profile.borderReading=order;}
  const riverLines=await page.locator('.africa-river-path').evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute('data-africa-river-feature'),stroke:n.getAttribute('stroke'),width:Number(n.getAttribute('stroke-width')),d:n.getAttribute('d')})));assert(riverLines.length>0);assert(riverLines.every(n=>n.width>=2.3&&n.d?.length>10),'visible river lines are emphasized');profile.rivers.lines=riverLines.map(({d,...line})=>line);
  await layout(page,profile,'rivers');await capture(page,profile,'rivers');
  await page.locator('[data-africa-topic=terrain]').click();await settle(page);await page.locator('[data-africa-raster=terrain]').waitFor();assert.equal(await page.locator('[data-africa-contour]').count(),0,'terrain contains no mass elevation contour lines');
  profile.terrain=await naturalNames(page,profile,'terrain',{terrain:12,river:11,sea:7,current:3,wind:3});assert.equal(await page.locator('[data-africa-terrain-range]').count(),12,'twelve original Natural Earth naming ranges');
  const directionIds=['canary','benguela','agulhas','harmattan','west-african-monsoon','southeast-trades'];profile.terrain.directions=[];for(const id of directionIds){const direction=page.locator(`[data-africa-natural-direction="${id}"]`);const box=await visible(direction,page.locator('.africa-map-frame'));const geometry=await direction.getAttribute('d');assert(geometry?.includes('L'),'flow direction has real line geometry');profile.terrain.directions.push({id,box,geometry});}
  for(const [id,season]of [['harmattan','北半球の冬・乾季'],['west-african-monsoon','北半球の夏・雨季']]){const text=page.locator(`[data-africa-natural-label="${id}"] tspan`);await visible(text,page.locator('.africa-map-frame'));assert.equal(await text.textContent(),season);}
  await layout(page,profile,'terrain');await capture(page,profile,'terrain');
  await page.locator('[data-africa-topic=elevation]').click();await settle(page);await page.locator('[data-africa-contour]').first().waitFor();const heights=await page.locator('[data-africa-contour]').evaluateAll(nodes=>[...new Set(nodes.map(n=>Number(n.dataset.africaContour)))].sort((a,b)=>a-b));assert(heights.length>3);assert(heights.every(v=>v%500===0),'500 m contours');profile.elevation=await naturalNames(page,profile,'elevation',{terrain:12,river:0,sea:0,current:0,wind:0});if(thirdReview)assert.equal(await page.locator('[data-africa-context-neighbour]').count(),6);const restrained=await page.locator('[data-africa-natural-label]').evaluateAll(nodes=>nodes.every(n=>Number(n.getAttribute('fill-opacity'))>0&&Number(n.getAttribute('fill-opacity'))<.8));assert(restrained,'elevation names remain faint but visible');
  const elevationText=await labels(page,'[data-africa-natural-label],[data-africa-contour-label]');
  profile.elevation.numericLabels=elevationText.filter(row=>!row.kind);assert(profile.elevation.numericLabels.length>0,'source-anchored elevation numbers remain visible');
  profile.elevation.textCollisions=importantNameCollisions(elevationText,'elevation terrain and numeric labels at '+profile.width);
  await layout(page,profile,'elevation');await capture(page,profile,'elevation');
  profile.checks.push('painted blue rain bands and 250 mm labeled contours; eleven filled connected-system basins retained after real map click; terrain excludes contours; terrain/rivers/sea names are constantly visible, currents and seasonal wind directions draw; elevation uses 500 m intervals with faint terrain names');

  await page.locator('[data-field=population]').click();await settle(page);await page.locator('[data-africa-raster=distribution]').waitFor();
  if(thirdReview){await visible(page.locator('[data-africa-population-city="ケープタウン"]'),page.locator('.africa-map-frame'));assert.equal(await page.locator('[data-africa-population-desert]').count(),3);assert.equal(await page.locator('[data-africa-population-locator]').count(),13);profile.populationFrame=await measure(page.locator('.africa-map-frame'));}
  const abuja=page.locator('[data-africa-population-city="アブジャ"]');profile.abuja=await visible(abuja,page.locator('.africa-map-frame'));assert((await page.locator('.africa-detail').innerText()).includes('アブジャ'));await layout(page,profile,'population');await capture(page,profile,'population');profile.checks.push('Abuja name is actually visible and has contextual population explanation');

  await page.locator('[data-africa-topic=religion]').click();await settle(page);await page.locator('[data-africa-religion-country]').first().waitFor();
  assert.equal(state(page).topic,'religion');const religionPaths=page.locator('[data-africa-religion-country]:not([data-africa-religion-mixed])');assert.equal(await religionPaths.count(),55);const religionCountries=await religionPaths.evaluateAll(nodes=>nodes.map(n=>({code:n.dataset.africaReligionCountry,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,fill:n.getAttribute('fill')})));assert.equal(new Set(religionCountries.map(n=>n.code)).size,55);assert(religionCountries.every(n=>n.width>0&&n.height>0),'religion country faces actually draw');
  const mixed=await page.locator('[data-africa-religion-mixed]').evaluateAll(nodes=>nodes.map(n=>({code:n.dataset.africaReligionMixed,fill:n.getAttribute('fill'),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));assert(mixed.length>0);assert(mixed.every(n=>n.fill==='url(#africa-religion-mixed)'&&n.width>0&&n.height>0));assert(await page.locator('#africa-religion-mixed path').count()>0,'mixed pattern has hatch geometry');
  await visible(page.locator('[data-theme-title]'),page.locator('.africa-detail'));await visible(page.locator('[data-theme-takeaway]'),page.locator('.africa-detail'));const religionSummary=await page.locator('[data-theme-takeaway]').innerText();assert(/イスラム教/.test(religionSummary)&&/キリスト教/.test(religionSummary));assert(/植民|中世以前/.test(await page.locator('[data-theme-takeaway-detail]').innerText()));
  profile.religion={countries:religionCountries,mixed,summary:religionSummary};if(thirdReview){const frame=await measure(page.locator('.africa-map-frame'));assert(Math.abs(frame.height-profile.populationFrame.height)<1&&Math.abs(frame.width-profile.populationFrame.width)<1,'religion map matches population frame');}await layout(page,profile,'religion');await capture(page,profile,'religion');
  await page.locator('[data-africa-topic=language]').click();await settle(page);await page.waitForFunction(()=>document.querySelectorAll('[data-africa-language-point]').length===2222);assert.equal(state(page).topic,'language');assert.equal(await page.locator('[data-africa-religion-country]').count(),0,'language has its own map rather than religious faces');
  const languagePoints=await page.locator('[data-africa-language-point]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.africaLanguagePoint,width:r.width,height:r.height,fill:n.getAttribute('fill'),r:Number(n.getAttribute('r'))};}));assert.equal(new Set(languagePoints.map(n=>n.id)).size,2222);assert(languagePoints.every(n=>n.width>0&&n.height>0&&n.r>0),'language records actually draw as points');assert(new Set(languagePoints.map(n=>n.fill)).size>=6,'broad language families have distinct visible colors');await visible(page.locator('[data-theme-title]'),page.locator('.africa-detail'));await visible(page.locator('[data-theme-takeaway]'),page.locator('.africa-detail'));const languageSummary=await page.locator('[data-theme-takeaway]').innerText();assert(/アフロ・アジア/.test(languageSummary)&&/大西洋・コンゴ/.test(languageSummary));assert(/民族/.test(await page.locator('[data-theme-takeaway-detail]').innerText()));profile.language={pointCount:languagePoints.length,uniqueRecords:new Set(languagePoints.map(n=>n.id)).size,familyColorCount:new Set(languagePoints.map(n=>n.fill)).size,minimumRenderedDiameter:Math.min(...languagePoints.map(n=>Math.min(n.width,n.height))),summary:languageSummary};if(thirdReview){const frame=await measure(page.locator('.africa-map-frame'));assert(Math.abs(frame.height-profile.populationFrame.height)<1&&Math.abs(frame.width-profile.populationFrame.width)<1,'language map matches population frame');assert((await page.locator('.africa-detail').innerText()).includes('語族・系統'));}await layout(page,profile,'language');await capture(page,profile,'language');
  if(remainingReview){
   const positions=()=>page.locator('[data-africa-language-point]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.africaLanguagePoint,n.getAttribute('cx'),n.getAttribute('cy'),n.getAttribute('r')]));
   assert.equal(await page.locator('.africa-map').getAttribute('role'),'group');assert((await page.locator('#africa-svg-desc').textContent()).includes('話者数や居住域ではありません'));
   const before=await positions(),camera=await page.locator('.africa-map').getAttribute('viewBox'),picker=page.locator('[data-africa-language-record]');assert.equal(await picker.locator('option').count(),2223);
   await picker.selectOption('zulu1248');await settle(page);assert.equal(state(page).layerClass,'language:zulu1248');assert.deepEqual(await positions(),before);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),camera);await visible(page.locator('[data-africa-language-selected-name=zulu1248]'),page.locator('.africa-map-frame'));
   assert((await page.locator('[data-africa-language-reading]').innerText()).includes('Zulu'));assert.equal(await page.locator('[data-africa-culture-evidence] tbody tr').count(),17);assert((await page.locator('[data-africa-culture-evidence]').innerText()).includes('1歳未満を除く'));await picker.scrollIntoViewIfNeeded();await capture(page,profile,'language-zulu-record');
   await picker.selectOption('');await settle(page);await page.goBack();await settle(page);assert.equal(state(page).layerClass,'language:zulu1248');await page.reload();await settle(page);assert.equal(state(page).layerClass,'language:zulu1248');assert.deepEqual(await positions(),before);
   const point=page.locator('[data-africa-language-point=zulu1248]');await point.click();await settle(page);assert.equal(state(page).layerClass,'language:zulu1248');await point.focus();await page.keyboard.press('Space');await settle(page);assert.equal(state(page).layerClass,'language:zulu1248');assert.equal(await page.locator('[data-africa-language-point]').count(),2222);profile.language.record={id:'zulu1248',camera,pointPositionsUnchanged:true,normalClick:true,keyboard:true,historyAndReload:true};
  }
  await page.locator('[data-africa-topic=religion]').click();await settle(page);assert.equal(state(page).topic,'religion');assert.equal(await religionPaths.count(),55);assert.equal(await page.locator('[data-africa-language-point]').count(),0);
  if(remainingReview){assert.equal(await page.locator('[data-africa-religion-evidence-group]').count(),8);assert.equal(await page.locator('[data-africa-culture-evidence] tbody tr').count(),16);assert.equal(await page.locator('[data-africa-religion-region]').count(),0);assert((await page.locator('[data-africa-culture-evidence]').innerText()).includes('30,753,327'));await page.locator('[data-africa-culture-evidence] h3').scrollIntoViewIfNeeded();await capture(page,profile,'ghana-denominations');profile.religion.sourceSupplement={year:2021,country:'GHA',groups:8,regions:16,counts:128,pewMapPreserved:true,newGeometry:false};}
  await page.locator('[data-africa-topic=ethnicity]').click();await settle(page);assert.equal(state(page).topic,'ethnicity');assert(/未取得|未配信|配布許諾/.test(await page.locator('.africa-detail').innerText()),'ethnicity remains an explicit guide/data blocker');assert.equal(await page.locator('[data-africa-language-point]').count(),0);assert.equal(await page.locator('[data-africa-religion-country]').count(),0);
  if(thirdReview){const frame=await measure(page.locator('.africa-map-frame'));assert(Math.abs(frame.height-profile.populationFrame.height)<1&&Math.abs(frame.width-profile.populationFrame.width)<1,'ethnicity map matches population frame');assert.equal(await page.locator('[data-africa-ethnicity-composition]').count(),16);assert.equal(await page.locator('[data-africa-ethnicity-composition-group]').count(),144);const sums=await page.locator('[data-africa-ethnicity-composition]').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('rect')].reduce((sum,r)=>sum+Number(r.getAttribute('width')),0)));assert(sums.every(sum=>Math.abs(sum-100)<1e-6));await layout(page,profile,'ghana-composition');await capture(page,profile,'ghana-composition');}
  profile.checks.push('55 actually drawn religious country faces and mixed hatching; separate religion/language tabs; 2222 distinct visible language record points, explanatory summaries and tab return; ethnicity guide remains an unresolved distribution blocker');

  if(!thirdReview){
   await page.locator('[data-field=industry]').click();await settle(page);profile.industry={sectors:[]};
   for(const sector of ['resources','manufacturing','services']){
    await page.locator(`[data-africa-industry-sector="${sector}"]`).click();await settle(page);const selector=page.locator('[data-africa-industry-commodity]'),initialCount=await page.locator('[data-theme-marks] [data-africa-industry-location]').count();
    const industries=await selector.locator('option').evaluateAll(nodes=>nodes.filter(n=>n.value).map(n=>({id:n.value,label:n.textContent.trim()})));assert(industries.length>=4);assert(initialCount>=4);const sectorResult={id:sector,industries,initialCount};profile.industry.sectors.push(sectorResult);
    for(const industry of industries){await selector.selectOption(industry.id);await settle(page);assert.equal(await page.locator('[data-theme-marks] [data-africa-industry-location]:visible').count(),initialCount);assert((await page.locator('.africa-detail').innerText()).includes(industry.label));}
   }
   await layout(page,profile,'industry');await capture(page,profile,'industry');await page.locator('[data-field=nature]').click();await settle(page);assert(!state(page).industryLocation&&!state(page).industrySector);
   profile.checks.push('three sectors and 27 sourced roles, selection retains other locations, nature return; dedicated industry review measures fixed layouts, only control and every source reading');
  }
  assert.deepEqual(profile.errors,[]);assert.deepEqual(profile.failedRequests,[]);assert.deepEqual(profile.externalRequests,[]);profile.status='passed';await context.close();await save();
 }
 report.status='passed-with-declared-data-blocker';report.completedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,head,profiles:report.profiles.map(p=>({width:p.width,status:p.status})),images:report.screenshots.length,remaining:report.remaining}));
} catch(error){report.status='failed';report.error=error.stack;report.completedAt=new Date().toISOString();if(currentPage&&!currentPage.isClosed()){report.failurePage={url:currentPage.url(),viewport:{width:currentProfile.width,height:currentProfile.height,dpr:1}};try{const file=`${currentProfile.width}-failure.jpg`;await currentPage.screenshot({path:path.join(representative,file),type:'jpeg',quality:66,animations:'disabled'});const bytes=await readFile(path.join(representative,file));report.screenshots.push({file,scene:'failure',bytes:bytes.length,sha256:sha(bytes),fullPage:false});}catch(captureError){report.failureCapture=captureError.message;}}try{await captureRemainingViews();}catch(captureError){report.failureRepresentativesError=captureError.message;}await save();throw error;}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
