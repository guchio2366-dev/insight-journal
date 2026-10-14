/** Read-only browser acceptance for the integrated build or existing Pages. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';

const production=process.env.INDUSTRY_SMOKE_TARGET==='production';
const published='https://guchio2366-dev.github.io/insight-journal';
const expected=process.env.EXPECTED_RELEASE_SHA;
if(production)assert.match(expected??'',/^[a-f0-9]{40}$/,'Require the exact deployed SHA');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const output=path.resolve('review-artifacts/industry-pages-smoke');
await mkdir(output,{recursive:true});
let server,browser,page,base=published;
if(!production){
 const dist=await realpath('dist');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.gz':'application/gzip','.woff2':'font/woff2'};
 server=createServer(async(req,res)=>{try{
  const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  assert(requestPath.startsWith('/insight-journal/'));
  let file=path.resolve(dist,'.'+requestPath.slice('/insight-journal'.length));
  assert(file.startsWith(dist+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  file=await realpath(file);assert(file.startsWith(dist+path.sep));
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
 }catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 base=`http://127.0.0.1:${server.address().port}/insight-journal`;
}
const scenes=[
 {id:'canada',route:'north-america/canada/industry/',ready:'[data-ca-industry-pilot]',map:'[data-ca-map-frame]',sectors:'[data-ca-sector]',products:'[data-ca-subsector]',key:'data-ca-subsector',sources:'[data-ca-evidence-scale] a',camera:'[data-ca-map]'},
 {id:'mexico',route:'north-america/mexico/industry/',ready:'[data-ma-atlas][data-ma-ready=true]',map:'[data-ma-frame]',sectors:'[data-ma-sector]',products:'[data-ma-industry]',key:'data-ma-industry',sources:'[data-ma-indicators] a',camera:'[data-ma-map]'},
 {id:'europe',route:'europe/industry/',ready:'[data-europe-detail][data-initialized=true]',map:'.eu-map-stage',sectors:'[data-eu-industry-sector]',products:'[data-eu-industry-group]',key:'data-eu-industry-group',sources:'[data-eu-industry-evidence] a',camera:'[data-eu-static]'},
 {id:'east-asia',route:'asia/east-asia/industry/',ready:'[data-asia-atlas][data-map-ready=true]',map:'.asia-map-frame',sectors:'[data-east-industry-sector]',products:'[data-east-industry-kinds] [data-industry-feature]',key:'data-industry-feature',sources:'[data-east-industry-statistics] a'},
 {id:'southeast-asia',route:'asia/southeast-asia/industry/',ready:'[data-asia-atlas][data-southeast-industry-layout-ready=true]',map:'.asia-map-frame',sectors:'[data-southeast-industry-sector]:not([data-southeast-industry-sector="all"])',products:'[data-southeast-industry-kind]',key:'data-southeast-industry-kind',sources:'[data-southeast-industry-facts] a'},
 {id:'south-asia',route:'asia/south-asia/industry/',ready:'[data-asia-atlas][data-map-ready=true]',map:'.asia-map-frame',sectors:'[data-south-industry-sector]',products:'.south-industry-products [data-industry-feature]',key:'data-industry-feature',sources:'[data-south-industry-evidence] a'},
 {id:'central-asia',route:'asia/central-asia/industry/',ready:'[data-central-industry][data-central-ready=true]',map:'[data-central-map-frame]',sectors:'[data-central-sector]',products:'[data-central-choice]',key:'data-central-choice',sources:'[data-central-metric] a',camera:'[data-central-map]'},
 {id:'west-asia',route:'west-asia/industry/',ready:'[data-west-industry][data-ready=true]',map:'.wi-map-frame',sectors:'[data-wi-sector]',products:'[data-wi-industry]',key:'data-wi-industry',sources:'[data-wi-stat-panel] a',camera:'[data-wi-map]'},
 {id:'africa',route:'africa/?field=industry',ready:'[data-africa-atlas][data-initialized=true]',map:'.africa-map-frame',sectors:'[data-africa-industry-sector]',products:'[data-africa-industry-commodity]',mode:'select',sources:'[data-africa-industry-statistics] a',camera:'.africa-map'},
 {id:'oceania',route:'oceania/industry/',ready:'[data-oceania-learning][data-oceania-ready=true]',map:'[data-primary-map]',sectors:'[data-industry-sector]',products:'[data-oceania-product]',mode:'select',sources:'[data-catalog-stat-sources] a',camera:'[data-primary-map] svg'},
 {id:'latin-america',route:'latin-america/industry/',ready:'[data-latin-industry-sectors][data-lis-ready=true]',map:'[data-lis-map]',sectors:'[data-latin-industry-sector]',products:'[data-lis-industry]',key:'data-lis-industry',sources:'[data-lis-statistics-body] a',camera:'[data-lis-map]'},
 {id:'us',route:'north-america/industry/',ready:'[data-us-industry][data-us-initialized=true]',map:'[data-us-map-frame]',sectors:'[data-us-sector]',products:'[data-us-product]',key:'data-us-product',sources:'[data-us-statistics] a',camera:'[data-us-map]'},
 {id:'russia',route:'russia/industry/',ready:'[data-ru-industry][data-ru-ready=true]',map:'[data-ru-canvas]',sectors:'[data-ru-sector]',products:'[data-ru-product]',key:'data-ru-product',sources:'[data-ru-stat] a',camera:'[data-ru-map]'},
];
// Controllers may expose the current value on a root element as well as on
// controls. Exercise only the native controls and their selected state.
for(const scene of scenes){
 scene.sectors='button'+scene.sectors;
 if(scene.mode!=='select')scene.products=scene.products.replace(/(\[[^\]]+\])$/,'button$1');
}
assert.equal(scenes.length,13);
const report={head,target:production?'existing-pages':'build',expectedReleaseSha:production?expected:null,sandboxRequired:true,status:'running',cases:[],images:[],errors:[],failedResponses:[]};
const excluded=new Set(['','all','overview','sc-overview','sc-south-resources','sc-south-manufacturing','sc-south-services','east-resources','east-manufacturing','east-services']);
async function settle(scene){
 await page.locator(scene.ready).waitFor();
 if(scene.id==='canada')await page.waitForFunction(()=>!!document.querySelector('[data-ca-industry-pilot]')?.canadaIndustryView);
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
}
async function snapshot(scene){
 const box=await page.locator(scene.map).first().boundingBox();assert(box?.width>100&&box.height>100,scene.id+': nonempty map');
 const frame=scene.camera?await page.locator(scene.camera).first().getAttribute('viewBox'):null;
 return {width:box.width,height:box.height,frame};
}
function fixed(before,after,name){
 for(const k of ['width','height'])assert(Math.abs(before[k]-after[k])<=1,name+': map '+k+' changes');
 if(before.frame!==null&&after.frame!==null){
  const a=before.frame.split(/[ ,]+/).map(Number),b=after.frame.split(/[ ,]+/).map(Number);
  assert.equal(b.length,a.length,name+': map viewBox dimension count');
  assert(a.every((value,i)=>Math.abs(value-b[i])<=.001),name+': map viewBox changes beyond SVG serialization rounding');
 }else assert.equal(after.frame,before.frame,name+': map viewBox changes');
}
async function choose(scene){
 if(scene.mode==='select'){
  const control=page.locator(scene.products).first();
  const choices=await control.locator('option').evaluateAll(nodes=>nodes.filter(n=>!n.disabled&&!n.hidden).map(n=>n.value));
  const id=choices.find(id=>!excluded.has(id));assert(id,scene.id+': no selectable industry');
  await control.selectOption(id);return {id,control};
 }
 const controls=page.locator(scene.products+':visible');
 for(let i=0;i<await controls.count();i++){
  const control=controls.nth(i),id=await control.getAttribute(scene.key);
  if(id&&!excluded.has(id)){await control.click();return {id,control};}
 }
 throw Error(scene.id+': no selectable industry');
}
async function checkRelease(context){
 if(!production)return;
 const response=await context.request.get(base+'/_release.json');assert.equal(response.status(),200);
 const release=await response.json();assert.equal(release.commitSha,expected,'Public SHA changed or is not the approved integrated release');report.release=release;
}
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??process.env.INDUSTRY_REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 report.browserVersion=browser.version();
 const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,locale:'ja-JP',serviceWorkers:'block',reducedMotion:'reduce'});
 const origin=new URL(base).origin;
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await context.addInitScript(()=>{window.atlasRenderReview=true;});
 await checkRelease(context);page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',error=>report.errors.push(error.message));page.on('response',response=>{if(response.status()>=400)report.failedResponses.push({url:response.url(),status:response.status()});});
 for(const viewport of [{width:1920,height:1080},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const scene of scenes){
   report.phase=viewport.width+'/'+scene.id;
   const response=await page.goto(base+'/atlas/'+scene.route,{waitUntil:'networkidle'});assert.equal(response.status(),200);await settle(scene);
   const tabs=page.locator(scene.sectors+':visible'),tabCount=await tabs.count();assert.equal(tabCount,scene.id==='us'?4:3,scene.id+': retained sector controls');
   const selected=[];
   for(let i=0;i<tabCount;i++){
    await tabs.nth(i).click();await settle(scene);const before=await snapshot(scene),choice=await choose(scene);await settle(scene);
    assert([...new URL(page.url()).searchParams.values()].some(value=>value.includes(choice.id)),scene.id+': selected industry is represented in URL');
    if(scene.mode==='select')assert.equal(await choice.control.inputValue(),choice.id);else assert.equal(await choice.control.getAttribute('aria-pressed'),'true');
    fixed(before,await snapshot(scene),scene.id+' '+choice.id);
    assert(await page.locator(scene.sources+':visible').count()>0,scene.id+': selected evidence has a visible source link');
    const selectedUrl=page.url();await page.reload({waitUntil:'networkidle'});await settle(scene);assert.equal(page.url(),selectedUrl,scene.id+': URL reload');
    const restored=scene.mode==='select'?page.locator(scene.products).first():page.locator(`${scene.products}[${scene.key}="${choice.id}"]:visible`).first();
    if(scene.mode==='select')assert.equal(await restored.inputValue(),choice.id);else assert.equal(await restored.getAttribute('aria-pressed'),'true');
    fixed(before,await snapshot(scene),scene.id+' reloaded '+choice.id);selected.push(choice.id);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,scene.id+': document overflow');
   await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(0,0);const file=`${viewport.width}-${scene.id}.jpg`,bytes=await page.screenshot({path:path.join(output,file),type:'jpeg',quality:80,animations:'disabled'});
   report.images.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),url:page.url(),viewport});
   report.cases.push({id:scene.id,viewport,sectors:tabCount,selected,checks:['native selection','source links','map size and viewBox stable','URL reload','no document overflow']});
  }
 }
 await checkRelease(context);assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedResponses,[]);report.status='passed';delete report.phase;
}catch(error){report.status=browser?'failed':'blocked';report.failure=String(error);process.exitCode=1;console.error(`::error title=Industry Pages acceptance::${report.phase??'browser prerequisite'}: ${String(error).replaceAll('%','%25').replaceAll('\n','%0A').replaceAll('\r','%0D')}`);}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await browser?.close();if(server?.listening)await new Promise(r=>server.close(r));}
