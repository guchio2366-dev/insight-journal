import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const enabled=process.env.ATLAS_ASIA_BROWSER==='1';
const base='/insight-journal',root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
async function serve(){
 const server=createServer(async(req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith(base+'/')){res.writeHead(404).end();return;}
  const file=path.resolve(root,'.'+pathname.slice(base.length)+(pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
 }catch{res.writeHead(404).end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,url:`http://127.0.0.1:${server.address().port}${base}`};
}

test('南アジア・中央アジアの入口から選択、復帰、分野往復が地域内に保たれる',{skip:enabled?false:'ATLAS_ASIA_BROWSER=1 with a production build',timeout:180000},async()=>{
 const {chromium}=await import('playwright'),{server,url}=await serve();let browser;
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const [region,expected,selected,city,foreign] of [
   ['south-asia',['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK'],'IND','new-delhi','KAZ'],
   ['central-asia',['KAZ','KGZ','TJK','TKM','UZB'],'KAZ','astana','IND'],
  ]){
   await page.goto(`${url}/atlas/asia/${region}/nature/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
   const config=JSON.parse(await page.locator('[data-asia-config]').textContent());
   assert.deepEqual(config.countries.map(c=>c.code).sort(),expected);
   assert.equal(config.focusId,region);
   assert.equal(config.cities.some(c=>c.id===city),true);
   assert.equal(await page.locator(`[data-country-select] option[value="${foreign}"]`).count(),0);
   assert.equal(await page.locator(`.regional-tabs a[href$="/${region}/"]`).getAttribute('aria-current'),'page');
   await page.locator('[data-city-select]').selectOption(city);
   assert.equal(new URL(page.url()).searchParams.get('city'),city);
   await page.locator(`[data-city-panel="${city}"]`).waitFor({state:'visible'});
   await page.locator('[data-reset]').click();
   assert.equal(new URL(page.url()).searchParams.get('city'),null);
   await page.locator('[data-country-select]').selectOption(selected);
   assert.equal(new URL(page.url()).searchParams.get('place'),selected);
   await page.locator('[data-reset]').click();
   assert.equal(new URL(page.url()).searchParams.get('place'),null);
   assert.match(await page.locator('[data-current-place]').textContent(),new RegExp(region==='south-asia'?'南アジア':'中央アジア'));
   await page.locator(`.atlas-tabs [data-field="industry"]`).click();
   await page.waitForURL(`**/atlas/asia/${region}/industry/**`);
   const industry=JSON.parse(await page.locator('[data-asia-config]').textContent());
   assert.ok(industry.industrySites.every(site=>expected.includes(site.country)));
   assert.equal(await page.locator('[data-sc-industry-topic] option[value="sc-hydro"]').count(),1);
   await page.goBack();
   await page.waitForURL(`**/atlas/asia/${region}/nature/**`);
   assert.equal(await page.locator('[data-country-select]').inputValue(),'');
   await page.locator(`.atlas-tabs [data-field="population"]`).click();
   await page.waitForURL(`**/atlas/asia/${region}/population/**`);
   const population=JSON.parse(await page.locator('[data-asia-config]').textContent());
   assert.ok(population.population.cities.every(item=>expected.includes(item.country)));
   const censusCodes=await page.locator('[data-sc-religion-select]').evaluateAll(buttons=>buttons.map(button=>button.dataset.scReligionSelect));
   assert.deepEqual(censusCodes,region==='central-asia'?['KAZ']:['IND','PAK','BGD','NPL','LKA']);
   for(const topic of ['ethnicity','religion']){
    const visibleIds=population.presentation.settlements[topic].categories.map(category=>category.id);
    const legendIds=await page.locator(`[data-settlement-legend="${topic}"] [data-settlement-choice]`).evaluateAll(buttons=>buttons.map(button=>button.dataset.settlementChoice));
    assert.deepEqual(legendIds,visibleIds);
   }
   await page.goto(`${url}/atlas/asia/${region}/agriculture/`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.focusMaskStatus==='ready');
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmContextStatus==='ready');
   await page.goto(`${url}/atlas/asia/${region}/nature/?topic=terrain`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-physical-takeaway]')?.textContent.includes('等高線')||document.querySelector('[data-physical-takeaway]')?.textContent.includes('ヒマラヤ'));
   const terrainText=await page.locator('[data-physical-reading]').textContent();
   if(region==='central-asia')assert.doesNotMatch(terrainText,/ネパール|デカン|インド半島|ベンガル/);
   await page.goto(`${url}/atlas/asia/${region}/population/?topic=religion`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(count=>document.querySelectorAll('.sc-religion-marker').length===count,region==='central-asia'?1:5);
   const markers=await page.locator('.sc-religion-marker').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
   assert.equal(markers.some(label=>label.includes('カザフスタン')),region==='central-asia');
   await page.locator('.sc-religion-marker').first().click();
   assert.ok(expected.includes(new URL(page.url()).searchParams.get('place')));
   await page.goBack();
   await page.waitForFunction(()=>new URL(location.href).searchParams.get('place')===null);
   assert.equal(await page.locator('.sc-religion-marker').count(),region==='central-asia'?1:5);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
