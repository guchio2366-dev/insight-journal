// Run against a local production preview after npm run build.
// EUROPE_REVIEW_BASE_URL and EUROPE_REVIEW_OUTPUT may override local defaults.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=new URL(process.env.EUROPE_REVIEW_BASE_URL??'http://127.0.0.1:4321/insight-journal/');
assert.equal(base.protocol,'http:');
assert.ok(['127.0.0.1','localhost'].includes(base.hostname));
const output=process.env.EUROPE_REVIEW_OUTPUT??'/tmp/europe-corrections-review';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.EUROPE_REVIEW_CHROMIUM_PATH?{executablePath:process.env.EUROPE_REVIEW_CHROMIUM_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
async function open(layer,render='auto'){
  const url=new URL(`atlas/europe/nature/?layer=${layer}${render==='static'?'&render=static':''}`,base);
  await page.goto(url.href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  if(render==='auto')await page.locator('[data-eu-live].is-ready').waitFor();
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
}
try{
  await open('terrain');
  const labels=await page.locator('[data-eu-terrain-label]').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.euTerrainLabel,hidden:node.hidden,bottom:node.getBoundingClientRect().bottom})));
  assert.equal(labels.length,26);
  assert.deepEqual(labels.filter(item=>item.hidden||item.bottom>1080).map(item=>item.id),[]);
  for(const id of ['pyrenees','dover-strait','mistral','sirocco','foehn'])assert.ok(labels.some(item=>item.id===id&&!item.hidden));
  await page.screenshot({path:`${output}/terrain-1920x1080.png`});

  await open('water','static');
  const point=await page.locator('[data-eu-major-river=seine]').evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()*.5).matrixTransform(path.getScreenCTM());return{x:p.x,y:p.y};});
  await page.mouse.click(point.x,point.y);
  assert.equal(new URL(page.url()).searchParams.get('feature'),'seine');
  assert.match(await page.locator('[data-eu-subject-reader]').innerText(),/セーヌ川はフランス北部のパリを通り/);

  await open('drainage');
  await page.locator('[data-eu-map-place=danube][data-eu-map-kind=feature]').click();
  await page.waitForFunction(()=>document.querySelector('[data-eu-basin-summary]')?.textContent.includes('ドナウ川水系'));
  const basin=await page.locator('[data-eu-basin-summary]').innerText();
  assert.match(basin,/9区画をまとめて強調/);
  assert.match(basin,/対象国と地図枠で切れています/);
  await page.screenshot({path:`${output}/danube-1920x1080.png`});

  await open('precipitation');
  const colors=await page.locator('[data-eu-legend-items] .eu-swatch').evaluateAll(nodes=>nodes.slice(0,13).map(node=>getComputedStyle(node).backgroundColor));
  assert.equal(colors.length,13);
  assert.ok(colors.every(color=>{const [r,g,b]=color.match(/\d+/g).map(Number);return b>r&&b>g;}),`Precipitation must use only blue bins: ${colors}`);
  assert.notEqual(colors[0],colors[1]);
  await page.screenshot({path:`${output}/precipitation-1920x1080.png`});

  await page.goto(new URL('atlas/europe/population/?layer=ethnicity',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-europe-detail]')?.dataset.initialized==='true');
  await page.locator('[data-eu-live].is-ready').waitFor();
  await page.locator('[data-culture-case]').selectOption('croatia-national-2021');
  await page.waitForFunction(()=>document.querySelector('[data-culture-code="HRV"]')!==null);
  assert.equal(await page.locator('[data-culture-case]').inputValue(),'croatia-national-2021');
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`${output}/ethnicity-croatia-1920x1080.png`});
  assert.deepEqual(errors,[]);
  await writeFile(`${output}/checks.json`,JSON.stringify({labels:labels.length,riverClick:'seine',basin,precipitationColors:colors,ethnicityCase:'croatia-national-2021',errors},null,2));
  console.log(JSON.stringify({passed:true,output,labels:labels.length,riverClick:'seine',basin:'Danube nine sections',precipitationBins:colors.length,ethnicityCase:'Croatia'}));
}finally{await browser.close();}
