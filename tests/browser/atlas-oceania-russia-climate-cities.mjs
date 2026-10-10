// Region-only production acceptance, existing Chrome, sandbox enabled, no downloads.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const output=resolve(process.env.REGIONAL_CLIMATE_REVIEW_OUTPUT??'/tmp/oceania-russia-climate-cities');
const dir=resolve('dist');const cities=JSON.parse(await readFile('src/data/atlas/oceania-russia-climate-cities.json','utf8'));
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);assert.ok(p.startsWith('/insight-journal/'));p=p.slice('/insight-journal/'.length);if(p.endsWith('/'))p+='index.html';const file=resolve(dir,p);assert.ok(file.startsWith(dir+sep));res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream'});res.end(await readFile(file));}catch{if(!res.headersSent)res.writeHead(404);res.end('Missing local file');}
});
await mkdir(output,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/insight-journal/`;
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile('dist/_release.json','utf8')),sandbox:true,fonts:execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}).trim(),status:'running',checks:[],screenshots:[],errors:[]};
let browser,page;
try{
 assert.ok(report.fonts,'Japanese fonts required');if(process.env.REGION_REVIEW_EXPECTED_HEAD){assert.equal(report.head,process.env.REGION_REVIEW_EXPECTED_HEAD);assert.equal(report.build.commitSha,report.head);}
 browser=await chromium.launch({executablePath:process.env.REGION_REVIEW_CHROME_PATH??'/usr/bin/chromium',chromiumSandbox:true,headless:true,ignoreDefaultArgs:['--disable-self-xss-warnings']});report.browser=browser.version();
 const context=await browser.newContext({locale:'ja-JP',reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));
 const capture=async(name)=>{const file=resolve(output,name+'.png');await page.screenshot({path:file,fullPage:false});report.screenshots.push({file:name+'.png',sha256:createHash('sha256').update(await readFile(file)).digest('hex')});};
 for(const [width,height] of [[1440,900],[1024,768]]){
  await page.setViewportSize({width,height});
  for(const region of ['oceania','russia']){
   await page.goto(base+`atlas/${region}/nature/?review=climate#atlas`,{waitUntil:'networkidle'});
   const root=page.locator(`[data-${region}-learning]`),panel=root.locator('[data-regional-climate-reading]'),map=root.locator('[data-primary-map]>svg');
   await root.waitFor();await page.waitForFunction(r=>document.querySelector(`[data-${r}-learning]`)?.dataset[r+'Ready']==='true',region);
   await page.evaluate(()=>document.fonts.ready);await root.locator('[data-primary-map] image').evaluateAll(items=>Promise.all(items.map(el=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=el.getAttribute('href');}))));
   const frame=await map.getAttribute('viewBox'),baseline=new URL(page.url());assert.equal(await panel.isVisible(),false);
   assert.ok((await root.locator('[data-theme-title]').textContent()).includes('自然環境'));
   const names=await map.locator('[data-regional-climate-city] text').evaluateAll(items=>items.map(el=>{const r=el.getBoundingClientRect();return {name:el.textContent,x:r.x,y:r.y,w:r.width,h:r.height};}));
   for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){const a=names[i],b=names[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`City labels overlap: ${width}/${region}/${a.name}/${b.name}`);}
   await capture(`${width}-${region}-initial`);
   for(const city of cities.filter(c=>c.region===region)){
    const marker=map.locator(`[data-regional-climate-city="${city.id}"]`);await marker.locator('text').click();
    await panel.waitFor({state:'visible'});assert.equal(await panel.locator('h2').textContent(),`${city.name}－${city.countryName}の雨温図`);assert.equal(await map.getAttribute('viewBox'),frame);assert.equal(await marker.getAttribute('aria-pressed'),'true');
    const selected=new URL(page.url());for(const key of ['place','scope','layer','theme','compare','reading'])assert.equal(selected.searchParams.get(key),baseline.searchParams.get(key));assert.equal(selected.searchParams.get('review'),'climate');assert.equal(selected.hash,'#atlas');
    const measurements=await panel.evaluate((pane,c)=>{
     const svg=pane.querySelector('[data-climate-plot]'),tmin=Number(svg.dataset.temperatureMin),tmax=Number(svg.dataset.temperatureMax),pmax=Number(svg.dataset.rainMax),top=Number(svg.dataset.plotTop),bottom=Number(svg.dataset.plotBottom);
     const bars=[...svg.querySelectorAll('.atlas-climate-bar')].map(el=>({value:(bottom-Number(el.getAttribute('y')))/(bottom-top)*pmax,y:Number(el.getAttribute('y')),height:Number(el.getAttribute('height'))}));
     const dots=[...svg.querySelectorAll('.atlas-climate-dot')].map(el=>({value:tmin+(bottom-Number(el.getAttribute('cy')))/(bottom-top)*(tmax-tmin),y:Number(el.getAttribute('cy'))}));
     const view=svg.viewBox.baseVal,labels=[...svg.querySelectorAll('text')].map(el=>{const b=el.getBBox();return {label:el.textContent,x:b.x,y:b.y,w:b.width,h:b.height};});
     const bounds=pane.getBoundingClientRect(),chart=svg.getBoundingClientRect(),detail=pane.querySelector('.regional-climate-details').getBoundingClientRect(),heading=pane.querySelector('h2').getBoundingClientRect();
     return {city:c.id,tmin,tmax,pmax,top,bottom,bars,dots,labels,view:{width:view.width,height:view.height},months:[...svg.querySelectorAll('[data-climate-plot-month]')].map(e=>Number(e.dataset.climatePlotMonth)),rainTicks:[...svg.querySelectorAll('[data-rain-tick]')].map(e=>({value:Number(e.dataset.rainTick),y:Number(e.getAttribute('y1'))})),temperatureTicks:[...svg.querySelectorAll('[data-temperature-tick]')].map(e=>({value:Number(e.dataset.temperatureTick),y:Number(e.getAttribute('y1'))})),pane:{top:bounds.top,bottom:bounds.bottom,left:bounds.left,right:bounds.right},chart:{top:chart.top,bottom:chart.bottom},details:{height:detail.height,top:detail.top,bottom:detail.bottom},heading:{top:heading.top,bottom:heading.bottom},pageWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,viewportHeight:innerHeight};
    },city);
    assert.equal(measurements.bars.length,12);assert.equal(measurements.dots.length,12);assert.deepEqual(measurements.months,Array.from({length:12},(_,i)=>i+1));
    city.precipitationMm.forEach((p,i)=>{assert.ok(Math.abs(measurements.bars[i].value-p)<.01);assert.ok(measurements.bars[i].y>=measurements.top&&measurements.bars[i].y<=measurements.bottom);});
    city.temperatureC.forEach((t,i)=>{assert.ok(Math.abs(measurements.dots[i].value-t)<.01);assert.ok(measurements.dots[i].y>=measurements.top&&measurements.dots[i].y<=measurements.bottom);});
    for(const [key,step] of [['rainTicks',100],['temperatureTicks',10]]){const ticks=measurements[key];for(let i=1;i<ticks.length;i++){assert.equal(ticks[i].value-ticks[i-1].value,step);if(i>1)assert.ok(Math.abs((ticks[i].y-ticks[i-1].y)-(ticks[1].y-ticks[0].y))<.01);}}
    for(const label of measurements.labels)assert.ok(label.x>=-.5&&label.y>=-.5&&label.x+label.w<=measurements.view.width+.5&&label.y+label.h<=measurements.view.height+.5,`${city.id}: clipped SVG label ${JSON.stringify(label)}`);
    const layout=JSON.stringify({width,height,city:city.id,pane:measurements.pane,chart:measurements.chart,heading:measurements.heading,details:measurements.details,pageWidth:measurements.pageWidth});
    assert.ok(measurements.pane.top>=0&&measurements.pane.bottom<=height+1,`Right pane outside viewport: ${layout}`);assert.ok(measurements.chart.top>=measurements.heading.bottom-1,`Chart above heading: ${layout}`);assert.ok(measurements.details.height>=85,`Definition pane too short: ${layout}`);assert.ok(measurements.details.bottom<=height+1,`Details outside viewport: ${layout}`);assert.ok(measurements.pageWidth<=width+1,`Page overflow: ${layout}`);
    report.checks.push({region,width,height,station:city.stationId,coordinates:city.coordinates,period:city.normalPeriod,temperatureC:city.temperatureC,precipitationMm:city.precipitationMm,frame,...measurements});
    await capture(`${width}-${region}-${city.id}`);
    await panel.locator('[data-clear-climate-city]').click();assert.equal(await panel.isVisible(),false);assert.equal(await map.getAttribute('viewBox'),frame);assert.equal(new URL(page.url()).searchParams.has('city'),false);
    await page.goBack();await panel.waitFor({state:'visible'});assert.equal(await panel.locator('h2').textContent(),`${city.name}－${city.countryName}の雨温図`);assert.equal(await map.getAttribute('viewBox'),frame);
    await page.goForward();await panel.waitFor({state:'hidden'});assert.equal(await map.getAttribute('viewBox'),frame);
   }
   const first=cities.find(c=>c.region===region);const marker=map.locator(`[data-regional-climate-city="${first.id}"]`);await marker.focus();await page.keyboard.press('Enter');await panel.waitFor({state:'visible'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-regional-climate-city')),first.id);await page.reload({waitUntil:'networkidle'});assert.equal(await panel.locator('h2').textContent(),`${first.name}－${first.countryName}の雨温図`);assert.equal(await map.getAttribute('viewBox'),frame);await panel.locator('[data-clear-climate-city]').click();await capture(`${width}-${region}-cleared`);
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';console.log(`Climate cities: ${report.checks.length} selections / 2 PC sizes, ${report.screenshots.length} screenshots; sandbox enabled.`);
}catch(error){report.status='failed';report.errors.push(String(error));console.error(`::error::${String(error)}`);if(page)await page.screenshot({path:resolve(output,'failure.png'),fullPage:false}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(resolve(output,'manifest.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(r=>server.close(r));}
