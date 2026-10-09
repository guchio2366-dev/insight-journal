#!/usr/bin/env node
// Focused evidence only: ordinary clicks, with no capture-time scrolling.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';
const repo=fileURLToPath(new URL('../',import.meta.url));
const applicationHead=process.env.REVIEW_APPLICATION_HEAD;
assert(applicationHead,'Record the approved application head explicitly');
execFileSync('git',['diff','--exit-code',applicationHead,'HEAD','--','src','public','astro.config.mjs','package.json','package-lock.json'],{cwd:repo});
const output=path.join(repo,'review-artifacts','east-religion-click');
const basePath=`/${String(astroConfig.base??'').replace(/^\/+|\/+$/g,'')}`.replace(/^\/$/,'');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const results={applicationHead,evidenceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,sandbox:true,captureScroll:false,externalAttempts:[],cases:[],images:[],status:'running'};
await mkdir(output,{recursive:true});
async function save(){
 await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
 await writeFile(path.join(output,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><title>宗教クリック直後と産業復帰</title><style>body{font:14px/1.7 sans-serif;margin:24px;background:#f6f7f1}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}figure{margin:0;background:white;padding:12px}img{width:100%}code{overflow-wrap:anywhere}</style><h1>宗教クリック直後と産業復帰</h1><p>application head: <code>'+applicationHead+'</code> · '+results.status+' · sandbox有効 · 1440×1000 / 1024×768</p><p>通常クリック以外のスクロール、撮影用scrollIntoView、全ページ撮影なし。限定事例を一覧で開いた直後→地図上の別の名称をクリックした直後→その状態から産業へ戻った直後。</p><main>'+results.images.map(i=>'<figure><figcaption>'+i.name+'</figcaption><a href="'+i.name+'"><img src="'+i.name+'" alt="'+i.name+'"></a></figure>').join('')+'</main>');
}
let browser,server;
try{
 const root=await realpath(path.join(repo,'dist'));
 server=createServer(async(req,res)=>{try{
  assert(['GET','HEAD'].includes(req.method));let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);assert(pathname.startsWith(basePath+'/'));pathname=pathname.slice(basePath.length);
  let file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);assert(file.startsWith(root+path.sep));
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end('Missing built asset');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin=`http://127.0.0.1:${server.address().port}`;
 assert(execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}).trim(),'Japanese fonts are required');assert(process.env.REVIEW_CHROME_PATH,'Installed Chrome is required');
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});results.browser=browser.version();
 for(const profile of [{name:'desktop',width:1440,height:1000},{name:'laptop',width:1024,height:768}]){
  const record={profile,passed:false,errors:[],failedRequests:[],steps:[],assertionFailures:[]};results.cases.push(record);
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin){results.externalAttempts.push(url.origin+url.pathname);await route.abort('blockedbyclient');}else await route.continue();});
  await context.routeWebSocket('**/*',socket=>{results.externalAttempts.push(socket.url());socket.close();});
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>record.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)record.failedRequests.push({url:new URL(r.url()).pathname,status:r.status()});});
  const ready=async()=>{await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);await page.evaluate(()=>document.fonts.ready);await page.waitForLoadState('networkidle');};
  const shot=async id=>{const name=profile.name+'-'+id+'.jpg',file=path.join(output,name);await page.screenshot({path:file,type:'jpeg',quality:78,animations:'disabled',fullPage:false});const bytes=await readFile(file);results.images.push({name,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,url:page.url(),viewport:profile,fullPage:false});};
  const state=async(detail=null)=>page.evaluate(detail=>{
   const box=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const root=document.querySelector('[data-asia-atlas]'),panel=document.querySelector('.asia-reading-panel'),article=detail?document.querySelector('[data-settlement-detail="'+detail+'"]'):null;
   const query=new URL(location.href).searchParams;
   return {url:location.href,window:{x:scrollX,y:scrollY,width:innerWidth,height:innerHeight},panel:{box:box(panel),scrollTop:panel.scrollTop,position:getComputedStyle(panel).position},layout:box(document.querySelector('.asia-layout')),mapPanel:box(document.querySelector('.asia-map-panel')),map:box(document.querySelector('.asia-map-frame')),camera:root.dataset.mapCamera?JSON.parse(root.dataset.mapCamera):null,urlCamera:{lng:query.get('lng'),lat:query.get('lat'),z:query.get('z')},detail:article?{id:detail,hidden:article.hidden,heading:{text:article.querySelector('h2').textContent,box:box(article.querySelector('h2'))},paragraphs:[...article.querySelectorAll('p')].map(n=>({text:n.textContent,box:box(n)}))}:null,industry:{groups:document.querySelectorAll('[data-industry-group]').length,points:[...document.querySelectorAll('.east-industry-group-point')].map(n=>{const r=n.getBoundingClientRect(),f=document.querySelector('.asia-map-frame').getBoundingClientRect();return {id:n.dataset.industryCluster,x:(r.left+r.right)/2-f.left,y:(r.top+r.bottom)/2-f.top};}).sort((a,b)=>a.id.localeCompare(b.id)),title:document.querySelector('[data-east-cluster-title]')?.textContent,titleBox:box(document.querySelector('[data-east-cluster-title]')),facts:document.querySelector('[data-east-cluster-lead]')?.textContent,factsBox:box(document.querySelector('[data-east-cluster-lead]'))},overflow:document.documentElement.scrollWidth>innerWidth};
  },detail);
  const assertAnswer=e=>{
   const within=b=>b&&b.top>=Math.max(0,e.panel.box.top)-1&&b.bottom<=Math.min(profile.height,e.panel.box.bottom)+1&&b.left>=e.panel.box.left-1&&b.right<=Math.min(profile.width,e.panel.box.right)+1;
   assert(e.detail&&!e.detail.hidden);assert(within(e.detail.heading.box),'selected heading is inside the actual viewport and reading panel');assert(within(e.detail.paragraphs[0].box),'the complete selected answer is visible without capture scrolling');
   const scope=e.detail.paragraphs.find(p=>p.text.includes('GeoEPR'));assert(scope);assert(within(scope.box),'the GeoEPR scope is visible with the selected answer');assert.equal(e.overflow,false);
  };
  try{
   await page.goto(`${origin}${basePath}/atlas/asia/east-asia/industry/`,{waitUntil:'domcontentloaded'});await ready();await page.waitForFunction(()=>document.querySelectorAll('[data-industry-group]').length===9&&document.querySelectorAll('.east-industry-group-point').length===23);record.industryBaseline=await state();
   await page.locator('[data-field="population"]').first().click();await ready();await page.locator('[data-population-group="religion"]').click();await ready();const religionInitial=await state();record.religionInitial=religionInitial;
   await page.locator('.asia-settlement-cases summary').click();await page.locator('[data-settlement-topic="religion"][data-settlement-choice="religion-0"]').click();await ready();
   await shot('religion-list-click-immediate');const list=await state('religion-0');record.steps.push({action:'ordinary click on GeoEPR case in the map legend',...list});try{assertAnswer(list);}catch(e){record.assertionFailures.push({step:'list-click',error:e.message});}assert.deepEqual(list.camera,religionInitial.camera);
   // Select a different case by its real map name; do not invoke a controller or force a click.
   await page.locator('.asia-settlement-label').filter({hasText:'仏教'}).first().click();await ready();
   await shot('religion-map-click-immediate');const selected=await state('religion-1');record.steps.push({action:'ordinary click on 仏教 on the map',...selected});try{assertAnswer(selected);}catch(e){record.assertionFailures.push({step:'map-click',error:e.message});}assert.match(selected.detail.heading.text,/仏教/);assert.deepEqual(selected.camera,religionInitial.camera);
   await page.locator('[data-field="industry"]').first().click();await ready();await page.waitForFunction(()=>document.querySelectorAll('[data-industry-group]').length===9&&document.querySelectorAll('.east-industry-group-point').length===23);
   await shot('industry-return-immediate');const returned=await state();record.steps.push({action:'ordinary industry-tab click directly from selected religion',...returned});assert.equal(returned.industry.groups,9);assert.equal(returned.industry.points.length,23);
   for(const p of returned.industry.points){const previous=record.industryBaseline.industry.points.find(b=>b.id===p.id);assert(previous);assert(Math.abs(p.x-previous.x)<.6&&Math.abs(p.y-previous.y)<.6,'industry restores the same whole-region projected point positions: '+p.id);}
   assert.match(returned.industry.title,/産業/);assert(returned.industry.titleBox.top>=Math.max(0,returned.panel.box.top)-1&&returned.industry.titleBox.bottom<=Math.min(profile.height,returned.panel.box.bottom)+1,'industry answer heading is visible on return');assert(returned.industry.factsBox.top>=Math.max(0,returned.panel.box.top)-1&&returned.industry.factsBox.bottom<=Math.min(profile.height,returned.panel.box.bottom)+1,'industry summary is fully visible on return');assert.equal(returned.overflow,false);assert.deepEqual(record.errors,[]);assert.deepEqual(record.failedRequests,[]);assert.deepEqual(record.assertionFailures,[],'all immediate answers are visible');record.passed=true;
  }catch(error){record.failure=error.stack??String(error);await shot('failure').catch(()=>{});console.log(JSON.stringify(record));}finally{await context.close();await save();}
  console.log(`${record.passed?'PASS':'FAIL'} ${profile.name} ordinary religion map click and direct industry return${record.failure?': '+record.failure.split('\n')[0]:''}`);
 }
 results.status=results.cases.every(c=>c.passed)&&results.externalAttempts.length===0?'passed':'failed';await save();assert.equal(results.status,'passed','See immediate viewport images and results.json');
}finally{await save();await browser?.close();await new Promise(resolve=>server?.close(resolve)??resolve());}
