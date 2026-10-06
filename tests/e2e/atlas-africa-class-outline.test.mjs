import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {createAfricaLayerRenderer} from '../../src/scripts/atlas-africa-layers.ts';
import {readState} from '../../src/data/atlas/africa-atlas.ts';

async function withRenderer(run,{delayGrid=false}={}){
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 let releaseGrid;const gate=delayGrid?new Promise(resolve=>{releaseGrid=resolve;}):Promise.resolve();
 try{
  document.body.innerHTML='<div><svg><g data-africa-actual-layer></g></svg></div>';
  const root=document.querySelector('div');let state=readState('?field=nature&topic=climate&zoom=all'),view;
  const fetcher=async url=>{const path=new URL(url,'https://example.com').pathname.replace(/^\/insight-journal/,'');if(path.endsWith('.values.gz'))await gate;return new Response(readFileSync(new URL('../../public'+path,import.meta.url)),{status:200});};
  const renderer=createAfricaLayerRenderer(root,()=>{view=renderer.render(state);},fetcher);
  const paint=search=>{state=readState(search);view=renderer.render(state);};
  const ready=async({withGrid=true}={})=>{for(let i=0;i<1000&&(!view?.ready||withGrid&&view.loading);i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(view?.ready,true);assert.equal(view.error,'');if(withGrid)assert.equal(view.loading,false);};
  paint('?field=nature&topic=climate&zoom=all');
  await run({root,paint,ready,releaseGrid,get view(){return view;}});
 }finally{releaseGrid?.();globalThis.document=previous;await window.happyDOM.abort();}
}

test('non-agricultural class selection retains each complete native raster and overlays only the selected grid boundary',async()=>{
 await withRenderer(async({root,paint,ready})=>{
  for(const [field,topic,selected,file] of [['nature','climate','1','climate.png'],['nature','terrain','4','elevation.png'],['nature','elevation','0','elevation.png'],['population','distribution','density-0','population.png']]){
   const search=`?field=${field}&topic=${topic}&zoom=all`;
   paint(search);await ready();const original=root.querySelector('[data-africa-raster]').getAttribute('href');assert.ok(original.endsWith('/'+file));
   const nativeFeatures=[...root.querySelectorAll('[data-africa-layer-feature]')].map(path=>path.getAttribute('d'));
   paint(search+'&layerClass='+selected);
   assert.equal(root.querySelector('[data-africa-raster]').getAttribute('href'),original);
   const outline=root.querySelector(`[data-africa-class-outline="${selected}"]`);assert.ok(outline);assert.equal(outline.getAttribute('data-africa-outline-layer'),topic);
   assert.deepEqual([...outline.children].map(path=>path.getAttribute('stroke')),['#ffffff','#183c4a']);
   assert.equal(outline.children[0].getAttribute('d'),outline.children[1].getAttribute('d'));
   assert.equal(outline.querySelectorAll('rect').length,0);
   assert.deepEqual([...root.querySelectorAll('[data-africa-layer-feature]')].map(path=>path.getAttribute('d')),nativeFeatures);
   paint(search);assert.equal(root.querySelector('[data-africa-class-outline]'),null);assert.equal(root.querySelector('[data-africa-raster]').getAttribute('href'),original);
  }
 });
});

test('while grids load the original PNG stays visible and eventual outlines follow the latest topic and class',async()=>{
 await withRenderer(async({root,paint,ready,releaseGrid})=>{
  paint('?field=nature&topic=climate&zoom=all&layerClass=1');await ready({withGrid:false});
  assert.ok(root.querySelector('[data-africa-raster]').getAttribute('href').endsWith('/climate.png'));assert.equal(root.querySelector('[data-africa-class-outline]'),null);
  paint('?field=nature&topic=climate&zoom=all&layerClass=4');
  paint('?field=population&topic=distribution&zoom=all&layerClass=density-6');await ready({withGrid:false});
  const original=root.querySelector('[data-africa-raster]').getAttribute('href');assert.ok(original.endsWith('/population.png'));assert.equal(root.querySelector('[data-africa-class-outline]'),null);
  releaseGrid();await ready();
  assert.equal(root.querySelector('[data-africa-raster]').getAttribute('href'),original);
  assert.equal(root.querySelector('[data-africa-class-outline]').getAttribute('data-africa-class-outline'),'density-6');
  assert.equal(root.querySelector('[data-africa-class-outline]').getAttribute('data-africa-outline-layer'),'distribution');
 },{delayGrid:true});
});
