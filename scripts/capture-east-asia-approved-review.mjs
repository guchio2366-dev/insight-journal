#!/usr/bin/env node
// Actual sandboxed production-browser evidence for the approved East Asia scope.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
import {eastClusters,eastIndustries} from '../src/data/atlas/east-asia-industry-clusters.ts';
const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','east-asia-approved');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const results={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,browser:null,sandbox:true,fonts:process.env.REVIEW_JAPANESE_FONTS??execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}),externalAttempts:[],cases:[],images:[],status:'running'};
await mkdir(output,{recursive:true});
const save=async()=>{
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>東アジア・承認済み添削の実画面</title><style>body{font:14px/1.7 sans-serif;margin:24px;background:#f6f7f1}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}figure{margin:0;background:white;padding:12px}img{width:100%;height:auto}code{overflow-wrap:anywhere}</style><h1>東アジア・承認済み添削の実画面</h1><p>head: <code>'+results.head+'</code> · '+results.status+' · sandbox有効のChrome · PC 1440×1000 / 1024×768</p><p>初期／選択／戻る／タブ往復の検証記録は results.json。画像は実ブラウザーのキャプチャです。</p><main>'+results.images.map(i=>'<figure><figcaption>'+i.name+'</figcaption><a href="'+i.name+'"><img loading="lazy" src="'+i.name+'" alt="'+i.name+'"></a></figure>').join('')+'</main></html>';
 await writeFile(path.join(output,'index.html'),html);
};
async function serveBuild(){
 const root=await realpath(path.join(repo,'dist'));
 const server=createServer(async(req,res)=>{
  try{
   assert(['GET','HEAD'].includes(req.method));
   let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   assert(pathname.startsWith(basePath+'/'));pathname=pathname.slice(basePath.length);
   let file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+path.sep));
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   file=await realpath(file);assert(file.startsWith(root+path.sep));
   const body=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
  }catch{res.writeHead(404,{'Content-Type':'text/plain'}).end('Missing built asset');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}

let browser,host;
try{
 host=await serveBuild();
 assert(results.fonts.trim(),'Japanese fonts are required');
 assert(process.env.REVIEW_CHROME_PATH,'An already-installed Chrome is required');
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});
 results.browser=browser.version();
 for(const profile of [{name:'desktop',width:1440,height:1000},{name:'laptop',width:1024,height:768}]){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==host.origin){results.externalAttempts.push(url.origin+url.pathname);await route.abort('blockedbyclient');}else await route.continue();});
  await context.routeWebSocket('**/*',socket=>{results.externalAttempts.push(socket.url());socket.close();});
  async function ready(page){await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');}
  async function open(page,field,query=''){await page.goto(`${host.origin}${basePath}/atlas/asia/east-asia/${field}/${query}`,{waitUntil:'domcontentloaded'});await ready(page);}
  async function shot(page,id,fullPage=false,clip){const name=`${profile.name}-${id}.jpg`,file=path.join(output,name);await page.screenshot({path:file,type:'jpeg',quality:76,animations:'disabled',...(clip?{clip}:{fullPage})});const bytes=await readFile(file);results.images.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:page.url(),fullPage,clip:clip??null});}
  async function geometry(page){return page.evaluate(()=>{const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};const reading=document.querySelector('.asia-reading-panel');return {map:rect('.asia-map-frame'),reading:rect('.asia-reading-panel'),news:rect('.atlas-news'),readingOverflow:getComputedStyle(reading).overflowY,overflow:document.documentElement.scrollWidth>innerWidth};});}
  async function layout(page){const g=await geometry(page);assert.equal(g.overflow,false);assert(g.map.width>=300);assert(g.map.height>=320);assert(g.news.right<=g.map.left+1);assert(g.map.right<=g.reading.left+1);assert(['auto','scroll'].includes(g.readingOverflow));return g;}
  async function visibleReading(page,headingSelector,factSelector,reasonSelector){
   for(const selector of [headingSelector,factSelector,reasonSelector])assert(await page.locator(selector).isVisible(),selector+' must actually be visible');
   const evidence=await page.evaluate(({headingSelector,factSelector,reasonSelector})=>{
    const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right};};
    return {heading:box(headingSelector),facts:box(factSelector),reason:box(reasonSelector),panel:box('.asia-reading-panel')};
   },{headingSelector,factSelector,reasonSelector});
   assert(evidence.heading.top<evidence.facts.top&&evidence.facts.bottom<=evidence.reason.top,'facts precede the geographical explanation');
   assert(evidence.facts.top>=evidence.panel.top&&evidence.facts.bottom<=evidence.panel.bottom,'the complete initial summary fits inside the visible reading panel');
   assert(evidence.reason.top<evidence.panel.bottom,'the explanation starts in the initial reading viewport');return evidence;
  }
  async function industryLegend(page,names){
   const legend=page.locator('[data-reading-map-legend]');await page.waitForFunction(count=>document.querySelectorAll('[data-reading-map-legend] .asia-comparison-compact-key>span').length===count,names.length);
   assert(await legend.isVisible());const items=legend.locator('.asia-comparison-compact-key>span');assert.deepEqual(await items.allTextContents(),names.map(n=>n.label));assert.doesNotMatch(await legend.innerText(),/0未満|0以上0未満/);assert.match(await legend.innerText(),/一定サイズ.*数量/);
   for(const [index,kind] of names.entries()){
    const swatch=items.nth(index).locator('i'),mark=page.locator(`.east-industry-map-labels svg [data-industry="${kind.id}"]`).first();assert(await swatch.isVisible());assert(await mark.isVisible());assert.equal(await swatch.evaluate(n=>getComputedStyle(n).backgroundColor),await mark.evaluate(n=>getComputedStyle(n).fill),'the legend color matches '+kind.label+' on the map');
   }
  }
  async function industryLabels(page,kind=null){
   const rows=await page.locator('[data-industry-cluster]:visible').evaluateAll(nodes=>nodes.map(n=>{
    const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const primary=n.querySelector('[data-cluster-industries]'),city=n.querySelector('[data-cluster-city]'),primaryStyle=getComputedStyle(primary),cityStyle=getComputedStyle(city),anchor=JSON.parse(n.dataset.clusterAnchor),leader=document.querySelector(`line[data-cluster-leader="${n.dataset.industryCluster}"]`);
    return {id:n.dataset.industryCluster,box:box(n),primaryBox:box(primary),cityBox:box(city),city:city.textContent,industries:[...primary.children].map(e=>({id:e.dataset.industry,label:e.textContent,color:getComputedStyle(e,'::before').backgroundColor})),marks:[...document.querySelectorAll(`svg [data-cluster-mark="${n.dataset.industryCluster}"]`)].map(e=>({id:e.dataset.industry,color:getComputedStyle(e).fill})),font:{primary:parseFloat(primaryStyle.fontSize),city:parseFloat(cityStyle.fontSize),primaryWeight:parseInt(primaryStyle.fontWeight),cityWeight:parseInt(cityStyle.fontWeight)},clipped:primary.scrollWidth>primary.clientWidth+1||city.scrollWidth>city.clientWidth+1,anchor,leader:{x:Number(leader.getAttribute('x1')),y:Number(leader.getAttribute('y1')),length:Math.hypot(Number(leader.getAttribute('x2'))-anchor.x,Number(leader.getAttribute('y2'))-anchor.y)}};
   }));
   const expected=eastClusters.filter(c=>!kind||c.industries.includes(kind));assert.deepEqual(rows.map(r=>r.id).sort(),expected.map(c=>c.id).sort(),'all existing sites retain their labels');
   const frame=(await geometry(page)).map;
   for(const row of rows){
    const c=expected.find(c=>c.id===row.id),ids=c.industries.filter(id=>!kind||id===kind);assert.equal(row.city,c.name);assert.deepEqual(row.industries.map(i=>i.id),ids);assert.deepEqual(row.industries.map(i=>i.label),ids.map(id=>eastIndustries.find(i=>i.id===id).label));assert.deepEqual(row.marks.map(i=>i.id),ids);
    for(const industry of row.industries)assert.equal(industry.color,row.marks.find(m=>m.id===industry.id).color,'each industry name matches its own site marker');
    assert(row.font.primary>row.font.city&&row.font.primaryWeight>=700&&row.font.cityWeight<=400,'industry names have priority over auxiliary city names');assert(row.primaryBox.bottom<=row.cityBox.top+.5,'industry name precedes the city');assert.equal(row.clipped,false,'the complete name is readable');
    assert(row.box.left>=frame.left&&row.box.right<=frame.right&&row.box.top>=frame.top&&row.box.bottom<=frame.bottom,'labels stay inside the map');assert.deepEqual(row.leader.x,row.anchor.x);assert.deepEqual(row.leader.y,row.anchor.y);assert(row.leader.length>=7,'a leader identifies the original site');
    for(const other of rows.filter(r=>r.id!==row.id))assert(!(row.box.left<other.box.right&&row.box.right>other.box.left&&row.box.top<other.box.bottom&&row.box.bottom>other.box.top),'industry labels do not overlap: '+row.id+'/'+other.id);
   }return rows;
  }
  async function rainfallLeaders(page){
   const evidence=await page.evaluate(()=>{
    const overlay=document.querySelector('[data-map-annotations]').getBoundingClientRect();
    return [...document.querySelectorAll('.asia-rain-label[data-contour-label-id]')].filter(n=>!n.hidden).map(n=>{
     const anchor=JSON.parse(n.dataset.contourAnchor),box=n.getBoundingClientRect(),line=document.querySelector(`line[data-rainfall-label="${n.dataset.contourLabelId}"]`),x2=Number(line.getAttribute('x2')),y2=Number(line.getAttribute('y2'));
     return {value:n.textContent,anchor:{x:anchor.x+overlay.left,y:anchor.y+overlay.top},box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},length:Math.hypot(x2-anchor.x,y2-anchor.y)};
    });
   });
   for(const row of evidence){assert(row.length>=10,'a rainfall leader must have visible length: '+JSON.stringify(row));assert(!(row.anchor.x>=row.box.left&&row.anchor.x<=row.box.right&&row.anchor.y>=row.box.top&&row.anchor.y<=row.box.bottom),'labels must leave their contour anchor uncovered');}
   for(const value of ['4,500','5,500']){
    const row=evidence.find(r=>r.value===value);assert(row,'high rainfall contour has a callout');assert(row.length>=14,'small rain areas keep extra clearance');
    const left=Math.max(0,Math.floor(Math.min(row.anchor.x,row.box.left)-30)),top=Math.max(0,Math.floor(Math.min(row.anchor.y,row.box.top)-30)),right=Math.min(profile.width,Math.ceil(Math.max(row.anchor.x,row.box.right)+30)),bottom=Math.min(profile.height,Math.ceil(Math.max(row.anchor.y,row.box.bottom)+30));
    await shot(page,'rainfall-'+value.replace(',','')+'-callout',false,{x:left,y:top,width:right-left,height:bottom-top});
   }return evidence;
  }
  async function stations(page){return page.locator('[data-station]:visible').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.station,x:n.style.left,y:n.style.top})).sort((a,b)=>a.id.localeCompare(b.id)));}
  async function sameStations(page,before,message){const after=await stations(page);assert.deepEqual(after.map(x=>x.id),before.map(x=>x.id),message);for(const row of after){const old=before.find(x=>x.id===row.id);assert(Math.abs(parseFloat(row.x)-parseFloat(old.x))<=.5&&Math.abs(parseFloat(row.y)-parseFloat(old.y))<=.5,message+': '+JSON.stringify({id:row.id,before:old,after:row}));}}
  async function run(name,action){const record={profile:profile.name,name,passed:false,errors:[],failedRequests:[]};results.cases.push(record);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>record.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)record.failedRequests.push({url:new URL(r.url()).pathname,status:r.status()});});try{record.evidence=await action(page);assert.deepEqual(record.errors,[]);assert.deepEqual(record.failedRequests,[]);record.passed=true;}catch(e){record.failure=e.stack??String(e);record.url=page.url();record.geometry=await geometry(page).catch(()=>null);console.log(JSON.stringify(record));await shot(page,name+'-failure').catch(()=>{});}finally{await page.close();await save();}console.log(`${record.passed?'PASS':'FAIL'} ${profile.name} ${name}${record.failure?': '+record.failure.split('\n')[0]:''}`);}
  await run('climate',async page=>{
   await open(page,'nature');const initial=await layout(page),before=await stations(page);assert(before.length>0);await shot(page,'climate-initial');
   await page.locator('[data-station="tokyo"]').click();await ready(page);const selected=page.locator('[data-city-panel="tokyo"]');assert.equal(await selected.isVisible(),true);assert.match(await selected.locator('h2').textContent(),/東京の雨温図/);assert.match(await selected.locator('[data-city-class-description]').textContent(),/0℃超.*22℃以上.*40mm未満/);const text=await selected.textContent();assert.match(text,/秋雨前線.*台風/);assert.match(text,/西高東低.*山地/);assert.match(text,/関東平野/);assert.doesNotMatch(text,/長江|黄河|二期作/);await sameStations(page,before,'Tokyo must preserve all geographic station positions');await shot(page,'climate-tokyo');
   await page.reload();await ready(page);await sameStations(page,before,'Reload selected Tokyo retains whole-region camera');
   await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await selected.isVisible(),false);await page.locator('[data-field="natural"]').first().click();await ready(page);await sameStations(page,before,'Tab round trip retains camera');
   await page.goBack();await ready(page);assert.equal(await selected.isVisible(),false);
   return {initial,stationPositionsBefore:before,selectedCamera:'same projected positions before, after selection, reload and tab round trip'};
  });
  await run('population',async page=>{
   await open(page,'population');const initial=await layout(page);const reading=await visibleReading(page,'[data-population-title]','[data-population-takeaway]','[data-population-detail]');assert.match(await page.locator('[data-population-takeaway]').textContent(),/四川盆地.*成都.*重慶.*武漢.*西安/);assert.match(await page.locator('[data-population-detail]').textContent(),/灌漑農業.*工業化/);const helper=page.locator('.population-picker');assert.equal(await helper.isVisible(),true);assert(await helper.evaluate(n=>Boolean(n.closest('[data-asia-map-items]'))));await shot(page,'population-initial');
   const city=page.locator('[data-map-urban]:visible').first(),id=await city.getAttribute('data-map-urban');await city.click();await ready(page);assert.match(await page.locator('[data-population-title]').textContent(),/人口/);const camera=new URL(page.url()).searchParams;assert(camera.has('z'));await shot(page,'population-selected');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);
   await page.locator('[data-field="industry"]').first().click();await ready(page);assert.equal(await helper.isVisible(),false);await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await helper.isVisible(),true);return {initial,city:id,reading};
  });
  await run('industry',async page=>{
   await open(page,'industry');const initial=await layout(page);
   await industryLegend(page,eastIndustries);assert.equal(new URL(page.url()).searchParams.get('topic'),'east-clusters');
   const host=page.locator('[data-east-cluster-reading]');assert.equal(await host.isVisible(),true);assert.match(await host.textContent(),/台湾/);assert.equal(await page.locator('[data-east-industry-journey]').isVisible(),false);
   const initialLabels=await industryLabels(page);await shot(page,'industry-initial');const selectedLabels={};
   for(const kind of eastIndustries){
    await page.locator(`[data-industry-feature="east-${kind.id}"]`).click();await ready(page);await industryLegend(page,[kind]);
    selectedLabels[kind.id]=await industryLabels(page,kind.id);await shot(page,`industry-${kind.id}-selected`);
   }
   await page.locator('[data-industry-feature="east-chips"]').click();await ready(page);assert.match(await host.locator('[data-east-cluster-title]').textContent(),/半導体/);
   await page.locator('[data-industry-cluster="hsinchu"]').click();await ready(page);assert.match(await host.locator('[data-east-cluster-detail]').textContent(),/新竹/);await industryLabels(page,'chips');await shot(page,'industry-chips-hsinchu');
   await page.goBack();await ready(page);assert.equal(await host.locator('[data-east-cluster-detail]').isVisible(),false);
   await page.locator('[data-field="natural"]').first().click();await ready(page);assert.equal(await host.isVisible(),false);
   await page.locator('[data-field="industry"]').first().click();await ready(page);assert.equal(await host.isVisible(),true);await industryLabels(page);
   return {initial,initialLabels,selectedLabels};
  });
  await run('farming',async page=>{
   await open(page,'agriculture');const initial=await layout(page),section=page.locator('[data-east-farm-foundations]');const reading=await visibleReading(page,'[data-farm-insight-title]','[data-farm-insight-lead]','[data-farm-overview-reading]>h3+p');assert.equal(await section.isVisible(),true);const text=await section.textContent();assert.match(text,/供給と用途.*域外輸出入相手.*カロリー構成/s);assert.doesNotMatch(text,/丸太生産量|全商品輸出先|丸太・製材の供給/);assert.match(text,/未収録/);assert.match(await page.locator('[data-farm-overview-reading]').textContent(),/日本.*朝鮮半島.*モンゴル/s);await shot(page,'farming-initial');await section.scrollIntoViewIfNeeded();await shot(page,'farming-statistics');
   await page.locator('[data-farm-choice="rice"]').first().click();await ready(page);assert.doesNotMatch(await section.textContent(),/丸太生産量|全商品輸出先/);await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.get('topic')??'overview','overview');assert.equal(await page.locator('[data-farm-overview-reading]').isVisible(),true);await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await section.isVisible(),false);await page.locator('[data-field="agriculture"]').first().click();await ready(page);assert.equal(await section.isVisible(),true);return {initial,missingDataExplicit:true,reading};
  });
  await run('rainfall',async page=>{
   await open(page,'nature','?topic=precipitation');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');const initial=await layout(page);assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/山.*内陸/s);assert.match(await page.locator('[data-hydrology-legend-note]').textContent(),/1981–2010.*1991–2020/);const labels=page.locator('.asia-rain-label:visible');const numbers=await labels.allTextContents();assert(numbers.includes('4,500'),'4500 line needs a visible label');assert(numbers.includes('5,500'),'5500 line needs a visible label');const callouts=await rainfallLeaders(page);await shot(page,'rainfall-initial');await page.locator('.asia-rain-label:visible').filter({hasText:'4,500'}).click();await ready(page);assert.match(await page.locator('[data-hydrology-value]').textContent(),/mm\/年/);await shot(page,'rainfall-selected');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('at'),false);await page.locator('[data-field="population"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);return {initial,labels:numbers,callouts};
  });
  await run('basins',async page=>{
   await open(page,'nature','?topic=basins');const names=['長江','黄河','タリム川','アムール川'];for(const name of names)await page.locator('.asia-river-label').filter({hasText:name}).waitFor({state:'visible'});const initial=await layout(page);assert.equal(await page.locator('[data-basin-shortcuts]').isVisible(),false);assert.match(await page.locator('[data-hydrology-lead]').textContent(),/長江.*黄河.*アムール.*タリム/s);await shot(page,'basins-initial');await page.locator('.asia-river-label').filter({hasText:'黄河'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'b-4060007850');assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/青海.*渤海.*灌漑/s);await shot(page,'basins-yellow');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);await page.locator('[data-field="agriculture"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);assert.equal(await page.locator('.asia-river-label').filter({hasText:'黄河'}).isVisible(),false);await page.locator('[data-natural-group="water"]').click();await ready(page);await page.locator('[data-water-view="basins"]').click();await ready(page);for(const name of names)assert.equal(await page.locator('.asia-river-label:visible').filter({hasText:name}).count(),1);return {initial,riverNames:names};
  });
  await context.close();
 }
 results.status=results.cases.every(c=>c.passed)&&results.externalAttempts.length===0?'passed':'failed';await save();assert.equal(results.status,'passed','See results.json and failure images');
}finally{await save();await browser?.close();await new Promise(resolve=>host?.server.close(resolve)??resolve());}
