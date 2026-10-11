// Changed views only; use an existing local production preview and browser.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const base=new URL(process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4321/insight-journal/');
assert.equal(base.protocol,'http:');
assert.ok(['localhost','127.0.0.1'].includes(base.hostname));
const output=process.env.EUROPE_REVIEW_OUTPUT??'/tmp/europe-handoff-review';
const gitHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const expectedHead=process.env.EUROPE_REVIEW_EXPECTED_HEAD??null;
if(expectedHead)assert.equal(gitHead,expectedHead);
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block'});
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  return url.origin===base.origin?route.continue():route.abort('blockedbyclient');
});
const page=await context.newPage(),errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
async function open(field,layer,render='auto'){
  await page.goto(new URL(`atlas/europe/${field}/?layer=${layer}${render==='static'?'&render=static':''}`,base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  if(render==='auto')await page.locator('[data-eu-live].is-ready').waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  assert.equal(await page.evaluate(()=>devicePixelRatio),1);
  assert.equal(await page.evaluate(()=>visualViewport.scale),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
try{
  for(const render of ['auto','static']){
    await open('nature','water',render);
    const labels=await page.locator('[data-eu-river-label]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.euRiverLabel,hidden:node.hidden,rect:node.getBoundingClientRect().toJSON()})));
    assert.equal(labels.length,22);
    assert.deepEqual(labels.filter(item=>item.hidden).map(item=>item.id),[]);
    assert.ok(labels.every(item=>item.rect.bottom<=1080),'every river name fits the PC viewport');
    const intersect=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)assert.equal(intersect(labels[i].rect,labels[j].rect),false,`${labels[i].id}/${labels[j].id}`);
    const box=await page.locator('[data-eu-static]').getAttribute('viewBox');
    await page.locator('[data-eu-river-label=loire]').click();
    assert.equal(new URL(page.url()).searchParams.get('feature'),'loire');
    assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),box);
    assert.match(await page.locator('[data-eu-subject-reader]').innerText(),/ロワール川/);
    if(render==='static'){
      const point=await page.locator('[data-eu-major-river=po]').first().evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()*.5).matrixTransform(path.getScreenCTM());return {x:p.x,y:p.y};});
      await page.mouse.click(point.x,point.y);
    }else await page.locator('[data-eu-river-label=po]').click();
    assert.equal(new URL(page.url()).searchParams.get('feature'),'po');
    assert.match(await page.locator('[data-eu-subject-reader]').innerText(),/ポー川/);
    if(render==='auto'){
      await page.screenshot({path:`${output}/rivers-22-1920x1080.png`});
      // A displaced additional name has an anchor on a retained line and no
      // button covering the anchor. Exercise the live river hit layer there.
      const anchor=await page.locator('[data-eu-river-leader]').evaluateAll(lines=>{
        const line=lines.find(line=>line.style.display!=='none'&&!['rhine','danube','seine','thames'].includes(line.dataset.euRiverLeader));
        if(!line)return null;
        const rect=line.ownerSVGElement.getBoundingClientRect();
        return {id:line.dataset.euRiverLeader,x:rect.left+Number(line.getAttribute('x1')),y:rect.top+Number(line.getAttribute('y1'))};
      });
      assert.ok(anchor,'a river label was displaced with a leader');
      await page.mouse.click(anchor.x,anchor.y);
      assert.equal(new URL(page.url()).searchParams.get('feature'),anchor.id);
      checks.push({topic:'water',render,liveDirectLineHit:anchor.id});
    }
    checks.push({topic:'water',render,labels:labels.length,noCollisions:true,labelClick:'loire',selection:'po',staticDirectLineHit:render==='static',noAutomaticZoom:true});
  }
  for(const [genre,ids,selected] of [['livestock',['cattle','pig','chicken','sheep'],'cattle'],['horticulture',['citrus','temperatefruit','vegetables'],'citrus']]){
    await open('agriculture',genre);
    assert.deepEqual(await page.locator('[data-eu-farm-secondary]').evaluateAll(nodes=>nodes.filter(node=>node.style.display!=='none').map(node=>node.dataset.euFarmSecondary).sort()),[...ids].sort());
    await page.locator(`[data-eu-map-place=${selected}][data-eu-map-kind=crop]`).click();
    assert.deepEqual(await page.locator('[data-eu-farm-area]').evaluateAll(nodes=>nodes.filter(node=>node.style.display!=='none').map(node=>node.dataset.euFarmArea).sort()),[...ids].sort());
    const otherLabelOpacity=await page.locator('.eu-crop-label.is-muted:visible').evaluateAll(nodes=>nodes.map(node=>Number(getComputedStyle(node).opacity)));
    assert.ok(otherLabelOpacity.length>=2&&otherLabelOpacity.every(value=>value>=.8),'other product names remain legible after selection');
    await page.screenshot({path:`${output}/${genre}-contours-1920x1080.png`});
    checks.push({topic:genre,otherItemsRetained:true,secondaryItems:ids,selected,otherLabelOpacity});
  }
  await open('population','ethnicity');
  assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),'0 0 1200 1001');
  assert.equal(await page.locator('[data-culture-case]').inputValue(),'');
  await page.screenshot({path:`${output}/ethnicity-europe-extent-1920x1080.png`});
  checks.push({topic:'ethnicity',automaticEnglandWalesZoom:false,wholeEuropeDistributionComplete:false});
  for(const render of ['auto','static']){
    await open('population','religion',render);
    assert.equal(await page.locator('[data-eu-smre-key]').isVisible(),true);
    assert.match(await page.locator('[data-eu-map-status]').textContent(),/45か国.*8分類/s);
    assert.equal(await page.locator('[data-eu-pew-marker]:visible').count(),0);
    assert.equal(await page.locator('[data-culture-code]').count(),0,'the country overview is not covered by ONS local data');
    const fills=await page.locator('[data-eu-shape]').evaluateAll(nodes=>Object.fromEntries(nodes.map(node=>[node.dataset.euShape,node.style.fill])));
    assert.equal(fills.POL,fills.ITA);assert.equal(fills.SWE,fills.NOR);assert.equal(fills.RUS,fills.GRC);
    assert.notEqual(fills.POL,fills.SWE);assert.notEqual(fills.DEU,fills.CZE);
    const box=await page.locator('[data-eu-static]').getAttribute('viewBox');
    await page.locator('[data-eu-religion-country]').selectOption('DEU');
    assert.match(await page.locator('[data-eu-smre-reading=DEU]').textContent(),/ドイツ.*SMRE 2010期/);
    assert.match(await page.locator('[data-eu-religion-evidence-reading]').textContent(),/カトリック 30.2%.*プロテスタント 29.2%.*宗教的帰属なし 33.1%/s);
    assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),box);
    await page.locator('[data-eu-religion-back]').click();
    if(render==='auto'){
      const bounds=await page.locator('[data-eu-smre-key]').boundingBox();
      assert.ok(bounds.y+bounds.height<=1080,'the confessional map and complete key fit the PC viewport');
      await page.screenshot({path:`${output}/religion-confessions-45-1920x1080.png`});
    }
    await page.locator('[data-eu-religion-country]').selectOption('SRB');
    await page.locator('[data-eu-religion-local=religion-subotica]').click();
    assert.match(await page.locator('[data-eu-religion-evidence-reading]').textContent(),/59,748人.*37,674人/s);
    await page.locator('[data-eu-religion-back]').click();
    await page.locator('[data-eu-pew-surface-group=unaffiliated]').click();
    assert.equal(await page.locator('[data-eu-pew-map-key]').isVisible(),true);
    await page.locator('[data-eu-religion-national=religion-national-serbia]').click();
    assert.equal(new URL(page.url()).searchParams.get('place'),'SRB');
    assert.match(await page.locator('[data-eu-religion-evidence-reading]').textContent(),/5,387,426人/);
    await page.locator('[data-eu-religion-back]').click();
    await page.locator('[data-eu-smre-overview]').click();
    assert.equal(await page.locator('[data-eu-smre-key]').isVisible(),true);
    assert.equal(await page.locator('[data-eu-pew-marker]:visible').count(),0);
    assert.equal(await page.locator('[data-eu-static]').getAttribute('viewBox'),box);
    checks.push({topic:'religion',render,smreCountries:45,denominations:true,originalEightCategories:true,regionalEvidenceRetained:true,pewRetained:true,noAutomaticZoom:true});
  }
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/checks.json`,JSON.stringify({gitHead,expectedHead,gitStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}),scriptSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),browserVersion:browser.version(),viewport:{width:1920,height:1080},deviceScaleFactor:1,zoom:1,checks,errors},null,2)+'\n');
  console.log(JSON.stringify({passed:true,output,checks}));
}finally{await browser.close();}
