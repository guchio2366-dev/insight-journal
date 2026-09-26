import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { asiaClimateClasses } from '../../src/data/atlas/asia-climate-definitions.ts';
import { mercatorPoint } from '../../src/lib/atlas-asia-state.ts';

// Replace the renderer/worker boundary only. The production controller, URL
// codec, selection logic and fetch handling run without a prebuilt dist/ tree.
const mapStub = `
export function setWorkerCount(){}
export function setWorkerUrl(url){window.__workerUrl=url}
export class Map {
 constructor(options){
  if(!window.__workerUrl)throw Error('Worker URL must be configured before Map');
  if(window.__forceMapFail)throw Error('WebGL unavailable');
  this.options=options;this.events={};this.sources={...options.style.sources};this.layers=Object.fromEntries(options.style.layers.map(l=>[l.id,l]));
  this.center={lng:116,lat:35};this.zoom=4;this.removed=false;this.resizeCount=0;
  this.canvas=document.createElement('canvas');options.container.append(this.canvas);
  this.scrollZoom={disable(){}};this.touchZoomRotate={disableRotation(){}};
  (window.__maps??=[]).push(this);window.__map=this;
 }
 on(name,handler){(this.events[name]??=[]).push(handler);return this}
 once(name,handler){this.on(name,handler);if(name==='load'&&!window.__deferMapLoad)queueMicrotask(async()=>{if(window.__initialSourceFailure)await this.fire('error',{error:Error('initial image 503')});await this.fire('load')});return this}
 async fire(name,event={}){for(const fn of this.events[name]??[])await fn(event)}
 getSource(id){return this.sources[id]}getLayer(id){return this.layers[id]}
 addSource(id,source){this.sources[id]=source}addLayer(layer){this.layers[layer.id]=layer}
 setLayoutProperty(id,key,value){this.layers[id].layout??={};this.layers[id].layout[key]=value}
 setFilter(){}getCenter(){return this.center}getZoom(){return this.zoom}getCanvas(){return this.canvas}
 jumpTo(options){this.center={lng:options.center[0],lat:options.center[1]};this.zoom=options.zoom??this.zoom}
 fitBounds(bounds){this.center={lng:(bounds[0][0]+bounds[1][0])/2,lat:(bounds[0][1]+bounds[1][1])/2}}
 queryRenderedFeatures(){return [{properties:{code:window.__hitCountry??'CHN'}}]}
 zoomIn(){this.zoom++}zoomOut(){this.zoom--}resize(){this.resizeCount++}
 remove(){this.removed=true;this.canvas.remove()}
}
export class Marker {
 constructor(options){this.element=options.element}
 setLngLat(coordinates){this.coordinates=coordinates;return this}
 addTo(map){map.options.container.append(this.element);return this}
 remove(){this.element.remove()}
}
`;
const entryFile = fileURLToPath(new URL('../../src/scripts/atlas-asia-explorer.ts', import.meta.url));
const bundle = await build({ tsconfigRaw: {}, entryPoints: ['controller-under-test'], bundle: true, write: false, format: 'iife', plugins: [{
  name: 'renderer-boundary', setup(builder) {
    builder.onResolve({ filter: /maplibre-gl\/.*worker.*\?worker&url$/ }, () => ({ path: 'worker-url', namespace: 'atlas-stub' }));
    builder.onResolve({ filter: /^maplibre-gl$/ }, () => ({ path: 'maplibre', namespace: 'atlas-stub' }));
    builder.onLoad({ filter: /.*/, namespace: 'atlas-stub' }, args => ({ contents: args.path === 'worker-url' ? "export default '/assets/maplibre-worker-test.js';" : mapStub, loader: 'js' }));
    // Let Node read the explicit local import graph. This also works in Windows
    // sandboxes where esbuild cannot walk parent directories for package files.
    builder.onResolve({ filter: /.*/ }, args => {
      if (args.kind === 'entry-point') return { path: entryFile, namespace: 'atlas-code' };
      if (args.namespace === 'atlas-code' && args.path.startsWith('.')) {
        const candidate = resolve(dirname(args.importer), args.path);
        const path = existsSync(candidate) ? candidate : candidate + '.ts';
        return { path, namespace: 'atlas-code' };
      }
    });
    builder.onLoad({ filter: /.*/, namespace: 'atlas-code' }, args => ({ contents: readFileSync(args.path, 'utf8'), loader: extname(args.path) === '.json' ? 'json' : 'ts' }));
  },
}] });

const delay = () => new Promise(resolve => setTimeout(resolve, 5));
async function until(check, message) {
  for (let attempt = 0; attempt < 100; attempt++) { if (check()) return; await delay(); }
  throw Error('Timed out: ' + message);
}

