#!/usr/bin/env node
/** Approved Africa PC acceptance: real paint, visibility, interaction and evidence. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import {africaBeverageBelts,africaBeverageSources} from '../src/data/atlas/africa-beverage-belts.ts';

import config from '../astro.config.mjs';
const root=path.resolve(import.meta.dirname,'..'),output=path.resolve(process.env.AFRICA_REVIEW_OUTPUT||path.join(root,'review-artifacts/africa-approved-review'));
const base=String(config.base??'').replace(/\/$/,''),dist=path.join(root,'dist');
const baseline=JSON.parse(await readFile(path.join(root,'tests/fixtures/africa-agriculture-label-layout.json'),'utf8'));
const report={status:'running',reviewScope:'Coffee and tea only: 1440/1024; existing agriculture names unchanged',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline:baseline.baseline,scope:'PC only. No publication or merge. Population, climate and unrelated screens are not recaptured.',cases:[],screenshots:[],startedAt:new Date().toISOString(),sources:africaBeverageSources,fonts:{families:process.env.AFRICA_REVIEW_JAPANESE_FONTS??execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}).trim(),match:process.env.AFRICA_REVIEW_JAPANESE_FONT_MATCH??execFileSync('fc-match',['-f','%{family}','sans-serif:lang=ja'],{encoding:'utf8'}).trim(),setup:process.env.AFRICA_REVIEW_JAPANESE_FONT_SETUP??'preinstalled'}};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);if(!file.startsWith(dist+path.sep))throw Error('invalid path');const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end('missing');}});
await mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:process.env.AFRICA_REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const state=page=>page.evaluate(()=>Object.fromEntries(new URL(location.href).searchParams));
async function settle(page){await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function capture(page,profile,name){await page.evaluate(()=>window.scrollTo(0,0));const file=`${profile}-${name}.jpg`;await page.screenshot({path:path.join(output,file),type:'jpeg',quality:72,animations:'disabled'});report.screenshots.push({file,profile,scene:name});}
async function visibleLabels(page,selector){return page.locator(selector).evaluateAll(nodes=>{const frame=document.querySelector('.africa-map-frame').getBoundingClientRect();return nodes.map(n=>{const r=(n.querySelector("rect")??n).getBoundingClientRect(),m=n.getScreenCTM(),style=getComputedStyle(n.querySelector("text")??n);return {id:n.getAttribute('data-africa-city-label')??n.getAttribute('data-africa-climate-map-label')??n.getAttribute('data-africa-population-city')??n.getAttribute('data-africa-agri-label-text'),text:n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,fontPx:parseFloat(style.fontSize)*Math.hypot(m.a,m.b),visible:r.width>0&&r.height>0&&r.left>=frame.left-1&&r.right<=frame.right+1&&r.top>=frame.top-1&&r.bottom<=frame.bottom+1};});});}
function noOverlap(labels,message){for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j],area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));assert(area<2,`${message}: ${a.id}/${b.id} overlap ${area}`);}}

async function labels(page){return page.locator('[data-africa-agri-label-text], [data-africa-agri-place-text]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.africaAgriLabelText??n.dataset.africaAgriPlaceText,anchor:n.parentElement.dataset.africaAgriLabelAnchor,x:n.getAttribute('x'),y:n.getAttribute('y')})));}
async function paintedBelt(page,product){
 const saved=await page.locator('[data-africa-agri-label], [data-africa-agri-place-label]').evaluateAll(nodes=>nodes.map(n=>{const old=n.style.opacity;n.style.opacity='0';return old;}));
 const bytes=await page.locator('.africa-map').screenshot({type:'png'});
 await page.locator('[data-africa-agri-label], [data-africa-agri-place-label]').evaluateAll((nodes,values)=>nodes.forEach((n,i)=>n.style.opacity=values[i]),saved);
 return page.evaluate(async({data,product})=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<p.length;i+=4){const [r,g,b]=p.slice(i,i+3);if(product==='coffee'?r>g+25&&b>g+8:g>r+15&&b>g+2)count++;}return count;},{data:bytes.toString('base64'),product});
}
try{
 const release=JSON.parse(await readFile(path.join(dist,'_release.json'),'utf8'));report.release=release;
 if(process.env.AFRICA_REVIEW_HEAD_SHA){assert.equal(report.head,process.env.AFRICA_REVIEW_HEAD_SHA);assert.equal(release.commitSha,report.head);}
 for(const width of [1440,1024]){
  const profile=String(width),context=await browser.newContext({viewport:{width,height:baseline.viewportHeights[profile]}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  const record={width,checks:[],labels:[],paint:[]};report.cases.push(record);
  await page.goto(origin+'/atlas/africa/?field=agriculture&zoom=all');await settle(page);await page.locator('[data-africa-agri-distribution]').first().waitFor();
  const distributions=page.locator('[data-africa-agri-distribution]:visible');assert.equal(await distributions.count(),9);
  const current=(await labels(page)).filter(row=>!/^crop-(coffee|tea)-/.test(row.key));assert.deepEqual(JSON.parse(JSON.stringify(current)),baseline.labels[profile],'published seven item names and Madagascar country name retain exact coordinates');
  const names=await visibleLabels(page,'[data-africa-agri-label-text], [data-africa-agri-place-text]');noOverlap(names.filter(x=>x.visible),'agriculture names');const controls=await page.locator('[data-africa-map-agri-navigation], [data-africa-agri-region]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {id:'map control',x:r.x,y:r.y,w:r.width,h:r.height,visible:r.width>0&&r.height>0};}));for(const n of names.filter(n=>n.visible&&(n.id==='crop-coffee-harvested'||n.id==='crop-tea-harvested')))for(const control of controls.filter(c=>c.visible))noOverlap([n,control],'new labels versus controls');
  record.labels.push({scene:'initial',names});await capture(page,profile,'agriculture-initial');
  for(const product of ['coffee','tea']){const namesFor=names.filter(n=>n.id===`crop-${product}-harvested`&&n.visible);assert(namesFor.length>=2,product+' needs at least two actually visible representative labels');assert(namesFor.every(n=>n.fontPx>=13),'readable name size');}
  record.checks.push('all nine layers, visible nonoverlapping new names, unchanged old item/country name coordinates');
  assert.equal(await page.locator('[data-africa-beverage-belt]').count(),africaBeverageBelts.length,'no arbitrary count cap drops supported belts');
  for(const product of ['coffee','tea']){
   const key=`crop-${product}-harvested`,pick=page.locator(`[data-africa-layer-legend] [data-africa-agri-pick="${key}"]`);if(product==='coffee'){const mapPick=page.locator(`[data-africa-agri-label="${key}"]:visible`).first();await mapPick.focus();await page.keyboard.press('Enter');}else await pick.click();await settle(page);assert.equal((await state(page)).crop,product);
   assert.equal(await distributions.count(),9);assert(await page.locator(`[data-africa-agri-footprint="${key}"] path[stroke="#fffdf8"]`).count()>0,'selected belts have actual white outline geometry');assert(await page.locator('[data-africa-agri-only]').isVisible());
   assert(!(await page.locator('[data-africa-agri-context]').innerText()).includes('未取得'));await capture(page,profile,'agriculture-'+product);
   await page.locator('[data-africa-agri-only]').click();await settle(page);assert.equal(await distributions.count(),1);
   const count=await paintedBelt(page,product);assert(count>150,product+' must paint actual belt pixels even with all text hidden');record.paint.push({product,paintedPixelsWithoutLabels:count});
   if(product==='tea')await capture(page,profile,'agriculture-tea-only');
   await page.reload();await settle(page);assert.equal(await distributions.count(),1);assert.equal((await state(page)).crop,product);
   await page.locator('[data-africa-agri-all]').click();await settle(page);assert.equal(await distributions.count(),9);
  }
  record.checks.push('both new items retain other distributions on selection, visibly outline, isolate/reload/restore, and paint belt pixels independently of text');
  await page.locator('[data-africa-agri-display]').selectOption('crops');await settle(page);assert.equal(await distributions.count(),6);
  await page.locator('[data-africa-agri-display]').selectOption('livestock');await settle(page);assert.equal(await distributions.count(),3);
  await page.locator('[data-africa-agri-display]').selectOption('all');await settle(page);
  for(const region of ['north','west','east','central','south','all']){await page.locator('[data-africa-agri-region]').selectOption(region);await settle(page);assert.equal((await state(page)).region,region);const visible=await visibleLabels(page,'[data-africa-agri-label-text]');assert(visible.filter(n=>n.id==='crop-coffee-harvested'||n.id==='crop-tea-harvested').every(n=>n.visible),'new labels fit each region camera');}
  await page.locator('[data-africa-agri-region]').selectOption('east');await settle(page);await capture(page,profile,'agriculture-east');
  await page.locator('[data-africa-agri-region]').selectOption('all');await settle(page);
  await page.locator('[data-africa-topic=forestry]').click();await settle(page);await page.locator('[data-africa-topic=farming]').click();await settle(page);assert.equal(await distributions.count(),9);assert.equal(await page.locator('[data-africa-agri-footprint]').count(),0);
  record.checks.push('6 crop / 3 animal display filters, five regions, agriculture tab round trip');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');assert.deepEqual(errors,[]);record.status='passed';await context.close();
 }
 report.status='passed';report.representativeImages=report.screenshots.map(s=>s.file);const representative=path.join(output,'representative');await mkdir(representative,{recursive:true});for(const file of report.representativeImages){const bytes=await readFile(path.join(output,file));const item=report.screenshots.find(s=>s.file===file);item.bytes=bytes.length;item.sha256=createHash('sha256').update(bytes).digest('hex');await copyFile(path.join(output,file),path.join(representative,file));}
 report.ci={repository:process.env.AFRICA_REVIEW_REPOSITORY,runId:process.env.AFRICA_REVIEW_RUN_ID,attempt:process.env.AFRICA_REVIEW_RUN_ATTEMPT};report.completedAt=new Date().toISOString();await writeFile(path.join(representative,'review-metadata.json'),JSON.stringify(report,null,2)+'\n');await writeFile(path.join(output,'review-metadata.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,head:report.head,images:report.representativeImages,paint:report.cases.map(c=>c.paint)}));
}catch(error){report.status='failed';report.error=error.stack;await writeFile(path.join(output,'review-metadata.json'),JSON.stringify(report,null,2)+'\n');throw error;}finally{await browser.close();server.close();}
