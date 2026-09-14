import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containedMapBox,projectNatureFallback,unprojectNatureFallback,layoutNatureLabels,boxesOverlap,leaderEnd} from '../../src/lib/atlas-nature-labels.ts';
const cities=JSON.parse(readFileSync('public/assets/atlas/nature-v1/climate-cities.json'));
const landforms=[['ロッキー山脈',[-109,42]],['アパラチア山脈',[-81,37]],['カスケード山脈',[-121,45.5]],['シエラネバダ山脈',[-119,37]],['コロラド高原',[-110.5,36]],['グレートベースン',[-116.4,39]],['グレートプレーンズ',[-101,40]],['中央低地',[-91,42]],['大西洋岸平野',[-79,34]]];
const cityInputs=cities.map(c=>[c.nameJa,[c.longitude,c.latitude]]);
function verify(inputs,placed,bounds,obstacles){
 assert.equal(placed.length,inputs.length,'names must not be thinned');
 for(const p of placed){
  assert.deepEqual(p.anchor,inputs.find(item=>item.id===p.id).anchor,'source coordinate must not move');
  assert.ok(p.left>=bounds.left&&p.top>=bounds.top&&p.right<=bounds.right&&p.bottom<=bounds.bottom,'label in view: '+p.id);
  for(const other of placed)if(other.id!==p.id)assert.equal(boxesOverlap(p,other,0),false,`${p.id} overlaps ${other.id}`);
  for(const other of obstacles)assert.equal(boxesOverlap(p,other,0),false,`${p.id} covers map control`);
 }
}
test('四つの端末幅に相当する全国表示で12都市・9地形を間引かず、名前同士・操作と重ねない',()=>{
 // The page has a reading column at desktop widths; test actual map-width ranges.
 for(const [width,aspect,labelHeight] of [[358,1.5,24],[788,1.5,24],[742,1.65,44],[820,1.65,44]])for(const fallback of [false,true])for(const entries of [cityInputs,landforms]){
  const height=width/aspect,bounds=fallback?containedMapBox({left:0,top:0,right:width,bottom:height-40}):{left:0,top:0,right:width,bottom:height};
  const obstacles=fallback?[]:[{left:width-57,top:10,right:width-9,bottom:152},{left:9,top:height-28,right:290,bottom:height-6}];
  const inputs=entries.map(([id,coordinate])=>({id,anchor:projectNatureFallback(coordinate,bounds),width:[...id].reduce((n,c)=>n+(/[A-Za-z.]/.test(c)?7:12),14),height:labelHeight}));
  verify(inputs,layoutNatureLabels(inputs,bounds,obstacles),bounds,obstacles);
 }
});
test('中央の混雑と画面端で名前を残し、画面外の地点だけを除く',()=>{
 const bounds={left:0,top:0,right:358,bottom:260};
 const inputs=cityInputs.map(([id],i)=>({id,anchor:{x:160+(i%4)*6,y:90+Math.floor(i/4)*8},width:100,height:24}));
 verify(inputs,layoutNatureLabels(inputs,bounds),bounds,[]);
 const edge=[{id:'edge',anchor:{x:0,y:0},width:70,height:24},{id:'outside',anchor:{x:-1,y:80},width:70,height:24}];
 const placed=layoutNatureLabels(edge,bounds);assert.deepEqual(placed.map(x=>x.id),['edge']);assert.deepEqual(leaderEnd(placed[0].anchor,placed[0]),{x:placed[0].left,y:placed[0].top});
});
test('代替図の余白を除いて座標を往復し、海岸の分類位置をずらさない',()=>{
 const bounds=containedMapBox({left:10,top:15,right:410,bottom:415});
 assert.equal(bounds.right-bounds.left,400);assert.ok(bounds.top>15);
 for(const [,coordinate] of [...cityInputs,...landforms]){
  const p=projectNatureFallback(coordinate,bounds),back=unprojectNatureFallback(p,bounds);
  assert.ok(Math.abs(back[0]-coordinate[0])<1e-10);assert.ok(Math.abs(back[1]-coordinate[1])<1e-10);
 }
 assert.equal(unprojectNatureFallback({x:20,y:20},bounds),null);
 assert.equal(unprojectNatureFallback({x:0,y:0},{left:0,right:0,top:0,bottom:0}),null);
});