function fixture() {
  const singles = ['reading-title', 'reading-summary', 'reading-questions', 'map-title', 'map-eyebrow', 'map-period', 'grid-reading', 'class-code', 'class-name', 'class-description', 'rice-value', 'climate-method', 'agriculture-method', 'rice-source', 'rice-summary', 'rice-scale','physical-title','physical-takeaway','physical-value','physical-detail-title','physical-detail','physical-context','population-title','population-takeaway','population-value','population-coverage','population-detail','population-resolution','urban-population','urban-area','urban-density','urban-history','farming-title','farming-takeaway','farming-value','farming-definition','farming-coverage','farming-reference','farming-statistics-title','farming-statistics-definition','farming-statistics-status','farming-statistics-tables','farming-method','farming-map-source','farming-legend-title','farming-scale','farming-legend-note','map-gesture'];
  return `<main data-asia-atlas>
    <select data-country-select><option value=""></option><option value="JPN">Japan</option><option value="CHN">China</option><option value="MNG">Mongolia</option></select>
    <select data-city-select><option value=""></option><option value="tokyo" data-country="JPN">Tokyo</option><option value="beijing" data-country="CHN">Beijing</option></select>
    <button data-country-button="JPN"></button><button data-country-button="CHN"></button><button data-country-button="MNG"></button>
    <nav class="atlas-tabs"><a href="/insight-journal/atlas/asia/east-asia/nature/" data-field="natural"></a><a href="/insight-journal/atlas/asia/east-asia/agriculture/" data-field="agriculture"></a><a href="/insight-journal/atlas/asia/east-asia/population/" data-field="population"></a></nav>
    <div data-map-surface></div><div data-map-fallback><svg><path data-map-country="JPN"></path></svg></div>
    <div data-map-state></div><button data-map-retry hidden></button>
    <section data-overview><div class="asia-next"><p></p><div class="asia-city-links"></div></div></section>
    <article data-city-panel="tokyo" hidden></article><article data-city-panel="beijing" hidden></article>
    <section class="asia-rice-reading" data-rice-reading hidden><p class="asia-takeaway"></p></section>
    <section data-class-reading hidden></section><section data-climate-legend></section><section data-agriculture-legend hidden></section>
    <button data-climate-class="14"></button><button data-climate-class="21"></button>
    <div data-comparison-return hidden><button data-comparison-back></button></div>
    <button data-compare="natural"></button><button data-compare="agriculture"></button>
    <button data-reset></button><button data-map-fit></button><button data-zoom-in></button><button data-zoom-out></button>
    <section data-farming-panel hidden></section><div data-farming-extra hidden></div><div data-farming-map-method hidden></div><div data-farming-legend hidden></div><button data-farming-statistics-retry hidden></button><label data-farming-topics><select data-farming-topic><option value="rice"></option><option value="wheat"></option><option value="chicken"></option><option value="forest"></option></select></label><section data-population-reading hidden></section><section data-population-legend hidden></section><div data-population-city-facts hidden></div><label data-population-topics><select data-population-topic><option value="density"></option><option value="urban"></option></select></label><select data-population-city><option value=""></option><option value="uc-tokyo" data-country="JPN"></option></select><section data-physical-reading hidden></section><section data-physical-legend hidden></section>
    <label data-natural-topics><select data-natural-topic><option value="climate"></option><option value="terrain"></option><option value="water"></option></select></label>
    <select data-physical-focus><option value=""></option><option value="basin" data-country="CHN"></option></select>
    <label data-water-picker hidden><select data-water-select><option value=""></option><option value="rivers-1"></option></select></label>
    ${singles.map(name => `<div data-${name}></div>`).join('')}
    <script type="application/json" data-asia-config></script>
  </main>`;
}

