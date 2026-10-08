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
import {africaHydrologyRivers,africaHydrologyBasinRelations} from '../src/data/atlas/africa-hydrology-reading.ts';
import {africaClimateCities} from '../src/data/atlas/africa-climate-cities.ts';
import {africaIndustryLocations} from '../src/data/atlas/africa-industry-locations.ts';
import {africaLayerPath,africaCommodityColor,africaRiverDisplayColors} from '../src/scripts/atlas-africa-layers.ts';
import {densityColors} from '../src/data/atlas/population.ts';
import {ethnicityColors} from '../src/lib/atlas-population-dominant.ts';
import {religionDominantColors} from '../src/lib/atlas-population-religion.ts';

const repo=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(repo,'dist');
const output=path.resolve(process.env.AFRICA_REVIEW_OUTPUT||path.join(repo,'review-artifacts/africa-pc-review'));
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const profiles=[{id:'desktop1536',width:1536,height:864},{id:'notebook1280',width:1280,height:720},{id:'notebook1024',width:1024,height:768}];
const agricultureProfiles=[{id:'agriculture1536',width:1536,height:864},{id:'agriculture1280',width:1280,height:720},{id:'agriculture1024',width:1024,height:768}];
const elevationProfiles=agricultureProfiles.map(profile=>({...profile,id:profile.id.replace('agriculture','elevation')}));
const mobileProfile={id:'mobile390',width:390,height:844,mobile:true};
const riverRoute='/atlas/africa/?field=nature&topic=water&water=river&zoom=all';
const populationRoute='/atlas/africa/?field=population&topic=distribution&zoom=all';
const agricultureKeys=['crop-maize-harvested','crop-rice-harvested','crop-wheat-harvested','crop-cassava-harvested','livestock-cattle','livestock-goats','livestock-sheep'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.gz':'application/gzip'};
const report={status:'running',scope:'Local production dist in real Chrome at PC viewports and an emulated 390 × 844 touch mobile viewport. Public deployment and physical mobile devices are not verified.',startedAt:new Date().toISOString(),comparisonTolerancePx:{x:2,width:2,height:2,y:'recorded separately because field tabs have different heights'},publicBrowserVerified:false,physicalMobileVerified:false,profiles,agricultureProfiles,elevationProfiles,mobileProfile,cases:[],screenshots:[],visualReviewRequired:['Initial agriculture: identify all seven source-threshold outlines and matching product names; original quantities, zeros and no-data stay distinct.','Selected rice: source quantity bands and legend agree; six other source-threshold outlines remain visible and livestock is quieter.','Scrolled agriculture: every heading and source remains readable beside the news rail at 1536, 1280 and 1024 pixels.','Mobile: review initial arrival, map, rice selection and lower readings at 390 × 844; desktop Chrome touch emulation is not a physical-device test.'],exclusions:[]};
let browser,server,origin,fatalNetwork;
const native=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/africa-water-v1/rivers.geojson'),'utf8'));
const agricultureManifest=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/africa-agriculture-distribution-v1/manifest.json'),'utf8'));
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
 assert(measurement.map&&measurement.map.width>0&&measurement.map.height>0,'Map frame has no visible area');
 assert(measurement.map.y>=0&&measurement.map.y<measurement.viewport.height*.6,'Map begins too far down the first viewport');
 if(measurement.nav)assert(measurement.nav.y+measurement.nav.height<=measurement.map.y+1,'Navigation overlaps the map frame');
 if(measurement.southAfrica){const south=measurement.southAfrica,map=measurement.map;assert(south.y>=map.y-1&&south.y+south.height<=map.y+map.height+1,'Southern Africa lies outside the map frame');}
 for(const control of measurement.controls){assert(control.x>=0&&control.x+control.width<=measurement.viewport.width+1,'Header select lies outside viewport');for(const other of measurement.controls)if(other!==control){const area=Math.max(0,Math.min(control.x+control.width,other.x+other.width)-Math.max(control.x,other.x))*Math.max(0,Math.min(control.y+control.height,other.y+other.height)-Math.max(control.y,other.y));assert.equal(area,0,'Header selects overlap');}}
 if(reference){measurement.usDifference=Object.fromEntries(['x','y','width','height'].map(key=>[key,measurement.map[key]-reference.map[key]]));for(const key of ['x','width','height'])assert(Math.abs(measurement.usDifference[key])<=2,`US/Africa map ${key} differs by ${measurement.usDifference[key]}px (limit 2px)`);}
}
async function screenshot(page,record,name,{preserveScroll=false}={}){
 if(!preserveScroll)await page.evaluate(()=>{window.scrollTo(0,0);document.querySelector('.africa-detail')?.scrollTo(0,0);});
 const file=`${record.profile}-${name}.png`,png=await page.screenshot({animations:'disabled',fullPage:false});await writeFile(path.join(output,file),png);
 const evidence={file,sha256:hash(png),url:page.url(),scroll:await page.evaluate(()=>({x:scrollX,y:scrollY})),capturedAt:new Date().toISOString()};record.screenshots.push(evidence);report.screenshots.push(evidence);return evidence;
}
async function climateReviewPair(files,titles,file){
 const encoded=await Promise.all(files.map(async file=>(await readFile(path.join(output,file))).toString('base64')));
 const page=await browser.newPage({viewport:{width:3072,height:900},deviceScaleFactor:1});
 try{
  await page.setContent(`<html lang="ja"><head><meta charset="utf-8"><style>body{margin:0;background:#fffdf8;font:20px sans-serif}.pair{display:flex}.pair>div{width:1536px}h1{height:36px;margin:0;padding:4px 12px;font-size:18px;box-sizing:border-box}img{display:block;width:1536px;height:864px}</style></head><body><div class="pair"><div><h1>${titles[0]}</h1><img src="data:image/png;base64,${encoded[0]}"></div><div><h1>${titles[1]}</h1><img src="data:image/png;base64,${encoded[1]}"></div></div></body></html>`);
  await page.locator('img').last().evaluate(image=>image.decode());
  const png=await page.screenshot({animations:'disabled',fullPage:true});await writeFile(path.join(output,file),png);
  report.screenshots.push({file,sha256:hash(png),sources:files,capturedAt:new Date().toISOString()});
 }finally{await page.close();}
}
async function lowerAgriculture(page,record){
 const lower=page.locator('.africa-secondary');assert.equal(await lower.count(),1);
 for(const summary of await lower.locator(':scope > details > summary').all())if(await summary.isVisible()){await summary.scrollIntoViewIfNeeded();break;}
 const structural=await lower.evaluate(node=>{
  const box=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  return{main:box(document.querySelector('.africa-main')),lower:box(node),news:box(document.querySelector('[data-news-rail]')),insideMain:!!node.closest('.africa-main')};
 });
 assert.equal(structural.insideMain,true,'Lower readings leave the main column');
 assert(structural.lower.x>=structural.main.x-1,'Lower agriculture reading begins inside the news column');
 assert(structural.lower.x+structural.lower.width<=structural.main.x+structural.main.width+1,'Lower agriculture reading exceeds the main column');
 const disclosures=lower.locator(':scope > details, [data-africa-agri-notes] > details');const checks=[];
 for(let i=0;i<await disclosures.count();i++){
  const disclosure=disclosures.nth(i);if(!await disclosure.isVisible())continue;
  const summary=disclosure.locator(':scope > summary');await summary.scrollIntoViewIfNeeded();
  if(!await disclosure.evaluate(node=>node.open))await summary.click();
  const evidence=await summary.evaluate(node=>{
   const rect=node.getBoundingClientRect(),rail=document.querySelector('[data-news-rail]').getBoundingClientRect();
   const point={x:Math.min(rect.right-4,rect.left+Math.max(8,rect.width/3)),y:Math.min(innerHeight-1,Math.max(1,rect.top+rect.height/2))},hit=document.elementFromPoint(point.x,point.y);
   return{text:node.textContent,box:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},newsOverlap:rect.left<rail.right&&rail.left<rect.right&&rect.top<rail.bottom&&rail.top<rect.bottom,hit:hit===node||node.contains(hit),font:getComputedStyle(node).fontSize};
  });
  assert.equal(evidence.newsOverlap,false,`News rail covers lower heading: ${evidence.text}`);assert.equal(evidence.hit,true,`Lower heading is obscured: ${evidence.text}`);assert(parseFloat(evidence.font)>=14,'Lower reading headings must not be compressed into small text');checks.push(evidence);
 }
 const reading=lower.locator('.africa-reading').first();assert.equal(await reading.isVisible(),true);await reading.locator('.africa-section-heading').scrollIntoViewIfNeeded();await settle(page);
 const rows=await reading.locator('.africa-reading-field').filter({has:page.getByRole('heading',{name:'農林業',exact:true})}).locator('article').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect(),news=document.querySelector('[data-news-rail]').getBoundingClientRect();return{title:node.querySelector('h3,h4')?.textContent,x:box.x,width:box.width,newsRight:news.right,source:node.querySelector('a')?.getAttribute('href')};}));
 assert(rows.length>0,'Existing sourced agriculture readings disappeared');assert(rows.every(row=>row.x>=row.newsRight),'Agriculture reading cards extend behind the news rail');
 await screenshot(page,record,'africa-agriculture-lower',{preserveScroll:true});
 for(const nested of await lower.locator('.africa-sources details').all())if(!await nested.evaluate(node=>node.open))await nested.locator(':scope > summary').click();
 const finalSource=lower.locator('.africa-sources a').last();await finalSource.scrollIntoViewIfNeeded();
 const source=await finalSource.evaluate(node=>{const r=node.getBoundingClientRect(),x=Math.min(innerWidth-1,Math.max(1,r.x+r.width/2)),y=Math.min(innerHeight-1,Math.max(1,r.y+r.height/2)),hit=document.elementFromPoint(x,y);return{href:node.getAttribute('href'),text:node.textContent,y:r.y,bottom:r.bottom,viewport:innerHeight,hit:hit===node||node.contains(hit),scrollY};});
 assert(source.y>=0&&source.bottom<=source.viewport+1,'Final source cannot be brought into the viewport');assert.equal(source.hit,true,'Final source is obscured at the scroll end');
 record.checks.push({check:'Every lower heading is reachable without news overlap, all existing agriculture cards and final source remain readable',status:'passed',structural,headings:checks,readings:rows,finalSource:source});
}
async function runCase(profile,name,run){
 const record={profile:profile.id,name,status:'running',startedAt:new Date().toISOString(),checks:[],measurements:[],screenshots:[],pageErrors:[],console:[],failedRequests:[],externalRequests:[],loadedAssets:[]};report.cases.push(record);await save();
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:profile.mobile===true,hasTouch:profile.mobile===true,deviceScaleFactor:1,locale:'ja-JP',timezoneId:'UTC',reducedMotion:'reduce',colorScheme:'light',serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(30000);
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==origin){record.externalRequests.push(url.href);fatalNetwork=`External dependency requested: ${url.href}`;return route.abort('blockedbyclient');}return route.continue();});
 page.on('pageerror',error=>{record.pageErrors.push(error.message);fatalNetwork=`Browser runtime error: ${error.message}`;});page.on('console',message=>{if(['error','warning'].includes(message.type()))record.console.push({type:message.type(),text:message.text()});if(message.type()==='error')fatalNetwork=`Browser console error: ${message.text()}`;});
 page.on('response',response=>{if(response.status()>=400)record.failedRequests.push({url:response.url(),status:response.status()});else if(/\.(json|geojson|png|webp|gz)(?:\?|$)/.test(response.url()))record.loadedAssets.push(response.url());});
 page.on('requestfailed',request=>{const error=request.failure()?.errorText??'';if(/CERT_|SSL_|TLS|certificate/i.test(error))fatalNetwork=`TLS failure at ${request.url()}: ${error}`;if(error!=='net::ERR_ABORTED')record.failedRequests.push({url:request.url(),error});});
 try{await run(page,record,context);await settle(page);networkGuard(record);record.status='passed';}
 catch(error){record.status='failed';record.failure=error.stack??String(error);record.rendering=await page.evaluate(()=>({us:document.querySelector('[data-atlas-explorer]')?.dataset.renderState,fallbackVisible:document.querySelector('[data-fallback]')?.hidden===false,africa:document.querySelector('[data-africa-atlas]')?.dataset.layerMode})).catch(()=>null);await screenshot(page,record,`${name}-failure`,{preserveScroll:true}).catch(captureError=>{record.captureFailure=String(captureError);});}
 finally{record.url=page.url();record.finishedAt=new Date().toISOString();await context.close();await save();}
 console.log(`${record.status.toUpperCase()}: ${profile.id} ${name}`);if(fatalNetwork)throw new Error(fatalNetwork);return record;
}

