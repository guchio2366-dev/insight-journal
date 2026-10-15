import test from 'node:test';
import assert from 'node:assert/strict';
import {groupEastIndustryAnnotations,placeEastIndustryAnnotations,eastAnnotationLimit,eastAnnotationKindLabel} from '../../src/lib/atlas-east-industry-annotations.ts';
import {eastSectorIndustries,eastSectorRows} from '../../src/data/atlas/east-asia-industry-sectors.ts';
import {boxesOverlap,leaderEnd} from '../../src/lib/atlas-nature-labels.ts';

const site=(id,x,lon,country='JPN',industries=['foundry'])=>({id,name:id,country,industries,point:[lon,35],screen:{x,y:150},stage:'製造',scope:'案内点',source:'https://example.com'});
test('labels group only close same-industry same-country sites and never chain across a region',()=>{
 const input=[site('a',100,130),site('b',120,130.7),site('c',140,131.4),site('other-country',105,130,'KOR'),site('other-industry',101,130,'JPN',['memory'])];
 const groups=groupEastIndustryAnnotations(input,'manufacturing',['foundry','memory']);
 assert(groups.some(g=>g.members.map(s=>s.id).join(',')==='a,b'));
 assert(!groups.some(g=>g.members.some(s=>s.id==='a')&&g.members.some(s=>s.id==='c')),'complete-link grouping cannot chain a coast');
 for(const g of groups){assert(g.members.includes(g.anchor));assert(g.members.every(s=>s.country===g.anchor.country&&s.industries.includes(g.industry)));}
 assert.equal(groups.flatMap(g=>g.members).length,input.length);
});

test('proper place names retain their punctuation and copper captions distinguish operational stages',()=>{
 const hk={...site('hongkong-finance',200,114,'CHN',['finance']),name:'香港'},oyu={...site('oyu-tolgoi',100,106,'MNG',['copper']),name:'オユ・トルゴイ'};
 assert.equal(groupEastIndustryAnnotations([hk],'services',['finance'])[0].place,'香港');
 assert.equal(groupEastIndustryAnnotations([oyu],'resources',['copper'])[0].place,'オユ・トルゴイ');
 assert.equal(eastAnnotationKindLabel('copper','resources','銅'),'銅採掘');assert.equal(eastAnnotationKindLabel('copper','manufacturing','銅'),'銅製錬');
});

for(const width of [358,817,1274])test(`${width}px: sparse annotations keep real anchors, short leaders and fixed positions`,()=>{
 const height=width<650?359:650,bounds={left:0,top:0,right:width,bottom:height};
 for(const sector of ['resources','manufacturing','services']){
  // Deterministic regional projection for geometry tests, not a browser capture.
  const rows=eastSectorRows(sector),sites=rows.map(s=>({...s,screen:{x:12+(s.point[0]-90)/62*(width-24),y:12+(55-s.point[1])/38*(height-24)}})).filter(s=>s.screen.x>6&&s.screen.x<width-6&&s.screen.y>6&&s.screen.y<height-6);
  const groups=groupEastIndustryAnnotations(sites,sector,eastSectorIndustries.filter(i=>i.sectors.includes(sector)).map(i=>i.id));
  const inputs=groups.map(g=>({...g,width:(g.place.length+4)*11+9,height:19})),obstacles=sites.map(s=>({left:s.screen.x-6,right:s.screen.x+6,top:s.screen.y-6,bottom:s.screen.y+6}));
  const placed=placeEastIndustryAnnotations(inputs,bounds,obstacles),overview=placed.filter(p=>p.overview);
  assert(overview.length>0&&overview.length<=eastAnnotationLimit(width));
  assert.deepEqual(placeEastIndustryAnnotations(inputs,bounds,obstacles),placed,'selection cannot change this layout');
  for(const p of placed){const end=leaderEnd(p.anchor.screen,p);assert(Math.hypot(end.x-p.anchor.screen.x,end.y-p.anchor.screen.y)<=24);assert(obstacles.every(b=>!boxesOverlap(p,b,3)));assert(rows.some(s=>s.id===p.anchor.id&&s.point.every((n,i)=>n===p.anchor.point[i])));}
  for(const industry of new Set(placed.map(p=>p.industry))){const single=placed.filter(p=>p.industry===industry);for(const a of single)for(const b of single.filter(b=>b!==a))assert(!boxesOverlap(a,b,3));}
  for(const a of overview)for(const b of overview.filter(b=>b!==a))assert(!boxesOverlap(a,b,3));
 }
});