async function setup(query = '', options = {}) {
  const window = new Window({ url: 'https://example.com/insight-journal/atlas/asia/east-asia/' + query,
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  window.document.body.innerHTML = fixture();
  const q = selector => window.document.querySelector(selector), root = q('[data-asia-atlas]');
  const [west, south] = mercatorPoint(72, 17), [east, north] = mercatorPoint(155, 56);
  q('[data-asia-config]').textContent = JSON.stringify({
    regionId: 'east-asia', label: '東アジア', bounds: [72, 17, 155, 56],
    countries: [{ code: 'JPN', name: '日本', bounds: [129, 30, 146, 46] }, { code: 'CHN', name: '中国', bounds: [73, 18, 135, 53] }, { code: 'MNG', name: 'モンゴル', bounds: [87, 41, 120, 53] }],
    cities: [{ id: 'tokyo', name: '東京', countryCode: 'JPN', coordinates: [139.75, 35.69] }, { id: 'beijing', name: '北京', countryCode: 'CHN', coordinates: [116.4, 39.9] }],
    classes: asiaClimateClasses, climate: { image: 'east-asia.png', imageCoordinates: [[72, 56], [155, 56], [155, 17], [72, 17]], grid: 'east-asia.grid.json', classIds: [14, 21], countryCoverage: { JPN: { classifiedPixels: 1 }, CHN: { classifiedPixels: 1 } } },
    geographyUrl: '/assets/geography.json', climateBase: '/assets/climate/', agricultureBase: '/assets/agriculture/',
    physicalBase:'/assets/physical/',physical:{width:1,height:1,bounds3857:[west,south,east,north],grid:'elevation.gz',image:'terrain.png',contours:'contours.png',water:'water.json',imageCoordinates:[[72,56],[155,56],[155,17],[72,17]],waterFeatures:[{id:'rivers-1',name:'試験河川',kind:'rivers',countries:['CHN'],bounds:[90,30,120,40]}]},
    physicalFocus:[{id:'basin',region:'east-asia',country:'CHN',name:'盆地',coordinates:[100,35],reading:'周囲の山地と比較します。'}],
  });
  if(options.population){
    const conf=JSON.parse(q('[data-asia-config]').textContent);
    const raster={width:1,height:1,bounds4326:[72,17,155,56],bounds3857:[west,south,east,north],imageCoordinates:[[72,56],[155,56],[155,17],[72,17]],image:'density.png',grid:'density.gz',sourceCellKm:5};
    conf.populationBase='/assets/population/';conf.population={...raster,urban:'urban.json',geography:'geography.json',countryCoverage:{JPN:{sourceUrbanCentres:100,listedUrbanCentres:1}},cities:[{id:'uc-tokyo',sourceId:5929,name:'東京',sourceName:'Tokyo',country:'JPN',coordinates:[139.65,35.66],bounds:[139,35,141,37],population:33447551.24,areaKm2:5165,density:6475.8,history:{2000:30000000,2010:32000000,2020:33447551.24},detail:{...raster,sourceCellKm:1,grid:'tokyo.gz',image:'tokyo.png'}}]};
    q('[data-asia-config]').textContent=JSON.stringify(conf);
  }
  if(options.farming){
    const conf=JSON.parse(q('[data-asia-config]').textContent),raster={width:1,height:1,bounds3857:[west,south,east,north],imageCoordinates:[[72,56],[155,56],[155,17],[72,17]],year:2020};
    conf.farmingBase='/assets/farming/';conf.farming={layers:[{...raster,id:'wheat',title:'小麦',kind:'crop',unit:'ha/格子',faoItem:15,image:'wheat.png',grid:'wheat.gz',breaks:[1,10],colors:['fff','ddd','aaa']},{...raster,id:'chicken',title:'鶏',kind:'livestock',unit:'羽/km²',faoItem:1057,image:'chicken.png',grid:'chicken.gz',breaks:[1,10],colors:['fff','ddd','aaa']},{...raster,id:'forest',title:'森林の分布と木材',kind:'forest',image:'forest.png'}]};
    q('[data-asia-config]').textContent=JSON.stringify(conf);
  }
  window.__hitCountry=options.hitCountry;
  window.__forceMapFail = options.mapFailure;
  window.__initialSourceFailure = options.initialSourceFailure;
  const requests = [];
  let rejectClimate, resolveRice,resolveWater,resolveUrban,resolveFarm;
  let statisticsAttempts=0;
  window.fetch = async address => {
    const name = String(address); requests.push(name);
    if (name === '/assets/geography.json') return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }));
    if(name==='/assets/farming/statistics.json.gz'){
      if(options.statisticsFailure&&statisticsAttempts++===0)throw Error('statistics 503');
      return new Response(JSON.stringify({countries:{CHN:{observations:[{domain:'Production_Crops_Livestock',item:'15',element:'Production',year:2020,unit:'t',value:134250000,flag:'A',note:null},{domain:'Production_Crops_Livestock',item:'1057',element:'Stocks',year:2020,unit:'1000 An',value:0,flag:'I',note:null}]}}}));
    }
    if(name.startsWith('/assets/farming/')){const response=()=>{const data=new Uint8Array(4);new DataView(data.buffer).setFloat32(0,name.endsWith('chicken.gz')?0:123.4,true);return new Response(data);};if(options.delayedFarm&&name.endsWith('wheat.gz'))return new Promise(resolve=>{resolveFarm=()=>resolve(response());});return response();}
    if (name.startsWith('/assets/climate/')) {
      if (options.delayedClimateFailure) return new Promise((_, reject) => { rejectClimate = reject; });
      return new Response(JSON.stringify({ width: 1, height: 1, bounds3857: [west, south, east, north], values: [14] }));
    }
    if (name.startsWith('/assets/agriculture/')) {
      const response = () => new Response(JSON.stringify({ bounds: [100, 20, 140, 60], width: 1, height: 1, cellSize: 40, positiveCells: [[0, 123.4]], validRuns: [[0, 1]] }));
      if (options.delayedRice) return new Promise(resolve => { resolveRice = () => resolve(response()); });
      return response();
    }
    if(name==='/assets/population/geography.json')return new Response(JSON.stringify({type:'FeatureCollection',features:[]}));
    if(name==='/assets/population/urban.json'){const response=()=>new Response(JSON.stringify({type:'FeatureCollection',features:[]}));if(options.delayedUrban)return new Promise(resolve=>{resolveUrban=()=>resolve(response());});return response();}
    if(name.startsWith('/assets/population/')){if(options.populationFailure)throw Error('population 503');const data=new Uint8Array(4);new DataView(data.buffer).setFloat32(0,options.populationZero?0:name.endsWith('tokyo.gz')?15000:1200,true);return new Response(data);}
    if(name==='/assets/physical/elevation.gz'){const data=new Uint8Array(2);new DataView(data.buffer).setInt16(0,-75,true);return new Response(data);}
    if(name==='/assets/physical/water.json'){const response=()=>new Response(JSON.stringify({type:'FeatureCollection',features:[]}));if(options.delayedWater)return new Promise(resolve=>{resolveWater=()=>resolve(response());});return response();}
    throw Error('Unexpected fetch: ' + name);
  };
  window.eval(bundle.outputFiles[0].text);
  await until(() => options.mapFailure ? !q('[data-map-retry]').hidden : root.dataset.mapReady === 'true', 'controller ready');
  return { window, root, q, requests, rejectClimate: () => rejectClimate?.(Error('simulated climate fetch failure')), resolveRice: () => resolveRice?.(),resolveWater:()=>resolveWater?.(),resolveUrban:()=>resolveUrban?.(),resolveFarm:()=>resolveFarm?.() };
}

