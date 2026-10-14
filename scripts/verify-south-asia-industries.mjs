import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
import astro from '../astro.config.mjs';
const dist=path.resolve('dist'),out=path.resolve('review-artifacts/south-asia-industries'),base=astro.base;
const catalog=JSON.parse(await readFile('src/data/atlas/south-asia-major-industries.json','utf8'));
const sites=JSON.parse(await readFile('src/data/atlas/south-asia-industry-sites.json','utf8'));
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',sandboxRequired:true,checks:[],images:[],viewports:[]};
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(!p.startsWith(base+'/'))throw Error('scope');p=p.slice(base.length);if(p.endsWith('/'))p+='index.html';const file=path.resolve(dist,'.'+p);if(!file.startsWith(dist+path.sep))throw Error('scope');res.writeHead(200,{'content-type':({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}${base}`;
let browser,page;
async function ready(){await page.waitForFunction(()=>{const r=document.querySelector('[data-asia-atlas]'),m=r?.atlasReviewMap;return r?.dataset.mapReady==='true'&&m?.loaded()&&m.areTilesLoaded()&&!m.isMoving();});await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});}
async function snapshot(){await ready();return page.evaluate(()=>{const root=document.querySelector('[data-asia-atlas]'),map=root.atlasReviewMap,frame=root.querySelector('.asia-map-frame').getBoundingClientRect(),center=map.getCenter();return {camera:[center.lng,center.lat,map.getZoom()].map(v=>Number(v.toFixed(5))),size:[frame.width,frame.height],labels:[...root.querySelectorAll('.asia-industry-regional-label')].map(n=>{const r=n.getBoundingClientRect();return {id:n.dataset.industrySite,text:n.textContent,compact:n.classList.contains('is-compact'),box:[r.left-frame.left,r.top-frame.top,r.width,r.height],selected:n.getAttribute('aria-pressed')==='true'};})};});}
function fixed(before,after,name,{urlRoundTrip=false}={}){const camera=v=>urlRoundTrip?v.map((n,i)=>Number(n.toFixed(i===2?3:5))):v;assert.deepEqual(camera(after.camera),camera(before.camera),name+': camera');assert.deepEqual(after.size,before.size,name+': map dimensions');assert.deepEqual(after.labels.map(({selected,...r})=>({...r,box:undefined})),before.labels.map(({selected,...r})=>({...r,box:undefined})),name+': names and compact state');for(let i=0;i<after.labels.length;i++)for(let j=0;j<4;j++)assert(Math.abs(after.labels[i].box[j]-before.labels[i].box[j])<(urlRoundTrip?1.1:.8),name+': label position '+after.labels[i].id);result.checks.push({name,status:'passed'});}
async function capture(name){await ready();const before=await snapshot();await page.locator('.asia-map-frame').evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));await page.mouse.move(1,1);await ready();fixed(before,await snapshot(),name+' capture scroll');const file=name+'.png';const bytes=await page.screenshot({path:path.join(out,file),animations:'disabled'});result.images.push({file,head:result.head,viewport:page.viewportSize(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),url:page.url()});}
async function noLabelCollisions(){const state=await snapshot(),full=state.labels.filter(n=>!n.compact);for(let i=0;i<full.length;i++){const a=full[i].box;assert(a[0]>=-1&&a[1]>=-1&&a[0]+a[2]<=state.size[0]+1&&a[1]+a[3]<=state.size[1]+1,'label stays inside map: '+full[i].id);for(let j=i+1;j<full.length;j++){const b=full[j].box,overlap=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]),vertical=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);assert(overlap<=.5||vertical<=.5,'text labels do not overlap: '+full[i].id+' / '+full[j].id);}}return full.length;}
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});result.browserVersion=browser.version();
 page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.atlasRenderReview=true;});
 for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.goto(origin+'/atlas/asia/south-asia/industry/',{waitUntil:'domcontentloaded'});await ready();
  assert.equal(await page.locator('.south-industry-products [data-industry-feature]').count(),13);assert.equal(await page.locator('[data-south-industry-sector]').count(),3);assert.equal(await page.locator('.asia-industry-regional-label').count(),45);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const named=await noLabelCollisions();result.viewports.push({viewport,namedLabels:named});
  let positions=await snapshot();await capture(viewport.width+'-initial');
  const layout=await page.evaluate(()=>{const box=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {map:box('.asia-map-frame'),reading:box('.asia-reading-panel'),stats:box('[data-south-industry-statistics]'),columns:getComputedStyle(document.querySelector('.south-industry-statistics-grid')).gridTemplateColumns.split(' ').length};});
  assert(layout.stats.top>=layout.map.bottom,'statistics are below the map');assert.equal(await page.locator('.asia-reading-panel .south-industry-observation').count(),0);if(viewport.width>=960){assert(layout.reading.left>=layout.map.right-1);assert.equal(layout.columns,3);}
  for(const group of catalog.groups){
   const button=page.locator('.south-industry-products [data-industry-feature="'+group.id+'"]');await button.click();await page.waitForFunction(id=>new URL(location.href).searchParams.get('topic')===id,group.id);fixed(positions,await snapshot(),viewport.width+' '+group.id);
   assert.equal(await page.locator('[data-south-industry-evidence]:visible').count(),3);assert.match(await page.locator('[data-south-statistics-title]').textContent(),new RegExp(group.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   // URL serialization preserves coordinates at 5 decimals and zoom at 3.
   // Only the reload allows its subpixel rounding; selection remains exact.
   const beforeReload=await snapshot();await page.reload({waitUntil:'domcontentloaded'});await ready();const restored=await snapshot();fixed(beforeReload,restored,viewport.width+' '+group.id+' URL reload',{urlRoundTrip:true});positions=restored;
   if(viewport.width===1440)await capture('1440-'+group.id);
  }
  for(const id of ['sc-south-resources','sc-south-manufacturing','sc-south-services']){await page.locator('[data-industry-feature="'+id+'"]:visible').click();await ready();fixed(positions,await snapshot(),viewport.width+' '+id);}
  await page.locator('[data-industry-feature="sc-overview"]:visible').click();await ready();
  if(viewport.width===1440){
   for(const site of sites){const marker=page.locator('[data-industry-site="'+site.id+'"]');await marker.evaluate(n=>n.click());await ready();const after=await snapshot();fixed(positions,after,'place '+site.id);assert.deepEqual(after.labels.filter(n=>n.selected).map(n=>n.id),[site.id]);assert.match(await page.locator('[data-south-industry-selected]').textContent(),new RegExp(site.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));}
   await page.locator('.south-industry-clear').click();await ready();fixed(positions,await snapshot(),'clear');await capture('1440-cleared');
   const keyboard=page.locator('[data-industry-feature="sc-rice"]:visible');await keyboard.focus();await keyboard.press('Enter');await page.waitForFunction(()=>new URL(location.href).searchParams.get('topic')==='sc-rice');assert.match(await page.locator('[data-industry-definition]').textContent(),/一次生産.*精米/);
   await page.locator('.atlas-tabs [data-field="agriculture"]').click();await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]').dataset.field==='agriculture');assert.equal(await page.locator('[data-south-industry-statistics]').isVisible(),false);
   await page.locator('.atlas-tabs [data-field="industry"]').click();await ready();
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(origin+'/atlas/asia/south-asia/industry/?topic=sc-overview&detail=unknown-site',{waitUntil:'domcontentloaded'});await ready();assert.equal(new URL(page.url()).searchParams.get('detail'),null);
 await page.goto(origin+'/atlas/asia/central-asia/industry/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');assert.equal(await page.locator('[data-south-industry-statistics]').count(),0);assert.equal(await page.locator('[data-sc-industry-topic] option[value="sc-rice"]').count(),0);assert.equal(await page.locator('[data-sc-industry-topic] option[value="sc-coal"]').count(),0);
 assert.deepEqual(errors,[]);result.status='passed';
}catch(error){result.status=browser?'failed':'blocked';result.error=error.stack;process.exitCode=1;console.error(error);if(page)await page.screenshot({path:path.join(out,'failure.png')});}
finally{await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log('SOUTH_ASIA_INDUSTRY_VERIFICATION '+JSON.stringify(result));await browser?.close();await new Promise(resolve=>server.close(resolve));}
