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
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),viewport:{width:1920,height:1080},dpr:1,sandbox:true,captures:[],errors:[],status:'running'};
let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));
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
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:resolve(out,`${target}-${name}.jpg`),type:'jpeg',quality:85});
   report.captures.push({target,name,url:page.url(),frame,dpr:await page.evaluate(()=>devicePixelRatio),render:await page.locator('[data-atlas-explorer]').getAttribute('data-render-state')});
  }
 }
 assert.deepEqual(report.errors,[]);report.status='passed';
}catch(error){report.status='failed';report.error=String(error);throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server.close();}
