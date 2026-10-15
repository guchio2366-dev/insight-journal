import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const bundle=await build({stdin:{contents:"export {initRussiaIndustry} from './src/scripts/atlas-russia-industry';export * from './src/data/atlas/russia-industry-catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Ru',platform:'browser',logLevel:'silent'});
const html=readFileSync('dist/atlas/russia/industry/index.html','utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
after(()=>stop());
function page(query='',interactive=true){const win=new Window({url:'https://example.test/insight-journal/atlas/russia/industry/'+query,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});win.document.body.innerHTML=html;win.ResizeObserver=class{observe(){}};win.eval(bundle.outputFiles[0].text);const root=win.document.querySelector('[data-ru-industry]');if(interactive)win.Ru.initRussiaIndustry(root);return {win,root,q:s=>root.querySelector(s),scene:()=>root.querySelector('[data-ru-scene]:not([hidden])'),choose:id=>{const select=root.querySelector('[data-ru-product-select]');select.value=id;select.dispatchEvent(new win.Event('change'));}};}
const positions=scene=>[...scene.querySelectorAll('[data-ru-label]')].map(n=>[n.dataset.ruLabel,n.getAttribute('transform'),n.dataset.box]);
test('SSR has three independent sector maps/legends, 19 statistics and all 49 source places',()=>{
 const {win,root,q}=page('',false);try{
  assert.equal(root.dataset.ruReady,undefined);assert.equal(root.querySelectorAll('[data-ru-scene]').length,3);assert.equal(root.querySelectorAll('[data-ru-scene]:not([hidden])').length,1);
  for(const sector of win.Ru.ruSectors){const scene=q(`[data-ru-scene="${sector.id}"]`);assert.equal(scene.querySelector('[data-ru-map]').getAttribute('viewBox'),'0 0 1200 597');assert.equal(scene.querySelector('[data-ru-legend]').dataset.ruLegend,sector.id);assert.ok(scene.querySelector('[data-ru-overlay] circle'));}
  const ids=[...root.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length,'Sector-specific SVG IDs do not collide');
  assert.equal(root.querySelectorAll('[data-ru-stat]').length,19);assert.equal(q('[data-ru-site-list]').children.length,49);assert.equal(root.querySelectorAll('[data-field-link]').length,5);assert.ok(q('noscript'));
  assert.equal(root.querySelectorAll('[data-ru-canvas] button,[data-ru-canvas] select,[data-ru-canvas] input').length,0,'No in-map industry-choice cards');
 }finally{win.happyDOM.abort();}
});
test('only the active sector contributes visible markers, annotations and legend; choices stay outside the map',()=>{
 const p=page('?keep=source#reference');try{
  for(const sector of p.win.Ru.ruSectors){p.q(`[data-ru-sector="${sector.id}"]`).click();const scene=p.scene(),allowed=[...p.win.Ru.ruIndustries].filter(i=>i.sectors.includes(sector.id)).map(i=>i.id);assert.equal(scene.dataset.ruScene,sector.id);assert.equal(p.root.querySelectorAll('[data-ru-scene]:not([hidden])').length,1);
   for(const marker of scene.querySelectorAll('[data-ru-marker]'))assert.ok(marker.dataset.ruIndustries.split(' ').every(id=>allowed.includes(id)));
   for(const label of scene.querySelectorAll('[data-ru-label]')){assert.ok(label.dataset.ruLabelIndustries.split(' ').every(id=>allowed.includes(id)));assert.equal(label.getAttribute('role'),null);assert.equal(label.getAttribute('tabindex'),null);}
   assert.deepEqual([...p.q('[data-ru-product-select]').options].map(o=>o.value),['',...allowed]);assert.deepEqual([...scene.querySelectorAll('[data-ru-legend-industry]')].map(n=>n.dataset.ruLegendIndustry),allowed);assert.equal(scene.querySelectorAll('[data-ru-guide],line').length,0,'No long leader or relationship lines');
   const before=positions(scene);for(const item of p.win.Ru.ruIndustries.filter(i=>i.sectors.includes(sector.id))){p.choose(item.id);assert.equal(p.q('[data-ru-title]').textContent,item.name);assert.equal(new URL(p.win.location.href).searchParams.get('industry'),item.id);assert.equal(p.q(`[data-ru-stat="${item.id}"]`).open,true);assert.deepEqual(positions(p.scene()),before,'Selection does not move annotations');for(const id of item.sourceIds)assert.ok([...p.q('[data-ru-reading-sources]').querySelectorAll('a')].some(a=>a.href===p.win.Ru.ruSources[id].url));}
   for(const button of [...p.q('[data-ru-site-list]').children]){button.click();assert.equal(p.q('[data-ru-selected]').hidden,false);assert.ok(p.q('[data-ru-site-title]').textContent);assert.deepEqual(positions(p.scene()),before);}
  }
  assert.equal(new URL(p.win.location.href).searchParams.get('keep'),'source');assert.equal(p.win.location.hash,'#reference');p.q('[data-ru-clear]').click();assert.equal(p.q('[data-ru-title]').textContent,'サービス業');
 }finally{p.win.happyDOM.abort();}
});
test('three map instances restore their stable positions through sector switching, only and keyboard/history',()=>{
 const p=page('?sector=manufacturing&industry=helium&site=amur-helium&only=1');try{
  assert.equal(p.scene().dataset.ruScene,'manufacturing');assert.equal(p.q('[data-ru-site-title]').textContent,'アムール州スヴォボードヌイ周辺');assert.equal(p.q('[data-ru-only]').checked,true);
  assert.ok([...p.scene().querySelectorAll('[data-ru-label]')].filter(n=>n.style.display!=='none').every(n=>n.dataset.ruLabelIndustries.split(' ').includes('helium')));
  const before=positions(p.scene());p.q('[data-ru-sector=manufacturing]').dispatchEvent(new p.win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(p.scene().dataset.ruScene,'services');assert.equal(p.win.document.activeElement.dataset.ruSector,'services');p.q('[data-ru-sector=manufacturing]').click();assert.deepEqual(positions(p.scene()),before);
  p.win.history.replaceState(null,'','?sector=resources&industry=diamond');p.win.dispatchEvent(new p.win.PopStateEvent('popstate'));assert.equal(p.scene().dataset.ruScene,'resources');assert.equal(p.q('[data-ru-title]').textContent,'天然ダイヤモンド');p.scene().querySelector('[data-ru-marker="mirny-diamond"]').dispatchEvent(new p.win.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(new URL(p.win.location.href).searchParams.get('site'),'mirny-diamond');
 }finally{p.win.happyDOM.abort();}
});
test('Zelenogorsk and four-plant capacity remain available on both appropriate maps',()=>{
 for(const sector of ['manufacturing','services']){const p=page(`?sector=${sector}&industry=enrichment&site=zelenogorsk-enrichment`);try{
  assert.equal(p.q('[data-ru-site-title]').textContent,'ゼレノゴルスク（クラスノヤルスク地方）');assert.match(p.q('[data-ru-site-note]').textContent,/工場敷地・建物の精密位置ではない/);const links=[...p.q('[data-ru-site-sources]').querySelectorAll('a')].map(a=>a.href);assert.ok(links.includes(p.win.Ru.ruSources.geonames.url));assert.ok(links.includes(p.win.Ru.ruSources.zelenogorskCity.url));assert.match(p.q('[data-ru-stat=enrichment]').textContent,/2,913.3万SWU\/年/);
 }finally{p.win.happyDOM.abort();}}
});