test('人口は都市の輪郭・1km格子・統計を表示し、比較復帰と選択解除で状態を保つ',async()=>{
 const {window,q,requests}=await setup('?field=population&detail=uc-tokyo&topic=urban',{population:true,hitCountry:'JPN'});
 try{
  await until(()=>window.__map.getLayer('asia-urban-selected'),'urban geometry');
  assert.equal(new URL(window.location.href).searchParams.get('place'),'JPN');
  assert.equal(window.__map.layers['asia-country-border'].layout.visibility,'none');assert.equal(window.__map.layers['asia-population-border'].layout.visibility,'visible');
  assert.match(q('[data-urban-population]').textContent,/33,447,551/);assert.equal(q('[data-population-city-facts]').hidden,false);
  assert.equal(requests.some(r=>r.endsWith('tokyo.gz')),false,'numeric grid is lazy until a point is selected');
  await window.__map.fire('click',{point:{x:1,y:1},lngLat:{lng:139.76,lat:35.68}});
  assert.match(q('[data-population-value]').textContent,/15,000.*1km/);assert.equal(new URL(window.location.href).searchParams.get('detail'),'uc-tokyo');
  q('[data-compare="natural"]').click();assert.equal(window.__map.layers['asia-population-uc-tokyo'].layout.visibility,'none');assert.equal(window.__map.layers['asia-country-border'].layout.visibility,'visible');assert.equal(window.__map.layers['asia-population-border'].layout.visibility,'none');
  q('[data-comparison-back]').click();await until(()=>q('[data-population-value]').textContent.includes('15,000'),'population restore');
  assert.equal(new URL(window.location.href).searchParams.get('detail'),'uc-tokyo');assert.equal(new URL(window.location.href).searchParams.get('topic'),'urban');
  q('[data-population-city]').value='';q('[data-population-city]').dispatchEvent(new window.Event('change'));
  assert.equal(q('[data-population-city-facts]').hidden,true);assert.equal(new URL(window.location.href).searchParams.has('at'),false);assert.equal(window.__map.layers['asia-population-uc-tokyo'].layout.visibility,'none');assert.equal(window.__maps.length,1);
 }finally{await window.happyDOM.close();}
});

test('人口の推計0と取得失敗を区別し、描画できない場合も都市の表を読める',async()=>{
 for(const opts of [{populationZero:true},{populationFailure:true,mapFailure:true}]){
  const {window,q}=await setup('?field=population&detail=uc-tokyo&at=139.76,35.68',{population:true,...opts});
  try{
   await until(()=>q('[data-population-value]').textContent.includes(opts.populationZero?'0 人/km²':'取得できません'),'population status');
   assert.match(q('[data-urban-population]').textContent,/33,447,551/);
   if(opts.populationZero)assert.match(q('[data-population-value]').textContent,/海の格子/);else assert.equal(q('[data-map-retry]').hidden,false);
  }finally{await window.happyDOM.close();}
 }
});

