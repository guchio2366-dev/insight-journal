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
const publicOrigin=process.env.AGRO_PUBLIC_ORIGIN?.replace(/\/$/,'')||undefined;
const origin=publicOrigin??`http://127.0.0.1:${server.address().port}/insight-journal`;
const reviewUrl=(path)=>{const url=new URL(origin+path);if(publicOrigin)url.searchParams.set('__review_sha',report.head);return url.href;};
const cases=[
 ['canada-beef','/atlas/north-america/canada/agriculture/beef/','CAN','cattle-meat'],
 ['canada-wheat','/atlas/north-america/canada/agriculture/wheat/','CAN',null],
 ['canada-forestry','/atlas/north-america/canada/agriculture/forestry/','CAN',null],
 ['mexico-corn','/atlas/north-america/mexico/agriculture/?agriItem=corn&reading=item','MEX','maize-production'],
 ['east-rice','/atlas/asia/east-asia/agriculture/?topic=rice&place=CHN','CHN','rice-production'],
 ['east-soybean-quantity','/atlas/asia/east-asia/agriculture/?topic=soybean&place=CHN','CHN','soybean-production'],
 ['southeast-forest','/atlas/asia/southeast-asia/agriculture/?topic=forest&place=IDN','IDN','roundwood-production'],
 ['south-wheat','/atlas/asia/south-asia/agriculture/?topic=wheat&place=IND','IND','wheat-production'],
 ['central-wheat','/atlas/asia/central-asia/agriculture/?topic=wheat&place=KAZ','KAZ','wheat-production'],
 ['europe-wheat','/atlas/europe/agriculture/?layer=wheat&place=FRA','FRA','wheat-production'],
 ['west-forest','/atlas/west-asia/agriculture/?topic=forest&country=TUR','TUR','roundwood-production'],
 ['latin-soybean','/atlas/latin-america/agriculture/?layer=soyb&place=BRA','BRA','soybean-production'],
 ['africa-cattle','/atlas/africa/?field=agriculture&topic=livestock&livestock=cattle&place=KEN&overview=0','KEN','cattle-meat'],
 ['oceania-cattle','/atlas/oceania/agriculture/?layer=cattle&place=AUS&scope=country','AUS','cattle-meat'],
 ['south-rice','/atlas/asia/south-asia/agriculture/?topic=rice&place=IND','IND','rice-production'],
 ['west-wheat','/atlas/west-asia/agriculture/?topic=wheat&country=TUR','TUR','wheat-production'],
 ['europe-germany-forest','/atlas/europe/agriculture/?layer=forest&place=DEU','DEU','roundwood-production'],
 ['europe-finland-forest','/atlas/europe/agriculture/?layer=forest&place=FIN','FIN','roundwood-production'],
 ['europe-britain-forest','/atlas/europe/agriculture/?layer=forest&place=GBR','GBR','roundwood-production'],
 ['russia-wheat','/atlas/russia/agriculture/','RUS','wheat-production'],
 ['russia-forest','/atlas/russia/agriculture/forestry/','RUS','roundwood-production'],
];
let browser;
try{
 assert.equal(JSON.parse(await readFile(resolve(dist,'_release.json'),'utf8')).commitSha,report.head);
 if(publicOrigin){const response=await fetch(reviewUrl('/_release.json'),{cache:'no-store'});assert.ok(response.ok,'public release HTTP '+response.status);const release=await response.json();assert.equal(release.commitSha,report.head,'public release must match reviewed commit');report.production={url:publicOrigin,release};}
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH});
 for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:390,height:844}]){
  const context=await browser.newContext({viewport,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',error=>report.errors.push(String(error)));
  for(const [name,path,country,series] of cases){
   await page.goto(reviewUrl(path),{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const mexico=name==='mexico-corn',host=page.locator(mexico?'[data-mexico-agriculture-three-columns="corn"]':'[data-agro-statistics]');await host.waitFor({state:'visible'});
   if(mexico)await page.waitForFunction(()=>document.querySelector('[data-mexico-agriculture-atlas]')?.dataset.agricultureReady==='true');
   else await page.waitForFunction(()=>{const node=document.querySelector('[data-agro-statistics]');return !node.hidden&&node.dataset.agroReady==='true'&&node.querySelector('[data-agro-content]')?.children.length>0&&!node.querySelector('[data-agro-status]').textContent.includes('読み込んで');});
   if(series&&!mexico){await host.locator(`[data-agro-country="${country}"][data-agro-series="${series}"]`).waitFor();}
   const measured=await host.evaluate(el=>{const b=el.getBoundingClientRect(),columns=[...el.querySelectorAll('.agro-columns>section')].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,font:parseFloat(getComputedStyle(n.querySelector('p:not(.agro-meta)')??n).fontSize)};}),rail=document.querySelector('.atlas-news'),r=rail?.getBoundingClientRect(),map=(document.querySelector('[data-canada-census-stage]')??document.querySelector('[data-map-surface],.eu-map-stage,.africa-map-frame,[data-latin-agriculture-map-container],[data-forestry-stage],.forest-map-stage,[data-primary-map],[data-agriculture-map]'))?.getBoundingClientRect();return{x:b.x,w:b.width,y:b.y,columns,rail:r?{x:r.x,right:r.right,w:r.width,bottom:r.bottom}:null,map:map?{x:map.x,y:map.y,bottom:map.bottom}:null,overflow:document.documentElement.scrollWidth>innerWidth+1,statisticsOverflow:el.scrollWidth>el.clientWidth+1,overflowElements:[...document.querySelectorAll('body *')].filter(node=>node instanceof HTMLElement&&node.checkVisibility?.({visibilityProperty:true})&&!node.closest('details:not([open])')&&!node.closest('.agro-table-scroll')).flatMap(node=>{const r=node.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1)?[{tag:node.tagName,class:node.className?.baseVal??node.className,x:r.x,right:r.right,w:r.width,inNewStatistics:el.contains(node)}]:[];}).slice(0,12)};});
   console.log(JSON.stringify({name,viewport,measured}));
   if(mexico)measured.columns=await host.locator(':scope>section').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,font:parseFloat(getComputedStyle(n.querySelector('p:not(.agro-meta)')??n).fontSize)};}));
   assert.equal(measured.columns.length,3,`${name}: three columns`);
   assert.deepEqual(await host.locator(mexico?':scope>section':'.agro-columns>section').evaluateAll(nodes=>nodes.map(n=>n.dataset.agroStage)),['production','use','destinations'],`${name}: production → use/export → destinations`);
   assert.equal(measured.statisticsOverflow,false,`${name}: statistics overflow`);
   if(measured.overflow)report.errors.push({kind:'page-overflow',name,viewport,elements:measured.overflowElements});
   assert.ok(measured.columns.every(c=>c.font>=13),`${name}: readable prose`);
   if(viewport.width>=960){assert.ok(Math.max(...measured.columns.map(c=>c.y))-Math.min(...measured.columns.map(c=>c.y))<2,`${name}: common row`);if(measured.rail&&measured.rail.w<viewport.width*.5)assert.ok(measured.x>=measured.rail.right-1,`${name}: keep statistics outside news width`);}
   else assert.ok(measured.columns[1].y>measured.columns[0].y,`${name}: mobile stacking`);
   if(measured.map)assert.ok(measured.y>=measured.map.bottom-1,`${name}: statistics below map`);
   await host.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`${viewport.width}-${name}.png`),fullPage:true});
   report.cases.push({name,path,viewport,...measured});
   if(mexico){assert.match(await host.locator('[data-agro-stage="production"]').innerText(),/23\.1.*1,235\.03/s);assert.match(await host.locator('[data-agro-stage="use"]').innerText(),/0\.03.*0\.13%.*49\.1/s);report.operations.push({name,viewport,samePublisherYear:true,nationalNotRegional:true});}
   // Different-year/unit references are intentionally collapsed in the primary
   // quantity flow. Open them explicitly to test the retained reference tools.
   for(const details of await host.locator('.agro-other-reference').all())await details.locator(':scope>summary').click();
   if(name==='east-rice'){assert.ok(await host.locator('[data-agro-existing-trade] .east-pie').count()>0);assert.match(await host.locator('[data-agro-existing-trade]').innerText(),/2023.*(?:米ドル|金額)/s);report.operations.push({name,viewport,retainedPartnerPie:true});}
   if(name==='east-soybean-quantity'){assert.equal(await host.locator('[data-agro-quantity-flow="2023"]').count(),1);assert.match(await host.locator('[data-agro-stage="use"]').innerText(),/71,398\.1.*0\.34%/s);assert.match(await host.locator('[data-agro-stage="destinations"]').innerText(),/Korea, Rep\..*40,404.*Japan.*16,511\.8/s);await host.locator('[data-agro-stage="destinations"] summary').click();assert.equal(await host.locator('[data-agro-stage="destinations"] tbody tr').count(),42);report.operations.push({name,viewport,sameYearQuantity:true,allForeignPartners:true,sharedExportDenominator:true});}
   if(name==='europe-wheat'){assert.equal(await host.locator('.agro-partner-pie').count(),1);assert.match(await host.locator('[data-agro-existing-trade]').innerText(),/2021年.*current USD/s);report.operations.push({name,viewport,regionalMoneyReference:true});}
   if(name==='south-rice'){assert.equal(await host.locator('.sc-flow-pie').count(),1);assert.match(await host.locator('[data-agro-existing-trade]').innerText(),/5,242,182t/);report.operations.push({name,viewport,basmatiReference:true});}
   if(name==='west-wheat'){const link=host.locator('[data-agro-reference-link]');await link.click();assert.ok(await page.locator('#agro-reference-west-wheat').isVisible());report.operations.push({name,viewport,regionalPartnerReference:true});}
   if(name==='russia-wheat'){const world=host.locator('[data-agro-stage="production"]');assert.match(await world.innerText(),/公式値限定/);assert.equal(await world.locator('.agro-world-pie').count(),0);assert.ok(!(await world.innerText()).includes('82,588,000'));assert.ok(!(await world.locator('.agro-trend').getAttribute('aria-label')).includes('連続'));report.operations.push({name,viewport,unofficialExcluded:true});}
   if(name==='europe-germany-forest'){assert.ok(await host.locator('[data-agro-existing-supply] .agro-band').count()>=3);assert.match(await host.locator('[data-agro-existing-supply]').innerText(),/在庫未調整/);report.operations.push({name,viewport,sourceSupplyAndUses:true});}
   if(name==='europe-finland-forest'){assert.match(await host.locator('[data-agro-existing-supply]').innerText(),/62,655.*樹皮あり/s);report.operations.push({name,viewport,firstUseSeparate:true});}
   if(name==='europe-britain-forest'){await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');await host.locator('[data-agro-series="sawnwood-production"]').waitFor();await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.dataset.agroReady==='true');await host.locator('[data-agro-stage="use"]>.agro-other-reference>summary').click();assert.match(await host.locator('[data-agro-existing-supply]').innerText(),/25,000m³以上/);report.operations.push({name,viewport,restrictedMarketShares:true});}
   if(name==='southeast-forest'){
    await host.locator('[data-agro-series-select]').selectOption('sawnwood-production');await host.locator('[data-agro-series="sawnwood-production"]').waitFor();
    await host.locator('.agro-definitions>summary').click();assert.ok(await host.locator('.agro-definitions table').isVisible());
    report.operations.push({name,viewport,seriesChange:true,definitionToggle:true});
   }
  }
  // Region overview must show partial coverage, not Indonesia as the region.
  await page.goto(reviewUrl('/atlas/asia/southeast-asia/agriculture/'),{waitUntil:'domcontentloaded'});
  const regional=page.locator('[data-south-central-world-share]');await regional.waitFor();await page.waitForFunction(()=>document.querySelector('[data-south-central-world-share]')?.textContent.includes('10/11'));
  assert.match(await regional.innerText(),/10\/11.*24\.02%/);assert.equal(await regional.locator('svg').count(),0);
  report.operations.push({name:'southeast-overview',viewport,partialCoverage:true});
  await page.goto(reviewUrl('/atlas/asia/east-asia/agriculture/?topic=wheat&place=JPN'),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-agro-statistics]')?.hidden);report.operations.push({name:'japan-excluded',viewport,hidden:true});
  await context.close();
 }
 // The unmodified US is the visual baseline, captured from this exact build.
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(reviewUrl('/atlas/north-america/agriculture/'),{waitUntil:'domcontentloaded'});
 await page.locator('[data-crop-select="corn"]').click();await page.locator('[data-agri-statistics]').waitFor({state:'visible'});
 const us=page.locator('[data-stat-panel="corn"]');
 const order=await us.evaluate(el=>{const production=el.querySelector('[data-us-flow-production="corn"]').getBoundingClientRect(),use=el.querySelector('[data-us-marketing-flow="corn"]').getBoundingClientRect(),destinations=el.querySelector('#exports-corn').getBoundingClientRect();return{production:production.x,use:use.x,destinations:destinations.x};});
 assert.ok(order.production<order.use&&order.use<order.destinations,'US production → use/export → destinations');
 assert.match(await us.innerText(),/1,235\.03.*311\.24.*72\.97/s);
 await page.screenshot({path:resolve(out,'1440-us-baseline.png'),fullPage:true});
 report.operations.push({name:'us-baseline',cornSelection:true,sharedNationalHost:await page.locator('[data-agro-statistics]').count()});
 if(publicOrigin)for(const field of ['agriculture','nature','industry','population']){await page.goto(reviewUrl('/atlas/japan/'+field+'/'),{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('[data-japan-atlas]')?.dataset.mapReady==='true');assert.equal(await page.locator('[data-agro-statistics]').count(),0);report.operations.push({name:'production-japan-'+field,sharedHostAbsent:true});await page.screenshot({path:resolve(out,'1440-production-japan-'+field+'.png'),fullPage:true});}
 assert.deepEqual(report.errors,[],'browser errors or page overflow diagnostics require resolution');
 report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify({head:report.head,status:report.status,cases:report.cases.length,operations:report.operations.length,errors:report.errors}));
