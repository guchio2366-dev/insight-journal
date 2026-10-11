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
test('industry commodity URL round trips all eighteen categories and clears it outside industry',()=>{
 for(const commodity of africaIndustryCommodities){const state=readState('?field=industry&industryCommodity='+commodity.id);assert.equal(state.industryCommodity,commodity.id);assert.deepEqual(readState(writeState({...state},new URL('https://example.com/')).search),state);const next={...state,field:'nature'};writeState(next,new URL('https://example.com/'));assert.equal(next.industryCommodity,'');}
 assert.equal(readState('?field=industry&industryCommodity=__proto__').industryCommodity,'');
});
