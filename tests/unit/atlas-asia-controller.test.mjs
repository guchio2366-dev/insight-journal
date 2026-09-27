import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { asiaClimateClasses } from '../../src/data/atlas/asia-climate-definitions.ts';
import { mercatorPoint } from '../../src/lib/atlas-asia-state.ts';
import {gunzipSync} from 'node:zlib';

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
 getSource(id){return this.sources[id]}getLayer(id){return this.layers[id]}getStyle(){return this.removed?undefined:this.options.style}
 addSource(id,source){this.sources[id]=source}addLayer(layer){this.layers[layer.id]=layer}
 removeLayer(id){delete this.layers[id]}removeSource(id){delete this.sources[id]}
 setLayoutProperty(id,key,value){this.layers[id].layout??={};this.layers[id].layout[key]=value}
 setPaintProperty(id,key,value){this.layers[id].paint??={};this.layers[id].paint[key]=value}

 setFilter(id,filter){this.layers[id].filter=filter}getCenter(){return this.center}getZoom(){return this.zoom}getCanvas(){return this.canvas}
 jumpTo(options){this.center={lng:options.center[0],lat:options.center[1]};this.zoom=options.zoom??this.zoom}
 fitBounds(bounds){this.center={lng:(bounds[0][0]+bounds[1][0])/2,lat:(bounds[0][1]+bounds[1][1])/2}}
 queryRenderedFeatures(point,options){if(options?.layers?.includes('asia-social-admin')&&window.__hitSocialId)return [{properties:{id:window.__hitSocialId}}];return [{properties:{code:window.__hitCountry??'CHN'}}]}
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
  if(options.industry){
    const conf=JSON.parse(q('[data-asia-config]').textContent);
    const topic=(id,title,kind,country,fuel)=>({id,title,kind,country,fuel,parent:'製造業',unit:'百万円',year:'2024',source:'https://example.org/source',note:'公表値の定義です。'});
    conf.industryBase='/assets/industry/';conf.industry={data:'east.json.gz',countries:['JPN','CHN','MNG'],topics:[topic('manufacturing','製造業','national'),topic('jp-00','日本製造業','admin','JPN'),topic('power-all','発電所','power',null,'all'),topic('power-coal','石炭','power',null,'Coal')]};
    q('[data-asia-config]').textContent=JSON.stringify(conf);
    const fields=['industry-panel','industry-topics','industry-legend','industry-title','industry-lead','industry-value','industry-definition','industry-coverage','industry-status','industry-content','industry-method','industry-legend-title','industry-scale','industry-legend-note','industry-search-label','industry-detail-label'];
    for(const name of fields){const e=window.document.createElement('div');e.setAttribute('data-'+name,'');root.append(e);}
    root.insertAdjacentHTML('beforeend','<button data-industry-retry></button><input data-industry-search><select data-industry-detail></select><select data-industry-topic>'+conf.industry.topics.map(t=>'<option value="'+t.id+'">'+t.title+'</option>').join('')+'</select>');
    q('.atlas-tabs').insertAdjacentHTML('beforeend','<a data-field="industry" href="/insight-journal/atlas/asia/east-asia/industry/">産業</a>');
  }
  if(options.hydrology){
    const conf=JSON.parse(q('[data-asia-config]').textContent);
    conf.waterBase='/assets/hydrology/';conf.water={basins:'basins.json.gz',groundwater:'groundwater.json.gz',basinCount:1,groundwaterCount:1,coverage:{JPN:{maskCells:1,displayCells:1,basins:1,groundwater:1},CHN:{maskCells:1,displayCells:1,basins:0,groundwater:0}},precipitation:{width:1,height:1,bounds3857:[west,south,east,north],imageCoordinates:[[72,56],[155,56],[155,17],[72,17]],image:'rain.png',grid:'rain.gz'}};
    q('[data-asia-config]').textContent=JSON.stringify(conf);
    for(const name of ['panel','legend','legend-title','scale','legend-note','title','lead','value','definition','coverage','status','detail-label','picker-note','content','scene-reading','method']){const e=window.document.createElement('div');e.setAttribute('data-hydrology-'+name,'');root.append(e);}
    root.insertAdjacentHTML('beforeend','<button data-hydrology-retry></button><select data-hydrology-detail></select><select data-hydrology-scene></select>');
    for(const topic of ['precipitation','basins','groundwater']){q('[data-natural-topic]').insertAdjacentHTML('beforeend','<option value="'+topic+'">'+topic+'</option>');root.insertAdjacentHTML('beforeend','<button data-hydrology-related="'+topic+'">'+topic+'</button>');}
  }
  if(options.social){
    const conf=JSON.parse(q('[data-asia-config]').textContent),manifest=JSON.parse(readFileSync(new URL('../../public/assets/atlas/asia-social-v1/manifest.json',import.meta.url),'utf8'));
    conf.social=manifest.regions['east-asia'];conf.socialBase='/assets/social/';q('[data-asia-config]').textContent=JSON.stringify(conf);
    for(const name of ['panel','legend','legend-title','scale','legend-note','title','lead','value','definition','coverage','status','metric-label','area-label','content','method']){const e=window.document.createElement('div');e.setAttribute('data-social-'+name,'');root.append(e);}
    root.insertAdjacentHTML('beforeend','<button data-social-retry></button><select data-social-metric></select><select data-social-area></select><button data-social-density></button>');
    for(const g of conf.social.groups){const t=conf.social.topics.find(t=>t.group===g.id&&(t.key==='old'||t.key==='rate'||t.key==='foreign'));q('[data-population-topic]').insertAdjacentHTML('beforeend','<option value="'+t.id+'">'+g.label+'</option>');}
  }
  window.__hitCountry=options.hitCountry;
  window.__forceMapFail = options.mapFailure;
  window.__initialSourceFailure = options.initialSourceFailure;
  const requests = [];
  let rejectClimate, resolveRice,resolveWater,resolveUrban,resolveFarm;
  let statisticsAttempts=0,industryAttempts=0,resolveIndustry;
  let hydrologyAttempts=0,resolveHydrology;
  let socialAttempts=0,resolveSocial;
  window.fetch = async address => {
    const name = String(address); requests.push(name);
    if(name.startsWith('/assets/social/')){
      if(options.socialFailure&&socialAttempts++===0)throw Error('social 503');
      const bytes=readFileSync(new URL('../../public/assets/atlas/asia-social-v1/east-asia.json.gz',import.meta.url));
      const response=()=>new Response(options.socialCompressed?bytes:gunzipSync(bytes));
      if(options.delayedSocial)return new Promise(resolve=>{resolveSocial=()=>resolve(response());});return response();
    }
    if(name.startsWith('/assets/hydrology/')){
      if(options.hydrologyFailure&&hydrologyAttempts++===0)throw Error('hydrology 503');
      const response=()=>{
        if(name.endsWith('rain.gz')){const b=new Uint8Array(2);new DataView(b.buffer).setInt16(0,options.rainMissing?-32768:options.rainZero?0:1534,true);return new Response(b);}
        const basin=name.endsWith('basins.json.gz'),id=basin?'b-123':'g-456',geometry={type:'FeatureCollection',features:[{type:'Feature',properties:{id,category:15},geometry:{type:'Polygon',coordinates:[[[138,34],[141,34],[141,38],[138,38],[138,34]]]}}]};
        const record={id,sourceId:basin?123:456,countries:['JPN'],point:[139.75,35.69],countryPoints:{JPN:[139.75,35.69]},bounds:[138,34,141,38],...(basin?{name:'試験河川を含む集水域',areaKm2:12345.6,subBasins:3,endorheic:false,coastal:!!options.coastal,outsideFrame:true,otherTargetCountries:[],flow:options.coastal?null:{mean:100,lowestMonth:20,highestMonth:300}}:{class:15,aquifer:'major groundwater basin',recharge:'very high (>300)'})};return new Response(JSON.stringify({records:[record],geometry,outlines:geometry}));
      };
      if(options.delayedHydrology&&name.endsWith('basins.json.gz'))return new Promise(resolve=>{resolveHydrology=()=>resolve(response());});return response();
    }
    if(name==='/assets/industry/national.json.gz')return new Response(JSON.stringify({missingNotes:{},indicators:['manufacturing','agriculture','industry','services'].map(id=>({id,label:id,observations:[{countryCode:'JPN',year:2024,value:30},{countryCode:'CHN',year:2024,value:null}]}))}));
    if(name==='/assets/industry/east.json.gz'){
      if(options.industryFailure&&industryAttempts++===0)throw Error('industry 503');
      const response=()=>new Response(JSON.stringify({admin:[{id:'JP-23',country:'JPN',name:'愛知県',sourceName:'Aichi',point:[137,35],bounds:[136,34,138,36],series:{'jp-00':[{year:'2024',value:59314388}]}}],power:[{id:'p1',country:'JPN',name:'Water plant',fuel:'Hydro',point:[136,35],capacity:100,capacityYear:null,source:'WRI',url:'https://example.org/plant',locationSource:'Original',generation:[]},{id:'p2',country:'CHN',name:'Coal plant',fuel:'Coal',point:[110,35],capacity:200,generation:[]}],steel:{},geometry:{type:'FeatureCollection',features:[]}}));
      if(options.delayedIndustry)return new Promise(resolve=>{resolveIndustry=()=>resolve(response());});return response();
    }
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
  return { window, root, q, requests, rejectClimate: () => rejectClimate?.(Error('simulated climate fetch failure')), resolveRice: () => resolveRice?.(),resolveWater:()=>resolveWater?.(),resolveUrban:()=>resolveUrban?.(),resolveFarm:()=>resolveFarm?.(),resolveIndustry:()=>resolveIndustry?.(),resolveHydrology:()=>resolveHydrology?.(),resolveSocial:()=>resolveSocial?.() };
}

