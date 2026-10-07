import assert from 'node:assert/strict';

// Reuses the caller's guarded page and browser. `source` is the local site base
// URL including Astro's base path, e.g. http://127.0.0.1:1234/insight-journal.
export async function verifyAsiaIndustryCountry(page,{profile,source}){
 const checks=[],errors=[],onError=e=>errors.push(e.message);page.on('pageerror',onError);
 const record=(name)=>checks.push({name,passed:true});
 const open=async selector=>{const details=page.locator(selector);if(!await details.evaluate(n=>n.open))await details.locator(':scope > summary').click();};
 try{
  await page.goto(source.replace(/\/$/,'')+'/atlas/asia/east-asia/industry/?topic=jp-20&place=JPN&detail=JP-43&lng=130&lat=33&z=6',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-industry-detail]')?.options.length>1&&document.querySelector('[data-industry-status]')?.textContent==='');
  const cameraBefore=new URL(page.url());await page.locator('[data-country-select]').selectOption('JPN');
  const sameCountry=new URL(page.url());assert.equal(sameCountry.searchParams.get('detail'),'JP-43');for(const key of ['lng','lat','z'])assert.equal(sameCountry.searchParams.get(key),cameraBefore.searchParams.get(key));record('same country preserves detail and camera');
  await page.locator('[data-country-select]').selectOption('CHN');
  await page.waitForFunction(()=>document.querySelector('[data-industry-value]')?.textContent.includes('中国')&&document.querySelector('[data-industry-status]')?.textContent==='');
  assert.equal(new URL(page.url()).searchParams.get('topic'),'manufacturing');assert.equal(new URL(page.url()).searchParams.get('detail'),null);
  assert.equal(await page.locator('[data-industry-topic] option[value="jp-31"]').evaluate(o=>o.disabled),true);
  await page.locator('[data-industry-feature="cn-steel"]').click();assert.equal(new URL(page.url()).searchParams.get('place'),'CHN');record('China uses relevant topics and clears incompatible Japanese detail');
  await page.locator('[data-country-select]').selectOption('KOR');assert.equal(new URL(page.url()).searchParams.get('topic'),'manufacturing');
  assert.equal(await page.locator('[data-industry-topic] option[value="cn-steel"]').evaluate(o=>o.disabled),true);record('Korea cannot select another country’s domestic industry topic');
  await page.locator('[data-country-select]').selectOption('TWN');await page.waitForFunction(()=>document.querySelector('[data-industry-value]')?.textContent.includes('台湾：未掲載'));
  await open('[data-reading-details]');assert.match(await page.locator('[data-industry-country-reading]').textContent(),/WDI.*未掲載.*Other Asia, nes/);record('Taiwan keeps missing WDI data explicit');
  await open('[data-industry-all]');await page.locator('[data-industry-topic]').selectOption('trade-exports');
  await page.locator('[data-trade-panel]').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('[data-trade-status]')?.textContent==='');
  assert.equal(new URL(page.url()).searchParams.get('place'),'TWN');assert.match(await page.locator('[data-trade-content]').textContent(),/490|台湾等/);record('Taiwan trade preserves Other Asia, nes limitations');
  await page.locator('[data-country-select]').selectOption('');assert.equal(new URL(page.url()).searchParams.get('place'),null);
  await page.locator('[data-industry-region-reading]').waitFor({state:'visible'});
  await page.locator('[data-industry-reading-topic="trade-exports"][data-industry-reading-detail="t-85"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-trade-chapter]')?.value==='85');assert.equal(new URL(page.url()).searchParams.get('detail'),'t-85');record('regional supply-chain reading opens existing HS 85 data');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-industry-region-reading]').waitFor({state:'visible'});
  assert.equal(new URL(page.url()).searchParams.get('place'),null);assert.equal(new URL(page.url()).searchParams.get('detail'),'t-85');record('regional scope and HS chapter survive reload');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);record('no horizontal overflow or browser runtime errors');
  return {profile:typeof profile==='string'?profile:profile?.name,passed:true,checks};
 }finally{page.off('pageerror',onError);}
}
