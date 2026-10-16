import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {build} from 'esbuild';

const compiled=await build({entryPoints:['src/scripts/atlas-east-asia-farm-foundations.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {renderEastAsiaFarmFoundations}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

test('built East farm markup accepts four selected supply references and removes them on overview/Japan without changing map markup',async()=>{
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),previous=globalThis.document;
 globalThis.document=window.document;
 try{
  window.document.write(await readFile('dist/atlas/asia/east-asia/agriculture/index.html','utf8'));
  const root=window.document.querySelector('[data-asia-atlas]'),map=root.querySelector('.asia-map-frame').outerHTML;
  for(const [code,topic,series] of [['CHN','rice','rice-milled-production'],['KOR','rice','rice-milled-production'],['KOR','maize','maize-production'],['CHN','cotton','cotton-lint-production']]){
   renderEastAsiaFarmFoundations(root,'east-asia',true,topic,{code,name:code});
   const matches=root.querySelectorAll('[data-east-supply-use-reference]');assert.equal(matches.length,1);
   assert.equal(matches[0].dataset.eastSupplyUseReference,series);assert.equal(matches[0].tagName,'DETAILS');assert.equal(matches[0].open,false);
   assert.ok(root.querySelector('[data-east-forest-flows]').contains(matches[0]));
   assert.equal(root.querySelector('.asia-map-frame').outerHTML,map);
   renderEastAsiaFarmFoundations(root,'east-asia',true,'overview',{code,name:code});assert.equal(root.querySelectorAll('[data-east-supply-use-reference]').length,0);
  }
  renderEastAsiaFarmFoundations(root,'east-asia',true,'rice',{code:'JPN',name:'日本'});assert.equal(root.querySelectorAll('[data-east-supply-use-reference]').length,0);
 }finally{globalThis.document=previous;await window.happyDOM.close();}
});
