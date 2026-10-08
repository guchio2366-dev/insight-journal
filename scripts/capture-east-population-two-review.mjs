#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat} from 'node:fs/promises';
import {extname,join,resolve} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('dist');
const output=resolve('review-artifacts/east-population-two');
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
  for(const [topic,title,name] of [
    ['ethnicity','民族の居住域','east-asia-ethnicity.png'],
    ['religion','宗教と結びついた居住域','east-asia-religion.png']
  ]){
    const url=`${origin}/insight-journal/atlas/asia/east-asia/population/?topic=${topic}`;
    await page.goto(url,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(([topic,title])=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true'&&document.querySelector('[data-map-title]')?.textContent===title&&document.querySelector(`[data-settlement-legend="${topic}"]`)?.hidden===false&&document.querySelectorAll('.asia-settlement-label:not([hidden])').length>0,[topic,title],{timeout:60000});
    await page.waitForLoadState('networkidle');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(new URL(page.url()).searchParams.get('topic'),topic);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const screenshot=join(output,name);
    await page.screenshot({path:screenshot,fullPage:true,animations:'disabled'});
    results.push({name,bytes:(await stat(screenshot)).size,url:page.url(),labels:await page.locator('.asia-settlement-label:not([hidden])').count(),legend:await page.locator(`[data-settlement-legend="${topic}"]`).innerText()});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({head:process.env.GITHUB_SHA,chrome:executablePath,images:results},null,2));
}finally{
  await browser.close();
  await new Promise(done=>server.close(done));
}
