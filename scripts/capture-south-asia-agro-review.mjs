import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

// Run on the integration checkout after applying the proposed controller patch
// and building. This never disables Chrome's sandbox or connects to a user PC.
const dist=resolve('dist'),out=resolve(process.env.SOUTH_ASIA_REVIEW_OUT??'docs/review/south-asia-agro-20261016');
await mkdir(out,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',deviceScaleFactor:1.5,cases:[],operations:[],errors:[]};
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const pathname=decodeURIComponent(url.pathname.replace(/^\/insight-journal(?=\/|$)/,''));
  const file=resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(dist+sep))throw Error('outside dist');
  res.setHeader('Content-Type',types[extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal`;
let browser;
try{
 try{browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium'});}
 catch(error){report.status='blocked-browser-launch';report.errors.push(String(error));throw error;}
 for(const viewport of [{width:1896,height:996},{width:1280,height:665}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));
  for(const [country,topic,id,basis] of [
   ['IND','rice','rice-production','rice-milled-production'],['PAK','rice','rice-production','rice-milled-production'],
   ['IND','cotton','qcl-328-production','cotton-lint-production'],['PAK','cotton','qcl-328-production','cotton-lint-production'],
   ['BGD','cotton','qcl-328-production','cotton-lint-production'],['BGD','wheat','wheat-production','wheat-production'],
   ['IND','wheat','wheat-production','wheat-production'],['IND','forest','roundwood-production',null],
   ['','rice','rice-production','regional'],['','cotton','qcl-328-production','regional'],['','forest','roundwood-production','regional'],
  ]){
   const name=`${viewport.width}-${country||'regional'}-${topic}`;
   await page.goto(`${origin}/atlas/asia/south-asia/agriculture/?topic=${topic}&place=${country}`,{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
   const host=page.locator('[data-agro-statistics]');await host.waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
   assert.equal(await host.locator(`[data-agro-country="${country}"][data-agro-series="${id}"]`).count(),1);
   if(basis==='regional')assert.equal(await host.locator('[data-south-asia-regional-production]').count(),1);
   else if(basis)assert.equal(await host.locator('[data-south-asia-product-basis]').getAttribute('data-south-asia-product-basis'),basis,'apply the proposed integration hook before capture');
   assert.deepEqual(await host.locator('.agro-columns>section').evaluateAll(nodes=>nodes.map(n=>n.dataset.agroStage)),['production','use','destinations']);
   const measure=await host.evaluate(el=>{
    const b=el.getBoundingClientRect(),map=document.querySelector('[data-map-surface]').getBoundingClientRect();
    const columns=[...el.querySelectorAll('.agro-columns>section')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width};});
    return {statistics:{x:b.x,y:b.y,width:b.width,overflow:el.scrollWidth>el.clientWidth+1},map:{x:map.x,y:map.y,width:map.width,height:map.height,bottom:map.bottom},columns,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,dpr:devicePixelRatio};
   });
   assert.equal(measure.dpr,1.5);assert.equal(measure.statistics.overflow,false);assert.equal(measure.pageOverflow,false);
   assert.equal(measure.columns.length,3);assert.ok(Math.max(...measure.columns.map(c=>c.y))-Math.min(...measure.columns.map(c=>c.y))<2);
   assert.ok(measure.statistics.y>=measure.map.bottom-1,'statistics remain below the map');
   await page.screenshot({path:resolve(out,name+'-map.png')});
   await host.screenshot({path:resolve(out,name+'-statistics.png')});
   if(country==='IND'&&topic==='rice'){
    await host.locator('[data-agro-existing-trade] .sc-flow-pie').waitFor({state:'attached'});
    await host.locator('[data-agro-stage="destinations"]>.agro-other-reference>summary').click();
    assert.match(await host.locator('[data-agro-existing-trade]').innerText(),/5,242,182t/);
    await host.screenshot({path:resolve(out,name+'-basmati-reference.png')});
   }
   if(topic==='forest'){
    await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');
    await host.locator('[data-agro-series="sawnwood-production"]').waitFor();
    await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
    assert.match(await host.innerText(),/製材/);
    if(country){await host.locator('[data-south-asia-forest-scope]>summary').click();assert.match(await host.innerText(),/木材パルプは重量t/);}
    await host.screenshot({path:resolve(out,name+'-sawnwood.png')});
   }
   report.cases.push({name,viewport,country,topic,basis,...measure});
  }
  await page.goto(`${origin}/atlas/asia/south-asia/agriculture/?topic=rice&place=IND`,{waitUntil:'networkidle'});
  await page.locator('[data-farm-choice="overview"]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-south-central-farm-connections]')?.closest('details'));
  assert.equal(await page.locator('[data-south-asia-product-basis]').count(),0);
  report.operations.push({viewport,overviewRestored:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){if(report.status==='running')report.status='failed';report.failure=String(error);process.exitCode=1;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,out}));
