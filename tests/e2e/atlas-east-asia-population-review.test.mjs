import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const enabled=process.env.ATLAS_ASIA_BROWSER==='1';
const root=path.resolve('dist');
const base='/insight-journal';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};

test('East Asia religion mix and selected settlement preserve map camera and source scope',{
 skip:enabled?false:'Set ATLAS_ASIA_BROWSER=1 after npm run build.',timeout:120000,
},async()=>{
 const {chromium}=await import('playwright');
 const server=createServer(async(req,res)=>{
  try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!pathname.startsWith(base+'/'))throw Error('scope');const relative=pathname.slice(base.length)+(pathname.endsWith('/')?'index.html':'');const file=path.resolve(root,'.'+relative);if(!file.startsWith(root+path.sep))throw Error('path');const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(body);}catch{res.writeHead(404).end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox:process.env.ATLAS_ASIA_BROWSER_UNSANDBOXED!=='1',...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  for(const viewport of [{width:1440,height:1000}]){
   const page=await browser.newPage({viewport});
   try{
    await page.goto(`http://127.0.0.1:${server.address().port}${base}/atlas/asia/east-asia/population/`);
    await page.locator('[data-map-ready=true]').waitFor();
    await page.locator('[data-population-group=religion]').click();
    await page.waitForFunction(()=>document.querySelector('[data-asia-explorer]')?.dataset.topic==='religion');
    assert.equal(await page.locator('.asia-religion-marker').count(),5);
    assert.equal(await page.locator('.asia-religion-marker[data-country]').count(),4);
    assert.equal(await page.locator('.asia-religion-marker[data-country] .asia-religion-map-bar').count(),4);
    assert.equal(await page.locator('.asia-religion-marker[data-country] .asia-religion-map-bar').evaluateAll(bars=>bars.every(bar=>bar.getBoundingClientRect().width>100&&bar.getBoundingClientRect().height>=8)),true);
    assert.equal(await page.locator('.asia-religion-marker').evaluateAll(cards=>{const frame=document.querySelector('.asia-map-frame').getBoundingClientRect();return cards.every(card=>{const box=card.getBoundingClientRect();return box.left>=frame.left&&box.right<=frame.right&&box.top>=frame.top&&box.bottom<=frame.bottom;});}),true);
    assert.match(await page.locator('.asia-religion-marker[data-country=KOR]').textContent(),/キリスト教32％/);
    assert.match(await page.locator('.asia-religion-marker[data-country=TWN]').textContent(),/道教24％/);
    assert.match(await page.locator('[data-grid-reading]').textContent(),/宗教回答の構成/);
    assert.doesNotMatch(await page.locator('[data-grid-reading]').textContent(),/居住域の重なり/);
    assert.equal(await page.locator('[data-settlement-reading=religion] .asia-religion-census').isVisible(),true);
    assert.match(await page.locator('[data-settlement-reading=religion]').textContent(),/日本.*仏教46％.*宗教なし42％.*韓国.*キリスト教 32％.*台湾.*道教 24％.*モンゴル.*イスラム教 3.2％.*中国本土.*帰属.*10％/s);
    assert.equal(await page.locator('[data-map-surface]').evaluate(el=>el.clientHeight)>=300,true);
    if(process.env.ATLAS_ASIA_CAPTURE)await page.screenshot({path:`/tmp/east-religion-${viewport.width}.png`,fullPage:true});
    await page.locator('[data-dock-compare=agriculture]').click();
    await page.waitForFunction(()=>document.querySelector('[data-asia-explorer]')?.dataset.field==='agriculture');
    await page.locator('[data-comparison-back]').click();
    await page.waitForFunction(()=>document.querySelector('[data-asia-explorer]')?.dataset.topic==='religion');
    assert.equal(await page.locator('.asia-religion-marker[data-country]').count(),4);
    await page.locator('.asia-settlement-cases summary').click();
    await page.locator('[data-settlement-topic=religion][data-settlement-choice=religion-0]').click();
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('detail')==='religion-0');
    assert.match(await page.locator('[data-settlement-detail=religion-0]').textContent(),/GeoEPR/);
    await page.reload();
    await page.locator('[data-settlement-detail=religion-0]').waitFor({state:'visible'});
    await page.locator('[data-settlement-reading=religion] [data-settlement-clear]:visible').click();
    await page.locator('[data-population-group=identity]').click();
    await page.waitForFunction(()=>document.querySelector('[data-asia-explorer]')?.dataset.topic==='ethnicity');
    assert.equal(await page.locator('[data-settlement-legend=ethnicity] button').count(),9);
    assert.equal(await page.locator('.asia-map-annotations .asia-settlement-label:visible').count()<=4,true);
    if(process.env.ATLAS_ASIA_CAPTURE)await page.screenshot({path:`/tmp/east-ethnicity-${viewport.width}.png`,fullPage:true});
    const before=JSON.parse(await page.locator('[data-map-camera]').getAttribute('data-map-camera'));
    await page.locator('[data-settlement-topic=ethnicity][data-settlement-choice=ethnicity-6]').click();
    await page.locator('[data-settlement-detail=ethnicity-6]').waitFor({state:'visible'});
    const after=JSON.parse(await page.locator('[data-map-camera]').getAttribute('data-map-camera'));
    assert.ok(Math.abs(before.lng-after.lng)<1e-8&&Math.abs(before.lat-after.lat)<1e-8&&Math.abs(before.zoom-after.zoom)<1e-8,'settlement selection keeps the actual map center and zoom');
    assert.match(await page.locator('[data-settlement-detail=ethnicity-6]').textContent(),/博物館/);
   }finally{await page.close();}
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
