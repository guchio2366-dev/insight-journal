import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const workspace=await readFile('src/components/atlas/MexicoWorkspace.astro','utf8');
const adapter=workspace.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const initialIntent=workspace.match(/<script is:inline>\s*([\s\S]*?)<\/script>/)[1].replace('document.currentScript?.parentElement',"document.querySelector('[data-mexico-workspace]')");
const modules={name:'mexico-reading-local-modules',setup(builder){
 builder.onResolve({filter:/^\./},args=>{const resolved=path.resolve(args.resolveDir,args.path);return {path:path.extname(resolved)?resolved:['.ts','.mjs','.json','.js'].map(ext=>resolved+ext).find(existsSync)};});
 builder.onLoad({filter:/\.(ts|mjs|json)$/},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':args.path.endsWith('.ts')?'ts':'js',resolveDir:path.dirname(args.path)}));
}};
const imports=`import {initMexicoAgriculture} from './src/scripts/atlas-mexico-agriculture.ts';
import {initMexicoNature} from './src/scripts/atlas-mexico-nature.ts';
import {initMexicoIndustry} from './src/scripts/atlas-mexico-industry.ts';
import {initMexicoPopulation} from './src/scripts/atlas-mexico-population.ts';
const initializeNative=()=>{const root=document.querySelector('[data-mexico-workspace]');({agriculture:initMexicoAgriculture,nature:initMexicoNature,industry:initMexicoIndustry,population:initMexicoPopulation})[root.dataset.mexicoField](root);};`;
const codes={};
for(const nativeFirst of [false,true]){
 const result=await build({stdin:{contents:`${imports}\n${initialIntent}\n${nativeFirst?'initializeNative();':''}\n${adapter}\n${nativeFirst?'':'initializeNative();'}`,resolveDir:process.cwd(),sourcefile:'mexico-reading-entry.ts',loader:'ts'},absWorkingDir:process.cwd(),tsconfigRaw:{},plugins:[modules],bundle:true,format:'iife',platform:'browser',write:false});
 codes[String(nativeFirst)]=result.outputFiles[0].text;
}
const fields={
 agriculture:{select:'[data-agriculture-state]',state:'08',shape:'path[data-agriculture-state-code="08"]'},
 nature:{select:'[data-mexico-nature-state-select]',state:'26',shape:'path[data-mexico-nature-state="26"]'},
 industry:{select:'[data-mi-state-select]',state:'14',shape:'[data-mi-map="primary"] [data-mi-shape="14"]'},
 population:{select:'[data-population-state]',state:'19',shape:'[data-population-state-shape="19"]'},
};
async function page(field,search='',nativeFirst=false,listenerCheckpoints=false){
 const window=new Window({url:`https://example.com/insight-journal/atlas/north-america/mexico/${field}/${search}`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
 window.document.write((await readFile(`dist/atlas/north-america/mexico/${field}/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,''));
 if(listenerCheckpoints){
  // Trusted browser dispatch can perform a microtask checkpoint between root
  // listeners. Happy DOM dispatch is synchronous, so model those boundaries.
  const root=window.document.querySelector('[data-mexico-workspace]'),pending=[];
  const addListener=root.addEventListener.bind(root);
  window.queueMicrotask=callback=>pending.push(callback);
  root.addEventListener=(type,listener,options)=>addListener(type,function(event){
   if(typeof listener==='function')listener.call(this,event);else listener.handleEvent(event);
   while(pending.length)pending.shift()();
  },options);
 }
 window.eval(codes[String(nativeFirst)]);
 await window.happyDOM.waitUntilComplete();
 return window;
}
const query=window=>new URL(window.location.href).searchParams;
function assertMode(window,selected){
 const root=window.document.querySelector('[data-mexico-workspace]');
 assert.equal(root.dataset.mexicoReadingSelected,String(selected));
 assert.equal(query(window).get('reading'),selected?'item':'overview');
 assert.equal(root.querySelector('[data-mexico-country-overview]').hidden,selected);
 assert.equal(root.querySelector('[data-mexico-overview-button]').hidden,!selected);
}
async function selectState(window,field){
 const select=window.document.querySelector(fields[field].select);select.value=fields[field].state;select.dispatchEvent(new window.Event('change',{bubbles:true}));
 await window.happyDOM.waitUntilComplete();
 assertMode(window,true);
 assert.equal(query(window).get('state'),fields[field].state);
 assert.equal(window.document.querySelector(fields[field].shape).getAttribute('aria-pressed'),'true');
}

for(const field of Object.keys(fields)){
 test(`${field}: native normalization keeps overview across reload in either initialization order`,async()=>{
  for(const nativeFirst of [false,true]){
   const window=await page(field,'',nativeFirst);let reload;
   try{assertMode(window,false);reload=await page(field,window.location.search,!nativeFirst);assertMode(reload,false);}
   finally{if(reload)await reload.happyDOM.close();await window.happyDOM.close();}
  }
 });
 test(`${field}: actual state selection, Return, reload and browser history preserve reading intent`,async()=>{
  const window=await page(field);let reload;
  try{
   await selectState(window,field);
   window.history.back();await window.happyDOM.waitUntilComplete();assertMode(window,false);
   window.history.forward();await window.happyDOM.waitUntilComplete();assertMode(window,true);assert.equal(query(window).get('state'),fields[field].state);
   window.document.querySelector('[data-mexico-overview-button]').click();await window.happyDOM.waitUntilComplete();assertMode(window,false);assert.equal(query(window).get('state'),fields[field].state);
   reload=await page(field,window.location.search,true);assertMode(reload,false);
   await selectState(reload,field);
   window.history.back();await window.happyDOM.waitUntilComplete();assertMode(window,true);assert.equal(query(window).get('state'),fields[field].state);
   window.history.forward();await window.happyDOM.waitUntilComplete();assertMode(window,false);
  }finally{if(reload)await reload.happyDOM.close();await window.happyDOM.close();}
 });
 test(`${field}: an explicit state deep link opens the item while overview marker takes precedence`,async()=>{
  const selected=await page(field,`?state=${fields[field].state}`,true),overview=await page(field,`?state=${fields[field].state}&reading=overview`,true);
  try{assertMode(selected,true);assertMode(overview,false);assert.equal(query(overview).get('state'),fields[field].state);}
  finally{await selected.happyDOM.close();await overview.happyDOM.close();}
 });
}

test('Industry metric buttons and named comparison links carry item intent after native render and country Return',async()=>{
 const window=await page('industry');let destination,reload;
 try{
  const button=window.document.querySelector('[data-mi-metric-button="electronics"]');assert.ok(button,'The real industry item button must exist');button.click();await window.happyDOM.waitUntilComplete();
  assertMode(window,true);assert.equal(query(window).get('metric'),'electronics');
  let target=new URL(window.document.querySelector('[data-mi-population-link]').href);assert.equal(target.searchParams.get('reading'),'item');
  window.document.querySelector('[data-mexico-overview-button]').click();await window.happyDOM.waitUntilComplete();assertMode(window,false);
  target=new URL(window.document.querySelector('[data-mi-population-link]').href);assert.equal(target.searchParams.get('reading'),'item');
  destination=await page('industry',target.search,true);assertMode(destination,true);assert.equal(query(destination).get('compare'),'population');
  destination.document.querySelector('[data-mexico-overview-button]').click();await destination.happyDOM.waitUntilComplete();assertMode(destination,false);assert.equal(query(destination).get('compare'),'population');
  reload=await page('industry',destination.location.search);assertMode(reload,false);assert.equal(query(reload).get('compare'),'population');
 }finally{if(reload)await reload.happyDOM.close();if(destination)await destination.happyDOM.close();await window.happyDOM.close();}
});

test('Nature and population named comparison entrances preserve item intent independently of saved overview controls',async()=>{
 const nature=await page('nature'),population=await page('population');let destination,reload;
 try{
  await selectState(nature,'nature');const target=new URL(nature.document.querySelector('[data-mexico-nature-compare-link="irrigation"]').href);assert.equal(target.searchParams.get('reading'),'item');
  destination=await page('nature',target.search,true);assertMode(destination,true);assert.equal(query(destination).get('compare'),'irrigation');
  destination.document.querySelector('[data-mexico-overview-button]').click();await destination.happyDOM.waitUntilComplete();assertMode(destination,false);assert.equal(query(destination).get('compare'),'irrigation');
  reload=await page('nature',destination.location.search);assertMode(reload,false);
  assert.equal(new URL(population.document.querySelector('[data-population-scale-link]').href).searchParams.get('reading'),'item');
  population.document.querySelector('[data-population-scale-link]').click();await population.happyDOM.waitUntilComplete();assertMode(population,true);assert.equal(query(population).get('compare'),'scale');
 }finally{if(reload)await reload.happyDOM.close();if(destination)await destination.happyDOM.close();await nature.happyDOM.close();await population.happyDOM.close();}
});

test('Space on native focus checkboxes waits for change and creates one selected history entry',async()=>{
 for(const [field,selector] of [['industry','[data-mi-only]'],['population','[data-population-only]']]){
  const window=await page(field);
  try{
   const control=window.document.querySelector(selector);
   control.dispatchEvent(new window.KeyboardEvent('keydown',{key:' ',bubbles:true}));
   await window.happyDOM.waitUntilComplete();assertMode(window,false);
   control.checked=true;control.dispatchEvent(new window.Event('change',{bubbles:true}));
   await window.happyDOM.waitUntilComplete();assertMode(window,true);assert.equal(query(window).get('only'),'1');
   window.history.back();await window.happyDOM.waitUntilComplete();assertMode(window,false);assert.equal(control.checked,false);
  }finally{await window.happyDOM.close();}
 }
});

test('A native checkbox click checkpoint stays overview until its separate change activation',async()=>{
 for(const [field,selector] of [['industry','[data-mi-only]'],['population','[data-population-only]']]){
  const window=await page(field);
  try{
   const control=window.document.querySelector(selector),initialLength=window.history.length;
   // Dispatch the click phase without Happy DOM's synchronous MouseEvent default
   // action, then expose the checkpoint before the native checkbox change.
   const click=new window.Event('click',{bubbles:true});Object.defineProperty(click,'button',{value:0});
   control.dispatchEvent(click);await window.happyDOM.waitUntilComplete();
   assertMode(window,false);assert.equal(window.history.length,initialLength);
   control.checked=true;control.dispatchEvent(new window.Event('change',{bubbles:true}));
   await window.happyDOM.waitUntilComplete();assertMode(window,true);assert.equal(query(window).get('only'),'1');
   assert.equal(window.history.length,initialLength+1);
   window.history.back();await window.happyDOM.waitUntilComplete();assertMode(window,false);assert.equal(control.checked,false);
  }finally{await window.happyDOM.close();}
 }
});

test('Adapter-first map choice waits through trusted listener checkpoints and needs one Back',async()=>{
 const window=await page('industry','',false,true);
 try{
  const initialLength=window.history.length;
  window.document.querySelector(fields.industry.shape).dispatchEvent(new window.MouseEvent('click',{bubbles:true,button:0}));
  await window.happyDOM.waitUntilComplete();assertMode(window,true);assert.equal(query(window).get('state'),fields.industry.state);
  assert.equal(window.history.length,initialLength+1);
  window.history.back();await window.happyDOM.waitUntilComplete();assertMode(window,false);
 }finally{await window.happyDOM.close();}
});
