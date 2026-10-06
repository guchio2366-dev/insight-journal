import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';

// This suite uses the real production build and browser, including MapLibre.
// Run after npm run build:
// ATLAS_ASIA_BROWSER=1 REVIEW_CHROME_PATH=/usr/bin/chromium node --test tests/e2e/atlas-asia-industry-status.test.mjs
// Keep it explicit: the regular happy-dom suite also runs where Chromium is absent.
const enabled=process.env.ATLAS_ASIA_BROWSER==='1';
// The isolated review container has no configured SUID sandbox. Opt in only
// when that limitation has been checked; never change machine permissions.
const chromiumSandbox=process.env.ATLAS_ASIA_BROWSER_UNSANDBOXED!=='1';
const basePath='/insight-journal';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.gz':'application/gzip'};

async function serveBuild(){
 const root=path.resolve('dist');
 await readFile(path.join(root,'atlas/asia/east-asia/industry/index.html'));
 const server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   if(!pathname.startsWith(basePath+'/')){res.writeHead(404).end();return;}
   const relative=pathname.slice(basePath.length)+(pathname.endsWith('/')?'index.html':'');
   const file=path.resolve(root,'.'+relative);
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
   const body=await readFile(file);
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end('Missing built asset');}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {server,origin:`http://127.0.0.1:${server.address().port}${basePath}`};
}

function industryTable(page,caption){
 return page.locator('[data-industry-content] table').filter({has:page.locator('caption').filter({hasText:caption})});
}
function tableRow(page,table,name){
 return table.locator('tbody tr').filter({has:page.getByRole('rowheader',{name,exact:true})});
}
async function openDetails(details){
 if(!await details.evaluate(node=>node.open))await details.locator(':scope > summary').click();
}
async function ready(page){
 await page.waitForFunction(()=>document.querySelector('[data-industry-detail]')?.options.length>1&&document.querySelector('[data-industry-status]')?.textContent==='');
 await page.locator('[data-industry-content] table').first().waitFor({state:'attached'});
}
async function assertSelected(page,name,label){
 await page.waitForFunction(({name,label})=>{
  const text=document.querySelector('[data-industry-value]')?.textContent??'';
  return text.includes(name)&&text.includes(label);
 },{name,label});
 const value=await page.locator('[data-industry-value]').textContent();
 assert.equal(await page.locator('[data-grid-reading]').textContent(),value,'map selection and detailed value agree');
 assert.match(value,new RegExp(label));
 const selectedOption=await page.locator('[data-industry-detail]').evaluate(select=>select.selectedOptions[0]?.textContent??'');
 assert.ok(selectedOption.includes(name)&&selectedOption.includes(label),'the region picker shows the same publication state');
 if(['秘匿','該当なし'].includes(label)){
  assert.doesNotMatch(value,/未掲載|：0(?:\s|$)/,'a nonnumeric source marker is never missing or zero');
  assert.doesNotMatch(await page.locator('[data-industry-lead]').textContent(),/\d+番目/,'nonnumeric values have no rank');
 }
}
async function assertJapanTables(page,sectorName,prefecture,label){
 const sectors=industryTable(page,/^24業種の製造品出荷額等/);
 assert.equal(await sectors.locator('tbody tr').count(),24);
 await openDetails(page.locator('[data-industry-content] details').filter({has:page.locator('caption').filter({hasText:/^公表値の推移/})}));
 for(const [table,name] of [[sectors,sectorName],[industryTable(page,/^国内の地域を同じ年で比較する/),prefecture],[industryTable(page,/^公表値の推移/),'2024']]){
  const row=tableRow(page,table,name);
  assert.equal(await row.count(),1,`${name} is present once`);
  assert.match(await row.locator('td').textContent(),new RegExp(label));
  if(['秘匿','該当なし'].includes(label)){
   assert.doesNotMatch(await row.locator('td').textContent(),/未掲載/);
   assert.equal(await row.locator('.industry-bar').count(),0,'nonnumeric values have no numeric bar');
  }
 }
 assert.ok(await tableRow(page,industryTable(page,/^公表値の推移/),'2024').isVisible(),'the annual value can be opened by the reader');
}
async function assertStatusLegend(page,selector){
 await page.locator(selector).locator('span').first().waitFor({state:'attached'});
 const text=await page.locator(selector).textContent();
 for(const label of ['秘匿','該当なし','未掲載'])assert.ok(text.includes(label),`${selector} explains ${label}`);
 assert.doesNotMatch(text,/統計未取得/,'gray is not universally called an unfetched statistic');
}
async function assertCurrentTopicChip(page,id,title){
 const chip=page.locator('[data-industry-current-feature]:visible');
 assert.equal(await chip.count(),1,'the current non-featured topic appears exactly once');
 assert.equal(await chip.getAttribute('data-industry-feature'),id);
 assert.equal(await chip.getAttribute('aria-pressed'),'true');
 assert.equal(await chip.textContent(),title,'the current chip keeps the official statistical topic name');
}

