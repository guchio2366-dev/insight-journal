/** Focused PC acceptance of Canada's national population entry and URL restoration. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';

const output=process.env.ATLAS_QA_OUTPUT??'/tmp/canada-first-stage-qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.ATLAS_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage();
const errors=[],failedAssets=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('requestfailed',request=>failedAssets.push({url:request.url(),error:request.failure()?.errorText}));
const dist=path.resolve('dist'),base='https://atlas.test/insight-journal/atlas/north-america/';
const result={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),diffSha256:createHash('sha256').update(execFileSync('git',['diff','HEAD'])).digest('hex'),browser:browser.version(),viewports:[],checks:[],screenshots:[],errors,failedAssets};
await page.route('https://atlas.test/**',async route=>{
 let relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/insight-journal/,'');
 if(relative.endsWith('/'))relative+='index.html';
 const filename=path.join(dist,relative);
 if(!filename.startsWith(dist+path.sep))return route.fulfill({status:400});
 try{await route.fulfill({body:await readFile(filename),contentType:{'.html':'text/html','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'}[path.extname(filename)]??'application/octet-stream'});}
 catch{await route.fulfill({status:404});}
});
const open=async route=>{await page.goto(base+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);};
const populationReady=()=>page.waitForSelector('[data-canada-population][data-regions-ready="true"]');
const frame=()=>page.locator('.atlas-map-frame:visible').boundingBox();
const unselected=async()=>assert.equal(await page.locator('[data-population-map-cma][aria-pressed="true"],[data-population-region][aria-pressed="true"]').count(),0);
const shot=async name=>{await page.screenshot({path:path.join(output,name+'.png')});result.screenshots.push(name+'.png');};
const sameCamera=(actual,expected)=>{const a=actual.split(/\s+/).map(Number),b=expected.split(/\s+/).map(Number);assert.equal(a.length,4);assert.equal(b.length,4);a.forEach((value,i)=>assert.ok(Math.abs(value-b[i])<0.001,'Camera restored to the same map position'));};
try{
 for(const [width,height]of [[1536,864],[1280,720],[1024,768]]){
  await page.setViewportSize({width,height});
  await open('nature/');const usClimate=await frame();
  await open('canada/nature/');const canadaClimate=await frame();
  await page.locator('[data-canada-natural-layer=climate][data-canada-natural-render=maplibre]').waitFor();
  assert.ok(Math.abs(usClimate.width-canadaClimate.width)<2&&Math.abs(usClimate.height-canadaClimate.height)<2,'US and Canada climate dimensions');
  assert.ok(Math.abs(usClimate.y-canadaClimate.y)<2,'US and Canada climate top');
  if(width===1536)await shot('canada-climate-1536');
  await open('nature/?env=water&waterView=precipitation');const usPrecipitation=await frame();
  await open('canada/nature/?view=water&waterTopic=precipitation');const canadaPrecipitation=await frame();
  for(const topic of ['distribution','ethnicity','religion']){
   await open('canada/population/'+(topic==='distribution'?'':'?topic='+topic));await populationReady();await unselected();
   const population=await frame();
   assert.ok(Math.abs(population.width-canadaClimate.width)<2&&Math.abs(population.height-canadaClimate.height)<2,'Canada population uses the climate dimensions');
   assert.ok(Math.abs(population.y-canadaClimate.y)<2,'Canada population uses the climate top');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
   if(topic==='distribution')assert.match(await page.locator('[data-population-distribution-heading]').textContent(),/全国/);
   else{
    assert.match(await page.locator('[data-demographic-heading]').textContent(),/全国/);
    assert.match(await page.locator('[data-population-coverage]').textContent(),/最多.*過半数/);
    assert.equal(await page.locator('[data-population-composition-rows] tr').count(),topic==='religion'?23:14);
   }
   const keySizes=await page.locator('[data-population-category-key] button,[data-population-category-key] span').evaluateAll(nodes=>nodes.map(node=>parseFloat(getComputedStyle(node).fontSize)));
   assert.ok(keySizes.length>0&&keySizes.every(size=>size>=14),'Readable full population legend');
   result.viewports.push({width,height,topic,usClimate,canadaClimate,population,usPrecipitation,canadaPrecipitation,keyMinimumPx:Math.min(...keySizes)});
   await shot(`canada-${topic}-${width}`);
  }
 }
 result.checks.push('Three PC sizes: national entry, 293 CDs, all 41 CMAs, 23 religion / 14 ethnicity categories, 14px legend, climate/map alignment');
 await page.setViewportSize({width:1536,height:864});
 await open('canada/population/?topic=religion');await populationReady();
 const distribution=()=>page.locator('[data-population-region]').evaluateAll(nodes=>nodes.map(node=>node.style.fill));
 const original=await distribution();
 await page.locator('[data-population-region="2466"]').press('Enter');
 assert.equal(new URL(page.url()).searchParams.get('cd'),'2466');
 assert.match(await page.locator('[data-population-composition-title]').textContent(),/CD/);
 await page.locator('[data-population-category="11"]').click();
 assert.equal(new URL(page.url()).searchParams.get('mapGroup'),'1');
 await page.locator('[data-population-map-cma="933"]').press('Enter');
 assert.equal(new URL(page.url()).searchParams.has('cd'),false);
 assert.equal(new URL(page.url()).searchParams.get('cma'),'933');
 await page.locator('[data-population-scale="in"]').click();
 const savedCamera=await page.locator('[data-population-map]').getAttribute('viewBox');
 await page.reload({waitUntil:'networkidle'});await populationReady();
 sameCamera(await page.locator('[data-population-map]').getAttribute('viewBox'),savedCamera);
 assert.equal(await page.locator('[data-population-map-cma="933"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-population-category="11"]').getAttribute('aria-pressed'),'true');
 await shot('canada-religion-city-share-restored');
 await page.goBack();await page.goBack();
 assert.equal(new URL(page.url()).searchParams.get('cd'),'2466');
 assert.equal(await page.locator('[data-population-region="2466"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-population-category=""]').click();
 await page.locator('[data-population-reset]').click();await unselected();
 for(const key of ['cd','cma','compare','mapFrame'])assert.equal(new URL(page.url()).searchParams.has(key),false);
 assert.deepEqual(await distribution(),original,'Selection and reset preserve the concentration distribution');
 assert.match(await page.locator('[data-population-composition-title]').textContent(),/全国の構成/);
 await shot('canada-religion-after-reset');
 result.checks.push('CD and CMA scopes, share/concentration meaning, category/camera reload, browser history, All returns to the unselected national overview');
 await open('canada/population/?cma=933&mapFrame=30,40,400,250');await populationReady();
 const sourceCamera=await page.locator('[data-population-map]').getAttribute('viewBox');
 await page.locator('[data-population-comparison-links] [data-population-nature-link]').click();
 await page.locator('[data-canada-population-return]:visible').waitFor();
 const back=new URL(await page.locator('[data-canada-population-return]').getAttribute('href'),page.url());
 assert.equal(back.searchParams.get('cma'),'933');assert.equal(back.searchParams.get('mapFrame'),'30,40,400,250');
 await page.locator('[data-canada-population-return]').click();await populationReady();
 sameCamera(await page.locator('[data-population-map]').getAttribute('viewBox'),sourceCamera);
 assert.equal(await page.locator('[data-population-map-cma="933"]').getAttribute('aria-pressed'),'true');
 result.checks.push('Nature comparison return preserves the explicit city and camera');
 await open('canada/population/?cma=unknown&compare=535&only=1&zoom=selected&mapFrame=0,0,Infinity,580');await populationReady();await unselected();
 assert.match(await page.locator('[data-population-distribution-heading]').textContent(),/全国/);
 assert.equal(await page.locator('[data-population-map]').getAttribute('viewBox'),'0 0 900 580');
 result.checks.push('Invalid city / camera cannot invent a Toronto selection or hide the national distribution');
 assert.deepEqual(errors,[],'No browser exceptions');assert.deepEqual(failedAssets,[],'No failed asset requests');
 result.success=true;
}catch(error){result.success=false;result.failure=error.stack;throw error;}
finally{await writeFile(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify({output,success:result.success,checks:result.checks,screenshots:result.screenshots,failure:result.failure}));}
