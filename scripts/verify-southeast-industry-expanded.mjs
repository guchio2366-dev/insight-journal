import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
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
  const rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  return {frame:rect(document.querySelector('.asia-map-frame')),camera:document.querySelector('[data-asia-atlas]').dataset.mapCamera,labels:[...document.querySelectorAll('[data-southeast-industry-label]:not([hidden])')].map(n=>({id:n.dataset.southeastIndustryLabel,left:n.style.left,top:n.style.top,width:n.style.width,height:n.style.height,text:n.textContent})),points:[...document.querySelectorAll('[data-southeast-industry-point]')].map(n=>({id:n.dataset.southeastIndustryPoint,left:n.style.left,top:n.style.top,hidden:n.hidden}))};
 });
 const labelsClear=async()=>page.evaluate(()=>{
  const frame=document.querySelector('[data-southeast-industry-map]').getBoundingClientRect(),labels=[...document.querySelectorAll('[data-southeast-industry-label]:not([hidden])')].map(n=>({id:n.dataset.southeastIndustryLabel,r:n.getBoundingClientRect(),clipped:n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1}));
  const reserved=[document.querySelector('[data-southeast-industry-legend]'),document.querySelector('.asia-map-tools')].map(n=>n.getBoundingClientRect());
  const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
  return {count:labels.length,failures:labels.flatMap((a,i)=>[...(a.clipped?[a.id+': clipped']:[]),...(a.r.left<frame.left||a.r.right>frame.right||a.r.top<frame.top||a.r.bottom>frame.bottom?[a.id+': outside']:[]),...labels.slice(i+1).filter(b=>intersects(a.r,b.r)).map(b=>a.id+'/'+b.id),...reserved.filter(b=>intersects(a.r,b)).map(()=>a.id+': control')])};
 });
 const shot=async(name)=>{await page.evaluate(()=>scrollTo(0,0));await ready();const file=name+'.png',bytes=await page.screenshot({path:join(out,file),animations:'disabled'});images.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});};
 const choose=async(kind)=>{await page.locator(`[data-southeast-industry-controls] [data-southeast-industry-kind="${kind}"]`).click();assert.equal(new URL(page.url()).searchParams.get('industryKind'),kind);assert.equal(await page.locator(`[data-southeast-industry-facts="${kind}"]`).isVisible(),true);};
 await open();assert.equal(await page.locator('[data-southeast-industry-controls] [data-southeast-industry-kind]').count(),19);assert.equal(await page.locator('[data-sea-overview-row]').count(),18);
 const first=await geometry();assert(first.frame.width>650&&first.frame.height>=460);const clear=await labelsClear();assert(clear.count>=15,JSON.stringify(clear));assert.deepEqual(clear.failures,[]);measurements.push({viewport:'1920x1080',...first,clear});
 const layout=await page.evaluate(()=>{const f=document.querySelector('.asia-map-frame').getBoundingClientRect(),s=document.querySelector('[data-southeast-industry-statistics]').getBoundingClientRect(),r=document.querySelector('[data-industry-region-reading]').getBoundingClientRect();return {statisticsBelow:s.top>=f.bottom,rightReading:r.left>=f.right,scale:visualViewport.scale};});assert(layout.statisticsBelow&&layout.rightReading&&layout.scale===1,JSON.stringify(layout));await shot('1920-overview');
 for(const kind of kinds){await choose(kind);assert.deepEqual(await geometry(),first,kind+': selection moved geometry');assert.equal(await page.locator('[data-southeast-industry-facts]:visible').count(),1);assert.equal(await page.locator(`[data-southeast-industry-facts="${kind}"] a`).count()>0,true);}
 checks.push('All 18 adopted industries render dated scope/source statistics below the map without moving camera, labels or map frame');await shot('1920-solar-country-evidence');
 await choose('rubber');await page.locator('[data-southeast-industry-label="rayong-tires"]').click();assert.equal(new URL(page.url()).searchParams.get('industrySite'),'rayong-tires');assert.equal(await page.locator('[data-southeast-industry-selected]').isVisible(),true);assert.deepEqual(await geometry(),first);
 await page.reload({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('industrySite'),'rayong-tires');assert.equal(await page.locator('[data-southeast-industry-point="rayong-tires"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-southeast-industry-clear]').click();assert.equal(new URL(page.url()).searchParams.has('industryKind'),false);await page.goBack();await ready();assert.equal(new URL(page.url()).searchParams.get('industrySite'),'rayong-tires');await page.goForward();await ready();assert.equal(await page.locator('[data-southeast-industry-selected]').isVisible(),false);
 checks.push('Site selection, clear, URL reload and Back/Forward preserve valid industry/site state');
 const beforeSectors=await geometry();for(const sector of ['resource','manufacturing','services','all']){await page.locator(`[data-southeast-industry-sector="${sector}"]`).click();assert.deepEqual(await geometry(),beforeSectors,sector+': sector moved geometry');}checks.push('Three sector emphasis preserves every guide point and fixed label layout');
 await choose('palm');await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.southeastPalmStateReady==='true');assert.equal(await page.locator('[data-southeast-palm-state-table] tbody tr').count(),7);assert.match(await page.locator('[data-southeast-palm-map-key]').textContent(),/州合計.*密度/);await shot('1920-palm-processing');await choose('rice');await shot('1920-rice-processing');await choose('it-bpm');await shot('1920-service-bpo');
 for(const viewport of [{width:1024,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await open();const baseline=await geometry(),c=await labelsClear();assert.deepEqual(c.failures,[]);assert(c.count>=5,JSON.stringify(c));
  for(const kind of ['palm','rice','wood','hydro','finance','solar']){await choose(kind);assert.deepEqual(await geometry(),baseline,viewport.width+' '+kind);}
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(overflow<=2,'horizontal overflow '+overflow);measurements.push({viewport:viewport.width+'x'+viewport.height,...baseline,clear:c});await shot(viewport.width+'-solar');
 }
 checks.push('1024px and 390px selection preserves layout, labels clear controls and no page horizontal overflow');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks,images:images.length,browser:browser.version()}));
}catch(e){failure=String(e.stack??e);throw e;}finally{await writeFile(join(out,'results.json'),JSON.stringify({passed:!failure&&errors.length===0,checks,images,measurements,errors,failure,head:process.env.REVIEW_HEAD_SHA??null},null,2));await browser?.close();await new Promise(r=>server.close(r));}
