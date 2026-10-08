import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,stat,realpath} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const site=path.resolve(process.argv[2]??'site');
const output=path.resolve('review-artifacts/southeast-next');
const expected='a9691a674742cfa95c877ea81dd991744fcbe4ad';
const command=promisify(execFile);
const git=async args=>(await command('git',args,{cwd:site})).stdout.trim();
const {chromium}=await import(pathToFileURL(path.join(site,'node_modules/playwright/index.mjs')).href);
const {default:config}=await import(pathToFileURL(path.join(site,'astro.config.mjs')).href);
const base='/'+String(config.base??'').replace(/^\/+|\/+$/g,'');
const viewport={width:1440,height:1000};
const metadata={schemaVersion:1,status:'running',sourceHead:await git(['rev-parse','HEAD']),expectedSourceHead:expected,diagnosticCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,runAttempt:process.env.GITHUB_RUN_ATTEMPT,viewport,sourceWorkingTree:await git(['status','--porcelain','--untracked-files=all']),fontSetup:process.env.REVIEW_JAPANESE_FONT_SETUP,fontMatch:process.env.REVIEW_JAPANESE_FONT_MATCH,screens:[],externalAttempts:[],errors:[],failedRequests:[]};
assert.equal(metadata.sourceHead,expected);
assert.equal(metadata.sourceWorkingTree,'');
assert(process.env.REVIEW_JAPANESE_FONT_MATCH?.trim());
assert(process.env.REVIEW_CHROME_PATH);
await mkdir(output,{recursive:true});
const persist=()=>writeFile(path.join(output,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
const root=await realpath(path.join(site,'dist'));
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.png':'image/png','.svg':'image/svg+xml','.gz':'application/gzip','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{
 try{
  assert(['GET','HEAD'].includes(req.method));
  let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  assert(pathname.startsWith(base+'/'));pathname=pathname.slice(base.length);
  let file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+path.sep));
  if((await stat(file)).isDirectory())file=path.join(file,'index.html');
  file=await realpath(file);assert(file.startsWith(root+path.sep));
  const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404).end('Missing local build asset');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});
 metadata.browser={version:browser.version(),chromiumSandbox:true,additionalFlags:[],certificateExceptions:false,executablePath:process.env.REVIEW_CHROME_PATH};
 for(const scene of [
  {id:'crop-priority',route:'agriculture/'},
  {id:'oilpalm-from-priority',route:'agriculture/'},
  {id:'population-overview',route:'population/'},
  {id:'hanoi-population-return',route:'population/?topic=urban'},
 ]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,isMobile:false,hasTouch:false,serviceWorkers:'block'});
  try{
   await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin){metadata.externalAttempts.push({scene:scene.id,url:url.origin+url.pathname});await route.abort('blockedbyclient');return;}await route.continue();});
   await context.routeWebSocket('**/*',socket=>{metadata.externalAttempts.push({scene:scene.id,websocket:true});socket.close({code:1008,reason:'Static local proof only'});});
   const page=await context.newPage();page.setDefaultTimeout(30000);
   page.on('pageerror',e=>metadata.errors.push({scene:scene.id,error:e.message}));
   page.on('response',r=>{if(r.status()>=400)metadata.failedRequests.push({scene:scene.id,status:r.status(),url:r.url()});});
   page.on('requestfailed',r=>{if(!r.failure()?.errorText.includes('ERR_ABORTED'))metadata.failedRequests.push({scene:scene.id,url:r.url(),error:r.failure()?.errorText});});
   await page.goto(origin+base+'/atlas/asia/southeast-asia/'+scene.route,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-fallback]')?.hidden);
   const checks={};
   if(scene.id==='crop-priority'||scene.id==='oilpalm-from-priority'){
    await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.farmContextStatus==='ready');
    assert.equal(new URL(page.url()).searchParams.get('place'),null);
    checks.visibleLivestock=await page.locator('.asia-livestock-point:visible').count();assert(checks.visibleLivestock>0);
    assert.equal(await page.locator('[data-country-select]').isVisible(),false);
    checks.farmView=await page.locator('[data-asia-atlas]').getAttribute('data-farm-view');assert.equal(checks.farmView,'all');
    const details=page.locator('[data-southeast-crop-priority]');await details.locator('summary').click();
    checks.candidates=await details.locator('tbody tr').count();assert.equal(checks.candidates,10);
    checks.next=await details.innerText();assert.match(checks.next,/次点：.*綿花/);
    assert.match(checks.next,/有効国/);assert.match(checks.next,/X＝外部機関/);
    if(scene.id==='oilpalm-from-priority'){
     await details.locator('[data-farm-choice="oilpalm"]').click();
     await page.waitForFunction(()=>new URL(location.href).searchParams.get('topic')==='oilpalm');
     checks.selection=await page.locator('[data-farm-choice="oilpalm"]').first().getAttribute('aria-pressed');assert.equal(checks.selection,'true');
     assert((await page.locator('.asia-livestock-point:visible').count())>0,'other distributions remain after a crop selection');
    }
   }else if(scene.id==='population-overview'){
    await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
    checks.reading=await page.locator('[data-reading-dock-summary]').innerText();assert.match(checks.reading,/ジャワ島西部.*紅河デルタ/);
    assert.equal(await page.locator('[data-country-select]').isVisible(),false);
    assert.equal(await page.locator('[data-southeast-crop-priority]').isVisible(),false);
   }else{
    await page.locator('[data-place-story] option[value="hanoi-population"]').waitFor();
    await page.locator('[data-place-story]').selectOption('hanoi-population');
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('story')==='hanoi-population');
    checks.story=await page.locator('[data-place-story-title]').innerText();assert.match(checks.story,/紅河デルタ/);
    assert.match(await page.locator('[data-place-story-scope]').innerText(),/2020年.*2025年.*2011年/s);
    await page.locator('[data-place-story-bridges] button').filter({hasText:'ベトナム全体の製造業'}).click();
    await page.waitForFunction(()=>document.querySelector('[data-asia-explorer]')?.dataset.field==='industry');
    assert.equal(new URL(page.url()).searchParams.get('place'),'VNM');
    await page.locator('[data-comparison-back]').click();
    await page.waitForFunction(()=>new URL(location.href).searchParams.get('story')==='hanoi-population');
    checks.returnedToStory=true;
   }
   await page.waitForLoadState('networkidle');
   await page.evaluate(async()=>{await document.fonts.ready;scrollTo(0,0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
   assert.equal(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth),false);
   const box=await page.locator('[data-map-surface]').boundingBox();assert(box);
   const png=await page.screenshot({fullPage:false,animations:'disabled'});
   const pixels=mapPixels(png,box);
   const file=scene.id+'.png';await writeFile(path.join(output,file),png);
   const url=new URL(page.url());
   metadata.screens.push({id:scene.id,file,path:url.pathname+url.search,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),map:box,mapPixels:pixels,checks,passed:true});
   await persist();
  }finally{await context.close();}
 }
 assert.equal(metadata.screens.length,4);
 assert.deepEqual(metadata.externalAttempts,[]);assert.deepEqual(metadata.errors,[]);assert.deepEqual(metadata.failedRequests,[]);
 assert.equal(await git(['status','--porcelain','--untracked-files=all']),'');
 metadata.status='passed';
}catch(e){metadata.status='failed';metadata.failure=e.stack??String(e);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));metadata.completedAt=new Date().toISOString();await persist();}
console.log(JSON.stringify(metadata,null,2));

