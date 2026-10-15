import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {southeastIndustrySites,southeastSiteSectors} from '../src/data/atlas/asia/southeast-asia-industry-sites.ts';
const root=resolve('dist'),out=resolve(process.env.SEA_INDUSTRY_REVIEW_OUTPUT??'review-artifacts/southeast-second-pass/industry-expanded');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/octet-stream','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert(path.startsWith('/insight-journal/'));path=path.slice('/insight-journal'.length);const file=resolve(root,'.'+path,path.endsWith('/')?'index.html':'');assert(file.startsWith(root+sep));res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end('Missing local asset');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const kinds=['metals','energy','lng','palm','rice','electronics','automotive','textiles','rubber','wood','food','logistics','tourism','it-bpm','hydro','finance','petrochemicals','solar'];
const errors=[],checks=[],images=[],measurements=[];let browser,failure=null;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??process.env.INDUSTRY_REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block'});page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort('blockedbyclient'));
 const ready=async()=>{await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-asia-atlas]')?.dataset.southeastIndustryLayoutReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});};
 const open=async(query='')=>{await page.goto(base+'/insight-journal/atlas/asia/southeast-asia/industry/'+query,{waitUntil:'networkidle'});await ready();};
 const geometry=async()=>page.evaluate(()=>{
  // Native controls may scroll into view on mobile. Compare the map's
  // document position, dimensions and camera independently of page scrolling.
  const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};};
  return {frame:rect(document.querySelector('.asia-map-frame')),camera:document.querySelector('[data-asia-atlas]').dataset.mapCamera,labels:[...document.querySelectorAll('[data-southeast-industry-label]:not([hidden])')].map(n=>({id:n.dataset.southeastIndustryLabel,left:n.style.left,top:n.style.top,width:n.style.width,height:n.style.height,text:n.textContent})),points:[...document.querySelectorAll('[data-southeast-industry-point]')].map(n=>({id:n.dataset.southeastIndustryPoint,left:n.style.left,top:n.style.top,hidden:n.hidden}))};
 });
 const labelsClear=async()=>page.evaluate(()=>{
  const frame=document.querySelector('[data-southeast-industry-map]').getBoundingClientRect(),labels=[...document.querySelectorAll('[data-southeast-industry-label]:not([hidden])')].map(n=>({id:n.dataset.southeastIndustryLabel,r:n.getBoundingClientRect(),clipped:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1}));
  const reserved=[document.querySelector('[data-southeast-industry-legend]'),document.querySelector('.asia-map-tools')].map(n=>n.getBoundingClientRect());
  const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  return {count:labels.length,failures:labels.flatMap((a,i)=>[...(a.clipped?[a.id+': clipped']:[]),...(a.r.left<frame.left||a.r.right>frame.right||a.r.top<frame.top||a.r.bottom>frame.bottom?[a.id+': outside']:[]),...labels.slice(i+1).filter(b=>intersects(a.r,b.r)).map(b=>a.id+'/'+b.id),...reserved.filter(b=>intersects(a.r,b)).map(()=>a.id+': control')])};
 });
 const shot=async(name)=>{await page.evaluate(()=>scrollTo(0,0));await ready();const file=name+'.png',bytes=await page.screenshot({path:join(out,file),animations:'disabled'});images.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});};
 const choose=async(kind)=>{await page.locator('[data-southeast-industry-picker]').selectOption(kind);assert.equal(new URL(page.url()).searchParams.get('industryKind'),kind);assert.equal(await page.locator('[data-southeast-industry-facts="'+kind+'"]').isVisible(),true);};
 const seen=new Set();
 for(const viewport of [{width:1920,height:1080},{width:1024,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await open('?industrySector=resource');
  assert.equal(await page.locator('[data-southeast-industry-sector]').count(),3);
  assert.equal(await page.locator('[data-southeast-industry-picker]').count(),1);
  assert.equal(await page.locator('.asia-map-frame [data-southeast-industry-picker],.asia-map-frame [data-southeast-industry-controls]').count(),0);
  for(const sector of ['resource','manufacturing','services']){
   await page.locator('[data-southeast-industry-sector="'+sector+'"]').click();await ready();
   const baseline=await geometry(),clear=await labelsClear();
   const expected=southeastIndustrySites.filter(s=>southeastSiteSectors(s).includes(sector)).map(s=>s.id).sort();
   assert.deepEqual(baseline.points.filter(p=>!p.hidden).map(p=>p.id).sort(),expected,sector+': only this sector is visible');
   assert.deepEqual(clear.failures,[]);assert(clear.count>=(viewport.width<600?2:4),JSON.stringify({viewport,sector,clear}));
   const leaderLengths=await page.locator('[data-southeast-industry-leader]').evaluateAll(nodes=>nodes.map(n=>Math.hypot(Number(n.getAttribute('x1'))-Number(n.getAttribute('x2')),Number(n.getAttribute('y1'))-Number(n.getAttribute('y2')))));
   assert(leaderLengths.every(n=>n<=48.01),'leader exceeds 48px');
   const options=await page.locator('[data-southeast-industry-picker] option').evaluateAll(nodes=>nodes.map(n=>n.value).filter(id=>id!=='all'));
   for(const kind of options){await choose(kind);seen.add(kind);assert.deepEqual(await geometry(),baseline,sector+'/'+kind+': selection moved the map or labels');}
   const site={resource:'kalimantan-coal',manufacturing:'morowali-smelter',services:'bali-tourism'}[sector];
   await page.locator('[data-southeast-industry-point="'+site+'"]').click();assert.equal(new URL(page.url()).searchParams.get('industrySite'),site);assert.deepEqual(await geometry(),baseline);
   await page.reload({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('industrySite'),site);assert.deepEqual(await geometry(),baseline);
   await page.locator('[data-southeast-industry-clear]').click();assert.equal(new URL(page.url()).searchParams.has('industryKind'),false);assert.deepEqual(await geometry(),baseline);
   await page.goBack();await ready();assert.equal(new URL(page.url()).searchParams.get('industrySite'),site);await page.goForward();await ready();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(overflow<=2,'horizontal overflow '+overflow);
   measurements.push({viewport:viewport.width+'x'+viewport.height,sector,...baseline,clear,leaderLengths});await shot(viewport.width+'-'+sector);
  }
 }
 assert.equal(seen.size,18);
 checks.push('Three independent sector scenes show only their own points, labels and correspondence lines at 1920/1024/390 widths');
 checks.push('All 18 industry profiles and source definitions remain reachable; industry/point selection, reload, clear and history keep each scene fixed');
 checks.push('Industry selector and sector legend are outside the map; short labels remain unclipped and non-overlapping with leaders at most 48px');
 await page.setViewportSize({width:1920,height:1080});await open('?industrySector=manufacturing&industryKind=palm');
 await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.southeastPalmStateReady==='true');
 assert.equal(await page.locator('[data-southeast-palm-state-table] tbody tr').count(),7);await shot('1920-palm-processing');
 await choose('rice');await shot('1920-rice-country-evidence');await choose('solar');await shot('1920-solar-country-evidence');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,images:images.length,browser:browser.version()}));
}catch(e){failure=String(e.stack??e);throw e;}finally{await writeFile(join(out,'results.json'),JSON.stringify({passed:!failure&&errors.length===0,checks,images,measurements,errors,failure,head:process.env.REVIEW_HEAD_SHA??null},null,2));await browser?.close();await new Promise(r=>server.close(r));}
