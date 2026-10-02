import test from 'node:test';
import assert from 'node:assert/strict';
import {readCanadaNaturalLayerState,writeCanadaNaturalLayerState} from '../../src/lib/atlas-canada-natural-state.ts';
import {readCanadaNatureState} from '../../src/lib/atlas-canada-nature.ts';
test('classification and elevation retain independent selected groups, cameras, and the original comparison return',()=>{
 const url=new URL('https://example.com/nature/?city=regina&view=elevation&cropReturn=kept&zone=Dfb&zoneOnly=1&zoneBounds=-130,40,-60,80');
 const initial=readCanadaNaturalLayerState(url,'climate',['Dfb','ET']);
 const next=writeCanadaNaturalLayerState(url,'elevation',{selected:'2000',only:true,bounds:[-125,45,-110,60]});
 assert.equal(next.searchParams.get('cropReturn'),'kept');
 assert.deepEqual(readCanadaNaturalLayerState(next,'climate',['Dfb','ET']),initial);
 assert.deepEqual(readCanadaNaturalLayerState(next,'elevation',['500','2000']),{selected:'2000',only:true,bounds:[-125,45,-110,60]});
 assert.equal(readCanadaNatureState(next,['ottawa','regina'],[]).view,'elevation');
});
test('unknown groups, blank camera parts, unordered and out-of-world geographic bounds are rejected',()=>{
 for(const value of [',40,-60,80','-130, ,-60,80','-130,40,-60,','-60,40,-130,80','-190,40,-60,80']){
  const u=new URL('https://example.com/?zone=unknown&zoneOnly=1');u.searchParams.set('zoneBounds',value);
  assert.deepEqual(readCanadaNaturalLayerState(u,'climate',['Dfb']),{selected:null,only:false,bounds:null});
 }
 const u=new URL('https://example.com/?elevation=500&elevationBounds=0,0,10,10');
 assert.deepEqual(readCanadaNaturalLayerState(u,'elevation',['500']),{selected:'500',only:false,bounds:[0,0,10,10]});
});
