import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseCardPlacement } from '../../src/lib/atlas-card-placement.ts';

test('説明カードを選択域と操作部に重ならない候補へ置く',()=>{
 const placed=chooseCardPlacement({width:800,height:480},{width:300,height:120},[
  {left:340,top:140,right:650,bottom:390},
  {left:730,top:0,right:800,bottom:150}
 ]);
 assert.ok(placed);assert.equal(placed.id,'top-left');assert.equal(placed.score,0);
});

test('どの候補も選択域を覆うときは地図直下へ退避する',()=>{
 const placed=chooseCardPlacement({width:360,height:240},{width:280,height:115},[
  {left:0,top:0,right:360,bottom:240}
 ]);
 assert.equal(placed,null);
});

test('画面より大きいカードを地図内へ無理に押し込まない',()=>{
 assert.equal(chooseCardPlacement({width:260,height:180},{width:280,height:110},[]),null);
});
