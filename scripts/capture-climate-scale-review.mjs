// Runs against this checkout's production build, with Chromium sandbox enabled.
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, stat} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {climatePlotCities} from '../tests/fixtures/climate-plot-cities.mjs';
const japaneseFonts=execFileSync('fc-list',[':lang=ja','family'],{encoding:'utf8'}).trim();
assert.ok(japaneseFonts,'PC captures require a Japanese-capable font');
const output=resolve(process.env.CLIMATE_REVIEW_OUTPUT??'review-artifacts/climate-scales');
const directory=resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.gz':'application/gzip'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\/?/,'');
  let file=resolve(directory,pathname||'index.html');
  if(!file.startsWith(directory+sep))throw new Error('Outside build');
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
});
await mkdir(output,{recursive:true});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const manifest={baseCommit:'ab2bf515',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',sandbox:true,japaneseFonts:japaneseFonts.split('\n'),fonts:execFileSync('fc-match',['-f','%{family}','sans-serif:lang=ja'],{encoding:'utf8'}).trim(),captures:[],errors:[],failures:[]};
const cases=[
 ['us','los-angeles','atlas/north-america/nature/?city=los-angeles'],
 ['canada','vancouver','atlas/north-america/canada/nature/?city=vancouver'],
 ['canada','iqaluit','atlas/north-america/canada/nature/?city=iqaluit'],
 ['mexico','mexico-city-tacubaya','atlas/north-america/mexico/nature/?city=mexico-city-tacubaya'],
 ['europe','london','atlas/europe/nature/?city=london'],
 ['asia','tokyo','atlas/asia/east-asia/nature/?city=tokyo'],
 ['asia','bangkok','atlas/asia/southeast-asia/nature/?city=bangkok'],
 ['asia','makassar','atlas/asia/southeast-asia/nature/?city=makassar'],
 ['asia','mumbai','atlas/asia/south-central-asia/nature/?city=mumbai'],
 ['westAsia','riyadh','atlas/west-asia/nature/?city=riyadh'],
 ['africa','toamasina','atlas/africa/?field=nature&topic=climate&view=distribution&city=toamasina'],
 ['latinLegacy','san-jose','atlas/latin-america/base-map/nature/?city=san-jose'],
 ['latinNature','san-jose','atlas/latin-america/nature/?case=station-san-jose&place=CRI'],
];
let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH??process.env.CLIMATE_CHROMIUM_PATH,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 for(const viewport of [{width:1440,height:1000},{width:1024,height:800}]){
  const context=await browser.newContext({viewport,locale:'ja-JP',timezoneId:'UTC',reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',err=>manifest.errors.push(String(err)));
  for(const [group,id,path]of cases){
   manifest.currentCase={group,id,path,viewport};
   try{
   await page.goto(`${origin}/insight-journal/${path}`,{waitUntil:'networkidle'});
   const city=climatePlotCities[group].find(c=>c.id===id);assert.ok(city,id);
   const chart=page.locator('svg[data-climate-plot]:visible').first();
   await chart.waitFor({state:'visible',timeout:20000});await chart.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
   const measured=await chart.evaluate(svg=>({min:Number(svg.dataset.temperatureMin),max:Number(svg.dataset.temperatureMax),rainMax:Number(svg.dataset.rainMax),months:[...svg.querySelectorAll('[data-climate-plot-month]')].map(n=>Number(n.textContent)),bars:[...svg.querySelectorAll('rect')].map(n=>({y:Number(n.getAttribute('y')),h:Number(n.getAttribute('height'))})),dots:[...svg.querySelectorAll('circle')].map(n=>Number(n.getAttribute('cy'))),rain0:Number(svg.querySelector('[data-rain-tick="0"]').getAttribute('y1')),rain100:Number(svg.querySelector('[data-rain-tick="100"]').getAttribute('y1')),temp0:Number(svg.querySelector('[data-temperature-tick="0"]').getAttribute('y1')),temp10:Number(svg.querySelector('[data-temperature-tick="10"]').getAttribute('y1')),top:Number(svg.dataset.plotTop),bottom:Number(svg.dataset.plotBottom),labels:[...svg.querySelectorAll('text')].map(n=>({text:n.textContent,rect:n.getBoundingClientRect().toJSON()})),bounds:svg.getBoundingClientRect().toJSON(),text:svg.textContent}));
   assert.deepEqual(measured.months,Array.from({length:12},(_,i)=>i+1));
   assert.equal(measured.bars.length,city.precipitationMm.filter(v=>v!==null).length,id);
   assert.equal(measured.dots.length,city.temperatureC.filter(v=>v!==null).length,id);
   assert.ok(measured.min<=Math.min(...city.temperatureC.filter(v=>v!==null)));assert.ok(measured.max>=Math.max(...city.temperatureC.filter(v=>v!==null)));
   assert.ok(measured.rainMax>=Math.max(...city.precipitationMm.filter(v=>v!==null)));
   measured.bars.forEach((b,i)=>{assert.ok(b.y>=measured.top-1e-7&&b.y+b.h<=measured.bottom+1e-7);assert.ok(Math.abs(b.h*100/(measured.rain0-measured.rain100)-city.precipitationMm.filter(v=>v!==null)[i])<1e-6,`${id}: actual selected rain value`);});
   measured.dots.forEach((y,i)=>{assert.ok(y>=measured.top-1e-7&&y<=measured.bottom+1e-7);assert.ok(Math.abs((measured.temp0-y)*10/(measured.temp0-measured.temp10)-city.temperatureC.filter(v=>v!==null)[i])<1e-6,`${id}: actual selected temperature value`);});
   for(const label of measured.labels.filter(label=>label.rect.width>0&&label.rect.height>0)){assert.ok(label.rect.x>=measured.bounds.x-1&&label.rect.right<=measured.bounds.right+1,`${id}: label within SVG ${label.text}`);}
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${id}: page overflow`);
   const name=`${viewport.width}-${group}-${id}`;
   await chart.screenshot({path:resolve(output,`${name}-plot.png`)});await page.screenshot({path:resolve(output,`${name}-page.png`)});
   manifest.captures.push({name,viewport,path,city:id,temperatureValues:city.temperatureC,rainValues:city.precipitationMm,measured});
   }catch(error){
    manifest.failures.push({case:manifest.currentCase,failure:String(error)});
    await page.screenshot({path:resolve(output,`${viewport.width}-${group}-${id}-failure.png`)});
   }
  }
  await context.close();
 }
 assert.deepEqual(manifest.errors,[]);
 if(manifest.failures.length)throw new Error(JSON.stringify(manifest.failures));
 manifest.status='passed';
 console.log(`::notice title=Climate scale review::${JSON.stringify({captures:manifest.captures.length,sandbox:manifest.sandbox,fonts:manifest.fonts,japaneseFonts:manifest.japaneseFonts,viewports:[1440,1024]})}`);
}catch(error){
 manifest.status='failed';manifest.failure=String(error);
 // Public test diagnostics also appear in the check annotations, independently
 // of artifact delivery; they contain no credentials or external-app data.
 const diagnostic=JSON.stringify({case:manifest.currentCase,failure:manifest.failure,completed:manifest.captures.map(c=>c.name),errors:manifest.errors}).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
 console.error(`::error title=Climate scale review::${diagnostic}`);
 throw error;
}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');}
console.log(`Climate scales: ${manifest.captures.length} PC captures passed.`);
