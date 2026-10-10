#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import config from '../astro.config.mjs';
import {africaIndustryLocations} from '../src/data/atlas/africa-industry-locations.ts';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist'),output=path.resolve(process.env.AFRICA_INDUSTRY_OUTPUT||path.join(root,'review-artifacts/africa-industry-review'));
const base=String(config.base??'').replace(/\/$/,''),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'running',scope:'Local production build; PC 1024/1440 and emulated touch mobile 390; no merge or deployment.',cases:[],screenshots:[]};
await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(base&&url.startsWith(base))url=url.slice(base.length);if(url.endsWith('/'))url+='index.html';const file=path.resolve(dist,'.'+url);assert(file.startsWith(dist+path.sep));const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[path.extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end('missing');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}${base}`;
const browser=await chromium.launch({executablePath:process.env.AFRICA_REVIEW_CHROME_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
async function settle(page){await page.waitForFunction(()=>document.querySelector('[data-africa-atlas]')?.dataset.initialized==='true');await page.evaluate(()=>document.fonts.ready);}
async function picture(page,profile,scene){const file=`${profile}-${scene}.png`;await page.screenshot({path:path.join(output,file),fullPage:false});report.screenshots.push(file);}
async function labels(page){return page.locator('[data-africa-industry-location]').evaluateAll(nodes=>nodes.map(n=>{const b=n.querySelector('text').getBoundingClientRect(),p=[...n.querySelectorAll('circle')].find(n=>n.getAttribute('fill')!=='transparent').getBoundingClientRect();return {id:n.getAttribute('data-africa-industry-location'),x:b.x,y:b.y,w:b.width,h:b.height,px:p.x+p.width/2,py:p.y+p.height/2};}));}
function noOverlaps(rows){for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`labels overlap: ${a.id}/${b.id}`);assert(!(a.px>b.x-3&&a.px<b.x+b.w+3&&a.py>b.y-3&&a.py<b.y+b.h+3),`point covered: ${a.id}/${b.id}`);}}
try{
 for(const [profile,width,height,mobile] of [['1024',1024,768,false],['1440',1440,900,false],['390',390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/atlas/africa/?field=industry');await settle(page);assert.equal(await page.locator('[data-africa-industry-location]').count(),7);await picture(page,profile,'initial');const rows=await labels(page);noOverlaps(rows);
  const mapBox=await page.locator('.africa-map').boundingBox();for(const b of rows)assert(b.x>=mapBox.x-1&&b.x+b.w<=mapBox.x+mapBox.width+1&&b.y>=mapBox.y-1&&b.y+b.h<=mapBox.y+mapBox.height+1,`label outside map: ${b.id}`);
  for(const item of africaIndustryLocations){const node=page.locator(`[data-africa-industry-location="${item.id}"]`);await node.locator('circle').last().click();assert.equal(new URL(page.url()).searchParams.get('industryLocation'),item.id);await node.locator('text').click();assert.equal(new URL(page.url()).searchParams.get('industryLocation'),item.id);assert.equal(await node.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-africa-industry-location]').count(),7);assert.equal(await page.locator('[data-theme-takeaway-detail]').innerText(),item.reading);const links=await page.locator('[data-theme-details] a').evaluateAll(nodes=>nodes.map(n=>n.href));for(const source of item.sources)assert(links.includes(source.url));noOverlaps(await labels(page));}
  await page.goBack();assert.equal(new URL(page.url()).searchParams.get('industryLocation'),'casablanca-industry');await page.goForward();await page.reload();await settle(page);assert.equal(await page.locator('[data-africa-industry-location="lagos"]').getAttribute('aria-pressed'),'true');
  const keyboard=page.locator('[data-africa-industry-location="jwaneng-diamonds"]');await keyboard.focus();await page.keyboard.press('Space');assert.equal(new URL(page.url()).searchParams.get('industryLocation'),'jwaneng-diamonds');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-africa-industry-location')),'jwaneng-diamonds');await page.locator('.africa-map').scrollIntoViewIfNeeded();await picture(page,profile,'diamonds');
  assert((await page.locator('[data-theme-takeaway-detail]').innerText()).includes('ボツワナ全国'));await page.locator('[data-africa-industry-return]').click();assert(!new URL(page.url()).searchParams.has('industryLocation'));assert.equal(await page.locator('[data-africa-industry-location]').count(),7);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');assert.deepEqual(errors,[]);report.cases.push({profile,status:'passed',mapBox,labels:rows,checks:['all seven normal clicks and source text/links','label and point overlap','keyboard and retained focus','history and reload','national diamond scope','overview return','no horizontal overflow or JS errors']});await context.close();
 }
 report.status='passed';
}catch(e){report.status='failed';report.error=e.stack;process.exitCode=1;console.error(e);}finally{await writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({status:report.status,output}));}