test('社会統計は必要時にだけ読み込み、密度との比較から区域・主題・地点へ戻る',async()=>{
 const initial=await setup('',{social:true,population:true});try{await delay();assert.equal(initial.requests.some(r=>r.startsWith('/assets/social/')),false);}finally{await initial.window.happyDOM.close();}
 const {window,q,requests}=await setup('?field=population&topic=jp-age-old&detail=s-JP-05',{social:true,population:true});
 try{
  await until(()=>q('[data-social-value]').textContent.includes('37.6'),'Akita loaded');assert.equal(q('[data-population-reading]').hidden,true);assert.equal(requests.some(r=>r.endsWith('density.gz')),false);
  const before=new URL(window.location.href);assert.equal(before.searchParams.get('place'),'JPN');
  q('[data-social-density]').click();await delay();assert.equal(q('[data-social-panel]').hidden,true);assert.equal(window.__map.layers['asia-social-admin'].layout.visibility,'none');
  q('[data-comparison-back]').click();await until(()=>!q('[data-social-panel]').hidden,'return');const after=new URL(window.location.href);
  for(const key of ['topic','detail','place','at'])assert.equal(after.searchParams.get(key),before.searchParams.get(key));
  q('[data-social-metric]').value='jp-age-young';q('[data-social-metric]').dispatchEvent(new window.Event('change'));assert.equal(new URL(window.location.href).searchParams.get('detail'),'s-JP-05');assert.equal(q('[data-population-topic]').value,'jp-age-old');
  window.__map.getCanvas().dispatchEvent(new window.Event('webglcontextlost'));q('[data-map-retry]').click();await until(()=>window.__maps.length===2&&window.__map.getLayer('asia-social-admin'),'social map rebuilt');assert.equal(requests.filter(r=>r.startsWith('/assets/social/')).length,1);
  q('[data-country-select]').value='CHN';q('[data-country-select]').dispatchEvent(new window.Event('change'));assert.equal(new URL(window.location.href).searchParams.get('topic'),'national-age-old');assert.equal(new URL(window.location.href).searchParams.has('detail'),false);
 }finally{await window.happyDOM.close();}
});

