/** Regional browser QA. Static exports and this browser review are different checks. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import sharp from 'sharp';
const baseline=process.env.LATIN_INDUSTRY_BASELINE==='1',output=process.env.LATIN_INDUSTRY_OUTPUT??'/tmp/latin-industry-readability-browser';
const data=baseline?{industries:[],sites:[]}:JSON.parse(await readFile('src/data/atlas/latin-america/industry-sectors.json','utf8'));
let layers;
if(!baseline){const bundled=await build({stdin:{contents:"export * from './src/lib/atlas-latin-industry-layers.ts';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});layers=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));}
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTreeModified:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),baseline,viewports:[],shots:[],errors:[],failedRequests:[],coverage:{industries:data.industries.length,sites:data.sites.length},sourceHashes:{}};
for(const file of ['src/lib/atlas-latin-industry-layers.ts','src/lib/atlas-latin-industry-sectors.ts','src/lib/atlas-latin-industry-evidence.ts','src/components/atlas/LatinIndustrySectors.astro','src/scripts/atlas-latin-industry-sectors.ts','src/styles/atlas-latin-industry-sectors.css']){try{report.sourceHashes[file]=crypto.createHash('sha256').update(await readFile(file)).digest('hex');}catch{}}
if(process.env.LATIN_REVIEW_EXPECTED_HEAD)assert.equal(report.commit,process.env.LATIN_REVIEW_EXPECTED_HEAD);
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/insight-journal/,''),root=path.resolve('dist');let file=path.resolve(root,'.'+pathname);assert.ok(file.startsWith(root+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/insight-journal/atlas/latin-america/industry/';let browser;
const save=()=>writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',headless:true,chromiumSandbox:true});report.browser={version:browser.version(),chromiumSandbox:true};
 for(const viewport of (baseline?[{width:1920,height:1080},{width:1896,height:996}]:[{width:1920,height:1080},{width:1896,height:996},{width:1440,height:900},{width:390,height:844},{width:360,height:800}])){
  const mobile=viewport.width<960,context=await browser.newContext({viewport,deviceScaleFactor:1,serviceWorkers:'block'});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failedRequests.push(r.url());});
  const top=()=>page.evaluate(()=>scrollTo({top:0,left:0,behavior:'instant'}));
  const ready=async()=>{await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('[data-latin-workspace]')?.dataset.layoutReady==='true');if(!baseline)await page.waitForFunction(()=>document.querySelector('[data-latin-industry-sectors]')?.dataset.lisReady==='true');await top();await page.waitForTimeout(100);};
  const go=async(search='')=>{await page.goto(url+search,{waitUntil:'networkidle'});await ready();};
  const stable=()=>page.evaluate(()=>{const svg=document.querySelector('[data-lis-svg]');return{viewBox:svg.getAttribute('viewBox'),frame:svg.querySelector('g').getAttribute('transform'),marks:[...svg.querySelectorAll('[data-lis-cluster]')].map(el=>[el.dataset.lisCluster,el.dataset.screenPoint,el.dataset.lisMembers]).sort((a,b)=>a[0].localeCompare(b[0]))};});
  const labelGeometry=()=>page.locator('[data-lis-label] text').evaluateAll(els=>els.map(el=>{const r=el.getBBox();return[el.textContent,r.x,r.y,r.width,r.height];}));
  const checkLabels=async()=>{const labels=await labelGeometry();for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const[a,x,y,w,h]=labels[i],[b,bx,by,bw,bh]=labels[j];assert.ok(!(x<bx+bw&&x+w>bx&&y<by+bh&&y+h>by),'Label overlap '+a+'/'+b);}return labels;};
  const open=async selector=>{const d=page.locator(selector);if(!await d.evaluate(el=>el.open))await d.locator('summary').click();};
  const choose=async id=>{await open('.latin-sector-industry-picker');await page.locator(`[data-lis-legend] [data-lis-industry=${id}]`).click();};
  const shot=async(name,statistics=false)=>{
   await page.mouse.move(0,0);await page.evaluate(({mobile,statistics})=>{const el=document.querySelector(statistics?'[data-lis-statistics]':'[data-latin-industry-sector]');scrollTo({top:statistics||mobile?el.getBoundingClientRect().top+scrollY-(statistics?12:65):0,left:0,behavior:'instant'});}, {mobile,statistics});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const capture=await page.evaluate(()=>{const el=document.querySelector('[data-lis-map]')??document.querySelector('.latin-industry-map'),r=el.getBoundingClientRect();return{scroll:{x:scrollX,y:scrollY},map:{top:r.top,bottom:r.bottom}};});
   if(mobile&&!statistics)assert.ok(capture.map.top>=0&&capture.map.bottom<=viewport.height,'Whole map missing from screenshot');
   if(statistics){const r=await page.locator('[data-lis-statistics-title]').boundingBox();assert.ok(r.y>=0&&r.y+r.height<=viewport.height,'Statistics title missing');}
   const file=name+'-'+viewport.width+'.png',bytes=await page.screenshot({path:path.join(output,file),animations:'disabled'}),preview=file.replace('.png','.webp'),webp=await sharp(bytes).webp({quality:86}).toBuffer();await writeFile(path.join(output,preview),webp);report.shots.push({file,...capture,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),preview:{file:preview,sha256:crypto.createHash('sha256').update(webp).digest('hex')}});await top();
  };
  const view={viewport,checks:[],fields:[]};report.viewports.push(view);await go();
  if(baseline){await shot('before-locations');await context.close();await save();continue;}
  for(const sector of data.sectors){
   await page.locator(`[data-latin-industry-sector=${sector.id}]`).click();await top();await page.waitForTimeout(80);
   const initial=await stable(),expected=layers.industrySiteViews(sector.id),ids=layers.industryIdsInSector(sector.id),members=initial.marks.flatMap(m=>m[2].split(' '));assert.deepEqual(members.sort(),expected.map(s=>s.id).sort());assert.equal(await page.locator('[data-lis-svg]').getAttribute('data-lis-map-sector'),sector.id);
   assert.equal(await page.locator('[data-lis-map] button,[data-lis-map] [data-lis-legend],[data-lis-label][role=button],[data-lis-label][tabindex]').count(),0);
   assert.ok(await page.locator('[data-lis-legend]').evaluate(el=>!!el.closest('[data-lis-reader]')));assert.deepEqual(await page.locator('[data-lis-legend] button').evaluateAll(els=>els.map(e=>e.dataset.lisIndustry)),data.industries.filter(i=>ids.has(i.id)).map(i=>i.id));
   const overview=await checkLabels();assert.ok(overview.length>0&&overview.length<=(mobile?4:8));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot(sector.id+'-overview');
   view.fields.push({sector:sector.id,sourceSites:expected.length,displayMarks:initial.marks.length,overviewLabels:overview.length});
   for(const id of (viewport.width===1920?[...ids]:[sector.id==='resources'?'niobium':sector.id==='manufacturing'?'beef':'corporate'])){
    await choose(id);assert.deepEqual(await stable(),initial);assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-industry'),id);const selected=await checkLabels();assert.deepEqual(selected,overview,'Industry selection keeps the sector caption slots');
    if(['niobium','beef','medical','corporate'].includes(id))await shot(sector.id+'-'+id+'-selected');
    if(viewport.width===1920){await page.locator('[data-lis-single]').click();const single=await stable();assert.equal(single.frame,initial.frame);assert.equal(single.viewBox,initial.viewBox);for(const m of single.marks){assert.ok(initial.marks.some(b=>JSON.stringify(b)===JSON.stringify(m)));assert.ok(m[2].split(' ').every(site=>data.sites.find(s=>s.id===site).industry===id));}for(const label of await labelGeometry())assert.deepEqual(label,selected.find(before=>before[0]===label[0]),'Solo display retains its caption slot');await page.locator('[data-lis-single]').click();assert.deepEqual(await stable(),initial);
     await open('[data-lis-sites] >> xpath=..');for(const site of expected.filter(s=>s.industry===id)){await page.locator(`[data-lis-sites] [data-lis-site=${site.id}]`).click();assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-site'),site.id);assert.deepEqual(await stable(),initial);assert.equal(await page.locator('[data-lis-site-note]').textContent(),site.note);for(const ref of site.sources)assert.ok(await page.locator(`[data-lis-sources] a[href="${data.sources.find(s=>s.id===ref).url}"]`).count());}}
   }
   await page.locator('[data-lis-clear]').click();await top();assert.deepEqual(await stable(),initial);assert.deepEqual(await labelGeometry(),overview);
   const mark=page.locator('[data-lis-cluster]').first(),industry=await mark.getAttribute('data-industry');await mark.focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-industry'),industry);assert.deepEqual(await stable(),initial);await page.locator('[data-lis-clear]').click();await top();
   view.checks.push(sector.id+': phase-only source set, aggregated source coverage, external chooser, bounded labels, stable selection and keyboard');
  }
  await go('?sector=resources&site=reduc&single=1');assert.equal(new URL(page.url()).searchParams.get('sector'),'resources');assert.equal(await page.locator('[data-lis-overlap]').isVisible(),true);
  await go('?sector=resources&site=araxa-niobium');await page.locator('[data-lis-overlap]').click();assert.equal(new URL(page.url()).searchParams.get('sector'),'manufacturing');await page.reload({waitUntil:'networkidle'});await ready();assert.equal(await page.locator('[data-latin-industry-sectors]').getAttribute('data-site'),'araxa-niobium');await page.goBack({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('sector'),'resources');
  await go('?sector=manufacturing&site=guayas-shrimp');assert.match(await page.locator('[data-lis-range-note]').textContent(),/養殖原料の参考/);assert.ok(!(await stable()).marks.some(m=>m[2].includes('guayas-shrimp')));
  await go('?sector=manufacturing&industry=beef');await shot('manufacturing-beef-statistics',true);
  await context.close();await save();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.result=baseline?'baseline-recorded':'passed';
}catch(error){report.result='failed';report.failure=String(error);throw error;}finally{await save();console.log('LATIN_INDUSTRY_REPORT '+JSON.stringify(report));if(browser)await browser.close();await new Promise(r=>server.close(r));}
