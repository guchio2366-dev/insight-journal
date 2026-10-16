import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from '../lib/agro-review-identity.mjs';
/** Cloud-only review; retain Chromium sandbox and stop if it is unavailable. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve(process.env.AGRO_REVIEW_OUTPUT??'review-artifacts/europe-quantity-flow-20261016');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,'');
    let path=resolve(dist,pathname);if(!path.startsWith(dist+sep))throw Error('outside build');
    if((await stat(path)).isDirectory())path=resolve(path,'index.html');
    res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/europe/agriculture/`;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()!=='',chromiumSandbox:true,deviceScaleFactor:1.5,viewports:[{width:1896,height:996},{width:1280,height:665}],cases:[],errors:[],status:'running'};
const cases=[['overview','layer=crops'],['regional-wheat','layer=wheat'],['regional-soybean','layer=soybean'],...['UKR','FRA','ITA','DEU'].map(code=>[`soybean-${code}`,`layer=soybean&place=${code}`]),['wheat-UKR','layer=wheat&place=UKR'],['wheat-GBR','layer=wheat&place=GBR'],['maize-UKR','layer=maize&place=UKR'],['forest-FIN','layer=forest&place=FIN'],['forest-DEU','layer=forest&place=DEU']];
let browser;
try{
  await verifyAgroReviewIdentity(report);browser=await chromium.launch({headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings'],executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium'});await verifyAgroBrowserSandbox(browser,report);
  for(const viewport of report.viewports){
    const context=await browser.newContext({viewport,deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(String(error)));
    for(const [name,query] of cases){
      await page.goto(`${origin}?${query}&render=static`,{waitUntil:'networkidle'});
      await page.evaluate(()=>document.fonts.ready);
      const custom=!name.startsWith('regional-')&&!name.startsWith('forest-')&&name!=='overview';
      if(custom)await page.waitForFunction(()=>document.querySelector('[data-eu-selected-quantity]')?.dataset.ready==='true');
      const map=page.locator('.eu-map-stage');await map.waitFor({state:'visible'});
      const before=await map.boundingBox();assert.ok(before.width>400&&before.height>250,'map has a readable frame');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'page horizontal overflow');
      await map.scrollIntoViewIfNeeded();
      await page.screenshot({path:resolve(out,`${name}-${viewport.width}x${viewport.height}-map.png`),fullPage:false});
      const target=page.locator(custom?'[data-eu-selected-quantity]':name.startsWith('regional-')?'[data-eu-verified-topic]:visible':name.startsWith('forest-')?'[data-eu-verified-wood]':'[data-eu-verified-overview]');
      await target.scrollIntoViewIfNeeded();
      const columns=target.locator(custom?':scope>[data-eu-quantity-content]>.agro-columns>section':'.eu-selected-region-columns>section');
      if(custom)assert.equal(await target.locator('[data-eu-previous-quantity]').evaluate(el=>el.open),false,'Existing reference stays collapsed and is not a second primary row');
      if(custom||name.startsWith('regional-')){
        assert.equal(await columns.count(),3);
        const boxes=await columns.evaluateAll(nodes=>nodes.map(node=>{const b=node.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,width:b.width};}));
        assert.ok(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<2,'three columns on one row');
        assert.ok(boxes.every(b=>b.x>=-1&&b.right<=viewport.width+1),'columns fit');
      }
      await target.screenshot({path:resolve(out,`${name}-${viewport.width}x${viewport.height}-statistics.png`)});
      const after=await map.boundingBox();assert.deepEqual([after.width,after.height],[before.width,before.height],'statistics selection does not resize the map frame');
      report.cases.push({name,viewport,status:'passed'});
    }
    // Exercise the actual selector, including leaving a pending custom flow.
    await page.goto(`${origin}?layer=soybean&place=UKR&render=static`,{waitUntil:'networkidle'});
    await page.selectOption('[data-eu-topic-country]','FRA');
    await page.waitForFunction(()=>document.querySelector('[data-eu-quantity-country]')?.getAttribute('data-eu-quantity-country')==='FRA');
    await page.locator('[data-eu-topic="crops"]').click();
    assert.equal(await page.locator('[data-eu-selected-quantity]').isVisible(),false);
    assert.equal(await page.locator('[data-eu-verified-overview]').isVisible(),true);
    await context.close();
  }
  assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='blocked-or-failed';report.errors.push(String(error));process.exitCode=1;}
finally{await browser?.close();await new Promise(done=>server.close(done));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,cases:report.cases.length,report:resolve(out,'report.json')}));
