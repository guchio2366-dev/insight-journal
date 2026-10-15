import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const output=process.env.OCEANIA_REVIEW_OUTPUT??'/tmp/oceania-sector-review';
const route=process.env.OCEANIA_REVIEW_URL??'http://localhost:4333/insight-journal/atlas/oceania/industry/';
await mkdir(output,{recursive:true});
const report={route,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),localOnly:true,sandboxRequired:true,viewports:[],screenshots:[],errors:[]};
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.OCEANIA_CHROMIUM??'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 const page=await browser.newPage({deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
 const settle=async()=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 const geometry=()=>page.locator('[data-primary-map] [data-label-box]').evaluateAll(nodes=>nodes.map(n=>[n.dataset.captionKey,n.dataset.labelBox]));
 const audit=async sector=>{
  await settle();const data=await page.locator('[data-primary-map]').evaluate(map=>{
   const rect=n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};};
   return {map:rect(map),frame:map.querySelector('svg').getAttribute('viewBox'),sectors:[...map.querySelectorAll('[data-catalog-sector]')].map(n=>n.dataset.catalogSector),owners:[...map.querySelectorAll('[data-industry-sectors]')].map(n=>n.dataset.industrySectors),labels:[...map.querySelectorAll('[data-label-box]')].map(n=>({key:n.dataset.captionKey,text:n.textContent,box:rect(n.querySelector('text'))})),countryNames:[...map.querySelectorAll('[data-catalog-country-names] text')].map(rect),leaders:[...map.querySelectorAll('[data-length-px]')].map(n=>Number(n.dataset.lengthPx)),mines:map.querySelectorAll('[data-oceania-mine-tags]').length,menuCards:map.querySelectorAll('[data-oceania-product-label][role=button],[data-oceania-product-label] rect').length,omitted:Number(map.querySelector('[data-caption-omissions]').dataset.captionOmissions)};
  });
  assert(data.sectors.every(s=>s===sector));assert(data.owners.every(s=>s===sector));assert.equal(data.mines,sector==='resources'?347:0);assert.equal(data.menuCards,0);assert(data.leaders.every(n=>n<=42));
  for(const [i,a]of data.labels.entries()){
   assert(a.box.x>=data.map.x-1&&a.box.y>=data.map.y-1&&a.box.right<=data.map.right+1&&a.box.bottom<=data.map.bottom+1,'Label remains in map');
   for(const b of [...data.labels.slice(i+1).map(l=>l.box),...data.countryNames])assert(!(a.box.x<b.right&&a.box.right>b.x&&a.box.y<b.bottom&&a.box.bottom>b.y),'Captions and country names stay separate');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const positions=await page.evaluate(()=>({map:document.querySelector('[data-primary-map]').getBoundingClientRect().bottom,stats:document.querySelector('[data-oceania-industry-statistics]').getBoundingClientRect().top}));assert(positions.stats>=positions.map);
  return data;
 };
 for(const [width,height]of [[1920,1080],[1896,996],[390,844]]){
  await page.setViewportSize({width,height});await page.goto(route,{waitUntil:'networkidle'});await page.locator('[data-oceania-ready=true]').waitFor();
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[data-industry-sector=${sector}]`).click();const initial=await audit(sector),fixed=await geometry();
   await page.locator(`[data-industry-sector=${sector}]`).click();assert.equal(new URL(page.url()).searchParams.get('sector'),sector,'Active sector cannot be toggled into all sectors');
   const options=await page.locator('[data-oceania-product] option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(v=>v!=='all'));assert.equal(options.length,{resources:10,manufacturing:6,services:2}[sector]);
   const filename=`${width}-${sector}.png`;await page.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);
   for(const id of options){await page.locator('[data-oceania-product]').selectOption(id);await settle();assert.deepEqual(await geometry(),fixed);assert.equal((await audit(sector)).frame,initial.frame);assert.equal(new URL(page.url()).searchParams.get('product'),id);}
   await page.locator('[data-oceania-product-only]').click();await audit(sector);const only=await geometry();for(const [key,box]of only)assert.equal(new Map(fixed).get(key),box);
   await page.reload({waitUntil:'networkidle'});await settle();assert.equal(new URL(page.url()).searchParams.get('sector'),sector);await audit(sector);
   await page.locator('[data-oceania-product-clear]').click();await settle();assert.equal(await page.locator('[data-oceania-product]').inputValue(),'all');assert.equal(new URL(page.url()).searchParams.get('sector'),sector);assert.deepEqual(await geometry(),fixed);
   await page.goBack();await settle();await audit(sector);await page.goForward();await settle();assert.deepEqual(await geometry(),fixed);
   const legend=await page.locator('[data-primary-legend]').textContent();if(sector!=='resources')assert(!/石炭|鉄鉱石|金・銀/.test(legend));
   report.viewports.push({width,height,sector,products:options.length,captionCount:initial.labels.length,omitted:initial.omitted,mines:initial.mines,checks:['sector-only scene and legend','no map menu cards','short leaders','fixed captions within sector','external selector','explicit product only','reload','clear retains sector','history','country-name separation','statistics below map','no horizontal overflow']});
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report,null,2));
}catch(error){report.status=browser?'failed':'blocked';report.blocker=error.message;throw error;}
finally{await writeFile(path.join(output,'sector-verification.json'),JSON.stringify(report,null,2));await browser?.close();}
