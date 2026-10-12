import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {chromium} from 'playwright';
import astro from '../astro.config.mjs';

const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
let phase='before';try{await access('data-source/atlas/canada/followup-20261012/implementation.json');phase='after';}catch{}
const output=path.resolve('review-artifacts/canada-followup/'+phase),dist=path.resolve('dist'),base=String(astro.base??'').replace(/\/$/,'');
await mkdir(output,{recursive:true});
const result={head,phase,status:'running',sandbox:true,browserZoom:'100%',viewports:[],screenshots:[],checks:[],errors:[]};
const server=createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(base&&p.startsWith(base))p=p.slice(base.length);if(p.endsWith('/'))p+='index.html';const f=path.resolve(dist,'.'+p);assert(f.startsWith(dist+'/'));const raw=await readFile(f);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.gz':'application/gzip'})[path.extname(f)]??'application/octet-stream'});res.end(raw);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=route=>`http://127.0.0.1:${server.address().port}${base}/atlas/north-america/canada/`+route;
let browser,page;
const scenes=[['climate-initial','nature/'],['climate-montreal','nature/?city=montreal'],['rivers','nature/?view=water'],['precipitation','nature/?view=water&waterTopic=precipitation'],['landform','nature/?view=landform'],['elevation','nature/?view=elevation'],['agriculture','agriculture/'],['forestry','agriculture/forestry/'],['resources','industry/'],['manufacturing','industry/?sector=manufacturing'],['services','industry/?sector=services'],['population','population/'],['ethnicity','population/?topic=ethnicity'],['religion','population/?topic=religion']];
async function ready(){await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(450);}
async function capture(name){const file=name+'.jpg';await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});const bytes=await page.screenshot({path:path.join(output,file),type:'jpeg',quality:85,fullPage:false});result.screenshots.push(file);const encoded=bytes.toString('base64'),chunkSize=24000,count=Math.ceil(encoded.length/chunkSize);for(let i=0;i<count;i++)console.log('CANADA_FOLLOWUP_IMAGE '+JSON.stringify({phase,file,index:i,count,data:encoded.slice(i*chunkSize,(i+1)*chunkSize)}));}
try{
 browser=await chromium.launch({executablePath:process.env.INDUSTRY_REVIEW_CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});result.browserVersion=browser.version();
 for(const viewport of [{width:1920,height:1080},{width:1896,height:996}]){
  page=await browser.newPage({viewport,deviceScaleFactor:1});page.on('pageerror',e=>result.errors.push(e.message));
  for(const [name,route]of scenes){await page.goto(url(route));await ready();result.viewports.push(await page.evaluate(({name})=>({name,viewport:{width:innerWidth,height:innerHeight},DPR:devicePixelRatio,visualViewportScale:visualViewport.scale,cssZoom:getComputedStyle(document.documentElement).zoom,map:[...document.querySelectorAll('.atlas-map-frame')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect().toJSON()),reading:[...document.querySelectorAll('.canada-reading')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect().toJSON())}),{name}));await capture(`${viewport.width}-${name}`);}
  await page.close();page=null;
 }
 assert.deepEqual(result.errors,[]);result.status='passed';
}catch(e){result.status=browser?'failed':'blocked';result.error=String(e.stack);process.exitCode=1;console.error(e);}
finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log('CANADA_FOLLOWUP_VERIFICATION '+JSON.stringify(result));await page?.close();await browser?.close();await new Promise(r=>server.close(r));}