test('real browser: Asia industry preserves source publication status across controls, tables and return navigation',{
 skip:enabled?false:'Set ATLAS_ASIA_BROWSER=1 after npm run build to run real Chromium acceptance.',
 timeout:180000,
},async t=>{
 const {chromium}=await import('playwright');
 const {server,origin}=await serveBuild();
 let browser;
 try{
  // No certificate exceptions or custom renderer.
  browser=await chromium.launch({headless:true,chromiumSandbox,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  const manifest=JSON.parse(await readFile('public/assets/atlas/asia-industry-v1/manifest.json','utf8'));
  const east=JSON.parse(gunzipSync(await readFile('public/assets/atlas/asia-industry-v1/'+manifest.regions['east-asia'].data)));
  const sectorName=manifest.regions['east-asia'].topics.find(topic=>topic.id==='jp-20').title.replace('日本：','');
  const sourceValues=east.admin.filter(row=>row.country==='JPN').map(row=>({name:row.name,...row.series['jp-20'].find(value=>value.year==='2024')}));
  const rankedNames=sourceValues.filter(row=>row.value!==null).sort((a,b)=>b.value-a.value).map(row=>row.name);
  for(const profile of [{name:'desktop',viewport:{width:1440,height:1000}},{name:'laptop',viewport:{width:1024,height:768}},{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
   await t.test(profile.name,async profileTest=>{
    const {name:profileName,...options}=profile;
    const context=await browser.newContext(options);
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    try{
     await page.goto(`${origin}/atlas/asia/east-asia/industry/?topic=jp-20&place=JPN&detail=JP-23`,{waitUntil:'domcontentloaded'});
     await ready(page);
     await openDetails(page.locator('[data-reading-details]'));
     await assertCurrentTopicChip(page,'jp-20',manifest.regions['east-asia'].topics.find(topic=>topic.id==='jp-20').title);
     for(const [id,name,label] of [['JP-23','愛知県','22,155'],['JP-43','熊本県','秘匿'],['JP-42','長崎県','該当なし']]){
      await page.locator('[data-industry-detail]').selectOption(id);
      await assertSelected(page,name,label);
      assert.equal(new URL(page.url()).searchParams.get('detail'),id);
      assert.equal(new URL(page.url()).searchParams.get('place'),'JPN');
      assert.equal(new URL(page.url()).searchParams.get('topic'),'jp-20');
      await assertJapanTables(page,sectorName,name,label);
      const domestic=industryTable(page,/^国内の地域を同じ年で比較する/);
      const displayedNames=await domestic.locator('tbody th').allTextContents();
      assert.deepEqual(displayedNames.slice(0,rankedNames.length),rankedNames,'only numeric published values form the ordered comparison');
      assert.equal(displayedNames.length,47,'nonnumeric regions remain available after the numerical comparison');
     }
     await profileTest.test('detailed and main legends explain all nonnumeric statuses',async()=>{
      await assertStatusLegend(page,'[data-industry-scale]');
      await assertStatusLegend(page,'[data-reading-map-legend]');
     });
     const topic31=manifest.regions['east-asia'].topics.find(topic=>topic.id==='jp-31').title.replace('日本：','');
     await profileTest.test('24-sector buttons can be clicked and preserve the region',async()=>{
      await tableRow(page,industryTable(page,/^24業種の製造品出荷額等/),topic31).getByRole('button').click({timeout:5000});
      await assertSelected(page,'長崎県','511,044');
      await tableRow(page,industryTable(page,/^24業種の製造品出荷額等/),sectorName).getByRole('button').click({timeout:5000});
      await assertSelected(page,'長崎県','該当なし');
      assert.equal(new URL(page.url()).searchParams.get('topic'),'jp-20','24-sector links restore the topic and keep the region');
     });
     // An independently reported pointer/legend failure must not prevent the
     // URL, return-navigation and Malaysian-series acceptance checks.
     await page.goto(`${origin}/atlas/asia/east-asia/industry/?topic=jp-20&place=JPN&detail=JP-42`,{waitUntil:'domcontentloaded'});
     await ready(page);
     const beforeComparison=new URL(page.url());
     await page.locator('[data-dock-compare="population"]').click();
     await page.locator('[data-comparison-back]').waitFor({state:'visible'});
     await profileTest.test('comparison legend retains the original publication-status meaning',async()=>{
      await assertStatusLegend(page,'[data-comparison-compact] [data-comparison-compact-role="original"]');
     });
     assert.ok(new URL(page.url()).searchParams.get('back'),'the return state is encoded in the URL');
     await page.locator('[data-comparison-back]').click();
     await assertSelected(page,'長崎県','該当なし');
     for(const key of ['topic','place','detail','at'])assert.equal(new URL(page.url()).searchParams.get(key),beforeComparison.searchParams.get(key),`${key} survives comparison return`);
     await page.reload({waitUntil:'domcontentloaded'});
     await ready(page);await assertSelected(page,'長崎県','該当なし');
     assert.equal(await page.locator('[data-industry-detail]').inputValue(),'JP-42','URL reload restores the selected region');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');

     await page.goto(`${origin}/atlas/asia/southeast-asia/industry/?topic=my-p3&place=MYS&detail=MY-16`,{waitUntil:'domcontentloaded'});
     await ready(page);await openDetails(page.locator('[data-reading-details]'));
     await assertSelected(page,'プトラジャヤ','0');
     assert.match(await page.locator('[data-industry-value]').textContent(),/：0（公表値）/,'the selected 2025 value is published numeric zero');
     assert.match(await page.locator('[data-industry-detail]').evaluate(select=>select.selectedOptions[0].textContent),/0（公表値）/);
     assert.doesNotMatch(await page.locator('[data-industry-value]').textContent(),/未掲載|該当なし|秘匿/);
     const malaysiaHistory=industryTable(page,/^公表値の推移/);
     await openDetails(page.locator('[data-industry-content] details').filter({has:page.locator('caption').filter({hasText:/^公表値の推移/})}));
     assert.match(await tableRow(page,malaysiaHistory,'2023').locator('td').textContent(),/^未掲載/);
     assert.match(await tableRow(page,malaysiaHistory,'2025').locator('td').textContent(),/^0（公表値）/);
     assert.equal(await tableRow(page,malaysiaHistory,'2023').locator('.industry-bar').count(),0);
     assert.match(await tableRow(page,industryTable(page,/^国内の地域を同じ年で比較する/),'プトラジャヤ').locator('td').textContent(),/^0（公表値）/);
     assert.match(await page.locator('[data-industry-lead]').textContent(),/番目/,'published zero participates in numeric ranking');
     assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'annual tables stay within the page');
     assert.deepEqual(errors,[],'no browser runtime errors');
     profileTest.diagnostic(`${profileName}: JP published/confidential/not applicable, 24-sector values, numeric ranks, annual values, comparison return/reload and MY missing/published zero passed; legend and 24-sector pointer results are reported separately.`);
     const rendering=await page.locator('[data-asia-atlas]').evaluate(root=>({mapReady:root.dataset.mapReady??'false',fallbackHidden:root.querySelector('[data-map-fallback]').hidden}));
     profileTest.diagnostic(`${profileName}: rendering evidence ${JSON.stringify(rendering)}`);
     await profileTest.test('industry parent categories reveal matching child topics and keep unavailable construction disabled',async()=>{
      await page.goto(`${origin}/atlas/asia/east-asia/industry/?topic=manufacturing`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('[data-industry-content] table tbody tr')&&document.querySelector('[data-industry-status]')?.textContent==='');
      const parent=sector=>page.locator(`[data-industry-sector="${sector}"]`);
      const children=()=>page.locator('[data-industry-subsectors]:visible');
      await parent('manufacturing').click();
      assert.equal(await parent('manufacturing').getAttribute('aria-pressed'),'true');
      assert.equal(await children().count(),1);
      assert.equal(await children().getAttribute('data-industry-subsectors'),'manufacturing');
      assert.equal(new URL(page.url()).searchParams.get('sector'),'manufacturing');
      assert.equal(new URL(page.url()).searchParams.get('topic'),'manufacturing','the parent opens its displayed representative topic');
      assert.equal(await page.locator('[data-industry-current-feature]:visible').count(),0);
      await page.locator('[data-industry-feature="jp-31"]').click();
      await ready(page);
      assert.equal(new URL(page.url()).searchParams.get('topic'),'jp-31');
      assert.equal(new URL(page.url()).searchParams.get('place'),'JPN');
      assert.equal(await parent('manufacturing').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('[data-industry-feature="jp-31"]').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('[data-industry-current-map]').textContent(),/輸送用機械/);
      await parent('resources').click();
      assert.equal(new URL(page.url()).searchParams.get('sector'),'resources');
      assert.equal(new URL(page.url()).searchParams.get('topic'),'power-all','the resources parent opens its visible electricity child');
      assert.equal(await parent('resources').getAttribute('aria-pressed'),'true');
      assert.equal(await children().count(),1);
      assert.equal(await children().getAttribute('data-industry-subsectors'),'resources');
      assert.equal(await page.locator('[data-industry-feature="jp-31"]').isVisible(),false);
      await page.locator('[data-industry-feature="power-all"]').click();
      assert.equal(new URL(page.url()).searchParams.get('topic'),'power-all');
      assert.equal(await parent('resources').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('[data-industry-feature="power-all"]').getAttribute('aria-pressed'),'true');
      assert.match(await page.locator('[data-industry-current-map]').textContent(),/発電/);
      const construction=parent('construction-real-estate');
      assert.equal(await construction.isDisabled(),true,'an unavailable category cannot select a misleading map');
      assert.equal(await construction.getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('[data-industry-subsectors="construction-real-estate"]:visible').count(),0);
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('[data-industry-feature="power-all"]')?.getAttribute('aria-pressed')==='true');
      assert.equal(new URL(page.url()).searchParams.get('topic'),'power-all');
      assert.equal(await parent('resources').getAttribute('aria-pressed'),'true');
      assert.equal(await children().getAttribute('data-industry-subsectors'),'resources');
      await page.goto(`${origin}/atlas/asia/southeast-asia/industry/?topic=my-p4&place=MYS&detail=MY-16`,{waitUntil:'domcontentloaded'});
      await ready(page);
      assert.equal(await parent('construction-real-estate').isDisabled(),false,'construction is available where an actual statistical topic exists');
      assert.equal(await parent('construction-real-estate').getAttribute('aria-pressed'),'true');
      assert.equal(await children().getAttribute('data-industry-subsectors'),'construction-real-estate');
      await assertCurrentTopicChip(page,'my-p4',manifest.regions['southeast-asia'].topics.find(topic=>topic.id==='my-p4').title);
      assert.deepEqual(errors,[],'category navigation produces no browser runtime errors');
     });
    }finally{await context.close();}
   });
  }
  await t.test('failed industry request retries without changing selection or publication status',async()=>{
   const context=await browser.newContext();const page=await context.newPage();
   let fail=true,attempts=0;
   await page.route('**/assets/atlas/asia-industry-v1/east-asia.json.gz',async route=>{
    attempts++;if(fail)await route.fulfill({status:503,body:'Expected regression-test failure'});else await route.continue();
   });
   try{
    await page.goto(`${origin}/atlas/asia/east-asia/industry/?topic=jp-20&place=JPN&detail=JP-43`,{waitUntil:'domcontentloaded'});
    await openDetails(page.locator('[data-reading-details]'));
    await page.locator('[data-industry-retry]').waitFor({state:'visible'});
    assert.match(await page.locator('[data-industry-status]').textContent(),/取得できません/);
    const before=new URL(page.url());const failedAttempts=attempts;fail=false;
    await page.locator('[data-industry-retry]').click();
    await ready(page);await assertSelected(page,'熊本県','秘匿');
    assert.ok(attempts>failedAttempts,'retry performs a new request');
    assert.equal(await page.locator('[data-industry-retry]').isVisible(),false);
    for(const key of ['topic','place','detail'])assert.equal(new URL(page.url()).searchParams.get(key),before.searchParams.get(key));
    await assertJapanTables(page,sectorName,'熊本県','秘匿');
   }finally{await context.close();}
  });
  t.diagnostic(`Real Chromium ${browser.version()}; chromiumSandbox=${chromiumSandbox}; locally hosted production build; executed viewport profiles are reported above; no certificate exceptions.`);
 }finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
 }
});

// PC-only layout acceptance can run without rerunning the existing mobile suite:
// ATLAS_ASIA_DESKTOP_LAYOUT=1 REVIEW_CHROME_PATH=/usr/bin/chromium node --test tests/e2e/atlas-asia-industry-status.test.mjs
test('real browser: Asia desktop header controls match the US industry row structure',{
 skip:process.env.ATLAS_ASIA_DESKTOP_LAYOUT==='1'?false:'Set ATLAS_ASIA_DESKTOP_LAYOUT=1 after npm run build for PC-only layout acceptance.',
 timeout:180000,
},async t=>{
 const {chromium}=await import('playwright');
 const {server,origin}=await serveBuild();let browser;
 const settle=async page=>page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 const openAsia=async(page,route)=>{
  await page.goto(`${origin}/atlas/asia/${route}`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
  await settle(page);
 };
 const rects=async locator=>locator.evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};}));
 const sameRow=(boxes,label)=>{
  assert.ok(boxes.length>1&&boxes.every(box=>box.width>0&&box.height>0),`${label}: all controls are visible`);
  const overlap=Math.min(...boxes.map(box=>box.bottom))-Math.max(...boxes.map(box=>box.y));
  assert.ok(overlap>=Math.min(...boxes.map(box=>box.height))*.9,`${label}: controls share a row (${JSON.stringify(boxes)})`);
  for(let i=1;i<boxes.length;i++)assert.ok(boxes[i].x>=boxes[i-1].right-1,`${label}: adjacent controls do not overlap`);
 };
 const industryHeader=async(page,width)=>{
  const regions=await rects(page.locator('.asia-region-shell .regional-tabs a'));
  const country=await rects(page.locator('[data-country-select]'));
  const reset=await rects(page.locator('[data-reset]'));
  sameRow(regions,'Asia region links');sameRow([...country,...reset],'Asia country and reset');
  if(width===1024)sameRow([...regions,...country,...reset],'1024px industry region/country/reset');
  else assert.ok(country[0].y>=Math.max(...regions.map(box=>box.bottom))-1,'1440px country controls follow the region row, as in the US');
  assert.ok(reset[0].right<=width,'reset remains within the viewport');
  return {regions,country:country[0],reset:reset[0]};
 };
 try{
  browser=await chromium.launch({headless:true,chromiumSandbox,...(process.env.REVIEW_CHROME_PATH?{executablePath:process.env.REVIEW_CHROME_PATH}:{})});
  for(const viewport of [{width:1024,height:768},{width:1440,height:1000}]){
   await t.test(`${viewport.width}px PC`,async profile=>{
    const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    try{
     await profile.test('equivalent manufacturing and transport topics start their maps at the US height',async()=>{
      for(const [subsector,topic] of [['all','manufacturing'],['auto','jp-31']]){
       await page.goto(`${origin}/atlas/north-america/industry/?sector=manufacturing&subsector=${subsector}`,{waitUntil:'domcontentloaded'});
       await page.waitForFunction(subsector=>{const root=document.querySelector('[data-atlas-explorer]');return root?.dataset.renderState==='ready'&&root.dataset.industrySector==='manufacturing'&&root.dataset.industrySubsector===subsector;},subsector);
       await settle(page);
       assert.equal(await page.locator('button[data-industry-sector="manufacturing"]').getAttribute('aria-selected'),'true');
       assert.equal(await page.locator(`[data-industry-subtabs="manufacturing"] [data-industry-subsector="${subsector}"]`).getAttribute('aria-selected'),'true');
       const us=(await rects(page.locator('[data-atlas-explorer] .atlas-map-frame')))[0];
       const usRegions=await rects(page.locator('.regional-tabs a')),usCountries=await rects(page.locator('.regional-countries a'));
       if(viewport.width===1024)sameRow([...usRegions,...usCountries],'1024px US region/country reference');
       else assert.ok(usCountries[0].y>=Math.max(...usRegions.map(box=>box.bottom))-1,'1440px US reference has a separate country row');
       await openAsia(page,`east-asia/industry/?topic=${topic}`);
       await page.waitForFunction(topic=>document.querySelector('[data-industry-topic]')?.value===topic&&document.querySelector('[data-industry-status]')?.textContent==='',topic);
       const header=await industryHeader(page,viewport.width);
       assert.equal(await page.locator('[data-industry-sector="manufacturing"]').getAttribute('aria-pressed'),'true');
       assert.equal(await page.locator(`[data-industry-feature="${topic}"]`).getAttribute('aria-pressed'),'true');
       const guide=page.locator('.asia-industry-guide');
       assert.ok(await guide.isVisible(),'the classification and current-topic guide stays readable');
       const readability=await guide.evaluate(node=>{const style=getComputedStyle(node),r=node.getBoundingClientRect();return {fontSize:parseFloat(style.fontSize),lineHeight:parseFloat(style.lineHeight),height:r.height,clipped:node.scrollWidth>node.clientWidth+1||node.scrollHeight>node.clientHeight+1};});
       assert.ok(readability.fontSize>=13&&readability.lineHeight>=19.5,'the guide keeps readable type instead of shrinking to align the map');
       assert.equal(readability.clipped,false,'the current statistical topic is not clipped');
       const visibleTopic=await page.locator('[data-industry-current-map]').textContent();
       assert.match(visibleTopic,topic==='jp-31'?/日本：輸送用機械器具製造業/:/製造業/);
       const asia=(await rects(page.locator('.asia-map-frame')))[0],delta=asia.y-us.y;
       profile.diagnostic(`${viewport.width}px US manufacturing/${subsector} ↔ Asia ${topic}: mapTop US=${us.y}, Asia=${asia.y}, delta=${delta}; header=${JSON.stringify(header)}`);
       assert.ok(Math.abs(delta)<=1,`${topic}: map top differs only by subpixel rounding from the same US topic (${delta}px)`);
       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'the desktop header does not overflow horizontally');
      }
     });
     await profile.test('country selection and reset remain usable in the industry header',async()=>{
      await openAsia(page,'east-asia/industry/?topic=manufacturing');
      await industryHeader(page,viewport.width);
      await page.locator('[data-country-select]').selectOption('JPN');
      assert.equal(new URL(page.url()).searchParams.get('place'),'JPN');
      assert.match(await page.locator('[data-current-place]').textContent(),/日本/);
      await page.locator('[data-reset]').click();
      assert.equal(new URL(page.url()).searchParams.get('place'),null);
      assert.equal(await page.locator('[data-country-select]').inputValue(),'');
      assert.match(await page.locator('[data-current-place]').textContent(),/東アジア全体/);
      assert.equal(new URL(page.url()).pathname,`${basePath}/atlas/asia/east-asia/industry/`);
     });
     await profile.test('South and Central Asia focus links remain a separate keyboard-operable row',async()=>{
      await openAsia(page,'south-central-asia/industry/?topic=manufacturing');
      for(const [focus,country] of [['south-asia','IND'],['central-asia','KAZ']]){
       const focusLinks=await rects(page.locator('[data-focus-link]'));
       assert.deepEqual(await page.locator('[data-focus-link]').evaluateAll(links=>links.map(link=>link.dataset.focusLink)),['south-central-asia','south-asia','central-asia']);
       sameRow(focusLinks,'South/Central Asia focus links');
       const countryControls=await rects(page.locator('[data-country-select], [data-reset]'));
       assert.ok(countryControls.every(box=>box.width>0&&box.height>=40),'focus pages retain visible country and reset controls');
       for(const link of focusLinks)for(const control of countryControls)assert.ok(Math.min(link.right,control.right)<=Math.max(link.x,control.x)+1||Math.min(link.bottom,control.bottom)<=Math.max(link.y,control.y)+1,'focus links and country controls do not cover each other');
       const link=page.locator(`[data-focus-link="${focus}"]`);await link.focus();await page.keyboard.press('Enter');
       await page.waitForURL(`**/atlas/asia/${focus}/industry/**`);
       await page.waitForFunction(()=>document.querySelector('[data-asia-atlas]')?.dataset.mapReady==='true');
       assert.equal(await page.locator(`[data-focus-link="${focus}"]`).getAttribute('aria-current'),'page');
       await page.locator('[data-country-select]').selectOption(country);
       assert.equal(new URL(page.url()).searchParams.get('place'),country);
       await page.locator('[data-reset]').click();
       assert.equal(await page.locator('[data-country-select]').inputValue(),'');
       assert.equal(new URL(page.url()).pathname,`${basePath}/atlas/asia/${focus}/industry/`,'reset retains the focused page');
       assert.equal(await page.locator(`[data-focus-link="${focus}"]`).getAttribute('aria-current'),'page');
       for(const field of ['natural','population'])assert.ok((await page.locator(`.atlas-tabs [data-field="${field}"]`).getAttribute('href')).includes(`/atlas/asia/${focus}/`),'field navigation retains the focused region');
      }
     });
     await profile.test('climate city and monthly precipitation controls retain their selection and return paths',async()=>{
      await openAsia(page,'east-asia/nature/?place=JPN&city=tokyo');
      const city=page.locator('[data-city-select]');
      assert.ok(await city.isVisible());assert.equal(await city.inputValue(),'tokyo');
      await page.locator('[data-country-select]').selectOption('CHN');
      await page.waitForFunction(()=>new URL(location.href).searchParams.get('place')==='CHN'&&document.querySelector('[data-country-select]').value==='CHN'&&document.querySelector('[data-city-select]').value==='');
      // Read the native option state: Playwright's generic isDisabled() does
      // not report disabled hidden <option> elements in this browser version.
      assert.deepEqual(await city.locator('option[value="tokyo"]').evaluate(option=>({disabled:option.disabled,hidden:option.hidden,country:option.dataset.country})),{disabled:true,hidden:true,country:'JPN'});
      assert.deepEqual(await city.locator('option[value="beijing"]').evaluate(option=>({disabled:option.disabled,hidden:option.hidden,country:option.dataset.country})),{disabled:false,hidden:false,country:'CHN'});
      await city.selectOption('beijing');
      assert.equal(new URL(page.url()).searchParams.get('city'),'beijing');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.locator('[data-city-panel="beijing"]').waitFor({state:'visible'});
      assert.equal(await city.inputValue(),'beijing');
      assert.ok(await page.locator('[data-reading-details]').evaluate(node=>node.open),'selected city still opens its full reading');
      await page.locator('[data-dock-compare="industry"]').click();
      assert.equal(await city.isVisible(),false,'the city control hides outside climate');
      await page.locator('[data-comparison-back]').click();
      await page.locator('[data-city-panel="beijing"]').waitFor({state:'visible'});
      assert.equal(await city.inputValue(),'beijing','comparison return restores the selected city');
      await page.locator('[data-natural-group="water"]').click();
      await page.locator('[data-natural-topic="seasonal-precipitation"]').click();
      const month=page.locator('[data-seasonal-month]');await month.waitFor({state:'visible'});
      assert.equal(await city.isVisible(),false);
      for(const control of [month,page.locator('[data-seasonal-previous]'),page.locator('[data-seasonal-next]')]){
       const box=await control.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44&&box.x>=0&&box.x+box.width<=viewport.width,'monthly controls retain usable hit areas within the viewport');
      }
      await month.selectOption('m-01');assert.equal(new URL(page.url()).searchParams.get('detail'),'m-01');
      await page.locator('[data-seasonal-previous]').click();assert.equal(await month.inputValue(),'m-12');
      await page.locator('[data-seasonal-next]').click();assert.equal(await month.inputValue(),'m-01');
      await page.locator('[data-dock-compare="industry"]').click();
      await page.locator('[data-comparison-back]').click();await month.waitFor({state:'visible'});
      assert.equal(await month.inputValue(),'m-01');assert.equal(new URL(page.url()).searchParams.get('topic'),'seasonal-precipitation');
      await page.locator('[data-natural-group="climate"]').click();await city.waitFor({state:'visible'});
      assert.equal(await month.isVisible(),false,'monthly controls return to their hidden home when climate resumes');
      await city.selectOption('beijing');assert.equal(new URL(page.url()).searchParams.get('city'),'beijing');
      assert.ok(await page.locator('[data-city-panel="beijing"]').isVisible());
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     });
     assert.deepEqual(errors,[],'desktop controls and navigation produce no browser runtime errors');
    }finally{await context.close();}
   });
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
});
