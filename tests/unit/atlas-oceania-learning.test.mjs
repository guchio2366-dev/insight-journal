import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
const cities=JSON.parse(readFileSync(new URL('../../public/assets/atlas/oceania-population-v1/centres.json',import.meta.url),'utf8')).centres;
after(()=>stop());

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

function controllerFixture(url){
  const window=new Window({url});
  const root=window.document.createElement('section');root.dataset.field='agriculture';
  const options=values=>values.map(value=>`<option value="${value}">${value}</option>`).join('');
  root.innerHTML=`<select data-place>${options(['all',...api.oceaniaCountries.map(c=>c.code)])}</select><select data-layer>${options(api.oceaniaLayers.map(l=>l.id))}</select><select data-compare-layer>${options(api.oceaniaLayers.map(l=>l.id))}</select>`+
    api.oceaniaThemes.filter(t=>t.field==='agriculture').map(t=>`<button data-theme="${t.id}"></button>`).join('')+
    ['all','theme','country'].map(scope=>`<button data-scope="${scope}"></button>`).join('')+
    '<button data-comparison></button><button data-return></button><div data-normal-view><div data-primary-map></div></div><div data-comparison-view><div data-original-map></div><div data-comparison-map></div></div>'+
    ['primary','original','comparison'].flatMap(prefix=>['title','period','unit','legend'].map(suffix=>`<div data-${prefix}-${suffix}></div>`)).join('')+
    ['theme-title','takeaway','explanation','coverage','comparison-explanation','social-context','source-list'].map(hook=>`<div data-${hook}></div>`).join('')+
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
    assert.ok(reload.root.querySelector('[data-original-map] image').getAttribute('href').endsWith('/coconut.png'));
    assert.ok(reload.root.querySelector('[data-comparison-map] image').getAttribute('href').endsWith('/tarawa.png'));
    const expected=api.getOceaniaLayer('coconut').legend.map(item=>item.label);
    assert.deepEqual([...reload.root.querySelectorAll('[data-original-legend]>span')].map(item=>item.textContent),expected);
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
