import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

const root=fileURLToPath(new URL('../../',import.meta.url));
async function bundled(relative){
  const result=await build({entryPoints:[fileURLToPath(new URL('../../'+relative,import.meta.url))],absWorkingDir:root,bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const api=await bundled('src/data/atlas/oceania-learning.ts');
const controller=await bundled('src/scripts/atlas-oceania-learning.ts');
const comparison=await bundled('src/data/atlas/oceania-comparison-reading.ts');
const geometry=await bundled('src/lib/atlas-oceania-geometry.ts');
const cities=JSON.parse(readFileSync(new URL('../../public/assets/atlas/oceania-population-v1/centres.json',import.meta.url),'utf8')).centres;
after(()=>stop());

test('comparison readings explain the selected crop and geography and retain their primary sources in both directions',()=>{
  const aus=api.createOceaniaState('?theme=wheat&place=AUS&scope=country&layer=wheat&compare=climate','agriculture');
  const wheat=comparison.getOceaniaComparisonReading(aus);
  assert.match(wheat.message,/南西部・南東部/);
  assert.match(wheat.message,/冬の雨/);
  assert.match(wheat.message,/半乾燥域/);
  assert.ok(wheat.sources.some(source=>new URL(source.url).hostname==='www.dpird.wa.gov.au'));
  assert.deepEqual(comparison.getOceaniaComparisonReading({...aus,layer:'climate',compareLayer:'wheat'}),wheat);
  const png=api.createOceaniaState('?theme=tropical-crops&place=PNG&scope=country&layer=coconut&compare=climate','agriculture');
  const coconut=comparison.getOceaniaComparisonReading(png);
  assert.match(coconut.message,/沿岸/);assert.match(coconut.message,/中央高地/);assert.match(coconut.message,/集荷・加工/);
  assert.ok(coconut.sources.some(source=>new URL(source.url).hostname==='www.fao.org'));
  assert.ok(coconut.sources.some(source=>new URL(source.url).hostname==='www.kik.com.pg'));
  assert.ok(coconut.supportNotes.some(note=>note.includes('欠測セル')));
  assert.deepEqual(comparison.getOceaniaComparisonReading({...png,layer:'climate',compareLayer:'coconut'}),coconut);
  const other=comparison.getOceaniaComparisonReading({...png,place:'NZL'});
  assert.doesNotMatch(other.message,/PNGのココナツ/);
  assert.notEqual(other.message,coconut.message);
  const absent=comparison.getOceaniaComparisonReading({...png,place:'KIR',layer:'places',compareLayer:'density'});
  assert.match(absent.message,/タラワ/);assert.match(absent.message,/港を収録していない/);
  assert.doesNotMatch(absent.message,/ラエ|タウランガ/);
  const points=comparison.getOceaniaComparisonReading({...png,layer:'places',compareLayer:'cities'});
  assert.match(points.message,/円の面積/);assert.doesNotMatch(points.message,/内陸高地にも集まる/);
  const restricted=comparison.getOceaniaComparisonReading({...png,field:'nature',place:'all',scope:'theme',theme:'altitude',layer:'climate',compareLayer:'sheep'});
  assert.doesNotMatch(restricted.message,/豪州の南部|中央の砂漠/);
  const nz=comparison.getOceaniaComparisonReading({...png,field:'industry',place:'all',scope:'theme',theme:'new-zealand-processing',layer:'places',compareLayer:'density'});
  assert.match(nz.message,/タウランガ/);assert.doesNotMatch(nz.message,/ラエ|スバ/);
  const offMap=comparison.getOceaniaComparisonReading({...png,field:'industry',place:'all',scope:'theme',theme:'png-resources-and-port',layer:'mines',compareLayer:'density'});
  assert.match(offMap.message,/照合できない/);assert.doesNotMatch(offMap.message,/豪州では西部/);
});

test('invalid route state normalizes to valid same-field defaults and clears an invalid country scope',()=>{
  for(const field of Object.keys(api.oceaniaFields)){
    const state=api.createOceaniaState('?theme=nonexistent&layer=nonexistent&place=INVALID&scope=country&view=bad&compare=nonexistent',field);
    assert.equal(state.field,field);
    assert.equal(state.place,'all');
    assert.equal(state.scope,'all');
    assert.equal(state.comparison,false);
    assert.equal(api.getOceaniaTheme(state).field,field);
    assert.equal(api.getOceaniaLayer(state.layer).field,field);
    assert.ok(api.oceaniaLayers.some(layer=>layer.id===state.compareLayer));
  }
  assert.equal(api.createOceaniaState('', '__proto__').field,'nature');
  const wrongField=api.createOceaniaState('?theme=coasts&layer=density&place=KIR&scope=country&view=comparison','agriculture');
  assert.equal(api.getOceaniaTheme(wrongField).field,'agriculture');
  assert.equal(api.getOceaniaLayer(wrongField.layer).field,'agriculture');
  assert.equal(wrongField.place,'KIR');
  assert.equal(wrongField.scope,'country');
  assert.equal(wrongField.comparison,true);
});

test('every adopted country and layer has finite framing and usable coverage, including absent island records',()=>{
  assert.equal(api.oceaniaCountries.length,25);
  for(const country of api.oceaniaCountries)for(const layer of api.oceaniaLayers){
    const state=api.createOceaniaState(`?place=${country.code}&scope=country&layer=${layer.id}`,layer.field);
    const resolved=api.getOceaniaLayer(layer.id,state);
    const coverage=api.oceaniaCoverage(resolved,state);
    assert.equal(typeof coverage,'string',country.code+'/'+layer.id);
    assert.ok(coverage.trim().length>0,country.code+'/'+layer.id);
    assert.ok(!coverage.includes('undefined'),country.code+'/'+layer.id);
    const frame=api.oceaniaFrame(state);
    assert.equal(frame.length,4);
    assert.ok(frame.every(Number.isFinite),country.code+'/'+layer.id);
    assert.ok(frame[2]>0&&frame[3]>0,country.code+'/'+layer.id);
  }
  const kir=api.createOceaniaState('?place=KIR&scope=country','population');
  assert.match(api.oceaniaCoverage(api.getOceaniaLayer('cities',kir),kir),/未収録/);
  assert.match(api.oceaniaCoverage(api.getOceaniaLayer('cities',kir),kir),/人口ゼロ/);
  const nauru=api.createOceaniaState('?place=NRU&scope=country','population');
  assert.match(api.oceaniaCoverage(api.getOceaniaLayer('density',nauru),nauru),/画素中心/);
  assert.match(api.oceaniaCoverage(api.getOceaniaLayer('density',nauru),nauru),/人口ゼロ/);
});

test('Kiribati and French Polynesia use their real climate and population island images on one comparison frame',()=>{
  for(const [country,climateImage,populationImage] of [['KIR','kir-tarawa.png','tarawa.png'],['PYF','pyf-tahiti.png','tahiti.png']]){
    const climateState=api.createOceaniaState(`?place=${country}&scope=country&layer=climate&view=comparison&compare=density`,'nature');
    const populationState=api.createOceaniaState(`?place=${country}&scope=country&layer=density&view=comparison&compare=climate`,'population');
    const climate=api.getOceaniaLayer('climate',climateState),population=api.getOceaniaLayer('density',populationState);
    assert.ok(climate.image.endsWith('/'+climateImage));
    assert.ok(population.image.endsWith('/'+populationImage));
    assert.equal(climate.bounds.length,4);
    assert.equal(population.bounds.length,4);
    assert.ok(climate.bounds[0]>=110&&climate.bounds[2]<=250);
    assert.ok(population.bounds[0]>=110&&population.bounds[2]<=250);
    assert.deepEqual(api.oceaniaFrame(climateState),api.oceaniaFrame(populationState));
    const frameA=api.renderOceaniaScene(climate,climateState,'original').match(/viewBox="([^"]+)"/)[1];
    const frameB=api.renderOceaniaScene(population,climateState,'comparison').match(/viewBox="([^"]+)"/)[1];
    assert.equal(frameA,frameB);
    assert.match(api.renderOceaniaScene(climate,climateState,'original'),/href="\/insight-journal\/assets\/atlas\/oceania-climate-v2\//);
    assert.match(api.renderOceaniaScene(population,populationState,'original'),/href="\/insight-journal\/assets\/atlas\/oceania-population-v2\//);
  }
});

test('population legends retain all seven intervals and distinguish opaque white zero from missing data',()=>{
  const density=api.getOceaniaLayer('density');
  assert.deepEqual(density.legend.slice(0,7).map(item=>item.label),[...api.oceaniaPopulationReading.legend]);
  const zero=density.legend.find(item=>item.label===api.oceaniaPopulationReading.zeroLabel);
  const missing=density.legend.find(item=>item.shape==='missing');
  assert.equal(zero.color,'#ffffff');
  assert.ok(missing);
  assert.notEqual(missing.color,zero.color);
  const legend=api.renderOceaniaLegend(density);
  for(const label of api.oceaniaPopulationReading.legend)assert.ok(legend.includes(label));
  assert.ok(legend.includes(api.oceaniaPopulationReading.zeroLabel));
});

test('urban-centre circles scale their area with source population and keep density locator dots unscaled',()=>{
  const state=api.createOceaniaState('?scope=all&layer=cities','population');
  const window=new Window();
  try{
    const holder=window.document.createElement('div');
    holder.innerHTML=api.renderOceaniaScene(api.getOceaniaLayer('cities'),state);
    const marks=[...holder.querySelectorAll('circle[fill="#653e82"]')];
    assert.equal(marks.length,62);
    const circleFor=name=>marks.find(mark=>mark.querySelector('title').textContent.startsWith(name));
    const large=cities.find(city=>city.sourceName==='Sydney'),small=cities.find(city=>city.sourceName==='Apia');
    const rLarge=Number(circleFor('Sydney').getAttribute('r')),rSmall=Number(circleFor('Apia').getAttribute('r'));
    assert.ok(rLarge>rSmall&&rSmall>0);
    assert.ok(Math.abs((rLarge*rLarge)/(rSmall*rSmall)/(large.population/small.population)-1)<1e-10);
    holder.innerHTML=api.renderOceaniaScene(api.getOceaniaLayer('density'),state);
    const locatorRadii=[...holder.querySelectorAll('circle[fill="#653e82"]')].map(mark=>Number(mark.getAttribute('r')));
    assert.equal(locatorRadii.length,62);
    assert.equal(new Set(locatorRadii).size,1);
  }finally{window.happyDOM.abort();}
});

function controllerFixture(url,field='agriculture'){
  const window=new Window({url});
  const root=window.document.createElement('section');root.dataset.field=field;
  const options=values=>values.map(value=>`<option value="${value}">${value}</option>`).join('');
  root.innerHTML=`<select data-place>${options(['all',...api.oceaniaCountries.map(c=>c.code)])}</select><select data-layer>${options(api.oceaniaLayers.map(l=>l.id))}</select><select data-compare-layer>${options(api.oceaniaLayers.map(l=>l.id))}</select>`+
    api.oceaniaThemes.filter(t=>t.field===field).map(t=>`<button data-theme="${t.id}"></button>`).join('')+
    ['all','theme','country'].map(scope=>`<button data-scope="${scope}"></button>`).join('')+
    '<button data-comparison></button><button data-return></button><div data-normal-view><div data-primary-map></div></div><div data-comparison-view><div data-original-map></div><div data-comparison-map></div></div>'+
    ['primary','original','comparison'].flatMap(prefix=>['title','period','unit',...(prefix==='primary'?[]:['legend'])].map(suffix=>`<div data-${prefix}-${suffix}></div>`)).join('')+
    '<div data-primary-legend-spacer></div><section data-required-legend-layer><p data-primary-legend-unit></p><div data-primary-legend></div></section><details data-primary-legend-dictionary><div data-primary-legend-dictionary-content></div></details>'+
    ['geography-reading','theme-title','takeaway','explanation','coverage','comparison-explanation','social-context','source-list'].map(hook=>`<div data-${hook}></div>`).join('')+
    Object.keys(api.oceaniaFields).map(field=>`<a data-field-link="${field}"></a>`).join('');
  window.document.body.append(root);
  Object.assign(globalThis,{window,document:window.document,location:window.location,history:window.history,ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>fn()});
  controller.initOceaniaLearningAtlas(root);
  return {window,root};
}

test('comparison reload and named return preserve original crop, country, legends, unrelated query and hash',()=>{
  const sessions=[];
  try{
    const original='https://example.test/insight-journal/atlas/oceania/agriculture/?theme=tropical-crops&layer=coconut&place=KIR&scope=country&compare=density&utm_source=qa#reading';
    const first=controllerFixture(original);sessions.push(first);
    first.root.querySelector('[data-comparison]').click();
    const comparisonUrl=first.window.location.href,query=new URL(comparisonUrl).searchParams;
    assert.equal(query.get('view'),'comparison');
    assert.equal(query.get('layer'),'coconut');
    assert.equal(query.get('theme'),'tropical-crops');
    assert.equal(query.get('place'),'KIR');
    assert.equal(query.get('scope'),'country');
    assert.equal(query.get('compare'),'density');
    assert.equal(query.get('utm_source'),'qa');
    assert.equal(new URL(comparisonUrl).hash,'#reading');
    const reload=controllerFixture(comparisonUrl);sessions.push(reload);
    assert.equal(reload.root.querySelector('[data-normal-view]').hidden,true);
    assert.equal(reload.root.querySelector('[data-comparison-view]').hidden,false);
    assert.equal(reload.root.querySelector('[data-place]').value,'KIR');
    assert.equal(reload.root.querySelector('[data-layer]').value,'coconut');
    assert.ok(reload.root.querySelector('[data-original-map] [data-farming-mode="quantity"]').getAttribute('href').endsWith('/coconut-quantity.png'));
    assert.ok(reload.root.querySelector('[data-comparison-map] image').getAttribute('href').endsWith('/tarawa.png'));
    assert.equal(reload.root.querySelectorAll('[data-original-legend] [data-farming-legend]').length,5);
    assert.match(reload.root.querySelector('[data-original-legend] [data-farming-legend="coconut"] h3').textContent,/ha／元5分セル/);
    assert.equal(reload.root.querySelector('[data-original-map]>svg').getAttribute('viewBox'),reload.root.querySelector('[data-comparison-map]>svg').getAttribute('viewBox'));
    assert.match(reload.root.querySelector('[data-return]').textContent,/キリバス/);
    assert.match(reload.root.querySelector('[data-return]').textContent,/戻る/);
    reload.root.querySelector('[data-return]').click();
    const returned=new URL(reload.window.location.href);
    assert.equal(returned.searchParams.has('view'),false);
    assert.equal(returned.searchParams.get('layer'),'coconut');
    assert.equal(returned.searchParams.get('place'),'KIR');
    assert.equal(returned.searchParams.get('compare'),'density');
    assert.equal(returned.searchParams.get('utm_source'),'qa');
    assert.equal(returned.hash,'#reading');
    assert.equal(reload.root.querySelector('[data-normal-view]').hidden,false);
  }finally{
    for(const session of sessions)session.window.happyDOM.abort();
    for(const key of ['window','document','location','history','ResizeObserver','requestAnimationFrame'])delete globalThis[key];
  }
});

test('small-island detail keeps the source raster unobstructed and the selected place in accessible titles',()=>{
  for(const code of ['KIR','PYF']){
    const state=api.createOceaniaState(`?place=${code}&scope=country`,'population');
    const scene=api.renderOceaniaScene(api.getOceaniaLayer('density',state),state);
    const window=new Window();try{
      const holder=window.document.createElement('div');holder.innerHTML=scene;
      assert.equal(holder.querySelectorAll('text[text-anchor="middle"]').length,0);
      assert.ok(holder.querySelector('svg').getAttribute('aria-label').includes(api.oceaniaCountries.find(c=>c.code===code).name));
      assert.ok(holder.querySelector('image'));assert.ok(holder.querySelector('.oceania-context-inset'));
    }finally{window.happyDOM.abort();}
    assert.match(api.oceaniaCoverage(api.getOceaniaLayer('density',state),state),/代表範囲/);
  }
});

test('New Zealand detail focuses on the main islands and port while whole-region reset retains the national geometry',()=>{
  const state=api.createOceaniaState('?place=NZL&scope=country','industry'),frame=api.oceaniaFrame(state);
  for(const point of [[176.17,-37.67],[170.5,-45.9],[174.78,-41.29]]){
    const [x,y]=geometry.projectOceania(point);assert.ok(x>=frame[0]&&x<=frame[0]+frame[2]&&y>=frame[1]&&y<=frame[1]+frame[3]);
  }
  assert.ok(frame[3]<200);assert.equal(api.oceaniaFocusName(state),'北島・南島周辺');
  assert.match(api.oceaniaCoverage(api.getOceaniaLayer('places',state),state),/離島を含む/);
  const whole=api.renderOceaniaScene(api.getOceaniaLayer('places'),{...state,scope:'all'});
  assert.ok(whole.includes(api.oceaniaCountries.find(c=>c.code==='NZL').path));
  assert.deepEqual(api.oceaniaFrame({...state,scope:'all'}),[0,0,geometry.oceaniaWidth,geometry.oceaniaHeight]);
});

test('selected population context occurs once in the expanded reading for Kiribati, Samoa, Australia and PNG',()=>{
  for(const [country,key] of [['KIR','tarawa'],['WSM','samoa'],['AUS','australia'],['PNG','papua-new-guinea']]){
    const {window,root}=controllerFixture(`https://example.test/insight-journal/atlas/oceania/population/?place=${country}&scope=country`,'population');
    try{assert.equal(root.querySelector('[data-explanation]').textContent.split(api.oceaniaPopulationReading.contexts[key]).length-1,1);}
    finally{window.happyDOM.abort();for(const key of ['window','document','location','history','ResizeObserver','requestAnimationFrame'])delete globalThis[key];}
  }
});

test('saved Oceania farming products start together and direct product URLs choose their own reading',()=>{
 const state=api.createOceaniaState('','agriculture');assert.equal(state.layer,'farming-all');assert.equal(state.place,'all');assert.equal(state.scope,'all');
 for(const [product,theme] of [['wheat','wheat'],['coconut','tropical-crops'],['cacao','tropical-crops'],['sheep','livestock'],['cattle','livestock']]){
  const focus=api.createOceaniaState('?layer='+product,'agriculture');assert.equal(focus.theme,theme);
  const win=new Window();try{
   const holder=win.document.createElement('div');holder.innerHTML=api.renderOceaniaScene(api.getOceaniaLayer(product),focus);
   assert.deepEqual([...new Set([...holder.querySelectorAll('[data-farming-product]')].map(el=>el.dataset.farmingProduct))].sort(),['cacao','cattle','coconut','sheep','wheat']);
   assert.equal(holder.querySelectorAll('[data-map-place]').length,0,'Agriculture country selection uses the native control');
   assert.equal(holder.querySelectorAll('[data-farming-place]').length,5);
   for(const annotation of holder.querySelectorAll('[data-farming-place]'))assert.equal(Number(annotation.getAttribute('opacity')),['wheat','coconut','cacao'].includes(product)&&annotation.dataset.placeProduct!==product?0.32:1);
   assert.equal(holder.querySelectorAll(`[data-farming-product="${product}"][data-farming-mode="quantity"]`).length,1);
   assert.equal(holder.querySelector('[data-farming-product="wheat"][data-farming-mode="outline"]').getAttribute('opacity'),product==='wheat'?'1':'0.75');
   const key=win.document.createElement('div');key.innerHTML=api.renderOceaniaFarmingKey(api.getOceaniaLayer(product));assert.equal(key.querySelectorAll('[data-farming-key]').length,5);
   assert.match(api.renderOceaniaLegend(api.getOceaniaLayer(product)),/ha／元5分セル/);assert.match(api.renderOceaniaLegend(api.getOceaniaLayer(product)),/頭／km²/);
  }finally{win.happyDOM.abort();}
 }
});

test('Oceania farming example names stay inside the saved country and on a positive source cell',()=>{
 const ring=(point,vertices)=>{let inside=false;const [x,y]=point;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const [ax,ay]=vertices[i],[bx,by]=vertices[j];if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;}return inside;};
 const inGeometry=(point,geometry)=>(geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates).some(poly=>ring(point,poly[0])&&!poly.slice(1).some(r=>ring(point,r)));
 const geography=JSON.parse(readFileSync(new URL('../../src/data/atlas/oceania-countries.json',import.meta.url),'utf8'));
 for(const place of api.oceaniaFarmingPlaces){
  const feature=geography.features.find(f=>f.properties.code===place.country);assert.ok(inGeometry(place.coordinates,feature.geometry),place.id);
  const kind=['sheep','cattle'].includes(place.product)?'livestock':'crops',base=`../../public/assets/atlas/oceania-${kind}-v1/`;
  const manifest=JSON.parse(readFileSync(new URL(base+'manifest.json',import.meta.url),'utf8')),layer=manifest.layers.find(l=>l.id===place.product),[west,south,east,north]=layer.bounds4326Unwrapped;
  const [lon,lat]=place.coordinates,column=Math.floor((lon-west)/(east-west)*layer.width),row=Math.floor((north-lat)/(north-south)*layer.height);
  const values=gunzipSync(readFileSync(new URL(base+layer.grid,import.meta.url)));
  assert.ok(values.readFloatLE((row*layer.width+column)*4)>0,place.id+' must use a source positive');
 }
});
