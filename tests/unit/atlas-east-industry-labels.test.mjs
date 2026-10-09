import test from 'node:test';
import assert from 'node:assert/strict';
import {groupIndustrySites,layoutIndustryGroups,groupLeaderEnd} from '../../src/lib/atlas-east-industry-labels.ts';
import {eastClusters} from '../../src/data/atlas/east-asia-industry-clusters.ts';

test('overview grouping keeps all sites, avoids cross-country merges and coastal chains',()=>{
 const sites=[{id:'a',country:'A',anchor:{x:0,y:10}},{id:'b',country:'A',anchor:{x:20,y:10}},{id:'c',country:'A',anchor:{x:40,y:10}},{id:'foreign',country:'B',anchor:{x:1,y:10}}];
 const groups=groupIndustrySites(sites,400);
 assert.equal(groups.length,3);
 assert.deepEqual(groups.flatMap(g=>g.members.map(m=>m.id)).sort(),sites.map(s=>s.id).sort());
 for(const group of groups){assert.equal(new Set(group.members.map(s=>s.country)).size,1);for(const a of group.members)for(const b of group.members)assert(Math.hypot(a.anchor.x-b.anchor.x,a.anchor.y-b.anchor.y)<=30);}
});

// The approved whole-region Mercator frame, not the former 23-box packing.
const extent=[73.602256,15.776109,145.824962,53.567791];
const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
for(const width of [494,820])test(`initial ${width}px map fits every group with short geographic connections`,()=>{
 const [west,south,east,north]=extent,scale=(width-10)/(east-west),height=Math.ceil(scale*(merc(north)-merc(south))*180/Math.PI+10);
 const sites=eastClusters.map(c=>({id:c.id,country:c.country,anchor:{x:5+(c.point[0]-west)*scale,y:5+(merc(north)-merc(c.point[1]))*scale*180/Math.PI}}));
 const dimensions={toyota:[152,22],kitakyushu:[156,40],shanghai:[156,40],guangzhou:[54,22],wuhan:[54,22],tangshan:[42,22],ningde:[42,22],pyeongtaek:[156,58],hsinchu:[127,22]};
 const groups=groupIndustrySites(sites,width).map(group=>{const [w,h]=dimensions[group.members.find(m=>dimensions[m.id]).id];return {...group,width:w,height:h};});
 assert.equal(groups.length,9);assert.equal(groups.flatMap(g=>g.members).length,23);
 const placed=layoutIndustryGroups(groups,{left:0,top:0,right:width,bottom:height},[{left:width-65,top:0,right:width,bottom:150}]);
 assert.deepEqual(placed.map(g=>g.id).sort(),groups.map(g=>g.id).sort());
 for(const group of placed)for(const site of group.members){const end=groupLeaderEnd(site.anchor,group);assert(Math.hypot(site.anchor.x-end.x,site.anchor.y-end.y)<=66);}
});

test('an edge with no nearby room keeps the point available instead of pushing its label far away',()=>{
 const site={id:'edge',country:'A',anchor:{x:200,y:200}},group={id:'edge',members:[site],anchor:site.anchor,width:100,height:40};
 const result=layoutIndustryGroups([group],{left:0,top:0,right:500,bottom:500},[{left:90,top:90,right:310,bottom:310}]);
 assert.deepEqual(result,[]);assert.deepEqual(group.members,[site]);
});
