// Production PC review for the Oceania and Russia workspace refresh.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const output=resolve(process.env.REGION_REVIEW_OUTPUT??'/tmp/oceania-russia-ux-refresh');
const directory=resolve('dist');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  assert.ok(path.startsWith('/insight-journal/'));
  path=path.slice('/insight-journal/'.length);if(path.endsWith('/'))path+='index.html';
  const file=resolve(directory,path);assert.ok(file.startsWith(directory+sep));
  res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(await readFile(file));
 }catch{if(!res.headersSent)res.writeHead(404);res.end('Missing local file');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/`;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(resolve(directory,'_release.json'),'utf8')),sandbox:true,status:'running',checks:[],screenshots:[],errors:[]};
let browser;
try{
 if(process.env.REGION_REVIEW_EXPECTED_HEAD){assert.equal(report.head,process.env.REGION_REVIEW_EXPECTED_HEAD);assert.equal(report.build.commitSha,report.head);}
 browser=await chromium.launch({executablePath:process.env.REGION_REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});
 const context=await browser.newContext({locale:'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(String(error)));
 const capture=async name=>{await page.screenshot({path:resolve(output,name+'.png'),fullPage:false});report.screenshots.push(name+'.png');};
 for(const [width,height] of [[1536,900],[1024,768]]){
  await page.setViewportSize({width,height});
  for(const region of ['oceania','russia'])for(const field of ['agriculture','nature','industry','population']){
   await page.goto(`${base}atlas/${region}/${field}/`,{waitUntil:'networkidle'});
   await page.waitForFunction(r=>document.querySelector(`[data-${r}-learning]`)?.dataset[r+'Ready']==='true',region);
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('[data-primary-map] image')].map(el=>new Promise((done,reject)=>{const image=new Image();image.onload=done;image.onerror=()=>reject(new Error('Map image failed: '+el.getAttribute('href')));image.src=el.getAttribute('href');})));});
   const root=page.locator(`[data-${region}-learning]`),map=root.locator('[data-primary-map] svg'),frame=await map.getAttribute('viewBox');
   assert.ok(frame);assert.ok((await root.locator('[data-takeaway]').textContent()).length>15);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${region}/${field}/${width}: horizontal overflow`);
   if(region==='russia')assert.equal(await root.locator('[data-region-marker]').first().isVisible().catch(()=>false),false);
   await capture(`${width}-${region}-${field}-overview`);
   if(field==='industry'){
    const buttons=root.locator('[data-industry-sector]');
    assert.equal(await buttons.count(),3);
    for(const sector of ['resources','manufacturing','services']){
     await root.locator(`[data-industry-sector="${sector}"]`).click();
     assert.equal(new URL(page.url()).searchParams.get('sector'),sector);
     assert.equal(await map.getAttribute('viewBox'),frame);
     assert.ok(await map.locator(`[data-industry-sectors][data-sector-match="true"]`).count()>0);
     assert.ok(await map.locator(`[data-industry-sectors][data-sector-match="false"]`).count()>0);
     assert.equal(await root.locator('[data-industry-only]').isVisible(),true);
     await capture(`${width}-${region}-industry-${sector}`);
    }
    await root.locator('[data-industry-only]').click();
    assert.equal(await map.locator('[data-industry-sectors][data-sector-match="false"]').first().isVisible(),false);
    assert.equal(await map.getAttribute('viewBox'),frame);
    await capture(`${width}-${region}-industry-services-only`);
    if(region==='oceania'){
     const noro=root.locator('[data-primary-map] [data-oceania-industry-location="noro-port"]');
     await noro.click();
     let query=new URL(page.url()).searchParams;
     assert.equal(query.get('sector'),'services');
     assert.equal(query.get('sectorOnly'),'1');
     assert.equal(query.get('industryLocation'),'noro-port');
     assert.equal(await root.locator('[data-industry-only]').getAttribute('aria-pressed'),'true');
     assert.equal(await map.locator('[data-industry-sectors][data-sector-match="false"]').first().isVisible(),false);
     assert.equal(await map.getAttribute('viewBox'),frame);
     await capture(`${width}-${region}-industry-noro-services-only`);
    }
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(r=>document.querySelector(`[data-${r}-learning]`)?.dataset[r+'Ready']==='true',region);
    assert.equal(await root.locator('[data-industry-only]').getAttribute('aria-pressed'),'true');
    if(region==='oceania'){
     assert.equal(await root.locator('[data-primary-map] [data-oceania-industry-location="noro-port"]').getAttribute('aria-pressed'),'true');
     await root.locator('[data-oceania-industry-return]').click();
     let query=new URL(page.url()).searchParams;
     for(const key of ['sector','sectorOnly','industryLocation'])assert.equal(query.has(key),false);
     await root.locator('[data-industry-sector="services"]').click();
     await root.locator('[data-industry-only]').click();
     await root.locator('[data-primary-map] [data-oceania-industry-location="noro-port"]').click();
     query=new URL(page.url()).searchParams;
     assert.equal(query.get('sector'),'services');
     assert.equal(query.get('sectorOnly'),'1');
     await root.locator('[data-industry-only]').click();
     await root.locator('[data-primary-map] [data-oceania-industry-location="lihir-project"]').click();
     query=new URL(page.url()).searchParams;
     assert.equal(query.get('sector'),'resources');
     assert.equal(query.has('sectorOnly'),false);
    }
    await root.locator(`[data-industry-sector="${region==='oceania'?'resources':'services'}"]`).click();
    assert.equal(new URL(page.url()).searchParams.has('sector'),false);
    assert.equal(await map.getAttribute('viewBox'),frame);
   }
   if(field==='agriculture'){
    const crop=root.locator('[data-farming-group=crop]'),livestock=root.locator('[data-farming-group=livestock]');
    const switchBox=await root.locator(`.${region}-farming-visibility`).boundingBox();
    for(const selector of ['[data-layer]','[data-farming-single]']){
     const control=root.locator(selector);if(!await control.isVisible())continue;
     const box=await control.boundingBox();
     assert.ok(box.y+box.height<=switchBox.y||switchBox.y+switchBox.height<=box.y||box.x+box.width<=switchBox.x||switchBox.x+switchBox.width<=box.x,`${region}/${width}: farming controls overlap ${selector}`);
    }
    assert.equal(await crop.getAttribute('aria-pressed'),'true');assert.equal(await livestock.getAttribute('aria-pressed'),'true');
    await crop.click();assert.equal(await crop.getAttribute('aria-pressed'),'false');assert.equal(await livestock.getAttribute('aria-pressed'),'true');
    assert.equal(await root.locator('[data-primary-map] [data-farming-product=wheat]').first().isVisible(),false);
    await capture(`${width}-${region}-crop-off`);
    await crop.click();await livestock.click();assert.equal(await root.locator('[data-primary-map] [data-farming-product=cattle]').first().isVisible(),false);
    assert.equal(await map.getAttribute('viewBox'),frame);await capture(`${width}-${region}-livestock-off`);
   }
   if(field==='nature'){
    await root.locator('[data-layer]').selectOption('rivers');
    const river=region==='oceania'?'Murray':'Volga',name=region==='oceania'?'マレー川':'ボルガ川';
    const mark=root.locator(`[data-primary-map] [data-river-label=${river}]`);
    await mark.click();
    assert.equal(await root.locator('[data-theme-title]').textContent(),name);
    assert.equal(await mark.getAttribute('aria-pressed'),'true');
    assert.equal(await map.getAttribute('viewBox'),frame);
    await capture(`${width}-${region}-river-selected`);
   }
   report.checks.push({width,height,region,field,frame});
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(`Oceania/Russia UX: ${report.checks.length} PC field views, ${report.screenshots.length} screenshots; sandbox enabled.`);
}catch(error){report.status='failed';report.errors.push(String(error));console.error(`::error::${String(error)}`);throw error;}
finally{await writeFile(resolve(output,'ux-review.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
