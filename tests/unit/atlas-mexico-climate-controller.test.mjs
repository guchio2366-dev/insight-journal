import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const bundle=(await build({entryPoints:['src/scripts/atlas-mexico-climate.ts'],bundle:true,format:'iife',globalName:'Climate',write:false})).outputFiles[0].text;
function page(search=''){
 const window=new Window({url:'https://example.test/nature/'+search,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.body.innerHTML='<main><h2 data-mexico-climate-heading></h2><svg><g data-mexico-climate-city="mexico-city-tacubaya" role="button" tabindex="0"></g><g data-mexico-climate-city="culiacan-dge" role="button" tabindex="0"></g></svg><section data-mexico-climate-plot="mexico-city-tacubaya" data-climate-city-name="メキシコシティ（タクバヤ）"></section><section data-mexico-climate-plot="culiacan-dge" data-climate-city-name="クリアカン"></section><p data-mexico-climate-notice hidden></p></main>';
 window.eval(bundle+';Climate.initMexicoClimate(document.querySelector("main"));');return window;
}
test('capital defaults to the actual Tacubaya record; keyboard selection preserves crop context and viewport',async()=>{
 const w=page('?state=25&view=climate&compare=maize&source=agriculture&frame=10,20,450,290');
 try{
  const q=s=>w.document.querySelector(s);assert.equal(q('[data-mexico-climate-heading]').textContent,'メキシコシティ（タクバヤ）の雨温図');assert.equal(q('[data-mexico-climate-plot="mexico-city-tacubaya"]').hidden,false);
  q('[data-mexico-climate-city="culiacan-dge"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(q('[data-mexico-climate-plot="culiacan-dge"]').hidden,false);assert.equal(q('[data-mexico-climate-heading]').textContent,'クリアカンの雨温図');
  assert.equal(q('[data-mexico-climate-plot="mexico-city-tacubaya"]').hidden,true);
  const url=new URL(w.location);assert.equal(url.searchParams.get('city'),'culiacan-dge');
  for(const [key,value] of Object.entries({state:'25',view:'climate',compare:'maize',source:'agriculture',frame:'10,20,450,290'}))assert.equal(url.searchParams.get(key),value);
 }finally{await w.happyDOM.close();}
});
test('unknown station never silently substitutes the capital; selection and history restore exact records',async()=>{
 const w=page('?city=unavailable&waterFeature=basins:123');
 try{
  const q=s=>w.document.querySelector(s);assert.ok([...w.document.querySelectorAll('[data-mexico-climate-plot]')].every(p=>p.hidden));
  assert.equal(q('[data-mexico-climate-notice]').hidden,false);assert.match(q('[data-mexico-climate-notice]').textContent,/置き換えません/);
  q('[data-mexico-climate-city="culiacan-dge"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  assert.equal(q('[data-mexico-climate-notice]').hidden,true);assert.equal(new URL(w.location).searchParams.get('waterFeature'),'basins:123');
  w.history.replaceState(null,'','?city=mexico-city-tacubaya');w.dispatchEvent(new w.PopStateEvent('popstate'));
  assert.equal(q('[data-mexico-climate-plot="mexico-city-tacubaya"]').hidden,false);
  assert.equal(q('[data-mexico-climate-city="mexico-city-tacubaya"]').getAttribute('aria-pressed'),'true');
 }finally{await w.happyDOM.close();}
});
