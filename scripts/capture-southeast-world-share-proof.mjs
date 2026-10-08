import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const site=path.resolve(process.argv[2]??'site');
const output=path.resolve('review-artifacts/southeast-world-share');
const expected='a589e0270c4077f1e8c65172651f9d100d6d5424';
const command=promisify(execFile);
const git=async args=>(await command('git',args,{cwd:site})).stdout.trim();
const {chromium}=await import(pathToFileURL(path.join(site,'node_modules/playwright/index.mjs')).href);
const {default:config}=await import(pathToFileURL(path.join(site,'astro.config.mjs')).href);
const base='/'+String(config.base??'').replace(/^\/+|\/+$/g,'');
const metadata={status:'running',sourceHead:await git(['rev-parse','HEAD']),expectedSourceHead:expected,diagnosticCommit:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,sourceWorkingTree:await git(['status','--porcelain','--untracked-files=all']),viewport:{width:1440,height:1000},fontMatch:process.env.REVIEW_JAPANESE_FONT_MATCH,externalAttempts:[],errors:[],failedRequests:[]};
assert.equal(metadata.sourceHead,expected);assert.equal(metadata.sourceWorkingTree,'');assert(process.env.REVIEW_CHROME_PATH);assert(metadata.fontMatch?.trim());
await mkdir(output,{recursive:true});
const persist=()=>writeFile(path.join(output,'metadata.json'),JSON.stringify(metadata,null,2)+'\n');
const root=await realpath(path.join(site,'dist'));
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.png':'image/png','.svg':'image/svg+xml','.gz':'application/gzip','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{try{assert(['GET','HEAD'].includes(req.method));let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);assert(pathname.startsWith(base+'/'));pathname=pathname.slice(base.length);let file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+path.sep));if((await stat(file)).isDirectory())file=path.join(file,'index.html');file=await realpath(file);assert(file.startsWith(root+path.sep));const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404).end('Missing local build asset');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.REVIEW_CHROME_PATH,headless:true,chromiumSandbox:true});
 metadata.browser={version:browser.version(),chromiumSandbox:true,additionalFlags:[],certificateExceptions:false};
 const context=await browser.newContext({viewport:metadata.viewport,deviceScaleFactor:1,isMobile:false,hasTouch:false,serviceWorkers:'block'});
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin){metadata.externalAttempts.push(url.origin+url.pathname);await route.abort('blockedbyclient');return;}await route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>metadata.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)metadata.failedRequests.push({status:r.status(),url:r.url()});});
 await page.goto(origin+base+'/atlas/asia/southeast-asia/agriculture/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
 const panel=page.locator('[data-southeast-world-share]');await panel.locator('summary').click();
 assert.equal(await panel.locator('tbody tr').count(),9);
 const text=await panel.innerText();assert.match(text,/米・トウモロコシ・大豆/);assert.match(text,/インドネシア/);assert.match(text,/ベトナム/);assert.match(text,/タイ/);assert.match(text,/輸出先・輸出量・国内向けの割合ではありません/);
 const cells=await panel.locator('tbody tr').allTextContents();assert(cells.some(row=>row.includes('米')&&row.includes('7.08%')));
 const href=await panel.locator('a[href$="world-shares.json"]').getAttribute('href');const response=await context.request.get(origin+href);assert.equal(response.status(),200);const data=await response.json();assert.deepEqual(data.series.map(row=>row.itemCode),['27','56','236']);assert.equal(data.series[0].years.length,10);assert.equal(data.series[0].years.find(row=>row.year===2020).reportedRegion.complete,false);
 await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 assert.equal(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth),false);
 const png=await panel.screenshot({animations:'disabled'});assert(png.length>20000);await writeFile(path.join(output,'world-share-panel.png'),png);
 metadata.panel={rows:cells.length,sourceHref:href,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex'),box:await panel.boundingBox()};
 assert.deepEqual(metadata.externalAttempts,[]);assert.deepEqual(metadata.errors,[]);assert.deepEqual(metadata.failedRequests,[]);metadata.status='passed';await context.close();
}catch(e){metadata.status='failed';metadata.failure=e.stack??String(e);process.exitCode=1;}
finally{await browser?.close();await new Promise(resolve=>server.close(resolve));metadata.completedAt=new Date().toISOString();await persist();}
console.log(JSON.stringify(metadata,null,2));
