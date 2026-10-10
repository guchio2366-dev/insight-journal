import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const cities=JSON.parse(readFileSync('src/data/atlas/oceania-russia-climate-cities.json','utf8'));
const bundles={};
for(const region of ['oceania','russia']){
 const fn=region==='oceania'?'initOceaniaLearningAtlas':'initRussiaLearningAtlas';
 bundles[region]=(await build({stdin:{contents:`import {${fn}} from './src/scripts/atlas-${region}-learning';window.initRegion=${fn};`,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')},logLevel:'silent'})).outputFiles[0].text;
}
after(()=>stop());
function page(region,query=''){
 const win=new Window({url:`https://example.test/insight-journal/atlas/${region}/nature/${query}`,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 win.document.body.innerHTML=readFileSync(`dist/atlas/${region}/nature/index.html`,'utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
 win.ResizeObserver=class{observe(){}};win.eval(bundles[region]);const root=win.document.querySelector(`[data-${region}-learning]`);win.initRegion(root);
 return {win,root,marker:id=>root.querySelector(`[data-primary-map] [data-regional-climate-city="${id}"]`),panel:root.querySelector('[data-regional-climate-reading]'),frame:()=>root.querySelector('[data-primary-map]>svg').getAttribute('viewBox')};
}
for(const region of ['oceania','russia'])test(`${region}: every station opens correct title, monthly chart and quantitative explanation; select/clear/Back preserve camera and other selection`,()=>{
 const p=page(region,'?keep=ok#atlas');
 try{
  assert.equal(p.panel.hidden,true);const frame=p.frame();
  assert.equal(p.root.querySelectorAll('[data-primary-map] [data-regional-climate-city]').length,cities.filter(c=>c.region===region).length);
  for(const c of cities.filter(c=>c.region===region)){
   const before=new URL(p.win.location.href);p.marker(c.id).dispatchEvent(new p.win.MouseEvent('click',{bubbles:true}));
   assert.equal(p.frame(),frame);assert.equal(p.panel.hidden,false);assert.equal(p.panel.querySelector('h2').textContent,`${c.name}－${c.countryName}の雨温図`);
   assert.equal(p.marker(c.id).getAttribute('aria-pressed'),'true');assert.equal(p.panel.querySelectorAll('[data-climate-plot-month]').length,12);
   assert.match(p.panel.querySelector('[data-city-climate-definition]').textContent,/℃/);assert.match(p.panel.textContent,/1991–2020/);assert.match(p.panel.textContent,/積雪深ではありません/);
   const url=new URL(p.win.location.href);assert.equal(url.searchParams.get('city'),c.id);assert.equal(url.searchParams.get('keep'),'ok');assert.equal(url.hash,'#atlas');
   for(const key of ['place','scope','theme','layer','compare','reading'])assert.equal(url.searchParams.get(key),before.searchParams.get(key));
   assert.equal(new URL(p.root.querySelector('[data-field-link="agriculture"]').href).searchParams.has('city'),false);
   const selectedUrl=p.win.location.href;p.panel.querySelector('[data-clear-climate-city]').click();assert.equal(p.panel.hidden,true);assert.equal(p.frame(),frame);assert.equal(new URL(p.win.location.href).searchParams.has('city'),false);
   p.win.history.replaceState({},'',selectedUrl);p.win.dispatchEvent(new p.win.PopStateEvent('popstate'));assert.equal(p.panel.hidden,false);assert.equal(p.panel.dataset.city,c.id);assert.equal(p.frame(),frame);
   p.panel.querySelector('[data-clear-climate-city]').click();
  }
  const first=cities.find(c=>c.region===region);p.marker(first.id).dispatchEvent(new p.win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(p.panel.dataset.city,first.id);assert.equal(p.panel.hidden,false);
 }finally{p.win.happyDOM.abort();}
});
test('city deep links are region-specific, safely reject unknown ids, and retain scoped camera without automatic selection',()=>{
 for(const [region,id,scope,place] of [['oceania','perth','country','AUS'],['russia','moscow','region','west']]){
  const p=page(region,`?city=${id}&scope=${scope}&place=${place}`);
  try{const frame=p.frame();assert.equal(p.panel.hidden,false);assert.equal(p.panel.dataset.city,id);p.panel.querySelector('[data-clear-climate-city]').click();assert.equal(p.frame(),frame);assert.equal(p.root.querySelector('[data-place]').value,place);}finally{p.win.happyDOM.abort();}
  for(const bad of ['unknown',region==='oceania'?'moscow':'darwin']){const q=page(region,`?city=${bad}`);try{assert.equal(q.panel.hidden,true);assert.equal(new URL(q.win.location.href).searchParams.has('city'),false);}finally{q.win.happyDOM.abort();}}
 }
});
