#!/usr/bin/env node
import {verifyAgroReviewIdentity,verifyAgroBrowserSandbox} from './lib/agro-review-identity.mjs';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';
import config from '../astro.config.mjs';
const dist=path.resolve('dist'),output=path.resolve(process.env.AGRO_REVIEW_OUTPUT??'review-artifacts/russia-agro'),base=String(config.base??'').replace(/\/$/,'');
const profiles=[{width:1896,height:996,deviceScaleFactor:1.5},{width:1280,height:665,deviceScaleFactor:1.5}];
await mkdir(output,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeDirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),sandboxRequired:true,status:'running',profiles,operations:[],screenshots:[],manualReadabilityReview:'not-performed'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
const server=createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);if(base&&pathname.startsWith(base))pathname=pathname.slice(base.length);if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(dist,'.'+pathname);assert(file.startsWith(dist+'/'));res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}${base}`;
let browser;
try{
 await verifyAgroReviewIdentity(report);browser=await chromium.launch({executablePath:process.env.RUSSIA_AGRO_CHROME_PATH||'/usr/bin/chromium',chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});await verifyAgroBrowserSandbox(browser,report);
 for(const profile of profiles){
  const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:profile.deviceScaleFactor,reducedMotion:'reduce',locale:'ja-JP'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');
  const capture=async(name,selected=true)=>{
   await page.evaluate(()=>document.fonts.ready);
   const host=page.locator('[data-agro-statistics]');
   const geometry=await host.evaluate(el=>{const b=el.getBoundingClientRect(),columns=[...el.querySelectorAll('.agro-columns>section')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width};}),map=document.querySelector('[data-primary-map],.forest-map-stage')?.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,map:map?{x:map.x,y:map.y,width:map.width,bottom:map.bottom}:null,columns,overflow:el.scrollWidth>el.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight]};});
   assert.equal(geometry.dpr,1.5);assert.deepEqual(geometry.viewport,[profile.width,profile.height]);assert.equal(geometry.columns.length,3);assert.equal(geometry.overflow,false);assert.equal(geometry.pageOverflow,false);
   for(const column of geometry.columns)assert(Math.abs(column.y-geometry.columns[0].y)<2,'three columns share a row');
   if(geometry.map)assert(geometry.y>=geometry.map.bottom-1,'statistics stay below the map');
   if(selected)assert.equal(await page.locator('[data-russia-agro-reference][open]').count(),0);
   const filename=`${profile.width}x${profile.height}-${name}.png`;await host.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,filename),fullPage:true});report.screenshots.push(filename);report.operations.push({name,profile,geometry});
  };
  await page.goto(origin+'/atlas/russia/agriculture/');await ready();
  assert.equal(await page.locator('[data-russia-agro-year-control],[data-russia-agro-year]').count(),0);assert.equal(await page.locator('[data-russia-agro-reference]').count(),0);await capture('unselected',false);
  const mapBox=()=>page.locator('[data-primary-map]').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
  await page.locator('[data-layer]').selectOption('wheat');await ready();
  assert.equal(await page.locator('[data-agro-stage="production"] .agro-world-pie').count(),0);await capture('wheat-2024');
  assert.match(await page.locator('[data-agro-stage="production"]').innerText(),/2024暦年/);
  const mapBefore=await mapBox();
  await page.locator('[data-agro-stage="use"]>.agro-other-reference>summary').click();await page.locator('[data-russia-wheat-supply]').waitFor({state:'visible'});assert.match(await page.locator('[data-russia-wheat-supply]').innerText(),/別期間.*2020\/21.*93,082.*41,500/s);assert.deepEqual(await mapBox(),mapBefore);await page.locator('[data-agro-stage="use"]>.agro-other-reference>summary').click();
  await page.reload();await ready();assert.equal(await page.locator('[data-russia-agro-year]').count(),0);
  await page.locator('[data-layer]').selectOption('cattle');await ready();assert.equal(await page.locator('[data-russia-wheat-supply]').count(),0);await capture('cattle-2024');
  await page.locator('[data-layer]').selectOption('farming-all');await ready();assert.equal(await page.locator('[data-russia-agro-year]').count(),0);assert.equal(await page.locator('[data-russia-agro-reference]').count(),0);
  await page.goto(origin+'/atlas/russia/agriculture/forestry/');await ready();await capture('roundwood',false);
  await page.locator('[data-agro-series-select]').selectOption('sawnwood-production');await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true'&&document.querySelector('[data-agro-series="sawnwood-production"]'));await capture('sawnwood',false);
  assert.deepEqual(errors,[]);await context.close();
 }
 report.status='passed';report.manualReadabilityReview='required';
}catch(error){report.status=browser?'failed':'browser-unavailable';report.error=String(error.stack);report.blockedActions=profiles.map(profile=>({action:'cloud screenshot and interaction verification',target:'Russia agriculture and forestry, built dist',profile,blocker:browser?'See error':'Chromium sandbox unavailable; no sandbox flags or permissions changed'}));process.exitCode=1;console.error(error.message);}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({status:report.status,output}));}
