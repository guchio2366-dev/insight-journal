import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {africaRivers,africaRiverById,africaRiverForFeature,africaRiverSelectedColor} from '../../src/data/atlas/africa-river-reading.ts';
import {africaHydrologyRivers,africaHydrologyRiverForFeature} from '../../src/data/atlas/africa-hydrology-reading.ts';
import {africaRiverDisplayColors} from '../../src/scripts/atlas-africa-layers.ts';
import {reading} from '../../src/data/atlas/africa-reading.ts';
import {themeById} from '../../src/data/atlas/africa-themes.ts';
import {readState} from '../../src/data/atlas/africa-atlas.ts';
import {africaLayerPath,createAfricaLayerRenderer} from '../../src/scripts/atlas-africa-layers.ts';

const assets=new URL('../../public/assets/atlas/africa-water-v1/',import.meta.url);
const rivers=JSON.parse(readFileSync(new URL('rivers.geojson',assets),'utf8'));
const manifest=JSON.parse(readFileSync(new URL('manifest.json',assets),'utf8'));

test('named readings use only the verified native Nile and Congo features and original approved prose',()=>{
 const expected={nile:['ne50-river-0047','ne50-river-0298'],congo:['ne50-river-0157','ne50-river-0263']};
 for(const river of africaRivers){
  assert.strictEqual(africaRiverById(river.id),river);
  assert.deepEqual(river.featureIds,expected[river.id]);
  assert.deepEqual(rivers.features.filter(feature=>africaRiverForFeature(feature)===river).map(feature=>feature.id),expected[river.id]);
  for(const id of river.featureIds){const feature=rivers.features.find(row=>row.id===id);assert.equal(feature.properties.sourceName,river.sourceName);assert.equal(feature.properties.name_en,river.sourceName);}
 }
 assert.strictEqual(africaRiverById('nile').reading,reading.nature[0]);
 assert.strictEqual(africaRiverById('congo').reading,reading.nature[1]);
 assert.strictEqual(africaRiverById('nile').theme,themeById('nile-water'));
 assert.equal(africaRiverById('niger'),undefined);
 assert.equal(africaRiverForFeature({properties:{name:'Nile',sourceName:'Nile',id:'unnamed-basin'}}),undefined);
 assert.equal(africaRiverForFeature({properties:{sourceName:'Congo',id:'ne50-river-0298'}}),undefined);
 for(const feature of rivers.features.filter(row=>/Nile/.test(row.properties.name)&&row.properties.name!=='Nile'))assert.equal(africaRiverForFeature(feature),undefined);
});

async function withRenderer(run,{delayManifest=false,delayRivers=false}={}){
 const window=new Window(),previous=globalThis.document;globalThis.document=window.document;
 let releaseManifest,releaseRivers;
 const manifestGate=delayManifest?new Promise(resolve=>{releaseManifest=resolve;}):Promise.resolve();
 const riversGate=delayRivers?new Promise(resolve=>{releaseRivers=resolve;}):Promise.resolve();
 try{
  window.document.body.innerHTML='<div><svg><g data-africa-actual-layer></g></svg></div>';
  const root=window.document.querySelector('div');let state={...readState('?field=nature&topic=water&water=river&metric=ER.H2O.INTR.PC'),river:'nile'},view;
  const fetcher=async url=>{const file=String(url).split('/').at(-1);await(file==='manifest.json'?manifestGate:riversGate);return new Response(JSON.stringify(file==='manifest.json'?manifest:rivers),{status:200});};
  const renderer=createAfricaLayerRenderer(root,()=>{view=renderer.render(state);},fetcher);
  const paint=river=>{state={...state,river};view=renderer.render(state);};paint('nile');
  const ready=async()=>{for(let i=0;i<100&&!view?.ready;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(view?.ready,true);assert.equal(view.error,'');};
  await run({root,paint,ready,releaseManifest,releaseRivers,get view(){return view;}});
 }finally{releaseManifest?.();releaseRivers?.();globalThis.document=previous;await window.happyDOM.abort();}
}

test('river selection highlights the same original segments and leaves the full source distribution visible',async()=>{
 await withRenderer(async({root,paint,ready})=>{
  await ready();
  for(const selected of [...africaHydrologyRivers.map(row=>row.id),'']){
   paint(selected);
   const paths=[...root.querySelectorAll('[data-africa-layer-feature]')];assert.equal(paths.length,rivers.features.length);
   assert.equal(root.querySelectorAll('.africa-river-path.is-selected').length,selected?africaHydrologyRivers.find(row=>row.id===selected).featureIds.length:0);
   assert.equal(root.querySelectorAll('[data-africa-river-hit-feature][aria-pressed="true"]').length,selected?africaHydrologyRivers.find(row=>row.id===selected).featureIds.length:0);
   for(const feature of rivers.features){
    const path=root.querySelector(`[data-africa-layer-feature="${feature.id}"]`),river=africaHydrologyRiverForFeature(feature),selectedFeature=!!river&&river.id===selected;
    assert.equal(path.getAttribute('d'),africaLayerPath(feature.geometry));
    assert.equal(path.getAttribute('stroke'),selectedFeature?africaRiverDisplayColors.selected:river?africaRiverDisplayColors.named:africaRiverDisplayColors.base);
    if(river){
     const hit=root.querySelector(`[data-africa-river-hit-feature="${feature.id}"]`);
     assert.equal(hit.getAttribute('d'),path.getAttribute('d'));
     assert.equal(hit.getAttribute('aria-label'),`${river.label}を読む`);
     assert.equal(hit.getAttribute('role'),'button');assert.equal(hit.getAttribute('tabindex'),'0');
    }
   }
  }
  const hit=root.querySelector('[data-africa-river="nile"]');hit.focus();paint('nile');
  assert.equal(document.activeElement.getAttribute('data-africa-river-hit-feature'),hit.getAttribute('data-africa-river-hit-feature'));
 });
});

test('a delayed manifest and river response paint the current choice instead of restoring the original selection',async()=>{
 await withRenderer(async({root,paint,ready,releaseManifest,releaseRivers})=>{
  paint('congo');releaseManifest();
  await new Promise(resolve=>setTimeout(resolve,5));
  paint('nile');paint('congo');releaseRivers();await ready();
  assert.deepEqual([...root.querySelectorAll('.africa-river-path.is-selected')].map(path=>path.getAttribute('data-africa-layer-feature')),africaRiverById('congo').featureIds);
  assert.equal(root.querySelectorAll('[data-africa-layer-feature]').length,rivers.features.length);
 },{delayManifest:true,delayRivers:true});
});
