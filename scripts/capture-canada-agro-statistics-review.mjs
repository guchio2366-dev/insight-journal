import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from './lib/agro-review-identity.mjs';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve(process.env.AGRO_REVIEW_OUTPUT??'review-artifacts/canada-agro-statistics-20261016');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let path=resolve(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));if(!path.startsWith(dist+sep))throw Error('outside build');if((await stat(path)).isDirectory())path=resolve(path,'index.html');res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/canada/agriculture/`;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),viewports:[{width:1896,height:996},{width:1280,height:665}],plannedCases:22,sandbox:true,deviceScaleFactor:1.5,status:'running',cases:[],errors:[]};
let browser;
try{
 await verifyAgroReviewIdentity(report);browser=await chromium.launch({headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings'],executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium'});await verifyAgroBrowserSandbox(browser,report);
 for(const viewport of report.viewports){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  const cases=[['overview','',null],['soybean','?agriFocus=soybeans','soybeans'],['canola','?item=canola','canola'],['corn','?agriFocus=corn','maize-production'],['lentils','?agriFocus=lentils','lentils'],['wheat','wheat/','wheat-production'],['beef','beef/','cattle-meat'],['forest-overview','forestry/',null],['roundwood','forestry/?forestProduct=roundwood','roundwood'],['sawnwood','forestry/?forestProduct=sawnwood','sawnwood'],['pulp','forestry/?forestProduct=paper-pulp','paper-pulp']];
  for(const [name,path,product] of cases){
   await page.goto(origin+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const selected=page.locator('[data-canada-selected-statistics]');
   if(product){await selected.waitFor({state:'visible'});await selected.locator('.agro-columns').waitFor();}
   else assert.equal(await selected.isVisible(),false);
   const metrics=await page.evaluate(()=>{const host=document.querySelector('[data-canada-selected-statistics]'),columns=[...host.querySelectorAll('.agro-columns>section')].map(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width};}),map=[...document.querySelectorAll('[data-canada-agri-overview] .map-frame,[data-canada-census-stage],[data-forestry-stage]')].find(el=>el.getBoundingClientRect().height>0)?.getBoundingClientRect(),box=host.getBoundingClientRect();return{columns,overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:host.scrollWidth>host.clientWidth+1,statisticsY:box.y,mapBottom:map?.bottom};});
   assert.equal(metrics.overflow,false);if(product){assert.equal(metrics.statisticsOverflow,false);assert.equal(metrics.columns.length,3);assert.ok(metrics.columns.every(c=>Math.abs(c.y-metrics.columns[0].y)<2),'three columns aligned');if(metrics.mapBottom)assert.ok(metrics.statisticsY>=metrics.mapBottom-2,'statistics below map');}
   const file=`${viewport.width}x${viewport.height}-${name}.png`;await page.screenshot({path:resolve(out,file),fullPage:true});report.cases.push({name,viewport,metrics,file});
  }
  await context.close();
 }
 assert.equal(report.errors.length,0);report.status='passed';
}catch(error){report.status=browser?'failed':'blocked-browser-launch';report.errors.push(String(error));process.exitCode=1;}
finally{await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.length,report:resolve(out,'report.json')}));}