test('社会統計の遅い応答・取得失敗・手動再読込でも別主題を書き換えない',async()=>{
 const late=await setup('?field=population&topic=jp-age-old',{social:true,population:true,delayedSocial:true});
 try{late.q('[data-field="natural"]').click();late.resolveSocial();await delay();await delay();assert.equal(late.q('[data-social-panel]').hidden,true);assert.equal(late.window.__map.getLayer('asia-social-admin'),undefined);}finally{late.resolveSocial();await late.window.happyDOM.close();}
 const {window,q,requests}=await setup('?field=population&topic=jp-age-old&detail=s-JP-13',{social:true,population:true,socialFailure:true});
 try{await until(()=>!q('[data-social-retry]').hidden,'social retry');const count=requests.length;await delay();assert.equal(requests.length,count);q('[data-social-retry]').click();await until(()=>q('[data-social-value]').textContent.includes('22.82'),'retry succeeded');assert.match(q('[data-social-content]').textContent,/14,047,594/);}finally{await window.happyDOM.close();}
});

test('水の資料は主題ごとに遅延取得し、降水量0と欠測を区別する',async()=>{
 const initial=await setup('',{hydrology:true});try{await delay();assert.equal(initial.requests.some(r=>r.startsWith('/assets/hydrology/')),false);}finally{await initial.window.happyDOM.close();}
 for(const missing of [false,true]){
  const {window,q,requests}=await setup('?topic=precipitation&detail=w-tokyo',{hydrology:true,rainZero:!missing,rainMissing:missing});
  try{await until(()=>!q('[data-hydrology-value]').textContent.includes('読み込'),'rain loaded');assert.match(q('[data-hydrology-value]').textContent,missing?/データなし/:/年降水量 0 mm\/年/);assert.equal(new URL(window.location.href).searchParams.get('at'),'139.75000,35.69000');assert.equal(requests.some(r=>r.includes('basins')||r.includes('groundwater')||r.startsWith('/assets/climate/')),false);}finally{await window.happyDOM.close();}
 }
});
test('流域の直接URLと比較復帰は国・地点・流域を保持し、地下水へ同じ地点を渡す',async()=>{
 const {window,q,requests}=await setup('?topic=basins&detail=b-123',{hydrology:true,population:true});
 try{
  await until(()=>q('[data-hydrology-value]').textContent.includes('12,345.6')&&window.__map.getLayer('asia-hydrology-basins'),'basin ready');
  assert.equal(new URL(window.location.href).searchParams.get('place'),'JPN');assert.match(q('[data-hydrology-content]').textContent,/1971–2000/);assert.match(q('[data-hydrology-content]').textContent,/表示枠の外/);
  q('[data-compare="agriculture"]').click();await delay();assert.equal(window.__map.layers['asia-hydrology-basins'].layout.visibility,'none');q('[data-comparison-back]').click();
  await until(()=>q('[data-hydrology-value]').textContent.includes('12,345.6'),'basin return');assert.equal(new URL(window.location.href).searchParams.get('detail'),'b-123');
  q('[data-hydrology-related="groundwater"]').click();await until(()=>q('[data-hydrology-value]').textContent.includes('300超'),'groundwater');assert.equal(new URL(window.location.href).searchParams.get('at'),'139.75000,35.69000');
  assert.equal(requests.filter(r=>r.endsWith('basins.json.gz')).length,1);assert.equal(window.__map.layers['asia-hydrology-basins'].layout.visibility,'none');
  window.__map.getCanvas().dispatchEvent(new window.Event('webglcontextlost'));q('[data-map-retry]').click();await until(()=>window.__maps.length===2&&window.__map.getLayer('asia-hydrology-groundwater'),'water rebuilt');assert.equal(requests.filter(r=>r.endsWith('groundwater.json.gz')).length,1);
 }finally{await window.happyDOM.close();}
});
test('水の遅い応答・失敗・未掲載・沿岸区分を混同しない',async()=>{
 const late=await setup('?topic=basins',{hydrology:true,delayedHydrology:true});
 try{late.q('[data-field="agriculture"]').click();late.resolveHydrology();await delay();await delay();assert.equal(late.q('[data-hydrology-panel]').hidden,true);assert.equal(late.window.__map.getLayer('asia-hydrology-basins'),undefined);}finally{late.resolveHydrology();await late.window.happyDOM.close();}
 const {window,q,requests}=await setup('?topic=basins&detail=b-123',{hydrology:true,hydrologyFailure:true,coastal:true});
 try{await until(()=>!q('[data-hydrology-retry]').hidden,'retry shown');const count=requests.length;await delay();assert.equal(requests.length,count,'no automatic retry loop');q('[data-hydrology-retry]').click();await until(()=>q('[data-hydrology-content]').textContent.includes('複数の出口'),'retry complete');assert.equal(q('[data-hydrology-content] table'),null);q('[data-country-select]').value='CHN';q('[data-country-select]').dispatchEvent(new window.Event('change'));assert.match(q('[data-hydrology-coverage]').textContent,/区域がありません/);assert.equal(new URL(window.location.href).searchParams.has('detail'),false);}finally{await window.happyDOM.close();}
});

