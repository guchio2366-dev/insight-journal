#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';
import config from '../astro.config.mjs';

const dist=path.resolve('dist'),output=path.resolve('review-artifacts/industry-existing-country');
const base=String(config.base??'').replace(/\/$/,'');
const society=JSON.parse(await readFile('src/data/atlas/europe/country-overview-society.json','utf8'));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',sandboxRequired:true,scope:'Definition links only; no new regional or national quantities.',cases:[],screenshots:[]};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let url=new URL(req.url,'http://local').pathname;if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);assert(file.startsWith(dist+'/'));const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}${base}`;
let browser;
async function picture(page,filename){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,filename)});report.screenshots.push(filename);}
async function waitForEuropeReader(page,body){
 // The initial reader already has this text. MapLibre's later load callback
 // runs render() again and replaces its links, so text alone is not readiness.
 await page.waitForFunction(expected=>document.querySelector('[data-eu-live]')?.classList.contains('is-ready')&&document.querySelector('[data-eu-subject-intro]')?.textContent===expected,body);
}
async function openEuropeReader(page,url,body,delayMap){
 if(!delayMap){await page.goto(url,{waitUntil:'domcontentloaded'});await waitForEuropeReader(page,body);return;}
 // Exercise the actual initial-render/load boundary, without a timing sleep or
 // a mocked map. Only this local module response is held, then served normally.
 const modulePattern=/\/_astro\/maplibre-gl\.[^/]+\.js$/;
 let release;
 const gate=new Promise(resolve=>{release=resolve;});
 const hold=async route=>{await gate;await route.continue();};
 await page.route(modulePattern,hold);
 let before;
 try{
  const requested=page.waitForRequest(request=>modulePattern.test(new URL(request.url()).pathname));
  await Promise.all([page.goto(url,{waitUntil:'domcontentloaded'}),requested]);
  await page.waitForFunction(expected=>document.querySelector('[data-eu-subject-intro]')?.textContent===expected,body);
  assert.equal(await page.locator('[data-eu-live].is-ready').count(),0,'Reader text can appear before the live map is ready');
  before=await page.locator('[data-eu-industry-definition]').last().elementHandle();
  assert(before,'Initial country definition exists while the map module is held');
  release();
  await waitForEuropeReader(page,body);
  const boundary={initialReaderBeforeMap:true,initialLinkDetached:!await before.evaluate(node=>node.isConnected),liveMapReady:true};
  console.log(JSON.stringify({europeLoadBoundary:boundary,viewport:page.viewportSize()}));
  return boundary;
 }finally{release();await page.unroute(modulePattern,hold);await before?.dispose();}
}
async function verifyDefinitionOperation(page,link){
 await link.scrollIntoViewIfNeeded();
 // Keep actionability checks and keyboard activation: a detached/hidden or
 // obstructed current link must still fail. Prevent only the external visit.
 await link.click({trial:true});
 const href=await link.getAttribute('href');
 await link.evaluate(node=>{
  delete node.dataset.reviewActivated;
  node.addEventListener('click',event=>{event.preventDefault();node.dataset.reviewActivated=node.getAttribute('href');},{once:true});
 });
 await link.focus();
 await page.keyboard.press('Enter');
 assert.equal(await link.getAttribute('data-review-activated'),href,'Keyboard activates the current definition link');
}
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH||'/usr/bin/chromium',chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 for(const [profile,width,height] of [['1024',1024,768],['1440',1440,900]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const [region,codes] of [['east-asia',['KOR','TWN']],['southeast-asia',['IDN','VNM','THA']]]){
   for(const code of codes){
    await page.goto(`${origin}/atlas/asia/${region}/industry/?topic=manufacturing&place=${code}`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-industry-value]')?.textContent.trim()&&document.querySelector('[data-industry-status]')?.textContent==='');
    assert.equal(await page.locator('[data-industry-country-facts]').count(),0,'No uniform national GDP block in country/site readings');
    assert.equal(await page.locator('[data-country-select] option:not([value=""]):not(:disabled)').count(),region==='east-asia'?4:3);
    assert.equal(new URL(page.url()).searchParams.get('place'),code);
    const method=page.locator('[data-industry-method]');
    assert.equal(await method.locator('a').first().getAttribute('href'),'https://databank.worldbank.org/metadataglossary/world-development-indicators/series/NV.IND.MANF.ZS');
    await picture(page,`${profile}-${code}-manufacturing.png`);
    await page.goto(`${origin}/atlas/asia/${region}/industry/?topic=steel-capacity&place=${code}`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('[data-industry-value]')?.textContent.trim()&&document.querySelector('[data-industry-status]')?.textContent==='');
    assert.equal(await method.locator('a').first().getAttribute('href'),'https://globalenergymonitor.org/projects/global-iron-steel-tracker/');
    assert.equal(await page.locator('[data-industry-country-facts]').count(),0);
    await picture(page,`${profile}-${code}-steel.png`);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    report.cases.push({profile,country:code,status:'passed',checks:['Existing national figures and selected-topic definitions retained','No added GDP ratios for unrelated sectors','Existing country scope retained']});
   }
  }
  for(const code of ['DEU','GBR','FRA','ITA']){
   report.activeCase={profile,country:code};
   const copy=society.countries[code].industry;
   const loadBoundary=await openEuropeReader(page,`${origin}/atlas/europe/industry/?layer=hubs&place=${code}`,copy.body,code==='DEU');
   assert.equal(await page.locator('[data-eu-subject-intro]').textContent(),copy.body,'Existing numbers and precision remain unchanged');
   const definitions=page.locator('[data-eu-reading-sources] [data-eu-industry-definition]');
   assert.equal(await definitions.count(),2);
   assert.deepEqual((await definitions.evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname.split('/').at(-1)))).sort(),['NV.IND.MANF.ZS','NV.SRV.TOTL.ZS']);
   assert.match(await page.locator('[data-eu-subject-note]').textContent(),/国全体のGDP.*製造業は鉱工業・建設業/);
   if(code==='FRA')assert.match(await page.locator('[data-eu-subject-note]').textContent(),/海外領土/);
   await verifyDefinitionOperation(page,definitions.last());
   await picture(page,`${profile}-${code}-definitions.png`);
   await page.reload({waitUntil:'domcontentloaded'});
   await waitForEuropeReader(page,copy.body);
   assert.deepEqual((await definitions.evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname.split('/').at(-1)))).sort(),['NV.IND.MANF.ZS','NV.SRV.TOTL.ZS']);
   await verifyDefinitionOperation(page,definitions.last());
   assert.equal(new URL(page.url()).searchParams.get('place'),code);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   report.cases.push({profile,country:code,status:'passed',loadBoundary,checks:['No duplicate quantities','Existing primary source links plus relevant definition links','National denominator and France coverage','Live map ready before link operations','Current link actionability and keyboard activation before/after reload','Reload']});
   delete report.activeCase;
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 report.status='passed';
}catch(error){report.status=browser?'failed':'blocked';report.error=error.stack;if(!browser)report.reason='Sandbox-enabled Chrome could not launch; browser validation did not run. No fallback or security-setting change is allowed.';process.exitCode=1;console.error(error);}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(resolve=>server.close(resolve));console.log(JSON.stringify({status:report.status,cases:report.cases.length,screenshots:report.screenshots.length,output}));}
