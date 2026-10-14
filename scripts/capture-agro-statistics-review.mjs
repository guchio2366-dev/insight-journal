import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const dist=resolve('dist'),out=resolve('review-artifacts/agro-statistics');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let path=resolve(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));if(!path.startsWith(dist+sep))throw Error('outside build');if((await stat(path)).isDirectory())path=resolve(path,'index.html');res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sandbox:true,status:'running',cases:[],operations:[],errors:[]};
const origin=`http://127.0.0.1:${server.address().port}/insight-journal`;
const cases=[
 ['canada-beef','/atlas/north-america/canada/agriculture/beef/','CAN','cattle-meat'],
 ['canada-wheat','/atlas/north-america/canada/agriculture/wheat/','CAN',null],
 ['canada-forestry','/atlas/north-america/canada/agriculture/forestry/','CAN',null],
 ['east-rice','/atlas/asia/east-asia/agriculture/?topic=rice&place=CHN','CHN','rice-production'],
 ['southeast-forest','/atlas/asia/southeast-asia/agriculture/?topic=forest&place=IDN','IDN','roundwood-production'],
 ['south-wheat','/atlas/asia/south-asia/agriculture/?topic=wheat&place=IND','IND','wheat-production'],
 ['central-wheat','/atlas/asia/central-asia/agriculture/?topic=wheat&place=KAZ','KAZ','wheat-production'],
 ['europe-wheat','/atlas/europe/agriculture/?layer=wheat&place=FRA','FRA','wheat-production'],
 ['west-forest','/atlas/west-asia/agriculture/?topic=forest&country=TUR','TUR','roundwood-production'],
 ['latin-soybean','/atlas/latin-america/agriculture/?layer=soyb&place=BRA','BRA','soybean-production'],
 ['africa-cattle','/atlas/africa/?field=agriculture&topic=livestock&livestock=cattle&place=KEN&overview=0','KEN','cattle-meat'],
 ['oceania-cattle','/atlas/oceania/agriculture/?layer=cattle&place=AUS&scope=country','AUS','cattle-meat'],
 ['russia-wheat','/atlas/russia/agriculture/','RUS','wheat-production'],
 ['russia-forest','/atlas/russia/agriculture/forestry/','RUS','roundwood-production'],
];
let browser;
try{
 assert.equal(JSON.parse(await readFile(resolve(dist,'_release.json'),'utf8')).commitSha,report.head);
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH});
 for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]){
  const context=await browser.newContext({viewport,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(String(error)));
  for(const [name,path,country,series] of cases){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   const host=page.locator('[data-agro-statistics]');await host.waitFor({state:'visible'});
   await page.waitForFunction(()=>{const node=document.querySelector('[data-agro-statistics]');return !node.hidden&&node.querySelector('[data-agro-content]')?.children.length>0&&!node.querySelector('[data-agro-status]').textContent.includes('読み込んで');});
   if(series){await host.locator(`[data-agro-country="${country}"][data-agro-series="${series}"]`).waitFor();}
   const measured=await host.evaluate(el=>{const b=el.getBoundingClientRect(),columns=[...el.querySelectorAll('.agro-columns>section')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,font:parseFloat(getComputedStyle(n.querySelector('p:not(.agro-meta)')??n).fontSize)};}),rail=document.querySelector('.atlas-news'),r=rail?.getBoundingClientRect(),map=document.querySelector('[data-map-surface],.canada-map-frame,.forest-map-stage,[data-primary-map]')?.getBoundingClientRect();return{x:b.x,w:b.width,y:b.y,columns,rail:r?{x:r.x,right:r.right,w:r.width,bottom:r.bottom}:null,map:map?{x:map.x,y:map.y,bottom:map.bottom}:null,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   console.log(JSON.stringify({name,viewport,measured}));
   assert.equal(measured.columns.length,3,`${name}: three columns`);
   assert.equal(measured.overflow,false,`${name}: page overflow`);
   assert.ok(measured.columns.every(c=>c.font>=13),`${name}: readable prose`);
   if(viewport.width>=960){assert.ok(Math.max(...measured.columns.map(c=>c.y))-Math.min(...measured.columns.map(c=>c.y))<2,`${name}: common row`);if(measured.rail&&measured.rail.w<viewport.width*.5)assert.ok(measured.x>=measured.rail.right-1,`${name}: keep statistics outside news width`);}
   else assert.ok(measured.columns[1].y>measured.columns[0].y,`${name}: mobile stacking`);
   if(measured.map)assert.ok(measured.y>=measured.map.bottom-1,`${name}: statistics below map`);
   await host.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-${name}.png`),fullPage:true});
   report.cases.push({name,path,viewport,...measured});
   if(name==='southeast-forest'){
    await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');await host.locator('[data-agro-series="sawnwood-production"]').waitFor();
    await host.locator('.agro-definitions>summary').click();assert.ok(await host.locator('.agro-definitions table').isVisible());
    report.operations.push({name,viewport,seriesChange:true,definitionToggle:true});
   }
  }
  // Region overview must show partial coverage, not Indonesia as the region.
  await page.goto(origin+'/atlas/asia/southeast-asia/agriculture/',{waitUntil:'domcontentloaded'});
  const regional=page.locator('[data-south-central-world-share]');await regional.waitFor();await page.waitForFunction(()=>document.querySelector('[data-south-central-world-share]')?.textContent.includes('10/11'));
  assert.match(await regional.innerText(),/10\/11.*24\.02%/);assert.equal(await regional.locator('svg').count(),0);
  report.operations.push({name:'southeast-overview',viewport,partialCoverage:true});
  await page.goto(origin+'/atlas/asia/east-asia/agriculture/?topic=wheat&place=JPN',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.hidden);report.operations.push({name:'japan-excluded',viewport,hidden:true});
  await context.close();
 }
 // The unmodified US is the visual baseline, captured from this exact build.
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(origin+'/atlas/north-america/agriculture/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-crop-select="corn"]').click();await page.locator('[data-agri-statistics]').waitFor({state:'visible'});
 await page.screenshot({path:resolve(out,'1440-us-baseline.png'),fullPage:true});
 report.operations.push({name:'us-baseline',cornSelection:true,sharedNationalHost:await page.locator('[data-agro-statistics]').count()});
 report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({head:report.head,status:report.status,cases:report.cases.length,operations:report.operations.length,errors:report.errors}));
