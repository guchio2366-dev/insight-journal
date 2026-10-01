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
 const win=new Window({url:site+field+'/'+query,settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 win.document.write(readFileSync(new URL(`../../dist/atlas/oceania/${field}/index.html`,import.meta.url),'utf8'));
 win.ResizeObserver=class{observe(){} disconnect(){}};
 win.eval(result.outputFiles[0].text+';OceaniaClient.initOceaniaLearningAtlas(document.querySelector("[data-oceania-learning]"));');
 return {win,root:win.document.querySelector('[data-oceania-learning]')};
}
test('all four built Oceania pages expose real initial distributions, complete legends, messages and working entries',()=>{
 const expected={nature:18,agriculture:8,industry:6,population:10};
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
test('built PNG comparison preserves the original climate, crop choice, country, all legends and named return',()=>{
 const {win,root}=page('nature','?place=PNG&scope=country&theme=altitude&layer=climate&compare=coconut&view=comparison&keep=source#reference');
 assert.equal(root.querySelector('[data-comparison-view]').hidden,false);
 assert.ok(root.querySelector('[data-original-map] image').getAttribute('href').endsWith('/oceania-climate-v2/png.png'));
 assert.ok(root.querySelector('[data-comparison-map] image').getAttribute('href').endsWith('/oceania-crops-v1/coconut.png'));
 assert.equal(root.querySelector('[data-original-map] svg').getAttribute('viewBox'),root.querySelector('[data-comparison-map] svg').getAttribute('viewBox'));
 assert.equal(root.querySelector('[data-original-legend]').children.length,7);
 assert.equal(root.querySelector('[data-comparison-legend]').children.length,8);
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
