import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const source=await readFile('src/scripts/atlas-canada-population-geometry-loader.ts','utf8');
const code=(await transform(source+'\nglobalThis.hydrateGeometry=hydrateCanadaPopulationGeometry;',{loader:'ts',format:'iife'})).code;
const geometryUrl='/insight-journal/_astro/population-geometry.hash.json';
const feature={id:'535',point:[620,520],bounds:[615,515,625,525],provinceCodes:['35'],rings:[[[0,0],[4,0],[4,4],[0,0]],[[1,1],[2,1],[2,2],[1,1]]]};
const metadata=()=>({id:feature.id,point:[...feature.point],bounds:[...feature.bounds],provinceCodes:[...feature.provinceCodes]});
const config=()=>({population:{geometryUrl,geometry:[metadata()]}});
async function page(search='?populationReturn=year%3D2016%26cma%3D535',selector='data-canada-config'){
 const window=new Window({url:'https://example.com/insight-journal/atlas/north-america/canada/nature/'+search,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const root=window.document.createElement('article');root.innerHTML='<a data-return href="/insight-journal/atlas/north-america/canada/population/?year=2016&cma=535">人口比較へ戻る</a><h2>都市圏の集中を比べる</h2>';
 const script=window.document.createElement('script');script.type='application/json';script.setAttribute(selector,'');script.textContent=JSON.stringify(config());root.append(script);window.document.body.append(root);window.eval(code);
 return {window,root};
}

test('Ordinary nature and industry pages do not request population boundaries',async()=>{
 for(const selector of ['data-canada-config','data-industry-config']){
  const {window,root}=await page('',selector);try{let requests=0;window.fetch=async()=>{requests++;throw new Error('Unexpected download');};const cfg=config(),result=await window.hydrateGeometry(root,'['+selector+']',{config:cfg});assert.equal(result.status,'not-needed');assert.equal(requests,0);assert.equal(root.dataset.populationGeometryState,'not-needed');assert.equal(root.querySelector('[data-population-geometry-status]'),null);assert.equal(cfg.population.geometry[0].rings,undefined);}finally{await window.happyDOM.close();}
 }
});

test('Saved comparison retains its metadata, heading and return action while full rings load',async()=>{
 const {window,root}=await page();try{
  let release,requests=0,rendered=0;const cfg=config();const before=structuredClone(cfg.population.geometry);const back=root.querySelector('[data-return]').href;
  window.fetch=async(url,options)=>{requests++;assert.equal(url,'https://example.com'+geometryUrl);assert.equal(options.credentials,'same-origin');await new Promise(resolve=>{release=resolve;});return {ok:true,json:async()=>({features:[feature]})};};
  const loading=window.hydrateGeometry(root,undefined,{config:cfg,onReady:()=>{rendered++;assert.deepEqual(cfg.population.geometry[0].rings,feature.rings);}});
  assert.equal(root.dataset.populationGeometryState,'loading');assert.match(root.querySelector('[role="status"]').textContent,/読み込んでいます/);assert.equal(root.querySelector('[data-return]').href,back);assert.equal(root.querySelector('h2').hidden,false);assert.deepEqual(cfg.population.geometry,before);assert.equal(rendered,0);
  release();const result=await loading;assert.equal(result.status,'ready');assert.equal(result.config,cfg);assert.equal(rendered,1);assert.equal(requests,1);assert.equal(root.dataset.populationGeometryState,'ready');assert.equal(root.querySelector('[data-population-geometry-status]').hidden,true);assert.equal(cfg.population.geometry[0].rings.length,2);assert.deepEqual(cfg.population.geometry[0].rings,feature.rings);assert.equal(root.querySelector('[data-return]').href,back);
  await window.hydrateGeometry(root,undefined,{config:cfg});assert.equal(requests,1);
 }finally{await window.happyDOM.close();}
});

test('Two comparison roots share a boundary asset request while both receive complete geometry',async()=>{
 const {window,root}=await page('', 'data-industry-config');try{
  window.history.replaceState(null,'','?populationReturn=cma%3D535');let requests=0;window.fetch=async()=>{requests++;return {ok:true,json:async()=>({features:[feature]})};};const other=root.cloneNode(true);window.document.body.append(other);
  const first=config(),second=config();const results=await Promise.all([window.hydrateGeometry(root,'[data-industry-config]',{config:first}),window.hydrateGeometry(other,'[data-industry-config]',{config:second})]);assert.equal(requests,1);assert.equal(results.every(result=>result.status==='ready'),true);assert.deepEqual(first.population.geometry[0].rings,feature.rings);assert.deepEqual(second.population.geometry[0].rings,feature.rings);
 }finally{await window.happyDOM.close();}
});

test('Failed geometry download reports that the original distribution is unavailable and supports retry',async()=>{
 const {window,root}=await page();try{
  const cfg=config(),before=structuredClone(cfg.population.geometry);let requests=0,rendered=0,errors=0;window.fetch=async()=>{requests++;return requests===1?{ok:false,status:503}:{ok:true,json:async()=>({features:[feature]})};};
  const result=await window.hydrateGeometry(root,undefined,{config:cfg,onReady:()=>rendered++,onError:()=>errors++});assert.equal(result.status,'error');assert.equal(root.dataset.populationGeometryState,'error');assert.equal(rendered,0);assert.equal(errors,1);assert.deepEqual(cfg.population.geometry,before);assert.match(root.querySelector('[role="status"]').textContent,/元の人口分布図は表示できていません/);assert.equal(root.querySelector('[data-return]').hidden,false);
  root.querySelector('[data-population-geometry-retry]').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(requests,2);assert.equal(rendered,1);assert.equal(root.dataset.populationGeometryState,'ready');assert.deepEqual(cfg.population.geometry[0].rings,feature.rings);
 }finally{await window.happyDOM.close();}
});

test('Malformed, incomplete or mismatched boundaries never replace preserved page metadata',async()=>{
 const invalid=[{features:[]},{features:[{...feature,rings:[[[0,0],[1,0],[1,1],[0,1]]]}]},{features:[{...feature,id:'999'}]},{features:[{...feature,rings:[[[0,0],[1,0],[NaN,1],[0,0]]]}]}];
 for(const payload of invalid){const {window,root}=await page();try{const cfg=config(),before=structuredClone(cfg.population.geometry);window.fetch=async()=>({ok:true,json:async()=>payload});const result=await window.hydrateGeometry(root,undefined,{config:cfg});assert.equal(result.status,'error');assert.deepEqual(cfg.population.geometry,before);assert.equal(root.dataset.populationGeometryState,'error');}finally{await window.happyDOM.close();}}
});

test('Retry downloads the asset again when its CMA identifiers did not match the page metadata',async()=>{
 const {window,root}=await page();try{let requests=0;const cfg=config();window.fetch=async()=>{requests++;return {ok:true,json:async()=>({features:[requests===1?{...feature,id:'999'}:feature]})};};assert.equal((await window.hydrateGeometry(root,undefined,{config:cfg})).status,'error');root.querySelector('[data-population-geometry-retry]').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(requests,2);assert.equal(root.dataset.populationGeometryState,'ready');assert.deepEqual(cfg.population.geometry[0].rings,feature.rings);}finally{await window.happyDOM.close();}
});

test('Loader can parse the configured industry selector and refuses external boundary URLs',async()=>{
 const {window,root}=await page(undefined,'data-industry-config');try{let requests=0;window.fetch=async()=>{requests++;return {ok:true,json:async()=>({features:[feature]})};};const result=await window.hydrateGeometry(root,'[data-industry-config]');assert.equal(result.status,'ready');assert.deepEqual(result.config.population.geometry[0].rings,feature.rings);const cfg=config();cfg.population.geometryUrl='https://external.example/geometry.json';const rejected=await window.hydrateGeometry(root,'[data-industry-config]',{config:cfg});assert.equal(rejected.status,'error');assert.equal(requests,1);assert.match(rejected.error.message,/same origin/);}finally{await window.happyDOM.close();}
});
