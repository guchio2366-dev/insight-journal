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
import {eastCultureExamples} from '../src/data/atlas/east-asia-cultural-geography.ts';
import {eastAsiaReligionCountries,eastAsiaReligionColors,eastAsiaChinaReligionMeasures} from '../src/data/atlas/east-asia-religion.ts';
const repo=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(repo,'review-artifacts','east-asia-approved');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const results={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,browser:null,sandbox:true,fonts:process.env.REVIEW_JAPANESE_FONTS??execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}),externalAttempts:[],cases:[],images:[],status:'running'};
await mkdir(output,{recursive:true});
const save=async()=>{
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
 const html='<!doctype html><html lang="ja"><meta charset="utf-8"><title>東アジア・承認済み添削の実画面</title><style>body{font:14px/1.7 sans-serif;margin:24px;background:#f6f7f1}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}figure{margin:0;background:white;padding:12px}img{width:100%;height:auto}code{overflow-wrap:anywhere}</style><h1>東アジア・承認済み添削の実画面</h1><p>head: <code>'+results.head+'</code> · '+results.status+' · sandbox有効のChrome · PC 1920×1080・100%・DPR1</p><p>本番比較元: <code>'+(results.production?.commitSha??'未取得')+'</code></p><p>初期／選択／戻る／タブ往復の検証記録は results.json。画像は実ブラウザーのキャプチャです。</p><main>'+results.images.map(i=>'<figure><figcaption>'+i.name+'</figcaption><a href="'+i.name+'"><img loading="lazy" src="'+i.name+'" alt="'+i.name+'"></a></figure>').join('')+'</main></html>';
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
 if(process.env.REVIEW_PRODUCTION_BASE_URL){
  const base=process.env.REVIEW_PRODUCTION_BASE_URL.replace(/\/$/,'');const origin=new URL(base).origin;
  const response=await fetch(base+'/_release.json');assert(response.ok,'production release metadata must be readable');results.production=await response.json();
  const baseline=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});
  await baseline.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort('blockedbyclient'));
  const page=await baseline.newPage();
  for(const [id,field,query] of [['climate','nature',''],['population','population',''],['industry','industry',''],['agriculture','agriculture',''],['forestry','agriculture','?topic=forest'],['rainfall','nature','?topic=precipitation'],['basins','nature','?topic=basins'],['landforms','nature','?topic=landform']]){
   await page.goto(base+'/atlas/asia/east-asia/'+field+'/'+query,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');
   const name='production-'+id+'.jpg';await page.screenshot({path:path.join(output,name),type:'jpeg',quality:70,animations:'disabled'});
   const bytes=await readFile(path.join(output,name));results.images.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:page.url(),role:'production-before'});
  }
  await baseline.close();await save();
 }

 for(const profile of [{name:'desktop',width:1920,height:1080},...(process.env.REVIEW_SMALL_PC==='1'?[{name:'laptop',width:1024,height:768}]:[])]){
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
   if(!kind)return industryOverviewLabels(page);
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
  async function industryOverviewLabels(page){
   const groups=await page.locator('[data-industry-group]:visible').evaluateAll(nodes=>nodes.map(n=>{
    const r=n.getBoundingClientRect(),primary=n.querySelector('[data-cluster-industries]');
    return {id:n.dataset.industryGroup,sites:JSON.parse(n.dataset.groupSites),members:JSON.parse(n.dataset.groupMembers),box:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},industries:[...primary.children].map(s=>({id:s.dataset.industry,label:s.textContent,color:getComputedStyle(s,'::before').backgroundColor})),rows:new Set([...primary.children].map(child=>Math.round(child.getBoundingClientRect().top))).size,primarySize:parseFloat(getComputedStyle(primary).fontSize),primaryWeight:parseInt(getComputedStyle(primary).fontWeight),clipped:n.scrollWidth>n.clientWidth+1,leaders:[...document.querySelectorAll(`line[data-group-leader="${n.dataset.industryGroup}"]`)].map(l=>({id:l.dataset.clusterLeader,from:{x:Number(l.getAttribute('x1')),y:Number(l.getAttribute('y1'))},to:{x:Number(l.getAttribute('x2')),y:Number(l.getAttribute('y2'))}}))};
   }));
   const points=await page.locator('.east-industry-group-point:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.industryCluster,aria:n.getAttribute('aria-label'),x:(r.left+r.right)/2,y:(r.top+r.bottom)/2};}));
   assert.equal(groups.length,9,'nearby sites share nine initial industry labels');assert.deepEqual(groups.flatMap(g=>g.members).sort(),eastClusters.map(c=>c.id).sort());assert.deepEqual(points.map(p=>p.id).sort(),eastClusters.map(c=>c.id).sort(),'every original geographic point stays selectable');
   const frame=(await geometry(page)).map,origin=await page.locator('.east-industry-map-labels').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top};}),allLeaders=groups.flatMap(g=>g.leaders.map(l=>({...l,group:g.id}))),lengths=[];
   const intersects=(a,b,c,d)=>{const turn=(x,y,z)=>(y.x-x.x)*(z.y-x.y)-(y.y-x.y)*(z.x-x.x);return turn(a,b,c)*turn(a,b,d)<-.001&&turn(c,d,a)*turn(c,d,b)<-.001;};
   for(const g of groups){
    const members=g.members.map(id=>eastClusters.find(c=>c.id===id));assert.equal(new Set(members.map(c=>c.country)).size,1,'groups stay within the same country/region');
    const kinds=eastIndustries.filter(i=>members.some(c=>c.industries.includes(i.id)));assert.deepEqual(g.industries.map(i=>i.id),kinds.map(i=>i.id));assert.deepEqual(g.industries.map(i=>i.label),kinds.map(i=>i.label));assert(g.primarySize>=12&&g.primaryWeight>=700);assert.equal(g.clipped,false);if(profile.width>=1600)assert(g.rows<=2,'initial industry labels use at most two rows while retaining every industry: '+g.id+' rows='+g.rows);assert(g.box.left>=frame.left&&g.box.right<=frame.right&&g.box.top>=frame.top&&g.box.bottom<=frame.bottom);
    assert.deepEqual(g.leaders.map(l=>l.id).sort(),g.members.toSorted());
    for(const site of g.sites){
     const point=points.find(p=>p.id===site.id),c=members.find(c=>c.id===site.id),leader=g.leaders.find(l=>l.id===site.id);assert.match(point.aria,new RegExp(c.name));assert(Math.abs(point.x-origin.left-site.anchor.x)<.5&&Math.abs(point.y-origin.top-site.anchor.y)<.5,'point remains at its original projected position');assert.deepEqual(leader.from,site.anchor);
     const length=Math.hypot(leader.to.x-leader.from.x,leader.to.y-leader.from.y);lengths.push(length);assert(length>=7&&length<=66.5,'initial labels stay within 66px of every assigned site: '+site.id+' '+length);
     const marks=page.locator(`.east-industry-map-labels svg [data-cluster-mark="${site.id}"]`);assert.deepEqual(await marks.evaluateAll(nodes=>nodes.map(n=>n.dataset.industry)),c.industries);
     for(const id of c.industries){const mark=page.locator(`.east-industry-map-labels svg [data-cluster-mark="${site.id}"][data-industry="${id}"]`);assert.equal(await mark.evaluate(n=>getComputedStyle(n).fill),g.industries.find(i=>i.id===id).color);}
    }
    for(const other of groups.filter(o=>o.id!==g.id)){
     assert(!(g.box.left<other.box.right&&g.box.right>other.box.left&&g.box.top<other.box.bottom&&g.box.bottom>other.box.top),'group labels do not overlap');
     const b={left:other.box.left-origin.left,right:other.box.right-origin.left,top:other.box.top-origin.top,bottom:other.box.bottom-origin.top},edges=[[{x:b.left,y:b.top},{x:b.right,y:b.top}],[{x:b.right,y:b.top},{x:b.right,y:b.bottom}],[{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}],[{x:b.left,y:b.bottom},{x:b.left,y:b.top}]];
     for(const l of g.leaders)assert(!edges.some(([a,b])=>intersects(l.from,l.to,a,b)),'leaders do not pass through another label');
    }
    for(const p of points)assert(!(p.x>g.box.left-5&&p.x<g.box.right+5&&p.y>g.box.top-5&&p.y<g.box.bottom+5),'group labels do not cover geographic points');
   }
   for(const a of allLeaders)for(const b of allLeaders.filter(b=>b.group!==a.group))assert(!intersects(a.from,a.to,b.from,b.to),'leaders of different groups do not cross: '+a.id+'/'+b.id);
   return {groups,pointCount:points.length,maxLeader:Math.max(...lengths),crossings:0};
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
  async function religionAreas(page){
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.settlementStatus==='ready');
   assert.equal(await page.locator('.asia-religion-marker:visible').count(),0);
   const names=await page.locator('.asia-settlement-label:visible').allTextContents();assert(names.some(n=>n.includes('仏教'))&&names.some(n=>n.includes('イスラム')));
   const rendered=Number(await page.locator('[data-asia-atlas]').getAttribute('data-settlement-features'));assert(rendered>0,'regional source polygons are actually rendered');
   const bars=page.locator('[data-settlement-reading="religion"] .asia-religion-measure');assert.equal(await bars.count(),4);
   for(const [index,country] of eastAsiaReligionCountries.entries())assert.deepEqual(await bars.nth(index).locator('span').evaluateAll(nodes=>nodes.map(n=>Number(n.style.flexGrow))),country.shares.filter(c=>c[2]>0).map(c=>c[2]));
   return {names,rendered,nationalStatistics:'four independent country rows in the right panel'};
  }
  async function sameStations(page,before,message){
   const expected=before.map(x=>x.id);
   await page.waitForFunction(ids=>{
    const actual=[...document.querySelectorAll('[data-station]')].filter(n=>!n.hidden&&n.getClientRects().length).map(n=>n.dataset.station).sort();
    return actual.length===ids.length&&actual.every((id,index)=>id===ids[index]);
   },expected);
   const after=await stations(page);assert.deepEqual(after.map(x=>x.id),expected,message);
   for(const row of after){const old=before.find(x=>x.id===row.id);assert(Math.abs(parseFloat(row.x)-parseFloat(old.x))<=.5&&Math.abs(parseFloat(row.y)-parseFloat(old.y))<=.5,message+': '+JSON.stringify({id:row.id,before:old,after:row}));}
  }
  async function run(name,action){const record={profile:profile.name,name,passed:false,errors:[],failedRequests:[]};results.cases.push(record);const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>record.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)record.failedRequests.push({url:new URL(r.url()).pathname,status:r.status()});});try{record.evidence=await action(page);assert.deepEqual(record.errors,[]);assert.deepEqual(record.failedRequests.filter(r=>!(record.expectedFailedPaths??[]).includes(r.url)),[]);record.passed=true;}catch(e){record.failure=e.stack??String(e);record.url=page.url();record.geometry=await geometry(page).catch(()=>null);console.log(JSON.stringify(record));await shot(page,name+'-failure').catch(()=>{});}finally{await page.close();await save();}console.log(`${record.passed?'PASS':'FAIL'} ${profile.name} ${name}${record.failure?': '+record.failure.split('\n')[0]:''}`);}
  async function cultureReferences(page,topic){
   const expected=eastCultureExamples.filter(example=>example.topic===topic);
   const refs=await page.locator('.asia-culture-label:visible').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {id:n.dataset.culturePoint,text:n.textContent,anchor:JSON.parse(n.dataset.cultureAnchor),box:{left:b.left,top:b.top,right:b.right,bottom:b.bottom}};}));
   assert.deepEqual(refs.map(r=>r.id).sort(),expected.map(r=>r.id).sort(),'all sourced domestic examples appear in the initial map');
   const frame=(await geometry(page)).map,camera=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),origin=await page.locator('[data-map-annotations]').boundingBox(),viewport=await page.locator('[data-map-surface]').evaluate(n=>({width:n.clientWidth,height:n.clientHeight})),world=512*2**camera.zoom,merc=lat=>.5-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI);assert(origin);
   const cards=await page.locator('.asia-religion-marker:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));
   for(const ref of refs){const example=expected.find(e=>e.id===ref.id);assert.equal(ref.text,example.label);assert(Math.abs(ref.anchor.x-(viewport.width/2+(example.point[0]-camera.lng)/360*world))<.1&&Math.abs(ref.anchor.y-(viewport.height/2+(merc(example.point[1])-merc(camera.lat))*world))<.1,'cultural point stays at the source location');assert(!cards.some(b=>origin.x+ref.anchor.x>=b.left&&origin.x+ref.anchor.x<=b.right&&origin.y+ref.anchor.y>=b.top&&origin.y+ref.anchor.y<=b.bottom),'national cards do not conceal source points');assert(ref.box.left>=frame.left&&ref.box.right<=frame.right&&ref.box.top>=frame.top&&ref.box.bottom<=frame.bottom);for(const other of [...refs.filter(r=>r.id!==ref.id).map(r=>r.box),...cards])assert(!(ref.box.left<other.right&&ref.box.right>other.left&&ref.box.top<other.bottom&&ref.box.bottom>other.top),'regional cultural labels avoid each other and country cards');}
   const articles=page.locator(`[data-east-culture-examples="${topic}"] [data-east-culture-example]`);assert.equal(await articles.count(),expected.length);
   for(const example of expected)assert.equal(await page.locator(`[data-east-culture-example="${example.id}"] a`).getAttribute('href'),example.source.url);
   return refs;
  }
  await run('coast-startup-and-selection',async page=>{
   const samples=[];
   const old=await readFile(path.join(repo,'public/assets/atlas/asia-geography-v1.json'));
   for(const variant of ['previous-coarse','regional-1500m'])for(let sample=0;sample<3;sample++){
    if(variant==='previous-coarse')await page.route('**/east-asia-v2/coast.json',route=>route.fulfill({contentType:'application/json',body:old}));else await page.unroute('**/east-asia-v2/coast.json');
    const started=performance.now();await open(page,'nature');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.coastStatus==='ready');const startup=performance.now()-started;
    const before=JSON.parse(await page.locator('[data-map-camera]').getAttribute('data-map-camera')),selectStart=performance.now();await page.locator('[data-station="tokyo"]').click();await page.locator('[data-city-panel="tokyo"]').waitFor({state:'visible'});await ready(page);const selected=performance.now()-selectStart;assert.deepEqual(JSON.parse(await page.locator('[data-map-camera]').getAttribute('data-map-camera')),before);samples.push({variant,sample,startupMs:startup,selectionMs:selected,mapLoadMs:Number(await page.locator('[data-map-load-ms]').getAttribute('data-map-load-ms'))});
   }
   await page.unroute('**/east-asia-v2/coast.json');return {method:'same final application, viewport, browser and fresh navigation; substitute the actual previous coarse source only; three samples per source, includes readiness and network-idle wait; no speed claim from byte counts',samples};
  });
  await run('static-elevation',async page=>{
   await open(page,'nature','?topic=terrain&place=CHN&detail=sichuan-basin&lng=118&lat=32&z=3.2');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.equal(new URL(page.url()).searchParams.get('detail'),null);assert.equal(await page.locator('[data-physical-value]').isVisible(),false);assert.equal(await page.locator('[data-physical-focus]').isVisible(),false);const before=page.url();await page.locator('.maplibregl-canvas').click({position:{x:220,y:240}});assert.equal(page.url(),before);await shot(page,'elevation-initial');await page.reload();await ready(page);assert.equal(await page.locator('[data-physical-value]').isVisible(),false);return {backgroundSelection:false,intervalMetres:500};
  });
  await run('ethnicity',async page=>{
   await open(page,'population');await page.locator('[data-population-group="identity"][data-topic="ethnicity"]').click();await ready(page);const initial=await layout(page),refs=await cultureReferences(page,'ethnicity');
   const expected=['チベット系','ウイグル系','モンゴル系','カザフ系','チワン族','台湾先住民族','アイヌ','沖縄の集団'];
   assert.deepEqual((await page.locator('.asia-settlement-label:visible').allTextContents()).sort(),expected.sort(),'all retained sourced East Asia groups remain named initially');
   const camera=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));
   const sameStoredCamera=async()=>{const actual=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));const stored=c=>[c.lng.toFixed(5),c.lat.toFixed(5),c.zoom.toFixed(3)];assert.deepEqual(stored(actual),stored(camera),'camera is preserved at the public URL serialization precision');};await shot(page,'ethnicity-initial');const box=(await geometry(page)).map;await shot(page,'ethnicity-initial-map',false,{x:box.left,y:box.top,width:box.width,height:box.height});
   await page.locator('.asia-settlement-label:visible').filter({hasText:'チワン族'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'ethnicity-4');assert(await page.locator('[data-settlement-detail="ethnicity-4"]').isVisible());assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),camera);await shot(page,'ethnicity-selected');
   await page.reload();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'ethnicity-4');assert(await page.locator('[data-settlement-detail="ethnicity-4"]').isVisible());await sameStoredCamera();await shot(page,'ethnicity-reloaded');
   await page.locator('[data-settlement-clear]:visible').click();await ready(page);await cultureReferences(page,'ethnicity');assert.deepEqual((await page.locator('.asia-settlement-label:visible').allTextContents()).sort(),expected,'all source labels return after clearing the selection');await sameStoredCamera();await shot(page,'ethnicity-restored');
   await page.locator('[data-field="industry"]').first().click();await ready(page);assert.equal(await page.locator('.asia-culture-label:visible').count(),0);await page.locator('[data-field="population"]').first().click();await ready(page);await page.locator('[data-population-group="identity"][data-topic="ethnicity"]').click();await ready(page);await cultureReferences(page,'ethnicity');assert.deepEqual((await page.locator('.asia-settlement-label:visible').allTextContents()).sort(),expected,'all source labels return after the tab round trip');await sameStoredCamera();await shot(page,'ethnicity-tab-restored');return {initial,refs,selection:'ethnicity-4',camera:'unchanged',journey:['initial','selection','reload','clear','tab-round-trip']};
  });
  await run('religion',async page=>{
   await open(page,'population');await page.locator('[data-population-group="religion"]').click();await ready(page);const initial=await layout(page),areas=await religionAreas(page),refs=await cultureReferences(page,'religion'),reading=page.locator('[data-settlement-reading="religion"]');assert(await reading.isVisible());
   const text=await reading.innerText();assert.match(text,/2023年.*18歳以上/s);assert.match(text,/15歳以上.*59.4％.*40.6％.*分母.*換算/s);assert.match(text,/28\/31省級地域.*新疆・チベット・海南/s);
   for(const m of eastAsiaChinaReligionMeasures)assert(text.includes(m.question)&&text.includes(m.value+'％'));assert.match(text,/帰属と信仰・実践を同じ宗教構成へ足しません/);assert.match(await page.locator('[data-grid-reading]').innerText(),/宗教文化圏/);
   await shot(page,'religion-initial');const mapBox=(await geometry(page)).map;await shot(page,'religion-initial-map',false,{x:mapBox.left,y:mapBox.top,width:mapBox.width,height:mapBox.height});
   const camera=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));
   await page.locator('[data-culture-point="niigata-shrines"]:visible').click();assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),camera);await shot(page,'religion-domestic-reading');
   await page.locator('.asia-settlement-label:visible').filter({hasText:'仏教'}).click();await ready(page);const detail=page.locator('[data-settlement-detail="religion-1"]');assert(await detail.isVisible());assert.match(await detail.innerText(),/GeoEPR.*全住民.*割合/s);assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),camera);assert.equal(await page.locator('.asia-religion-marker:visible').count(),0);await religionAreas(page);await cultureReferences(page,'religion');await detail.scrollIntoViewIfNeeded();await shot(page,'religion-selected');
   await page.reload();await ready(page);assert(await detail.isVisible());await page.locator('[data-settlement-reading="religion"] [data-settlement-clear]:visible').click();await ready(page);await religionAreas(page);
   await page.locator('[data-field="industry"]').first().click();await ready(page);await industryLegend(page,eastIndustries);await industryLabels(page);assert.equal(await page.locator('.asia-religion-marker:visible').count(),0);
   await page.locator('[data-field="population"]').first().click();await ready(page);await page.locator('[data-population-group="religion"]').click();await ready(page);await religionAreas(page);return {initial,areas,selectedCamera:camera,regionalReferences:refs,sourceData:'regional official examples plus four independent published composition rows; China questions remain independent'};
  });
  await run('climate',async page=>{
   await open(page,'nature');const initial=await layout(page),before=await stations(page);assert.equal(before.length,13);const physicalNames=await page.locator('.asia-geographic-name:visible').allTextContents();assert(physicalNames.includes('チベット高原'));assert(physicalNames.every(n=>['チベット高原','四川盆地','華北平原','モンゴル高原','北アルプス','中央山脈'].includes(n)));await shot(page,'climate-initial');
   await page.locator('[data-station="tokyo"]').click();await ready(page);const selected=page.locator('[data-city-panel="tokyo"]');assert.equal(await selected.isVisible(),true);assert.match(await selected.locator('h2').textContent(),/東京―日本の雨温図/);assert.match(await selected.locator('[data-city-class-description]').textContent(),/0℃超.*22℃以上.*乾燥帯B/);const text=await selected.textContent();assert.match(text,/秋雨前線.*台風/);assert.match(text,/西高東低.*山地/);assert.match(text,/関東平野/);assert.doesNotMatch(text,/長江|黄河|二期作/);await sameStations(page,before,'Tokyo must preserve all geographic station positions');await shot(page,'climate-tokyo');
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   assert.match(await selected.locator('[data-climate-place]').textContent(),/東京―日本の雨温図/);
   for(const city of ['beijing','tokyo']){await page.locator('[data-city-select]').selectOption(city);await ready(page);assert.equal(new URL(page.url()).searchParams.get('place'),null);await sameStations(page,before,'Foreign city switches preserve geographic station positions');}
   await page.reload();await ready(page);await sameStations(page,before,'Reload selected Tokyo retains whole-region camera');
   await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await selected.isVisible(),false);await page.locator('[data-field="natural"]').first().click();await ready(page);await sameStations(page,before,'Tab round trip retains camera');
   await page.goBack();await ready(page);assert.equal(await selected.isVisible(),false);
   return {initial,stationPositionsBefore:before,selectedCamera:'same projected positions before, after selection, reload and tab round trip'};
  });
  await run('city-country-city',async page=>{
   await open(page,'nature');await page.locator('[data-station="tokyo"]').click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('place'),null);
   await page.locator('[data-country-select]').selectOption('CHN');await ready(page);assert.equal(new URL(page.url()).searchParams.get('place'),'CHN');assert.equal(new URL(page.url()).searchParams.get('city'),null);
   const countryCamera=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),before=await stations(page);
   await page.locator('[data-city-select]').selectOption('seoul');await ready(page);assert.equal(new URL(page.url()).searchParams.get('city'),'seoul');assert.equal(new URL(page.url()).searchParams.get('place'),null);assert(await page.locator('[data-city-panel="seoul"]').isVisible());await sameStations(page,before,'a foreign city after explicit China selection keeps geographic station positions');
   assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),countryCamera);await shot(page,'city-country-foreign-city');
   await page.reload();await ready(page);assert.equal(new URL(page.url()).searchParams.get('city'),'seoul');assert.equal(new URL(page.url()).searchParams.get('place'),null);await sameStations(page,before,'foreign city reload preserves the preceding explicit-country camera');assert(await page.locator('[data-city-panel="seoul"]').isVisible());await shot(page,'city-country-foreign-reload');return {sequence:['tokyo','CHN','seoul','reload'],countryCamera,stationPositions:before};
  });
  await run('climate-data-failure',async page=>{
   await open(page,'nature');const before=await stations(page),loaded=await page.locator('[data-asia-atlas]').getAttribute('data-map-load-ms');
   const record=results.cases.at(-1);record.expectedFailedPaths=[basePath+'/assets/atlas/asia-climate-v2/east-asia.uint8.gz'];
   await page.route('**/east-asia.uint8.gz',route=>route.fulfill({status:503,body:'intentional grid failure'}));
   await page.locator('[data-station="tokyo"]').click();await page.locator('[data-city-panel="tokyo"] [data-city-grid-retry]').waitFor({state:'visible'});
   assert.match(await page.locator('[data-city-panel="tokyo"] [data-city-grid-state]').innerText(),/雨温図.*掲載済み.*気候区分を取得できません/);
   assert.equal(await page.locator('[data-map-fallback]').isVisible(),false);assert.equal(await page.locator('[data-map-retry]').isVisible(),false);
   assert(await page.locator('[data-city-panel="tokyo"] [data-climate-plot]').isVisible());await sameStations(page,before,'classification failure preserves the rendered map');await shot(page,'climate-grid-failure');
   await page.unroute('**/east-asia.uint8.gz');await page.locator('[data-city-panel="tokyo"] [data-city-grid-retry]').click();
   await page.waitForFunction(()=>document.querySelector('[data-city-panel="tokyo"] [data-city-class-code]').textContent==='Cfa');
   assert.equal(await page.locator('[data-asia-atlas]').getAttribute('data-map-load-ms'),loaded);return {fault:'intentional HTTP503 for the classification grid only',retry:'restored Cfa without re-creating map'};
  });
  await run('population',async page=>{
   await open(page,'population');const initial=await layout(page);const reading=await visibleReading(page,'[data-population-title]','[data-population-takeaway]','[data-population-detail]');assert.match(await page.locator('[data-population-takeaway]').textContent(),/四川盆地.*成都.*重慶.*武漢.*西安/);assert.match(await page.locator('[data-population-detail]').textContent(),/灌漑農業.*工業化/);const helper=page.locator('.population-picker');assert.equal(await helper.isVisible(),true);assert(await helper.evaluate(n=>Boolean(n.closest('[data-asia-map-items]'))));await shot(page,'population-initial');
   const city=page.locator('[data-urban-point]:visible').first(),id=await city.getAttribute('data-urban-point');await city.click();await ready(page);assert.match(await page.locator('[data-population-title]').textContent(),/人口/);const camera=new URL(page.url()).searchParams;assert(camera.has('z'));await shot(page,'population-selected');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);
   await page.locator('[data-field="industry"]').first().click();await ready(page);assert.equal(await helper.isVisible(),false);await page.locator('[data-field="population"]').first().click();await ready(page);assert.equal(await helper.isVisible(),true);return {initial,city:id,reading};
  });
  await run('industry',async page=>{
   await open(page,'industry');const initial=await layout(page);
   await industryLegend(page,eastIndustries);assert.equal(new URL(page.url()).searchParams.get('topic'),'east-clusters');
   const host=page.locator('[data-east-cluster-reading]');assert.equal(await host.isVisible(),true);assert.match(await host.textContent(),/台湾/);assert.equal(await page.locator('[data-east-industry-journey]').isVisible(),false);
   const initialLabels=await industryLabels(page);await shot(page,'industry-initial');const mapBox=(await geometry(page)).map;await shot(page,'industry-initial-map',false,{x:mapBox.left,y:mapBox.top,width:mapBox.width,height:mapBox.height});
   await page.locator('[data-industry-cluster="hsinchu"]').click();await ready(page);assert.match(await host.locator('[data-east-cluster-detail]').textContent(),/新竹/);await industryLabels(page);await page.goBack();await ready(page);assert.equal(await host.locator('[data-east-cluster-detail]').isVisible(),false);const selectedLabels={};
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
   await open(page,'nature','?topic=precipitation');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.contourBandStatus==='ready');const initial=await layout(page);assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/山.*内陸/s);assert.match(await page.locator('[data-hydrology-legend-note]').textContent(),/1981–2010.*1991–2020/);const labels=page.locator('.asia-rain-label:visible');const numbers=await labels.allTextContents();assert(numbers.includes('4,500'),'4500 line needs a visible label');assert(numbers.includes('5,500'),'5500 line needs a visible label');const callouts=await rainfallLeaders(page);await shot(page,'rainfall-initial');await page.locator('.asia-rain-label:visible').filter({hasText:'4,500'}).click();await ready(page);await page.waitForFunction(()=>/mm\/年/.test(document.querySelector('[data-hydrology-value]')?.textContent??''));assert.match(await page.locator('[data-hydrology-value]').textContent(),/mm\/年/);await shot(page,'rainfall-selected');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('at'),false);await page.locator('[data-field="population"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);return {initial,labels:numbers,callouts};
  });
  await run('basins',async page=>{
   await open(page,'nature','?topic=basins');const names=['長江','黄河','タリム川','アムール川'];for(const name of names)await page.locator('.asia-river-label').filter({hasText:name}).waitFor({state:'visible'});const initial=await layout(page);assert.equal(await page.locator('[data-basin-shortcuts]').isVisible(),false);assert.match(await page.locator('[data-hydrology-lead]').textContent(),/長江.*黄河.*アムール.*タリム/s);await shot(page,'basins-initial');await page.locator('.asia-river-label').filter({hasText:'黄河'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'b-4060007850');assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/青海.*渤海.*灌漑/s);await shot(page,'basins-yellow');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);await page.locator('[data-field="agriculture"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);assert.equal(await page.locator('.asia-river-label:visible').filter({hasText:'黄河'}).count(),0);await page.locator('[data-natural-group="water"]').click();await ready(page);await page.locator('[data-water-view="basins"]').click();await ready(page);for(const name of names)assert.equal(await page.locator('.asia-river-label:visible').filter({hasText:name}).count(),1);return {initial,riverNames:names};
  });
  await run('river-name-selection',async page=>{
   await open(page,'nature','?topic=water');const yellow=page.locator('.asia-river-label:visible').filter({hasText:'黄河'});await yellow.waitFor();const before=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));assert.equal(await page.locator('.asia-city-name:visible').count(),0);const cityPoints=page.locator('[data-east-water-city]');assert(await cityPoints.count()>0);assert.equal(await cityPoints.first().locator('span').isVisible(),false);await cityPoints.first().focus();assert(await cityPoints.first().locator('span').isVisible());await shot(page,'water-hover-city');await page.locator('[data-map-title]').click();await shot(page,'water-initial');
   await yellow.click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'rivers-213');assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/青海.*渤海.*灌漑/s);assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),before);await shot(page,'water-yellow');
   await page.reload();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'rivers-213');await page.goBack();await ready(page);assert.equal(new URL(page.url()).searchParams.has('detail'),false);
   await page.locator('[data-field="agriculture"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);return {river:'rivers-213',camera:'unchanged',reload:true,back:true};
  });
  await run('river-line-selection',async page=>{
   await open(page,'nature','?topic=water');const camera=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));
   const data=JSON.parse(await readFile(path.join(repo,'public/assets/atlas/asia-physical-v1/east-asia.water.json'),'utf8')),river=data.features.find(f=>f.properties.id==='rivers-213');assert(river);
   const canvas=page.locator('.maplibregl-canvas'),box=await canvas.boundingBox();assert(box);const world=512*2**camera.zoom,merc=lat=>.5-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/(2*Math.PI);
   const occupied=await page.locator('.asia-map-annotations button:visible,.maplibregl-control-container button:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left-5,top:r.top-5,right:r.right+5,bottom:r.bottom+5};}));
   const coords=river.geometry.type==='MultiLineString'?river.geometry.coordinates.flat():river.geometry.coordinates;
   const candidates=coords.map(point=>({point,x:box.width/2+(point[0]-camera.lng)/360*world,y:box.height/2+(merc(point[1])-merc(camera.lat))*world})).filter(p=>p.x>40&&p.x<box.width-40&&p.y>40&&p.y<box.height-40&&!occupied.some(b=>box.x+p.x>=b.left&&box.x+p.x<=b.right&&box.y+p.y>=b.top&&box.y+p.y<=b.bottom)).sort((a,b)=>(a.point[0]-105)**2+(a.point[1]-36)**2-((b.point[0]-105)**2+(b.point[1]-36)**2));assert(candidates.length);
   const chosen=candidates[0];await canvas.click({position:{x:chosen.x,y:chosen.y}});await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'rivers-213','normal pointer click on an original yellow-river vertex selects its source feature');assert.match(await page.locator('[data-hydrology-scene-reading]').textContent(),/青海.*渤海.*灌漑/s);assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),camera);await shot(page,'water-yellow-direct-line');return {source:'Natural Earth original Yellow River vertex',coordinate:chosen.point,pointer:{x:chosen.x,y:chosen.y},camera:'unchanged'};
  });
  await run('forestry',async page=>{
   await open(page,'agriculture');await page.locator('[data-farm-group="forestry"]').click();await ready(page);await page.locator('[data-east-forest-flows] .east-bar').first().waitFor();
   assert.match(await page.locator('[data-farming-takeaway]').textContent(),/中国東北部.*南部.*朝鮮半島.*モンゴル/);assert.match(await page.locator('[data-east-forest-reason]').textContent(),/乾燥内陸.*水の制約/);const sites=page.locator('[data-forest-site]:visible');assert.equal(await sites.count(),4);const before=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));await shot(page,'forest-map');await sites.filter({hasText:'石巻工場'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('place'),'JPN');assert(page.url().includes('/east-asia/'));assert.match(await page.locator('[data-farming-takeaway]').textContent(),/天然林と人工林/);assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),before);assert.equal(await sites.count(),4);await shot(page,'forest-japan-selected');await page.reload();await ready(page);assert.equal(new URL(page.url()).searchParams.get('place'),'JPN');await page.goBack();await ready(page);const section=page.locator('[data-east-farm-foundations]');await section.scrollIntoViewIfNeeded();await shot(page,'forest-statistics');
   assert.match(await section.innerText(),/北朝鮮.*モンゴル/s);assert.match(await page.locator('[data-east-export-partners]').innerText(),/HS44.*2023年/s);
   assert.match(await page.locator('[data-east-world-share]').innerText(),/森林面積.*千ha/s);assert.equal(await section.locator('.east-pie').count(),0);
   await page.goBack();await ready(page);return {reporters:6,woodPartners:'missing; all-goods pie removed'};
  });
  await run('landform-extents',async page=>{
   await open(page,'nature','?topic=landform');await page.locator('.asia-landform-label:visible').filter({hasText:'四川盆地'}).waitFor();
   const named=await page.locator('.asia-geographic-name:visible,.asia-river-label:visible').allTextContents();for(const name of ['長江','黄河','タリム川','アムール川','黒潮','親潮','対馬暖流','北西季節風','黄海','東シナ海','日本海','太平洋'])assert(named.includes(name),'major proper name is visible: '+name);await shot(page,'landforms-initial');const camera=JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera'));
   await page.locator('.asia-landform-label:visible').filter({hasText:'四川盆地'}).click();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'sichuan-basin');assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.deepEqual(JSON.parse(await page.locator('[data-asia-atlas]').getAttribute('data-map-camera')),camera);await shot(page,'landforms-sichuan');
   await page.reload();await ready(page);assert.equal(new URL(page.url()).searchParams.get('detail'),'sichuan-basin');
   await page.locator('[data-field="population"]').first().click();await ready(page);await page.locator('[data-field="natural"]').first().click();await ready(page);return {extents:9,geometry:'unmodified Natural Earth geographic region polygons'};
  });
  await context.close();
 }
 results.status=results.cases.every(c=>c.passed)&&results.externalAttempts.length===0?'passed':'failed';await save();assert.equal(results.status,'passed','See results.json and failure images');
}finally{await save();await browser?.close();await new Promise(resolve=>host?.server.close(resolve)??resolve());}
