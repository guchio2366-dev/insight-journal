import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Window } from 'happy-dom';
import { renderEuropeOrigin } from '../../src/lib/atlas-europe-comparison-renderer.ts';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { europeReadings } from '../../src/data/atlas/europe/readings.ts';
import { viewPath } from '../../src/lib/atlas-europe-view.ts';
import { europeCultureData, caseMapData, cultureGeometryPath, cultureBounds, cultureSelection, cultureLegend } from '../../src/lib/atlas-europe-population-cases.ts';
import { europeDrainageGrid, europeDrainageBasins, europeDrainageOutline, readEuropeDrainageValues } from '../../src/lib/atlas-europe-drainage.ts';
const json=name=>JSON.parse(readFileSync(new URL('../../src/data/atlas/'+name,import.meta.url),'utf8'));
const config={layers:europeLayers,farmingAreas:json('europe/farming-areas.json'),farmingDominantAreas:json('europe/farming-dominant-areas.json'),geography:json('europe-countries.json'),readings:europeReadings,statistics:json('europe/country-statistics.json'),countries:json('europe/countries.json'),climateWater:json('europe/climate-water.json'),cities:json('europe/climate-cities.json'),populationCities:json('europe/population-cities.json')};
const state=layer=>({region:'all',place:'',city:'london',compare:[],render:'static',layer,returnLayer:layer});
const cultureGeometry=id=>JSON.parse(readFileSync(new URL('../../public'+europeCultureData.cases.find(item=>item.id===id).geometryURL,import.meta.url),'utf8'));
const cultureState=(layer,caseId='england-wales-2021',category=layer==='religion'?(caseId==='croatia-national-2021'?'hr-religion-H':'ts030-02'):(caseId==='croatia-national-2021'?'hr-ethnicity-H':'ts021-17'),area=caseId==='croatia-national-2021'?'HRV':'E06000001')=>({...state(layer),cultureCase:caseId,cultureCategory:category,cultureArea:area});
const drainageValues=readEuropeDrainageValues(gunzipSync(readFileSync(new URL('../../public/assets/atlas/europe/drainage-v1/values.bin.gz',import.meta.url))));
const visibleBasinIndexes=new Set(drainageValues);
const visibleBasins=europeDrainageBasins.filter(basin=>visibleBasinIndexes.has(basin.index));
function drainageCanvas(window) {
  const draws=[];
  window.HTMLCanvasElement.prototype.getContext=function(){return{createImageData:(width,height)=>({data:new Uint8ClampedArray(width*height*4)}),putImageData:image=>draws.push(image.data)};};
  window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,iVBORw0KGgo=';
  return draws;
}
function setup() {
  const window=new Window();globalThis.document=window.document;
  const root=document.createElement('div');root.innerHTML='<section class="eu-map-panel"><div class="eu-map-stage"><svg data-eu-static><image data-eu-origin-image x="0" y="0" width="1200" height="1001" style="display:none"></image><g data-eu-comparison-overlay></g></svg></div><p data-after-map></p><section data-eu-origin-key><div data-eu-origin-caption></div><div data-eu-origin-legend></div><svg data-eu-origin-map hidden viewBox="0 0 1200 1001" role="img"></svg></section></section>';
  document.body.append(root);return {window,root};
}

