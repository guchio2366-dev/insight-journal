#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat} from 'node:fs/promises';
import {extname,join,resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist');
const output=resolve('review-artifacts/east-farm-water');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.gz':'application/gzip','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const sub=url.pathname.replace(/^\/insight-journal\//,'');
    if(sub.includes('..'))throw Error('invalid path');
    const filename=join(root,sub.endsWith('/')?sub+'index.html':sub);
    const body=await readFile(filename);
    res.writeHead(200,{'content-type':mime[extname(filename)]??'application/octet-stream'});
    res.end(body);
  }catch{res.writeHead(404);res.end();}
});

await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const executablePath=process.env.REVIEW_CHROME_PATH;
assert.ok(executablePath,'Use the CI runner Chrome');
const browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true});
try{
  await mkdir(output,{recursive:true});
  const page=await browser.newPage({viewport:{width:1536,height:1000},deviceScaleFactor:1});
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const results=[];
  for(const [topic,name] of [['precipitation','east-asia-rainfall.png'],['basins','east-asia-basins.png']]){
    const url=`${origin}/insight-journal/atlas/asia/east-asia/nature/?topic=${topic}`;
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(topic=>{
      const root=document.querySelector('[data-asia-atlas]');
      if(root?.dataset.mapReady!=='true'||document.querySelector('[data-hydrology-panel]')?.hidden!==false||document.querySelector('[data-hydrology-legend]')?.hidden!==false)return false;
      if(document.querySelector('[data-hydrology-status]')?.textContent!=='')return false;
      return topic==='precipitation'?root.dataset.contourBandStatus==='ready':document.querySelector('[data-hydrology-detail]')?.options.length>1;
    },topic,{timeout:60000});
    await page.waitForLoadState('networkidle');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(new URL(page.url()).searchParams.get('topic'),topic);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const screenshot=join(output,name);
    await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
    results.push({name,bytes:(await stat(screenshot)).size,url:page.url(),legend:await page.locator('[data-hydrology-legend]').innerText()});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({head:process.env.GITHUB_SHA,images:results},null,2));
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
