import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const dir=resolve('dist'),out=resolve(process.env.US_AGRO_REVIEW_OUT??'review-artifacts/us-agro-20261016');
await mkdir(out,{recursive:true});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),sandbox:true,deviceScaleFactor:1.5,viewports:[{width:1896,height:996},{width:1280,height:665}],captures:[],pageErrors:[],status:'running'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/insight-journal\//,'');let file=resolve(dir,path);
  if(!file.startsWith(dir+sep))throw Error('Outside build');
  if((await stat(file)).isDirectory())file=resolve(file,'index.html');
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 assert.equal(JSON.parse(await readFile(resolve(dir,'_release.json'),'utf8')).commitSha,report.head);
 browser=await chromium.launch({headless:true,chromiumSandbox:true,executablePath:process.env.REVIEW_CHROME_PATH,ignoreDefaultArgs:['--unsafely-disable-devtools-self-xss-warnings']});
 const context=await browser.newContext({deviceScaleFactor:1.5,locale:'ja-JP',reducedMotion:'reduce'}),page=await context.newPage();
 page.on('pageerror',error=>report.pageErrors.push(String(error)));
 const cases=[['overview',null],...['corn','soybean','wheat','cotton','rice','beef','dairy','hogs','broilers','layers'].map(id=>[id,`product:${id}`]),...['industrial-roundwood','sawnwood','wood-pulp'].map(id=>[id,'forestry:timber'])];
 for(const viewport of report.viewports){
  await page.setViewportSize(viewport);
  for(const [id,reading] of cases){
   const url=new URL(`http://127.0.0.1:${server.address().port}/insight-journal/atlas/north-america/agriculture/`);
   if(reading)url.searchParams.set('agriReading',reading);
   await page.goto(url.href,{waitUntil:'networkidle'});
   await page.locator('[data-atlas-explorer][data-render-state="ready"]').waitFor();
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>scrollTo(0,0));
   assert.equal(await page.locator('[data-fallback]').isVisible(),false,'Actual MapLibre must be ready');
   assert.equal(await page.evaluate(()=>devicePixelRatio),1.5);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
   const frame=await page.locator('[data-map-frame]').boundingBox();assert.ok(frame.width>400&&frame.height>200);
   const prefix=`${viewport.width}x${viewport.height}-${id}`;
   await page.screenshot({path:resolve(out,prefix+'-map.png')});
   const record={id,viewport,dpr:1.5,frame,columns:null};report.captures.push(record);
   if(!reading){assert.equal(await page.locator('[data-agri-statistics]').isVisible(),false);assert.equal(await page.locator('[data-forest-statistics]').isVisible(),false);continue;}
   const forest=reading==='forestry:timber';
   const panel=forest?page.locator(`[data-us-forest-product="${id}"]`):page.locator(`[data-agri-statistics-panels]>[data-stat-panel="${id}"],[data-agri-statistics-panels]>[data-livestock-stat-panel="${id}"]`);
   if(forest)await panel.locator(':scope>summary').click();
   const columns=forest?panel.locator('.us-forest-columns'):panel;
   record.columns=await columns.evaluate(node=>({template:getComputedStyle(node).gridTemplateColumns,rect:{top:node.getBoundingClientRect().top,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right},children:[...node.children].filter(n=>getComputedStyle(n).display!=='none').map(n=>({left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right}))}));
   assert.equal(record.columns.template.split(' ').length,3,'Three columns at both agreed sizes');
   assert.ok(record.columns.rect.top>=frame.y+frame.height,'Statistics stay below the map');
   for(const box of record.columns.children)assert.ok(box.left>=0&&box.right<=viewport.width+1);
   await panel.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:resolve(out,prefix+'-statistics.png')});
   if(id==='dairy'){
    await page.locator('[data-milk-basis="skim"]').click();assert.equal(await page.locator('[data-milk-panel="skim"]').isVisible(),true);
    assert.match(await page.locator('[data-milk-panel="skim"]').textContent(),/20.7%/);
   }
   await page.locator('[data-agri-overview-button]').click();
   assert.equal(await page.locator('[data-agri-statistics]').isVisible(),false);assert.equal(await page.locator('[data-forest-statistics]').isVisible(),false);
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('[data-agri-overview]').isVisible(),true);
  }
 }
 assert.deepEqual(report.pageErrors,[]);report.status='passed';
}catch(error){report.status='failed';report.error=String(error);process.exitCode=1;}
finally{if(browser)await browser.close();await new Promise(r=>server.close(r));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
console.log(`${report.status}: ${resolve(out,'report.json')}`);