test('都市形状の取得中に分野を変えても古い人口図を重ねない',async()=>{
 const {window,q,resolveUrban}=await setup('?field=population&topic=urban',{population:true,delayedUrban:true});
 try{
  q('[data-field="agriculture"]').click();resolveUrban();await delay();await delay();
  assert.equal(window.__map.getSource('asia-urban'),undefined);assert.equal(window.__map.layers['asia-population'].layout.visibility,'none');
  assert.equal(q('[data-population-reading]').hidden,true);
 }finally{await window.happyDOM.close();}
});

test('地形は必要時だけ読み、負の標高と主題・地点・カメラを比較復帰で保持する',async()=>{
  const {window,q,requests}=await setup();
  try{
    assert.equal(requests.some(r=>r.includes('/physical/')),false);
    q('[data-natural-topic]').value='terrain';q('[data-natural-topic]').dispatchEvent(new window.Event('change'));
    q('[data-physical-focus]').value='basin';q('[data-physical-focus]').dispatchEvent(new window.Event('change'));
    await until(()=>q('[data-physical-value]').textContent.includes('-75'),'negative elevation');
    assert.equal(q('[data-climate-legend]').hidden,true);assert.equal(q('[data-physical-reading]').hidden,false);
    assert.equal(q('[data-map-city="tokyo"]').hidden,true);
    assert.equal(window.__map.layers['asia-terrain'].layout.visibility,'visible');
    q('[data-compare="agriculture"]').click();
    await until(()=>q('[data-rice-value]').textContent.includes('123.4'),'comparison rice value');
    assert.equal(window.__map.layers['asia-terrain'].layout.visibility,'none');
    q('[data-comparison-back]').click();
    assert.equal(new URL(window.location.href).searchParams.get('topic'),'terrain');
    assert.equal(new URL(window.location.href).searchParams.get('detail'),'basin');
    assert.equal(window.__map.center.lng,100);assert.equal(window.__map.zoom,5);
    assert.match(q('[data-physical-value]').textContent,/-75/);assert.equal(window.__maps.length,1);
  }finally{await window.happyDOM.close();}
});

test('遅い河川の取得中に気候へ戻っても水系を重ねず、再選択でキャッシュを利用する',async()=>{
 const {window,q,resolveWater,requests}=await setup('?topic=water',{delayedWater:true});
 try{
  await until(()=>requests.includes('/assets/physical/water.json'),'water requested');
  q('[data-natural-topic]').value='climate';q('[data-natural-topic]').dispatchEvent(new window.Event('change'));
  resolveWater();await delay();await delay();assert.equal(window.__map.getSource('asia-water'),undefined);
  q('[data-natural-topic]').value='water';q('[data-natural-topic]').dispatchEvent(new window.Event('change'));
  await until(()=>window.__map.getLayer('asia-rivers'),'water rendered');
  q('[data-water-select]').value='rivers-1';q('[data-water-select]').dispatchEvent(new window.Event('change'));
  assert.equal(new URL(window.location.href).searchParams.get('detail'),'rivers-1');
  assert.equal(q('[data-physical-detail-title]').textContent,'試験河川');
  assert.equal(requests.filter(r=>r==='/assets/physical/water.json').length,1);
 }finally{resolveWater();await window.happyDOM.close();}
});

test('着目点だけのURLでも所属国・数値を復元し、異なる国の説明を混ぜない',async()=>{
 const first=await setup('?topic=terrain&detail=basin');
 try{await until(()=>first.q('[data-physical-value]').textContent.includes('-75'),'deep-link elevation');assert.equal(new URL(first.window.location.href).searchParams.get('place'),'CHN');assert.equal(new URL(first.window.location.href).searchParams.get('at'),'100.00000,35.00000');}finally{await first.window.happyDOM.close();}
 const second=await setup('?topic=terrain&detail=basin&place=JPN');
 try{assert.equal(new URL(second.window.location.href).searchParams.get('detail'),null);assert.notEqual(second.q('[data-physical-detail-title]').textContent,'盆地');}finally{await second.window.happyDOM.close();}
});

