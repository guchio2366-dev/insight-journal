import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox} from 'playwright';
import {westIndustryCatalog as catalog,westIndustrySectors as sectors} from '../src/data/atlas/west-asia-industry-catalog.mjs';

export async function verifyWestAsiaIndustry({output='/tmp/atlas-canada-qa/west-asia/industries-20261014',browserName='chromium',executablePath=process.env.REVIEW_CHROME_PATH}={}){
 await mkdir(output,{recursive:true});
 const server=createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');
   let file=path.resolve('dist','.'+pathname);assert(file.startsWith(path.resolve('dist')+path.sep));
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`,route=origin+'/insight-journal/atlas/west-asia/industry/';
 let browser;const errors=[],failures=[],records=[];
 try{
  browser=await (browserName==='firefox'?firefox:chromium).launch(browserName==='firefox'?{headless:true}:{headless:true,executablePath,chromiumSandbox:true});
  for(const viewport of [{width:1920,height:1080},{width:1440,height:1000},{width:1024,height:768},{width:390,height:844}]){
   const context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce'});
   await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
   await page.goto(route,{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('[data-west-industry]')?.dataset.ready==='true');await page.evaluate(()=>document.fonts.ready);
   const frame=await page.locator('[data-wi-map]').getAttribute('viewBox');
   const labelPositions=()=>page.locator('[data-wi-label]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.wiLabel,[n.style.left,n.style.top,n.style.width,n.style.height]])));
   async function layoutCheck(){
    const dimensions=await page.evaluate(()=>{
     const map=document.querySelector('[data-wi-map]').getBoundingClientRect(),labels=[...document.querySelectorAll('[data-wi-label]')].filter(n=>!n.hidden).map(n=>({id:n.dataset.wiLabel,...n.getBoundingClientRect().toJSON()}));
     const collisions=[];for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){const x=labels[a],y=labels[b];if(x.left<y.right&&y.left<x.right&&x.top<y.bottom&&y.top<x.bottom)collisions.push([x.id,y.id]);}
     const outside=labels.filter(n=>n.left<map.left-1||n.top<map.top-1||n.right>map.right+1||n.bottom>map.bottom-50).map(n=>n.id);
     return {map:map.toJSON(),collisions,outside,overflow:document.documentElement.scrollWidth>innerWidth,labels:labels.length};
    });
    assert.equal(dimensions.overflow,false,`${viewport.width} document overflow`);assert.deepEqual(dimensions.collisions,[]);assert.deepEqual(dimensions.outside,[]);assert(dimensions.map.width>280&&dimensions.map.height>280);return dimensions;
   }
   async function capture(name,statistics=false){
    if(statistics)await page.locator('#west-industry-statistics').scrollIntoViewIfNeeded();else await page.locator('[data-wi-map]').scrollIntoViewIfNeeded();
    const file=`${viewport.width}-${name}.png`;await page.screenshot({path:path.join(output,file),animations:'disabled'});records.push({file,viewport,...await layoutCheck()});
   }
   for(const sector of sectors){
    await page.locator(`[data-wi-sector="${sector.id}"]`).click();await layoutCheck();await capture(sector.id+'-overview');
    const expected=await labelPositions();
    for(const i of catalog.filter(i=>i.sectors.includes(sector.id))){
     await page.locator(`[data-wi-label="${i.id}"]`).click();
     assert.equal(await page.locator('[data-wi-title]').innerText(),i.label);assert.equal(await page.locator(`[data-wi-stat-panel="${i.id}"]`).isVisible(),true);
     assert.deepEqual(await labelPositions(),expected,`${viewport.width}/${i.id}: selection label positions`);
     assert.equal(await page.locator('[data-wi-map]').getAttribute('viewBox'),frame);
     // List alternative also tests points obscured by nearby industry labels.
     await page.locator('.wi-reading details').evaluate(n=>n.open=true);
     await page.locator(`[data-wi-place-button="${i.id}"]`).first().click();
     assert.equal(await page.locator('[data-wi-place-reading]').isVisible(),true);assert.deepEqual(await labelPositions(),expected);
     await page.locator('[data-wi-only]').check();assert.equal(await page.locator('[data-wi-label]:visible').count(),1);assert.deepEqual(await labelPositions(),expected);
     await page.locator('[data-wi-clear]').click();assert.deepEqual(await labelPositions(),expected);await page.locator('.wi-reading details').evaluate(n=>n.open=false);
    }
   }
   await page.locator('[data-wi-sector=resources]').click();await page.locator('[data-wi-label=lng]').click();
   await page.locator('[data-wi-country]').selectOption('QAT');assert.match(await page.locator('[data-wi-ranking=lng]').innerText(),/81.51/);
   await capture('qatar-lng');await capture('lng-statistics',true);
   await page.locator('[data-wi-country]').selectOption('IRN');assert.match(await page.locator('[data-wi-ranking=lng]').innerText(),/未取得.*0/s);
   await page.reload();await page.waitForFunction(()=>document.querySelector('[data-west-industry]')?.dataset.ready==='true');assert.equal(await page.locator('[data-wi-country]').inputValue(),'IRN');
   await page.locator('[data-wi-country]').selectOption('');await page.locator('[data-wi-sector=services]').click();await page.locator('[data-wi-label=ports]').click();
   assert.equal(await page.locator('[data-wi-country-shape=ARE]').first().getAttribute('fill'),'#f0efe3');
   await page.goBack();await page.waitForFunction(()=>document.querySelector('[data-west-industry]')?.dataset.ready==='true');assert.equal(await page.locator('[data-wi-title]').innerText(),'サービス業');
   await page.goForward();await page.waitForFunction(()=>document.querySelector('[data-west-industry]')?.dataset.ready==='true');assert.equal(await page.locator('[data-wi-title]').innerText(),'港湾・物流');
   await page.locator('[data-wi-map]').focus();await page.keyboard.press('+');const zoomed=await page.locator('[data-wi-map]').getAttribute('viewBox');assert.notEqual(zoomed,frame);
   await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('[data-wi-map]').getAttribute('viewBox'),zoomed);
   await page.locator('[data-wi-reset]').click();assert.equal(await page.locator('[data-wi-map]').getAttribute('viewBox'),frame);await layoutCheck();
   if(viewport.width>=960){const d=await page.evaluate(()=>{const m=document.querySelector('.wi-map-frame').getBoundingClientRect(),r=document.querySelector('.wi-reading').getBoundingClientRect(),s=document.querySelector('#west-industry-statistics').getBoundingClientRect();return {map:m.toJSON(),reading:r.toJSON(),statistics:s.toJSON()};});assert(d.reading.left>=d.map.right);assert(d.statistics.top>=d.map.bottom);}
   await context.close();
  }
  assert.deepEqual(errors,[],'browser page errors');assert.deepEqual(failures,[],'local HTTP failures');
  await writeFile(path.join(output,'verification.json'),JSON.stringify({browser:browserName,deviceScaleFactor:1,checks:['21 series and all sector overlaps','industry/place/only/clear','stable labels and camera','country missingness','reload/back/forward','keyboard zoom/pan/reset','1920/1440/1024/390 screenshots','right-hand prose and statistics below map'],records,errors,failures},null,2)+'\n');
  return {output,records:records.length,browser:browserName};
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname))console.log(await verifyWestAsiaIndustry({browserName:process.env.WEST_ASIA_REVIEW_BROWSER??'chromium',executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',output:process.env.WEST_ASIA_REVIEW_OUTPUT??'/tmp/atlas-canada-qa/west-asia/industries-20261014'}));
