import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
import climate from '../../src/data/atlas/canada/climate.json' with {type:'json'};
import {readCanadaWaterState,writeCanadaWaterState,canadaWaterIds,projectCanadaWater,canadaWaterPath,canadaWaterFit,validateCanadaWaterCollection} from '../../src/lib/atlas-canada-water-state.ts';

const group=(id,name=id,color='#2c7fb8')=>({id,name,color,description:`Description ${id}`});
const dataset=(groups,extra={})=>({title:'Source map',groups,scope:'The source describes classes, not volumes.',reading:'Read the geographic pattern.',sources:[],...extra});
const config={datasets:{precipitation:dataset([group('p0'),group('p1')],{imageUrl:'/all.png',images:[{id:'p0',url:'/p0.png'},{id:'p1',url:'/p1.png'}]}),drainage:dataset([group('01'),group('02')],{geometryUrl:'/drainage.json'}),groundwater:dataset([group('c1'),group('c2')],{geometryUrl:'/groundwater.json'}),aquifers:dataset([group('sand-gravel'),group('bedrock')],{geometryUrl:'/aquifers.json',areas:[{id:'550',name:'Aquifer 550',group:'bedrock'},{id:'551',name:'Aquifer 551',group:'sand-gravel'}],defaultFrame:[197.749,451.777,29.876,19.857]})}};
const polygon=(id,group,excluded=false)=>({type:'Feature',properties:{id,name:`Area ${id}`,group,fillExcluded:excluded},geometry:{type:'Polygon',coordinates:[[[-123.5,49.1],[-123.4,49.1],[-123.4,49.2],[-123.5,49.2],[-123.5,49.1]]]}});
const collection=features=>({type:'FeatureCollection',features});
const fixtureData={drainage:collection([polygon('d1','01'),polygon('d2','02')]),groundwater:collection([polygon('g1','c1'),polygon('g2','c1',true),polygon('g3','c2')]),aquifers:collection([polygon('550','bedrock'),polygon('551','sand-gravel')])};

test('water URL state preserves all native surface and comparison keys, hash, selection and SVG camera',()=>{
 const url=new URL('https://example.test/nature/?city=regina&view=water&water=Fraser&only=1&frame=1,2,300,200&forestryReturn=forest&industryReturn=gdp&populationReturn=cma&cropReturn=wheat#reading');
 const state={topic:'aquifers',area:'550',only:true,frame:[197.749,451.777,29.876,19.857]};
 const next=writeCanadaWaterState(url,state);
 for(const [key,value] of url.searchParams)assert.equal(next.searchParams.get(key),value);
 assert.equal(next.hash,'#reading');assert.deepEqual(readCanadaWaterState(next,canadaWaterIds(config)),state);
 const surface=writeCanadaWaterState(next,{topic:'surface',area:null,only:false,frame:null});
 assert.equal(surface.searchParams.get('water'),'Fraser');assert.equal(surface.searchParams.get('only'),'1');assert.equal(surface.searchParams.get('frame'),'1,2,300,200');assert.equal(surface.searchParams.has('waterTopic'),false);
});
test('unknown selections, orphan isolation and malformed or out-of-map cameras are rejected',()=>{
 for(const frame of ['',',0,300,200','0, ,300,200','NaN,0,300,200','-1,0,300,200','700,0,300,200','0,0,0,20','0,0,900,581']){
  const url=new URL('https://example.test/?waterTopic=groundwater&waterArea=made-up&waterOnly=1');url.searchParams.set('waterFrame',frame);
  assert.deepEqual(readCanadaWaterState(url,canadaWaterIds(config)),{topic:'groundwater',area:null,only:false,frame:null});
 }
 assert.equal(readCanadaWaterState(new URL('https://example.test/?waterTopic=volume'),canadaWaterIds(config)).topic,'surface');
 assert.equal(readCanadaWaterState(new URL('https://example.test/?waterTopic=aquifers&waterArea=bedrock&waterOnly=1'),canadaWaterIds(config)).only,true);
});
test('the approved affine frame preserves polygon holes and fits a real selected source footprint',()=>{
 assert.deepEqual(projectCanadaWater([-145,85]),[0,0]);assert.deepEqual(projectCanadaWater([-50,40]),[900,580]);
 const feature=polygon('a','01');feature.geometry.coordinates.push([[-123.48,49.12],[-123.46,49.12],[-123.46,49.14],[-123.48,49.12]]);
 const path=canadaWaterPath(feature.geometry);assert.equal((path.match(/M/g)||[]).length,2);assert.equal((path.match(/Z/g)||[]).length,2);
 const frame=canadaWaterFit([feature]);for(const ring of feature.geometry.coordinates)for(const point of ring){const [x,y]=projectCanadaWater(point);assert.ok(x>=frame[0]&&x<=frame[0]+frame[2]);assert.ok(y>=frame[1]&&y<=frame[1]+frame[3]);}
 assert.equal(canadaWaterFit([]),null);
 assert.throws(()=>validateCanadaWaterCollection(collection([polygon('a','unknown')]),config.datasets.drainage),/classification/);
 const native=polygon('native','01');native.geometry.coordinates[0][0]=[2500000,1700000];assert.throws(()=>validateCanadaWaterCollection(collection([native]),config.datasets.drainage),/geographic/);
});

