import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {centralIndustries,centralIndustrySites,centralIndustrySectors} from '../src/data/atlas/central-asia-industry.ts';
import {centralIndustryStageReading} from '../src/lib/atlas-central-asia-industry.ts';

const root=path.resolve('dist'),base='/insight-journal',output=path.resolve(process.env.CENTRAL_REVIEW_OUTPUT??'review-artifacts/central-asia-industry');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!pathname.startsWith(base+'/')){res.writeHead(404).end();return;}const file=path.resolve(root,'.'+pathname.slice(base.length)+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const url=`http://127.0.0.1:${server.address().port}${base}/atlas/asia/central-asia/industry/`;
await mkdir(output,{recursive:true});
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),buildRelease:JSON.parse(await readFile(path.join(root,'_release.json'),'utf8')),browser:{executable:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',chromiumSandbox:true,scope:'Local production build in sandboxed Chrome; no OS permissions changed'},screenshots:[],viewports:[],checks:[]};
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:result.browser.executable,chromiumSandbox:result.browser.chromiumSandbox,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 const page=await browser.newPage({deviceScaleFactor:1}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const settle=async()=>{await page.waitForFunction(()=>document.querySelector('[data-central-industry]')?.dataset.centralReady==='true');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});};
 const state=()=>page.locator('[data-central-industry]').evaluate(root=>root.centralIndustryView);
 const layout=()=>page.evaluate(()=>{const stage=document.querySelector('[data-central-map-frame]').getBoundingClientRect(),rect=node=>{const box=node.getBoundingClientRect();return [box.left-stage.left,box.top-stage.top,box.width,box.height];};return {frame:document.querySelector('[data-central-map]').getAttribute('viewBox'),map:[stage.width,stage.height],labels:[...document.querySelectorAll('[data-central-label-industry]')].map(node=>({id:node.dataset.centralLabelSites,industry:node.dataset.centralLabelIndustry,text:node.textContent,rect:rect(node),hidden:node.hidden})),markers:[...document.querySelectorAll('[data-central-marker]')].map(node=>({id:node.dataset.centralMarker,point:node.dataset.coordinate,display:node.style.display})),incomplete:document.querySelector('[data-central-industry]').dataset.labelsIncomplete??null,overflow:document.documentElement.scrollWidth>innerWidth,columns:[...document.querySelectorAll('[data-central-stat-column]')].map(rect),mapBottom:stage.bottom,statisticsTop:document.querySelector('.central-industry-statistics').getBoundingClientRect().top};});
 const stableGeometry=snapshot=>({frame:snapshot.frame,map:snapshot.map,labels:snapshot.labels.map(({id,industry,text,rect})=>({id,industry,text,rect}))});
 async function verify(sector,only=false){
  await settle();const view=await state(),snapshot=await layout(),visible=centralIndustrySites.filter(site=>site.sectors.includes(sector)&&(!only||site.industry===view.industry));
  if(snapshot.incomplete){await page.screenshot({path:path.join(output,`failed-${page.viewportSize().width}-${sector}.png`)});await writeFile(path.join(output,'failure.json'),JSON.stringify({sector,snapshot},null,2));}
  assert.equal(snapshot.overflow,false,'No horizontal document overflow');assert.equal(snapshot.incomplete,null,`All industry labels fit at the default camera (${page.viewportSize().width}, ${sector})`);
  assert.deepEqual(snapshot.markers.filter(marker=>marker.display!=='none').map(marker=>marker.id).sort(),visible.map(site=>site.id).sort(),'Every source-supported guide stays visible');
  for(const marker of snapshot.markers)assert.equal(marker.point,centralIndustrySites.find(site=>site.id===marker.id).coordinates.join(','));
  const boxes=snapshot.labels.filter(label=>!label.hidden);for(const [index,label]of boxes.entries()){const [x,y,w,h]=label.rect;assert(x>=-1&&y>=-1&&x+w<=snapshot.map[0]+1&&y+h<=snapshot.map[1]+1,'Label stays inside the map');for(const other of boxes.slice(index+1)){const [a,b,c,d]=other.rect;assert(!(x<a+c&&x+w>a&&y<b+d&&y+h>b),'Industry label boxes never overlap');}}
  assert(snapshot.statisticsTop>=snapshot.mapBottom,'Statistics stay below the map');
  assert.equal(await page.locator('.central-reading [data-central-metric]').count(),0,'Right side is reading, not statistics');
  return snapshot;
 }
 async function capture(name){await settle();const snapshot=await layout();await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});result.screenshots.push({file:name+'.png',type:'viewport',viewport:page.viewportSize(),...snapshot});if(page.viewportSize().width<700){await page.locator('[data-central-map-frame]').screenshot({path:path.join(output,name+'-map.png'),animations:'disabled'});result.screenshots.push({file:name+'-map.png',type:'map element',viewport:page.viewportSize(),...snapshot});}}
 for(const [width,height]of [[1920,1080],[1440,1000],[1024,900],[390,844]]){
  await page.setViewportSize({width,height});await page.goto(url,{waitUntil:'networkidle'});await settle();assert.equal(await page.evaluate(()=>devicePixelRatio),1);
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[data-central-sector="${sector}"]`).click();assert.equal(await page.locator('[data-central-reading]').textContent(),centralIndustrySectors.find(item=>item.id===sector).overview);assert.equal(await page.locator(`[data-central-overview="${sector}"]`).textContent(),'分布全体');const baseline=await verify(sector);await capture(`${width}-${sector}-initial`);
   const initial=await state();
   for(const item of centralIndustries.filter(industry=>industry.sectors.includes(sector))){
    await page.locator(`[data-central-choices="${sector}"] [data-central-choice="${item.id}"]`).click();await verify(sector);assert.equal((await state()).industry,item.id);assert.deepEqual(stableGeometry(await layout()),stableGeometry(baseline),'Selecting '+item.id+' never changes geometry');
    const reading=centralIndustryStageReading(item.id,sector);assert.equal(await page.locator('[data-central-title]').textContent(),reading.title);assert.equal(await page.locator('[data-central-reading]').textContent(),reading.overview);assert((await page.locator(`[data-central-metric-industry="${item.id}"]:visible`).count())>0,'Adopted item exposes its own statistics');
    await page.locator('[data-central-clear]').click();assert.deepEqual(stableGeometry(await layout()),stableGeometry(baseline));
   }
   const item=centralIndustries.find(industry=>industry.sectors.includes(sector)),site=centralIndustrySites.find(site=>site.industry===item.id&&site.sectors.includes(sector));
   await page.locator(`[data-central-choices="${sector}"] [data-central-choice="${item.id}"]`).click();await page.locator('#central-industry-locations').evaluate(node=>node.open=true);await page.locator(`[data-central-site-choice="${site.id}"]`).click();await settle();assert.equal((await state()).site,site.id);assert.deepEqual((await state()).frame,initial.frame);await verify(sector);await page.evaluate(()=>scrollTo(0,0));await capture(`${width}-${sector}-selected`);
   await page.locator('[data-central-only]').check();await verify(sector,true);const beforeOnly=await layout();assert.deepEqual(beforeOnly.labels.filter(label=>!label.hidden).map(({id,rect})=>({id,rect})),baseline.labels.filter(label=>label.industry===item.id).map(({id,rect})=>({id,rect})),'Only mode reserves peer label positions');
   await page.reload({waitUntil:'networkidle'});await settle();assert.equal((await state()).site,site.id);assert.equal((await state()).only,true);await verify(sector,true);
   await page.locator('[data-central-only]').uncheck();await page.locator('[data-central-clear]').click();await page.goBack();await settle();assert.equal((await state()).site,site.id);await page.goForward();await settle();assert.equal((await state()).site,null);await verify(sector);
   result.viewports.push({width,height,sector,checks:['all adopted items','stable labels and camera','site selection','only mode','reload','history','within frame','statistics below map']});
  }
 }
 await page.setViewportSize({width:1920,height:1080});await page.goto(url,{waitUntil:'networkidle'});await settle();
 for(const id of ['central-zhezkazgan','central-aktobe-chromium']){
  await page.locator('[data-central-sector="resources"]').click();assert.equal(await page.locator(`[data-central-marker="${id}"]`).count(),0);const before=(await state()).frame;
  await page.locator('[data-central-sector="manufacturing"]').click();assert.equal(await page.locator(`[data-central-marker="${id}"]`).count(),1);await page.locator('#central-industry-locations').evaluate(node=>node.open=true);await page.locator(`[data-central-site-choice="${id}"]`).click();await settle();assert.equal((await state()).site,id);assert.deepEqual((await state()).frame,before);assert.equal(await page.locator('[data-central-overlap]:visible').count(),0);await verify('manufacturing');
 }
 await page.locator('[data-country-select]').selectOption('KAZ');assert.equal((await state()).country,'KAZ');await page.locator('[data-reset]').click();assert.equal((await state()).country,null);assert.equal(new URL(page.url()).pathname,base+'/atlas/asia/central-asia/industry/');
 await page.locator('[data-central-sector="resources"]').focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).sector,'manufacturing');
 await page.locator('[data-central-map]').focus();const beforeKeyboard=(await state()).frame;await page.keyboard.press('ArrowLeft');assert.notDeepEqual((await state()).frame,beforeKeyboard);await page.locator('[data-central-fit]').click();assert.deepEqual((await state()).frame,(await state()).initialFrame);
 await page.locator('[data-central-zoom-in]').click();const zoomed=(await state()).frame;assert(zoomed[2]<(await state()).initialFrame[2]);await page.reload({waitUntil:'networkidle'});await settle();assert.deepEqual((await state()).frame,zoomed);await page.locator('[data-central-fit]').click();
 const svgBox=await page.locator('[data-central-map]').boundingBox();await page.mouse.move(svgBox.x+svgBox.width*.25,svgBox.y+svgBox.height*.4);await page.mouse.down();await page.mouse.move(svgBox.x+svgBox.width*.25+35,svgBox.y+svgBox.height*.4+25,{steps:5});await page.mouse.up();assert.notDeepEqual((await state()).frame,(await state()).initialFrame);await page.locator('[data-central-fit]').click();
 await page.locator('.central-industry-statistics').scrollIntoViewIfNeeded();await capture('1920-statistics-three-columns');const columns=(await layout()).columns;assert(columns.every(column=>Math.abs(column[1]-columns[0][1])<1));assert(columns[0][0]<columns[1][0]&&columns[1][0]<columns[2][0]);
 assert.equal(await page.locator('[data-central-flow]').count(),0,'No inferred transaction arrows');assert.match(await page.locator('[data-central-metric="logistics-world"]').textContent(),/未確認/);
 await page.locator('[data-central-sector="resources"]').click();const beforeMarker=await layout();await page.locator('[data-central-marker="sc-tengiz-oil"]').click();assert.equal((await state()).site,'sc-tengiz-oil');assert.deepEqual(stableGeometry(await layout()),stableGeometry(beforeMarker));await page.locator('[data-central-marker="sc-inkai-uranium"]').focus();await page.keyboard.press('Enter');assert.equal((await state()).site,'sc-inkai-uranium');assert.deepEqual(stableGeometry(await layout()),stableGeometry(beforeMarker));
 assert.deepEqual(errors,[]);result.checks.push('All eleven items, all three sectors, four viewports, category keyboard, pan/zoom/reset, processing sites separated by sector, exact URL history/reload, no inferred flows, no JS errors');
 const touchContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 const touchPage=await touchContext.newPage();
 touchPage.on('pageerror',error=>errors.push(error.message));
 await touchPage.goto(url,{waitUntil:'networkidle'});
 await touchPage.waitForFunction(()=>document.querySelector('[data-central-industry]')?.dataset.centralReady==='true');
 await touchPage.locator('[data-central-sector="manufacturing"]').tap();
 const touchState=()=>touchPage.locator('[data-central-industry]').evaluate(root=>root.centralIndustryView),touchBefore=(await touchState()).frame;
 await touchPage.locator('[data-central-choices="manufacturing"] [data-central-choice="textiles"]').tap();
 assert.equal((await touchState()).industry,'textiles');assert.deepEqual((await touchState()).frame,touchBefore);
 await touchPage.locator('[data-central-map-frame]').scrollIntoViewIfNeeded();
 const touchBox=await touchPage.locator('[data-central-map]').boundingBox(),cx=touchBox.x+touchBox.width/2,cy=touchBox.y+touchBox.height/2,cdp=await touchContext.newCDPSession(touchPage);
 // Starting over HTML labels must still reach the map's shared gesture surface.
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-25,y:cy,id:1},{x:cx+25,y:cy,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-50,y:cy,id:1},{x:cx+50,y:cy,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await touchPage.waitForFunction(width=>document.querySelector('[data-central-industry]').centralIndustryView.frame[2]<width,touchBefore[2]);
 await touchPage.locator('[data-central-fit]').tap();assert.deepEqual((await touchState()).frame,(await touchState()).initialFrame);
 const scrollBefore=await touchPage.evaluate(()=>scrollY),swipeBox=await touchPage.locator('[data-central-map]').boundingBox(),sx=swipeBox.x+swipeBox.width/2,sy=swipeBox.y+swipeBox.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx,y:sy-60,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx,y:sy-120,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await touchPage.waitForFunction(before=>scrollY>before+10,scrollBefore);
 assert.deepEqual((await touchState()).frame,(await touchState()).initialFrame,'One-finger scrolling leaves the camera alone');
 assert.deepEqual(errors,[]);await touchContext.close();result.checks.push('Real mobile touch tap, two-finger pinch zoom and one-finger page scroll');

 // The same shared route must retain the existing South Asia controller.
 await page.goto(url.replace('central-asia/industry/','south-asia/industry/'),{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');assert.equal(await page.locator('[data-central-industry]').count(),0);assert((await page.locator('.asia-industry-regional-label').count())>=5);result.checks.push('South Asia still uses its existing independent renderer');
 await writeFile(path.join(output,'review.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output,viewports:result.viewports.length,screenshots:result.screenshots.length,checks:result.checks},null,2));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
