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
   report.phase=`${width}/${region}/${field}`;
   await page.goto(`${base}atlas/${region}/${field}/`,{waitUntil:'networkidle'});
   // Russia's dedicated industry page owns its three-sector/product contract.
   // The complete 19-product/49-place checks live in verify-russia-industry-review.mjs.
   if(region==='russia'&&field==='industry'){
    await page.waitForFunction(()=>document.querySelector('[data-ru-industry]')?.dataset.ruReady==='true');
    const host=page.locator('[data-ru-industry]'),map=host.locator('[data-ru-map]'),frame=await map.getAttribute('viewBox');
    assert.equal(frame,'0 0 1200 597');
    for(const sector of ['resources','manufacturing','services']){
     await host.locator(`[data-ru-sector="${sector}"]`).click();
     assert.equal(new URL(page.url()).searchParams.get('sector'),sector);
     assert.ok(await host.locator('[data-ru-marker]').count()>0);
     assert.ok(await host.locator('[data-ru-label]').count()>0);
     assert.equal(await map.getAttribute('viewBox'),frame);
     assert.ok((await host.locator('[data-ru-reading]').textContent()).length>35);
     await host.locator('[data-ru-canvas]').scrollIntoViewIfNeeded();
     await capture(`${width}-russia-industry-${sector}`);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    report.checks.push({region,field,width,status:'passed',contract:'dedicated three-sector industry page'});
    continue;
   }
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
     await noro.locator('circle').click();
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
     await root.locator('[data-primary-map] [data-oceania-industry-location="noro-port"] circle').click();
     query=new URL(page.url()).searchParams;
     assert.equal(query.get('sector'),'services');
     assert.equal(query.get('sectorOnly'),'1');
     await root.locator('[data-industry-only]').click();
     await root.locator('[data-primary-map] [data-oceania-industry-location="lihir-project"] circle').click();
     query=new URL(page.url()).searchParams;
     assert.equal(query.get('sector'),'resources');
     assert.equal(query.has('sectorOnly'),false);
    }
    await root.locator(`[data-industry-sector="${region==='oceania'?'resources':'services'}"]`).click();
    assert.equal(new URL(page.url()).searchParams.has('sector'),false);
    assert.equal(await map.getAttribute('viewBox'),frame);
    if(region==='oceania'){
     // ResizeObserver can redraw after the sector controls change the reader.
     // Measure every name and its frame together after that render boundary.
     await page.evaluate(async()=>{await document.fonts.ready;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));});
     const {guideBoxes,otherBoxes,bounds}=await root.evaluate(element=>{
      const stage=element.querySelector('[data-primary-map]'),svg=stage.querySelector('svg');
      const box=node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};
      return {guideBoxes:[...svg.querySelectorAll('[data-oceania-industry-location^="nz-"] text')].map(box),otherBoxes:[...svg.querySelectorAll('[data-oceania-industry-location]:not([data-oceania-industry-location^="nz-"]) text, svg > text')].map(box),bounds:box(stage)};
     });
     const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
     for(const box of guideBoxes)assert.ok(box.width>0&&box.height>0&&box.x>=bounds.x&&box.y>=bounds.y&&box.x+box.width<=bounds.x+bounds.width&&box.y+box.height<=bounds.y+bounds.height,`${width}: NZ guide names stay inside the map: ${JSON.stringify({box,bounds})}`);
     for(const [index,box] of guideBoxes.entries())for(const other of [...guideBoxes.slice(index+1),...otherBoxes])assert.equal(overlap(box,other),false,`${width}: NZ guide names avoid other map names`);
     for(const id of ['nz-dairy-guide','nz-wood-guide']){
      await root.locator(`[data-primary-map] [data-oceania-industry-location="${id}"] circle`).click();
      assert.equal(new URL(page.url()).searchParams.get('industryLocation'),id);
      assert.equal(new URL(page.url()).searchParams.get('sector'),'manufacturing');
      assert.match(await root.locator('[data-takeaway]').textContent(),/都市中心の案内位置.*工場の入口・敷地ではありません/);
      assert.match(await root.locator('[data-explanation]').textContent(),/案内位置.*入口・敷地ではありません/);
      assert.equal(await map.getAttribute('viewBox'),frame);
      await capture(`${width}-${region}-industry-${id}`);
      await page.reload({waitUntil:'networkidle'});
      await page.waitForFunction(()=>document.querySelector('[data-oceania-learning]')?.dataset.oceaniaReady==='true');
      assert.equal(new URL(page.url()).searchParams.get('industryLocation'),id);
     }
     await root.locator('[data-primary-map] [data-oceania-industry-location="tauranga-port"] circle').click();
     assert.equal(new URL(page.url()).searchParams.get('industryLocation'),'tauranga-port','The nearby wood guide does not intercept the original port marker');
     await root.locator('[data-oceania-industry-return]').click();
    }
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
 assert.deepEqual(report.errors,[]);report.status='passed';delete report.phase;console.log(`Oceania/Russia UX: ${report.checks.length} PC field views, ${report.screenshots.length} screenshots; sandbox enabled.`);
}catch(error){report.status='failed';const detail=`${report.phase??'initialization'}: ${String(error)}; browser errors: ${report.errors.join(' | ')}`;report.errors.push(String(error));console.error(`::error::${detail.replaceAll('%','%25').replaceAll('\n','%0A').replaceAll('\r','%0D')}`);throw error;}
finally{await writeFile(resolve(output,'ux-review.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