test('地形・河川の未選択項目は説明・地点・マーカーを解除し、地図の位置を保つ',async()=>{
 const {window,q}=await setup('?topic=terrain&detail=basin');
 try{
  await until(()=>q('[data-physical-value]').textContent.includes('-75'),'terrain ready');
  q('[data-physical-focus]').value='';q('[data-physical-focus]').dispatchEvent(new window.Event('change'));
  assert.equal(new URL(window.location.href).searchParams.get('detail'),null);assert.equal(new URL(window.location.href).searchParams.get('at'),null);
  assert.notEqual(q('[data-physical-detail-title]').textContent,'盆地');assert.equal(q('.asia-point-marker').hidden,true);assert.equal(window.__map.center.lng,100);
  q('[data-natural-topic]').value='water';q('[data-natural-topic]').dispatchEvent(new window.Event('change'));
  await until(()=>window.__map.getLayer('asia-rivers'),'water ready');
  q('[data-water-select]').value='rivers-1';q('[data-water-select]').dispatchEvent(new window.Event('change'));
  assert.equal(q('[data-physical-detail-title]').textContent,'試験河川');
  const center={...window.__map.center};
  q('[data-water-select]').value='';q('[data-water-select]').dispatchEvent(new window.Event('change'));
  assert.equal(new URL(window.location.href).searchParams.get('detail'),null);assert.notEqual(q('[data-physical-detail-title]').textContent,'試験河川');assert.equal(window.__map.center.lng,center.lng);assert.equal(window.__map.center.lat,center.lat);
  assert.match(q('[data-grid-reading]').textContent,/地図または着目点/);
 }finally{await window.happyDOM.close();}
});

test('workerを先に設定し、格子クリック→比較→復帰を一つの地図で行う', async () => {
  const { window, root, q, requests } = await setup('?city=tokyo');
  try {
    assert.equal(root.dataset.mapReady, 'true');
    assert.equal(q('[data-city-panel="tokyo"]').hidden, false);
    assert.equal(window.__maps.length, 1);
    assert.equal(requests.some(name => name.includes('manifest.json')), false);
    await window.__map.fire('click', { point: { x: 10, y: 10 }, lngLat: { lng: 116.75, lat: 34.25 } });
    assert.equal(q('[data-city-panel="tokyo"]').hidden, true);
    assert.equal(new URL(window.location.href).searchParams.get('at'), '116.75000,34.25000');
    q('[data-compare="agriculture"]').click();
    await until(() => q('[data-rice-value]').textContent.includes('123.4'), 'rice point value');
    assert.equal(q('[data-comparison-return]').hidden, false);
    assert.equal(window.__map.layers['asia-climate'].layout.visibility, 'none');
    q('[data-comparison-back]').click();
    await until(() => q('[data-grid-reading]').textContent.includes('Cfa'), 'climate point restored');
    assert.equal(q('[data-rice-reading]').hidden, true);
    assert.equal(new URL(window.location.href).searchParams.get('at'), '116.75000,34.25000');
    assert.equal(window.__maps.length, 1);
  } finally { await window.happyDOM.close(); }
});

test('分野リンクは選択を含む実URLになり、切替・履歴復元でも地図を作り直さない', async () => {
  const { window, q } = await setup('nature/?place=JPN&city=tokyo&lng=139.75&lat=35.69&z=5');
  try {
    await until(() => q('[data-grid-reading]').textContent.includes('Cfa'), 'initial climate loaded');
    const agriculture = q('.atlas-tabs [data-field="agriculture"]');
    assert.equal(new URL(agriculture.href).pathname, '/insight-journal/atlas/asia/east-asia/agriculture/');
    assert.equal(new URL(agriculture.href).searchParams.get('city'), 'tokyo');
    const original = window.location.href;
    const activate = new window.MouseEvent('click', { bubbles:true, cancelable:true, button:0 });
    agriculture.dispatchEvent(activate);
    assert.equal(activate.defaultPrevented, true);
    assert.equal(window.location.pathname, '/insight-journal/atlas/asia/east-asia/agriculture/');
    assert.equal(agriculture.getAttribute('aria-current'), 'page');
    assert.equal(q('[data-city-panel="tokyo"]').hidden, true);
    assert.equal(q('[data-rice-reading]').hidden, false);
    await until(() => q('[data-rice-value]').textContent.includes('123.4'), 'rice selection loaded');
    window.history.replaceState({}, '', original);
    window.dispatchEvent(new window.PopStateEvent('popstate'));
    assert.equal(q('.atlas-tabs [data-field="natural"]').getAttribute('aria-current'), 'page');
    assert.equal(q('[data-city-panel="tokyo"]').hidden, false);
    assert.equal(q('[data-rice-reading]').hidden, true);
    await until(() => q('[data-grid-reading]').textContent.includes('Cfa'), 'restored climate loaded');
    assert.equal(window.__maps.length, 1);
    const modified = new window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    let intercepted;
    agriculture.addEventListener('click', event => { intercepted = event.defaultPrevented; event.preventDefault(); }, {once:true});
    agriculture.dispatchEvent(modified);
    assert.equal(intercepted, false, 'modified clicks retain normal link behavior');
    assert.equal(window.__maps.length, 1);
    await delay();
    window.__map.center = {lng:138.2,lat:36.5}; window.__map.zoom = 6;
    await window.__map.fire('moveend');
    await until(() => new URL(agriculture.href).searchParams.get('lng') === '138.20000', 'field link follows map movement');
    assert.equal(new URL(agriculture.href).searchParams.get('lat'),'36.50000');
    assert.equal(new URL(agriculture.href).searchParams.get('z'),'6.000');
  } finally { await window.happyDOM.close(); }
});

