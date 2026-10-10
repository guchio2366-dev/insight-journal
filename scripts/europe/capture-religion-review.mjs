import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';

const base='http://127.0.0.1:4173/insight-journal/atlas/europe/population/?layer=religion';
const output=resolve('docs/review/europe-2026-10-09');
const browser=await chromium.launch({headless:true,executablePath:process.env.EUROPE_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
try {
  for(const width of [1440,1024]) {
    const page=await browser.newPage({viewport:{width,height:width===1440?1000:800},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.locator('.eu-live-map.is-ready').waitFor({timeout:30000});
    await page.locator('[data-eu-pew-map-key]:visible').waitFor();
    assert.equal(await page.locator('[data-eu-religion-national]:visible').count(),0);
    assert.equal(await page.locator('[data-eu-pew-marker]').count(),40);
    const markerLayout=await page.evaluate(()=>{
      const caption=document.querySelector('.eu-map-heading').getBoundingClientRect();
      const markers=[...document.querySelectorAll('[data-eu-pew-marker]')].filter(node=>!node.hidden);
      const rects=markers.map(node=>node.getBoundingClientRect());
      let significantOverlaps=0;
      for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
        const a=rects[i],b=rects[j],area=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
        if(area>40)significantOverlaps++;
      }
      return {visible:markers.length,captionCollisions:rects.filter(rect=>rect.bottom>caption.top).length,significantOverlaps};
    });
    assert.ok(markerLayout.visible>=30,`${width}px: visible country compositions`);
    assert.equal(markerLayout.captionCollisions,0,`${width}px: map compositions stay above the caption`);
    assert.equal(markerLayout.significantOverlaps,0,`${width}px: nearby country compositions remain legible`);
    assert.equal(await page.locator('[data-eu-pew-marker="CZE"] .eu-pew-marker-bar i').nth(2).evaluate(node=>node.style.width),'72.8%');
    assert.equal(await page.locator('[data-eu-pew-marker="ALB"] .eu-pew-marker-bar i').nth(1).evaluate(node=>node.style.width),'74.5%');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.screenshot({path:resolve(output,`${width}-religion-initial.png`),animations:'disabled'});
    await page.locator('[data-eu-pew-marker="SRB"]').click();
    assert.match(await page.locator('[data-eu-religion-evidence-reading]').textContent(),/セルビア.*91.5%/s);
    assert.equal(await page.locator('[data-eu-religion-evidence-reading]').evaluate(node=>node.previousElementSibling===null),true);
    await page.screenshot({path:resolve(output,`${width}-religion-selected.png`),animations:'disabled'});
    assert.deepEqual(errors,[]);
    await page.close();
  }
}finally{await browser.close();}
console.log('Pew Europe religion PC initial and country selection: 1440px and 1024px passed');
