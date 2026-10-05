import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

const parity=await readFile('src/styles/atlas-mexico-parity.css','utf8');
const industry=await readFile('src/styles/atlas-mexico-industry.css','utf8');

async function declarations(width,field,styles){
 const w=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 try{
  w.happyDOM.setWindowSize({width,height:665});
  w.document.write(`<html><head></head><body><div class="atlas-desktop-shell"><article class="atlas-explorer mexico-workspace ${field==='industry'?'mexico-industry':''}" data-field="${field}"><div class="atlas-primary-grid mexico-primary-grid"><div class="mexico-map-column"><div class="mexico-map-frame"><svg class="mi-map mexico-map" data-mexico-map></svg></div></div><aside class="mexico-reading"></aside></div></article></div></body></html>`);
  for(const css of styles){const sheet=w.document.createElement('style');sheet.textContent=css;w.document.head.append(sheet);}
  const frame=w.getComputedStyle(w.document.querySelector('.mexico-map-frame'));
  const grid=w.getComputedStyle(w.document.querySelector('.mexico-primary-grid'));
  return {height:frame.height,minHeight:frame.minHeight,maxHeight:frame.maxHeight,aspectRatio:frame.aspectRatio,columns:grid.gridTemplateColumns};
 }finally{await w.happyDOM.close();}
}

test('Mexico industry retains its 620px frame and 7:3 columns against parity CSS in either load order',async()=>{
 for(const width of [1280,1024])for(const styles of [[industry,parity],[parity,industry]]){
  const actual=await declarations(width,'industry',styles);
  assert.equal(actual.height,'620px',`height at ${width}px`);
  assert.equal(actual.minHeight,'620px',`minimum at ${width}px`);
  assert.equal(actual.maxHeight,'620px',`maximum at ${width}px`);
  assert.equal(actual.aspectRatio,'auto',`aspect ratio at ${width}px`);
  assert.match(actual.columns,/^minmax\(0(?:px)?,\s*7fr\)\s+minmax\(290px,\s*3fr\)$/);
 }
});

test('Industry frame overrides leave other Mexico fields and mobile parity declarations unchanged',async()=>{
 for(const width of [1280,1024])for(const field of ['natural','agriculture','population']){
  const expected=await declarations(width,field,[parity]);
  for(const styles of [[industry,parity],[parity,industry]])assert.deepEqual(await declarations(width,field,styles),expected);
 }
 const expected=await declarations(800,'industry',[parity]);
 for(const styles of [[industry,parity],[parity,industry]])assert.deepEqual(await declarations(800,'industry',styles),expected);
});
