#!/usr/bin/env node
// Local built-page review only: sandboxed browser, no external calls.
// A sandbox prerequisite failure must be resolved in an eligible environment.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {eastAdoptedIndustryIds} from '../src/data/atlas/east-asia-industry-evidence.ts';
import {eastSectors,eastSectorIndustries,eastSectorSites} from '../src/data/atlas/east-asia-industry-sectors.ts';
const repo=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.EAST_INDUSTRY_REVIEW_OUTPUT??'/tmp/east-asia-industries-review';
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 assert(pathname.startsWith('/insight-journal/'));pathname=pathname.slice('/insight-journal'.length);
 let file=path.resolve(repo,'dist','.'+pathname);assert(file.startsWith(path.join(repo,'dist')+path.sep));
 if((await stat(file)).isDirectory())file=path.join(file,'index.html');
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
}catch{res.writeHead(404).end('Missing built asset');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const sandbox=true;
const results={head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),sandbox,externalRequests:[],cases:[],status:'running'};
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:sandbox,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings'],env:{...process.env,XDG_CONFIG_HOME:'/tmp/east-browser-config',XDG_CACHE_HOME:'/tmp/east-browser-cache'}});
 results.browser=browser.version();
 for(const viewport of [{width:1920,height:1080},{width:1896,height:996},{width:1440,height:1000},{width:390,height:844}].filter(v=>!process.env.EAST_INDUSTRY_REVIEW_WIDTH||v.width===Number(process.env.EAST_INDUSTRY_REVIEW_WIDTH))){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block'});
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin===origin)return route.continue();results.externalRequests.push(route.request().url());return route.abort('blockedbyclient');});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  const record={viewport,products:[],sectors:[],errors};results.cases.push(record);
  const ready=async()=>{await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);await page.evaluate(()=>document.fonts.ready);};
  const positions=()=>page.locator('[data-industry-label]:visible').evaluateAll(nodes=>nodes.map(n=>({industry:n.dataset.industryLabel,anchor:n.dataset.labelAnchorSite,left:n.style.left,top:n.style.top})).sort((a,b)=>(a.industry+a.anchor).localeCompare(b.industry+b.anchor)));
  await page.goto(origin+'/insight-journal/atlas/asia/east-asia/industry/');await ready();
  await page.screenshot({path:path.join(output,viewport.width+'-initial.png'),fullPage:true,animations:'disabled'});
  assert(await page.locator('[data-east-cluster-lead]').isVisible());assert(await page.locator('[data-east-cluster-reason]').isVisible());
  assert(await page.locator('[data-east-industry-symbols]').isVisible());assert.match(await page.locator('[data-east-industry-symbols]').innerText(),/採掘.*製造.*設計/);assert.equal(await page.locator('[data-map-gesture]').isVisible(),false);
  for(const sector of eastSectors){
   await page.locator(`[data-east-industry-sector="${sector.id}"]`).click();await ready();
   const camera=await page.locator('[data-map-camera]').getAttribute('data-map-camera'),initial=await positions();
   const layout=await page.evaluate(()=>{const frame=document.querySelector('.asia-map-frame').getBoundingClientRect(),stats=document.querySelector('[data-east-industry-statistics]').getBoundingClientRect();return {width:frame.width,height:frame.height,statsBelow:stats.top>=frame.bottom,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(layout.overflow,false);assert(layout.width>=300&&layout.height>=320,JSON.stringify(layout));assert(layout.statsBelow);
   const overlap=await page.locator('[data-industry-label]:visible').evaluateAll(nodes=>{const boxes=nodes.map(n=>n.getBoundingClientRect());return boxes.some((a,i)=>boxes.some((b,j)=>i!==j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));});assert.equal(overlap,false);assert.equal(await page.locator('.east-sector-map-label').count(),0);assert((await positions()).length<=(layout.width<650?4:layout.width<1100?8:10));
   record.sectors.push({id:sector.id,layout,visibleNames:[...new Set(initial.map(p=>p.industry))]});
   for(const item of eastSectorIndustries.filter(i=>i.sectors.includes(sector.id)&&eastAdoptedIndustryIds.includes(i.id))){
    await page.locator(`[data-east-industry-item="${sector.id}"]`).selectOption(`east-${item.id}`);await ready();
    assert.equal(new URL(page.url()).searchParams.get('topic'),'east-'+item.id);
    assert.deepEqual(await positions(),initial,'industry selection preserves map name positions');
    assert.equal(await page.locator('[data-map-camera]').getAttribute('data-map-camera'),camera);
    const section=page.locator(`[data-east-evidence="${item.id}"]`);assert(await section.isVisible());
    assert.equal(await page.locator('[data-east-evidence]:visible').count(),1);
    assert.equal(await section.locator('.east-industry-evidence-card').count(),3);
    assert(await section.locator('a').count()>=2);assert(await page.locator('[data-east-cluster-lead]').isVisible());
    // Every point remains a guide: quantities are in the scoped lower statistics.
    const points=page.locator('[data-industry-cluster]:visible');assert(await points.count()>0);
    record.products.push(item.id);
   }
   await page.screenshot({path:path.join(output,viewport.width+'-'+sector.id+'.png'),fullPage:true,animations:'disabled'});
  }
  assert.deepEqual([...new Set(record.products)].sort(),[...eastAdoptedIndustryIds].sort());
  // Keyboard site selection, only mode, reload, back/forward and Japanese scope.
  await page.locator('[data-east-industry-sector="manufacturing"]').click();
  await page.locator('[data-east-industry-item="manufacturing"]').selectOption('east-foundry');await ready();
  await page.locator('[data-industry-cluster="kumamoto"]').focus();await page.keyboard.press('Enter');await ready();
  assert.equal(new URL(page.url()).searchParams.get('detail'),'kumamoto');
  assert.match(await page.locator('[data-east-cluster-detail]').innerText(),/第1工場.*第2工場/);
  await page.locator('[data-east-industry-only]').click();await ready();
  for(const id of await page.locator('[data-industry-cluster]:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.industryCluster)))assert(eastSectorSites.find(s=>s.id===id).industries.includes('foundry'));
  await page.reload();await ready();assert.equal(new URL(page.url()).searchParams.get('industryview'),'single');assert(await page.locator('[data-east-evidence="foundry"]').isVisible());
  await page.locator('[data-east-industry-clear]').click();await ready();assert.equal(new URL(page.url()).searchParams.has('detail'),false);
  await page.goBack();await ready();assert.equal(new URL(page.url()).searchParams.get('detail'),'kumamoto');
  await page.goForward();await ready();assert.equal(new URL(page.url()).searchParams.has('detail'),false);
  await page.locator('[data-field="population"]').first().click();await ready();assert.equal(await page.locator('[data-east-industry-statistics]').isVisible(),false);
  await page.locator('[data-field="industry"]').first().click();await ready();assert(await page.locator('[data-east-industry-statistics]').isVisible());
  assert.deepEqual(errors,[]);await context.close();
 }
 assert(results.cases.length>0,'the requested viewport must be in the review matrix');assert.deepEqual(results.externalRequests,[]);results.status='passed';
}catch(e){results.status='failed';results.failure=e.stack;throw e;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({status:results.status,cases:results.cases.length,output}));}