async function waitAfrica(page,key){
 await page.waitForFunction(key=>{const root=document.querySelector('[data-africa-atlas]');return root?.dataset.actualLayer==='true'&&(key==='river'?document.querySelectorAll('[data-africa-layer-feature]').length===90:key==='basin'?document.querySelectorAll('[data-africa-basin-feature]').length>0:!!document.querySelector(`[data-africa-raster="${key}"]`));},key);
 await settle(page);
 if(!['river','basin'].includes(key))await page.locator(`[data-africa-raster="${key}"]`).evaluateAll(async nodes=>{await Promise.all(nodes.map(async node=>{const image=new Image();image.src=node.getAttribute('href');await image.decode();if(!image.naturalWidth)throw new Error('Native raster did not decode');}));});
}
async function assertReaderUI(page){
 for(const selector of ['[data-place]','[data-compare]','[data-year]','[data-region]','[data-metric]','[data-compare-country]','[data-country-statistics]'])assert.equal(await page.locator(selector).count(),0,`Removed reader control still exists: ${selector}`);
 const params=await state(page);for(const key of ['place','compare','year','metric','context','sourceState'])assert.equal(params[key],undefined,`Legacy country-statistics URL parameter remains: ${key}`);
}
async function readerEvidence(page,record,scene){
 await page.locator('[data-theme-title]').scrollIntoViewIfNeeded();
 const reading=await page.locator('.africa-detail').evaluate(node=>{
  const title=node.querySelector('[data-theme-title]'),r=title.getBoundingClientRect(),style=getComputedStyle(title),rail=document.querySelector('[data-news-rail]')?.getBoundingClientRect();
  const overlap=rail&&rail.width>0&&r.left<rail.right&&rail.left<r.right&&r.top<rail.bottom&&rail.top<r.bottom;
  const p=[...node.querySelectorAll('p')].filter(item=>item.checkVisibility());
  const body=p.filter(item=>!item.classList.contains('africa-kicker'));
  const kicker=node.querySelector('.africa-kicker');
  return {title:title.textContent,titleFont:parseFloat(style.fontSize),titleWidth:r.width,titleScrollWidth:title.scrollWidth,newsOverlap:!!overlap,paragraphFonts:body.map(item=>({font:parseFloat(getComputedStyle(item).fontSize),text:item.textContent.slice(0,60)})),kickerFont:kicker?.checkVisibility()?parseFloat(getComputedStyle(kicker).fontSize):null,text:node.innerText};
 });
 assert(reading.title.trim(),'The reading has no heading');assert(reading.titleFont>=18,'Reading heading was reduced below 18px');assert(reading.titleScrollWidth<=reading.titleWidth+1,'Reading heading is clipped horizontally');assert.equal(reading.newsOverlap,false,'News rail covers the right reading');assert(reading.kickerFont===null||reading.kickerFont>=12.9,'Reading eyebrow is smaller than 13px');assert(reading.paragraphFonts.every(row=>row.font>=13.9),`Reading text is smaller than 14px: ${JSON.stringify(reading.paragraphFonts.filter(row=>row.font<13.9))}`);
 const labels=await page.locator('.africa-map').evaluate(map=>{
  const frame=map.getBoundingClientRect(),nodes=[...map.querySelectorAll('[data-africa-agri-label-text],[data-africa-agri-place-text],[data-africa-river-label] text,[data-africa-basin-label] text,[data-africa-city-label] text,[data-africa-climate-map-label] text,[data-africa-industry-location] text')];
  const rows=nodes.filter(node=>node.checkVisibility({visibilityProperty:true,opacityProperty:true})&&getComputedStyle(node).visibility==='visible').map(node=>{const r=node.getBoundingClientRect(),m=node.getScreenCTM();return{text:node.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,font:parseFloat(getComputedStyle(node).fontSize)*Math.hypot(m.a,m.b)};}).filter(row=>row.right>frame.left&&row.x<frame.right&&row.bottom>frame.top&&row.y<frame.bottom);
  return{rows,overlaps:rows.flatMap((a,i)=>rows.slice(i+1).filter(b=>a.x<b.right-1&&b.x<a.right-1&&a.y<b.bottom-1&&b.y<a.bottom-1).map(b=>[a.text,b.text]))};
 });
 assert(labels.rows.every(row=>row.font>=12.9),'Map labels are smaller than 13 screen pixels');assert.deepEqual(labels.overlaps,[],'Map names overlap');
 record.checks.push({check:'Reading heading, paragraph size and map labels remain readable without news overlap',status:'passed',scene,reading,labels});
}
async function keyboardMapPick(page,selector){
 const target=page.locator(selector).first();await target.focus();const before=await target.evaluate(node=>({outline:getComputedStyle(node).outlineStyle,role:node.getAttribute('role'),name:node.getAttribute('aria-label')}));assert.equal(before.outline,'none','SVG selection has a rectangular outline');assert.equal(before.role,'button');assert(before.name?.trim());await page.keyboard.press('Enter');return before;
}
async function assertRiver(page,id){
 const river=africaHydrologyRivers.find(row=>row.id===id);await page.waitForFunction(id=>new URL(location.href).searchParams.get('river')===id,id);
 assert.equal(await page.locator('[data-theme-title]').textContent(),river.label);
 if(river.reading)assert.equal(await page.locator('[data-theme-takeaway]').textContent(),river.reading.text);else assert.match(await page.locator('[data-theme-takeaway]').textContent(),/解説は未収録/);
 assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),river.reading?.source??river.source);
 const view=await page.locator('[data-africa-actual-layer]').evaluate(node=>({paths:[...node.querySelectorAll('[data-africa-layer-feature]')].map(path=>({id:path.dataset.africaLayerFeature,d:path.getAttribute('d'),selected:path.classList.contains('is-selected'),stroke:path.getAttribute('stroke'),width:path.getAttribute('stroke-width'),display:getComputedStyle(path).display})),hits:[...node.querySelectorAll('[data-africa-river-hit-feature][aria-pressed=true]')].map(path=>path.dataset.africaRiverHitFeature)}));
 assert.equal(view.paths.length,90);assert.equal(new Set(view.paths.map(row=>row.id)).size,90);
 const namedIds=new Set(africaHydrologyRivers.flatMap(row=>row.featureIds));
 for(const line of view.paths){assert.equal(line.d,nativePaths[line.id]);assert.notEqual(line.display,'none');assert.equal(line.stroke,line.selected?africaRiverDisplayColors.selected:namedIds.has(line.id)?africaRiverDisplayColors.named:africaRiverDisplayColors.base);if(line.selected)assert.equal(line.width,'3.2');}
 assert.deepEqual(view.paths.filter(row=>row.selected).map(row=>row.id).sort(),[...river.featureIds].sort());assert.deepEqual(view.hits.sort(),[...river.featureIds].sort());assert.equal(await page.locator(`[data-africa-river-label="${id}"]`).getAttribute('aria-pressed'),'true');assert.equal((await state(page)).layerPoint,undefined);
 return {id,label:river.label,featureIds:river.featureIds,totalFeatures:view.paths.length,source:river.reading?.source??river.source};
}
async function clickLine(page,id){
 await page.locator('.africa-map-frame').scrollIntoViewIfNeeded();
 const point=await page.locator(`path[data-africa-river="${id}"]`).evaluateAll(nodes=>{for(const node of nodes){const matrix=node.getScreenCTM(),length=node.getTotalLength();if(!matrix)continue;for(let i=1;i<100;i++){const p=node.getPointAtLength(length*i/100),s=new DOMPoint(p.x,p.y).matrixTransform(matrix);if(s.x>1&&s.x<innerWidth-1&&s.y>1&&s.y<innerHeight-1&&document.elementFromPoint(s.x,s.y)===node)return{x:s.x,y:s.y,feature:node.dataset.africaRiverHitFeature};}}return null;});
 assert(point,`No hittable native ${id} line`);await page.mouse.click(point.x,point.y);await assertRiver(page,id);return point;
}

