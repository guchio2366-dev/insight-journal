import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {Window} from 'happy-dom';import {bundleCanadaSource} from '../fixtures/bundle-canada-source.mjs';
const code=await bundleCanadaSource('src/scripts/atlas-canada-agriculture-distribution.ts',{globalName:'CanadaBeltController'});
const census=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/census-agriculture.json'));
const geometry=JSON.parse(await readFile('public/assets/atlas/canada-census-agriculture-v1/ccs.geojson'));
const supplement=JSON.parse(await readFile('public/assets/atlas/canada-agriculture-major-v1/provincial-supplement.json'));
async function page(search=''){
 const w=new Window({url:'https://example.com/insight-journal/atlas/north-america/canada/agriculture/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 w.document.write((await readFile('dist/atlas/north-america/canada/agriculture/index.html','utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 const methods=['setTransform','clearRect','fillRect','save','restore','translate','scale','fill','stroke','clip','setLineDash','beginPath','moveTo','lineTo','fillText'];const ctx=Object.fromEntries(methods.map(key=>[key,()=>{}]));ctx.isPointInPath=()=>false;
 w.structuredClone=structuredClone;w.HTMLCanvasElement.prototype.getContext=()=>ctx;w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};w.HTMLCanvasElement.prototype.hasPointerCapture=()=>false;w.HTMLCanvasElement.prototype.releasePointerCapture=()=>{};w.Path2D=class{};w.ResizeObserver=class{constructor(fn){this.fn=fn;}observe(){this.fn();}};
 w.requestAnimationFrame=fn=>{fn(0);return 0;};w.fetch=async url=>({ok:true,json:async()=>String(url).includes('ccs.geojson')?geometry:String(url).includes('provincial-supplement')?supplement:census});
 const frame=w.document.querySelector('#canada-agri-map-frame');frame.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:1080,bottom:584,width:1080,height:584});
 w.eval(code+';window.beltsReady=CanadaBeltController.initCanadaAgricultureDistribution(document.querySelector("[data-canada-agri-overview]"));');await w.beltsReady;
 assert.equal(w.document.querySelector('[data-canada-agri-overview]').dataset.loadError,undefined);return w;
}
test('Canada production-belt controller preserves all distributions and camera through selection, layer switches, history and reload',async()=>{
 const w=await page();try{
  const root=w.document.querySelector('[data-canada-agri-overview]'),api=root.canadaAgriculture,camera=api.getState().camera,both=api.getRenderStats().productionBelts;
  assert.equal(both.length,32);assert.equal(api.getRenderStats().coloredCcs,0);assert.equal(api.getRenderStats().retainedValues,21084);
  assert.equal(root.querySelectorAll('#canada-agri-region option').length,1758);assert.equal(root.querySelectorAll('#canada-agri-definitions section').length,12);assert.equal(root.querySelectorAll('#canada-agri-scales .scale-row').length,12);assert.ok(root.querySelectorAll('#canada-agri-sources a').length>=5);
  root.querySelector('[data-metric=canola]').click();assert.deepEqual(api.getRenderStats().productionBelts,both);assert.deepEqual(api.getState().camera,camera);assert.equal(api.getRenderStats().opacities.canola,1);assert.equal(api.getRenderStats().opacities.beef,.45);
  const canvas=root.querySelector('#canada-agri-map');canvas.getContext('2d').isPointInPath=()=>true;
  canvas.dispatchEvent(new w.PointerEvent('pointerdown',{button:0,pointerId:1,clientX:400,clientY:200}));canvas.dispatchEvent(new w.PointerEvent('pointerup',{button:0,pointerId:1,clientX:400,clientY:200}));assert.equal(api.getState().metric,'canola','The highlighted belt painted on top also receives an overlapping hit');
  const crops=root.querySelector('[data-agri-layer=crop]');crops.checked=false;crops.dispatchEvent(new w.Event('change'));assert.equal(api.getState().metric,null);assert.equal(new URL(w.location.href).searchParams.has('agriFocus'),false);assert.equal(api.getRenderStats().opacities.beef,1);crops.checked=true;crops.dispatchEvent(new w.Event('change'));root.querySelector('[data-metric=canola]').click();
  const livestock=root.querySelector('[data-agri-layer=livestock]');livestock.checked=false;livestock.dispatchEvent(new w.Event('change'));assert.deepEqual(api.getState().layers,['crop']);assert.ok(api.getRenderStats().productionBelts.every(b=>!['beef','dairy','pork','chicken'].includes(b.product)));
  const saved=w.location.search,reloaded=await page(saved);try{assert.deepEqual(reloaded.document.querySelector('[data-canada-agri-overview]').canadaAgriculture.getState().layers,['crop']);assert.equal(reloaded.document.querySelector('[data-agri-layer=livestock]').checked,false);}finally{await reloaded.happyDOM.close();}
  w.history.replaceState(null,'','?item=overview&agriLayers=livestock&agriFocus=dairy');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.deepEqual(api.getState().layers,['livestock']);assert.equal(api.getState().metric,'dairy');assert.deepEqual(api.getState().camera,camera);
  root.querySelector('[data-metric=""]').click();assert.equal(api.getState().metric,null);assert.ok(api.getRenderStats().productionBelts.every(b=>['beef','dairy','pork','chicken'].includes(b.product)));
  assert.equal(root.querySelector('#canada-agri-reset,#canada-agri-south,#canada-agri-zoom-in,#canada-agri-zoom-out'),null);
 }finally{await w.happyDOM.close();}
});
test('Canada source-region selection is independent of the editorial belt geometry and keeps missing values and original components',async()=>{
 const w=await page();try{
  const root=w.document.querySelector('[data-canada-agri-overview]'),api=root.canadaAgriculture,camera=api.getState().camera,region=root.querySelector('#canada-agri-region');
  region.value='2021S05021001214';region.dispatchEvent(new w.Event('change'));assert.deepEqual(api.getState().camera,camera);assert.equal(api.getRenderStats().productionBelts.length,32);
  for(const product of Object.keys(census.products))assert.deepEqual(api.getCell(region.value,product),census.records[region.value].cells[product]);
  for(const product of ['pork','chicken']){assert.equal(api.getCell(region.value,product).value,null);assert.equal(api.getCell(region.value,product).status,'not-covered');}
  assert.match(root.querySelector('[data-value=canola]').textContent,/0 ha/);assert.match(root.querySelector('[data-value=beef]').textContent,/非公表 F/);
  root.querySelector('#canada-agri-clear-region').click();assert.equal(api.getState().ccs,null);assert.deepEqual(api.getState().camera,camera);assert.match(root.querySelector('[data-value=chicken]').textContent,/2,823 生産者/);
 }finally{await w.happyDOM.close();}
});