test('他分野の初期表示は産業データを読み込まず、未検証URLは読み込み後に照合する',async()=>{
 const initial=await setup('',{industry:true});
 try{await delay();assert.equal(initial.requests.some(r=>r.startsWith('/assets/industry/')),false);}finally{await initial.window.happyDOM.close();}
 for(const query of ['?field=industry&topic=power-coal&detail=p1','?field=industry&topic=power-all&detail=unknown','?field=industry&topic=power-all&place=CHN&detail=p1']){
  const {window,q}=await setup(query,{industry:true});
  try{await until(()=>window.__map.getLayer('asia-industry-power'),'lazy URL validated');assert.equal(new URL(window.location.href).searchParams.has('detail'),false);assert.doesNotMatch(q('[data-industry-value]').textContent,/Water plant/);}finally{await window.happyDOM.close();}
 }
});

test('未読み込みの産業詳細を比較元に持つURLから施設へ復帰できる',async()=>{
 const {window,q,requests}=await setup('?back='+encodeURIComponent('field=industry&topic=power-all&detail=p1'),{industry:true});
 try{assert.equal(requests.some(r=>r.startsWith('/assets/industry/')),false);q('[data-comparison-back]').click();await until(()=>q('[data-industry-value]').textContent.includes('Water plant'),'saved facility loaded');assert.equal(new URL(window.location.href).searchParams.get('detail'),'p1');assert.equal(new URL(window.location.href).searchParams.get('place'),'JPN');}finally{await window.happyDOM.close();}
});

