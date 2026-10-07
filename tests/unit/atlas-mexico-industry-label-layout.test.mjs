import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutMexicoIndustryLabels} from '../../src/lib/atlas-mexico-industry-label-layout.ts';

// National-frame state anchors, including two distinct readings at Mexico City.
const examples=[['05',450,198,98],['11',477,379,112],['08',338,153,84],['14',408,388,84],['26',231,122,56],['32',433,311,84],['09-services',528,425,140],['23',825,399,98],['09-building',528,425,210],['15',514,423,210]];
const intersects=(a,b)=>a.left<b.left+b.width&&a.left+a.width>b.left&&a.top<b.top+b.height&&a.top+a.height>b.top;

test('Industry keeps every reading and both Mexico City topics legible at desktop map widths',()=>{
 for(const width of [900,740,620]){
  const scale=width/900,frame={width,height:580*scale},labels=examples.map(([id,x,y,w])=>({id,x:x*scale,y:y*scale,width:w,height:34}));
  const positions=layoutMexicoIndustryLabels(labels,frame);
  assert.equal(positions.length,labels.length);assert.deepEqual(new Set(positions.map(p=>p.id)),new Set(labels.map(p=>p.id)));
  for(const [i,placed] of positions.entries()){
   assert.ok(placed.left>=0&&placed.top>=0&&placed.left+placed.width<=frame.width&&placed.top+placed.height<=frame.height,`${width}px: ${placed.id} stays in the map`);
   for(const other of positions.slice(i+1))assert.equal(intersects(placed,other),false,`${width}px: ${placed.id} and ${other.id} do not overlap`);
   const original=labels.find(l=>l.id===placed.id);assert.equal(placed.x,original.x);assert.equal(placed.y,original.y);
  }
  assert.deepEqual(layoutMexicoIndustryLabels([...labels].reverse(),frame),positions,'Input order cannot cause label movement');
 }
});

test('Narrow map frames reserve room for the long construction topics without dropping labels',()=>{
 for(const width of [358,390]){
  const scale=width/900,frame={width,height:580*scale};
  // Conservative Japanese text widths, and the full two-line font box measured in Chromium.
  const labels=examples.map(([id,x,y,w])=>({id,x:x*scale,y:y*scale,width:w*.8,height:37.2}));
  const positions=layoutMexicoIndustryLabels(labels,frame);
  assert.equal(positions.length,10);
  for(const [i,placed] of positions.entries()){
   assert(placed.left>=0&&placed.top>=0&&placed.left+placed.width<=frame.width&&placed.top+placed.height<=frame.height);
   for(const other of positions.slice(i+1))assert.equal(intersects(placed,other),false,`${width}px: ${placed.id} overlaps ${other.id}`);
  }
 }
});
