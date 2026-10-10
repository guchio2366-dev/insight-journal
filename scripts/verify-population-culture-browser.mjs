import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import astroConfig from '../astro.config.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const out=fileURLToPath(new URL('../docs/reviews/population-culture-20261010',import.meta.url));
fs.mkdirSync(out,{recursive:true});
const base=astroConfig.base.replace(/\/$/,'');
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.gz':'application/gzip','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  assert.ok(pathname.startsWith(base+'/'));
  let file=path.resolve(dist,'.'+pathname.slice(base.length));
  assert.ok(file.startsWith(dist));
  if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(fs.readFileSync(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const chromiumSandbox=process.env.CULTURE_CHROMIUM_SANDBOX!=='0';
const browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox});
const results=[];
try{
for(const [label,width,height] of [['pc-1280',1280,665],['pc-1024',1024,665]]){
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [region,topic] of [['oceania','ethnicity'],['oceania','religion'],['russia','religion'],['russia','ethnicity'],['africa','religion'],['africa','ethnicity']]){
  await page.goto(`${origin}${base}/atlas/${region}/${region==='africa'?'':'population/'}?${region==='africa'?'field=population&':''}topic=${topic}&keep=review`);await page.waitForTimeout(200);
  assert.ok(await page.locator(region==='africa'?'[data-africa-topic='+topic+']':'[data-population-topic='+topic+']').isVisible());
  const panel=page.locator(`[data-culture-panel=${topic}]`);
  if(topic==='religion'||region==='oceania')await page.screenshot({path:`${out}/${region}-${topic}-${label}-initial.png`,fullPage:true});assert.equal(await page.locator(region==='africa'?'.africa-workspace':'[data-normal-view]').isVisible(),false);assert.equal(await panel.isVisible(),true);
  const fits=await panel.locator('.culture-map').evaluate(element=>{const map=element.getBoundingClientRect(),aside=element.closest('.culture-grid').querySelector('.culture-reading').getBoundingClientRect();return map.right<=aside.left;});assert.ok(fits,'map must not cover the reader');
  const overlaps=await panel.locator('.culture-marker').evaluateAll(nodes=>nodes.some((node,index)=>nodes.slice(index+1).some(other=>{const a=node.getBoundingClientRect(),b=other.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;})));assert.equal(overlaps,false,'country charts must not overlap');
  const map=await panel.locator('.culture-map').innerHTML();
  const records=await panel.locator('.culture-marker').count();
  if(records){await panel.locator('.culture-marker').first().click();assert.equal(await panel.locator('.culture-marker').count(),records);assert.equal(await panel.locator('.culture-map').innerHTML().then(s=>s.replaceAll('aria-pressed="true"','aria-pressed="false"')),map);
   await panel.getByLabel('右欄内の単一区分').click();await panel.getByLabel('右欄内の単一区分').selectOption('0');assert.equal(await panel.locator('.culture-single-value').isVisible(),true);assert.equal(await panel.locator('.culture-selected table').isVisible(),false);assert.equal(await panel.locator('.culture-marker').count(),records);
   await page.reload();assert.equal(await page.locator(`[data-culture-panel=${topic}] .culture-selected table`).isVisible(),true);assert.ok(new URL(page.url()).searchParams.get('culturePlace'));assert.equal(new URL(page.url()).searchParams.get('keep'),'review');
  }
  await page.screenshot({path:`${out}/${region}-${topic}-${label}.png`,fullPage:true});
  const geometry=await panel.locator('.culture-marker').evaluateAll(nodes=>nodes.map(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return {id:n.dataset.cultureRecord,inside:a.x>=b.x&&a.y>=b.y&&a.right<=b.right&&a.bottom<=b.bottom};}));assert.ok(geometry.every(g=>g.inside),JSON.stringify(geometry));
  await page.locator(region==='africa'?'[data-africa-topic=distribution]':'[data-population-topic=distribution]').click();assert.equal(await page.locator('[data-population-culture]').isVisible(),false);assert.equal(await page.locator(region==='africa'?'.africa-workspace':'[data-normal-view]').isVisible(),true);
  if(region==='africa'){await page.locator('[data-field=nature]').click();assert.equal(await page.locator('[data-population-culture]').isVisible(),false);await page.goBack();}
  await page.goBack();assert.equal(await page.locator('[data-population-culture]').isVisible(),true);
  results.push({region,topic,label,width,height,records,markerBounds:geometry,errors:[...errors]});assert.equal(errors.length,0,JSON.stringify(errors));
 }
 await page.close();
}
const noJs=await browser.newPage({javaScriptEnabled:false});await noJs.goto(`${origin}${base}/atlas/oceania/population/`);assert.equal(await noJs.locator('[data-population-culture]').isVisible(),true);assert.equal(await noJs.locator('[data-culture-panel=ethnicity]').isVisible(),true);await noJs.close();
fs.writeFileSync(`${out}/browser-results.json`,JSON.stringify({browser:browser.version(),chromiumSandbox,sandboxReason:chromiumSandbox?null:'Default sandbox launch failed: installed SUID helper is not configured. Local loopback preview only.',results,noJavascript:'both source tables available'},null,2)+'\n');console.log(`${results.length} population culture browser cases passed; screenshots: ${out}`);

}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