async function stableUS(page,record,topic){
 const population=['distribution','ethnicity','religion'].includes(topic),nature=['water','climate','contour'].includes(topic);
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
 if(topic==='contour')assert(topicAssets.some(url=>url.endsWith('/contours.geojson.gz')),'Actual US 500 m contours were not fetched');
 if(population){
  assert(topicAssets.some(url=>topic==='religion'?/religion-counties-2020\.geo/.test(url):/counties\.geo/.test(url)),'Actual US county geometry was not fetched');
  const dataset=topic==='distribution'?'/counties.json':topic==='ethnicity'?'/ethnicity.json':'/religion-dominant.json';
  assert(topicAssets.some(url=>url.includes(dataset)),`US ${topic} dataset was not fetched`);
 }
 record.checks.push({check:'US actual canvas rendering',topic,renderState:'ready',fallback:false,graphics,palette,samples,assets:topicAssets});
 return samples.at(-1).sha256;
}

async function elevationOperations(page,record,reference){
 await open(page,'/atlas/africa/?field=nature&topic=elevation&place=EGY&compare=COD&region=north&year=2023&zoom=country');
 await page.waitForFunction(()=>document.querySelectorAll('[data-africa-elevation-band]').length===10&&document.querySelectorAll('[data-africa-elevation-contour]').length===9);await settle(page);
 await assertReaderUI(page);assert.equal(await page.locator('.africa-ranking,.africa-statistics-grid,[data-focus-country]').count(),0);
 const params=await state(page);for(const key of ['place','compare','year','context'])assert.equal(params[key],undefined);assert.equal(params.zoom,'all');
 const native=await page.locator('[data-africa-layer-feature]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.africaLayerFeature,d:n.getAttribute('d'),fill:n.getAttribute('fill'),stroke:n.getAttribute('stroke'),width:n.getAttribute('stroke-width')})));
 const colors=['#c5d8b0','#dee0aa','#e2d29a','#d5be8c','#c2a57f'];
 const pixels=pixelEvidence(await page.locator('.africa-map').screenshot(),colors);assert(pixels.paletteMatches.filter(count=>count>=5).length>=4,'Elevation bands are not visibly painted');
 const measurement=await measure(page,'africa');assertLayout(measurement);record.measurements.push({scene:'elevation',...measurement});
 await readerEvidence(page,record,'elevation');await screenshot(page,record,'africa-elevation');
 await page.locator('[data-africa-layer-class="band-3"]').click();await page.locator('[data-africa-class-outline="band-3"]').waitFor();
 assert.equal(await page.locator('[data-africa-layer-feature]').count(),19);assert.equal(await page.locator('[data-africa-class-outline] rect').count(),0);assert.match(await page.locator('[data-africa-point-reading]').textContent(),/1,000–1,500 m/);
 assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),'https://www.ncei.noaa.gov/products/etopo-global-relief-model');
 const paths=await page.locator('[data-africa-layer-feature]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.africaLayerFeature,d:n.getAttribute('d'),fill:n.getAttribute('fill'),stroke:n.getAttribute('stroke'),width:n.getAttribute('stroke-width')})));assert.deepEqual(paths,native);
 await screenshot(page,record,'africa-elevation-selected');
 await page.locator('[data-africa-layer-class="band-5"]').focus();await page.keyboard.press('Enter');await page.locator('[data-africa-class-outline="band-5"]').waitFor();
 await page.goBack();await page.locator('[data-africa-class-outline="band-3"]').waitFor();await page.goForward();await page.reload();await page.locator('[data-africa-class-outline="band-5"]').waitFor();
 await page.locator('[data-africa-layer-class="band-5"]').click();assert.equal(await page.locator('[data-africa-class-outline]').count(),0);
 await page.locator('.africa-theme-full>summary').click();const source=page.locator('[data-theme-details] a').last();await source.scrollIntoViewIfNeeded();assert.match(await source.getAttribute('href'),/africa-elevation-500m-v1\/manifest.json$/);await screenshot(page,record,'africa-elevation-source',{preserveScroll:true});
 await page.locator('[data-reset]').click();await waitAfrica(page,'climate');assert.equal(await page.locator('[data-africa-elevation-band]').count(),0);
 record.checks.push({check:'500 m bands/lines paint, all geometry retained on band selection, source, obsolete controls, keyboard/history/reload/reset',status:'passed',pixels,features:native.map(({d,...rest})=>({...rest,pathLength:d.length}))});
 assert(reference,'US elevation did not render normally; fallback cannot be a successful comparison');assertLayout(measurement,reference);
}

