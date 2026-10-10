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
    for(const [genre,expected] of [['livestock',['ie-south-dairy','ie-nw-other-cows','austrian-alps-dairy']],['horticulture',[]]]){
      await page.locator(`[data-eu-topic="${genre}"]`).click();
      await page.waitForTimeout(350);
      const visible=await page.locator('.eu-farming-regional-evidence:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.euFarmingEvidence));
      assert.equal(visible.length,expected.length,`${width} ${genre}: only intended region markers remain`);
      assert.ok(visible.every(id=>expected.includes(id)),`${width} ${genre}: no other genre's markers`);
      const countries=await page.locator('.eu-farming-country-evidence:visible').evaluateAll(nodes=>nodes.map(node=>node.dataset.euFarmingEvidence));
      assert.ok(countries.length>=5,`${width} ${genre}: principal countries remain visible`);
      if(genre==='horticulture'){
        assert.deepEqual(countries.sort(),['produce-es','produce-fr','produce-gr','produce-it','produce-pt'].sort(),`${width}: five source-backed fruit country labels`);
        assert.equal(await page.locator('.eu-crop-label:visible').count(),0,`${width}: overview crop names stay in the inline key and item list`);
      }
      else for(const id of ['dairy-de','dairy-fr','dairy-pl','suckler-fr','suckler-es'])assert.ok(countries.includes(id),`${width}: ${id} country evidence`);
      if(genre==='horticulture'){
        const overlaps=await page.evaluate(()=>{
          const boxes=[...document.querySelectorAll('.eu-farming-country-evidence:not([hidden])')].map(node=>({name:node.textContent,box:node.getBoundingClientRect()}));
          const fruit=[...document.querySelectorAll('.eu-map-label')].filter(node=>node.textContent?.includes('温帯果樹')&&node.getBoundingClientRect().width).map(node=>({name:'温帯果樹',box:node.getBoundingClientRect()}));
          const hits=[];
          for(let i=0;i<boxes.length;i++)for(const other of [...boxes.slice(i+1),...fruit]){
            const a=boxes[i].box,b=other.box;
            if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)hits.push([boxes[i].name,other.name]);
          }
          return hits;
        });
        assert.deepEqual(overlaps,[],`${width}: fruit country labels and 温帯果樹 do not overlap`);
      }
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
