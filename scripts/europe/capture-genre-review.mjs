import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4173/insight-journal/atlas/europe/';
const output=resolve('docs/review/europe-2026-10-09');
await mkdir(output,{recursive:true});
const baseCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch({headless:true,executablePath:process.env.EUROPE_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const records=[];
try {
  for(const width of [1440,1024]) {
    const page=await browser.newPage({viewport:{width,height:width===1440?1000:800},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'agriculture/',{waitUntil:'domcontentloaded'});
    await page.locator('.eu-live-map.is-ready').waitFor({timeout:30000});
    await page.waitForTimeout(250);
    const check=async(name,title,visibleIds)=>{
      assert.ok((await page.locator('[data-eu-map-title]').textContent()).includes(title));
      const ids=await page.locator('[data-eu-farm-area]').evaluateAll(nodes=>[...new Set(nodes.filter(node=>node.style.display!=='none').map(node=>node.getAttribute('data-eu-farm-area')))].sort());
      assert.deepEqual(ids,visibleIds.slice().sort());
      assert.equal(await page.locator('[data-eu-farming-toggles]').count(),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.waitForTimeout(250);
      const file=`${width}-${name}.png`;
      await page.screenshot({path:resolve(output,file),animations:'disabled'});
      records.push({width,name,title:await page.locator('[data-eu-map-title]').textContent(),ids,labels:await page.locator('.eu-map-label:visible').allTextContents(),file});
    };
    await check('crops','穀物・畑作',['wheat','barley','maize','potato','sugarbeet','rapeseed']);
    await page.locator('[data-eu-layer="wheat"]').click();
    assert.equal(await page.locator('[data-eu-single]').isVisible(),true);
    assert.notEqual(await page.locator('[data-eu-farm-area="barley"]').first().getAttribute('style'), 'display: none;');
    await page.locator('[data-eu-overview]').click();
    await page.locator('[data-eu-topic="livestock"]').click();
    await check('livestock','酪農・畜産',['cattle','pig','chicken','sheep']);
    await page.locator('[data-eu-layer="pig"]').click();
    assert.notEqual(await page.locator('[data-eu-farm-area="cattle"]').first().getAttribute('style'), 'display: none;');
    await page.locator('[data-eu-overview]').click();
    await page.locator('[data-eu-topic="horticulture"]').click();
    await check('horticulture','果樹・園芸',['citrus','temperatefruit','vegetables']);
    await page.locator('[data-eu-topic="treecover"]').click();
    assert.match(await page.locator('[data-eu-map-title]').textContent(),/樹木被覆/);
    await page.locator('[data-eu-topic="crops"]').click();
    assert.match(await page.locator('[data-eu-map-title]').textContent(),/穀物・畑作/);
    await page.goto(base+'industry/',{waitUntil:'domcontentloaded'});
    await page.locator('.eu-live-map.is-ready').waitFor({timeout:30000});
    await page.waitForTimeout(250);
    await page.screenshot({path:resolve(output,`${width}-industry.png`),animations:'disabled'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
    records.push({width,name:'industry',labels:await page.locator('.eu-map-label[data-eu-industry]:visible').allTextContents(),file:`${width}-industry.png`});
    assert.deepEqual(errors,[]);
    await page.close();
  }
}finally{await browser.close();}
await writeFile(resolve(output,'capture-manifest.json'),JSON.stringify({baseCommit,source:'local working tree; screenshots captured after the code changes listed in this Draft PR',records},null,2)+'\n');
console.log(JSON.stringify({baseCommit,records:records.map(({width,name,ids,labels})=>({width,name,ids,labels}))}));