test('産業の国内値・詳細URL・比較復帰は同じ場所を保持する',async()=>{
 const {window,q,requests}=await setup('?field=industry&topic=jp-00&detail=JP-23',{industry:true,population:true});
 try{
  await until(()=>q('[data-industry-value]').textContent.includes('59,314,388')&&window.__map.getLayer('asia-industry-admin'),'industry loaded');
  assert.equal(new URL(window.location.href).searchParams.get('place'),'JPN');
  assert.equal(new URL(window.location.href).searchParams.get('at'),'137.00000,35.00000');
  assert.equal(window.__map.layers['asia-industry-admin'].layout.visibility,'visible');
  q('[data-compare="natural"]').click();await delay();assert.equal(window.__map.layers['asia-industry-admin'].layout.visibility,'none');
  q('[data-comparison-back]').click();await until(()=>window.__map.layers['asia-industry-admin'].layout.visibility==='visible','industry restored');
  assert.equal(new URL(window.location.href).searchParams.get('detail'),'JP-23');assert.match(q('[data-industry-value]').textContent,/59,314,388/);
  q('[data-industry-topic]').value='power-all';q('[data-industry-topic]').dispatchEvent(new window.Event('change'));
  await until(()=>window.__map.getLayer('asia-industry-power'),'power rendered');
  q('[data-industry-detail]').value='p1';q('[data-industry-detail]').dispatchEvent(new window.Event('change'));assert.match(q('[data-industry-value]').textContent,/Water plant.*100 MW/);
  q('[data-industry-topic]').value='power-coal';q('[data-industry-topic]').dispatchEvent(new window.Event('change'));assert.equal(new URL(window.location.href).searchParams.has('detail'),false);assert.doesNotMatch(q('[data-industry-content]').textContent,/Water plant/);
  assert.equal(requests.filter(r=>r==='/assets/industry/east.json.gz').length,1);assert.equal(window.__maps.length,1);
 }finally{await window.happyDOM.close();}
});
test('遅い産業応答は別分野へ図や説明を戻さず、後から主題を選べる',async()=>{
 const {window,q,resolveIndustry,requests}=await setup('?field=industry&topic=jp-00',{industry:true,delayedIndustry:true});
 try{
  await until(()=>requests.includes('/assets/industry/east.json.gz'),'industry requested');q('[data-field="natural"]').click();resolveIndustry();await delay();await delay();
  assert.equal(q('[data-industry-panel]').hidden,true);assert.equal(window.__map.getLayer('asia-industry-admin'),undefined);
  q('[data-field="industry"]').click();await until(()=>window.__map.getLayer('asia-industry-national'),'industry opened');assert.match(q('[data-industry-title]').textContent,/製造業/);
 }finally{resolveIndustry();await window.happyDOM.close();}
});
test('産業資料の取得失敗は再試行でき、地図描画なしでも値を読める',async()=>{
 const {window,q}=await setup('?field=industry&topic=jp-00&detail=JP-23',{industry:true,industryFailure:true,mapFailure:true});
 try{await until(()=>!q('[data-industry-retry]').hidden,'industry failure');q('[data-industry-retry]').click();await until(()=>q('[data-industry-value]').textContent.includes('59,314,388'),'industry retry');assert.equal(q('[data-industry-retry]').hidden,true);assert.equal(q('[data-map-fallback]').hidden,false);}finally{await window.happyDOM.close();}
});
test('発電施設の直接URLで行政区域の色・選択線を重ねない',async()=>{
 const {window,q}=await setup('?field=industry&topic=power-all&detail=p1',{industry:true});
 try{await until(()=>window.__map.getLayer('asia-industry-power'),'power loaded');assert.equal(window.__map.getLayer('asia-industry-admin'),undefined);assert.equal(window.__map.getLayer('asia-industry-national'),undefined);assert.match(q('[data-industry-value]').textContent,/100 MW/);assert.equal(window.__map.layers['asia-industry-power-selected'].layout.visibility,'visible');}finally{await window.happyDOM.close();}
});

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
  q('[data-compare="natural"]').click();assert.equal(window.__map.layers['asia-farming-wheat'],undefined);assert.equal(window.__map.sources['asia-farming-wheat'],undefined);
  q('[data-comparison-back]').click();assert.equal(new URL(window.location.href).searchParams.get('topic'),'wheat');await until(()=>q('[data-farming-value]').textContent.includes('123.4'),'wheat reloaded');
  assert.equal(requests.filter(r=>r.endsWith('wheat.gz')).length,2);
  q('[data-farming-topic]').value='chicken';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));await until(()=>q('[data-farming-value]').textContent.includes('0 羽/km²'),'chicken zero');
  assert.match(q('[data-farming-statistics-tables]').textContent,/千羽/);assert.match(q('[data-farming-statistics-tables]').textContent,/2020.*0/);assert.match(q('[data-farming-statistics-tables]').textContent,/2015.*未掲載/);
  for(const topic of ['wheat','chicken','wheat','chicken']){
   q('[data-farming-topic]').value=topic;q('[data-farming-topic]').dispatchEvent(new window.Event('change'));
   await until(()=>q('[data-farming-value]').textContent.includes(topic==='wheat'?'123.4':'0 羽/km²'),'topic reloaded');
   assert.deepEqual(Object.keys(window.__map.sources).filter(id=>id.startsWith('asia-farming-')),['asia-farming-'+topic]);
  }
  assert.equal(requests.filter(r=>r.endsWith('wheat.gz')).length,4);
  q('[data-farming-topic]').value='forest';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));assert.match(q('[data-farming-value]').textContent,/地点の数値は計算せず/);assert.equal(requests.some(r=>r.includes('forest.gz')),false);
  q('[data-farming-topic]').value='rice';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));assert.equal(q('[data-rice-reading]').hidden,false);await until(()=>q('[data-rice-value]').textContent.includes('123.4'),'rice restore');assert.equal(window.__maps.length,1);
 }finally{await window.happyDOM.close();}
});
test('農林業の遅い応答は新しい主題を上書きせず、統計の失敗は単独で再試行できる',async()=>{
  const {window,q,resolveFarm,requests}=await setup('?field=agriculture&topic=wheat&place=CHN&at=116,35',{farming:true,delayedFarm:true,statisticsFailure:true});
 try{
  await until(()=>!q('[data-farming-statistics-retry]').hidden,'statistics error');q('[data-farming-statistics-retry]').click();
  await until(()=>q('[data-farming-statistics-tables]').textContent.includes('134,250,000'),'statistics retry');
  q('[data-farming-topic]').value='forest';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));resolveFarm();await delay();await delay();
  assert.match(q('[data-farming-value]').textContent,/参考画像/);assert.equal(window.__map.layers['asia-farming-wheat'],undefined);assert.equal(q('[data-farming-statistics-retry]').hidden,true);
  q('[data-farming-topic]').value='wheat';q('[data-farming-topic]').dispatchEvent(new window.Event('change'));
  await until(()=>requests.filter(r=>r.endsWith('wheat.gz')).length===2,'late grid was not retained');resolveFarm();
  await until(()=>q('[data-farming-value]').textContent.includes('123.4'),'new wheat request finished');
 }finally{await window.happyDOM.close();}
});
