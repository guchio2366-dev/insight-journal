#!/usr/bin/env node
/** Approved Africa PC acceptance: real paint, visibility, interaction and evidence. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import {africaClimateCities} from '../src/data/atlas/africa-climate-cities.ts';
import {africaClimateClassAnchors} from '../src/scripts/atlas-africa-layers.ts';
import config from '../astro.config.mjs';
const root=path.resolve(import.meta.dirname,'..'),output=path.resolve(process.env.AFRICA_REVIEW_OUTPUT||path.join(root,'review-artifacts/africa-approved-review'));
const base=String(config.base??'').replace(/\/$/,''),dist=path.join(root,'dist');
const focusedReview=process.env.AFRICA_REVIEW_SCOPE==='madagascar';
const islandIds=['mahajanga','toamasina','antananarivo','toliara'];
const report={status:'running',reviewScope:focusedReview?'Madagascar climate label locality; 1024/1440, four selections, population evidence only':'Full approved Africa review',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'PC only; local production build in installed Chromium. No publication or merge.',cases:[],screenshots:[],startedAt:new Date().toISOString()};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);if(!file.startsWith(dist+path.sep))throw Error('invalid path');const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end('missing');}});
await mkdir(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:process.env.AFRICA_REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const state=page=>page.evaluate(()=>Object.fromEntries(new URL(location.href).searchParams));
async function settle(page){await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function capture(page,profile,name){await page.evaluate(()=>window.scrollTo(0,0));const file=`${profile}-${name}.jpg`;await page.screenshot({path:path.join(output,file),type:'jpeg',quality:72,animations:'disabled'});report.screenshots.push({file,profile,scene:name});}
async function visibleLabels(page,selector){return page.locator(selector).evaluateAll(nodes=>{const frame=document.querySelector('.africa-map-frame').getBoundingClientRect();return nodes.map(n=>{const r=(n.querySelector("rect")??n).getBoundingClientRect(),m=n.getScreenCTM(),style=getComputedStyle(n.querySelector("text")??n);return {id:n.getAttribute('data-africa-city-label')??n.getAttribute('data-africa-climate-map-label')??n.getAttribute('data-africa-population-city')??n.getAttribute('data-africa-agri-label-text'),text:n.textContent,x:r.x,y:r.y,w:r.width,h:r.height,fontPx:parseFloat(style.fontSize)*Math.hypot(m.a,m.b),visible:r.width>0&&r.height>0&&r.left>=frame.left-1&&r.right<=frame.right+1&&r.top>=frame.top-1&&r.bottom<=frame.bottom+1};});});}
function noOverlap(labels,message){for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i],b=labels[j],area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));assert(area<2,`${message}: ${a.id}/${b.id} overlap ${area}`);}}
async function islandLocality(page){
 return page.evaluate(ids=>ids.map(id=>{const pill=document.querySelector(`[data-africa-city-label="${id}"] rect`).getBoundingClientRect(),point=document.querySelector(`[data-africa-city-point="${id}"] circle:last-child`).getBoundingClientRect(),x=point.x+point.width/2,y=point.y+point.height/2;return {id,point:{x,y},label:{x:pill.x,y:pill.y,w:pill.width,h:pill.height},distance:Math.hypot(Math.max(pill.left-x,0,x-pill.right),Math.max(pill.top-y,0,y-pill.bottom))};}),islandIds);
}
function nearbyIslandLabels(labels){
 assert(labels.every(x=>x.distance<=40),'Madagascar names must be within 40 CSS pixels of their station points');
 const byId=Object.fromEntries(labels.map(x=>[x.id,x]));for(const id of ['mahajanga','antananarivo'])assert(byId[id].label.x+byId[id].label.w<byId[id].point.x);for(const id of ['toamasina','toliara'])assert(byId[id].label.x+byId[id].label.w/2>byId[id].point.x);assert(byId.antananarivo.label.y>byId.mahajanga.label.y);assert(byId.toliara.label.y>byId.antananarivo.label.y);
}
try{
 const release=JSON.parse(await readFile(path.join(dist,'_release.json'),'utf8'));
 report.build={commitSha:release.commitSha,builtAt:release.builtAt,africaHtmlSha256:createHash('sha256').update(await readFile(path.join(dist,'atlas/africa/index.html'))).digest('hex')};
 report.ci={repository:process.env.AFRICA_REVIEW_REPOSITORY,runId:process.env.AFRICA_REVIEW_RUN_ID,attempt:process.env.AFRICA_REVIEW_RUN_ATTEMPT};
 if(process.env.AFRICA_REVIEW_HEAD_SHA)assert.equal(report.head,process.env.AFRICA_REVIEW_HEAD_SHA,'checkout must match reviewed head');
 if(process.env.GITHUB_ACTIONS==='true')assert.equal(release.commitSha,report.head,'build must embed reviewed head');
 for(const [width,height] of [[1440,1000],[1024,768]]){
  const profile=String(width),context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[],failures=[],externals=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push({url:r.url(),status:r.status()});});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(origin))externals.push(r.url());});
  const record={profile,checks:[],labels:[],failures};report.cases.push(record);
  await page.goto(origin+'/atlas/africa/?field=nature&topic=climate');await settle(page);await page.locator('[data-africa-raster=climate]').waitFor();
  await capture(page,profile,'climate-layout');const codes=await visibleLabels(page,'[data-africa-climate-map-label]');assert.deepEqual(codes.map(x=>x.id).sort(),africaClimateClassAnchors.map(x=>String(x.id)).sort());assert(codes.every(x=>x.visible&&x.fontPx>=13.9));
  assert.equal(await page.locator('[data-africa-climate-leader],[data-africa-climate-anchor]').count(),0);const cityLabels=await visibleLabels(page,'[data-africa-city-label]');assert.equal(cityLabels.length,12);assert(cityLabels.every(x=>x.visible));noOverlap(cityLabels,'city labels');noOverlap([...codes,...cityLabels],'codes and cities');record.labels.push({scene:'climate',codes,cities:cityLabels});
  record.islandLocality=await islandLocality(page);nearbyIslandLabels(record.islandLocality);
  assert(await page.locator('[data-africa-climate-map-label]').evaluateAll(nodes=>nodes.every(n=>[...document.querySelectorAll('[data-africa-city-point]')].every(p=>!!(p.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING)))),'station points must not obscure direct climate codes');
  const legend=await page.locator('[data-africa-layer-class]').allTextContents();assert(legend.every(x=>/^[A-Z][a-zA-Z]{0,2}$/.test(x.trim())));
  const camera=await page.locator('.africa-map').getAttribute('viewBox');await capture(page,profile,'climate-initial');
  for(const city of (focusedReview?africaClimateCities.filter(city=>islandIds.includes(city.id)):africaClimateCities)){
   await page.locator(`[data-africa-city-label="${city.id}"]`).focus();await page.keyboard.press('Enter');await settle(page);
   const reading=page.locator(`[data-africa-city-reading="${city.id}"]`);assert(await reading.isVisible());assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),camera,'city selection changed camera');
   assert.equal(await reading.locator('.atlas-climate-bar').count(),12);assert.equal((await state(page)).city,city.id);assert((await reading.locator('.africa-city-classification').innerText()).includes(city.classification.code));
   if(city.classification.maskedMapMissing)assert((await reading.innerText()).includes('地図マスク欠測'),'coastal display missingness must remain explicit');
   const plot=await reading.locator('figure').boundingBox(),panel=await page.locator('.africa-detail').boundingBox();assert(plot.y>=panel.y&&plot.y+plot.height<=panel.y+panel.height+1,'plot clipped by reader');
   if(focusedReview){const selectedLayout=await islandLocality(page);nearbyIslandLabels(selectedLayout);for(const label of selectedLayout){const before=record.islandLocality.find(x=>x.id===label.id);assert(Math.abs(label.label.x-before.label.x)<.5&&Math.abs(label.label.y-before.label.y)<.5,'selection must not relocate Madagascar names');}}
   if(!focusedReview){await reading.locator('.africa-city-agriculture').scrollIntoViewIfNeeded();assert(await reading.locator('.africa-city-agriculture').isVisible());
   const months=reading.locator('details');await months.evaluate(n=>n.open=true);const cells=await months.locator('tbody tr').count();assert.equal(cells,12);assert(!/未収録/.test(await months.locator('tbody').innerText()),'complete monthly record rendered missing');await months.evaluate(n=>n.open=false);}
   if(focusedReview||['toamasina','antananarivo','algiers','durban'].includes(city.id)){await page.locator('.africa-detail').evaluate(n=>n.scrollTop=0);await capture(page,profile,`climate-${city.id}`);}
  }
  if(focusedReview){
   await page.locator('[data-africa-city-return]').click();await settle(page);assert.equal(await page.locator('[data-africa-city-label]').count(),12);assert.equal(await page.locator('.africa-map').getAttribute('viewBox'),camera);record.checks.push('12 visible/selectable cities; four Madagascar names within 40px, geographic ordering, four plots, stable labels and camera');
   if(width===1024){
    const oldPopulation=path.join(root,'review-artifacts/africa-final-89f40b5/1024-population.jpg'),file='1024-population.jpg';
    try{await copyFile(oldPopulation,path.join(output,file));record.populationEvidence={kind:'saved image',sourceHead:'89f40b54eb38ff67ed93acb3d98c0c5a507289a1',sourceFile:'review-artifacts/africa-final-89f40b5/1024-population.jpg',reason:'Population rendering is unchanged by this climate-label-only revision'};}
    catch{await page.locator('[data-field=population]').click();await settle(page);await page.locator('[data-africa-raster=distribution]').waitFor();await capture(page,profile,'population');record.populationEvidence={kind:'capture only',head:report.head};}
    if(!report.screenshots.some(x=>x.file===file))report.screenshots.push({file,profile,scene:'population',provenance:record.populationEvidence});
   }
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(externals,[]);record.status='passed';await context.close();continue;
  }
  await page.reload();await settle(page);assert.equal((await state(page)).city,'toliara');await page.locator('[data-africa-city-return]').click();assert.equal((await state(page)).city,undefined);assert.equal(await page.locator('[data-africa-city-readings]').isVisible(),false);await capture(page,profile,'climate-return');record.checks.push('12 city plots, exact classification, months, visible labels, stable camera, reload and return');
  await page.locator('[data-field=population]').click();await settle(page);await page.locator('[data-africa-raster=distribution]').waitFor();const population=await visibleLabels(page,'[data-africa-population-city]');assert.equal(population.length,12);assert(population.every(x=>x.visible));record.labels.push({scene:'population',cities:population});await capture(page,profile,'population');
  for(const topic of ['ethnicity','religion','distribution']){await page.locator(`[data-africa-topic=${topic}]`).click();await settle(page);}assert.equal(await page.locator('[data-africa-population-city]').count(),12);record.checks.push('population cities, faint countries and topic round trip');
  await page.locator('[data-field=agriculture]').click();await settle(page);await page.locator('[data-africa-agri-distribution]').first().waitFor();assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),9);
  record.distributionPaint=await page.locator('image[data-africa-agri-distribution]').evaluateAll(async nodes=>Promise.all(nodes.map(async n=>{const img=new Image();img.src=n.getAttribute('href');await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,img.width,img.height).data,alpha=new Set();let painted=0;for(let i=3;i<pixels.length;i+=4){alpha.add(pixels[i]);if(pixels[i]>0)painted++;}return {key:n.getAttribute('data-africa-agri-distribution'),width:img.width,height:img.height,painted,alphaLevels:alpha.size};})));
  assert(record.distributionPaint.every(p=>p.painted>100&&p.alphaLevels>30),'production belts must decode and paint soft, nonempty source-derived images');
  assert(await page.locator('[data-africa-agri-display]').isVisible());assert(await page.locator('[data-africa-agri-region]').isVisible());assert.equal(await page.locator('[data-africa-neighbour]').count(),6);
  await capture(page,profile,'agriculture-initial');const productNames=await visibleLabels(page,'[data-africa-agri-label-text]');assert(productNames.filter(x=>x.visible).length>=7);record.labels.push({scene:'agriculture',products:productNames});
  await page.locator('[data-africa-agri-display]').selectOption('crops');await settle(page);assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),6);
  await page.locator('[data-africa-agri-display]').selectOption('livestock');await settle(page);assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),3);
  await page.locator('[data-africa-agri-display]').selectOption('all');await settle(page);
  await page.locator('[data-africa-agri-pick="crop-rice-harvested"]').last().click();await settle(page);assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),9);assert(await page.locator('[data-africa-agri-only]').isVisible());await capture(page,profile,'agriculture-rice');
  await page.locator('[data-africa-agri-only]').click();await settle(page);assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),1);await page.locator('[data-africa-agri-all]').click();await settle(page);assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),9);
  for(const crop of ['coffee','tea']){await page.locator(`[data-africa-agri-pick="crop-${crop}-harvested"]`).last().click();await settle(page);assert(await page.locator(`[data-africa-agri-distribution="crop-${crop}-harvested"] [data-africa-beverage-belt]`).count());assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),9);}
  for(const region of ['north','west','east','central','south','all']){await page.locator('[data-africa-agri-region]').selectOption(region);await settle(page);assert.equal((await state(page)).region,region);assert(await page.locator('[data-africa-regional-statistics]').isVisible());}
  await page.locator('[data-africa-regional-statistics]').scrollIntoViewIfNeeded();const statistics=await page.locator('[data-africa-regional-statistics]').innerText();assert(statistics.includes('2024年')&&statistics.includes('未取得')&&statistics.includes('カロリー')&&statistics.includes('輸出'));await page.screenshot({path:path.join(output,`${profile}-agriculture-statistics.jpg`),type:'jpeg',quality:72});report.screenshots.push({file:`${profile}-agriculture-statistics.jpg`,profile,scene:'statistics'});
  await page.locator('[data-africa-topic=forestry]').click();await settle(page);await page.locator('[data-africa-topic=farming]').click();await settle(page);assert.equal(await page.locator('[data-africa-agri-distribution]:visible').count(),9);if(await page.locator('[data-africa-agri-overview]').isVisible())await page.locator('[data-africa-agri-overview]').click();await settle(page);assert((await page.locator('[data-theme-title]').innerText()).includes('農畜産'));record.checks.push('7 sourced concentration layers and 2 schematic belts, group filters, rice emphasis/isolation, sourced coffee/tea, all 5 regions, lower statistics and forestry round trip');
  await page.locator('[data-field=nature]').click();await page.locator('[data-africa-topic=water]').click();await settle(page);await page.locator('[data-africa-water=river]').click();await settle(page);for(const river of ['nile','congo']){await page.locator(`[data-africa-river-choice=${river}]`).click();await settle(page);assert((await page.locator('[data-theme-title]').innerText()).includes(river==='nile'?'ナイル':'コンゴ'));}await page.locator('[data-reset]').click();await settle(page);assert.equal((await state(page)).city,undefined);assert.equal(await page.locator('[data-africa-city-label]').count(),12);record.checks.push('existing river controls and reset return to initial climate');
  await page.locator('[data-field=industry]').click();await settle(page);assert(await page.locator('[data-africa-industry-theme]').first().isVisible());record.checks.push('existing industry overview preserved');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual(externals,[]);record.status='passed';await context.close();
 }
 report.status='passed';
 report.representativeImages=focusedReview?['1024-climate-initial.jpg','1024-climate-toamasina.jpg','1024-climate-antananarivo.jpg','1024-climate-mahajanga.jpg','1024-climate-toliara.jpg','1440-climate-initial.jpg','1440-climate-toamasina.jpg','1024-population.jpg']:['1024-climate-initial.jpg','1024-population.jpg','1440-population.jpg','1440-agriculture-initial.jpg','1024-agriculture-rice.jpg','1440-climate-toamasina.jpg','1024-climate-antananarivo.jpg'];
 const representative=path.join(output,'representative');await mkdir(representative,{recursive:true});for(const file of report.representativeImages)await copyFile(path.join(output,file),path.join(representative,file));
}catch(e){report.status='failed';report.error=e.stack;console.error(e);process.exitCode=1;}finally{report.completedAt=new Date().toISOString();await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');if(report.status==='passed')await copyFile(path.join(output,'verification.json'),path.join(output,'representative','verification.json'));await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({status:report.status,output,scenes:report.screenshots.length}));}
