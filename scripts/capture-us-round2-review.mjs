import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir=resolve('dist'),out=resolve('review-artifacts/us-round2');await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{let p=resolve(dir,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,''));if(!p.startsWith(dir+sep))throw Error('outside build');if((await stat(p)).isDirectory())p=resolve(p,'index.html');res.writeHead(200,{'Content-Type':mime[extname(p)]??'application/octet-stream'});res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:{width:1920,height:1080},dpr:1,sandbox:true,captures:[],operations:[],errors:[],status:'running'};
let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
 assert.equal(JSON.parse(await readFile(resolve(dir,'_release.json'),'utf8')).commitSha,report.head,'release must identify the reviewed head');
 const cases=[['climate','nature/'],['river','nature/?env=water'],['precipitation','nature/?env=water&waterView=precipitation'],['basins','nature/?env=water&waterView=basins'],['agriculture','agriculture/'],['forest','agriculture/?agriReading=forestry:timber'],['industry','industry/'],['auto','industry/?sector=manufacturing&subsector=auto'],['electronics','industry/?sector=manufacturing&subsector=electronics'],['oil','industry/?sector=resources&subsector=oil-gas'],['density','population/'],['ethnicity','population/?popView=ethnicity'],['religion','population/?popView=religion']];
 for(const [target,origin] of [['build',`http://127.0.0.1:${server.address().port}`],['production','https://guchio2366-dev.github.io']]){
  for(const [name,path] of cases){
   await page.goto(`${origin}/insight-journal/atlas/north-america/${path}`,{waitUntil:'networkidle'});
   await page.locator('[data-atlas-explorer][data-render-state=ready]').waitFor({timeout:30000});
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(800);
   if(name==='forest')await page.locator('[data-atlas-explorer][data-forest-active=true]').waitFor();
   if(['precipitation','basins'].includes(name))assert.equal(await page.locator('[data-water-view][aria-selected=true]').getAttribute('data-water-view'),name);
   if(['auto','electronics','oil'].includes(name))assert.equal(await page.locator('[data-atlas-explorer]').getAttribute('data-industry-subsector'),name==='oil'?'oil-gas':name);
   if(['density','ethnicity','religion'].includes(name)){
    await page.waitForFunction(()=>/郡のデータ/.test(document.querySelector('[data-pop-status]')?.textContent??''));
    assert.equal(await page.locator('[data-pop-view][aria-pressed=true]').getAttribute('data-pop-view'),name==='density'?'distribution':name);
   }
   assert.equal(await page.locator('[data-fallback]').isVisible(),false,`${target}/${name}: actual MapLibre`);
   const frame=await page.locator('[data-map-frame]').boundingBox();
   assert.ok(frame.width>600&&frame.height>300,`${target}/${name}: readable map frame`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:resolve(out,`${target}-${name}.jpg`),type:'jpeg',quality:85});
   report.captures.push({target,name,url:page.url(),frame,dpr:await page.evaluate(()=>devicePixelRatio),render:await page.locator('[data-atlas-explorer]').getAttribute('data-render-state')});
  }
 }
 const origin=`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/`;
 async function ready(){await page.locator('[data-atlas-explorer][data-render-state=ready]').waitFor();if(await page.locator('[data-atlas-explorer]').getAttribute('data-field')==='natural')await page.locator('[data-atlas-explorer][data-nature-load=ready]').waitFor();await page.evaluate(()=>document.fonts.ready);assert.equal(await page.locator('[data-fallback]').isVisible(),false);}
 async function snapshot(name){await page.waitForLoadState('networkidle');await ready();await page.waitForTimeout(500);await page.screenshot({path:resolve(out,`operation-${name}.jpg`),type:'jpeg',quality:85});report.operations.push({name,url:page.url(),viewport:page.viewportSize(),render:'ready'});}
 await page.goto(origin+'nature/',{waitUntil:'networkidle'});await ready();
 await page.locator('[data-nature-label="city:miami"]').click();
 assert.equal(await page.locator('#city-climate-heading').textContent(),'マイアミの雨温図');
 await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('#city-climate-heading').textContent(),'マイアミの雨温図');
 await page.goBack({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('#city-climate-heading').textContent(),'ロサンゼルスの雨温図');await snapshot('city-back-reload');
 await page.locator('[data-nature-mode="water"]').click();await page.locator('[data-water-view="basins"]').click();
 await page.locator('[data-water-label="missouri"]').click();assert.match(await page.locator('[data-water-title]').textContent(),/ミズーリ/);
 assert.equal(await page.locator('[data-water-parent]').isVisible(),true);await page.locator('[data-water-parent]').click();
 assert.equal(new URL(page.url()).searchParams.get('basin'),'mississippi');
 await page.goBack({waitUntil:'networkidle'});assert.equal(new URL(page.url()).searchParams.get('basin'),'missouri');
 await page.reload({waitUntil:'networkidle'});await ready();assert.match(await page.locator('[data-water-title]').textContent(),/ミズーリ/);await snapshot('basin-parent-back-reload');
 await page.locator('[data-water-view="precipitation"]').click();await page.locator('[data-water-label="1000-1500"]').click();
 assert.match(await page.locator('[data-water-title]').textContent(),/1,000/);await snapshot('rain-band');
 await page.goto(origin+'industry/?sector=manufacturing&subsector=auto',{waitUntil:'networkidle'});await ready();
 assert.equal(await page.locator('[data-industry-markers] [data-industry-place]').count(),4);
 assert.equal(await page.locator('[data-industry-state-marker]').count(),0);assert.match(await page.locator('[data-industry-economic-legend]').textContent(),/9\/51/);
 await page.locator('[data-industry-economic-legend] summary').click();assert.equal(await page.locator('[data-industry-state-option]').count(),51);
 await page.locator('[data-industry-state-option="06"]').click();assert.equal(new URL(page.url()).searchParams.get('industryState'),'06');
 assert.match(await page.locator('[data-selection-title]').textContent(),/カリフォルニア/);
 await page.reload({waitUntil:'networkidle'});await ready();assert.match(await page.locator('[data-selection-title]').textContent(),/カリフォルニア/);
 await page.goBack({waitUntil:'networkidle'});assert.equal(new URL(page.url()).searchParams.get('industryState'),null);await snapshot('auto-state-back-reload');
 await page.locator('[data-industry-subsector="electronics"]').click();assert.match(await page.locator('[data-industry-economic-legend]').textContent(),/半導体単品ではありません/);
 await page.locator('[data-industry-description-panel="manufacturing:electronics"] [data-industry-region-option="austin-electronics"]').click();assert.match(await page.locator('[data-selection-title]').textContent(),/オースティン/);await snapshot('electronics-place');
 assert.equal(await page.evaluate(()=>{const card=document.querySelector('[data-selection]');if(card.classList.contains('atlas-selection--below'))return false;const a=card.getBoundingClientRect();return [...document.querySelectorAll('[data-industry-markers] .industry-overview-label:not([hidden]),[data-industry-markers] .industry-overview-pin>i')].some(node=>{const b=node.getBoundingClientRect();return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;});}),false,'selected card must leave industry labels and anchors readable');
 await page.goto(origin+'agriculture/',{waitUntil:'networkidle'});await ready();assert.match(await page.locator('.atlas-quantity-note').textContent(),/生産量を表しません/);
 await page.locator('[data-crop-select="wheat"]').first().click();await page.reload({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('crop'),'wheat');await snapshot('agriculture-reload');
 for(const view of ['ethnicity','religion']){await page.goto(origin+'population/?popView='+view,{waitUntil:'networkidle'});await ready();await page.waitForFunction(()=>/郡のデータ/.test(document.querySelector('[data-pop-status]')?.textContent??''));await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-pop-view][aria-pressed=true]').getAttribute('data-pop-view'),view);await snapshot(view+'-reload');}
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'industry/',{waitUntil:'networkidle'});await ready();
 const expectedPlaces=await page.locator('[data-explorer-config]').evaluate(node=>new Set(JSON.parse(node.textContent).industryRegions.map(r=>r.placeId)).size);
 assert.equal(await page.locator('[data-industry-overview-list] [data-industry-place]').count(),expectedPlaces);
 assert.equal(await page.locator('[data-industry-markers] .industry-overview-label:visible').count(),0);
 assert.equal(await page.locator('[data-industry-overview-list]').isVisible(),true);
 await page.locator('[data-map-frame]').scrollIntoViewIfNeeded();await snapshot('industry-390');
 await page.locator('[data-industry-overview-list] [data-industry-place="newyork"]').click();assert.equal(await page.locator('[data-selection-title]').textContent(),'ニューヨーク');await page.locator('[data-selection]').scrollIntoViewIfNeeded();await snapshot('industry-390-place');
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server.close();}
