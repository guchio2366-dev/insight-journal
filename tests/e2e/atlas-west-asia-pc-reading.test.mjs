// Use the existing Validate site's preinstalled, normally sandboxed Chrome.
// The existing Canada acceptance artifact also collects this region subfolder.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
test('西アジアのPC実画面で地域説明・3か国・欠測年・選択・復帰を確認する', {skip:!process.env.CI,timeout:150000},async()=>{
 const output='/tmp/atlas-canada-qa/west-asia';await mkdir(output,{recursive:true});
 const executablePath=process.env.REVIEW_CHROME_PATH||execFileSync('sh',['-c','command -v google-chrome || command -v google-chrome-stable'],{encoding:'utf8'}).trim();
 assert(executablePath,'Existing sandboxed Chrome is required');
 const records=[],errors=[],failures=[];
 const server=createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,'');
   let file=path.resolve('dist','.'+pathname);assert(file.startsWith(path.resolve('dist')+path.sep));
   if((await stat(file)).isDirectory())file=path.join(file,'index.html');
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
  }catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
  for(const viewport of [{width:1440,height:1000},{width:1024,height:768}]){
   const context=await browser.newContext({viewport,serviceWorkers:'block'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failures.push(response.url());});
   const open=async route=>{await page.goto(origin+'/insight-journal/atlas/west-asia/'+route);await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true'&&document.querySelector('[data-west-loading]')?.hidden);await page.evaluate(()=>document.fonts.ready);};
   const shot=async label=>{
    const file=`${viewport.width}-${label}.png`;const png=await page.screenshot({path:path.join(output,file),animations:'disabled'});
    const dimensions=await page.evaluate(()=>{const r=document.querySelector('[data-west-map]').getBoundingClientRect();return {map:{x:r.x,y:r.y,width:r.width,height:r.height},overflow:document.documentElement.scrollWidth>innerWidth};});
    assert(dimensions.map.width>200&&dimensions.map.height>200);assert.equal(dimensions.overflow,false);
    records.push({file,viewport,sha256:createHash('sha256').update(png).digest('hex'),...dimensions});
   };
   await open('industry/');
   await assert.doesNotReject(()=>page.locator('[data-west-regional-reading]').filter({hasText:'地域全体の供給網'}).waitFor());
   assert.equal(await page.locator('[data-west-comparison] tbody tr').count(),3);
   await shot('supply-network');
   for(const [code,word] of [['SAU','ジュバイル'],['ARE','ジュベル・アリ'],['TUR','ブルサ']]){
    await page.locator(`[data-west-industry-scope] [data-west-country-button="${code}"]`).click();
    await page.waitForFunction(code=>document.querySelector('[data-west-country]').value===code&&document.querySelector('[data-west-atlas]').dataset.ready==='true',code);
    assert((await page.locator('[data-west-regional-reading]').innerText()).includes(word));
    assert((await page.locator('[data-west-detail] .atlas-reading-takeaway').innerText()).includes(word));
    await shot('industry-'+code);
   }
   await page.locator('[data-west-industry-scope] [data-west-country-button=""]').press('Enter');
   assert.equal(await page.locator('[data-west-country]').inputValue(),'');
   await open('industry/?topic=oil&country=SAU&year=2024');
   assert((await page.locator('[data-west-detail]').innerText()).includes('未収録'));
   assert.equal(await page.locator('[data-west-year]').inputValue(),'2024');
   await page.reload();await page.waitForFunction(()=>document.querySelector('[data-west-atlas]')?.dataset.ready==='true');
   assert.equal(await page.locator('[data-west-year]').inputValue(),'2024');
   await open('nature/?topic=groundwater');
   assert((await page.locator('[data-west-detail]').innerText()).includes('再生しにくい地下水'));
   await shot('groundwater');
   await open('nature/?topic=climate&city=riyadh&country=SAU');
   await page.waitForFunction(()=>document.querySelector('[data-west-climate-class]')?.textContent.includes('BWh'));
   assert((await page.locator('[data-west-city-geography]').innerText()).includes('灌漑小麦'));
   assert.equal(await page.locator('[data-west-detail] [data-west-active-chart] svg').count(),1);
   await shot('riyadh-climate');
   await open('nature/?topic=basins');
   await page.locator('[data-west-basin-label] > summary').click();
   await page.locator('[data-west-basin]').selectOption('1060034260');
   await page.waitForFunction(()=>document.querySelector('[data-west-regional-reading]')?.textContent.includes('南の上流'));
   assert((await page.locator('[data-west-regional-reading]').innerText()).includes('南の上流'));
   assert(await page.evaluate(()=>{const svg=document.querySelector('[data-west-map]'),frame=svg.viewBox.baseVal,bounds=svg.querySelector('[data-basin="1060034260"]').getBBox();return bounds.x>=frame.x&&bounds.y>=frame.y&&bounds.x+bounds.width<=frame.x+frame.width&&bounds.y+bounds.height<=frame.y+frame.height;}),'the selected Nile basin remains fully inside the map frame');
   await shot('nile-basin');
   await open('agriculture/');
   assert.equal(await page.locator('[data-west-farm-context]').count(),5);
   await page.locator('[data-west-farming-selection] summary').click();
   assert((await page.locator('[data-west-farming-selection]').innerText()).includes('牛乳・鶏肉・鶏卵'));
   await shot('farming-coverage');
   await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  await writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),chromiumSandbox:true,records,errors,failures},null,2)+'\n');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
