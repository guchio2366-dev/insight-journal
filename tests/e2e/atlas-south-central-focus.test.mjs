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
  }
  assert.deepEqual(errors,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
