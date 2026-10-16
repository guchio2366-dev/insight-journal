// Cloud-only review. Keep Chromium's sandbox enabled; never connect to a user PC.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve(process.env.WEST_AGRO_REVIEW_OUT??'review-artifacts/west-asia-agro-residuals');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
 let path=resolve(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));
 if(!path.startsWith(dist+sep))throw Error('outside build');
 if((await stat(path)).isDirectory())path=resolve(path,'index.html');
 res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal`;
const viewports=[{width:1896,height:996},{width:1280,height:665}];
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingDiffSha256:createHash('sha256').update(execFileSync('git',['diff','HEAD'])).digest('hex'),status:'running',sandbox:true,deviceScaleFactor:1.5,requestedViewports:viewports,cases:[],errors:[]};
const cases=[['overview','','[data-west-farm-supply]'],['regional-wheat','?topic=wheat','[data-west-regional-flow-slot]'],['regional-dates','?topic=dates','[data-west-regional-flow-slot]'],['regional-olives','?topic=olives','[data-west-regional-flow-slot]'],['saudi-dates','?topic=dates&country=SAU','[data-west-product-statistics]'],['turkey-olives','?topic=olives&country=TUR','[data-west-product-statistics]'],['turkey-milk','?topic=cattle-milk&country=TUR','[data-agro-statistics]'],['turkey-eggs','?topic=hen-eggs&country=TUR','[data-agro-statistics]'],['turkey-chicken','?topic=chicken-meat&country=TUR','[data-agro-statistics]'],['turkey-beef','?topic=cattle-meat&country=TUR','[data-agro-statistics]'],['egypt-buffalo','?topic=buffalo-milk&country=EGY','[data-agro-statistics]'],['turkey-wheat','?topic=wheat&country=TUR','[data-agro-statistics]'],['turkey-forest','?topic=forest&country=TUR','[data-agro-statistics]']];
cases.push(['turkey-barley','?topic=barley&country=TUR','[data-agro-statistics]'],['turkey-rice','?topic=rice&country=TUR','[data-agro-statistics]']);
let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium'});
 assert.equal(JSON.parse(await readFile(resolve(dist,'_release.json'),'utf8')).commitSha,report.head);
 for(const viewport of viewports){
  const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  for(const [name,query,selector] of cases){
   await page.goto(origin+'/atlas/west-asia/agriculture/'+query,{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);
   await page.evaluate(()=>document.fonts.ready);const host=page.locator(selector);await host.waitFor({state:'visible'});
   if(selector==='[data-agro-statistics]')await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
   const measurement=await host.evaluate(el=>{const r=el.getBoundingClientRect(),map=document.querySelector('[data-west-map]').getBoundingClientRect(),columns=[...el.querySelectorAll('.agro-columns>section,[data-regional-flow-stage]')].map(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,font:parseFloat(getComputedStyle(n.querySelector('p:not(.agro-meta)')??n).fontSize)};});return{x:r.x,width:r.width,y:r.y,columns,map:{width:map.width,bottom:map.bottom},overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:el.scrollWidth>el.clientWidth+1,dpr:devicePixelRatio};});
   assert.equal(measurement.dpr,1.5);assert.equal(measurement.overflow,false,name);assert.equal(measurement.statisticsOverflow,false,name);assert.ok(measurement.map.width>400,name);
   if(name!=='overview'){assert.equal(measurement.columns.length,3,name);assert.ok(measurement.y>=measurement.map.bottom-1,name);assert.ok(Math.max(...measurement.columns.map(c=>c.y))-Math.min(...measurement.columns.map(c=>c.y))<2,name);assert.ok(measurement.columns.every(c=>c.font>=13),name);}
   if(name==='saudi-dates'){
    const reference=host.locator('[data-west-dates-trade]');assert.equal(await reference.evaluate(el=>el.open),false);
    await reference.locator(':scope>summary').click();assert.equal(await reference.locator('tbody tr').count(),118);
    assert.match(await reference.innerText(),/-0.064 t/);
   }
   if(name==='turkey-forest'){
    await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');await host.locator('[data-agro-series="sawnwood-production"]').waitFor();
    assert.match(await host.locator('[data-agro-stage=use]').innerText(),/221,253.*2.35%/s);
   }
   if(name==='turkey-wheat'){const reference=page.locator('[data-west-national-fbs=TUR]');assert.equal(await reference.evaluate(el=>el.open),false);await reference.locator(':scope>summary').click();assert.match(await reference.innerText(),/33,402.*4,188/s);}
   if(['turkey-wheat','turkey-barley','turkey-rice'].includes(name)){
    const topic=name.slice('turkey-'.length),reference=page.locator(`[data-west-gain="${topic}"]`);assert.equal(await reference.evaluate(el=>el.open),false);await reference.locator(':scope>summary').click();
    assert.match(await reference.innerText(),/2023\/24.*USDA Official/s);
    if(topic==='wheat'){const flour=reference.locator('[data-west-gain-flour]');await flour.locator(':scope>summary').click();assert.equal(await flour.locator('tbody tr').count(),9);}
   }
   await host.scrollIntoViewIfNeeded();const file=`${viewport.width}-${name}.png`;await page.screenshot({path:resolve(out,file),fullPage:true,animations:'disabled'});
   report.cases.push({name,viewport,file,...measurement});
  }
  // Compare the original overview after explicit selection and history restoration.
  await page.goto(origin+'/atlas/west-asia/agriculture/',{waitUntil:'networkidle'});
  const overview=page.locator('[data-west-farm-supply]'),before=await overview.evaluate(el=>el.outerHTML);
  await page.locator('[data-west-topic-button=dates]').first().click();await page.locator('[data-west-country]').selectOption('SAU');
  await page.locator('[data-west-product-statistics]').waitFor({state:'visible'});await page.goBack();await page.goBack();
  await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.topic==='farming-overview');
  assert.equal(await overview.evaluate(el=>el.outerHTML),before);assert.equal(await page.locator('[data-west-product-statistics]').isVisible(),false);
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){
 report.status=browser?'failed':'blocked';report.blocker=String(error).split('\n').find(line=>line.includes('FATAL:'))??String(error).split('\n')[0];report.action='chromium.launch({chromiumSandbox:true, headless:true})';report.executable=process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium';process.exitCode=1;
}finally{
 await browser?.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({status:report.status,head:report.head,cases:report.cases.length,report:resolve(out,'report.json'),blocker:report.blocker}));
