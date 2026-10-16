import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from './lib/agro-review-identity.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve(process.env.AGRO_REVIEW_OUTPUT??process.env.CENTRAL_AGRO_REVIEW_OUTPUT??'review-artifacts/central-asia-agro');
await mkdir(out,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sandbox:true,deviceScaleFactor:1.5,status:'running',cases:[],errors:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(!pathname.startsWith('/insight-journal/'))throw Error('base');let file=resolve(dist,'.'+decodeURIComponent(pathname.slice('/insight-journal'.length)));if(!file.startsWith(dist+sep))throw Error('path');if((await stat(file)).isDirectory())file=resolve(file,'index.html');res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/asia/central-asia/agriculture/`;
let browser;
try{
 await verifyAgroReviewIdentity(report);browser=await chromium.launch({headless:true,executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});await verifyAgroBrowserSandbox(browser,report);
 for(const viewport of [{width:1896,height:996},{width:1280,height:665}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1.5});page.on('pageerror',e=>report.errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
  for(const [name,query,host]of [
   ['regional-wheat','?topic=wheat','[data-central-agro-region]'],
   ['regional-cotton','?topic=cotton','[data-central-agro-region]'],
   ['regional-cattle','?topic=cattle','[data-central-agro-region]'],
   ['regional-forest','?topic=forest','[data-central-agro-region]'],
   ['kazakhstan-wheat','?topic=wheat&place=KAZ','[data-agro-statistics]'],
   ['uzbekistan-forest','?topic=forest&place=UZB','[data-agro-statistics]'],
  ]){
   await page.goto(origin+query,{waitUntil:'networkidle'});await ready();const panel=page.locator(host);await panel.waitFor({state:'visible'});
   if(host==='[data-agro-statistics]')await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
   await page.evaluate(()=>document.fonts.ready);
   const dimensions=await panel.evaluate(node=>{const r=node.getBoundingClientRect(),map=document.querySelector('.asia-map-frame').getBoundingClientRect(),rail=document.querySelector('.atlas-news-rail')?.getBoundingClientRect();return {dpr:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth,overflowPanel:node.scrollWidth>node.clientWidth+1,left:r.left,top:r.top,mapBottom:map.bottom,railRight:rail?.right,columns:[...node.querySelectorAll('.agro-columns>section')].map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width};})};});
   assert.equal(dimensions.dpr,1.5);assert.equal(dimensions.overflow,false);assert.equal(dimensions.overflowPanel,false);assert.equal(dimensions.columns.length,3);
   assert(dimensions.columns.every(c=>Math.abs(c.y-dimensions.columns[0].y)<2));assert(dimensions.top>=dimensions.mapBottom-1);
   if(dimensions.railRight)assert(dimensions.left>=dimensions.railRight-1);
   await page.screenshot({path:resolve(out,`${viewport.width}-${name}-map.png`)});
   await panel.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-${name}-statistics.png`)});
   if(name==='regional-forest'){
    await panel.locator('[data-central-agro-select]').selectOption('sawnwood-production');await panel.locator('[data-central-agro-series="sawnwood-production"]').waitFor();
    assert.match(await panel.innerText(),/445,303/);
   }
   if(name==='kazakhstan-wheat'){
    await panel.locator('[data-central-wheat-reference]>summary').click();assert.match(await panel.locator('[data-central-wheat-reference]').innerText(),/4,608,827.*2,507,638/s);
    await page.screenshot({path:resolve(out,`${viewport.width}-${name}-reference.png`)});
   }
   report.cases.push({name,viewport,...dimensions});
  }
  await page.goto(origin+'?topic=wheat',{waitUntil:'networkidle'});await ready();
  const frame=await page.locator('.asia-map-frame').evaluate(n=>({width:n.clientWidth,height:n.clientHeight}));
  await page.locator('[data-country-select]').selectOption('KAZ');await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
  await page.goBack();await page.locator('[data-central-agro-region]').waitFor({state:'visible'});
  assert.deepEqual(await page.locator('.asia-map-frame').evaluate(n=>({width:n.clientWidth,height:n.clientHeight})),frame);
  await page.reload({waitUntil:'networkidle'});await ready();await page.locator('[data-central-agro-region]').waitFor({state:'visible'});
  await page.goto(origin,{waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-central-agro-region]').isVisible(),false);assert.equal(await page.locator('[data-south-central-farm-connections]').isVisible(),true);
  await page.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='blocked-or-failed';report.errors.push(String(error));process.exitCode=1;
}finally{
 await browser?.close();await new Promise(r=>server.close(r));
 await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,completedCases:report.cases.length,output:out,firstError:report.errors[0]?.slice(0,400)},null,2));
}
