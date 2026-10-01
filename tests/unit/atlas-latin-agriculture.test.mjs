import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=path=>JSON.parse(readFileSync(new URL(`../../${path}`,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const data=json('src/data/atlas/latin-america/agriculture.json');
const provenance=json('data-source/atlas/latin-agriculture/provenance.json');
const rawPath='data-source/atlas/latin-agriculture/raw/faostat-qcl-2024-selected.csv';
const layer=id=>data.layers.find(l=>l.id===id);
const row=(id,code)=>layer(id).countries.find(c=>c.code===code);

test('Latin agriculture: official source, output and original raster hashes agree',()=>{
 assert.equal(data.scope.countryCount,34);assert.equal(data.layers.length,4);
 assert.equal(provenance.originalSources.qcl.zipSha256,'c5835418c18f9322e7decbd6800f93a216eaae3cdfa31acb08f0518c0c6d6853');
 assert.equal(sha(readFileSync(new URL(`../../${rawPath}`,import.meta.url))),provenance.inputs[rawPath].sha256);
 for(const [path,asset] of Object.entries(provenance.outputs))assert.equal(sha(readFileSync(new URL(`../../${path}`,import.meta.url))),asset.sha256,path);
 for(const l of data.layers){
  assert.equal(l.countries.length,34);assert.equal(new Set(l.countries.map(c=>c.code)).size,34);assert.ok(!l.countries.some(c=>c.code==='MEX'));
  for(const [name,asset] of Object.entries(l.assets)){
   const directory=name.endsWith('-validity.png')?'latin-agriculture-v2':l.id==='cattle'?'latin-america-livestock-v1':'latin-america-agriculture-v1';
   assert.equal(sha(readFileSync(new URL(`../../public/assets/atlas/${directory}/${name}`,import.meta.url))),asset.sha256,name);
  }
 }
 const precision=provenance.processing.rounding;
 assert.equal(precision.qclExtraction.scope,'FAOSTAT 2024 country records only');assert.equal(precision.qclExtraction.numericRounding,false);
 assert.equal(precision.inheritedSpatial.crops.countryTotalsDecimalPlaces,2);assert.equal(precision.inheritedSpatial.crops.queryValuesDecimalPlaces,2);
 assert.equal(precision.inheritedSpatial.cattle.meanDensityDecimalPlaces,4);assert.equal(precision.inheritedSpatial.cattle.queryDensityDecimalPlaces,4);
 assert.equal(precision.inheritedSpatial.cattle.estimatedHeadDecimalPlaces,2);assert.equal(precision.inheritedSpatial.cattle.validAreaKm2DecimalPlaces,2);
 assert.match(precision.inheritedSpatial.currentPreparation,/does not recover/);assert.match(precision.display.method,/does not change downloadable quantities/);
 let spatialRecords=0;
 for(const l of data.layers){
  const manifest=json(`public/assets/atlas/${l.id==='cattle'?'latin-america-livestock-v1':'latin-america-agriculture-v1'}/manifest.json`).layers.find(item=>item.id===l.id);
  for(const c of l.countries){const original=manifest.countries.find(item=>item.code===c.code);assert.equal(c.spatial.value,l.id==='cattle'?original.meanDensity:original.value);spatialRecords++;}
 }
 assert.equal(spatialRecords,136);assert.equal(provenance.validation.independentReview.spatialRecordsComparedWithInheritedManifests,spatialRecords);
 assert.equal(provenance.validation.independentReview.qclRecordsComparedWithSelectedCsv,204);
 assert.equal(provenance.validation.independentReview.originalZipFullyReextracted,false);assert.equal(provenance.validation.independentReview.compressedSpatialShardsFullyReextracted,false);
 assert.deepEqual(provenance,json('public/assets/atlas/latin-agriculture-v2/provenance.json'));
});

test('Latin agriculture: calendar-2024 production, stocks and source flags stay separate',()=>{
 assert.equal(row('bana','CRI').national2024.value,2630019.89);
 assert.equal(row('bana','DOM').national2024.value,2038904.64);
 assert.equal(row('coff','HND').national2024.value,324015.02);
 assert.equal(row('soyb','BRA').national2024.value,144473768);
 assert.equal(row('cattle','URY').national2024.value,11960556);
 assert.equal(row('cattle','DOM').milk2024.value,892257.36);
 assert.equal(row('cattle','HND').beef2024.flag,'X');
 assert.equal(row('soyb','CRI').national2024.value,null);assert.equal(row('soyb','CRI').national2024.status,'missing');assert.equal(row('soyb','CRI').national2024.flag,'M');
 assert.equal(row('bana','FLK').national2024.status,'unavailable');
 assert.match(data.definitions.coffee,/全品種/);assert.match(data.definitions.crop,/複数回収穫/);
 for(const l of data.layers)for(const c of l.countries){
  assert.equal(c.spatial.status==='missing',c.spatial.validCells===0,`${l.id}/${c.code}`);
  for(const quantity of [c.national2024,c.beef2024,c.milk2024].filter(Boolean)){
   assert.equal(quantity.value===null,['missing','unavailable'].includes(quantity.status));
   if(quantity.value!==null){assert.equal(quantity.value,Number(quantity.sourceValue));assert.equal(quantity.status==='zero',quantity.value===0);}
  }
 }
});

function decodeMask(path){
 const png=readFileSync(new URL(`../../${path}`,import.meta.url));assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20),idats=[];let offset=8;
 while(offset<png.length){const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type==='IDAT')idats.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
 return {width,height,pixels:inflateSync(Buffer.concat(idats))};
}
test('Latin agriculture: validity images preserve zero/small valid cells separately from no-data',()=>{
 for(const l of data.layers){
  const grid=json(`public${l.query}`),mask=decodeMask(`public${l.validityImage}`);
  const valid=new Uint8Array(grid.width*grid.height);for(const [start,count]of grid.validRuns)valid.fill(1,start,start+count);
  const [west,south,east,north]=grid.bounds,merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  let seenValid=false,seenMissing=false;
  for(let y=13;y<mask.height;y+=83)for(let x=7;x<mask.width;x+=41){
   const lat=(2*Math.atan(Math.exp(merc(north)+(merc(south)-merc(north))*(y+.5)/mask.height))-Math.PI/2)*180/Math.PI;
   const lon=west+(east-west)*(x+.5)/mask.width;
   const isValid=valid[Math.floor((north-lat)/grid.cellSize)*grid.width+Math.floor((lon-west)/grid.cellSize)];
   const at=y*(mask.width*4+1)+1+x*4;
   assert.equal(mask.pixels[at+3],isValid?255:0,`${l.id}@${x},${y}`);
   if(isValid){assert.deepEqual([...mask.pixels.subarray(at,at+3)],[216,222,224]);seenValid=true;}else seenMissing=true;
  }
  assert.ok(seenValid&&seenMissing);
 }
});

async function module(path){const result=await build({entryPoints:[new URL(`../../${path}`,import.meta.url).pathname.replace(/^\/(\w:)/,'$1')],bundle:true,write:false,format:'esm',platform:'node'});return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);}
test('Latin agriculture: exact bin legend, original maps and small positive values remain truthful',async()=>{
 const lib=await module('src/lib/atlas-latin-agriculture.ts');
 const nature=await module('src/lib/atlas-latin-nature.ts');
 assert.equal(lib.formatLatinAgricultureValue(0,'ha'),'0 ha');assert.equal(lib.formatLatinAgricultureValue(.03,'ha'),'0.03 ha');assert.equal(lib.formatLatinAgricultureValue(.003,'頭/km²'),'<0.01 頭/km²');
 assert.equal(lib.formatLatinAgricultureValue(null,'ha','missing'),'欠測');assert.equal(lib.formatLatinAgricultureValue(null,'ha','unavailable'),'原表行なし');assert.equal(lib.formatLatinAgricultureValue(null,'ha','unfetched'),'未取得');assert.equal(lib.formatLatinAgricultureValue(null,'ha','confidential'),'秘匿');
 for(const l of data.layers){
  const map=lib.renderLatinAgricultureMap({layer:l.id,place:'DOM',scope:'central',only:true},`test-${l.id}`);
  assert.match(map,new RegExp(l.image.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(map,/opacity="0.16"/);assert.match(map,/clip-path=/);assert.match(map,/data-agriculture-original-distribution/);
  assert.equal((map.match(/data-latin-agriculture-country=/g)||[]).length,34);
  const legend=lib.renderLatinAgricultureLegend(l.id);assert.match(legend,/0–1未満（有効値）/);assert.match(legend,/欠測・対象外/);
  for(const color of l.colors)assert.ok(legend.includes(color));
 }
 for(const [scope,place]of [['all','all'],['central','CRI'],['south','BRA'],['country','DOM']]){
  const window=new Window();window.document.body.innerHTML=lib.renderLatinAgricultureMap({layer:'coff',place,scope,only:true},'same-geo')+nature.renderLatinNatureMap({layer:'climate',place,scope,only:true},'same-climate');
  const agriculture=window.document.querySelector('[data-latin-agriculture-map]'),climate=window.document.querySelector('[data-latin-nature-map]');
  assert.equal(agriculture.getAttribute('viewBox'),'0 0 900 580');assert.equal(climate.getAttribute('viewBox'),'0 0 900 580');
  assert.equal(agriculture.getAttribute('data-agriculture-frame'),climate.getAttribute('data-nature-frame'));
  assert.equal(agriculture.querySelector('[data-agriculture-geography]').getAttribute('transform'),climate.querySelector('[data-nature-native-group]').getAttribute('transform'));
  await window.happyDOM.close();
 }
});

function clientFixture(window){
 const fields=['title','map-caption','reading-title','takeaway','selected-name','selected-spatial','selected-unit','steps','examples','definition','coffee-definition','reading-sources','stat-caption','stat-note','fallback-caption','fallback-unit','map-panes','source-pane','source-title','source-map','source-legend','target-title','target-pane','comparison-message','comparison-explanation'];
 window.document.body.innerHTML=`<article data-latin-field="agriculture">${fields.map(name=>`<div data-latin-agriculture-${name}></div>`).join('')}<select data-latin-agriculture-place><option value="all">全体</option>${data.scope.countries.map(code=>`<option value="${code}">${code}</option>`).join('')}</select><select data-latin-agriculture-scope>${['all','central','south','country'].map(scope=>`<option value="${scope}">${scope}</option>`).join('')}</select><input type="checkbox" data-latin-agriculture-only><button data-latin-agriculture-fallback></button>${data.layers.map(l=>`<button data-latin-agriculture-layer="${l.id}">${l.label}</button>`).join('')}<figure data-latin-agriculture-normal-container><div data-latin-agriculture-map-container></div><div data-latin-agriculture-legend-container></div></figure><div data-latin-agriculture-fallback-container><table><tbody data-latin-agriculture-fallback-rows></tbody></table></div><table><thead></thead><tbody data-latin-agriculture-stat-rows></tbody></table><a data-latin-agriculture-compare></a><a data-latin-agriculture-return></a></article>`;
 return name=>window.document.querySelector(`[data-latin-agriculture-${name}]`);
}
test('Latin agriculture: selection, fallback, named return and history/refresh restore actual client state',async()=>{
 const original=Object.fromEntries(['window','document','Element','SVGElement'].map(name=>[name,globalThis[name]]));
 const window=new Window({url:'https://example.test/insight-journal/atlas/latin-america/agriculture/?layer=coff&place=HND&scope=central&only=1&fallback=1&campaign=retained'});
 const q=clientFixture(window);Object.assign(globalThis,{window,document:window.document,Element:window.Element,SVGElement:window.SVGElement});
 try{
  const client=await module('src/scripts/atlas-latin-agriculture.ts');
  const article=window.document.querySelector('article');assert.equal(article.dataset.latinAgricultureReady,'true');
  assert.equal(q('place').value,'HND');assert.equal(q('scope').value,'central');assert.equal(q('only').checked,true);assert.equal(q('normal-container').hidden,true);
  assert.equal(new URL(window.location.href).searchParams.get('campaign'),'retained');
  q('fallback').click();assert.equal(q('fallback-container').hidden,true);assert.equal(q('normal-container').hidden,false);
  q('place').value='BRA';q('place').dispatchEvent(new window.Event('change',{bubbles:true}));
  q('layer="soyb"').click();
  assert.equal(article.dataset.latinAgricultureCurrentLayer,'soyb');assert.equal(q('place').value,'BRA');assert.equal(q('scope').value,'country');assert.equal(q('only').checked,true);
  const comparison=new URL(q('compare').href);assert.match(comparison.pathname,/nature\/$/);assert.equal(comparison.searchParams.get('sourceLayer'),'soyb');assert.equal(comparison.searchParams.get('sourcePlace'),'BRA');assert.equal(comparison.searchParams.get('sourceScope'),'country');assert.equal(comparison.searchParams.get('sourceOnly'),'1');assert.equal(comparison.searchParams.get('sourceFallback'),'0');
  window.history.replaceState({},'','?layer=coff&place=HND&scope=central&only=1&fallback=1');window.dispatchEvent(new window.PopStateEvent('popstate'));
  assert.equal(q('place').value,'HND');assert.equal(q('scope').value,'central');assert.equal(article.dataset.latinAgricultureRenderMode,'fallback');assert.equal(article.dataset.latinAgricultureCurrentLayer,'coff');
  const restoredQuery=window.location.search;clientFixture(window);client.initialiseLatinAgriculture();
  assert.equal(window.location.search,restoredQuery);assert.equal(q('place').value,'HND');assert.equal(q('normal-container').hidden,true);assert.equal(q('only').checked,true);
  window.history.replaceState({},'','?layer=soyb&place=BRA&scope=country&from=nature&sourceLayer=climate&sourcePlace=BRA&sourceScope=south&sourceOnly=1&sourceFallback=1&sourceCase=amazon');window.dispatchEvent(new window.PopStateEvent('popstate'));
  const returnUrl=new URL(q('return').href);assert.equal(q('return').hidden,false);assert.match(q('return').textContent,/ブラジル.*自然環境/);assert.equal(returnUrl.searchParams.get('layer'),'climate');assert.equal(returnUrl.searchParams.get('place'),'BRA');assert.equal(returnUrl.searchParams.get('scope'),'south');assert.equal(returnUrl.searchParams.get('only'),'1');assert.equal(returnUrl.searchParams.get('fallback'),'1');
  assert.equal(q('source-pane').hidden,false);assert.match(q('source-map').innerHTML,/data-latin-nature-map/);assert.match(q('source-legend').textContent,/熱帯/);assert.match(q('legend-container').textContent,/大豆/);assert.ok(window.document.querySelector('article').classList.contains('is-comparison'));
  assert.equal(returnUrl.searchParams.get('case'),'amazon');assert.match(q('source-map').textContent,/マナウス/);
  const sourceCountry=q('source-map').querySelector('[data-nature-country="CRI"]');sourceCountry.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));assert.equal(q('place').value,'CRI');assert.equal(q('scope').value,'country');assert.equal(new URL(q('return').href).searchParams.get('place'),'BRA');
  q('fallback').click();assert.equal(q('normal-container').hidden,false);assert.equal(q('map-container').hidden,true);assert.equal(q('legend-container').hidden,false);assert.equal(q('fallback-container').parentElement,q('target-pane'));assert.equal(q('fallback-rows').querySelector('button').dataset.latinAgricultureCountry,'CRI');
 }finally{for(const [name,value]of Object.entries(original)){if(value===undefined)delete globalThis[name];else globalThis[name]=value;}await window.happyDOM.close();}
});