function mapPixels(png,box,backgroundExclusions=[]){
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 let width,height,channels;const chunks=[];
 for(let offset=8;offset<png.length;){
  const length=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8),data=png.subarray(offset+8,offset+8+length);
  if(kind==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert([2,6].includes(data[9]));assert.equal(data[12],0);channels=data[9]===6?4:3;}
  if(kind==='IDAT')chunks.push(data);offset+=length+12;
 }
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,pixels=Buffer.alloc(height*stride);
 assert.equal(raw.length,(stride+1)*height);
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert(filter<=4);for(let x=0;x<stride;x++){const offset=y*stride+x,left=x>=channels?pixels[offset-channels]:0,up=y?pixels[offset-stride]:0,upperLeft=y&&x>=channels?pixels[offset-stride-channels]:0;pixels[offset]=(raw[y*(stride+1)+1+x]+[0,left,up,Math.floor((left+up)/2),paeth(left,up,upperLeft)][filter])&255;}}
 const colors=new Map();let samples=0,backgroundPoint=null;
 for(let y=Math.max(0,Math.ceil(box.y+4));y<Math.min(height,Math.floor(box.y+box.height-4));y+=3)for(let x=Math.max(0,Math.ceil(box.x+4));x<Math.min(width,Math.floor(box.x+box.width-4));x+=3){const i=(y*width+x)*channels;if(channels===4&&pixels[i+3]<128)continue;const key=`${pixels[i]>>4},${pixels[i+1]>>4},${pixels[i+2]>>4}`;colors.set(key,(colors.get(key)??0)+1);samples++;if(!backgroundPoint&&x>box.x+24&&x<box.x+box.width-24&&y>box.y+24&&y<box.y+box.height-24&&!backgroundExclusions.some(r=>x>=r.x-4&&x<=r.x+r.width+4&&y>=r.y-4&&y<=r.y+r.height+4)&&['230,238,240','215,218,213','225,228,219'].includes(`${pixels[i]},${pixels[i+1]},${pixels[i+2]}`))backgroundPoint={x,y};}
 const evidence={viewportWidth:width,viewportHeight:height,sampledMapPixels:samples,colorBuckets:colors.size,dominantColorRatio:samples?Math.max(...colors.values())/samples:1};
 assert(samples>1000,`The visible map has too few pixels to review: ${JSON.stringify({box,...evidence})}`);
 assert(colors.size>=16&&evidence.dominantColorRatio<.98,`The map is blank or nearly uniform: ${JSON.stringify(evidence)}`);return {...evidence,backgroundPoint,colorBucketKeys:[...colors.keys()]};
}
