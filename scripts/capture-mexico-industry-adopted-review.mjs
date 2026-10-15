#!/usr/bin/env node
// Requires a functioning Chromium sandbox. No bypass flags or remote publish.
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
 let file=path.resolve(dist,`.${pathname.slice('/insight-journal'.length)}`);assert(file.startsWith(`${dist}${path.sep}`));if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);assert(file.startsWith(`${dist}${path.sep}`));res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
}catch{res.writeHead(404);res.end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/mexico/industry/`;
const sourceFiles=['src/components/atlas/MexicoIndustryAdopted.astro','src/components/atlas/MexicoIndustrySectorMap.astro','src/lib/atlas-mexico-industry-sector-labels.ts','src/scripts/atlas-mexico-industry-adopted.ts','src/styles/atlas-mexico-industry-adopted.css',...['resources','manufacturing','food-precision','services'].map(n=>`src/data/atlas/mexico/industry-adopted-${n}.json`)];
const sourceSha256={};for(const file of sourceFiles)sourceSha256[file]=createHash('sha256').update(await readFile(path.join(repo,file))).digest('hex');
const report={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),runId:process.env.GITHUB_RUN_ID??null,sourceSha256,passed:false,browser:null,cases:[],blocker:null};let browser;
const map=page=>page.locator('[data-ma-sector-map]:not([hidden])');
const ready=page=>page.waitForFunction(()=>document.querySelector('[data-ma-atlas]')?.dataset.maLabelsComplete==='true');
const boxes=async page=>{await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});return map(page).locator('[data-ma-frame]').evaluate(frame=>[...frame.querySelectorAll('[data-ma-cluster]')].map(n=>({id:n.dataset.maCluster,x:+n.dataset.maX,y:+n.dataset.maY,right:+n.dataset.maX+(+n.dataset.maWidth),bottom:+n.dataset.maY+(+n.dataset.maHeight)})));};
function assertBoxes(items,width,height){for(const b of items)assert(b.x>=0&&b.y>=0&&b.right<=width&&b.bottom<=height);for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++)assert(!(Math.min(items[i].right,items[j].right)>Math.max(items[i].x,items[j].x)&&Math.min(items[i].bottom,items[j].bottom)>Math.max(items[i].y,items[j].y)));}
const choose=async(page,id)=>{const sector=await map(page).getAttribute('data-ma-sector-map');await page.locator(`[data-ma-industry-select="${sector}"]`).selectOption(id);await ready(page);};
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});report.browser=browser.version();
 for(const[width,height]of[[1920,1080],[1280,900],[390,844],[844,390]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await ready(page);
  assert.equal(await page.locator('[data-ma-map]').count(),3);assert.equal(await page.locator('.ma-reading .ma-indicator').count(),0);
  const selected=[],sectors=[];
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[role=tab][data-ma-sector="${sector}"]`).click();await ready(page);assert.equal(await map(page).count(),1);assert.equal(await map(page).getAttribute('data-ma-sector-map'),sector);
   const baseline=await boxes(page),frame=await map(page).locator('[data-ma-frame]').boundingBox();assertBoxes(baseline,frame.width,frame.height);assert.equal(await map(page).locator('button,line,[data-ma-correspondence]').count(),0);
   const actual=await map(page).locator('[data-ma-cluster]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),f=n.closest('[data-ma-frame]').getBoundingClientRect();return{x:r.x-f.x,y:r.y-f.y,right:r.right-f.x,bottom:r.bottom-f.y};}));assertBoxes(actual,frame.width,frame.height);
   await map(page).locator('[data-ma-frame]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`${width}-${height}-${sector}.jpg`),type:'jpeg',quality:85,animations:'disabled'});
   const camera=await map(page).locator('[data-ma-map]').getAttribute('viewBox'),ids=await page.locator(`[data-ma-industry-select="${sector}"] option[value]:not([value=""])`).evaluateAll(nodes=>nodes.map(n=>n.value));
   for(const id of ids){await choose(page,id);assert.equal(await map(page).locator('[data-ma-map]').getAttribute('viewBox'),camera);assert.deepEqual(await boxes(page),baseline);assert.equal(await page.locator('[data-ma-table-state]').count(),32);selected.push(id);}
   sectors.push({sector,annotations:baseline.length,omitted:await page.locator('[data-ma-atlas]').getAttribute('data-ma-omitted-annotations')});
  }
  assert.equal(new Set(selected).size,34);await page.locator('[role=tab][data-ma-sector="manufacturing"]').click();await choose(page,'food');const baseline=await boxes(page),camera=await map(page).locator('[data-ma-map]').getAttribute('viewBox');await page.locator('[data-ma-only]').check();assert.deepEqual(await boxes(page),baseline);await page.locator('[data-ma-only]').uncheck();
  await map(page).locator('[data-ma-state="14"]').focus();await page.keyboard.press('Enter');assert.equal(new URL(page.url()).searchParams.get('state'),'14');assert.equal(await map(page).locator('[data-ma-map]').getAttribute('viewBox'),camera);await page.locator('[data-ma-camera="in"]').click();const zoomed=await map(page).locator('[data-ma-map]').getAttribute('viewBox');await choose(page,'beer');assert.equal(await map(page).locator('[data-ma-map]').getAttribute('viewBox'),zoomed);await page.reload();await ready(page);assert.equal(await map(page).locator('[data-ma-map]').getAttribute('viewBox'),zoomed);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.goto(base+'?compare=population&state=14&metric=transport&sourceView=density');await page.waitForSelector('[data-mi-ready="true"]');assert.equal(await page.locator('[data-ma-atlas]').isVisible(),false);assert.equal(await page.locator('[data-mi-figure="secondary"]').isVisible(),true);assert.deepEqual(errors,[]);report.cases.push({width,height,industries:new Set(selected).size,sectors,errors});await page.close();
 }
 report.passed=true;
}catch(error){report.blocker=error.message.split('\n')[0];process.exitCode=1;console.error(report.blocker);
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
