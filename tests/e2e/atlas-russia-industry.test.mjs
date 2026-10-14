import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';
const bundle=await build({stdin:{contents:"export {initRussiaIndustry} from './src/scripts/atlas-russia-industry';export * from './src/data/atlas/russia-industry-catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',globalName:'Ru',platform:'browser',logLevel:'silent'});
const html=readFileSync('dist/atlas/russia/industry/index.html','utf8').replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
after(()=>stop());
function page(query='',interactive=true){const win=new Window({url:'https://example.test/insight-journal/atlas/russia/industry/'+query,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});win.document.body.innerHTML=html;win.ResizeObserver=class{observe(){}};win.eval(bundle.outputFiles[0].text);const root=win.document.querySelector('[data-ru-industry]');if(interactive)win.Ru.initRussiaIndustry(root);return {win,root,q:s=>root.querySelector(s)};}
test('Russia industry SSR retains a real map, all 19 product statistics, 49 places and source definitions',()=>{
 const {win,root,q}=page('',false);try{assert.equal(root.dataset.ruReady,undefined);assert.equal(q('[data-ru-map]').getAttribute('viewBox'),'0 0 1200 597');assert.ok(q('[data-ru-overlay] circle'));assert.equal(root.querySelectorAll('[data-ru-stat]').length,19);assert.equal(q('[data-ru-site-list]').children.length,49);assert.equal(root.querySelectorAll('[data-field-link]').length,5);assert.match(q('#russia-industry-sources').textContent,/直接|相手|報告/);assert.match(root.textContent,/未取得/);assert.ok(q('noscript'));}finally{win.happyDOM.abort();}
});
test('all sectors, products and site choices update evidence and keep label positions stable',()=>{
 const {win,root,q}=page('?keep=source#reference');try{
  assert.equal(root.dataset.ruReady,'true');assert.equal(q('[data-ru-title]').textContent,'資源・エネルギー');
  for(const sector of win.Ru.ruSectors){q(`[data-ru-sector="${sector.id}"]`).click();const before=[...root.querySelectorAll('[data-ru-label]')].map(n=>[n.dataset.ruLabel,n.style.left,n.style.top]);for(const i of win.Ru.ruIndustries.filter(i=>i.sectors.includes(sector.id))){q(`[data-ru-products="${sector.id}"] [data-ru-product="${i.id}"]`).click();assert.equal(q('[data-ru-title]').textContent,i.name);assert.equal(new URL(win.location.href).searchParams.get('industry'),i.id);assert.equal(q(`[data-ru-stat="${i.id}"]`).open,true);assert.match(q('[data-ru-reading]').textContent,new RegExp(i.reading.slice(0,5)));const after=[...root.querySelectorAll('[data-ru-label]')].map(n=>[n.dataset.ruLabel,n.style.left,n.style.top]);assert.deepEqual(after,before);for(const id of i.sourceIds)assert.ok([...q('[data-ru-reading-sources]').querySelectorAll('a')].some(a=>a.href===win.Ru.ruSources[id].url));}
   for(const button of [...q('[data-ru-site-list]').children]){button.click();assert.ok(q('[data-ru-site-title]').textContent.length>0);assert.equal(q('[data-ru-selected]').hidden,false);assert.equal(new URL(win.location.href).searchParams.has('site'),true);}
  }
  assert.equal(new URL(win.location.href).searchParams.get('keep'),'source');assert.equal(win.location.hash,'#reference');
  q('[data-ru-clear]').click();assert.equal(q('[data-ru-title]').textContent,'サービス業');assert.equal(new URL(win.location.href).searchParams.has('site'),false);
 }finally{win.happyDOM.abort();}
});
test('direct links, browser navigation, only and keyboard tabs preserve the expected selection',()=>{
 const {win,root,q}=page('?sector=manufacturing&industry=helium&site=amur-helium&only=1');try{
  assert.equal(q('[data-ru-site-title]').textContent,'アムール州スヴォボードヌイ周辺');assert.equal(q('[data-ru-only]').checked,true);assert.ok([...root.querySelectorAll('[data-ru-label]')].filter(n=>!n.hidden).every(n=>n.dataset.ruLabel==='helium'));
  q('[data-ru-sector=manufacturing]').dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(root.dataset.ruSector,'services');assert.equal(win.document.activeElement.dataset.ruSector,'services');
  win.history.replaceState(null,'','?sector=resources&industry=diamond');win.dispatchEvent(new win.PopStateEvent('popstate'));assert.equal(q('[data-ru-title]').textContent,'天然ダイヤモンド');
  const marker=q('[data-ru-marker="mirny-diamond"]');assert.ok(marker);marker.dispatchEvent(new win.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(new URL(win.location.href).searchParams.get('site'),'mirny-diamond');
 }finally{win.happyDOM.abort();}
});
test('Zelenogorsk deep link explains city identity, guide-point precision and both public sources',()=>{
 for(const sector of ['manufacturing','services']){
  const {win,q}=page(`?sector=${sector}&industry=enrichment&site=zelenogorsk-enrichment`);try{
   assert.equal(q('[data-ru-site-title]').textContent,'ゼレノゴルスク（クラスノヤルスク地方）');
   assert.match(q('[data-ru-site-note]').textContent,/56\.11度・東経約94\.59度/);assert.match(q('[data-ru-site-note]').textContent,/工場敷地・建物の精密位置ではない/);
   const links=[...q('[data-ru-site-sources]').querySelectorAll('a')].map(a=>a.href);assert.ok(links.includes(win.Ru.ruSources.geonames.url));assert.ok(links.includes(win.Ru.ruSources.zelenogorskCity.url));
   assert.ok(q('[data-ru-stat=enrichment]').textContent.includes('2,913.3万SWU/年'));assert.equal(q('[data-ru-selected]').hidden,false);
  }finally{win.happyDOM.abort();}
 }
});
