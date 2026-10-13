import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPaintDifference,labelInk} from '../browser/helpers/atlas-map-paint-review.mjs';
const image=()=>{const data=new Uint8Array(40*30*4);for(let i=0;i<data.length;i+=4)data.set([230,238,240,255],i);return {width:40,height:30,data};};
const patch=(im,box,color)=>{for(let y=box.top;y<box.bottom;y++)for(let x=box.left;x<box.right;x++)im.data.set([...color,255],(y*im.width+x)*4);return im;};
test('paint review detects a stable blank patch and tolerates only adjacent-pixel edge shifts',()=>{
 const before=patch(image(),{left:4,top:4,right:15,bottom:25},[225,228,219]);
 const shifted=patch(image(),{left:5,top:4,right:16,bottom:25},[225,228,219]);
 assert.equal(mapPaintDifference(before,shifted).fraction,0);
 const missing=patch(shifted,{left:20,top:8,right:35,bottom:22},[255,255,255]);
 assert.ok(mapPaintDifference(before,missing).fraction>.1);
 assert.equal(mapPaintDifference(before,missing,[{left:19,top:7,right:36,bottom:23}]).fraction,0,'a declared overlay is excluded from geographic paint only');
});
test('label ink review detects missing text independently of the geographic paint masks',()=>{
 const box={left:5,top:5,right:25,bottom:20},label=patch(image(),{left:8,top:8,right:12,bottom:15},[35,50,60]);
 assert.equal(labelInk(label,box).dark,28);
 assert.equal(labelInk(image(),box).dark,0);
});