test('crop climate comparison carries the published crop geometry, not a quantity or farm boundary',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('wheat'),single:true},europeLayers.find(l=>l.id==='climate'),config);
    const path=root.querySelector('[data-eu-comparison-overlay] path');
    assert.equal(path.getAttribute('d'),viewPath(config.farmingAreas.features.find(f=>f.properties.id==='wheat').geometry));
    assert.equal(path.getAttribute('fill'),'none');
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/小麦.*主な集中域/);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/2020年頃/);
    assert.equal(root.querySelector('[data-eu-origin-map]').hasAttribute('hidden'),true);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('legacy crop toggle cannot hide the source; single selection retains its geometry',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('wheat'),showCrops:false},europeLayers.find(l=>l.id==='climate'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] path').length,1);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/小麦.*主な集中域/);
    renderEuropeOrigin(root,{...state('wheat'),showCrops:false,single:true},europeLayers.find(l=>l.id==='climate'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] path').length,1);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('population comparison keeps every density interval, missing-data key and the registered source image',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('density'),europeLayers.find(l=>l.id==='hubs'),config);
    const rows=[...root.querySelectorAll('[data-eu-origin-legend]>div')];
    assert.deepEqual(rows.map(r=>r.textContent),[...europeLayers.find(l=>l.id==='density').labels,'データなし']);
    const image=root.querySelector('[data-eu-origin-image]');
    assert.equal(image.getAttribute('href'),'/assets/atlas/europe/population-v1/density.png');
    assert.equal(image.getAttribute('width'),'1200');assert.equal(image.getAttribute('height'),'1001');
    assert.equal(image.style.display,'');assert.equal(root.querySelector('[data-eu-origin-map]').hasAttribute('hidden'),true);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/2020.*人\/km²/);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('industrial source mark is the sourced Rotterdam position; invalid context clears source marks and legend',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('hubs'),feature:'rotterdam'},europeLayers.find(l=>l.id==='water'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] circle').length,1);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/ロッテルダム.*代表位置.*数量ではない/);
    renderEuropeOrigin(root,null,europeLayers.find(l=>l.id==='water'),config);
    assert.equal(root.querySelector('[data-eu-origin-key]').hidden,true);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] circle').length,0);
    assert.equal(root.querySelector('[data-eu-origin-legend]').textContent,'');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('national source comparison retains all numeric colour classes and its missing-data key',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('forest'),europeLayers.find(l=>l.id==='hubs'),config);
    assert.deepEqual([...root.querySelectorAll('[data-eu-origin-legend]>div')].map(r=>r.textContent),['10未満','10〜20未満','20〜40未満','40〜60未満','60〜80未満','80以上','データなし']);
    assert.equal(root.querySelector('[data-eu-origin-map]').hasAttribute('hidden'),false);
    assert.equal(root.querySelector('[data-eu-origin-image]').style.display,'none');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('source hub positions follow the original country mask and never turn a river into an industrial site',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('hubs'),place:'FRA',feature:'rhine'},europeLayers.find(l=>l.id==='water'),config);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] circle').length,1);
    assert.equal(root.querySelector('[data-eu-comparison-overlay] text'),null);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/1産業拠点/);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('legacy overlay returnLayer climate keeps wheat data and its complete numeric legend',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('overlay'),returnLayer:'climate'},europeLayers.find(l=>l.id==='density'),config);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/小麦.*収穫面積 ha/);
    assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,7);
    assert.match(root.querySelector('[data-eu-origin-map] image').getAttribute('href'),/wheat-v1\/wheat.png/);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('climate source mini retains all 17 classes and the official water mask above the classified image',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('climate'),europeLayers.find(l=>l.id==='crops'),config);
    const image=root.querySelector('[data-eu-origin-map] image');
    assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,18);
    const mask=[...root.querySelectorAll('[data-eu-origin-map] path')].find(p=>p.getAttribute('fill')==='#e7eff1');
    assert.ok(mask);assert.ok(image.compareDocumentPosition(mask)&4);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
