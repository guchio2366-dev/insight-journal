#!/usr/bin/env node
// Review only the changed Mexico rice and composition scenes in the built site.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdir, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const dist=await realpath(path.join(repo,'dist'));
const output=path.join(repo,'review-artifacts','mexico-composition-focused');
const base='/insight-journal';
const head=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim();
assert(process.env.GITHUB_ACTIONS==='true'||process.env.REVIEW_LOCAL==='1','Run in CI or explicitly opt into local review');
assert(/^[a-f0-9]{40}$/.test(head));
await mkdir(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};
const server=createServer(async(req,res)=>{
 try{
  assert(req.method==='GET');
  const url=new URL(req.url,'http://127.0.0.1');
  const pathname=decodeURIComponent(url.pathname);
  assert(pathname.startsWith(`${base}/`));
  let target=path.resolve(dist,`.${pathname.slice(base.length)}`);
  assert(target.startsWith(`${dist}${path.sep}`));
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  target=await realpath(target);assert(target.startsWith(`${dist}${path.sep}`));
  res.writeHead(200,{'Content-Type':types[path.extname(target)]??'application/octet-stream','Cache-Control':'no-store'});
  res.end(await readFile(target));
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.REVIEW_CHROME_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const results=[];
async function settled(){await page.waitForLoadState('networkidle');await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});}
async function capture(name,evidence){
 await settled();await page.evaluate(()=>scrollTo(0,0));
 const file=`${name}.jpg`,bytes=await page.locator('.atlas-primary-grid').screenshot({type:'jpeg',quality:78,animations:'disabled'});
 await writeFile(path.join(output,file),bytes);
 results.push({scene:name,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),url:page.url(),evidence});
}
async function compositionEvidence(category,mode,selected){
 return page.evaluate(({category,mode,selected})=>{
  const root=document.querySelector(`[data-population-overview-category="${category}"]`);
  const groups=[...root.querySelectorAll('[data-overview-region-metric]')].map(group=>({metric:group.dataset.overviewRegionMetric,states:[...group.querySelectorAll('[data-overview-region-state]')].map(mark=>mark.dataset.overviewRegionState),selected:group.classList.contains('is-selected-overview-metric')}));
  const map=document.querySelector('[data-population-overview-maps]'),solo=document.querySelector('#mexico-population-distribution');
  return {category,mode,selected,groups,combinedVisible:!map.hidden,soloVisible:!solo.hidden,shareKeyVisible:!document.querySelector('[data-population-composition-share-key]').hidden,baseFill:[...root.querySelectorAll('[data-overview-state]')].map(node=>node.style.fill),buttonInReading:!!document.querySelector('[data-population-composition-reading] [data-population-composition-map-mode]')};
 },{category,mode,selected});
}
try{
 await page.goto(`${origin}${base}/atlas/north-america/mexico/agriculture/`);await settled();
 await page.waitForSelector('[data-mexico-agriculture-atlas][data-agriculture-ready="true"]');
 const rice=await page.evaluate(()=>({mainKeyRice:document.querySelectorAll('[data-crop-select="rice"]').length,cropZonesRice:document.querySelectorAll('[data-crop-zone="rice"]').length,supplement:document.querySelector('[data-rice-supplement]')?.textContent?.trim()}));
 assert.equal(rice.mainKeyRice,0);assert.equal(rice.cropZonesRice,0);assert.match(rice.supplement,/0\.18%/);await capture('agriculture-rice-removed',rice);
 await page.goto(`${origin}${base}/atlas/north-america/mexico/population/?category=ethnicity`);await settled();
 await page.waitForSelector('[data-mexico-field="population"][data-population-ready="1"]');
 for(const category of ['ethnicity','religion']){
  if(category==='religion'){await page.locator('[data-population-category="religion"]').click();await settled();}
  let evidence=await compositionEvidence(category,'combined',false);
  assert(evidence.combinedVisible&&!evidence.soloVisible&&evidence.groups.length===3);
  assert(evidence.groups.every(group=>group.states.length===8));
  assert(evidence.baseFill.every(fill=>fill===''));
  await capture(`${category}-initial`,evidence);
  const first=category==='ethnicity'?'indigenous_language':'catholic';
  await page.locator(`[data-population-overview-metric="${first}"]`).click();await settled();
  evidence=await compositionEvidence(category,'combined',true);
  assert(evidence.combinedVisible&&!evidence.soloVisible&&evidence.groups.every(group=>group.states.length===8));
  assert.equal(evidence.groups.filter(group=>group.selected).length,1);
  assert.equal(evidence.groups.find(group=>group.selected)?.metric,first);
  assert(evidence.baseFill.every(fill=>fill==='')&&!evidence.shareKeyVisible&&evidence.buttonInReading);
  await capture(`${category}-selected`,evidence);
  await page.locator('[data-population-composition-reading] [data-population-composition-map-mode]').click();await settled();
  evidence=await compositionEvidence(category,'solo',true);
  assert(!evidence.combinedVisible&&evidence.soloVisible&&evidence.shareKeyVisible);
  assert.equal(new URL(page.url()).searchParams.get('compositionMap'),'single');
  await capture(`${category}-solo`,evidence);
 }
 const bytes=results.reduce((sum,item)=>sum+item.bytes,0);
 assert(bytes<20*1024*1024,`Focused images exceed 20 MiB: ${bytes}`);
 const report={status:'passed',head,runId:process.env.GITHUB_RUN_ID??null,browser:browser.version(),scope:'Changed Mexico rice and ethnicity/religion initial, selected, solo only',totalImageBytes:bytes,limitBytes:20*1024*1024,images:results};
 await writeFile(path.join(output,'validation.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,head,imageCount:results.length,totalImageBytes:bytes}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
