import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/scripts/atlas-regional-forestry.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {regionalForestryViewportBudget:budget}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const narrow={region:'africa',viewportWidth:1024,viewportHeight:768,scrollY:0,stageViewportTop:302,legendOuterHeight:42,readerViewportTop:266};

test('Africa narrow PC budgets the entire map and wrapped legend before the viewport edge',()=>{
 const result=budget(narrow);
 assert.equal(result.mapHeight,412);assert.equal(result.readerHeight,490);assert.equal(result.insufficient,false);
 assert.equal(narrow.stageViewportTop+result.mapHeight+narrow.legendOuterHeight,768-12);
 const expandedHeader=budget({...narrow,stageViewportTop:346,readerViewportTop:310});
 assert.equal(expandedHeader.mapHeight,result.mapHeight-44);assert.equal(expandedHeader.readerHeight,result.readerHeight-44);
 assert.equal(budget({...narrow,legendOuterHeight:66}).mapHeight,result.mapHeight-24);
});
test('page scrolling leaves document-based Africa map and reader sizes unchanged',()=>{
 assert.deepEqual(budget({...narrow,scrollY:180,stageViewportTop:narrow.stageViewportTop-180,readerViewportTop:narrow.readerViewportTop-180}),budget(narrow));
});
test('the main PC view can use 720 pixels while an impossible minimum remains explicit',()=>{
 assert.equal(budget({...narrow,viewportWidth:1920,viewportHeight:1080,stageViewportTop:280}).mapHeight,720);
 const impossible=budget({...narrow,stageViewportTop:430});
 assert.equal(impossible.mapHeight,320);assert.equal(impossible.insufficient,true);
 assert.ok(430+impossible.mapHeight+narrow.legendOuterHeight>768-12,'the minimum is not reported as fitting');
});
test('other regional controllers and non-PC Africa receive no size override',()=>{
 for(const region of ['russia','oceania','latin-america'])assert.equal(budget({...narrow,region}),null);
 assert.equal(budget({...narrow,viewportWidth:959}),null);
});
