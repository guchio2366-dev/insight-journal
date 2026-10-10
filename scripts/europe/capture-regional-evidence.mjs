import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('docs/review/europe-distribution-2026-10-10');
await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.EUROPE_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const findings=[];
try {
  for(const width of [1440,1024]){
    const page=await browser.newPage({viewport:{width,height:width===1440?1000:800},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/insight-journal/atlas/europe/agriculture/',{waitUntil:'domcontentloaded'});
    await page.locator('.eu-live-map.is-ready').waitFor({timeout:30000});
    for(const [genre,expected] of [['livestock',['ie-south-dairy','ie-nw-other-cows','austrian-alps-dairy']],['horticulture',['rioja-vines','languedoc-vines','friuli-vines','attica-vines']]]){
      await page.locator(`[data-eu-topic="${genre}"]`).click();
      await page.waitForTimeout(350);
      const visible=await page.locator('.eu-farming-regional-evidence:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.euFarmingEvidence));
      assert.ok(visible.length>=2,`${width} ${genre}: at least two source-reported regions remain visible`);
      assert.ok(visible.every(id=>expected.includes(id)),`${width} ${genre}: no other genre's markers`);
      const countries=await page.locator('.eu-farming-country-evidence:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.euFarmingEvidence));
      assert.ok(countries.length>=6,`${width} ${genre}: principal countries remain visible`);
      if(genre==='horticulture')for(const id of ['olives-es','olives-it','olives-gr','olives-pt','vines-es','vines-fr','vines-it'])assert.ok(countries.includes(id),`${width}: ${id} country evidence`);
      else for(const id of ['dairy-de','dairy-fr','dairy-pl','suckler-fr','suckler-es'])assert.ok(countries.includes(id),`${width}: ${id} country evidence`);
      assert.equal(await page.locator('[data-eu-farming-regional-note]').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
      await page.screenshot({path:resolve(root,`${width}-${genre}.png`),animations:'disabled'});
      findings.push({width,genre,visible,countries});
    }
    assert.deepEqual(errors,[]);await page.close();
  }
}finally{await browser.close();}
await writeFile(resolve(root,'capture-manifest.json'),JSON.stringify({findings},null,2)+'\n');
console.log(JSON.stringify(findings));
