/** Cloud-only, sandboxed review. A launch failure is a blocker, never a reason
 * to disable Chromium's sandbox or request access to the user's computer. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve(process.env.EAST_AGRO_REVIEW_OUT??'review-artifacts/east-asia-agro-20261016');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{
 let path=resolve(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));
 if(!path.startsWith(dist+sep))throw Error('outside build');
 if((await stat(path)).isDirectory())path=resolve(path,'index.html');
 res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal`;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),chromiumSandbox:true,deviceScaleFactor:1.5,requestedViewports:[{width:1896,height:996},{width:1280,height:665}],status:'running',cases:[],errors:[]};
let browser;
try{
 const release=JSON.parse(await readFile(resolve(dist,'_release.json'),'utf8'));
 report.buildIdentity=release.commitSha;
 assert.ok(release.commitSha===report.head||release.commitSha==='local'&&report.workingTree,'built release must match HEAD or be an explicitly recorded local working tree');
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium'});
 for(const viewport of report.requestedViewports){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',timezoneId:'UTC',reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
  for(const [country,topic] of [['CHN','soybean'],['KOR','soybean'],['CHN','wheat'],['KOR','rice'],['CHN','forest'],['PRK','forest'],['TWN','soybean'],['MNG','wheat']]){
   await page.goto(`${origin}/atlas/asia/east-asia/agriculture/?topic=${topic}&place=${country}`,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
   const host=page.locator('[data-agro-statistics]');
   assert.deepEqual(await host.locator('.agro-columns>[data-agro-stage]').evaluateAll(nodes=>nodes.map(n=>n.dataset.agroStage)),['production','use','destinations']);
   if(country==='KOR'&&topic==='soybean'){
    assert.match(await host.innerText(),/2023暦年/);assert.match(await host.locator('[data-agro-stage="use"]').innerText(),/49\.252.*0\.03%/s);
    await host.locator('[data-agro-stage="destinations"] summary').click();assert.equal(await host.locator('[data-agro-stage="destinations"] tbody tr').count(),13);
   }
   if(country==='CHN'&&topic==='forest'){
    await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');await host.locator('[data-agro-series="sawnwood-production"]').waitFor();
    assert.match(await host.locator('[data-agro-stage="use"]').innerText(),/在庫未調整/);
   }
   const measurement=await host.evaluate(el=>{
    const rect=el.getBoundingClientRect(),map=document.querySelector('.asia-map-frame')?.getBoundingClientRect();
    const columns=[...el.querySelectorAll('.agro-columns>section')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width};});
    return{viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},statisticsOverflow:el.scrollWidth>el.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,columns,map:map?{width:map.width,height:map.height,bottom:map.bottom}:null,statisticsTop:rect.top};
   });
   assert.equal(measurement.statisticsOverflow,false);assert.equal(measurement.pageOverflow,false);
   assert.ok(Math.max(...measurement.columns.map(c=>c.y))-Math.min(...measurement.columns.map(c=>c.y))<2,'three columns at both requested desktop sizes');
   if(measurement.map)assert.ok(measurement.statisticsTop>=measurement.map.bottom-1,'statistics remain below map');
   await page.screenshot({path:resolve(out,`${viewport.width}-${country}-${topic}-map.png`)});
   await host.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-${country}-${topic}-statistics.png`)});
   const reference=page.locator('[data-east-export-quantities]').first();
   if(await reference.count()){await reference.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-${country}-${topic}-quantity-reference.png`)});}
   report.cases.push({country,topic,...measurement});
  }
  await page.goto(`${origin}/atlas/asia/east-asia/agriculture/?topic=rice&place=CHN`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-east-export-quantities]').count(),1);
  await page.goto(`${origin}/atlas/asia/east-asia/agriculture/?topic=overview&place=CHN`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-east-export-quantities]').count(),0,'overview restoration');
  await page.goto(`${origin}/atlas/asia/east-asia/agriculture/?topic=rice&place=JPN`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-agro-statistics]').isVisible(),false);assert.equal(await page.locator('[data-east-export-quantities]').count(),0);
  await page.goto(`${origin}/atlas/north-america/agriculture/`,{waitUntil:'networkidle'});
  await page.locator('[data-crop-select="soybean"]').click();await page.locator('[data-us-marketing-flow="soybean"]').waitFor({state:'visible'});
  await page.screenshot({path:resolve(out,`${viewport.width}-us-soybean-baseline.png`),fullPage:true});
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status=browser?'failed':'blocked';report.failure=String(error);process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,failure:report.failure}));
