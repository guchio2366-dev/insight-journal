import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutJapanLabels,japanLabelMaxLeader} from '../../src/lib/atlas-japan-label-layout.ts';
const sites=[['toyota',137.15,35.08,76,[34,-39]],['kitakyushu',130.85,33.88,56,[-145,-40]],['kumamoto',130.83,32.87,98,[28,30]],['osaka',135.5,34.69,76,[-132,-26]],['imabari',133,34.07,86,[-108,20]],['nagasaki',129.87,32.75,50,[-98,42]],['yokkaichi',136.62,34.97,74,[-125,-62]]];
const mercator=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
function anchors(width,height,mainland=false){const west=mainland?129.35:122.5,east=mainland?145.9:146.3,north=mercator(mainland?45.6:46),south=mercator(mainland?30.75:23.8),scale=Math.min((width-16)/(east-west),(height-16)/(north-south)*Math.PI/180);return sites.map(([id,lng,lat,w,offset])=>({id,x:width/2+(lng-(west+east)/2)*scale,y:height/2+((north+south)/2-mercator(lat))*scale*180/Math.PI,width:w,height:40,offset}));}
for(const [width,height] of [[836,520],[528,388],[528,340],[322,520]])test(`全国表示 ${width}×${height} は7産業のラベルを地点近くに配置する`,()=>{
 const points=anchors(width,height),rects=layoutJapanLabels(points,width,height);assert.equal(rects.size,7);
 for(const p of points){const r=rects.get(p.id);assert(r.leaderLength>=7&&r.leaderLength<=japanLabelMaxLeader,p.id);assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);for(const other of rects.values())if(other!==r)assert(r.x+r.width+3<=other.x||other.x+other.width+3<=r.x||r.y+r.height+3<=other.y||other.y+other.height+3<=r.y,`${p.id}/${other.id}`);}
 const p=points.find(p=>p.id==='yokkaichi'),r=rects.get(p.id);assert(Math.abs((r.y+r.height/2)-p.y)<japanLabelMaxLeader+40,'四日市を沖縄付近へ送らない');
});
test('画面外の地点にラベルを置かず、狭すぎる枠で長い引出線を作らない',()=>{
 assert.equal(layoutJapanLabels([{id:'off',x:-10,y:40,width:70,height:40,offset:[10,10]}],200,200).size,0);
 assert.equal(layoutJapanLabels(anchors(70,70),70,70).size,0);
});

for(const [width,height] of [[500,568],[383,435]])test(`北海道〜九州 ${width}×${height} も7産業を短い線で表示する`,()=>{const points=anchors(width,height,true),rects=layoutJapanLabels(points,width,height);assert.equal(rects.size,7);for(const r of rects.values())assert(r.leaderLength<=64);});