test('source mini preserves the selected observation, population-city and country marks',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,{...state('climate'),city:'paris'},europeLayers.find(l=>l.id==='crops'),config);
    assert.equal(root.querySelector('[data-eu-origin-point]').getAttribute('data-eu-origin-point'),'paris');
    const city=config.populationCities.find(c=>c.name==='パリ');assert.ok(city);
    renderEuropeOrigin(root,{...state('density'),feature:city.id},europeLayers.find(l=>l.id==='hubs'),config);
    assert.equal(root.querySelector('[data-eu-comparison-overlay] [data-eu-origin-point]').getAttribute('data-eu-origin-point'),city.id);
    renderEuropeOrigin(root,{...state('density'),place:'FRA',feature:city.id},europeLayers.find(l=>l.id==='hubs'),config);
    assert.ok(root.querySelector('[data-eu-comparison-overlay] [data-eu-origin-place="FRA"]'));
    renderEuropeOrigin(root,{...state('forest'),place:'FIN'},europeLayers.find(l=>l.id==='hubs'),config);
    assert.ok(root.querySelector('[data-eu-origin-place="FIN"]'));
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('annual rainfall keeps a separate adjacent registered map and every source interval without a target raster blend',()=>{
  const {window,root}=setup();try {
    const calls=[];
    const map={getLayer:id=>id==='land'?{}:undefined,getSource:()=>undefined,addSource:(...args)=>calls.push(['source',...args]),addLayer:(...args)=>calls.push(['layer',...args])};
    const rainfall=europeLayers.find(layer=>layer.id==='precipitation');
    renderEuropeOrigin(root,state('precipitation'),europeLayers.find(layer=>layer.id==='crops'),config,map);
    const stage=root.querySelector('.eu-map-stage'),key=root.querySelector('[data-eu-origin-key]'),mini=key.querySelector('[data-eu-origin-map]');
    assert.equal(stage.nextElementSibling,key,'The independent source belongs next to the target stage in the shared map column');
    assert.equal(root.classList.contains('has-eu-source-map'),true);
    assert.equal(mini.getAttribute('viewBox'),'0 0 1200 1001');
    assert.equal(mini.querySelector('image').getAttribute('href'),rainfall.image);
    assert.equal(mini.querySelector('image').getAttribute('preserveAspectRatio'),'none','Registered projection fills the same1200×1001 source frame');
    assert.deepEqual([...root.querySelectorAll('[data-eu-origin-legend]>div')].map(row=>row.textContent),[...rainfall.labels,'データなし']);
    assert.ok(key.querySelector('[data-eu-origin-caption]').compareDocumentPosition(mini)&4);
    assert.ok(mini.compareDocumentPosition(root.querySelector('[data-eu-origin-legend]'))&4);
    assert.match(mini.getAttribute('aria-label'),/年降水量.*1991–2020.*mm\/年/);
    assert.equal(root.querySelector('[data-eu-origin-image]').style.display,'none');
    assert.equal(calls.length,0,'No original coloured raster is added on top of the target map');
    renderEuropeOrigin(root,null,europeLayers.find(layer=>layer.id==='crops'),config,map);
    assert.equal(root.classList.contains('has-eu-source-map'),false);
    assert.equal(root.querySelector('[data-after-map]').nextElementSibling,key,'Clearing comparison restores the original DOM position');
    assert.equal(key.hidden,true);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('switching national forest source to crop overlay restores one source key and keeps the selected country boundary',()=>{
  const {window,root}=setup();try {
    const climate=europeLayers.find(layer=>layer.id==='climate');
    renderEuropeOrigin(root,{...state('forest'),place:'FIN'},climate,config);
    const key=root.querySelector('[data-eu-origin-key]');
    assert.equal(root.querySelector('.eu-map-stage').nextElementSibling,key);
    assert.ok(key.querySelector('[data-eu-origin-place="FIN"]'));
    assert.equal(key.querySelectorAll('[data-eu-origin-legend]>div').length,7);
    renderEuropeOrigin(root,{...state('wheat'),single:true},climate,config);
    assert.equal(root.classList.contains('has-eu-source-map'),false);
    assert.equal(root.querySelector('[data-after-map]').nextElementSibling,key);
    assert.equal(root.querySelectorAll('[data-eu-origin-key]').length,1);
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] path').length,1);
    assert.equal(key.querySelector('[data-eu-origin-map]').hasAttribute('hidden'),true);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('the source map presents one existing comparison sentence and keeps switched-place context honest',()=>{
  const {window,root}=setup();try {
    const full=document.createElement('p');full.dataset.euComparisonQuestion='';
    full.textContent='年降水量と作物・家畜の分布を比べます。雨量だけから生産量を推定しません。';root.append(full);
    renderEuropeOrigin(root,state('precipitation'),europeLayers.find(layer=>layer.id==='crops'),config);
    assert.equal(root.querySelector('[data-eu-origin-question]').textContent,'年降水量と作物・家畜の分布を比べます。');
    assert.equal(full.textContent,'年降水量と作物・家畜の分布を比べます。雨量だけから生産量を推定しません。','The complete provenance question is not changed');
    full.textContent='入口は「樹木被覆と北欧の気候」です。現在の選択は別の地点です。単位と対象年を確かめます。';
    renderEuropeOrigin(root,state('treecover'),europeLayers.find(layer=>layer.id==='climate'),config);
    assert.equal(root.querySelector('[data-eu-origin-question]').textContent,'入口は「樹木被覆と北欧の気候」です。現在の選択は別の地点です。');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('the complete17-class climate source key gets its own wide row and returns to the hidden source when comparison clears',()=>{
  const {window,root}=setup();try {
    renderEuropeOrigin(root,state('climate'),europeLayers.find(layer=>layer.id==='crops'),config);
    const key=root.querySelector('[data-eu-origin-key]'),legend=root.querySelector('[data-eu-origin-legend]');
    assert.equal(root.classList.contains('has-eu-wide-source-key'),true);
    assert.equal(key.nextElementSibling,legend);
    assert.equal(legend.querySelectorAll('div').length,18);
    assert.equal(legend.getAttribute('aria-label'),'元の図の全凡例');
    renderEuropeOrigin(root,null,europeLayers.find(layer=>layer.id==='crops'),config);
    assert.equal(root.classList.contains('has-eu-wide-source-key'),false);
    assert.equal(legend.parentNode,key);
    assert.equal(key.hidden,true);
    assert.equal(root.querySelectorAll('[data-eu-origin-legend]').length,1);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('an unselected culture comparison keeps the honest overview without fetching or inventing a percentage',async()=>{
  const {root,window}=setup();
  try {
    let requests=0;
    await renderEuropeOrigin(root,state('ethnicity'),europeLayers.find(layer=>layer.id==='hubs'),config,undefined,{fetchCultureGeometry:async()=>{requests++;return cultureGeometry('england-wales-2021');}});
    assert.equal(requests,0);
    assert.equal(root.querySelector('[data-eu-origin-map]').hasAttribute('hidden'),true);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/欧州全体.*未選択/);
    assert.match(root.querySelector('[data-eu-origin-legend]').textContent,/0%ではありません/);
  } finally {window.happyDOM.abort();}
});

test('the culture source uses all331 actual LAD boundaries and the selected source category, area and denominator',async()=>{
  const {window,root}=setup();try {
    const geometry=cultureGeometry('england-wales-2021');
    const source=cultureState('ethnicity','england-wales-2021','ts021-17','E06000001');
    let request;
    await renderEuropeOrigin(root,source,europeLayers.find(layer=>layer.id==='hubs'),config,undefined,{base:'/insight-journal/',fetchCultureGeometry:async(id,options)=>{request={id,base:options.base};return geometry;}});
    const mini=root.querySelector('[data-eu-origin-map]'),paths=[...mini.querySelectorAll('path')];
    const mapped=caseMapData(europeCultureData,geometry,'ethnicity',cultureSelection(source,'ethnicity').state).features;
    assert.equal(paths.length,331);assert.deepEqual(request,{id:'england-wales-2021',base:'/insight-journal/'});
    assert.deepEqual(paths.map(node=>node.getAttribute('data-eu-origin-culture-code')),mapped.map(feature=>feature.properties.code));
    mapped.forEach((feature,index)=>{assert.equal(paths[index].getAttribute('d'),cultureGeometryPath(feature.geometry));assert.equal(paths[index].getAttribute('fill'),feature.properties.fill);assert.equal(paths[index].getAttribute('fill-rule'),'evenodd');});
    const selected=mini.querySelector('[data-eu-origin-culture-selected="true"]');
    assert.equal(selected.getAttribute('data-eu-origin-culture-code'),'E06000001');assert.equal(selected.getAttribute('stroke'),'#841e37');
    assert.match(selected.textContent,/2021年.*人／\d+人/);
    assert.notEqual(mini.getAttribute('viewBox'),'0 0 1200 1001');
    const [x,y,w,h]=mini.getAttribute('viewBox').split(' ').map(Number);assert.ok([x,y,w,h].every(Number.isFinite)&&w>0&&h>0&&w<1200&&h<1001);
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/2021年.*LAD2021.*331地域.*Hartlepool/);
    assert.deepEqual([...root.querySelectorAll('[data-eu-origin-legend]>div')].map(node=>node.textContent),cultureLegend.map(item=>item.label));
    assert.equal(root.querySelectorAll('[data-eu-comparison-overlay] path').length,0,'Culture values do not use a proxy country fill or mix with the target');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('the Croatia religion source remains one national geometry and its original response category',async()=>{
  const {window,root}=setup();try {
    const census=europeCultureData.cases.find(item=>item.id==='croatia-national-2021'),topic=census.topics.find(item=>item.kind==='religion');
    const source=cultureState('religion',census.id,topic.categories.at(-1).id,'HRV'),selection=cultureSelection(source,'religion');
    await renderEuropeOrigin(root,source,europeLayers.find(layer=>layer.id==='terrain'),config,undefined,{fetchCultureGeometry:async()=>cultureGeometry(census.id)});
    const mini=root.querySelector('[data-eu-origin-map]');assert.equal(mini.querySelectorAll('path').length,1);
    assert.equal(mini.dataset.euOriginCase,census.id);assert.equal(mini.dataset.euOriginCategory,selection.category.id);assert.equal(mini.dataset.euOriginArea,'HRV');assert.equal(mini.dataset.euOriginGrain,'national');
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/全国値 · 1地域/);assert.ok(root.querySelector('[data-eu-origin-caption]').textContent.includes(selection.category.label));
    assert.equal(mini.querySelector('path').getAttribute('data-eu-origin-culture-code'),'HRV');assert.ok(mini.querySelector('title').textContent.includes(String(selection.area.denominator)));
    renderEuropeOrigin(root,state('precipitation'),europeLayers.find(layer=>layer.id==='crops'),config);
    assert.equal(mini.getAttribute('viewBox'),'0 0 1200 1001');assert.equal(mini.dataset.euOriginCase,undefined);assert.equal(root.querySelector('[data-eu-origin-key]').classList.contains('eu-origin-culture-reference'),false);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('a late culture geometry response cannot reappear after the original comparison clears',async()=>{
  const {window,root}=setup();try {
    let resolve;const deferred=new Promise(done=>{resolve=done;});
    const pending=renderEuropeOrigin(root,cultureState('ethnicity'),europeLayers.find(layer=>layer.id==='hubs'),config,undefined,{fetchCultureGeometry:()=>deferred});
    assert.match(root.querySelector('[data-eu-origin-status]').textContent,/読み込んでいます/);
    assert.equal(root.querySelector('[data-eu-origin-map]').children.length,0,'Loading never shows fabricated colour values');
    renderEuropeOrigin(root,null,europeLayers.find(layer=>layer.id==='hubs'),config);resolve(cultureGeometry('england-wales-2021'));await pending;
    assert.equal(root.querySelector('[data-eu-origin-key]').hidden,true);assert.equal(root.querySelector('[data-eu-origin-map]').children.length,0);assert.equal(root.querySelector('[data-eu-origin-status]'),null);assert.equal(root.classList.contains('has-eu-source-map'),false);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('a late source case cannot overwrite a newer selected Croatia case',async()=>{
  const {window,root}=setup();try {
    let resolve;const deferred=new Promise(done=>{resolve=done;});
    const first=renderEuropeOrigin(root,cultureState('ethnicity'),europeLayers.find(layer=>layer.id==='hubs'),config,undefined,{fetchCultureGeometry:()=>deferred});
    await renderEuropeOrigin(root,cultureState('religion','croatia-national-2021'),europeLayers.find(layer=>layer.id==='terrain'),config,undefined,{fetchCultureGeometry:async()=>cultureGeometry('croatia-national-2021')});
    resolve(cultureGeometry('england-wales-2021'));await first;
    const mini=root.querySelector('[data-eu-origin-map]');assert.equal(mini.dataset.euOriginCase,'croatia-national-2021');assert.equal(mini.querySelectorAll('path').length,1);assert.equal(mini.querySelector('path').getAttribute('data-eu-origin-culture-code'),'HRV');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('unavailable culture source geometry preserves the honest caption and complete missing-data key',async()=>{
  const {window,root}=setup();try {
    await renderEuropeOrigin(root,cultureState('ethnicity'),europeLayers.find(layer=>layer.id==='hubs'),config,undefined,{fetchCultureGeometry:async()=>{throw new Error('offline');}});
    assert.equal(root.querySelector('[data-eu-origin-map]').children.length,0);assert.match(root.querySelector('[data-eu-origin-status]').textContent,/表示できません/);assert.match(root.querySelector('[data-eu-origin-caption]').textContent,/331地域/);assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,6);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('the original drainage map adds only the selected source-index outline while keeping all eight categorical colors and missing data',async()=>{
  const {window,root}=setup();try {
    const draws=drainageCanvas(window),basin=visibleBasins[0],source={...state('drainage'),basin:String(basin.HYBAS_ID)};
    const layer=europeLayers.find(item=>item.id==='drainage'),calls=[];let requested;
    const map={getLayer:id=>id==='land'?{}:undefined,getSource:()=>undefined,addSource:(...args)=>calls.push(args),addLayer:(...args)=>calls.push(args)};
    await renderEuropeOrigin(root,source,europeLayers.find(item=>item.id==='hubs'),config,map,{fetchDrainageValues:async url=>{requested=url;return drainageValues;}});
    const mini=root.querySelector('[data-eu-origin-map]'),images=mini.querySelectorAll('image'),outline=mini.querySelector('[data-eu-origin-drainage-outline]');
    assert.equal(requested,layer.grid);assert.equal(images.length,2);assert.equal(images[0].getAttribute('href'),layer.image,'Source color pixels use the unchanged registered image');
    assert.equal(outline,mini.lastElementChild);assert.equal(outline.getAttribute('data-eu-origin-drainage-outline'),String(basin.HYBAS_ID));assert.equal(outline.getAttribute('width'),'1200');assert.equal(outline.getAttribute('height'),'1001');
    assert.equal(mini.dataset.euOriginBasin,String(basin.HYBAS_ID));assert.equal(mini.getAttribute('viewBox'),'0 0 1200 1001');
    const rows=[...root.querySelectorAll('[data-eu-origin-legend]>div')];assert.equal(rows.length,9);assert.deepEqual(rows.slice(0,8).map(row=>row.querySelector('.eu-swatch').style.background),layer.colors.map(color=>{const node=document.createElement('span');node.style.background=color;return node.style.background;}));assert.equal(rows[8].textContent,'データなし');
    assert.deepEqual(draws[0],europeDrainageOutline(drainageValues,basin.index).rgba,'Only exact four-neighbour selected display-cell boundary pixels are encoded');
    assert.match(root.querySelector('[data-eu-origin-caption]').textContent,new RegExp('2019年公開.*量の大小なし.*'+basin.HYBAS_ID));assert.match(outline.getAttribute('aria-label'),/表示格子.*流域全体とは限りません/);
    assert.equal(root.querySelector('[data-eu-origin-status]'),null);assert.equal(calls.length,0,'No source colors are blended into the target WebGL map');
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('a late drainage lookup cannot restore an outline after clearing the comparison',async()=>{
  const {window,root}=setup();try {
    const draws=drainageCanvas(window);let resolve;const deferred=new Promise(done=>{resolve=done;});
    const pending=renderEuropeOrigin(root,{...state('drainage'),basin:String(visibleBasins[0].HYBAS_ID)},europeLayers.find(item=>item.id==='hubs'),config,undefined,{fetchDrainageValues:()=>deferred});
    assert.match(root.querySelector('[data-eu-origin-status]').textContent,/読み込んでいます/);
    renderEuropeOrigin(root,null,europeLayers.find(item=>item.id==='hubs'),config);resolve(drainageValues);await pending;
    assert.equal(draws.length,0);assert.equal(root.querySelector('[data-eu-origin-drainage-outline]'),null);assert.equal(root.querySelector('[data-eu-origin-map]').dataset.euOriginBasin,undefined);assert.equal(root.querySelector('[data-eu-origin-key]').hidden,true);assert.equal(root.classList.contains('has-eu-source-map'),false);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('a previous drainage lookup cannot overwrite a newer selected source basin',async()=>{
  const {window,root}=setup();try {
    const draws=drainageCanvas(window);let resolve;const deferred=new Promise(done=>{resolve=done;}),target=europeLayers.find(item=>item.id==='hubs');
    const old=renderEuropeOrigin(root,{...state('drainage'),basin:String(visibleBasins[0].HYBAS_ID)},target,config,undefined,{fetchDrainageValues:()=>deferred});
    const newer=visibleBasins[1];await renderEuropeOrigin(root,{...state('drainage'),basin:String(newer.HYBAS_ID)},target,config,undefined,{fetchDrainageValues:async()=>drainageValues});resolve(drainageValues);await old;
    assert.equal(draws.length,1);assert.deepEqual(draws[0],europeDrainageOutline(drainageValues,newer.index).rgba);assert.equal(root.querySelectorAll('[data-eu-origin-drainage-outline]').length,1);assert.equal(root.querySelector('[data-eu-origin-drainage-outline]').getAttribute('data-eu-origin-drainage-outline'),String(newer.HYBAS_ID));
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('a source lookup finishing after switching to rainfall cannot add drainage marks to that source',async()=>{
  const {window,root}=setup();try {
    const draws=drainageCanvas(window);let resolve;const deferred=new Promise(done=>{resolve=done;}),target=europeLayers.find(item=>item.id==='crops');
    const pending=renderEuropeOrigin(root,{...state('drainage'),basin:String(visibleBasins[0].HYBAS_ID)},target,config,undefined,{fetchDrainageValues:()=>deferred});
    renderEuropeOrigin(root,state('precipitation'),target,config);resolve(drainageValues);await pending;
    assert.equal(draws.length,0);assert.equal(root.querySelector('[data-eu-origin-drainage-outline]'),null);assert.equal(root.querySelector('[data-eu-origin-map]').dataset.euOriginBasin,undefined);assert.match(root.querySelector('[data-eu-origin-map] image').getAttribute('href'),/precipitation\.png/);assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,14);
  }finally{window.happyDOM.abort();delete globalThis.document;}
});

test('invalid or unavailable source basin lookups leave honest source colors, identifiers and missing-data legend',async()=>{
  const {window,root}=setup();try {
    const target=europeLayers.find(item=>item.id==='hubs');let requested=false;
    await renderEuropeOrigin(root,{...state('drainage'),basin:'not-a-source-id'},target,config,undefined,{fetchDrainageValues:async()=>{requested=true;return drainageValues;}});
    assert.equal(requested,false);assert.equal(root.querySelectorAll('[data-eu-origin-map] image').length,1);
    await renderEuropeOrigin(root,{...state('drainage'),basin:String(visibleBasins[0].HYBAS_ID)},target,config,undefined,{fetchDrainageValues:async()=>{throw new Error('offline');}});
    assert.equal(root.querySelector('[data-eu-origin-drainage-outline]'),null);assert.match(root.querySelector('[data-eu-origin-status]').textContent,/輪郭を表示できません/);assert.equal(root.querySelectorAll('[data-eu-origin-legend]>div').length,9);assert.ok(root.querySelector('[data-eu-origin-caption]').textContent.includes(String(visibleBasins[0].HYBAS_ID)));
  }finally{window.happyDOM.abort();delete globalThis.document;}
});