const compiled=await bundleCanadaSource('src/scripts/atlas-canada-water-resources.ts',{globalName:'CanadaWaterTests'});
const waitFor=async predicate=>{for(let i=0;i<40;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}assert.ok(predicate(),'Water controller settled');};
function setup(fetcher) {
 const window=new Window({url:'https://example.test/nature/?city=regina&water=Fraser&cropReturn=wheat#read',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.write(`<section data-canada-water-resources hidden><h2 data-canada-water-map-title></h2><span data-canada-water-map-period></span><div data-canada-water-groundwater-modes hidden><button data-canada-water-topic="groundwater"></button><button data-canada-water-topic="aquifers"></button></div><svg data-canada-water-resource-map><title></title><desc></desc><g data-canada-water-resource-raster clip-path="url(#canada-water-national-clip)"></g><g data-canada-water-resource-vectors></g></svg><p data-canada-water-load></p><select data-canada-water-area></select><input data-canada-water-resource-only type="checkbox"><button data-canada-water-focus></button><button data-canada-water-full></button><button data-canada-water-resource-reset></button><button data-canada-water-zoom="in"></button><button data-canada-water-zoom="out"></button><button data-canada-water-retry hidden></button><p data-canada-water-resource-status></p><p data-canada-water-resource-scope></p>${Object.entries(config.datasets).map(([topic,dataset])=>`<section data-canada-water-resource-reading="${topic}"><div data-canada-water-selected-reading="${topic}"><h3 data-canada-water-selected-title></h3><p data-canada-water-selected-description></p><a data-canada-water-selected-link></a></div><div data-canada-water-resource-legend="${topic}">${dataset.groups.map(group=>`<button data-canada-water-group="${group.id}" data-canada-water-group-topic="${topic}"></button>`).join('')}</div></section>`).join('')}<script type="application/json" data-canada-water-resource-config>${JSON.stringify(config)}</script></section>`);
 const requests=[];window.fetch=async url=>{requests.push(url);return fetcher?fetcher(url):{ok:true,json:async()=>fixtureData[Object.keys(fixtureData).find(topic=>url.includes(topic))]};};
 window.eval(compiled+'\nwindow.initWaterTest=CanadaWaterTests.initCanadaWaterResources;');const root=window.document.querySelector('[data-canada-water-resources]');const controller=window.initWaterTest(root);
 let state={topic:'surface',area:null,only:false,frame:null},commits=0;
 root.addEventListener('canada-water-update',event=>{state={...state,...event.detail};commits++;window.history.pushState(null,'',writeCanadaWaterState(new URL(window.location.href),state));controller.render(state);});
 window.addEventListener('popstate',()=>{state=readCanadaWaterState(new URL(window.location.href),canadaWaterIds(config));controller.render(state);});
 return {window,root,controller,requests,get state(){return state;},get commits(){return commits;},show(next){root.hidden=false;state={...state,...next};controller.render(state);}};
}
test('hidden and surface views make no theme requests; visible drainage loads once and supports keyboard/isolation/restoration',async()=>{
 const page=setup();page.controller.render({topic:'drainage',area:null,only:false,frame:null});assert.equal(page.requests.length,0);
 page.show({topic:'surface'});assert.equal(page.requests.length,0);
 page.show({topic:'drainage'});await waitFor(()=>page.root.dataset.canadaWaterReady==='ready');assert.deepEqual(page.requests,['/drainage.json']);
 const shape=page.root.querySelector('[data-canada-water-resource-shape="01"]');shape.dispatchEvent(new page.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(page.state.area,'01');
 const only=page.root.querySelector('[data-canada-water-resource-only]');only.checked=true;only.dispatchEvent(new page.window.Event('change'));
 assert.equal(page.root.querySelector('[data-canada-water-resource-shape="02"]').style.display,'none');assert.equal(page.root.querySelector('[data-canada-water-resource-shape="02"]').getAttribute('tabindex'),'-1');
 assert.equal(new URL(page.window.location.href).searchParams.get('cropReturn'),'wheat');assert.equal(new URL(page.window.location.href).searchParams.get('water'),'Fraser');
 page.window.history.replaceState(null,'','?city=regina&water=Fraser&waterTopic=drainage&waterArea=02&waterOnly=1&waterFrame=100,200,300,200#read');page.window.dispatchEvent(new page.window.PopStateEvent('popstate'));
 assert.equal(page.root.querySelector('[data-canada-water-area]').value,'02');assert.equal(page.root.querySelector('[data-canada-water-resource-map]').getAttribute('viewBox'),'100 200 300 200');assert.equal(page.requests.length,1);
 page.root.querySelector('[data-canada-water-resource-reset]').click();assert.deepEqual(page.state,{topic:'drainage',area:null,only:false,frame:null});
});
test('groundwater source-invalid geometry stays an unfilled original outline; aquifers isolate a class or individual source ID',async()=>{
 const page=setup();page.show({topic:'groundwater'});await waitFor(()=>page.root.dataset.canadaWaterReady==='ready');
 const invalid=page.root.querySelector('.canada-water-source-invalid');assert.equal(invalid.getAttribute('fill'),'none');assert.equal(invalid.getAttribute('stroke-dasharray'),'3 2');assert.ok(invalid.getAttribute('d').startsWith('M'));
 page.show({topic:'aquifers',area:'bedrock',only:true,frame:null});await waitFor(()=>page.root.querySelector('[data-canada-water-resource-shape="550"]'));
 assert.equal(page.root.querySelector('[data-canada-water-resource-map]').getAttribute('viewBox'),'197.749 451.777 29.876 19.857');assert.equal(page.root.querySelector('[data-canada-water-resource-shape="551"]').style.display,'none');
 const select=page.root.querySelector('[data-canada-water-area]');select.value='550';select.dispatchEvent(new page.window.Event('change'));assert.equal(page.state.area,'550');
 const only=page.root.querySelector('[data-canada-water-resource-only]');only.checked=true;only.dispatchEvent(new page.window.Event('change'));assert.equal(page.root.querySelector('[data-canada-water-resource-shape="551"]').style.display,'none');
 page.root.querySelector('[data-canada-water-full]').click();assert.deepEqual(page.root.querySelector('[data-canada-water-resource-map]').getAttribute('viewBox').split(' ').map(Number).map(Math.round),[0,180,900,400]);assert.equal(page.state.area,'550');
});
test('precipitation isolation swaps the composite for exactly one transparent class image within the national clip',()=>{
 const page=setup();page.show({topic:'precipitation',area:'p1',only:true});
 let images=page.root.querySelectorAll('[data-canada-water-resource-raster] image');assert.equal(images.length,1);assert.equal(images[0].getAttribute('href'),'/p1.png');assert.equal(images[0].getAttribute('preserveAspectRatio'),'none');assert.equal(images[0].getAttribute('width'),'900');assert.equal(page.requests.length,0);
 images[0].dispatchEvent(new page.window.Event('load'));assert.equal(page.root.dataset.canadaWaterReady,'ready');
 page.show({only:false});images=page.root.querySelectorAll('[data-canada-water-resource-raster] image');assert.equal(images.length,2);assert.equal(images[0].getAttribute('href'),'/all.png');assert.equal(images[0].getAttribute('opacity'),'.4');assert.equal(page.root.querySelector('[data-canada-water-resource-raster]').getAttribute('clip-path'),'url(#canada-water-national-clip)');
});
test('a precipitation image completed while hidden clears loading when the same raster view reopens',async()=>{
 const page=setup();page.show({topic:'precipitation',area:'p1',only:true});
 const image=page.root.querySelector('[data-canada-water-resource-raster] image');assert.equal(page.root.dataset.canadaWaterReady,'loading');
 page.root.hidden=true;page.controller.render({topic:'surface',area:null,only:false,frame:null});
 await new Promise(resolve=>setTimeout(()=>{image.dispatchEvent(new page.window.Event('load'));resolve();},5));
 assert.equal(page.root.dataset.canadaWaterReady,'loading','Hidden completion does not render an inactive topic');
 page.show({topic:'precipitation',area:'p1',only:true});
 assert.equal(page.root.querySelector('[data-canada-water-resource-raster] image'),image,'The same cached raster remains');
 assert.equal(page.root.dataset.canadaWaterReady,'ready');assert.equal(page.root.querySelector('[data-canada-water-load]').hidden,true);assert.equal(page.root.querySelector('[data-canada-water-retry]').hidden,true);
});
test('a precipitation image error completed while hidden remains retryable when its view reopens',async()=>{
 const page=setup();page.show({topic:'precipitation',area:'p1',only:true});const image=page.root.querySelector('[data-canada-water-resource-raster] image');
 page.root.hidden=true;page.controller.render({topic:'surface',area:null,only:false,frame:null});
 await new Promise(resolve=>setTimeout(()=>{image.dispatchEvent(new page.window.Event('error'));resolve();},5));
 page.show({topic:'precipitation',area:'p1',only:true});assert.equal(page.root.dataset.canadaWaterReady,'error');assert.equal(page.root.querySelector('[data-canada-water-retry]').hidden,false);
 page.root.querySelector('[data-canada-water-retry]').click();const retried=page.root.querySelector('[data-canada-water-resource-raster] image');assert.notEqual(retried,image);assert.equal(page.root.dataset.canadaWaterReady,'loading');retried.dispatchEvent(new page.window.Event('load'));assert.equal(page.root.dataset.canadaWaterReady,'ready');
});
test('a failed lazy request is retryable and an inactive request cannot replace the active dataset',async()=>{
 let resolveDrainage,failed=true;const page=setup(async url=>{if(url.includes('drainage'))return new Promise(resolve=>{resolveDrainage=()=>resolve({ok:true,json:async()=>fixtureData.drainage});});if(failed)throw new Error('Source unavailable');return {ok:true,json:async()=>fixtureData.groundwater};});
 page.show({topic:'drainage'});page.show({topic:'groundwater'});await waitFor(()=>page.root.dataset.canadaWaterReady==='error');assert.equal(page.root.querySelector('[data-canada-water-retry]').hidden,false);
 resolveDrainage();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(page.root.querySelector('[data-canada-water-resource-shape="01"]'),null);assert.equal(page.root.dataset.canadaWaterReady,'error');
 failed=false;page.root.querySelector('[data-canada-water-retry]').click();await waitFor(()=>page.root.dataset.canadaWaterReady==='ready');assert.ok(page.root.querySelector('[data-canada-water-resource-shape="c1"]'));assert.equal(page.requests.filter(url=>url.includes('groundwater')).length,2);
});
test('geometry that finishes while the water panel is hidden appears on reopening without another fetch',async()=>{
 let finish;const page=setup(()=>new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>fixtureData.drainage});}));
 page.show({topic:'drainage'});page.root.hidden=true;finish();await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(page.root.querySelector('[data-canada-water-resource-shape="01"]'),null);
 page.show({topic:'drainage'});assert.ok(page.root.querySelector('[data-canada-water-resource-shape="01"]'));assert.equal(page.requests.length,1);assert.equal(page.root.dataset.canadaWaterReady,'ready');
});
test('existing ECCC points stay in their affine coordinates with readable glyphs, while BC detail context returns to national context',async()=>{
 const page=setup(),map=page.root.querySelector('[data-canada-water-resource-map]');
 const context=page.window.document.createElementNS('http://www.w3.org/2000/svg','g');context.innerHTML='<path data-canada-water-context-country="CAN"></path><path data-canada-water-national-outline></path><path data-canada-water-bc-context hidden></path>'+climate.stations.map(station=>{const [x,y]=projectCanadaWater(station.coordinates);return `<g data-canada-water-reference="${station.id}" data-reference-x="${x}" data-reference-y="${y}" transform="translate(${x} ${y})"><g data-canada-water-reference-glyph><circle r="5"></circle></g></g>`;}).join('');map.append(context);
 page.show({topic:'aquifers',frame:null});await waitFor(()=>page.root.dataset.canadaWaterReady==='ready');
 const point=map.querySelector('[data-canada-water-reference="vancouver"]'),[x,y]=projectCanadaWater(climate.stations.find(station=>station.id==='vancouver').coordinates);
 assert.equal(point.getAttribute('transform'),`translate(${x} ${y})`);assert.equal(point.style.display,'');assert.equal(point.querySelector('[data-canada-water-reference-glyph]').getAttribute('transform'),`scale(${config.datasets.aquifers.defaultFrame[2]/900})`);
 assert.equal(map.querySelector('[data-canada-water-reference="ottawa"]').style.display,'none');assert.equal(map.querySelector('[data-canada-water-bc-context]').hasAttribute('hidden'),false);assert.equal(map.querySelector('[data-canada-water-context-country="CAN"]').hasAttribute('hidden'),true);
 point.dispatchEvent(new page.window.MouseEvent('click',{bubbles:true}));assert.equal(page.commits,0,'Reference points do not select aquifers or cities');
 page.root.querySelector('[data-canada-water-full]').click();assert.equal(point.querySelector('[data-canada-water-reference-glyph]').getAttribute('transform'),'scale(1)');assert.equal(map.querySelector('[data-canada-water-reference="ottawa"]').style.display,'');assert.equal(map.querySelector('[data-canada-water-bc-context]').hasAttribute('hidden'),true);assert.equal(map.querySelector('[data-canada-water-context-country="CAN"]').hasAttribute('hidden'),false);
});
