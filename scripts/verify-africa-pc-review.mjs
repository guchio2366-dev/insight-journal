#!/usr/bin/env node
/**
 * Verify the production Africa atlas and its US reference in installed Chrome.
 * Run after npm run build: AFRICA_REVIEW_CHROME_PATH=/path/to/chrome node scripts/verify-africa-pc-review.mjs
 * No browser download, external page, mocked renderer, or TLS exception is used.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {constants} from 'node:fs';
import {access,mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {themes} from '../src/data/atlas/africa-themes.ts';
import {africaRivers,africaRiverSelectedColor} from '../src/data/atlas/africa-river-reading.ts';
import {africaLayerPath} from '../src/scripts/atlas-africa-layers.ts';
import {densityColors} from '../src/data/atlas/population.ts';
import {ethnicityColors} from '../src/lib/atlas-population-dominant.ts';
import {religionDominantColors} from '../src/lib/atlas-population-religion.ts';

const repo=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(repo,'dist');
const output=path.resolve(process.env.AFRICA_REVIEW_OUTPUT||path.join(repo,'review-artifacts/africa-pc-review'));
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const profiles=[{id:'desktop1440',width:1440,height:1000},{id:'notebook1024',width:1024,height:768}];
const riverRoute='/atlas/africa/?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC&zoom=all&region=all&place=EGY&compare=COD&year=2021';
const populationRoute='/atlas/africa/?field=population&topic=distribution&zoom=all';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.gz':'application/gzip'};
const report={status:'running',scope:'Local production dist in a real PC browser. Public deployment and mobile are not verified.',startedAt:new Date().toISOString(),comparisonTolerancePx:2,profiles,cases:[],screenshots:[],exclusions:[{scene:'US elevation',status:'not-verified',reason:'Previous normal contour rendering timed out and displayed fallback. This script excludes that scene; it is not counted as a successful comparison.'}]};
let browser,server,origin,fatalNetwork;
const native=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/africa-water-v1/rivers.geojson'),'utf8'));
const nativePaths=Object.fromEntries(native.features.map(feature=>[feature.properties.id,africaLayerPath(feature.geometry)]));
const save=()=>writeFile(path.join(output,'metadata.json'),JSON.stringify(report,null,2)+'\n');

async function serveBuild(){
 const root=await realpath(dist);
 const server=createServer(async(req,res)=>{
  try{
   assert(['GET','HEAD'].includes(req.method));
   let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   assert(!basePath||pathname===basePath||pathname.startsWith(basePath+'/'));
   pathname=pathname.slice(basePath.length);let target=path.resolve(root,'.'+(pathname||'/'));
   assert(target===root||target.startsWith(root+path.sep));
   if((await stat(target)).isDirectory())target=path.join(target,'index.html');
   target=await realpath(target);assert(target.startsWith(root+path.sep));assert((await stat(target)).isFile());
   const body=await readFile(target);res.writeHead(200,{'Content-Type':mime[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}

// Read captured canvas pixels rather than treating a ready attribute as proof.
function pixels(png){
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let width,height,channels;const chunks=[];
 for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+size);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert([2,6].includes(data[9]));assert.equal(data[12],0);channels=data[9]===6?4:3;}if(type==='IDAT')chunks.push(data);offset+=size+12;}
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,decoded=Buffer.alloc(stride*height);assert.equal(raw.length,(stride+1)*height);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert(filter<=4);for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=channels?decoded[i-channels]:0,b=y?decoded[i-stride]:0,c=y&&x>=channels?decoded[i-stride-channels]:0;decoded[i]=(raw[y*(stride+1)+x+1]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
 return {width,height,channels,decoded};
}
function pixelEvidence(png,palette=[]){
 const image=pixels(png),colors=new Map(),matches=palette.map(()=>0),rgb=palette.map(hex=>hex.match(/[\da-f]{2}/gi).map(value=>parseInt(value,16)));let samples=0;
 for(let y=0;y<image.height;y+=2)for(let x=0;x<image.width;x+=2){const i=(y*image.width+x)*image.channels;if(image.channels===4&&image.decoded[i+3]<128)continue;const value=[image.decoded[i],image.decoded[i+1],image.decoded[i+2]],key=value.map(v=>v>>4).join(',');colors.set(key,(colors.get(key)??0)+1);samples++;rgb.forEach((color,index)=>{if(value.every((v,c)=>Math.abs(v-color[c])<=16))matches[index]++;});}
 return {width:image.width,height:image.height,opaqueSamples:samples,colorBuckets:colors.size,dominantRatio:samples?Math.max(...colors.values())/samples:1,paletteMatches:matches};
}
function assertPaint(evidence){assert(evidence.opaqueSamples>1000,'Canvas has insufficient opaque pixels');assert(evidence.colorBuckets>=16&&evidence.dominantRatio<.98,'Canvas is blank or nearly uniform');}
function networkGuard(record){
 assert(!fatalNetwork,fatalNetwork);
 assert.deepEqual(record.pageErrors,[],'Browser runtime errors');
 assert.deepEqual(record.console.filter(message=>message.type==='error'),[],'Browser console errors');
 assert.deepEqual(record.externalRequests,[],'External HTTP(S) dependency is forbidden');
 assert.deepEqual(record.failedRequests,[],'Failed local page/data requests');
}
async function settle(page){await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
async function open(page,route){assert(!fatalNetwork,fatalNetwork);const response=await page.goto(origin+basePath+route,{waitUntil:'domcontentloaded'});assert.equal(response?.status(),200);await page.evaluate(()=>document.fonts.ready);}
const state=page=>page.evaluate(()=>Object.fromEntries(new URL(location.href).searchParams));

async function measure(page,region){
 await page.evaluate(()=>window.scrollTo(0,0));
 return page.evaluate(region=>{
  const box=selector=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect(),style=getComputedStyle(node);return {x:r.x,y:r.y,width:r.width,height:r.height,font:style.fontSize,lineHeight:style.lineHeight,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflowY:style.overflowY,text:node.innerText};};
  const africa=region==='africa',nav=africa?'.africa-main>.africa-subfields':'.population-tabs',status=africa?'[data-africa-subfield-status]':'[data-pop-status]';
  const controls=africa?[...document.querySelectorAll('.africa-region-controls select')].map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}):[];
  return {map:box(africa?'.africa-map-frame':'.atlas-map-frame'),southAfrica:africa?box('[data-country-path=ZAF]'):null,nav:box(nav),status:box(status),statusCount:document.querySelectorAll(status).length,statusAfterNav:africa?document.querySelector(nav)?.nextElementSibling===document.querySelector(status):null,buttons:[...document.querySelectorAll(nav+' button')].map(node=>({text:node.textContent,height:node.getBoundingClientRect().height,font:getComputedStyle(node).fontSize})),controls,documentWidth:document.documentElement.scrollWidth,viewport:{width:innerWidth,height:innerHeight},rootDataset:{...document.querySelector(africa?'[data-africa-atlas]':'[data-atlas-explorer]').dataset}};
 },region);
}
function assertLayout(measurement,reference){
 assert(measurement.documentWidth<=measurement.viewport.width+1,'Horizontal page overflow');
 if(measurement.southAfrica){const south=measurement.southAfrica,map=measurement.map;assert(south.y>=map.y-1&&south.y+south.height<=map.y+map.height+1,'Southern Africa lies outside the map frame');}
 for(const control of measurement.controls){assert(control.x>=0&&control.x+control.width<=measurement.viewport.width+1,'Header select lies outside viewport');for(const other of measurement.controls)if(other!==control){const area=Math.max(0,Math.min(control.x+control.width,other.x+other.width)-Math.max(control.x,other.x))*Math.max(0,Math.min(control.y+control.height,other.y+other.height)-Math.max(control.y,other.y));assert.equal(area,0,'Header selects overlap');}}
 if(reference){measurement.usDifference=Object.fromEntries(['x','y','width','height'].map(key=>[key,measurement.map[key]-reference.map[key]]));for(const [key,value]of Object.entries(measurement.usDifference))assert(Math.abs(value)<=2,`US/Africa map ${key} differs by ${value}px (limit 2px)`);}
}
async function screenshot(page,record,name){
 await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('.africa-detail')?.scrollTo(0,0);});
 const file=`${record.profile}-${name}.png`,png=await page.screenshot({animations:'disabled',fullPage:false});await writeFile(path.join(output,file),png);
 const evidence={file,sha256:hash(png),url:page.url(),capturedAt:new Date().toISOString()};record.screenshots.push(evidence);report.screenshots.push(evidence);return evidence;
}
async function runCase(profile,name,run){
 const record={profile:profile.id,name,status:'running',startedAt:new Date().toISOString(),checks:[],measurements:[],screenshots:[],pageErrors:[],console:[],failedRequests:[],externalRequests:[],loadedAssets:[]};report.cases.push(record);await save();
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,locale:'ja-JP',timezoneId:'UTC',reducedMotion:'reduce',colorScheme:'light',serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(30000);
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==origin){record.externalRequests.push(url.href);fatalNetwork=`External dependency requested: ${url.href}`;return route.abort('blockedbyclient');}return route.continue();});
 page.on('pageerror',error=>record.pageErrors.push(error.message));page.on('console',message=>{if(['error','warning'].includes(message.type()))record.console.push({type:message.type(),text:message.text()});});
 page.on('response',response=>{if(response.status()>=400)record.failedRequests.push({url:response.url(),status:response.status()});else if(/\.(json|geojson|png|webp|gz)(?:\?|$)/.test(response.url()))record.loadedAssets.push(response.url());});
 page.on('requestfailed',request=>{const error=request.failure()?.errorText??'';if(/CERT_|SSL_|TLS|certificate/i.test(error))fatalNetwork=`TLS failure at ${request.url()}: ${error}`;if(error!=='net::ERR_ABORTED')record.failedRequests.push({url:request.url(),error});});
 try{await run(page,record,context);await settle(page);networkGuard(record);record.status='passed';}
 catch(error){record.status='failed';record.failure=error.stack??String(error);record.rendering=await page.evaluate(()=>({us:document.querySelector('[data-atlas-explorer]')?.dataset.renderState,fallbackVisible:document.querySelector('[data-fallback]')?.hidden===false,africa:document.querySelector('[data-africa-atlas]')?.dataset.layerMode})).catch(()=>null);await screenshot(page,record,`${name}-failure`).catch(captureError=>{record.captureFailure=String(captureError);});}
 finally{record.url=page.url();record.finishedAt=new Date().toISOString();await context.close();await save();}
 console.log(`${record.status.toUpperCase()}: ${profile.id} ${name}`);if(fatalNetwork)throw new Error(fatalNetwork);return record;
}

async function waitAfrica(page,key){
 await page.waitForFunction(key=>{const root=document.querySelector('[data-africa-atlas]');return root?.dataset.actualLayer==='true'&&(key==='river'?document.querySelectorAll('[data-africa-layer-feature]').length===90:!!document.querySelector(`[data-africa-raster="${key}"]`))&&[...document.querySelectorAll('[data-africa-commodity-layer]')].every(node=>node.style.display==='none'||node.querySelector('image'));},key);
 await settle(page);
 if(key!=='river')await page.locator(`[data-africa-raster="${key}"]`).evaluateAll(async nodes=>{await Promise.all(nodes.map(async node=>{const image=new Image();image.src=node.getAttribute('href');await image.decode();if(!image.naturalWidth)throw new Error('Native raster did not decode');}));});
}
async function assertRiver(page,id){
 const river=africaRivers.find(row=>row.id===id);await page.waitForFunction(id=>new URL(location.href).searchParams.get('river')===id,id);
 assert.equal(await page.locator('[data-theme-title]').textContent(),river.label);assert.equal(await page.locator('[data-theme-takeaway-detail]').textContent(),river.reading.text);assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),river.reading.source);assert.equal(await page.locator('[data-theme-source]').textContent(),river.reading.sourceLabel);
 const view=await page.locator('[data-africa-actual-layer]').evaluate(node=>({paths:[...node.querySelectorAll('[data-africa-layer-feature]')].map(path=>({id:path.dataset.africaLayerFeature,d:path.getAttribute('d'),selected:path.classList.contains('is-selected'),stroke:path.getAttribute('stroke'),width:path.getAttribute('stroke-width'),display:getComputedStyle(path).display})),hits:[...node.querySelectorAll('[data-africa-river][aria-pressed=true]')].map(path=>path.dataset.africaRiverHitFeature)}));
 assert.equal(view.paths.length,90);assert.equal(new Set(view.paths.map(row=>row.id)).size,90);
 for(const line of view.paths){assert.equal(line.d,nativePaths[line.id]);assert.notEqual(line.display,'none');if(line.selected){assert.equal(line.stroke,africaRiverSelectedColor);assert.equal(line.width,'3.2');}}
 assert.deepEqual(view.paths.filter(row=>row.selected).map(row=>row.id).sort(),[...river.featureIds].sort());assert.deepEqual(view.hits.sort(),[...river.featureIds].sort());assert.equal(await page.locator(`[data-africa-river-choice="${id}"]`).getAttribute('aria-pressed'),'true');assert.match(await page.locator('[data-africa-layer-legend]').textContent(),new RegExp(river.label));assert.equal((await state(page)).layerPoint,undefined);
 return {id,label:river.label,featureIds:river.featureIds,totalFeatures:view.paths.length,source:river.reading.source};
}
async function clickLine(page,id){
 await page.locator('.africa-map-frame').scrollIntoViewIfNeeded();
 const point=await page.locator(`[data-africa-river="${id}"]`).evaluateAll(nodes=>{for(const node of nodes){const matrix=node.getScreenCTM(),length=node.getTotalLength();if(!matrix)continue;for(let i=1;i<100;i++){const p=node.getPointAtLength(length*i/100),s=new DOMPoint(p.x,p.y).matrixTransform(matrix);if(s.x>1&&s.x<innerWidth-1&&s.y>1&&s.y<innerHeight-1&&document.elementFromPoint(s.x,s.y)===node)return{x:s.x,y:s.y,feature:node.dataset.africaRiverHitFeature};}}return null;});
 assert(point,`No hittable native ${id} line`);await page.mouse.click(point.x,point.y);await assertRiver(page,id);return point;
}

async function stableUS(page,record,topic){
 const population=['distribution','ethnicity','religion'].includes(topic),nature=['water','climate'].includes(topic);
 await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('[data-atlas-explorer]')?.dataset.renderState),null,{timeout:45000});
 if(nature)await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('[data-atlas-explorer]')?.dataset.natureLoad),null,{timeout:45000});
 assert.equal(await page.locator('[data-atlas-explorer]').getAttribute('data-render-state'),'ready','Fallback is not a successful US comparison');
 if(nature)assert.equal(await page.locator('[data-atlas-explorer]').getAttribute('data-nature-load'),'ready');
 assert.equal(await page.locator('[data-fallback]').isVisible(),false);
 if(population)await page.waitForFunction(()=>/^[\d,]+ 郡のデータ/.test(document.querySelector('[data-pop-status]')?.textContent??''));
 await settle(page);
 const palette=topic==='distribution'?densityColors:topic==='ethnicity'?ethnicityColors.slice(1):topic==='religion'?Object.entries(religionDominantColors).filter(([id])=>id!=='unreported').map(([,color])=>color):[];
 const graphics=await page.locator('canvas.maplibregl-canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2')??canvas.getContext('webgl');return {width:canvas.width,height:canvas.height,context:!!gl,contextLost:gl?.isContextLost()??true};});
 assert(graphics.context&&!graphics.contextLost&&graphics.width>0&&graphics.height>0,'US WebGL context is missing or lost');
 const samples=[];let previous='',same=0,finalEvidence;
 // The controller can become ready before the population worker draws. Require
 // three stable captures AND nonempty canvas pixels; density also needs its palette.
 const deadline=Date.now()+45000;
 while(Date.now()<deadline){
  assert(!fatalNetwork,fatalNetwork);const png=await page.locator('canvas.maplibregl-canvas').screenshot({animations:'disabled'}),digest=hash(png),evidence=pixelEvidence(png,palette);
  const painted=evidence.opaqueSamples>1000&&evidence.colorBuckets>=16&&evidence.dominantRatio<.98;
  const classifiedPaint=topic==='distribution'?evidence.paletteMatches.filter(count=>count>=30).length>=4&&evidence.paletteMatches.slice(4).reduce((a,b)=>a+b,0)>100:population?evidence.paletteMatches.filter(count=>count>=30).length>=3:true;
  same=digest===previous&&painted&&classifiedPaint?same+1:0;previous=digest;samples.push({sha256:digest,elapsedMs:45000-(deadline-Date.now()),...evidence});
  if(same>=2){finalEvidence=evidence;break;}await page.waitForTimeout(1000);
 }
 assert(finalEvidence,'US canvas did not become stably painted; ready alone is insufficient');assertPaint(finalEvidence);
 const topicAssets=record.loadedAssets.filter(url=>population?url.includes('/population/v1/'):nature?url.includes('/nature-v1/'):url.includes('/atlas/'));
 if(population){
  assert(topicAssets.some(url=>topic==='religion'?/religion-counties-2020\.geo/.test(url):/counties\.geo/.test(url)),'Actual US county geometry was not fetched');
  const dataset=topic==='distribution'?'/counties.json':topic==='ethnicity'?'/ethnicity.json':'/religion-dominant.json';
  assert(topicAssets.some(url=>url.includes(dataset)),`US ${topic} dataset was not fetched`);
 }
 record.checks.push({check:'US actual canvas rendering',topic,renderState:'ready',fallback:false,graphics,palette,samples,assets:topicAssets});
 return samples.at(-1).sha256;
}

async function riverOperations(page,record,reference){
 await open(page,riverRoute);await waitAfrica(page,'river');
 for(const id of ['nile','congo']){await page.locator(`[data-africa-river-choice=${id}]`).click();record.checks.push({check:'river name selection',...await assertRiver(page,id)});}
 record.checks.push({check:'native pointer selection',id:'nile',point:await clickLine(page,'nile')});
 const measurement=await measure(page,'africa');assertLayout(measurement,reference);record.measurements.push({scene:'water',...measurement});await screenshot(page,record,'africa-nile');
 record.checks.push({check:'native pointer selection',id:'congo',point:await clickLine(page,'congo')});
 await page.goBack();await assertRiver(page,'nile');await page.goForward();await assertRiver(page,'congo');await page.reload();await waitAfrica(page,'river');await assertRiver(page,'congo');record.checks.push({check:'river reload/back/forward',status:'passed'});
 await page.locator('[data-place]').selectOption('COD');await page.locator('[data-compare]').selectOption('EGY');const original=await state(page);
 await page.locator('[data-theme-comparison]').click();await assertRiver(page,'congo');assert.equal((await state(page)).context,'ER.H2O.INTR.PC');assert.equal(await page.locator('[data-africa-comparison-country]').count(),2);
 if(record.profile==='desktop1440')await screenshot(page,record,'africa-congo-comparison');
 await page.locator('[data-place]').selectOption('NGA');await page.locator('[data-year]').selectOption('2020');await page.reload();await waitAfrica(page,'river');await page.locator('[data-theme-return]').click();await assertRiver(page,'congo');assert.deepEqual(await state(page),original);record.checks.push({check:'freshwater comparison/reload/return restores complete source state',status:'passed'});
 const selector='[data-africa-river-hit-feature="ne50-river-0298"]';await page.locator(selector).focus();await page.keyboard.press('Enter');await assertRiver(page,'nile');
 const focus=await page.locator(selector).evaluate(node=>({focused:document.activeElement===node,visible:node.matches(':focus-visible'),outline:getComputedStyle(node).outlineStyle}));assert.deepEqual(focus,{focused:true,visible:true,outline:'none'});record.checks.push({check:'keyboard line selection has no rectangular focus outline',...focus});
 await page.locator('[data-africa-river-hit-feature="ne50-river-0157"]').focus();await page.keyboard.press('Space');await assertRiver(page,'congo');record.checks.push({check:'Space activates a native Congo line',status:'passed'});
 await checkTabs(page,'water',[['river','ArrowRight','rain'],['rain','End','basin'],['basin','Home','river']]);
 await waitAfrica(page,'river');record.checks.push({check:'water Arrow/Home/End retains roving keyboard focus',status:'passed'});
 await page.locator('[data-reset]').click();await waitAfrica(page,'climate');assert.equal((await state(page)).river,undefined);assert.equal(await page.locator('[data-africa-river]').count(),0);record.checks.push({check:'reset clears river and restores climate',status:'passed'});
}

async function checkTabs(page,kind,steps){
 for(const [from,key,to]of steps){
  await page.locator(`[data-africa-${kind}="${from}"]`).focus();await page.keyboard.press(key);
  const focus=await page.evaluate(({kind,to})=>{const node=document.querySelector(`[data-africa-${kind}="${to}"]`);return {focused:document.activeElement===node,visible:node.matches(':focus-visible'),selected:node.getAttribute('aria-selected'),tabIndex:node.tabIndex,stops:document.querySelectorAll(`[data-africa-${kind}][tabindex="0"]`).length};},{kind,to});
  assert.deepEqual(focus,{focused:true,visible:true,selected:'true',tabIndex:0,stops:1});
 }
}

async function climateOperations(page,record,reference){
 assert(reference,'US climate reference was not successfully rendered');
 await open(page,'/atlas/africa/?field=nature&topic=climate&zoom=all');await waitAfrica(page,'climate');
 const image=await page.locator('[data-africa-raster]').getAttribute('href'),count=await page.locator('[data-africa-layer-class]').count();assert(count>1);
 await page.locator('[data-africa-layer-class="1"]').click();await page.locator('[data-africa-class-outline="1"]').waitFor();assert.equal(await page.locator('[data-africa-layer-class="1"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-africa-raster]').getAttribute('href'),image);assert.equal(await page.locator('[data-africa-layer-class]').count(),count);
 const outline=await page.locator('[data-africa-class-outline]').evaluate(node=>({rectangles:node.querySelectorAll('rect').length,paths:[...node.querySelectorAll('path')].map(path=>({stroke:path.getAttribute('stroke'),fill:path.getAttribute('fill'),length:path.getAttribute('d')?.length??0}))}));
 assert.equal(outline.rectangles,0);assert.deepEqual(outline.paths.map(row=>row.stroke),['#ffffff','#183c4a']);assert(outline.paths.every(row=>row.fill==='none'&&row.length>50));
 const measurement=await measure(page,'africa');assertLayout(measurement,reference);record.measurements.push({scene:'climate',...measurement});record.checks.push({check:'climate selection keeps full native raster/legend and native grid outline',status:'passed',legendClasses:count,image,outline});
 if(record.profile==='desktop1440')await screenshot(page,record,'africa-climate-outline');
 await page.reload();await waitAfrica(page,'climate');await page.locator('[data-africa-class-outline="1"]').waitFor();assert.equal(await page.locator('[data-africa-raster]').getAttribute('href'),image);
 await page.locator('[data-africa-layer-class="1"]').click();assert.equal(await page.locator('[data-africa-class-outline]').count(),0);
 await checkTabs(page,'topic',[['climate','ArrowRight','water'],['water','End','elevation'],['elevation','Home','climate'],['climate','ArrowLeft','elevation'],['elevation','Home','climate']]);await waitAfrica(page,'climate');record.checks.push({check:'nature tabs Arrow/Home/End and climate outline reload/toggle',status:'passed'});
}

async function agricultureOperations(page,record,reference){
 assert(reference,'US agriculture reference was not successfully rendered');
 await open(page,'/atlas/africa/?field=agriculture&zoom=all');await waitAfrica(page,'crop-maize-harvested');
 const products=()=>page.locator('[data-africa-commodity-layer]').evaluateAll(nodes=>nodes.map(node=>({key:node.dataset.africaCommodityLayer,opacity:getComputedStyle(node).opacity,display:getComputedStyle(node).display,image:!!node.querySelector('image')})));
 assert.equal(await page.locator('[data-place]').inputValue(),'');assert.equal(await page.locator('[data-country-path] title').count(),0);assert.equal(await page.locator('[data-country-statistics]').isVisible(),false);assert.equal(await page.locator('[data-africa-overview-layer]').count(),7);assert.equal(await page.locator('[data-africa-crop-measure]').count(),0);
 const initial=await products();assert.equal(initial.length,7);assert(initial.every(row=>row.display!=='none'&&row.image));assert.match(await page.locator('[data-unit]').textContent(),/数量は合算しません/);record.checks.push({check:'initial seven native product distributions, no selected country or country popup',products:initial,status:'passed'});
 const measurement=await measure(page,'africa');assertLayout(measurement,reference);record.measurements.push({scene:'agriculture',...measurement});
 await screenshot(page,record,'africa-agriculture');
 await page.locator('[data-africa-commodity=rice]').click();await waitAfrica(page,'crop-rice-harvested');assert.equal(await page.locator('[data-africa-commodity=rice]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-africa-agri-footprint="crop-rice-harvested"]').waitFor();const selected=await products();assert.equal(selected.length,7);assert(selected.every(row=>row.display!=='none'&&row.image));assert(selected.filter(row=>row.key.startsWith('livestock-')).every(row=>row.opacity==='0.2'));assert.equal(selected.find(row=>row.key==='crop-rice-harvested').opacity,'1');assert.equal(await page.locator('[data-africa-layer-class]').count(),6);assert.match(await page.locator('[data-unit]').textContent(),/ha/);record.checks.push({check:'rice quantity retains six other distributions with translucent livestock and native positive footprint',products:selected,status:'passed'});await screenshot(page,record,'africa-agriculture-rice');
 await page.goBack();await waitAfrica(page,'crop-maize-harvested');assert.equal(await page.locator('[data-africa-overview-layer]').count(),7);await page.goForward();await waitAfrica(page,'crop-rice-harvested');await page.reload();await waitAfrica(page,'crop-rice-harvested');assert.equal(await page.locator('[data-africa-commodity=rice]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-africa-crop-measure=production]').click();await waitAfrica(page,'crop-rice-production');assert.match(await page.locator('[data-unit]').textContent(),/t/);assert.equal((await products()).length,7);
 await page.locator('[data-place]').selectOption('KEN');await page.locator('[data-compare]').selectOption('ETH');const original=await state(page);await page.locator('[data-theme-comparison]').click();await page.locator('[data-place]').selectOption('TZA');await page.reload();await waitAfrica(page,'crop-rice-production');await page.locator('[data-theme-return]').click();assert.deepEqual(await state(page),original);record.checks.push({check:'agriculture history/reload/quantity/comparison return restores complete source state',status:'passed'});
 await page.locator('[data-africa-agri-overview]').click();await waitAfrica(page,'crop-rice-harvested');assert.equal(await page.locator('[data-africa-overview-layer]').count(),7);assert.equal(await page.locator('[data-africa-crop-measure]').count(),0);assert.equal((await products()).length,7);await page.locator('[data-reset]').click();await waitAfrica(page,'climate');assert.equal(await page.locator('[data-place]').inputValue(),'');record.checks.push({check:'agriculture overview/reset restores all seven products and then unselected climate',status:'passed'});
}

async function industryOperations(page,record,reference){
 assert(reference,'US industry reference was not successfully rendered');await open(page,'/atlas/africa/?field=industry');await settle(page);
 assert.equal(await page.locator('[data-place]').inputValue(),'');assert.equal(await page.locator('[data-africa-industry-overview]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-africa-industry-theme]').count(),2);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),'0 0 1100 907');assert.equal(await page.locator('[data-country-statistics]').isVisible(),false);
 const measurement=await measure(page,'africa');record.measurements.push({scene:'industry',...measurement});assertLayout(measurement,reference);await screenshot(page,record,'africa-industry');
 await page.locator('[data-africa-industry-theme="copperbelt-connections"] circle').click();assert.equal((await state(page)).theme,'copperbelt-connections');assert.equal(await page.locator('[data-place]').inputValue(),'');assert.equal(await page.locator('[data-theme-takeaway-detail]').textContent(),themes.find(theme=>theme.id==='copperbelt-connections').takeaway);await page.locator('[data-africa-industry-overview]').click();record.checks.push({check:'native industry point opens its existing sourced case without choosing a country',status:'passed'});
 const native=page.locator('[data-africa-industry-theme="casablanca-manufacturing"]');await native.focus();assert.equal(await native.evaluate(node=>getComputedStyle(node).outlineStyle),'none');await page.keyboard.press('Enter');assert.equal((await state(page)).theme,'casablanca-manufacturing');assert.equal((await state(page)).overview,'0');assert.equal(await page.locator('[data-place]').inputValue(),'');assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),'0 0 1100 907');assert.match(await page.locator('[data-theme-title]').textContent(),/カサブランカ/);const casablanca=themes.find(theme=>theme.id==='casablanca-manufacturing');assert.equal(await page.locator('[data-theme-takeaway-detail]').textContent(),casablanca.takeaway);assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),casablanca.source);
 await page.goBack();assert.equal(await page.locator('[data-africa-industry-overview]').getAttribute('aria-pressed'),'true');await page.goForward();await page.reload();assert.equal(await page.locator('button[data-theme="casablanca-manufacturing"]').getAttribute('aria-pressed'),'true');await page.locator('[data-africa-industry-overview]').click();assert.equal(await page.locator('[data-africa-industry-theme]').count(),2);await page.locator('[data-reset]').click();await waitAfrica(page,'climate');assert.equal(await page.locator('[data-place]').inputValue(),'');record.checks.push({check:'industry full-region entry, two existing cases, keyboard selection/history/reload/overview/reset without an automatic country',status:'passed'});
}

async function delayedAgriculture(page,record){
 for(const reset of [false,true]){
  let release,entered;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{entered=resolve;});
  await page.route('**/africa-crops-v1/manifest.json',async route=>{entered();await gate;await route.continue();});
  try{
   await open(page,'/atlas/africa/?field=agriculture');await Promise.race([requested,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Delayed crop request never arrived')),30000);requested.finally(()=>clearTimeout(timer));})]);await page.locator('[data-africa-commodity=rice]').click();await page.locator('[data-africa-commodity=wheat]').click();
   if(reset)await page.locator('[data-reset]').click();const completed=page.waitForResponse(response=>response.url().endsWith('/africa-crops-v1/manifest.json'));release();await completed;
   if(reset){await waitAfrica(page,'climate');assert.equal(await page.locator('[data-africa-commodity-layer]').count(),0);assert.equal((await state(page)).field,'nature');}else{await waitAfrica(page,'crop-wheat-harvested');assert.equal(await page.locator('[data-africa-commodity=wheat]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-africa-commodity-layer]').count(),7);assert.equal((await state(page)).overview,'0');}
   record.checks.push({check:reset?'delayed agriculture cannot undo reset':'delayed agriculture follows newest product while retaining all seven distributions',status:'passed'});
  }finally{release();await page.unroute('**/africa-crops-v1/manifest.json');}
 }
}

