import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import geography from '../../src/data/atlas/africa-geography.json' with {type:'json'};
import {africaPath} from '../../src/lib/atlas-africa-geometry.ts';
import {readState,writeState} from '../../src/data/atlas/africa-atlas.ts';
import {createAfricaLayerRenderer} from '../../src/scripts/atlas-africa-layers.ts';
import {africaIndustryCommodities} from '../../src/data/atlas/africa-industry-locations.ts';
const assets=new URL('../../public',import.meta.url);
async function fixture(run){
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 try{
  window.document.body.innerHTML='<div><svg viewBox="0 0 1100 907"><defs></defs>'+geography.features.map(f=>`<path data-country-path="${f.properties.code}" d="${africaPath(f.geometry)}"/>`).join('')+'<g data-africa-actual-layer></g></svg></div>';
  const root=window.document.querySelector('div');let state=readState('?field=nature&topic=water&water=basin'),view;
  const fetcher=async url=>{try{return new Response(readFileSync(new URL(String(url).replace(/^.*?\/assets\//,'assets/'),assets.href+'/')),{status:200});}catch{return new Response('missing',{status:404});}};
  const renderer=createAfricaLayerRenderer(root,()=>{view=renderer.render(state);},fetcher);
  const paint=input=>{state={...state,...input};view=renderer.render(state);};
  const ready=async()=>{for(let i=0;i<200&&(!view?.ready||view.loading);i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(view?.ready,true);assert.equal(view.error,'');assert.equal(view.loading,false);};
  await run({root,paint,ready,get view(){return view;}});
 }finally{globalThis.document=previous;await window.happyDOM.abort();}
}
test('actual connected basins retain eleven filled surfaces and linked river paths when selected',async()=>fixture(async({root,paint,ready})=>{
 paint({});await ready();assert.equal(root.querySelectorAll('[data-africa-basin]').length,11);
 for(const id of ['nile','congo','niger','chad','']){paint({river:id});assert.equal(root.querySelectorAll('[data-africa-basin]').length,11);assert.equal(root.querySelectorAll('[data-africa-basin][aria-pressed=true]').length,id?1:0);for(const surface of root.querySelectorAll('[data-africa-basin]'))assert.notEqual(surface.getAttribute('fill'),'none');if(id)assert(root.querySelectorAll(`[data-africa-river-feature="${id}"]`).length>0);}
}));
test('source-backed rain, elevation and terrain have distinct map marks rather than country means',async()=>fixture(async({root,paint,ready})=>{
 paint({water:'rain',metric:'AG.LND.PRCP.MM'});await ready();assert(root.querySelector('[data-africa-raster=water-rain]'));assert(root.querySelectorAll('[data-africa-contour]').length>10);for(const n of root.querySelectorAll('[data-africa-contour]'))assert.equal(Number(n.dataset.africaContour)%250,0);assert(root.querySelectorAll('[data-africa-contour-label]').length>10);
 paint({topic:'elevation'});await ready();for(const n of root.querySelectorAll('[data-africa-contour]'))assert.equal(Number(n.dataset.africaContour)%500,0);
 paint({topic:'terrain'});await ready();assert.equal(root.querySelectorAll('[data-africa-contour]').length,0);assert.equal(root.querySelectorAll('[data-africa-terrain-range]').length,12);assert.equal(root.querySelectorAll('[data-africa-natural-label]').length,36);assert(root.textContent.includes('北半球の冬・乾季'));assert(root.textContent.includes('北半球の夏・雨季'));
}));
test('religion is a complete country excerpt and language points stay separate from ethnicity',async()=>fixture(async({root,paint,ready,view})=>{
 paint({field:'population',topic:'religion'});await ready();assert.equal(root.querySelectorAll('[data-africa-religion-country]:not([data-africa-religion-mixed])').length,55);assert(root.querySelectorAll('[data-africa-religion-mixed]').length>5);assert.equal(root.querySelectorAll('[data-africa-language-point]').length,0);
 paint({topic:'language'});await ready();assert.equal(root.querySelectorAll('[data-africa-language-point]').length,2222);assert.equal(root.querySelectorAll('[data-africa-religion-country]').length,0);
 paint({topic:'ethnicity'});assert.equal(root.querySelectorAll('[data-africa-language-point]').length,0);
}));
test('third review keeps borders behind natural names, adds rain relief context and separates wind captions',async()=>fixture(async({root,paint,ready})=>{
 paint({field:'nature',topic:'water',water:'river'});await ready();
 const nodes=[...root.querySelector('[data-africa-actual-layer]').children],lastBorder=Math.max(...nodes.map((node,i)=>node.hasAttribute('data-africa-country-border')?i:-1));
 assert.equal(root.querySelectorAll('[data-africa-country-border]').length,55);
 for(const label of root.querySelectorAll('[data-africa-natural-label]'))assert.ok(nodes.indexOf(label)>lastBorder,'the glyph halo paints over country lines');
 const anchors=[...root.querySelectorAll('[data-africa-natural-label]')].map(n=>[n.dataset.africaNaturalLabel,n.getAttribute('x'),n.getAttribute('y')]);
 paint({river:'nile'});assert.deepEqual([...root.querySelectorAll('[data-africa-natural-label]')].map(n=>[n.dataset.africaNaturalLabel,n.getAttribute('x'),n.getAttribute('y')]),anchors,'selection does not move names');
 paint({water:'rain'});await ready();assert.equal(root.querySelectorAll('[data-africa-natural-kind=terrain]').length,12);
 for(const topic of ['terrain','elevation']){paint({topic});await ready();assert.equal(root.querySelectorAll('[data-africa-context-neighbour]').length,6);assert(root.querySelector('[data-africa-arabian-context]').textContent.includes('アラビア半島'));}
 paint({topic:'terrain'});await ready();for(const label of root.querySelectorAll('[data-africa-natural-kind=wind]'))assert.match(label.textContent,/^風：/);
}));
test('population locators are distinct from quantities and Cape Town keeps bottom padding with desert context',async()=>fixture(async({root,paint,ready})=>{
 paint({field:'population',topic:'distribution'});await ready();
 assert.equal(root.querySelectorAll('[data-africa-population-desert]').length,3);
 assert.equal(root.querySelectorAll('[data-africa-population-locator]').length,13);
 for(const locator of root.querySelectorAll('[data-africa-population-locator]'))assert.equal(locator.getAttribute('fill'),'#fffdf8');
 assert.ok(Number(root.querySelector('[data-africa-population-city="ケープタウン"]').getAttribute('y'))<897,'name baseline stays away from the 907-unit bottom');
}));
test('industry commodity URL round trips all eighteen categories and clears it outside industry',()=>{
 for(const commodity of africaIndustryCommodities){const state=readState('?field=industry&industryCommodity='+commodity.id);assert.equal(state.industryCommodity,commodity.id);assert.deepEqual(readState(writeState({...state},new URL('https://example.com/')).search),state);const next={...state,field:'nature'};writeState(next,new URL('https://example.com/'));assert.equal(next.industryCommodity,'');}
 assert.equal(readState('?field=industry&industryCommodity=__proto__').industryCommodity,'');
});
