import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
import {resolve} from 'node:path';
const place=await build({entryPoints:[resolve('src/scripts/atlas-asia-place-readings.ts')],bundle:true,format:'iife',globalName:'Place',platform:'browser',write:false,logLevel:'silent'});
const dock=await build({entryPoints:[resolve('src/scripts/atlas-asia-reading-dock.ts')],bundle:true,format:'iife',globalName:'Dock',platform:'browser',write:false,logLevel:'silent'});
test('詳説の外へ移した事例比較入口は、選択・月別遷移・解除後も元の場所を参照できる',async()=>{
 const window=new Window({url:'https://example.org/atlas/asia/east-asia/agriculture/'});
 try{
  window.document.body.innerHTML='<main><script data-asia-config type="application/json">{"regionId":"east-asia"}</script><section data-reading-dock><h2 data-reading-dock-title></h2><p data-reading-dock-summary></p><button data-dock-compare="natural"></button></section><details data-reading-details><section data-place-reading><select data-place-story></select><div data-place-story-body><h2 data-place-story-title></h2><p data-place-story-lead></p><p data-place-story-text></p><p data-place-story-scope></p><a data-place-story-source></a><div data-place-story-bridges></div></div></section></details></main>';
  window.eval(place.outputFiles[0].text+';window.createPlace=Place.createPlaceReadings;'+dock.outputFiles[0].text+';window.createDock=Dock.createAsiaReadingDock;');
  const root=window.document.querySelector('main');let state={field:'agriculture',place:null,city:null,back:null,camera:null};
  const controller=window.createPlace(root,'east-asia',()=>state,next=>{state=next;},()=>state.camera),reading=window.createDock(root);
  controller.render();const select=root.querySelector('[data-place-story]');select.value='north-china-wheat';select.dispatchEvent(new window.Event('change'));controller.render();reading.render(state);
  const bridges=root.querySelector('[data-place-story-bridges]');assert.equal(bridges.closest('[data-reading-dock]'),root.querySelector('[data-reading-dock]'));
  assert.equal(root.querySelector('[data-reading-details]').open,false);assert.equal(bridges.hidden,false);
  assert.match(root.querySelector('[data-reading-dock-title]').textContent,/華北平原/);
  assert.equal(root.querySelector('[data-dock-compare]').hidden,true);
  root.querySelector('[data-place-bridge-topic="seasonal-precipitation"]').click();controller.render();reading.render(state);
  assert.equal(state.topic,'seasonal-precipitation');assert.equal(state.detail,'m-04');assert.deepEqual([...state.point],[115,37.8]);assert.ok(state.back);assert.equal(bridges.hidden,true);
  state={field:'agriculture',place:null,city:null,back:null,camera:null};controller.render();reading.render(state);assert.equal(bridges.hidden,true);assert.equal(root.querySelector('[data-dock-compare]').hidden,false);
 }finally{await window.happyDOM.close();}
});