async function populationOperations(page,record,references){
 await open(page,populationRoute);
 for(const topic of ['distribution','ethnicity','religion']){
  await page.locator(`[data-africa-topic=${topic}]`).click();await page.waitForFunction(topic=>document.querySelector('[data-africa-atlas]')?.dataset.layerMode===(topic==='distribution'?'distribution':'guide'),topic);await settle(page);
  const measurement=await measure(page,'africa');assertLayout(measurement,references[topic]);assert.equal(measurement.statusCount,1);assert.equal(measurement.statusAfterNav,true);assert.equal(measurement.status.height,21);assert.equal(measurement.status.font,'14px');assert(measurement.buttons.every(button=>button.height===46&&button.font==='16px'));
  if(topic==='distribution'){await waitAfrica(page,'distribution');assert.match(measurement.status.text,/国の平均とは異なります/);assert.equal(await page.locator('[data-africa-layer-class]').count(),7);await screenshot(page,record,'africa-population');}
  else{assert.match(measurement.status.text,/この画面に分布図はありません/);assert.equal(await page.locator('[data-africa-raster]').count(),0);assert.equal(await page.locator('[data-theme-comparison]').isVisible(),false);}
  record.measurements.push({topic,...measurement});
 }
 for(const [from,key,to]of [['religion','Home','distribution'],['distribution','ArrowRight','ethnicity'],['ethnicity','End','religion'],['religion','ArrowLeft','ethnicity'],['ethnicity','Home','distribution']]){
  await page.locator(`[data-africa-topic=${from}]`).focus();await page.keyboard.press(key);
  const focus=await page.evaluate(to=>{const node=document.querySelector(`[data-africa-topic=${to}]`);return {focused:document.activeElement===node,selected:node.getAttribute('aria-selected'),tabIndex:node.tabIndex,stops:document.querySelectorAll('[data-africa-topic][tabindex="0"]').length};},to);assert.deepEqual(focus,{focused:true,selected:'true',tabIndex:0,stops:1});
 }record.checks.push({check:'population Arrow/Home/End and roving focus',status:'passed'});
 await waitAfrica(page,'distribution');const image=await page.locator('[data-africa-raster]').getAttribute('href');
 for(let i=0;i<7;i++){
  await page.locator(`[data-africa-layer-class="density-${i}"]`).click();await page.locator(`[data-africa-class-outline="density-${i}"]`).waitFor();
  assert.equal(await page.locator('[data-africa-raster]').getAttribute('href'),image);assert.equal(await page.locator('[data-africa-layer-class]').count(),7);
  const shape=await page.locator('[data-africa-class-outline]').evaluate(node=>({rectangles:node.querySelectorAll('rect').length,strokes:[...node.querySelectorAll('path')].map(path=>path.getAttribute('stroke'))}));assert.deepEqual(shape,{rectangles:0,strokes:['#ffffff','#183c4a']});
 }record.checks.push({check:'all seven density classes preserve original raster and use native-grid outlines',status:'passed',originalRaster:image});
 await page.locator('[data-place]').selectOption('COD');await page.locator('[data-compare]').selectOption('EGY');const original=await state(page);await page.locator('[data-theme-comparison]').click();await page.locator('[data-year]').selectOption('2020');await page.reload();await waitAfrica(page,'distribution');await page.locator('[data-theme-return]').click();assert.deepEqual(await state(page),original);assert.equal(await page.locator('[data-africa-raster]').getAttribute('href'),image);record.checks.push({check:'population comparison/reload/return',status:'passed'});
 for(const field of ['nature','agriculture']){
  await page.locator(`[data-field=${field}]`).click();await page.locator('[data-africa-subfield-status]').waitFor({state:'hidden'});
  await page.locator('[data-field=population]').click();await waitAfrica(page,'distribution');const measurement=await measure(page,'africa');assert.equal(measurement.statusCount,1);assert.equal(measurement.statusAfterNav,true);assert.equal(measurement.status.height,21);assertLayout(measurement,references.distribution);record.measurements.push({scene:`population-return-from-${field}`,...measurement});
 }record.checks.push({check:'population status returns immediately after tabs after nature/agriculture round trips',status:'passed'});
}

