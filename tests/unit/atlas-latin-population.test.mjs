import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {populationLibrary} from './atlas-latin-population-helpers.mjs';
const data=JSON.parse(await readFile('src/data/atlas/latin-america/population.json','utf8'));
const assets='public/assets/atlas/latin-america-population-v2';
const source='data-source/atlas/latin-america/population';
const manifest=JSON.parse(await readFile(`${assets}/manifest.json`,'utf8'));
const lib=await populationLibrary();
const state=(layer='density',place='all',scope='all',only=false)=>({layer,place,scope,only});
function svg(selection){const w=new Window();w.document.body.innerHTML=lib.renderLatinPopulationMap(selection,'test').replace(/<style>[\s\S]*?<\/style>/g,'');return {w,root:w.document.querySelector('svg')};}

test('All adopted values equal preserved official 2023 responses; unavailable is never a zero',async()=>{
 assert.equal(data.year,2023);assert.equal(data.countries.length,34);assert.equal(new Set(data.countries.map(c=>c.countryCode)).size,34);
 assert.ok(data.countries.some(c=>c.countryCode==='GTM')&&data.countries.some(c=>c.countryCode==='JAM')&&data.countries.some(c=>c.countryCode==='BRA'));
 assert.ok(!data.countries.some(c=>c.countryCode==='MEX'));
 for(const item of data.sources){
  const api=JSON.parse(await readFile(`${source}/${item.apiFile}`,'utf8'));assert.equal(api[0].pages,1);assert.equal(api[0].lastupdated,item.apiLastUpdated);
  for(const c of data.countries){const row=api[1].find(row=>row.countryiso3code===c.countryCode&&row.date==='2023');assert.equal(c[item.property],row?.value??null);assert.equal(c[`${item.property}Status`],row?'value':'unavailable');}
  assert.deepEqual(data.statusCounts[item.property],{value:33,zero:0,missing:0,confidential:0,unavailable:1});
  const metadata=await readFile(`${source}/${item.metadataFile}`,'utf8');assert.match(metadata,/CC BY-4\.0|CC BY 4\.0/);assert.match(metadata,/public-licenses/);
 }
 const density=JSON.parse(await readFile(`${source}/wb-EN.POP.DNST.json`,'utf8'))[1];
 for(const year of ['2024','2025'])assert.equal(density.filter(row=>data.countries.some(c=>c.countryCode===row.countryiso3code)&&row.date===year&&row.value!==null).length,0);
 assert.equal(data.countries.reduce((sum,c)=>sum+(c.population??0),0),527281345);
 assert.equal(data.countries.find(c=>c.countryCode==='FLK').population,null);
 assert.equal(data.countries.find(c=>c.countryCode==='BRA').density,25.2616884857157);
});

test('Every source and distributed value file is pinned by byte count and SHA256',async()=>{
 for(const pinned of manifest.sourceFiles){const bytes=await readFile(`${source}/${pinned.file}`);assert.equal(bytes.length,pinned.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),pinned.sha256);}
 for(const pinned of Object.values(manifest.generated)){const bytes=await readFile(`${assets}/${pinned.file}`);assert.equal(bytes.length,pinned.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),pinned.sha256);}
 assert.equal(await readFile(`${assets}/countries-2023.json`,'utf8'),await readFile('src/data/atlas/latin-america/population.json','utf8'));
 assert.equal(manifest.validation.densityFromDisplayGeometry,false);assert.match(manifest.units.density,/land/);assert.equal(manifest.license.name,'CC BY 4.0');
 assert.ok(manifest.withinCountry2020.manifest.includes('population-v1'));assert.match(data.notes.urbanShare,/national definitions/);
});

test('Real zero, missing, secret and unavailable states remain distinct in text and fill',()=>{
 assert.equal(lib.latinPopulationValue(0,'zero'),'0');assert.equal(lib.latinPopulationValue(null,'missing'),'欠測');assert.equal(lib.latinPopulationValue(null,'confidential'),'秘匿');assert.equal(lib.latinPopulationValue(null,'unavailable'),'対象統計なし');
 const colors=['zero','missing','confidential','unavailable'].map(s=>lib.latinPopulationDensityColor(s==='zero'?0:null,s,'test'));assert.equal(new Set(colors).size,4);
 for(const [value,index] of [[0,0],[9.999,0],[10,1],[25,2],[50,3],[100,4],[250,5]])assert.equal(lib.latinPopulationDensityColor(value),lib.latinPopulationDensityBins[index].color);
 assert.equal(lib.latinPopulationRadius(null),0);assert.equal(lib.latinPopulationRadius(0),0);assert.equal(lib.latinPopulationRadius(-1),0);
});

