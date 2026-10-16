/** Mexico-only built-screen review. Uses an installed sandboxed cloud Chrome;
 * never disables its sandbox, downloads a browser, or connects to a user's PC. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import astroConfig from '../astro.config.mjs';

const output=path.resolve(process.env.MEXICO_AGRO_REVIEW_DIR??'review-artifacts/mexico-agro-statistics');
const dist=await realpath('dist'),base=String(astroConfig.base??'').replace(/\/$/,'');
const profiles=[{width:1896,height:996},{width:1280,height:665}];
const scenes=['overview','corn','cotton','rice','wheat','sorghum','coffee','pine'];
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const report={head,startedAt:new Date().toISOString(),status:'running',deviceScaleFactor:1.5,profiles,scenes,captures:[],errors:[]};
let browser,server;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
try{
 await mkdir(output,{recursive:true});
 const release=JSON.parse(await readFile(path.join(dist,'_release.json'),'utf8'));
 assert.equal(release.commitSha,head,'Build this exact commit with GITHUB_SHA=$(git rev-parse HEAD) before review');
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   assert(url.pathname===base||url.pathname.startsWith(base+'/'));
   const relative=decodeURIComponent(url.pathname.slice(base.length));
   let file=path.resolve(dist,'.'+relative);
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   file=await realpath(file);assert(file.startsWith(dist+path.sep));
   const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 for(const viewport of profiles){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let overviewMap;
  for(const scene of scenes){
   const url=new URL(origin+base+'/atlas/north-america/mexico/agriculture/');
   if(scene!=='overview')url.searchParams.set('agriItem',scene);
   await page.goto(url.href,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('[data-mexico-agriculture-atlas]')?.dataset.agricultureReady==='true');
   await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   const root=page.locator('[data-mexico-agriculture-atlas]');
   const map=await page.locator('[data-agriculture-map]').boundingBox();
   assert(map&&map.width>300&&map.height>150,'Map remains readable');
   if(scene==='overview')overviewMap=map;
   else for(const key of ['x','y','width','height'])assert.ok(Math.abs(map[key]-overviewMap[key])<1,'Selection must not change the map frame');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'No page-level horizontal overflow');
   const name=`${viewport.width}x${viewport.height}-${scene}`;
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:path.join(output,name+'-map.png')});
   const record={name,viewport,deviceScaleFactor:1.5,map,status:'passed'};
   if(scene!=='overview'){
    const panel=root.locator(`[data-mexico-stat-panel="${scene}"]`),columns=panel.locator('[data-mexico-agriculture-three-columns]');
    assert.equal(await panel.isVisible(),true);
    assert.deepEqual(await columns.locator(':scope>section').evaluateAll(nodes=>nodes.map(n=>n.dataset.agroStage)),['production','use','destinations']);
    const boxes=await columns.locator(':scope>section').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,right:b.right,overflow:n.scrollWidth>n.clientWidth+1};}));
    assert(boxes.every(b=>Math.abs(b.y-boxes[0].y)<1&&b.width>200&&!b.overflow),'Three readable, unclipped columns');
    record.columns=boxes;
    await columns.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,name+'-statistics.png')});
    const reference=panel.locator('[data-mexico-trade-reference]');
    if(await reference.count()){
     assert.equal(await reference.getAttribute('open'),null);
     await reference.locator(':scope>summary').click();
     assert.equal(await reference.getAttribute('open'),'');
     const details=reference.locator('details');await details.locator('summary').click();
     assert.ok(await reference.locator('tbody tr').count()>0);
     await reference.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,name+'-trade.png')});
    }
    await root.locator('[data-agri-overview-button]').click();
    assert.equal(await root.locator('[data-mexico-agriculture-statistics]').isVisible(),false);
    assert.equal(await root.locator('[data-mexico-agriculture-overview-statistics]').isVisible(),true);
   }
   assert.deepEqual(errors,[],'No page JavaScript errors');report.captures.push(record);
  }
  await context.close();
 }
 report.status='passed';
}catch(error){
 report.status=browser?'failed':'blocked';report.errors.push(String(error.message));process.exitCode=1;
}finally{
 await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
 report.completedAt=new Date().toISOString();await mkdir(output,{recursive:true});
 await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`${report.status}: ${report.captures.length}/${profiles.length*scenes.length} scenes; ${path.join(output,'report.json')}`);
 if(report.errors.length)console.error(report.errors[0].split('\n').slice(0,4).join('\n'));
}
