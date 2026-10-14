#!/usr/bin/env node
// Requires a Chromium environment with a functioning sandbox. No bypass flags.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url)),dist=await realpath(path.join(repo,'dist'));
const output=path.resolve(process.env.MEXICO_INDUSTRY_REVIEW_OUTPUT??path.join(repo,'review-artifacts/mexico-industry-three-sectors/adopted'));await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 assert.equal(req.method,'GET');const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);assert(pathname.startsWith('/insight-journal/'));
 let file=path.resolve(dist,`.${pathname.slice('/insight-journal'.length)}`);assert(file.startsWith(`${dist}${path.sep}`));if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);assert(file.startsWith(`${dist}${path.sep}`));
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/mexico/industry/`;
const sourceFiles=['src/components/atlas/MexicoIndustryAdopted.astro','src/lib/atlas-mexico-industry-adopted.ts','src/scripts/atlas-mexico-industry-adopted.ts','src/styles/atlas-mexico-industry-adopted.css',...['resources','manufacturing','food-precision','services'].map(name=>`src/data/atlas/mexico/industry-adopted-${name}.json`)];
const sourceSha256={};for(const file of sourceFiles)sourceSha256[file]=createHash('sha256').update(await readFile(path.join(repo,file))).digest('hex');
const report={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,sourceSha256,passed:false,browser:null,cases:[],blocker:null};let browser;
const ready=page=>page.waitForFunction(()=>document.querySelector('[data-ma-atlas]')?.dataset.maLabelsComplete==='true');
const boxes=page=>page.locator('.ma-map-label:not([hidden])').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect(),f=n.closest('[data-ma-frame]').getBoundingClientRect();return {id:n.dataset.maGroup,x:b.x-f.x,y:b.y-f.y,right:b.right-f.x,bottom:b.bottom-f.y};}));
function assertBoxes(items,frame){for(const b of items)assert(b.x>=frame.x-1&&b.y>=frame.y-1&&b.right<=frame.right+1&&b.bottom<=frame.bottom+1,`${b.id} outside frame`);for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert(!(Math.min(items[i].right,items[j].right)>Math.max(items[i].x,items[j].x)+1&&Math.min(items[i].bottom,items[j].bottom)>Math.max(items[i].y,items[j].y)+1),`${items[i].id}/${items[j].id} overlap`);}
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});report.browser=browser.version();
 for(const[width,height]of[[1920,1080],[1280,900],[390,844],[844,390]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await ready(page);
  assert.equal(await page.locator('[data-ma-atlas]').isVisible(),true);assert.equal(await page.locator('[data-ma-legacy]').first().isVisible(),false);assert.equal(await page.locator('.ma-reading .ma-indicator').count(),0);
  assert.equal(await page.locator('#ma-statistics').evaluate(n=>n.getBoundingClientRect().top>=document.querySelector('.ma-grid').getBoundingClientRect().bottom),true);
  const selected=[];
  for(const[sector,count]of[['resources',6],['manufacturing',9],['services',8]]){
   await page.locator(`[role=tab][data-ma-sector="${sector}"]`).click();await ready(page);const baseline=await boxes(page),frame=await page.locator('[data-ma-frame]').evaluate(n=>{const b=n.getBoundingClientRect();return{x:0,y:0,right:b.width,bottom:b.height};});assert.equal(baseline.length,count);assertBoxes(baseline,frame);
   await page.locator('[data-ma-frame]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-${height}-${sector}.jpg`),type:'jpeg',quality:85,animations:'disabled'});
   const camera=await page.locator('[data-ma-map]').getAttribute('viewBox');
   const ids=await page.locator(`[data-ma-choices="${sector}"] [data-ma-industry]`).evaluateAll(nodes=>nodes.map(n=>n.dataset.maIndustry));
   for(const id of ids){await page.locator(`[data-ma-industry="${id}"][data-ma-owner="${sector}"]`).click();await ready(page);assert.equal(await page.locator('[data-ma-map]').getAttribute('viewBox'),camera);assert.deepEqual(await boxes(page),baseline);assert.equal(await page.locator('[data-ma-table-state]').count(),32);selected.push(id);}
  }
  assert.equal(new Set(selected).size,34);
  await page.locator('[role=tab][data-ma-sector="manufacturing"]').click();await page.locator('[data-ma-industry="food"][data-ma-owner="manufacturing"]').click();await ready(page);const full=await boxes(page),camera=await page.locator('[data-ma-map]').getAttribute('viewBox');await page.locator('[data-ma-only]').check();assert.equal((await boxes(page)).length,1);await page.locator('[data-ma-only]').uncheck();assert.deepEqual(await boxes(page),full);assert.equal(await page.locator('[data-ma-map]').getAttribute('viewBox'),camera);
  await page.locator('[data-ma-state="14"]').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).searchParams.get('state'),'14');await page.locator('[data-ma-frame]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-${height}-food-state14.jpg`),type:'jpeg',quality:85,animations:'disabled'});await page.locator('#ma-statistics').screenshot({path:path.join(output,`${width}-${height}-food-statistics.jpg`),type:'jpeg',quality:85,animations:'disabled'});
  await page.locator('[data-ma-camera="in"]').click();const zoomed=await page.locator('[data-ma-map]').getAttribute('viewBox');await page.locator('[data-ma-industry="beer"][data-ma-owner="manufacturing"]').click();assert.equal(await page.locator('[data-ma-map]').getAttribute('viewBox'),zoomed);await page.reload();await ready(page);assert.equal(await page.locator('[data-ma-map]').getAttribute('viewBox'),zoomed);assert.equal(new URL(page.url()).searchParams.get('subsector'),'beer');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const file of['resources-manifest.json','manufacturing-provenance.json','food-precision-provenance.json','services-provenance.json'])assert.equal((await page.request.get(new URL(`/insight-journal/assets/atlas/mexico-industry-adopted/${file}`,base).href)).status(),200);
  await page.goto(base+'?compare=population&state=14&metric=transport&sourceView=density');await page.waitForSelector('[data-mi-ready="true"]');assert.equal(await page.locator('[data-ma-atlas]').isVisible(),false);assert.equal(await page.locator('[data-mi-figure="secondary"]').isVisible(),true);assert.deepEqual(errors,[]);
  report.cases.push({width,height,selectedIndustries:new Set(selected).size,labels:[6,9,8],errors});await page.close();
 }
 report.passed=true;
}catch(error){report.blocker=error.message.split('\n')[0];process.exitCode=1;console.error(report.blocker);console.error('::error title=Mexico adopted industry review::'+String(error.stack??error).replaceAll('%','%25').replaceAll('\n','%0A').replaceAll('\r','%0D'));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
