import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutEuropeIndustryLabels,europeIndustryLabelClusters,europeIndustryMapLabel} from '../../src/lib/atlas-europe-industry-labels.ts';
import {europeIndustryGroupsForSite} from '../../src/lib/atlas-europe-industry.ts';
import {europeReadings} from '../../src/data/atlas/europe/readings.ts';
import {boxesOverlap,leaderEnd} from '../../src/lib/atlas-nature-labels.ts';

test('industry names stay beside their real anchor; crowding omits names instead of drawing long leaders',()=>{
 const bounds={left:0,top:0,right:300,bottom:200};
 const inputs=[{id:'a',anchor:{x:80,y:80},width:75,height:20},{id:'b',anchor:{x:85,y:85},width:80,height:20},{id:'c',anchor:{x:280,y:190},width:250,height:80}];
 const result=layoutEuropeIndustryLabels(inputs,inputs,bounds);
 assert.ok(result.length>0);
 for(const [i,label]of result.entries()){
  assert.ok(label.left>=0&&label.right<=300&&label.top>=0&&label.bottom<=200);
  const end=leaderEnd(label.anchor,label);assert.ok(Math.hypot(end.x-label.anchor.x,end.y-label.anchor.y)<=24);
  for(const other of result.slice(i+1))assert.equal(boxesOverlap(label,other,2),false);
 }
 assert.deepEqual(result,layoutEuropeIndustryLabels(inputs,inputs,bounds),'layout has no selection-dependent priority');
 assert.deepEqual(layoutEuropeIndustryLabels([{id:'blocked',anchor:{x:150,y:100},width:70,height:20}],[],bounds,[{left:120,top:70,right:180,bottom:130}]),[],'free space far away is not used');
 assert.deepEqual(layoutEuropeIndustryLabels([{id:'large',anchor:{x:150,y:100},width:400,height:20}],[],bounds),[]);
});
test('shared names refer to confirmed nearby sites in the same industry and keep each source location',()=>{
 for(const [sector,clusters]of Object.entries(europeIndustryLabelClusters))for(const [representative,members]of Object.entries(clusters)){
  assert.ok(members.includes(representative));assert.ok(members.length>1);
  const sites=members.map(id=>europeReadings.find(site=>site.id===id));assert.ok(sites.every(Boolean));
  const groups=europeIndustryGroupsForSite(representative,sector);
  assert.ok(groups.some(group=>members.every(id=>europeIndustryGroupsForSite(id,sector).includes(group))));
  for(const site of sites)assert.ok(Math.hypot(site.coordinates[0]-sites[0].coordinates[0],site.coordinates[1]-sites[0].coordinates[1])<2,'shared names stay local');
 }
});
test('manufacturing and service names describe only the selected function at multi-purpose places',()=>{
 assert.equal(europeIndustryMapLabel('hamburg','manufacturing').title,'航空機');
 assert.equal(europeIndustryMapLabel('hamburg','services').title,'港湾');
 assert.equal(europeIndustryMapLabel('rotterdam','manufacturing').title,'化学');
 assert.equal(europeIndustryMapLabel('rotterdam','services').title,'港湾');
 assert.equal(europeIndustryMapLabel('oulu','manufacturing').title,'通信機器');
 assert.equal(europeIndustryMapLabel('oulu','services').title,'IT研究');
});
