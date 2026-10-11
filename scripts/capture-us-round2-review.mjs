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
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:{width:1920,height:1080},dpr:1,sandbox:true,captures:[],details:[],operations:[],errors:[],status:'running'};
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
   if(target==='build'&&['climate','river','precipitation','basins'].includes(name))assert.ok(frame.width>=1050&&frame.height>=680,`${name}: larger primary PC map area`);
   if(target==='build'&&name==='forest'){assert.equal(await page.locator('[data-forest-site]').count(),2);assert.match(await page.locator('[data-forest-national]').textContent(),/2017/);}
   if(target==='build'&&name==='industry')assert.equal(await page.evaluate(()=>{const boxes=[...document.querySelectorAll('[data-industry-markers] .industry-overview-label:not([hidden])')].map(n=>n.getBoundingClientRect());return boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));}),false,'initial all-industry labels must not overlap');
   // Save the actual screen before layout assertions, including on failure.
   await page.screenshot({path:resolve(out,`${target}-${name}.jpg`),type:'jpeg',quality:85});
   const capture={target,name,url:page.url(),frame,dpr:await page.evaluate(()=>devicePixelRatio),render:await page.locator('[data-atlas-explorer]').getAttribute('data-render-state'),checked:false};report.captures.push(capture);
   if(target==='build'&&name==='forest'){
    await page.locator('[data-forest-national]').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'build-forest-national.jpg'),type:'jpeg',quality:85});report.details.push({name:'forest-national',url:page.url()});
   }
   if(target==='build'&&name==='religion'){
    const rectangles=await page.evaluate(()=>{
     const box=n=>{const b=n.getBoundingClientRect();return {id:n.getAttribute('data-pop-city')??n.getAttribute('data-pop-religion-marker'),text:n.textContent,left:b.left,top:b.top,right:b.right,bottom:b.bottom};};
     const ny=box(document.querySelector('[data-pop-city-markers] [data-pop-city="new-york"]'));
     const stories=[...document.querySelectorAll('[data-pop-religion-markers] .atlas-nature-label:not([hidden])')].map(box);
     return {ny,stories,collisions:stories.map(b=>({...b,overlapWidth:Math.max(0,Math.min(ny.right,b.right)-Math.max(ny.left,b.left)),overlapHeight:Math.max(0,Math.min(ny.bottom,b.bottom)-Math.max(ny.top,b.top))})).filter(b=>b.overlapWidth>0&&b.overlapHeight>0)};
    });
    await writeFile(resolve(out,'build-religion-rectangles.json'),JSON.stringify(rectangles,null,2)+'\n');
    await page.locator('[data-pop-religion-concentrations]').evaluate(n=>n.open=true);
    for(let i=0;i<2;i++){await page.locator('[data-pop-religion-concentrations] table').nth(i).screenshot({path:resolve(out,`build-religion-concentrations-${i+1}.jpg`),type:'jpeg',quality:85});report.details.push({name:`religion-concentrations-${i+1}`,url:page.url()});}
    await page.locator('[data-pop-religion-concentrations]').evaluate(n=>n.open=false);
    assert.match(await page.locator('[data-pop-map-note]').textContent(),/PRRI 2023/);
    assert.equal(await page.locator('[data-pop-religion-concentrations] table').count(),2);
    assert.equal(rectangles.collisions.length>0,false,'religion reference labels must leave New York readable');
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   capture.checked=true;
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
 for(const [sector,subsector,ids] of [['resources','oil-gas',['kern-river-well','hugoton-well']],['manufacturing','chemicals',['puget-refinery','baytown-chemical']]]){
  await page.goto(origin+`industry/?sector=${sector}&subsector=${subsector}`,{waitUntil:'networkidle'});await ready();
  const panel=page.locator(`[data-industry-description-panel="${sector}:${subsector}"]`);
  let previous=null;
  for(const id of ids){
   assert.equal(await panel.locator(`[data-industry-region-option="${id}"]`).count(),1);
   await page.locator(`[data-industry-markers] [data-industry-place="${id}"]`).click();
   const title=await page.locator('[data-selection-title]').textContent();
   assert.equal(new URL(page.url()).searchParams.get('industryRegion'),id);
   await page.locator('[data-selection-link]').click();assert.equal(new URL(page.url()).searchParams.get('industryRegion'),id);
   assert.equal(await page.locator('[data-selection-title]').textContent(),title);assert.equal(await panel.isVisible(),true);
   await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-selection-title]').textContent(),title);
   await page.goBack({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('industryRegion'),id);
   await page.locator('[data-map-frame]').scrollIntoViewIfNeeded();await snapshot(id+'-detail-back-reload');
   await page.goBack({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('industryRegion'),previous);previous=id;
   // Restore the chosen site before checking the next source location.
   await panel.locator(`[data-industry-region-option="${id}"]`).click();
  }
 }
 await page.goto(origin+'agriculture/',{waitUntil:'networkidle'});await ready();assert.match(await page.locator('.atlas-quantity-note').textContent(),/生産量を表しません/);
 await page.locator('[data-crop-select="wheat"]').first().click();await page.reload({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('crop'),'wheat');await snapshot('agriculture-reload');
 for(const view of ['ethnicity','religion']){await page.goto(origin+'population/?popView='+view,{waitUntil:'networkidle'});await ready();await page.waitForFunction(()=>/郡のデータ/.test(document.querySelector('[data-pop-status]')?.textContent??''));await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-pop-view][aria-pressed=true]').getAttribute('data-pop-view'),view);await snapshot(view+'-reload');}
 await page.locator('[data-pop-religion-concentrations]').evaluate(n=>n.open=true);await page.locator('[data-pop-religion-concentrations]').scrollIntoViewIfNeeded();await snapshot('religion-concentration-table');
 await page.goto(origin+'agriculture/?agriReading=forestry:timber',{waitUntil:'networkidle'});await ready();await page.locator('[data-atlas-explorer][data-forest-active=true]').waitFor();
 await page.locator('[data-forest-national]').scrollIntoViewIfNeeded();assert.equal(await page.locator('[data-forest-national] tbody tr').count(),3);await snapshot('forest-national-supply-trade');
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server.close();}
