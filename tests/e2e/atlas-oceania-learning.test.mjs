import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build,stop} from 'esbuild';
import {Window} from 'happy-dom';

const result=await build({entryPoints:[fileURLToPath(new URL('../../src/scripts/atlas-oceania-learning.ts',import.meta.url))],bundle:true,write:false,format:'iife',globalName:'OceaniaClient',platform:'browser',logLevel:'silent',define:{'import.meta.env.BASE_URL':JSON.stringify('/insight-journal')}});
after(()=>stop());
const site='https://example.test/insight-journal/atlas/oceania/';
function page(field,query=''){
 const win=new Window({url:site+field+'/'+query,settings:{enableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 win.document.write(readFileSync(new URL(`../../dist/atlas/oceania/${field}/index.html`,import.meta.url),'utf8'));
 win.ResizeObserver=class{observe(){} disconnect(){}};
 win.eval(result.outputFiles[0].text+';OceaniaClient.initOceaniaLearningAtlas(document.querySelector("[data-oceania-learning]"));');
 return {win,root:win.document.querySelector('[data-oceania-learning]')};
}
test('all four built Oceania pages expose real initial distributions, complete legends, messages and working entries',()=>{
 const expected={nature:18,agriculture:5,industry:9,population:10};
 const sitemap=readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8');
 for(const [field,count] of Object.entries(expected)){
  const {win,root}=page(field);
  assert.ok(root.querySelector('[data-primary-map] svg'),field);
  assert.equal(root.querySelectorAll('[data-place] option').length,26,field);
  assert.equal(root.querySelector('[data-primary-legend]').children.length,count,field);
  assert.ok(root.querySelector('[data-takeaway]').textContent.length>15,field);
  assert.ok(root.querySelector('[data-primary-period]').textContent.includes(field==='industry'?'2025':'2020'),field);
  assert.ok(root.querySelector('[data-primary-unit]').textContent.length>0,field);
  assert.equal(root.querySelector('.oceania-learning-sources').open,false,field);
  assert.equal(root.querySelectorAll('[data-field-link]').length,4,field);
  assert.ok(sitemap.includes(`/atlas/oceania/${field}/`),field);
  win.happyDOM.abort();
 }
});
test('Oceania export reading keeps the Australian production denominator separate from the 2020 map',()=>{
 const {win,root}=page('agriculture');
 try{
  const panel=root.querySelector('[data-export-reading]');
  assert.ok(panel);
  assert.deepEqual([...panel.querySelectorAll('li strong')].map(el=>el.textContent),['85％','82％','77％','75％']);
  assert.match(panel.textContent,/2022–23～2024–25年の3年平均・数量ベース/);
  assert.match(panel.textContent,/2020年の収穫面積・家畜密度/);
  assert.match(panel.textContent,/カノーラの位置は地図に未収録/);
  assert.ok(panel.querySelector('a[href="https://www.agriculture.gov.au/abares/products/insights/snapshot-of-australian-agriculture"]'));
  const place=root.querySelector('[data-place]');place.value='NZL';place.dispatchEvent(new win.Event('change'));
  assert.match(root.querySelector('[data-geography-reading]').textContent,/乳牛と肉牛、羊毛と食肉/);
  assert.equal(panel.querySelectorAll('li').length,4,'NZ selection does not create country statistics');
 }finally{win.happyDOM.abort();}
});
test('built PNG comparison preserves the original climate, crop choice, country, all legends and named return',()=>{
 const {win,root}=page('nature','?place=PNG&scope=country&theme=altitude&layer=climate&compare=coconut&view=comparison&keep=source#reference');
 assert.equal(root.querySelector('[data-comparison-view]').hidden,false);
 assert.ok(root.querySelector('[data-original-map] image').getAttribute('href').endsWith('/oceania-climate-v2/png.png'));
 assert.ok(root.querySelector('[data-comparison-map] [data-farming-mode="quantity"]').getAttribute('href').endsWith('/oceania-farming-overlay-v1/coconut-quantity.png'));
 assert.equal(root.querySelector('[data-original-map] svg').getAttribute('viewBox'),root.querySelector('[data-comparison-map] svg').getAttribute('viewBox'));
 assert.equal(root.querySelector('[data-original-legend]').children.length,7);
 assert.equal(root.querySelector('[data-comparison-legend]').children.length,6);
 assert.ok(root.querySelector('[data-return]').textContent.includes('パプアニューギニア'));
 root.querySelector('[data-return]').click();
 assert.equal(root.querySelector('[data-normal-view]').hidden,false);
 assert.equal(root.querySelector('[data-place]').value,'PNG');
 assert.equal(root.querySelector('[data-layer]').value,'climate');
 const url=new URL(win.location.href);assert.equal(url.searchParams.get('keep'),'source');assert.equal(url.hash,'#reference');
 for(const selector of ['[data-oceania-overview-link]','[data-oceania-base-link]','[data-field-link="agriculture"]'])assert.equal(new URL(root.querySelector(selector).href).searchParams.get('place'),'PNG');
 win.happyDOM.abort();
});
test('built Tarawa density compares source 1 km data with real climate classification and states its local scope',()=>{
 const {win,root}=page('population','?place=KIR&scope=country&layer=density&compare=climate&view=comparison');
 assert.ok(root.querySelector('[data-original-map] image').getAttribute('href').endsWith('/oceania-population-v2/tarawa.png'));
 assert.ok(root.querySelector('[data-comparison-map] image').getAttribute('href').endsWith('/oceania-climate-v2/kir-tarawa.png'));
 assert.ok(root.querySelector('[data-coverage]').textContent.includes('タラワ'));
 assert.ok(root.querySelector('[data-coverage]').textContent.includes('人口ゼロ'));
 assert.equal(root.querySelector('[data-original-map] svg').getAttribute('viewBox'),root.querySelector('[data-comparison-map] svg').getAttribute('viewBox'));
 assert.ok(root.querySelector('[data-original-map] .oceania-context-inset'));
 win.happyDOM.abort();
});

test('direct field routes start with the full regional frame and overview, including both industry point families',()=>{
 for(const field of ['nature','agriculture','industry','population']){
  const {win,root}=page(field);
  try{
   assert.equal(new URL(win.location.href).searchParams.get('scope'),'all');
   assert.equal(root.querySelector('[data-place]').value,'all');
   assert.ok(root.querySelector('[data-theme-title]').textContent.startsWith('オセアニアの'));
   assert.equal(root.querySelectorAll('[data-theme][aria-pressed="true"]').length,0);
   assert.equal(root.querySelector('[data-primary-map] svg').getAttribute('viewBox'),'0 0 1200 757');
   if(field==='industry'){
    assert.equal(root.querySelector('[data-layer]').value,'industry-all');
    assert.equal(root.querySelectorAll('[data-primary-map] circle[fill][stroke="#fff"]').length,347);
    assert.ok(root.querySelectorAll('[data-primary-map] path[fill][stroke="#fff"]').length>0);
    assert.match(root.querySelector('[data-coverage]').textContent,/生産量・埋蔵量を表しません/);
   }
  }finally{win.happyDOM.abort();}
 }
});

test('country selection preserves both crop and livestock comparison distributions, extent and URL on reload',()=>{
 const {win,root}=page('agriculture','?scope=all&layer=wheat&compare=cattle&view=comparison');
 try{
  const frame=root.querySelector('[data-original-map] svg').getAttribute('viewBox');
  const place=root.querySelector('[data-place]');place.value='PNG';place.dispatchEvent(new win.Event('change'));
  assert.equal(root.querySelector('[data-layer]').value,'wheat');
  assert.equal(root.querySelector('[data-compare-layer]').value,'cattle');
  for(const hook of ['original','comparison'])assert.equal(root.querySelector(`[data-${hook}-map] svg`).getAttribute('viewBox'),frame);
  assert.ok(root.querySelector('[data-original-map] [data-farming-mode="quantity"]').getAttribute('href').endsWith('/wheat-quantity.png'));
  assert.ok(root.querySelector('[data-comparison-map] [data-farming-mode="quantity"]').getAttribute('href').endsWith('/cattle-quantity.png'));
  assert.match(root.querySelector('[data-original-unit]').textContent,/ha/);
  assert.match(root.querySelector('[data-comparison-unit]').textContent,/頭/);
  const reloaded=page('agriculture',win.location.search);
  try{
   assert.equal(reloaded.root.querySelector('[data-place]').value,'PNG');
   assert.equal(reloaded.root.querySelector('[data-layer]').value,'wheat');
   assert.equal(reloaded.root.querySelector('[data-compare-layer]').value,'cattle');
   assert.equal(reloaded.root.querySelector('[data-original-map] svg').getAttribute('viewBox'),frame);
  }finally{reloaded.win.happyDOM.abort();}
 }finally{win.happyDOM.abort();}
});

test('changing the livestock layer updates its reading while keeping the chosen comparison and full extent',()=>{
 const {win,root}=page('agriculture','?scope=all&compare=climate');
 try{
  const frame=root.querySelector('[data-primary-map] svg').getAttribute('viewBox');
  const layer=root.querySelector('[data-layer]');layer.value='cattle';layer.dispatchEvent(new win.Event('change'));
  assert.equal(new URL(win.location.href).searchParams.get('theme'),'livestock');
  assert.equal(root.querySelector('[data-compare-layer]').value,'climate');
  assert.equal(root.querySelector('[data-primary-map] svg').getAttribute('viewBox'),frame);
  assert.match(root.querySelector('[data-primary-unit]').textContent,/頭/);
 }finally{win.happyDOM.abort();}
});