test('Quantity circle area is proportional to exact population, including shared in-map legend at every geographic scope',async()=>{
 assert.ok(Math.abs((lib.latinPopulationRadius(200000000)**2)/(lib.latinPopulationRadius(10000000)**2)-20)<1e-12);
 for(const scope of ['all','south','central','country']){const {w,root}=svg(state('population','JAM',scope));try{
  assert.equal(root.getAttribute('viewBox'),'0 0 900 580');assert.equal(root.querySelectorAll('.lp-context').length,34);assert.equal(root.querySelectorAll('[data-lp-country]').length,34);
  assert.equal(root.querySelectorAll('[data-lp-population]').length,33);assert.equal(root.querySelector('[data-lp-symbol="FLK"] circle'),null);assert.ok(root.querySelector('[data-lp-symbol="FLK"] .lp-unknown-symbol'));
  for(const c of data.countries.filter(c=>c.population!==null))assert.equal(Number(root.querySelector(`[data-lp-symbol="${c.countryCode}"] circle`).getAttribute('r')),lib.latinPopulationRadius(c.population));
  for(const value of lib.latinPopulationLegendValues)assert.equal(Number(root.querySelector(`[data-lp-legend-population="${value}"]`).getAttribute('r')),lib.latinPopulationRadius(value));
  assert.equal(root.querySelector('[data-lp-map-size-key]').closest('svg'),root);assert.ok(!/NaN|Infinity/.test(root.outerHTML));
 }finally{await w.happyDOM.close();}}
 assert.match(lib.renderLatinPopulationLegend('population'),/1,000万.*5,000万.*2億人/);
});

test('Only hides data for other targets while all 34 context shapes remain, and selection coordinates use the shared projected label once',async()=>{
 const {w,root}=svg(state('scale','CRI','central',true));try{
  assert.equal(root.querySelectorAll('.lp-context').length,34);assert.equal(root.querySelectorAll('[data-lp-country]:not([style])').length,1);assert.equal(root.querySelectorAll('[data-lp-symbol]:not([style])').length,1);
  const c=lib.latinCountries.find(c=>c.code==='CRI'),frame=lib.latinViewBox('central','CRI'),k=Math.min(900/frame[2],580/frame[3]);
  const expected=[c.label[0]*k+(900-frame[2]*k)/2-frame[0]*k,c.label[1]*k+(580-frame[3]*k)/2-frame[1]*k];
  const symbol=root.querySelector('[data-lp-symbol="CRI"] circle');assert.equal(Number(symbol.getAttribute('cx')),expected[0]);assert.equal(Number(symbol.getAttribute('cy')),expected[1]);
  assert.match(root.querySelector('[data-lp-country="CRI"]').getAttribute('fill'),/^#/);assert.equal(root.querySelector('[data-lp-symbol="CRI"]').getAttribute('aria-pressed'),'true');
 }finally{await w.happyDOM.close();}
 assert.equal(lib.latinPopulationScopeIncludes('BRA','central'),false);assert.equal(lib.latinPopulationScopeIncludes('GTM','central'),true);assert.equal(lib.latinPopulationScopeIncludes('JAM','central'),true);
});

test('Every population layer uses XML-compatible valued data attributes in fallback SVG',()=>{
 for(const layer of ['spatial','density','population','scale']){
  const svg=lib.renderLatinPopulationMap(state(layer,'JAM','central',true),'xml-test');
  assert.equal((svg.match(/\sdata-[a-z-]+(?=\s|>)/g)??[]).length,0);
  assert.match(svg,/data-latin-map=""/);if(['population','scale'].includes(layer))assert.match(svg,/data-lp-map-size-key=""/);
 }
});

test('GHSL selection preserves the same retained raster, all countries, frame and eight source classes',async()=>{
 const baseline=svg(state('spatial'));
 const selected=svg(state('spatial','BRA','all',true));
 try{
  assert.equal(baseline.root.querySelectorAll('[data-lp-country][aria-pressed="true"]').length,0);
  assert.equal(selected.root.querySelectorAll('[data-lp-country]').length,34);
  assert.equal(selected.root.getAttribute('data-lp-frame'),baseline.root.getAttribute('data-lp-frame'));
  assert.deepEqual([...selected.root.querySelectorAll('image')].map(x=>x.getAttribute('href')),[baseline.root.querySelector('image').getAttribute('href'),baseline.root.querySelector('image').getAttribute('href')]);
  assert.equal(selected.root.querySelector('image').getAttribute('opacity'),'0.16');
  assert.ok(selected.root.querySelector('image[clip-path]'));
  assert.equal(selected.root.querySelectorAll('[data-lp-country] title').length,0);
  const source=JSON.parse(await readFile('public/assets/atlas/latin-america-population-v1/manifest.json','utf8'));
  assert.deepEqual(lib.latinPopulationSpatialBins,source.classes);
  assert.equal(lib.latinPopulationSpatialBins.length,8);
 }finally{await baseline.w.happyDOM.close();await selected.w.happyDOM.close();}
});

test('GHSL queries retain exact distributed positive/zero values and distinguish missing cells and outside coordinates',async()=>{
 const grid=JSON.parse(await readFile('public/assets/atlas/latin-america-population-v1/latin-america.grid.json','utf8'));
 for(const index of [grid.values.findIndex(v=>v>0&&v<.1),grid.values.findIndex(v=>v>1000),grid.values.indexOf(0),grid.values.indexOf(grid.noData)]){
  assert.ok(index>=0);
  const value=lib.latinPopulationSpatialCell(grid,(index%grid.width+.5)/grid.width,(Math.floor(index/grid.width)+.5)/grid.height);
  assert.equal(value,grid.values[index]===grid.noData?null:grid.values[index]);
 }
 for(const [x,y] of [[-1,.5],[1,.5],[.5,1],[NaN,.5]])assert.equal(lib.latinPopulationSpatialCell(grid,x,y),null);
});