test('描画を使えない場合も都市図表を選択でき、再試行で地図を起動する', async () => {
  const { window, q, root } = await setup('', { mapFailure: true });
  try {
    assert.equal(q('[data-map-fallback]').hidden, false);
    q('[data-city-select]').value = 'tokyo';
    q('[data-city-select]').dispatchEvent(new window.Event('change'));
    assert.equal(q('[data-city-panel="tokyo"]').hidden, false);
    assert.equal(new URL(window.location.href).searchParams.get('place'), 'JPN');
    window.__forceMapFail = false; q('[data-map-retry]').click();
    await until(() => root.dataset.mapReady === 'true', 'retry map ready');
    assert.equal(q('[data-map-fallback]').hidden, true);
    assert.equal(q('[data-city-panel="tokyo"]').hidden, false);
  } finally { await window.happyDOM.close(); }
});

test('画像取得エラーとcanvasのWebGL停止から地図を再生成し、マーカーを重複させない', async () => {
  const { window, root, q } = await setup();
  try {
    const first = window.__map;
    await first.fire('error', { error: Error('image 503') });
    assert.equal(q('[data-map-retry]').hidden, false);
    q('[data-map-retry]').click();
    await until(() => window.__maps.length === 2 && root.dataset.mapReady === 'true', 'image retry');
    assert.equal(first.removed, true);
    assert.equal(q('[data-map-surface]').querySelectorAll('[data-map-city]').length, 2);
    const second = window.__map;
    second.getCanvas().dispatchEvent(new window.Event('webglcontextlost', { bubbles: false }));
    assert.equal(root.dataset.mapReady, 'false');
    assert.equal(q('[data-map-fallback]').hidden, false);
    q('[data-map-retry]').click();
    await until(() => window.__maps.length === 3 && root.dataset.mapReady === 'true', 'context retry');
    assert.equal(second.removed, true);
    assert.equal(q('[data-map-surface]').querySelectorAll('[data-map-city]').length, 2);
  } finally { await window.happyDOM.close(); }
});

test('BFCacheへの移動と復帰では地図を破棄せずサイズを再確認する', async () => {
  const { window } = await setup();
  try {
    const map = window.__map;
    for (const name of ['pagehide', 'pageshow']) {
      const event = new window.Event(name); Object.defineProperty(event, 'persisted', { value: true });
      window.dispatchEvent(event);
    }
    assert.equal(map.removed, false);
    assert.equal(map.resizeCount, 1);
    assert.equal(window.__maps.length, 1);
  } finally { await window.happyDOM.close(); }
});

test('以前の気候取得が失敗しても、新しく開いた農業分野へエラーを上書きしない', async () => {
  const { window, q, rejectClimate } = await setup('?city=tokyo', { delayedClimateFailure: true });
  try {
    q('[data-field="agriculture"]').click();
    await until(() => q('[data-map-state]').hidden, 'agriculture ready');
    rejectClimate(); await delay(); await delay();
    assert.equal(q('[data-rice-reading]').hidden, false);
    assert.equal(q('[data-map-state]').hidden, true, 'inactive climate request must not replace active agriculture status');
  } finally { rejectClimate(); await window.happyDOM.close(); }
});

test('国の米データ欠測を選択直後に説明し、収録国への切替で格子案内へ戻す', async () => {
  const { window, q } = await setup('?field=agriculture&place=MNG');
  try {
    await until(() => q('[data-map-state]').hidden, 'agriculture ready');
    assert.equal(new URL(window.location.href).searchParams.get('place'), 'MNG');
    for (const selector of ['[data-grid-reading]', '[data-rice-value]']) {
      const text = q(selector).textContent;
      assert.match(text, /データ(?:が)?(?:なし|ありません)|欠測|収録されていません|有効な格子がありません/, selector + ' explains missing country data');
      assert.match(text, /0.*(?:意味ではありません|意味しません)/, selector + ' does not equate missing data with zero');
      assert.doesNotMatch(text, /0\s*ha/, selector + ' does not display a measured zero');
    }
    q('[data-country-select]').value = 'CHN';
    q('[data-country-select]').dispatchEvent(new window.Event('change'));
    await delay(); // Let the cached-grid continuation finish before closing the DOM.
    assert.equal(new URL(window.location.href).searchParams.get('place'), 'CHN');
    for (const selector of ['[data-grid-reading]', '[data-rice-value]']) {
      assert.match(q(selector).textContent, /地図上.*選ぶと.*格子/);
      assert.doesNotMatch(q(selector).textContent, /データなし|欠測|収録されていません/);
    }
  } finally { await window.happyDOM.close(); }
});

