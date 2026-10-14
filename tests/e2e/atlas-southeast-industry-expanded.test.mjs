import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Window} from 'happy-dom';
const html=await readFile(new URL('../../dist/atlas/asia/southeast-asia/industry/index.html',import.meta.url),'utf8');
const {outputFiles}=await build({entryPoints:['src/scripts/atlas-asia-southeast-industry.ts'],bundle:true,write:false,format:'iife',globalName:'SEA',platform:'browser',define:{'import.meta.env.BASE_URL':'"/insight-journal/"'}});
function fixture(query=''){
 const window=new Window({url:'http://localhost/insight-journal/atlas/asia/southeast-asia/industry/'+query,settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 window.document.write(html);const module=window.eval(outputFiles[0].text+'\nSEA;');
 const root=window.document.querySelector('[data-asia-atlas]');
 let state={field:'industry',place:null,topic:'manufacturing'};
 const controller=module.createSoutheastIndustryLocations(root,()=>state);controller.show(null);
 return {window,root,controller,setState(s){state={...state,...s};controller.render();},button(id){return root.querySelector('[data-southeast-industry-controls] [data-southeast-industry-kind="'+id+'"]');}};
}
test('built regional page mounts 18 industries with right-hand prose and separate below-map statistics',()=>{
 const f=fixture();try{
  assert.equal(f.root.querySelectorAll('[data-southeast-industry-controls] [data-southeast-industry-kind]').length,19);
  assert.equal(f.root.querySelectorAll('[data-sea-overview-row]').length,18);
  assert.equal(f.root.querySelector('[data-industry-region-reading]').parentElement,f.root.querySelector('[data-reading-dock]'));
  assert.equal(f.root.querySelector('[data-southeast-industry-statistics]').previousElementSibling,f.root.querySelector('[data-asia-statistics]'));
  assert.equal(f.root.querySelector('[data-southeast-industry-map]').hidden,true,'unpositioned markers stay hidden until the real map is ready');
  f.button('palm').click();assert.equal(f.root.dataset.southeastIndustryKind,'palm');assert.equal(f.root.querySelector('[data-southeast-industry-facts="palm"]').hidden,false);
  assert.equal(f.root.querySelectorAll('[data-southeast-palm-state-table] tbody tr').length,7);
  assert.match(f.root.querySelector('[data-southeast-industry-facts="palm"]').textContent,/17,266,555t.*52.0%/);
  f.button('rice').click();assert.match(f.root.querySelector('[data-southeast-industry-facts="rice"]').textContent,/HS100630/);
 }finally{f.window.happyDOM.abort();}
});
test('industry/site URLs, clear and history reject incompatible site state and retain the original catalog',async()=>{
 const f=fixture('?industryKind=wood&industrySite=rayong-tires');try{
  assert.equal(f.root.dataset.southeastIndustryKind,'wood');assert.equal(f.root.querySelector('[data-southeast-industry-selected]').hidden,true);
  f.root.querySelector('[data-southeast-industry-site="rayong-tires"]').click();assert.equal(new URL(f.window.location.href).searchParams.get('industrySite'),'rayong-tires');assert.equal(f.root.dataset.southeastIndustryKind,'rubber');
  f.root.querySelector('[data-southeast-industry-clear]').click();assert.equal(new URL(f.window.location.href).searchParams.has('industryKind'),false);
  f.window.history.replaceState(null,'','?industryKind=lng&industrySite=bintulu-lng');f.window.dispatchEvent(new f.window.PopStateEvent('popstate'));await new Promise(r=>setImmediate(r));
  assert.equal(f.root.dataset.southeastIndustryKind,'lng');assert.equal(f.root.querySelector('[data-southeast-industry-selected]').hidden,false);
  assert.equal(f.root.querySelectorAll('[data-southeast-industry-point]').length,30);
 }finally{f.window.happyDOM.abort();}
});
test('sector emphasis, service definitions, national mode and other fields retain their independent boundaries',()=>{
 const f=fixture();try{
  f.root.querySelector('[data-southeast-industry-sector="resource"]').click();assert.equal(f.button('electronics').disabled,true);assert.equal(f.button('lng').disabled,false);
  f.root.querySelector('[data-southeast-industry-sector="services"]').click();f.button('it-bpm').click();assert.match(f.root.querySelector('[data-southeast-industry-facts="it-bpm"]').textContent,/付加価値.*需給式/s);
  f.setState({place:'THA'});assert.equal(f.root.querySelector('[data-southeast-industry-controls]').hidden,true);assert.equal(f.root.querySelector('[data-southeast-industry-statistics]').hidden,true);
  f.setState({place:null,field:'natural'});assert.equal(f.root.dataset.southeastIndustryActive,'false');
 }finally{f.window.happyDOM.abort();}
});
