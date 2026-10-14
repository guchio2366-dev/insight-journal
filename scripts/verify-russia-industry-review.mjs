#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {execFileSync} from 'node:child_process';
import config from '../astro.config.mjs';
import {ruIndustries,ruSites,ruSectors} from '../src/data/atlas/russia-industry-catalog.ts';
const dist=path.resolve('dist'),output=path.resolve('review-artifacts/russia-industry'),base=String(config.base??'').replace(/\/$/,'');
await mkdir(output,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sandboxRequired:true,status:'running',cases:[],screenshots:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
const server=createServer(async(req,res)=>{try{let url=new URL(req.url,'http://local').pathname;if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);assert(file.startsWith(dist+'/'));res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}${base}/atlas/russia/industry/`;
const settle=async page=>{await page.waitForFunction(()=>document.querySelector('[data-ru-industry]')?.dataset.ruReady==='true');await page.evaluate(()=>document.fonts.ready);};
const positions=page=>page.locator('[data-ru-label]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.ruLabel,x:n.style.left,y:n.style.top})));
async function boxes(page){
 const data=await page.locator('[data-ru-canvas]').evaluate(canvas=>{
  const offset=canvas.getBoundingClientRect(),box=n=>{const b=n.getBoundingClientRect();return{x:b.x-offset.x,y:b.y-offset.y,w:b.width,h:b.height};};
  return {width:canvas.clientWidth,height:canvas.clientHeight,labels:[...canvas.querySelectorAll('[data-ru-label]')].map(n=>({id:n.dataset.ruLabel,...box(n),titleFits:n.querySelector('strong').scrollWidth<=n.querySelector('strong').clientWidth})),points:[...canvas.querySelectorAll('[data-ru-hit]')].map(box)};
 });
 const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
 for(let i=0;i<data.labels.length;i++){
  const a=data.labels[i];assert(a.titleFits,'Industry name clipped: '+a.id);assert(a.x>=0&&a.y>=0&&a.x+a.w<=data.width+1&&a.y+a.h<=data.height+1,'Label outside map: '+a.id);
  for(let j=i+1;j<data.labels.length;j++)assert(!intersects(a,data.labels[j]),'Labels overlap: '+a.id+'/'+data.labels[j].id);
  for(const p of data.points)assert(!intersects(a,p),'Label covers source point: '+a.id);
 }
 for(let i=0;i<data.points.length;i++)for(let j=i+1;j<data.points.length;j++){
  const a=data.points[i],b=data.points[j];assert(Math.hypot(a.x+a.w/2-b.x-b.w/2,a.y+a.h/2-b.y-b.h/2)>=24,'Source point hit targets overlap');
 }
 return data;
}
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH||'/usr/bin/chromium',chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 for(const [profile,width,height,mobile]of [['1920',1920,1080,false],['1440',1440,900,false],['1024',1024,768,false],['390',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce',locale:'ja-JP'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'?keep=source#reference');await settle(page);
  const sectors=[];
  for(const sector of ruSectors){
   await page.locator(`button[data-ru-sector="${sector.id}"]`).click();
   const before=await positions(page),measurements=await boxes(page),items=ruIndustries.filter(i=>i.sectors.includes(sector.id));
   assert.equal(measurements.labels.length,items.length);
   await page.locator('[data-ru-canvas]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${profile}-${sector.id}.png`)});report.screenshots.push(`${profile}-${sector.id}.png`);
   for(const item of items){
    await page.locator(`[data-ru-products="${sector.id}"] [data-ru-product="${item.id}"]`).click();
    assert.equal(new URL(page.url()).searchParams.get('industry'),item.id);assert.equal(await page.locator('[data-ru-title]').innerText(),item.name);
    assert.deepEqual(await positions(page),before,'Selection moved a label');
    assert.equal(await page.locator(`[data-ru-stat="${item.id}"]`).getAttribute('open'),'');
   }
   await page.locator('[data-ru-clear]').click();
   const markers=await page.locator('[data-ru-marker]').evaluateAll(nodes=>nodes.map(n=>n.dataset.ruMarker));
   for(const id of markers){
    const marker=page.locator(`[data-ru-marker="${id}"]`);await marker.locator('[data-ru-hit]').click();assert.equal(await page.locator('[data-ru-selected]').isVisible(),true);
    const selected=ruSites.find(s=>s.id===new URL(page.url()).searchParams.get('site'));assert(selected);assert.equal(await page.locator('[data-ru-site-title]').innerText(),selected.place);
    assert.deepEqual(await positions(page),before);
   }
   const details=page.locator('.ru-reading details');await details.locator('summary').click();
   const choices=await page.locator('[data-ru-site-choice]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.ruSiteChoice,n.dataset.ruSiteProduct]));
   for(const [site,product]of choices){await page.locator(`[data-ru-site-choice="${site}"][data-ru-site-product="${product}"]`).click();assert.equal(new URL(page.url()).searchParams.get('site'),site);}
   await details.locator('summary').click();
   await page.locator('[data-ru-only]').check();assert.equal(new URL(page.url()).searchParams.get('only'),'1');
   await page.reload();await settle(page);assert.equal(await page.locator('[data-ru-only]').isChecked(),true);
   await page.locator('[data-ru-clear]').click();assert.equal(new URL(page.url()).searchParams.has('industry'),false);
   sectors.push({id:sector.id,products:items.length,siteProductChoices:choices.length,measurements});
  }
  await page.locator('button[data-ru-sector=resources]').click();await page.locator('[data-ru-products=resources] [data-ru-product=diamond]').click();await page.locator('[data-ru-products=resources] [data-ru-product=helium]').click();await page.goBack();await settle(page);assert.equal(new URL(page.url()).searchParams.get('industry'),'diamond');
  await page.locator('button[data-ru-sector=resources]').focus();await page.keyboard.press('ArrowRight');assert.equal(new URL(page.url()).searchParams.get('sector'),'manufacturing');
  const marker=page.locator('[data-ru-marker="omsk-refining"]');await marker.focus();await page.keyboard.press('Space');assert.equal(new URL(page.url()).searchParams.get('site'),'omsk-refining');
  assert.equal(new URL(page.url()).searchParams.get('keep'),'source');assert.equal(new URL(page.url()).hash,'#reference');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);report.cases.push({profile,status:'passed',sectors});await context.close();
 }
 report.status='passed';
}catch(error){report.status=browser?'failed':'browser-unavailable';report.error=error.stack;process.exitCode=1;console.error(error.message);}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({status:report.status,output}));}