async function delayedRiver(page,record){
 for(const reset of [false,true]){
  let release,entered;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{entered=resolve;});
  await page.route('**/africa-water-v1/rivers.geojson',async route=>{entered();await gate;await route.continue();});
  try{
   await open(page,riverRoute);await Promise.race([requested,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Delayed river request never arrived')),30000);requested.finally(()=>clearTimeout(timer));})]);await page.locator('[data-africa-river-choice=nile]').click();await page.locator('[data-africa-river-choice=congo]').click();assert.equal((await state(page)).river,'congo');assert.equal(await page.locator('[data-africa-layer-feature]').count(),0);
   if(reset)await page.locator('[data-reset]').click();
   const completed=page.waitForResponse(response=>response.url().endsWith('/africa-water-v1/rivers.geojson'));release();await completed;
   if(reset){await waitAfrica(page,'climate');assert.equal((await state(page)).river,undefined);assert.equal(await page.locator('[data-africa-river]').count(),0);}else{await waitAfrica(page,'river');await assertRiver(page,'congo');}
   record.checks.push({check:reset?'delayed river cannot undo reset':'delayed river follows newest selection',status:'passed'});
  }finally{release();await page.unroute('**/africa-water-v1/rivers.geojson');}
 }
}

async function main(){
 await mkdir(output,{recursive:true});await save();
 try{
  const actualHead=git('rev-parse','HEAD'),expectedHead=process.env.AFRICA_REVIEW_HEAD_SHA;
  report.provenance={actualHead,expectedHead:expectedHead??null,githubSha:process.env.GITHUB_SHA??null,repository:process.env.AFRICA_REVIEW_REPOSITORY??process.env.GITHUB_REPOSITORY??null,runId:process.env.AFRICA_REVIEW_RUN_ID??process.env.GITHUB_RUN_ID??null,runAttempt:process.env.AFRICA_REVIEW_RUN_ATTEMPT??process.env.GITHUB_RUN_ATTEMPT??null,eventName:process.env.AFRICA_REVIEW_EVENT_NAME??process.env.GITHUB_EVENT_NAME??'local',workingTree:git('status','--short','--untracked-files=no'),publicBrowserVerified:false};
  report.provenance.scriptSha256=hash(await readFile(fileURLToPath(import.meta.url)));report.provenance.nodeVersion=process.version;
  if(expectedHead)assert.equal(actualHead,expectedHead,'Checked-out HEAD differs from requested PR head');
  const release=JSON.parse(await readFile(path.join(dist,'_release.json'),'utf8'));report.build={commitSha:release.commitSha,builtAt:release.builtAt,africaHtmlSha256:hash(await readFile(path.join(dist,'atlas/africa/index.html'))),usPopulationHtmlSha256:hash(await readFile(path.join(dist,'atlas/north-america/population/index.html')))};
  report.provenance.commitNote=process.env.GITHUB_SHA&&process.env.GITHUB_SHA!==actualHead?'GITHUB_SHA differs from checked-out PR head (for example a PR merge SHA); actualHead identifies the reviewed checkout.':'actualHead identifies the reviewed checkout.';
  report.build.commitNote=release.commitSha==='local'?'Local build does not embed a commit; HTML hashes and current checkout are recorded.':release.commitSha!==actualHead?'Build embeds a different SHA; build/checkout provenance is not equivalent.':'Build commit matches checkout.';
  if(process.env.GITHUB_ACTIONS==='true')assert.equal(release.commitSha,actualHead,'CI build must embed the reviewed PR head; pass GITHUB_SHA=AFRICA_REVIEW_HEAD_SHA to npm run build');
  report.fonts={setup:process.env.AFRICA_REVIEW_JAPANESE_FONT_SETUP??'existing local fonts',japaneseFamilies:process.env.AFRICA_REVIEW_JAPANESE_FONTS??null,genericMatch:process.env.AFRICA_REVIEW_JAPANESE_FONT_MATCH??null};
  const executablePath=process.env.AFRICA_REVIEW_CHROME_PATH;assert(executablePath,'Set AFRICA_REVIEW_CHROME_PATH to existing Chrome/Chromium; no browser is downloaded');await access(executablePath,constants.X_OK);
  const hosted=await serveBuild();server=hosted.server;origin=hosted.origin;report.origin=origin;report.basePath=basePath;
  report.browser={executablePath,headless:true,chromiumSandbox:true,additionalFlags:[]};await save();
  browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});report.browser.version=browser.version();await save();
  for(const profile of profiles){
   let waterReference,climateReference,agricultureReference,industryReference;const populationReferences={};
   await runCase(profile,'us-climate',async(page,record)=>{await open(page,'/atlas/north-america/nature/?env=climate');await stableUS(page,record,'climate');climateReference=await measure(page,'us');assertLayout(climateReference);record.measurements.push({scene:'climate',...climateReference});if(profile.id==='desktop1440')await screenshot(page,record,'us-climate');});
   await runCase(profile,'africa-climate',async(page,record)=>{await climateOperations(page,record,climateReference);});
   await runCase(profile,'us-water',async(page,record)=>{await open(page,'/atlas/north-america/nature/?env=water');await stableUS(page,record,'water');waterReference=await measure(page,'us');assertLayout(waterReference);record.measurements.push({scene:'water',...waterReference});await screenshot(page,record,'us-water');});
   await runCase(profile,'africa-rivers',async(page,record)=>{await riverOperations(page,record,waterReference);assert(waterReference,'US water reference was not successfully rendered');});
   await runCase(profile,'us-agriculture',async(page,record)=>{await open(page,'/atlas/north-america/agriculture/');await stableUS(page,record,'agriculture');const before=await page.locator('canvas.maplibregl-canvas').screenshot();await page.locator('[data-agri-layer][value=crops]').uncheck();await stableUS(page,record,'agriculture');const after=await page.locator('canvas.maplibregl-canvas').screenshot();assert.notEqual(hash(before),hash(after),'Crop visibility did not change the actual map');await page.locator('[data-agri-layer][value=crops]').check();await stableUS(page,record,'agriculture');record.checks.push({check:'Crop visibility changes real canvas and is restored',status:'passed',before:hash(before),withoutCrops:hash(after)});agricultureReference=await measure(page,'us');assertLayout(agricultureReference);record.measurements.push({scene:'agriculture',...agricultureReference});await screenshot(page,record,'us-agriculture');});
   await runCase(profile,'africa-agriculture',async(page,record)=>{await agricultureOperations(page,record,agricultureReference);});
   await runCase(profile,'us-industry',async(page,record)=>{await open(page,'/atlas/north-america/industry/');await stableUS(page,record,'industry');industryReference=await measure(page,'us');assertLayout(industryReference);record.measurements.push({scene:'industry',...industryReference});await screenshot(page,record,'us-industry');});
   await runCase(profile,'africa-industry',async(page,record)=>{await industryOperations(page,record,industryReference);});
   await runCase(profile,'us-population',async(page,record)=>{await open(page,'/atlas/north-america/population/');let previous;for(const topic of ['distribution','ethnicity','religion']){await page.locator(`[data-pop-view=${topic}]`).click();const digest=await stableUS(page,record,topic);if(previous)assert.notEqual(digest,previous,'Population tab changed without changing actual canvas paint');previous=digest;const measured=await measure(page,'us');assertLayout(measured);populationReferences[topic]=measured;record.measurements.push({topic,...measured});if(topic==='distribution')await screenshot(page,record,'us-population');}});
   await runCase(profile,'africa-population',async(page,record)=>{await populationOperations(page,record,populationReferences);for(const topic of ['distribution','ethnicity','religion'])assert(populationReferences[topic],`US ${topic} was not successfully rendered`);});
   if(profile.id==='desktop1440'){
    await runCase(profile,'africa-delayed-river',delayedRiver);
    await runCase(profile,'africa-delayed-agriculture',delayedAgriculture);
   }
  }
  assert.equal(report.cases.filter(record=>record.status!=='passed').length,0,'Browser review failed; inspect metadata and failure screenshots');assert.equal(report.screenshots.length,21,'Expected exactly 21 representative PC captures');report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack??String(error);process.exitCode=1;console.error(error);}
 finally{report.completedAt=new Date().toISOString();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await save();console.log(JSON.stringify({status:report.status,output,cases:report.cases.length,screenshots:report.screenshots.length}));}
}
await main();
