/** Alternating cold-context main-thread measurements; neither server compresses responses. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const output=process.env.ATLAS_QA_OUTPUT??'/tmp/atlas-agriculture-followup';
await mkdir(output,{recursive:true});
const roots={before:path.resolve(process.env.ATLAS_QA_BASELINE_DIST??'/tmp/atlas-lightweight/baseline-dist'),after:path.resolve('dist')};
const servers={},origins={};
for(const [phase,root]of Object.entries(roots)){
 const server=createServer(async(req,res)=>{try{
  let pathname=new URL(req.url,'http://local').pathname.replace(/^\/insight-journal/,'');if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);assert(file.startsWith(root+'/'));
  const bytes=await readFile(file);res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.geojson':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]??'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));servers[phase]=server;origins[phase]=`http://127.0.0.1:${server.address().port}`;
}
const result={conditions:'Same cloud Chromium process; fresh context per sample; alternating AB/BA order; no concurrent task-owned test/build jobs; raw no-store loopback HTTP; one warm-up pair per viewport excluded; same root-ready + 1000ms sampling point; CDP TaskDuration with timeTicks (main-thread task duration, not a CPU profiler)',samplesPerVersionPerViewport:9,runs:[],sandbox:{requested:true,executable:'/usr/bin/chromium',launchMode:'headless'},sourceSHA256:createHash('sha256').update(await readFile('src/scripts/atlas-explorer.ts')).digest('hex')};
let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,chromiumSandbox:true,env:{...process.env,XDG_CONFIG_HOME:'/tmp/insight-chromium-config',XDG_CACHE_HOME:'/tmp/insight-chromium-cache'},ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 result.browser=browser.version();const browserCDP=await browser.newBrowserCDPSession();
 const command=await browserCDP.send('Browser.getBrowserCommandLine');result.sandbox.prohibitedArguments=command.arguments.filter(arg=>/^--(?:no-sandbox|disable-setuid-sandbox|disable-gpu-sandbox|disable-seccomp-filter-sandbox|disable-namespace-sandbox|disable-web-security|ignore-certificate-errors|unsafely-disable-devtools-self-xss-warnings)(?:=|$)/.test(arg));assert.deepEqual(result.sandbox.prohibitedArguments,[]);
 const diagnostic=await browser.newPage();await diagnostic.goto('chrome://sandbox');result.sandbox.diagnostics=await diagnostic.locator('body').innerText();await diagnostic.close();
 for(const size of [{width:1896,height:996,dpr:1},{width:1280,height:665,dpr:1.5}])for(let repeat=-1;repeat<9;repeat++){
  for(const phase of repeat%2===0?['before','after']:['after','before']){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr});const page=await context.newPage(),errors=[],httpErrors=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).pathname.startsWith('/insight-journal/'))httpErrors.push({url:response.url(),status:response.status()});});
   const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable',{timeDomain:'timeTicks'});await cdp.send('Network.enable');let transferred=0;cdp.on('Network.loadingFinished',e=>transferred+=e.encodedDataLength);
   await page.goto(origins[phase]+'/insight-journal/atlas/north-america/agriculture/',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>document.querySelector('[data-atlas-explorer]')?.dataset.renderState==='ready');await page.waitForTimeout(1000);
   const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
   const state=await page.evaluate(()=>({dpr:devicePixelRatio,scale:visualViewport.scale,field:document.querySelector('[data-atlas-explorer]').dataset.field,requests:performance.getEntriesByType('resource').filter(e=>/\/(agriculture.geojson|crop-labels.json)$/.test(e.name)).map(e=>new URL(e.name).pathname)}));
   assert.deepEqual(errors,[]);assert.deepEqual(httpErrors,[]);assert.equal(state.field,'agriculture');assert.equal(state.dpr,size.dpr);assert.equal(state.scale,1);assert.equal(state.requests.length,2);
   for(const name of ['agriculture.geojson','crop-labels.json'])assert.equal(state.requests.filter(url=>url.endsWith('/'+name)).length,1);
   if(repeat>=0)result.runs.push({phase,size,repeat,transferred,taskMs:metrics.TaskDuration*1000,scriptMs:metrics.ScriptDuration*1000,layoutMs:metrics.LayoutDuration*1000,...state});
   await context.close();console.log(size.width,repeat,phase,Math.round(metrics.TaskDuration*1000));
  }
 }
 const summary=values=>{const a=[...values].sort((a,b)=>a-b),mean=a.reduce((x,y)=>x+y,0)/a.length;return{n:a.length,min:a[0],median:a[Math.floor(a.length/2)],max:a.at(-1),mean,standardDeviation:Math.sqrt(a.reduce((sum,x)=>sum+(x-mean)**2,0)/a.length)};};
 result.summary=[1896,1280].map(width=>({width,...Object.fromEntries(['before','after'].map(phase=>[phase,summary(result.runs.filter(r=>r.size.width===width&&r.phase===phase).map(r=>r.taskMs))]))}));result.status='passed';
}catch(error){result.status='failed';result.error=error.stack;process.exitCode=1;console.error(error);}
finally{await writeFile(path.join(output,'agriculture-startup.json'),JSON.stringify(result,null,2)+'\n');await browser?.close();await Promise.all(Object.values(servers).map(server=>new Promise(resolve=>server.close(resolve))));}