async function riverOperations(page,record,reference){
 await open(page,riverRoute);await waitAfrica(page,'river');await assertReaderUI(page);
 assert.equal(await page.locator('[data-africa-river-label]').count(),9);assert.equal(await page.locator('[data-africa-river-choice]').count(),0);
 for(const river of africaHydrologyRivers){await page.locator(`[data-africa-river-label="${river.id}"]`).click();record.checks.push({check:'Named source river selects its own geometry and reading',...await assertRiver(page,river.id)});}
 record.checks.push({check:'Native river pointer selection',id:'nile',point:await clickLine(page,'nile')});
 const measurement=await measure(page,'africa');assertLayout(measurement,reference);record.measurements.push({scene:'water',...measurement});await readerEvidence(page,record,'nile');await screenshot(page,record,'africa-nile');
 await clickLine(page,'congo');await page.goBack();await assertRiver(page,'nile');await page.goForward();await assertRiver(page,'congo');await page.reload();await waitAfrica(page,'river');await assertRiver(page,'congo');
 await keyboardMapPick(page,'[data-africa-river-hit-feature="ne50-river-0298"]');await assertRiver(page,'nile');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-africa-river')),'nile');
 await page.locator('[data-africa-river-hit-feature="ne50-river-0157"]').focus();await page.keyboard.press('Space');await assertRiver(page,'congo');
 await page.locator('[data-africa-selection-return]').click();assert.equal((await state(page)).river,undefined);assert.equal(await page.locator('[data-africa-river-feature].is-selected').count(),0);
 await page.locator('[data-africa-water="basin"]').click();await waitAfrica(page,'basin');
 const basinGeometry=await page.locator('[data-africa-layer-feature]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-africa-layer-feature'),d:node.getAttribute('d')})));assert.equal(basinGeometry.length,1037);
 const nile=africaHydrologyBasinRelations.find(row=>row.riverId==='nile');await keyboardMapPick(page,`[data-africa-basin-feature="${nile.basinId}"]`);
 assert.equal((await state(page)).basin,nile.basinId);assert.equal(await page.locator(`[data-africa-basin-feature="${nile.basinId}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-theme-title]').textContent(),`${nile.riverLabel}の河道を含む収録集水区`);
 assert.match(await page.locator('[data-theme-caveat]').textContent(),/全流域|正式|対応/);assert.equal(await page.locator('[data-africa-basin-feature][aria-pressed="true"]').count(),1);
 assert.deepEqual(await page.locator('[data-africa-layer-feature]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-africa-layer-feature'),d:node.getAttribute('d')}))),basinGeometry,'Basin selection must retain all original source polygons');
 await readerEvidence(page,record,'basin');await screenshot(page,record,'africa-basin');await page.reload();await waitAfrica(page,'basin');assert.equal((await state(page)).basin,nile.basinId);
 await checkTabs(page,'water',[['basin','Home','river'],['river','ArrowRight','rain'],['rain','End','basin'],['basin','Home','river']]);await waitAfrica(page,'river');
 await page.locator('[data-reset]').click();await waitAfrica(page,'climate');assert.equal((await state(page)).river,undefined);assert.equal((await state(page)).basin,undefined);
 record.checks.push({check:'Nine named rivers and actual basin polygons: map selection, original geometry, source, keyboard, history, reload, return and reset',status:'passed',basinId:nile.basinId,basinFeatureCount:basinGeometry.length});
}

async function checkTabs(page,kind,steps){
 for(const [from,key,to]of steps){
  await page.locator(`[data-africa-${kind}="${from}"]`).focus();await page.keyboard.press(key);
  const focus=await page.evaluate(({kind,to})=>{const node=document.querySelector(`[data-africa-${kind}="${to}"]`);return {focused:document.activeElement===node,visible:node.matches(':focus-visible'),selected:node.getAttribute('aria-selected'),tabIndex:node.tabIndex,stops:document.querySelectorAll(`[data-africa-${kind}][tabindex="0"]`).length};},{kind,to});
  assert.deepEqual(focus,{focused:true,visible:true,selected:'true',tabIndex:0,stops:1});
 }
}

async function climateCity(page,record,{touch=false}={}){
 const city=africaClimateCities.find(row=>row.id==='helwan');
 const point=page.locator('[data-africa-city-point="helwan"]');await point.scrollIntoViewIfNeeded();if(touch)await point.tap();else await point.click();
 const article=page.locator('article[data-africa-city-reading="helwan"]');await article.waitFor({state:'visible'});assert.equal((await state(page)).city,'helwan');assert.equal(await page.locator('[data-theme-title]').textContent(),`${city.name}の雨温図`);
 const key=await article.locator('.africa-city-climate-key>span').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,y:Math.round(node.getBoundingClientRect().top)})));assert.deepEqual(key.map(row=>row.text),[`${city.normalPeriod}の観測所平年値`,'棒：降水量 mm','線：平均気温 ℃']);assert.equal(key[1].y,key[2].y,'Chart bar and line keys should share one readable row');
 assert.equal(await article.locator('svg').count(),1);assert.equal(await article.locator('tbody tr').count(),12);const reading=await article.innerText();assert.match(reading,/砂漠気候/);assert.match(reading,/1991.*2020/);assert.match(reading,/13\.9/);assert.match(reading,/29\.2/);assert.match(reading,/亜熱帯高圧帯/);assert.match(reading,/灌漑/);
 assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),city.sourceUrl);assert.equal(await page.locator('[data-africa-raster="climate"]').count(),1);
 const months=article.locator('[data-africa-city-months]');if(!await months.evaluate(node=>node.open)){if(touch)await months.locator('summary').tap();else await months.locator('summary').click();}const monthly=await article.locator('tbody tr').allTextContents();for(let index=0;index<12;index++){const cells=await article.locator('tbody tr').nth(index).locator('td').allTextContents();assert.deepEqual(cells,[`${city.temperatureC[index].toFixed(1)} ℃`,`${city.precipitationMm[index].toFixed(1)} mm`],`Month ${index+1} does not match the stored station observations`);}await months.locator('summary').click();
 await readerEvidence(page,record,'helwan');await screenshot(page,record,'africa-climate-city');if(touch){await article.scrollIntoViewIfNeeded();await screenshot(page,record,'africa-climate-city-reading',{preserveScroll:true});}
 await page.goBack();assert.equal((await state(page)).city,undefined);await page.goForward();await article.waitFor({state:'visible'});await page.reload();await waitAfrica(page,'climate');await article.waitFor({state:'visible'});
 await page.locator('[data-africa-selection-return]').click();assert.equal((await state(page)).city,undefined);await keyboardMapPick(page,'[data-africa-city-label="helwan"]');await article.waitFor({state:'visible'});
 record.checks.push({check:'Helwan map point/label selects the matching 12-month station chart, Japanese climate class, coverage limit, source and history',status:'passed',station:city.stationId,period:city.normalPeriod,months:monthly});
}
async function unavailableNature(page,record){
 for(const item of [{topic:'terrain',query:'?field=nature&topic=terrain',name:'terrain'},{topic:'water',query:'?field=nature&topic=water&water=rain',name:'rain'}]){
  await open(page,'/atlas/africa/'+item.query);await page.waitForFunction(()=>document.querySelector('[data-africa-atlas]')?.dataset.layerMode==='guide');await settle(page);await assertReaderUI(page);
  assert.equal(await page.locator('[data-africa-raster],[data-africa-layer-feature],[data-africa-elevation-contour],[data-theme-mark]').count(),0,'Unavailable nature layers must not reuse elevation or country statistics');
  assert.match(await page.locator('.africa-detail').innerText(),/未収録/);
  const fills=await page.locator('[data-country-path]').evaluateAll(nodes=>[...new Set(nodes.map(node=>node.getAttribute('fill')))]);assert.deepEqual(fills,['#f3f1e9']);
  await readerEvidence(page,record,item.name);await screenshot(page,record,'africa-'+item.name+'-unavailable');record.checks.push({check:'Unavailable source remains a documented guide without substitute country colors or terrain contours',status:'passed',topic:item.name,fills});
 }
}
async function climateOperations(page,record,reference){
 assert(reference,'US climate reference was not successfully rendered');
 await open(page,'/atlas/africa/?field=nature&topic=climate&zoom=all');await waitAfrica(page,'climate');await assertReaderUI(page);
 assert.equal((await state(page)).layerClass,undefined);assert.equal(await page.locator('[data-africa-class-outline]').count(),0);
 await page.locator('[data-africa-climate-map-label]').first().waitFor();await readerEvidence(page,record,'climate-initial');await screenshot(page,record,'africa-climate-initial');
 const image=await page.locator('[data-africa-raster="climate"]').getAttribute('href'),count=await page.locator('[data-africa-layer-class]').count();assert(count>1);
 await page.locator('[data-africa-layer-class="1"]').click();await page.locator('[data-africa-class-outline="1"]').waitFor();assert.equal(await page.locator('[data-africa-layer-class="1"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-africa-raster="climate"]').getAttribute('href'),image);assert.equal(await page.locator('[data-africa-layer-class]').count(),count);
 const outline=await page.locator('[data-africa-class-outline]').evaluate(node=>({rectangles:node.querySelectorAll('rect').length,paths:[...node.querySelectorAll('path')].map(path=>({stroke:path.getAttribute('stroke'),fill:path.getAttribute('fill'),length:path.getAttribute('d')?.length??0}))}));assert.equal(outline.rectangles,0);assert.deepEqual(outline.paths.map(row=>row.stroke),['#ffffff','#183c4a']);assert(outline.paths.every(row=>row.fill==='none'&&row.length>50));
 const measurement=await measure(page,'africa');assertLayout(measurement,reference);record.measurements.push({scene:'climate',...measurement});record.checks.push({check:'Climate class selection preserves native raster, complete legend and actual grid outline',status:'passed',legendClasses:count,image,outline});await screenshot(page,record,'africa-climate-outline');
 await page.reload();await waitAfrica(page,'climate');await page.locator('[data-africa-class-outline="1"]').waitFor();await page.locator('[data-africa-layer-class="1"]').click();assert.equal(await page.locator('[data-africa-class-outline]').count(),0);
 await climateCity(page,record);
 for(const city of africaClimateCities.filter(row=>row.id!=='helwan')){
  await page.locator(`[data-africa-city-point="${city.id}"]`).click();const article=page.locator(`[data-africa-city-reading="${city.id}"]`);await article.waitFor({state:'visible'});assert.equal((await state(page)).city,city.id);assert.equal(await page.locator('[data-theme-title]').textContent(),`${city.name}の雨温図`);assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),city.sourceUrl);assert.match(await article.innerText(),new RegExp(city.classification.name));await readerEvidence(page,record,city.id);await screenshot(page,record,`africa-climate-${city.id}`);
 }
 await checkTabs(page,'topic',[['climate','ArrowRight','water'],['water','End','elevation'],['elevation','Home','climate'],['climate','ArrowLeft','elevation'],['elevation','Home','climate']]);await waitAfrica(page,'climate');
 await unavailableNature(page,record);await page.locator('[data-reset]').click();await waitAfrica(page,'climate');assert.equal((await state(page)).city,undefined);
}

async function waitAgriculture(page,key){
 await page.waitForFunction(({keys,key})=>{
  const root=document.querySelector('[data-africa-atlas]');
  return root?.dataset.actualLayer==='true'&&keys.every(value=>document.querySelector(`[data-africa-commodity-layer="${value}"] [data-africa-agri-pick]`))&&(!key||document.querySelector(`[data-africa-agri-footprint="${key}"]`));
 },{keys:agricultureKeys,key});await settle(page);
}
async function agricultureLayers(page){return page.locator('[data-africa-commodity-layer]').evaluateAll(nodes=>nodes.map(node=>{const key=node.dataset.africaCommodityLayer,contours=document.querySelector(`[data-africa-agri-distribution="${key}"]`);return{key,opacity:Number(getComputedStyle(node).opacity),visible:getComputedStyle(node).display!=='none',paths:contours?.querySelectorAll('path').length??0,threshold:Number(node.dataset.africaContourThreshold),levels:[...contours?.querySelectorAll('[data-africa-agri-contour]')??[]].map(line=>Number(line.dataset.africaAgriContour)),glyphs:node.querySelectorAll('[data-africa-agri-glyph]').length,labels:node.querySelectorAll('[data-africa-agri-label]').length};}));}
async function pickAgriculture(page,key,{touch=false}={}){
 await page.locator('.africa-map-frame').scrollIntoViewIfNeeded();
 const point=await page.locator(`[data-africa-agri-label-text="${key}"]`).evaluateAll((nodes,key)=>{
  for(const node of nodes){const box=node.getBoundingClientRect();for(const fx of [.5,.2,.8]){const x=box.x+box.width*fx,y=box.y+box.height/2;if(x<=0||y<=0||x>=innerWidth||y>=innerHeight)continue;const hit=document.elementFromPoint(x,y)?.closest('[data-africa-agri-pick]');if(hit?.getAttribute('data-africa-agri-pick')===key)return{x,y,label:node.textContent};}}return null;
 },key);assert(point,`No visible, hittable ${key} map label`);if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);await waitAgriculture(page,key);return point;
}
async function agricultureNavigation(page){
 const navigation=await page.locator('[data-africa-agri-region]').evaluate(node=>{
  const box=element=>{const r=element.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};
  return{options:[...node.options].map(option=>({value:option.value,label:option.textContent})),box:box(node),label:box(node.closest('label')),map:box(document.querySelector('.africa-map-frame')),font:getComputedStyle(node).fontSize};
 });
 assert.deepEqual(navigation.options.map(row=>row.value).sort(),['all','central','east','north','south','west']);
 assert(navigation.box.x>=navigation.map.x&&navigation.box.x<=navigation.map.x+navigation.map.width*.4,'Region selector is not at the map left');assert(navigation.box.y>=navigation.map.y&&navigation.box.y<navigation.map.y+80,'Region selector is not at the map top');assert(parseFloat(navigation.font)>=14,'Map region selector is too small');
 const {label,map}=navigation;assert(label.x>=map.x-1&&label.y>=map.y-1&&label.x+label.width<=map.x+map.width+1&&label.y+label.height<=map.y+map.height+1,'The full region label and select extend outside the map frame');
 return navigation;
}
async function agricultureOperations(page,record,reference){
 await open(page,'/atlas/africa/?field=agriculture&zoom=all');await waitAgriculture(page);
 const initial=await agricultureLayers(page);assert.deepEqual(initial.filter(row=>row.visible).map(row=>row.key).sort(),[...agricultureKeys].sort());assert(initial.every(row=>row.paths>0&&row.labels>0));assert(record.loadedAssets.every(url=>!url.includes('/africa-agriculture-overview-v1/')),'Obsolete one-degree summary is still being loaded');
 assert.equal(await page.locator('.africa-map').getAttribute('role'),'group','An interactive map must expose its product controls, rather than flattening them into one image');
 await assertReaderUI(page);for(const selector of ['[data-africa-commodities] button','[data-africa-crop-measure]','[data-theme-comparison]'])assert.equal(await page.locator(selector).count(),0,`Obsolete agriculture control remains: ${selector}`);
 assert.equal(await page.locator('[data-africa-crop-measure]').count(),0);assert.equal(await page.locator('[data-africa-agri-layer]').count(),0);
 assert.deepEqual(await page.locator('[data-africa-subfields] [data-africa-topic]').allTextContents(),['農畜産','林業']);
 assert.equal(await page.locator('[data-africa-agri-only]').isVisible(),false);assert.equal(await page.locator('[data-africa-agri-bands]').count(),0);for(const row of initial){assert.equal(row.threshold,row.key.startsWith('crop-')?100:50);assert.deepEqual([...new Set(row.levels)],[row.threshold]);}
 const navigation=await agricultureNavigation(page);
 const labels=await page.locator('[data-africa-agri-label-text]').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect(),matrix=node.getScreenCTM();return{key:node.getAttribute('data-africa-agri-label-text'),text:node.textContent,x:r.x,y:r.y,width:r.width,height:r.height,fontPx:parseFloat(getComputedStyle(node).fontSize)*Math.hypot(matrix.a,matrix.b)};}));
 assert.deepEqual([...new Set(labels.map(row=>row.key))].sort(),[...agricultureKeys].sort());
 assert.equal(await page.locator('[data-africa-agri-place-text="MDG"]').textContent(),'マダガスカル','The geographic anchor for the rice reading is missing');
 const palette=agricultureKeys.map(africaCommodityColor),paint=pixelEvidence(await page.locator('.africa-map-frame').screenshot({animations:'disabled'}),palette);assertPaint(paint);
 const measurement=await measure(page,'africa');assertLayout(measurement);measurement.usDifference=reference?Object.fromEntries(['x','y','width','height'].map(key=>[key,measurement.map[key]-reference.map[key]])):null;record.measurements.push({scene:'agriculture',...measurement});
 record.checks.push({check:'Initial map has all seven source-threshold outlines, labeled products, livestock symbols and the left region selector; country controls are absent',status:'passed',products:initial,navigation,labels,paint,colors:Object.fromEntries(agricultureKeys.map(key=>[key,africaCommodityColor(key)]))});
 await readerEvidence(page,record,'agriculture-overview');await screenshot(page,record,'africa-agriculture');
 const rice='crop-rice-harvested',point=await pickAgriculture(page,rice),selected=await agricultureLayers(page);assert.deepEqual(selected.filter(row=>row.visible).map(row=>row.key).sort(),[...agricultureKeys].sort());assert(selected.filter(row=>row.key.startsWith('livestock-')).every(row=>row.opacity<initial.find(old=>old.key===row.key).opacity));
 assert.match(await page.locator('[data-theme-title]').textContent(),/米|稲/);assert.equal(await page.locator('[data-africa-agri-only]').isVisible(),true);assert.equal(await page.locator('.africa-detail [data-africa-agri-only]').count(),1);assert.equal((await state(page)).crop,'rice');assert.equal((await state(page)).cropMeasure,'harvested');
 await page.evaluate(()=>window.scrollTo(0,0));const singleControl=await page.locator('[data-africa-agri-only]').evaluate(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,viewportHeight:innerHeight};});assert(singleControl.y>=0&&singleControl.y+singleControl.height<=singleControl.viewportHeight,'Single-product action is outside the initial selected PC viewport');
 const riceReading=await page.locator('[data-africa-agri-context]').innerText();assert(riceReading.trim().length>80,'Selected crop lacks its geographic and economic reading');
 assert.equal(await page.locator('[data-africa-agri-place-text="MDG"]').isVisible(),true);
 const bands=page.locator('[data-africa-agri-bands]');assert.equal(await bands.count(),1);assert.equal(await bands.getAttribute('data-africa-agri-bands'),rice);assert.equal(await page.locator('[data-africa-agri-band-kind=zero]').count(),1);assert((await page.locator('[data-africa-agri-band-kind=band]').count())>1);
 const legend=await page.locator('[data-africa-agri-value-legend] [data-africa-layer-class]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-africa-layer-class'),label:node.textContent,color:node.querySelector('i')?.style.backgroundColor})));const cssColor=hex=>'rgb('+hex.match(/[\da-f]{2}/gi).map(n=>parseInt(n,16)).join(', ')+')';assert.deepEqual(legend,agricultureManifest.layers[rice].legend.map(row=>({id:row.id,label:row.label,color:cssColor(row.color)})));const faceColors=await page.locator('[data-africa-agri-band]').evaluateAll(nodes=>nodes.map(node=>({id:node.getAttribute('data-africa-agri-band'),color:node.getAttribute('fill')})));assert.deepEqual(faceColors.sort((a,b)=>a.id.localeCompare(b.id)),agricultureManifest.layers[rice].legend.map(row=>({id:row.id,color:row.color})).sort((a,b)=>a.id.localeCompare(b.id)));
 for(const row of selected.filter(row=>row.key!==rice))assert.deepEqual([...new Set(row.levels)],[row.threshold],'Other products keep the source-threshold outline');await readerEvidence(page,record,'agriculture-rice');
 record.checks.push({check:'Rice source bands, zeros and quantity legend agree; six other source-threshold outlines remain with matching geographic reading',status:'passed',point,products:selected,reading:riceReading,singleControl,quantityLegend:legend});await screenshot(page,record,'africa-agriculture-rice');
 await lowerAgriculture(page,record);
 assert(labels.every(row=>row.fontPx>=12.9),'Map product names shrink below 13 screen pixels');assert(paint.paletteMatches.every(count=>count>=5),'One or more product colors are absent from actual map pixels');
 await page.goBack();await waitAgriculture(page);assert.equal(await page.locator('[data-africa-agri-footprint]').count(),0);await page.goForward();await waitAgriculture(page,rice);await page.reload();await waitAgriculture(page,rice);
 await page.locator('[data-africa-agri-only]').click();await waitAgriculture(page,rice);assert.deepEqual((await agricultureLayers(page)).filter(row=>row.visible).map(row=>row.key),[rice]);await page.reload();await waitAgriculture(page,rice);assert.deepEqual((await agricultureLayers(page)).filter(row=>row.visible).map(row=>row.key),[rice]);
 await page.locator('[data-africa-agri-all]').click();await waitAgriculture(page,rice);assert.equal((await agricultureLayers(page)).filter(row=>row.visible).length,7);record.checks.push({check:'History and reload retain crop selection; explicit right-panel single display reloads and returns to all distributions',status:'passed'});
 const region=page.locator('[data-africa-agri-region]'),allView=await page.locator('.africa-map').getAttribute('viewBox'),regionViews=[];
 for(const value of ['north','south','west','east','central']){await region.selectOption(value);await settle(page);const view=await page.locator('.africa-map').getAttribute('viewBox');assert.notEqual(view,allView,`${value} selection does not fit the map`);assert.equal((await state(page)).region,value);assert.equal((await state(page)).place,undefined);regionViews.push({region:value,viewBox:view,navigation:await agricultureNavigation(page)});}
 await region.selectOption('all');await settle(page);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),allView);record.checks.push({check:'Five geographic regions fit the map, southern Africa is a region and all restores the full extent',status:'passed',views:regionViews});
 await page.locator('[data-africa-agri-overview]').click();await waitAgriculture(page);assert.equal(await page.locator('[data-africa-agri-footprint]').count(),0);
 const keyboard=page.locator('[data-africa-agri-pick="livestock-cattle"][tabindex="0"]').first();await keyboard.focus();assert.equal(await keyboard.evaluate(node=>getComputedStyle(node).outlineStyle),'none');assert.equal(await keyboard.getAttribute('role'),'button');assert((await keyboard.getAttribute('aria-label'))?.length>0);await page.keyboard.press('Enter');await waitAgriculture(page,'livestock-cattle');assert.equal((await state(page)).livestock,'cattle');assert.match(await page.locator('[data-theme-title]').textContent(),/牛/);assert.equal((await agricultureLayers(page)).filter(row=>row.visible).length,7);assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-africa-agri-pick')),'livestock-cattle','Map selection loses keyboard focus');
 await checkTabs(page,'topic',[['farming','ArrowRight','forestry']]);await settle(page);assert.equal(await page.locator('[data-africa-commodity-layer]:visible').count(),0);await checkTabs(page,'topic',[['forestry','Home','farming']]);await waitAgriculture(page);assert.equal((await agricultureLayers(page)).filter(row=>row.visible).length,7);
 await page.locator('[data-field=nature]').click();await page.locator('[data-reset]').click();await waitAfrica(page,'climate');await assertReaderUI(page);record.checks.push({check:'Keyboard livestock selection, forestry round trip and existing nature reset remain operable',status:'passed'});
 assert(reference,'US agriculture reference was not successfully rendered; Africa captures are retained for diagnosis');
}

async function usAgricultureReference(page,record){
 await open(page,'/atlas/north-america/agriculture/');await stableUS(page,record,'agriculture');const reference=await measure(page,'us');assertLayout(reference);record.measurements.push({scene:'agriculture-overview',...reference});await screenshot(page,record,'us-agriculture');
 await page.locator('[data-crop-key] [data-crop-select=rice]').click();await page.waitForFunction(()=>/米|稲/.test(document.querySelector('#agri-reading-heading')?.textContent??''));await stableUS(page,record,'agriculture');
 record.checks.push({check:'US rice selected under the same viewport, with real map rendering and matching reading',status:'passed',heading:await page.locator('#agri-reading-heading').textContent()});await screenshot(page,record,'us-agriculture-rice');
 const statistics=page.locator('[data-agri-statistics]');assert.equal(await statistics.isVisible(),true,'US selected rice statistics were not displayed');await page.locator('[data-agri-statistics-heading]').scrollIntoViewIfNeeded();await screenshot(page,record,'us-agriculture-lower',{preserveScroll:true});
 return reference;
}

async function mobileNoOverflow(page){
 const value=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight,scrollY}));assert(value.documentWidth<=value.viewportWidth+1,'Mobile page has horizontal overflow');return value;
}
async function mobileSourceReach(page){
 const lower=page.locator('.africa-secondary'),sources=lower.locator(':scope > details:has(.africa-sources)');
 if(!await sources.evaluate(node=>node.open))await sources.locator(':scope > summary').tap();
 for(const disclosure of await sources.locator('.africa-sources details').all())if(!await disclosure.evaluate(node=>node.open))await disclosure.locator(':scope > summary').tap();
 const last=sources.locator('.africa-sources a').last();await last.scrollIntoViewIfNeeded();
 const evidence=await last.evaluate(node=>{const r=node.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return{text:node.textContent,href:node.getAttribute('href'),x:r.x,y:r.y,width:r.width,height:r.height,viewportWidth:innerWidth,viewportHeight:innerHeight,hit:hit===node||node.contains(hit)};});
 assert(evidence.x>=0&&evidence.x+evidence.width<=evidence.viewportWidth+1&&evidence.y>=0&&evidence.y+evidence.height<=evidence.viewportHeight+1,'Final mobile source cannot be brought into view');assert.equal(evidence.hit,true,'Final mobile source is obscured');return evidence;
}
async function mobileLowerAgriculture(page,record){
 const lower=page.locator('.africa-secondary'),disclosure=lower.locator(':scope > details:has(.africa-reading)').first();
 if(!await disclosure.evaluate(node=>node.open))await disclosure.locator(':scope > summary').tap();
 await lower.locator('.africa-reading .africa-section-heading').evaluate(node=>node.scrollIntoView({block:'start'}));await settle(page);
 const evidence=await lower.locator('.africa-reading-field').filter({has:page.getByRole('heading',{name:'農林業',exact:true})}).locator('article').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{heading:node.querySelector('h3,h4')?.textContent,x:r.x,width:r.width,source:node.querySelector('a')?.getAttribute('href'),viewportWidth:innerWidth};}));
 assert(evidence.length>0);assert(evidence.every(row=>row.x>=0&&row.x+row.width<=row.viewportWidth+1&&row.source),'Mobile reading cards exceed the screen or lose their sources');await mobileNoOverflow(page);await screenshot(page,record,'africa-agriculture-lower',{preserveScroll:true});
 record.checks.push({check:'Mobile lower reading fits the viewport and final source is reachable without a desktop news-column assumption',status:'passed',readings:evidence,finalSource:await mobileSourceReach(page)});
}
async function mobileUsAgriculture(page,record){
 await open(page,'/atlas/north-america/agriculture/');await stableUS(page,record,'agriculture');record.measurements.push({scene:'mobile-overview',...await mobileNoOverflow(page)});await screenshot(page,record,'us-agriculture');
 await page.locator('.atlas-map-frame').evaluate(node=>node.scrollIntoView({block:'start'}));await screenshot(page,record,'us-agriculture-map',{preserveScroll:true});
 await page.locator('[data-crop-key] [data-crop-select=rice]').tap();await page.waitForFunction(()=>/米|稲/.test(document.querySelector('#agri-reading-heading')?.textContent??''));await stableUS(page,record,'agriculture');
 await page.locator('.atlas-map-frame').evaluate(node=>node.scrollIntoView({block:'start'}));await screenshot(page,record,'us-agriculture-rice',{preserveScroll:true});await page.locator('[data-agri-reading-panel]').evaluate(node=>node.scrollIntoView({block:'start'}));await screenshot(page,record,'us-agriculture-rice-reading',{preserveScroll:true});
 await mobileNoOverflow(page);await page.locator('[data-agri-overview-button]').tap();await page.locator('[data-agri-overview]').waitFor({state:'visible'});record.checks.push({check:'Mobile US rice is selected by touch, its map and reading are captured, and the overview return works',status:'passed'});
}
async function mobileAfricaAgriculture(page,record){
 await open(page,'/atlas/africa/?field=agriculture&zoom=all');await waitAgriculture(page);record.measurements.push({scene:'mobile-overview',...await mobileNoOverflow(page)});await screenshot(page,record,'africa-agriculture');
 const navigation=await agricultureNavigation(page),initial=await agricultureLayers(page);assert.deepEqual(initial.filter(row=>row.visible).map(row=>row.key).sort(),[...agricultureKeys].sort());
 await assertReaderUI(page);assert.equal(await page.locator('[data-africa-commodities] button').count(),0);
 await page.locator('.africa-map-frame').evaluate(node=>node.scrollIntoView({block:'start'}));await screenshot(page,record,'africa-agriculture-map',{preserveScroll:true});
 const rice='crop-rice-harvested',point=await pickAgriculture(page,rice,{touch:true});assert.equal((await state(page)).crop,'rice');assert.equal((await agricultureLayers(page)).filter(row=>row.visible).length,7);assert.match(await page.locator('[data-theme-title]').textContent(),/米|稲/);
 await page.locator('.africa-map-frame').evaluate(node=>node.scrollIntoView({block:'start'}));await screenshot(page,record,'africa-agriculture-rice',{preserveScroll:true});await page.locator('.africa-detail').evaluate(node=>node.scrollIntoView({block:'start'}));await screenshot(page,record,'africa-agriculture-rice-reading',{preserveScroll:true});await mobileNoOverflow(page);
 await page.locator('[data-africa-agri-only]').tap();await waitAgriculture(page,rice);assert.deepEqual((await agricultureLayers(page)).filter(row=>row.visible).map(row=>row.key),[rice]);await page.locator('[data-africa-agri-all]').tap();await waitAgriculture(page,rice);assert.equal((await agricultureLayers(page)).filter(row=>row.visible).length,7);
 await page.locator('[data-africa-agri-overview]').tap();await waitAgriculture(page);assert.equal(await page.locator('[data-africa-agri-footprint]').count(),0);await page.goBack();await waitAgriculture(page,rice);await page.reload();await waitAgriculture(page,rice);await mobileNoOverflow(page);
 const region=page.locator('[data-africa-agri-region]'),allView=await page.locator('.africa-map').getAttribute('viewBox');await region.selectOption('south');await settle(page);assert.notEqual(await page.locator('.africa-map').getAttribute('viewBox'),allView);await agricultureNavigation(page);await region.selectOption('all');await settle(page);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),allView);
 await mobileLowerAgriculture(page,record);record.measurements.push({scene:'mobile-final',...await mobileNoOverflow(page)});record.checks.push({check:'Mobile touch selection, explicit single display, all-distribution return, history, reload, regional fit and source reach work at 390 × 844',status:'passed',navigation,point});
}

async function industryOperations(page,record,reference){
 assert(reference,'US industry reference was not successfully rendered');await open(page,'/atlas/africa/?field=industry');await settle(page);await assertReaderUI(page);
 assert.equal(await page.locator('[data-africa-industry-location]').count(),11);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),'0 0 1100 907');assert.match(await page.locator('.africa-detail').innerText(),/原油/);assert.match(await page.locator('.africa-detail').innerText(),/未収録/);
 const measurement=await measure(page,'africa');record.measurements.push({scene:'industry',...measurement});assertLayout(measurement,reference);await readerEvidence(page,record,'industry-overview');await screenshot(page,record,'africa-industry');
 const quiet=page.locator('[data-africa-industry-location="accra"]');assert.equal(await quiet.locator('text').evaluate(node=>getComputedStyle(node).visibility),'hidden');
 await keyboardMapPick(page,'[data-africa-industry-location="accra"]');assert.equal((await state(page)).industryLocation,'accra');assert.equal(await quiet.locator('text').evaluate(node=>getComputedStyle(node).visibility),'visible');assert.match(await page.locator('.africa-detail').innerText(),/アクラ/);
 record.checks.push({check:'A quiet industry point remains keyboard selectable and reveals its own label and sourced reading',status:'passed',location:'accra'});
 const sampled=['zambia-copperbelt','casablanca-industry','lagos'];
 for(const id of sampled){const expected=africaIndustryLocations.find(row=>row.id===id);await keyboardMapPick(page,`[data-africa-industry-location="${id}"]`);assert.equal((await state(page)).industryLocation,id);const reading=await page.locator('.africa-detail').innerText();assert(reading.includes(expected.label));assert(reading.includes(expected.reading));assert(reading.includes(expected.note));const links=await page.locator('.africa-detail a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));assert(expected.sources.every(row=>links.includes(row.url)));assert.equal(await page.locator('[data-africa-industry-location]').count(),11);}
 await readerEvidence(page,record,'industry-selected');await screenshot(page,record,'africa-industry-selected');
 await page.goBack();assert.equal((await state(page)).industryLocation,'casablanca-industry');await page.goForward();await page.reload();await settle(page);assert.equal((await state(page)).industryLocation,'lagos');
 await page.locator('[data-africa-selection-return]').click();assert.equal((await state(page)).industryLocation,undefined);assert.equal(await page.locator('[data-africa-industry-location]').count(),11);
 await page.locator('[data-reset]').click();await waitAfrica(page,'climate');record.checks.push({check:'Eleven sourced representative locations preserve explicit missing coverage; mineral, manufacturing and urban readings match keyboard selection, history and reload',status:'passed',locations:africaIndustryLocations.map(({id,label,kind,themeId})=>({id,label,kind,themeId}))});
}

async function delayedAgriculture(page,record){
 for(const reset of [false,true]){
  let release,entered;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{entered=resolve;});
  await page.route('**/africa-crops-v1/rice-harvested.values.gz',async route=>{entered();await gate;await route.continue();});
  try{
   await open(page,'/atlas/africa/?field=agriculture');await Promise.race([requested,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Delayed original 5-arcminute crop grid never arrived')),30000);requested.finally(()=>clearTimeout(timer));})]);
   await page.locator('[data-africa-agri-label-text="crop-rice-harvested"]').first().click();await page.locator('[data-africa-agri-label-text="crop-wheat-harvested"]').first().click();
   if(reset){await page.locator('[data-field=nature]').click();await page.locator('[data-reset]').click();}
   const completed=page.waitForResponse(response=>response.url().endsWith('/africa-crops-v1/rice-harvested.values.gz'));release();await completed;
   if(reset){await waitAfrica(page,'climate');assert.equal(await page.locator('[data-africa-commodity-layer]').count(),0);assert.equal((await state(page)).field,'nature');}
   else{await waitAgriculture(page,'crop-wheat-harvested');assert.equal((await state(page)).crop,'wheat');assert.equal((await agricultureLayers(page)).filter(row=>row.visible).length,7);assert.equal((await state(page)).overview,'0');}
   record.checks.push({check:reset?'Delayed agriculture cannot undo field change and reset':'Delayed native grids follow the latest map label selection and retain all distributions',status:'passed'});
  }finally{release();await page.unroute('**/africa-crops-v1/rice-harvested.values.gz');}
 }
}

async function cultureGuide(page,record,topic,{touch=false}={}){
 await page.locator(`[data-africa-topic="${topic}"]`).click();await page.waitForFunction(()=>document.querySelector('[data-africa-atlas]')?.dataset.layerMode==='guide');await settle(page);await assertReaderUI(page);
 assert.equal(await page.locator('[data-africa-raster],[data-africa-layer-feature],[data-theme-mark]').count(),0,'A proposed alternative must not render an invented distribution');
 assert.equal(await page.locator('[data-africa-alternatives]').isVisible(),true,'Alternative proposals remain hidden');const cards=page.locator('[data-africa-alternatives] .africa-alternative');assert.equal(await cards.count(),topic==='ethnicity'?2:1);
 const proposals=[];
 for(const card of await cards.all()){
  assert.match(await card.innerText(),/案|代案/);const disclosure=card.locator('details');if(!await disclosure.evaluate(node=>node.open)){if(touch)await disclosure.locator('summary').tap();else await disclosure.locator('summary').click();}
  const text=await card.innerText();assert.match(text,/未取得|未実装|未実施/);const links=await card.locator('a').evaluateAll(nodes=>nodes.map(node=>({label:node.textContent,href:node.getAttribute('href')})));assert(links.length>=2&&links.every(row=>/^https:\/\//.test(row.href)),'Alternative has no primary-source/terms links');proposals.push({text,links});
 }
 assert.match(await page.locator('.africa-detail').innerText(),/この画面に分布図はありません|分布図は掲載していません/);await readerEvidence(page,record,topic);await screenshot(page,record,'africa-'+topic+'-alternatives');
 if(touch){await page.locator('[data-africa-alternatives]').scrollIntoViewIfNeeded();await screenshot(page,record,'africa-'+topic+'-reading',{preserveScroll:true});await mobileNoOverflow(page);}
 record.checks.push({check:'Culture alternative cards preserve source/terms, proposal status and explicit absence of implemented data',status:'passed',topic,proposals});
}
async function populationOperations(page,record,references){
 await open(page,populationRoute);await waitAfrica(page,'distribution');await assertReaderUI(page);
 const measurement=await measure(page,'africa');assertLayout(measurement,references.distribution);record.measurements.push({scene:'population',...measurement});assert.equal(await page.locator('[data-africa-layer-class]').count(),7);await readerEvidence(page,record,'population');await screenshot(page,record,'africa-population');
 const image=await page.locator('[data-africa-raster]').getAttribute('href');
 for(let i=0;i<7;i++){
  await page.locator(`[data-africa-layer-class="density-${i}"]`).click();await page.locator(`[data-africa-class-outline="density-${i}"]`).waitFor();assert.equal(await page.locator('[data-africa-raster]').getAttribute('href'),image);assert.equal(await page.locator('[data-africa-layer-class]').count(),7);
  const shape=await page.locator('[data-africa-class-outline]').evaluate(node=>({rectangles:node.querySelectorAll('rect').length,strokes:[...node.querySelectorAll('path')].map(path=>path.getAttribute('stroke'))}));assert.deepEqual(shape,{rectangles:0,strokes:['#ffffff','#183c4a']});
 }
 await page.goBack();await page.locator('[data-africa-class-outline="density-5"]').waitFor();await page.goForward();await page.reload();await waitAfrica(page,'distribution');await page.locator('[data-africa-class-outline="density-6"]').waitFor();
 for(const topic of ['ethnicity','religion'])await cultureGuide(page,record,topic);
 await checkTabs(page,'topic',[['religion','Home','distribution'],['distribution','ArrowRight','ethnicity'],['ethnicity','End','religion'],['religion','ArrowLeft','ethnicity'],['ethnicity','Home','distribution']]);await waitAfrica(page,'distribution');
 for(const field of ['nature','agriculture']){await page.locator(`[data-field="${field}"]`).click();await page.locator('[data-field="population"]').click();await waitAfrica(page,'distribution');await assertReaderUI(page);assert.equal(await page.locator('[data-africa-subfields]').count(),1);assert.equal(await page.locator('[data-africa-subfield-status]').count(),1);}
 await page.locator('[data-reset]').click();await waitAfrica(page,'climate');record.checks.push({check:'Seven density classes preserve full raster and legend; keyboard tabs, history, reload and field round trips preserve the reader without country comparison UI',status:'passed',originalRaster:image});
}

async function delayedRiver(page,record){
 for(const reset of [false,true]){
  let release,entered;const gate=new Promise(resolve=>{release=resolve;}),requested=new Promise(resolve=>{entered=resolve;});
  await page.route('**/africa-water-v1/rivers.geojson',async route=>{entered();await gate;await route.continue();});
  try{
   await open(page,riverRoute+'&river=nile');await Promise.race([requested,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Delayed river request never arrived')),30000);requested.finally(()=>clearTimeout(timer));})]);
   // River labels do not exist before source geometry arrives. Restore a newer
   // URL/history state while the original request is held, then verify its paint.
   await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('river','congo');history.pushState(null,'',url);dispatchEvent(new PopStateEvent('popstate'));});assert.equal((await state(page)).river,'congo');assert.equal(await page.locator('[data-africa-layer-feature]').count(),0);
   if(reset)await page.locator('[data-reset]').click();
   const completed=page.waitForResponse(response=>response.url().endsWith('/africa-water-v1/rivers.geojson'));release();await completed;
   if(reset){await waitAfrica(page,'climate');assert.equal((await state(page)).river,undefined);assert.equal(await page.locator('[data-africa-river]').count(),0);}else{await waitAfrica(page,'river');await assertRiver(page,'congo');}
   record.checks.push({check:reset?'Delayed source river geometry cannot undo reset':'Delayed source river geometry uses the newest restored URL selection',status:'passed'});
  }finally{release();await page.unroute('**/africa-water-v1/rivers.geojson');}
 }
}
async function mobileNatureReader(page,record){
 await open(page,'/atlas/africa/?field=nature&topic=climate');await waitAfrica(page,'climate');await assertReaderUI(page);await page.locator('[data-africa-climate-map-label]').first().waitFor();await readerEvidence(page,record,'climate-mobile-initial');await screenshot(page,record,'africa-climate-initial');await climateCity(page,record,{touch:true});await mobileNoOverflow(page);
 for(const id of ['addis-ababa','cape-town']){const city=africaClimateCities.find(row=>row.id===id),point=page.locator(`[data-africa-city-point="${id}"]`);await point.scrollIntoViewIfNeeded();await point.tap();const article=page.locator(`[data-africa-city-reading="${id}"]`);await article.waitFor({state:'visible'});assert.equal(await page.locator('[data-theme-title]').textContent(),`${city.name}の雨温図`);assert.equal(await page.locator('[data-theme-source]').getAttribute('href'),city.sourceUrl);await mobileNoOverflow(page);record.checks.push({check:`${city.name} mobile touch selection, matching source and no horizontal overflow`,status:'passed'});}
 await open(page,riverRoute);await waitAfrica(page,'river');await page.locator('[data-africa-river-label="nile"]').tap();await assertRiver(page,'nile');await page.locator('.africa-map-frame').scrollIntoViewIfNeeded();await screenshot(page,record,'africa-nile-mobile',{preserveScroll:true});await page.locator('.africa-detail').scrollIntoViewIfNeeded();await screenshot(page,record,'africa-nile-reading',{preserveScroll:true});await mobileNoOverflow(page);
 await open(page,populationRoute);await waitAfrica(page,'distribution');await cultureGuide(page,record,'ethnicity',{touch:true});await cultureGuide(page,record,'religion',{touch:true});await page.locator('[data-reset]').tap();await waitAfrica(page,'climate');
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
  for(const profile of elevationProfiles){
   let reference;
   await runCase(profile,'us-elevation',async(page,record)=>{await open(page,'/atlas/north-america/nature/?env=contour');await stableUS(page,record,'contour');reference=await measure(page,'us');assertLayout(reference);record.measurements.push({scene:'elevation',...reference});await screenshot(page,record,'us-elevation');});
   await runCase(profile,'africa-elevation',async(page,record)=>{await elevationOperations(page,record,reference);});
  }
  // Capture matched agriculture states at all three desktop widths, then exercise
  // the same source-driven reader at the mobile viewport and the other fields.
  for(const profile of agricultureProfiles){
   let agricultureReference;
   await runCase(profile,'us-agriculture',async(page,record)=>{agricultureReference=await usAgricultureReference(page,record);});
   await runCase(profile,'africa-agriculture',async(page,record)=>{await agricultureOperations(page,record,agricultureReference);});
  }
  await runCase(agricultureProfiles[0],'africa-delayed-agriculture',delayedAgriculture);
  await runCase(mobileProfile,'us-agriculture',mobileUsAgriculture);
  await runCase(mobileProfile,'africa-agriculture',mobileAfricaAgriculture);
  await runCase(mobileProfile,'us-climate',async(page,record)=>{await open(page,'/atlas/north-america/nature/?env=climate');await stableUS(page,record,'climate');await screenshot(page,record,'us-climate');await page.locator('.atlas-map-frame').scrollIntoViewIfNeeded();await screenshot(page,record,'us-climate-map',{preserveScroll:true});});
  await runCase(mobileProfile,'africa-nature-culture',mobileNatureReader);
  for(const profile of profiles){
   let waterReference,climateReference,industryReference;const populationReferences={};
   await runCase(profile,'us-climate',async(page,record)=>{await open(page,'/atlas/north-america/nature/?env=climate');await stableUS(page,record,'climate');climateReference=await measure(page,'us');assertLayout(climateReference);record.measurements.push({scene:'climate',...climateReference});await screenshot(page,record,'us-climate');});
   await runCase(profile,'africa-climate',async(page,record)=>{await climateOperations(page,record,climateReference);});
   await runCase(profile,'us-water',async(page,record)=>{await open(page,'/atlas/north-america/nature/?env=water');await stableUS(page,record,'water');waterReference=await measure(page,'us');assertLayout(waterReference);record.measurements.push({scene:'water',...waterReference});await screenshot(page,record,'us-water');});
   await runCase(profile,'africa-rivers',async(page,record)=>{await riverOperations(page,record,waterReference);assert(waterReference,'US water reference was not successfully rendered');});
   await runCase(profile,'us-industry',async(page,record)=>{await open(page,'/atlas/north-america/industry/');await stableUS(page,record,'industry');industryReference=await measure(page,'us');assertLayout(industryReference);record.measurements.push({scene:'industry',...industryReference});await screenshot(page,record,'us-industry');});
   await runCase(profile,'africa-industry',async(page,record)=>{await industryOperations(page,record,industryReference);});
   await runCase(profile,'us-population',async(page,record)=>{await open(page,'/atlas/north-america/population/');let previous;for(const topic of ['distribution','ethnicity','religion']){await page.locator(`[data-pop-view=${topic}]`).click();const digest=await stableUS(page,record,topic);if(previous)assert.notEqual(digest,previous,'Population tab changed without changing actual canvas paint');previous=digest;const measured=await measure(page,'us');assertLayout(measured);populationReferences[topic]=measured;record.measurements.push({topic,...measured});if(topic==='distribution')await screenshot(page,record,'us-population');}});
   await runCase(profile,'africa-population',async(page,record)=>{await populationOperations(page,record,populationReferences);for(const topic of ['distribution','ethnicity','religion'])assert(populationReferences[topic],`US ${topic} was not successfully rendered`);});
   if(profile.id===profiles[0].id){
    await runCase(profile,'africa-delayed-river',delayedRiver);
   }
  }
  assert.equal(report.cases.filter(record=>record.status!=='passed').length,0,'Browser review failed; inspect metadata and failure screenshots');for(const profile of agricultureProfiles)for(const region of ['us','africa'])for(const scene of ['agriculture','agriculture-rice','agriculture-lower'])assert(report.screenshots.some(row=>row.file===`${profile.id}-${region}-${scene}.png`),`Missing ${profile.id} ${region} ${scene} representative capture`);for(const region of ['us','africa'])for(const scene of ['agriculture','agriculture-map','agriculture-rice','agriculture-rice-reading'])assert(report.screenshots.some(row=>row.file===`${mobileProfile.id}-${region}-${scene}.png`),`Missing mobile ${region} ${scene} capture`);assert(report.screenshots.some(row=>row.file===`${mobileProfile.id}-africa-agriculture-lower.png`),'Missing mobile Africa lower reading capture');await climateReviewPair(['desktop1536-africa-climate-initial.png','desktop1536-africa-climate-bamako.png'],['初期表示','バマコの雨温図'],'africa-climate-initial-bamako-pair.png');await climateReviewPair(['desktop1536-africa-climate-addis-ababa.png','desktop1536-africa-climate-cape-town.png'],['アディスアベバ／ボレの雨温図','ケープタウン国際空港の雨温図'],'africa-climate-addis-cape-pair.png');report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack??String(error);process.exitCode=1;console.error(error);}
 finally{report.completedAt=new Date().toISOString();await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));await save();console.log(JSON.stringify({status:report.status,output,cases:report.cases.length,screenshots:report.screenshots.length}));}
}
await main();