test('米の数値取得が成功しても、地図画像の失敗と再試行ボタンを消さない', async () => {
  const { window, q, resolveRice } = await setup('?city=tokyo', { delayedRice: true });
  try {
    q('[data-field="agriculture"]').click();
    await window.__map.fire('error', { error: Error('rice image 503') });
    assert.equal(q('[data-map-retry]').hidden, false);
    resolveRice();
    await until(() => q('[data-rice-value]').textContent.includes('123.4'), 'rice numeric data ready');
    assert.equal(q('[data-map-state]').hidden, false, 'JSON success does not prove the map image loaded');
    assert.equal(q('[data-map-retry]').hidden, false);
  } finally { resolveRice(); await window.happyDOM.close(); }
});

test('初期画像が失敗した場合はMapLibre load到達後も再試行を案内する', async () => {
  const { window, root, q } = await setup('', { initialSourceFailure: true });
  try {
    assert.equal(root.dataset.mapReady, 'true');
    assert.equal(q('[data-map-state]').hidden, false, 'MapLibre load does not prove every source succeeded');
    assert.equal(q('[data-map-retry]').hidden, false);
    window.__initialSourceFailure = false;
    q('[data-map-retry]').click();
    await until(() => window.__maps.length === 2 && root.dataset.mapReady === 'true', 'clean source retry');
    assert.equal(q('[data-map-state]').hidden, true);
    assert.equal(q('[data-map-retry]').hidden, true);
  } finally { await window.happyDOM.close(); }
});

test('農林業は品目・単位・地点を切り替え、国別統計と比較復帰を保持する',async()=>{
 const {window,q,requests}=await setup('?field=agriculture&topic=wheat&place=CHN&at=116,35',{farming:true,population:true});
 try{
  await until(()=>q('[data-farming-value]').textContent.includes('123.4'),'wheat reading');
  await until(()=>q('[data-farming-statistics-tables]').textContent.includes('134,250,000'),'published production');
  assert.equal(q('[data-rice-reading]').hidden,true);assert.equal(window.__map.layers['asia-farming-wheat'].layout.visibility,'visible');
  assert.match(q('[data-farming-statistics-status]').textContent,/中国本土/);
  q('[data-compare="natural"]').click();assert.equal(window.__map.layers['asia-farming-wheat'].layout.visibility,'none');
  q('[data-comparison-back]').click();assert.equal(new URL(window.location.href).searchParams.get('topic'),'wheat');assert.match(q('[data-farming-value]').textContent,/123.4.*ha/);
  q('[data-farming-topic]').value='chicken';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));await until(()=>q('[data-farming-value]').textContent.includes('0 羽/km²'),'chicken zero');
  assert.match(q('[data-farming-statistics-tables]').textContent,/千羽/);assert.match(q('[data-farming-statistics-tables]').textContent,/2020.*0/);assert.match(q('[data-farming-statistics-tables]').textContent,/2015.*未掲載/);
  q('[data-farming-topic]').value='forest';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));assert.match(q('[data-farming-value]').textContent,/地点の数値は計算せず/);assert.equal(requests.some(r=>r.includes('forest.gz')),false);
  q('[data-farming-topic]').value='rice';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));assert.equal(q('[data-rice-reading]').hidden,false);await until(()=>q('[data-rice-value]').textContent.includes('123.4'),'rice restore');assert.equal(window.__maps.length,1);
 }finally{await window.happyDOM.close();}
});
test('農林業の遅い応答は新しい主題を上書きせず、統計の失敗は単独で再試行できる',async()=>{
 const {window,q,resolveFarm}=await setup('?field=agriculture&topic=wheat&place=CHN&at=116,35',{farming:true,delayedFarm:true,statisticsFailure:true});
 try{
  await until(()=>!q('[data-farming-statistics-retry]').hidden,'statistics error');q('[data-farming-statistics-retry]').click();
  await until(()=>q('[data-farming-statistics-tables]').textContent.includes('134,250,000'),'statistics retry');
  q('[data-farming-topic]').value='forest';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));resolveFarm();await delay();await delay();
  assert.match(q('[data-farming-value]').textContent,/参考画像/);assert.equal(window.__map.layers['asia-farming-wheat'].layout.visibility,'none');assert.equal(q('[data-farming-statistics-retry]').hidden,true);
 }finally{await window.happyDOM.close();}
});
