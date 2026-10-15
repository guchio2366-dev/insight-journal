import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const baseline=process.argv.includes('--baseline'),localBrowser=process.env.CENTRAL_LOCAL_BROWSER==='1';
const output=path.resolve(process.env.CENTRAL_READABILITY_OUTPUT??`/tmp/central-asia-readability-${baseline?'before':'after'}`);
const dist=path.resolve('dist'),base='/insight-journal';
const server=createServer(async(req,res)=>{try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(!pathname.startsWith(base+'/')){res.writeHead(404).end();return;}
 const file=path.resolve(dist,'.'+pathname.slice(base.length)+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.gz':'application/gzip','.woff2':'font/woff2'};
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));
}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',chromiumSandbox:!localBrowser,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
const page=await browser.newPage({deviceScaleFactor:1}),errors=[],result={baseline,baseSha:'6f3d4a27c17bf205220d0eb44563975af2bcbdad',browser:{chromiumSandbox:!localBrowser,deviceScaleFactor:1},views:[],checks:[]};
result.workingTree='uncommitted local changes';result.sourceSha256={};for(const file of ['src/data/atlas/central-asia-industry.ts','src/lib/atlas-central-asia-industry.ts','src/scripts/atlas-central-asia-industry.ts','src/styles/atlas-central-asia-industry.css','src/components/atlas/asia/CentralAsiaIndustryPage.astro'])result.sourceSha256[file]=createHash('sha256').update(await readFile(file)).digest('hex');
page.on('pageerror',e=>errors.push(e.message));
const settle=async()=>{await page.waitForFunction(()=>document.querySelector('[data-central-industry]')?.dataset.centralReady==='true');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});};
const view=()=>page.evaluate(()=>{
 const root=document.querySelector('[data-central-industry]'),stage=root.querySelector('[data-central-map-frame]').getBoundingClientRect(),state=root.centralIndustryView;
 const labels=[...root.querySelectorAll('[data-central-label-industry]')].map(node=>{const r=node.getBoundingClientRect();return {industry:node.dataset.centralLabelIndustry,sites:node.dataset.centralLabelSites,text:node.textContent,tag:node.tagName,hidden:node.hidden,rect:[r.x-stage.x,r.y-stage.y,r.width,r.height]};});
 const lines=[...root.querySelectorAll('[data-central-correspondence]')].map(node=>({industry:node.dataset.industry,site:node.dataset.centralCorrespondence,length:Math.hypot(Number(node.getAttribute('x2'))-Number(node.getAttribute('x1')),Number(node.getAttribute('y2'))-Number(node.getAttribute('y1'))),visible:node.style.display!=='none'}));
 return {sector:state.sector,frame:state.frame,map:[stage.width,stage.height],labels,lines,markers:[...root.querySelectorAll('[data-central-marker]')].filter(node=>node.style.display!=='none').map(node=>node.dataset.centralMarker),labelAreaRatio:labels.filter(l=>!l.hidden).reduce((sum,l)=>sum+l.rect[2]*l.rect[3],0)/(stage.width*stage.height),labelButtons:root.querySelectorAll('button[data-central-label-industry]').length,incomplete:root.dataset.labelsIncomplete??null,legend:root.querySelector('.central-map-key').innerText,overflow:document.documentElement.scrollWidth>innerWidth};
});
const geometry=v=>({frame:v.frame,map:v.map,labels:v.labels.filter(label=>!label.hidden).map(({sites,rect,text})=>({sites,rect,text})),lines:v.lines.map(({site,length})=>({site,length}))});
try{
 for(const [width,height]of [[1920,1080],[1440,1000],[1024,900],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.goto(`http://127.0.0.1:${server.address().port}${base}/atlas/asia/central-asia/industry/`,{waitUntil:'networkidle'});await settle();
  const config=JSON.parse(await page.locator('[data-central-config]').textContent());
  for(const sector of ['resources','manufacturing','services']){
   await page.locator(`[data-central-sector="${sector}"]`).click();await settle();const initial=await view(),expected=config.industrySites.filter(site=>site.sectors.includes(sector));
   assert.deepEqual([...initial.markers].sort(),expected.map(site=>site.id).sort(),'Only the active map supplies markers');assert.equal(initial.overflow,false);if(!baseline)assert.equal(initial.incomplete,null,'Every compact annotation fits');
   const boxes=initial.labels.filter(label=>!label.hidden);for(const [i,label]of boxes.entries()){const [x,y,w,h]=label.rect;assert(x>=0&&y>=0&&x+w<=initial.map[0]+1&&y+h<=initial.map[1]+1);for(const other of boxes.slice(i+1)){const [a,b,c,d]=other.rect;assert(!(x<a+c&&x+w>a&&y<b+d&&y+h>b),'Annotations do not overlap');}}
   if(!baseline){assert.equal(initial.labelButtons,0,'No industry picker cards live on the map');assert(initial.labelAreaRatio<.12);assert(initial.lines.every(line=>line.length<=40.1));assert(initial.labels.every(label=>!/[0-9]|兆|百万|千t/.test(label.text)),'Quantities and periods stay in the sourced detail and statistics');if(sector==='resources')assert(expected.every(site=>site.kind!=='processing'));assert.equal(await page.locator(`[data-central-map-key-sector="${sector}"]:visible`).count(),1);assert.equal(await page.locator('[data-central-map-key-sector]:visible').count(),1);}
   const file=`${width}-${sector}.png`;await page.locator('[data-central-map-frame]').screenshot({path:path.join(output,file)});await page.screenshot({path:path.join(output,`${width}-${sector}-page.png`)});result.views.push({width,height,file,...initial});
   if(!baseline){
    for(const button of await page.locator(`[data-central-choices="${sector}"] [data-central-choice]`).all()){
     const id=await button.getAttribute('data-central-choice');await button.click();await settle();assert.deepEqual(geometry(await view()),geometry(initial),'Industry selection preserves all annotation positions');assert(await page.locator(`[data-central-metric-industry="${id}"]:visible`).count()>0);await page.locator('[data-central-clear]').click();
    }
    const site=expected[0];await page.locator('#central-industry-locations').evaluate(node=>node.open=true);await page.locator(`[data-central-site-choice="${site.id}"]`).click();await settle();assert.deepEqual(geometry(await view()),geometry(initial));await page.locator('[data-central-only]').check();const filtered=await view();assert(filtered.markers.every(id=>expected.find(site=>site.id===id)?.industry===site.industry));assert.deepEqual(geometry(filtered),geometry({...initial,labels:initial.labels.filter(label=>label.industry===site.industry)}));await page.reload({waitUntil:'networkidle'});await settle();assert.equal((await page.locator('[data-central-industry]').evaluate(root=>root.centralIndustryView)).site,site.id);await page.locator('[data-central-clear]').click();await page.goBack();await settle();assert.equal((await page.locator('[data-central-industry]').evaluate(root=>root.centralIndustryView)).site,site.id);await page.goForward();await settle();
   }
  }
 }
 assert.deepEqual(errors,[]);result.checks.push('Active-sector marker sets','annotation bounds and non-overlap','all adopted items retained','selection/clear/only/reload/history keep geometry','no JS errors');
 await writeFile(path.join(output,'review.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({output,views:result.views.length,baseline},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
