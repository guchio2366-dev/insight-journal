import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

const parity=await readFile('src/styles/atlas-mexico-parity.css','utf8');
const industry=await readFile('src/styles/atlas-mexico-industry.css','utf8');

async function declarations(width,field,styles,comparison=false){
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 try{
  w.happyDOM.setViewport({width,height:665});
  assert.equal(w.matchMedia('(min-width:960px)').matches,width>=960);
  w.document.write(`<html><head></head><body><div class="atlas-desktop-shell"><article class="atlas-explorer mexico-workspace ${field==='industry'?'mexico-industry':''} ${comparison?'is-comparison':''}" data-field="${field}"><div class="atlas-primary-grid mexico-primary-grid"><div class="mexico-map-column"><div class="mexico-map-frame"><svg class="mi-map mexico-map" data-mexico-map></svg></div></div><aside class="mexico-reading"></aside></div></article></div></body></html>`);
  for(const css of styles){
   const sheet=w.document.createElement('style');
   // Happy DOM 20.14.5 splits at-rule names on a literal space and drops
   // valid compressed @media(...) rules. Add only equivalent whitespace;
   // retain the original conditions, selectors and declaration values.
   sheet.textContent=css.replace(/@media(?=\()/g,'@media ');w.document.head.append(sheet);
   const mediaCount=rules=>[...rules].reduce((count,rule)=>count+(rule.type===4?1:0)+(rule.cssRules?mediaCount(rule.cssRules):0),0);
   assert.equal(mediaCount(sheet.sheet.cssRules),(css.replace(/\/\*[\s\S]*?\*\//g,'').match(/@media\b/g)||[]).length,'Every source media rule must reach the cascade');
  }
  const frame=w.getComputedStyle(w.document.querySelector('.mexico-map-frame'));
  const grid=w.getComputedStyle(w.document.querySelector('.mexico-primary-grid'));
  return {height:frame.height,minHeight:frame.minHeight,maxHeight:frame.maxHeight,aspectRatio:frame.aspectRatio,columns:grid.gridTemplateColumns};
 }finally{await w.happyDOM.close();}
}

test('Mexico industry matches the shared map frame and matches the US desktop columns against either CSS load order',async()=>{
 for(const width of [1600,1280,1024])for(const styles of [[industry,parity],[parity,industry]]){
  const actual=await declarations(width,'industry',styles);
  assert.equal(actual.height,'auto',`height at ${width}px`);
  assert.equal(actual.minHeight,'300px',`minimum at ${width}px`);
  assert.equal(actual.maxHeight,'640px',`maximum at ${width}px`);
  assert.match(actual.aspectRatio,/^1\.55(?:\s*\/\s*1)?$/,`aspect ratio at ${width}px`);
  assert.match(actual.columns,width>=1600?/^minmax\(0(?:px)?,\s*1\.8fr\)\s+minmax\(280px,\s*1fr\)$/:width>=1200?/^minmax\(0(?:px)?,\s*1\.65fr\)\s+minmax\(320px,\s*1fr\)$/:/^minmax\(0(?:px)?,\s*7fr\)\s+minmax\(290px,\s*3fr\)$/);
 }
});

test('Paired industry maps use their native aspect ratio instead of centering a small map inside the single-map frame',async()=>{
 for(const width of [1024,1280,1600])for(const styles of [[industry,parity],[parity,industry]]){
  const normal=await declarations(width,'industry',styles),paired=await declarations(width,'industry',styles,true);
  assert.equal(normal.height,'auto');assert.equal(paired.height,'auto');
  assert.match(paired.minHeight,/^0(?:px)?$/);assert.equal(paired.maxHeight,'none');
  assert.match(paired.aspectRatio,/^900\s*\/\s*580$/);assert.equal(paired.columns,normal.columns);
 }
});

test('Industry frame overrides leave other Mexico fields and mobile parity declarations unchanged',async()=>{
 for(const width of [1280,1024])for(const field of ['natural','agriculture','population']){
  const expected=await declarations(width,field,[parity]);
  assert.notEqual(expected.minHeight,'');assert.notEqual(expected.columns,'');
  for(const styles of [[industry,parity],[parity,industry]])assert.deepEqual(await declarations(width,field,styles),expected);
 }
 const expected=await declarations(800,'industry',[parity]);
 assert.notEqual(expected.minHeight,'');assert.notEqual(expected.columns,'');
 for(const styles of [[industry,parity],[parity,industry]])assert.deepEqual(await declarations(800,'industry',styles),expected);
});
