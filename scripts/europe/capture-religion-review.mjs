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
    await page.locator('[data-eu-religion-national]:visible').first().waitFor();
    assert.equal(await page.locator('[data-eu-religion-national]:visible').count(),5);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.screenshot({path:resolve(output,`${width}-religion-initial.png`),animations:'disabled'});
    await page.locator('[data-eu-religion-national="religion-national-serbia"]').click();
    assert.equal(await page.locator('[data-eu-religion-national]:visible').count(),5);
    assert.match(await page.locator('[data-eu-religion-evidence-reading]').textContent(),/セルビア/);
    await page.screenshot({path:resolve(output,`${width}-religion-selected.png`),animations:'disabled'});
    assert.deepEqual(errors,[]);
    await page.close();
  }
}finally{await browser.close();}
console.log('Religion PC initial and selection: 1440px and 1024px passed');
