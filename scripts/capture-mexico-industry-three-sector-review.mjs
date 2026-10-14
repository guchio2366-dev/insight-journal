#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const dist=await realpath(path.join(repo,'dist'));
const output=path.resolve(process.env.MEXICO_INDUSTRY_REVIEW_OUTPUT??path.join(repo,'review-artifacts/mexico-industry-three-sectors'));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const server=createServer(async(req,res)=>{
 try{
  assert.equal(req.method,'GET');
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  assert(pathname.startsWith('/insight-journal/'));
  let file=path.resolve(dist,`.${pathname.slice('/insight-journal'.length)}`);
  assert(file.startsWith(`${dist}${path.sep}`));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  file=await realpath(file);assert(file.startsWith(`${dist}${path.sep}`));
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});
  res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
const report={browser:browser.version(),cases:[]};
const sector=async(page,name)=>{await page.locator(`[role=tab][data-industry-sector="${name}"]`).click();await page.waitForFunction(()=>document.querySelector('[data-mexico-field="industry"]')?.dataset.miLabelLayoutReady==='true');};
const labels=page=>page.locator('[data-mi-reading-markers] [data-mi-region-option]:not([hidden]):not([data-mi-selected-state-pin]) [data-mi-region-label]').evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {text:node.textContent,x:b.x,y:b.y,right:b.right,bottom:b.bottom};}));
const noCollisions=items=>{for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert(!(Math.min(items[i].right,items[j].right)-Math.max(items[i].x,items[j].x)>1&&Math.min(items[i].bottom,items[j].bottom)-Math.max(items[i].y,items[j].y)>1),`${items[i].text} overlaps ${items[j].text}`);};
try{
 for(const [width,height] of [[1920,1080],[1280,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/mexico/industry/?legacy=1`);
  await page.waitForSelector('[data-mi-ready="true"]');await page.waitForFunction(()=>document.querySelector('[data-mexico-field="industry"]')?.dataset.miLabelLayoutReady==='true');
  const initial=await labels(page);assert.equal(initial.length,6);noCollisions(initial);
  assert.equal(await page.locator('[data-mi-site-kind="refinery"]:not([hidden])').count(),2);
  assert.equal(await page.locator('[data-mi-site-kind="mine"]:not([hidden])').count(),1);
  await page.screenshot({path:path.join(output,`${width}-resources.jpg`),type:'jpeg',quality:82,animations:'disabled'});
  await sector(page,'manufacturing');const manufacturing=await labels(page);assert.equal(manufacturing.length,10);noCollisions(manufacturing);
  assert.equal(await page.locator('[data-mi-facility-city="true"]:not([hidden])').count(),2);
  assert.equal(await page.locator('[data-mi-site-kind="city-cluster"]:not([hidden])').count(),2);
  await page.screenshot({path:path.join(output,`${width}-manufacturing.jpg`),type:'jpeg',quality:82,animations:'disabled'});
  const frame=await page.locator('[data-mi-map="primary"]').getAttribute('viewBox');
  await page.locator('[data-industry-subsector="food"]').click();await page.waitForFunction(()=>document.querySelector('[data-mexico-field="industry"]')?.dataset.miLabelLayoutReady==='true');
  assert.equal(await page.locator('[data-mi-shape="19"]').first().getAttribute('fill'),'#edf1df');
  assert.equal(await page.locator('[data-mi-export-legend="primary"]').isVisible(),false);
  const selected=await labels(page);assert.equal(selected.length,manufacturing.length);noCollisions(selected);
  for(let i=0;i<selected.length;i++){assert(Math.abs(selected[i].x-manufacturing[i].x)<1);assert(Math.abs(selected[i].y-manufacturing[i].y)<1);}
  assert.equal(await page.locator('[data-mi-map="primary"]').getAttribute('viewBox'),frame);
  await page.locator('[data-mi-export-overlay]').check();
  assert.equal(await page.locator('[data-mi-export-legend="primary"]').isVisible(),true);
  await page.locator('[data-mi-export-overlay]').uncheck();
  assert.equal(await page.locator('[data-mi-shape="19"]').first().getAttribute('fill'),'#edf1df');
  await page.screenshot({path:path.join(output,`${width}-food.jpg`),type:'jpeg',quality:82,animations:'disabled'});
  await page.locator('[data-mi-item-only]').check();assert.equal(await page.locator('[data-mi-reading-markers] [data-mi-region-option]:not([hidden]):not([data-mi-selected-state-pin])').count(),1);
  await page.locator('[data-mi-item-only]').uncheck();
  await sector(page,'resources');await page.locator('a[href="#mi-statistics"]').click();await page.locator('[data-mi-state-select]').selectOption('14');
  assert.equal(await page.locator('[data-mi-selected-state-pin]:not([hidden])').count(),1);
  assert.equal(await page.locator('[data-mi-map="primary"]').getAttribute('viewBox'),frame);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(output,`${width}-selected-state.jpg`),type:'jpeg',quality:82,animations:'disabled'});
  await sector(page,'services');await page.locator('[data-industry-subsector="tourism"]').click();
  assert.equal(await page.locator('[data-mi-site-kind="city-cluster"]:not([hidden])').count(),2);
  assert.match(await page.locator('[data-mi-summary-list]').textContent(),/14万3,793人/);
  assert.equal(await page.locator('[data-mi-export-legend="primary"]').isVisible(),false);
  await page.screenshot({path:path.join(output,`${width}-tourism.jpg`),type:'jpeg',quality:82,animations:'disabled'});
  await page.reload();await page.waitForSelector('[data-mi-ready="true"]');assert.equal(new URL(page.url()).searchParams.get('subsector'),'tourism');
  assert.equal(await page.locator('[data-mi-industry-panel="services:tourism"]').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  report.cases.push({width,height,resourceLabels:initial.length,manufacturingLabels:manufacturing.length,selectionFrame:frame,errors});
  await page.close();
 }
 report.passed=true;await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}

// The existing sandboxed-Chrome CI review uploads this directory. Verify the
// normal adopted view too, retaining the legacy comparison checks above.
await import('./capture-mexico-industry-adopted-review.mjs');
