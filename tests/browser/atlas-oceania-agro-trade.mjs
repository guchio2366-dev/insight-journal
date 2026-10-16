import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from '../../scripts/lib/agro-review-identity.mjs';
// Local cloud review only. Keeps Chromium's sandbox enabled; records blockers.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const directory=resolve('dist'),output=resolve(process.env.AGRO_REVIEW_OUTPUT??process.env.OCEANIA_AGRO_REVIEW_OUTPUT??'/tmp/oceania-agro-review-20261016');
await mkdir(output,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(resolve(directory,'_release.json'),'utf8')),status:'running',chromiumSandbox:true,deviceScaleFactor:1.5,viewports:[{width:1896,height:996},{width:1280,height:665}],checks:[],screenshots:[],errors:[]};
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(path.startsWith('/insight-journal/'));path=path.slice('/insight-journal/'.length);if(path.endsWith('/'))path+='index.html';
  const file=resolve(directory,path);assert.ok(file.startsWith(directory+sep));res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(await readFile(file));
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Missing local file');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/oceania/`;
let browser;
try{
 await verifyAgroReviewIdentity(report);browser=await chromium.launch({executablePath:process.env.OCEANIA_AGRO_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});await verifyAgroBrowserSandbox(browser,report);
 const scenarios=[
  ['default','agriculture/','[data-primary-map]'],
  ['aus-wheat','agriculture/?layer=wheat&place=AUS','[data-oceania-trade-id="AUS-wheat-2024"]'],
  ['aus-beef','agriculture/?layer=cattle&place=AUS','[data-oceania-trade-id="AUS-beef-2024"]'],
  ['nz-milk','agriculture/?layer=cattle&place=NZL','[data-oceania-trade-id="NZL-milk-powder-2024"]'],
  ['aus-sheep','agriculture/?layer=sheep&place=AUS','[data-oceania-trade-id="AUS-sheep-2024"]'],
  ['png-cocoa-hold','agriculture/?layer=cacao&place=PNG','[data-oceania-trade-id="PNG-cocoa-2023"]'],
  ['forest-default','agriculture/forestry/','[data-forest-map]'],
  ['nz-logs','agriculture/forestry/?example=new-zealand','[data-oceania-trade-id="NZL-logs-2024"]'],
 ];
 for(const viewport of report.viewports){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));
  const capture=async name=>{const file=`${viewport.width}-${name}.png`;await page.screenshot({path:resolve(output,file)});report.screenshots.push(file);};
  for(const [name,path,ready] of scenarios){
   await page.goto(base+path,{waitUntil:'networkidle'});
   if(name==='nz-milk'){await page.locator('[data-agro-statistics][data-agro-ready="true"]').waitFor();await page.locator('[data-agro-series-select]').selectOption('cattle-milk');}
   await page.locator(ready).waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,name+' document overflow');
   await capture(name+'-map');
   if(!name.includes('default')){
    const columns=page.locator('.agro-columns:visible');assert.equal(await columns.locator(':scope>section').count(),3);
    const map=page.locator('[data-primary-map]:visible,[data-forest-map]:visible').first();assert.ok((await columns.boundingBox()).y>=(await map.boundingBox()).y+(await map.boundingBox()).height,'statistics remain below the map');
    const positions=await columns.locator(':scope>section').evaluateAll(nodes=>nodes.map(node=>({x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,width:node.getBoundingClientRect().width,scroll:node.scrollWidth,client:node.clientWidth})));
    assert.ok(positions[0].x<positions[1].x&&positions[1].x<positions[2].x,name+' three columns');assert.ok(positions.every(p=>p.scroll<=p.client+1),name+' column overflow');
    await columns.scrollIntoViewIfNeeded();await capture(name+'-statistics');
   }
   if(name==='nz-logs'){
    for(const [product,id]of [['sawnwood-production','NZL-sawn-2024'],['wood-pulp-production','NZL-pulp-2024']]){
     await page.locator('[data-oceania-forest-product] select').selectOption(product);await page.locator(`[data-oceania-trade-id="${id}"]`).waitFor();await capture(id);
    }
    await page.locator('[data-forest-overview]').click();await page.locator('[data-oceania-forest-product]').waitFor({state:'hidden'});
   }
   report.checks.push({viewport,name,status:'passed'});
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status=browser?'failed':'blocked';report.errors.push(String(error));process.exitCode=1;
}finally{
 await browser?.close();await new Promise(done=>server.close(done));await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,status:report.status,screenshots:report.screenshots.length,errors:report.errors.map(error=>error.split('\n')[0])}));
}
